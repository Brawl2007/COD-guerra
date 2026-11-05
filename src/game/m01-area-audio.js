import { audioVariation, audioHash, AUDIO_PROVISIONAL_LABEL, SPEED_OF_SOUND } from '../core/battlefield-audio.js';

/**
 * Area-act audio (VII-b day, VII-c dusk) and the shell whistle. PROVISIONAL: procedural WebAudio, no recordings (T45 label below).
 * Presentation only: it READS the area simulation (actId, clock, timers.barrage.run) and its events (`shell-incoming`); it never writes the sim,
 * draws from no random stream (variation is hashed from stable keys) and never reads the wall clock. Act 1 (M01Simulation) has no `actId`, so
 * `areaSpecOf` is null and nothing here ever plays there. The shell's landing is NOT sounded here: game.js already queues the `m01-blast` thud at
 * `soundAt` (= landing + distance/343); the whistle is placed so that it leads that thud by exactly `warnSec` (both are delayed by distance/343).
 */
export const AREA_AUDIO_LABEL = AUDIO_PROVISIONAL_LABEL;
export const AREA_PENDING_MAX = 24;
/** Per act: ambience slots. `artillery`: distant guns (chance per slot, distance range m); `birds`: daytime chirps; `beds`: continuous loops. */
export const AREA_AUDIO = Object.freeze({
  act_vii_b_north_day: Object.freeze({
    label: AREA_AUDIO_LABEL, slotSec: 6,
    artillery: Object.freeze({ chance: .45, distance: Object.freeze([1800, 3200]), salvo: 2, quietDuringBarrage: true }),
    birds: Object.freeze({ chance: .55, distance: Object.freeze([25, 90]) }),
    beds: Object.freeze({}),
  }),
  act_vii_c_withdrawal: Object.freeze({
    label: AREA_AUDIO_LABEL, slotSec: 9,
    artillery: Object.freeze({ chance: .3, distance: Object.freeze([2400, 4000]), salvo: 1, quietDuringBarrage: true }),
    birds: null,   // dusk: the birds have stopped
    beds: Object.freeze({ 'area-wind': Object.freeze({ volume: .03, distance: 0 }), 'area-fires': Object.freeze({ volume: .02, distance: 260 }) }),
  }),
});
export const areaSpecOf = sim => (sim && typeof sim.actId === 'string' && Object.hasOwn(AREA_AUDIO, sim.actId) ? AREA_AUDIO[sim.actId] : null);
const isArea = sim => Boolean(sim) && typeof sim.actId === 'string';

export class AreaAudio {
  constructor(audio) {
    this.audio = audio ?? null; this.actId = null; this.slot = NaN; this.beds = new Set();
    this.pending = []; this.stats = { whistles: 0, guns: 0, chirps: 0, dropped: 0 };
  }
  get diagnostics() { return { label: AREA_AUDIO_LABEL, actId: this.actId, beds: [...this.beds], pending: this.pending.length, ...this.stats }; }
  /** New sim / restore / transition: drop everything scheduled, stop the beds of the previous act, re-sync the slot with the clock. */
  reset(sim) {
    this._stopBeds(); this.pending.length = 0;
    const spec = areaSpecOf(sim);
    this.actId = isArea(sim) ? sim.actId : null;
    this.slot = spec && Number.isFinite(sim.clock) ? Math.floor(sim.clock / spec.slotSec) : NaN;
  }
  _stopBeds() { for (const key of this.beds) this._stopBed(key); this.beds.clear(); }
  _stopBed(key) { try { this.audio?.stopAreaBed?.(key); } catch { /* optional */ } }
  _geometry(point, p) {
    const dx = point.x - p.x, dz = point.z - p.z, rel = Math.atan2(dz, dx) - p.angle;
    return { distance: Math.hypot(dx, dz), pan: Math.sin(rel), front: Math.cos(rel) };
  }
  /** `shell-incoming`: the whistle is heard distance/343 s after the launch and lasts warnSec, so it ends exactly when the thud (soundAt) arrives. */
  handleEvent(event, sim) {
    if (!event || event.type !== 'shell-incoming' || !isArea(sim) || !event.point) return;
    if (sim.actId !== this.actId) this.reset(sim);
    const g = this._geometry(event.point, sim.player);
    this._push({ kind: 'whistle', at: event.at + g.distance / SPEED_OF_SOUND, duration: event.warnSec, key: `whistle:${event.at.toFixed(3)}`, ...g });
  }
  _push(item) {
    if (this.pending.length >= AREA_PENDING_MAX) { this.stats.dropped++; return false; }
    this.pending.push(item); return true;
  }
  /** One frame after the sim ticked: beds follow the act, slots plan the ambience, due sounds play. */
  update(sim) {
    const audio = this.audio, spec = areaSpecOf(sim);
    if (!audio?.ctx || audio.disposed) return;
    if ((isArea(sim) ? sim.actId : null) !== this.actId) this.reset(sim);   // another act (or act 1): the old act's beds and sounds end here
    this._dispatch(sim);
    if (!spec) return;
    for (const [key, bed] of Object.entries(spec.beds)) if (audio.setAreaBed?.(key, bed) !== false) this.beds.add(key);
    const slot = Math.floor(sim.clock / spec.slotSec);
    if (slot !== this.slot) { if (Number.isFinite(this.slot) && slot > this.slot) this._plan(spec, sim, slot); this.slot = slot; }
  }
  _plan(spec, sim, slot) {
    const key = `${sim.actId}:${slot}`, firing = Boolean(sim.timers?.barrage?.run), p = sim.player;
    if (spec.artillery && !(firing && spec.artillery.quietDuringBarrage) && audioVariation(`${key}:gun`) < spec.artillery.chance) {
      const [lo, hi] = spec.artillery.distance, d = lo + audioVariation(`${key}:gun-d`) * (hi - lo), az = -Math.PI / 2 + audioVariation(`${key}:gun-az`, -Math.PI / 2, Math.PI / 2);   // the north half-plane (-Z)
      const g = this._geometry({ x: p.x + Math.cos(az) * d, z: p.z + Math.sin(az) * d }, p);
      this._push({ kind: 'gun', at: sim.clock + audioVariation(`${key}:gun-at`, 0, spec.slotSec * .6) + g.distance / SPEED_OF_SOUND, salvo: spec.artillery.salvo, key: `${key}:gun`, ...g });
    }
    if (spec.birds && !firing && audioVariation(`${key}:bird`) < spec.birds.chance) {
      const [lo, hi] = spec.birds.distance, d = lo + audioVariation(`${key}:bird-d`) * (hi - lo), n = 2 + audioHash(`${key}:bird-n`) % 3;
      this._push({ kind: 'bird', at: sim.clock + audioVariation(`${key}:bird-at`, 0, spec.slotSec * .7), notes: n, distance: d, pan: audioVariation(`${key}:bird-pan`, -.8, .8), front: 1, key: `${key}:bird` });
    }
  }
  _dispatch(sim) {
    const list = this.pending;
    if (!list.length) return;
    let keep = 0;
    for (let i = 0; i < list.length; i++) { const s = list[i]; if (s.at <= sim.clock) this._play(s); else list[keep++] = s; }
    list.length = keep;
  }
  _play(s) {
    const a = this.audio;
    try {
      if (s.kind === 'whistle') { a.tone(2100, s.duration, 'sine', .06, -1500, s.pan, 0, { kind: 'shell-whistle', category: 'explosion', distance: s.distance }); this.stats.whistles++; }
      else if (s.kind === 'gun') { a.distantBattle('artillery', s.pan, s.distance, s.key, { salvo: s.salvo, front: s.front }); this.stats.guns++; }
      else if (s.kind === 'bird') {
        for (let i = 0; i < s.notes; i++) a.tone(3200 + audioHash(`${s.key}:${i}`) % 1400, .07, 'sine', .012, 500, s.pan, i * .13, { kind: 'area-bird', category: 'ambience', distance: s.distance });
        this.stats.chirps++;
      }
    } catch { /* presentation must never throw into the frame loop */ }
  }
  dispose() { this._stopBeds(); this.pending.length = 0; this.audio = null; }
}
