// Shared helpers for the M02 N0 proofs (planta + tabela de vãos).
// Read-only over missions/, src/world, src/game and src/m02: nothing here mutates the simulation or game data.
// Axes: x east, z south (plan view: north up), y up, all in metres (see layout "axes").
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { M02QuintaWorld, m02MgMuzzle } from '../../src/world/m02-quinta-world.js';
import { PLAYER_PHYSICS, deepestWall } from '../../src/world/m01-player-physics.js';
import { traceObstruction } from '../../src/world/spatial.js';
import { EYE_HEIGHT } from '../../src/config.js';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LAYOUT_PATH = path.join(REPO_ROOT, 'missions', 'm02-bzura', 'm02-01-quinta-layout.json');
export const MAIN_PATH = path.join(REPO_ROOT, 'src', 'm02', 'm02-01-main.js');
export const SIM_PATH = path.join(REPO_ROOT, 'src', 'game', 'm02-01-simulation.js');

// Crouched eye height literal of m02-01-simulation.js ("player.crouched ? 1.08 : EYE_HEIGHT"), read from source so a change is noticed.
export const CROUCH_EYE = (() => {
  const m = readFileSync(SIM_PATH, 'utf8').match(/player\.eyeHeight = this\.player\.crouched \? ([\d.]+) : EYE_HEIGHT;/);
  if (!m) throw new Error('crouched eye-height literal not found in m02-01-simulation.js');
  return Number(m[1]);
})();
export const STAND_EYE = EYE_HEIGHT;
export const PLAYER = Object.freeze({
  radius: PLAYER_PHYSICS.radius,
  standHeight: PLAYER_PHYSICS.standHeight,
  crouchHeight: PLAYER_PHYSICS.crouchHeight,
  stepUp: PLAYER_PHYSICS.stepUp,
  standEye: STAND_EYE,
  crouchEye: CROUCH_EYE,
});

// MG34 muzzle: single source of truth = layout.mgEmplacement (x, z, muzzleY), read through the same helper the simulation, the
// renderer and the squad AI use (m02MgMuzzle). The table calls the real M02BenchSimulation.evaluateMgLineOfFire; nothing is mirrored.
export function layoutMgMuzzle(layout) {
  return m02MgMuzzle(layout.mgEmplacement);
}

// PDF F3 (p. 24): «MG a (12,-30) no mundo, auxiliar adjacente; raio de arma verifica montantes e parapeito».
export const PDF_MG = Object.freeze({ x: 12, z: -30, page: 24, ref: 'F3' });

// Canonical coordinates quoted by the owner's PDF (section N, p. 47 plan + N5 p. 49 text).
export const PDF_SN = Object.freeze({
  SN1: { x: 0, z: -80, label: 'entrada' },
  SN2: { x: -45, z: -5, label: 'vala' },
  SN3: { x: -23, z: -12, label: 'casa' },
  SN4: { x: 8, z: -28, label: 'celeiro' },
  SN5: { x: 0, z: 45, label: 'pomar' },
});

// Owner's PDF, section F (pp. 23-25): building envelope as written.
export const PDF_BUILDINGS = Object.freeze({
  B01: { page: 24, ref: 'F2', bounds: [-40, -26, -18, -8], width: 14, depth: 10, wallHeight: 2.8, ridgeHeight: 5.2 },
  B02: { page: 24, ref: 'F3', bounds: [12, 36, -38, -24], width: 24, depth: 14, wallHeight: 3.6, ridgeHeight: 7.2 },
  B03: { page: 25, ref: 'F4', bounds: [20, 38, 0, 12], width: 18, depth: 12, wallHeight: null, ridgeHeight: null },
  B04: { page: 25, ref: 'F5', bounds: [-37, -29, 20, 26], width: 8, depth: 6, wallHeight: null, ridgeHeight: null },
});

// Door widths the PDF states in prose (metres): F1 p.23 (free clearance), F2-F5 pp.24-25.
export const PDF_DOORS = Object.freeze({
  door_b01_east_main: { width: 1.0, page: 23, note: 'F1 p.23: folga pedonal 1,0 m; F2 p.24: entrada este em u=14 m, v=2,5 m' },
  door_b01_north_service: { width: null, page: 24, note: 'F2 p.24: saída de serviço norte em u=3, v=0' },
  door_b02_north_gate: { width: 3.0, page: 24, note: 'F3 p.24: portão norte centrado em u12, vão de 3 m' },
  door_b02_south_door: { width: 1.2, page: 24, note: 'F3 p.24: porta sul u18, 1,2 m' },
  door_b03_north: { width: 2.4, page: 25, note: 'F4 p.25: portas norte/sul de 2,4 m' },
  door_b03_south: { width: 2.4, page: 25, note: 'F4 p.25: portas norte/sul de 2,4 m' },
  door_b04_south: { width: 1.0, page: 25, note: 'F5 p.25: porta sul 1 m' },
});

export function loadLayout() {
  const text = readFileSync(LAYOUT_PATH, 'utf8');
  return { layout: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex') };
}

// Parses PANORAMA_VIEWS out of src/m02/m02-01-main.js (that file touches window/document, so it cannot be imported in Node).
export function readPanoramaViews() {
  const src = readFileSync(MAIN_PATH, 'utf8');
  const block = src.match(/const PANORAMA_VIEWS = Object\.freeze\(\{([\s\S]*?)\}\);/);
  if (!block) throw new Error('PANORAMA_VIEWS not found in m02-01-main.js');
  const views = {};
  const evalNum = (expr) => {
    const e = expr.trim();
    if (!/^[-+*/().\sA-Za-z0-9]+$/.test(e) || /[A-Za-z]/.test(e.replace(/Math\.PI/g, ''))) {
      throw new Error(`Unsupported expression in PANORAMA_VIEWS: ${expr}`);
    }
    return Function(`"use strict"; return (${e});`)();
  };
  for (const line of block[1].split('\n')) {
    const m = line.match(/^\s*(SN\d):\s*\{\s*x:\s*([^,]+),\s*z:\s*([^,]+),\s*angle:\s*([^,]+),\s*pitch:\s*([^,]+),/);
    if (m) views[m[1]] = { x: evalNum(m[2]), z: evalNum(m[3]), angle: evalNum(m[4]), pitch: evalNum(m[5]) };
  }
  return views;
}

const r2 = (n) => Math.round(n * 100) / 100;

// World-space geometry of every door/window straight from the layout data (independent of the world class).
export function openingGeometry(layout) {
  const out = [];
  for (const b of layout.buildings) {
    const ox = b.bounds[0];
    const oz = b.bounds[2];
    const wallById = new Map(b.walls.map((w) => [w.id, w]));
    const add = (o, kind) => {
      const w = wallById.get(o.wallId);
      const horiz = Math.abs(w.v1 - w.v0) < 1e-6;
      const len = horiz ? Math.abs(w.u1 - w.u0) : Math.abs(w.v1 - w.v0);
      const startU = Math.min(w.u0, w.u1);
      const startV = Math.min(w.v0, w.v1);
      const center = horiz
        ? { x: ox + startU + o.offset, z: oz + startV }
        : { x: ox + startU, z: oz + startV + o.offset };
      let side;
      if (!w.exterior) side = 'interior';
      else if (horiz) side = startV === 0 ? 'norte' : 'sul';
      else side = startU === 0 ? 'oeste' : 'este';
      const sill = kind === 'window' ? (o.sillY ?? 0.95) : 0;
      const lintel = kind === 'window' ? (o.lintelY ?? 2.05) : (o.height ?? 2.1);
      out.push({
        kind,
        id: o.id,
        buildingId: b.id,
        wallId: o.wallId,
        wall: w,
        exterior: Boolean(w.exterior),
        side,
        horiz,
        wallLength: len,
        offset: o.offset,
        width: o.width,
        sillY: sill,
        lintelY: lintel,
        clearHeight: r2(lintel - sill),
        initialState: kind === 'window' ? (o.glassState ?? 'open') : (o.initialState ?? 'closed'),
        frameWidth: o.frameWidth ?? (kind === 'window' ? 0.1 : 0.08),
        label: o.label ?? o.id,
        material: o.material ?? null,
        center: { x: r2(center.x), z: r2(center.z) },
        // unit normal of the wall plane (z for east-west walls, x for north-south walls)
        normal: horiz ? { x: 0, z: 1 } : { x: 1, z: 0 },
        // ends of the clear span in world space
        span: horiz
          ? [{ x: r2(center.x - o.width / 2), z: r2(center.z) }, { x: r2(center.x + o.width / 2), z: r2(center.z) }]
          : [{ x: r2(center.x), z: r2(center.z - o.width / 2) }, { x: r2(center.x), z: r2(center.z + o.width / 2) }],
      });
    };
    for (const d of b.doors ?? []) add(d, 'door');
    for (const w of b.windows ?? []) add(w, 'window');
  }
  return out;
}

export function makeWorld(layout, { openAll = false } = {}) {
  const world = new M02QuintaWorld(layout);
  if (openAll) {
    for (const b of layout.buildings) {
      for (const d of b.doors ?? []) world.setDoorState(d.id, 'open');
      for (const w of b.windows ?? []) world.setWindowState(w.id, 'open');
    }
  }
  return world;
}

// --- Probes (read-only queries on the world's own collision and ray code) ---------------------------

/** Can a capsule of `radius` x `height` walk straight through the opening along the wall normal? */
export function probePassage(world, op, { radius = PLAYER.radius, height = PLAYER.standHeight, reach = op.exterior ? 1.6 : 1.2 } = {}) {
  const y = world.heightAt(op.center.x, op.center.z);
  for (let t = -reach; t <= reach + 1e-9; t += 0.05) {
    const x = op.center.x + op.normal.x * t;
    const z = op.center.z + op.normal.z * t;
    const wall = deepestWall(world, x, z, y, radius, height);
    if (wall) return { passes: false, blockerId: wall.b.id, role: wall.b.role, at: r2(t) };
  }
  return { passes: true, blockerId: null, role: null, at: null };
}

/** Lateral offsets (m along the wall, from the opening centre) for which the capsule passes: {min, max, count} or null if none. */
export function lateralPassRange(world, op, { radius = PLAYER.radius, height = PLAYER.standHeight, step = 0.02 } = {}) {
  let min = null;
  let max = null;
  const lx = op.horiz ? 1 : 0;
  const lz = op.horiz ? 0 : 1;
  for (let s = -op.width / 2 - 0.2; s <= op.width / 2 + 0.2 + 1e-9; s += step) {
    const shifted = { ...op, center: { x: op.center.x + lx * s, z: op.center.z + lz * s } };
    if (probePassage(world, shifted, { radius, height }).passes) {
      if (min === null) min = s;
      max = s;
    }
  }
  return min === null ? null : { min: r2(min), max: r2(max) };
}

/** Largest capsule radius that still passes within the wall thickness (lateral clearance of the opening), 0 when nothing passes. */
export function maxPassingRadius(world, op, height = PLAYER.standHeight) {
  const ok = (r) => probePassage(world, op, { radius: r, height, reach: 0.3 }).passes;
  if (!ok(0.01)) return 0;
  let lo = 0.01;
  let hi = 1.5;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return r2(lo);
}

export const actorAt = (x, z, eyeHeight, y = 0) => ({ x, y, z, eyeHeight, space: 'metres' });

/** Geometric ray between two eye points: world.lineOfSight plus the first blocker (any solid blocks, no penetration is simulated). */
export function sightInfo(world, a, b) {
  const ay = (a.y ?? 0) + (a.eyeHeight ?? STAND_EYE);
  const by = (b.y ?? 0) + (b.eyeHeight ?? STAND_EYE);
  const dist = Math.hypot(b.x - a.x, by - ay, b.z - a.z);
  const dir = { x: (b.x - a.x) / dist, y: (by - ay) / dist, z: (b.z - a.z) / dist };
  const hit = traceObstruction(world, { x: a.x, y: ay, z: a.z }, dir, Math.max(0, dist - 0.02));
  const los = world.lineOfSight(a, b, { includeFoliage: true });
  return {
    los,
    // `hit` = primeiro sólido balístico no raio (o vidro intacto conta: pára a bala) mesmo que a vista passe por ele.
    hitId: hit?.id ?? null,
    hitMaterial: hit?.material ?? null,
    blockerId: hit?.id ?? (!los ? 'copa' : null),
    material: hit?.material ?? (!los ? 'foliage' : null),
    distance: r2(dist),
  };
}

/** Sight through the opening along the wall normal, at the given eye height above the floor, from `d` metres each side. */
export function probeSight(world, op, eyeHeight, d = op.exterior ? 3 : 1.4) {
  const gy = world.heightAt(op.center.x, op.center.z);
  const a = actorAt(op.center.x - op.normal.x * d, op.center.z - op.normal.z * d, eyeHeight, gy);
  const b = actorAt(op.center.x + op.normal.x * d, op.center.z + op.normal.z * d, eyeHeight, gy);
  return sightInfo(world, a, b);
}

export { r2 };
