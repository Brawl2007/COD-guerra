// M02 gameplay-2, revisão adversarial (itens 3, 4 e [E]): a rota do socorrista e a postura de pé contam (C11 p. 14, D4 p. 17); um levantar
// de cada vez pelo Piotr e o [E] não tira a vez a um levantar da IA em curso (D1 p. 16); o [E] age sobre o alvo mais próximo. Testes de
// estado (rajadas reais para derrubar; a linha de vista é substituída só onde o teste precisa de geometria que o campo aberto não tem).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { RESCUE_LIFT_SEC, RESCUE_ROUTE_SAMPLE_M, rescueRouteIsSafe, rescueSpotIsSafe } from '../src/game/m02-combat-ai.js';

const DT = 0.05;
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const run = (sim, seconds, controls = {}) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.tick(DT, controls);
};
const ofType = (sim, type) => sim.combatLog.filter((e) => e.type === type);
const place = (sim, actor, x, z) => Object.assign(actor, { x, z, y: sim.world.heightAt(x, z), goal: null, navCorners: null });
const armed = (shooter) => Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, mag: 0, reserve: 0 });

/** Campo aberto da quinta sem combate: secção desarmada, só um «atirador» (Kar98k) que o teste coloca, Piotr longe a oeste. */
function field() {
  const sim = new M02BenchSimulation(19390909);
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
  const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
  for (const e of sim.enemies) if (e !== shooter) kill(e);
  shooter.encounterId = 'TESTE';
  sim.teleportPlayer(-40, -60, 0);
  return { sim, shooter };
}

/** Rajadas reais do atirador a 4 m até o aliado cair; depois fica a `farM` m, vivo, sem munição (vê o caído mas não dispara). */
function fallAt(sim, shooter, id, x, z, farM = 60) {
  const a = ally(sim, id);
  place(sim, a, x, z);
  a.crouched = false;
  Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, mag: 5, reserve: 40, x: x + 4, z, y: sim.world.heightAt(x + 4, z) });
  for (let i = 0; i < 100 && a.alive; i++) {
    shooter.mag = 5;
    sim.fireActorBurst(shooter, a, { x: a.x, y: a.y + 1.25, z: a.z }, 'enemy');
  }
  assert.equal(a.state, 'DOWN');
  Object.assign(shooter, { mag: 0, reserve: 0 });
  place(sim, shooter, x + farM, z);
  return a;
}

/** Substitui a linha de vista do mundo por `fn(from, to, orig)`; devolve o restauro. */
function stubLineOfSight(sim, fn) {
  const orig = sim.world.lineOfSight.bind(sim.world);
  sim.world.lineOfSight = (from, to, opts) => fn(from, to, orig, opts);
  return () => {
    sim.world.lineOfSight = orig;
  };
}

describe('GP2-3: a rota do socorrista e a postura de pé também contam (C11 p. 14, D4 p. 17)', () => {
  // o caído está oculto (qualquer postura); os pontos do percurso a mais de 8 m dele estão à vista do hostil
  const exposedRoute = (sim, g) => (from, to, orig) => {
    if (Math.hypot(to.x - g.x, to.z - g.z) < 0.5) return false;
    return Math.hypot(to.x - g.x, to.z - g.z) > 8 ? true : orig(from, to);
  };

  it('local do caído a salvo mas o percurso exposto: o socorrista IA não avança; quando a rota fica livre, vai', () => {
    const { sim, shooter } = field();
    const g = fallAt(sim, shooter, 'pl_gruca', 30, -60);
    const med = ally(sim, 'pl_szymczak');
    place(sim, med, 30, -30); // 30 m a norte: a rota de socorro é o troço z -30 → -60
    place(sim, shooter, 60, -60);
    const restore = stubLineOfSight(sim, exposedRoute(sim, g));
    assert.equal(rescueSpotIsSafe(sim, g), true, 'o ponto do caído, sozinho, estaria seguro');
    assert.equal(rescueRouteIsSafe(sim, med, g), false, 'mas a rota de Szymczak até ele está exposta');
    run(sim, 3);
    assert.equal(g.rescue.by, null, 'ninguém é escolhido');
    assert.equal(ofType(sim, 'rescue_started').length, 0);
    restore();
    kill(shooter);
    run(sim, 1);
    assert.equal(g.rescue.by, 'pl_szymczak', 'com a rota livre vai');
  });

  it('a caminho, se a rota que lhe resta fica exposta o socorrista desiste (unsafe)', () => {
    const { sim, shooter } = field();
    const g = fallAt(sim, shooter, 'pl_gruca', 30, -60);
    kill(shooter);
    const med = ally(sim, 'pl_szymczak');
    place(sim, med, 30, -30);
    run(sim, 0.5);
    assert.equal(g.rescue.by, 'pl_szymczak');
    assert.equal(g.rescue.liftStartedAt, null, 'ainda a caminho');
    armed(shooter);
    place(sim, shooter, 60, -60);
    stubLineOfSight(sim, exposedRoute(sim, g));
    run(sim, 0.2);
    assert.equal(g.rescue.by, null);
    assert.deepEqual(ofType(sim, 'rescue_aborted').map((e) => [e.byId, e.reason]), [['pl_szymczak', 'unsafe']]);
  });

  it('o ponto do caído só é seguro se o for também de pé (ergue-se ao ser levantado): visível de pé e não de joelhos é inseguro', () => {
    const { sim, shooter } = field();
    const g = fallAt(sim, shooter, 'pl_gruca', 30, -60);
    place(sim, shooter, 90, -60);
    const restore = stubLineOfSight(sim, (from, to) => to.crouched !== true); // só vê quem está de pé
    assert.equal(rescueSpotIsSafe(sim, g), false);
    sim.teleportPlayer(g.x - 1.5, g.z, 0);
    assert.equal(sim.currentRescuePrompt().safe, false);
    assert.equal(sim.interactDoor(), null);
    restore();
    kill(shooter);
    assert.equal(rescueSpotIsSafe(sim, g), true);
  });

  it('a rota é amostrada ao longo de todo o percurso (RESCUE_ROUTE_SAMPLE_M): exposta só a meio já conta', () => {
    const { sim, shooter } = field();
    const g = fallAt(sim, shooter, 'pl_gruca', 30, -60);
    const med = ally(sim, 'pl_szymczak');
    place(sim, med, 30, -20);
    kill(shooter);
    assert.equal(rescueRouteIsSafe(sim, med, g), true);
    assert.ok(RESCUE_ROUTE_SAMPLE_M <= 4);
    armed(shooter);
    place(sim, shooter, 60, -40);
    stubLineOfSight(sim, (from, to) => Math.abs(to.z - -40) < 1.2); // uma faixa estreita a meio do percurso
    assert.equal(rescueRouteIsSafe(sim, med, g), false);
  });
});

describe('GP2-4: um levantar de cada vez pelo Piotr; o [E] não tira a vez a um levantar da IA em curso', () => {
  it('Piotr a levantar um caído e a carregar [E] ao lado de outro: o segundo não começa; acabado o primeiro, pode começar o segundo', () => {
    const { sim, shooter } = field();
    const g = fallAt(sim, shooter, 'pl_gruca', 30, -60);
    const l = fallAt(sim, shooter, 'pl_lis', 31.6, -60);
    kill(shooter);
    for (const id of ['pl_szymczak', 'pl_wierzba', 'pl_malek']) Object.assign(ally(sim, id), { alive: false, state: 'DOWN', health: 0, rescue: null });
    sim.teleportPlayer(30.8, -61.2, 0);
    const first = sim.interactDoor();
    assert.equal(first.actorId, 'pl_gruca');
    sim.teleportPlayer(31.5, -61.3, 0); // agora Lis é o mais próximo
    const prompt = sim.currentRescuePrompt();
    assert.equal(prompt.actorId, 'pl_gruca', 'a prioridade é de quem está a ser levantado');
    assert.equal(prompt.lifting, true);
    assert.equal(sim.interactDoor(), null);
    assert.equal(l.rescue.by, null, 'Lis não foi tocado');
    assert.equal(ofType(sim, 'rescue_started').filter((e) => e.phase === 'lift').length, 1);
    run(sim, RESCUE_LIFT_SEC + 0.3);
    assert.equal(g.alive, true);
    assert.equal(l.alive, false);
    assert.equal(sim.interactDoor()?.actorId, 'pl_lis', 'acabado o primeiro, o segundo pode começar');
    run(sim, RESCUE_LIFT_SEC + 0.3);
    assert.equal(l.alive, true);
  });

  it('o [E] não tira a vez a um levantar da IA já em curso (não recomeça a contagem): o aliado acaba no tempo dele', () => {
    const { sim, shooter } = field();
    const g = fallAt(sim, shooter, 'pl_gruca', 30, -60);
    kill(shooter);
    const med = ally(sim, 'pl_szymczak');
    place(sim, med, g.x, g.z + 3);
    let guard = 0;
    while (g.rescue?.liftStartedAt == null && guard++ < 400) sim.tick(DT, {});
    const liftStart = g.rescue.liftStartedAt;
    run(sim, RESCUE_LIFT_SEC - 0.3);
    sim.teleportPlayer(g.x - 1.5, g.z, 0);
    const prompt = sim.currentRescuePrompt();
    assert.equal(prompt.allyLifting, true);
    assert.match(prompt.prompt, /Szymczak está a levantar/);
    assert.equal(sim.interactDoor(), null, 'não toma a vez');
    assert.equal(g.rescue.by, 'pl_szymczak');
    assert.equal(g.rescue.liftStartedAt, liftStart, 'o progresso mantém-se');
    run(sim, 0.6);
    assert.equal(g.alive, true, 'levantado no tempo do aliado (RESCUE_LIFT_SEC desde o início dele)');
    const done = ofType(sim, 'ally_rescued')[0];
    assert.equal(done.byId, 'pl_szymczak');
    assert.ok(Math.abs(done.clock - (liftStart + RESCUE_LIFT_SEC)) < 0.2);
  });
});

describe('[E] age sobre o alvo mais próximo, não só sobre o caído', () => {
  const seesCasualty = (sim) => stubLineOfSight(sim, (from, to, orig) => (to.crouched === undefined ? orig(from, to) : true));
  const faceDoor = (sim) => {
    for (let k = 0; k < 64; k++) {
      sim.player.angle = (k * Math.PI * 2) / 64;
      if (sim.currentDoorPrompt()) return true;
    }
    return false;
  };

  it('um caído à vista de um hostil a ≤ 2,2 m de Piotr já não impede abrir a porta mais próxima (e o aviso mostra o mesmo alvo)', () => {
    const { sim, shooter } = field();
    const door = sim.world.doors.find((d) => d.id === 'door_b02_south_door'); // (30, -24), fechada
    assert.equal(door.state, 'closed');
    const g = fallAt(sim, shooter, 'pl_gruca', 31.6, -22.4);
    seesCasualty(sim);
    sim.teleportPlayer(30, -23.2, 0);
    assert.ok(faceDoor(sim), 'a porta é visível a Piotr');
    assert.ok(Math.hypot(g.x - sim.player.x, g.z - sim.player.z) <= 2.2);
    assert.equal(sim.currentRescuePrompt().safe, false, 'o caído está à vista (socorro adiado)');
    assert.equal(sim.currentInteractPrompt().kind, 'door', 'a porta é mais próxima');
    const evt = sim.interactDoor();
    assert.equal(evt?.type, 'door-toggled');
    assert.equal(evt.doorId, 'door_b02_south_door');
  });

  it('com o caído mais próximo que a porta, o [E] continua a ser sobre o caído (nada se faz enquanto não é seguro)', () => {
    const { sim, shooter } = field();
    const g = fallAt(sim, shooter, 'pl_gruca', 30.4, -22.6);
    seesCasualty(sim);
    sim.teleportPlayer(30, -22.4, 0);
    faceDoor(sim);
    assert.equal(sim.currentInteractPrompt().kind, 'rescue');
    assert.equal(sim.interactDoor(), null);
    assert.equal(g.rescue.by, null);
  });
});
