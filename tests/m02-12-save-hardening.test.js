// M02-FIX-2b · endurecimento do save/restauro depois da revisão adversarial (provas p01–p16 da revisão independente).
// Teste de estado (não é playtest): cada caso reproduz um defeito confirmado por execução e prova que deixou de ocorrer.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage, M02SaveStore, M02_SAVE_STORAGE_KEY } from '../src/game/m02-save-store.js';

const DT = 0.05;
const SEED = 19390909;

/**
 * JSON estável com Map/Set ordenados. `-0` é escrito como 0: o JSON do armazenamento não representa -0 e -0 === 0;
 * uma divergência real de comportamento aparece noutros campos (posição, vida, gerador) e continua a ser detetada.
 */
function canonical(value) {
  return JSON.stringify(value, function replacer(_key, v) {
    if (typeof v === 'number') {
      if (Object.is(v, -0)) return 0;
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

// Como em tests/m02-09: tudo o que é próprio da simulação, menos mundo/navegador derivados, loja, índice, fila de eventos,
// resultado da última persistência, dica do renderer e configuração do construtor.
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

function normalizeAngle(a) {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const ROUTES = Object.freeze({
  vala: [[-45, -70], [-45, -30], [-45, -5], [-24, 0]],
  pomar: [[43, -55], [43, -10], [43, 27], [8, 42]],
  areaC: [[0, -40], [-6, -20], [-20, -10], [-28, -20]],
});

/** Piloto determinístico: segue waypoints, dispara, recarrega e lança uma granada. Só depende do estado da simulação. */
function routeDriver(routeId) {
  const wps = ROUTES[routeId];
  return (sim, t) => {
    let wp = 0;
    while (wp < wps.length && Math.hypot(wps[wp][0] - sim.player.x, wps[wp][1] - sim.player.z) <= 1.2) wp++;
    const c = {};
    if (wp < wps.length) {
      c.lookX = normalizeAngle(Math.atan2(wps[wp][1] - sim.player.z, wps[wp][0] - sim.player.x) - sim.player.angle);
      c.forward = 1;
      c.sprint = t % 60 < 40;
    }
    if (t % 23 === 11) c.fire = true;
    if (t % 97 === 50) c.reload = true;
    if (t % 120 === 30) c.grenade = true;
    return c;
  };
}

/** Corre `count` ticks com o piloto e devolve, por tick, o estado vivo canónico e os eventos. */
function record(sim, driver, from, count) {
  const states = [];
  const events = [];
  for (let t = from; t < from + count; t++) {
    sim.tick(DT, driver(sim, t));
    events.push(canonical(sim.drainEvents()));
    states.push(canonical(liveState(sim)));
  }
  return { states, events };
}

function assertSameContinuation(actual, expected, label) {
  const s = actual.states.findIndex((x, i) => x !== expected.states[i]);
  assert.equal(s, -1, `${label}: estado diverge no tick ${s} da continuação`);
  const e = actual.events.findIndex((x, i) => x !== expected.events[i]);
  assert.equal(e, -1, `${label}: eventos divergem no tick ${e} da continuação`);
}

/**
 * Um tick em que um checkpoint automático é atingido; depois: o snapshot gravado é o estado vivo no fim desse tick, e
 * restaurá-lo (sim novo com outra semente, ou cópia persistida lida por outro sim) e repetir as mesmas entradas reproduz a
 * continuação original tick a tick.
 */
function assertAutoCheckpointReplays(sim, storage, { checkpointId, triggerControls = {}, driver, from, count, label }) {
  // O leitor da cópia persistida é construído antes do tick (como uma página aberta antes do save).
  const reloaded = new M02BenchSimulation(sim.seed + 1, { storage });
  sim.drainEvents();
  sim.tick(DT, triggerControls);
  const saved = sim.drainEvents().filter((e) => e.type === 'checkpoint-saved');
  assert.ok(saved.some((e) => e.checkpointId === checkpointId), `${label}: ${checkpointId} gravado neste tick`);
  assert.ok(saved.every((e) => e.persisted), `${label}: persistido (${saved.map((e) => e.persistError).join(';')})`);
  const snap = structuredClone(sim.checkpoints.get(checkpointId));
  const { checkpointId: _id, ...savedState } = snap;
  assert.equal(canonical(savedState), canonical(sim.snapshot()), `${label}: snapshot gravado = estado no fim do tick`);

  const reference = record(sim, driver, from, count);
  const fresh = new M02BenchSimulation(sim.seed + 777, { storage: createMemoryStorage() });
  fresh.restoreSnapshot(structuredClone(snap));
  fresh.drainEvents();
  assertSameContinuation(record(fresh, driver, from, count), reference, `${label} · sim novo`);
  reloaded.restorePersistedCheckpoint(checkpointId);
  reloaded.drainEvents();
  assertSameContinuation(record(reloaded, driver, from, count), reference, `${label} · cópia persistida`);
  return snap;
}

const nonFiniteActors = (sim) =>
  [sim.player, ...sim.allies, ...sim.enemies].filter((a) => !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.z)).map((a) => a.id);

const nonFiniteVolumes = (sim) =>
  (sim.areaB?.supplyCart?.volumes ?? []).filter((v) => !Number.isFinite(v.x) || !Number.isFinite(v.z)).map((v) => v.id);

const killAll = (actors) => {
  for (const e of actors) {
    e.alive = false;
    e.state = 'DEAD';
    e.health = 0;
  }
};

describe('M02-12 — P0: Áreas B/C sem NaN (limites jogáveis da célula)', () => {
  it('B e C: jogador, aliados e volumes transportados ficam finitos ao andar; limites jogáveis são números', () => {
    const sim = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    sim.enterAreaBC06();
    assert.deepEqual(sim.world.layout.bounds.playable, { minX: -120, maxX: 120, minZ: -140, maxZ: 140 });
    sim.pickupSupplyVolume('vol_water');
    sim.pickupSupplyVolume('vol_ammo', 'pl_malek');
    for (let i = 0; i < 80; i++) {
      sim.tick(DT, { forward: i % 40 < 30 ? 1 : 0, side: i % 20 < 5 ? 1 : 0, lookX: i % 25 === 0 ? 0.4 : 0 });
      assert.deepEqual(nonFiniteActors(sim), [], `B, tick ${i}: atores com posição não finita`);
      assert.deepEqual(nonFiniteVolumes(sim), [], `B, tick ${i}: volumes com posição não finita`);
    }
    sim.saveCheckpoint('cp_m02_manual');
    assert.equal(sim.lastCheckpointPersist.ok, true, sim.lastCheckpointPersist.reason);

    const simC = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    simC.enterAreaCC09();
    assert.deepEqual(simC.world.layout.bounds.playable, { minX: -150, maxX: 150, minZ: -180, maxZ: 180 });
    for (let i = 0; i < 80; i++) {
      simC.tick(DT, { forward: 1, lookX: i % 30 === 0 ? 0.3 : 0 });
      assert.deepEqual(nonFiniteActors(simC), [], `C, tick ${i}: atores com posição não finita`);
    }
    simC.saveCheckpoint('cp_m02_manual');
    assert.equal(simC.lastCheckpointPersist.ok, true, simC.lastCheckpointPersist.reason);
  });

  it('fluxo canónico B→C: cp_m02_c_reorganizacao e cp_m02_d_cobertura_retirada persistem e restauram (de memória e da loja)', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.enterAreaBC06();
    sim.tick(1.0);
    killAll(sim.enemies);
    for (let i = 0; i < 650 && sim.areaB.supplyCart.state !== 'DELIVERED'; i++) sim.tick(0.1);
    assert.equal(sim.areaB.supplyCart.state, 'DELIVERED');
    sim.completeC07Reorganization();
    assert.equal(sim.lastCheckpointPersist.ok, true, `cp_m02_c_reorganizacao: ${sim.lastCheckpointPersist.reason}`);
    sim.enterAreaCC09();
    for (let i = 0; i < 20; i++) sim.tick(0.1, { forward: 1 });
    killAll(sim.enemies);
    sim.unlockC09GateLatch();
    assert.equal(sim.lastCheckpointPersist.ok, true, `cp_m02_d_cobertura_retirada: ${sim.lastCheckpointPersist.reason}`);

    for (const id of ['cp_m02_c_reorganizacao', 'cp_m02_d_cobertura_retirada']) {
      sim.restoreCheckpoint(id);
      assert.deepEqual(nonFiniteActors(sim), []);
      const reloaded = new M02BenchSimulation(SEED + 3, { storage });
      reloaded.restorePersistedCheckpoint(id);
      assert.equal(reloaded.activeCellId, id === 'cp_m02_c_reorganizacao' ? 'B' : 'C');
      for (let i = 0; i < 20; i++) reloaded.tick(DT, { forward: 1 });
      assert.deepEqual(nonFiniteActors(reloaded), [], `${id} restaurado da loja: posições finitas depois de andar`);
    }
  });
});

describe('M02-12 — P1: checkpoints automáticos gravados no fim de tick()', () => {
  for (const routeId of ['vala', 'pomar']) {
    it(`rota ${routeId}: cp_m02_b_acesso pelo caminho C04 (objetivo escrito antes de gravar) reproduz a continuação`, () => {
      const storage = createMemoryStorage();
      const sim = new M02BenchSimulation(SEED, { storage });
      const driver = routeDriver(routeId);
      record(sim, driver, 0, 140);
      const c04 = sim.enemies.find((e) => e.c04Candidate);
      killAll(sim.enemies.filter((e) => e !== c04));
      c04.state = 'WOUNDED_UNARMED';
      c04.nonCombatant = true;
      sim.player.suppressed = 0.6; // o bloco MG do fim do tick muda-o: um save a meio do tick ficava com 0.6
      const snap = assertAutoCheckpointReplays(sim, storage, {
        checkpointId: 'cp_m02_b_acesso',
        driver,
        from: 141,
        count: 80,
        label: `rota ${routeId} / C04`,
      });
      assert.equal(snap.objective.id, 'C04', 'o checkpoint guarda o objetivo C04, não o anterior');
    });
  }

  it('tiro do jogador mata o último defensor: cp_m02_b_acesso depois do áudio do disparo e do resto do tick', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    for (let i = 0; i < 30; i++) sim.tick(DT, {});
    const keep = sim.enemies.find((e) => !e.c04Candidate && e.encounterId !== 'EA0');
    killAll(sim.enemies.filter((e) => e !== keep));
    const p = sim.player;
    keep.x = p.x + 6;
    keep.z = p.z;
    keep.y = sim.world.heightAt(keep.x, keep.z);
    keep.health = 1;
    keep.crouched = false;
    p.angle = 0;
    p.pitch = Math.atan2(keep.y + 1.25 - (p.y + p.eyeHeight), 6);
    const snap = assertAutoCheckpointReplays(sim, storage, {
      checkpointId: 'cp_m02_b_acesso',
      triggerControls: { fire: true },
      driver: routeDriver('vala'),
      from: 31,
      count: 80,
      label: 'último defensor a tiro',
    });
    assert.equal(keep.alive, false);
    assert.equal(snap.objective.id, 'COMPLETE');
  });

  it('C01: limpar o posto EA0 dentro do tick grava cp_m02_a_preparacao no fim do tick', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage, startScene: 'C01' });
    record(sim, routeDriver('vala'), 0, 20);
    killAll(sim.enemies.filter((e) => e.encounterId === 'EA0'));
    const snap = assertAutoCheckpointReplays(sim, storage, {
      checkpointId: 'cp_m02_a_preparacao',
      driver: routeDriver('vala'),
      from: 21,
      count: 80,
      label: 'C01 / EA0',
    });
    assert.equal(snap.c01Active, false);
  });

  it('Área C: cp_m02_d_cobertura_retirada atingido em updateAreaC (C10) reproduz a continuação', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.enterAreaCC09();
    const driver = routeDriver('areaC');
    record(sim, driver, 0, 20);
    killAll(sim.enemies.filter((e) => e.encounterId === 'EC1'));
    sim.areaC.gateLatchUnlocked = true;
    const snap = assertAutoCheckpointReplays(sim, storage, {
      checkpointId: 'cp_m02_d_cobertura_retirada',
      driver,
      from: 21,
      count: 160, // atravessa o impacto fixo de artilharia SP03 (aviso de 6 s) e o arranque de C11
      label: 'Área C / C10',
    });
    assert.equal(snap.objective.id, 'O07');
    assert.equal(snap.areaC.c10Started, true);
    assert.equal(sim.areaC.artilleryDetonated, true, 'a continuação comparada atravessa o impacto SP03');
  });
});

describe('M02-12 — P1: granada que mata o último defensor; índice só com snapshots válidos', () => {
  for (const scene of ['C02', 'C01']) {
    it(`${scene}: o checkpoint atingido pela explosão é válido, persistido e restaurável; a granada não fica no snapshot`, () => {
      const storage = createMemoryStorage();
      const sim = new M02BenchSimulation(SEED, { storage, startScene: scene });
      for (let i = 0; i < 20; i++) sim.tick(DT, {});
      const pool = scene === 'C01' ? sim.enemies.filter((e) => e.encounterId === 'EA0') : sim.enemies;
      const keep = scene === 'C01' ? pool[0] : sim.enemies.find((e) => e.id === 'DE-A05');
      killAll(pool.filter((e) => e !== keep));
      for (const a of sim.allies) {
        a.mag = 0;
        a.reserve = 0; // a secção não dispara: é a granada que mata
      }
      keep.x = scene === 'C01' ? -18 : 0;
      keep.z = scene === 'C01' ? -100 : -50;
      keep.y = sim.world.heightAt(keep.x, keep.z);
      const expectedId = scene === 'C01' ? 'cp_m02_a_preparacao' : 'cp_m02_b_acesso';

      // No instante da explosão (antes do fim do tick) o estado já é gravável: a granada saiu da lista de granadas em voo.
      const atBlast = [];
      const detonate = sim.detonateGrenadeAt.bind(sim);
      sim.detonateGrenadeAt = (...args) => {
        atBlast.push(sim.grenades.map((g) => [g.id, g.exploded]));
        const out = detonate(...args);
        atBlast.push(validateM02Snapshot(sim.snapshot()).reason);
        return out;
      };
      sim.throwGrenade({ x: keep.x, y: keep.y + 1.0, z: keep.z }, { x: 0, y: -1, z: 0 });
      sim.drainEvents();
      let saved = null;
      for (let i = 0; i < 60 && !saved; i++) {
        sim.tick(DT, {});
        saved = sim.drainEvents().find((e) => e.type === 'checkpoint-saved') ?? null;
      }
      assert.equal(keep.alive, false, 'a granada matou o último defensor');
      assert.deepEqual(atBlast, [[], null], 'durante a explosão: sem granada explodida na lista e snapshot válido');
      assert.equal(saved?.checkpointId, expectedId);
      assert.equal(saved.persisted, true, saved.persistError);
      assert.deepEqual(sim.checkpoints.get(expectedId).grenades, []);
      assert.equal(JSON.parse(storage.getItem(M02_SAVE_STORAGE_KEY)).latestCheckpointId, expectedId);
      sim.restoreCheckpoint(expectedId);
      assert.equal(keep.alive, false);
    });
  }

  it('snapshot inválido não substitui a entrada boa do índice nem fica marcado como atingido; restauro recorre à loja', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.teleportPlayer(-23, -12, 0);
    const good = sim.saveCheckpoint('cp_m02_manual');
    assert.ok(good);
    const goodX = good.player.x;

    sim.tick(DT, { forward: 1 });
    sim.player.x = Number.NaN;
    sim.drainEvents();
    assert.equal(sim.saveCheckpoint('cp_m02_manual'), null);
    assert.equal(sim.lastCheckpointPersist.ok, false);
    assert.match(sim.lastCheckpointPersist.reason, /não finito/);
    assert.deepEqual(sim.drainEvents().map((e) => e.type), ['checkpoint-rejected']);
    assert.equal(sim.checkpoints.get('cp_m02_manual').player.x, goodX, 'o índice mantém o snapshot bom');
    assert.equal(sim.saveCheckpoint('cp_novo_invalido'), null);
    assert.equal(sim.checkpointsReached.includes('cp_novo_invalido'), false, 'recusado não conta como atingido');

    sim.restoreCheckpoint('cp_m02_manual');
    assert.equal(sim.player.x, goodX);

    // A entrada do índice estragada depois de gravada (p. ex. por quem recebeu uma referência): o restauro usa a loja.
    sim.checkpoints.get('cp_m02_manual').player.x = Number.NaN;
    sim.tick(DT, { forward: 1 });
    sim.restoreCheckpoint('cp_m02_manual');
    assert.equal(sim.player.x, goodX, 'restaurado da cópia persistida');
    assert.equal(validateM02Snapshot(sim.checkpoints.get('cp_m02_manual')).valid, true, 'índice reparado com a cópia boa');

    const refusing = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
    const noStore = new M02BenchSimulation(SEED, { storage: refusing });
    noStore.saveCheckpoint('cp_m02_manual');
    noStore.checkpoints.get('cp_m02_manual').player.x = Number.NaN;
    assert.throws(() => noStore.restoreCheckpoint('cp_m02_manual'), /inválido em memória .*sem cópia persistida válida/);
  });
});

describe('M02-12 — P2: saveCheckpoint/restoreCheckpoint não expõem o objeto interno do índice', () => {
  it('mexer no valor devolvido não altera o checkpoint guardado', () => {
    const sim = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    const saved = sim.saveCheckpoint('cp_m02_manual');
    saved.player.health = 1;
    sim.restoreCheckpoint('cp_m02_manual');
    assert.equal(sim.player.health, 100);
    const restored = sim.restoreCheckpoint('cp_m02_manual');
    restored.flags['m02.completed'] = true;
    assert.equal(sim.checkpoints.get('cp_m02_manual').flags['m02.completed'], false);
    const persisted = sim.restorePersistedCheckpoint('cp_m02_manual');
    persisted.player.health = 2;
    assert.equal(sim.checkpoints.get('cp_m02_manual').player.health, 100);
  });
});

describe('M02-12 — P1: recarregar a página não destrói o save', () => {
  it('o save anterior (F5 com relógio 5,0) continua restaurável depois de 2 recarregamentos; F9 vai à loja', () => {
    const storage = createMemoryStorage(); // faz de localStorage entre carregamentos
    const s1 = new M02BenchSimulation(SEED, { storage, startScene: 'C01' });
    assert.equal(storage.getItem(M02_SAVE_STORAGE_KEY), null, 'o arranque não escreve');
    killAll(s1.enemies.filter((e) => e.encounterId === 'EA0'));
    for (let i = 0; i < 100; i++) s1.tick(DT, { forward: 1 });
    const f5 = s1.saveCheckpoint('cp_m02_manual');
    assert.ok(Math.abs(f5.clock - 5.0) < 1e-9);
    const rawAfterF5 = storage.getItem(M02_SAVE_STORAGE_KEY);

    for (const reload of [1, 2]) {
      const page = new M02BenchSimulation(undefined, { storage });
      assert.equal(storage.getItem(M02_SAVE_STORAGE_KEY), rawAfterF5, `recarregamento ${reload}: registo intacto`);
      assert.equal(page.saveStore.latestCheckpointId(), 'cp_m02_manual');
      assert.equal(page.clock, 0);
      assert.deepEqual(page.quickLoadCheckpoint(), { checkpointId: 'cp_m02_manual', source: 'store' });
      assert.ok(Math.abs(page.clock - 5.0) < 1e-9, `recarregamento ${reload}: F9 restaura o F5 (relógio ${page.clock})`);
      assert.equal(canonical(page.snapshot()), canonical({ ...f5, checkpointId: undefined }));
    }
  });

  it('F9 numa sessão que já gravou: o manual desta sessão; sem manual, o último gravado nesta sessão', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    assert.deepEqual(sim.quickLoadCheckpoint(), { checkpointId: 'cp_m02_a_preparacao', source: 'start' });
    killAll(sim.enemies);
    sim.tick(DT, {});
    assert.deepEqual(sim.quickLoadCheckpoint(), { checkpointId: 'cp_m02_b_acesso', source: 'session' });
    sim.teleportPlayer(-23, -12, 0);
    sim.saveCheckpoint('cp_m02_manual');
    sim.teleportPlayer(0, 0, 0);
    assert.deepEqual(sim.quickLoadCheckpoint(), { checkpointId: 'cp_m02_manual', source: 'session' });
    assert.equal(sim.player.x, -23);
  });
});

describe('M02-12 — P2: loja persistente (current ilegível, checkpoint incompatível, dois separadores)', () => {
  const KEY = M02_SAVE_STORAGE_KEY;
  const ids = (raw) => (raw ? Object.keys(JSON.parse(raw).checkpoints).sort() : null);
  const storeOn = (storage) => new M02SaveStore({ storage, validateSnapshot: validateM02Snapshot });
  const snapAs = (sim, id) => ({ ...sim.snapshot(), checkpointId: id });

  /** Sessão com cp_m02_a_preparacao e um F5: current = {a, manual}, previous = {a}. */
  function savedSession() {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.saveCheckpoint('cp_m02_a_preparacao');
    sim.teleportPlayer(-23, -12, 0);
    sim.saveCheckpoint('cp_m02_manual');
    return { storage, sim };
  }

  it('falha transitória a ler current durante um commit: aborta e relata; não reconstrói a partir de previous', () => {
    const { storage, sim } = savedSession();
    const currentBefore = storage.getItem(KEY);
    const previousBefore = storage.getItem(`${KEY}:previous`);
    let failOnce = true;
    const flaky = {
      getItem: (k) => {
        if (k === KEY && failOnce) {
          failOnce = false;
          throw new Error('SecurityError transitório');
        }
        return storage.getItem(k);
      },
      setItem: (k, v) => storage.setItem(k, v),
      removeItem: (k) => storage.removeItem(k),
    };
    const res = storeOn(flaky).commitCheckpoint('cp_m02_b_acesso', snapAs(sim, 'cp_m02_b_acesso'));
    assert.equal(res.ok, false);
    assert.match(res.reason, /Commit abortado, nada foi alterado: Leitura do armazenamento falhou/);
    assert.equal(storage.getItem(KEY), currentBefore, 'current intacto: o F5 não se perde');
    assert.equal(storage.getItem(`${KEY}:previous`), previousBefore);
    const retry = storeOn(flaky).commitCheckpoint('cp_m02_b_acesso', snapAs(sim, 'cp_m02_b_acesso'));
    assert.equal(retry.ok, true, 'passada a falha, o commit seguinte grava sobre o current completo');
    assert.deepEqual(ids(storage.getItem(KEY)), ['cp_m02_a_preparacao', 'cp_m02_b_acesso', 'cp_m02_manual']);
  });

  it('dois separadores com commits intercalados: compare-and-swap no current e nenhum checkpoint se perde', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.saveCheckpoint('cp_m02_a_preparacao');
    let hook = null;
    const tabA = {
      getItem: (k) => {
        const v = storage.getItem(k);
        if (hook && k === KEY) {
          const h = hook;
          hook = null;
          h(); // o separador B grava entre a leitura de A e a promoção de A
        }
        return v;
      },
      setItem: (k, v) => storage.setItem(k, v),
      removeItem: (k) => storage.removeItem(k),
    };
    let resB = null;
    hook = () => {
      resB = storeOn(storage).commitCheckpoint('cp_tab_b', snapAs(sim, 'cp_tab_b'));
    };
    const resA = storeOn(tabA).commitCheckpoint('cp_tab_a', snapAs(sim, 'cp_tab_a'));
    assert.equal(resB.ok, true);
    assert.equal(resA.ok, true);
    assert.deepEqual(ids(storage.getItem(KEY)), ['cp_m02_a_preparacao', 'cp_tab_a', 'cp_tab_b']);
    assert.equal(JSON.parse(storage.getItem(KEY)).seq, 3);
    assert.deepEqual(ids(storage.getItem(`${KEY}:previous`)), ['cp_m02_a_preparacao', 'cp_tab_b'], 'previous = o commit de B');

    // Um current que muda a cada leitura esgota as tentativas: commit abortado, nada promovido.
    let n = 0;
    const racing = {
      getItem: (k) => (k === KEY ? storage.getItem(KEY).replace(/"seq":\d+/, `"seq":${100 + n++}`) : storage.getItem(k)),
      setItem: (k, v) => storage.setItem(k, v),
      removeItem: (k) => storage.removeItem(k),
    };
    const before = storage.getItem(KEY);
    const raced = storeOn(racing).commitCheckpoint('cp_tab_c', snapAs(sim, 'cp_tab_c'));
    assert.equal(raced.ok, false);
    assert.match(raced.reason, /Gravação concorrente persistente/);
    assert.equal(storage.getItem(KEY), before);
  });

  it('um checkpoint incompatível não invalida o registo: os compatíveis continuam a carregar e a ser gravados', () => {
    const { storage } = savedSession();
    for (const slot of [KEY, `${KEY}:previous`]) {
      const r = JSON.parse(storage.getItem(slot));
      r.checkpoints.cp_m02_a_preparacao.world.layoutSchema = 'm02-01-quinta-bench-v0';
      storage.setItem(slot, JSON.stringify(r));
    }
    const store = storeOn(storage);
    const loaded = store.load();
    assert.equal(loaded.ok, true);
    assert.equal(loaded.source, 'current');
    assert.deepEqual(loaded.rejectedCheckpoints.map((r) => r.id), ['cp_m02_a_preparacao']);
    assert.match(loaded.rejectedCheckpoints[0].reason, /Save incompatível: layout m02-01-quinta-bench-v0/);
    assert.deepEqual(store.checkpointIds(), ['cp_m02_manual']);
    assert.equal(store.latestCheckpointId(), 'cp_m02_manual');
    assert.equal(store.loadCheckpoint('cp_m02_a_preparacao'), null);
    assert.equal(store.loadCheckpoint('cp_m02_manual').player.x, -23);

    new M02BenchSimulation(SEED, { storage }); // recarregar a página, duas vezes
    const page = new M02BenchSimulation(SEED, { storage });
    page.restorePersistedCheckpoint();
    assert.equal(page.player.x, -23);
    page.saveCheckpoint('cp_m02_b_test');
    assert.equal(page.lastCheckpointPersist.ok, true, page.lastCheckpointPersist.reason);
    const after = JSON.parse(storage.getItem(KEY));
    assert.deepEqual(Object.keys(after.checkpoints).sort(), ['cp_m02_a_preparacao', 'cp_m02_b_test', 'cp_m02_manual']);
    assert.equal(after.checkpoints.cp_m02_a_preparacao.world.layoutSchema, 'm02-01-quinta-bench-v0', 'incompatível guardado, não apagado');

    // Incompatível só em current e compatível em previous: o commit seguinte recupera a versão boa de previous.
    const { storage: s2, sim: sim2 } = savedSession();
    const r = JSON.parse(s2.getItem(KEY));
    r.checkpoints.cp_m02_a_preparacao.world.layoutSchema = 'm02-01-quinta-bench-v0';
    s2.setItem(KEY, JSON.stringify(r));
    assert.equal(storeOn(s2).commitCheckpoint('cp_m02_c_test', snapAs(sim2, 'cp_m02_c_test')).ok, true);
    assert.deepEqual(storeOn(s2).checkpointIds().sort(), ['cp_m02_a_preparacao', 'cp_m02_c_test', 'cp_m02_manual']);
  });

  it('current e previous corrompidos: o arranque não grava por cima e o commit seguinte aborta (nada é apagado)', () => {
    const storage = createMemoryStorage();
    storage.setItem(KEY, '{"format":"cod');
    storage.setItem(`${KEY}:previous`, '{"format":"cod');
    const sim = new M02BenchSimulation(SEED, { storage });
    assert.equal(storage.getItem(KEY), '{"format":"cod');
    sim.saveCheckpoint('cp_m02_manual');
    assert.equal(sim.lastCheckpointPersist.ok, false);
    assert.match(sim.lastCheckpointPersist.reason, /Commit abortado/);
    assert.equal(storage.getItem(KEY), '{"format":"cod');
    assert.equal(storage.getItem(`${KEY}:previous`), '{"format":"cod');
    assert.ok(sim.checkpoints.has('cp_m02_manual'), 'o checkpoint continua no índice em memória');
    assert.equal(sim.saveStore.clear(), true, 'novo jogo explícito limpa os slots');
    sim.saveCheckpoint('cp_m02_manual');
    assert.equal(sim.lastCheckpointPersist.ok, true);
  });
});

describe('M02-12 — P2: validador (enums e relações, PDF I4/I5) e perfil da arma vindo do código', () => {
  it('rejeita estado fora do enum, aliado morto com arma ativa, lis_status inválido, carroça/volume fora do enum, portador morto ou inexistente, vida fora de [0, máx.], objetivo inválido', () => {
    const sim = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    const cases = [
      [(s) => { s.allies[0].state = 'ZOMBIE'; }, /Estado de aliado inválido: .*ZOMBIE/],
      [(s) => { s.enemies[0].state = 'ZOMBIE'; }, /Estado de inimigo inválido/],
      [(s) => { s.allies[0].alive = false; s.allies[0].state = 'ACTIVE'; s.allies[0].mag = 20; s.allies[0].health = 0; }, /Aliado morto com arma ativa/],
      [(s) => { s.flags['m02.lis_status'] = 'dead'; }, /m02\.lis_status/],
      [(s) => { s.areaC.c12Completed = true; }, /m02\.lis_status: active/], // depois de C12 só os três valores finais (I4)
      [(s) => { s.areaB.supplyCart.state = 'FLYING'; }, /Estado da carroça inválido/],
      [(s) => { s.areaB.supplyCart.volumes[0].state = 'TELEPORTED'; }, /Estado do volume vol_water inválido/],
      [(s) => { s.areaB.supplyCart.volumes[0].state = 'CARRIED'; }, /incoerente/],
      [
        (s) => {
          s.allies[1].alive = false;
          s.allies[1].state = 'DOWN';
          s.areaB.supplyCart.volumes[0].carriedBy = s.allies[1].id;
          s.areaB.supplyCart.volumes[0].state = 'CARRIED';
        },
        /Portador morto/,
      ],
      [(s) => { s.areaB.supplyCart.volumes[0].carriedBy = 'pl_fantasma'; s.areaB.supplyCart.volumes[0].state = 'CARRIED'; }, /Portador inexistente/],
      [(s) => { s.enemies[0].health = -50; }, /Vida fora de \[0, máx\.\]/],
      [(s) => { s.allies[0].health = s.allies[0].maxHealth + 1; }, /Vida fora de \[0, máx\.\]/],
      [(s) => { s.objective.status = 'xyz'; }, /Objetivo inválido/],
      [(s) => { s.weapon.id = 'mp40'; }, /Arma do jogador desconhecida/],
      [(s) => { s.weapon.mag = 9; }, /munição da arma/],
      [(s) => { s.weapon.reloadMode = 'magic'; }, /ciclo\/recarga/],
    ];
    for (const [mutate, pattern] of cases) {
      const bad = sim.snapshot();
      mutate(bad);
      const res = validateM02Snapshot(bad);
      assert.equal(res.valid, false, `deveria rejeitar: ${pattern}`);
      assert.match(res.reason, pattern);
    }
    for (const status of ['wounded_evacuated', 'wounded_walking', 'missing', null, 'active']) {
      const ok = sim.snapshot();
      ok.flags['m02.lis_status'] = status;
      assert.equal(validateM02Snapshot(ok).valid, true, `lis_status ${status} aceite antes de C12`);
    }
  });

  it('weapon.profile do save nunca é aplicado: dano 9999 e campos estranhos são ignorados; o estado da arma é reposto', () => {
    const sim = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    const codeProfile = structuredClone(sim.weapon.profile);
    const snap = sim.snapshot();
    snap.weapon.mag = 3;
    snap.weapon.reserve = 12;
    snap.weapon.profile = { id: 'x', label: 'x', type: 'x', damage: 9999, range: 1e6, reload: { duration: 1 } };
    snap.weapon.evil = true;
    assert.equal(validateM02Snapshot(snap).valid, true, 'campos desconhecidos não impedem o restauro (saves v2 antigos)');
    const target = new M02BenchSimulation(1, { storage: createMemoryStorage() });
    target.restoreSnapshot(snap);
    assert.deepEqual(target.weapon.profile, codeProfile, 'o perfil vem do código');
    assert.equal('evil' in target.weapon, false);
    assert.equal(target.weapon.mag, 3);
    assert.equal(target.weapon.reserve, 12);
  });

  it('um portador que morre larga o volume no tick em que cai: os saves seguintes continuam válidos', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.enterAreaBC06();
    assert.equal(sim.pickupSupplyVolume('vol_ammo', 'pl_malek'), true);
    sim.tick(DT, {});
    const malek = sim.allies.find((a) => a.id === 'pl_malek');
    malek.alive = false;
    malek.state = 'DOWN';
    malek.health = 0;
    sim.tick(DT, {});
    const vol = sim.areaB.supplyCart.volumes.find((v) => v.id === 'vol_ammo');
    assert.equal(vol.carriedBy, null);
    assert.equal(vol.state, 'DROPPED_READY');
    assert.equal(malek.carryingVolumeId, null);
    assert.equal(vol.x, malek.x);
    assert.ok(sim.combatLog.some((e) => e.type === 'supply_volume_dropped' && e.carrierId === 'pl_malek'));
    sim.saveCheckpoint('cp_m02_manual');
    assert.equal(sim.lastCheckpointPersist.ok, true, sim.lastCheckpointPersist.reason);
    assert.equal(sim.pickupSupplyVolume('vol_ammo'), true, 'o volume largado pode ser recolhido');
  });
});

describe('M02-12 — P2: configuração separada do estado de jogo (I5) e m02.completed só em C12 (I4)', () => {
  it('acessibilidade fora do snapshot: restaurar um checkpoint não reverte a configuração; save v2 antigo com ela carrega', () => {
    const sim = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    const legacy = sim.saveCheckpoint('cp_m02_manual');
    assert.equal('accessibility' in legacy.audiovisual, false);
    sim.setAccessibilityOptions({ subtitlesEnabled: false, reducedCameraShake: true, tinnitusIntensity: 0 });
    sim.restoreCheckpoint('cp_m02_manual');
    assert.equal(sim.audiovisual.accessibility.subtitlesEnabled, false);
    assert.equal(sim.audiovisual.accessibility.reducedCameraShake, true);
    assert.equal(sim.audiovisual.accessibility.tinnitusIntensity, 0);

    // Save v2 gravado antes do FIX-2b (levava a acessibilidade): continua a carregar e a configuração é ignorada.
    legacy.audiovisual.accessibility = { subtitlesEnabled: true, reducedCameraShake: false, tinnitusIntensity: 1 };
    assert.equal(validateM02Snapshot(legacy).valid, true);
    sim.restoreSnapshot(legacy);
    assert.equal(sim.audiovisual.accessibility.subtitlesEnabled, false);
    assert.equal(sim.audiovisual.accessibility.tinnitusIntensity, 0);
  });

  it('m02.completed fica falso ao concluir a Área A e em C05; só C12 o põe verdadeiro; save antigo é migrado', () => {
    const sim = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    killAll(sim.enemies);
    sim.tick(DT, {});
    assert.equal(sim.objective.id, 'COMPLETE');
    assert.equal(sim.flags['m02.completed'], false, 'Área A consolidada não conclui a missão');
    assert.equal(sim.checkpoints.get('cp_m02_b_acesso').flags['m02.completed'], false);
    const payload = sim.triggerTransitionTAB({ skip: true });
    assert.equal(sim.flags['m02.completed'], false, 'C05/T-AB não conclui a missão');
    assert.equal(payload.flags['m02.completed'], false);
    assert.equal(sim.exportCampaignResultToM03().completed, false, 'exportar antes de C12 não declara conclusão');

    const legacy = sim.snapshot();
    legacy.flags['m02.completed'] = true; // como os saves v2 anteriores ao FIX-2b gravavam na Área A
    const fresh = new M02BenchSimulation(SEED + 1, { storage: createMemoryStorage() });
    fresh.restoreSnapshot(legacy);
    assert.equal(fresh.flags['m02.completed'], false, 'migração explícita: sem C12 não há conclusão');

    sim.enterAreaBC06();
    sim.enterAreaCC09();
    assert.equal(sim.flags['m02.completed'], false);
    sim.completeC12Epilogue();
    assert.equal(sim.flags['m02.completed'], true);
    const done = sim.saveCheckpoint('cp_m02_final_test');
    fresh.restoreSnapshot(done);
    assert.equal(fresh.flags['m02.completed'], true, 'depois de C12 a flag é reposta');
  });

  it('guarda estática: o seletor de iluminação da bancada só muda a luz de pré-visualização (não o estado temporal)', () => {
    // Guarda de código (não é teste de comportamento): o listener está no módulo de browser, sem DOM em Node.
    const src = readFileSync(new URL('../src/m02/m02-01-main.js', import.meta.url), 'utf8');
    const start = src.indexOf("selLighting?.addEventListener('change'");
    assert.ok(start >= 0);
    const block = src.slice(start, src.indexOf('});', start));
    assert.match(block, /renderer\.applyLightingPreset/);
    assert.doesNotMatch(block, /setTemporalState|sim\.horizon/);
    // E a simulação: mudar só a luz não mexe na data narrativa do snapshot.
    const sim = new M02BenchSimulation(SEED, { storage: createMemoryStorage() });
    assert.deepEqual(sim.snapshot().narrative, { temporalState: 'T0', narrativeDate: '1939-09-09', dayPart: 'fim da tarde', civilTime: null });
  });
});

describe('M02-12 — -0 no snapshot (o JSON perde-o)', () => {
  /** Como canonical(), mas distingue -0 de 0. */
  const strictCanonical = (value) =>
    JSON.stringify(value, (_k, v) => (Object.is(v, -0) ? '#-0' : v instanceof Map ? [...v.entries()].sort() : v instanceof Set ? [...v].sort() : v));
  const hasNegativeZero = (node) =>
    Object.is(node, -0) || (node !== null && typeof node === 'object' && Object.values(node).some(hasNegativeZero));

  it('Área C: o snapshot não tem -0 e o restauro da memória e o da loja continuam igualmente, bit a bit', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.enterAreaCC09();
    const driver = routeDriver('areaC');
    record(sim, driver, 0, 10);
    const live = liveState(sim);
    assert.ok(hasNegativeZero(live), 'pré-condição: o estado vivo tem -0 (memória de um inimigo em x = -0)');
    const snap = sim.saveCheckpoint('cp_m02_manual');
    sim.drainEvents();
    assert.equal(hasNegativeZero(snap), false);

    const fromMemory = new M02BenchSimulation(SEED + 5, { storage: createMemoryStorage() });
    fromMemory.restoreSnapshot(snap);
    const fromStore = new M02BenchSimulation(SEED + 6, { storage });
    fromStore.restorePersistedCheckpoint('cp_m02_manual');
    for (let t = 10; t < 130; t++) {
      fromMemory.tick(DT, driver(fromMemory, t));
      fromStore.tick(DT, driver(fromStore, t));
      assert.equal(strictCanonical(liveState(fromStore)), strictCanonical(liveState(fromMemory)), `tick ${t}`);
    }
    // E ambos seguem a continuação original (com -0 tratado como 0, ver canonical()).
    const reference = record(sim, driver, 10, 60);
    const again = new M02BenchSimulation(SEED + 7, { storage });
    again.restorePersistedCheckpoint('cp_m02_manual');
    again.drainEvents();
    assertSameContinuation(record(again, driver, 10, 60), reference, 'Área C · cópia persistida');
  });
});
