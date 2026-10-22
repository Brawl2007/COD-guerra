import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import partials from './fixtures/m01-partials-gameplay-baseline.json' with {type:'json'};
// The T38 golden (its amendment 02): the golden of the staging 8c6328c, i.e. of the simulation the retreat was proved over. It stays what it was and is history since T47 joined;
// the live golden is tests/fixtures/m01-t47-gameplay-baseline.json (see the comment above the amendment tests).
import staging from './fixtures/m01-t38-gameplay-baseline.json' with {type:'json'};
import {M01Simulation,seconds,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {M01View} from '../src/render/m01-view.js';
import {M01Characters} from '../src/render/m01-characters.js';
import {actorPose,actorPoseName} from '../src/render/m01-actor-pose.js';
import {resolveTorsoOrientation} from '../src/render/m01-animation-resolver.js';
import {route} from './helpers/m01-route.js';
import {compareContinuation,restore} from './helpers/m01-determinism.js';

// T48 (M01-GERMAN-RETREAT-AND-REGROUP-V1, BX-09). After the east demolition (06:10 of the battle clock) the Germans on the spans fall back with their
// fallen, nobody on the east bank starts a shot until 06:11, and by 06:12 the survivors stand regrouped. Everything below is read from the real
// simulation route (the two golden routes) or from states restored out of it; no clock, event or actor is injected into the route itself.
const DEMOLITION='evt_m01_east_demolition';
const FROM=seconds('06:10:00'),SILENCE_UNTIL=seconds('06:11:00'),REGROUP_AT=seconds('06:12:00');
const SPANS=Array.from({length:10},(_,i)=>`de_spans_${i}`),FALLEN=SPANS.slice(0,4),SURVIVORS=SPANS.slice(4);
const ROUTES=[[19390901,false],[7,true]];
const info=(sim,a)=>({id:a.id,x:a.x,y:a.y,z:a.z,facing:a.facing,state:a.state,alive:a.alive,active:a.active,carriedBy:a.carriedBy??null,
  fallBack:a.fallBack?structuredClone(a.fallBack):null,diedAt:a.diedAt,speed:a.motion.speed,gait:a.motion.gait,pose:actorPoseName(a,sim.clock)});

// One pass over a golden route. The rows run from the east demolition tick to 40 ticks after the first tick at or after 06:12.
const observed=new Map();
function observe(seed,support){
  const key=`${seed}/${support}`;if(observed.has(key))return observed.get(key);
  const obs={seed,support,demolitionTick:null,demolitionClock:null,rows:[],snapshots:{},tail:0};let tick=0;
  const result=route(seed,{support,onStep:({sim,events})=>{
    tick++;
    if(obs.demolitionTick===null){
      if(!sim.consumedEvent(DEMOLITION))return;
      obs.demolitionTick=tick;obs.demolitionClock=sim.clock;obs.snapshots.demolition=sim.snapshot();
    }
    if(sim.battleClock>=seconds('06:10:30')&&!obs.snapshots.mid)obs.snapshots.mid=sim.snapshot();
    if(obs.tail>40)return;
    if(sim.battleClock>=REGROUP_AT)obs.tail++;
    obs.rows.push({tick,clock:sim.clock,battleClock:sim.battleClock,silent:sim.germanSilence(),withdrawal:sim.germanWithdrawal,
      fire:events.filter(e=>e.type==='enemy-fire').length,rounds:sim.enemyFire.rounds.filter(r=>r.firedAt>=obs.demolitionClock).length,
      firedAt:Math.max(...sim.enemies.map(a=>a.firedAt)),display:sim.displayFire.rounds.filter(r=>r.firedAt>=obs.demolitionClock).length,
      spans:SPANS.map(id=>info(sim,sim.actor(id)))});
    if(sim.battleClock>=REGROUP_AT&&!obs.snapshots.regroup)obs.snapshots.regroup=sim.snapshot();
  }});
  obs.regroupIndex=obs.rows.findIndex(r=>r.battleClock>=REGROUP_AT);
  obs.final=SPANS.map(id=>info(result.sim,result.sim.actor(id)));obs.complete=result.sim.mission.complete;
  obs.gates=result.sim.actors.filter(a=>a.group==='grp_de_east').map(a=>({id:a.id,x:a.x,y:a.y,z:a.z,state:a.state}));
  observed.set(key,obs);return obs;
}
const man=(row,id)=>row.spans.find(a=>a.id===id);
const GROUND=new M01Simulation(1).world;
const fromSnapshot=snapshot=>{const sim=new M01Simulation(1);sim.restoreSnapshot(snapshot);sim.drainEvents();return sim;};

// ---- A. pose precedence --------------------------------------------------------------------------------------------------------------------------

test('carriedBy outranks fallen, wounded and every other posture; only the stretcher and the station drag keep their lying pose',()=>{
  const base={id:'x',alive:true,active:true,team:'enemy',state:'GUARD',shot:0,facing:0,x:0,y:0,z:0};
  assert.equal(actorPoseName({...base,alive:false,carriedBy:'c'}),'carried','a carried casualty is carried, not fallen');
  assert.equal(actorPoseName({...base,alive:false}),'fallen');
  const others=[{},{state:'WOUNDED'},{crouched:true},{posture:'crouch'},{posture:'prone'},{pose:'seated'},{suppressedUntil:9,team:'ally'}];
  for(const extra of others){
    assert.equal(actorPoseName({...base,...extra,carriedBy:'c'},1),'carried',JSON.stringify(extra));
    assert.equal(actorPoseName({...base,...extra,carriedBy:'c',alive:false},1),'carried','dead and '+JSON.stringify(extra));
  }
  for(const task of ['yard_patient','station_wounded']){
    assert.equal(actorPoseName({...base,task,carriedBy:'c'}),'wounded',task+' keeps its lying pose while carried');
    assert.equal(actorPoseName({...base,task,carriedBy:'c',alive:false}),'fallen',task+' dead is unchanged');
  }
  assert.equal(actorPoseName({...base,state:'WOUNDED'}),'wounded');
});

test('the pose of a carried casualty is the carried body at the carrier\'s heading, never armed, and the resolver agrees',()=>{
  const dead={id:'de_spans_3',alive:false,active:true,team:'enemy',state:'DOWN',weapon:'kar98k',carriedBy:'de_spans_4',x:5,y:1.15,z:2,facing:2.1,deathYaw:-2.9,diedAt:1,shot:0};
  const pose=actorPose(dead,5);
  assert.equal(pose.name,'carried');assert.equal(pose.root.roll,-Math.PI/2);assert.equal(pose.root.pivotY,.84);
  assert.equal(pose.aiming,false);assert.equal(pose.firing,false);assert.equal(pose.underFire,false);assert.equal(pose.root.yaw,2.1,'the heading of the carrier, not the yaw it fell with');
  assert.equal(resolveTorsoOrientation(dead,{name:'carried'}).rootYaw,2.1);
  assert.equal(resolveTorsoOrientation({...dead,carriedBy:null},{name:'fallen'}).rootYaw,-2.9,'a casualty on the ground keeps the yaw it fell with');
  const down=actorPose({...dead,carriedBy:null},5);assert.equal(down.name,'fallen');assert.equal(down.root.yaw,-2.9);
});

const harness=()=>{
  const view=Object.create(M01View.prototype);view.scene=new THREE.Scene();view.batches=new Map();
  view.box=new THREE.BoxGeometry(1,1,1);view.sphere=new THREE.SphereGeometry(1,8,6);view.cylinder=new THREE.CylinderGeometry(1,1,1,8);
  view.roundBox=new RoundedBoxGeometry(1,1,1,2,.12);view.accessoryBox=new RoundedBoxGeometry(1,1,1,1,.1);view.featureSphere=view.sphere;
  view.helmetGeometry=new THREE.SphereGeometry(1,20,8,0,Math.PI*2,0,Math.PI/2);
  view.materials=Object.fromEntries(['cloth','skin','metal','dark','wood','glow','leather','brass'].map(k=>[k,new THREE.MeshBasicMaterial()]));
  view.createActors();
  view.cleanup=()=>{view.batches.forEach(b=>b.dispose());[view.box,view.sphere,view.cylinder,view.roundBox,view.accessoryBox,view.helmetGeometry].forEach(g=>g.dispose());Object.values(view.materials).forEach(m=>m.dispose());};
  return view;
};
test('the view draws a carried German casualty as a carried body at shoulder height and a set-down one as fallen',()=>{
  const view=harness();
  try{
    const head=()=>{const m=new THREE.Matrix4();view.batches.get('head').getMatrixAt(0,m);return new THREE.Vector3().setFromMatrixPosition(m);};
    const dead={id:'de_spans_3',x:0,y:0,z:0,facing:0,team:'enemy',weapon:'kar98k',alive:false,active:true,state:'DOWN',shot:0,diedAt:0,deathYaw:0};
    view.updateActors([dead],0);assert.equal(view.actorPoses.fallen,1);assert.equal(view.actorPoses.carried,0);const lying=head();
    const carried={...dead,carriedBy:'de_spans_4',y:1.15,facing:Math.PI/2},saved=structuredClone(carried);
    view.updateActors([carried],0);assert.equal(view.actorPoses.carried,1);assert.equal(view.actorPoses.fallen,0);
    assert.ok(head().y>lying.y+.5,'carried at the carrier\'s shoulder, above a man on the ground');assert.deepEqual(carried,saved,'the view never writes to the actor');
    view.updateActors([{...carried,carriedBy:null,y:0}],0);assert.equal(view.actorPoses.fallen,1);assert.equal(view.actorPoses.carried,0);
  }finally{view.cleanup();}
});

test('the character player picks carried for a carried casualty and carry_wounded for his carrier, and fallen once he is set down',()=>{
  // Clip selection only (no GLB needed): sample() is the adapter precedence that the resolver and the renderer share.
  const c=Object.create(M01Characters.prototype);c.clips=new Map(['standing_idle','fallen','carried','carry_wounded','walk'].map(n=>[n,{name:n,duration:2.5}]));c.sources=new Map();
  const carrier={id:'de_spans_4',active:true,alive:true,team:'enemy',weapon:'kar98k',state:'RETREAT',x:5,y:0,z:2,facing:0,shot:0,firedAt:-1e9,motion:{speed:1.2,odometer:3,gait:'carry',gaitSince:1}};
  const dead={id:'de_spans_3',active:true,alive:false,team:'enemy',weapon:'kar98k',state:'DOWN',x:4.75,y:1.15,z:2,facing:Math.PI/2,diedAt:1,deathYaw:-2.9,carriedBy:'de_spans_4',shot:0,firedAt:-1e9,motion:{speed:0,odometer:0,gait:'idle',gaitSince:0}};
  assert.equal(c.sample(dead,5,[carrier,dead]).clip,'carried','the casualty on the carrier\'s shoulder is not drawn falling');
  assert.equal(c.sample(carrier,5,[carrier,dead]).clip,'carry_wounded');
  const down={...dead,carriedBy:null,y:0};
  assert.equal(c.sample(down,5,[carrier,down]).clip,'fallen');
  assert.notEqual(c.sample(carrier,5,[carrier,down]).clip,'carry_wounded','nobody is carried any more');
});

// ---- B. the 60 s of silence ------------------------------------------------------------------------------------------------------------------------

test('the silence is exactly 06:10:00 to 06:11:00 of the battle clock and is read from the clock alone',()=>{
  const s=new M01Simulation();
  for(const [at,silent] of [[FROM-1,false],[FROM-1e-6,false],[FROM,true],[FROM+30,true],[SILENCE_UNTIL-1e-6,true],[SILENCE_UNTIL,false],[SILENCE_UNTIL+60,false],[seconds('04:30:00'),false]]){
    s.battleClock=at;assert.equal(s.germanSilence(),silent,String(at));
  }
  assert.equal(SILENCE_UNTIL-FROM,60,'60 s of battle clock');
});

for(const [seed,support] of ROUTES)test(`real route ${seed}/${support}: no German round is fired, drawn or flashed from 06:10 to 06:11, and the withdrawal reports it`,()=>{
  const obs=observe(seed,support),quiet=obs.rows.filter(r=>r.battleClock>=FROM&&r.battleClock<SILENCE_UNTIL);
  assert.ok(obs.demolitionTick>0);assert.equal(obs.rows[0].battleClock,FROM,'the east demolition happens at 06:10:00 of the battle clock');
  assert.ok(quiet.length>100,`${quiet.length} ticks inside the window`);
  for(const r of quiet){
    assert.equal(r.silent,true);assert.equal(r.withdrawal.silent,true);
    assert.equal(r.fire,0,`enemy-fire event at ${r.battleClock}`);
    assert.equal(r.rounds,0,'no round fired from the east demolition on is in flight');
    assert.ok(r.firedAt<obs.demolitionClock,'no German actor records a shot after the explosion');
    assert.equal(r.display,0,'no scripted display tracer either');
  }
  const after=obs.rows.find(r=>r.battleClock>=SILENCE_UNTIL);assert.equal(after.silent,false);assert.equal(after.withdrawal.silent,false);
});

// A real gate shooter with a line of sight to the player, restored from the east demolition tick of the standard route. Everybody else holds fire.
function gateShooterSetup(){
  const sim=fromSnapshot(observe(19390901,false).snapshots.demolition),shooter=sim.actor('de_east_5');
  assert.equal(shooter.group,'grp_de_east');assert.ok(Number(shooter.id.split('_').at(-1))<14,'a gate shooter');
  let spot=null;
  for(const x of [38,30,20,0,-20,-60,-120])for(const z of [42.4,40,32,27,22,20])if(!spot&&sim.world.lineOfSight(shooter,{...sim.player,x,z,y:sim.world.heightAt(x,z)}))spot={x,z};
  assert.ok(spot,'the world offers a position the gate shooter sees');
  Object.assign(sim.player,{...spot,y:sim.world.heightAt(spot.x,spot.z)});
  for(const a of sim.enemies)a.cooldown=99;
  Object.assign(shooter,{active:true,alive:true,cooldown:0,suppressedUntil:0});
  sim.enemyFire.rounds=[];sim.events=[];return {sim,shooter};
}
test('a gate shooter who sees the player is held back inside the silence, with his cadence re-armed, and fires in the same state once it is over',()=>{
  const {sim,shooter}=gateShooterSetup(),firedAt=shooter.firedAt;assert.equal(sim.consumedEvent(DEMOLITION),true);
  sim.battleClock=FROM+20;const issued=sim.enemyFire.nextId;
  sim.updateCombat(.05);
  assert.equal(sim.enemyFire.rounds.length,0);assert.equal(sim.enemyFire.nextId,issued);assert.deepEqual(sim.drainEvents().filter(e=>e.type==='enemy-fire'),[]);
  assert.ok(shooter.cooldown>=32,`cadence re-armed (${shooter.cooldown})`);assert.equal(shooter.firedAt,firedAt);
  const {sim:later,shooter:gun}=gateShooterSetup();
  later.battleClock=SILENCE_UNTIL;later.updateCombat(.05);
  assert.equal(later.enemyFire.rounds.length,1,'the very same shooter, position and cooldown fire as soon as the clock leaves the window');
  assert.equal(later.drainEvents().filter(e=>e.type==='enemy-fire').length,1);assert.equal(gun.firedAt,later.clock);
});

test('the silence stops the unissued rounds of an MG34 burst planned before it, leaves those already in the air and refuses new bursts',()=>{
  // The combat is stepped directly: a tick() with the battle clock set by hand would consume every scripted event up to that time (Kowal would suppress the gun).
  const gunner=()=>{
    const s=new M01Simulation(17);s.scene=null;const gun=s.actor('de_east_0');gun.active=true;gun.cooldown=99;
    for(let i=0;i<40;i++)s.tick(.05);assert.equal(gun.mg34Prone.phase,'idle');return {s,gun};
  };
  const fire=({s,gun})=>s.burst(gun,{x:100,y:0,z:22},'area',{rounds:7,bias:[1.2,.8],cone:[.7,.5],tracer:true});
  const advance=(s,n)=>{for(let i=0;i<n;i++){s.clock+=.005;s.updateCombat(.005);}};
  const control=gunner();control.s.battleClock=FROM-.1;
  assert.equal(fire(control),true);assert.equal(control.s.enemyFire.rounds.length,1,'a burst in progress');
  advance(control.s,120);
  assert.equal(control.s.enemyFire.rounds.length,7,'control: outside the window the burst is delivered in full');
  const silent=gunner();silent.s.battleClock=FROM-.1;
  assert.equal(fire(silent),true);assert.equal(silent.s.enemyFire.rounds.length,1);
  silent.s.battleClock=FROM;
  advance(silent.s,120);
  assert.equal(silent.s.germanSilence(),true);assert.equal(silent.gun.mg34Prone.phase,'idle');assert.equal(silent.gun.shot,0);assert.equal(silent.gun.mg34Prone.burst,undefined);
  assert.equal(silent.s.enemyFire.rounds.length,1,'the round already in the air stays, no new one is emitted');
  validateM01Snapshot(silent.s.snapshot());
  assert.equal(fire(silent),false,'and a new burst is refused inside the window');
  silent.s.battleClock=SILENCE_UNTIL;assert.equal(fire(silent),true,'but not once it is over');
});

// ---- A. the fall-back and the carried pairs ------------------------------------------------------------------------------------------------------

for(const [seed,support] of ROUTES)test(`real route ${seed}/${support}: two fallen Germans are lifted by the two westmost survivors and follow them on every tick`,()=>{
  const obs=observe(seed,support),first=obs.rows[0],men=SURVIVORS.map(id=>man(first,id)).filter(a=>a.alive&&a.active).sort((a,b)=>a.x-b.x);
  const carried=FALLEN.map(id=>man(first,id)).filter(a=>a.carriedBy);
  assert.equal(carried.length,2);assert.deepEqual(first.withdrawal.carried.map(c=>c.patient).sort(),carried.map(c=>c.id).sort());
  const carriers=new Set(carried.map(c=>c.carriedBy));assert.equal(carriers.size,2,'two different carriers');
  assert.deepEqual([...carriers].sort(),men.slice(0,2).map(a=>a.id).sort(),'the two westmost living survivors');
  for(const patient of carried){
    assert.equal(patient.alive,false);assert.equal(patient.state,'DOWN');assert.equal(patient.diedAt,obs.demolitionClock,'felled by the blast itself');
    assert.ok(SURVIVORS.includes(patient.carriedBy));
  }
  for(const id of FALLEN.filter(id=>!carried.some(c=>c.id===id))){
    const a=man(first,id),end=man(obs.rows[obs.regroupIndex],id);
    assert.equal(a.carriedBy,null);assert.deepEqual([end.x,end.z,end.carriedBy],[a.x,a.z,null],id+' stays where it fell');
  }
  for(const row of obs.rows.slice(0,obs.regroupIndex)){
    for(const patient of carried){
      const p=man(row,patient.id),c=man(row,patient.carriedBy);
      assert.equal(p.carriedBy,c.id);assert.equal(c.alive&&c.active,true);
      assert.equal(p.x,c.x-Math.cos(c.facing)*.25,`${p.id} follows ${c.id} (x) at tick ${row.tick}`);assert.equal(p.z,c.z-Math.sin(c.facing)*.25);
      assert.equal(p.y,c.y+1.15);assert.equal(p.facing,c.facing+Math.PI/2);
      assert.equal(p.pose,'carried',`${p.id} is carried, not fallen, at tick ${row.tick}`);
      assert.equal(c.state,'RETREAT');
    }
    assert.equal(row.withdrawal.phase,'FALL_BACK');
  }
  assert.ok(obs.regroupIndex>250,`${obs.regroupIndex} ticks of fall-back to 06:12`);
  const mid=obs.rows.find(r=>r.battleClock>=seconds('06:10:30'));
  for(const patient of carried)assert.equal(man(mid,patient.carriedBy).gait,'carry','the carrier\'s published gait is carry');
  // A man with a load walks: never faster than the pace of the old retreat (1.5 m/s) on the routes, where the pack is together.
  for(const row of obs.rows.slice(1,obs.regroupIndex))for(const c of carriers)assert.ok(man(row,c).speed<=1.5,`${c} ${man(row,c).speed}`);
});

test('a carrier killed on the march drops his man where he stands; the other pair and the knot carry on',()=>{
  const sim=fromSnapshot(observe(19390901,false).snapshots.mid),pairs=sim.germanWithdrawal.carried;assert.equal(pairs.length,2);
  const [lost,kept]=pairs,carrier=sim.actor(lost.carrier),patient=sim.actor(lost.patient);
  Object.assign(carrier,{health:0,alive:false,state:'DOWN'});
  sim.tick(.05);
  assert.equal(patient.carriedBy,null);assert.equal(patient.y,sim.world.heightAt(patient.x,patient.z));assert.equal(actorPoseName(patient,sim.clock),'fallen');
  assert.equal(sim.actor(kept.patient).carriedBy,kept.carrier);assert.deepEqual(sim.germanWithdrawal.carried,[kept]);
  validateM01Snapshot(sim.snapshot());
  while(sim.battleClock<REGROUP_AT+1)sim.tick(.05);
  assert.equal(carrier.alive,false);assert.equal(sim.actor(kept.patient).carriedBy,null);
  assert.deepEqual(sim.germanWithdrawal.regrouped,SURVIVORS.filter(id=>sim.actor(id).alive),'every living survivor regroups, the dead carrier does not move');
});

test('the gate shooters of Lisewo keep their places: the withdrawal moves only the Germans of the spans',()=>{
  const fresh=new M01Simulation(),obs=observe(19390901,false);
  for(const a of obs.gates){
    const start=fresh.actor(a.id);
    assert.deepEqual([a.x,a.y,a.z],[start.x,start.y,start.z],a.id+' has not moved');
    assert.notEqual(a.state,'REGROUP');
  }
  assert.ok(obs.gates.length===40);
});

// ---- C. the regroup at 06:12 ----------------------------------------------------------------------------------------------------------------------

for(const [seed,support] of ROUTES)test(`real route ${seed}/${support}: the Germans stand regrouped at the first tick at or after 06:12, at the places planned by the east demolition`,()=>{
  const obs=observe(seed,support),i=obs.regroupIndex,row=obs.rows[i],last=obs.rows[i-1],plan=new Map(obs.snapshots.demolition.actors.filter(a=>a.fallBack).map(a=>[a.id,a.fallBack]));
  assert.ok(i>0&&row.battleClock>=REGROUP_AT&&last.battleClock<REGROUP_AT,'the first tick at or after 06:12');
  assert.ok(row.battleClock-REGROUP_AT<.43,'within one tick of the schedule');
  assert.equal(last.withdrawal.phase,'FALL_BACK');assert.equal(row.withdrawal.phase,'REGROUP');
  const living=SURVIVORS.map(id=>man(row,id)).filter(a=>a.alive&&a.active);assert.ok(living.length>=2);
  assert.deepEqual([...row.withdrawal.regrouped].sort(),living.map(a=>a.id).sort());
  for(const a of living){
    const p=plan.get(a.id);assert.ok(p,a.id+' has a plan from the demolition');
    assert.equal(a.state,'REGROUP');assert.equal(a.fallBack,null);assert.deepEqual([a.x,a.z],[p.x1,p.z1],a.id+' is on its place');assert.equal(a.facing,Math.PI,'facing back to the bridge');
    const before=man(last,a.id);assert.equal(before.state,'RETREAT');assert.ok(Math.hypot(before.x-a.x,before.z-a.z)<.5,'arrived by walking, not by a jump');
  }
  // A close-up knot on the deck, ahead of where the men were and short of the deck end.
  const xs=living.map(a=>a.x),zs=living.map(a=>a.z);
  assert.ok(Math.max(...xs)-Math.min(...xs)<=4&&Math.max(...zs)-Math.min(...zs)<=4,'a knot of at most 4 x 4 m');
  assert.ok(Math.max(...xs)<=1080+1.8&&Math.min(...zs)>=37&&Math.max(...zs)<=44,'inside the lane of the old retreat (x up to 1080, the road deck and its gate)');
  const west=Math.min(...obs.snapshots.demolition.actors.filter(a=>plan.has(a.id)).map(a=>a.x));
  assert.ok(Math.min(...xs)-west>=10&&Math.min(...xs)-west<=20,`the knot formed ${(Math.min(...xs)-west).toFixed(1)} m ahead of the westmost survivor`);
  // Set down: the carried men lie beside their carriers, on the ground, no longer carried, still the casualties they were.
  for(const id of FALLEN.filter(id=>man(obs.rows[0],id).carriedBy)){
    const p=man(row,id),c=man(row,man(obs.rows[0],id).carriedBy);
    assert.equal(p.carriedBy,null);assert.equal(p.alive,false);assert.equal(p.pose,'fallen');assert.deepEqual([p.x,p.z],[c.x-1.1,c.z]);assert.equal(p.y,GROUND.heightAt(p.x,p.z));
  }
  for(const a of living)assert.equal(a.y,GROUND.heightAt(a.x,a.z),a.id+' stands on the ground');
  // And they stay: the same places at the end of the route as at 06:12.
  for(const a of living){const end=obs.final.find(f=>f.id===a.id);assert.deepEqual([end.state,end.x,end.z,end.fallBack],['REGROUP',a.x,a.z,null],a.id);}
  assert.equal(obs.complete,true);
});

test('the march ends on the same places at 06:12 whatever the tick length, with no use of the RNG and no regard for suppression',()=>{
  const snapshot=observe(19390901,false).snapshots.demolition,a=fromSnapshot(snapshot),b=fromSnapshot(snapshot),c=fromSnapshot(snapshot);
  const rng=a.rng.state;a.beginFallBack();assert.equal(a.rng.state,rng,'beginFallBack draws nothing');
  const pattern=[.013,.05,.031,.02];let n=0;
  for(const [sim,dt] of [[a,()=>.05],[b,()=>pattern[n++%pattern.length]],[c,()=>.05]]){
    if(sim===c)for(const id of SURVIVORS)sim.actor(id).suppressedUntil=sim.clock+60;
    while(sim.battleClock<REGROUP_AT)sim.tick(dt());
  }
  for(const id of [...SURVIVORS,...FALLEN]){
    const x=a.actor(id);
    for(const other of [b,c]){const y=other.actor(id);assert.deepEqual([y.x,y.z,y.state,y.carriedBy??null],[x.x,x.z,x.state,x.carriedBy??null],id);}
  }
  assert.deepEqual(a.germanWithdrawal.regrouped,SURVIVORS.filter(id=>a.actor(id).alive));
});

// ---- saves ---------------------------------------------------------------------------------------------------------------------------------------

test('states saved on the demolition tick, in the middle of the march and at 06:12 validate and have identical futures after double restores',()=>{
  const obs=observe(19390901,false);
  for(const [label,snapshot,ticks] of [['demolition',obs.snapshots.demolition,300],['mid',obs.snapshots.mid,250],['regroup',obs.snapshots.regroup,120]]){
    validateM01Snapshot(structuredClone(snapshot));
    const sim=fromSnapshot(snapshot);assert.deepEqual(sim.snapshot(),snapshot,label+' round-trips');
    compareContinuation(sim,{label:'german-retreat-'+label,ticks,doubleAt:[1,60],dt:t=>t%17===0?0:t%3===0?.013:.05});
  }
});

test('a save made after the east demolition by the code before T48 keeps the old retreat to x 1080 and is accepted unchanged',()=>{
  const legacy=structuredClone(observe(19390901,false).snapshots.demolition);
  for(const a of legacy.actors){delete a.fallBack;if(a.group==='grp_de_spans'){a.carriedBy=null;a.y=0;if(a.alive)Object.assign(a,{state:'RETREAT',facing:0});}}
  Object.assign(legacy.player,{x:-290,y:-3,z:26});
  const before=structuredClone(legacy);validateM01Snapshot(legacy);
  const sim=fromSnapshot(legacy);assert.deepEqual(legacy,before,'restoring never edits the supplied save');
  // 2026-10-19 re-pin (combat slice 2b): the rearguard now kills men of the assault on this route before the demolition (measured: de_spans_7, 8 and 9 on 19390901); the old retreat is
  // checked on the men of SURVIVORS who are alive at the demolition, and there are still some.
  const survivors=SURVIVORS.map(id=>sim.actor(id)).filter(a=>a.alive),start=survivors.map(a=>a.x);
  assert.ok(survivors.length>=2,`${survivors.length} living men march back`);
  for(let i=0;i<20*90;i++)sim.tick(.05);
  assert.ok(survivors.every((a,i)=>a.state==='RETREAT'&&a.x>start[i]&&a.fallBack===undefined),'still on the old retreat, never REGROUP');
  assert.ok(survivors.every(a=>Math.abs(a.x-1080)<1e-9),'and they reach the old destination');
  assert.deepEqual(sim.germanWithdrawal.regrouped,[]);assert.equal(sim.germanWithdrawal.phase,'IDLE','no man is marching on a plan and none is regrouped');
});

test('the validator accepts the new data and rejects malformed withdrawal data atomically',()=>{
  const obs=observe(19390901,false),mid=obs.snapshots.mid,regroup=obs.snapshots.regroup;
  validateM01Snapshot(structuredClone(mid));validateM01Snapshot(structuredClone(regroup));
  assert.ok(regroup.actors.filter(a=>a.state==='REGROUP').length>=2);
  const span=(s,id)=>s.actors.find(a=>a.id===id),early=new M01Simulation(3).snapshot();
  const alterations=[
    ['plan on a Pole',mid,s=>{span(s,'marek_zielinski').fallBack={t0:seconds('06:10:00'),x0:0,z0:0,x1:1,z1:1};},/retirada alemã/],
    ['plan on a German of the dike',mid,s=>{span(s,'de_east_3').fallBack={t0:seconds('06:10:00'),x0:0,z0:0,x1:1,z1:1};},/retirada alemã/],
    ['plan before the east demolition',early,s=>{span(s,'de_spans_4').fallBack={t0:seconds('04:30:00'),x0:1050,z0:40,x1:1020,z1:40};},/retirada alemã/],
    ['plan with an extra key',mid,s=>{span(s,'de_spans_6').fallBack.speed=2;},/retirada alemã/],
    ['plan with a missing key',mid,s=>{delete span(s,'de_spans_6').fallBack.z1;},/retirada alemã/],
    ['plan with a place that is not finite',mid,s=>{span(s,'de_spans_6').fallBack.x1=null;},/retirada alemã|Checkpoint M01 inválido/],
    ['plan from the future',mid,s=>{span(s,'de_spans_6').fallBack.t0=s.battleClock+1;},/retirada alemã/],
    ['plan from before the mission',mid,s=>{span(s,'de_spans_6').fallBack.t0=seconds('04:00:00');},/retirada alemã/],
    ['REGROUP together with a plan',mid,s=>{span(s,'de_spans_6').state='REGROUP';},/reagrupamento/],
    ['REGROUP on a Pole',mid,s=>{span(s,'marek_zielinski').state='REGROUP';},/reagrupamento/],
    ['a living German carried',mid,s=>{const a=span(s,'de_spans_2');Object.assign(a,{alive:true,health:50});},/transporte alemão|apresentação/],
    // 2026-10-22 re-pin de_spans_5 -> de_spans_7 (golden amendment 15: after the first ckm stoppage, 04:58, the Germans draw the main RNG in another order): on this route de_spans_5 now falls on the deck (x 507) and the
    // two men who carry are de_spans_6 (de_spans_3) and de_spans_7 (de_spans_2); before, they were de_spans_5 (de_spans_3) and de_spans_6 (de_spans_2). The two mutations are the same
    // ones, on a man who really carries.
    ['a German carried by a man without a plan',mid,s=>{delete span(s,'de_spans_7').fallBack;},/transporte alemão/],
    ['a German carried by a Pole',mid,s=>{span(s,'de_spans_2').carriedBy='marek_zielinski';},/transporte alemão/],
    ['a German carried by a dead man',mid,s=>{span(s,'de_spans_7').alive=false;},/transporte/],
  ];
  for(const [name,base,alter,pattern] of alterations){
    const bad=structuredClone(base);alter(bad);const raw=structuredClone(bad),target=new M01Simulation(),saved=target.snapshot();
    assert.throws(()=>target.restoreSnapshot(bad),pattern,name);assert.deepEqual(target.snapshot(),saved,name+': rejected atomically');assert.deepEqual(bad,raw,name+': the supplied save is untouched');
  }
});

test('the getter is computed on every read and detached; the plan and the pairs live in the actors of the save',()=>{
  const sim=fromSnapshot(observe(19390901,false).snapshots.mid),saved=sim.snapshot();
  const view=sim.germanWithdrawal;view.carried.length=0;view.regrouped.push('x');
  assert.deepEqual(sim.snapshot(),saved,'reading the getter writes nothing and returns detached data');
  assert.ok(!JSON.stringify(saved).includes('germanWithdrawal'));
  // 2026-10-19 re-pin de_spans_4 -> de_spans_5 (golden amendment 12, the 05:35 fill moves the main RNG): on this route de_spans_4 now falls in the deck fight (x 459), so the
  // retreat record is read on a man who lives to retreat; the record itself is unchanged.
  // 2026-10-22 re-pin de_spans_5 -> de_spans_6 (golden amendment 15, the ckm stoppages): de_spans_5 now falls on the deck (x 507, dead before the demolition); de_spans_6 retreats and carries.
  assert.match(JSON.stringify(saved.actors.find(a=>a.id==='de_spans_6')),/"fallBack":\{"t0":\d+(\.\d+)?,"x0"/);
  assert.deepEqual(restore(sim).germanWithdrawal,sim.germanWithdrawal);
});

// ---- golden amendments 02 and 03 (both history) -------------------------------------------------------------------------------------------------

// Amendment 02 moved the partials golden on top of the candidate #80 (813f163). The T38 staging was then merged into this branch (f02e06b), so the simulation these
// tests drove was the combined one and no longer the one that golden pins: the partials golden is the history of the candidate #80 + #89 + T48 (kept, and pinned by
// tests/m01-animation-contract.test.js) and the golden of that simulation became the T38 golden; amendment 03 (GOLDEN_AMENDMENT_03.json) is the retreat over the T38 staging.
// T47 (the live fire of the ckm wz.30, merge 3c9cab7) was merged later and changes Germans long before the east demolition, so the simulation these tests drive today is the
// staging PLUS the gun: the T38 golden of amendment 02 (`staging`) is the golden of the simulation this proof is about, and the live golden is no longer that one. Both
// amendment tests therefore keep every assertion that needs no simulation, and take the east demolition ticks from the record they are about instead of from a live route (the
// live tick moved with the gun: the repair finishes earlier). The proof itself is re-run from git at the staging commit by tools/verification/m01-german-retreat-golden-audit.mjs
// (GOLDEN_AMENDMENT_03.json comes out byte for byte), and what the retreat does in the live tree is what the other tests of this file drive.
const sha=url=>createHash('sha256').update(readFileSync(new URL(url,import.meta.url))).digest('hex');
/** The 512-tick blocks of `now` before the one holding the east demolition `tick` equal those of `old`, and that block is the first to change. */
function assertFirstChangeIsDemolitionBlock(old,now,tick){
  const first=Math.ceil(tick/512)-1;
  assert.deepEqual([old.seed,old.support],[now.seed,now.support]);
  assert.ok(first>20,'the east demolition is deep into the route');
  assert.deepEqual(now.blocks.slice(0,first),old.blocks.slice(0,first),`${now.seed}: ${first} blocks (ticks 1..${first*512}) precede tick ${tick} and are byte-identical`);
  assert.equal(now.blocks[first].tick,old.blocks[first].tick);
  assert.ok(old.blocks[first-1].tick<tick&&tick<=old.blocks[first].tick,'that block holds the east demolition tick');
  assert.notEqual(now.blocks[first].sha256,old.blocks[first].sha256,'and it is the first one to change');
  assert.equal(now.blocks.at(-1).tick,now.ticks,'the last block ends the route');
}

test('golden amendment 02 (history, on the candidate #80): the pre-change fixture is kept, its blocks before the recorded east demolition are byte-identical and the first change is the block holding that tick',()=>{
  const before=JSON.parse(readFileSync(new URL('./fixtures/m01-partials-gameplay-baseline-before-amendment-02.json',import.meta.url)));
  assert.equal(before.sourceSha256,'00964436e079373887ca89c2128e8aa7f81a7f4ee9522c63b070f0e14f833f2a','the source T48 started from (PR #80 head)');
  assert.equal(before.historicalGoldenSha256,partials.historicalGoldenSha256,'the immutable historical golden is untouched');
  assert.equal(before.routes.length,partials.routes.length);
  for(const [i,now] of partials.routes.entries())assertFirstChangeIsDemolitionBlock(before.routes[i],now,partials.amendment02.eastDemolitionTicks[`${now.seed}/${now.support}`]);
  assert.equal(partials.amendment02.base,'813f163deceb551e0e4504b30958580cb67d3a76');
});

test('golden amendment 03 (history, the retreat over the T38 staging): the T38 golden before the merge is kept, its blocks before the recorded east demolition are byte-identical and the first change is the block holding that tick',()=>{
  const before=JSON.parse(readFileSync(new URL('./fixtures/m01-t38-gameplay-baseline-before-amendment-02.json',import.meta.url))),
    record=JSON.parse(readFileSync(new URL('../docs/verification/m01-runtime/german-retreat-regroup-v1/GOLDEN_AMENDMENT_03.json',import.meta.url),'utf8'));
  assert.equal(before.sourceSha256,'344a932f82a21bc4efe138968193a999f1d0efc17eceffea5ceb9a3d09a933a0','the simulation the retreat joined (the T38 head 65145c9)');
  assert.equal(before.historicalGoldenSha256,staging.historicalGoldenSha256,'the immutable historical golden is untouched');
  assert.equal(before.routes.length,staging.routes.length);
  assert.equal(record.amendment,'amendment-03');assert.equal(record.base,'65145c905209d47da6931aad11c0beeebe597291');
  assert.equal(record.beforeFixtureSha256,sha('./fixtures/m01-t38-gameplay-baseline-before-amendment-02.json'));
  assert.equal(record.afterFixtureSha256,sha('./fixtures/m01-t38-gameplay-baseline.json'));assert.equal(record.afterSourceSha256,staging.sourceSha256);
  assert.equal(record.routes.length,staging.routes.length);
  for(const [i,now] of staging.routes.entries()){
    const entry=record.routes[i];
    assertFirstChangeIsDemolitionBlock(before.routes[i],now,entry.eastDemolitionTick);
    assert.deepEqual([entry.seed,entry.support],[now.seed,now.support]);
    assert.equal(entry.confinedTicks,now.ticks,'every tick of the route is confined to the Germans of the spans');
    assert.ok(entry.differingActors.length>0&&entry.differingActors.every(id=>/^de_spans_\d$/.test(id)),'and only they differ');
  }
});
