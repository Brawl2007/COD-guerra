// M02 D4 (PDF p. 17): «Ordens do jogador limitam-se a «cobrir aqui» e «avançar para ali» em posições válidas, também acessíveis por
// seleção contextual. Sem ordem, Gruca conduz o plano base.» + «Prova obrigatória: durante 60 s de observação com Piotr abrigado,
// aliados têm de ocupar cobertura útil, disparar com oclusão correta e obter uma melhoria causal da situação ... O log deve relacionar
// ação e resultado.» Teste de estado (entradas simuladas), não playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  SQUAD_ORDER_TYPES,
  SQUAD_ORDER_ASSAULT_TEAM,
  SQUAD_ORDER_REJECTION_TEXT,
  squadOrderPositions,
} from '../src/game/m02-combat-ai.js';

const SEED = 19390909;
const DT = 0.05;
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const run = (sim, seconds, controls = {}) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.tick(DT, controls);
};
/** Piotr abrigado atrás do parapeito inicial, como na prova de 60 s de D4. */
const sheltered = (seed = SEED, options = {}) => {
  const sim = new M02BenchSimulation(seed, options);
  sim.player.crouched = true;
  sim.player.eyeHeight = 1.08;
  return sim;
};

describe('M02 D4: só há duas ordens — cobrir aqui e avançar para ali', () => {
  it('os tipos válidos são auto, cover e advance; «suprimir», «flank_east» e qualquer outro são recusados sem mudar nada', () => {
    assert.deepEqual([...SQUAD_ORDER_TYPES], ['auto', 'cover', 'advance']);
    const sim = new M02BenchSimulation(SEED);
    const before = JSON.stringify(sim.squadOrder);
    for (const type of ['suppress', 'flank_east', 'flank', 'magia', '', null, undefined, 7]) {
      sim.drainEvents();
      assert.equal(sim.issueSquadOrder(type), null, String(type));
      assert.equal(JSON.stringify(sim.squadOrder), before, `${type}: o estado não muda`);
      assert.equal(sim.lastOrderFeedback.accepted, false);
      assert.equal(sim.lastOrderFeedback.reason, 'ordem_desconhecida');
      const rejected = sim.drainEvents().filter((e) => e.type === 'squad-order-rejected');
      assert.equal(rejected.length, 1);
      assert.equal(rejected[0].reason, 'ordem_desconhecida');
    }
    for (const reason of Object.keys(SQUAD_ORDER_REJECTION_TEXT)) assert.ok(SQUAD_ORDER_REJECTION_TEXT[reason]);
  });

  it('os controlos das ordens antigas (orderSuppress, orderFlank) já não fazem nada; orderCover e orderAdvance sim', () => {
    const sim = new M02BenchSimulation(SEED);
    sim.drainEvents();
    sim.tick(DT, { orderSuppress: true, orderFlank: true });
    assert.equal(sim.squadOrder.type, 'auto');
    assert.equal(sim.drainEvents().filter((e) => e.type === 'squad-order' || e.type === 'squad-order-rejected').length, 0);
    sim.tick(DT, { orderCover: true });
    assert.equal(sim.squadOrder.type, 'cover');
    sim.tick(DT, { orderAdvance: true });
    assert.equal(sim.squadOrder.type, 'advance');
  });

  it('a bancada só lista as duas ordens: sem botões nem teclas de «Suprimir MG», «Avançar B01» e «Flanquear Pomar»', () => {
    const html = readFileSync(new URL('../m02-01.html', import.meta.url), 'utf8');
    const main = readFileSync(new URL('../src/m02/m02-01-main.js', import.meta.url), 'utf8');
    assert.match(html, /id="btn-order-cover"[^>]*>Z: Cobrir aqui</);
    assert.match(html, /id="btn-order-advance"[^>]*>X: Avançar para ali</);
    for (const gone of ['btn-order-suppress', 'btn-order-flank', 'Suprimir MG', 'Avançar B01', 'Flanquear Pomar', 'Z/X/B']) {
      assert.equal(html.includes(gone), false, `m02-01.html ainda tem «${gone}»`);
    }
    for (const gone of ['orderSuppress', 'orderFlank', 'KeyB', 'flank_east', "'suppress'", 'btn-order-flank', 'btn-order-suppress']) {
      assert.equal(main.includes(gone), false, `m02-01-main.js ainda tem «${gone}»`);
    }
    assert.match(main, /KeyZ'\)\s*pendingSingleActions\.orderCover/);
    assert.match(main, /KeyX'\)\s*pendingSingleActions\.orderAdvance/);
  });

  it('uma ordem não tem efeitos laterais: não decide o eixo (vala/pomar) nem dispara falas de cena', () => {
    const sim = new M02BenchSimulation(SEED);
    const axisBefore = sim.flags['m02.axis'];
    const consumedBefore = [...sim.dialogue.consumed];
    assert.ok(sim.issueSquadOrder('cover'));
    assert.ok(sim.issueSquadOrder('advance'));
    assert.equal(sim.flags['m02.axis'], axisBefore, 'antes, qualquer ordem escrevia m02.axis = vala');
    assert.deepEqual([...sim.dialogue.consumed], consumedBefore, 'antes, «suprimir»/«avançar» consumiam bz39_c02_01/bz39_c03_01');
  });
});

describe('M02 D4: posições válidas e seleção contextual', () => {
  it('«cobrir aqui» sem alvo escolhe a cobertura válida mais próxima de Piotr; o resultado fica no log e no evento', () => {
    const sim = new M02BenchSimulation(SEED);
    sim.drainEvents();
    const order = sim.issueSquadOrder('cover');
    assert.equal(order.type, 'cover');
    assert.match(order.nodeId, /^cv_start_parapet_[we]$/, 'o parapeito junto a Piotr');
    assert.equal(order.assignments.pl_gruca, order.nodeId, 'Gruca ocupa a âncora');
    assert.ok(Object.keys(order.assignments).every((id) => SQUAD_ORDER_ASSAULT_TEAM.includes(id)));
    assert.equal(new Set(Object.values(order.assignments)).size, Object.keys(order.assignments).length, 'cada nó a um só elemento');
    const events = sim.drainEvents().filter((e) => e.type === 'squad-order');
    assert.equal(events.length, 1);
    assert.deepEqual(events[0].order, order);
    assert.ok(sim.combatLog.some((e) => e.type === 'squad_order' && e.order === 'cover' && e.nodeId === order.nodeId));
    assert.deepEqual(sim.lastOrderFeedback, { type: 'cover', accepted: true, reason: null, clock: 0, nodeId: order.nodeId });
  });

  it('«avançar para ali» sem alvo escolhe a posição à frente da mira (cone de ±30°, 8-70 m); de costas para a quinta não há nenhuma', () => {
    const sim = new M02BenchSimulation(SEED);
    const ahead = sim.issueSquadOrder('advance'); // Piotr olha para sul (+z), a quinta
    assert.equal(ahead.nodeId, 'cv_gate_wall_west_s');
    sim.player.angle = -Math.PI / 2; // de costas
    assert.equal(sim.issueSquadOrder('advance'), null);
    assert.equal(sim.lastOrderFeedback.reason, 'sem_posicao_a_frente');
    assert.equal(sim.squadOrder.nodeId, 'cv_gate_wall_west_s', 'a ordem recusada não apaga a anterior');
  });

  it('com alvo explícito (id de nó ou ponto) só valem posições válidas: ocupadas por hostis, fora do alcance e inexistentes são recusadas', () => {
    const sim = new M02BenchSimulation(SEED);
    assert.equal(sim.issueSquadOrder('cover', 'cv_ditch_mid_a').nodeId, 'cv_ditch_mid_a');
    assert.equal(sim.issueSquadOrder('advance', { x: -43, z: -31 }).nodeId, 'cv_ditch_mid_a', 'o ponto escolhido ajusta-se à posição válida mais próxima');
    for (const bad of ['cv_inexistente', 'cv_b01_kitchen_in' /* DE-A07 a 1 m */, { x: 40, z: 40 }, { x: Number.NaN, z: 0 }, 42, {}]) {
      assert.equal(sim.issueSquadOrder('cover', bad), null, JSON.stringify(bad));
      assert.equal(sim.lastOrderFeedback.reason, 'posicao_invalida', JSON.stringify(bad));
    }
    assert.equal(squadOrderPositions(sim).some((n) => n.id === 'cv_b01_kitchen_in'), false);
    // Sem os hostis o interior de B01 passa a ser válido mas, com as portas fechadas, Piotr não tem caminho: recusada como inalcançável
    sim.enemies.forEach(kill);
    assert.equal(squadOrderPositions(sim).some((n) => n.id === 'cv_b01_kitchen_in'), true);
    assert.equal(sim.issueSquadOrder('cover', 'cv_b01_kitchen_in'), null);
    assert.equal(sim.lastOrderFeedback.reason, 'inalcancavel');
    assert.equal(sim.issueSquadOrder('cover', 'cv_courtyard_consolidate').nodeId, 'cv_courtyard_consolidate');
  });

  it('sem cobertura válida junto de Piotr «cobrir aqui» é recusada; Piotr caído não dá ordens; fora da Área A (sem nós no layout) também não', () => {
    const far = new M02BenchSimulation(SEED);
    far.teleportPlayer(45, 30, 0);
    assert.equal(far.issueSquadOrder('cover'), null);
    assert.equal(far.lastOrderFeedback.reason, 'sem_cobertura_aqui');
    const dead = new M02BenchSimulation(SEED);
    dead.player.alive = false;
    dead.player.health = 0;
    assert.equal(dead.issueSquadOrder('cover'), null);
    assert.equal(dead.lastOrderFeedback.reason, 'piotr_caido');
    const b = new M02BenchSimulation(SEED);
    b.enterAreaBC06();
    assert.equal(b.issueSquadOrder('advance'), null);
    assert.equal(b.lastOrderFeedback.reason, 'sem_posicoes_validas');
    assert.equal(b.issueSquadOrder('auto').type, 'auto', 'auto (sem ordem) é sempre possível');
  });

  it('em C01/C02 as posições válidas são as do corredor (nunca o posto EA0) e a ordem manda na equipa de assalto', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    const ids = squadOrderPositions(sim).map((n) => n.id);
    assert.ok(ids.length >= 3 && ids.every((id) => id.startsWith('cv_c01_')) && !ids.includes('cv_c01_outpost_clear'), ids.join());
    const order = sim.issueSquadOrder('cover');
    assert.match(order.nodeId, /^cv_c01_p1_[we]$/);
    run(sim, 20); // sem avançar: a ordem segura a equipa nos nós atribuídos
    for (const [id, nodeId] of Object.entries(order.assignments)) {
      const node = sim.coverNodesById.get(nodeId);
      assert.ok(Math.hypot(ally(sim, id).x - node.x, ally(sim, id).z - node.z) < 1.5, `${id} em ${nodeId}`);
    }
  });
});

describe('M02 D4: a ordem muda o que a equipa de assalto faz; sem ordem segue o plano base de Gruca', () => {
  const positionOf = (sim, id) => [ally(sim, id).x, ally(sim, id).z];
  const distFromStart = (sim, id) => Math.hypot(ally(sim, id).x - sim.coverNodesById.get('cv_start_parapet_w').x, ally(sim, id).z - sim.coverNodesById.get('cv_start_parapet_w').z);

  it('cobrir aqui: Gruca e Lis ocupam os parapeitos atribuídos e os outros dois mantêm a posição; sem ordem avançam para a vala', () => {
    const auto = sheltered();
    run(auto, 30);
    const ordered = sheltered();
    const order = ordered.issueSquadOrder('cover');
    run(ordered, 30);
    // plano base: Wierzba e Małek já saíram do parapeito inicial e avançam pela vala e pela casa B01
    for (const id of ['pl_wierzba', 'pl_malek']) assert.ok(distFromStart(auto, id) > 15, `${id} no plano base avançou (a ${distFromStart(auto, id).toFixed(1)} m do parapeito)`);
    // com a ordem: os atribuídos estão nos nós; os restantes ficaram onde estavam
    const assigned = Object.keys(order.assignments);
    assert.deepEqual(assigned.sort(), ['pl_gruca', 'pl_lis']);
    for (const id of assigned) {
      const node = ordered.coverNodesById.get(order.assignments[id]);
      assert.ok(Math.hypot(ally(ordered, id).x - node.x, ally(ordered, id).z - node.z) < 1.0, `${id} no nó ${node.id}`);
      assert.equal(ally(ordered, id).reachedNodeId, node.id);
      assert.equal(ally(ordered, id).tacticalState, 'HoldCover');
    }
    for (const id of ['pl_wierzba', 'pl_malek']) {
      assert.ok(distFromStart(ordered, id) < 8, `${id} mantém a posição (a ${distFromStart(ordered, id).toFixed(1)} m do parapeito)`);
      assert.equal(ally(ordered, id).tacticalState, 'HoldCover');
    }
    // o log relaciona a ordem com o resultado
    const captures = ordered.combatLog.filter((e) => e.type === 'ally_captured_cover' && e.byOrder === 'cover');
    assert.deepEqual(captures.map((e) => e.actorId).sort(), assigned.sort());
    assert.ok(captures.every((e) => e.nodeId === order.assignments[e.actorId]));
    assert.ok(ordered.combatLog.findIndex((e) => e.type === 'squad_order') < ordered.combatLog.findIndex((e) => e.byOrder === 'cover'), 'a ordem vem antes do resultado');
  });

  it('avançar para ali: o elemento atribuído desloca-se até à posição à frente e toma-a (byOrder = advance); os outros seguram', () => {
    const sim = sheltered();
    const order = sim.issueSquadOrder('advance');
    assert.equal(order.nodeId, 'cv_gate_wall_west_s');
    const before = positionOf(sim, 'pl_gruca');
    run(sim, 40);
    const gruca = ally(sim, 'pl_gruca');
    const node = sim.coverNodesById.get(order.nodeId);
    assert.ok(Math.hypot(before[0] - node.x, before[1] - node.z) > 40, 'o nó está longe de onde ele estava');
    assert.ok(Math.hypot(gruca.x - node.x, gruca.z - node.z) < 1.5, `Gruca chegou (${gruca.x.toFixed(1)}, ${gruca.z.toFixed(1)})`);
    assert.equal(gruca.reachedNodeId, node.id);
    assert.ok(sim.combatLog.some((e) => e.type === 'ally_captured_cover' && e.actorId === 'pl_gruca' && e.byOrder === 'advance' && e.nodeId === node.id));
    for (const id of ['pl_wierzba', 'pl_malek']) assert.ok(Object.hasOwn(order.assignments, id) === false || ally(sim, id).reachedNodeId === order.assignments[id]);
  });

  it('auto devolve a equipa ao plano base: o estado volta a {type: auto} e deixam de ser seguradas', () => {
    const sim = sheltered();
    sim.issueSquadOrder('cover');
    run(sim, 10);
    const cleared = sim.issueSquadOrder('auto');
    assert.deepEqual(Object.keys(cleared).sort(), ['axis', 'issuedAt', 'type']);
    assert.equal(cleared.type, 'auto');
    assert.ok(distFromStart(sim, 'pl_wierzba') < 8, 'com a ordem em vigor Wierzba mantém a posição');
    run(sim, 30);
    assert.ok(distFromStart(sim, 'pl_wierzba') > 15, 'sem ordem Wierzba segue o plano base e avança');
  });

  it('as ordens caducam com o que o jogador faz, sem tempos inventados: «cobrir aqui» quando Piotr se afasta; «avançar» quando Piotr chega; ao mudar de célula', () => {
    // cobrir aqui: Piotr afasta-se mais de 22 m da âncora e a secção volta ao plano base
    const cover = sheltered();
    const order = cover.issueSquadOrder('cover');
    run(cover, 5);
    assert.equal(cover.squadOrder.type, 'cover', 'Piotr abrigado: a ordem mantém-se');
    cover.drainEvents();
    cover.teleportPlayer(order.x - 30, order.z + 5, 0);
    cover.tick(DT, {});
    assert.equal(cover.squadOrder.type, 'auto');
    const lapsed = cover.drainEvents().filter((e) => e.type === 'squad-order-lapsed');
    assert.deepEqual(lapsed.map((e) => [e.order, e.reason]), [['cover', 'piotr_afastou_se']]);
    assert.ok(cover.combatLog.some((e) => e.type === 'squad_order_lapsed' && e.reason === 'piotr_afastou_se'));
    run(cover, 30);
    assert.ok(distFromStart(cover, 'pl_wierzba') > 15, 'sem ordem Wierzba retoma o plano base');
    // avançar para ali: Piotr chega ao destino
    const adv = sheltered();
    const goal = adv.issueSquadOrder('advance');
    run(adv, 2);
    assert.equal(adv.squadOrder.type, 'advance');
    adv.teleportPlayer(goal.x + 3, goal.z - 3, 0);
    adv.tick(DT, {});
    assert.equal(adv.squadOrder.type, 'auto');
    assert.ok(adv.combatLog.some((e) => e.type === 'squad_order_lapsed' && e.reason === 'piotr_chegou'));
    // um destino em cima de Piotr não é «avançar para ali»
    const near = new M02BenchSimulation(SEED);
    assert.equal(near.issueSquadOrder('advance', 'cv_start_parapet_w'), null);
    assert.equal(near.lastOrderFeedback.reason, 'posicao_invalida');
    // mudar de célula: as ordens só existem na Área A
    const cell = sheltered();
    cell.issueSquadOrder('cover');
    cell.enterAreaBC06();
    cell.tick(DT, {});
    assert.equal(cell.squadOrder.type, 'auto');
    assert.ok(cell.combatLog.some((e) => e.type === 'squad_order_lapsed' && e.reason === 'celula_mudou'));
  });

  it('o auxiliar do rkm e o sanitário não obedecem à equipa de assalto: seguem o seu papel com ordem ou sem ela', () => {
    const base = sheltered();
    const ordered = sheltered();
    ordered.issueSquadOrder('cover');
    run(base, 25);
    run(ordered, 25);
    // (os objetivos de cada um dependem de como o combate evoluiu — o sanitário segue o objetivo da quinta —, por isso compara-se o papel)
    for (const id of ['pl_aux_01', 'pl_aux_02']) {
      assert.equal(ally(ordered, id).tacticalState, 'HoldAndSuppress', `${id}: o papel do rkm, não o da ordem`);
      assert.equal(ally(base, id).tacticalState, 'HoldAndSuppress');
    }
    assert.equal(ally(ordered, 'pl_szymczak').tacticalState, 'SupportMedic');
    assert.equal(ally(base, 'pl_szymczak').tacticalState, 'SupportMedic');
    assert.ok(!Object.hasOwn(ordered.squadOrder.assignments, 'pl_aux_01') && !Object.hasOwn(ordered.squadOrder.assignments, 'pl_szymczak'));
  });
});

describe('M02 D4: prova de 60 s com Piotr abrigado — efeito causal real da secção, com ou sem ordens', () => {
  const SEEDS = [19390909, 777, 31337];
  const MODES = ['auto', 'cover', 'advance'];

  /** Os tiros da secção contra hostis têm linha de visão (a única exceção documentada: a rkm sobre a abertura da MG de B02). */
  const instrumentLineOfSight = (sim) => {
    const shots = [];
    const original = sim.fireActorBurst.bind(sim);
    sim.fireActorBurst = (shooter, target, aimPoint, side) => {
      if (side === 'ally') {
        shots.push({ shooter: shooter.id, target: target.id, los: sim.world.lineOfSight(shooter, target, { includeFoliage: true }) });
      }
      return original(shooter, target, aimPoint, side);
    };
    return shots;
  };

  for (const mode of MODES) {
    for (const seed of SEEDS) {
      it(`${mode} · semente ${seed}: ocupa cobertura, dispara com oclusão correta e melhora a situação (suprime a MG, neutraliza, conquista cobertura)`, () => {
        const sim = sheltered(seed);
        const shots = instrumentLineOfSight(sim);
        if (mode !== 'auto') assert.ok(sim.issueSquadOrder(mode), `${mode} aceite`);
        const ammoBefore = sim.allies.reduce((a, b) => a + b.mag + b.reserve, 0);
        run(sim, 60);
        assert.ok(sim.player.alive, 'Piotr abrigado sobrevive aos 60 s');
        const log = sim.combatLog;
        const of = (type) => log.filter((e) => e.type === type);

        // 1) ocupa cobertura útil
        const captures = of('ally_captured_cover');
        assert.ok(captures.length >= 6, `coberturas tomadas: ${captures.length}`);
        // 2) dispara (munição real) com oclusão correta: só há tiros a alvos com linha de visão, salvo a rkm sobre a abertura da MG
        const totalShots = sim.allies.reduce((a, b) => a + (b.shotsFired ?? 0), 0);
        assert.ok(totalShots >= 50, `tiros reais da secção: ${totalShots}`);
        assert.ok(sim.allies.reduce((a, b) => a + b.mag + b.reserve, 0) < ammoBefore, 'consumiu munição');
        const blind = shots.filter((s) => !s.los && !(s.shooter === 'pl_aux_01' && s.target === 'DE-A05'));
        assert.deepEqual(blind, [], `tiros sem linha de visão: ${JSON.stringify(blind.slice(0, 3))}`);
        // 3) melhoria causal: suprimir a MG, neutralizar alguém ou conquistar cobertura — e o log liga a ação ao resultado
        const mgSuppressed = of('ally_suppressed_enemy').some((e) => e.targetId === 'DE-A05');
        const neutralized = of('ally_killed_enemy').length + of('enemy_wounded_unarmed_c04').length + of('enemy_surrendered').length;
        assert.ok(mgSuppressed || neutralized >= 1 || captures.length >= 6, 'melhoria causal');
        assert.ok(of('ally_hit_enemy').length + of('ally_killed_enemy').length >= 4, `impactos causais: ${of('ally_hit_enemy').length}`);
        for (const e of of('ally_hit_enemy')) {
          assert.ok(e.shooterId && e.targetId && e.damage > 0 && Number.isFinite(e.remainingHealth), 'cada impacto no log diz quem, a quem e quanto');
        }
        assert.ok(sim.enemies.reduce((a, e) => a + (e.maxHealth - e.health), 0) > 200, 'os hostis perderam vida por fogo da secção');
        if (mode !== 'auto') {
          const orderAt = log.findIndex((e) => e.type === 'squad_order');
          const firstByOrder = log.findIndex((e) => e.type === 'ally_captured_cover' && e.byOrder === mode);
          assert.ok(orderAt >= 0 && firstByOrder > orderAt, 'o log liga a ordem à cobertura tomada por causa dela');
        }
      });
    }
  }
});

describe('M02 D4: ordens no snapshot, no restauro e no validador', () => {
  it('restaurar a meio de uma ordem reproduz a continuação (a ordem e as atribuições fazem parte do snapshot)', () => {
    const controls = (i) => ({ orderCover: i === 10, orderAdvance: i === 400, fire: i % 40 === 5 });
    const trace = (sim, from, to) => {
      const out = [];
      for (let i = from; i < to; i++) {
        sim.tick(DT, controls(i));
        out.push(JSON.stringify([sim.clock, sim.squadOrder, sim.allies.map((a) => [a.id, a.x, a.z, a.mag, a.reachedNodeId, a.tacticalState]), sim.rng.state]));
        sim.drainEvents();
      }
      return out;
    };
    const sim = sheltered();
    trace(sim, 0, 250);
    const snap = structuredClone(sim.snapshot());
    assert.equal(snap.squadOrder.type, 'cover');
    assert.ok(Object.keys(snap.squadOrder.assignments).length >= 1);
    assert.equal(validateM02Snapshot(snap).valid, true);
    const ref = trace(sim, 250, 650); // atravessa a 2.ª ordem (avançar)
    const fresh = new M02BenchSimulation(7);
    fresh.restoreSnapshot(snap);
    assert.deepEqual(trace(fresh, 250, 650), ref);
    assert.equal(ref.at(-1).includes('"type":"advance"'), true);
  });

  it('o validador recusa ordens com tipo desconhecido, alvo em falta ou atribuições inválidas; aceita auto e as formas novas', () => {
    const sim = sheltered();
    sim.issueSquadOrder('cover');
    const ok = sim.snapshot();
    assert.equal(validateM02Snapshot(ok).valid, true);
    const cases = [
      (s) => { s.squadOrder.type = 'magia'; },
      (s) => { delete s.squadOrder.nodeId; },
      (s) => { s.squadOrder.x = 'oeste'; },
      (s) => { s.squadOrder.assignments = []; },
      (s) => { s.squadOrder.assignments = { pl_inexistente: 'cv_start_parapet_w' }; },
      (s) => { s.squadOrder.assignments = { pl_gruca: 5 }; },
      (s) => { s.squadOrder.issuedAt = -3; },
    ];
    for (const mutate of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, JSON.stringify(bad.squadOrder));
      assert.match(r.reason, /Ordem à secção inválida/);
    }
    const auto = structuredClone(ok);
    auto.squadOrder = { type: 'auto', axis: null, issuedAt: 0 };
    assert.equal(validateM02Snapshot(auto).valid, true);
  });

  it('um save antigo com «suppress» ou «flank_east» continua a carregar e a ordem fica neutralizada (auto)', () => {
    const sim = new M02BenchSimulation(SEED);
    for (const type of ['suppress', 'flank_east']) {
      const legacy = structuredClone(sim.snapshot());
      legacy.squadOrder = { type, axis: type === 'flank_east' ? 'orchard' : 'ditch', issuedAt: 12.5 };
      assert.equal(validateM02Snapshot(legacy).valid, true, type);
      const other = new M02BenchSimulation(1);
      other.restoreSnapshot(legacy);
      assert.deepEqual(other.squadOrder, { type: 'auto', axis: null, issuedAt: 12.5 }, type);
    }
  });

  it('ordens dadas pelas mesmas entradas e a mesma semente dão o mesmo estado (determinismo)', () => {
    const play = () => {
      const sim = sheltered(777);
      sim.tick(DT, { orderCover: true });
      run(sim, 20);
      sim.tick(DT, { orderAdvance: true });
      run(sim, 20);
      return JSON.stringify(sim.snapshot());
    };
    assert.equal(play(), play());
  });
});
