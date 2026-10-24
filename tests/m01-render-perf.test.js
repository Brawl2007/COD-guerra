// Renderer-only per-frame cost fixes (docs/verification/m01-runtime/render-perf-2026-10-22): one Skeleton per soldier, M01Characters.update()
// scratch reuse with lazy diagnostics, the viewmodel change key without JSON.stringify, and no async loader call per frame.
// None of it may change what is drawn: the posed bone matrices are compared bit for bit with the former one-Skeleton-per-mesh clone.
import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {M01Characters,shareSkeletons} from '../src/render/m01-characters.js';
import {M01ViewModel} from '../src/render/m01-viewmodel.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {Wz29} from '../src/game/wz29.js';
import {nodeCharacterAssets} from '../tools/verification/m01-soldier-variation-assets.mjs';

const assets=await nodeCharacterAssets();
const proto=new M01Simulation().actors;
const rifleman=(team,id,x,extra={})=>({...proto.find(a=>a.team===team&&!a.civilian&&a.role==='RIFLEMAN'),id,active:true,alive:true,state:'GUARD',crouched:false,target:null,shot:0,firedAt:-1e9,x,y:0,z:0,facing:0,...extra});
function characters(options={}){const c=new M01Characters(new THREE.Scene(),{visualVariation:true,...options});c.sources=new Map(assets.sources);c.clips=assets.clips;return c;}
const player={x:0,z:0};
const skinned=root=>{const out=[];root.traverse(n=>{if(n.isSkinnedMesh)out.push(n);});return out;};
const distinct=root=>new Set(skinned(root).map(m=>m.skeleton));

test('shareSkeletons: meshes cloned from one source skin share one Skeleton; different skins stay separate; every bindMatrix is kept',()=>{
  for(const key of ['pl:0','pl:1','pl:2','de:0','de:1','de:2']){
    const source=assets.sources.get(key).scene,root=clone(source);
    assert.ok(skinned(source).length>1,`${key}: several skinned meshes`);
    assert.equal(distinct(source).size,1,`${key}: the source has one skin`);
    assert.equal(distinct(root).size,skinned(root).length,`${key}: SkeletonUtils.clone() makes one Skeleton per mesh`);
    const bind=skinned(root).map(m=>m.bindMatrix.clone()),inverse=skinned(root).map(m=>m.bindMatrixInverse.clone());
    const leaders=shareSkeletons(root);
    assert.equal(leaders.length,1);assert.equal(distinct(root).size,1,`${key}: one Skeleton per soldier`);
    skinned(root).forEach((m,i)=>{assert.ok(m.bindMatrix.equals(bind[i]),`${key}: bindMatrix of ${m.name}`);assert.ok(m.bindMatrixInverse.equals(inverse[i]),`${key}: bindMatrixInverse of ${m.name}`);});
  }
  // two skins (different bones or different inverse bind matrices) are never merged
  const bonesA=[new THREE.Bone(),new THREE.Bone()],bonesB=[new THREE.Bone(),new THREE.Bone()],root=new THREE.Group();
  const mesh=(bones,inv)=>{const m=new THREE.SkinnedMesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial());for(const b of bones)if(!b.parent)m.add(b);m.bind(new THREE.Skeleton(bones,inv),new THREE.Matrix4());root.add(m);return m;};
  const invA=[new THREE.Matrix4(),new THREE.Matrix4()],invA2=invA.map(m=>m.clone()),invC=[new THREE.Matrix4().makeTranslation(1,2,3),new THREE.Matrix4()];
  const m1=mesh(bonesA,invA),m2=mesh(bonesA,invA2),m3=mesh(bonesA,invC),m4=mesh(bonesB,invA);
  const own3=m3.skeleton,own4=m4.skeleton;
  assert.equal(shareSkeletons(root).length,3);
  assert.equal(m2.skeleton,m1.skeleton,'same bones and equal inverses: shared');assert.equal(m3.skeleton,own3);assert.equal(m4.skeleton,own4);
});

// The reference is the previous behaviour: a plain SkeletonUtils clone (one Skeleton per mesh) posed with the same bone transforms.
function referencePose(v,key){
  const ref=clone(assets.sources.get(key).scene),bones=new Map();new THREE.Scene().add(ref);   // under a parent like the instance, so the world matrices multiply the same way (-0 stays -0)
  v.root.traverse(n=>{if(n.isBone)bones.set(n.name,n);});
  ref.traverse(n=>{if(n.isBone){const b=bones.get(n.name);n.position.copy(b.position);n.quaternion.copy(b.quaternion);n.scale.copy(b.scale);}});
  ref.position.copy(v.root.position);ref.quaternion.copy(v.root.quaternion);ref.scale.copy(v.root.scale);
  ref.updateMatrixWorld(true);
  const out=new Map();for(const m of skinned(ref)){m.skeleton.update();out.set(m.name,{matrices:m.skeleton.boneMatrices.slice(),bind:m.bindMatrix.elements.slice(),inv:m.bindMatrixInverse.elements.slice()});}
  return out;
}

test('pose parity: the bone matrices of every skinned mesh are bit-identical to the one-Skeleton-per-mesh clone; one Skeleton per soldier, disposed once',()=>{
  const c=characters();let checked=0;
  try{
    const actors=[rifleman('ally','near_pl',20),rifleman('enemy','near_de',-30),rifleman('ally','mid_pl',60,{state:'ADVANCE',motion:{speed:1.4,gait:'walk',odometer:3}}),rifleman('enemy','far_de',150),rifleman('ally','far_pl',220)];
    for(let f=0;f<24;f++){
      const t=20+f*(1/60);c.update(actors.map(a=>({...a})),t,player,'high');
      for(const [id,v] of c.instances){
        const meshes=v.meshes.filter(m=>m.isSkinnedMesh);   // the logical parts: R8-a draws them as merged batches (tests/m01-soldier-batching.test.js), the bone data is the same
        assert.equal(distinct(v.root).size,1,`${id}: one Skeleton per soldier`);
        const reference=referencePose(v,v.key);assert.equal(reference.size,meshes.length);
        for(const m of meshes){
          m.skeleton.update();const want=reference.get(m.name);assert.ok(want,`${id}: reference mesh ${m.name}`);
          assert.deepEqual([...m.skeleton.boneMatrices],[...want.matrices],`${id} frame ${f}: bone matrices of ${m.name}`);
          assert.deepEqual([...m.bindMatrix.elements],want.bind);assert.deepEqual([...m.bindMatrixInverse.elements],want.inv);checked++;
        }
      }
    }
    assert.ok(checked>24*5*8,`compared ${checked} skinned meshes`);
    // release() disposes each distinct Skeleton exactly once
    const v=c.instances.get('near_pl'),calls=[];const real=skinned(v.root)[0].skeleton;real.dispose=()=>calls.push('dispose');
    c.release(v);assert.equal(calls.length,1);
  }finally{c.dispose();}
});

test('M01Characters.update(): scratch is reused, nothing is retained, and the diagnostics entries are only built when read',()=>{
  const c=characters();let built=0;const real=c.diagnosticsView.bind(c);c.diagnosticsView=v=>{built++;return real(v);};
  try{
    const mk=()=>[rifleman('ally','a',15),rifleman('enemy','b',-40),rifleman('ally','c',80),rifleman('enemy','d',160),rifleman('ally','e',210),rifleman('enemy','f',9e3)];
    c.update(mk(),20,player,'high');
    const pool=[...c.candPool],poolLayers=[...c.layerPool];
    assert.equal(c.candPool.length,5,'the 9 km actor is not a candidate');assert.equal(c.cands.length,0,'no actor record is retained between frames');assert.ok(c.candPool.every(r=>r.a===null));
    for(let f=1;f<=30;f++)c.update(mk(),20+f/60,player,'high');
    assert.equal(built,0,'no diagnostics entry is built per frame');
    assert.ok(c.candPool.every((r,i)=>r===pool[i]),'candidate records are reused');assert.ok(poolLayers.every((r,i)=>r===c.layerPool[i]),'layer records are reused');
    const view=c.stats.actors;assert.equal(built,c.instances.size);assert.strictEqual(c.stats.actors,view,'built once per update');
    assert.deepEqual(view.map(e=>e.id).sort(),['a','b','c','d','e']);
    for(const e of view){
      assert.ok(['id','lod','key','visual','clip','clipTime','loop','blend','weapon','weaponLOD','muzzle','weaponMeshes'].every(k=>k in e),`${e.id} fields`);
      const v=c.instances.get(e.id);
      assert.equal(e.key,v.key);assert.equal(e.lod,Number(v.key.slice(3)));assert.equal(e.clip,v.sampleClip);assert.equal(e.clipTime,v.action.time);
      assert.deepEqual(e.muzzle,c.muzzle(e.id).toArray(),'muzzle: same value as the live socket (IK off)');
      assert.deepEqual(e.blend.map(b=>Object.keys(b).join()),e.blend.map(()=>'clip,weight,time'));
      assert.ok(e.blend.some(b=>b.clip===e.clip),'the target layer is drawn');
    }
    assert.ok(Object.keys(c.diagnostics).includes('actors'),'the diagnostics getter still exposes actors');
    assert.equal(c.diagnostics.actors.length,5);
  }finally{c.dispose();}
});

test('M01Characters.update(): no async loader call (no Promise) per frame once sources are loaded or pending',()=>{
  const c=characters(),calls={source:0,mg:0,ckm:0};
  for(const [name,key] of [['loadSource','source'],['loadMG','mg'],['loadCKM','ckm']]){const real=c[name].bind(c);c[name]=(...a)=>{calls[key]++;return real(...a);};}
  try{
    // every high source already loaded except the ones below, which are pending: nothing may be requested
    for(const k of ['pl:0','de:0','de:1'])c.sources.set(k,c.sources.get('pl:2'));
    for(const k of ['mg34:0','mg34:1','ckm:0'])c.pending.add(k);
    c.sources.set('ckm:1',{scene:new THREE.Group(),animations:[]});
    for(let f=0;f<60;f++)c.update([rifleman('ally','a',10)],20+f/60,player,'high');
    assert.deepEqual(calls,{source:0,mg:0,ckm:0});
    // a source nobody has requested yet is requested once (then it is pending) and only on the high tier
    c.pending.delete('mg34:1');c.update([],21,player,'medium');assert.equal(calls.mg,0,'medium does not request high sources');
    c.update([],21,player,'high');c.update([],21,player,'high');assert.equal(calls.mg,1,'requested once, pending afterwards');assert.ok(c.pending.has('mg34:1'));
    c.disposed=true;c.pending.clear();c.update([],22,player,'high');assert.equal(calls.mg,1,'a disposed instance requests nothing');
  }finally{c.disposed=false;c.dispose();}
});

// ---- viewmodel: change key without JSON.stringify; the render state is read once per frame ----
function rig(characters){
  const camera=new THREE.PerspectiveCamera(70,16/9,.05,7500);camera.position.set(0,1.7,0);camera.lookAt(10,1.7,0);camera.updateMatrixWorld();
  const reads={renderState:0},world={obstacles:[],revision:1},state={weaponVisible:true};
  const sim={clock:10,player:{aiming:false,moveBlend:0,sprinting:false,crouched:false,angle:0,pitch:0},weapon:new Wz29(),world,get renderState(){reads.renderState++;return state;}};
  return {v:new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim,camera,reads,state};
}

test('viewmodel.update: unchanged frames are skipped without JSON.stringify; every key input still invalidates; renderState is read at most once',async()=>{
  const {viewModelFixture}=await import('./helpers/m01-viewmodel-fixture.js');
  const c=await viewModelFixture(),r=rig(c);
  const stringify=JSON.stringify;let json=0;JSON.stringify=function(...a){json++;return stringify.apply(this,a);};
  try{
    const view=()=>({camera:r.camera,viewFov:58});
    r.v.update(r.sim,'low',0,view());const first=r.v.stats;assert.equal(first.active,true);
    const reads=r.reads.renderState;r.v.update(r.sim,'low',0,view());assert.equal(r.reads.renderState-reads,1,'without a state argument the getter is read once');
    assert.strictEqual(r.v.stats,first,'same inputs: the frame is not re-sampled');
    const jsonBefore=json;r.reads.renderState=0;for(let i=0;i<30;i++)r.v.update(r.sim,'low',0,view(),r.state);
    assert.equal(r.reads.renderState,0,'the caller state is used, the getter is not read');assert.strictEqual(r.v.stats,first);
    assert.equal(json,jsonBefore,'no JSON.stringify on unchanged frames');
    const changed=(name,mutate,restore)=>{const before=r.v.stats;mutate();r.v.update(r.sim,'low',0,view(),r.state);assert.notStrictEqual(r.v.stats,before,`${name} re-samples`);restore?.();r.v.update(r.sim,'low',0,view(),r.state);};
    changed('clock',()=>{r.sim.clock+=.01;});
    changed('aiming',()=>{r.sim.player.aiming=true;},()=>{r.sim.player.aiming=false;});
    changed('angle',()=>{r.sim.player.angle=.2;});changed('pitch',()=>{r.sim.player.pitch=.1;});
    changed('camera position',()=>{r.camera.position.x+=.01;r.camera.updateMatrixWorld();});
    changed('camera rotation',()=>{r.camera.rotation.y+=.01;r.camera.updateMatrixWorld();});
    const before=r.v.stats;r.v.update(r.sim,'low',99,view(),r.state);assert.notStrictEqual(r.v.stats,before,'flashUntil re-samples');
    const b2=r.v.stats;r.state.weaponVisible=false;r.v.update(r.sim,'low',99,view(),r.state);assert.notStrictEqual(r.v.stats,b2,'weapon visibility re-samples');assert.equal(r.v.stats.visible,false);
    r.state.weaponVisible=true;
    const b3=r.v.stats;r.sim.world.revision++;r.v.update(r.sim,'low',99,view(),r.state);assert.notStrictEqual(r.v.stats,b3,'world revision re-samples');
    const b4=r.v.stats;r.v.sampleKey=null;r.v.update(r.sim,'low',99,view(),r.state);assert.notStrictEqual(r.v.stats,b4,'sampleKey=null still forces a re-sample');
    const b5=r.v.stats;r.v.update(r.sim,'low',99,null,r.state);assert.notStrictEqual(r.v.stats,b5,'no camera is a different key');const b6=r.v.stats;r.v.update(r.sim,'low',99,null,r.state);assert.strictEqual(r.v.stats,b6);
    // re-sampled frames do not serialise a key either: only the first-build code of the rig may (it is not per frame)
  }finally{JSON.stringify=stringify;r.v.dispose();c.dispose();}
});

// Source guard (same idea as m01-t49-scratch-reuse): the per-frame bodies create no vectors/quaternions and serialise nothing.
test('per-frame bodies: no THREE allocation in M01Characters.update, no JSON.stringify in either update, no filter/forEach chains',()=>{
  const src=name=>readFileSync(new URL(`../src/render/${name}`,import.meta.url),'utf8');
  const body=(code,name)=>{const lines=code.split('\n'),start=lines.findIndex(l=>new RegExp(`^  ${name}\\(.*\\)\\{`).test(l));assert.ok(start>=0,name);
    let end=lines.findIndex((l,i)=>i>start&&/^  [A-Za-z_]+\(.*\)\{|^  \/\*\*/.test(l));if(end<0)end=lines.length;return lines.slice(start,end).join('\n');};
  const characters=body(src('m01-characters.js'),'update'),viewmodel=body(src('m01-viewmodel.js'),'update');
  for(const [name,code] of [['M01Characters.update',characters],['M01ViewModel.update',viewmodel]]){
    if(name==='M01Characters.update')assert.ok(!/new THREE\.[A-Za-z0-9]+\(/.test(code),`${name}: no new THREE.* per frame`);
    assert.ok(!/JSON\.stringify/.test(code.replace(/\/\/.*$/gm,'')),`${name}: no JSON.stringify`);
  }
  assert.ok(!/\.(filter|flatMap|forEach)\(/.test(characters),'M01Characters.update: no filter/flatMap/forEach chains');
  assert.ok(!/void this\.load(Source|MG|CKM)\(/.test(characters),'M01Characters.update: loaders are guarded (requestHighSources)');
  assert.equal((viewmodel.replace(/\/\/.*$/gm,'').match(/\brenderState\b/g)??[]).length,1,'M01ViewModel.update reads sim.renderState once (default of the state argument)');
});
