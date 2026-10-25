import test from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { m02VisualActor } from '../src/render/m02-presentation.js';

test('M02 presentation adapts live roles and reload timing without changing snapshots', () => {
  const sim=new M02BenchSimulation();
  const before=sim.snapshot();
  for (const [list,team] of [[sim.allies,'ally'],[sim.enemies,'enemy']]) {
    for (const actor of list) {
      const visual=m02VisualActor(actor,team,sim.clock);
      assert.notEqual(visual,actor);
      assert.equal(visual.team,team);
      assert.equal(visual.x,actor.x);
      assert.equal(visual.z,actor.z);
    }
  }
  assert.deepEqual(sim.snapshot(),before);
  const wounded=m02VisualActor({...sim.enemies[0],state:'WOUNDED_UNARMED'},'enemy',0);
  assert.equal(wounded.role,'MEDIC');
  assert.equal(wounded.state,'WOUNDED');
  const reloading=m02VisualActor({...sim.enemies[0],weapon:'kar98k',reloadingUntil:12.8},'enemy',11);
  assert.equal(reloading.reload.startedAt,10);
});

import { m02PlayerAction, performM02PlayerAction } from '../src/game/m02-player-actions.js';

test('contextual actions cannot skip unfinished combat or manufacture supplies', () => {
  const sim=new M02BenchSimulation();
  const before=sim.snapshot();
  assert.equal(m02PlayerAction(sim),null);
  assert.equal(performM02PlayerAction(sim),false);
  assert.deepEqual(sim.snapshot(),before);
  sim.enterAreaBC06();
  sim.teleportPlayer(0,-70,0);
  assert.notEqual(m02PlayerAction(sim)?.id,'reorganize');
  assert.equal(sim.areaB.reorganizedC07,false);
});

test('resolved farm enables normal interaction to enter area B with state retained', () => {
  const sim=new M02BenchSimulation();
  sim.teleportPlayer(0,50,0);
  sim.objective={id:'COMPLETE',status:'completed'};
  const weapon=sim.weapon.snapshot();
  assert.equal(m02PlayerAction(sim)?.id,'area-b');
  assert.equal(performM02PlayerAction(sim),true);
  assert.equal(sim.activeCellId,'B');
  assert.deepEqual(sim.weapon.snapshot(),weapon);
  assert.equal(performM02PlayerAction(sim),false);
});
