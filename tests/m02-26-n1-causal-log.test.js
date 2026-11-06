// N1 (PDF O2, AI-01): valida o gerador do registo causal (tools/m02/n1-causal-log.mjs) e o seu determinismo.
// Teste de estado sobre a simulação Node: não é playtest nem aceitação de N1.
import test from 'node:test';
import assert from 'node:assert/strict';

import { LINK_RULES, LINK_TYPES, MODES, buildCausalLog, renderSummaryMarkdown, runCausalScenario } from '../tools/m02/n1-causal-log.mjs';

const SEED = 19390909;

function assertRunIsWellFormed(run) {
  const ids = run.nodes.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'ids de nós únicos');
  assert.deepEqual(ids, ids.map((_, i) => `n${String(i + 1).padStart(5, '0')}`), 'ids sequenciais pela ordem de ocorrência');
  for (let i = 1; i < run.nodes.length; i++) {
    assert.ok(run.nodes[i].t >= run.nodes[i - 1].t - 0.51, `tempo quase monótono (n${i}: ${run.nodes[i - 1].t} -> ${run.nodes[i].t})`);
  }
  const byId = new Map(run.nodes.map((n) => [n.id, n]));
  for (const e of run.edges) {
    assert.ok(LINK_TYPES.includes(e.type), `tipo de ligação conhecido: ${e.type}`);
    const cause = byId.get(e.cause);
    const effect = byId.get(e.effect);
    assert.ok(cause && effect, `aresta com nós existentes: ${e.cause} -> ${e.effect}`);
    assert.ok(['direct', 'confounded', 'temporal', 'measured'].includes(e.strength));
    const window = LINK_RULES[e.type].windowSec;
    // a causa nunca vem depois do efeito (a janela de socorro abre antes da baixa no mesmo tick: lag 0)
    assert.ok(effect.t - cause.t >= -1e-9 && effect.t - cause.t <= window + 1e-9, `${e.type}: lag ${effect.t - cause.t} fora de [0, ${window}]`);
    assert.equal(e.lagSec, Number((effect.t - cause.t).toFixed(2)));
  }
  // contagens por tipo coerentes com as arestas
  for (const t of LINK_TYPES) {
    const mine = run.edges.filter((e) => e.type === t);
    assert.equal(run.linkCounts[t].total, mine.length);
    for (const k of ['direct', 'confounded', 'temporal', 'measured']) assert.equal(run.linkCounts[t][k], mine.filter((e) => e.strength === k).length);
  }
  const kinds = {};
  for (const n of run.nodes) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1;
  assert.deepEqual(run.nodeCounts, kinds);
}

test('N1 causal log: Piotr sheltered (60 s) links suppression -> hit -> down and enemy fire -> ally casualties, with no player shot', () => {
  const run = runCausalScenario({ seed: SEED, mode: 'sheltered' });
  assertRunIsWellFormed(run);
  assert.equal(run.meta.mode, 'sheltered');
  assert.ok(run.meta.simulatedSec >= 59.9 && run.meta.simulatedSec <= 60.1, `60 s simulados, obtido ${run.meta.simulatedSec}`);
  assert.equal(run.nodeCounts['ev:player_shot'] ?? 0, 0, 'Piotr abrigado não dispara');
  assert.ok(run.linkCounts['SUPPRESSION->HOSTILE_HIT'].direct > 0, 'supressão aliada -> hostil atingido (mesmo alvo)');
  assert.ok(run.linkCounts['ENEMY_SUPPRESSION->ALLY_HIT'].direct > 0, 'supressão hostil -> aliado atingido (mesmo alvo)');
  assert.ok(run.linkCounts['SUPPRESSION->ALLY_ADVANCES'].direct > 0, 'o aliado que suprimiu depois toma uma cobertura nova');
  // a MG34 tem uma ligação medida: rajadas antes > rajadas depois da supressão
  const mg = run.edges.filter((e) => e.type === 'MG_SUPPRESSED->MG_FIRE_REDUCED');
  for (const e of mg) {
    assert.equal(e.strength, 'measured');
    assert.ok(e.burstsBefore > e.burstsAfter && e.burstsBefore > 0);
  }
});

test('N1 causal log: Piotr advancing (ditch route + fire) links his shots to hit, kill and hostile alert', () => {
  const run = runCausalScenario({ seed: SEED, mode: 'advancing' });
  assertRunIsWellFormed(run);
  assert.ok(run.nodeCounts['ev:player_shot'] > 0, 'Piotr a avançar dispara');
  assert.ok(run.linkCounts['PLAYER_SHOT->PLAYER_HIT'].direct > 0);
  assert.ok(run.linkCounts['PLAYER_SHOT->HOSTILE_DOWN'].direct > 0, 'um tiro que atinge um hostil vivo e o abate é registado');
  assert.ok(run.linkCounts['PLAYER_SHOT->HOSTILE_ALERTED'].direct > 0, 'o som do tiro alerta hostis (memória de áudio)');
  assert.ok(run.linkCounts['INPUT_ORDER->ORDER_ACCEPTED'].direct + run.linkCounts['INPUT_ORDER->ORDER_REJECTED'].direct >= 1, 'a ordem Z/X de Piotr tem resposta registada (aceite ou recusada)');
  // «alerta -> hostil dispara» nunca é marcado `direct` se o hostil já disparava contra Piotr antes do alerta
  for (const e of run.edges.filter((x) => x.type === 'HOSTILE_ALERTED->HOSTILE_FIRES_ON_PLAYER')) {
    assert.ok(['direct', 'confounded'].includes(e.strength));
  }
});

test('N1 causal log: same seed => same log (sha256), different seed => different log', () => {
  for (const mode of MODES) {
    const a = runCausalScenario({ seed: SEED, mode });
    const b = runCausalScenario({ seed: SEED, mode });
    assert.equal(a.sha256, b.sha256, `${mode}: a mesma semente tem de dar o mesmo sha256`);
    assert.equal(JSON.stringify(a.nodes), JSON.stringify(b.nodes));
    assert.equal(JSON.stringify(a.edges), JSON.stringify(b.edges));
    assert.match(a.sha256, /^[0-9a-f]{64}$/);
  }
  const other = runCausalScenario({ seed: SEED + 1, mode: 'sheltered' });
  assert.notEqual(other.sha256, runCausalScenario({ seed: SEED, mode: 'sheltered' }).sha256, 'sementes diferentes têm de produzir registos diferentes');
});

test('N1 causal log: buildCausalLog runs every (seed, mode) twice, reports determinism and renders the summary', () => {
  const log = buildCausalLog({ seeds: [SEED] });
  assert.equal(log.runs.length, MODES.length);
  assert.equal(log.allDeterministic, true);
  for (const r of log.runs) {
    assert.equal(r.deterministic, true);
    assert.equal(r.repeatSha256, r.sha256);
  }
  for (const t of LINK_TYPES) {
    assert.equal(log.totals[t].total, log.runs.reduce((a, r) => a + r.linkCounts[t].total, 0));
  }
  const md = renderSummaryMarkdown(log, { commit: 'test', date: '2026-11-06' });
  for (const t of LINK_TYPES) assert.ok(md.includes(`| ${t} |`), `resumo inclui ${t}`);
  assert.match(md, /não é playtest nem aceitação de N1/);
  assert.match(md, /sha256/);
});
