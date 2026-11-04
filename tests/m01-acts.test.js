import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import acts from '../missions/m01-tczew/acts.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {SQUAD,updateSquad} from '../src/game/m01-squad.js';
import {REARGUARD,rearguardPlan} from '../src/game/m01-rearguard.js';
import {BW_SQUAD_SPEC,makeSquadPlan,squadStep,makeLinePlan,BW_LINE_OPTIONS,makeApproachPlan,validApproachWave} from '../src/game/m01-act-factories.js';
import {M01ActRunner,ACTS,ACT_SAVE_SCHEMA,BW_ACT,actsPlan,carryFrom,validateCarry,nextSeed,actOf} from '../src/game/m01-acts.js';
import {M01AreaSimulation,AREA_SAVE_SCHEMA,areaActPlan,defaultCarry,validateAreaSnapshot} from '../src/game/m01-area-sim.js';
import {actControls,actRoute,ACT_TICK} from './helpers/m01-act-route.js';
import {driver,route} from './helpers/m01-route.js';

// R4 INC-1 (WP-0): the act runner, the factories of the section machinery and the saves. The current act (M01Simulation) is a closed box: these tests prove that
// with the switch off nothing reaches it, that schema 2 goes through the very path it always went through, and that the factories return the current act's own plans.
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const strip=s=>JSON.parse(JSON.stringify(s));

test('the shipped switch is OFF and the act table is valid (current act first, three area acts after it: VII-a, then VII-b since INC-2, then VII-c since INC-3)',()=>{
  assert.equal(acts.enabled,false,'acts.json enabled=false until the owner accepts the new acts');
  assert.equal(ACTS.enabled,false);assert.deepEqual(ACTS.order,['act_bw_0430_0705','act_vii_a_north','act_vii_b_north_day','act_vii_c_withdrawal']);
  assert.deepEqual(ACTS.order.map(id=>ACTS.entries[id].next),['act_vii_a_north','act_vii_b_north_day','act_vii_c_withdrawal',null],'the chain ends at VII-c, where the debrief follows');
  assert.equal(definition.acts,undefined,'mission.json (an input pinned by the amendment 20 golden) carries no act block');
  assert.throws(()=>actsPlan({...acts,order:['act_vii_a_north']}),/must start with act_bw_0430_0705/);
  assert.throws(()=>actsPlan({...acts,entries:{...acts.entries,act_bw_0430_0705:{...acts.entries.act_bw_0430_0705,next:null}}}),/next must be act_vii_a_north/);
});

test('factories: given the current act data they return the very plans the current act uses (SQUAD, REARGUARD)',()=>{
  assert.deepEqual(makeSquadPlan(BW_SQUAD_SPEC),SQUAD);
  assert.deepEqual(makeLinePlan(definition),REARGUARD);assert.deepEqual(makeLinePlan(definition,BW_LINE_OPTIONS),rearguardPlan(definition));
  // the same validation, the same messages
  const broken=strip(definition);delete broken.groups.find(g=>g.id==='grp_east_platoon').rearguard;
  assert.throws(()=>rearguardPlan(broken),/M01 rearguard: grp_east_platoon\.rearguard missing/);assert.throws(()=>makeLinePlan(broken),/M01 rearguard: grp_east_platoon\.rearguard missing/);
  const far=strip(definition);far.groups.find(g=>g.id==='grp_east_platoon').rearguard.posts[0]=[100,38.7];
  assert.throws(()=>rearguardPlan(far),/posts/);assert.throws(()=>makeLinePlan(far),/posts/);
  assert.throws(()=>makeSquadPlan({...BW_SQUAD_SPEC,moves:[{team:0,to:1,call:'x'}]}),/exactly one of/);
});

test('squadStep(SQUAD) decides exactly what updateSquad decides, over 600 generated situations',()=>{
  let s=12345;const r=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};
  const stage={staszek_pawlak:{x:-71.1,z:21.5},east_platoon_voice:{x:-73,z:22},szymon_kowal:{x:-75,z:20}};
  const plan=makeSquadPlan(BW_SQUAD_SPEC);
  for(let n=0;n<600;n++){
    const men=Object.fromEntries(['staszek_pawlak','east_platoon_voice','szymon_kowal'].map(id=>[id,{id,x:-170+r()*110,z:5+r()*20,alive:r()>.08,active:r()>.04,state:r()<.05?'WOUNDED':'GUARD',carriedBy:null,suppressedUntil:r()<.3?50+r()*20:0}]));
    const make=()=>({clock:50+r()*0,battleClock:23000+r()*900,scene:r()<.2?{id:'x'}:null,player:{x:-160+r()*120,z:20},timers:{},actor:id=>men[id]});
    const base=make();base.clock=55+n%7;base.battleClock=23400+(n%5)*120;
    const q=r()<.25?undefined:{move:Math.floor(r()*5),moving:r()<.5,since:40+r()*14};if(q&&q.move>=4)q.moving=false;
    const ctx={stageSlots:stage,carrier:r()<.5?{x:-200+r()*180,z:20}:null,east:30+r()*30};
    const a={...base,timers:{squad:q&&{...q}}},b={...base,timers:{squad:q&&{...q}}},saidA=[],saidB=[];
    // men are shared and only read by both functions
    const ra=updateSquad(a,{...ctx,say:x=>saidA.push(x)}),rb=squadStep(plan,b,{...ctx,say:x=>saidB.push(x)});
    assert.deepEqual(rb,ra,`situation ${n}`);assert.deepEqual(saidB,saidA,`calls ${n}`);assert.deepEqual(b.timers,a.timers);
  }
});

test('switch OFF: the runner makes the same M01Simulation, never a next act, and saves the schema 2 checkpoint object itself',()=>{
  const off=new M01ActRunner({enabled:false,startAct:'vii-a'});
  assert.equal(off.enabled,false);assert.equal(off.startAct,null,'no QA start without the switch');
  const a=off.createInitial(),b=new M01Simulation();assert.ok(a instanceof M01Simulation);assert.deepEqual(a.snapshot(),b.snapshot());
  assert.deepEqual(off.createInitial({difficulty:'soldado'}).snapshot(),new M01Simulation(undefined,{difficulty:'soldado'}).snapshot());
  a.mission.complete=true;assert.equal(off.next(a),null);assert.equal(off.envelope(b),b.checkpoint);assert.equal(actOf(b),BW_ACT);
  const env=new M01ActRunner({enabled:false}).load(JSON.stringify({schema:3}));assert.equal(env.ok,false);
});

test('schema 2 saves load exactly as before through the runner (switch on or off): same text, same M01Simulation state',()=>{
  const d=driver(19390901);d.step({skip:true});d.walk(-66,26);d.walk(-30,26);
  const saves=[d.sim.checkpoint,d.sim.snapshot(),new M01Simulation(7,{difficulty:'veterano'}).snapshot()];
  for(const save of saves){
    const text=JSON.stringify(save),direct=new M01Simulation();assert.equal(direct.loadCheckpoint(text).ok,true);
    for(const enabled of [false,true]){
      const r=new M01ActRunner({enabled}).load(text);assert.equal(r.ok,true,r.error);assert.ok(r.sim instanceof M01Simulation);
      assert.deepEqual(r.sim.snapshot(),direct.snapshot());assert.deepEqual(r.sim.checkpoint,direct.checkpoint);
    }
  }
  const bad=JSON.stringify({...saves[0],schema:4}),direct=new M01Simulation().loadCheckpoint(bad),viaRunner=new M01ActRunner({enabled:true}).load(bad);
  assert.equal(viaRunner.ok,false);assert.equal(viaRunner.error,direct.error,'a broken schema 2 save is rejected with the current act\'s own message');
});

// Where a save can be taken in the fight of Act VII-a (R4 duration work, 2026-11-03: two echelons with a lull between them): the pilot that reaches each one, and the condition, the state
// of the fight and the checkpoints reached there (CP-E, the arrival; CP-F, the pause, taken when the first echelon breaks: 2026-11-04).
const CP_E='cp_np_e_perimetro',CP_F='cp_np_f_pausa';
const SAVE_POINTS=[
  ['the first echelon, 20 s in','active',sim=>sim.timers.wave?.ech===0&&sim.timers.wave.echs[0].brokenAt===null&&sim.clock-sim.timers.wave.at>20,'active',[CP_E]],
  ['the lull, 10 s in (the first echelon is off the field, the second has not come)','passive',sim=>sim.timers.wave?.lullUntil>0&&sim.clock>sim.timers.wave.lullUntil-20,'lull',[CP_E,CP_F]],
  ['the second echelon, 20 s after it walked in','passive',sim=>sim.timers.wave?.ech===1&&sim.timers.wave.brokenAt===null&&sim.clock-sim.timers.wave.echs[1].at>20,'active',[CP_E,CP_F]],
  ['the last fall-back (the overwatch is falling back too)','passive',sim=>sim.timers.wave?.brokenAt>0&&sim.timers.wave.repelledAt===null,'broken',[CP_E,CP_F]],
];
function toPoint(mode,reached,seed=19390901){
  const sim=new M01AreaSimulation(seed,{difficulty:'soldado'}),state={arrived:false,lastHealth:100};
  for(let i=0;i<30000&&!reached(sim);i++){sim.tick(ACT_TICK,actControls(sim,mode,state));sim.drainEvents();}
  assert.ok(reached(sim),'the save point was reached');
  return {sim,state};
}

test('schema 3: a save restores to the same state and the same future, tick for tick, in the first echelon, in the lull, in the second echelon and in the last fall-back (save/restore identity)',()=>{
  const runner=new M01ActRunner({enabled:true});
  for(const [name,mode,reached,flag,checkpoints] of SAVE_POINTS){
    const {sim,state}=toPoint(mode,reached);
    assert.equal(sim.flags['m01np.wave'],flag,name);assert.deepEqual(sim.checkpointsReached,checkpoints,`${name}: the checkpoints reached`);
    const text=JSON.stringify({schema:ACT_SAVE_SCHEMA,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
    const r=runner.load(text);assert.equal(r.ok,true,`${name}: ${r.error}`);const copy=r.sim;
    assert.deepEqual(strip(copy.snapshot()),strip(sim.snapshot()),name);
    const sa={...state},sb={...state};
    for(let i=0;i<1200;i++){
      const ca=actControls(sim,mode,sa),cb=actControls(copy,mode,sb);assert.deepEqual(cb,ca);
      sim.tick(ACT_TICK,ca);copy.tick(ACT_TICK,cb);assert.deepEqual(copy.drainEvents(),sim.drainEvents(),`${name}: events of tick ${i}`);
      if(i%40===0)assert.deepEqual(strip(copy.snapshot()),strip(sim.snapshot()),`${name}: tick ${i}`);
    }
    assert.deepEqual(strip(copy.snapshot()),strip(sim.snapshot()),name);
    assert.equal(copy.mission.status,sim.mission.status,name);
    // The runner's own envelope (the checkpoint the game stores: CP-E, and CP-F from the pause on) round-trips too.
    const cp=runner.load(JSON.stringify(runner.envelope(sim)));assert.equal(cp.ok,true,cp.error);assert.deepEqual(strip(cp.sim.snapshot()),strip(sim.checkpoint));
    assert.deepEqual(cp.sim.checkpointsReached,sim.checkpointsReached,`${name}: the stored checkpoint is the last one reached (20 s of play later than the save point: the first echelon may have broken since)`);
    assert.equal(cp.sim.respawn.label,sim.checkpointsReached.includes(CP_F)?'CP-F':'CP-E',name);
  }
});

test('schema 3: tampered or foreign envelopes are rejected with a message; with the switch off a schema 3 save is refused',()=>{
  const runner=new M01ActRunner({enabled:true,startAct:'vii-a'}),sim=runner.createInitial({difficulty:'recruta'});
  const good=()=>strip({schema:3,missionId:'m01_tczew',act:'act_vii_a_north',carry:sim.carry,actSave:sim.snapshot()});
  assert.equal(runner.load(JSON.stringify(good())).ok,true);
  const cases=[e=>{e.extra=1;},e=>{e.act='act_vii_b';},e=>{e.missionId='m02';},e=>{e.carry.difficulty='heroi';},e=>{e.carry.events.push('rm -rf');},e=>{e.carry.weapon.mag=9;},
    e=>{e.actSave.schema=3;},e=>{e.actSave.actors.pop();},e=>{e.actSave.actors[3].id='de_np_99';},e=>{e.actSave.player.health=150;},e=>{e.actSave.objectives.obj_np_hold_north.state='won';},
    e=>{e.actSave.checkpointsReached=['cp_m01_a_orientacao'];},e=>{e.actSave.actors.find(a=>a.id==='de_np_4').deck.phase='flank';},e=>{e.actSave.timers.squad={move:9,moving:true,since:0};},
    // the later echelons, before the wave: their men wait off the field, the record is absent, the flag is pending
    e=>{e.actSave.actors.find(a=>a.id==='de_np_20').active=true;},e=>{e.actSave.actors.find(a=>a.id==='de_np_13').deck.node=2;},e=>{e.actSave.actors.find(a=>a.id==='de_np_29').x+=3;},
    e=>{e.actSave.flags['m01np.wave']='active';},e=>{e.actSave.timers.wave={at:0};}];
  for(const [i,mutate] of cases.entries()){const e=good();mutate(e);const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,`case ${i}`);assert.match(r.error,/inválid|desligado/,`case ${i}: ${r.error}`);}
  // A schema 1 save of this act (before the second echelon) is refused with its own message, and not migrated: the acts are off by default, the act restarts in seconds.
  const old=good();old.actSave.schema=1;const refused=runner.load(JSON.stringify(old));
  assert.equal(refused.ok,false);assert.match(refused.error,/esquema 1/);assert.match(refused.error,/segunda vaga/);assert.match(refused.error,/recomece o ato/);
  assert.equal(AREA_SAVE_SCHEMA,2,'the act save schema moved to 2 with the echelon state');
  // The area save's own schema is 2 now, which is also the number of the current act's save: a bare area save (no schema 3 envelope) must still never open the current act.
  for(const enabled of [false,true]){const bare=new M01ActRunner({enabled}).load(JSON.stringify(sim.snapshot()));assert.equal(bare.ok,false,`bare area save, switch ${enabled}`);assert.match(bare.error,/inválid/);}
  const off=new M01ActRunner({enabled:false}).load(JSON.stringify(good()));assert.equal(off.ok,false);assert.match(off.error,/desligado/);
  assert.equal(runner.load('{').ok,false);assert.equal(runner.load(null).ok,false);
});

test('schema 3: the echelon state of a save in the lull is checked (shape, order of the times, who is on the field, the flag) and tampering is refused',()=>{
  const runner=new M01ActRunner({enabled:true}),{sim}=toPoint('passive',SAVE_POINTS[1][2]);
  const good=()=>strip({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
  const loaded=runner.load(JSON.stringify(good()));assert.equal(loaded.ok,true,loaded.error);
  const W=sim.timers.wave;assert.ok(W.lullUntil>W.echs[0].brokenAt&&W.ech===0&&W.echs.length===1);
  const gone=sim.enemies.find(a=>sim.man(a).role==='assault'&&sim.man(a).echelon===0);assert.ok(!gone.alive||!gone.active,'the first echelon is off the field in the lull');
  const cases=[
    ['an echelon index past the last',e=>{e.actSave.timers.wave.ech=5;}],
    ['an echelon index without its record',e=>{e.actSave.timers.wave.ech=1;}],
    ['a record missing',e=>{e.actSave.timers.wave.echs.pop();}],
    ['a record added',e=>{e.actSave.timers.wave.echs.push({...e.actSave.timers.wave.echs[0]});}],
    ['the lull of an echelon that has not broken',e=>{e.actSave.timers.wave.echs[0].brokenAt=null;}],
    ['a lull timer in the past of the break',e=>{e.actSave.timers.wave.lullUntil=e.actSave.timers.wave.echs[0].brokenAt-1;}],
    ['a lull timer longer than the lull',e=>{e.actSave.timers.wave.lullUntil=e.actSave.clock+500;}],
    ['a lull timer that is not a number',e=>{e.actSave.timers.wave.lullUntil='soon';}],
    ['a foreign key in the wave record',e=>{e.actSave.timers.wave.extra=1;}],
    ['a key missing from the wave record',e=>{delete e.actSave.timers.wave.closeCalled;}],
    ['a foreign key in an echelon record',e=>{e.actSave.timers.wave.echs[0].extra=1;}],
    ['more casualties than Germans',e=>{e.actSave.timers.wave.casualties=99;}],
    ['negative casualties',e=>{e.actSave.timers.wave.echs[0].casualties=-1;}],
    ['a last break while the first echelon is on',e=>{e.actSave.timers.wave.brokenAt=e.actSave.clock;}],
    ['repelled without a last break',e=>{e.actSave.timers.wave.repelledAt=e.actSave.clock;}],
    ['the start of the fight moved from the first echelon\'s',e=>{e.actSave.timers.wave.at+=1;}],
    ['a start in the future',e=>{e.actSave.timers.wave.echs[0].at=e.actSave.clock+10;}],
    ['no record in a fight that has begun',e=>{e.actSave.timers.wave=null;}],
    ['the flag says repelled',e=>{e.actSave.flags['m01np.wave']='repelled';}],
    ['the flag says active in the lull',e=>{e.actSave.flags['m01np.wave']='active';}],
    ['a man of the second echelon on the field before it came',e=>{e.actSave.actors.find(a=>a.id==='de_np_20').active=true;}],
    ['a man of the second echelon already advanced',e=>{const a=e.actSave.actors.find(a=>a.id==='de_np_20');a.deck.node=1;}],
    ['a man of the second echelon dead before it came',e=>{e.actSave.actors.find(a=>a.id==='de_np_20').alive=false;}],
    ['an overwatch gun of the second echelon already out',e=>{e.actSave.actors.find(a=>a.id==='de_np_29').active=true;}],
    ['a man of the first echelon\'s assault alive on the field in the lull',e=>{const a=e.actSave.actors.find(a=>a.id==='de_np_4');a.alive=true;a.active=true;a.health=100;}],
    ['the checkpoint inside the save with a fight already begun and the flag pending',e=>{e.actSave.resumeCheckpoint.timers.wave=e.actSave.timers.wave;}],
  ];
  for(const [name,mutate] of cases){const e=good();mutate(e);const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,name);assert.match(r.error,/inválid/,`${name}: ${r.error}`);}
  // and the legitimate variants of the same save still load: the lull timer not yet set (the first echelon still falling back), the timer at its two ends
  const early=good();early.actSave.timers.wave.lullUntil=null;assert.equal(runner.load(JSON.stringify(early)).ok,true,'a broken echelon with its men still on the field has no lull timer yet');
  // the lull timer the machine writes is the break plus the lull at the earliest (it starts when the assault is off the field, later than the break): not the break itself
  const lullSec=sim.plan.assault.echelons[1].lullSec,floor=W.echs[0].brokenAt+lullSec;
  for(const at of [floor,W.lullUntil]){const e=good();e.actSave.timers.wave.lullUntil=at;assert.equal(runner.load(JSON.stringify(e)).ok,true,`lull timer ${at}`);}
  for(const at of [W.echs[0].brokenAt,floor-.5]){const e=good();e.actSave.timers.wave.lullUntil=at;const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,`lull timer ${at}`);assert.match(r.error,/lull timer/);}
});

test('schema 3: what the machine never writes is refused with its reason: a man of a broken echelon not falling back, German dead counted that are not dead, a lull timer before break + lull',()=>{
  const runner=new M01ActRunner({enabled:true}),flag=sim=>sim.flags['m01np.wave'];
  const own=(sim,k)=>sim.enemies.filter(a=>a.alive&&a.active&&sim.man(a).echelon===k&&sim.man(a).role==='assault');
  const snap=sim=>strip({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
  const refuse=(sim,name,mutate,reason)=>{const e=snap(sim);mutate(e.actSave);const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,name);assert.match(r.error,/inválid/,name);assert.match(r.error,reason,`${name}: ${r.error}`);};
  const actor=(a,id)=>a.actors.find(x=>x.id===id);
  // (G1) the first echelon has broken and its men are still on the field (falling back): none of them can be in cover, hold or advance
  const early=toPoint('passive',sim=>sim.timers.wave?.echs[0].brokenAt>0&&own(sim,0).length>0&&flag(sim)==='lull').sim;
  assert.equal(runner.load(JSON.stringify(snap(early))).ok,true,'the machine\'s own save, a tick after the break, loads');
  const man=own(early,0)[0];assert.equal(man.deck.phase,'fallback');
  for(const phase of ['cover','hold','advance'])refuse(early,`G1 ${phase}`,a=>{actor(a,man.id).deck.phase=phase;},/after the break of his echelon/);
  // (G3) the last break: everybody on the field is falling back, the overwatch too
  const last=toPoint('passive',SAVE_POINTS[3][2]).sim,gun=last.enemies.find(a=>a.alive&&a.active&&last.man(a).role==='overwatch'),rifle=last.enemies.find(a=>a.alive&&a.active&&last.man(a).role==='assault');
  assert.ok(gun&&gun.deck.phase==='fallback','an overwatch gun is falling back after the last break');
  assert.equal(runner.load(JSON.stringify(snap(last))).ok,true);
  refuse(last,'G3 overwatch holding',a=>{actor(a,gun.id).deck.phase='hold';},/after the last break/);
  if(rifle)refuse(last,'G3 assault in cover',a=>{actor(a,rifle.id).deck.phase='cover';},/after the last break/);
  // (G2, G5) the counts are dead men: the fight's and the echelon's own
  const lull=toPoint('passive',SAVE_POINTS[1][2]).sim,deadOf=(sim,k)=>sim.enemies.filter(a=>!a.alive&&sim.man(a).echelon===k).length,dead=sim=>sim.enemies.filter(a=>!a.alive).length;
  refuse(lull,'G5 the fight counts more than are dead',a=>{a.timers.wave.casualties=dead(lull)+1;},/German dead, only/);
  refuse(lull,'G2 the echelon counts more than its own dead',a=>{a.timers.wave.echs[0].casualties=deadOf(lull,0)+1;},/echelon 0 counts/);
  const second=toPoint('passive',s=>s.timers.wave?.ech===1&&s.timers.wave.echs[1].casualties>0).sim;   // dead of the second echelon: a count of the first echelon cannot borrow them
  refuse(second,'G2 the first echelon borrows the dead of the second',a=>{a.timers.wave.echs[0].casualties=deadOf(second,0)+1;},/echelon 0 counts/);
  assert.equal(runner.load(JSON.stringify(snap(second))).ok,true);
  // (G4) the lull timer is the break plus the lull at the earliest
  refuse(lull,'G4 lull timer at the break',a=>{a.timers.wave.lullUntil=a.timers.wave.echs[0].brokenAt;},/lull timer/);
});

test('schema 3: a save in the second echelon is checked too (who walked in and when, the records, the flag, the men off the field) and tampering is refused',()=>{
  // 4 s in: the first lanes are in, the far lanes still wait at the treeline. Seed 2: a man of the first echelon's assault got away alive and is off the field (the Polish line shoots most of them as they fall back).
  const runner=new M01ActRunner({enabled:true}),{sim}=toPoint('passive',s=>s.timers.wave?.ech===1&&s.clock-s.timers.wave.echs[1].at>4,2);
  const good=()=>strip({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
  const loaded=runner.load(JSON.stringify(good()));assert.equal(loaded.ok,true,loaded.error);
  const W=sim.timers.wave,second=a=>sim.man(a).echelon===1&&sim.man(a).role==='assault';
  const waiting=sim.enemies.find(a=>!a.active&&a.alive&&second(a)),walked=sim.enemies.find(a=>a.active&&a.alive&&second(a)),off=sim.enemies.find(a=>!a.active&&a.alive&&sim.man(a).echelon===0);
  assert.ok(W.ech===1&&W.echs.length===2&&waiting&&walked&&off&&off.deck.phase==='clear','the second echelon is partly in and partly still at the treeline; a man of the first has finished his fall-back');
  const flag=(e,to)=>{e.actSave.flags['m01np.wave']=to;},actor=(e,a)=>e.actSave.actors.find(x=>x.id===a.id);
  const cases=[
    ['the echelon index back at the first, the second record left over',e=>{e.actSave.timers.wave.ech=0;}],
    ['the second echelon earlier than its lull allows',e=>{e.actSave.timers.wave.echs[1].at=e.actSave.timers.wave.echs[0].brokenAt+1;}],
    ['the second echelon in the future',e=>{e.actSave.timers.wave.echs[1].at=e.actSave.clock+5;}],
    ['a second record while the first has not broken',e=>{e.actSave.timers.wave.echs[0].brokenAt=null;}],
    ['the second echelon broken without a last break',e=>{e.actSave.timers.wave.echs[1].brokenAt=e.actSave.clock;}],
    ['a last break while the second echelon has not broken',e=>{e.actSave.timers.wave.brokenAt=e.actSave.clock;}],
    ['repelled without a last break',e=>{e.actSave.timers.wave.repelledAt=e.actSave.clock;}],
    ['a lull timer while the second echelon is on',e=>{e.actSave.timers.wave.lullUntil=e.actSave.clock+5;}],
    ['the flag says lull',e=>flag(e,'lull')],['the flag says broken',e=>flag(e,'broken')],['the flag says pending',e=>flag(e,'pending')],['the flag says repelled',e=>flag(e,'repelled')],
    ['more German dead than Germans',e=>{e.actSave.timers.wave.casualties=99;}],
    ['a count that is not a whole number',e=>{e.actSave.timers.wave.echs[1].casualties=1.5;}],
    ['a key missing from the wave record',e=>{delete e.actSave.timers.wave.closeCalled;}],
    ['a foreign key in the second echelon\'s record',e=>{e.actSave.timers.wave.echs[1].extra=1;}],
    ['a man of the first echelon\'s assault alive on the field',e=>{const a=e.actSave.actors.find(x=>x.id==='de_np_4');a.alive=true;a.active=true;a.health=100;}],
    ['a man waiting at the treeline put on the field before his turn',e=>{actor(e,waiting).active=true;}],
    ['a man waiting at the treeline moved',e=>{actor(e,waiting).x+=1;}],
    ['a man of the second echelon who walked in before his echelon',e=>{const a=actor(e,walked);a.deck.t0=0;a.deck.since=0;}],
    ['a man off the field who did not finish a fall-back',e=>{actor(e,walked).active=false;}],
    ['a man who finished his fall-back, back on the field',e=>{actor(e,off).active=true;}],
    ['a man marked as gone who is on the field',e=>{actor(e,walked).deck.phase='clear';}],
    ['a man of the first echelon waiting at the treeline',e=>{const a=actor(e,off);Object.assign(a,{x:sim.man(off).entry.x,z:sim.man(off).entry.z});Object.assign(a.deck,{phase:'advance',node:0,pinned:0});}],
    ['an actor without its assault record',e=>{delete actor(e,walked).deck;}],
    ['an actor whose life flag is not a boolean',e=>{actor(e,walked).alive='yes';}],
  ];
  for(const [name,mutate] of cases){const e=good();mutate(e);const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,name);assert.match(r.error,/inválid/,`${name}: ${r.error}`);}
  // the validator accepts everything the machine writes: three routes sampled every half second through the first echelon, the lull, the second echelon, the last fall-back and the end
  for(const [mode,level,seed] of [['passive','soldado',19390901],['active','recruta',3],['active','veterano',7]]){
    const s=new M01AreaSimulation(seed,{difficulty:level}),state={arrived:false,lastHealth:100},flags=new Set();
    for(let i=0;i<30000&&!s.mission.complete;i++){
      s.tick(ACT_TICK,actControls(s,mode,state));s.drainEvents();
      if(i%10===0&&s.player.alive){validateAreaSnapshot(strip(s.snapshot()),s.plan);flags.add(s.flags['m01np.wave']);}   // (the tick of a death is not a state the game stores: the next tick restores the checkpoint)
    }
    assert.ok(s.mission.complete,`${mode} ${level} ${seed}`);
    assert.deepEqual([...flags].sort(),['active','broken','lull','pending','repelled'],`${mode} ${level} ${seed}: every state of the fight was sampled`);
  }
});

/** Runs a passive route to the tick in which CP-F is taken (the first echelon breaks). Returns the sim, the pilot's state and every event drained on the way. */
function toCheckpointF(seed=19390901,difficulty='soldado'){
  const sim=new M01AreaSimulation(seed,{difficulty}),state={arrived:false,lastHealth:100},events=[];
  for(let i=0;i<30000&&!sim.checkpointsReached.includes(CP_F);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));events.push(...sim.drainEvents());}
  assert.ok(sim.checkpointsReached.includes(CP_F),'CP-F was taken');
  return {sim,state,events};
}

test('CP-F (Captain\'s decision 2026-11-04): the pause is a checkpoint taken when the first echelon breaks, stored by the game\'s own path, valid, restored with the same future tick for tick',()=>{
  const runner=new M01ActRunner({enabled:true}),{sim,state,events}=toCheckpointF();
  const cps=events.filter(e=>e.type==='checkpoint');
  assert.deepEqual(cps.map(e=>e.id),[CP_E,CP_F],'the game stores sim.checkpoint on each `checkpoint` event: the arrival, then the pause');
  const W=sim.timers.wave,def=sim.definition.checkpoints.find(c=>c.id===CP_F);
  assert.deepEqual([def.label,def.name],['CP-F','Perímetro norte — pausa'],'what the card of the game shows');
  assert.ok(W.echs[0].brokenAt!==null&&sim.clock-W.echs[0].brokenAt<2*ACT_TICK&&sim.flags['m01np.wave']==='lull','taken in the tick the first echelon broke');
  assert.deepEqual(sim.checkpoint.checkpointsReached,[CP_E,CP_F]);assert.equal(sim.respawn.label,'CP-F');assert.equal(sim.checkpoint.player.health,100,'soldado: full health at the checkpoint');
  // valid: the whole save and the wave record by themselves (validApproachWave), the checkpoint inside a later save too
  const cp=strip(sim.checkpoint);validateAreaSnapshot(cp,sim.plan);
  const why=[];assert.equal(validApproachWave(sim.plan.assault,cp.timers.wave,cp.flags['m01np.wave'],cp.clock,cp.actors,why),true,why.join());
  // the game's own path: the envelope of the checkpoint, opened by the runner
  const text=JSON.stringify(runner.envelope(sim)),a=runner.load(text),b=runner.load(text);assert.equal(a.ok,true,a.error);assert.equal(b.ok,true,b.error);
  assert.deepEqual(strip(a.sim.snapshot()),cp);assert.deepEqual(a.sim.checkpointsReached,[CP_E,CP_F]);assert.equal(a.sim.respawn.label,'CP-F');
  // the death path: the running simulation goes on for a while, then restores its own checkpoint; it must be the state the envelope holds, and have the same future
  for(let i=0;i<300;i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  sim.restoreCheckpoint();sim.drainEvents();assert.deepEqual(strip(sim.snapshot()),strip(a.sim.snapshot()),'restoring the checkpoint = loading its envelope');
  const sa={...state},sb={...state},sc={...state};
  for(let i=0;i<1200;i++){
    const ca=actControls(a.sim,'passive',sa),cb=actControls(b.sim,'passive',sb),cc=actControls(sim,'passive',sc);assert.deepEqual(cb,ca);assert.deepEqual(cc,ca);
    a.sim.tick(ACT_TICK,ca);b.sim.tick(ACT_TICK,cb);sim.tick(ACT_TICK,cc);
    const ea=a.sim.drainEvents();assert.deepEqual(b.sim.drainEvents(),ea,`events of tick ${i}`);assert.deepEqual(sim.drainEvents(),ea,`events of tick ${i} (restored by the death path)`);
    if(i%40===0){const s=strip(a.sim.snapshot());assert.deepEqual(strip(b.sim.snapshot()),s,`tick ${i}`);assert.deepEqual(strip(sim.snapshot()),s,`tick ${i} (death path)`);}
  }
  assert.equal(a.sim.checkpointsReached.length,2,'CP-F is not taken twice');
});

test('CP-F: a death in the second echelon returns to the pause (the first echelon already breaking, the second waiting at the treeline again), not to the arrival; the fight then completes',()=>{
  const {sim,state}=toCheckpointF();
  for(let i=0;i<20000&&!(sim.timers.wave.ech===1&&sim.clock-sim.timers.wave.echs[1].at>12);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  assert.equal(sim.timers.wave.ech,1);const diedAt=sim.clock;
  assert.ok(sim.enemies.some(a=>a.active&&sim.man(a).echelon===1),'the second echelon is on the field');
  sim.player.alive=false;sim.player.health=0;sim.playerDown('shot','de_np_29','mg34');
  sim.tick(ACT_TICK,{});assert.ok(sim.drainEvents().some(e=>e.type==='restored'));
  assert.equal(sim.respawn.label,'CP-F');assert.deepEqual(sim.checkpointsReached,[CP_E,CP_F]);assert.ok(sim.clock<diedAt-10,'the clock went back to the pause');
  const W=sim.timers.wave;
  assert.equal(W.ech,0);assert.equal(W.echs.length,1);assert.ok(W.echs[0].brokenAt!==null&&W.brokenAt===null&&W.repelledAt===null,'the first echelon has broken, the fight goes on');
  assert.equal(sim.flags['m01np.wave'],'lull');assert.equal(sim.player.alive,true);assert.equal(sim.player.health,100);
  assert.ok(sim.enemies.filter(a=>sim.man(a).echelon===1).every(a=>a.alive&&!a.active&&a.deck.phase==='advance'),'the second echelon waits off the field again');
  assert.ok(sim.enemies.filter(a=>sim.man(a).echelon===0&&sim.man(a).role==='assault'&&a.alive&&a.active).every(a=>a.deck.phase==='fallback'),'the first echelon\'s assault that is still on the field is falling back');
  validateAreaSnapshot(strip(sim.snapshot()),sim.plan);
  const r=actRoute(sim,{mode:'passive',maxSec:700});assert.equal(r.complete,true);assert.equal(sim.flags['m01np.wave'],'repelled');assert.equal(sim.timers.wave.echs.length,2);
  // and the stored envelope after the death is still CP-F
  assert.equal(new M01ActRunner({enabled:true}).load(JSON.stringify(new M01ActRunner({enabled:true}).envelope(sim))).sim.respawn.label,'CP-F');
});

test('CP-F: tampered saves are refused (a pause checkpoint without the break before it, a checkpoint twice); a save from before CP-F and the suppressive fire still loads and takes CP-F on its next tick, but never with the player outside the bounds',()=>{
  const runner=new M01ActRunner({enabled:true}),snap=sim=>strip({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
  const refuse=(e,name,re=/inválid/)=>{const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,name);assert.match(r.error,re,`${name}: ${r.error}`);};
  // the arrival (nothing begun), the first echelon on the field, the pause
  const spawn=new M01AreaSimulation(19390901,{difficulty:'recruta'});for(let i=0;i<400&&spawn.scene;i++)spawn.tick(ACT_TICK,{skip:true});
  const first=toPoint('active',SAVE_POINTS[0][2]).sim;
  for(const [name,sim] of [['before the fight',spawn],['first echelon on the field',first]]){
    const e=snap(sim);assert.equal(runner.load(JSON.stringify(e)).ok,true,`${name}: the machine's own save loads`);
    e.actSave.checkpointsReached=[CP_E,CP_F];refuse(e,`${name}: CP-F without the break`,/sem a quebra da vaga anterior/);
    e.actSave.checkpointsReached=[CP_E,CP_E];refuse(e,`${name}: a checkpoint twice`);
  }
  const {sim:lull}=toCheckpointF();const e0=snap(lull);assert.equal(runner.load(JSON.stringify(e0)).ok,true);
  e0.actSave.checkpointsReached=[CP_E,CP_F,CP_F];refuse(e0,'CP-F twice');
  // a save from before CP-F (and before the suppressive fire): CP-E only, the checkpoint inside the save is CP-E, the guns have no `seen`
  const cpE=(()=>{const s=new M01AreaSimulation(19390901,{difficulty:'soldado'}),st={arrived:false,lastHealth:100};for(let i=0;i<400&&!s.checkpointsReached.includes(CP_E);i++){s.tick(ACT_TICK,actControls(s,'passive',st));s.drainEvents();}return strip(s.checkpoint);})();
  const old=snap(lull);old.actSave.checkpointsReached=[CP_E];old.actSave.resumeCheckpoint=cpE;for(const a of old.actSave.actors)if(a.team==='enemy')delete a.ai.seen;
  const loaded=runner.load(JSON.stringify(old));assert.equal(loaded.ok,true,loaded.error);const sim=loaded.sim;
  assert.deepEqual(sim.checkpointsReached,[CP_E]);assert.deepEqual(sim.checkpoint.checkpointsReached,[CP_E],'its checkpoint is the arrival');
  // outside the bounds (a countdown running) the pause checkpoint waits: a restored life would end at once
  sim.player.x=-700;sim.timers.boundary=3;sim.lullCheckpoint();assert.deepEqual(sim.checkpointsReached,[CP_E],'not taken outside the bounds');
  sim.player.alive=false;sim.timers.boundary=0;sim.lullCheckpoint();assert.deepEqual(sim.checkpointsReached,[CP_E],'not taken by a dead player');
  sim.player.alive=true;sim.player.x=-410;sim.tick(ACT_TICK,{});
  assert.ok(sim.drainEvents().some(e=>e.type==='checkpoint'&&e.id===CP_F),'taken at the next tick, inside the bounds');
  assert.deepEqual(sim.checkpoint.checkpointsReached,[CP_E,CP_F]);validateAreaSnapshot(strip(sim.checkpoint),sim.plan);
});

test('the decision record of a German is checked: the place a gun last saw a flash (ai.seen) must be a place in the area, a time that has been, and a shooter of the other side',()=>{
  const runner=new M01ActRunner({enabled:true}),{sim}=toCheckpointF();
  const gun=sim.enemies.find(a=>a.weapon==='mg34'),rifle=sim.enemies.find(a=>a.weapon==='kar98k');assert.ok(gun&&rifle);
  const snap=()=>strip({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
  const seen=(e,id,v)=>{e.actSave.actors.find(a=>a.id===id).ai.seen=v;};
  const good={x:-410,y:-3,z:-1159.2,at:sim.clock-1,who:'jan_wrona'};
  const ok=snap();seen(ok,gun.id,good);assert.equal(runner.load(JSON.stringify(ok)).ok,true,'a gun that saw the player\'s flash a second ago');
  const cases=[
    ['a rifleman with a flash mark (only the guns of fire.suppress have one)',e=>seen(e,rifle.id,good)],
    ['a mark with a key missing',e=>seen(e,gun.id,{x:good.x,y:good.y,z:good.z,at:good.at})],
    ['a mark with a key too many',e=>seen(e,gun.id,{...good,extra:1})],
    ['a mark that is not an object',e=>seen(e,gun.id,'there')],
    ['a mark at a time that has not been',e=>seen(e,gun.id,{...good,at:e.actSave.clock+5})],
    ['a mark before the act began',e=>seen(e,gun.id,{...good,at:-1})],
    ['a mark that is not a number',e=>seen(e,gun.id,{...good,x:'NaN'})],
    ['a mark outside the area',e=>seen(e,gun.id,{...good,x:-2000})],
    ['a mark made by a German',e=>seen(e,gun.id,{...good,who:rifle.id})],
    ['a mark made by nobody',e=>seen(e,gun.id,{...good,who:'ghost'})],
    ['a stream that is not a 32-bit number',e=>{e.actSave.actors.find(a=>a.id===gun.id).ai.rng=-1;}],
    ['a record with a foreign key',e=>{e.actSave.actors.find(a=>a.id===gun.id).ai.mood='angry';}],
    ['a record that is not an object',e=>{e.actSave.actors.find(a=>a.id===gun.id).ai=7;}],
  ];
  for(const [name,mutate] of cases){const e=snap();mutate(e);const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,name);assert.match(r.error,/inválid/,`${name}: ${r.error}`);}
});

test('the chain: the completed current act (golden route) hands over to Act VII-a; carry is pure and the seed is derived without drawing',()=>{
  const bw=route(19390901).sim;assert.equal(bw.mission.complete,true);
  const before=bw.snapshot(),on=new M01ActRunner({enabled:true});
  assert.equal(on.next(bw),'act_vii_a_north');assert.equal(new M01ActRunner({enabled:false}).next(bw),null);
  const carry=carryFrom(bw,'act_vii_a_north');validateCarry(carry);assert.deepEqual(bw.snapshot(),before,'carryFrom reads only');
  assert.equal(carry.seed,nextSeed(bw.rng.state,'act_vii_a_north'));assert.deepEqual(carry.weapon,{mag:bw.weapon.mag,reserve:bw.weapon.reserve});
  assert.equal(carry.difficulty,bw.difficulty);assert.ok(carry.events.includes('evt_m01_west_demolition')&&carry.events.includes('evt_m01_east_demolition'));
  const next=on.enter(bw);assert.ok(next instanceof M01AreaSimulation);assert.equal(next.scene.id,'cs_np_entry','the act opens on its transition card');
  assert.ok(next.world.events.includes('evt_m01_west_demolition'),'the bridges stay as the demolitions left them');
  assert.deepEqual(bw.snapshot(),before,'entering the next act does not touch the finished one');
  // The same through a stored completed schema 2 save: Continue opens the next act.
  const loaded=on.load(JSON.stringify(bw.checkpoint));assert.equal(loaded.ok,true);assert.equal(loaded.sim.mission.complete,true);assert.equal(on.next(loaded.sim),'act_vii_a_north');
  assert.deepEqual(strip(on.enter(loaded.sim).snapshot()),strip(next.snapshot()));
  // The debrief belongs to the last act: VII-a has the current act's paragraphs (untouched) and its own, inserted after db_03.
  const ids=next.renderState.debrief.map(p=>p.id),bwIds=definition.debrief.paragraphs.filter(p=>p.enabled).map(p=>p.id);
  assert.deepEqual(ids.filter(id=>id!=='db_np_01'),bwIds);assert.equal(ids.indexOf('db_np_01'),ids.indexOf('db_03')+1);
  for(const p of definition.debrief.paragraphs)assert.equal(next.definition.debrief.paragraphs.find(q=>q.id===p.id).text,p.text);
});

test('QA start: the switch on with startAct makes the area act directly (default carry of the chosen level)',()=>{
  const r=new M01ActRunner({enabled:true,startAct:'vii-a'}),sim=r.createInitial({difficulty:'veterano'});
  assert.ok(sim instanceof M01AreaSimulation);assert.equal(sim.difficulty,'veterano');assert.deepEqual(sim.carry,defaultCarry('veterano'));
  assert.equal(actOf(sim),'act_vii_a_north');assert.equal(new M01ActRunner({enabled:true}).createInitial() instanceof M01Simulation,true);
  assert.throws(()=>new M01ActRunner({enabled:true,startAct:'act_ix'}),/unknown start act/);
  const b=new M01ActRunner({enabled:true,startAct:'vii-b'}).createInitial({difficulty:'soldado'});   // INC-2: ?act=vii-b
  assert.ok(b instanceof M01AreaSimulation);assert.equal(actOf(b),'act_vii_b_north_day');assert.equal(b.difficulty,'soldado');assert.deepEqual(b.carry,defaultCarry('soldado'));assert.equal(b.scene.id,'cs_npb_entry');
  const c=new M01ActRunner({enabled:true,startAct:'vii-c'}).createInitial({difficulty:'veterano'});   // INC-3: ?act=vii-c, which opens on the order's card
  assert.ok(c instanceof M01AreaSimulation);assert.equal(actOf(c),'act_vii_c_withdrawal');assert.equal(c.difficulty,'veterano');assert.deepEqual(c.carry,defaultCarry('veterano'));assert.equal(c.scene.id,'cs_npc_order');
});

test('the act modules stay out of the renderer, the UI, the browser and the wall clock (the boundary of m01-simulation-boundary.test.js)',()=>{
  const IMPORT=/(?:^|\n)\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  const seen=new Set(),queue=['src/game/m01-acts.js','src/game/m01-area-sim.js','src/game/m01-act-factories.js','src/world/m01-area-world.js'].map(f=>join(ROOT,f));
  while(queue.length){const file=queue.pop();if(seen.has(file))continue;seen.add(file);
    for(const m of readFileSync(file,'utf8').matchAll(IMPORT)){const spec=m[1]??m[2];if(spec.startsWith('.')){const t=resolve(dirname(file),spec);if(t.endsWith('.js'))queue.push(t);}else assert.fail(`${relative(ROOT,file)} imports ${spec}`);}}
  const own=new Set(['src/game/m01-acts.js','src/game/m01-area-sim.js','src/game/m01-act-factories.js','src/world/m01-area-world.js','src/game/m01-shell-blast.js','src/game/m01-unit-hash.js','src/game/m01-withdrawal.js']);   // the current act's modules have their own boundary test (INC-2: the shell module and the hash are the new act's, INC-3: the withdrawal module; all are checked here)
  for(const file of seen){const rel=relative(ROOT,file).split(sep).join('/');assert.ok(!rel.startsWith('src/render/')&&!rel.startsWith('src/ui/'),rel);if(!own.has(rel))continue;
    const code=readFileSync(file,'utf8');for(const [re,what] of [[/(?<![.$\w])document\./,'DOM'],[/(?<![.$\w])window\./,'window'],[/\bMath\.random\b/,'Math.random'],[/\bDate\.now\b|\bperformance\.now\b/,'wall clock'],[/\blocalStorage\b/,'storage']])
      assert.doesNotMatch(code,re,`${rel}: ${what}`);}
});
