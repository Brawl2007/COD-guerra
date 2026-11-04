import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arch} from 'node:os';
import {M01AreaSimulation,AREA_ACTS,AREA_SAVE_SCHEMA,PROFILE_DEFAULTS,areaActPlan,areaPlanOf,areaRoster,debriefChain,debriefWith,defaultCarry,makeProfile,validateAreaSnapshot} from '../src/game/m01-area-sim.js';
import {M01ActRunner,ACTS,actOf,carryFrom,nextSeed,validateCarry} from '../src/game/m01-acts.js';
import {BOMB_BLAST,CONCUSSION,blastOutcome,concussionLevel} from '../src/game/m01-blast.js';
import {SHELL_BLAST,SHELL_REACH_M,PLANNED_IMPACT_M,SAFE_IMPACT_M,barrageNext,barrageSeed,landingPoint,makeBarragePlan,makeMedicPlan,pickShellPoint,shellOutcome,shellProtection} from '../src/game/m01-shell-blast.js';
import {pairUnit,unitHash} from '../src/game/m01-unit-hash.js';
import {M01AreaWorld} from '../src/world/m01-area-world.js';
import * as THREE from 'three';
import {M01AreaDressing} from '../src/render/m01-area-dressing.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {lightingModel,phaseAt,sunState} from '../src/render/m01-lighting.js';
import {areaClippingAudit} from './helpers/m01-act-audit.js';
import {stackingAudit} from './helpers/m01-clipping.js';
import {actRoute} from './helpers/m01-act-route.js';
import {ACT_B_TICK,actBControls,actBRoute} from './helpers/m01-act-b-route.js';
import {ACT_B_GOLDEN_FIXTURE,actBGoldenText} from './helpers/m01-act-b-golden.js';
import act from '../missions/m01-tczew/areas/np/act-vii-b.json' with {type:'json'};
import actA from '../missions/m01-tczew/areas/np/act.json' with {type:'json'};
import layout from '../missions/m01-tczew/areas/np/layout.json' with {type:'json'};
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};

// R4 INC-2 (2026-11-04): Act VII-b «Norte, durante o dia» (docs/direction/M01_R4_VII_BC_DESIGN.md §2, features F1-F5, F8 in part, F9). Not a playtest: deterministic checks of its data, its shells, its
// barrages, its stretcher-bearers, its saves, its text and its chain with VII-a. The routes (pilots x levels x seeds) are in tests/m01-act-vii-b-routes.test.js.
const ID='act_vii_b_north_day',strip=s=>JSON.parse(JSON.stringify(s));
const newSim=(seed=19390901,difficulty='soldado')=>new M01AreaSimulation(seed,{difficulty,actId:ID});
const BAND=act.barrages[0].band;
/** A save made at this very moment (the live snapshot, with the checkpoint it resumes inside it), in the schema 3 envelope: what the browser spec stores. runner.envelope(sim) is the last CHECKPOINT. */
const live=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});

/** Past the entry card, at the west post with a full reserve: the resupply objective is done, barrage 1 has begun (its first shell is in the air). The caller may then move the player. */
function atWestPost(sim){
  for(let i=0;i<40&&sim.scene;i++)sim.tick(ACT_B_TICK,{skip:true});   // the card can be skipped after 0.6 s
  assert.equal(sim.scene,null);
  Object.assign(sim.player,{x:sim.plan.points.west_post.x,z:sim.plan.points.west_post.z,crouched:true});sim.weapon.reserve=sim.plan.act.resupply.reserveTo;
  sim.tick(ACT_B_TICK,{});sim.tick(ACT_B_TICK,{});   // the objective is done at the end of the first, the barrage begins in the second
  assert.ok(sim.timers.barrage.run,'barrage 1 is on');sim.drainEvents();return sim;
}
function tickUntil(sim,done,max=40000,controls={}){for(let i=0;i<max&&!done(sim);i++){sim.tick(ACT_B_TICK,controls);sim.drainEvents();}return done(sim);}

test('the data of VII-b: a valid plan of two attacks, two barrages, two stretcher-bearers, CP-I and CP-I2 by data, every German path clear of covers, wreck and parapet',()=>{
  const plan=areaActPlan(ID);
  assert.equal(plan.actId,ID);assert.equal(AREA_ACTS[ID].layout,layout,'the same slice as VII-a: layout.json is not changed');
  assert.deepEqual(plan.assault.echelons.map(e=>[e.id,e.men.length,e.overwatch.length,e.checkpoint]),[['first',15,3,null],['second',16,2,null]],'two attacks; no echelon checkpoint: the checkpoints are data triggers');
  assert.equal(plan.assault.men.length,36);assert.equal(plan.line.men.length,7);
  assert.ok(plan.assault.echelons[1].lullSec>=20&&plan.assault.echelons[1].lullSec<=30,'a short pause: 30 s at most');
  assert.equal(act.events.find(e=>e.id==='evt_npb_wave_2').trigger.lullSec,plan.assault.echelons[1].lullSec,'the event that documents the pause says the pause the data has');
  assert.equal(plan.waveAt,null);assert.deepEqual(plan.waveTrigger,{type:'barrageEnd',barrage:'brg_npb_1',afterSec:6});
  assert.deepEqual(plan.barrages.barrages.map(b=>[b.id,b.impacts,b.durationSec,b.warnSec,b.spec]),[['brg_npb_1',12,46,1.5,'SHELL_BLAST'],['brg_npb_2',6,20,1.5,'SHELL_BLAST']]);
  assert.equal(plan.barrages.barrages[0].from,'obj_npb_resupply');assert.deepEqual(plan.barrages.barrages[1].from,{echelonBroken:0,afterSec:20});
  assert.deepEqual(plan.barrages.barrages[0].casualty,{impact:4,near:'pl_np_3',offsetM:[1.5,-3]});
  assert.deepEqual(plan.medics.ids,['np_maqueiro_0','np_maqueiro_1']);assert.equal(plan.medics.maxCasualties,2);
  assert.deepEqual(plan.triggers,[{id:'cp_npb_i2_pausa',type:'echelonBroken',echelon:0}],'CP-I2 is taken when the first attack breaks');
  assert.deepEqual(act.checkpoints.map(c=>[c.id,c.label]),[['cp_npb_i_dia','CP-I'],['cp_npb_i2_pausa','CP-I2']]);assert.deepEqual(act.checkpoints[0].trigger,{type:'sceneEnd',scene:'cs_npb_entry'});
  assert.equal(areaRoster(plan).length,3+7+2+36+2,'the roster: the section, the line, the ckm crew, the Germans, the bearers');
  assert.deepEqual(areaRoster(plan).slice(-2),plan.medics.ids);
  // the slice and the debrief anchor are VII-a's; the clock is the day's
  assert.equal(plan.clockStart,13*3600);assert.equal(act.clock.label,'DURANTE O DIA');assert.deepEqual(act.clock.sun.keyframes,[{clock:'13:00',altitudeDeg:42.1,azimuthDeg:205}]);
  for(const b of plan.barrages.barrages)assert.ok(b.band.minX>=layout.bounds.playable.minX&&b.band.maxX<=layout.bounds.playable.maxX&&b.band.minZ>=layout.bounds.playable.minZ&&b.band.maxZ<=layout.bounds.playable.maxZ,`${b.id}: inside the slice`);
  // the first attack stands in the field when the act opens (as the first echelon of VII-a); the second waits off the field
  const sim=newSim();assert.ok(sim.enemies.filter(a=>sim.man(a).echelon===0).every(a=>a.active===(sim.man(a).role!=='x')));
  assert.ok(sim.enemies.filter(a=>sim.man(a).echelon===1).every(a=>!a.active));
  assert.deepEqual(sim.actors.filter(a=>a.group==='grp_np_medics').map(a=>[a.id,a.active,a.role,a.essential]),[['np_maqueiro_0',false,'MEDIC',true],['np_maqueiro_1',false,'MEDIC',true]]);
});

test('F1: VII-a keeps the names it had in the code as the defaults of the profile; VII-b names its own; a typo in the profile stops the game',()=>{
  const a=areaActPlan('act_vii_a_north');
  assert.deepEqual({...a.profile},{label:'VII-a',phasePrefix:'NP',flagPrefix:'m01np',markerLabel:'Parapeito norte',marker:'trench_post',entryCard:'cs_np_entry',endCard:'cs_np_end',arrivalObjective:'obj_np_reach_trench',
    holdObjective:'obj_np_hold_north',coverObjective:null,cardEndEvent:'evt_np_card_end',waveEvent:'evt_np_wave',arrivalCheckpoint:'cp_np_e_perimetro',statusLabel:'Linha norte',repelledText:'Ataque repelido',ordinals:true,arrivalNeedsReserve:false});
  assert.equal(actA.profile,undefined,'VII-a\'s data carries no profile: the omissions are the defaults');assert.equal(a.barrages,null);assert.equal(a.medics,null);assert.deepEqual(a.triggers,[]);assert.equal(a.waveTrigger.type,'battleClock');
  const sa=new M01AreaSimulation(),sb=newSim();
  assert.deepEqual(Object.keys(sa.timers).sort(),['boundary','boundaryCountdown','burstWound','endAt','lastHitAt','playerPinnedAt','said','squad','wave'],'a VII-a save has none of the new records');
  assert.deepEqual(Object.keys(sb.timers).filter(k=>k==='barrage'||k==='medics').sort(),['barrage','medics']);
  assert.equal(sa.mission.phase,'NP_ENTRY');assert.equal(sb.mission.phase,'NPB_ENTRY');assert.equal(sa.flags['m01np.wave'],'pending');assert.equal(sb.flags['m01npb.wave'],'pending');assert.equal(sb.flags['m01np.wave'],undefined);
  assert.equal(sb.clockLabel,'DURANTE O DIA');assert.equal(sb.scene.id,'cs_npb_entry');assert.equal(sb.plan.profile.arrivalObjective,'obj_npb_resupply');
  const bad=(mutate,re)=>{const x=strip(act);mutate(x);assert.throws(()=>makeProfile(x,layout),re);};
  bad(x=>{x.profile.phasePrefx='NPB';},/unknown key phasePrefx/);bad(x=>{x.profile.entryCard='cs_npb_other';},/entryCard \/ endCard must be the ids/);
  bad(x=>{x.profile.arrivalObjective='obj_npb_nothing';},/arrivalObjective \/ holdObjective \/ coverObjective/);bad(x=>{x.profile.flagPrefix='m01x';},/phasePrefix \(capitals\) \/ flagPrefix/);
  bad(x=>{x.profile.waveEvent='evt_nothing';},/waveEvent must be an event/);bad(x=>{x.profile.arrivalCheckpoint='cp_nothing';},/arrivalCheckpoint must be a checkpoint/);
  bad(x=>{x.profile.marker='nowhere';},/marker must be a point/);bad(x=>{x.profile.ordinals='no';},/ordinals: true or false/);bad(x=>{x.profile.coverObjective='';},/coverObjective/);
  assert.ok(makeProfile(strip(act),layout));assert.deepEqual(Object.keys(PROFILE_DEFAULTS).filter(k=>!(k in act.profile)).sort(),['repelledText']);
});

test('F3: a shell is the bomb\'s arithmetic with a shell\'s radii (shellOutcome with the bomb\'s spec IS blastOutcome); cover and posture save a man who would die standing; the protected are only shaken',()=>{
  let n=0;
  for(const distance of [0,3,6,11.9,12.1,18,23.9,24.1,35,49.9,50.1,80])for(const covered of [false,true])for(const posture of ['stand','crouch','prone'])for(const protectedBy of [null,'cast'])for(const u of [0,.25,.5,.75,1]){
    assert.deepEqual(shellOutcome({distance,covered,posture,protectedBy,u,spec:BOMB_BLAST}),blastOutcome({distance,covered,posture,protectedBy,u}),`${distance} ${covered} ${posture} ${protectedBy} ${u}`);n++;
  }
  assert.equal(n,720);
  const at=(d,o={})=>shellOutcome({distance:d,covered:false,posture:'stand',...o}).outcome;
  assert.deepEqual([2,3.5,5,8,12,19,25].map(d=>at(d)),['kill','kill','wound','wound','suppress','suppress','none'],'a man in the open: killed within 4 m, hurt to 9 m, shaken to 20 m');
  // the man sheltered where a man standing dies: 3 m from the crater, kneeling behind the parapet (the blast does not see him)
  assert.equal(at(3),'kill');assert.equal(shellOutcome({distance:3,covered:true,posture:'crouch'}).outcome,'wound');assert.equal(shellOutcome({distance:3,covered:true,posture:'prone'}).outcome,'wound');
  const wounded=shellOutcome({distance:3.2,covered:true,posture:'crouch',u:.5});assert.equal(wounded.outcome,'wound');assert.ok(wounded.healthLoss>SHELL_BLAST.woundLoss[1]-1e-9&&wounded.healthLoss<SHELL_BLAST.woundLoss[0]);
  // the cast, the ckm crew and the bearers are only shaken, at the strongest shake
  const p=shellOutcome({distance:2,covered:false,posture:'stand',protectedBy:'cast'});assert.equal(p.outcome,'suppress');assert.equal(p.healthLoss,0);assert.equal(p.suppressSec,SHELL_BLAST.suppressSec[1]);
  assert.equal(shellProtection({essential:true,role:'SUPPORT'}),'cast');assert.equal(shellProtection({role:'MEDIC'}),'medic');assert.equal(shellProtection({role:'RIFLEMAN'}),null);assert.equal(shellProtection({role:'RIFLEMAN',carriedBy:'np_maqueiro_0'}),'carried');
  assert.equal(SHELL_REACH_M,Math.ceil(SHELL_BLAST.shakenM/(1-SHELL_BLAST.jitter)));assert.ok(SHELL_BLAST.lethalM<BOMB_BLAST.lethalM&&SHELL_BLAST.shakenM<BOMB_BLAST.shakenM,'a shell is smaller than a bomb');
});

test('F3: the place of a shell: planned at least 42 m from the player inside the band, never nearer than 30 m at the landing; the pair hash is uniform over sequential ids',()=>{
  assert.equal(SAFE_IMPACT_M,30);assert.ok(PLANNED_IMPACT_M>=SAFE_IMPACT_M+9,'what he can run in the warning (6 m/s for 1.5 s) is inside the margin');
  const rec={rng:barrageSeed(19390901,0)},next=()=>barrageNext(rec);let worst=Infinity;
  for(const [px,pz] of [[-505,-1159],[-440,-1185],[-420,-1250],[-330,-1120],[-560,-1250],[-320,-1120],[-440,-1135],[-480,-1200]])for(let i=0;i<300;i++){
    const q=pickShellPoint(next,BAND,{x:px,z:pz});worst=Math.min(worst,Math.hypot(q.x-px,q.z-pz));
    assert.ok(q.x>=BAND.minX&&q.x<=BAND.maxX&&q.z>=BAND.minZ&&q.z<=BAND.maxZ,'inside the band');
  }
  assert.ok(worst>=PLANNED_IMPACT_M-1e-9,`planned at least ${PLANNED_IMPACT_M} m away: ${worst}`);
  // a player who has moved onto the planned point (a jump) is not under the shell: it lands 40 m away on the same bearing
  const planned={x:-440,z:-1185};
  for(const [dx,dz] of [[0,0],[3,0],[0,-10],[-20,15],[29,0]]){const player={x:planned.x+dx,z:planned.z+dz},L=landingPoint(planned,player);
    assert.ok(Math.hypot(L.x-player.x,L.z-player.z)>=SAFE_IMPACT_M-1e-9,'30 m at the landing');assert.equal(L.shifted,true);}
  assert.deepEqual(landingPoint(planned,{x:planned.x+30,z:planned.z}),{x:planned.x,z:planned.z,shifted:false});
  // the hash: a number in [0, 1), the same for the same text, uniform over ids that differ in the last digits (act 1's blastJitter is not)
  assert.equal(unitHash('a|b'),unitHash('a|b'));assert.ok(unitHash('a|b')>=0&&unitHash('a|b')<1);
  for(const man of ['pl_np_0','pl_np_3','pl_np_5']){
    const bins=Array(10).fill(0);for(let k=0;k<3000;k++)bins[Math.floor(pairUnit(man,`np_round_${k}`)*10)]++;
    assert.ok(bins.every(c=>c>=230&&c<=370),`${man}: ${bins}`);
  }
});

test('F3/F5: the plans of barrages and bearers refuse what is not a plan (a typo stops the game instead of changing it)',()=>{
  const ctx={playable:layout.bounds.playable,objectives:act.objectives.map(o=>o.id),echelons:2,line:['pl_np_0','pl_np_3']};
  const build=(mutate,c=ctx)=>{const b=strip(act.barrages);mutate(b);return makeBarragePlan(b,c);};
  assert.ok(build(()=>{}));
  const cases=[
    ['barrages empty',b=>{b.length=0;},/non-empty array/],['id not a barrage id',b=>{b[0].id='shell_1';},/id \(brg_/],['two with one id',b=>{b[1].id=b[0].id;},/id \(brg_/],
    ['a stray key',b=>{b[0].caliber=1;},/unknown key caliber/],['from an objective that is not the act\'s',b=>{b[0].from='obj_x';},/not an objective of the act/],
    ['from an echelon that nobody follows',b=>{b[1].from={echelonBroken:1,afterSec:5};},/from \(an objective id, or \{echelonBroken/],['from with a stray key',b=>{b[1].from.when=1;},/from \(an objective id/],
    ['no time to land them',b=>{b[0].impacts=30;},/do not fit in/],['impacts a fraction',b=>{b[0].impacts=2.5;},/impacts 1-40/],['intervals the wrong way round',b=>{b[0].intervalSec=[5,2.5];},/intervalSec \[lo, hi\]/],
    ['no warning',b=>{delete b[0].warnSec;},/warnSec 0.5-4/],['a spec that does not exist',b=>{b[0].spec='SHELL_150';},/spec SHELL_150/],['a band outside the slice',b=>{b[0].band.minX=-700;},/band \{minX/],
    ['a band too small to be safe',b=>{b[0].band={minX:-440,maxX:-400,minZ:-1200,maxZ:-1150};},/at least 100 x 60 m/],['a callout that is not text',b=>{b[0].callout=3;},/callout/],
    ['a casualty beyond the impacts',b=>{b[0].casualty.impact=10;},/casualty \{impact/],['a casualty on a man who is not of the line',b=>{b[0].casualty.near='marek_zielinski';},/casualty \{impact/],
    ['a casualty offset of 40 m',b=>{b[0].casualty.offsetM=[40,0];},/casualty \{impact/]];
  for(const [name,mutate,re] of cases)assert.throws(()=>build(mutate),re,name);
  const m=extra=>{const x={...strip(act.medics),...extra};return makeMedicPlan(x,{playable:layout.bounds.playable});};
  assert.ok(m({}));
  for(const [name,extra,re] of [['one bearer',{ids:['np_maqueiro_0']},/ids: two different/],['the same bearer twice',{ids:['np_maqueiro_0','np_maqueiro_0']},/ids: two different/],['a bearer of a wrong name',{ids:['np_maqueiro_0','pl_np_9']},/ids: two different/],
    ['an exit on the other side of the map',{exit:[0,0]},/from \/ exit/],['a run slower than the walk',{runPace:1},/runPace pace-8/],['three casualties',{maxCasualties:3},/maxCasualties 1-2/],['a stray key',{speedy:1},/unknown key speedy/]])
    assert.throws(()=>m(extra),re,name);
  // a wave that follows a barrage the act has not got, a callout nobody says, a trigger of data that is not one: the plan does not build
  const planOf=mutate=>{const x=strip(act);mutate(x);return areaPlanOf(ID,{layout,act:x});};
  assert.ok(planOf(()=>{}));
  assert.throws(()=>planOf(x=>{delete x.barrages;delete x.medics;}),/the wave event follows a barrage of the act/);
  assert.throws(()=>planOf(x=>{x.events.find(e=>e.id==='evt_npb_wave').trigger.barrage='brg_npb_9';}),/the wave event follows a barrage of the act/);
  assert.throws(()=>planOf(x=>{x.events.find(e=>e.id==='evt_npb_wave').trigger={type:'whenever'};}),/the wave event trigger is battleClock or barrageEnd/);
  assert.throws(()=>planOf(x=>{x.barrages[1].callout='nothing_said';}),/callout nothing_said is not a callout of the act/);
  assert.throws(()=>planOf(x=>{x.checkpoints[1].trigger={type:'echelonBroken',echelon:1};}),/echelonBroken: the index of an echelon that another follows/);
  assert.throws(()=>planOf(x=>{x.checkpoints[1].trigger={type:'flag',flag:'other.flag'};}),/flag: a flag of the act/);
  assert.throws(()=>planOf(x=>{x.checkpoints[1].trigger={type:'later'};}),/trigger type later/);
  assert.throws(()=>planOf(x=>{x.checkpoints[0].trigger={type:'sceneEnd',scene:'cs_npb_end'};}),/sceneEnd is the end of the entry card/);
  assert.throws(()=>planOf(x=>{x.checkpoints[1].trigger=7;}),/trigger \(a text, or \{type/);
  const flagged=planOf(x=>{x.checkpoints[1].trigger={type:'flag',flag:'m01npb.something'};});assert.deepEqual(flagged.triggers,[{id:'cp_npb_i2_pausa',type:'flag',flag:'m01npb.something'}]);
});


test('F8: the world of an act with its own sun (VII-b) lights at 13:00; the worlds of the current act and of VII-a keep the sun they had',()=>{
  const bw=new TczewWorld(),a=new M01AreaWorld(layout,{}),b=new M01AreaWorld(layout,{sun:act.clock.sun});
  assert.deepEqual(a.layout.sun,bw.layout.sun,'VII-a: map-layout\'s sun, exactly');
  const s=sunState(b.layout.sun.keyframes,13*3600+90);assert.ok(Math.abs(s.altDeg-42.1)<1e-9&&Math.abs(s.azDeg-205)<1e-9,'one keyframe: the sun stays where C01 puts it at 13:00');
  assert.equal(phaseAt(s.altDeg),phaseAt(42.1));assert.ok(lightingModel(s.altDeg,s.azDeg));
  assert.deepEqual(sunState(a.layout.sun.keyframes,7*3600+5*60+10),sunState(bw.layout.sun.keyframes,7*3600+5*60+10),'and VII-a\'s morning is the same sun');
  assert.equal(b.layout.sun.source,'C01 (método)');assert.deepEqual(bw.layout.sun.keyframes.length,7,'map-layout.json is not changed');
  assert.throws(()=>new M01AreaWorld(layout,{sun:{keyframes:[]}}),/sun\.keyframes/);assert.throws(()=>new M01AreaWorld(layout,{sun:{keyframes:[{clock:'13:00',altitudeDeg:'high',azimuthDeg:1}]}}),/sun\.keyframes/);
  assert.equal(newSim().world.layout.sun.keyframes[0].clock,'13:00');assert.equal(new M01AreaSimulation().world.layout.sun.keyframes.length,7);
});

test('the entry card, CP-I, the resupply and the west post: the act opens on «Mais tarde…», CP-I is taken when the card ends, the barrage waits for the ammunition and the post',()=>{
  const sim=newSim();
  assert.equal(sim.scene.card.lines[0],'Mais tarde…');assert.equal(sim.objectiveMarker,null,'no marker under the card');assert.equal(sim.objectives.obj_npb_resupply.state,'locked');
  sim.tick(ACT_B_TICK,{});sim.tick(ACT_B_TICK,{skip:true});assert.ok(sim.scene,'the card cannot be skipped in its first 0.6 s');
  for(let i=0;i<14;i++)sim.tick(ACT_B_TICK,{skip:true});
  assert.equal(sim.scene,null);assert.deepEqual(sim.checkpointsReached,['cp_npb_i_dia']);assert.equal(sim.respawn.label,'CP-I');assert.equal(sim.mission.phase,'NPB_ARRIVAL');
  assert.equal(sim.objectives.obj_npb_resupply.state,'active');assert.equal(sim.mission.text,'Reabasteça-se e ocupe o flanco oeste do parapeito');
  assert.ok(sim.drainEvents().some(e=>e.type==='checkpoint'&&e.id==='cp_npb_i_dia'));
  // short of ammunition the first place is the nearest crate; with the reserve full it is the west post
  sim.weapon.reserve=10;assert.equal(sim.objectiveMarker.label,'Caixa de munições');
  const crate=sim.world.areaProps.filter(o=>o.type==='ammo_crate_wood').sort((p,q)=>Math.hypot(p.x-sim.player.x,p.z-sim.player.z)-Math.hypot(q.x-sim.player.x,q.z-sim.player.z))[0];
  assert.deepEqual([sim.objectiveMarker.x,sim.objectiveMarker.z],[crate.x,crate.z]);
  Object.assign(sim.player,{x:sim.plan.points.west_post.x,z:sim.plan.points.west_post.z});sim.tick(ACT_B_TICK,{});
  assert.equal(sim.objectives.obj_npb_resupply.state,'active','at the post with the reserve short: not done');
  Object.assign(sim.player,{x:crate.x,z:crate.z+1});sim.tick(ACT_B_TICK,{interact:true});assert.equal(sim.weapon.reserve,40);
  assert.equal(sim.objectiveMarker.label,'Flanco oeste');assert.equal(sim.interaction,'');
  Object.assign(sim.player,{x:-505,z:-1159.2});sim.tick(ACT_B_TICK,{});
  assert.equal(sim.objectives.obj_npb_resupply.state,'done');assert.equal(sim.objectiveMarker,null);
  sim.tick(ACT_B_TICK,{});
  assert.ok(sim.timers.barrage.run,'the barrage begins when the objective is done');assert.equal(sim.mission.phase,'NPB_BARRAGE');assert.equal(sim.objectives.obj_npb_take_cover.state,'active');
  assert.equal(sim.mission.status,'Fogo de artilharia · abrigue-se atrás do parapeito');assert.equal(sim.mission.text,'Abrigue-se atrás do parapeito');
  assert.ok([sim.subtitle,...sim.dialogueQueue].some(d=>d?.text==='Artilharia! Ao chão!'),'the warning is said (now, or queued behind the line of the arrival)');
  validateAreaSnapshot(strip(sim.snapshot()),sim.plan);
});

test('F3: a barrage — a whistle 1.5 s before each impact, craters, the Poles near them hurt, the player never hurt and never under a shell (30 m), the draws only from its own stream',()=>{
  for(const [name,where] of [['west post',{x:-505,z:-1159.2}],['the middle of the band',{x:-440,z:-1185}],['east end of the band',{x:-330,z:-1130}]]){
    const sim=atWestPost(newSim(19390901,'veterano'));Object.assign(sim.player,where,{crouched:false});sim.player.health=100;
    const main=sim.rng.state,launches=[{at:sim.timers.barrage.run.startedAt,x:sim.timers.barrage.run.shells[0].x,z:sim.timers.barrage.run.shells[0].z}],landings=[];let minGap=Infinity,hurtTicks=0;   // the first shell was launched inside atWestPost
    for(let i=0;i<4000&&!sim.timers.barrage.done.brg_npb_1;i++){
      const health=sim.player.health;sim.tick(ACT_B_TICK,{});
      for(const e of sim.drainEvents()){
        if(e.type==='shell-incoming')launches.push({at:e.at,x:e.point.x,z:e.point.z});
        if(e.type==='m01-blast'){assert.equal(e.kind,'shell');assert.equal(e.aerial,false);landings.push({at:sim.clock,x:e.point.x,z:e.point.z,concussion:e.concussion});minGap=Math.min(minGap,Math.hypot(e.point.x-sim.player.x,e.point.z-sim.player.z));}
        if(e.type==='player-hit'||e.type==='player-down')hurtTicks++;
      }
      assert.equal(sim.player.health,health,`${name}: the shells never hurt the player`);assert.ok(sim.player.alive);
    }
    assert.equal(launches.length,12,`${name}: twelve impacts`);assert.equal(landings.length,12);assert.equal(hurtTicks,0);
    launches.forEach((l,k)=>{assert.ok(Math.abs(landings[k].at-l.at-1.5)<=ACT_B_TICK+1e-9,`${name}: impact ${k} lands 1.5 s after its whistle (${landings[k].at-l.at})`);assert.ok(Math.hypot(l.x-landings[k].x,l.z-landings[k].z)<1e-9||minGap>=30,'it lands where it was whistled unless the player ran under it');});
    assert.ok(minGap>=SAFE_IMPACT_M,`${name}: no shell nearer than 30 m to the player (${minGap})`);
    assert.equal(sim.rng.state,main,`${name}: the simulation's main stream is not drawn by the barrage`);
    assert.equal(sim.sectors.damage.filter(d=>d.id.startsWith('np_shell_crater_brg_npb_1_')).length,12,'a crater for each, with an id the decals and the audio read as a crater and a shell');
    assert.ok(sim.sectors.damage.every(d=>Number.isFinite(d.started)&&Number.isFinite(d.soundAt)&&d.soundAt>=d.started));
    assert.equal(sim.timers.barrage.run,null);assert.ok(Number.isFinite(sim.timers.barrage.done.brg_npb_1));assert.equal(sim.objectives.obj_npb_take_cover.state,'done');assert.equal(sim.objectives.obj_npb_hold.state,'active');
    if(name==='the middle of the band')assert.ok(landings.some(l=>l.concussion>0)&&Math.max(...landings.map(l=>l.concussion))<=1,'standing in the band he is stunned, by the nearest shells');
  }
});

test('F3: the stun is the bombs\' (act 1): a standing man in the band is slowed and his rifle less steady for a few seconds; crouching behind the parapet takes it away; two shells do not add up',()=>{
  const sim=atWestPost(newSim());Object.assign(sim.player,{x:-440,z:-1185,crouched:false});
  const run=sim.timers.barrage.run;assert.ok(run);
  const b=sim.plan.barrages.byId.brg_npb_1,P=sim.player;
  const fall=(x,z)=>sim.landShell(run,b,{n:run.k,x,z,launchedAt:sim.clock-1.5,landAt:sim.clock});
  fall(P.x+31,P.z);const first=P.concussion;assert.ok(first>.9&&first<=1,`31 m, standing, in the open: ${first}`);assert.ok(concussionLevel(P,sim.clock)>.9);
  assert.ok(P.concussedUntil-sim.clock<=CONCUSSION.maxSec+1e-9&&P.concussedUntil-sim.clock>=CONCUSSION.minSec,'two to five seconds');
  const until=P.concussedUntil;fall(P.x+55,P.z+10);assert.equal(P.concussion,first,'a weaker shell leaves the stronger stun as it was');assert.equal(P.concussedUntil,until);
  // the stun slows him: the same walk covers less ground
  const walk=stunned=>{const s=atWestPost(newSim());Object.assign(s.player,{x:-440,z:-1185,crouched:false,angle:0});if(stunned){s.player.concussion=1;s.player.concussedUntil=s.clock+5;}
    const x0=s.player.x;for(let i=0;i<20;i++)s.tick(ACT_B_TICK,{forward:1,sprint:true});return s.player.x-x0;};
  const free=walk(false),slow=walk(true);assert.ok(slow<free*.7,`sprinting stunned covers ${slow.toFixed(2)} m against ${free.toFixed(2)} m`);
  // crouched behind cover he is stunned less, and it ends: the fields are gone
  const q=atWestPost(newSim());Object.assign(q.player,{x:-505,z:-1159.2,crouched:true});
  const qr=q.timers.barrage.run,qb=q.plan.barrages.byId.brg_npb_1;q.landShell(qr,qb,{n:0,x:-505,z:-1159.2-31,launchedAt:q.clock-1.5,landAt:q.clock});
  assert.ok((q.player.concussion??0)<first,'crouched with the parapet between him and the crater: less');
  for(let i=0;i<120;i++){q.tick(ACT_B_TICK,{});q.drainEvents();}
  assert.equal(q.player.concussedUntil,undefined);assert.equal(q.player.concussion,undefined);
});

test('F3: the Poles near a shell — kneeling behind the parapet a man is wounded where a man standing is killed; the cast and the ckm crew are only shaken; the scripted casualty is the same man every time',()=>{
  const ctx=(seed=19390901)=>{const sim=atWestPost(newSim(seed));const run=sim.timers.barrage.run;return {sim,run,b:sim.plan.barrages.byId.brg_npb_1};};
  const land=(c,x,z)=>c.sim.landShell(c.run,c.b,{n:c.run.k,x,z,launchedAt:c.sim.clock-1.5,landAt:c.sim.clock});
  const lie=(m,crouched)=>{m.crouched=crouched;m.posture=crouched?'crouch':'stand';return m;};   // the posture field is the presentation's, refreshed every tick: set both
  // pl_np_3 kneels at (-455, -1159.2) behind the parapet (z -1161.2..-1160.2). A crater 3 m from him on the north side: the parapet shelters him.
  {const c=ctx(),m=lie(c.sim.actor('pl_np_3'),true);land(c,m.x+1.5,m.z-3);assert.equal(m.state,'WOUNDED');assert.ok(m.alive&&m.health>=1&&m.health<100);assert.ok(Math.abs(m.health-100)>20);}
  // the same crater with the man standing: still wounded or worse at 3.4 m? Standing and uncovered at that range he dies (a crater on the south side, in the open).
  {const c=ctx(),m=lie(c.sim.actor('pl_np_3'),false);land(c,m.x+1.5,m.z+3);assert.equal(m.alive,false);assert.equal(m.state,'DOWN');}
  // the kneeling man 3 m from a crater on the open side (no parapet between): killed only at 1.5 m (crouch 1.25), wounded at 3 m
  {const c=ctx(),m=lie(c.sim.actor('pl_np_3'),true);land(c,m.x+1.5,m.z+3);assert.equal(m.state,'WOUNDED');}
  // the named men and the ckm crew: shaken at the core of the crater, never hurt
  {const c=ctx();for(const id of ['marek_zielinski','staszek_pawlak','szymon_kowal','ckm_gunner','ckm_loader']){const m=lie(c.sim.actor(id),false);land(c,m.x,m.z+.5);
    assert.ok(m.alive&&m.health===100&&m.state!=='WOUNDED',id);assert.ok(m.suppressedUntil>c.sim.clock,`${id} is shaken`);}}
  // the Germans are not touched by their own artillery
  {const c=ctx(),g=c.sim.enemies.find(a=>a.active),h=g.health;land(c,g.x,g.z);assert.equal(g.health,h);assert.ok(g.alive);}
  // the scripted casualty: in the barrage of the data, impact 4 falls 3 m from pl_np_3 and wounds him; the player is 50 m away at the post
  for(const seed of [19390901,3,7]){
    const sim=atWestPost(newSim(seed));tickUntil(sim,s=>s.timers.barrage.done.brg_npb_1,4000);
    assert.equal(sim.actor('pl_np_3').state==='WOUNDED'||sim.actor('pl_np_3').active===false,true,`seed ${seed}: pl_np_3 is the wounded man (or already carried away)`);
  }
});

test('F5: the stretcher-bearers — they come on at the south edge when a man of the line is wounded, run to him, the first carries him on his shoulder, both walk south and leave; at most two men per act; they cannot be killed; nobody stacks or clips',()=>{
  const sim=atWestPost(newSim(19390901,'veterano'));
  // keep the barrage out of it: this checks the bearers alone, on the wounded of the test
  sim.timers.barrage.done={brg_npb_1:sim.clock,brg_npb_2:sim.clock};sim.timers.barrage.run=null;sim.flags['m01npb.wave']='repelled';
  const M=sim.plan.medics,[m0,m1]=M.ids.map(id=>sim.actor(id)),clip=areaClippingAudit(),stack=stackingAudit();
  const lineIds=sim.plan.line.men;assert.deepEqual([m0.active,m1.active],[false,false]);
  const wound=id=>{const a=sim.actor(id);a.state='WOUNDED';a.health=40;a.crouched=false;return a;};
  const states=[];let carried=false,maxLift=0;
  const run=(id)=>{
    const patient=wound(id);
    for(let i=0;i<4000&&!patient.carriedBy&&sim.timers.medics.state!=='carry';i++){sim.tick(ACT_B_TICK,{});sim.drainEvents();clip.observe({sim});stack.observe({sim});if(i===0)assert.equal(sim.timers.medics.state,'toPatient');}
    assert.ok(sim.timers.said.medic_call!==undefined,'«Maqueiro!» is said when they are called');assert.deepEqual([m0.active,m1.active],[true,true]);assert.ok(Math.hypot(m0.x-patient.x,m0.z-patient.z)<M.pickupM+.5);
    assert.equal(patient.carriedBy,m0.id);assert.equal(sim.timers.medics.patient,id);
    for(let i=0;i<4000&&sim.timers.medics.state==='carry';i++){
      sim.tick(ACT_B_TICK,{});sim.drainEvents();clip.observe({sim});stack.observe({sim});carried=true;
      if(patient.carriedBy){assert.ok(Math.hypot(patient.x-m0.x,patient.z-m0.z)<.5,'on his shoulder');maxLift=Math.max(maxLift,patient.y-m0.y);}
    }
    assert.equal(sim.timers.medics.state,'idle');assert.equal(patient.carriedBy,null);assert.equal(patient.active,false,'off the field');assert.ok(patient.alive);assert.deepEqual([m0.active,m1.active],[false,false]);
    assert.ok(Math.hypot(m0.x-M.exit[0],m0.z-M.exit[1])<.1,'at the exit, on the south edge');
  };
  run(lineIds[3]);assert.equal(sim.timers.medics.handled,1);
  run(lineIds[5]);assert.equal(sim.timers.medics.handled,2);
  assert.ok(carried&&Math.abs(maxLift-1.15)<1e-9,'the patient rides 1.15 m above the carrier\'s feet (act 1\'s convention)');
  // a third wounded man is not carried: at most two per act
  const third=wound(lineIds[1]);for(let i=0;i<400;i++){sim.tick(ACT_B_TICK,{});sim.drainEvents();}
  assert.equal(sim.timers.medics.state,'idle');assert.equal(third.active,true);assert.equal(third.carriedBy,undefined);assert.deepEqual([m0.active,m1.active],[false,false]);
  assert.deepEqual(clip.report(),[],'no clipping');assert.equal(stack.summary().pairs,0,'no men inside each other');
  // the bearers are of the named kind: a round that crosses one only pins him; a shell shakes him
  assert.ok(m0.essential&&m1.essential);
});

test('F4: CP-I2 is taken in the tick the first attack breaks (a data trigger, once, with the player alive and inside the bounds); a death in the second attack returns there, with the barrage of the pause still to come',()=>{
  const sim=newSim(19390901,'soldado'),state={arrived:false,lastHealth:100},cps=[];
  const emit=sim.emit.bind(sim);sim.emit=e=>{if(e.type==='checkpoint')cps.push([e.id,sim.clock,sim.timers.wave?.echs[0]?.brokenAt??null]);emit(e);};
  for(let i=0;i<30000&&!sim.checkpointsReached.includes('cp_npb_i2_pausa');i++){sim.tick(ACT_B_TICK,actBControls(sim,'passive',state));sim.drainEvents();}
  assert.deepEqual(cps.map(c=>c[0]),['cp_npb_i_dia','cp_npb_i2_pausa']);
  const [,at,broke]=cps[1];assert.ok(Number.isFinite(broke)&&at-broke<=ACT_B_TICK+1e-9,'in the tick of the break');
  assert.equal(sim.respawn.label,'CP-I2');assert.equal(sim.flags['m01npb.wave'],'lull');assert.deepEqual(Object.keys(sim.timers.barrage.done),['brg_npb_1']);assert.equal(sim.timers.barrage.run,null);
  // into the second attack and dead: back to the pause (the second attack waiting at the treeline, the second barrage not yet fired)
  tickUntil(sim,s=>s.timers.wave.ech===1&&s.clock-s.timers.wave.echs[1].at>12,20000,{});
  assert.deepEqual(Object.keys(sim.timers.barrage.done).sort(),['brg_npb_1','brg_npb_2']);
  sim.player.alive=false;sim.player.health=0;sim.playerDown('shot','de_npb_40','mg34');sim.tick(ACT_B_TICK,{});
  assert.ok(sim.drainEvents().some(e=>e.type==='restored'));assert.equal(sim.respawn.label,'CP-I2');assert.equal(sim.timers.wave.ech,0);assert.equal(sim.timers.wave.echs.length,1);assert.deepEqual(Object.keys(sim.timers.barrage.done),['brg_npb_1']);
  assert.ok(sim.enemies.filter(a=>sim.man(a).echelon===1).every(a=>a.alive&&!a.active),'the second attack waits off the field again');
  tickUntil(sim,s=>s.timers.barrage.run,3000);assert.ok(sim.timers.barrage.run,'and barrage 2 comes again, 20 s after the break');
  assert.ok(Math.abs(sim.timers.barrage.run.startedAt-(sim.timers.wave.echs[0].brokenAt+20))<=ACT_B_TICK+1e-9);
  validateAreaSnapshot(strip(sim.snapshot()),sim.plan);
});

/** Two simulations from the same state tick the same controls and stay equal (the whole snapshot, every `every` ticks). */
function sameFuture(save,plan,runner,ticks=900,every=3){
  const a=runner.load(JSON.stringify(save));assert.equal(a.ok,true,a.error);const b=runner.load(JSON.stringify(save));assert.equal(b.ok,true,b.error);
  const sa=a.sim,sb=b.sim,state={arrived:true,lastHealth:100,},controls=sim=>actBControls(sim,'active',state);
  for(let i=0;i<ticks;i++){
    const c=controls(sa);sa.tick(ACT_B_TICK,c);sb.tick(ACT_B_TICK,c);
    assert.deepEqual(sa.drainEvents(),sb.drainEvents(),`events at tick ${i}`);
    if(i%every===0)assert.equal(JSON.stringify(sa.snapshot()),JSON.stringify(sb.snapshot()),`tick ${i}`);
  }
  return sa;
}
test('saves: a schema 3 save of VII-b restores to the same state and the same future, tick for tick — at CP-I, mid-barrage with shells in the air, with the bearers carrying, in the pause, in barrage 2 and mid-attack',()=>{
  const runner=new M01ActRunner({enabled:true,startAct:'vii-b'}),plan=areaActPlan(ID);
  const sim=newSim(19390901,'recruta'),state={arrived:false,lastHealth:100};
  const stages=[];
  const take=(name,done,max=40000)=>{for(let i=0;i<max&&!done(sim);i++){sim.tick(ACT_B_TICK,actBControls(sim,'passive',state));sim.drainEvents();}assert.ok(done(sim),name);
    const env=live(sim);assert.equal(env.schema,3);assert.equal(env.act,ID);assert.equal(env.actSave.schema,AREA_SAVE_SCHEMA);stages.push([name,strip(env)]);};
  take('CP-I (the card just ended)',s=>s.checkpointsReached.length===1);
  take('mid-barrage with a shell in the air',s=>s.timers.barrage.run?.shells.length>0&&s.timers.barrage.run.k>=4);
  take('the bearers on their way',s=>s.timers.medics.state==='toPatient'&&s.clock>0);
  take('the bearers carrying',s=>s.timers.medics.state==='carry'&&s.actor(s.timers.medics.patient).carriedBy);
  take('mid-attack (first echelon, 20 s in)',s=>s.timers.wave&&s.clock-s.timers.wave.at>20);
  take('the pause (CP-I2 taken)',s=>s.checkpointsReached.includes('cp_npb_i2_pausa')&&s.timers.wave.lullUntil>0);
  take('barrage 2 with a shell in the air',s=>s.timers.barrage.run?.id==='brg_npb_2'&&s.timers.barrage.run.shells.length>0);
  take('the second attack, 25 s in',s=>s.timers.wave.ech===1&&s.clock-s.timers.wave.echs[1].at>25);
  assert.equal(stages.length,8);
  for(const [name,env] of stages){
    validateAreaSnapshot(env.actSave,plan);
    sameFuture(env,plan,runner,name.startsWith('CP-I')?300:600,name.startsWith('CP-I')?10:3);
  }
});

test('saves: tampered or foreign records are refused with a message — the barrage, the bearers, the stun, the craters, the checkpoints; a VII-a save carries none of them and one that does is refused',()=>{
  const runner=new M01ActRunner({enabled:true,startAct:'vii-b'}),sim=newSim(19390901,'soldado'),state={arrived:false,lastHealth:100};
  for(let i=0;i<20000&&!(sim.timers.barrage.run?.shells.length>0&&sim.timers.barrage.run.k>=3);i++){sim.tick(ACT_B_TICK,actBControls(sim,'passive',state));sim.drainEvents();}
  assert.ok(sim.timers.barrage.run?.shells.length>0);
  const good=strip(live(sim));assert.equal(runner.load(JSON.stringify(good)).ok,true);
  assert.deepEqual(strip(runner.envelope(sim).actSave),strip(sim.checkpoint),'the runner\'s envelope is the last checkpoint (CP-I here), which has no barrage running');
  const bad=(name,mutate,re=/inválid/)=>{const e=strip(good);mutate(e.actSave);const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,name);assert.match(r.error,re,`${name}: ${r.error}`);};
  bad('no barrage record',s=>{delete s.timers.barrage;},/registo das barragens/);bad('a stray key in the barrage record',s=>{s.timers.barrage.extra=1;},/registo das barragens/);
  bad('a barrage that does not exist',s=>{s.timers.barrage.run.id='brg_x';},/registo das barragens/);bad('the same barrage running and done',s=>{s.timers.barrage.done[s.timers.barrage.run.id]=1;},/registo das barragens/);
  bad('more impacts than the barrage has',s=>{s.timers.barrage.run.k=11;},/registo das barragens/);bad('a shell the record has not launched',s=>{s.timers.barrage.run.shells[0].n=s.timers.barrage.run.k;},/registo das barragens/);
  bad('a shell outside the area',s=>{s.timers.barrage.run.shells[0].x=5000;},/registo das barragens/);bad('a landing that is not the warning after the launch',s=>{s.timers.barrage.run.shells[0].landAt+=3;},/registo das barragens/);
  bad('a shell that should have landed',s=>{s.timers.barrage.run.shells[0].landAt=s.clock-1;s.timers.barrage.run.shells[0].launchedAt=s.clock-2.5;},/registo das barragens/);
  bad('a stream that is not a 32-bit number',s=>{s.timers.barrage.run.rng=-1;},/registo das barragens/);bad('a barrage finished in the future',s=>{s.timers.barrage.done.brg_npb_2=s.clock+100;},/registo das barragens/);
  bad('no record of the bearers',s=>{delete s.timers.medics;},/registo dos maqueiros/);bad('bearers on their way to a man who is not of the line',s=>{s.timers.medics.state='toPatient';s.timers.medics.patient='marek_zielinski';},/registo dos maqueiros/);
  bad('a bearer off the field that the record says is coming',s=>{s.timers.medics.state='toPatient';s.timers.medics.patient='pl_np_3';},/registo dos maqueiros/);
  bad('a carried man with nobody carrying',s=>{s.actors.find(a=>a.id==='pl_np_2').carriedBy='np_maqueiro_0';},/registo dos maqueiros/);
  bad('more casualties than the act allows',s=>{s.timers.medics.handled=3;},/registo dos maqueiros/);bad('a stun that is not one',s=>{s.player.concussion=2;s.player.concussedUntil=s.clock+1;},/atordoamento/);
  bad('a stun for a minute',s=>{s.player.concussion=.5;s.player.concussedUntil=s.clock+60;},/atordoamento/);bad('a crater with no place',s=>{s.sectors.damage.push({id:'np_shell_crater_x',x:'a',y:0,z:0,started:0,soundAt:0});},/destruição/);
  bad('a checkpoint of the pause without the break',s=>{s.checkpointsReached=['cp_npb_i_dia','cp_npb_i2_pausa'];},/sem a quebra da vaga 0/);bad('a flag of VII-a in the place of VII-b\'s',s=>{s.flags['m01np.wave']=s.flags['m01npb.wave'];delete s.flags['m01npb.wave'];},/inválid/);
  bad('another act\'s name',s=>{s.act='act_vii_a_north';},/inválid/);
  // a VII-a save with a barrage record, and the bearers of VII-b among VII-a's men
  const a=new M01AreaSimulation(),ea=strip(live(a));assert.equal(runner.load(JSON.stringify(ea)).ok,true,'a plain VII-a save loads');
  const withB=strip(ea);withB.actSave.timers.barrage={done:{},run:null};const r=runner.load(JSON.stringify(withB));assert.equal(r.ok,false);assert.match(r.error,/registo das barragens/);
  const withM=strip(ea);withM.actSave.timers.medics={state:'idle',patient:null,handled:0,since:0};assert.match(runner.load(JSON.stringify(withM)).error,/registo dos maqueiros/);
  // a save made before the stun existed has no fields for it and loads
  assert.equal(good.actSave.player.concussion===undefined||good.actSave.player.concussion>0,true);
});

test('F2: the chain BW -> VII-a -> VII-b: carry keeps the BW events and the flags of VII-a (m01np*), the seed is derived without drawing, the debrief of VII-b has both area paragraphs in order, and the debrief follows VII-b',()=>{
  const runner=new M01ActRunner({enabled:true}),a=new M01AreaSimulation(19390901,{difficulty:'soldado',carry:{...defaultCarry('soldado'),events:['evt_m01_east_demolition','evt_m01_west_demolition']}}),r=actRoute(a,{mode:'passive',maxSec:700});
  assert.equal(r.complete,true);assert.equal(a.flags['m01np.completed'],true);assert.equal(a.flags['m01np.wave'],'repelled');
  const before=JSON.stringify(a.snapshot());
  assert.equal(runner.next(a),ID,'VII-a hands over to VII-b');assert.equal(new M01ActRunner({enabled:false}).next(a),null);
  const carry=carryFrom(a,ID);validateCarry(carry);assert.equal(carry.seed,nextSeed(a.rng.state,ID));assert.equal(carry.from,'act_vii_a_north');assert.equal(carry.flags['m01np.completed'],true);assert.equal(carry.flags['m01np.wave'],'repelled');
  assert.deepEqual(carry.weapon,{mag:a.weapon.mag,reserve:a.weapon.reserve});assert.equal(carry.grenades,a.grenades.ammo);assert.deepEqual(carry.events,a.carry.events,'the bridges as the demolitions left them');
  const b=runner.enter(a);assert.equal(JSON.stringify(a.snapshot()),before,'entering reads, never writes');
  assert.ok(b instanceof M01AreaSimulation);assert.equal(actOf(b),ID);assert.equal(b.scene.id,'cs_npb_entry');assert.equal(b.weapon.reserve,a.weapon.reserve);assert.equal(b.difficulty,'soldado');assert.ok(b.world.events.includes('evt_m01_west_demolition'));
  assert.equal(b.flags['m01np.completed'],true,'the flags of VII-a are carried');assert.equal(b.flags['m01npb.wave'],'pending');
  const ids=b.definition.debrief.paragraphs.filter(p=>p.enabled).map(p=>p.id);
  assert.deepEqual(ids,['db_01','db_02','db_03','db_np_01','db_npb_01',...ids.slice(5)],'db_01..db_03, VII-a\'s, VII-b\'s, then the rest');assert.ok(ids.slice(5).every(id=>/^db_0[4-7]b?$/.test(id)));
  assert.deepEqual(b.renderState.debrief.map(p=>p.id),ids);
  for(const p of definition.debrief.paragraphs)assert.equal(b.definition.debrief.paragraphs.find(q=>q.id===p.id).text,p.text,'the paragraphs of the current act are untouched');
  // the QA start at VII-b (nothing played before): its own paragraph goes after db_03
  const q=new M01ActRunner({enabled:true,startAct:'vii-b'}).createInitial({difficulty:'recruta'});
  assert.deepEqual(q.definition.debrief.paragraphs.map(p=>p.id).slice(0,5),['db_01','db_02','db_03','db_npb_01','db_04']);
  assert.deepEqual(debriefChain('act_vii_a_north',defaultCarry()).map(x=>x.paragraphs[0].id),['db_np_01']);assert.deepEqual(debriefChain(ID,carry).map(x=>x.paragraphs[0].id),['db_np_01','db_npb_01']);
  assert.equal(debriefWith(...debriefChain(ID,carry)).length,definition.debrief.paragraphs.length+2);
  // a stored envelope of VII-b opens through the runner; the chain ends here: the debrief follows VII-b
  const env=runner.envelope(b);assert.equal(runner.load(JSON.stringify(env)).ok,true);
  b.mission.complete=true;assert.equal(runner.next(b),null,'no act after VII-b yet: the debrief');
  assert.equal(runner.enter(b),null,'and there is nothing to enter');
});

test('F9: nothing on screen of VII-b gives an exact hour, a count of attacks, an ordinal, a calibre, an insignia or the name of a historical officer; its cards say what is documented and what is reconstruction',()=>{
  const lines=[...act.cards.entry.lines,...act.cards.end.lines,act.clock.label,...act.callouts.map(c=>c.text),...act.objectives.map(o=>o.text),act.debrief.paragraphs[0].text,...act.resupply.text?[act.resupply.text]:[]];
  const BANNED=[[/\d{1,2}:\d{2}/,'an hour'],[/\d+\s?(?:cm|mm|kg)\b|\bcalibre\s+\d|obus(?:es)?\s+de\b|\bhaubit/i,'a calibre'],[/\bSS\b|SS-|Heimwehr|Totenkopf|Waffen/,'an insignia'],[/Janik|Juchtman/,'a historical officer'],
    [/Panzer|Pz\.?\s?Kpfw|Stuka|Ju\s?87|Bofors/i,'a vehicle, an aircraft or a gun of a type']];
  for(const text of lines)for(const [re,what] of BANNED)assert.doesNotMatch(text,re,`${what}: ${text}`);
  // the cards, the voices and the status line never count or number the attacks, the waves or the shells
  const ONSCREEN=[...act.cards.entry.lines,...act.cards.end.lines,act.clock.label,...act.callouts.map(c=>c.text),...act.objectives.map(o=>o.text)];
  for(const text of ONSCREEN){assert.doesNotMatch(text,/\d+\.?\s?[ªº]|n\.º|N\.º/,`an ordinal: ${text}`);
    assert.doesNotMatch(text,/\b(?:um|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|\d+)\s+(?:ataques?|investidas?|vagas?|barragens?|obuses?|salvas?|baterias?|disparos?)\b/i,`a count of attacks: ${text}`);
    assert.doesNotMatch(text,/\b(?:primeir[ao]|segund[ao]|terceir[ao])\s+(?:ataque|investida|vaga|barragem)\b/i,`an ordinal: ${text}`);}
  const entry=act.cards.entry.lines.join(' '),end=act.cards.end.lines.join(' ');
  assert.equal(act.cards.entry.lines[0],'Mais tarde…');assert.match(entry,/T16/);assert.match(entry,/desconhecido/);assert.match(entry,/reconstrução e dramatização/);assert.match(end,/T03/);assert.match(end,/desconhecidos/);
  assert.match(act.history.find(h=>h.id==='h_npb_day_attacks').classification,/DOCUMENTED/);assert.deepEqual(act.history.find(h=>h.id==='h_npb_day_attacks').sources,['T16','T03']);
  assert.equal(act.history.find(h=>h.id==='h_npb_positions').classification,'RECONSTRUCTED');
  const dram=act.history.find(h=>h.id==='h_npb_dramatization');assert.equal(dram.classification,'GAMEPLAY_DRAMATIZATION');assert.deepEqual(dram.sources,[]);assert.match(dram.text,/dramatização/);
  assert.equal(act.debrief.insertAfter,'db_np_01');assert.equal(act.debrief.paragraphs[0].id,'db_npb_01');assert.deepEqual(act.debrief.paragraphs[0].sources,['T16','T03']);assert.match(act.debrief.paragraphs[0].text,/As fontes do repositório não dizem/);
  // the voices are European Portuguese and every key the simulation says has a line (the barrage and the bearers included)
  for(const on of ['arrive_card_end','barrage_warn','barrage_over','medic_call','wave_seen','open_fire','mg_fire','man_down','kowal_reload','enemy_down','player_pinned','close','fallback','repelled','ckm_feed','lull','lull_quiet','echelon_seen','final_break']){
    const c=act.callouts.find(x=>x.on===on);assert.ok(c,on);assert.doesNotMatch(c.text,/\b(você|tu|ônibus|trem)\b/i,'not Brazilian Portuguese');}
  assert.equal(act.callouts.find(c=>c.on==='barrage_warn').text,'Artilharia! Ao chão!');assert.equal(act.callouts.find(c=>c.on==='medic_call').speaker,'staszek_pawlak');
  assert.equal(new Set(act.callouts.map(c=>c.id)).size,act.callouts.length,'callout ids are unique');
  // the same on the status line and the objective text during a whole route (strings the simulation writes)
  const sim=newSim(7,'soldado'),state={arrived:false,lastHealth:100},seen=new Set();
  actBRoute(sim,{mode:'active',maxSec:900,onStep:({sim:s})=>{seen.add(s.mission.status);seen.add(s.mission.text);if(s.subtitle)seen.add(s.subtitle.text);}});
  for(const text of seen)if(text){for(const [re,what] of BANNED)assert.doesNotMatch(text,re,`${what}: ${text}`);assert.doesNotMatch(text,/\d+\.?\s?[ªº]|n\.º|N\.º/,`an ordinal on the status line: ${text}`);}
  assert.ok([...seen].some(t=>/^Linha norte · \d+ atacantes? no campo/.test(t)),'the status line keeps the game count of VII-a («N no campo»: return to the player, not history)');
  assert.ok([...seen].includes('Fogo de artilharia · abrigue-se atrás do parapeito'));assert.ok(![...seen].some(t=>/vaga\b/.test(t)&&/\d\.ª/.test(t)),'and never «2.ª vaga»');
  void state;
});

test('the craters of the shells are drawn from the saved damage records: nothing before the first shell, two instanced meshes then, redrawn only when the records change, a restore that removes them clears them',()=>{
  const ctx={geometries:[],materials:[],group:new THREE.Group(),groundY:-3};   // the dressing is built with a canvas in the browser; its crater method needs only these four fields
  const draw=damage=>M01AreaDressing.prototype.syncShellCraters.call(ctx,damage);
  const others=[{id:'m01_grenade_0',x:0,y:0,z:0,started:1},{id:'np_wreck_fire',x:-390,y:-1.2,z:-1240,started:-420,wreck:true}];
  draw(others);assert.equal(ctx.group.children.length,0,'no shell yet: nothing is made (VII-a never meets it)');
  const shells=[0,1,2].map(n=>({id:`np_shell_crater_brg_npb_1_${n}`,x:-440+n*20,y:-3,z:-1210+n*5,started:20+n,soundAt:21+n}));
  draw([...others,shells[0],shells[1]]);
  assert.deepEqual(ctx.group.children.map(m=>[m.name,m.count]),[['m01-area-shell-crater-discs',2],['m01-area-shell-crater-rims',2]]);
  const [discs,rims]=ctx.group.children,version=discs.instanceMatrix.version;
  draw([...others,shells[0],shells[1]]);assert.equal(discs.instanceMatrix.version,version,'the same records: nothing redrawn');
  const at=new THREE.Vector3();discs.getMatrixAt(1,new THREE.Matrix4().identity());const m=new THREE.Matrix4();discs.getMatrixAt(1,m);at.setFromMatrixPosition(m);
  assert.deepEqual([at.x,at.z],[-420,-1205]);assert.ok(Math.abs(at.y-(-3+.02))<1e-6,'on the area\'s ground');
  draw([...others,...shells]);assert.equal(discs.count,3);assert.equal(rims.count,3);assert.ok(discs.instanceMatrix.version>version);
  draw(others);assert.equal(discs.count,0,'a restore to a checkpoint before the barrage clears them');assert.equal(ctx.group.children.length,2);
  assert.equal(ctx.geometries.length,2);assert.equal(ctx.materials.length,2,'owned by the dressing: disposed with it');
});

test('the golden of Act VII-b: both routes regenerate byte for byte (x86_64; tools/verification/m01-act-vii-b-golden.mjs)',{skip:arch()!=='x64'&&'x86_64 only',timeout:1800000},()=>{
  assert.equal(actBGoldenText(),readFileSync(new URL(`../${ACT_B_GOLDEN_FIXTURE}`,import.meta.url),'utf8'));
});
