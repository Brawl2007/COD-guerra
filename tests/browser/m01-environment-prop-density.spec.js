import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';

const key='cod-guerra:checkpoint:m01:v2';
const baseline=process.env.M01_BASELINE_CAPTURE==='1';

function visualSnapshot(){
  const d=driver();d.step({skip:true});
  return {sim:d.sim,snapshot:d.sim.snapshot(false)};
}
function relocated(sim,snapshot,x,z,target){
  const s=structuredClone(snapshot),y=sim.world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2((target.y??y+1.45)-y-1.6,Math.hypot(dx,dz));s.player.aiming=false;
  return s;
}
async function openView(browser,info,{name,sim,snapshot,x,z,target,quality='high'}){
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
  await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>2,null,{timeout:120000});
  await page.waitForFunction(quality=>window.gameDiagnostics().quality===quality,quality);
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
  await info.attach(name+'.json',{body:JSON.stringify({player:data.player,quality:data.quality,drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,geometries:data.geometries,environmentInstances:data.m01.environmentInstances,environmentProps:data.m01.environmentProps},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  return {page,data};
}

test('captures contextual Station yard, railway, bridge and combat-area dressing',async({browser},info)=>{
  test.setTimeout(360000);
  const {sim,snapshot}=visualSnapshot();
  const views=[
    {name:'station-yard-high.png',x:-425,z:5,target:{x:-414,z:18,y:-1}},
    {name:'railway-approach-high.png',x:-330,z:-52,target:{x:-302,z:-25,y:-1}},
    {name:'bridge-approach-high.png',x:-105,z:-24,target:{x:-48,z:-13,y:-1}},
    {name:'combat-area-high.png',x:-178,z:30,target:{x:-145,z:8,y:-1}}
  ];
  for(const v of views){
    const {page,data}=await openView(browser,info,{...v,sim,snapshot,quality:'high'});
    if(!baseline){
      expect(data.m01.environmentProps.quality).toBe('high');
      expect(data.m01.environmentProps.visible).toBe(data.m01.environmentProps.totalAll);
      expect(data.m01.environmentProps.collidersAdded).toBe(0);
    }
    await page.close();
  }
});

test('Low Medium High retain composition with bounded deterministic density',async({browser},info)=>{
  test.skip(baseline,'baseline capture only');
  test.setTimeout(300000);
  const {sim,snapshot}=visualSnapshot(),samples={};
  for(const quality of ['low','medium','high']){
    const {page,data}=await openView(browser,info,{name:`station-yard-${quality}.png`,sim,snapshot,x:-425,z:5,target:{x:-414,z:18,y:-1},quality});
    samples[quality]={...data.m01.environmentProps,drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,geometries:data.geometries};
    await page.close();
  }
  expect(samples.low.visible).toBeLessThan(samples.medium.visible);
  expect(samples.medium.visible).toBeLessThan(samples.high.visible);
  expect(samples.low.clusters).toBe(samples.high.clusters);
  expect(samples.low.totalAll).toBe(samples.high.totalAll);
  expect(samples.low.batches).toBeLessThan(samples.high.batches);
  for(const area of ['station-yard','railway-approach','bridge-approach','combat-area'])expect(samples.low.byArea[area]).toBeGreaterThan(0);
  console.log('M01_ENV_PROP_COUNTERS '+JSON.stringify(samples));
  await info.attach('quality-density-counters',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
});

test('checkpoint restart and page reload do not duplicate environment props',async({browser},info)=>{
  test.skip(baseline,'baseline capture only');
  test.setTimeout(240000);
  const {sim,snapshot}=visualSnapshot();
  const {page,data}=await openView(browser,info,{name:'reload-before.png',sim,snapshot,x:-330,z:-52,target:{x:-302,z:-25,y:-1},quality:'medium'});
  const before=data.m01.environmentProps;
  await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>window.gameDiagnostics().m01.environmentProps?.quality==='medium',null,{timeout:120000});
  const restarted=(await page.evaluate(()=>window.gameDiagnostics())).m01.environmentProps;
  expect(restarted.totalAll).toBe(before.totalAll);expect(restarted.visible).toBe(before.visible);expect(restarted.totalBatches).toBe(before.totalBatches);
  await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#quality').selectOption('medium');await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().m01.environmentProps?.quality==='medium',null,{timeout:120000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const reloaded=(await page.evaluate(()=>window.gameDiagnostics())).m01.environmentProps;
  expect(reloaded.totalAll).toBe(before.totalAll);expect(reloaded.visible).toBe(before.visible);expect(reloaded.totalBatches).toBe(before.totalBatches);
  await info.attach('prop-lifecycle',{body:JSON.stringify({before,restarted,reloaded},null,2),contentType:'application/json'});
  await page.close();
});
