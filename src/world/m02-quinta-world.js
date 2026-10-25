import layout from '../../missions/m02-bzura/m02-01-quinta-layout.json' with { type: 'json' };
import { visible, traceObstruction } from './spatial.js';
import { indexSolids } from './m01-collision-layout.js';

const xyz = (a) => ({ x: a[0], y: a[1], z: a[2] });

const makeBox = (id, min, max, extra = {}) => ({
  ...extra,
  id,
  min: xyz(min),
  max: xyz(max),
  material: extra.material ?? 'brick',
});

const aabbToSolid = (b, kind = 'obstacle') => {
  const cx = (b.min.x + b.max.x) / 2;
  const cz = (b.min.z + b.max.z) / 2;
  const hx = (b.max.x - b.min.x) / 2;
  const hz = (b.max.z - b.min.z) / 2;
  return {
    id: b.id,
    kind,
    material: b.material ?? 'brick',
    role: b.role ?? kind,
    cx,
    cz,
    hx,
    hz,
    yaw: 0,
    c: 1,
    s: 0,
    y0: b.min.y,
    y1: b.max.y,
    minX: b.min.x,
    maxX: b.max.x,
    minZ: b.min.z,
    maxZ: b.max.z,
  };
};

export const BALLISTIC_MATERIAL_POLICY = Object.freeze({
  stone: Object.freeze({ blocksShot: true, blocksSight: true, penetrationLoss: 1.0, label: 'Pedra / Alvenaria pesada' }),
  brick: Object.freeze({ blocksShot: true, blocksSight: true, penetrationLoss: 1.0, label: 'Alvenaria de tijolo / reboco' }),
  earth: Object.freeze({ blocksShot: true, blocksSight: true, penetrationLoss: 1.0, label: 'Terra / Talude' }),
  metal: Object.freeze({ blocksShot: true, blocksSight: true, penetrationLoss: 1.0, label: 'Metal' }),
  wood_thick: Object.freeze({ blocksShot: true, blocksSight: true, penetrationLoss: 0.85, label: 'Madeira estrutural / Batente' }),
  wood_thin: Object.freeze({ blocksShot: true, blocksSight: true, penetrationLoss: 0.45, label: 'Tábua / Folha de porta' }),
  glass: Object.freeze({ blocksShot: true, blocksSight: false, breakable: true, penetrationLoss: 0.1, label: 'Vidro de janela' }),
  foliage: Object.freeze({ blocksShot: false, blocksSight: true, penetrationLoss: 0.0, label: 'Copa vegetal (oclusão visual)' }),
});

export class M02QuintaWorld {
  constructor(customLayout = layout) {
    this.missionId = customLayout.missionId ?? 'm02_01_quinta';
    this.layout = customLayout;
    this.events = [];
    this.colliders = [];
    this.decks = [];
    this.joints = [];
    this.walkSurfaces = [];
    this.spanDecks = [];
    this.waterY = -10;
    this.revision = 0;

    this.doorStates = new Map();
    this.windowStates = new Map();
    for (const b of this.layout.buildings) {
      for (const d of b.doors ?? []) this.doorStates.set(d.id, d.initialState ?? 'closed');
      for (const w of b.windows ?? []) this.windowStates.set(w.id, w.glassState ?? 'open');
    }

    this.refresh();
  }

  isWater() {
    return false;
  }

  getDoorState(doorId) {
    return this.doorStates.get(doorId) ?? null;
  }

  setDoorState(doorId, state) {
    if (!this.doorStates.has(doorId)) throw new Error(`Porta M02 desconhecida: ${doorId}`);
    if (state !== 'open' && state !== 'closed' && state !== 'destroyed') {
      throw new Error(`Estado de porta inválido: ${state}`);
    }
    const prev = this.doorStates.get(doorId);
    if (prev === state) return false;
    this.doorStates.set(doorId, state);
    this.refresh();
    return true;
  }

  toggleDoor(doorId) {
    const cur = this.getDoorState(doorId);
    if (!cur || cur === 'destroyed') return cur;
    const next = cur === 'open' ? 'closed' : 'open';
    this.setDoorState(doorId, next);
    return next;
  }

  getWindowState(windowId) {
    return this.windowStates.get(windowId) ?? null;
  }

  setWindowState(windowId, state) {
    if (!this.windowStates.has(windowId)) throw new Error(`Janela M02 desconhecida: ${windowId}`);
    const prev = this.windowStates.get(windowId);
    if (prev === state) return false;
    this.windowStates.set(windowId, state);
    this.refresh();
    return true;
  }

  terrainHeightAt(x, z) {
    for (const b of this.layout.buildings) {
      const [minX, maxX, minZ, maxZ] = b.bounds;
      if (x >= minX - 0.8 && x <= maxX + 0.8 && z >= minZ - 0.8 && z <= maxZ + 0.8) {
        return 0;
      }
    }

    const cy = this.layout.zones.courtyard;
    if (x >= cy.minX && x <= cy.maxX && z >= cy.minZ && z <= cy.maxZ) {
      return 0;
    }

    const ditch = this.layout.zones.ditch;
    if (x >= ditch.minX && x <= ditch.maxX && z >= ditch.minZ && z <= ditch.maxZ) {
      const center = (ditch.minX + ditch.maxX) / 2;
      const halfW = (ditch.maxX - ditch.minX) / 2;
      const flatHalf = Math.max(0.8, halfW - ditch.bankWidth);
      const dx = Math.abs(x - center);
      let xFactor = 1;
      if (dx > flatHalf) {
        xFactor = Math.max(0, Math.min(1, 1 - (dx - flatHalf) / ditch.bankWidth));
      }
      let zFactor = 1;
      if (z < ditch.minZ + 3) {
        zFactor = Math.max(0, Math.min(1, (z - ditch.minZ) / 3));
      } else if (z > ditch.maxZ - 3) {
        zFactor = Math.max(0, Math.min(1, (ditch.maxZ - z) / 3));
      }
      return ditch.floorY * xFactor * zFactor;
    }

    // Gentle agricultural micro-relief on the eastern/southern flank only outside roads and courtyard
    if (Math.abs(x) <= 3.5) return 0;
    if (x > 38 && z >= -60 && z <= 35) {
      return 0.18 * Math.sin((z + 60) * 0.05);
    }
    return 0;
  }

  heightAt(x, z) {
    let deck = -Infinity;
    for (const c of this.walkSurfaces) {
      if (x >= c.min.x && x <= c.max.x && z >= c.min.z && z <= c.max.z) {
        deck = Math.max(deck, c.max.y);
      }
    }
    if (deck !== -Infinity) return deck;
    return this.terrainHeightAt(x, z);
  }

  refresh() {
    const obstacles = [];
    const sightBlockers = [];
    const doorDescriptors = [];
    const windowDescriptors = [];

    for (const b of this.layout.buildings) {
      const [originX, , originZ] = b.bounds;
      const wallH = b.wallHeight ?? 2.8;
      const baseThick = b.wallThickness ?? 0.25;
      const wallById = new Map(b.walls.map((w) => [w.id, w]));

      const openingsByWall = new Map(b.walls.map((w) => [w.id, []]));

      for (const d of b.doors ?? []) {
        const state = this.doorStates.get(d.id) ?? d.initialState ?? 'closed';
        const jambW = d.frameWidth ?? 0.08;
        openingsByWall.get(d.wallId)?.push({
          kind: 'door',
          id: d.id,
          offset: d.offset,
          width: d.width,
          sillY: 0,
          lintelY: d.height ?? 2.1,
          jambW,
          material: d.material ?? 'wood_thin',
          state,
          raw: d,
        });
      }

      for (const w of b.windows ?? []) {
        const state = this.windowStates.get(w.id) ?? w.glassState ?? 'open';
        const jambW = w.frameWidth ?? 0.1;
        openingsByWall.get(w.wallId)?.push({
          kind: 'window',
          id: w.id,
          offset: w.offset,
          width: w.width,
          sillY: w.sillY ?? 0.95,
          lintelY: w.lintelY ?? 2.05,
          jambW,
          material: 'wood_thick',
          state,
          raw: w,
        });
      }

      for (const w of b.walls) {
        const horiz = Math.abs(w.v1 - w.v0) < 1e-6;
        const len = horiz ? Math.abs(w.u1 - w.u0) : Math.abs(w.v1 - w.v0);
        const startU = Math.min(w.u0, w.u1);
        const startV = Math.min(w.v0, w.v1);
        const halfT = (w.exterior ? baseThick : baseThick * 0.78) / 2;
        const wallMat = w.material ?? b.material ?? 'brick';

        const makeSpanBox = (id, s0, s1, y0, y1, extra = {}) => {
          if (s1 - s0 <= 1e-4 || y1 - y0 <= 1e-4) return null;
          const thicknessScale = extra.thicknessScale ?? 1;
          const ht = halfT * thicknessScale;
          const min = horiz
            ? [originX + startU + s0, y0, originZ + startV - ht]
            : [originX + startU - ht, y0, originZ + startV + s0];
          const max = horiz
            ? [originX + startU + s1, y1, originZ + startV + ht]
            : [originX + startU + ht, y1, originZ + startV + s1];
          return makeBox(id, min, max, {
            buildingId: b.id,
            wallId: w.id,
            material: extra.material ?? wallMat,
            role: extra.role ?? 'wall',
            ...extra,
          });
        };

        const ops = (openingsByWall.get(w.id) ?? [])
          .map((op) => {
            const clear0 = Math.max(0, op.offset - op.width / 2);
            const clear1 = Math.min(len, op.offset + op.width / 2);
            const cut0 = Math.max(0, clear0 - op.jambW);
            const cut1 = Math.min(len, clear1 + op.jambW);
            return { ...op, clear0, clear1, cut0, cut1 };
          })
          .sort((a, c) => a.cut0 - c.cut0);

        let cursor = 0;
        let segIdx = 0;
        for (const op of ops) {
          if (op.cut0 > cursor + 1e-3) {
            const seg = makeSpanBox(`${w.id}_seg_${segIdx++}`, cursor, op.cut0, 0, wallH, {
              role: 'wall',
              material: wallMat,
            });
            if (seg) obstacles.push(seg);
          }

          // Left and right wooden jambs / frames
          const jambLeft = makeSpanBox(`${op.id}_jamb_a`, op.cut0, op.clear0, 0, wallH, {
            role: op.kind === 'window' ? 'window_frame' : 'door_frame',
            openingId: op.id,
            material: 'wood_thick',
          });
          const jambRight = makeSpanBox(`${op.id}_jamb_b`, op.clear1, op.cut1, 0, wallH, {
            role: op.kind === 'window' ? 'window_frame' : 'door_frame',
            openingId: op.id,
            material: 'wood_thick',
          });
          if (jambLeft) obstacles.push(jambLeft);
          if (jambRight) obstacles.push(jambRight);

          // Upper lintel above door or window
          const lintel = makeSpanBox(`${op.id}_lintel`, op.clear0, op.clear1, op.lintelY, wallH, {
            role: op.kind === 'window' ? 'window_lintel' : 'door_lintel',
            openingId: op.id,
            material: wallMat,
          });
          if (lintel) obstacles.push(lintel);

          if (op.kind === 'window') {
            // Lower masonry/wood sill under the window opening
            const sill = makeSpanBox(`${op.id}_sill`, op.clear0, op.clear1, 0, op.sillY, {
              role: 'window_sill',
              openingId: op.id,
              material: wallMat,
            });
            if (sill) obstacles.push(sill);

            const centerWorld = horiz
              ? { x: originX + startU + op.offset, y: (op.sillY + op.lintelY) / 2, z: originZ + startV }
              : { x: originX + startU, y: (op.sillY + op.lintelY) / 2, z: originZ + startV + op.offset };

            if (op.state === 'intact') {
              const glassPane = makeSpanBox(`${op.id}_glass`, op.clear0, op.clear1, op.sillY, op.lintelY, {
                role: 'window_glass',
                openingId: op.id,
                windowId: op.id,
                material: 'glass',
                breakable: true,
                thicknessScale: 0.18,
              });
              if (glassPane) obstacles.push(glassPane);
            }

            windowDescriptors.push({
              id: op.id,
              buildingId: b.id,
              wallId: w.id,
              orientation: horiz ? 'H' : 'V',
              state: op.state,
              sillY: op.sillY,
              lintelY: op.lintelY,
              width: op.width,
              center: centerWorld,
              label: op.raw.label ?? op.id,
            });
          } else if (op.kind === 'door') {
            const centerWorld = horiz
              ? { x: originX + startU + op.offset, y: op.lintelY / 2, z: originZ + startV }
              : { x: originX + startU, y: op.lintelY / 2, z: originZ + startV + op.offset };

            if (op.state === 'closed') {
              const leaf = makeSpanBox(`${op.id}_leaf`, op.clear0, op.clear1, 0, op.lintelY, {
                role: 'door_leaf',
                openingId: op.id,
                doorId: op.id,
                material: op.material,
                thicknessScale: 0.45,
              });
              if (leaf) obstacles.push(leaf);
            }

            doorDescriptors.push({
              id: op.id,
              buildingId: b.id,
              wallId: w.id,
              orientation: horiz ? 'H' : 'V',
              state: op.state,
              width: op.width,
              height: op.lintelY,
              material: op.material,
              center: centerWorld,
              hinge: horiz
                ? { x: originX + startU + op.clear0, y: 0, z: originZ + startV }
                : { x: originX + startU, y: 0, z: originZ + startV + op.clear0 },
              label: op.raw.label ?? op.id,
            });
          }

          cursor = Math.max(cursor, op.cut1);
        }

        if (cursor < len - 1e-3) {
          const tail = makeSpanBox(`${w.id}_seg_${segIdx++}`, cursor, len, 0, wallH, {
            role: 'wall',
            material: wallMat,
          });
          if (tail) obstacles.push(tail);
        }
      }

      // Structural support posts (e.g. inside Barn B02)
      for (const post of b.posts ?? []) {
        const hs = (post.size ?? 0.36) / 2;
        const px = originX + post.u;
        const pz = originZ + post.v;
        obstacles.push(
          makeBox(
            post.id,
            [px - hs, 0, pz - hs],
            [px + hs, post.h ?? wallH, pz + hs],
            { buildingId: b.id, role: 'post', material: post.material ?? 'wood_thick' },
          ),
        );
      }

      // Interior furniture and tactical cover props
      for (const prop of b.props ?? []) {
        const x0 = originX + prop.u;
        const z0 = originZ + prop.v;
        obstacles.push(
          makeBox(
            prop.id,
            [x0, 0, z0],
            [x0 + prop.w, prop.h, z0 + prop.d],
            {
              buildingId: b.id,
              role: 'prop',
              name: prop.name,
              material: prop.material ?? 'wood_thin',
            },
          ),
        );
      }
    }

    // Exterior tactical covers (stone well, courtyard walls, fences, woodpile)
    for (const cov of this.layout.exteriorCovers ?? []) {
      obstacles.push(
        makeBox(cov.id, cov.min, cov.max, {
          role: 'cover',
          name: cov.name,
          material: cov.material ?? 'earth',
        }),
      );
    }

    // Ditch eastern parapet earth berm segments (leaves north entry ramp Z:-76..-66 and house exit ramp Z:-9..2 open)
    obstacles.push(
      makeBox(
        'ditch_east_lip_north',
        [-42.2, -1.1, -65.5],
        [-41.5, 0.22, -8.5],
        { role: 'terrain_bank', name: 'Talude leste da vala (secção principal)', material: 'earth', walkThrough: true },
      ),
      makeBox(
        'ditch_east_lip_south',
        [-42.2, -1.1, 2.5],
        [-41.5, 0.22, 40.0],
        { role: 'terrain_bank', name: 'Talude leste da vala (secção sul)', material: 'earth', walkThrough: true },
      ),
    );

    // Orchard trees: ONLY narrow trunk is in `obstacles` (ballistic + movement). Canopy is in `sightBlockers` ONLY!
    this.trees = (this.layout.orchardTrees ?? []).map((t) => {
      const groundY = this.terrainHeightAt(t.x, t.z);
      return { ...t, y: groundY };
    });

    for (const t of this.trees) {
      const r = t.trunkRadius ?? 0.2;
      obstacles.push(
        makeBox(
          `${t.id}_trunk`,
          [t.x - r, t.y, t.z - r],
          [t.x + r, t.y + (t.trunkHeight ?? 2.1), t.z + r],
          { role: 'tree_trunk', treeId: t.id, material: 'wood_thick' },
        ),
      );
      const cr = t.canopyRadius ?? 1.9;
      sightBlockers.push(
        makeBox(
          `${t.id}_canopy`,
          [t.x - cr, t.y + (t.canopyY0 ?? 1.85), t.z - cr],
          [t.x + cr, t.y + (t.canopyY1 ?? 4.1), t.z + cr],
          { role: 'tree_canopy', treeId: t.id, material: 'foliage', visualOnly: true },
        ),
      );
    }

    this.obstacles = obstacles;
    this.sightBlockers = sightBlockers;
    this.doors = doorDescriptors;
    this.windows = windowDescriptors;

    // Player solids exclude low `walkThrough` earth lips so the player steps smoothly over the ditch bank while bullets hit the bank
    this.playerSolids = obstacles
      .filter((b) => !b.walkThrough)
      .map((b) => aabbToSolid(b, b.role === 'prop' ? 'prop' : 'structure'));
    this.solidIndex = indexSolids(this.playerSolids);
    this.revision++;
  }

  nearestInteractableDoor(point, maxDistance = 2.2, lookDirection = null) {
    let best = null;
    for (const door of this.doors) {
      const dx = door.center.x - point.x;
      const dz = door.center.z - point.z;
      const dist = Math.hypot(dx, dz);
      if (dist > maxDistance) continue;
      if (lookDirection && dist > 0.35) {
        const dot = (dx * lookDirection.x + dz * lookDirection.z) / dist;
        if (dot < 0.25) continue;
      }
      if (!best || dist < best.distance) {
        best = { ...door, distance: dist };
      }
    }
    return best;
  }

  lineOfSight(a, b, { includeFoliage = true } = {}) {
    if (!visible(this, a, b)) return false;
    if (!includeFoliage || this.sightBlockers.length === 0) return true;
    const sightWorld = { obstacles: this.sightBlockers };
    const ax = a.x;
    const ay = (a.y ?? 0) + (a.eyeHeight ?? (a.crouched ? 1.08 : 1.65));
    const az = a.z;
    const bx = b.x;
    const by = (b.y ?? 0) + (b.eyeHeight ?? (b.crouched ? 1.08 : 1.65));
    const bz = b.z;
    const dist = Math.hypot(bx - ax, by - ay, bz - az);
    if (dist < 1e-6) return true;
    const dir = { x: (bx - ax) / dist, y: (by - ay) / dist, z: (bz - az) / dist };
    return !traceObstruction(sightWorld, { x: ax, y: ay, z: az }, dir, Math.max(0, dist - 0.02));
  }

  traceTerrain(origin, dir, range) {
    if (dir.y >= 0 && origin.y > 4) return null;
    const step = 0.2;
    for (let d = step; d <= range; d += step) {
      const px = origin.x + dir.x * d;
      const py = origin.y + dir.y * d;
      const pz = origin.z + dir.z * d;
      const ground = this.terrainHeightAt(px, pz);
      if (py < ground - 0.02) {
        return {
          id: 'terrain_ground',
          distance: d,
          kind: 'world',
          role: 'terrain',
          material: 'earth',
        };
      }
    }
    return null;
  }
}
