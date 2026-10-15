// T21: real Chromium capture. No direct simulation writes, snapshots or fake screenshots.
import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {levelCameraClosedLoop} from './t21-camera-level.mjs';

const MODE=process.env.T21_CAPTURE_MODE==='antes'?'antes':'depois';
const OUT=resolve(process.env.T21_OUT_DIR||'test-results/t21'),PORT=Number(process.env.T21_PORT||5173);
const URL=`http://127.0.0.1:${PORT}/COD-guerra/?debug=1`;
mkdirSync(OUT,{recursive:true});
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
async function ready(){
 for(let i=0;i<160;i++){try{const r=await fetch(URL);if(r.ok)return;}catch{}await sleep(350);}
 throw Error('Vite never became ready; no screenshots accepted');
}
let child=null,browser=null,ctx=null;
const report={mode:MODE,url:URL,viewport:'1280x720',captureKind:'real DOM canvas screenshot',
 time:new Date().toISOString(),snapshots:[],cameraCorrections:[],consoleErrors:[],gameState:[],video:null};
try{
 child=spawn('npm',['run','dev','--','--port',String(PORT), '--strictPort'],{stdio:'ignore'});
 await ready();
 browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle',
   '--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const videoDir=join(OUT,'video-'+MODE);
 ctx=await browser.newContext({viewport:{width:1280,height:720},...(MODE==='depois'?{recordVideo:{dir:videoDir,size:{width:1280,height:720}}}:{})});
 const page=await ctx.newPage();
 page.on('pageerror',e=>report.consoleErrors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
 await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models?.length===9,null,{timeout:120000});
 await page.locator('#quality').selectOption('medium');
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.pointerLockElement?.id==='game'&&!window.gameDiagnostics()?.paused,null,{timeout:90000});
 // Account for every TRUSTED mousemove the game can see under pointer lock (capture phase, before the game).
 // Playwright pointer actions can inject big relative movements that the game applies to pitch.
 await page.evaluate(()=>{window.__t21Look={sumY:0,events:[]};
  // The game discards the first look sample after pointer-lock entry; consume it with a no-op so our first real correction counts.
  window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0}));
  window.addEventListener('mousemove',e=>{if(!e.isTrusted||document.pointerLockElement?.id!=='game')return;
   window.__t21Look.sumY+=e.movementY;const ev=window.__t21Look.events;if(ev.length<200)ev.push([Math.round(performance.now()),e.movementX,e.movementY]);},true);});
 const externalLook=()=>page.evaluate(()=>window.__t21Look.sumY);
 // Wait until no trusted look input has arrived for 500 ms before judging/steering the camera.
 async function quiet(){let last=await externalLook(),since=Date.now();
  while(Date.now()-since<500){await sleep(100);const now=await externalLook();if(now!==last){last=now;since=Date.now();}}}
 await page.keyboard.press('Space');
 await page.waitForTimeout(1600);
 const canvas=page.locator('canvas#game');
 const diagnostic=()=>page.evaluate(()=>window.gameDiagnostics?.());
 // Orient through the game's normal mouse-input listener, never the simulation object.
 async function levelCamera(){
  const readPitch=()=>page.evaluate(()=>window.gameDiagnostics?.()?.player?.pitch);
  await quiet();
  try{await levelCameraClosedLoop({
   readPitch,readExternalLook:externalLook,
   sendMovement:delta=>page.evaluate(movementY=>{
    const event=new MouseEvent('mousemove',{bubbles:true,movementY,movementX:0});
    if(event.movementY!==movementY)Object.defineProperty(event,'movementY',{value:movementY});
    window.dispatchEvent(event);
   },delta),
   waitForChange:async previous=>{
    await page.waitForFunction(before=>{
     const pitch=window.gameDiagnostics?.()?.player?.pitch;
     return Number.isFinite(pitch)&&Math.abs(pitch-before)>=.003;
    },previous,{timeout:10000,polling:100});
    return readPitch();
   },
   trace:entry=>{report.cameraCorrections.push(entry);console.log('T21 camera:',JSON.stringify(entry));},
  });}finally{report.trustedMouseMoves=await page.evaluate(()=>window.__t21Look.events).catch(()=>report.trustedMouseMoves??null);}
 }
 async function screenshot(name){
  await levelCamera();
  const d=await diagnostic();
  if(!d||d.paused||d.missionId!=='m01_tczew'||!d.m01?.models?.length)throw Error('Missing real active M01 diagnostics: '+name);
  if(Math.abs(d.player?.pitch??0)>0.85)throw Error('Camera not aimed at battlefield (pitch='+d.player.pitch+'): '+name);
  const filename=`${MODE}-${name}.png`;
  const screenshot=await canvas.screenshot({path:join(OUT,filename),timeout:120000});
  if(screenshot.length<15000)throw Error('Suspiciously small screenshot '+filename+' bytes='+screenshot.length);
  report.snapshots.push({filename,bytes:screenshot.length,clock:d.clock,pitch:d.player?.pitch??null,frames:d.m01.renderedFrames,ambient:d.m01.ambient??null,
   externalLookY:await externalLook(),shots:d.m01.weapon?.shotCount??null,grenades:d.m01.grenades?.ammo??null,explosions:d.m01.battlefieldFx?.active??null});
  return d;
 }
 await screenshot('cenario');
 // Real inputs. Move/look slightly, then fire a player round.
 await page.keyboard.down('KeyW');await page.waitForTimeout(1100);await page.keyboard.up('KeyW');
 await page.mouse.down();await page.waitForTimeout(70);await page.mouse.up();
 await page.waitForTimeout(600);
 await screenshot('combate');
 // Throw an actual grenade. Only call the next image an explosion if a renderer blast was observed.
 const before=await diagnostic();
 await page.keyboard.press('KeyG');
 await page.waitForFunction(old=>window.gameDiagnostics()?.m01?.grenades?.ammo<old,
   before.m01.grenades.ammo,{timeout:7000});
 try{await page.waitForFunction(()=>window.gameDiagnostics()?.m01?.battlefieldFx?.active>0,null,{timeout:16000});}
 catch{throw Error('No genuine gameplay explosion observed; refusing to call a non-explosion screenshot proof.')}
 await screenshot('explosao');
 if(MODE==='depois'){
  const started=Date.now();
  while(Date.now()-started<36000){
   await page.keyboard.down('KeyW');await page.waitForTimeout(650);await page.keyboard.up('KeyW');
   await page.mouse.down();await page.waitForTimeout(40);await page.mouse.up();
   await page.waitForTimeout(800);
   await levelCamera();
   const d=await diagnostic();if(!d||d.paused||d.missionId!=='m01_tczew')throw Error('Gameplay interrupted during video');
  }
 }
  if(report.consoleErrors.length)throw Error('Browser console/page errors: '+JSON.stringify(report.consoleErrors.slice(0,8)));
 await ctx.close();ctx=null;
 if(MODE==='depois'){
  const f=readdirSync(videoDir).find(x=>x.endsWith('.webm'));
  if(!f)throw Error('Real browser video not recorded');
  const name=join(OUT,'t21-gameplay-real.mp4');
  const source=join(videoDir,f);
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nk=1:nw=1',source]).toString().trim());
  if(!Number.isFinite(duration)||duration<35)throw Error('No 35s continuous gameplay segment in real browser footage');
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(Math.max(0,duration-35.5)),'-i',source,
    '-t','35','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',name],{stdio:'inherit'});
  if(!existsSync(name))throw Error('MP4 conversion failed');
  report.video=name;
 }
}finally{
 writeFileSync(join(OUT,`t21-${MODE}-report.json`),JSON.stringify(report,null,2));
 if(ctx)await ctx.close().catch(()=>{});
 if(browser)await browser.close().catch(()=>{});
 if(child){child.kill('SIGTERM');await sleep(500);}
}
