import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {slowGlTestTimeout} from '../helpers/m01-browser-boot.js';

test.use({video:'on'});
let showcaseServer;
test.beforeAll(async()=>{
  showcaseServer=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188','--strictPort'],{stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Showcase Vite server not ready')),30000);
    showcaseServer.stdout.on('data',b=>{if(b.toString().includes('5188')){clearTimeout(timer);resolve();}});
    showcaseServer.on('exit',c=>{clearTimeout(timer);reject(Error('Showcase Vite exited '+c));});
  });
});
test.afterAll(()=>showcaseServer?.kill());

test('M01 Argon — gameplay real + multi-soldier GLB animation showcase',async({page},info)=>{
  test.setTimeout(slowGlTestTimeout({boots:2,frames:12}));   // the game page, then the showcase page; the wait for the reaction frame below is frame-bound
  const errors=[],badResponses=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)badResponses.push(r.status()+' '+r.url());});
  // First shot: actual production game/mission, never an invented background.
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models?.length===9,null,{timeout:60000});
  await expect(page.locator('#error')).toBeHidden();
  await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>.2,null,{timeout:60000});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.gameDiagnostics()?.m01?.characters?.active>0,null,{timeout:60000});
  await page.waitForTimeout(3000);
  const gameplay=await page.evaluate(()=>({clock:window.gameDiagnostics().clock,
    actors:window.gameDiagnostics().m01.characters.actors.map(a=>({id:a.id,clip:a.clip}))}));
  await page.screenshot({path:info.outputPath('01-m01-real-gameplay.png')});
  // Second shot: controlled inspection with the REAL M01Characters renderer, rigs, textures, and GLBs.
  await page.goto('http://127.0.0.1:5188/COD-guerra/tools/verification/m01-argon-animation-showcase.html');
  await page.waitForFunction(()=>window.ready===true&&window.showcase?.diagnostics()?.renderedModels>=9,null,{timeout:100000});
  const stage=async(mode,screenshot,delay,together=null)=>{
    await page.evaluate(m=>window.showcase.setMode(m),mode);
    await page.waitForTimeout(delay);
    let d;
    if(together){
      // The reaction clips are short pulses on the page's own wall clock (a new one every 2.3 s) and one rendered frame took seconds on software GL (the full run of 2026-11-05 sampled
      // one frame 450 ms after the switch and found no hit_front): wait for a rendered frame that shows all of them at once, which is the same fact the one-shot sample asserted.
      const frame=await page.waitForFunction(({mode,names})=>{const f=window.showcase.diagnostics();return f&&f.mode===mode&&names.every(n=>f.actors.some(a=>a.clip===n))?f:null;},{mode,names:together},{polling:'raf',timeout:120000});
      d=await frame.jsonValue();
    }else d=await page.evaluate(()=>window.showcase.diagnostics());
    expect(d.renderedModels).toBeGreaterThanOrEqual(mode==='closeup'?5:9);
    await page.screenshot({path:info.outputPath(screenshot)});
    return d;
  };
  const march=await stage('platoon','02-pelotao-animacoes-walk-run-sprint-crouch.png',3800);
  const types=new Set(march.actors.map(a=>a.clip));
  for(const name of ['walk','run','sprint','crouch_walk'])expect(types.has(name),name+' não apareceu: '+[...types]).toBe(true);
  const reaction=await stage('reactions','03-reacoes-hit-duck-turn.png',450,['hit_front','near_miss_duck','turn_left','turn_right']);
  for(const name of ['hit_front','near_miss_duck','turn_left','turn_right'])
    expect(reaction.actors.some(a=>a.clip===name),name+' não apareceu').toBe(true);
  await page.waitForTimeout(2600);
  const close=await stage('closeup','04-vista-proxima-soldados-3d.png',3400);
  await info.attach('m01-argon-showcase-diagnostics',{body:JSON.stringify({
    source:'REAL Chromium+Three.js M01Characters on PR #62, staged actors for demonstration (not campaign gameplay)',
    realGameplay:gameplay,stage:[march,reaction,close],errors,badResponses
  }),contentType:'application/json'});
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
});
