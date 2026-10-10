import { Random } from '../core/random.js';
import { makeRound } from './m01-fire.js';
import { eyePosition } from '../world/spatial.js';

// Display fire (roadmap T22): visual-only rounds for the distant firefight (tracers and muzzle flashes across Lisewo).
// They live in their own list, outside enemyFire.rounds and outside every save: they never trace the world, suppress,
// wound, emit an event or touch an actor, the player, the flags or the main RNG. validRound/ROUND_KINDS do not know them.
// For difficulty (H9) this means by construction: not a telegraph, not an aim/cadence multiplier target, not a burst to cap.
// Mission data supplies profiles in groups[].displayFire (none exist yet); a profile is, with every key but one target spec optional:
//   {id, shooters:[actorId..] | origin:[x,y,z], weapon, rounds:[min,max], intervalSec:[min,max], interval, tracerEvery,
//    bias:[mrad,mrad], cone:[mrad,mrad], targetGroup | targetIds:[..] | targetBox:[minX,maxX,minZ,maxZ], from, until}
// `weapon` is a display label that may differ from the actor's gameplay weapon; `from`/`until` are event ids (consumed gates).
export const DISPLAY_CAP = 120;            // rounds in flight; a burst that does not fit is skipped whole, never truncated
export const DISPLAY_TRACER_CAP = 24;      // tracer instances the renderer may spend, of its 48-instance batch (gameplay first)
export const DISPLAY_FLASH_SEC = .15;      // muzzle flash window after display.firedAt[actor]
export const READOUT_WINDOW_SEC = 20;      // "recent" for battleReadout
export const DISPLAY_SEED_XOR = 0x5bd1e995;
export const DISPLAY_KIND = 'display';

/** Separate RNG stream: construction uses the sim seed; a restore also mixes the 20 Hz clock tick so it never replays the original. */
export const displaySeed = (rngState, clock) =>
  (clock === undefined ? rngState ^ DISPLAY_SEED_XOR : rngState ^ DISPLAY_SEED_XOR ^ Math.floor(clock * 20)) >>> 0;

export const createDisplayFire = (seed, profiles = []) =>
  ({ rounds: [], nextId: 0, firedAt: {}, cooldown: {}, skipped: 0, profiles, rng: new Random(seed) });

const fail = (id, message) => { throw new Error(`displayFire ${id}: ${message}`); };
const pair = (id, name, v, { integer = false, min = 0 } = {}) => {
  if (!Array.isArray(v) || v.length !== 2 || !v.every(Number.isFinite) || v[0] < min || v[1] < v[0] || (integer && !v.every(Number.isInteger)))
    fail(id, `${name} must be [min,max]${integer ? ' of integers' : ''} with min >= ${min}`);
  return Object.freeze([...v]);
};
const idList = (id, name, v) => {
  if (!Array.isArray(v) || !v.length || !v.every(s => typeof s === 'string' && s)) fail(id, `${name} must be a non-empty list of ids`);
  return Object.freeze([...v]);
};
const numbers = (id, name, v, length, min = -Infinity) => {
  if (!Array.isArray(v) || v.length !== length || !v.every(n => Number.isFinite(n) && n >= min)) fail(id, `${name} must be ${length} finite numbers`);
  return Object.freeze([...v]);
};

/** Validates one authored profile and returns a frozen copy with defaults; `events` (a Set of event ids) is checked when given. */
export function normalizeDisplayProfile(p, { events } = {}) {
  const id = p?.id;
  if (typeof id !== 'string' || !id) fail('?', 'id must be a non-empty string');
  if ((p.shooters === undefined) === (p.origin === undefined)) fail(id, 'exactly one of shooters or origin');
  if (typeof p.weapon !== 'string' || !p.weapon) fail(id, 'weapon must be a string');
  if (['targetGroup', 'targetIds', 'targetBox'].filter(k => p[k] !== undefined).length !== 1) fail(id, 'exactly one of targetGroup, targetIds or targetBox');
  const interval = p.interval ?? .075, tracerEvery = p.tracerEvery ?? 0;
  if (!Number.isFinite(interval) || interval <= 0) fail(id, 'interval must be > 0');
  if (!Number.isInteger(tracerEvery) || tracerEvery < 0) fail(id, 'tracerEvery must be an integer >= 0');
  for (const key of ['from', 'until']) if (p[key] !== undefined && (typeof p[key] !== 'string' || (events && !events.has(p[key])))) fail(id, `${key} must be a known event id`);
  const rounds = pair(id, 'rounds', p.rounds, { integer: true, min: 1 });
  if (rounds[1] > 30) fail(id, 'rounds must not exceed 30 per burst');
  const box = p.targetBox === undefined ? null : numbers(id, 'targetBox', p.targetBox, 4);
  if (box && (box[0] > box[1] || box[2] > box[3])) fail(id, 'targetBox must be [minX,maxX,minZ,maxZ]');
  if (p.targetGroup !== undefined && (typeof p.targetGroup !== 'string' || !p.targetGroup)) fail(id, 'targetGroup must be a group id');
  return Object.freeze({
    id, weapon: p.weapon, rounds, intervalSec: pair(id, 'intervalSec', p.intervalSec, { min: .05 }), interval, tracerEvery,
    bias: numbers(id, 'bias', p.bias ?? [2, 1.4], 2, 0), cone: numbers(id, 'cone', p.cone ?? [.7, .5], 2, 0), from: p.from, until: p.until,
    ...(p.shooters ? { shooters: idList(id, 'shooters', p.shooters) } : { origin: numbers(id, 'origin', p.origin, 3) }),
    ...(p.targetGroup !== undefined ? { targetGroup: p.targetGroup } : {}), ...(p.targetIds !== undefined ? { targetIds: idList(id, 'targetIds', p.targetIds) } : {}),
    ...(box ? { targetBox: box } : {}),
  });
}

/** Every profile authored in the mission data (groups[].displayFire); an empty list while no data exists. */
export function displayProfiles(definition) {
  const events = new Set(definition.events.map(e => e.id)), seen = new Set(), profiles = [];
  for (const group of definition.groups) for (const raw of group.displayFire ?? []) {
    const profile = normalizeDisplayProfile(raw, { events });
    if (seen.has(profile.id)) fail(profile.id, 'duplicate profile id');
    seen.add(profile.id); profiles.push(profile);
  }
  return profiles;
}

const gauss = rng => { let u = 0; while (u <= 1e-12) u = rng.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next()); };
const draw = (rng, [lo, hi]) => lo + rng.next() * (hi - lo);
const gone = ['DOWN', 'WOUNDED', 'reached_safety'];
const eligible = (a, now) => Boolean(a && a.alive && a.active && !a.carriedBy && !gone.includes(a.state) && now >= (a.suppressedUntil ?? 0));
const open = (p, view) => (!p.from || view.consumedEvent(p.from)) && (!p.until || !view.consumedEvent(p.until));

/** Same aim point rule as the gameplay burst (chest height of a standing or crouched man, one metre above ground for a box). */
function target(display, view, p, byId) {
  const r = () => display.rng.next();
  if (p.targetBox) {
    const [x0, x1, z0, z1] = p.targetBox, x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    return { x, y: view.heightAt(x, z) + 1, z };
  }
  const pool = (p.targetGroup ? view.actors.filter(a => a.group === p.targetGroup) : p.targetIds.map(id => byId.get(id))).filter(a => a?.alive && a.active);
  if (!pool.length) return null;
  const t = pool[Math.floor(r() * pool.length)];
  return { x: t.x, y: t.y + (t.crouched ? .75 : 1.1), z: t.z };
}

/** One burst. Draw order is fixed: count, target, shared dispersion, per-round dispersion. A burst without a target or without room fires nothing. */
function burst(display, view, p, who, actor, byId) {
  const now = view.clock, count = p.rounds[0] + Math.floor(display.rng.next() * (p.rounds[1] - p.rounds[0] + 1));
  const aim = target(display, view, p, byId);
  if (!aim) return;
  if (display.rounds.length + count > DISPLAY_CAP) { display.skipped++; return; }
  const origin = actor ? eyePosition(actor) : { x: p.origin[0], y: p.origin[1], z: p.origin[2] };
  const shared = [p.bias[0] * gauss(display.rng), p.bias[1] * gauss(display.rng)];
  for (let k = 0; k < count; k++)
    display.rounds.push(Object.freeze(makeRound({ id: `m01_display_${display.nextId++}`, by: who, weapon: p.weapon, kind: DISPLAY_KIND, origin, aim,
      firedAt: now + k * p.interval, bias: shared, cone: p.cone, gauss: () => gauss(display.rng),
      tracer: p.tracerEvery > 0 && (k + 1) % p.tracerEvery === 0 })));
}

/**
 * Advances the display list by one simulation tick. `view` is read-only: {clock, actors, consumedEvent(id), heightAt(x,z)}.
 * Writes only display.* (rounds, firedAt, cooldown, nextId, skipped, rng); never an actor, `view` or the main RNG.
 */
export function updateDisplayFire(display, view, dt) {
  const now = view.clock;
  const flash = r => { if (r.firedAt <= now && r.firedAt > (display.firedAt[r.by] ?? -Infinity)) display.firedAt[r.by] = r.firedAt; };
  if (display.rounds.length) { display.rounds.forEach(flash); display.rounds = display.rounds.filter(r => r.arriveAt > now); }   // arrival: nothing happens
  let byId = null;
  for (const p of display.profiles) {
    if (!open(p, view)) continue;
    byId ??= new Map(view.actors.map(a => [a.id, a]));
    for (const who of p.shooters ?? [p.id]) {
      const key = `${p.id}/${who}`, actor = p.shooters ? byId.get(who) : null;
      if (p.shooters && !eligible(actor, now)) { delete display.cooldown[key]; continue; }
      display.cooldown[key] ??= draw(display.rng, p.intervalSec);   // staggered first burst after (re)activation
      if ((display.cooldown[key] -= dt) > 0) continue;
      display.cooldown[key] = draw(display.rng, p.intervalSec);
      const before = display.rounds.length;
      burst(display, view, p, who, actor, byId);
      for (let i = before; i < display.rounds.length; i++) flash(display.rounds[i]);
    }
  }
}

/** Read-only copy for the renderer and the tests: the rounds are frozen at creation, the containers are fresh. */
export const displayFireView = display =>
  ({ rounds: [...display.rounds], firedAt: { ...display.firedAt }, skipped: display.skipped, nextId: display.nextId });

/**
 * Computed on every read (like `threat`), never stored. Sector membership comes from mission data (groups[].sector, and a group's
 * members). `shooters` = living active men of the sector, `casualties` = its fallen men, `lastFireAt` = latest gameplay or display
 * shot (simulation clock), `intensity` = share of the sector's shooters that fired in the last READOUT_WINDOW_SEC seconds (0..1).
 * Shots are not logged anywhere, so intensity counts shooters that fired recently, not rounds.
 * `view` is the simulation read only: definition, clock, battleClock, actors, flags, mission, scene, sectors, consumedEvent.
 */
export function computeBattleReadout(display, view) {
  const now = view.clock, bySector = {}, ofGroup = new Map(), ofMember = new Map(), consumed = id => view.consumedEvent(`evt_m01_${id}`);
  for (const g of view.definition.groups) if (g.sector) { ofGroup.set(g.id, g.sector); for (const m of g.members ?? []) ofMember.set(m, g.sector); }
  for (const s of view.definition.sectors)
    bySector[s.id] = { state: view.sectors.sectors.find(x => x.id === s.id)?.state ?? null, shooters: 0, casualties: 0, lastFireAt: null, intensity: 0 };
  const recent = {};
  for (const a of view.actors) {
    const sector = ofGroup.get(a.group) ?? ofMember.get(a.id), e = bySector[sector];
    if (!e) continue;
    const live = a.alive && a.active;
    if (live) e.shooters++; else if (!a.alive) e.casualties++;
    const last = Math.max(Number.isFinite(a.firedAt) && a.firedAt > -1e8 ? a.firedAt : -Infinity, display.firedAt[a.id] ?? -Infinity);
    if (last > -Infinity) {
      e.lastFireAt = Math.max(e.lastFireAt ?? -Infinity, last);
      if (live && last <= now && now - last <= READOUT_WINDOW_SEC) recent[sector] = (recent[sector] ?? 0) + 1;
    }
  }
  for (const [id, e] of Object.entries(bySector)) e.intensity = e.shooters ? Math.min(1, (recent[id] ?? 0) / e.shooters) : 0;
  return {
    clock: now, battleClock: view.battleClock, phase: view.mission.phase, scene: view.scene?.id ?? null,
    flags: { raid: view.flags['m01.second_raid_state'] === 'active', stukas: consumed('planes_heard') && !consumed('second_air_pass'),
      train963: consumed('train963_arrives'), panzerzug: consumed('panzerzug_arrives') },
    sectors: bySector,
    recentBlasts: view.sectors.damage.filter(d => d.started <= now && now - d.started <= READOUT_WINDOW_SEC)
      .map(d => ({ id: d.id, x: d.x, y: d.y, z: d.z, started: d.started, soundAt: d.soundAt, age: now - d.started })),
  };
}
