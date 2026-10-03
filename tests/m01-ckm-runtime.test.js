import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Simulation,validateM01Snapshot,CKM_POSITION} from '../src/game/m01-simulation.js';
import {M01Characters} from '../src/render/m01-characters.js';
import {route} from './helpers/m01-route.js';
const crew=s=>s.actors.filter(a=>a.group==='grp_ckm_crew');
const load=async path=>{const b=readFileSync(new URL('../assets/models/provisional/m01/'+path,import.meta.url));const loader=new GLTFLoader();loader.register(()=>({name:'node_no_texture_decode',loadTexture:()=>Promise.resolve(null)}));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const [rig,gun,soldier]=await Promise.all([load('weapons/ckm_wz30/m01_ckm_wz30_animations.glb'),load('weapons/ckm_wz30/m01_ckm_wz30_lod2.glb'),load('characters/m01_soldier_animations.glb')]);
const fixture=()=>{const c=new M01Characters(new THREE.Scene());c.sources.set('pl:2',rig);c.sources.set('ckm:2',gun);for(const g of [soldier,rig])for(const clip of g.animations)c.clips.set(clip.name,clip);return c;};
const matrices=c=>{const out=[];c.scene.updateMatrixWorld(true);c.scene.traverse(n=>out.push(...n.matrixWorld.elements));return out;};

test('ckm crew is grounded below the deck, leaves after the real event and reaches safety before demolition',()=>{
  const s=new M01Simulation(),rng=s.rng.state;
  assert.equal(crew(s).length,3);assert.ok(crew(s).every(a=>a.y===-3&&a.ckm.phase==='idle'));
  s.updateActors(.05);assert.equal(s.rng.state,rng);
  const flow=route(),east=flow.combatSnapshots.eastDemolition,west=flow.combatSnapshots.westDemolition;
  assert.ok(crew({actors:east.actors}).every(a=>a.x>0&&a.ckm.phase==='idle'));
  assert.ok(crew({actors:west.actors}).filter(a=>a.alive&&a.active).every(a=>a.x<-90));
  assert.ok(crew(flow.sim).every(a=>!a.ckm.visible));validateM01Snapshot(flow.sim.snapshot());
  const blocked=new M01Simulation();blocked.consumed.evt_m01_east_demolition=0;blocked.player.x=-170;
  for(const a of blocked.allies)if(!a.ckm)a.x=-170;
  assert.equal(blocked.readiness('evt_m01_west_demolition'),false,'live crew inside the blast zone holds the existing gate');
  for(const a of crew(blocked))Object.assign(a,{alive:false,health:0,state:'DOWN'});
  assert.equal(blocked.readiness('evt_m01_west_demolition'),true,'casualties do not resurrect or block the gate');
  const dead=blocked.snapshot();blocked.restoreSnapshot(dead);assert.deepEqual(blocked.snapshot(),dead);
});
test('schema 2 accepts exact legacy rosters and migrates atomically without changing old actors or RNG',()=>{
  for(const s of [new M01Simulation(),route().sim]){
    const legacy=s.snapshot();legacy.actors=legacy.actors.filter(a=>!a.ckm);validateM01Snapshot(legacy);
    const before=structuredClone(legacy),restored=new M01Simulation();restored.restoreSnapshot(legacy);
    assert.deepEqual(legacy,before);assert.equal(restored.rng.state,legacy.rng);
    assert.deepEqual(restored.actors.filter(a=>!a.ckm),legacy.actors);assert.equal(crew(restored).length,3);
    if(legacy.consumed.evt_m01_east_demolition!==undefined)assert.ok(crew(restored).every(a=>a.x<-90));
    const saved=restored.snapshot();restored.restoreCheckpoint();assert.deepEqual(restored.snapshot(),saved);
  }
  const s=new M01Simulation(),baseline=s.snapshot();
  for(const mutate of [v=>v.actors.splice(v.actors.findIndex(a=>a.id==='ckm_loader'),1),v=>v.actors.find(a=>a.ckm).ckm.startedAt=1,v=>v.actors.find(a=>a.ckm).ckm.phase='fire',v=>v.actors[0].ckm={phase:'idle',startedAt:0,visible:true}]){
    const bad=structuredClone(baseline);mutate(bad);assert.throws(()=>s.restoreSnapshot(bad));assert.deepEqual(s.snapshot(),baseline);
  }
});
test('real ckm clips and weapon share saved time across pause, reload, casualties and optional fallback',()=>{
  const s=new M01Simulation();s.scene=null;s.clock=8;s.consumed.evt_m01_east_demolition=8;s.updateActors(.05);s.clock=9.25;
  const c=fixture(),copy=fixture(),saved=s.snapshot(),p={x:18,z:43};
  try{
    c.update(s.actors,s.clock,p);assert.equal(c.instances.get('ckm_gunner').clip,'ckm_wz30_gunner_abandon');
    assert.equal(c.instances.get('ckm_loader').clip,'ckm_wz30_loader_abandon');
    assert.equal(c.instances.get('ckm_gunner').action.time,1.25);assert.equal(c.instances.get('ckm_loader').action.time,1.25);
    assert.equal(c.ckm.mixer.time,1.25);assert.deepEqual(c.ckm.root.position.toArray(),Object.values(CKM_POSITION));
    const pose=matrices(c);c.update(s.actors,s.clock,p);assert.deepEqual(matrices(c),pose);
    const restore=new M01Simulation();restore.restoreSnapshot(saved);copy.update(restore.actors,restore.clock,p);assert.deepEqual(matrices(copy),pose);
    assert.deepEqual(s.snapshot(),saved);
    s.actor('ckm_gunner').alive=false;s.actor('ckm_gunner').health=0;s.actor('ckm_gunner').state='DOWN';
    c.update(s.actors,s.clock,p);assert.equal(c.instances.get('ckm_gunner').clip,'fallen');
    c.clips.delete('ckm_wz30_loader_idle');c.update(s.actors,s.clock,p);assert.equal(c.ckm.root.visible,false);
    assert.ok(!c.instances.get('ckm_loader').clip.startsWith('ckm_wz30_'));
  }finally{c.dispose();copy.dispose();}
});
