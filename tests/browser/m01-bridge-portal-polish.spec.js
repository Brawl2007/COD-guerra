import {test,expect} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../helpers/m01-route.js';

const key='cod-guerra:checkpoint:m01:v2';
const baseline=process.env.M01_BASELINE_CAPTURE==='1';

function relocated(sim,snapshot,x,z,target){
  const s=structuredClone(snapshot),y=sim.world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2((target.y??y+1.5)-y-1.6,Math.hypot(dx,dz));s.player.aiming=false;
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
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
  await info.attach(name+'.json',{body:JSON.stringify({
    quality:data.quality,player:data.player,drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,geometries:data.geometries,
    visiblePieces:data.m01.visiblePieces,bridgePortalPolish:data.m01.bridgePortalPolish
  },null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  return {page,data};
}

test('captures rail, road, oblique, bridge-context and post-demolition portal views',async({browser},info)=>{
  test.setTimeout(480000);
  const fresh=new M01Simulation(19390901);fresh.tick(.05,{skip:true});
  const intact=fresh.snapshot(false);
  const east=route(19390901,{support:true}).combatSnapshots.eastDemolitionOutside;
  expect(east).toBeTruthy();
  const views=[
    {name:'rail-portal-near-high.png',sim:fresh,snapshot:intact,x:-24,z:-14,target:{x:-4,z:0,y:4.5}},
    {name:'road-portal-near-high.png',sim:fresh,snapshot:intact,x:-24,z:60,target:{x:-4,z:40,y:4.5}},
    {name:'lisewo-portal-oblique-high.png',sim:fresh,snapshot:intact,x:1092,z:-18,target:{x:1063.2,z:20,y:7}},
    {name:'lisewo-portal-bridge-context-high.png',sim:fresh,snapshot:intact,x:1010,z:0,target:{x:1063.2,z:0,y:5.5}},
    {name:'old-east-portal-after-demolition-high.png',sim:{world:new M01Simulation().world},snapshot:east,x:842,z:-34,target:{x:793.8,z:0,y:3.5}}
  ];
  for(const v of views){
    const sim=v.snapshot===east?Object.assign(new M01Simulation(),{world:fresh.world}):v.sim;
    // Relocation only needs the authoritative world heightfield; the saved snapshot carries demolition state.
    const {page,data}=await openView(browser,info,{...v,sim:v.snapshot===east?fresh:v.sim,quality:'high'});
    if(!baseline){
      expect(data.m01.bridgePortalPolish.quality).toBe('high');
      expect(data.m01.bridgePortalPolish.collidersAdded).toBe(0);
      expect(data.m01.bridgePortalPolish.activeAttachments.length).toBeGreaterThanOrEqual(3);
    }
    await page.close();
  }
});

test('Low keeps weathered portal material while High adds bounded microdetail',async({browser},info)=>{
  test.setTimeout(300000);
  const sim=new M01Simulation(19390901);sim.tick(.05,{skip:true});const snapshot=sim.snapshot(false),samples={};
  for(const quality of ['low','high']){
    const {page,data}=await openView(browser,info,{name:`lisewo-portal-${quality}.png`,sim,snapshot,x:1092,z:-18,target:{x:1063.2,z:20,y:7},quality});
    samples[quality]={drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,geometries:data.geometries,...data.m01.bridgePortalPolish};
    await page.close();
  }
  expect(samples.low.visibleDetails).toBe(0);
  expect(samples.high.visibleDetails).toBeGreaterThan(0);
  expect(samples.high.activeBatches).toBeGreaterThan(samples.low.activeBatches);
  expect(samples.high.collidersAdded).toBe(0);
  console.log('M01_PORTAL_POLISH_COUNTERS '+JSON.stringify(samples));
  await info.attach('portal-quality-counters',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
});
