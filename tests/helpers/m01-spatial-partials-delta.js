import assert from 'node:assert/strict';
// Partials T07 (generic prone geometry, eye and hitboxes) and T36 (MG34 reload curve sample) are the only approved
// changes to src/world/spatial.js. Revert exactly those strings, each required to occur once; every other byte must
// still hash to the protected original in the guards that use this helper.
export const SPATIAL_PARTIALS_DELTA=[
  ["  const time=['fire_burst','reload'].includes(p.phase)?Math.max(0,Math.min(p.phase==='reload'?4.8:.525,(clock??p.startedAt)-p.startedAt)):0;\n",
   "  const time=p.phase==='fire_burst'?Math.max(0,Math.min(.525,(clock??p.startedAt)-p.startedAt)):0;\n"],
  ["export function genericProneGeometry(actor){\n  if(actor.posture!=='prone'||actor.mg34Prone)return null;\n  const low=actor.postureProgress??1,mix=(standing,prone)=>standing.map((v,i)=>v+(prone[i]-v)*low);\n  return {low,head:mix([0,1.6,0],[0,.26,-.8]),torso:mix([0,1.15,0],[0,.22,-.12]),legs:mix([0,.45,0],[0,.13,.67]),eye:mix([0,EYE_HEIGHT,0],[0,.34,-.8])};\n}\n",""],
  ["mg34ProneGeometry(actor)||genericProneGeometry(actor)?mg34LocalToWorld(actor,(mg34ProneGeometry(actor)??genericProneGeometry(actor)).eye)",
   "mg34ProneGeometry(actor)?mg34LocalToWorld(actor,mg34ProneGeometry(actor).eye)"],
  ["  const g=mg34ProneGeometry(actor)??genericProneGeometry(actor);\n","  const g=mg34ProneGeometry(actor);\n"],
];
export function spatialWithoutPartialsDelta(source){
  for(const [current,original]of SPATIAL_PARTIALS_DELTA){
    assert.equal(source.split(current).length,2,'approved spatial delta occurs exactly once');source=source.replace(current,()=>original);
  }
  return source;
}
