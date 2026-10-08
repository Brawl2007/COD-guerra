import {test,expect} from '@playwright/test';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {traceRound} from '../../src/game/m01-fire.js';
import {driver,route} from '../helpers/m01-route.js';

const key='cod-guerra:checkpoint:m01:v2',baseline=process.env.M01_BASELINE_CAPTURE==='1';
const fixtures={impacts:{}},preEvent={};
const scripted=[
  ['bombing','evt_m01_bombing_0434',seconds('04:34:00')],
  ['raid','evt_m01_bombing_0530',seconds('05:30:00')],
  ['east','evt_m01_east_demolition',seconds('06:10:00')],
  ['west','evt_m01_west_demolition',seconds('06:45:00')]
];

route(19390901,{support:true,onStep:({sim})=>{
  for(const [name,eventId,at] of scripted)if(!fixtures[name]){
    if(!sim.consumedEvent(eventId)&&sim.battleClock>=at-5)preEvent[name]=structuredClone(sim.snapshot(false));
    else if(sim.consumedEvent(eventId)&&preEvent[name])fixtures[name]=preEvent[name];
  }
  for(const r of sim.enemyFire.rounds){
    const remaining=r.arriveAt-sim.clock;if(remaining<=.12||remaining>=.38)continue;
    const hit=traceRound(sim.world,r,[]),material=hit.material??'earth';
    if(['earth','stone','wood'].includes(material)&&!fixtures.impacts[material]){
      fixtures.impacts[material]={snapshot:structuredClone(sim.snapshot(false)),point:structuredClone(hit.point),material};
    }
  }
}});

{
  const d=driver(19390901),{sim,step}=d;step({skip:true});step({grenade:true});
  for(let i=0;i<100&&sim.grenades.active[0]?.fuse>.32;i++)step({});
  if(sim.grenades.active.length)fixtures.grenade=structuredClone(sim.snapshot(false));
}

for(const name of ['bombing','raid','east','west','grenade'])if(!fixtures[name])throw new Error('Missing real FX fixture: '+name);
for(const material of ['earth','stone','wood'])if(!fixtures.impacts[material])throw new Error('Missing real round-impact fixture: '+material);

const world=new M01Simulation(19390901).world,station=world.point('tczew_station');
function relocate(snapshot,x,z,target){
  const s=structuredClone(snapshot),y=world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2((target.y??y+1.3)-y-1.6,Math.hypot(dx,dz));s.player.aiming=false;return s;
}
async function openFrom(browser,info,{name,snapshot,quality='high',camera,target,wait='blast'}){
  const page=await browser.newPage(),errors=[],failed=[],state=camera?relocate(snapshot,camera.x,camera.z,target):structuredClone(snapshot);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,state,quality})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,state,quality});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  if(wait==='impact')await page.waitForFunction(()=>{const f=window.gameDiagnostics().m01.fireEffects;return f.puff>0||f.spark>0||f.chip>0;},null,{timeout:25000});
  else if(wait==='smoke')await page.waitForFunction(()=>{const f=window.gameDiagnostics().m01.battlefieldFx;return f.active>0&&f.counts.smoke>0&&f.counts.core===0;},null,{timeout:30000});
  else await page.waitForFunction(()=>{const f=window.gameDiagnostics().m01.battlefieldFx;return f.active>0&&f.counts.dust>0&&(f.counts.core>0||f.counts.fire>0);},null,{timeout:30000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000});
  await info.attach(name+'.json',{body:JSON.stringify({quality:data.quality,drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,geometries:data.geometries,
    fireEffects:data.m01.fireEffects,battlefieldFx:data.m01.battlefieldFx,smokePuffs:data.m01.smokePuffs},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);return {page,data};
}

test('real earth stone and wood round impacts keep distinct visual language',async({browser},info)=>{
  test.setTimeout(360000);
  for(const material of ['earth','stone','wood']){
    const f=fixtures.impacts[material],p=f.point,camera={x:p.x-8,z:p.z-6};
    const {page,data}=await openFrom(browser,info,{name:`${material}-round-impact-high.png`,snapshot:f.snapshot,quality:'high',camera,target:p,wait:'impact'});
    if(!baseline){
      if(material==='earth')expect(data.m01.fireEffects.puff).toBeGreaterThan(0);
      if(material==='stone')expect(data.m01.fireEffects.chip).toBeGreaterThan(0);
      if(material==='wood')expect(data.m01.fireEffects.chip).toBeGreaterThan(0);
    }
    await page.close();
  }
});

test('small bombing east and west demolition show distinct layered profiles',async({browser},info)=>{
  test.setTimeout(540000);
  const views=[
    {name:'grenade-small-near-high.png',snapshot:fixtures.grenade,camera:{x:fixtures.grenade.player.x,z:fixtures.grenade.player.z},target:{x:fixtures.grenade.grenades.active[0].x,z:fixtures.grenade.grenades.active[0].z,y:fixtures.grenade.grenades.active[0].y}},
    {name:'station-bombing-high.png',snapshot:fixtures.bombing},
    {name:'raid-0530-high.png',snapshot:fixtures.raid},
    {name:'east-demolition-high.png',snapshot:fixtures.east},
    {name:'west-demolition-high.png',snapshot:fixtures.west}
  ];
  for(const v of views){
    const {page,data}=await openFrom(browser,info,{...v,quality:'high',wait:'blast'});
    if(!baseline){
      const f=data.m01.battlefieldFx;expect(f.extraLights).toBeLessThanOrEqual(1);
      for(const [layer,limit] of Object.entries(f.limits))if(layer!=='bursts'&&layer!=='lights')expect(f.counts[layer]??0).toBeLessThanOrEqual(limit);
    }
    await page.close();
  }
});

test('distance smoke lifecycle pause restore and Low High remain bounded',async({browser},info)=>{
  test.setTimeout(480000);
  const samples={};
  for(const quality of ['low','high']){
    const {page,data}=await openFrom(browser,info,{name:`east-demolition-${quality}.png`,snapshot:fixtures.east,quality,wait:'blast'});
    samples[quality]={drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,geometries:data.geometries,fx:data.m01.battlefieldFx};
    if(!baseline){
      expect(data.m01.battlefieldFx.counts.dust).toBeGreaterThan(0);expect(data.m01.battlefieldFx.extraLights).toBeLessThanOrEqual(1);
    }
    await page.close();
  }
  const {page,data}=await openFrom(browser,info,{name:'east-demolition-smoke-high.png',snapshot:fixtures.east,quality:'high',wait:'smoke'});
  if(!baseline){
    const frozen=data.m01.battlefieldFx,clock=data.clock;await page.waitForTimeout(300);
    const still=await page.evaluate(()=>window.gameDiagnostics());expect(still.clock).toBe(clock);expect(still.m01.battlefieldFx).toEqual(frozen);
    await page.locator('#restart-checkpoint').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
    const clean=await page.evaluate(()=>window.gameDiagnostics());expect(clean.m01.battlefieldFx.active).toBe(0);expect(Object.values(clean.m01.battlefieldFx.counts).every(n=>n===0)).toBe(true);
    expect(clean.m01.battlefieldFx.extraLights).toBe(0);
  }
  await page.close();

  const far=await openFrom(browser,info,{name:'raid-0530-medium-far.png',snapshot:fixtures.raid,quality:'medium',wait:'blast'});
  if(!baseline&&far.data.m01.battlefieldFx.meta)expect(far.data.m01.battlefieldFx.meta.bands.far).toBeGreaterThan(0);
  await far.page.close();
  if(!baseline){
    expect(samples.low.fx.counts.smoke).toBeLessThanOrEqual(samples.high.fx.counts.smoke);
    expect(samples.low.fx.counts.dust).toBeLessThanOrEqual(samples.high.fx.counts.dust);
    console.log('M01_BATTLEFIELD_FX_V3_COUNTERS '+JSON.stringify(samples));
  }
  await info.attach('quality-counters',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
});
