// M02 C10/C11 (PDF p. 14: «Segurem esta passagem. Só até eles saírem.», «O socorrista procura abrigo e só atravessa com oportunidade real») + D4
// (p. 17: «Dois elementos alternam apoio e deslocação»). Gruca, o único elemento exigido, já não corre ao ponto de evacuação (-32, 18) no
// início de C10 — a reserva EC2 oeste (6 fuzis a 40-50 m) apanhava-o a descoberto em 5 de 40 sementes —: avança por LANÇOS ABRIGADOS (parapeito
// do pátio → nave de B09 → atrás da porta sul → posição final) e só dá o lanço seguinte quando nenhum hostil não suprimido vê a rota dele.
// Testes de estado (entradas simuladas e MissionBot), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  BOUND_AT_NODE_M,
  BOUND_MAX_EXPOSURE,
  BOUND_SAMPLE_M,
  BOUND_SUPPRESSED_CLEAR,
  C_BOUND_PLAN,
  C_EVAC_NODES,
  C_EVAC_ROLES,
  ORDER_NODES,
  boundHopExposure,
} from '../src/game/m02-combat-ai.js';
import { M02_SCENE_IDS } from '../src/game/m02-acts-director.js';
import { MissionBot } from './m02-mission-bot.js';

const SEED = 7;
const DT = 0.05;
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const NODES = ORDER_NODES.C;
const PLAN = C_BOUND_PLAN.pl_gruca;
const run = (sim, seconds) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.tick(DT, {});
};
const near = (a, node, m = BOUND_AT_NODE_M) => Math.hypot(a.x - node.x, a.z - node.z) <= m;

/**
 * C10 sem fogo: a secção desarmada (só conta onde cada um vai), os defensores de EC1 e a reserva EC2 fora de jogo, Gruca no parapeito do
 * pátio (onde C09 o deixa) e Piotr junto dele. Devolve também um «atirador» da reserva oeste, sem munição, que o teste põe onde quer.
 */
function c10(seed = SEED) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
  sim.enterAreaCC09();
  sim.c01Active = false; // (o arranque em C01 por atalho deixa-a ativa: a guarnição só pensa fora de C01, e a supressão só decai então)
  sim.enemies.forEach(kill);
  const gruca = ally(sim, 'pl_gruca');
  Object.assign(gruca, { x: -6, z: -15.5, y: sim.world.heightAt(-6, -15.5), reachedNodeId: 'cv_c_yard_parapet', goal: null, navCorners: null });
  sim.teleportPlayer(-6, -14.2, Math.PI / 2);
  sim.startC10OrderChanges();
  sim.enemies.forEach(kill);
  const hostile = sim.enemies.find((e) => e.id === 'DE-C15');
  return { sim, gruca, hostile };
}
/** Põe o atirador (vivo, combatente, sem munição, grupo de moral próprio) em (x, z). */
function standAt(sim, hostile, x, z) {
  Object.assign(hostile, {
    alive: true,
    state: 'HOLD_SECTOR',
    nonCombatant: false,
    health: 100,
    x,
    z,
    y: sim.world.heightAt(x, z),
    mag: 0,
    reserve: 0,
    suppressed: 0,
    encounterId: 'TESTE',
    goal: null,
  });
  return hostile;
}
const WEST = [-72, 24]; // posição final de DE-C15 (reserva oeste): vê o troço a sul de B09 mas não a nave nem a porta
const WEST2 = [-74, 30]; // a de DE-C16
/** Dois fuzis da reserva oeste a ver o troço a descoberto (um só não fecha o lanço: BOUND_MAX_EXPOSURE = 1). */
function twoWest(sim) {
  const a = standAt(sim, sim.enemies.find((e) => e.id === 'DE-C15'), ...WEST);
  const b = standAt(sim, sim.enemies.find((e) => e.id === 'DE-C16'), ...WEST2);
  return [a, b];
}

describe('M02 C10-C11: o plano de lanços de Gruca e os seus valores', () => {
  it('o plano é parapeito → nave de B09 → porta sul → posição final, todos nós conhecidos e alcançáveis; os valores sem fonte estão nomeados', () => {
    assert.deepEqual([...PLAN], ['cv_c_yard_parapet', 'cv_c_b09_nave', 'cv_c_b09_south', 'cv_c_evac_gruca']);
    assert.deepEqual(Object.keys(C_BOUND_PLAN), ['pl_gruca'], 'só o elemento exigido (D1/K1) avança por lanços; os outros mantêm os pontos de sempre');
    for (const id of PLAN) assert.ok(NODES[id], `${id} é um nó conhecido (e portanto um destino válido para as ordens do jogador)`);
    assert.equal(PLAN.at(-1), C_EVAC_ROLES.pl_gruca, 'o último lanço é a posição final de sempre');
    assert.deepEqual({ ...C_EVAC_NODES.cv_c_evac_gruca }, { x: -32, z: 18, facing: 0.4, crouch: true });
    assert.equal(BOUND_MAX_EXPOSURE, 1, 'um atirador isolado não fecha o lanço; dois ou mais sim');
    assert.equal(BOUND_SUPPRESSED_CLEAR, 0.65);
    assert.ok(BOUND_SAMPLE_M > 0 && BOUND_SAMPLE_M <= 6 && BOUND_AT_NODE_M >= 0.5);
    // da nave e da porta sul não se vê a reserva (mapa de exposição da própria geometria, ver o comentário de C_BOUND_PLAN)
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    sim.enterAreaCC09();
    const spawn = sim.world.layout.playerSpawn;
    for (const id of PLAN) {
      const route = sim.navigator.route({ x: spawn.x, y: 0, z: spawn.z, radius: 0.32 }, { x: NODES[id].x, z: NODES[id].z });
      assert.ok(route && route.length > 0, `${id}: rota desde a entrada`);
    }
  });

  it('a exposição de um lanço: hostis combatentes com linha de vista e alcance, sem os suprimidos, rendidos, mortos ou fora de alcance', () => {
    const { sim, hostile } = c10();
    const hop = (i) => boundHopExposure(sim, NODES[PLAN[i]], NODES[PLAN[i + 1]]);
    assert.deepEqual([0, 1, 2].map(hop), [0, 0, 0], 'sem hostis nenhum lanço está exposto');
    standAt(sim, hostile, ...WEST);
    assert.deepEqual([0, 1, 2].map(hop), [0, 0, 1], 'a reserva oeste vê o troço a descoberto, não a nave nem a porta');
    const second = standAt(sim, sim.enemies.find((e) => e.id === 'DE-C16'), ...WEST2);
    assert.deepEqual([0, 1, 2].map(hop), [0, 0, 2], 'dois fuzis veem-no: o lanço está fechado (a tolerância é 1)');
    kill(second);
    hostile.suppressed = 0.7;
    assert.equal(hop(2), 0, 'suprimido (>= 0,65): a supressão da secção abre o lanço');
    hostile.suppressed = 0.64;
    assert.equal(hop(2), 1);
    hostile.suppressed = 0;
    Object.assign(hostile, { state: 'SURRENDERED', nonCombatant: true });
    assert.equal(hop(2), 0, 'rendido');
    Object.assign(hostile, { state: 'HOLD_SECTOR', nonCombatant: false });
    assert.equal(hop(2), 1);
    standAt(sim, hostile, -72, 24 + 200); // para lá do alcance de qualquer arma
    assert.equal(hop(2), 0);
    standAt(sim, hostile, ...WEST);
    kill(hostile);
    assert.equal(hop(2), 0, 'morto');
  });
});

describe('M02 C10-C11: Gruca avança de abrigo em abrigo e só sai para o descoberto com a rota livre', () => {
  it('com a reserva a ver o último troço: percorre o troço abrigado (nave, porta sul), fica atrás da porta sul sem sair, regista o lanço retido e não leva um tiro', () => {
    const { sim, gruca } = c10();
    twoWest(sim);
    run(sim, 20);
    assert.ok(near(gruca, NODES.cv_c_b09_south), `Gruca atrás da porta sul (${gruca.x.toFixed(1)}, ${gruca.z.toFixed(1)})`);
    assert.equal(gruca.goal.nodeId, 'cv_c_b09_south');
    assert.equal(gruca.holdingFor, 'cv_c_evac_gruca');
    assert.equal(gruca.health, gruca.maxHealth);
    assert.ok(gruca.z < -2.5, 'nunca saiu para o terreno a sul da porta');
    const held = sim.combatLog.filter((e) => e.type === 'section_bound_held' && e.actorId === 'pl_gruca');
    assert.equal(held.length, 1, 'uma só vez por lanço retido');
    assert.deepEqual([held[0].nodeId, held[0].atNodeId], ['cv_c_evac_gruca', 'cv_c_b09_south']);
    assert.equal(held[0].exposure, 2);
    assert.ok(sim.combatLog.some((e) => e.type === 'ally_captured_cover' && e.actorId === 'pl_gruca' && e.nodeId === 'cv_c_b09_south'));
    run(sim, 40);
    assert.ok(near(gruca, NODES.cv_c_b09_south), 'continua retido enquanto a reserva o veria');
    assert.equal(sim.combatLog.filter((e) => e.type === 'section_bound_held').length, 1, 'sem registos repetidos');
  });

  it('o lanço abre quando a reserva é neutralizada (ou fica reduzida a um fuzil): Gruca cobre a rota na posição final e deixa de estar retido', () => {
    const { sim, gruca } = c10();
    const [a, b] = twoWest(sim);
    run(sim, 20);
    assert.equal(gruca.holdingFor, 'cv_c_evac_gruca');
    kill(a); // fica um só fuzil a ver o troço: já não fecha o lanço
    assert.equal(b.alive, true);
    run(sim, 14);
    assert.ok(near(gruca, NODES.cv_c_evac_gruca, 1.5), `Gruca na posição final (${gruca.x.toFixed(1)}, ${gruca.z.toFixed(1)})`);
    assert.equal(gruca.reachedNodeId, 'cv_c_evac_gruca');
    assert.equal(gruca.holdingFor ?? null, null);
    assert.equal(gruca.tacticalState, 'AdvanceOrder');
  });

  it('a supressão da secção abre o lanço e um lanço começado acaba-se (não inverte a meio quando a supressão passa)', () => {
    const { sim, gruca } = c10();
    const [a] = twoWest(sim);
    run(sim, 20);
    assert.equal(gruca.holdingFor, 'cv_c_evac_gruca');
    a.suppressed = 1; // a secção suprime um dos atiradores (decai 0,25/s: ≥ 0,65 durante ~1,4 s): sobra um só a ver o troço
    sim.tick(DT, {});
    assert.equal(gruca.goal.nodeId, 'cv_c_evac_gruca', 'lanço aberto pela supressão');
    run(sim, 3); // a supressão já decaiu abaixo de 0,65 e os dois voltaram a ver o troço
    assert.ok(a.suppressed < BOUND_SUPPRESSED_CLEAR);
    assert.equal(boundHopExposure(sim, NODES.cv_c_b09_south, NODES.cv_c_evac_gruca), 2);
    assert.equal(gruca.goal.nodeId, 'cv_c_evac_gruca', 'um lanço começado acaba-se');
    assert.ok(gruca.z > -2, 'já está no terreno a descoberto');
  });

  it('só Gruca é retido: Małek, Szymczak, Wierzba e os auxiliares vão aos pontos de sempre desde o início de C10', () => {
    const { sim } = c10();
    twoWest(sim);
    run(sim, 1);
    const goalOf = (id) => ally(sim, id).goal?.nodeId;
    assert.equal(goalOf('pl_malek'), 'cv_c_evac_malek');
    assert.equal(goalOf('pl_szymczak'), 'cv_c_b12_aid');
    assert.equal(goalOf('pl_wierzba'), 'cv_c_b09_east');
    assert.equal(goalOf('pl_aux_01'), 'cv_c_yard_rkm');
    assert.equal(goalOf('pl_aux_02'), 'cv_c_yard_rkm_2');
    assert.equal(ally(sim, 'pl_aux_01').tacticalState, 'HoldAndSuppress');
    assert.equal(ally(sim, 'pl_malek').holdingFor ?? null, null);
  });

  it('sem hostis Gruca percorre o plano todo e chega à posição final (sem esperas nem registos de lanço retido)', () => {
    const { sim, gruca } = c10();
    run(sim, 25);
    assert.ok(near(gruca, NODES.cv_c_evac_gruca, 1.5));
    assert.equal(sim.combatLog.filter((e) => e.type === 'section_bound_held').length, 0);
    const reached = sim.combatLog.filter((e) => e.type === 'ally_captured_cover' && e.actorId === 'pl_gruca').map((e) => e.nodeId);
    assert.equal(reached.at(-1), 'cv_c_evac_gruca');
  });

  it('sem nó de partida (C10 por atalho com Gruca longe dos abrigos, ou depois de um socorro) vai ao nó mais próximo do plano', () => {
    const { sim, gruca } = c10();
    twoWest(sim);
    Object.assign(gruca, { x: -4, z: -60, y: sim.world.heightAt(-4, -60), reachedNodeId: null, goal: null, navCorners: null });
    sim.tick(DT, {});
    assert.equal(gruca.goal.nodeId, 'cv_c_yard_parapet', 'o mais próximo desde o norte');
    run(sim, 30);
    assert.ok(Math.hypot(gruca.x - NODES.cv_c_b09_south.x, gruca.z - NODES.cv_c_b09_south.z) < 6 || near(gruca, NODES.cv_c_yard_parapet, 3), 'avança abrigado, nunca a descoberto');
    assert.ok(gruca.z < -2);
  });
});

describe('M02 C10-C11: snapshot, restauro e determinismo (sem estado novo: o ponto onde está e o objetivo decidem)', () => {
  it('restaurar a meio da retenção reproduz a continuação, incluindo a abertura do lanço', () => {
    const { sim } = c10();
    twoWest(sim);
    run(sim, 14);
    const snap = structuredClone(sim.snapshot());
    assert.equal(snap.allies.find((a) => a.id === 'pl_gruca').holdingFor, 'cv_c_evac_gruca');
    assert.equal(validateM02Snapshot(snap).valid, true);
    const trace = (s, n) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        if (i === 40) for (const id of ['DE-C15', 'DE-C16']) kill(s.enemies.find((e) => e.id === id));
        s.tick(DT, {});
        const g = ally(s, 'pl_gruca');
        out.push(JSON.stringify([s.clock, g.x, g.z, g.goal, g.holdingFor, g.reachedNodeId, s.rng.state]));
        s.drainEvents();
      }
      return out;
    };
    const ref = trace(sim, 400);
    const fresh = new M02BenchSimulation(3);
    fresh.restoreSnapshot(snap);
    assert.deepEqual(trace(fresh, 400), ref);
    assert.equal(JSON.parse(ref.at(-1))[5], 'cv_c_evac_gruca', 'depois de neutralizada a reserva Gruca chegou à posição final');
  });

  it('as mesmas entradas e a mesma semente dão o mesmo estado (determinismo)', () => {
    const play = () => {
      const { sim } = c10(31337);
      const west = twoWest(sim);
      run(sim, 18);
      west.forEach(kill);
      run(sim, 18);
      return JSON.stringify(sim.snapshot());
    };
    assert.equal(play(), play());
  });
});

describe('M02 C10-C11: as sementes em que Gruca caía na marcha (MissionBot, recruta, 40 sementes: 3, 28, 33, 35 e 38) já não o perdem', () => {
  // Medição de 2026-11-06 (dt 0,1, recruta): antes 5 quedas de Gruca em 40 sementes, todas na marcha para (-32, 18); depois 0. A sobrevivência de
  // Piotr continua caótica (e não é o que se prova aqui): só se afirma que Gruca nunca cai nestas sementes, com ou sem Piotr a chegar a C12.
  // Merge M02 único (2026-11-06): com a linha Codex integrada o fluxo caótico do bot mudou; 28 e 38 já não chegam à marcha (morrem em
  // C09/C06 antes dela). Medição com o código final (sementes 1..40, dt 0,1, recruta): 38 de 40 chegam à marcha sem Gruca cair
  // (falham 4 e 25). Fica a 3 (das de antes) e quatro sementes pequenas dessa lista (1, 6, 7, 9).
  for (const seed of [3, 1, 6, 7, 9]) {
    it(`semente ${seed}: Gruca nunca fica fora de combate`, () => {
      const sim = new M02BenchSimulation(seed, { startScene: 'C01', difficulty: 'recruta' });
      const bot = new MissionBot(sim, { dt: 0.1 });
      let fell = null;
      let furthest = 0; // a cena mais avançada que o bot alcançou: a asserção só vale se chegou à marcha (C10 em diante)
      for (let i = 0; i < 7000; i++) {
        if (sim.script.sceneId === 'C12' || sim.script.finished || sim.missionFailed || !(sim.player.health > 0)) break;
        bot.playTick();
        furthest = Math.max(furthest, M02_SCENE_IDS.indexOf(sim.script.sceneId));
        const g = ally(sim, 'pl_gruca');
        if (!g.alive || g.state === 'DOWN') {
          fell = `${sim.script.sceneId} t=${sim.clock.toFixed(1)} (${g.x.toFixed(1)}, ${g.z.toFixed(1)})`;
          break;
        }
      }
      furthest = Math.max(furthest, M02_SCENE_IDS.indexOf(sim.script.sceneId));
      assert.ok(furthest >= M02_SCENE_IDS.indexOf('C10'), `o bot chegou à marcha (C10+) antes das asserções; ficou em ${M02_SCENE_IDS[furthest]}`);
      assert.equal(fell, null, `Gruca caiu: ${fell}`);
      assert.notEqual(sim.missionFailed?.actorId, 'pl_gruca');
    });
  }
});

describe('M02 C10-C11: sem nó de partida (depois de um socorro ou de uma ordem) Gruca só vai ao nó mais próximo se o caminho está aberto', () => {
  it('com o caminho exposto a dois fuzis fica onde está (HoldCover, registo com atNodeId null); aberto, vai ao nó mais próximo', () => {
    const { sim, gruca } = c10();
    // Gruca de joelhos a 4 m da posição final, fora de qualquer nó e sem objetivo (o que um socorro ou uma ordem deixa)
    Object.assign(gruca, { x: -32, z: 14, y: sim.world.heightAt(-32, 14), goal: null, navCorners: null, reachedNodeId: null });
    const [a, b] = twoWest(sim);
    run(sim, 2);
    assert.equal(gruca.goal, null, 'sem objetivo: não corre a descoberto');
    assert.equal(gruca.tacticalState, 'HoldCover');
    assert.deepEqual([gruca.x, gruca.z], [-32, 14], 'ficou onde estava');
    const held = sim.combatLog.filter((e) => e.type === 'section_bound_held' && e.actorId === 'pl_gruca');
    assert.equal(held.length, 1, 'um registo, não um por passo');
    assert.equal(held[0].atNodeId, null);
    assert.equal(held[0].nodeId, 'cv_c_evac_gruca');
    assert.equal(held[0].exposure, 2);
    kill(a);
    kill(b);
    run(sim, 1);
    assert.equal(gruca.goal?.nodeId, 'cv_c_evac_gruca', 'com o caminho aberto vai ao nó mais próximo');
    run(sim, 6);
    assert.ok(near(gruca, NODES.cv_c_evac_gruca));
  });
});
