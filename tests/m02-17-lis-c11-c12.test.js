// M02 C11/C12 (PDF pp. 14-15, J3 p. 37, I4/I6 pp. 34-35): Lis regressa por percurso (sem teleporte), os três desfechos só quando a
// condição se verifica, o último grupo só conta como evacuado ao CHEGAR ao ponto de evacuação. Testes de estado (não são playtest).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { b12StretcherSlots, LIS_PHASES } from '../src/game/m02-acts-director.js';
import cellsBC from '../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };

const SEED = 19390909;
const DT = 0.1;
const CFG = cellsBC.cells.C.lisReturn;
const EVAC_POINT = cellsBC.cells.C.evacRoute.at(-1);
const lisOf = (sim) => sim.allies.find((a) => a.id === 'pl_lis');

function killHostiles(sim) {
  for (const e of sim.enemies) Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
}

/** Área C com C10 e o impacto fixo já passados e todos os hostis fora de jogo (isola Lis e o último grupo do combate). */
function setupC11({ lisState = null } = {}) {
  const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
  if (lisState) sim.allies.find((a) => a.id === 'pl_lis').state = lisState;
  sim.enterAreaCC09();
  sim.startC10OrderChanges();
  killHostiles(sim);
  sim.detonateC10FixedArtillery();
  assert.equal(sim.areaC.c11Started, true);
  return sim;
}

/** Corre ticks sem entradas, devolvendo o maior deslocamento de Lis num tick e a lista de posições. */
function runRecording(sim, seconds, { follow = false } = {}) {
  const lis = lisOf(sim);
  const steps = [];
  let prev = { x: lis.x, z: lis.z };
  for (let i = 0; i < Math.ceil(seconds / DT); i++) {
    if (follow) sim.teleportPlayer(lis.x + 1.0, lis.z, sim.player.angle, 0); // Piotr ao lado (escolta)
    sim.tick(DT, {});
    steps.push(Math.hypot(lis.x - prev.x, lis.z - prev.z));
    prev = { x: lis.x, z: lis.z };
  }
  return { steps, max: Math.max(...steps) };
}

describe('M02 C11: Lis regressa por movimento contínuo (sem teleporte)', () => {
  it('entra pela antecâmara (0,-60), não surge em (-28,-22), e nenhum tick o desloca mais do que a velocidade de ferido', () => {
    const sim = setupC11();
    const lis = lisOf(sim);
    assert.deepEqual([lis.x, lis.z], CFG.entry, 'começa à entrada da célula, não junto de B09');
    assert.equal(lis.detachedOutOfCell, false);
    assert.equal(lis.state, 'WOUNDED_LIAISON');
    assert.ok(lis.health <= 46, 'ferido por fragmentação');
    assert.equal(sim.areaC.lisPhase, 'returning');
    assert.equal(lis.maxSpeed, CFG.speedMps);
    const dist = Math.hypot(CFG.rendezvous[0] - CFG.entry[0], CFG.rendezvous[1] - CFG.entry[1]);
    const { steps, max } = runRecording(sim, 60);
    assert.ok(max <= CFG.speedMps * DT + 1e-6, `maior deslocamento por tick ${max.toFixed(4)} m (limite ${CFG.speedMps * DT} m)`);
    assert.ok(steps.filter((d) => d > 1e-6).length >= Math.floor(dist / (CFG.speedMps * DT)) - 3, 'percurso feito passo a passo');
    assert.ok(Math.hypot(lis.x - CFG.rendezvous[0], lis.z - CFG.rendezvous[1]) <= 0.7, 'chegou ao ponto de encontro');
    assert.equal(sim.areaC.lisPhase, 'waiting');
    assert.equal(sim.areaC.lisContactedInC11, false, 'sem contacto não há fala dlg_m02_003');
  });

  it('o tempo de chegada respeita a distância e a velocidade (≥ d/v)', () => {
    const sim = setupC11();
    const t0 = sim.clock;
    const dist = Math.hypot(CFG.rendezvous[0] - CFG.entry[0], CFG.rendezvous[1] - CFG.entry[1]);
    let arrivedAt = null;
    for (let i = 0; i < 600 && arrivedAt === null; i++) {
      sim.tick(DT, {});
      if (sim.areaC.lisPhase === 'waiting') arrivedAt = sim.clock - t0;
    }
    assert.ok(arrivedAt !== null && arrivedAt >= dist / CFG.speedMps - 0.2, `chegou em ${arrivedAt} s; mínimo ${dist / CFG.speedMps} s`);
  });

  it('já incapacitado antes de C11: não regressa nem muda de posição (J3); usa esse estado', () => {
    const sim = setupC11({ lisState: 'EVACUATED' });
    const lis = lisOf(sim);
    assert.equal(sim.areaC.lisPhase, 'incapacitated');
    assert.equal(sim.areaC.lisWasIncapacitated, true);
    const where = [lis.x, lis.z];
    runRecording(sim, 5);
    assert.deepEqual([lis.x, lis.z], where);
    assert.equal(sim.allies.filter((a) => a.id === 'pl_lis').length, 1, 'nunca duplicado');
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.flags['m02.lis_status'], 'wounded_evacuated');
    assert.equal(sim.areaC.lisOutcomeSource, 'game');
  });
});

describe('M02 C11: contacto e percurso amparado/carregado a velocidade limitada', () => {
  it('no contacto (≤ 3,5 m) toca dlg_m02_003 e Lis (saúde ≥ 40) caminha amparado pela rota de evacuação até à saída; estado final só à chegada', () => {
    const sim = setupC11();
    const lis = lisOf(sim);
    runRecording(sim, 40); // chega ao ponto de encontro
    assert.equal(sim.areaC.lisPhase, 'waiting');
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0, 0); // Piotr chega ao pé dele
    sim.tick(DT, {});
    assert.equal(sim.areaC.lisContactedInC11, true);
    assert.equal(sim.dialogue.hasTriggered('dlg_m02_003'), true);
    assert.equal(sim.areaC.lisPhase, 'supported');
    assert.equal(sim.areaC.lisSupportMode, 'wounded_walking');
    assert.equal(lis.state, 'WALKING_SUPPORTED');
    assert.equal(sim.flags['m02.lis_status'], 'active', 'enum final só depois de a evacuação estar resolvida');
    const { max } = runRecording(sim, 200, { follow: true });
    assert.ok(max <= CFG.walkingSpeedMps * DT + 1e-6, `deslocamento por tick ${max}`);
    assert.equal(sim.areaC.lisPhase, 'sheltered');
    assert.deepEqual([lis.x, lis.z], EVAC_POINT);
    assert.equal(sim.flags['m02.lis_status'], 'wounded_walking');
    assert.equal(lis.state, 'WALKING_SUPPORTED');
  });

  it('Lis só avança com Piotr ao pé (raio de apoio): se o jogador se afasta, fica parado e continua só quando voltam a ficar juntos', () => {
    const sim = setupC11();
    const lis = lisOf(sim);
    runRecording(sim, 40);
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0, 0);
    sim.tick(DT, {});
    assert.equal(sim.areaC.lisPhase, 'supported');
    runRecording(sim, 3, { follow: true });
    const here = [lis.x, lis.z];
    sim.teleportPlayer(lis.x + CFG.supportRadius + 5, lis.z, 0, 0);
    for (let i = 0; i < 30; i++) sim.tick(DT, {});
    assert.deepEqual([lis.x, lis.z], here, 'sem Piotr por perto Lis não anda');
    runRecording(sim, 3, { follow: true });
    assert.ok(Math.hypot(lis.x - here[0], lis.z - here[1]) > 1, 'com Piotr ao pé volta a andar');
  });

  it('lesão que não permite caminhar (saúde < 40): carregado até à maca 1 de B12, a velocidade menor; wounded_evacuated só à chegada', () => {
    const sim = setupC11();
    const lis = lisOf(sim);
    runRecording(sim, 40);
    lis.health = 30;
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0, 0);
    sim.tick(DT, {});
    assert.equal(sim.areaC.lisSupportMode, 'wounded_evacuated');
    assert.equal(lis.state, 'CARRIED');
    assert.equal(sim.flags['m02.lis_status'], 'active');
    const { max } = runRecording(sim, 400, { follow: true });
    assert.ok(max <= CFG.carriedSpeedMps * DT + 1e-6, `deslocamento por tick ${max}`);
    const slot = b12StretcherSlots()[0];
    assert.deepEqual([lis.x, lis.z], [slot.x, slot.z], 'deitado na maca 1 do layout');
    assert.equal(lis.state, 'EVACUATED_B12');
    assert.equal(sim.flags['m02.lis_status'], 'wounded_evacuated');
    assert.equal(sim.areaC.lisPhase, 'sheltered');
  });
});

describe('M02 C12: lis_status pelos três estados, só quando a condição respetiva se verifica', () => {
  function toShelter(health) {
    const sim = setupC11();
    const lis = lisOf(sim);
    runRecording(sim, 40);
    if (health) lis.health = health;
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0, 0);
    sim.tick(DT, {});
    runRecording(sim, 400, { follow: true });
    return sim;
  }

  it('wounded_walking: Lis chegou a pé, amparado', () => {
    const sim = toShelter(null);
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.flags['m02.lis_status'], 'wounded_walking');
    assert.equal(sim.areaC.lisOutcomeSource, 'game');
    assert.equal(pkg.m03ImportState.lisEntry.requiresSupportWalking, true);
    assert.equal(sim.dialogue.hasTriggered('bz39_c12_01'), true);
  });

  it('wounded_evacuated: Lis foi carregado e deixado na maca de B12', () => {
    const sim = toShelter(30);
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.flags['m02.lis_status'], 'wounded_evacuated');
    assert.equal(pkg.m03ImportState.lisEntry.presentInShelter, true);
    assert.equal(pkg.m03ImportState.lisEntry.requiresSupportWalking, false);
  });

  it('missing: Piotr termina sem Lis (sem contacto) — já não cai em wounded_evacuated por omissão; Lis não fala e Wierzba diz «Lis…»', () => {
    const sim = setupC11();
    runRecording(sim, 60); // Lis chega e fica à espera; Piotr nunca vai ter com ele
    assert.equal(sim.areaC.lisContactedInC11, false);
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.flags['m02.lis_status'], 'missing');
    assert.equal(sim.areaC.lisOutcomeSource, 'game');
    assert.equal(sim.areaC.lisSupportMode, 'missing');
    assert.equal(sim.dialogue.hasTriggered('bz39_c12_01'), false);
    assert.equal(sim.dialogue.hasTriggered('bz39_c12_02'), true);
    assert.equal(pkg.m03ImportState.lisEntry.presentInShelter, false);
    assert.equal(pkg.m03ImportState.lisEntry.canonicalWaterLineSpeaker, null);
  });

  it('missing: Lis amparado mas ainda em trânsito (Piotr terminou antes de ele chegar) não conta como evacuado nem a caminhar', () => {
    const sim = setupC11();
    const lis = lisOf(sim);
    runRecording(sim, 40);
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0, 0);
    sim.tick(DT, {});
    runRecording(sim, 5, { follow: true });
    assert.equal(sim.areaC.lisPhase, 'supported');
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.flags['m02.lis_status'], 'missing');
  });

  it('atalho da bancada (KeyM a partir de C09, C11 nunca atingido por jogo) mantém o desfecho forçado por omissão, assinalado como forced', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    sim.enterAreaCC09();
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.flags['m02.lis_status'], 'wounded_evacuated');
    assert.equal(sim.areaC.lisOutcomeSource, 'forced');
  });

  it('o validador aceita as fases/fontes de Lis e recusa valores fora do enum ou blocos em falta', () => {
    assert.deepEqual([...LIS_PHASES], ['liaison_outside', 'returning', 'waiting', 'supported', 'sheltered', 'incapacitated']);
    const sim = setupC11();
    runRecording(sim, 10);
    const ok = sim.snapshot();
    assert.equal(validateM02Snapshot(ok).valid, true);
    const cases = [
      (s) => { s.areaC.lisPhase = 'voando'; },
      (s) => { s.areaC.lisOutcomeSource = 'magia'; },
      (s) => { s.areaC.lisSupportMode = 'dead'; },
      (s) => { delete s.areaC.lisPhase; },
      (s) => { s.areaC.c11StartedAt = null; },
      (s) => { s.areaC.lastGroup[0].evacuated = true; },
      (s) => { s.areaC.lastGroupSummary = { evacuated: 1, inTransit: 1, dead: 1 }; },
    ];
    for (const mutate of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      assert.equal(validateM02Snapshot(bad).valid, false);
    }
    const fresh = setupC11();
    fresh.restoreSnapshot(structuredClone(ok));
    assert.deepEqual(fresh.areaC, sim.areaC);
  });
});

describe('M02 C11/C12: o último grupo (LG01-LG12) só conta como evacuado quando CHEGA ao ponto de evacuação', () => {
  const route = cellsBC.cells.C.evacRoute;
  const routeLen = (from) => {
    let d = Math.hypot(route[0][0] - from.x, route[0][1] - from.z);
    for (let i = 0; i < route.length - 1; i++) d += Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
    return d;
  };

  it('ativar o último grupo não evacua ninguém: em marcha, evacuated=false e a contagem é 0 até chegarem', () => {
    const sim = setupC11();
    assert.equal(sim.flags['m02.last_group_survivors'], 0);
    assert.ok(sim.areaC.lastGroup.every((lg) => lg.evacuated === false && lg.arrivedAt === null));
    for (let i = 0; i < 100; i++) sim.tick(DT, {}); // 10 s
    assert.ok(sim.areaC.lastGroup.some((lg) => lg.moving), 'estão em marcha');
    assert.equal(sim.flags['m02.last_group_survivors'], 0, 'ninguém chegou ainda');
    assert.ok(sim.areaC.lastGroup.every((lg) => !lg.evacuated));
  });

  it('cada membro só é evacuado ao chegar ao último ponto da rota (-85,105); o instante de chegada respeita rota/velocidade', () => {
    const sim = setupC11();
    const t0 = sim.areaC.c11StartedAt;
    const start = Object.fromEntries(sim.areaC.lastGroup.map((lg) => [lg.id, { x: lg.x, z: lg.z, speed: lg.speed }]));
    for (let i = 0; i < 1500 && sim.areaC.lastGroup.some((lg) => !lg.evacuated); i++) {
      sim.tick(DT, {});
      for (const lg of sim.areaC.lastGroup) {
        if (lg.evacuated) {
          assert.ok(Math.hypot(lg.x - EVAC_POINT[0], lg.z - EVAC_POINT[1]) <= 0.7, `${lg.id} evacuado fora do ponto: (${lg.x},${lg.z})`);
        }
      }
    }
    assert.ok(sim.areaC.lastGroup.every((lg) => lg.evacuated), 'chegaram todos');
    for (const lg of sim.areaC.lastGroup) {
      // a marcha passa ao ponto seguinte a ≤ 0,65 m do atual: pode cortar até 0,65 m por ponto da rota
      const min = (routeLen(start[lg.id]) - 0.65 * route.length) / start[lg.id].speed;
      assert.ok(lg.arrivedAt - t0 >= min - 0.3, `${lg.id} chegou em ${lg.arrivedAt - t0} s (mínimo ${min.toFixed(1)} s)`);
    }
    assert.equal(sim.flags['m02.last_group_survivors'], 12);
    const arrivals = sim.areaC.lastGroup.map((lg) => lg.arrivedAt);
    assert.ok(new Set(arrivals).size > 1, 'em coluna, não todos no mesmo instante');
  });

  it('concluir C12 com membros ainda em trânsito não os marca como evacuados (antes marcava todos os vivos)', () => {
    const sim = setupC11();
    for (let i = 0; i < 300; i++) sim.tick(DT, {}); // 30 s: ainda ninguém chegou
    const before = sim.areaC.lastGroup.filter((lg) => lg.evacuated).length;
    const pkg = sim.completeC12Epilogue();
    const after = sim.areaC.lastGroup.filter((lg) => lg.evacuated).length;
    assert.equal(after, before, 'C12 não evacua ninguém');
    assert.equal(sim.areaC.lastGroupSummary.evacuated, before);
    assert.equal(sim.areaC.lastGroupSummary.inTransit, 12 - before);
    assert.equal(sim.areaC.lastGroupSummary.dead, 0);
    assert.equal(sim.flags['m02.last_group_survivors'], before);
    assert.equal(pkg.m03ImportState.lastGroupSurvivorsCount, before);
  });

  it('quem já não está vivo não conta nem fica «em trânsito»', () => {
    const sim = setupC11();
    const lg = sim.areaC.lastGroup[3];
    lg.alive = false;
    for (let i = 0; i < 1500 && sim.areaC.lastGroup.some((m) => m.alive && !m.evacuated); i++) sim.tick(DT, {});
    sim.completeC12Epilogue();
    assert.deepEqual(sim.areaC.lastGroupSummary, { evacuated: 11, inTransit: 0, dead: 1 });
    assert.equal(sim.flags['m02.last_group_survivors'], 11);
  });
});
