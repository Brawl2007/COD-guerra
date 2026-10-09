import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const url=process.env.M01_V7_PREVIEW_URL??'http://127.0.0.1:5187/COD-guerra/';
const out=path.resolve(process.env.M01_V7_EVIDENCE??'docs/verification/m01-runtime/final-approved-deliveries-integration-v7');
fs.mkdirSync(path.join(out,'preview'),{recursive:true});
const server=process.argv.includes('--start-server')?spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',new URL(url).port,'--strictPort'],{stdio:'ignore'}):null;
for(let i=0;i<60;i++){try{const r=await fetch(url);if(r.ok)break;}catch{}if(i===59){server?.kill('SIGTERM');throw Error('V7 preview server unavailable');}await new Promise(r=>setTimeout(r,250));}
const errors=[],failed=[],checks=[],key='cod-guerra:checkpoint:m01:v2';
const browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let result={status:'RUNNING',url,onlinePreviewCreated:false,testedHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),kind:'Real V7 app and browser input; automated smoke test, not a human playtest',browser:browser.version(),errors,failed,checks};
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.goto(url+'?debug=1&visual-verify=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  assert.equal(await page.locator('#start').isEnabled(),true);assert.equal(await page.locator('#menu').isVisible(),true);checks.push('menu');
  await page.locator('#quality').selectOption('low');await page.locator('#start').click();
  const control=()=>page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  const diag=()=>page.evaluate(()=>window.gameDiagnostics());await control();
  await page.waitForFunction(()=>window.gameDiagnostics().m01.scene==='cs_m01_intro'||window.gameDiagnostics().missionPhase==='INTRO',null,{timeout:30000});checks.push('intro and start');
  await page.keyboard.press('Space');await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'),null,{timeout:120000});
  let previous=await diag();
  for(const key of ['KeyW','KeyS','KeyA','KeyD']){
    await page.keyboard.down(key);await page.waitForFunction(p=>Math.hypot(window.gameDiagnostics().player.x-p.x,window.gameDiagnostics().player.z-p.z)>.08,previous.player,{timeout:20000});await page.keyboard.up(key);
    previous=await diag();checks.push(key);
  }
  const beforeLook=previous.player;
  // Headless native cursor recentering cancels absolute moves. Use relative mouse events received by the actual Input,
  // only after native pointer lock; the guard discards the initial sample as it does during normal play.
  await page.evaluate(()=>{window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0}));window.dispatchEvent(new MouseEvent('mousemove',{movementX:16,movementY:6}));});
  await page.waitForFunction(p=>window.gameDiagnostics().player.angle!==p.angle,beforeLook,{timeout:20000});checks.push('native pointer lock and relative mouse');
  const beforeShot=await diag();await page.mouse.click(640,360);
  await page.waitForFunction(n=>window.gameDiagnostics().m01.weapon.shotCount===n+1,beforeShot.m01.weapon.shotCount,{timeout:30000});checks.push('shoot');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY',null,{timeout:60000});
  await page.mouse.down({button:'right'});await page.waitForFunction(()=>window.gameDiagnostics().player.aiming,null,{timeout:30000});assert.equal(await page.locator('#crosshair').isVisible(),false);await page.mouse.up({button:'right'});checks.push('ADS');
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='RELOAD_SINGLE',null,{timeout:30000});
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#pause').waitFor({state:'visible'});const frozen=await diag();await page.waitForTimeout(350);assert.equal((await diag()).clock,frozen.clock);checks.push('pause freezes reload');
  await page.locator('#resume').click();await control();await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY'&&window.gameDiagnostics().m01.weapon.mag===5,null,{timeout:120000});checks.push('reload and resume');
  const active=await diag();assert.equal(active.audio.state,'running');assert.equal(active.audio.quality,'low');assert.equal(await page.locator('#hud').isVisible(),true);checks.push('audio and HUD');
  const save=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(save.schema,2);assert.ok(save.checkpointId?.includes('cp_m01_a')||active.m01.checkpoints.includes('cp_m01_a_orientacao'));checks.push('Schema 2 checkpoint');
  await page.screenshot({path:path.join(out,'preview','v7-playing.png'),timeout:120000});
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#pause').waitFor({state:'visible'});await page.locator('#back-menu').click();await page.reload();
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});assert.equal(await page.locator('#continue').isVisible(),true);await page.locator('#continue').click();await control();
  const restored=await diag();assert.equal(restored.m01.weapon.mag,save.weapon.mag);assert.equal(restored.m01.weapon.reserve,save.weapon.reserve);assert.ok(restored.m01.checkpoints.includes('cp_m01_a_orientacao'));checks.push('Continue after reload');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);result={...result,status:'PASS',quality:active.quality,active,restored,checkpointSha256:createHash('sha256').update(JSON.stringify(save)).digest('hex')};
}catch(error){result={...result,status:'FAIL',error:error.stack};throw error;}
finally{fs.writeFileSync(path.join(out,'PLAYABLE_PREVIEW.json'),JSON.stringify(result,null,2)+'\n');await browser.close();server?.kill('SIGTERM');}
console.log(`PASS: ${checks.join(', ')} at ${url}`);
