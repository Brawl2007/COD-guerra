// M01 sapper operation (R3-a, 2026-10-24; golden amendment 19). Owner complaint: «os sapadores parecem homens a picar o chão repetidamente, sem trabalho visível». Until now the
// cable repair was one bar: the three sappers walked to the second cut, lay prone until the player brought the box, knelt in one pose for 150 s of work and lay prone again. Now the
// team carries out a staged technical operation that the player can follow and that has consequences in the simulation:
//   camp      at the crater (repair site 1), kneeling at the cut cable, until the player calls them (find_sappers);
//   locate    they follow the cable line to the cut (repair site 2) at a searching pace, and stop at the fault;
//   standby   they wait there for the box (the player is fetching it);
//   inspect, splice, test, fail, relocate, inspect2, splice2, test2   the stages of obj_m01_cover_repair (mission.json grp_sappers.operation.stages): the cut at site 2 is examined and
//             spliced, the line is tested and gives no passage (one failure, deterministic: the second cut, 16 m along the cable to the west, is still open), the team follows the cable to
//             the second cut, examines it, splices it, and the last test gives passage;
//   report    the line is whole (evt_m01_repair_complete): the leader calls the officer;
//   ready     they wait for the order of 05:30 and for the retreat; verify / verify_west   they look at the result of the 06:10 and the 06:45 blasts before they go on.
// HISTORICAL_RESEARCH.md §79: the game shows no connections, charges or procedures, only the damaged line and the sappers' abstract work; every action here is generic
// (examine, splice, test the continuity, report).
// Nothing here is saved and nothing draws from a random stream: the phase is a pure function of the objective states, the progress of obj_m01_cover_repair (the old 0-100 bar, so a save
// made before this module existed loads mid-repair and falls into the right stage), the times of the consumed events, the clock and the places of the men. The renderer reads the same
// phase (sim.sapperOps) to choose each man's pose and what is on the ground; it decides nothing.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import mapLayout from '../../missions/m01-tczew/map-layout.json' with { type: 'json' };

const E=name=>`evt_m01_${name}`;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Seconds of work without suppression the repair takes. With 75 s the crate delivered at about 04:42 left two thirds of the repair done before train 963 (04:45) and no fire could interrupt it; with 150 s it runs under fire. */
export const REPAIR_WORK_SEC=150;
/** The stages of obj_m01_cover_repair, in order, and the phases around them. */
export const SAPPER_STAGE_IDS=Object.freeze(['inspect','splice','test','fail','relocate','inspect2','splice2','test2']);
export const SAPPER_PHASES=Object.freeze(['camp','locate','standby',...SAPPER_STAGE_IDS,'report','ready','verify','verify_west','retreat']);

/** Distance from p to the segment ab, on the ground plane. */
export function segmentDistance(p,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=l2>0?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2)):0;
  return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
}
const polylineDistance=(p,pts)=>{let best=Infinity;for(let i=1;i<pts.length;i++)best=Math.min(best,segmentDistance(p,{x:pts[i-1][0],z:pts[i-1][1]},{x:pts[i][0],z:pts[i][1]}));return best;};

/**
 * The operation as mission data (grp_sappers.operation), validated when the module loads: a typo or a stage that does not add up stops the game, like the combat data.
 * Returns the frozen plan with the stages' windows in work seconds (`start`, `end`) and in objective progress (`from`, `to`, 0-100).
 */
export function sapperOperationPlan(def=definition){
  const fail=m=>{throw new Error(`M01 sapper operation: ${m}`);},group=def.groups.find(g=>g.id==='grp_sappers'),op=group?.operation;
  if(!op)fail('grp_sappers.operation is missing');
  const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const members=group.members;
  if(op.classification!=='GAMEPLAY_DRAMATIZATION')fail('classification');
  if(!num(op.arriveM,1,4))fail('arriveM 1-4 m');
  if(!num(op.locate?.speed,.8,3.6))fail('locate.speed 0.8-3.6 m/s');
  if(!num(op.seek?.coverM,0,20)||!num(op.seek?.speed,1,6))fail('seek.coverM 0-20 m, seek.speed 1-6 m/s');
  if(!num(op.verify?.sec,2,20)||!num(op.report?.sec,2,20))fail('verify.sec / report.sec 2-20 s');
  const roles=op.roles;
  if(!roles||Object.keys(roles).length!==members.length||members.some(id=>!['leader','helper','watch'].includes(roles[id]))||
    ['leader','helper','watch'].some(r=>members.filter(id=>roles[id]===r).length!==1))fail('roles: one leader, one helper and one watch, the members of the group');
  const leader=members.find(id=>roles[id]==='leader'),helper=members.find(id=>roles[id]==='helper'),watch=members.find(id=>roles[id]==='watch');
  const cable=op.cable;
  if(!Array.isArray(cable)||cable.length<4||!cable.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=-300&&p[0]<=0))fail('cable: at least 4 [x, z] points in x -300..0');
  for(let i=1;i<cable.length;i++){const d=Math.hypot(cable[i][0]-cable[i-1][0],cable[i][1]-cable[i-1][1]);if(!(d>=1&&d<=60))fail('cable: points 1-60 m apart');}
  const points={};
  for(const name of ['crater','fault','second']){
    const p=op.points?.[name];
    if(!p||!num(p.x,-300,0)||!num(p.z,-40,60)||!num(p.gapM,.4,4))fail(`points.${name}: x, z, gapM`);
    if(polylineDistance(p,cable)>.2)fail(`points.${name} is not on the cable`);
    let slots=null;
    if(name!=='crater'){
      slots={};
      for(const id of members){
        const s=p.slots?.[id];
        if(!Array.isArray(s)||s.length!==3||!s.every(Number.isFinite))fail(`points.${name}.slots.${id}: [x, z, facing]`);
        if(Math.hypot(s[0]-p.x,s[1]-p.z)>6)fail(`points.${name}.slots.${id} is more than 6 m from the point`);
        slots[id]=Object.freeze({x:s[0],z:s[1],facing:s[2]});
      }
      for(const a of members)for(const b of members)if(a<b&&dist(slots[a],slots[b])<.9)fail(`points.${name}: ${a} and ${b} closer than 0.9 m`);
    }
    points[name]=Object.freeze({x:p.x,z:p.z,gapM:p.gapM,slots:slots&&Object.freeze(slots)});
  }
  if(!(points.second.x<points.fault.x-5)||!(points.fault.x<points.crater.x-30))fail('points: the crater east of the fault, the second cut west of the fault');
  const stages=op.stages;
  if(!Array.isArray(stages)||stages.length!==SAPPER_STAGE_IDS.length||stages.some((s,i)=>s.id!==SAPPER_STAGE_IDS[i]))fail(`stages: exactly ${SAPPER_STAGE_IDS.join(', ')}, in that order`);
  let t=0;const out=[];
  for(const s of stages){
    if(!['fault','second'].includes(s.at)||!num(s.sec,1,120)||typeof s.text!=='string'||!s.text||(s.result!==undefined&&!['fail','pass'].includes(s.result)))fail(`stage ${s.id}`);
    if(s.id==='relocate'){
      if(s.from!=='fault'||s.at!=='second'||!num(s.speed,.8,3.6))fail('relocate: from the fault to the second cut, speed 0.8-3.6 m/s');
      if(s.sec*s.speed<dist(points.fault,points.second)*1.05)fail('relocate: the walk does not fit in its seconds');
    }else if(s.from!==undefined||s.speed!==undefined)fail(`stage ${s.id}: only relocate has a from and a speed`);
    out.push(Object.freeze({...s,start:t,end:t+s.sec,from:100*t/REPAIR_WORK_SEC,to:100*(t+s.sec)/REPAIR_WORK_SEC,index:out.length}));t+=s.sec;
  }
  if(Math.abs(t-REPAIR_WORK_SEC)>1e-9)fail(`the stages add up to ${t} s, not REPAIR_WORK_SEC ${REPAIR_WORK_SEC} s`);
  const results=out.filter(s=>s.result);
  if(results.length!==2||results[0].id!=='fail'||results[1].id!=='test2'||results[0].result!=='fail'||results[1].result!=='pass')fail('one failed test (fail), then the last test (test2) passes');
  const r=out.findIndex(s=>s.id==='relocate');
  if(!out.slice(0,r).every(s=>s.at==='fault')||!out.slice(r).every(s=>s.at==='second'))fail('the stages at the fault come before the walk, those at the second cut from the walk on');
  for(const key of ['locate','standby','report','ready'])if(typeof op.text?.[key]!=='string'||!op.text[key])fail(`text.${key}`);
  const known=new Set(mapLayout.features.map(f=>f.id));
  if(!known.has('ignition_line')||!known.has('repair_site_1')||!known.has('repair_site_2'))fail('map feature ignition_line / repair sites');
  return Object.freeze({members:Object.freeze([...members]),roles:Object.freeze({...roles}),leader,helper,watch,arriveM:op.arriveM,locateSpeed:op.locate.speed,
    seek:Object.freeze({...op.seek}),verifySec:op.verify.sec,reportSec:op.report.sec,cable:Object.freeze(cable.map(p=>Object.freeze([...p]))),points:Object.freeze(points),
    stages:Object.freeze(out),text:Object.freeze({...op.text}),byId:Object.freeze(Object.fromEntries(out.map(s=>[s.id,s]))),relocateIndex:r});
}
export const SAPPERS=sapperOperationPlan();

const slotOf=(point,id)=>SAPPERS.points[point].slots[id];
/** The stage that the old 0-100 progress bar stands in: a pure function, so a save made before this module existed, at 35 %, is in `splice` and a new one at 35 % is too. */
export function stageAtProgress(progress){
  const w=Math.max(0,Math.min(REPAIR_WORK_SEC,progress/100*REPAIR_WORK_SEC));
  let i=SAPPERS.stages.length-1;while(i>0&&w<SAPPERS.stages[i].start-1e-9)i--;
  return SAPPERS.stages[i];
}
const leaderOf=sim=>{const a=sim.actor(SAPPERS.leader);return a&&a.alive&&a.active?a:null;};
/** The leader stands in the work area of his slot at `point` (SAPPERS.arriveM): the gate of every work stage and of the end of the walk. True if there is no leader to wait for. */
export function leaderAt(sim,point){
  const a=leaderOf(sim);
  return !a||dist(a,slotOf(point,SAPPERS.leader))<=SAPPERS.arriveM;
}
const fixed=(id,extra={})=>Object.freeze({id,...extra});
const CAMP=fixed('camp'),RETREAT=fixed('retreat');

/**
 * The phase of the operation now: {id, stage, t, work}. `stage` is the record of SAPPERS.stages during obj_m01_cover_repair, `t` the seconds into the phase (of work for a stage, of the clock for the
 * others) and `work` the work seconds done (0-REPAIR_WORK_SEC).
 */
export function sapperPhase(sim){
  if(!sim.sappersCalled())return CAMP;
  const repair=sim.objectives.obj_m01_cover_repair;
  if(sim.active('cover_repair')){
    const stage=stageAtProgress(repair.progress),work=repair.progress/100*REPAIR_WORK_SEC;
    return {id:stage.id,stage,t:Math.max(0,work-stage.start),work};
  }
  if(sim.active('fetch_material'))return fixed(leaderOf(sim)&&leaderAt(sim,'fault')?'standby':'locate',{t:0,work:0});
  if(!sim.done('cover_repair'))return CAMP;
  const c=sim.consumed,age=name=>c[E(name)]===undefined?Infinity:sim.clock-c[E(name)];
  if(age('west_demolition')<SAPPERS.verifySec)return fixed('verify_west',{t:age('west_demolition'),work:REPAIR_WORK_SEC});
  if(c[E('east_demolition')]!==undefined)return age('east_demolition')<SAPPERS.verifySec?fixed('verify',{t:age('east_demolition'),work:REPAIR_WORK_SEC}):RETREAT;
  return age('repair_complete')<SAPPERS.reportSec?fixed('report',{t:age('repair_complete'),work:REPAIR_WORK_SEC}):fixed('ready',{t:age('repair_complete'),work:REPAIR_WORK_SEC});
}

const faceToward=(from,to)=>Math.atan2(to.z-from.z,to.x-from.x);
/**
 * What one sapper does in this phase: {mode:'none'} (the old behaviour: the camp and the retreat), {mode:'walk', target, speed} (a stage on the move), {mode:'hold', slot, crouched, face}
 * (he stands or kneels at his slot, facing `face` or the slot's own facing) or {mode:'free', face} (he stays where he is, standing, and looks at `face`: the blasts). Pure: the simulation walks him.
 */
export function sapperGoal(sim,a,ph){
  const id=ph.id,role=SAPPERS.roles[a.id];
  if(id==='camp'||id==='retreat'||!role)return {mode:'none'};
  if(id==='locate')return {mode:'walk',target:slotOf('fault',a.id),speed:SAPPERS.locateSpeed,crouched:false};
  if(id==='relocate')return {mode:'walk',target:slotOf('second',a.id),speed:ph.stage.speed,crouched:false};
  if(id==='verify'||id==='verify_west')return {mode:'free',face:0,crouched:false};   // east, to the bridge; each man stays where he is and the retreat resumes after
  if(id==='standby'){const slot=slotOf('fault',a.id);return {mode:'hold',slot,crouched:role!=='helper',face:null};}
  const slot=slotOf(ph.stage?ph.stage.at:'second',a.id);
  if(id==='report'){
    const officer=sim.actor('marek_zielinski');
    return {mode:'hold',slot,crouched:false,face:role==='leader'&&officer?faceToward(slot,officer):role==='helper'?Math.PI:null};
  }
  if(id==='ready')return {mode:'hold',slot,crouched:role==='leader',face:role==='helper'?Math.PI:role==='watch'?0:null};
  // the work stages: all kneel; at the end of the first test the leader stands and looks along the cable to the second cut
  if(id==='fail')return {mode:'hold',slot,crouched:role!=='leader',face:role==='leader'?Math.PI:null};
  return {mode:'hold',slot,crouched:true,face:null};
}

/**
 * May the repair progress now? {works, cap}: the leader must stand at the work point of the stage (or be walking, in `relocate`); `cap` keeps the walk from ending before it has. Suppression is not read
 * here: a pin (landRound) and a bomb that shakes the working men (bombEffects) both set timers.repairSuppressedUntil, which stops the bar and is the one gate the simulation always had.
 */
export function sapperRate(sim,ph){
  const L=leaderOf(sim);
  if(!L||!ph.stage)return {works:true,cap:100};
  const s=ph.stage;
  if(s.id==='relocate')return {works:true,cap:leaderAt(sim,'second')?100:s.to-1e-6};
  return {works:leaderAt(sim,s.at),cap:100};
}

/** Distance from a man to the line the team works along, between the two cuts: the old «within 6 m of repair site 2» of the pin rule, now for both cuts and the walk between them. */
export const workDistance=a=>segmentDistance(a,SAPPERS.points.second,SAPPERS.points.fault);

/** The cover a suppressed sapper makes for by his own decision: the nearest cover node that has a box (not a window, a corner or a vehicle) within SAPPERS.seek.coverM, on its lee (west) side; null if there is none or he is behind it already. */
export function sapperCover(world,a){
  let node=null,best=SAPPERS.seek.coverM;
  for(const c of world.coverNodes){
    if(c.partial||['WINDOW','WALL_CORNER','BUILDING_CORNER','VEHICLE'].includes(c.type))continue;
    const d=Math.hypot(a.x-c.position[0],a.z-c.position[2]);
    if(d<best){best=d;node=c;}
  }
  if(!node)return null;
  const spot={x:node.position[0]-1.1,z:node.position[2]+Math.max(-1.2,Math.min(1.2,a.z-node.position[2]))};
  return dist(a,spot)<.9?null:spot;   // moveActor stops a walker 0.8 m short of his target: that is behind it
}

const capital=t=>t.charAt(0).toUpperCase()+t.slice(1);
/** The text for the phase (the HUD's status line while the sappers search, wait or work; the pinned line is the simulation's own). */
export const sapperText=ph=>ph.stage?ph.stage.text:SAPPERS.text[ph.id]??'';
export const sapperStatusLine=ph=>{const t=sapperText(ph);return t?capital(t):'';};

/**
 * The read-only view the renderer, the HUD and the tests use (never saved): the phase, which cut is open, what lies on the ground and in whose hands. A gap is `none` before the bomb
 * has cut the cable, `open` until its splice is done and `closed` after (the crater is patched when the team leaves it). The tester shows nothing until the first test and no passage until the last.
 */
export function sapperView(sim){
  const ph=sapperPhase(sim),cut=sim.consumedEvent(E('cable_cut')),stage=ph.stage??null,work=ph.work??0,repaired=sim.done('cover_repair');
  const gaps={
    crater:cut?(sim.sappersCalled()?'closed':'open'):'none',
    fault:cut?((stage?work>=SAPPERS.byId.test.start:repaired)?'closed':'open'):'none',
    second:cut?((stage?work>=SAPPERS.byId.test2.start:repaired)?'closed':'open'):'none'};
  // The box: on the ground at the fault from the delivery to the walk, in the helper's hands during the walk, on the ground at the second cut after it.
  const delivered=sim.done('fetch_material')||sim.active('cover_repair')||repaired;
  const box=!delivered?{state:'none'}:ph.id==='relocate'?{state:'carried',carrier:SAPPERS.helper}:
    {state:'ground',point:(stage?stage.at==='second':repaired)?'second':'fault'};
  const lamp=stage&&['test','fail','test2'].includes(stage.id)?{on:true,result:stage.id==='fail'?'fail':stage.id==='test2'&&ph.t>=stage.sec-.05?'pass':null}:{on:false,result:repaired?'pass':null};
  return {phase:ph.id,stage:stage?.id??null,stageIndex:stage?stage.index:-1,t:ph.t??0,work,stageSec:stage?.sec??0,
    point:stage?.at??(ph.id==='locate'||ph.id==='standby'?'fault':ph.id==='camp'?'crater':'second'),gaps,box,lamp,leader:SAPPERS.leader,roles:SAPPERS.roles,
    interrupted:sim.clock<sim.timers.repairSuppressedUntil,text:sapperText(ph)};
}
