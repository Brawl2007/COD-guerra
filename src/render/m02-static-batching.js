import * as THREE from 'three';
import {batchFarWagon} from './m01-train-batching.js';

// Reuse M01's exact-vertex material batching. Only immutable architecture is
// eligible: doors, roof cutaways, cargo and vegetation retain their identities.
export function batchM02Architecture(group,{all=false}={}){
 const buckets=new Map();
 for(const mesh of [...group.children]){
  if(!mesh.isMesh||(!all&&!mesh.userData.m02Immutable)||mesh.userData.vegetationFallback)continue;
  const key=`${mesh.castShadow}:${mesh.receiveShadow}`;
  if(!buckets.has(key))buckets.set(key,{scene:new THREE.Group(),castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow});
  buckets.get(key).scene.add(mesh);
 }
 let before=0,after=0;
 for(const bucket of buckets.values()){
  before+=bucket.scene.children.length;
  const batch=batchFarWagon(bucket);
  bucket.scene.traverse(n=>{if(n.isMesh)n.geometry.dispose();});
  for(const mesh of [...batch.scene.children]){
   mesh.castShadow=bucket.castShadow;mesh.receiveShadow=bucket.receiveShadow;
   mesh.userData.m02OwnedBatch=true;group.add(mesh);after++;
  }
 }
 return {before,after};
}
export function disposeM02ArchitectureBatches(group){
 for(const mesh of group.children)if(mesh.userData.m02OwnedBatch)mesh.geometry.dispose();
}
