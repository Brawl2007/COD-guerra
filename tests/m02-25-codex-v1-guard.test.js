// M02 · item 0 — PROTEÇÃO DOS SAVES DO CODEX.
// A outra versão da bancada (branch codex/m02-recovery-v1, src/m02/m02-session.js) gravou no navegador `{version:1, id, snapshot}`
// (alguns com `rngState`) na chave `cod-guerra:checkpoint:m02:v1`. Esses dados não podem ser apagados, sobrescritos, migrados nem
// lidos como save v2. A nossa loja usa `cod-guerra:m02:bench:v2` (+ `:previous`, `:staging`).
// Teste de estado (não é playtest): armazenamento falso pré-povoado com a chave v1 do Codex e chaves estranhas (M01 incluída),
// com registo de TODOS os acessos; no fim, o valor de cada chave estranha está byte a byte igual e nunca foi lido/escrito/apagado.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  createMemoryStorage,
  M02SaveStore,
  M02_CODEX_V1_SAVE_KEY,
  M02_SAVE_STORAGE_KEY,
} from '../src/game/m02-save-store.js';

const SEED = 19390909;
const DT = 0.05;
const KEY = M02_SAVE_STORAGE_KEY;

// Um valor do Codex plausível: envelope `{version:1, id, snapshot}`; o snapshot tem `rngState` e unicode para apanhar re-codificações.
const CODEX_V1_RAW = JSON.stringify({
  version: 1,
  id: 'cp_m02_manual',
  snapshot: {
    schema: 'm02-01-bench-snapshot-v1',
    seed: 19390909,
    rngState: 123456789,
    clock: 42.5,
    note: 'ação — Zagłoba ✓',
    player: { x: -23, y: 0, z: -12, health: 87 },
  },
});

/** Chaves estranhas: nenhuma pode mudar. Inclui valores que nenhum parser aceitaria e chaves de nome parecido com as da v2. */
const FOREIGN = Object.freeze({
  [M02_CODEX_V1_SAVE_KEY]: CODEX_V1_RAW,
  'cod-guerra:checkpoint:m02:v1:previous': '{"version":1,"id":"cp_m02_a_preparacao","snapshot":{"schema":"m02-02-snapshot-v2","rngState":7}}',
  'cod-guerra:checkpoint:m02:outro': '\u0000binário {{ não é JSON ✓',
  'cod-guerra:checkpoint:m01:v2': '{"schema":2,"missionId":"m01_tczew","note":"save da M01"}',
  'cod-guerra:checkpoint:m01:acts:v3': '{"schema":3,"missionId":"m01_tczew","act":"act_vii_a_north"}',
  'cod-guerra:checkpoint:v1': '{"schema":1,"legacy":true}',
  'cod-guerra:audio-mix': '{"master":0.8}',
  'cod-guerra:visual-quality': 'high',
  'cod-guerra:m02:bench:v1': '{"nome":"parecida com a v2 mas é outra chave"}',
  'cod-guerra:m02:bench:v2:outro': '{"sufixo":"não é um dos três slots exatos"}',
  'cod-guerra:m02:bench:v2x': 'sufixo colado',
  'x-outra-app': 'não é desta aplicação',
});
const isForeign = (key) => Object.hasOwn(FOREIGN, key);
const OUR_SLOTS = new Set([KEY, `${KEY}:previous`, `${KEY}:staging`, `${KEY}:probe`]);

/** Armazenamento em memória que regista cada acesso: [operação, chave]. `keys()` é a enumeração (sem chave). */
function recordingStorage(initial = FOREIGN) {
  const mem = createMemoryStorage(initial);
  const log = [];
  return {
    log,
    getItem(key) {
      log.push(['get', key]);
      return mem.getItem(key);
    },
    setItem(key, value) {
      log.push(['set', key]);
      mem.setItem(key, value);
    },
    removeItem(key) {
      log.push(['remove', key]);
      mem.removeItem(key);
    },
    keys() {
      log.push(['keys', null]);
      return mem.keys();
    },
    /** Leitura sem registo, para as asserções. */
    peek: (key) => mem.getItem(key),
    peekKeys: () => mem.keys(),
  };
}

function assertForeignUntouched(storage, label) {
  for (const [key, value] of Object.entries(FOREIGN)) {
    assert.equal(storage.peek(key), value, `${label}: ${key} mudou`);
  }
  const writes = storage.log.filter(([op, key]) => (op === 'set' || op === 'remove') && !OUR_SLOTS.has(key));
  assert.deepEqual(writes, [], `${label}: escrita/remoção fora dos slots v2 exatos`);
  const foreignWrites = storage.log.filter(([op, key]) => (op === 'set' || op === 'remove') && isForeign(key));
  assert.deepEqual(foreignWrites, [], `${label}: escrita/remoção numa chave estranha`);
}

/** Nenhuma chave estranha foi LIDA (a deteção é o único caminho de leitura e não é chamada aqui). */
function assertForeignNeverRead(storage, label) {
  const reads = storage.log.filter(([op, key]) => op === 'get' && !OUR_SLOTS.has(key));
  assert.deepEqual(reads, [], `${label}: leitura de chave que não é da v2: ${JSON.stringify(reads)}`);
  assert.equal(storage.log.some(([op]) => op === 'keys'), false, `${label}: enumerou chaves`);
}

/** Piloto mínimo: a andar para a frente na C01 até gravar o checkpoint automático do tick. */
function walkUntilAutoCheckpoint(sim, seconds = 12) {
  for (let t = 0; t < seconds / DT; t++) {
    sim.tick(DT, { forward: 1 });
    sim.drainEvents();
  }
}

describe('M02 item 0 — os saves v1 do Codex ficam byte a byte iguais em todos os caminhos de gravação/restauro/limpeza', () => {
  it('pré-condição: o armazenamento falso tem a chave v1 do Codex e as outras; a v2 está vazia', () => {
    const storage = recordingStorage();
    assert.equal(storage.peek(M02_CODEX_V1_SAVE_KEY), CODEX_V1_RAW);
    assert.equal(storage.peek(KEY), null);
    assert.ok(Object.keys(FOREIGN).some((k) => k.startsWith('cod-guerra:checkpoint:m01:')));
    assert.notEqual(M02_CODEX_V1_SAVE_KEY, KEY);
  });

  it('construir a bancada, gravar F5, checkpoints automáticos, restaurar e F9 numa página recarregada: nada estranho é lido, escrito ou apagado', () => {
    const storage = recordingStorage();
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01', storage });
    assertForeignNeverRead(storage, 'construção');

    // Checkpoint automático dentro do tick (C01: primeiro avanço) e F5 manual.
    walkUntilAutoCheckpoint(sim);
    assert.equal(sim.lastCheckpointPersist?.ok, true, sim.lastCheckpointPersist?.reason);
    assert.ok(sim.saveStore.latestCheckpointId(), 'o automático chegou à loja v2');
    sim.teleportPlayer(-23, -12, 0);
    const manual = sim.saveCheckpoint('cp_m02_manual');
    assert.ok(manual);
    assert.equal(sim.lastCheckpointPersist.ok, true, sim.lastCheckpointPersist.reason);

    // Lote no fim de uma ação atómica (dois pedidos automáticos) e restauro pelas duas vias.
    sim.runAtomicAction(() => {
      sim.requestAutoCheckpoint('cp_m02_b_acesso');
      sim.requestAutoCheckpoint('cp_m02_b_test');
    });
    sim.restoreCheckpoint('cp_m02_manual');
    sim.restorePersistedCheckpoint('cp_m02_manual');
    sim.restorePersistedCheckpoint();
    assert.equal(sim.quickLoadCheckpoint().source, 'session');

    // Página recarregada sobre o mesmo armazenamento: F9 lê a loja v2.
    const page = new M02BenchSimulation(SEED, { storage });
    assert.deepEqual(page.quickLoadCheckpoint(), { checkpointId: 'cp_m02_b_test', source: 'store' });
    assert.equal(page.saveStore.status().blocked, false);
    page.saveCheckpoint('cp_m02_manual');
    assert.equal(page.lastCheckpointPersist.ok, true);

    assertForeignUntouched(storage, 'sessão completa');
    assertForeignNeverRead(storage, 'sessão completa');
    // O que a v2 escreveu ficou nas chaves exatas da v2.
    assert.ok(storage.peek(KEY));
    assert.equal(storage.peekKeys().filter((k) => !isForeign(k)).every((k) => OUR_SLOTS.has(k)), true);
  });

  it('clearPersistedSaves() e clear() apagam só os três slots exatos da v2 (sem prefixo, sem enumeração)', () => {
    const storage = recordingStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.saveCheckpoint('cp_m02_manual');
    sim.saveCheckpoint('cp_m02_b_test');
    assert.ok(storage.peek(KEY));
    assert.ok(storage.peek(`${KEY}:previous`));
    storage.log.length = 0;

    assert.equal(sim.clearPersistedSaves(), true);
    assert.equal(storage.peek(KEY), null);
    assert.equal(storage.peek(`${KEY}:previous`), null);
    assert.equal(storage.peek(`${KEY}:staging`), null);
    const removes = storage.log.filter(([op]) => op === 'remove').map(([, key]) => key).sort();
    assert.deepEqual(removes, [KEY, `${KEY}:previous`, `${KEY}:staging`].sort(), 'só os três slots exatos');
    assertForeignUntouched(storage, 'clearPersistedSaves');
    assertForeignNeverRead(storage, 'clearPersistedSaves');

    // Depois do clear a v2 volta a gravar e o resto continua intacto; o store.clear() direto faz o mesmo.
    sim.saveCheckpoint('cp_m02_manual');
    assert.equal(sim.lastCheckpointPersist.ok, true);
    assert.equal(sim.saveStore.clear(), true);
    assertForeignUntouched(storage, 'clear() direto');
  });

  it('loja bloqueada (current truncado / outra formatVersion): F5 e automáticos falham, status() bloqueado, clear() desbloqueia — e as chaves estranhas ficam iguais', () => {
    const breakers = {
      truncado: (raw) => raw.slice(0, raw.length - 10),
      'outra formatVersion': (raw) => JSON.stringify({ ...JSON.parse(raw), formatVersion: 99 }),
    };
    for (const [label, breakRaw] of Object.entries(breakers)) {
      const storage = recordingStorage();
      const s1 = new M02BenchSimulation(SEED, { storage });
      s1.saveCheckpoint('cp_m02_manual');
      const broken = breakRaw(storage.peek(KEY));
      storage.setItem(KEY, broken);
      storage.log.length = 0;

      const page = new M02BenchSimulation(SEED, { storage });
      assert.equal(page.saveStore.status().blocked, true, label);
      page.saveCheckpoint('cp_m02_manual');
      assert.equal(page.lastCheckpointPersist.ok, false, `${label}: F5 falha enquanto bloqueado`);
      page.requestAutoCheckpoint('cp_m02_b_acesso');
      assert.equal(page.lastCheckpointPersist.ok, false, `${label}: o automático também falha`);
      assert.equal(storage.peek(KEY), broken, `${label}: o save bloqueado não foi apagado`);
      assert.throws(() => page.restorePersistedCheckpoint(), /não encontrado ou inválido/);
      assertForeignUntouched(storage, `bloqueada (${label})`);
      assertForeignNeverRead(storage, `bloqueada (${label})`);

      assert.equal(page.clearPersistedSaves(), true);
      assert.equal(page.saveStore.status().blocked, false);
      page.saveCheckpoint('cp_m02_manual');
      assert.equal(page.lastCheckpointPersist.ok, true, page.lastCheckpointPersist.reason);
      assertForeignUntouched(storage, `bloqueada (${label}) depois do clear`);
    }
  });

  it('loja bloqueada por leitura do armazenamento a lançar na chave v2: nenhuma chave estranha é tocada', () => {
    const inner = recordingStorage();
    const seed = new M02BenchSimulation(SEED, { storage: inner });
    seed.saveCheckpoint('cp_m02_manual');
    inner.log.length = 0;
    const hostile = {
      getItem: (key) => {
        if (key === KEY) throw new Error('SecurityError');
        return inner.getItem(key);
      },
      setItem: (key, value) => inner.setItem(key, value),
      removeItem: (key) => inner.removeItem(key),
    };
    const sim = new M02BenchSimulation(SEED, { storage: hostile });
    assert.equal(sim.saveStore.status().kind, 'storage-error');
    sim.saveCheckpoint('cp_m02_manual');
    assert.equal(sim.lastCheckpointPersist.ok, false);
    assert.equal(sim.quickLoadCheckpoint().source, 'session', 'a sessão tem o seu índice em memória');
    const reloaded = new M02BenchSimulation(SEED, { storage: hostile });
    assert.equal(reloaded.quickLoadCheckpoint().source, 'start', 'página recarregada sem loja legível: início em memória');
    assertForeignUntouched(inner, 'leitura hostil');
    assertForeignNeverRead(inner, 'leitura hostil');
  });

  it('escrita a lançar (quota) e setItem recusado: o save anterior e as chaves estranhas ficam intactos', () => {
    const inner = recordingStorage();
    const ok = new M02BenchSimulation(SEED, { storage: inner });
    ok.saveCheckpoint('cp_m02_manual');
    const before = inner.peek(KEY);
    let failing = false;
    const quota = {
      getItem: (key) => inner.getItem(key),
      setItem: (key, value) => {
        if (failing) throw new Error('QuotaExceededError');
        inner.setItem(key, value);
      },
      removeItem: (key) => inner.removeItem(key),
    };
    const sim = new M02BenchSimulation(SEED, { storage: quota });
    failing = true;
    sim.saveCheckpoint('cp_m02_b_test');
    assert.equal(sim.lastCheckpointPersist.ok, false);
    assert.equal(inner.peek(KEY), before, 'o save v2 anterior sobreviveu');
    assertForeignUntouched(inner, 'quota');
  });

  it('só a chave v1 do Codex existe (a v2 vazia): nunca é lida como save v2 — sem save, F9 cai no início em memória e nada se escreve nela', () => {
    const storage = recordingStorage({ [M02_CODEX_V1_SAVE_KEY]: CODEX_V1_RAW });
    const sim = new M02BenchSimulation(SEED, { storage });
    assert.deepEqual(sim.saveStore.status(), { blocked: false, kind: null, reason: null, hasSave: false });
    assert.equal(sim.saveStore.latestCheckpointId(), null);
    assert.deepEqual(sim.saveStore.checkpointIds(), []);
    assert.equal(sim.saveStore.load().ok, false);
    assert.equal(sim.saveStore.loadCheckpoint('cp_m02_manual'), null);
    assert.equal(sim.saveStore.loadCheckpoint('cp_m02_a_preparacao'), null);
    assert.throws(() => sim.restorePersistedCheckpoint(), /não encontrado ou inválido/);
    assert.equal(sim.quickLoadCheckpoint().source, 'start');
    assert.equal(sim.clearPersistedSaves(), true);
    assert.equal(storage.peek(M02_CODEX_V1_SAVE_KEY), CODEX_V1_RAW);
    assert.equal(storage.log.some(([op, key]) => op === 'get' && key === M02_CODEX_V1_SAVE_KEY), false, 'nem sequer lida');
  });

  it('um snapshot v1 (do Codex ou da bancada antiga) e um envelope v1 NÃO passam no validador v2 nem são migrados', () => {
    const codex = JSON.parse(CODEX_V1_RAW);
    const verdict = validateM02Snapshot(codex.snapshot);
    assert.equal(verdict.valid, false);
    assert.match(verdict.reason, /v1 incompatível/);
    assert.match(verdict.reason, /cod-guerra:checkpoint:m02:v1/, 'a mensagem diz que os saves do Codex ficam intactos');
    assert.equal(validateM02Snapshot(codex).valid, false, 'o envelope {version,id,snapshot} também não é um snapshot v2');

    // Um valor v1 posto à força NA CHAVE v2: a loja recusa-o (bloqueada/incompatível), não o migra nem o apaga.
    const storage = recordingStorage({ [KEY]: CODEX_V1_RAW });
    const sim = new M02BenchSimulation(SEED, { storage });
    const status = sim.saveStore.status();
    assert.equal(status.blocked, true);
    assert.equal(status.kind, 'incompatible');
    sim.saveCheckpoint('cp_m02_manual');
    assert.equal(sim.lastCheckpointPersist.ok, false);
    assert.equal(storage.peek(KEY), CODEX_V1_RAW, 'não foi migrado nem sobrescrito');
  });

  it('o construtor da loja recusa uma chave base no espaço cod-guerra:checkpoint:* (colidiria com a M01 e com o Codex)', () => {
    for (const key of [M02_CODEX_V1_SAVE_KEY, 'cod-guerra:checkpoint:m02', 'cod-guerra:checkpoint:m01:v2', 'cod-guerra:checkpoint:', '']) {
      assert.throws(() => new M02SaveStore({ key, validateSnapshot: validateM02Snapshot }), /chave base inválida/, JSON.stringify(key));
    }
    const storage = recordingStorage();
    assert.doesNotThrow(() => new M02SaveStore({ storage, key: 'cod-guerra:m02:bench:v2', validateSnapshot: validateM02Snapshot }));
    assert.doesNotThrow(() => new M02SaveStore({ storage, key: 'cod-guerra:m02:bench:teste', validateSnapshot: validateM02Snapshot }));
  });

  // Revisão adversarial: a chave base `cod-guerra:checkpoint` (SEM os dois pontos finais) não começa por `cod-guerra:checkpoint:` e
  // passava; os slots que dela derivam (`:previous`, `:staging`) caem nesse espaço e a loja escrevia e apagava chaves da M01.
  it('o construtor recusa a chave base cujos SLOTS derivados caem no espaço alheio (cod-guerra:checkpoint sem dois pontos)', () => {
    const NAMESPACE = 'cod-guerra:checkpoint:';
    const bare = 'cod-guerra:checkpoint';
    assert.throws(() => new M02SaveStore({ key: bare, validateSnapshot: validateM02Snapshot }), /chave base inválida/);
    // propriedade: qualquer chave candidata, ou é recusada, ou nenhum dos seus três slots cai no espaço da M01/Codex
    const candidates = [bare, `${bare}:`, `${bare}:previous`, `${bare}:staging`, 'cod-guerra:checkpoint:m02:v1', 'cod-guerra:checkpoint:x', 'cod-guerra:checkpointx', 'cod-guerra', 'cod-guerra:m02:bench:v2', 'cod-guerra:m02:bench:v2:previous', 'x:cod-guerra:checkpoint'];
    for (const key of candidates) {
      let store = null;
      try {
        store = new M02SaveStore({ storage: createMemoryStorage(), key, validateSnapshot: validateM02Snapshot });
      } catch (error) {
        assert.match(error.message, /chave base inválida/, key);
        continue;
      }
      for (const slot of Object.values(store.slots)) assert.equal(slot.startsWith(NAMESPACE), false, `${key} -> ${slot}`);
    }
    // controlo do dano: com uma chave aceite, gravar/limpar nunca toca em nada do espaço alheio
    const storage = recordingStorage();
    const sim = new M02BenchSimulation(SEED, { saveStore: new M02SaveStore({ storage, key: 'cod-guerra:m02:bench:v2', validateSnapshot: validateM02Snapshot }) });
    sim.saveCheckpoint('cp_m02_manual');
    sim.saveCheckpoint('cp_m02_b_teste');
    sim.saveStore.clear();
    const foreignWrites = storage.log.filter(([op, key]) => (op === 'set' || op === 'remove') && String(key).startsWith(NAMESPACE));
    assert.deepEqual(foreignWrites, []);
  });
});

describe('M02 item 0 — M02SaveStore.detectForeignSaves(): deteção só-de-leitura', () => {
  const store = (storage) => new M02SaveStore({ storage, validateSnapshot: validateM02Snapshot });

  it('lista a chave v1 do Codex e as outras chaves cod-guerra:checkpoint:m02:* com {key, bytes, looksLikeV1}; ignora M01 e o resto', () => {
    const storage = recordingStorage();
    const found = store(storage).detectForeignSaves();
    const byKey = Object.fromEntries(found.map((f) => [f.key, f]));
    assert.deepEqual(Object.keys(byKey).sort(), [
      'cod-guerra:checkpoint:m02:outro',
      'cod-guerra:checkpoint:m02:v1',
      'cod-guerra:checkpoint:m02:v1:previous',
    ]);
    assert.deepEqual(found.map((f) => f.key), Object.keys(byKey).sort(), 'ordenado por chave');
    for (const f of found) assert.deepEqual(Object.keys(f).sort(), ['bytes', 'key', 'looksLikeV1']);
    assert.equal(byKey[M02_CODEX_V1_SAVE_KEY].bytes, Buffer.byteLength(CODEX_V1_RAW, 'utf8'), 'bytes em UTF-8');
    assert.ok(byKey[M02_CODEX_V1_SAVE_KEY].bytes > CODEX_V1_RAW.length, 'o valor tem caracteres multi-byte');
    assert.equal(byKey[M02_CODEX_V1_SAVE_KEY].looksLikeV1, true);
    assert.equal(byKey['cod-guerra:checkpoint:m02:v1:previous'].looksLikeV1, true);
    assert.equal(byKey['cod-guerra:checkpoint:m02:outro'].looksLikeV1, false, 'não é JSON');
  });

  it('só chama getItem/keys: não escreve, não apaga, não migra, não mexe no estado da loja', () => {
    const storage = recordingStorage();
    const s = store(storage);
    const statusBefore = s.status();
    storage.log.length = 0;
    s.detectForeignSaves();
    s.detectForeignSaves();
    assert.deepEqual(storage.log.filter(([op]) => op === 'set' || op === 'remove'), []);
    assert.ok(storage.log.every(([op]) => op === 'get' || op === 'keys'));
    assert.deepEqual(s.status(), statusBefore);
    assertForeignUntouched(storage, 'detectForeignSaves');
  });

  it('não lista os slots da própria v2 e funciona com o sistema completo (v2 gravada ao lado do v1)', () => {
    const storage = recordingStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.saveCheckpoint('cp_m02_manual');
    sim.saveCheckpoint('cp_m02_b_test');
    const keys = sim.saveStore.detectForeignSaves().map((f) => f.key);
    assert.ok(keys.includes(M02_CODEX_V1_SAVE_KEY));
    assert.ok(keys.every((k) => !OUR_SLOTS.has(k)));
    assert.equal(sim.saveStore.status().hasSave, true);
    assertForeignUntouched(storage, 'v2 ao lado do v1');
  });

  it('sem nada estranho: lista vazia; armazenamento que lança ou sem enumeração: nunca lança (a chave v1 conhecida continua a ser verificada)', () => {
    assert.deepEqual(store(createMemoryStorage()).detectForeignSaves(), []);
    const hostile = { getItem: () => { throw new Error('SecurityError'); }, setItem() {}, removeItem() {}, keys: () => { throw new Error('x'); } };
    assert.deepEqual(store(hostile).detectForeignSaves(), []);
    const noEnum = { getItem: (k) => (k === M02_CODEX_V1_SAVE_KEY ? CODEX_V1_RAW : null), setItem() {}, removeItem() {} };
    assert.deepEqual(store(noEnum).detectForeignSaves(), [
      { key: M02_CODEX_V1_SAVE_KEY, bytes: Buffer.byteLength(CODEX_V1_RAW, 'utf8'), looksLikeV1: true },
    ]);
  });

  it('enumera pela interface do localStorage (length/key(i)) e continua só-de-leitura', () => {
    const map = new Map(Object.entries(FOREIGN));
    const ops = [];
    const local = {
      get length() { return map.size; },
      key: (i) => [...map.keys()][i] ?? null,
      getItem: (k) => { ops.push(['get', k]); return map.has(k) ? map.get(k) : null; },
      setItem: (k, v) => { ops.push(['set', k]); map.set(k, String(v)); },
      removeItem: (k) => { ops.push(['remove', k]); map.delete(k); },
    };
    const found = store(local).detectForeignSaves();
    assert.deepEqual(found.map((f) => f.key), [
      'cod-guerra:checkpoint:m02:outro',
      'cod-guerra:checkpoint:m02:v1',
      'cod-guerra:checkpoint:m02:v1:previous',
    ]);
    assert.deepEqual(ops.filter(([op]) => op !== 'get'), []);
    for (const [k, v] of Object.entries(FOREIGN)) assert.equal(map.get(k), v);
  });

  it('rótulo looksLikeV1: snapshot v1 solto (schema -v1 ou rngState) sim; JSON de outro tipo ou lixo não', () => {
    const cases = [
      [JSON.stringify({ schema: 'm02-01-bench-snapshot-v1', rngState: 5 }), true],
      [JSON.stringify({ rngState: 5, clock: 1 }), true],
      [JSON.stringify({ version: 1, id: 'cp', snapshot: {} }), true],
      [JSON.stringify({ format: 'cod-guerra-m02-bench-save', formatVersion: 2 }), false],
      [JSON.stringify([1, 2, 3]), false],
      ['null', false],
      ['"texto"', false],
      ['{truncado', false],
      ['', false],
    ];
    for (const [raw, expected] of cases) {
      const storage = createMemoryStorage({ [M02_CODEX_V1_SAVE_KEY]: raw });
      const found = store(storage).detectForeignSaves();
      assert.equal(found.length, 1, raw);
      assert.equal(found[0].looksLikeV1, expected, raw);
      assert.equal(storage.getItem(M02_CODEX_V1_SAVE_KEY), raw);
    }
  });
});

describe('M02 item 0 — guarda estática: nenhum código M02 enumera ou apaga chaves por prefixo', () => {
  const dirs = ['../src/game/', '../src/m02/', '../src/world/'];
  const files = [];
  for (const dir of dirs) {
    for (const name of readdirSync(new URL(dir, import.meta.url))) {
      if (/^m02-.*\.js$/.test(name) || dir.endsWith('/m02/')) {
        if (name.endsWith('.js')) files.push([`${dir}${name}`, readFileSync(new URL(`${dir}${name}`, import.meta.url), 'utf8')]);
      }
    }
  }

  it('há ficheiros M02 para analisar', () => {
    assert.ok(files.length >= 8);
    assert.ok(files.some(([n]) => n.endsWith('m02-save-store.js')));
  });

  it('sem localStorage.clear / storage.clear / sessionStorage / Object.keys(localStorage)', () => {
    for (const [name, text] of files) {
      const code = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      assert.doesNotMatch(code, /(localStorage|sessionStorage|storage)\.clear\s*\(/, name);
      assert.doesNotMatch(code, /sessionStorage/, name);
      assert.doesNotMatch(code, /Object\.(keys|entries)\(\s*(globalThis\.)?localStorage/, name);
    }
  });

  it('todo removeItem() da loja recebe um slot exato (slotKey, this.slots.staging, probe) — nunca uma chave calculada por prefixo', () => {
    const [, text] = files.find(([n]) => n.endsWith('m02-save-store.js'));
    const code = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const calls = [...code.matchAll(/removeItem\(([^)]*)\)/g)].map((m) => m[1].trim());
    assert.ok(calls.length >= 3);
    const allowed = new Set(['slotKey', 'this.slots.staging', 'probe', 'key']);
    for (const arg of calls) assert.ok(allowed.has(arg), `removeItem(${arg}) fora da lista permitida`);
    // A enumeração de chaves só existe na deteção só-de-leitura.
    const enumerations = [...code.matchAll(/enumerateStorageKeys\(/g)].length;
    assert.equal(enumerations, 2, 'definição + uma única utilização (detectForeignSaves)');
    for (const [name, other] of files) {
      if (name.endsWith('m02-save-store.js')) continue;
      assert.doesNotMatch(other, /removeItem\(/, `${name}: só a loja apaga`);
    }
  });
});
