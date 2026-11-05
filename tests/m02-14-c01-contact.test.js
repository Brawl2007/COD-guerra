// M02 C02 (PDF p. 12): «O primeiro tiro combatível deve ocorrer em 30-60 s depois de iniciar o movimento; o inimigo fica a
// cerca de 67 m da partida». Teste de estado com entradas simuladas (não é playtest).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { C01_CONTACT_DELAY_SEC } from '../src/game/m02-acts-director.js';
import { PlayerBot } from './m02-bot-helper.js';

const SEEDS = [1, 2, 3, 19390909, 777, 4242, 20260607, 9, 31337, 65535];
const HOLD = { x: -8.5, z: -142 }; // cobertura intermédia de C01 (cv_c01_mid_w), a ~33 m do posto

function firstBursts(bot) {
  const bursts = bot.events.filter((e) => e.type === 'actor-burst');
  return { any: bursts[0] ?? null, enemy: bursts.find((e) => e.side === 'enemy') ?? null };
}

function runApproach(seed, { holdSec = 90 } = {}) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  const bot = new PlayerBot(sim);
  const reached = bot.walkTo(HOLD, { tol: 1.2, maxSec: 40 });
  bot.idleUntil(() => bot.events.some((e) => e.type === 'actor-burst' && e.side === 'enemy'), holdSec);
  return { sim, bot, reached };
}

describe('M02 C02: o posto EA0 só abre fogo 30-60 s depois de o jogador começar a avançar', () => {
  it('o posto não vê Piotr em P1 no tick 0 nem enquanto a preparação decorre sem movimento', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    const ea0 = sim.enemies.filter((e) => e.encounterId === 'EA0');
    assert.equal(ea0.length, 4);
    for (let i = 0; i < 400; i += 1) sim.tick(0.1, {}); // 40 s parado em P1
    for (const e of ea0) {
      assert.equal(e.seeingTargetId, null, `${e.id} não vê ninguém`);
      assert.equal(e.memory, null);
      assert.equal(e.state, 'HOLD_SECTOR');
      assert.equal(e.shotsFired, 0);
    }
    assert.equal(sim.c01Contact.movementStartedAt, null, 'sem avanço não há contagem');
    assert.equal(sim.c01Contact.opened, false);
    assert.equal(sim.drainEvents().filter((e) => e.type === 'actor-burst').length, 0, 'nenhum tiro de ninguém');
  });

  for (const seed of SEEDS) {
    it(`semente ${seed}: primeiro tiro (de qualquer lado) e primeiro tiro inimigo ficam em [30, 60] s depois do início do avanço`, () => {
      const { sim, bot, reached } = runApproach(seed);
      assert.equal(reached, true, 'o jogador chegou à cobertura por rota normal');
      const c = sim.c01Contact;
      assert.equal(c.opened, true);
      assert.equal(c.openedBy, 'timer');
      const delay = c.contactAt - c.movementStartedAt;
      assert.ok(delay >= C01_CONTACT_DELAY_SEC.min && delay < C01_CONTACT_DELAY_SEC.max, `atraso ${delay} dentro de [30, 60)`);
      const { any, enemy } = firstBursts(bot);
      assert.ok(any && enemy, 'houve tiros');
      const dtTick = 0.1 + 1e-9;
      assert.ok(any.clock >= c.contactAt - 1e-9, 'ninguém dispara antes do contacto');
      assert.ok(enemy.clock - c.movementStartedAt >= 30 && enemy.clock - c.movementStartedAt <= 60 + dtTick, `1.º tiro inimigo a ${enemy.clock - c.movementStartedAt} s do avanço`);
      assert.ok(any.clock - c.movementStartedAt >= 30 && any.clock - c.movementStartedAt <= 60 + dtTick);
    });
  }

  it('é determinista (mesma semente, mesmo instante) e a semente muda o instante (RNG da simulação, não um valor fixo)', () => {
    const a = runApproach(1234).sim.c01Contact;
    const b = runApproach(1234).sim.c01Contact;
    assert.deepEqual(a, b);
    const delays = new Set(SEEDS.map((s) => runApproach(s, { holdSec: 70 }).sim.c01Contact.contactAt));
    assert.ok(delays.size >= 8, `os instantes variam com a semente (${delays.size}/${SEEDS.length} distintos)`);
  });

  it('um tiro do jogador abre o contacto já (a iniciativa é dele); o 1.º tiro inimigo vem depois do contacto aberto', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    const bot = new PlayerBot(sim);
    bot.walkTo(HOLD, { tol: 1.2, maxSec: 40 });
    assert.equal(sim.c01Contact.opened, false);
    const t0 = sim.clock;
    bot.tick({ fire: true });
    assert.equal(sim.c01Contact.opened, true);
    assert.equal(sim.c01Contact.openedBy, 'player_shot');
    assert.ok(sim.clock - sim.c01Contact.movementStartedAt < 30, 'abriu antes do temporizador por ação do jogador');
    bot.idleUntil(() => bot.events.some((e) => e.type === 'actor-burst' && e.side === 'enemy'), 20);
    const { enemy } = firstBursts(bot);
    assert.ok(enemy && enemy.clock >= t0, 'o posto reage ao tiro do jogador');
  });

  it('snapshot a meio da espera: restaurar numa simulação nova reproduz o mesmo contacto (c01Contact + gerador no save)', () => {
    const sim = new M02BenchSimulation(4242, { startScene: 'C01' });
    const bot = new PlayerBot(sim);
    bot.walkTo(HOLD, { tol: 1.2, maxSec: 40 });
    const snap = sim.snapshot();
    assert.equal(validateM02Snapshot(snap).valid, true);
    assert.deepEqual(snap.c01Contact, sim.c01Contact);
    const live = new M02BenchSimulation(1, { startScene: 'C01' });
    live.restoreSnapshot(structuredClone(snap));
    assert.deepEqual(live.c01Contact, sim.c01Contact);
    const botB = new PlayerBot(live);
    bot.idleUntil(() => sim.c01Contact.opened, 80);
    botB.idleUntil(() => live.c01Contact.opened, 80);
    assert.equal(live.c01Contact.openedAt, sim.c01Contact.openedAt);
    assert.equal(live.rng.state, sim.rng.state, 'mesmo estado do gerador depois do contacto');
  });

  it('o validador recusa um estado de contacto C01 ausente ou incoerente (mensagem explícita)', () => {
    const sim = new M02BenchSimulation(19390909, { startScene: 'C01' });
    const ok = sim.snapshot();
    assert.equal(validateM02Snapshot(ok).valid, true);
    const cases = [
      (s) => { delete s.c01Contact; },
      (s) => { s.c01Contact.opened = 'sim'; },
      (s) => { s.c01Contact.movementStartedAt = 5; }, // contactAt nulo com início definido
      (s) => { s.c01Contact.opened = true; s.c01Contact.openedAt = 1; s.c01Contact.openedBy = 'magia'; },
      (s) => { s.c01Contact.openedBy = 'timer'; }, // não aberto mas com origem
    ];
    for (const mutate of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false);
      assert.match(r.reason, /contacto C01/);
    }
  });
});
