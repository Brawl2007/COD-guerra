// M02 O2 COM-01 (PDF p. 50): «Disparar armas e esgotar munição de ambos os lados → recuo/recarga/munição sincronizados, nenhum tiro durante
// arma indisponível». Testes de estado sobre a simulação (não são playtest, não aceitam o ID).
import test from 'node:test';
import assert from 'node:assert/strict';

import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import { WEAPON_PROFILES } from '../src/game/m02-combat-ai.js';

const SEED = 19390909;
const DT = 0.05;
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const enemy = (sim, id) => sim.enemies.find((e) => e.id === id);

/** Um Kar98k alemão (DE-A12) com vista livre para Piotr a 40 m; o resto da guarnição e a munição da secção fora de jogo; Piotr não morre (só conta o fogo). */
function duel(seed = SEED) {
  const sim = new M02BenchSimulation(seed);
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
  const sh = enemy(sim, 'DE-A12');
  for (const e of sim.enemies) if (e !== sh) kill(e);
  sh.encounterId = 'TESTE'; // grupo de moral próprio: com 9 de 10 fora de jogo a guarnição renderia o atirador (D3)
  Object.assign(sh, { x: 30, z: -40, y: sim.world.heightAt(30, -40), goal: null, facing: Math.PI });
  sim.teleportPlayer(-10, -40, 0);
  return { sim, sh };
}
const stepDuel = (sim) => {
  sim.player.health = 100;
  sim.tick(DT, {});
};

test('COM-01 munição hostil: o Kar98k gasta o carregador, recarrega a partir da reserva e, esgotada a reserva, deixa de disparar (nunca com a arma indisponível)', () => {
  const { sim, sh } = duel();
  const prof = WEAPON_PROFILES.kar98k;
  const total = sh.mag + sh.reserve;
  assert.equal(sh.mag, prof.magSize);
  assert.equal(total, 40, '5 no carregador + 35 de reserva (dotação da bancada, EQP-01 pendente)');

  const shots = []; // instantes dos disparos
  const reloads = [];
  for (let i = 0; i < 1800 && shots.length < 60; i++) {
    const before = { shots: sh.shotsFired, mag: sh.mag, reserve: sh.reserve, rl: sh.reloadingUntil };
    stepDuel(sim);
    assert.ok(sh.mag >= 0 && sh.reserve >= 0, 'nunca munição negativa');
    assert.equal(sh.mag + sh.reserve + sh.shotsFired, total, 'a munição conserva-se: o que sai do carregador é um tiro');
    if (before.rl > sim.clock) assert.equal(sh.shotsFired, before.shots, `sem tiro durante a recarga (t=${sim.clock})`);
    if (sh.shotsFired !== before.shots) shots.push({ t: sim.clock, mag: sh.mag });
    if (before.rl === 0 && sh.reloadingUntil > 0) {
      assert.equal(before.mag, 0, 'só recarrega com o carregador vazio');
      assert.equal(sh.mag, 0);
      assert.ok(Math.abs(sh.reloadingUntil - (sim.clock + prof.reloadSec)) < DT + 1e-9, 'a recarga demora reloadSec');
    }
    if (before.rl > 0 && sh.reloadingUntil === 0) {
      reloads.push(sim.clock);
      // o tiro do mesmo tick em que a recarga acaba já saiu do carregador novo
      const loaded = sh.mag + (sh.shotsFired - before.shots);
      assert.equal(loaded, Math.min(prof.magSize, before.reserve), 'a recarga repõe a partir da reserva');
      assert.equal(sh.reserve, before.reserve - loaded);
    }
  }
  assert.equal(sh.shotsFired, 40, 'dispara exatamente a dotação: 40 tiros');
  assert.equal(reloads.length, 7, 'sete recargas (8 carregadores de 5)');
  assert.equal(sh.mag + sh.reserve, 0, 'esgotado');
  // ritmo: entre dois tiros do mesmo carregador passa o ciclo da arma; entre carregadores, a recarga inteira
  for (let i = 1; i < shots.length; i++) {
    const gap = shots[i].t - shots[i - 1].t;
    const acrossReload = shots[i - 1].mag === 0;
    assert.ok(gap >= (acrossReload ? prof.reloadSec : prof.cycleSec) - DT - 1e-9, `intervalo ${gap.toFixed(2)} s (${acrossReload ? 'com recarga' : 'no mesmo carregador'})`);
  }
  // depois de esgotado: continua a ver Piotr mas já não dispara nem tenta recarregar
  const frozen = sh.shotsFired;
  for (let i = 0; i < 400; i++) stepDuel(sim);
  assert.equal(sh.shotsFired, frozen, 'sem munição: nenhum tiro');
  assert.equal(sh.reloadingUntil, 0, 'sem reserva não há recarga fantasma');
  assert.equal(sh.state, 'ENGAGE_VISIBLE', 'continua a vê-lo (a perceção não depende da munição)');
  assert.equal(sh.alive, true, 'nada o repõe: sem reabastecimento nem spawn');
});

test('COM-01 munição hostil: o estado de uma recarga a meio (carregador, reserva, fim da recarga, ciclo) sobrevive ao snapshot e a continuação é igual', () => {
  const a = duel();
  while (a.sh.reloadingUntil === 0 && a.sim.clock < 30) stepDuel(a.sim);
  assert.ok(a.sh.reloadingUntil > a.sim.clock, 'a meio de uma recarga');
  const snap = JSON.parse(JSON.stringify(a.sim.snapshot()));
  const b = duel(SEED);
  b.sim.restoreSnapshot(snap);
  const rb = enemy(b.sim, 'DE-A12');
  const keys = ['mag', 'reserve', 'reloadingUntil', 'nextFireAt', 'shotsFired'];
  for (const k of keys) assert.equal(rb[k], a.sh[k], `restaurado: ${k}`);
  for (let i = 0; i < 400; i++) {
    stepDuel(a.sim);
    stepDuel(b.sim);
  }
  for (const k of keys) assert.equal(rb[k], a.sh[k], `continuação: ${k}`);
  assert.equal(b.sim.player.health, a.sim.player.health);
});

test('COM-01 ambos os lados, combate real de 130 s (EA1): conservação da munição, sem tiro em recarga, recarga com a duração do perfil; a MG34 e o rkm esgotam e calam-se', () => {
  const sim = new M02BenchSimulation(SEED);
  sim.player.crouched = true;
  sim.player.eyeHeight = 1.08;
  const actors = [...sim.enemies, ...sim.allies];
  const total = new Map(actors.map((x) => [x.id, x.mag + x.reserve]));
  const stats = { enemyReloads: 0, allyReloads: 0 };
  for (let i = 0; i < Math.round(130 / DT); i++) {
    const before = new Map(actors.map((x) => [x.id, { shots: x.shotsFired ?? 0, rl: x.reloadingUntil }]));
    sim.tick(DT, {});
    for (const x of actors) {
      const b = before.get(x.id);
      const prof = WEAPON_PROFILES[x.weapon];
      assert.ok(x.mag >= 0 && x.reserve >= 0 && x.mag <= prof.magSize, `${x.id}: carregador em [0, ${prof.magSize}]`);
      assert.equal(x.mag + x.reserve + (x.shotsFired ?? 0), total.get(x.id), `${x.id}: conservação da munição t=${sim.clock.toFixed(2)}`);
      if (b.rl > sim.clock) assert.equal(x.shotsFired ?? 0, b.shots, `${x.id}: tiro com a arma em recarga t=${sim.clock.toFixed(2)}`);
      if (b.rl === 0 && x.reloadingUntil > 0) {
        assert.equal(x.mag, 0, `${x.id}: recarrega só com o carregador vazio`);
        assert.ok(Math.abs(x.reloadingUntil - sim.clock - prof.reloadSec) < DT + 1e-9, `${x.id}: duração da recarga`);
        if (sim.enemies.includes(x)) stats.enemyReloads += 1;
        else stats.allyReloads += 1;
      }
    }
  }
  assert.ok(stats.enemyReloads > 0 && stats.allyReloads > 0, `houve recargas dos dois lados (hostis ${stats.enemyReloads}, secção ${stats.allyReloads})`);
  const mg = enemy(sim, 'DE-A05');
  assert.equal(mg.mag + mg.reserve, 0, 'a MG34 gastou toda a dotação (50 + 200)');
  assert.equal(mg.shotsFired, 250);
  const rkm = ally(sim, 'pl_aux_01');
  assert.equal(rkm.mag + rkm.reserve, 0, 'o rkm da secção gastou toda a dotação');
  assert.equal(sim.enemies.length, 10, 'nenhum reabastecimento nem reposição de hostis');
  const mgShots = mg.shotsFired;
  for (let i = 0; i < 200; i++) sim.tick(DT, {});
  assert.equal(mg.shotsFired, mgShots, 'esgotada, a MG34 não dispara mais');
});
