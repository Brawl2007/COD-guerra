import { eyePosition } from '../world/spatial.js';
import { movePlayer, PLAYER_PHYSICS } from '../world/m01-player-physics.js';

export const WEAPON_PROFILES = Object.freeze({
  wz29: Object.freeze({
    id: 'wz29',
    label: 'kb wz. 29',
    magSize: 5,
    damage: 58,
    cycleSec: 1.35,
    reloadSec: 2.6,
    range: 185,
    suppressionAdd: 0.36,
    burstCount: 1,
    burstGapSec: 0,
    spreadRad: 0.012,
  }),
  rkm_wz28: Object.freeze({
    id: 'rkm_wz28',
    label: 'rkm wz. 28',
    magSize: 20,
    damage: 34,
    cycleSec: 1.55,
    reloadSec: 3.2,
    range: 195,
    suppressionAdd: 0.65,
    burstCount: 4,
    burstGapSec: 0.11,
    spreadRad: 0.018,
  }),
  kar98k: Object.freeze({
    id: 'kar98k',
    label: 'Kar98k',
    magSize: 5,
    damage: 46,
    cycleSec: 1.55,
    reloadSec: 2.8,
    range: 180,
    suppressionAdd: 0.34,
    burstCount: 1,
    burstGapSec: 0,
    spreadRad: 0.016,
  }),
  mg34: Object.freeze({
    id: 'mg34',
    label: 'MG34',
    magSize: 50,
    damage: 24,
    cycleSec: 2.1,
    reloadSec: 4.0,
    range: 98,
    suppressionAdd: 0.58,
    burstCount: 5,
    burstGapSec: 0.09,
    spreadRad: 0.024,
  }),
});

export const M02_DIALOGUE_CATALOG = Object.freeze({
  dlg_m02_001: Object.freeze({
    id: 'dlg_m02_001',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 4.5,
    protectedLiteral: true,
    text: 'Era a estrada de casa. Agora procuro onde esconder a cabeça.',
  }),
  bz39_c01_01: Object.freeze({
    id: 'bz39_c01_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 3.8,
    text: 'Ao próximo talude. Depois a quinta.',
  }),
  bz39_c02_01: Object.freeze({
    id: 'bz39_c02_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.6,
    text: 'Pela vala temos abrigo. Pelo pomar chegamos ao outro lado.',
  }),
  bz39_c02_02: Object.freeze({
    id: 'bz39_c02_02',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 1,
    durationSec: 3.5,
    text: 'O clarão. Junto ao talude.',
  }),
  bz39_c02_03: Object.freeze({
    id: 'bz39_c02_03',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 1,
    durationSec: 3.8,
    text: 'Cabeça baixa, Małek. Ainda não pararam.',
  }),
  bz39_c02_04: Object.freeze({
    id: 'bz39_c02_04',
    speakerId: 'pl_malek',
    speakerName: 'strz. Jurek Małek',
    priority: 2,
    durationSec: 3.4,
    text: 'Estou a ver. Agora estou a ver.',
  }),
  bz39_c03_01: Object.freeze({
    id: 'bz39_c03_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Lis, casa. Wierzba, espera o rkm.',
    fallbackText: 'Equipa da esquerda, casa. Flanco, espera o rkm.',
  }),
  bz39_c03_02: Object.freeze({
    id: 'bz39_c03_02',
    speakerId: 'pl_aux_02',
    speakerName: 'Auxiliar rkm',
    priority: 1,
    durationSec: 3.5,
    text: 'A carregar. Cobre a abertura!',
  }),
  bz39_c03_03: Object.freeze({
    id: 'bz39_c03_03',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 1,
    durationSec: 3.6,
    text: 'A porta de trás está livre.',
  }),
  bz39_c03_04: Object.freeze({
    id: 'bz39_c03_04',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Não fiquem no portão. Verifiquem a saída.',
  }),
  bz39_c04_01: Object.freeze({
    id: 'bz39_c04_01',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 2,
    durationSec: 4.0,
    text: 'Deixa-o. Os nossos também ficaram.',
  }),
  bz39_c04_02: Object.freeze({
    id: 'bz39_c04_02',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 4.4,
    text: 'Não podemos levá-lo. Podemos dizer onde está.',
  }),
  bz39_c04_03: Object.freeze({
    id: 'bz39_c04_03',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 1,
    durationSec: 4.0,
    text: 'Marca aqui. Onde se veja do caminho.',
  }),
  bz39_c04_04: Object.freeze({
    id: 'bz39_c04_04',
    speakerId: 'pl_malek',
    speakerName: 'strz. Jurek Małek',
    priority: 2,
    durationSec: 3.4,
    text: 'Ainda está a respirar.',
  }),
  bz39_c04_05: Object.freeze({
    id: 'bz39_c04_05',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.5,
    text: 'Baixe a arma. Ele já não combate.',
  }),
  bz39_c05_01: Object.freeze({
    id: 'bz39_c05_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Precisam de nós na passagem. Juntem os homens.',
  }),
});

export class M02DialogueDirector {
  constructor() {
    this.activeLine = null;
    this.queue = [];
    this.consumed = new Set();
    this.history = [];
  }

  reset() {
    this.activeLine = null;
    this.queue = [];
    this.consumed.clear();
    this.history = [];
  }

  trigger(lineId, sim, { allowRepeat = false } = {}) {
    const def = M02_DIALOGUE_CATALOG[lineId];
    if (!def) return false;
    if (!allowRepeat && this.consumed.has(lineId)) return false;

    const speaker = sim.allies.find((a) => a.id === def.speakerId);
    if (speaker && (!speaker.alive || speaker.state === 'DOWN' || speaker.state === 'EVACUATED')) {
      if (!def.fallbackText) return false;
    }

    let resolvedText = def.text;
    if (lineId === 'bz39_c03_01') {
      const lisOk = sim.allies.some((a) => a.id === 'pl_lis' && a.alive && a.state !== 'DOWN');
      const wierzbaOk = sim.allies.some((a) => a.id === 'pl_wierzba' && a.alive && a.state !== 'DOWN');
      if (!lisOk || !wierzbaOk) resolvedText = def.fallbackText;
    }

    this.consumed.add(lineId);
    const entry = {
      id: def.id,
      speakerId: def.speakerId,
      speakerName: def.speakerName,
      priority: def.priority,
      text: resolvedText,
      durationSec: def.durationSec,
      queuedAt: Number(sim.clock.toFixed(2)),
    };

    // Priority 0 interrupts lower priority active speech immediately (K4)
    if (this.activeLine && entry.priority < this.activeLine.priority) {
      this.activeLine = {
        ...entry,
        startedAt: Number(sim.clock.toFixed(2)),
        expiresAt: Number((sim.clock + entry.durationSec).toFixed(2)),
      };
      this.history.push(this.activeLine);
      sim.events.push({ type: 'dialogue-line', line: this.activeLine });
      return true;
    }

    this.queue.push(entry);
    this.queue.sort((a, b) => a.priority - b.priority || a.queuedAt - b.queuedAt);
    return true;
  }

  update(sim) {
    if (this.activeLine && sim.clock >= this.activeLine.expiresAt) {
      this.activeLine = null;
    }
    if (!this.activeLine && this.queue.length > 0) {
      const next = this.queue.shift();
      this.activeLine = {
        ...next,
        startedAt: Number(sim.clock.toFixed(2)),
        expiresAt: Number((sim.clock + next.durationSec).toFixed(2)),
      };
      this.history.push(this.activeLine);
      sim.events.push({ type: 'dialogue-line', line: this.activeLine });
    }
  }

  snapshot() {
    return {
      activeLine: this.activeLine ? structuredClone(this.activeLine) : null,
      queue: structuredClone(this.queue),
      consumed: [...this.consumed],
      history: structuredClone(this.history),
    };
  }

  restore(snap) {
    if (!snap) return;
    this.activeLine = snap.activeLine ? structuredClone(snap.activeLine) : null;
    this.queue = structuredClone(snap.queue ?? []);
    this.consumed = new Set(snap.consumed ?? []);
    this.history = structuredClone(snap.history ?? []);
  }
}

function normalizeAngleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function friendlyFireClear(shooter, targetPoint, friendlies, clearanceM = 0.82) {
  const dx = targetPoint.x - shooter.x;
  const dz = targetPoint.z - shooter.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-3) return true;
  const ux = dx / len;
  const uz = dz / len;

  for (const f of friendlies) {
    if (!f || f.id === shooter.id || !f.alive) continue;
    const fx = f.x - shooter.x;
    const fz = f.z - shooter.z;
    const proj = fx * ux + fz * uz;
    if (proj <= 0.25 || proj >= len - 0.35) continue;
    const perp = Math.abs(fx * uz - fz * ux);
    if (perp < clearanceM) return false;
  }
  return true;
}

export function stepActorWeapon(sim, actor, dt) {
  const prof = WEAPON_PROFILES[actor.weapon] ?? WEAPON_PROFILES.wz29;
  if (actor.reloadingUntil > sim.clock) return;
  if (actor.reloadingUntil > 0 && sim.clock >= actor.reloadingUntil) {
    const needed = prof.magSize - actor.mag;
    const load = Math.min(needed, actor.reserve);
    actor.mag += load;
    actor.reserve -= load;
    actor.reloadingUntil = 0;
  }
  if (actor.mag <= 0 && actor.reserve > 0 && actor.reloadingUntil === 0) {
    actor.reloadingUntil = Number((sim.clock + prof.reloadSec).toFixed(3));
    if (actor.id === 'pl_aux_01') {
      sim.dialogue.trigger('bz39_c03_02', sim, { allowRepeat: true });
    }
  }
}

export function stepActorNavigation(sim, actor, dt) {
  if (!actor.alive || actor.nonCombatant || actor.state === 'DOWN' || actor.state === 'SURRENDERED' || actor.state === 'WOUNDED_UNARMED') {
    actor.moving = false;
    return;
  }
  if (!actor.goal) {
    actor.moving = false;
    return;
  }

  const distToGoal = Math.hypot(actor.goal.x - actor.x, actor.goal.z - actor.z);
  if (distToGoal <= 0.45) {
    actor.moving = false;
    actor.navCorners = null;
    if (typeof actor.goal.facing === 'number') {
      actor.facing = actor.goal.facing;
    }
    if (typeof actor.goal.crouch === 'boolean') {
      actor.crouched = actor.goal.crouch;
      actor.eyeHeight = actor.crouched ? 1.08 : 1.65;
    }
    return;
  }

  // Check if any narrow door (<= 1.3m) is within 1.65m of the actor along their movement toward the goal
  for (const door of sim.world.doors) {
    const dDoor = Math.hypot(door.center.x - actor.x, door.center.z - actor.z);
    if (dDoor <= 1.65) {
      // If the door is closed, NPC opens it physically!
      if (door.state === 'closed') {
        sim.world.setDoorState(door.id, 'open');
        sim.events.push({
          type: 'door-toggled',
          doorId: door.id,
          state: 'open',
          byActorId: actor.id,
          clock: sim.clock,
        });
      }
      // Single-file portal queue for narrow doorways (width <= 1.3m)
      if (door.width <= 1.3) {
        const lock = sim.doorLocks.get(door.id);
        if (lock && lock.actorId !== actor.id && lock.expiresAt > sim.clock) {
          actor.moving = false;
          actor.waitingForDoorId = door.id;
          return;
        }
        sim.doorLocks.set(door.id, {
          actorId: actor.id,
          expiresAt: Number((sim.clock + 0.95).toFixed(3)),
        });
        actor.waitingForDoorId = null;
      }
    }
  }

  // Replan A* route when goal or world revision changes (respecting 1 route per tick budget or immediate if unrouted)
  const goalKey = `${actor.goal.x.toFixed(2)},${actor.goal.z.toFixed(2)}`;
  if (!actor.navCorners || actor.navGoalKey !== goalKey || actor.navRevision !== sim.world.revision) {
    const corners = sim.navigator.route(
      { x: actor.x, y: actor.y, z: actor.z, radius: actor.radius ?? PLAYER_PHYSICS.radius },
      { x: actor.goal.x, z: actor.goal.z },
    );
    actor.navCorners = corners && corners.length ? corners.map(([cx, cz]) => ({ x: cx, z: cz })) : [{ x: actor.goal.x, z: actor.goal.z }];
    actor.navGoalKey = goalKey;
    actor.navRevision = sim.world.revision;
  }

  while (actor.navCorners && actor.navCorners.length > 1) {
    const c0 = actor.navCorners[0];
    if (Math.hypot(c0.x - actor.x, c0.z - actor.z) <= 0.48) {
      actor.navCorners.shift();
    } else {
      break;
    }
  }

  const nextCorner = actor.navCorners?.[0] ?? actor.goal;
  const dx = nextCorner.x - actor.x;
  const dz = nextCorner.z - actor.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-4) {
    actor.moving = false;
    return;
  }

  const baseSpeed = actor.suppressed > 0.55 ? 2.6 : 4.1;
  const stepDist = Math.min(dist, baseSpeed * dt);
  let vx = (dx / dist) * stepDist;
  let vz = (dz / dist) * stepDist;

  // Gentle personal-space repulsion against other living actors so capsules never stack
  const allActors = [...sim.allies, ...sim.enemies];
  for (const other of allActors) {
    if (other.id === actor.id || !other.alive) continue;
    const ox = actor.x - other.x;
    const oz = actor.z - other.z;
    const od = Math.hypot(ox, oz);
    if (od > 1e-4 && od < 0.72) {
      const push = ((0.72 - od) / 0.72) * 1.4 * dt;
      vx += (ox / od) * push;
      vz += (oz / od) * push;
    }
  }

  actor.crouched = false;
  actor.eyeHeight = 1.65;
  actor.moving = true;
  actor.facing = Math.atan2(dz, dx);
  movePlayer(sim.world, actor, vx, vz, dt);
}

export function updatePolishSquad(sim, dt) {
  const coverById = sim.coverNodesById;
  const activeAxis = sim.flags['m02.axis'] || (sim.squadOrder?.axis ?? 'ditch');
  const mgGunner = sim.enemies.find((e) => e.id === 'DE-A05' && e.alive && !e.nonCombatant);

  // Assign tactical cover goals by squad state & elapsed time / progression
  for (const ally of sim.allies) {
    if (!ally.alive || ally.state === 'DOWN') continue;
    ally.suppressed = Math.max(0, ally.suppressed - dt * 0.28);
    stepActorWeapon(sim, ally, dt);

    // 0. If C01/EA0 northern approach is active, bound from P1 (0,-175) to the transverse outpost trench (-18,-110)
    if (sim.c01Active) {
      const c01Elapsed = sim.clock - (sim.c01StartedAt ?? 0);
      const c01Stage = c01Elapsed < 4.5 ? 0 : c01Elapsed < 14.0 ? 1 : 2;
      const c01Map = {
        pl_aux_01: ['cv_c01_p1_e', 'cv_c01_mid_e', 'cv_c01_mid_e'],
        pl_aux_02: ['cv_c01_p1_w', 'cv_c01_mid_e', 'cv_c01_mid_e'],
        pl_szymczak: ['cv_c01_p1_w', 'cv_c01_p1_w', 'cv_c01_mid_w'],
        pl_gruca: ['cv_c01_p1_w', 'cv_c01_mid_w', 'cv_c01_outpost_clear'],
        pl_lis: ['cv_c01_p1_w', 'cv_c01_mid_w', 'cv_c01_outpost_clear'],
        pl_wierzba: ['cv_c01_p1_e', 'cv_c01_mid_e', 'cv_c01_outpost_clear'],
        pl_malek: ['cv_c01_p1_w', 'cv_c01_mid_w', 'cv_c01_outpost_clear'],
      };
      const seq = c01Map[ally.id] ?? c01Map.pl_gruca;
      const nodeId = seq[Math.min(c01Stage, seq.length - 1)];
      const node = coverById.get(nodeId);
      if (node) {
        ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
        ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
      }
    } else if (ally.id === 'pl_aux_01' || ally.id === 'pl_aux_02') {
      // 1. rkm wz. 28 support pair (Nowak + Kowalski) holds fire base and advances to north courtyard wall once ditch team reaches B01
      const combatElapsed = sim.clock - (sim.ea1StartedAt ?? 0);
      const ditchAdvanced = combatElapsed >= 18 || sim.player.z > -35;
      const nodeId = ditchAdvanced
        ? (ally.id === 'pl_aux_01' ? 'cv_gate_wall_west_s' : 'cv_b01_east_corner')
        : (ally.id === 'pl_aux_01' ? 'cv_start_parapet_e' : 'cv_start_parapet_w');
      const node = coverById.get(nodeId);
      if (node) {
        ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
        ally.tacticalState = 'HoldAndSuppress';
      }
    } else if (ally.id === 'pl_szymczak') {
      // Medic stays in covered support behind Gruca and moves to orchard in C04
      const combatElapsed = sim.clock - (sim.ea1StartedAt ?? 0);
      const c04Ready = sim.objective.id === 'C04' || sim.objective.id === 'O03';
      const nodeId = c04Ready
        ? 'cv_courtyard_consolidate'
        : combatElapsed >= 14
          ? 'cv_ditch_mid_b'
          : 'cv_start_parapet_w';
      const node = coverById.get(nodeId);
      if (node) {
        ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
        ally.tacticalState = 'SupportMedic';
      }
    } else {
      // Assault & flank team (Gruca, Lis, Wierzba, Małek)
      const combatElapsed = sim.clock - (sim.ea1StartedAt ?? 0);
      const orderMode = sim.squadOrder?.type ?? 'auto';
      if (activeAxis === 'orchard' || orderMode === 'flank_east') {
        const stage = combatElapsed < 12 ? 0 : combatElapsed < 26 ? 1 : 2;
        const mapByRole = {
          pl_gruca: ['cv_orchard_bank_e', 'cv_b03_south_entry', 'cv_courtyard_consolidate'],
          pl_wierzba: ['cv_orchard_bank_e', 'cv_b03_north_exit', 'cv_gate_wall_west_s'],
          pl_lis: ['cv_ditch_north_a', 'cv_b01_north_wall', 'cv_b01_hall_in'],
          pl_malek: ['cv_ditch_north_b', 'cv_b01_kitchen_in', 'cv_b01_east_corner'],
        };
        const seq = mapByRole[ally.id] ?? mapByRole.pl_gruca;
        const nodeId = seq[Math.min(stage, seq.length - 1)];
        const node = coverById.get(nodeId);
        if (node) {
          ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
          ally.tacticalState = stage >= 1 ? 'FlankMove' : 'AdvanceOrder';
        }
      } else {
        // Default / Ditch + B01 clearing bound progression
        const stage = combatElapsed < 8 ? 0 : combatElapsed < 18 ? 1 : combatElapsed < 30 ? 2 : 3;
        const mapByRole = {
          pl_gruca: ['cv_ditch_north_a', 'cv_ditch_mid_a', 'cv_b01_north_wall', 'cv_b01_east_corner'],
          pl_lis: ['cv_ditch_north_b', 'cv_ditch_south_a', 'cv_b01_kitchen_in', 'cv_b01_hall_in'],
          pl_wierzba: ['cv_ditch_mid_a', 'cv_b01_north_wall', 'cv_b01_east_corner', 'cv_gate_wall_west_s'],
          pl_malek: ['cv_ditch_north_b', 'cv_ditch_mid_b', 'cv_ditch_south_a', 'cv_b01_kitchen_in'],
        };
        const seq = mapByRole[ally.id] ?? mapByRole.pl_gruca;
        const nodeId = seq[Math.min(stage, seq.length - 1)];
        const node = coverById.get(nodeId);
        if (node) {
          ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
          ally.tacticalState = nodeId.startsWith('cv_b01_') && nodeId.endsWith('_in') ? 'ClearRoom' : 'AdvanceOrder';
        }
      }
    }

    const prevNode = ally.reachedNodeId;
    stepActorNavigation(sim, ally, dt);
    if (!ally.moving && ally.goal?.nodeId && ally.reachedNodeId !== ally.goal.nodeId) {
      ally.reachedNodeId = ally.goal.nodeId;
      sim.combatLog.push({
        clock: Number(sim.clock.toFixed(2)),
        type: 'ally_captured_cover',
        actorId: ally.id,
        nodeId: ally.goal.nodeId,
        fromNodeId: prevNode ?? null,
      });
      if (ally.id === 'pl_malek' && ally.goal.nodeId === 'cv_ditch_north_b') {
        sim.dialogue.trigger('bz39_c02_04', sim);
      }
      if (ally.id === 'pl_gruca' && ally.goal.nodeId === 'cv_b01_north_wall') {
        sim.dialogue.trigger('bz39_c03_01', sim);
      }
      if (ally.id === 'pl_wierzba' && ally.goal.nodeId === 'cv_b01_east_corner') {
        sim.dialogue.trigger('bz39_c03_03', sim);
      }
    }

    // 2. Allied target acquisition & causal firing (no decorative shots!)
    if (ally.reloadingUntil > sim.clock || ally.mag <= 0 || sim.clock < ally.nextFireAt) {
      continue;
    }
    if (ally.id === 'pl_szymczak' && ally.suppressed < 0.2) {
      // Medic only fires in close self-defense
      continue;
    }

    let bestEnemy = null;
    let bestScore = -Infinity;
    for (const enemy of sim.enemies) {
      if (!enemy.alive || enemy.nonCombatant) continue;
      if (sim.c01Active && enemy.encounterId !== 'EA0') continue;
      const dist = Math.hypot(enemy.x - ally.x, enemy.z - ally.z);
      if (dist > (WEAPON_PROFILES[ally.weapon]?.range ?? 180)) continue;

      const hasLoS = sim.world.lineOfSight(ally, enemy, { includeFoliage: true });
      // rkm_gunner can also lay suppressive fire on the B02 MG aperture if it has clear ray to the aperture lip
      const isMgSuppressTarget =
        !sim.c01Active &&
        ally.id === 'pl_aux_01' &&
        enemy.id === 'DE-A05' &&
        sim.world.lineOfSight(ally, { x: 11.85, y: 0, z: -30.0, eyeHeight: 1.42, space: 'metres' }, { includeFoliage: false });

      if (!hasLoS && !isMgSuppressTarget) continue;

      const aimPt = isMgSuppressTarget && !hasLoS
        ? { x: 12.2, y: 1.38, z: -30.0 }
        : { x: enemy.x, y: enemy.y + (enemy.crouched ? 0.92 : 1.25), z: enemy.z };

      if (!friendlyFireClear(ally, aimPt, [sim.player, ...sim.allies])) continue;

      let score = 200 - dist;
      if (enemy.id === 'DE-A05') score += 85; // prioritize MG34
      if (hasLoS) score += 40;
      if (score > bestScore) {
        bestScore = score;
        bestEnemy = { enemy, aimPt, isMgSuppressTarget };
      }
    }

    if (bestEnemy) {
      const { enemy, aimPt } = bestEnemy;
      ally.facing = Math.atan2(aimPt.z - ally.z, aimPt.x - ally.x);
      sim.fireActorBurst(ally, enemy, aimPt, 'ally');
      if (ally.id === 'pl_lis' && (enemy.id === 'DE-A05' || enemy.encounterId === 'EA0')) {
        sim.dialogue.trigger('bz39_c02_02', sim);
      }
    }
  }
}

export function updateGermanGarrison(sim, dt) {
  const ea1Enemies = sim.enemies.filter((e) => e.encounterId !== 'EA0');
  const livingEa1Combat = ea1Enemies.filter((e) => e.alive && !e.nonCombatant);
  const neutralizedCount = ea1Enemies.length - livingEa1Combat.length;
  const mgGunner = sim.enemies.find((e) => e.id === 'DE-A05');
  const mgDown = !mgGunner || !mgGunner.alive || mgGunner.nonCombatant;

  // Detect which flank is under pressure so local reserves (DE-A12, DE-A13) can shift (J1)
  const westPressure =
    (sim.player.x < -20 && sim.player.z > -45) ||
    sim.allies.some((a) => a.alive && a.x < -24 && a.z > -35);
  const eastPressure =
    (sim.player.x > 18 && sim.player.z > -45) ||
    sim.allies.some((a) => a.alive && a.x > 18 && a.z > -35);

  for (const enemy of sim.enemies) {
    if (!enemy.alive) continue;
    if (sim.c01Active && enemy.encounterId !== 'EA0') continue;
    enemy.suppressed = Math.max(0, enemy.suppressed - dt * 0.25);

    // Check C04 wounded non-combatant transition in southern orchard
    if (enemy.c04Candidate && !enemy.nonCombatant && (enemy.health <= 48 || (mgDown && neutralizedCount >= 6))) {
      enemy.state = 'WOUNDED_UNARMED';
      enemy.nonCombatant = true;
      enemy.crouched = true;
      enemy.moving = false;
      enemy.goal = null;
      enemy.health = Math.max(25, enemy.health);
      sim.combatLog.push({
        clock: Number(sim.clock.toFixed(2)),
        type: 'enemy_wounded_unarmed_c04',
        actorId: enemy.id,
        x: Number(enemy.x.toFixed(2)),
        z: Number(enemy.z.toFixed(2)),
      });
      continue;
    }

    // Check garrison morale collapse (retreat / surrender when MG is down and >= 7 defenders neutralized)
    if (!enemy.nonCombatant && mgDown && neutralizedCount >= 7) {
      enemy.state = 'SURRENDERED';
      enemy.nonCombatant = true;
      enemy.moving = false;
      enemy.goal = null;
      sim.combatLog.push({
        clock: Number(sim.clock.toFixed(2)),
        type: 'enemy_surrendered',
        actorId: enemy.id,
      });
      continue;
    }

    if (enemy.nonCombatant) continue;

    stepActorWeapon(sim, enemy, dt);

    // Local reserve movement (DE-A12, DE-A13)
    if (enemy.role === 'reserve' && !enemy.reserveShifted) {
      if (westPressure && enemy.ShiftWest) {
        enemy.goal = { x: enemy.ShiftWest[0], z: enemy.ShiftWest[1], crouch: true };
        enemy.reserveShifted = 'west';
        enemy.state = 'SHIFT_COVER';
      } else if (eastPressure && enemy.ShiftEast) {
        enemy.goal = { x: enemy.ShiftEast[0], z: enemy.ShiftEast[1], crouch: true };
        enemy.reserveShifted = 'east';
        enemy.state = 'SHIFT_COVER';
      }
    }

    // Fallback to secondary cover if heavily suppressed and damaged
    if (enemy.health < 55 && enemy.suppressed > 0.65 && enemy.fallback && !enemy.fellBack) {
      enemy.goal = { x: enemy.fallback[0], z: enemy.fallback[1], crouch: true };
      enemy.fellBack = true;
      enemy.state = 'FALLBACK_COVER';
    }

    stepActorNavigation(sim, enemy, dt);

    // Honest Visual Perception (AI-02: never tracks hidden targets through solid walls!)
    const potentialTargets = [sim.player, ...sim.allies].filter((t) => t && t.alive && t.state !== 'DOWN');
    let visibleTarget = null;
    let bestTargetScore = -Infinity;

    for (const t of potentialTargets) {
      const dx = t.x - enemy.x;
      const dz = t.z - enemy.z;
      const dist = Math.hypot(dx, dz);
      const maxRange = WEAPON_PROFILES[enemy.weapon]?.range ?? 160;
      if (dist > maxRange) continue;

      const angleToTarget = Math.atan2(dz, dx);
      const angleDiff = Math.abs(normalizeAngleDiff(angleToTarget, enemy.facing));
      // MG34 is constrained to its western aperture arc; riflemen have a 150-degree front visual cone
      const maxHalfCone = enemy.weapon === 'mg34' ? sim.mgState.arcHalfAngle : 1.32;
      if (angleDiff > maxHalfCone) continue;

      const hasLoS = enemy.weapon === 'mg34'
        ? sim.evaluateMgLineOfFire(t).hasVisualLoS
        : sim.world.lineOfSight(enemy, t, { includeFoliage: true });

      if (!hasLoS) continue;

      const score = 180 - dist + (t.id === 'piotr_sokol' ? 15 : 0);
      if (score > bestTargetScore) {
        bestTargetScore = score;
        visibleTarget = t;
      }
    }

    if (visibleTarget) {
      enemy.state = 'ENGAGE_VISIBLE';
      enemy.seeingTargetId = visibleTarget.id;
      enemy.memory = {
        targetId: visibleTarget.id,
        x: Number(visibleTarget.x.toFixed(2)),
        y: Number((visibleTarget.y + (visibleTarget.crouched ? 0.95 : 1.25)).toFixed(2)),
        z: Number(visibleTarget.z.toFixed(2)),
        seenAt: Number(sim.clock.toFixed(2)),
        expiresAt: Number((sim.clock + 6.0).toFixed(2)),
        source: 'visual',
      };
      if (enemy.weapon !== 'mg34') {
        enemy.facing = Math.atan2(visibleTarget.z - enemy.z, visibleTarget.x - enemy.x);
      }

      if (enemy.reloadingUntil <= sim.clock && enemy.mag > 0 && sim.clock >= enemy.nextFireAt && enemy.suppressed < 0.88) {
        const aimPt = {
          x: visibleTarget.x,
          y: visibleTarget.y + (visibleTarget.crouched ? 0.95 : 1.25),
          z: visibleTarget.z,
        };
        sim.fireActorBurst(enemy, visibleTarget, aimPt, 'enemy');
      }
    } else {
      enemy.seeingTargetId = null;
      // If memory is still active, orient toward lastKnownPosition (NEVER current hidden position!) and optionally fire 1 suppressive shot at the opening
      if (enemy.memory && sim.clock < enemy.memory.expiresAt) {
        enemy.state = 'SEARCH_MEMORY';
        if (enemy.weapon !== 'mg34') {
          enemy.facing = Math.atan2(enemy.memory.z - enemy.z, enemy.memory.x - enemy.x);
        }
      } else {
        enemy.memory = null;
        enemy.state = 'HOLD_SECTOR';
      }
    }
  }
}
