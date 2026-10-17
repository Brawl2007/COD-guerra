// T47 phase 0: facts measured at the candidate HEAD with the production world/trace. These assert what IS, not a desired outcome.
// If a later change opens an embrasure or fixes the colliders, these counts are expected to change and must be re-measured on purpose.
// They measure the pre-T47 CASEMATE gun (CKM_CASEMATE_POSITION) on a route whose ckm never engages (tests/helpers/m01-ckm-neutral.js), i.e. the world as
// phase 0 found it; the S2 post chosen by T47 is measured in tests/m01-ckm-candidate-posts.test.js and tests/m01-ckm-live-fire.test.js.
import test from 'node:test';import assert from 'node:assert/strict';
import {TczewWorld} from '../src/world/tczew-world.js';
import {CKM_CASEMATE_POSITION,CKM_POSITION} from '../src/game/m01-simulation.js';
import {muzzleFlashWorld,muzzleWorld,embrasureContract,traceRay,scanArc,summariseRows,directionFor,buildReport,routeSweep} from '../tools/m01-ckm-fire-arc.mjs';

test('CKM authored sockets transform numerically onto the reconstructed south embrasure',()=>{
  const flash=muzzleFlashWorld(),muzzle=muzzleWorld(),e=embrasureContract();
  assert.deepEqual(CKM_CASEMATE_POSITION,{x:24.17,y:-3,z:43});assert.deepEqual(CKM_POSITION,{x:7.17,y:-3,z:26},'T47 moved the gun to S2');
  assert.ok(Math.abs(flash.x-25)<1e-9);assert.ok(Math.abs(flash.y+2.36)<1e-9);assert.ok(Math.abs(flash.z-43)<1e-9);
  assert.ok(Math.abs(muzzle.x-24.85)<1e-9);assert.ok(Math.abs(muzzle.y+2.36)<1e-9);assert.ok(Math.abs(muzzle.z-43)<1e-9);
  assert.deepEqual(e.normal,{x:1,y:0,z:0});assert.equal(e.widthM,null);assert.equal(e.openingHeightM,null);
});

test('the muzzle sits inside no collider; the west abutment collider (x -22..10) ends 15 m short of it',()=>{
  const w=new TczewWorld(),o=muzzleFlashWorld(),inside=b=>o.x>=b.min.x&&o.x<=b.max.x&&o.y>=b.min.y&&o.y<=b.max.y&&o.z>=b.min.z&&o.z<=b.max.z;
  assert.deepEqual(w.colliders.filter(inside).map(b=>b.id),[]);
  const ab=w.colliders.find(c=>c.id==='road_collider_abutment_west');assert.equal(ab.min.x,-22);assert.equal(ab.max.x,10);
  assert.equal(w.heightAt(o.x,o.z),-3);
  const span=w.colliders.find(c=>c.id==='road_collider_deck_span_01');
  assert.ok(span.min.z<o.z&&o.z-span.max.z>.2&&o.z-span.max.z<.3,'muzzle is 0.235 m outside the deck footprint on the south side');
});

test('due-east production ray from the real muzzle is blocked by road pier 01 at ~112.4 m',()=>{
  const row=traceRay(new TczewWorld(),muzzleFlashWorld(),0,0,1200);
  assert.equal(row.firstBlocker,'road_collider_pier_01');assert.ok(row.blockerDistanceM>112&&row.blockerDistanceM<113);
});

test('azimuth convention is east at zero and positive toward map +Z/south',()=>{
  assert.deepEqual(directionFor(0,0),{x:1,y:0,z:0});const south=directionFor(90,0);assert.ok(Math.abs(south.x)<1e-12&&Math.abs(south.z-1)<1e-12);
});

test('default angular scan (az -30..30, el -5..10, 0.5 deg, 1200 m) is deterministic with the measured blocker census',()=>{
  const a=scanArc(),b=scanArc();assert.deepEqual(a,b);
  const s=summariseRows(a);
  assert.equal(s.samples,3751);assert.equal(s.clear,1131);assert.equal(s.blocked,2620);
  assert.deepEqual(s.byBlocker,{road_collider_deck_span_01:1847,CLEAR:1131,terrain:615,road_collider_tower_01_s:95,road_collider_pier_01:63});
  // Every clear ray points south of due east (azimuth >= -1) and upward (elevation >= 0.5): it leaves over the south bank/river, not along the deck.
  const clear=a.filter(r=>!r.firstBlocker);
  assert.ok(clear.every(r=>r.azimuthDeg>=-1&&r.elevationDeg>=.5));
  assert.ok(clear.every(r=>r.worldEnd.z>22&&r.worldEnd.z<643));
});

test('the authored aim-clip excursion is fully blocked in production geometry',()=>{
  const rows=scanArc({azMin:-1.2,azMax:1.2,azStep:.1,elMin:-.35,elMax:.35,elStep:.05,range:1200});
  const s=summariseRows(rows);assert.equal(s.samples,375);assert.equal(s.clear,0);
  assert.equal(s.byBlocker.road_collider_pier_01+s.byBlocker.road_collider_deck_span_01,375);
});

test('repair and withdrawal snapshots: 0 of 42 and 0 of 52 German actors are visible from the muzzle',async()=>{
  const report=await buildReport({azMin:-2,azMax:2,azStep:1,elMin:0,elMax:1,elStep:.5,range:1200});
  const {repair,withdrawal}=report.targets,count=(t,g)=>t.targets.filter(x=>x.group===g).length;
  assert.equal(repair.targets.length,42);assert.equal(count(repair,'grp_de_east'),40);assert.equal(count(repair,'grp_mg34_loaders'),2);assert.deepEqual(repair.clearTargets,[]);
  assert.equal(withdrawal.targets.length,52);assert.equal(count(withdrawal,'grp_de_east'),40);assert.equal(count(withdrawal,'grp_de_spans'),10);assert.equal(count(withdrawal,'grp_mg34_loaders'),2);assert.deepEqual(withdrawal.clearTargets,[]);
  const tally=t=>t.targets.reduce((m,x)=>(m[x.firstBlocker]=(m[x.firstBlocker]??0)+1,m),{});
  assert.deepEqual(tally(repair),{road_collider_deck_span_01:30,road_collider_pier_01:12});
  assert.deepEqual(tally(withdrawal),{road_collider_deck_span_01:37,road_collider_pier_01:15});
  const de0=repair.targets.find(t=>t.id==='de_east_0');assert.equal(de0.firstBlocker,'road_collider_deck_span_01');assert.ok(de0.blockerDistanceM>22&&de0.blockerDistanceM<23);
});

test('whole-route sweep: no German actor is visible from the muzzle while the casemate gun is in position (before east and west demolition)',{timeout:180000},async()=>{
  const r=await routeSweep({everyTicks:20});
  assert.equal(r.productionLineOfSightMismatches,0,'tool trace and world.lineOfSight agree on every sample');
  assert.equal(r.samples,1113);assert.equal(r.samplesBeforeEastDemolition,787);
  assert.equal(r.enemySamples,36596);assert.equal(r.enemySamplesBeforeEastDemolition,21600);
  assert.equal(r.clearEnemySamplesBeforeEastDemolition,0);assert.equal(r.clearEnemySamplesAfterEastBeforeWestDemolition,0);
  // The only clear samples exist after evt_m01_west_demolition removed pier_01 and deck_span_01, when the crew is in 'retreat' and the casemate is gone.
  assert.equal(r.clearEnemySamples,135);assert.equal(r.clearEnemySamplesAfterWestDemolition,135);
  assert.deepEqual(Object.keys(r.clearTargets),['de_east_26','de_east_27','de_east_33','de_east_34','de_east_35','de_east_36','de_east_37','de_east_38','de_east_39']);
  assert.ok(Object.values(r.clearTargets).every(t=>t.ckmPhaseAtFirst==='retreat'&&t.samplesBeforeEastDemolition===0&&t.samples===t.samplesAfterWestDemolition));
});
