import { EYE_HEIGHT, UNITS_PER_METRE } from '../config.js';
import mg34Geometry from './m01-mg34-prone-geometry.json' with {type:'json'};

export const MG34_MUZZLE_SOCKET=Object.freeze([...mg34Geometry.socket]);
const mg34Gunner=a=>a.weapon==='mg34'&&['de_east_0','de_east_1'].includes(a.id);

// Canonical clip/frame selection belongs to persisted simulation state, even without optional GLBs.
export function mg34ProneSample(actor,clock){
  const p=actor.mg34Prone;if(!mg34Gunner(actor)||!p||!actor.alive)return null;
  const progress=clock===undefined?p.progress:Math.max(0,Math.min(1,(clock-p.startedAt)/p.duration));
  if(p.phase==='standing')return {clip:'mg34_aim',curve:'enter',time:0,low:0};
  if(p.phase==='enter')return {clip:'mg34_prone_enter',curve:'enter',time:progress*1.9,low:progress};
  if(p.phase==='exit'){
    const low=p.fromProgress*(1-progress);
    return p.fromProgress<1?{clip:'mg34_prone_enter',curve:'enter',time:low*1.9,low}:
      {clip:'mg34_prone_exit',curve:'exit',time:progress*1.9,low};
  }
  const time=p.phase==='fire_burst'?Math.max(0,Math.min(.525,(clock??p.startedAt)-p.startedAt)):0;
  return {clip:`mg34_prone_${p.phase}`,curve:p.phase,time,low:1};
}
export function mg34ProneGeometry(actor,clock){
  const sample=mg34ProneSample(actor,clock);if(!sample)return null;
  const rows=mg34Geometry.curves[sample.curve];
  let lo=0,hi=rows.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(rows[m][0]<=sample.time)lo=m;else hi=m;}
  const a=rows[lo],b=rows[hi],f=a===b?0:Math.max(0,Math.min(1,(sample.time-a[0])/(b[0]-a[0])));
  const v=a.slice(1).map((n,i)=>n+(b[i+1]-n)*f);
  return {...sample,muzzle:v.slice(0,3),eye:v.slice(3,6),head:v.slice(6,9),torso:v.slice(9,12),legs:v.slice(12,15)};
}
export function mg34LocalToWorld(actor,p){
  const facing=actor.facing??0,c=Math.cos(facing),s=Math.sin(facing);
  // Same transform as M01Characters: rotation.y = -facing - PI/2; model forward is -Z.
  return {x:actor.x-s*p[0]-c*p[2],y:actor.y+p[1],z:actor.z+c*p[0]-s*p[2]};
}

export const toScene = (point, height) => point.space==='metres'?
  ({x:point.x,y:height??point.y,z:point.z}):({x:point.x/UNITS_PER_METRE,y:height??0,z:point.y/UNITS_PER_METRE});
export const eyePosition = actor => mg34ProneGeometry(actor)?mg34LocalToWorld(actor,mg34ProneGeometry(actor).eye):toScene(actor, (actor.space==='metres'?actor.y:actor.feetHeight||0) +
  (actor.eyeHeight ?? (actor.crouched ? 1.08 : EYE_HEIGHT)));
export const aimDirection = (angle, pitch = 0) => ({
  x: Math.cos(angle) * Math.cos(pitch), y: Math.sin(pitch),
  z: Math.sin(angle) * Math.cos(pitch),
});
export const muzzlePosition = (player,clock) => {
  const geometry=mg34ProneGeometry(player,clock);if(geometry)return mg34LocalToWorld(player,geometry.muzzle);
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
  const g=mg34ProneGeometry(actor);
  if(g){
    const c=Math.abs(Math.cos(actor.facing??0)),s=Math.abs(Math.sin(actor.facing??0));
    return [['head',2,[.18,.20,.18],[.18,.16,.22]],['torso',1,[.29,.33,.23],[.25,.18,.38]],['legs',.7,[.25,.37,.20],[.27,.12,.48]]].map(([part,multiplier,standing,prone])=>{
      const local=[...g[part]];if(part==='head')local[1]+=.08;
      const p=mg34LocalToWorld(actor,local),half=standing.map((n,i)=>n+(prone[i]-n)*g.low);
      const hx=s*half[0]+c*half[2],hz=c*half[0]+s*half[2];
      return {part,multiplier,min:{x:p.x-hx,y:p.y-half[1],z:p.z-hz},max:{x:p.x+hx,y:p.y+half[1],z:p.z+hz}};
    });
  }
  const p = toScene(actor, actor.space==='metres'?actor.y:actor.feetHeight||0), crouch = actor.crouched ? .48 : 0;
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
  if(world.traceTerrain){
    const terrain=world.traceTerrain(origin,direction,range);
    if(terrain&&(!result||terrain.distance<result.distance))result=terrain;
  }else if (direction.y < -1e-9) {
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
