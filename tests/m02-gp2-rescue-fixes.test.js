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

describe('GP2-2: a janela de socorro não atravessa TR01 (I2, p. 33: resolver explicitamente as ações em curso e evacuar feridos)', () => {
  function casualtyInA(id, { rescuer = false } = {}) {
    const sim = new M02BenchSimulation(5, { startScene: 'C01', storage: createMemoryStorage() });
    for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
    const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
    for (const e of sim.enemies) if (e !== shooter) kill(e);
    const c = ally(sim, id);
    Object.assign(c, { x: 30, z: -60, y: sim.world.heightAt(30, -60), crouched: false });
    dropByBurst(sim, shooter, c, 60); // um hostil a ver o caído: o local é inseguro, a janela fica aberta
    run(sim, 1);
    if (rescuer) Object.assign(c.rescue, { by: 'pl_wierzba', liftStartedAt: null }); // um socorro em curso no instante da transição
    sim.drainEvents();
    return { sim, c, shooter };
  }

  it('Szymczak caído com a janela aberta e um socorrista a caminho: na transição é evacuado (EVACUATED), a janela fecha-se, o socorro interrompe-se (transition) e o payload T-AB diz o mesmo', () => {
    const { sim, c } = casualtyInA('pl_szymczak', { rescuer: true });
    assert.ok(c.rescue?.by);
    sim.enterAreaBC06();
    assert.equal(c.state, 'EVACUATED');
    assert.equal(c.rescue, null);
    const st = sim.transitionTABPayload.squadStatuses.pl_szymczak;
    assert.deepEqual({ state: st.state, alive: st.alive, rescue: st.rescue }, { state: 'EVACUATED', alive: false, rescue: { resolution: 'evacuated' } });
    const ev = sim.drainEvents();
    assert.ok(ev.some((e) => e.type === 'rescue-aborted' && e.actorId === 'pl_szymczak' && e.reason === 'transition'));
    assert.ok(ev.some((e) => e.type === 'rescue-window-expired' && e.actorId === 'pl_szymczak' && e.reason === 'transition_evacuated'));
    assert.equal(sim.combatLog.filter((e) => e.type === 'casualty_evacuated' && e.actorId === 'pl_szymczak').length, 1);
    // na Área B nunca é levantado
    sim.enemies.forEach(kill);
    run(sim, 20);
    assert.equal(c.alive, false);
    assert.equal(c.state, 'EVACUATED');
    assert.equal(sim.combatLog.filter((e) => e.type === 'ally_rescued').length, 0);
  });

  it('Wierzba caído (sem socorro, D1 p. 16) também é evacuado na transição e o estado de campanha diz-o', () => {
    const { sim, c } = casualtyInA('pl_wierzba');
    assert.equal(c.rescue ?? null, null);
    sim.enterAreaBC06();
    assert.equal(c.state, 'EVACUATED');
    assert.equal(sim.flags['m02.wierzba_status'], 'evacuated');
    run(sim, 2);
    assert.equal(sim.flags['m02.wierzba_status'], 'evacuated', 'o contexto tático não o repõe em «down»');
    assert.equal(sim.transitionTABPayload.squadStatuses.pl_wierzba.state, 'EVACUATED');
  });

  it('caído depois de o payload T-AB estar feito (C05): a entrada em B resolve-o e atualiza o payload', () => {
    const sim = new M02BenchSimulation(5, { startScene: 'C01', storage: createMemoryStorage() });
    for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
    sim.triggerTransitionTAB({ skip: true });
    assert.equal(sim.transitionTABPayload.squadStatuses.pl_lis.state, 'ACTIVE');
    const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
    for (const e of sim.enemies) if (e !== shooter) kill(e);
    const lis = ally(sim, 'pl_lis');
    dropByBurst(sim, shooter, lis, 60);
    assert.ok(lis.rescue);
    sim.enterAreaBC06();
    assert.equal(lis.state, 'EVACUATED');
    assert.equal(lis.rescue, null);
    assert.equal(sim.transitionTABPayload.squadStatuses.pl_lis.state, 'EVACUATED');
    assert.deepEqual(sim.transitionTABPayload.squadStatuses.pl_lis.rescue, { resolution: 'evacuated' });
  });

  it('Gruca (exigido) com a janela aberta não é evacuado (seria falha): mantém o caído e o prazo absoluto; o socorro em curso suspende-se e o payload regista kept_open', () => {
    const { sim, c } = casualtyInA('pl_gruca', { rescuer: true });
    const deadline = c.rescue.deadlineAt;
    sim.enterAreaBC06();
    assert.equal(c.state, 'DOWN');
    assert.equal(c.rescue.deadlineAt, deadline, 'o prazo é absoluto');
    assert.equal(c.rescue.by, null);
    assert.equal(c.rescue.liftStartedAt, null);
    assert.deepEqual(sim.transitionTABPayload.squadStatuses.pl_gruca.rescue, { resolution: 'kept_open', deadlineAt: deadline });
    assert.ok(sim.drainEvents().some((e) => e.type === 'rescue-aborted' && e.actorId === 'pl_gruca' && e.reason === 'transition'));
    assert.equal(sim.missionFailed, null);
  });
});
