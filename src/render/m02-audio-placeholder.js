// M02 «Operação Bzura» — áudio PLACEHOLDER (secção L3 do PDF; auditoria L.md). Sintetizado com WebAudio (osciladores e ruído filtrado): NÃO é áudio final nem
// tem assets, autoria ou licença a verificar. Existe para que cada pedido de áudio da apresentação (m02-presentation.js) tenha um consumidor real: atraso pelo som,
// filtro de oclusão (lowPassHz), ganho e pan estéreo vêm dos parâmetros já calculados. Só apresentação: nunca lê nem escreve estado de simulação.
// O AudioContext só arranca depois de um gesto do utilizador (política dos navegadores); antes disso os pedidos ficam registados como «silenciosos».

const MASTER_GAIN = 0.16;
const MAX_LOG = 64;
const TINNITUS_HZ = 6200;
const TINNITUS_MAX_GAIN = 0.035;

/** Receita sintética (pura) de um cue: 'tone' (bipes) ou 'noise' (ruído filtrado com decaimento). */
export function placeholderRecipe(cueId, family) {
  if (cueId.includes('blast_warning')) return { kind: 'tone', freq: 880, pulses: 3, pulseSec: 0.11, gapSec: 0.07, gain: 0.9 };
  if (cueId.includes('distant_artillery')) return { kind: 'noise', centreHz: 140, durSec: 1.6, gain: 0.8, attackSec: 0.05 };
  if (cueId.includes('impact_earth') || family === 'explosion') return { kind: 'noise', centreHz: 220, durSec: 0.9, gain: 1.0, attackSec: 0.005 };
  if (cueId.includes('impact_metal') || family === 'metal') return { kind: 'noise', centreHz: 3200, durSec: 0.18, gain: 0.7, attackSec: 0.002 };
  if (family === 'weapon') return { kind: 'noise', centreHz: 1400, durSec: 0.22, gain: cueId.includes('enemy') ? 0.8 : 0.6, attackSec: 0.002 };
  if (family === 'wood' || cueId.includes('door')) return { kind: 'noise', centreHz: 420, durSec: 0.25, gain: 0.5, attackSec: 0.01 };
  return { kind: 'noise', centreHz: 700, durSec: 0.2, gain: 0.45, attackSec: 0.005 };
}

export class M02AudioPlaceholder {
  /** `globalObj` = window (injetável em testes). Sem AudioContext o objeto só regista os pedidos. */
  constructor(globalObj = globalThis) {
    this.global = globalObj;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.tinnitus = null;
    this.log = []; // últimos pedidos: { cueId, category, delaySec, gain, lowPassHz, pan, sounded }
    this.totals = { requested: 0, sounded: 0, silent: 0 };
  }

  get available() {
    return typeof this.global.AudioContext === 'function' || typeof this.global.webkitAudioContext === 'function';
  }

  /** Chamar a partir de um gesto do utilizador (tecla/clique). Cria o contexto uma vez e retoma-o se estiver suspenso. */
  resume() {
    if (!this.available) return false;
    if (!this.context) {
      const Ctx = this.global.AudioContext ?? this.global.webkitAudioContext;
      this.context = new Ctx();
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_GAIN;
      this.master.connect(this.context.destination);
      const len = Math.floor(this.context.sampleRate * 1.8);
      this.noiseBuffer = this.context.createBuffer(1, len, this.context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let seed = 0x9e3779b1; // ruído determinista (xorshift), sem Math.random
      for (let i = 0; i < len; i++) {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        data[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
      }
    }
    if (this.context.state === 'suspended') this.context.resume?.().catch?.(() => {});
    return this.context.state !== 'closed';
  }

  /** Reproduz (ou regista como silencioso) um pedido de áudio de M02PresentationFeed.drainAudio. */
  play(cue) {
    const sounded = Boolean(this.context && this.context.state === 'running');
    this.totals.requested++;
    if (sounded) this.totals.sounded++;
    else this.totals.silent++;
    this.log.push({ cueId: cue.cueId, category: cue.category, delaySec: cue.delaySec, gain: cue.gain, lowPassHz: cue.lowPassHz, pan: cue.pan, critical: cue.critical, sounded });
    if (this.log.length > MAX_LOG) this.log.shift();
    if (!sounded) return false;
    const ctx = this.context;
    const recipe = placeholderRecipe(cue.cueId, cue.family);
    const t0 = ctx.currentTime + Math.max(0, cue.delaySec);
    const out = ctx.createGain();
    out.gain.value = Math.max(0, Math.min(1, cue.gain)) * recipe.gain;
    let tail = out;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = cue.pan;
      out.connect(pan);
      tail = pan;
    }
    tail.connect(this.master);
    if (recipe.kind === 'tone') {
      for (let i = 0; i < recipe.pulses; i++) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        const start = t0 + i * (recipe.pulseSec + recipe.gapSec);
        osc.frequency.value = recipe.freq;
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(1, start + 0.008);
        env.gain.linearRampToValueAtTime(0, start + recipe.pulseSec);
        osc.connect(env);
        env.connect(out);
        osc.start(start);
        osc.stop(start + recipe.pulseSec + 0.02);
      }
    } else {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = recipe.centreHz;
      band.Q.value = 0.7;
      const occlusion = ctx.createBiquadFilter(); // oclusão por parede/porta (lowPassHz do cálculo espacial)
      occlusion.type = 'lowpass';
      occlusion.frequency.value = Math.max(200, cue.lowPassHz);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t0);
      env.gain.linearRampToValueAtTime(1, t0 + recipe.attackSec);
      env.gain.exponentialRampToValueAtTime(0.001, t0 + recipe.durSec);
      src.connect(band);
      band.connect(occlusion);
      occlusion.connect(env);
      env.connect(out);
      src.start(t0);
      src.stop(t0 + recipe.durSec + 0.05);
    }
    return true;
  }

  /** Zumbido (acessibilidade L3: intensidade ajustável 0..1): tom contínuo cujo ganho segue o nível calculado pela simulação. */
  setTinnitus(level) {
    if (!this.context || this.context.state !== 'running') return;
    if (!this.tinnitus) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.frequency.value = TINNITUS_HZ;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.tinnitus = { osc, gain };
    }
    this.tinnitus.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * TINNITUS_MAX_GAIN, this.context.currentTime, 0.08);
  }

  summary() {
    return { available: this.available, state: this.context?.state ?? 'none', ...this.totals, last: this.log.slice(-8) };
  }
}
