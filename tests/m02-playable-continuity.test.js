import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';

test('B/C movement and checkpoint continuation keep finite world coordinates',()=>{
 for(const cell of ['B','C']){
  const s=new M02BenchSimulation();s.clock=60;
  if(cell==='B')s.enterAreaBC06();else s.enterAreaCC09();
  const enemies=s.enemies.filter(e=>e.alive&&!e.nonCombatant);
  assert.ok(enemies.every(e=>e.nextFireAt>s.clock),'new garrison fire timers must be relative to entry clock');
  s.saveCheckpoint('movement');
  for(let i=0;i<20;i++)s.tick(.05,{forward:1,side:.25});
  const result=s.snapshot();
  assert.ok([s.player,...s.allies,...s.enemies].every(a=>[a.x,a.y,a.z].every(Number.isFinite)));
  s.restoreCheckpoint('movement');for(let i=0;i<20;i++)s.tick(.05,{forward:1,side:.25});
  assert.deepEqual(s.snapshot(),result);
 }
});

test('EC2 reserves do not inherit the defeated EA1 farm garrison morale',()=>{
 const s=new M02BenchSimulation();s.enterAreaCC09();
 for(const enemy of s.enemies){enemy.alive=false;enemy.health=0;}
 s.startC10OrderChanges();s.tick(.05);
 const reserve=s.enemies.filter(e=>e.encounterId==='EC2');
 assert.equal(reserve.length,12);
 assert.ok(reserve.every(e=>e.alive&&!e.nonCombatant&&e.state!=='SURRENDERED'));
});

test('mid-grenade RNG and portal locks survive exact continuation; old saves remain readable',()=>{
 const s=new M02BenchSimulation();s.tick(.1,{grenade:true});
 s.doorLocks.set('portal',{actorId:'pl_lis',expiresAt:1});
 const snapshot=s.snapshot();
 for(let i=0;i<45;i++)s.tick(.05,{});
 const final=s.snapshot();s.restoreSnapshot(snapshot);
 for(let i=0;i<45;i++)s.tick(.05,{});
 assert.deepEqual(s.snapshot(),final);
 const legacy=structuredClone(snapshot);
 for(const key of ['rngState','worldRevision','grenades','grenadeSeq','doorLocks'])delete legacy[key];
 assert.doesNotThrow(()=>s.restoreSnapshot(legacy));
 const before=s.snapshot(),bad=structuredClone(before);bad.player.x=NaN;
 assert.throws(()=>s.restoreSnapshot(bad),/inválido/);assert.deepEqual(s.snapshot(),before);
});
