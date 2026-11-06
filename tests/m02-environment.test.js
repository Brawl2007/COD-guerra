import test from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { m02EnvironmentLayout,m02TerrainSources } from '../src/render/m02-environment-layout.js';
import { bakeTerrainMask } from '../src/render/m01-terrain-mask.js';

test('M02 decoration is stable, clear of buildings and collision cover, and cannot mutate gameplay',()=>{
 const sim=new M02BenchSimulation();const before=sim.snapshot();
 const a=m02EnvironmentLayout(sim.world),b=m02EnvironmentLayout(sim.world);
 assert.deepEqual(a,b);assert.deepEqual(sim.snapshot(),before);
 assert.ok(a.trees.length>60);assert.ok(a.ground.length>1000);
 for(const p of a.ground)for(const building of sim.world.layout.buildings){
  const [x0,x1,z0,z1]=building.bounds;
  assert.ok(!(p.x>x0-1&&p.x<x1+1&&p.z>z0-1&&p.z<z1+1));
 }
 for(const cell of ['B','C']){if(cell==='B')sim.enterAreaBC06();else sim.enterAreaCC09();const mask=bakeTerrainMask(m02TerrainSources(sim.world),{width:32,height:32});assert.equal(mask.length,4096);}
 const sources=m02TerrainSources(sim.world);
 assert.deepEqual(bakeTerrainMask(sources,{width:32,height:32}),bakeTerrainMask(sources,{width:32,height:32}));
});
