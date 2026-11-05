// M02 D4 (PDF p. 17): «Sem ordem, Gruca conduz o plano base» + «autonomia não é vitória garantida». Antes a secção tomava a quinta SOZINHA
// com Piotr parado (72-86 s em 10 sementes de 10). Agora o plano base é conduzido COM o atirador: a secção fixa e suprime a partir de
// posições de apoio (a ≤ SECTION_LEASH_M de Piotr) e só comete o assalto (colados a B01, pátio, B03) com Piotr a ≤ SECTION_ASSAULT_LEASH_M
// ou por ordem «avançar para ali». O efeito causal da prova de 60 s mantém-se (tests/m02-d4-squad-orders). Testes de estado, não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { SECTION_LEASH_M, SECTION_ASSAULT_LEASH_M, SECTION_SUPPORT_NODES } from '../src/game/m02-combat-ai.js';
import { C02_EXIT_Z } from '../src/game/m02-acts-director.js';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DT = 0.1;
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const farmHostiles = (sim) => sim.enemies.filter((e) => e.encounterId !== 'EA0' && e.alive && !e.nonCombatant);
const farmFallen = (sim) => sim.objective.id === 'C04' || sim.objective.id === 'COMPLETE';
const sheltered = (seed, options = {}) => {
  const sim = new M02BenchSimulation(seed, options);
  sim.player.crouched = true;
  sim.player.eyeHeight = 1.08;
  return sim;
};

describe('M02 D4: Piotr parado em P1 — a secção resolve o posto mas não toma a quinta sozinha, em nenhuma das 10 sementes', () => {
  for (const seed of SEEDS) {
    it(`semente ${seed}: 240 s com Piotr parado em P1 (um passo para o contacto arrancar): quinta de pé, secção na vala de C01`, () => {
      const sim = sheltered(seed, { startScene: 'C01' });
      let maxAllyZ = -Infinity;
      for (let i = 0; i < Math.ceil(240 / DT); i++) {
        sim.tick(DT, i === 0 ? { forward: 1 } : {});
        sim.drainEvents();
        assert.equal(farmFallen(sim), false, `a quinta caiu sozinha aos ${sim.clock.toFixed(1)} s`);
        for (const a of sim.allies) maxAllyZ = Math.max(maxAllyZ, a.z);
      }
      assert.equal(sim.flags['m02.ea0_posto_cleared'], true, 'C02: a secção resolve o posto antes do jogador (o objetivo muda para avançar)');
      assert.ok(farmHostiles(sim).length >= 1, `restam ${farmHostiles(sim).length} defensores da quinta`);
      assert.ok(maxAllyZ < C02_EXIT_Z, `a secção não passou a linha de saída de C02 sem Piotr (z máx. ${maxAllyZ.toFixed(1)})`);
      assert.equal(sim.missionFailed, null);
      assert.ok(sim.combatLog.some((e) => e.type === 'section_holding'), 'o plano quis avançar e ficou retido pela trela (registado)');
    });
  }
});

describe('M02 D4: Piotr abrigado no início da quinta — nenhuma das 10 sementes cai sozinha em 180 s, e a secção faz mesmo efeito nos primeiros 60 s', () => {
  for (const seed of SEEDS) {
    it(`semente ${seed}`, () => {
      const sim = sheltered(seed);
      let at60 = null;
      for (let i = 0; i < Math.ceil(180 / DT); i++) {
        sim.tick(DT, {});
        sim.drainEvents();
        assert.equal(farmFallen(sim), false, `a quinta caiu sozinha aos ${sim.clock.toFixed(1)} s`);
        if (at60 === null && sim.clock >= 60) {
          at60 = sim.enemies.filter((e) => e.encounterId !== 'EA0' && (!e.alive || e.nonCombatant)).length;
          const mgSuppressed = sim.combatLog.some((e) => e.type === 'ally_suppressed_enemy' && e.targetId === 'DE-A05');
          assert.ok(at60 >= 1 || mgSuppressed, `a prova de 60 s mantém-se: ${at60} neutralizados, MG suprimida ${mgSuppressed}`);
        }
        if (sim.missionFailed) break; // Piotr parado à vista pode morrer: a autonomia não é vitória garantida
      }
      assert.ok(at60 !== null || sim.missionFailed, 'chegou aos 60 s ou falhou antes');
      assert.ok(farmHostiles(sim).length >= 1);
    });
  }
});

describe('M02 D4: a secção avança com Piotr, até onde a trela deixa', () => {
  /** O relógio do plano já passou todos os lanços: o que falta é o atirador. */
  const planElapsed = (sim) => {
    sim.ea1StartedAt = -100;
    return sim;
  };
  const goalOf = (sim, id) => ally(sim, id).goal?.nodeId ?? null;

  it('no início da quinta a trela cobre as posições de apoio (vala norte) mas não as de assalto; o plano retido fica no registo', () => {
    const sim = planElapsed(sheltered(19390909));
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_gruca'), 'cv_ditch_north_a', 'a posição de apoio mais avançada que cabe na trela');
    assert.equal(goalOf(sim, 'pl_lis'), 'cv_ditch_north_b');
    const held = sim.combatLog.filter((e) => e.type === 'section_holding' && e.actorId === 'pl_gruca');
    assert.equal(held.length, 1, 'uma só vez por lanço');
    assert.equal(held[0].nodeId, 'cv_b01_east_corner', 'o que o plano queria (o lanço 3 de Gruca)');
    assert.ok(held[0].distanceFromPiotr > held[0].leashM, `${held[0].distanceFromPiotr} m > ${held[0].leashM} m`);
    assert.equal(ally(sim, 'pl_gruca').holdingFor, 'cv_b01_east_corner');
    for (let i = 0; i < 100; i++) sim.tick(DT, {});
    assert.equal(sim.combatLog.filter((e) => e.type === 'section_holding' && e.actorId === 'pl_gruca' && e.nodeId === 'cv_b01_east_corner').length, 1, 'sem repetições');
  });

  it('com Piotr na vala o plano chega ao meio da vala; a 27 m do muro de B01 chega ao muro; a trela larga segue-o', () => {
    const sim = planElapsed(sheltered(19390909));
    sim.teleportPlayer(-45, -50, 0);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_gruca'), 'cv_ditch_mid_a', '18 m de Piotr: dentro da trela de assalto (30 m)');
    sim.teleportPlayer(-36, -46, 0);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_gruca'), 'cv_b01_north_wall', '27 m do muro de B01');
    assert.equal(ally(sim, 'pl_gruca').holdingFor, 'cv_b01_east_corner', 'o último lanço (o pátio) ainda não cabe na trela');
    sim.teleportPlayer(-26, -30, 0);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_gruca'), 'cv_b01_east_corner', 'Piotr já ao pé do pátio: o plano completo');
    assert.equal(ally(sim, 'pl_gruca').holdingFor, null);
  });

  it('no eixo do pomar a mesma trela: Gruca fixa no talude (apoio) e só vai à entrada de B03 e ao pátio com Piotr perto', () => {
    const sim = planElapsed(sheltered(19390909));
    sim.flags['m02.axis'] = 'orchard';
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_gruca'), 'cv_orchard_bank_e', 'o talude do pomar é apoio: cabe na trela larga (51 m)');
    assert.equal(ally(sim, 'pl_gruca').holdingFor, 'cv_courtyard_consolidate', 'o lanço do pátio ficou retido');
    sim.teleportPlayer(30, 5, 0);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_gruca'), 'cv_b03_south_entry', 'com Piotr a 8 m da entrada de B03, a secção comete o assalto ao estábulo');
    sim.teleportPlayer(-4, -48, 0);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_gruca'), 'cv_courtyard_consolidate', 'e o pátio quando é Piotr quem está a 30 m dele');
  });

  it('a ordem «avançar para ali» é a exceção explícita: manda ir para lá da trela; sem ordem a mesma posição fica retida', () => {
    const control = planElapsed(sheltered(19390909));
    const ordered = sheltered(19390909);
    for (const s of [control, ordered]) Object.assign(s.enemies.find((e) => e.id === 'DE-A05'), { alive: false, health: 0, state: 'DEAD' });
    const order = ordered.issueSquadOrder('advance', 'cv_gate_wall_west_s');
    assert.ok(order, 'ordem aceite');
    const startToNode = Math.hypot(order.x - ordered.player.x, order.z - ordered.player.z);
    assert.ok(startToNode > SECTION_ASSAULT_LEASH_M, `o destino está a ${startToNode.toFixed(0)} m de Piotr, para lá da trela de assalto`);
    for (let i = 0; i < 20; i++) {
      control.tick(DT, {});
      ordered.tick(DT, {});
    }
    assert.equal(goalOf(ordered, 'pl_gruca'), 'cv_gate_wall_west_s', 'por ordem vai');
    assert.notEqual(goalOf(control, 'pl_gruca'), 'cv_gate_wall_west_s', 'sem ordem fixa e suprime onde está');
  });

  it('os auxiliares do rkm e o sanitário respeitam a mesma trela: sem Piotr não vão ao pátio nem ao meio da vala', () => {
    const sim = planElapsed(sheltered(19390909));
    for (let i = 0; i < 50; i++) sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_aux_01'), 'cv_start_parapet_e');
    assert.equal(goalOf(sim, 'pl_aux_02'), 'cv_start_parapet_w');
    assert.equal(goalOf(sim, 'pl_szymczak'), 'cv_start_parapet_w');
    assert.equal(ally(sim, 'pl_aux_01').tacticalState, 'HoldAndSuppress');
    assert.equal(ally(sim, 'pl_szymczak').tacticalState, 'SupportMedic');
    sim.teleportPlayer(-24, -20, 0);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_aux_01'), 'cv_gate_wall_west_s', 'com Piotr no pátio o rkm vai para o muro do portão');
  });
});

describe('M02 D4: valores, snapshot e validador', () => {
  it('os valores da trela e a lista de apoio vêm do layout (nós existentes) e estão documentados como valores sem fonte', () => {
    assert.equal(SECTION_LEASH_M, 60);
    assert.equal(SECTION_ASSAULT_LEASH_M, 30);
    assert.ok(SECTION_ASSAULT_LEASH_M < SECTION_LEASH_M);
    const sim = new M02BenchSimulation(1);
    for (const id of SECTION_SUPPORT_NODES) assert.ok(sim.coverNodesById.has(id), id);
    // as posições de assalto são as coladas a B01, ao pátio e a B03: nenhuma está na lista de apoio
    for (const id of ['cv_b01_north_wall', 'cv_b01_kitchen_in', 'cv_b01_hall_in', 'cv_b01_east_corner', 'cv_gate_wall_west_s', 'cv_b03_south_entry', 'cv_ditch_south_a']) {
      assert.equal(SECTION_SUPPORT_NODES.includes(id), false, id);
    }
  });

  it('o objetivo retido faz parte do snapshot: restaurar a meio reproduz a continuação, e o validador recusa formas inválidas', () => {
    const sim = sheltered(19390909);
    for (let i = 0; i < 200; i++) sim.tick(DT, {});
    const snap = structuredClone(sim.snapshot());
    assert.ok(snap.allies.some((a) => typeof a.holdingFor === 'string'), 'há alguém retido');
    assert.equal(validateM02Snapshot(snap).valid, true);
    const other = new M02BenchSimulation(5);
    other.restoreSnapshot(snap);
    for (let i = 0; i < 300; i++) {
      sim.tick(DT, {});
      other.tick(DT, {});
    }
    assert.equal(JSON.stringify(other.snapshot()), JSON.stringify(sim.snapshot()));
    for (const bad of [7, true, {}, 'qualquer', '']) {
      const mutated = structuredClone(snap);
      mutated.allies[0].holdingFor = bad;
      const r = validateM02Snapshot(mutated);
      assert.equal(r.valid, false, JSON.stringify(bad));
      assert.match(r.reason, /holdingFor/);
    }
    const nulo = structuredClone(snap);
    nulo.allies[0].holdingFor = null;
    assert.equal(validateM02Snapshot(nulo).valid, true);
    const legacy = structuredClone(snap);
    for (const a of legacy.allies) delete a.holdingFor;
    assert.equal(validateM02Snapshot(legacy).valid, true, 'um save anterior (sem o campo) continua válido');
  });
});
