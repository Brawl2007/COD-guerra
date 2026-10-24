import {mkdirSync,writeFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {route} from '../../tests/helpers/m01-route.js';
import {sapperPhase,SAPPERS} from '../../src/game/m01-sappers.js';

// R3-a (the sappers' staged operation): captures of every phase in the game itself, from the player's position 8-15 m away. Same method as m01-t38-staging-captures.spec.js: each view loads a
// REAL snapshot of a route of the test pilot (seed 19390901, the support pilot, who stands on the slope beside the sappers) taken in the middle of the phase; only the player is moved (to
// SAPPERS_DIST metres from the team, on its south-east side, looking at it, the way a player who covers the repair stands), three frames are rendered and the game is paused. Not part of
// `npm run test:browser`; not a playtest; SwiftShader, no FPS. Run (after `npm run build`):
//   CHROME_EXECUTABLE=/opt/pw-browsers/chromium SAPPERS_OUT=<dir> npx playwright test -c tools/verification/playwright.sappers-r3a.config.js
// SAPPERS_VIEWS: comma-separated phases to run only some views; SAPPERS_DIST: distance in metres (default 10); SAPPERS_QUALITY: high (default), medium or low.
const key='cod-guerra:checkpoint:m01:v2';
const OUT=process.env.SAPPERS_OUT||'test-results/m01-sappers-r3a';
const ONLY=process.env.SAPPERS_VIEWS?process.env.SAPPERS_VIEWS.split(',').map(s=>s.trim()).filter(Boolean):null;
const DIST=Number(process.env.SAPPERS_DIST||10),QUALITY=process.env.SAPPERS_QUALITY||'high';
const SEED=Number(process.env.SAPPERS_SEED||19390901);

function relocated(snapshot,x,z,y,target){
  const s=structuredClone(snapshot),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2(target.y-y-1.6,Math.hypot(dx,dz));s.player.aiming=false;s.player.crouched=false;
  return s;
}
async function openView(browser,{name,snapshot,x,z,y,target}){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=relocated(snapshot,x,z,y,target);
  await page.addInitScript(({key,state,quality})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,state,quality:QUALITY});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9&&window.gameDiagnostics().m01.wagons.loaded.length===6,null,{timeout:180000});
  await page.locator('#quality').selectOption(QUALITY);
  const before=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames??0);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:180000});
  await page.waitForFunction(before=>window.gameDiagnostics().m01.renderedFrames>before+2,before,{timeout:180000});
  // The HUD fades in for 0.8 s of game time after "continue" (m01-hud.js resumeFade): wait until that black is gone, then pause.
  await page.waitForFunction(()=>{const d=window.gameDiagnostics();return (d.m01?.hudPresentation?.fade??d.hudPresentation?.fade??0)===0;},null,{timeout:180000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  const hud=await page.evaluate(()=>({objective:document.querySelector('#objective-text')?.textContent??'',status:document.querySelector('#objective-status')?.textContent??'',subtitle:document.querySelector('#subtitle')?.textContent??''}));
  await page.screenshot({path:`${OUT}/${name}.png`,style:'#pause,#menu {visibility:hidden!important}',timeout:180000});
  const actors=(data.m01.characters?.actors??[]).filter(a=>['pawel_krawiec','sapper_2','sapper_3'].includes(a.id)).map(a=>({id:a.id,clip:a.clip,lod:a.lod,clipTime:+(a.clipTime??0).toFixed(2)}));
  const c={view:name,quality:data.quality,clock:data.m01.battleClock,player:{x:+data.player.x.toFixed(2),z:+data.player.z.toFixed(2)},sappers:actors,hud,errors};
  await page.close();return c;
}

test('sappers R3-a captures',async({browser})=>{
  test.setTimeout(3600000);
  mkdirSync(OUT,{recursive:true});
  // One route; the snapshots: the middle of each stage, one second into every other phase, outside any scene and with the player not carrying anything.
  const snaps={},ticks={};
  route(SEED,{support:true,onStep:({sim})=>{
    const ph=sapperPhase(sim),id=ph.id;ticks[id]=(ticks[id]??0)+1;
    if(snaps[id]||sim.scene||sim.player.carrying)return;
    if(ph.stage?ph.t>=ph.stage.sec*.5:ticks[id]>=24)snaps[id]=sim.snapshot(false);
  }});
  const order=['camp','locate','standby','inspect','splice','test','fail','relocate','inspect2','splice2','test2','report','ready','verify'];
  const out=[];
  for(const [i,id] of order.entries()){
    if(ONLY&&!ONLY.includes(id))continue;
    const snap=snaps[id];expect(snap,`a snapshot in ${id}`).toBeTruthy();
    const men=snap.actors.filter(a=>SAPPERS.members.includes(a.id)),cx=men.reduce((n,a)=>n+a.x,0)/men.length,cz=men.reduce((n,a)=>n+a.z,0)/men.length,cy=men.reduce((n,a)=>n+a.y,0)/men.length;
    // South-east of the team, DIST m away, on the slope (z grows to the south): the support pilot's side of the cable.
    const ang=62*Math.PI/180,x=cx+Math.cos(ang)*DIST,z=cz+Math.sin(ang)*DIST;
    out.push(await openView(browser,{name:`${String(i+1).padStart(2,'0')}-${id}`,snapshot:snap,x,z,y:snap.player.y,target:{x:cx,y:cy+.9,z:cz}}));
    console.log('SAPPERS_CAPTURE '+JSON.stringify(out.at(-1)));
  }
  writeFileSync(`${OUT}/captures.json`,JSON.stringify({seed:SEED,dist:DIST,quality:QUALITY,views:out},null,2)+'\n');
  expect(out.every(c=>c.errors.length===0)).toBe(true);
});
