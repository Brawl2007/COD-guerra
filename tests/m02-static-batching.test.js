import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchM02Architecture} from '../src/render/m02-static-batching.js';
test('M01 material batching preserves world bounds, triangles and cutaway/interactive identities',()=>{
 const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial();
 for(let i=0;i<8;i++){
  const wall=new THREE.Mesh(new THREE.BoxGeometry(2,3,.3),mat);wall.position.set(i*3,1.5,2);wall.rotation.y=i*.1;
  wall.castShadow=true;wall.receiveShadow=true;wall.userData.m02Immutable=true;group.add(wall);
 }
 const door=new THREE.Group();door.name='interactive';group.add(door);
 const before=new THREE.Box3().setFromObject(group),result=batchM02Architecture(group),after=new THREE.Box3().setFromObject(group);
 assert.deepEqual(result,{before:8,after:1});assert.equal(group.getObjectByName('interactive'),door);
 assert.ok(before.min.distanceTo(after.min)<1e-5&&before.max.distanceTo(after.max)<1e-5);
 const mesh=group.children.find(n=>n.isMesh);
 assert.equal(mesh.geometry.attributes.position.count/3,8*12);assert.equal(mesh.material,mat);
 assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);
});
