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
  // Combat slice 2 (amendment 08, 2026-10-18): the withdrawal snapshot is taken as the Germans enter the deck, now on their entry places (x 1027-1044) instead of the old file at
  // x 1050-1077, so one of them is first blocked by pier_01 instead of deck_span_01 (37/15 -> 36/16); still none is clear.
  assert.deepEqual(tally(withdrawal),{road_collider_deck_span_01:36,road_collider_pier_01:16});
  const de0=repair.targets.find(t=>t.id==='de_east_0');assert.equal(de0.firstBlocker,'road_collider_deck_span_01');assert.ok(de0.blockerDistanceM>22&&de0.blockerDistanceM<23);
});

test('whole-route sweep: no German actor is visible from the muzzle while the casemate gun is in position (before east and west demolition)',{timeout:180000},async()=>{
  const r=await routeSweep({everyTicks:20});
  assert.equal(r.productionLineOfSightMismatches,0,'tool trace and world.lineOfSight agree on every sample');
  // Re-measured on purpose when T47 joined the T38 staging (3c9cab7): the route is 3 s shorter before the east demolition (samples 1113 -> 1110, 787 -> 784) and the Germans
  // alive are fewer in the window (enemy samples 36596 -> 36456, 21600 -> 21460). The clear-sample census below is unchanged: only the retreating crew's casemate gun is ever cleared.
  // Re-measured again, on purpose, with the repo tool (tools/m01-ckm-fire-arc.mjs routeSweep) when the player's body got real physics (golden amendment 04): the pilot detours round the
  // abutments, the repair cluster, the hut drums and through the shelter gate, so the window is 40 ticks longer (samples 1110 -> 1112, 784 -> 785; enemy samples 36456 -> 36542,
  // 21460 -> 21500) and the retreating crew's gun is clear of more samples after the west demolition (135 -> 144; the same nine targets). Still nothing is clear before it.
  // Re-measured on purpose for the P2 pacing (golden amendment 06, 2026-10-18): the hold at 24x shortens the route before the east demolition (samples 1112 -> 988, 785 -> 661;
  // enemy samples 36542 -> 31582, 21500 -> 16540). The clear-sample census below is unchanged (135, the same nine targets, nothing before the west demolition).
  // Re-measured on purpose for the combat AI slice 1 (golden amendment 07, 2026-10-18): the repair of the neutral route ends sooner (samples 988 -> 959, 661 -> 633; enemy
  // samples 31582 -> 30426, 16540 -> 15430). The clear-sample census below is unchanged (135, the same nine targets).
  // Re-measured on purpose for combat slice 2 (golden amendment 08, 2026-10-18): the MG34 pin of 5 s lengthens the repair and the east demolition waits for the deck assault
  // (~220 s more before it), so samples 959 -> 1206, 633 -> 880; enemy samples 30426 -> 42546, 15430 -> 27550. The clear-sample census below is unchanged (135, the same nine
  // targets, nothing before the west demolition).
  // Re-measured on purpose for SP-08 + slice 3 (golden amendment 14, 2026-10-22): after the east demolition the player escorts Dudek with Bąk instead of waiting at the post, and on
  // this neutral route the delivery (hence the west demolition) comes 3 samples sooner (1206 -> 1203); nothing before the east demolition moved (880).
  // Re-measured on purpose for R1-a (golden amendment 16, 2026-10-23): the stun of the bombs delays the pilot, and the neutral route (the ckm never engages) plays out differently from there:
  // the window before the east demolition is one sample longer (880 -> 881) and the whole route 15 samples (1203 -> 1218); the census of clear samples below is unchanged (135, the same nine targets).
  // Re-measured on purpose for R2-b (golden amendment 18, 2026-10-24): the Polish fire of the deck is real and the German assault closes in stages, so on this neutral route (the pilot never fires) the east demolition
  // waits 94 s longer for the deck: the window before it is 94 samples longer (881 -> 975) and the whole route as well (1218 -> 1310); the census of clear samples is unchanged (135, the same nine targets, nothing
  // before the west demolition: no German on the deck, now as near as 250 m, is ever in clear sight of the casemate gun).
  // Re-measured on purpose for R3-a (golden amendment 19, 2026-10-24: the sappers' staged operation, owner complaint «os sapadores parecem homens a picar o chão repetidamente»): the team walks the cable at 1.8 m/s and works at
  // two cuts 16 m apart, so the pins fall at other moments and the neutral route (the pilot never fires) plays out differently from the repair on: the window before the east demolition is two samples longer (975 -> 977)
  // and the whole route five (1310 -> 1315); the census of clear samples is unchanged (135, the same nine targets, nothing before the west demolition; tools/m01-ckm-fire-arc.mjs routeSweep).
  // Re-measured on purpose again for the review of R3-a (golden amendment 19, regenerated, 2026-10-25): the sappers run to a sandbag row at each cut when they are shaken and the section withdraws to places of its own
  // (map-layout.json cv_cable_fault / cv_cable_second, mission.json retreat), so the neutral route plays out differently from the repair on: the window before the east demolition is three samples longer (977 -> 980)
  // and the whole route three fewer than before (1315 -> 1312); the census of clear samples is unchanged (135, the same nine targets, nothing before the west demolition; tools/m01-ckm-fire-arc.mjs routeSweep).
  assert.equal(r.samples,1312);assert.equal(r.samplesBeforeEastDemolition,980);
  // Re-measured on purpose for the 05:35 fill (golden amendment 12, 2026-10-19): the dike riflemen also fire at the player at the deck post, the main RNG moves from 05:35 and the
  // deck fight of this route plays out differently (enemy samples 42546 -> 42427, 27550 -> 27431); samples and the clear-sample census below are unchanged (135, the same nine).
  // Amendment 14 (2026-10-22): the 3 samples fewer after the east demolition take 138 enemy samples with them (42427 -> 42289); before it unchanged (27431), census unchanged.
  // Amendment 16 (2026-10-23): enemy samples 42289 -> 42249, before the east demolition 27431 -> 27421.
  // Amendment 18 (2026-10-24): enemy samples 42249 -> 46765, before the east demolition 27421 -> 32025.
  // Amendment 19 (2026-10-24, R3-a): enemy samples 46765 -> 47450, before the east demolition 32025 -> 32240 (the longer window above; the same cause).
  // Amendment 19 (2026-10-25, the R3-a review): enemy samples 47450 -> 46756, before the east demolition 32240 -> 32148 (the window above; the same cause).
  assert.equal(r.enemySamples,46756);assert.equal(r.enemySamplesBeforeEastDemolition,32148);
  assert.equal(r.clearEnemySamplesBeforeEastDemolition,0);assert.equal(r.clearEnemySamplesAfterEastBeforeWestDemolition,0);
  // Re-measured on purpose, with the repo tool, for the NPC navigation round every solid (golden amendment 05, 2026-10-18, phys x npc integration): the west demolition, which waits
  // for every ally west of x -90, is consumed 0.15 s later on this route (movedEvents in docs/verification/m01-runtime/npc-navigation-2026-10-18/GOLDEN_AMENDMENT_05.json) while the
  // route's length in samples is unchanged (1112), so each of the same nine targets is clear in one 20-tick sample fewer after it (16 -> 15 each, 144 -> 135). Nothing before it moved.
  // The only clear samples exist after evt_m01_west_demolition removed pier_01 and deck_span_01, when the crew is in 'retreat' and the casemate is gone.
  assert.equal(r.clearEnemySamples,135);assert.equal(r.clearEnemySamplesAfterWestDemolition,135);
  assert.deepEqual(Object.keys(r.clearTargets),['de_east_26','de_east_27','de_east_33','de_east_34','de_east_35','de_east_36','de_east_37','de_east_38','de_east_39']);
  assert.ok(Object.values(r.clearTargets).every(t=>t.ckmPhaseAtFirst==='retreat'&&t.samplesBeforeEastDemolition===0&&t.samples===t.samplesAfterWestDemolition));
});
