import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {eyePosition} from '../../src/world/spatial.js';
import {projectToScreen} from '../../src/render/m01-demolition.js';
import {route} from '../helpers/m01-route.js';

// T20 (M01 distant-front impostors V1), presentation only. Two reference views at 06:05 from the real simulation route (same fixtures as
// m01-water-vistula.spec.js: the first gameplay step within two minutes after the mark, else the first step at the mark). Only the player's
// position and view are moved; no clock, event or objective is injected. The page runs live (pointer lock granted), is paused by releasing the
// lock and the SAME paused frame is screenshot twice, 1 s apart (pause-freeze proof), then once more with the impostors switched off through the
// opt-in ?debug hook window.m01ImpostorDebug (presentation only; the toggle is part of the view's paused-frame key, so exactly one fresh frame
// renders at the same sim clock). The A/B therefore differs ONLY in the impostors.
//  view10  west bank corridor between the two bridges (x 37, z 20, the water spec's standing place), looking east at the east approach: the Germans at ~1.0-1.07 km, the platoon on the
//          road bridge at ~790 m
//  view12  the same corridor moved to x 390 (inside the playable area; the out-of-bounds line is x 401): Germans at ~660-710 m
// WHY NOT ON A BRIDGE (measured in CI run 38001119046 on 4bc9aac): the first version stood on the deck (route position / x 390, z 42) looking along it. Every
// far figure then sat behind the converging truss portals: the A/B crops of the Low frame are identical to the eye (mean luminance 20 on, 18 off over the 319 px of
// the rects, i.e. the dark ironwork), 12 px changed. A dark silhouette behind dark steel cannot be seen with or without an impostor, so that was not a fair proof of
// legibility. The corridor between the bridges (rail deck z 0, road deck z 40, both +-5 m) has an unobstructed sightline to the east approach.
// ("view 10 / view 12" of the roadmap card are not defined elsewhere in the repo; these are the declared definitions. The Germans at 06:05 hold
//  the east approach, x 1047..1097, not the bridge deck.)
// Pixel regions are the EXACT projected footprint of every impostor (floor/ceil of the foot-to-head, centre +- half width rectangle from the
// instance diagnostics; no padding). The control regions are sky/ground bands containing no impostor and must be pixel-identical on/off.
// M01_IMPOSTORS_BASELINE=1 only captures (png + diagnostics, '-before' suffix), asserts nothing about the new module and imports none of it,
// so it can run on the base commit 71ad067 for the BEFORE images.
const key='cod-guerra:checkpoint:m01:v2',baseline=process.env.M01_IMPOSTORS_BASELINE==='1';
const CLOCK='06:05';
// Declared before the first CI measurement.
const CHANGED_DL=16;                    // |dL| (luminance 0..255) at which a pixel counts as changed by the impostors
const MIN_IN_VIEW=15,MIN_RECT_HIT=.8;   // impostors inside the frame; fraction of their rects with at least one changed pixel
const MIN_UNION_CHANGED=.2,MIN_MEAN_DARKER=8;   // changed fraction of the union of rects; mean luminance of the union, off minus on (06:05: ink is darker than the haze)
const HEIGHT_PX=3,HEIGHT_TOL=.8;        // projected foot-to-head height of an impostor beyond ~290 m
const first={},free={};
route(19390901,{support:true,onStep:({sim})=>{
  const at=seconds(CLOCK);
  if(!first[CLOCK]&&sim.battleClock>=at)first[CLOCK]=structuredClone(sim.snapshot(false));
  if(!free[CLOCK]&&sim.battleClock>=at&&sim.battleClock<=at+120&&!sim.scene&&!sim.mission.complete)free[CLOCK]=structuredClone(sim.snapshot(false));
}});
if(!first[CLOCK])throw new Error('Missing route snapshot at '+CLOCK);

const FOV=70,FOCAL=(720/2)/Math.tan(FOV*Math.PI/360);
const world=new M01Simulation(19390901).world;
const VIEWS=({
  view10:{x:37,z:20,aim:{x:1060,y:-1,z:22}},
  view12:{x:390,z:20,aim:{x:1060,y:-1,z:22}}
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
    const cam=c.camera,items=c.data.m01.impostors.items,rects=items.map(i=>rectOf(cam,i)).filter(Boolean).filter(r=>inFrame(cam,r));
    const top=Math.min(...rects.map(r=>r.y0)),bottom=Math.max(...rects.map(r=>r.y1));
    // Control bands: sky above every figure and a ground band below them (no impostor, no viewmodel at this height).
    const controls={sky:{x0:0,x1:cam.width,y0:0,y1:Math.max(8,top-12)},ground:{x0:0,x1:Math.floor(cam.width*.6),y0:bottom+10,y1:Math.min(cam.height,bottom+10+40)}};
    report.rects=rects;report.controls=controls;report.stats=await analyze(browser,{a:c.a,b:c.off,rects,controls});
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
  // Fair A/B: control bands identical, impostor rects changed.
  for(const [k,v] of Object.entries(s.control)){expect(v.pixels,`control ${k} has pixels`).toBeGreaterThan(500);expect(v.maxDiff,`control ${k} is pixel-identical with the impostors on and off (${JSON.stringify(v)})`).toBe(0);}
  expect(s.union.changed,`changed fraction of the impostor rects (${JSON.stringify(s.union)})`).toBeGreaterThanOrEqual(MIN_UNION_CHANGED);
  expect(s.union.meanB-s.union.meanA,`impostors darken the rects at 06:05 (off ${s.union.meanB.toFixed(1)}, on ${s.union.meanA.toFixed(1)})`).toBeGreaterThanOrEqual(MIN_MEAN_DARKER);
  const hit=s.each.filter(e=>e.changedPixels>=1).length/s.each.length;
  expect(hit,`${s.each.filter(e=>e.changedPixels>=1).length} of ${s.each.length} impostor rects changed`).toBeGreaterThanOrEqual(MIN_RECT_HIT);
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
  expect(r.stats.union.changed,`Low: impostors visible (${JSON.stringify(r.stats.union)})`).toBeGreaterThanOrEqual(MIN_UNION_CHANGED);
});

test('summary',async({},info)=>{
  await info.attach('impostors-summary.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
});
