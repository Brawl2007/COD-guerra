// M02 D2 (PDF p. 16, roster): o posto EA0 (DE-A01…A04, vala transversal (-18,-110)) tem como alteração permitida «recuam para borda
// oeste; não reaparecem na quinta»; D1 (O01): «posto que recua deixa de bloquear»; C02 (p. 13): «não surgem novos homens para repor o
// combate»; D3 (p. 17): «baixas elevadas ou saída comprometida podem produzir recuo/rendição, não sempre ataque suicida».
// Moral por grupo de encontro, determinista. Testes de estado (entradas simuladas), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  EA0_RETREAT_CASUALTIES,
  EA0_WEST_EDGE_MARGIN_M,
  EA0_WITHDRAW_MAX_SEC,
  moraleGroupOf,
} from '../src/game/m02-combat-ai.js';

const SEED = 19390909;
const DT = 0.05;
const ea0Of = (sim) => sim.enemies.filter((e) => e.encounterId === 'EA0');
const kill = (e) => Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
const disarm = (sim) => {
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 }); // a secção não dispara: só conta o que o posto decide
};
/** C01 com a secção desarmada e o contacto aberto por um tiro do jogador (a iniciativa é dele). */
function contactOpen(seed = SEED) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  disarm(sim);
  sim.tick(DT, { fire: true });
  assert.equal(sim.c01Contact.opened, true);
  return sim;
}
const westEdgeX = (sim) => sim.world.layout.bounds.c01Approach.minX + EA0_WEST_EDGE_MARGIN_M;
/** Dois homens do posto caem e corre-se até os outros dois começarem a recuar (têm de abrir fogo primeiro: ver o teste do clarão). */
function dropTwoUntilWithdrawing(sim) {
  const [a, b, c, d] = ea0Of(sim);
  kill(a);
  kill(b);
  let guard = 0;
  while ((c.state !== 'WITHDRAWING' || d.state !== 'WITHDRAWING') && guard++ < 100) sim.tick(DT, {});
  assert.equal(c.state, 'WITHDRAWING');
  assert.equal(d.state, 'WITHDRAWING');
  return { a, b, c, d };
}

describe('M02 D2: valores e grupo de moral do posto EA0', () => {
  it('metade do posto (2 de 4) fora de combate faz os restantes recuar; EA0 é um grupo de moral próprio; a borda oeste vem do layout', () => {
    assert.equal(EA0_RETREAT_CASUALTIES, 2);
    assert.equal(ea0Of(new M02BenchSimulation(SEED, { startScene: 'C01' })).length, 4);
    assert.equal(moraleGroupOf({ encounterId: 'EA0' }), 'EA0');
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    assert.equal(westEdgeX(sim), -48, 'bounds.c01Approach.minX (-50) + margem de 2 m');
    assert.ok(EA0_WITHDRAW_MAX_SEC > 10, 'tempo para andar ~27 m a pé com folga');
  });
});

describe('M02 D2: recuo do posto EA0 para a borda oeste', () => {
  it('com 2 baixas os restantes passam a WITHDRAWING, andam para oeste SEM disparar e ficam retirados (WITHDRAWN) na borda; o posto deixa de bloquear', () => {
    const sim = contactOpen();
    const { c, d } = dropTwoUntilWithdrawing(sim);
    const shotsAtBreak = { [c.id]: c.shotsFired, [d.id]: d.shotsFired };
    assert.ok(c.shotsFired + d.shotsFired >= 1, 'o posto abriu fogo antes de recuar (C02: o clarão que Lis aponta)');
    for (const e of [c, d]) {
      assert.equal(e.nonCombatant, false, 'ainda é combatente enquanto anda');
      assert.equal(e.goal.x, westEdgeX(sim));
      assert.ok(Math.abs(e.goal.z - e.z) <= 0.3, `${e.id}: o destino fica na própria linha da vala`);
      assert.ok(Number.isFinite(e.withdrawStartedAt) && e.withdrawStartedAt <= sim.clock);
    }
    const logged = sim.combatLog.filter((e) => e.type === 'enemy_withdrawing');
    assert.deepEqual(logged.map((e) => e.actorId).sort(), [c.id, d.id].sort());
    assert.ok(logged.every((e) => e.casualties === 2 && e.toX === westEdgeX(sim)));
    assert.equal(sim.c01Active, true, 'ainda a andar: o posto ainda não deixou de bloquear');

    let lastX = { [c.id]: c.x, [d.id]: d.x };
    for (let i = 0; i < Math.ceil(EA0_WITHDRAW_MAX_SEC / DT) && sim.c01Active; i++) {
      sim.tick(DT, {});
      for (const e of [c, d]) {
        assert.ok(e.x <= lastX[e.id] + 1e-9, `${e.id}: só se afasta para oeste`);
        lastX[e.id] = e.x;
        assert.equal(e.shotsFired, shotsAtBreak[e.id], `${e.id}: quem recua não dispara`);
      }
    }
    for (const e of [c, d]) {
      assert.equal(e.state, 'WITHDRAWN');
      assert.equal(e.alive, true, 'retirado não é morto');
      assert.equal(e.nonCombatant, true);
      assert.ok(Math.abs(e.x - westEdgeX(sim)) <= 1.2, `${e.id} na borda oeste (x=${e.x.toFixed(1)})`);
      assert.equal(e.goal, null);
    }
    assert.deepEqual(sim.combatLog.filter((e) => e.type === 'enemy_withdrawn').map((e) => e.actorId).sort(), [c.id, d.id].sort());
    assert.ok(sim.combatLog.filter((e) => e.type === 'enemy_withdrawn').every((e) => !e.timedOut));
    assert.equal(sim.c01Active, false, 'posto que recua deixa de bloquear');
    assert.equal(sim.flags['m02.ea0_posto_cleared'], true);
    assert.notEqual(sim.objective.id, 'O00');
    assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
  });

  it('o posto abre fogo antes de se desfazer: 2 baixas logo na primeira salva ainda deixam o clarão (nunca um recuo sem ter disparado)', () => {
    const sim = contactOpen();
    const [a, b, c, d] = ea0Of(sim);
    kill(a);
    kill(b);
    assert.equal(c.shotsFired + d.shotsFired, 0);
    assert.notEqual(c.state, 'WITHDRAWING', 'no instante da queda o posto ainda não disparou');
    let firedFirst = false;
    for (let i = 0; i < 100 && c.state !== 'WITHDRAWING'; i++) {
      sim.tick(DT, {});
      if (c.shotsFired + d.shotsFired > 0) firedFirst = true;
    }
    assert.equal(firedFirst, true, 'houve disparo (rajada de um fuzileiro do posto) antes do recuo');
    assert.equal(c.state, 'WITHDRAWING');
  });

  it('só depois do contacto aberto: com o posto «sem alerta» (Piotr parado em P1) 2 baixas não fazem ninguém recuar', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    disarm(sim);
    const [a, b, c, d] = ea0Of(sim);
    kill(a);
    kill(b);
    for (let i = 0; i < 300; i++) sim.tick(DT, {});
    assert.equal(sim.c01Contact.opened, false);
    for (const e of [c, d]) assert.equal(e.state, 'HOLD_SECTOR');
    assert.equal(sim.combatLog.some((e) => e.type === 'enemy_withdrawing'), false);
  });

  it('uma só baixa não chega: os outros três continuam a combater (nunca um recuo por tique)', () => {
    const sim = contactOpen();
    const eaHold = ea0Of(sim);
    kill(eaHold[0]);
    for (let i = 0; i < 100; i++) sim.tick(DT, {});
    for (const e of eaHold.slice(1)) {
      assert.notEqual(e.state, 'WITHDRAWING');
      assert.notEqual(e.state, 'WITHDRAWN');
      assert.equal(e.nonCombatant, false);
    }
    assert.equal(sim.combatLog.some((e) => e.type === 'enemy_withdrawing'), false);
  });

  it('rendidos e caídos contam como baixas do próprio posto (e só do posto: a quinta abatida não faz o EA0 recuar)', () => {
    const farmDown = contactOpen();
    for (const e of farmDown.enemies.filter((x) => x.encounterId !== 'EA0')) kill(e);
    for (let i = 0; i < 40; i++) farmDown.tick(DT, {});
    for (const e of ea0Of(farmDown)) assert.notEqual(e.state, 'WITHDRAWING', 'outro grupo');

    const mixed = contactOpen();
    const [a, b] = ea0Of(mixed);
    Object.assign(a, { state: 'SURRENDERED', nonCombatant: true });
    Object.assign(b, { alive: false, health: 0, state: 'DOWN' });
    let guard = 0;
    while (!ea0Of(mixed).some((e) => e.state === 'WITHDRAWING') && guard++ < 100) mixed.tick(DT, {});
    assert.deepEqual(ea0Of(mixed).filter((e) => e.state === 'WITHDRAWING').map((e) => e.id), ['DE-A03', 'DE-A04']);
  });

  it('a rota cortada não prende o posto: passado o limite de tempo o homem fica retirado onde estiver (timedOut)', () => {
    const sim = contactOpen();
    const { c, d } = dropTwoUntilWithdrawing(sim);
    sim.clock += EA0_WITHDRAW_MAX_SEC + 1; // como se andassem há mais do que o limite sem chegar
    sim.tick(DT, {});
    for (const e of [c, d]) {
      assert.equal(e.state, 'WITHDRAWN', e.id);
      assert.equal(e.nonCombatant, true);
      assert.ok(e.x > westEdgeX(sim) + 5, `${e.id} ficou por onde ia (x=${e.x.toFixed(1)})`);
      assert.equal(sim.combatLog.find((l) => l.type === 'enemy_withdrawn' && l.actorId === e.id).timedOut, true);
    }
    assert.equal(sim.c01Active, false);
  });
});

describe('M02 D2: no fluxo real (Piotr parado em P1, secção armada) o posto cai ou recua e nunca chega à quinta; o roster não cresce', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    it(`semente ${seed}`, () => {
      const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
      sim.tick(DT, { forward: 1 }); // um passo para o contacto arrancar; depois parado
      const idsBefore = sim.enemies.map((e) => e.id).sort();
      let guard = 0;
      while (sim.c01Active && guard++ < 1600) sim.tick(DT, {});
      assert.equal(sim.c01Active, false, 'o posto deixou de bloquear');
      const post = ea0Of(sim);
      assert.equal(post.length, 4);
      for (const e of post) {
        assert.ok(!e.alive || e.state === 'DEAD' || e.state === 'WITHDRAWN', `${e.id}: ${e.state}`);
        if (e.state === 'WITHDRAWN') {
          assert.equal(e.alive, true);
          assert.equal(e.nonCombatant, true);
          assert.ok(e.x <= -45 && e.z < -85, `${e.id} retirado na borda oeste, longe da quinta (${e.x.toFixed(1)}, ${e.z.toFixed(1)})`);
        }
      }
      const log = sim.combatLog;
      for (const e of post.filter((x) => x.state === 'WITHDRAWN')) {
        const w = log.findIndex((l) => l.type === 'enemy_withdrawing' && l.actorId === e.id);
        const d = log.findIndex((l) => l.type === 'enemy_withdrawn' && l.actorId === e.id);
        assert.ok(w >= 0 && d > w, `${e.id}: recuo registado antes da retirada`);
      }
      // a secção deixou-os recuar: ninguém foi atingido depois de começar a recuar
      for (const l of log.filter((x) => x.type === 'enemy_withdrawing')) {
        const after = log.slice(log.indexOf(l) + 1).filter((x) => x.targetId === l.actorId && x.type.startsWith('ally_'));
        assert.deepEqual(after, [], `${l.actorId}: a secção não o perseguiu a tiro`);
      }
      assert.deepEqual(sim.enemies.map((e) => e.id).sort(), idsBefore, 'nenhum homem novo para repor o combate');
      assert.equal(sim.totalHostilesSpawned, 14);
      assert.equal(new Set(sim.enemies.map((e) => e.id)).size, sim.enemies.length);
      assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
    });
  }

  it('ninguém fora do posto EA0 passa a WITHDRAWING/WITHDRAWN (a quinta, EB1, EC1 e EC2 mantêm as suas regras)', () => {
    const sim = new M02BenchSimulation(SEED);
    for (let i = 0; i < Math.ceil(60 / DT); i++) sim.tick(DT, {});
    assert.ok(sim.enemies.every((e) => e.state !== 'WITHDRAWING' && e.state !== 'WITHDRAWN'));
  });
});

describe('M02 D2: snapshot, restauro e validador (campo aditivo withdrawStartedAt; estados novos WITHDRAWING/WITHDRAWN)', () => {
  /** Posto a meio do recuo: um homem WITHDRAWING e outro já WITHDRAWN. */
  function midRetreat() {
    const sim = contactOpen();
    const { c, d } = dropTwoUntilWithdrawing(sim);
    d.x = westEdgeX(sim) + 0.2; // este chega primeiro
    for (let i = 0; i < 12; i++) sim.tick(DT, {});
    assert.equal(c.state, 'WITHDRAWING');
    assert.equal(d.state, 'WITHDRAWN');
    return { sim, c, d };
  }

  it('restaurar a meio do recuo reproduz a continuação (estado, destino e instante fazem parte do snapshot)', () => {
    const { sim } = midRetreat();
    const snap = structuredClone(sim.snapshot());
    assert.equal(validateM02Snapshot(snap).valid, true);
    const other = new M02BenchSimulation(5);
    other.restoreSnapshot(snap);
    for (let i = 0; i < 200; i++) {
      sim.tick(DT, {});
      other.tick(DT, {});
    }
    assert.equal(JSON.stringify(other.snapshot()), JSON.stringify(sim.snapshot()));
    assert.ok(ea0Of(sim).some((e) => e.state === 'WITHDRAWN'));
  });

  it('o validador aceita o estado e recusa as formas incoerentes (outro encontro, morto, destino em falta, instante inválido ou no futuro)', () => {
    const { sim, c, d } = midRetreat();
    const ok = sim.snapshot();
    const cases = [
      ['WITHDRAWING numa man da quinta', (s) => { const e = s.enemies.find((x) => x.encounterId !== 'EA0'); e.state = 'WITHDRAWING'; e.withdrawStartedAt = 1; e.goal = { x: 0, z: 0 }; }],
      ['WITHDRAWN morto', (s) => { Object.assign(s.enemies.find((x) => x.id === d.id), { alive: false, health: 0 }); }],
      ['WITHDRAWN ainda combatente', (s) => { s.enemies.find((x) => x.id === d.id).nonCombatant = false; }],
      ['WITHDRAWING já não combatente', (s) => { s.enemies.find((x) => x.id === c.id).nonCombatant = true; }],
      ['WITHDRAWING sem destino', (s) => { s.enemies.find((x) => x.id === c.id).goal = null; }],
      ['sem instante de início', (s) => { delete s.enemies.find((x) => x.id === c.id).withdrawStartedAt; }],
      ['instante no futuro', (s) => { s.enemies.find((x) => x.id === c.id).withdrawStartedAt = s.clock + 5; }],
      ['instante negativo', (s) => { s.enemies.find((x) => x.id === c.id).withdrawStartedAt = -1; }],
      ['instante não numérico', (s) => { s.enemies.find((x) => x.id === c.id).withdrawStartedAt = 'já'; }],
    ];
    for (const [label, mutate] of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, label);
      assert.match(r.reason, /Recuo do posto EA0 inválido|Estado de inimigo inválido/, label);
    }
    assert.equal(validateM02Snapshot(structuredClone(ok)).valid, true);
  });

  it('um save sem o campo (anterior a D2) continua válido e os estados antigos não mudam', () => {
    const sim = new M02BenchSimulation(SEED);
    const snap = structuredClone(sim.snapshot());
    assert.ok(snap.enemies.every((e) => !('withdrawStartedAt' in e)));
    assert.equal(validateM02Snapshot(snap).valid, true);
  });
});
