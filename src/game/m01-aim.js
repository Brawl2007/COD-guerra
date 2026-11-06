import { mg34ProneGeometry, genericProneGeometry, mg34LocalToWorld } from '../world/spatial.js';

/**
 * T38 (M01-COMBAT-POSTURE-STAGING-V1): where a shot at a man is aimed, for the gameplay bursts and attrition rounds (m01-simulation.js) and the
 * display tracers (m01-display-fire.js): the centre of the torso hitbox of the posture he is in (spatial.js actorHitboxes). Prone (T07 generic
 * prone, or an MG34 gunner) is the oriented prone torso; otherwise 1.1 m standing or 0.75 m crouched/kneeling above his feet, as before T38.
 * Pure function of the actor's data; no RNG, no writes.
 */
export function aimPoint(t){
  const g=mg34ProneGeometry(t)??genericProneGeometry(t);
  return g?mg34LocalToWorld(t,g.torso):{x:t.x,y:t.y+(t.crouched?.75:1.1),z:t.z};
}
