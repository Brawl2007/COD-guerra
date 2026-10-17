// T47 phase 0b: measured facts for candidate ckm posts on the west bridgehead (production line of sight + strict "never through the bridge" test).
// These assert what IS at this HEAD (window = route seed 19390901, 1 s samples, before evt_m01_east_demolition). Re-measure on purpose if world/colliders change.
// Re-measured on purpose when T47 joined the T38 staging (3c9cab7): the T38 places and postures of the gate riflemen and the shorter route change the window and the entry counts
// (787 -> 784 samples, 21600 -> 21460 enemy samples, repair 7680 -> 7560, post_repair 11920 -> 12000, withdrawal 2000 -> 1900; S1 213/339 -> 269/395, S2 214/214 -> 270/270,
// S3 358 -> 338), the farthest gate rifleman stands 1.3 m farther (S1 1050.38 m, S2 1050.34 m) and the smallest gap of an S2 ray to a bridge collider is 0.70 m, not 0.98 m. What these
// tests are about does not change: the casemate sees nobody, S2 still sees the same 14 gate riflemen in every phase, production == strict, no ray touches a bridge collider.
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
  assert.equal(win.samples,784);assert.equal(win.enemySamples,21460);assert.deepEqual(win.phaseSamples,{repair:7560,post_repair:12000,withdrawal:1900});assert.deepEqual(win.phaseActors,{repair:40,post_repair:40,withdrawal:50});
  const c0=evaluateCandidate(win,muzzleFlashWorld());assert.equal(c0.productionClearEntries,0);assert.deepEqual(c0.phases,{});
  const by=Object.fromEntries(SHORTLIST.map(c=>[c.id,describeCandidate(win,c)]));
  // S1 abutment top, north edge: 14 gate riflemen (incl. both MG34 gunners); production also lets rays through the rail trusses (28 actors), strict removes them.
  const s1=by.S1;assert.equal(s1.groundY,-.35);assert.equal(s1.muzzleY,.35);assert.equal(s1.distanceToCasemateM,4);
  for(const p of ['repair','post_repair','withdrawal']){assert.deepEqual(ids(s1,p),range(0,13));assert.equal(s1.phases[p].production.actors,28);}
  assert.equal(s1.strictClearEntries,269);assert.equal(s1.productionClearEntries,395);assert.equal(s1.throughBridgeEntries,126);assert.ok(s1.minGapToBridgeM<.1,'grazes road_collider_tower_05_n for de_east_0');
  assert.ok(s1.minTargetDistanceM>1044&&s1.maxTargetDistanceM<1051);
  // S2 embankment between the bridges: same 14 actors, production == strict, no ray touches any bridge collider (>0.9 m gap).
  const s2=by.S2;assert.equal(s2.groundY,-3);assert.equal(s2.muzzleY,-2.3);assert.equal(s2.throughBridgeEntries,0);assert.equal(s2.strictClearEntries,270);assert.equal(s2.productionClearEntries,270);assert.equal(s2.minGapToBridgeM,.7,'smallest gap of an S2 ray to a bridge collider (was 0.98 m before the T38 gate places)');
  for(const p of ['repair','post_repair','withdrawal'])assert.deepEqual(ids(s2,p),range(0,13));
  // S3 road axis on the abutment: sees the 10 span Germans only in the withdrawal phase, 0.35 m above the deck; no gate rifleman.
  const s3=by.S3;assert.deepEqual(ids(s3,'repair'),[]);assert.deepEqual(ids(s3,'post_repair'),[]);assert.deepEqual(ids(s3,'withdrawal'),range(0,9));
  assert.equal(s3.strictClearEntries,338);assert.equal(s3.minClearanceM,.351);assert.ok(Object.keys(s3.groups).join()==='grp_de_spans');
  // S4 south flank: only the south reserve group de_east_28..39, never the gate riflemen.
  const s4=by.S4;for(const p of ['repair','post_repair','withdrawal'])assert.deepEqual(ids(s4,p),range(28,39));assert.equal(s4.throughBridgeEntries,0);
  // Muzzle height 0.6..0.9 m above ground does not change the shortlisted actor counts.
  for(const above of [.6,.9]){const a=describeCandidate(win,SHORTLIST[0],{above}),b=describeCandidate(win,SHORTLIST[1],{above});assert.equal(a.strictClearEntries,269);assert.equal(b.strictClearEntries,270);}
});
