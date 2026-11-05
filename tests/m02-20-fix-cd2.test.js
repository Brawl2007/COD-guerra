// M02 FIX-CD2 · defeitos residuais confirmados por execução numa verificação independente (a seguir ao FIX-CD).
// O item 1 (graça F1 independente do dt) está em tests/m02-19-fix-cd.test.js (bloco FIX-CD 5). Teste de estado, NÃO é playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage } from '../src/game/m02-save-store.js';
import { isPlayerSheltered } from '../src/game/m02-acts-director.js';

const killAll = (actors) => {
  for (const e of actors) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
};
const ofType = (events, type) => events.filter((e) => e.type === type);

describe('FIX-CD2 2: KeyM cujo SP03 forçado mata Piotr não conclui a missão nem exporta concluída', () => {
  function weakPiotrAtGate() {
    const sim = new M02BenchSimulation(4243, { storage: createMemoryStorage() });
    sim.enterAreaCC09({ skipTransition: true });
    sim.player.health = 40;
    sim.teleportPlayer(4, 18);
    sim.drainEvents();
    return sim;
  }

  it('completeC12Epilogue devolve null, regista piotr_killed e deixa m02.completed falso', () => {
    const sim = weakPiotrAtGate();
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg, null);
    assert.equal(sim.player.health, 0, 'o SP03 forçado matou Piotr (pré-condição da prova)');
    assert.equal(sim.missionFailed?.reason, 'piotr_killed');
    assert.equal(sim.flags['m02.completed'], false);
    assert.equal(sim.areaC.c12Completed ?? false, false);
    assert.equal(sim.objective?.status === 'completed', false);
    assert.equal(sim.exportCampaignResultToM03().completed, false);
    assert.equal(ofType(sim.drainEvents(), 'mission-failed').length, 1);
    for (let i = 0; i < 5; i++) sim.tick(0.1, {});
    assert.equal(sim.flags['m02.completed'], false);
    assert.equal(sim.exportCampaignResultToM03().completed, false);
  });

  it('com Piotr vivo a mesma chamada conclui como antes', () => {
    const sim = new M02BenchSimulation(4243, { storage: createMemoryStorage() });
    sim.enterAreaCC09({ skipTransition: true });
    sim.teleportPlayer(0, -40);
    const pkg = sim.completeC12Epilogue();
    assert.equal(sim.missionFailed, null);
    assert.equal(pkg.completed, true);
    assert.equal(sim.flags['m02.completed'], true);
  });
});

describe('FIX-CD2 3: o «abrigo válido» do cp_d conta as granadas do próprio jogador em voo', () => {
  const CP_D = 'cp_m02_d_cobertura_retirada';
  function c10WithGrenadeAtFeet(seed = 19390909) {
    const sim = new M02BenchSimulation(seed, { storage: createMemoryStorage() });
    sim.enterAreaCC09({ skipTransition: true });
    killAll(sim.enemies);
    sim.teleportPlayer(0, -40);
    sim.areaC.gateLatchUnlocked = true;
    const g = sim.throwGrenade({ x: sim.player.x, y: sim.player.y + 1.5, z: sim.player.z }, { x: 0, y: -1, z: 0 });
    assert.ok(g);
    sim.drainEvents();
    sim.startC10OrderChanges();
    killAll(sim.enemies.filter((e) => e.encounterId === 'EC2'));
    return sim;
  }

  it('com a granada aos pés Piotr não está abrigado e o cp_d não se grava; depois de rebentar grava-se sem granadas em voo', () => {
    const sim = c10WithGrenadeAtFeet();
    for (let i = 0; i < 5; i++) {
      sim.tick(0.1, {});
      assert.equal(isPlayerSheltered(sim), false, `tick ${i}`);
    }
    assert.equal(sim.checkpoints.has(CP_D), false, 'antes: gravado com a granada em voo e o restauro ferido');
    for (let i = 0; i < 40 && !sim.checkpoints.has(CP_D); i++) sim.tick(0.1, {});
    const cp = sim.checkpoints.get(CP_D);
    assert.ok(cp, 'grava-se quando a granada já rebentou');
    assert.equal(cp.grenades.length, 0);
    assert.ok(cp.player.health > 0);
  });

  it('uma granada lançada para longe (fora do raio + margem) não tira o abrigo', () => {
    const sim = new M02BenchSimulation(19390909, { storage: createMemoryStorage() });
    sim.enterAreaCC09({ skipTransition: true });
    killAll(sim.enemies);
    sim.teleportPlayer(0, -40);
    sim.throwGrenade({ x: 0, y: 1.5, z: -10 }, { x: 0, y: 1, z: 0 });
    assert.equal(isPlayerSheltered(sim), true);
  });
});
