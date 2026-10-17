import * as THREE from 'three';
import {
  BOOT_TOLERANCE_M,
  createFootIkRecord,
  isFootIkEligible,
  refreshBone,
  setWorldQuaternion,
  solveActorFootIk,
  solveTwoBoneIk,
  worldPosition,
  worldQuaternion
} from './m01-foot-ik.js';

// M01 weapon hand-pin, per-tier fidelity budget and IK diagnostics (roadmap T37 · M01-ANIM-FIDELITY-IK-BUDGET-V1).
// Ported from the external Argon delivery (Gemini) and reworked for the integration candidate.
//
// Hand pin = the hands keep their AUTHORED world position and orientation (hand bone origin, i.e. the wrist; the authored palm already
// sits on the weapon socket) while the body underneath leans into a ramp and drops its pelvis. The weapon bone hangs from the root
// and is never touched, so `muzzle()` stays bit-identical. Presentation only: never mutates gameplay state.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const round5 = v => Math.round(v * 1e5) / 1e5;
const round4 = v => Math.round(v * 1e4) / 1e4;
const nowMs = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());

/** Acceptance tolerance for hand pinning against the authored clip pose (1.5 cm = 0.015 m). */
export const HAND_PIN_TOLERANCE_M = 0.015;
/** A hand already this close to its authored position needs no arm solve (metres). */
const HAND_PIN_SKIP_M = 0.002;

/**
 * Per-tier IK fidelity budget (distances to the player in metres, actor caps). Aligned with the M01Characters skinning limits
 * (`high: 28 actors / 160 m`, `medium: 24 / 130 m`, `low: 18 / 100 m`):
 * - `full`: pelvis lean + two-bone foot IK + ankle alignment + weapon hand pin.
 * - `foot_slope`: pelvis lean + two-bone foot IK + ankle alignment.
 * - `slope_only`: upper-body lean only (no per-leg solve).
 * - `clip_only`: pure animation clip (zero IK cost).
 */
export const M01_IK_TIER_POLICY = Object.freeze({
  high: Object.freeze({ tier: 'high', fullIkMaxDistance: 45, footIkMaxDistance: 100, slopeOnlyMaxDistance: 160, maxFullIkActors: 16, maxFootIkActors: 24, maxSlopeActors: 28 }),
  medium: Object.freeze({ tier: 'medium', fullIkMaxDistance: 25, footIkMaxDistance: 65, slopeOnlyMaxDistance: 130, maxFullIkActors: 10, maxFootIkActors: 16, maxSlopeActors: 22 }),
  low: Object.freeze({ tier: 'low', fullIkMaxDistance: 12, footIkMaxDistance: 22, slopeOnlyMaxDistance: 45, maxFullIkActors: 4, maxFootIkActors: 8, maxSlopeActors: 12 })
});
/** An actor already in a tier keeps it until it is this much further than the tier radius (avoids flicker at the boundary). */
const TIER_HYSTERESIS = 1.1;
const MODE_RANK = Object.freeze({ full: 3, foot_slope: 2, slope_only: 1 });

/**
 * Resolves the IK fidelity mode for an actor given its distance from the player, quality preset and per-frame budget counters
 * (mutated). `previousMode` (optional) adds distance hysteresis.
 */
export function resolveIkTierMode(actor, distance, quality = 'high', budgetCounters = null, clipName = null, previousMode = null) {
  if (!isFootIkEligible(actor, clipName)) return 'bypassed_exact';
  const policy = M01_IK_TIER_POLICY[quality] ?? M01_IK_TIER_POLICY.high;
  const rank = MODE_RANK[previousMode] ?? 0;
  const fullUsed = budgetCounters?.full ?? 0;
  const footUsed = budgetCounters?.foot ?? 0;
  const slopeUsed = budgetCounters?.slope ?? 0;

  if (distance <= policy.fullIkMaxDistance * (rank >= 3 ? TIER_HYSTERESIS : 1) && fullUsed < policy.maxFullIkActors && footUsed < policy.maxFootIkActors) {
    if (budgetCounters) {
      budgetCounters.full++;
      budgetCounters.foot++;
      budgetCounters.slope++;
    }
    return 'full';
  }
  if (distance <= policy.footIkMaxDistance * (rank >= 2 ? TIER_HYSTERESIS : 1) && footUsed < policy.maxFootIkActors) {
    if (budgetCounters) {
      budgetCounters.foot++;
      budgetCounters.slope++;
    }
    return 'foot_slope';
  }
  if (distance <= policy.slopeOnlyMaxDistance * (rank >= 1 ? TIER_HYSTERESIS : 1) && slopeUsed < policy.maxSlopeActors) {
    if (budgetCounters) budgetCounters.slope++;
    return 'slope_only';
  }
  return 'clip_only';
}

// Bones whose local transform IK may write. They are snapshotted right before IK and restored before the next AnimationMixer
// sample: the mixer only rewrites a property when the clip value changed, so an untouched constant track (a paused sim clock,
// a held pose, an untracked clavicle) would otherwise keep last frame's IK offset.
const IK_RESTORE_BONES = Object.freeze([
  'hips', 'spine_01', 'spine_02', 'neck',
  'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l',
  'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r',
  'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'
]);
// Bones the solvers read or refresh but never write.
const IK_REF_BONES = Object.freeze(['spine_03', 'head', 'ball_l', 'ball_r']);

/** Caches bone references on a character clone. */
export function bindCharacterIkRig(root) {
  if (!root) return null;
  const rig = {
    rootNode: root,
    snapshot: [],
    authored: { l: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() }, r: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() } },
    hasLegIk: false,
    hasArmIk: false
  };
  for (const name of IK_RESTORE_BONES) {
    const bone = root.getObjectByName(name) ?? null;
    rig[name] = bone;
    if (bone) rig.snapshot.push({ bone, position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
  }
  for (const name of IK_REF_BONES) rig[name] = root.getObjectByName(name) ?? null;
  rig.hasLegIk = Boolean(rig.hips && rig.thigh_l && rig.calf_l && rig.foot_l && rig.thigh_r && rig.calf_r && rig.foot_r);
  rig.hasArmIk = Boolean(rig.spine_03 && rig.clavicle_l && rig.upperarm_l && rig.lowerarm_l && rig.hand_l && rig.clavicle_r && rig.upperarm_r && rig.lowerarm_r && rig.hand_r);
  return rig;
}

/** Stores the pre-IK local transforms (to undo IK) and the authored world pose of both hands (to pin them). */
export function captureIkPose(rig) {
  for (const entry of rig.snapshot) {
    entry.position.copy(entry.bone.position);
    entry.quaternion.copy(entry.bone.quaternion);
  }
  if (rig.hasArmIk) {
    worldPosition(rig.hand_l, rig.authored.l.position);
    worldQuaternion(rig.hand_l, rig.authored.l.quaternion);
    worldPosition(rig.hand_r, rig.authored.r.position);
    worldQuaternion(rig.hand_r, rig.authored.r.quaternion);
  }
}

/** Writes the pre-IK local transforms back. */
export function restoreIkPose(rig) {
  if (!rig?.snapshot) return;
  for (const entry of rig.snapshot) {
    entry.bone.position.copy(entry.position);
    entry.bone.quaternion.copy(entry.quaternion);
  }
}

const _sPos = new THREE.Vector3();
const _uPos = new THREE.Vector3();
const _mPos = new THREE.Vector3();
const _ePos = new THREE.Vector3();
const _dirOld = new THREE.Vector3();
const _dirTo = new THREE.Vector3();
const _dirNew = new THREE.Vector3();
const _qSwing = new THREE.Quaternion();
const _qWorld = new THREE.Quaternion();
const _handNow = new THREE.Vector3();

/**
 * Swings a clavicle toward a hand target that is beyond (or near the limit of) the arm's reach, so the arm solve keeps both
 * segment lengths without over-stretching. Rotation only; never moves bone offsets.
 */
export function protractClavicleTowardTarget(clavicleBone, upperBone, lowerBone, handBone, targetWorld) {
  worldPosition(clavicleBone, _sPos);
  worldPosition(upperBone, _uPos);
  worldPosition(lowerBone, _mPos);
  worldPosition(handBone, _ePos);
  const reach = _uPos.distanceTo(_mPos) + _mPos.distanceTo(_ePos);
  const dist = _uPos.distanceTo(targetWorld);
  if (dist <= reach * 0.97) return false;
  _dirOld.copy(_uPos).sub(_sPos).normalize();
  _dirTo.copy(targetWorld).sub(_sPos).normalize();
  const needed = clamp((dist - reach * 0.97) / Math.max(1e-5, reach * 0.06), 0, 1);
  _dirNew.copy(_dirOld).lerp(_dirTo, needed * 0.6).normalize();
  _qSwing.setFromUnitVectors(_dirOld, _dirNew);
  worldQuaternion(clavicleBone, _qWorld);
  setWorldQuaternion(clavicleBone, _qSwing.multiply(_qWorld));
  refreshBone(clavicleBone);
  refreshBone(upperBone);
  refreshBone(lowerBone);
  refreshBone(handBone);
  return true;
}

function pinHand(clavicle, upper, lower, hand, authored) {
  refreshBone(clavicle);
  refreshBone(upper);
  refreshBone(lower);
  refreshBone(hand);
  worldPosition(hand, _handNow);
  if (_handNow.distanceTo(authored.position) > HAND_PIN_SKIP_M) {
    protractClavicleTowardTarget(clavicle, upper, lower, hand, authored.position);
    solveTwoBoneIk(upper, lower, hand, authored.position, null, 1);
  }
  // Hand keeps its authored world orientation (the arm solve rotates it along with the forearm).
  setWorldQuaternion(hand, authored.quaternion);
  refreshBone(hand);
  worldPosition(hand, _handNow);
  return _handNow.distanceTo(authored.position);
}

/** Fresh hand-pin result record (reused per instance by the caller). */
export function createHandPinRecord() {
  return { active: false, leftErrorM: null, rightErrorM: null, maxErrorM: null };
}

/**
 * Pins `hand_l` / `hand_r` to the authored world pose captured by captureIkPose(), after foot IK/ramp lean moved the shoulders.
 * Never modifies the `weapon` bones. Writes into and returns `out`.
 */
export function solveActorHandPin(rig, out = createHandPinRecord()) {
  out.active = false;
  out.leftErrorM = null;
  out.rightErrorM = null;
  out.maxErrorM = null;
  if (!rig?.hasArmIk) return out;
  const left = pinHand(rig.clavicle_l, rig.upperarm_l, rig.lowerarm_l, rig.hand_l, rig.authored.l);
  const right = pinHand(rig.clavicle_r, rig.upperarm_r, rig.lowerarm_r, rig.hand_r, rig.authored.r);
  out.active = true;
  out.leftErrorM = round5(left);
  out.rightErrorM = round5(right);
  out.maxErrorM = round5(Math.max(left, right));
  return out;
}

/** Reusable per-instance IK record exposed as `inst.ik` (and on the diagnostics `actors[]` entry). */
export function createActorIkRecord() {
  return { mode: 'none', distance: 0, footIk: createFootIkRecord(), handPin: createHandPinRecord() };
}

function emptyTierSummary(tier) {
  return {
    tier,
    frames: 0,
    skinnedActors: 0,
    activeIkActors: 0,
    fullIkActors: 0,
    footSlopeActors: 0,
    slopeOnlyActors: 0,
    clipOnlyActors: 0,
    bypassedExactActors: 0,
    footIkSolved: 0,
    handPinSolved: 0,
    slopeTilted: 0,
    maxBootClearanceM: 0,
    maxHandErrorM: 0,
    lastTotalMs: 0,
    lastFootIkMs: 0,
    lastHandPinMs: 0,
    avgTotalMs: 0,
    maxTotalMs: 0,
    totalMsAccum: 0
  };
}

function emptyCounts() {
  return { skinned: 0, activeIk: 0, full: 0, footSlope: 0, slopeOnly: 0, clipOnly: 0, bypassedExact: 0, footIkSolved: 0, handPinSolved: 0, slopeTilted: 0 };
}

/** Creates the telemetry state container exposed through `characters.diagnostics.ik`. */
export function createIkDiagnosticsState() {
  return {
    quality: 'high',
    lastClock: null,
    counts: emptyCounts(),
    accuracy: { maxBootClearanceM: 0, maxHandErrorM: 0, bootToleranceM: BOOT_TOLERANCE_M, handToleranceM: HAND_PIN_TOLERANCE_M },
    cost: { lastTotalMs: 0, lastFootIkMs: 0, lastHandPinMs: 0, avgTotalMs: 0, maxTotalMs: 0, samples: 0, totalMsAccum: 0 },
    byTier: { high: emptyTierSummary('high'), medium: emptyTierSummary('medium'), low: emptyTierSummary('low') },
    /** IK switch off (or no world): every skinned actor is plain clip output and no IK time is spent. */
    recordDisabled(skinnedCount = 0, quality = 'high') {
      this.quality = M01_IK_TIER_POLICY[quality] ? quality : 'high';
      for (const key in this.counts) this.counts[key] = 0;
      this.counts.skinned = skinnedCount;
      this.counts.clipOnly = skinnedCount;
      this.cost.lastTotalMs = 0;
      this.cost.lastFootIkMs = 0;
      this.cost.lastHandPinMs = 0;
    }
  };
}

const _budget = { full: 0, foot: 0, slope: 0 };
const _footOptions = { mode: 'full', weight: 1, measure: true };

/**
 * Evaluates the per-tier IK fidelity policy, Foot IK + ramp lean (m01-foot-ik.js) and weapon hand pin across the selected skinned
 * actors, nearest first, recording exact counts and the measured CPU time (`performance.now()`; no FPS is ever derived).
 * `entries[0..count)` are `{ actor, inst, distance, view }` records owned by the caller (reused every frame).
 * `inst` carries `root`, `clip`, `ikRig`, `ik`, `ikApplied`; `view` (optional) is the diagnostics entry that receives `.ik`.
 */
export function updateActorsIk(entries, count, quality, time, ground, state = null) {
  const tier = M01_IK_TIER_POLICY[quality] ? quality : 'high';
  const tStart = nowMs();
  let footIkMs = 0;
  let handPinMs = 0;

  // Nearest first, ties by id: deterministic budgets without allocating.
  for (let i = 1; i < count; i++) {
    const e = entries[i];
    let j = i - 1;
    while (j >= 0 && (entries[j].distance > e.distance || (entries[j].distance === e.distance && entries[j].actor.id > e.actor.id))) {
      entries[j + 1] = entries[j];
      j--;
    }
    entries[j + 1] = e;
  }

  _budget.full = 0;
  _budget.foot = 0;
  _budget.slope = 0;
  const counts = state ? state.counts : emptyCounts();
  for (const key in counts) counts[key] = 0;
  counts.skinned = count;
  let maxBootClearanceM = 0;
  let maxHandErrorM = 0;

  for (let i = 0; i < count; i++) {
    const { actor, inst, distance, view } = entries[i];
    const rig = inst.ikRig;
    const record = inst.ik ??= createActorIkRecord();
    const mode = rig ? resolveIkTierMode(actor, distance, tier, _budget, inst.clip, record.mode) : 'clip_only';
    record.mode = mode;
    record.distance = round4(distance);
    record.footIk.active = false;
    record.handPin.active = false;
    if (view) view.ik = record;
    if (mode === 'bypassed_exact') {
      counts.bypassedExact++;
      continue;
    }
    if (mode === 'clip_only') {
      counts.clipOnly++;
      continue;
    }
    if (mode === 'full') counts.full++;
    else if (mode === 'foot_slope') counts.footSlope++;
    else counts.slopeOnly++;

    captureIkPose(rig);
    inst.ikApplied = true;

    const t0 = nowMs();
    _footOptions.mode = mode;
    const foot = solveActorFootIk(rig, actor, inst.clip, ground, _footOptions, record.footIk);
    const t1 = nowMs();
    footIkMs += t1 - t0;
    if (foot.active) {
      if (mode !== 'slope_only') counts.footIkSolved++;
      if (Math.abs(foot.pitch) + Math.abs(foot.roll) > 1e-4) counts.slopeTilted++;
      if (foot.stanceClearanceM !== null && foot.stanceClearanceM > maxBootClearanceM) maxBootClearanceM = foot.stanceClearanceM;
    }

    let handActive = false;
    if (mode === 'full') {
      const hand = solveActorHandPin(rig, record.handPin);
      handPinMs += nowMs() - t1;
      if (hand.active) {
        handActive = true;
        counts.handPinSolved++;
        if (hand.maxErrorM > maxHandErrorM) maxHandErrorM = hand.maxErrorM;
      }
    }
    if (foot.active || handActive) {
      counts.activeIk++;
      inst.root.updateMatrixWorld(true);
    }
  }

  const totalMs = nowMs() - tStart;
  if (state) {
    state.quality = tier;
    state.lastClock = time;
    state.accuracy.maxBootClearanceM = round5(maxBootClearanceM);
    state.accuracy.maxHandErrorM = round5(maxHandErrorM);
    const cost = state.cost;
    cost.samples++;
    cost.lastTotalMs = round4(totalMs);
    cost.lastFootIkMs = round4(footIkMs);
    cost.lastHandPinMs = round4(handPinMs);
    cost.totalMsAccum += totalMs;
    cost.avgTotalMs = round4(cost.totalMsAccum / cost.samples);
    if (totalMs > cost.maxTotalMs) cost.maxTotalMs = round4(totalMs);

    const t = state.byTier[tier];
    t.frames++;
    t.skinnedActors = counts.skinned;
    t.activeIkActors = counts.activeIk;
    t.fullIkActors = counts.full;
    t.footSlopeActors = counts.footSlope;
    t.slopeOnlyActors = counts.slopeOnly;
    t.clipOnlyActors = counts.clipOnly;
    t.bypassedExactActors = counts.bypassedExact;
    t.footIkSolved = counts.footIkSolved;
    t.handPinSolved = counts.handPinSolved;
    t.slopeTilted = counts.slopeTilted;
    t.maxBootClearanceM = round5(maxBootClearanceM);
    t.maxHandErrorM = round5(maxHandErrorM);
    t.lastTotalMs = round4(totalMs);
    t.lastFootIkMs = round4(footIkMs);
    t.lastHandPinMs = round4(handPinMs);
    t.totalMsAccum += totalMs;
    t.avgTotalMs = round4(t.totalMsAccum / t.frames);
    if (totalMs > t.maxTotalMs) t.maxTotalMs = round4(totalMs);
  }
  return counts;
}

/** Formats the read-only IK telemetry block for `gameDiagnostics().m01.characters.ik` (diagnostics only; allocates). */
export function formatIkDiagnostics(state, enabled = true) {
  const tier = state?.quality ?? 'high';
  return {
    enabled: Boolean(enabled),
    tier,
    clock: state?.lastClock ?? null,
    policy: M01_IK_TIER_POLICY[tier] ?? M01_IK_TIER_POLICY.high,
    policies: M01_IK_TIER_POLICY,
    counts: state ? { ...state.counts } : null,
    accuracy: state ? { ...state.accuracy } : null,
    cost: state ? {
      lastTotalMs: state.cost.lastTotalMs,
      lastFootIkMs: state.cost.lastFootIkMs,
      lastHandPinMs: state.cost.lastHandPinMs,
      avgTotalMs: state.cost.avgTotalMs,
      maxTotalMs: state.cost.maxTotalMs,
      samples: state.cost.samples
    } : null,
    byTier: state ? { high: { ...state.byTier.high }, medium: { ...state.byTier.medium }, low: { ...state.byTier.low } } : null
  };
}
