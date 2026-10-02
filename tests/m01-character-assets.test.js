import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {M01ViewModel,viewModelArmsGeometry} from '../src/render/m01-viewmodel.js';

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
      assert.equal(json.skins[0].joints.length,lod===2?28:61);
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
test('all twenty-five animation clips bind to real named bones, have monotonic times and finite transforms',()=>{
  const {json,data}=glb('m01_soldier_animations.glb');
  assert.equal(json.animations.length,25);
  for(const clip of json.animations){
    assert.ok(manifest.files['m01_soldier_animations.glb'].clips.some(c=>c.name===clip.name));
    for(const c of clip.channels){
      assert.ok(json.nodes[c.target.node].name);const s=clip.samplers[c.sampler],times=data(s.input),values=data(s.output);
      assert.ok(times.every((t,i)=>Number.isFinite(t)&&(!i||t>times[i-1])));assert.ok(values.every(Number.isFinite));
      if(c.target.path==='rotation')for(let i=0;i<values.length;i+=4)assert.ok(Math.abs(Math.hypot(...values.slice(i,i+4))-1)<1e-4);
    }
  }
});
test('the original station drag loops on the existing rig with a locked source and finite transforms',()=>{
  const info=JSON.parse(readFileSync(new URL('station-animations.manifest.json',dir))),file=readFileSync(new URL(info.file,dir));
  assert.equal(file.length,info.bytes);assert.equal(createHash('sha256').update(file).digest('hex'),info.sha256);
  assert.equal(createHash('sha256').update(readFileSync(new URL(info.sourceRig,dir))).digest('hex'),info.sourceRigSHA256);
  const {json,data}=glb(info.file),names=new Set(glb(info.sourceRig).json.nodes.map(n=>n.name));
  assert.deepEqual(json.animations.map(c=>c.name),['drag_wounded']);
  for(const c of json.animations[0].channels){
    assert.ok(names.has(json.nodes[c.target.node].name));
    const s=json.animations[0].samplers[c.sampler],times=data(s.input),values=data(s.output),width={rotation:4,translation:3,scale:3}[c.target.path];
    assert.ok(times.every((t,i)=>Number.isFinite(t)&&(!i||t>times[i-1])));assert.ok(values.every(Number.isFinite));
    assert.ok(Math.abs(times.at(-1)-1.4)<1e-6);
    for(let k=0;k<width;k++)assert.ok(Math.abs(values[k]-values[values.length-width+k])<1e-4,'loop returns to its initial pose');
    if(c.target.path==='rotation')for(let i=0;i<values.length;i+=4)assert.ok(Math.abs(Math.hypot(...values.slice(i,i+4))-1)<1e-4);
  }
});
test('first-person geometry keeps actual GLB arm/hand surfaces and leaves the world uniform unchanged',()=>{
  for(const lod of [0,1]){
    const {json,data}=glb(`m01_soldier_pl_lod${lod}.glb`),body=json.nodes.find(n=>n.name==='body');
    const p=json.meshes[body.mesh].primitives[0],g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(data(p.attributes.POSITION),3));
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(data(p.attributes.JOINTS_0),4));
    g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(data(p.attributes.WEIGHTS_0),4));
    g.setIndex(data(p.indices));const original=Array.from(g.index.array);
    const bones=json.skins[body.skin].joints.map(i=>json.nodes[i].name),arms=viewModelArmsGeometry(g,bones);
    assert.ok(arms.index.count>600&&arms.index.count<g.index.count*.65,'arms have useful detail without torso/legs');
    assert.deepEqual(Array.from(g.index.array),original,'source shared by world characters is intact');
    const retained=new Set(arms.index.array);let hands=false;
    for(const i of retained)for(let k=0;k<4;k++){
      const weight=g.attributes.skinWeight.array[i*4+k],bone=bones[g.attributes.skinIndex.array[i*4+k]];
      if(weight>.5){assert.ok(!/^(thigh|calf|foot|hips)/.test(bone));if(bone.startsWith('hand_'))hands=true;}
    }
    assert.ok(hands);g.dispose();arms.dispose();
    // Equivalent interleaved accessors, as exposed by GLTFLoader, must keep the same arm surfaces.
    const packedJ=data(p.attributes.JOINTS_0),packedW=data(p.attributes.WEIGHTS_0),values=[];
    for(let i=0;i<packedJ.length;i+=4)values.push(...packedJ.slice(i,i+4),...packedW.slice(i,i+4));
    const shared=new THREE.InterleavedBuffer(new Float32Array(values),8);
    const interleaved=new THREE.BufferGeometry();interleaved.setIndex(original);
    interleaved.setAttribute('skinIndex',new THREE.InterleavedBufferAttribute(shared,4,0));
    interleaved.setAttribute('skinWeight',new THREE.InterleavedBufferAttribute(shared,4,4));
    const interArms=viewModelArmsGeometry(interleaved,bones);
    assert.deepEqual(Array.from(interArms.index.array),Array.from(arms.index.array));
    interleaved.dispose();interArms.dispose();
  }
});
function fixture(){
  const root=new THREE.Group(),bone=new THREE.Bone();bone.name='root';root.add(bone);
  const model=glb('m01_soldier_pl_lod1.glb').json;
  root.name='m01_soldier_pl';root.userData=model.nodes.find(n=>n.name===root.name).extras;
  const geometry=new THREE.BufferGeometry(),material=new THREE.MeshBasicMaterial();
  for(const n of model.nodes.filter(n=>n.mesh!=null)){
    const m=new THREE.Mesh(geometry,material);m.name=n.name;m.userData=n.extras??{};root.add(m);
  }
  for(const name of ['weapon','carry_socket']){const b=new THREE.Bone();b.name=name;bone.add(b);}
  const c=new M01Characters(new THREE.Scene());
  for(const lod of [1,2])c.sources.set(`pl:${lod}`,{scene:root});
  for(const name of ['standing_idle','seated','wounded','carried','carry_wounded','sapper_work_pinned','pinned','rkm_aim','rkm_standing_idle','rkm_clean'])c.clips.set(name,new THREE.AnimationClip(name,4,[new THREE.VectorKeyframeTrack('root.position',[0,2,4],[0,0,0,0,.1,0,0,0,0])]));
  const dispose=c.dispose.bind(c);c.dispose=()=>{dispose();geometry.dispose();material.dispose();};
  return c;
}

test('the actual reload rig keeps the open action, clip and hand in the first-person frustum on both usable LODs',()=>{
  const animations=glb('m01_soldier_animations.glb');
  for(const lod of [0,1]){
    const {json,data}=glb(`m01_soldier_pl_lod${lod}.glb`),body=json.nodes.find(n=>n.name==='body');
    const p=json.meshes[body.mesh].primitives[0],g=new THREE.BufferGeometry(),material=new THREE.MeshBasicMaterial();
    g.setAttribute('position',new THREE.Float32BufferAttribute(data(p.attributes.POSITION),3));
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(data(p.attributes.JOINTS_0),4));
    g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(data(p.attributes.WEIGHTS_0),4));g.setIndex(data(p.indices));
    const nodes=json.nodes.map(n=>{
      const o=n===body?new THREE.SkinnedMesh(g,material):n.mesh!=null?new THREE.Mesh(new THREE.BufferGeometry(),material):new THREE.Bone();
      o.name=n.name??'';o.position.fromArray(n.translation??[0,0,0]);o.quaternion.fromArray(n.rotation??[0,0,0,1]);
      return o;
    }),root=new THREE.Group();
    json.nodes.forEach((n,i)=>n.children?.forEach(k=>nodes[i].add(nodes[k])));json.scenes[0].nodes.forEach(k=>root.add(nodes[k]));root.updateMatrixWorld(true);
    const skin=json.skins[body.skin],bind=data(skin.inverseBindMatrices);
    nodes[json.nodes.indexOf(body)].bind(new THREE.Skeleton(skin.joints.map(i=>nodes[i]),skin.joints.map((_,i)=>new THREE.Matrix4().fromArray(bind,i*16))));
    const characters=new M01Characters(new THREE.Scene());characters.sources.set(`pl:${lod}`,{scene:root});
    for(const a of animations.json.animations){
      const tracks=a.channels.map(c=>{
        const s=a.samplers[c.sampler],property={rotation:'quaternion',translation:'position',scale:'scale'}[c.target.path];
        const Track=c.target.path==='rotation'?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
        return new Track(`${animations.json.nodes[c.target.node].name}.${property}`,animations.data(s.input),animations.data(s.output),s.interpolation==='STEP'?THREE.InterpolateDiscrete:THREE.InterpolateLinear);
      });characters.clips.set(a.name,new THREE.AnimationClip(a.name,-1,tracks));
    }
    const scene=new THREE.Scene(),view=new M01ViewModel(scene,characters,new THREE.Texture());
    const camera=new THREE.PerspectiveCamera(58,1280/720,.03,6);camera.updateMatrixWorld(true);
    const sim={clock:1,player:{aiming:false,moveBlend:0},renderState:{weaponVisible:true},weapon:{state:'RELOAD_CLIP',reloading:true,reloadProgress:()=>0}};
    try{
      for(const time of [1.2,1.8,2.1]){
        sim.weapon.reloadProgress=()=>time/characters.clips.get('reload_clip').duration;view.update(sim,'low',0);
        for(const name of ['weapon','weapon_clip','hand_r']){
          const point=view.root.getObjectByName(name).getWorldPosition(new THREE.Vector3());
          assert.ok(point.z<-.03,`${name} must remain ahead of the camera, LOD${lod} at ${time}`);
          point.project(camera);assert.ok(Math.abs(point.x)<.95&&Math.abs(point.y)<.95,`${name} visible during reload: ${point.toArray()}`);
        }
        const first=view.root.getObjectByName('weapon').matrixWorld.toArray();view.update(sim,'low',0);
        assert.deepEqual(view.root.getObjectByName('weapon').matrixWorld.toArray(),first,'a paused frame is reproducible');
      }
    }finally{view.dispose();characters.dispose();root.traverse(n=>{n.geometry?.dispose();n.skeleton?.dispose();});material.dispose();}
  }
});
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
test('the station casualty remains grounded while the medic samples the backward drag and its fallback',()=>{
  const c=fixture(),medic={id:'leon_dudek',active:true,alive:true,team:'ally',role:'MEDIC',state:'GUARD',crouched:true,x:4,y:-3,z:0,facing:0},
    patient={...medic,id:'generic_rifleman',role:'RIFLEMAN',state:'WOUNDED',task:'station_wounded',x:4.92,carriedBy:medic.id};
  c.clips.set('drag_wounded',new THREE.AnimationClip('drag_wounded',1.4,[]));const saved=structuredClone([medic,patient]);
  try{
    c.update([medic,patient],12,{x:0,z:0});const v=c.instances.get(patient.id);
    assert.equal(v.root.parent,c.scene);assert.equal(v.root.position.y,-3);assert.equal(v.clip,'wounded');assert.equal(c.instances.get(medic.id).clip,'drag_wounded');
    assert.deepEqual([medic,patient],saved);const initial=c.instances.get(medic.id).root.matrixWorld.toArray();c.update([medic,patient],12,{x:0,z:0});
    assert.deepEqual(c.instances.get(medic.id).root.matrixWorld.toArray(),initial);
    c.clips.delete('drag_wounded');c.update([medic,patient],13,{x:0,z:0});assert.equal(c.instances.get(medic.id).clip,'pinned');
  }finally{c.dispose();}
});
test('Kowal and healthy Bąk use their own meshes and muzzle sockets, preserve data and hide the casualty weapon',()=>{
  const c=fixture(),kowal={id:'szymon_kowal',active:true,alive:true,team:'ally',role:'SUPPORT',state:'GUARD',x:4,y:-3,z:0,facing:0,shot:.25,firedAt:10,rounds:17,cooldown:4},
    bak={...kowal,id:'jozef_bak',role:'RIFLEMAN',shot:0,firedAt:-100,rounds:5},saved=structuredClone([kowal,bak]);
  c.clips.set('rkm_fire_burst',new THREE.AnimationClip('rkm_fire_burst',.8,[]));c.clips.set('rkm_reload',new THREE.AnimationClip('rkm_reload',3.4,[]));
  try{
    c.update([kowal,bak],10.1,{x:0,z:0});let stats=c.diagnostics;
    const k=stats.actors.find(a=>a.id===kowal.id),b=stats.actors.find(a=>a.id===bak.id);
    assert.equal(k.clip,'rkm_fire_burst');assert.ok(k.weaponMeshes.includes('rkm_wz28'));assert.ok(!k.weaponMeshes.includes('rifle')&&!k.weaponMeshes.includes('clip'));
    assert.ok(b.weaponMeshes.includes('rifle_wz98a'));assert.ok(!b.weaponMeshes.includes('rifle'));
    for(const a of [kowal,bak]){
      const v=c.instances.get(a.id),expected=new THREE.Vector3().fromArray(v.root.userData.weapons[v.weapon].muzzle).applyMatrix4(v.root.getObjectByName('weapon').matrixWorld);
      assert.ok(c.muzzle(a.id).distanceTo(expected)<1e-10);
    }
    assert.deepEqual([kowal,bak],saved);
    c.update([{...kowal,rounds:20},bak],11.3,{x:0,z:0});assert.equal(c.instances.get(kowal.id).clip,'rkm_reload');
    c.update([kowal,{...bak,state:'WOUNDED'}],12,{x:0,z:0});assert.deepEqual(c.diagnostics.actors.find(a=>a.id===bak.id).weaponMeshes,[]);
  }finally{c.dispose();}
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
