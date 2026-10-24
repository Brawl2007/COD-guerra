// R8-a: a soldier's visible skinned parts are drawn as merged batches (body, weapon) instead of one mesh per part.
// The merged path must draw exactly what the former per-part path drew: same Skeleton and bone matrices, same skinned vertices (position, colour, uv),
// same triangles; only the number of draw calls changes. Presentation only: the simulation is not touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {SoldierMergeCache,mergeSoldierGeometries} from '../src/render/m01-soldier-batching.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {nodeCharacterAssets} from '../tools/verification/m01-soldier-variation-assets.mjs';

const assets=await nodeCharacterAssets();
const proto=new M01Simulation().actors;
const find=id=>proto.find(a=>a.id===id);
const rifleman=(team,id,x,extra={})=>({...proto.find(a=>a.team===team&&!a.civilian&&a.role==='RIFLEMAN'),id,active:true,alive:true,state:'GUARD',crouched:false,target:null,shot:0,firedAt:-1e9,x,y:0,z:0,facing:0,...extra});
const named=(id,x,extra={})=>({...find(id),active:true,alive:true,state:'GUARD',crouched:false,target:null,shot:0,firedAt:-1e9,x,y:0,z:0,facing:0,...extra});
function characters(batching,scene=new THREE.Scene()){const c=new M01Characters(scene,{visualVariation:true,batching});c.sources=new Map(assets.sources);c.clips=assets.clips;return c;}
const player={x:0,z:0};

/** Meshes WebGLRenderer would submit under `root`: visible with every ancestor visible (projectObject), a drawable geometry and a visible material. */
function drawn(root){
  const out=[];
  const walk=o=>{if(!o.visible)return;if(o.isMesh&&o.material?.visible!==false&&o.geometry&&(o.geometry.index?.count??o.geometry.getAttribute('position').count)>0)out.push(o);for(const k of o.children)walk(k);};
  walk(root);return out;
}
const triangles=meshes=>meshes.reduce((s,m)=>s+(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3,0);

// Per-vertex key of what a mesh puts on screen: skinned world position, vertex colour (white when absent) and uv. Exact numbers, no tolerance.
const _v=new THREE.Vector3();
function vertexKeys(mesh){
  const pos=mesh.geometry.getAttribute('position'),col=mesh.geometry.getAttribute('color'),uv=mesh.geometry.getAttribute('uv'),keys=new Array(pos.count);
  for(let i=0;i<pos.count;i++){
    _v.fromBufferAttribute(pos,i);mesh.applyBoneTransform(i,_v);_v.applyMatrix4(mesh.matrixWorld);
    keys[i]=`${_v.x},${_v.y},${_v.z}|${col?`${col.getX(i)},${col.getY(i)},${col.getZ(i)}`:'1,1,1'}|${uv.getX(i)},${uv.getY(i)}`;
  }
  return keys;
}
/** Sorted multiset of drawn triangles, each as its three vertex keys. */
function triangleSet(meshes){
  const out=[];
  for(const m of meshes){const keys=vertexKeys(m),ix=m.geometry.index;for(let i=0;i<ix.count;i+=3)out.push([keys[ix.getX(i)],keys[ix.getX(i+1)],keys[ix.getX(i+2)]].sort().join('/'));}
  return out.sort();
}
const materialKeys=meshes=>meshes.map(m=>`${m.material.uuid}|${m.material.vertexColors}|${m.material.customProgramCacheKey?.()}`);

test('draw-call budget: at most 2 draw calls per skinned soldier (body + weapon), against 6 per part on the former path; triangles identical',()=>{
  for(const [name,actor] of [['pl rifleman',rifleman('ally','pl_r',10)],['de rifleman',rifleman('enemy','de_r',10)],['pl sergeant (nco, rank)',named('marek_zielinski',10)],['pl sapper',named('pawel_krawiec',10)],['pl wz.98a',named('jozef_bak',10)]]){
    for(const lodDistance of [10,60,150]){
      const a={...actor,x:lodDistance},on=characters(true),off=characters(false);
      try{
        on.update([a],20,player,'high');off.update([a],20,player,'high');
        const batched=drawn(on.instances.get(a.id).root),legacy=drawn(off.instances.get(a.id).root);
        assert.ok(batched.length<=2,`${name} @${lodDistance} m: ${batched.length} draw calls (${batched.map(m=>m.name)})`);
        assert.ok(legacy.length>=4,`${name} @${lodDistance} m: the per-part path draws ${legacy.length}`);
        assert.equal(triangles(batched),triangles(legacy),`${name} @${lodDistance} m: same triangle count`);
        assert.equal(on.stats.submittedDrawCalls,batched.length,`${name}: stats.submittedDrawCalls matches the scene walk`);
        assert.equal(off.stats.submittedDrawCalls,legacy.length);
        assert.equal(on.stats.submittedMeshes,off.stats.submittedMeshes,'the logical part count (submittedMeshes) is unchanged');
      }finally{on.dispose();off.dispose();}
    }
  }
});

test('draw-call budget: 40 soldiers over all LOD bands draw 2 each instead of 6 (a fixed budget, independent of the preset)',()=>{
  const mk=()=>Array.from({length:40},(_,i)=>rifleman(i%2?'enemy':'ally',`b${i}`,8+i*8,{z:(i%5)*3}));
  for(const quality of ['high','medium','low']){
    const on=characters(true),off=characters(false);
    try{
      on.update(mk(),20,player,quality);off.update(mk(),20,player,quality);
      const n=on.instances.size;assert.equal(n,off.instances.size);assert.ok(n>=10,`${quality}: ${n} instances`);
      assert.deepEqual(on.stats.lodBands,off.stats.lodBands,`${quality}: LOD bands are not affected`);
      let calls=0;for(const v of on.instances.values()){const d=drawn(v.root);assert.ok(d.length<=2,`${quality} ${v.id}: ${d.length}`);calls+=d.length;}
      assert.ok(calls<=2*n);
      assert.ok(calls<=drawn(off.scene).length/2,`${quality}: ${calls} draws vs ${drawn(off.scene).length} per-part`);
      assert.equal(triangles(drawn(on.scene)),triangles(drawn(off.scene)),`${quality}: same triangles`);
    }finally{on.dispose();off.dispose();}
  }
});

test('visual equivalence: skinned vertices (position, colour, uv), triangles, bone matrices and materials equal the unmerged path on sampled frames',()=>{
  const actors=[rifleman('ally','near_pl',20),rifleman('enemy','near_de',-30),rifleman('ally','mid_pl',60,{state:'ADVANCE',motion:{speed:1.4,gait:'walk',odometer:3}}),
    rifleman('enemy','far_de',150,{state:'ADVANCE',motion:{speed:1.4,gait:'walk',odometer:1}}),rifleman('ally','far_pl',230),
    named('marek_zielinski',12),named('pawel_krawiec',14),named('jozef_bak',16),named('szymon_kowal',18),named('tadeusz_nowicki',24)];
  const on=characters(true),off=characters(false);let compared=0;
  try{
    for(const f of [0,1,7,30,59]){
      const t=20+f*(1/60),list=()=>actors.map((a,i)=>({...a,z:(i%3)*2,motion:a.motion?{...a.motion,odometer:a.motion.odometer+t*1.4}:a.motion}));
      on.update(list(),t,player,'high');off.update(list(),t,player,'high');
      assert.deepEqual([...on.instances.keys()].sort(),[...off.instances.keys()].sort());
      for(const [id,v] of on.instances){
        const w=off.instances.get(id),a=drawn(v.root),b=drawn(w.root);
        // the very same pose: one Skeleton per soldier, equal bone transforms and bone matrices
        assert.equal(new Set(a.map(m=>m.skeleton)).size,1,`${id}: batches share one Skeleton`);
        v.root.updateMatrixWorld(true);w.root.updateMatrixWorld(true);a[0].skeleton.update();b[0].skeleton.update();
        assert.deepEqual([...a[0].skeleton.boneMatrices],[...b[0].skeleton.boneMatrices],`${id} frame ${f}: bone matrices`);
        assert.deepEqual(v.root.matrixWorld.elements,w.root.matrixWorld.elements,`${id}: root transform`);
        // the same things on screen
        assert.deepEqual(triangleSet(a),triangleSet(b),`${id} frame ${f}: drawn triangles with skinned positions, colours and uvs`);
        assert.deepEqual(a.map(m=>m.castShadow).sort(),a.map(()=>b[0].castShadow).sort(),`${id}: shadow flag`);
        assert.deepEqual([...new Set(materialKeys(a).map(k=>k.split('|').slice(1).join('|')))].sort(),[...new Set(materialKeys(b).map(k=>k.split('|').slice(1).join('|')))].sort(),`${id}: same shading (vertexColors, program key)`);
        assert.ok(a.every(m=>m.receiveShadow&&m.frustumCulled===false));
        // diagnostics and logical state are the former ones
        assert.deepEqual(v.meshes.map(m=>[m.name,m.visible]),w.meshes.map(m=>[m.name,m.visible]),`${id}: logical part visibility`);
        compared++;
      }
      assert.deepEqual(on.stats.actors.map(e=>({...e})),off.stats.actors.map(e=>({...e})),'diagnostics entries are identical');
    }
    assert.ok(compared>=45,`compared ${compared} soldier frames`);
  }finally{on.dispose();off.dispose();}
});

test('armed toggling: the weapon batch follows the former per-part visibility (alive, wounded, carried, civilian, medic, kowal bipods/rag)',()=>{
  const cases=[rifleman('ally','alive',15),rifleman('ally','dead',16,{alive:false,state:'DEAD'}),rifleman('ally','wounded',17,{state:'WOUNDED'}),
    {...rifleman('ally','medic',18),role:'MEDIC'},named('szymon_kowal',19),named('jozef_bak',20),named('jozef_bak',21,{alive:false,state:'DEAD'})];
  cases[6].id='bak_dead';
  const on=characters(true),off=characters(false);
  try{
    for(const t of [20,21.5,23]){
      on.update(cases.map(a=>({...a})),t,player,'high');off.update(cases.map(a=>({...a})),t,player,'high');
      for(const a of cases){
        const v=on.instances.get(a.id),w=off.instances.get(a.id);if(!w)continue;
        assert.ok(v,a.id);
        assert.deepEqual(triangleSet(drawn(v.root)),triangleSet(drawn(w.root)),`${a.id} @${t}`);
        assert.deepEqual(drawn(v.root).length<=(a.id==='szymon_kowal'?4:2),true,`${a.id}: ${drawn(v.root).map(m=>m.name)}`);
      }
    }
    const dead=on.instances.get('dead');assert.deepEqual(drawn(dead.root).map(m=>m.name),['batch_body'],'no weapon batch for the dead');
    assert.deepEqual(drawn(on.instances.get('alive').root).map(m=>m.name),['batch_body','batch_weapon']);
  }finally{on.dispose();off.dispose();}
});

test('LOD switching, hysteresis and shadows are untouched: same bands, switches and instance keys while the camera moves; shadow flag by distance and tier',()=>{
  const on=characters(true),off=characters(false);
  try{
    for(const quality of ['high','medium','low']){
      for(let f=0;f<80;f++){
        const t=20+f/30,p={x:0,z:-(8+f*3.7)},list=[rifleman('ally','a',0,{z:30}),rifleman('enemy','b',20),rifleman('enemy','c',-40,{z:25})];
        on.update(list.map(a=>({...a})),t,p,quality);off.update(list.map(a=>({...a})),t,p,quality);
        assert.deepEqual(on.stats.lodBands,off.stats.lodBands,`${quality} frame ${f}`);assert.equal(on.lodSwitches,off.lodSwitches);
        assert.deepEqual([...on.instances].map(([id,v])=>[id,v.key]),[...off.instances].map(([id,v])=>[id,v.key]));
        for(const [id,v] of on.instances){
          const dist=Math.hypot(v.root.position.x-p.x,v.root.position.z-p.z);
          for(const m of drawn(v.root))assert.equal(m.castShadow,quality!=='low'&&dist<35,`${quality} ${id} @${dist.toFixed(1)} m`);
        }
      }
    }
    assert.ok(on.lodSwitches>0,'the walk crosses LOD bands');
  }finally{on.dispose();off.dispose();}
});

test('merged geometry: built once per distinct part list, shared by soldiers and LOD swaps, bit-identical attributes, disposed exactly once',()=>{
  const c=characters(true),disposed=[];
  try{
    const mk=x=>[rifleman('ally','a',x),rifleman('ally','b',x+1),rifleman('enemy','c',x+2)];
    c.update(mk(10),20,player,'high');
    const cache=c.mergeCache,builds=cache.builds,geometries=[...cache.geometries.values()];
    assert.ok(builds>=2,'at least one body and one weapon batch per nation');
    for(const g of geometries)g.addEventListener('dispose',()=>disposed.push(g));
    for(let i=0;i<30;i++){c.update(mk(i%2?10:170),20+i/60,player,'high');c.update([],20+i/60,player,'high');}   // LOD swaps and instance churn
    c.update(mk(10),22,player,'high');
    const extra=cache.builds-builds;
    assert.ok(extra<=8,`churn only adds the LOD1/LOD2 variants of the body and weapon batches (${extra} new)`);
    assert.equal(cache.geometries.size,cache.builds,'one cached geometry per build');
    // attributes of a merged batch are the concatenation of the parts' attributes (raw values)
    const v=c.instances.get('a'),batch=v.batches.find(b=>b.mesh.name==='batch_body'),g=batch.mesh.geometry;
    let vertices=0,indices=0;for(const p of batch.parts){vertices+=p.geometry.getAttribute('position').count;indices+=p.geometry.index.count;}
    assert.equal(g.getAttribute('position').count,vertices);assert.equal(g.index.count,indices);
    assert.equal(g.getAttribute('skinIndex').array.constructor.name,'Uint8Array');
    assert.ok(g.getAttribute('color'),'the varied body keeps its vertex colours');
    assert.ok(g.index.array.every((n,i)=>n<vertices),'indices stay in range');
    c.dispose();
    assert.equal(cache.geometries.size,0);assert.ok(disposed.length>=geometries.length,'every merged geometry present before was disposed');
    assert.equal(new Set(disposed).size,disposed.length,'no geometry disposed twice');
    c.dispose();
  }finally{c.dispose();}
});

test('mergeSoldierGeometries: interleaved glTF attributes are copied raw; a part without colours gets white when another has them; 32-bit indices past 65535',()=>{
  const part=(n,colour,interleaved)=>{
    const g=new THREE.BufferGeometry(),stride=interleaved?4:3,buf=new Float32Array(n*stride);
    for(let i=0;i<n;i++){buf[i*stride]=i;buf[i*stride+1]=i*2;buf[i*stride+2]=i*3;}
    if(interleaved){const ib=new THREE.InterleavedBuffer(buf,4);g.setAttribute('position',new THREE.InterleavedBufferAttribute(ib,3,0));}else g.setAttribute('position',new THREE.BufferAttribute(buf,3));
    g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(n*3).fill(.5),3));g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n*2).fill(.25),2));
    g.setAttribute('skinIndex',new THREE.BufferAttribute(new Uint8Array(n*4).fill(3),4));g.setAttribute('skinWeight',new THREE.BufferAttribute(new Float32Array(n*4).fill(.25),4));
    if(colour)g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(n*3).fill(.7),3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array([0,1,2]),1));return g;
  };
  const m=mergeSoldierGeometries([part(4,true,true),part(3,false,false),part(5,true,false)]);
  assert.equal(m.getAttribute('position').count,12);
  assert.deepEqual([...m.getAttribute('position').array.slice(0,9)],[0,0,0,1,2,3,2,4,6]);
  assert.deepEqual([...m.getAttribute('position').array.slice(12*3-3)],[4,8,12]);
  assert.deepEqual([...m.getAttribute('color').array.slice(4*3,4*3+3)],[1,1,1],'white for the part without colours');
  assert.ok(Math.abs(m.getAttribute('color').array[0]-.7)<1e-6);
  assert.deepEqual([...m.index.array],[0,1,2,4,5,6,7,8,9]);
  const big=mergeSoldierGeometries([part(40000,false,false),part(40000,false,false)]);
  assert.equal(big.index.array.constructor.name,'Uint32Array');assert.equal(big.index.getX(3),40000);
});

test('release/dispose: removing an instance frees nothing shared; Skeleton disposed once; no instance leaves objects in the scene',()=>{
  const scene=new THREE.Scene(),c=characters(true,scene);
  try{
    c.update([rifleman('ally','a',10),rifleman('enemy','b',20)],20,player,'high');
    const v=c.instances.get('a'),geom=v.batches.map(b=>b.mesh.geometry),log=[];
    for(const g of geom)g.addEventListener('dispose',()=>log.push('geometry'));
    const sk=v.batches[0].mesh.skeleton,real=sk.dispose.bind(sk);sk.dispose=()=>{log.push('skeleton');real();};
    c.update([rifleman('enemy','b',20)],20.1,player,'high');   // 'a' leaves
    assert.deepEqual(log,['skeleton'],'the cached merged geometry belongs to the cache, the Skeleton to the instance');
    assert.equal(c.instances.has('a'),false);assert.equal(scene.children.length,1,'only the live soldier remains in the scene');
    c.dispose();
    assert.equal(scene.children.length,0,'dispose empties the scene');assert.ok(log.filter(x=>x==='geometry').length>=geom.length);
  }finally{c.dispose();}
});

test('source guard: batching is a create()-time step; update() only toggles the flags of existing batches',()=>{
  const src=readFileSync(new URL('../src/render/m01-characters.js',import.meta.url),'utf8');
  const update=src.slice(src.indexOf('  update(actors,time,player,quality'),src.indexOf('  diagnosticsViews('));
  assert.ok(!/batchSoldier|mergeSoldierGeometries|batchParts|new THREE\./.test(update),'no merge and no THREE allocation inside update()');
  const draw=src.slice(src.indexOf('  drawCallsOf('),src.indexOf('  // Station-yard props'));
  assert.ok(!/new |\.map\(|\.filter\(|\.forEach\(/.test(draw),'drawCallsOf allocates nothing');
  assert.ok(new SoldierMergeCache().diagnostics.geometries===0);
});
