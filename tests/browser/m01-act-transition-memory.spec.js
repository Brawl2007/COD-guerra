import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {M01ActRunner} from '../../src/game/m01-acts.js';
import {actControls,ACT_TICK} from '../helpers/m01-act-route.js';
import {actBControls} from '../helpers/m01-act-b-route.js';

// Perf audit 2026-11-05 (renderer only): an act of the same area (VII-a -> VII-b -> VII-c) keeps the field, soil map, stubble, trees and scorch and only rebuilds the covers' earthworks, so
// renderer.info.memory (geometries, textures) must not grow with the transition. Two real in-page transitions (the finished act's end card opens the next one): VII-a -> VII-b and VII-b -> VII-c,
// on the High and Low tiers (gameDiagnostics reads renderer.info.memory). The return VII-c -> VII-a is a new game, covered by tests/m01-area-dressing-reuse.test.js (identity and dispose events).
// Not a frame rate. TRANS_OUT = optional JSON file for the numbers.
const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3';
const live=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
let scenes;
function build(){
  const a=new M01AreaSimulation(19390901,{difficulty:'recruta'}),sa={arrived:false,lastHealth:100};
  let nearEndA=null;
  for(let i=0;i<30000&&!a.mission.complete;i++){a.tick(ACT_TICK,actControls(a,'passive',sa));a.drainEvents();if(!nearEndA&&a.scene?.id==='cs_np_end')nearEndA=live(a);}
  const runner=new M01ActRunner({enabled:true}),sim=runner.enter(a),state={arrived:false,lastHealth:100};
  for(let i=0;i<60000&&sim.timers.endAt===null;i++){sim.tick(ACT_TICK,actBControls(sim,'passive',state));sim.drainEvents();}
  if(sim.timers.endAt===null)throw new Error('VII-b end not reached');
  return {endA:nearEndA??live(a),endB:live(sim)};
}
test.beforeAll(()=>{scenes=build();});

const one=page=>page.evaluate(()=>{const d=window.gameDiagnostics();return {quality:d.quality,act:d.m01.act,scene:d.m01.scene,geometries:d.geometries,textures:d.textures,drawCalls:d.drawCalls,triangles:d.triangles,dressingMeshes:d.m01.areaDressing?.meshes??null};});
/** Waits for the act's area dressing to be drawn (software GL paints the first frames late), then reads 8 frames: geometries/textures are gauges, draw calls and triangles take the smallest (a frame read between two passes doubles them). */
async function snap(page,act){
  await page.waitForFunction(a=>{const d=window.gameDiagnostics();return d.m01.act===a&&d.m01.areaDressing?.meshes>0;},act,{timeout:240000});
  await page.waitForTimeout(3000);
  const s=[];for(let i=0;i<8;i++){s.push(await one(page));await page.waitForTimeout(300);}
  const min=k=>Math.min(...s.map(x=>x[k]));
  return {...s[7],drawCalls:min('drawCalls'),triangles:min('triangles'),geometries:min('geometries'),textures:min('textures')};
}

for(const quality of (process.env.VIS_TIERS??'high,low').split(','))test(`act transitions of one area keep renderer.info.memory stable, tier ${quality}`,async({browser})=>{
  test.setTimeout(900000);
  const report={quality,transitions:{}};
  for(const [name,save,from,to] of [['vii-a_to_vii-b',scenes.endA,'act_vii_a_north','act_vii_b_north_day'],['vii-b_to_vii-c',scenes.endB,'act_vii_b_north_day','act_vii_c_withdrawal']]){
    const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
    await context.addInitScript(({key,save,q})=>{localStorage.setItem(key,JSON.stringify(save));localStorage.setItem('cod-guerra:visual-quality',q);},{key:ACT_KEY,save,q:quality});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto('?debug=1&acts=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:150000});
    await page.locator('#continue').click();
    const before=await snap(page,from);
    expect(before.quality).toBe(quality);
    const after=await snap(page,to);
    report.transitions[name]={before,after,errors};
    expect(errors).toEqual([]);
    // The totals also hold what the act itself brings (actors, craters, cards), so the bounds are a few resources, not zero; the identity and dispose checks of the dressing itself are in tests/m01-area-dressing-reuse.test.js.
    expect(after.textures).toBeLessThanOrEqual(before.textures+4);
    expect(after.geometries).toBeLessThanOrEqual(before.geometries+12);
    expect(after.dressingMeshes).toBeGreaterThan(5);
    await context.close();
  }
  if(process.env.TRANS_OUT){mkdirSync(dirname(process.env.TRANS_OUT),{recursive:true});writeFileSync(process.env.TRANS_OUT.replace('{q}',quality),JSON.stringify(report,null,1)+'\n');}
});
