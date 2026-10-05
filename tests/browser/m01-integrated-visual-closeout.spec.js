import {test,expect} from '@playwright/test';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {driver,toRepair} from '../helpers/m01-route.js';

const key='cod-guerra:checkpoint:m01:v2';
const fresh=new M01Simulation(19390901);
const repair=toRepair(driver());repair.until(()=>repair.sim.battleClock>=seconds('04:45:10'),120);
const armored=toRepair(driver());armored.until(()=>armored.sim.battleClock>=seconds('04:52:10'),240);

function relocated(sim,snapshot,x,z,target){
  const s=structuredClone(snapshot),y=sim.world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2((target.y??y+1.6)-y-1.6,Math.hypot(dx,dz));s.player.aiming=false;
  return s;
}
async function captureView(browser,info,{name,sim,snapshot,x,z,target,quality='high',assets=false}){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=relocated(sim,snapshot,x,z,target),expected={x,z,angle:state.player.angle,pitch:state.player.pitch};
  await page.addInitScript(({key,state,quality})=>{
    localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);
  },{key,state,quality});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await expect(page.locator('#error')).toBeHidden();await page.locator('#quality').selectOption(quality);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.waitForFunction(expected=>{
    const p=window.gameDiagnostics().player,da=Math.atan2(Math.sin(p.angle-expected.angle),Math.cos(p.angle-expected.angle));
    return Math.abs(p.x-expected.x)<.05&&Math.abs(p.z-expected.z)<.05&&Math.abs(da)<.01&&Math.abs(p.pitch-expected.pitch)<.01;
  },expected,{timeout:120000});
  if(assets)await page.waitForFunction(()=>{const d=window.gameDiagnostics().m01;
    return d.locomotive.loaded.length===3&&d.panzerzug.loaded.length===3&&d.wagons.loaded.length===6;
  },null,{timeout:120000});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>2,null,{timeout:120000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const d=await page.evaluate(()=>window.gameDiagnostics());
  expect(d.player.x).toBeCloseTo(x,1);expect(d.player.z).toBeCloseTo(z,1);
  const angleError=Math.atan2(Math.sin(d.player.angle-expected.angle),Math.cos(d.player.angle-expected.angle));expect(Math.abs(angleError)).toBeLessThan(.02);
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
  await info.attach(name+'.json',{body:JSON.stringify({expected,player:d.player,drawCalls:d.drawCalls,triangles:d.triangles,textures:d.textures,geometries:d.geometries,m01:{locomotive:d.m01.locomotive,panzerzug:d.m01.panzerzug,wagons:d.m01.wagons,yardWagons:d.m01.yardWagons,vegetation:d.m01.vegetation,actorPoses:d.m01.actorPoses,actorAnimations:d.m01.actorAnimations,battlefieldFx:d.m01.battlefieldFx}},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);await page.close();return d;
}

test('integrated closeout: station facade roof yard and annexes',async({browser},info)=>{
  test.setTimeout(300000);const base=fresh.snapshot(false);
  const views=[
    {name:'station-facade-south.png',sim:fresh,snapshot:base,x:-399,z:4,target:{x:-399,z:38,y:4}},
    {name:'station-facade-oblique-roof.png',sim:fresh,snapshot:base,x:-315,z:3,target:{x:-395,z:40,y:10}},
    {name:'station-annex-yard.png',sim:fresh,snapshot:base,x:-305,z:48,target:{x:-260,z:20,y:-1}}
  ];
  const seen=[];
  for(const view of views)seen.push(await captureView(browser,info,view));
  expect(new Set(seen.map(d=>`${d.player.x.toFixed(1)}:${d.player.z.toFixed(1)}`)).size).toBe(3);
});

test('integrated closeout: locomotive wagons and Panzerzug near mid far',async({browser},info)=>{
  test.setTimeout(360000);
  const baseL=repair.sim.snapshot(false),baseP=armored.sim.snapshot(false);
  const views=[
    // Inspect the train from the Lisewo/east side of the 1912 portal; west-side cameras are occluded by the gate/bridge mass.
    {name:'train-locomotive-near.png',sim:repair.sim,snapshot:baseL,x:1100,z:-28,target:{x:1075,z:-2.5,y:1.5},assets:true},
    {name:'train-locomotive-mid.png',sim:repair.sim,snapshot:baseL,x:1150,z:-45,target:{x:1075,z:-2.5,y:1.5},assets:true},
    {name:'train-consist-far.png',sim:repair.sim,snapshot:baseL,x:1260,z:-80,target:{x:1200,z:-2.5,y:1.5},assets:true},
    {name:'panzerzug-near.png',sim:armored.sim,snapshot:baseP,x:1160,z:30,target:{x:1119,z:2.5,y:1.5},assets:true}
  ];
  const seen=[];
  for(const view of views){
    const d=await captureView(browser,info,view);seen.push(d);
    if(view.name.startsWith('train-'))expect(d.m01.locomotive.visible||d.m01.wagons.visible).toBe(true);
    if(view.name==='panzerzug-near.png')expect(d.m01.panzerzug.visible).toBe(true);
  }
  expect(new Set(seen.map(d=>`${d.player.x.toFixed(1)}:${d.player.z.toFixed(1)}`)).size).toBe(4);
});
