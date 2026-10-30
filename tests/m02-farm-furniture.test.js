import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {createM02FarmFurniture} from '../src/render/m02-farm-furniture.js';

test('farm furniture stays within the existing solid volumes without modifying simulation',()=>{
 const sim=new M02BenchSimulation(),before=sim.snapshot(),material=new THREE.MeshStandardMaterial();
 const materials=Object.fromEntries(['wood_thin','wood_frame','stone','gun_metal','roof_thatch','brick_B01'].map(k=>[k,material]));
 const expected={prop_b01_stove:3,prop_b01_table:5,prop_b01_bed_west:6,prop_b01_bed_east:6,prop_b02_mg_mount:5};
 for(const [id,count] of Object.entries(expected)){
  const ob=sim.world.obstacles.find(item=>item.id===id),group=createM02FarmFurniture(ob,materials);
  assert.equal(group.children.length,count);assert.ok(group.children.every(part=>part.userData.m02FarmFurniture));group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group);
  for(const axis of ['x','y','z']){
   assert.ok(bounds.min[axis]>=ob.min[axis]-1e-5,`${id} protrudes before ${axis}`);
   assert.ok(bounds.max[axis]<=ob.max[axis]+1e-5,`${id} protrudes after ${axis}`);
  }
  group.traverse(n=>n.geometry?.dispose());
 }
 assert.equal(createM02FarmFurniture({id:'unrelated'},materials),null);
 assert.deepEqual(sim.snapshot(),before);material.dispose();
});
