import audioLayout from '../../missions/m01-tczew/audio-layout.json' with { type: 'json' };
import { audioHash, audioVariation, SPEED_OF_SOUND } from '../core/battlefield-audio.js';
import { MusicConductor, createMusicInput, readoutIntensity, MUSIC_TUNING, isEmitterAudible } from '../core/audio/index.js';

/**
 * M01 audio director (T06b, AUDIO-DESIGN sections 2-4 and 6.3). It turns simulation state and events into calls on the T06a audio core:
 * the listener zone (reverb A/B, interior lowpass), the sector-gated emitter fire (the casemate ckm, the east MG34/ckm), zone occlusion for
 * that fire, and the dark adaptive music (src/core/audio/music.js).
 *
 * PRESENTATION ONLY, and a one-way street: the director READS the simulation (clock, battleClock, consumed, mission.phase, scene, sectors,
 * player, definition, battleReadout) and never writes it. It never touches the simulation's random generator, never draws from any random stream (variation is
 * hashed from stable keys, `audioHash`), and never reads the wall clock: every decision is a function of sim clocks and sim state, so two
 * identical runs produce identical audio calls. game.js keeps dispatching the sounds it always dispatched (a duplicate would break the
 * exact `bridge-demolition` count); the director adds only what was missing and is attached by optional-chained hook lines.
 *
 * CLOCK DOMAINS: emitter windows (`activeFrom`/`activeUntil`) are seconds since midnight, i.e. `sim.battleClock`; slots, the music gate
 * windows and `sim.consumed` use `sim.clock`. They are never mixed.
 *
 * The per-frame path (`update`) allocates nothing: scratch records are created once, the emitter list is reused, the readout (which
 * allocates by design, T22) is sampled at 4 Hz only, and strings are built only when a 1.5 s emitter slot opens.
 */
export const MISSION_ID = 'm01_tczew';
export const EMITTER_SLOT_SEC = 1.5;
export const MAX_PENDING = 12;
const DISTANT_FROM_M = 500, AUDIBLE_RANGE_M = 2500;
/** Chance that an emitter fires a burst in a given slot, by weapon (dramatised display fire is sparse). */
const DENSITY = Object.freeze({ ckm_wz30: .5, mg34: .6 }), DEFAULT_DENSITY = .4;
const WHIZZ_BAND_M = 12;
const EMPTY = Object.freeze({});

// ---------------------------------------------------------------- presentation derivation (design section 3, option T05a)
/** `m01-blast` carries no kind: derive it from the sim's damage id (game.js blastScale rule) and the event's aerial flag. */
export const deriveBlastKind = (damageId, aerial) =>
  typeof damageId === 'string' && damageId.startsWith('m01_grenade_') ? 'grenade'
    : typeof damageId === 'string' && damageId.includes('demolition') ? 'demolition' : aerial ? 'bomb' : 'shell';
/** `npc-shot` carries no weapon: it is Kowal's rkm wz.28 (bursts) or an allied rifle (single shot). */
export const deriveNpcShotWeapon = event => (typeof event?.weapon === 'string' ? event.weapon : event?.rounds > 1 ? 'rkm_wz28' : 'ally_rifle');
/** `round-impact` carries no pass: the supersonic crack is the sim's own flag (<= 6 m); a closer miss without it is a whizz band; else none. */
export const derivePass = event => (event?.crack ? 'crack' : Number.isFinite(event?.distance) && event.distance <= WHIZZ_BAND_M ? 'whizz' : 'none');

// ---------------------------------------------------------------- zone occlusion (presentation only)
/**
 * A listener inside an interior zone (one that defines `interiorLowpassHz`, e.g. the station) hears sources OUTSIDE that zone's box through
 * the walls: lowpass 900 Hz (near) .. 600 Hz (>= 200 m) and the `outsideGainDb` (-12 dB) of the zone, or of the layout's default zone when
 * the interior zone defines none (that is where the shipped data keeps it). Open and semi-open zones (bridge: `occlusion: null`) never occlude.
 * Fills and returns `out` ({hz, gain}) or returns null. Allocation-free.
 */
export function occlusionFor(layout, zone, x, y, z, distance, out) {
  if (!zone || zone.interiorLowpassHz === null || zone.interiorLowpassHz === undefined || !zone.box) return null;
  const b = zone.box;
  if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ) return null;   // a source inside the room is not muffled
  const range = zone.outsideLowpassHz ?? layout?.defaultZone?.outsideLowpassHz;
  if (!range) return null;
  const db = zone.outsideLowpassHz ? zone.outsideGainDb : (layout.defaultZone.outsideGainDb ?? 0);
  const t = Math.max(0, Math.min(1, (Number.isFinite(distance) ? distance : 0) / 200));
  out.hz = range[1] - (range[1] - range[0]) * t;
  out.gain = Math.pow(10, db / 20);
  return out;
}

export class M01AudioDirector {
  constructor(audio, { layout = audioLayout } = {}) {
    this.audio = audio ?? null;
    this.core = audio?.core ?? null;
    this.conductor = this.core ? new MusicConductor(this.core) : null;
    this.input = createMusicInput();
    this.sim = null; this.disposed = false; this.errors = 0; this.lastError = null;
    this.lastClock = -Infinity; this.restoredAt = -Infinity; this.emitterSlot = NaN;
    this.active = []; this.spatialOut = { distance: 0, pan: 0, front: 1 }; this.occ = { hz: 0, gain: 1 };
    this.trainArrivals=[{id:'train963',from:17010,until:17100,x:1675,y:2,z:-2.5,heard:false,pending:false,at:0},
      {id:'panzerzug',from:17460,until:17520,x:1519,y:2,z:2.5,heard:false,pending:false,at:0}];
    this.pending = Array.from({ length: MAX_PENDING }, () => ({ used: false, at: 0, emitter: null, pan: 0, distance: 0, front: 1, rounds: 1, key: '' }));
    this.stats = { slots: 0, scheduled: 0, played: 0, suppressed: 0, dropped: 0, occluded: 0, rewinds: 0, readoutSamples: 0, readoutMissing: 0 };
    this.derived = { grenade: 0, demolition: 0, bomb: 0, shell: 0, rkm_wz28: 0, ally_rifle: 0, other: 0, crack: 0, whizz: 0, none: 0 };
    // Bound once: the emitter gate reads the CURRENT sector states every call (a restore replaces sim.sectors wholesale).
    this.stateOf = id => {
      const list = this.sim?.sectors?.sectors;
      if (!list) return undefined;
      for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i].state;
      return undefined;
    };
    try { audio?.setLayout?.(layout); } catch { /* the core falls back to open/earth on its own */ }
    try { audio?.setDirectorProbe?.(() => this.diagnostics); } catch { /* diagnostics are optional */ }
  }

  /** New mission, continue, checkpoint restart or restore: forget transient scheduling, stop music and re-sync stinger arming with the sim. */
  reset(sim) {
    if (this.disposed) return;
    const m01 = Boolean(sim) && sim.missionId === MISSION_ID;
    this.sim = m01 ? sim : null;
    this._clearPending(); this.emitterSlot = NaN; this.restoredAt = -Infinity;
    this.lastClock = m01 && Number.isFinite(sim.clock) ? sim.clock : -Infinity;
    this.conductor?.reset(m01 ? sim.consumed : EMPTY);
    for(const train of this.trainArrivals){train.heard=m01&&sim.battleClock>=train.from;train.pending=false;}
    if (m01) { try { this.audio?.setEmitters?.(sim.definition); } catch { /* none -> silent emitters */ } }
  }

  /** The events that matter to the director (called once per drained M01 event, after game.js has dispatched its own sound). */
  handleEvent(event, sim = this.sim) {
    if (this.disposed || !event || !sim) return;
    if (sim !== this.sim) { if (sim.missionId !== MISSION_ID) return; this.reset(sim); }
    switch (event.type) {
      case 'restored': this.restoredAt = sim.clock; break;   // 20 s of silence after a player death
      case 'm01-blast': {
        const kind = event.kind??deriveBlastKind(this._damageId(sim, event), event.aerial === true), p = event.point, pl = sim.player;
        this.derived[kind]++;
        // A near blast (< 60 m) dips the music 4 dB for 1.5 s when it is heard; the bridge demolitions are scored by their own stinger.
        if (kind !== 'demolition' && p && Math.hypot(p.x - pl.x, p.z - pl.z) < MUSIC_TUNING.nearBlastMeters && Number.isFinite(event.soundAt)) this.conductor?.noteBlast(event.soundAt);
        break;
      }
      case 'npc-shot': { const w = deriveNpcShotWeapon(event); this.derived[Object.hasOwn(this.derived, w) ? w : 'other']++; break; }
      case 'round-impact': this.derived[event.pass??derivePass(event)]++; break;
      default: break;
    }
  }

  /** One frame (M01 only, after the sim ticked). Reads the sim; allocation-free; never throws into the loop. */
  update(sim) {
    if (this.disposed || !sim || sim.missionId !== MISSION_ID) return false;
    try {
      if (this.sim !== sim) this.reset(sim);
      const audio = this.audio;
      if (!audio || !audio.ctx || audio.disposed) return false;   // before the context exists nothing may be scheduled
      const clock = sim.clock;
      if (!Number.isFinite(clock)) return false;
      if (clock < this.lastClock - 1e-6) { this._clearPending(); this.emitterSlot = NaN; this.stats.rewinds++; }   // checkpoint restore: no backlog
      this.lastClock = clock;
      const p = sim.player;
      audio.setListener?.(p.x, p.y, p.z);   // zone + surface under the listener (reverb A/B and interior lowpass on change only)
      this._emitters(sim);   // sim, not numbers: a number argument across a non-inlined call is boxed on every frame
      this._trainArrival(sim);
      this._music(sim);
      return true;
    } catch (error) { this._fail(error); return false; }
  }
  /** A failure here must never reach the frame loop; it is counted and kept for diagnostics/tests. */
  _fail(error) { this.errors++; this.lastError = String(error?.message ?? error); }
  _trainArrival(sim){
    for(const train of this.trainArrivals){
      if(!train.heard&&sim.battleClock>=train.from&&sim.battleClock<train.until){
        const p=sim.player,distance=Math.hypot(train.x-p.x,train.y-p.y-1.6,train.z-p.z);
        train.heard=true;train.pending=true;train.at=sim.clock+distance/343;
      }
      if(train.pending&&sim.clock>=train.at){train.pending=false;this._spatial(train.x,train.z,sim.player);
        this.audio.trainMoving?.(train.id,this.spatialOut.pan,this.spatialOut.distance,`${train.id}:approach`);}
    }
  }

  // ---------------------------------------------------------------- emitters
  _emitters(sim) {
    const slot = Math.floor(sim.clock / EMITTER_SLOT_SEC);
    if (slot !== this.emitterSlot) {
      this.emitterSlot = slot; this.stats.slots++;
      const clock = sim.clock;
      // Real sector states drive the gate: the casemate ckm sounds 04:46..06:12 and falls silent at s1 `evacuating_bridgehead`.
      const list = this.audio.activeEmitters(sim.battleClock, this.stateOf, this.active, null);
      for (let i = 0; i < list.length; i++) this._schedule(list[i], slot, clock, sim.player);
    }
    this._dispatch(sim);
  }
  _schedule(e, slot, clock, player) {
    const density = DENSITY[e.weapon] ?? DEFAULT_DENSITY, key = `${e.id}:${slot}`;
    if (audioVariation(`${key}:fire`) >= density) return;
    this._spatial(e.x, e.z, player);
    const s = this.spatialOut;
    if (s.distance > AUDIBLE_RANGE_M) return;
    let free = null;
    for (let i = 0; i < this.pending.length; i++) if (!this.pending[i].used) { free = this.pending[i]; break; }
    if (!free) { this.stats.dropped++; return; }
    free.used = true; free.emitter = e; free.pan = s.pan; free.distance = s.distance; free.front = s.front;
    free.rounds = 3 + audioHash(`${key}:rounds`) % 4; free.key = key;
    free.at = clock + audioVariation(`${key}:at`, 0, EMITTER_SLOT_SEC * .8) + s.distance / SPEED_OF_SOUND;   // the shot is heard after distance/343
    this.stats.scheduled++;
  }
  _dispatch(sim) {
    for (let i = 0; i < this.pending.length; i++) {
      const p = this.pending[i];
      if (!p.used || p.at > sim.clock) continue;
      p.used = false;
      const e = p.emitter; p.emitter = null;
      // The gate is re-checked at the moment of the shot: a burst scheduled just before the evacuation does not sound after it.
      if (!isEmitterAudible(e, sim.battleClock, this.stateOf(e.sector), undefined)) { this.stats.suppressed++; continue; }
      this._play(e, p);
    }
  }
  _play(e, p) {
    const audio = this.audio, core = this.core, occ = occlusionFor(core?.layout, core?.zone, e.x, e.y, e.z, p.distance, this.occ);
    if (occ) { audio.setOcclusion?.(occ); this.stats.occluded++; }
    try { audio.weaponFire(e.weapon, p.pan, p.distance, { rounds: p.rounds, key: p.key, front: p.front, distant: p.distance >= DISTANT_FROM_M }); this.stats.played++; }
    catch (error) { this._fail(error); }
    finally { if (occ) audio.setOcclusion?.(null); }
  }
  _clearPending() { for (let i = 0; i < this.pending.length; i++) { this.pending[i].used = false; this.pending[i].emitter = null; } }
  /** Same geometry as Game.spatial for M01, written into a reused record. */
  _spatial(x, z, p) {
    const dx = x - p.x, dz = z - p.z, relative = Math.atan2(dz, dx) - p.angle, out = this.spatialOut;
    out.distance = Math.hypot(dx, dz); out.pan = Math.sin(relative); out.front = Math.cos(relative);
    return out;
  }

  // ---------------------------------------------------------------- music
  _music(sim) {
    const c = this.conductor;
    if (!c) return;
    const inp = this.input, clock = sim.clock;
    inp.clock = clock; inp.consumed = sim.consumed; inp.phase = sim.mission.phase; inp.scene = sim.scene ? sim.scene.id : null;
    inp.complete = sim.mission.complete === true; inp.restoredAt = this.restoredAt;
    if (c.due(inp)) inp.intensity = this._intensity(sim, clock);   // 4 Hz: the T22 readout allocates, so it is never read per frame
    c.update(inp);
  }
  /** I = max(readoutI, heardI). Without battleReadout (T22 absent or throwing) the heard intensity and the phase cap carry the music. */
  _intensity(sim, clock) {
    const heard = this.audio.intensity?.level?.(clock);
    let readoutI = 0;
    try {
      const readout = sim.battleReadout;
      if (readout) { readoutI = readoutIntensity(readout, sim.player.x, sim.player.z); this.stats.readoutSamples++; } else this.stats.readoutMissing++;
    } catch { this.stats.readoutMissing++; }
    return Math.max(Number.isFinite(heard) ? heard : 0, readoutI);
  }
  /** Damage id of an `m01-blast` (same match game.js uses for blastScale), scanning the log newest first without allocating. */
  _damageId(sim, event) {
    const list = sim.sectors?.damage, p = event.point;
    if (!list || !p) return null;
    for (let i = list.length - 1; i >= 0; i--) { const d = list[i]; if (d.soundAt === event.soundAt && d.x === p.x && d.z === p.z) return d.id; }
    return null;
  }

  get diagnostics() {
    const z = this.core?.zone, s = this.core?.surface;
    return {
      bound: Boolean(this.sim), errors: this.errors, lastError: this.lastError, zone: z?.id ?? null, surface: s?.id ?? null, emitters: { ...this.stats, active: this.active.map(e => e.id), pending: this.pending.filter(p => p.used).length },
      derived: { ...this.derived }, music: this.conductor?.diagnostics ?? null,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this._clearPending();
    this.conductor?.dispose();
    try { this.audio?.setOcclusion?.(null); this.audio?.setDirectorProbe?.(null); } catch { /* the audio manager may already be gone */ }
    this.sim = null;
  }
}
