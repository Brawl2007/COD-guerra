import cellALayout from '../../missions/m02-bzura/m02-01-quinta-layout.json' with { type: 'json' };
import cellsBCLayout from '../../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };
import { M02QuintaWorld } from './m02-quinta-world.js';

export const MAX_RESIDENT_CELLS = 2; // STREAM-01 / PERF-02: at most 2 cells active/resident in memory

function convertBuildingToWorldSchema(b) {
  const [minX, maxX, minZ, maxZ] = b.bounds;
  const w = maxX - minX;
  const d = maxZ - minZ;

  // If building is opaque/non-navigable (e.g. B08 closed house), create 4 solid exterior walls without openings
  const walls = [
    { id: `${b.id}_north`, u0: 0, v0: 0, u1: w, v1: 0, exterior: true, material: b.wallMaterial ?? 'brick' },
    { id: `${b.id}_south`, u0: 0, v0: d, u1: w, v1: d, exterior: true, material: b.wallMaterial ?? 'brick' },
    { id: `${b.id}_west`, u0: 0, v0: 0, u1: 0, v1: d, exterior: true, material: b.wallMaterial ?? 'brick' },
    { id: `${b.id}_east`, u0: w, v0: 0, u1: w, v1: d, exterior: true, material: b.wallMaterial ?? 'brick' },
  ];

  const doors = [];
  const windows = [];

  for (const door of b.doors ?? []) {
    const isH = door.orientation === 'H';
    let wallId = `${b.id}_north`;
    let offset = 0;
    if (isH) {
      wallId = Math.abs(door.z - minZ) <= Math.abs(door.z - maxZ) ? `${b.id}_north` : `${b.id}_south`;
      offset = door.x - minX;
    } else {
      wallId = Math.abs(door.x - minX) <= Math.abs(door.x - maxX) ? `${b.id}_west` : `${b.id}_east`;
      offset = door.z - minZ;
    }
    doors.push({
      id: door.id,
      wallId,
      offset,
      width: door.width,
      height: door.height ?? 2.1,
      initialState: door.initialState ?? 'open',
      material: door.material ?? 'wood_thin',
      label: door.label ?? door.id,
    });
  }

  for (const win of b.windows ?? []) {
    const isH = win.orientation === 'H';
    let wallId = `${b.id}_north`;
    let offset = 0;
    if (isH) {
      wallId = Math.abs(win.z - minZ) <= Math.abs(win.z - maxZ) ? `${b.id}_north` : `${b.id}_south`;
      offset = win.x - minX;
    } else {
      wallId = Math.abs(win.x - minX) <= Math.abs(win.x - maxX) ? `${b.id}_west` : `${b.id}_east`;
      offset = win.z - minZ;
    }
    windows.push({
      id: win.id,
      wallId,
      offset,
      width: win.width,
      sillY: win.sillY ?? 0.95,
      lintelY: win.lintelY ?? 2.05,
      glassState: win.initialState ?? 'intact',
      label: win.label ?? win.id,
    });
  }

  for (const iw of b.internalWalls ?? []) {
    const isH = Math.abs(iw.z2 - iw.z1) < 1e-4;
    const u0 = iw.x1 - minX;
    const v0 = iw.z1 - minZ;
    const u1 = iw.x2 - minX;
    const v1 = iw.z2 - minZ;
    walls.push({
      id: iw.id,
      u0,
      v0,
      u1,
      v1,
      exterior: false,
      material: iw.material ?? 'brick',
    });
    if (iw.doorGap) {
      const offset = isH ? iw.doorGap.center - iw.x1 : iw.doorGap.center - iw.z1;
      doors.push({
        id: `door_${iw.id}`,
        wallId: iw.id,
        offset,
        width: iw.doorGap.width ?? 1.2,
        height: 2.1,
        initialState: 'open',
        material: 'wood_thin',
        label: `Passagem interna ${b.id}`,
      });
    }
  }

  const props = (b.props ?? []).map((p) => {
    const [pMinX, pMaxX, pMinZ, pMaxZ] = p.bounds;
    return {
      id: p.id,
      name: p.label ?? p.id,
      u: pMinX - minX,
      v: pMinZ - minZ,
      w: pMaxX - pMinX,
      d: pMaxZ - pMinZ,
      h: p.height ?? 1.0,
      material: p.material ?? 'wood_thick',
    };
  });

  // If solidOpaque is true (B08), add an internal solid block so no entity or ray can ever enter an empty room
  if (b.solidOpaque) {
    props.push({
      id: `${b.id}_opaque_core`,
      name: `${b.name} (interior vedado)`,
      u: 0.25,
      v: 0.25,
      w: Math.max(0.5, w - 0.5),
      d: Math.max(0.5, d - 0.5),
      h: b.wallHeight ?? 2.8,
      material: 'brick',
    });
  }

  return {
    id: b.id,
    name: b.name,
    bounds: b.bounds,
    wallHeight: b.wallHeight ?? 3.0,
    ridgeHeight: b.ridgeHeight ?? 5.2,
    wallThickness: 0.26,
    material: b.wallMaterial ?? 'brick',
    roofMaterial: b.roofMaterial ?? 'tile',
    rooms: (b.rooms ?? []).map((r) => ({
      id: r.id,
      name: r.label,
      u0: r.bounds[0] - minX,
      v0: r.bounds[2] - minZ,
      u1: r.bounds[1] - minX,
      v1: r.bounds[3] - minZ,
    })),
    walls,
    doors,
    windows,
    props,
    posts: [],
  };
}

export function buildCellWorldLayout(cellId) {
  if (cellId === 'A') {
    return structuredClone(cellALayout);
  }
  const rawCell = cellsBCLayout.cells[cellId];
  if (!rawCell) {
    throw new Error(`Célula M02 desconhecida: ${cellId}`);
  }

  const buildings = rawCell.buildings.map(convertBuildingToWorldSchema);
  const exteriorCovers = (rawCell.covers ?? []).map((c) => ({
    id: c.id,
    name: c.id,
    min: [c.bounds[0], 0, c.bounds[2]],
    max: [c.bounds[1], c.height ?? 1.2, c.bounds[3]],
    material: c.material ?? 'stone',
    destructibleFence: Boolean(c.destructibleFence),
  }));

  return {
    missionId: `m02_cell_${cellId.toLowerCase()}`,
    cellId,
    title: rawCell.title,
    bounds: {
      ...rawCell.bounds,
      playable: { ...rawCell.bounds },
    },
    playerSpawn: structuredClone(rawCell.playerSpawn),
    panoramaPoint: structuredClone(rawCell.panoramaPoint),
    zones: {
      courtyard: { minX: -25, maxX: 25, minZ: -35, maxZ: 35 },
      ditch: { minX: -999, maxX: -998, minZ: -999, maxZ: -998, floorY: 0, bankWidth: 1 },
    },
    routes: {
      ditch: rawCell.cartRoute ?? rawCell.evacRoute ?? [[0, 0], [0, -20]],
      orchard: rawCell.evacRoute ?? rawCell.cartRoute ?? [[0, 0], [0, -20]],
      cart: rawCell.cartRoute ?? [],
      evac: rawCell.evacRoute ?? [],
    },
    buildings,
    exteriorCovers,
    orchardTrees: [],
    mgEmplacement: {
      id: `mg_cell_${cellId.toLowerCase()}`,
      x: cellId === 'B' ? 21.2 : 17.5,
      y: 0,
      z: cellId === 'B' ? -31.0 : -24.0,
      muzzleY: 1.35,
    },
    rawCell: structuredClone(rawCell),
  };
}

export class M02ZoneStreamer {
  constructor(initialCellId = 'A', initialWorld = null) {
    this.activeCellId = initialCellId;
    this.residentCells = new Map();
    this.stepCounter = 0;
    this.preloadCount = 0;
    this.switchCount = 0;
    this.disposedCount = 0;

    const worldA = initialWorld ?? new M02QuintaWorld(buildCellWorldLayout(initialCellId));
    this.residentCells.set(initialCellId, {
      cellId: initialCellId,
      world: worldA,
      loadedAtStep: ++this.stepCounter,
    });
  }

  #evictIfNeeded(protectedCellId) {
    while (this.residentCells.size > MAX_RESIDENT_CELLS) {
      let oldestKey = null;
      let oldestStep = Infinity;
      for (const [key, entry] of this.residentCells.entries()) {
        if (key === this.activeCellId || key === protectedCellId) continue;
        if (entry.loadedAtStep < oldestStep) {
          oldestStep = entry.loadedAtStep;
          oldestKey = key;
        }
      }
      if (!oldestKey) {
        // Fallback: evict any cell that is not protectedCellId
        for (const key of this.residentCells.keys()) {
          if (key !== protectedCellId) {
            oldestKey = key;
            break;
          }
        }
      }
      if (oldestKey) {
        this.residentCells.delete(oldestKey);
        this.disposedCount++;
      } else {
        break;
      }
    }
  }

  preloadCell(cellId) {
    if (this.residentCells.has(cellId)) {
      const entry = this.residentCells.get(cellId);
      entry.loadedAtStep = ++this.stepCounter;
      return entry.world;
    }
    const world = new M02QuintaWorld(buildCellWorldLayout(cellId));
    this.residentCells.set(cellId, {
      cellId,
      world,
      loadedAtStep: ++this.stepCounter,
    });
    this.preloadCount++;
    this.#evictIfNeeded(cellId);
    return world;
  }

  switchToCell(cellId) {
    const world = this.preloadCell(cellId);
    this.activeCellId = cellId;
    this.switchCount++;
    // Explicitly unload cells other than activeCellId so at most <= 2 cells ever coexist during transition and 1 after transition
    for (const key of [...this.residentCells.keys()]) {
      if (key !== cellId) {
        this.residentCells.delete(key);
        this.disposedCount++;
      }
    }
    return world;
  }

  getActiveWorld() {
    return this.residentCells.get(this.activeCellId)?.world ?? null;
  }

  getStreamingMetrics() {
    return {
      activeCellId: this.activeCellId,
      residentCellIds: [...this.residentCells.keys()],
      residentCount: this.residentCells.size,
      residentCellsCount: this.residentCells.size,
      maxResidentCells: MAX_RESIDENT_CELLS,
      preloadCount: this.preloadCount,
      switchCount: this.switchCount,
      disposedCount: this.disposedCount,
      disposedCellsCount: this.disposedCount,
    };
  }
}
