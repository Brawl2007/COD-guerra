import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';

const dir=new URL('../assets/models/provisional/m01/characters/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
function glb(file){
  const b=readFileSync(new URL(file,dir));assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);
  assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+n));
  const bin=b.subarray(28+n);
  const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},types={5121:['getUint8',1],5123:['getUint16',2],5125:['getUint32',4],5126:['getFloat32',4]};
  const data=index=>{
    const a=json.accessors[index],v=json.bufferViews[a.bufferView],w=widths[a.type],[method,size]=types[a.componentType];
    const view=new DataView(bin.buffer,bin.byteOffset,bin.byteLength),values=[];
    for(let i=0;i<a.count;i++)for(let j=0;j<w;j++)values.push(view[method]((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??w*size)+j*size,true));
    return values;
  };
  return {json,data,bytes:b.length};
}
test('all six GLBs have finite skin weights, valid joint indices, embedded textures and decreasing LOD budgets',()=>{
  for(const nation of ['pl','de']){
    let previous=Infinity;
    for(let lod=0;lod<3;lod++){
      const file=`m01_soldier_${nation}_lod${lod}.glb`,{json,data,bytes}=glb(file),m=manifest.files[file];
      assert.equal(bytes,m.bytes);assert.ok(m.triangles_visible<previous);previous=m.triangles_visible;
      assert.ok(m.triangles_visible<[16500,6500,2100][lod]);
      assert.equal(json.skins[0].joints.length,lod===2?27:60);
      assert.ok(json.images.every(i=>i.bufferView!=null&&!i.uri),'no external texture dependency');
      let min=Infinity,max=-Infinity;
      for(const node of json.nodes.filter(n=>n.mesh!=null))for(const p of json.meshes[node.mesh].primitives){
        const pos=data(p.attributes.POSITION);assert.ok(pos.every(Number.isFinite));
        for(let i=1;i<pos.length;i+=3){min=Math.min(min,pos[i]);max=Math.max(max,pos[i]);}
        const weights=data(p.attributes.WEIGHTS_0),joints=data(p.attributes.JOINTS_0),skin=json.skins[node.skin];
        assert.ok(joints.every(j=>Number.isInteger(j)&&j>=0&&j<skin.joints.length));
        for(let i=0;i<weights.length;i+=4){assert.ok(weights.slice(i,i+4).every(w=>Number.isFinite(w)&&w>=0));assert.ok(Math.abs(weights.slice(i,i+4).reduce((a,b)=>a+b,0)-1)<1e-4);}
      }
      assert.ok(max-min>1.65&&max-min<1.9,'human scale in metres');
    }
  }
});
test('all fifteen animation clips bind to real named bones, have monotonic times and finite transforms',()=>{
  const {json,data}=glb('m01_soldier_animations.glb');
  assert.equal(json.animations.length,15);
  for(const clip of json.animations){
    assert.ok(manifest.files['m01_soldier_animations.glb'].clips.some(c=>c.name===clip.name));
    for(const c of clip.channels){
      assert.ok(json.nodes[c.target.node].name);const s=clip.samplers[c.sampler],times=data(s.input),values=data(s.output);
      assert.ok(times.every((t,i)=>Number.isFinite(t)&&(!i||t>times[i-1])));assert.ok(values.every(Number.isFinite));
      if(c.target.path==='rotation')for(let i=0;i<values.length;i+=4)assert.ok(Math.abs(Math.hypot(...values.slice(i,i+4))-1)<1e-4);
    }
  }
});
function fixture(){
  const root=new THREE.Group(),bone=new THREE.Bone();bone.name='root';root.add(bone);
  for(const name of ['weapon','carry_socket']){const b=new THREE.Bone();b.name=name;bone.add(b);}
  const c=new M01Characters(new THREE.Scene());
  for(const lod of [1,2])c.sources.set(`pl:${lod}`,{scene:root});
  for(const name of ['standing_idle','seated','wounded','carried','carry_wounded','sapper_work_pinned'])c.clips.set(name,new THREE.AnimationClip(name,4,[new THREE.VectorKeyframeTrack('root.position',[0,2,4],[0,0,0,0,.1,0,0,0,0])]));
  return c;
}
test('sampling real clock, changing LOD and restoring a copy preserves bone transforms and immutable data',()=>{
  const c=fixture(),a={id:'sample',active:true,alive:true,team:'ally',x:4,y:-3,z:0,facing:.7,shot:0,state:'GUARD'};
  const before=structuredClone(a);
  try{
    c.update([a],10,{x:0,z:0});const first=c.instances.get(a.id).root.getObjectByName('root').matrixWorld.toArray();
    c.update([a],10,{x:-20,z:0});assert.equal(c.instances.get(a.id).key,'pl:2');
    assert.deepEqual(c.instances.get(a.id).root.getObjectByName('root').matrixWorld.toArray(),first);
    c.update([structuredClone(a)],10,{x:0,z:0});assert.deepEqual(c.instances.get(a.id).root.getObjectByName('root').matrixWorld.toArray(),first);
    assert.deepEqual(a,before);c.update([],11,{x:0,z:0});assert.equal(c.instances.size,0);
  }finally{c.dispose();}
});
test('wounded attachment follows its carrier socket and detaches after delivery without changing simulation coordinates',()=>{
  const c=fixture(),medic={id:'leon_dudek',active:true,alive:true,team:'ally',role:'MEDIC',state:'EVACUATION',x:4,y:-3,z:0,facing:0},bak={...medic,id:'jozef_bak',role:'RIFLEMAN',state:'WOUNDED',x:3.75,y:-1.85,carriedBy:'leon_dudek'};
  const saved=structuredClone([medic,bak]);
  try{
    c.update([medic,bak],12,{x:0,z:0});const v=c.instances.get(bak.id);
    assert.equal(v.root.parent.name,'carry_socket');assert.equal(v.clip,'carried');assert.equal(c.instances.get(medic.id).clip,'carry_wounded');
    assert.deepEqual([medic,bak],saved);const delivered={...bak,carriedBy:null,y:-3};
    c.update([medic,delivered],13,{x:0,z:0});assert.equal(v.root.parent,c.scene);assert.equal(v.clip,'wounded');assert.equal(v.root.position.y,-3);
  }finally{c.dispose();}
});
test('MakeHuman data licence is shipped exactly as locked at its source revision',()=>{
  const lock=JSON.parse(readFileSync(new URL('../tools/assets/m01-soldiers/makehuman.lock.json',import.meta.url)));
  const license=readFileSync(new URL('../assets/licenses/MakeHuman-CC0.md',import.meta.url));
  assert.equal(createHash('sha256').update(license).digest('hex'),lock.sha256['LICENSE.ASSETS.md']);
});
test('riflemen finish the bolt after the flash; pinned engineers stop their working hands until the repair resumes',()=>{
  const c=fixture();
  c.clips.set('fire_bolt',new THREE.AnimationClip('fire_bolt',1.17,[]));
  const rifleman={id:'de_spans_01',active:true,alive:true,team:'enemy',state:'SUPPRESS',shot:0,firedAt:10};
  const pose={name:'standing',aiming:true,underFire:false,moving:false};
  try{
    const bolt=c.sample(rifleman,10.8,[rifleman],pose);
    assert.equal(bolt.clip,'fire_bolt');assert.ok(Math.abs(bolt.time-.8)<1e-10);assert.equal(bolt.loop,false);
    assert.equal(c.sample(rifleman,11.3,[rifleman],pose).clip,'aim');
    const engineer={id:'pawel_krawiec',role:'ENGINEER',crouched:true};
    const pinned={...pose,name:'pinned',underFire:true,aiming:false};
    const first=c.sample(engineer,10,[engineer],pinned),later=c.sample(engineer,12,[engineer],pinned);
    assert.deepEqual(later,first);assert.equal(first.clip,'sapper_work_pinned');assert.equal(first.loop,false);
    const working=c.sample(engineer,13,[engineer],{...pinned,underFire:false});
    assert.equal(working.clip,'sapper_work');assert.equal(working.loop,true);
  }finally{c.dispose();}
});
