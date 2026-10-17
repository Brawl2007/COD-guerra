import {mkdirSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';

// T38 M01-COMBAT-POSTURE-STAGING-V1: before/after captures of the waiting positions (views 01 and 11 of the roadmap, plus close views of the
// section under fire, the east platoon holding the deck, the gate riflemen and the sappers). Same method as m01-roadmap-captures.spec.js: each
// view loads a REAL snapshot of the control route (seed 19390901, support route), only the player is moved, three frames are rendered and the
// game is paused. Not part of `npm run test:browser`; not a playtest; SwiftShader, no FPS. Run:
//   npm run build && T38_OUT=<dir> npx playwright test -c tools/verification/playwright.t38.config.js
// T38_VIEWS: comma-separated name prefixes to run only some views.
const key='cod-guerra:checkpoint:m01:v2';
const OUT=process.env.T38_OUT||'test-results/m01-t38-staging';
const ONLY=process.env.T38_VIEWS?process.env.T38_VIEWS.split(',').map(s=>s.trim()).filter(Boolean):null;

function relocated(sim,snapshot,x,z,target){
  const s=structuredClone(snapshot),y=sim.world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2((target.y??y+1.5)-y-1.6,Math.hypot(dx,dz));s.player.aiming=false;s.player.crouched=false;
  return s;
}
const centroid=(snapshot,pred)=>{const a=snapshot.actors.filter(pred);if(!a.length)return null;return {x:a.reduce((s,v)=>s+v.x,0)/a.length,y:a.reduce((s,v)=>s+v.y,0)/a.length+1,z:a.reduce((s,v)=>s+v.z,0)/a.length,n:a.length};};

async function openView(browser,{name,sim,snapshot,x,z,target,quality='high'}){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=relocated(sim,snapshot,x,z,target);
  await page.addInitScript(({key,state,quality})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,state,quality});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9&&window.gameDiagnostics().m01.wagons.loaded.length===6,null,{timeout:180000});
  await page.locator('#quality').selectOption(quality);
  const before=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames??0);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:180000});
  await page.waitForFunction(before=>window.gameDiagnostics().m01.renderedFrames>before+2,before,{timeout:180000});
  // The HUD fades in for 0.8 s of game time after "continue" (m01-hud.js resumeFade): wait until that black is gone, then pause.
  await page.waitForFunction(()=>{const d=window.gameDiagnostics();return (d.m01?.hudPresentation?.fade??d.hudPresentation?.fade??0)===0;},null,{timeout:180000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  expect(data.player.x).toBeCloseTo(x,3);expect(data.player.z).toBeCloseTo(z,3);
  await page.screenshot({path:`${OUT}/${name}.png`,style:'#pause,#menu {visibility:hidden!important}',timeout:180000});
  const near=(data.m01.characters?.actors??[]).filter(a=>a.lod!==null&&a.lod!==undefined).length;
  const c={view:name,quality:data.quality,clock:data.m01.battleClock,player:{x:data.player.x,z:data.player.z},target,visibleActors:near,errors};
  await page.close();return c;
}

test('T38 staging captures',async({browser})=>{
  test.setTimeout(1800000);
  mkdirSync(OUT,{recursive:true});
  const fresh=new M01Simulation(19390901);fresh.tick(.05,{skip:true});const start=fresh.snapshot(false);
  // Snapshots outside any cutscene (a scene dims the HUD and the frame), with the player not carrying anything.
  let hold=null,sectionFire=null;
  const r=route(19390901,{support:true,onStep:({sim})=>{
    const free=!sim.scene&&!sim.player.carrying;
    if(!sectionFire&&free&&sim.battleClock>=seconds('04:48:00'))sectionFire=sim.snapshot(false);
    if(!hold&&free&&sim.battleClock>=seconds('05:08:00')&&sim.holdingEast())hold=sim.snapshot(false);
  }}),cs=r.combatSnapshots;
  const views=[
    // Roadmap view 01, same camera and target rule: the section at the squad post at 04:30:44 (before any fire).
    {name:'01-start-section-close',snapshot:start,x:-74,z:30,target:centroid(start,a=>a.alive&&a.active&&Math.hypot(a.x+66,a.z-22)<14&&!a.civilian)??{x:-66,z:22,y:1}},
    // The same post under fire (04:48, after the 04:34 bombing, the gate MG firing on Kowal): the section kneels behind the sandbags.
    {name:'01b-section-under-fire',snapshot:sectionFire,x:-62,z:32,target:{x:-78,z:23,y:-2.2}},
    // Roadmap view 11, same camera and target rule: the sappers at the second cut under the gate MG.
    {name:'11-repair-threat-sappers-pinned',snapshot:cs.repairThreat,x:-140,z:20,target:centroid(cs.repairThreat,a=>a.alive&&a.active&&a.x>-135&&a.x<-100&&!a.civilian)??{x:-123,z:8,y:1}},
    {name:'11b-sappers-close',snapshot:cs.repairThreat,x:-128,z:16,target:{x:-122.7,z:10.3,y:-1.4}},
    // The east platoon holding the end of the road deck (05:08), seen from the deck 7 m west of the rearmost man.
    {name:'21-east-platoon-hold',snapshot:hold,x:1021,z:40.5,target:{x:1035.5,z:40,y:.4}},
    // The gate riflemen against the 1912 portal, from the slope between the bridges.
    {name:'22-gate-riflemen',snapshot:hold,x:1041,z:20,target:{x:1057,z:20,y:-.2}},
  ];
  const selected=ONLY?views.filter(v=>ONLY.some(p=>v.name.startsWith(p))):views;
  expect(selected.length).toBeGreaterThan(0);
  const out=[];
  for(const v of selected){out.push(await openView(browser,{...v,sim:fresh}));console.log('T38_CAPTURE '+JSON.stringify(out.at(-1)));}
  expect(out.every(c=>c.errors.length===0)).toBe(true);
});
