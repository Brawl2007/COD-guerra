import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot,CKM_POSITION} from '../src/game/m01-simulation.js';

const CKM_IDS=['ckm_gunner','ckm_loader','ckm_reserve'];
const OLD=[[21.206,42.971],[22.08,42.48],[20.4,41.6]];
const DX=2.17;
const E=name=>`evt_m01_${name}`;
const crew=s=>CKM_IDS.map(id=>s.actors.find(a=>a.id===id));
const oldPost=s=>{
  const copy=structuredClone(s);
  crew(copy).forEach((a,i)=>{a.x=OLD[i][0];a.y=-3;a.z=OLD[i][1];});
  return copy;
};
const positions=s=>crew(s).map(a=>[a.x,a.y,a.z]);

test('schema 2 legacy 86 roster becomes 89 at the aligned post without changing old actors or RNG',()=>{
  const source=new M01Simulation(),legacy=source.snapshot(),rng=legacy.rng;
  legacy.actors=legacy.actors.filter(a=>!a.ckm);
  validateM01Snapshot(legacy);
  const before=structuredClone(legacy),restored=new M01Simulation();
  restored.restoreSnapshot(legacy);
  assert.deepEqual(legacy,before,'restore must not mutate the supplied save');
  assert.equal(restored.snapshot().schema,2);
  assert.equal(restored.rng.state,rng);
  assert.equal(restored.actors.length,89);
  assert.deepEqual(restored.actors.filter(a=>!a.ckm),legacy.actors);
  assert.deepEqual(positions(restored),OLD.map(([x,z])=>[x+DX,-3,z]));
});

test('old 89-actor idle placement migrates once and snapshot restore is stable',()=>{
  const legacy=oldPost(new M01Simulation().snapshot()),before=structuredClone(legacy),rng=legacy.rng;
  validateM01Snapshot(legacy);
  const restored=new M01Simulation();restored.restoreSnapshot(legacy);
  assert.deepEqual(legacy,before);
  assert.equal(restored.rng.state,rng);
  assert.deepEqual(positions(restored),OLD.map(([x,z])=>[x+DX,-3,z]));
  const migrated=restored.snapshot(),again=new M01Simulation();again.restoreSnapshot(migrated);
  assert.deepEqual(again.snapshot(),migrated);
});

test('old 89-actor abandon placement shifts rigidly but preserves phase and startedAt exactly',()=>{
  const live=new M01Simulation();live.scene=null;live.clock=8;live.consume(E('east_demolition'));live.updateActors(.05);
  const legacy=oldPost(live.snapshot()),started=crew(legacy).map(a=>a.ckm.startedAt),rng=legacy.rng;
  assert.ok(crew(legacy).every(a=>a.ckm.phase==='abandon'));
  const restored=new M01Simulation();restored.restoreSnapshot(legacy);
  assert.deepEqual(positions(restored),OLD.map(([x,z])=>[x+DX,-3,z]));
  assert.deepEqual(crew(restored).map(a=>a.ckm.phase),['abandon','abandon','abandon']);
  assert.deepEqual(crew(restored).map(a=>a.ckm.startedAt),started);
  assert.equal(restored.rng.state,rng);
});

test('retreat saves are never translated, including an actor still on an old authored coordinate',()=>{
  const s=new M01Simulation();s.scene=null;s.clock=12;s.consumed[E('east_demolition')]=8;
  const members=crew(s);
  members.forEach((a,i)=>Object.assign(a,{x:i===0?OLD[i][0]:8-i*2,y:-3,z:i===0?OLD[i][1]:40+i,
    state:'RETREAT',ckm:{phase:'retreat',startedAt:11,visible:true}}));
  const saved=s.snapshot(),before=positions(saved),started=crew(saved).map(a=>a.ckm.startedAt),rng=saved.rng;
  validateM01Snapshot(saved);
  const restored=new M01Simulation();restored.restoreSnapshot(saved);
  assert.deepEqual(positions(restored),before,'migration must not teleport retreat actors');
  assert.deepEqual(crew(restored).map(a=>a.ckm.startedAt),started);
  assert.equal(restored.rng.state,rng);
});

test('casualties stay casualties and post-west saves preserve their saved positions',()=>{
  const s=new M01Simulation(),members=crew(s);
  Object.assign(members[1],{alive:false,health:0,state:'DOWN'});
  const old=oldPost(s.snapshot());
  const deadBefore=structuredClone(crew(old)[1]),restored=new M01Simulation();
  restored.restoreSnapshot(old);
  const dead=restored.actor('ckm_loader');
  assert.equal(dead.alive,false);assert.equal(dead.health,0);assert.equal(dead.state,'DOWN');
  assert.equal(dead.x,deadBefore.x+DX);

  const afterWest=oldPost(s.snapshot());afterWest.clock=20;afterWest.consumed[E('east_demolition')]=8;afterWest.consumed[E('west_demolition')]=18;
  crew(afterWest).forEach(a=>{a.ckm.visible=false;});
  const westPositions=positions(afterWest),west=new M01Simulation();west.restoreSnapshot(afterWest);
  assert.deepEqual(positions(west),westPositions,'after west demolition the hidden emplacement is not rewritten');
  assert.equal(west.actor('ckm_loader').alive,false);
});

test('86-actor saves after east or west demolition remain safe and do not restart abandon',()=>{
  for(const west of [false,true]){
    const s=new M01Simulation();s.clock=20;s.consumed[E('east_demolition')]=8;if(west)s.consumed[E('west_demolition')]=18;
    const legacy=s.snapshot();legacy.actors=legacy.actors.filter(a=>!a.ckm);const rng=legacy.rng;
    validateM01Snapshot(legacy);
    const restored=new M01Simulation();restored.restoreSnapshot(legacy);
    assert.equal(restored.rng.state,rng);
    assert.ok(crew(restored).every(a=>a.ckm.phase==='retreat'&&a.ckm.startedAt===8&&a.x<-90));
    assert.ok(crew(restored).every(a=>a.ckm.visible===!west));
  }
});

test('restore stays atomic when a legacy-position ckm save is invalid',()=>{
  const target=new M01Simulation(),baseline=target.snapshot(),bad=oldPost(new M01Simulation().snapshot());
  crew(bad)[0].ckm.phase='fire';
  const raw=structuredClone(bad);
  assert.throws(()=>target.restoreSnapshot(bad),/guarnição ckm/);
  assert.deepEqual(target.snapshot(),baseline);
  assert.deepEqual(bad,raw);
});

test('placement migration changes no non-ckm actor or unrelated saved state',()=>{
  const legacy=oldPost(new M01Simulation().snapshot()),nonCkm=structuredClone(legacy.actors.filter(a=>!a.ckm));
  const {rng,clock,battleClock,consumed,flags,destruction}=structuredClone(legacy),restored=new M01Simulation();
  restored.restoreSnapshot(legacy);
  assert.deepEqual(restored.actors.filter(a=>!a.ckm),nonCkm);
  assert.equal(restored.rng.state,rng);assert.equal(restored.clock,clock);assert.equal(restored.battleClock,battleClock);
  assert.deepEqual(restored.consumed,consumed);assert.deepEqual(restored.flags,flags);assert.deepEqual(restored.destruction,destruction);
});

test('new ckm root puts gun_muzzle_flash on the mapped south embrasure x/z',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../assets/models/provisional/m01/weapons/ckm_wz30/manifest.json',import.meta.url),'utf8'));
  const [x,y,z]=manifest.sockets.scene.gun_muzzle_flash,yaw=-Math.PI/2,c=Math.cos(yaw),q=Math.sin(yaw);
  const world=[CKM_POSITION.x+x*c+z*q,CKM_POSITION.y+y,CKM_POSITION.z-x*q+z*c];
  assert.ok(Math.abs(world[0]-25)<1e-12,`muzzle x=${world[0]}`);
  assert.ok(Math.abs(world[2]-43)<1e-12,`muzzle z=${world[2]}`);
  assert.equal(CKM_POSITION.y,-3);
});
