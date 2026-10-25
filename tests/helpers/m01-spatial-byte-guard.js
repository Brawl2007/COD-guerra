import assert from 'node:assert/strict';

// Reverse only the four explicitly approved T07/T36 hunks. Callers still hash every
// remaining byte against their immutable original lock, including all ray/slab code.
export function spatialPredecessorBytes(buffer){
  let source=buffer.toString('utf8');
  const edits=[
    ["  const time=['fire_burst','reload'].includes(p.phase)?Math.max(0,Math.min(p.phase==='reload'?4.8:.525,(clock??p.startedAt)-p.startedAt)):0;", "  const time=p.phase==='fire_burst'?Math.max(0,Math.min(.525,(clock??p.startedAt)-p.startedAt)):0;"],
    ["export function genericProneGeometry(actor){\n  if(actor.posture!=='prone'||actor.mg34Prone)return null;\n  const low=actor.postureProgress??1,mix=(standing,prone)=>standing.map((v,i)=>v+(prone[i]-v)*low);\n  return {low,head:mix([0,1.6,0],[0,.26,-.8]),torso:mix([0,1.15,0],[0,.22,-.12]),legs:mix([0,.45,0],[0,.13,.67]),eye:mix([0,EYE_HEIGHT,0],[0,.34,-.8])};\n}\n", ''],
    ['export const eyePosition = actor => mg34ProneGeometry(actor)||genericProneGeometry(actor)?mg34LocalToWorld(actor,(mg34ProneGeometry(actor)??genericProneGeometry(actor)).eye):toScene(actor,', 'export const eyePosition = actor => mg34ProneGeometry(actor)?mg34LocalToWorld(actor,mg34ProneGeometry(actor).eye):toScene(actor,'],
    ['  const g=mg34ProneGeometry(actor)??genericProneGeometry(actor);','  const g=mg34ProneGeometry(actor);']
  ];
  for(const [current,original]of edits){assert.equal(source.split(current).length,2,'approved spatial hunk must occur exactly once');source=source.replace(current,original);}
  return Buffer.from(source);
}
