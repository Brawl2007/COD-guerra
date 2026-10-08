import {test,expect} from '@playwright/test';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {traceRound} from '../../src/game/m01-fire.js';
import {driver,route} from '../helpers/m01-route.js';
import {armFxCapture} from './helpers/fx-frame-capture.js';

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
    if(r.kind==='east')continue; // landRound deliberately emits no impact for this distant fire.
    const remaining=r.arriveAt-sim.clock;if(remaining<=.12||remaining>=.38)continue;
    const victim=r.victim&&!sim.consumedEvent('evt_m01_east_demolition')?sim.actor(r.victim):null;
    const hit=traceRound(sim.world,r,victim?.alive?[sim.player,victim]:[sim.player]),material=hit.material??'earth';
    if(['earth','stone','wood'].includes(material)&&!fixtures.impacts[material]){
      fixtures.impacts[material]={snapshot:structuredClone(sim.snapshot(false)),point:structuredClone(hit.point),material,round:structuredClone(r)};
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
async function openFrom(browser,info,{name,snapshot,quality='high',camera,target,wait='blast',round,material,damageId}){
  const page=await browser.newPage(),errors=[],failed=[],state=camera?relocate(snapshot,camera.x,camera.z,target):structuredClone(snapshot);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,state,quality})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,state,quality});
  const blastIds={'station-bombing-high.png':'station_bomb','raid-0530-high.png':'raid_0530','raid-0530-medium-far.png':'raid_0530','west-demolition-high.png':'west_demolition'};
  damageId??=name.startsWith('grenade')?snapshot.grenades.active[0].id:blastIds[name]??'east_demolition';
  await armFxCapture(page,{round,material,damageId,clock:snapshot.clock,phase:wait});
  await page.goto('?debug=1&visual-verify=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
  // SwiftShader can spend ~27 s reaching the 1.18 s smoke phase; the
  // simulation caps catch-up at .25 s/frame. Keep the phase assertion intact.
  try{await page.waitForFunction(()=>window.__fxCapture,null,{timeout:wait==='smoke'?120000:wait==='impact'?25000:30000});}
  catch(error){
    await info.attach(name+'.capture-timeout.json',{body:JSON.stringify(await page.evaluate(()=>({probe:window.__fxProbe,diagnostics:window.gameDiagnostics(),hidden:document.hidden,locked:document.pointerLockElement?.id})),null,2),contentType:'application/json'});
    throw error;
  }
  await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  const capture=await page.evaluate(()=>window.__fxCapture);
  expect(data.clock).toBe(capture.diagnostics.clock);expect(data.paused).toBe(true);
  if(round){expect(capture.probe.roundConsumed).toBe(true);expect(data.clock-round.arriveAt).toBeLessThan(.76);}
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000});
  await info.attach(name+'.json',{body:JSON.stringify({quality:data.quality,drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,geometries:data.geometries,
    clock:data.clock,battleClock:data.m01.battleClock,fixture:{round,material,damageId},probe:capture.probe,damageDecals:data.m01.damageDecals,
    fireEffects:data.m01.fireEffects,battlefieldFx:data.m01.battlefieldFx,smokePuffs:data.m01.smokePuffs},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);return {page,data};
}

test('real earth stone and wood round impacts keep distinct visual language',async({browser},info)=>{
  test.setTimeout(360000);
  for(const material of ['earth','stone','wood']){
    const f=fixtures.impacts[material],p=f.point,camera={x:p.x-8,z:p.z-6};
    const {page,data}=await openFrom(browser,info,{name:`${material}-round-impact-high.png`,snapshot:f.snapshot,quality:'high',camera,target:p,wait:'impact',round:f.round,material});
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
    const frozen=data.m01.battlefieldFx,clock=data.clock;
    // Compare density at one frozen event age/camera. Separate hot captures can
    // legitimately sample Low later than High and invert transient layer counts.
    const snapshot=await page.evaluate(()=>window.gameVerificationState().snapshot);
    const qualitySamples={high:frozen};
    await page.locator('#quality').selectOption('low',{force:true});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const low=await page.evaluate(()=>window.gameDiagnostics());
    expect(low.quality).toBe('low');expect(low.paused).toBe(true);expect(low.clock).toBe(clock);
    qualitySamples.low=low.m01.battlefieldFx;
    expect(qualitySamples.low.counts.smoke).toBeGreaterThan(0);
    expect(qualitySamples.low.counts.dust).toBeGreaterThan(0);
    expect(qualitySamples.low.counts.smoke).toBeLessThanOrEqual(qualitySamples.high.counts.smoke);
    expect(qualitySamples.low.counts.dust).toBeLessThanOrEqual(qualitySamples.high.counts.dust);
    await page.locator('#quality').selectOption('high',{force:true});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const high=await page.evaluate(()=>window.gameDiagnostics());
    expect(high.quality).toBe('high');expect(high.paused).toBe(true);expect(high.clock).toBe(clock);
    expect(high.m01.battlefieldFx).toEqual(frozen);
    expect(await page.evaluate(()=>window.gameVerificationState().snapshot)).toEqual(snapshot);
    await info.attach('quality-same-clock',{body:JSON.stringify({clock,qualitySamples},null,2),contentType:'application/json'});
    await page.waitForTimeout(300);
    const still=await page.evaluate(()=>window.gameDiagnostics());expect(still.clock).toBe(clock);expect(still.m01.battlefieldFx).toEqual(frozen);
    // This legacy snapshot is itself the checkpoint and is just before east blast.
    // Inspect reset at the restored clock, before a legitimate new blast can fire.
    await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();window.dispatchEvent(new Event('blur'));document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);});
    await page.locator('#restart-checkpoint').click();await page.waitForFunction(clock=>window.gameDiagnostics().paused&&window.gameDiagnostics().clock===clock,fixtures.east.clock,{timeout:120000});
    const clean=await page.evaluate(()=>window.gameDiagnostics());expect(clean.m01.battlefieldFx.active).toBe(0);expect(Object.values(clean.m01.battlefieldFx.counts).every(n=>n===0)).toBe(true);
    expect(clean.m01.battlefieldFx.extraLights).toBe(0);expect(clean.clock).toBe(fixtures.east.clock);
  }
  await page.close();

  const far=await openFrom(browser,info,{name:'raid-0530-medium-far.png',snapshot:fixtures.raid,quality:'medium',wait:'blast'});
  if(!baseline&&far.data.m01.battlefieldFx.meta)expect(far.data.m01.battlefieldFx.meta.bands.far).toBeGreaterThan(0);
  await far.page.close();
  if(!baseline){
    console.log('M01_BATTLEFIELD_FX_V3_COUNTERS '+JSON.stringify(samples));
  }
  await info.attach('quality-counters',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
});
