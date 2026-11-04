// M02-FIX-2 · SAVE-01 / SAVE-02 / PDF I2 + I5: restauro determinístico, schema v2 do snapshot e checkpoints persistentes.
// Teste de estado (não é playtest): prova que a continuação depois de um restauro é igual tick a tick à continuação original.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  M02SaveStore,
  M02_SAVE_STORAGE_KEY,
  M02_SNAPSHOT_SCHEMA,
  M02_SNAPSHOT_SCHEMA_VERSION,
  M02_LEGACY_SNAPSHOT_SCHEMA_V1,
  M02_RNG_ALGORITHM,
  createMemoryStorage,
  detectBrowserStorage,
} from '../src/game/m02-save-store.js';

const DT = 0.05;
const PREFIX_TICKS = 160; // 8 s antes do snapshot (inclui uma granada ainda em voo no momento do snapshot)
const CONTINUATION_TICKS = 240; // 12 s comparados tick a tick depois do snapshot
const SEEDS = [19390909, 19390913];
const ROUTES = Object.freeze({
  vala: Object.freeze([
    [-45, -70],
    [-45, -30],
    [-45, -5],
    [-24, 0],
  ]),
  pomar: Object.freeze([
    [43, -55],
    [43, -10],
    [43, 27],
    [8, 42],
  ]),
});

// Campos do objeto da simulação que não são estado de jogo: mundo e navegador (derivados; o estado do mundo entra abaixo),
// streamer (métricas), loja e índice de checkpoints (meta-estado de save), fila de eventos (comparada à parte, por tick),
// resultado da última persistência, dica do renderer (nunca lida pela simulação) e configuração do construtor.
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

function canonical(value) {
  return JSON.stringify(value, function replacer(_key, v) {
    if (typeof v === 'number') {
      if (Object.is(v, -0)) return '#-0';
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

const ownFields = (obj) => Object.fromEntries(Object.keys(obj).map((k) => [k, obj[k]]));

/**
 * Estado vivo completo, lido diretamente dos objetos (não do snapshot): todos os campos próprios da simulação e dos
 * diretores, o estado do mundo e o estado do gerador. Um campo novo que `tick()` mute e que falte no snapshot aparece aqui
 * como divergência depois do restauro.
 */
function liveState(sim) {
  const top = {};
  for (const key of Object.keys(sim).sort()) {
    if (NON_STATE_SIM_KEYS.has(key)) continue;
    const v = sim[key];
    if (['dialogue', 'horizon', 'audiovisual', 'weapon', 'rng'].includes(key)) top[key] = ownFields(v);
    else top[key] = v;
  }
  top.worldState = {
    cellId: sim.activeCellId,
    streamerCellId: sim.zoneStreamer.activeCellId,
    revision: sim.world.revision,
    doors: sim.world.doorStates,
    windows: sim.world.windowStates,
    fences: sim.world.fenceStates,
    exteriorCoverIds: (sim.world.layout.exteriorCovers ?? []).map((c) => c.id),
  };
  return top;
}

function digest(sim, tickEvents) {
  return createHash('sha256').update(canonical({ state: liveState(sim), events: tickEvents })).digest('hex');
}

function normalizeAngle(a) {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Piloto determinístico por rota: segue os waypoints, dispara, recarrega, lança uma granada e dá ordens à secção. */
function makeDriver(routeId) {
  const waypoints = ROUTES[routeId];
  let wp = 0;
  return (sim, tickIndex) => {
    while (wp < waypoints.length && Math.hypot(waypoints[wp][0] - sim.player.x, waypoints[wp][1] - sim.player.z) <= 1.2) wp++;
    const controls = {};
    if (wp < waypoints.length) {
      const [tx, tz] = waypoints[wp];
      controls.lookX = normalizeAngle(Math.atan2(tz - sim.player.z, tx - sim.player.x) - sim.player.angle);
      controls.forward = 1;
      controls.sprint = tickIndex % 60 < 40;
    }
    if (tickIndex % 23 === 11) controls.fire = true;
    if (tickIndex % 97 === 50) controls.reload = true;
    if (tickIndex === 30) controls[routeId === 'pomar' ? 'orderFlank' : 'orderSuppress'] = true;
    if (tickIndex === 150) controls.grenade = true; // fusível de 2 s: ainda em voo no snapshot (tick 160)
    if (tickIndex === 200) controls.orderAdvance = true;
    if (tickIndex === 260 || tickIndex === 300) controls.crouch = true;
    if (tickIndex % 41 === 7) controls.interact = true;
    return controls;
  };
}

/** Corre `count` ticks com o piloto, gravando as entradas e o digest de cada tick. */
function runRecording(sim, driver, startTick, count) {
  const inputs = [];
  const digests = [];
  for (let i = 0; i < count; i++) {
    const controls = driver(sim, startTick + i);
    inputs.push(structuredClone(controls));
    sim.tick(DT, controls);
    digests.push(digest(sim, sim.drainEvents()));
  }
  return { inputs, digests };
}

/** Repete entradas gravadas e devolve o digest de cada tick. */
function replay(sim, inputs) {
  return inputs.map((controls) => {
    sim.tick(DT, structuredClone(controls));
    return digest(sim, sim.drainEvents());
  });
}

function assertSameTrajectory(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: número de ticks`);
  const first = actual.findIndex((d, i) => d !== expected[i]);
  assert.equal(first, -1, `${label}: diverge no tick ${first} depois do restauro`);
}

/** Prepara um cenário: prefixo gravado, checkpoint, continuação gravada (referência). */
function buildScenario(routeId, seed) {
  const storage = createMemoryStorage();
  const sim = new M02BenchSimulation(seed, { storage });
  sim.drainEvents();
  const driver = makeDriver(routeId);
  const prefix = runRecording(sim, driver, 0, PREFIX_TICKS);
  const snap = sim.saveCheckpoint('cp_fix2_test');
  assert.equal(sim.lastCheckpointPersist.ok, true, `persistência do checkpoint: ${sim.lastCheckpointPersist.reason}`);
  sim.drainEvents();
  const rngAtSnapshot = sim.rng.state;
  const continuation = runRecording(sim, driver, PREFIX_TICKS, CONTINUATION_TICKS);
  return { sim, storage, snap, prefix, continuation, rngAtSnapshot };
}

describe('M02-09 — SAVE-01: restauro determinístico com semente e estado do gerador (schema v2)', () => {
  for (const routeId of Object.keys(ROUTES)) {
    for (const seed of SEEDS) {
      it(`rota ${routeId} · semente ${seed}: continuação restaurada é igual tick a tick (sim novo, mesmo sim, save persistido)`, () => {
        const { sim, storage, snap, continuation, rngAtSnapshot } = buildScenario(routeId, seed);

        // O cenário tem de exercitar o que o restauro tem de repor; senão a igualdade seria vazia.
        assert.equal(snap.grenades.length, 1, 'uma granada em voo no momento do snapshot');
        assert.equal(snap.rng.seed, seed);
        assert.equal(snap.rng.state, rngAtSnapshot);
        assert.notEqual(sim.rng.state, rngAtSnapshot, 'a continuação consome o gerador (tiros da secção)');
        assert.equal(sim.grenades.length, 0, 'a granada do snapshot explodiu durante a continuação');

        // 1) Simulação nova, construída com OUTRA semente: a semente e o estado do gerador vêm do snapshot.
        const fresh = new M02BenchSimulation(seed + 777);
        fresh.restoreSnapshot(snap);
        fresh.drainEvents();
        assert.equal(fresh.seed, seed);
        assert.equal(fresh.rng.state, rngAtSnapshot);
        assertSameTrajectory(replay(fresh, continuation.inputs), continuation.digests, 'sim novo');

        // 2) Mesmo sim, depois de divergir (já correu a continuação inteira) e com o gerador consumido entre snapshot e restauro.
        for (let i = 0; i < 1000; i++) sim.rng.next();
        sim.restoreCheckpoint('cp_fix2_test');
        sim.drainEvents();
        assert.equal(sim.rng.state, rngAtSnapshot, 'o restauro repõe o estado do gerador');
        assertSameTrajectory(replay(sim, continuation.inputs), continuation.digests, 'mesmo sim');

        // 3) Save persistido (ida e volta em JSON pelo armazenamento) lido por uma simulação nova.
        const reloaded = new M02BenchSimulation(seed + 1, { storage });
        assert.equal(reloaded.checkpoints.has('cp_fix2_test'), false, 'não está no índice em memória do sim novo');
        reloaded.restoreCheckpoint('cp_fix2_test');
        reloaded.drainEvents();
        assertSameTrajectory(replay(reloaded, continuation.inputs), continuation.digests, 'save persistido');
      });
    }
  }

  it('controlo negativo: sem repor o gerador (comportamento v1), a continuação diverge — o teste deteta a falta', () => {
    const { snap, continuation } = buildScenario('vala', SEEDS[0]);
    const sim = new M02BenchSimulation(SEEDS[0]);
    sim.restoreSnapshot(snap);
    sim.drainEvents();
    sim.rng.state = (snap.rng.state ^ 0x5bd1e995) >>> 0; // como no v1: gerador fora do snapshot
    const digests = replay(sim, continuation.inputs);
    assert.ok(
      digests.some((d, i) => d !== continuation.digests[i]),
      'com o gerador errado a trajetória tem de divergir; caso contrário o cenário não exercita o RNG',
    );
  });

  it('mesma semente e mesmas entradas → mesmo estado em cada tick; semente diferente → trajetória diferente', () => {
    for (const routeId of Object.keys(ROUTES)) {
      const a = new M02BenchSimulation(SEEDS[0]);
      a.drainEvents();
      const recA = runRecording(a, makeDriver(routeId), 0, PREFIX_TICKS + 80);
      const b = new M02BenchSimulation(SEEDS[0]);
      b.drainEvents();
      assertSameTrajectory(replay(b, recA.inputs), recA.digests, `rota ${routeId}, mesma semente`);
      const c = new M02BenchSimulation(SEEDS[1]);
      c.drainEvents();
      const other = replay(c, recA.inputs);
      assert.ok(other.some((d, i) => d !== recA.digests[i]), `rota ${routeId}: a semente tem efeito observável`);
    }
  });
});

describe('M02-09 — schema v2 e validação em fases (PDF I5)', () => {
  it('snapshot v2 traz missão, versão, semente, estado do gerador, data narrativa e versão do layout', () => {
    const sim = new M02BenchSimulation(19390911);
    const snap = sim.snapshot();
    assert.equal(snap.schema, M02_SNAPSHOT_SCHEMA);
    assert.equal(snap.schemaVersion, M02_SNAPSHOT_SCHEMA_VERSION);
    assert.equal(snap.missionId, 'M02');
    assert.deepEqual(snap.rng, { algorithm: M02_RNG_ALGORITHM, seed: 19390911, state: sim.rng.state });
    assert.deepEqual(snap.narrative, {
      temporalState: 'T0',
      narrativeDate: '1939-09-09',
      dayPart: 'fim da tarde',
      civilTime: null,
    });
    assert.deepEqual(snap.world, { cellId: 'A', layoutSchema: 'm02-01-quinta-bench-v1', revision: sim.world.revision });
    for (const key of ['grenades', 'grenadeSeq', 'doorLocks', 'checkpointsReached', 'combatLog', 'shotLog']) {
      assert.ok(key in snap, `snapshot v2 inclui ${key}`);
    }
    assert.ok('spatialAudioLog' in snap.audiovisual && 'directionalIndicators' in snap.audiovisual);
    assert.equal(validateM02Snapshot(snap).valid, true);
    assert.equal(validateM02Snapshot(JSON.parse(JSON.stringify(snap))).valid, true, 'sobrevive a JSON');

    sim.triggerTransitionTAB({ skip: true });
    assert.equal(sim.snapshot().narrative.narrativeDate, '1939-09-09');
    assert.equal(sim.snapshot().narrative.temporalState, 'T1');
  });

  it('snapshot v1 (sem rng) é rejeitado com erro explícito, sem migração', () => {
    const sim = new M02BenchSimulation();
    const legacy = sim.snapshot();
    legacy.schema = M02_LEGACY_SNAPSHOT_SCHEMA_V1;
    delete legacy.schemaVersion;
    delete legacy.rng;
    const res = validateM02Snapshot(legacy);
    assert.equal(res.valid, false);
    assert.match(res.reason, /v1/);
    assert.match(res.reason, /rng/);
    assert.throws(() => sim.restoreSnapshot(legacy), /Snapshot M02 inválido: .*v1/);

    const noRng = sim.snapshot();
    delete noRng.rng;
    assert.match(validateM02Snapshot(noRng).reason, /gerador \(rng\)/);
  });

  it('rejeita IDs inexistentes, estados em falta, layout incompatível, data narrativa incoerente, NaN e relações quebradas', () => {
    const sim = new M02BenchSimulation();
    const cases = [
      [(s) => { s.doors.door_inexistente = 'open'; }, /inexistente/],
      [(s) => { delete s.doors.door_b01_east_main; }, /em falta/],
      [(s) => { s.windows.win_b01_east_hall = 'stained'; }, /janela inválido/],
      [(s) => { s.world.layoutSchema = 'm02-01-quinta-bench-v0'; }, /Save incompatível/],
      [(s) => { s.world.cellId = 'B'; }, /world/],
      [(s) => { s.narrative.narrativeDate = '1939-09-13'; }, /narrativa/],
      [(s) => { s.player.x = Number.NaN; }, /não finito/],
      [(s) => { s.rng.state = -1; }, /gerador/],
      [(s) => { s.rng.algorithm = 'mulberry32'; }, /gerador/],
      [(s) => { s.allies[1].id = s.allies[0].id; }, /duplicado/],
      [(s) => { s.weapon.state = 'JAMMED'; }, /arma/],
      [(s) => { s.flags['m02.axis'] = 'north'; }, /m02\.axis/],
      [(s) => { s.transitionIdsApplied = ['TR01', 'TR01']; }, /repetições/],
      [(s) => { s.doorLocks.door_fantasma = { actorId: 'pl_lis', expiresAt: 1 }; }, /Fechadura/],
      [(s) => { s.grenades = [{ id: 'gren_1', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, fuseAt: 1, exploded: true }]; }, /Granada/],
      [(s) => { s.areaB.supplyCart.volumes[0].carriedBy = 'pl_fantasma'; }, /Portador inexistente/],
      [(s) => { s.areaB.supplyCart.volumes[0].carriedBy = 'piotr_sokol'; }, /jogador inconsistente/],
    ];
    for (const [mutate, pattern] of cases) {
      const bad = sim.snapshot();
      mutate(bad);
      const res = validateM02Snapshot(bad);
      assert.equal(res.valid, false, `deveria rejeitar: ${pattern}`);
      assert.match(res.reason, pattern);
    }
  });

  it('restauro inválido não toca no estado vivo; falha na ativação repõe o estado anterior', () => {
    const sim = new M02BenchSimulation(19390909);
    for (let i = 0; i < 40; i++) sim.tick(DT, { forward: 1 });
    sim.drainEvents();
    const before = digest(sim, []);

    const bad = sim.snapshot();
    bad.enemies[0].x = 'longe';
    assert.throws(() => sim.restoreSnapshot(bad), /Snapshot M02 inválido/);
    assert.equal(digest(sim, []), before, 'fase 1 (validação) falhou sem mutar nada');

    const older = new M02BenchSimulation(19390910).snapshot();
    const originalRestore = sim.audiovisual.restore;
    let calls = 0;
    sim.audiovisual.restore = function failingOnce(s) {
      calls++;
      if (calls === 1) throw new Error('falha simulada na ativação');
      return originalRestore.call(this, s);
    };
    assert.throws(() => sim.restoreSnapshot(older), /estado anterior foi reposto: falha simulada/);
    sim.audiovisual.restore = originalRestore;
    assert.equal(digest(sim, []), before, 'a ativação falhada não deixa estado meio restaurado');
  });

  it('checkpoint restaurado volta a gravar os checkpoints seguintes da linha temporal (cp_m02_b não fica preso ao ramo descartado)', () => {
    const sim = new M02BenchSimulation(19390909);
    assert.deepEqual(sim.checkpointsReached, ['cp_m02_a_preparacao']);
    for (const e of sim.enemies) {
      e.alive = false;
      e.state = 'DEAD';
    }
    sim.tick(DT, {});
    assert.ok(sim.checkpointsReached.includes('cp_m02_b_acesso'));
    const firstB = sim.checkpoints.get('cp_m02_b_acesso');

    sim.restoreCheckpoint('cp_m02_a_preparacao');
    assert.deepEqual(sim.checkpointsReached, ['cp_m02_a_preparacao']);
    for (let i = 0; i < 5; i++) sim.tick(DT, { forward: 1 });
    for (const e of sim.enemies) {
      e.alive = false;
      e.state = 'DEAD';
    }
    sim.drainEvents();
    sim.tick(DT, {});
    const saved = sim.drainEvents().filter((e) => e.type === 'checkpoint-saved');
    assert.deepEqual(saved.map((e) => e.checkpointId), ['cp_m02_b_acesso']);
    assert.notEqual(sim.checkpoints.get('cp_m02_b_acesso'), firstB, 'o cp_m02_b do ramo novo substitui o antigo');
  });
});

/** Armazenamento falso configurável: falha de escrita (quota) ou de leitura (bloqueio do browser). */
function fakeStorage({ failSet = null, failGet = false } = {}) {
  const map = new Map();
  const log = [];
  return {
    map,
    log,
    getItem(key) {
      log.push(['get', key]);
      if (failGet) throw new Error('SecurityError: leitura bloqueada');
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      log.push(['set', key]);
      if (failSet && failSet(key)) throw new Error('QuotaExceededError: escrita recusada');
      map.set(key, String(value));
    },
    removeItem(key) {
      log.push(['remove', key]);
      map.delete(key);
    },
  };
}

describe('M02-09 — SAVE-02: checkpoints persistidos com escrita atómica (M02SaveStore)', () => {
  const KEY = M02_SAVE_STORAGE_KEY;

  it('chave com namespace, staging → validação → promoção, e o save anterior fica em :previous', () => {
    assert.equal(KEY, 'cod-guerra:m02:bench:v2');
    const storage = fakeStorage();
    const sim = new M02BenchSimulation(19390909, { storage });
    assert.equal(sim.lastCheckpointPersist.ok, true);
    const afterA = storage.map.get(KEY);
    assert.ok(afterA, 'cp_m02_a_preparacao persistido no arranque');
    assert.equal(storage.map.has(`${KEY}:staging`), false, 'staging removido depois da promoção');

    const order = storage.log.filter(([op]) => op === 'set').map(([, k]) => k);
    assert.deepEqual(order, [`${KEY}:staging`, KEY], 'primeira gravação: staging e só depois current');

    sim.teleportPlayer(-23, -12, 0);
    sim.saveCheckpoint('cp_m02_manual');
    assert.equal(sim.lastCheckpointPersist.ok, true);
    assert.equal(storage.map.get(`${KEY}:previous`), afterA, 'o current confirmado anterior passa a previous');
    const current = JSON.parse(storage.map.get(KEY));
    assert.equal(current.latestCheckpointId, 'cp_m02_manual');
    assert.deepEqual(Object.keys(current.checkpoints).sort(), ['cp_m02_a_preparacao', 'cp_m02_manual']);
    assert.equal(current.seq, 2);

    const store = new M02SaveStore({ storage, validateSnapshot: validateM02Snapshot });
    assert.equal(store.latestCheckpointId(), 'cp_m02_manual');
    assert.equal(store.loadCheckpoint('cp_m02_manual').player.x, -23);
  });

  it('JSON corrompido em current: lê previous, não apaga nada, e a gravação seguinte não estraga o save bom', () => {
    const storage = fakeStorage();
    const sim = new M02BenchSimulation(19390909, { storage });
    sim.saveCheckpoint('cp_m02_manual');
    const goodPrevious = storage.map.get(`${KEY}:previous`);
    storage.map.set(KEY, '{"format":"cod-guerra-m02-bench-save", "checkpoints": {');

    const store = new M02SaveStore({ storage, validateSnapshot: validateM02Snapshot });
    const loaded = store.load();
    assert.equal(loaded.ok, true);
    assert.equal(loaded.source, 'previous');
    assert.match(loaded.rejected[0].reason, /corrompido em current/);
    assert.equal(storage.map.get(KEY).startsWith('{"format"'), true, 'leitura não apaga o slot corrompido');

    const res = store.commitCheckpoint('cp_m02_x', { ...sim.snapshot(), checkpointId: 'cp_m02_x' });
    assert.equal(res.ok, true);
    assert.equal(storage.map.get(`${KEY}:previous`), goodPrevious, 'previous bom não é substituído por current corrompido');
    const rebuilt = JSON.parse(storage.map.get(KEY));
    assert.deepEqual(Object.keys(rebuilt.checkpoints).sort(), ['cp_m02_a_preparacao', 'cp_m02_x']);
  });

  it('registo bem formado mas inválido (snapshot v1, outra missão) é rejeitado e o save bom mantém-se', () => {
    const storage = fakeStorage();
    new M02BenchSimulation(19390909, { storage });
    const good = storage.map.get(KEY);
    const tampered = JSON.parse(good);
    tampered.checkpoints.cp_m02_a_preparacao.schema = M02_LEGACY_SNAPSHOT_SCHEMA_V1;
    storage.map.set(`${KEY}:previous`, good);
    storage.map.set(KEY, JSON.stringify(tampered));
    const store = new M02SaveStore({ storage, validateSnapshot: validateM02Snapshot });
    const loaded = store.load();
    assert.equal(loaded.source, 'previous');
    assert.match(loaded.rejected[0].reason, /v1/);

    storage.map.set(KEY, JSON.stringify({ ...JSON.parse(good), missionId: 'M01' }));
    assert.equal(store.load().source, 'previous');
  });

  it('armazenamento que lança na escrita: saveCheckpoint não interrompe a simulação e o save anterior fica intacto', () => {
    let refuse = false;
    const storage = fakeStorage({ failSet: () => refuse });
    const sim = new M02BenchSimulation(19390909, { storage });
    const before = storage.map.get(KEY);
    refuse = true;
    sim.drainEvents();
    const snap = sim.saveCheckpoint('cp_m02_manual');
    assert.ok(snap, 'o checkpoint em memória existe na mesma');
    assert.equal(sim.lastCheckpointPersist.ok, false);
    assert.match(sim.lastCheckpointPersist.reason, /QuotaExceededError/);
    const evt = sim.drainEvents().find((e) => e.type === 'checkpoint-saved');
    assert.equal(evt.persisted, false);
    assert.equal(storage.map.get(KEY), before, 'current intacto');
    assert.equal(storage.map.has(`${KEY}:staging`), false);
    sim.restoreCheckpoint('cp_m02_manual');
    sim.tick(DT, {});
  });

  it('falha só na promoção (quota no slot current) mantém current e previous coerentes', () => {
    const storage = fakeStorage();
    const sim = new M02BenchSimulation(19390909, { storage });
    const before = storage.map.get(KEY);
    const store = new M02SaveStore({ storage, validateSnapshot: validateM02Snapshot });
    const failing = new M02SaveStore({
      storage: { ...storage, setItem: (k, v) => { if (k === KEY) throw new Error('QuotaExceededError'); storage.setItem(k, v); } },
      validateSnapshot: validateM02Snapshot,
    });
    const res = failing.commitCheckpoint('cp_m02_manual', { ...sim.snapshot(), checkpointId: 'cp_m02_manual' });
    assert.equal(res.ok, false);
    assert.equal(storage.map.get(KEY), before);
    assert.equal(store.load().source, 'current');
    assert.equal(store.latestCheckpointId(), 'cp_m02_a_preparacao');
  });

  it('escrita truncada em silêncio é detetada na releitura do staging e não é promovida', () => {
    const storage = fakeStorage();
    new M02BenchSimulation(19390909, { storage });
    const before = storage.map.get(KEY);
    const truncating = {
      getItem: (k) => storage.getItem(k),
      setItem: (k, v) => storage.map.set(k, String(v).slice(0, 100)),
      removeItem: (k) => storage.removeItem(k),
    };
    const sim = new M02BenchSimulation(19390909, { storage: truncating });
    assert.equal(sim.lastCheckpointPersist.ok, false);
    assert.match(sim.lastCheckpointPersist.reason, /não coincide/);
    assert.equal(storage.map.get(KEY), before);
    assert.equal(storage.map.has(`${KEY}:staging`), false);
  });

  it('armazenamento que lança na leitura: load devolve erro sem lançar e o índice em memória continua a funcionar', () => {
    const storage = fakeStorage({ failGet: true });
    const sim = new M02BenchSimulation(19390909, { storage });
    assert.equal(sim.lastCheckpointPersist.ok, false);
    const store = new M02SaveStore({ storage, validateSnapshot: validateM02Snapshot });
    const loaded = store.load();
    assert.equal(loaded.ok, false);
    assert.match(loaded.reason, /Leitura do armazenamento falhou/);
    assert.equal(store.loadCheckpoint('cp_m02_a_preparacao'), null);
    sim.restoreCheckpoint('cp_m02_a_preparacao');
    assert.throws(() => sim.restoreCheckpoint('cp_inexistente'), /não encontrado/);
  });

  it('em Node a loja por omissão usa memória isolada por simulação; restorePersistedCheckpoint usa a cópia gravada', () => {
    assert.equal(detectBrowserStorage(), null);
    const a = new M02BenchSimulation(19390909);
    const b = new M02BenchSimulation(19390909);
    a.saveCheckpoint('cp_m02_manual');
    assert.equal(b.saveStore.loadCheckpoint('cp_m02_manual'), null, 'sem fugas entre simulações');

    const shared = createMemoryStorage();
    const writer = new M02BenchSimulation(19390909, { storage: shared });
    writer.teleportPlayer(-25, -14, Math.PI / 2);
    writer.saveCheckpoint('cp_m02_manual');
    const reader = new M02BenchSimulation(19390909, { storage: shared });
    // O construtor do leitor gravou cp_m02_a_preparacao; o último é esse, mas o manual continua disponível.
    assert.equal(reader.saveStore.latestCheckpointId(), 'cp_m02_a_preparacao');
    reader.checkpoints.delete('cp_m02_manual');
    reader.restorePersistedCheckpoint('cp_m02_manual');
    assert.equal(reader.player.x, -25);
    assert.ok(shared.keys().length > 0 && shared.keys().every((k) => k.startsWith(KEY)), 'só chaves com namespace');
  });
});
