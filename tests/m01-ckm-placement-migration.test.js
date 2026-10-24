import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot,CKM_POSITION,CKM_CASEMATE_POSITION,CKM_POST,ckmMuzzle,GARRISON_IDS} from '../src/game/m01-simulation.js';
import {AUXILIARY_IDS} from '../src/game/m01-yard-life.js';

const CKM_IDS=['ckm_gunner','ckm_loader','ckm_reserve'];
// First placement (before the +2.17 alignment), the casemate placement of every build up to T47 (OLD + DX) and, since T47, the S2 post (CKM_POST).
const OLD=[[21.206,42.971],[22.08,42.48],[20.4,41.6]];
const DX=2.17;
const CASEMATE=OLD.map(([x,z])=>[x+DX,z]);
const E=name=>`evt_m01_${name}`;
const crew=s=>CKM_IDS.map(id=>s.actors.find(a=>a.id===id));
const placed=(s,post)=>{
  const copy=structuredClone(s);
  crew(copy).forEach((a,i)=>{a.x=post[i][0];a.y=-3;a.z=post[i][1];});
  return copy;
};
const oldPost=s=>placed(s,OLD);
const positions=s=>crew(s).map(a=>[a.x,a.y,a.z]);
const S2=CKM_POST.map(([x,z])=>[x,-3,z]);   // T47: every valid older placement migrates here

test('schema 2 legacy 86 roster becomes 103 (97 + the west garrison) with all89 pre-auxiliary IDs at the aligned post without changing old actors or RNG',()=>{
  const source=new M01Simulation(),legacy=source.snapshot(),rng=legacy.rng;
  // A real 86-actor save predates both the ckm crew and the eight optional T34 display-only auxiliaries (partials), and the six men of the west garrison (R1-a, 2026-10-23, amendment 16).
  legacy.actors=legacy.actors.filter(a=>!a.ckm&&!AUXILIARY_IDS.includes(a.id)&&!GARRISON_IDS.includes(a.id));assert.equal(legacy.actors.length,86);
  validateM01Snapshot(legacy);
  const before=structuredClone(legacy),restored=new M01Simulation();
  restored.restoreSnapshot(legacy);
  assert.deepEqual(legacy,before,'restore must not mutate the supplied save');
  assert.equal(restored.snapshot().schema,2);
  assert.equal(restored.rng.state,rng);
  assert.equal(restored.actors.length,103);
  assert.deepEqual(restored.actors.filter(a=>!a.ckm&&!AUXILIARY_IDS.includes(a.id)&&!GARRISON_IDS.includes(a.id)),legacy.actors);
  assert.deepEqual(positions(restored),S2);
});

test('old 89-actor idle placement migrates once and snapshot restore is stable',()=>{
  const legacy=oldPost(new M01Simulation().snapshot()),before=structuredClone(legacy),rng=legacy.rng;
  validateM01Snapshot(legacy);
  const restored=new M01Simulation();restored.restoreSnapshot(legacy);
  assert.deepEqual(legacy,before);
  assert.equal(restored.rng.state,rng);
  assert.deepEqual(positions(restored),S2);
  const migrated=restored.snapshot(),again=new M01Simulation();again.restoreSnapshot(migrated);
  assert.deepEqual(again.snapshot(),migrated);
});

test('old 89-actor save immediately after east demolition keeps idle phase/start time while aligning the old post',()=>{
  const s=new M01Simulation();s.scene=null;s.clock=8;s.consume(E('east_demolition'));
  const legacy=oldPost(s.snapshot()),started=crew(legacy).map(a=>a.ckm.startedAt),rng=legacy.rng;
  assert.ok(crew(legacy).every(a=>a.ckm.phase==='idle'),'event can be saved before the next actor update');
  const restored=new M01Simulation();restored.restoreSnapshot(legacy);
  assert.deepEqual(positions(restored),S2);
  assert.deepEqual(crew(restored).map(a=>a.ckm.phase),['idle','idle','idle']);
  assert.deepEqual(crew(restored).map(a=>a.ckm.startedAt),started);
  assert.equal(restored.rng.state,rng);
});

test('old 89-actor abandon placement shifts rigidly but preserves phase and startedAt exactly',()=>{
  const live=new M01Simulation();live.scene=null;live.clock=8;live.consume(E('east_demolition'));live.updateActors(.05);
  const legacy=oldPost(live.snapshot()),started=crew(legacy).map(a=>a.ckm.startedAt),rng=legacy.rng;
  assert.ok(crew(legacy).every(a=>a.ckm.phase==='abandon'));
  const restored=new M01Simulation();restored.restoreSnapshot(legacy);
  assert.deepEqual(positions(restored),S2);
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
  assert.equal(dead.x,CKM_POST[1][0]);assert.equal(dead.z,CKM_POST[1][1]);assert.ok(deadBefore.x!==dead.x);

  const afterWest=oldPost(s.snapshot());afterWest.clock=20;afterWest.consumed[E('east_demolition')]=8;afterWest.consumed[E('west_demolition')]=18;
  crew(afterWest).forEach((a,i)=>{Object.assign(a,{x:-120-i*2,z:25+i,state:'RETREAT'});a.ckm={phase:'retreat',startedAt:11,visible:false};});
  const westPositions=positions(afterWest),west=new M01Simulation();west.restoreSnapshot(afterWest);
  assert.deepEqual(positions(west),westPositions,'after west demolition the withdrawn crew is not rewritten');
  assert.equal(west.actor('ckm_loader').alive,false);
  assert.equal(west.actor('ckm_loader').ckm.startedAt,11);
});

test('86-actor saves after east or west demolition remain safe and do not restart abandon',()=>{
  for(const west of [false,true]){
    const s=new M01Simulation();s.clock=20;s.consumed[E('east_demolition')]=8;if(west)s.consumed[E('west_demolition')]=18;
    const legacy=s.snapshot();legacy.actors=legacy.actors.filter(a=>!a.ckm&&!AUXILIARY_IDS.includes(a.id)&&!GARRISON_IDS.includes(a.id));assert.equal(legacy.actors.length,86);const rng=legacy.rng;   // (R1-a, 2026-10-23: a real 86 save has no west garrison either)
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

test('the casemate root keeps gun_muzzle_flash on the mapped south embrasure x/z; the S2 root puts it at (8, -2.36, 26)',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../assets/models/provisional/m01/weapons/ckm_wz30/manifest.json',import.meta.url),'utf8'));
  const [x,y,z]=manifest.sockets.scene.gun_muzzle_flash,yaw=-Math.PI/2,c=Math.cos(yaw),q=Math.sin(yaw);
  const at=root=>[root.x+x*c+z*q,root.y+y,root.z-x*q+z*c];
  const casemate=at(CKM_CASEMATE_POSITION);
  assert.ok(Math.abs(casemate[0]-25)<1e-12,`muzzle x=${casemate[0]}`);
  assert.ok(Math.abs(casemate[1]-(-2.36))<1e-12,`muzzle y=${casemate[1]}`);
  assert.ok(Math.abs(casemate[2]-43)<1e-12,`muzzle z=${casemate[2]}`);
  assert.deepEqual(CKM_CASEMATE_POSITION,{x:24.17,y:-3,z:43});
  // T47 post S2: embankment between the bridges, against the north face of the road abutment (RECONSTRUCTED, CANDIDATES.md).
  const s2=at(CKM_POSITION);
  assert.ok(Math.abs(s2[0]-8)<1e-12&&Math.abs(s2[1]-(-2.36))<1e-12&&Math.abs(s2[2]-26)<1e-12,JSON.stringify(s2));
  assert.deepEqual(ckmMuzzle(),{x:CKM_POSITION.x+.83,y:-2.36,z:26});
  assert.ok(Math.abs(ckmMuzzle().x-8)<1e-12);
  assert.equal(CKM_POSITION.y,-3);assert.equal(CKM_CASEMATE_POSITION.y,-3);
});

test('every valid older placement (first, +2.17 casemate) migrates to S2 while any other position is left alone',()=>{
  for(const [label,post] of [['first placement',OLD],['casemate placement',CASEMATE]]){
    const legacy=placed(new M01Simulation().snapshot(),post),rng=legacy.rng,restored=new M01Simulation();
    validateM01Snapshot(legacy);restored.restoreSnapshot(legacy);
    assert.deepEqual(positions(restored),S2,label);assert.equal(restored.rng.state,rng);
    assert.ok(crew(restored)[0].ckmFire&&!crew(restored)[1].ckmFire&&!crew(restored)[2].ckmFire,'only the gunner owns a fire record');
  }
  // A crew that is not on an exact older post (here: one man displaced by 1 cm) is never moved, member by member.
  const odd=placed(new M01Simulation().snapshot(),CASEMATE);crew(odd)[1].x+=.01;const keep=positions(odd),restored=new M01Simulation();
  restored.restoreSnapshot(odd);
  assert.deepEqual(positions(restored)[1],keep[1]);assert.deepEqual(positions(restored)[0],S2[0]);assert.deepEqual(positions(restored)[2],S2[2]);
  // A current S2 save is a fixed point.
  const now=new M01Simulation().snapshot(),again=new M01Simulation();again.restoreSnapshot(now);assert.deepEqual(again.snapshot(),now);
});
