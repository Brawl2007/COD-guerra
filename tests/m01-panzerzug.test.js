import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Panzerzug,panzerzugLOD} from '../src/render/m01-panzerzug.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
const integratedPresentation=new Set([
 'src/core/audio.js','src/game/game.js','src/main.js','src/styles.css',
 'src/render/m01-atmosphere.js','src/render/m01-characters.js','src/render/m01-environment.js','src/render/m01-surfaces.js',
 'src/render/m01-train-wagons.js','src/render/m01-view.js','src/render/m01-viewmodel.js','src/render/three-renderer.js'
]);
const base='5f3cc34f53c61beec52255d67f8babd7194c9f7f',dir=new URL('../assets/models/production/m01/panzerzug/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const data=lod=>{const b=readFileSync(new URL(manifest.files[lod].file,dir)),n=b.readUInt32LE(12);return {b,j:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)};};
async function asset(lod){const {j,bin}=data(lod);delete j.images;delete j.textures;delete j.samplers;for(const m of j.materials)delete m.pbrMetallicRoughness.baseColorTexture;j.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');globalThis.ProgressEvent??=class{constructor(type,properties){Object.assign(this,properties);}};return new GLTFLoader().parseAsync(JSON.stringify(j),'');}
function fixture(load){const parent=new THREE.Group(),box=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(1,1,1,12),dark=new THREE.MeshStandardMaterial(),metal=new THREE.MeshStandardMaterial();const l=new M01Panzerzug(parent,{load},box,cylinder,metal);return {l,parent,close(){l.dispose();box.dispose();cylinder.dispose();dark.dispose();metal.dispose();}};}
test('real GLBs: bounded decreasing LOD budgets, finite valid attributes, original licence and five distinct conservative profiles',()=>{
 assert.equal(manifest.license,'CC0-1.0');assert.match(manifest.historicalIdentity,/P6/);let previous=18001;
 for(const f of manifest.files){const {b,j,bin}=data(f.lod);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert.ok(f.triangles<previous);previous=f.triangles;assert.equal(j.meshes.length,3);assert.equal(j.images.length,1);
  for(const feature of ['hull_0','hull_1','hull_2','hull_3','hull_4','traction_chimney','wheels','coupling','buffer'])assert.ok(f.features[feature]>0,feature);
  for(const a of j.accessors){const v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3}[a.type],start=(v.byteOffset??0)+(a.byteOffset??0);assert.ok(start+v.byteLength<=bin.length);
   if(a.componentType===5126)for(let i=0;i<a.count*n;i++)assert.ok(Number.isFinite(bin.readFloatLE(start+i*4)));
  }assert.ok(f.bounds.max[2]-f.bounds.min[2]<94);assert.ok(f.bounds.max[1]<4.6);assert.ok(f.bounds.min[1]>-.01);
 }
});
test('loaded actual assets retain anchor and orientation; one visible LOD and three draw meshes',async()=>{
 const sources=await Promise.all([0,1,2].map(asset)),f=fixture(async key=>sources[Number(key.split(':')[1])]);try{await f.l.load();assert.deepEqual(f.l.diagnostics.loaded,[0,1,2]);assert.deepEqual(f.l.root.position.toArray(),[1119,0,2.5]);assert.equal(f.l.root.rotation.y,Math.PI/2);
  for(const [distance,lod]of [[20,0],[100,1],[250,2]]){f.l.update({x:1119,z:2.5+distance});assert.equal(f.l.selectedLOD,lod);assert.equal([...f.l.models.values()].filter(n=>n.visible).length,1);assert.equal(f.l.proxy.visible,false);let meshes=0;f.l.models.get(lod).traverse(n=>{if(n.isMesh)meshes++;});assert.equal(meshes,3);assert.equal(f.l.models.get(lod).position.y,-.82);}
 }finally{f.close();}
});
test('LOD hysteresis avoids boundary flicker and ignores quality, clock and camera semantics',()=>{assert.equal(panzerzugLOD(61,0),0);assert.equal(panzerzugLOD(55,1),1);assert.equal(panzerzugLOD(53,1),0);assert.equal(panzerzugLOD(190,1),1);assert.equal(panzerzugLOD(170,2),2);assert.equal(panzerzugLOD(160,2),1);});
test('partial asset failure uses a surviving LOD; total failure retains exact old proxy extents',async()=>{
 const source=await asset(2),f=fixture(async key=>{if(key!=='panzerzug:2')throw Error('missing');return source;});try{await f.l.load();f.l.update({x:1119,z:2.5});assert.equal(f.l.selectedLOD,2);assert.equal(f.l.proxy.visible,false);}finally{f.close();}
 const missing=fixture(async()=>{throw Error('offline');});try{await missing.l.load();assert.equal(missing.l.proxy.visible,true);missing.parent.updateMatrixWorld(true);const body=missing.l.proxy.children[0],bounds=new THREE.Box3().setFromObject(body);assert.ok(Math.abs(bounds.min.x-1110.5)<1e-9);assert.ok(Math.abs(bounds.max.x-1127.5)<1e-9);assert.equal(missing.l.proxy.children.length,7);}finally{missing.close();}
});
test('late optional downloads cannot attach after disposal; asset cache owns shared buffers',async()=>{
 const resolvers=[],f=fixture(()=>new Promise(resolve=>resolvers.push(resolve)));const pending=f.l.load();f.l.dispose();resolvers.forEach(resolve=>resolve({scene:new THREE.Group()}));await pending;assert.equal(f.l.root.parent,null);assert.equal(f.l.models.size,0);f.close();
 const source=await asset(2),g=fixture(async()=>source);await g.l.load();let disposed=0;source.scene.traverse(n=>n.geometry?.addEventListener('dispose',()=>disposed++));g.close();assert.equal(disposed,0);
});
test('integration preserves gameplay, RNG, hitboxes/muzzle modules, missions and non-presentation base assets byte-identical',()=>{
 const paths=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n').filter(p=>p.startsWith('src/')||p.startsWith('missions/')||p.startsWith('assets/'));
 for(const p of paths){if(integratedPresentation.has(p))continue;assert.deepEqual(readFileSync(new URL('../'+p,import.meta.url)),execFileSync('git',['show',base+':'+p],{maxBuffer:32*1024*1024}),p);}
});
test('pause/restore and repeated rendering never mutate a save or introduce train movement authority',async()=>{
 const sim=new M01Simulation(),saved=sim.snapshot(),source=await asset(2),f=fixture(async()=>source);try{await f.l.load();for(let i=0;i<20;i++){f.l.update(sim.player);assert.deepEqual(sim.snapshot(),saved);}const other=new M01Simulation();other.restoreSnapshot(saved);f.l.update(other.player);assert.deepEqual(other.snapshot(),saved);assert.deepEqual(f.l.root.position.toArray(),[1119,0,2.5]);}finally{f.close();}
});
