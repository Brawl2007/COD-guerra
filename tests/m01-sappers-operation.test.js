// R3-a (2026-10-24, owner complaint «os sapadores parecem homens a picar o chão repetidamente, sem trabalho visível», golden amendment 19): the sappers' staged technical operation.
// State-level tests of the simulation (src/game/m01-sappers.js, mission.json grp_sappers.operation): the plan as validated data, the stage as a function of the old 0-100 bar, the real route's
// sequence (locate, wait, inspect, splice, test, the one failure, the walk along the cable, the second cut, the passing test, report, ready, the looks after the blasts), the work seconds that
// did not change, the gate (the leader at the place of the stage), interruption by a pin and by a bomb, the cover a shaken man makes for, saves per stage and a save from before this change.
// No browser, no human playtest. The poses and the cable are in tests/m01-sappers-render.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,validateM01Snapshot,seconds,clockText} from '../src/game/m01-simulation.js';
import {SAPPERS,sapperOperationPlan,stageAtProgress,sapperPhase,sapperCover,REPAIR_WORK_SEC,SAPPER_STAGE_IDS,SAPPER_PHASES,segmentDistance,workDistance} from '../src/game/m01-sappers.js';
import {route,driver,toRepair} from './helpers/m01-route.js';
import {compareContinuation,json} from './helpers/m01-determinism.js';

const E=name=>`evt_m01_${name}`,IDS=['pawel_krawiec','sapper_2','sapper_3'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const mutate=fn=>{const d=structuredClone(definition);fn(d.groups.find(g=>g.id==='grp_sappers').operation);return d;};
const restoreFrom=raw=>{const s=new M01Simulation(1);s.restoreSnapshot(json(raw));s.drainEvents();return s;};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the operation is mission data, validated when it loads: stages that add up to the work seconds of always, one failed test, two cuts on the cable, spaced slots',()=>{
  assert.equal(REPAIR_WORK_SEC,150);assert.deepEqual(SAPPERS.stages.map(s=>s.id),SAPPER_STAGE_IDS);
  assert.equal(SAPPERS.stages.reduce((n,s)=>n+s.sec,0),REPAIR_WORK_SEC,'the stages are the 150 s of work of always');
  assert.equal(SAPPERS.stages[0].from,0);assert.ok(Math.abs(SAPPERS.stages.at(-1).to-100)<1e-9);
  for(let i=1;i<SAPPERS.stages.length;i++)assert.ok(Math.abs(SAPPERS.stages[i].from-SAPPERS.stages[i-1].to)<1e-9,'the windows follow each other');
  assert.deepEqual(SAPPERS.stages.filter(s=>s.result).map(s=>[s.id,s.result]),[['fail','fail'],['test2','pass']],'the first test fails once, the last passes');
  // the walk fits in its seconds; the second cut is 16 m along the cable, to the west; both are on the cable the renderer draws
  const walk=dist(SAPPERS.points.fault,SAPPERS.points.second);assert.ok(Math.abs(walk-16.2)<.5);
  assert.ok(SAPPERS.byId.relocate.sec*SAPPERS.byId.relocate.speed>=walk*1.05);
  for(const p of ['crater','fault','second'])assert.ok(SAPPERS.cable.some((c,i)=>i&&segmentDistance(SAPPERS.points[p],{x:SAPPERS.cable[i-1][0],z:SAPPERS.cable[i-1][1]},{x:c[0],z:c[1]})<.2),p);
  // the data carries nothing but generic actions (HISTORICAL_RESEARCH.md §79): no explosive vocabulary in the texts the player reads
  const texts=[...SAPPERS.stages.map(s=>s.text),...Object.values(SAPPERS.text)].join(' ').toLowerCase();
  assert.ok(!/carga|detona|explos|espoleta|fusível|pólvora|tnt|ignição|disparar/.test(texts),texts);
  for(const [name,fn,re] of [
    ['a stage that does not add up',o=>{o.stages[1].sec=51;},/add up/],
    ['no failed test',o=>{delete o.stages[3].result;},/failed test/],
    ['the last test does not pass',o=>{o.stages[7].result='fail';},/failed test/],
    ['two leaders',o=>{o.roles.sapper_2='leader';},/roles/],
    ['a missing role',o=>{delete o.roles.sapper_3;},/roles/],
    ['two men on one spot',o=>{o.points.fault.slots.sapper_2=[-120.4,10.5,0];},/closer than 0\.9 m/],
    ['a slot far from its point',o=>{o.points.second.slots.sapper_3=[-150,10,0];},/more than 6 m/],
    ['a cut that is not on the cable',o=>{o.points.fault.z=15;},/not on the cable/],
    ['the second cut east of the fault',o=>{o.points.second.x=-100;for(const k of Object.keys(o.points.second.slots))o.points.second.slots[k][0]+=36.6;},/second cut west/],
    ['a walk that does not fit in its seconds',o=>{o.stages[4].speed=.9;},/does not fit/],
    ['a stage out of order',o=>{[o.stages[0],o.stages[1]]=[o.stages[1],o.stages[0]];},/exactly/],
    ['an arrive radius out of range',o=>{o.arriveM=9;},/arriveM/],
    ['a short cable',o=>{o.cable=o.cable.slice(0,3);},/cable/],
    ['no text for the wait',o=>{delete o.text.standby;},/text\.standby/],
    // R3-a review (2026-10-25): the lee places of the run for cover, and the cover that must be within reach of every work place
    ['no lee places',o=>{delete o.seek.lanes;},/seek\.lanes/],
    ['a role without a lee place',o=>{delete o.seek.lanes.watch;},/seek\.lanes/],
    ['two roles on one lee spot',o=>{o.seek.lanes.helper=[...o.seek.lanes.leader];},/seek\.lanes: .* closer than 0\.9 m/],
    ['a lee place inside the box',o=>{o.seek.lanes.watch[0]=-.5;},/seek\.lanes/],
    ['a lee place beyond the end of the box',o=>{o.seek.lanes.watch[1]=2;},/seek\.lanes/],
    ['cover out of reach of a work place',o=>{o.seek.coverM=3;},/no cover node within seek\.coverM \(3 m\)/],
  ])assert.throws(()=>sapperOperationPlan(mutate(fn)),re,name);
  assert.throws(()=>sapperOperationPlan({...definition,groups:definition.groups.filter(g=>g.id!=='grp_sappers')}),/is missing|Cannot read/);
});

test('the stage is a pure function of the old 0-100 bar: a save made before this module existed falls into the right stage',()=>{
  for(const s of SAPPERS.stages){
    assert.equal(stageAtProgress(s.from+1e-6).id,s.id,`${s.id} just inside`);
    assert.equal(stageAtProgress((s.from+s.to)/2).id,s.id,`${s.id} in the middle`);
  }
  assert.equal(stageAtProgress(0).id,'inspect');assert.equal(stageAtProgress(100).id,'test2');assert.equal(stageAtProgress(35).id,'splice');
  assert.equal(stageAtProgress(-5).id,'inspect');assert.equal(stageAtProgress(500).id,'test2');
  let last=-1;for(let p=0;p<=100;p+=.25){const i=stageAtProgress(p).index;assert.ok(i>=last,'monotone');last=i;}
  // the pin rule: a man within 6 m of the line between the two cuts is at work (it was: within 6 m of repair site 2), and the capsule contains the old circle's sappers
  for(const id of IDS)for(const point of ['fault','second'])assert.ok(workDistance(SAPPERS.points[point].slots[id])<6);
  assert.ok(workDistance({x:-120.7,z:10})<6&&workDistance({x:-123.2,z:10})<6,'the old places at the second cut');
  assert.ok(workDistance({x:-40.6,z:10.5})>30,'the camp at the crater is not at work');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
/** A real route, observed every tick: the phase and the places of the three men, the snapshots at the middle of each phase, the pins per stage, the lines said. */
function record(seed,support){
  const o={seed,support,seq:[],at:{},snaps:{},pinsByStage:{},first:{},tick:0,lines:[],status:new Map(),maxStep:{},locateTrail:[]};
  let lastId=null,ticksIn=0;
  const r=route(seed,{support,onStep:({sim,events})=>{
    o.tick++;
    const ph=sapperPhase(sim),id=ph.id;
    if(id!==lastId){o.seq.push(id);o.at[id]??=[];o.at[id].push({clock:sim.clock,battle:sim.battleClock,work:ph.work,positions:IDS.map(k=>{const a=sim.actor(k);return {id:k,x:a.x,z:a.z,crouched:a.crouched,posture:a.posture};})});lastId=id;ticksIn=0;}
    ticksIn++;
    if(!o.snaps[id]&&(ph.stage?ph.t>=ph.stage.sec/2:ticksIn>=20))o.snaps[id]=sim.snapshot();   // the middle of a stage; one second into any other phase
    if(id==='locate'||id==='relocate')o.locateTrail.push({clock:sim.clock,x:sim.actor('pawel_krawiec').x,id});
    for(const e of events){
      if(e.type==='round-impact'&&e.pinned?.some(p=>IDS.includes(p))&&sim.active('cover_repair'))o.pinsByStage[id]=(o.pinsByStage[id]??0)+1;
      if(e.type==='message')o.first.message??=0;
    }
    for(const q of sim.dialogueQueue)if(!o.lines.includes(q.id))o.lines.push(q.id);
    if(sim.subtitle&&!o.lines.includes(sim.subtitle.id))o.lines.push(sim.subtitle.id);
    if(['locate','standby','inspect','splice','test','fail','relocate','inspect2','splice2','test2','report'].includes(id)&&!o.status.has(id))o.status.set(id,{status:sim.mission.status,text:sim.mission.text});
  }});
  o.sim=r.sim;return o;
}
let control,support;
const ctl=()=>control??=record(19390901,false),sup=()=>support??=record(19390901,true);
const compress=seq=>seq.filter((id,i)=>id!==seq[i-1]);

test('the real route: locate, wait, inspect, splice, test, the one failure, the walk along the cable, the second cut, the passing test, report, ready, the looks after the blasts',()=>{
  for(const o of [ctl(),sup()]){
    const seq=compress(o.seq);
    assert.deepEqual(seq.slice(0,16),['camp','locate','standby','inspect','splice','test','fail','relocate','inspect2','splice2','test2','report','ready','verify','retreat','verify_west'],JSON.stringify(seq));
    for(const id of ['locate','standby','inspect','splice','test','fail','relocate','inspect2','splice2','test2','report','ready','verify'])assert.equal(o.at[id].length,1,`${id} happens once`);
    assert.equal(o.sim.mission.complete,true);assert.equal(o.sim.battleClock,seconds('07:05'));
    // the work seconds done at the start of each stage are the plan's
    for(const s of SAPPERS.stages)assert.ok(Math.abs(o.at[s.id][0].work-s.start)<.2,`${s.id} starts at ${o.at[s.id][0].work.toFixed(2)} s of work (plan ${s.start})`);
    // the places: the team knelt at the crater, walked west to the cut, then to the second cut, and stands at the second cut until the retreat
    for(const p of o.at.camp[0].positions)assert.ok(dist(p,SAPPERS.points.crater)<8,`${p.id} starts by the crater`);
    for(const p of o.at.standby[0].positions)assert.ok(dist(p,SAPPERS.points.fault.slots[p.id])<=SAPPERS.arriveM+2,`${p.id} has reached the cut`);
    for(const p of o.at.inspect2[0].positions)assert.ok(dist(p,SAPPERS.points.second.slots[p.id])<=4,`${p.id} has reached the second cut`);
    for(const p of o.at.ready[0].positions)assert.ok(dist(p,SAPPERS.points.second.slots[p.id])<=1.2,`${p.id} stands at the second cut`);
  }
});

test('the work seconds did not change: with nobody firing the repair takes 150 s of the clock plus the walk, and the historical anchors stay where they were',()=>{
  const d=toRepair(driver(19390901)),{sim,step}=d;
  sim.landRound=()=>{};   // nobody pins the team: the pure work time
  const start=sim.clock;let walkSec=0,ticksInStages=0;
  for(let i=0;i<20*400&&sim.active('cover_repair');i++){step({});if(sapperPhase(sim).id==='relocate')walkSec+=.05;ticksInStages++;}
  assert.equal(sim.done('cover_repair'),true);
  const took=sim.clock-start;assert.ok(took>=REPAIR_WORK_SEC-.1&&took<=REPAIR_WORK_SEC+4,`took ${took.toFixed(2)} s of work for ${REPAIR_WORK_SEC} s`);
  assert.ok(walkSec>=SAPPERS.byId.relocate.sec-.2,`the walk ran ${walkSec.toFixed(2)} s`);
  // the event stays the progress reaching 100; the order stays at 05:30; the demolitions at 06:10 and 06:45 (the whole route checks them in tests/m01-cover-combat.test.js and the golden audit)
  assert.equal(definition.events.find(e=>e.id===E('repair_complete')).trigger.value,100);
  assert.equal(definition.events.find(e=>e.id===E('order_demolish')).trigger.of[0].at,'05:30:00');
  assert.equal(definition.events.find(e=>e.id===E('east_demolition')).trigger.at,'06:10:00');assert.equal(definition.events.find(e=>e.id===E('west_demolition')).trigger.at,'06:45:00');
});

test('the repair completes before the order of 05:30 on both golden routes, and the pins on the team count at both cuts and on the walk between them',()=>{
  for(const o of [ctl(),sup()]){
    const s=o.sim,done=s.consumed[E('repair_complete')];assert.ok(done>0);
    assert.equal(s.consumed[E('order_demolish')]>done,true);
    const t=o.at.ready[0].battle;assert.ok(t<seconds('05:30:00'),`repair complete at ${clockText(t)}`);
  }
  const pins=ctl().pinsByStage;
  assert.ok((pins.inspect??0)+(pins.splice??0)+(pins.test??0)+(pins.fail??0)>0,'pinned at the first cut '+JSON.stringify(pins));
  assert.ok((pins.inspect2??0)+(pins.splice2??0)+(pins.test2??0)>0,'pinned at the second cut '+JSON.stringify(pins));
  assert.ok(ctl().sim.timers.repairPins>10,'the pins at both cuts are counted as pins on the repair');
});

test('the status line follows the stage; the pinned line is the simulation\'s own; the objective keeps its text',()=>{
  const o=ctl();
  const text=Object.fromEntries(SAPPERS.stages.map(s=>[s.id,s.text]));
  for(const id of SAPPER_STAGE_IDS){const m=o.status.get(id);assert.ok(m,id);
    if(!/deitados/.test(m.status))assert.match(m.status,new RegExp(`^Reparo \\d+% · ${text[id].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`),`${id}: ${m.status}`);
    assert.equal(m.text.startsWith('Proteja o reparo da linha'),true,m.text);}
  assert.equal(o.status.get('locate').status,'Os sapadores procuram o corte');
  assert.equal(o.status.get('standby').status,'Os sapadores esperam o material junto ao corte');
});

test('the reactive lines of the stages are said, once each, by the right men (reused lines for the pins and the halfway point)',()=>{
  for(const o of [sup()]){
    // 200, 201 and the scripted 204 are always heard on the support route (the player stands 7 m from the sappers); 203 and 205 are reactive and the busy minute of train 963 (04:45, eight lines in 60 s)
    // starves them: the budget of the channel (barks.budget60) is the director's, not this operation's. The others are best effort and, when said, come in the order of the stages.
    for(const id of ['dlg_m01_200','dlg_m01_201','dlg_m01_204'])assert.ok(o.lines.includes(id),`${id} was said`);
    const stageOrder=['dlg_m01_200','dlg_m01_201','dlg_m01_202','dlg_m01_203','dlg_m01_204','dlg_m01_205','dlg_m01_206'].filter(id=>o.lines.includes(id)).map(id=>o.lines.indexOf(id));
    assert.ok(stageOrder.every((v,i)=>i===0||v>stageOrder[i-1]),`the lines of the stages come in the order of the stages: ${stageOrder}`);
    for(const id of ['dlg_m01_021','dlg_m01_023','dlg_m01_024','dlg_m01_031','dlg_m01_144'])assert.ok(o.lines.includes(id)||o.sim.dialogueConsumed.includes(id),`${id} (reused) was said`);
    const order=ids=>ids.map(id=>o.lines.indexOf(id));
    const idx=order(['dlg_m01_021','dlg_m01_200','dlg_m01_024','dlg_m01_201']);assert.ok(idx.every((v,i)=>i===0||v>idx[i-1]),`the order of the stages: ${idx}`);
  }
  const speakers=Object.fromEntries(definition.dialogue.filter(l=>/^dlg_m01_20\d$/.test(l.id)).map(l=>[l.id,l.speaker]));
  assert.deepEqual(speakers,{dlg_m01_200:'pawel_krawiec',dlg_m01_201:'pawel_krawiec',dlg_m01_202:'sapper_2',dlg_m01_203:'pawel_krawiec',dlg_m01_204:'sapper_2',dlg_m01_205:'pawel_krawiec',dlg_m01_206:'sapper_3',dlg_m01_207:'pawel_krawiec'});
  for(const l of definition.dialogue.filter(l=>/^dlg_m01_20\d$/.test(l.id)))assert.match(l.note,/^PL: .+ \| 2026-10-24 \(R3-a, operação dos sapadores\): texto original escrito por agente de IA; polaco por rever por falante nativo\.$/,l.id);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const atStage=(id,fraction=.5)=>{
  const s=SAPPERS.byId[id],d=toRepair(driver(19390901)),{sim,step}=d;
  sim.landRound=()=>{};
  for(let i=0;i<20*300&&sapperPhase(sim).id!==id;i++)step({});
  assert.equal(sapperPhase(sim).id,id);
  for(let i=0;i<Math.round(20*s.sec*fraction)&&sapperPhase(sim).id===id;i++)step({});
  return d;
};

test('the bar moves only while the leader is at the place of the stage: he is sent away and it waits, he is back and it goes on',()=>{
  const {sim,step}=atStage('splice');
  const leader=sim.actor('pawel_krawiec'),before=sim.objectives.obj_m01_cover_repair.progress;
  Object.assign(leader,{x:leader.x+12,z:leader.z+3});leader.y=sim.world.heightAt(leader.x,leader.z);
  for(let i=0;i<10;i++)step({});
  assert.equal(sim.objectives.obj_m01_cover_repair.progress,before,'no work while the leader is away');
  for(let i=0;i<20*20&&dist(leader,SAPPERS.points.fault.slots.pawel_krawiec)>SAPPERS.arriveM;i++)step({});
  assert.ok(dist(leader,SAPPERS.points.fault.slots.pawel_krawiec)<=SAPPERS.arriveM,'he walked back to his place');
  for(let i=0;i<40;i++)step({});
  assert.ok(sim.objectives.obj_m01_cover_repair.progress>before,'the work goes on from where it stood');
  assert.equal(sapperPhase(sim).id,'splice','the same stage');
});

test('the walk to the second cut cannot end before the leader is there',()=>{
  const {sim,step}=atStage('relocate',.2);
  const leader=sim.actor('pawel_krawiec'),end=SAPPERS.byId.relocate.to;
  // held at the first cut for longer than the walk: the bar stops just short of the end of the walk, in the stage
  for(let i=0;i<20*30;i++){Object.assign(leader,{x:SAPPERS.points.fault.slots.pawel_krawiec.x,z:SAPPERS.points.fault.slots.pawel_krawiec.z});leader.target=null;step({});}
  assert.ok(sim.objectives.obj_m01_cover_repair.progress<end&&sim.objectives.obj_m01_cover_repair.progress>end-1e-3,`progress ${sim.objectives.obj_m01_cover_repair.progress} against ${end}`);
  assert.equal(sapperPhase(sim).id,'relocate');
  // released, he arrives and the stage ends
  for(let i=0;i<20*30&&sapperPhase(sim).id==='relocate';i++)step({});
  assert.equal(sapperPhase(sim).id,'inspect2');
  assert.ok(dist(leader,SAPPERS.points.second.slots.pawel_krawiec)<=SAPPERS.arriveM+.5);
});

test('a pin interrupts the stage and the whole crew goes down; the stage resumes where it left off; a bomb that shakes the working men interrupts it the same way',()=>{
  const {sim,step}=atStage('splice2');
  const p0=sim.objectives.obj_m01_cover_repair.progress;
  sim.timers.repairSuppressedUntil=sim.clock+4;for(const id of IDS)sim.actor(id).suppressedUntil=sim.clock+4;
  for(let i=0;i<20*3;i++)step({});
  assert.equal(sim.objectives.obj_m01_cover_repair.progress,p0,'nothing is done while they lie down');
  assert.ok(IDS.every(id=>sim.actor(id).posture==='prone'),'they are drawn prone');
  assert.match(sim.mission.status,/sapadores deitados/);
  for(let i=0;i<20*3;i++)step({});
  assert.ok(sim.objectives.obj_m01_cover_repair.progress>p0,'and back to work');assert.equal(sapperPhase(sim).id,'splice2');
  // a bomb: on the slope 25 m north-west of the team, the player far away
  const b=atStage('splice2',.3).sim,q=b.objectives.obj_m01_cover_repair.progress;
  b.player.x=-30;b.player.z=60;b.player.y=b.world.heightAt(-30,60);
  const target=b.world.point('repair_site_2');b.impact('test_bomb',{x:target.x-40,y:0,z:target.z+8},true);
  assert.ok(b.timers.repairSuppressedUntil>b.clock,'the bar is stopped');
  assert.ok(IDS.some(id=>b.actor(id).suppressedUntil>b.clock),'at least one of them is shaken');
  b.tick(.05,{});assert.equal(b.objectives.obj_m01_cover_repair.progress,q);
  for(let i=0;i<20*12;i++)b.tick(.05,{});assert.ok(b.objectives.obj_m01_cover_repair.progress>q,'resumed');
});

test('a shaken man makes for the nearest cover node within reach by his own decision, to the lee place of his role, and lies down behind it; the crew goes back to its places when the suppression ends',()=>{
  const sim=new M01Simulation(1);sim.tick(.05,{skip:true});
  // R3-a review (2026-10-25): each cut has a sandbag row of its own within reach (cv_cable_fault east of the fault, cv_cable_second east of the second cut: before, the nearest cover was 40 m away and the
  // run never happened) and each role a lee place of his own at it (SAPPERS.seek.lanes), so that three men do not lie on one spot.
  const nodeOf={fault:'cv_cable_fault',second:'cv_cable_second'};
  for(const point of ['fault','second']){
    const node=sim.world.coverNodes.find(c=>c.id===nodeOf[point]),spots=[];
    assert.ok(node&&sim.world.covers.some(c=>c.id===node.id),`${node?.id} is a cover node with a box (a collider)`);
    for(const id of IDS){
      const slot=SAPPERS.points[point].slots[id],lane=SAPPERS.seek.lanes[SAPPERS.roles[id]],spot=sapperCover(sim.world,{id,x:slot.x,z:slot.z});
      assert.ok(spot,`${id} at the ${point} has cover within reach`);
      assert.ok(Math.hypot(spot.x-(node.position[0]+lane[0]),spot.z-(node.position[2]+lane[1]))<1e-9,`${id} at the ${point}: the lee place of his role at ${node.id}`);
      assert.ok(dist(slot,spot)<=SAPPERS.seek.coverM,`${id}: a short run`);
      assert.equal(sapperCover(sim.world,{id,x:spot.x,z:spot.z}),null,'already behind it');
      spots.push(spot);
    }
    for(let i=0;i<spots.length;i++)for(let j=i+1;j<spots.length;j++)assert.ok(dist(spots[i],spots[j])>=.9,`${point}: three men, three spots`);
  }
  // a man without a role (no id) keeps the old place, the lee of the node at his own z: beside the squad post's sandbags the nearest cover is cv_squad_post (x -70, z 22), 1.1 m west
  const post=sapperCover(sim.world,{x:-74,z:19});assert.ok(post);assert.ok(Math.abs(post.x-(-71.1))<1e-9&&post.z>=20.5&&post.z<=23.5,JSON.stringify(post));
  assert.equal(sapperCover(sim.world,{...post}),null,'already behind it');
  // far from every box (the middle of the field) there is no cover within reach: he goes down where he is
  assert.equal(sapperCover(sim.world,{id:'pawel_krawiec',x:-200,z:30}),null);
  // on the route: the whole crew shaken at the fault in the splice makes for the sandbags, each to his place, running (not drawn prone on the way) and lies down there
  const {sim:s,step}=atStage('splice');
  const crew=IDS.map(id=>s.actor(id)),p0=s.objectives.obj_m01_cover_repair.progress;
  for(const a of crew)a.suppressedUntil=s.clock+6;s.timers.repairSuppressedUntil=s.clock+6;
  const ran=new Set();
  for(let i=0;i<20*3;i++){step({});for(const a of crew)if(a.coverRun&&a.state==='ADVANCE'&&a.posture!=='prone')ran.add(a.id);}
  assert.deepEqual([...ran].sort(),[...IDS].sort(),'each of them ran, upright');
  for(const a of crew){
    const lane=SAPPERS.seek.lanes[SAPPERS.roles[a.id]],node=s.world.coverNodes.find(c=>c.id==='cv_cable_fault');
    assert.ok(Math.hypot(a.x-(node.position[0]+lane[0]),a.z-(node.position[2]+lane[1]))<1,`${a.id} is behind the sandbags at (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`);
    assert.equal(a.posture,'prone',`${a.id} lies down there`);assert.equal(a.coverRun,undefined,'and has stopped running');
  }
  assert.equal(s.objectives.obj_m01_cover_repair.progress,p0,'no work while the leader is behind the sandbags');
  // when the suppression ends they go back to their places of the stage and the bar goes on
  for(let i=0;i<20*30&&!crew.every(a=>dist(a,SAPPERS.points.fault.slots[a.id])<=SAPPERS.arriveM);i++)step({});
  for(const a of crew)assert.ok(dist(a,SAPPERS.points.fault.slots[a.id])<=SAPPERS.arriveM,`${a.id} back at the cut`);
  for(let i=0;i<20*5;i++)step({});
  assert.ok(s.objectives.obj_m01_cover_repair.progress>p0,'the work goes on from where it stood');assert.equal(sapperPhase(s).id,'splice','the same stage');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('saves: one made in the middle of every phase validates, restores without being edited and continues identically to the original, and the stage is the same after the restore',()=>{
  const o=ctl();
  for(const id of ['locate','standby',...SAPPER_STAGE_IDS,'report','ready']){
    const raw=o.snaps[id];assert.ok(raw,`a save in ${id}`);
    const s=restoreFrom(raw);validateM01Snapshot(json(raw));
    assert.equal(sapperPhase(s).id,id,`the stage of the save is ${id} after the restore`);
    compareContinuation(s,{label:`sappers-${id}`,ticks:160,doubleAt:[1,80]});
  }
});

test('a save from before the operation: the bar at 35 % with the men at the old places lies in the right stage, they walk to their new places, and the mission goes on to its end',()=>{
  const o=ctl(),raw=json(o.snaps.splice);
  // an older build had the three at the second cut's old places, kneeling, each with the target of the walk it had given them
  const old=[[-120.7,10],[-122,11],[-123.2,10]];
  raw.objectives.obj_m01_cover_repair.progress=35;
  raw.actors.filter(a=>IDS.includes(a.id)).forEach((a,i)=>{Object.assign(a,{x:old[i][0],z:old[i][1],target:{x:-121.5-i*1.2,y:-2,z:10+(i%2)},crouched:true,state:'GUARD'});});
  validateM01Snapshot(json(raw));
  const s=restoreFrom(raw);
  assert.equal(sapperPhase(s).id,'splice');assert.equal(stageAtProgress(35).id,'splice');
  for(let i=0;i<20*10;i++)s.tick(.05,{});
  for(const id of IDS)assert.ok(dist(s.actor(id),SAPPERS.points.fault.slots[id])<=1.3,`${id} is at his new place`);
  // and the rest of the mission: the repair completes, then the route's own end (this tests the engine, so the player's route is the recorded one: just run the clock)
  for(let i=0;i<20*400&&!s.done('cover_repair');i++)s.tick(.05,{});
  assert.equal(s.done('cover_repair'),true);assert.equal(sapperPhase(s).id==='report'||sapperPhase(s).id==='ready',true);
  // a save from the walk to the shed: the old build had them lying prone at the old places, waiting for the box
  const wait=json(o.snaps.standby);wait.actors.filter(a=>IDS.includes(a.id)).forEach((a,i)=>{Object.assign(a,{x:old[i][0],z:old[i][1],target:{x:-121.5-i*1.2,y:-2,z:10+(i%2)},crouched:false,state:'GUARD',posture:'prone',postureSince:a.postureSince??0});});
  validateM01Snapshot(json(wait));const w=restoreFrom(wait);w.tick(.05,{});
  assert.ok(['locate','standby'].includes(sapperPhase(w).id));
  for(let i=0;i<20*8;i++)w.tick(.05,{});
  assert.equal(sapperPhase(w).id,'standby');for(const id of IDS)assert.ok(dist(w.actor(id),SAPPERS.points.fault.slots[id])<=1);
});

test('a legacy save at 0 %, at 100 % and in between maps to the first stage, the last stage and the stage the bar stands in',()=>{
  const o=ctl();
  for(const [p,id] of [[0,'inspect'],[9.4,'splice'],[44.1,'test'],[49,'fail'],[55,'relocate'],[60,'inspect2'],[80,'splice2'],[99,'test2']]){
    const raw=json(o.snaps.splice);raw.objectives.obj_m01_cover_repair.progress=p;validateM01Snapshot(json(raw));
    assert.equal(sapperPhase(restoreFrom(raw)).id,id,`${p} %`);
  }
});

test('the module is draw-free and clock-free: the operation uses no random stream and no wall clock (the golden digests of the pre-operation minutes would be untouched)',()=>{
  const source=readFileSync(new URL('../src/game/m01-sappers.js',import.meta.url),'utf8');
  assert.ok(!/\brng\b|Math\.random|Date\.now|performance\.now|new Date/.test(source));
  assert.ok(SAPPER_PHASES.includes('verify_west'));
});
