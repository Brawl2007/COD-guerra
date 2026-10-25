// H9 D3 (2026-10-22): death with a cause (F5), the new checkpoint CP-B2 "Reparo" (soldado and veterano only), health at a checkpoint, and "continuar em nível mais baixo" (the checkpoint is
// restored as a save of the lower level, never a higher one). The simulation decides everything here; the presentation (game.js, the death beat) is tests/m01-difficulty-death-ui.test.js.
// Veterano has no regeneration since the owner's decision of 2026-10-22 (tests/m01-difficulty-wiring.test.js: the regen test reads the table).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot,relevelSnapshot} from '../src/game/m01-simulation.js';
import {M01_DIFFICULTY,M01_DIFFICULTY_IDS,M01_CHECKPOINT_B2,M01_DEATH_CAUSES,checkpointApplies,lowerLevelOf,deathText} from '../src/game/m01-difficulty.js';
import {validateM01AudioEvent} from '../src/game/m01-audio-events.js';
import {driver,toRepair,route} from './helpers/m01-route.js';
import {atLevel,phaseStart} from './helpers/m01-danger.js';

const STEP=.05,json=v=>JSON.parse(JSON.stringify(v)),text=v=>JSON.stringify(v);
const level=difficulty=>class extends M01Simulation{constructor(seed){super(seed,{difficulty});}};
const fresh=(difficulty='recruta',seed=11)=>{const sim=new M01Simulation(seed,{difficulty});sim.tick(STEP,{skip:true});sim.drainEvents();return sim;};
// A lethal round of `by` that the F1 rule lets kill (the same shooter has engaged the player for longer than the grace): soldado and veterano need it, recruta ignores the record.
function lethal(sim,by='de_east_1'){
  sim.scene=null;   // F4 (no lethal wound in a cutscene) has its own test in m01-fair-death.test.js; a checkpoint can be saved while cs_m01_east_blast still runs
  const a={id:by,team:'enemy'},L=sim.level;sim.noteTelegraph(a,'player',1,.075);sim.clock+=(L.reactionGraceSec??0)+.3;sim.noteTelegraph(a,'player',1,.075);
  sim.player.health=Math.min(sim.player.health,L.woundDamage);sim.woundPlayer({by,kind:'player',weapon:by==='de_east_0'||by==='de_east_1'?'mg34':'kar98k',firedAt:sim.clock});
}
let completed;const full=()=>completed??=route();

test('F5 death texts: the shooter is named by his place; the fall, the river and the boundary keep the strings they had',()=>{
  assert.equal(deathText('shot','de_east_0','mg34'),'Abatido pela MG34 do dique (portões).');
  assert.equal(deathText('shot','de_east_1','mg34'),'Abatido pela MG34 do dique (portões).');
  assert.equal(deathText('shot','de_east_1'),'Abatido pela MG34 do dique (portões).');
  assert.equal(deathText('shot','de_east_2','kar98k'),'Abatido por um atirador Kar98k dos portões.');
  assert.equal(deathText('shot','de_east_13','kar98k'),'Abatido por um atirador Kar98k dos portões.');
  assert.equal(deathText('shot','de_east_14','kar98k'),'Abatido por um atirador Kar98k do dique.');
  assert.equal(deathText('shot','de_east_39','kar98k'),'Abatido por um atirador Kar98k do dique.');
  assert.equal(deathText('shot','de_spans_3','kar98k'),'Abatido por um atirador Kar98k do tabuleiro.');
  assert.equal(deathText('shot',null),'Abatido pelo fogo alemão.');
  assert.equal(deathText('grenade'),'Morto pela própria granada.');
  assert.equal(deathText('fall'),'Você caiu de uma altura fatal.');assert.equal(deathText('water'),'Você caiu no Vístula.');assert.equal(deathText('bounds'),'Você se afastou da sua secção.');
  for(const cause of M01_DEATH_CAUSES)assert.ok(deathText(cause,'de_east_0','mg34').length>10,cause);
  assert.deepEqual([...M01_DEATH_CAUSES],['shot','grenade','fall','water','bounds']);
});

test('the player-down event is validated: a known cause, the text, and a German id or null',()=>{
  const ok={type:'player-down',cause:'shot',by:'de_east_0',text:'Abatido pela MG34 do dique (portões).'};
  assert.equal(validateM01AudioEvent(ok),ok);assert.doesNotThrow(()=>validateM01AudioEvent({type:'player-down',cause:'fall',by:null,text:'Você caiu de uma altura fatal.'}));
  for(const bad of [{cause:'burn'},{text:''},{text:7},{by:'marek_zielinski'},{by:undefined},{cause:undefined}])assert.throws(()=>validateM01AudioEvent({...ok,...bad}),/player-down/,JSON.stringify(bad));
});

test('a lethal wound on every level: failure with the shooter, one player-down, the next tick restores the checkpoint exactly and says why; no draw',()=>{
  for(const id of M01_DIFFICULTY_IDS){
    const sim=fresh(id),saved=json(sim.checkpoint),state=sim.rng.state;
    lethal(sim,'de_east_1');
    assert.equal(sim.player.alive,false,id);assert.equal(sim.player.health,0,id);assert.equal(sim.failure,'Abatido pela MG34 do dique (portões).',id);
    const events=sim.drainEvents(),down=events.filter(e=>e.type==='player-down');
    assert.equal(down.length,1,id);assert.deepEqual(down[0],{type:'player-down',cause:'shot',by:'de_east_1',text:sim.failure});
    assert.ok(events.findIndex(e=>e.type==='player-hit')<events.findIndex(e=>e.type==='player-down'),'the wound, then the death');
    assert.equal(sim.rng.state,state,`${id}: the death draws nothing`);
    sim.tick(STEP,{});   // the simulation decided; the presentation had its beat; this tick restores
    const after=sim.drainEvents();
    assert.deepEqual(after.map(e=>e.type),['restored','message'],id);assert.equal(after[1].message,'Abatido pela MG34 do dique (portões).',id);
    assert.equal(sim.player.alive,true);assert.deepEqual(sim.snapshot(),saved,`${id}: back at the checkpoint, byte for byte`);
    assert.equal(sim.difficulty,id);
  }
});

test('the fall, the river, the boundary and the own grenade each say why, with one player-down',()=>{
  const kills={
    fall:s=>s.playerLanded({speed:20,drop:20,damage:100,surface:'ground',x:s.player.x,y:s.player.y,z:s.player.z}),
    water:s=>{s.player.y=-10;s.timers.water=7.99;s.boundaries(.05);},
    bounds:s=>{s.player.x=410;s.timers.boundary=7.99;s.boundaries(.05);},
    grenade:s=>{s.player.health=40;s.grenades.active.push({id:'m01_grenade_9',x:s.player.x,y:s.player.y+.5,z:s.player.z,vx:0,vy:0,vz:0,fuse:.01});s.updateGrenades(.05,false);}
  };
  for(const id of M01_DIFFICULTY_IDS)for(const [cause,kill] of Object.entries(kills)){
    const sim=fresh(id);kill(sim);
    assert.equal(sim.player.alive,false,`${id}/${cause}`);assert.equal(sim.failure,deathText(cause),`${id}/${cause}`);
    const down=sim.drainEvents().filter(e=>e.type==='player-down');assert.equal(down.length,1,`${id}/${cause}`);assert.deepEqual(down[0],{type:'player-down',cause,by:null,text:sim.failure});
    if(cause==='bounds'||cause==='water'){sim.boundaries(.05);sim.boundaries(.05);assert.equal(sim.drainEvents().filter(e=>e.type==='player-down').length,0,'once per death');}
    sim.tick(STEP,{});assert.ok(sim.drainEvents().some(e=>e.type==='message'&&e.message===deathText(cause)),`${id}/${cause}: the restore says why`);
  }
});

test('CP-B2 "Reparo": in the mission data, saved when the crate starts the repair on soldado and veterano, never on recruta; full health; death restores to it',()=>{
  const mission=JSON.parse(readFileSync(new URL('../missions/m01-tczew/mission.json',import.meta.url),'utf8')),ids=mission.checkpoints.map(c=>c.id);
  const cp=mission.checkpoints.find(c=>c.id===M01_CHECKPOINT_B2);
  assert.deepEqual(ids,['cp_m01_a_orientacao','cp_m01_b_reorganizacao','cp_m01_b2_reparo','cp_m01_c_engenheiros','cp_m01_d_retirada']);
  assert.equal(cp.label,'CP-B2');assert.deepEqual(cp.trigger,{objective:'obj_m01_cover_repair'});assert.equal(cp.player.positionPolicy,'current');assert.equal(cp.clock,'current');
  assert.deepEqual(cp.restore.objectives,{done:['obj_m01_deliver_message','obj_m01_take_cover','obj_m01_follow_sergeant','obj_m01_find_sappers','obj_m01_fetch_material'],active:['obj_m01_cover_repair']});
  assert.ok(cp.neverSaveIf);assert.match(cp.difficultyPolicy,/soldado e veterano/);
  assert.deepEqual(M01_DIFFICULTY_IDS.filter(l=>checkpointApplies(M01_CHECKPOINT_B2,l)),['soldado','veterano']);
  for(const id of ids.filter(i=>i!==M01_CHECKPOINT_B2))assert.ok(M01_DIFFICULTY_IDS.every(l=>checkpointApplies(id,l)),id);
  for(const id of M01_DIFFICULTY_IDS){
    const d=toRepair(driver(19390901,{Simulation:level(id)})),{sim}=d;
    if(id==='recruta'){
      assert.deepEqual(sim.checkpointsReached,['cp_m01_a_orientacao','cp_m01_b_reorganizacao']);assert.equal(sim.pendingCheckpoint,null);assert.equal(sim.respawn.id,'cp_m01_b_reorganizacao');
      assert.ok(!Object.hasOwn(d.checkpoints,M01_CHECKPOINT_B2));continue;
    }
    assert.deepEqual(sim.checkpointsReached,['cp_m01_a_orientacao','cp_m01_b_reorganizacao',M01_CHECKPOINT_B2],id);assert.equal(sim.pendingCheckpoint,null,id);
    const saved=d.checkpoints[M01_CHECKPOINT_B2];validateM01Snapshot(saved);
    assert.equal(saved.difficulty,id);assert.equal(saved.player.health,100);assert.equal(saved.player.carrying,null);assert.equal(saved.objectives.obj_m01_cover_repair.state,'active');
    assert.ok(saved.objectives.obj_m01_cover_repair.progress<1,'the repair has just begun (the tick of the delivery already worked 1/3000 of it)');assert.equal(saved.objectives.obj_m01_fetch_material.state,'done');assert.equal(saved.pendingCheckpoint,null);
    assert.deepEqual(saved.checkpointsReached,[...sim.checkpointsReached]);assert.deepEqual(json(sim.checkpoint),json(saved),'the respawn point is CP-B2');
    assert.deepEqual({...sim.respawn},{id:M01_CHECKPOINT_B2,label:'CP-B2',name:'Reparo',difficulty:id});
    assert.equal(sim.battleClock,saved.battleClock,'saved at the tick of the delivery');
    // hurt, then dead: the next tick restores CP-B2 (health 100), not CP-B
    sim.player.health=13;lethal(sim,'de_east_1');assert.equal(sim.player.alive,false);sim.drainEvents();sim.tick(STEP,{});
    assert.deepEqual(sim.snapshot(),saved,`${id}: restored at CP-B2`);assert.equal(sim.player.health,100);
    // the hurt player reaching a checkpoint is healed: the same save of the same state, with 40 health, is 100
    const hurt=fresh(id);hurt.player.health=40;hurt.saveCheckpoint('cp_m01_b_reorganizacao');assert.equal(hurt.checkpoint.player.health,100);
  }
});

test('death restores CP-C and CP-D on every level (a checkpoint of the recruta route re-levelled), with the cause and the full state of the save',()=>{
  const {checkpoints}=full();
  for(const id of ['cp_m01_c_engenheiros','cp_m01_d_retirada'])for(const lvl of M01_DIFFICULTY_IDS){
    const saved=atLevel(checkpoints[id],lvl),sim=new M01Simulation(1,{difficulty:lvl});sim.restoreSnapshot(saved);sim.drainEvents();
    assert.equal(sim.respawn.id,id);assert.equal(sim.respawn.difficulty,lvl);
    lethal(sim,'de_east_20');assert.equal(sim.failure,'Abatido por um atirador Kar98k do dique.');
    sim.drainEvents();sim.tick(STEP,{});assert.deepEqual(sim.snapshot(false),json(sim.checkpoint));assert.deepEqual(json(sim.snapshot(false)),json(saved),`${id}/${lvl}`);
    assert.equal(sim.difficulty,lvl);
  }
});

test('old saves still load: a soldado save without CP-B2 (made before D3) and a legacy save without difficulty; the soldado one gets CP-B2 only when the crate arrives',()=>{
  const hold=atLevel(phaseStart(1,'hold'),'soldado');   // the hold phase starts at CP-C (05:34): A, B and C reached, and no CP-B2 (this save is of a recruta route re-levelled, as a pre-D3 soldado save would be)
  assert.deepEqual(hold.checkpointsReached,['cp_m01_a_orientacao','cp_m01_b_reorganizacao','cp_m01_c_engenheiros']);assert.equal(Object.hasOwn(hold,'resumeCheckpoint'),false);
  const sim=new M01Simulation(5);assert.deepEqual(sim.loadCheckpoint(text(hold)),{ok:true});assert.equal(sim.difficulty,'soldado');
  for(let i=0;i<200;i++)sim.tick(STEP,{});validateM01Snapshot(sim.snapshot());assert.ok(!sim.checkpointsReached.includes(M01_CHECKPOINT_B2));
  // a soldado save made while the repair was running (CP-B2 never saved): loads, plays, no CP-B2 appears (the crate was delivered long before)
  const repair=atLevel(phaseStart(1,'repair'),'soldado');const mid=new M01Simulation(5);assert.deepEqual(mid.loadCheckpoint(text(repair)),{ok:true});
  for(let i=0;i<200;i++)mid.tick(STEP,{});assert.ok(!mid.checkpointsReached.includes(M01_CHECKPOINT_B2));
  // a legacy save (no difficulty, no CP-B2) is recruta and stays byte for byte what it was
  const legacy=phaseStart(1,'hold');assert.equal(Object.hasOwn(legacy,'difficulty'),false);
  const old=new M01Simulation(9,{difficulty:'veterano'});old.restoreSnapshot(legacy);assert.equal(old.difficulty,'recruta');assert.equal(text(old.snapshot(false)),text(legacy));
  // a recruta save that mentions CP-B2 (it was reached on a harder level and lowered) is valid too
  const lowered=json(legacy);lowered.checkpointsReached.splice(2,0,M01_CHECKPOINT_B2);validateM01Snapshot(lowered);
  assert.throws(()=>validateM01Snapshot({...json(legacy),checkpointsReached:['cp_m01_b3_nao_existe']}),/checkpoint/);
});

test('lowerDifficulty: the checkpoint is restored as a save of the next lower level; veterano gives back its Kowal rounds; a level is never raised',()=>{
  assert.equal(lowerLevelOf('veterano'),'soldado');assert.equal(lowerLevelOf('soldado'),'recruta');assert.equal(lowerLevelOf('recruta'),null);assert.equal(lowerLevelOf('lenda'),null);
  // veterano at CP-B2 with 5 of Kowal's 15 rounds already taken (kowalRounds 10, received 5; the five were fired: shotCount 5)
  const d=toRepair(driver(1,{Simulation:level('veterano')})),vet=d.sim,cp=vet.checkpoint;
  cp.timers.kowalRounds=10;cp.weapon.received=5;cp.weapon.shotCount=5;validateM01Snapshot(cp);vet.restoreCheckpoint();
  const before=json(vet.checkpoint),rng=vet.rng.state;
  assert.equal(vet.lowerDifficulty('soldado'),true);
  assert.equal(vet.difficulty,'soldado');assert.equal(vet.checkpoint.difficulty,'soldado');assert.equal(vet.timers.kowalRounds,25,'the rounds taken stay taken: 30 - 5');assert.equal(vet.weapon.received,5);
  assert.equal(vet.rng.state,rng,'re-levelling draws nothing');assert.equal(vet.player.alive,true);assert.equal(vet.respawn.id,M01_CHECKPOINT_B2);assert.equal(vet.respawn.difficulty,'soldado');
  validateM01Snapshot(vet.snapshot());validateM01Snapshot(vet.checkpoint);
  // the saved state is the same state except the level (the key, the pool) and nothing else
  const strip=s=>{const c=json(s);delete c.difficulty;delete c.timers.kowalRounds;return c;};assert.deepEqual(strip(vet.checkpoint),strip(before));
  // soldado -> recruta: the key goes away, and so does the state only soldado and veterano write
  vet.timers.lastHitAt=vet.clock;vet.timers.telegraph={de_east_1:{first:vet.clock-2,last:vet.clock}};vet.timers.burstWound={by:'de_east_1',at:vet.clock,n:1};vet.saveCheckpoint('cp_m01_c_engenheiros');
  assert.ok('telegraph' in vet.checkpoint.timers);
  assert.equal(vet.lowerDifficulty('recruta'),true);assert.equal(vet.difficulty,'recruta');
  for(const k of ['lastHitAt','burstWound','telegraph'])assert.ok(!(k in vet.checkpoint.timers),k);assert.equal(Object.hasOwn(vet.checkpoint,'difficulty'),false);assert.equal(Object.hasOwn(vet.snapshot(),'difficulty'),false);
  assert.equal(vet.timers.kowalRounds,25);validateM01Snapshot(vet.snapshot());
  // never up, never the same, never an unknown level; a refused call leaves the simulation as it was
  const snap=text(vet.snapshot()),cpText=text(vet.checkpoint);
  for(const bad of ['recruta','soldado','veterano','lenda',undefined,null])assert.throws(()=>vet.lowerDifficulty(bad),RangeError,String(bad));
  assert.equal(text(vet.snapshot()),snap);assert.equal(text(vet.checkpoint),cpText);
  const sol=new M01Simulation(3,{difficulty:'soldado'});assert.throws(()=>sol.lowerDifficulty('veterano'),RangeError);assert.throws(()=>sol.lowerDifficulty('soldado'),RangeError);assert.equal(sol.lowerDifficulty('recruta'),true);
  assert.throws(()=>relevelSnapshot(json(sol.checkpoint),'veterano'),RangeError);
});

test('relevelSnapshot is pure; a lowered game replays identically to the same save loaded fresh',()=>{
  const raw=atLevel(phaseStart(2,'hold'),'veterano');raw.timers.lastHitAt=raw.clock-30;raw.timers.telegraph={};const before=text(raw);
  const lowered=relevelSnapshot(raw,'soldado');assert.equal(text(raw),before,'the input is not touched');assert.equal(lowered.difficulty,'soldado');assert.equal(lowered.timers.kowalRounds,30);
  const a=new M01Simulation(1,{difficulty:'veterano'});a.restoreSnapshot(raw);a.drainEvents();assert.equal(a.lowerDifficulty('soldado'),true);
  const b=new M01Simulation(2);b.restoreSnapshot(lowered);
  assert.equal(text(a.snapshot(false)),text(b.snapshot(false)));
  for(let i=0;i<400;i++){a.tick(STEP,{});b.tick(STEP,{});}
  assert.equal(text(a.snapshot()),text(b.snapshot()),'identical futures');
  assert.equal(relevelSnapshot(raw,'veterano').difficulty,'veterano','the same level is a plain copy');
  // a save with a continuation backup is lowered together with its backup (the validator wants the same level in both)
  const withBackup=json(raw);withBackup.resumeCheckpoint=json(raw);validateM01Snapshot(withBackup);
  const both=relevelSnapshot(withBackup,'recruta');assert.equal(Object.hasOwn(both,'difficulty'),false);assert.equal(Object.hasOwn(both.resumeCheckpoint,'difficulty'),false);validateM01Snapshot(both);
});
