// M02 · correções N0 da planta/tabela de vãos (docs/m02/n0/tabela-vaos.md, «Lista de problemas»).
// Teste de geometria/estado sobre os dados reais do layout; não é playtest nem aprova o N0.
// Cada grupo reproduz o defeito com o layout anterior (reconstruído em memória a partir do layout atual) e prova a correção.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage, M02_LAYOUT_SCHEMA_BY_CELL, M02_RETIRED_LAYOUT_SCHEMAS, M02_SAVE_STORAGE_KEY } from '../src/game/m02-save-store.js';
import { M02QuintaWorld } from '../src/world/m02-quinta-world.js';
import { M01Navigator } from '../src/world/m01-navigation.js';
import { movePlayer } from '../src/world/m01-player-physics.js';
import { buildOpeningsMarkdown } from '../tools/m02/openings-table.mjs';
import { loadLayout, openingGeometry, makeWorld, probePassage, lateralPassRange, PLAYER } from '../tools/m02/n0-common.mjs';

const SEED = 19390909;
const KEY = M02_SAVE_STORAGE_KEY;
const { layout } = loadLayout();
const openingById = (lay, id) => openingGeometry(lay).find((o) => o.id === id);
const building = (lay, id) => lay.buildings.find((b) => b.id === id);

/** Layout como estava antes das correções N0 (só os campos que cada grupo reverte). */
function withOldWoodpile(lay) {
  const copy = structuredClone(lay);
  const pile = copy.exteriorCovers.find((c) => c.id === 'cov_b04_woodpile');
  pile.min = [-31.5, 0, 26.2];
  pile.max = [-28.5, 1.15, 27.4];
  return copy;
}

/** Percorre a cápsula a direito, em passos de 0,1 m, de `from` até `to`; devolve se chegou e onde parou. */
function walkStraight(world, from, to, { crouched = false } = {}) {
  const p = { x: from.x, z: from.z, y: world.heightAt(from.x, from.z), crouched };
  const len = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.ceil(len / 0.1);
  for (let i = 0; i < steps; i++) {
    movePlayer(world, p, ((to.x - from.x) / len) * 0.1, ((to.z - from.z) / len) * 0.1, 1 / 60);
  }
  return { reached: Math.hypot(to.x - p.x, to.z - p.z) < 0.15, at: { x: p.x, z: p.z } };
}

describe('N0-1: door_b04_south atravessável pela cápsula do jogador e dos NPC (lenha afastada)', () => {
  const door = openingById(layout, 'door_b04_south');
  const inside = { x: door.center.x, z: door.center.z - 2.0 };
  const outside = { x: door.center.x, z: door.center.z + 3.0 };

  it('reprodução: com a lenha onde estava (x -31,5…-28,5) a passagem axial era bloqueada e o corredor livre tinha 0,04 m', () => {
    const old = withOldWoodpile(layout);
    const world = makeWorld(old, { openAll: true });
    assert.equal(probePassage(world, openingById(old, 'door_b04_south')).passes, false);
    assert.equal(probePassage(world, openingById(old, 'door_b04_south')).blockerId, 'cov_b04_woodpile');
    const lat = lateralPassRange(world, openingById(old, 'door_b04_south'));
    assert.ok(lat.max - lat.min < 0.1, `só um corredor de ${(lat.max - lat.min).toFixed(2)} m (a cápsula só passava a roçar a lenha)`);
    const { problems } = buildOpeningsMarkdown({ layout: old, sha256: 'antigo' });
    assert.ok(problems.some((p) => p.sev === 'ERRO' && p.subject === 'door_b04_south' && p.text.includes('cov_b04_woodpile')), 'o gerador continua a detetar o defeito');
  });

  it('corrigido: a cápsula (raio 0,36 m, em pé e agachada) atravessa a porta em linha reta, nos dois sentidos', () => {
    const world = makeWorld(layout, { openAll: true });
    assert.equal(PLAYER.radius, 0.36);
    assert.equal(probePassage(world, door).passes, true);
    for (const crouched of [false, true]) {
      assert.equal(walkStraight(world, inside, outside, { crouched }).reached, true, `saída (agachado=${crouched})`);
      assert.equal(walkStraight(world, outside, inside, { crouched }).reached, true, `entrada (agachado=${crouched})`);
    }
  });

  it('corrigido: o corredor livre da cápsula é a folga inteira do vão (1,0 m − Ø 0,72 m = 0,28 m), sem o monte a roubá-la', () => {
    const world = makeWorld(layout, { openAll: true });
    const lat = lateralPassRange(world, door);
    assert.ok(lat, 'há desvios laterais livres');
    assert.ok(lat.max - lat.min >= 0.26, `corredor de ${(lat.max - lat.min).toFixed(2)} m`);
    const pile = layout.exteriorCovers.find((c) => c.id === 'cov_b04_woodpile');
    const doorEast = door.center.x + door.width / 2;
    assert.ok(pile.min[0] >= doorEast + PLAYER.radius, 'a lenha começa depois da cápsula encostada ao batente este');
  });

  it('corrigido: o navegador dos NPC (mesma cápsula) encontra caminho para dentro e para fora de B04 pela porta', () => {
    const sim = new M02BenchSimulation(SEED);
    sim.world.setDoorState('door_b04_south', 'open');
    const out = sim.navigator.route({ x: -33.5, y: 0, z: 23, radius: PLAYER.radius }, { x: -28, z: 29.5 });
    assert.ok(out && out.length >= 2, 'rota de dentro para fora');
    assert.ok(out.some(([x, z]) => Math.abs(x - door.center.x) < 0.6 && Math.abs(z - door.center.z) < 1.2), 'passa pela porta');
    const back = sim.navigator.route({ x: -28, y: 0, z: 29.5, radius: PLAYER.radius }, { x: -33.5, z: 23 });
    assert.ok(back && back.length >= 2, 'rota de fora para dentro');
    // Com o layout antigo a mesma rota fica sem caminho pela porta.
    const oldWorld = new M02QuintaWorld(withOldWoodpile(layout));
    oldWorld.setDoorState('door_b04_south', 'open');
    const oldRoute = new M01Navigator(oldWorld.navWorld).route({ x: -33.5, y: 0, z: 23, radius: PLAYER.radius }, { x: -28, z: 29.5 });
    assert.ok(!oldRoute || oldRoute.length === 0 || !oldRoute.some(([x, z]) => Math.abs(x - door.center.x) < 0.6 && z > door.center.z), 'layout antigo: sem passagem pela porta');
  });

  it('a lenha continua a ser cobertura parcial exterior junto ao beiral sul (mesmas dimensões, fora do edifício)', () => {
    const pile = layout.exteriorCovers.find((c) => c.id === 'cov_b04_woodpile');
    assert.equal(pile.max[0] - pile.min[0], 3.0);
    assert.ok(Math.abs(pile.max[2] - pile.min[2] - 1.2) < 1e-9, 'profundidade 1,2 m como antes');
    assert.equal(pile.max[1], 1.15);
    const b04 = building(layout, 'B04');
    assert.ok(pile.min[2] > b04.bounds[3], 'fica a sul do edifício (z > 26)');
    assert.ok(pile.min[2] - b04.bounds[3] < 0.5, 'junto ao beiral sul');
  });
});

describe('N0 · versão de layout da Área A (m02-01-quinta-bench-v2)', () => {
  const savedSession = () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    sim.teleportPlayer(-23, -12, 0);
    sim.saveCheckpoint('cp_m02_manual');
    return { storage, sim };
  };
  const downgrade = (raw) => {
    const r = JSON.parse(raw);
    for (const c of Object.values(r.checkpoints)) c.world.layoutSchema = 'm02-01-quinta-bench-v1';
    return JSON.stringify(r);
  };

  it('o layout da Área A está na v2 e o snapshot grava essa versão', () => {
    assert.equal(layout.schema, 'm02-01-quinta-bench-v2');
    assert.equal(M02_LAYOUT_SCHEMA_BY_CELL.A, 'm02-01-quinta-bench-v2');
    const sim = new M02BenchSimulation(SEED);
    assert.equal(sim.snapshot().world.layoutSchema, 'm02-01-quinta-bench-v2');
    assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
  });

  it('a v1 está registada como retirada, com o motivo (as correções N0 mudaram a geometria/IDs)', () => {
    const why = M02_RETIRED_LAYOUT_SCHEMAS['m02-01-quinta-bench-v1'];
    assert.ok(why);
    for (const topic of [/lenha/i, /MG34/, /B01/, /B03/, /portão norte/i]) assert.match(why, topic);
  });

  it('um save v2 gravado com o layout v1 é recusado com motivo claro, sem migração, sem apagar e sem tocar no estado vivo', () => {
    const { storage } = savedSession();
    const downgraded = downgrade(storage.getItem(KEY));
    storage.setItem(KEY, downgraded);
    const page = new M02BenchSimulation(SEED, { storage });
    const before = JSON.stringify(page.snapshot());

    const loaded = page.saveStore.load();
    assert.equal(loaded.ok, false, 'nada carregável');
    assert.equal(page.saveStore.status().hasSave, false);
    const reason = loaded.rejected[0].reason;
    assert.match(reason, /Save incompatível: layout m02-01-quinta-bench-v1 da célula A, atual m02-01-quinta-bench-v2\./);
    assert.match(reason, /Motivo: a geometria da quinta/);
    assert.match(reason, /Sem migração: o save antigo não foi alterado nem apagado/);

    const snapV1 = JSON.parse(downgraded).checkpoints.cp_m02_manual;
    const verdict = validateM02Snapshot(snapV1);
    assert.equal(verdict.valid, false);
    assert.match(verdict.reason, /Motivo:/);
    assert.throws(() => page.restoreSnapshot(snapV1), /Save incompatível: layout m02-01-quinta-bench-v1/);
    assert.throws(() => page.restorePersistedCheckpoint('cp_m02_manual'), /não encontrado ou inválido/);
    assert.equal(JSON.stringify(page.snapshot()), before, 'a restauração recusada não alterou o estado vivo');

    assert.equal(page.quickLoadCheckpoint().source, 'start', 'F9 cai no início em memória');
    assert.equal(storage.getItem(KEY), downgraded, 'o registo antigo ficou byte a byte igual (não foi apagado nem migrado)');
  });

  it('gravar de novo depois de recusar um save v1: o novo checkpoint v2 é gravado e o antigo (incompatível) conservado', () => {
    const { storage } = savedSession();
    storage.setItem(KEY, downgrade(storage.getItem(KEY)));
    const page = new M02BenchSimulation(SEED, { storage });
    page.teleportPlayer(-20, -10, 0);
    page.saveCheckpoint('cp_m02_b_test');
    assert.equal(page.lastCheckpointPersist.ok, true, page.lastCheckpointPersist.reason);
    const after = JSON.parse(storage.getItem(KEY));
    assert.deepEqual(Object.keys(after.checkpoints).sort(), ['cp_m02_b_test', 'cp_m02_manual']);
    assert.equal(after.checkpoints.cp_m02_manual.world.layoutSchema, 'm02-01-quinta-bench-v1', 'o v1 não foi reescrito');
    assert.equal(after.checkpoints.cp_m02_b_test.world.layoutSchema, 'm02-01-quinta-bench-v2');
    assert.deepEqual(page.saveStore.checkpointIds(), ['cp_m02_b_test']);
  });
});
