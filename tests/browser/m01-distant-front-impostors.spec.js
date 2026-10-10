import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {eyePosition,rayBox} from '../../src/world/spatial.js';
import {projectToScreen} from '../../src/render/m01-demolition.js';
import {route} from '../helpers/m01-route.js';

// T20 (M01 distant-front impostors V1), presentation only. Two reference views at 06:05 from the real simulation route (same fixtures as
// m01-water-vistula.spec.js: the first gameplay step within two minutes after the mark, else the first step at the mark). Only the player's
// position and view are moved; no clock, event or objective is injected. The page runs live (pointer lock granted), is paused by releasing the
// lock and the SAME paused frame is screenshot twice, 1 s apart (pause-freeze proof), then once more with the impostors switched off through the
// opt-in ?debug hook window.m01ImpostorDebug (presentation only; the toggle is part of the view's paused-frame key, so exactly one fresh frame
// renders at the same sim clock). The A/B therefore differs ONLY in the impostors.
//  view10  west bank (x -20, z 20, the dry land at the foot of the bridges; eye 1.65 m) looking east along the corridor between the bridges: the Germans at the east approach ~1.07-1.12 km,
//          the platoon on the road bridge at ~790 m
//  view12  the corridor between the bridges at x 390 (inside the playable area; the out-of-bounds line is x 401): Germans at ~660-710 m
// WHY THESE CAMERAS (measured in CI runs 38001119046 on 4bc9aac and 38004354335 on 2a03e14):
//  - standing on a bridge deck looks through the truss portals: the far figures are behind nearer dark steel (Low frame: mean luminance 20 on / 18 off over the 319 px of the
//    rects, 12 px changed);
//  - standing in the river (x 37, z 20, y -10) puts the eye at -8 m: the east-bank lip (-5 m at x >= 300) is higher than the head of a man at 1 km, so terrain depth-occludes every
//    figure and the A/B difference is exactly 0 (correct rendering, not a fair proof).
// A camera on the west bank at z 20 has a free sightline through the slot between the two bridges (each bridge is +-5 m about z 0 and z 40); the earlier
// terrain-only node check (30/30 heads of the east approach above the terrain) did not model the bridges: see SIGHTLINE POPULATION below for the real count.
// ("view 10 / view 12" of the roadmap card are not defined elsewhere in the repo; these are the declared definitions. The Germans at 06:05 hold
//  the east approach, x 1047..1097, not the bridge deck.)
// Pixel regions are the EXACT projected footprint of every impostor (floor/ceil of the foot-to-head, centre +- half width rectangle from the
// instance diagnostics; no padding). The control regions are sky/ground bands containing no impostor and must be pixel-identical on/off.
// SIGHTLINE POPULATION (CI 38006506690 on 455e325, same cameras): 54 of the 66 in-frame impostors have NO line of sight from either camera: the
// platoon (pl_east, 18) stands on the road-bridge deck at z 38 inside the truss, the Germans on the spans (de_spans, 10) likewise, and the wings of
// the east approach (de_east at z < 5 or z > 35) are behind the piers, decks and trusses of the two bridges. Those figures are depth-occluded by
// the scene (correct rendering: their rects were pixel-identical on/off, maxDiff 0), so with ALL rects in the denominator the changed fraction is
// capped at 52/300 = 0.17 (view10) and 80/400 = 0.20 (view12) even if every visible pixel changed; the measured 0.12 / 0.185 came from the 12 figures
// with a free sightline, whose own rects changed 0.71 / 0.93 (mean |dL| 45 / 108, 12/12 rects hit). The pixel assertions (thresholds unchanged) are
// therefore taken over the figures with a GEOMETRIC sightline from the capture camera, decided from the simulation geometry alone (no pixel is read):
// the eye-to-figure segments (centre and head) must clear the terrain (world.traceTerrain, which includes the deck slabs), every world obstacle, every
// bridge collider box and the solid hull between each truss pair. The fresh world (no demolition) is the maximal geometry, so the free set is
// conservative (a figure seen through open truss members counts as blocked and is only reported). Blocked rects are reported, not asserted.
// M01_IMPOSTORS_BASELINE=1 only captures (png + diagnostics, '-before' suffix), asserts nothing about the new module and imports none of it,
// so it can run on the base commit 71ad067 for the BEFORE images.
const key='cod-guerra:checkpoint:m01:v2',baseline=process.env.M01_IMPOSTORS_BASELINE==='1';
const CLOCK='06:05';
// Declared before the first CI measurement.
const CHANGED_DL=16;                    // |dL| (luminance 0..255) at which a pixel counts as changed by the impostors
const MIN_IN_VIEW=15,MIN_RECT_HIT=.8;   // impostors inside the frame; fraction of their rects with at least one changed pixel
const MIN_UNION_CHANGED=.2,MIN_MEAN_ABS=8;   // changed fraction of the union of rects; mean |luminance difference| on vs off over the union (sign-agnostic: the ink is darker than a hazy backdrop and lighter than a dark one, by design)
const HEIGHT_PX=3,HEIGHT_TOL=.8;        // projected foot-to-head height of an impostor beyond ~290 m
// Declared from CI 38006506690 on 455e325 (12 figures with a free sightline in each view): the A/B is asserted over at least this many.
const MIN_FREE_SIGHTLINE=10;
const first={},free={};
route(19390901,{support:true,onStep:({sim})=>{
  const at=seconds(CLOCK);
  if(!first[CLOCK]&&sim.battleClock>=at)first[CLOCK]=structuredClone(sim.snapshot(false));
  if(!free[CLOCK]&&sim.battleClock>=at&&sim.battleClock<=at+120&&!sim.scene&&!sim.mission.complete)free[CLOCK]=structuredClone(sim.snapshot(false));
}});
if(!first[CLOCK])throw new Error('Missing route snapshot at '+CLOCK);

const FOV=70,FOCAL=(720/2)/Math.tan(FOV*Math.PI/360);
const world=new M01Simulation(19390901).world;
/** Everything the eye cannot see through: world obstacles (piers, towers, portals, buildings, covers, trees), every bridge collider box (deck slabs,
 * abutments, truss walls) and the solid hull between each N/S truss pair (the lattice volume). Fresh world = maximal geometry (conservative). */
function opaqueBoxes(world){
  const boxes=[...world.obstacles,...world.colliders],pairs=new Map();
  for(const c of world.colliders){const m=/^(rail|road)_collider_truss_[NS]_(span_\d+)$/.exec(c.id);if(!m)continue;const k=m[1]+'_'+m[2];pairs.set(k,[...(pairs.get(k)??[]),c]);}
  for(const [k,[a,b]] of pairs)if(b)boxes.push({id:k+'_lattice',min:{x:Math.max(a.min.x,b.min.x),y:Math.min(a.min.y,b.min.y),z:Math.min(a.min.z,b.min.z)},max:{x:Math.min(a.max.x,b.max.x),y:Math.max(a.max.y,b.max.y),z:Math.max(a.max.z,b.max.z)}});
  return boxes;
}
const OPAQUE=opaqueBoxes(world);
/** First occluder {id,distance} on the segment eye -> target (stopping `margin` m short of the target), or null when the sightline is free. */
function sightline(eye,target,margin=.5){
  const d={x:target.x-eye.x,y:target.y-eye.y,z:target.z-eye.z},len=Math.hypot(d.x,d.y,d.z),dir={x:d.x/len,y:d.y/len,z:d.z/len},range=Math.max(0,len-margin);
  let hit=null;
  for(const b of OPAQUE){const t=rayBox(eye,dir,b.min,b.max,range);if(t!==null&&(!hit||t<hit.distance))hit={id:b.id,distance:+t.toFixed(1)};}
  const terrain=world.traceTerrain(eye,dir,range);if(terrain&&(!hit||terrain.distance<hit.distance))hit={id:'terrain',distance:+terrain.distance.toFixed(1)};
  return hit;
}
/** Sightline verdict of one impostor from the capture camera: free when both the centre and the head of the figure are unobstructed. */
function sightlineOf(camera,item){
  const eye={x:camera.position[0],y:camera.position[1],z:camera.position[2]},[x,y,z]=item.position;
  const centre=sightline(eye,{x,y:y+item.heightM/2,z}),head=sightline(eye,{x,y:y+item.heightM,z}),foot=sightline(eye,{x,y:y+.05,z});
  return {free:!centre&&!head,centre,head,foot};
}
const VIEWS=({
  view10:{x:-20,z:20,aim:{x:1060,y:-1.35,z:22}},
  view12:{x:390,z:20,aim:{x:1060,y:-3,z:22}}
});
function place(snapshot,view){
  const s=structuredClone(snapshot);
  if(view.x!==null){const y=world.heightAt(view.x,view.z);Object.assign(s.player,{x:view.x,y,z:view.z});}
  Object.assign(s.player,{moveBlend:0,sprinting:false,crouched:false,aiming:false});
  const eye=eyePosition(s.player),dx=view.aim.x-eye.x,dy=view.aim.y-eye.y,dz=view.aim.z-eye.z;
  s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.atan2(dy,Math.hypot(dx,dz));return s;
}
/** Exact screen rectangle of one impostor from its diagnostics item: centre column +- half width, head (y+height) to foot. */
function rectOf(camera,item){
  const foot=projectToScreen(camera,{x:item.position[0],y:item.position[1],z:item.position[2]}),head=projectToScreen(camera,{x:item.position[0],y:item.position[1]+item.heightM,z:item.position[2]});
  if(foot.behind||head.behind)return null;
  const x0=foot.x-item.widthPx/2,x1=foot.x+item.widthPx/2;
  return {id:item.id,nation:item.nation,posture:item.posture,distance:item.distance,x0:Math.floor(x0),x1:Math.ceil(x1),y0:Math.floor(head.y),y1:Math.ceil(foot.y),
    footX:+foot.x.toFixed(2),headY:+head.y.toFixed(2),footY:+foot.y.toFixed(2),heightPx:+(foot.y-head.y).toFixed(2)};
}
const inFrame=(camera,r)=>r.x0>=0&&r.x1<=camera.width&&r.y0>=0&&r.y1<=camera.height;
/** Decodes PNGs in a blank page (no extra dependency). Per rectangle and over their union: luminance and the A/B difference; plus control bands. */
async function analyze(browser,{a,b,rects,controls,dl=CHANGED_DL}){
  const page=await browser.newPage();
  try{
    return await page.evaluate(async({a,b,rects,controls,dl})=>{
      const decode=async b64=>{
        const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none'});
        const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
        return ctx.getImageData(0,0,bitmap.width,bitmap.height);
      };
      const A=await decode(a),B=await decode(b),W=A.width,lum=(d,i)=>.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
      const stat=(list)=>{
        const seen=new Set();let n=0,sa=0,sb=0,changed=0,abs=0,maxDiff=0;
        for(const r of list)for(let y=Math.max(0,r.y0);y<Math.min(A.height,r.y1);y++)for(let x=Math.max(0,r.x0);x<Math.min(W,r.x1);x++){
          const k=y*W+x;if(seen.has(k))continue;seen.add(k);n++;
          const i=k*4,la=lum(A.data,i),lb=lum(B.data,i),d=Math.abs(la-lb);sa+=la;sb+=lb;abs+=d;if(d>=dl)changed++;
          for(let c=0;c<3;c++)maxDiff=Math.max(maxDiff,Math.abs(A.data[i+c]-B.data[i+c]));
        }
        return {pixels:n,meanA:sa/Math.max(1,n),meanB:sb/Math.max(1,n),meanAbs:abs/Math.max(1,n),changed:changed/Math.max(1,n),changedPixels:changed,maxDiff};
      };
      return {width:W,height:A.height,union:stat(rects),each:rects.map(r=>({id:r.id,...stat([r])})),control:Object.fromEntries(Object.entries(controls).map(([k,r])=>[k,stat([r])]))};
    },{a:a.toString('base64'),b:b.toString('base64'),rects,controls,dl});
  }finally{await page.close();}
}
/** 4x nearest-neighbour crop of a PNG (evidence image). */
async function crop4x(browser,png,r){
  const page=await browser.newPage();
  try{
    const b64=await page.evaluate(async({png,r})=>{
      const bytes=Uint8Array.from(atob(png),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none'});
      const w=r.x1-r.x0,h=r.y1-r.y0,canvas=new OffscreenCanvas(w*4,h*4),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
      ctx.drawImage(bitmap,r.x0,r.y0,w,h,0,0,w*4,h*4);
      const blob=await canvas.convertToBlob({type:'image/png'}),buf=new Uint8Array(await blob.arrayBuffer());let s='';for(const v of buf)s+=String.fromCharCode(v);return btoa(s);
    },{png:png.toString('base64'),r});
    return Buffer.from(b64,'base64');
  }finally{await page.close();}
}
const results={};
async function capture(browser,info,{view,quality='high'}){
  const snapshot=place(free[CLOCK]??first[CLOCK],VIEWS[view]),page=await browser.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot,quality})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,snapshot,quality});
  try{
    await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:180000});
    await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
    await page.waitForFunction(()=>{const d=window.gameDiagnostics?.();return d&&!d.paused&&d.m01.renderedFrames>=4;},null,{timeout:240000});
    await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
    const data=await page.evaluate(()=>window.gameDiagnostics());
    const name=`m01-impostors-${view}-${quality}${baseline?'-before':''}`,shot={path:undefined,style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000};
    const a=await page.screenshot({...shot,path:info.outputPath(name+'.png')});
    await page.waitForTimeout(1000);
    const later=await page.evaluate(()=>window.gameDiagnostics()),b=await page.screenshot(shot);
    let off=null,offDiag=null;
    if(!baseline){
      const f0=later.m01.renderedFrames;
      await page.evaluate(()=>window.m01ImpostorDebug.setEnabled(false));
      await page.waitForFunction(f=>window.gameDiagnostics().m01.renderedFrames>=f+1,f0,{timeout:60000});
      await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())))));
      await page.waitForTimeout(500);
      offDiag=await page.evaluate(()=>window.gameDiagnostics());
      expect(offDiag.m01.impostors.enabled,'impostors switched off').toBe(false);expect(offDiag.clock,'sim clock unchanged by the toggle').toBe(later.clock);
      off=await page.screenshot({...shot,path:info.outputPath(name+'-impostors-off.png')});
    }
    expect(errors).toEqual([]);expect(failed).toEqual([]);
    return {name,view,quality,data,later,offDiag,a,b,off,info,camera:data.m01.demolition?.camera,snapshot};
  }finally{await page.close();}
}
/** Crop window for the 4x evidence: the far actors of the route snapshot (alive, >= 350 m) projected with the page camera, padded. Same for BEFORE and AFTER. */
function cropWindow(c){
  const p=c.snapshot.player,cam=c.camera,pts=[];
  for(const a of c.snapshot.actors){
    if(!a.active||a.civilian||!a.alive)continue;
    if(Math.hypot(a.x-p.x,a.z-p.z)<350)continue;
    for(const dy of [0,1.7]){const q=projectToScreen(cam,{x:a.x,y:a.y+dy,z:a.z});if(!q.behind&&q.inside)pts.push(q);}
  }
  if(!pts.length)return {x0:0,y0:0,x1:320,y1:180,actors:0};
  const xs=pts.map(q=>q.x),ys=pts.map(q=>q.y),pad=14;
  return {x0:Math.max(0,Math.floor(Math.min(...xs)-pad)),x1:Math.min(cam.width,Math.ceil(Math.max(...xs)+pad)),y0:Math.max(0,Math.floor(Math.min(...ys)-pad)),y1:Math.min(cam.height,Math.ceil(Math.max(...ys)+pad)),actors:pts.length/2};
}
async function measure(browser,info,c){
  const win=cropWindow(c),report={name:c.name,view:c.view,quality:c.quality,clock:c.data.clock,battleClock:c.data.m01.battleClock,paused:c.data.paused,pausedLater:c.later.paused,simClock:c.data.clock,simClockLater:c.later.clock,
    player:c.data.player,drawCalls:c.data.drawCalls,triangles:c.data.triangles,lighting:c.data.m01.lighting??null,cropWindow:win,impostors:c.data.m01.impostors??null};
  fs.writeFileSync(info.outputPath(c.name+'-crop4x.png'),await crop4x(browser,c.a,win));
  if(!baseline){
    const cam=c.camera,items=c.data.m01.impostors.items,byId=new Map(items.map(i=>[i.id,i]));
    const rects=items.map(i=>rectOf(cam,i)).filter(Boolean).filter(r=>inFrame(cam,r)).map(r=>({...r,sightline:sightlineOf(cam,byId.get(r.id))}));
    const sighted=rects.filter(r=>r.sightline.free),blocked=rects.filter(r=>!r.sightline.free);
    const top=Math.min(...rects.map(r=>r.y0)),bottom=Math.max(...rects.map(r=>r.y1));
    // Control bands: sky above every figure and a ground band below them (no impostor, no viewmodel at this height).
    const controls={sky:{x0:0,x1:cam.width,y0:0,y1:Math.max(8,top-12)},ground:{x0:0,x1:Math.floor(cam.width*.6),y0:bottom+10,y1:Math.min(cam.height,bottom+10+40)}};
    report.rects=rects;report.controls=controls;report.stats=await analyze(browser,{a:c.a,b:c.off,rects,controls});
    // The asserted A/B: only the figures with a geometric sightline from this camera (see SIGHTLINE POPULATION above). Blocked ones are evidence only.
    report.sightline={free:sighted.map(r=>r.id),blocked:blocked.map(r=>({id:r.id,by:(r.sightline.centre??r.sightline.head)?.id??null}))};
    report.statsSighted=sighted.length?await analyze(browser,{a:c.a,b:c.off,rects:sighted,controls}):null;
    report.statsBlocked=blocked.length?await analyze(browser,{a:c.a,b:c.off,rects:blocked,controls}):null;
    report.freeze=await analyze(browser,{a:c.a,b:c.b,rects,controls});
    report.drawCallsOff=c.offDiag.drawCalls;report.trianglesOff=c.offDiag.triangles;
    fs.writeFileSync(info.outputPath(c.name+'-impostors-off-crop4x.png'),await crop4x(browser,c.off,win));
  }
  fs.writeFileSync(info.outputPath(c.name+'-diagnostics.json'),JSON.stringify(report,null,2));
  await info.attach(c.name+'.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
  return report;
}

for(const view of ['view10','view12'])test(`${view} ${CLOCK}: distant front silhouettes (high), impostors on vs off in the same paused frame`,async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const c=await capture(browser,info,{view}),r=results[view]=await measure(browser,info,c);
  if(baseline)return;
  const {stepPhase,HANDOFF_M,MIN_CONTRAST}=await import('../../src/render/m01-impostors.js');
  expect(r.quality).toBe('high');expect(r.paused).toBe(true);expect(r.pausedLater).toBe(true);expect(r.simClockLater).toBe(r.simClock);
  const d=r.impostors;
  expect(d.enabled).toBe(true);expect(d.capacity).toBe(128);expect(d.handoffM).toBe(HANDOFF_M);expect(d.meshes).toBe(2);
  expect(d.drawCalls,'one draw call per nation').toBe(2);expect(d.count.pl+d.count.de).toBe(d.total);expect(d.items.length).toBe(d.total);
  expect(d.count.de,`Germans (${JSON.stringify(d.count)})`).toBeGreaterThanOrEqual(20);expect(d.count.pl,`platoon (${JSON.stringify(d.count)})`).toBeGreaterThanOrEqual(8);
  expect(d.backlight,'06:05 is inside the 05:30-06:40 backlight window').toBeGreaterThan(0);
  const de=d.items.filter(i=>i.nation==='de').map(i=>i.distance);
  if(view==='view10'){expect(Math.min(...de)).toBeGreaterThan(950);expect(Math.max(...de)).toBeLessThan(1200);}
  else{expect(Math.min(...de),'Germans at 600-700 m').toBeGreaterThanOrEqual(600);expect(Math.max(...de)).toBeLessThanOrEqual(760);}
  for(const i of d.items){
    expect(i.distance).toBeGreaterThanOrEqual(HANDOFF_M);expect(i.heightPx).toBeGreaterThanOrEqual(3-1e-6);expect(i.contrast).toBeGreaterThanOrEqual(MIN_CONTRAST-.01);
    expect(Math.abs(i.phase-stepPhase(i.id,r.simClock)),`step phase of ${i.id} is the sim-clock/id function`).toBeLessThan(2e-4);
  }
  // Frozen with the pause: the impostor pixels do not change between two screenshots of the paused page.
  expect(r.freeze.union.maxDiff,'pause-freeze: impostor rects are pixel-identical 1 s apart').toBe(0);
  const rects=r.rects,s=r.stats;
  expect(rects.length,`impostors inside the frame (${rects.length})`).toBeGreaterThanOrEqual(MIN_IN_VIEW);
  const heights=rects.map(q=>q.heightPx),mean=heights.reduce((x,y)=>x+y,0)/heights.length;
  expect(Math.abs(mean-HEIGHT_PX),`mean projected silhouette height ${mean.toFixed(2)} px (min ${Math.min(...heights)}, max ${Math.max(...heights)})`).toBeLessThanOrEqual(HEIGHT_TOL);
  // Fair A/B: control bands identical; the rects of the figures with a free sightline from this camera changed (blocked ones: evidence only).
  for(const [k,v] of Object.entries(s.control)){expect(v.pixels,`control ${k} has pixels`).toBeGreaterThan(500);expect(v.maxDiff,`control ${k} is pixel-identical with the impostors on and off (${JSON.stringify(v)})`).toBe(0);}
  expect(r.sightline.free.length,`impostors with a free sightline (${r.sightline.free.length} of ${rects.length} in frame; blocked by ${JSON.stringify([...new Set(r.sightline.blocked.map(b=>b.by))])})`).toBeGreaterThanOrEqual(MIN_FREE_SIGHTLINE);
  const f=r.statsSighted;
  expect(f.union.changed,`changed fraction of the sighted impostor rects (${JSON.stringify(f.union)}; all rects ${JSON.stringify(s.union)})`).toBeGreaterThanOrEqual(MIN_UNION_CHANGED);
  expect(f.union.meanAbs,`impostors change the sighted rects by a mean |dL| of at least ${MIN_MEAN_ABS} (off ${f.union.meanB.toFixed(1)}, on ${f.union.meanA.toFixed(1)}; signed ${(f.union.meanB-f.union.meanA).toFixed(1)})`).toBeGreaterThanOrEqual(MIN_MEAN_ABS);
  const hit=f.each.filter(e=>e.changedPixels>=1).length/f.each.length;
  expect(hit,`${f.each.filter(e=>e.changedPixels>=1).length} of ${f.each.length} sighted impostor rects changed`).toBeGreaterThanOrEqual(MIN_RECT_HIT);
  // Cost: two extra meshes at most (the off side restores the procedural bodies of the same actors).
  expect(r.drawCalls-r.drawCallsOff,`draw calls on ${r.drawCalls} off ${r.drawCallsOff}`).toBeLessThanOrEqual(2);
});

test('Low quality: capacity 64 per nation, still one draw call per nation',async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const c=await capture(browser,info,{view:'view10',quality:'low'}),r=await measure(browser,info,c);
  if(baseline)return;
  const d=r.impostors;
  expect(r.quality).toBe('low');expect(d.capacity).toBe(64);expect(d.drawCalls).toBe(2);expect(d.count.de).toBeLessThanOrEqual(64);expect(d.count.pl).toBeLessThanOrEqual(64);
  expect(d.total).toBeGreaterThan(20);
  expect(r.stats.control.sky.maxDiff).toBe(0);
  expect(r.sightline.free.length,`Low: impostors with a free sightline (${r.sightline.free.length} of ${r.rects.length} in frame)`).toBeGreaterThanOrEqual(MIN_FREE_SIGHTLINE);
  expect(r.statsSighted.union.changed,`Low: sighted impostors visible (${JSON.stringify(r.statsSighted.union)}; all rects ${JSON.stringify(r.stats.union)})`).toBeGreaterThanOrEqual(MIN_UNION_CHANGED);
});

test('summary',async({},info)=>{
  await info.attach('impostors-summary.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
});
