// M02 D3 (PDF p. 17, «Baixas elevadas ou saída comprometida podem produzir recuo/rendição») e C02 (PDF p. 12): correções de combate
// observadas na auditoria do código. (a) A rendição conta só as baixas do próprio grupo de encontro. (b) O posto EA0 deteta Piotr
// quando ele chega perto, sem esperar pelo temporizador do contacto. Testes de estado (entradas simuladas), não playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { moraleGroupOf } from '../src/game/m02-combat-ai.js';
import { C01_CONTACT_DELAY_SEC, C01_CONTACT_OPENED_BY, C01_PROXIMITY_DETECTION_M } from '../src/game/m02-acts-director.js';
import { PlayerBot } from './m02-bot-helper.js';

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
    // FIX-CD: antes `rendidos ≥ 1 OU sem combatentes` — passava também se ninguém se rendesse. Os que restam deixam TODOS de combater:
    // o ferido do pomar (C04) fica ferido e desarmado e os outros rendem-se.
    const ea1Alive = a.enemies.filter((e) => e.encounterId !== 'EA0' && e.alive);
    assert.equal(combatants(a.enemies).length, 0, 'EA1: com a MG abatida e 8 baixas ninguém continua a combater');
    assert.ok(surrendered(ea1Alive).length >= 1, 'EA1: pelo menos um rende-se');
    for (const e of ea1Alive) assert.equal(e.state, e.c04Candidate ? 'WOUNDED_UNARMED' : 'SURRENDERED', `${e.id}: ${e.state}`);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// C02 (PDF p. 12): «O primeiro tiro combatível deve ocorrer em 30-60 s depois de iniciar o movimento; o inimigo fica a cerca de 67 m da
// partida.» O temporizador vale para quem avança com prudência; quem corre para o posto não fica sem ser alvejado: dentro de
// C01_PROXIMITY_DETECTION_M de um homem do posto o contacto abre já (openedBy 'proximity').
// ---------------------------------------------------------------------------------------------------------------------
describe('M02 C02: o posto EA0 deteta quem chega perto (bug: quem corria para o posto não era alvejado até ao temporizador)', () => {
  const HOLD = { x: -8.5, z: -142 }; // cobertura intermédia de C01 (cv_c01_mid_w), a ~31-34 m dos homens do posto
  const POST_NEAR = { x: -18, z: -100 }; // 10 m do centro do posto (-18,-110)
  const c01 = (seed = SEED) => new M02BenchSimulation(seed, { startScene: 'C01' });
  const sentinels = (sim) => sim.enemies.filter((e) => e.encounterId === 'EA0');
  const nearestSentinel = (sim) => Math.min(...sentinels(sim).filter((e) => e.alive).map((e) => Math.hypot(e.x - sim.player.x, e.z - sim.player.z)));

  it('o raio de deteção (25 m) está entre os 15 m mínimos de D1 e as coberturas intermédias de C01 (≥ 30 m aos homens do posto)', () => {
    assert.equal(C01_PROXIMITY_DETECTION_M, 25);
    assert.ok(C01_PROXIMITY_DETECTION_M > 15);
    assert.ok(C01_CONTACT_OPENED_BY.includes('proximity'));
    const sim = c01();
    for (const node of ['cv_c01_mid_w', 'cv_c01_mid_e']) {
      const n = sim.coverNodesById.get(node);
      const d = Math.min(...sentinels(sim).map((e) => Math.hypot(e.x - n.x, e.z - n.z)));
      assert.ok(d > C01_PROXIMITY_DETECTION_M + 4, `${node} a ${d.toFixed(1)} m do homem mais próximo: avançar com prudência não dispara a deteção`);
    }
  });

  it('um jogador que corre (sprint) para o posto abre o contacto por proximidade a ≤ 25 m, muito antes do temporizador, e é alvejado', () => {
    const sim = c01();
    // Merge M02 único: C01 começa agachado na vala de partida (preparação física, Codex 9da102bc); para correr, Piotr levanta-se primeiro.
    sim.tick(0.05, { crouch: true });
    assert.equal(sim.player.crouched, false);
    const bot = new PlayerBot(sim);
    const opened = () => sim.c01Contact.opened;
    assert.equal(bot.walkTo(POST_NEAR, { tol: 1.0, maxSec: 40, sprint: true, until: opened }), true);
    const c = sim.c01Contact;
    assert.equal(c.opened, true);
    assert.equal(c.openedBy, 'proximity');
    const dMoving = c.openedAt - c.movementStartedAt;
    assert.ok(dMoving < C01_CONTACT_DELAY_SEC.min, `abriu ${dMoving.toFixed(1)} s depois do avanço, antes de qualquer atraso de [30, 60)`);
    assert.ok(c.openedAt < c.contactAt, 'o temporizador ainda não tinha chegado');
    assert.ok(nearestSentinel(sim) <= C01_PROXIMITY_DETECTION_M + 0.7, `distância ao posto no instante: ${nearestSentinel(sim).toFixed(1)} m`);
    assert.ok(nearestSentinel(sim) > C01_PROXIMITY_DETECTION_M - 1.5);
    // e o posto reage: dispara contra Piotr nos segundos seguintes (antes, não via nem disparava a ninguém)
    const shots = bot.events.filter((e) => e.type === 'actor-burst' && e.side === 'enemy');
    assert.ok(shots.every((e) => e.clock >= c.openedAt - 1e-9), 'até ao contacto ninguém disparou: os tiros só começam no tick em que o contacto abre');
    bot.idleUntil(() => bot.events.some((e) => e.type === 'actor-burst' && e.side === 'enemy'), 10);
    const first = bot.events.find((e) => e.type === 'actor-burst' && e.side === 'enemy');
    assert.ok(first, 'o posto abriu fogo');
    assert.ok(first.clock - c.openedAt < 5, `1.º tiro inimigo ${(first.clock - c.openedAt).toFixed(1)} s depois do contacto`);
    assert.ok(first.clock - c.movementStartedAt < C01_CONTACT_DELAY_SEC.min, 'e antes do fim do intervalo 30-60 s');
    assert.ok(sentinels(sim).some((e) => e.id === first.shooterId), 'o tiro é de um homem do posto');
  });

  it('quem avança com prudência continua a esperar o temporizador (a abertura é por «timer» em [30, 60) s) — 10 sementes, coberturas intermédias', () => {
    for (const seed of [1, 2, 3, 19390909, 777, 4242, 20260607, 9, 31337, 65535]) {
      const sim = c01(seed);
      const bot = new PlayerBot(sim);
      assert.equal(bot.walkTo(HOLD, { tol: 1.2, maxSec: 40 }), true);
      let closest = nearestSentinel(sim);
      for (let i = 0; i < 700 && !sim.c01Contact.opened; i++) {
        bot.tick({});
        closest = Math.min(closest, nearestSentinel(sim));
      }
      const c = sim.c01Contact;
      assert.equal(c.openedBy, 'timer', `semente ${seed}`);
      const delay = c.contactAt - c.movementStartedAt;
      assert.ok(delay >= C01_CONTACT_DELAY_SEC.min && delay < C01_CONTACT_DELAY_SEC.max, `semente ${seed}: atraso ${delay}`);
      assert.ok(closest > C01_PROXIMITY_DETECTION_M, `semente ${seed}: aproximou-se a ${closest.toFixed(1)} m (> 25)`);
    }
  });

  it('não gasta sorteios: o atraso do temporizador é o mesmo corra ou não o jogador; só conta homens do posto vivos e combatentes', () => {
    const rusher = c01();
    const waiter = c01();
    new PlayerBot(rusher).walkTo(POST_NEAR, { tol: 1.0, maxSec: 40, sprint: true, until: () => rusher.c01Contact.opened });
    for (let i = 0; i < 5; i++) waiter.tick(0.1, { forward: 1 });
    assert.equal(rusher.c01Contact.contactAt, waiter.c01Contact.contactAt, 'o mesmo sorteio ao primeiro avanço');
    assert.equal(rusher.c01Contact.openedBy, 'proximity');

    // só o homem vivo e combatente conta: abatidos os três mais próximos, 10 m de um morto não abre; 20 m do vivo sim
    const sim = c01();
    const [alive, ...dead] = sentinels(sim);
    dead.forEach(kill);
    sim.tick(0.1, { forward: 1 }); // primeiro avanço
    sim.teleportPlayer(dead[0].x, dead[0].z + 10, 0);
    sim.tick(0.1, {});
    if (Math.hypot(alive.x - sim.player.x, alive.z - sim.player.z) > C01_PROXIMITY_DETECTION_M) {
      assert.equal(sim.c01Contact.opened, false, 'ao pé de homens abatidos, mas longe do vivo, o contacto não abre');
    }
    sim.teleportPlayer(alive.x, alive.z + C01_PROXIMITY_DETECTION_M - 1, 0);
    sim.tick(0.1, {});
    assert.equal(sim.c01Contact.opened, true);
    assert.equal(sim.c01Contact.openedBy, 'proximity');
  });

  it('um salto direto para junto do posto (primeiro tick com movimento) abre o contacto nesse mesmo tick', () => {
    const sim = c01();
    sim.teleportPlayer(POST_NEAR.x, POST_NEAR.z, 0);
    sim.tick(0.1, {});
    assert.equal(sim.c01Contact.movementStartedAt !== null, true);
    assert.equal(sim.c01Contact.opened, true);
    assert.equal(sim.c01Contact.openedBy, 'proximity');
    assert.ok(sim.combatLog.some((e) => e.type === 'c01_contact_opened' && e.by === 'proximity'));
  });

  it('o snapshot guarda e restaura o contacto aberto por proximidade; o validador aceita-o e continua a recusar origens inventadas', () => {
    const sim = c01();
    new PlayerBot(sim).walkTo(POST_NEAR, { tol: 1.0, maxSec: 40, sprint: true, until: () => sim.c01Contact.opened });
    const snap = structuredClone(sim.snapshot());
    assert.equal(snap.c01Contact.openedBy, 'proximity');
    assert.equal(validateM02Snapshot(snap).valid, true);
    const live = new M02BenchSimulation(1, { startScene: 'C01' });
    live.restoreSnapshot(snap);
    assert.deepEqual(live.c01Contact, sim.c01Contact);
    const bad = structuredClone(snap);
    bad.c01Contact.openedBy = 'magia';
    assert.equal(validateM02Snapshot(bad).valid, false);
  });
});
