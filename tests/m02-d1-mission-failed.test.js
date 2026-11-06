// M02 D1 (PDF p. 16, «Falhas duras»): a missão falha quando Piotr morre. A falha é ESTADO (`sim.missionFailed = {reason, at}`):
// pára o passo da simulação, o roteiro e os checkpoints (automáticos e manuais), faz parte do snapshot (campo aditivo do schema 2)
// e só se sai dela por uma ação explícita (`restartAfterFailure`, que reusa `quickLoadCheckpoint`). Teste de estado, não playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  M02BenchSimulation,
  validateM02Snapshot,
  M02_MISSION_FAILURE_REASONS,
  M02_MISSION_FAILURE_TEXT,
} from '../src/game/m02-01-simulation.js';
import { createMemoryStorage } from '../src/game/m02-save-store.js';

const DT = 0.05;
const SEED = 19390909;

/** Piotr à janela da cozinha de B01 (DE-A07 tem linha de tiro) com pouca vida: morre a tiro por entradas simuladas. */
function sniped(seed = SEED, options = {}) {
  const sim = new M02BenchSimulation(seed, options);
  // Merge M02 único: a física do jogador corre em todos os ticks (Codex dd8358bf); em x = −44 Piotr assentava no fundo da vala oeste
  // (y −1,1), tapado pelo peitoril de B01. Em x = −42, chão firme à mesma janela, DE-A07 tem a linha de tiro que o teste exige.
  sim.teleportPlayer(-42.0, -15.5, 0);
  sim.player.health = 5;
  return sim;
}

function tickUntilFailed(sim, maxTicks = 1200) {
  for (let i = 0; i < maxTicks && !sim.missionFailed; i++) sim.tick(DT, {});
  return sim.missionFailed;
}

/**
 * Um fuzileiro alemão a 4 m de Piotr em campo aberto (longe da secção) dispara rajadas reais (`fireActorBurst`, a mesma via da IA)
 * até Piotr cair; o tick seguinte avalia a falha. Independente da percepção da IA, que muda com o que aconteceu antes.
 */
function shotDownByRifleman(sim) {
  sim.teleportPlayer(30, -60, Math.PI);
  sim.player.health = Math.min(sim.player.health, 5);
  const shooter = sim.enemies.find((e) => e.alive && e.weapon === 'kar98k');
  shooter.x = 34;
  shooter.z = -60;
  shooter.y = sim.world.heightAt(34, -60);
  shooter.crouched = false;
  for (let i = 0; i < 80 && sim.player.alive; i++) {
    shooter.mag = 5;
    sim.fireActorBurst(shooter, sim.player, { x: sim.player.x, y: sim.player.y + 1.25, z: sim.player.z }, 'enemy');
  }
  assert.equal(sim.player.alive, false, 'o atirador abateu Piotr');
  sim.tick(DT, {});
  return shooter;
}

describe('M02 D1: falha da missão quando Piotr morre', () => {
  it('a morte de Piotr a tiro escreve missionFailed {reason, at} uma só vez, com evento e registo de combate', () => {
    const sim = sniped();
    assert.equal(sim.missionFailed, null);
    sim.drainEvents();
    const failure = tickUntilFailed(sim);
    assert.ok(failure, 'Piotr acabou por morrer');
    assert.deepEqual(Object.keys(failure).sort(), ['at', 'reason']);
    assert.equal(failure.reason, 'piotr_killed');
    assert.ok(M02_MISSION_FAILURE_REASONS.includes(failure.reason));
    assert.ok(M02_MISSION_FAILURE_TEXT[failure.reason], 'cada razão tem texto de apresentação');
    assert.equal(failure.at, Number(sim.clock.toFixed(3)), 'at é o relógio do instante da morte');
    assert.equal(sim.player.alive, false);
    assert.equal(sim.player.health, 0);
    const events = sim.drainEvents().filter((e) => e.type === 'mission-failed');
    assert.equal(events.length, 1);
    assert.equal(events[0].reason, 'piotr_killed');
    assert.equal(events[0].at, failure.at);
    assert.equal(sim.combatLog.filter((e) => e.type === 'mission_failed').length, 1);
    // mais ticks não repetem nem alteram a falha
    for (let i = 0; i < 40; i++) sim.tick(DT, {});
    assert.deepEqual(sim.missionFailed, failure);
    assert.equal(sim.drainEvents().filter((e) => e.type === 'mission-failed').length, 0);
  });

  it('a morte por explosão (granada) também falha a missão', () => {
    const sim = new M02BenchSimulation(SEED);
    sim.player.health = 5;
    sim.detonateGrenadeAt(sim.player.x + 1, sim.player.y, sim.player.z, 6.5);
    assert.equal(sim.player.alive, false);
    sim.tick(DT, {});
    assert.equal(sim.missionFailed?.reason, 'piotr_killed');
  });

  it('a falha pára o roteiro e os checkpoints (automáticos e F5): nada novo é gravado nem muda de cena, mesmo que o anfitrião continue a avançar', () => {
    const storage = createMemoryStorage();
    const sim = sniped(SEED, { storage });
    tickUntilFailed(sim);
    assert.ok(sim.missionFailed);
    sim.drainEvents();
    const scriptBefore = JSON.stringify(sim.script);
    const reachedBefore = [...sim.checkpointsReached];
    const savedIds = [...sim.checkpoints.keys()];
    const dumpStore = () => JSON.stringify(storage.keys().map((k) => [k, storage.getItem(k)]));
    const storeBefore = dumpStore();
    // as condições que gravariam cp_m02_b_acesso e fariam avançar o roteiro cumprem-se, mas a missão já falhou
    for (const e of sim.enemies) if (!e.c04Candidate) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
    sim.player.z = 50;
    for (let i = 0; i < 200; i++) sim.tick(DT, {});
    assert.equal(JSON.stringify(sim.script), scriptBefore, 'o roteiro não avançou');
    assert.deepEqual(sim.checkpointsReached, reachedBefore, 'nenhum checkpoint automático atingido');
    assert.equal(sim.drainEvents().filter((e) => e.type === 'checkpoint-saved').length, 0);
    // Um checkpoint manual (F5) ou pedido pela API também é recusado, com evento explícito, sem tocar na loja
    assert.equal(sim.saveCheckpoint('cp_m02_manual'), null);
    assert.equal(sim.checkpointsReached.includes('cp_m02_manual'), false);
    sim.requestAutoCheckpoint('cp_m02_b_acesso');
    const rejected = sim.drainEvents().filter((e) => e.type === 'checkpoint-rejected');
    assert.ok(rejected.length >= 2);
    assert.match(rejected[0].reason, /missão falhou/);
    assert.deepEqual([...sim.checkpoints.keys()], savedIds, 'o índice de checkpoints não ganhou entradas');
    assert.equal(dumpStore(), storeBefore, 'a loja não foi tocada');
  });

  it('o checkpoint pedido no tick em que Piotr morre não é gravado (o estado gravado nunca é o da falha)', () => {
    const sim = new M02BenchSimulation(SEED);
    // todos os defensores menos DE-A14 (C04) caem e Piotr morre no mesmo tick: cp_m02_b_acesso ficaria pendente
    for (const e of sim.enemies) if (!e.c04Candidate) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
    sim.player.alive = false;
    sim.player.health = 0;
    sim.tick(DT, {});
    assert.equal(sim.missionFailed?.reason, 'piotr_killed');
    assert.equal(sim.checkpointsReached.includes('cp_m02_b_acesso'), false);
    assert.equal(sim.checkpoints.has('cp_m02_b_acesso'), false);
  });

  it('o roteiro não avança no tick em que Piotr morre nem depois (a cena fica onde estava)', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    sim.tick(DT, { forward: 1 });
    sim.tick(DT, { forward: 1 });
    assert.equal(sim.script.sceneId, 'C02');
    // o posto EA0 cai (condição de C02 → C03 satisfeita) mas Piotr morre no mesmo tick
    for (const e of sim.enemies.filter((x) => x.encounterId === 'EA0')) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
    sim.player.z = -84;
    sim.player.alive = false;
    sim.player.health = 0;
    sim.tick(DT, {});
    assert.equal(sim.missionFailed?.reason, 'piotr_killed');
    assert.equal(sim.script.sceneId, 'C02', 'o roteiro não correu neste tick');
    const history = JSON.stringify(sim.script.history);
    for (let i = 0; i < 100; i++) sim.tick(DT, {});
    assert.equal(sim.script.sceneId, 'C02');
    assert.equal(JSON.stringify(sim.script.history), history);
  });

  it('não há falha depois de a missão estar concluída (o epílogo C12 é uma elipse sem combate)', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    sim.completeC12Epilogue();
    sim.tick(DT, {});
    assert.equal(sim.flags['m02.completed'], true);
    sim.player.alive = false;
    sim.player.health = 0;
    sim.tick(DT, {});
    assert.equal(sim.missionFailed, null);
  });

  it('reset() limpa a falha', () => {
    const sim = sniped();
    tickUntilFailed(sim);
    assert.ok(sim.missionFailed);
    sim.reset();
    assert.equal(sim.missionFailed, null);
    sim.tick(DT, {});
    assert.ok(sim.clock > 0, 'o mundo volta a andar');
  });
});

describe('M02 D1: reinício explícito a partir do último checkpoint compatível', () => {
  it('sem falha restartAfterFailure não faz nada; com falha nunca recomeça sozinho (o tick não sai da falha)', () => {
    const sim = new M02BenchSimulation(SEED);
    assert.equal(sim.restartAfterFailure(), null);
    const dead = sniped();
    tickUntilFailed(dead);
    for (let i = 0; i < 600; i++) dead.tick(DT, {});
    assert.ok(dead.missionFailed, 'continua falhada: só uma ação explícita a levanta');
    assert.equal(dead.missionFailed.reason, 'piotr_killed');
  });

  it('reinicia a partir do último checkpoint gravado (mesma ordem de recurso que o F9) e a missão volta a andar', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    for (let i = 0; i < 20; i++) sim.tick(DT, {});
    sim.player.health = 61;
    const manual = sim.saveCheckpoint('cp_m02_manual');
    assert.ok(manual);
    shotDownByRifleman(sim);
    assert.ok(sim.missionFailed);
    sim.drainEvents();

    const loaded = sim.restartAfterFailure();
    assert.deepEqual(loaded, { checkpointId: 'cp_m02_manual', source: 'session' });
    assert.equal(sim.missionFailed, null, 'a falha levanta-se com o restauro');
    assert.equal(sim.player.alive, true);
    assert.equal(sim.player.health, 61, 'a vida é a do checkpoint (sem cura)');
    assert.equal(sim.clock, manual.clock);
    const events = sim.drainEvents();
    assert.deepEqual(
      events.filter((e) => e.type === 'restored' || e.type === 'mission-restarted').map((e) => e.type),
      ['restored', 'mission-restarted'],
    );
    assert.equal(events.find((e) => e.type === 'mission-restarted').checkpointId, 'cp_m02_manual');
    const clock0 = sim.clock;
    sim.tick(DT, {});
    assert.ok(sim.clock > clock0, 'depois do reinício o tick avança');
  });

  it('com a loja persistida (página recarregada) o reinício também usa o último checkpoint da loja', () => {
    const storage = createMemoryStorage();
    const first = new M02BenchSimulation(SEED, { storage });
    for (let i = 0; i < 10; i++) first.tick(DT, {});
    first.saveCheckpoint('cp_m02_manual');
    // sessão nova (como depois de recarregar a página) que morre logo
    const page = new M02BenchSimulation(SEED + 1, { storage });
    shotDownByRifleman(page);
    assert.ok(page.missionFailed);
    const loaded = page.restartAfterFailure();
    assert.equal(loaded.checkpointId, 'cp_m02_manual');
    assert.equal(loaded.source, 'store');
    assert.equal(page.missionFailed, null);
  });

  it('sem nenhum checkpoint gravado volta ao início em memória (cp_m02_a_preparacao)', () => {
    const sim = sniped();
    tickUntilFailed(sim);
    const loaded = sim.restartAfterFailure();
    assert.equal(loaded.checkpointId, 'cp_m02_a_preparacao');
    assert.equal(sim.missionFailed, null);
    assert.equal(sim.player.health, 100);
  });
});

describe('M02 D1: missionFailed no snapshot e no validador (campo aditivo do schema 2)', () => {
  it('um snapshot de missão em curso leva missionFailed: null e é válido; sem o campo (saves anteriores) também é válido', () => {
    const sim = new M02BenchSimulation(SEED);
    const snap = sim.snapshot();
    assert.equal(snap.missionFailed, null);
    assert.equal(validateM02Snapshot(snap).valid, true);
    const legacy = structuredClone(snap);
    delete legacy.missionFailed;
    assert.equal(validateM02Snapshot(legacy).valid, true, 'ausente = missão em curso');
    const other = new M02BenchSimulation(1);
    other.missionFailed = { reason: 'piotr_killed', at: 0 };
    other.restoreSnapshot(legacy);
    assert.equal(other.missionFailed, null, 'restaurar um save sem o campo deixa a missão em curso');
  });

  it('um snapshot tirado depois da falha leva o estado e o restauro repõe-no exatamente (mesma falha, roteiro parado)', () => {
    const sim = sniped();
    tickUntilFailed(sim);
    const snap = structuredClone(sim.snapshot());
    assert.deepEqual(snap.missionFailed, sim.missionFailed);
    assert.equal(validateM02Snapshot(snap).valid, true);
    const fresh = new M02BenchSimulation(SEED + 5);
    fresh.restoreSnapshot(snap);
    assert.deepEqual(fresh.missionFailed, sim.missionFailed);
    const scriptBefore = JSON.stringify(fresh.script);
    for (let i = 0; i < 40; i++) fresh.tick(DT, {});
    assert.deepEqual(fresh.missionFailed, sim.missionFailed, 'o sim restaurado numa falha continua falhado');
    assert.equal(JSON.stringify(fresh.script), scriptBefore, 'e com o roteiro parado');
  });

  it('o validador recusa razão fora do enum, tempo inválido ou no futuro e forma errada (mensagem explícita)', () => {
    const sim = new M02BenchSimulation(SEED);
    for (let i = 0; i < 10; i++) sim.tick(DT, {});
    const ok = sim.snapshot();
    const cases = [
      (s) => { s.missionFailed = { reason: 'magia', at: 1 }; },
      (s) => { s.missionFailed = { reason: 'piotr_killed', at: -1 }; },
      (s) => { s.missionFailed = { reason: 'piotr_killed', at: s.clock + 5 }; },
      (s) => { s.missionFailed = { reason: 'piotr_killed' }; },
      (s) => { s.missionFailed = 'piotr_killed'; },
      (s) => { s.missionFailed = [{ reason: 'piotr_killed', at: 0 }]; },
    ];
    for (const mutate of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, JSON.stringify(bad.missionFailed));
      assert.match(r.reason, /missionFailed/);
    }
  });
});
