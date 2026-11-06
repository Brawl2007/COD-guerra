// M02 C11 (PDF p. 14): «Se o jogador se afastar e terminar sem ele, regista-se missing; ausência não equivale a morte comprovada.»
// Um Lis CAÍDO (não vivo) em plena fase de amparo (`lisPhase: 'supported'`, mas também `returning`/`waiting`) já não anda nem se levanta:
// (1) o jogo não pode esperar por ele («Lis ainda a chegar com Piotr ao pé» só vale para um Lis vivo) e (2) o MissionBot não pode
// rondá-lo até ao tempo limite (antes: andava para o ponto da rota que Lis nunca ocuparia, afastava-se mais de 3,5 m e voltava a ele; a
// semente 34 do relatório, numa variante da missão, acabava assim a 1800 s). Testes de estado, não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import cellsBC from '../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { MissionBot } from './m02-mission-bot.js';

const EVAC = cellsBC.cells.C.evacRoute.at(-1);
const DT = 0.1;
const lisOf = (sim) => sim.allies.find((a) => a.id === 'pl_lis');
const killHostiles = (sim) => {
  for (const e of sim.enemies) Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
};

/** C11 sem combate (hostis fora de jogo); Lis regressa pela antecâmara. A cena do roteiro alcança C11 no primeiro passo. */
function c11(seed = 34) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  sim.enterAreaCC09();
  sim.startC10OrderChanges();
  killHostiles(sim);
  sim.detonateC10FixedArtillery();
  assert.equal(sim.areaC.c11Started, true);
  sim.tick(DT, {});
  assert.equal(sim.script.sceneId, 'C11');
  return sim;
}

/** Leva Lis à fase pedida e deixa-o cair nela (estado «caído» sem registo de socorro: definitivo, como num save anterior). */
function downLisIn(sim, phase) {
  const lis = lisOf(sim);
  if (phase === 'supported') {
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0);
    sim.tick(DT, { interact: true }); // [E] junto a Lis: o contacto é deliberado (merge M02 único, Codex e4a46327)
    assert.equal(sim.areaC.lisPhase, 'supported');
    for (let i = 0; i < 100; i++) sim.tick(DT, {}); // anda um pouco amparado, ao lado de Piotr
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0);
  } else if (phase === 'waiting') {
    let guard = 0;
    while (sim.areaC.lisPhase !== 'waiting' && guard++ < 1200) sim.tick(DT, {});
    assert.equal(sim.areaC.lisPhase, 'waiting');
  } else {
    assert.equal(sim.areaC.lisPhase, 'returning');
  }
  Object.assign(lis, { alive: false, health: 0, state: 'DOWN', moving: false });
  return lis;
}

describe('M02 C11: um Lis caído não prende a missão', () => {
  for (const phase of ['returning', 'waiting', 'supported']) {
    it(`Lis cai em «${phase}»: o jogo não espera por ele — Piotr ao lado dele no ponto de evacuação, com o último grupo todo evacuado, fecha C11 (C12, Lis missing)`, () => {
      const sim = c11();
      const lis = downLisIn(sim, phase);
      // o último grupo chegou todo e Piotr está no ponto de evacuação com Lis caído a 3 m dele
      for (const lg of sim.areaC.lastGroup) Object.assign(lg, { evacuated: true, arrivedAt: Number(sim.clock.toFixed(2)), moving: false });
      Object.assign(lis, { x: EVAC[0] + 2, z: EVAC[1] + 2, y: sim.world.heightAt(EVAC[0] + 2, EVAC[1] + 2) });
      sim.teleportPlayer(EVAC[0], EVAC[1], 0);
      for (let i = 0; i < 5; i++) sim.tick(DT, {});
      assert.equal(sim.areaC.c12Completed, true, `${phase}: C11 fechou`);
      assert.equal(sim.script.sceneId, 'C12');
      assert.equal(sim.flags['m02.lis_status'], 'missing', 'sem Lis o desfecho é missing («ausência não equivale a morte comprovada»)');
      assert.equal(sim.missionFailed, null, 'Lis não é uma personagem exigida (D1)');
      assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
    });
  }

  it('controlo: um Lis VIVO a ser amparado ao lado de Piotr, ainda longe do abrigo, continua a fazer esperar C11 (a regra só deixou de valer para o caído)', () => {
    const sim = c11();
    const lis = lisOf(sim);
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0);
    sim.tick(DT, { interact: true }); // [E] junto a Lis: o contacto é deliberado (merge M02 único, Codex e4a46327)
    assert.equal(sim.areaC.lisPhase, 'supported');
    for (const lg of sim.areaC.lastGroup) Object.assign(lg, { evacuated: true, arrivedAt: Number(sim.clock.toFixed(2)), moving: false });
    Object.assign(lis, { x: EVAC[0] + 2, z: EVAC[1] + 2, y: sim.world.heightAt(EVAC[0] + 2, EVAC[1] + 2) });
    sim.teleportPlayer(EVAC[0], EVAC[1], 0);
    for (let i = 0; i < 5; i++) sim.tick(DT, {});
    assert.notEqual(sim.script.sceneId, 'C12', 'Lis ainda a chegar com Piotr ao pé: C11 não fecha');
    assert.equal(sim.areaC.c12Completed, false);
  });
});

describe('M02 C11: o MissionBot não ronda um Lis caído', () => {
  for (const phase of ['supported', 'waiting', 'returning']) {
    it(`Lis cai em «${phase}» (sem hostis): o bot segue para o ponto de evacuação e a missão chega a C12 com Lis missing, bem antes do tempo limite`, () => {
      const sim = c11();
      downLisIn(sim, phase);
      const bot = new MissionBot(sim, { dt: DT });
      const reached = bot.playUntilC12(600);
      assert.equal(reached, true, `${phase}: C12 em ${sim.clock.toFixed(0)} s de simulação (cena ${sim.script.sceneId})`);
      assert.equal(sim.flags['m02.lis_status'], 'missing');
      assert.equal(sim.missionFailed, null);
      // chegou: Piotr junto ao ponto de evacuação, e não a andar à volta de Lis (que ficou onde caiu)
      assert.ok(Math.hypot(sim.player.x - EVAC[0], sim.player.z - EVAC[1]) <= 6, `Piotr em (${sim.player.x.toFixed(1)}, ${sim.player.z.toFixed(1)})`);
      assert.ok(sim.clock < 400, `${sim.clock.toFixed(0)} s (o último grupo leva ~100 s a evacuar)`);
    });
  }

  it('o pacote para a M03 é coerente: Lis ausente, sem fala da água, último grupo todo evacuado', () => {
    const sim = c11();
    downLisIn(sim, 'supported');
    assert.equal(new MissionBot(sim, { dt: DT }).playUntilC12(600), true);
    const pkg = sim.exportCampaignResultToM03();
    assert.equal(pkg.completed, true);
    const e = pkg.m03ImportState.lisEntry;
    assert.equal(e.status, 'missing');
    assert.equal(e.presentInShelter, false);
    assert.equal(e.canSpeakCanonicalWaterLine, false);
    assert.equal(pkg.m03ImportState.lastGroupSurvivorsCount, 12);
  });
});
