import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {M01Characters} from '../src/render/m01-characters.js';

const E=name=>'evt_m01_'+name;
const CKM='grp_ckm_crew';

// Import real meshes, skin and animations without requiring a browser texture decoder.
function asset(path,material){
  const b=readFileSync(new URL('../assets/models/provisional/'+path,import.meta.url)),len=b.readUInt32LE(12);
  const j=JSON.parse(b.subarray(20,20+len)),bin=b.subarray(28+len);
  const data=i=>{const a=j.accessors[i],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],
    bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];
    return Array.from({length:a.count*n},(_,k)=>bin[read]((v.byteOffset??0)+(a.byteOffset??0)+Math.floor(k/n)*(v.byteStride??n*bytes)+(k%n)*bytes));};
  const nodes=j.nodes.map(n=>{
    let o;
    if(n.mesh!=null){
      const p=j.meshes[n.mesh].primitives[0],g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(data(p.attributes.POSITION),3));g.setIndex(data(p.indices));
      if(n.skin!=null){g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(data(p.attributes.JOINTS_0),4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(data(p.attributes.WEIGHTS_0),4));}
      o=n.skin!=null?new THREE.SkinnedMesh(g,material):new THREE.Mesh(g,material);
    }else o=new THREE.Bone();
    o.name=n.name??'';o.userData=n.extras??{};o.position.fromArray(n.translation??[0,0,0]);o.quaternion.fromArray(n.rotation??[0,0,0,1]);o.scale.fromArray(n.scale??[1,1,1]);return o;
  });
  j.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])));
  const scene=new THREE.Group();j.scenes[0].nodes.forEach(i=>scene.add(nodes[i]));scene.updateMatrixWorld(true);
  j.nodes.forEach((n,i)=>{if(n.skin==null)return;const skin=j.skins[n.skin],bind=data(skin.inverseBindMatrices);
    nodes[i].bind(new THREE.Skeleton(skin.joints.map(k=>nodes[k]),skin.joints.map((_,k)=>new THREE.Matrix4().fromArray(bind,k*16))));});
  const animations=(j.animations??[]).map(a=>new THREE.AnimationClip(a.name,-1,a.channels.map(c=>{
    const smp=a.samplers[c.sampler],property={translation:'position',rotation:'quaternion',scale:'scale'}[c.target.path],
      Track=c.target.path==='rotation'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
    return new Track(`${j.nodes[c.target.node].name}.${property}`,data(smp.input),data(smp.output),smp.interpolation==='STEP'?THREE.InterpolateDiscrete:THREE.InterpolateLinear);
  })));
  return {scene,animations};
}
function characters(){
  const c=new M01Characters(new THREE.Scene()),material=new THREE.MeshBasicMaterial(),
    soldier=asset('m01/characters/m01_soldier_pl_lod2.glb',material),
    gun=asset('m01/weapons/ckm_wz30/m01_ckm_wz30_lod2.glb',material);
  c.sources.set('pl:2',soldier);c.sources.set('ckm:2',gun);
  for(const p of ['m01/characters/m01_soldier_animations.glb','m01/weapons/ckm_wz30/m01_ckm_wz30_animations.glb'])
    for(const clip of asset(p,material).animations)c.clips.set(clip.name,clip);
  const close=()=>{c.dispose();for(const g of c.sources.values())g.scene.traverse(n=>{n.geometry?.dispose();n.skeleton?.dispose();});material.dispose();};
  return {c,close};
}
const crew=sim=>sim.actors.filter(a=>a.group===CKM).sort((a,b)=>a.id.localeCompare(b.id));
const advanceActors=(sim,seconds)=>{for(let i=0;i<seconds*20;i++){sim.clock+=.05;sim.updateActors(.05);}};

test('three saved ckm crew actors leave only after the synchronized abandon phase and hold the west demolition until safe',()=>{
  const sim=new M01Simulation(),members=crew(sim),rng=sim.rng.state;
  assert.equal(members.length,3);assert.deepEqual(members.map(a=>a.ckmRole),['gunner','loader','assistant']);
  assert.ok(members.every(a=>a.ckmPhase==='manned'&&a.ckmStartedAt===0));
  assert.equal(members[0].ckmGunVisible,true);assert.ok([members[0].ckmPost.x,members[0].ckmPost.y,members[0].ckmPost.z,members[0].ckmPost.yaw].every(Number.isFinite));
  for(const a of sim.allies)if(a.alive&&a.active&&!a.civilian&&!members.includes(a)){a.x=-170;a.z=22;}
  Object.assign(sim.player,{x:-120,z:22});
  sim.consume(E('east_demolition'));
  assert.ok(members.every(a=>a.ckmPhase==='abandon'&&a.ckmStartedAt===sim.consumed[E('east_demolition')]));
  assert.equal(sim.readiness(E('west_demolition')),false);
  advanceActors(sim,2.95);assert.ok(members.every(a=>a.ckmPhase==='abandon'));assert.equal(sim.readiness(E('west_demolition')),false);
  advanceActors(sim,.1);assert.ok(members.every(a=>a.ckmPhase==='moving'));assert.equal(sim.rng.state,rng);
  assert.equal(sim.readiness(E('west_demolition')),false,'the crew is still east of the safety line');
  for(let i=0;i<2000&&members.some(a=>a.x>=-90);i++){sim.clock+=.05;sim.updateActors(.05);}
  assert.ok(members.every(a=>a.x<-90));assert.equal(sim.readiness(E('west_demolition')),true);
  sim.consume(E('west_demolition'));assert.equal(members[0].ckmGunVisible,false);
  validateM01Snapshot(sim.snapshot());
});

test('schema 2 accepts exact legacy actor IDs, migrates the crew without consuming RNG, and rejects partial new crews',()=>{
  const fresh=new M01Simulation(),legacy=structuredClone(fresh.snapshot()),rng=legacy.rng;
  legacy.actors=legacy.actors.filter(a=>a.group!==CKM);validateM01Snapshot(legacy);
  const restored=new M01Simulation();assert.equal(restored.restoreSnapshot(legacy),true);
  assert.equal(crew(restored).length,3);assert.ok(crew(restored).every(a=>a.ckmPhase==='manned'));assert.equal(restored.rng.state,rng);
  restored.restoreCheckpoint();assert.equal(crew(restored).length,3,'death restore keeps the canonical migrated checkpoint');
  const after=new M01Simulation();after.consume(E('east_demolition'));after.clock=4;
  const oldAfter=structuredClone(after.snapshot());oldAfter.actors=oldAfter.actors.filter(a=>a.group!==CKM);
  const resumed=new M01Simulation();resumed.restoreSnapshot(oldAfter);
  assert.ok(crew(resumed).every(a=>a.ckmPhase==='moving'&&a.x===-170&&a.z===22));assert.equal(resumed.rng.state,oldAfter.rng);
  const partial=structuredClone(fresh.snapshot());partial.actors=partial.actors.filter(a=>a.id!=='pl_ckm_2');
  assert.throws(()=>validateM01Snapshot(partial),/actores/);
});

test('the real optional ckm kit samples gunner and loader from saved phase time; partial kit falls back together without changing gameplay',()=>{
  const sim=new M01Simulation(),{c,close}=characters();
  try{
    const before=sim.snapshot();c.update(sim.actors,sim.clock,sim.player,'low',sim.battleClock);
    const gunner=c.instances.get('pl_ckm_0'),loader=c.instances.get('pl_ckm_1');
    assert.ok(gunner&&loader);assert.equal(gunner.clip,'ckm_wz30_gunner_idle');assert.equal(loader.clip,'ckm_wz30_loader_idle');
    assert.equal(gunner.weapon,'ckm_wz30');assert.equal(gunner.weaponRoot.parent,c.scene);assert.equal(c.muzzle('pl_ckm_0'),null);
    const post=sim.actor('pl_ckm_0').ckmPost;
    assert.deepEqual(gunner.weaponRoot.position.toArray(),[post.x,post.y,post.z]);assert.equal(gunner.weaponRoot.rotation.y,post.yaw);
    assert.deepEqual(sim.snapshot(),before);
    sim.consume(E('east_demolition'));sim.clock=1;
    const saved=sim.snapshot();c.update(sim.actors,sim.clock,sim.player,'low',sim.battleClock);
    assert.equal(c.instances.get('pl_ckm_0').clip,'ckm_wz30_gunner_abandon');
    assert.equal(c.instances.get('pl_ckm_1').clip,'ckm_wz30_loader_abandon');
    assert.ok(Math.abs(c.instances.get('pl_ckm_0').action.time-c.instances.get('pl_ckm_1').action.time)<1e-9);
    const matrix=c.instances.get('pl_ckm_0').root.matrixWorld.toArray();c.update(sim.actors,sim.clock,sim.player,'low',sim.battleClock);
    assert.deepEqual(c.instances.get('pl_ckm_0').root.matrixWorld.toArray(),matrix,'paused render samples the same saved instant');
    c.clips.delete('ckm_wz30_loader_abandon');c.update(sim.actors,sim.clock,sim.player,'low',sim.battleClock);
    assert.equal(c.instances.get('pl_ckm_0').clip,'crouched_idle');assert.equal(c.instances.get('pl_ckm_1').clip,'crouched_idle');
    assert.equal(c.instances.get('pl_ckm_0').weaponRoot,null);assert.deepEqual(sim.snapshot(),saved);
  }finally{close();}
});
