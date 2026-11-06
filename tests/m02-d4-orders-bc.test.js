// M02 D4 (PDF p. 17): «Ordens do jogador limitam-se a «cobrir aqui» e «avançar para ali» em posições válidas.» As Áreas B e C não têm
// `coverNodes` no layout (a Área A tem): as posições válidas são nós DERIVADOS DA COBERTURA EXISTENTE da célula — o plano da secção e
// lugares atrás de cada cobertura do layout (ORDER_NODES, m02-combat-ai.js). Aqui: o mesmo contrato da Área A (m02-d4-squad-orders) em B e
// em C, com o efeito causal da ordem sobre a equipa de assalto. Testes de estado (entradas simuladas), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import cellsBC from '../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  B_PLAN_NODES,
  B_PLAN_ROLES,
  C_EVAC_NODES,
  C_EVAC_ROLES,
  C09_PLAN_NODES,
  ORDER_NODES,
  B_COVER_SLOTS,
  C_COVER_SLOTS,
  COVER_SLOT_OFFSET_M,
  COVER_SLOT_SPACING_M,
  COVER_SLOT_MAX,
  SQUAD_ORDER_ASSAULT_TEAM,
  SQUAD_ORDER_ENEMY_CLEARANCE_M,
  isKnownOrderNode,
  orderNodesOf,
  squadOrderPositions,
} from '../src/game/m02-combat-ai.js';

const SEED = 7;
const DT = 0.05;
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const run = (sim, seconds, controls = {}) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.tick(DT, controls);
};
/** Área B pronta para provar a ordem, não o combate: os hostis de EB1 fora de jogo. */
function areaB(seed = SEED) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  sim.enterAreaBC06();
  sim.enemies.forEach(kill);
  return sim;
}
/** Área C em C09 (antes do portão) sem os defensores de EC1; Piotr fica a norte (z <= -18) e C10 não arranca. */
function areaC(seed = SEED) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  sim.enterAreaCC09();
  sim.enemies.forEach(kill);
  return sim;
}
const placed = (sim, id) => ally(sim, id);
const near = (sim, id, node, m = 1.2) => Math.hypot(placed(sim, id).x - node.x, placed(sim, id).z - node.z) <= m;
const nodeOf = (sim, nodeId) => orderNodesOf(sim.activeCellId).find((n) => n.id === nodeId);
const captures = (sim) => sim.combatLog.filter((e) => e.type === 'ally_captured_cover');

describe('M02 D4 B/C: os nós de ordem derivam da cobertura existente', () => {
  it('B e C reúnem o plano da secção e lugares atrás de cada cobertura baixa do layout; os do plano mantêm os valores de sempre', () => {
    for (const id of Object.keys({ ...B_PLAN_NODES })) assert.ok(isKnownOrderNode('B', id), id);
    for (const id of [...Object.keys(C09_PLAN_NODES), ...Object.keys(C_EVAC_NODES)]) assert.ok(isKnownOrderNode('C', id), id);
    assert.equal(isKnownOrderNode('B', 'cv_c_yard_parapet'), false, 'cada célula tem os seus nós');
    assert.equal(isKnownOrderNode('A', 'cv_b_west_wall'), false);
    assert.equal(isKnownOrderNode('B', '__proto__'), false);
    // o plano da secção em B e em C é o de antes (a refatoração não mexeu em nenhuma posição): [x, z, facing, crouch]
    const oldB = {
      pl_gruca: [-18.0, 10.0, -Math.PI / 2, true],
      pl_wierzba: [-32.0, -12.0, -Math.PI / 2, false],
      pl_lis: [-6.0, 50.0, -Math.PI / 2, true],
      pl_malek: [-22.0, 10.5, -Math.PI / 2, true],
      pl_szymczak: [-38.0, 38.0, 0, true],
      pl_aux_01: [11.5, 6.5, -Math.PI / 2, true],
      pl_aux_02: [14.0, 6.8, -Math.PI / 2, true],
    };
    for (const [id, [x, z, facing, crouch]] of Object.entries(oldB)) {
      assert.deepEqual({ ...B_PLAN_NODES[B_PLAN_ROLES[id]] }, { x, z, facing, crouch }, `B ${id}`);
    }
    const oldC = {
      pl_gruca: [-32.0, 18.0, 0.4, true],
      pl_wierzba: [-14.0, -4.0, 0.3, true],
      pl_malek: [-46.0, 36.0, 0.5, true],
      pl_szymczak: [-56.0, 46.0, -Math.PI / 2, false],
      pl_aux_01: [-6.0, -11.5, 0.5, true],
      pl_aux_02: [-4.0, -11.5, 0.5, true],
    };
    for (const [id, [x, z, facing, crouch]] of Object.entries(oldC)) {
      assert.deepEqual({ ...C_EVAC_NODES[C_EVAC_ROLES[id]] }, { x, z, facing, crouch }, `C ${id}`);
    }
    assert.ok(Object.isFrozen(ORDER_NODES) && Object.isFrozen(ORDER_NODES.B) && Object.isFrozen(ORDER_NODES.C));
  });

  it('cada cobertura baixa do layout (>= 1 m) dá 1-3 lugares do lado da entrada, a 0,9 m, a 2,5 m uns dos outros, fora da cobertura', () => {
    for (const [cellId, slots] of [['B', B_COVER_SLOTS], ['C', C_COVER_SLOTS]]) {
      const cell = cellsBC.cells[cellId];
      const spawn = cell.playerSpawn;
      let total = 0;
      for (const cover of cell.covers) {
        const prefix = `${cover.id.replace(/^cov_/, 'cv_')}_s`;
        const mine = Object.entries(slots).filter(([id]) => id.startsWith(prefix));
        if (!(cover.height >= 1.0)) {
          assert.equal(mine.length, 0, `${cover.id}: demasiado baixa`);
          continue;
        }
        assert.ok(mine.length >= 1 && mine.length <= COVER_SLOT_MAX, `${cover.id}: ${mine.length} lugares`);
        total += mine.length;
        const [x0, x1, z0, z1] = cover.bounds;
        const alongX = x1 - x0 >= z1 - z0;
        for (const [id, s] of mine) {
          const inside = s.x > x0 && s.x < x1 && s.z > z0 && s.z < z1;
          assert.equal(inside, false, `${id} dentro da cobertura`);
          assert.equal(s.crouch, true);
          // distância à cobertura (perpendicular ao eixo maior) e lado da entrada da célula
          const gap = alongX ? Math.min(Math.abs(s.z - z0), Math.abs(s.z - z1)) : Math.min(Math.abs(s.x - x0), Math.abs(s.x - x1));
          assert.ok(Math.abs(gap - COVER_SLOT_OFFSET_M) < 0.011, `${id}: a ${gap.toFixed(2)} m da cobertura`);
          const entrySide = alongX ? Math.sign(spawn.z - (z0 + z1) / 2) === Math.sign(s.z - (z0 + z1) / 2) : Math.sign(spawn.x - (x0 + x1) / 2) === Math.sign(s.x - (x0 + x1) / 2);
          assert.ok(entrySide, `${id}: do lado da entrada`);
        }
        const along = mine.map(([, s]) => (alongX ? s.x : s.z)).sort((a, b) => a - b);
        for (let i = 1; i < along.length; i++) assert.ok(Math.abs(along[i] - along[i - 1] - COVER_SLOT_SPACING_M) < 0.011, `${cover.id}: espaçamento`);
      }
      assert.ok(total >= 8, `${cellId}: ${total} lugares derivados`);
    }
  });

  it('todos os nós são alcançáveis a pé desde a entrada da célula (o navegador encontra rota até cada um)', () => {
    for (const [cellId, enter] of [['B', (s) => s.enterAreaBC06()], ['C', (s) => s.enterAreaCC09()]]) {
      const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
      enter(sim);
      const spawn = sim.world.layout.playerSpawn;
      for (const node of orderNodesOf(cellId)) {
        const route = sim.navigator.route({ x: spawn.x, y: 0, z: spawn.z, radius: 0.32 }, { x: node.x, z: node.z });
        assert.ok(route && route.length > 0, `${cellId}: sem rota para ${node.id}`);
      }
    }
  });
});

describe('M02 D4 B/C: posições válidas e seleção contextual (o contrato da Área A)', () => {
  it('em B e em C as posições válidas são os nós da célula; um hostil a menos de 6 m invalida o nó; nunca os nós de outra célula', () => {
    const b = new M02BenchSimulation(SEED, { startScene: 'C01' });
    b.enterAreaBC06();
    const clear = squadOrderPositions(b);
    assert.ok(clear.length > 0 && clear.length <= orderNodesOf('B').length);
    const node = nodeOf(b, 'cv_b_west_wall');
    const hostile = b.enemies.find((e) => e.alive && !e.nonCombatant);
    Object.assign(hostile, { x: node.x + 3, z: node.z });
    assert.equal(squadOrderPositions(b).some((n) => n.id === 'cv_b_west_wall'), false, 'hostil a 3 m');
    Object.assign(hostile, { x: node.x + SQUAD_ORDER_ENEMY_CLEARANCE_M + 1, z: node.z });
    assert.equal(squadOrderPositions(b).some((n) => n.id === 'cv_b_west_wall'), true, 'hostil a 7 m');
    assert.ok(squadOrderPositions(b).every((n) => isKnownOrderNode('B', n.id)));
    const c = new M02BenchSimulation(SEED, { startScene: 'C01' });
    c.enterAreaCC09();
    assert.ok(squadOrderPositions(c).length >= 20 && squadOrderPositions(c).every((n) => isKnownOrderNode('C', n.id)));
  });

  it('B: «cobrir aqui» escolhe a cobertura mais próxima de Piotr (<= 14 m); a equipa de assalto ocupa lugares à volta da âncora; a ordem leva a célula', () => {
    const sim = areaB();
    sim.teleportPlayer(-20, 18, -Math.PI / 2);
    sim.drainEvents();
    const order = sim.issueSquadOrder('cover');
    assert.equal(order.type, 'cover');
    assert.equal(order.cellId, 'B');
    assert.match(order.nodeId, /^cv_b_west_wall/, 'o muro oeste, o mais próximo');
    assert.equal(order.assignments.pl_gruca, order.nodeId, 'Gruca ocupa a âncora');
    assert.ok(Object.keys(order.assignments).every((id) => SQUAD_ORDER_ASSAULT_TEAM.includes(id)));
    assert.equal(new Set(Object.values(order.assignments)).size, Object.keys(order.assignments).length, 'cada nó a um só elemento');
    assert.ok(Object.values(order.assignments).every((nodeId) => isKnownOrderNode('B', nodeId)));
    assert.equal(sim.drainEvents().filter((e) => e.type === 'squad-order').length, 1);
    assert.ok(sim.combatLog.some((e) => e.type === 'squad_order' && e.order === 'cover' && e.nodeId === order.nodeId));
  });

  it('B: «avançar para ali» sem alvo escolhe a posição à frente da mira (8-70 m, cone de ±30°); de costas não há nenhuma; sem cobertura a menos de 14 m «cobrir» é recusada', () => {
    const sim = areaB();
    assert.equal(sim.issueSquadOrder('cover'), null, 'junto da entrada não há cobertura a menos de 14 m');
    assert.equal(sim.lastOrderFeedback.reason, 'sem_cobertura_aqui');
    const ahead = sim.issueSquadOrder('advance'); // Piotr entra a olhar para norte
    assert.match(ahead.nodeId, /^cv_b_south_barricade/);
    sim.player.angle = Math.PI / 2; // de costas para o corredor
    assert.equal(sim.issueSquadOrder('advance'), null);
    assert.equal(sim.lastOrderFeedback.reason, 'sem_posicao_a_frente');
    assert.equal(sim.squadOrder.nodeId, ahead.nodeId, 'a ordem recusada não apaga a anterior');
  });

  it('C: «cobrir aqui» e «avançar para ali» valem em C09 e em C10-C11; alvo explícito só em posições válidas e alcançáveis', () => {
    const sim = areaC();
    sim.teleportPlayer(-4, -44, Math.PI / 2);
    const cover = sim.issueSquadOrder('cover');
    assert.equal(cover.cellId, 'C');
    assert.match(cover.nodeId, /^cv_c_north_wall_s|^cv_c_north_rkm/);
    assert.equal(sim.issueSquadOrder('advance', 'cv_c_evac_gruca').nodeId, 'cv_c_evac_gruca', 'por id, mesmo à frente da fase de C10');
    for (const bad of ['cv_b_west_wall', 'cv_inexistente', { x: 140, z: 170 }, { x: Number.NaN, z: 0 }, 42]) {
      assert.equal(sim.issueSquadOrder('cover', bad), null, JSON.stringify(bad));
      assert.equal(sim.lastOrderFeedback.reason, 'posicao_invalida', JSON.stringify(bad));
    }
    const spawn = areaC();
    const ahead = spawn.issueSquadOrder('advance'); // Piotr entra a olhar para sul (+z)
    assert.match(ahead.nodeId, /^cv_c_assembly_|^cv_c_north_/);
    const dead = areaC();
    dead.player.alive = false;
    dead.player.health = 0;
    assert.equal(dead.issueSquadOrder('cover'), null);
    assert.equal(dead.lastOrderFeedback.reason, 'piotr_caido');
  });
});

describe('M02 D4 B/C: a ordem muda o que a equipa de assalto faz; sem ordem segue o plano base', () => {
  it('B · cobrir aqui: os atribuídos tomam os lugares da ordem (byOrder = cover); sem ordem iriam para o plano; auxiliares e sanitário seguem o seu papel', () => {
    const auto = areaB();
    auto.teleportPlayer(-20, 18, -Math.PI / 2);
    run(auto, 45);
    const sim = areaB();
    sim.teleportPlayer(-20, 18, -Math.PI / 2);
    const order = sim.issueSquadOrder('cover');
    run(sim, 45);
    const assigned = Object.keys(order.assignments);
    assert.ok(assigned.length >= 3, `atribuídos: ${assigned}`);
    for (const id of assigned) {
      const node = nodeOf(sim, order.assignments[id]);
      assert.ok(near(sim, id, node), `${id} no nó ${node.id} (${placed(sim, id).x.toFixed(1)}, ${placed(sim, id).z.toFixed(1)})`);
      assert.equal(placed(sim, id).reachedNodeId, node.id);
      assert.equal(placed(sim, id).tacticalState, 'HoldCover');
    }
    // o plano base põe Wierzba a 30 m dali (cv_b05_south); com a ordem ele está no muro oeste, ou mantém a posição se ficou sem lugar
    assert.ok(near(auto, 'pl_wierzba', B_PLAN_NODES.cv_b05_south), 'sem ordem, Wierzba vai ao cruzamento de B05');
    assert.equal(near(sim, 'pl_wierzba', B_PLAN_NODES.cv_b05_south), false, 'com ordem, não');
    // o log liga a ordem às coberturas tomadas por causa dela
    const byOrder = captures(sim).filter((e) => e.byOrder === 'cover');
    assert.deepEqual(byOrder.map((e) => e.actorId).sort(), assigned.sort());
    assert.ok(byOrder.every((e) => e.nodeId === order.assignments[e.actorId]));
    assert.ok(sim.combatLog.findIndex((e) => e.type === 'squad_order') < sim.combatLog.findIndex((e) => e.byOrder === 'cover'));
    // quem não é da equipa de assalto não obedece: o rkm e o sanitário seguem o plano com ou sem ordem
    for (const id of ['pl_aux_01', 'pl_aux_02']) {
      assert.equal(placed(sim, id).tacticalState, 'HoldAndSuppress');
      assert.equal(placed(sim, id).reachedNodeId, placed(auto, id).reachedNodeId, `${id}: o mesmo nó do plano`);
    }
    assert.equal(placed(sim, 'pl_szymczak').reachedNodeId, placed(auto, 'pl_szymczak').reachedNodeId);
    assert.ok(!Object.hasOwn(order.assignments, 'pl_aux_01') && !Object.hasOwn(order.assignments, 'pl_szymczak'));
  });

  it('B · avançar para ali: o elemento atribuído desloca-se até à posição à frente e toma-a (byOrder = advance); quem ficou sem lugar mantém a posição', () => {
    const sim = areaB();
    const before = { x: placed(sim, 'pl_gruca').x, z: placed(sim, 'pl_gruca').z };
    const order = sim.issueSquadOrder('advance');
    const target = nodeOf(sim, order.nodeId);
    assert.ok(Math.hypot(before.x - target.x, before.z - target.z) > 20, 'o nó está longe de onde Gruca estava');
    run(sim, 45);
    assert.ok(near(sim, 'pl_gruca', target), `Gruca chegou (${placed(sim, 'pl_gruca').x.toFixed(1)}, ${placed(sim, 'pl_gruca').z.toFixed(1)})`);
    assert.ok(captures(sim).some((e) => e.actorId === 'pl_gruca' && e.byOrder === 'advance' && e.nodeId === order.nodeId));
    for (const id of SQUAD_ORDER_ASSAULT_TEAM) {
      if (Object.hasOwn(order.assignments, id)) continue;
      assert.ok(Math.hypot(placed(sim, id).x - 8, placed(sim, id).z - 84) < 12 || Math.hypot(placed(sim, id).x + 8, placed(sim, id).z - 84) < 12, `${id} sem lugar mantém a posição de partida`);
    }
  });

  it('C · cobrir aqui e avançar para ali: os atribuídos ocupam os nós da ordem (junto do muro norte; na reunião); o plano de C09 não os leva para lá', () => {
    const auto = areaC();
    auto.teleportPlayer(-4, -44, Math.PI / 2);
    run(auto, 40);
    const cover = areaC();
    cover.teleportPlayer(-4, -44, Math.PI / 2);
    const order = cover.issueSquadOrder('cover');
    run(cover, 40);
    for (const id of Object.keys(order.assignments)) {
      const node = nodeOf(cover, order.assignments[id]);
      assert.ok(near(cover, id, node), `${id} em ${node.id}`);
      assert.equal(placed(cover, id).tacticalState, 'HoldCover');
    }
    // com Piotr junto do muro norte e a oficina B10 sem defensores, o plano de C09 leva Gruca ao parapeito do pátio (a 28 m); com a ordem fica no muro
    assert.ok(near(auto, 'pl_gruca', C09_PLAN_NODES.cv_c_yard_parapet), 'sem ordem Gruca vai ao parapeito do pátio');
    assert.equal(near(cover, 'pl_gruca', C09_PLAN_NODES.cv_c_yard_parapet, 5), false, 'com ordem Gruca fica no muro norte');
    assert.ok(captures(cover).filter((e) => e.byOrder === 'cover').length >= 2);

    const adv = areaC();
    const aorder = adv.issueSquadOrder('advance');
    run(adv, 40);
    const target = nodeOf(adv, aorder.nodeId);
    assert.ok(near(adv, 'pl_gruca', target), 'Gruca tomou a posição à frente');
    assert.ok(captures(adv).some((e) => e.actorId === 'pl_gruca' && e.byOrder === 'advance'));
    // o auxiliar do rkm continua na base de fogo de C09, com ou sem ordem
    assert.equal(placed(adv, 'pl_aux_01').tacticalState, 'HoldAndSuppress');
    assert.equal(placed(adv, 'pl_aux_01').reachedNodeId, 'cv_c_north_rkm');
  });

  it('a ordem em C não mexe em Lis a regressar ferido em C11 (o percurso é do diretor da Área C); os outros da equipa obedecem', () => {
    const sim = areaC();
    sim.startC10OrderChanges();
    sim.detonateC10FixedArtillery(); // arranca C11: Lis regressa ferido
    const lis = ally(sim, 'pl_lis');
    assert.equal(lis.state, 'WOUNDED_LIAISON');
    sim.teleportPlayer(-4, -44, Math.PI / 2);
    const order = sim.issueSquadOrder('cover');
    assert.ok(order, 'a ordem é aceite');
    assert.equal(Object.hasOwn(order.assignments, 'pl_lis'), false, 'Lis ferido não é da equipa de assalto neste momento');
    const goalBefore = JSON.stringify(lis.goal);
    run(sim, 2);
    assert.equal(lis.state, 'WOUNDED_LIAISON');
    assert.equal(JSON.stringify(lis.goal), goalBefore, 'o objetivo de Lis é o do diretor, não o da ordem');
    assert.ok(Object.keys(order.assignments).length >= 1);
  });
});

describe('M02 D4 B/C: as ordens caducam com o que o jogador faz e ao mudar de célula', () => {
  it('B: «cobrir aqui» caduca quando Piotr se afasta; «avançar» quando Piotr chega; ao ir para C a ordem de B caduca (celula_mudou)', () => {
    const cover = areaB();
    cover.teleportPlayer(-20, 18, -Math.PI / 2);
    cover.issueSquadOrder('cover');
    run(cover, 2);
    assert.equal(cover.squadOrder.type, 'cover', 'Piotr junto da âncora: mantém-se');
    cover.drainEvents();
    cover.teleportPlayer(30, 60, -Math.PI / 2);
    cover.tick(DT, {});
    assert.equal(cover.squadOrder.type, 'auto');
    assert.deepEqual(cover.drainEvents().filter((e) => e.type === 'squad-order-lapsed').map((e) => [e.order, e.reason]), [['cover', 'piotr_afastou_se']]);

    const adv = areaB();
    const goal = adv.issueSquadOrder('advance');
    run(adv, 2);
    assert.equal(adv.squadOrder.type, 'advance');
    adv.teleportPlayer(goal.x + 2, goal.z + 2, -Math.PI / 2);
    adv.tick(DT, {});
    assert.equal(adv.squadOrder.type, 'auto');
    assert.ok(adv.combatLog.some((e) => e.type === 'squad_order_lapsed' && e.reason === 'piotr_chegou'));

    const cell = areaB();
    cell.teleportPlayer(-20, 18, -Math.PI / 2);
    cell.issueSquadOrder('cover');
    cell.enterAreaCC09();
    cell.tick(DT, {});
    assert.equal(cell.squadOrder.type, 'auto');
    assert.ok(cell.combatLog.some((e) => e.type === 'squad_order_lapsed' && e.reason === 'celula_mudou'));
  });

  it('C: o mesmo — cobrir caduca quando Piotr se afasta, avançar quando chega', () => {
    const cover = areaC();
    cover.teleportPlayer(-4, -44, Math.PI / 2);
    cover.issueSquadOrder('cover');
    run(cover, 1);
    assert.equal(cover.squadOrder.type, 'cover');
    cover.teleportPlayer(-4, -72, Math.PI / 2);
    cover.tick(DT, {});
    assert.equal(cover.squadOrder.type, 'auto');
    assert.ok(cover.combatLog.some((e) => e.type === 'squad_order_lapsed' && e.reason === 'piotr_afastou_se'));
    const adv = areaC();
    const goal = adv.issueSquadOrder('advance');
    adv.teleportPlayer(goal.x, goal.z - 3, Math.PI / 2);
    adv.tick(DT, {});
    assert.equal(adv.squadOrder.type, 'auto');
    assert.ok(adv.combatLog.some((e) => e.type === 'squad_order_lapsed' && e.reason === 'piotr_chegou'));
  });

  it('uma ordem da Área A caduca ao entrar em B (a ordem sem `cellId` é de A)', () => {
    const sim = new M02BenchSimulation(SEED);
    sim.player.crouched = true;
    sim.issueSquadOrder('cover');
    assert.equal(sim.squadOrder.cellId, 'A');
    sim.enterAreaBC06();
    sim.enemies.forEach(kill);
    sim.tick(DT, {});
    assert.equal(sim.squadOrder.type, 'auto');
    assert.ok(sim.combatLog.some((e) => e.type === 'squad_order_lapsed' && e.reason === 'celula_mudou'));
  });
});

describe('M02 D4 B/C: ordens no snapshot, no restauro e no validador (campo aditivo `cellId`)', () => {
  const trace = (sim, from, to, controls) => {
    const out = [];
    for (let i = from; i < to; i++) {
      sim.tick(DT, controls(i));
      out.push(JSON.stringify([sim.clock, sim.squadOrder, sim.allies.map((a) => [a.id, a.x, a.z, a.mag, a.reachedNodeId, a.tacticalState]), sim.rng.state]));
      sim.drainEvents();
    }
    return out;
  };

  for (const [label, make, spot] of [
    ['B', areaB, [-20, 18, -Math.PI / 2]],
    ['C', areaC, [-4, -44, Math.PI / 2]],
  ]) {
    it(`${label}: restaurar a meio de uma ordem reproduz a continuação (a ordem e as atribuições fazem parte do snapshot)`, () => {
      const controls = (i) => ({ orderCover: i === 5, orderAdvance: i === 500 });
      const sim = make();
      sim.teleportPlayer(...spot);
      trace(sim, 0, 200, controls);
      const snap = structuredClone(sim.snapshot());
      assert.equal(snap.squadOrder.type, 'cover');
      assert.equal(snap.squadOrder.cellId, label);
      assert.equal(validateM02Snapshot(snap).valid, true);
      const ref = trace(sim, 200, 600, controls);
      const fresh = new M02BenchSimulation(3);
      fresh.restoreSnapshot(snap);
      assert.deepEqual(trace(fresh, 200, 600, controls), ref);
      assert.ok(ref.some((line) => line.includes('"type":"advance"')) || ref.at(-1).includes('"type":"auto"'), 'atravessa a 2.ª ordem ou a sua caducidade');
    });
  }

  it('o validador recusa cellId desconhecido e, em B/C, nós que a célula não tem (na ordem e nas atribuições); aceita as ordens de A sem cellId', () => {
    const sim = areaB();
    sim.teleportPlayer(-20, 18, -Math.PI / 2);
    sim.issueSquadOrder('cover');
    const ok = sim.snapshot();
    assert.equal(validateM02Snapshot(ok).valid, true);
    const cases = [
      (s) => { s.squadOrder.cellId = 'Z'; },
      (s) => { s.squadOrder.cellId = 7; },
      (s) => { s.squadOrder.nodeId = 'cv_c_yard_parapet'; },
      (s) => { s.squadOrder.nodeId = 'cv_inexistente'; },
      (s) => { s.squadOrder.assignments.pl_gruca = 'cv_c_evac_gruca'; },
      (s) => { s.squadOrder.assignments.pl_lis = 'cv_a_inventado'; },
      (s) => { s.squadOrder.cellId = 'C'; }, // nós de B numa ordem de C
    ];
    for (const mutate of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, JSON.stringify(bad.squadOrder));
      assert.match(r.reason, /Ordem à secção inválida/);
    }
    // uma ordem de A sem cellId (saves anteriores) continua a valer; auto nunca leva cellId
    const a = new M02BenchSimulation(SEED);
    a.player.crouched = true;
    a.issueSquadOrder('cover');
    const legacy = structuredClone(a.snapshot());
    delete legacy.squadOrder.cellId;
    assert.equal(validateM02Snapshot(legacy).valid, true);
    const fresh = new M02BenchSimulation(1);
    fresh.restoreSnapshot(legacy);
    assert.equal(fresh.squadOrder.type, 'cover');
    // uma ordem de B guardada logo depois de mudar de célula (ainda não caducou) é um estado válido
    const crossing = areaB();
    crossing.teleportPlayer(-20, 18, -Math.PI / 2);
    crossing.issueSquadOrder('cover');
    crossing.enterAreaCC09();
    assert.equal(validateM02Snapshot(crossing.snapshot()).valid, true);
  });

  it('ordens dadas pelas mesmas entradas e a mesma semente dão o mesmo estado em B e em C (determinismo)', () => {
    const play = (make, spot) => {
      const sim = make(31337);
      sim.teleportPlayer(...spot);
      sim.tick(DT, { orderCover: true });
      run(sim, 15);
      sim.tick(DT, { orderAdvance: true });
      run(sim, 15);
      return JSON.stringify(sim.snapshot());
    };
    assert.equal(play(areaB, [-20, 18, -Math.PI / 2]), play(areaB, [-20, 18, -Math.PI / 2]));
    assert.equal(play(areaC, [-4, -44, Math.PI / 2]), play(areaC, [-4, -44, Math.PI / 2]));
  });
});
