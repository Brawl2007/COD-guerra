// M02 O2 (PDF pp. 50-52), lacunas PENDENTE da tabela docs/verification/m02-claude/n1-2026-11-06/O2-coverage.md: AI-03, COM-01, COM-02.
// Testes de estado sobre a simulação (não são playtest, não aceitam o ID). Cada teste diz o que prova e o que NÃO prova.
import test from 'node:test';
import assert from 'node:assert/strict';

import { M02BenchSimulation, describeMissionFailure } from '../src/game/m02-01-simulation.js';
import { WEAPON_PROFILES, RESCUE_WINDOW_SEC } from '../src/game/m02-combat-ai.js';

const SEED = 19390909;
const DT = 0.05;
const run = (sim, seconds, controls = {}) => {
  for (let i = 0; i < Math.round(seconds / DT); i++) sim.tick(DT, controls);
};
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const enemy = (sim, id) => sim.enemies.find((e) => e.id === id);

// ---------------------------------------------------------------------------------------------------------------------------------
// COM-02: porta aberta
// ---------------------------------------------------------------------------------------------------------------------------------
const DOOR = 'door_b01_east_main'; // parede este de B01 (x = -26), centro z = -15,5, 1,1 m, madeira fina
const OUT = { x: -23.5, z: -15.5 };
const probe = (x, z, crouched = false) => ({ x, y: 0, z, space: 'metres', crouched, eyeHeight: crouched ? 1.08 : 1.65 });

test('COM-02 porta aberta: o estado da porta decide a linha de tiro e a passagem (fechada, aberta, destruída) e persiste no snapshot', () => {
  const sim = new M02BenchSimulation(SEED);
  const rows = {};
  for (const state of ['closed', 'open', 'destroyed']) {
    sim.world.setDoorState(DOOR, state);
    sim.navigator.sync();
    const shot = sim.fireDirectRay({ x: -20, y: 1.35, z: -15.5 }, { x: -1, y: 0, z: 0 });
    const los = sim.world.lineOfSight(probe(-23.5, -15.5), probe(-29, -15.5), { includeFoliage: true });
    const route = sim.navigator.route({ x: -23.5, y: 0, z: -15.5, radius: 0.36 }, { x: -29, z: -15.5 });
    rows[state] = { blocked: shot.blockedBySolid === true, los, routed: Boolean(route && route.length) };
  }
  assert.deepEqual(rows.closed, { blocked: true, los: false, routed: false }, 'fechada: bloqueia o tiro e a vista, e a navegação não a atravessa');
  assert.deepEqual(rows.open, { blocked: false, los: true, routed: true }, 'aberta: o tiro passa, há vista e há passagem');
  assert.deepEqual(rows.destroyed, { blocked: false, los: true, routed: true }, 'destruída: idem');

  // persistência: cada estado volta como estava num jogo novo (a porta não se «repara» nem se abre sozinha)
  for (const state of ['closed', 'open', 'destroyed']) {
    sim.world.setDoorState(DOOR, state);
    const snap = JSON.parse(JSON.stringify(sim.snapshot()));
    assert.equal(snap.doors[DOOR], state);
    const other = new M02BenchSimulation(SEED);
    other.world.setDoorState(DOOR, state === 'open' ? 'closed' : 'open');
    other.restoreSnapshot(snap);
    assert.equal(other.world.getDoorState(DOOR), state, `restauro: ${state}`);
    const shot = other.fireDirectRay({ x: -20, y: 1.35, z: -15.5 }, { x: -1, y: 0, z: 0 });
    assert.equal(shot.blockedBySolid === true, state === 'closed', `linha de tiro restaurada (${state})`);
  }
});

test('COM-02 explosão junto de porta aberta: quem está no alinhamento da abertura é ferido, quem está atrás da parede não (cobertura não é imunidade global); a porta passa a destruída e fica assim', () => {
  const sim = new M02BenchSimulation(SEED);
  sim.world.setDoorState(DOOR, 'open');
  const inLine = enemy(sim, 'DE-A08');
  const behindWall = enemy(sim, 'DE-A07');
  // dentro de B01, 3 m da porta pelo eixo da abertura / a 3,5 m do eixo, atrás da parede de tijolo
  Object.assign(inLine, { x: -29, z: -15.5, y: 0 });
  Object.assign(behindWall, { x: -28, z: -12.5, y: 0 });
  const bystander = enemy(sim, 'DE-A09'); // longe: não entra no raio
  const hpBystander = bystander.health;
  assert.equal(sim.world.getDoorState(DOOR), 'open');

  const blast = sim.detonateGrenadeAt(OUT.x, 0.5, OUT.z, 6.5);
  const a = blast.affectedActors.find((x) => x.id === 'DE-A08');
  const b = blast.affectedActors.find((x) => x.id === 'DE-A07');
  assert.ok(a, 'o do alinhamento está no raio');
  assert.equal(a.blockedByWall, false, 'a abertura deixa passar a onda');
  assert.ok(inLine.health < 100, 'foi ferido');
  assert.ok(b, 'o do canto está no raio');
  assert.equal(b.blockedByWall, true, 'a parede interrompe a onda: cobertura real');
  assert.equal(behindWall.health, 100, 'sem dano atrás da parede');
  assert.equal(bystander.health, hpBystander, 'fora do raio, intacto');
  assert.deepEqual(blast.worldChanges.destroyedDoors, [DOOR], 'transformação: a porta aberta junto da explosão fica destruída');
  assert.equal(sim.world.getDoorState(DOOR), 'destroyed');
  // não há imunidade global: o abrigo do canto continua a ser parede, a porta destruída não volta a bloquear nada
  assert.equal(sim.fireDirectRay({ x: -20, y: 1.35, z: -15.5 }, { x: -1, y: 0, z: 0 }).blockedBySolid === true, false);
  // posição fixa e persistente: o snapshot guarda porta destruída, vida e estado dos dois
  const snap = JSON.parse(JSON.stringify(sim.snapshot()));
  const fresh = new M02BenchSimulation(SEED);
  fresh.restoreSnapshot(snap);
  assert.equal(fresh.world.getDoorState(DOOR), 'destroyed', 'a porta destruída não é reparada pelo restauro');
  assert.equal(enemy(fresh, 'DE-A08').health, inLine.health);
  assert.equal(enemy(fresh, 'DE-A07').health, 100);
});
