import { eyePosition, aimDirection, traceObstruction } from '../world/spatial.js';
import { SOUND_SPEED_MPS } from '../world/m02-horizon-system.js';

export const WEAPON_CLEARANCE_DIST_M = 0.78;

export const MATERIAL_IMPACT_AUDIO_MAP = Object.freeze({
  stone: Object.freeze({ cueId: 'sfx_impact_stone_ricochet', surfaceFamily: 'stone', isMetallic: false }),
  brick: Object.freeze({ cueId: 'sfx_impact_brick_masonry', surfaceFamily: 'masonry', isMetallic: false }),
  earth: Object.freeze({ cueId: 'sfx_impact_earth_wet_thud', surfaceFamily: 'earth', isMetallic: false }),
  wood_thick: Object.freeze({ cueId: 'sfx_impact_wood_structural', surfaceFamily: 'wood', isMetallic: false }),
  wood_thin: Object.freeze({ cueId: 'sfx_impact_wood_splinter', surfaceFamily: 'wood', isMetallic: false }),
  glass: Object.freeze({ cueId: 'sfx_impact_glass_shatter', surfaceFamily: 'glass', isMetallic: false }),
  metal: Object.freeze({ cueId: 'sfx_impact_metal_ping', surfaceFamily: 'metal', isMetallic: true }),
  foliage: Object.freeze({ cueId: 'sfx_impact_foliage_rustle', surfaceFamily: 'foliage', isMetallic: false }),
  actor: Object.freeze({ cueId: 'sfx_impact_cloth_body', surfaceFamily: 'organic', isMetallic: false }),
  air: Object.freeze({ cueId: 'sfx_bullet_whiz_air', surfaceFamily: 'air', isMetallic: false }),
});

export const DEFAULT_ACCESSIBILITY_OPTIONS = Object.freeze({
  subtitlesEnabled: true,
  directionalIndicatorsEnabled: true,
  reducedDynamicRange: false,
  tinnitusIntensity: 0.5, // 0.0 (muted tinnitus) .. 1.0 (full)
  reducedCameraShake: false,
  reducedViolence: false,
});

export class M02AudiovisualDirector {
  constructor() {
    this.reset();
  }

  reset() {
    this.accessibility = { ...DEFAULT_ACCESSIBILITY_OPTIONS };
    this.weaponKinematics = {
      clearanceState: 'READY', // 'READY' | 'LOWERED_NEAR_OBSTACLE'
      obstructionId: null,
      obstructionDistanceM: WEAPON_CLEARANCE_DIST_M,
      lowerPitchRad: 0,
      pullBackM: 0,
      recoilPitchRad: 0,
      recoilKickBackM: 0,
    };
    this.cameraShake = {
      amplitudeRad: 0,
      tinnitusLevel: 0,
    };
    this.spatialAudioLog = [];
    this.directionalIndicators = [];
  }

  setAccessibilityOptions(partial = {}) {
    if (typeof partial.subtitlesEnabled === 'boolean') {
      this.accessibility.subtitlesEnabled = partial.subtitlesEnabled;
    }
    if (typeof partial.directionalIndicatorsEnabled === 'boolean') {
      this.accessibility.directionalIndicatorsEnabled = partial.directionalIndicatorsEnabled;
    }
    if (typeof partial.reducedDynamicRange === 'boolean') {
      this.accessibility.reducedDynamicRange = partial.reducedDynamicRange;
    }
    if (typeof partial.tinnitusIntensity === 'number' && Number.isFinite(partial.tinnitusIntensity)) {
      this.accessibility.tinnitusIntensity = Math.max(0, Math.min(1, partial.tinnitusIntensity));
    }
    if (typeof partial.reducedCameraShake === 'boolean') {
      this.accessibility.reducedCameraShake = partial.reducedCameraShake;
    }
    if (typeof partial.reducedViolence === 'boolean') {
      this.accessibility.reducedViolence = partial.reducedViolence;
    }
    return structuredClone(this.accessibility);
  }

  evaluateWeaponClearance(sim) {
    const eye = eyePosition(sim.player);
    const dir = aimDirection(sim.player.angle, sim.player.pitch);
    const obs = traceObstruction(sim.world, eye, dir, WEAPON_CLEARANCE_DIST_M);
    if (obs && obs.distance < WEAPON_CLEARANCE_DIST_M) {
      const factor = Number((1 - obs.distance / WEAPON_CLEARANCE_DIST_M).toFixed(3));
      this.weaponKinematics.clearanceState = 'LOWERED_NEAR_OBSTACLE';
      this.weaponKinematics.obstructionId = obs.id;
      this.weaponKinematics.obstructionDistanceM = Number(obs.distance.toFixed(3));
      this.weaponKinematics.lowerPitchRad = Number((0.42 * factor).toFixed(3));
      this.weaponKinematics.pullBackM = Number((0.24 * factor).toFixed(3));
    } else {
      this.weaponKinematics.clearanceState = 'READY';
      this.weaponKinematics.obstructionId = null;
      this.weaponKinematics.obstructionDistanceM = WEAPON_CLEARANCE_DIST_M;
      this.weaponKinematics.lowerPitchRad = 0;
      this.weaponKinematics.pullBackM = 0;
    }
    return structuredClone(this.weaponKinematics);
  }

  onPlayerShotFired(sim, shotRecord) {
    const stanceFactor = sim.player.crouched ? 0.68 : 1.0;
    this.weaponKinematics.recoilPitchRad = Number((0.065 * stanceFactor).toFixed(4));
    this.weaponKinematics.recoilKickBackM = Number((0.045 * stanceFactor).toFixed(4));

    if (shotRecord?.point) {
      const matKey = shotRecord.hitTarget ? 'actor' : (shotRecord.material ?? 'air');
      this.emitSpatialAudioEvent(sim, {
        category: 'ballistic_impact',
        sourcePos: shotRecord.point,
        material: matKey,
        isCriticalWarning: false,
      });
    }
  }

  onExplosionDetonated(sim, blastRecord) {
    if (!blastRecord?.center) return;
    const eye = eyePosition(sim.player);
    const dist = Math.hypot(
      blastRecord.center.x - eye.x,
      blastRecord.center.y - eye.y,
      blastRecord.center.z - eye.z,
    );
    const proximity = Math.max(0, Math.min(1, 1 - dist / 28.0));
    const shakeCap = this.accessibility.reducedCameraShake ? 0.008 : 0.045;
    this.cameraShake.amplitudeRad = Number((proximity * shakeCap).toFixed(4));
    this.cameraShake.tinnitusLevel = Number(
      (proximity * 0.75 * this.accessibility.tinnitusIntensity).toFixed(4),
    );

    this.emitSpatialAudioEvent(sim, {
      category: 'explosion_detonation',
      sourcePos: blastRecord.center,
      material: 'earth',
      isCriticalWarning: false,
    });
  }

  emitSpatialAudioEvent(sim, { category, sourcePos, material = 'earth', isCriticalWarning = false }) {
    const eye = eyePosition(sim.player);
    const dx = sourcePos.x - eye.x;
    const dy = (sourcePos.y ?? 0) - eye.y;
    const dz = sourcePos.z - eye.z;
    const dist = Math.hypot(dx, dy, dz);

    // L3: Three acoustic scales
    const scale =
      dist < 12.0
        ? 'close_mechanical'
        : dist <= 140.0
          ? 'tactical_encounter'
          : 'distant_operation';

    // L3: Critical interface warnings are never delayed by speed of sound
    const delaySec = isCriticalWarning || dist < 15.0 ? 0 : Number((dist / SOUND_SPEED_MPS).toFixed(3));

    // L3: Wall and door occlusion between source and listener
    let occlusionState = 'direct';
    let gainMultiplier = 1.0;
    let lowPassHz = 18000;

    if (dist > 0.35) {
      const dir = { x: -dx / dist, y: -dy / dist, z: -dz / dist };
      const obs = traceObstruction(sim.world, sourcePos, dir, Math.max(0.1, dist - 0.25));
      if (obs) {
        if (obs.role === 'door_leaf') {
          occlusionState = 'closed_door';
          gainMultiplier = 0.52;
          lowPassHz = 1400;
        } else {
          occlusionState = 'solid_wall';
          gainMultiplier = 0.28;
          lowPassHz = 680;
        }
      }
    }

    if (this.accessibility.reducedDynamicRange) {
      gainMultiplier = Number(Math.min(0.75, Math.max(0.38, gainMultiplier)).toFixed(2));
    }

    const matAudio = MATERIAL_IMPACT_AUDIO_MAP[material] ?? MATERIAL_IMPACT_AUDIO_MAP.earth;
    const azimuthRad = Number(Math.atan2(dz, dx).toFixed(3));

    const record = {
      id: `aud_${this.spatialAudioLog.length + 1}`,
      clock: Number(sim.clock.toFixed(3)),
      category,
      scale,
      material,
      cueId: matAudio.cueId,
      surfaceFamily: matAudio.surfaceFamily,
      isMetallic: matAudio.isMetallic,
      distanceM: Number(dist.toFixed(2)),
      delaySec,
      occlusionState,
      gainMultiplier,
      lowPassHz,
      azimuthRad,
    };

    this.spatialAudioLog.push(record);
    if (this.spatialAudioLog.length > 160) {
      this.spatialAudioLog.shift();
    }

    if (this.accessibility.directionalIndicatorsEnabled && (category === 'enemy_fire' || category === 'explosion_detonation')) {
      this.directionalIndicators.push({
        azimuthRad,
        category,
        expiresAt: Number((sim.clock + 2.2).toFixed(2)),
      });
    }

    return record;
  }

  update(sim, dt) {
    this.evaluateWeaponClearance(sim);

    // Recover recoil smoothly
    this.weaponKinematics.recoilPitchRad = Number(
      Math.max(0, this.weaponKinematics.recoilPitchRad - dt * 0.22).toFixed(4),
    );
    this.weaponKinematics.recoilKickBackM = Number(
      Math.max(0, this.weaponKinematics.recoilKickBackM - dt * 0.16).toFixed(4),
    );

    // Decay bounded camera shake and tinnitus
    this.cameraShake.amplitudeRad = Number(
      Math.max(0, this.cameraShake.amplitudeRad - dt * 0.06).toFixed(4),
    );
    this.cameraShake.tinnitusLevel = Number(
      Math.max(0, this.cameraShake.tinnitusLevel - dt * 0.18).toFixed(4),
    );

    this.directionalIndicators = this.directionalIndicators.filter((ind) => sim.clock < ind.expiresAt);
  }

  snapshot() {
    return {
      accessibility: structuredClone(this.accessibility),
      weaponKinematics: structuredClone(this.weaponKinematics),
      cameraShake: structuredClone(this.cameraShake),
    };
  }

  restore(snap) {
    if (!snap) return;
    if (snap.accessibility) this.accessibility = structuredClone(snap.accessibility);
    if (snap.weaponKinematics) this.weaponKinematics = structuredClone(snap.weaponKinematics);
    if (snap.cameraShake) this.cameraShake = structuredClone(snap.cameraShake);
  }
}
