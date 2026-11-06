#!/usr/bin/env node
// M02 gate N1 (PDF O2, AI-01): registo causal ação -> efeito da Área A.
// Corre a simulação Node (M02BenchSimulation, Área A) com Piotr abrigado e com Piotr a avançar, em várias sementes, e exporta:
//   n1-causal-log.json     nós (ações/efeitos observados no combatLog, nos eventos e no estado) + arestas causais + sha256 por corrida
//   n1-causal-summary.md   contagens por tipo de ligação causal, resultado do teste de determinismo e limitações
// Só LÊ a simulação (combatLog, eventos drenados, memória dos hostis); não a altera nem usa atalhos. Não é playtest nem aceitação de N1.
//
// Regra de ligação: cada efeito liga-se à sua causa mais recente que cumpre a chave da regra dentro da janela. Força da ligação:
//   direct      – efeito e causa partilham a chave (mesmo alvo, mesmo atirador, mesmo ator) ou ocorrem no mesmo tick
//   confounded  – havia uma causa alternativa antes da causa registada (ex.: o hostil já disparava contra Piotr antes do alerta)
//   temporal    – só sucessão no tempo dentro da janela, sem chave partilhada (indício, não prova)
//   measured    – comparação de contagens antes/depois numa janela fixa (ex.: rajadas da MG34)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { M02BenchSimulation } from '../../src/game/m02-01-simulation.js';
import { MissionBot } from '../../tests/m02-mission-bot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');
const layout = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'missions/m02-bzura/m02-01-quinta-layout.json'), 'utf8'));

export const DEFAULT_SEEDS = Object.freeze([19390909, 19390910, 19390911, 19390912]);
export const MODES = Object.freeze(['sheltered', 'advancing']);
export const DT = 0.05;
export const PLAYER_ID = 'piotr_sokol';
export const MG_ACTOR_ID = 'DE-A05';
export const MG_WINDOW_SEC = 8;
/** Os aliados tomam as primeiras coberturas no arranque (t < 5 s); capturas mais tarde contam como avanço/efeito de ordem. */
const ORDER_EFFECT_MIN_T = 5;

/** Janela máxima (s) entre causa e efeito, por tipo de ligação. */
export const LINK_RULES = Object.freeze({
  'INPUT_ORDER->ORDER_ACCEPTED': { windowSec: 0.5 },
  'INPUT_ORDER->ORDER_REJECTED': { windowSec: 0.5 },
  'ORDER->ALLY_TAKES_COVER': { windowSec: 12 },
  'SUPPRESSION->HOSTILE_HIT': { windowSec: 8 },
  'HIT->HOSTILE_DOWN': { windowSec: 8 },
  'SUPPRESSION->ALLY_ADVANCES': { windowSec: 10 },
  'HOSTILE_DOWN->ALLY_ADVANCES': { windowSec: 10 },
  'ENEMY_SUPPRESSION->ALLY_HIT': { windowSec: 8 },
  'ENEMY_HIT->ALLY_DOWN': { windowSec: 3 },
  'ALLY_DOWN->RESCUE_WINDOW': { windowSec: 0.5 },
  'PLAYER_SHOT->PLAYER_HIT': { windowSec: 0.5 },
  'PLAYER_SHOT->HOSTILE_ALERTED': { windowSec: 0.5 },
  'PLAYER_SHOT->HOSTILE_DOWN': { windowSec: 0.5 },
  'HOSTILE_ALERTED->HOSTILE_FIRES_ON_PLAYER': { windowSec: 15 },
  'HOSTILE_DOWN->HOSTILE_WITHDRAWS_OR_SURRENDERS': { windowSec: 10 },
  'MG_SUPPRESSED->MG_FIRE_REDUCED': { windowSec: MG_WINDOW_SEC },
  'MG_DOWN->MG_SILENT': { windowSec: MG_WINDOW_SEC },
});
export const LINK_TYPES = Object.freeze(Object.keys(LINK_RULES));

const r2 = (n) => Number(Number(n).toFixed(2));

export const sha256Hex = (text) => crypto.createHash('sha256').update(text).digest('hex');

/** Rota da vala (layout.routes.ditch sem o ponto de partida): Piotr avança por ela e abre fogo ao hostil que consegue acertar. */
export const ADVANCE_ROUTE = Object.freeze(layout.routes.ditch.slice(1));
const ENGAGE_RANGE_M = 90;
const ENGAGE_MAX_SEC = 25;

/** Um tick de Piotr a avançar: combate (mira e dispara ao hostil acertável) ou caminha para o waypoint seguinte; depois da rota, joga a cena. */
function advanceStep(sim, bot, route) {
  const p = sim.player;
  if (route.index >= route.waypoints.length) return bot.playTick();
  const wp = route.waypoints[route.index];
  const last = route.index === route.waypoints.length - 1;
  if (Math.hypot(wp.x - p.x, wp.z - p.z) <= (last ? 1.5 : 2.0)) {
    route.index++;
    bot.corners = null;
    return bot.tick({});
  }
  const target = route.engagedSec < ENGAGE_MAX_SEC ? bot.nearestHittableHostile(ENGAGE_RANGE_M) : null;
  if (target) {
    route.engagedSec += DT;
    return bot.tick(bot.aimAtPoint(target.aim));
  }
  const c = bot.walkControls(wp, { sprint: true });
  if (sim.currentDoorPrompt()?.state === 'closed') c.interact = true;
  return bot.tick(c);
}

/** Corre uma simulação e recolhe os registos brutos (nós) por ordem de ocorrência. */
function collectNodes({ seed, mode, maxSimSec }) {
  const sim = new M02BenchSimulation(seed);
  const nodes = [];
  const add = (kind, t, fields) => {
    const node = { id: `n${String(nodes.length + 1).padStart(5, '0')}`, t: r2(t), kind, ...fields };
    nodes.push(node);
    return node;
  };
  let logCursor = sim.combatLog.length;
  const maxTicks = Math.ceil(maxSimSec / DT);
  const bot = mode === 'advancing' ? new MissionBot(sim, { dt: DT }) : null;
  const route = { waypoints: ADVANCE_ROUTE.map(([x, z]) => ({ x, z })), index: 0, engagedSec: 0 };
  if (mode === 'sheltered') {
    sim.player.crouched = true;
    sim.player.eyeHeight = 1.08;
  }
  // Ordens de Piotr à secção no modo «avançar»: cobrir aos 3 s, avançar aos 15 s (as teclas Z e X; a simulação pode recusá-las).
  const orderTicks = new Map([
    [Math.round(0.2 / DT), { orderCover: true }],
    [Math.round(12 / DT), { orderAdvance: true }],
  ]);

  let stopReason = 'time-limit';
  let ticks = 0;
  for (let i = 0; i < maxTicks; i++) {
    const aliveBefore = new Map(sim.enemies.map((e) => [e.id, e.alive]));
    const before = new Map(sim.enemies.map((e) => [e.id, e.memory ? { source: e.memory.source, seenAt: e.memory.seenAt, targetId: e.memory.targetId } : null]));
    let events;
    if (bot) {
      if (orderTicks.has(i)) {
        const input = orderTicks.get(i);
        add('input:order_requested', sim.clock + DT, { order: input.orderCover ? 'cover' : 'advance' });
        bot.tick(input);
      }
      else advanceStep(sim, bot, route);
      events = bot.events.splice(0);
    } else {
      sim.tick(DT, {});
      events = sim.drainEvents();
    }
    ticks++;
    const clockNow = r2(sim.clock);

    // combatLog: só entradas novas (a lista só cresce durante a corrida)
    const fresh = sim.combatLog.slice(logCursor);
    logCursor = sim.combatLog.length;
    for (const e of fresh) {
      const { clock, type, ...rest } = e;
      add(`log:${type}`, clock ?? clockNow, rest);
    }
    for (const ev of events) {
      if (ev.type === 'actor-burst') {
        // Só rajadas relevantes para a causalidade: dos hostis contra Piotr e de qualquer ator contra DE-A05 já estão no combatLog.
        if (ev.side === 'enemy' && ev.targetId === PLAYER_ID) add('ev:enemy_burst_on_player', ev.clock ?? clockNow, { shooterId: ev.shooterId, hitAny: ev.hitAny });
        if (ev.shooterId === MG_ACTOR_ID) add('ev:mg_actor_burst', ev.clock ?? clockNow, { targetId: ev.targetId, hitAny: ev.hitAny });
      } else if (ev.type === 'mg-burst') {
        add('ev:mg_burst', ev.clock ?? clockNow, { sourceId: ev.sourceId });
      } else if (ev.type === 'shot-fired') {
        const s = ev.shot;
        const shot = add('ev:player_shot', s.clock ?? clockNow, { shotId: s.id, hitKind: s.hitKind, hitId: s.hitId, part: s.part ?? null });
        // baixa causada pelo tiro de Piotr: o hostil atingido estava vivo antes do tick e já não está (lido do estado)
        if (s.hitKind === 'actor') {
          const victim = sim.enemies.find((e) => e.id === s.hitId);
          if (victim && aliveBefore.get(victim.id) && !victim.alive) add('state:hostile_down_by_player', s.clock ?? clockNow, { enemyId: victim.id, byShotId: shot.shotId });
        }
        // alerta: o som do tiro grava memória de áudio nos hostis a ≤ 90 m (alertEnemiesBySound); lido do estado, tick a tick
        for (const e of sim.enemies) {
          const m = e.memory;
          const prev = before.get(e.id);
          if (!m || m.source !== 'audio' || m.targetId !== PLAYER_ID || r2(m.seenAt) !== r2(s.clock ?? clockNow)) continue;
          if (prev && prev.source === 'audio' && prev.seenAt === m.seenAt) continue;
          add('state:hostile_alerted', m.seenAt, { enemyId: e.id, byShotId: shot.shotId });
        }
      } else if (ev.type === 'scene-changed') {
        add('ev:scene_changed', ev.clock ?? clockNow, { from: ev.from, to: ev.to });
      } else if (ev.type === 'mission-failed') {
        add('ev:mission_failed', ev.clock ?? clockNow, { reason: ev.reason });
      }
    }
    if (sim.missionFailed) {
      stopReason = 'mission-failed';
      break;
    }
    if (mode === 'advancing' && sim.script.sceneId === 'C04') {
      stopReason = 'reached-C04';
      break;
    }
  }
  const enemies = sim.enemies.filter((e) => !e.nonCombatant);
  return {
    nodes,
    meta: {
      seed,
      mode,
      dtSec: DT,
      ticks,
      simulatedSec: r2(sim.clock),
      stopReason,
      finalScene: sim.script.sceneId,
      playerHealth: sim.player.health,
      alliesAlive: sim.allies.filter((a) => a.alive).length,
      alliesTotal: sim.allies.length,
      hostilesActive: enemies.filter((e) => e.alive).length,
      hostilesTotal: sim.enemies.length,
    },
  };
}

/** Procura a causa mais recente (índice ≤ efeito) que cumpre `match` dentro da janela. */
function latestCause(nodes, effect, kinds, windowSec, match = () => true) {
  const idx = nodes.indexOf(effect);
  for (let i = idx - 1; i >= 0; i--) {
    const c = nodes[i];
    if (effect.t - c.t > windowSec) break;
    if (kinds.includes(c.kind) && match(c)) return c;
  }
  return null;
}

/** Constrói as arestas causais a partir dos nós. */
function linkNodes(nodes) {
  const edges = [];
  const link = (type, cause, effect, strength, extra = {}) => {
    edges.push({ type, cause: cause.id, effect: effect.id, lagSec: r2(effect.t - cause.t), strength, ...extra });
  };
  const byKind = (k) => nodes.filter((n) => n.kind === k);

  // Ordem de Piotr -> aliado toma a cobertura atribuída (ou outro aliado, temporal)
  const orders = byKind('log:squad_order');
  for (const effect of byKind('log:squad_order')) {
    const cause = latestCause(nodes, effect, ['input:order_requested'], LINK_RULES['INPUT_ORDER->ORDER_ACCEPTED'].windowSec);
    if (cause) link('INPUT_ORDER->ORDER_ACCEPTED', cause, effect, 'direct', { order: cause.order });
  }
  for (const effect of byKind('log:squad_order_rejected')) {
    const cause = latestCause(nodes, effect, ['input:order_requested'], LINK_RULES['INPUT_ORDER->ORDER_REJECTED'].windowSec);
    if (cause) link('INPUT_ORDER->ORDER_REJECTED', cause, effect, 'direct', { order: cause.order, reason: effect.reason });
  }
  for (const effect of byKind('log:ally_captured_cover')) {
    if (effect.t < ORDER_EFFECT_MIN_T) continue; // posicionamento inicial do tick 0, não é efeito de ordem
    const cause = latestCause(nodes, effect, ['log:squad_order'], LINK_RULES['ORDER->ALLY_TAKES_COVER'].windowSec);
    if (!cause) continue;
    const assigned = cause.order?.assignments?.[effect.actorId];
    link('ORDER->ALLY_TAKES_COVER', cause, effect, assigned && assigned === effect.nodeId ? 'direct' : 'temporal');
  }
  void orders;

  for (const effect of byKind('log:ally_hit_enemy')) {
    const cause = latestCause(nodes, effect, ['log:ally_suppressed_enemy'], LINK_RULES['SUPPRESSION->HOSTILE_HIT'].windowSec, (c) => c.targetId === effect.targetId);
    if (cause) link('SUPPRESSION->HOSTILE_HIT', cause, effect, 'direct', { sameShooter: cause.shooterId === effect.shooterId });
  }
  for (const effect of byKind('log:ally_killed_enemy')) {
    const cause = latestCause(nodes, effect, ['log:ally_hit_enemy'], LINK_RULES['HIT->HOSTILE_DOWN'].windowSec, (c) => c.targetId === effect.targetId);
    if (cause) link('HIT->HOSTILE_DOWN', cause, effect, 'direct');
  }
  for (const effect of byKind('log:ally_captured_cover')) {
    if (effect.t < ORDER_EFFECT_MIN_T) continue; // posicionamento inicial, não é avanço
    const sup = latestCause(nodes, effect, ['log:ally_suppressed_enemy'], LINK_RULES['SUPPRESSION->ALLY_ADVANCES'].windowSec, (c) => c.shooterId === effect.actorId);
    if (sup) link('SUPPRESSION->ALLY_ADVANCES', sup, effect, 'direct');
    const kill = latestCause(nodes, effect, ['log:ally_killed_enemy'], LINK_RULES['HOSTILE_DOWN->ALLY_ADVANCES'].windowSec, (c) => c.shooterId === effect.actorId);
    if (kill) link('HOSTILE_DOWN->ALLY_ADVANCES', kill, effect, 'direct');
  }
  for (const effect of byKind('log:enemy_hit_ally')) {
    const cause = latestCause(nodes, effect, ['log:enemy_suppressed_ally'], LINK_RULES['ENEMY_SUPPRESSION->ALLY_HIT'].windowSec, (c) => c.targetId === effect.targetId);
    if (cause) link('ENEMY_SUPPRESSION->ALLY_HIT', cause, effect, 'direct', { sameShooter: cause.shooterId === effect.shooterId });
  }
  for (const effect of byKind('log:ally_down')) {
    const cause = latestCause(nodes, effect, ['log:enemy_hit_ally'], LINK_RULES['ENEMY_HIT->ALLY_DOWN'].windowSec, (c) => c.targetId === effect.targetId);
    if (cause) link('ENEMY_HIT->ALLY_DOWN', cause, effect, 'direct');
  }
  for (const effect of byKind('log:rescue_window_opened')) {
    // no motor a janela de socorro abre antes de o `ally_down` ser registado, no mesmo tick: procura-se a baixa do mesmo ator à volta do efeito
    const cause = nodes.find((n) => n.kind === 'log:ally_down' && n.targetId === effect.actorId && Math.abs(n.t - effect.t) <= LINK_RULES['ALLY_DOWN->RESCUE_WINDOW'].windowSec);
    if (cause) link('ALLY_DOWN->RESCUE_WINDOW', cause, effect, 'direct');
  }

  // Tiro de Piotr -> acerto, alerta, hostil dispara contra Piotr
  for (const shot of byKind('ev:player_shot')) {
    // o acerto do tiro está no próprio registo do tiro (hitKind); o nó é o mesmo, a ligação documenta o resultado balístico
    if (shot.hitKind === 'actor') link('PLAYER_SHOT->PLAYER_HIT', shot, shot, 'direct', { hitId: shot.hitId, part: shot.part });
  }
  for (const effect of byKind('state:hostile_down_by_player')) {
    const cause = nodes.find((n) => n.kind === 'ev:player_shot' && n.shotId === effect.byShotId);
    if (cause) link('PLAYER_SHOT->HOSTILE_DOWN', cause, effect, 'direct');
  }
  for (const effect of byKind('state:hostile_alerted')) {
    const cause = nodes.find((n) => n.kind === 'ev:player_shot' && n.shotId === effect.byShotId);
    if (cause) link('PLAYER_SHOT->HOSTILE_ALERTED', cause, effect, 'direct');
  }
  for (const effect of byKind('ev:enemy_burst_on_player')) {
    const alert = latestCause(nodes, effect, ['state:hostile_alerted'], LINK_RULES['HOSTILE_ALERTED->HOSTILE_FIRES_ON_PLAYER'].windowSec, (c) => c.enemyId === effect.shooterId);
    if (!alert) continue;
    const already = nodes.some((n) => n.kind === 'ev:enemy_burst_on_player' && n.shooterId === effect.shooterId && nodes.indexOf(n) < nodes.indexOf(alert));
    const firstAfter = !nodes.some((n) => n.kind === 'ev:enemy_burst_on_player' && n.shooterId === effect.shooterId && nodes.indexOf(n) > nodes.indexOf(alert) && nodes.indexOf(n) < nodes.indexOf(effect));
    if (!firstAfter) continue; // só a primeira rajada depois do alerta é efeito do alerta
    link('HOSTILE_ALERTED->HOSTILE_FIRES_ON_PLAYER', alert, effect, already ? 'confounded' : 'direct');
  }

  // Moral: baixa de um hostil -> recuo ou rendição (temporal: o motor não regista a causa)
  for (const effect of [...byKind('log:enemy_withdrawing'), ...byKind('log:enemy_surrendered')]) {
    const cause = latestCause(nodes, effect, ['log:ally_killed_enemy'], LINK_RULES['HOSTILE_DOWN->HOSTILE_WITHDRAWS_OR_SURRENDERS'].windowSec);
    if (cause) link('HOSTILE_DOWN->HOSTILE_WITHDRAWS_OR_SURRENDERS', cause, effect, 'temporal');
  }

  // MG34 (DE-A05): rajadas nos MG_WINDOW_SEC antes e depois de cada supressão (a primeira de cada janela) e depois da baixa
  const mgBursts = nodes.filter((n) => n.kind === 'ev:mg_actor_burst' || n.kind === 'ev:mg_burst');
  const countIn = (from, to) => mgBursts.filter((b) => b.t >= from && b.t < to).length;
  let lastWindowEnd = -Infinity;
  for (const sup of nodes.filter((n) => n.kind === 'log:ally_suppressed_enemy' && n.targetId === MG_ACTOR_ID)) {
    if (sup.t < lastWindowEnd) continue;
    lastWindowEnd = sup.t + MG_WINDOW_SEC;
    const before = countIn(sup.t - MG_WINDOW_SEC, sup.t);
    const after = countIn(sup.t, sup.t + MG_WINDOW_SEC);
    if (sup.t < MG_WINDOW_SEC) continue; // sem janela «antes» completa
    if (before > 0 && after < before) link('MG_SUPPRESSED->MG_FIRE_REDUCED', sup, sup, 'measured', { burstsBefore: before, burstsAfter: after, windowSec: MG_WINDOW_SEC });
  }
  const down = nodes.find((n) => n.kind === 'log:ally_killed_enemy' && n.targetId === MG_ACTOR_ID);
  if (down && countIn(down.t - MG_WINDOW_SEC, down.t) > 0 && countIn(down.t, down.t + MG_WINDOW_SEC) === 0) {
    link('MG_DOWN->MG_SILENT', down, down, 'measured', { burstsBefore: countIn(down.t - MG_WINDOW_SEC, down.t), burstsAfter: 0, windowSec: MG_WINDOW_SEC });
  }
  return edges;
}

/** Corre e liga uma corrida; devolve o registo canónico + o sha256 do JSON canónico. */
export function runCausalScenario({ seed, mode, maxSimSec }) {
  const limit = maxSimSec ?? (mode === 'sheltered' ? 60 : 120);
  const { nodes, meta } = collectNodes({ seed, mode, maxSimSec: limit });
  const edges = linkNodes(nodes);
  const nodeCounts = {};
  for (const n of nodes) nodeCounts[n.kind] = (nodeCounts[n.kind] ?? 0) + 1;
  const linkCounts = {};
  for (const t of LINK_TYPES) linkCounts[t] = { total: 0, direct: 0, confounded: 0, temporal: 0, measured: 0 };
  for (const e of edges) {
    linkCounts[e.type].total++;
    linkCounts[e.type][e.strength]++;
  }
  const run = { meta: { ...meta, maxSimSec: limit }, nodeCounts, linkCounts, nodes, edges };
  run.sha256 = sha256Hex(JSON.stringify({ meta: run.meta, nodes, edges }));
  return run;
}

/** Corre todas as combinações semente x modo duas vezes e compara os sha256 (determinismo). */
export function buildCausalLog({ seeds = DEFAULT_SEEDS, modes = MODES, repeat = true } = {}) {
  const runs = [];
  for (const mode of modes) {
    for (const seed of seeds) {
      const first = runCausalScenario({ seed, mode });
      const second = repeat ? runCausalScenario({ seed, mode }) : null;
      runs.push({ ...first, repeatSha256: second ? second.sha256 : null, deterministic: second ? second.sha256 === first.sha256 : null });
    }
  }
  const totals = {};
  for (const t of LINK_TYPES) totals[t] = { total: 0, direct: 0, confounded: 0, temporal: 0, measured: 0 };
  for (const run of runs) for (const t of LINK_TYPES) for (const k of Object.keys(totals[t])) totals[t][k] += run.linkCounts[t][k];
  return {
    schema: 'm02-n1-causal-log-v1',
    gate: 'N1 (PDF O2: AI-01)',
    seeds: [...seeds],
    modes: [...modes],
    linkRules: LINK_RULES,
    totals,
    allDeterministic: runs.every((r) => r.deterministic !== false),
    runs,
  };
}

export function renderSummaryMarkdown(log, { commit = 'unknown', date = '' } = {}) {
  const L = [];
  L.push(`# Registo causal N1 (AI-01): ${date}`);
  L.push('');
  L.push(`Gerado por \`node tools/m02/n1-causal-log.mjs\` no commit \`${commit}\`. Simulação Node da Área A (\`M02BenchSimulation\`), passo ${DT} s.`);
  L.push(`Sementes: ${log.seeds.join(', ')}. Modos: \`sheltered\` (Piotr agachado e parado, 60 s) e \`advancing\` (Piotr joga com o \`MissionBot\` pela vala, ordens Z aos 0,2 s e X aos 12 s, até 120 s ou C04 ou falha).`);
  L.push('');
  L.push('**Isto é evidência gerada por simulação de estado, não é playtest nem aceitação de N1.** Cada efeito liga-se à causa mais recente que cumpre a chave da regra dentro da janela; a força da ligação diz se a chave é partilhada (`direct`), se havia causa alternativa anterior (`confounded`), se é só sucessão no tempo (`temporal`) ou uma comparação de contagens (`measured`).');
  L.push('');
  L.push('## Contagens por tipo de ligação causal (todas as corridas)');
  L.push('');
  L.push('| Ligação | Janela (s) | Total | direct | confounded | temporal | measured |');
  L.push('|---|---|---|---|---|---|---|');
  for (const t of LINK_TYPES) {
    const c = log.totals[t];
    L.push(`| ${t} | ${LINK_RULES[t].windowSec} | ${c.total} | ${c.direct} | ${c.confounded} | ${c.temporal} | ${c.measured} |`);
  }
  L.push('');
  L.push('## Corridas');
  L.push('');
  L.push('| Modo | Semente | Fim | Cena | Piotr (vida) | Aliados vivos | Hostis ativos | Nós | Arestas | sha256 (corrida) | Repetição igual |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of log.runs) {
    const m = r.meta;
    L.push(
      `| ${m.mode} | ${m.seed} | ${m.stopReason} (${m.simulatedSec} s) | ${m.finalScene} | ${m.playerHealth} | ${m.alliesAlive}/${m.alliesTotal} | ${m.hostilesActive}/${m.hostilesTotal} | ${r.nodes.length} | ${r.edges.length} | \`${r.sha256.slice(0, 16)}\` | ${r.deterministic === null ? 'n/a' : r.deterministic ? 'sim' : 'NÃO'} |`,
    );
  }
  L.push('');
  L.push(`Determinismo: ${log.allDeterministic ? 'cada par (semente, modo) correu duas vezes e produziu o mesmo sha256 do registo canónico' : 'HOUVE DIVERGÊNCIA entre repetições'}. O sha256 completo de cada corrida está em \`n1-causal-log.json\`.`);
  const hashes = new Map();
  for (const r of log.runs) hashes.set(`${r.meta.mode}`, (hashes.get(`${r.meta.mode}`) ?? new Set()).add(r.sha256));
  L.push('');
  L.push('## Contagens por tipo de ligação e por modo');
  L.push('');
  L.push('| Ligação | sheltered (total/direct) | advancing (total/direct) |');
  L.push('|---|---|---|');
  for (const t of LINK_TYPES) {
    const cell = (mode) => {
      const rs = log.runs.filter((r) => r.meta.mode === mode);
      const total = rs.reduce((a, r) => a + r.linkCounts[t].total, 0);
      const direct = rs.reduce((a, r) => a + r.linkCounts[t].direct + r.linkCounts[t].measured, 0);
      return `${total}/${direct}`;
    };
    L.push(`| ${t} | ${cell('sheltered')} | ${cell('advancing')} |`);
  }
  L.push('');
  L.push('## Limitações');
  L.push('');
  L.push('- O motor não grava a causa de cada decisão: as ligações são reconstruídas a partir de chaves partilhadas (alvo, atirador, ator) e de janelas fixas. `temporal` e `confounded` são indícios.');
  L.push('- `PLAYER_SHOT->PLAYER_HIT` descreve o resultado balístico do próprio tiro (acertou num ator), não um efeito posterior.');
  L.push('- A MG34 (DE-A05) é medida por contagem de rajadas antes/depois (janela fixa); `MG_SUPPRESSED->MG_FIRE_REDUCED` só é registada quando há rajadas antes e menos depois. A ausência de aresta não prova que a supressão não funciona.');
  L.push('- Ligações a `HOSTILE_ALERTED` dependem de a memória de áudio do hostil ter sido escrita pelo tiro de Piotr; só existem no modo `advancing` (em `sheltered` Piotr não dispara).');
  L.push('- Sem sinal de «rota livre» no motor: só se mede o fogo da MG34. Moral/recuo é `temporal`.');
  L.push('- Resultados de uma bancada com 7 aliados e 10 hostis; não generalizam para as Áreas B e C.');
  L.push('');
  return L.join('\n');
}

function parseArgs(argv) {
  const out = { dir: null, seeds: null, commit: 'unknown', date: new Date().toISOString().slice(0, 10) };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.dir = argv[++i];
    else if (argv[i] === '--seeds') out.seeds = argv[++i].split(',').map(Number);
    else if (argv[i] === '--commit') out.commit = argv[++i];
    else if (argv[i] === '--date') out.date = argv[++i];
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseArgs(process.argv.slice(2));
  const dir = path.resolve(REPO_ROOT, args.dir ?? `docs/verification/m02-claude/n1-${args.date}`);
  fs.mkdirSync(dir, { recursive: true });
  const log = buildCausalLog({ seeds: args.seeds ?? DEFAULT_SEEDS });
  const body = { ...log, commit: args.commit, date: args.date };
  fs.writeFileSync(path.join(dir, 'n1-causal-log.json'), JSON.stringify(body));
  fs.writeFileSync(path.join(dir, 'n1-causal-summary.md'), renderSummaryMarkdown(log, { commit: args.commit, date: args.date }));
  console.log(`[m02-n1] ${log.runs.length} corridas, deterministas=${log.allDeterministic}, saída em ${path.relative(REPO_ROOT, dir)}`);
  for (const t of LINK_TYPES) console.log(`  ${t}: ${JSON.stringify(log.totals[t])}`);
}
