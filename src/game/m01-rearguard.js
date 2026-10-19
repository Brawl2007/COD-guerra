// M01 combat slice 2b, the Polish rearguard of the deck assault (slice-2 critical review: for a passive or hidden player the ckm and Kowal see none of the deck, and
// no Polish round reached it while the clock was held at 06:09:30). Mission data only (missions/m01-tczew/mission.json, grp_east_platoon.rearguard), validated when
// the module loads so a typo stops the game instead of changing it.
// The simulation (src/game/m01-simulation.js) owns the state: each man of the rearguard gets, the tick the east demolition's gate starts holding the clock for the deck,
// a saved record `rear` {v, phase, since} and a combat AI stream `ai` (slice 1);
// his clip is the ordinary actor clip (`rounds`, `reload`: 5 rounds, 3.4 s, refilled by the presentation step as for every rifleman). Nothing here draws a random number, reads a clock or moves anybody.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };

/** Version of the saved rearguard record. A save without records keeps the old withdrawal for these men. */
export const REARGUARD_VERSION=1;
/** post: walking to his place; hold: kneeling there, firing; released: the deck is clear, he has gone back to the withdrawal (terminal, so he never forms again). */
export const REARGUARD_PHASES=Object.freeze(['post','hold','released']);
export const REARGUARD_KEYS=Object.freeze(['v','phase','since']);

export function rearguardPlan(def=definition){
  const fail=m=>{throw new Error(`M01 rearguard: ${m}`);};
  const g=def.groups.find(x=>x.id==='grp_east_platoon'),r=g?.rearguard;if(!r)fail('grp_east_platoon.rearguard missing');
  const num=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
  if(r.version!==REARGUARD_VERSION)fail('version');
  if(def.events.find(e=>e.id===r.from)?.trigger?.type!=='battleClock')fail('from must be a battleClock event');
  // Never a victim of the 20 s rule: its victim is pl_east_{n-1} with n >= survivorsRange[0], so only men below survivorsRange[0] - 1 qualify.
  const floor=g.survivorsRange?.[0];
  if(!Array.isArray(r.men)||!r.men.length||new Set(r.men).size!==r.men.length||!r.men.every(id=>/^pl_east_\d+$/.test(id)&&Number(id.slice(8))<floor))fail('men: pl_east_* below the survivors floor');
  // On the road deck between the girders (body off both: z 37.6-42.4), outside the deck post (HOLD_AREA maxX 160) and west of the blown spans 06-07 (x >= 663).
  if(!Array.isArray(r.posts)||r.posts.length!==r.men.length||!r.posts.every(p=>Array.isArray(p)&&p.length===2&&num(p[0],161,400)&&num(p[1],37.6,42.4)))fail('posts: one deck place per man, x 161-400');
  for(let i=0;i<r.posts.length;i++)for(let k=0;k<i;k++)if(Math.hypot(r.posts[i][0]-r.posts[k][0],r.posts[i][1]-r.posts[k][1])<1.3)fail('posts at least 1.3 m apart');
  if(!num(r.joinWithinM,0,100)||!num(r.runSpeed,2,7))fail('joinWithinM / runSpeed');
  const f=r.fire;
  if(!f||f.weapon!=='kb_wz29'||!num(f.pauseSec,2,30)||!Array.isArray(f.sigmaMil)||f.sigmaMil.length!==2||
    !f.sigmaMil.every(v=>num(v,.1,20))||!num(f.clearanceM,.5,5)||!num(f.headroomM,0,1)||!num(f.rangeM,100,1200)||!num(f.riseBeforeSec,.1,3)||!num(f.holdAfterSec,.1,3))fail('fire');
  return Object.freeze({version:r.version,from:r.from,men:Object.freeze([...r.men]),posts:Object.freeze(r.posts.map(([x,z])=>Object.freeze({x,z}))),
    joinWithinM:r.joinWithinM,runSpeed:r.runSpeed,fire:Object.freeze({...f,sigmaMil:Object.freeze([...f.sigmaMil])})});
}
export const REARGUARD=rearguardPlan();
/** The rearguard index of a man (0..), or -1. */
export const rearguardIndex=a=>REARGUARD.men.indexOf(a.id);
/** His place on the deck. */
export const rearguardPost=a=>REARGUARD.posts[rearguardIndex(a)];
/** A saved rearguard record: the exact keys, a known phase, a time the machine could have written. Pure check, for the validator. */
export function validRearguardRecord(a,clock){
  const r=a.rear;
  if(rearguardIndex(a)<0||!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==REARGUARD_KEYS.length||REARGUARD_KEYS.some(k=>!Object.hasOwn(r,k)))return false;
  return r.v===REARGUARD_VERSION&&REARGUARD_PHASES.includes(r.phase)&&Number.isFinite(r.since)&&r.since>=0&&r.since<=clock;
}
