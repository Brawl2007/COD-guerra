import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with {type:'json'};
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {eyePosition} from '../../src/world/spatial.js';
import {route} from '../helpers/m01-route.js';
import {M01_FX_PROFILES} from '../../src/render/m01-battlefield-fx-profile.js';
import {M01_COLLAPSE_DURATION,M01_FLASH_MIN_ANGULAR,M01_FLASH_MIN_DURATION,M01_LIGHT_FAR_SECONDS,M01_SOUND_SPEED,M01_SILENCE_SECONDS,M01_FAR_TREMOR_SECONDS,
  M01_FAR_EXPOSURE_SECONDS,M01_DEMOLITION_BUDGET,M01_HAZE_DELAY,M01_WEST_FIRING_POST,collapseProgress,collapsePose,collapseSeed,collapseTwinName,
  demolitionParticles,projectToScreen} from '../../src/render/m01-demolition.js';

// T18 (M01 demolition set-piece V2), presentation only. The snapshots come from the real simulation route (the same one as
// m01-battlefield-fx-polish-v3.spec.js): the last tick before each blast, and the east state 6.5 s after it. Only the player's position
// and view are changed (see SHOTS): the sim gates of the blasts are kept (east needs the player at x < 660, west at x < -90) and the
// blasts are LIVE continuations: the flash/light/exposure come from the real `m01-blast` event; the page is paused by the frame that
// was sampled. No clock, event, damage or objective is injected into the live pages.
//
// Why the cameras are where they are. The first version stood on the road deck / at the firing post and looked at the blast point:
// the blast (z = 20, deck level) was behind the truss, the portal and the first-person weapon (east), and behind the sappers' hut
// and the weapon (west); and the flash itself was a faint translucent puff on the pale horizon haze. Now every camera has an
// unobstructed line to its effect (checked offline with the world colliders, tree crowns and the bridge truss boxes) and every effect
// is PROVEN visible by pixels: the paused frame is compared with a reference frame of the same camera, the same clock and the same
// state except that the demolition has not happened (the checkpoint is loaded but never ticked), inside a region around the effect
// (projected with the page's own camera) and against a sky control region that must stay unchanged.
//  east flash         west bank on the open corridor between the two bridges (z 20, between the trusses at z 5.2 and 36.4), 776 m
//  east mid-collapse  east flood plain in the same corridor, 190 m from the blast; 2.4..2.9 s after it (collapse progress >= .5)
//  west flash         west of the hut (z 40 clears it), 363 m
//  west fall/splash   north of the road approach, looking over the river at the spans' fall points; 3.5..4.1 s
//  west earth rain    62 m from the firing post (x -290, z 22); 3.5..4.1 s
//  east restore       the east state 6.5 s after the blast, seen from the mid-collapse camera: the final pose, dust, no flash
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

const FOV=70,WIDTH=1280,HEIGHT=720,FOCAL=(HEIGHT/2)/Math.tan(FOV*Math.PI/360);
const world=new M01Simulation(19390901).world;
// Where the player stands and what the view looks at. The aim point appears `lift` px ABOVE the screen centre (the camera pitches down
// by atan(lift / focal)), so the effect clears the first-person weapon (lower right of the frame). x/z are chosen on open ground;
// y comes from the world, exactly as the simulation would place it.
const SHOTS=Object.freeze({
  eastFlash:{base:'east',x:24,z:20,aim:{x:800,y:8,z:20},lift:110},
  eastCollapse:{base:'east',x:610,z:20,aim:{x:800,y:8,z:20},lift:60},
  westFlash:{base:'west',x:-292,z:40,aim:{x:70,y:8,z:20},lift:110},
  westFall:{base:'west',x:-124,z:52,aim:{x:75,y:-2,z:20},lift:40},
  westRain:{base:'west',x:-235,z:50,aim:{x:-290,y:10,z:22},lift:-20},
  eastRestore:{base:'eastAfter',x:610,z:20,aim:{x:800,y:8,z:20},lift:60}
});
function place(snapshot,shot){
  const s=structuredClone(snapshot),y=world.heightAt(shot.x,shot.z);
  Object.assign(s.player,{x:shot.x,y,z:shot.z,moveBlend:0,sprinting:false,crouched:false,aiming:false});
  const eye=eyePosition(s.player),dx=shot.aim.x-eye.x,dy=shot.aim.y-eye.y,dz=shot.aim.z-eye.z;
  s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.atan2(dy,Math.hypot(dx,dz))-Math.atan(shot.lift/FOCAL);return s;
}
const nodeOf=(name,lod)=>manifest.files.find(f=>f.lod===lod&&f.nodes.some(n=>n.name===name))?.nodes.find(n=>n.name===name);

// Pixel evidence. A pixel counts as changed when max(|dR|,|dG|,|dB|) >= `threshold` (of 255). Thresholds are about 40 % of the
// footprint estimated from the real puff texture (tests/m01-demolition.test.js) or the geometry; the sky control box must stay
// (almost) untouched, so a pass cannot come from a global lighting or exposure change.
const PIXEL=Object.freeze({
  threshold:24,
  control:{x0:480,y0:10,x1:800,y1:90,maxChanged:40},   // top-centre sky of every view: no tree, truss or tower reaches it
  flash:{changed:150,peak:40,meanAbs:.15},            // flash + cores over ~160 x 120 px around the projected blast point
  collapse:{changed:300,peak:60,meanAbs:.1},          // moved/rolled truss spans + rubble + smoke column
  fall:{changed:600,peak:60,meanAbs:.2},              // spans down 8..10 m + splash + dust + column
  rain:{changed:60,peak:40,meanAbs:.05},              // clods in flight + dust at the firing post
  restore:{changed:200,peak:60,meanAbs:.1}            // stored pose of the east spans and rubble + suspended dust
});
const ROI=Object.freeze({
  eastFlash:{points:[[800,8,20]],pad:[85,60]},
  westFlash:{points:[[70,8,20]],pad:[85,60]},
  eastCollapse:{points:[[800,0,20],[800,30,20],[690,5,0],[690,5,40],[837,4,0],[843,4,40]],pad:[80,40]},
  westFall:{points:[[10.4,3,0],[8.5,3,40],[142,0,0],[142,0,40],[70,6,20],[70,25,20]],pad:[30,30]},
  westRain:{points:[[-290,24,22],[-290,-2,22],[-304,8,10],[-276,8,34]],pad:[110,20]},
  eastRestore:{points:[[800,0,20],[800,30,20],[690,5,0],[690,5,40],[837,4,0],[843,4,40]],pad:[80,40]}
});

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
const HIDE_OVERLAYS='#pause,#hud,#menu{visibility:hidden!important}';
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
    const png=await page.screenshot({path:info.outputPath(name+'.png'),style:HIDE_OVERLAYS,timeout:120000});
    return {page,data,timeline,errors,failed,png,
      write(extra={}){
        const report={name,quality:data.quality,clock:data.clock,battleClock:data.m01.battleClock,player:data.player,demolition:data.m01.demolition,
          combatFeedback:data.m01.combatFeedback,battlefieldFx:data.m01.battlefieldFx,parts:Object.fromEntries(data.m01.demolition.pieces.map(p=>[p.name,data.m01.parts[p.name]])),
          timeline,drawCalls:data.drawCalls,triangles:data.triangles,...extra};
        fs.writeFileSync(info.outputPath(name+'-diagnostics.json'),JSON.stringify(report,null,2));
        return info.attach(name+'.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
      }};
  }catch(error){await page.close();throw error;}
}
const twoFrames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));

/**
 * The reference frame: the same camera, the same checkpoint with the clock and battle clock of the live frame, but the demolition has not
 * happened. The page loads the checkpoint (Continue) and never takes the pointer lock, so the simulation never ticks and nothing but
 * the loaded state is drawn. Two more draws (quality round trip) follow because the first draw after a load still ranges the bridge's
 * micro-detail with the previous frame's camera.
 */
async function referenceFrame(browser,info,{name,snapshot,clock,battleClock,id}){
  const state=structuredClone(snapshot);state.clock=clock;state.battleClock=battleClock;
  const page=await browser.newPage(),h=hooks(page);
  await page.addInitScript(({key,state})=>{
    localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality','high');
    HTMLCanvasElement.prototype.requestPointerLock=function(){};   // never locked: the game stays paused on the loaded state
  },{key,state});
  try{
    await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:180000});
    await page.locator('#quality').selectOption('high');
    await page.locator('#continue').click();
    await page.waitForFunction(clock=>window.gameDiagnostics?.().clock===clock,clock,{timeout:60000});
    for(const quality of ['medium','high']){await page.locator('#quality').selectOption(quality,{force:true});await twoFrames(page);}
    const data=await page.evaluate(()=>window.gameDiagnostics());
    expect(data.paused,'the reference never runs').toBe(true);expect(data.clock).toBe(clock);expect(data.m01.battleClock).toBe(battleClock);
    expect(data.m01.demolition.entries.some(e=>e.id===id),'the reference is the state without the demolition').toBe(false);
    const png=await page.screenshot({path:info.outputPath(name+'-reference.png'),style:HIDE_OVERLAYS,timeout:120000});
    expect(h.errors).toEqual([]);expect(h.failed).toEqual([]);
    return {png,data};
  }finally{await page.close();}
}

/** Boxes (CSS px) around the projected world points; every point must be in front of the camera and inside the viewport. */
function regionOf(camera,{points,pad}){
  const projected=points.map(([x,y,z])=>({point:[x,y,z],...projectToScreen(camera,{x,y,z})}));
  for(const p of projected){expect(p.behind,`${p.point} is in front of the camera`).toBe(false);expect(p.inside,`${p.point} projects inside the ${camera.width}x${camera.height} viewport: ${p.x.toFixed(0)},${p.y.toFixed(0)}`).toBe(true);}
  const xs=projected.map(p=>p.x),ys=projected.map(p=>p.y);
  return {x0:Math.max(0,Math.floor(Math.min(...xs)-pad[0])),x1:Math.min(camera.width,Math.ceil(Math.max(...xs)+pad[0])),
    y0:Math.max(0,Math.floor(Math.min(...ys)-pad[1])),y1:Math.min(camera.height,Math.ceil(Math.max(...ys)+pad[1])),projected:projected.map(p=>({point:p.point,x:+p.x.toFixed(1),y:+p.y.toFixed(1),depth:+p.depth.toFixed(1)}))};
}
/** Decodes both PNGs in a blank page (no extra dependency) and measures the regions; also draws a diff image for the evidence folder. */
async function comparePixels(browser,{reference,live,regions,threshold}){
  const page=await browser.newPage();
  try{
    return await page.evaluate(async({reference,live,regions,threshold})=>{
      const decode=async b64=>{
        const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none'});
        const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
        return ctx.getImageData(0,0,bitmap.width,bitmap.height);
      };
      const a=await decode(reference),b=await decode(live);
      if(a.width!==b.width||a.height!==b.height)throw new Error(`size mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`);
      const luma=(d,i)=>.2126*d[i]+.7152*d[i+1]+.0722*d[i+2],W=a.width,stats={};
      for(const [name,r] of Object.entries(regions)){
        let changed=0,loose=0,peak=0,sumAbs=0,sumRef=0,sumLive=0,sx=0,sy=0,n=0;
        for(let y=r.y0;y<r.y1;y++)for(let x=r.x0;x<r.x1;x++){
          const i=(y*W+x)*4,d=Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]));
          const la=luma(a.data,i),lb=luma(b.data,i);n++;sumAbs+=Math.abs(la-lb);sumRef+=la;sumLive+=lb;
          if(d>peak)peak=d;if(d>=12)loose++;if(d>=threshold){changed++;sx+=x;sy+=y;}
        }
        stats[name]={box:[r.x0,r.y0,r.x1,r.y1],pixels:n,changed,changedLoose:loose,peak,meanAbs:+(sumAbs/n).toFixed(4),meanLumaReference:+(sumRef/n).toFixed(3),meanLumaLive:+(sumLive/n).toFixed(3),
          centroid:changed?[+(sx/changed).toFixed(1),+(sy/changed).toFixed(1)]:null};
      }
      let total=0;const out=new OffscreenCanvas(W,a.height),octx=out.getContext('2d'),image=octx.createImageData(W,a.height);
      for(let i=0;i<image.data.length;i+=4){
        const d=Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2])),g=luma(b.data,i)*.45;
        if(d>=threshold){total++;image.data[i]=255;image.data[i+1]=Math.min(255,60+d);image.data[i+2]=0;}else{image.data[i]=image.data[i+1]=image.data[i+2]=g;}
        image.data[i+3]=255;
      }
      octx.putImageData(image,0,0);octx.lineWidth=2;
      for(const [name,r] of Object.entries(regions)){octx.strokeStyle=name==='control'?'#35d0ff':'#ffe44d';octx.strokeRect(r.x0,r.y0,r.x1-r.x0,r.y1-r.y0);}
      const blob=await out.convertToBlob({type:'image/png'}),buffer=new Uint8Array(await blob.arrayBuffer());let text='';
      for(let i=0;i<buffer.length;i+=0x8000)text+=String.fromCharCode(...buffer.subarray(i,i+0x8000));
      return {threshold,stats,changedInFrame:total,diffPng:btoa(text)};
    },{reference:reference.toString('base64'),live:live.toString('base64'),regions,threshold});
  }finally{await page.close();}
}
/**
 * The whole pixel proof of one effect: projects the region with the live page's camera, renders the reference, measures, writes the
 * diff image and the numbers (BEFORE asserting, so a failing run still carries them) and then asserts the declared limits.
 */
async function pixelProof(browser,info,r,{name,shot,roi,limit,pre,id}){
  const camera=r.data.m01.demolition.camera;
  expect(camera.width).toBe(WIDTH);expect(camera.height).toBe(HEIGHT);expect(camera.fov).toBeCloseTo(FOV,3);
  const region=regionOf(camera,ROI[roi]);
  const reference=await referenceFrame(browser,info,{name,snapshot:pre,clock:r.data.clock,battleClock:r.data.m01.battleClock,id});
  const refCamera=reference.data.m01.demolition.camera;
  // Same camera: position and view direction of the reference equal the live frame's (no tremor/bob at these ages).
  expect(Math.hypot(...camera.position.map((v,i)=>v-refCamera.position[i])),'camera position difference (m)').toBeLessThan(.05);
  const dot=Math.abs(camera.quaternion.reduce((n,v,i)=>n+v*refCamera.quaternion[i],0));
  expect(2*Math.acos(Math.min(1,dot)),'camera orientation difference (rad)').toBeLessThan(.002);
  const control={x0:PIXEL.control.x0,y0:PIXEL.control.y0,x1:PIXEL.control.x1,y1:PIXEL.control.y1};
  const result=await comparePixels(browser,{reference:reference.png,live:r.png,regions:{roi:region,control},threshold:PIXEL.threshold});
  fs.writeFileSync(info.outputPath(name+'-diff.png'),Buffer.from(result.diffPng,'base64'));delete result.diffPng;
  const proof={name,shot:{...SHOTS[shot],player:{x:r.data.player.x,y:r.data.player.y,z:r.data.player.z}},camera,projected:region.projected,limit,...result};
  fs.writeFileSync(info.outputPath(name+'-pixels.json'),JSON.stringify(proof,null,2));
  await info.attach(name+'.pixels.json',{body:JSON.stringify(proof,null,2),contentType:'application/json'});
  const {roi:measured,control:sky}=result.stats;
  expect(measured.changed,`pixels changed by the effect in its region (${JSON.stringify(measured)})`).toBeGreaterThanOrEqual(limit.changed);
  expect(measured.peak,'strongest change in the region').toBeGreaterThanOrEqual(limit.peak);
  expect(measured.meanAbs,'mean absolute luminance change over the region').toBeGreaterThanOrEqual(limit.meanAbs);
  expect(sky.changed,`the sky control box stays untouched (${JSON.stringify(sky)})`).toBeLessThanOrEqual(PIXEL.control.maxChanged);
  return proof;
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
  expect(flash.extraLayers,'far flashes are stacked').toBeGreaterThanOrEqual(4);
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
async function waitFrames(page,ms){
  await page.waitForTimeout(ms);
  await twoFrames(page);
}
const flashShot=async(browser,info,{name,shot,id,distance,pre,roi,limit})=>{
  const snapshot=place(fixtures[SHOTS[shot].base],SHOTS[shot]);
  const r=await liveCapture(browser,info,{name,snapshot,id,minAge:0,maxAge:.3,flash:true});
  try{
    expectFarBlast(r.data,id,distance);
    expectPieces(r.data.m01.demolition,r.data.m01.parts);
    const entry=r.data.m01.demolition.entries.find(e=>e.id===id),timeline=expectTimeline(r.timeline,entry.distance);
    // First frames of the collapse: every piece is still essentially at its intact pose (progress ~ (age/T)^2 at most).
    for(const p of r.data.m01.demolition.pieces)expect(p.progress).toBeLessThanOrEqual(collapseProgress(entry.age)+1e-9);
    expect(r.data.m01.demolition.pieces.some(p=>p.phase==='falling')).toBe(true);
    await r.write({timelineChecks:timeline,shot:SHOTS[shot]});
    await r.page.close();
    await pixelProof(browser,info,r,{name,shot,roi,limit,pre:place(fixtures[SHOTS[shot].base],SHOTS[shot]),id});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
    return {r,entry};
  }finally{if(!r.page.isClosed())await r.page.close();}
};

test('east demolition from ~776 m: flash, light and exposure at the blast instant, collapse starts from the intact pose, the flash is visible in pixels',async({browser},info)=>{
  test.setTimeout(process.env.CI?900000:600000);
  const {entry}=await flashShot(browser,info,{name:'m01-demolition-east-flash-776m',shot:'eastFlash',id:'east_demolition',distance:[740,790],roi:'eastFlash',limit:PIXEL.flash});
  expect(entry.distance).toBeGreaterThan(740);
});

test('east mid-collapse (2.4..2.9 s, progress >= .5): the pose is the pure model, pausing freezes it, the far tremor is over, the collapse is visible in pixels',async({browser},info)=>{
  test.setTimeout(process.env.CI?900000:600000);
  const shot=SHOTS.eastCollapse,snapshot=place(fixtures.east,shot);
  const r=await liveCapture(browser,info,{name:'m01-demolition-east-midcollapse',snapshot,id:'east_demolition',minAge:2.4,maxAge:2.9});
  try{
    const demo=r.data.m01.demolition,entry=demo.entries.find(e=>e.id==='east_demolition');
    expect(entry.distance).toBeGreaterThan(185);expect(entry.distance).toBeLessThan(200);expect(entry.farActive).toBe(true);   // beyond the 180 m near-feedback path
    expect(entry.age).toBeGreaterThanOrEqual(2.4);expect(entry.age).toBeLessThanOrEqual(2.9);
    expect(entry.progress).toBeGreaterThanOrEqual(.5);expect(entry.progress).toBeLessThan(1);expect(entry.progress).toBeCloseTo(collapseProgress(entry.age),9);
    const falling=demo.pieces.filter(p=>p.phase==='falling');
    expect(falling.length).toBeGreaterThan(0);
    for(const p of falling){
      // Past the middle of the fall (every piece's own delay is at most .4 s) and never below the stored pose.
      expect(p.progress,`${p.name} progress`).toBeGreaterThanOrEqual(.5);expect(p.progress).toBeLessThan(1);
      expect(p.position[1]).toBeGreaterThanOrEqual(p.basePosition[1]-1e-6);
    }
    expectPieces(demo,r.data.m01.parts);
    const feedback=r.data.m01.combatFeedback,fx=r.data.m01.battlefieldFx.atmosphere;
    expect(feedback.farTremor).toBe(0);                                              // 190 m / 343 m/s = .55 s: the tremor window (1.6 s) is over
    expect(fx.demolition.chips).toBe(0);                                             // nothing has landed yet ...
    if(entry.age<M01_HAZE_DELAY)expect(fx.demolition.puffs).toBe(0);else expect(fx.demolition.puffs).toBeGreaterThan(0);   // ... the dust starts hanging just before the spans land
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
    await r.write({frozenReads:{clock:[r.data.clock,again.clock,third.clock],pose:'identical'},timelineChecks:timeline,shot});
    await r.page.close();
    await pixelProof(browser,info,r,{name:'m01-demolition-east-midcollapse',shot:'eastCollapse',roi:'eastCollapse',limit:PIXEL.collapse,pre:place(fixtures.east,shot),id:'east_demolition'});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
  }finally{if(!r.page.isClosed())await r.page.close();}
});

test('west demolition from ~363 m: flash, light and exposure at the blast instant, the flash is visible in pixels',async({browser},info)=>{
  test.setTimeout(process.env.CI?900000:600000);
  const {entry}=await flashShot(browser,info,{name:'m01-demolition-west-flash-363m',shot:'westFlash',id:'west_demolition',distance:[340,380],roi:'westFlash',limit:PIXEL.flash});
  expect(entry.far.tremorAt).toBeCloseTo(entry.distance/M01_SOUND_SPEED,9);
});

/** West, 3.5..4.1 s after the blast: spans landed on their stored pose, splash/debris/dust, tremor on time. */
async function westLanded(browser,info,{name,shot,roi,limit}){
  const snapshot=place(fixtures.west,SHOTS[shot]);
  const r=await liveCapture(browser,info,{name,snapshot,id:'west_demolition',minAge:M01_COLLAPSE_DURATION+.3,maxAge:M01_COLLAPSE_DURATION+.9});
  try{
    const demo=r.data.m01.demolition,entry=demo.entries.find(e=>e.id==='west_demolition'),budget=M01_DEMOLITION_BUDGET.high;
    expect(entry.distance).toBeGreaterThan(180);expect(entry.farActive).toBe(true);
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
    // What the pure model puts in the air at exactly this age (the frame draws the same particles).
    const model=demolitionParticles({damage:{id:'west_demolition',x:70,y:0,z:20,started:0},clock:entry.age,quality:'high',surfaceY:()=>-3}),post=M01_WEST_FIRING_POST;
    const clods=model.chips.filter(c=>Math.hypot(c.x-post.x,c.z-post.z)<40&&c.y>post.y);
    await r.write({timelineChecks:timeline,shot:SHOTS[shot],model:{puffs:model.puffs.length,chips:model.chips.length,clodsOverThePost:clods.length}});
    await r.page.close();
    await pixelProof(browser,info,r,{name,shot,roi,limit,pre:place(fixtures.west,SHOTS[shot]),id:'west_demolition'});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
    return {r,entry,clods,model};
  }finally{if(!r.page.isClosed())await r.page.close();}
}

test('west demolition 3.5..4.1 s: spans landed on their stored pose, river splash and dust at the fall points, tremor on time, visible in pixels',async({browser},info)=>{
  test.setTimeout(process.env.CI?900000:600000);
  const {model}=await westLanded(browser,info,{name:'m01-demolition-west-fall-splash',shot:'westFall',roi:'westFall',limit:PIXEL.fall});
  expect(model.puffs.some(p=>p.color==='#d7e1e3'),'river splash puffs at this age').toBe(true);
});

test('west demolition 3.5..4.1 s: earth rain at the firing post is visible in pixels',async({browser},info)=>{
  test.setTimeout(process.env.CI?900000:600000);
  const {clods}=await westLanded(browser,info,{name:'m01-demolition-west-earth-rain',shot:'westRain',roi:'westRain',limit:PIXEL.rain});
  expect(clods.length,'clods in the air over the firing post at this age').toBeGreaterThanOrEqual(4);
});

test('restore 6.5 s after the east blast: every collapsed piece is exactly its stored pose, dust hangs over the spans, no flash, visible in pixels',async({browser},info)=>{
  test.setTimeout(process.env.CI?900000:600000);
  const shot=SHOTS.eastRestore,snapshot=place(fixtures.eastAfter,shot),damage=snapshot.sectors.damage.find(d=>d.id==='east_demolition'),minAge=M01_COLLAPSE_DURATION+3.3;
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
    await r.write({minAge,shot});
    await r.page.close();
    // The reference is the PRE-blast east state at the restored frame's clock: intact spans, no dust.
    await pixelProof(browser,info,r,{name:'m01-demolition-east-restore-settled',shot:'eastRestore',roi:'eastRestore',limit:PIXEL.restore,pre:place(fixtures.east,shot),id:'east_demolition'});
    expect(r.errors).toEqual([]);expect(r.failed).toEqual([]);
  }finally{if(!r.page.isClosed())await r.page.close();}
});
