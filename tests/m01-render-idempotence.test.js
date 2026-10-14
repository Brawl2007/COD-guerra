import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Characters} from '../src/render/m01-characters.js';
import {M01Simulation} from '../src/game/m01-simulation.js';

const load=async path=>{
 const b=readFileSync(new URL('../assets/models/provisional/m01/'+path,import.meta.url));
 const loader=new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
 return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
};
const [rig,gun,soldier]=await Promise.all([
 load('weapons/ckm_wz30/m01_ckm_wz30_animations.glb'),
 load('weapons/ckm_wz30/m01_ckm_wz30_lod2.glb'),
 load('characters/m01_soldier_animations.glb')
]);
function fixture(){
 const c=new M01Characters(new THREE.Scene());
 c.sources.set('pl:2',rig);c.sources.set('ckm:2',gun);
 for(const g of [soldier,rig])for(const clip of g.animations)c.clips.set(clip.name,clip);
 return c;
}
function capture(c){
 c.scene.updateMatrixWorld(true);
 const output=[];
 for(const [id,v]of c.instances){
  v.root.traverse(n=>output.push({id,name:n.name,uuid:n.uuid,clip:v.clip,
    matrix:Array.from(n.matrixWorld.elements)}));
 }
 if(c.ckm)c.ckm.root.traverse(n=>output.push({id:'ckm-weapon',name:n.name,uuid:n.uuid,clip:c.ckm.clip,
    matrix:Array.from(n.matrixWorld.elements)}));
 return output;
}
test('same-frame re-render does not alter any actor bone or weapon matrix',()=>{
 const s=new M01Simulation();
 s.scene=null;s.clock=8;s.consumed.evt_m01_east_demolition=8;s.updateActors(.05);s.clock=9.25;
 const c=fixture(),p={x:18,z:43};
 try{
  c.update(s.actors,s.clock,p);
  const before=capture(c);
  c.update(s.actors,s.clock,p);
  const after=capture(c);
  const diff=[];
  for(let i=0;i<Math.min(before.length,after.length);i++){
   const x=before[i],y=after[i];
   const changes=x.matrix.map((v,j)=>Math.abs(v-y.matrix[j])).filter(d=>d>1e-10);
   if(changes.length)diff.push({id:x.id,name:x.name,clip:x.clip,
     first:changes[0],max:Math.max(...changes)});
  }
  assert.deepEqual(diff.slice(0,12),[],JSON.stringify({total:diff.length,first:diff.slice(0,15)}));
  assert.equal(before.length,after.length);
 }finally{c.dispose();}
});
