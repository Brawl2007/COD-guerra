import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {eyePosition} from '../../src/world/spatial.js';
import {dustClouds,dustThickness,DUST} from '../../src/game/m01-dust.js';
import {projectToScreen} from '../../src/render/m01-demolition.js';
import {route} from '../helpers/m01-route.js';

// T48 (M01-GERMAN-RETREAT-AND-REGROUP-V1): the capture at 06:12 of the battle clock. The snapshot is the first tick at or after 06:12:10 of the real
// simulation route (standard seed, no cover fire): the Germans reached their places at 06:12:00 and have stood still for 24 ticks, so their published
// gait is idle whatever the number of live ticks the page runs before it is paused. Only the player's position and view are
// moved (to VIEW below); no clock, event, actor or objective is injected. The page runs live until the
// pointer lock is released, so the paused frame is a few simulation ticks (well under a second of play) later than the snapshot: the regrouped Germans
// do not move any more, the battle clock is still 06:12.
// Pixel proof that the regrouped Germans are DRAWN: the very same paused clock is rendered twice, with the distant-front impostors on and off
// (the opt-in ?debug hook window.m01ImpostorDebug, presentation only), so the only difference is the silhouettes of the regrouped men; control bands
// of sky must be pixel-identical.
const key='cod-guerra:checkpoint:m01:v2',SURVIVORS=Array.from({length:6},(_,i)=>`de_spans_${i+4}`),FALLEN=Array.from({length:4},(_,i)=>`de_spans_${i}`);
const CAPTURE=seconds('06:12:10');
// WHERE THE CAMERA STANDS. T48 staged it on the road deck (x 38, z 42.4; the roadmap's "withdrawal-deck-east" viewpoint, DECK). That line of sight runs 72-73 m through the heart of the east demolition's cloud
// (x 800, z 20, r 42 m, 32 m high, density 1 from 1.5 s to 90 s after the blast at 955.4 s, so at 06:12:10, 15 s old, it is at its thickest): the simulation's own sight rule (m01-dust.js, DUST.blockAt =
// 3 m of density-1 cloud) says a man on the deck does not see the regrouped Germans 160 m beyond it, and since 33fc8888 (review-render-4, merged 60efedeb) the renderer draws exactly that: the volume writes the
// depth of its near-opaque part, so the far impostors behind it are depth-rejected (before it the cloud wrote no depth and the men behind it still showed through). Bisected on this very spec and route: it passes at 4a487ad5
// (the cylinder entry depth, a774fe80) and fails at 60efedeb with {pixels:36, changed:0, maxDiff:0}; with the cloud's density set to 1e-4 in the saved state the same camera shows the silhouettes again (changed 4,
// maxDiff 118). So the renderer follows the simulation and the staging is what changed meaning: the camera now stands where the simulation says the knot is seen. The cloud is a cylinder of 42 m; from the south side of the
// flood plain the line to the knot clears it. VIEW is inside the playable rectangle (z <= 140, x <= 401: no boundary countdown; x > 270 only raises the "demasiado longe" notice) and its line to every survivor
// is free for the world (world.lineOfSight) and for the dust (thickness 0 of the 3 m that block): both are asserted below from the same route.
const DECK={x:38,z:42.4},VIEW={x:396,z:138};
/** The player standing at `at` exactly as the page will have him (the same fields `place` writes). */
const stand=(player,at,world)=>({...player,x:at.x,z:at.z,y:world.heightAt(at.x,at.z),moveBlend:0,sprinting:false,crouched:false,aiming:false});
let regroup=null,sight=null;
route(19390901,{support:false,onStep:({sim})=>{
  if(regroup||!sim.consumedEvent('evt_m01_east_demolition')||sim.battleClock<CAPTURE)return;
  regroup=structuredClone(sim.snapshot(false));
  // The simulation's sight rule (M01Simulation.sees without its diagnostic counters: the route is left untouched) from the two candidate places to each survivor.
  const clouds=dustClouds(sim.sectors.damage,sim.clock,[]),men=SURVIVORS.map(id=>sim.actor(id)).filter(a=>a.alive);
  sight={clouds,blockAt:DUST.blockAt};
  for(const [name,at] of Object.entries({deck:DECK,view:VIEW})){
    const me=stand(sim.player,at,sim.world);
    sight[name]=men.map(m=>({id:m.id,worldLineOfSight:sim.world.lineOfSight(me,m),dustThicknessM:+dustThickness(clouds,eyePosition(me),eyePosition(m)).toFixed(2)}));
  }
}});
if(!regroup)throw new Error('Missing the 06:12 state of the real route');
const world=new M01Simulation(19390901).world;
const knot=SURVIVORS.map(id=>regroup.actors.find(a=>a.id===id)).filter(a=>a.alive);
const centre={x:knot.reduce((s,a)=>s+a.x,0)/knot.length,y:1.1,z:knot.reduce((s,a)=>s+a.z,0)/knot.length};
function place(snapshot,view){
  const s=structuredClone(snapshot);
  Object.assign(s.player,stand(s.player,view,world));   // (y comes from the world, as the simulation would place it)
  const eye=eyePosition(s.player),dx=view.aim.x-eye.x,dy=view.aim.y-eye.y,dz=view.aim.z-eye.z;
  s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.atan2(dy,Math.hypot(dx,dz));return s;
}
const AIMED={...VIEW,aim:centre};
// The knot forms REGROUP_AHEAD m east of the westmost survivor (src/game/m01-simulation.js). At T48 (f9d76fb5) the Germans had stood at x ~1020 (980 m from the deck: the band was 950-1010).
// Since combat slice 2 (2b458e24, 2026-10-18: the deck assault goes to mid-deck and the demolition waits for the deck to clear) the westmost survivor is 58 m further west:
// the knot stands at x ~960-962 (922-924 m from the deck, measured with this very route in Node at 2b458e24, 195b6f4e and the integration line, and read by the browser). From VIEW (396, 138) they are 572.6 and
// 574.6 m away (the horizontal player-to-actor distance the impostors publish; measured with this route in Node at 738eeb2e): the band is the same 60 m wide, centred on them, and far beyond the 350 m hand-off.
const DISTANCE_FROM={min:545,max:605};

async function decode(browser,pngs){
  const page=await browser.newPage();
  try{
    return await page.evaluate(async list=>{
      const out=[];
      for(const b64 of list){
        const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none'});
        const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
        const d=ctx.getImageData(0,0,bitmap.width,bitmap.height);out.push({width:d.width,height:d.height,data:Array.from(d.data)});
      }
      return out;
    },pngs.map(p=>p.toString('base64')));
  }finally{await page.close();}
}
/** Nearest-neighbour zoom of a window of a PNG (evidence image). */
async function crop(browser,png,r,zoom){
  const page=await browser.newPage();
  try{
    const b64=await page.evaluate(async({png,r,zoom})=>{
      const bytes=Uint8Array.from(atob(png),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none'});
      const w=r.x1-r.x0,h=r.y1-r.y0,canvas=new OffscreenCanvas(w*zoom,h*zoom),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
      ctx.drawImage(bitmap,r.x0,r.y0,w,h,0,0,w*zoom,h*zoom);
      const blob=await canvas.convertToBlob({type:'image/png'}),buf=new Uint8Array(await blob.arrayBuffer());let s='';for(const v of buf)s+=String.fromCharCode(v);return btoa(s);
    },{png:png.toString('base64'),r,zoom});
    return Buffer.from(b64,'base64');
  }finally{await page.close();}
}

test('06:12: the Germans of the spans stand regrouped on the east deck, the fallen set down beside them, and they are drawn there',async({page,browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  const snapshot=place(regroup,AIMED);
  await page.addInitScript(({key,snapshot})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality','high');},{key,snapshot});
  await page.goto('?debug=1&visual-verify=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:180000});
  await page.locator('#quality').selectOption('high');await page.locator('#continue').click();
  await page.waitForFunction(()=>{const d=window.gameDiagnostics?.();return d&&!d.paused&&d.m01.renderedFrames>=4;},null,{timeout:240000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  // The paused frame must be one rendered at the paused clock, with the impostors synced to it.
  await page.waitForFunction(()=>{const d=window.gameDiagnostics?.();if(!d||!d.paused)return false;const imp=d.m01.impostors;return imp&&imp.clock===d.clock;},null,{timeout:240000});
  const data=await page.evaluate(()=>window.gameDiagnostics()),state=await page.evaluate(()=>window.gameVerificationState().snapshot);
  // --- the state the page is showing (the simulation's data, not an inference from pixels) ---
  expect(state.consumed.evt_m01_east_demolition).toBeDefined();
  expect(state.battleClock,'still 06:12 of the battle clock').toBeGreaterThanOrEqual(CAPTURE);expect(state.battleClock).toBeLessThan(seconds('06:13:00'));
  const by=id=>state.actors.find(a=>a.id===id),was=id=>regroup.actors.find(a=>a.id===id);
  for(const a of knot){
    const now=by(a.id);
    expect(now.state,a.id).toBe('REGROUP');expect(now.fallBack).toBeUndefined();expect([now.x,now.z],a.id+' on its place').toEqual([a.x,a.z]);
  }
  for(const id of FALLEN){const now=by(id);expect(now.alive).toBe(false);expect(now.carriedBy??null,id+' is not carried any more').toBeNull();expect([now.x,now.z]).toEqual([was(id).x,was(id).z]);}
  expect(data.m01.enemyAlive,'no German but the four felled by the blast is out of the fight').toBe(regroup.actors.filter(a=>a.team==='enemy'&&a.alive&&!a.displayOnly).length);
  // --- the camera stands where the simulation's own sight rule sees the knot (and, recorded not asserted, where the road deck does not) ---
  expect(sight.view.map(v=>v.id).sort(),'the sight rule was asked about every survivor').toEqual(knot.map(a=>a.id).sort());
  for(const v of sight.view){expect(v.worldLineOfSight,v.id+': the world leaves the line from VIEW free').toBe(true);expect(v.dustThicknessM,v.id+': no dust of the demolition cloud on the line from VIEW').toBeLessThan(sight.blockAt);}
  // --- drawn: the survivors are distant-front silhouettes on the deck ---
  const items=data.m01.impostors.items.filter(i=>SURVIVORS.includes(i.id));
  expect(items.map(i=>i.id).sort(),'the regrouped men are drawn as distant silhouettes').toEqual(knot.map(a=>a.id).sort());
  for(const i of items){expect(i.nation).toBe('de');expect(i.posture,i.id).toBe('standing');expect(i.distance).toBeGreaterThan(DISTANCE_FROM.min);expect(i.distance).toBeLessThan(DISTANCE_FROM.max);expect(i.moving,i.id+' stands still').toBeFalsy();}
  // --- the capture at 06:12 and the same frame without the impostors ---
  const shot={style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000};
  // Both frames are RE-RENDERS at the paused clock (the toggle makes the view draw again). The frame the page paused on is its last live one, and the dust of the demolition (in this camera's sky control band) is lit
  // there with the light of the render call before it: m01-view.js runs syncDamage() (atmosphere.update(): the dust volume reads `this.light`) before lighting() (which writes it), so a live frame trails by one call.
  // Measured at this camera: the live frame and a later re-render differ by one level of one channel on ~100 pixels of the cloud (none elsewhere), while two re-renders (impostors off, off again) were
  // byte-identical. Comparing re-render with re-render keeps the control at maxDiff 0 and leaves the silhouettes as the only difference.
  const rerender=async enabled=>{
    const frames=(await page.evaluate(()=>window.gameDiagnostics())).m01.renderedFrames;
    await page.evaluate(on=>window.m01ImpostorDebug.setEnabled(on),enabled);
    await page.waitForFunction(f=>window.gameDiagnostics().m01.renderedFrames>=f+1,frames,{timeout:60000});
    await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())))));
    await page.waitForTimeout(500);
  };
  await rerender(false);await rerender(true);
  expect((await page.evaluate(()=>window.gameDiagnostics())).m01.impostors.enabled,'the impostors are back on for the capture').toBe(true);
  const on=await page.screenshot({...shot,path:info.outputPath('m01-german-regroup-0612.png')});
  // The same paused frame with the HUD visible: its battle clock is the capture's own time stamp.
  await expect(page.locator('#battle-clock'),'the HUD clock of the capture').toHaveText(/^06:12:/);
  await page.screenshot({style:'#pause,#menu{visibility:hidden!important}',timeout:120000,path:info.outputPath('m01-german-regroup-0612-hud.png')});
  await rerender(false);
  const off=await page.screenshot({...shot,path:info.outputPath('m01-german-regroup-0612-impostors-off.png')});
  const later=await page.evaluate(()=>window.gameDiagnostics());expect(later.clock,'the toggle never advances the simulation').toBe(data.clock);
  // Exact rectangles of the silhouettes from the page's own camera, and a pad for the 4x evidence crops.
  const cam=data.m01.demolition?.camera;expect(cam,'the page publishes its camera').toBeTruthy();
  const rects=items.map(i=>{
    const foot=projectToScreen(cam,{x:i.position[0],y:i.position[1],z:i.position[2]}),head=projectToScreen(cam,{x:i.position[0],y:i.position[1]+i.heightM,z:i.position[2]});
    return {id:i.id,x0:Math.floor(foot.x-i.widthPx/2)-1,x1:Math.ceil(foot.x+i.widthPx/2)+1,y0:Math.floor(head.y)-1,y1:Math.ceil(foot.y)+1,inside:foot.inside&&head.inside};
  });
  expect(rects.every(r=>r.inside),'all the silhouettes are inside the frame').toBe(true);
  // Evidence crops: a 96 x 60 px window centred on the knot, at 8x.
  const cx=Math.round(rects.reduce((n,r)=>n+(r.x0+r.x1)/2,0)/rects.length),cy=Math.round(rects.reduce((n,r)=>n+(r.y0+r.y1)/2,0)/rects.length);
  const win={x0:Math.max(0,cx-48),x1:Math.min(cam.width,cx+48),y0:Math.max(0,cy-30),y1:Math.min(cam.height,cy+30)};
  fs.writeFileSync(info.outputPath('m01-german-regroup-0612-crop8x.png'),await crop(browser,on,win,8));
  fs.writeFileSync(info.outputPath('m01-german-regroup-0612-impostors-off-crop8x.png'),await crop(browser,off,win,8));
  const [A,B]=await decode(browser,[on,off]),W=A.width;
  const lum=(img,i)=>.2126*img.data[i]+.7152*img.data[i+1]+.0722*img.data[i+2];
  const stat=list=>{
    const seen=new Set();let pixels=0,changed=0,maxDiff=0,abs=0;
    for(const r of list)for(let y=Math.max(0,r.y0);y<Math.min(A.height,r.y1);y++)for(let x=Math.max(0,r.x0);x<Math.min(W,r.x1);x++){
      const k=y*W+x;if(seen.has(k))continue;seen.add(k);pixels++;const i=k*4,d=Math.abs(lum(A,i)-lum(B,i));abs+=d;if(d>=16)changed++;
      for(let c=0;c<3;c++)maxDiff=Math.max(maxDiff,Math.abs(A.data[i+c]-B.data[i+c]));
    }
    return {pixels,changed,maxDiff,meanAbs:abs/Math.max(1,pixels)};
  };
  const top=Math.min(...rects.map(r=>r.y0)),sky={x0:0,x1:cam.width,y0:0,y1:Math.max(8,top-12)};
  const union=stat(rects),control=stat([sky]),perMan=rects.map(r=>({id:r.id,...stat([r])}));
  const evidence=JSON.stringify({battleClock:state.battleClock,clock:data.clock,camera:cam,rects,window:win,union,control,perMan,sight,view:VIEW,deck:DECK,
    items,fallen:FALLEN.map(id=>({id,x:by(id).x,z:by(id).z,carriedBy:by(id).carriedBy??null})),knot:knot.map(a=>({id:a.id,x:a.x,z:a.z}))},null,2);
  fs.writeFileSync(info.outputPath('german-regroup-0612.json'),evidence);await info.attach('german-regroup-0612.json',{body:evidence,contentType:'application/json'});
  expect(control.pixels,'the sky control has pixels').toBeGreaterThan(500);
  expect(control.maxDiff,'the sky is pixel-identical with the impostors on and off').toBe(0);
  expect(union.changed,`the regrouped men change the frame: ${JSON.stringify(union)}`).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
