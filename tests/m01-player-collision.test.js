import test from 'node:test';
import assert from 'node:assert/strict';
import layout from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import structures from '../assets/models/provisional/m01/structures/manifest.json' with {type:'json'};
import {TczewWorld} from '../src/world/tczew-world.js';
import {buildM01AcceptedPropPlacements} from '../src/render/m01-environment-props.js';
import {freshSim,drive,approach,obb,aabb,penetration,footprintDistance,R,STEP,G} from './helpers/m01-collision-probe.js';

// OWNER PLAYTEST (2026-10-18): "the player walks through walls; falls have no convincing gravity".
// Reproduction on the real M01Simulation: the player is placed, then driven ONLY through tick() controls into every class of visible geometry.
// A solid is "held" when the player circle never sinks more than 6 cm into its footprint; reaching the face proves the probe was not vacuous.
// Expected solids come from independent sources (the world's own obstacle list, the GLB body-band footprints of the prop kit, the structure
// manifest, the bridge collider kit), not from the movement code under test.
const TOL=.06,world=new TczewWorld();

// Body-band footprints (y from the step height to head height) of the prop GLBs, in the model frame; measured from the lod0 files.
// type: [x0,x1,z0,z1,top]. Props whose top is below the step height are stepped onto, never walls.
const PROP_BAND={
  supply_crate_planked:[-.45,.45,-.26,.26,.549],sandbag_run:[-1.05,1.048,-.309,.307,.585],barrel_wood:[-.289,.289,-.289,.289,.89],
  drum_fuel_200l:[-.298,.298,-.298,.298,.909],jerrycans:[-.57,.57,-.12,.13,.5005],telegraph_pole:[-.122,.122,-.116,.116,7],
  fence_wood:[-1.5,1.5,-.126,.05,1.151],fence_barbed:[-1.518,1.501,-.042,.057,1.3],hand_cart:[-.585,.585,-1.523,1.15,.978],
  horse_cart:[-.725,.725,-2.75,1.825,1.375],point_lever:[-.17,.65,-.38,.07,1.28],semaphore_signal:[-.188,.188,-.207,.109,5.67],
  water_crane:[-.223,.962,-.223,.223,4.667],coal_pile:[-1.328,1.344,-.926,.923,1.204],sleeper_stack:[-1.36,1.439,-.54,.54,1.5]};
const SOLID_TOP=.55;   // clearly above the step height

function propBoxes(){
  return buildM01AcceptedPropPlacements(world).filter(p=>PROP_BAND[p.type]&&PROP_BAND[p.type][4]>=SOLID_TOP).map(p=>{
    const [x0,x1,z0,z1]=PROP_BAND[p.type],[sx,,sz]=p.scale,c=Math.cos(p.yaw),s=Math.sin(p.yaw),lx=(x0+x1)/2*sx,lz=(z0+z1)/2*sz;
    return obb({id:`${p.id}:${p.type}`,kind:'prop',cx:p.x+lx*c+lz*s,cz:p.z-lx*s+lz*c,hx:(x1-x0)/2*sx,hz:(z1-z0)/2*sz,yaw:p.yaw,y0:p.y,y1:p.y+PROP_BAND[p.type][4]});
  });
}
const existingBoxes=()=>world.obstacles.filter(b=>b.max.x<25).map(b=>aabb(b.id,b.min,b.max,'existing'));
const casemate=()=>{const b=structures.structures.find(s=>s.id==='casemate').featureBounds;return aabb('casemate',{x:b.min[0],y:b.min[1],z:b.min[2]},{x:b.max[0],y:b.max[1],z:b.max[2]},'structure');};
// Shelter walls as listed by tools/assets/m01-field-structures/build.mjs (anchor -260,-4,70); the west wall, the south wall, the east wall and the L return wall.
const shelterWalls=()=>[['w',[-5,-2],[-4.65,5]],['s',[-5,4.65],[5,5]],['e',[4.65,-2],[5,5]],['n',[-1.5,-2],[4.65,-1.65]]].map(([id,[x0,z0],[x1,z1]])=>
  aabb(`shelter_${id}`,{x:-260+x0,y:-4,z:70+z0},{x:-260+x1,y:-1.45,z:70+z1},'structure'));

const PLAY=world.layout.bounds.playable,inPlay=(x,z)=>x>PLAY.minX+2&&x<PLAY.maxX-2&&z>PLAY.minZ+2&&z<PLAY.maxZ-2;   // beyond it the 8 s countdown restores the probe
const standable=(x,z)=>inPlay(x,z)&&world.terrainHeightAt(x,z)>-3.6&&Math.abs(world.heightAt(x,z)-world.terrainHeightAt(x,z))<.05;
const wallFor=(b,groundY)=>b.y1>groundY+STEP+.05&&b.y0<groundY+1.7;

function sweep(sim,boxes,others,{label,sides=['+x','-x','+z','-z'],offsets=[0],minProbes=1}={}){
  let probes=0,reached=0;const failures=[];
  for(const box of boxes)for(const side of sides)for(const k of offsets){
    const offset=k*(side[1]==='x'?box.hz:box.hx);
    const axisX=side[1]==='x',sign=side[0]==='+'?1:-1,lx=axisX?sign*(box.hx+4):offset,lz=axisX?offset:sign*(box.hz+4);
    const c=Math.cos(box.yaw),s=Math.sin(box.yaw),sx=box.cx+lx*c+lz*s,sz=box.cz-lx*s+lz*c;
    if(!standable(sx,sz)||!wallFor(box,world.heightAt(sx,sz)))continue;
    const result=approach(sim,box,side,{offset,others});if(!result)continue;
    probes++;
    const worst=Math.max(...result.path.map(q=>penetration(box,q.x,q.z)));
    const end=result.path.at(-1);
    if(footprintDistance(box,end.x,end.z)<R+.3)reached++;
    if(worst>TOL)failures.push(`${box.id} from ${side}${offset?` @${offset.toFixed(2)}`:''}: sank ${worst.toFixed(2)} m into the footprint (ended ${(end.x).toFixed(2)},${(end.z).toFixed(2)}, y ${end.y.toFixed(2)})`);
  }
  assert.ok(probes>=minProbes,`${label}: only ${probes} probes ran (need ${minProbes})`);
  assert.deepEqual(failures.slice(0,12),[],`${label}: ${failures.length}/${probes} probes walked through the solid`);
  assert.ok(reached>=probes*.7,`${label}: the player reached the face in only ${reached}/${probes} probes (sweep would be vacuous)`);
  return {probes,reached};
}

const ALL=[...existingBoxes(),casemate(),...shelterWalls(),...propBoxes()];

test('existing obstacles (hut walls, station, sandbag covers, trunks, wagons, portals) hold the player in every direction',()=>{
  sweep(freshSim(),existingBoxes(),ALL,{label:'existing obstacles',offsets:[0,.5],minProbes:60});
});

test('field structures drawn without a collider (casemate hull, shelter walls) hold the player',()=>{
  const sim=freshSim();
  sweep(sim,[casemate()],ALL,{label:'casemate',sides:['-z','+z'],offsets:[-.5,0,.5],minProbes:3});
  sweep(sim,shelterWalls(),ALL,{label:'shelter walls',offsets:[-.5,0,.5],minProbes:8});
});

test('every prop of the kit taller than the step height (crates, barrels, carts, sleepers, poles, fences, crane) holds the player',()=>{
  const boxes=propBoxes();
  assert.ok(boxes.length>100,`expected the full prop kit, got ${boxes.length}`);
  sweep(freshSim(),boxes,ALL,{label:'props',sides:['+x','-x','+z','-z'],offsets:[0],minProbes:100});
});

test('bridge abutments are walls from the lowland, not ramps (the old code lifted the player up their faces)',()=>{
  const sim=freshSim();
  // [id, start, heading, face coordinate along the heading]. The rail abutment top is -0.35, the lowland is -3 to -1.75.
  const cases=[['rail south face',{x:-8,z:16},-Math.PI/2,(p)=>p.z>=9.5+R-TOL],['rail north face',{x:-8,z:-16},Math.PI/2,(p)=>p.z<=-9.5-R+TOL],
    ['rail east face',{x:20,z:8},Math.PI,(p)=>p.x>=11.9+R-TOL],['road north face',{x:-8,z:22},Math.PI/2,(p)=>p.z<=29.5-R+TOL],
    ['road south face',{x:-8,z:58},-Math.PI/2,(p)=>p.z>=50.5+R-TOL],['road east face',{x:18,z:34},Math.PI,(p)=>p.x>=10+R-TOL]];
  const failures=[];
  for(const [id,start,angle,held] of cases){
    const path=drive(sim,{...start,angle,ticks:50});
    const bad=path.find(p=>!held(p));
    if(bad)failures.push(`${id}: reached ${bad.x.toFixed(2)},${bad.z.toFixed(2)} at y ${bad.y.toFixed(2)} (t=${bad.t.toFixed(2)} s)`);
  }
  assert.deepEqual(failures,[]);
});

test('the lattice trusses of the spans hold the player on the deck (rail z=±4.4, road z=36.4/43.6)',()=>{
  const sim=freshSim(),failures=[];
  for(const [name,xs,zc,half] of [['rail',[60,200,300],0,4.4],['road',[60,200,300],40,3.6]])for(const x of xs)for(const dir of [1,-1]){
    const path=drive(sim,{x,z:zc,y:0,angle:dir*Math.PI/2,ticks:36,sprint:false});
    const far=Math.max(...path.map(p=>Math.abs(p.z-zc)));
    if(far>half-R+TOL)failures.push(`${name} x=${x} dir ${dir}: centre reached ${far.toFixed(2)} m from the axis (truss face at ${half})`);
  }
  assert.deepEqual(failures,[]);
});

test('the player cannot leave the map: a hard stop 10 m beyond the warned boundary on all four sides',()=>{
  const sim=freshSim(),b=world.layout.bounds.playable,failures=[];
  for(const [name,start,angle,over]of [['east',{x:436,z:2},0,p=>p.x-b.maxX],['west',{x:-452,z:20},Math.PI,p=>b.minX-p.x],
    ['north',{x:-300,z:132},Math.PI/2,p=>p.z-b.maxZ],['south',{x:-300,z:-72},-Math.PI/2,p=>b.minZ-p.z]]){
    const path=drive(sim,{...start,angle,ticks:90});
    const far=Math.max(...path.map(over));
    if(far>10.2)failures.push(`${name}: went ${far.toFixed(1)} m beyond the playable boundary`);
  }
  assert.deepEqual(failures,[]);
});

// ---------------------------------------------------------------- gravity and landing
test('stepping off an abutment edge is a real fall: the player accelerates under gravity, then lands with an event',()=>{
  const sim=freshSim();
  // Rail abutment, east edge at x=11.9 (top -0.35); the lowland below is -3: a 2.65 m drop, free of the trusses (z 8 is outside the deck).
  const path=drive(sim,{x:10.6,z:8,y:-.35,angle:0,ticks:40,sprint:false});
  const fallTicks=path.filter(p=>p.y<-.36&&p.y>-2.99);
  const drops=path.slice(1).map((p,i)=>path[i].y-p.y);
  const events=path.flatMap(p=>p.events??[]).filter(e=>e.type==='player-landing');
  assert.ok(Math.max(...drops)<.6,`no teleport: the biggest single-tick drop was ${Math.max(...drops).toFixed(2)} m`);
  assert.ok(fallTicks.length>=8,`the fall must take time (${fallTicks.length} ticks in the air)`);
  const air=drops.filter(d=>d>1e-6),growing=air.slice(1,-1).every((d,i)=>d>air[i]);
  assert.ok(growing,'the per-tick drop grows during the fall (acceleration), it is not a constant-speed slide');
  const t=(path.findIndex(p=>p.y<=-2.999)-path.findIndex(p=>p.y<-.36))*.05,expected=Math.sqrt(2*2.65/G);
  assert.ok(Math.abs(t-expected)<.12,`fall duration ${t.toFixed(2)} s vs ${expected.toFixed(2)} s under g=${G}`);
  assert.equal(events.length,1,'exactly one landing event');
  assert.equal(events[0].surface,'ground');assert.equal(events[0].damage,0);
  assert.ok(Math.abs(events[0].speed-Math.sqrt(2*G*2.65))<.8,`landing speed ${events[0].speed}`);
});

test('fall damage: a 5 m drop hurts, a 12 m drop kills; both through the real tick',()=>{
  const hurt=freshSim(),kill=freshSim();
  const ground=hurt.world.heightAt(-200,30);
  const a=drive(hurt,{x:-200,z:30,y:ground+5,angle:0,ticks:50,sprint:false,forward:0});
  const landing=a.flatMap(p=>p.events??[]).find(e=>e.type==='player-landing');
  assert.ok(landing,'landing event after a 5 m fall');assert.ok(landing.damage>=15&&landing.damage<=60,`5 m fall damage ${landing.damage}`);
  assert.equal(hurt.player.health,100-landing.damage);assert.equal(hurt.player.alive,true);
  assert.ok(Math.abs(landing.speed-Math.sqrt(2*G*5))<.9);
  let died=false,message=null;
  const p=kill.player;Object.assign(p,{x:-200,z:30,y:ground+12,angle:0,pitch:0,health:100,alive:true});delete p.fall;
  for(let i=0;i<60&&!died;i++){kill.tick(.05,{});for(const e of kill.drainEvents()){if(e.type==='restored')died=true;if(e.type==='message'&&/caiu|queda/i.test(e.message))message=e.message;}}
  assert.ok(died,'a 12 m fall kills and the checkpoint is restored');
});

test('walking off a 1 m step is a stair, not a fall: no landing event, no damage',()=>{
  const sim=freshSim();
  // The shelter pit lip: -3 outside, -4 inside the pit (src/world/tczew-world.js).
  const path=drive(sim,{x:-286,z:70,y:-3,angle:0,ticks:40,sprint:false});
  const bad=path.flatMap(p=>p.events??[]).filter(e=>e.type==='player-landing'&&e.damage>0);
  assert.deepEqual(bad,[]);assert.equal(sim.player.health,100);
});
