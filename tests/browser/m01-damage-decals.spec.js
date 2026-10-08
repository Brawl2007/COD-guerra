import {test,expect} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../helpers/m01-route.js';
import {eyePosition} from '../../src/world/spatial.js';
import {M01_DAMAGE_DECAL_LIMITS as LIMITS} from '../../src/render/m01-damage-decals.js';

// Presentation-only battle damage in the production preview: continuations of genuine mission states with a staged
// player position (shots use the game's own mouse controls) and frozen probes of genuine post-blast route states.
// Not a human playtest and not an FPS measurement. M01_BASELINE_CAPTURE=1 captures the same views on the base
// renderer (no damage decals) as BEFORE evidence.
const key='cod-guerra:checkpoint:m01:v2',baseline=process.env.M01_BASELINE_CAPTURE==='1',prefix=baseline?'BEFORE':'AFTER';
const hidden={style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000};

// Genuine states: the opening, and the real route (no injected events) ~4 min after the east demolition (its smoke
// has cleared; the west charges have not fired yet) and at the first sample 8 s or more after the west demolition
// (8.25 s), inside its in-world scene (in the route the roll call follows at 15 s and moves the player; from the staged
// pose, away from the shelter, it does not fire). No scripted change reaches a probe for at least 6.75 s of mission time
// (27 frames at the game's 0.25 s step cap): from the station-facade pose the west demolition fires 6.75 s after
// preWest, and the east-deck-end pose (x > 401) is restored out of bounds 8.1 s after it.
const start=new M01Simulation(19390901);start.tick(.05,{skip:true});const opening=start.snapshot();
let preWest=null,postWest=null,step=0;
const flow=route(19390901,{onStep:({sim})=>{
  if(++step%20)return;
  if(sim.consumedEvent('evt_m01_east_demolition')&&!sim.consumedEvent('evt_m01_west_demolition')&&(!preWest||sim.clock-sim.consumed['evt_m01_east_demolition']<=241))
    preWest=sim.snapshot();
  if(!postWest&&sim.consumedEvent('evt_m01_west_demolition')&&sim.clock-sim.consumed['evt_m01_west_demolition']>=8)postWest=sim.snapshot();
}});
if(!preWest||!postWest)throw new Error('Post-blast fixtures were not reached through the real simulation route');

const aimAt=(eye,t)=>({angle:Math.atan2(t.z-eye.z,t.x-eye.x),pitch:Math.atan2(t.y-eye.y,Math.hypot(t.x-eye.x,t.z-eye.z))});
function staged(snapshot,{x,z,target}){
  const sim=new M01Simulation();sim.restoreSnapshot(structuredClone(snapshot));
  const s=structuredClone(snapshot);Object.assign(s.player,{x,y:sim.world.heightAt(x,z),z,aiming:false,moveBlend:0,sprinting:false,crouched:false});
  Object.assign(s.player,aimAt(eyePosition(s.player),target));return s;
}
async function open(browser,snapshot,quality='high'){
  const page=await browser.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  await page.addInitScript(({key,snapshot,quality})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,snapshot,quality});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  // The decal atlas is painted in timer slices; wait for it in the paused menu (cheap frames), not while the battle runs.
  if(!baseline){
    await page.waitForFunction(()=>{const d=window.gameDiagnostics().m01.damageDecals;return d.atlasReady||d.atlasError;},null,{timeout:120000});
    expect((await page.evaluate(()=>window.gameDiagnostics())).m01.damageDecals.atlasError).toBe(null);
  }
  await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>2,null,{timeout:120000});
  return {page,errors,failed};
}
const look=(page,dx,dy)=>page.evaluate(([dx,dy])=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:dx,movementY:dy})),[dx,dy]);
const mouse=(page,type,button)=>page.evaluate(([type,button])=>window.dispatchEvent(new MouseEvent(type,{button})),[type,button]);
// Turn with the game's own mouse look (0.0022 rad per count) until the crosshair is on a world point.
async function aim(page,target){
  // gameDiagnostics().player is a plain copy of the metric player record: mark its space for eyePosition.
  const p=(await page.evaluate(()=>window.gameDiagnostics())).player,want=aimAt(eyePosition({...p,space:'metres'}),target);
  const turn=Math.atan2(Math.sin(want.angle-p.angle),Math.cos(want.angle-p.angle));
  await look(page,Math.round(turn/.0022),Math.round((p.pitch-want.pitch)/.0022));
  await page.waitForFunction(w=>{const p=window.gameDiagnostics().player;return Math.abs(Math.atan2(Math.sin(w.angle-p.angle),Math.cos(w.angle-p.angle)))<.003&&Math.abs(w.pitch-p.pitch)<.003;},want,{timeout:30000});
}
async function fire(page){
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY',null,{timeout:60000});
  await page.evaluate(()=>{window.dispatchEvent(new MouseEvent('mousedown',{button:0}));window.dispatchEvent(new MouseEvent('mouseup',{button:0}));});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state!=='READY',null,{timeout:60000});
}
async function pause(page){await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();await page.waitForTimeout(300);}
const counters=d=>({quality:d.quality,drawCalls:d.drawCalls,triangles:d.triangles,textures:d.textures,geometries:d.geometries,clock:d.clock,player:d.player,damageDecals:d.m01.damageDecals??null});

// Rail embankment west, from the drawn track layout: d metres along its first segment, o metres to its left, height h.
const rail=start.world.features.get('rail_embankment_west').polyline,[ra,rb]=rail,rl=Math.hypot(rb[0]-ra[0],rb[2]-ra[2]),ru=[(rb[0]-ra[0])/rl,(rb[2]-ra[2])/rl];
const track=(d,o,h)=>({x:ra[0]+ru[0]*d-ru[1]*o,y:h,z:ra[2]+ru[1]*d+ru[0]*o});
for(const view of [
  {name:'portal-brick',label:'rail portal east face (brick)',snapshot:opening,x:4.5,z:-5.4,
    shots:[{x:-1.5,y:1.4,z:-5.6},{x:-1.5,y:2.2,z:-6.3},{x:-1.5,y:.7,z:-6.7},{x:-1.5,y:1.8,z:-4.9}],kinds:['brick'],need:1},
  // Sleepers lie every 1.35 m (one at d=86.4); rail heads at o=±0.72, 0.18 m; ballast between sleepers.
  {name:'track-bed',label:'near rail head, a sleeper, ballast and the far rail on the west embankment',snapshot:opening,...(({x,z})=>({x,z}))(track(86.4,3.6,0)),
    shots:[track(86.7,.72,.18),track(86.4,.1,.105),track(87.075,.3,.042),track(86,-.72,.18)],kinds:['rail','sleeper','ballast'],need:2}
])test(`player fire leaves bounded ${view.name} marks; pause freezes them and a checkpoint restore clears them`,async({browser},info)=>{
  test.setTimeout(process.env.CI?240000:120000);
  const {page,errors,failed}=await open(browser,staged(view.snapshot,{...view,target:view.shots[0]}));
  // Aimed (sights up, as a player would for precise shots); released before the capture.
  await mouse(page,'mousedown',2);await page.waitForFunction(()=>window.gameDiagnostics().player.aiming,null,{timeout:30000});
  for(const target of view.shots){await aim(page,target);await fire(page);}
  // Frames are slow under software WebGL: wait for the release to reach the simulation, then for the sights to lower.
  await mouse(page,'mouseup',2);await page.waitForFunction(()=>!window.gameDiagnostics().player.aiming,null,{timeout:30000});
  if(!baseline)await page.waitForFunction(n=>window.gameDiagnostics().m01.damageDecals.counts.placed>=n,view.shots.length-1,{timeout:30000});
  await page.waitForTimeout(1200);await pause(page);
  const frozen=await page.evaluate(()=>window.gameDiagnostics());
  await page.screenshot({path:info.outputPath(`${prefix}-${view.name}-high.png`),...hidden});
  console.log(`M01_DAMAGE_DECAL_FIRE ${prefix} ${view.name} `+JSON.stringify(counters(frozen)));
  await info.attach(`${view.name}-counters`,{body:JSON.stringify({label:view.label,...counters(frozen)},null,2),contentType:'application/json'});
  if(!baseline){
    const d=frozen.m01.damageDecals;
    expect(d.marks).toBeGreaterThanOrEqual(view.shots.length-1);expect(d.marks).toBeLessThanOrEqual(LIMITS.quality.high.marks);
    expect(view.kinds.filter(k=>d.byKind[k]>0).length).toBeGreaterThanOrEqual(view.need);expect(d.counts.errors).toBe(0);
    expect(d.debris).toBeLessThanOrEqual(LIMITS.quality.high.debris);expect(d.drawCalls).toBeLessThanOrEqual(LIMITS.drawCalls);
    await page.waitForTimeout(350);expect((await page.evaluate(()=>window.gameDiagnostics())).m01.damageDecals).toEqual(d);
    // Restore: transient marks are cleared at once; nothing is resurrected from the save.
    await page.locator('#restart-checkpoint').click();
    await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
    const clean=(await page.evaluate(()=>window.gameDiagnostics())).m01.damageDecals;
    expect(clean.marks).toBe(0);expect(clean.spall).toBe(0);
  }
  expect(errors).toEqual([]);expect(failed).toEqual([]);await page.close();
});

test('saved blasts draw their persistent aftermath on load (frozen probes of genuine route states)',async({browser},info)=>{
  test.setTimeout(process.env.CI?480000:240000);
  const probes=[
    {name:'repair-crater',snapshot:preWest,id:'repair_crater',x:-49,z:15.5,target:{x:-40,y:-4.2,z:10}},
    {name:'station-facade',snapshot:preWest,id:'station_bomb',x:-400,z:17.5,target:{x:-400,y:-4.3,z:26.4}},
    {name:'east-deck-end',snapshot:preWest,id:'east_demolition',x:650,z:40,target:{x:662,y:-4.2,z:40}},
    {name:'west-bridgehead',snapshot:postWest,id:'west_demolition',x:-30,z:2,target:{x:-12,y:-2.9,z:2}}
  ],samples={};
  for(const probe of probes){
    const {page,errors,failed}=await open(browser,staged(probe.snapshot,probe));await pause(page);
    const data=await page.evaluate(()=>window.gameDiagnostics());
    // The capture must still show the staged state: no event since the load (a slow run could reach the west demolition)
    // and the player still within 0.5 m of the staged x/z (the out-of-bounds restore of east-deck-end moves it).
    expect([...data.eventIds].sort(),`${probe.name}: an event fired before the capture (clock ${data.clock})`).toEqual(Object.keys(probe.snapshot.consumed).sort());
    expect(Math.hypot(data.player.x-probe.x,data.player.z-probe.z),`${probe.name} left its staged pose (clock ${data.clock})`).toBeLessThan(.5);
    await page.screenshot({path:info.outputPath(`${prefix}-${probe.name}-high.png`),...hidden});
    samples[probe.name]=counters(data);
    if(!baseline){
      const d=data.m01.damageDecals,blast=d.residueBlasts.find(b=>b.id===probe.id);
      // Bullet marks may already come from rounds fired in the frames before the pause; residue comes from the save.
      expect(blast?.polygons).toBeGreaterThan(0);expect(d.counts.errors).toBe(0);
      expect(d.residueBlasts.map(b=>b.id)).toEqual(probe.snapshot.sectors.damage.slice(-LIMITS.blasts).map(b=>b.id));
      expect(d.residueTriangles).toBeLessThanOrEqual(LIMITS.residueTriangles);
      expect(d.debris).toBeLessThanOrEqual(LIMITS.quality.high.debris);expect(d.embers).toBeLessThanOrEqual(LIMITS.quality.high.embers);
      expect(d.drawCalls).toBeLessThanOrEqual(LIMITS.drawCalls);
    }
    expect(errors).toEqual([]);expect(failed).toEqual([]);await page.close();
  }
  console.log(`M01_DAMAGE_DECAL_COUNTERS ${prefix} `+JSON.stringify(samples));
  await info.attach('residue-counters',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
  expect(flow.sim.mission.complete).toBe(true);
});
