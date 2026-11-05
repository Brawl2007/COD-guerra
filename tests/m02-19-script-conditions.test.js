// M02 roteiro: condições de cada transição C01 → C12 (PDF C, pp. 12-14), atalhos de bancada e estado do roteiro no snapshot.
// Testes de estado: preparam o cenário diretamente (tests/m02-18 é o que corre a missão só com entradas simuladas).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { M02_SCENE_IDS, M02_SCENE_HOLD_SEC, C04_EXIT_Z, stateSceneFloor } from '../src/game/m02-acts-director.js';
import { MissionBot } from './m02-mission-bot.js';

const DT = 0.1;

function playMission(seed) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  const bot = new MissionBot(sim);
  const reached = bot.playUntilC12(1800);
  return { sim, bot, reached };
}

describe('M02 roteiro: condições de cada transição (PDF C, pp. 12-14)', () => {
  const fresh = (seed = 19390909) => new M02BenchSimulation(seed, { startScene: 'C01' });
  const idle = (sim, sec) => {
    for (let i = 0; i < Math.ceil(sec / DT); i++) sim.tick(DT, {});
  };
  const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });

  it('C01 só acaba quando o jogador começa a avançar (a preparação não gasta tempo nem acaba sozinha)', () => {
    const sim = fresh();
    idle(sim, 90);
    assert.equal(sim.script.sceneId, 'C01');
    sim.tick(DT, { forward: 1 });
    sim.tick(DT, { forward: 1 });
    assert.equal(sim.script.sceneId, 'C02');
  });

  it('C02 → C03 pede o posto EA0 vencido E o jogador nas últimas coberturas (z ≥ -85); nunca por esperar', () => {
    const sim = fresh();
    sim.tick(DT, { forward: 1 });
    sim.tick(DT, { forward: 1 });
    sim.enemies.filter((e) => e.encounterId === 'EA0').forEach(kill);
    idle(sim, 120); // posto vencido pela secção mas o jogador ainda em P1
    assert.equal(sim.c01Active, false);
    assert.equal(sim.script.sceneId, 'C02');
    sim.drainEvents();
    sim.player.z = -84;
    sim.tick(DT, {});
    const changes = sim.drainEvents().filter((e) => e.type === 'scene-changed').map((e) => `${e.from}→${e.to}`);
    assert.equal(changes[0], 'C02→C03');
    // FIX-CD: com a navegação dos aliados a passar portas fechadas, a secção pode vencer a quinta nos 120 s; então C03 resolve-se
    // no mesmo tick (C03→C04), como manda a condição de C03.
    if (sim.script.sceneId !== 'C03') {
      assert.deepEqual(changes, ['C02→C03', 'C03→C04']);
      assert.ok(['C04', 'COMPLETE'].includes(sim.objective.id), sim.objective.id);
    }
  });

  it('C04 → C05 pede quinta consolidada (COMPLETE) e o jogador a sair pelo pomar (z ≥ 44); depois C05 dura 45 s e entra em B', () => {
    const sim = fresh();
    sim.tick(DT, { forward: 1 });
    sim.tick(DT, { forward: 1 });
    sim.enemies.forEach(kill);
    sim.player.z = C04_EXIT_Z - 5;
    sim.tick(DT, {});
    assert.equal(sim.objective.id, 'COMPLETE');
    assert.equal(sim.script.sceneId, 'C04');
    assert.equal(sim.transitionTABPayload, null);
    sim.player.z = C04_EXIT_Z + 1;
    sim.tick(DT, {});
    assert.equal(sim.script.sceneId, 'C05');
    assert.ok(sim.transitionTABPayload, 'TR01 (T-AB) aplicada ao entrar em C05');
    const t0 = sim.script.sceneStartedAt;
    while (sim.clock - t0 < M02_SCENE_HOLD_SEC.C05 - 0.5) sim.tick(DT, {});
    assert.equal(sim.activeCellId, 'A');
    while (sim.clock - t0 < M02_SCENE_HOLD_SEC.C05 + 0.3) sim.tick(DT, {});
    assert.equal(sim.activeCellId, 'B');
    assert.equal(sim.script.sceneId, 'C06');
  });

  it('C06 acaba pela passagem resolvida (corredor segurado), sem tempo mínimo: com hostis vivos fica em C06 por muito tempo que passe', () => {
    const sim = fresh();
    sim.enterAreaBC06(); // preparação do cenário B (teste de condição; o salto é apanhado pelo roteiro)
    idle(sim, 1);
    assert.equal(sim.script.sceneId, 'C06');
    for (const e of sim.enemies.slice(0, 6)) kill(e);
    for (let i = 0; i < 400; i++) {
      sim.enemies.forEach((e) => { if (e.alive) e.suppressed = 1; });
      sim.tick(DT, {});
    }
    assert.equal(sim.script.sceneId, 'C06', 'hostis ainda vivos: a cena não acaba por tempo');
    assert.equal(sim.flags['m02.corridor_held'], false);
  });

  it('C08 → C09: Lis é destacado em C08 (ainda em B) e só em C09 se muda de célula; C08 dura 60 s', () => {
    const sim = fresh();
    sim.enterAreaBC06();
    sim.enemies.forEach(kill);
    sim.tick(DT, {});
    for (let i = 0; i < 1800 && sim.script.sceneId !== 'C08'; i++) sim.tick(DT, {}); // carroça (≈55 s) + C07 (60 s)
    assert.equal(sim.script.sceneId, 'C08');
    assert.equal(sim.activeCellId, 'B', 'a reorganização e o briefing de C08 acontecem ainda na célula B');
    assert.equal(sim.areaB.c08Briefed, true);
    assert.equal(sim.allies.find((a) => a.id === 'pl_lis').detachedOutOfCell, true);
    const t0 = sim.script.sceneStartedAt;
    while (sim.clock - t0 < M02_SCENE_HOLD_SEC.C08 + 0.3) sim.tick(DT, {});
    assert.equal(sim.activeCellId, 'C');
    assert.equal(sim.script.sceneId, 'C09');
  });

  it('C11 → C12 pede o último grupo todo evacuado E Piotr no ponto de evacuação; com Lis amparado ao lado espera que ele chegue', () => {
    const sim = fresh();
    sim.enterAreaCC09();
    sim.enemies.forEach(kill);
    sim.player.x = -6;
    sim.player.z = -10; // no pátio: EC1 vencido e o jogador passou z > -18, logo C09 → C10
    for (let i = 0; i < 100 && sim.script.sceneId !== 'C10'; i++) sim.tick(DT, {});
    assert.equal(sim.script.sceneId, 'C10');
    for (let i = 0; i < 100 && sim.script.sceneId !== 'C11'; i++) sim.tick(DT, {});
    assert.equal(sim.script.sceneId, 'C11');
    // grupo ainda em marcha, Piotr longe: C11 mantém-se
    idle(sim, 20);
    assert.equal(sim.script.sceneId, 'C11');
    // grupo todo evacuado mas Piotr longe do ponto de evacuação
    for (const lg of sim.areaC.lastGroup) Object.assign(lg, { evacuated: true, arrivedAt: sim.clock });
    idle(sim, 5);
    assert.equal(sim.script.sceneId, 'C11', 'Piotr ainda não chegou ao ponto de evacuação');
    // Piotr chega ao ponto, sem nunca ter ido ter com Lis: C12 regista missing
    sim.player.x = -85;
    sim.player.z = 104;
    sim.tick(DT, {});
    assert.equal(sim.script.sceneId, 'C12');
    assert.equal(sim.flags['m02.lis_status'], 'missing');
    assert.equal(sim.areaC.lisOutcomeSource, 'game');
  });
});

describe('M02 roteiro: atalhos de bancada continuam a funcionar e o roteiro apanha-os', () => {
  it('um salto para a Área C (atalho) leva o roteiro a C09 sem o prender numa cena antiga; as cenas saltadas ficam com duração 0', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    sim.enterAreaCC09(); // atalho de depuração (Digit8)
    sim.tick(DT, {});
    assert.equal(stateSceneFloor(sim), 'C09');
    assert.equal(sim.script.sceneId, 'C09');
    assert.deepEqual(sim.script.history.map((h) => h.id), M02_SCENE_IDS.slice(0, 8));
    assert.ok(sim.script.history[0].endedAt - sim.script.history[0].startedAt <= DT + 1e-9, 'C01 só durou até ao primeiro tick');
    assert.ok(sim.script.history.slice(1).every((h) => h.endedAt - h.startedAt === 0));
  });

  it('o atalho de C12 (KeyM) acaba com o roteiro em C12 e depois finished', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    sim.completeC12Epilogue();
    sim.tick(DT, {});
    assert.equal(sim.script.sceneId, 'C12');
    for (let i = 0; i < 500; i++) sim.tick(DT, {});
    assert.equal(sim.script.finished, true);
  });
});

describe('M02 roteiro: estado do roteiro no snapshot e no validador', () => {
  it('script faz ida e volta no snapshot (restaurar a meio da missão retoma a mesma cena e o mesmo tempo)', () => {
    const { sim } = playMission(777);
    const sim2 = new M02BenchSimulation(1, { startScene: 'C01' });
    sim2.restoreSnapshot(structuredClone(sim.snapshot()));
    assert.deepEqual(sim2.script, sim.script);
  });

  it('o validador recusa cena fora do enum, histórico fora de ordem, início no futuro, finished fora de C12 e script em falta', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    sim.tick(DT, { forward: 1 });
    for (let i = 0; i < 5; i++) sim.tick(DT, {});
    const ok = sim.snapshot();
    assert.equal(validateM02Snapshot(ok).valid, true);
    const cases = [
      (s) => { delete s.script; },
      (s) => { s.script.sceneId = 'C13'; },
      (s) => { s.script.sceneStartedAt = s.clock + 5; },
      (s) => { s.script.finished = true; },
      (s) => { s.script.history = [{ id: 'C02', startedAt: 0, endedAt: 1 }, { id: 'C01', startedAt: 1, endedAt: 2 }]; },
      (s) => { s.script.history = [{ id: 'C09', startedAt: 0, endedAt: 1 }]; },
      (s) => { s.script.history = [{ id: 'C01', startedAt: 2, endedAt: 1 }]; },
    ];
    for (const mutate of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false);
      assert.match(r.reason, /script/);
    }
  });
});
