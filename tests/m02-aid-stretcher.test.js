import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {createM02AidStretcher,isM02AidStretcher} from '../src/render/m02-aid-stretcher.js';

test('B12 stretcher presentation fits the authored obstacles without changing the simulation',()=>{
  const sim = new M02BenchSimulation();
  sim.enterAreaCC09();
  const before = sim.snapshot();
  const obstacles = sim.world.obstacles.filter(isM02AidStretcher);
  assert.equal(obstacles.length, 2);
  const materials = {roof_thatch: new THREE.MeshStandardMaterial(), wood_frame: new THREE.MeshStandardMaterial()};
  for (const ob of obstacles) {
    const stretcher = createM02AidStretcher(ob, materials);
    assert.equal(stretcher.children.length, 3);
    assert.equal(stretcher.children.filter(n=>n.name==='canvas').length, 1);
    assert.equal(stretcher.children.filter(n=>n.name==='wooden pole').length, 2);
    stretcher.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(stretcher);
    for (const axis of ['x','y','z']) {
      assert.ok(bounds.min[axis] >= ob.min[axis] - 1e-6, `${ob.id} ${axis} minimum`);
      assert.ok(bounds.max[axis] <= ob.max[axis] + 1e-6, `${ob.id} ${axis} maximum`);
    }
    for (const child of stretcher.children) child.geometry.dispose();
  }
  for (const material of Object.values(materials)) material.dispose();
  assert.deepEqual(sim.snapshot(), before);
});
