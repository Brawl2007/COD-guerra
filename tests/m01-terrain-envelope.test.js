import test from 'node:test';
import assert from 'node:assert/strict';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {buildTerrainEnvelope} from '../src/render/m01-terrain-envelope.js';

test('envelope derives authored fire ranges, all covers and phase destination families with the complete margin',()=>{
  const world=new TczewWorld(),e=buildTerrainEnvelope(world),sim=new M01Simulation();
  assert.equal(e.margin,20);assert.ok(Object.isFrozen(e));assert.equal(e.regions.filter(r=>r.id.startsWith('cover:')).length,world.layout.coverNodes.length);
  for(const a of [sim.player,...sim.actors]){
    const reserve=a.group==='grp_east_platoon'&&Number(a.id.split('_').at(-1))>=18;
    assert.ok(reserve?e.contains(a.x,a.z):e.distance(a.x,a.z)===0,`initial participant ${a.id}`);
    if(reserve)assert.ok(!a.active&&e.distance(a.x,a.z)<2,'six T23 reserved casualties remain inside the unchanged20m protected buffer');
  }
  for(const [x,z]of [[1097,-12],[1094,100],[1080,41.8],[-326.8,36.5],[-334.92,26.2],[-173.2,24.4],[24.17,43],[-500,-1300],[1715,-2.5]]){
    assert.equal(e.distance(x,z),0,`whole future/source bound ${x},${z}`);assert.ok(e.contains(x+20,z));assert.ok(e.contains(x,z-20));
  }
  assert.ok(!e.contains(15800,6200),'decorative railway endpoint is not an invented playable route');
  const regions=e.regions;world.refresh(['evt_m01_west_demolition']);assert.equal(e.regions,regions);assert.equal(buildTerrainEnvelope(world).regions.filter(r=>r.id.startsWith('cover:')).length,28,'destroyed cover nodes remain protected (25 authored before T47, plus cv_ckm_post, plus the two sandbag rows of the sappers added by R3-a on 2026-10-25: cv_cable_fault and cv_cable_second)');
});
