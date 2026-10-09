import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with {type:'json'};
import {seconds} from '../../src/game/m01-simulation.js';
import {eyePosition} from '../../src/world/spatial.js';
import {route} from '../helpers/m01-route.js';
import {M01_FX_PROFILES} from '../../src/render/m01-battlefield-fx-profile.js';
import {M01_COLLAPSE_DURATION,M01_FLASH_MIN_ANGULAR,M01_FLASH_MIN_DURATION,M01_LIGHT_FAR_SECONDS,M01_SOUND_SPEED,M01_SILENCE_SECONDS,M01_FAR_TREMOR_SECONDS,
  M01_FAR_EXPOSURE_SECONDS,M01_DEMOLITION_BUDGET,collapseProgress,collapsePose,collapseSeed,collapseTwinName} from '../../src/render/m01-demolition.js';

// T18 (M01 demolition set-piece V2), presentation only. The snapshots come from the real simulation route (the same one as
// m01-battlefield-fx-polish-v3.spec.js): the player stands where the route leaves it, ~763 m west of the east demolition (x 800) on the
// road deck and ~361 m east of the west demolition (x 70) at the sappers' firing post. Only the yaw/pitch of the injected checkpoint is
// turned towards the blast so the screenshots show it. No clock, event, damage or objective is injected: the blast shots are LIVE
// continuations (the flash/light/exposure come from the real `m01-blast` event) and the page is paused by the same frame that was sampled.
//  east-762m           flash + light + exposure at the blast instant, collapse pose at its first frame, from ~763 m
//  east-midcollapse    0.8..1.8 s after the blast: the spans fall; pausing freezes the pose (two reads are identical)
//  west-362m           flash + light + exposure from ~361 m
//  west-362m-splash    3.3..3.9 s: spans landed (exact stored pose), river splash, debris, earth rain at the post; tremor timeline since 0 s
//  east-restore        a checkpoint restored 6.5 s after the blast: the final pose, suspended dust, no flash
const key='cod-guerra:checkpoint:m01:v2';
const scripted=[['east','evt_m01_east_demolition',seconds('06:10:00')],['west','evt_m01_west_demolition',seconds('06:45:00')]];
const fixtures={},preEvent={};
route(19390901,{support:true,onStep:({sim})=>{
  for(const [name,eventId,at] of scripted){
    if(!fixtures[name]){
      if(!sim.consumedEvent(eventId)&&sim.battleClock>=at-5)preEvent[name]=structuredClone(sim.snapshot(false));   // the last tick before the blast
      else if(sim.consumedEvent(eventId)&&preEvent[name])fixtures[name]=preEvent[name];
    }
    const damage=sim.sectors.damage.find(d=>d.id===`${name}_demolition`);
    if(damage&&!fixtures[name+'After']&&sim.clock-damage.started>=M01_COLLAPSE_DURATION+3.3)fixtures[name+'After']=structuredClone(sim.snapshot(false));
  }
}});
for(const name of ['east','west','eastAfter'])if(!fixtures[name])throw new Error('Missing real demolition fixture: '+name);

const BLAST={east:{x:800,y:0,z:20},west:{x:70,y:0,z:20}};
const FOV=70,HEIGHT=720;
// Look from the player's own eye at a point (angle: x=cos, z=sin; pitch up positive); the position is the route's own.
function aimedAt(snapshot,point){
  const s=structuredClone(snapshot),eye=eyePosition(s.player),dx=point.x-eye.x,dy=point.y-eye.y,dz=point.z-eye.z;
  s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.min(1.25,Math.atan2(dy,Math.hypot(dx,dz)));s.player.aiming=false;return s;
}
const nodeOf=(name,lod)=>manifest.files.find(f=>f.lod===lod&&f.nodes.some(n=>n.name===name))?.nodes.find(n=>n.name===name);

// Install before Continue. Wrap rAF: after every completed production frame read the diagnostics; keep a timeline of the demolition
// feedback; when the frame matches, use the existing blur path (pauses synchronously) and then release the pointer lock, so the paused
// frame is the very frame that was sampled. Nothing is injected into the simulation.
async function arm(page,options){
  await page.addInitScript(options=>{
    const raf=window.requestAnimationFrame.bind(window);
    const demo={capture:null,timeline:[],frames:0};window.__demo=demo;
    window.requestAnimationFrame=callback=>raf(time=>{
      callback(time);
      if(demo.capture)return;
      const d=window.gameDiagnostics?.();if(!d||d.paused||!d.m01?.demolition)return;
      const entry=d.m01.demolition.entries.find(e=>e.id===options.id&&e.started>=options.after);if(!entry)return;
      demo.frames++;
      const f=d.m01.combatFeedback;
      if(demo.timeline.length<800)demo.timeline.push({age:entry.age,clock:d.clock,farExposure:f.farExposure,farTremor:f.farTremor,shakeStrength:f.shakeStrength,
        exposureFlash:f.exposureFlash,explosionImpulse:f.explosionImpulse,flash:Boolean(d.m01.demolition.flash)});
      if(entry.age<options.minAge||entry.age>options.maxAge)return;
      if(options.flash){
        const flash=d.m01.demolition.flash;
        if(!(flash&&flash.id===options.id&&flash.age<flash.duration&&d.m01.battlefieldFx.counts.flash>0))return;
      }
      window.dispatchEvent(new Event('blur'));
      demo.capture={diagnostics:window.gameDiagnostics(),entryAge:entry.age};
      document.exitPointerLock();
    });
  },options);
}
function hooks(page){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  return {errors,failed};
}
async function open(browser,snapshot,options){
  const page=await browser.newPage(),h=hooks(page);
  await page.addInitScript(({key,snapshot})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality','high');},{key,snapshot});
  if(options)await arm(page,{...options,after:options.after??snapshot.clock});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:180000});
  await page.locator('#quality').selectOption('high');
  return {page,...h};
}
// Live continuation: Continue, then wait for the probe's match. The paused frame is read back and screenshotted.
async function liveCapture(browser,info,{name,snapshot,id,minAge,maxAge,flash=false,after}){
  const {page,errors,failed}=await open(browser,snapshot,{id,minAge,maxAge,flash,after});
  try{
    await page.locator('#continue').click();
    try{await page.waitForFunction(()=>window.__demo?.capture,null,{timeout:300000,polling:'raf'});}
    catch(error){
      await info.attach(name+'.capture-timeout.json',{body:JSON.stringify(await page.evaluate(()=>({demo:window.__demo,diagnostics:window.gameDiagnostics?.(),hidden:document.hidden,locked:document.pointerLockElement?.id})),null,2),contentType:'application/json'});
      throw error;
    }
    await expect(page.locator('#pause')).toBeVisible();
    const capture=await page.evaluate(()=>window.__demo.capture),timeline=await page.evaluate(()=>window.__demo.timeline);
    const data=await page.evaluate(()=>window.gameDiagnostics());
    expect(data.paused).toBe(true);expect(data.clock).toBe(capture.diagnostics.clock);   // the paused frame is the sampled frame
    expect(data.m01.demolition).toEqual(capture.diagnostics.m01.demolition);
    await page.screenshot({path:info.outputPath(name+'.png'),style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000});
    return {page,data,timeline,errors,failed,
      write(extra={}){
        const report={name,quality:data.quality,clock:data.clock,battleClock:data.m01.battleClock,player:data.player,demolition:data.m01.demolition,
          combatFeedback:data.m01.combatFeedback,battlefieldFx:data.m01.battlefieldFx,parts:Object.fromEntries(data.m01.demolition.pieces.map(p=>[p.name,data.m01.parts[p.name]])),
          timeline,drawCalls:data.drawCalls,triangles:data.triangles,...extra};
        fs.writeFileSync(info.outputPath(name+'-diagnostics.json'),JSON.stringify(report,null,2));
        return info.attach(name+'.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
      }};
  }catch(error){await page.close();throw error;}
}

/** Every visible collapse piece is exactly the pure model of (clock - started), and visibility stays with renderState.parts. */
function expectPieces(demo,parts){
  expect(demo.pieces.length).toBeGreaterThan(0);
  for(const p of demo.pieces){
    const entry=demo.entries.find(e=>e.id===p.damageId),node=nodeOf(p.name,p.lod),twinName=collapseTwinName(p.name),twin=nodeOf(twinName,p.lod);
    expect(entry,p.name).toBeTruthy();expect(node&&twin,p.name).toBeTruthy();
    const offset=twin.pivot.map((v,i)=>v-node.pivot[i]),pose=collapsePose({age:entry.age,offset,seed:collapseSeed(p.name)});
    const want=pose.active?p.basePosition.map((v,i)=>v+pose.offset[i]):p.basePosition;
    p.position.forEach((v,i)=>expect(v,`${p.name} position[${i}]`).toBeCloseTo(want[i],3));
    expect(p.progress,p.name).toBeCloseTo(pose.progress,9);
    expect(p.phase,p.name).toBe(pose.active?'falling':pose.progress>=1?'settled':'idle');
    if(!pose.active&&pose.progress>=1){expect(p.position,`${p.name} is exactly the stored pose`).toEqual(p.basePosition);expect(p.quaternion).toEqual(p.baseQuaternion);}
    expect(parts[p.name],p.name).toMatchObject({visible:true,lod:p.lod});          // shown by renderState.parts, not by the animation
    expect(parts[twinName]?.visible,twinName).toBe(false);                          // the intact twin is hidden by the same state
  }
}
/** Flash/light/exposure of a live blast frame at `expected.distance` metres; the near-field explosion path stays silent. */
function expectFarBlast(data,id,[minDistance,maxDistance]){
  const demo=data.m01.demolition,entry=demo.entries.find(e=>e.id===id),flash=demo.flash,profile=M01_FX_PROFILES.demolition,feedback=data.m01.combatFeedback;
  expect(entry.distance).toBeGreaterThan(minDistance);expect(entry.distance).toBeLessThan(maxDistance);
  expect(entry.farActive).toBe(true);expect(entry.age).toBeGreaterThanOrEqual(0);expect(entry.age).toBeLessThanOrEqual(.45);
  expect(entry.duration).toBe(M01_COLLAPSE_DURATION);expect(entry.progress).toBeCloseTo(collapseProgress(entry.age),9);
  // 1) flash: on-screen size and duration floor, light reaches the far viewer
  expect(flash.id).toBe(id);expect(flash.angular).toBeGreaterThanOrEqual(M01_FLASH_MIN_ANGULAR-1e-9);
  expect(flash.duration).toBeGreaterThanOrEqual(M01_FLASH_MIN_DURATION-1e-9);expect(flash.scale).toBeGreaterThanOrEqual(profile.scale);
  expect(flash.lightSeconds).toBeGreaterThan(.34);expect(flash.lightSeconds).toBeLessThanOrEqual(M01_LIGHT_FAR_SECONDS+1e-9);
  expect(flash.lightRange).toBeGreaterThan(profile.lightDistance);expect(flash.lightDecay).toBeLessThan(2);
  expect(flash.age).toBeLessThan(flash.duration);
  const px=flash.scale/flash.distance/(2*Math.tan(FOV*Math.PI/360))*HEIGHT;
  expect(px,'nominal flash height on a 720 px frame').toBeGreaterThanOrEqual(20);
  // 2) far-field feedback: exposure at the light's arrival, tremor only when the sound arrives; the near path (explosion()) does nothing
  const far=demo.far.find(f=>f.id===id);
  expect(far.applies).toBe(true);expect(far.exposure).toBeGreaterThan(0);expect(far.tremor).toBe(0);
  expect(far.tremorAt).toBeCloseTo(entry.distance/M01_SOUND_SPEED,9);expect(far.tremorAt).toBeGreaterThan(entry.age);
  expect(feedback.farExposure).toBeGreaterThan(0);expect(feedback.farTremor).toBe(0);expect(feedback.explosionImpulse).toBe(0);
  expect(feedback.exposureFlash).toBeGreaterThan(0);expect(feedback.exposureFlash).toBeLessThanOrEqual(.13);
  expect(feedback.shakeStrength).toBeLessThanOrEqual(feedback.caps.cameraOffset);expect(feedback.overlayAlpha).toBeLessThanOrEqual(feedback.caps.overlayAlpha);
  // 3) hard 2 s silence hook (diagnostics only)
  expect(entry.silence).toEqual({id,from:entry.started,to:entry.started+M01_SILENCE_SECONDS,active:true});
  // 4) existing budgets
  const fx=data.m01.battlefieldFx;
  expect(fx.extraLights).toBeLessThanOrEqual(1);expect(fx.meta.bands.far).toBeGreaterThan(0);
  for(const [layer,limit] of Object.entries(fx.limits))if(layer!=='bursts'&&layer!=='lights')expect(fx.counts[layer]??0).toBeLessThanOrEqual(limit);
  // Nothing has landed yet: no set-piece debris or dust before the spans reach the ground.
  expect(fx.atmosphere.demolition).toEqual({puffs:0,chips:0});
}
function expectTimeline(timeline,distance){
  const tremorAt=distance/M01_SOUND_SPEED,early=timeline.filter(s=>s.age<M01_FAR_EXPOSURE_SECONDS),during=timeline.filter(s=>s.age>tremorAt+.1&&s.age<tremorAt+M01_FAR_TREMOR_SECONDS-.2);
  expect(early.length,'frames before the exposure ends').toBeGreaterThan(0);
  for(const s of early)expect(s.farExposure,`exposure at ${s.age.toFixed(2)} s`).toBeGreaterThan(0);
  for(const s of timeline.filter(s=>s.age<tremorAt))expect(s.farTremor,`no tremor before the sound arrives (${s.age.toFixed(2)} s < ${tremorAt.toFixed(2)} s)`).toBe(0);
  for(const s of timeline.filter(s=>s.age>tremorAt+M01_FAR_TREMOR_SECONDS+.01))expect(s.farTremor).toBe(0);
  for(const s of timeline)expect(s.explosionImpulse,'near-field explosion path stays silent').toBe(0);
  return {tremorAt,earlyFrames:early.length,tremorFrames:during.length,during};
}

test('east demolition from ~762 m: flash, light and exposure at the blast instant, collapse starts from the intact pose',async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const snapshot=aimedAt(fixtures.east,{x:800,y:20,z:20});
  const r=await liveCapture(browser,info,{name:'m01-demolition-east-762m',snapshot,id:'east_demolition',minAge:0,maxAge:.45,flash:true});
  try{
    expectFarBlast(r.data,'east_demolition',[740,790]);
    const demo=r.data.m01.demolition,entry=demo.entries.find(e=>e.id==='east_demolition');
    expectPieces(demo,r.data.m01.parts);
    // First frames of the collapse: every piece is still essentially at its intact pose (progress ~ (age/T)^2 at most).
    expect(demo.pieces.some(p=>p.phase==='falling')).toBe(true);
    for(const p of demo.pieces)expect(p.progress).toBeLessThanOrEqual(collapseProgress(entry.age)+1e-9);
    const timeline=expectTimeline(r.timeline,entry.distance);
    await r.write({timelineChecks:timeline});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
  }finally{await r.page.close();}
});

test('east mid-collapse: the pose is the pure model, pausing freezes it, the tremor has not arrived yet',async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const snapshot=aimedAt(fixtures.east,{x:800,y:20,z:20});
  const r=await liveCapture(browser,info,{name:'m01-demolition-east-midcollapse',snapshot,id:'east_demolition',minAge:.8,maxAge:1.8});
  try{
    const demo=r.data.m01.demolition,entry=demo.entries.find(e=>e.id==='east_demolition');
    expect(entry.age).toBeGreaterThanOrEqual(.8);expect(entry.age).toBeLessThanOrEqual(1.8);
    expect(entry.progress).toBeGreaterThan(0);expect(entry.progress).toBeLessThan(1);expect(entry.progress).toBeCloseTo(collapseProgress(entry.age),9);
    expect(demo.pieces.some(p=>p.phase==='falling'&&p.progress>0&&p.progress<1)).toBe(true);
    for(const p of demo.pieces.filter(p=>p.phase==='falling')){
      // Between the intact pose (above) and the stored pose (base): strictly less fallen than the whole fall, never below the stored y.
      expect(p.position[1]).toBeGreaterThanOrEqual(p.basePosition[1]-1e-6);
    }
    expectPieces(demo,r.data.m01.parts);
    expect(r.data.m01.combatFeedback.farTremor).toBe(0);                         // 763 m / 343 m/s = 2.2 s
    expect(r.data.m01.battlefieldFx.atmosphere.demolition).toEqual({puffs:0,chips:0});
    // Pause freezes the pose: two reads with real time and rendered frames in between are identical.
    await waitFrames(r.page,400);
    const again=await r.page.evaluate(()=>window.gameDiagnostics());
    expect(again.paused).toBe(true);expect(again.clock).toBe(r.data.clock);
    expect(again.m01.demolition).toEqual(r.data.m01.demolition);expect(again.m01.battlefieldFx).toEqual(r.data.m01.battlefieldFx);
    expect(again.m01.demolition.pieces.map(p=>p.position)).toEqual(r.data.m01.demolition.pieces.map(p=>p.position));
    await waitFrames(r.page,300);
    const third=await r.page.evaluate(()=>window.gameDiagnostics());
    expect(third.m01.demolition).toEqual(again.m01.demolition);
    const timeline=expectTimeline(r.timeline,entry.distance);
    await r.write({frozenReads:{clock:[r.data.clock,again.clock,third.clock],pose:'identical'},timelineChecks:timeline});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
  }finally{await r.page.close();}
});
async function waitFrames(page,ms){
  await page.waitForTimeout(ms);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

test('west demolition from ~362 m: flash, light and exposure at the blast instant',async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const snapshot=aimedAt(fixtures.west,{x:70,y:12,z:20});
  const r=await liveCapture(browser,info,{name:'m01-demolition-west-362m',snapshot,id:'west_demolition',minAge:0,maxAge:.45,flash:true});
  try{
    expectFarBlast(r.data,'west_demolition',[340,380]);
    expectPieces(r.data.m01.demolition,r.data.m01.parts);
    const entry=r.data.m01.demolition.entries.find(e=>e.id==='west_demolition');
    expect(entry.far.tremorAt).toBeCloseTo(entry.distance/M01_SOUND_SPEED,9);
    const timeline=expectTimeline(r.timeline,entry.distance);
    await r.write({timelineChecks:timeline});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
  }finally{await r.page.close();}
});

test('west demolition 3.3..3.9 s: spans landed on their stored pose, river splash, debris and earth rain at the firing post, tremor on time',async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const snapshot=aimedAt(fixtures.west,{x:70,y:12,z:20});
  const r=await liveCapture(browser,info,{name:'m01-demolition-west-362m-splash-rain',snapshot,id:'west_demolition',minAge:M01_COLLAPSE_DURATION+.1,maxAge:M01_COLLAPSE_DURATION+.7});
  try{
    const demo=r.data.m01.demolition,entry=demo.entries.find(e=>e.id==='west_demolition'),budget=M01_DEMOLITION_BUDGET.high;
    expect(entry.progress).toBe(1);
    expectPieces(demo,r.data.m01.parts);
    expect(demo.pieces.every(p=>p.phase==='settled')).toBe(true);                // exactly the stored pose after the collapse
    const drawn=r.data.m01.battlefieldFx.atmosphere;
    expect(drawn.demolition.puffs).toBeGreaterThan(0);expect(drawn.demolition.chips).toBeGreaterThan(0);   // splash/debris at the fall points + earth rain
    expect(drawn.demolition.puffs).toBeLessThanOrEqual(budget.puffs);expect(drawn.demolition.chips).toBeLessThanOrEqual(budget.debris);
    expect(drawn.puffs).toBeLessThanOrEqual(drawn.puffCapacity);expect(drawn.debris).toBeLessThanOrEqual(drawn.debrisCapacity);
    expect(demo.budget.high).toEqual(budget);
    const timeline=expectTimeline(r.timeline,entry.distance);
    // The tremor really happened inside the window distance/343 .. +1.6 s (frames are at most 0.25 s of mission time apart).
    expect(timeline.tremorFrames,'frames inside the tremor window').toBeGreaterThan(0);
    for(const s of timeline.during)expect(s.farTremor).toBeGreaterThan(0);
    const caps=r.data.m01.combatFeedback.caps;
    for(const s of r.timeline){expect(s.shakeStrength).toBeLessThanOrEqual(caps.cameraOffset);expect(s.exposureFlash).toBeLessThanOrEqual(.13);}
    await r.write({timelineChecks:timeline});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
  }finally{await r.page.close();}
});

test('restore 6.5 s after the east blast: every collapsed piece is exactly its stored pose, dust hangs over the spans, no flash',async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const snapshot=aimedAt(fixtures.eastAfter,{x:800,y:14,z:20}),damage=snapshot.sectors.damage.find(d=>d.id==='east_demolition'),minAge=M01_COLLAPSE_DURATION+3.3;
  expect(snapshot.clock-damage.started).toBeGreaterThanOrEqual(minAge);
  // Continue loads the checkpoint (the entry already exists, started < snapshot.clock); the first running frames are the restored ones.
  const r=await liveCapture(browser,info,{name:'m01-demolition-east-restore-settled',snapshot,id:'east_demolition',minAge,maxAge:60,after:0});
  try{
    const demo=r.data.m01.demolition,entry=demo.entries.find(e=>e.id==='east_demolition');
    expect(entry.started).toBe(damage.started);expect(entry.age).toBeGreaterThanOrEqual(minAge);expect(entry.progress).toBe(1);
    expect(r.timeline[0].age).toBeGreaterThanOrEqual(minAge);                      // even the very first frame is already past the collapse
    expectPieces(demo,r.data.m01.parts);
    expect(demo.pieces.every(p=>p.phase==='settled'&&p.progress===1)).toBe(true);
    expect(demo.pieces.some(p=>/_collapsed$/.test(p.name))&&demo.pieces.some(p=>/_rubble$/.test(p.name))).toBe(true);
    expect(demo.flash).toBe(null);                                                  // a restore replays no blast flash
    expect(r.data.m01.battlefieldFx.atmosphere.demolition.puffs).toBeGreaterThan(0);   // suspended dust after the collapse
    expect(r.data.m01.battlefieldFx.atmosphere.demolition.chips).toBe(0);
    const feedback=r.data.m01.combatFeedback;
    expect(feedback.farTremor).toBe(0);expect(feedback.farExposure).toBe(0);expect(feedback.shakeStrength).toBe(0);
    expect(demo.far).toEqual([]);                                                   // outside the feedback window: nothing replays
    await r.write({minAge});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
  }finally{await r.page.close();}
});
