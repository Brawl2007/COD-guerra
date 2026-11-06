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
import { M02QuintaWorld, BALLISTIC_MATERIAL_POLICY, m02MgMuzzle } from '../world/m02-quinta-world.js';
import { M02HorizonDirector, M02_TEMPORAL_STATES } from '../world/m02-horizon-system.js';
import { M02ZoneStreamer } from '../world/m02-zone-streamer.js';
import { Wz29 } from './wz29.js';
import { M02AudiovisualDirector } from './m02-audiovisual-director.js';
import {m02ExposedLastGroup,updateM02EvacuationWound} from './m02-evacuation-targets.js';
import {m02ActorPresent} from './m02-actor-presence.js';
import {stepM02Grenade} from './m02-grenade-physics.js';
import {m02ClearIncapableGrenadeThreat} from './m02-grenade-awareness.js';
import {
  M02_DIFFICULTY,
  M02_DIFFICULTY_IDS,
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
  friendlyFireClear,
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
  isNonCombatantTarget,
  isKnownOrderNode,
  RESCUE_NAMES,
  RESCUE_REACH_M,
  RESCUE_LIFT_SEC,
  openRescueWindow,
  isRescuable,
  rescueSpotIsSafe,
  beginPlayerRescue,
  rescueFieldsProblem,
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
  resolveCasualtiesForTransition as runResolveCasualtiesForTransition,
  markTransitionCasualty as runMarkTransitionCasualty,
  enterAreaCC09 as runEnterAreaCC09,
  unlockC09GateLatch as runUnlockC09GateLatch,
  startC10OrderChanges as runStartC10OrderChanges,
  detonateC10FixedArtillery as runDetonateC10FixedArtillery,
  startC11LisAndLastGroup as runStartC11LisAndLastGroup,
  assistLisInC11 as runAssistLisInC11,
  lisContactPrompt as runLisContactPrompt,
  contactLisInC11 as runContactLisInC11,
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
  openPendingContact,
  updateC01Contact as runUpdateC01Contact,
  updateAreaBContact as runUpdateAreaBContact,
  C01_CONTACT_OPENED_BY,
  C01_CONTACT_DELAY_SEC,
  instantAt,
  M02_REQUIRED_CHARACTERS,
  requiredCharacterOut,
  lastGroupTargets,
  isLastGroupMember,
  markLastGroupHit,
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
  m02LayoutMismatchReason,
  m02NarrativeStamp,
  m02CellInteractiveIds,
  findNonFiniteNumber,
} from './m02-save-store.js';

const WALK_SPEED = 4.2;
const SPRINT_SPEED = 6.1;
const CROUCH_SPEED = 2.55;
const DOOR_INTERACT_RANGE = 2.2;
const CHALK_INTERACT_RANGE = 4.5;
export const M02_WATER_HANDOFF_SECONDS = 1.5;

const TARGET_TO_ENEMY_SYNC = Object.freeze({
  tgt_b02_mg_gunner: 'DE-A05',
  tgt_b01_kitchen_window: 'DE-A07',
  tgt_b01_hall_door: 'DE-A08',
});
// The player commits one grenade on the press and releases it after the M01
// first-person arm has had time to prepare. This is mission time, not a timer
// owned by the renderer or browser.
export const M02_GRENADE_PREPARE_SECONDS = 0.5;
// Measured at the end of the shared M01 hand pose (camera-space metres).
const M02_GRENADE_RELEASE_VIEW=Object.freeze({right:.112,up:-.090,forward:.557});

function recordM02Hit(actor,clock,source,part='torso'){
  actor.hitAt=clock;actor.hitYaw=Math.atan2(source.z-actor.z,source.x-actor.x);actor.hitPart=part;
  if(!actor.alive){actor.diedAt=clock;actor.deathYaw=actor.facing??0;}
}

function roundNearActor(origin,direction,hit,range,actor){
  const point=eyePosition(actor),dx=point.x-origin.x,dy=point.y-origin.y,dz=point.z-origin.z;
  const along=Math.max(0,Math.min(hit?.distance??range,dx*direction.x+dy*direction.y+dz*direction.z));
  return Math.hypot(dx-direction.x*along,dy-direction.y*along,dz-direction.z*along)<=3;
}

const WEAPON_STATES = Object.freeze(['READY', 'BOLT_CYCLE', 'RELOAD_CLIP', 'RELOAD_SINGLE']);
const PLAYER_ID = 'piotr_sokol';

/**
 * D1 (PDF p. 16, «Falhas duras»): duas falhas duras. (1) `piotr_killed`: a morte de Piotr. (2) `required_character_incapacitated`:
 * a incapacidade definitiva de uma personagem exigida pelo cânone antes do seu ponto de resolução — quais e em que cenas está em
 * M02_REQUIRED_CHARACTERS (m02-acts-director.js: hoje o sierż. Gruca, de C01 até C12 fechar); a falha leva o `actorId`.
 * A terceira falha dura do PDF, a corrupção de estado rejeitada, é o `validateM02Snapshot` (o restauro recusa e nada muda).
 * A falha é estado (`sim.missionFailed = {reason, at[, actorId]}`), nunca imunidade oculta: pára o roteiro e os checkpoints (automáticos
 * e manuais) e só se sai dela por uma ação explícita (`restartAfterFailure`, o F9 da bancada).
 */
export const M02_MISSION_FAILURE_REASONS = Object.freeze(['piotr_killed', 'required_character_incapacitated']);
/** Texto de apresentação de cada razão (a bancada só mostra; quem decide a falha é a simulação). */
export const M02_MISSION_FAILURE_TEXT = Object.freeze({
  piotr_killed: 'O strz. Piotr Sokół morreu. A missão falhou.',
  required_character_incapacitated:
    'Uma personagem exigida pelo roteiro ficou fora de combate (o sierż. Gruca é essencial à resolução da missão). A missão falhou.',
});

/**
 * Texto do painel de falha da bancada, em português, a partir do estado `missionFailed` ({ reason, at[, actorId] }): a bancada só mostra,
 * quem decide a falha é a simulação. A razão escolhe a frase; `required_character_incapacitated` diz QUEM (`actorId`, nome curto da tabela
 * M02_REQUIRED_CHARACTERS: «Sgt. Gruca incapacitado») em vez da frase genérica, que fixaria o nome de uma só personagem. Razão
 * desconhecida ou `actorId` fora da tabela caem na frase genérica da razão (nunca lançam: o painel não pode falhar a mostrar a falha).
 */
export function describeMissionFailure(failure) {
  if (!failure || typeof failure !== 'object') return 'A missão falhou.';
  if (failure.reason === 'required_character_incapacitated') {
    const who = Object.hasOwn(M02_REQUIRED_CHARACTERS, failure.actorId) ? M02_REQUIRED_CHARACTERS[failure.actorId] : null;
    if (who?.shortName) {
      return `${who.shortName} incapacitado. Sem socorro possível (D1: «socorro quando seguro»): é uma personagem exigida pelo roteiro até ao fim de C12 e a missão falhou.`;
    }
  }
  return M02_MISSION_FAILURE_TEXT[failure.reason] ?? 'A missão falhou.';
}

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
  'FLEE_GRENADE', // Codex (d7750293): foge de uma granada que viu/ouviu; repõe o estado anterior quando ela rebenta
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
  'WITHDRAWING', // D2: o posto EA0 a recuar para a borda oeste (combatente, a andar)
  'WITHDRAWN', // D2: o posto EA0 retirado na borda oeste (vivo, fora de combate)
  'FLEE_GRENADE', // Codex (d7750293): foge de uma granada que viu/ouviu
  'RETREAT_B02', // Codex (82863c1b): o municiador da MG de B02 a sair pela porta sul (C03)
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
 * Merge M02 único (2026-11-06): estado ADITIVO do schema 2 trazido da linha Codex (codex/m02-recovery-v1). Todos os campos são
 * opcionais (ausentes nos saves anteriores = nenhuma ação em curso): granada preparada, água dada em C04, rajada pendente ronda
 * a ronda, retirada pelo celeiro, memória de granada, retirada antecipada (quem ficou para trás) e marcas de impacto/movimento.
 * As regras são as do validador do Codex, aplicadas DEPOIS do validador estrito v2. Devolve o motivo ou null.
 */
function validateCodexAdditiveState(snap) {
  if (snap.grenadeAmmo !== undefined && !isNonNegativeInteger(snap.grenadeAmmo)) return 'Munição de granadas inválida.';
  if (snap.playerGrenadeAction !== undefined && snap.playerGrenadeAction !== null) {
    const action = snap.playerGrenadeAction;
    if (!isPlainObject(action) || !Number.isInteger(snap.grenadeAmmo) || snap.player?.health <= 0 || snap.player?.carryingVolumeId)
      return 'Preparação de granada inválida.';
    // Um toque durante a recarga reserva a granada, mas a mão só larga a espingarda quando a animação existente acaba.
    if (action.waitingForReload === true) {
      if (action.startedAt !== null || action.releaseAt !== null || !['RELOAD_SINGLE', 'RELOAD_CLIP'].includes(snap.weapon?.state))
        return 'Espera da granada inválida.';
    } else {
      const waiting = action.startedAt > snap.clock + 1e-6;
      if (
        !Number.isFinite(action.startedAt) ||
        !Number.isFinite(action.releaseAt) ||
        action.startedAt < 0 ||
        (waiting &&
          (snap.weapon?.state !== 'BOLT_CYCLE' ||
            !Number.isFinite(snap.weapon.until) ||
            Math.abs(action.startedAt - snap.weapon.until / 1000) > 1e-6 ||
            action.startedAt - snap.clock > 1.1)) ||
        Math.abs(action.releaseAt - action.startedAt - M02_GRENADE_PREPARE_SECONDS) > 1e-6 ||
        action.releaseAt <= snap.clock - 1e-6
      )
        return 'Preparação de granada inválida.';
    }
  }
  if (snap.playerWaterAction !== undefined && snap.playerWaterAction !== null) {
    const a = snap.playerWaterAction;
    if (
      !isPlainObject(a) ||
      typeof a.actorId !== 'string' ||
      !Number.isFinite(a.startedAt) ||
      !Number.isFinite(a.finishAt) ||
      a.startedAt < 0 ||
      a.startedAt > snap.clock ||
      a.finishAt <= snap.clock - 1e-6 ||
      Math.abs(a.finishAt - a.startedAt - M02_WATER_HANDOFF_SECONDS) > 1e-6 ||
      snap.activeCellId !== 'A' ||
      snap.player?.health <= 0 ||
      snap.player?.carryingVolumeId ||
      snap.playerGrenadeAction ||
      snap.weapon?.state !== 'READY' ||
      snap.flags?.['m02.pomar_wounded_water'] ||
      !snap.enemies?.some((e) => e.id === a.actorId && e.alive && e.c04Candidate && e.state === 'WOUNDED_UNARMED')
    )
      return 'Entrega de água inválida.';
  }
  for (const g of snap.grenades ?? []) {
    if (g.releaseView !== undefined && (!isPlainObject(g.releaseView) || !Number.isFinite(g.releaseView.angle) || !Number.isFinite(g.releaseView.pitch) || Math.abs(g.releaseView.pitch) > 1.35))
      return 'Granada inválida.';
  }
  for (const e of snap.enemies ?? []) {
    if (
      e.m02BarnRetreat !== undefined &&
      (!isPlainObject(e.m02BarnRetreat) ||
        !['inside', 'outside'].includes(e.m02BarnRetreat.phase) ||
        !Number.isFinite(e.m02BarnRetreat.startedAt) ||
        e.m02BarnRetreat.startedAt < 0 ||
        e.m02BarnRetreat.startedAt > snap.clock)
    )
      return `Retirada do celeiro inválida no snapshot: ${e.id}`;
  }
  const areaC = snap.areaC ?? {};
  const left = areaC.leftBehindIds;
  if (
    left !== undefined &&
    (!Array.isArray(left) ||
      left.length > 12 ||
      new Set(left).size !== left.length ||
      !areaC.c12Completed ||
      left.some((id) => typeof id !== 'string' || !areaC.lastGroup?.some((a) => a.id === id && a.alive && !a.evacuated && a.leftBehind)))
  )
    return 'Grupo deixado para trás inválido.';
  const unaccounted = snap.flags?.['m02.last_group_unaccounted'];
  if (unaccounted !== undefined && (!Number.isInteger(unaccounted) || unaccounted < 0 || unaccounted > 12)) return 'Contagem do grupo inválida.';
  if ((unaccounted ?? 0) !== (left?.length ?? 0)) return 'Contagem do grupo inconsistente.';
  if (snap.flags?.['m02.pomar_wounded_water'] !== undefined && typeof snap.flags['m02.pomar_wounded_water'] !== 'boolean')
    return 'Estado de água do ferido inválido.';
  for (const actor of [...(snap.allies ?? []), ...(snap.enemies ?? []), ...(areaC.lastGroup ?? [])]) {
    if (!isPlainObject(actor) || !Number.isFinite(actor.x) || !Number.isFinite(actor.z)) return 'Posição de ator inválida.';
    if (actor.leftBehind !== undefined && typeof actor.leftBehind !== 'boolean') return `Estado de evacuação inválido: ${actor.id}`;
    if (actor.c04WaterOfferedAt !== undefined && (!Number.isFinite(actor.c04WaterOfferedAt) || actor.c04WaterOfferedAt < 0 || actor.c04WaterOfferedAt > snap.clock))
      return `Estado de água inválido: ${actor.id}`;
    if (actor.m02LastEngagedTargetId !== undefined && typeof actor.m02LastEngagedTargetId !== 'string') return `Alvo de equipa inválido: ${actor.id}`;
    if (actor.m02GrenadeThreat !== undefined) {
      const t = actor.m02GrenadeThreat;
      if (
        !isPlainObject(t) ||
        typeof t.id !== 'string' ||
        !t.id ||
        !M02_CELL_IDS.includes(t.cell) ||
        !['seenX', 'seenZ', 'goalX', 'goalZ'].every((k) => Number.isFinite(t[k])) ||
        typeof t.previousState !== 'string' ||
        !(t.previousTacticalState === null || typeof t.previousTacticalState === 'string') ||
        !(t.previousGoal === null || (t.previousGoal && Number.isFinite(t.previousGoal.x) && Number.isFinite(t.previousGoal.z))) ||
        (t.previousCrouched !== undefined && typeof t.previousCrouched !== 'boolean') ||
        (t.previousEyeHeight !== undefined && !Number.isFinite(t.previousEyeHeight))
      )
        return `Ameaça de granada inválida: ${actor.id}`;
    }
    for (const key of ['effectiveSpeed', 'motionDistance'])
      if (actor[key] !== undefined && (!Number.isFinite(actor[key]) || actor[key] < 0)) return `Movimento inválido: ${actor.id}`;
    for (const key of ['hitAt', 'hitYaw', 'diedAt', 'deathYaw']) if (actor[key] !== undefined && !Number.isFinite(actor[key])) return `Impacto inválido: ${actor.id}`;
    if (actor.navCorners != null && (!Array.isArray(actor.navCorners) || actor.navCorners.some((c) => !c || !Number.isFinite(c.x) || !Number.isFinite(c.z))))
      return `Rota inválida: ${actor.id}`;
    const b = actor.burst;
    if (b == null) continue; // checkpoints anteriores às rajadas causais não têm ronda pendente
    const maxRounds = actor.weapon === 'rkm_wz28' ? Math.max(4, WEAPON_PROFILES.rkm_wz28.burstCount) : (WEAPON_PROFILES[actor.weapon]?.burstCount ?? 1);
    if (
      !Number.isInteger(actor.burstSequence) ||
      actor.burstSequence < 1 ||
      !Number.isInteger(b.totalRounds) ||
      b.totalRounds < 2 ||
      b.totalRounds > maxRounds ||
      !Number.isInteger(b.remaining) ||
      b.remaining < 1 ||
      !Number.isInteger(b.emitted) ||
      b.emitted < 1 ||
      b.emitted + b.remaining !== b.totalRounds ||
      actor.mag < b.remaining ||
      !Number.isFinite(b.nextAt) ||
      b.nextAt < 0 ||
      !Number.isFinite(b.cooldownUntil) ||
      b.cooldownUntil < 0 ||
      (b.interval !== undefined && (!Number.isFinite(b.interval) || b.interval <= 0)) ||
      !isPlainObject(b.aimPoint) ||
      !['x', 'y', 'z'].every((k) => Number.isFinite(b.aimPoint[k])) ||
      !['ally', 'enemy'].includes(b.side) ||
      (b.targetId !== null && typeof b.targetId !== 'string') ||
      (b.damageOnPlayer !== undefined && (!Number.isFinite(b.damageOnPlayer) || b.damageOnPlayer < 0))
    )
      return `Rajada pendente inválida: ${actor.id}`;
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
        'não seria determinístico (SAVE-01). Sem migração e sem apagar nada: os checkpoints v1 desta bancada só existiam em memória ' +
        'e os saves v1 do Codex (cod-guerra:checkpoint:m02:v1) ficam intactos, nunca lidos como v2.',
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
    return { valid: false, reason: m02LayoutMismatchReason(snap.activeCellId, world.layoutSchema) };
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
  // D6 (FIX-CD): perfil de dificuldade, campo aditivo do schema 2. Ausente = recruta (saves anteriores e saves de recruta).
  if (snap.difficulty !== undefined && !M02_DIFFICULTY_IDS.includes(snap.difficulty)) {
    return { valid: false, reason: `Perfil de dificuldade inválido no snapshot: ${String(snap.difficulty)}` };
  }
  // FIX-CD (D1/I3): um checkpoint é um ponto de reinício seguro. Piotr morto (vida 0 ou `alive` falso) ou a missão já falhada num
  // checkpoint davam um reinício que volta a falhar no tick seguinte (ciclo). Um snapshot sem `checkpointId` pode mostrar a falha.
  if (
    snap.checkpointId !== undefined &&
    isPlainObject(snap.player) &&
    (snap.player.alive === false || !(snap.player.health > 0) || (snap.missionFailed ?? null) !== null)
  ) {
    return { valid: false, reason: `Checkpoint ${snap.checkpointId} recusado: Piotr morto ou missão falhada não é um ponto de reinício.` };
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
      // D4: o lanço do plano base que a trela reteve (id de um nó de cobertura) ou null; campo aditivo, ausente nos saves anteriores.
      if (label === 'Aliado' && 'holdingFor' in a && a.holdingFor !== null && !(typeof a.holdingFor === 'string' && /^cv_[a-z0-9_]+$/.test(a.holdingFor))) {
        return { valid: false, reason: `Objetivo retido (holdingFor) inválido no snapshot: ${a.id}` };
      }
      // D1: socorro quando seguro — janela `rescue` do caído e `rescuedCount` (campos aditivos; ausentes nos saves anteriores)
      if (label === 'Aliado') {
        const rescueProblem = rescueFieldsProblem(a, snap.clock, new Set(snap.allies.map((x) => x?.id)));
        if (rescueProblem) return { valid: false, reason: rescueProblem };
      }
      // D6 (regra F1 da M01): contacto de um atirador com Piotr; só existe em soldado/veterano, instantes finitos ou null.
      if (label === 'Inimigo' && ['aimEngagedAt', 'aimLastAt'].some((k) => k in a && a[k] !== null && !(Number.isFinite(a[k]) && a[k] >= 0))) {
        return { valid: false, reason: `Contacto do inimigo com Piotr inválido no snapshot: ${a.id}` };
      }
      // D2: recuo do posto EA0 (campo aditivo `withdrawStartedAt`; saves anteriores nunca o têm). WITHDRAWING/WITHDRAWN só existem em
      // homens vivos do EA0, com o instante de início passado; quem recua é combatente e anda para um destino, quem foi retirado já não combate.
      if (label === 'Inimigo') {
        const withdrawing = a.state === 'WITHDRAWING';
        const withdrawn = a.state === 'WITHDRAWN';
        const started = a.withdrawStartedAt;
        if (
          ('withdrawStartedAt' in a && started !== null && !(Number.isFinite(started) && started >= 0 && started <= snap.clock + 1e-9)) ||
          ((withdrawing || withdrawn) &&
            (a.encounterId !== 'EA0' || a.alive !== true || !Number.isFinite(started) || Boolean(a.nonCombatant) !== withdrawn)) ||
          (withdrawing && !(isPlainObject(a.goal) && Number.isFinite(a.goal.x) && Number.isFinite(a.goal.z)))
        ) {
          return { valid: false, reason: `Recuo do posto EA0 inválido no snapshot: ${a.id}` };
        }
      }
    }
  }
  const aliveById = new Map([[PLAYER_ID, p.alive !== false], ...snap.allies.map((a) => [a.id, a.alive])]);
  // D1: também não é ponto de reinício um checkpoint com uma personagem exigida já fora de combate (a falha repetia-se no tick seguinte).
  // Nem com a missão concluída (`ignoreCompletion`): o validador aceitava, por c12Completed, um cp_m02_manual com Gruca morto.
  if (snap.checkpointId !== undefined) {
    const out = requiredCharacterOut(snap, { ignoreCompletion: true });
    if (out) {
      return { valid: false, reason: `Checkpoint ${snap.checkpointId} recusado: a personagem exigida ${out} está fora de combate, não é um ponto de reinício.` };
    }
  }
  if (!Array.isArray(snap.targets)) return { valid: false, reason: 'Lista de alvos de calibração inválida.' };

  for (const key of ['mgState', 'routeProgress', 'objective', 'squadOrder', 'dialogue', 'audiovisual', 'supplies']) {
    if (!isPlainObject(snap[key])) return { valid: false, reason: `Bloco ${key} ausente ou inválido no snapshot.` };
  }
  // D4: ordem à secção — `auto`, `cover` ou `advance` (as de versões anteriores, `suppress`/`flank_east`, restauram-se como `auto`).
  // `cellId` (campo aditivo: a célula em que a ordem foi dada; ausente = Área A, como nos saves anteriores). Em B e C o nó da ordem e
  // os atribuídos têm de ser nós de ordem conhecidos dessa célula (um save não inventa posições); na Área A vêm do layout.
  const order = snap.squadOrder;
  const orderHasTarget = order.type === 'cover' || order.type === 'advance';
  const orderCell = order.cellId ?? 'A';
  if (
    !(SQUAD_ORDER_TYPES.includes(order.type) || LEGACY_SQUAD_ORDER_TYPES.includes(order.type)) ||
    (order.issuedAt !== undefined && !(typeof order.issuedAt === 'number' && Number.isFinite(order.issuedAt) && order.issuedAt >= 0)) ||
    (orderHasTarget &&
      (!M02_CELL_IDS.includes(orderCell) ||
        typeof order.nodeId !== 'string' ||
        !order.nodeId ||
        !Number.isFinite(order.x) ||
        !Number.isFinite(order.z) ||
        !isPlainObject(order.assignments) ||
        Object.entries(order.assignments).some(([id, node]) => typeof node !== 'string' || !snap.allies.some((a) => a.id === id)) ||
        (orderCell !== 'A' &&
          (!isKnownOrderNode(orderCell, order.nodeId) || Object.values(order.assignments).some((node) => !isKnownOrderNode(orderCell, node))))))
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
    areaC.lastGroup.some((lg) => !isPlainObject(lg) || typeof lg.evacuated !== 'boolean' || !isTimeOrNull(lg.arrivedAt) || (lg.evacuated && lg.arrivedAt === null))
  ) {
    return {
      valid: false,
      reason: 'Save incompatível: estado de Lis/último grupo da Área C ausente ou inválido (snapshot anterior ao percurso persistente de Lis).',
    };
  }
  // C11: o último grupo pode ser ferido e morto (campo aditivo `maxHealth`; saves anteriores têm todos vivos e a 100 %).
  for (const lg of areaC.lastGroup) {
    const max = isPlainObject(lg) ? (lg.maxHealth ?? lg.health) : null;
    if (
      !isPlainObject(lg) ||
      typeof lg.alive !== 'boolean' ||
      typeof lg.wounded !== 'boolean' ||
      !(typeof lg.health === 'number' && Number.isFinite(lg.health) && lg.health >= 0) ||
      !(typeof max === 'number' && Number.isFinite(max) && max > 0 && lg.health <= max) ||
      (lg.alive ? lg.health <= 0 : lg.health !== 0) ||
      (lg.evacuated && !lg.alive) ||
      ('state' in lg && lg.state !== undefined && typeof lg.state !== 'string')
    ) {
      return { valid: false, reason: `Estado do último grupo inválido no snapshot (vida, ferido, vivo/morto ou evacuado incoerentes): ${lg?.id}` };
    }
  }
  if (areaC.lastGroupSummary !== null && areaC.lastGroupSummary !== undefined) {
    const sum = areaC.lastGroupSummary;
    const dead = areaC.lastGroup.filter((lg) => !lg.alive).length;
    const evacuated = areaC.lastGroup.filter((lg) => lg.alive && lg.evacuated).length;
    // C12 escreve o resumo uma só vez: os mortos são exatamente os de agora (depois de C12 já ninguém leva fogo) e os evacuados só
    // podem ter crescido (quem estava em trânsito continua o percurso)
    const stable = isPlainObject(sum) && sum.dead === dead && sum.evacuated <= evacuated;
    if (!isPlainObject(sum) || !['evacuated', 'inTransit', 'dead'].every((k) => isNonNegativeInteger(sum[k])) || sum.evacuated + sum.inTransit + sum.dead !== areaC.lastGroup.length || !stable) {
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
  // D1: campo aditivo do schema 2 — ausente = missão em curso (null). Presente tem de ser {reason ∈ enum, at ≤ clock}; a falha por
  // personagem exigida leva ainda o `actorId` de uma personagem da tabela M02_REQUIRED_CHARACTERS que está mesmo fora de combate,
  // e a morte de Piotr não leva `actorId`.
  const failed = snap.missionFailed ?? null;
  if (
    failed !== null &&
    (!isPlainObject(failed) || !M02_MISSION_FAILURE_REASONS.includes(failed.reason) || !finiteTime(failed.at) || failed.at > snap.clock + 1e-9)
  ) {
    return { valid: false, reason: 'Estado de falha da missão (missionFailed) inválido no snapshot.' };
  }
  if (failed !== null) {
    const byCharacter = failed.reason === 'required_character_incapacitated';
    const allowedKeys = byCharacter ? ['reason', 'at', 'actorId'] : ['reason', 'at'];
    const outOfAction = byCharacter ? snap.allies.find((a) => a.id === failed.actorId)?.alive === false : false;
    if (
      Object.keys(failed).some((k) => !allowedKeys.includes(k)) ||
      (byCharacter && (!Object.hasOwn(M02_REQUIRED_CHARACTERS, failed.actorId) || !outOfAction))
    ) {
      return {
        valid: false,
        reason: `Estado de falha da missão (missionFailed) inválido no snapshot: ${failed.reason} exige ${byCharacter ? 'o actorId de uma personagem exigida fora de combate' : 'só reason e at'}.`,
      };
    }
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

  // C06: a janela de segurança da entrada em B (campo aditivo `areaB.contact`, mesma forma que `c01Contact`; ausente nos saves anteriores).
  const bContact = snap.areaB.contact;
  if (
    bContact !== undefined &&
    (!isPlainObject(bContact) ||
      typeof bContact.opened !== 'boolean' ||
      !nullOrTime(bContact.movementStartedAt) ||
      !nullOrTime(bContact.contactAt) ||
      !nullOrTime(bContact.openedAt) ||
      (bContact.contactAt === null) !== (bContact.movementStartedAt === null) ||
      (bContact.opened ? !C01_CONTACT_OPENED_BY.includes(bContact.openedBy) || bContact.openedAt === null : bContact.openedBy !== null || bContact.openedAt !== null) ||
      // instantes passados (início do avanço, abertura) nunca à frente do relógio; o agendado cai no máximo 60 s depois do início (D6)
      (bContact.movementStartedAt !== null && bContact.movementStartedAt > snap.clock + 1e-9) ||
      (bContact.openedAt !== null && bContact.openedAt > snap.clock + 1e-9) ||
      (bContact.contactAt !== null && !(bContact.contactAt >= bContact.movementStartedAt && bContact.contactAt <= bContact.movementStartedAt + C01_CONTACT_DELAY_SEC.max + 1e-6)))
  ) {
    return { valid: false, reason: 'Estado da janela de segurança da entrada em B (areaB.contact) inválido no snapshot.' };
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
      (cause === 'parked_fallback' ? !CART_PARKED_REASONS.includes(cart.parkedReason) : (cart.parkedReason ?? null) !== null) ||
      // FIX-CD: campo aditivo (ausente nos saves anteriores = null); instante passado, nunca à frente do relógio.
      !isTimeOrNull(cart.volumesUnattendedSince ?? null) ||
      (cart.volumesUnattendedSince ?? 0) > snap.clock + 1e-9
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
  const codexReason = validateCodexAdditiveState(snap);
  if (codexReason) return { valid: false, reason: codexReason };
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
  /** Pedidos de uma só vez (`deferWhileOut`) feitos com a personagem exigida caída: gravam-se quando ela se levanta; caem com evento se a missão falha. */
  #deferredCheckpointIds = [];
  /** Último checkpoint gravado nesta sessão com persistência (meta-estado do F9; não é estado de jogo). */
  #lastSessionCheckpointId = null;
  /**
   * D6: perfil de dificuldade (recruta | soldado | veterano, os ids da M01). Escolhe-se na configuração (construtor/setDifficulty) e
   * não muda com reset(); como na M01 (H9 D1) entra no snapshot — afeta o resultado da simulação — no campo `difficulty`, omitido em
   * recruta (saves de recruta iguais byte a byte; um save sem o campo restaura-se em recruta), e é reposto pelo restauro (FIX-CD).
   * A acessibilidade continua fora do snapshot. Privado para não contar como estado vivo (como os campos acima).
   */
  #difficultyId = M02_DIFFICULTY_SIM_DEFAULT;
  /** Relógio no início do passo em curso (só dentro de #step; null entre passos). Instante nominal dos disparos da regra F1. */
  #tickStartClock = null;
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
   * Muda o perfil de dificuldade (não toca nos checkpoints já gravados; os snapshots seguintes levam o novo perfil). RangeError se
   * o id não é um dos da M01. Devolve o perfil.
   */
  setDifficulty(id) {
    this.#difficultyId = resolveM02Difficulty(id).id;
    return this.difficulty;
  }

  reset(startScene = this.defaultStartScene) {
    this.#pendingCheckpointIds = [];
    this.#deferredCheckpointIds = [];
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
    this.playerGrenadeAction = null;
    this.playerWaterAction = null;
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
    this.#lastOrderFeedback = null;
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

    const { note: _mgNote, ...mg } = this.world.layout.mgEmplacement;
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
      'm02.lis_status': null, // I4 (p. 34): nulo durante a missão; 'active' (versões anteriores) continua aceite como o nulo legado
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
    this.player.crouched = true;
    this.player.eyeHeight = 1.08;

    // Position the 7 Polish squad allies in the P1 preparation trench (around Z = -174..-178)
    for (const ally of this.allies) {
      const original=this.world.layout.polishSquad.find(a=>a.id===ally.id);
      const slot=this.world.layout.c01Corridor?.preparationSlots?.[ally.id];
      ally.x=slot?.x??original?.x??ally.x;
      ally.z=slot?.z??Number(((original?.z??-79)-96).toFixed(2));
      ally.facing=slot?.facing??original?.facing??Math.PI/2;
      ally.y = this.world.heightAt(ally.x, ally.z);
      ally.crouched=true;ally.eyeHeight=1.08;ally.moving=false;
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

    // I2 (p. 33): as janelas de socorro e os feridos resolvem-se ANTES do payload (que regista o estado final aplicado).
    const casualties = runResolveCasualtiesForTransition(this);
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
      flags: {...structuredClone(this.flags),'m02.completed':false},
      squadStatuses: Object.fromEntries(
        this.allies.map((a) => [a.id, { alive: a.alive, state: a.state, health: a.health }]),
      ),
    };

    for (const r of casualties) runMarkTransitionCasualty(this, r);

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

  /** C11: [E] junto a Lis (ação deliberada, ao alcance e sem obstáculo; Codex e4a46327). null se não há contacto possível. */
  currentLisContactPrompt() {
    return runLisContactPrompt(this);
  }

  /** C11: o contacto com Lis pela ação do jogador (amparo físico, sem teletransporte). Devolve true se começou. */
  contactLisInC11() {
    return this.#runCheckpointBatch(() => runContactLisInC11(this));
  }

  assistLisInC11(mode = 'wounded_evacuated') {
    return this.#runCheckpointBatch(() => runAssistLisInC11(this, mode));
  }

  completeC12Epilogue(options = {}) {
    // FIX-CD (D1): uma missão falhada não se conclui por atalho (KeyM da bancada): nada muda e devolve null.
    this.#evaluateMissionFailure();
    if (this.missionFailed) return null;
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

  /**
   * D1: socorro quando seguro. O caído mais próximo de Piotr, ao alcance (RESCUE_REACH_M) e com a janela aberta: `safe` diz se nenhum
   * hostil o vê (RESCUE_SAFE_RADIUS_M); `lifting` se Piotr já o está a levantar. O [E] só age com `safe`. null se não há ninguém ao alcance.
   */
  currentRescuePrompt() {
    const p = this.player;
    if (p.alive === false || !(p.health > 0)) return null;
    let best = null;
    for (const a of this.allies) {
      if (!isRescuable(this, a)) continue;
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      // quem Piotr já está a levantar tem prioridade sobre qualquer outro ao alcance (um levantar de cada vez); senão, o mais próximo
      const mine = a.rescue.by === PLAYER_ID && a.rescue.liftStartedAt !== null;
      if (d <= RESCUE_REACH_M && (!best || (mine && !best.mine) || (mine === best.mine && d < best.d))) best = { a, d, mine };
    }
    if (!best) return null;
    const { a, d } = best;
    const name = RESCUE_NAMES[a.id] ?? a.id;
    const lifting = a.rescue.by === PLAYER_ID && a.rescue.liftStartedAt !== null;
    // um aliado a meio de levantar o caído: o [E] não lhe tira a vez (recomeçava a contagem); só se mostra o progresso
    const allyLifting = !lifting && a.rescue.by !== null && a.rescue.liftStartedAt !== null;
    const busy = !lifting && !allyLifting && this.allies.some((o) => o !== a && o.rescue?.by === PLAYER_ID && o.rescue.liftStartedAt !== null);
    const safe = lifting || rescueSpotIsSafe(this, a);
    const left = lifting || allyLifting ? Math.max(0, RESCUE_LIFT_SEC - (this.clock - a.rescue.liftStartedAt)) : null;
    const byName = allyLifting ? (RESCUE_NAMES[a.rescue.by] ?? a.rescue.by) : null;
    return {
      actorId: a.id,
      distance: Number(d.toFixed(2)),
      safe,
      lifting,
      allyLifting,
      busy,
      prompt: lifting
        ? `A levantar ${name}… ${Math.ceil(left)} s (fica ao lado dele)`
        : allyLifting
          ? `${byName} está a levantar ${name}… ${Math.ceil(left)} s`
          : busy
            ? `Já estás a levantar outro caído: acaba esse primeiro`
            : safe
              ? `[E] Socorrer ${name} (levantar o caído; fica com pouca vida)`
              : `Socorro adiado: ${name} está à vista de um hostil`,
    };
  }

  /**
   * O que o [E] faz agora: o alvo interativo MAIS PRÓXIMO de Piotr (caído a socorrer, poste de giz, volume largado, porta), em vez de o socorro
   * ter prioridade fixa a ≤ RESCUE_REACH_M (antes um caído ao lado, mesmo à vista de um hostil, tirava ao [E] abrir a porta ou apanhar o
   * volume). Empate: socorro, giz, volume, porta. Devolve `{ kind, prompt }` ou null; a bancada mostra o mesmo aviso que o [E] executa.
   */
  currentInteractPrompt() {
    const candidates = [
      ['lis', this.currentLisContactPrompt()],
      ['rescue', this.currentRescuePrompt()],
      ['chalk', this.currentChalkPrompt()],
      ['volume', this.currentVolumePrompt()],
      ['door', this.currentDoorPrompt()],
    ];
    let best = null;
    for (const [kind, prompt] of candidates) {
      if (!prompt) continue;
      if (!best || prompt.distance < best.prompt.distance - 1e-9) best = { kind, prompt };
    }
    return best;
  }

  /**
   * D1: o que a bancada mostra do socorro («visível, não imunidade oculta»): cada caído com a janela aberta, o tempo que lhe resta, se o
   * local está seguro, quem o socorre e a distância de Piotr. Lista vazia se não há ninguém por socorrer.
   */
  rescueStatus() {
    const out = [];
    for (const a of this.allies) {
      if (!isRescuable(this, a)) continue;
      out.push({
        actorId: a.id,
        name: RESCUE_NAMES[a.id] ?? a.id,
        remainingSec: Number(Math.max(0, a.rescue.deadlineAt - this.clock).toFixed(1)),
        safe: rescueSpotIsSafe(this, a),
        by: a.rescue.by,
        lifting: a.rescue.liftStartedAt !== null,
        distanceFromPiotr: Number(Math.hypot(a.x - this.player.x, a.z - this.player.z).toFixed(1)),
        required: Object.hasOwn(M02_REQUIRED_CHARACTERS, a.id),
      });
    }
    return out;
  }

  /** C04 (Codex 5e8bbdbe): oferta opcional de água ao ferido desarmado, parado, ao alcance (1,8 m) e sem obstáculo entre os dois. */
  currentWoundedWaterPrompt({duringHandoff=false}={}) {
    if(this.activeCellId!=='A'||this.player.health<=0||this.playerGrenadeAction||this.player.carryingVolumeId||this.flags['m02.pomar_wounded_water']||
      this.playerWaterAction&&!duringHandoff||this.weapon.reloading||this.weapon.boltCycling)return null;
    const wounded=this.enemies.find(e=>e.c04Candidate&&e.alive&&e.state==='WOUNDED_UNARMED'&&e.c04WaterOfferedAt===undefined);
    if(!wounded)return null;
    const distance=Math.hypot(wounded.x-this.player.x,wounded.z-this.player.z);
    if(distance>1.8)return null;
    const origin=eyePosition(this.player),target={x:wounded.x,y:(wounded.y??0)+.7,z:wounded.z};
    const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z,length=Math.hypot(dx,dy,dz);
    if(length>1e-8&&traceObstruction(this.world,origin,{x:dx/length,y:dy/length,z:dz/length},Math.max(0,length-.05)))return null;
    return {actorId:wounded.id,distance:Number(distance.toFixed(2)),prompt:'[F] Dar água ao ferido'};
  }

  giveWoundedWater() {
    const prompt=this.currentWoundedWaterPrompt();if(!prompt)return null;
    this.playerWaterAction={actorId:prompt.actorId,startedAt:this.clock,finishAt:this.clock+M02_WATER_HANDOFF_SECONDS};
    const event={type:'c04-water-started',actorId:prompt.actorId,clock:Number(this.clock.toFixed(2))};
    this.events.push(event);return event;
  }

  finishWoundedWater() {
    const action=this.playerWaterAction,prompt=this.currentWoundedWaterPrompt({duringHandoff:true});
    if(!action||!prompt||prompt.actorId!==action.actorId||this.clock+1e-8<action.finishAt)return null;
    const wounded=this.enemies.find(e=>e.id===action.actorId);wounded.c04WaterOfferedAt=this.clock;this.flags['m02.pomar_wounded_water']=true;this.playerWaterAction=null;
    const event={type:'c04-wounded-water',actorId:wounded.id,clock:Number(this.clock.toFixed(2))};this.events.push(event);return event;
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
      // O [E] age sobre o alvo interativo mais próximo (currentInteractPrompt). Junto a um caído é socorrê-lo, só quando seguro (sem linha de
      // vista de nenhum hostil), com um levantar de cada vez e sem tirar a vez a um levantar em curso; nunca cai para uma porta mais longe.
      const target = this.currentInteractPrompt();
      if (target?.kind === 'rescue') {
        const r = target.prompt;
        return r.safe && !r.lifting && !r.allyLifting && !r.busy ? beginPlayerRescue(this, r.actorId) : null;
      }
      if (target?.kind === 'chalk') return this.markWoundedSoldierWithChalk();
      if (target?.kind === 'lis') return runContactLisInC11(this) ? { type: 'lis-contact', actorId: target.prompt.actorId } : null;
      if (target?.kind === 'volume' && runPickupSupplyVolume(this, target.prompt.volumeId)) {
        const evt = { type: 'supply-volume-picked', volumeId: target.prompt.volumeId, clock: this.clock };
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
        for(const key of ['hitAt','hitYaw','hitPart','diedAt','deathYaw'])if(tgt[key]!==undefined)en[key]=tgt[key];
      } else if (!en.alive && tgt.alive) {
        tgt.alive = false;
        tgt.health = 0;
        for(const key of ['hitAt','hitYaw','hitPart','diedAt','deathYaw'])if(en[key]!==undefined)tgt[key]=en[key];
      }
      if(en.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(en);
    }
  }

  /** Boca da MG34 (cópia nova de layout.mgEmplacement via mgState): única origem do raio de fogo, da avaliação e do rasto. */
  get mgMuzzle() {
    return m02MgMuzzle(this.mgState);
  }

  /** Centro do vão da MG34 (PDF «MG a (12,-30)»; x,z do layout) à altura da boca. */
  get mgAperture() {
    return { x: this.mgState.x, y: this.mgState.muzzleY, z: this.mgState.z };
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
    if (mgEnemy?.state==='FLEE_GRENADE' && mgEnemy.tacticalState==='TakeCoverGrenade') {
      return {mgActive:true,inArc:false,hasVisualLoS:false,canHitTarget:false,blockedById:'gunner_taking_cover',blockedByMaterial:null,distance:0};
    }

    // Boca no vão oeste de B02 (fonte única: layout.mgEmplacement; PDF F3 p. 24 «MG a (12,-30)»). A mesma origem serve a
    // avaliação, o disparo do artilheiro (fireActorBurst) e o rasto das rajadas.
    const muzzle = this.mgMuzzle;
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
    // Balística: qualquer sólido pára a bala (o vidro intacto também: a bala parte-o). Vista: o vidro intacto deixa ver
    // (BALLISTIC_MATERIAL_POLICY.glass.blocksSight = false), por isso o raio de vista ignora-o e continua a procurar atrás dele.
    const obstruction = traceObstruction(this.world, muzzle, dir, Math.max(0, dist - 0.15));
    const sightObstruction =
      obstruction && !this.world.materialBlocksSight(obstruction.material)
        ? this.world.traceSightObstruction(muzzle, dir, Math.max(0, dist - 0.15))
        : obstruction;
    const hasVisualLoS = inArc && !sightObstruction && this.world.lineOfSight(
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
      if (isNonCombatantTarget(targetActor)) {
        // I4 (p. 34): ver NON_COMBATANT_STATES (ferido, rendido ou retirado marcam; quem ainda recua, WITHDRAWING, não)
        this.flags['m02.fired_on_wounded'] = true;
        this.dialogue.trigger('bz39_c04_05', this, { allowRepeat: true });
        this.combatLog.push({
          clock: roundNoNegZero(this.clock, 2),
          type: 'player_fired_on_wounded',
          actorId: targetActor.id,
          state: targetActor.state,
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
        if(this.playerWaterAction?.actorId===targetActor.id)this.playerWaterAction=null;
      }
      if(targetActor.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(targetActor);
      recordM02Hit(targetActor,this.clock,origin,hit.part);
      this.syncCalibrationAndEnemies();
    }

    this.alertEnemiesBySound(this.player, 90);
    openPendingContact(this, 'player_shot');

    const material = hit?.material ?? 'air';
    const policy = BALLISTIC_MATERIAL_POLICY[material] ?? null;

    // Sem -0 no registo vivo (o save normaliza -0 para 0; com a dispersão M01 a direção pode dar -0): vivo = restaurado (FIX-2c).
    const record = {
      id: `shot_${this.shotLog.length + 1}`,
      clock: roundNoNegZero(this.clock, 3),
      origin: { x: roundNoNegZero(origin.x, 3), y: roundNoNegZero(origin.y, 3), z: roundNoNegZero(origin.z, 3) },
      direction: { x: roundNoNegZero(dir.x, 4), y: roundNoNegZero(dir.y, 4), z: roundNoNegZero(dir.z, 4) },
      hitKind: hit?.kind ?? 'none',
      hitId: hit?.kind === 'actor' ? hit.actor.id : (hit?.id ?? null),
      role: hit?.role ?? (hit?.kind === 'actor' ? 'target_actor' : null),
      part: hit?.part ?? null,
      material,
      materialLabel: policy?.label ?? material,
      blockedBySolid: hit?.kind === 'world',
      hitTarget: hit?.kind === 'actor',
      glassBrokenId,
      distance: hit ? roundNoNegZero(hit.distance, 3) : range,
      point: hit?.point
        ? {
            x: roundNoNegZero(hit.point.x, 3),
            y: roundNoNegZero(hit.point.y, 3),
            z: roundNoNegZero(hit.point.z, 3),
          }
        : {
            x: roundNoNegZero((origin.x + dir.x * range), 3),
            y: roundNoNegZero((origin.y + dir.y * range), 3),
            z: roundNoNegZero((origin.z + dir.z * range), 3),
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
    const roundsToFire = Math.min(shooter.mag, 1); // uma ronda por chamada; as seguintes saem em advanceActorBurst
    if (roundsToFire <= 0) return null;

    // D6: perfil de dificuldade (configuração). Só o fogo inimigo muda: o ciclo de fogo contra qualquer alvo da secção, a precisão
    // quando o alvo é Piotr, o dano que lhe chega e a regra F1. Em recruta todos os fatores são exatamente 1 e não há regra nova.
    const diff = this.difficulty;
    const enemyFire = side === 'enemy';
    const aimsAtPlayer = enemyFire && targetActor === this.player;
    // F1 conta TEMPO, não ticks (FIX-CD): o instante de um disparo é o nominal — o fim do ciclo de fogo (`nextFireAt`) quando ele
    // acabou dentro deste passo, senão o relógio. Antes contava o relógio do tick que processou o disparo e, em veterano, o 2.º impacto
    // de um Kar98k isolado (ciclo 0,775 s < graça 0,8 s) matava com dt 0,1/0,05 e não com 1/60.
    const tickStart = this.#tickStartClock ?? this.clock;
    const shotAt = shooter.nextFireAt > tickStart && shooter.nextFireAt <= this.clock ? shooter.nextFireAt : this.clock;
    if (aimsAtPlayer && diff.reactionGraceSec !== null) {
      // F1: o contacto deste atirador com Piotr conta-se desde a sua primeira rajada e quebra-se após um intervalo longo sem lhe disparar.
      const now = Number(shotAt.toFixed(3));
      const idle = shooter.aimLastAt == null || now - shooter.aimLastAt > M02_F1_TELEGRAPH_GAP_SEC;
      if (idle || shooter.aimEngagedAt == null) shooter.aimEngagedAt = now;
      shooter.aimLastAt = now;
    }
    // Uma ferida por rajada (M01 `burstWoundCap`): com a rajada emitida ronda a ronda, o dano já feito a Piotr viaja na rajada pendente.
    let burstDamageOnPlayer = pending?.damageOnPlayer ?? 0;

    shooter.mag -= roundsToFire;
    shooter.shotsFired = (shooter.shotsFired ?? 0) + roundsToFire;
    // O ciclo seguinte parte do instante nominal do disparo (shotAt), não do relógio do tick: senão o atraso 0..dt do 1.º disparo
    // propagava-se ao 2.º e a regra F1 voltava a depender do dt (FIX-CD2 P2).
    // Rajadas causais (Codex 702ced95): uma rajada é emitida ronda a ronda, cada uma no seu tick; as rondas seguintes herdam o fim
    // do ciclo da primeira (`burst.cooldownUntil`), por isso a cadência entre rajadas e o fator de dificuldade não mudam.
    shooter.lastShotAt = this.clock;
    shooter.nextFireAt = pending
      ? pending.cooldownUntil
      : Number((shotAt + prof.cycleSec * (enemyFire ? diff.cooldownScale : 1)).toFixed(3));
    if (!continuation) {
      shooter.burstSequence = (shooter.burstSequence ?? 0) + 1;
      shooter.burstStartedAt = this.clock;
    }

    const origin =
      shooter.weapon === 'mg34' && shooter.id === 'DE-A05'
        ? this.mgMuzzle
        : eyePosition(shooter);

    // Quem está fora da célula (Lis na ligação de C08-C10, J3) não está no mundo atual: as posições dele são as da célula anterior e
    // nenhum tiro ou rajada desta célula o atinge (antes protegia-o a imunidade `essential`, que já não existe).
    // O último grupo (LG01…LG12) é alvo a partir de C10 (C11, p. 14: «quem foi atingido permanece ferido ou morto»).
    // Presença (Codex 70c60315): m02ActorPresent também exclui evacuados e desaparecidos. A boca de fogo real (Codex) só serve a
    // apresentação e o teste de obstrução junto à arma; a origem balística continua a ser o olho (ou a boca da MG34 de B02).
    const aimYaw = Math.atan2(aimPoint.z - origin.z, aimPoint.x - origin.x);
    const aimPitch = Math.atan2(aimPoint.y - origin.y, Math.hypot(aimPoint.x - origin.x, aimPoint.z - origin.z));
    const muzzle = shooter.id === 'DE-A05' ? origin : muzzlePosition({ ...shooter, angle: aimYaw, pitch: aimPitch, aiming: true }, this.clock);
    const candidateTargets = (side === 'ally' ? this.enemies : [this.player, ...this.allies, ...lastGroupTargets(this)]).filter(m02ActorPresent);
    let hitAny = false;
    const traces=[];

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

      const hit = traceShot(this.world, origin, dir, candidateTargets, prof.range,muzzle);
      // Presentation receives the actual, spread/occlusion-resolved round. The
      // intended aim point below remains tactical memory, never an impact FX.
      traces.push({origin:{...muzzle},point:hit?.point?{...hit.point}:{x:origin.x+dir.x*prof.range,y:origin.y+dir.y*prof.range,z:origin.z+dir.z*prof.range},hitKind:hit?.kind??'none',hitId:hit?.kind==='actor'?hit.actor.id:null,material:hit?.kind==='actor'?'character':hit?.material??'air'});

      if (hit && hit.kind === 'world' && hit.material === 'glass' && hit.windowId) {
        this.world.setWindowState(hit.windowId, 'broken');
      }

      // Apply suppression to intended target when rounds hit or pass near their cover aperture
      if (targetActor && targetActor.alive && roundNearActor(origin,dir,hit,prof.range,targetActor)) {
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
        const victimWasAlive = victim.alive;
        const rawDmg = Math.round(prof.damage * (hit.multiplier ?? 1));
        // O fogo inimigo causa o dano do perfil (M02_ENEMY_HIT_DAMAGE_*) a quem atinge; ninguém tem imunidade (D1)
        let dmg = enemyFire ? Math.max(M02_ENEMY_HIT_DAMAGE_MIN, Math.round(rawDmg * M02_ENEMY_HIT_DAMAGE_FACTOR)) : rawDmg;
        if (enemyFire && victim === this.player) {
          dmg = Math.round(dmg * diff.damageTakenScale);
          // Uma ferida por rajada (M01 `burstWoundCap`): o que passa do teto da rajada já não conta.
          if (diff.burstDamageCap !== null) dmg = Math.max(0, Math.min(dmg, diff.burstDamageCap - burstDamageOnPlayer));
          burstDamageOnPlayer += dmg;
          // F1: o primeiro contacto de um atirador nunca mata; a vida fica em 1 até ele combater Piotr há `reactionGraceSec`.
          if (diff.reactionGraceSec !== null && victim.health - dmg <= 0) {
            const engagedFor = shooter.aimEngagedAt == null ? 0 : shotAt - shooter.aimEngagedAt;
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
          // D1 (PDF p. 16): sem imunidades ocultas. Antes os «essenciais» (Gruca, Lis, Szymczak) voltavam a 18 de vida e supressão total;
          // agora caem como qualquer outro (quem os faz falhar a missão é a regra visível `requiredCharacterOut`, não um truque).
          const stateBefore = victim.state;
          victim.alive = false;
          victim.state = side === 'ally' ? 'DEAD' : 'DOWN';
          // D1: o ferimento incapacitante de um aliado elegível admite socorro quando seguro (janela visível; ver RESCUE_* em m02-combat-ai.js)
          if (side === 'enemy' && this.allies.includes(victim)) openRescueWindow(this, victim, stateBefore);
          this.combatLog.push({
            clock: Number(this.clock.toFixed(2)),
            type: side === 'ally' ? 'ally_killed_enemy' : 'ally_down',
            shooterId: shooter.id,
            targetId: victim.id,
          });
        }
        if (side === 'enemy' && isLastGroupMember(this, victim)) {
          markLastGroupHit(this, victim, { wasAlive: victimWasAlive, shooterId: shooter.id, cause: 'fire' });
        }
        updateM02EvacuationWound(this,victim);
        if(victim===this.player&&victim.health<=0){this.cancelPlayerGrenade();this.playerWaterAction=null;}
        if(victim.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(victim);
        recordM02Hit(victim,this.clock,origin,hit.part);
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
      interval: pending?.interval??prof.burstGapSec,
      hitAny,
      traces,
      origin:muzzle,
      target: aimPoint,
      clock: Number(this.clock.toFixed(2)),
    };
    this.events.push(evt);
    if (pending) pending.damageOnPlayer = burstDamageOnPlayer;
    if (!continuation && planned > 1) {
      shooter.burst = {
        remaining: planned - 1,
        totalRounds: planned,
        emitted: 1,
        interval: prof.burstGapSec,
        nextAt: this.clock + prof.burstGapSec,
        cooldownUntil: shooter.nextFireAt,
        targetId: targetActor?.id ?? null,
        aimPoint: { ...aimPoint },
        side,
        damageOnPlayer: burstDamageOnPlayer,
      };
    }
    return evt;
  }

  advanceActorBurst(shooter){
    const burst=shooter.burst;
    if(!burst)return;
    if(!shooter.alive||shooter.nonCombatant||shooter.suppressed>=.88||shooter.reloadingUntil>this.clock||shooter.mag<=0){shooter.burst=null;return;}
    const candidates=burst.side==='ally'?this.enemies:[this.player,...this.allies,...m02ExposedLastGroup(this)];
    const target=candidates.find(a=>a.id===burst.targetId)??null;
    if(target&&(target.nonCombatant||!m02ActorPresent(target))){shooter.burst=null;return;}
    // D2: a secção deixa recuar o posto EA0 (não o persegue a tiro): uma rajada aliada em curso pára quando o alvo começa a recuar.
    if(burst.side==='ally'&&target?.state==='WITHDRAWING'){shooter.burst=null;return;}
    // Last observed point, not the hidden target's current coordinates. Every
    // round reuses the existing world/actor ray test at its own simulation tick.
    while(burst.remaining>0&&this.clock+1e-8>=burst.nextAt){
      // Teammates can move after the opening round. Apply the existing
      // clearance rule at each actual round, before spending its ammo.
      if(burst.side==='ally'&&!friendlyFireClear(shooter,burst.aimPoint,[this.player,...this.allies])){shooter.burst=null;return;}
      if(!this.fireActorBurst(shooter,target,burst.aimPoint,burst.side,{continuation:true}))break;
      burst.remaining--;burst.emitted++;
      burst.nextAt=Number((burst.nextAt+(burst.interval??WEAPON_PROFILES[shooter.weapon]?.burstGapSec??0)).toFixed(6));
      if(target?.nonCombatant)break;
    }
    if(burst.remaining<=0||target?.nonCombatant)shooter.burst=null;
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

  /**
   * Granada do jogador em duas fases (Codex 379f1c0b): o toque reserva UMA granada e a mão da M01 prepara-a durante
   * M02_GRENADE_PREPARE_SECONDS de tempo de missão (não de render); durante a recarga fica em espera e começa quando a arma acaba.
   */
  preparePlayerGrenade() {
    if (this.playerGrenadeAction || this.playerWaterAction || this.grenadeAmmo <= 0 || this.player.health <= 0 || this.player.carryingVolumeId) return false;
    this.grenadeAmmo--;
    // C01/C06: a granada de Piotr abre o contacto já no compromisso (a iniciativa é dele), não só na largada 0,5 s depois.
    openPendingContact(this, 'player_grenade');
    const startedAt = this.weapon.boltCycling ? Math.max(this.clock, this.weapon.until / 1000) : this.clock;
    this.playerGrenadeAction = this.weapon.reloading
      ? { startedAt: null, releaseAt: null, waitingForReload: true }
      : { startedAt, releaseAt: startedAt + M02_GRENADE_PREPARE_SECONDS };
    this.events.push({ type: 'grenade-preparing', throwerId: this.player.id, clock: this.clock });
    if (!this.playerGrenadeAction.waitingForReload && startedAt <= this.clock + 1e-8)
      this.events.push({ type: 'grenade-handling-started', throwerId: this.player.id, clock: this.clock });
    return true;
  }

  /** Cancela a granada reservada (Piotr caído ou a carregar um volume) e devolve-a à munição. */
  cancelPlayerGrenade() {
    if (!this.playerGrenadeAction) return false;
    this.playerGrenadeAction = null;
    this.grenadeAmmo++;
    return true;
  }

  // Granada do jogador (ou de teste, com origem própria): rastilho de 2 s, sem aviso. As granadas inimigas não passam por aqui:
  // têm o aviso de 5-8 s de D5 (`throwEnemyGrenade`). `reserved`: a largada da granada preparada (a munição já foi gasta).
  throwGrenade(customOrigin = null, customDir = null, { reserved = false } = {}) {
    if (reserved && (customOrigin || !this.playerGrenadeAction || !Number.isFinite(this.playerGrenadeAction.releaseAt) || this.clock + 1e-8 < this.playerGrenadeAction.releaseAt)) return null;
    if (!customOrigin && !reserved && (this.playerGrenadeAction || this.grenadeAmmo <= 0)) return null;
    if (!customOrigin && !reserved) {
      this.grenadeAmmo--;
      openPendingContact(this, 'player_grenade');
    }

    const eye = customOrigin ?? eyePosition(this.player);
    const rawDir = customDir ?? aimDirection(this.player.angle, this.player.pitch);
    const len = Math.hypot(rawDir.x, rawDir.y, rawDir.z) || 1;
    const dir = { x: rawDir.x / len, y: rawDir.y / len, z: rawDir.z / len };
    const speed = 15.0;
    // The player release follows the hand's view-frame endpoint. The direct
    // calibration API retains its original .45 m ray. Both paths trace from
    // the eye so a grenade cannot spawn on the far side of a solid wall.
    let releaseDir=dir,releaseLength=.45;
    if(reserved){
      const right={x:-Math.sin(this.player.angle),y:0,z:Math.cos(this.player.angle)};
      const up={x:-Math.cos(this.player.angle)*Math.sin(this.player.pitch),y:Math.cos(this.player.pitch),z:-Math.sin(this.player.angle)*Math.sin(this.player.pitch)};
      const offset={x:dir.x*M02_GRENADE_RELEASE_VIEW.forward+right.x*M02_GRENADE_RELEASE_VIEW.right+up.x*M02_GRENADE_RELEASE_VIEW.up,
        y:dir.y*M02_GRENADE_RELEASE_VIEW.forward+right.y*M02_GRENADE_RELEASE_VIEW.right+up.y*M02_GRENADE_RELEASE_VIEW.up,
        z:dir.z*M02_GRENADE_RELEASE_VIEW.forward+right.z*M02_GRENADE_RELEASE_VIEW.right+up.z*M02_GRENADE_RELEASE_VIEW.up};
      releaseLength=Math.hypot(offset.x,offset.y,offset.z);releaseDir={x:offset.x/releaseLength,y:offset.y/releaseLength,z:offset.z/releaseLength};
    }
    const obstruction=traceObstruction(this.world,eye,releaseDir,releaseLength);
    const releaseDistance=obstruction?Math.max(0,obstruction.distance-.002):releaseLength;

    const g = {
      id: `gren_${++this.grenadeSeq}`,
      x: eye.x + releaseDir.x * releaseDistance,
      y: eye.y + releaseDir.y * releaseDistance,
      z: eye.z + releaseDir.z * releaseDistance,
      vx: dir.x * speed,
      vy: dir.y * speed + 2.8,
      vz: dir.z * speed,
      spawnedAt: Number(this.clock.toFixed(3)),
      fuseAt: Number((this.clock + 2.0).toFixed(3)),
      exploded: false,
      ...(reserved?{releaseView:{angle:this.player.angle,pitch:this.player.pitch}}:{}),
    };
    if(reserved)this.playerGrenadeAction=null;
    this.grenades.push(g);
    this.events.push({ type: 'grenade-thrown', grenade: { ...g }, clock: this.clock, throwerId: customOrigin ? null : this.player.id });
    return g;
  }

  /**
   * Explosão no mundo. `meta` (só nas explosões perigosas agendadas, D5: artilharia scriptada e granada inimiga) acrescenta ao
   * registo a fonte, o aviso que a anunciou e quem a lançou; sem `meta` o registo é o de sempre (granada do jogador).
   */
  detonateGrenadeAt(x, y, z, radius = 6.5, meta = null) {
    // Ação atómica (FIX-CD): chamada fora do tick (bancada), os checkpoints que ela pede gravam-se no fim, depois de avaliada a falha.
    return this.#runCheckpointBatch(() => this.#detonate(x, y, z, radius, meta));
  }

  #detonate(x, y, z, radius, meta) {
    const center = { x, y: Math.max(this.world.heightAt(x, z) + 0.35, y), z };
    const worldChanges = this.world.applyExplosionDamageToWorld(center, Math.min(radius, 5.5));
    this.navigator.sync();

    const affectedActors = [];
    const allActors = [this.player, ...this.allies, ...lastGroupTargets(this), ...this.enemies];
    for (const actor of allActors) {
      if (!m02ActorPresent(actor) || !actor.alive) continue; // fora da célula (J3), evacuado ou desaparecido: a explosão desta célula não o alcança
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
        const actorWasAlive = actor.alive;
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
          // D1 (PDF p. 16): sem imunidades ocultas (antes os «essenciais» ficavam a 20 de vida).
          actor.alive = false;
          actor.state = 'DEAD';
        }
        if (isLastGroupMember(this, actor)) {
          markLastGroupHit(this, actor, { wasAlive: actorWasAlive, shooterId: meta?.thrownBy ?? null, cause: 'blast' });
        }
        updateM02EvacuationWound(this,actor);
        if(actor===this.player&&actor.health<=0){this.cancelPlayerGrenade();this.playerWaterAction=null;}
        if(actor.m02GrenadeThreat)m02ClearIncapableGrenadeThreat(actor);
        affectedActors.push({ id: actor.id, blockedByWall: false, damage, alive: actor.alive });
        if(damage>0)recordM02Hit(actor,this.clock,center);
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
    const warnedAt = instantAt(this.clock); // nunca à frente do relógio: o validador recusa warnedAt > clock (FIX-CD)
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

  updateGrenades(dt, justReleasedId = null) {
    for (const g of this.grenades) {
      if (g.exploded) continue;
      // The new projectile is created at this tick's end, so no part of this
      // tick's elapsed time belongs to it. Existing and restored projectiles
      // keep the original integration, including legacy rounded timestamps.
      if(g.id===justReleasedId)continue;
      const impact=stepM02Grenade(this.world,g,dt);
      // Sub-threshold contacts include resting/settling and must not create a
      // continuous rattle or consume the presentation's limited voice pool.
      if(impact&&impact.speed>=1.2)this.events.push({type:'grenade-bounced',grenadeId:g.id,
        point:impact.point,material:impact.material,speed:impact.speed,clock:Number(this.clock.toFixed(3))});

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
      // FIX-CD: depois da falha não se pedem checkpoints (antes, a cada tick, um `checkpoint-rejected` repetido: 368 em 70 s).
      if (this.missionFailed) return;
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
      this.flags['m02.malek_status'] = malek.state === 'EVACUATED' ? 'evacuated' : !malek.alive || malek.state === 'DOWN' ? 'down' : malek.health < 70 ? 'shaken' : 'fit';
    }
    const wierzba = this.allies.find((a) => a.id === 'pl_wierzba');
    if (wierzba) {
      this.flags['m02.wierzba_status'] = wierzba.state === 'EVACUATED' ? 'evacuated' : !wierzba.alive || wierzba.state === 'DOWN' ? 'down' : wierzba.health < 65 ? 'wounded' : 'fit';
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
        // cp_m02_a_preparacao já não se grava aqui (EA1 a entrar em combate): é «antes do contacto», no fim de C01 (FIX-CD, I3 p. 33).
        // Nota (FIX-CD2): só chega à loja se o jogador avança antes do contacto; no arranque C02 por omissão ou com contacto antes de andar, o
        // reinício cai no início em memória (`source: 'start'`), equivalente. Ver docs/m02/M02_SAVE_ENVELOPE_PROPOSAL.md §5.
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
      this.objective.title = 'C04 (Pomar Sul): Reagrupar e avançar; ajudar o ferido é opcional';
      this.objective.status = 'active';
    } else if (mgNeutralized || b01DefendersDown) {
      this.objective.id = 'O03';
      this.objective.title = `Consolidar o pátio da quinta e neutralizar a guarnição restante (${activeCombatDefenders.length} ativos)`;
      this.objective.status = 'active';
    } else if (
      this.routeProgress.activeRoute !== 'none' ||
      this.routeProgress.visitedBuildings.B01 ||
      pz > -62 ||
      this.allies.some((a) => a.alive && m02ActorPresent(a) && a.z > -62)
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
   * D1: falha dura da missão. Escreve `missionFailed` uma só vez, com o relógio do instante, quando (1) Piotr morre (saúde a 0 ou
   * `alive` falso: tiro, explosão ou queda) → `piotr_killed`; ou (2) uma personagem exigida pelo cânone fica fora de combate
   * antes do seu ponto de resolução (`requiredCharacterOut`, tabela M02_REQUIRED_CHARACTERS) → `required_character_incapacitated`
   * com o `actorId`. A morte de Piotr tem precedência. Nunca depois de a missão estar concluída (o epílogo C12 é uma elipse sem combate).
   * Avaliado no fim dos sistemas de combate e ANTES do roteiro: o roteiro não avança no tick em que a falha acontece.
   * Com a missão falhada o roteiro e os checkpoints param (automáticos e manuais); quem hospeda a simulação (a bancada) deve
   * deixar de a avançar e mostrar a falha, mas a simulação não se auto-congela: os testes de mundo continuam a poder andar.
   */
  #evaluateMissionFailure() {
    if (this.missionFailed || this.flags['m02.completed'] || this.areaC?.c12Completed) return;
    const p = this.player;
    let failure = null;
    if (p.alive === false || !(p.health > 0)) {
      failure = { reason: 'piotr_killed' };
    } else {
      // D1: só falha quando a personagem exigida fica incapacitada SEM socorro possível (janela esgotada, morta por explosão, socorro gasto)
      const actorId = requiredCharacterOut(this, { unlessRescuable: true });
      if (actorId) failure = { reason: 'required_character_incapacitated', actorId };
    }
    if (!failure) return;
    const at = instantAt(this.clock); // nunca à frente do relógio (o validador recusa missionFailed.at > clock; FIX-CD)
    this.missionFailed = { reason: failure.reason, at, ...(failure.actorId ? { actorId: failure.actorId } : {}) };
    const who = failure.actorId ? { actorId: failure.actorId } : {};
    this.combatLog.push({ clock: Number(this.clock.toFixed(2)), type: 'mission_failed', reason: failure.reason, ...who });
    this.events.push({ type: 'mission-failed', reason: failure.reason, ...who, at, clock: this.clock });
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
  requestAutoCheckpoint(checkpointId, { deferWhileOut = false } = {}) {
    if (this.missionFailed) return this.#rejectCheckpointOnFailure(checkpointId);
    // D1: nunca um ponto de reinício com a personagem exigida fora de combate (o validador recusava-o, a cada pedido, com ruído): enquanto
    // ela espera socorro os pedidos REPETIDOS (cp_b, cp_d: refeitos a cada passo) adiam-se em silêncio e voltam a ser feitos quando se levantar.
    // Um pedido de UMA SÓ VEZ (`deferWhileOut`: cp_c, completeC07Reorganization é idempotente) não se perde: fica pendente e grava-se no fim do
    // primeiro passo/ação em que a personagem se levantou; se a missão falha antes, cai com o evento `checkpoint-rejected` (como qualquer outro).
    if (requiredCharacterOut(this, { ignoreCompletion: true })) {
      if (deferWhileOut && !this.#deferredCheckpointIds.includes(checkpointId)) this.#deferredCheckpointIds.push(checkpointId);
      return null;
    }
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
        let due = this.#pendingCheckpointIds;
        this.#pendingCheckpointIds = [];
        // FIX-CD: a falha avalia-se no fim de cada passo/ação atómica, ANTES de gravar. Uma ação de bancada fora do tick (p. ex. uma
        // explosão que mata Piotr e o último defensor) gravava cp_m02_b_acesso com Piotr morto, porque a falha só se avaliava em #step.
        if (completed) this.#evaluateMissionFailure();
        // Pedidos de uma só vez adiados enquanto a personagem exigida esperava socorro: saem com ela de pé (ou rejeitados, se a missão falhou).
        if (completed && this.#deferredCheckpointIds.length > 0 && (this.missionFailed || !requiredCharacterOut(this, { ignoreCompletion: true }))) {
          due = [...this.#deferredCheckpointIds.filter((id) => !due.includes(id)), ...due];
          this.#deferredCheckpointIds = [];
        }
        // Um passo que lançou a meio deixou estado incoerente: os pedidos desse passo são descartados, não gravados.
        if (completed) this.#saveCheckpointBatch(due);
      }
    }
  }

  #step(dt, controls) {
    this.#tickStartClock = this.clock;
    try {
      this.#stepBody(dt, controls);
    } finally {
      this.#tickStartClock = null;
    }
  }

  #stepBody(dt, controls) {
    const previousClock=this.clock;
    this.clock += dt;
    const nowMs = this.clock * 1000;
    const preparingGrenade=Boolean(this.playerGrenadeAction);
    if(this.playerWaterAction&&(Math.hypot(controls.forward??0,controls.side??0)>.1||controls.fire||controls.grenade||
      !this.currentWoundedWaterPrompt({duringHandoff:true})))this.playerWaterAction=null;

    if (controls.lookX) this.player.angle += controls.lookX;
    if (controls.lookY) {
      this.player.pitch = Math.max(-1.35, Math.min(1.35, this.player.pitch - controls.lookY));
    }

    if (controls.crouch) {
      this.player.crouched = !this.player.crouched;
      this.player.eyeHeight = this.player.crouched ? 1.08 : EYE_HEIGHT;
    }

    this.player.aiming = !preparingGrenade&&Boolean(controls.aim);
    const forward = controls.forward ?? 0;
    const side = controls.side ?? 0;
    const inputLen = Math.hypot(forward, side);
    const movementStartX=this.player.x,movementStartZ=this.player.z;
    this.player.moving = inputLen > 1e-3;
    this.player.sprinting =
      !preparingGrenade&&Boolean(controls.sprint) && !this.player.crouched && !this.player.aiming && forward > 0.1;

    let landing;
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
      landing = movePlayer(this.world, this.player, dx, dz, dt);
    } else {
      landing = movePlayer(this.world, this.player, 0, 0, dt);
    }
    if (landing && landing.damage > 0) {
      this.player.health = Math.max(0, this.player.health - landing.damage);
      this.events.push({ type: 'player-landing', ...landing, clock: this.clock });
    }

    this.weapon.update(nowMs);
    if (this.playerGrenadeAction?.waitingForReload && !this.weapon.reloading) {
      this.playerGrenadeAction = { startedAt: this.clock, releaseAt: this.clock + M02_GRENADE_PREPARE_SECONDS };
    }
    this.player.moving = Math.hypot(this.player.x - movementStartX, this.player.z - movementStartZ) > 1e-5;
    if (!this.player.moving) this.player.sprinting = false;
    if (this.player.health <= 0 || this.player.carryingVolumeId) this.cancelPlayerGrenade();
    // C04 (Codex 5e8bbdbe/34216645): dar água ao ferido é opcional, parado e de mãos livres; dura M02_WATER_HANDOFF_SECONDS.
    if (!preparingGrenade && controls.giveWater && !controls.fire && !controls.grenade && !controls.reload && inputLen <= 0.1) this.giveWoundedWater();
    const preparingWater = Boolean(this.playerWaterAction);
    if (preparingWater) {
      this.player.aiming = false;
      this.player.sprinting = false;
    }
    const handsFree = !preparingGrenade && !preparingWater;
    if (handsFree && controls.reload) this.weapon.reload(nowMs);
    if (handsFree && controls.sight) this.weapon.adjustSight();
    if (handsFree && controls.interact) this.interactDoor();
    // Fogo pelos controlos: dispersão M01 (anca/mira/movimento, Codex 702ced95); o raio exato fica para a bancada de calibração.
    const shot = handsFree && controls.fire ? this.firePlayerWeapon(false) : null;
    if (handsFree && controls.grenade && !shot && this.preparePlayerGrenade()) {
      this.player.aiming = false;
      this.player.sprinting = false;
    }
    // A largada só acontece quando o instante reservado é atravessado no relógio da missão: uma vez só, com pausa, frames lentos
    // ou restauro de checkpoint.
    const action = this.playerGrenadeAction;
    if (this.playerWaterAction && this.clock + 1e-8 >= this.playerWaterAction.finishAt) this.finishWoundedWater();
    if (preparingGrenade && action && !action.waitingForReload && action.startedAt > previousClock + 1e-8 && action.startedAt <= this.clock + 1e-8)
      this.events.push({ type: 'grenade-handling-started', throwerId: this.player.id, clock: this.clock });
    const released =
      this.playerGrenadeAction && !this.playerGrenadeAction.waitingForReload && this.clock + 1e-8 >= this.playerGrenadeAction.releaseAt
        ? this.throwGrenade(null, null, { reserved: true })
        : null;
    if (controls.orderCover) this.issueSquadOrder('cover');
    if (controls.orderAdvance) this.issueSquadOrder('advance');

    runUpdateC01Contact(this);
    runUpdateAreaBContact(this);
    this.updateGrenades(dt, released?.id);
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
    if (this.playerWaterAction && !this.currentWoundedWaterPrompt({ duringHandoff: true })) this.playerWaterAction = null;
    this.#evaluateMissionFailure();
    runUpdateScript(this);

    if (this.mgState.seeingPlayer && this.clock >= this.mgState.nextBurstAt) {
      this.mgState.burstsFired++;
      this.mgState.nextBurstAt = this.clock + this.mgState.cooldown;
      this.player.suppressed = Math.min(1, this.player.suppressed + 0.35);
      this.events.push({
        type: 'mg-burst',
        sourceId: this.mgState.id,
        origin: this.mgMuzzle,
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
    // último, tirava ao jogador o ponto de reinício bom. A falha avalia-se aqui também (F5 fora do tick com Piotr já morto; FIX-CD).
    this.#evaluateMissionFailure();
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
   * Carregamento rápido (F9 da bancada e «Reiniciar do último checkpoint»). Ordem de recurso, saltando as entradas que não se
   * deixam restaurar (incompatíveis ou inválidas; FIX-2c): 1) o último gravado nesta sessão, automático ou F5 (o mais recente);
   * 2) o checkpoint manual desta sessão; 3) o último gravado na loja persistida (página acabada de abrir ou recarregada); 4) o
   * checkpoint manual da loja; 5) o início em memória. FIX-CD: antes o F5 da sessão vinha primeiro, mesmo antigo, e o reinício
   * voltava para trás de checkpoints automáticos mais recentes.
   * Devolve { checkpointId, source } e, se saltou alguma entrada, `skipped: [{ checkpointId, source, reason }]`.
   */
  quickLoadCheckpoint() {
    const attempts = [];
    const add = (checkpointId, source, restore) => {
      if (checkpointId && !attempts.some((a) => a.checkpointId === checkpointId && a.source === source)) {
        attempts.push({ checkpointId, source, restore });
      }
    };
    add(this.#lastSessionCheckpointId, 'session', (id) => this.restoreCheckpoint(id));
    if (this.checkpoints.has('cp_m02_manual')) add('cp_m02_manual', 'session', (id) => this.restoreCheckpoint(id));
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
    // Início em memória: foi gravado em reset() com o perfil de então (p. ex. recruta, se setDifficulty veio depois do construtor).
    // O perfil escolhido na configuração sobrevive ao reinício para o início (FIX-CD2); os checkpoints gravados repõem o seu próprio.
    const activeDifficulty = this.#difficultyId;
    this.restoreCheckpoint('cp_m02_a_preparacao');
    this.#difficultyId = activeDifficulty;
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
      // D6 (FIX-CD, como a M01): o perfil muda o resultado da simulação; omitido em recruta (saves de recruta iguais byte a byte).
      ...(this.#difficultyId !== M02_DIFFICULTY_SIM_DEFAULT ? { difficulty: this.#difficultyId } : {}),
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
      ...(this.playerGrenadeAction?{playerGrenadeAction:structuredClone(this.playerGrenadeAction)}:{}),
      ...(this.playerWaterAction?{playerWaterAction:structuredClone(this.playerWaterAction)}:{}),
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
      difficulty: snap.difficulty ?? M02_DIFFICULTY_SIM_DEFAULT, // save sem o campo (anterior ao FIX-CD ou de recruta): recruta
      clock: snap.clock,
      cellId: snap.activeCellId,
      worldRevision: snap.world.revision,
      player: snap.player,
      weapon: snap.weapon,
      grenadeAmmo: snap.grenadeAmmo,
      grenades: snap.grenades,
      grenadeSeq: snap.grenadeSeq,
      // Codex: granada preparada na mão e água a ser dada em C04 (campos aditivos; ausentes = nenhuma ação em curso).
      playerGrenadeAction: snap.playerGrenadeAction ?? null,
      playerWaterAction: snap.playerWaterAction ?? null,
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
    this.#deferredCheckpointIds = [];
    // O retorno da última ordem (fora do snapshot) também: com o relógio a recuar, a bancada mostrava a recusa antiga (FIX-CD).
    this.#lastOrderFeedback = null;
    this.seed = p.seed;
    this.#difficultyId = resolveM02Difficulty(p.difficulty).id;
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
    this.playerGrenadeAction = p.playerGrenadeAction;
    this.playerWaterAction = p.playerWaterAction;
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
    // Codex (a876bf3a): a T-AB é sempre uma transição intermédia, também nos saves antigos (cópia preparada; o save não muda).
    if (this.transitionTABPayload?.flags?.['m02.completed']) this.transitionTABPayload.flags['m02.completed'] = false;
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
