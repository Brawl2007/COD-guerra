// M01 retreat places (R3-a review, 2026-10-25; golden amendment 19). After the east demolition the section's men who are not on a fire team's bound (m01-squad.js), the ckm crew (its own
// finals below) or a civilian all walked to one point, x -170, z 22. A walker stops 0.8 m short of his goal (walkStraight) and moveActor pushes nobody apart inside those 0.8 m, so they all
// ended within 0.5-1.2 m of that point and of one another (the sergeant, the sappers, the ckm gunner: a pile); the sergeant, in the middle of it, could not get out of it to fetch the player
// (README §7 of docs/verification/m01-runtime/sappers-r3a-2026-10-24). Now each of them has a place of his own near the same point, on the open ground west of the squad's rally slots,
// kneeling facing the river on arrival. The places are mission data (mission.json `retreat`), validated when the module loads (a typo stops the game, like the other plans).
// Pure data and pure functions: nothing here is saved, nothing reads the clock or draws from a random stream; a save made during the retreat goes on to the same places.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import { SQUAD, SQUAD_IDS } from './m01-squad.js';

/** The old retreat point of every ally: the first place of the ckm crew's diagonal, and where a man without a place of his own still goes. */
export const RETREAT_POINT = Object.freeze({ x: -170, z: 22 });
/** Where man `i` of the ckm crew (CKM_IDS order) ends his retreat (T47): a diagonal of the embankment between the bridges, 2 m apart, the first on the retreat point. */
export const ckmFinal = i => ({ x: -170 - i * 1.6, z: 22 + i * 1.2 });
const CKM_FINAL_COUNT = 3;
/** The least distance between two places of the retreat (the CROWD_NEAR of moveActor, 2.5 m, plus a hand): a man who stops 0.8 m short of his place still stands clear of the next one. */
export const RETREAT_GAP_M = 2.6;
/** The farthest a place may be from the retreat point: the section withdraws to one place, it does not scatter along the embankment. */
export const RETREAT_REACH_M = 8;

/**
 * The retreat of mission.json (`retreat`), validated: one place [x, z, facing] for every non-civilian man of the cast who has a body in the world and no post of his own (not the player,
 * Nowicki - gone with the bomb that cuts the cable - the station patient, the fire teams and the ckm crew), each within RETREAT_REACH_M of the retreat point and RETREAT_GAP_M from every
 * other place, from the ckm finals and from the squad's rally slots. Returns the frozen plan.
 */
export function retreatPlan(def = definition) {
  const fail = m => { throw new Error(`M01 retreat: ${m}`); }, r = def.retreat, finite = (v, n) => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
  if (!r || r.classification !== 'GAMEPLAY_DRAMATIZATION') fail('classification');
  if (!finite(r.point, 2) || r.point[0] !== RETREAT_POINT.x || r.point[1] !== RETREAT_POINT.z) fail('point: the old retreat point (-170, 22)');
  const exempt = new Set(['jan_wrona', 'tadeusz_nowicki', 'generic_rifleman', ...SQUAD_IDS]);
  const need = def.cast.filter(c => c.role !== 'CIVILIAN' && !c.voiceOnly && !exempt.has(c.id)).map(c => c.id).sort();
  const ids = Object.keys(r.slots ?? {}).sort();
  if (ids.length !== need.length || ids.some((id, i) => id !== need[i])) fail(`slots: exactly ${need.join(', ')}`);
  const slots = {};
  for (const id of ids) {
    const s = r.slots[id];
    if (!finite(s, 3)) fail(`${id}: a slot [x, z, facing]`);
    if (Math.hypot(s[0] - RETREAT_POINT.x, s[1] - RETREAT_POINT.z) > RETREAT_REACH_M) fail(`${id}: more than ${RETREAT_REACH_M} m from the retreat point`);
    slots[id] = Object.freeze({ x: s[0], z: s[1], facing: s[2] });
  }
  const taken = [...Array.from({ length: CKM_FINAL_COUNT }, (_, i) => ['ckm final ' + i, ckmFinal(i)]),
    ...Object.entries(SQUAD.posts[2].slots).map(([id, [x, z]]) => [`${id} at the rally`, { x, z }])];
  for (const id of ids) {
    for (const [name, p] of taken) if (Math.hypot(slots[id].x - p.x, slots[id].z - p.z) < RETREAT_GAP_M) fail(`${id} is closer than ${RETREAT_GAP_M} m to ${name}`);
    for (const other of ids) if (id < other && Math.hypot(slots[id].x - slots[other].x, slots[id].z - slots[other].z) < RETREAT_GAP_M) fail(`${id} and ${other} are closer than ${RETREAT_GAP_M} m`);
  }
  return Object.freeze({ point: RETREAT_POINT, slots: Object.freeze(slots) });
}
export const RETREAT = retreatPlan();
/** The place of man `id` in the retreat, or the old retreat point for a man the plan does not know (the roster is closed: retreatPlan names every man who can need one). */
export const retreatSlot = id => RETREAT.slots[id] ?? RETREAT_POINT;
