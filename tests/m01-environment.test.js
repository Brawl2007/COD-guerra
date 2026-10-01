import test from 'node:test';
import assert from 'node:assert/strict';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01_TREES} from '../src/world/m01-decoration-layout.js';

test('foreground trunks obstruct walking and shots; restoring destruction reconstructs the same static obstacles',()=>{
  const world=new TczewWorld(),tree=world.trees[0],box=world.treeObstacles[0];
  const actor={x:box.min.x-.36,z:tree.z,y:tree.y,radius:.35};world.move(actor,1,0);
  assert.ok(actor.x<box.min.x-.3,'the player does not walk through the visible trunk');
  const left={space:'metres',x:tree.x-2,y:tree.y,z:tree.z},right={space:'metres',x:tree.x+2,y:tree.y,z:tree.z};
  assert.equal(world.lineOfSight(left,right),false,'the visible trunk blocks actual shots');
  const before=structuredClone(world.treeObstacles);world.refresh(['evt_m01_east_demolition']);assert.deepEqual(world.treeObstacles,before);
  assert.equal(new Set(M01_TREES.map(t=>t.id)).size,M01_TREES.length);
});
