// M02-FIX-2b · endurecimento do save/restauro depois da revisão adversarial (provas p01–p16 da revisão independente).
// Teste de estado (não é playtest): cada caso reproduz um defeito confirmado por execução e prova que deixou de ocorrer.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage } from '../src/game/m02-save-store.js';

const DT = 0.05;
const SEED = 19390909;

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
