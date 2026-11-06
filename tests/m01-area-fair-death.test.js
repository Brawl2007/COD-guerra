import test from 'node:test';
import assert from 'node:assert/strict';
import {M01AreaSimulation,validateAreaSnapshot} from '../src/game/m01-area-sim.js';
import {M01ActRunner} from '../src/game/m01-acts.js';
import {M01_DIFFICULTY,F1_TELEGRAPH_GAP_SEC} from '../src/game/m01-difficulty.js';
import {actControls,ACT_TICK} from './helpers/m01-act-route.js';
import {actBControls,ACT_B_TICK} from './helpers/m01-act-b-route.js';

// D35 fair-death rule F1 in the area acts (review finding: VII-a/VII-b had no clamp, so a second German's first burst could kill the player at once). Same rule as act 1 (tests/m01-difficulty-wiring.test.js).
// Not a playtest: deterministic checks of the wound rule and a measured pilot run.
const ACTS=['act_vii_a_north','act_vii_b_north_day','act_vii_c_withdrawal'];
const fresh=(difficulty,actId='act_vii_a_north',seed=19390901)=>new M01AreaSimulation(seed,{difficulty,actId});
const round=(sim,by,dt=0,kind='player')=>({by,kind,firedAt:sim.clock+dt,weapon:'kar98k'});

test('F1 in every area act: a lethal wound needs the same shooter engaging the player for reactionGraceSec (gap <= 6 s); a first round or a blind area round only takes him to 1 HP',()=>{
  for(const actId of ACTS)for(const id of ['soldado','veterano']){
    const L=M01_DIFFICULTY[id],tag=`${actId}/${id}`,probe=fresh(id,actId),shooter=probe.enemies[0]??{id:'de_np_0',team:'enemy'},a={id:shooter.id,team:'enemy'};
    let sim=fresh(id,actId);sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id,0,'area'));
    assert.equal(sim.player.health,1,`${tag}: no engagement, no death`);assert.equal(sim.player.alive,true);
    sim=fresh(id,actId);sim.player.health=L.woundDamage;sim.noteTelegraph(a,'player',1,.075);sim.woundPlayer(round(sim,a.id));
    assert.equal(sim.player.health,1,`${tag}: the first aimed round never kills`);
    sim=fresh(id,actId);sim.noteTelegraph(a,'player',1,.075);sim.clock+=L.reactionGraceSec+.2;sim.noteTelegraph(a,'player',1,.075);
    sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));assert.equal(sim.player.health,0,`${tag}: engaged >= grace, lethal`);assert.equal(sim.player.alive,false);
    sim=fresh(id,actId);sim.noteTelegraph(a,'player',1,.075);sim.clock+=F1_TELEGRAPH_GAP_SEC+1;sim.noteTelegraph(a,'player',1,.075);
    sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));assert.equal(sim.player.health,1,`${tag}: a stale engagement does not count`);
    sim=fresh(id,actId);sim.noteTelegraph({id:'de_np_other',team:'enemy'},'player',1,.075);sim.clock+=3;sim.player.health=L.woundDamage;sim.woundPlayer(round(sim,a.id));
    assert.equal(sim.player.health,1,`${tag}: the same shooter`);
  }
  const r=fresh('recruta');r.noteTelegraph({id:'de_np_0',team:'enemy'},'player',1,.075);assert.equal(r.timers.telegraph,undefined,'recruta records no engagement');
});

test('F1 in VII-a on the active pilot (veterano, 3 seeds, 80 s): every lethal wound comes from a shooter engaged for the grace; the engagement record survives a save and a bad one is refused',()=>{
  const grace=M01_DIFFICULTY.veterano.reactionGraceSec;let wounds=0;
  for(const seed of [1,2,3]){
    const sim=new M01AreaSimulation(seed,{difficulty:'veterano',actId:'act_vii_a_north'}),state={},orig=sim.woundPlayer.bind(sim);
    sim.woundPlayer=function(r){
      const e=this.timers.telegraph?.[r.by],before=this.player.health;orig(r);wounds++;
      if(before>0&&this.player.health<=0)assert.ok(e&&r.firedAt-e.first>=grace-1e-9,`seed ${seed} t=${this.clock.toFixed(1)}: lethal round of ${r.by} (kind ${r.kind}) without ${grace} s of engagement`);
    };
    for(let i=0;i<80/ACT_TICK&&!sim.mission.complete;i++){sim.tick(ACT_TICK,actControls(sim,'active',state));sim.drainEvents();}
    if(sim.timers.telegraph){const s=sim.snapshot();validateAreaSnapshot(s);const bad=JSON.parse(JSON.stringify(s));bad.timers.telegraph={nobody:{first:0,last:0}};assert.throws(()=>validateAreaSnapshot(bad),/engajamento/);}
  }
  assert.ok(wounds>0,'the pilot was wounded at least once (the check ran)');
});

// "Continuar em nível mais baixo" on an area act (game.js continueLowerLevel -> sim.lowerDifficulty -> persistCheckpoint). Review regression of the first F1 port: the pause checkpoint of VII-a and VII-b holds the
// engagement record (timers.telegraph: soldado and veterano state) and validateAreaSnapshot refuses it on recruta, so lowerDifficulty('recruta') threw «registo de engajamento» and left the simulation at recruta
// over a soldado state. The natural flow: the active pilot, seed 2, soldado. VII-a's pause (CP-F) is taken at t = 50.7 s and VII-b's (CP-I2) at t = 110.85 s, each with a German engaged; the player goes on, dies, takes the offer.
const PAUSES=[{actId:'act_vii_a_north',controls:actControls,tick:ACT_TICK,cp:'cp_np_f_pausa'},{actId:'act_vii_b_north_day',controls:actBControls,tick:ACT_B_TICK,cp:'cp_npb_i2_pausa'}];
const json=x=>JSON.parse(JSON.stringify(x));
/** The active pilot to the tick the pause checkpoint is taken (the first echelon has broken); the checkpoint must hold an engagement record, or this is not the flow under test. */
function toPause(P,difficulty,seed=2){
  const sim=new M01AreaSimulation(seed,{difficulty,actId:P.actId}),state={},tag=`${P.actId}/${difficulty}/${seed}`;
  for(let i=0;i<40000&&!sim.checkpointsReached.includes(P.cp);i++){sim.tick(P.tick,P.controls(sim,'active',state));sim.drainEvents();}
  assert.ok(sim.checkpointsReached.includes(P.cp),`${tag}: ${P.cp} taken`);
  assert.ok(Object.keys(sim.checkpoint.timers.telegraph??{}).length>0,`${tag}: the checkpoint holds an engagement record`);
  return {sim,state};
}
const play=(sim,P,state,ticks)=>{for(let i=0;i<ticks;i++){sim.tick(P.tick,P.controls(sim,'active',state));sim.drainEvents();}};

test('lowerDifficulty on an area act, the natural flow (active pilot, seed 2, soldado): the pause checkpoint lowers to recruta without the engagement record, restores, reopens from its envelope and plays on like the same save loaded fresh',()=>{
  const runner=new M01ActRunner({enabled:true});
  for(const P of PAUSES){
    const {sim,state}=toPause(P,'soldado'),tag=P.actId,before=json(sim.checkpoint);
    assert.throws(()=>validateAreaSnapshot({...json(before),difficulty:'recruta'},sim.plan),/engajamento/,`${tag}: the validator still refuses the record on recruta (the lowering is what drops it)`);
    play(sim,P,state,200);assert.ok(sim.clock>before.clock+9,`${tag}: the player went on after the checkpoint`);
    sim.lowerDifficulty('recruta');   // used to throw «Checkpoint do ato inválido: registo de engajamento»
    // the level is lowered everywhere it is kept, and the state is the checkpoint's minus the record only soldado and veterano write
    for(const level of [sim.difficulty,sim.carry.difficulty,sim.checkpoint.difficulty,sim.respawn.difficulty])assert.equal(level,'recruta',tag);
    const expected=json(before);expected.difficulty='recruta';delete expected.timers.telegraph;
    assert.equal(sim.clock,before.clock,`${tag}: restored to the checkpoint`);assert.deepEqual(json(sim.checkpoint),expected,tag);assert.deepEqual(json(sim.snapshot()),expected,`${tag}: the running state is the checkpoint's`);
    validateAreaSnapshot(json(sim.snapshot()),sim.plan);validateAreaSnapshot(json(sim.checkpoint),sim.plan);
    // the game's own path (persistCheckpoint stores the envelope, Continue opens it) gives the lowered game
    const opened=runner.load(JSON.stringify(runner.envelope(sim)));assert.equal(opened.ok,true,opened.error);assert.equal(opened.sim.difficulty,'recruta',tag);
    assert.deepEqual(json(opened.sim.snapshot()),expected,`${tag}: the envelope reopens as the lowered game`);
    // and it plays on like the same re-levelled save loaded into a fresh simulation, tick for tick (the lowering draws nothing)
    const twin=new M01AreaSimulation(2,{difficulty:'recruta',actId:P.actId});twin.restoreSnapshot(json(expected));
    const sa={...state},sb={...state};
    for(let i=0;i<400;i++){
      const ca=P.controls(sim,'active',sa),cb=P.controls(twin,'active',sb);assert.deepEqual(cb,ca,`${tag}: controls of tick ${i}`);
      sim.tick(P.tick,ca);twin.tick(P.tick,cb);assert.deepEqual(twin.drainEvents(),sim.drainEvents(),`${tag}: events of tick ${i}`);
      if(i%40===0)assert.deepEqual(json(twin.snapshot()),json(sim.snapshot()),`${tag}: tick ${i}`);
    }
    assert.equal(sim.timers.telegraph,undefined,`${tag}: recruta records no engagement`);
  }
});

test('lowerDifficulty on an area act: veterano -> soldado keeps the engagement record (valid on both levels), soldado -> recruta drops it, veterano -> recruta in one step is the same save; a refusal changes nothing',()=>{
  for(const P of PAUSES){
    const {sim}=toPause(P,'veterano'),tag=P.actId,rec=json(sim.checkpoint.timers.telegraph);
    sim.lowerDifficulty('soldado');   // the offer is always the next level down
    assert.equal(sim.difficulty,'soldado',tag);assert.equal(sim.checkpoint.difficulty,'soldado',tag);
    assert.deepEqual(sim.checkpoint.timers.telegraph,rec,`${tag}: the record stays between the two hard levels`);assert.deepEqual(sim.timers.telegraph,rec,tag);
    validateAreaSnapshot(json(sim.snapshot()),sim.plan);validateAreaSnapshot(json(sim.checkpoint),sim.plan);
    sim.lowerDifficulty('recruta');
    assert.equal(sim.difficulty,'recruta',tag);assert.equal(sim.checkpoint.timers.telegraph,undefined,tag);assert.equal(sim.timers.telegraph,undefined,tag);
    validateAreaSnapshot(json(sim.snapshot()),sim.plan);validateAreaSnapshot(json(sim.checkpoint),sim.plan);
    const direct=toPause(P,'veterano').sim;direct.lowerDifficulty('recruta');
    assert.deepEqual(json(direct.checkpoint),json(sim.checkpoint),`${tag}: veterano -> recruta in one step is the same save`);assert.deepEqual(json(direct.snapshot()),json(sim.snapshot()),tag);
    // never up, never the same, never an unknown level; a refused call leaves the simulation as it was
    const snap=JSON.stringify(sim.snapshot()),cp=JSON.stringify(sim.checkpoint);
    for(const bad of ['recruta','soldado','veterano','lenda',undefined,null])assert.throws(()=>sim.lowerDifficulty(bad),RangeError,`${tag}: ${String(bad)}`);
    assert.equal(JSON.stringify(sim.snapshot()),snap,tag);assert.equal(JSON.stringify(sim.checkpoint),cp,tag);
  }
  // a checkpoint the validator refuses (no build could have written it) refuses the lowering and leaves the level, the carry and the state as they were (it used to leave the simulation at the lower level)
  const {sim}=toPause(PAUSES[0],'soldado');sim.checkpoint.player.health=0;
  const snap=JSON.stringify(sim.snapshot()),cp=JSON.stringify(sim.checkpoint);
  assert.throws(()=>sim.lowerDifficulty('recruta'),/jogador/);
  assert.equal(sim.difficulty,'soldado');assert.equal(sim.carry.difficulty,'soldado');assert.equal(JSON.stringify(sim.snapshot()),snap);assert.equal(JSON.stringify(sim.checkpoint),cp);
});
