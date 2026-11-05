import { computeSpatialAudioParams, MATERIAL_IMPACT_AUDIO_MAP } from '../game/m02-audiovisual-director.js';
import { eyePosition } from '../world/spatial.js';

// M02 «Operação Bzura» — consumidores de APRESENTAÇÃO dos eventos da simulação e do diretor audiovisual (secção L do PDF, pp. 41-43; auditoria L.md).
// Módulo PURO (sem Three.js, sem DOM, sem AudioContext): converte eventos/estado em indicadores direcionais, legendas PT e pedidos de áudio placeholder.
// FRONTEIRA: só LÊ a simulação (sim.hazardBlasts, sim.horizon, sim.player, sim.audiovisual). Nunca escreve na simulação, no diretor nem no snapshot:
// o diretor guarda spatialAudioLog/directionalIndicators no snapshot (SAVE-01), por isso aqui os parâmetros acústicos vêm de computeSpatialAudioParams (puro).
// Tudo em METROS (x/z solo). Bearing: 0 = em frente, positivo = à direita (sentido horário visto de cima).

export const SUBTITLE_TTL_SEC = 3.6;
export const MAX_SUBTITLES = 3;
export const BURST_RATE_LIMIT_SEC = 0.9; // no máximo uma legenda/aviso por categoria de rajada neste intervalo (evita encher o ecrã)
export const FIRE_INDICATOR_TTL_SEC = 2.2; // igual à validade dos indicadores do diretor
export const FIRE_AUDIBLE_MAX_M = 700; // fogo mais longe que isto não gera legenda nem indicador (continua visível como traçante, se existir)
export const BLAST_LINGER_SEC = 0.35; // o aviso persiste este tempo depois do impacto agendado, para não piscar no tick da explosão

/** Ângulo (rad, em (−π, π]) da fonte (x, z) relativo ao jogador: 0 = em frente, positivo = à direita. Convenção do jogo: olhar = (cos a, sin a) em (x, z). */
export function relativeBearingRad(player, x, z) {
  const world = Math.atan2(z - player.z, x - player.x);
  let rel = world - player.angle;
  rel = ((rel + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return rel === -Math.PI ? Math.PI : rel;
}

const BEARING_WORDS = Object.freeze([
  'à frente',
  'à frente, à direita',
  'à direita',
  'atrás, à direita',
  'atrás',
  'atrás, à esquerda',
  'à esquerda',
  'à frente, à esquerda',
]);

/** Palavra PT-PT do setor (8 de 45°) onde está a fonte, para as legendas. */
export function bearingWord(relRad) {
  const sector = Math.round(relRad / (Math.PI / 4));
  return BEARING_WORDS[((sector % 8) + 8) % 8];
}

/** Pan estéreo −1 (esquerda) .. +1 (direita) a partir do ângulo relativo (seno: frente/trás ficam centrados). */
export function panFromBearing(relRad) {
  return Math.max(-1, Math.min(1, Math.sin(relRad)));
}

/**
 * Tabela evento -> consumidor. Cada tipo de evento emitido pela simulação (ou pelo horizonte) tem de aparecer aqui, com o consumidor REAL ou a razão de não ter
 * consumidor próprio. Verificada por tests/m02-23-presentation-consumers.test.js contra o código-fonte da simulação: um evento novo sem entrada faz o teste falhar.
 * consumer: 'renderer' (m02-01-renderer.js), 'presentation' (este módulo -> HUD/áudio placeholder em m02-01-main.js), 'hud' (m02-01-main.js lê o estado),
 *           'state-only' (o efeito é um estado já mostrado noutro sítio; sem apresentação própria do evento).
 */
export const EVENT_CONSUMERS = Object.freeze({
  'shot-fired': Object.freeze({ consumer: 'renderer+presentation', note: 'traçante (renderer) e áudio placeholder do tiro próprio; impacto pelo log do diretor' }),
  'actor-burst': Object.freeze({ consumer: 'renderer+presentation', note: 'traçante (renderer); fogo inimigo gera indicador direcional, legenda e áudio' }),
  'mg-burst': Object.freeze({ consumer: 'renderer+presentation', note: 'traçante (renderer); rajada da MG34 gera indicador direcional, legenda e áudio' }),
  'grenade-thrown': Object.freeze({ consumer: 'presentation', note: 'áudio placeholder do lançamento; o voo não é simulado' }),
  'grenade-exploded': Object.freeze({ consumer: 'renderer+presentation', note: 'esfera de clarão (renderer); legenda, indicador e áudio' }),
  'blast-warning': Object.freeze({ consumer: 'presentation', note: 'aviso 5-8 s: indicador direcional e contagem no HUD, legenda e áudio crítico (sem atraso)' }),
  'horizon-flash': Object.freeze({ consumer: 'renderer', note: 'clarão desenhado por estado (sim.horizon.hsA2); a legenda/áudio chegam com o estrondo' }),
  'horizon-acoustic-boom': Object.freeze({ consumer: 'presentation', note: 'estrondo distante com atraso d/343 m/s: legenda e áudio placeholder' }),
  'horizon-actor-promoted': Object.freeze({ consumer: 'renderer', note: 'LOD do ator distante lido por estado a cada frame' }),
  'horizon-actor-demoted': Object.freeze({ consumer: 'renderer', note: 'LOD do ator distante lido por estado a cada frame' }),
  'temporal-state-changed': Object.freeze({ consumer: 'renderer', note: 'renderFrame sincroniza o preset de luz com sim.horizon.lightingPreset' }),
  'door-toggled': Object.freeze({ consumer: 'renderer+presentation', note: 'abertura redesenhada pela revisão do mundo; áudio placeholder da porta' }),
  'player-landing': Object.freeze({ consumer: 'presentation', note: 'áudio placeholder da aterragem; o dano é decidido pela simulação' }),
  'dialogue-line': Object.freeze({ consumer: 'hud', note: 'faixa de diálogo (legenda PT) lida de sim.dialogue.activeLine' }),
  'dialogue-line-dropped': Object.freeze({ consumer: 'state-only', note: 'linha descartada pela simulação; nada a mostrar' }),
  'scene-changed': Object.freeze({ consumer: 'hud', note: 'objetivo/cena no HUD lidos do estado' }),
  'transition-tab': Object.freeze({ consumer: 'hud', note: 'cartela lida de sim.activeCartela' }),
  'squad-order': Object.freeze({ consumer: 'hud', note: 'linha «Ordem à secção» lida do estado' }),
  'squad-order-rejected': Object.freeze({ consumer: 'hud', note: 'recusa e motivo na linha «Ordem à secção»' }),
  'squad-order-lapsed': Object.freeze({ consumer: 'hud', note: 'a ordem caduca no estado; a linha de ordem reflete-o' }),
  'checkpoint-saved': Object.freeze({ consumer: 'hud', note: 'aviso de saves lido de sim.lastCheckpointPersist' }),
  'checkpoint-rejected': Object.freeze({ consumer: 'hud', note: 'aviso de saves lido de sim.lastCheckpointPersist' }),
  restored: Object.freeze({ consumer: 'renderer+presentation', note: 'o renderer reconstrói pela revisão do mundo; a apresentação descarta legendas, indicadores e áudio pendentes' }),
  'mission-failed': Object.freeze({ consumer: 'hud', note: 'ecrã de falha lido de sim.missionFailed' }),
  'mission-restarted': Object.freeze({ consumer: 'hud+presentation', note: 'o ecrã de falha desaparece pelo estado; a apresentação descarta legendas e áudio pendentes' }),
  'supply-volume-picked': Object.freeze({ consumer: 'hud', note: 'prompt de volume lido de sim.currentVolumePrompt()' }),
  'supply-volumes-abandoned': Object.freeze({ consumer: 'state-only', note: 'estado dos volumes lido pelo renderer (cena B)' }),
  'c04-wounded-marked': Object.freeze({ consumer: 'state-only', note: 'marca de giz lida pelo prompt de giz do HUD' }),
  'cart-shaft-broken': Object.freeze({ consumer: 'state-only', note: 'carroça redesenhada pelo estado (sem cue próprio; pendente do áudio de carroça)' }),
});

const OWN_SHOT_CUE = Object.freeze({ cueId: 'sfx_player_shot_placeholder', family: 'weapon' });

/**
 * Alimenta o HUD e o áudio placeholder a partir dos eventos de um frame e do estado da simulação. Uma instância por bancada.
 * `ingest(sim, events)` consome os eventos; `view(sim)` devolve o modelo de vista (indicadores, avisos de explosão, legendas, estado da arma, zumbido);
 * `drainAudio(out)` entrega os pedidos de áudio pendentes. Nada escreve na simulação.
 */
export class M02PresentationFeed {
  constructor() {
    this.reset();
  }

  reset() {
    this.subtitles = []; // { text, expiresAt, category }
    this.fireIndicators = []; // { x, z, category, expiresAt }
    this.audioQueue = []; // pedidos de áudio placeholder pendentes
    this.lastBurstAt = Object.create(null);
    this.lastAudioRecord = null;
    this.lastAudioClock = -Infinity;
    this.logBaselinePending = true; // o 1.º ingestDirectorLog só fixa a linha de base (um restauro não reproduz o passado)
    this.announcedBlasts = new Set();
    this.counters = { subtitlesShown: 0, audioRequests: 0, blastWarningsSeen: 0 };
  }

  #subtitle(sim, text, category, ttl = SUBTITLE_TTL_SEC) {
    if (!sim.audiovisual?.accessibility.subtitlesEnabled) return;
    const same = this.subtitles.find((s) => s.text === text);
    if (same) {
      same.expiresAt = Math.max(same.expiresAt, sim.clock + ttl); // a mesma legenda renova-se em vez de se repetir no ecrã
      return;
    }
    this.subtitles.push({ text, expiresAt: sim.clock + ttl, category });
    if (this.subtitles.length > MAX_SUBTITLES) this.subtitles.shift();
    this.counters.subtitlesShown++;
  }

  #audio(cue) {
    this.audioQueue.push(cue);
    this.counters.audioRequests++;
  }

  #rateLimited(sim, category) {
    const last = this.lastBurstAt[category];
    if (last !== undefined && sim.clock - last < BURST_RATE_LIMIT_SEC && sim.clock >= last) return true;
    this.lastBurstAt[category] = sim.clock;
    return false;
  }

  #spatialCue(sim, sourcePos, { cueId, category, family, critical = false }) {
    const eye = eyePosition(sim.player);
    const p = computeSpatialAudioParams(sim.world, eye, sourcePos, {
      isCriticalWarning: critical,
      reducedDynamicRange: sim.audiovisual?.accessibility.reducedDynamicRange ?? false,
    });
    const rel = relativeBearingRad(sim.player, sourcePos.x, sourcePos.z);
    this.#audio({
      cueId,
      category,
      family,
      scale: p.scale,
      distanceM: Number(p.dist.toFixed(1)),
      delaySec: p.delaySec,
      gain: p.gainMultiplier,
      lowPassHz: p.lowPassHz,
      pan: Number(panFromBearing(rel).toFixed(3)),
      critical,
      placeholder: true,
    });
    return { params: p, rel };
  }

  /** Consome os eventos de um frame (renderer.frameEvents). Seguro com lista vazia. */
  ingest(sim, events) {
    for (const evt of events) {
      switch (evt.type) {
        case 'blast-warning': {
          this.counters.blastWarningsSeen++;
          this.announcedBlasts.add(evt.blastId);
          const { params, rel } = this.#spatialCue(sim, evt.position, { cueId: 'sfx_blast_warning_placeholder', category: 'blast_warning', family: 'warning', critical: true });
          const secs = Math.max(1, Math.ceil(evt.warningSec));
          this.#subtitle(sim, `[Aviso: explosão iminente ${bearingWord(rel)}, a ${Math.round(params.dist)} m, daqui a ${secs} s]`, 'blast_warning', Math.max(SUBTITLE_TTL_SEC, evt.warningSec));
          break;
        }
        case 'grenade-exploded': {
          if (!evt.center) break;
          const { rel } = this.#spatialCue(sim, evt.center, { cueId: MATERIAL_IMPACT_AUDIO_MAP.earth.cueId, category: 'explosion_detonation', family: 'explosion' });
          this.#subtitle(sim, `[Explosão ${bearingWord(rel)}]`, 'explosion');
          this.fireIndicators.push({ x: evt.center.x, z: evt.center.z, category: 'explosion_detonation', expiresAt: sim.clock + FIRE_INDICATOR_TTL_SEC });
          break;
        }
        case 'mg-burst':
        case 'actor-burst': {
          if (!evt.origin) break;
          const ally = evt.type === 'actor-burst' && evt.side === 'ally';
          const category = ally ? 'ally_fire' : 'enemy_fire';
          if (Math.hypot(evt.origin.x - sim.player.x, evt.origin.z - sim.player.z) > FIRE_AUDIBLE_MAX_M) break;
          if (this.#rateLimited(sim, `${category}:${evt.type === 'mg-burst' ? evt.sourceId : bearingWord(relativeBearingRad(sim.player, evt.origin.x, evt.origin.z))}`)) break;
          const { rel } = this.#spatialCue(sim, evt.origin, { cueId: ally ? 'sfx_ally_fire_placeholder' : 'sfx_enemy_fire_placeholder', category, family: 'weapon' });
          const what = evt.type === 'mg-burst' ? 'Rajada de MG34' : ally ? 'Tiros da secção polaca' : 'Fogo inimigo';
          this.#subtitle(sim, `[${what} ${bearingWord(rel)}]`, category);
          if (!ally) this.fireIndicators.push({ x: evt.origin.x, z: evt.origin.z, category: 'enemy_fire', expiresAt: sim.clock + FIRE_INDICATOR_TTL_SEC });
          break;
        }
        case 'shot-fired': {
          this.#audio({ cueId: OWN_SHOT_CUE.cueId, category: 'own_shot', family: OWN_SHOT_CUE.family, scale: 'close_mechanical', distanceM: 0, delaySec: 0, gain: 1, lowPassHz: 18000, pan: 0, critical: false, placeholder: true });
          break;
        }
        case 'grenade-thrown':
          this.#audio({ cueId: 'sfx_grenade_throw_placeholder', category: 'own_action', family: 'weapon', scale: 'close_mechanical', distanceM: 0, delaySec: 0, gain: 0.8, lowPassHz: 18000, pan: 0, critical: false, placeholder: true });
          break;
        case 'door-toggled': {
          const door = sim.world.doors?.find((d) => d.id === evt.doorId) ?? null;
          const src = door?.center ? { x: door.center.x, y: 1.1, z: door.center.z } : { x: sim.player.x, y: 1.1, z: sim.player.z };
          this.#spatialCue(sim, src, { cueId: evt.state === 'open' || evt.state === true ? 'sfx_door_open_placeholder' : 'sfx_door_close_placeholder', category: 'door', family: 'wood' });
          break;
        }
        case 'player-landing':
          this.#audio({ cueId: 'sfx_landing_placeholder', category: 'own_action', family: 'body', scale: 'close_mechanical', distanceM: 0, delaySec: 0, gain: 0.7, lowPassHz: 18000, pan: 0, critical: false, placeholder: true });
          break;
        case 'horizon-acoustic-boom': {
          const ev = sim.horizon?.hsA2.events.find((e) => e.id === evt.eventId);
          if (!ev) break;
          // O atraso d/343 já foi esperado pela simulação (o evento só nasce quando o som chega): sem atraso adicional aqui.
          const rel = relativeBearingRad(sim.player, ev.x, ev.z);
          this.#audio({
            cueId: 'sfx_distant_artillery_placeholder',
            category: 'distant_operation',
            family: 'explosion',
            scale: 'distant_operation',
            distanceM: Number(Math.hypot(ev.x - sim.player.x, ev.z - sim.player.z).toFixed(0)),
            delaySec: 0,
            gain: 0.55,
            lowPassHz: 900,
            pan: Number(panFromBearing(rel).toFixed(3)),
            critical: false,
            placeholder: true,
          });
          this.#subtitle(sim, `[Estrondo de artilharia distante ${bearingWord(rel)}]`, 'distant_operation');
          break;
        }
        case 'restored':
        case 'mission-restarted':
          // O relógio da simulação volta atrás: legendas, indicadores e cues pendentes pertencem à linha temporal anterior.
          this.subtitles.length = 0;
          this.fireIndicators.length = 0;
          this.audioQueue.length = 0;
          this.lastAudioRecord = null;
          this.logBaselinePending = true;
          break;
        default:
          break; // restantes tipos: ver EVENT_CONSUMERS (renderer, HUD por estado ou sem apresentação própria)
      }
    }
  }

  /**
   * Impactos balísticos do diretor (log do snapshot, só leitura): gera áudio com o material certo (metal não toca em terra). Os registos são identificados
   * por referência de objeto; depois de um restauro (log substituído) só entram os registos do instante atual.
   */
  ingestDirectorLog(sim) {
    const log = sim.audiovisual?.spatialAudioLog;
    if (!log) return;
    if (this.logBaselinePending) {
      this.logBaselinePending = false;
      this.lastAudioRecord = log.length ? log[log.length - 1] : null;
      this.lastAudioClock = this.lastAudioRecord ? this.lastAudioRecord.clock : -Infinity;
      return;
    }
    if (log.length === 0) return;
    let start = 0;
    const idx = this.lastAudioRecord ? log.lastIndexOf(this.lastAudioRecord) : -1;
    if (idx >= 0) start = idx + 1;
    else if (this.lastAudioRecord) start = log.findIndex((r) => r.clock >= sim.clock - 0.25 && r.clock > this.lastAudioClock - 1e-9);
    if (start < 0) start = log.length;
    for (let i = start; i < log.length; i++) {
      const r = log[i];
      if (r.category !== 'ballistic_impact') continue; // explosões têm o seu cue em ingest(); o resto não tem cue próprio
      this.#audio({
        cueId: r.cueId,
        category: r.category,
        family: r.surfaceFamily,
        scale: r.scale,
        distanceM: r.distanceM,
        delaySec: r.delaySec,
        gain: r.gainMultiplier,
        lowPassHz: r.lowPassHz,
        pan: Number(Math.max(-1, Math.min(1, Math.sin(r.azimuthRad - sim.player.angle))).toFixed(3)),
        critical: false,
        metallic: r.isMetallic,
        placeholder: true,
      });
    }
    this.lastAudioRecord = log[log.length - 1];
    this.lastAudioClock = this.lastAudioRecord.clock;
  }

  /** Move os pedidos de áudio pendentes para `out` (array do chamador, reutilizável) e limpa a fila. */
  drainAudio(out) {
    out.length = 0;
    for (const c of this.audioQueue) out.push(c);
    this.audioQueue.length = 0;
    return out;
  }

  /**
   * Modelo de vista do frame. `blastWarnings` vem do ESTADO (sim.hazardBlasts: sobrevive a restauros e checkpoints); `indicators` junta o fogo/explosões
   * recentes. O aviso crítico de explosão não depende das opções (só o indicador direcional depende de directionalIndicatorsEnabled).
   */
  view(sim) {
    const clock = sim.clock;
    this.subtitles = this.subtitles.filter((s) => clock < s.expiresAt && s.expiresAt - clock <= 60);
    this.fireIndicators = this.fireIndicators.filter((f) => clock < f.expiresAt && f.expiresAt - clock <= FIRE_INDICATOR_TTL_SEC + 1e-6);
    const acc = sim.audiovisual?.accessibility;
    const directional = acc?.directionalIndicatorsEnabled !== false;

    const blastWarnings = [];
    for (const blast of sim.hazardBlasts ?? []) {
      if (clock > blast.impactAt + BLAST_LINGER_SEC) continue;
      const distanceM = Math.hypot(blast.x - sim.player.x, blast.z - sim.player.z);
      const rel = relativeBearingRad(sim.player, blast.x, blast.z);
      blastWarnings.push({
        blastId: blast.id,
        remainingSec: Math.max(0, Number((blast.impactAt - clock).toFixed(2))),
        warningSec: blast.warningSec,
        distanceM: Number(distanceM.toFixed(1)),
        radiusM: blast.radius,
        relRad: rel,
        word: bearingWord(rel),
        directional,
      });
    }

    const indicators = [];
    if (directional) {
      for (const f of this.fireIndicators) {
        indicators.push({ category: f.category, relRad: relativeBearingRad(sim.player, f.x, f.z), remainingSec: Number((f.expiresAt - clock).toFixed(2)) });
      }
    }

    const wk = sim.audiovisual?.weaponKinematics;
    return {
      blastWarnings,
      indicators,
      subtitles: this.subtitles.map((s) => ({ text: s.text, category: s.category })),
      weapon: wk ? { state: wk.clearanceState, obstructionId: wk.obstructionId, lowerPitchRad: wk.lowerPitchRad, pullBackM: wk.pullBackM } : null,
      tinnitusLevel: sim.audiovisual?.cameraShake.tinnitusLevel ?? 0,
    };
  }
}

/**
 * Marcos L3 visíveis no centro da vista (±halfFovRad), para o rótulo «provisório» no HUD (ART-01: Tum só como volume de estudo rotulado).
 * `landmarks` = HORIZON_L3_LANDMARKS. Azimute desde o Norte (−Z), horário. Devolve rótulos; nunca decide visibilidade de jogo (só o que a câmara aponta).
 */
export function landmarksInView(player, landmarks, halfFovRad = (14 * Math.PI) / 180) {
  const out = [];
  for (const m of landmarks) {
    const az = (m.azimuthDeg * Math.PI) / 180;
    const dx = Math.sin(az);
    const dz = -Math.cos(az); // azimute 0 = norte = −Z
    const rel = relativeBearingRad({ x: 0, z: 0, angle: player.angle }, dx, dz);
    if (Math.abs(rel) <= halfFovRad) out.push({ id: m.id, label: m.label, relRad: rel, distanceM: m.distanceM, provisional: m.provisional });
  }
  return out;
}
