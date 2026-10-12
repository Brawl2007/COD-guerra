import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {generate,BUDGET,OUT} from '../tools/assets/m01-field-structures/build.mjs';
import {M01FieldStructures,fieldStructureLod} from '../src/render/m01-field-structures.js';
import {TczewWorld} from '../src/world/tczew-world.js';
const {files,manifest}=generate();
function data(file){const b=readFileSync(OUT+'/'+file),len=b.readUInt32LE(12);return {b,j:JSON.parse(b.subarray(20,20+len)),bin:b.subarray(28+len)};}
async function asset(file){globalThis.ProgressEvent??=class{constructor(type,props){Object.assign(this,props);}};const {b}=data(file);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
function fixture(load=asset){const parent=new THREE.Group(),kit=new M01FieldStructures(parent,{load}),world=new TczewWorld();return {kit,parent,world};}
test('15 original GLBs reproduce exactly, finite indexed geometry and licence/SHA/decreasing LOD budgets',()=>{
 for(const [name,bytes]of files)assert.ok(readFileSync(OUT+'/'+name).equals(bytes),name);
 assert.equal(manifest.structures.length,4);assert.equal(files.size,16);
 for(const d of manifest.structures)for(const variant of d.id==='forward_post'?['intact','destroyed']:['intact']){let previous=Infinity;for(let lod=0;lod<3;lod++){
  const f=d.files[`${variant}:lod${lod}`],{b,j,bin}=data(f.file);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert.equal(j.extras.license,'CC0-1.0');assert.ok(f.triangles<=BUDGET[lod]);assert.ok(f.triangles<previous,`${d.id} decreasing LOD`);previous=f.triangles;
  let triangles=0;for(const p of j.meshes[0].primitives){const pos=j.accessors[p.attributes.POSITION],ix=j.accessors[p.indices],v=j.bufferViews[ix.bufferView];triangles+=ix.count/3;for(let i=0;i<ix.count;i++)assert.ok(bin.readUInt16LE(v.byteOffset+i*2)<pos.count);}
  assert.equal(triangles,f.triangles);for(const a of j.accessors)if(a.componentType===5126){const v=j.bufferViews[a.bufferView];for(let i=0;i<v.byteLength;i+=4)assert.ok(Number.isFinite(bin.readFloatLE(v.byteOffset+i)));}
 }}
});
test('actual exported collision-surface vertices match every real hut/cover box within 5cm, including destroyed cover',()=>{
 for(const destroyed of [false,true]){const world=new TczewWorld();world.refresh([],{'m01.forward_post_state':destroyed?'destroyed':'intact'});
  for(const d of manifest.structures)for(let lod=0;lod<3;lod++){const variant=destroyed&&d.id==='forward_post'?'destroyed':'intact',f=d.files[`${variant}:lod${lod}`],{j,bin}=data(f.file);
   for(const s of f.collisionSurfaces){const real=[...world.buildings,...world.covers].find(b=>b.id===s.id);assert.ok(real,s.id);const p=j.meshes[0].primitives.find(p=>j.materials[p.material].name===s.material),a=j.accessors[p.attributes.POSITION],view=j.bufferViews[a.bufferView],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let v=s.vertexStart;v<s.vertexStart+s.vertexCount;v++)for(let k=0;k<3;k++){const value=bin.readFloatLE(view.byteOffset+(v*3+k)*4)+d.anchor[k];min[k]=Math.min(min[k],value);max[k]=Math.max(max[k],value);}
    for(const [k,axis]of ['x','y','z'].entries()){assert.ok(Math.abs(min[k]-real.min[axis])<.05,s.id+' min '+axis);assert.ok(Math.abs(max[k]-real.max[axis])<.05,s.id+' max '+axis);}
   }
  }
 }
 assert.deepEqual(manifest.structures[0].openings[0].worldZ,[18,24]);assert.deepEqual(manifest.structures[3].colliderIds,[]);
});
test('all resident structures show one LOD with no proxy duplication; world replacement and destroyed/restore follow authoritative cover',async()=>{
 const {kit,world}=fixture();await kit.load();try{kit.sync(world,'high',{x:18,z:3});assert.equal(kit.replaces('cv_forward_post'),true);assert.equal(kit.replaces('hut_west_n'),true);assert.equal(kit.replaces('station'),false);assert.equal(kit.records[2].lod,0);
  world.refresh([],{'m01.forward_post_state':'destroyed'});kit.sync(world,'high',{x:18,z:3});assert.equal(kit.records[2].variant,'destroyed');assert.equal(kit.records[2].height,.45);
  const restored=new TczewWorld();restored.revision=world.revision;kit.sync(restored,'high',{x:18,z:3});assert.equal(kit.records[2].variant,'intact');assert.equal(kit.records[2].height,1.1);
  for(const quality of ['low','high','low','medium']){kit.sync(restored,quality,{x:18,z:3});for(const r of kit.records)assert.equal(r.models.filter(m=>m.node.visible).length,1);}
  const rev=kit.revision;kit.sync(restored,'medium',{x:18,z:3});assert.equal(kit.revision,rev);kit.setEnabled(false);assert.equal(kit.replaces('hut_east'),false);assert.equal(kit.root.visible,false);kit.setEnabled(true);assert.equal(kit.replaces('hut_east'),true);
  restored.covers=restored.covers.filter(c=>c.id!=='cv_forward_post');restored.revision++;kit.sync(restored,'medium',{x:18,z:3});assert.equal(kit.records[2].root.visible,false);
 }finally{kit.dispose();}
});
test('optional partial failure disposes successful siblings and preserves proxies per structure; no repeated loads',async()=>{
 let downloads=0,disposed=0;const {kit,world}=fixture(async file=>{downloads++;if(file.includes('rail_shed')&&file.endsWith('lod1.glb'))throw Error('offline');const a=await asset(file);a.scene.traverse(n=>n.geometry?.addEventListener('dispose',()=>disposed++));return a;});
 await kit.load();assert.equal(downloads,15);assert.ok(disposed>0);kit.sync(world,'high',{x:-260,z:20});assert.equal(kit.replaces('hut_north'),false);assert.equal(kit.replaces('cv_shelter_entrance'),true);assert.equal(kit.records[0].models.length,0);const before=disposed;for(let i=0;i<100;i++)kit.sync(world,'high',{x:-260,z:20});await kit.load();assert.equal(downloads,15);assert.equal(disposed,before);kit.dispose();assert.equal(kit.root.parent,null);kit.dispose();
});
test('late assets cannot attach after dispose; every unique resource disposed exactly once',async()=>{
 const resolves=[],{kit,parent}=fixture(()=>new Promise(resolve=>resolves.push(resolve)));const pending=kit.load();kit.dispose();let disposed=0;for(const resolve of resolves){const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),scene=new THREE.Group();geometry.addEventListener('dispose',()=>disposed++);material.addEventListener('dispose',()=>disposed++);scene.add(new THREE.Mesh(geometry,material));resolve({scene});}await pending;assert.equal(disposed,30);assert.equal(parent.children.length,0);assert.ok(kit.records.every(r=>r.models.length===0));
});
test('LOD quality and hysteresis remain pure presentation',()=>{assert.equal(fieldStructureLod(0,'low'),1);assert.equal(fieldStructureLod(20,'high'),0);assert.equal(fieldStructureLod(300,'high'),2);assert.equal(fieldStructureLod(95,'high',0),0);assert.equal(fieldStructureLod(85,'high',1),1);});
test('dispose immediately drains a fulfilled in-flight sibling while another file remains pending',async()=>{
 const resolves=[],{kit}=fixture(()=>new Promise(resolve=>resolves.push(resolve)));const pending=kit.load();let disposed=0;
 const owned=()=>{const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),scene=new THREE.Group();geometry.addEventListener('dispose',()=>disposed++);material.addEventListener('dispose',()=>disposed++);scene.add(new THREE.Mesh(geometry,material));return {scene};};
 resolves[0](owned());await Promise.resolve();await Promise.resolve();assert.equal(kit.records[0].assets.length,1);kit.dispose();assert.equal(disposed,2,'fulfilled in-flight resource released without waiting for sibling');
 for(const resolve of resolves.slice(1))resolve(owned());await pending;assert.equal(disposed,30,'each late resource disposed once');assert.equal(kit.records[0].assets.length,0);
});
test('real west shed doorway has no geometry across the six metre opening, and casemate stays below road deck',async()=>{
 const d=manifest.structures[0];for(let lod=0;lod<3;lod++){const {scene}=await asset(d.files[`intact:lod${lod}`].file);scene.position.fromArray(d.anchor);scene.updateMatrixWorld(true);for(const z of [18.1,20,22,23.9]){const hits=new THREE.Raycaster(new THREE.Vector3(-271,-1,z),new THREE.Vector3(1,0,0),0,2).intersectObject(scene,true);assert.equal(hits.length,0,'open west doorway '+z);}scene.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});}
 for(const f of Object.values(manifest.structures[2].files))assert.ok(Math.abs(f.visualBounds.max[1]-(f.variant==='destroyed'?.45:1.1))<1e-6,'whole post visual height follows authoritative cover');
 const casemate=manifest.structures[3];for(const f of Object.values(casemate.files))assert.ok(f.visualBounds.max[1]+casemate.anchor[1]<0,'artistic roof stays beneath road deck');
});
test('a failed sibling immediately drains partial ownership even while another download hangs',async()=>{
 const tasks=[],{kit}=fixture(()=>new Promise((resolve,reject)=>tasks.push({resolve,reject})));const pending=kit.load();let disposed=0;
 const owned=()=>{const scene=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();geometry.addEventListener('dispose',()=>disposed++);material.addEventListener('dispose',()=>disposed++);scene.add(new THREE.Mesh(geometry,material));return {scene};};
 tasks[0].resolve(owned());await Promise.resolve();await Promise.resolve();tasks[1].reject(Error('missing sibling'));await Promise.resolve();await Promise.resolve();assert.equal(kit.records[0].failure,'missing sibling');assert.equal(kit.records[0].assets.length,0);assert.equal(disposed,2);assert.equal(kit.replaces('hut_north'),false);
 tasks[2].resolve(owned());for(const task of tasks.slice(3))task.reject(Error('offline'));await pending;assert.equal(disposed,4);kit.dispose();assert.equal(disposed,4);
});
