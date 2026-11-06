// M02 O2 AI-03 (PDF p. 50): «Derrubar cobertura, bloquear portal, incapacitar líder de grupo → replaneamento/cedência; sem deadlock
// irreversível; liderança por regra explícita». O portal estreito de dois aliados já estava coberto (tests/m02-02). Aqui: cobertura
// derrubada (cerca e porta) e a reação da IA, tráfego de vários atores numa porta estreita e o líder (Gruca) incapacitado.
// Testes de estado sobre a simulação (não são playtest, não aceitam o ID).
import test from 'node:test';
import assert from 'node:assert/strict';

import { M02BenchSimulation, describeMissionFailure } from '../src/game/m02-01-simulation.js';
import { stepActorNavigation, RESCUE_WINDOW_SEC } from '../src/game/m02-combat-ai.js';

const SEED = 19390909;
const DT = 0.05;
const enemy = (sim, id) => sim.enemies.find((e) => e.id === id);
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const FENCE = 'cov_south_fence_west'; // z = 19,95, x -22..-3, 1,15 m de altura (madeira fina, destrutível)
const DOOR = 'door_b01_east_main';
const routeLen = (route, from) => {
  if (!route || !route.length) return null;
  let len = 0;
  let prev = from; // a rota não inclui o ponto de partida
  for (const c of route) {
    const p = Array.isArray(c) ? { x: c[0], z: c[1] } : c;
    if (prev) len += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  return len;
};

/**
 * Um Kar98k (DE-A12) de cócoras do lado sul de uma cobertura e Piotr de cócoras do lado norte; os restantes hostis ficam longe (fora do alcance e
 * sem linha de vista) para que só conte este par. `breach` descreve como a cobertura cai (ou null).
 */
function coverDuel() {
  const sim = new M02BenchSimulation(SEED);
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 }); // a secção está longe; desarmada para só contar este par
  for (const e of sim.enemies) if (e.id !== 'DE-A12') Object.assign(e, { x: -400, z: 400, goal: null });
  const sh = enemy(sim, 'DE-A12');
  Object.assign(sh, { x: -10, z: 30, y: 0, crouched: true, eyeHeight: 1.08, goal: null, reserveShifted: 'x', facing: -Math.PI / 2 });
  sim.teleportPlayer(-10, 10, -Math.PI / 2);
  sim.player.crouched = true;
  sim.player.eyeHeight = 1.08;
  return { sim, sh };
}

test('AI-03 cobertura derrubada (cerca): com a cerca intacta o hostil não vê nem dispara; derrubada por uma explosão, deixa de proteger e ele reage (vê, dispara, a rota encurta)', () => {
  const { sim, sh } = coverDuel();
  assert.equal(sim.world.getFenceState(FENCE), 'intact');
  assert.equal(sim.world.lineOfSight(sh, sim.player, { includeFoliage: true }), false, 'a cerca protege os dois (de cócoras)');
  const before = routeLen(sim.navigator.route({ x: sh.x, y: 0, z: sh.z, radius: 0.36 }, { x: sim.player.x, z: sim.player.z }), sh);
  assert.ok(before > 24, `com a cerca intacta a rota contorna-a pelo portão (${before?.toFixed(1)} m)`);

  for (let i = 0; i < 60; i++) sim.tick(DT, {}); // 3 s ao abrigo
  assert.equal(sh.state, 'HOLD_SECTOR');
  assert.equal(sh.seeingTargetId, null);
  assert.equal(sh.shotsFired, 0, 'sem linha de vista não há tiro através da cerca');
  assert.equal(sim.player.health, 100);

  const blast = sim.detonateGrenadeAt(-10, 0.5, 19.9, 6.5); // a 10 m de cada um: ninguém no raio
  assert.deepEqual(blast.worldChanges.breachedFences, [FENCE]);
  assert.deepEqual(blast.affectedActors, [], 'a explosão só derrubou a cobertura');
  assert.equal(sim.world.getFenceState(FENCE), 'breached');
  assert.equal(sim.world.lineOfSight(sh, sim.player, { includeFoliage: true }), true, 'derrubada, já não protege');
  const after = routeLen(sim.navigator.route({ x: sh.x, y: 0, z: sh.z, radius: 0.36 }, { x: sim.player.x, z: sim.player.z }), sh);
  assert.ok(after !== null && after < before - 1, `replaneamento: a rota passa a ser direta (${after?.toFixed(1)} m < ${before.toFixed(1)} m)`);

  for (let i = 0; i < 60; i++) sim.tick(DT, {});
  assert.equal(sh.state, 'ENGAGE_VISIBLE', 'o hostil reage à cobertura caída');
  assert.equal(sh.seeingTargetId, 'piotr_sokol');
  assert.ok(sh.shotsFired > 0, 'e dispara');
  assert.ok(sim.combatLog.some((e) => e.type === 'enemy_suppressed_ally' && e.shooterId === 'DE-A12'), 'com o efeito registado (supressão de Piotr)');
});

test('AI-03 cobertura derrubada (porta): uma porta fechada esconde o hostil; destruída, deixa de proteger e a IA reage', () => {
  const sim = new M02BenchSimulation(SEED);
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 }); // a secção vê B01 pelas janelas abertas: desarmada para só contar este par
  for (const e of sim.enemies) if (e.id !== 'DE-A12') Object.assign(e, { x: -400, z: 400, goal: null });
  const sh = enemy(sim, 'DE-A12');
  Object.assign(sh, { x: -29, z: -15.5, y: 0, goal: null, reserveShifted: 'x', facing: 0 }); // dentro de B01, de frente para a porta
  sim.teleportPlayer(-21, -15.5, Math.PI);
  assert.equal(sim.world.getDoorState(DOOR), 'closed');
  for (let i = 0; i < 40; i++) sim.tick(DT, {});
  assert.equal(sh.seeingTargetId, null);
  assert.equal(sh.shotsFired, 0, 'a porta fechada protege');
  sim.world.setDoorState(DOOR, 'destroyed');
  sim.navigator.sync();
  for (let i = 0; i < 40; i++) sim.tick(DT, {});
  assert.equal(sh.state, 'ENGAGE_VISIBLE');
  assert.ok(sh.shotsFired > 0, 'sem a porta, dispara');
});

test('AI-03 sem deadlock num sítio estreito: seis atores em sentidos opostos atravessam uma porta de 1 m (fila indiana) e chegam todos; a porta abre-se sozinha e ninguém fica à espera', () => {
  const sim = new M02BenchSimulation(SEED);
  const team = sim.allies.filter((a) => a.id !== 'pl_aux_02'); // 6 atores
  const DOOR_NS = 'door_b01_north_service'; // 1 m, fechada, parede norte da cozinha de B01
  assert.equal(sim.world.getDoorState(DOOR_NS), 'closed');
  const inGoals = [[-38.5, -15.5], [-37, -14.5], [-35.5, -15.5]]; // do exterior (norte) para a cozinha
  const outGoals = [[-38, -23], [-36, -23.5], [-37, -24.5]]; // da cozinha para o exterior
  team.forEach((a, i) => {
    const going = i < 3 ? inGoals[i] : outGoals[i - 3];
    const start = i < 3 ? { x: -37 + (i - 1) * 0.1, z: -19.6 - i * 0.9 } : { x: -37 + (i - 4) * 0.1, z: -16.3 + (i - 3) * 0.9 };
    Object.assign(a, { ...start, y: 0, goal: { x: going[0], z: going[1], crouch: false }, navCorners: null });
  });
  const arrivedAt = new Map();
  let waited = 0;
  for (let i = 0; i < Math.round(60 / DT); i++) {
    for (const a of team) stepActorNavigation(sim, a, DT);
    sim.clock += DT;
    for (const a of team) {
      if (a.waitingForDoorId) waited += 1;
      if (!arrivedAt.has(a.id) && Math.hypot(a.x - a.goal.x, a.z - a.goal.z) < 0.7) arrivedAt.set(a.id, Number(sim.clock.toFixed(2)));
    }
    if (arrivedAt.size === team.length) break;
  }
  assert.equal(arrivedAt.size, team.length, `todos chegam; em falta: ${team.filter((a) => !arrivedAt.has(a.id)).map((a) => a.id)}`);
  assert.ok(Math.max(...arrivedAt.values()) < 30, `sem deadlock: o último chega a ${Math.max(...arrivedAt.values())} s`);
  assert.ok(waited > 0, 'houve fila: alguém esperou a sua vez (cedência) em vez de atravessar o outro');
  assert.equal(sim.world.getDoorState(DOOR_NS), 'open', 'a porta foi aberta por quem a atravessou');
  assert.ok(team.every((a) => !a.waitingForDoorId || a.waitingForDoorId === null || arrivedAt.has(a.id)), 'ninguém ficou preso à espera');
});

test('AI-03 líder incapacitado: com Gruca caído e a janela de socorro aberta a secção não bloqueia (os restantes continuam a disparar), não há sucessão de liderança, e a regra D1 é explícita (janela visível, prazo, falha clara)', () => {
  const sim = new M02BenchSimulation(SEED);
  sim.player.crouched = true;
  sim.player.eyeHeight = 1.08;
  for (let i = 0; i < 200; i++) sim.tick(DT, {}); // 10 s de combate normal
  const gruca = ally(sim, 'pl_gruca');
  assert.equal(gruca.state, 'ACTIVE');
  const gruca0 = { x: gruca.x, z: gruca.z };
  // Gruca cai a tiro real (a via do jogo: fireActorBurst) de um fuzileiro a 4 m
  const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
  const home = { x: shooter.x, z: shooter.z, y: shooter.y };
  Object.assign(shooter, { x: gruca.x + 4, z: gruca.z, y: gruca.y });
  for (let i = 0; i < 80 && gruca.alive; i++) {
    shooter.mag = 5;
    sim.fireActorBurst(shooter, gruca, { x: gruca.x, y: gruca.y + 1.25, z: gruca.z }, 'enemy');
  }
  Object.assign(shooter, home);
  assert.equal(gruca.state, 'DOWN');
  assert.ok(gruca.rescue, 'a janela de socorro abre-se e é visível (não é imunidade oculta)');
  assert.equal(sim.rescueStatus()[0].actorId, 'pl_gruca');
  assert.equal(sim.rescueStatus()[0].required, true);
  const deadline = gruca.rescue.deadlineAt;
  assert.equal(Number((deadline - gruca.rescue.downedAt).toFixed(3)), RESCUE_WINDOW_SEC);

  const shotsAt = new Map(sim.allies.map((a) => [a.id, a.shotsFired ?? 0]));
  const conducting = new Set(['pl_lis', 'pl_malek', 'pl_aux_01', 'pl_aux_02']);
  for (let i = 0; i < Math.round(20 / DT); i++) {
    sim.tick(DT, {});
  }
  assert.equal(sim.missionFailed, null, 'dentro do prazo não há falha');
  assert.equal(gruca.state, 'DOWN');
  assert.deepEqual({ x: gruca.x, z: gruca.z }, gruca0, 'o líder caído fica onde caiu');
  const fired = [...conducting].filter((id) => (ally(sim, id).shotsFired ?? 0) > shotsAt.get(id));
  assert.ok(fired.length >= 2, `a secção continua a combater sem o líder (dispararam: ${fired})`);
  // não há sucessão: o plano é por papel (pessoa), nenhum aliado passa a «líder» e o caído continua a ser o exigido (regra D1, visível na janela)
  for (const a of sim.allies) if (a.id !== 'pl_gruca') assert.notEqual(a.state, 'DOWN');
  assert.equal(sim.rescueStatus()[0].required, true);

  // esgotado o prazo sem socorro: falha clara, com o motivo e o nome (a regra D1), e nenhum checkpoint com o líder fora de combate
  const checkpointsBefore = [...sim.checkpointsReached];
  for (let i = 0; i < Math.round((RESCUE_WINDOW_SEC - 10) / DT) + 40 && !sim.missionFailed; i++) sim.tick(DT, {});
  assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated');
  assert.equal(sim.missionFailed.actorId, 'pl_gruca');
  assert.match(describeMissionFailure(sim.missionFailed), /^Sgt\. Gruca incapacitado\. Sem socorro possível/);
  assert.deepEqual(sim.checkpointsReached, checkpointsBefore, 'nenhum checkpoint com Gruca fora de combate');
});
