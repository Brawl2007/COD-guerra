import * as THREE from 'three';
import { isExactClip } from './m01-animation-resolver.js';

// M01 character foot IK and root ramp inclination (roadmap T37 · M01-ANIM-FIDELITY-IK-BUDGET-V1).
// Ported from the external Argon delivery (Gemini) onto the integration candidate and reworked: allocation-free hot path,
// world-axis tilt, matrix refresh restricted to the touched chains.
// Presentation only: reads terrain height through the world's authoritative `heightAt` and adjusts pelvis/spine/neck/leg/ankle
// bone transforms after AnimationPlayer.apply(). Never mutates actors, hitboxes, weapon bones, simulation state, RNG or saves.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const round4 = v => Math.round(v * 1e4) / 1e4;
const round5 = v => Math.round(v * 1e5) / 1e5;

/** Authored ankle bone (`foot_l` / `foot_r`) height above the boot sole in bind pose (metres). Verified against the soldier GLBs. */
export const ANKLE_SOLE_OFFSET = 0.0718;
/** Authored forefoot bone (`ball_l` / `ball_r`) height above the boot sole in bind pose (metres). Verified against the soldier GLBs. */
export const BALL_SOLE_OFFSET = 0.02832;
/** Acceptance tolerance for planted boots on M01 ramps (2 cm = 0.02 m). */
export const BOOT_TOLERANCE_M = 0.02;
/** Authored clip ankle lift below which a foot is in stance contact and locked to the terrain. */
export const STANCE_CAPTURE_LIFT_M = 0.025;
/** Authored clip ankle lift above which a swinging foot is in full flight above the terrain. */
export const SWING_RELEASE_LIFT_M = 0.065;
/** Maximum downward pelvis offset when standing/walking on steep embankments (metres). */
export const MAX_PELVIS_DROP_M = 0.24;
/** Maximum upward pelvis offset on concave transitions (metres). */
export const MAX_PELVIS_LIFT_M = 0.06;
/** Damped lean into longitudinal ramps (fraction of the terrain pitch angle). */
export const RAMP_PITCH_FACTOR = 0.36;
/** Damped lean into lateral cross-slopes (fraction of the terrain roll angle). */
export const RAMP_ROLL_FACTOR = 0.26;
/** Maximum pelvis lean into a ramp (radians, ~12.6 deg). */
export const MAX_RAMP_PITCH_RAD = 0.22;
/** Maximum pelvis lean into a cross-slope (radians, ~9.2 deg). */
export const MAX_RAMP_ROLL_RAD = 0.16;
/** Maximum subtalar ankle roll on cross-slopes (radians, ~16 deg). */
export const MAX_ANKLE_ROLL_RAD = 0.28;
/** Finite-difference horizontal step (metres) used to sample terrain gradient around an actor. */
export const SLOPE_SAMPLE_STEP_M = 0.35;
/** Vertical discontinuity threshold (metres) separating continuous ramps from vertical bridge abutment walls. */
export const LEDGE_STEP_GUARD_M = 0.45;

/** Authored clips whose pose is not standing/crouching on both feet: Foot IK must not touch them. */
export const NON_GROUND_CLIPS = Object.freeze(new Set([
  'fallen',
  'wounded',
  'carried',
  'seated',
  'drag_wounded',
  'rkm_prone',
  'rkm_prone_fire',
  'seated_b'
]));
/** Prefix families that are never ground clips: prone transitions, Bąk pickup/putdown, and the exact crew/station adapters. */
const NON_GROUND_FAMILY = /^(prone_|death_|seated_|carry_pickup_|carry_putdown_|mg34_|ckm_wz30_|station_drag_)/;

/** Clips that alternate stance and swing phases (used for the stride impact compression and the lean boost). */
export const LOCOMOTION_CLIPS = Object.freeze(new Set([
  'walk',
  'run',
  'sprint',
  'crouch_walk',
  'turn_left',
  'turn_right',
  'rkm_walk',
  'rkm_run',
  'carry_wounded',
  'carry_walk'
]));

/**
 * Reusable terrain sampler (no closures per frame). `source` is a world exposing `heightAt(x, z)` or a plain function.
 * The local terrain differential is anchored to `actor.y`, so a static spawn with a slight vertical offset from `heightAt` still
 * plants its boots on the exact local slope around the rendered root.
 */
export class GroundSampler {
  constructor() {
    this.source = null;
    this.fn = null;
    this.offset = 0;
  }
  bind(source, actor = null) {
    this.fn = typeof source === 'function' ? source : null;
    this.source = this.fn ? null : source;
    this.offset = 0;
    if (actor && Number.isFinite(actor.x) && Number.isFinite(actor.z) && Number.isFinite(actor.y)) {
      const offset = actor.y - this.raw(actor.x, actor.z);
      if (Math.abs(offset) > 1e-5) this.offset = offset;
    }
    return this;
  }
  raw(x, z) {
    return this.fn ? this.fn(x, z) : this.source.heightAt(x, z);
  }
  heightAt(x, z) {
    return this.raw(x, z) + this.offset;
  }
}
const _ground = new GroundSampler();

/** Samples terrain height around `anchorY`, rejecting vertical abutment/cliff jumps (`> maxStep`). */
export function sampleContinuousGroundY(ground, x, z, anchorY, maxStep = LEDGE_STEP_GUARD_M) {
  const y = ground.heightAt(x, z);
  if (!Number.isFinite(anchorY)) return y;
  return Math.abs(y - anchorY) > maxStep ? anchorY : y;
}

/**
 * Invariants I7/I8 gate: true only for a living, active, uncarried, upright/crouched actor that does not play an exact
 * station/crew/prone/casualty clip. Anything else keeps its authored pose bit-for-bit.
 */
export function isFootIkEligible(actor, clipName) {
  if (!actor || !actor.active || actor.alive === false) return false;
  if (actor.state === 'WOUNDED' || actor.carriedBy || actor.posture === 'prone') return false;
  if (actor.mg34Prone && (actor.mg34Prone.progress > 0 || (actor.mg34Prone.phase && actor.mg34Prone.phase !== 'standing'))) return false;
  if (actor.group === 'grp_ckm_crew' && (actor.id === 'ckm_gunner' || actor.id === 'ckm_loader') && actor.ckm?.phase !== 'retreat') return false;
  if (!clipName || isExactClip(clipName) || NON_GROUND_CLIPS.has(clipName) || NON_GROUND_FAMILY.test(clipName)) return false;
  return true;
}

// Reusable result for sampleRampInclination (module scratch; callers that keep it pass their own `out`).
const _slope = { groundY: 0, slopeForward: 0, slopeRight: 0, slopeAngleRad: 0, slopeDeg: 0, pitch: 0, roll: 0 };

function sampleRamp(x, z, fx, fz, ground, step, out) {
  const rx = -fz;
  const rz = fx;
  const groundY = ground.heightAt(x, z);
  const rawFront = ground.heightAt(x + fx * step, z + fz * step);
  const rawBack = ground.heightAt(x - fx * step, z - fz * step);
  const rawRight = ground.heightAt(x + rx * step, z + rz * step);
  const rawLeft = ground.heightAt(x - rx * step, z - rz * step);

  // Guard against vertical bridge deck / abutment cliff edges so the continuous ramp gradient is used.
  const frontJump = Math.abs(rawFront - groundY) > LEDGE_STEP_GUARD_M;
  const backJump = Math.abs(rawBack - groundY) > LEDGE_STEP_GUARD_M;
  const rightJump = Math.abs(rawRight - groundY) > LEDGE_STEP_GUARD_M;
  const leftJump = Math.abs(rawLeft - groundY) > LEDGE_STEP_GUARD_M;
  const hFront = frontJump ? (backJump ? groundY : groundY + (groundY - rawBack)) : rawFront;
  const hBack = backJump ? (frontJump ? groundY : groundY - (rawFront - groundY)) : rawBack;
  const hRight = rightJump ? (leftJump ? groundY : groundY + (groundY - rawLeft)) : rawRight;
  const hLeft = leftJump ? (rightJump ? groundY : groundY - (rawRight - groundY)) : rawLeft;

  const slopeForward = (hFront - hBack) / (2 * step);
  const slopeRight = (hRight - hLeft) / (2 * step);
  const slopeAngleRad = Math.atan(Math.hypot(slopeForward, slopeRight));
  out.groundY = groundY;
  out.slopeForward = slopeForward;
  out.slopeRight = slopeRight;
  out.slopeAngleRad = slopeAngleRad;
  out.slopeDeg = slopeAngleRad * (180 / Math.PI);
  // Lean INTO the slope: positive `pitch` = lean forward (uphill ahead), positive `roll` = lean toward the rising right side.
  out.pitch = clamp(Math.atan(slopeForward) * RAMP_PITCH_FACTOR, -MAX_RAMP_PITCH_RAD, MAX_RAMP_PITCH_RAD);
  out.roll = clamp(Math.atan(slopeRight) * RAMP_ROLL_FACTOR, -MAX_RAMP_ROLL_RAD, MAX_RAMP_ROLL_RAD);
  return out;
}

/**
 * Samples real terrain height and longitudinal/lateral slope in the actor's horizontal facing frame.
 * Forward in M01 world space is `(cos(yaw), 0, sin(yaw))`; right is `(-sin(yaw), 0, cos(yaw))`.
 * `ground` is a world (or sampler) exposing `heightAt(x, z)`.
 */
export function sampleRampInclination(actor, ground, step = SLOPE_SAMPLE_STEP_M, out = {}) {
  const yaw = Number.isFinite(actor?.bodyYaw) ? actor.bodyYaw : (actor?.facing ?? 0);
  return sampleRamp(actor?.x ?? 0, actor?.z ?? 0, Math.cos(yaw), Math.sin(yaw), ground, step, out);
}

// ---------------------------------------------------------------------------------------------------------------------
// Matrix helpers. IK edits local bone transforms, so only the touched chains are refreshed; the caller runs one full
// root.updateMatrixWorld(true) at the end. Precondition: every bone's matrixWorld is current when an actor's IK starts.
// ---------------------------------------------------------------------------------------------------------------------
const _dp = new THREE.Vector3();
const _ds = new THREE.Vector3();
const _pq = new THREE.Quaternion();

/** Recomputes `matrix` and `matrixWorld` of a single bone from its local transform and its (already current) parent. */
export function refreshBone(bone) {
  bone.updateMatrix();
  if (bone.parent) bone.matrixWorld.multiplyMatrices(bone.parent.matrixWorld, bone.matrix);
  else bone.matrixWorld.copy(bone.matrix);
}
/** World position of a bone from its current `matrixWorld` (no ancestor traversal). */
export function worldPosition(bone, out) {
  return out.setFromMatrixPosition(bone.matrixWorld);
}
/** World orientation of a bone from its current `matrixWorld` (no ancestor traversal). */
export function worldQuaternion(bone, out) {
  bone.matrixWorld.decompose(_dp, out, _ds);
  return out;
}
/** Sets a bone's world orientation by writing its local quaternion. The parent's `matrixWorld` must be current. */
export function setWorldQuaternion(bone, quaternion) {
  if (bone.parent) {
    worldQuaternion(bone.parent, _pq);
    bone.quaternion.copy(_pq.invert().multiply(quaternion));
  } else {
    bone.quaternion.copy(quaternion);
  }
}

// Scratch objects (module scope: zero allocation per actor per frame).
const _oldUpper = new THREE.Vector3();
const _oldMid = new THREE.Vector3();
const _oldEnd = new THREE.Vector3();
const _target = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _bendDir = new THREE.Vector3();
const _poleVec = new THREE.Vector3();
const _newMid = new THREE.Vector3();
const _newEnd = new THREE.Vector3();
const _vOld = new THREE.Vector3();
const _vNew = new THREE.Vector3();
const _curMid = new THREE.Vector3();
const _curEnd = new THREE.Vector3();
const _qWorld = new THREE.Quaternion();
const _qDelta = new THREE.Quaternion();

/**
 * Analytical two-bone IK (law of cosines; the first-person arms in m01-fp-hands.js use the same formulation).
 * Preserves both segment lengths, rotates only `upperBone` and `midBone`, and leaves their bone offsets untouched.
 * Preconditions: matrixWorld of the three bones is current. Postcondition: it is current for the three bones again.
 * `poleHint` (world position, optional) picks the bend plane; without it the current mid-joint side is kept.
 */
export function solveTwoBoneIk(upperBone, midBone, endBone, targetWorld, poleHint = null, weight = 1) {
  if (!upperBone || !midBone || !endBone || weight <= 0) return false;
  worldPosition(upperBone, _oldUpper);
  worldPosition(midBone, _oldMid);
  worldPosition(endBone, _oldEnd);

  _target.copy(_oldEnd).lerp(targetWorld, clamp(weight, 0, 1));
  const a = _oldUpper.distanceTo(_oldMid);
  const b = _oldMid.distanceTo(_oldEnd);
  const maxReach = a + b - 1e-5;
  const minReach = Math.abs(a - b) + 1e-5;

  _dir.copy(_target).sub(_oldUpper);
  const rawDist = _dir.length();
  if (rawDist < 1e-6) return false;
  const dist = clamp(rawDist, minReach, maxReach);
  _dir.multiplyScalar(1 / rawDist);

  _bendDir.set(0, 0, 0);
  if (poleHint) {
    _poleVec.copy(poleHint).sub(_oldUpper);
    _bendDir.copy(_poleVec).addScaledVector(_dir, -_poleVec.dot(_dir));
  }
  if (_bendDir.lengthSq() < 1e-6) {
    _poleVec.copy(_oldMid).sub(_oldUpper);
    _bendDir.copy(_poleVec).addScaledVector(_dir, -_poleVec.dot(_dir));
  }
  if (_bendDir.lengthSq() < 1e-6) _bendDir.set(0, 0, -1).addScaledVector(_dir, _dir.z);
  _bendDir.normalize();

  const along = (a * a - b * b + dist * dist) / (2 * dist);
  const height = Math.sqrt(Math.max(0, a * a - along * along));
  _newMid.copy(_oldUpper).addScaledVector(_dir, along).addScaledVector(_bendDir, height);
  _newEnd.copy(_oldUpper).addScaledVector(_dir, dist);

  // Upper bone: swing the existing upper->mid direction onto the solved one.
  _vOld.copy(_oldMid).sub(_oldUpper).normalize();
  _vNew.copy(_newMid).sub(_oldUpper).normalize();
  _qDelta.setFromUnitVectors(_vOld, _vNew);
  worldQuaternion(upperBone, _qWorld);
  setWorldQuaternion(upperBone, _qDelta.multiply(_qWorld));
  refreshBone(upperBone);
  refreshBone(midBone);
  refreshBone(endBone);

  // Mid bone: swing the (now moved) mid->end direction onto mid->solved end.
  worldPosition(midBone, _curMid);
  worldPosition(endBone, _curEnd);
  _vOld.copy(_curEnd).sub(_curMid).normalize();
  _vNew.copy(_newEnd).sub(_curMid).normalize();
  _qDelta.setFromUnitVectors(_vOld, _vNew);
  worldQuaternion(midBone, _qWorld);
  setWorldQuaternion(midBone, _qDelta.multiply(_qWorld));
  refreshBone(midBone);
  refreshBone(endBone);
  return true;
}

const _fPos = new THREE.Vector3();
const _bPos = new THREE.Vector3();
const _fToB = new THREE.Vector3();
const _horizDir = new THREE.Vector3();
const _desiredDir = new THREE.Vector3();
const _oldFootDir = new THREE.Vector3();
const _blendedDir = new THREE.Vector3();

/**
 * Ankle alignment for a planted boot:
 * 1. Two-pass pitch about the ankle so the forefoot (`ball`) lands on the ramp.
 * 2. Subtalar roll about the `foot -> ball` axis so the sole banks into cross-slopes without moving either bone.
 * Preconditions: the foot (and its ball) matrixWorld is current. Postcondition: it is current for both again.
 */
export function alignFootToSlope(footBone, ballBone, ground, lift = 0, weight = 1, slopeRight = 0) {
  if (!footBone || !ballBone || weight <= 0) return;
  const w = clamp(weight, 0, 1);
  for (let pass = 0; pass < 2; pass++) {
    worldPosition(footBone, _fPos);
    worldPosition(ballBone, _bPos);
    _fToB.copy(_bPos).sub(_fPos);
    const len = _fToB.length();
    if (len < 1e-5) return;

    const ankleGroundY = _fPos.y - ANKLE_SOLE_OFFSET - lift;
    const ballGroundY = sampleContinuousGroundY(ground, _bPos.x, _bPos.z, ankleGroundY, 0.25);
    const targetBallY = ballGroundY + BALL_SOLE_OFFSET + lift;
    const dy = clamp(targetBallY - _fPos.y, -len * 0.82, len * 0.82);
    const horizLen = Math.sqrt(Math.max(1e-6, len * len - dy * dy));
    _horizDir.set(_fToB.x, 0, _fToB.z);
    if (_horizDir.lengthSq() < 1e-6) return;
    _horizDir.normalize();

    _desiredDir.copy(_horizDir).multiplyScalar(horizLen);
    _desiredDir.y = dy;
    _desiredDir.normalize();

    _oldFootDir.copy(_fToB).multiplyScalar(1 / len);
    _blendedDir.copy(_oldFootDir).lerp(_desiredDir, w).normalize();
    _qDelta.setFromUnitVectors(_oldFootDir, _blendedDir);
    worldQuaternion(footBone, _qWorld);
    setWorldQuaternion(footBone, _qDelta.multiply(_qWorld));
    refreshBone(footBone);
    refreshBone(ballBone);
  }

  if (Math.abs(slopeRight) > 1e-3) {
    worldPosition(footBone, _fPos);
    worldPosition(ballBone, _bPos);
    _blendedDir.copy(_bPos).sub(_fPos);
    if (_blendedDir.lengthSq() > 1e-6) {
      _blendedDir.normalize();
      const subtalarRoll = clamp(-Math.atan(slopeRight) * 0.72, -MAX_ANKLE_ROLL_RAD, MAX_ANKLE_ROLL_RAD) * w;
      _qDelta.setFromAxisAngle(_blendedDir, subtalarRoll);
      worldQuaternion(footBone, _qWorld);
      setWorldQuaternion(footBone, _qDelta.multiply(_qWorld));
      refreshBone(footBone);
      refreshBone(ballBone);
    }
  }
}

/** Effective vertical foot lift above the ramp for a clip foot that rises `relLift` above its lower partner (metres). */
export function resolveFootClipLift(relLift) {
  if (relLift <= STANCE_CAPTURE_LIFT_M) return 0;
  return relLift * smoothstep(STANCE_CAPTURE_LIFT_M, SWING_RELEASE_LIFT_M, relLift);
}

const _axisRight = new THREE.Vector3();
const _axisFwd = new THREE.Vector3();
const _tiltA = new THREE.Quaternion();
const _tiltB = new THREE.Quaternion();
const _boneWorld = new THREE.Quaternion();

/** Rotates `bone` about the world right axis by `pitch` and the world forward axis by `roll`, around the bone origin. */
function tiltBoneWorld(bone, pitch, roll) {
  _tiltA.setFromAxisAngle(_axisRight, pitch);
  _tiltB.setFromAxisAngle(_axisFwd, roll);
  _tiltB.multiply(_tiltA);
  refreshBone(bone); // its parent may have just moved
  worldQuaternion(bone, _boneWorld);
  setWorldQuaternion(bone, _tiltB.multiply(_boneWorld));
  refreshBone(bone);
}

/**
 * Progressive ramp inclination in the actor's world frame (lean INTO the slope):
 * - `full` (legs are re-solved by IK): the pelvis (`hips`) leans, `spine_01` / `spine_02` give back part of it and `neck` keeps the
 *   gaze toward the horizon (net shoulder lean 0.35, head 0.07 of the pelvis lean).
 * - `upperOnly` (no leg IK, distant actors): the same net lean is applied from `spine_01` up so the unsolved feet never swing.
 * `slope` is the result of sampleRamp; `fx`/`fz` the actor's horizontal forward vector.
 */
export function applyRootRampInclination(rig, slope, fx, fz, clipName, weight = 1, upperOnly = false) {
  if (!rig?.hips || weight <= 0 || Math.abs(slope.pitch) + Math.abs(slope.roll) < 1e-5) return false;
  const w = clamp(weight, 0, 1);
  const boost = LOCOMOTION_CLIPS.has(clipName) ? 1.12 : 1;
  // Rotation about the right axis by -lean tilts "up" forward; rotation about forward by +lean tilts "up" toward the right.
  const pitch = -clamp(slope.pitch * boost, -MAX_RAMP_PITCH_RAD, MAX_RAMP_PITCH_RAD) * w;
  const roll = clamp(slope.roll * boost, -MAX_RAMP_ROLL_RAD, MAX_RAMP_ROLL_RAD) * w;
  _axisFwd.set(fx, 0, fz);
  _axisRight.set(-fz, 0, fx);

  if (upperOnly) {
    if (rig.spine_01) tiltBoneWorld(rig.spine_01, pitch * 0.35, roll * 0.35);
    if (rig.spine_02) refreshBone(rig.spine_02);
    if (rig.spine_03) refreshBone(rig.spine_03);
    if (rig.neck) tiltBoneWorld(rig.neck, -pitch * 0.28, -roll * 0.28);
    if (rig.head) refreshBone(rig.head);
    return true;
  }
  tiltBoneWorld(rig.hips, pitch, roll);
  if (rig.spine_01 && rig.spine_02) {
    tiltBoneWorld(rig.spine_01, -pitch * 0.38, -roll * 0.38);
    tiltBoneWorld(rig.spine_02, -pitch * 0.27, -roll * 0.27);
  } else if (rig.spine_01) {
    tiltBoneWorld(rig.spine_01, -pitch * 0.65, -roll * 0.65);
  }
  if (rig.spine_03) refreshBone(rig.spine_03);
  if (rig.neck) tiltBoneWorld(rig.neck, -pitch * 0.28, -roll * 0.28);
  if (rig.head) refreshBone(rig.head);
  return true;
}

const _probeFoot = new THREE.Vector3();
const _ballWorld = new THREE.Vector3();
const _targetLWorld = new THREE.Vector3();
const _targetRWorld = new THREE.Vector3();
const _poleLWorld = new THREE.Vector3();
const _poleRWorld = new THREE.Vector3();
const _rootPos = new THREE.Vector3();
const _shiftVec = new THREE.Vector3();
const _preFootL = new THREE.Vector3();
const _preFootR = new THREE.Vector3();

const DEFAULT_FOOT_OPTIONS = Object.freeze({ mode: 'full', weight: 1, measure: true });

/** Fresh Foot IK result record (reused per instance by the caller). */
export function createFootIkRecord() {
  return { active: false, mode: 'none', slopeDeg: 0, pitch: 0, roll: 0, pelvisDropM: 0, leftClearanceM: null, rightClearanceM: null, stanceClearanceM: null };
}

function clearFootIkRecord(out) {
  out.active = false;
  out.mode = 'none';
  out.slopeDeg = 0;
  out.pitch = 0;
  out.roll = 0;
  out.pelvisDropM = 0;
  out.leftClearanceM = null;
  out.rightClearanceM = null;
  out.stanceClearanceM = null;
  return out;
}

function refreshLeg(thigh, calf, foot, ball) {
  refreshBone(thigh);
  refreshBone(calf);
  refreshBone(foot);
  if (ball) refreshBone(ball);
}

function footClearance(ground, foot, ball, anchorY) {
  worldPosition(foot, _probeFoot);
  const groundY = sampleContinuousGroundY(ground, _probeFoot.x, _probeFoot.z, anchorY);
  let clearance = Math.abs((_probeFoot.y - ANKLE_SOLE_OFFSET) - groundY);
  if (ball) {
    worldPosition(ball, _ballWorld);
    const ballGroundY = sampleContinuousGroundY(ground, _ballWorld.x, _ballWorld.z, groundY, 0.25);
    clearance = Math.max(clearance, Math.abs((_ballWorld.y - BALL_SOLE_OFFSET) - ballGroundY));
  }
  return clearance;
}

/**
 * Full Foot IK + ramp inclination pass for one actor instance. Modes: `'full'`, `'foot_slope'`, `'slope_only'`.
 * `ground` is a world exposing `heightAt(x, z)` (or a function). Writes into and returns `out`.
 * Precondition: every bone matrixWorld of `rig.rootNode` is current (the caller updated the root after sampling).
 * Postcondition: the touched chains are current; the caller refreshes the whole root once.
 */
export function solveActorFootIk(rig, actor, clipName, ground, options = DEFAULT_FOOT_OPTIONS, out = createFootIkRecord()) {
  const { mode = 'full', weight = 1, measure = true } = options;
  clearFootIkRecord(out);
  if (!rig || !isFootIkEligible(actor, clipName) || mode === 'clip_only' || mode === 'none' || weight <= 0) return out;
  const w = clamp(weight, 0, 1);
  const sampler = _ground.bind(ground, actor);

  // Forward direction and root height come from the rendered root, so the torso-twisted/body-yaw root is what the IK follows.
  const rm = rig.rootNode.matrixWorld.elements;
  let fx = -rm[8];
  let fz = -rm[10];
  const fl = Math.hypot(fx, fz);
  if (fl < 1e-6) {
    fx = 1;
    fz = 0;
  } else {
    fx /= fl;
    fz /= fl;
  }
  _rootPos.setFromMatrixPosition(rig.rootNode.matrixWorld);

  const legs = rig.hasLegIk && mode !== 'slope_only';
  const slope = sampleRamp(actor.x ?? _rootPos.x, actor.z ?? _rootPos.z, fx, fz, sampler, SLOPE_SAMPLE_STEP_M, _slope);

  let liftL = 0;
  let liftR = 0;
  let desiredLY = 0;
  let desiredRY = 0;
  let shift = 0;
  if (legs) {
    // The clip plants the feet: keep their authored horizontal positions, and only change their height to the terrain.
    worldPosition(rig.foot_l, _preFootL);
    worldPosition(rig.foot_r, _preFootR);
    const rawL = Math.max(0, (_preFootL.y - _rootPos.y) - ANKLE_SOLE_OFFSET);
    const rawR = Math.max(0, (_preFootR.y - _rootPos.y) - ANKLE_SOLE_OFFSET);
    const minRaw = Math.min(rawL, rawR);
    liftL = resolveFootClipLift(rawL - minRaw);
    liftR = resolveFootClipLift(rawR - minRaw);
    let impact = 0;
    if (LOCOMOTION_CLIPS.has(clipName)) {
      const loadFactor = clipName === 'carry_wounded' || clipName === 'carry_walk' ? 1.45 : clipName.startsWith('rkm_') ? 1.35 : 1;
      impact = -clamp(Math.max(liftL, liftR) * 0.06 * loadFactor, 0, 0.018);
    }
    desiredLY = sampleContinuousGroundY(sampler, _preFootL.x, _preFootL.z, slope.groundY) + ANKLE_SOLE_OFFSET + liftL;
    desiredRY = sampleContinuousGroundY(sampler, _preFootR.x, _preFootR.z, slope.groundY) + ANKLE_SOLE_OFFSET + liftR;
    // The pelvis follows the foot that has to reach lowest (most extended leg); the other knee simply bends more.
    shift = clamp(Math.min(desiredLY - _preFootL.y, desiredRY - _preFootR.y) + impact, -MAX_PELVIS_DROP_M, MAX_PELVIS_LIFT_M) * w;
  }

  const tilted = applyRootRampInclination(rig, slope, fx, fz, clipName, w, !legs);
  out.slopeDeg = round4(slope.slopeDeg);
  out.pitch = round4(tilted ? slope.pitch : 0);
  out.roll = round4(tilted ? slope.roll : 0);

  if (!legs) {
    out.active = tilted;
    out.mode = 'slope_only';
    return out;
  }

  out.pelvisDropM = round4(shift);
  if (Math.abs(shift) > 1e-5) {
    // Move the pelvis vertically and give the offset back to the spine so shoulders (and the hands on the weapon) stay put.
    rig.hips.position.y += shift;
    refreshBone(rig.hips);
    if (rig.spine_01) {
      worldQuaternion(rig.hips, _boneWorld).invert();
      rig.spine_01.position.sub(_shiftVec.set(0, shift, 0).applyQuaternion(_boneWorld));
    }
  }
  // Re-derive hips -> spine -> neck -> head and the legs from the final pelvis.
  refreshBone(rig.hips);
  if (rig.spine_01) refreshBone(rig.spine_01);
  if (rig.spine_02) refreshBone(rig.spine_02);
  if (rig.spine_03) refreshBone(rig.spine_03);
  if (rig.neck) refreshBone(rig.neck);
  if (rig.head) refreshBone(rig.head);
  refreshLeg(rig.thigh_l, rig.calf_l, rig.foot_l, rig.ball_l);
  refreshLeg(rig.thigh_r, rig.calf_r, rig.foot_r, rig.ball_r);

  // Knees point forward (slightly splayed when crouching), whatever the authored leg line is.
  const splay = actor.crouched ? 0.04 : 0.015;
  const rx = -fz;
  const rz = fx;
  worldPosition(rig.calf_l, _poleLWorld);
  worldPosition(rig.calf_r, _poleRWorld);
  _poleLWorld.x += fx * 0.36 - rx * splay;
  _poleLWorld.z += fz * 0.36 - rz * splay;
  _poleRWorld.x += fx * 0.36 + rx * splay;
  _poleRWorld.z += fz * 0.36 + rz * splay;

  _targetLWorld.set(_preFootL.x, desiredLY, _preFootL.z);
  _targetRWorld.set(_preFootR.x, desiredRY, _preFootR.z);
  solveTwoBoneIk(rig.thigh_l, rig.calf_l, rig.foot_l, _targetLWorld, _poleLWorld, w);
  solveTwoBoneIk(rig.thigh_r, rig.calf_r, rig.foot_r, _targetRWorld, _poleRWorld, w);
  if (rig.ball_l) refreshBone(rig.ball_l);
  if (rig.ball_r) refreshBone(rig.ball_r);

  if (rig.ball_l) alignFootToSlope(rig.foot_l, rig.ball_l, sampler, liftL, liftL <= 1e-4 ? w : w * clamp(1 - liftL / 0.12, 0.25, 1), slope.slopeRight);
  if (rig.ball_r) alignFootToSlope(rig.foot_r, rig.ball_r, sampler, liftR, liftR <= 1e-4 ? w : w * clamp(1 - liftR / 0.12, 0.25, 1), slope.slopeRight);

  out.active = true;
  out.mode = mode;
  if (measure) {
    const left = footClearance(sampler, rig.foot_l, rig.ball_l, slope.groundY);
    const right = footClearance(sampler, rig.foot_r, rig.ball_r, slope.groundY);
    out.leftClearanceM = round5(left);
    out.rightClearanceM = round5(right);
    out.stanceClearanceM = round5(Math.min(left, right));
  }
  return out;
}
