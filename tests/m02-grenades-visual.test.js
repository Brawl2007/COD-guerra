import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02Grenades} from '../src/render/m02-grenades.js';

test('M01-sized grenade meshes follow real projectiles and same-clock checkpoint restore without ghost objects',()=>{
 const sim=new M02BenchSimulation(),scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial(),view=new M02Grenades(scene,material);
 try{
  const first=sim.throwGrenade(),save=sim.snapshot();sim.throwGrenade();const before=sim.snapshot();
  view.update(sim);assert.deepEqual(sim.snapshot(),before);assert.equal(view.views.size,2);
  assert.equal(view.views.get(first.id).geometry,view.geometry);assert.equal(view.views.get(first.id).material,material);
  assert.deepEqual(view.views.get(first.id).scale.toArray(),[.07,.07,.07]);
  for(let i=0;i<8;i++)sim.tick(.05,{});const flying=sim.grenades.find(g=>g.id===first.id);view.update(sim);
  assert.deepEqual(view.views.get(first.id).position.toArray(),[flying.x,flying.y,flying.z]);
  sim.restoreSnapshot(save);const restored=sim.snapshot();view.update(sim);
  assert.deepEqual(sim.snapshot(),restored);assert.deepEqual(view.diagnostics.ids,[first.id]);
  for(let i=0;i<45;i++)sim.tick(.05,{});view.update(sim);assert.equal(sim.grenades.length,0);assert.equal(view.views.size,0);
 }finally{view.dispose();material.dispose();}
 assert.equal(scene.children.length,0);
});
