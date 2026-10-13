import fs from 'node:fs';
import * as THREE from 'three';
// Read the authored binary accessors and material values. No browser/GPU claims: PNG residency is tested in Playwright.
export function readVegetationNodeAsset(root=process.cwd()) {
  const raw=fs.readFileSync(`${root}/assets/models/provisional/m01/vegetation/vegetation-kit.glb`),jl=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+jl)),bin=raw.subarray(28+jl),scene=new THREE.Group();
  const atlas=new THREE.DataTexture(new Uint8Array(512*512*4),512,512);
  const materials=json.materials.map(m=>new THREE.MeshStandardMaterial({color:new THREE.Color(...m.pbrMetallicRoughness.baseColorFactor.slice(0,3)),roughness:m.pbrMetallicRoughness.roughnessFactor,...(m.alphaMode?{map:atlas,alphaTest:m.alphaCutoff,side:THREE.DoubleSide}:{})}));
  const read=i=>{const a=json.accessors[i],v=json.bufferViews[a.bufferView],size={VEC3:3,VEC2:2,SCALAR:1}[a.type],n=a.count*size,start=(v.byteOffset??0)+(a.byteOffset??0),arr=a.componentType===5126?new Float32Array(n):new Uint16Array(n);for(let j=0;j<n;j++)arr[j]=a.componentType===5126?bin.readFloatLE(start+j*4):bin.readUInt16LE(start+j*2);return {arr,size};};
  for(const m of json.meshes){const model=new THREE.Group();model.name=m.name;scene.add(model);for(const p of m.primitives){const geometry=new THREE.BufferGeometry();for(const [key,id]of Object.entries(p.attributes)){const {arr,size}=read(id);geometry.setAttribute({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',_WIND:'_wind'}[key],new THREE.BufferAttribute(arr,size));}geometry.setIndex(new THREE.BufferAttribute(read(p.indices).arr,1));model.add(new THREE.Mesh(geometry,materials[p.material]));}}
  return {scene};
}
