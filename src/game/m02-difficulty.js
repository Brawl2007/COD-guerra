// M02 D6 (PDF p. 18): perfis de dificuldade. A M02 usa os MESMOS ids que a M01 (recruta | soldado | veterano) e deriva os
// multiplicadores da tabela da M01 (src/game/m01-difficulty.js, desenho H9/D35), importada, não copiada: se a M01 recalibrar um
// valor, a M02 acompanha. O PDF chama-lhes Acessível / Padrão / Exigente; o proprietário fixou os ids da M01 para a campanha toda.
//
// O perfil escolhe-se na configuração (construtor/setDifficulty) e é determinista (nenhum perfil faz sorteios; os multiplicadores
// actuam depois dos sorteios). Como na M01 (H9 D1), entra no snapshot — muda o resultado da simulação — no campo `difficulty`, omitido
// em recruta, e é reposto pelo restauro (FIX-CD). As opções de acessibilidade continuam fora do snapshot (I5).
//
// O que cada id faz na M02 (só o fogo INIMIGO muda; a secção polaca, os alvos de calibração e as regras de objetivos não):
//   damageTakenScale  x o dano de cada bala/estilhaço inimigo que atinge Piotr. A referência é o tiro de Kar98k ao tronco da
//                     afinação de protótipo da M02: round(46 x 0,35) = 16. Em soldado e veterano é o `woundDamage` da M01 (34 e 50),
//                     ou seja, um tiro ao tronco é uma «ferida» da M01. recruta = 1: a afinação de protótipo actual, byte a byte.
//   burstDamageCap    o máximo de dano que UMA rajada pode causar a Piotr: `burstWoundCap` x `woundDamage` da M01 (uma ferida por
//                     rajada de MG34); null = sem teto (recruta).
//   aimErrorScale     x a dispersão do fogo inimigo apontado a Piotr (M01: 1 | 0,35 | 0,35). Fogo contra a secção não muda
//                     (a M01 também só o aplica aos tipos `player`/`cover`).
//   cooldownScale     x o ciclo de fogo de um hostil (M01: 1 | 0,5 | 0,5), contra Piotr ou contra a secção (os tipos da margem oeste da M01).
//   reactionGraceSec  regra de morte justa F1 da M01: uma bala só leva Piotr a 0 se o MESMO atirador o combate há esse tempo; senão
//                     a vida fica em 1. Sem sorteios. null = sem regra (recruta). O contacto de um atirador conta-se desde a sua
//                     primeira rajada a Piotr e quebra-se após F1_TELEGRAPH_GAP_SEC (6 s) sem lhe disparar. Conta tempo nominal dos
//                     disparos (fim do ciclo de fogo), não ticks: o resultado não depende do dt (FIX-CD).
// NÃO mapeado (a M02 não o tem, ou o PDF da M02 o contraria): `woundChance` (a M02 resolve o acerto por geometria, não por sorteio),
// `healing` e `hpOnCheckpoint` (D6/C7: «água e material sanitário não são poções de regeneração instantânea», «não se concede cura
// total»), `kowalRounds`, `rifleGateEastThreshold`, `spansPickPlayerThreshold`, `deEast0Repair` e `coverAdjustSalvoSec` (cenários
// da ponte de Tczew), `loadout` (a M02 usa 5+45, a M01 5+40) e `bombsLethal`.
// Dado puro e funções puras. Importa só a M01 (folha): não importa m02-combat-ai.js (evita o ciclo); as constantes do tiro de
// referência ficam aqui e um teste confirma que batem com WEAPON_PROFILES.
import {
  M01_DIFFICULTY,
  M01_DIFFICULTY_IDS,
  M01_DIFFICULTY_NEW_GAME,
  M01_DIFFICULTY_SIM_DEFAULT,
  F1_TELEGRAPH_GAP_SEC,
} from './m01-difficulty.js';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
};

export const M02_DIFFICULTY_IDS = M01_DIFFICULTY_IDS;
/** O perfil de `new M02BenchSimulation(seed)`: a afinação de protótipo actual (todos os multiplicadores 1), que os testes e A/B usam. */
export const M02_DIFFICULTY_SIM_DEFAULT = M01_DIFFICULTY_SIM_DEFAULT;
/** O perfil que a M01 oferece a um jogo novo (o seletor do menu); a bancada da M02 ainda não tem seletor. */
export const M02_DIFFICULTY_NEW_GAME = M01_DIFFICULTY_NEW_GAME;
/** Intervalo sem disparar a Piotr que quebra o contacto de um atirador (regra F1 da M01). */
export const M02_F1_TELEGRAPH_GAP_SEC = F1_TELEGRAPH_GAP_SEC;

/** Afinação de protótipo do dano inimigo sobre Piotr e a secção (`fireActorBurst`): round(dano da arma x parte do corpo x 0,35), mínimo 6. */
export const M02_ENEMY_HIT_DAMAGE_FACTOR = 0.35;
export const M02_ENEMY_HIT_DAMAGE_MIN = 6;
/** Tiro de referência: Kar98k (46) ao tronco (x1) = round(46 x 0,35) = 16. Um teste confirma-o contra WEAPON_PROFILES.kar98k. */
export const M02_REFERENCE_RIFLE_HIT = 16;
/** Vida máxima de Piotr (os «impactos para morrer» documentados contam-se sobre ela). */
export const M02_PLAYER_MAX_HEALTH = 100;

function deriveProfile(id) {
  const m01 = M01_DIFFICULTY[id];
  const prototype = id === M01_DIFFICULTY_SIM_DEFAULT;
  // Um tiro de Kar98k ao tronco: o dano de protótipo em recruta; em soldado e veterano a «ferida» da M01.
  const rifleTorsoHit = prototype ? M02_REFERENCE_RIFLE_HIT : m01.woundDamage;
  return {
    id,
    damageTakenScale: rifleTorsoHit / M02_REFERENCE_RIFLE_HIT,
    burstDamageCap: m01.burstWoundCap === null ? null : m01.burstWoundCap * rifleTorsoHit,
    aimErrorScale: m01.aimErrorScale,
    cooldownScale: m01.cooldownScale,
    reactionGraceSec: m01.reactionGraceSec,
    // Valor documentado do perfil (derivado, não lido pelo jogo): dano de um tiro de Kar98k ao tronco e impactos para matar Piotr.
    rifleTorsoHit,
    rifleHitsToKill: Math.ceil(M02_PLAYER_MAX_HEALTH / rifleTorsoHit),
  };
}

export const M02_DIFFICULTY = deepFreeze(Object.fromEntries(M02_DIFFICULTY_IDS.map((id) => [id, deriveProfile(id)])));

/** O perfil de um id, ou RangeError se o id não é um dos da M01. */
export function resolveM02Difficulty(id) {
  const profile = Object.hasOwn(M02_DIFFICULTY, id) ? M02_DIFFICULTY[id] : null;
  if (!profile) {
    throw new RangeError(`Perfil de dificuldade desconhecido: ${String(id)} (válidos: ${M02_DIFFICULTY_IDS.join(', ')})`);
  }
  return profile;
}
