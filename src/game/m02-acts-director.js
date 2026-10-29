import cellsBCLayout from '../../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };
import { PLAYER_PHYSICS } from '../world/m01-player-physics.js';
import { EYE_HEIGHT } from '../config.js';
import { M01Navigator } from '../world/m01-navigation.js';
import { stepActorNavigation } from './m02-combat-ai.js';

export const M02_TR_CARTELAS = Object.freeze({
  TR01: 'Acessos de Łęczyca — noite de 9 para 10 de setembro',
  TR02: '10 de setembro de 1939 — manhã',
  TR03: 'Acessos de Leśmierz — 10 de setembro — tarde',
  TR04: '12–13 de setembro: a operação muda de direção. Em 13 de setembro, Łęczyca volta a ser ocupada pelos alemães.',
  TR05: 'Nos dias seguintes, a pressão alemã desfaz a ofensiva. Alguns sobreviventes alcançam Varsóvia. · Varsóvia — 25 de setembro de 1939',
});

export function createInitialAreaBState() {
  const bDef = cellsBCLayout.cells.B;
  return {
    active: false,
    reorganizedC07: false,
    corridorUnderDirectFire: true,
    supplyCart: {
      id: bDef.supplyCart.id,
      state: 'WAITING_CLEAR_CORRIDOR', // WAITING_CLEAR_CORRIDOR -> MOVING -> DELIVERED | IMMOBILIZED
      x: bDef.supplyCart.startX,
      z: bDef.supplyCart.startZ,
      goalX: bDef.supplyCart.goalX,
      goalZ: bDef.supplyCart.goalZ,
      speed: bDef.supplyCart.speed,
      waypointIdx: 0,
      wheelDamaged: false,
      volumes: [
        { id: 'vol_water', type: 'water', state: 'ON_CART', x: bDef.supplyCart.startX, z: bDef.supplyCart.startZ, carriedBy: null, delivered: false, lost: false },
        { id: 'vol_ammo', type: 'ammo', state: 'ON_CART', x: bDef.supplyCart.startX, z: bDef.supplyCart.startZ, carriedBy: null, delivered: false, lost: false },
      ],
    },
  };
}

export function createInitialAreaCState() {
  const cDef = cellsBCLayout.cells.C;
  return {
    active: false,
    gateLatchUnlocked: false,
    c10Started: false,
    c11Started: false,
    c12Completed: false,
    artilleryWarningAt: null,
    artilleryImpactAt: null,
    artilleryDetonated: false,
    corridorExteriorBlocked: false,
    fixedImpactSpec: structuredClone(cDef.artilleryFixedImpact),
    lisContactedInC11: false,
    lisSupportMode: null, // 'carried' | 'walking_supported' | 'unreached'
    lastGroup: cDef.lastGroupRoster.map((lg, idx) => ({
      ...lg,
      space: 'metres',
      x: lg.startX ?? lg.x ?? 30.0,
      y: 0,
      z: lg.startZ ?? lg.z ?? -24.0,
      radius: PLAYER_PHYSICS.radius,
      eyeHeight: EYE_HEIGHT,
      alive: true,
      wounded: Boolean(lg.initialWounded),
      evacuated: false,
      waypointIdx: 0,
      moving: false,
      facing: Math.PI / 2,
      speed: lg.initialWounded ? 3.8 : 4.8,
      startDelaySec: idx * 0.4,
    })),
    epilogueCartelas: [],
  };
}

function mapEnemyEntry(sim, e) {
  return {
    ...e,
    space: 'metres',
    y: sim.world.heightAt(e.x, e.z),
    radius: PLAYER_PHYSICS.radius,
    eyeHeight: EYE_HEIGHT,
    crouched: false,
    moving: false,
    alive: true,
    active: true,
    maxHealth: e.health ?? 100,
    suppressed: 0,
    state: 'HOLD_SECTOR',
    nonCombatant: false,
    chalkMarked: false,
    seeingTargetId: null,
    memory: null,
    goal: null,
    reloadingUntil: 0,
    nextFireAt: Number((sim.clock + 0.6).toFixed(3)),
    shotsFired: 0,
    hitsReceived: 0,
    lastHitPart: null,
    mag: e.weapon === 'mg34' ? 50 : e.weapon === 'mp38' ? 32 : 5,
    reserve: e.weapon === 'mg34' ? 200 : e.weapon === 'mp38' ? 96 : 35,
  };
}

export function enterAreaBC06(sim, { skipTransition = false } = {}) {
  if (!sim.transitionTABPayload) {
    sim.triggerTransitionTAB({ skip: skipTransition });
  }
  const worldB = sim.zoneStreamer.switchToCell('B');
  sim.activeCellId = 'B';
  sim.world = worldB;
  sim.navigator = new M01Navigator(sim.world.navWorld);
  sim.doorLocks.clear();

  const spawn = worldB.layout.playerSpawn;
  sim.player.x = spawn.x;
  sim.player.z = spawn.z;
  sim.player.y = sim.world.heightAt(spawn.x, spawn.z);
  sim.player.angle = spawn.angle;
  sim.player.pitch = spawn.pitch;
  sim.player.carryingVolumeId = null;

  const allySpawns = [
    [-4.0, 82.0],
    [4.0, 82.0],
    [-8.0, 84.0],
    [8.0, 84.0],
    [-2.0, 86.0],
    [2.0, 86.0],
    [0.0, 88.0],
  ];
  sim.allies.forEach((ally, idx) => {
    const [ax, az] = allySpawns[idx % allySpawns.length];
    ally.x = ax;
    ally.z = az;
    ally.y = sim.world.heightAt(ax, az);
    ally.goal = null;
    ally.navCorners = null;
    ally.reachedNodeId = null;
  });

  const eb1Raw = cellsBCLayout.cells.B.enemyRosterEB1;
  sim.enemies = eb1Raw.map((e) => mapEnemyEntry(sim, e));
  sim.totalHostilesSpawned += sim.enemies.length;

  sim.areaB = createInitialAreaBState();
  sim.areaB.active = true;
  sim.c01Active = false;
  sim.horizon.setTemporalState('T1', sim);
  sim.activeCartela = {
    text: M02_TR_CARTELAS.TR01,
    expiresAt: sim.clock + 8.0,
  };

  sim.dialogue.trigger('bz39_c06_01', sim);
  sim.dialogue.trigger('bz39_c06_02', sim);
  sim.dialogue.update(sim);

  sim.objective = {
    id: 'O04',
    title: 'O04 (Área B · Łęczyca): Abrir o corredor B05/B06 e entregar os 2 volumes da carroça (Água e Munição)',
    status: 'active',
  };
  if (!sim.transitionIdsApplied.includes('TR01')) {
    sim.transitionIdsApplied.push('TR01');
  }
  return sim.objective;
}

export function damageCartWheel(sim) {
  const cart = sim.areaB?.supplyCart;
  if (!cart || cart.state === 'DELIVERED' || cart.state === 'IMMOBILIZED') return false;
  cart.wheelDamaged = true;
  cart.state = 'IMMOBILIZED';
  for (const vol of cart.volumes) {
    if (vol.state === 'ON_CART') {
      vol.state = 'DROPPED_READY';
      vol.x = cart.x + (vol.id === 'vol_water' ? -0.8 : 0.8);
      vol.z = cart.z;
    }
  }
  sim.dialogue.trigger('bz39_c06_03', sim);
  sim.dialogue.trigger('bz39_c06_04', sim);
  sim.dialogue.update(sim);
  sim.combatLog.push({
    clock: Number(sim.clock.toFixed(2)),
    type: 'supply_cart_immobilized',
    x: cart.x,
    z: cart.z,
  });
  return true;
}

export function pickupSupplyVolume(sim, volumeId, carrierId = 'piotr_sokol') {
  const cart = sim.areaB?.supplyCart;
  if (!cart) return false;
  const vol = cart.volumes.find((v) => v.id === volumeId);
  if (!vol || vol.delivered || vol.lost) return false;
  if (vol.carriedBy && vol.carriedBy !== carrierId) return false;

  // Ensure carrier is not already carrying another volume (no duplication!)
  for (const other of cart.volumes) {
    if (other.id !== volumeId && other.carriedBy === carrierId) {
      return false;
    }
  }

  if (cart.state === 'WAITING_CLEAR_CORRIDOR' || cart.state === 'MOVING') {
    // Allow unloading directly from cart as well
    vol.state = 'CARRIED';
  } else {
    vol.state = 'CARRIED';
  }
  vol.carriedBy = carrierId;
  if (carrierId === 'piotr_sokol') {
    sim.player.carryingVolumeId = volumeId;
  } else {
    const ally = sim.allies.find((a) => a.id === carrierId);
    if (ally) ally.carryingVolumeId = volumeId;
  }
  return true;
}

export function deliverSupplyVolume(sim, volumeId) {
  const cart = sim.areaB?.supplyCart;
  if (!cart) return false;
  const vol = cart.volumes.find((v) => v.id === volumeId);
  if (!vol || vol.delivered || vol.lost) return false;

  const prevCarrier = vol.carriedBy;
  vol.state = 'DELIVERED';
  vol.delivered = true;
  vol.carriedBy = null;
  vol.x = cart.goalX;
  vol.z = cart.goalZ;

  if (prevCarrier === 'piotr_sokol') {
    sim.player.carryingVolumeId = null;
  } else if (prevCarrier) {
    const ally = sim.allies.find((a) => a.id === prevCarrier);
    if (ally) ally.carryingVolumeId = null;
  }

  syncSupplyFlags(sim);
  return true;
}

export function loseSupplyVolume(sim, volumeId) {
  const cart = sim.areaB?.supplyCart;
  if (!cart) return false;
  const vol = cart.volumes.find((v) => v.id === volumeId);
  if (!vol || vol.delivered || vol.lost) return false;

  const prevCarrier = vol.carriedBy;
  vol.state = 'LOST';
  vol.lost = true;
  vol.carriedBy = null;
  if (prevCarrier === 'piotr_sokol') {
    sim.player.carryingVolumeId = null;
  }
  syncSupplyFlags(sim);
  return true;
}

export function syncSupplyFlags(sim) {
  const cart = sim.areaB?.supplyCart;
  if (!cart) return;
  const waterVol = cart.volumes.find((v) => v.id === 'vol_water');
  const ammoVol = cart.volumes.find((v) => v.id === 'vol_ammo');

  sim.supplies.waterDelivered = Boolean(waterVol?.delivered);
  sim.supplies.ammoDelivered = Boolean(ammoVol?.delivered);
  const count = (sim.supplies.waterDelivered ? 1 : 0) + (sim.supplies.ammoDelivered ? 1 : 0);
  sim.flags['m02.supply_reached'] = count;

  const allResolved = cart.volumes.every((v) => v.delivered || v.lost);
  const activeHostiles = sim.enemies.filter((e) => e.alive && !e.nonCombatant).length;
  if (allResolved && activeHostiles === 0) {
    sim.flags['m02.corridor_held'] = true;
    if (sim.objective.id === 'O04') {
      sim.objective = {
        id: 'O05',
        title: `O05 (Reorganização em Łęczyca): Corredor aberto (${count}/2 volumes entregues) — consolidar para a manhã de 10/9`,
        status: 'active',
      };
    }
  }
}

export function updateAreaB(sim, dt) {
  if (sim.activeCellId !== 'B' || !sim.areaB?.active) return;

  const cart = sim.areaB.supplyCart;
  const directFireEnemies = sim.enemies.filter(
    (e) => e.alive && !e.nonCombatant && e.suppressed < 0.65 && (e.buildingId === 'B05' || e.buildingId === 'B06' || e.z < 25),
  );
  sim.areaB.corridorUnderDirectFire = directFireEnemies.length > 0;

  // Update positions of carried volumes
  for (const vol of cart.volumes) {
    if (vol.state === 'CARRIED') {
      if (vol.carriedBy === 'piotr_sokol') {
        vol.x = sim.player.x;
        vol.z = sim.player.z;
        if (Math.hypot(sim.player.x - cart.goalX, sim.player.z - cart.goalZ) <= 4.0) {
          deliverSupplyVolume(sim, vol.id);
        }
      } else {
        const carrier = sim.allies.find((a) => a.id === vol.carriedBy);
        if (carrier && carrier.alive) {
          vol.x = carrier.x;
          vol.z = carrier.z;
        }
      }
    }
  }

  if (cart.state !== 'IMMOBILIZED' && cart.state !== 'DELIVERED') {
    const playerDistToCart = Math.hypot(sim.player.x - cart.x, sim.player.z - cart.z);
    const playerBlockingPath = playerDistToCart < 1.35 && sim.player.z < cart.z;

    if (!sim.areaB.corridorUnderDirectFire && !playerBlockingPath) {
      cart.state = 'MOVING';
      const route = cellsBCLayout.cells.B.cartRoute;
      const wp = route[Math.min(cart.waypointIdx, route.length - 1)];
      const dx = wp[0] - cart.x;
      const dz = wp[1] - cart.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= 0.6) {
        if (cart.waypointIdx < route.length - 1) {
          cart.waypointIdx++;
        } else {
          cart.state = 'DELIVERED';
          for (const vol of cart.volumes) {
            if (vol.state === 'ON_CART') {
              deliverSupplyVolume(sim, vol.id);
            }
          }
        }
      } else {
        const step = Math.min(dist, cart.speed * dt);
        cart.x = Number((cart.x + (dx / dist) * step).toFixed(2));
        cart.z = Number((cart.z + (dz / dist) * step).toFixed(2));
        for (const vol of cart.volumes) {
          if (vol.state === 'ON_CART') {
            vol.x = cart.x;
            vol.z = cart.z;
          }
        }
      }
    } else {
      cart.state = 'WAITING_CLEAR_CORRIDOR';
    }
  }

  syncSupplyFlags(sim);
}

export function completeC07Reorganization(sim, { skip = false } = {}) {
  const firstReorganization=!sim.areaB.reorganizedC07;
  sim.areaB.reorganizedC07 = true;
  sim.flags['m02.corridor_held'] = true;
  sim.horizon.setTemporalState('T2', sim);
  sim.activeCartela = {
    text: M02_TR_CARTELAS.TR02,
    expiresAt: sim.clock + 8.0,
  };

  // Apply supply consequences without magical full heal (I1 / D6)
  if (firstReorganization && sim.supplies.ammoDelivered) {
    sim.weapon.reserve = Math.min(60, sim.weapon.reserve + 15);
  }
  if (firstReorganization && sim.supplies.waterDelivered) {
    sim.player.health = Math.max(sim.player.health,Math.min(85,sim.player.health+10));
  }

  // Evaluate squad status for Małek & Wierzba (severely wounded are evacuated and do not reappear fit)
  for (const ally of sim.allies) {
    if (!ally.alive || ally.state === 'DOWN') {
      ally.state = 'EVACUATED';
      if (ally.id === 'pl_malek') sim.flags['m02.malek_status'] = 'evacuated';
      if (ally.id === 'pl_wierzba') sim.flags['m02.wierzba_status'] = 'evacuated';
    } else if (ally.health < 55) {
      if (ally.id === 'pl_malek') sim.flags['m02.malek_status'] = 'wounded';
      if (ally.id === 'pl_wierzba') sim.flags['m02.wierzba_status'] = 'wounded';
    }
  }

  sim.dialogue.trigger('bz39_c07_01', sim);
  sim.dialogue.trigger('bz39_c07_02', sim);
  sim.dialogue.trigger('bz39_c07_03', sim);
  sim.dialogue.update(sim);

  if (!sim.transitionIdsApplied.includes('TR02')) {
    sim.transitionIdsApplied.push('TR02');
  }

  sim.objective = {
    id: 'O05',
    title: 'C07 Concluída (Manhã 10 Set): Secção reorganizada — pronta para partir para os Acessos de Leśmierz (Área C)',
    status: 'completed',
  };
  sim.saveCheckpoint('cp_m02_c_reorganizacao');
  return {
    transitionId: 'TR02',
    temporalState: 'T2',
    cartela: M02_TR_CARTELAS.TR02,
    supplyReached: sim.flags['m02.supply_reached'],
    supplies: structuredClone(sim.supplies),
    playerHealth: sim.player.health,
    weapon: { mag: sim.weapon.mag, reserve: sim.weapon.reserve },
    flags: structuredClone(sim.flags),
  };
}

export function enterAreaCC09(sim, { skipTransition = false } = {}) {
  if (!sim.areaB?.reorganizedC07) {
    completeC07Reorganization(sim, { skip: skipTransition });
  }

  // C08 (TR03): Detach Lis for liaison outside the cell during C09-C10 unless he is already incapacitated/evacuated
  const lis = sim.allies.find((a) => a.id === 'pl_lis');
  if (lis && lis.alive && lis.state !== 'DOWN' && lis.state !== 'EVACUATED') {
    lis.detachedOutOfCell = true;
    lis.state = 'LIAISON_OUTSIDE_CELL';
  }

  const worldC = sim.zoneStreamer.switchToCell('C');
  sim.activeCellId = 'C';
  sim.world = worldC;
  sim.navigator = new M01Navigator(sim.world.navWorld);
  sim.doorLocks.clear();

  const spawn = worldC.layout.playerSpawn;
  sim.player.x = spawn.x;
  sim.player.z = spawn.z;
  sim.player.y = sim.world.heightAt(spawn.x, spawn.z);
  sim.player.angle = spawn.angle;
  sim.player.pitch = spawn.pitch;

  const allySpawns = [
    [-4.0, -68.0],
    [4.0, -68.0],
    [-8.0, -70.0],
    [8.0, -70.0],
    [-2.0, -74.0],
    [2.0, -74.0],
  ];
  let idx = 0;
  for (const ally of sim.allies) {
    if (ally.detachedOutOfCell || ally.state === 'EVACUATED') continue;
    const [ax, az] = allySpawns[idx++ % allySpawns.length];
    ally.x = ax;
    ally.z = az;
    ally.y = sim.world.heightAt(ax, az);
    ally.goal = null;
    ally.navCorners = null;
  }

  const ec1Raw = cellsBCLayout.cells.C.enemyRosterEC1;
  sim.enemies = ec1Raw.map((e) => mapEnemyEntry(sim, e));
  sim.totalHostilesSpawned += sim.enemies.length;

  sim.areaC = createInitialAreaCState();
  sim.areaC.active = true;
  sim.c10Active = false;
  sim.c11Active = false;

  sim.horizon.setTemporalState('T3', sim);
  sim.activeCartela = {
    text: M02_TR_CARTELAS.TR03,
    expiresAt: sim.clock + 8.0,
  };

  sim.dialogue.trigger('bz39_c08_01', sim);
  sim.dialogue.trigger('bz39_c08_02', sim);
  sim.dialogue.trigger('bz39_c09_02', sim);
  sim.dialogue.update(sim);

  if (!sim.transitionIdsApplied.includes('TR03')) {
    sim.transitionIdsApplied.push('TR03');
  }

  sim.objective = {
    id: 'O06',
    title: 'O06 (Área C · Leśmierz): Neutralizar defensores de B09/B10/B11 e abrir a tranca da portaria B11',
    status: 'active',
  };
  return sim.objective;
}

export function unlockC09GateLatch(sim) {
  if (sim.activeCellId !== 'C' || !sim.areaC) return false;
  sim.areaC.gateLatchUnlocked = true;
  const activeEc1 = sim.enemies.filter((e) => e.encounterId === 'EC1' && e.alive && !e.nonCombatant);
  if (activeEc1.length === 0) {
    startC10OrderChanges(sim);
  }
  return true;
}

export function startC10OrderChanges(sim) {
  if (!sim.areaC || sim.areaC.c10Started) return false;
  sim.areaC.c10Started = true;
  sim.areaC.gateLatchUnlocked = true;
  sim.c10Active = true;

  // Append the 12 finite German reserves of EC2 (DE-C09..DE-C20) at their real exterior approach coordinates
  const existingIds = new Set(sim.enemies.map((e) => e.id));
  const ec2Raw = cellsBCLayout.cells.C.enemyRosterEC2.filter((e) => !existingIds.has(e.id));
  const ec2Mapped = ec2Raw.map((e) => mapEnemyEntry(sim, e));
  sim.enemies.push(...ec2Mapped);
  sim.totalHostilesSpawned += ec2Mapped.length;

  // Trigger protected literal line dlg_m02_002 ("O grupo da direita recuou. Nossa ordem mudou.") and bz39_c10_01
  sim.dialogue.trigger('dlg_m02_002', sim, { allowRepeat: true });
  sim.dialogue.trigger('bz39_c10_01', sim);
  sim.dialogue.trigger('bz39_c10_02', sim);
  sim.dialogue.update(sim);

  // Schedule fixed artillery impact warning (6.0s warning -> fixed street impact at (4, 0, 18))
  sim.areaC.artilleryWarningAt = Number(sim.clock.toFixed(2));
  sim.areaC.artilleryImpactAt = Number((sim.clock + sim.areaC.fixedImpactSpec.warningDurationSec).toFixed(2));

  sim.objective = {
    id: 'O07',
    title: 'O07 (C10 · A Ordem Muda): Segurar a passagem de B09–B12 enquanto o grupo da direita (12 homens) atravessa',
    status: 'active',
  };

  // Save the 4th canonical semantic checkpoint cp_m02_d_cobertura_retirada (I3)
  sim.saveCheckpoint('cp_m02_d_cobertura_retirada');
  return true;
}

export const SP03_DEBRIS_COVER_ID = 'sp03_street_debris_crater';

// SAVE-01 / G4: the SP03 crater exists in the Cell C world if and only if the snapshot says the impact happened.
// Restoring a checkpoint taken before the impact removes the debris; restoring one taken after re-creates it exactly once.
export function syncAreaCWorldDamage(sim) {
  if (sim.activeCellId !== 'C' || !sim.world?.layout?.exteriorCovers) return false;
  const covers = sim.world.layout.exteriorCovers;
  const idx = covers.findIndex((c) => c.id === SP03_DEBRIS_COVER_ID);
  const shouldExist = Boolean(sim.areaC?.artilleryDetonated);
  if (shouldExist && idx === -1) {
    const spec = sim.areaC.fixedImpactSpec;
    covers.push({
      id: SP03_DEBRIS_COVER_ID,
      name: 'Cratera e entulho de artilharia na rua exterior (SP03)',
      min: [spec.debrisBounds[0], 0, spec.debrisBounds[2]],
      max: [spec.debrisBounds[1], 1.85, spec.debrisBounds[3]],
      material: 'stone',
      destructibleFence: false,
    });
  } else if (!shouldExist && idx !== -1) {
    covers.splice(idx, 1);
  } else {
    return false;
  }
  sim.world.refresh();
  sim.navigator?.sync?.();
  return true;
}

export function detonateC10FixedArtillery(sim) {
  if (!sim.areaC || sim.areaC.artilleryDetonated) return null;
  sim.areaC.artilleryDetonated = true;
  sim.areaC.corridorExteriorBlocked = true;
  if (sim.horizon?.hsC2) {
    sim.horizon.hsC2.detonatedOnce = true;
    sim.horizon.hsC2.state = 'IMPACTED';
  }

  const spec = sim.areaC.fixedImpactSpec;
  // Add persistent debris obstacle blocking the exterior street at (4, 18), forcing evacuation through B09 nave!
  syncAreaCWorldDamage(sim);

  // Apply causal explosion damage at the fixed coordinates (never shifts to chase or spare player!)
  const blastReport = sim.detonateGrenadeAt(spec.x, 0.6, spec.z, spec.radius);
  sim.combatLog.push({
    clock: Number(sim.clock.toFixed(2)),
    type: 'sp03_fixed_artillery_impact',
    center: { x: spec.x, y: 0.6, z: spec.z },
    corridorExteriorBlocked: true,
    affectedActors: blastReport.affectedActors,
  });

  startC11LisAndLastGroup(sim);
  return blastReport;
}

export function startC11LisAndLastGroup(sim) {
  if (!sim.areaC || sim.areaC.c11Started) return false;
  sim.areaC.c11Started = true;
  sim.c11Active = true;

  const lis = sim.allies.find((a) => a.id === 'pl_lis');
  if (lis) {
    // J3: Lis returns from liaison already wounded by fragmentation outside the cell (unless already incapacitated earlier; never duplicates Lis!)
    const wasAlreadyIncapacitated = !lis.alive || lis.state === 'EVACUATED' || lis.state === 'DOWN';
    lis.detachedOutOfCell = false;
    if (!wasAlreadyIncapacitated) {
      lis.x = -28.0;
      lis.z = -22.0;
      lis.y = sim.world.heightAt(lis.x, lis.z);
      lis.health = Math.min(lis.health, 46);
      lis.state = 'WOUNDED_LIAISON';
      lis.burst=null;lis.reloadingUntil=0;
      lis.crouched = true;
      lis.goal = null;
    }
  }

  sim.dialogue.trigger('bz39_c11_01', sim);
  sim.dialogue.trigger('bz39_c11_02', sim);
  sim.dialogue.trigger('bz39_c11_04', sim);
  sim.dialogue.update(sim);

  sim.objective = {
    id: 'O08',
    title: 'O08 (C11 · Lis e o Último Grupo): Apoiar Lis e cobrir a travessia do grupo por B09 → Casa de Socorro B12',
    status: 'active',
  };
  return true;
}

export function assistLisInC11(sim, mode = 'wounded_evacuated') {
  if (!sim.areaC) return null;
  if (!sim.areaC.c10Started) startC10OrderChanges(sim);
  if (!sim.areaC.artilleryDetonated) detonateC10FixedArtillery(sim);
  if (!sim.areaC.c11Started) startC11LisAndLastGroup(sim);

  const lis = sim.allies.find((a) => a.id === 'pl_lis');
  if (mode === 'wounded_evacuated' || mode === 'wounded_walking') {
    // Trigger Piotr's protected literal line dlg_m02_003 ("Você vem conosco. A arma eu levo.") on contact
    if (!sim.areaC.lisContactedInC11) {
      sim.areaC.lisContactedInC11 = true;
      sim.dialogue.trigger('dlg_m02_003', sim, { allowRepeat: true });
      sim.dialogue.trigger('bz39_c11_03', sim);
      sim.dialogue.update(sim);
    }
    sim.areaC.lisSupportMode = mode;
    sim.flags['m02.lis_status'] = mode;
    if (lis && lis.alive) {
      lis.state = mode === 'wounded_evacuated' ? 'EVACUATED_B12' : 'WALKING_SUPPORTED';
      if(mode==='wounded_evacuated'){
        // Explicit semantic import/fixture outcome; normal contact uses the
        // physical supported walk below and resolves on reaching B12.
        lis.x=-58;lis.z=52;lis.y=sim.world.heightAt(lis.x,lis.z);lis.goal=null;
      }else{
        lis.goal={x:-58,z:52,crouch:false};lis.navCorners=null;
      }
    }
  } else if (mode === 'missing') {
    sim.areaC.lisSupportMode = 'missing';
    sim.flags['m02.lis_status'] = 'missing';
    if (lis) {
      lis.state = 'MISSING';
      lis.detachedOutOfCell = true;
    }
  }
  return sim.flags['m02.lis_status'];
}

export function updateAreaC(sim, dt) {
  if (sim.activeCellId !== 'C' || !sim.areaC?.active) return;

  // 1. Check if EC1 is cleared to advance C09 -> C10
  if (!sim.areaC.c10Started) {
    const activeEc1 = sim.enemies.filter((e) => e.encounterId === 'EC1' && e.alive && !e.nonCombatant);
    if (activeEc1.length === 0 && (sim.areaC.gateLatchUnlocked || sim.player.z > -18)) {
      startC10OrderChanges(sim);
    }
    return;
  }

  // 2. Check fixed artillery impact timer in C10
  if (sim.areaC.c10Started && !sim.areaC.artilleryDetonated && sim.areaC.artilleryImpactAt !== null) {
    if (sim.clock >= sim.areaC.artilleryImpactAt) {
      detonateC10FixedArtillery(sim);
    }
  }

  // Contact is an explicit player interaction; proximity alone cannot rescue
  // Lis through walls or initiate dialogue without the player's action.

  const supportedLis=sim.allies.find(a=>a.id==='pl_lis');
  if(sim.areaC.lisContactedInC11&&supportedLis?.alive&&sim.flags['m02.lis_status']==='wounded_walking'&&Math.hypot(supportedLis.x+58,supportedLis.z-52)<.65){
    supportedLis.state='EVACUATED_B12';supportedLis.goal=null;supportedLis.navCorners=null;
    supportedLis.moving=false;supportedLis.effectiveSpeed=0;
    sim.areaC.lisSupportMode='wounded_evacuated';sim.flags['m02.lis_status']='wounded_evacuated';
  }

  // 4. Advance the 12 Last Group members (LG01..LG12) along the B09 -> B12 evacuation route
  const evacRoute = cellsBCLayout.cells.C.evacRoute;
  let evacuatedCount = 0;
  let allResolved = true;
  for (const lg of sim.areaC.lastGroup) {
    if (!lg.alive) continue;
    if (lg.evacuated) {
      evacuatedCount++;
      continue;
    }
    allResolved = false;
    if(sim.clock-(sim.areaC.artilleryWarningAt??0)<(lg.startDelaySec??0)){lg.moving=false;continue;}
    const wp = evacRoute[Math.min(lg.waypointIdx, evacRoute.length - 1)];
    lg.encounterId='LAST_GROUP';lg.state=lg.wounded?'WOUNDED_WALKING':'EVACUATING';
    lg.goal={x:wp[0],z:wp[1],crouch:false};
    stepActorNavigation(sim,lg,dt);
    const remDist = Math.hypot(wp[0] - lg.x, wp[1] - lg.z);
    if (remDist <= 0.65) {
      if (lg.waypointIdx < evacRoute.length - 1) {
        lg.waypointIdx++;
      } else {
        lg.evacuated = true;
        lg.moving = false;
        evacuatedCount++;
      }
    }
    // The penultimate waypoint is beyond B12's south door. Count men who
    // have crossed the house while they continue to the final rally point;
    // they remain vulnerable until they actually leave the scene.
    if(!lg.evacuated&&lg.waypointIdx>=evacRoute.length-1)evacuatedCount++;
  }

  sim.flags['m02.last_group_survivors'] = evacuatedCount;
  if (allResolved && !sim.areaC.c12Completed) {
    sim.dialogue.trigger('bz39_c11_05', sim);
    sim.objective = {
      id: 'O09',
      title: `O09 (Romper Contacto em B12): ${evacuatedCount}/12 sobreviventes evacuados — recuar para concluir M02`,
      status: 'active',
    };
  }
}

export function completeC12Epilogue(sim, { lisOutcome = null } = {}) {
  if (!sim.areaC) {
    enterAreaCC09(sim, { skipTransition: true });
  }
  if (!sim.areaC.c10Started) startC10OrderChanges(sim);
  if (!sim.areaC.artilleryDetonated) detonateC10FixedArtillery(sim);
  if (!sim.areaC.c11Started) startC11LisAndLastGroup(sim);

  const alreadyResolvedContact=sim.areaC.lisContactedInC11&&lisOutcome===sim.flags['m02.lis_status']&&
    (lisOutcome==='wounded_evacuated'||lisOutcome==='wounded_walking');
  if (lisOutcome && !alreadyResolvedContact) {
    assistLisInC11(sim, lisOutcome);
  } else if (!lisOutcome && (!sim.flags['m02.lis_status'] || sim.flags['m02.lis_status'] === 'active')) {
    assistLisInC11(sim, 'wounded_evacuated');
  }

  // Finalize LG01..LG12 survivors count if any are still in transit at B12
  let survivors = 0;
  for (const lg of sim.areaC.lastGroup) {
    if (lg.alive) {
      lg.evacuated = true;
      survivors++;
    }
  }
  sim.flags['m02.last_group_survivors'] = survivors;
  sim.areaC.c12Completed = true;

  // Trigger C12 dialogue according to Lis outcome (NAR-02: if missing, Lis never speaks and Wierzba says "Lis…")
  if (sim.flags['m02.lis_status'] === 'missing') {
    sim.dialogue.trigger('bz39_c12_02', sim, { allowRepeat: true });
  } else {
    sim.dialogue.trigger('bz39_c12_01', sim, { allowRepeat: true });
  }
  sim.dialogue.trigger('bz39_c12_03', sim);
  sim.dialogue.update(sim);

  sim.areaC.epilogueCartelas = [M02_TR_CARTELAS.TR04, M02_TR_CARTELAS.TR05];
  sim.activeCartela = {
    text: M02_TR_CARTELAS.TR04,
    expiresAt: sim.clock + 10.0,
  };

  if (!sim.transitionIdsApplied.includes('TR04')) sim.transitionIdsApplied.push('TR04');
  if (!sim.transitionIdsApplied.includes('TR05')) sim.transitionIdsApplied.push('TR05');

  // Transactional completion of M02
  sim.flags['m02.completed'] = true;
  sim.objective = {
    id: 'O09',
    title: `M02 Concluída (C12 Epílogo · Varsóvia 25 Set 1939): Lis=${sim.flags['m02.lis_status']} · Grupo final=${survivors}/12`,
    status: 'completed',
  };

  return exportCampaignResultToM03(sim);
}

export function exportCampaignResultToM03(sim) {
  const lisStatus = sim.flags['m02.lis_status'];
  const validLisStatuses = ['wounded_evacuated', 'wounded_walking', 'missing'];
  const resolvedLisStatus = validLisStatuses.includes(lisStatus) ? lisStatus : 'wounded_evacuated';
  sim.flags['m02.lis_status'] = resolvedLisStatus;

  const lisPresentInWarsaw = resolvedLisStatus === 'wounded_evacuated' || resolvedLisStatus === 'wounded_walking';
  const m03WaterLineSpeaker = lisPresentInWarsaw ? 'pl_lis' : null;
  const m03CanonicalWaterLine = lisPresentInWarsaw
    ? 'Guarda um pouco de água. Todos precisam.'
    : null;

  const m03Export = {
    schema: 'cod-guerra-campaign-bridge-m02-to-m03-v1',
    missionId: 'M02',
    nextMissionId: 'M03',
    completed: Boolean(sim.flags['m02.completed']),
    historicalDates: {
      offensiveStart: '1939-09-09',
      reorganizationMorning: '1939-09-10',
      operationalShift: '1939-09-12/13',
      warsawArrival: '1939-09-25',
      generalRetreatOnMorningSept10: false, // HIST-TEST-01 mandatory historical invariant
    },
    flags: structuredClone(sim.flags),
    supplies: structuredClone(sim.supplies),
    transitionIdsApplied: [...sim.transitionIdsApplied],
    totalHostilesPlanned: 46,
    m03ImportState: {
      piotrCondition: 'weathered_veteran',
      promotedToCorporalAutomatically: false, // K5: no automatic promotion
      lisEntry: {
        status: resolvedLisStatus,
        presentInShelter: lisPresentInWarsaw,
        combatCapableNormalPatrol: false, // I6: never returns cured/uninjured by default
        requiresSupportWalking: resolvedLisStatus === 'wounded_walking',
        canSpeakCanonicalWaterLine: lisPresentInWarsaw,
        canonicalWaterLineSpeaker: m03WaterLineSpeaker,
        canonicalWaterLineText: m03CanonicalWaterLine,
      },
      waterReserveBonus: sim.supplies.waterDelivered ? 'small_water_reserve_available' : 'water_scarce',
      lastGroupSurvivorsCount: sim.flags['m02.last_group_survivors'] ?? 0,
    },
  };

  sim.m03ExportPackage = m03Export;
  return m03Export;
}
