import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {M01TrainWagons} from '../src/render/m01-train-wagons.js';
import {M01_TRAIN_ART_OFFSET_Y,m01WagonVariation} from '../src/render/m01-train-consist-detail.js';
import {M01Simulation} from '../src/game/m01-simulation.js';

// Import actual transforms, meshes, skin and animation samples without a browser texture decoder.
function asset(path,material){
  const b=readFileSync(new URL(`../assets/models/provisional/${path}`,import.meta.url)),len=b.readUInt32LE(12);
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
  j.nodes.forEach((n,i)=>{if(n.skin==null)return;const s=j.skins[n.skin],bind=data(s.inverseBindMatrices);
    nodes[i].bind(new THREE.Skeleton(s.joints.map(k=>nodes[k]),s.joints.map((_,k)=>new THREE.Matrix4().fromArray(bind,k*16))));});
  const animations=(j.animations??[]).map(a=>new THREE.AnimationClip(a.name,-1,a.channels.map(c=>{
    const s=a.samplers[c.sampler],property={translation:'position',rotation:'quaternion',scale:'scale'}[c.target.path];
    const Track=c.target.path==='rotation'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
    return new Track(`${j.nodes[c.target.node].name}.${property}`,data(s.input),data(s.output),s.interpolation==='STEP'?THREE.InterpolateDiscrete:THREE.InterpolateLinear);
  })));
  return {scene,animations};
}
function characters(){
  const c=new M01Characters(new THREE.Scene()),material=new THREE.MeshBasicMaterial();
  for(const lod of [0,2]){
    c.sources.set(`de:${lod}`,asset(`m01/characters/m01_soldier_de_lod${lod}.glb`,material));
    c.sources.set(`mg34:${lod}`,asset(`m01/weapons/mg34/m01_mg34_lod${lod}.glb`,material));
  }
  for(const p of ['m01/characters/m01_soldier_animations.glb','m01/weapons/mg34/m01_mg34_animations.glb','m01/weapons/mg34-prone/m01_mg34_prone_animations.glb'])
    for(const clip of asset(p,material).animations)c.clips.set(clip.name,clip);
  const close=()=>{c.dispose();for(const g of c.sources.values())g.scene.traverse(n=>{n.geometry?.dispose();n.skeleton?.dispose();});material.dispose();};
  return {c,close};
}
test('actual MG34 rig cuts 4/5/6/7-round bursts at their saved duration, keeps one weapon and samples pause/restore without mutation',()=>{
  const {c,close}=characters();
  try{
    for(const rounds of [4,5,6,7]){
      const sim=new M01Simulation(),a=sim.actor('de_east_0');a.active=true;a.cooldown=99;
      sim.updateMG34Posture(a);sim.clock=1.9;sim.updateActors(1.9);
      assert.equal(a.mg34Prone.phase,'idle');assert.equal(sim.burst(a,sim.player,'cover',{rounds}),true);
      const saved=sim.snapshot(),start=a.firedAt;
      const at=age=>{
        const sample=new M01Simulation();sample.restoreSnapshot(saved);sample.clock=start+age;
        sample.updateActors(age);sample.emitMG34Rounds(sample.actor(a.id));
        return sample.snapshot().actors;
      };
      const actors=at((rounds-1)*.075+.01),before=structuredClone(actors);
      c.update(actors,start+(rounds-1)*.075+.01,sim.player);
      let v=c.instances.get(a.id);assert.equal(v.clip,'mg34_prone_fire_burst');
      assert.equal(actors.find(x=>x.id===a.id).mg34Prone.burst.emitted,rounds,'all requested real shots emitted');
      assert.equal(v.weaponRoot.parent.name,'weapon');assert.equal(v.weapon,'mg34');
      assert.equal(v.root.getObjectByName('rifle').visible,false);assert.equal(v.root.getObjectByName('clip').visible,false);
      assert.equal(c.diagnostics.actors.find(x=>x.id===a.id).weaponMeshes.filter(n=>n==='mg34_body').length,1);
      const muzzle=c.muzzle(a.id).toArray();assert.ok(muzzle.every(Number.isFinite));
      const pose=v.root.getObjectByName('weapon').matrixWorld.toArray();c.update(actors,start+(rounds-1)*.075+.01,sim.player);
      assert.deepEqual(v.root.getObjectByName('weapon').matrixWorld.toArray(),pose,'paused frame');assert.deepEqual(actors,before);
      c.update(at(rounds*.075+.001),start+rounds*.075+.001,sim.player);assert.equal(v.clip,'mg34_prone_aim','no unrequested next shot or reload');
      c.update(actors,start+(rounds-1)*.075+.01,sim.player);assert.deepEqual(v.root.getObjectByName('weapon').matrixWorld.toArray(),pose,'restored clock');
      assert.deepEqual(sim.snapshot(),saved);
    }
  }finally{close();}
});
test('two existing MG sources share art and retain independent rigs within the light budget; LOD, suppression, casualties and missing kit fall back',()=>{
  const {c,close}=characters(),sim=new M01Simulation(),actors=sim.snapshot().actors;
  actors.forEach(a=>{a.active=true;});
  try{
    c.update(actors,1,sim.player,'low');assert.equal(c.diagnostics.limit,18);assert.ok(c.instances.size<=18);
    const a=c.instances.get('de_east_0'),b=c.instances.get('de_east_1');assert.ok(a&&b);
    assert.notEqual(a.mixer,b.mixer);assert.notEqual(a.root.getObjectByName('weapon'),b.root.getObjectByName('weapon'));
    assert.equal(a.root.getObjectByName('mg34_body').geometry,b.root.getObjectByName('mg34_body').geometry);
    assert.equal(a.weaponLOD,2);assert.equal(b.weaponLOD,2);
    c.update(actors,1,{x:1055,z:32},'high');assert.equal(c.instances.get('de_east_0').weaponLOD,0);
    const gunner=actors.find(a=>a.id==='de_east_0');gunner.crouched=true;gunner.suppressedUntil=8;
    c.update(actors,2,sim.player);assert.equal(c.instances.get(gunner.id).clip,'pinned');
    gunner.alive=false;c.update(actors,3,sim.player);assert.equal(c.instances.get(gunner.id).clip,'fallen');assert.equal(c.instances.get(gunner.id).weaponRoot.visible,false);
    c.clips.delete('mg34_fire_burst');const selected=c.update(actors,3,sim.player);
    assert.ok(!selected.has('de_east_0')&&!selected.has('de_east_1'),'procedural supports remain when required optional clips fail');
  }finally{close();}
});
function wagons(load){
  const parent=new THREE.Group(),box=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(),material=new THREE.MeshBasicMaterial();
  const w=new M01TrainWagons(parent,{load},box,cylinder,material,material);
  return {w,close:()=>{w.dispose();box.dispose();cylinder.dispose();material.dispose();}};
}
test('65 actual wagon models use LOD2 instances at 9.10 m with source pivots and shared art; partial/full failures preserve the whole consist',async()=>{
  const material=new THREE.MeshBasicMaterial(),sources=Object.fromEntries(['covered','open'].map(type=>[type,asset(`m01-wagons/m01_wagon_${type}_lod2.glb`,material)]));
  const {w,close}=wagons(async key=>{if(key.includes(':open:'))throw new Error('missing optional open wagon');return sources.covered;});
  try{
    await w.load();assert.equal(w.diagnostics.wagons,65);assert.equal(w.diagnostics.proxies,16);
    const body=w.batches.find(b=>b.name==='wagon_covered_lod2_body'),node=sources.covered.scene.getObjectByName('body');
    assert.equal(body.count,49);assert.equal(body.geometry,node.geometry);assert.equal(body.material,node.material);
    // Plan anchor x/z unchanged; art sits on the rail top (-.82, as locomotive 963) and symmetric wagons may be turned end for end.
    const flip=m01WagonVariation('train963_wagon_01').flip?Math.PI:0;assert.equal(M01_TRAIN_ART_OFFSET_Y,-.82);
    const m=new THREE.Matrix4(),expected=new THREE.Matrix4().makeRotationY(-Math.PI/2+flip);expected.setPosition(1090,-.82,-2.5);expected.multiply(node.matrixWorld);
    body.getMatrixAt(0,m);assert.ok(m.elements.every((v,i)=>Math.abs(v-expected.elements[i])<1e-4));
    body.getMatrixAt(1,m);assert.ok(Math.abs(m.elements[12]-expected.elements[12]-9.1)<1e-4);
    w.sources.set('open:2',sources.open);w.rebuild();assert.equal(w.diagnostics.proxies,0);
    assert.equal(w.batches.find(b=>b.name==='wagon_open_lod2_body').count,16);assert.equal(w.diagnostics.last[0],1672.4);
    let released=0;node.geometry.addEventListener('dispose',()=>released++);w.dispose();assert.equal(released,0,'source cache owns shared geometry');
  }finally{close();for(const s of Object.values(sources))s.scene.traverse(n=>n.geometry?.dispose());material.dispose();}
  const failed=wagons(async()=>{throw new Error('offline');});try{await failed.w.load();assert.equal(failed.w.diagnostics.proxies,65);assert.equal(failed.w.batches.length,0);}finally{failed.close();}
});
test('disposing while optional wagon downloads are pending never attaches models to the old scene',async()=>{
  const waiters=[],{w,close}=wagons(()=>new Promise(resolve=>waiters.push(resolve)));
  const loading=w.load();w.dispose();waiters.forEach(resolve=>resolve({scene:new THREE.Group()}));await loading;
  assert.equal(w.group.parent,null);assert.equal(w.sources.size,0);assert.equal(w.batches.length,0);close();
});
