/** Isolated data-only prototype. No production save or runtime imports except RNG. */
import { Random } from '../../src/core/random.js';
export const CLASSIFICATIONS = ['CONFIRMED', 'RECONSTRUCTED', 'COMPRESSED_FOR_GAMEPLAY', 'FICTIONAL_WITHIN_HISTORICAL_CONSTRAINTS'];
export const POLICIES = ['HISTORICAL_FIXED', 'HISTORICAL_BOUNDED', 'DYNAMIC_LOCAL'];
export const STATES = ['staging', 'advancing', 'holding', 'suppressing', 'withdrawing', 'retreating', 'reorganizing', 'routed', 'inactive'];
export const STATUSES = ['combatReady', 'wounded', 'dead', 'evacuated'];
const copy = value => structuredClone(value);
const requireThat = (ok, message) => { if (!ok) throw new Error(message); };
const integer = n => Number.isSafeInteger(n) && n >= 0;
const point = p => p && ['x', 'y', 'z'].every(k => Number.isFinite(p[k]));
const fraction = n => Number.isFinite(n) && n >= 0 && n <= 1;
const order = (a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const hash = text => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const memberId = (f, ordinal) => f.namedIds[ordinal] ?? `${f.id}/soldier/${ordinal}`;
export function counts(f) {
  const result = Object.fromEntries(STATUSES.map(s => [s, 0]));
  for (const r of f.runs) result[r.status] += r.to - r.from;
  return result;
}
function statusAt(f, ordinal) { return f.runs.find(r => ordinal >= r.from && ordinal < r.to)?.status; }
function memberPosition(f, ordinal) {
  const status = statusAt(f, ordinal), individual = f.individuals[ordinal];
  if (individual) {
    const delta = status === 'combatReady' ? { x: f.position.x - individual.anchor.x,
      y: f.position.y - individual.anchor.y, z: f.position.z - individual.anchor.z } : { x: 0, y: 0, z: 0 };
    return { x: individual.position.x + delta.x, y: individual.position.y + delta.y, z: individual.position.z + delta.z };
  }
  const anchor = status === 'combatReady' ? f.position : f.initialPosition;
  // Fixture layout only: renderer integration must use validated world placement.
  return { x: anchor.x + ordinal % 4 * 2, y: anchor.y, z: anchor.z + Math.floor(ordinal / 4) * 2 };
}
function setStatus(f, ordinal, status) {
  const next = [];
  for (const r of f.runs) {
    if (ordinal < r.from || ordinal >= r.to) next.push(r);
    else {
      if (r.from < ordinal) next.push({ ...r, to: ordinal });
      next.push({ from: ordinal, to: ordinal + 1, status });
      if (ordinal + 1 < r.to) next.push({ ...r, from: ordinal + 1 });
    }
  }
  f.runs = [];
  for (const r of next) {
    const prev = f.runs.at(-1);
    if (prev?.status === r.status && prev.to === r.from) prev.to = r.to;
    else f.runs.push(r);
  }
}
function ordinalFor(f, id) {
  const named = Object.entries(f.namedIds).find(([, value]) => value === id);
  if (named) return Number(named[0]);
  const prefix = `${f.id}/soldier/`;
  if (typeof id !== 'string' || !id.startsWith(prefix)) return -1;
  const n = Number(id.slice(prefix.length));
  return integer(n) && n < f.nominalStrength && memberId(f, n) === id ? n : -1;
}
function makeFormation(data) {
  requireThat(typeof data.id === 'string' && data.id.length > 0 && !data.id.includes('/'), 'formation id');
  requireThat(typeof data.faction === 'string' && data.faction && typeof data.role === 'string', 'formation identity');
  requireThat(point(data.position) && Number.isFinite(data.direction) && STATES.includes(data.state), 'formation position/state');
  requireThat(integer(data.nominalStrength) && data.nominalStrength > 0, 'nominalStrength');
  const initial = data.initial ?? { combatReady: data.nominalStrength };
  requireThat(Object.keys(initial).every(s => STATUSES.includes(s)) && Object.values(initial).every(integer), 'initial statuses');
  requireThat(Object.values(initial).reduce((a, b) => a + b, 0) === data.nominalStrength, 'strength conservation');
  const runs = []; let cursor = 0;
  for (const status of STATUSES) { const n = initial[status] ?? 0; if (n) runs.push({ from: cursor, to: cursor + n, status }); cursor += n; }
  const namedIds = data.namedIds ?? {};
  requireThat(Object.entries(namedIds).every(([n, id]) => integer(Number(n)) && String(Number(n)) === n && Number(n) < cursor && typeof id === 'string' && id.length && !id.includes('/')), 'named ID');
  requireThat(new Set(Object.values(namedIds)).size === Object.values(namedIds).length, 'duplicate named ID');
  requireThat(fraction(data.morale ?? 1) && fraction(data.cohesion ?? 1) && fraction(data.supply ?? 1), 'formation resources');
  requireThat(integer(data.ammunition ?? 100) && Number.isFinite(data.speedMps ?? 0) && (data.speedMps ?? 0) >= 0, 'ammunition/speed');
  return { id: data.id, faction: data.faction, unit: data.unit ?? null, role: data.role,
    nominalStrength: cursor, runs, namedIds: copy(namedIds), individuals: {},
    position: copy(data.position), initialPosition: copy(data.position), motion: { origin: copy(data.position), at: 0 }, direction: data.direction,
    speedMps: data.speedMps ?? 0, objective: data.objective ?? 'hold', state: data.state,
    morale: data.morale ?? 1, cohesion: data.cohesion ?? 1, ammunition: data.ammunition ?? 100, supply: data.supply ?? 1 };
}
function moveTo(sector, at) {
  for (const f of sector.formations) {
    const speed = ['advancing', 'withdrawing', 'retreating'].includes(f.state) ? f.speedMps : 0;
    const d = speed * (at - f.motion.at) / 1000;
    f.position = { x: f.motion.origin.x + Math.cos(f.direction) * d,
      y: f.motion.origin.y, z: f.motion.origin.z + Math.sin(f.direction) * d };
  }
  sector.updatedAt = at;
}
function changeOrder(f, state, at, direction) {
  f.motion = { origin: copy(f.position), at }; f.state = state;
  if (direction !== undefined) f.direction = direction;
}
function findFormation(sector, id) {
  const f = sector.formations.find(f => f.id === id); requireThat(f, 'unknown formation'); return f;
}
function loss(sector, f, ordinal, to) {
  const previous = statusAt(f, ordinal), c = counts(f), bounds = sector.constraints.formations?.[f.id] ?? {};
  requireThat(previous, 'unknown member');
  requireThat(to === 'dead' || to === 'wounded' || to === 'evacuated', 'loss status');
  if (previous === to) return { applied: false, reason: 'already-recorded' };
  requireThat(previous !== 'dead' && previous !== 'evacuated', 'terminal member');
  requireThat(to !== 'evacuated' || previous === 'wounded', 'rescue requires wounded');
  requireThat(to !== 'wounded' || previous === 'combatReady', 'invalid wound');
  if (to === 'dead' && c.dead >= (bounds.maxDead ?? f.nominalStrength)) return { applied: false, reason: 'maxDead' };
  if (previous === 'combatReady' && c.combatReady <= (bounds.minCombatReady ?? 0)) return { applied: false, reason: 'minCombatReady' };
  const position = memberPosition(f, ordinal), rounds = f.individuals[ordinal]?.rounds ?? 5;
  setStatus(f, ordinal, to);
  f.individuals[ordinal] = { position, rounds, anchor: copy(f.position) };
  return { applied: true, memberId: memberId(f, ordinal), ordinal, from: previous, to };
}
const ASSET_FIELDS = ['fixedWeapons', 'vehicles', 'destruction', 'fires', 'smoke'];
const ASSET_STATES = ['intact', 'active', 'damaged', 'destroyed', 'burning', 'extinguished', 'inactive'];

export class BattleWorld {
  constructor(config) {
    requireThat(integer(config.seed) && config.seed <= 0xffffffff && Array.isArray(config.sectors) && config.sectors.length, 'world config');
    this.config = { ...copy(config), events: [] }; this.time = 0; this.journal = []; this.consumed = [];
    this.sectors = config.sectors.map(s => {
      requireThat(typeof s.id === 'string' && s.id && typeof s.missionId === 'string', 'sector identity');
      requireThat(CLASSIFICATIONS.includes(s.provenance?.classification) && typeof s.provenance.date === 'string' && typeof s.provenance.startTime === 'string' && Array.isArray(s.provenance.claims), 'provenance');
      requireThat(point(s.center) && s.bounds && ['minX', 'maxX', 'minZ', 'maxZ'].every(k => Number.isFinite(s.bounds[k])) && s.bounds.minX <= s.bounds.maxX && s.bounds.minZ <= s.bounds.maxZ, 'sector geometry');
      requireThat(STATES.includes(s.state) && POLICIES.includes(s.constraints?.policy), 'sector state/policy');
      requireThat(Array.isArray(s.formations) && s.formations.length, 'formations');
      const formations = s.formations.map(makeFormation);
      requireThat(new Set(formations.map(f => f.id)).size === formations.length, 'duplicate formation');
      const assets = Object.fromEntries(ASSET_FIELDS.map(k => [k, copy(s.assets?.[k] ?? [])]));
      const ids = Object.values(assets).flat().map(a => a.id);
      requireThat(new Set(ids).size === ids.length && Object.values(assets).flat().every(a => typeof a.id === 'string' && a.id && point(a.position) && ASSET_STATES.includes(a.state)), 'assets');
      for (const [id, b] of Object.entries(s.constraints.formations ?? {})) {
        const f = formations.find(f => f.id === id); requireThat(f && integer(b.minCombatReady ?? 0) && integer(b.maxDead ?? f.nominalStrength) && (b.minCombatReady ?? 0) <= counts(f).combatReady && (b.maxDead ?? f.nominalStrength) >= counts(f).dead && (b.maxDead ?? f.nominalStrength) <= f.nominalStrength, 'historical bounds');
      }
      return { id: s.id, missionId: s.missionId, provenance: copy(s.provenance), center: copy(s.center), bounds: copy(s.bounds),
        state: s.state, objective: s.objective ?? 'hold', formations, assets, constraints: copy(s.constraints),
        rng: (config.seed ^ hash(s.id)) >>> 0, revision: 0, updatedAt: 0 };
    }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    requireThat(new Set(this.sectors.map(s => s.id)).size === this.sectors.length, 'duplicate sector');
    const allFormations = this.sectors.flatMap(s => s.formations);
    requireThat(new Set(allFormations.map(f => f.id)).size === allFormations.length, 'formation IDs must be world unique');
    const named = allFormations.flatMap(f => Object.values(f.namedIds));
    requireThat(new Set(named).size === named.length, 'named IDs must be world unique');
    this.agenda = [];
    for (const e of config.events ?? []) this.enqueue(e);
  }
  sector(id) { const s = this.sectors.find(s => s.id === id); requireThat(s, 'unknown sector'); return s; }
  enqueue(event) {
    requireThat(typeof event.id === 'string' && event.id && integer(event.at) && event.at >= this.time, 'event identity/time');
    requireThat(!this.agenda.some(e => e.id === event.id) && !this.consumed.includes(event.id), 'duplicate event');
    const last = this.journal.at(-1);
    requireThat(!last || order(event, last) > 0, 'input would reorder consumed history');
    this.sector(event.sectorId); this.validateAction(event);
    this.agenda.push(copy(event)); this.agenda.sort(order);
    this.config.events.push(copy(event));
  }
  validateAction(e) {
    requireThat(['order', 'exposure', 'loss', 'rescue', 'resupply', 'asset', 'intervention', 'handoff'].includes(e.type), 'event type');
    const s = this.sector(e.sectorId);
    if (['order', 'exposure', 'loss', 'rescue', 'resupply', 'handoff'].includes(e.type)) findFormation(s, e.formationId);
    if (e.type === 'order' || e.type === 'intervention') requireThat(STATES.includes(e.state) && (e.direction === undefined || Number.isFinite(e.direction)), 'order state');
    if (e.type === 'order') requireThat(typeof e.objective === 'string', 'order objective');
    if (e.type === 'exposure') requireThat(Number.isFinite(e.ratePerSecond) && e.ratePerSecond >= 0 && integer(e.durationMs) && fraction(e.cover) && fraction(e.suppression) && fraction(e.firepower) && fraction(e.fatalFraction) &&
      (e.weaponId === undefined || s.assets.fixedWeapons.some(a => a.id === e.weaponId)), 'exposure context');
    if (e.type === 'loss') requireThat(['wounded', 'dead'].includes(e.to) && (e.memberId !== undefined || integer(e.ordinal)), 'loss payload');
    if (e.type === 'rescue') requireThat(integer(e.amount) && e.amount > 0, 'rescue amount');
    if (e.type === 'resupply') requireThat(integer(e.amount), 'resupply amount');
    if (e.type === 'asset') requireThat(ASSET_FIELDS.includes(e.category) && s.assets[e.category].some(a => a.id === e.assetId) && ASSET_STATES.includes(e.state), 'asset payload');
    if (e.type === 'handoff') requireThat(integer(e.expectedRevision) && integer(e.expectedTime) && Array.isArray(e.members) && e.members.every(m => typeof m.id === 'string' && STATUSES.includes(m.status) && point(m.position) && integer(m.rounds)) && new Set(e.members.map(m => m.id)).size === e.members.length &&
      (e.formationPosition === undefined || point(e.formationPosition)) && (e.reserveAmmunition === undefined || integer(e.reserveAmmunition)), 'handoff payload');
  }
  apply(s, e) {
    if (e.type === 'order') {
      s.state = e.state; s.objective = e.objective;
      const f = findFormation(s, e.formationId); f.objective = e.objective;
      changeOrder(f, e.state, e.at, e.direction);
      return { state: s.state, objective: s.objective };
    }
    if (e.type === 'intervention') {
      if (s.constraints.policy !== 'DYNAMIC_LOCAL') return { applied: false, reason: 'historical-macro-locked' };
      s.state = e.state;
      for (const f of s.formations) changeOrder(f, e.state, e.at, e.direction);
      return { applied: true, state: s.state };
    }
    if (e.type === 'asset') {
      const a = s.assets[e.category].find(a => a.id === e.assetId);
      requireThat(a.state !== 'destroyed' || e.state === 'destroyed', 'asset resurrection');
      requireThat(a.state !== 'damaged' || !['intact', 'active'].includes(e.state), 'asset repair requires separate contract');
      a.state = e.state; a.changedAt = e.at;
      return { assetId: a.id, state: a.state, position: copy(a.position), ...(a.origin ? { origin: copy(a.origin) } : {}) };
    }
    const f = findFormation(s, e.formationId);
    if (e.type === 'resupply') {
      requireThat(integer(f.ammunition + e.amount), 'ammunition overflow');
      f.ammunition += e.amount; return { ammunition: f.ammunition };
    }
    if (e.type === 'rescue') {
      const rescued = [];
      for (let i = 0; i < e.amount; i++) {
        const r = f.runs.find(r => r.status === 'wounded'); if (!r) break;
        rescued.push(loss(s, f, r.from, 'evacuated'));
      }
      return { rescued };
    }
    if (e.type === 'loss') return loss(s, f, e.memberId === undefined ? e.ordinal : ordinalFor(f, e.memberId), e.to);
    if (e.type === 'handoff') {
      requireThat(e.expectedRevision === s.revision, 'stale handoff');
      requireThat(e.expectedTime === s.updatedAt, 'stale handoff time');
      const reserveBefore = f.ammunition;
      if (e.reserveAmmunition !== undefined) {
        requireThat(e.reserveAmmunition <= f.ammunition, 'unrecorded resupply'); f.ammunition = e.reserveAmmunition;
      }
      const extraLoadedRounds = e.members.reduce((n, m) => {
        const ordinal = ordinalFor(f, m.id); requireThat(ordinal >= 0, 'unknown member');
        return n + Math.max(0, m.rounds - (f.individuals[ordinal]?.rounds ?? 5));
      }, 0);
      requireThat(extraLoadedRounds <= reserveBefore - f.ammunition, 'loaded ammunition requires reserve transfer');
      // Called on a cloned sector: any invalid member rejects the entire return.
      const result = [];
      if (e.formationPosition) {
        f.position = copy(e.formationPosition); f.motion = { origin: copy(f.position), at: e.at };
      }
      for (const m of e.members) {
        const n = ordinalFor(f, m.id); requireThat(n >= 0, 'unknown member');
        const old = statusAt(f, n);
        if (m.status !== old) {
          requireThat(!['combatReady', 'wounded'].includes(m.status) || (old === 'combatReady' && m.status === 'wounded'), 'member resurrection/invalid transition');
          const transition = loss(s, f, n, m.status); requireThat(transition.applied, 'bounded handoff conflict');
        }
        f.individuals[n] = { position: copy(m.position), rounds: m.rounds, anchor: copy(f.position) };
        result.push({ id: m.id, status: statusAt(f, n) });
      }
      return { members: result };
    }
    const ready = f.runs.find(r => r.status === 'combatReady');
    const weapon = e.weaponId && s.assets.fixedWeapons.find(a => a.id === e.weaponId);
    if (!ready || weapon && ['destroyed', 'inactive'].includes(weapon.state)) return { applied: false, reason: 'not-engaged' };
    const rng = new Random(s.rng), roll = rng.next(); s.rng = rng.state;
    const vulnerability = 2 - f.morale * f.cohesion * f.supply;
    const context = (1 - e.cover) * (1 - e.suppression) * e.firepower * vulnerability * (weapon?.state === 'damaged' ? .5 : 1);
    const probability = -Math.expm1(-e.ratePerSecond * e.durationMs / 1000 * context);
    if (roll >= probability) return { applied: false, reason: 'no-loss', probability };
    const fatalRoll = rng.next(); s.rng = rng.state;
    return { ...loss(s, f, ready.from, fatalRoll < e.fatalFraction ? 'dead' : 'wounded'), probability };
  }
  advanceTo(at, { paused = false } = {}) {
    requireThat(integer(at) && at >= this.time, 'clock must be monotonic integer ms');
    if (paused) return;
    while (this.agenda.length && this.agenda[0].at <= at) {
      const e = this.agenda[0];
      // Transaction covers motion, RNG, counts, assets and consumption.
      const original = this.sector(e.sectorId), candidate = copy(original);
      moveTo(candidate, e.at);
      const result = this.apply(candidate, e); candidate.revision++;
      this.sectors[this.sectors.indexOf(original)] = candidate;
      this.agenda.shift(); this.consumed.push(e.id);
      this.journal.push({ id: e.id, at: e.at, sectorId: e.sectorId, type: e.type,
        ...(e.formationId ? { formationId: e.formationId } : {}), result });
    }
    for (const s of this.sectors) moveTo(s, at);
    this.time = at;
  }
  snapshot() { return copy({ config: this.config, time: this.time, sectors: this.sectors, agenda: this.agenda, journal: this.journal, consumed: this.consumed }); }
  static restore(snapshot) {
    // Replay is the validation mechanism for prototype checkpoints. Not a production loader.
    const world = new BattleWorld(snapshot.config);
    world.advanceTo(snapshot.time);
    requireThat(JSON.stringify(world.snapshot()) === JSON.stringify(snapshot), 'snapshot differs from deterministic replay');
    return world;
  }
}

/** Pure presentation selector. No camera/quality parameter enters BattleWorld. */
export function representation({ distanceM, visible, quality = 'HIGH', previousBand, nearM = 150, midM = 800, hysteresisM = 20 }) {
  requireThat(Number.isFinite(distanceM) && distanceM >= 0 && typeof visible === 'boolean' &&
    ['LOW', 'MEDIUM', 'HIGH'].includes(quality) && Number.isFinite(nearM) && Number.isFinite(midM) &&
    nearM >= 0 && midM > nearM && Number.isFinite(hysteresisM) && hysteresisM >= 0 &&
    hysteresisM < (midM - nearM) / 2 && (previousBand === undefined || ['NEAR', 'MID', 'FAR'].includes(previousBand)), 'representation arguments');
  let band = distanceM <= nearM ? 'NEAR' : distanceM <= midM ? 'MID' : 'FAR';
  if (previousBand === 'NEAR' && distanceM <= nearM + hysteresisM) band = 'NEAR';
  if (previousBand === 'MID' && distanceM > nearM - hysteresisM && distanceM <= midM + hysteresisM) band = 'MID';
  if (previousBand === 'FAR' && distanceM > midM - hysteresisM) band = 'FAR';
  return { band, mode: !visible ? 'STATE_ONLY' : band === 'NEAR' ? 'FULL' : band === 'MID' ? 'GROUP' : 'PROXY',
    // Descriptor budgets only, not production mesh budgets or measured shipping limits.
    descriptorBudget: !visible ? 0 : ({ LOW: 4, MEDIUM: 8, HIGH: 16 })[quality] };
}

/** Pure logical descriptors; requesting fewer visuals never changes casualty/RNG state. */
export function materialize(world, sectorId, { budget = 16 } = {}) {
  requireThat(integer(budget), 'materialization budget');
  const sector = world.sector(sectorId), actors = [];
  const formations = sector.formations.map(f => ({ id: f.id, nominalStrength: f.nominalStrength,
    counts: counts(f), position: copy(f.position), direction: f.direction, objective: f.objective,
    state: f.state, ammunition: f.ammunition, casualtyRuns: copy(f.runs.filter(r => r.status === 'dead')) }));
  for (const status of ['combatReady', 'wounded', 'dead', 'evacuated']) {
    for (const f of sector.formations) for (const r of f.runs.filter(r => r.status === status)) {
      for (let ordinal = r.from; ordinal < r.to && actors.length < budget; ordinal++) {
        const override = f.individuals[ordinal];
        const position = memberPosition(f, ordinal);
        actors.push({ id: memberId(f, ordinal), formationId: f.id, ordinal, status,
          position: copy(position), direction: f.direction, rounds: override?.rounds ?? 5 });
      }
    }
  }
  return { sectorId, revision: sector.revision, at: world.time, state: sector.state, objective: sector.objective,
    formations, actors, assets: copy(sector.assets) };
}

/** Atomic return of observed member deltas. Never replaces the whole aggregate. */
export function dematerialize(world, descriptor, { id, formationId, members, formationPosition, reserveAmmunition }) {
  const input = { id, at: world.time, sectorId: descriptor.sectorId, type: 'handoff',
    expectedRevision: descriptor.revision, expectedTime: descriptor.at, formationId, members: copy(members),
    ...(formationPosition ? { formationPosition: copy(formationPosition) } : {}),
    ...(reserveAmmunition !== undefined ? { reserveAmmunition } : {}) };
  world.validateAction(input);
  // Preflight prevents malformed returns from blocking the timeline or entering input log.
  world.apply(copy(world.sector(input.sectorId)), input);
  world.enqueue(input); world.advanceTo(world.time);
  return copy(world.journal.at(-1));
}
