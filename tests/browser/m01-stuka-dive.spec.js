import {test,expect} from '@playwright/test';
import {M01_BOMBING_BATTLE_SECONDS,m01StukaPosition,m01StukaPathTime,M01_STUKA_OFFSETS} from '../../src/world/m01-aircraft-path.js';
import {eyePosition} from '../../src/world/spatial.js';
import {driver} from '../helpers/m01-route.js';

// T17 V1 (Ju 87 dive sequence). Snapshots come from the real simulation (idle player, no clock/event/objective injection); only the
// player's yaw/pitch of the injected checkpoint is turned towards the aircraft so the screenshots show them. Four continuations:
//  formation  ~6.5 s before the bombing: the three Ju 87 in a column in the south sky
//  bomb       ~1.4 s before the first blast: the first bomb has just left the lead plane and is falling
//  04:35      a restored checkpoint at 04:35:00 battle time: the formation is leaving east, positions equal the pure path
//  gone       45 s after the bombing: nothing remains in the sky (the old 90 s path would have kept looping)
// The timing-critical state (bomb 1.5 s before each blast, landing on the authoritative point) is proven frame by frame in
// tests/m01-aircraft.test.js against the real simulation; this spec proves that the built page draws what that model says.
const key='cod-guerra:checkpoint:m01:v2',BOMBING='evt_m01_bombing_0434';

const d=driver();d.step({skip:true});d.until(()=>d.sim.renderState.stukas,200);
const snapshots={};
d.until(()=>M01_BOMBING_BATTLE_SECONDS-d.sim.battleClock<=6.5,200);snapshots.formation=structuredClone(d.sim.snapshot(false));
d.until(()=>M01_BOMBING_BATTLE_SECONDS-d.sim.battleClock<=1.4,200);snapshots.bomb=structuredClone(d.sim.snapshot(false));
d.until(()=>d.sim.battleClock>=M01_BOMBING_BATTLE_SECONDS+60,200);snapshots.restore0435=structuredClone(d.sim.snapshot(false));
d.until(()=>d.sim.clock-d.sim.consumed[BOMBING]>=45,200);snapshots.gone=structuredClone(d.sim.snapshot(false));
for(const [name,snapshot] of Object.entries(snapshots))if(!snapshot)throw new Error('Missing snapshot '+name);

// Look from the player's own eye at a point (angle: x=cos, z=sin; pitch up positive); the camera has a 70 degree vertical FOV.
function aimedAt(snapshot,point){
  const s=structuredClone(snapshot),eye=eyePosition(s.player),dx=point.x-eye.x,dy=point.y-eye.y,dz=point.z-eye.z;
  s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.min(1.25,Math.atan2(dy,Math.hypot(dx,dz)));s.player.aiming=false;return s;
}
const since=(snapshot)=>snapshot.clock-snapshot.consumed[BOMBING];
const sinceFormation=snapshot=>-(M01_BOMBING_BATTLE_SECONDS-snapshot.battleClock);   // before the bombing: scheduled battle seconds left

async function capture(browser,info,{name,snapshot,needBomb=false,expectDiagnostics}){
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
    await info.attach(name+'.json',{body:JSON.stringify({live,pausedClock:paused.clock,pausedBombs:paused.m01.aircraft.bombs,pausedPath:paused.m01.aircraft.path},null,2),contentType:'application/json'});
    expect(errors).toEqual([]);expect(failed).toEqual([]);
    return {live,paused};
  }finally{await page.close();}
}

test('the aim keeps the formation (and then the first bomb) inside the 70 degree camera in the pure model',()=>{
  const lead=snapshots.formation,planes=[0,1,2].map(i=>m01StukaPosition(sinceFormation(lead)+.5,i));
  const centre=aimedAt(lead,{x:planes.reduce((n,p)=>n+p.x,0)/3,y:planes.reduce((n,p)=>n+p.y,0)/3,z:planes.reduce((n,p)=>n+p.z,0)/3}).player;
  const eye=eyePosition(lead.player);
  for(const p of planes){
    const dx=p.x-eye.x,dy=p.y-eye.y,dz=p.z-eye.z,az=Math.atan2(dz,dx)-centre.angle,el=Math.atan2(dy,Math.hypot(dx,dz))-centre.pitch;
    expect(Math.abs(Math.atan2(Math.sin(az),Math.cos(az)))).toBeLessThan(.5);expect(Math.abs(el)).toBeLessThan(.5);
  }
});

test('formation: three Ju 87 in a column on their stukaPath, 3.5 s apart, still approaching the dive',async({browser},info)=>{
  test.setTimeout(process.env.CI?420000:300000);
  const snapshot=snapshots.formation,planes=[0,1,2].map(i=>m01StukaPosition(sinceFormation(snapshot),i));
  const aimed=aimedAt(snapshot,{x:planes.reduce((n,p)=>n+p.x,0)/3,y:planes.reduce((n,p)=>n+p.y,0)/3,z:planes.reduce((n,p)=>n+p.z,0)/3});
  await capture(browser,info,{name:'m01-stuka-formation',snapshot:aimed,expectDiagnostics:live=>{
    const a=live.aircraft;
    expect(a.planes).toHaveLength(3);expect(a.planes.every(p=>p.visible)).toBe(true);
    expect(live.eventIds).not.toContain(BOMBING);   // still before the bombing event
    expect(['approach','dive']).toContain(a.path.phase);expect(a.path.since).toBeLessThan(0);
    // The page draws the pure path at its own anchor (here predicted from the scheduled battle clock).
    a.planes.forEach((p,i)=>{
      const want=m01StukaPosition(a.path.since,i);
      expect(p.position[0]).toBeCloseTo(want.x,3);expect(p.position[1]).toBeCloseTo(want.y,3);expect(p.position[2]).toBeCloseTo(want.z,3);
    });
    expect(a.path.planeSeconds[0]-a.path.planeSeconds[1]).toBeCloseTo(M01_STUKA_OFFSETS[1],9);
    expect(a.path.planeSeconds[1]-a.path.planeSeconds[2]).toBeCloseTo(M01_STUKA_OFFSETS[2]-M01_STUKA_OFFSETS[1],9);
    expect(a.path.planeSeconds[0]).toBeCloseTo(m01StukaPathTime(a.path.since,0),9);
    expect(a.planes[0].attitude[0]).toBeLessThan(0);   // lead plane nose down towards the embankment
    expect(a.bombs.visible).toBe(0);expect(a.bombs.pool).toBe(3);
  }});
});

test('bomb: the first bomb falls from the lead plane towards the station point, 1.5 s before its blast',async({browser},info)=>{
  test.setTimeout(process.env.CI?420000:300000);
  const snapshot=snapshots.bomb,lead=m01StukaPosition(sinceFormation(snapshot),0);
  // Face west and up: the bomb leaves the lead plane almost overhead and heads for the station (x = -400).
  const aimed=structuredClone(snapshot);aimed.player.angle=Math.PI;aimed.player.pitch=1;aimed.player.aiming=false;
  expect(lead.y).toBeGreaterThan(100);
  const {live,paused}=await capture(browser,info,{name:'m01-stuka-bomb',snapshot:aimed,needBomb:true,expectDiagnostics:sample=>{
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
