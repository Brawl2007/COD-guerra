// M02 gameplay-2, revisão adversarial (6 P2): o socorro de D1 (p. 16) e as ordens de C11 (p. 14) / D4 (p. 17). Cada teste prende uma
// correção: checkpoint de uma só vez com Gruca caído, janela de socorro e transição A→B (I2, p. 33), rota de socorro exposta,
// um levantar de cada vez, socorro só a Gruca/Lis/Szymczak (Wierzba e Małek: consequência persistente). Testes de estado, não playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage } from '../src/game/m02-save-store.js';

const DT = 0.05;
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const run = (sim, seconds, controls = {}) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.tick(DT, controls);
};

/** Rajadas reais de um atirador a 4 m até o aliado cair (a via do jogo); depois o atirador fica a `farM` m, sem munição. */
function dropByBurst(sim, shooter, a, farM = 50) {
  Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, mag: 5, reserve: 40, encounterId: 'TESTE', x: a.x + 4, z: a.z, y: a.y });
  for (let i = 0; i < 100 && a.alive; i++) {
    shooter.mag = 5;
    sim.fireActorBurst(shooter, a, { x: a.x, y: a.y + 1.25, z: a.z }, 'enemy');
  }
  assert.equal(a.state, 'DOWN');
  Object.assign(shooter, { mag: 0, reserve: 0, x: a.x + farM });
}

describe('GP2-1: checkpoint de uma só vez pedido com Gruca caído não se perde em silêncio', () => {
  function grucaDownInB() {
    const sim = new M02BenchSimulation(5, { startScene: 'C01', storage: createMemoryStorage() });
    sim.enterAreaBC06();
    const g = ally(sim, 'pl_gruca');
    const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
    for (const e of sim.enemies) if (e !== shooter) kill(e);
    dropByBurst(sim, shooter, g);
    sim.drainEvents();
    return { sim, g, shooter };
  }

  it('o atalho C07 com Gruca à espera de socorro não o «evacua»; o cp_c fica adiado e grava-se, com Gruca de pé, quando é levantado', () => {
    const { sim, g, shooter } = grucaDownInB();
    sim.completeC07Reorganization();
    assert.equal(g.state, 'DOWN', 'continua caído à espera de socorro, não EVACUATED');
    assert.ok(g.rescue, 'a janela segue aberta');
    assert.equal(sim.missionFailed, null);
    assert.equal(sim.checkpointsReached.includes('cp_m02_c_reorganizacao'), false, 'nada gravado com Gruca caído');
    kill(shooter);
    run(sim, 20);
    assert.equal(g.alive, true, 'socorrido');
    assert.ok(sim.checkpointsReached.includes('cp_m02_c_reorganizacao'), 'o pedido adiado cumpriu-se');
    const saved = sim.drainEvents().find((e) => e.type === 'checkpoint-saved' && e.checkpointId === 'cp_m02_c_reorganizacao');
    assert.ok(saved);
    const snap = sim.checkpoints.get('cp_m02_c_reorganizacao');
    assert.equal(snap.allies.find((a) => a.id === 'pl_gruca').alive, true, 'o ponto de reinício tem Gruca de pé');
    assert.equal(validateM02Snapshot(snap).valid, true);
  });

  it('se o prazo acaba sem socorro, a missão falha e o pedido adiado cai com um evento checkpoint-rejected (não em silêncio)', () => {
    const { sim } = grucaDownInB();
    sim.completeC07Reorganization();
    run(sim, 200);
    assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated');
    const events = sim.drainEvents();
    assert.ok(events.some((e) => e.type === 'checkpoint-rejected' && e.checkpointId === 'cp_m02_c_reorganizacao'), 'evento claro');
    assert.equal(sim.checkpointsReached.includes('cp_m02_c_reorganizacao'), false);
  });
});
