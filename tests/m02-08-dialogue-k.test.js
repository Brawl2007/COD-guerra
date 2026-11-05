import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  M02_DIALOGUE_CATALOG,
  M02DialogueDirector,
  playerHasFreeLook,
  combatIsActive,
} from '../src/game/m02-combat-ai.js';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';

// Secção K do pacote (docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf, pp. 38-40) e auditoria K.md.
// Textos conferidos no PDF a 2026-11-04: K2 p. 38 (dlg_m02_001..003) e K3 p. 39-40 (bz39_*).
// Nota: K.md indicava «Depois da quinta» e «Baixa»; o PDF diz «Depois a quinta» e «Baixe» (os dados já estavam certos).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

const PDF_LINES = {
  dlg_m02_001: ['pl_lis', 'Era a estrada de casa. Agora procuro onde esconder a cabeça.'],
  dlg_m02_002: ['pl_gruca', 'O grupo da direita recuou. Nossa ordem mudou.'],
  dlg_m02_003: ['piotr_sokol', 'Você vem conosco. A arma eu levo.'],
  bz39_c01_01: ['pl_gruca', 'Ao próximo talude. Depois a quinta.'],
  bz39_c01_02: ['pl_malek', 'Levo estas também?'],
  bz39_c01_03: ['pl_lis', 'Deixa espaço para a água.'],
  bz39_c04_05: ['pl_gruca', 'Baixe a arma. Ele já não combate.'],
};

function fakeSim(overrides = {}) {
  return {
    clock: 0,
    player: { health: 100 },
    activeCartela: 'cartela T0 (texto)',
    enemies: [],
    events: [],
    flags: {},
    allies: [
      { id: 'pl_lis', alive: true, state: 'ACTIVE' },
      { id: 'pl_malek', alive: true, state: 'ACTIVE' },
      { id: 'pl_gruca', alive: true, state: 'ACTIVE' },
    ],
    ...overrides,
  };
}

test('K3: the PDF literal lines are in the catalogue with the right speaker (c01_01, c01_02, c01_03, c04_05, dlg 001-003)', () => {
  for (const [id, [speaker, text]] of Object.entries(PDF_LINES)) {
    const line = M02_DIALOGUE_CATALOG[id];
    assert.ok(line, `${id} em falta`);
    assert.equal(line.text, text, `${id} deve ser literal do PDF`);
    if (id !== 'dlg_m02_003') assert.equal(line.speakerId, speaker, id);
  }
  assert.equal(M02_DIALOGUE_CATALOG.bz39_c01_02.priority, 2, 'K3: prioridade 2 (entrega de munição)');
  assert.equal(M02_DIALOGUE_CATALOG.bz39_c01_03.priority, 2, 'K3: prioridade 2 (resposta)');
  assert.equal(M02_DIALOGUE_CATALOG.bz39_c01_01.priority, 1, 'K3: prioridade 1 (ordem inicial)');
  assert.equal(M02_DIALOGUE_CATALOG.bz39_c04_05.priority, 0, 'K3: prioridade 0 (agressão ao rendido/ferido)');
});

test('K3: bz39_c01_02 and bz39_c01_03 are queued at C01 start and spoken in order (Malek asks, Lis answers) while calm', () => {
  const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
  assert.deepEqual(
    [sim.dialogue.activeLine?.id, ...sim.dialogue.queue.map((q) => q.id)],
    ['bz39_c01_01', 'dlg_m02_001', 'bz39_c01_02', 'bz39_c01_03'],
    'C01: ordem inicial, fala 001, entrega de munição e resposta',
  );
  sim.enemies = []; // preparação calma: sem hostis que vejam o jogador
  for (let i = 0; i < 300; i += 1) sim.tick(0.1, {});
  const ids = sim.dialogue.history.map((h) => h.id);
  const c01Ids = ['bz39_c01_01', 'dlg_m02_001', 'bz39_c01_02', 'bz39_c01_03'];
  assert.deepEqual(ids.filter((id) => c01Ids.includes(id)), c01Ids, 'ordem relativa: ordem, 001, pergunta, resposta');
});

test('K3/K4: the EA0 post no longer sees Piotr at tick 0 (C02: first shot 30-60 s after the advance), so the C01 answer is spoken before contact', () => {
  const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
  for (let i = 0; i < 300; i += 1) sim.tick(0.1, {});
  const ids = sim.dialogue.history.map((h) => h.id);
  assert.ok(ids.includes('bz39_c01_02'), 'a entrega de munição é dita');
  assert.ok(ids.includes('bz39_c01_03'), 'sem combate (posto sem alerta) a resposta de Lis toca antes do contacto');
  assert.ok(!sim.events.some((e) => e.type === 'dialogue-line-dropped' && e.id === 'bz39_c01_03'));
});

test('K3: once the contact is open (player shot at the post) the C01 answer that has not played yet is dropped, the question is kept', () => {
  const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
  sim.tick(0.1, {}); // bz39_c01_01 a falar; 001/02/03 na fila (o olhar livre só vem com a cartela cumprida)
  sim.firePlayerWeapon(true, true); // o jogador abre o contacto: o posto passa a combater
  for (let i = 0; i < 300; i += 1) sim.tick(0.1, {});
  const ids = sim.dialogue.history.map((h) => h.id);
  assert.ok(ids.includes('bz39_c01_02'), 'a entrega de munição é dita');
  assert.ok(!ids.includes('bz39_c01_03'), 'resposta descartada em combate (K3)');
  assert.ok(sim.events.some((e) => e.type === 'dialogue-line-dropped' && e.id === 'bz39_c01_03'));
});

test('K3: bz39_c01_03 needs bz39_c01_02 first and is never added or kept while combat is active', () => {
  const sim = fakeSim();
  const d = new M02DialogueDirector();
  assert.equal(d.trigger('bz39_c01_03', sim), false, 'sem a pergunta de Małek não há resposta');
  assert.equal(d.hasTriggered('bz39_c01_03'), false);

  // combate já ativo: a resposta não entra («não repetir em combate»)
  const hostile = { alive: true, nonCombatant: false, seeingTargetId: 'player', memory: null };
  const inCombat = fakeSim({ enemies: [hostile] });
  const d2 = new M02DialogueDirector();
  assert.equal(d2.trigger('bz39_c01_02', inCombat), true);
  assert.equal(d2.trigger('bz39_c01_03', inCombat), false);

  // combate começa com a resposta na fila: é descartada, não reproduzida depois (K4)
  const calm = fakeSim();
  const d3 = new M02DialogueDirector();
  d3.trigger('bz39_c01_02', calm);
  d3.update(calm); // Małek fala
  assert.equal(d3.trigger('bz39_c01_03', calm), true);
  calm.enemies.push(hostile);
  calm.clock = 10;
  d3.update(calm);
  assert.ok(!d3.queue.some((q) => q.id === 'bz39_c01_03'));
  assert.ok(!d3.history.some((h) => h.id === 'bz39_c01_03'));
  assert.ok(calm.events.some((e) => e.type === 'dialogue-line-dropped' && e.id === 'bz39_c01_03'));
});

test('K2 olhar livre: dlg_m02_001 waits while the camera is taken by a timed cartela and plays when the player looks freely', () => {
  const sim = fakeSim({ activeCartela: { text: 'elipse', expiresAt: 8.0 } });
  assert.equal(playerHasFreeLook(sim), false);
  const d = new M02DialogueDirector();
  assert.equal(d.trigger('dlg_m02_001', sim), true);
  d.update(sim);
  assert.equal(d.activeLine, null, 'sem olhar livre a fala não toca');
  assert.deepEqual(d.queue.map((q) => q.id), ['dlg_m02_001'], 'fica à espera (e não é perdida)');

  sim.clock = 8.5;
  assert.equal(playerHasFreeLook(sim), true);
  d.update(sim);
  assert.equal(d.activeLine?.id, 'dlg_m02_001');
});

test('K2 olhar livre: the initial T0 cartela string and a living player count as free look; a dead player does not', () => {
  assert.equal(playerHasFreeLook(fakeSim()), true);
  assert.equal(playerHasFreeLook(fakeSim({ player: { health: 0 } })), false);
});

test('K2 sem sobreposição de ordem crítica: dlg_m02_001 never starts over a priority-0 line, even when queued first', () => {
  const sim = fakeSim();
  const d = new M02DialogueDirector();
  d.trigger('dlg_m02_001', sim);
  d.trigger('bz39_c10_02', sim); // prioridade 0, aviso de impacto
  d.update(sim);
  assert.equal(d.activeLine?.id, 'bz39_c10_02', 'a ordem crítica passa à frente');
  assert.ok(d.queue.some((q) => q.id === 'dlg_m02_001'));

  // enquanto uma ordem crítica estiver a falar ou na fila, a fala 001 não arranca
  sim.clock = M02_DIALOGUE_CATALOG.bz39_c10_02.durationSec - 0.1;
  d.trigger('bz39_c10_01', sim); // outra crítica à espera
  d.update(sim);
  assert.equal(d.activeLine?.id, 'bz39_c10_02');
  sim.clock += 0.2;
  d.update(sim);
  assert.equal(d.activeLine?.id, 'bz39_c10_01', 'segunda crítica antes da fala 001');
  sim.clock += M02_DIALOGUE_CATALOG.bz39_c10_01.durationSec + 0.1;
  d.update(sim);
  assert.equal(d.activeLine?.id, 'dlg_m02_001', 'só depois das críticas');
});

test('K2: the wait-for-free-look condition survives snapshot/restore of the dialogue director', () => {
  const sim = fakeSim({ activeCartela: { text: 'elipse', expiresAt: 8.0 } });
  const d = new M02DialogueDirector();
  d.trigger('dlg_m02_001', sim);
  d.update(sim);
  const snap = JSON.parse(JSON.stringify(d.snapshot()));
  const d2 = new M02DialogueDirector();
  d2.restore(snap);
  d2.update(sim);
  assert.equal(d2.activeLine, null, 'continua sem olhar livre depois do restauro');
  sim.clock = 9;
  d2.update(sim);
  assert.equal(d2.activeLine?.id, 'dlg_m02_001');
});

test('K1/K3: Nowak, Kowalski and LG01-LG12 are marked fora_do_pdf in the data and PDF characters are not', () => {
  const quinta = load('missions/m02-bzura/m02-01-quinta-layout.json');
  const cells = load('missions/m02-bzura/m02-cells-bc-layout.json').cells;
  const byId = Object.fromEntries(quinta.polishSquad.map((a) => [a.id, a]));
  assert.match(byId.pl_aux_01.name, /Nowak/);
  assert.match(byId.pl_aux_02.name, /Kowalski/);
  assert.equal(byId.pl_aux_01.sourceStatus, 'fora_do_pdf');
  assert.equal(byId.pl_aux_02.sourceStatus, 'fora_do_pdf');
  for (const id of ['pl_gruca', 'pl_lis', 'pl_wierzba', 'pl_malek', 'pl_szymczak']) {
    assert.equal(byId[id].sourceStatus, undefined, `${id} consta do PDF (K1)`);
  }
  const lg = cells.C.lastGroupRoster;
  assert.equal(lg.length, 12);
  lg.forEach((m, i) => {
    assert.equal(m.id, `LG${String(i + 1).padStart(2, '0')}`);
    assert.equal(m.sourceStatus, 'fora_do_pdf', m.id);
  });
});

test('K1/K3: the out-of-PDF marking reaches the running simulation actors without being deleted', () => {
  const sim = new M02BenchSimulation(19390909);
  const nowak = sim.allies.find((a) => a.id === 'pl_aux_01');
  const kowalski = sim.allies.find((a) => a.id === 'pl_aux_02');
  assert.equal(nowak.sourceStatus, 'fora_do_pdf');
  assert.equal(kowalski.sourceStatus, 'fora_do_pdf');
  assert.equal(sim.allies.find((a) => a.id === 'pl_gruca').sourceStatus, undefined);
});
