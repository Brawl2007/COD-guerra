import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Characters} from '../../src/render/m01-characters.js';

const base=new URL('../../assets/models/provisional/m01/characters/',import.meta.url);
export function readCharacterGLB(name){
  const bytes=readFileSync(new URL(name,base)),length=bytes.readUInt32LE(12);
  return {json:JSON.parse(bytes.subarray(20,20+length)),binary:bytes.subarray(28+length),bytes:bytes.length};
}
// Official loader, real geometry/skin/clips. Node has no image decoder: only texture bindings are removed.
export async function loadCharacterGLB(name){
  const {json,binary}=readCharacterGLB(name);
  json.buffers[0].uri='data:application/octet-stream;base64,'+binary.toString('base64');
  for(const material of json.materials??[]){
    for(const key of ['normalTexture','occlusionTexture','emissiveTexture'])delete material[key];
    if(material.pbrMetallicRoughness)for(const key of ['baseColorTexture','metallicRoughnessTexture'])delete material.pbrMetallicRoughness[key];
  }
  globalThis.ProgressEvent??=class{constructor(type,init){Object.assign(this,{type},init);}};
  return new GLTFLoader().parseAsync(JSON.stringify(json),'');
}
export async function viewModelFixture(lod=0){
  const characters=new M01Characters(new THREE.Scene());
  const [source,animations]=await Promise.all([loadCharacterGLB(`m01_soldier_pl_lod${lod}.glb`),loadCharacterGLB('m01_soldier_animations.glb')]);
  characters.sources.set(`pl:${lod}`,source);
  for(const clip of animations.animations)characters.clips.set(clip.name,clip);
  return characters;
}
export function geometryReport(view,near=.03){
  const meshes={},v=new THREE.Vector3();
  view.root.updateMatrixWorld(true);
  view.root.traverseVisible(mesh=>{
    if(!mesh.isMesh||!mesh.geometry.getAttribute('position'))return;
    let maxZ=-Infinity,violations=0,vertices=0;
    const positions=mesh.geometry.getAttribute('position');
    for(const i of new Set(mesh.geometry.index?.array??Array.from({length:positions.count},(_,i)=>i))){
      v.fromBufferAttribute(positions,i);if(mesh.isSkinnedMesh)mesh.applyBoneTransform(i,v);
      v.applyMatrix4(mesh.matrixWorld);maxZ=Math.max(maxZ,v.z);violations+=Number(v.z>=-near);vertices++;
    }
    meshes[mesh.name||'singleRound']={vertices,maxZ,nearViolations:violations,triangles:(mesh.geometry.index?.count??positions.count)/3};
  });
  return meshes;
}
