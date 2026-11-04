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
