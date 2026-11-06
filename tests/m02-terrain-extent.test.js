import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02TerrainExtent,m02FarGroundPatches,m02TerrainAxes,m02EnvironmentLayout} from '../src/render/m02-environment-layout.js';

test('each streamed cell has drawn terrain and material coverage beyond every playable edge, with a continuous outer ring',()=>{
 const sim=new M02BenchSimulation();
 for(const enter of ['startAreaAFullC01','enterAreaBC06','enterAreaCC09']){
  sim[enter]();const before=sim.snapshot(),e=m02TerrainExtent(sim.world),p=sim.world.layout.bounds.playable;
  assert.ok(e.x0<=p.minX-25&&e.x1>=p.maxX+25&&e.z0<=p.minZ-25&&e.z1>=p.maxZ+25);
  const axes=m02TerrainAxes(e.x1-e.x0,e.z1-e.z0,64,90,Boolean(sim.world.layout.c01Corridor),{x:(e.x0+e.x1)/2,z:(e.z0+e.z1)/2});
  assert.equal(axes.x[0],e.x0);assert.equal(axes.x.at(-1),e.x1);assert.equal(axes.z[0],e.z0);assert.equal(axes.z.at(-1),e.z1);
  const patches=m02FarGroundPatches(e);
  // Sample the complete rendered landscape: exactly one surface, no holes or
  // overlapping planes, including the old missing B/C northern/eastern edge.
  for(let x=-598;x<600;x+=17)for(let z=-698;z<500;z+=19){
   const surfaces=[[e.x0,e.x1,e.z0,e.z1],...patches].filter(([x0,x1,z0,z1])=>x>x0&&x<x1&&z>z0&&z<z1);
   if([e.x0,e.x1].includes(x)||[e.z0,e.z1].includes(z))continue;
   assert.equal(surfaces.length,1,`cell ${sim.activeCellId} at ${x},${z}`);
  }
  const scenery=m02EnvironmentLayout(sim.world),again=m02EnvironmentLayout(sim.world);
  assert.deepEqual(scenery,again);assert.ok(scenery.trees.length<384&&scenery.ground.length<24000);
  const windbreak=scenery.trees.slice(-128);assert.equal(windbreak.length,128);
  for(const t of windbreak)assert.ok(t.x+t.width/2<p.minX||t.x-t.width/2>p.maxX||t.z+t.width/2<p.minZ||t.z-t.width/2>p.maxZ,'visual tree canopy cannot cover playable combat');
  assert.deepEqual(sim.snapshot(),before);
 }
});
