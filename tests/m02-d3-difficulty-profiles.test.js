// M02 D6 (PDF p. 18): perfis de dificuldade alinhados com a M01. Mesmos ids (recruta | soldado | veterano), multiplicadores derivados da
// tabela da M01 (importada). O perfil é configuração: fora do snapshot, não é reposto por checkpoints e é determinista.
// Teste de estado (fogo simulado por `fireActorBurst`, a via da IA), não playtest: os «impactos para morrer» e os tempos abaixo são
// números do modelo, não medições de jogo.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { WEAPON_PROFILES } from '../src/game/m02-combat-ai.js';
import {
  M02_DIFFICULTY,
  M02_DIFFICULTY_IDS,
  M02_DIFFICULTY_SIM_DEFAULT,
  M02_DIFFICULTY_NEW_GAME,
  M02_ENEMY_HIT_DAMAGE_FACTOR,
  M02_ENEMY_HIT_DAMAGE_MIN,
  M02_F1_TELEGRAPH_GAP_SEC,
  M02_REFERENCE_RIFLE_HIT,
  resolveM02Difficulty,
} from '../src/game/m02-difficulty.js';
import {
  M01_DIFFICULTY,
  M01_DIFFICULTY_IDS,
  M01_DIFFICULTY_NEW_GAME,
  M01_DIFFICULTY_SIM_DEFAULT,
  F1_TELEGRAPH_GAP_SEC,
} from '../src/game/m01-difficulty.js';

const SEED = 19390909;
const IDS = ['recruta', 'soldado', 'veterano'];

/**
 * Piotr de pé em campo aberto (30,-60), a secção longe, um fuzileiro Kar98k (ou o artilheiro MG34) a `dist` m a leste.
 * Os disparos são `fireActorBurst` com o relógio posto à mão: só se mede o modelo de fogo, sem a IA.
 */
function arena(id, { seed = SEED, weapon = 'kar98k', dist = 3 } = {}) {
  const sim = new M02BenchSimulation(seed, { difficulty: id });
  sim.teleportPlayer(30, -60, Math.PI);
  sim.allies.forEach((a) => Object.assign(a, { x: 100, z: 100 }));
  const shooter = sim.enemies.find((e) => e.alive && e.weapon === 'kar98k');
  Object.assign(shooter, { x: 30 + dist, z: -60, y: sim.world.heightAt(30 + dist, -60), crouched: false, weapon });
  const aim = () => ({ x: sim.player.x, y: sim.player.y + 1.25, z: sim.player.z });
  const fire = (clock, target = sim.player) => {
    sim.clock = clock;
    shooter.mag = 50;
    return sim.fireActorBurst(shooter, target, target === sim.player ? aim() : { x: target.x, y: target.y + 1.25, z: target.z }, 'enemy');
  };
  return { sim, shooter, fire };
}

/** Rajadas seguidas à cadência do perfil até Piotr cair (ou 60 rajadas): impactos que lhe tiraram vida, instante do último, vida por impacto. */
function lastStand(id, opts) {
  const { sim, shooter, fire } = arena(id, opts);
  const prof = WEAPON_PROFILES[shooter.weapon];
  const step = prof.cycleSec * M02_DIFFICULTY[id].cooldownScale;
  const hpAfterEachHit = [];
  let t = 0;
  for (let i = 0; i < 60 && sim.player.health > 0; i++, t += step) {
    const before = sim.player.health;
    fire(t);
    if (sim.player.health < before) hpAfterEachHit.push(sim.player.health);
  }
  return { sim, hits: hpAfterEachHit.length, hpAfterEachHit, lastAt: t - step };
}

/**
 * FIX-CD: a mesma «última resistência» com TICKS REAIS (a IA decide quando dispara) a um dt dado: Piotr de pé a 10 m de um Kar98k
 * isolado (o resto do roster e a secção longe, a MG calada). Devolve a vida depois de cada impacto. Antes a regra F1 contava o relógio
 * do tick que processava o disparo e o resultado mudava com o dt (veterano: o 2.º impacto matava com dt 0,1/0,05 e não com 1/60).
 */
function lastStandTicks(id, dtOf, seed = 1) {
  const sim = new M02BenchSimulation(seed, { difficulty: id });
  sim.teleportPlayer(30, -60, Math.PI);
  sim.allies.forEach((a) => Object.assign(a, { x: 100, z: 100, alive: false, state: 'DEAD', health: 0 }));
  const shooter = sim.enemies.find((e) => e.alive && e.weapon === 'kar98k');
  for (const e of sim.enemies) if (e !== shooter) Object.assign(e, { x: 150, z: 150, y: 0, mag: 0, reserve: 0, goal: null });
  Object.assign(shooter, { x: 40, z: -60, y: sim.world.heightAt(40, -60), crouched: false, mag: 500, facing: Math.PI, buildingId: null, sector: null, goal: null });
  sim.mgState.nextBurstAt = 1e9;
  const hits = [];
  for (let i = 0; i < 4000 && sim.player.health > 0 && sim.clock < 30; i++) {
    const before = sim.player.health;
    sim.tick(dtOf(i), {});
    if (sim.player.health < before) hits.push(sim.player.health);
  }
  return hits;
}
const DTS = [
  ['0,1', () => 0.1],
  ['0,05', () => 0.05],
  ['1/60', () => 1 / 60],
  ['irregular', (i) => 1 / 60 + (((i * 7919) % 13) - 6) * 0.0003],
];

describe('M02 D6: mesmos ids e multiplicadores derivados da tabela da M01', () => {
  it('os ids, o perfil por omissão da simulação e o do jogo novo são os da M01', () => {
    assert.deepEqual(M02_DIFFICULTY_IDS, M01_DIFFICULTY_IDS);
    assert.deepEqual([...M02_DIFFICULTY_IDS], IDS);
    assert.equal(M02_DIFFICULTY_SIM_DEFAULT, M01_DIFFICULTY_SIM_DEFAULT);
    assert.equal(M02_DIFFICULTY_SIM_DEFAULT, 'recruta');
    assert.equal(M02_DIFFICULTY_NEW_GAME, M01_DIFFICULTY_NEW_GAME);
    assert.equal(M02_F1_TELEGRAPH_GAP_SEC, F1_TELEGRAPH_GAP_SEC);
    assert.deepEqual(Object.keys(M02_DIFFICULTY), IDS);
    assert.equal(new M02BenchSimulation(SEED).difficulty.id, 'recruta');
  });

  it('precisão, cadência e reação são os valores da M01; o dano e o teto da rajada vêm do `woundDamage` e do `burstWoundCap`', () => {
    for (const id of IDS) {
      const m01 = M01_DIFFICULTY[id];
      const m02 = M02_DIFFICULTY[id];
      assert.equal(m02.aimErrorScale, m01.aimErrorScale, `${id}: aimErrorScale`);
      assert.equal(m02.cooldownScale, m01.cooldownScale, `${id}: cooldownScale`);
      assert.equal(m02.reactionGraceSec, m01.reactionGraceSec, `${id}: reactionGraceSec`);
    }
    // recruta = afinação de protótipo da M02: todos os multiplicadores 1 e nenhuma regra nova (byte a byte o comportamento de antes)
    assert.deepEqual(
      [M02_DIFFICULTY.recruta.damageTakenScale, M02_DIFFICULTY.recruta.aimErrorScale, M02_DIFFICULTY.recruta.cooldownScale],
      [1, 1, 1],
    );
    assert.equal(M02_DIFFICULTY.recruta.burstDamageCap, null);
    assert.equal(M02_DIFFICULTY.recruta.reactionGraceSec, null);
    // soldado e veterano: um tiro de Kar98k ao tronco = uma «ferida» da M01; uma ferida por rajada
    for (const id of ['soldado', 'veterano']) {
      const m01 = M01_DIFFICULTY[id];
      assert.equal(M02_DIFFICULTY[id].rifleTorsoHit, m01.woundDamage, `${id}: dano de um tiro ao tronco`);
      assert.equal(M02_DIFFICULTY[id].damageTakenScale * M02_REFERENCE_RIFLE_HIT, m01.woundDamage);
      assert.equal(M02_DIFFICULTY[id].burstDamageCap, m01.burstWoundCap * m01.woundDamage, `${id}: teto por rajada`);
    }
  });

  it('o tiro de referência é o de Kar98k ao tronco da afinação de protótipo (46 x 0,35 = 16) e a tabela é imutável', () => {
    assert.equal(M02_ENEMY_HIT_DAMAGE_FACTOR, 0.35);
    assert.equal(
      M02_REFERENCE_RIFLE_HIT,
      Math.max(M02_ENEMY_HIT_DAMAGE_MIN, Math.round(WEAPON_PROFILES.kar98k.damage * M02_ENEMY_HIT_DAMAGE_FACTOR)),
    );
    assert.equal(Object.isFrozen(M02_DIFFICULTY), true);
    assert.equal(Object.isFrozen(M02_DIFFICULTY.soldado), true);
    assert.throws(() => { M02_DIFFICULTY.soldado.aimErrorScale = 1; }, TypeError);
  });

  it('resolveM02Difficulty e o construtor recusam ids que não são da M01; setDifficulty muda só o perfil', () => {
    for (const bad of ['acessivel', 'Padrão', 'RECRUTA', '', null, undefined, 3, '__proto__', 'toString']) {
      assert.throws(() => resolveM02Difficulty(bad), RangeError, String(bad));
    }
    assert.throws(() => new M02BenchSimulation(SEED, { difficulty: 'normal' }), RangeError);
    const sim = new M02BenchSimulation(SEED);
    assert.equal(sim.setDifficulty('veterano').id, 'veterano');
    assert.equal(sim.difficulty, M02_DIFFICULTY.veterano);
    assert.throws(() => sim.setDifficulty('lenda'), RangeError);
    assert.equal(sim.difficulty.id, 'veterano', 'um id recusado não muda o perfil');
  });
});

describe('M02 D6: valor documentado por perfil (impactos de Kar98k ao tronco para matar Piotr, 100 de vida)', () => {
  const expected = {
    recruta: { hit: 16, hitsToKill: 7 }, // hoje: ~6-7 impactos de 16
    soldado: { hit: 34, hitsToKill: 3 }, // as 3 feridas da M01
    veterano: { hit: 50, hitsToKill: 2 }, // as 2 feridas da M01
  };

  /** Um atirador que já combate Piotr há muito: tiros seguidos sem a regra F1 a segurar a vida; devolve a vida perdida por cada impacto. */
  const damagePerHit = (id, aimHeight) => {
    const { sim, shooter, fire } = arena(id, { dist: 4 });
    shooter.aimEngagedAt = -100;
    shooter.aimLastAt = 0;
    const out = [];
    for (let i = 0; i < 12 && sim.player.health > 0; i++) {
      const before = sim.player.health;
      sim.clock = i * 0.01;
      shooter.mag = 5;
      sim.fireActorBurst(shooter, sim.player, { x: sim.player.x, y: sim.player.y + aimHeight, z: sim.player.z }, 'enemy');
      out.push(before - sim.player.health);
    }
    return out;
  };

  for (const id of IDS) {
    it(`${id}: ${expected[id].hit} de dano por tiro ao tronco, ${expected[id].hitsToKill} impactos para morrer`, () => {
      assert.equal(M02_DIFFICULTY[id].rifleTorsoHit, expected[id].hit);
      assert.equal(M02_DIFFICULTY[id].rifleHitsToKill, expected[id].hitsToKill);
      const damages = damagePerHit(id, 1.25).filter((d) => d > 0);
      assert.equal(damages.length, expected[id].hitsToKill, `${id}: ${damages.join(',')}`);
      assert.equal(damages[0], expected[id].hit, 'dano do primeiro impacto (tronco)');
    });
  }

  it('por parte do corpo, em tiros reais (cabeça, tronco, pernas): recruta 32/16/11 (x2, x1, x0,7); soldado e veterano limitam a cabeça a UMA ferida (34 | 50)', () => {
    const first = (id, height) => damagePerHit(id, height)[0];
    assert.deepEqual([first('recruta', 1.68), first('recruta', 1.25), first('recruta', 0.45)], [32, 16, 11]);
    // o teto «uma ferida por rajada» da M01 vale também para o tiro isolado: a cabeça (x2) não passa de uma ferida
    assert.deepEqual([first('soldado', 1.68), first('soldado', 1.25), first('soldado', 0.45)], [34, 34, 23]);
    assert.deepEqual([first('veterano', 1.68), first('veterano', 1.25), first('veterano', 0.45)], [50, 50, 34]);
  });
});

describe('M02 D6: o fogo inimigo muda com o perfil; o da secção e o resto do jogo não', () => {
  it('recruta: um atirador isolado mata Piotr de pé em 7 impactos (6 impactos deixam-no com 4); sem regra F1 nem campos novos nos hostis', () => {
    const { sim, hits, hpAfterEachHit } = lastStand('recruta');
    assert.equal(hits, 7);
    assert.deepEqual(hpAfterEachHit, [84, 68, 52, 36, 20, 4, 0]);
    assert.equal(sim.player.alive, false);
    for (const e of sim.enemies) {
      assert.equal('aimEngagedAt' in e, false, `${e.id}: recruta não escreve estado novo`);
      assert.equal('aimLastAt' in e, false);
    }
  });

  it('soldado: 3 impactos; o 3.º só mata quando o atirador o combate há ≥ 1,2 s (F1); 1.º e 2.º nunca matam', () => {
    const { sim, hits, hpAfterEachHit, lastAt } = lastStand('soldado');
    assert.deepEqual(hpAfterEachHit, [66, 32, 0]);
    assert.equal(hits, 3);
    assert.ok(lastAt >= M02_DIFFICULTY.soldado.reactionGraceSec, `o impacto fatal veio ${lastAt.toFixed(3)} s depois do 1.º contacto`);
    assert.equal(sim.player.alive, false);
  });

  it('veterano: 2 impactos de 50; com um atirador isolado à cadência do perfil (0,775 s < 0,8 s de F1) o 2.º ainda não mata e o 3.º sim', () => {
    const lone = lastStand('veterano');
    assert.deepEqual(lone.hpAfterEachHit, [50, 1, 0]);
    assert.equal(lone.hits, 3);
    // já em contacto há mais do que a graça (ou dois atiradores em contacto): bastam 2 impactos
    const { sim, fire, shooter } = arena('veterano');
    fire(0);
    assert.equal(sim.player.health, 50);
    fire(M02_DIFFICULTY.veterano.reactionGraceSec + 0.01);
    assert.equal(sim.player.health, 0);
    assert.equal(shooter.aimEngagedAt, 0);
  });

  it('F1 conta tempo, não ticks (FIX-CD): com ticks reais a dt 0,1 | 0,05 | 1/60 | irregular, o resultado de um Kar98k isolado é o mesmo', () => {
    for (const [label, dtOf] of DTS) {
      for (const seed of [1, 2, 3]) {
        assert.deepEqual(lastStandTicks('veterano', dtOf, seed), [50, 1, 0], `veterano, dt ${label}, semente ${seed}: o 2.º impacto ainda não mata`);
        assert.deepEqual(lastStandTicks('soldado', dtOf, seed), [66, 32, 0], `soldado, dt ${label}, semente ${seed}`);
      }
    }
  });

  it('F1: o primeiro contacto nunca mata (vida fica em 1) em soldado e veterano; em recruta mata; o contacto quebra-se após 6 s sem disparar', () => {
    for (const id of ['soldado', 'veterano']) {
      const { sim, fire, shooter } = arena(id);
      sim.player.health = 3;
      fire(10);
      assert.equal(sim.player.health, 1, `${id}: o 1.º contacto deixa 1 de vida, não 0`);
      assert.equal(sim.player.alive, true);
      assert.equal(shooter.aimEngagedAt, 10);
      // dentro do intervalo e depois da graça: mata
      const graceEnd = 10 + M02_DIFFICULTY[id].reactionGraceSec + 0.01;
      fire(graceEnd);
      assert.equal(sim.player.health, 0, `${id}: depois da graça o mesmo atirador mata`);
    }
    const { sim: rec, fire: fireRec } = arena('recruta');
    rec.player.health = 3;
    fireRec(10);
    assert.equal(rec.player.health, 0, 'recruta: sem regra F1');
    // intervalo de mais de F1_TELEGRAPH_GAP_SEC sem disparar a Piotr: novo contacto, a graça recomeça
    const { sim, fire, shooter } = arena('soldado');
    fire(0);
    sim.player.health = 3;
    fire(M02_F1_TELEGRAPH_GAP_SEC - 0.5); // ainda o mesmo contacto: 5,5 s > 1,2 s de graça
    assert.equal(sim.player.health, 0);
    const second = arena('soldado');
    second.fire(0);
    second.sim.player.health = 3;
    second.fire(M02_F1_TELEGRAPH_GAP_SEC + 0.5); // contacto quebrado: é como o primeiro
    assert.equal(second.sim.player.health, 1);
    assert.equal(second.shooter.aimEngagedAt, M02_F1_TELEGRAPH_GAP_SEC + 0.5);
    assert.ok(shooter.aimEngagedAt === 0);
  });

  it('MG34 ao tronco, 3 m: recruta 5 x 8 = 40; soldado e veterano têm o teto de uma ferida por rajada (34 | 50) e a vida nunca chega a 0 na 1.ª rajada', () => {
    const lost = {};
    for (const id of IDS) {
      const { sim, fire, shooter } = arena(id, { weapon: 'mg34' });
      shooter.aimEngagedAt = -100;
      shooter.aimLastAt = 0;
      const before = sim.player.health;
      const burst = fire(0);
      // Merge M02 único (rajadas causais, Codex 702ced95): a rajada sai ronda a ronda; esgota-se aqui a rajada pendente, ronda a ronda,
      // no instante de cada uma. O teto «uma ferida por rajada» atravessa as rondas (a rajada pendente leva o dano já feito a Piotr).
      let rounds = burst.rounds;
      while (shooter.burst) {
        sim.clock = shooter.burst.nextAt;
        const emitted = shooter.burst.emitted;
        sim.advanceActorBurst(shooter);
        rounds += (shooter.burst?.emitted ?? WEAPON_PROFILES.mg34.burstCount) - emitted;
      }
      assert.equal(burst.burstSize, WEAPON_PROFILES.mg34.burstCount);
      assert.equal(rounds, WEAPON_PROFILES.mg34.burstCount);
      lost[id] = before - sim.player.health;
    }
    assert.equal(lost.recruta, 5 * 8);
    assert.equal(lost.soldado, M02_DIFFICULTY.soldado.burstDamageCap, 'soldado: no máximo uma ferida (34) por rajada');
    assert.equal(lost.veterano, M02_DIFFICULTY.veterano.burstDamageCap, 'veterano: no máximo uma ferida (50) por rajada');
    // uma rajada de MG34 a Piotr com 100 de vida nunca o mata em nenhum perfil
    for (const id of IDS) assert.ok(100 - lost[id] > 0);
  });

  it('o ciclo de fogo do hostil é o do perfil (x1 | x0,5 | x0,5), contra Piotr e contra a secção; o da secção polaca não muda', () => {
    for (const id of IDS) {
      const { sim, shooter, fire } = arena(id);
      const cycle = WEAPON_PROFILES.kar98k.cycleSec;
      fire(10);
      assert.equal(shooter.nextFireAt, Number((10 + cycle * M02_DIFFICULTY[id].cooldownScale).toFixed(3)), `${id}: contra Piotr`);
      const ally = sim.allies[0];
      Object.assign(ally, { x: shooter.x - 20, z: -60, y: sim.world.heightAt(shooter.x - 20, -60) });
      fire(50, ally);
      assert.equal(shooter.nextFireAt, Number((50 + cycle * M02_DIFFICULTY[id].cooldownScale).toFixed(3)), `${id}: contra a secção`);
      // fogo da secção: a arma da secção usa o seu ciclo, qualquer que seja o perfil
      const gruca = sim.allies.find((a) => a.id === 'pl_gruca');
      Object.assign(gruca, { x: 0, z: -60, y: sim.world.heightAt(0, -60), mag: 5 });
      sim.clock = 70;
      sim.fireActorBurst(gruca, shooter, { x: shooter.x, y: shooter.y + 1.25, z: shooter.z }, 'ally');
      assert.equal(gruca.nextFireAt, Number((70 + WEAPON_PROFILES.wz29.cycleSec).toFixed(3)), `${id}: a secção não muda`);
    }
  });

  it('o erro de pontaria x0,35 só vale para o fogo inimigo apontado a Piotr: em 60 m soldado acerta bem mais que recruta; contra a secção é igual em todos', () => {
    const rate = (id) => {
      const { sim, shooter, fire } = arena(id, { dist: 60, seed: 4242 });
      let rounds = 0;
      let hit = 0;
      for (let i = 0; i < 120; i++) {
        sim.player.health = 100;
        const burst = fire(i * 20);
        rounds += burst.rounds;
        if (burst.hitAny) hit += 1;
      }
      return { hit, rounds };
    };
    const r = rate('recruta');
    const s = rate('soldado');
    const v = rate('veterano');
    assert.ok(s.hit > r.hit + 20, `acertos em 120 rajadas a 60 m: recruta ${r.hit} · soldado ${s.hit}`);
    assert.equal(s.hit, v.hit, 'soldado e veterano partilham o erro de pontaria (0,35)');

    // contra um aliado, com o mesmo gerador, o resultado é igual em todos os perfis
    const outcome = (id) => {
      const { sim, shooter, fire } = arena(id, { dist: 60, seed: 4242 });
      const ally = sim.allies[0];
      Object.assign(ally, { x: 30, z: -60, y: sim.world.heightAt(30, -60), health: 100 });
      sim.player.x = 200;
      const hits = [];
      for (let i = 0; i < 40; i++) {
        ally.health = 100;
        const burst = fire(i * 20, ally);
        hits.push([burst.hitAny, 100 - ally.health]);
      }
      return JSON.stringify([hits, sim.rng.state]);
    };
    assert.equal(outcome('soldado'), outcome('recruta'));
    assert.equal(outcome('veterano'), outcome('recruta'));
  });

  it('a explosão perigosa de um hostil fere Piotr com o dano do perfil; a granada do próprio Piotr não escala', () => {
    const hurt = {};
    for (const id of IDS) {
      const sim = new M02BenchSimulation(SEED, { difficulty: id });
      sim.teleportPlayer(30, -60, 0);
      sim.allies.forEach((a) => Object.assign(a, { x: 100, z: 100 }));
      sim.enemies.forEach((e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 }));
      const own = sim.detonateGrenadeAt(32, 0.5, -60, 6.5); // granada do jogador: sem `meta`
      hurt[id] = { own: 100 - sim.player.health };
      sim.player.health = 100;
      const hostile = sim.detonateGrenadeAt(32, 0.5, -60, 6.5, { source: 'enemy_grenade', blastId: 'blast_x', thrownBy: 'DE-A01' });
      hurt[id].hostile = 100 - sim.player.health;
      assert.equal(own.source, undefined);
      assert.equal(hostile.source, 'enemy_grenade');
    }
    assert.equal(hurt.soldado.own, hurt.recruta.own, 'a granada do jogador não escala com o perfil');
    assert.equal(hurt.veterano.own, hurt.recruta.own);
    assert.equal(hurt.recruta.hostile, hurt.recruta.own, 'em recruta a granada hostil faz o dano de sempre');
    assert.ok(hurt.soldado.hostile > hurt.recruta.hostile, `soldado ${hurt.soldado.hostile} > recruta ${hurt.recruta.hostile}`);
    assert.ok(hurt.veterano.hostile >= hurt.soldado.hostile);
  });
});

// FIX-CD: como na M01 (H9 D1), o perfil entra no snapshot — muda o resultado da simulação — e o restauro repõe-no. Omitido em recruta
// (saves de recruta iguais aos de antes; um save sem o campo restaura-se em recruta). A acessibilidade continua fora (I5).
describe('M02 D6: o perfil entra no snapshot (exceto recruta), é reposto pelo restauro e é determinista', () => {
  const drive = (id, ticks = 300) => {
    const sim = new M02BenchSimulation(SEED, { difficulty: id });
    for (let i = 0; i < ticks; i++) {
      sim.tick(0.05, { crouch: i === 0, aim: i % 90 < 45, fire: i % 25 === 5, lookX: i % 200 === 100 ? 0.12 : 0 });
    }
    return sim;
  };

  it('o snapshot leva o perfil em soldado e veterano e não o leva em recruta; o validador aceita os três e recusa ids desconhecidos', () => {
    for (const id of IDS) {
      const snap = drive(id, 120).snapshot();
      assert.equal(snap.difficulty, id === 'recruta' ? undefined : id, `${id}: campo difficulty`);
      assert.equal('difficulty' in snap, id !== 'recruta', `${id}: recruta não escreve o campo (saves iguais aos de antes)`);
      assert.equal(validateM02Snapshot(snap).valid, true);
      // a acessibilidade continua fora do snapshot
      assert.equal(JSON.stringify(snap).includes('accessibility'), false);
    }
    const snap = drive('soldado', 10).snapshot();
    for (const bad of ['normal', 'Soldado', 3, null, '']) {
      const r = validateM02Snapshot({ ...structuredClone(snap), difficulty: bad });
      assert.equal(r.valid, false, `difficulty=${String(bad)}`);
      assert.match(r.reason, /dificuldade/);
    }
    assert.equal(validateM02Snapshot({ ...structuredClone(snap), difficulty: 'recruta' }).valid, true, 'recruta explícito também é válido');
  });

  it('restaurar um checkpoint gravado noutro perfil repõe o perfil do snapshot; um save sem o campo restaura-se em recruta; reset() não mexe', () => {
    const a = drive('soldado', 160);
    const snap = structuredClone(a.snapshot());
    const b = new M02BenchSimulation(1, { difficulty: 'veterano' });
    b.restoreSnapshot(snap);
    assert.equal(b.difficulty.id, 'soldado', 'o perfil do snapshot');
    const c = new M02BenchSimulation(1);
    c.restoreSnapshot(snap);
    assert.equal(c.difficulty.id, 'soldado');
    // save sem o campo (anterior ao FIX-CD, ou de recruta): recruta
    const legacy = structuredClone(snap);
    delete legacy.difficulty;
    const d = new M02BenchSimulation(1, { difficulty: 'veterano' });
    d.restoreSnapshot(legacy);
    assert.equal(d.difficulty.id, 'recruta');
    // reset() não mexe no perfil em vigor
    b.reset();
    assert.equal(b.difficulty.id, 'soldado');
    // restauro falhado: o perfil anterior fica
    const e = new M02BenchSimulation(1, { difficulty: 'veterano' });
    assert.throws(() => e.restoreSnapshot({ ...structuredClone(snap), difficulty: 'lenda' }));
    assert.equal(e.difficulty.id, 'veterano');
  });

  it('é determinista: mesma semente, mesmo perfil e mesmas entradas dão o mesmo estado; o perfil muda o estado', () => {
    const states = Object.fromEntries(IDS.map((id) => [id, JSON.stringify(drive(id).snapshot())]));
    for (const id of IDS) assert.equal(JSON.stringify(drive(id).snapshot()), states[id], `${id}: repetível`);
    assert.notEqual(states.soldado, states.recruta);
    assert.notEqual(states.veterano, states.soldado);
  });

  it('restaurar a meio e repetir as entradas reproduz a continuação tick a tick em soldado e veterano (o estado F1 dos atiradores faz parte do snapshot)', () => {
    for (const id of ['soldado', 'veterano']) {
      const controls = (i) => ({ aim: i % 90 < 45, fire: i % 25 === 5, forward: i < 80 ? 1 : 0 });
      const sim = new M02BenchSimulation(SEED, { difficulty: id });
      sim.teleportPlayer(-44.0, -15.5, 0); // à janela de B01: DE-A07 combate Piotr cedo
      sim.player.crouched = false;
      for (let i = 0; i < 120; i++) sim.tick(0.05, controls(i));
      const snap = structuredClone(sim.snapshot());
      const engaged = snap.enemies.filter((e) => e.aimEngagedAt != null);
      assert.ok(engaged.length >= 1, `${id}: pelo menos um atirador já tem contacto com Piotr no snapshot`);
      assert.equal(validateM02Snapshot(snap).valid, true);
      const tail = (s) => {
        const out = [];
        for (let i = 120; i < 320; i++) {
          s.tick(0.05, controls(i));
          out.push(JSON.stringify([s.clock, s.player.health, s.rng.state, s.enemies.map((e) => [e.id, e.aimEngagedAt, e.aimLastAt, e.nextFireAt])]));
        }
        return out;
      };
      const ref = tail(sim);
      const fresh = new M02BenchSimulation(7, { difficulty: id });
      fresh.restoreSnapshot(snap);
      assert.deepEqual(tail(fresh), ref, `${id}: continuação igual depois do restauro`);
    }
  });

  it('o validador recusa instantes de contacto inválidos nos hostis', () => {
    const sim = new M02BenchSimulation(SEED, { difficulty: 'soldado' });
    const ok = sim.snapshot();
    for (const [k, v] of [['aimEngagedAt', 'agora'], ['aimLastAt', -1], ['aimEngagedAt', Number.POSITIVE_INFINITY]]) {
      const bad = structuredClone(ok);
      bad.enemies[0][k] = v;
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, `${k}=${v}`);
    }
    const good = structuredClone(ok);
    good.enemies[0].aimEngagedAt = 3;
    good.enemies[0].aimLastAt = 4;
    assert.equal(validateM02Snapshot(good).valid, true);
  });
});

describe('M02 D6: números do modelo (informação para a calibração; NÃO é playtest)', () => {
  it('tempo até morrer de pé a 40 m contra um só Kar98k (12 sementes): recruta >> soldado >= veterano', (t) => {
    const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const seconds = {};
    for (const id of IDS) {
      const times = [];
      for (let seed = 1; seed <= 12; seed++) {
        const { sim, shooter, fire } = arena(id, { seed, dist: 40 });
        const step = WEAPON_PROFILES.kar98k.cycleSec * M02_DIFFICULTY[id].cooldownScale;
        let at = 0;
        for (let i = 0; i < 400 && sim.player.health > 0; i++, at += step) fire(at);
        assert.equal(sim.player.alive, false, `${id}/${seed}: Piotr de pé a descoberto acaba por cair`);
        times.push(Number((at - step).toFixed(2)));
        assert.ok(shooter.shotsFired > 0);
      }
      seconds[id] = { median: median(times), min: Math.min(...times), max: Math.max(...times) };
    }
    t.diagnostic(
      'tempo até morrer, Piotr de pé a 40 m, 1 Kar98k a disparar sem parar, 12 sementes (s; mediana/mín/máx): ' +
        IDS.map((id) => `${id} ${seconds[id].median}/${seconds[id].min}/${seconds[id].max}`).join(' · ') +
        ` — para comparar: barras de M01 (H9 §6, atiradores muito mais lentos) soldado 15-25 s, veterano 8-12 s`,
    );
    assert.ok(seconds.recruta.median > 3 * seconds.soldado.median, JSON.stringify(seconds));
    assert.ok(seconds.soldado.median >= seconds.veterano.median, JSON.stringify(seconds));
    assert.ok(seconds.veterano.median >= 1.5, 'a graça F1 dá pelo menos 1,55 s entre o 1.º contacto e a morte');
  });
});
