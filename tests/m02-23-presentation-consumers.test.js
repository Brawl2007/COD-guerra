import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { BLAST_WARNING_SEC } from '../src/game/m02-combat-ai.js';
import { computeSpatialAudioParams } from '../src/game/m02-audiovisual-director.js';
import { HORIZON_L3_LANDMARKS } from '../src/world/m02-horizon-system.js';
import { eyePosition } from '../src/world/spatial.js';
import {
  BLAST_LINGER_SEC,
  EVENT_CONSUMERS,
  FIRE_INDICATOR_TTL_SEC,
  M02PresentationFeed,
  bearingWord,
  landmarksInView,
  panFromBearing,
  relativeBearingRad,
} from '../src/render/m02-presentation.js';
import { M02AudioPlaceholder, placeholderRecipe } from '../src/render/m02-audio-placeholder.js';

// Secção L (PDF pp. 41-43; auditoria L.md): cada evento da simulação tem consumidor real (renderer, HUD ou apresentação) ou razão documentada.
// `blast-warning` (aviso 5-8 s) gera indicador direcional, legenda e áudio crítico. Teste de estado/derivação, não playtest nem prova auditiva.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 19390909;
const DEG = Math.PI / 180;

function freshSim() {
  const sim = new M02BenchSimulation(SEED);
  sim.drainEvents();
  return sim;
}

/** Coloca o jogador a olhar numa direção e agenda uma explosão a `distM` à frente rodada `offsetRad` (positivo = à direita). */
function warnAt(sim, offsetRad, distM = 14, opts = {}) {
  const a = sim.player.angle + offsetRad;
  return sim.scheduleBlastWarning({ source: 'scripted_artillery', x: sim.player.x + Math.cos(a) * distM, z: sim.player.z + Math.sin(a) * distM, ...opts });
}

test('bearing: 0 = em frente, positivo à direita, ±π atrás; palavras PT-PT por setor de 45°', () => {
  const p = { x: 0, z: 0, angle: 0.7 };
  const ahead = relativeBearingRad(p, Math.cos(0.7) * 10, Math.sin(0.7) * 10);
  const right = relativeBearingRad(p, Math.cos(0.7 + Math.PI / 2) * 10, Math.sin(0.7 + Math.PI / 2) * 10);
  const left = relativeBearingRad(p, Math.cos(0.7 - Math.PI / 2) * 10, Math.sin(0.7 - Math.PI / 2) * 10);
  const behind = relativeBearingRad(p, Math.cos(0.7 + Math.PI) * 10, Math.sin(0.7 + Math.PI) * 10);
  assert.ok(Math.abs(ahead) < 1e-9);
  assert.ok(Math.abs(right - Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(left + Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(Math.abs(behind) - Math.PI) < 1e-9);
  assert.equal(bearingWord(ahead), 'à frente');
  assert.equal(bearingWord(right), 'à direita');
  assert.equal(bearingWord(left), 'à esquerda');
  assert.equal(bearingWord(behind), 'atrás');
  assert.equal(bearingWord(45 * DEG), 'à frente, à direita');
  assert.equal(bearingWord(-135 * DEG), 'atrás, à esquerda');
  // No ecrã: "direita" tem de coincidir com a câmara (rotation.y = −angle − π/2, x_ecrã cresce com sin(rel)).
  assert.ok(panFromBearing(right) > 0.99 && panFromBearing(left) < -0.99 && Math.abs(panFromBearing(ahead)) < 1e-9 && Math.abs(panFromBearing(behind)) < 1e-9);
});

test('todos os eventos emitidos pela simulação e pelo horizonte têm consumidor ou razão em EVENT_CONSUMERS (e a tabela não tem entradas órfãs)', () => {
  const files = ['src/game/m02-01-simulation.js', 'src/world/m02-horizon-system.js', 'src/game/m02-acts-director.js', 'src/game/m02-combat-ai.js']
    .map((f) => readFileSync(join(ROOT, f), 'utf8'));
  for (const f of readdirSync(join(ROOT, 'src/game'))) {
    if (/^m02-.*\.js$/.test(f) && !['m02-01-simulation.js', 'm02-acts-director.js', 'm02-combat-ai.js'].includes(f)) files.push(readFileSync(join(ROOT, 'src/game', f), 'utf8'));
  }
  const emitted = new Set();
  const re = /(?:events\.push\(\s*\{|const evt = \{|\bevt = \{|blastRecord = \{|events\.push\(\s*\{\s*\.\.\.[a-zA-Z]+,)\s*type:\s*'([a-z0-9-]+)'/g;
  for (const src of files) for (const m of src.matchAll(re)) emitted.add(m[1]);
  assert.ok(emitted.size >= 20, `esperava-se muitos tipos de evento, encontrei ${emitted.size}`);
  for (const type of ['blast-warning', 'shot-fired', 'grenade-exploded', 'horizon-acoustic-boom', 'door-toggled']) assert.ok(emitted.has(type), `${type} não encontrado no código: regex desatualizada`);
  const missing = [...emitted].filter((t) => !EVENT_CONSUMERS[t]);
  assert.deepEqual(missing, [], `eventos sem consumidor documentado: ${missing.join(', ')}`);
  const orphan = Object.keys(EVENT_CONSUMERS).filter((t) => !emitted.has(t));
  assert.deepEqual(orphan, [], `entradas sem evento no código: ${orphan.join(', ')}`);
  for (const [type, c] of Object.entries(EVENT_CONSUMERS)) {
    assert.match(c.consumer, /^(renderer|presentation|hud|state-only)(\+(renderer|presentation|hud))?$/, type);
    assert.ok(c.note.length > 10, `${type}: razão/nota obrigatória`);
  }
  assert.match(EVENT_CONSUMERS['blast-warning'].consumer, /presentation/);
});

test('blast-warning: indicador direcional, contagem 5-8 s, legenda PT e áudio crítico sem atraso', () => {
  const sim = freshSim();
  const feed = new M02PresentationFeed();
  feed.ingestDirectorLog(sim);
  const rec = warnAt(sim, Math.PI / 2, 14, { radius: 6.5, warningSec: 6.5 });
  const events = sim.drainEvents();
  assert.equal(events.filter((e) => e.type === 'blast-warning').length, 1);
  feed.ingest(sim, events);

  const view = feed.view(sim);
  assert.equal(view.blastWarnings.length, 1);
  const w = view.blastWarnings[0];
  assert.equal(w.blastId, rec.id);
  assert.ok(Math.abs(w.relRad - Math.PI / 2) < 0.01, `à direita: ${w.relRad}`);
  assert.equal(w.word, 'à direita');
  assert.ok(Math.abs(w.distanceM - 14) < 0.1);
  assert.equal(w.radiusM, 6.5);
  assert.ok(w.remainingSec >= BLAST_WARNING_SEC.min && w.remainingSec <= BLAST_WARNING_SEC.max, `${w.remainingSec} s`);
  assert.equal(w.directional, true);

  assert.equal(view.subtitles.length, 1);
  assert.match(view.subtitles[0].text, /^\[Aviso: explosão iminente à direita, a 14 m, daqui a 7 s\]$/);

  const audio = feed.drainAudio([]);
  assert.equal(audio.length, 1);
  assert.equal(audio[0].cueId, 'sfx_blast_warning_placeholder');
  assert.equal(audio[0].critical, true);
  assert.equal(audio[0].delaySec, 0, 'aviso crítico nunca é atrasado pela velocidade do som');
  assert.ok(audio[0].pan > 0.99, 'pan à direita');
  assert.equal(audio[0].placeholder, true);
  assert.equal(feed.drainAudio([]).length, 0, 'fila esvaziada');
});

test('blast-warning: esquerda e atrás; o aviso crítico não depende das opções (só o indicador e a legenda)', () => {
  const sim = freshSim();
  const feed = new M02PresentationFeed();
  warnAt(sim, -Math.PI / 2, 20);
  warnAt(sim, Math.PI, 30);
  sim.setAccessibilityOptions({ subtitlesEnabled: false, directionalIndicatorsEnabled: false });
  feed.ingest(sim, sim.drainEvents());
  const view = feed.view(sim);
  assert.equal(view.blastWarnings.length, 2, 'o aviso de explosão continua a aparecer com as opções desligadas');
  assert.deepEqual(view.blastWarnings.map((b) => b.word), ['à esquerda', 'atrás']);
  assert.ok(view.blastWarnings.every((b) => b.directional === false), 'sem seta direcional, mas com contagem e distância');
  assert.equal(view.subtitles.length, 0, 'legendas desligadas');
  const audio = feed.drainAudio([]);
  assert.equal(audio.length, 2, 'o áudio crítico mantém-se');
  assert.ok(audio.every((c) => c.critical && c.delaySec === 0));
});

test('blast-warning: o aviso vem do estado (hazardBlasts) e desaparece depois do impacto; reinício/restauro descarta legendas', () => {
  const sim = freshSim();
  const feed = new M02PresentationFeed();
  warnAt(sim, 0, 18, { warningSec: 5 });
  feed.ingest(sim, sim.drainEvents());
  assert.equal(feed.view(sim).blastWarnings.length, 1);
  // O aviso não depende do evento: um segundo feed (p. ex. depois de recarregar a página com o estado restaurado) também o mostra.
  assert.equal(new M02PresentationFeed().view(sim).blastWarnings.length, 1);
  sim.clock += 5 + BLAST_LINGER_SEC + 0.05; // salta o relógio para depois do impacto agendado
  assert.equal(feed.view(sim).blastWarnings.length, 0);
  assert.ok(feed.view(sim).subtitles.length === 0 || feed.view(sim).subtitles.every((s) => s.category !== 'explosion'), 'legenda de aviso expirou com o relógio');
  feed.ingest(sim, [{ type: 'restored', clock: 0, checkpointId: 'x' }]);
  assert.equal(feed.view(sim).subtitles.length, 0);
  assert.equal(feed.drainAudio([]).length, 0);
});

test('a apresentação só lê: ingerir, ver e drenar não altera o snapshot da simulação', () => {
  const sim = freshSim();
  const feed = new M02PresentationFeed();
  warnAt(sim, 0.3, 16);
  const events = sim.drainEvents();
  const before = JSON.stringify(sim.snapshot());
  feed.ingest(sim, events);
  feed.ingestDirectorLog(sim);
  feed.view(sim);
  feed.drainAudio([]);
  assert.equal(JSON.stringify(sim.snapshot()), before);
  assert.deepEqual(sim.audiovisual.spatialAudioLog, [], 'a apresentação não escreve no log do diretor');
});

test('fogo inimigo: rajada de MG34 e actor-burst inimigo geram indicador, legenda e áudio; fogo da secção só áudio/legenda; rate limit por fonte', () => {
  const sim = freshSim();
  const feed = new M02PresentationFeed();
  const p = sim.player;
  const origin = { x: p.x + Math.cos(p.angle - Math.PI / 2) * 25, y: 1.4, z: p.z + Math.sin(p.angle - Math.PI / 2) * 25 }; // à esquerda
  feed.ingest(sim, [{ type: 'mg-burst', sourceId: 'de_b02_mg34', origin, target: { x: p.x, y: p.y + 1.2, z: p.z }, rounds: 5, clock: sim.clock }]);
  feed.ingest(sim, [{ type: 'mg-burst', sourceId: 'de_b02_mg34', origin, target: { x: p.x, y: p.y + 1.2, z: p.z }, rounds: 5, clock: sim.clock }]);
  feed.ingest(sim, [{ type: 'actor-burst', side: 'ally', shooterId: 'a1', origin: { x: p.x + 10, y: 1.4, z: p.z }, target: { x: p.x + 40, y: 1, z: p.z }, hitAny: false }]);
  const view = feed.view(sim);
  assert.equal(view.indicators.length, 1, 'só o fogo inimigo gera seta; a segunda rajada da mesma fonte foi limitada');
  assert.equal(view.indicators[0].category, 'enemy_fire');
  assert.ok(Math.abs(view.indicators[0].relRad + Math.PI / 2) < 0.01, 'à esquerda');
  assert.ok(view.indicators[0].remainingSec <= FIRE_INDICATOR_TTL_SEC);
  assert.equal(view.subtitles.length, 2);
  assert.equal(view.subtitles[0].text, '[Rajada de MG34 à esquerda]');
  assert.match(view.subtitles[1].text, /^\[Tiros da secção polaca /);
  const audio = feed.drainAudio([]);
  assert.equal(audio.length, 2);
  assert.equal(audio[0].cueId, 'sfx_enemy_fire_placeholder');
  assert.equal(audio[0].scale, 'tactical_encounter');
  assert.ok(audio[0].delaySec > 0 && Math.abs(audio[0].delaySec - 25 / 343) < 0.01, 'atraso pelo som a 343 m/s');
  sim.setAccessibilityOptions({ directionalIndicatorsEnabled: false });
  assert.equal(feed.view(sim).indicators.length, 0, 'indicadores direcionais desligados');
  // fogo muito distante não gera nada
  const far = new M02PresentationFeed();
  far.ingest(sim, [{ type: 'actor-burst', side: 'enemy', shooterId: 'e9', origin: { x: p.x + 2000, y: 1.4, z: p.z }, target: { x: p.x, y: 1, z: p.z }, hitAny: false }]);
  assert.equal(far.drainAudio([]).length, 0);
});

test('explosão: legenda, seta e áudio de terra; estrondo distante do horizonte com atraso já cumprido pela simulação', () => {
  const sim = freshSim();
  const feed = new M02PresentationFeed();
  const p = sim.player;
  const center = { x: p.x + Math.cos(p.angle) * 12, y: 0.4, z: p.z + Math.sin(p.angle) * 12 };
  feed.ingest(sim, [{ type: 'grenade-exploded', center, radius: 6.5, clock: sim.clock }]);
  const v1 = feed.view(sim);
  assert.deepEqual(v1.subtitles.map((s) => s.text), ['[Explosão à frente]']);
  assert.equal(v1.indicators[0].category, 'explosion_detonation');
  const ev = sim.horizon.hsA2.events[1];
  feed.ingest(sim, [{ type: 'horizon-acoustic-boom', eventId: ev.id, flashAt: ev.flashAt, soundArrivalAt: 12, measuredDelaySec: 3, clock: 12 }]);
  const audio = feed.drainAudio([]);
  assert.equal(audio.at(-1).cueId, 'sfx_distant_artillery_placeholder');
  assert.equal(audio.at(-1).scale, 'distant_operation');
  assert.equal(audio.at(-1).delaySec, 0, 'a simulação já esperou d/343 s antes de emitir o evento');
  assert.ok(audio.at(-1).distanceM >= 1500, 'HS-A2 está em L3 (≥ 1,5 km)');
  assert.match(feed.view(sim).subtitles.at(-1).text, /^\[Estrondo de artilharia distante /);
});

test('impactos balísticos: o log do diretor gera áudio com o material certo; o metal não toca em terra; um restauro não reproduz o passado', () => {
  const sim = freshSim();
  const feed = new M02PresentationFeed();
  feed.ingestDirectorLog(sim); // linha de base
  const p = sim.player;
  sim.audiovisual.onPlayerShotFired(sim, { point: { x: p.x + 8, y: 1, z: p.z }, material: 'metal', hitTarget: false });
  sim.audiovisual.onPlayerShotFired(sim, { point: { x: p.x + 9, y: 0, z: p.z }, material: 'earth', hitTarget: false });
  feed.ingestDirectorLog(sim);
  const audio = feed.drainAudio([]);
  assert.equal(audio.length, 2);
  assert.equal(audio[0].cueId, 'sfx_impact_metal_ping');
  assert.equal(audio[0].metallic, true);
  assert.equal(audio[1].cueId, 'sfx_impact_earth_wet_thud');
  assert.notEqual(audio[1].metallic, true, 'terra nunca soa a metal');
  feed.ingestDirectorLog(sim);
  assert.equal(feed.drainAudio([]).length, 0, 'sem duplicados no frame seguinte');
  // restauro: o log é substituído; a linha de base repõe-se e não há reprodução do passado
  feed.ingest(sim, [{ type: 'restored', clock: sim.clock, checkpointId: 'cp' }]);
  sim.audiovisual.restore(structuredClone(sim.audiovisual.snapshot()));
  feed.ingestDirectorLog(sim);
  assert.equal(feed.drainAudio([]).length, 0);
  // a apresentação consome parâmetros iguais aos do diretor (função pura partilhada)
  const eye = eyePosition(sim.player);
  const direct = computeSpatialAudioParams(sim.world, eye, { x: p.x + 8, y: 1, z: p.z }, {});
  const rec = sim.audiovisual.spatialAudioLog[0];
  assert.equal(Number(direct.dist.toFixed(2)), rec.distanceM);
  assert.equal(direct.delaySec, rec.delaySec);
  assert.equal(direct.azimuthRad, rec.azimuthRad);
  assert.equal(direct.scale, rec.scale);
  assert.equal(direct.occlusionState, rec.occlusionState);
});

test('marcos L3 provisórios aparecem rotulados quando a câmara aponta para eles', () => {
  const tum = HORIZON_L3_LANDMARKS.find((m) => m.id === 'L3_TUM_VOLUME_ESTUDO');
  // Azimute 225° (SW): norte = −Z, sentido horário -> direção (sin 225°, −cos 225°) = (−0,707; +0,707) em (x, z) -> ângulo de jogo atan2(z, x) = 135°.
  const facingTum = { angle: Math.atan2(-Math.cos((tum.azimuthDeg * Math.PI) / 180), Math.sin((tum.azimuthDeg * Math.PI) / 180)) };
  const seen = landmarksInView(facingTum, HORIZON_L3_LANDMARKS);
  assert.deepEqual(seen.map((m) => m.id), ['L3_TUM_VOLUME_ESTUDO']);
  assert.match(seen[0].label, /Volume de estudo de Tum \(provisório\)/);
  assert.equal(seen[0].provisional, true);
  const facingNorth = { angle: -Math.PI / 2 }; // (cos, sin) = (0, −1) = −Z = norte
  assert.deepEqual(landmarksInView(facingNorth, HORIZON_L3_LANDMARKS), []);
  const facingEast = { angle: 0 };
  assert.deepEqual(landmarksInView(facingEast, HORIZON_L3_LANDMARKS).map((m) => m.id), ['L3_LECZYCA_MASSA_URBANA']);
});

test('áudio placeholder: receitas determinadas, pedidos registados e atraso/oclusão/pan aplicados quando há contexto', () => {
  assert.equal(placeholderRecipe('sfx_blast_warning_placeholder', 'warning').kind, 'tone');
  assert.equal(placeholderRecipe('sfx_impact_metal_ping', 'metal').kind, 'noise');
  assert.ok(placeholderRecipe('sfx_impact_metal_ping', 'metal').centreHz > placeholderRecipe('sfx_impact_earth_wet_thud', 'earth').centreHz);
  assert.ok(placeholderRecipe('sfx_distant_artillery_placeholder', 'explosion').durSec > 1);

  // Sem AudioContext: só regista (silencioso)
  const mute = new M02AudioPlaceholder({});
  assert.equal(mute.available, false);
  assert.equal(mute.resume(), false);
  assert.equal(mute.play({ cueId: 'x', category: 'c', delaySec: 0, gain: 1, lowPassHz: 1000, pan: 0, family: 'weapon' }), false);
  assert.equal(mute.summary().silent, 1);

  // Com um AudioContext simulado
  const calls = [];
  const node = () => ({ connect: () => {}, gain: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} }, frequency: { value: 0 }, Q: { value: 0 }, pan: { value: 0 }, start: (t) => calls.push(['start', t]), stop: () => {} });
  class FakeCtx {
    constructor() { this.currentTime = 10; this.sampleRate = 8000; this.state = 'running'; this.destination = {}; }
    createGain() { return node(); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    createStereoPanner() { const n = node(); calls.push(['pan', n]); return n; }
    createOscillator() { return node(); }
    createBufferSource() { return node(); }
    createBiquadFilter() { const n = node(); calls.push(['filter', n]); return n; }
    resume() { return Promise.resolve(); }
  }
  const eng = new M02AudioPlaceholder({ AudioContext: FakeCtx });
  assert.equal(eng.resume(), true);
  const ok = eng.play({ cueId: 'sfx_enemy_fire_placeholder', category: 'enemy_fire', family: 'weapon', delaySec: 0.5, gain: 0.8, lowPassHz: 680, pan: -0.9 });
  assert.equal(ok, true);
  assert.deepEqual(calls.find((c) => c[0] === 'start'), ['start', 10.5], 'atraso aplicado ao instante de início');
  const filters = calls.filter((c) => c[0] === 'filter').map((c) => c[1]);
  assert.ok(filters.some((f) => f.frequency.value === 680), 'filtro de oclusão a 680 Hz (parede sólida)');
  assert.equal(calls.find((c) => c[0] === 'pan')[1].pan.value, -0.9);
  assert.equal(eng.summary().sounded, 1);
});
