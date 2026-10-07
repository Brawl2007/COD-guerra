import {test,expect} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../helpers/m01-route.js';

// Focused presentation captures of train 963's 65-wagon consist. Snapshots come from the real control route
// (train arrived at 04:50 in "Proteja o reparo"; 06:13 after the east demolition, sun up and Panzerzug alongside);
// the fixture only relocates the player. Train path, timing and mission data stay authoritative.
// M01_BASELINE_CAPTURE=1 runs the same views against the approved base, which has no detail diagnostics.
const key='cod-guerra:checkpoint:m01:v2';
const baseline=process.env.M01_BASELINE_CAPTURE==='1';

function trainSnapshots(){
  const sim=new M01Simulation(19390901),{repairThreat,eastDemolitionOutside}=route(19390901,{support:true}).combatSnapshots;
  for(const s of [repairThreat,eastDemolitionOutside])expect(s.consumed.evt_m01_train963_arrives).toBeDefined();
  return {sim,arrival:repairThreat,daylight:eastDemolitionOutside};
}
function relocated(sim,snapshot,x,z,target){
  const s=structuredClone(snapshot),y=sim.world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2(target.y-y-1.6,Math.hypot(dx,dz));s.player.aiming=false;
  return s;
}
async function openView(browser,info,{name,sim,snapshot,x,z,target,quality}){
  const page=await browser.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  const state=relocated(sim,snapshot,x,z,target);
  await page.addInitScript(({key,state,quality})=>{
    localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);
  },{key,state,quality});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await expect(page.locator('#error')).toBeHidden();await page.locator('#quality').selectOption(quality);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  // All six wagon GLBs must have arrived, so captures never show a partially loaded consist.
  await page.waitForFunction(()=>window.gameDiagnostics().m01.wagons.loaded.length===6,null,{timeout:120000});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>2,null,{timeout:120000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu,#subtitle {visibility:hidden!important}',timeout:120000});
  const counters={view:name,quality:data.quality,player:{x:data.player?.x,z:data.player?.z},drawCalls:data.drawCalls,triangles:data.triangles,
    textures:data.textures,geometries:data.geometries,wagons:data.m01.wagons,locomotive:data.m01.locomotive};
  await info.attach(name+'.json',{body:JSON.stringify(counters,null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  return {page,data,counters};
}

// North side (z<-2.5) faces away from the dawn sky; the south side looks across the existing diverging east line.
const VIEWS=[
// `lod` is the LOD0/1/2 wagon count the approved base selects at that view; both runs must reproduce it.
  {name:'wagon-near',x:1103.6,z:-10.4,target:{x:1108.2,z:-2.5,y:.9},quality:'high',lod:[15,31,19]},
  {name:'coupling-pair',x:1120.2,z:-7.4,target:{x:1121.85,z:-2.5,y:.2},quality:'high',lod:[17,30,18]},
  {name:'underframe',x:1131.4,z:3.4,target:{x:1128.4,z:-2.5,y:-.35},quality:'high',lod:[18,31,16]},
  {name:'consist-medium',x:1098,z:-24,target:{x:1175,z:-2.5,y:.8},quality:'high',lod:[14,31,20]},
  {name:'consist-far',x:1215,z:-235,target:{x:1385,z:-2.5,y:1},quality:'high',lod:[0,49,16]},
  {name:'coupling-pair',x:1120.2,z:-7.4,target:{x:1121.85,z:-2.5,y:.2},quality:'low',lod:[9,13,43]},
  {name:'consist-medium',x:1098,z:-24,target:{x:1175,z:-2.5,y:.8},quality:'low',lod:[6,13,46]},
  {name:'consist-daylight',x:1110,z:-15,target:{x:1140,z:-2.5,y:.4},quality:'high',snapshot:'daylight',lod:[16,30,19]},
  // Known limit: locomotive (fixed at 1075) and wagon 1 (plan x 1090) leave 2.05 m between buffer faces.
  {name:'locomotive-wagon1',x:1081,z:-9.5,target:{x:1084.4,z:-2.5,y:.3},quality:'high',lod:[13,30,22]},
];

test('captures wagon, coupling, underframe and consist views at High and Low',async({browser},info)=>{
  test.setTimeout(900000);
  const snapshots=trainSnapshots(),samples=[];
  for(const v of VIEWS){
    const file=`${v.name}-${v.quality}.png`,{page,data,counters}=await openView(browser,info,{...v,name:file,sim:snapshots.sim,snapshot:snapshots[v.snapshot??'arrival']});
    const w=data.m01.wagons;
    expect(w.wagons).toBe(65);expect(w.visible).toBe(true);expect(w.proxies).toBe(0);
    expect([w.lodDistribution[0],w.lodDistribution[1],w.lodDistribution[2]]).toEqual(v.lod);
    expect(w.batches).toBe(v.lod[0]?24:16);expect(w.first).toEqual([1090,0,-2.5]);expect(w.last).toEqual([1672.4,0,-2.5]);
    if(!baseline){
      const detail=w.detail,[l0,l1,l2]=v.lod;
      expect(detail.wagons).toBe(65);expect(detail.quality).toBe(v.quality);expect(w.artOffsetY).toBe(-.8325);
      expect(detail.instancesByTier).toEqual(v.quality==='low'?{near:0,mid:l0,far:l1+l2}:{near:l0,mid:l1,far:l2});
    }
    samples.push(counters);await page.close();
  }
  if(!baseline){
    const near=samples.find(s=>s.view==='coupling-pair-high.png').wagons.detail,low=samples.find(s=>s.view==='coupling-pair-low.png').wagons.detail;
    expect(near.instancesByTier.near).toBeGreaterThan(0);expect(low.instancesByTier.near).toBe(0);
    expect(near.drawCalls).toBeGreaterThan(low.drawCalls);
  }
  console.log('M01_TRAIN_CONSIST_COUNTERS '+JSON.stringify(samples.map(s=>({view:s.view,drawCalls:s.drawCalls,triangles:s.triangles,textures:s.textures,geometries:s.geometries,
    lod:s.wagons.lodDistribution,batches:s.wagons.batches,active:s.wagons.activeInstancesByLod,detail:s.wagons.detail??null}))));
  await info.attach('train-consist-counters.json',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
});

test('total wagon GLB failure keeps the 65 procedural proxies and adds no detail on them',async({browser},info)=>{
  test.setTimeout(300000);
  const snapshots=trainSnapshots(),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/assets/models/provisional/m01-wagons/*.glb',r=>r.abort());
  const state=relocated(snapshots.sim,snapshots.arrival,1120.2,-7.4,{x:1121.85,z:-2.5,y:.2});
  await page.addInitScript(({key,state})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality','high');},{key,state});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#quality').selectOption('high');await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.waitForFunction(()=>new Set(window.gameDiagnostics().m01.assetFailures.filter(f=>f.path.includes('m01-wagons/')).map(f=>f.path)).size===6,null,{timeout:120000});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>2,null,{timeout:120000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const d=await page.evaluate(()=>window.gameDiagnostics().m01.wagons);
  expect(d.proxies).toBe(65);expect(d.loaded).toEqual([]);expect(d.batches).toBe(0);
  if(!baseline){expect(d.detail.instancesByTier).toEqual({near:0,mid:0,far:0});expect(d.detail.instances.shade).toBe(0);}
  await page.screenshot({path:info.outputPath('fallback-proxies-high.png'),style:'#pause,#hud,#menu,#subtitle {visibility:hidden!important}',timeout:120000});
  await expect(page.locator('#error')).toBeHidden();expect(errors).toEqual([]);await page.close();
});
