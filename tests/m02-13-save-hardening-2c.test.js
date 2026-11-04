// M02-FIX-2c · defeitos P2 residuais dos saves da bancada, confirmados por execução numa verificação independente.
// Teste de estado (não é playtest): cada caso reproduz o defeito (falha com o código anterior) e prova que deixou de ocorrer.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage, M02SaveStore, M02_SAVE_STORAGE_KEY } from '../src/game/m02-save-store.js';

const DT = 0.05;
const SEED = 19390909;

/** JSON estável (Map/Set ordenados). `-0` conta como 0 (o JSON do armazenamento não o representa). */
function canonical(value, strictZero = false) {
  return JSON.stringify(value, function replacer(_key, v) {
    if (typeof v === 'number') {
      if (Object.is(v, -0)) return strictZero ? '#-0' : 0;
      if (!Number.isFinite(v)) return `#${v}`;
      return v;
    }
    if (v instanceof Map) return { '#map': [...v.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) };
    if (v instanceof Set) return { '#set': [...v].sort() };
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]));
    }
    return v;
  });
}

const NON_STATE_SIM_KEYS = new Set([
  'world',
  'navigator',
  'zoneStreamer',
  'saveStore',
  'checkpoints',
  'events',
  'lastCheckpointPersist',
  'rendererHintLastShot',
  'defaultStartScene',
]);
const ownFields = (obj) => Object.fromEntries(Object.keys(obj).map((k) => [k, obj[k]]));

/** Estado vivo lido dos objetos (não do snapshot), mais o estado do mundo. */
function liveState(sim) {
  const top = {};
  for (const key of Object.keys(sim).sort()) {
    if (NON_STATE_SIM_KEYS.has(key)) continue;
    const v = sim[key];
    top[key] = ['dialogue', 'horizon', 'audiovisual', 'weapon', 'rng'].includes(key) ? ownFields(v) : v;
  }
  top.worldState = {
    cellId: sim.activeCellId,
    streamerCellId: sim.zoneStreamer.activeCellId,
    revision: sim.world.revision,
    doors: sim.world.doorStates,
    windows: sim.world.windowStates,
    fences: sim.world.fenceStates,
    exteriorCoverIds: (sim.world.layout.exteriorCovers ?? []).map((c) => c.id),
    obstacleIds: sim.world.obstacles.map((o) => o.id).join(','),
  };
  return top;
}

/** Piloto determinístico mínimo. */
const walker = (_sim, t) => ({ forward: t % 50 < 30 ? 1 : 0, lookX: t % 70 === 0 ? 0.3 : 0, fire: t % 13 === 5 });
const idle = () => ({});

/** Corre `count` ticks e devolve, por tick, o estado vivo canónico e os eventos canónicos. */
function record(sim, driver, count, strictZero = false) {
  const states = [];
  const events = [];
  for (let t = 0; t < count; t++) {
    sim.tick(DT, driver(sim, t));
    events.push(canonical(sim.drainEvents(), strictZero));
    states.push(canonical(liveState(sim), strictZero));
  }
  return { states, events };
}

function assertSameContinuation(actual, expected, label) {
  const s = actual.states.findIndex((x, i) => x !== expected.states[i]);
  assert.equal(s, -1, `${label}: estado diverge no tick ${s} da continuação`);
  const e = actual.events.findIndex((x, i) => x !== expected.events[i]);
  assert.equal(e, -1, `${label}: eventos divergem no tick ${e} da continuação`);
}

const killAll = (actors) => {
  for (const e of actors) {
    e.alive = false;
    e.state = 'DEAD';
    e.health = 0;
  }
};

const withoutId = ({ checkpointId: _id, ...rest }) => rest;
const storedRecord = (storage) => JSON.parse(storage.getItem(M02_SAVE_STORAGE_KEY));

// ---------------------------------------------------------------------------------------------------------------------
describe('M02-13 — 1: dois checkpoints automáticos no mesmo tick (C01: quinta limpa enquanto o posto EA0 resiste)', () => {
  for (const variant of ['COMPLETE', 'C04']) {
    it(`caminho ${variant}: cp_a e cp_b gravados no mesmo tick são ambos iguais ao estado do fim do tick e restauram-se sem divergir`, () => {
      const storage = createMemoryStorage();
      const sim = new M02BenchSimulation(SEED, { storage, startScene: 'C01' });
      for (let i = 0; i < 10; i++) sim.tick(DT, {});
      sim.drainEvents();
      const farm = sim.enemies.filter((e) => e.encounterId !== 'EA0');
      if (variant === 'COMPLETE') {
        killAll(farm);
      } else {
        const c04 = farm.find((e) => e.c04Candidate);
        killAll(farm.filter((e) => e !== c04));
        c04.state = 'WOUNDED_UNARMED';
        c04.nonCombatant = true;
        c04.health = 30;
      }
      // O posto EA0 resiste no tick do gatilho: a quinta fica limpa e os defensores do posto rendem-se no mesmo tick.
      sim.tick(DT, {});
      const saved = sim.drainEvents().filter((e) => e.type === 'checkpoint-saved');
      assert.deepEqual(
        saved.map((e) => e.checkpointId),
        ['cp_m02_a_preparacao', 'cp_m02_b_acesso'],
        'o gatilho produz dois checkpoints automáticos no mesmo tick',
      );
      assert.ok(saved.every((e) => e.persisted));

      const live = sim.snapshot();
      for (const id of ['cp_m02_a_preparacao', 'cp_m02_b_acesso']) {
        assert.equal(
          canonical(withoutId(sim.checkpoints.get(id))),
          canonical(live),
          `${id}: o snapshot gravado é o estado do fim do tick (inclui os dois ids em checkpointsReached)`,
        );
      }
      assert.deepEqual(live.checkpointsReached.slice(-2), ['cp_m02_a_preparacao', 'cp_m02_b_acesso']);
      const bBefore = canonical(storedRecord(storage).checkpoints.cp_m02_b_acesso);
      assert.equal(storedRecord(storage).latestCheckpointId, 'cp_m02_b_acesso', 'o último do lote é o «último gravado»');

      const reference = record(sim, walker, 80);
      for (const id of ['cp_m02_a_preparacao', 'cp_m02_b_acesso']) {
        const fresh = new M02BenchSimulation(SEED + 5, { storage: createMemoryStorage() });
        fresh.restoreSnapshot(structuredClone(sim.checkpoints.get(id)));
        fresh.drainEvents();
        assertSameContinuation(record(fresh, walker, 80), reference, `${id} · sim novo`);
        const page = new M02BenchSimulation(SEED + 9, { storage });
        page.restorePersistedCheckpoint(id);
        page.drainEvents();
        assertSameContinuation(record(page, walker, 80), reference, `${id} · cópia persistida`);
      }
      // Restaurar cp_a e continuar não regrava cp_b (antes regravava-o com outro relógio).
      assert.equal(canonical(storedRecord(storage).checkpoints.cp_m02_b_acesso), bBefore, 'cp_b na loja ficou intacto');
    });
  }

  it('API: updateTacticalContext() fora de tick() também grava o lote com todos os ids marcados', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage, startScene: 'C01' });
    for (let i = 0; i < 10; i++) sim.tick(DT, {});
    killAll(sim.enemies);
    sim.drainEvents();
    sim.updateTacticalContext();
    const saved = sim.drainEvents().filter((e) => e.type === 'checkpoint-saved');
    assert.deepEqual(saved.map((e) => e.checkpointId), ['cp_m02_a_preparacao', 'cp_m02_b_acesso']);
    assert.equal(canonical(withoutId(sim.checkpoints.get('cp_m02_a_preparacao'))), canonical(sim.snapshot()));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('M02-13 — 2: checkpoint automático só no fim de uma ação composta de API (não a meio)', () => {
  const areaCWalker = (_sim, t) => ({ forward: t % 40 < 25 ? 1 : 0, fire: t % 17 === 4 });
  const actions = [
    ['completeC12Epilogue() a partir de C09 (KeyM / btn-c12-epilogue)', (s) => s.completeC12Epilogue(), { c12: true, lis: 'wounded_evacuated' }],
    ['assistLisInC11("wounded_walking") antes de C10', (s) => s.assistLisInC11('wounded_walking'), { c12: false, lis: 'wounded_walking' }],
    [
      'startC10OrderChanges + detonateC10FixedArtillery + assistLisInC11 em runAtomicAction (Digit9 / btn-c10-c11-lis)',
      (s) =>
        s.runAtomicAction(() => {
          s.startC10OrderChanges();
          s.detonateC10FixedArtillery();
          s.assistLisInC11('wounded_evacuated');
        }),
      { c12: false, lis: 'wounded_evacuated' },
    ],
  ];
  for (const [label, act, expected] of actions) {
    it(`${label}: cp_d gravado no fim da ação; F9 após recarregar reproduz a continuação`, () => {
      const storage = createMemoryStorage();
      const sim = new M02BenchSimulation(SEED, { storage });
      sim.enterAreaCC09();
      record(sim, areaCWalker, 20);
      sim.drainEvents();
      act(sim);
      const saved = sim.drainEvents().filter((e) => e.type === 'checkpoint-saved');
      assert.deepEqual(saved.map((e) => e.checkpointId), ['cp_m02_d_cobertura_retirada'], 'um único cp_d, gravado pela ação');
      assert.ok(saved[0].persisted);
      const cp = structuredClone(sim.checkpoints.get('cp_m02_d_cobertura_retirada'));
      assert.equal(canonical(withoutId(cp)), canonical(sim.snapshot()), 'cp_d é o estado do fim da ação, não o de a meio');
      assert.equal(cp.areaC.artilleryDetonated, true);
      assert.equal(cp.areaC.c12Completed, expected.c12);
      assert.equal(cp.flags['m02.lis_status'], expected.lis);

      const reference = record(sim, areaCWalker, 60);
      const page = new M02BenchSimulation(SEED + 1, { storage });
      assert.deepEqual(page.quickLoadCheckpoint(), { checkpointId: 'cp_m02_d_cobertura_retirada', source: 'store' });
      page.drainEvents();
      assert.equal(page.areaC.c12Completed, expected.c12, 'recarregar + F9 não volta a C10 sem a ação');
      assertSameContinuation(record(page, areaCWalker, 60), reference, `${label} · F9 da loja`);
    });
  }

  it('dentro de tick() a ação continua a pedir o checkpoint para o fim do tick (assistLisInC11 por proximidade)', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.enterAreaCC09();
    killAll(sim.enemies.filter((e) => e.encounterId === 'EC1'));
    sim.areaC.gateLatchUnlocked = true;
    sim.drainEvents();
    let saved = [];
    for (let t = 0; t < 400 && !saved.length; t++) {
      sim.tick(DT, {});
      saved = sim.drainEvents().filter((e) => e.type === 'checkpoint-saved');
    }
    assert.deepEqual(saved.map((e) => e.checkpointId), ['cp_m02_d_cobertura_retirada']);
    assert.equal(canonical(withoutId(sim.checkpoints.get('cp_m02_d_cobertura_retirada'))), canonical(sim.snapshot()));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('M02-13 — 3: -0 não chega ao atan2 (estado vivo e restaurado coincidem)', () => {
  /** Inimigo de fuzil em (x, +0) virado para oeste, jogador a `d` m a oeste; sem tocar no relógio. */
  function setup(x, d, playerZ, { needLineOfSight }) {
    const sim = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    for (let i = 0; i < 5; i++) sim.tick(DT, {});
    const e = sim.enemies.find((a) => a.alive && a.weapon !== 'mg34' && !a.c04Candidate);
    Object.assign(e, { x, z: 0, y: sim.world.heightAt(x, 0), facing: Math.PI, memory: null, seeingTargetId: null, goal: null });
    sim.teleportPlayer(x - d, playerZ, 0, 0);
    const los = sim.world.lineOfSight(e, sim.player, { includeFoliage: true });
    return los === needLineOfSight ? { sim, enemy: e } : null;
  }

  it('memória de som (jogador em z = -0,001): x/y/z da memória nunca são -0 e o restauro repete 200 ticks sem divergir', () => {
    const { sim, enemy } = setup(22, 8, -0.001, { needLineOfSight: false });
    sim.tick(DT, { fire: true }); // o disparo alerta o inimigo sem linha de vista: memória de áudio
    assert.equal(enemy.memory?.source, 'audio');
    for (const k of ['x', 'y', 'z']) assert.equal(Object.is(enemy.memory[k], -0), false, `memory.${k} não é -0`);
    sim.saveCheckpoint('cp_m02_manual');
    sim.drainEvents();
    const snap = structuredClone(sim.checkpoints.get('cp_m02_manual'));
    const reference = record(sim, idle, 200);
    const fresh = new M02BenchSimulation(SEED + 1, { storage: createMemoryStorage() });
    fresh.restoreSnapshot(snap);
    fresh.drainEvents();
    assertSameContinuation(record(fresh, idle, 200), reference, 'memória de som');
  });

  it('memória visual de um alvo em z = -0,001: não guarda -0 e o facing do inimigo não depende do sinal do zero', () => {
    const { sim, enemy } = setup(-60, 14, -0.001, { needLineOfSight: true });
    sim.tick(DT, {});
    assert.equal(enemy.seeingTargetId, 'piotr_sokol');
    for (const k of ['x', 'y', 'z']) assert.equal(Object.is(enemy.memory[k], -0), false, `memory.${k} não é -0`);
  });

  it('jogador em z = -0 exato à vista: o facing do inimigo ao vivo e depois de restaurar é o mesmo (+π, não -π)', () => {
    const { sim, enemy } = setup(-60, 14, -0, { needLineOfSight: true });
    assert.equal(Object.is(sim.player.z, -0), true, 'a construção deixa o jogador em z = -0');
    sim.tick(DT, {});
    assert.equal(enemy.seeingTargetId, 'piotr_sokol');
    sim.saveCheckpoint('cp_m02_manual');
    sim.drainEvents();
    const snap = structuredClone(sim.checkpoints.get('cp_m02_manual'));
    const reference = record(sim, idle, 40);
    const fresh = new M02BenchSimulation(SEED + 1, { storage: createMemoryStorage() });
    fresh.restoreSnapshot(snap);
    fresh.drainEvents();
    assertSameContinuation(record(fresh, idle, 40), reference, 'jogador em z = -0');
  });
});
