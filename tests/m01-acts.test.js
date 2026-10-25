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
import {BW_SQUAD_SPEC,makeSquadPlan,squadStep,makeLinePlan,BW_LINE_OPTIONS,makeApproachPlan} from '../src/game/m01-act-factories.js';
import {M01ActRunner,ACTS,ACT_SAVE_SCHEMA,BW_ACT,actsPlan,carryFrom,validateCarry,nextSeed,actOf} from '../src/game/m01-acts.js';
import {M01AreaSimulation,areaActPlan,defaultCarry} from '../src/game/m01-area-sim.js';
import {actControls,actRoute,ACT_TICK} from './helpers/m01-act-route.js';
import {driver,route} from './helpers/m01-route.js';

// R4 INC-1 (WP-0): the act runner, the factories of the section machinery and the saves. The current act (M01Simulation) is a closed box: these tests prove that
// with the switch off nothing reaches it, that schema 2 goes through the very path it always went through, and that the factories return the current act's own plans.
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const strip=s=>JSON.parse(JSON.stringify(s));

test('the shipped switch is OFF and the act table is valid (current act first, one area act after it)',()=>{
  assert.equal(acts.enabled,false,'acts.json enabled=false until the owner accepts the new acts');
  assert.equal(ACTS.enabled,false);assert.deepEqual(ACTS.order,['act_bw_0430_0705','act_vii_a_north']);
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

test('schema 3: a mid-act save restores to the same state and the same future, tick for tick (save/restore identity)',()=>{
  const runner=new M01ActRunner({enabled:true});
  const sim=new M01AreaSimulation(19390901,{difficulty:'soldado'}),state={arrived:false,lastHealth:100};
  for(let i=0;i<5000&&!(sim.timers.wave&&sim.clock-sim.timers.wave.at>20);i++){sim.tick(ACT_TICK,actControls(sim,'active',state));sim.drainEvents();}
  assert.equal(sim.flags['m01np.wave'],'active','the save is taken in the middle of the wave');
  const text=JSON.stringify({schema:ACT_SAVE_SCHEMA,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
  const r=runner.load(text);assert.equal(r.ok,true,r.error);const copy=r.sim;
  assert.deepEqual(strip(copy.snapshot()),strip(sim.snapshot()));
  const sa={...state},sb={...state};
  for(let i=0;i<1200;i++){
    const ca=actControls(sim,'active',sa),cb=actControls(copy,'active',sb);assert.deepEqual(cb,ca);
    sim.tick(ACT_TICK,ca);copy.tick(ACT_TICK,cb);assert.deepEqual(copy.drainEvents(),sim.drainEvents(),`events of tick ${i}`);
    if(i%40===0)assert.deepEqual(strip(copy.snapshot()),strip(sim.snapshot()),`tick ${i}`);
  }
  assert.deepEqual(strip(copy.snapshot()),strip(sim.snapshot()));
  // The runner's own envelope (the checkpoint, CP-E) round-trips too.
  const cp=runner.load(JSON.stringify(runner.envelope(sim)));assert.equal(cp.ok,true,cp.error);assert.deepEqual(strip(cp.sim.snapshot()),strip(sim.checkpoint));
  assert.deepEqual(cp.sim.checkpointsReached,['cp_np_e_perimetro']);
});

test('schema 3: tampered or foreign envelopes are rejected with a message; with the switch off a schema 3 save is refused',()=>{
  const runner=new M01ActRunner({enabled:true,startAct:'vii-a'}),sim=runner.createInitial({difficulty:'recruta'});
  const good=()=>strip({schema:3,missionId:'m01_tczew',act:'act_vii_a_north',carry:sim.carry,actSave:sim.snapshot()});
  assert.equal(runner.load(JSON.stringify(good())).ok,true);
  const cases=[e=>{e.extra=1;},e=>{e.act='act_vii_b';},e=>{e.missionId='m02';},e=>{e.carry.difficulty='heroi';},e=>{e.carry.events.push('rm -rf');},e=>{e.carry.weapon.mag=9;},
    e=>{e.actSave.schema=2;},e=>{e.actSave.actors.pop();},e=>{e.actSave.actors[3].id='de_np_99';},e=>{e.actSave.player.health=150;},e=>{e.actSave.objectives.obj_np_hold_north.state='won';},
    e=>{e.actSave.checkpointsReached=['cp_m01_a_orientacao'];},e=>{e.actSave.actors.find(a=>a.id==='de_np_4').deck.phase='flank';},e=>{e.actSave.timers.squad={move:9,moving:true,since:0};}];
  for(const [i,mutate] of cases.entries()){const e=good();mutate(e);const r=runner.load(JSON.stringify(e));assert.equal(r.ok,false,`case ${i}`);assert.match(r.error,/inválid|desligado/,`case ${i}: ${r.error}`);}
  const off=new M01ActRunner({enabled:false}).load(JSON.stringify(good()));assert.equal(off.ok,false);assert.match(off.error,/desligado/);
  assert.equal(runner.load('{').ok,false);assert.equal(runner.load(null).ok,false);
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
});

test('the act modules stay out of the renderer, the UI, the browser and the wall clock (the boundary of m01-simulation-boundary.test.js)',()=>{
  const IMPORT=/(?:^|\n)\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  const seen=new Set(),queue=['src/game/m01-acts.js','src/game/m01-area-sim.js','src/game/m01-act-factories.js','src/world/m01-area-world.js'].map(f=>join(ROOT,f));
  while(queue.length){const file=queue.pop();if(seen.has(file))continue;seen.add(file);
    for(const m of readFileSync(file,'utf8').matchAll(IMPORT)){const spec=m[1]??m[2];if(spec.startsWith('.')){const t=resolve(dirname(file),spec);if(t.endsWith('.js'))queue.push(t);}else assert.fail(`${relative(ROOT,file)} imports ${spec}`);}}
  const own=new Set(['src/game/m01-acts.js','src/game/m01-area-sim.js','src/game/m01-act-factories.js','src/world/m01-area-world.js']);   // the current act's modules have their own boundary test
  for(const file of seen){const rel=relative(ROOT,file).split(sep).join('/');assert.ok(!rel.startsWith('src/render/')&&!rel.startsWith('src/ui/'),rel);if(!own.has(rel))continue;
    const code=readFileSync(file,'utf8');for(const [re,what] of [[/(?<![.$\w])document\./,'DOM'],[/(?<![.$\w])window\./,'window'],[/\bMath\.random\b/,'Math.random'],[/\bDate\.now\b|\bperformance\.now\b/,'wall clock'],[/\blocalStorage\b/,'storage']])
      assert.doesNotMatch(code,re,`${rel}: ${what}`);}
});
