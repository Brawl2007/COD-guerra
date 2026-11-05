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
  M02_DIFFICULTY,
  M02_DIFFICULTY_SIM_DEFAULT,
  M02_ENEMY_HIT_DAMAGE_FACTOR,
  M02_ENEMY_HIT_DAMAGE_MIN,
  M02_F1_TELEGRAPH_GAP_SEC,
  resolveM02Difficulty,
} from './m02-difficulty.js';
import {
  WEAPON_PROFILES,
  M02_DIALOGUE_CATALOG,
  M02DialogueDirector,
  updatePolishSquad,
  updateGermanGarrison,
  roundNoNegZero,
  BLAST_WARNING_SEC,
  BLAST_SOURCES,
  ENEMY_GRENADE_WARNING_SEC,
  ENEMY_GRENADE_RADIUS_M,
  ENEMY_GRENADE_MAX_THROW_M,
  SQUAD_ORDER_TYPES,
  LEGACY_SQUAD_ORDER_TYPES,
  resolveSquadOrder,
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
  dropVolumesOfFallenCarriers,
  createInitialC01Contact,
  CART_IMMOBILIZED_CAUSES,
  CART_PARKED_REASONS,
  LIS_PHASES,
  LIS_OUTCOME_SOURCES,
  M02_SCENE_IDS,
  createInitialScriptState,
  updateScript as runUpdateScript,
  beginC08Briefing as runBeginC08Briefing,
  openC01Contact,
  updateC01Contact as runUpdateC01Contact,
  C01_CONTACT_OPENED_BY,
} from './m02-acts-director.js';
import {
  M02SaveStore,
  M02_MISSION_ID,
  M02_SNAPSHOT_SCHEMA,
  M02_SNAPSHOT_SCHEMA_VERSION,
  M02_LEGACY_SNAPSHOT_SCHEMA_V1,
  M02_RNG_ALGORITHM,
  M02_CELL_IDS,
  M02_LAYOUT_SCHEMA_BY_CELL,
  m02NarrativeStamp,
  m02CellInteractiveIds,
  findNonFiniteNumber,
} from './m02-save-store.js';

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

const WEAPON_STATES = Object.freeze(['READY', 'BOLT_CYCLE', 'RELOAD_CLIP', 'RELOAD_SINGLE']);
const PLAYER_ID = 'piotr_sokol';

/**
 * D1 (PDF p. 16, «Falhas duras»): a missão falha quando Piotr morre. A incapacidade definitiva de uma personagem exigida pelo cânone
 * antes do seu ponto de resolução (também D1) depende da lista de personagens exigidas de K/I e ainda não está implementada.
 * A falha é estado (`sim.missionFailed = {reason, at}`), nunca imunidade oculta: pára o roteiro e os checkpoints (automáticos
 * e manuais) e só se sai dela por uma ação explícita (`restartAfterFailure`, o F9 da bancada).
 */
export const M02_MISSION_FAILURE_REASONS = Object.freeze(['piotr_killed']);
/** Texto de apresentação de cada razão (a bancada só mostra; quem decide a falha é a simulação). */
export const M02_MISSION_FAILURE_TEXT = Object.freeze({
  piotr_killed: 'O strz. Piotr Sokół morreu. A missão falhou.',
});

// FIX-2b (PDF I4/I5): enums e relações que o restauro aceita. Valores tirados do código que os escreve.
const ALLY_STATES = Object.freeze([
  'ACTIVE',
  'DOWN',
  'DEAD',
  'EVACUATED',
  'LIAISON_OUTSIDE_CELL',
  'WOUNDED_LIAISON',
  'EVACUATED_B12',
  'WALKING_SUPPORTED',
  'CARRIED',
  'MISSING',
]);
/** Estados possíveis de um aliado com alive=false: nenhum tem arma ativa («um ator morto não pode voltar a ser dono de arma ativa», I5). */
const ALLY_INCAPACITATED_STATES = Object.freeze(['DOWN', 'DEAD', 'EVACUATED', 'MISSING']);
const ENEMY_STATES = Object.freeze([
  'HOLD_SECTOR',
  'ENGAGE_VISIBLE',
  'SEARCH_MEMORY',
  'SHIFT_COVER',
  'FALLBACK_COVER',
  'ADVANCE_RESERVE',
  'SURRENDERED',
  'WOUNDED_UNARMED',
  'DEAD',
  'DOWN',
]);
/** I4 (p. 34): os três valores finais de m02.lis_status; antes da resolução a flag é nula ('active' é o nulo legado do código). */
const LIS_FINAL_STATUSES = Object.freeze(['wounded_evacuated', 'wounded_walking', 'missing']);
const LIS_PENDING_STATUSES = Object.freeze([null, 'active']);
const CART_STATES = Object.freeze(['WAITING_CLEAR_CORRIDOR', 'MOVING', 'DELIVERED', 'IMMOBILIZED']);
const VOLUME_STATES = Object.freeze(['ON_CART', 'CARRIED', 'DELIVERED', 'LOST', 'DROPPED_READY']);
const OBJECTIVE_STATUSES = Object.freeze(['active', 'completed']);
/** Campos de estado da arma que o save pode repor. O perfil (dano, alcance, recarga) vem sempre do código. */
const WEAPON_STATE_FIELDS = Object.freeze(['mag', 'reserve', 'state', 'until', 'started', 'lastShot', 'shotCount', 'received', 'sight', 'reloadMode']);
const WZ29_PROFILE_ID = new Wz29().profile.id;
const WZ29_MAG_CAPACITY = 5;

/**
 * -0 → 0 em todo o snapshot (no próprio objeto: o snapshot é uma árvore nova). O JSON do armazenamento não representa -0;
 * normalizar aqui faz o restauro a partir da memória e a partir da loja darem exatamente o mesmo estado (FIX-2b).
 */
function normalizeNegativeZero(node) {
  const keys = Array.isArray(node) ? node.keys() : Object.keys(node);
  for (const k of keys) {
    const v = node[k];
    if (Object.is(v, -0)) node[k] = 0;
    else if (v && typeof v === 'object') normalizeNegativeZero(v);
  }
  return node;
}

/** Vida finita em [0, maxHealth]. */
const healthInRange = (a) =>
  typeof a.health === 'number' && typeof a.maxHealth === 'number' && a.maxHealth > 0 && a.health >= 0 && a.health <= a.maxHealth;

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const isUint32 = (v) => Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
const isNonNegativeInteger = (v) => Number.isSafeInteger(v) && v >= 0;

function validateStateMap(map, label, knownIds, allowed) {
  if (!isPlainObject(map)) return `Mapa de ${label} ausente no snapshot.`;
  for (const [id, state] of Object.entries(map)) {
    if (!knownIds.has(id)) return `ID de ${label} inexistente na versão atual do layout: ${id}`;
    if (!allowed.includes(state)) return `Estado de ${label} inválido: ${state}`;
  }
  for (const id of knownIds) {
    if (!(id in map)) return `Estado de ${label} em falta no snapshot: ${id}`;
  }
  return null;
}

/**
 * Fase 1 do restauro (PDF I5): valida tudo antes de tocar no estado vivo — schema e versão, semente e estado do gerador,
 * data narrativa, célula e versão de layout, IDs de portas/janelas/cercas existentes, enums, números finitos, IDs únicos
 * e relações (carriedBy, fechaduras de porta, granadas). Nunca lança; devolve { valid, reason }.
 */
export function validateM02Snapshot(snap) {
  if (!isPlainObject(snap)) {
    return { valid: false, reason: 'Schema de snapshot M02 inválido: snapshot ausente.' };
  }
  if (snap.schema === M02_LEGACY_SNAPSHOT_SCHEMA_V1) {
    return {
      valid: false,
      reason:
        'Schema de snapshot M02 v1 incompatível: não guarda a semente nem o estado do gerador (rng), por isso o restauro ' +
        'não seria determinístico (SAVE-01). Sem migração: os checkpoints v1 só existiam em memória.',
    };
  }
  if (snap.schema !== M02_SNAPSHOT_SCHEMA || snap.schemaVersion !== M02_SNAPSHOT_SCHEMA_VERSION) {
    return { valid: false, reason: `Schema de snapshot M02 inválido: ${snap.schema}@${snap.schemaVersion}.` };
  }
  if (snap.missionId !== M02_MISSION_ID) {
    return { valid: false, reason: `Snapshot de outra missão: ${snap.missionId}.` };
  }
  const nonFinite = findNonFiniteNumber(snap);
  if (nonFinite) return { valid: false, reason: `Número não finito no snapshot: ${nonFinite}` };

  const rng = snap.rng;
  if (!isPlainObject(rng) || rng.algorithm !== M02_RNG_ALGORITHM || !Number.isSafeInteger(rng.seed) || !isUint32(rng.state)) {
    return { valid: false, reason: 'Semente ou estado do gerador (rng) inválido no snapshot.' };
  }
  if (typeof snap.clock !== 'number' || snap.clock < 0) {
    return { valid: false, reason: 'Clock de snapshot inválido.' };
  }
  if (!M02_CELL_IDS.includes(snap.activeCellId)) {
    return { valid: false, reason: `Célula ativa inválida no snapshot: ${snap.activeCellId}` };
  }
  const world = snap.world;
  if (!isPlainObject(world) || world.cellId !== snap.activeCellId || !isNonNegativeInteger(world.revision)) {
    return { valid: false, reason: 'Bloco world do snapshot inválido ou inconsistente com a célula ativa.' };
  }
  if (world.layoutSchema !== M02_LAYOUT_SCHEMA_BY_CELL[snap.activeCellId]) {
    return {
      valid: false,
      reason: `Save incompatível: layout ${world.layoutSchema} da célula ${snap.activeCellId}, atual ${M02_LAYOUT_SCHEMA_BY_CELL[snap.activeCellId]}.`,
    };
  }
  if (!isPlainObject(snap.horizon) || !M02_TEMPORAL_STATES[snap.horizon.temporalState]) {
    return { valid: false, reason: 'Estado temporal do horizonte inválido no snapshot.' };
  }
  const expectedNarrative = m02NarrativeStamp(snap.horizon.temporalState);
  const narrative = snap.narrative;
  if (
    !isPlainObject(narrative) ||
    narrative.temporalState !== expectedNarrative.temporalState ||
    narrative.narrativeDate !== expectedNarrative.narrativeDate ||
    narrative.dayPart !== expectedNarrative.dayPart ||
    narrative.civilTime !== null
  ) {
    return { valid: false, reason: 'Data narrativa do snapshot inconsistente com o estado temporal.' };
  }
  if (snap.checkpointId !== undefined && (typeof snap.checkpointId !== 'string' || !snap.checkpointId)) {
    return { valid: false, reason: 'Identificador de checkpoint inválido no snapshot.' };
  }

  const p = snap.player;
  if (
    !isPlainObject(p) ||
    p.id !== PLAYER_ID ||
    typeof p.x !== 'number' ||
    typeof p.y !== 'number' ||
    typeof p.z !== 'number' ||
    typeof p.angle !== 'number' ||
    typeof p.pitch !== 'number' ||
    typeof p.health !== 'number' ||
    p.health < 0 ||
    p.health > 100 ||
    (p.carryingVolumeId !== null && p.carryingVolumeId !== undefined && typeof p.carryingVolumeId !== 'string')
  ) {
    return { valid: false, reason: 'Estado do jogador inválido no snapshot.' };
  }
  const w = snap.weapon;
  if (
    !isPlainObject(w) ||
    !isNonNegativeInteger(w.mag) ||
    w.mag > WZ29_MAG_CAPACITY ||
    !isNonNegativeInteger(w.reserve) ||
    !WEAPON_STATES.includes(w.state)
  ) {
    return { valid: false, reason: 'Estado de munição da arma inválido no snapshot.' };
  }
  if (w.id !== WZ29_PROFILE_ID) {
    return { valid: false, reason: `Arma do jogador desconhecida no snapshot: ${w.id}` };
  }
  if (
    ['until', 'started', 'lastShot', 'shotCount', 'received', 'sight'].some((k) => typeof w[k] !== 'number') ||
    ![null, 'clip', 'single'].includes(w.reloadMode)
  ) {
    return { valid: false, reason: 'Estado de ciclo/recarga da arma inválido no snapshot.' };
  }
  if (!isNonNegativeInteger(snap.grenadeAmmo)) {
    return { valid: false, reason: 'Contagem de granadas inválida no snapshot.' };
  }

  const ids = m02CellInteractiveIds(snap.activeCellId);
  const doorErr = validateStateMap(snap.doors, 'porta', ids.doors, ['open', 'closed', 'destroyed']);
  if (doorErr) return { valid: false, reason: doorErr };
  const windowErr = validateStateMap(snap.windows, 'janela', ids.windows, ['open', 'intact', 'broken']);
  if (windowErr) return { valid: false, reason: windowErr };
  const fenceErr = validateStateMap(snap.fences, 'cerca', ids.fences, ['intact', 'breached']);
  if (fenceErr) return { valid: false, reason: fenceErr };

  const actorIds = new Set([PLAYER_ID]);
  for (const [list, label] of [
    [snap.allies, 'Aliado'],
    [snap.enemies, 'Inimigo'],
  ]) {
    if (!Array.isArray(list)) return { valid: false, reason: `Lista de ${label.toLowerCase()}s inválida.` };
    for (const a of list) {
      if (
        !isPlainObject(a) ||
        typeof a.id !== 'string' ||
        !a.id ||
        typeof a.x !== 'number' ||
        typeof a.z !== 'number' ||
        a.mag < 0 ||
        a.reserve < 0
      ) {
        return { valid: false, reason: `${label} inválido no snapshot: ${a?.id}` };
      }
      if (actorIds.has(a.id)) return { valid: false, reason: `ID de ator duplicado no snapshot: ${a.id}` };
      actorIds.add(a.id);
      const states = label === 'Aliado' ? ALLY_STATES : ENEMY_STATES;
      if (!states.includes(a.state)) return { valid: false, reason: `Estado de ${label.toLowerCase()} inválido: ${a.id}=${a.state}` };
      if (typeof a.alive !== 'boolean') return { valid: false, reason: `${label} sem estado vivo/morto: ${a.id}` };
      if (!healthInRange(a)) {
        return { valid: false, reason: `Vida fora de [0, máx.] para ${a.id}: ${a.health}/${a.maxHealth}` };
      }
      if (label === 'Aliado' && !a.alive && !ALLY_INCAPACITATED_STATES.includes(a.state)) {
        return { valid: false, reason: `Aliado morto com arma ativa no snapshot: ${a.id} (${a.state})` };
      }
      // D6 (regra F1 da M01): contacto de um atirador com Piotr; só existe em soldado/veterano, instantes finitos ou null.
      if (label === 'Inimigo' && ['aimEngagedAt', 'aimLastAt'].some((k) => k in a && a[k] !== null && !(Number.isFinite(a[k]) && a[k] >= 0))) {
        return { valid: false, reason: `Contacto do inimigo com Piotr inválido no snapshot: ${a.id}` };
      }
    }
  }
  const aliveById = new Map([[PLAYER_ID, p.alive !== false], ...snap.allies.map((a) => [a.id, a.alive])]);
  if (!Array.isArray(snap.targets)) return { valid: false, reason: 'Lista de alvos de calibração inválida.' };

  for (const key of ['mgState', 'routeProgress', 'objective', 'squadOrder', 'dialogue', 'audiovisual', 'supplies']) {
    if (!isPlainObject(snap[key])) return { valid: false, reason: `Bloco ${key} ausente ou inválido no snapshot.` };
  }
  // D4: ordem à secção — `auto`, `cover` ou `advance` (as de versões anteriores, `suppress`/`flank_east`, restauram-se como `auto`).
  const order = snap.squadOrder;
  const orderHasTarget = order.type === 'cover' || order.type === 'advance';
  if (
    !(SQUAD_ORDER_TYPES.includes(order.type) || LEGACY_SQUAD_ORDER_TYPES.includes(order.type)) ||
    (order.issuedAt !== undefined && !(typeof order.issuedAt === 'number' && Number.isFinite(order.issuedAt) && order.issuedAt >= 0)) ||
    (orderHasTarget &&
      (typeof order.nodeId !== 'string' ||
        !order.nodeId ||
        !Number.isFinite(order.x) ||
        !Number.isFinite(order.z) ||
        !isPlainObject(order.assignments) ||
        Object.entries(order.assignments).some(([id, node]) => typeof node !== 'string' || !snap.allies.some((a) => a.id === id))))
  ) {
    return { valid: false, reason: `Ordem à secção inválida no snapshot: ${order.type}` };
  }
  if (!isPlainObject(snap.areaB) || !isPlainObject(snap.areaC)) {
    return { valid: false, reason: 'Estado das áreas B/C ausente no snapshot.' };
  }
  const areaC = snap.areaC;
  const isTimeOrNull = (v) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
  const lisSupportOk = [null, 'wounded_evacuated', 'wounded_walking', 'missing'].includes(areaC.lisSupportMode ?? null);
  if (
    !('lisPhase' in areaC) ||
    ![null, ...LIS_PHASES].includes(areaC.lisPhase) ||
    ![null, ...LIS_OUTCOME_SOURCES].includes(areaC.lisOutcomeSource) ||
    !lisSupportOk ||
    typeof areaC.lisWasIncapacitated !== 'boolean' ||
    !isNonNegativeInteger(areaC.lisRouteIdx) ||
    !isTimeOrNull(areaC.c11StartedAt) ||
    Boolean(areaC.c11Started) !== (areaC.c11StartedAt !== null) ||
    !Array.isArray(areaC.lastGroup) ||
    areaC.lastGroup.some((lg) => typeof lg.evacuated !== 'boolean' || !isTimeOrNull(lg.arrivedAt) || (lg.evacuated && lg.arrivedAt === null))
  ) {
    return {
      valid: false,
      reason: 'Save incompatível: estado de Lis/último grupo da Área C ausente ou inválido (snapshot anterior ao percurso persistente de Lis).',
    };
  }
  if (areaC.lastGroupSummary !== null && areaC.lastGroupSummary !== undefined) {
    const sum = areaC.lastGroupSummary;
    if (!isPlainObject(sum) || !['evacuated', 'inTransit', 'dead'].every((k) => isNonNegativeInteger(sum[k])) || sum.evacuated + sum.inTransit + sum.dead !== areaC.lastGroup.length) {
      return { valid: false, reason: 'Resumo do último grupo (lastGroupSummary) inválido no snapshot.' };
    }
  }
  const sc = snap.script;
  const scIdx = (id) => M02_SCENE_IDS.indexOf(id);
  const finiteTime = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (
    !isPlainObject(sc) ||
    scIdx(sc.sceneId) < 0 ||
    !finiteTime(sc.sceneStartedAt) ||
    sc.sceneStartedAt > snap.clock + 1e-9 ||
    typeof sc.finished !== 'boolean' ||
    !Array.isArray(sc.history) ||
    sc.history.length > M02_SCENE_IDS.length ||
    sc.history.some((h, i) => !isPlainObject(h) || scIdx(h.id) < 0 || !finiteTime(h.startedAt) || !finiteTime(h.endedAt) || h.endedAt < h.startedAt || (i > 0 && scIdx(h.id) <= scIdx(sc.history[i - 1].id))) ||
    (sc.history.length > 0 && scIdx(sc.history.at(-1).id) > scIdx(sc.sceneId)) ||
    (sc.finished && sc.sceneId !== 'C12')
  ) {
    return { valid: false, reason: 'Save incompatível: estado do roteiro (script) ausente ou inválido (snapshot anterior ao roteiro automático).' };
  }
  const c01 = snap.c01Contact;
  const nullOrTime = (v) => v === null || (typeof v === 'number' && v >= 0);
  if (
    !isPlainObject(c01) ||
    typeof c01.opened !== 'boolean' ||
    !nullOrTime(c01.movementStartedAt) ||
    !nullOrTime(c01.contactAt) ||
    !nullOrTime(c01.openedAt) ||
    (c01.contactAt === null) !== (c01.movementStartedAt === null) ||
    (c01.opened ? !C01_CONTACT_OPENED_BY.includes(c01.openedBy) || c01.openedAt === null : c01.openedBy !== null || c01.openedAt !== null)
  ) {
    return {
      valid: false,
      reason: 'Save incompatível: estado de contacto C01 (c01Contact) ausente ou inválido (snapshot anterior ao roteiro automático).',
    };
  }
  // D1: campo aditivo do schema 2 — ausente = missão em curso (null). Presente tem de ser {reason ∈ enum, at ≤ clock}.
  const failed = snap.missionFailed ?? null;
  if (
    failed !== null &&
    (!isPlainObject(failed) || !M02_MISSION_FAILURE_REASONS.includes(failed.reason) || !finiteTime(failed.at) || failed.at > snap.clock + 1e-9)
  ) {
    return { valid: false, reason: 'Estado de falha da missão (missionFailed) inválido no snapshot.' };
  }
  if (!isPlainObject(snap.flags)) return { valid: false, reason: 'Flags de campanha ausentes no snapshot.' };
  for (const [flag, value] of Object.entries(snap.flags)) {
    if (value !== null && !['boolean', 'number', 'string'].includes(typeof value)) {
      return { valid: false, reason: `Flag com tipo inválido: ${flag}` };
    }
  }
  if (![null, 'ditch', 'orchard'].includes(snap.flags['m02.axis'] ?? null)) {
    return { valid: false, reason: `Valor inválido para m02.axis: ${snap.flags['m02.axis']}` };
  }
  const lisStatus = snap.flags['m02.lis_status'] ?? null;
  const lisAllowed = snap.areaC.c12Completed ? LIS_FINAL_STATUSES : [...LIS_PENDING_STATUSES, ...LIS_FINAL_STATUSES];
  if (!lisAllowed.includes(lisStatus)) {
    return { valid: false, reason: `Valor inválido para m02.lis_status: ${lisStatus}` };
  }
  const objective = snap.objective;
  if (typeof objective.id !== 'string' || !objective.id || !OBJECTIVE_STATUSES.includes(objective.status)) {
    return { valid: false, reason: `Objetivo inválido no snapshot: ${objective.id}/${objective.status}` };
  }
  for (const key of ['transitionIdsApplied', 'checkpointsReached']) {
    const list = snap[key];
    if (!Array.isArray(list) || list.some((v) => typeof v !== 'string') || new Set(list).size !== list.length) {
      return { valid: false, reason: `Lista ${key} inválida ou com repetições.` };
    }
  }
  for (const key of ['combatLog', 'shotLog']) {
    if (!Array.isArray(snap[key])) return { valid: false, reason: `Registo ${key} ausente no snapshot.` };
  }

  if (!Array.isArray(snap.grenades) || !isNonNegativeInteger(snap.grenadeSeq)) {
    return { valid: false, reason: 'Granadas em voo ou contador de granadas inválidos no snapshot.' };
  }
  const grenadeIds = new Set();
  for (const g of snap.grenades) {
    if (
      !isPlainObject(g) ||
      typeof g.id !== 'string' ||
      grenadeIds.has(g.id) ||
      g.exploded !== false ||
      ['x', 'y', 'z', 'vx', 'vy', 'vz', 'fuseAt'].some((k) => typeof g[k] !== 'number')
    ) {
      return { valid: false, reason: `Granada em voo inválida no snapshot: ${g?.id}` };
    }
    grenadeIds.add(g.id);
  }

  // D5: explosões perigosas com aviso agendado (campo aditivo do schema 2; ausente = nenhuma).
  const hazards = snap.hazardBlasts ?? [];
  const hazardSeq = snap.hazardBlastSeq ?? 0;
  if (!Array.isArray(hazards) || !isNonNegativeInteger(hazardSeq)) {
    return { valid: false, reason: 'Explosões agendadas (hazardBlasts) ou o seu contador inválidos no snapshot.' };
  }
  const hazardIds = new Set();
  const LEAD_TOLERANCE = 0.02; // arredondamento dos instantes a 2-3 casas
  for (const b of hazards) {
    const lead = isPlainObject(b) ? b.impactAt - b.warnedAt : Number.NaN;
    if (
      !isPlainObject(b) ||
      typeof b.id !== 'string' ||
      !b.id ||
      hazardIds.has(b.id) ||
      !BLAST_SOURCES.includes(b.source) ||
      ['x', 'y', 'z', 'radius', 'warnedAt', 'impactAt', 'warningSec'].some((k) => typeof b[k] !== 'number' || !Number.isFinite(b[k])) ||
      b.radius <= 0 ||
      b.warnedAt < 0 ||
      b.warnedAt > snap.clock + 1e-9 ||
      !(lead >= BLAST_WARNING_SEC.min - LEAD_TOLERANCE && lead <= BLAST_WARNING_SEC.max + LEAD_TOLERANCE) ||
      !(b.warningSec >= BLAST_WARNING_SEC.min && b.warningSec <= BLAST_WARNING_SEC.max) ||
      Math.abs(lead - b.warningSec) > LEAD_TOLERANCE ||
      (b.thrownBy !== null && typeof b.thrownBy !== 'string')
    ) {
      return {
        valid: false,
        reason: `Explosão agendada inválida no snapshot (aviso de ${BLAST_WARNING_SEC.min}-${BLAST_WARNING_SEC.max} s, posição e fonte): ${b?.id}`,
      };
    }
    hazardIds.add(b.id);
  }

  if (!isPlainObject(snap.doorLocks)) return { valid: false, reason: 'Fechaduras de porta ausentes no snapshot.' };
  for (const [doorId, lock] of Object.entries(snap.doorLocks)) {
    if (!ids.doors.has(doorId)) return { valid: false, reason: `Fechadura de porta inexistente: ${doorId}` };
    if (!isPlainObject(lock) || typeof lock.actorId !== 'string' || typeof lock.expiresAt !== 'number') {
      return { valid: false, reason: `Fechadura de porta inválida: ${doorId}` };
    }
  }

  const cart = snap.areaB.supplyCart;
  if (cart !== undefined && (!isPlainObject(cart) || !CART_STATES.includes(cart.state))) {
    return { valid: false, reason: `Estado da carroça inválido no snapshot: ${cart?.state}` };
  }
  if (cart !== undefined) {
    const cause = cart.immobilizedCause ?? null;
    if (typeof cart.shaftBroken !== 'boolean') {
      return { valid: false, reason: 'Save incompatível: a carroça não tem estado do varal (shaftBroken; snapshot anterior ao evento do tiro).' };
    }
    if (
      typeof cart.shaftBroken !== 'boolean' ||
      (cause !== null && !CART_IMMOBILIZED_CAUSES.includes(cause)) ||
      (cart.shaftBroken !== (cause === 'shaft_broken')) ||
      (cause !== null && cart.state !== 'IMMOBILIZED') ||
      (cause === 'parked_fallback' ? !CART_PARKED_REASONS.includes(cart.parkedReason) : (cart.parkedReason ?? null) !== null)
    ) {
      return {
        valid: false,
        reason: `Causa de imobilização da carroça inválida ou incoerente: ${cause} (varal partido ${cart.shaftBroken}, estado ${cart.state}).`,
      };
    }
  }
  const volumes = cart?.volumes;
  if (volumes !== undefined) {
    if (!Array.isArray(volumes)) return { valid: false, reason: 'Volumes da carroça inválidos no snapshot.' };
    const volumeIds = new Set();
    const seenCarriers = new Set();
    for (const vol of volumes) {
      if (!vol || !vol.id || volumeIds.has(vol.id)) {
        return { valid: false, reason: 'Volume da carroça inválido no snapshot.' };
      }
      volumeIds.add(vol.id);
      if (!VOLUME_STATES.includes(vol.state)) {
        return { valid: false, reason: `Estado do volume ${vol.id} inválido: ${vol.state}` };
      }
      if (vol.carriedBy) {
        if (vol.carriedBy === vol.id) {
          return { valid: false, reason: `Referência circular carriedBy em ${vol.id}.` };
        }
        if (seenCarriers.has(vol.carriedBy)) {
          return { valid: false, reason: `Portador duplicado (${vol.carriedBy}) para múltiplos volumes.` };
        }
        if (!aliveById.has(vol.carriedBy)) {
          return { valid: false, reason: `Portador inexistente (${vol.carriedBy}) para ${vol.id}.` };
        }
        if (!aliveById.get(vol.carriedBy)) {
          return { valid: false, reason: `Portador morto (${vol.carriedBy}) para ${vol.id}.` };
        }
        seenCarriers.add(vol.carriedBy);
      }
    }
    const carried = volumes.find((v) => v.carriedBy === PLAYER_ID)?.id ?? null;
    if ((p.carryingVolumeId ?? null) !== carried) {
      return { valid: false, reason: 'Volume transportado pelo jogador inconsistente com a carroça.' };
    }
    const incoherent = volumes.find((v) => (v.state === 'CARRIED') !== Boolean(v.carriedBy));
    if (incoherent) {
      return { valid: false, reason: `Volume ${incoherent.id} incoerente: estado ${incoherent.state} com carriedBy ${incoherent.carriedBy}.` };
    }
  } else if (p.carryingVolumeId) {
    return { valid: false, reason: 'Jogador transporta um volume sem carroça no snapshot.' };
  }
  return { valid: true, reason: null };
}

export class M02BenchSimulation {
  /** Profundidade de tick()/ação atómica em curso: um checkpoint automático pedido lá dentro fica pendente até ao fim. */
  #checkpointBatchDepth = 0;
  /**
   * Checkpoints automáticos atingidos no passo em curso (FIX-2b). São gravados no fim do passo, depois de todos os sistemas,
   * e nunca sobrevivem entre ticks: não entram no snapshot e um passo que falhe a meio descarta-os.
   */
  #pendingCheckpointIds = [];
  /** Último checkpoint gravado nesta sessão com persistência (meta-estado do F9; não é estado de jogo). */
  #lastSessionCheckpointId = null;
  /**
   * D6: perfil de dificuldade (recruta | soldado | veterano, os ids da M01). CONFIGURAÇÃO, não estado de jogo (I5): fora do snapshot,
   * não é reposto por um checkpoint nem por reset(); privado para não contar como estado vivo (como os campos acima).
   */
  #difficultyId = M02_DIFFICULTY_SIM_DEFAULT;
  /** Resultado da última ordem à secção, para a bancada o mostrar (dica de apresentação; não é estado de jogo nem entra no snapshot). */
  #lastOrderFeedback = null;

  /**
   * @param {number} seed
   * @param {object} [options]
   * @param {string} [options.startScene]
   * @param {M02SaveStore} [options.saveStore] loja de checkpoints persistentes (por omissão: localStorage no browser, memória em Node)
   * @param {{getItem:Function,setItem:Function,removeItem:Function}} [options.storage] armazenamento para a loja por omissão
   * @param {string} [options.difficulty] perfil de dificuldade (ids da M01); por omissão `recruta`, a afinação de protótipo
   */
  constructor(seed = 19390909, { startScene = 'C02', saveStore = null, storage = null, difficulty = M02_DIFFICULTY_SIM_DEFAULT } = {}) {
    this.#difficultyId = resolveM02Difficulty(difficulty).id;
    this.saveStore = saveStore ?? new M02SaveStore({ storage, validateSnapshot: validateM02Snapshot });
    this.lastCheckpointPersist = null;
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

  /** Última ordem à secção dada (aceite ou recusada, com o motivo) — só para a bancada mostrar o resultado. */
  get lastOrderFeedback() {
    return this.#lastOrderFeedback ? { ...this.#lastOrderFeedback } : null;
  }

  /** Perfil de dificuldade em vigor (objeto imutável de m02-difficulty.js). */
  get difficulty() {
    return M02_DIFFICULTY[this.#difficultyId];
  }

  /**
   * Muda o perfil de dificuldade (configuração: não toca no estado de jogo, no snapshot nem nos checkpoints). RangeError se o id
   * não é um dos da M01. Devolve o perfil.
   */
  setDifficulty(id) {
    this.#difficultyId = resolveM02Difficulty(id).id;
    return this.difficulty;
  }

  reset(startScene = this.defaultStartScene) {
    this.#pendingCheckpointIds = [];
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
    this.c01Contact = createInitialC01Contact();
    this.script = createInitialScriptState(startScene === 'C01' ? 'C01' : 'C02', 0);
    this.ea1StartedAt = 0;
    this.activeCartela = M02_TEMPORAL_STATES.T0.cartela;
    this.transitionTABPayload = null;
    this.supplies = { waterDelivered: false, ammoDelivered: false };
    this.transitionIdsApplied = [];
    this.checkpointsReached = [];
    this.totalHostilesSpawned = 10;
    this.areaB = createInitialAreaBState();
    this.areaC = createInitialAreaCState();
    this.c10Active = false;
    this.c11Active = false;
    this.m03ExportPackage = null;
    this.missionFailed = null;
    this.hazardBlasts = [];
    this.hazardBlastSeq = 0;

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
    // K3: entrega de munição na vala de C01; Lis responde (só se Małek falou e sem combate)
    this.dialogue.trigger('bz39_c01_02', this);
    this.dialogue.trigger('bz39_c01_03', this);
    this.dialogue.update(this);

    this.updateTacticalContext();
    // O início da missão é reproduzível pela semente e pela cena: fica só no índice em memória. Gravá-lo na loja a cada
    // construção/reset (cada carregamento da página) substituía o último checkpoint do jogador (FIX-2b, P1).
    this.saveCheckpoint('cp_m02_a_preparacao', { persist: false });
  }

  startAreaAFullC01({ saveInitialCheckpoint = true } = {}) {
    if (this.activeCellId !== 'A') {
      this.world = this.zoneStreamer.switchToCell('A');
      this.activeCellId = 'A';
      this.hazardBlasts = []; // D5: as explosões agendadas pertencem ao mundo da célula em que foram avisadas
      this.navigator = new M01Navigator(this.world.navWorld);
    }
    const p1 = this.world.layout.c01Corridor?.startP1 ?? { x: 0, z: -175, angle: Math.PI / 2, pitch: 0 };
    this.player.x = p1.x;
    this.player.z = p1.z;
    this.player.y = this.world.heightAt(p1.x, p1.z);
    this.player.angle = p1.angle ?? Math.PI / 2;
    this.player.pitch = p1.pitch ?? 0;

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
    this.c01Contact = createInitialC01Contact();
    this.script = createInitialScriptState('C01', this.clock);
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
    // m02.completed não é escrito aqui: «só após conclusão transacional» (PDF I4, p. 34), que é C12 (FIX-2b).
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
    return this.#runCheckpointBatch(() => runEnterAreaBC06(this, options));
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

  // Ações compostas de API (teclas/botões da bancada): cada uma é um lote atómico. Um checkpoint automático pedido a meio
  // (cp_m02_d_cobertura_retirada em C10) só é gravado quando a ação inteira acabou, como no fim de tick() (FIX-2c).
  completeC07Reorganization(options = {}) {
    return this.#runCheckpointBatch(() => runCompleteC07Reorganization(this, options));
  }

  beginC08Briefing(options = {}) {
    return this.#runCheckpointBatch(() => runBeginC08Briefing(this, options));
  }

  enterAreaCC09(options = {}) {
    return this.#runCheckpointBatch(() => runEnterAreaCC09(this, options));
  }

  unlockC09GateLatch() {
    return this.#runCheckpointBatch(() => runUnlockC09GateLatch(this));
  }

  startC10OrderChanges() {
    return this.#runCheckpointBatch(() => runStartC10OrderChanges(this));
  }

  detonateC10FixedArtillery() {
    return this.#runCheckpointBatch(() => runDetonateC10FixedArtillery(this));
  }

  startC11LisAndLastGroup() {
    return this.#runCheckpointBatch(() => runStartC11LisAndLastGroup(this));
  }

  assistLisInC11(mode = 'wounded_evacuated') {
    return this.#runCheckpointBatch(() => runAssistLisInC11(this, mode));
  }

  completeC12Epilogue(options = {}) {
    return this.#runCheckpointBatch(() => runCompleteC12Epilogue(this, options));
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

  /**
   * D4 (PDF p. 17): ordens do jogador à secção — só «cobrir aqui» (`cover`) e «avançar para ali» (`advance`); `auto` volta ao plano
   * base de Gruca. `target`: id de um nó de cobertura, `{x, z}` ou null (seleção contextual: a cobertura mais próxima de Piotr / a
   * posição à frente da mira). A ordem é aceite só para uma posição válida e alcançável (ver resolveSquadOrder); senão devolve null
   * e emite `squad-order-rejected` com o motivo. Ordens que já não existem («suprimir», «flank_east») são recusadas.
   */
  issueSquadOrder(type, target = null) {
    const result = resolveSquadOrder(this, type, target);
    const clock = Number(this.clock.toFixed(2));
    if (!result.ok) {
      this.#lastOrderFeedback = { type: String(type), accepted: false, reason: result.reason, clock };
      this.events.push({ type: 'squad-order-rejected', order: String(type), reason: result.reason, clock: this.clock });
      this.combatLog.push({ clock, type: 'squad_order_rejected', order: String(type), reason: result.reason });
      return null;
    }
    this.squadOrder = result.order;
    this.#lastOrderFeedback = { type, accepted: true, reason: null, clock, nodeId: result.order.nodeId ?? null };
    this.events.push({ type: 'squad-order', order: structuredClone(this.squadOrder), clock: this.clock });
    this.combatLog.push({
      clock,
      type: 'squad_order',
      order: type,
      nodeId: result.order.nodeId ?? null,
      assignments: structuredClone(result.order.assignments ?? {}),
    });
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

  /** Volume da carroça largado (varal partido / carroça parada) ao alcance de Piotr, que ainda não carrega nenhum (J2: transporte a pé). */
  currentVolumePrompt() {
    const cart = this.areaB?.supplyCart;
    if (this.activeCellId !== 'B' || !cart || this.player.carryingVolumeId) return null;
    let best = null;
    for (const vol of cart.volumes) {
      if (vol.state !== 'DROPPED_READY' || vol.delivered || vol.lost) continue;
      const d = Math.hypot(vol.x - this.player.x, vol.z - this.player.z);
      if (d <= DOOR_INTERACT_RANGE && (!best || d < best.d)) best = { vol, d };
    }
    if (!best) return null;
    return {
      volumeId: best.vol.id,
      distance: Number(best.d.toFixed(2)),
      prompt: `[E] Pegar o volume de ${best.vol.type === 'water' ? 'água' : 'munição'}`,
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
    if (!explicitDoorId) {
      const volumePrompt = this.currentVolumePrompt();
      if (volumePrompt && runPickupSupplyVolume(this, volumePrompt.volumeId)) {
        const evt = { type: 'supply-volume-picked', volumeId: volumePrompt.volumeId, clock: this.clock };
        this.events.push(evt);
        return evt;
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
          x: roundNoNegZero(shooter.x),
          y: roundNoNegZero(shooter.y + 1.2),
          z: roundNoNegZero(shooter.z),
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
    openC01Contact(this, 'player_shot');

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

  fireActorBurst(shooter, targetActor, aimPoint, side) {
    const prof = WEAPON_PROFILES[shooter.weapon] ?? WEAPON_PROFILES.wz29;
    const roundsToFire = Math.min(shooter.mag, prof.burstCount ?? 1);
    if (roundsToFire <= 0) return null;

    // D6: perfil de dificuldade (configuração). Só o fogo inimigo muda: o ciclo de fogo contra qualquer alvo da secção, a precisão
    // quando o alvo é Piotr, o dano que lhe chega e a regra F1. Em recruta todos os fatores são exatamente 1 e não há regra nova.
    const diff = this.difficulty;
    const enemyFire = side === 'enemy';
    const aimsAtPlayer = enemyFire && targetActor === this.player;
    if (aimsAtPlayer && diff.reactionGraceSec !== null) {
      // F1: o contacto deste atirador com Piotr conta-se desde a sua primeira rajada e quebra-se após um intervalo longo sem lhe disparar.
      const now = Number(this.clock.toFixed(3));
      const idle = shooter.aimLastAt == null || now - shooter.aimLastAt > M02_F1_TELEGRAPH_GAP_SEC;
      if (idle || shooter.aimEngagedAt == null) shooter.aimEngagedAt = now;
      shooter.aimLastAt = now;
    }
    let burstDamageOnPlayer = 0;

    shooter.mag -= roundsToFire;
    shooter.shotsFired = (shooter.shotsFired ?? 0) + roundsToFire;
    shooter.nextFireAt = Number((this.clock + prof.cycleSec * (enemyFire ? diff.cooldownScale : 1)).toFixed(3));

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
      const spread = prof.spreadRad * (shooter.suppressed > 0.4 ? 1.55 : 1.0) * (aimsAtPlayer ? diff.aimErrorScale : 1);
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
        targetActor.suppressed = Math.min(1, (targetActor.suppressed ?? 0) + prof.suppressionAdd / roundsToFire);
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
        let dmg = enemyFire ? Math.max(M02_ENEMY_HIT_DAMAGE_MIN, Math.round(rawDmg * M02_ENEMY_HIT_DAMAGE_FACTOR)) : rawDmg;
        if (enemyFire && victim === this.player) {
          dmg = Math.round(dmg * diff.damageTakenScale);
          // Uma ferida por rajada (M01 `burstWoundCap`): o que passa do teto da rajada já não conta.
          if (diff.burstDamageCap !== null) dmg = Math.max(0, Math.min(dmg, diff.burstDamageCap - burstDamageOnPlayer));
          burstDamageOnPlayer += dmg;
          // F1: o primeiro contacto de um atirador nunca mata; a vida fica em 1 até ele combater Piotr há `reactionGraceSec`.
          if (diff.reactionGraceSec !== null && victim.health - dmg <= 0) {
            const engagedFor = shooter.aimEngagedAt == null ? 0 : this.clock - shooter.aimEngagedAt;
            if (engagedFor < diff.reactionGraceSec) dmg = Math.max(0, victim.health - 1);
          }
        }
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
      hitAny,
      origin,
      target: aimPoint,
      clock: Number(this.clock.toFixed(2)),
    };
    this.events.push(evt);
    return evt;
  }

  /** Ação atómica: um checkpoint atingido por este tiro (último defensor) só é gravado depois do áudio/recuo do disparo. */
  firePlayerWeapon(exactAim = true, bypassCooldown = false) {
    return this.#runCheckpointBatch(() => this.#firePlayerWeapon(exactAim, bypassCooldown));
  }

  #firePlayerWeapon(exactAim, bypassCooldown) {
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

  // Granada do jogador (ou de teste, com origem própria): rastilho de 2 s, sem aviso. As granadas inimigas não passam por aqui:
  // têm o aviso de 5-8 s de D5 (`throwEnemyGrenade`).
  throwGrenade(customOrigin = null, customDir = null) {
    if (!customOrigin && this.grenadeAmmo <= 0) return null;
    if (!customOrigin) {
      this.grenadeAmmo--;
      openC01Contact(this, 'player_grenade');
    }

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

  /**
   * Explosão no mundo. `meta` (só nas explosões perigosas agendadas, D5: artilharia scriptada e granada inimiga) acrescenta ao
   * registo a fonte, o aviso que a anunciou e quem a lançou; sem `meta` o registo é o de sempre (granada do jogador).
   */
  detonateGrenadeAt(x, y, z, radius = 6.5, meta = null) {
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
        // D6: a explosão perigosa de um hostil (agendada, com `meta`) fere Piotr com o dano do perfil; a granada dele não.
        const damageTakenScale = meta && actor.id === 'piotr_sokol' ? this.difficulty.damageTakenScale : 1;
        const damage = actor.id === 'piotr_sokol' ? Math.round(rawDamage * 0.5 * damageTakenScale) : rawDamage;
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
    const blastRecord = {
      type: 'grenade-exploded',
      center,
      radius,
      worldChanges,
      affectedActors,
      clock: Number(this.clock.toFixed(2)),
    };
    if (meta) {
      blastRecord.source = meta.source ?? null;
      blastRecord.blastId = meta.blastId ?? null;
      blastRecord.thrownBy = meta.thrownBy ?? null;
      if (meta.warningSkipped) blastRecord.warningSkipped = true;
    }
    this.audiovisual.onExplosionDetonated(this, blastRecord);
    this.combatLog.push(blastRecord);
    this.events.push(blastRecord);
    this.updateTacticalContext();
    return blastRecord;
  }

  /**
   * D5: agenda uma explosão perigosa com aviso. FIXA a posição do impacto no mundo (não se desloca para poupar o jogador nem para
   * o perseguir), limita o aviso à janela [5, 8] s e emite o evento `blast-warning` (posição, raio, instante do aviso e do impacto,
   * fonte e lançador: a causa situada), consumível pelo audiovisual. A explosão fica em `hazardBlasts` até ao impacto.
   * Lança RangeError para fonte desconhecida ou posição/raio inválidos. Devolve uma cópia do registo.
   */
  scheduleBlastWarning({
    source,
    x,
    z,
    y = null,
    radius = ENEMY_GRENADE_RADIUS_M,
    warningSec = ENEMY_GRENADE_WARNING_SEC,
    thrownBy = null,
  }) {
    if (!BLAST_SOURCES.includes(source)) throw new RangeError(`Fonte de explosão desconhecida: ${source}`);
    if (![x, z, radius].every(Number.isFinite) || radius <= 0 || (y !== null && !Number.isFinite(y))) {
      throw new RangeError('Posição ou raio de explosão inválidos.');
    }
    const lead =
      typeof warningSec === 'number' && !Number.isNaN(warningSec)
        ? Math.min(BLAST_WARNING_SEC.max, Math.max(BLAST_WARNING_SEC.min, warningSec))
        : ENEMY_GRENADE_WARNING_SEC;
    const warnedAt = Number(this.clock.toFixed(3));
    const blast = {
      id: `blast_${++this.hazardBlastSeq}`,
      source,
      x: roundNoNegZero(x, 3),
      y: roundNoNegZero(y ?? this.world.heightAt(x, z) + 0.35, 3),
      z: roundNoNegZero(z, 3),
      radius,
      warnedAt,
      impactAt: Number((warnedAt + lead).toFixed(3)),
      warningSec: lead,
      thrownBy,
    };
    this.hazardBlasts.push(blast);
    this.events.push({
      type: 'blast-warning',
      blastId: blast.id,
      source,
      position: { x: blast.x, y: blast.y, z: blast.z },
      radius,
      warnedAt,
      impactAt: blast.impactAt,
      warningSec: lead,
      thrownBy,
      clock: this.clock,
    });
    this.combatLog.push({
      clock: Number(this.clock.toFixed(2)),
      type: 'blast_warning',
      blastId: blast.id,
      source,
      x: blast.x,
      z: blast.z,
      impactAt: blast.impactAt,
      thrownBy,
    });
    return structuredClone(blast);
  }

  /**
   * D5: granada de mão de um hostil (a única via das granadas inimigas). Não há voo simulado: ao lançar, o ponto de impacto
   * (`target.x/z`) fica fixado no mundo e o aviso é o de `scheduleBlastWarning` (por omissão 6,5 s). Só lança um hostil vivo e
   * combatente desta simulação, até ENEMY_GRENADE_MAX_THROW_M do alvo. Devolve o registo agendado ou null.
   */
  throwEnemyGrenade(thrower, target, { warningSec = ENEMY_GRENADE_WARNING_SEC } = {}) {
    const enemy = typeof thrower === 'string' ? this.enemies.find((e) => e.id === thrower) : thrower;
    if (!enemy || !this.enemies.includes(enemy) || !enemy.alive || enemy.nonCombatant) return null;
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return null;
    if (Math.hypot(target.x - enemy.x, target.z - enemy.z) > ENEMY_GRENADE_MAX_THROW_M) return null;
    return this.scheduleBlastWarning({
      source: 'enemy_grenade',
      x: target.x,
      z: target.z,
      radius: ENEMY_GRENADE_RADIUS_M,
      warningSec,
      thrownBy: enemy.id,
    });
  }

  /**
   * D5: impacto das explosões agendadas cuja hora chegou. O impacto fixo de artilharia (SP03) é do diretor da Área C
   * (`detonateC10FixedArtillery`, a que o seu temporizador chama); aqui só rebentam as granadas inimigas.
   */
  #updateHazardBlasts() {
    if (this.hazardBlasts.length === 0) return;
    const due = this.hazardBlasts.filter((b) => b.source === 'enemy_grenade' && this.clock + 1e-9 >= b.impactAt);
    for (const blast of due) {
      // Sai da lista ANTES de explodir (como as granadas em voo): um snapshot tirado durante a explosão nunca guarda uma explodida.
      this.hazardBlasts = this.hazardBlasts.filter((b) => b !== blast);
      this.detonateGrenadeAt(blast.x, blast.y, blast.z, blast.radius, {
        source: blast.source,
        blastId: blast.id,
        thrownBy: blast.thrownBy,
      });
    }
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
        // Sai da lista de granadas em voo ANTES da explosão: um snapshot tirado durante a explosão (o rebentamento mata o
        // último defensor) nunca guarda uma granada explodida, que o validador recusa (FIX-2b). O for…of continua no array
        // antigo e salta as explodidas.
        this.grenades = this.grenades.filter((other) => other !== g);
        this.detonateGrenadeAt(g.x, g.y, g.z);
      }
    }
    this.grenades = this.grenades.filter((g) => !g.exploded);
  }

  /**
   * Reavalia rota, objetivo e flags locais. Os checkpoints semânticos que esta avaliação atinge são pedidos só no fim, depois
   * de o objetivo estar escrito: dentro de tick() ficam pendentes até ao fim do tick; fora dele são gravados aqui (FIX-2b).
   */
  updateTacticalContext() {
    this.#runCheckpointBatch(() => {
      const due = [];
      this.#evaluateTacticalContext(due);
      for (const checkpointId of due) this.requestAutoCheckpoint(checkpointId);
    });
  }

  #evaluateTacticalContext(due) {
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
        due.push('cp_m02_a_preparacao');
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
      // Objetivo local da Área A concluído; a missão não: m02.completed só em C12 (PDF I4, p. 34; FIX-2b).
      this.dialogue.trigger('bz39_c05_01', this);
      if (!this.checkpointReachedOrPending('cp_m02_b_acesso')) due.push('cp_m02_b_acesso');
    } else if (activeCombatDefenders.length === 0) {
      if (this.objective.id !== 'C04') {
        this.dialogue.trigger('bz39_c03_04', this);
      }
      // Pedido aqui, gravado depois de o objetivo C04 abaixo estar escrito (antes ficava gravado com o objetivo anterior).
      // Não só na transição de objetivo: um tick que lançou depois de escrever C04 descartou o pedido (ver
      // #runCheckpointBatch) e a transição já não se repete; assim o tick seguinte volta a pedi-lo, como no caminho COMPLETE (FIX-2c).
      if (!this.checkpointReachedOrPending('cp_m02_b_acesso')) due.push('cp_m02_b_acesso');
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

  /**
   * Um passo da simulação. Os checkpoints automáticos atingidos durante o passo (último defensor por tiro ou granada, C04,
   * posto EA0, C10 na Área C) são gravados no FIM, depois de secção, guarnição, áreas, horizonte, diálogo, audiovisual e
   * bloco MG: o snapshot é o estado entre dois ticks e restaurar + repetir as mesmas entradas reproduz a continuação.
   */
  tick(dt, controls = {}) {
    if (dt <= 0) return;
    this.#runCheckpointBatch(() => this.#step(dt, controls));
  }

  /**
   * D1: falha dura da missão. Piotr morto (saúde a 0 ou `alive` falso: tiro, explosão ou queda) escreve `missionFailed`
   * uma só vez, com o relógio do instante; nunca depois de a missão estar concluída (o epílogo C12 é uma elipse sem combate).
   * Avaliado no fim dos sistemas de combate e ANTES do roteiro: o roteiro não avança no tick em que Piotr morre.
   * Com a missão falhada o roteiro e os checkpoints param (automáticos e manuais); quem hospeda a simulação (a bancada) deve
   * deixar de a avançar e mostrar a falha, mas a simulação não se auto-congela: os testes de mundo continuam a poder andar.
   */
  #evaluateMissionFailure() {
    if (this.missionFailed || this.flags['m02.completed'] || this.areaC?.c12Completed) return;
    const p = this.player;
    if (p.alive !== false && p.health > 0) return;
    const at = Number(this.clock.toFixed(3));
    this.missionFailed = { reason: 'piotr_killed', at };
    const rec = { clock: Number(this.clock.toFixed(2)), type: 'mission_failed', reason: 'piotr_killed' };
    this.combatLog.push(rec);
    this.events.push({ type: 'mission-failed', reason: 'piotr_killed', at, clock: this.clock });
  }

  /**
   * Reinício explícito depois de uma falha dura (D1/I5): carrega o último checkpoint compatível, pela mesma ordem de recurso do
   * F9 (`quickLoadCheckpoint`). Sem falha em curso não faz nada (devolve null). Nunca é chamado pelo tick: sair da falha é
   * uma ação do jogador.
   */
  restartAfterFailure() {
    if (!this.missionFailed) return null;
    const failure = structuredClone(this.missionFailed);
    const loaded = this.quickLoadCheckpoint();
    this.events.push({
      type: 'mission-restarted',
      after: failure,
      checkpointId: loaded.checkpointId,
      source: loaded.source,
      clock: this.clock,
    });
    return loaded;
  }

  /**
   * Pede um checkpoint semântico automático. Dentro de tick()/ação atómica fica pendente e é gravado no fim; fora dela é
   * gravado já (o chamador está num ponto estável entre entradas).
   */
  requestAutoCheckpoint(checkpointId) {
    if (this.missionFailed) return this.#rejectCheckpointOnFailure(checkpointId);
    if (this.#checkpointBatchDepth === 0) return this.saveCheckpoint(checkpointId);
    if (!this.#pendingCheckpointIds.includes(checkpointId)) this.#pendingCheckpointIds.push(checkpointId);
    return null;
  }

  /**
   * Executa uma sequência de chamadas de API como uma só ação atómica: os checkpoints automáticos que ela peça (p. ex.
   * startC10OrderChanges → detonateC10FixedArtillery → assistLisInC11) são gravados todos no fim, com o estado final
   * (FIX-2c). Cada método composto da API já é atómico por si; isto cobre sequências de vários (Digit9 / btn-c10-c11-lis).
   */
  runAtomicAction(fn) {
    return this.#runCheckpointBatch(fn);
  }

  /** Já atingido nesta linha temporal, ou pedido no passo em curso. */
  checkpointReachedOrPending(checkpointId) {
    return this.checkpointsReached.includes(checkpointId) || this.#pendingCheckpointIds.includes(checkpointId);
  }

  #runCheckpointBatch(fn) {
    this.#checkpointBatchDepth++;
    let completed = false;
    try {
      const result = fn();
      completed = true;
      return result;
    } finally {
      this.#checkpointBatchDepth--;
      if (this.#checkpointBatchDepth === 0) {
        const due = this.#pendingCheckpointIds;
        this.#pendingCheckpointIds = [];
        // Um passo que lançou a meio deixou estado incoerente: os pedidos desse passo são descartados, não gravados.
        if (completed) this.#saveCheckpointBatch(due);
      }
    }
  }

  #step(dt, controls) {
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
    if (controls.fire) this.firePlayerWeapon(true);
    if (controls.grenade) this.throwGrenade();
    if (controls.orderCover) this.issueSquadOrder('cover');
    if (controls.orderAdvance) this.issueSquadOrder('advance');

    runUpdateC01Contact(this);
    this.updateGrenades(dt);
    this.#updateHazardBlasts();
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
    this.#evaluateMissionFailure();
    runUpdateScript(this);

    if (this.mgState.seeingPlayer && this.clock >= this.mgState.nextBurstAt) {
      this.mgState.burstsFired++;
      this.mgState.nextBurstAt = this.clock + this.mgState.cooldown;
      this.player.suppressed = Math.min(1, this.player.suppressed + 0.35);
      this.events.push({
        type: 'mg-burst',
        sourceId: this.mgState.id,
        origin: { x: 12.15, y: 1.42, z: -30.0 },
        target: { x: this.player.x, y: this.player.y + 1.2, z: this.player.z },
        rounds: this.mgState.burstRounds,
        clock: this.clock,
      });
    } else {
      this.player.suppressed = Math.max(0, this.player.suppressed - dt * 0.25);
    }
    // Quem caiu neste tick larga o volume que carregava: nenhum snapshot fica com carriedBy num ator morto (I5, FIX-2b).
    dropVolumesOfFallenCarriers(this);
  }

  /**
   * Grava um checkpoint semântico: entra na lista da linha temporal (`checkpointsReached`, que faz parte do snapshot),
   * fica no índice em memória `checkpoints` e é persistido pela loja (SAVE-02). Uma falha de persistência não interrompe
   * a simulação: fica em `lastCheckpointPersist` e no evento `checkpoint-saved`.
   * Um snapshot que o validador recusa nunca substitui a entrada boa do índice nem chega à loja, e o checkpoint não fica
   * marcado como atingido (o gatilho seguinte volta a tentar): evento `checkpoint-rejected`, devolve null (FIX-2b).
   * Devolve uma cópia: mexer no resultado não altera o índice (FIX-2b).
   * `persist: false` só regista no índice em memória (checkpoint inicial do construtor/reset; não toca na loja).
   */
  saveCheckpoint(checkpointId, { persist = true } = {}) {
    const addedNow = !this.checkpointsReached.includes(checkpointId);
    if (addedNow) this.checkpointsReached.push(checkpointId);
    const saved = this.#recordCheckpoint(checkpointId, persist);
    if (!saved && addedNow) this.checkpointsReached.splice(this.checkpointsReached.indexOf(checkpointId), 1);
    return saved;
  }

  /**
   * Grava de uma vez os checkpoints automáticos devidos no fim de um passo/ação (FIX-2c). TODOS ficam marcados em
   * `checkpointsReached` antes do primeiro snapshot: assim cada um é igual ao estado do fim do passo (diferem só no
   * `checkpointId`) e restaurar o primeiro não volta a disparar nem a regravar os restantes. O último do lote fica como
   * «último gravado» (F9) e como `latestCheckpointId` da loja. Um lote rejeitado pelo validador não marca nenhum.
   */
  #saveCheckpointBatch(checkpointIds) {
    // D1: os pedidos feitos antes de a falha ser avaliada (mesmo tick) também caem: nada se grava com a missão falhada.
    if (this.missionFailed) {
      for (const checkpointId of checkpointIds) this.#rejectCheckpointOnFailure(checkpointId);
      return;
    }
    const added = checkpointIds.filter((id) => !this.checkpointsReached.includes(id));
    this.checkpointsReached.push(...added);
    for (const checkpointId of checkpointIds) {
      const saved = this.#recordCheckpoint(checkpointId, true);
      if (!saved && added.includes(checkpointId)) {
        this.checkpointsReached.splice(this.checkpointsReached.indexOf(checkpointId), 1);
      }
    }
  }

  #rejectCheckpointOnFailure(checkpointId) {
    this.events.push({
      type: 'checkpoint-rejected',
      checkpointId,
      clock: this.clock,
      reason: `Checkpoint recusado: a missão falhou (${this.missionFailed.reason}). Reinicia a partir do último checkpoint.`,
    });
    return null;
  }

  /** Snapshot → validação → índice em memória → loja. Não mexe em `checkpointsReached` (quem chama já o marcou). */
  #recordCheckpoint(checkpointId, persist) {
    // D1: com a missão falhada nada se grava (automático ou manual): o checkpoint seria o próprio estado de falha e, sendo o
    // último, tirava ao jogador o ponto de reinício bom.
    if (this.missionFailed) return this.#rejectCheckpointOnFailure(checkpointId);
    const snap = this.snapshot();
    snap.checkpointId = checkpointId;
    const check = validateM02Snapshot(snap);
    if (!check.valid) {
      const reason = `Snapshot recusado antes de gravar: ${check.reason}`;
      this.lastCheckpointPersist = { ok: false, reason };
      this.events.push({ type: 'checkpoint-rejected', checkpointId, clock: this.clock, reason });
      return null;
    }
    this.checkpoints.set(checkpointId, snap);
    if (!persist) {
      this.lastCheckpointPersist = {
        ok: false,
        skipped: true,
        reason: `Checkpoint ${checkpointId} só em memória: o arranque não grava por cima do save do jogador.`,
      };
      this.events.push({ type: 'checkpoint-saved', checkpointId, clock: this.clock, persisted: false, persistError: null, memoryOnly: true });
      return structuredClone(snap);
    }
    this.#lastSessionCheckpointId = checkpointId;
    const result = this.saveStore
      ? this.saveStore.commitCheckpoint(checkpointId, snap)
      : { ok: false, reason: 'Sem loja de saves.' };
    this.lastCheckpointPersist = result;
    this.events.push({
      type: 'checkpoint-saved',
      checkpointId,
      clock: this.clock,
      persisted: result.ok,
      persistError: result.ok ? null : result.reason,
    });
    return structuredClone(snap);
  }

  /**
   * Apaga os saves persistidos da bancada (os três slots da loja). Saída explícita de uma loja bloqueada (`saveStore.status()`
   * com `blocked`); nunca é chamada automaticamente (FIX-2c). Não toca no índice em memória desta sessão. Limpa o
   * resultado da última gravação falhada, para o aviso da bancada desaparecer. Devolve false se o armazenamento recusar.
   */
  clearPersistedSaves() {
    const ok = this.saveStore ? this.saveStore.clear() : false;
    if (ok) this.lastCheckpointPersist = null;
    return ok;
  }

  /**
   * Carregamento rápido (F9 da bancada). Ordem de recurso, saltando as entradas que não se deixam restaurar (incompatíveis
   * ou inválidas; FIX-2c): 1) o checkpoint manual desta sessão; 2) o último gravado nesta sessão; 3) o último gravado na
   * loja persistida (página acabada de abrir ou recarregada); 4) o checkpoint manual da loja; 5) o início em memória.
   * Devolve { checkpointId, source } e, se saltou alguma entrada, `skipped: [{ checkpointId, source, reason }]`.
   */
  quickLoadCheckpoint() {
    const attempts = [];
    const add = (checkpointId, source, restore) => {
      if (checkpointId && !attempts.some((a) => a.checkpointId === checkpointId && a.source === source)) {
        attempts.push({ checkpointId, source, restore });
      }
    };
    if (this.checkpoints.has('cp_m02_manual')) add('cp_m02_manual', 'session', (id) => this.restoreCheckpoint(id));
    add(this.#lastSessionCheckpointId, 'session', (id) => this.restoreCheckpoint(id));
    const skipped = [];
    const stored = this.saveStore ? this.saveStore.load() : null;
    if (stored?.ok) {
      const latestId = stored.record.latestCheckpointId;
      if (stored.loadable[latestId]) {
        add(latestId, 'store', (id) => this.restorePersistedCheckpoint(id));
      } else {
        const why = stored.rejectedCheckpoints.find((r) => r.id === latestId)?.reason ?? 'incompatível';
        skipped.push({ checkpointId: latestId, source: 'store', reason: why });
      }
      if (stored.loadable.cp_m02_manual) add('cp_m02_manual', 'store', (id) => this.restorePersistedCheckpoint(id));
    }
    for (const { checkpointId, source, restore } of attempts) {
      try {
        restore(checkpointId);
      } catch (error) {
        skipped.push({ checkpointId, source, reason: error.message });
        continue;
      }
      return skipped.length ? { checkpointId, source, skipped } : { checkpointId, source };
    }
    this.restoreCheckpoint('cp_m02_a_preparacao');
    const result = { checkpointId: 'cp_m02_a_preparacao', source: 'start' };
    return skipped.length ? { ...result, skipped } : result;
  }

  /**
   * Restaura do índice em memória; se o checkpoint não estiver lá (p. ex. depois de recarregar a página) ou a entrada do
   * índice não passar na validação, usa a cópia persistida na loja. Devolve uma cópia do snapshot restaurado.
   */
  restoreCheckpoint(checkpointId) {
    const inMemory = this.checkpoints.get(checkpointId) ?? null;
    let memoryError = null;
    if (inMemory) {
      const check = validateM02Snapshot(inMemory);
      if (check.valid) {
        this.restoreSnapshot(inMemory);
        return structuredClone(inMemory);
      }
      memoryError = check.reason;
    }
    const stored = this.saveStore ? this.saveStore.loadCheckpoint(checkpointId) : null;
    if (!stored) {
      throw new Error(
        memoryError
          ? `Checkpoint ${checkpointId} inválido em memória (${memoryError}) e sem cópia persistida válida.`
          : `Checkpoint ${checkpointId} não encontrado.`,
      );
    }
    this.restoreSnapshot(stored);
    this.checkpoints.set(checkpointId, stored);
    return structuredClone(stored);
  }

  /** Restaura a cópia persistida (ignora o índice em memória). Sem id, usa o último checkpoint gravado na loja. */
  restorePersistedCheckpoint(checkpointId = null) {
    if (!this.saveStore) throw new Error('Sem loja de saves M02.');
    const id = checkpointId ?? this.saveStore.latestCheckpointId();
    const snap = id ? this.saveStore.loadCheckpoint(id) : null;
    if (!snap) throw new Error(`Checkpoint persistido ${id ?? '(nenhum)'} não encontrado ou inválido.`);
    this.restoreSnapshot(snap);
    this.checkpoints.set(id, snap);
    return structuredClone(snap);
  }

  /**
   * Snapshot v2 (PDF I5): todo o estado que `tick()` muta, mais a identidade da missão, a semente e o estado do gerador,
   * a data narrativa e a versão do layout da célula. Não guarda `events` (fila de saída para o renderer, drenada a cada
   * frame), o índice `checkpoints`, o navegador (derivado do mundo) nem métricas do streamer.
   */
  snapshot() {
    return normalizeNegativeZero({
      schema: M02_SNAPSHOT_SCHEMA,
      schemaVersion: M02_SNAPSHOT_SCHEMA_VERSION,
      missionId: M02_MISSION_ID,
      rng: { algorithm: M02_RNG_ALGORITHM, seed: this.seed, state: this.rng.state },
      narrative: m02NarrativeStamp(this.horizon.temporalState),
      clock: this.clock,
      activeCellId: this.activeCellId,
      world: {
        cellId: this.activeCellId,
        layoutSchema: M02_LAYOUT_SCHEMA_BY_CELL[this.activeCellId] ?? null,
        revision: this.world.revision,
      },
      player: structuredClone(this.player),
      weapon: this.weapon.snapshot(),
      grenadeAmmo: this.grenadeAmmo,
      grenades: structuredClone(this.grenades),
      grenadeSeq: this.grenadeSeq,
      doorLocks: Object.fromEntries([...this.doorLocks.entries()].map(([id, lock]) => [id, { ...lock }])),
      c01Active: this.c01Active,
      c01StartedAt: this.c01StartedAt,
      c01Contact: structuredClone(this.c01Contact),
      script: structuredClone(this.script),
      ea1StartedAt: this.ea1StartedAt,
      activeCartela: structuredClone(this.activeCartela),
      transitionTABPayload: this.transitionTABPayload ? structuredClone(this.transitionTABPayload) : null,
      supplies: structuredClone(this.supplies),
      transitionIdsApplied: [...this.transitionIdsApplied],
      checkpointsReached: [...this.checkpointsReached],
      totalHostilesSpawned: this.totalHostilesSpawned,
      areaB: structuredClone(this.areaB),
      areaC: structuredClone(this.areaC),
      c10Active: this.c10Active,
      c11Active: this.c11Active,
      m03ExportPackage: this.m03ExportPackage ? structuredClone(this.m03ExportPackage) : null,
      missionFailed: this.missionFailed ? structuredClone(this.missionFailed) : null,
      hazardBlasts: structuredClone(this.hazardBlasts),
      hazardBlastSeq: this.hazardBlastSeq,
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
      combatLog: structuredClone(this.combatLog),
      shotLog: structuredClone(this.shotLog),
    });
  }

  /**
   * Restauro em fases (PDF I5): 1) validar tudo sem tocar no estado vivo; 2) reconstruir cópias independentes;
   * 3) ativar. Se a ativação falhar a meio, o estado anterior é reposto e o erro é relançado (nunca fica meio restaurado).
   */
  restoreSnapshot(snap) {
    const validation = validateM02Snapshot(snap);
    if (!validation.valid) {
      throw new Error(`Snapshot M02 inválido: ${validation.reason}`);
    }
    const prepared = this.#prepareRestore(snap);
    const rollback = this.#prepareRestore(this.snapshot());
    try {
      this.#activateRestore(prepared);
    } catch (error) {
      this.#activateRestore(rollback);
      throw new Error(`Restauro M02 falhou na ativação e o estado anterior foi reposto: ${error.message}`);
    }
    this.events.push({ type: 'restored', clock: this.clock, checkpointId: snap.checkpointId ?? null });
  }

  #prepareRestore(snap) {
    return structuredClone({
      seed: snap.rng.seed,
      rngState: snap.rng.state,
      clock: snap.clock,
      cellId: snap.activeCellId,
      worldRevision: snap.world.revision,
      player: snap.player,
      weapon: snap.weapon,
      grenadeAmmo: snap.grenadeAmmo,
      grenades: snap.grenades,
      grenadeSeq: snap.grenadeSeq,
      doorLocks: snap.doorLocks,
      c01Active: Boolean(snap.c01Active),
      c01StartedAt: snap.c01StartedAt ?? 0,
      c01Contact: snap.c01Contact,
      script: snap.script,
      ea1StartedAt: snap.ea1StartedAt ?? 0,
      activeCartela: snap.activeCartela ?? M02_TEMPORAL_STATES.T0.cartela,
      transitionTABPayload: snap.transitionTABPayload ?? null,
      supplies: snap.supplies,
      transitionIdsApplied: snap.transitionIdsApplied,
      checkpointsReached: snap.checkpointsReached,
      totalHostilesSpawned: snap.totalHostilesSpawned ?? 10,
      areaB: snap.areaB,
      areaC: snap.areaC,
      c10Active: Boolean(snap.c10Active),
      c11Active: Boolean(snap.c11Active),
      m03ExportPackage: snap.m03ExportPackage ?? null,
      missionFailed: snap.missionFailed ?? null,
      hazardBlasts: snap.hazardBlasts ?? [],
      hazardBlastSeq: snap.hazardBlastSeq ?? 0,
      doors: snap.doors,
      windows: snap.windows,
      fences: snap.fences,
      allies: snap.allies,
      enemies: snap.enemies,
      targets: snap.targets,
      mgState: snap.mgState,
      routeProgress: snap.routeProgress,
      flags: snap.flags,
      squadOrder: LEGACY_SQUAD_ORDER_TYPES.includes(snap.squadOrder.type)
        ? { type: 'auto', axis: null, issuedAt: snap.squadOrder.issuedAt ?? 0 } // ordem que já não existe: neutralizada
        : snap.squadOrder,
      dialogue: snap.dialogue,
      horizon: snap.horizon,
      audiovisual: snap.audiovisual,
      objective: snap.objective,
      combatLog: snap.combatLog,
      shotLog: snap.shotLog,
    });
  }

  #activateRestore(p) {
    // Pedidos de checkpoint pendentes pertenciam à linha temporal descartada.
    this.#pendingCheckpointIds = [];
    this.seed = p.seed;
    this.rng = new Random(p.seed);
    this.rng.state = p.rngState;
    this.clock = p.clock;
    if (this.activeCellId !== p.cellId) {
      this.world = this.zoneStreamer.switchToCell(p.cellId);
      this.activeCellId = p.cellId;
    }
    this.areaB = p.areaB;
    this.areaC = p.areaC;
    for (const [k, v] of Object.entries(p.doors)) this.world.doorStates.set(k, v);
    for (const [k, v] of Object.entries(p.windows)) this.world.windowStates.set(k, v);
    for (const [k, v] of Object.entries(p.fences)) this.world.fenceStates.set(k, v);
    syncAreaCWorldDamage(this);
    this.world.refresh();
    // A revisão do mundo decide quando os atores recalculam rotas (navRevision): tem de voltar ao valor gravado.
    this.world.revision = p.worldRevision;
    this.navigator = new M01Navigator(this.world.navWorld).prewarm();

    this.player = p.player;
    // Só os campos de estado da arma (lista branca) voltam ao objeto: o perfil (dano, alcance, recarga) e o `id` vêm do
    // código, nunca do save — Wz29.restore faz Object.assign e aplicaria um `profile` injetado (FIX-2b).
    const weaponState = Object.fromEntries(WEAPON_STATE_FIELDS.filter((k) => k in p.weapon).map((k) => [k, p.weapon[k]]));
    this.weapon.restore(weaponState);
    this.grenadeAmmo = p.grenadeAmmo;
    this.grenades = p.grenades;
    this.grenadeSeq = p.grenadeSeq;
    this.doorLocks = new Map(Object.entries(p.doorLocks));
    this.c01Active = p.c01Active;
    this.c01StartedAt = p.c01StartedAt;
    this.c01Contact = p.c01Contact;
    this.script = p.script;
    this.ea1StartedAt = p.ea1StartedAt;
    this.activeCartela = p.activeCartela;
    this.transitionTABPayload = p.transitionTABPayload;
    this.supplies = p.supplies;
    this.transitionIdsApplied = p.transitionIdsApplied;
    this.checkpointsReached = p.checkpointsReached;
    this.totalHostilesSpawned = p.totalHostilesSpawned;
    this.c10Active = p.c10Active;
    this.c11Active = p.c11Active;
    this.m03ExportPackage = p.m03ExportPackage;
    this.missionFailed = p.missionFailed;
    this.hazardBlasts = p.hazardBlasts;
    this.hazardBlastSeq = p.hazardBlastSeq;
    this.allies = p.allies;
    this.enemies = p.enemies;
    this.calibrationTargets = p.targets;
    this.targets = this.calibrationTargets;
    this.mgState = p.mgState;
    this.routeProgress = p.routeProgress;
    this.flags = p.flags;
    // Migração explícita de saves v2 anteriores ao FIX-2b (PDF I5: «migrar com regra explícita»): marcavam m02.completed já
    // na Área A/C05; a flag só é verdadeira depois de C12 (I4, p. 34).
    if (this.flags['m02.completed'] && !this.areaC?.c12Completed) this.flags['m02.completed'] = false;
    this.squadOrder = p.squadOrder;
    this.dialogue.restore(p.dialogue);
    this.horizon.restore(p.horizon);
    this.audiovisual.restore(p.audiovisual);
    this.objective = p.objective;
    this.combatLog = p.combatLog;
    this.shotLog = p.shotLog;
  }

  setAccessibilityOptions(partial = {}) {
    return this.audiovisual.setAccessibilityOptions(partial);
  }
}
