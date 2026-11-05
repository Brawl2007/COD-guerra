// M02 C09 (PDF p. 14): «Oito alemães defendem B09/B10/B11. Há combate legível entre 20 e 100 m, portas e flanco de serviço… Gruca não manda o
// jogador atacar sozinho: um grupo fixa a oficina, outro avança no muro.» + D4 (p. 17): a secção avança com Piotr, até onde a trela deixa.
// Antes a secção corria a posições fixas (`cGoals`): abatia os 3 de B10 em 13 de 13 sementes, ficava lá, e Gruca levava 16-48 de vida de
// DE-C05/C06 6,7-8,6 s depois da entrada (10 de 13 sementes) porque corria a descoberto do ponto de entrada ao parapeito do pátio.
// Agora: um grupo fixa a oficina (rkm e auxiliar na base de fogo) enquanto o de manobra espera no terreno morto a norte do pátio; com B10
// neutralizada, Gruca vigia do parapeito e Wierzba e Małek trabalham as faixas de tiro de B11 (DE-C08, DE-C07) e do portão norte de B09
// (DE-C01), um defensor de cada vez, dentro da trela de Piotr. Testes de estado (relógio e entradas reais), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  C09_PLAN_NODES,
  C09_SUPPORT_NODES,
  C09_LANES,
  C09_MANEUVER_TARGETS,
  C09_WOUNDED_HEALTH,
  SECTION_LEASH_M,
  SECTION_ASSAULT_LEASH_M,
} from '../src/game/m02-combat-ai.js';

const DT = 0.1;
const SEEDS = [1, 2, 3, 4, 5, 7, 8, 10];
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const enemy = (sim, id) => sim.enemies.find((e) => e.id === id);
const ec1 = (sim) => sim.enemies.filter((e) => e.encounterId === 'EC1');
const neutral = (e) => !e.alive || e.nonCombatant;
const interior = (sim) => ec1(sim).filter((e) => ['B09', 'B11'].includes(e.buildingId));
const killWorkshop = (sim) => {
  for (const e of ec1(sim).filter((x) => x.buildingId === 'B10')) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
};
const run = (sim, seconds, controls = {}) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.tick(DT, controls);
};
const enterC = (seed) => {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  sim.enterAreaBC06(); // como no jogo: sai de C01 e de B (por atalho c01Active ficaria ligado e a guarnição de C em pausa)
  sim.enterAreaCC09();
  assert.equal(sim.activeCellId, 'C');
  assert.equal(sim.c01Active, false);
  assert.equal(sim.areaC.c10Started, false);
  sim.drainEvents();
  return sim;
};
/** Um ponto-sonda (aliado agachado ou em pé) para a visão dos hostis. */
const probeAt = (sim, x, z, crouched = true) => ({
  id: 'probe',
  space: 'metres',
  x,
  z,
  y: sim.world.heightAt(x, z),
  radius: 0.3,
  eyeHeight: crouched ? 1.08 : 1.65,
  crouched,
  alive: true,
});
const seenBy = (sim, x, z, crouched, from = ec1(sim)) =>
  from.filter((e) => sim.world.lineOfSight(e, probeAt(sim, x, z, crouched), { includeFoliage: true })).map((e) => e.id);

describe('M02 C09: a rota abrigada — o terreno morto a norte do pátio não é visto por nenhum defensor de EC1', () => {
  const sim = enterC(1);
  const assembly = Object.entries(C09_PLAN_NODES).filter(([id]) => id.startsWith('cv_c_assembly_'));

  it('há um ponto de reunião por elemento da manobra e do apoio, e nenhum dos 8 defensores o vê (em pé nem agachado)', () => {
    assert.deepEqual(assembly.map(([id]) => id).sort(), ['cv_c_assembly_aid', 'cv_c_assembly_gruca', 'cv_c_assembly_malek', 'cv_c_assembly_wierzba']);
    for (const [id, n] of assembly) {
      for (const crouched of [true, false]) assert.deepEqual(seenBy(sim, n.x, n.z, crouched), [], `${id} (${n.x}, ${n.z}) ${crouched ? 'agachado' : 'em pé'}`);
    }
  });

  it('o caminho do ponto de entrada de Piotr e da secção (0, -72) até cada ponto de reunião, a cada metro, também não é visto por ninguém', () => {
    const from = sim.world.layout.playerSpawn;
    for (const [id, n] of assembly) {
      const steps = Math.ceil(Math.hypot(n.x - from.x, n.z - from.z));
      for (let i = 0; i <= steps; i++) {
        const x = from.x + ((n.x - from.x) * i) / steps;
        const z = from.z + ((n.z - from.z) * i) / steps;
        assert.deepEqual(seenBy(sim, x, z, false), [], `${id}: ponto ${i}/${steps} (${x.toFixed(1)}, ${z.toFixed(1)})`);
      }
    }
  });

  it('controlo: o trajeto antigo (do ponto de entrada ao parapeito, em linha reta) NÃO era abrigado — passava pelo campo de tiro do portão de B10', () => {
    const from = sim.world.layout.playerSpawn;
    const parapet = C09_PLAN_NODES.cv_c_yard_parapet;
    const seen = new Set();
    for (let i = 0; i <= 60; i++) {
      const x = from.x + ((parapet.x - from.x) * i) / 60;
      const z = from.z + ((parapet.z - from.z) * i) / 60;
      for (const id of seenBy(sim, x, z, false)) seen.add(id);
    }
    assert.ok(seen.has('DE-C05') || seen.has('DE-C06') || seen.has('DE-C04'), `o trajeto direto é visto por B10: ${[...seen].join(',')}`);
  });

  it('a base de fogo (rkm e auxiliar) é a única que fica à vista do campo de tiro de B10: é ela que fixa a oficina', () => {
    for (const id of ['cv_c_north_rkm', 'cv_c_north_rkm_2']) {
      const n = C09_PLAN_NODES[id];
      const seeing = seenBy(sim, n.x, n.z, true).map((s) => enemy(sim, s).buildingId);
      assert.ok(seeing.length >= 1 && seeing.every((b) => b === 'B10'), `${id} é visto só por B10: ${seeing}`);
    }
  });
});

describe('M02 C09: o pátio e as faixas de tiro — depois de B10, só as aberturas de B09/B11 dão linha de tiro, e cada faixa expõe um defensor', () => {
  const sim = enterC(1);
  const hostileInterior = interior(sim);

  it('o parapeito, a linha do rkm e o apoio do pátio não são vistos por nenhum defensor de B09/B11 (Gruca vigia a salvo)', () => {
    for (const id of ['cv_c_yard_parapet', 'cv_c_yard_aid', 'cv_c_yard_line_rkm', 'cv_c_yard_line_rkm_2']) {
      const n = C09_PLAN_NODES[id];
      for (const crouched of [true, false]) assert.deepEqual(seenBy(sim, n.x, n.z, crouched, hostileInterior), [], `${id} ${crouched ? 'agachado' : 'em pé'}`);
    }
  });

  it('cada faixa é vista por UM defensor de B09/B11 — o seu — e o aliado só o vê a ele, a 11-18 m', () => {
    assert.deepEqual(Object.entries(C09_LANES).sort(), [
      ['DE-C01', 'cv_c_lane_b09_north'],
      ['DE-C07', 'cv_c_lane_b11_south'],
      ['DE-C08', 'cv_c_lane_b11_west'],
    ]);
    for (const [target, nodeId] of Object.entries(C09_LANES)) {
      const n = C09_PLAN_NODES[nodeId];
      for (const crouched of [true, false]) {
        assert.deepEqual(seenBy(sim, n.x, n.z, crouched, hostileInterior), [target], `${nodeId} ${crouched ? 'agachado' : 'em pé'}`);
        const aller = probeAt(sim, n.x, n.z, crouched);
        const sees = hostileInterior.filter((e) => sim.world.lineOfSight(aller, e, { includeFoliage: true })).map((e) => e.id);
        assert.deepEqual(sees, [target], `${nodeId}: o aliado só vê ${target}`);
      }
      const d = Math.hypot(enemy(sim, target).x - n.x, enemy(sim, target).z - n.z);
      assert.ok(d >= 10 && d <= 20, `${nodeId}: ${d.toFixed(1)} m de ${target}`);
    }
  });

  it('as listas de objetivos de Wierzba e Małek só referem defensores que têm faixa, e as posições de apoio são as de antes de B10 cair', () => {
    for (const list of Object.values(C09_MANEUVER_TARGETS)) for (const id of list) assert.ok(C09_LANES[id], id);
    assert.deepEqual(C09_MANEUVER_TARGETS.pl_malek, ['DE-C01'], 'Małek («segue cobertura próxima»): o portão norte de B09, contra DE-C01');
    assert.equal(C09_MANEUVER_TARGETS.pl_wierzba[0], 'DE-C08', 'Wierzba («procura flanco»): começa pela porta oeste de B11');
    for (const id of C09_SUPPORT_NODES) assert.ok(C09_PLAN_NODES[id], id);
    assert.ok(C09_SUPPORT_NODES.every((id) => /assembly|north_rkm/.test(id)));
    assert.ok(SECTION_ASSAULT_LEASH_M < SECTION_LEASH_M);
    assert.equal(C09_WOUNDED_HEALTH, 55, 'o limiar de ferido de C07');
  });
});

describe('M02 C09: a entrada — a manobra espera abrigada e a secção fixa a oficina (Piotr parado à entrada, 8 sementes)', () => {
  for (const seed of SEEDS) {
    it(`semente ${seed}: em 40 s Gruca, Małek e Wierzba não levam um tiro nem entram na vista de EC1; B10 cai; B09/B11 ficam de pé`, () => {
      const sim = enterC(seed);
      const maneuver = ['pl_gruca', 'pl_malek', 'pl_wierzba'].map((id) => ally(sim, id));
      const before = maneuver.map((a) => a.health);
      assert.ok(before.every((h) => h > 0));
      let exposedTicks = 0;
      for (let i = 0; i < Math.ceil(40 / DT); i++) {
        sim.tick(DT, {});
        for (const a of maneuver) if (seenBy(sim, a.x, a.z, a.crouched, ec1(sim).filter((e) => !neutral(e))).length > 0) exposedTicks++;
      }
      assert.equal(exposedTicks, 0, 'em nenhum tick a manobra ficou à vista de um defensor vivo');
      assert.deepEqual(maneuver.map((a) => a.health), before, 'sem um impacto em Gruca, Małek nem Wierzba (antes: Gruca perdia 16-48 em 10 de 13 sementes)');
      const b10 = ec1(sim).filter((e) => e.buildingId === 'B10');
      assert.equal(b10.length, 3);
      assert.ok(b10.every(neutral), 'o grupo de apoio fixou e abateu a oficina');
      const byAllies = sim.combatLog.filter((e) => e.type === 'ally_killed_enemy' && /^DE-C0[4-6]$/.test(e.targetId));
      assert.equal(byAllies.length, 3, 'os três de B10 foram abatidos pela secção (o log relaciona ação e resultado)');
      assert.ok(byAllies.every((e) => ['pl_aux_01', 'pl_aux_02', 'pl_szymczak', 'pl_wierzba', 'pl_malek', 'pl_gruca'].includes(e.shooterId)));
      assert.equal(interior(sim).filter(neutral).length, 0, 'B09/B11 intactos: nada se tomou sozinho');
      assert.equal(sim.missionFailed, null);
    });
  }
});

describe('M02 C09: a trela de D4 — com Piotr parado à entrada a secção não toma o pátio nem B09/B11', () => {
  for (const seed of [1, 2, 3]) {
    it(`semente ${seed}: 120 s com Piotr parado — B10 cai, o pátio fica por tomar (section_holding) e os cinco interiores ficam de pé`, () => {
      const sim = enterC(seed);
      run(sim, 120);
      assert.equal(sim.missionFailed, null);
      assert.equal(ec1(sim).filter((e) => e.buildingId === 'B10').every(neutral), true);
      assert.equal(interior(sim).filter(neutral).length, 0, 'B09/B11 não caem sozinhos');
      assert.equal(sim.areaC.c10Started, false, 'C09 não se resolve sem Piotr');
      for (const id of ['pl_gruca', 'pl_malek', 'pl_wierzba']) {
        const a = ally(sim, id);
        assert.ok(a.z < -40, `${id} fica no terreno morto (z ${a.z.toFixed(1)})`);
        assert.equal(a.health, a.maxHealth, id);
      }
      const held = sim.combatLog.filter((e) => e.type === 'section_holding');
      assert.ok(held.some((e) => e.actorId === 'pl_gruca' && e.nodeId === 'cv_c_yard_parapet' && e.distanceFromPiotr > e.leashM), 'Gruca quis o parapeito e a trela reteve-o');
      assert.equal(ally(sim, 'pl_gruca').holdingFor, 'cv_c_yard_parapet');
      assert.equal(held.filter((e) => e.actorId === 'pl_gruca').length, 1, 'registado uma só vez por lanço');
    });
  }
});

describe('M02 C09: o avanço com Piotr no pátio — Gruca vigia, Wierzba e Małek trabalham as faixas, um defensor de cada vez', () => {
  /** B10 já neutralizada (o grupo de apoio fixou-a) e Piotr no pátio, dentro da trela de assalto das faixas. */
  const advance = (seed, piotr = [-14, -25]) => {
    const sim = enterC(seed);
    killWorkshop(sim);
    sim.teleportPlayer(piotr[0], piotr[1], Math.PI / 2, 0);
    return sim;
  };
  const goalOf = (sim, id) => ally(sim, id).goal?.nodeId ?? null;

  for (const seed of SEEDS) {
    it(`semente ${seed}: em 60 s a secção neutraliza pelo menos um defensor de B09/B11, Gruca fica no parapeito sem um impacto, e o log liga a faixa ao resultado`, () => {
      const sim = advance(seed);
      const gruca = ally(sim, 'pl_gruca');
      const hp = gruca.health;
      run(sim, 60);
      assert.equal(sim.missionFailed, null);
      const killed = sim.combatLog.filter((e) => e.type === 'ally_killed_enemy' && interior(sim).some((i) => i.id === e.targetId));
      assert.ok(killed.length >= 1, 'a secção abateu pelo menos um dos cinco interiores (antes: nenhum, em 13 de 13 sementes)');
      const taken = sim.combatLog.filter((e) => e.type === 'ally_captured_cover' && /^cv_c_lane_/.test(e.nodeId)).map((e) => `${e.actorId}:${e.nodeId}`);
      assert.ok(taken.length >= 1, `faixas tomadas: ${taken.join(' ')}`);
      assert.ok(taken.some((s) => s.startsWith('pl_wierzba:') || s.startsWith('pl_malek:')));
      assert.equal(goalOf(sim, 'pl_gruca'), 'cv_c_yard_parapet');
      assert.equal(gruca.health, hp, 'Gruca vigia do parapeito: nada em EC1 lhe vê o parapeito sem B10');
    });
  }

  it('Wierzba trabalha por ordem DE-C08, DE-C07, DE-C01 (o primeiro vivo); mortos os três, volta ao parapeito', () => {
    const sim = advance(1, [-10, -22]); // dentro da trela de assalto (30 m) das três faixas
    for (const [id, n] of Object.entries(C09_LANES)) {
      const lane = C09_PLAN_NODES[n];
      assert.ok(Math.hypot(lane.x - sim.player.x, lane.z - sim.player.z) <= SECTION_ASSAULT_LEASH_M, `${id} ${n}`);
    }
    assert.equal(goalOf(sim, 'pl_wierzba'), null);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_wierzba'), 'cv_c_lane_b11_west');
    Object.assign(enemy(sim, 'DE-C08'), { alive: false, health: 0, state: 'DEAD' });
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_wierzba'), 'cv_c_lane_b11_south');
    Object.assign(enemy(sim, 'DE-C07'), { alive: false, health: 0, state: 'DEAD' });
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_wierzba'), 'cv_c_lane_b09_north', 'sem B11, o que falta é DE-C01');
    Object.assign(enemy(sim, 'DE-C01'), { alive: false, health: 0, state: 'DEAD' });
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_wierzba'), 'cv_c_yard_parapet');
  });

  it('Małek vai ao portão norte de B09 contra DE-C01, que é o que enfia a linha da porta leste (onde o jogador morria)', () => {
    const sim = advance(1, [-20, -26]);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_malek'), 'cv_c_lane_b09_north');
    // controlo da razão: a porta leste de B09 (-12, -5) vê-se de DE-C01 por uma linha enfiada pelo vão da parede interior
    const door = probeAt(sim, -12, -5.1, false); // o vão da porta leste
    const viewers = interior(sim).filter((e) => sim.world.lineOfSight(e, door, { includeFoliage: true })).map((e) => e.id);
    assert.ok(viewers.includes('DE-C01') && viewers.includes('DE-C02'), `à porta leste veem-no ${viewers}`);
  });

  it('quem está ferido (< 55 de vida) não vai a uma faixa: fica com Gruca no parapeito; os saudáveis vão', () => {
    const sim = advance(2);
    ally(sim, 'pl_wierzba').health = C09_WOUNDED_HEALTH - 1;
    ally(sim, 'pl_malek').health = C09_WOUNDED_HEALTH;
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_wierzba'), 'cv_c_yard_parapet', 'ferido: não vai');
    assert.equal(goalOf(sim, 'pl_malek'), 'cv_c_lane_b09_north', 'no limiar (55) já vai');
  });

  it('a trela de assalto manda: com Piotr a mais de 30 m da faixa, quem a quer fica retido no parapeito (section_holding) e vai quando Piotr se aproxima', () => {
    const sim = advance(3, [0, -56]);
    const lane = C09_PLAN_NODES.cv_c_lane_b11_west;
    assert.ok(Math.hypot(lane.x - sim.player.x, lane.z - sim.player.z) > SECTION_ASSAULT_LEASH_M);
    sim.tick(DT, {});
    assert.notEqual(goalOf(sim, 'pl_wierzba'), 'cv_c_lane_b11_west');
    assert.equal(ally(sim, 'pl_wierzba').holdingFor, 'cv_c_lane_b11_west');
    assert.ok(sim.combatLog.some((e) => e.type === 'section_holding' && e.actorId === 'pl_wierzba' && e.nodeId === 'cv_c_lane_b11_west'));
    sim.teleportPlayer(-6, -20, Math.PI / 2, 0);
    sim.tick(DT, {});
    assert.equal(goalOf(sim, 'pl_wierzba'), 'cv_c_lane_b11_west');
    assert.equal(ally(sim, 'pl_wierzba').holdingFor, null);
  });
});

describe('M02 C09: snapshot, restauro e validador do plano', () => {
  it('a meio do avanço o snapshot é válido (holdingFor é um nó do plano) e restaurar reproduz a continuação, tick a tick', () => {
    const sim = enterC(2);
    run(sim, 20);
    killWorkshop(sim);
    sim.teleportPlayer(-14, -25, Math.PI / 2, 0);
    run(sim, 15);
    const snap = structuredClone(sim.snapshot());
    assert.equal(validateM02Snapshot(snap).valid, true);
    assert.ok(snap.allies.every((a) => a.holdingFor == null || /^cv_c_/.test(a.holdingFor)), 'holdingFor em C09 aponta para nós do plano');
    assert.ok(snap.allies.some((a) => typeof a.holdingFor === 'string'), 'há alguém retido pela trela');
    const other = new M02BenchSimulation(9);
    other.restoreSnapshot(snap);
    for (let i = 0; i < 300; i++) {
      sim.tick(DT, {});
      other.tick(DT, {});
    }
    assert.equal(JSON.stringify(other.snapshot()), JSON.stringify(sim.snapshot()));
  });

  it('determinista: a mesma semente e as mesmas entradas dão a mesma história da secção', () => {
    const trace = () => {
      const sim = enterC(4);
      run(sim, 20);
      killWorkshop(sim);
      sim.teleportPlayer(-14, -25, Math.PI / 2, 0);
      run(sim, 40);
      return JSON.stringify([sim.combatLog.filter((e) => /^ally_|section_|enemy_/.test(e.type)), sim.allies.map((a) => [a.id, a.x, a.z, a.health])]);
    };
    assert.equal(trace(), trace());
  });

  it('a fase de evacuação (C10) não mudou: os objetivos de B09/B12 e o rkm no pátio, e o plano de C09 liberta o holdingFor', () => {
    const sim = enterC(1);
    killWorkshop(sim);
    sim.teleportPlayer(-14, -25, Math.PI / 2, 0);
    run(sim, 5);
    for (const e of ec1(sim)) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
    sim.teleportPlayer(-6, -20, Math.PI / 2, 0);
    ally(sim, 'pl_wierzba').holdingFor = 'cv_c_lane_b11_west';
    sim.startC10OrderChanges();
    for (const e of sim.enemies) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
    run(sim, 2);
    assert.equal(sim.c10Active, true);
    assert.equal(ally(sim, 'pl_wierzba').holdingFor, null);
    assert.equal(ally(sim, 'pl_gruca').goal.nodeId, 'cv_c_evac_gruca');
    assert.equal(ally(sim, 'pl_aux_01').goal.nodeId, 'cv_c_yard_rkm');
    assert.equal(ally(sim, 'pl_wierzba').goal.nodeId, 'cv_c_b09_east');
  });
});
