// M02 D3 (PDF p. 17, «Baixas elevadas ou saída comprometida podem produzir recuo/rendição») e C02 (PDF p. 12): correções de combate
// observadas na auditoria do código. (a) A rendição conta só as baixas do próprio grupo de encontro. (b) O posto EA0 deteta Piotr
// quando ele chega perto, sem esperar pelo temporizador do contacto. Testes de estado (entradas simuladas), não playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { moraleGroupOf } from '../src/game/m02-combat-ai.js';

const DT = 0.1;
const SEED = 19390909;
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const byEncounter = (sim, id) => sim.enemies.filter((e) => e.encounterId === id);
const surrendered = (list) => list.filter((e) => e.state === 'SURRENDERED');
const combatants = (list) => list.filter((e) => e.alive && !e.nonCombatant);
const idle = (sim, seconds) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.tick(DT, {});
};
/** A secção polaca não dispara: as baixas do teste são só as que o teste provoca (senão um tiro da secção mexia nas contagens). */
const disarm = (sim) => {
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
  return sim;
};

/** Área C com EC1 vencido, Piotr no pátio e C10 aberto (EC2 em campo): o cenário em que EC2 se rendia no primeiro tick. */
function atC10(seed = SEED) {
  const sim = disarm(new M02BenchSimulation(seed)); // cena C02: EA0 já não está em jogo (c01Active falso), como na missão real
  sim.enterAreaCC09();
  assert.equal(sim.c01Active, false, 'a IA dos hostis de C só corre com c01Active falso');
  byEncounter(sim, 'EC1').forEach(kill);
  sim.player.x = -6;
  sim.player.z = -10;
  return sim;
}

describe('M02 D3: a moral conta só as baixas do próprio grupo (bug: EC2 rendia-se no primeiro tick de C10)', () => {
  it('o grupo de moral é o encontro; EA1 não traz encounterId no layout e conta como grupo da quinta', () => {
    const sim = new M02BenchSimulation(SEED);
    assert.equal(moraleGroupOf(sim.enemies.find((e) => e.id === 'DE-A05')), 'EA1');
    assert.equal(moraleGroupOf({ encounterId: 'EC2' }), 'EC2');
    assert.equal(moraleGroupOf({ encounterId: 'EB1' }), 'EB1');
  });

  it('com EC1 inteiro abatido, os 12 de EC2 NÃO se rendem no primeiro tick de C10 nem nos seguintes: continuam combatentes', () => {
    const sim = atC10();
    sim.tick(DT, {}); // updateAreaC abre C10 e acrescenta EC2
    assert.equal(sim.areaC.c10Started, true);
    const ec2 = byEncounter(sim, 'EC2');
    assert.equal(ec2.length, 12);
    sim.tick(DT, {});
    assert.equal(surrendered(ec2).length, 0, 'nenhum se rendeu');
    assert.equal(combatants(ec2).length, 12, 'os 12 continuam a combater');
    assert.equal(sim.combatLog.filter((e) => e.type === 'enemy_surrendered').length, 0);
    idle(sim, 5);
    assert.equal(combatants(ec2).length, 12, 'também 5 s depois, sem baixas próprias');
    assert.ok(ec2.every((e) => e.state !== 'SURRENDERED' && !e.nonCombatant));
  });

  it('também pelas atalhos de bancada (startC10OrderChanges depois de EC1 abatido): EC2 mantém-se em combate', () => {
    const sim = disarm(new M02BenchSimulation(SEED));
    sim.enterAreaCC09();
    byEncounter(sim, 'EC1').forEach(kill);
    sim.startC10OrderChanges();
    idle(sim, 1);
    assert.equal(combatants(byEncounter(sim, 'EC2')).length, 12);
  });

  it('EC2 só cede às suas próprias baixas: com 6 abatidos ninguém se rende; com 7 os restantes rendem-se e o log diz quem', () => {
    const sim = atC10();
    sim.tick(DT, {});
    const ec2 = byEncounter(sim, 'EC2');
    ec2.slice(0, 6).forEach(kill);
    idle(sim, 1);
    assert.equal(surrendered(ec2).length, 0, '6 de 12 abatidos: ainda combatem');
    assert.equal(combatants(ec2).length, 6);
    kill(ec2[6]);
    idle(sim, 0.5);
    const rest = ec2.slice(7);
    assert.equal(rest.length, 5);
    assert.ok(rest.every((e) => e.state === 'SURRENDERED' && e.nonCombatant), 'depois de 7 baixas próprias os restantes rendem-se');
    const log = sim.combatLog.filter((e) => e.type === 'enemy_surrendered').map((e) => e.actorId).sort();
    assert.deepEqual(log, rest.map((e) => e.id).sort());
    assert.ok(log.every((id) => id.startsWith('DE-C') && Number(id.slice(4)) >= 9), 'só ids de EC2 (DE-C09..DE-C20)');
  });

  it('os grupos são independentes: as baixas de EC2 não rendem os de EC1 que ainda combatem (e vice-versa)', () => {
    const sim = disarm(new M02BenchSimulation(SEED));
    sim.enterAreaCC09();
    const ec1 = byEncounter(sim, 'EC1');
    assert.equal(ec1.length, 8);
    ec1.slice(0, 4).forEach(kill); // 4 de 8: abaixo do limite do próprio grupo
    sim.startC10OrderChanges();
    const ec2 = byEncounter(sim, 'EC2');
    ec2.slice(0, 7).forEach(kill); // EC2 cede ...
    idle(sim, 1);
    assert.equal(combatants(ec1).length, 4, '... mas os 4 de EC1 que combatem continuam: 7 baixas de EC2 não são baixas de EC1');
    assert.equal(surrendered(ec1).length, 0);
    assert.equal(surrendered(ec2).length, 5);
    // e as baixas de EC1 chegam ao seu limite (7 de 8) só com as suas próprias
    ec1.slice(4, 7).forEach(kill);
    idle(sim, 0.5);
    assert.equal(surrendered(ec1).length, 1, 'o último de EC1 rende-se com as 7 baixas do seu grupo');
  });

  it('o posto EA0 não se rende por baixas da quinta (outro grupo): só conta os seus quatro homens', () => {
    const sim = disarm(new M02BenchSimulation(SEED, { startScene: 'C01' }));
    const ea0 = byEncounter(sim, 'EA0');
    assert.equal(ea0.length, 4);
    sim.enemies.filter((e) => e.encounterId !== 'EA0').forEach(kill); // a quinta inteira (10) abatida
    idle(sim, 2);
    assert.equal(surrendered(ea0).length, 0, 'EA0 continua em jogo');
    assert.equal(sim.c01Active, true, 'o posto ainda não caiu: C01 não acabou');
    assert.equal(sim.combatLog.filter((e) => e.type === 'enemy_surrendered').length, 0);
  });

  it('o comportamento do próprio grupo mantém-se: EC1 (7 de 8) e EB1 (7 de 12) cedem como antes; a quinta (EA1) exige a MG abatida', () => {
    const c = disarm(new M02BenchSimulation(SEED));
    c.enterAreaCC09();
    const ec1 = byEncounter(c, 'EC1');
    ec1.slice(0, 6).forEach(kill);
    idle(c, 0.5);
    assert.equal(surrendered(ec1).length, 0, 'EC1: 6 de 8 não chega');
    kill(ec1[6]);
    idle(c, 0.5);
    assert.equal(surrendered(ec1).length, 1, 'EC1: 7 de 8: o último rende-se');

    const b = disarm(new M02BenchSimulation(SEED));
    b.enterAreaBC06();
    const eb1 = byEncounter(b, 'EB1');
    assert.equal(eb1.length, 12);
    eb1.slice(0, 6).forEach(kill);
    idle(b, 0.5);
    assert.equal(surrendered(eb1).length, 0, 'EB1: 6 de 12 não chega');
    kill(eb1[6]);
    idle(b, 0.5);
    assert.equal(surrendered(eb1).length, 5, 'EB1: 7 de 12: os 5 restantes rendem-se');

    // quinta: sem a MG abatida (DE-A05) a rendição não chega, com 8 de 10 baixas
    const a = disarm(new M02BenchSimulation(SEED));
    for (const e of a.enemies.filter((x) => x.id !== 'DE-A05' && x.id !== 'DE-A14').slice(0, 7)) kill(e);
    idle(a, 0.5);
    assert.equal(surrendered(a.enemies).length, 0, 'EA1: com a MG viva ninguém se rende');
    kill(a.enemies.find((e) => e.id === 'DE-A05'));
    idle(a, 0.5);
    assert.ok(surrendered(a.enemies).length >= 1 || combatants(a.enemies).length === 0, 'EA1: com a MG abatida e 7+ baixas os restantes cedem');
  });
});
