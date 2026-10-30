import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02CargoVisuals,createM02FarmDressing} from '../src/render/m02-cargo-visuals.js';

test('the original M01 lantern and crate fit the B01 table without changing simulation',async()=>{
 const models=new Map(),loader=new GLTFLoader().register(()=>({name:'NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
 for(const id of ['railway_lantern','supply_crate_planked']){
  const b=await fs.readFile(new URL(`../assets/models/provisional/m01/props/m01_prop_${id}_lod0.glb`,import.meta.url));
  models.set(id,(await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene);
 }
 const sim=new M02BenchSimulation(),table=sim.world.obstacles.find(o=>o.id==='prop_b01_table'),before=sim.snapshot();
 const root=createM02FarmDressing(table,models);assert.deepEqual(root.children.map(n=>n.name),['M02 B01 railway_lantern','M02 B01 supply_crate_planked']);
 for(const model of root.children){
  model.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(model);
  assert.ok(b.min.x>=table.min.x&&b.max.x<=table.max.x);assert.ok(b.min.z>=table.min.z&&b.max.z<=table.max.z);
  if(model.name.endsWith('railway_lantern'))assert.ok(Math.abs(b.min.y-table.max.y-.005)<1e-5);
  else assert.ok(b.min.y>=table.min.y&&b.max.y<table.max.y);
 }
 const cargo=Object.create(M02CargoVisuals.prototype);cargo.models=models;
 const renderer={sim,world:sim.world,staticGroup:new THREE.Group(),authoredProps:[],supplyCartMesh:null,supplyVolumeMeshes:new Map()};
 cargo.sync(renderer);cargo.sync(renderer);assert.equal(renderer.staticGroup.children.length,1);
 renderer.staticGroup.clear();cargo.sync(renderer);assert.equal(renderer.staticGroup.children.length,1);
 assert.deepEqual(sim.snapshot(),before);
 sim.enterAreaBC06();renderer.world=sim.world;renderer.staticGroup.clear();cargo.sync(renderer);assert.equal(renderer.staticGroup.children.length,0);
});
