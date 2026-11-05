// M02 SP02 (PDF C06 p. 13, J2 p. 36-37, F8 p. 26): o tiro parte o varal e a carroça fica imobilizada (sem explosão); se o
// evento falha, a alternativa «parada» é explícita; rota (-70,60)→(-20,60)→(0,30)→(0,-70). Testes de estado (não são playtest).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  breakCartShaft,
  parkCartFallback,
  resolveCartCrossingEvent,
  CART_SHOT_WINDOW_SEC,
  CART_IMMOBILIZED_CAUSES,
} from '../src/game/m02-acts-director.js';

const SEED = 19390909;
const FAR = { x: 150, z: 150 }; // > 180 m do cruzamento: fora de alcance (kar98k) e dos aliados

function enterB() {
  const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
  sim.enterAreaBC06();
  return sim;
}

/** Deixa só 6 hostis vivos (a moral só colapsa com ≥ 7 neutralizados) e põe a carroça na perna final, em (0, z). */
function crossingSetup(sim, { z = 15, farAll = false } = {}) {
  let dead = 0;
  for (const e of sim.enemies) {
    if (dead < 6) {
      e.alive = false;
      e.state = 'DEAD';
      e.health = 0;
      dead += 1;
    }
  }
  const alive = sim.enemies.filter((e) => e.alive);
  if (farAll) {
    for (const e of alive) Object.assign(e, { x: FAR.x, z: FAR.z, y: sim.world.heightAt(FAR.x, FAR.z) });
  }
  const cart = sim.areaB.supplyCart;
  Object.assign(cart, { x: 0, z, waypointIdx: 3, state: 'MOVING' });
  return { cart, alive };
}

describe('M02 SP02: rota da carroça (E3 p. 21)', () => {
  it('sem hostis capazes a carroça percorre (-70,60)→(-20,60)→(0,30)→(0,-70) pela ordem, não é atingida e entrega 2 volumes', () => {
    const sim = enterB();
    for (const e of sim.enemies) {
      e.alive = false;
      e.state = 'DEAD';
      e.health = 0;
    }
    const cart = sim.areaB.supplyCart;
    assert.deepEqual([cart.x, cart.z], [-70, 60]);
    const seen = [];
    const near = (p, tol = 3.0) => Math.hypot(cart.x - p[0], cart.z - p[1]) <= tol;
    const route = [[-70, 60], [-20, 60], [0, 30], [0, -70]];
    for (let i = 0; i < 900 && cart.state !== 'DELIVERED'; i++) {
      sim.tick(0.1, {});
      route.forEach((p, idx) => {
        if (near(p) && !seen.includes(idx)) seen.push(idx);
      });
    }
    assert.deepEqual(seen, [0, 1, 2, 3], 'passou pelos 4 pontos da rota, por ordem');
    assert.equal(cart.state, 'DELIVERED');
    assert.equal(cart.shaftBroken, false);
    assert.equal(cart.immobilizedCause, null);
    assert.equal(sim.flags['m02.supply_reached'], 2);
    const total = 50 + Math.hypot(20, 30) + 100;
    assert.ok(sim.clock >= total / cart.speed - 1 && sim.clock <= total / cart.speed + 3, `tempo ${sim.clock} s para ${total.toFixed(0)} m a ${cart.speed} m/s`);
  });
});

describe('M02 SP02: o tiro parte o varal (shaft_broken) e a carroça fica imobilizada', () => {
  it('um hostil capaz (supressão < 0,88) com linha de tiro e alcance parte o varal na perna final; não explode', () => {
    const sim = enterB();
    const { cart, alive } = crossingSetup(sim);
    const shooter = alive.find((e) => e.id === 'DE-B09');
    const rest = alive.filter((e) => e !== shooter);
    for (const e of rest) Object.assign(e, { x: FAR.x, z: FAR.z, y: sim.world.heightAt(FAR.x, FAR.z) });
    for (const e of alive) e.suppressed = 0.7; // abaixo de 0,88 ainda disparam; ≥ 0,65 não contam como «fogo direto» que trava a carroça
    const magBefore = shooter.mag;
    assert.equal(sim.world.lineOfSight(shooter, { x: 0, y: sim.world.heightAt(0, 15), z: 15, eyeHeight: 1 }), true, 'pré-condição: linha de tiro');
    sim.tick(0.1, {});
    assert.equal(cart.state, 'IMMOBILIZED');
    assert.equal(cart.shaftBroken, true);
    assert.equal(cart.immobilizedCause, 'shaft_broken');
    assert.equal(cart.wheelDamaged, false, 'o varal, não a roda');
    assert.equal(cart.shotById, shooter.id);
    assert.equal(cart.parkedReason, null);
    assert.equal(shooter.mag, magBefore - 1, 'o tiro gasta uma bala do atirador');
    const ev = sim.combatLog.find((e) => e.type === 'supply_cart_immobilized');
    assert.equal(ev.cause, 'shaft_broken');
    assert.equal(ev.shooterId, shooter.id);
    assert.ok(sim.events.some((e) => e.type === 'cart-shaft-broken'));
    assert.ok(!sim.combatLog.some((e) => e.type === 'grenade-exploded' && Math.hypot(e.center.x - cart.x, e.center.z - cart.z) < 3), 'sem explosão da carroça');
    // fica onde está e os volumes ficam soltos ao lado, para transporte a pé
    const where = [cart.x, cart.z];
    for (let i = 0; i < 100; i++) sim.tick(0.1, {});
    assert.deepEqual([cart.x, cart.z], where, 'imobilizada: não volta a andar');
    assert.ok(cart.volumes.every((v) => v.state === 'DROPPED_READY'));
    assert.ok(cart.volumes.every((v) => Math.hypot(v.x - cart.x, v.z - cart.z) <= 1.0));
    // transporte a pé: o jogador pega no volume e entrega-o
    assert.equal(sim.pickupSupplyVolume('vol_water'), true);
    assert.equal(sim.deliverSupplyVolume('vol_water'), true);
    assert.equal(sim.flags['m02.supply_reached'], 1);
  });

  it('o atirador mais próximo com linha de tiro é o escolhido (determinista, sem RNG)', () => {
    const sim = enterB();
    const { cart, alive } = crossingSetup(sim);
    for (const e of alive) e.suppressed = 0.7;
    const rngBefore = sim.rng.state;
    const r = resolveCartCrossingEvent(sim, cart);
    assert.equal(r, 'shaft_broken');
    assert.equal(sim.rng.state, rngBefore, 'o evento não consome o RNG');
    const cands = alive
      .filter((e) => sim.world.lineOfSight(e, { x: 0, y: sim.world.heightAt(0, 15), z: 15, eyeHeight: 1 }))
      .sort((a, b) => Math.hypot(a.x, a.z - 15) - Math.hypot(b.x, b.z - 15));
    assert.equal(cart.shotById, cands[0].id);
  });

  it('hostis rendidos/mortos ou com supressão ≥ 0,88 não disparam: a carroça passa', () => {
    const sim = enterB();
    const { cart, alive } = crossingSetup(sim);
    for (const e of alive) e.suppressed = 0.95;
    assert.equal(resolveCartCrossingEvent(sim, cart), null);
    assert.equal(cart.state, 'MOVING');
    for (const e of alive) {
      e.suppressed = 0;
      e.nonCombatant = true;
      e.state = 'SURRENDERED';
    }
    assert.equal(resolveCartCrossingEvent(sim, cart), null);
    assert.equal(cart.shaftBroken, false);
  });

  it('antes da perna final (z > 20) não há tiro à carroça', () => {
    const sim = enterB();
    const { cart, alive } = crossingSetup(sim, { z: 45 });
    for (const e of alive) e.suppressed = 0.7;
    cart.waypointIdx = 2;
    assert.equal(resolveCartCrossingEvent(sim, cart), null);
    cart.waypointIdx = 3;
    cart.z = 25;
    assert.equal(resolveCartCrossingEvent(sim, cart), null);
    assert.equal(cart.state, 'MOVING');
  });
});

describe('M02 SP02: alternativa «parada» explícita quando o evento do tiro falha', () => {
  it('hostis capazes vivos mas sem alcance/linha de tiro: depois de CART_SHOT_WINDOW_SEC a carroça fica parada (parked_fallback), volumes soltos', () => {
    const sim = enterB();
    const { cart, alive } = crossingSetup(sim, { farAll: true });
    for (let i = 0; i < 60 && cart.state === 'MOVING'; i++) {
      for (const e of alive) e.suppressed = 0.7;
      sim.tick(0.1, {});
    }
    assert.equal(cart.state, 'IMMOBILIZED');
    assert.equal(cart.immobilizedCause, 'parked_fallback');
    assert.equal(cart.parkedReason, 'shot_event_failed');
    assert.equal(cart.shaftBroken, false, 'não foi um tiro');
    assert.ok(cart.crossingEntryAt !== null);
    assert.ok(sim.clock - cart.crossingEntryAt >= CART_SHOT_WINDOW_SEC - 1e-6, 'só depois da janela do evento');
    assert.ok(cart.volumes.every((v) => v.state === 'DROPPED_READY'), 'transporte manual dos volumes');
    assert.equal(sim.combatLog.find((e) => e.type === 'supply_cart_immobilized').cause, 'parked_fallback');
  });

  it('parkCartFallback e breakCartShaft só atuam numa carroça ainda móvel (não repetem nem sobrepõem causas)', () => {
    const sim = enterB();
    assert.equal(parkCartFallback(sim, 'shot_event_failed'), true);
    assert.equal(breakCartShaft(sim, { shooterId: 'DE-B09' }), false, 'já imobilizada');
    assert.equal(sim.areaB.supplyCart.immobilizedCause, 'parked_fallback');
    assert.equal(sim.areaB.supplyCart.shaftBroken, false);
    const sim2 = enterB();
    assert.equal(sim2.damageCartWheel(), true);
    assert.equal(sim2.areaB.supplyCart.immobilizedCause, 'wheel_damaged');
    assert.equal(sim2.areaB.supplyCart.wheelDamaged, true);
    assert.equal(sim2.areaB.supplyCart.shaftBroken, false);
  });
});

describe('M02 SP02: snapshot e validador da causa de imobilização', () => {
  it('shaft_broken e parked_fallback fazem ida e volta no snapshot; os três enums estão no validador', () => {
    assert.deepEqual([...CART_IMMOBILIZED_CAUSES], ['shaft_broken', 'wheel_damaged', 'parked_fallback']);
    for (const how of ['shaft', 'park']) {
      const sim = enterB();
      if (how === 'shaft') breakCartShaft(sim, { shooterId: 'DE-B09' });
      else parkCartFallback(sim, 'shot_event_failed');
      const snap = sim.snapshot();
      assert.equal(validateM02Snapshot(snap).valid, true);
      const fresh = enterB();
      fresh.restoreSnapshot(structuredClone(snap));
      assert.deepEqual(fresh.areaB.supplyCart, sim.areaB.supplyCart);
    }
  });

  it('recusa causa fora do enum, varal partido incoerente, parada sem razão e causa sem imobilização', () => {
    const sim = enterB();
    breakCartShaft(sim, { shooterId: 'DE-B09' });
    const ok = sim.snapshot();
    const cases = [
      (s) => { s.areaB.supplyCart.immobilizedCause = 'magia'; },
      (s) => { s.areaB.supplyCart.shaftBroken = false; },
      (s) => { s.areaB.supplyCart.immobilizedCause = 'parked_fallback'; },
      (s) => { s.areaB.supplyCart.state = 'MOVING'; },
      (s) => { delete s.areaB.supplyCart.shaftBroken; },
    ];
    for (const mutate of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false);
      assert.match(r.reason, /carroça|varal/);
    }
  });
});
