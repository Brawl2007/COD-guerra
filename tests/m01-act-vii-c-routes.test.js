import test from 'node:test';
import assert from 'node:assert/strict';
import {M01AreaSimulation} from '../src/game/m01-area-sim.js';
import {M01ActRunner} from '../src/game/m01-acts.js';
import {actCRoute} from './helpers/m01-act-c-route.js';
import {stackingAudit} from './helpers/m01-clipping.js';
import {areaClippingAudit} from './helpers/m01-act-audit.js';

// R4 INC-3 (2026-11-04): the routes of Act VII-c. Two scripted pilots (tests/helpers/m01-act-c-route.js: the prompt one goes to the parapet, kneels there while the line leaves and goes to the exit band with the
// rear guard, the laggard one stays at the spawn until the rear guard has been on its way for 70 s and then walks to the band) x the three levels x three seeds, on the whole act: both cards, the courier, the order, the
// section's climb, the line's bounds, CP-K, the rear guard's bounds, the exit, the end beat and the end card. Pilots are not players and a pass here is not a playtest: it guards the data and the machine against a route that
// cannot finish, men walking through each other or through earth, a man who never leaves the field, an enemy that is not there, and a duration that has left the 3-5 minutes the design asks for (the cards the
// pilot skips after a second are 24 s on the screen of a player; tests/m01-act-vii-c.test.js has the rest). The men of the act do not depend on the player, the level or the seed (a test there proves it), so what
// these 18 routes add to one is the player's side: the end waits for him, the call to a man who lags, the checkpoints and the cards.
const ID='act_vii_c_withdrawal';
const CARDS_SEC=9+6+9;   // the three cards at their full length (the pilots skip each after a second)
const MIN_ACT_SEC=170,MAX_ACT_SEC=270;   // the guard band of the act clock with the cards skipped; the measured numbers are in the evidence README

test('Act VII-c completes on 18 routes (prompt and laggard pilot x 3 levels x 3 seeds): the courier, the order, the line and the ckm crew out by bounds (CP-K), the rear guard out, the exit, no German anywhere, no clipping, no men inside each other, a duration of 3-5 minutes',{timeout:1800000},t=>{
  const table=[];
  for(const mode of ['prompt','laggard'])for(const d of ['recruta','soldado','veterano'])for(const seed of [19390901,3,7]){
    const id=`${mode} ${d} ${seed}`,sim=new M01AreaSimulation(seed,{difficulty:d,actId:ID}),clip=areaClippingAudit(),stack=stackingAudit();
    const causes=[];const said=[];const say=sim.say.bind(sim);sim.say=on=>{const r=say(on);if(r)said.push(on);return r;};
    const r=actCRoute(sim,{mode,maxSec:900,onEvent:e=>{if(e.type==='player-down')causes.push(e.cause);},onStep:x=>{clip.observe(x);stack.observe(x);}});
    assert.equal(r.complete,true,id);assert.equal(r.deaths,0,`${id}: nobody dies in a withdrawal with nobody to fight (${causes})`);assert.equal(sim.mission.phase,'NPC_END',id);
    for(const f of ['order','lineOut','exited','completed'])assert.equal(sim.flags[`m01npc.${f}`],true,`${id}: ${f}`);
    assert.equal(sim.objectives.obj_npc_cover.state,'done',id);assert.equal(sim.objectives.obj_npc_withdraw.state,'done',id);
    assert.deepEqual(sim.checkpointsReached,['cp_npc_j_ordem','cp_npc_k_retirada'],id);assert.equal(sim.respawn.label,'CP-K',id);
    // everyone of the plan left the field in the band, the courier too; nobody else is on it
    const R=sim.timers.withdrawal;assert.equal(R.out.length,11,id);assert.equal(R.messenger,'gone',id);assert.ok(R.orderAt>20&&R.orderAt<40,`${id}: the order at ${R.orderAt}`);
    assert.ok(R.lineOutAt>R.orderAt+45&&R.rearOutAt>R.lineOutAt+45&&R.exitedAt>=R.rearOutAt,`${id}: the stages ${[R.orderAt,R.lineOutAt,R.rearOutAt,R.exitedAt].map(Math.round)}`);
    assert.deepEqual(sim.actors.filter(a=>a.active).map(a=>a.id),[],`${id}: the field is empty at the end`);assert.ok(sim.actors.every(a=>a.alive),`${id}: nobody died`);
    assert.equal(sim.enemies.length,0,id);assert.equal(sim.enemyFire.nextId,0,`${id}: nobody fired`);assert.equal(sim.rng.state,new M01AreaSimulation(seed,{difficulty:d,actId:ID}).rng.state,`${id}: the main stream was not drawn`);
    // the lines said, in order, once each (the call to a man who lags only to the laggard)
    const once=said.filter(on=>on!=='lag');assert.deepEqual(once,['arrive_card_end','order_given','order_section','line_go','line_out','exit'],id);
    if(mode==='prompt')assert.ok(!said.includes('lag'),`${id}: a player with the section is not called`);else assert.ok(said.includes('lag'),`${id}: a player who stays behind is called`);
    // no clipping, nobody inside anybody
    assert.deepEqual(clip.report(),[],id);assert.equal(stack.summary().pairs,0,`${id}: ${stack.report()}`);
    assert.ok(sim.clock>=MIN_ACT_SEC&&sim.clock<=MAX_ACT_SEC,`${id}: the act took ${Math.round(sim.clock)} s (${MIN_ACT_SEC}-${MAX_ACT_SEC})`);
    table.push({id,clock:Math.round(sim.clock),withCards:Math.round(sim.clock+CARDS_SEC-3),order:Math.round(R.orderAt),lineOut:Math.round(R.lineOutAt),rearOut:Math.round(R.rearOutAt),exit:Math.round(R.exitedAt)});
  }
  t.diagnostic(`act clock with the cards skipped (s), with the cards at full length, order, line out, rear guard out, exit:\n${table.map(x=>`  ${x.id}: ${x.clock} ${x.withCards} ${x.order} ${x.lineOut} ${x.rearOut} ${x.exit}`).join('\n')}`);
  const prompt=table.filter(x=>x.id.startsWith('prompt')).map(x=>x.withCards),laggard=table.filter(x=>x.id.startsWith('laggard')).map(x=>x.withCards);
  t.diagnostic(`prompt ${Math.min(...prompt)}-${Math.max(...prompt)} s, laggard ${Math.min(...laggard)}-${Math.max(...laggard)} s (cards at full length)`);
  assert.ok(Math.min(...prompt)>=180&&Math.max(...laggard)<=300,`3-5 minutes with the cards at full length (prompt ${Math.min(...prompt)}, laggard ${Math.max(...laggard)} s)`);
});

test('the finished act is what Continue reloads: the stored checkpoint after the end card is the completed state, not the withdrawal of CP-K (as act 1 does on its debrief)',{timeout:600000},()=>{
  const runner=new M01ActRunner({enabled:true});
  const sim=new M01AreaSimulation(19390901,{difficulty:'soldado',actId:ID});
  const r=actCRoute(sim,{mode:'prompt',maxSec:900});assert.equal(r.complete,true);
  const stored=JSON.parse(JSON.stringify(runner.envelope(sim)));
  assert.equal(stored.actSave.mission.complete,true);assert.equal(stored.actSave.mission.phase,'NPC_END');assert.equal(stored.actSave.flags['m01npc.completed'],true);
  assert.deepEqual(stored.actSave.checkpointsReached,['cp_npc_j_ordem','cp_npc_k_retirada']);
  const back=runner.load(JSON.stringify(stored));assert.equal(back.ok,true,back.error);
  assert.equal(back.sim.mission.complete,true);assert.equal(back.sim.mission.phase,'NPC_END');assert.equal(back.sim.clock,sim.clock);
});

test('determinism: the same seed and pilot give the same act twice, the whole state, and a different seed a different one',{timeout:600000},()=>{
  const run=(seed,mode)=>{const sim=new M01AreaSimulation(seed,{difficulty:'soldado',actId:ID});actCRoute(sim,{mode,maxSec:900});return JSON.stringify(sim.snapshot());};
  const a=run(19390901,'laggard');assert.equal(run(19390901,'laggard'),a);assert.notEqual(run(3,'laggard'),a);
});
