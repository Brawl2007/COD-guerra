// T40: readonly derivation of the project's accepted original soldier kit.
// Retain exact bind frames and articulated fingers; close every geometric cut boundary.
import * as THREE from 'three';
import {NodeIO} from '@gltf-transform/core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../../../',import.meta.url),dir=new URL('assets/models/provisional/m01/characters/fp-arms-v2/',root);
const source=new URL('assets/models/provisional/m01/characters/m01_soldier_pl_lod0.glb',root),io=new NodeIO(),doc=await io.read(source.pathname);
const r=doc.getRoot(),body=r.listMeshes().find(m=>m.getName()==='body'),p=body.listPrimitives()[0],skin=r.listSkins()[0];
const names=skin.listJoints().map(n=>n.getName()),arm=new Set(names.map((n,i)=>/^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/.test(n)?i:-1));
const a={};for(const key of p.listSemantics())a[key]=p.getAttribute(key);
const pos=a.POSITION.getArray(),j=a.JOINTS_0.getArray(),w=Float32Array.from(a.WEIGHTS_0.getArray()),idx=p.getIndices().getArray();
const good=i=>[0,1,2,3].reduce((n,k)=>n+(arm.has(j[i*4+k])?w[i*4+k]:0),0)>=.55;
const handBones=new Set(names.map((n,i)=>/^(hand|thumb|index|middle|ring|pinky)_/.test(n)?i:-1));
const isHand=i=>[0,1,2,3].reduce((n,k)=>n+(handBones.has(j[i*4+k])?w[i*4+k]:0),0)>=.35;
const selected=[];for(let i=0;i<idx.length;i+=3){const tri=[idx[i],idx[i+1],idx[i+2]];if(tri.every(good)&&!tri.some(isHand))selected.push(...tri);}
for(const i of new Set(selected)){let sum=0;for(let k=0;k<4;k++){if(!arm.has(j[i*4+k]))w[i*4+k]=0;sum+=w[i*4+k];}for(let k=0;k<4;k++)w[i*4+k]/=sum;}
const buffer=r.listBuffers()[0],access=(type,array)=>doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
p.setAttribute('WEIGHTS_0',access('VEC4',w));p.setIndices(access('SCALAR',Uint16Array.from(selected)));
// Weld only for boundary detection; keep original UV/normals/skin arrays unchanged.
const weld=new Map(),represent=new Map(),key=i=>Array.from(pos.subarray(i*3,i*3+3),n=>Math.round(n*1e6)).join(',');
for(const i of selected){const k=key(i);if(!weld.has(k))weld.set(k,weld.size);represent.set(weld.get(k),i);}
const edges=new Map();for(let t=0;t<selected.length;t+=3)for(let k=0;k<3;k++){const x=weld.get(key(selected[t+k])),y=weld.get(key(selected[t+(k+1)%3]));const e=x<y?`${x}:${y}`:`${y}:${x}`;const v=edges.get(e);if(v)v.count++;else edges.set(e,{x,y,count:1});}
const boundaries=[...edges.values()].filter(e=>e.count===1),next=new Map(boundaries.map(e=>[e.x,e.y])),loops=[];
while(next.size){let start=next.keys().next().value,at=start,loop=[];do{loop.push(represent.get(at));const n=next.get(at);next.delete(at);at=n;}while(at!==undefined&&at!==start&&loop.length<10000);if(at!==start)throw Error('Non-closed boundary');loops.push(loop);}
const caps={POSITION:[],NORMAL:[],TEXCOORD_0:[],JOINTS_0:[],WEIGHTS_0:[]},ci=[];
for(const loop of loops){const center=[0,0,0];for(const i of loop)for(let k=0;k<3;k++)center[k]+=pos[i*3+k]/loop.length;
 for(let t=0;t<loop.length;t++){const ids=[loop[(t+1)%loop.length],loop[t]],points=[center,...ids.map(i=>Array.from(pos.subarray(i*3,i*3+3)))],u=points[1].map((x,k)=>x-center[k]),v=points[2].map((x,k)=>x-center[k]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;n=n.map(x=>x/len);
 for(let k=0;k<3;k++){ci.push(ci.length);caps.POSITION.push(...points[k]);caps.NORMAL.push(...n);caps.TEXCOORD_0.push(0,0);const i=ids[k===2?1:0];caps.JOINTS_0.push(...j.subarray(i*4,i*4+4));caps.WEIGHTS_0.push(...w.subarray(i*4,i*4+4));}}
}
const cap=doc.createPrimitive().setMaterial(doc.createMaterial('FP closed sleeve lining').setBaseColorFactor([.19,.18,.12,1]).setRoughnessFactor(.96));
for(const [name,arr]of Object.entries(caps))cap.setAttribute(name,access(name==='TEXCOORD_0'?'VEC2':name==='JOINTS_0'||name==='WEIGHTS_0'?'VEC4':'VEC3',name==='JOINTS_0'?Uint16Array.from(arr):Float32Array.from(arr)));
cap.setIndices(access('SCALAR',Uint16Array.from(ci)));
const capMesh=doc.createMesh('fp_sleeve_caps').addPrimitive(cap);
const bodyNode=r.listNodes().find(n=>n.getMesh()===body);
bodyNode.getParentNode().addChild(doc.createNode('fp_sleeve_caps').setMesh(capMesh).setSkin(bodyNode.getSkin()));
// Original FP hands: compact rounded palms and individually articulated phalanges.
// They use the accepted joint bind positions and clips, not the coarse TP palm triangles.
const worldPosition=node=>{const v=new THREE.Vector3();for(let n=node;n;n=n.getParentNode())v.add(new THREE.Vector3(...n.getTranslation()));return v;};
const joint=name=>worldPosition(skin.listJoints().find(n=>n.getName()===name));
const handArrays={POSITION:[],NORMAL:[],JOINTS_0:[],WEIGHTS_0:[]},handIndices=[];
const appendHand=(geometry,bone)=>{
 const base=handArrays.POSITION.length/3,index=names.indexOf(bone);
 handArrays.POSITION.push(...geometry.getAttribute('position').array);handArrays.NORMAL.push(...geometry.getAttribute('normal').array);
 for(let i=0;i<geometry.getAttribute('position').count;i++){handArrays.JOINTS_0.push(index,0,0,0);handArrays.WEIGHTS_0.push(1,0,0,0);}
 handIndices.push(...Array.from(geometry.index.array,i=>i+base));geometry.dispose();
};
for(const side of ['l','r']){
 const wrist=joint(`hand_${side}`),knuckles=['index','middle','ring','pinky'].map(f=>joint(`${f}_01_${side}`)),mean=knuckles.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(.25);
 const along=mean.clone().sub(wrist).normalize(),across=knuckles[3].clone().sub(knuckles[0]).normalize(),normal=across.clone().cross(along).normalize();across.copy(along).cross(normal).normalize();
 const length=mean.distanceTo(wrist),width=knuckles[0].distanceTo(knuckles[3])+.026,center=wrist.clone().lerp(mean,.5);
 const palm=new THREE.SphereGeometry(1,8,5);palm.scale(width*.52,length*.58,.018);palm.applyMatrix4(new THREE.Matrix4().makeBasis(across,along,normal));palm.translate(...center.toArray());appendHand(palm,`hand_${side}`);
 for(const finger of ['thumb','index','middle','ring','pinky'])for(let segment=1;segment<=3;segment++){
  const bone=`${finger}_0${segment}_${side}`,a=joint(bone),previous=segment===1?wrist:joint(`${finger}_0${segment-1}_${side}`),b=segment<3?joint(`${finger}_0${segment+1}_${side}`):a.clone().add(a.clone().sub(previous).normalize().multiplyScalar(finger==='thumb'?.019:.017));
  const radius=(finger==='thumb'?.010:finger==='pinky'?.0068:.0082)*(1-(segment-1)*.09),distance=a.distanceTo(b),axis=b.clone().sub(a).normalize(),center=a.clone().lerp(b,.5);
  const phalanx=new THREE.CapsuleGeometry(radius,Math.max(.002,distance-radius*1.5),1,5);phalanx.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis));phalanx.translate(...center.toArray());appendHand(phalanx,bone);
 }
}
const hands=doc.createPrimitive().setMaterial(doc.createMaterial('FP skin').setBaseColorFactor([.60,.39,.27,1]).setRoughnessFactor(.88));
for(const [name,arr]of Object.entries(handArrays))hands.setAttribute(name,access(name==='JOINTS_0'||name==='WEIGHTS_0'?'VEC4':'VEC3',name==='JOINTS_0'?Uint16Array.from(arr):Float32Array.from(arr)));
hands.setIndices(access('SCALAR',Uint16Array.from(handIndices)));
bodyNode.getParentNode().addChild(doc.createNode('fp_hands').setMesh(doc.createMesh('fp_hands').addPrimitive(hands)).setSkin(bodyNode.getSkin()));
// Original tailored wrist bands and leather retaining tabs, bound to the accepted forearm bones.
const detailStats={};
for(const [label,color]of [['fp_cuffs',[.32,.30,.19,1]],['fp_straps',[.18,.105,.05,1]]]){
 const arrays={POSITION:[],NORMAL:[],TEXCOORD_0:[],JOINTS_0:[],WEIGHTS_0:[]},indices=[];
 for(const side of ['l','r']){
  const wrist=worldPosition(skin.listJoints().find(n=>n.getName()===`hand_${side}`)),elbow=worldPosition(skin.listJoints().find(n=>n.getName()===`lowerarm_${side}`)),axis=wrist.clone().sub(elbow).normalize();
  const geometry=label==='fp_cuffs'?new THREE.CylinderGeometry(.043,.046,.032,12,1,false):new THREE.BoxGeometry(.018,.044,.008);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis),center=wrist.clone().addScaledVector(axis,-.018);
  if(label==='fp_straps')center.z+=.044;
  geometry.applyQuaternion(q);geometry.translate(...center.toArray());
  const base=arrays.POSITION.length/3,bone=names.indexOf(`lowerarm_${side}`);
  for(const [semantic,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']])arrays[semantic].push(...geometry.getAttribute(name).array);
  for(let i=0;i<geometry.getAttribute('position').count;i++){arrays.JOINTS_0.push(bone,0,0,0);arrays.WEIGHTS_0.push(1,0,0,0);}
  indices.push(...Array.from(geometry.index.array,i=>i+base));geometry.dispose();
 }
 const primitive=doc.createPrimitive().setMaterial(doc.createMaterial(label).setBaseColorFactor(color).setRoughnessFactor(.9));
 for(const [name,arr]of Object.entries(arrays))primitive.setAttribute(name,access(name==='TEXCOORD_0'?'VEC2':name==='JOINTS_0'||name==='WEIGHTS_0'?'VEC4':'VEC3',name==='JOINTS_0'?Uint16Array.from(arr):Float32Array.from(arr)));
 primitive.setIndices(access('SCALAR',Uint16Array.from(indices)));
 bodyNode.getParentNode().addChild(doc.createNode(label).setMesh(doc.createMesh(label).addPrimitive(primitive)).setSkin(bodyNode.getSkin()));detailStats[label]=indices.length/3;
}
// Keep only view meshes, preserving complete named rig/socket bindings for all accepted clips.
for(const node of r.listNodes())if(node.getMesh()&&!['body','rifle','clip','fp_sleeve_caps','fp_cuffs','fp_straps','fp_hands'].includes(node.getMesh().getName()))node.dispose();
for(const mesh of r.listMeshes())if(!['body','rifle','clip','fp_sleeve_caps','fp_cuffs','fp_straps','fp_hands'].includes(mesh.getName()))mesh.dispose();
await mkdir(dir,{recursive:true});await io.write(new URL('m01_fp_arms_v2.glb',dir).pathname,doc);
const manifest={task:'T40',license:'Original project derivative; MakeHuman base CC0-1.0; predecessor project art licence pending owner decision; see ASSET_CREDITS.md',source:'../m01_soldier_pl_lod0.glb',sourceSha256:createHash('sha256').update(await readFile(source)).digest('hex'),generator:'tools/assets/m01-soldiers/build-fp-arms.mjs',closedBoundaryLoops:loops.map(l=>l.length),details:{...detailStats,fp_hands:handIndices.length/3},armTriangles:selected.length/3+ci.length/3+handIndices.length/3+Object.values(detailStats).reduce((a,b)=>a+b,0),rifleTriangles:r.listMeshes().find(m=>m.getName()==='rifle').listPrimitives()[0].getIndices().getCount()/3,clipTriangles:r.listMeshes().find(m=>m.getName()==='clip').listPrimitives()[0].getIndices().getCount()/3};
await writeFile(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');console.log(manifest);
// Private carry variant: keep the existing detailed face/body/helmet, replace only its webbing
// with the accepted compact geometry, remapping full bone names without touching either source.
const patient=await io.read(new URL('assets/models/provisional/m01/characters/m01_soldier_pl_lod1.glb',root).pathname),compact=await io.read(new URL('assets/models/provisional/m01/characters/m01_soldier_pl_lod2.glb',root).pathname),pr=patient.getRoot();
const gear=pr.listMeshes().find(m=>m.getName()==='gear').listPrimitives()[0],small=compact.getRoot().listMeshes().find(m=>m.getName()==='gear').listPrimitives()[0],from=compact.getRoot().listSkins()[0].listJoints().map(n=>n.getName()),to=pr.listSkins()[0].listJoints().map(n=>n.getName());
for(const semantic of small.listSemantics()){
 const src=small.getAttribute(semantic),arr=src.getArray().slice();
 if(semantic==='JOINTS_0')for(let i=0;i<arr.length;i++)arr[i]=to.indexOf(from[arr[i]]);
 gear.setAttribute(semantic,patient.createAccessor().setType(src.getType()).setArray(arr).setBuffer(pr.listBuffers()[0]));
}
gear.setIndices(patient.createAccessor().setType('SCALAR').setArray(small.getIndices().getArray().slice()).setBuffer(pr.listBuffers()[0]));
for(const node of pr.listNodes())if(node.getMesh()&&!['body','head_bak','helmet_wz31','gear'].includes(node.getMesh().getName()))node.dispose();
for(const mesh of pr.listMeshes())if(!['body','head_bak','helmet_wz31','gear'].includes(mesh.getName()))mesh.dispose();
await io.write(new URL('m01_fp_patient_v2.glb',dir).pathname,patient);
manifest.patientTriangles=pr.listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((v,p)=>v+p.getIndices().getCount()/3,0),0);
manifest.patientSources=Object.fromEntries(await Promise.all([1,2].map(async lod=>{const file=`m01_soldier_pl_lod${lod}.glb`;return [file,createHash('sha256').update(await readFile(new URL('assets/models/provisional/m01/characters/'+file,root))).digest('hex')];})));
manifest.maximumCarryMeshTriangles=manifest.armTriangles+manifest.patientTriangles;
if(manifest.maximumCarryMeshTriangles>6000)throw Error('FP carry budget exceeded');
await writeFile(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');console.log({patientTriangles:manifest.patientTriangles,total:manifest.maximumCarryMeshTriangles});
