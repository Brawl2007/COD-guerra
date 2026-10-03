import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';

test('save between checkpoints preserves the future respawn destination',()=>{
  const a=new M01Simulation();a.tick(.05,{skip:true});a.drainEvents();
  for(let i=0;i<40;i++){a.tick(.05,{forward:1});a.drainEvents();}
  const saved=a.snapshot(),b=new M01Simulation();b.restoreSnapshot(saved);
  assert.ok(a.clock>a.checkpoint.clock);
  // Same adverse state in both branches, then the real tick performs recovery.
  for(const s of [a,b]){s.player.health=0;s.player.alive=false;}
  a.tick(.05);b.tick(.05);
  assert.deepEqual(b.snapshot(),a.snapshot(),'first divergence: recovery tick 1');
  assert.deepEqual(b.drainEvents(),a.drainEvents());
});
