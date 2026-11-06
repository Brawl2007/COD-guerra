import { eyePosition } from '../world/spatial.js';
import { movePlayer, PLAYER_PHYSICS } from '../world/m01-player-physics.js';
import cellsBCLayout from '../../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };

/**
 * Arredonda a `digits` casas SEM devolver -0 (Number((-0.001).toFixed(2)) é -0). O JSON do save não representa -0 e o
 * snapshot normaliza-o para 0; um -0 no estado vivo que chegue a Math.atan2 dá -π onde o estado restaurado dá +π (FIX-2c).
 */
export function roundNoNegZero(value, digits = 2) {
  return Number(value.toFixed(digits)) + 0;
}

/**
 * Instante PASSADO gravado pela simulação (início de cena, aviso de explosão, falha da missão, início do recuo do EA0), em ms
 * arredondados para BAIXO. O validador recusa um instante à frente do relógio do snapshot (`> clock + 1e-9`); `toFixed(3)` arredondava
 * para cima e, com o dt real de um frame (1/60 s), metade das transições de cena gravava um instante 0,1-0,5 ms à frente do relógio:
 * o checkpoint desse passo era recusado e perdia-se (FIX-CD). Instantes futuros (impacto, próximo tiro, contacto agendado) não passam por aqui.
 */
export function instantAt(clock) {
  const ms = Math.floor(clock * 1000);
  const t = ms / 1000;
  return t > clock ? (ms - 1) / 1000 : t;
}

/**
 * C11 (PDF p. 14): «Quem foi atingido permanece ferido ou morto» e «não há mínimo artificial de dez sobreviventes». O último grupo
 * (LG01…LG12) é alvo do fogo e das explosões a partir de C10 (o renderer só o mostra desde então), enquanto está vivo e não chegou ao ponto
 * de evacuação (quem chegou já está fora do perigo). Antes não estava em nenhuma lista de alvos: era invulnerável (sempre 12/12).
 */
export function lastGroupTargets(sim) {
  // (C12 é uma elipse sem combate: depois do fecho o grupo já não leva fogo, e o resumo de C12 fica exato quanto aos mortos)
  if (sim.activeCellId !== 'C' || !sim.areaC?.c10Started || sim.areaC.c12Completed) return [];
  return sim.areaC.lastGroup.filter((lg) => lg.alive && !lg.evacuated);
}

/** C06: a janela de segurança da entrada em B ainda não terminou (EB1 «sem alerta»; um save anterior, sem `areaB.contact`, não a tem). */
export function areaBContactPending(sim) {
  const c = sim.areaB?.contact;
  return sim.activeCellId === 'B' && Boolean(sim.areaB?.active) && Boolean(c) && !c.opened;
}

export function isLastGroupMember(sim, actor) {
  return Boolean(sim.areaC?.lastGroup?.includes(actor));
}

/**
 * I4 (PDF p. 34) `m02.fired_on_wounded`: «ação explícita após estado não combatente», «consequência de diálogo, sem recompensa» (a fala
 * de Gruca, K3: «Baixe a arma. Ele já não combate.»); C7 (p. 15): a experiência «nunca recompensa o massacre de rendidos». Um tiro de
 * Piotr que acerta num destes estados marca a flag: o ferido desarmado (C04: `WOUNDED_UNARMED`), o rendido (C03: «Rendição ou fuga
 * substituem a obrigação de matar todos»: `SURRENDERED`) e o homem do posto EA0 já retirado na borda oeste (D2: `WITHDRAWN`, vivo, fora de
 * combate e contado no roster — é `nonCombatant`, por isso o `nonCombatant` do tiro já o apanhava; o teste m02-c04-fired-on-withdrawn
 * fixa-o, a nota do handoff de 2026-11-05 dizia o contrário e a sonda dava `true`).
 * Quem ainda está a recuar (`WITHDRAWING`) NÃO conta: D2 classifica-o como combatente a andar para um destino (o validador exige
 * `nonCombatant` falso), é um hostil ativo para o roteiro (a vala só fica livre quando chega à borda) e a bancada trata-o como alvo;
 * recuar é uma decisão tática de D3 («recuo/rendição»), não a rendição nem a incapacidade de I4. A secção deixa-o ir (D2) mas não é
 * Gruca quem condena o tiro de Piotr nas costas de um combatente que ainda não deixou o combate.
 */
export const NON_COMBATANT_STATES = Object.freeze(['WOUNDED_UNARMED', 'SURRENDERED', 'WITHDRAWN']);
export function isNonCombatantTarget(actor) {
  return Boolean(actor) && (Boolean(actor.nonCombatant) || NON_COMBATANT_STATES.includes(actor.state));
}

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
    // B6 (PDF p. 10): referência alemã proposta; catálogo, variante e dotação exigem validação (EQP-01 pendente).
    equipmentStatus: 'PROPOSTA_EQP01',
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
    // B6 (PDF p. 10): referência alemã proposta; catálogo, variante e dotação exigem validação (EQP-01 pendente).
    equipmentStatus: 'PROPOSTA_EQP01',
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

/**
 * D5 (PDF p. 18): «Uma explosão perigosa tem aviso legível de 5-8 s como ponto inicial de teste, cobertura alcançável e causa
 * situada. A posição do impacto é fixada no mundo; não se desloca para poupar o jogador ou persegui-lo.»
 * Fontes de explosão perigosa da M02: o impacto fixo de artilharia scriptado (SP03, C10) e a granada de mão de um hostil.
 * A granada lançada pelo jogador (rastilho de 2 s) não é perigo que a simulação lhe imponha e fica fora desta janela.
 */
export const BLAST_WARNING_SEC = Object.freeze({ min: 5, max: 8 });
export const BLAST_SOURCES = Object.freeze(['scripted_artillery', 'enemy_grenade']);
/** Aviso por omissão de uma granada inimiga: o ponto médio da janela. */
export const ENEMY_GRENADE_WARNING_SEC = 6.5;
/** Raio da explosão de uma granada de mão (o da wz. 33 da bancada) e alcance máximo de lançamento (m). */
export const ENEMY_GRENADE_RADIUS_M = 6.5;
export const ENEMY_GRENADE_MAX_THROW_M = 35;

export const M02_DIALOGUE_CATALOG = Object.freeze({
  dlg_m02_001: Object.freeze({
    id: 'dlg_m02_001',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 4.5,
    protectedLiteral: true,
    // K2 (PDF p. 38): gatilho «C01, olhar livre e sem sobreposição de ordem crítica».
    // Condição verificável em `playerHasFreeLook()` + `criticalOrderPending()`; sem ela, a linha espera na fila.
    requiresFreeLook: true,
    text: 'Era a estrada de casa. Agora procuro onde esconder a cabeça.',
  }),
  // K3 (PDF p. 39): texto literal conferido a 2026-11-04 (a auditoria K.md indicava «Depois da quinta», o PDF diz «Depois a quinta»).
  bz39_c01_01: Object.freeze({
    id: 'bz39_c01_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 3.8,
    text: 'Ao próximo talude. Depois a quinta.',
  }),
  // K3 (PDF p. 39): «2, entrega de munição». Acompanha a passagem de munições na vala (C2 p. 12).
  bz39_c01_02: Object.freeze({
    id: 'bz39_c01_02',
    speakerId: 'pl_malek',
    speakerName: 'strz. Jurek Małek',
    priority: 2,
    durationSec: 3.0,
    text: 'Levo estas também?',
  }),
  // K3 (PDF p. 39): «2, resposta, não repetir em combate». Só depois de bz39_c01_02; descartada se o combate começar.
  bz39_c01_03: Object.freeze({
    id: 'bz39_c01_03',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 3.0,
    requiresPrior: 'bz39_c01_02',
    quietCombat: true,
    text: 'Deixa espaço para a água.',
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
  // K3 (PDF p. 40, linha p. 39): texto literal «Baixe a arma. Ele já não combate.» conferido a 2026-11-04
  // (a auditoria K.md indicava «Baixa»; o PDF diz «Baixe»).
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
  bz39_c06_01: Object.freeze({
    id: 'bz39_c06_01',
    speakerId: 'pl_messenger',
    speakerName: 'Mensageiro', // DEC-02 pendente: sem subunidade nem regimento atribuídos (B4/C1)
    priority: 1,
    durationSec: 4.0,
    text: 'Os nossos estão mais adiante. Precisam desta passagem.',
  }),
  bz39_c06_02: Object.freeze({
    id: 'bz39_c06_02',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 1,
    durationSec: 3.8,
    text: 'Água nesta. Munição na outra.',
  }),
  bz39_c06_03: Object.freeze({
    id: 'bz39_c06_03',
    speakerId: 'pl_driver',
    speakerName: 'Condutor da Carroça',
    priority: 1,
    durationSec: 3.6,
    text: 'A roda! Assim não passa.',
  }),
  bz39_c06_04: Object.freeze({
    id: 'bz39_c06_04',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Levem a carga pelo abrigo. Dois de cada vez.',
  }),
  bz39_c06_05: Object.freeze({
    id: 'bz39_c06_05',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 2,
    durationSec: 4.0,
    text: 'Trouxe dois. Os outros ficaram com a companhia.',
  }),
  bz39_c07_01: Object.freeze({
    id: 'bz39_c07_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'A cidade ficou para trás. As ordens continuam para sul.',
  }),
  bz39_c07_02: Object.freeze({
    id: 'bz39_c07_02',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 1,
    durationSec: 4.2,
    text: 'Quem não consegue apoiar a perna fica com os feridos.',
  }),
  bz39_c07_03: Object.freeze({
    id: 'bz39_c07_03',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 3.8,
    text: 'Não dobres aí. Ainda precisamos desse caminho.',
  }),
  bz39_c08_01: Object.freeze({
    id: 'bz39_c08_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 4.2,
    text: 'Abrimos o pátio. O grupo de lá atravessa depois.',
  }),
  bz39_c08_02: Object.freeze({
    id: 'bz39_c08_02',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 1,
    durationSec: 4.0,
    text: 'Vou com a ligação. Encontramo-nos na passagem.',
    fallbackText: 'O mensageiro vai com a ligação. Encontramo-nos na passagem.',
  }),
  bz39_c09_02: Object.freeze({
    id: 'bz39_c09_02',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 1,
    durationSec: 3.8,
    text: 'À oficina. Vi dois a mudar de janela.',
  }),
  dlg_m02_002: Object.freeze({
    id: 'dlg_m02_002',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.4,
    protectedLiteral: true,
    text: 'O grupo da direita recuou. Nossa ordem mudou.',
  }),
  bz39_c10_01: Object.freeze({
    id: 'bz39_c10_01',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.0,
    text: 'Segurem esta passagem. Só até eles saírem.',
  }),
  bz39_c10_02: Object.freeze({
    id: 'bz39_c10_02',
    speakerId: 'pl_observer',
    speakerName: 'Observador Polaco',
    priority: 0,
    durationSec: 3.8,
    text: 'Vai cair na rua. Para dentro do muro!',
  }),
  bz39_c10_03: Object.freeze({
    id: 'bz39_c10_03',
    speakerId: 'pl_malek',
    speakerName: 'strz. Jurek Małek',
    priority: 2,
    durationSec: 3.2,
    text: 'E a nossa posição?',
  }),
  bz39_c10_04: Object.freeze({
    id: 'bz39_c10_04',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 1,
    durationSec: 3.8,
    text: 'Continua aqui. Protege a passagem.',
  }),
  dlg_m02_003: Object.freeze({
    id: 'dlg_m02_003',
    speakerId: 'piotr_sokol',
    speakerName: 'strz. Piotr Sokół',
    priority: 0,
    durationSec: 4.2,
    protectedLiteral: true,
    text: 'Você vem conosco. A arma eu levo.',
  }),
  bz39_c11_01: Object.freeze({
    id: 'bz39_c11_01',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 0,
    durationSec: 3.8,
    text: 'Cobre a porta. Eu chego até ele.',
  }),
  bz39_c11_02: Object.freeze({
    id: 'bz39_c11_02',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 3.4,
    text: 'A perna não aguenta.',
  }),
  bz39_c11_03: Object.freeze({
    id: 'bz39_c11_03',
    speakerId: 'pl_szymczak',
    speakerName: 'sanit. Edmund Szymczak',
    priority: 1,
    durationSec: 3.6,
    text: 'Devagar. Põe o braço aqui.',
  }),
  bz39_c11_04: Object.freeze({
    id: 'bz39_c11_04',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.0,
    text: 'Falta aquele grupo. Olhem para a saída!',
  }),
  bz39_c11_05: Object.freeze({
    id: 'bz39_c11_05',
    speakerId: 'pl_gruca',
    speakerName: 'sierż. Władysław Gruca',
    priority: 0,
    durationSec: 4.0,
    text: 'Passaram. Recuem até à casa!',
  }),
  bz39_c12_01: Object.freeze({
    id: 'bz39_c12_01',
    speakerId: 'pl_lis',
    speakerName: 'strz. Andrzej Lis',
    priority: 2,
    durationSec: 4.2,
    text: 'Fica com a arma. Ainda preciso das duas mãos.',
  }),
  bz39_c12_02: Object.freeze({
    id: 'bz39_c12_02',
    speakerId: 'pl_wierzba',
    speakerName: 'strz. Tomasz Wierzba',
    priority: 2,
    durationSec: 3.2,
    text: 'Lis…',
  }),
  bz39_c12_03: Object.freeze({
    id: 'bz39_c12_03',
    speakerId: 'piotr_sokol',
    speakerName: 'strz. Piotr Sokół',
    priority: 2,
    durationSec: 3.0,
    text: 'Quem falta?',
  }),
});

/**
 * K2 (PDF p. 38) «olhar livre»: o jogador controla a câmara. Na simulação, só uma elipse/cartela temporizada
 * (objeto com `expiresAt` ainda no futuro) ou o jogador sem vida lhe tira o olhar. A cartela inicial T0 é uma
 * string e não bloqueia (C2 p. 12: «O jogador controla olhar e movimento desde o início»). Não há tomadas de câmara
 * sobre perigos ativos (C7 p. 15).
 */
export function playerHasFreeLook(sim) {
  if (!sim?.player || !(sim.player.health > 0)) return false;
  const cartela = sim.activeCartela;
  if (cartela && typeof cartela === 'object' && Number(cartela.expiresAt) > sim.clock) return false;
  return true;
}

/** Combate ativo: algum hostil vivo e combatente que vê ou recorda um alvo. */
export function combatIsActive(sim) {
  return (sim?.enemies ?? []).some(
    (e) => e.alive && !e.nonCombatant && (e.seeingTargetId != null || e.memory != null),
  );
}

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

  hasTriggered(lineId) {
    return this.consumed.has(lineId);
  }

  trigger(lineId, sim, { allowRepeat = false } = {}) {
    const def = M02_DIALOGUE_CATALOG[lineId];
    if (!def) return false;
    if (!allowRepeat && this.consumed.has(lineId)) return false;

    // NAR-02 / K5: If Lis is missing, he must never speak in C12 or M03
    if (def.speakerId === 'pl_lis' && sim.flags?.['m02.lis_status'] === 'missing') {
      return false;
    }
    if (lineId === 'bz39_c12_02' && sim.flags?.['m02.lis_status'] !== 'missing') {
      return false;
    }

    const speaker = sim.allies.find((a) => a.id === def.speakerId);
    if (speaker && (!speaker.alive || speaker.state === 'DOWN' || speaker.state === 'EVACUATED' || speaker.detachedOutOfCell)) {
      if (!def.fallbackText) return false;
    }

    let resolvedText = def.text;
    if (lineId === 'bz39_c03_01') {
      const lisOk = sim.allies.some((a) => a.id === 'pl_lis' && a.alive && a.state !== 'DOWN');
      const wierzbaOk = sim.allies.some((a) => a.id === 'pl_wierzba' && a.alive && a.state !== 'DOWN');
      if (!lisOk || !wierzbaOk) resolvedText = def.fallbackText;
    } else if (lineId === 'bz39_c08_02') {
      const lisOk = sim.allies.some((a) => a.id === 'pl_lis' && a.alive && a.state !== 'DOWN' && a.state !== 'EVACUATED');
      if (!lisOk) resolvedText = def.fallbackText;
    }

    // K3: linha de resposta só existe depois da linha a que responde
    if (def.requiresPrior && !this.consumed.has(def.requiresPrior)) return false;
    // K3: «não repetir em combate»: não entra se o combate já começou
    if (def.quietCombat && combatIsActive(sim)) return false;

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
    if (def.requiresFreeLook) entry.requiresFreeLook = true;
    if (def.quietCombat) entry.quietCombat = true;

    // Priority 0 interrupts lower priority active speech immediately (K4)
    if (this.activeLine && entry.priority < this.activeLine.priority && this.canSpeakNow(entry, sim)) {
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

  /** Ordem crítica (prioridade 0) a falar ou à espera: K2 «sem sobreposição de ordem crítica». */
  criticalOrderPending(exceptId = null) {
    if (this.activeLine && this.activeLine.priority === 0 && this.activeLine.id !== exceptId) return true;
    return this.queue.some((q) => q.priority === 0 && q.id !== exceptId);
  }

  /** Condições de gatilho de uma entrada (K2/K3), avaliadas a cada atualização. */
  canSpeakNow(entry, sim) {
    if (entry.requiresFreeLook) {
      if (!playerHasFreeLook(sim)) return false;
      if (this.criticalOrderPending(entry.id)) return false;
    }
    return true;
  }

  update(sim) {
    if (this.activeLine && sim.clock >= this.activeLine.expiresAt) {
      this.activeLine = null;
    }
    // K4: uma linha que perde contexto é descartada, não reproduzida depois (resposta de C01 em combate)
    const kept = [];
    for (const q of this.queue) {
      if (q.quietCombat && combatIsActive(sim)) {
        sim.events.push({ type: 'dialogue-line-dropped', id: q.id, reason: 'combat-active' });
      } else {
        kept.push(q);
      }
    }
    this.queue = kept;
    if (!this.activeLine && this.queue.length > 0) {
      const idx = this.queue.findIndex((q) => this.canSpeakNow(q, sim));
      if (idx < 0) return;
      const next = this.queue.splice(idx, 1)[0];
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

/**
 * D4 (PDF p. 17): «Ordens do jogador limitam-se a «cobrir aqui» e «avançar para ali» em posições válidas, também acessíveis por
 * seleção contextual. Sem ordem, Gruca conduz o plano base.» Só há dois tipos de ordem (`cover`, `advance`) e `auto` = sem ordem.
 * As ordens «Suprimir MG», «Avançar B01» e «Flanquear Pomar» das versões anteriores da bancada deixam de existir; um save antigo
 * que as guardasse é restaurado como `auto`.
 * Uma ordem escolhe uma posição âncora (um nó de cobertura do layout da Área A, longe dos hostis e alcançável por Piotr) e atribui
 * a cada elemento da equipa de assalto (Gruca, Lis, Wierzba, Małek) um nó distinto à volta dela; quem fica sem nó mantém a posição.
 * O auxiliar do rkm e o sanitário seguem o seu próprio papel.
 * ÁREAS B E C (mesmo contrato): o layout de B e de C não tem `coverNodes` como a Área A, por isso as posições válidas são os NÓS DERIVADOS
 * DA COBERTURA EXISTENTE da célula (ver ORDER_NODES): as posições do plano da secção já usadas em B (B_PLAN_NODES) e em C (C09_PLAN_NODES,
 * C_EVAC_NODES) e, por cada cobertura baixa do layout (`covers`: muros, barricada, carroça), lugares atrás dela, do lado da entrada da
 * célula, a 2,5 m uns dos outros (B_COVER_SLOTS/C_COVER_SLOTS). Tudo o resto é igual à Área A: «cobrir aqui» à cobertura mais próxima de
 * Piotr, «avançar para ali» à frente da mira, posições com um hostil a menos de 6 m ou sem caminho para Piotr são recusadas, a equipa
 * de assalto ocupa nós à volta da âncora, a ordem caduca com o que Piotr faz e ao mudar de célula (`cellId` da ordem) e vive no snapshot.
 */
export const SQUAD_ORDER_TYPES = Object.freeze(['auto', 'cover', 'advance']);
export const LEGACY_SQUAD_ORDER_TYPES = Object.freeze(['suppress', 'flank_east']);
export const SQUAD_ORDER_ASSAULT_TEAM = Object.freeze(['pl_gruca', 'pl_lis', 'pl_wierzba', 'pl_malek']);
/** «Cobrir aqui»: a cobertura válida mais próxima de Piotr, até esta distância (m). */
export const SQUAD_ORDER_SNAP_M = 14;
/** «Avançar para ali» sem alvo: a posição válida mais próxima dentro de um cone de ±30° da mira, entre estas distâncias (m). */
export const SQUAD_ORDER_AHEAD = Object.freeze({ minM: 8, maxM: 70, halfConeRad: 0.52 });
/** Os elementos da equipa ocupam os nós mais próximos da âncora até esta distância (m). */
export const SQUAD_ORDER_GROUP_M = 16;
/** Uma posição com um hostil combatente vivo a menos desta distância (m) não é válida. */
export const SQUAD_ORDER_ENEMY_CLEARANCE_M = 6;
/**
 * Uma ordem não dura para sempre: «cobrir aqui» caduca quando Piotr se afasta mais de SQUAD_ORDER_SNAP_M + isto da âncora (já não é
 * «aqui»); «avançar para ali» caduca quando Piotr chega a menos de SQUAD_ORDER_ARRIVED_M do destino. Caducar devolve a secção ao plano
 * base de Gruca (`auto`). Sem tempos inventados: caduca com o que o jogador faz.
 */
export const SQUAD_ORDER_COVER_LAPSE_EXTRA_M = 8;
export const SQUAD_ORDER_ARRIVED_M = 6;
export const SQUAD_ORDER_REJECTION_TEXT = Object.freeze({
  ordem_desconhecida: 'só há duas ordens: cobrir aqui e avançar para ali',
  piotr_caido: 'Piotr está caído',
  sem_posicoes_validas: 'não há posições de cobertura válidas nesta cena',
  sem_cobertura_aqui: 'não há cobertura válida aqui',
  sem_posicao_a_frente: 'não há posição válida à frente',
  posicao_invalida: 'posição inválida',
  inalcancavel: 'posição inalcançável',
});

/**
 * Posições válidas para as ordens do jogador, sem hostis em cima: na Área A os nós de cobertura em uso (corredor de C01 ou quinta); em B e
 * C os nós derivados da cobertura existente da célula (ORDER_NODES).
 */
export function squadOrderPositions(sim) {
  const taken = (node) =>
    sim.enemies.some((e) => e.alive && !e.nonCombatant && Math.hypot(e.x - node.x, e.z - node.z) < SQUAD_ORDER_ENEMY_CLEARANCE_M);
  if (sim.activeCellId !== 'A') return orderNodesOf(sim.activeCellId).filter((node) => !taken(node));
  const out = [];
  for (const node of sim.coverNodesById.values()) {
    if (node.id.startsWith('cv_c01_') !== Boolean(sim.c01Active)) continue;
    if (node.id === 'cv_c01_outpost_clear') continue; // o posto EA0 ainda é dos hostis
    if (!taken(node)) out.push(node);
  }
  return out;
}

const byDistanceThenId = (a, b) => a.d - b.d || (a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0);

function nearestPositions(positions, point, maxM) {
  return positions
    .map((node) => ({ node, d: Math.hypot(node.x - point.x, node.z - point.z) }))
    .filter((c) => c.d <= maxM)
    .sort(byDistanceThenId)
    .map((c) => c.node);
}

/** Seleção contextual de «avançar para ali»: as posições à frente da mira de Piotr, da mais próxima para a mais distante. */
function positionsAhead(sim, positions) {
  const p = sim.player;
  const { minM, maxM, halfConeRad } = SQUAD_ORDER_AHEAD;
  return positions
    .map((node) => ({ node, d: Math.hypot(node.x - p.x, node.z - p.z) }))
    .filter((c) => c.d >= minM && c.d <= maxM && Math.abs(normalizeAngleDiff(Math.atan2(c.node.z - p.z, c.node.x - p.x), p.angle)) <= halfConeRad)
    .sort(byDistanceThenId)
    .map((c) => c.node);
}

/** Resolve uma ordem do jogador. `target`: id de um nó, `{x, z}` ou null (contextual). Devolve { ok, order } ou { ok: false, reason }. */
export function resolveSquadOrder(sim, type, target = null) {
  const reject = (reason) => ({ ok: false, reason });
  if (!SQUAD_ORDER_TYPES.includes(type)) return reject('ordem_desconhecida');
  const issuedAt = Number(sim.clock.toFixed(2));
  if (type === 'auto') return { ok: true, order: { type: 'auto', axis: null, issuedAt } };
  const p = sim.player;
  if (p.alive === false || !(p.health > 0)) return reject('piotr_caido');
  const positions = squadOrderPositions(sim);
  if (positions.length === 0) return reject('sem_posicoes_validas');

  let candidates;
  if (typeof target === 'string') {
    const node = positions.find((n) => n.id === target);
    candidates = node ? [node] : [];
    if (!candidates.length) return reject('posicao_invalida');
  } else if (target === null || target === undefined) {
    candidates = type === 'cover' ? nearestPositions(positions, p, SQUAD_ORDER_SNAP_M) : positionsAhead(sim, positions);
    if (!candidates.length) return reject(type === 'cover' ? 'sem_cobertura_aqui' : 'sem_posicao_a_frente');
  } else if (Number.isFinite(target.x) && Number.isFinite(target.z)) {
    candidates = nearestPositions(positions, target, SQUAD_ORDER_SNAP_M);
    if (!candidates.length) return reject('posicao_invalida');
  } else {
    return reject('posicao_invalida');
  }
  // «avançar para ali» é para outro sítio: um destino em cima de Piotr não é uma ordem de avançar
  if (type === 'advance') {
    candidates = candidates.filter((n) => Math.hypot(n.x - p.x, n.z - p.z) >= SQUAD_ORDER_ARRIVED_M);
    if (!candidates.length) return reject('posicao_invalida');
  }

  // Só posições a que Piotr tem caminho: o jogador escolhe um sítio onde a secção pode ir.
  const from = { x: p.x, y: p.y, z: p.z, radius: p.radius ?? PLAYER_PHYSICS.radius };
  const anchor = candidates.slice(0, 4).find((n) => sim.navigator.route(from, { x: n.x, z: n.z }) !== null);
  if (!anchor) return reject('inalcancavel');

  const team = SQUAD_ORDER_ASSAULT_TEAM.filter((id) => {
    const a = sim.allies.find((x) => x.id === id);
    // (só quem está ativo: Lis ferido a regressar ou amparado em C11 tem o percurso do diretor da Área C e não obedece a ordens)
    return a && a.alive && a.state === 'ACTIVE' && !a.detachedOutOfCell;
  });
  const around = nearestPositions(positions, anchor, SQUAD_ORDER_GROUP_M); // a âncora é a primeira (distância 0)
  const assignments = {};
  team.forEach((id, i) => {
    if (around[i]) assignments[id] = around[i].id;
  });
  return {
    ok: true,
    order: { type, axis: null, issuedAt, nodeId: anchor.id, x: anchor.x, z: anchor.z, assignments, cellId: sim.activeCellId },
  };
}

const ORDER_HOLD = Object.freeze({ hold: true });

/** Caduca a ordem em vigor quando deixa de se aplicar (ver SQUAD_ORDER_COVER_LAPSE_EXTRA_M / SQUAD_ORDER_ARRIVED_M). */
function lapseSquadOrder(sim) {
  const order = sim.squadOrder;
  if (!order || order.type === 'auto') return;
  const d = Math.hypot(sim.player.x - order.x, sim.player.z - order.z);
  let reason = null;
  if ((order.cellId ?? 'A') !== sim.activeCellId) reason = 'celula_mudou'; // as ordens só valem na célula em que foram dadas
  else if (order.type === 'cover' && d > SQUAD_ORDER_SNAP_M + SQUAD_ORDER_COVER_LAPSE_EXTRA_M) reason = 'piotr_afastou_se';
  else if (order.type === 'advance' && d < SQUAD_ORDER_ARRIVED_M) reason = 'piotr_chegou';
  if (!reason) return;
  const clock = Number(sim.clock.toFixed(2));
  sim.squadOrder = { type: 'auto', axis: null, issuedAt: clock };
  sim.events.push({ type: 'squad-order-lapsed', order: order.type, reason, clock: sim.clock });
  sim.combatLog.push({ clock, type: 'squad_order_lapsed', order: order.type, reason });
}

/**
 * Objetivo que a ordem em vigor dá a um elemento da equipa de assalto: o nó atribuído, `ORDER_HOLD` (sem nó: mantém a posição, não
 * segue o plano) ou null (sem ordem, outro papel, ou fora da Área A: segue o plano base).
 */
function squadOrderGoalFor(sim, ally) {
  const order = sim.squadOrder;
  if (!order || order.type === 'auto' || (order.cellId ?? 'A') !== sim.activeCellId || !SQUAD_ORDER_ASSAULT_TEAM.includes(ally.id)) return null;
  if (ally.state !== 'ACTIVE') return null; // Lis ferido a regressar (C11): o percurso é do diretor da Área C
  const nodeId = order.assignments?.[ally.id];
  if (!nodeId) return ORDER_HOLD;
  const node = sim.activeCellId === 'A' ? sim.coverNodesById.get(nodeId) : orderNode(sim.activeCellId, nodeId);
  if (!node) return null;
  return { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
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

/** Distância (m) do ponto de aproximação ao centro de uma porta (dentro dos 1,65 m a que um ator a abre). */
const DOOR_APPROACH_M = 0.9;
/**
 * Regra (FIX-CD2): só uma porta fechada a ≤ DOOR_DETOUR_MAX_FROM_GOAL_M do DESTINO é um desvio plausível — o ator vai a uma porta que
 * protege o seu destino (a sala/edifício dele), não à primeira porta fechada do mapa. Antes, uma falha momentânea de rota mandava
 * Lis 61 m de B01 à porta sul de B02. Vale para aliados e inimigos (mesma função). Sem porta plausível, não há desvio.
 */
export const DOOR_DETOUR_MAX_FROM_GOAL_M = 12;

/**
 * Rota até ao lado de cá de uma porta fechada, a mais próxima do destino (custo ator→porta→destino), quando não há rota até ao destino.
 * Determinista; null se nenhuma porta fechada é alcançável.
 */
function routeToClosedDoorToward(sim, from, goal) {
  const closed = (sim.world.doors ?? [])
    .filter((d) => d.state === 'closed' && Math.hypot(d.center.x - goal.x, d.center.z - goal.z) <= DOOR_DETOUR_MAX_FROM_GOAL_M)
    .map((d) => ({
      d,
      cost: Math.hypot(d.center.x - from.x, d.center.z - from.z) + Math.hypot(d.center.x - goal.x, d.center.z - goal.z),
    }))
    .sort((a, b) => a.cost - b.cost || (a.d.id < b.d.id ? -1 : 1))
    .slice(0, 4);
  for (const { d } of closed) {
    const n = d.orientation === 'H' ? { x: 0, z: 1 } : { x: 1, z: 0 };
    const sides = [1, -1]
      .map((sgn) => ({ x: d.center.x + n.x * DOOR_APPROACH_M * sgn, z: d.center.z + n.z * DOOR_APPROACH_M * sgn }))
      .sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z));
    for (const near of sides) {
      const corners = sim.navigator.route(from, near);
      if (corners && corners.length) return corners;
    }
  }
  return null;
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
    const from = { x: actor.x, y: actor.y, z: actor.z, radius: actor.radius ?? PLAYER_PHYSICS.radius };
    let corners = sim.navigator.route(from, { x: actor.goal.x, z: actor.goal.z });
    // FIX-CD: sem rota porque o destino fica atrás de uma porta FECHADA (a navegação trata-a como parede), o ator ia em linha reta
    // contra a parede e ficava lá para sempre — p. ex. Lis em «ClearRoom» encostada à parede norte de B01 com a porta este a 3 m, e
    // a quinta presa em C03 (D4 p. 17: «se a rota segura estiver bloqueada… tentam alternativa»). Vai até à porta fechada mais
    // próxima do destino (a ≤ 1,65 m abre-a, acima) e replaneia quando o mundo muda.
    if (!corners || !corners.length) corners = routeToClosedDoorToward(sim, from, actor.goal);
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

  // `maxSpeed`: teto de velocidade de um ator ferido (Lis em C11, J3); sem ele, a velocidade normal da secção.
  const baseSpeed = actor.maxSpeed ?? (actor.suppressed > 0.55 ? 2.6 : 4.1);
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

// ---------------------------------------------------------------------------------------------------------------------------
// D1 «socorro quando seguro» (PDF p. 16)
// ---------------------------------------------------------------------------------------------------------------------------
/**
 * D1 (PDF p. 16, «Falhas duras»): «Ferimento incapacitante de Gruca/Lis/Szymczak fora da sequência admite socorro quando seguro; se o estado
 * canónico se tornar impossível, apresentar falha clara e restaurar o checkpoint. Esta convenção deve ser visível, não imunidade oculta.»
 * C11 (p. 14): «O socorrista procura abrigo e só atravessa com oportunidade real»; D6 (p. 18) e C7 (pp. 14-15): sem cura total («água e material
 * sanitário não são poções de regeneração instantânea»). Regras desta bancada (tudo o que não é do PDF está marcado):
 *  - QUEM: só Gruca, Lis e Szymczak (RESCUE_ELIGIBLE: D1 p. 16, «Ferimento incapacitante de Gruca/Lis/Szymczak … admite socorro quando seguro»).
 *    Małek e Wierzba «admitem consequência persistente conforme K/I»: caídos, não abrem janela nem se levantam (ficam DOWN e, como todo o
 *    ferido grave, são evacuados em TR01/C07: `m02.*_status` evacuated). Os auxiliares «podem morrer sem reiniciar» (D1) e quem MORRE
 *    (DEAD: rebentado por uma explosão) não tem socorro.
 *  - QUANDO: um aliado elegível derrubado a TIRO (DOWN) abre uma janela de socorro de RESCUE_WINDOW_SEC (`ally.rescue`, visível na bancada).
 *  - SEGURO: o local do caído está seguro quando nenhum hostil combatente vivo com ele ao alcance da sua arma, até RESCUE_SAFE_RADIUS_M,
 *    tem linha de vista para ele (a mesma visão com que os hostis escolhem alvo, de joelhos); ver rescueSpotIsSafe.
 *  - POR QUEM: pelo jogador ([E] ao lado do caído, a ≤ RESCUE_REACH_M) ou por um aliado: o sanitário Szymczak (D4: «escolhe rota de socorro») e,
 *    se ele não pode, o mais próximo de Wierzba, Małek e Lis (como socorristas, não como socorridos). Só vai quando o local está seguro e desiste se deixar de estar. Levantar leva
 *    RESCUE_LIFT_SEC com o socorrista ao lado e o local seguro.
 *  - RESULTADO: levanta-se com RESCUE_HEALTH de vida (valor limitado: o próximo tiro volta a derrubá-lo), de joelhos. Cada um só tem direito a
 *    RESCUE_MAX_PER_CHARACTER socorros (sem imunidade oculta): a segunda queda é definitiva.
 *  - FALHA: Gruca é o único exigido (M02_REQUIRED_CHARACTERS). `required_character_incapacitated` só dispara quando ele fica incapacitado SEM
 *    socorro possível: a janela esgotou-se, morreu por explosão ou já gastou o socorro. Enquanto a janela está aberta o roteiro espera e não
 *    se grava nenhum checkpoint (nunca com Gruca fora de combate).
 * VALORES SEM FONTE NO PDF: 120 m (o limite do combate principal de D1, p. 16, «entre 15 e 120 m»), 2,2 m (o alcance de interação da bancada),
 * 4 s para levantar, 60 s de janela, 25 de vida, um socorro por pessoa.
 */
export const RESCUE_ELIGIBLE = Object.freeze(['pl_gruca', 'pl_lis', 'pl_szymczak']);
/** Nome curto (português) para o ecrã. */
export const RESCUE_NAMES = Object.freeze({
  pl_gruca: 'Sgt. Gruca',
  pl_lis: 'Lis',
  pl_szymczak: 'Szymczak',
  pl_wierzba: 'Wierzba',
  pl_malek: 'Małek',
});
export const RESCUE_SAFE_RADIUS_M = 120;
export const RESCUE_REACH_M = 2.2;
/** O aliado socorrista começa a levantar quando chega a esta distância do caído. */
export const RESCUE_ARRIVE_M = 1.6;
export const RESCUE_LIFT_SEC = 4;
export const RESCUE_WINDOW_SEC = 60;
export const RESCUE_HEALTH = 25;
export const RESCUE_MAX_PER_CHARACTER = 1;
/** Socorristas aliados por ordem de preferência: o sanitário primeiro; os restantes, o mais próximo. */
export const RESCUE_MEDIC = 'pl_szymczak';
export const RESCUE_ASSISTANTS = Object.freeze(['pl_wierzba', 'pl_malek', 'pl_lis']);
/** Estados que o caído tinha antes de cair e a que volta ao levantar-se (Lis ferido a regressar ou amparado em C11 retoma o seu percurso). */
export const RESCUE_PREV_STATES = Object.freeze(['ACTIVE', 'WOUNDED_LIAISON', 'WALKING_SUPPORTED', 'CARRIED', 'EVACUATED_B12']);
export const RESCUE_ABORT_REASONS = Object.freeze(['unsafe', 'rescuer_lost', 'rescuer_far', 'transition']);
const PLAYER_ACTOR_ID = 'piotr_sokol';

/** A janela de socorro de um aliado (ou de um snapshot dele) está aberta no instante `clock`? Só dados: serve a simulação e o validador. */
export function isRescueWindowOpen(ally, clock) {
  return (
    Boolean(ally) &&
    ally.alive === false &&
    ally.state === 'DOWN' &&
    Boolean(ally.rescue) &&
    clock < ally.rescue.deadlineAt &&
    (ally.rescuedCount ?? 0) < RESCUE_MAX_PER_CHARACTER
  );
}

/** Um aliado derrubado pode ser socorrido agora (janela aberta, na célula atual). */
export function isRescuable(sim, ally) {
  return !ally.detachedOutOfCell && isRescueWindowOpen(ally, sim.clock);
}

/** Abre a janela de socorro de um aliado elegível acabado de ser derrubado a tiro (fireActorBurst). Quem não é elegível ou já gastou o socorro fica sem janela. */
export function openRescueWindow(sim, victim, prevState) {
  victim.rescue = null;
  if (!RESCUE_ELIGIBLE.includes(victim.id) || (victim.rescuedCount ?? 0) >= RESCUE_MAX_PER_CHARACTER) return false;
  const downedAt = instantAt(sim.clock);
  const deadlineAt = Number((downedAt + RESCUE_WINDOW_SEC).toFixed(3));
  victim.rescue = {
    downedAt,
    deadlineAt,
    by: null,
    liftStartedAt: null,
    prevState: RESCUE_PREV_STATES.includes(prevState) ? prevState : 'ACTIVE',
  };
  sim.combatLog.push({ clock: Number(sim.clock.toFixed(2)), type: 'rescue_window_opened', actorId: victim.id, deadlineAt });
  sim.events.push({ type: 'rescue-window-opened', actorId: victim.id, deadlineAt, clock: sim.clock });
  return true;
}

/** Fecha a janela de socorro (o caído foi evacuado, ficou ausente...). */
export function closeRescueWindow(ally) {
  if (ally && ally.rescue) ally.rescue = null;
}

/** Passo (m) das amostras ao longo da rota do socorrista: o menor oco de cobertura que um hostil aproveita a um corpo em passo corrido. */
export const RESCUE_ROUTE_SAMPLE_M = 3;
const RESCUE_PROBE_CROUCHED = Object.freeze({ crouched: true, eyeHeight: 1.08 });
const RESCUE_PROBE_STANDING = Object.freeze({ crouched: false, eyeHeight: 1.65 });

/** Algum hostil combatente vivo, com o ponto ao alcance da sua arma (máx. RESCUE_SAFE_RADIUS_M), tem linha de vista para um corpo nessa postura? */
function pointSeenByHostile(sim, point, posture) {
  const probe = { space: 'metres', x: point.x, y: point.y ?? sim.world.heightAt(point.x, point.z), z: point.z, ...posture };
  for (const e of sim.enemies) {
    if (!e.alive || e.nonCombatant) continue;
    const reach = Math.min(WEAPON_PROFILES[e.weapon]?.range ?? 160, RESCUE_SAFE_RADIUS_M);
    if (Math.hypot(e.x - point.x, e.z - point.z) > reach) continue;
    if (sim.world.lineOfSight(e, probe, { includeFoliage: true })) return true;
  }
  return false;
}

/**
 * O local é seguro para levantar alguém: nenhum hostil combatente (vivo, a combater) com o ponto ao alcance da sua arma (no máximo
 * RESCUE_SAFE_RADIUS_M) tem linha de vista para ele. D1/C11 (pp. 14, 16): a oportunidade tem de ser real também para quem levanta E para o
 * levantado, por isso prova-se o ponto de joelhos (o socorrista a trabalhar) E de pé (o caído ergue-se no fim e volta ao plano), a vista
 * dos hostis com folhagem.
 */
export function rescueSpotIsSafe(sim, point) {
  return !pointSeenByHostile(sim, point, RESCUE_PROBE_CROUCHED) && !pointSeenByHostile(sim, point, RESCUE_PROBE_STANDING);
}

/**
 * C11 (p. 14, «o socorrista procura abrigo e só atravessa com oportunidade real») + D4 (p. 17, «escolhe rota de socorro»): o PERCURSO do
 * socorrista aliado até ao caído também tem de estar livre de linha de vista hostil, não só o ponto do caído. Amostra a rota de navegação
 * (a que o socorrista seguirá: a que já traz, se vai a caminho, ou a nova) de RESCUE_ROUTE_SAMPLE_M em RESCUE_ROUTE_SAMPLE_M, com o corpo
 * de pé (corre), sem contar o ponto onde já está. Só lê o estado; sem RNG.
 */
export function rescueRouteIsSafe(sim, rescuer, casualty) {
  const goalKey = `${casualty.x.toFixed(2)},${casualty.z.toFixed(2)}`;
  let corners = rescuer.navCorners && rescuer.navGoalKey === goalKey && rescuer.navRevision === sim.world.revision ? rescuer.navCorners : null;
  if (!corners) {
    const from = { x: rescuer.x, y: rescuer.y, z: rescuer.z, radius: rescuer.radius ?? PLAYER_PHYSICS.radius };
    const route = sim.navigator.route(from, { x: casualty.x, z: casualty.z });
    corners = route && route.length ? route.map((c) => (Array.isArray(c) ? { x: c[0], z: c[1] } : c)) : [{ x: casualty.x, z: casualty.z }];
  }
  let px = rescuer.x;
  let pz = rescuer.z;
  let carry = RESCUE_ROUTE_SAMPLE_M; // metros até à próxima amostra (a primeira a um passo da origem)
  for (const c of corners) {
    const len = Math.hypot(c.x - px, c.z - pz);
    let at = carry;
    while (at <= len + 1e-9) {
      const t = len > 0 ? at / len : 1;
      if (pointSeenByHostile(sim, { x: px + (c.x - px) * t, z: pz + (c.z - pz) * t }, RESCUE_PROBE_STANDING)) return false;
      at += RESCUE_ROUTE_SAMPLE_M;
    }
    carry = at - len;
    px = c.x;
    pz = c.z;
  }
  return true;
}

function rescuerOf(sim, casualty) {
  const by = casualty.rescue?.by ?? null;
  if (by === null) return null;
  return by === PLAYER_ACTOR_ID ? sim.player : (sim.allies.find((a) => a.id === by) ?? null);
}

export function abortRescue(sim, casualty, reason) {
  const byId = casualty.rescue.by;
  casualty.rescue.by = null;
  casualty.rescue.liftStartedAt = null;
  sim.combatLog.push({ clock: Number(sim.clock.toFixed(2)), type: 'rescue_aborted', actorId: casualty.id, byId, reason });
  sim.events.push({ type: 'rescue-aborted', actorId: casualty.id, byId, reason, clock: sim.clock });
}

/** Fecha a janela de um caído que a transição evacua (I2): mesmo evento do prazo esgotado, com a razão. */
export function closeRescueForTransition(sim, casualty, reason) {
  casualty.rescue = null;
  sim.combatLog.push({ clock: Number(sim.clock.toFixed(2)), type: 'rescue_window_expired', actorId: casualty.id, reason });
  sim.events.push({ type: 'rescue-window-expired', actorId: casualty.id, reason, clock: sim.clock });
}

function completeRescue(sim, casualty) {
  const r = casualty.rescue;
  casualty.alive = true;
  casualty.state = RESCUE_PREV_STATES.includes(r.prevState) ? r.prevState : 'ACTIVE';
  casualty.health = Math.min(casualty.maxHealth ?? RESCUE_HEALTH, RESCUE_HEALTH);
  casualty.rescuedCount = (casualty.rescuedCount ?? 0) + 1;
  casualty.suppressed = 0.5;
  casualty.crouched = true;
  casualty.eyeHeight = 1.08;
  casualty.moving = false;
  casualty.reachedNodeId = null;
  casualty.navCorners = null;
  casualty.holdingFor = null;
  casualty.nextFireAt = Number((sim.clock + 2).toFixed(3));
  if (casualty.state === 'ACTIVE') casualty.goal = null; // volta ao plano; Lis retoma o percurso do diretor da Área C (o seu objetivo fica)
  casualty.rescue = null;
  sim.combatLog.push({
    clock: Number(sim.clock.toFixed(2)),
    type: 'ally_rescued',
    actorId: casualty.id,
    byId: r.by,
    health: casualty.health,
    rescuedCount: casualty.rescuedCount,
  });
  sim.events.push({ type: 'ally-rescued', actorId: casualty.id, byId: r.by, health: casualty.health, clock: sim.clock });
}

/**
 * Socorrista aliado: o sanitário e, se ele não pode (caído, ausente, ocupado com outro caído), o mais próximo de Wierzba, Małek e Lis.
 * Determinista: desempata pela ordem de RESCUE_ASSISTANTS.
 */
function pickAllyRescuer(sim, casualty) {
  const usable = (a) =>
    a && a.id !== casualty.id && a.alive && a.state === 'ACTIVE' && !a.detachedOutOfCell && !sim.allies.some((c) => c.rescue?.by === a.id);
  // C11/D4: só avança quem tem a rota livre de linha de vista hostil (a rota de socorro é avaliada, não só o ponto do caído)
  const medic = sim.allies.find((a) => a.id === RESCUE_MEDIC);
  if (usable(medic) && rescueRouteIsSafe(sim, medic, casualty)) return medic;
  const candidates = [];
  for (const id of RESCUE_ASSISTANTS) {
    const a = sim.allies.find((x) => x.id === id);
    if (!usable(a)) continue;
    candidates.push({ a, d: Math.hypot(a.x - casualty.x, a.z - casualty.z) });
  }
  candidates.sort((p, q) => p.d - q.d); // estável: empata pela ordem de RESCUE_ASSISTANTS
  for (const { a } of candidates) if (rescueRouteIsSafe(sim, a, casualty)) return a;
  return null;
}

/**
 * Um passo do socorro, no início de updatePolishSquad: fecha o que expirou, escolhe socorrista quando o local está seguro, interrompe se
 * deixou de estar (ou se o socorrista caiu ou se afastou), conta o tempo de levantar e levanta. Sem RNG: só relógio, posições e linha de vista.
 */
export function stepRescues(sim) {
  const clock = sim.clock;
  const piotrUp = sim.player.alive !== false && sim.player.health > 0;
  for (const c of sim.allies) {
    if (!c.rescue) continue;
    // invariante defensiva: a janela só existe num caído DOWN (evacuado, ausente ou de pé: já não há nada a socorrer)
    if (c.alive || c.state !== 'DOWN' || c.detachedOutOfCell) {
      c.rescue = null;
      continue;
    }
    if (clock >= c.rescue.deadlineAt) {
      c.rescue = null;
      sim.combatLog.push({ clock: Number(clock.toFixed(2)), type: 'rescue_window_expired', actorId: c.id });
      sim.events.push({ type: 'rescue-window-expired', actorId: c.id, clock });
      continue;
    }
    const safe = rescueSpotIsSafe(sim, c);
    let rescuer = rescuerOf(sim, c);
    if (c.rescue.by !== null) {
      const usable =
        c.rescue.by === PLAYER_ACTOR_ID
          ? piotrUp
          : Boolean(rescuer) && rescuer.alive && rescuer.state === 'ACTIVE' && !rescuer.detachedOutOfCell && rescuer.id !== c.id;
      if (!usable) abortRescue(sim, c, 'rescuer_lost');
      else if (!safe) abortRescue(sim, c, 'unsafe');
      // a caminho (ainda não levanta): se a rota que lhe resta ficou exposta, não atravessa (C11, «só atravessa com oportunidade real»)
      else if (c.rescue.by !== PLAYER_ACTOR_ID && c.rescue.liftStartedAt === null && !rescueRouteIsSafe(sim, rescuer, c)) abortRescue(sim, c, 'unsafe');
    }
    if (c.rescue.by === null && safe) {
      const ally = pickAllyRescuer(sim, c);
      if (ally) {
        c.rescue.by = ally.id;
        c.rescue.liftStartedAt = null;
        sim.combatLog.push({ clock: Number(clock.toFixed(2)), type: 'rescue_started', actorId: c.id, byId: ally.id, phase: 'approach' });
        sim.events.push({ type: 'rescue-started', actorId: c.id, byId: ally.id, phase: 'approach', clock });
      }
    }
    if (c.rescue.by === null) continue;
    rescuer = rescuerOf(sim, c);
    const byPlayer = c.rescue.by === PLAYER_ACTOR_ID;
    const d = Math.hypot(rescuer.x - c.x, rescuer.z - c.z);
    if (c.rescue.liftStartedAt === null) {
      if (!byPlayer && d <= RESCUE_ARRIVE_M) {
        c.rescue.liftStartedAt = instantAt(clock);
        sim.combatLog.push({ clock: Number(clock.toFixed(2)), type: 'rescue_started', actorId: c.id, byId: c.rescue.by, phase: 'lift' });
        sim.events.push({ type: 'rescue-started', actorId: c.id, byId: c.rescue.by, phase: 'lift', clock });
      }
      continue;
    }
    if (d > (byPlayer ? RESCUE_REACH_M : RESCUE_ARRIVE_M) + 1) abortRescue(sim, c, 'rescuer_far');
    else if (clock - c.rescue.liftStartedAt >= RESCUE_LIFT_SEC - 1e-9) completeRescue(sim, c);
  }
}

/** [E] de Piotr junto a um caído: começa a levantá-lo (só se o local estiver seguro e ele ao alcance). Devolve o evento ou null. */
export function beginPlayerRescue(sim, actorId) {
  const c = sim.allies.find((a) => a.id === actorId);
  const p = sim.player;
  if (!c || !isRescuable(sim, c) || p.alive === false || !(p.health > 0)) return null;
  if (Math.hypot(p.x - c.x, p.z - c.z) > RESCUE_REACH_M || !rescueSpotIsSafe(sim, c)) return null;
  // um levantar de cada vez: Piotr só tem duas mãos (antes levantava dois caídos juntos ao carregar [E] ao lado de ambos)
  if (sim.allies.some((o) => o !== c && o.rescue?.by === PLAYER_ACTOR_ID && o.rescue.liftStartedAt !== null)) return null;
  // o levantar de um aliado já em curso não se interrompe: tirar-lhe a vez fazia recomeçar a contagem do zero (e perdia-se o progresso)
  if (c.rescue.by !== null && c.rescue.by !== PLAYER_ACTOR_ID && c.rescue.liftStartedAt !== null) return null;
  if (c.rescue.by === PLAYER_ACTOR_ID && c.rescue.liftStartedAt !== null) return null; // já a levantá-lo
  const takenOver = c.rescue.by !== null && c.rescue.by !== PLAYER_ACTOR_ID ? c.rescue.by : null; // só a aproximação do aliado (ainda não levanta)
  c.rescue.by = PLAYER_ACTOR_ID;
  c.rescue.liftStartedAt = instantAt(sim.clock);
  const evt = { type: 'rescue-started', actorId: c.id, byId: PLAYER_ACTOR_ID, phase: 'lift', ...(takenOver ? { tookOverFrom: takenOver } : {}), clock: sim.clock };
  sim.combatLog.push({ clock: Number(sim.clock.toFixed(2)), type: 'rescue_started', actorId: c.id, byId: PLAYER_ACTOR_ID, phase: 'lift' });
  sim.events.push(evt);
  return evt;
}

/** Objetivo do aliado que está a socorrer (ir ao caído e ficar ao lado dele) ou null. */
function rescueGoalFor(sim, ally) {
  const c = sim.allies.find((x) => x.rescue?.by === ally.id);
  if (!c) return null;
  return { x: c.x, z: c.z, facing: Math.atan2(c.z - ally.z, c.x - ally.x), crouch: true, rescue: true };
}

/** O aliado está a levantar alguém agora (não dispara nem se desloca). */
const isLifting = (sim, ally) => sim.allies.some((c) => c.rescue?.by === ally.id && c.rescue.liftStartedAt !== null);

/**
 * Erro (texto) dos campos de socorro de um aliado num snapshot, ou null: `rescue` (a janela) e `rescuedCount` (socorros já gastos) são
 * campos aditivos do schema 2, ausentes nos saves anteriores. Só dados: o validador não precisa da simulação.
 */
export function rescueFieldsProblem(a, clock, allyIds) {
  if ('rescuedCount' in a && a.rescuedCount !== undefined && !(Number.isInteger(a.rescuedCount) && a.rescuedCount >= 0 && a.rescuedCount <= RESCUE_MAX_PER_CHARACTER)) {
    return `Socorros gastos (rescuedCount) inválidos no snapshot: ${a.id}`;
  }
  const r = a.rescue;
  if (r === undefined || r === null) return null;
  const bad = (why) => `Janela de socorro (rescue) inválida no snapshot: ${a.id} (${why})`;
  if (typeof r !== 'object' || Array.isArray(r)) return bad('forma');
  if (Object.keys(r).sort().join() !== ['by', 'deadlineAt', 'downedAt', 'liftStartedAt', 'prevState'].join()) return bad('campos');
  if (!RESCUE_ELIGIBLE.includes(a.id)) return bad('personagem sem direito a socorro');
  if (a.alive !== false || a.state !== 'DOWN') return bad('só um caído (DOWN) tem janela');
  if ((a.rescuedCount ?? 0) >= RESCUE_MAX_PER_CHARACTER) return bad('socorro já gasto');
  if (!Number.isFinite(r.downedAt) || r.downedAt < 0 || r.downedAt > clock + 1e-9) return bad('instante da queda');
  if (!Number.isFinite(r.deadlineAt) || Math.abs(r.deadlineAt - r.downedAt - RESCUE_WINDOW_SEC) > 0.002) return bad('prazo');
  if (r.by !== null && !(r.by === PLAYER_ACTOR_ID || (typeof r.by === 'string' && r.by !== a.id && allyIds.has(r.by)))) return bad('socorrista');
  if (r.liftStartedAt !== null && !(r.by !== null && Number.isFinite(r.liftStartedAt) && r.liftStartedAt >= r.downedAt && r.liftStartedAt <= clock + 1e-9)) {
    return bad('início de levantar');
  }
  if (r.by === PLAYER_ACTOR_ID && r.liftStartedAt === null) return bad('Piotr levanta logo ao carregar em [E]: não há fase de aproximação'); // só um aliado tem de ir ter com o caído
  if (!RESCUE_PREV_STATES.includes(r.prevState)) return bad('estado anterior');
  return null;
}

/**
 * D4 (PDF p. 17): «Sem ordem, Gruca conduz o plano base» mas «autonomia não é vitória garantida». O plano base (vala → casa B01 → pátio)
 * é conduzido COM o atirador, não à frente dele: Gruca fixa e suprime com a secção a partir de posições de apoio (parapeitos de partida,
 * extremo norte da vala, talude do pomar) e só COMETE o grupo às posições de assalto (colados a B01, ao pátio, a B03) quando Piotr está a
 * menos de SECTION_ASSAULT_LEASH_M delas. Um objetivo do plano para lá da trela não é adotado: quem lá devia ir mantém a posição e
 * suprime (`HoldCover`, registo `section_holding`) até Piotr se aproximar ou o jogador dar a ordem «avançar para ali» (que manda ir e é
 * a exceção explícita). Antes a secção tomava a quinta sozinha com Piotr parado (72-86 s, 10 sementes em 10).
 * VALORES SEM FONTE NO PDF: 60 m para as posições de apoio (os nós da vala ficam a 48-52 m do início da quinta; D1, p. 16, põe o combate
 * principal entre 15 e 120 m) e 30 m para as de assalto (Piotr tem de estar na luta, não a meio campo).
 */
export const SECTION_LEASH_M = 60;
export const SECTION_ASSAULT_LEASH_M = 30;
/** Posições de apoio (fixar e suprimir): trela larga. As restantes (B01, pátio, B03, rotas de C01 à parte) são de assalto. */
export const SECTION_SUPPORT_NODES = Object.freeze([
  'cv_start_parapet_w',
  'cv_start_parapet_e',
  'cv_ditch_north_a',
  'cv_ditch_north_b',
  'cv_orchard_bank_e',
]);

/**
 * C09 (PDF p. 14): «Oito alemães defendem B09/B10/B11. Há combate legível entre 20 e 100 m, portas e flanco de serviço. A arma de apoio
 * de Piotr tem munição finita. Gruca não manda o jogador atacar sozinho: um grupo fixa a oficina, outro avança no muro.»
 * Antes a secção corria a posições fixas (`cGoals`), abatia os 3 de B10 em 13 de 13 sementes e ficava lá: B09 e B11 (5 homens) eram só
 * de Piotr, e o MissionBot (recruta) chegava ao C12 em 7 de 40 sementes. O plano base de Gruca em C09 passa a ter dois grupos e duas
 * fases, lidas do estado dos defensores (sem relógio nem estado novo):
 *   FIXAR A OFICINA (B10 com combatentes): o grupo de apoio (rkm e o auxiliar) toma a base de fogo à beira do campo de tiro do portão
 *   oeste de B10; o de manobra (Gruca, Małek, Wierzba) e o sanitário esperam no TERRENO MORTO a norte do pátio, onde nenhum defensor de
 *   EC1 tem linha de vista — a rota abrigada. Antes corriam a descoberto do ponto de entrada ao parapeito do pátio e Gruca levava 16-48
 *   de vida de DE-C05/C06 6,7-8,6 s depois da entrada (10 de 13 sementes). A janela de segurança de C02/C06 (EC1 «sem alerta» até
 *   Piotr abrir o contacto) foi medida e piora: é a secção a combater B10 logo à entrada que protege Piotr, e com a janela só 2 de 15
 *   sementes chegavam ao C12 (7 de 15 sem ela).
 *   AVANÇAR (B10 neutralizada): Gruca toma o parapeito do pátio e vigia a secção (nada em EC1 lhe vê o parapeito sem B10); o apoio vem
 *   atrás; Wierzba (o flanqueador) vai à faixa de tiro da porta oeste de B11 contra DE-C08, depois DE-C07, e Małek à do portão norte de
 *   B09 contra DE-C01 («avança no muro»): posições a 11-18 m de onde só esse defensor os vê (mapa de exposição em
 *   tests/m02-c09-section-advance.test.js). DE-C01 é quem enfia a linha da porta leste de B09, onde o jogador morria. Quem está ferido
 *   (< C09_WOUNDED_HEALTH) não vai: fica com Gruca. Quem fica fora da trela (D4) também não: fixa e suprime onde está (`holdingFor`,
 *   `section_holding`), por isso com Piotr parado a secção fixa a oficina mas não toma o pátio nem B09/B11.
 * Mesma trela da quinta: posições de apoio a SECTION_LEASH_M de Piotr, de assalto a SECTION_ASSAULT_LEASH_M. As ordens do jogador
 * («cobrir aqui», «avançar para ali») também valem aqui: mandam na equipa de assalto sem trela (ORDER_NODES).
 * VALORES SEM FONTE NO PDF: as coordenadas dos nós (escolhidas pelo mapa de exposição da própria geometria), a ordem das faixas e o
 * limiar de ferido (o de C07).
 */
const c9 = (x, z, facing = Math.PI / 2, crouch = true) => Object.freeze({ x, z, facing, crouch });
export const C09_PLAN_NODES = Object.freeze({
  // terreno morto a norte do pátio (x ≥ -7 com z ≤ -46, e mais ao largo quanto mais a norte: nenhum defensor de EC1 vê estes pontos)
  cv_c_assembly_gruca: c9(-6, -46),
  cv_c_assembly_malek: c9(-7, -48),
  cv_c_assembly_wierzba: c9(0, -47),
  cv_c_assembly_aid: c9(-3, -48),
  // base de fogo sobre a oficina B10 (a beira do campo de tiro do portão oeste); já existiam em cGoals
  cv_c_north_rkm: c9(-4, -39),
  cv_c_north_rkm_2: c9(-2, -39),
  // o pátio, depois de B10: só as aberturas de B09/B11 veem estes pontos
  cv_c_yard_parapet: c9(-6, -15.5),
  cv_c_yard_aid: c9(-9, -17.5),
  cv_c_yard_line_rkm: c9(-4, -17.5),
  cv_c_yard_line_rkm_2: c9(-2, -17.5),
  // faixas de tiro: de cada uma só o defensor respetivo vê o aliado (e o aliado a ele), a 11-18 m
  cv_c_lane_b11_west: c9(-8, -7, 0.4),
  cv_c_lane_b11_south: c9(-5, 4, 0.2),
  cv_c_lane_b09_north: c9(-35, -27, -1.2),
});
/** Posições de apoio: trela larga (SECTION_LEASH_M). As restantes (pátio e faixas) são de assalto (SECTION_ASSAULT_LEASH_M). */
export const C09_SUPPORT_NODES = Object.freeze([
  'cv_c_assembly_gruca',
  'cv_c_assembly_malek',
  'cv_c_assembly_wierzba',
  'cv_c_assembly_aid',
  'cv_c_north_rkm',
  'cv_c_north_rkm_2',
]);
/** Faixa de tiro de cada defensor interior de B09/B11 que a secção trabalha (o primeiro vivo da lista de cada elemento é o seu objetivo). */
export const C09_LANES = Object.freeze({
  'DE-C08': 'cv_c_lane_b11_west',
  'DE-C07': 'cv_c_lane_b11_south',
  'DE-C01': 'cv_c_lane_b09_north',
});
/** Abaixo desta saúde um elemento da manobra está «ferido» (o limiar de C07) e não vai a uma faixa de tiro. */
export const C09_WOUNDED_HEALTH = 55;
export const C09_MANEUVER_TARGETS = Object.freeze({
  pl_wierzba: Object.freeze(['DE-C08', 'DE-C07', 'DE-C01']),
  pl_malek: Object.freeze(['DE-C01']),
});

/** Nó do plano (cell A: layout; cell C: C09_PLAN_NODES). */
const planNode = (sim, nodeId) => sim.coverNodesById.get(nodeId) ?? C09_PLAN_NODES[nodeId] ?? null;

/**
 * Posições do plano da secção na Área B (C06): avanço por lanços da entrada a sul até ao cruzamento de B05/B06. Antes literais dentro de
 * updatePolishSquad; agora a fonte única do plano e das ordens do jogador (D4: ORDER_NODES).
 */
const bnode = (x, z, facing, crouch = true) => Object.freeze({ x, z, facing, crouch });
export const B_PLAN_NODES = Object.freeze({
  cv_b_west_wall: bnode(-18.0, 10.0, -Math.PI / 2),
  cv_b05_south: bnode(-32.0, -12.0, -Math.PI / 2, false),
  cv_b_south_barricade: bnode(-6.0, 50.0, -Math.PI / 2),
  cv_b_west_wall_2: bnode(-22.0, 10.5, -Math.PI / 2),
  cv_b07_aid: bnode(-38.0, 38.0, 0),
  cv_b_east_cart: bnode(11.5, 6.5, -Math.PI / 2),
  cv_b_east_cart_2: bnode(14.0, 6.8, -Math.PI / 2),
});
export const B_PLAN_ROLES = Object.freeze({
  pl_gruca: 'cv_b_west_wall',
  pl_wierzba: 'cv_b05_south',
  pl_lis: 'cv_b_south_barricade',
  pl_malek: 'cv_b_west_wall_2',
  pl_szymczak: 'cv_b07_aid',
  pl_aux_01: 'cv_b_east_cart',
  pl_aux_02: 'cv_b_east_cart_2',
});
/** Posições da secção em C10-C11 (cobrir a evacuação B09 → B12). */
export const C_EVAC_NODES = Object.freeze({
  cv_c_evac_gruca: c9(-32, 18, 0.4),
  // lanços abrigados de Gruca (C_BOUND_PLAN): a nave de B09 (porta norte de B09 a oeste, paredes de tijolo a este e a sul) e atrás da porta sul
  cv_c_b09_nave: c9(-26, -9, 0.3),
  cv_c_b09_south: c9(-30.5, -4, Math.PI / 2),
  cv_c_b09_east: c9(-14, -4, 0.3),
  cv_c_evac_malek: c9(-46, 36, 0.5),
  cv_c_b12_aid: Object.freeze({ x: -56, z: 46, facing: -Math.PI / 2, crouch: false }),
  cv_c_yard_rkm: c9(-6, -11.5, 0.5),
  cv_c_yard_rkm_2: c9(-4, -11.5, 0.5),
});
export const C_EVAC_ROLES = Object.freeze({
  pl_gruca: 'cv_c_evac_gruca',
  pl_wierzba: 'cv_c_b09_east',
  pl_malek: 'cv_c_evac_malek',
  pl_szymczak: 'cv_c_b12_aid',
  pl_aux_01: 'cv_c_yard_rkm',
  pl_aux_02: 'cv_c_yard_rkm_2',
});
/** Objetivo de plano {x, z, facing, crouch, nodeId} de um nó (objeto novo: o ator guarda-o e o snapshot copia-o). */
const goalOfNode = (nodeId, node) => ({ x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId });

/**
 * C10-C11 (PDF p. 14: «Segurem esta passagem. Só até eles saírem.»; C11: «O socorrista procura abrigo e só atravessa com oportunidade real»;
 * D4: «Dois elementos alternam apoio e deslocação»). Gruca, o único elemento EXIGIDO (D1/K1), conduz a evacuação por LANÇOS ABRIGADOS em vez
 * de correr ao seu ponto final: do parapeito do pátio pela nave de B09 até atrás da porta sul e daí à posição que cobre a rota (-32,18).
 * Só dá o lanço seguinte quando ele está ABERTO: no máximo BOUND_MAX_EXPOSURE (1) hostil combatente que não esteja suprimido vê, dentro do
 * alcance da sua arma, um homem de pé em algum ponto da rota desse lanço (amostras de BOUND_SAMPLE_M em BOUND_SAMPLE_M, a mesma vista com
 * que os hostis escolhem alvo): um atirador isolado não abate ninguém num lanço de 20 m (32 de vida por tiro), foram 3 a 6 fuzis a abater
 * Gruca nas 5 quedas medidas. A supressão da secção abre o lanço: quem tem supressão >= BOUND_SUPPRESSED_CLEAR (precisão e exposição
 * reduzidas, D3) já não conta.
 * Fechado, Gruca fica no abrigo onde está (registo `section_bound_held`, uma vez por lanço, e `holdingFor`); aberto, avança. Sem estado
 * novo: o ponto em que está e o objetivo que já tem decidem (`goal.nodeId`), por isso um lanço começado acaba-se e o snapshot repõe-no.
 * Os outros elementos mantêm os pontos finais de C_EVAC_ROLES: são quem avança, atrai o fogo da reserva e a suprime (a secção inteira
 * retida, medida em 40 sementes, deixava a reserva viva e Piotr morria em mais sementes).
 * Medido (MissionBot, recruta, sementes 1-40): Gruca caía em 5 (todas na marcha para (-32,18), a 4-10 s do início de C10, a 3-6 fuzis da
 * reserva EC2 oeste); agora em 0.
 * VALORES SEM FONTE NO PDF: as coordenadas dos nós (escolhidas pelo mapa de exposição da própria geometria: 0 das 12 posições finais da
 * reserva veem a nave nem a porta sul), a tolerância (1 hostil; 0 também deixa Gruca a salvo em 40 sementes mas muda o desfecho do
 * MissionBot em m02-18, semente 8, por pura sorte de RNG: com 0, 1, 2 ou 3 as medições de 40 sementes dão o mesmo, 21 em C12 e 0 quedas),
 * o limiar de supressão (o mesmo ponto em que a precisão cai, D3), o passo das amostras e o raio de «estar num nó».
 */
export const C_BOUND_PLAN = Object.freeze({
  pl_gruca: Object.freeze(['cv_c_yard_parapet', 'cv_c_b09_nave', 'cv_c_b09_south', 'cv_c_evac_gruca']),
});
export const BOUND_MAX_EXPOSURE = 1;
export const BOUND_SUPPRESSED_CLEAR = 0.65;
export const BOUND_SAMPLE_M = 4;
export const BOUND_AT_NODE_M = 1.2;

/** Nó de um plano de lanços (Área A: layout; Área C: plano de C09 e de evacuação). */
const boundNode = (sim, nodeId) => planNode(sim, nodeId) ?? C_EVAC_NODES[nodeId];

/**
 * Exposição de um lanço: o maior número de hostis combatentes (não suprimidos) com linha de vista e alcance a um homem de pé em algum
 * ponto da rota do navegador de `from` a `to`. 0 = lanço aberto.
 */
export function boundHopExposure(sim, from, to) {
  const hostiles = sim.enemies.filter((e) => e.alive && !e.nonCombatant && (e.suppressed ?? 0) < BOUND_SUPPRESSED_CLEAR);
  if (hostiles.length === 0) return 0;
  const start = { x: from.x, y: sim.world.heightAt(from.x, from.z), z: from.z, radius: PLAYER_PHYSICS.radius };
  const route = sim.navigator.route(start, { x: to.x, z: to.z });
  const points = [[from.x, from.z], ...(route ?? [[to.x, to.z]])];
  let worst = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, z0] = points[i - 1];
    const [x1, z1] = points[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / BOUND_SAMPLE_M));
    for (let k = 1; k <= steps; k++) {
      const x = x0 + ((x1 - x0) * k) / steps;
      const z = z0 + ((z1 - z0) * k) / steps;
      const probe = { space: 'metres', x, y: sim.world.heightAt(x, z), z, crouched: false, eyeHeight: 1.65 };
      let seen = 0;
      for (const e of hostiles) {
        if (Math.hypot(e.x - x, e.z - z) > (WEAPON_PROFILES[e.weapon]?.range ?? 160)) continue;
        if (sim.world.lineOfSight(e, probe, { includeFoliage: true })) seen += 1;
      }
      worst = Math.max(worst, seen);
      if (worst > BOUND_MAX_EXPOSURE) return worst; // já fechado: não é preciso o resto
    }
  }
  return worst;
}

/**
 * Objetivo de um elemento que avança por lanços (ver C_BOUND_PLAN): num nó, o seguinte se o lanço está aberto, senão fica; a meio de um
 * lanço continua para o nó que já tinha; sem nó de partida (C10 por atalho, depois de um socorro) vai ao nó mais próximo.
 */
function adoptBoundGoal(sim, ally, nodeIds) {
  const last = nodeIds.length - 1;
  const dist = (id) => Math.hypot(boundNode(sim, id).x - ally.x, boundNode(sim, id).z - ally.z);
  const here = nodeIds.findIndex((id) => dist(id) <= BOUND_AT_NODE_M);
  const committed = nodeIds.indexOf(ally.goal?.nodeId);
  let target;
  let held = null;
  if (here < 0) {
    target = committed >= 0 ? committed : nodeIds.reduce((best, id, i) => (dist(id) < dist(nodeIds[best]) ? i : best), 0);
    if (committed < 0) {
      // sem nó de partida (depois de um socorro ou de uma ordem, ou C10 por atalho): o nó mais próximo só se o caminho até lá está aberto; com
      // o percurso exposto fica onde está (agachado, abrigado) e reavalia-se a cada passo (antes ia sempre, a descoberto, ao nó mais próximo)
      const exposure = boundHopExposure(sim, ally, boundNode(sim, nodeIds[target]));
      if (exposure > BOUND_MAX_EXPOSURE) {
        ally.goal = null;
        ally.tacticalState = 'HoldCover';
        if (ally.holdingFor !== nodeIds[target]) {
          ally.holdingFor = nodeIds[target];
          sim.combatLog.push({ clock: Number(sim.clock.toFixed(2)), type: 'section_bound_held', actorId: ally.id, nodeId: nodeIds[target], atNodeId: null, exposure });
        }
        return;
      }
    }
  } else if (here === last) {
    target = here;
  } else {
    const exposure = boundHopExposure(sim, boundNode(sim, nodeIds[here]), boundNode(sim, nodeIds[here + 1]));
    target = exposure <= BOUND_MAX_EXPOSURE ? here + 1 : here;
    if (target === here) held = { exposure, atNodeId: nodeIds[here], wanted: nodeIds[here + 1] };
  }
  ally.goal = goalOfNode(nodeIds[target], boundNode(sim, nodeIds[target]));
  ally.tacticalState = target === last ? 'AdvanceOrder' : 'HoldCover';
  if (!held) {
    if (ally.holdingFor) ally.holdingFor = null;
    return;
  }
  if (ally.holdingFor !== held.wanted) {
    ally.holdingFor = held.wanted;
    sim.combatLog.push({
      clock: Number(sim.clock.toFixed(2)),
      type: 'section_bound_held',
      actorId: ally.id,
      nodeId: held.wanted,
      atNodeId: held.atNodeId,
      exposure: held.exposure,
    });
  }
}

/**
 * D4, Áreas B e C: lugares atrás de cada cobertura baixa do layout (`covers`, altura >= 1 m: de joelhos, ficam abrigados), do lado da
 * entrada da célula (a posição de Piotr ao entrar), ao longo do eixo maior, a COVER_SLOT_SPACING_M uns dos outros (no máximo 3), de cara
 * para a cobertura. Derivados dos dados do layout ao carregar o módulo: determinísticos e independentes do estado (um save guarda só o id).
 * VALORES SEM FONTE NO PDF: 2,5 m entre lugares, 0,9 m atrás da cobertura, 3 lugares no máximo, altura mínima de 1 m.
 */
export const COVER_SLOT_SPACING_M = 2.5;
export const COVER_SLOT_OFFSET_M = 0.9;
export const COVER_SLOT_MAX = 3;
function coverSlots(cellId) {
  const cell = cellsBCLayout.cells[cellId];
  const spawn = cell.playerSpawn;
  const out = {};
  for (const cover of cell.covers ?? []) {
    if (!(cover.height >= 1.0)) continue;
    const [x0, x1, z0, z1] = cover.bounds;
    const alongX = x1 - x0 >= z1 - z0;
    const length = alongX ? x1 - x0 : z1 - z0;
    const n = Math.max(1, Math.min(COVER_SLOT_MAX, Math.floor((length - 1.8) / COVER_SLOT_SPACING_M) + 1));
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const side = alongX ? (spawn.z < cz ? -1 : 1) : spawn.x < cx ? -1 : 1; // -1: lado de coordenadas menores (o da entrada)
    const behind = alongX ? (side < 0 ? z0 - COVER_SLOT_OFFSET_M : z1 + COVER_SLOT_OFFSET_M) : side < 0 ? x0 - COVER_SLOT_OFFSET_M : x1 + COVER_SLOT_OFFSET_M;
    for (let i = 0; i < n; i++) {
      const along = (i - (n - 1) / 2) * COVER_SLOT_SPACING_M;
      const x = Number((alongX ? cx + along : behind).toFixed(2));
      const z = Number((alongX ? behind : cz + along).toFixed(2));
      out[`${cover.id.replace(/^cov_/, 'cv_')}_s${i}`] = Object.freeze({
        x,
        z,
        // de cara para a cobertura, a direito (a direção para onde estão os hostis do outro lado)
        facing: alongX ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : side < 0 ? 0 : Math.PI,
        crouch: true,
      });
    }
  }
  return Object.freeze(out);
}
export const B_COVER_SLOTS = coverSlots('B');
export const C_COVER_SLOTS = coverSlots('C');
/** Nós de ordem de cada célula (id -> {x, z, facing, crouch}): o plano da secção e os lugares atrás das coberturas do layout. */
export const ORDER_NODES = Object.freeze({
  B: Object.freeze({ ...B_PLAN_NODES, ...B_COVER_SLOTS }),
  C: Object.freeze({ ...C09_PLAN_NODES, ...C_EVAC_NODES, ...C_COVER_SLOTS }),
});
/** Os nós de ordem de uma célula B/C como lista `{ id, x, z, facing, crouch }` (a Área A usa os coverNodes do layout). */
export function orderNodesOf(cellId) {
  return Object.entries(ORDER_NODES[cellId] ?? {}).map(([id, node]) => ({ id, ...node }));
}
export function orderNode(cellId, nodeId) {
  const node = ORDER_NODES[cellId]?.[nodeId];
  return node ? { id: nodeId, ...node } : null;
}
/** Um id de nó de ordem conhecido da célula B/C (o validador do snapshot usa-o: um save não inventa posições). */
export const isKnownOrderNode = (cellId, nodeId) => Object.hasOwn(ORDER_NODES[cellId] ?? {}, nodeId);

const isSupportNode = (nodeId) =>
  SECTION_SUPPORT_NODES.includes(nodeId) || C09_SUPPORT_NODES.includes(nodeId) || String(nodeId ?? '').startsWith('cv_c01_');

/** Nós que um elemento da secção quer em C09 agora (o mais avançado primeiro, os recuos depois). */
function c09NodeIds(sim, ally) {
  const combatant = (id) => sim.enemies.some((e) => e.id === id && e.alive && !e.nonCombatant);
  const workshopFixed = !sim.enemies.some((e) => e.buildingId === 'B10' && e.alive && !e.nonCombatant);
  switch (ally.id) {
    case 'pl_aux_01':
      return workshopFixed ? ['cv_c_yard_line_rkm', 'cv_c_north_rkm'] : ['cv_c_north_rkm'];
    case 'pl_aux_02':
      return workshopFixed ? ['cv_c_yard_line_rkm_2', 'cv_c_north_rkm_2'] : ['cv_c_north_rkm_2'];
    case 'pl_szymczak':
      return workshopFixed ? ['cv_c_yard_aid', 'cv_c_assembly_aid'] : ['cv_c_assembly_aid'];
    case 'pl_gruca':
      return workshopFixed ? ['cv_c_yard_parapet', 'cv_c_assembly_gruca'] : ['cv_c_assembly_gruca'];
    case 'pl_wierzba':
    case 'pl_malek': {
      const assembly = ally.id === 'pl_wierzba' ? 'cv_c_assembly_wierzba' : 'cv_c_assembly_malek';
      if (!workshopFixed) return [assembly];
      // quem está ferido (C07: saúde < 55) não vai a uma faixa: fica com Gruca no parapeito
      if (ally.health < C09_WOUNDED_HEALTH) return ['cv_c_yard_parapet', assembly];
      const target = C09_MANEUVER_TARGETS[ally.id].find(combatant);
      return target ? [C09_LANES[target], 'cv_c_yard_parapet', assembly] : ['cv_c_yard_parapet', assembly];
    }
    default:
      return ['cv_c_assembly_gruca'];
  }
}

/**
 * Adota o objetivo do plano base que a trela permite. `nodeIds` vem do lanço que o plano quer agora (o primeiro) para trás, até ao
 * mais recuado; vai-se ao mais avançado que está dentro da trela de Piotr (apoio SECTION_LEASH_M, assalto SECTION_ASSAULT_LEASH_M).
 * Se o que o plano quer não cabe na trela regista-se `section_holding` (uma vez por lanço) e a secção fixa e suprime onde pode; se
 * nenhum cabe, mantém o objetivo anterior (ou a posição). `stateOf(nodeId)`: o estado tático de quem vai para esse nó.
 */
function adoptPlanGoal(sim, ally, nodeIds, stateOf) {
  const wanted = nodeIds[0];
  let adopted = null;
  for (const nodeId of nodeIds) {
    const node = planNode(sim, nodeId);
    if (!node) continue;
    const leash = isSupportNode(nodeId) ? SECTION_LEASH_M : SECTION_ASSAULT_LEASH_M;
    if (Math.hypot(node.x - sim.player.x, node.z - sim.player.z) <= leash) {
      adopted = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
      break;
    }
  }
  if (adopted?.nodeId === wanted) {
    if (ally.holdingFor) ally.holdingFor = null;
    ally.goal = adopted;
    ally.tacticalState = stateOf(wanted);
    return true;
  }
  const wantedNode = planNode(sim, wanted);
  if (!wantedNode) return false;
  if (ally.holdingFor !== wanted) {
    ally.holdingFor = wanted;
    sim.combatLog.push({
      clock: Number(sim.clock.toFixed(2)),
      type: 'section_holding',
      actorId: ally.id,
      nodeId: wanted,
      distanceFromPiotr: Number(Math.hypot(wantedNode.x - sim.player.x, wantedNode.z - sim.player.z).toFixed(1)),
      leashM: isSupportNode(wanted) ? SECTION_LEASH_M : SECTION_ASSAULT_LEASH_M,
    });
  }
  if (adopted) {
    ally.goal = adopted; // avança só até onde a trela deixa
    ally.tacticalState = stateOf(adopted.nodeId);
  } else {
    ally.tacticalState = 'HoldCover';
  }
  return false;
}

export function updatePolishSquad(sim, dt) {
  const activeAxis = sim.flags['m02.axis'] || (sim.squadOrder?.axis ?? 'ditch');
  const mgGunner = sim.enemies.find((e) => e.id === 'DE-A05' && e.alive && !e.nonCombatant);
  // Boca da MG34 de B02 (fonte única: layout.mgEmplacement). A secção supre a abertura: ponto de vista 0,15 m fora, ponto de mira 0,20 m dentro.
  const mgMuzzle = sim.mgAperture;
  const cm = (n) => Math.round(n * 100) / 100;
  lapseSquadOrder(sim);
  stepRescues(sim); // D1: socorro quando seguro (janelas abertas, socorristas, levantar)

  // Assign tactical cover goals by squad state & elapsed time / progression
  for (const ally of sim.allies) {
    // Quem foi evacuado ou está ausente (Lis incapacitado antes de C11, «missing») já não age nem se desloca.
    if (!ally.alive || ally.state === 'DOWN' || ally.state === 'EVACUATED' || ally.state === 'MISSING' || ally.detachedOutOfCell) continue;
    ally.suppressed = Math.max(0, ally.suppressed - dt * 0.28);
    stepActorWeapon(sim, ally, dt);
    // Lis ferido amparado/carregado/abrigado (J3): o percurso é do diretor da Área C (updateLisC11); a IA da secção não o move nem ele dispara.
    if (ally.state === 'WALKING_SUPPORTED' || ally.state === 'CARRIED' || ally.state === 'EVACUATED_B12') continue;

    // D4: a ordem do jogador (cobrir aqui / avançar para ali) manda na equipa de assalto, em A, B e C; sem ordem, o plano base.
    const orderGoal = squadOrderGoalFor(sim, ally);
    // D1: quem foi escolhido para socorrer um caído vai ter com ele (só quando o local está seguro) e deixa o plano enquanto o faz
    const rescueGoal = rescueGoalFor(sim, ally);
    // o socorro acabou (levantou, interrompeu-se ou Piotr tomou a vez): o objetivo de socorro não fica a mandar no aliado
    if (!rescueGoal && ally.goal?.rescue) ally.goal = null;

    if (rescueGoal) {
      ally.goal = rescueGoal;
      ally.tacticalState = 'SupportMedic';
    } else if (orderGoal) {
      if (orderGoal !== ORDER_HOLD) ally.goal = orderGoal; // ORDER_HOLD: sem nó atribuído, mantém o objetivo/posição atual
      ally.tacticalState = sim.squadOrder.type === 'cover' ? 'HoldCover' : 'AdvanceOrder';
    } else if (sim.activeCellId === 'B') {
      // Cell B (Łęczyca Logistics Corridor): bound from south entry toward B05 workshop & B06 shop crossroads
      const nodeId = B_PLAN_ROLES[ally.id] ?? B_PLAN_ROLES.pl_gruca;
      ally.goal = goalOfNode(nodeId, B_PLAN_NODES[nodeId]);
      ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
    } else if (sim.activeCellId === 'C') {
      // Cell C (Leśmierz Passage & Evacuation): secure B09/B10/B11 (C09) and then cover B09 -> B12 evacuation route (C10-C11)
      const evacPhase = sim.c10Active || sim.c11Active;
      if (evacPhase) {
        if (C_BOUND_PLAN[ally.id]) {
          // Gruca: lanços abrigados, só com o lanço aberto (ver C_BOUND_PLAN); `holdingFor` é dele
          adoptBoundGoal(sim, ally, C_BOUND_PLAN[ally.id]);
        } else {
          if (ally.holdingFor) ally.holdingFor = null; // o plano de C09 acabou
          if (ally.id === 'pl_lis') {
            // o percurso de Lis é do diretor da Área C; sem objetivo vai para a casa de socorro
            ally.goal = ally.goal ?? { x: -56.0, z: 50.0, facing: Math.PI / 2, crouch: false, nodeId: 'cv_c_b12_lis' };
          } else {
            const nodeId = C_EVAC_ROLES[ally.id] ?? C_EVAC_ROLES.pl_gruca;
            ally.goal = goalOfNode(nodeId, C_EVAC_NODES[nodeId]);
          }
          ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
        }
      } else {
        // C09: plano de dois grupos com a trela de D4 (ver C09_PLAN_NODES)
        adoptPlanGoal(sim, ally, c09NodeIds(sim, ally), (nodeId) =>
          ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : nodeId.startsWith('cv_c_assembly') ? 'HoldCover' : 'AdvanceOrder',
        );
      }
    } else if (sim.c01Active) {
      // Os tempos contam desde que o jogador começou a avançar (a preparação em P1 não gasta o relógio da secção) e a secção só
      // toma a última cobertura, à frente do posto EA0, depois do contacto aberto (C02, PDF p. 12).
      const c01Contact = sim.c01Contact;
      const c01Elapsed = c01Contact?.movementStartedAt == null ? 0 : sim.clock - c01Contact.movementStartedAt;
      const c01Stage = c01Elapsed < 4.5 ? 0 : c01Elapsed < 14.0 || !c01Contact?.opened ? 1 : 2;
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
      const stage = Math.min(c01Stage, seq.length - 1);
      adoptPlanGoal(sim, ally, seq.slice(0, stage + 1).reverse(), () => (ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder'));
    } else if (ally.id === 'pl_aux_01' || ally.id === 'pl_aux_02') {
      // 1. rkm wz. 28 support pair (Nowak + Kowalski: nomes FORA DO PDF, sourceStatus 'fora_do_pdf'; K1 só prevê «dois auxiliares») holds fire base and advances to north courtyard wall once ditch team reaches B01
      const combatElapsed = sim.clock - (sim.ea1StartedAt ?? 0);
      const ditchAdvanced = combatElapsed >= 18 || sim.player.z > -35;
      const nodeId = ditchAdvanced
        ? (ally.id === 'pl_aux_01' ? 'cv_gate_wall_west_s' : 'cv_b01_east_corner')
        : (ally.id === 'pl_aux_01' ? 'cv_start_parapet_e' : 'cv_start_parapet_w');
      const base = ally.id === 'pl_aux_01' ? 'cv_start_parapet_e' : 'cv_start_parapet_w';
      adoptPlanGoal(sim, ally, nodeId === base ? [base] : [nodeId, base], () => 'HoldAndSuppress');
    } else if (ally.id === 'pl_szymczak') {
      // Medic stays in covered support behind Gruca and moves to orchard in C04
      const combatElapsed = sim.clock - (sim.ea1StartedAt ?? 0);
      const c04Ready = sim.objective.id === 'C04' || sim.objective.id === 'O03';
      const nodeId = c04Ready
        ? 'cv_courtyard_consolidate'
        : combatElapsed >= 14
          ? 'cv_ditch_mid_b'
          : 'cv_start_parapet_w';
      adoptPlanGoal(sim, ally, nodeId === 'cv_start_parapet_w' ? [nodeId] : [nodeId, 'cv_start_parapet_w'], () => 'SupportMedic');
    } else {
      // Assault & flank team (Gruca, Lis, Wierzba, Małek)
      const combatElapsed = sim.clock - (sim.ea1StartedAt ?? 0);
      if (activeAxis === 'orchard') {
        const stage = combatElapsed < 12 ? 0 : combatElapsed < 26 ? 1 : 2;
        const mapByRole = {
          pl_gruca: ['cv_orchard_bank_e', 'cv_b03_south_entry', 'cv_courtyard_consolidate'],
          pl_wierzba: ['cv_orchard_bank_e', 'cv_b03_north_exit', 'cv_gate_wall_west_s'],
          pl_lis: ['cv_ditch_north_a', 'cv_b01_north_wall', 'cv_b01_hall_in'],
          pl_malek: ['cv_ditch_north_b', 'cv_b01_kitchen_in', 'cv_b01_east_corner'],
        };
        const seq = mapByRole[ally.id] ?? mapByRole.pl_gruca;
        const upTo = Math.min(stage, seq.length - 1);
        adoptPlanGoal(sim, ally, seq.slice(0, upTo + 1).reverse(), (id) => (seq.indexOf(id) >= 1 ? 'FlankMove' : 'AdvanceOrder'));
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
        const upTo = Math.min(stage, seq.length - 1);
        adoptPlanGoal(sim, ally, seq.slice(0, upTo + 1).reverse(), (id) => (id.startsWith('cv_b01_') && id.endsWith('_in') ? 'ClearRoom' : 'AdvanceOrder'));
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
        // D4: «o log deve relacionar ação e resultado» — a cobertura tomada por ordem do jogador diz qual foi a ordem
        ...(orderGoal && orderGoal !== ORDER_HOLD ? { byOrder: sim.squadOrder.type } : {}),
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
    if (ally.reloadingUntil > sim.clock || ally.mag <= 0 || sim.clock < ally.nextFireAt || isLifting(sim, ally)) {
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
      if (enemy.state === 'WITHDRAWING') continue; // D2: a secção deixa recuar o posto EA0 («posto que recua deixa de bloquear»), não o persegue a tiro
      if (sim.c01Active && enemy.encounterId !== 'EA0') continue;
      // C02: a secção não abre fogo sobre um posto que ainda não deu pelo contacto (o primeiro tiro é do contacto aberto).
      if (sim.c01Active && !sim.c01Contact?.opened) continue;
      // C06: idem à entrada em B, a secção não abre fogo sobre EB1 antes do contacto (o primeiro tiro é do contacto aberto)
      if (areaBContactPending(sim)) continue;
      const dist = Math.hypot(enemy.x - ally.x, enemy.z - ally.z);
      if (dist > (WEAPON_PROFILES[ally.weapon]?.range ?? 180)) continue;

      const hasLoS = sim.world.lineOfSight(ally, enemy, { includeFoliage: true });
      // rkm_gunner can also lay suppressive fire on the B02 MG aperture if it has clear ray to the aperture lip
      const isMgSuppressTarget =
        !sim.c01Active &&
        ally.id === 'pl_aux_01' &&
        enemy.id === 'DE-A05' &&
        sim.world.lineOfSight(ally, { x: cm(mgMuzzle.x - 0.15), y: 0, z: mgMuzzle.z, eyeHeight: mgMuzzle.y, space: 'metres' }, { includeFoliage: false });

      if (!hasLoS && !isMgSuppressTarget) continue;

      const aimPt = isMgSuppressTarget && !hasLoS
        ? { x: cm(mgMuzzle.x + 0.2), y: cm(mgMuzzle.y - 0.04), z: mgMuzzle.z }
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

/**
 * Grupo de moral de um hostil (D3: «baixas elevadas ou saída comprometida podem produzir recuo/rendição»): o encontro a que pertence.
 * Os da quinta (EA1) não trazem `encounterId` no layout.
 */
export const moraleGroupOf = (e) => e.encounterId ?? 'EA1';

/**
 * D2 (PDF p. 16, tabela do roster): o posto EA0 (DE-A01…A04, vala transversal) tem como alteração permitida «recuam para borda oeste;
 * não reaparecem na quinta»; D1 (O01, p. 16): «posto que recua deixa de bloquear»; C02 (p. 13): «não surgem novos homens para repor
 * o combate». Moral por grupo de encontro, determinista (sem RNG): quando METADE do posto está fora de combate (mortos, caídos,
 * rendidos ou já retirados) e o posto já abriu fogo (C02 quer o clarão que Lis aponta) os restantes que ainda combatem recuam, a
 * andar e sem disparar, para a borda oeste jogável
 * (`bounds.c01Approach.minX` do layout mais a margem) e ficam lá «retirados» (WITHDRAWN: vivos, fora de combate, contados no
 * roster; nunca passam à quinta). Só depois de o contacto de C02 estar aberto (antes o posto está «sem alerta»).
 * VALORES SEM FONTE NO PDF (D3 só diz «baixas elevadas»): 2 baixas de 4 (metade), margem de 2 m à borda, 25 s de limite do recuo.
 */
export const EA0_RETREAT_CASUALTIES = 2;
export const EA0_WEST_EDGE_MARGIN_M = 2;
/** Se o recuo não chega à borda neste tempo (rota cortada), o homem fica retirado onde estiver: o posto nunca bloqueia para sempre. */
export const EA0_WITHDRAW_MAX_SEC = 25;
const EA0_WITHDRAW_ARRIVE_M = 0.6;

function beginEa0Withdrawal(sim, enemy, neutralized) {
  const bounds = sim.world.layout.bounds ?? {};
  const westX = (bounds.c01Approach?.minX ?? bounds.playable?.minX ?? -50) + EA0_WEST_EDGE_MARGIN_M;
  enemy.state = 'WITHDRAWING';
  enemy.withdrawStartedAt = instantAt(sim.clock);
  enemy.goal = { x: westX, z: roundNoNegZero(enemy.z), crouch: false };
  enemy.navCorners = null;
  enemy.seeingTargetId = null;
  enemy.memory = null;
  sim.combatLog.push({
    clock: Number(sim.clock.toFixed(2)),
    type: 'enemy_withdrawing',
    actorId: enemy.id,
    encounterId: 'EA0',
    casualties: neutralized,
    x: Number(enemy.x.toFixed(2)),
    z: Number(enemy.z.toFixed(2)),
    toX: westX,
  });
}

function stepEa0Withdrawal(sim, enemy, dt) {
  stepActorNavigation(sim, enemy, dt);
  const goal = enemy.goal;
  const arrived = Boolean(goal) && Math.hypot(goal.x - enemy.x, goal.z - enemy.z) <= EA0_WITHDRAW_ARRIVE_M;
  const timedOut = sim.clock - enemy.withdrawStartedAt >= EA0_WITHDRAW_MAX_SEC;
  if (!arrived && !timedOut) return;
  enemy.state = 'WITHDRAWN';
  enemy.nonCombatant = true;
  enemy.moving = false;
  enemy.goal = null;
  enemy.navCorners = null;
  sim.combatLog.push({
    clock: Number(sim.clock.toFixed(2)),
    type: 'enemy_withdrawn',
    actorId: enemy.id,
    encounterId: 'EA0',
    x: Number(enemy.x.toFixed(2)),
    z: Number(enemy.z.toFixed(2)),
    ...(arrived ? {} : { timedOut: true }),
  });
}

export function updateGermanGarrison(sim, dt) {
  // Moral por grupo: a rendição conta SÓ as baixas do próprio encontro (EA1, EB1, EC1, EC2). Antes contava todos os hostis que não
  // fossem de EA0, pelo que as baixas de EC1 rendiam EC2 no primeiro tick de C10 (e DE-A05, inexistente nas células B/C, dava a MG
  // por abatida). A condição da MG é a de DE-A05 e só vale para o grupo da quinta, onde ela existe.
  const moraleGroups = new Map();
  for (const e of sim.enemies) {
    const key = moraleGroupOf(e);
    const g = moraleGroups.get(key) ?? { size: 0, neutralized: 0, shots: 0 };
    g.size += 1;
    if (!e.alive || e.nonCombatant) g.neutralized += 1;
    g.shots += e.shotsFired ?? 0;
    moraleGroups.set(key, g);
  }
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

    const moraleGroup = moraleGroups.get(moraleGroupOf(enemy));
    const neutralizedCount = moraleGroup?.neutralized ?? 0;
    const groupMgDown = moraleGroupOf(enemy) === 'EA1' ? mgDown : true;

    // Check C04 wounded non-combatant transition in southern orchard
    if (enemy.c04Candidate && !enemy.nonCombatant && (enemy.health <= 48 || (groupMgDown && neutralizedCount >= 6))) {
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

    // Check garrison morale collapse (retreat / surrender when MG is down and >= 7 defenders of the SAME group are neutralized)
    if (!enemy.nonCombatant && groupMgDown && neutralizedCount >= 7) {
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

    // C02 (PDF p. 12): o posto EA0 está «sem alerta» até ao contacto aberto (30-60 s depois de o jogador avançar): não vê, não
    // recorda (os ruídos que não abrem o contacto não o alertam) e não dispara. Antes via Piotr no tick 0 a ~67 m.
    if (sim.c01Active && enemy.encounterId === 'EA0' && !sim.c01Contact?.opened) {
      enemy.seeingTargetId = null;
      enemy.memory = null;
      enemy.state = 'HOLD_SECTOR';
      continue;
    }

    // C06: a entrada em B tem a mesma janela de segurança (ver openAreaBContact): EB1 «sem alerta» até ao contacto aberto.
    if (enemy.encounterId === 'EB1' && areaBContactPending(sim)) {
      enemy.seeingTargetId = null;
      enemy.memory = null;
      enemy.state = 'HOLD_SECTOR';
      continue;
    }

    // D2: o posto EA0 recua (ver EA0_RETREAT_CASUALTIES). Quem recua anda para a borda oeste e não dispara nem percebe ninguém.
    if (enemy.encounterId === 'EA0') {
      // (só depois de o posto ter aberto fogo: C02 quer o clarão que Lis aponta; um posto que cai de uma só salva não «recua»)
      if (enemy.state !== 'WITHDRAWING' && neutralizedCount >= EA0_RETREAT_CASUALTIES && (moraleGroup?.shots ?? 0) > 0) {
        beginEa0Withdrawal(sim, enemy, neutralizedCount);
      }
      if (enemy.state === 'WITHDRAWING') {
        stepEa0Withdrawal(sim, enemy, dt);
        continue;
      }
    }

    stepActorWeapon(sim, enemy, dt);

    // Local reserve movement (DE-A12, DE-A13 in Area A; or EC2 reserve DE-C09..DE-C20 in Area C)
    if (enemy.encounterId === 'EC2' && sim.c10Active && typeof enemy.goalX === 'number' && !enemy.goal) {
      enemy.goal = { x: enemy.goalX, z: enemy.goalZ, crouch: true };
      enemy.state = 'ADVANCE_RESERVE';
    } else if (enemy.role === 'reserve' && !enemy.reserveShifted) {
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

    // Fallback to secondary cover if heavily suppressed and damaged. (O posto EA0 não: o `fallback` dos seus homens aponta para a quinta e
    // D2 manda-os recuar para a borda oeste, ver acima.)
    if (enemy.health < 55 && enemy.suppressed > 0.65 && enemy.fallback && !enemy.fellBack && enemy.encounterId !== 'EA0') {
      enemy.goal = { x: enemy.fallback[0], z: enemy.fallback[1], crouch: true };
      enemy.fellBack = true;
      enemy.state = 'FALLBACK_COVER';
    }

    stepActorNavigation(sim, enemy, dt);

    // Honest Visual Perception (AI-02: never tracks hidden targets through solid walls!)
    // (o último grupo também é alvo a partir de C10: C11, p. 14, «quem foi atingido permanece ferido ou morto»)
    const potentialTargets = [sim.player, ...sim.allies, ...lastGroupTargets(sim)].filter((t) => t && t.alive && t.state !== 'DOWN' && !t.detachedOutOfCell);
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
        x: roundNoNegZero(visibleTarget.x),
        y: roundNoNegZero(visibleTarget.y + (visibleTarget.crouched ? 0.95 : 1.25)),
        z: roundNoNegZero(visibleTarget.z),
        seenAt: Number(sim.clock.toFixed(2)),
        expiresAt: Number((sim.clock + 6.0).toFixed(2)),
        source: 'visual',
      };
      if (enemy.weapon !== 'mg34') {
        // `+ 0`: uma posição em -0 (jogador em z = -0) daria facing -π ao vivo e +π depois de restaurar (o save perde o -0).
        enemy.facing = Math.atan2(visibleTarget.z - enemy.z + 0, visibleTarget.x - enemy.x + 0);
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
          enemy.facing = Math.atan2(enemy.memory.z - enemy.z + 0, enemy.memory.x - enemy.x + 0);
        }
      } else {
        enemy.memory = null;
        enemy.state = 'HOLD_SECTOR';
      }
    }
  }
}
