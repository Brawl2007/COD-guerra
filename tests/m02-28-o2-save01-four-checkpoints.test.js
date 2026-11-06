// M02 O2 SAVE-01 (PDF p. 51): «Restaurar cada checkpoint com mortos, portas, cerca e carga alterados → mesmos IDs/estados/objetivos; sem
// ressurreição, respawn nem cenário reparado». Uma missão completa (MissionBot, C01 → C12, só entradas de tick) em que o teste, por
// ações reais do mundo (explosão, estado de porta), altera portas, cerca e mortos antes de cada checkpoint; os quatro checkpoints
// automáticos gravam-se pelo caminho normal e restauram-se (do índice em memória, da loja persistida e numa simulação nova).
// Teste de estado sobre a simulação (não é playtest, não aceita o ID). A cerca só existe na célula A (as células B e C não têm cercas
// destrutíveis): os checkpoints cp_b/cp_c/cp_d, gravados em B/C, não a podem transportar; as portas e os mortos são alterados em A, B e C.
import test from 'node:test';
import assert from 'node:assert/strict';

import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage } from '../src/game/m02-save-store.js';
import { MissionBot } from './m02-mission-bot.js';

// Merge M02 único: medido com o código final na missão alterada deste teste, 2, 3, 6 e 11 chegam a C12 (1 fica em C10; a 5 já não
// chegava). Fica a 2.
const SEED = 2;
const IDS = ['cp_m02_a_preparacao', 'cp_m02_b_acesso', 'cp_m02_c_reorganizacao', 'cp_m02_d_cobertura_retirada'];
const FENCE = 'cov_south_fence_west';

const withoutId = (snap) => {
  const copy = JSON.parse(JSON.stringify(snap));
  delete copy.checkpointId;
  return copy;
};
const deadEnemies = (snap) => snap.enemies.filter((e) => !e.alive).map((e) => e.id).sort();
const destroyedDoors = (snap) => Object.entries(snap.doors).filter(([, s]) => s === 'destroyed').map(([id]) => id).sort();

/** Joga a missão inteira e altera o mundo por ações reais: A (antes de sair de C01), B e C (logo que a célula ativa muda). */
function playAlteredMission() {
  const storage = createMemoryStorage();
  const sim = new M02BenchSimulation(SEED, { startScene: 'C01', storage });
  const bot = new MissionBot(sim);

  // A: uma explosão mata um hostil do estábulo B03 (e destrói a sua porta sul) e outra derruba a cerca sul; uma porta do celeiro passa a aberta
  const victim = sim.enemies.find((e) => e.id === 'DE-A10');
  sim.detonateGrenadeAt(victim.x, 0.5, victim.z, 6.5);
  sim.detonateGrenadeAt(-10, 0.5, 19.9, 6.5);
  sim.world.setDoorState('door_b02_south_door', 'open');
  assert.equal(victim.alive, false);
  assert.equal(sim.world.getFenceState(FENCE), 'breached');

  const altered = new Set(['A']);
  const alterCell = { B: ['door_b05_east_main', 'door_b06_north'], C: ['door_b10_west_gate', 'door_b11_south'] };
  for (let i = 0; i < 18000 && sim.script.sceneId !== 'C12' && !sim.script.finished; i++) {
    bot.playTick();
    const cell = sim.activeCellId;
    if (!altered.has(cell) && alterCell[cell]) {
      altered.add(cell);
      sim.world.setDoorState(alterCell[cell][0], 'destroyed');
      sim.world.setDoorState(alterCell[cell][1], sim.world.getDoorState(alterCell[cell][1]) === 'open' ? 'closed' : 'open');
    }
  }
  return { sim, storage, altered };
}

test('SAVE-01: os quatro checkpoints de uma missão completa (mortos, portas, cerca e carga alterados) restauram com o mesmo estado semântico, sem ressurreição, respawn nem cenário reparado', () => {
  const { sim, storage, altered } = playAlteredMission();
  assert.equal(sim.script.sceneId, 'C12', `a missão chegou a C12 (cena ${sim.script.sceneId}, falha ${sim.missionFailed?.reason})`);
  assert.deepEqual([...altered].sort(), ['A', 'B', 'C']);
  assert.deepEqual(IDS.filter((id) => !sim.checkpointsReached.includes(id)), [], 'os quatro checkpoints automáticos foram gravados');
  const hostilesTotal = sim.totalHostilesSpawned;

  const stored = Object.fromEntries(IDS.map((id) => [id, sim.saveStore.loadCheckpoint(id)]));
  for (const id of IDS) {
    assert.ok(stored[id], `${id} está na loja persistida`);
    assert.equal(validateM02Snapshot(stored[id]).valid, true, `${id} é um snapshot v2 válido`);
    assert.deepEqual(stored[id], sim.checkpoints.get(id), `${id}: a cópia persistida é igual à do índice em memória`);
    // contrato: nenhum checkpoint com Piotr morto ou Gruca fora de combate
    assert.ok(stored[id].player.health > 0, `${id}: Piotr vivo`);
    assert.ok(!['DOWN', 'DEAD'].includes(stored[id].allies.find((a) => a.id === 'pl_gruca').state), `${id}: Gruca em combate`);
    assert.ok(deadEnemies(stored[id]).length > 0, `${id}: há mortos`);
  }
  // as alterações estão MESMO nos checkpoints (o teste não é vazio): mortos e portas; a cerca só na célula A; a carga entregue em B/C
  assert.ok(deadEnemies(stored.cp_m02_a_preparacao).includes('DE-A10'));
  assert.equal(stored.cp_m02_a_preparacao.fences[FENCE], 'breached');
  assert.equal(stored.cp_m02_b_acesso.fences[FENCE], 'breached');
  assert.ok(destroyedDoors(stored.cp_m02_a_preparacao).includes('door_b03_south'));
  assert.equal(stored.cp_m02_a_preparacao.doors.door_b02_south_door, 'open');
  assert.equal(stored.cp_m02_c_reorganizacao.doors.door_b05_east_main, 'destroyed');
  assert.equal(stored.cp_m02_d_cobertura_retirada.doors.door_b10_west_gate, 'destroyed');
  assert.deepEqual(Object.keys(stored.cp_m02_c_reorganizacao.fences), [], 'B não tem cercas destrutíveis');
  assert.deepEqual(stored.cp_m02_c_reorganizacao.areaB.supplyCart.volumes.map((v) => v.state), ['DELIVERED', 'DELIVERED'], 'carga entregue (cp_c)');
  assert.deepEqual(stored.cp_m02_a_preparacao.areaB.supplyCart.volumes.map((v) => v.state), ['ON_CART', 'ON_CART'], 'carga ainda na carroça (cp_a)');
  assert.deepEqual(IDS.map((id) => stored[id].activeCellId), ['A', 'A', 'B', 'C']);

  for (const id of IDS) {
    const reference = withoutId(stored[id]);
    // (1) na MESMA simulação, já no fim da missão (célula C, tudo alterado): F9 do índice em memória repõe o estado do checkpoint
    sim.restoreCheckpoint(id);
    assert.deepEqual(withoutId({ ...sim.snapshot(), checkpointId: id }), reference, `${id}: estado semântico igual (mesma simulação, índice em memória)`);

    // (2) numa simulação nova, a partir da loja persistida, o que acontece depois de recarregar a página
    const fresh = new M02BenchSimulation(SEED, { startScene: 'C01', storage });
    fresh.restorePersistedCheckpoint(id);
    assert.deepEqual(withoutId({ ...fresh.snapshot(), checkpointId: id }), reference, `${id}: estado semântico igual (simulação nova, loja persistida)`);
    assert.equal(fresh.activeCellId, stored[id].activeCellId);
    assert.deepEqual(fresh.objective, stored[id].objective, `${id}: mesmo objetivo`);
    assert.equal(fresh.script.sceneId, stored[id].script.sceneId, `${id}: mesma cena`);
    assert.deepEqual(fresh.enemies.map((e) => [e.id, e.alive, e.state]), stored[id].enemies.map((e) => [e.id, e.alive, e.state]), `${id}: mesmos IDs e estados dos hostis`);
    assert.deepEqual(fresh.allies.map((a) => [a.id, a.alive, a.state]), stored[id].allies.map((a) => [a.id, a.alive, a.state]), `${id}: mesmos aliados`);
    assert.deepEqual(fresh.checkpointsReached, stored[id].checkpointsReached);

    // (3) a continuação não ressuscita, não repõe e não repara
    const deadBefore = deadEnemies(stored[id]);
    const doorsBefore = destroyedDoors(stored[id]);
    const countBefore = fresh.enemies.length;
    const bot = new MissionBot(fresh);
    for (let i = 0; i < 300; i++) bot.playTick(); // 30 s simulados
    for (const deadId of deadBefore) assert.equal(fresh.enemies.find((e) => e.id === deadId)?.alive, false, `${id}: ${deadId} continua morto`);
    if (fresh.activeCellId === stored[id].activeCellId) {
      assert.equal(fresh.enemies.length, countBefore, `${id}: nenhum hostil novo`);
      for (const doorId of doorsBefore) assert.equal(fresh.world.getDoorState(doorId), 'destroyed', `${id}: ${doorId} continua destruída`);
      if (stored[id].fences[FENCE]) assert.equal(fresh.world.getFenceState(FENCE), 'breached', `${id}: a cerca não é reparada`);
    }
    assert.ok(fresh.totalHostilesSpawned <= hostilesTotal, `${id}: sem respawn (hostis gerados ${fresh.totalHostilesSpawned})`);
  }
});
