import { eyePosition } from '../world/spatial.js';
import { movePlayer, PLAYER_PHYSICS } from '../world/m01-player-physics.js';

/**
 * Arredonda a `digits` casas SEM devolver -0 (Number((-0.001).toFixed(2)) é -0). O JSON do save não representa -0 e o
 * snapshot normaliza-o para 0; um -0 no estado vivo que chegue a Math.atan2 dá -π onde o estado restaurado dá +π (FIX-2c).
 */
export function roundNoNegZero(value, digits = 2) {
  return Number(value.toFixed(digits)) + 0;
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
 * O auxiliar do rkm e o sanitário seguem o seu próprio papel. As Áreas B e C não têm nós de cobertura no layout: sem ordens aí.
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

/** Posições válidas para as ordens do jogador: os nós de cobertura da Área A em uso (corredor de C01 ou quinta), sem hostis em cima. */
export function squadOrderPositions(sim) {
  if (sim.activeCellId !== 'A') return [];
  const out = [];
  for (const node of sim.coverNodesById.values()) {
    if (node.id.startsWith('cv_c01_') !== Boolean(sim.c01Active)) continue;
    if (node.id === 'cv_c01_outpost_clear') continue; // o posto EA0 ainda é dos hostis
    const taken = sim.enemies.some(
      (e) => e.alive && !e.nonCombatant && Math.hypot(e.x - node.x, e.z - node.z) < SQUAD_ORDER_ENEMY_CLEARANCE_M,
    );
    if (!taken) out.push(node);
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
    return a && a.alive && !['DOWN', 'EVACUATED', 'MISSING'].includes(a.state) && !a.detachedOutOfCell;
  });
  const around = nearestPositions(positions, anchor, SQUAD_ORDER_GROUP_M); // a âncora é a primeira (distância 0)
  const assignments = {};
  team.forEach((id, i) => {
    if (around[i]) assignments[id] = around[i].id;
  });
  return {
    ok: true,
    order: { type, axis: null, issuedAt, nodeId: anchor.id, x: anchor.x, z: anchor.z, assignments },
  };
}

const ORDER_HOLD = Object.freeze({ hold: true });

/** Caduca a ordem em vigor quando deixa de se aplicar (ver SQUAD_ORDER_COVER_LAPSE_EXTRA_M / SQUAD_ORDER_ARRIVED_M). */
function lapseSquadOrder(sim) {
  const order = sim.squadOrder;
  if (!order || order.type === 'auto') return;
  const d = Math.hypot(sim.player.x - order.x, sim.player.z - order.z);
  let reason = null;
  if (sim.activeCellId !== 'A') reason = 'celula_mudou';
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
  if (!order || order.type === 'auto' || sim.activeCellId !== 'A' || !SQUAD_ORDER_ASSAULT_TEAM.includes(ally.id)) return null;
  const nodeId = order.assignments?.[ally.id];
  if (!nodeId) return ORDER_HOLD;
  const node = sim.coverNodesById.get(nodeId);
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

export function updatePolishSquad(sim, dt) {
  const coverById = sim.coverNodesById;
  const activeAxis = sim.flags['m02.axis'] || (sim.squadOrder?.axis ?? 'ditch');
  const mgGunner = sim.enemies.find((e) => e.id === 'DE-A05' && e.alive && !e.nonCombatant);
  lapseSquadOrder(sim);

  // Assign tactical cover goals by squad state & elapsed time / progression
  for (const ally of sim.allies) {
    // Quem foi evacuado ou está ausente (Lis incapacitado antes de C11, «missing») já não age nem se desloca.
    if (!ally.alive || ally.state === 'DOWN' || ally.state === 'EVACUATED' || ally.state === 'MISSING' || ally.detachedOutOfCell) continue;
    ally.suppressed = Math.max(0, ally.suppressed - dt * 0.28);
    stepActorWeapon(sim, ally, dt);
    // Lis ferido amparado/carregado/abrigado (J3): o percurso é do diretor da Área C (updateLisC11); a IA da secção não o move nem ele dispara.
    if (ally.state === 'WALKING_SUPPORTED' || ally.state === 'CARRIED' || ally.state === 'EVACUATED_B12') continue;

    // D4: a ordem do jogador (cobrir aqui / avançar para ali) manda na equipa de assalto da Área A; sem ordem, o plano base.
    const orderGoal = squadOrderGoalFor(sim, ally);

    if (sim.activeCellId === 'B') {
      // Cell B (Łęczyca Logistics Corridor): bound from south entry toward B05 workshop & B06 shop crossroads
      const bGoals = {
        pl_gruca: { x: -18.0, z: 10.0, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_west_wall' },
        pl_wierzba: { x: -32.0, z: -12.0, facing: -Math.PI / 2, crouch: false, nodeId: 'cv_b05_south' },
        pl_lis: { x: -6.0, z: 50.0, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_south_barricade' },
        pl_malek: { x: -22.0, z: 10.5, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_west_wall_2' },
        pl_szymczak: { x: -38.0, z: 38.0, facing: 0, crouch: true, nodeId: 'cv_b07_aid' },
        pl_aux_01: { x: 11.5, z: 6.5, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_east_cart' },
        pl_aux_02: { x: 14.0, z: 6.8, facing: -Math.PI / 2, crouch: true, nodeId: 'cv_b_east_cart_2' },
      };
      const g = bGoals[ally.id] ?? bGoals.pl_gruca;
      ally.goal = g;
      ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
    } else if (sim.activeCellId === 'C') {
      // Cell C (Leśmierz Passage & Evacuation): secure B09/B10/B11 and then cover B09 -> B12 evacuation route
      const evacPhase = sim.c10Active || sim.c11Active;
      const cGoals = evacPhase
        ? {
            pl_gruca: { x: -32.0, z: 18.0, facing: 0.4, crouch: true, nodeId: 'cv_c_evac_gruca' },
            pl_wierzba: { x: -14.0, z: -4.0, facing: 0.3, crouch: true, nodeId: 'cv_c_b09_east' },
            pl_malek: { x: -46.0, z: 36.0, facing: 0.5, crouch: true, nodeId: 'cv_c_evac_malek' },
            pl_szymczak: { x: -56.0, z: 46.0, facing: -Math.PI / 2, crouch: false, nodeId: 'cv_c_b12_aid' },
            pl_aux_01: { x: -6.0, z: -11.5, facing: 0.5, crouch: true, nodeId: 'cv_c_yard_rkm' },
            pl_aux_02: { x: -4.0, z: -11.5, facing: 0.5, crouch: true, nodeId: 'cv_c_yard_rkm_2' },
            pl_lis: ally.goal ?? { x: -56.0, z: 50.0, facing: Math.PI / 2, crouch: false, nodeId: 'cv_c_b12_lis' },
          }
        : {
            pl_gruca: { x: -6.0, z: -15.5, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_yard_parapet' },
            pl_wierzba: { x: 12.0, z: -24.0, facing: 0.0, crouch: false, nodeId: 'cv_c_b10_flank' },
            pl_malek: { x: -28.0, z: -22.0, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_b09_north' },
            pl_szymczak: { x: -8.0, z: -38.0, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_north_wall' },
            pl_aux_01: { x: -4.0, z: -39.0, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_north_rkm' },
            pl_aux_02: { x: -2.0, z: -39.0, facing: Math.PI / 2, crouch: true, nodeId: 'cv_c_north_rkm_2' },
          };
      const g = cGoals[ally.id] ?? cGoals.pl_gruca;
      if (g) {
        ally.goal = g;
        ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
      }
    } else if (orderGoal) {
      if (orderGoal !== ORDER_HOLD) ally.goal = orderGoal; // ORDER_HOLD: sem nó atribuído, mantém o objetivo/posição atual
      ally.tacticalState = sim.squadOrder.type === 'cover' ? 'HoldCover' : 'AdvanceOrder';
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
      const nodeId = seq[Math.min(c01Stage, seq.length - 1)];
      const node = coverById.get(nodeId);
      if (node) {
        ally.goal = { x: node.x, z: node.z, facing: node.facing, crouch: node.crouch, nodeId };
        ally.tacticalState = ally.id.startsWith('pl_aux') ? 'HoldAndSuppress' : 'AdvanceOrder';
      }
    } else if (ally.id === 'pl_aux_01' || ally.id === 'pl_aux_02') {
      // 1. rkm wz. 28 support pair (Nowak + Kowalski: nomes FORA DO PDF, sourceStatus 'fora_do_pdf'; K1 só prevê «dois auxiliares») holds fire base and advances to north courtyard wall once ditch team reaches B01
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
      if (activeAxis === 'orchard') {
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
      // C02: a secção não abre fogo sobre um posto que ainda não deu pelo contacto (o primeiro tiro é do contacto aberto).
      if (sim.c01Active && !sim.c01Contact?.opened) continue;
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

/**
 * Grupo de moral de um hostil (D3: «baixas elevadas ou saída comprometida podem produzir recuo/rendição»): o encontro a que pertence.
 * Os da quinta (EA1) não trazem `encounterId` no layout; EA0 (o posto de C01) não tem moral de grupo.
 * PENDENTE (FIX-CD, D2 p. 16): a alteração prevista para o EA0 é «recuam para borda oeste; não reaparecem na quinta», não a rendição;
 * não é trivial (exige um recuo navegado de não combatentes até à borda oeste e o limiar de 4 homens), por isso o EA0 continua sem moral.
 */
export const moraleGroupOf = (e) => e.encounterId ?? 'EA1';

export function updateGermanGarrison(sim, dt) {
  // Moral por grupo: a rendição conta SÓ as baixas do próprio encontro (EA1, EB1, EC1, EC2). Antes contava todos os hostis que não
  // fossem de EA0, pelo que as baixas de EC1 rendiam EC2 no primeiro tick de C10 (e DE-A05, inexistente nas células B/C, dava a MG
  // por abatida). A condição da MG é a de DE-A05 e só vale para o grupo da quinta, onde ela existe.
  const moraleGroups = new Map();
  for (const e of sim.enemies) {
    if (e.encounterId === 'EA0') continue;
    const key = moraleGroupOf(e);
    const g = moraleGroups.get(key) ?? { size: 0, neutralized: 0 };
    g.size += 1;
    if (!e.alive || e.nonCombatant) g.neutralized += 1;
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
