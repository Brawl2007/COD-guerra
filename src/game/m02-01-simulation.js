import { Random } from '../core/random.js';
import { EYE_HEIGHT } from '../config.js';
import {
  eyePosition,
  aimDirection,
  muzzlePosition,
  traceShot,
  traceObstruction,
} from '../world/spatial.js';
import { movePlayer, PLAYER_PHYSICS } from '../world/m01-player-physics.js';
import { M01Navigator } from '../world/m01-navigation.js';
import { M02QuintaWorld, BALLISTIC_MATERIAL_POLICY } from '../world/m02-quinta-world.js';
import { M02HorizonDirector, M02_TEMPORAL_STATES } from '../world/m02-horizon-system.js';
import { M02ZoneStreamer } from '../world/m02-zone-streamer.js';
import { Wz29 } from './wz29.js';
import { M02AudiovisualDirector } from './m02-audiovisual-director.js';
import {
  WEAPON_PROFILES,
  M02_DIALOGUE_CATALOG,
  M02DialogueDirector,
  updatePolishSquad,
  updateGermanGarrison,
} from './m02-combat-ai.js';
import {
  createInitialAreaBState,
  createInitialAreaCState,
  enterAreaBC06 as runEnterAreaBC06,
  damageCartWheel as runDamageCartWheel,
  pickupSupplyVolume as runPickupSupplyVolume,
  deliverSupplyVolume as runDeliverSupplyVolume,
  loseSupplyVolume as runLoseSupplyVolume,
  updateAreaB as runUpdateAreaB,
  completeC07Reorganization as runCompleteC07Reorganization,
  enterAreaCC09 as runEnterAreaCC09,
  unlockC09GateLatch as runUnlockC09GateLatch,
  startC10OrderChanges as runStartC10OrderChanges,
  detonateC10FixedArtillery as runDetonateC10FixedArtillery,
  startC11LisAndLastGroup as runStartC11LisAndLastGroup,
  assistLisInC11 as runAssistLisInC11,
  updateAreaC as runUpdateAreaC,
  completeC12Epilogue as runCompleteC12Epilogue,
  exportCampaignResultToM03 as runExportCampaignResultToM03,
  syncAreaCWorldDamage,
} from './m02-acts-director.js';

const WALK_SPEED = 4.2;
const SPRINT_SPEED = 6.1;
const CROUCH_SPEED = 2.55;
const DOOR_INTERACT_RANGE = 2.2;
const CHALK_INTERACT_RANGE = 4.5;

const TARGET_TO_ENEMY_SYNC = Object.freeze({
  tgt_b02_mg_gunner: 'DE-A05',
  tgt_b01_kitchen_window: 'DE-A07',
  tgt_b01_hall_door: 'DE-A08',
});

export function validateM02Snapshot(snap) {
  if (!snap || (snap.schema !== 'm02-01-bench-snapshot-v1' && snap.schema !== 'm02-02-snapshot-v2')) {
    return { valid: false, reason: 'Schema de snapshot M02 inválido.' };
  }
  if (snap.rngState !== undefined && (!Number.isInteger(snap.rngState) || snap.rngState<0 || snap.rngState>0xffffffff)) return {valid:false,reason:'Estado aleatório inválido.'};
  if (snap.worldRevision !== undefined && (!Number.isInteger(snap.worldRevision)||snap.worldRevision<0)) return {valid:false,reason:'Revisão de mundo inválida.'};
  if (snap.grenadeSeq !== undefined && (!Number.isInteger(snap.grenadeSeq)||snap.grenadeSeq<0)) return {valid:false,reason:'Sequência de granadas inválida.'};
  if (snap.grenades !== undefined && (!Array.isArray(snap.grenades) || snap.grenades.some(g=>!g||!g.id||!['x','y','z','vx','vy','vz','spawnedAt','fuseAt'].every(k=>Number.isFinite(g[k]))))) return {valid:false,reason:'Granada inválida.'};
  if (snap.doorLocks !== undefined && (!Array.isArray(snap.doorLocks)||snap.doorLocks.some(e=>!Array.isArray(e)||e.length!==2||typeof e[0]!=='string'||!e[1]||typeof e[1].actorId!=='string'||!Number.isFinite(e[1].expiresAt)))) return {valid:false,reason:'Fila de porta inválida.'};
  if (typeof snap.clock !== 'number' || !Number.isFinite(snap.clock) || snap.clock < 0) {
    return { valid: false, reason: 'Clock de snapshot inválido.' };
  }
  if (
    !snap.player ||
    !Number.isFinite(snap.player.x) ||
    !Number.isFinite(snap.player.z) ||
    typeof snap.player.health !== 'number' ||
    snap.player.health < 0 ||
    snap.player.health > 100
  ) {
    return { valid: false, reason: 'Estado do jogador inválido no snapshot.' };
  }
  if (
    !snap.weapon ||
    typeof snap.weapon.mag !== 'number' ||
    snap.weapon.mag < 0 ||
    typeof snap.weapon.reserve !== 'number' ||
    snap.weapon.reserve < 0
  ) {
    return { valid: false, reason: 'Estado de munição da arma inválido no snapshot.' };
  }
  if (!snap.doors || typeof snap.doors !== 'object') {
    return { valid: false, reason: 'Mapa de portas ausente no snapshot.' };
  }
  for (const [, state] of Object.entries(snap.doors)) {
    if (!['open', 'closed', 'destroyed'].includes(state)) {
      return { valid: false, reason: `Estado de porta inválido: ${state}` };
    }
  }
  if (!snap.windows || typeof snap.windows !== 'object') {
    return { valid: false, reason: 'Mapa de janelas ausente no snapshot.' };
  }
  for (const [, state] of Object.entries(snap.windows)) {
    if (!['open', 'intact', 'broken'].includes(state)) {
      return { valid: false, reason: `Estado de janela inválido: ${state}` };
    }
  }
  if (snap.fences) {
    for (const [, state] of Object.entries(snap.fences)) {
      if (!['intact', 'breached'].includes(state)) {
        return { valid: false, reason: `Estado de cerca inválido: ${state}` };
      }
    }
  }
  if (snap.allies) {
    if (!Array.isArray(snap.allies)) return { valid: false, reason: 'Lista de aliados inválida.' };
    for (const a of snap.allies) {
      if (!a.id || !Number.isFinite(a.x) || !Number.isFinite(a.z) || a.mag < 0 || a.reserve < 0) {
        return { valid: false, reason: `Aliado inválido no snapshot: ${a?.id}` };
      }
    }
  }
  if (snap.enemies) {
    if (!Array.isArray(snap.enemies)) return { valid: false, reason: 'Lista de inimigos inválida.' };
    for (const e of snap.enemies) {
      if (!e.id || !Number.isFinite(e.x) || !Number.isFinite(e.z) || e.mag < 0 || e.reserve < 0) {
        return { valid: false, reason: `Inimigo inválido no snapshot: ${e?.id}` };
      }
    }
  }
  for(const actor of [...(snap.allies??[]),...(snap.enemies??[])]){
    const b=actor.burst;
    if(b==null)continue; // Existing checkpoints have no pending-round field.
    const maxRounds=WEAPON_PROFILES[actor.weapon]?.burstCount??1;
    if(!Number.isInteger(actor.burstSequence)||actor.burstSequence<1||
      !Number.isInteger(b.totalRounds)||b.totalRounds<2||b.totalRounds>maxRounds||
      !Number.isInteger(b.remaining)||b.remaining<1||
      !Number.isInteger(b.emitted)||b.emitted<1||b.emitted+b.remaining!==b.totalRounds||actor.mag<b.remaining||
      !Number.isFinite(b.nextAt)||b.nextAt<0||!Number.isFinite(b.cooldownUntil)||b.cooldownUntil<0||
      !b.aimPoint||!['x','y','z'].every(k=>Number.isFinite(b.aimPoint[k]))||
      !['ally','enemy'].includes(b.side)||(b.targetId!==null&&typeof b.targetId!=='string')){
      return {valid:false,reason:`Rajada pendente inválida: ${actor.id}`};
    }
  }
  if (snap.areaB?.supplyCart?.volumes) {
    const seenCarriers = new Set();
    for (const vol of snap.areaB.supplyCart.volumes) {
      if (!vol || !vol.id) {
        return { valid: false, reason: 'Volume da carroça inválido no snapshot.' };
      }
      if (vol.carriedBy) {
        if (vol.carriedBy === vol.id) {
          return { valid: false, reason: `Referência circular carriedBy em ${vol.id}.` };
        }
        if (seenCarriers.has(vol.carriedBy)) {
          return { valid: false, reason: `Portador duplicado (${vol.carriedBy}) para múltiplos volumes.` };
        }
        seenCarriers.add(vol.carriedBy);
      }
    }
  }
  return { valid: true, reason: null };
}

export class M02BenchSimulation {
  constructor(seed = 19390909, { startScene = 'C02' } = {}) {
    this.seed = seed;
    this.defaultStartScene = startScene;
    this.rng = new Random(seed);
    this.world = new M02QuintaWorld();
    this.zoneStreamer = new M02ZoneStreamer('A', this.world);
    this.activeCellId = 'A';
    this.navigator = new M01Navigator(this.world.navWorld).prewarm();
    this.weapon = new Wz29();
    this.dialogue = new M02DialogueDirector();
    this.horizon = new M02HorizonDirector();
    this.audiovisual = new M02AudiovisualDirector();
    this.events = [];
    this.shotLog = [];
    this.combatLog = [];
    this.checkpoints = new Map();
    this.reset(startScene);
  }

  reset(startScene = this.defaultStartScene) {
    this.rng = new Random(this.seed);
    this.clock = 0;
    this.events = [];
    this.shotLog = [];
    this.combatLog = [];
    this.doorLocks = new Map();
    this.dialogue.reset();
    this.horizon.reset();
    this.audiovisual.reset();
    this.grenades = [];
    this.grenadeSeq = 0;
    this.grenadeAmmo = 2;
    this.squadOrder = { type: 'auto', axis: null, issuedAt: 0 };
    this.c01Active = false;
    this.c01StartedAt = 0;
    this.ea1StartedAt = 0;
    this.activeCartela = M02_TEMPORAL_STATES.T0.cartela;
    this.transitionTABPayload = null;
    this.supplies = { waterDelivered: false, ammoDelivered: false };
    this.transitionIdsApplied = [];
    this.totalHostilesSpawned = 10;
    this.areaB = createInitialAreaBState();
    this.areaC = createInitialAreaCState();
    this.c10Active = false;
    this.c11Active = false;
    this.m03ExportPackage = null;

    if (this.activeCellId !== 'A') {
      this.world = this.zoneStreamer.switchToCell('A');
      this.activeCellId = 'A';
      this.navigator = new M01Navigator(this.world.navWorld);
    }

    for (const b of this.world.layout.buildings) {
      for (const d of b.doors ?? []) this.world.doorStates.set(d.id, d.initialState ?? 'closed');
      for (const w of b.windows ?? []) this.world.windowStates.set(w.id, w.glassState ?? 'open');
    }
    for (const c of this.world.layout.exteriorCovers ?? []) {
      if (c.destructibleFence) this.world.fenceStates.set(c.id, 'intact');
    }
    this.world.refresh();
    this.navigator.sync();

    const allCoverNodes = [
      ...(this.world.layout.coverNodes ?? []),
      ...(this.world.layout.c01Corridor?.coverNodes ?? []),
    ];
    this.coverNodesById = new Map(
      allCoverNodes.map((n) => [n.id, { ...n, y: this.world.heightAt(n.x, n.z) }]),
    );

    const start = this.world.layout.start;
    const startY = this.world.heightAt(start.x, start.z);
    this.player = {
      id: 'piotr_sokol',
      name: 'strz. Piotr Sokół',
      space: 'metres',
      x: start.x,
      y: startY,
      z: start.z,
      angle: start.angle ?? Math.PI / 2,
      pitch: start.pitch ?? 0,
      radius: PLAYER_PHYSICS.radius,
      crouched: false,
      aiming: false,
      sprinting: false,
      moving: false,
      alive: true,
      health: 100,
      maxHealth: 100,
      eyeHeight: EYE_HEIGHT,
      suppressed: 0,
      carryingVolumeId: null,
    };

    this.weapon = new Wz29();
    this.weapon.mag = 5;
    this.weapon.reserve = 45;

    this.allies = (this.world.layout.polishSquad ?? []).map((a) => ({
      ...a,
      space: 'metres',
      y: this.world.heightAt(a.x, a.z),
      radius: PLAYER_PHYSICS.radius,
      eyeHeight: EYE_HEIGHT,
      crouched: false,
      moving: false,
      alive: true,
      active: true,
      maxHealth: a.health ?? 100,
      suppressed: 0,
      state: 'ACTIVE',
      tacticalState: 'HoldCover',
      goal: null,
      reachedNodeId: null,
      reloadingUntil: 0,
      nextFireAt: 0.4,
      shotsFired: 0,
      hitsInflicted: 0,
      suppressionsInflicted: 0,
    }));

    this.enemies = (this.world.layout.enemyRosterEA1 ?? []).map((e) => ({
      ...e,
      space: 'metres',
      y: this.world.heightAt(e.x, e.z),
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
    }));

    this.calibrationTargets = (this.world.layout.testTargets ?? []).map((t) => ({
      ...t,
      space: 'metres',
      y: this.world.heightAt(t.x, t.z),
      alive: true,
      active: true,
      health: 100,
      maxHealth: 100,
      crouched: false,
      hitsReceived: 0,
      lastHitPart: null,
    }));

    this.targets = this.calibrationTargets;

    const mg = this.world.layout.mgEmplacement;
    this.mgState = {
      ...mg,
      space: 'metres',
      y: this.world.heightAt(mg.x, mg.z),
      active: true,
      alive: true,
      seeingPlayer: false,
      canHitPlayer: false,
      blockedById: null,
      blockedByMaterial: null,
      burstsFired: 0,
      nextBurstAt: 1.0,
    };

    this.routeProgress = {
      ditchWaypointsVisited: [true, false, false, false, false, false],
      orchardWaypointsVisited: [true, false, false, false, false, false],
      visitedBuildings: { B01: false, B02: false, B03: false, B04: false },
      visitedB01Rooms: {
        cozinha: false,
        despensa: false,
        sala: false,
        quarto_oeste: false,
        quarto_este: false,
      },
      activeRoute: 'none',
    };

    this.flags = {
      'm02.completed': false,
      'm02.axis': null,
      'm02.lis_status': 'active',
      'm02.malek_status': 'fit',
      'm02.wierzba_status': 'fit',
      'm02.pomar_wounded_marked': false,
      'm02.fired_on_wounded': false,
      'm02.supply_reached': 0,
      'm02.corridor_held': false,
      'm02.last_group_survivors': 0,
    };

    this.objective = {
      id: 'O01',
      title: 'Escolher eixo de aproximação (Vala Oeste ou Pomar Leste) e fixar a MG34 em B02',
      status: 'active',
    };

    if (startScene === 'C01') {
      this.startAreaAFullC01({ saveInitialCheckpoint: false });
    }

    this.dialogue.trigger('bz39_c01_01', this);
    this.dialogue.trigger('dlg_m02_001', this);
    this.dialogue.update(this);

    this.updateTacticalContext();
    this.saveCheckpoint('cp_m02_a_preparacao');
  }

  startAreaAFullC01({ saveInitialCheckpoint = true } = {}) {
    if (this.activeCellId !== 'A') {
      this.world = this.zoneStreamer.switchToCell('A');
      this.activeCellId = 'A';
      this.navigator = new M01Navigator(this.world.navWorld);
    }
    const p1 = this.world.layout.c01Corridor?.startP1 ?? { x: 0, z: -175, angle: Math.PI / 2, pitch: 0 };
    this.player.x = p1.x;
    this.player.z = p1.z;
    this.player.y = this.world.heightAt(p1.x, p1.z);
    this.player.angle = p1.angle ?? Math.PI / 2;
    this.player.pitch = p1.pitch ?? 0;
    this.player.crouched = true;
    this.player.eyeHeight = 1.08;

    // Position the 7 Polish squad allies in the P1 preparation trench (around Z = -174..-178)
    for (const ally of this.allies) {
      ally.z = Number((ally.z - 96.0).toFixed(2));
      ally.y = this.world.heightAt(ally.x, ally.z);
      ally.goal = null;
      ally.reachedNodeId = null;
    }

    // Prepend EA0 outpost defenders (DE-A01..DE-A04 at -18, -110) if not already loaded
    const existingIds = new Set(this.enemies.map((e) => e.id));
    const ea0 = (this.world.layout.c01Corridor?.enemyRosterEA0 ?? [])
      .filter((e) => !existingIds.has(e.id))
      .map((e) => ({
        ...e,
        space: 'metres',
        y: this.world.heightAt(e.x, e.z),
        radius: PLAYER_PHYSICS.radius,
        eyeHeight: EYE_HEIGHT,
        crouched: false,
        moving: false,
        alive: true,
        active: true,
        maxHealth: e.health ?? 85,
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
      }));
    this.enemies = [...ea0, ...this.enemies];
    this.totalHostilesSpawned += ea0.length;

    this.c01Active = true;
    this.c01StartedAt = this.clock;
    this.activeCartela = {
      text: M02_TEMPORAL_STATES.T0.cartela,
      expiresAt: this.clock + 8.0,
    };
    this.objective = {
      id: 'O00',
      title: 'C01/EA0: Avançar de P1 (0,-175) e tomar o posto avançado na vala transversal (-18,-110)',
      status: 'active',
    };
    this.updateTacticalContext();
    if (saveInitialCheckpoint) {
      this.saveCheckpoint('cp_m02_a_preparacao');
    }
    return this.objective;
  }

  triggerTransitionTAB({ skip = false } = {}) {
    // NAR-01: Watching vs skipping C05 transition produces identical semantic end state without duplicating ammo/health changes
    this.dialogue.trigger('bz39_c05_01', this);
    const t1 = this.horizon.setTemporalState('T1', this);
    const cartelaText = t1?.cartela ?? 'Acessos de Łęczyca — noite de 9 para 10 de setembro';
    this.activeCartela = {
      text: cartelaText,
      expiresAt: this.clock + 8.0,
    };
    this.flags['m02.completed'] = true;
    this.flags['m02.transicao_tab_pronta'] = true;

    this.transitionTABPayload = {
      transitionId: 'T-AB',
      fromCell: 'A',
      toCell: 'B',
      targetArea: 'AREA_B_LECZYCA',
      temporalState: 'T1',
      cartela: cartelaText,
      playerHealth: this.player.health,
      weapon: {
        mag: this.weapon.mag,
        reserve: this.weapon.reserve,
      },
      grenadeAmmo: this.grenadeAmmo,
      flags: structuredClone(this.flags),
      squadStatuses: Object.fromEntries(
        this.allies.map((a) => [a.id, { alive: a.alive, state: a.state, health: a.health }]),
      ),
    };

    this.objective = {
      id: 'T-AB',
      title: 'C05 (Deslocação A→B concluída): Secção em marcha noturna para os Acessos de Łęczyca (Área B)',
      status: 'completed',
    };
    this.events.push({
      type: 'transition-tab',
      skipped: Boolean(skip),
      payload: structuredClone(this.transitionTABPayload),
      clock: this.clock,
    });
    return this.transitionTABPayload;
  }

  enterAreaBC06(options = {}) {
    return runEnterAreaBC06(this, options);
  }

  damageCartWheel() {
    return runDamageCartWheel(this);
  }

  pickupSupplyVolume(volumeId, carrierId = 'piotr_sokol') {
    return runPickupSupplyVolume(this, volumeId, carrierId);
  }

  deliverSupplyVolume(volumeId) {
    return runDeliverSupplyVolume(this, volumeId);
  }

  loseSupplyVolume(volumeId) {
    return runLoseSupplyVolume(this, volumeId);
  }

  completeC07Reorganization(options = {}) {
    return runCompleteC07Reorganization(this, options);
  }

  enterAreaCC09(options = {}) {
    return runEnterAreaCC09(this, options);
  }

  unlockC09GateLatch() {
    return runUnlockC09GateLatch(this);
  }

  startC10OrderChanges() {
    return runStartC10OrderChanges(this);
  }

  detonateC10FixedArtillery() {
    return runDetonateC10FixedArtillery(this);
  }

  startC11LisAndLastGroup() {
    return runStartC11LisAndLastGroup(this);
  }

  assistLisInC11(mode = 'wounded_evacuated') {
    return runAssistLisInC11(this, mode);
  }

  completeC12Epilogue(options = {}) {
    return runCompleteC12Epilogue(this, options);
  }

  exportCampaignResultToM03() {
    return runExportCampaignResultToM03(this);
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  teleportPlayer(x, z, angle = this.player.angle, pitch = 0) {
    this.player.x = x;
    this.player.z = z;
    this.player.y = this.world.heightAt(x, z);
    this.player.angle = angle;
    this.player.pitch = pitch;
    this.player.fall = null;
    this.updateTacticalContext();
    return { x: this.player.x, y: this.player.y, z: this.player.z, angle: this.player.angle };
  }

  issueSquadOrder(type, axis = null) {
    const valid = ['auto', 'suppress', 'advance', 'flank_east'];
    if (!valid.includes(type)) return null;
    const resolvedAxis = axis ?? (type === 'flank_east' ? 'orchard' : this.flags['m02.axis'] ?? 'ditch');
    this.squadOrder = {
      type,
      axis: resolvedAxis,
      issuedAt: Number(this.clock.toFixed(2)),
    };
    if (!this.flags['m02.axis'] && (resolvedAxis === 'ditch' || resolvedAxis === 'orchard')) {
      this.flags['m02.axis'] = resolvedAxis;
    }
    if (type === 'suppress') {
      this.dialogue.trigger('bz39_c02_01', this);
    } else if (type === 'advance') {
      this.dialogue.trigger('bz39_c03_01', this);
    } else if (type === 'flank_east') {
      this.dialogue.trigger('bz39_c02_01', this);
    }
    this.events.push({ type: 'squad-order', order: this.squadOrder, clock: this.clock });
    return this.squadOrder;
  }

  currentDoorPrompt() {
    const dir = aimDirection(this.player.angle, 0);
    const door = this.world.nearestInteractableDoor(this.player, DOOR_INTERACT_RANGE, dir);
    if (!door) return null;
    const actionLabel = door.state === 'open' ? 'Fechar' : 'Abrir';
    return {
      doorId: door.id,
      state: door.state,
      distance: Number(door.distance.toFixed(2)),
      prompt: `[E] ${actionLabel} ${door.label}`,
    };
  }

  currentChalkPrompt() {
    const wounded = this.enemies.find((e) => e.c04Candidate && e.alive && e.state === 'WOUNDED_UNARMED');
    if (!wounded || wounded.chalkMarked || this.flags['m02.pomar_wounded_marked']) return null;
    const dist = Math.hypot(wounded.x - this.player.x, wounded.z - this.player.z);
    if (dist > CHALK_INTERACT_RANGE) return null;
    return {
      actorId: wounded.id,
      distance: Number(dist.toFixed(2)),
      prompt: '[E] Marcar poste com giz branco (Sinalizar ferido para socorro)',
    };
  }

  markWoundedSoldierWithChalk() {
    const wounded = this.enemies.find((e) => e.c04Candidate && e.alive);
    if (!wounded) return null;
    if (wounded.state !== 'WOUNDED_UNARMED') {
      wounded.state = 'WOUNDED_UNARMED';
      wounded.nonCombatant = true;
      wounded.crouched = true;
      wounded.eyeHeight = 1.08;
    }
    wounded.chalkMarked = true;
    this.flags['m02.pomar_wounded_marked'] = true;
    this.dialogue.trigger('bz39_c04_02', this);
    this.dialogue.trigger('bz39_c04_03', this);
    const evt = {
      type: 'c04-wounded-marked',
      actorId: wounded.id,
      clock: Number(this.clock.toFixed(2)),
    };
    this.combatLog.push(evt);
    this.events.push(evt);
    this.updateTacticalContext();
    return evt;
  }

  interactDoor(explicitDoorId = null) {
    if (!explicitDoorId) {
      const chalkPrompt = this.currentChalkPrompt();
      if (chalkPrompt) {
        return this.markWoundedSoldierWithChalk();
      }
    }
    let targetDoorId = explicitDoorId;
    if (!targetDoorId) {
      const prompt = this.currentDoorPrompt();
      if (!prompt) return null;
      targetDoorId = prompt.doorId;
    }
    const nextState = this.world.toggleDoor(targetDoorId);
    const evt = {
      type: 'door-toggled',
      doorId: targetDoorId,
      state: nextState,
      clock: this.clock,
    };
    this.events.push(evt);
    this.updateTacticalContext();
    return evt;
  }

  syncCalibrationAndEnemies() {
    for (const [tgtId, enemyId] of Object.entries(TARGET_TO_ENEMY_SYNC)) {
      const tgt = this.calibrationTargets.find((t) => t.id === tgtId);
      const en = this.enemies.find((e) => e.id === enemyId);
      if (!tgt || !en) continue;
      if (!tgt.alive && en.alive) {
        en.alive = false;
        en.health = 0;
        en.state = 'DEAD';
      } else if (!en.alive && tgt.alive) {
        tgt.alive = false;
        tgt.health = 0;
      }
    }
  }

  evaluateMgLineOfFire(targetActor = this.player) {
    if(this.activeCellId!=='A'||this.c01Active)return {mgActive:false,inArc:false,hasVisualLoS:false,canHitTarget:false,blockedById:'inactive_b02',blockedByMaterial:null,distance:0};
    this.syncCalibrationAndEnemies();
    const mg = this.mgState;
    const mgTarget = this.calibrationTargets.find((t) => t.id === 'tgt_b02_mg_gunner');
    const mgEnemy = this.enemies.find((e) => e.id === 'DE-A05');
    if ((mgTarget && !mgTarget.alive) || (mgEnemy && (!mgEnemy.alive || mgEnemy.nonCombatant))) {
      return {
        mgActive: false,
        inArc: false,
        hasVisualLoS: false,
        canHitTarget: false,
        blockedById: 'mg_neutralized',
        blockedByMaterial: null,
        distance: 0,
      };
    }

    // Muzzle positioned at the western MG aperture of Barn B02 (x=11.82, y=1.42, z=-30.0)
    const muzzle = { x: 11.82, y: 1.42, z: -30.0 };
    const targetEye = eyePosition(targetActor);
    const dx = targetEye.x - muzzle.x;
    const dy = targetEye.y - muzzle.y;
    const dz = targetEye.z - muzzle.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 1e-6 || dist > mg.range) {
      return {
        mgActive: true,
        inArc: false,
        hasVisualLoS: false,
        canHitTarget: false,
        blockedById: 'out_of_range',
        blockedByMaterial: null,
        distance: dist,
      };
    }

    // Check horizontal firing arc (westward through win_b02_west_mg, facing PI)
    const horizAngle = Math.atan2(dz, dx);
    let angleDiff = Math.abs(horizAngle - mg.facing);
    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
    const inArc = angleDiff <= mg.arcHalfAngle;

    const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
    const obstruction = traceObstruction(this.world, muzzle, dir, Math.max(0, dist - 0.15));
    const hasVisualLoS = inArc && !obstruction && this.world.lineOfSight(
      { x: muzzle.x, y: 0, z: muzzle.z, eyeHeight: muzzle.y, space: 'metres' },
      targetActor,
      { includeFoliage: true },
    );
    const canHitTarget = inArc && !obstruction;

    return {
      mgActive: true,
      inArc,
      hasVisualLoS,
      canHitTarget,
      blockedById: obstruction?.id ?? (inArc ? null : 'outside_mg_arc'),
      blockedByRole: obstruction?.role ?? null,
      blockedByMaterial: obstruction?.material ?? null,
      distance: Number(dist.toFixed(2)),
    };
  }

  alertEnemiesBySound(shooter, maxDist = 85) {
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.nonCombatant) continue;
      const dist = Math.hypot(enemy.x - shooter.x, enemy.z - shooter.z);
      if (dist > maxDist) continue;
      if (!enemy.seeingTargetId) {
        enemy.memory = {
          targetId: shooter.id,
          x: Number(shooter.x.toFixed(2)),
          y: Number((shooter.y + 1.2).toFixed(2)),
          z: Number(shooter.z.toFixed(2)),
          seenAt: Number(this.clock.toFixed(2)),
          expiresAt: Number((this.clock + 5.5).toFixed(2)),
          source: 'audio',
        };
      }
    }
  }

  fireDirectRay(origin, direction, range = 220, muzzle = null) {
    const normLen = Math.hypot(direction.x, direction.y, direction.z) || 1;
    const dir = {
      x: direction.x / normLen,
      y: direction.y / normLen,
      z: direction.z / normLen,
    };

    const candidateActors =
      this.clock === 0
        ? [...this.calibrationTargets, ...this.enemies]
        : [...this.enemies, ...this.calibrationTargets];

    const hit = traceShot(this.world, origin, dir, candidateActors, range, muzzle);
    let glassBrokenId = null;

    if (hit && hit.kind === 'world' && hit.material === 'glass' && hit.windowId) {
      this.world.setWindowState(hit.windowId, 'broken');
      glassBrokenId = hit.windowId;
    }

    if (hit && hit.kind === 'actor' && hit.actor) {
      const targetActor = hit.actor;
      if (targetActor.nonCombatant || targetActor.state === 'WOUNDED_UNARMED' || targetActor.state === 'SURRENDERED') {
        this.flags['m02.fired_on_wounded'] = true;
        this.dialogue.trigger('bz39_c04_05', this, { allowRepeat: true });
        this.combatLog.push({
          clock: Number(this.clock.toFixed(2)),
          type: 'player_fired_on_wounded',
          actorId: targetActor.id,
        });
      }
      const dmg = Math.round(this.weapon.profile.damage * (hit.multiplier ?? 1));
      targetActor.health = Math.max(0, targetActor.health - dmg);
      targetActor.hitsReceived = (targetActor.hitsReceived ?? 0) + 1;
      targetActor.lastHitPart = hit.part;
      targetActor.suppressed = Math.min(1, (targetActor.suppressed ?? 0) + 0.45);
      if (targetActor.health <= 0) {
        targetActor.alive = false;
        targetActor.state = 'DEAD';
      }
      this.syncCalibrationAndEnemies();
    }

    this.alertEnemiesBySound(this.player, 90);

    const material = hit?.material ?? 'air';
    const policy = BALLISTIC_MATERIAL_POLICY[material] ?? null;

    const record = {
      id: `shot_${this.shotLog.length + 1}`,
      clock: Number(this.clock.toFixed(3)),
      origin: { x: Number(origin.x.toFixed(3)), y: Number(origin.y.toFixed(3)), z: Number(origin.z.toFixed(3)) },
      direction: { x: Number(dir.x.toFixed(4)), y: Number(dir.y.toFixed(4)), z: Number(dir.z.toFixed(4)) },
      hitKind: hit?.kind ?? 'none',
      hitId: hit?.kind === 'actor' ? hit.actor.id : (hit?.id ?? null),
      role: hit?.role ?? (hit?.kind === 'actor' ? 'target_actor' : null),
      part: hit?.part ?? null,
      material,
      materialLabel: policy?.label ?? material,
      blockedBySolid: hit?.kind === 'world',
      hitTarget: hit?.kind === 'actor',
      glassBrokenId,
      distance: hit ? Number(hit.distance.toFixed(3)) : range,
      point: hit?.point
        ? {
            x: Number(hit.point.x.toFixed(3)),
            y: Number(hit.point.y.toFixed(3)),
            z: Number(hit.point.z.toFixed(3)),
          }
        : {
            x: Number((origin.x + dir.x * range).toFixed(3)),
            y: Number((origin.y + dir.y * range).toFixed(3)),
            z: Number((origin.z + dir.z * range).toFixed(3)),
          },
    };

    this.shotLog.push(record);
    this.events.push({ type: 'shot-fired', shot: record });
    this.updateTacticalContext();
    return record;
  }

  fireActorBurst(shooter, targetActor, aimPoint, side, {continuation=false}={}) {
    const prof = WEAPON_PROFILES[shooter.weapon] ?? WEAPON_PROFILES.wz29;
    if(!continuation&&shooter.burst)return null;
    const pending=continuation?shooter.burst:null;
    const planned=pending?.totalRounds??Math.min(shooter.mag,prof.burstCount??1);
    const roundsToFire = Math.min(shooter.mag,1);
    if (roundsToFire <= 0) return null;

    shooter.mag -= roundsToFire;
    shooter.shotsFired = (shooter.shotsFired ?? 0) + roundsToFire;
    shooter.lastShotAt=this.clock;
    shooter.nextFireAt = pending?.cooldownUntil??Number((this.clock + prof.cycleSec).toFixed(3));
    if(!continuation){
      shooter.burstSequence=(shooter.burstSequence??0)+1;
      if(shooter.id==='DE-A05'){
        this.mgState.burstsFired++;this.mgState.nextBurstAt=shooter.nextFireAt;
      }
    }

    const origin =
      shooter.weapon === 'mg34' && shooter.id === 'DE-A05'
        ? { x: 11.82, y: 1.42, z: -30.0 }
        : eyePosition(shooter);

    const candidateTargets = side === 'ally' ? this.enemies : [this.player, ...this.allies];
    let hitAny = false;

    for (let i = 0; i < roundsToFire; i++) {
      const dx = aimPoint.x - origin.x;
      const dy = aimPoint.y - origin.y;
      const dz = aimPoint.z - origin.z;
      const baseLen = Math.hypot(dx, dy, dz) || 1;
      const spread = prof.spreadRad * (shooter.suppressed > 0.4 ? 1.55 : 1.0);
      const jx = (this.rng.next() - 0.5) * 2 * spread;
      const jy = (this.rng.next() - 0.5) * 1.4 * spread;
      const jz = (this.rng.next() - 0.5) * 2 * spread;
      const rx = dx / baseLen + jx;
      const ry = dy / baseLen + jy;
      const rz = dz / baseLen + jz;
      const rLen = Math.hypot(rx, ry, rz) || 1;
      const dir = { x: rx / rLen, y: ry / rLen, z: rz / rLen };

      const hit = traceShot(this.world, origin, dir, candidateTargets, prof.range);

      if (hit && hit.kind === 'world' && hit.material === 'glass' && hit.windowId) {
        this.world.setWindowState(hit.windowId, 'broken');
      }

      // Apply suppression to intended target when rounds hit or pass near their cover aperture
      if (targetActor && targetActor.alive) {
        targetActor.suppressed = Math.min(1, (targetActor.suppressed ?? 0) + prof.suppressionAdd / planned);
        shooter.suppressionsInflicted = (shooter.suppressionsInflicted ?? 0) + 1;
        this.combatLog.push({
          clock: Number(this.clock.toFixed(2)),
          type: side === 'ally' ? 'ally_suppressed_enemy' : 'enemy_suppressed_ally',
          shooterId: shooter.id,
          targetId: targetActor.id,
          weapon: shooter.weapon,
          suppressed: Number(targetActor.suppressed.toFixed(2)),
        });
      }

      if (hit && hit.kind === 'actor' && hit.actor) {
        hitAny = true;
        const victim = hit.actor;
        const rawDmg = Math.round(prof.damage * (hit.multiplier ?? 1));
        // Essential allies and player in cover take bounded damage so squad progression stays cohesive
        const dmg = side === 'enemy' ? Math.max(6, Math.round(rawDmg * 0.35)) : rawDmg;
        victim.health = Math.max(0, victim.health - dmg);
        victim.hitsReceived = (victim.hitsReceived ?? 0) + 1;
        shooter.hitsInflicted = (shooter.hitsInflicted ?? 0) + 1;

        this.combatLog.push({
          clock: Number(this.clock.toFixed(2)),
          type: side === 'ally' ? 'ally_hit_enemy' : 'enemy_hit_ally',
          shooterId: shooter.id,
          targetId: victim.id,
          weapon: shooter.weapon,
          damage: dmg,
          remainingHealth: victim.health,
        });

        if (side === 'ally' && victim.c04Candidate && victim.health <= 48 && !victim.nonCombatant) {
          victim.health = Math.max(28, victim.health);
          victim.state = 'WOUNDED_UNARMED';
          victim.nonCombatant = true;
          victim.crouched = true;
          victim.eyeHeight = 1.08;
          this.combatLog.push({
            clock: Number(this.clock.toFixed(2)),
            type: 'enemy_wounded_unarmed_c04',
            actorId: victim.id,
            byActorId: shooter.id,
          });
        } else if (victim.health <= 0) {
          if (side === 'enemy' && victim.essential) {
            victim.health = 18;
            victim.suppressed = 1.0;
          } else {
            victim.alive = false;
            victim.state = side === 'ally' ? 'DEAD' : 'DOWN';
            this.combatLog.push({
              clock: Number(this.clock.toFixed(2)),
              type: side === 'ally' ? 'ally_killed_enemy' : 'ally_down',
              shooterId: shooter.id,
              targetId: victim.id,
            });
          }
        }
        this.syncCalibrationAndEnemies();
      }
    }

    if (side === 'ally') {
      this.alertEnemiesBySound(shooter, 85);
    }

    const evt = {
      type: 'actor-burst',
      side,
      shooterId: shooter.id,
      targetId: targetActor?.id ?? null,
      weapon: shooter.weapon,
      rounds: roundsToFire,
      burstId: `${shooter.id}:${shooter.burstSequence}`,
      burstSize: planned,
      roundIndex: pending?.emitted??0,
      interval: prof.burstGapSec,
      hitAny,
      origin,
      target: aimPoint,
      clock: Number(this.clock.toFixed(2)),
    };
    this.events.push(evt);
    if(!continuation&&planned>1){
      shooter.burst={remaining:planned-1,totalRounds:planned,emitted:1,nextAt:this.clock+prof.burstGapSec,cooldownUntil:shooter.nextFireAt,targetId:targetActor?.id??null,aimPoint:{...aimPoint},side};
    }
    return evt;
  }

  advanceActorBurst(shooter){
    const burst=shooter.burst;
    if(!burst)return;
    if(!shooter.alive||shooter.nonCombatant||shooter.suppressed>=.88||shooter.reloadingUntil>this.clock||shooter.mag<=0){shooter.burst=null;return;}
    const candidates=burst.side==='ally'?this.enemies:[this.player,...this.allies];
    const target=candidates.find(a=>a.id===burst.targetId)??null;
    if(target?.nonCombatant){shooter.burst=null;return;}
    // Last observed point, not the hidden target's current coordinates. Every
    // round reuses the existing world/actor ray test at its own simulation tick.
    while(burst.remaining>0&&this.clock+1e-8>=burst.nextAt){
      if(!this.fireActorBurst(shooter,target,burst.aimPoint,burst.side,{continuation:true}))break;
      burst.remaining--;burst.emitted++;
      burst.nextAt=Number((burst.nextAt+(WEAPON_PROFILES[shooter.weapon]?.burstGapSec??0)).toFixed(6));
      if(target?.nonCombatant)break;
    }
    if(burst.remaining<=0||target?.nonCombatant)shooter.burst=null;
  }

  firePlayerWeapon(exactAim = true, bypassCooldown = false) {
    const nowMs = this.clock * 1000;
    if (bypassCooldown && this.weapon.state === 'BOLT_CYCLE') {
      this.weapon.state = 'READY';
      this.weapon.until = 0;
    }
    if (!this.weapon.shoot(nowMs)) return null;

    const eye = eyePosition(this.player);
    const muzzle = muzzlePosition(this.player, this.clock);
    const shotAngles = exactAim
      ? { angle: this.player.angle, pitch: this.player.pitch }
      : this.weapon.shotDirection(
          this.player.angle,
          this.player.pitch,
          this.player.aiming,
          this.player.moving,
          () => this.rng.next(),
        );
    const dir = aimDirection(shotAngles.angle, shotAngles.pitch);
    const rec = this.fireDirectRay(eye, dir, this.weapon.profile.range, muzzle);
    this.audiovisual.onPlayerShotFired(this, rec);
    this.rendererHintLastShot = rec;
    return rec;
  }

  throwGrenade(customOrigin = null, customDir = null) {
    if (!customOrigin && this.grenadeAmmo <= 0) return null;
    if (!customOrigin) this.grenadeAmmo--;

    const eye = customOrigin ?? eyePosition(this.player);
    const rawDir = customDir ?? aimDirection(this.player.angle, this.player.pitch);
    const len = Math.hypot(rawDir.x, rawDir.y, rawDir.z) || 1;
    const dir = { x: rawDir.x / len, y: rawDir.y / len, z: rawDir.z / len };
    const speed = 15.0;

    const g = {
      id: `gren_${++this.grenadeSeq}`,
      x: eye.x + dir.x * 0.45,
      y: eye.y + dir.y * 0.45,
      z: eye.z + dir.z * 0.45,
      vx: dir.x * speed,
      vy: dir.y * speed + 2.8,
      vz: dir.z * speed,
      spawnedAt: Number(this.clock.toFixed(3)),
      fuseAt: Number((this.clock + 2.0).toFixed(3)),
      exploded: false,
    };
    this.grenades.push(g);
    this.events.push({ type: 'grenade-thrown', grenade: { ...g }, clock: this.clock });
    return g;
  }

  detonateGrenadeAt(x, y, z, radius = 6.5) {
    const center = { x, y: Math.max(this.world.heightAt(x, z) + 0.35, y), z };
    const worldChanges = this.world.applyExplosionDamageToWorld(center, Math.min(radius, 5.5));
    this.navigator.sync();

    const affectedActors = [];
    const allActors = [this.player, ...this.allies, ...this.enemies];
    for (const actor of allActors) {
      if (!actor || !actor.alive) continue;
      const targetPt = { x: actor.x, y: actor.y + 0.95, z: actor.z };
      const dx = targetPt.x - center.x;
      const dy = targetPt.y - center.y;
      const dz = targetPt.z - center.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > radius) continue;

      let blockedByWall = false;
      if (dist > 0.2) {
        const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
        const obs = traceObstruction(this.world, center, dir, dist - 0.15);
        if (obs && ['brick', 'stone', 'earth', 'wood_thick'].includes(obs.material)) {
          blockedByWall = true;
        }
      }

      if (blockedByWall) {
        actor.suppressed = Math.min(1, (actor.suppressed ?? 0) + 0.25);
        affectedActors.push({ id: actor.id, blockedByWall: true, damage: 0 });
      } else {
        const rawDamage = Math.round(125 * (1 - dist / radius));
        const damage = actor.id === 'piotr_sokol' ? Math.round(rawDamage * 0.5) : rawDamage;
        actor.health = Math.max(0, actor.health - damage);
        actor.suppressed = Math.min(1, (actor.suppressed ?? 0) + 0.92);
        if (actor.c04Candidate && actor.health <= 48) {
          actor.health = Math.max(25, actor.health);
          actor.state = 'WOUNDED_UNARMED';
          actor.nonCombatant = true;
          actor.crouched = true;
        } else if (actor.health <= 0) {
          if (actor.essential) {
            actor.health = 20;
          } else {
            actor.alive = false;
            actor.state = 'DEAD';
          }
        }
        affectedActors.push({ id: actor.id, blockedByWall: false, damage, alive: actor.alive });
      }
    }

    this.syncCalibrationAndEnemies();
    if(this.activeCellId==='B'&&this.areaB?.supplyCart){
      const cart=this.areaB.supplyCart,dx=cart.x-center.x,dz=cart.z-center.z,distance=Math.hypot(dx,dz);
      const blocked=distance>.2&&traceObstruction(this.world,center,{x:dx/distance,y:0,z:dz/distance},Math.max(0,distance-.2));
      if(!blocked&&distance<radius*.75)this.damageCartWheel();
      for(const volume of cart.volumes){
        if(volume.delivered||volume.lost)continue;
        const vx=volume.x-center.x,vz=volume.z-center.z,reach=Math.hypot(vx,vz);
        const occluded=reach>.2&&traceObstruction(this.world,center,{x:vx/reach,y:0,z:vz/reach},Math.max(0,reach-.2));
        if(!occluded&&reach<radius*.35)this.loseSupplyVolume(volume.id);
      }
    }

    const blastRecord = {
      type: 'grenade-exploded',
      center,
      radius,
      worldChanges,
      affectedActors,
      clock: Number(this.clock.toFixed(2)),
    };
    this.audiovisual.onExplosionDetonated(this, blastRecord);
    this.combatLog.push(blastRecord);
    this.events.push(blastRecord);
    this.updateTacticalContext();
    return blastRecord;
  }

  updateGrenades(dt) {
    for (const g of this.grenades) {
      if (g.exploded) continue;
      const nx = g.x + g.vx * dt;
      const ny = g.y + g.vy * dt;
      const nz = g.z + g.vz * dt;
      const stepDist = Math.hypot(nx - g.x, ny - g.y, nz - g.z);
      if (stepDist > 1e-5) {
        const dir = { x: (nx - g.x) / stepDist, y: (ny - g.y) / stepDist, z: (nz - g.z) / stepDist };
        const obs = traceObstruction(this.world, { x: g.x, y: g.y, z: g.z }, dir, stepDist);
        if (obs) {
          g.vx *= -0.32;
          g.vz *= -0.32;
        } else {
          g.x = nx;
          g.z = nz;
        }
      }
      const floorY = this.world.heightAt(g.x, g.z) + 0.08;
      if (ny <= floorY) {
        g.y = floorY;
        g.vy = Math.abs(g.vy) * 0.25;
        g.vx *= 0.65;
        g.vz *= 0.65;
      } else {
        g.y = ny;
        g.vy -= 9.81 * dt;
      }

      if (this.clock >= g.fuseAt) {
        g.exploded = true;
        this.detonateGrenadeAt(g.x, g.y, g.z);
      }
    }
    this.grenades = this.grenades.filter((g) => !g.exploded);
  }

  updateTacticalContext() {
    const px = this.player.x;
    const pz = this.player.z;

    const ditchRoute = this.world.layout.routes.ditch;
    ditchRoute.forEach(([wx, wz], idx) => {
      if (Math.hypot(px - wx, pz - wz) <= 4.2) {
        this.routeProgress.ditchWaypointsVisited[idx] = true;
        if (idx >= 1 && idx <= 3) {
          this.routeProgress.activeRoute = 'ditch';
          if (!this.flags['m02.axis']) this.flags['m02.axis'] = 'ditch';
        }
      }
    });

    const orchardRoute = this.world.layout.routes.orchard;
    orchardRoute.forEach(([wx, wz], idx) => {
      if (Math.hypot(px - wx, pz - wz) <= 4.5) {
        this.routeProgress.orchardWaypointsVisited[idx] = true;
        if (idx >= 1 && idx <= 4) {
          this.routeProgress.activeRoute = 'orchard';
          if (!this.flags['m02.axis']) this.flags['m02.axis'] = 'orchard';
        }
      }
    });

    for (const b of this.world.layout.buildings) {
      const [minX, maxX, minZ, maxZ] = b.bounds;
      if (px > minX + 0.3 && px < maxX - 0.3 && pz > minZ + 0.3 && pz < maxZ - 0.3) {
        this.routeProgress.visitedBuildings[b.id] = true;
        if (b.id === 'B01') {
          const u = px - minX;
          const v = pz - minZ;
          for (const room of b.rooms ?? []) {
            if (u >= room.u0 && u <= room.u0 + room.w && v >= room.v0 && v <= room.v0 + room.d) {
              this.routeProgress.visitedB01Rooms[room.id] = true;
            }
          }
        }
      }
    }

    // Update campaign squad health flags
    const malek = this.allies.find((a) => a.id === 'pl_malek');
    if (malek) {
      this.flags['m02.malek_status'] = !malek.alive || malek.state === 'DOWN' ? 'down' : malek.health < 70 ? 'shaken' : 'fit';
    }
    const wierzba = this.allies.find((a) => a.id === 'pl_wierzba');
    if (wierzba) {
      this.flags['m02.wierzba_status'] = !wierzba.alive || wierzba.state === 'DOWN' ? 'down' : wierzba.health < 65 ? 'wounded' : 'fit';
    }

    const mgStatus = this.evaluateMgLineOfFire(this.player);
    this.mgState.seeingPlayer = mgStatus.hasVisualLoS;
    this.mgState.canHitPlayer = mgStatus.canHitTarget;
    this.mgState.blockedById = mgStatus.blockedById;
    this.mgState.blockedByMaterial = mgStatus.blockedByMaterial;

    if (this.activeCellId !== 'A') {
      return;
    }

    // Check if C01/EA0 outpost (DE-A01..DE-A04) is active and whether it has been cleared
    if (this.c01Active) {
      const activeEa0 = this.enemies.filter((e) => e.encounterId === 'EA0' && e.alive && !e.nonCombatant);
      if (activeEa0.length === 0) {
        this.c01Active = false;
        this.ea1StartedAt = this.clock;
        this.flags['m02.prep_avanco_ok'] = true;
        this.flags['m02.ea0_posto_cleared'] = true;
        this.dialogue.trigger('bz39_c02_01', this);
        this.combatLog.push({
          clock: Number(this.clock.toFixed(2)),
          type: 'ea0_outpost_cleared',
        });
        this.saveCheckpoint('cp_m02_a_preparacao');
      } else {
        this.objective.id = 'O00';
        this.objective.title = `C01/EA0: Tomar o posto avançado na vala transversal (-18,-110) (${activeEa0.length}/4 ativos)`;
        this.objective.status = 'active';
        return;
      }
    }

    if (this.objective.id === 'T-AB') {
      return;
    }

    const mgEnemy = this.enemies.find((e) => e.id === 'DE-A05');
    const mgNeutralized = !mgEnemy || !mgEnemy.alive || mgEnemy.nonCombatant;
    const activeCombatDefenders = this.enemies.filter((e) => e.encounterId !== 'EA0' && e.alive && !e.nonCombatant);
    const b01DefendersDown = this.enemies
      .filter((e) => e.buildingId === 'B01')
      .every((e) => !e.alive || e.nonCombatant);
    const woundedOrchard = this.enemies.find((e) => e.c04Candidate);

    // Trigger C04 dialogue when player approaches wounded soldier in southern orchard
    if (woundedOrchard && woundedOrchard.alive && woundedOrchard.state === 'WOUNDED_UNARMED') {
      const dWounded = Math.hypot(woundedOrchard.x - px, woundedOrchard.z - pz);
      if (dWounded <= 8.5) {
        this.dialogue.trigger('bz39_c04_04', this);
        this.dialogue.trigger('bz39_c04_01', this);
        this.dialogue.trigger('bz39_c04_02', this);
        this.dialogue.trigger('bz39_c04_03', this);
      }
    }

    // State-driven objective progression (O01 -> O02 -> O03 -> C04 -> COMPLETE, zero artificial timers!)
    if (
      activeCombatDefenders.length === 0 &&
      (this.flags['m02.pomar_wounded_marked'] ||
        this.flags['m02.fired_on_wounded'] ||
        (woundedOrchard && !woundedOrchard.alive) ||
        pz >= 44)
    ) {
      this.objective.id = 'COMPLETE';
      this.objective.title = 'Quinta consolidada — Secção pronta para avançar rumo a Łęczyca (M02-B)';
      this.objective.status = 'completed';
      this.flags['m02.completed'] = true;
      this.dialogue.trigger('bz39_c05_01', this);
      if (!this.checkpoints.has('cp_m02_b_acesso')) {
        this.saveCheckpoint('cp_m02_b_acesso');
      }
    } else if (activeCombatDefenders.length === 0) {
      if (this.objective.id !== 'C04') {
        this.dialogue.trigger('bz39_c03_04', this);
        if (!this.checkpoints.has('cp_m02_b_acesso')) {
          this.saveCheckpoint('cp_m02_b_acesso');
        }
      }
      this.objective.id = 'C04';
      this.objective.title = 'C04 (Pomar Sul): Reagrupar junto ao poço/pomar e sinalizar o ferido [E]';
      this.objective.status = 'active';
    } else if (mgNeutralized || b01DefendersDown) {
      this.objective.id = 'O03';
      this.objective.title = `Consolidar o pátio da quinta e neutralizar a guarnição restante (${activeCombatDefenders.length} ativos)`;
      this.objective.status = 'active';
    } else if (
      this.routeProgress.activeRoute !== 'none' ||
      this.routeProgress.visitedBuildings.B01 ||
      pz > -62 ||
      this.allies.some((a) => a.z > -62)
    ) {
      this.objective.id = 'O02';
      this.objective.title =
        this.routeProgress.activeRoute === 'orchard'
          ? 'Rota B (Pomar): Flanquear pelo Estábulo B03 e silenciar a MG34 no Celeiro B02'
          : 'Rota A (Vala): Tomar a Casa B01 e flanquear a posição MG34 no Celeiro B02';
      this.objective.status = 'active';
    } else {
      this.objective.id = 'O01';
      this.objective.title = 'Escolher eixo de aproximação (Vala Oeste ou Pomar Leste) e fixar a MG34 em B02';
      this.objective.status = 'active';
    }
  }

  tick(dt, controls = {}) {
    if (dt <= 0) return;
    this.clock += dt;
    const nowMs = this.clock * 1000;

    if (controls.lookX) this.player.angle += controls.lookX;
    if (controls.lookY) {
      this.player.pitch = Math.max(-1.35, Math.min(1.35, this.player.pitch - controls.lookY));
    }

    if (controls.crouch) {
      this.player.crouched = !this.player.crouched;
      this.player.eyeHeight = this.player.crouched ? 1.08 : EYE_HEIGHT;
    }

    this.player.aiming = Boolean(controls.aim);
    const forward = controls.forward ?? 0;
    const side = controls.side ?? 0;
    const inputLen = Math.hypot(forward, side);
    this.player.moving = inputLen > 1e-3;
    this.player.sprinting =
      Boolean(controls.sprint) && !this.player.crouched && !this.player.aiming && forward > 0.1;

    if (this.player.moving) {
      const nf = forward / Math.max(1, inputLen);
      const ns = side / Math.max(1, inputLen);
      const speed = this.player.crouched
        ? CROUCH_SPEED
        : this.player.sprinting
          ? SPRINT_SPEED
          : WALK_SPEED;
      const cos = Math.cos(this.player.angle);
      const sin = Math.sin(this.player.angle);
      const dx = (cos * nf - sin * ns) * speed * dt;
      const dz = (sin * nf + cos * ns) * speed * dt;
      const landing = movePlayer(this.world, this.player, dx, dz, dt);
      if (landing && landing.damage > 0) {
        this.player.health = Math.max(0, this.player.health - landing.damage);
        this.events.push({ type: 'player-landing', ...landing, clock: this.clock });
      }
    } else if (this.player.fall) {
      movePlayer(this.world, this.player, 0, 0, dt);
    }

    this.weapon.update(nowMs);
    if (controls.reload) this.weapon.reload(nowMs);
    if (controls.sight) this.weapon.adjustSight();
    if (controls.interact) this.interactDoor();
    if (controls.fire) this.firePlayerWeapon(false);
    if (controls.grenade) this.throwGrenade();
    if (controls.orderSuppress) this.issueSquadOrder('suppress');
    if (controls.orderAdvance) this.issueSquadOrder('advance');
    if (controls.orderFlank) this.issueSquadOrder('flank_east');

    this.updateGrenades(dt);
    updatePolishSquad(this, dt);
    updateGermanGarrison(this, dt);
    if (this.activeCellId === 'B') {
      runUpdateAreaB(this, dt);
    } else if (this.activeCellId === 'C') {
      runUpdateAreaC(this, dt);
    }
    this.horizon.update(this, dt);
    this.dialogue.update(this);
    this.audiovisual.update(this, dt);
    this.updateTacticalContext();

    // Suppression and firing now come from actual rounds. The former parallel
    // B02 calibration emitter could also play while that gun was inactive.
    this.player.suppressed = Math.max(0, this.player.suppressed - dt * 0.25);
  }

  saveCheckpoint(checkpointId) {
    const snap = this.snapshot();
    snap.checkpointId = checkpointId;
    this.checkpoints.set(checkpointId, snap);
    this.events.push({ type: 'checkpoint-saved', checkpointId, clock: this.clock });
    return snap;
  }

  restoreCheckpoint(checkpointId) {
    const snap = this.checkpoints.get(checkpointId);
    if (!snap) throw new Error(`Checkpoint ${checkpointId} não encontrado.`);
    this.restoreSnapshot(snap);
    return snap;
  }

  snapshot() {
    return {
      schema: 'm02-01-bench-snapshot-v1',
      rngState: this.rng.state,
      worldRevision: this.world.revision,
      grenades: structuredClone(this.grenades),
      grenadeSeq: this.grenadeSeq,
      doorLocks: structuredClone([...this.doorLocks]),
      clock: this.clock,
      activeCellId: this.activeCellId,
      player: structuredClone(this.player),
      weapon: this.weapon.snapshot(),
      grenadeAmmo: this.grenadeAmmo,
      c01Active: this.c01Active,
      c01StartedAt: this.c01StartedAt,
      ea1StartedAt: this.ea1StartedAt,
      activeCartela: this.activeCartela,
      transitionTABPayload: this.transitionTABPayload ? structuredClone(this.transitionTABPayload) : null,
      supplies: structuredClone(this.supplies),
      transitionIdsApplied: [...this.transitionIdsApplied],
      totalHostilesSpawned: this.totalHostilesSpawned,
      areaB: structuredClone(this.areaB),
      areaC: structuredClone(this.areaC),
      c10Active: this.c10Active,
      c11Active: this.c11Active,
      m03ExportPackage: this.m03ExportPackage ? structuredClone(this.m03ExportPackage) : null,
      doors: Object.fromEntries(this.world.doorStates.entries()),
      windows: Object.fromEntries(this.world.windowStates.entries()),
      fences: Object.fromEntries(this.world.fenceStates.entries()),
      allies: structuredClone(this.allies),
      enemies: structuredClone(this.enemies),
      targets: structuredClone(this.calibrationTargets),
      mgState: structuredClone(this.mgState),
      routeProgress: structuredClone(this.routeProgress),
      flags: structuredClone(this.flags),
      squadOrder: structuredClone(this.squadOrder),
      dialogue: this.dialogue.snapshot(),
      horizon: this.horizon.snapshot(),
      audiovisual: this.audiovisual.snapshot(),
      objective: structuredClone(this.objective),
    };
  }

  restoreSnapshot(snap) {
    const validation = validateM02Snapshot(snap);
    if (!validation.valid) {
      throw new Error(`Snapshot M02 inválido: ${validation.reason}`);
    }
    this.clock = snap.clock;
    this.rng.state = snap.rngState ?? this.seed;
    this.grenades = structuredClone(snap.grenades ?? []);
    this.grenadeSeq = snap.grenadeSeq ?? 0;
    this.doorLocks = new Map(structuredClone(snap.doorLocks ?? []));
    const targetCellId = snap.activeCellId ?? 'A';
    if (this.activeCellId !== targetCellId) {
      this.world = this.zoneStreamer.switchToCell(targetCellId);
      this.activeCellId = targetCellId;
      this.navigator = new M01Navigator(this.world.navWorld);
    }
    this.player = structuredClone(snap.player);
    this.weapon.restore(structuredClone(snap.weapon));
    this.grenadeAmmo = snap.grenadeAmmo ?? 2;
    this.c01Active = Boolean(snap.c01Active);
    this.c01StartedAt = snap.c01StartedAt ?? 0;
    this.ea1StartedAt = snap.ea1StartedAt ?? 0;
    this.activeCartela = snap.activeCartela ?? M02_TEMPORAL_STATES.T0.cartela;
    this.transitionTABPayload = snap.transitionTABPayload ? structuredClone(snap.transitionTABPayload) : null;
    this.supplies = snap.supplies ? structuredClone(snap.supplies) : { waterDelivered: false, ammoDelivered: false };
    this.transitionIdsApplied = snap.transitionIdsApplied ? [...snap.transitionIdsApplied] : [];
    this.totalHostilesSpawned = snap.totalHostilesSpawned ?? 10;
    this.areaB = snap.areaB ? structuredClone(snap.areaB) : createInitialAreaBState();
    this.areaC = snap.areaC ? structuredClone(snap.areaC) : createInitialAreaCState();
    this.c10Active = Boolean(snap.c10Active);
    this.c11Active = Boolean(snap.c11Active);
    this.m03ExportPackage = snap.m03ExportPackage ? structuredClone(snap.m03ExportPackage) : null;
    for (const [k, v] of Object.entries(snap.doors ?? {})) this.world.doorStates.set(k, v);
    for (const [k, v] of Object.entries(snap.windows ?? {})) this.world.windowStates.set(k, v);
    for (const [k, v] of Object.entries(snap.fences ?? {})) this.world.fenceStates.set(k, v);
    syncAreaCWorldDamage(this);
    this.world.refresh();
    if(snap.worldRevision!==undefined)this.world.revision=snap.worldRevision;
    this.navigator.built=-1;
    this.navigator.sync();
    if (snap.allies) this.allies = structuredClone(snap.allies);
    if (snap.enemies) this.enemies = structuredClone(snap.enemies);
    if (snap.targets) {
      this.calibrationTargets = structuredClone(snap.targets);
      this.targets = this.calibrationTargets;
    }
    this.mgState = structuredClone(snap.mgState);
    this.routeProgress = structuredClone(snap.routeProgress);
    if (snap.flags) this.flags = structuredClone(snap.flags);
    if (snap.squadOrder) this.squadOrder = structuredClone(snap.squadOrder);
    if (snap.dialogue) this.dialogue.restore(snap.dialogue);
    if (snap.horizon) this.horizon.restore(snap.horizon);
    if (snap.audiovisual) this.audiovisual.restore(snap.audiovisual);
    this.objective = structuredClone(snap.objective);
    this.events.push({ type: 'restored', clock: this.clock });
  }

  setAccessibilityOptions(partial = {}) {
    return this.audiovisual.setAccessibilityOptions(partial);
  }
}
