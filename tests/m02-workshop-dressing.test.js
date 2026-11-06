import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02CargoVisuals,createM02WorkshopDressing} from '../src/render/m02-cargo-visuals.js';

test('M01 props sit on B05 workbench without changing navigation or duplicating after a rebuild',async()=>{
 const models=new Map(),loader=new GLTFLoader().register(()=>({name:'NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
 for(const id of ['ammo_tin_box','ammo_crate_wood','jerrycans']){
  const b=await fs.readFile(new URL(`../assets/models/provisional/m01/props/m01_prop_${id}_lod0.glb`,import.meta.url));
  models.set(id,(await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene);
 }
 const sim=new M02BenchSimulation();sim.enterAreaBC06();const bench=sim.world.obstacles.find(o=>o.id==='prop_b05_workbench');
 const before=sim.snapshot(),root=createM02WorkshopDressing(bench,models);assert.equal(root.children.length,3);
 for(const item of root.children){
  item.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(item);
  assert.ok(bounds.min.x>=bench.min.x&&bounds.max.x<=bench.max.x,item.name+' fits x');
  assert.ok(bounds.min.z>=bench.min.z&&bounds.max.z<=bench.max.z,item.name+' fits z');
  assert.ok(Math.abs(bounds.min.y-bench.max.y-.005)<1e-5,item.name+' rests on the tabletop');
 }
 const cargo=Object.create(M02CargoVisuals.prototype);cargo.models=models;
 const renderer={sim,world:sim.world,staticGroup:new THREE.Group(),authoredProps:[],supplyCartMesh:null,supplyVolumeMeshes:new Map()};
 cargo.sync(renderer);cargo.sync(renderer);assert.equal(renderer.staticGroup.children.length,1);
 const first=cargo.workshopRoot;renderer.staticGroup.clear();cargo.sync(renderer);
 assert.equal(renderer.staticGroup.children.length,1);assert.notEqual(cargo.workshopRoot,first);
 assert.deepEqual(sim.snapshot(),before,'cosmetic details cannot alter the simulation');
 sim.enterAreaCC09();renderer.world=sim.world;renderer.staticGroup.clear();const cBefore=sim.snapshot();cargo.sync(renderer);
 assert.equal(renderer.staticGroup.children.length,0);assert.deepEqual(sim.snapshot(),cBefore);
});
