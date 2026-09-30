import { EYE_HEIGHT, UNITS_PER_METRE } from '../config.js';

export const toScene = (point, height = 0) => ({
  x: point.x / UNITS_PER_METRE, y: height, z: point.y / UNITS_PER_METRE,
});
export const eyePosition = actor => toScene(actor, (actor.feetHeight || 0) +
  (actor.eyeHeight ?? (actor.crouched ? 1.08 : EYE_HEIGHT)));
export const aimDirection = (angle, pitch = 0) => ({
  x: Math.cos(angle) * Math.cos(pitch), y: Math.sin(pitch),
  z: Math.sin(angle) * Math.cos(pitch),
});
export const muzzlePosition = player => {
  const eye = eyePosition(player), dir = aimDirection(player.angle, player.pitch);
  const lateral=player.aiming?0:.2;
  return { x: eye.x + dir.x * 1.05 - Math.sin(player.angle) * lateral,
    y: eye.y + dir.y * 1.05 - (player.aiming?.1:.24),
    z: eye.z + dir.z * 1.05 + Math.cos(player.angle) * lateral };
};

// Slab intersection, in metres; returns the FIRST entry distance (including zero).
export function rayBox(origin, direction, min, max, limit = Infinity) {
  let near = 0, far = limit;
  for (const axis of ['x', 'y', 'z']) {
    if (Math.abs(direction[axis]) < 1e-9) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
    } else {
      const a = (min[axis] - origin[axis]) / direction[axis];
      const b = (max[axis] - origin[axis]) / direction[axis];
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) return null;
    }
  }
  return near <= limit && far >= 0 ? near : null;
}

export function actorHitboxes(actor) {
  const p = toScene(actor, actor.feetHeight || 0), crouch = actor.crouched ? .48 : 0;
  return [
    { part: 'head', multiplier: 2, min: { x: p.x-.18, y: p.y+1.48-crouch, z: p.z-.18 },
      max: { x: p.x+.18, y: p.y+1.88-crouch, z: p.z+.18 } },
    { part: 'torso', multiplier: 1, min: { x: p.x-.29, y: p.y+.82-crouch, z: p.z-.23 },
      max: { x: p.x+.29, y: p.y+1.48-crouch, z: p.z+.23 } },
    { part: 'legs', multiplier: .7, min: { x: p.x-.25, y: p.y+.08, z: p.z-.2 },
      max: { x: p.x+.25, y: p.y+.82-crouch, z: p.z+.2 } },
  ];
}

export function traceObstruction(world, origin, direction, range) {
  let result = null;
  for (const box of world.obstacles) {
    const distance = rayBox(origin, direction, box.min, box.max, range);
    if (distance !== null && (!result || distance < result.distance))
      result = { ...box, distance, kind: 'world' };
  }
  if (direction.y < -1e-9) {
    const distance = -origin.y / direction.y;
    if (distance >= 0 && distance <= range && (!result || distance < result.distance))
      result = { distance, kind: 'world', material: 'earth' };
  }
  return result;
}

export function visible(world, a, b) {
  const origin = eyePosition(a), destination = eyePosition(b);
  const distance = Math.hypot(destination.x-origin.x, destination.y-origin.y, destination.z-origin.z);
  if (distance < 1e-6) return true;
  const direction = { x: (destination.x-origin.x)/distance, y: (destination.y-origin.y)/distance,
    z: (destination.z-origin.z)/distance };
  return !traceObstruction(world, origin, direction, Math.max(0, distance-.02));
}

export function traceShot(world, origin, direction, actors, range, muzzle = null) {
  let hit = traceObstruction(world, origin, direction, range);
  for (const actor of actors) {
    if (!actor.alive || actor.active === false) continue;
    for (const box of actorHitboxes(actor)) {
      const distance = rayBox(origin, direction, box.min, box.max, range);
      if (distance !== null && (!hit || distance < hit.distance))
        hit = { distance, kind: 'actor', actor, part: box.part, multiplier: box.multiplier, material: 'character' };
    }
  }
  const d = hit?.distance ?? range;
  const point = { x: origin.x+direction.x*d, y: origin.y+direction.y*d, z: origin.z+direction.z*d };
  // Camera sees around a corner but a barrel behind that corner must not fire through it.
  if (muzzle) {
    const separation = Math.hypot(point.x-muzzle.x, point.y-muzzle.y, point.z-muzzle.z);
    if (separation > 1e-6) {
      const dir = { x: (point.x-muzzle.x)/separation, y: (point.y-muzzle.y)/separation,
        z: (point.z-muzzle.z)/separation };
      const blocked = traceObstruction(world, muzzle, dir, Math.max(0, separation-.02));
      if (blocked) return { ...blocked, point: { x: muzzle.x+dir.x*blocked.distance,
        y: muzzle.y+dir.y*blocked.distance, z: muzzle.z+dir.z*blocked.distance } };
    }
  }
  return hit ? { ...hit, point } : null;
}
