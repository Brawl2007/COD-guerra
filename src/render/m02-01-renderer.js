import * as THREE from 'three';
import { eyePosition } from '../world/spatial.js';
import { selectConsumerLod } from './m01-lod-policy.js';
import { WEAPON_PROFILES } from '../game/m02-combat-ai.js';

export const M02_QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({
    id: 'high',
    label: 'Máxima (Desktop / GPU dedicada)',
    pixelRatioCap: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    horizonDetails: true,
    decorativeTufts: 90,
    lodPreset: 'high',
  }),
  medium: Object.freeze({
    id: 'medium',
    label: 'Equilibrada (Portátil / iGPU)',
    pixelRatioCap: 1.25,
    shadows: true,
    shadowMapSize: 512,
    horizonDetails: true,
    decorativeTufts: 40,
    lodPreset: 'medium',
  }),
  low: Object.freeze({
    id: 'low',
    label: 'Otimizada (Chromebook / WebGL leve)',
    pixelRatioCap: 1.0,
    shadows: false,
    shadowMapSize: 512,
    horizonDetails: false,
    decorativeTufts: 0,
    lodPreset: 'low',
  }),
});

export const M02_LIGHTING_PRESETS = Object.freeze({
  afternoon_1939_09_09: Object.freeze({
    id: 'afternoon_1939_09_09',
    label: 'Fim de tarde · 9 Set 1939 (Bzura)',
    skyColor: 0x9aa9b8,
    fogColor: 0xaab4bc,
    fogNear: 55,
    fogFar: 260,
    hemiSky: 0xc8d4e0,
    hemiGround: 0x564d3e,
    hemiIntensity: 0.72,
    sunColor: 0xffdfb0,
    sunIntensity: 1.35,
    sunPosition: [-75, 48, 32],
  }),
  neutral_review: Object.freeze({
    id: 'neutral_review',
    label: 'Luz técnica neutra (Inspeção)',
    skyColor: 0xcad4de,
    fogColor: 0xcad4de,
    fogNear: 120,
    fogFar: 420,
    hemiSky: 0xffffff,
    hemiGround: 0x7c7870,
    hemiIntensity: 1.05,
    sunColor: 0xfff8ec,
    sunIntensity: 1.0,
    sunPosition: [-40, 85, -20],
  }),
});

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

// ───────────────────────────────────────────────────────────────────────────────────────────
// M02 soldier rig: articulated, procedural (no external assets), driven only by real sim state.
// Local model space: +Y up, forward = -Z, right = +X. Group yaw = -facing + PI/2 (unchanged contract).
// Hierarchy: group > root > { legs > hip > knee > ankle } , spine > { chest, abdomen, headPivot, shoulder > elbow, weaponRoot }.
// Hit boxes in world/spatial.js are untouched; silhouette stays inside the same head/torso/legs envelopes.
// ───────────────────────────────────────────────────────────────────────────────────────────
const RIG_HIP_Y = 0.91;
const RIG_THIGH = 0.45;
const RIG_SHIN = 0.4;
const RIG_BOOT_DROP = 0.06;
const RIG_UPPER = 0.3;
const RIG_FORE = 0.28;
const RIG_FALL = Math.PI / 2.2;
const RIG_TAU = Math.PI * 2;
const RIG_EMPLACED_ID = 'DE-A05';
const RIG_EMPLACED_HOME = Object.freeze({ x: 13.2, z: -30.0 });

// Sim facing = atan2(dz, dx), i.e. forward = (cos f, sin f). The rig's forward is -Z, and a Y rotation of phi maps -Z to
// (-sin phi, -cos phi), so phi = -f - PI/2 (same mapping the camera uses). The old "-f + PI/2" made soldiers face backwards.
const rigYawFromFacing = (facing) => -(facing ?? 0) - Math.PI / 2;

const rigClamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rigLerp = (a, b, t) => a + (b - a) * t;
const rigSmooth = (a, b, x) => {
  const t = rigClamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rigDamp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
const rigHash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

// Weapon rig tuning. Weapon-local origin = right-hand grip; barrel runs along -Z.
const RIG_WEAPONS = Object.freeze({
  rifle: Object.freeze({ gripL: [0, -0.035, -0.22], recv: [0, 0.03, -0.08], zShift: 0, drop: 0, sway: 1, recoil: 1, auto: false }),
  rkm: Object.freeze({ gripL: [0, -0.05, -0.34], recv: [0, -0.14, -0.1], zShift: 0.09, drop: 0.03, sway: 0.6, recoil: 0.8, auto: true }),
  mg: Object.freeze({ gripL: [0, -0.06, -0.38], recv: [-0.09, -0.05, -0.14], zShift: 0.12, drop: 0.06, sway: 0.4, recoil: 0.7, auto: true }),
});
// Weapon pose sets in spine space: p = grip position, r = [pitch(+ = muzzle up), yaw(+ = muzzle left), roll].
const RIG_POSES = Object.freeze({
  low: Object.freeze({ p: [0.11, 0.3, -0.1], r: [-0.15, 0.3, 0] }),
  port: Object.freeze({ p: [0.1, 0.4, -0.1], r: [0.45, 0.35, 0] }),
  aim: Object.freeze({ p: [0.12, 0.55, -0.2], r: [0, 0, 0] }),
  reload: Object.freeze({ p: [0.08, 0.3, -0.14], r: [0.85, 0.12, -0.55] }),
});

const rigWeaponKind = (w) => (w === 'rkm_wz28' ? 'rkm' : w === 'mg34' ? 'mg' : 'rifle');

export function createSoldierRigMaterials() {
  const std = (color, roughness, metalness = 0.04, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  return {
    soldier_skin: std(0xc09a7e, 0.8, 0),
    soldier_boot: std(0x241d17, 0.68, 0.08),
    soldier_leather_de: std(0x1d1b19, 0.62, 0.1),
    soldier_leather_pl: std(0x5a3d24, 0.74, 0.05),
    soldier_canvas_de: std(0x6d705a, 0.93, 0),
    soldier_canvas_pl: std(0x8b8466, 0.93, 0),
    soldier_kit_metal: std(0x4a4f48, 0.5, 0.55),
    soldier_pl_trouser: std(0x5d5637, 0.88, 0.02),
    soldier_de_trouser: std(0x4f564d, 0.88, 0.02),
    soldier_pl_helmet: std(0x4f4e32, 0.6, 0.3, { side: THREE.DoubleSide }),
    soldier_de_helmet: std(0x33392f, 0.55, 0.34, { side: THREE.DoubleSide }),
    soldier_medic_white: new THREE.MeshBasicMaterial({ color: 0xf2f2ea }),
    soldier_medic_red: new THREE.MeshBasicMaterial({ color: 0xb3261e }),
    soldier_flash: new THREE.MeshBasicMaterial({
      color: 0xffd37a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  };
}

const rigGeoCache = new Map();
const rigCached = (key, make) => {
  let v = rigGeoCache.get(key);
  if (!v) {
    v = make();
    rigGeoCache.set(key, v);
  }
  return v;
};
const rBox = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const rCyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
const HALF_PI = Math.PI / 2;

const _mm = new THREE.Matrix4();
const _mq = new THREE.Quaternion();
const _me = new THREE.Euler();
const _mn = new THREE.Matrix3();
const _mv = new THREE.Vector3();
const _mp = new THREE.Vector3();
const _ms = new THREE.Vector3(1, 1, 1);

// Merge transformed static parts into one geometry (position + normal + index; no UVs needed, materials are untextured).
function rigMerge(parts) {
  const pos = [];
  const nor = [];
  const idx = [];
  let offset = 0;
  for (const part of parts) {
    const g = part.g;
    _me.set(...(part.r ?? [0, 0, 0]));
    _mq.setFromEuler(_me);
    _mp.set(...part.p);
    _mm.compose(_mp, _mq, _ms);
    _mn.getNormalMatrix(_mm);
    const pa = g.attributes.position;
    const na = g.attributes.normal;
    for (let i = 0; i < pa.count; i++) {
      _mv.fromBufferAttribute(pa, i).applyMatrix4(_mm);
      pos.push(_mv.x, _mv.y, _mv.z);
      _mv.fromBufferAttribute(na, i).applyMatrix3(_mn).normalize();
      nor.push(_mv.x, _mv.y, _mv.z);
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + offset);
    } else {
      for (let i = 0; i < pa.count; i++) idx.push(i + offset);
    }
    offset += pa.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

function rigBodyGeometry() {
  return rigCached('body', () => {
    const flash = new THREE.ConeGeometry(0.045, 0.24, 6, 1, true);
    flash.rotateX(-HALF_PI);
    return {
      thigh: rCyl(0.085, 0.062, RIG_THIGH, 8),
      shin: rCyl(0.058, 0.045, RIG_SHIN, 8),
      abdomen: rBox(0.34, 0.24, 0.21),
      chest: rBox(0.42, 0.32, 0.245),
      head: rigMerge([
        { g: new THREE.SphereGeometry(0.105, 12, 10), p: [0, 0.1, 0] },
        { g: rCyl(0.045, 0.05, 0.14, 8), p: [0, 0, 0] }, // neck reaches down into the chest top (was a 4 cm gap)
        { g: rBox(0.026, 0.04, 0.04), p: [0, 0.09, -0.105] }, // nose: readable facing cue
      ]),
      upper: rCyl(0.056, 0.046, RIG_UPPER, 7),
      fore: rCyl(0.044, 0.035, RIG_FORE, 7),
      hand: new THREE.SphereGeometry(0.042, 8, 6),
      flash,
    };
  });
}

function rigFactionGeometry(pl) {
  return rigCached(pl ? 'faction:pl' : 'faction:de', () => {
    const profile = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
    if (pl) {
      // wz. 31 "Adrian"-style: rounded dome, front peak, rear visor, central comb.
      const dome = new THREE.LatheGeometry(profile([[0.15, -0.04], [0.153, 0], [0.135, 0.06], [0.1, 0.12], [0.05, 0.152], [0, 0.16]]), 10);
      return {
        helmet: rigMerge([
          { g: dome, p: [0, 0, 0] },
          { g: rBox(0.2, 0.012, 0.07), p: [0, -0.03, -0.15] },
          { g: rBox(0.17, 0.012, 0.05), p: [0, -0.04, 0.14] },
          { g: rBox(0.016, 0.03, 0.22), p: [0, 0.15, 0] },
        ]),
        boot: rigMerge([
          { g: rBox(0.11, 0.075, 0.27), p: [0, -0.03, -0.05] },
          { g: rBox(0.105, 0.08, 0.125), p: [0, 0.02, 0] },
        ]),
        kitLeather: rigMerge([
          { g: rBox(0.36, 0.05, 0.235), p: [0, 0.04, 0] },
          { g: rBox(0.075, 0.1, 0.05), p: [0.07, 0.09, -0.132] },
          { g: rBox(0.075, 0.1, 0.05), p: [-0.07, 0.09, -0.132] },
          { g: rBox(0.075, 0.1, 0.05), p: [0.155, 0.085, -0.115] },
          { g: rBox(0.075, 0.1, 0.05), p: [-0.155, 0.085, -0.115] },
        ]),
        kitCanvas: rigMerge([
          { g: rBox(0.3, 0.3, 0.13), p: [0, 0.27, 0.19] }, // tornister
          { g: rCyl(0.05, 0.05, 0.34, 8), p: [0, 0.46, 0.19], r: [0, 0, HALF_PI] }, // blanket roll on top
          { g: rCyl(0.052, 0.052, 0.62, 8), p: [0.015, 0.31, -0.145], r: [0, 0, 0.656] }, // greatcoat roll across chest
          { g: rBox(0.09, 0.17, 0.075), p: [-0.19, -0.01, 0.1] }, // bread bag
        ]),
        kitMetal: rigMerge([{ g: rCyl(0.06, 0.06, 0.05, 8), p: [0, 0.12, 0.27], r: [HALF_PI, 0, 0] }]), // mess tin
      };
    }
    // Stahlhelm M35: flared lower edge, extended neck guard.
    const dome = new THREE.LatheGeometry(profile([[0.15, -0.065], [0.158, -0.02], [0.14, 0.05], [0.1, 0.125], [0.05, 0.155], [0, 0.165]]), 10);
    return {
      helmet: rigMerge([
        { g: dome, p: [0, 0, 0] },
        { g: rBox(0.2, 0.02, 0.1), p: [0, -0.055, 0.135], r: [-0.3, 0, 0] },
      ]),
      boot: rigMerge([
        { g: rBox(0.115, 0.075, 0.27), p: [0, -0.03, -0.05] },
        { g: rBox(0.12, 0.15, 0.14), p: [0, 0.06, 0] }, // tall marching-boot shaft
      ]),
      kitLeather: rigMerge([
        { g: rBox(0.36, 0.05, 0.235), p: [0, 0.04, 0] },
        { g: rBox(0.085, 0.095, 0.05), p: [0.075, 0.09, -0.132] },
        { g: rBox(0.085, 0.095, 0.05), p: [-0.075, 0.09, -0.132] },
        { g: rBox(0.032, 0.47, 0.01), p: [0.095, 0.3, -0.129], r: [0, 0, -0.193] }, // Y-straps
        { g: rBox(0.032, 0.47, 0.01), p: [-0.095, 0.3, -0.129], r: [0, 0, 0.193] },
      ]),
      kitCanvas: rigMerge([{ g: rBox(0.09, 0.17, 0.075), p: [-0.19, -0.01, 0.1] }]), // bread bag
      kitMetal: rigMerge([{ g: rCyl(0.05, 0.05, 0.25, 8), p: [0, 0.24, 0.19] }]), // gas-mask canister
    };
  });
}

function rigWeaponGeometry(weapon) {
  const kind = rigWeaponKind(weapon);
  return rigCached(`weapon:${weapon}`, () => {
    if (kind === 'rkm') {
      return {
        muzzleZ: -0.9,
        wood: rigMerge([
          { g: rBox(0.046, 0.1, 0.26), p: [0, -0.04, 0.11] },
          { g: rBox(0.036, 0.11, 0.045), p: [0, -0.085, 0], r: [0.25, 0, 0] },
          { g: rBox(0.05, 0.055, 0.3), p: [0, -0.03, -0.34] },
        ]),
        metal: rigMerge([
          { g: rBox(0.05, 0.085, 0.32), p: [0, 0, -0.12] },
          { g: rCyl(0.014, 0.014, 0.62, 8), p: [0, 0.01, -0.58], r: [HALF_PI, 0, 0] },
          { g: rCyl(0.02, 0.02, 0.07, 8), p: [0, 0.01, -0.9], r: [HALF_PI, 0, 0] },
          { g: rBox(0.04, 0.17, 0.07), p: [0, -0.13, -0.1], r: [-0.15, 0, 0] },
          { g: rBox(0.016, 0.05, 0.2), p: [0, 0.07, -0.2] },
          { g: rBox(0.012, 0.012, 0.3), p: [0.04, -0.045, -0.62] },
          { g: rBox(0.012, 0.012, 0.3), p: [-0.04, -0.045, -0.62] },
        ]),
      };
    }
    if (kind === 'mg') {
      return {
        muzzleZ: -1.06,
        wood: rigMerge([
          { g: rBox(0.05, 0.11, 0.26), p: [0, -0.045, 0.11] },
          { g: rBox(0.036, 0.11, 0.045), p: [0, -0.085, 0], r: [0.25, 0, 0] },
        ]),
        metal: rigMerge([
          { g: rBox(0.065, 0.09, 0.38), p: [0, 0, -0.16] },
          { g: rCyl(0.032, 0.032, 0.5, 8), p: [0, 0.005, -0.55], r: [HALF_PI, 0, 0] },
          { g: rCyl(0.012, 0.012, 0.25, 6), p: [0, 0.005, -0.93], r: [HALF_PI, 0, 0] },
          { g: rCyl(0.085, 0.085, 0.09, 10), p: [-0.075, -0.045, -0.14], r: [0, 0, HALF_PI] },
          { g: rBox(0.012, 0.012, 0.32), p: [0.045, -0.05, -0.55] },
          { g: rBox(0.012, 0.012, 0.32), p: [-0.045, -0.05, -0.55] },
        ]),
      };
    }
    const barrelLen = weapon === 'kar98k' ? 0.76 : 0.8;
    return {
      muzzleZ: weapon === 'kar98k' ? -0.82 : -0.86,
      wood: rigMerge([
        { g: rBox(0.042, 0.085, 0.24), p: [0, -0.035, 0.1] },
        { g: rBox(0.034, 0.1, 0.04), p: [0, -0.075, 0], r: [0.3, 0, 0] },
        { g: rBox(0.04, 0.045, 0.34), p: [0, -0.02, -0.28] },
      ]),
      metal: rigMerge([
        { g: rBox(0.04, 0.05, 0.16), p: [0, 0, -0.07] },
        { g: rCyl(0.011, 0.011, barrelLen, 8), p: [0, 0.008, -0.05 - barrelLen / 2], r: [HALF_PI, 0, 0] },
        { g: rBox(0.008, 0.022, 0.012), p: [0, 0.028, -0.05 - barrelLen + 0.03] },
        { g: rBox(0.02, 0.015, 0.02), p: [0, 0.03, -0.14] },
        { g: rBox(0.03, 0.012, 0.012), p: [0.035, -0.005, -0.05] }, // bolt handle
      ]),
    };
  });
}

function rigCreate(materials, { faction = 'de', weapon = 'kar98k', id = '', role = '' } = {}) {
  const pl = faction === 'pl';
  const kind = rigWeaponKind(weapon);
  const body = rigBodyGeometry();
  const fg = rigFactionGeometry(pl);
  const wg = rigWeaponGeometry(weapon);
  const M = materials;
  const uniformMat = pl ? M.polish_uniform : weapon === 'mg34' ? M.target_mg : M.target_uniform;
  const trouserMat = pl ? M.soldier_pl_trouser : M.soldier_de_trouser;
  const helmetMat = pl ? M.soldier_pl_helmet : M.soldier_de_helmet;
  const leatherMat = pl ? M.soldier_leather_pl : M.soldier_leather_de;
  const canvasMat = pl ? M.soldier_canvas_pl : M.soldier_canvas_de;
  const seed = rigHash(id || `${faction}${weapon}`);

  const group = new THREE.Group();
  group.rotation.order = 'YXZ'; // yaw last: falls forward relative to facing, not toward world -Z
  group.scale.setScalar(0.97 + seed * 0.06); // subtle height variation, stays inside hitbox envelope
  const root = new THREE.Group();
  group.add(root);
  const legs = new THREE.Group();
  root.add(legs);
  const detailMeshes = [];

  const mesh = (geo, mat, { shadow = false } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow;
    return m;
  };

  const makeLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.095, RIG_HIP_Y, 0);
    const thigh = mesh(body.thigh, trouserMat, { shadow: true });
    thigh.position.y = -RIG_THIGH / 2;
    const knee = new THREE.Group();
    knee.position.y = -RIG_THIGH;
    const shin = mesh(body.shin, trouserMat);
    shin.position.y = -RIG_SHIN / 2;
    const ankle = new THREE.Group();
    ankle.position.y = -RIG_SHIN;
    ankle.add(mesh(fg.boot, M.soldier_boot));
    knee.add(shin, ankle);
    hip.add(thigh, knee);
    legs.add(hip);
    return { hip, knee, ankle };
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  const spine = new THREE.Group();
  spine.position.y = RIG_HIP_Y;
  root.add(spine);
  const abdomen = mesh(body.abdomen, uniformMat, { shadow: true });
  abdomen.position.y = 0.12;
  const chest = mesh(body.chest, uniformMat, { shadow: true });
  chest.position.y = 0.38;
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.6;
  const head = mesh(body.head, M.soldier_skin, { shadow: true });
  const helmet = mesh(fg.helmet, helmetMat, { shadow: true });
  helmet.position.y = 0.085;
  headPivot.add(head, helmet);
  spine.add(abdomen, chest, headPivot);

  const makeArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.225, 0.52, 0);
    const upper = mesh(body.upper, uniformMat);
    upper.position.y = -RIG_UPPER / 2;
    const elbow = new THREE.Group();
    elbow.position.y = -RIG_UPPER;
    const fore = mesh(body.fore, uniformMat);
    fore.position.y = -RIG_FORE / 2;
    const hand = mesh(body.hand, M.soldier_skin);
    hand.position.y = -RIG_FORE - 0.02;
    detailMeshes.push(hand);
    elbow.add(fore, hand);
    shoulder.add(upper, elbow);
    spine.add(shoulder);
    return { shoulder, elbow };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  const weaponRoot = new THREE.Group();
  weaponRoot.rotation.order = 'YXZ';
  weaponRoot.add(mesh(wg.wood, M.gun_wood), mesh(wg.metal, M.gun_metal));
  const flash = mesh(body.flash, M.soldier_flash);
  flash.position.set(0, 0.01, wg.muzzleZ - 0.1);
  flash.visible = false;
  weaponRoot.add(flash);
  spine.add(weaponRoot);

  for (const [geo, mat] of [[fg.kitLeather, leatherMat], [fg.kitCanvas, canvasMat], [fg.kitMetal, M.soldier_kit_metal]]) {
    const m = mesh(geo, mat);
    spine.add(m);
    detailMeshes.push(m);
  }
  if (role === 'medic') {
    // Red cross on a white field painted on the helmet front (readable role cue).
    const plate = mesh(rBox(0.075, 0.075, 0.012), M.soldier_medic_white);
    plate.position.set(0, 0.115, -0.152);
    const cross = mesh(rigMerge([{ g: rBox(0.05, 0.014, 0.008), p: [0, 0, 0] }, { g: rBox(0.014, 0.05, 0.008), p: [0, 0, 0] }]), M.soldier_medic_red);
    cross.position.set(0, 0.115, -0.16);
    headPivot.add(plate, cross);
    detailMeshes.push(plate, cross);
  }

  return {
    group, root, legs, legL, legR, spine, abdomen, torso: chest, chest, head, headPivot, helmet,
    leftArm: armL.shoulder, rightArm: armR.shoulder, elbowL: armL.elbow, elbowR: armR.elbow,
    weaponGroup: weaponRoot, flash, uniformMat, detailMeshes, materials: M,
    weaponKind: kind, weaponId: weapon, faction, seed, tunicMat: uniformMat, lodBand: -1,
    anim: { ready: false, init: false, shotAt: -1e9, shotRounds: 1, hitAt: -1e9, speed: 0, phase: seed * RIG_TAU },
  };
}

const _iV = {
  d: new THREE.Vector3(), u: new THREE.Vector3(), e: new THREE.Vector3(), p: new THREE.Vector3(),
  f: new THREE.Vector3(), down: new THREE.Vector3(0, -1, 0), q: new THREE.Quaternion(),
};
// Analytic 2-bone IK in spine space. Shoulder position is spine-local; limbs hang along local -Y.
function rigSolveArm(shoulder, elbow, target, pole) {
  _iV.d.copy(target).sub(shoulder.position);
  if (_iV.d.lengthSq() < 1e-8) _iV.d.set(0, -1, 0);
  const dist = rigClamp(_iV.d.length(), Math.abs(RIG_UPPER - RIG_FORE) + 0.02, (RIG_UPPER + RIG_FORE) * 0.999);
  _iV.u.copy(_iV.d).normalize();
  const a = (RIG_UPPER * RIG_UPPER - RIG_FORE * RIG_FORE + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, RIG_UPPER * RIG_UPPER - a * a));
  _iV.p.copy(pole);
  _iV.p.addScaledVector(_iV.u, -_iV.p.dot(_iV.u));
  if (_iV.p.lengthSq() < 1e-6) {
    _iV.p.set(0, 0, 1);
    _iV.p.addScaledVector(_iV.u, -_iV.u.z);
  }
  _iV.p.normalize();
  _iV.e.copy(_iV.u).multiplyScalar(a).addScaledVector(_iV.p, h);
  _iV.q.setFromUnitVectors(_iV.down, _iV.f.copy(_iV.e).normalize());
  shoulder.quaternion.copy(_iV.q);
  _iV.f.copy(_iV.u).multiplyScalar(dist).sub(_iV.e).normalize();
  _iV.f.applyQuaternion(_iV.q.invert());
  elbow.quaternion.setFromUnitVectors(_iV.down, _iV.f);
}

const _hv = {
  gR: new THREE.Vector3(), gL: new THREE.Vector3(), tR: new THREE.Vector3(), tL: new THREE.Vector3(),
  pR: new THREE.Vector3(), pL: new THREE.Vector3(), tmp: new THREE.Vector3(), q: new THREE.Quaternion(),
};
const rigFoot = (t1, t2) => RIG_HIP_Y - RIG_THIGH * Math.cos(t1) - (RIG_SHIN + RIG_BOOT_DROP) * Math.cos(t1 + t2);
const rigMix3 = (out, to, t) => {
  out[0] = rigLerp(out[0], to[0], t);
  out[1] = rigLerp(out[1], to[1], t);
  out[2] = rigLerp(out[2], to[2], t);
};
const _wp = [0, 0, 0];
const _wr = [0, 0, 0];

function rigApplyLod(entry, band) {
  if (entry.lodBand === band) return;
  entry.lodBand = band;
  entry.group.visible = band < 3; // policy band 3 = culled
  const detail = band <= 1;
  for (const m of entry.detailMeshes) m.visible = detail;
}

// Record a burst for a soldier whose shot is known by event rather than by `shotsFired` (ignored if already seen).
function rigKick(entry, rounds, clock) {
  if (!entry) return;
  const A = entry.anim;
  if (clock - A.shotAt < 0.3) return;
  A.shotAt = clock;
  A.shotRounds = rigClamp(rounds || 3, 1, 6);
}

function rigPose(entry, actor, ctx) {
  const { clock, side } = ctx;
  const dt = rigClamp(ctx.dt || 0, 0, 0.1);
  const A = entry.anim;
  const M = entry.materials;
  const seed = entry.seed;

  if (A.lastClock !== undefined && clock < A.lastClock - 1e-6) {
    // Checkpoint restore / reset: drop transient history, keep nothing stale.
    A.init = false;
    A.ready = false;
    A.shotAt = -1e9;
    A.hitAt = -1e9;
    A.lastShots = undefined;
    A.lastHits = undefined;
    A.yaw = undefined;
  }
  A.lastClock = clock;

  // ── Real displacement → speed (drives the walk phase; no fake timers)
  if (!A.init) {
    A.lastX = actor.x;
    A.lastZ = actor.z;
    A.init = true;
    A.speed = 0;
  }
  const mdist = Math.hypot(actor.x - A.lastX, actor.z - A.lastZ);
  A.lastX = actor.x;
  A.lastZ = actor.z;
  const teleport = mdist > 2.5;
  if (teleport) A.speed = 0;
  else if (dt > 1e-5) A.speed = rigDamp(A.speed, mdist / dt, 12, dt);

  // ── Shots and hits from real counters
  const shots = actor.shotsFired ?? 0;
  if (A.lastShots === undefined || shots < A.lastShots) A.lastShots = shots;
  if (shots > A.lastShots) {
    A.shotAt = clock;
    A.shotRounds = rigClamp(shots - A.lastShots, 1, 6);
    A.lastShots = shots;
  }
  const hits = actor.hitsReceived ?? 0;
  if (A.lastHits === undefined || hits < A.lastHits) A.lastHits = hits;
  if (hits > A.lastHits) {
    A.hitAt = clock;
    A.hitHead = actor.lastHitPart === 'head';
    A.lastHits = hits;
  }

  // ── Discrete state
  const down = actor.alive === false || actor.state === 'DOWN' || actor.state === 'DEAD';
  const wounded = !down && actor.state === 'WOUNDED_UNARMED';
  const surrendered = !down && actor.state === 'SURRENDERED';
  const emplaced = !down && !wounded && !surrendered && actor.id === RIG_EMPLACED_ID
    && Math.hypot(actor.x - RIG_EMPLACED_HOME.x, actor.z - RIG_EMPLACED_HOME.z) < 1.0;

  // ── Transform: position, smoothed yaw, forward fall
  const targetYaw = rigYawFromFacing(actor.facing);
  if (A.yaw === undefined || teleport) A.yaw = targetYaw;
  else {
    let d = targetYaw - A.yaw;
    d = ((((d + Math.PI) % RIG_TAU) + RIG_TAU) % RIG_TAU) - Math.PI;
    A.yaw += d * (1 - Math.exp(-14 * dt));
  }

  // ── Blend targets (damped; snap on first frame)
  const sinceShot = clock - A.shotAt;
  const engaging = side === 'enemy' ? actor.state === 'ENGAGE_VISIBLE' : sinceShot < 2.2;
  const searching = side === 'enemy' && actor.state === 'SEARCH_MEMORY';
  let aimT = 0;
  if (engaging) aimT = 1;
  else if (searching) aimT = 0.55;
  else if (side === 'ally' && actor.tacticalState === 'ClearRoom') aimT = 0.55;
  else if (side === 'ally' && actor.tacticalState === 'HoldAndSuppress' && !actor.moving) aimT = 0.5;
  if (emplaced) aimT = Math.max(aimT, 0.7);
  if (actor.moving && sinceShot > 0.8) aimT *= 0.6;
  const supT = rigSmooth(0.25, 0.8, actor.suppressed ?? 0);
  const T = {
    walk: actor.moving && !down && !wounded && !surrendered && !emplaced ? rigClamp(A.speed / 3.2, 0, 1) : 0,
    aim: down || wounded || surrendered ? 0 : aimT,
    crouch: actor.crouched ? 1 : 0,
    sit: wounded ? 1 : 0,
    surr: surrendered ? 1 : 0,
    sup: down || wounded || surrendered ? 0 : supT,
    down: down ? 1 : 0,
  };
  if (!A.ready) {
    A.walkW = T.walk; A.aimW = T.aim; A.crouchW = T.crouch; A.sitW = T.sit;
    A.surrW = T.surr; A.supW = T.sup; A.downW = T.down;
    A.ready = true;
  } else {
    A.walkW = rigDamp(A.walkW, T.walk, 9, dt);
    A.aimW = rigDamp(A.aimW, T.aim, T.aim > A.aimW ? 10 : 5, dt);
    A.crouchW = rigDamp(A.crouchW, T.crouch, 7, dt);
    A.sitW = rigDamp(A.sitW, T.sit, 4, dt);
    A.surrW = rigDamp(A.surrW, T.surr, 6, dt);
    A.supW = rigDamp(A.supW, T.sup, 5, dt);
    A.downW = rigDamp(A.downW, T.down, 7, dt);
  }
  const { walkW, aimW, sitW, surrW, supW, downW } = A;
  const crouchE = A.crouchW * (1 - sitW) * (1 - surrW);
  const fallE = rigSmooth(0, 1, downW);

  const group = entry.group;
  group.position.set(actor.x, actor.y + 0.13 * fallE, actor.z);
  group.rotation.set(-RIG_FALL * fallE, A.yaw, 0);

  // ── Tunic tint (same semantics as before)
  let tunic = entry.uniformMat;
  if (down) tunic = M.target_down;
  else if (wounded) tunic = M.target_wounded;
  else if (surrendered) tunic = M.target_surrendered;
  else if (side === 'enemy' && (actor.hitsReceived ?? 0) > 0) tunic = M.target_hit;
  if (entry.tunicMat !== tunic) {
    entry.chest.material = tunic;
    entry.abdomen.material = tunic;
    entry.tunicMat = tunic;
  }

  rigApplyLod(entry, ctx.lodBand);
  if (ctx.lodBand >= 3) return;

  // ── Walk phase from real distance travelled
  if (walkW > 0.02 && !teleport) A.phase += (Math.min(mdist, 0.6) / 1.5) * RIG_TAU * (1 + 0.25 * crouchE);
  const phase = A.phase;
  const breath = Math.sin(clock * 2.0 + seed * 6.3);
  const prof = WEAPON_PROFILES[actor.weapon];

  // ── Recoil, reload, bolt cycle from real timing
  let kick = 0;
  let flashOn = false;
  if (sinceShot < 1.2) {
    const gap = prof?.burstGapSec > 0 ? prof.burstGapSec : 0.08;
    for (let i = 0; i < A.shotRounds; i++) {
      const tau = sinceShot - i * gap;
      if (tau < 0) continue;
      kick += Math.exp(-tau * 13);
      if (tau < 0.06) flashOn = true;
    }
    kick = Math.min(kick, 1.25);
  }
  let reloadE = 0;
  let reloadP = 0;
  if (actor.reloadingUntil > clock && !wounded && !surrendered && !down) {
    const rs = prof?.reloadSec ?? 2.6;
    reloadP = rigClamp(1 - (actor.reloadingUntil - clock) / rs, 0, 1);
    reloadE = rigSmooth(0, 0.12, reloadP) * (1 - rigSmooth(0.88, 1, reloadP));
  }
  const spec = RIG_WEAPONS[entry.weaponKind];
  const boltP = (sinceShot - 0.3) / 0.75;
  const bolting = !spec.auto && boltP > 0 && boltP < 1 && reloadE < 0.05 && (actor.mag ?? 1) > 0;
  const boltBump = bolting ? Math.sin(Math.PI * boltP) : 0;
  const hitK = clock - A.hitAt < 1 ? Math.exp(-(clock - A.hitAt) * 7) * (A.hitHead ? 0.45 : 0.28) : 0;

  // Elevation toward the remembered target while engaging (enemies only; memory is the real last-seen point)
  let aimPitch = 0;
  if (side === 'enemy' && actor.state === 'ENGAGE_VISIBLE' && actor.memory) {
    const dy = actor.memory.y - (actor.y + (actor.crouched ? 1.05 : 1.45));
    const horiz = Math.hypot(actor.memory.x - actor.x, actor.memory.z - actor.z);
    if (horiz > 0.5) aimPitch = rigClamp(Math.atan2(dy, horiz), -0.45, 0.45);
  }

  if (down) {
    // Limp pose; body fall animates through group.rotation.
    entry.root.position.set(0, 0, 0);
    entry.spine.position.x = 0;
    entry.spine.rotation.set(0.1, 0, 0);
    entry.headPivot.rotation.set(0.25, 0, 0.3);
    entry.legL.hip.rotation.set(0.12, 0, -0.14);
    entry.legR.hip.rotation.set(-0.05, 0, 0.16);
    for (const leg of [entry.legL, entry.legR]) {
      leg.knee.rotation.set(-0.15, 0, 0);
      leg.ankle.rotation.set(0.2, 0, 0);
    }
    entry.leftArm.rotation.set(0.25, 0, -0.6);
    entry.rightArm.rotation.set(-0.1, 0, 0.6);
    entry.elbowL.rotation.set(-0.35, 0, 0);
    entry.elbowR.rotation.set(-0.45, 0, 0);
    entry.chest.scale.y = 1;
    entry.flash.visible = false;
    if (side === 'ally') {
      entry.weaponGroup.visible = true;
      entry.weaponGroup.position.set(0.42, 0.1, 0.02);
      entry.weaponGroup.rotation.set(HALF_PI, 0, 0); // rifle lies along the body
    } else {
      entry.weaponGroup.visible = false;
    }
    return;
  }

  // ── Legs
  const walkAmp = 0.52 * (1 - 0.4 * crouchE) * walkW;
  const stance = aimW * (1 - walkW);
  const legAngles = [];
  for (const [leg, off, front] of [[entry.legL, 0, 1], [entry.legR, Math.PI, 0]]) {
    const ph = phase + off;
    let t1 = Math.sin(ph) * walkAmp;
    let t2 = -(0.08 + 0.9 * Math.max(0, Math.cos(ph))) * walkW;
    t1 += (front ? 0.16 : -0.1) * stance; // staggered shooting stance
    t2 -= (front ? 0.1 : 0.14) * stance;
    t1 += crouchE * 1.0;
    t2 += -crouchE * 1.7;
    t1 = rigLerp(t1, 1.52, sitW);
    t2 = rigLerp(t2, -0.2, sitW);
    // Surrender: knees slightly trembling
    t2 -= surrW * (0.06 + 0.03 * Math.sin(clock * 17 + seed * 9 + off));
    const splay = (off === 0 ? -1 : 1) * (0.03 + 0.1 * crouchE + 0.14 * sitW + 0.05 * surrW);
    leg.hip.rotation.set(t1, 0, splay);
    leg.knee.rotation.set(t2, 0, 0);
    leg.ankle.rotation.set(rigClamp(-(t1 + t2) * 0.9, -0.9, 0.9), 0, 0);
    legAngles.push([t1, t2]);
  }
  entry.root.position.y = -Math.min(rigFoot(...legAngles[0]), rigFoot(...legAngles[1])); // lower foot always on the ground

  // ── Spine, head
  const idleSway = Math.sin(clock * 0.37 + seed * 9) * 0.03 * (1 - walkW) * (1 - aimW);
  const spineX = -0.04 * walkW - 0.3 * crouchE - 0.08 * aimW * (1 - sitW) - 0.22 * sitW - 0.12 * supW * (1 - crouchE)
    + 0.012 * breath + 0.035 * kick + hitK + aimPitch * 0.25 * aimW
    + (surrW > 0.01 ? -0.04 * surrW : 0);
  entry.spine.rotation.set(
    spineX,
    Math.sin(phase) * 0.08 * walkW * (1 - 0.7 * aimW) + idleSway, // less torso twist while the weapon is up
    Math.sin(phase) * 0.025 * walkW - 0.04 * aimW,
  );
  entry.spine.position.x = Math.sin(phase) * 0.012 * walkW + Math.sin(clock * 0.6 + seed * 5) * 0.008 * (1 - walkW);
  entry.chest.scale.y = 1 + 0.012 * breath;

  const lookState = searching ? 0.65 * Math.sin(clock * 1.3 + seed * 7)
    : actor.state === 'HOLD_SECTOR' ? 0.3 * Math.sin(clock * 0.45 + seed * 5)
      : 0.18 * Math.sin(clock * 0.5 + seed * 3);
  const sweep = lookState * (1 - aimW) * (1 - walkW * 0.6) * (1 - sitW) * (1 - surrW);
  const tremor = Math.sin(clock * 31 + seed * 13) * 0.02 * supW + Math.sin(clock * 19 + seed * 4) * 0.02 * surrW;
  entry.headPivot.rotation.set(
    -spineX * 0.65 - 0.22 * supW - 0.3 * reloadE - 0.3 * sitW - 0.1 * surrW + hitK * 0.9 + tremor,
    sweep + tremor,
    -0.1 * aimW,
  );

  // ── Weapon pose (blend: low → port → aim → reload)
  _wp[0] = RIG_POSES.low.p[0]; _wp[1] = RIG_POSES.low.p[1]; _wp[2] = RIG_POSES.low.p[2];
  _wr[0] = RIG_POSES.low.r[0]; _wr[1] = RIG_POSES.low.r[1]; _wr[2] = RIG_POSES.low.r[2];
  rigMix3(_wp, RIG_POSES.port.p, walkW);
  rigMix3(_wr, RIG_POSES.port.r, walkW);
  rigMix3(_wp, RIG_POSES.aim.p, aimW);
  rigMix3(_wr, RIG_POSES.aim.r, aimW);
  rigMix3(_wp, RIG_POSES.reload.p, reloadE);
  rigMix3(_wr, RIG_POSES.reload.r, reloadE);
  const sway = spec.sway * (1 - 0.5 * aimW);
  _wp[0] += Math.sin(phase) * 0.01 * walkW;
  _wp[1] += Math.abs(Math.sin(phase)) * 0.014 * walkW - spec.drop + 0.012 * kick;
  _wp[2] += spec.zShift + 0.085 * spec.recoil * kick + 0.04 * hitK;
  // Keep the muzzle on the target line when the spine leans (crouch, aim stoop, suppression); recoil/hit flinch stay uncompensated.
  const spineLean = spineX - 0.035 * kick - hitK;
  _wr[0] += -spineLean * aimW * (1 - reloadE) + Math.sin(clock * 1.3 + seed * 4) * 0.01 * sway + 0.11 * spec.recoil * kick + aimPitch * aimW + 0.02 * supW * Math.sin(clock * 27 + seed);
  _wr[1] += Math.cos(clock * 0.9 + seed * 5) * 0.012 * sway + Math.sin(phase) * 0.03 * walkW;
  _wr[2] += 0.15 * boltBump;
  entry.weaponGroup.position.set(_wp[0], _wp[1], _wp[2]);
  entry.weaponGroup.rotation.set(_wr[0], _wr[1], _wr[2]);

  // ── Hands: rest on the weapon, then reload/bolt overrides, then special poses
  _hv.q.copy(entry.weaponGroup.quaternion);
  const toSpine = (out, lx, ly, lz) => out.set(lx, ly, lz).applyQuaternion(_hv.q).add(entry.weaponGroup.position);
  toSpine(_hv.tR, 0, 0.05 * boltBump, 0.11 * boltBump);
  toSpine(_hv.tL, spec.gripL[0], spec.gripL[1], spec.gripL[2]);
  if (reloadE > 0.001) {
    // Left hand: grip → belt pouch → receiver/magazine → grip. Right hand works the bolt (non-auto weapons).
    toSpine(_hv.gL, spec.recv[0], spec.recv[1], spec.recv[2]);
    const wPouch = rigSmooth(0.08, 0.22, reloadP) - rigSmooth(0.3, 0.42, reloadP);
    const wRecv = rigSmooth(0.3, 0.45, reloadP) - rigSmooth(0.78, 0.92, reloadP);
    _hv.tmp.set(0, 0.12, -0.16).sub(_hv.tL).multiplyScalar(wPouch);
    _hv.gL.sub(_hv.tL).multiplyScalar(wRecv).add(_hv.tmp).multiplyScalar(reloadE);
    _hv.tL.add(_hv.gL);
    if (!spec.auto) {
      const b = Math.sin(Math.PI * rigClamp((reloadP - 0.45) / 0.35, 0, 1));
      toSpine(_hv.gR, 0, 0.05 * b, 0.11 * b);
      _hv.tR.lerp(_hv.gR, reloadE);
    }
  }
  _hv.pR.set(rigLerp(0.8, 0.9, aimW), rigLerp(-0.6, -0.25, aimW), 0.5);
  _hv.pL.set(rigLerp(-0.5, -0.2, aimW), rigLerp(-0.9, -1, aimW), rigLerp(0.3, 0.1, aimW));

  const weaponVisible = !emplaced && sitW < 0.5 && surrW < 0.5;
  if (emplaced) {
    // The static B02 MG34 is the weapon: hands follow its rear grip and jacket (compensating root drop).
    const lift = -entry.root.position.y;
    _hv.tR.set(0.06, 0.36 + lift, -0.4);
    _hv.tL.set(-0.08, 0.42 + lift, -0.5);
    const shake = Math.sin(clock * 58 + seed * 11) * 0.006 * Math.min(kick, 1);
    _hv.tR.y += shake;
    _hv.tL.y -= shake;
    entry.spine.rotation.x += -0.12 + Math.sin(clock * 47) * 0.01 * Math.min(kick, 1);
    entry.spine.rotation.y += Math.sin(clock * 53) * 0.008 * Math.min(kick, 1);
  }
  if (sitW > 0.001) {
    _hv.tR.lerp(_hv.gR.set(0.07, 0.2, -0.15), sitW); // hand pressed to the wound
    _hv.tL.lerp(_hv.gL.set(-0.2, 0.05, -0.26), sitW); // other hand braced on the thigh
    _hv.pR.lerp(_hv.tmp.set(0.6, -0.5, 0.6), sitW);
    _hv.pL.lerp(_hv.tmp.set(-0.6, -0.5, 0.6), sitW);
  }
  if (surrW > 0.001) {
    const trem = Math.sin(clock * 21 + seed * 9) * 0.01;
    _hv.tR.lerp(_hv.gR.set(0.2 + trem, 0.98, -0.05), surrW); // hands raised, elbows out
    _hv.tL.lerp(_hv.gL.set(-0.2 - trem, 0.98, -0.05), surrW);
    _hv.pR.lerp(_hv.tmp.set(1, 0, 0.1), surrW);
    _hv.pL.lerp(_hv.tmp.set(-1, 0, 0.1), surrW);
  }
  rigSolveArm(entry.rightArm, entry.elbowR, _hv.tR, _hv.pR);
  rigSolveArm(entry.leftArm, entry.elbowL, _hv.tL, _hv.pL);

  entry.weaponGroup.visible = weaponVisible;
  entry.flash.visible = flashOn && weaponVisible;
  if (entry.flash.visible) entry.flash.scale.setScalar(0.8 + 0.5 * Math.abs(Math.sin(clock * 90 + seed * 20)));
}

export class M02BenchRenderer {
  constructor(canvas, sim, { quality = 'medium', lighting = 'afternoon_1939_09_09' } = {}) {
    this.canvas = canvas;
    this.sim = sim;
    this.world = sim.world;
    this.qualityProfile = M02_QUALITY_PROFILES[quality] ?? M02_QUALITY_PROFILES.medium;
    this.lightingPreset = M02_LIGHTING_PRESETS[lighting] ?? M02_LIGHTING_PRESETS.afternoon_1939_09_09;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.qualityProfile.id !== 'low',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.12, 1200);
    this.camera.rotation.order = 'YXZ';

    this.materials = this.#createMaterials();
    Object.assign(this.materials, createSoldierRigMaterials());
    this.staticGroup = new THREE.Group();
    this.dynamicDoorsGroup = new THREE.Group();
    this.dynamicWindowsGroup = new THREE.Group();
    this.targetsGroup = new THREE.Group();
    this.horizonGroup = new THREE.Group();
    this.decorativeGroup = new THREE.Group();
    this.roofsGroup = new THREE.Group();
    this.debugGroup = new THREE.Group();
    this.tracersGroup = new THREE.Group();

    this.scene.add(
      this.staticGroup,
      this.dynamicDoorsGroup,
      this.dynamicWindowsGroup,
      this.targetsGroup,
      this.horizonGroup,
      this.decorativeGroup,
      this.roofsGroup,
      this.debugGroup,
      this.tracersGroup,
    );

    this.viewModel = this.#createViewModel();
    this.camera.add(this.viewModel);
    this.scene.add(this.camera);

    this.lastWorldRevision = -1;
    this.targetMeshes = new Map();
    this.allyMeshes = new Map();
    this.enemyMeshes = new Map();
    this.roofMeshes = new Map();
    this.activeTracers = [];
    this.debugLoSVisible = false;

    this.telemetryWindow = [];
    this.lastFrameMetrics = {
      frameTimeMs: 16.6,
      simMs: 0.4,
      renderMs: 4.0,
      drawCalls: 0,
      triangles: 0,
    };

    this.#setupLights();
    this.#buildStaticWorld();
    this.#rebuildDynamicOpenings();
    this.#buildTargets();
    this.#buildHorizonRing();
    this.#buildDebugOverlay();
    this.applyQualityProfile(this.qualityProfile.id);
    this.applyLightingPreset(this.lightingPreset.id);
    this.resize();
  }

  #createMaterials() {
    return {
      brick_B01: new THREE.MeshStandardMaterial({ color: 0xd8d1c2, roughness: 0.88, metalness: 0.04 }),
      brick_B04: new THREE.MeshStandardMaterial({ color: 0xc9b9a4, roughness: 0.9, metalness: 0.04 }),
      brick_cover: new THREE.MeshStandardMaterial({ color: 0xa6674c, roughness: 0.9, metalness: 0.05 }),
      wood_thick: new THREE.MeshStandardMaterial({ color: 0x604631, roughness: 0.87, metalness: 0.05 }),
      wood_frame: new THREE.MeshStandardMaterial({ color: 0x473323, roughness: 0.82, metalness: 0.06 }),
      wood_thin: new THREE.MeshStandardMaterial({ color: 0x7e5d3f, roughness: 0.84, metalness: 0.04 }),
      door_open: new THREE.MeshStandardMaterial({ color: 0x6f5238, roughness: 0.82, metalness: 0.05 }),
      door_closed: new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.84, metalness: 0.05 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x7d7a74, roughness: 0.92, metalness: 0.05 }),
      earth: new THREE.MeshStandardMaterial({ color: 0x524432, roughness: 0.96, metalness: 0.02 }),
      foliage: new THREE.MeshStandardMaterial({ color: 0x455e33, roughness: 0.9, metalness: 0.02 }),
      roof_thatch: new THREE.MeshStandardMaterial({ color: 0x8a754d, roughness: 0.95, metalness: 0.02, side: THREE.DoubleSide }),
      roof_wood: new THREE.MeshStandardMaterial({ color: 0x4b3828, roughness: 0.9, metalness: 0.04, side: THREE.DoubleSide }),
      roof_tile: new THREE.MeshStandardMaterial({ color: 0x8f4935, roughness: 0.85, metalness: 0.06, side: THREE.DoubleSide }),
      glass_intact: new THREE.MeshPhysicalMaterial({
        color: 0xaed4e6,
        transparent: true,
        opacity: 0.42,
        roughness: 0.15,
        metalness: 0.05,
      }),
      glass_shard: new THREE.MeshBasicMaterial({ color: 0xcbe7f5, transparent: true, opacity: 0.65 }),
      polish_uniform: new THREE.MeshStandardMaterial({ color: 0x665e3b, roughness: 0.84, metalness: 0.08 }),
      polish_helmet: new THREE.MeshStandardMaterial({ color: 0x4b4b2f, roughness: 0.62, metalness: 0.28 }),
      target_uniform: new THREE.MeshStandardMaterial({ color: 0x485249, roughness: 0.8, metalness: 0.1 }),
      target_mg: new THREE.MeshStandardMaterial({ color: 0x3b443e, roughness: 0.72, metalness: 0.2 }),
      target_helmet: new THREE.MeshStandardMaterial({ color: 0x2c322f, roughness: 0.55, metalness: 0.35 }),
      target_hit: new THREE.MeshStandardMaterial({ color: 0xc94a38, roughness: 0.6, metalness: 0.1 }),
      target_wounded: new THREE.MeshStandardMaterial({ color: 0x6e5246, roughness: 0.85, metalness: 0.06 }),
      target_surrendered: new THREE.MeshStandardMaterial({ color: 0x5c665e, roughness: 0.85, metalness: 0.05 }),
      target_down: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9, metalness: 0.05 }),
      chalk_white: new THREE.MeshBasicMaterial({ color: 0xf7f7f0 }),
      grenade_body: new THREE.MeshStandardMaterial({ color: 0x3e4a33, roughness: 0.6, metalness: 0.35 }),
      gun_metal: new THREE.MeshStandardMaterial({ color: 0x25282a, roughness: 0.42, metalness: 0.75 }),
      gun_wood: new THREE.MeshStandardMaterial({ color: 0x5e3c22, roughness: 0.72, metalness: 0.08 }),
      horizon_treeline: new THREE.MeshStandardMaterial({ color: 0x394934, roughness: 0.95, metalness: 0.0 }),
      horizon_study: new THREE.MeshBasicMaterial({ color: 0x6d7782, wireframe: false, transparent: true, opacity: 0.55 }),
    };
  }

  #setupLights() {
    this.hemiLight = new THREE.HemisphereLight(0xc8d4e0, 0x564d3e, 0.72);
    this.sunLight = new THREE.DirectionalLight(0xffdfb0, 1.35);
    this.sunLight.position.set(-75, 48, 32);
    this.sunLight.castShadow = this.qualityProfile.shadows;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 210;
    this.sunLight.shadow.camera.left = -65;
    this.sunLight.shadow.camera.right = 65;
    this.sunLight.shadow.camera.top = 75;
    this.sunLight.shadow.camera.bottom = -95;
    this.sunLight.shadow.bias = -0.0005;
    this.b01InteriorLight = new THREE.PointLight(0xffe4b8, 0.85, 18);
    this.b01InteriorLight.position.set(-33, 2.45, -13);
    this.b02InteriorLight = new THREE.PointLight(0xffddb0, 0.9, 26);
    this.b02InteriorLight.position.set(22, 3.1, -31);
    this.scene.add(this.hemiLight, this.sunLight, this.b01InteriorLight, this.b02InteriorLight);
  }

  #createViewModel() {
    const group = new THREE.Group();
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.58), this.materials.gun_wood);
    stock.position.set(0.22, -0.21, -0.42);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.66, 8), this.materials.gun_metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.22, -0.165, -0.62);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.026, 0.02), this.materials.gun_metal);
    sight.position.set(0.22, -0.145, -0.88);
    group.add(stock, barrel, sight);
    return group;
  }

  #buildStaticWorld() {
    this.staticGroup.clear();
    this.roofsGroup.clear();
    this.decorativeGroup.clear();
    this.roofMeshes.clear();

    // 1. Terrain mesh with ditch depression and vertex colors
    const width = 160;
    const length = 210;
    const segX = 80;
    const segZ = 105;
    const terrainGeo = new THREE.PlaneGeometry(width, length, segX, segZ);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i) - 15; // center around Z = -15 (playable -90..60)
      pos.setZ(i, vz);
      const vy = this.world.terrainHeightAt(vx, vz);
      pos.setY(i, vy);

      if (vx >= -48.5 && vx <= -41.5 && vz >= -85 && vz <= 48) {
        // Wet ditch bottom and muddy banks
        color.setHex(vy < -0.75 ? 0x353126 : 0x4d4331);
      } else if (Math.abs(vx) <= 3.1 && vz <= 20) {
        // North-south cart track
        color.setHex(0x6e5d45);
      } else if (vx >= -22 && vx <= 16 && vz >= -20 && vz <= 20) {
        // Farmstead packed-earth courtyard
        color.setHex(0x695c47);
      } else if (vx >= -24 && vx <= 12 && vz >= 28 && vz <= 62) {
        // Southern orchard grass
        color.setHex(0x4c5f38);
      } else {
        // Agricultural fields with subtle furrow variation
        const furrow = Math.sin(vx * 1.4) * 0.03;
        color.setRGB(0.36 + furrow, 0.39 + furrow, 0.25);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.02,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.staticGroup.add(terrainMesh);

    // 2. Floor slabs inside B01, B02, B03, B04
    for (const b of this.world.layout.buildings) {
      const [minX, maxX, minZ, maxZ] = b.bounds;
      const bw = maxX - minX;
      const bd = maxZ - minZ;
      const floorGeo = new THREE.BoxGeometry(bw - 0.1, 0.08, bd - 0.1);
      const floorMat = b.id === 'B01' ? this.materials.wood_thin : this.materials.earth;
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(minX + bw / 2, 0.02, minZ + bd / 2);
      floorMesh.receiveShadow = true;
      this.staticGroup.add(floorMesh);

      // Pitched gable roof
      const roofGroup = this.#createGableRoof(b);
      this.roofMeshes.set(b.id, roofGroup);
      this.roofsGroup.add(roofGroup);
    }

    // 3. Static obstacles from world.obstacles (excluding dynamic door_leaf, window_glass, and destructible fences)
    for (const ob of this.world.obstacles) {
      if (ob.role === 'door_leaf' || ob.role === 'window_glass') continue;
      if (ob.id === 'cov_south_fence_west' || ob.id === 'cov_south_fence_east') continue;
      const sx = ob.max.x - ob.min.x;
      const sy = ob.max.y - ob.min.y;
      const sz = ob.max.z - ob.min.z;
      if (sx <= 0 || sy <= 0 || sz <= 0) continue;

      let mat = this.materials.brick_B01;
      if (ob.role === 'window_frame' || ob.role === 'door_frame' || ob.role === 'post') {
        mat = this.materials.wood_frame;
      } else if (ob.material === 'brick') {
        mat = ob.buildingId === 'B04'
          ? this.materials.brick_B04
          : ob.buildingId === 'B01'
            ? this.materials.brick_B01
            : this.materials.brick_cover;
      } else if (ob.material === 'wood_thick') {
        mat = this.materials.wood_thick;
      } else if (ob.material === 'wood_thin') {
        mat = this.materials.wood_thin;
      } else if (ob.material === 'stone') {
        mat = this.materials.stone;
      } else if (ob.material === 'earth') {
        mat = this.materials.earth;
      }

      const geo = ob.role === 'tree_trunk'
        ? new THREE.CylinderGeometry(sx * 0.48, sx * 0.55, sy, 8)
        : new THREE.BoxGeometry(sx, sy, sz);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (ob.min.x + ob.max.x) / 2,
        (ob.min.y + ob.max.y) / 2,
        (ob.min.z + ob.max.z) / 2,
      );
      mesh.castShadow = ob.role !== 'terrain_bank';
      mesh.receiveShadow = true;
      this.staticGroup.add(mesh);
    }

    // 4. Orchard tree canopies (visual sight-blockers, non-ballistic)
    for (const sb of this.world.sightBlockers) {
      const rx = (sb.max.x - sb.min.x) / 2;
      const ry = (sb.max.y - sb.min.y) / 2;
      const crownGeo = new THREE.IcosahedronGeometry(1, 1);
      crownGeo.scale(rx, ry, rx);
      const crownMesh = new THREE.Mesh(crownGeo, this.materials.foliage);
      crownMesh.position.set(
        (sb.min.x + sb.max.x) / 2,
        (sb.min.y + sb.max.y) / 2,
        (sb.min.z + sb.max.z) / 2,
      );
      crownMesh.castShadow = true;
      this.staticGroup.add(crownMesh);
    }

    // 5. MG34 weapon fixture inside B02 west aperture
    const mgGroup = new THREE.Group();
    const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.05, 8), this.materials.gun_metal);
    mgBarrel.rotation.z = Math.PI / 2;
    mgBarrel.position.set(12.25, 1.38, -30.0);
    const mgBipod = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.28), this.materials.gun_metal);
    mgBipod.position.set(12.05, 1.16, -30.0);
    mgGroup.add(mgBarrel, mgBipod);
    this.staticGroup.add(mgGroup);

    // 6. C04 Southern Orchard wooden post & white chalk sign next to wounded German soldier (-4.6, 36.2)
    const c04Post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.45, 0.18), this.materials.wood_frame);
    c04Post.position.set(-4.6, 0.725, 36.2);
    c04Post.castShadow = true;
    this.c04ChalkMesh = new THREE.Group();
    const chalkBarA = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.32, 0.05), this.materials.chalk_white);
    chalkBarA.rotation.x = 0.65;
    const chalkBarB = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.32, 0.05), this.materials.chalk_white);
    chalkBarB.rotation.x = -0.65;
    this.c04ChalkMesh.add(chalkBarA, chalkBarB);
    this.c04ChalkMesh.position.set(-4.6, 1.12, 36.2);
    this.c04ChalkMesh.visible = false;
    this.staticGroup.add(c04Post, this.c04ChalkMesh);
  }

  #createGableRoof(b) {
    const [minX, maxX, minZ, maxZ] = b.bounds;
    const w = maxX - minX + 0.7;
    const d = maxZ - minZ + 0.7;
    const eaveY = b.wallHeight ?? 2.8;
    const ridgeH = Math.max(0.8, (b.ridgeHeight ?? eaveY + 1.8) - eaveY);
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;

    const group = new THREE.Group();
    const slopeLen = Math.hypot(d / 2, ridgeH);
    const slopeAngle = Math.atan2(ridgeH, d / 2);
    const mat = b.roofMaterial === 'thatch'
      ? this.materials.roof_thatch
      : b.roofMaterial === 'tile'
        ? this.materials.roof_tile
        : this.materials.roof_wood;

    const northSlope = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, slopeLen), mat);
    northSlope.position.set(cx, eaveY + ridgeH / 2, cz - d / 4);
    northSlope.rotation.x = -slopeAngle;

    const southSlope = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, slopeLen), mat);
    southSlope.position.set(cx, eaveY + ridgeH / 2, cz + d / 4);
    southSlope.rotation.x = slopeAngle;

    // Gable triangular end walls (west and east tympanums) so the attic is enclosed
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-d / 2, 0);
    gableShape.lineTo(d / 2, 0);
    gableShape.lineTo(0, ridgeH);
    gableShape.closePath();
    const gableGeo = new THREE.ShapeGeometry(gableShape);
    const westGable = new THREE.Mesh(gableGeo, mat);
    westGable.rotation.y = -Math.PI / 2;
    westGable.position.set(minX, eaveY, cz);
    const eastGable = new THREE.Mesh(gableGeo, mat);
    eastGable.rotation.y = Math.PI / 2;
    eastGable.position.set(maxX, eaveY, cz);

    group.add(northSlope, southSlope, westGable, eastGable);
    return group;
  }

  #rebuildDynamicOpenings() {
    this.dynamicDoorsGroup.clear();
    this.dynamicWindowsGroup.clear();

    for (const door of this.world.doors) {
      const isHoriz = door.orientation === 'H';
      const w = door.width;
      const h = door.height;
      const t = 0.07;

      const pivot = new THREE.Group();
      pivot.position.set(door.hinge.x, 0, door.hinge.z);

      const leafGeo = isHoriz
        ? new THREE.BoxGeometry(w, h, t)
        : new THREE.BoxGeometry(t, h, w);
      const leafMat = door.state === 'open' ? this.materials.door_open : this.materials.door_closed;
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);
      if (isHoriz) {
        leafMesh.position.set(w / 2, h / 2, 0);
      } else {
        leafMesh.position.set(0, h / 2, w / 2);
      }

      if (door.state === 'open') {
        pivot.rotation.y = isHoriz ? -Math.PI * 0.46 : Math.PI * 0.46;
      }

      pivot.add(leafMesh);
      this.dynamicDoorsGroup.add(pivot);
    }

    for (const win of this.world.windows) {
      const isHoriz = win.orientation === 'H';
      const h = win.lintelY - win.sillY;
      const w = win.width;
      if (win.state === 'intact') {
        const paneGeo = isHoriz
          ? new THREE.BoxGeometry(w, h, 0.03)
          : new THREE.BoxGeometry(0.03, h, w);
        const pane = new THREE.Mesh(paneGeo, this.materials.glass_intact);
        pane.position.set(win.center.x, win.center.y, win.center.z);
        this.dynamicWindowsGroup.add(pane);
      } else if (win.state === 'broken') {
        // Small glass shards along the sill to visually confirm shattered glass
        for (let i = -1; i <= 1; i++) {
          const shard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.03), this.materials.glass_shard);
          shard.position.set(
            win.center.x + (isHoriz ? i * 0.25 : 0),
            win.sillY + 0.07,
            win.center.z + (isHoriz ? 0 : i * 0.25),
          );
          shard.rotation.z = i * 0.35;
          this.dynamicWindowsGroup.add(shard);
        }
      }
    }

    // Destructible wooden fences (intact vs breached)
    for (const fence of this.world.fences ?? []) {
      const sx = fence.max.x - fence.min.x;
      const sy = fence.max.y - fence.min.y;
      const sz = fence.max.z - fence.min.z;
      const cx = (fence.min.x + fence.max.x) / 2;
      const cz = (fence.min.z + fence.max.z) / 2;
      if (fence.state === 'intact') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.materials.wood_thin);
        mesh.position.set(cx, sy / 2, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.dynamicDoorsGroup.add(mesh);
      } else {
        // Breached fence: render low splintered posts on the edges and a wide gap in the center
        const stubLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.36, sz), this.materials.wood_thin);
        stubLeft.position.set(fence.min.x + 0.7, 0.18, cz);
        stubLeft.rotation.z = -0.18;
        const stubRight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.36, sz), this.materials.wood_thin);
        stubRight.position.set(fence.max.x - 0.7, 0.18, cz);
        stubRight.rotation.z = 0.22;
        this.dynamicDoorsGroup.add(stubLeft, stubRight);
      }
    }

    this.lastWorldRevision = this.world.revision;
  }

  // Articulated soldier (see rigCreate). Same entry keys as before (group/legs/torso/head/helmet/arms/weaponGroup/uniformMat).
  #createSoldierMesh({ faction = 'de', weapon = 'kar98k', id = '', role = '' } = {}) {
    return rigCreate(this.materials, { faction, weapon, id, role });
  }

  // Pose one soldier from its real simulation state (movement, posture, weapon timers, suppression, tactical state).
  #poseSoldier(entry, actor, side, dt) {
    const dist = Math.hypot(actor.x - this.sim.player.x, actor.z - this.sim.player.z);
    const band = selectConsumerLod('actors', dist, this.qualityProfile.lodPreset, entry.group.userData.lodBand ?? null);
    entry.group.userData.lodBand = band;
    rigPose(entry, actor, { clock: this.sim.clock, dt, side, lodBand: band });
  }

  #buildTargets() {
    this.targetsGroup.clear();
    this.targetMeshes.clear();
    this.allyMeshes.clear();
    this.enemyMeshes.clear();

    // Build Polish squad meshes (7 allies)
    for (const a of this.sim.allies ?? []) {
      const soldier = this.#createSoldierMesh({ faction: 'pl', weapon: a.weapon ?? 'wz29', id: a.id, role: a.role });
      soldier.group.position.set(a.x, a.y, a.z);
      soldier.group.rotation.y = rigYawFromFacing(a.facing);
      this.targetsGroup.add(soldier.group);
      this.allyMeshes.set(a.id, soldier);
    }

    // Build German EA1 defender meshes (10 defenders)
    for (const e of this.sim.enemies ?? []) {
      const soldier = this.#createSoldierMesh({ faction: 'de', weapon: e.weapon ?? 'kar98k', id: e.id, role: e.role });
      soldier.group.position.set(e.x, e.y, e.z);
      soldier.group.rotation.y = rigYawFromFacing(e.facing);
      this.targetsGroup.add(soldier.group);
      this.enemyMeshes.set(e.id, soldier);
    }
  }

  #buildHorizonRing() {
    this.horizonGroup.clear();
    // L2/L3 360-degree distant treeline ring around the 100x150m farmstead
    const ringCount = 28;
    const radius = 195;
    for (let i = 0; i < ringCount; i++) {
      const a = (i / ringCount) * Math.PI * 2;
      const hx = Math.cos(a) * radius;
      const hz = Math.sin(a) * radius - 15;
      const w = 34 + (i % 3) * 12;
      const h = 11 + (i % 4) * 3.5;
      const treeBlock = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), this.materials.horizon_treeline);
      treeBlock.position.set(hx, h / 2 - 1, hz);
      treeBlock.rotation.y = -a + Math.PI / 2;
      this.horizonGroup.add(treeBlock);
    }

    // Provisional L3 study volume (Document H: Tum / Kolegiata study silhouette — explicitly tagged provisional)
    const studyGroup = new THREE.Group();
    const nave = new THREE.Mesh(new THREE.BoxGeometry(28, 18, 14), this.materials.horizon_study);
    nave.position.set(-260, 9, 280);
    const towerA = new THREE.Mesh(new THREE.BoxGeometry(7, 32, 7), this.materials.horizon_study);
    towerA.position.set(-272, 16, 280);
    const towerB = new THREE.Mesh(new THREE.BoxGeometry(7, 32, 7), this.materials.horizon_study);
    towerB.position.set(-248, 16, 280);
    studyGroup.add(nave, towerA, towerB);
    this.horizonGroup.add(studyGroup);
  }

  #buildDebugOverlay() {
    this.debugGroup.clear();
    // MG34 sector lines and Route A / Route B guide markers when debugLoSVisible is toggled
    const ditchPts = this.world.layout.routes.ditch.map(([x, z]) => new THREE.Vector3(x, this.world.terrainHeightAt(x, z) + 0.25, z));
    const ditchLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ditchPts),
      new THREE.LineBasicMaterial({ color: 0x4fc3f7 }),
    );
    const orchardPts = this.world.layout.routes.orchard.map(([x, z]) => new THREE.Vector3(x, this.world.terrainHeightAt(x, z) + 0.25, z));
    const orchardLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orchardPts),
      new THREE.LineBasicMaterial({ color: 0x81c784 }),
    );
    const mgRayPts = [
      new THREE.Vector3(11.82, 1.42, -30.0),
      new THREE.Vector3(-42.0, 1.2, -55.0),
      new THREE.Vector3(11.82, 1.42, -30.0),
      new THREE.Vector3(-35.0, 1.2, -5.0),
    ];
    const mgArcLine = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(mgRayPts),
      new THREE.LineBasicMaterial({ color: 0xff5252 }),
    );
    this.debugGroup.add(ditchLine, orchardLine, mgArcLine);
    this.debugGroup.visible = this.debugLoSVisible;
  }

  toggleDebugOverlay(force = null) {
    this.debugLoSVisible = force !== null ? Boolean(force) : !this.debugLoSVisible;
    this.debugGroup.visible = this.debugLoSVisible;
    return this.debugLoSVisible;
  }

  applyQualityProfile(profileId) {
    const next = M02_QUALITY_PROFILES[profileId] ?? M02_QUALITY_PROFILES.medium;
    this.qualityProfile = next;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    this.renderer.setPixelRatio(Math.min(dpr, next.pixelRatioCap));
    this.renderer.shadowMap.enabled = next.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.sunLight.castShadow = next.shadows;
    this.horizonGroup.visible = true;
    return this.qualityProfile;
  }

  applyLightingPreset(presetId) {
    const next = M02_LIGHTING_PRESETS[presetId] ?? M02_LIGHTING_PRESETS.afternoon_1939_09_09;
    this.lightingPreset = next;
    this.scene.background = new THREE.Color(next.skyColor);
    this.scene.fog = new THREE.Fog(next.fogColor, next.fogNear, next.fogFar);
    this.hemiLight.color.setHex(next.hemiSky);
    this.hemiLight.groundColor.setHex(next.hemiGround);
    this.hemiLight.intensity = next.hemiIntensity;
    this.sunLight.color.setHex(next.sunColor);
    this.sunLight.intensity = next.sunIntensity;
    this.sunLight.position.set(...next.sunPosition);
    return this.lightingPreset;
  }

  spawnShotVisual(shotRecord, colorHex = null) {
    const color = colorHex ?? (
      shotRecord.hitTarget
        ? 0x66bb6a
        : shotRecord.glassBrokenId
          ? 0x4dd0e1
          : 0xffb74d
    );
    const pts = [
      new THREE.Vector3(shotRecord.origin.x, shotRecord.origin.y - 0.06, shotRecord.origin.z),
      new THREE.Vector3(shotRecord.point.x, shotRecord.point.y, shotRecord.point.z),
    ];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color }),
    );
    const impact = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshBasicMaterial({ color }),
    );
    impact.position.set(shotRecord.point.x, shotRecord.point.y, shotRecord.point.z);
    this.tracersGroup.add(line, impact);
    this.activeTracers.push({ line, impact, expiresAt: this.sim.clock + 1.4 });
  }

  resize() {
    const width = this.canvas.clientWidth || 1280;
    const height = this.canvas.clientHeight || 720;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  renderFrame(dt, simMs = 0) {
    const renderStart = performance.now();

    if (this.world.revision !== this.lastWorldRevision) {
      this.#rebuildDynamicOpenings();
    }

    // Drain simulation events to spawn shot tracers, actor bursts, grenade blasts, or MG bursts
    const events = this.sim.drainEvents();
    for (const evt of events) {
      if (evt.type === 'shot-fired' && evt.shot) {
        this.spawnShotVisual(evt.shot);
      } else if (evt.type === 'actor-burst' && evt.origin && evt.target) {
        this.spawnShotVisual(
          {
            origin: evt.origin,
            point: evt.target,
            hitTarget: evt.hitAny,
          },
          evt.side === 'ally' ? 0xffe082 : 0xff6e40,
        );
      } else if (evt.type === 'grenade-exploded' && evt.center) {
        const ring = new THREE.Mesh(
          new THREE.SphereGeometry(1.6, 12, 10),
          new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.55 }),
        );
        ring.position.set(evt.center.x, evt.center.y, evt.center.z);
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfff3b0 }),
        );
        core.position.set(evt.center.x, evt.center.y, evt.center.z);
        this.tracersGroup.add(ring, core);
        this.activeTracers.push({ line: ring, impact: core, expiresAt: this.sim.clock + 1.1 });
      } else if (evt.type === 'mg-burst') {
        // Emplaced gunner recoil even when this burst is the emplacement's own (shotsFired not incremented).
        rigKick(this.enemyMeshes.get('DE-A05'), evt.rounds, this.sim.clock);
        this.spawnShotVisual(
          {
            origin: evt.origin,
            point: evt.target,
            hitTarget: false,
          },
          0xff5252,
        );
      }
    }

    if (this.c04ChalkMesh) {
      this.c04ChalkMesh.visible = Boolean(this.sim.flags?.['m02.pomar_wounded_marked']);
    }

    // Clean expired tracers
    for (let i = this.activeTracers.length - 1; i >= 0; i--) {
      if (this.sim.clock >= this.activeTracers[i].expiresAt) {
        const item = this.activeTracers[i];
        this.tracersGroup.remove(item.line, item.impact);
        item.line.geometry.dispose();
        item.impact.geometry.dispose();
        this.activeTracers.splice(i, 1);
      }
    }

    // Update Polish squad meshes (7 allies) and German EA1 defender meshes (10 defenders)
    const player = this.sim.player;
    for (const a of this.sim.allies ?? []) {
      const entry = this.allyMeshes.get(a.id);
      if (entry) this.#poseSoldier(entry, a, 'ally', dt);
    }
    for (const e of this.sim.enemies ?? []) {
      const entry = this.enemyMeshes.get(e.id);
      if (entry) this.#poseSoldier(entry, e, 'enemy', dt);
    }

    // Camera pose from simulation player
    const eye = eyePosition(player);
    this.camera.position.set(eye.x, eye.y, eye.z);
    // In COD-Guerra spatial.js: +X is cos(angle), +Z is sin(angle).
    // Three.js camera looks down -Z when rotation.y = 0, so yaw = -angle - PI/2.
    this.camera.rotation.y = -player.angle - Math.PI / 2;
    this.camera.rotation.x = player.pitch;

    // Subtle weapon viewmodel bob and ADS offset
    const bob = player.moving ? Math.sin(this.sim.clock * (player.sprinting ? 11 : 7.5)) * 0.012 : 0;
    this.viewModel.position.set(
      player.aiming ? -0.14 : 0,
      bob,
      player.aiming ? 0.08 : 0,
    );

    this.renderer.render(this.scene, this.camera);

    const renderMs = performance.now() - renderStart;
    const frameTimeMs = dt * 1000;
    this.lastFrameMetrics = {
      frameTimeMs: Number(frameTimeMs.toFixed(2)),
      simMs: Number(simMs.toFixed(2)),
      renderMs: Number(renderMs.toFixed(2)),
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
    this.telemetryWindow.push(this.lastFrameMetrics);
    if (this.telemetryWindow.length > 240) this.telemetryWindow.shift();

    return this.lastFrameMetrics;
  }

  getTelemetrySummary() {
    const frames = this.telemetryWindow.map((m) => m.frameTimeMs).sort((a, b) => a - b);
    const renders = this.telemetryWindow.map((m) => m.renderMs).sort((a, b) => a - b);
    const sims = this.telemetryWindow.map((m) => m.simMs).sort((a, b) => a - b);
    const p50 = percentile(frames, 50);
    const p95 = percentile(frames, 95);
    const p99 = percentile(frames, 99);
    return {
      qualityProfile: this.qualityProfile.id,
      lightingPreset: this.lightingPreset.id,
      sampleCount: this.telemetryWindow.length,
      fpsP50: p50 > 0 ? Number((1000 / p50).toFixed(1)) : 0,
      frameTimeMs: {
        p50: Number(p50.toFixed(2)),
        p95: Number(p95.toFixed(2)),
        p99: Number(p99.toFixed(2)),
      },
      simMsP50: Number(percentile(sims, 50).toFixed(2)),
      renderMsP50: Number(percentile(renders, 50).toFixed(2)),
      drawCalls: this.lastFrameMetrics.drawCalls,
      triangles: this.lastFrameMetrics.triangles,
    };
  }
}
