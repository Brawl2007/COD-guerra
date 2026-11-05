import cellsBCLayout from '../../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };
import { PLAYER_PHYSICS } from '../world/m01-player-physics.js';
import { EYE_HEIGHT } from '../config.js';
import { M01Navigator } from '../world/m01-navigation.js';
import { stepActorNavigation, WEAPON_PROFILES } from './m02-combat-ai.js';

export const M02_TR_CARTELAS = Object.freeze({
  TR01: 'Acessos de Łęczyca — noite de 9 para 10 de setembro',
  TR02: '10 de setembro de 1939 — manhã',
  TR03: 'Acessos de Leśmierz — 10 de setembro — tarde',
  TR04: '12–13 de setembro: a operação muda de direção. Em 13 de setembro, Łęczyca volta a ser ocupada pelos alemães.',
  TR05: 'Nos dias seguintes, a pressão alemã desfaz a ofensiva. Alguns sobreviventes alcançam Varsóvia. · Varsóvia — 25 de setembro de 1939',
});

/**
 * C02 (PDF p. 12): «O primeiro tiro combatível deve ocorrer em 30-60 s depois de iniciar o movimento». Até lá o posto EA0
 * não conhece o jogador (perceção inicial «sem alerta»; antes via Piotr no tick 0, a ~67 m, e o contacto era < 15 s).
 * O instante do contacto é sorteado UMA vez, no primeiro avanço do jogador, com o RNG da simulação (determinista, guardado
 * no snapshot); um tiro ou granada do jogador abre o contacto já (a iniciativa é dele).
 */
export const C01_CONTACT_DELAY_SEC = Object.freeze({ min: 30, max: 60 });
/**
 * C02: quem corre para o posto não espera pelo temporizador. O posto «sem alerta» dá pelo jogador quando ele chega a esta distância (m)
 * de um dos seus homens (vivo e combatente) e o contacto abre nesse tick. Escolha documentada (o PDF não a fixa): D1 põe o combate
 * principal entre 15 e 120 m e C02 o posto a ~67 m da partida; 25 m fica acima dos 15 m mínimos e abaixo da distância (≥ 30 m ao homem
 * mais próximo) a que ficam as coberturas intermédias de C01 (cv_c01_mid_w/e), onde quem avança com prudência espera os 30-60 s do
 * contacto. Só conta a distância: a visão por campo/exposição aplica-se depois de o contacto estar aberto (updateGermanGarrison).
 */
export const C01_PROXIMITY_DETECTION_M = 25;
export const C01_CONTACT_OPENED_BY = Object.freeze(['timer', 'player_shot', 'player_grenade', 'proximity']);
/** Distância (m) a P1 a partir da qual o jogador «começou a avançar». */
const C01_ADVANCE_THRESHOLD_M = 0.1;

export function createInitialC01Contact() {
  return { movementStartedAt: null, contactAt: null, opened: false, openedAt: null, openedBy: null };
}

/** Abre o contacto de C02 (o posto EA0 passa a perceber e a combater). Idempotente; só conta com C01 ativa. */
export function openC01Contact(sim, by) {
  const c = sim.c01Contact;
  if (!sim.c01Active || !c || c.opened) return false;
  c.opened = true;
  c.openedAt = Number(sim.clock.toFixed(3));
  c.openedBy = by;
  sim.combatLog.push({ clock: Number(sim.clock.toFixed(2)), type: 'c01_contact_opened', by });
  return true;
}

/** Regista o início do avanço (sorteia o atraso) e abre o contacto quando o atraso acaba. Chamado uma vez por tick. */
export function updateC01Contact(sim) {
  const c = sim.c01Contact;
  if (!sim.c01Active || !c || c.opened) return;
  if (c.movementStartedAt === null) {
    const p1 = sim.world.layout.c01Corridor?.startP1 ?? { x: 0, z: -175 };
    if (Math.hypot(sim.player.x - p1.x, sim.player.z - p1.z) < C01_ADVANCE_THRESHOLD_M) return;
    c.movementStartedAt = Number(sim.clock.toFixed(3));
    const delay = C01_CONTACT_DELAY_SEC.min + sim.rng.next() * (C01_CONTACT_DELAY_SEC.max - C01_CONTACT_DELAY_SEC.min);
    c.contactAt = Number((c.movementStartedAt + delay).toFixed(3));
  }
  if (sim.clock >= c.contactAt) {
    openC01Contact(sim, 'timer');
    return;
  }
  // O posto não está cego a quem chega ao pé dele: dentro do raio de deteção o contacto abre já (sem sorteio: o atraso do
  // temporizador foi sorteado uma só vez, ao primeiro avanço).
  const px = sim.player.x;
  const pz = sim.player.z;
  const near = sim.enemies.some(
    (e) =>
      e.encounterId === 'EA0' &&
      e.alive &&
      !e.nonCombatant &&
      Math.hypot(e.x - px, e.z - pz) <= C01_PROXIMITY_DETECTION_M,
  );
  if (near) openC01Contact(sim, 'proximity');
}

/**
 * SP02 (PDF C06 p. 13, J2 p. 36, F8 p. 26): «Um tiro que quebra o varal bloqueia a carroça em vez de a fazer explodir».
 * Causas explícitas da imobilização (`cart.immobilizedCause`): o tiro que parte o varal (`shaft_broken`), a roda danificada
 * (`wheel_damaged`, ação da bancada) e a alternativa «parada» (`parked_fallback`: F8/J2, «carroça já parada e carga manual»;
 * não é carroça móvel): usada quando o evento do tiro falha. A carroça só pode ser atingida na última perna, perto do cruzamento.
 */
export const CART_IMMOBILIZED_CAUSES = Object.freeze(['shaft_broken', 'wheel_damaged', 'parked_fallback']);
export const CART_PARKED_REASONS = Object.freeze(['shot_event_failed']);
/** A carroça só é exposta ao tiro na perna final (z ≤ 20 m, o cruzamento fica em z≈0). */
export const CART_CROSSING_Z = 20;
/** Quanto tempo (s) a carroça pode estar exposta, com hostis capazes vivos, sem que algum tenha linha de tiro, antes de parar. */
export const CART_SHOT_WINDOW_SEC = 2.0;
/** Um hostil com supressão ≥ 0,88 não consegue disparar (updateGermanGarrison). */
const CART_SHOOTER_MAX_SUPPRESSION = 0.88;

/** Fases do percurso de Lis (J3): fora da célula → regresso a pé → à espera → amparado/carregado → abrigado; ou incapacitado antes. */
export const LIS_PHASES = Object.freeze(['liaison_outside', 'returning', 'waiting', 'supported', 'sheltered', 'incapacitated']);
export const LIS_OUTCOME_SOURCES = Object.freeze(['game', 'forced']);
/** Distância (m) de contacto com Lis em C11 (dlg_m02_003 «no contacto»). */
export const LIS_CONTACT_RANGE_M = 3.5;
/** Raio de chegada ao ponto de evacuação (-85,105) para o jogador e o último grupo (m). */
export const EVAC_ARRIVE_RADIUS_M = 1.5;

function lisActor(sim) {
  return sim.allies.find((a) => a.id === 'pl_lis') ?? null;
}

/** Centros das macas de B12 (F13, p. 27: duas macas), tirados dos props do layout: fonte única para layout, mundo e simulação. */
export function b12StretcherSlots() {
  const b12 = cellsBCLayout.cells.C.buildings.find((b) => b.id === 'B12');
  return (b12.stretcherSlots ?? []).map((id) => {
    const prop = b12.props.find((p) => p.id === id);
    const [x0, x1, z0, z1] = prop.bounds;
    return { id, x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
  });
}

/** Percurso de Lis amparado/carregado: a rota de evacuação a partir da porta norte de B09 (-30,-20); carregado acaba na maca 1. */
function lisSupportPath(mode) {
  const route = cellsBCLayout.cells.C.evacRoute;
  const north = cellsBCLayout.cells.C.buildings.find((b) => b.id === 'B09').doors.find((d) => d.id === 'door_b09_north_gate');
  const start = route.findIndex(([x, z]) => x === north.x && z === north.z);
  if (mode === 'wounded_evacuated') {
    const slot = b12StretcherSlots()[0];
    const b12north = route.findIndex(([x, z], i) => i > start && x === -58 && z >= 46);
    return [...route.slice(start, b12north + 1), [-58, 50], [slot.x, slot.z]];
  }
  return route.slice(start);
}

export function createInitialAreaBState() {
  const bDef = cellsBCLayout.cells.B;
  return {
    active: false,
    reorganizedC07: false,
    c08Briefed: false,
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
      shaftBroken: false,
      immobilizedCause: null,
      parkedReason: null,
      shotById: null,
      crossingEntryAt: null,
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
    lisSupportMode: null, // 'wounded_evacuated' (carregado até B12) | 'wounded_walking' (amparado a pé) | 'missing'
    // J3/Q2: fase do percurso persistente de Lis em C09-C11 (sem teleporte); ver LIS_PHASES.
    lisPhase: null,
    lisWasIncapacitated: false,
    lisRouteIdx: 0,
    lisOutcomeSource: null, // 'game' (condições de jogo) | 'forced' (atalho/API da bancada)
    c11StartedAt: null,
    lastGroupSummary: null, // { evacuated, inTransit, dead } escrito em C12
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
      arrivedAt: null,
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
    nextFireAt: 0.6,
    shotsFired: 0,
    hitsReceived: 0,
    lastHitPart: null,
    // EQP-01 pendente: só MG34 e Kar98k (propostas, B6); nenhuma pistola-metralhadora alemã consta de B6.
    mag: e.weapon === 'mg34' ? 50 : 5,
    reserve: e.weapon === 'mg34' ? 200 : 35,
  };
}

export function enterAreaBC06(sim, { skipTransition = false } = {}) {
  if (!sim.transitionTABPayload) {
    sim.triggerTransitionTAB({ skip: skipTransition });
  }
  const worldB = sim.zoneStreamer.switchToCell('B');
  sim.activeCellId = 'B';
  sim.hazardBlasts = []; // D5: uma explosão agendada pertence ao mundo da célula em que foi avisada
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

/** Imobiliza a carroça no sítio e larga os volumes ainda a bordo ao lado dela (transporte a pé); `cause` é explícita. */
function immobilizeCart(sim, cause, extra = {}) {
  const cart = sim.areaB?.supplyCart;
  if (!cart || cart.state === 'DELIVERED' || cart.state === 'IMMOBILIZED') return false;
  cart.state = 'IMMOBILIZED';
  cart.immobilizedCause = cause;
  for (const vol of cart.volumes) {
    if (vol.state === 'ON_CART') {
      vol.state = 'DROPPED_READY';
      vol.x = cart.x + (vol.id === 'vol_water' ? -0.8 : 0.8);
      vol.z = cart.z;
    }
  }
  sim.combatLog.push({
    clock: Number(sim.clock.toFixed(2)),
    type: 'supply_cart_immobilized',
    cause,
    x: cart.x,
    z: cart.z,
    ...extra,
  });
  return true;
}

export function damageCartWheel(sim) {
  const cart = sim.areaB?.supplyCart;
  if (!cart || cart.state === 'DELIVERED' || cart.state === 'IMMOBILIZED') return false;
  cart.wheelDamaged = true;
  immobilizeCart(sim, 'wheel_damaged');
  sim.dialogue.trigger('bz39_c06_03', sim);
  sim.dialogue.trigger('bz39_c06_04', sim);
  sim.dialogue.update(sim);
  return true;
}

/** O tiro (de um hostil real) parte o varal: estado `shaft_broken`, carroça imobilizada, sem explosão (C06/J2). */
export function breakCartShaft(sim, { shooterId = null } = {}) {
  const cart = sim.areaB?.supplyCart;
  if (!cart || cart.state === 'DELIVERED' || cart.state === 'IMMOBILIZED') return false;
  cart.shaftBroken = true;
  cart.shotById = shooterId;
  if (!immobilizeCart(sim, 'shaft_broken', { shooterId })) return false;
  const shooter = shooterId ? sim.enemies.find((e) => e.id === shooterId) : null;
  if (shooter && shooter.mag > 0) {
    shooter.mag -= 1; // o tiro gasta uma bala do carregador do atirador
    shooter.shotsFired = (shooter.shotsFired ?? 0) + 1;
  }
  sim.events.push({ type: 'cart-shaft-broken', shooterId, x: cart.x, z: cart.z, clock: sim.clock });
  sim.dialogue.trigger('bz39_c06_04', sim);
  sim.dialogue.update(sim);
  return true;
}

/** Alternativa explícita «parada» (F8/J2): a carroça fica onde está, volumes soltos para transporte manual. */
export function parkCartFallback(sim, reason = 'shot_event_failed') {
  const cart = sim.areaB?.supplyCart;
  if (!cart || cart.state === 'DELIVERED' || cart.state === 'IMMOBILIZED') return false;
  cart.parkedReason = reason;
  if (!immobilizeCart(sim, 'parked_fallback', { reason })) return false;
  sim.dialogue.trigger('bz39_c06_04', sim);
  sim.dialogue.update(sim);
  return true;
}

/**
 * Evento do tiro na perna final: com hostis capazes vivos (supressão < 0,88), o mais próximo com alcance e linha de tiro à
 * carroça parte-lhe o varal. Se nenhum a consegue atingir durante CART_SHOT_WINDOW_SEC, o evento falha e fica a alternativa
 * «parada». Sem hostis capazes a carroça passa. Determinista (sem RNG). Devolve a causa aplicada ou null.
 */
export function resolveCartCrossingEvent(sim, cart) {
  if (cart.waypointIdx < cellsBCLayout.cells.B.cartRoute.length - 1 || cart.z > CART_CROSSING_Z) return null;
  const capable = sim.enemies.filter(
    (e) => e.alive && !e.nonCombatant && (e.suppressed ?? 0) < CART_SHOOTER_MAX_SUPPRESSION,
  );
  if (capable.length === 0) return null;
  if (cart.crossingEntryAt === null) cart.crossingEntryAt = Number(sim.clock.toFixed(2));
  const target = { x: cart.x, y: sim.world.heightAt(cart.x, cart.z), z: cart.z, eyeHeight: 1.0, crouched: false };
  let shooter = null;
  let best = Infinity;
  for (const e of capable) {
    const d = Math.hypot(e.x - cart.x, e.z - cart.z);
    if (d > (WEAPON_PROFILES[e.weapon]?.range ?? 100) || d >= best) continue;
    if (!sim.world.lineOfSight(e, target, { includeFoliage: true })) continue;
    shooter = e;
    best = d;
  }
  if (shooter) return breakCartShaft(sim, { shooterId: shooter.id }) ? 'shaft_broken' : null;
  if (sim.clock - cart.crossingEntryAt >= CART_SHOT_WINDOW_SEC) return parkCartFallback(sim, 'shot_event_failed') ? 'parked_fallback' : null;
  return null;
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

/**
 * A carrier who is no longer alive drops the volume where he fell (DROPPED_READY, can be picked up again). Closes the
 * carriedBy relation so no snapshot points a volume at a dead actor (PDF I5; FIX-2b). Deterministic; returns the count.
 */
export function dropVolumesOfFallenCarriers(sim) {
  const volumes = sim.areaB?.supplyCart?.volumes;
  if (!volumes) return 0;
  let dropped = 0;
  for (const vol of volumes) {
    if (!vol.carriedBy) continue;
    const carrier = vol.carriedBy === sim.player.id ? sim.player : sim.allies.find((a) => a.id === vol.carriedBy);
    if (carrier && carrier.alive !== false) continue;
    const carrierId = vol.carriedBy;
    vol.state = 'DROPPED_READY';
    vol.carriedBy = null;
    if (carrier) {
      vol.x = carrier.x;
      vol.z = carrier.z;
      if (carrier.carryingVolumeId === vol.id) carrier.carryingVolumeId = null;
    }
    sim.combatLog.push({ clock: Number(sim.clock.toFixed(2)), type: 'supply_volume_dropped', volumeId: vol.id, carrierId });
    dropped++;
  }
  return dropped;
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
      if (resolveCartCrossingEvent(sim, cart)) {
        syncSupplyFlags(sim);
        return;
      }
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

function c07Summary(sim) {
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

export function completeC07Reorganization(sim, { skip = false } = {}) {
  // Idempotente: com o roteiro automático (C06 → C07 ao resolver a passagem) e as teclas de bancada a coincidir, as
  // consequências dos volumes (munição +15, água +10) aplicam-se uma só vez.
  if (sim.areaB.reorganizedC07) return c07Summary(sim);
  sim.areaB.reorganizedC07 = true;
  sim.flags['m02.corridor_held'] = true;
  sim.horizon.setTemporalState('T2', sim);
  sim.activeCartela = {
    text: M02_TR_CARTELAS.TR02,
    expiresAt: sim.clock + 8.0,
  };

  // Apply supply consequences without magical full heal (I1 / D6)
  if (sim.supplies.ammoDelivered) {
    sim.weapon.reserve = Math.min(60, sim.weapon.reserve + 15);
  }
  if (sim.supplies.waterDelivered) {
    sim.player.health = Math.min(85, Math.max(sim.player.health, sim.player.health + 10));
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
  // Dentro de tick()/ação atómica fica pendente e grava-se no fim; fora, grava-se já (nunca a meio de um tick).
  sim.requestAutoCheckpoint('cp_m02_c_reorganizacao');
  return c07Summary(sim);
}

/**
 * C08 (PDF p. 14): ordem entregue, coluna reorganizada; Lis é destacado para ligação fora da célula até C11, salvo se já estava
 * incapacitado/evacuado (então mantém o estado e outro mensageiro faz a ligação). Cartela TR03. Ainda na célula B: a mudança
 * de célula é C09 (enterAreaCC09). Idempotente.
 */
export function beginC08Briefing(sim, { skipTransition = false } = {}) {
  if (!sim.areaB?.reorganizedC07) {
    completeC07Reorganization(sim, { skip: skipTransition });
  }
  if (sim.areaB.c08Briefed) return false;
  sim.areaB.c08Briefed = true;
  const lis = sim.allies.find((a) => a.id === 'pl_lis');
  if (lis && lis.alive && lis.state !== 'DOWN' && lis.state !== 'EVACUATED') {
    lis.detachedOutOfCell = true;
    lis.state = 'LIAISON_OUTSIDE_CELL';
  }
  sim.activeCartela = {
    text: M02_TR_CARTELAS.TR03,
    expiresAt: sim.clock + 8.0,
  };
  sim.dialogue.trigger('bz39_c08_01', sim);
  sim.dialogue.trigger('bz39_c08_02', sim);
  sim.dialogue.update(sim);
  if (!sim.transitionIdsApplied.includes('TR03')) {
    sim.transitionIdsApplied.push('TR03');
  }
  return true;
}

export function enterAreaCC09(sim, { skipTransition = false } = {}) {
  beginC08Briefing(sim, { skipTransition });
  const lis = sim.allies.find((a) => a.id === 'pl_lis');

  const worldC = sim.zoneStreamer.switchToCell('C');
  sim.activeCellId = 'C';
  sim.hazardBlasts = []; // D5: uma explosão agendada pertence ao mundo da célula em que foi avisada
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
  sim.areaC.lisPhase = lis?.detachedOutOfCell ? 'liaison_outside' : null;
  sim.c10Active = false;
  sim.c11Active = false;

  sim.horizon.setTemporalState('T3', sim);
  sim.activeCartela = {
    text: M02_TR_CARTELAS.TR03,
    expiresAt: sim.clock + 8.0,
  };

  sim.dialogue.trigger('bz39_c09_02', sim);
  sim.dialogue.update(sim);

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

  // Schedule fixed artillery impact warning (6.0s warning -> fixed street impact at (4, 0, 18)). D5 (PDF p. 18): o aviso é uma
  // explosão agendada da simulação (janela 5-8 s, posição fixada, evento `blast-warning`); o temporizador do diretor lê as
  // horas desse registo, que é a fonte única do aviso e do impacto.
  const spec = sim.areaC.fixedImpactSpec;
  const hazard = sim.scheduleBlastWarning({
    source: 'scripted_artillery',
    x: spec.x,
    y: 0.6,
    z: spec.z,
    radius: spec.radius,
    warningSec: spec.warningDurationSec,
  });
  sim.areaC.artilleryWarningAt = hazard.warnedAt;
  sim.areaC.artilleryImpactAt = hazard.impactAt;

  sim.objective = {
    id: 'O07',
    title: 'O07 (C10 · A Ordem Muda): Segurar a passagem de B09–B12 enquanto o grupo da direita (12 homens) atravessa',
    status: 'active',
  };

  // Save the 4th canonical semantic checkpoint cp_m02_d_cobertura_retirada (I3). Inside tick() (via updateAreaC) it is
  // recorded at the end of the tick, after horizon/dialogue/audiovisual have run (FIX-2b); from the API it is recorded now.
  sim.requestAutoCheckpoint('cp_m02_d_cobertura_retirada');
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

  // D5: o impacto consome o aviso agendado. Sem aviso cumprido (atalho de bancada que rebenta já) fica marcado `warningSkipped`.
  const hazard = sim.hazardBlasts.find((b) => b.source === 'scripted_artillery') ?? null;
  if (hazard) sim.hazardBlasts = sim.hazardBlasts.filter((b) => b !== hazard);
  const warningSkipped = !hazard || sim.clock + 1e-9 < hazard.impactAt;

  // Apply causal explosion damage at the fixed coordinates (never shifts to chase or spare player!)
  // FIX-CD: a explosão rebenta ANTES de existir o entulho que ela própria cria. Antes o entulho de pedra (caixa que contém o centro do
  // impacto) era acrescentado primeiro e ocluía todos os raios: o SP03, única explosão perigosa real do jogo, nunca feria ninguém.
  const blastReport = sim.detonateGrenadeAt(spec.x, 0.6, spec.z, spec.radius, {
    source: 'scripted_artillery',
    blastId: hazard?.id ?? null,
    thrownBy: null,
    warningSkipped,
  });
  // Add persistent debris obstacle blocking the exterior street at (4, 18), forcing evacuation through B09 nave!
  syncAreaCWorldDamage(sim);
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
  sim.areaC.c11StartedAt = Number(sim.clock.toFixed(3));
  sim.c11Active = true;

  const lis = lisActor(sim);
  if (lis) {
    // J3: Lis regressa da ligação fora da célula já ferido por fragmentação (salvo se já estava incapacitado antes; nunca se
    // duplica Lis). O regresso é um PERCURSO: entra pela antecâmara (0,-60) e caminha a velocidade de ferido até ao ponto de
    // encontro junto à porta norte de B09; antes era reposto de uma vez em (-28,-22) (teleporte).
    const wasAlreadyIncapacitated = !lis.alive || lis.state === 'EVACUATED' || lis.state === 'DOWN';
    lis.detachedOutOfCell = false;
    if (!wasAlreadyIncapacitated) {
      const cfg = cellsBCLayout.cells.C.lisReturn;
      lis.x = cfg.entry[0];
      lis.z = cfg.entry[1];
      lis.y = sim.world.heightAt(lis.x, lis.z);
      lis.health = Math.min(lis.health, 46);
      lis.state = 'WOUNDED_LIAISON';
      lis.crouched = false;
      lis.maxSpeed = cfg.speedMps;
      lis.navCorners = null;
      lis.goal = { x: cfg.rendezvous[0], z: cfg.rendezvous[1], facing: Math.PI / 2, crouch: true };
      sim.areaC.lisPhase = 'returning';
    } else {
      sim.areaC.lisPhase = 'incapacitated';
      sim.areaC.lisWasIncapacitated = true;
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

function lisContactDialogue(sim) {
  if (sim.areaC.lisContactedInC11) return;
  // Fala protegida de Piotr dlg_m02_003 («Você vem conosco. A arma eu levo.») no contacto, nunca durante o trajeto distante.
  sim.areaC.lisContactedInC11 = true;
  sim.dialogue.trigger('dlg_m02_003', sim, { allowRepeat: true });
  sim.dialogue.trigger('bz39_c11_03', sim);
  sim.dialogue.update(sim);
}

function markLisMissing(sim, source) {
  const lis = lisActor(sim);
  sim.areaC.lisSupportMode = 'missing';
  sim.areaC.lisPhase = null;
  sim.areaC.lisOutcomeSource = source;
  sim.flags['m02.lis_status'] = 'missing';
  if (lis) {
    lis.state = 'MISSING';
    lis.detachedOutOfCell = true;
    lis.goal = null;
    lis.moving = false;
  }
}

/**
 * API/atalho da bancada: IMPÕE o desfecho de Lis (resultado forçado, `lisOutcomeSource: 'forced'`) e coloca-o já no destino
 * (maca 1 de B12 se carregado; dentro de B12 se amparado). Em jogo o desfecho resulta do percurso (updateAreaC/updateLisC11).
 */
export function assistLisInC11(sim, mode = 'wounded_evacuated') {
  if (!sim.areaC) return null;
  if (!sim.areaC.c10Started) startC10OrderChanges(sim);
  if (!sim.areaC.artilleryDetonated) detonateC10FixedArtillery(sim);
  if (!sim.areaC.c11Started) startC11LisAndLastGroup(sim);

  const lis = lisActor(sim);
  if (mode === 'wounded_evacuated' || mode === 'wounded_walking') {
    lisContactDialogue(sim);
    sim.areaC.lisSupportMode = mode;
    sim.areaC.lisPhase = 'sheltered';
    sim.areaC.lisOutcomeSource = 'forced';
    sim.flags['m02.lis_status'] = mode;
    if (lis && lis.alive) {
      lis.state = mode === 'wounded_evacuated' ? 'EVACUATED_B12' : 'WALKING_SUPPORTED';
      const dest = mode === 'wounded_evacuated' ? b12StretcherSlots()[0] : { x: -58, z: 51 };
      lis.x = dest.x;
      lis.z = dest.z;
      lis.y = sim.world.heightAt(lis.x, lis.z);
      lis.goal = { x: lis.x, z: lis.z };
      lis.moving = false;
    }
  } else if (mode === 'missing') {
    markLisMissing(sim, 'forced');
  }
  return sim.flags['m02.lis_status'];
}

/** Contacto com Lis em C11: o modo depende da lesão (≥ walkMinHealth caminha amparado; abaixo é carregado até à maca). */
function beginLisSupport(sim, lis) {
  const a = sim.areaC;
  const cfg = cellsBCLayout.cells.C.lisReturn;
  lisContactDialogue(sim);
  const mode = lis.health >= cfg.walkMinHealth ? 'wounded_walking' : 'wounded_evacuated';
  a.lisSupportMode = mode;
  a.lisPhase = 'supported';
  a.lisRouteIdx = 0;
  a.lisOutcomeSource = 'game';
  lis.state = mode === 'wounded_walking' ? 'WALKING_SUPPORTED' : 'CARRIED';
  lis.crouched = false;
  lis.maxSpeed = mode === 'wounded_walking' ? cfg.walkingSpeedMps : cfg.carriedSpeedMps;
}

/**
 * Lis em C11, um passo: regressa a pé ao ponto de encontro; no contacto passa a ser amparado/carregado pela rota de evacuação
 * a velocidade limitada, e só avança enquanto Piotr está ao pé (raio de apoio). Chegado ao destino fica abrigado e o
 * desfecho (`m02.lis_status`) fica escrito: «o enum final só é escolhido quando a evacuação foi resolvida» (I4).
 */
function updateLisC11(sim, dt) {
  const a = sim.areaC;
  const lis = lisActor(sim);
  if (!a.c11Started || !lis || !lis.alive || lis.detachedOutOfCell) return;
  const cfg = cellsBCLayout.cells.C.lisReturn;
  const dPlayer = Math.hypot(sim.player.x - lis.x, sim.player.z - lis.z);

  if (a.lisPhase === 'returning' && Math.hypot(lis.x - cfg.rendezvous[0], lis.z - cfg.rendezvous[1]) <= 0.6) {
    a.lisPhase = 'waiting';
  }
  if ((a.lisPhase === 'returning' || a.lisPhase === 'waiting') && dPlayer <= LIS_CONTACT_RANGE_M) {
    beginLisSupport(sim, lis);
  }
  if (a.lisPhase === 'supported') {
    const path = lisSupportPath(a.lisSupportMode);
    lis.moving = false;
    if (dPlayer <= cfg.supportRadius) {
      let budget = lis.maxSpeed * dt;
      while (budget > 1e-9 && a.lisRouteIdx < path.length) {
        const [tx, tz] = path[a.lisRouteIdx];
        const d = Math.hypot(tx - lis.x, tz - lis.z);
        if (d <= budget) {
          lis.x = tx;
          lis.z = tz;
          budget -= d;
          a.lisRouteIdx += 1;
        } else {
          lis.facing = Math.atan2(tz - lis.z, tx - lis.x);
          lis.x += ((tx - lis.x) / d) * budget;
          lis.z += ((tz - lis.z) / d) * budget;
          budget = 0;
        }
        lis.moving = true;
      }
      lis.y = sim.world.heightAt(lis.x, lis.z);
      if (a.lisRouteIdx >= path.length) {
        a.lisPhase = 'sheltered';
        lis.moving = false;
        lis.state = a.lisSupportMode === 'wounded_evacuated' ? 'EVACUATED_B12' : 'WALKING_SUPPORTED';
        sim.flags['m02.lis_status'] = a.lisSupportMode;
        sim.combatLog.push({ clock: Number(sim.clock.toFixed(2)), type: 'lis_sheltered', mode: a.lisSupportMode });
      }
    }
  }
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

  // 3. Lis em C11: regresso a pé, contacto (dlg_m02_003) e percurso amparado/carregado (sem teleporte)
  updateLisC11(sim, dt);

  // 4. O último grupo (LG01..LG12; FORA DO PDF, sourceStatus 'fora_do_pdf') só se põe em marcha no C11, em coluna (startDelaySec),
  // pela rota de evacuação B09 (porta norte) → B12 → (-85,105); só conta como EVACUADO ao CHEGAR ao ponto de evacuação.
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
    if (!sim.areaC.c11Started || sim.clock < sim.areaC.c11StartedAt + lg.startDelaySec) continue;
    const wp = evacRoute[Math.min(lg.waypointIdx, evacRoute.length - 1)];
    const dx = wp[0] - lg.x;
    const dz = wp[1] - lg.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-4) {
      const step = Math.min(dist, lg.speed * dt);
      lg.x = Number((lg.x + (dx / dist) * step).toFixed(2));
      lg.z = Number((lg.z + (dz / dist) * step).toFixed(2));
      lg.y = sim.world.heightAt(lg.x, lg.z);
      lg.facing = Math.atan2(dz, dx);
      lg.moving = true;
    }
    const remDist = Math.hypot(wp[0] - lg.x, wp[1] - lg.z);
    if (remDist <= 0.65) {
      if (lg.waypointIdx < evacRoute.length - 1) {
        lg.waypointIdx++;
      } else {
        lg.evacuated = true;
        lg.arrivedAt = Number(sim.clock.toFixed(2));
        lg.moving = false;
        evacuatedCount++;
      }
    }
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

/**
 * Desfecho de Lis a partir das condições de jogo (C11/C12, I4/I6): abrigado (carregado até à maca de B12 ou amparado até à saída)
 * escreve-o ao chegar; já incapacitado antes de C11 → `wounded_evacuated` (outro fez a ligação; usa esse estado); em qualquer
 * outro caso Piotr termina sem Lis → `missing` («ausência não equivale à morte comprovada»).
 */
export function deriveLisOutcome(sim) {
  const a = sim.areaC;
  const flag = sim.flags['m02.lis_status'];
  if (a.lisPhase === 'sheltered' && ['wounded_evacuated', 'wounded_walking'].includes(flag)) return flag;
  if (a.lisWasIncapacitated) return 'wounded_evacuated';
  return 'missing';
}

export function completeC12Epilogue(sim, { lisOutcome = null } = {}) {
  if (!sim.areaC) {
    enterAreaCC09(sim, { skipTransition: true });
  }
  // Atalho da bancada (KeyM/botão): C11 nunca foi atingido por jogo e a função força C10/C11; o desfecho por omissão continua
  // a ser o forçado `wounded_evacuated`. Com C11 atingido por jogo o desfecho deriva do estado de Lis (deriveLisOutcome).
  const reachedByGame = Boolean(sim.areaC.c11Started);
  if (!sim.areaC.c10Started) startC10OrderChanges(sim);
  if (!sim.areaC.artilleryDetonated) detonateC10FixedArtillery(sim);
  if (!sim.areaC.c11Started) startC11LisAndLastGroup(sim);

  if (lisOutcome) {
    assistLisInC11(sim, lisOutcome);
  } else if (reachedByGame) {
    const outcome = deriveLisOutcome(sim);
    if (outcome === 'missing') {
      markLisMissing(sim, 'game');
    } else {
      sim.flags['m02.lis_status'] = outcome;
      sim.areaC.lisSupportMode = outcome;
      sim.areaC.lisOutcomeSource = 'game';
      const lis = lisActor(sim);
      if (lis && sim.areaC.lisWasIncapacitated) lis.state = lis.alive ? 'EVACUATED' : lis.state;
    }
  } else if (!sim.flags['m02.lis_status'] || sim.flags['m02.lis_status'] === 'active') {
    assistLisInC11(sim, 'wounded_evacuated');
  }

  // Último grupo: só conta como evacuado quem CHEGOU ao ponto de evacuação; quem ainda está em trânsito continua em trânsito
  // (antes todos os vivos eram marcados evacuados aqui, sem chegar) e quem caiu fica como morto.
  const group = sim.areaC.lastGroup;
  const evacuated = group.filter((lg) => lg.alive && lg.evacuated).length;
  sim.areaC.lastGroupSummary = {
    evacuated,
    inTransit: group.filter((lg) => lg.alive && !lg.evacuated).length,
    dead: group.filter((lg) => !lg.alive).length,
  };
  sim.flags['m02.last_group_survivors'] = evacuated;
  const survivors = evacuated;
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
    title: `M02 Concluída (C12 Epílogo): Lis=${sim.flags['m02.lis_status']} · Grupo final=${survivors}/12`,
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
      // Data do pacote para a entrada da M03 (C6 p. 15 / I1 p. 33); K5 (p. 40): sem dia fixado para cada passo de Piotr até CONT-01.
      warsawArrival: '1939-09-25',
      generalRetreatOnMorningSept10: false, // HIST-TEST-01 mandatory historical invariant
    },
    flags: structuredClone(sim.flags),
    supplies: structuredClone(sim.supplies),
    transitionIdsApplied: [...sim.transitionIdsApplied],
    totalHostilesPlanned: 46, // total planeado de D2 (EA0 4 + EA1 10 + EB1 12 + EC1 8 + EC2 12); nunca simultâneo nem número de ecrã
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

// ---------------------------------------------------------------------------------------------------------------------------
// Roteiro automático C01 → C12 (PDF C, pp. 12-15): as cenas avançam por CONDIÇÕES DE JOGO (posição, objetivos, baixas, temporizadores
// do próprio PDF), sem depender das teclas de bancada (Digit0-9/KeyM), que ficam só como atalhos de depuração: um atalho que salta
// cenas é apanhado por `stateSceneFloor` e o roteiro continua a partir daí. Tempo simulado por cena em `script.history`.
// ---------------------------------------------------------------------------------------------------------------------------
export const M02_SCENE_IDS = Object.freeze(['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12']);
/** Cenas «de elipse» (C5 p. 13-14, C6 p. 14-15): duração proposta, limite inferior de «Duração proposta» da tabela da p. 12 (s). */
export const M02_SCENE_HOLD_SEC = Object.freeze({ C05: 45, C07: 60, C08: 60, C12: 45 });
/** Entrada do slice (0,-80) com folga: o posto EA0 já caiu e o jogador chegou às últimas coberturas antes da quinta (C02). */
export const C02_EXIT_Z = -85;
/** O jogador abandona a quinta pelo pomar a sul (C04 → C05, «a coluna sai da quinta»). */
export const C04_EXIT_Z = 44;
export const C11_EVAC_RADIUS_M = 6;

/**
 * Instante PASSADO gravado pela simulação (início de cena, aviso de explosão, falha da missão), em ms arredondados para BAIXO.
 * O validador recusa um instante à frente do relógio do snapshot (`> clock + 1e-9`); `toFixed(3)` arredondava para cima e, com o dt
 * real de um frame (1/60 s), metade das transições de cena gravava um instante 0,1-0,5 ms à frente do relógio: o checkpoint desse
 * passo era recusado e perdia-se (FIX-CD). Instantes futuros (impacto, próximo tiro, contacto agendado) não passam por aqui.
 */
export function instantAt(clock) {
  const ms = Math.floor(clock * 1000);
  const t = ms / 1000;
  return t > clock ? (ms - 1) / 1000 : t;
}

export function createInitialScriptState(sceneId = 'C02', clock = 0) {
  return { sceneId, sceneStartedAt: instantAt(clock), history: [], finished: false };
}

function sceneIndex(id) {
  return M02_SCENE_IDS.indexOf(id);
}

/** Cena mínima já ultrapassada pelo estado real (atalhos de bancada incluídos). */
export function stateSceneFloor(sim) {
  if (sim.areaC?.c12Completed) return 'C12';
  if (sim.activeCellId === 'C') {
    if (sim.areaC?.c11Started) return 'C11';
    if (sim.areaC?.c10Started) return 'C10';
    return 'C09';
  }
  if (sim.activeCellId === 'B') {
    if (sim.areaB?.c08Briefed) return 'C08';
    return sim.areaB?.reorganizedC07 ? 'C07' : 'C06';
  }
  return sim.transitionTABPayload ? 'C05' : 'C01';
}

function endScene(sim, nextId) {
  const sc = sim.script;
  const now = instantAt(sim.clock);
  sc.history.push({ id: sc.sceneId, startedAt: sc.sceneStartedAt, endedAt: Math.max(now, sc.sceneStartedAt) });
  sc.sceneId = nextId;
  sc.sceneStartedAt = now;
  sim.events.push({ type: 'scene-changed', from: sc.history.at(-1).id, to: nextId, clock: now });
}

function sceneAge(sim) {
  return sim.clock - sim.script.sceneStartedAt;
}

/** Condição de saída natural de cada cena (a ação, se houver, corre na própria transição). Devolve a cena seguinte ou null. */
function naturalNextScene(sim) {
  const sc = sim.script;
  const p = sim.player;
  switch (sc.sceneId) {
    case 'C01':
      // C01: preparação; acaba quando o jogador começa a avançar (a preparação «pode ser abreviada»)
      return sim.c01Contact?.movementStartedAt != null || !sim.c01Active ? 'C02' : null;
    case 'C02':
      // C02: posto EA0 vencido (ou rendido) e o jogador nas últimas coberturas; nunca por esperar
      return !sim.c01Active && sim.activeCellId === 'A' && p.z >= C02_EXIT_Z ? 'C03' : null;
    case 'C03':
      // C03: sem defensores da quinta em combate (mortos, rendidos ou em fuga)
      return sim.objective.id === 'C04' || sim.objective.id === 'COMPLETE' ? 'C04' : null;
    case 'C04':
      // C04: o jogador compreendeu a ordem e sai pelo pomar; a quinta fica consolidada (objetivo COMPLETE)
      if (sim.objective.id === 'COMPLETE' && p.z >= C04_EXIT_Z) {
        sim.triggerTransitionTAB({ skip: false });
        return 'C05';
      }
      return null;
    case 'C05':
      if (sceneAge(sim) >= M02_SCENE_HOLD_SEC.C05) {
        sim.enterAreaBC06();
        return 'C06';
      }
      return null;
    case 'C06':
      // C06: «a cena acaba com a passagem resolvida» (todos os volumes resolvidos e sem hostis): corridor_held, sem tempo mínimo
      if (sim.flags['m02.corridor_held']) {
        sim.completeC07Reorganization();
        return 'C07';
      }
      return null;
    case 'C07':
      if (sceneAge(sim) >= M02_SCENE_HOLD_SEC.C07) {
        beginC08Briefing(sim);
        return 'C08';
      }
      return null;
    case 'C08':
      if (sceneAge(sim) >= M02_SCENE_HOLD_SEC.C08) {
        sim.enterAreaCC09();
        return 'C09';
      }
      return null;
    case 'C09':
      return sim.areaC?.c10Started ? 'C10' : null;
    case 'C10':
      return sim.areaC?.c11Started ? 'C11' : null;
    case 'C11':
      return c11Resolved(sim) ? 'C12' : null;
    default:
      return null;
  }
}

/**
 * C11 → C12 (PDF p. 14): «A passagem termina quando todos os sobreviventes alcançáveis chegaram, foram explicitamente deixados ou
 * ficaram sem rota segura e Gruca ordena romper contacto.» Aqui: todos os membros vivos do último grupo evacuados e Piotr no ponto
 * de evacuação; se Lis ainda está a ser amparado ao lado de Piotr espera-se que acabe o percurso; se Piotr chegou sem ele,
 * C12 regista `missing`.
 */
function c11Resolved(sim) {
  const a = sim.areaC;
  if (!a?.c11Started || a.c12Completed) return false;
  if (a.lastGroup.some((lg) => lg.alive && !lg.evacuated)) return false;
  const evac = cellsBCLayout.cells.C.evacRoute.at(-1);
  if (Math.hypot(sim.player.x - evac[0], sim.player.z - evac[1]) > C11_EVAC_RADIUS_M) return false;
  const lis = sim.allies.find((al) => al.id === 'pl_lis');
  if (a.lisPhase === 'supported' && lis && Math.hypot(sim.player.x - lis.x, sim.player.z - lis.z) <= cellsBCLayout.cells.C.lisReturn.supportRadius) {
    return false; // Lis ainda a chegar, com Piotr ao pé
  }
  return true;
}

/** Um passo do roteiro, no fim de tick() (depois do tático/objetivo). Pode encadear várias cenas se o estado já as ultrapassou. */
export function updateScript(sim) {
  const sc = sim.script;
  // D1: com a missão falhada (Piotr morto) o roteiro pára: não avança cenas nem corre ações de transição.
  if (!sc || sc.finished || sim.missionFailed) return;
  for (let guard = 0; guard < M02_SCENE_IDS.length; guard++) {
    const idx = sceneIndex(sc.sceneId);
    const floor = sceneIndex(stateSceneFloor(sim));
    if (floor > idx) {
      endScene(sim, M02_SCENE_IDS[idx + 1]); // atalho de bancada ou estado já ultrapassado: apanha a cena a cena
      continue;
    }
    if (sc.sceneId === 'C12') {
      if (sceneAge(sim) >= M02_SCENE_HOLD_SEC.C12 && sim.areaC?.c12Completed) {
        sc.history.push({ id: 'C12', startedAt: sc.sceneStartedAt, endedAt: Math.max(instantAt(sim.clock), sc.sceneStartedAt) });
        sc.finished = true;
      }
      return;
    }
    const next = naturalNextScene(sim);
    if (!next) return;
    if (next === 'C12') {
      sim.completeC12Epilogue();
    }
    endScene(sim, next);
    if (next === 'C12') return;
  }
}
