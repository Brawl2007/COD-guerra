// T47 phase 0b: measured facts for candidate ckm posts on the west bridgehead (production line of sight + strict "never through the bridge" test).
// These assert what IS at this HEAD (window = route seed 19390901, 1 s samples, before evt_m01_east_demolition). Re-measure on purpose if world/colliders change.
// Re-measured on purpose when T47 joined the T38 staging (3c9cab7): the T38 places and postures of the gate riflemen and the shorter route change the window and the entry counts
// (787 -> 784 samples, 21600 -> 21460 enemy samples, repair 7680 -> 7560, post_repair 11920 -> 12000, withdrawal 2000 -> 1900; S1 213/339 -> 269/395, S2 214/214 -> 270/270,
// S3 358 -> 338), the farthest gate rifleman stands 1.3 m farther (S1 1050.38 m, S2 1050.34 m) and the smallest gap of an S2 ray to a bridge collider is 0.70 m, not 0.98 m. What these
// tests are about does not change: the casemate sees nobody, S2 still sees the same 14 gate riflemen in every phase, production == strict, no ray touches a bridge collider.
// Re-measured on purpose for T47 amendment 03 (D43): the T23 withdrawal cadence counted on landing adds one entry (a span German's position) to the window after 06:05:
// S1 269/395 -> 270/396, S2 270/270 -> 271/271 (and 270 -> 271 at muzzle heights 0.6 and 0.9 m); every other figure is unchanged (GOLDEN_AMENDMENT_03.json, s2Visibility).
// Re-measured on purpose for T47 amendment 04 (the player's body physics): the pilot detours round the abutments, the repair cluster and the hut drums, so the window is one sample longer
// and the phases shift by a few seconds: 784 -> 785 samples, 21460 -> 21500 enemy samples, repair 7560 -> 7640, post_repair 12000 -> 11960 (withdrawal 1900 unchanged). Every entry count of the
// shortlist (S1 270/396, S2 271/271, S3 338, S4 108) and the distances are unchanged (GOLDEN_AMENDMENT_04.json, s2Visibility).
// Re-measured on purpose for the P2 pacing (golden amendment 06, 2026-10-18, integration claude/busy-ritchie-3fkvk2-integ-pc): seg_hold 05:34-05:59 runs at 24x while the pilot holds
// the deck after the raid, so the post-repair window has fewer 20-tick samples (785 -> 661 samples, 21500 -> 16540 enemy samples, post_repair 11960 -> 7000; repair 7640 and
// withdrawal 1900 unchanged). An entry is a distinct (world state, actor, eye position) tuple, not a sample: the samples now fall on other ticks (other eye positions of the same
// actors), so S1 270/396 -> 274/400 and S2 271/271 -> 275/275 (and at muzzle heights 0.6 and 0.9 m); S3 338 and S4 108 unchanged. What the tests are about is unchanged: the casemate
// sees nobody, S2 sees the same 14 gate riflemen in every phase, production == strict, no S2 ray touches a bridge collider, the same gaps (docs/verification/m01-runtime/pacing-p2-2026-10-18).
// Re-measured on purpose for the combat AI slice 1 (golden amendment 07, 2026-10-18, same integration): the Germans fire in peeks and burst groups, so the repair of the neutral
// route ends sooner (repair 7640 -> 5920 samples) and the rest of the window shifts (661 -> 633 samples, 16540 -> 15430 enemy samples, post_repair 7000 -> 7560, withdrawal
// 1900 -> 1950); the distinct entries follow (S1 274/400 -> 253/379, S2 275 -> 254 and at muzzle heights 0.6 and 0.9 m, S3 338 -> 341; S4 108 unchanged). Who is seen from
// each post, production == strict for S2 and the gaps are unchanged (docs/verification/m01-runtime/combat-ai-2026-10-18).
// Re-measured on purpose for combat slice 2 (golden amendment 08, 2026-10-18, branch -slice2): an MG34 near miss now pins the sappers 5 s, so the repair of the neutral route
// is longer (repair 5920 -> 7320 samples, post_repair 7560 -> 7080), and the east demolition waits for the deck assault, so the withdrawal window is ~220 s longer (1950 -> 13150
// samples; 633 -> 880 samples, 15430 -> 27550 enemy samples). S1 253/379 -> 254/380, S2 254 -> 255 (and at 0.6/0.9 m); S3 now sees the ten deck Germans much longer and closer
// (341 -> 1234 entries, targets from 451 m; its smallest clearance over the deck 0.351 -> 0.35 m: they stand on the new lanes, z 37.7-42.3); S4 108 unchanged. The casemate still
// sees nobody, S2 the same 14 gate riflemen in every phase, production == strict, no S2 ray touches a bridge (tools/m01-ckm-fire-arc.mjs collectWindowTargets).
// Measured with tools/m01-ckm-fire-arc.mjs (collectWindowTargets, describeCandidate), the functions the tests call.
import test from 'node:test';import assert from 'node:assert/strict';
import {TczewWorld} from '../src/world/tczew-world.js';
import {collectWindowTargets,evaluateCandidate,describeCandidate,candidateGrid,candidateExclusion,muzzleFlashWorld,SHORTLIST} from '../tools/m01-ckm-fire-arc.mjs';

const ids=(d,p)=>d.phases[p]?.strict.ids.map(i=>Number(i.split('_').at(-1))).sort((a,b)=>a-b)??[];
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);

test('candidate grid on the west bridgehead: 1066 points, 39 excluded (36 inside colliders/portals/casemate, 3 on bridge decks)',()=>{
  const w=new TczewWorld(),grid=candidateGrid(),why=grid.map(p=>candidateExclusion(w,p.x,p.z));
  assert.equal(grid.length,1066);assert.equal(why.filter(Boolean).length,39);
  assert.equal(why.filter(x=>x?.startsWith('inside')).length,36);assert.equal(why.filter(x=>x?.startsWith('bridge-deck')).length,3);
  assert.deepEqual(SHORTLIST.map(c=>candidateExclusion(w,c.x,c.z)),[null,null,null,null]);
  assert.ok(Math.abs(w.heightAt(8,30)+.35)<1e-5);assert.equal(w.heightAt(8,26),-3);
});

test('whole-route window: the casemate baseline sees 0 Germans; the shortlisted posts see gate riflemen (S1,S2), the span group (S3) or only the south reserve (S4)',{timeout:240000},async()=>{
  const win=await collectWindowTargets({everyTicks:20});
  // 2026-10-19 re-pin 27550 -> 27431, withdrawal 13150 -> 13031 (golden amendment 12, the 05:35 fill): the dike riflemen now also fire at the player at the deck post, which moves the
  // main RNG from 05:35 on, so the deck fight of this neutral route plays out differently (its Germans fall or fall back at other times: 119 fewer living-German samples in the
  // withdrawal); the route's length in samples (880) and every phase before the withdrawal are unchanged.
  // 2026-10-23 re-pin (R1-a, golden amendment 16: the bombs of the 04:34 raid stun the player): the pilot is delayed by a few seconds on his way to the crate (delivery at 213.35 s of the mission clock instead of 209.1),
  // and the neutral route (the ckm never engages) plays out differently from there, as after every change of timing: the window is one sample longer (880 -> 881), the repair phase 7320 -> 7680 and
  // the post-repair 7080 -> 7000, the withdrawal 13031 -> 12741, enemy samples 27431 -> 27421; the distinct entries follow (S1 254/380 -> 252/378, S2 255 -> 253 and at muzzle heights 0.6 and 0.9 m,
  // S3 1250 -> 1157). What these tests are about is unchanged: the casemate sees nobody, S2 sees the same 14 gate riflemen in every phase, production == strict, no S2 ray touches a bridge collider,
  // the same gaps and distances (tools/verification/m01-bomb-effects-audit.mjs; docs/verification/m01-runtime/bomb-effects-2026-10-23).
  // 2026-10-24 re-pin (R2-b, golden amendment 18: the Polish fire of the deck is real and the German assault closes in stages down to safeX 250): the east demolition waits for a longer deck fight on this neutral route
  // (the pilot never fires; +94 s), so the window is 94 samples longer (881 -> 975), all of it in the withdrawal phase (12741 -> 17345; the repair and post-repair phases are unchanged), enemy samples 27421 -> 32025, and the
  // S3 post, which looks along the deck, sees the span Germans from 250.9 m instead of 451 m and in more samples (1157 -> 1536 entries). What these tests are about is unchanged: the casemate sees nobody (0 clear entries),
  // S2 sees the same 14 gate riflemen in every phase (253/253), S1 252/378, S4 108, production == strict at S2, no S2 ray touches a bridge collider (tools/verification/m01-german-ai-metrics.mjs; docs/verification/m01-runtime/german-ai-r2b-2026-10-24).
  assert.equal(win.samples,975);assert.equal(win.enemySamples,32025);assert.deepEqual(win.phaseSamples,{repair:7680,post_repair:7000,withdrawal:17345});assert.deepEqual(win.phaseActors,{repair:40,post_repair:40,withdrawal:50});
  const c0=evaluateCandidate(win,muzzleFlashWorld());assert.equal(c0.productionClearEntries,0);assert.deepEqual(c0.phases,{});
  const by=Object.fromEntries(SHORTLIST.map(c=>[c.id,describeCandidate(win,c)]));
  // S1 abutment top, north edge: 14 gate riflemen (incl. both MG34 gunners); production also lets rays through the rail trusses (28 actors), strict removes them.
  const s1=by.S1;assert.equal(s1.groundY,-.35);assert.equal(s1.muzzleY,.35);assert.equal(s1.distanceToCasemateM,4);
  for(const p of ['repair','post_repair','withdrawal']){assert.deepEqual(ids(s1,p),range(0,13));assert.equal(s1.phases[p].production.actors,28);}
  assert.equal(s1.strictClearEntries,252);assert.equal(s1.productionClearEntries,378);assert.equal(s1.throughBridgeEntries,126);assert.ok(s1.minGapToBridgeM<.1,'grazes road_collider_tower_05_n for de_east_0');
  assert.ok(s1.minTargetDistanceM>1044&&s1.maxTargetDistanceM<1051);
  // S2 embankment between the bridges: same 14 actors, production == strict, no ray touches any bridge collider (>0.9 m gap).
  const s2=by.S2;assert.equal(s2.groundY,-3);assert.equal(s2.muzzleY,-2.3);assert.equal(s2.throughBridgeEntries,0);assert.equal(s2.strictClearEntries,253);assert.equal(s2.productionClearEntries,253);assert.equal(s2.minGapToBridgeM,.7,'smallest gap of an S2 ray to a bridge collider (was 0.98 m before the T38 gate places)');
  for(const p of ['repair','post_repair','withdrawal'])assert.deepEqual(ids(s2,p),range(0,13));
  // S3 road axis on the abutment: sees the 10 span Germans only in the withdrawal phase, 0.35 m above the deck; no gate rifleman.
  const s3=by.S3;assert.deepEqual(ids(s3,'repair'),[]);assert.deepEqual(ids(s3,'post_repair'),[]);assert.deepEqual(ids(s3,'withdrawal'),range(0,9));
  // 2026-10-19 re-pin 1234 -> 1235 (combat slice 2b): the rearguard fires on the deck assault from 06:09:30, so the deck Germans the S3 post samples along the route are where they
  // are pinned, fall or fall back sooner (one more clear entry); the post itself, its clearance and its group are unchanged.
  // 2026-10-19 re-pin 1235 -> 1250 (golden amendment 12, the 05:35 fill): the same cause as above, the deck Germans are elsewhere at the sampled ticks of the withdrawal.
  assert.equal(s3.strictClearEntries,1536);   // 2026-10-23 re-pin 1250 -> 1157 (golden amendment 16): the span Germans are elsewhere at the sampled ticks of the withdrawal, as in the re-pins above; 2026-10-24 1157 -> 1536 (golden amendment 18): the longer, closer deck fight
  assert.equal(s3.minClearanceM,.35);assert.ok(Object.keys(s3.groups).join()==='grp_de_spans');
  // S4 south flank: only the south reserve group de_east_28..39, never the gate riflemen.
  const s4=by.S4;for(const p of ['repair','post_repair','withdrawal'])assert.deepEqual(ids(s4,p),range(28,39));assert.equal(s4.throughBridgeEntries,0);
  // Muzzle height 0.6..0.9 m above ground does not change the shortlisted actor counts.
  for(const above of [.6,.9]){const a=describeCandidate(win,SHORTLIST[0],{above}),b=describeCandidate(win,SHORTLIST[1],{above});assert.equal(a.strictClearEntries,252);assert.equal(b.strictClearEntries,253);}
});
