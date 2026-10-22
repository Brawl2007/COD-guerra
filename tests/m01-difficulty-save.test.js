// H9 D1 (M01-H9-D1-DIFFICULTY-DATA-V1): level table + save/restore plumbing. Since D2 (2026-10-19) the simulation reads the table; recruta must stay
// byte-identical to the pre-H9 simulation (the committed x86 golden in m01-animation-contract.test.js proves it per tick on CI).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {M01_DIFFICULTY,M01_DIFFICULTY_IDS,M01_DIFFICULTY_NEW_GAME,M01_DIFFICULTY_SIM_DEFAULT} from '../src/game/m01-difficulty.js';

const STEP=.05,json=v=>JSON.parse(JSON.stringify(v)),text=v=>JSON.stringify(v);
// A short deterministic session: leave the intro, move and fire a little so the live state differs from the CP-A taken at reset.
const played=(seed,options,ticks=120)=>{
  const sim=new M01Simulation(seed,options);
  for(let t=1;t<=ticks;t++)sim.tick(STEP,{skip:t===1,fire:t===30||t===31,reload:t===70,moveY:t>80?1:0});
  sim.drainEvents();return sim;
};

// The design table (docs/direction/H9_DIFICULDADE.md, section 2), written independently of the module under test.
// 2026-10-19 (H9 D2): soldado and veterano are the CALIBRATED rows (tools/verification/m01-difficulty-sweep.mjs, 24 audit routes; the D35 starting values are kept in
// the design document's calibration note and in m01-difficulty.js). recruta is unchanged.
const loadout={grenades:2,mag:5,reserve:40};
const DESIGN={
  recruta:{id:'recruta',woundChance:{exposed:.2,cover:.06},woundDamage:8,burstWoundCap:null,aimErrorScale:1,cooldownScale:1,
    rifleGateEastThreshold:.5,spansPickPlayerThreshold:.25,deEast0Repair:{share:0,withinSappersM:8},coverAdjustSalvoSec:42,reactionGraceSec:null,
    healing:null,hpOnCheckpoint:null,kowalRounds:30,loadout,bombsLethal:false},
  // 2026-10-22 (H9 D3/D4 recalibration, owner decision): soldado and veterano are re-set to the section 6 bars (tools/verification/m01-danger-sweep.mjs); the D2 rows were
  // soldado .45/.15, 25, aim .85, cooldown .9, grace 1.5 and veterano .8/.3, 40, aim .55, cooldown .7, regen 3/s after 10 s. recruta is unchanged.
  soldado:{id:'soldado',woundChance:{exposed:1,cover:.06},woundDamage:34,burstWoundCap:1,aimErrorScale:.35,cooldownScale:.5,
    rifleGateEastThreshold:.35,spansPickPlayerThreshold:.3,deEast0Repair:{share:.3,withinSappersM:8},coverAdjustSalvoSec:30,reactionGraceSec:1.2,
    healing:{ratePerSec:5,afterUnhitSec:8,cap:100},hpOnCheckpoint:100,kowalRounds:30,loadout,bombsLethal:false},
  veterano:{id:'veterano',woundChance:{exposed:1,cover:.08},woundDamage:50,burstWoundCap:1,aimErrorScale:.35,cooldownScale:.5,
    rifleGateEastThreshold:.25,spansPickPlayerThreshold:.4,deEast0Repair:{share:.5,withinSappersM:8},coverAdjustSalvoSec:20,reactionGraceSec:.8,
    healing:null,hpOnCheckpoint:100,kowalRounds:15,loadout,bombsLethal:false}   // 2026-10-22 owner decision (D35 section 7 item 2): veterano has NO regeneration (was 3/s after 10 s in the D2 calibration)
};
const frozenDeep=(v,path='table')=>{
  if(v&&typeof v==='object'){assert.ok(Object.isFrozen(v),path+' is frozen');for(const [k,item] of Object.entries(v))frozenDeep(item,path+'.'+k);}
};

test('the level table equals the approved design table exactly and is deeply frozen',()=>{
  assert.deepEqual(M01_DIFFICULTY_IDS,['recruta','soldado','veterano']);
  assert.equal(M01_DIFFICULTY_NEW_GAME,'soldado');assert.equal(M01_DIFFICULTY_SIM_DEFAULT,'recruta');
  assert.deepEqual(Object.keys(M01_DIFFICULTY),['recruta','soldado','veterano']);
  for(const id of M01_DIFFICULTY_IDS)assert.deepEqual(M01_DIFFICULTY[id],DESIGN[id],id);
  frozenDeep(M01_DIFFICULTY);assert.ok(Object.isFrozen(M01_DIFFICULTY_IDS));
  assert.throws(()=>{M01_DIFFICULTY.soldado.woundDamage=1;},TypeError);
  assert.throws(()=>{M01_DIFFICULTY.soldado.woundChance.exposed=0;},TypeError);
  assert.throws(()=>{M01_DIFFICULTY.veterano.healing={};},TypeError);
  assert.throws(()=>{M01_DIFFICULTY_IDS.push('lenda');},TypeError);
  assert.equal(M01_DIFFICULTY.soldado.woundDamage,34);assert.equal(M01_DIFFICULTY.veterano.kowalRounds,15);   // 2026-10-22: 34 (was 25 in D2), see DESIGN above
});

test('the shipped design document is the approved copy and states the same table values',()=>{
  const doc=readFileSync(new URL('../docs/direction/H9_DIFICULDADE.md',import.meta.url),'utf8');
  assert.match(doc,/^Desenho aprovado pelo Captain \(D35, ao abrigo de D34\)\. Implementação faseada D1–D5\./);
  const row=name=>doc.split('\n').find(line=>line.startsWith('| '+name));
  const cells=name=>{const line=row(name);assert.ok(line,name);return line.split('|').slice(2,5).map(c=>c.trim());};
  // 2026-10-22: the recalibrated rows (see DESIGN above); the document table carries the same numbers.
  assert.deepEqual(cells('Wound chance on collision, exposed / in cover (585)'),['.20 / .06','1.00 / .06','1.00 / .08']);
  assert.deepEqual(cells('Damage per wound (587)'),['8','34 (3 wounds)','50 (2 wounds)']);
  assert.deepEqual(cells('Aim error ×'),['1.0','0.35','0.35']);
  assert.deepEqual(cells('Cooldown × for fire at the west bank (478–492, 502)'),['1.0','0.50','0.50']);
  assert.deepEqual(cells('Rifle gate shooters: east-only threshold `r()<.5` (488)'),['.50','.35','.25']);
  assert.deepEqual(cells('Spans pick player `r()<.25` (504)'),['.25','.30','.40']);
  assert.deepEqual(cells('Cover-adjust salvo after N s in one cover (700, 707)'),['42','30','20']);
  assert.deepEqual(cells('Kowal resupply pool `timers.kowalRounds` (94, 323)'),['30','30','15']);
});

test('recruta snapshots carry no difficulty key and equal a snapshot built without the option',()=>{
  const plain=played(7),named=played(7,{difficulty:'recruta'}),defaulted=played(7,{});
  for(const sim of [plain,named,defaulted]){
    assert.equal(sim.difficulty,'recruta');
    const full=sim.snapshot();
    assert.ok(full.resumeCheckpoint,'the live state differs from CP-A, so the continuation backup is present');
    assert.equal(Object.hasOwn(full,'difficulty'),false);assert.equal(Object.hasOwn(full.resumeCheckpoint,'difficulty'),false);
    assert.equal(Object.hasOwn(sim.snapshot(false),'difficulty'),false);assert.equal(Object.hasOwn(sim.checkpoint,'difficulty'),false);
    assert.equal(text(full).includes('"difficulty"'),false);
  }
  assert.equal(text(named.snapshot()),text(plain.snapshot()));assert.equal(text(defaulted.snapshot()),text(plain.snapshot()));
  assert.equal(text(new M01Simulation(7,{difficulty:'recruta'}).snapshot()),text(new M01Simulation(7).snapshot()));
  // ticking never adds the key either
  for(let t=0;t<200;t++){plain.tick(STEP,{});named.tick(STEP,{});}
  assert.equal(text(named.snapshot()),text(plain.snapshot()));assert.equal(text(plain.snapshot()).includes('"difficulty"'),false);
});

test('a legacy save without difficulty restores as recruta, even into a harder instance',()=>{
  const legacy=played(11).snapshot();assert.equal(Object.hasOwn(legacy,'difficulty'),false);
  const before=text(legacy);
  for(const level of M01_DIFFICULTY_IDS){
    const target=new M01Simulation(3,{difficulty:level});
    assert.equal(target.restoreSnapshot(legacy),true);assert.equal(text(legacy),before,'the input is not mutated');
    assert.equal(target.difficulty,'recruta',level);assert.equal(Object.hasOwn(target.checkpoint,'difficulty'),false);
    assert.equal(text(target.snapshot()),before,'restore -> snapshot is byte-identical to the legacy save');
  }
  // an explicit "recruta" is accepted and normalises to the omitted form
  const explicit=json(legacy);explicit.difficulty='recruta';explicit.resumeCheckpoint.difficulty='recruta';
  assert.doesNotThrow(()=>validateM01Snapshot(json(explicit)));
  const normal=new M01Simulation();normal.restoreSnapshot(explicit);assert.equal(text(normal.snapshot()),before);
  // a flat CP without a backup (legacy CP-A..D shape) is also recruta
  const flat=played(11).snapshot(false),cp=new M01Simulation(5,{difficulty:'veterano'});
  cp.restoreSnapshot(flat);assert.equal(cp.difficulty,'recruta');assert.equal(text(cp.snapshot(false)),text(flat));
});

for(const level of ['soldado','veterano'])test(`${level}: snapshot -> restore -> snapshot is byte-identical, level and backup checkpoint included`,()=>{
  const fresh=new M01Simulation(21,{difficulty:level});
  assert.equal(fresh.snapshot().difficulty,level);assert.equal(Object.hasOwn(fresh.snapshot(),'resumeCheckpoint'),false,'a fresh sim has no continuation backup');
  assert.equal(fresh.checkpoint.difficulty,level);
  const live=played(21,{difficulty:level}),saved=live.snapshot(),raw=text(saved);
  assert.equal(saved.difficulty,level);assert.equal(saved.schema,2);assert.equal(saved.resumeCheckpoint.difficulty,level);
  assert.equal(Object.hasOwn(saved.resumeCheckpoint,'resumeCheckpoint'),false);
  const restored=new M01Simulation();   // a default (recruta) instance adopts the save's level
  assert.equal(restored.restoreSnapshot(json(saved)),true);
  assert.equal(restored.difficulty,level);assert.equal(restored.checkpoint.difficulty,level);
  assert.equal(text(restored.snapshot()),raw);
  assert.equal(text(restored.checkpoint),text(live.checkpoint));
  // the flat checkpoint round-trips too, and the validator accepts both shapes
  const flat=live.snapshot(false);validateM01Snapshot(json(flat));validateM01Snapshot(json(saved));
  const again=new M01Simulation(99,{difficulty:'soldado'});again.restoreSnapshot(json(flat));assert.equal(again.difficulty,level);assert.equal(text(again.snapshot(false)),text(flat));
  // identical futures after restore, and the level survives death-style restoreCheckpoint()
  for(let t=0;t<80;t++){live.tick(STEP,{moveY:1});restored.tick(STEP,{moveY:1});}
  assert.equal(text(restored.snapshot()),text(live.snapshot()));
  assert.equal(restored.difficulty,level);restored.restoreCheckpoint();assert.equal(restored.difficulty,level);assert.equal(restored.snapshot().difficulty,level);
});

test('the constructor stores the level, rejects unknown ones, and reset() keeps the instance level',()=>{
  for(const level of M01_DIFFICULTY_IDS)assert.equal(new M01Simulation(1,{difficulty:level}).difficulty,level);
  assert.equal(new M01Simulation().difficulty,'recruta');assert.equal(new M01Simulation(5).difficulty,'recruta');
  for(const bad of ['facil','Soldado','',null,42,{},['soldado']])assert.throws(()=>new M01Simulation(1,{difficulty:bad}),RangeError,String(bad));
  const sim=new M01Simulation(8,{difficulty:'veterano'});sim.tick(STEP,{skip:true});sim.reset();
  assert.equal(sim.difficulty,'veterano');assert.equal(sim.snapshot().difficulty,'veterano');assert.equal(sim.checkpoint.difficulty,'veterano');
  assert.equal(new M01Simulation(8,{difficulty:'soldado'}).rng.state,new M01Simulation(8).rng.state,'the level does not consume or reseed the RNG');
});

test('invalid difficulty values are rejected by the validator and restore leaves the target untouched',()=>{
  const valid=played(13,{difficulty:'soldado'}).snapshot();
  const target=new M01Simulation(44),before=text(target.snapshot());
  for(const bad of ['hard','Soldado','SOLDADO',' soldado','',null,42,true,{},['soldado'],'__proto__']){
    for(const where of ['outer','inner']){
      const s=json(valid);if(where==='outer')s.difficulty=bad;else s.resumeCheckpoint.difficulty=bad;
      const raw=text(s);
      assert.throws(()=>validateM01Snapshot(json(s)),/inválido/,where+':'+JSON.stringify(bad));
      assert.throws(()=>target.restoreSnapshot(s),/inválido/);
      assert.equal(text(s),raw,'the rejected input is not mutated');assert.equal(text(target.snapshot()),before,'atomic: target unchanged');
    }
  }
  // a bad outer level on a snapshot without backup
  const flat=json(played(13).snapshot(false));flat.difficulty='hard';assert.throws(()=>validateM01Snapshot(flat),/dificuldade/);
});

test('a resumeCheckpoint whose difficulty differs from the outer save is rejected (absent counts as recruta)',()=>{
  const soldado=played(17,{difficulty:'soldado'}).snapshot(),recruta=played(17).snapshot();
  assert.ok(soldado.resumeCheckpoint&&recruta.resumeCheckpoint);
  // H9 D2 (2026-10-19): veterano's Kowal pool is 15, so a soldado save relabelled veterano also gets veterano's pool (15, nothing taken yet), or the validator rejects it
  // earlier for the pool; the case under test stays the level mismatch alone.
  const asVeteran=st=>{st.difficulty='veterano';st.timers.kowalRounds=15;return st;};
  const cases={
    'soldado outer, veterano backup':s=>{asVeteran(s.resumeCheckpoint);return s;},
    'soldado outer, recruta backup (explicit)':s=>{s.resumeCheckpoint.difficulty='recruta';return s;},
    'soldado outer, backup without difficulty':s=>{delete s.resumeCheckpoint.difficulty;return s;},
    'outer without difficulty, soldado backup':s=>{delete s.difficulty;return s;},
    'outer veterano, soldado backup':s=>{asVeteran(s);return s;}
  };
  const target=new M01Simulation(44),before=text(target.snapshot());
  for(const [name,mutate] of Object.entries(cases)){
    const s=mutate(json(soldado)),raw=text(s);
    assert.throws(()=>validateM01Snapshot(json(s)),/dificuldade do checkpoint de retoma/,name);
    assert.throws(()=>target.restoreSnapshot(s),/inválido/,name);
    assert.equal(text(s),raw);assert.equal(text(target.snapshot()),before,name);
  }
  const outerRecruta=json(recruta);outerRecruta.resumeCheckpoint.difficulty='soldado';
  assert.throws(()=>validateM01Snapshot(outerRecruta),/dificuldade do checkpoint de retoma/);
  const outerExplicit=json(recruta);outerExplicit.difficulty='recruta';assert.doesNotThrow(()=>validateM01Snapshot(outerExplicit),'explicit recruta equals an absent backup level');
  const veteran=json(soldado);asVeteran(veteran);asVeteran(veteran.resumeCheckpoint);
  assert.doesNotThrow(()=>validateM01Snapshot(veteran));
});
