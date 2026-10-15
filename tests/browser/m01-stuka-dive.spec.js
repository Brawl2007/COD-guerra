import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {M01_BOMBING_BATTLE_SECONDS,m01StukaPosition,m01StukaPathTime,M01_STUKA_OFFSETS} from '../../src/world/m01-aircraft-path.js';
import {eyePosition} from '../../src/world/spatial.js';
import {m01BombFlights,JU87_BOMB_RUN} from '../../src/render/m01-aircraft.js';
import {driver} from '../helpers/m01-route.js';

// T17 V1 (Ju 87 dive sequence). Snapshots come from the real simulation (idle player, no clock/event/objective injection); only the
// player's yaw/pitch of the injected checkpoint is turned towards the aircraft so the screenshots show them. Four continuations:
//  bomb       ~0.8 s before the first blast: the first bomb is ~0.7 s out of the lead plane and clearly separated from it
//  formation  3.3 s after the bombing: the three Ju 87 pulling out one behind the other, all within ~600 m of the player
// The player's position and view of the injected checkpoint (page input, not production code) are chosen by a search over
// legal ground positions near the station so that every tracked object projects inside the 70 degree camera at 16:9; the
// diagnostics of the sampled and of the frozen frame are projected the same way (see FRAMING in the attached JSON).
//  04:35      a restored checkpoint at 04:35:00 battle time: the formation is leaving east, positions equal the pure path
//  gone       45 s after the bombing: nothing remains in the sky (the old 90 s path would have kept looping)
// The timing-critical state (bomb 1.5 s before each blast, landing on the authoritative point) is proven frame by frame in
// tests/m01-aircraft.test.js against the real simulation; this spec proves that the built page draws what that model says.
const key='cod-guerra:checkpoint:m01:v2',BOMBING='evt_m01_bombing_0434';

const d=driver();d.step({skip:true});d.until(()=>d.sim.renderState.stukas,200);
const snapshots={};
d.until(()=>M01_BOMBING_BATTLE_SECONDS-d.sim.battleClock<=.8,200);snapshots.bomb=structuredClone(d.sim.snapshot(false));
d.until(()=>d.sim.consumed[BOMBING]!==undefined&&d.sim.clock-d.sim.consumed[BOMBING]>=3.3,200);snapshots.formation=structuredClone(d.sim.snapshot(false));
d.until(()=>d.sim.battleClock>=M01_BOMBING_BATTLE_SECONDS+60,200);snapshots.restore0435=structuredClone(d.sim.snapshot(false));
d.until(()=>d.sim.clock-d.sim.consumed[BOMBING]>=45,200);snapshots.gone=structuredClone(d.sim.snapshot(false));
for(const [name,snapshot] of Object.entries(snapshots))if(!snapshot)throw new Error('Missing snapshot '+name);

// ---- Framing (all of it pure model + world data; nothing here is read from the page) -------------------------------------
const VIEW={fov:70,aspect:1280/720,width:1280,height:720};
const unit=v=>{const n=Math.hypot(v.x,v.y,v.z)||1;return {x:v.x/n,y:v.y/n,z:v.z/n};};
// Camera-space projection from an eye, yaw `angle` (x=cos, z=sin) and `pitch`: ndc in [-1,1] when inside the frustum.
function project(eye,angle,pitch,point,view=VIEW){
  const f={x:Math.cos(pitch)*Math.cos(angle),y:Math.sin(pitch),z:Math.cos(pitch)*Math.sin(angle)},r={x:-Math.sin(angle),y:0,z:Math.cos(angle)};
  const u={x:r.y*f.z-r.z*f.y,y:r.z*f.x-r.x*f.z,z:r.x*f.y-r.y*f.x};
  const d={x:point.x-eye.x,y:point.y-eye.y,z:point.z-eye.z},depth=d.x*f.x+d.y*f.y+d.z*f.z,t=Math.tan(view.fov*Math.PI/360);
  const x=(d.x*r.x+d.y*r.y+d.z*r.z)/depth/(t*view.aspect),y=(d.x*u.x+d.y*u.y+d.z*u.z)/depth/t;
  return {ndc:[x,y],depth,inside:depth>0&&Math.abs(x)<=1&&Math.abs(y)<=1,pixel:[(x+1)/2*view.width,(1-y)/2*view.height]};
}
// A legal ground position near the station (not inside a solid, >= 60 m from every blast point) with a search over the view
// that keeps every tracked point (given per elapsed-time sample) inside the frustum with `margin`, maximising the smallest
// angular size (1 / distance) of the tracked set `size(points)`.
function bestView(snapshot,{samples,margin=.8,size,focus}){
  const world=d.sim.world,blasts=JU87_BOMB_RUN.map(r=>world.point(r.point)),best={score:-Infinity};
  for(let x=-340;x<=-20;x+=10)for(let z=-100;z<=140;z+=10){
    const y=world.heightAt(x,z);
    if(world.obstacles.some(b=>y+1.45>b.min.y&&y+.1<b.max.y&&x+.6>b.min.x&&x-.6<b.max.x&&z+.6>b.min.z&&z-.6<b.max.z))continue;
    if(blasts.some(b=>Math.hypot(b.x-x,b.z-z)<60))continue;
    const player={...snapshot.player,x,y,z},eye=eyePosition(player),all=samples.flat();
    const centre=unit(all.map(p=>unit({x:p.x-eye.x,y:p.y-eye.y,z:p.z-eye.z})).reduce((a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}),{x:0,y:0,z:0}));
    const angle=Math.atan2(centre.z,centre.x),pitch=Math.min(1.25,Math.asin(centre.y));
    const lim=margin;
    if(!all.every(p=>{const q=project(eye,angle,pitch,p);return q.depth>0&&Math.abs(q.ndc[0])<=lim&&Math.abs(q.ndc[1])<=lim;}))continue;
    const score=Math.min(...samples.map(pts=>size(pts,eye)));
    if(score>best.score)Object.assign(best,{score,x,y,z,angle,pitch,eye});
  }
  if(!(best.score>-Infinity))throw new Error('No legal framing found');
  return best;
}
function withView(snapshot,v){
  const s=structuredClone(snapshot);Object.assign(s.player,{x:v.x,y:v.y,z:v.z,angle:v.angle,pitch:v.pitch,aiming:false});return s;
}
const dist=(eye,p)=>Math.hypot(p.x-eye.x,p.y-eye.y,p.z-eye.z);
// Formation: all three planes, 3.3 .. 4.5 s after the bombing (the paused frame may trail the sampled one).
const formationView=bestView(snapshots.formation,{samples:[3.3,3.7,4.1,4.5].map(t=>[0,1,2].map(i=>m01StukaPosition(t,i))),
  size:(pts,eye)=>1/Math.max(...pts.map(p=>dist(eye,p)))});
// Bomb: the first bomb (and its carrier) 0.7 .. 1.15 s after release, i.e. 0.8 .. 0.35 s before the blast.
const bombFrames=t=>{
  const clock=1000+t,state={battleClock:M01_BOMBING_BATTLE_SECONDS-(1000-clock),damage:[]},w=d.sim.world;
  const f=m01BombFlights({clock,state,world:w,player:snapshots.bomb.player}).find(x=>x.id==='station_bomb');
  return [f.position,m01StukaPosition(t,0)];
};
const bombView=bestView(snapshots.bomb,{samples:[-.8,-.65,-.5,-.35].map(bombFrames),margin:.85,
  size:(pts,eye)=>1/Math.max(dist(eye,pts[0]),dist(eye,pts[1]))});
const FRAMING={formation:{x:formationView.x,y:formationView.y,z:formationView.z,angle:formationView.angle,pitch:formationView.pitch},
  bomb:{x:bombView.x,y:bombView.y,z:bombView.z,angle:bombView.angle,pitch:bombView.pitch}};

// Look from the player's own eye at a point (angle: x=cos, z=sin; pitch up positive); the camera has a 70 degree vertical FOV.
function aimedAt(snapshot,point){
  const s=structuredClone(snapshot),eye=eyePosition(s.player),dx=point.x-eye.x,dy=point.y-eye.y,dz=point.z-eye.z;
  s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.min(1.25,Math.atan2(dy,Math.hypot(dx,dz)));s.player.aiming=false;return s;
}
const since=(snapshot)=>snapshot.clock-snapshot.consumed[BOMBING];
const sinceBomb=snapshot=>-(M01_BOMBING_BATTLE_SECONDS-snapshot.battleClock);   // before the bombing: scheduled battle seconds left

// Projection of what the page reports (live sample and frozen frame) through the injected camera. `track`: {view, planes, bomb, minPlanePx, minBombPx}.
function projectDiagnostics(diag,{view,planes=[],bomb=false}){
  const eye=eyePosition({...view.player}),out={};
  const at=(label,pos,sizeM)=>{const q=project(eye,view.player.angle,view.player.pitch,{x:pos[0],y:pos[1],z:pos[2]});
    out[label]={distance:+dist(eye,{x:pos[0],y:pos[1],z:pos[2]}).toFixed(1),ndc:q.ndc.map(v=>+v.toFixed(3)),pixel:q.pixel.map(Math.round),inside:q.inside,
      sizePx:+(sizeM/Math.max(1,dist(eye,{x:pos[0],y:pos[1],z:pos[2]}))/(2*Math.tan(VIEW.fov*Math.PI/360))*VIEW.height).toFixed(1)};};
  for(const i of planes)at('plane'+i,diag.aircraft.planes[i].position,15);   // Ju 87 B wingspan 13.8 m
  if(bomb){const f=diag.aircraft.bombs.flights.find(x=>x.id==='station_bomb');if(f)at('bomb',f.position,2);}
  return {eye:{x:eye.x,y:eye.y,z:eye.z},yaw:view.player.angle,pitch:view.player.pitch,fov:VIEW.fov,aspect:VIEW.aspect,objects:out};
}

async function capture(browser,info,{name,snapshot,needBomb=false,expectDiagnostics,track=null}){
  const page=await browser.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality','high');},{key,snapshot});
  try{
    await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:180000});
    await page.locator('#quality').selectOption('high');
    // The Ju 87 GLBs load asynchronously: wait for them while the mission clock is still frozen, so no flight time is spent loading.
    await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.aircraft.loaded.length===3,null,{timeout:240000});
    await page.locator('#continue').click();
    // Wait for the exact condition to be true in a live frame, keep that diagnostics sample and release the pointer lock in the SAME
    // callback (the game stops ticking at once because it also needs the lock), so the frozen frame is the one that was sampled.
    // needBomb: the 1.5 s flight is short, so the sample is the first running frame that draws a bomb.
    const handle=await page.waitForFunction(({needBomb})=>{
      const d=window.gameDiagnostics?.();if(!d||d.paused||!d.m01||d.m01.renderedFrames<(needBomb?1:3))return false;
      const a=d.m01.aircraft;if(!a.path||(needBomb&&a.bombs.visible<1))return false;
      const sample=JSON.parse(JSON.stringify({clock:d.clock,aircraft:a,eventIds:d.eventIds,damage:d.m01.damage}));
      document.exitPointerLock();return sample;
    },{needBomb},{timeout:240000,polling:'raf'});
    const live=await handle.jsonValue();
    await expectDiagnostics?.(live,page);
    await expect(page.locator('#pause')).toBeVisible();
    const paused=await page.evaluate(()=>window.gameDiagnostics());
    // The lock is released asynchronously by the browser: at most a few frames (bounded) run between the sample and the pause.
    expect(paused.clock-live.clock).toBeGreaterThanOrEqual(0);expect(paused.clock-live.clock).toBeLessThan(.75);
    await page.screenshot({path:info.outputPath(name+'.png'),style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000});
    const report={live,pausedClock:paused.clock,pausedBombs:paused.m01.aircraft.bombs,pausedPath:paused.m01.aircraft.path};
    if(track){
      const spec={view:{player:snapshot.player},planes:track.planes,bomb:track.bomb};
      report.framing={framing:FRAMING,live:projectDiagnostics(live,spec),paused:projectDiagnostics(paused.m01,spec)};
      for(const frame of [report.framing.live,report.framing.paused])for(const [label,o] of Object.entries(frame.objects)){
        expect(o.inside,`${name}: ${label} projects inside the frame (${JSON.stringify(o)})`).toBe(true);
        expect(o.sizePx,`${name}: ${label} is big enough to read`).toBeGreaterThanOrEqual(label==='bomb'?track.minBombPx:track.minPlanePx);
      }
    }
    // The diagnostics go both into the Playwright report and into a file of the uploaded test-results directory.
    fs.writeFileSync(info.outputPath(name+'-diagnostics.json'),JSON.stringify(report,null,2));
    await info.attach(name+'.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
    expect(errors).toEqual([]);expect(failed).toEqual([]);
    return {live,paused};
  }finally{await page.close();}
}

test('the chosen framings keep the tracked objects inside the 70 degree camera, large enough to read, in the pure model',()=>{
  const check=(view,list,minPx)=>{
    const eye=eyePosition(withView(snapshots.bomb,view).player);
    for(const pts of list)for(const p of pts){
      const q=project(eye,view.angle,view.pitch,p);expect(q.inside).toBe(true);
      expect(15/dist(eye,p)/(2*Math.tan(VIEW.fov*Math.PI/360))*VIEW.height).toBeGreaterThan(minPx);
    }
  };
  check(FRAMING.formation,[3.3,3.7,4.1,4.5].map(t=>[0,1,2].map(i=>m01StukaPosition(t,i))),10);
  const eye=eyePosition(withView(snapshots.bomb,FRAMING.bomb).player);
  for(const t of [-.8,-.65,-.5,-.35]){
    const [b,plane]=bombFrames(t);expect(project(eye,FRAMING.bomb.angle,FRAMING.bomb.pitch,b).inside).toBe(true);expect(project(eye,FRAMING.bomb.angle,FRAMING.bomb.pitch,plane).inside).toBe(true);
    expect(2/dist(eye,b)/(2*Math.tan(VIEW.fov*Math.PI/360))*VIEW.height).toBeGreaterThan(7);
    expect(dist(b,plane)).toBeGreaterThan(40);   // clearly out of the aircraft, not a part of it
  }
});

test('formation: three Ju 87 pulling out one behind the other on their stukaPath, 3.5 s apart, close to the player',async({browser},info)=>{
  test.setTimeout(process.env.CI?420000:300000);
  const snapshot=withView(snapshots.formation,FRAMING.formation);
  expect(since(snapshot)).toBeGreaterThanOrEqual(3.3);
  await capture(browser,info,{name:'m01-stuka-formation',snapshot,track:{planes:[0,1,2],minPlanePx:10},expectDiagnostics:live=>{
    const a=live.aircraft;
    expect(a.planes).toHaveLength(3);expect(a.planes.every(p=>p.visible)).toBe(true);
    expect(live.eventIds).toContain(BOMBING);
    expect(['dive','departure']).toContain(a.path.phase);expect(a.path.since).toBeGreaterThanOrEqual(3.3);expect(a.path.since).toBeLessThan(4.6);
    // The page draws the pure path at its own anchor (the saved bombing event).
    a.planes.forEach((p,i)=>{
      const want=m01StukaPosition(a.path.since,i);
      expect(p.position[0]).toBeCloseTo(want.x,3);expect(p.position[1]).toBeCloseTo(want.y,3);expect(p.position[2]).toBeCloseTo(want.z,3);
    });
    expect(a.path.planeSeconds[0]-a.path.planeSeconds[1]).toBeCloseTo(M01_STUKA_OFFSETS[1],9);
    expect(a.path.planeSeconds[1]-a.path.planeSeconds[2]).toBeCloseTo(M01_STUKA_OFFSETS[2]-M01_STUKA_OFFSETS[1],9);
    expect(a.path.planeSeconds[0]).toBeCloseTo(m01StukaPathTime(a.path.since,0),9);
    expect(a.bombs.pool).toBe(3);
  }});
});

test('bomb: the first bomb falls from the lead plane towards the station point, 1.5 s before its blast',async({browser},info)=>{
  test.setTimeout(process.env.CI?420000:300000);
  const snapshot=withView(snapshots.bomb,FRAMING.bomb),lead=m01StukaPosition(sinceBomb(snapshot),0);
  expect(lead.y).toBeGreaterThan(100);
  const {live,paused}=await capture(browser,info,{name:'m01-stuka-bomb',snapshot,needBomb:true,track:{planes:[0],bomb:true,minPlanePx:10,minBombPx:7},expectDiagnostics:sample=>{
    const now=sample.aircraft;
    expect(now.bombs.pool).toBe(3);
    const flight=now.bombs.flights.find(f=>f.id==='station_bomb');expect(flight).toBeTruthy();
    expect(flight.s).toBeGreaterThanOrEqual(0);expect(flight.s).toBeLessThanOrEqual(1);
    expect(flight.at-flight.releaseAt).toBeCloseTo(1.5,9);
    expect(flight.target[0]).toBeCloseTo(-400,3);expect(flight.target[2]).toBeCloseTo(37.5,3);   // centre of the station polygon, as the simulation aims
    expect(flight.position[1]).toBeGreaterThan(flight.target[1]);   // still above the ground
    expect(now.path.since).toBeLessThan(1.5);
  }});
  expect(live.aircraft.planes.every(p=>p.visible)).toBe(true);
  expect(paused.m01.aircraft.bombs.visible).toBeGreaterThanOrEqual(1);   // the screenshot shows the falling bomb
});

test('04:35 restore: the formation leaves east on the pure path anchored to the saved bombing',async({browser},info)=>{
  test.setTimeout(process.env.CI?420000:300000);
  const snapshot=snapshots.restore0435,anchor=snapshot.consumed[BOMBING];
  expect(typeof anchor).toBe('number');
  const lead=m01StukaPosition(since(snapshot),0);
  const aimed=aimedAt(snapshot,lead);
  await capture(browser,info,{name:'m01-stuka-0435',snapshot:aimed,expectDiagnostics:live=>{
    const a=live.aircraft;
    expect(live.eventIds).toContain(BOMBING);
    // clock - saved consumed time is the anchor the page uses, so a restore reproduces the same positions.
    expect(a.path.since).toBeCloseTo(live.clock-anchor,9);
    a.planes.forEach((p,i)=>{
      const want=m01StukaPosition(live.clock-anchor,i);
      expect(p.position[0]).toBeCloseTo(want.x,3);expect(p.position[1]).toBeCloseTo(want.y,3);expect(p.position[2]).toBeCloseTo(want.z,3);
    });
    expect(a.path.phase).toBe('departure');expect(a.planes[0].position[0]).toBeGreaterThan(0);   // east of the bridge, leaving
    expect(a.bombs.visible).toBe(0);
  }});
});

test('45 s after the bombing the sky is empty: nothing loops back',async({browser},info)=>{
  test.setTimeout(process.env.CI?420000:300000);
  const snapshot=snapshots.gone,aimed=structuredClone(snapshot);aimed.player.angle=Math.PI/2;aimed.player.pitch=.5;
  expect(since(snapshot)).toBeGreaterThanOrEqual(45);
  await capture(browser,info,{name:'m01-stuka-gone',snapshot:aimed,expectDiagnostics:live=>{
    const a=live.aircraft;
    expect(a.planes.every(p=>!p.visible)).toBe(true);expect(a.path.phase).toBe('departed');expect(a.bombs.visible).toBe(0);
    expect(a.raid.visible).toBe(false);
  }});
});
