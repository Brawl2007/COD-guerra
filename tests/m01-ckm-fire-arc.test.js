import test from 'node:test';import assert from 'node:assert/strict';
import {TczewWorld} from '../src/world/tczew-world.js';
import {muzzleFlashWorld,muzzleWorld,embrasureContract,traceRay,scanArc,summariseRows,directionFor,buildReport} from '../tools/m01-ckm-fire-arc.mjs';

test('CKM authored sockets transform numerically onto the reconstructed south embrasure',()=>{
  const flash=muzzleFlashWorld(),muzzle=muzzleWorld(),e=embrasureContract();
  assert.ok(Math.abs(flash.x-25)<1e-9);assert.ok(Math.abs(flash.y+2.36)<1e-9);assert.ok(Math.abs(flash.z-43)<1e-9);
  assert.ok(Math.abs(muzzle.x-24.85)<1e-9);assert.ok(Math.abs(muzzle.y+2.36)<1e-9);assert.ok(Math.abs(muzzle.z-43)<1e-9);
  assert.deepEqual(e.normal,{x:1,y:0,z:0});assert.equal(e.widthM,null);assert.equal(e.openingHeightM,null);
});

test('due-east production ray from real muzzle is blocked by road pier 01',()=>{
  const row=traceRay(new TczewWorld(),muzzleFlashWorld(),0,0,1200);
  assert.equal(row.firstBlocker,'road_collider_pier_01');assert.ok(row.blockerDistanceM>112&&row.blockerDistanceM<113);
});

test('angular scan is deterministic and reports both blocked and geometrically clear rays',()=>{
  const options={azMin:-10,azMax:10,azStep:1,elMin:-2,elMax:3,elStep:1,range:1200};
  const a=scanArc(options),b=scanArc(options);assert.deepEqual(a,b);
  const s=summariseRows(a);assert.equal(s.samples,126);assert.ok(s.blocked>0);assert.ok(s.clear>0);
  assert.ok(s.byBlocker.road_collider_pier_01>0);
});

test('azimuth convention is east at zero and positive toward map +Z/south',()=>{
  assert.deepEqual(directionFor(0,0),{x:1,y:0,z:0});const south=directionFor(90,0);assert.ok(Math.abs(south.x)<1e-12&&Math.abs(south.z-1)<1e-12);
});

test('the authored aim-clip excursion is fully blocked in production geometry',()=>{
  const rows=scanArc({azMin:-1.2,azMax:1.2,azStep:.1,elMin:-.35,elMax:.35,elStep:.05,range:1200});
  const s=summariseRows(rows);assert.equal(s.samples,375);assert.equal(s.clear,0);
  assert.equal(s.byBlocker.road_collider_pier_01+s.byBlocker.road_collider_deck_span_01,375);
});

test('real repair and withdrawal snapshots expose no unobstructed German target from the CKM muzzle',async()=>{
  const report=await buildReport({azMin:-2,azMax:2,azStep:1,elMin:0,elMax:1,elStep:.5,range:1200});
  assert.equal(report.targets.repair.targets.length,40);assert.deepEqual(report.targets.repair.clearTargets,[]);
  assert.equal(report.targets.withdrawal.targets.length,50);assert.deepEqual(report.targets.withdrawal.clearTargets,[]);
  assert.ok(report.targets.repair.targets.every(t=>t.firstBlocker));assert.ok(report.targets.withdrawal.targets.every(t=>t.firstBlocker));
});
