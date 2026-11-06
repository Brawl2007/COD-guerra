// M02 D1 (PDF p. 16): «Ferimento incapacitante de Gruca/Lis/Szymczak fora da sequência admite socorro quando seguro; se o estado canónico se
// tornar impossível, apresentar falha clara e restaurar o checkpoint. Esta convenção deve ser visível, não imunidade oculta.» + C11 (p. 14,
// «o socorrista procura abrigo e só atravessa com oportunidade real») + D6/C7 (sem cura total). Aqui: a janela de socorro de um aliado derrubado
// a tiro, o local seguro (nenhum hostil com linha de vista num raio), o socorro por Piotr ([E]) ou por um aliado, o valor limitado, a falha de
// Gruca só SEM socorro possível num prazo, os checkpoints (nunca com Gruca fora de combate) e o snapshot/validador. Testes de estado
// (rajadas e entradas reais), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import cellsBC from '../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };
import { M02BenchSimulation, validateM02Snapshot, describeMissionFailure } from '../src/game/m02-01-simulation.js';
import { createMemoryStorage } from '../src/game/m02-save-store.js';
import {
  RESCUE_ELIGIBLE,
  RESCUE_NAMES,
  RESCUE_SAFE_RADIUS_M,
  RESCUE_REACH_M,
  RESCUE_LIFT_SEC,
  RESCUE_WINDOW_SEC,
  RESCUE_HEALTH,
  RESCUE_MAX_PER_CHARACTER,
  rescueSpotIsSafe,
} from '../src/game/m02-combat-ai.js';
import { requiredCharacterOut } from '../src/game/m02-acts-director.js';

const SEED = 19390909;
const DT = 0.05;
const EVAC = cellsBC.cells.C.evacRoute.at(-1);
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
const run = (sim, seconds, controls = {}) => {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) sim.tick(DT, controls);
};
const place = (sim, actor, x, z) => Object.assign(actor, { x, z, y: sim.world.heightAt(x, z), goal: null, navCorners: null });
const ofType = (sim, type) => sim.combatLog.filter((e) => e.type === type);

/**
 * Campo aberto da quinta (terreno raso a este, com linha de vista até muito longe), sem combate: a secção desarmada (só conta o socorro) e
 * os hostis fora de jogo menos um «atirador» (Kar98k) que o teste coloca. Piotr fica longe, a oeste.
 */
function field(seed = SEED) {
  const sim = new M02BenchSimulation(seed);
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
  const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
  for (const e of sim.enemies) if (e !== shooter) kill(e);
  // grupo de moral próprio: com 9 de 10 da quinta fora de jogo a guarnição renderia o atirador no primeiro tick (D3) e o local ficaria seguro
  shooter.encounterId = 'TESTE';
  place(sim, shooter, 30, -40);
  sim.teleportPlayer(-40, -60, 0);
  return { sim, shooter };
}

/** Rajadas reais do atirador, a 4 m, até o aliado cair (a via do jogo: fireActorBurst); depois o atirador fica sem munição a `farM` m. */
function fall(sim, shooter, id, { x = 30, z = -60, farM = null } = {}) {
  const a = ally(sim, id);
  place(sim, a, x, z);
  Object.assign(a, { crouched: false });
  place(sim, shooter, x + 4, z);
  Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, mag: 5, reserve: 40 });
  for (let i = 0; i < 100 && a.alive; i++) {
    shooter.mag = 5;
    sim.fireActorBurst(shooter, a, { x: a.x, y: a.y + 1.25, z: a.z }, 'enemy');
  }
  assert.equal(a.alive, false, `${id} caiu`);
  assert.equal(a.state, 'DOWN');
  if (farM !== null) {
    place(sim, shooter, x + farM, z);
    Object.assign(shooter, { mag: 0, reserve: 0 }); // vê o caído mas não dispara: isola o socorro do resto do combate
  }
  return a;
}
const silence = (shooter) => kill(shooter);

describe('M02 D1 socorro: regras e valores documentados', () => {
  it('quem pode ser socorrido, o raio, o alcance, os tempos e o valor limitado (sem fonte no PDF, nomeados)', () => {
    assert.deepEqual([...RESCUE_ELIGIBLE], ['pl_gruca', 'pl_lis', 'pl_szymczak'], 'D1 p. 16: só Gruca, Lis e Szymczak admitem socorro; Małek e Wierzba, consequência persistente');
    assert.equal(RESCUE_ELIGIBLE.includes('pl_wierzba') || RESCUE_ELIGIBLE.includes('pl_malek'), false);
    assert.equal(RESCUE_ELIGIBLE.includes('pl_aux_01') || RESCUE_ELIGIBLE.includes('pl_aux_02'), false, 'os auxiliares podem morrer sem reiniciar (D1)');
    for (const id of RESCUE_ELIGIBLE) assert.ok(RESCUE_NAMES[id], id);
    assert.equal(RESCUE_SAFE_RADIUS_M, 120, 'o limite do combate principal de D1 (p. 16: 15-120 m)');
    assert.ok(RESCUE_REACH_M > 1 && RESCUE_REACH_M < 4);
    assert.ok(RESCUE_LIFT_SEC >= 2 && RESCUE_LIFT_SEC < RESCUE_WINDOW_SEC);
    assert.ok(RESCUE_HEALTH > 0 && RESCUE_HEALTH <= 30, 'sem cura total (D6/C7)');
    assert.equal(RESCUE_MAX_PER_CHARACTER, 1, 'sem imunidade oculta: um socorro por pessoa');
  });
});

describe('M02 D1 socorro: a queda a tiro abre uma janela visível', () => {
  it('Gruca, Lis e Szymczak abrem a janela (prazo, sem socorrista, estado anterior); Wierzba, Małek (consequência persistente) e os auxiliares não', () => {
    for (const id of RESCUE_ELIGIBLE) {
      const { sim, shooter } = field();
      sim.tick(DT, {});
      const clock = sim.clock;
      const a = fall(sim, shooter, id);
      assert.ok(a.rescue, `${id}: janela`);
      assert.deepEqual(Object.keys(a.rescue).sort(), ['by', 'deadlineAt', 'downedAt', 'liftStartedAt', 'prevState']);
      assert.ok(a.rescue.downedAt <= sim.clock && a.rescue.downedAt >= clock - 1e-9);
      assert.ok(Math.abs(a.rescue.deadlineAt - a.rescue.downedAt - RESCUE_WINDOW_SEC) < 1e-6);
      assert.equal(a.rescue.by, null);
      assert.equal(a.rescue.liftStartedAt, null);
      assert.equal(a.rescue.prevState, 'ACTIVE');
      assert.equal(ofType(sim, 'rescue_window_opened').filter((e) => e.actorId === id).length, 1);
      assert.equal(sim.drainEvents().filter((e) => e.type === 'rescue-window-opened' && e.actorId === id).length, 1);
      assert.deepEqual(sim.rescueStatus().map((r) => r.actorId), [id]);
    }
    for (const id of ['pl_wierzba', 'pl_malek', 'pl_aux_01', 'pl_aux_02']) {
      const { sim, shooter } = field();
      const a = fall(sim, shooter, id);
      assert.equal(a.rescue ?? null, null, `${id}: sem janela`);
      assert.equal(sim.rescueStatus().length, 0);
    }
  });

  it('quem morre por explosão (DEAD) não tem socorro; o inimigo derrubado pela secção também não; a segunda queda depois de um socorro é definitiva', () => {
    const { sim } = field();
    const gruca = ally(sim, 'pl_gruca');
    place(sim, gruca, 30, -60);
    sim.detonateGrenadeAt(30.5, gruca.y, -60, 6.5);
    assert.equal(gruca.state, 'DEAD');
    assert.equal(gruca.rescue ?? null, null);
    assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated', 'DEAD é definitivo: falha logo');
    const second = field();
    const lis = ally(second.sim, 'pl_lis');
    lis.rescuedCount = 1; // já foi socorrido uma vez
    fall(second.sim, second.shooter, 'pl_lis');
    assert.equal(lis.rescue ?? null, null, 'sem direito a um segundo socorro');
  });
});

describe('M02 D1 socorro: o local seguro (nenhum hostil com linha de vista num raio)', () => {
  it('um hostil com linha de vista até 120 m torna o local inseguro; para lá do raio, atrás de sólidos, rendido ou morto, não conta', () => {
    const { sim, shooter } = field();
    const point = { x: 30, z: -60, y: sim.world.heightAt(30, -60) };
    for (const d of [10, 60, 100, 119]) {
      place(sim, shooter, 30 + d, -60);
      assert.equal(rescueSpotIsSafe(sim, point), false, `hostil a ${d} m com linha de vista`);
    }
    place(sim, shooter, 30 + 125, -60);
    assert.equal(rescueSpotIsSafe(sim, point), true, 'para lá de 120 m (o raio documentado)');
    place(sim, shooter, 30 + 60, -60);
    Object.assign(shooter, { state: 'SURRENDERED', nonCombatant: true });
    assert.equal(rescueSpotIsSafe(sim, point), true, 'rendido: já não combate');
    Object.assign(shooter, { state: 'HOLD_SECTOR', nonCombatant: false });
    assert.equal(rescueSpotIsSafe(sim, point), false);
    kill(shooter);
    assert.equal(rescueSpotIsSafe(sim, point), true, 'morto');
    // a MG34 só alcança 98 m: a 110 m não conta (o raio é o menor entre o da arma e RESCUE_SAFE_RADIUS_M)
    const mg = sim.enemies.find((e) => e.weapon === 'mg34');
    Object.assign(mg, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100 });
    place(sim, mg, 30 + 110, -60);
    assert.equal(rescueSpotIsSafe(sim, point), true, 'MG34 a 110 m: fora do alcance da arma');
    place(sim, mg, 30 + 90, -60);
    assert.equal(rescueSpotIsSafe(sim, point), false, 'MG34 a 90 m');
  });

  it('uma parede entre o hostil e o caído torna o local seguro (a mesma visão com que os hostis escolhem alvo)', () => {
    const { sim, shooter } = field();
    // o celeiro B02 (≈ 8-18 x, -42..-28 z): o hostil a leste do celeiro, o caído a oeste, a mesma linha
    const wall = sim.world.layout.buildings.find((b) => b.id === 'B02');
    const [x0, x1, z0, z1] = wall.bounds;
    const zMid = (z0 + z1) / 2;
    const west = { x: x0 - 6, z: zMid, y: sim.world.heightAt(x0 - 6, zMid) };
    place(sim, shooter, x1 + 6, zMid);
    assert.equal(sim.world.lineOfSight(shooter, { ...west, space: 'metres', crouched: true, eyeHeight: 1.08 }), false, 'pré-condição: o celeiro tapa');
    assert.equal(rescueSpotIsSafe(sim, west), true);
    place(sim, shooter, x0 - 40, zMid);
    assert.equal(rescueSpotIsSafe(sim, west), false, 'do mesmo lado, à vista');
  });
});

describe('M02 D1 socorro: por Piotr ([E]) quando seguro', () => {
  it('o aviso diz «à vista de um hostil» enquanto não é seguro e o [E] não faz nada; seguro, [E] levanta-o em RESCUE_LIFT_SEC com 25 de vida e de joelhos, sem cura total', () => {
    const { sim, shooter } = field();
    const gruca = fall(sim, shooter, 'pl_gruca', { farM: 60 });
    sim.teleportPlayer(gruca.x - 1.5, gruca.z, 0);
    const prompt = sim.currentRescuePrompt();
    assert.equal(prompt.actorId, 'pl_gruca');
    assert.equal(prompt.safe, false);
    assert.match(prompt.prompt, /Socorro adiado: Sgt\. Gruca está à vista de um hostil/);
    assert.equal(sim.interactDoor(), null, 'o [E] não faz nada com um hostil a ver');
    assert.equal(gruca.rescue.by, null);
    silence(shooter);
    const safe = sim.currentRescuePrompt();
    assert.equal(safe.safe, true);
    assert.match(safe.prompt, /^\[E\] Socorrer Sgt\. Gruca/);
    sim.drainEvents();
    const evt = sim.interactDoor();
    assert.equal(evt.type, 'rescue-started');
    assert.equal(evt.byId, 'piotr_sokol');
    assert.equal(gruca.rescue.by, 'piotr_sokol');
    assert.equal(gruca.alive, false, 'ainda não: levantar leva tempo');
    assert.equal(sim.currentRescuePrompt().lifting, true);
    run(sim, RESCUE_LIFT_SEC - 0.5);
    assert.equal(gruca.alive, false);
    run(sim, 0.7);
    assert.equal(gruca.alive, true);
    assert.equal(gruca.state, 'ACTIVE');
    assert.equal(gruca.health, RESCUE_HEALTH);
    assert.ok(gruca.health < gruca.maxHealth / 2, 'sem cura total');
    assert.equal(gruca.rescuedCount, 1);
    assert.equal(gruca.rescue, null);
    assert.equal(gruca.crouched, true);
    const rescued = ofType(sim, 'ally_rescued');
    assert.equal(rescued.length, 1);
    assert.deepEqual([rescued[0].actorId, rescued[0].byId, rescued[0].health], ['pl_gruca', 'piotr_sokol', RESCUE_HEALTH]);
    assert.ok(sim.drainEvents().some((e) => e.type === 'ally-rescued' && e.actorId === 'pl_gruca'));
    assert.equal(sim.missionFailed, null);
    assert.equal(requiredCharacterOut(sim), null);
    assert.equal(sim.currentRescuePrompt(), null, 'já não há ninguém por socorrer');
  });

  it('pelo controlo do tick (a tecla E da bancada): `interact` socorre ao lado do caído e é o jogador, não o sanitário, quem levanta', () => {
    const { sim, shooter } = field();
    const gruca = fall(sim, shooter, 'pl_gruca');
    silence(shooter);
    place(sim, ally(sim, 'pl_szymczak'), gruca.x, gruca.z + 30); // o sanitário vive mas está longe: Piotr é quem chega primeiro
    sim.teleportPlayer(gruca.x - 1.5, gruca.z, 0);
    sim.tick(DT, { interact: true });
    assert.equal(gruca.rescue.by, 'piotr_sokol');
    assert.notEqual(gruca.rescue.liftStartedAt, null);
    run(sim, RESCUE_LIFT_SEC + 0.3);
    assert.equal(gruca.alive, true);
    assert.equal(ofType(sim, 'ally_rescued')[0].byId, 'piotr_sokol');
  });

  it('só ao alcance: a mais de RESCUE_REACH_M não há aviso nem efeito; se Piotr se afasta a meio, o socorro interrompe-se (rescuer_far) e recomeça do zero', () => {
    const { sim, shooter } = field();
    const gruca = fall(sim, shooter, 'pl_gruca');
    silence(shooter);
    // sem socorrista aliado (para isolar Piotr): sanitário e restantes caídos ou ausentes
    for (const id of ['pl_szymczak', 'pl_wierzba', 'pl_malek', 'pl_lis']) Object.assign(ally(sim, id), { alive: false, state: 'DOWN', health: 0, rescue: null });
    sim.teleportPlayer(gruca.x - (RESCUE_REACH_M + 1), gruca.z, 0);
    assert.equal(sim.currentRescuePrompt(), null);
    assert.equal(sim.interactDoor(), null);
    sim.teleportPlayer(gruca.x - 1.5, gruca.z, 0);
    assert.ok(sim.interactDoor());
    run(sim, 2);
    sim.drainEvents();
    sim.teleportPlayer(gruca.x - 12, gruca.z, 0);
    sim.tick(DT, {});
    assert.equal(gruca.rescue.by, null);
    assert.equal(gruca.rescue.liftStartedAt, null);
    assert.equal(gruca.alive, false);
    assert.deepEqual(ofType(sim, 'rescue_aborted').map((e) => [e.byId, e.reason]), [['piotr_sokol', 'rescuer_far']]);
    // volta e recomeça: a contagem é de novo RESCUE_LIFT_SEC
    sim.teleportPlayer(gruca.x - 1.5, gruca.z, 0);
    assert.ok(sim.interactDoor());
    run(sim, RESCUE_LIFT_SEC - 1);
    assert.equal(gruca.alive, false);
    run(sim, 1.2);
    assert.equal(gruca.alive, true);
  });

  it('um hostil que passa a ver o caído a meio interrompe o socorro (unsafe); quando deixa de ver, Piotr pode recomeçar', () => {
    const { sim, shooter } = field();
    const gruca = fall(sim, shooter, 'pl_gruca');
    silence(shooter);
    for (const id of ['pl_szymczak', 'pl_wierzba', 'pl_malek', 'pl_lis']) Object.assign(ally(sim, id), { alive: false, state: 'DOWN', health: 0, rescue: null });
    sim.teleportPlayer(gruca.x - 1.5, gruca.z, 0);
    assert.ok(sim.interactDoor());
    run(sim, 2);
    // reaparece um hostil com linha de vista, sem munição (para não ferir ninguém)
    Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, mag: 0, reserve: 0 });
    place(sim, shooter, gruca.x + 70, gruca.z);
    sim.tick(DT, {});
    assert.equal(gruca.rescue.by, null);
    assert.deepEqual(ofType(sim, 'rescue_aborted').map((e) => e.reason), ['unsafe']);
    run(sim, 6);
    assert.equal(gruca.alive, false, 'continua caído enquanto o hostil o vê');
    assert.equal(sim.interactDoor(), null);
    silence(shooter);
    assert.ok(sim.interactDoor());
    run(sim, RESCUE_LIFT_SEC + 0.3);
    assert.equal(gruca.alive, true);
  });
});

describe('M02 D1 socorro: por um aliado, só quando o local está seguro', () => {
  it('o sanitário só vai depois de o local estar seguro, atravessa, levanta durante RESCUE_LIFT_SEC e o caído volta ao plano com pouca vida', () => {
    const { sim, shooter } = field();
    const gruca = fall(sim, shooter, 'pl_gruca', { farM: 60 });
    const szymczak = ally(sim, 'pl_szymczak');
    place(sim, szymczak, gruca.x, gruca.z + 14);
    const start = { x: szymczak.x, z: szymczak.z };
    run(sim, 8);
    assert.equal(gruca.rescue.by, null, 'com um hostil a ver o caído ninguém atravessa («só atravessa com oportunidade real»)');
    assert.equal(ofType(sim, 'rescue_started').length, 0);
    assert.equal(sim.missionFailed, null, 'o prazo ainda corre');
    silence(shooter);
    sim.drainEvents();
    sim.tick(DT, {});
    assert.equal(gruca.rescue.by, 'pl_szymczak');
    assert.equal(gruca.rescue.liftStartedAt, null, 'a caminho');
    assert.equal(szymczak.tacticalState, 'SupportMedic');
    assert.ok(Math.hypot(szymczak.x - gruca.x, szymczak.z - gruca.z) > 5);
    let guard = 0;
    while (gruca.rescue?.liftStartedAt == null && gruca.alive === false && guard++ < 400) sim.tick(DT, {});
    assert.ok(gruca.rescue.liftStartedAt != null, 'chegou e começou a levantar');
    const arrived = sim.clock;
    assert.ok(Math.hypot(szymczak.x - gruca.x, szymczak.z - gruca.z) <= 1.7);
    assert.ok(arrived - 8 < 12, 'a 14 m, a andar, chega em poucos segundos');
    run(sim, RESCUE_LIFT_SEC + 0.3);
    assert.equal(gruca.alive, true);
    assert.equal(gruca.health, RESCUE_HEALTH);
    assert.equal(gruca.rescue, null);
    assert.ok(gruca.goal === null || typeof gruca.goal.nodeId === 'string', 'volta ao plano');
    assert.deepEqual(ofType(sim, 'ally_rescued').map((e) => [e.actorId, e.byId]), [['pl_gruca', 'pl_szymczak']]);
    assert.ok(Math.hypot(start.x - gruca.x, start.z - gruca.z) > 5);
    // (que levantar ocupa as mãos — não dispara nem se desloca — prova-se no teste seguinte, COM munição e um alvo à vista: aqui a secção está desarmada)
  });

  it('levantar ocupa as mãos: o sanitário COM munição e um hostil à vista (fora do raio de segurança) não dispara nem sai de ao pé do caído enquanto levanta; depois do levantar dispara', () => {
    const { sim, shooter } = field();
    const gruca = fall(sim, shooter, 'pl_gruca');
    silence(shooter);
    const szymczak = ally(sim, 'pl_szymczak');
    Object.assign(szymczak, { mag: 5, reserve: 30, nextFireAt: 0, reloadingUntil: 0 });
    place(sim, szymczak, gruca.x, gruca.z + 1);
    // um hostil a 150 m (> RESCUE_SAFE_RADIUS_M: o local do caído segue «seguro»), ao alcance da wz. 29 do sanitário (185 m) e com linha de vista
    Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, mag: 0, reserve: 0 });
    place(sim, shooter, gruca.x + 150, gruca.z);
    assert.equal(rescueSpotIsSafe(sim, gruca), true);
    assert.equal(sim.world.lineOfSight(szymczak, shooter, { includeFoliage: true }), true, 'o hostil é um alvo válido para o sanitário');
    const tick = () => {
      szymczak.suppressed = 0.6; // o sanitário só dispara em autodefesa (suprimido)
      sim.tick(DT, {});
    };
    let guard = 0;
    while (gruca.rescue?.liftStartedAt == null && guard++ < 400) tick();
    assert.ok(gruca.rescue.liftStartedAt != null, 'começou a levantar');
    const at = { mag: szymczak.mag, shots: szymczak.shotsFired ?? 0 };
    while (gruca.alive === false && guard++ < 800) {
      tick();
      if (gruca.alive === false) {
        assert.equal(szymczak.shotsFired ?? 0, at.shots, 'não disparou a levantar');
        assert.equal(szymczak.mag, at.mag);
        assert.ok(Math.hypot(szymczak.x - gruca.x, szymczak.z - gruca.z) <= RESCUE_REACH_M, 'fica ao lado do caído (não sai a combater)');
      }
    }
    assert.equal(gruca.alive, true);
    // depois do levantar, o mesmo sanitário (suprimido, com o hostil à vista) já dispara: o hostil era mesmo um alvo
    for (let i = 0; i < 120 && (szymczak.shotsFired ?? 0) === at.shots; i++) tick();
    assert.ok((szymczak.shotsFired ?? 0) > at.shots, 'livre das mãos, dispara');
  });

  it('se o local deixa de ser seguro a caminho, o socorrista desiste e volta ao plano; quando volta a ser seguro, é de novo escolhido', () => {
    const { sim, shooter } = field();
    const gruca = fall(sim, shooter, 'pl_gruca');
    silence(shooter);
    const szymczak = ally(sim, 'pl_szymczak');
    place(sim, szymczak, gruca.x, gruca.z + 40);
    sim.tick(DT, {});
    assert.equal(gruca.rescue.by, 'pl_szymczak');
    run(sim, 1);
    Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, mag: 0, reserve: 0 });
    place(sim, shooter, gruca.x + 80, gruca.z);
    sim.tick(DT, {});
    assert.equal(gruca.rescue.by, null);
    assert.deepEqual(ofType(sim, 'rescue_aborted').map((e) => [e.byId, e.reason]), [['pl_szymczak', 'unsafe']]);
    sim.tick(DT, {});
    assert.ok(Math.hypot(szymczak.goal.x - gruca.x, szymczak.goal.z - gruca.z) > 3, 'deixou o socorro: o objetivo já não é o caído, o plano volta a mandar nele');
    silence(shooter);
    sim.tick(DT, {});
    assert.equal(gruca.rescue.by, 'pl_szymczak');
  });

  it('sem o sanitário (caído) o aliado mais próximo da equipa de assalto socorre; os auxiliares do rkm nunca; Piotr pode tomar a vez ao aliado', () => {
    const { sim, shooter } = field();
    const gruca = fall(sim, shooter, 'pl_gruca');
    silence(shooter);
    Object.assign(ally(sim, 'pl_szymczak'), { alive: false, state: 'DOWN', health: 0, rescue: null });
    place(sim, ally(sim, 'pl_wierzba'), gruca.x + 30, gruca.z);
    place(sim, ally(sim, 'pl_malek'), gruca.x - 10, gruca.z);
    place(sim, ally(sim, 'pl_lis'), gruca.x - 20, gruca.z);
    place(sim, ally(sim, 'pl_aux_01'), gruca.x + 1, gruca.z);
    sim.tick(DT, {});
    assert.equal(gruca.rescue.by, 'pl_malek', 'o mais próximo de Wierzba, Małek e Lis; o auxiliar a 1 m não conta');
    sim.teleportPlayer(gruca.x + 1.5, gruca.z + 1, 0);
    const evt = sim.interactDoor();
    assert.equal(evt.tookOverFrom, 'pl_malek');
    assert.equal(gruca.rescue.by, 'piotr_sokol');
    sim.tick(DT, {});
    const malek = ally(sim, 'pl_malek');
    assert.ok(!malek.goal?.rescue, 'Małek larga o socorro quando Piotr toma a vez (sem objetivo de socorro velho)');
    run(sim, RESCUE_LIFT_SEC + 0.3);
    assert.equal(gruca.alive, true);
    assert.equal(ofType(sim, 'ally_rescued')[0].byId, 'piotr_sokol');
  });

  it('o caído pode ser Szymczak ou Lis (cada um levanta-se uma só vez); Wierzba e Małek ficam caídos (consequência persistente, D1 p. 16): [E] e os aliados não os levantam', () => {
    for (const id of ['pl_wierzba', 'pl_malek']) {
      const { sim, shooter } = field();
      const a = fall(sim, shooter, id);
      silence(shooter);
      sim.teleportPlayer(a.x - 1.5, a.z, 0);
      assert.equal(sim.currentRescuePrompt(), null, `${id}: sem aviso de socorro`);
      assert.equal(sim.interactDoor(), null, id);
      run(sim, RESCUE_LIFT_SEC + RESCUE_WINDOW_SEC);
      assert.equal(a.alive, false, id);
      assert.equal(a.state, 'DOWN');
      assert.equal(ofType(sim, 'ally_rescued').length, 0);
      assert.equal(sim.missionFailed, null, 'não são personagens exigidas');
    }
    for (const id of ['pl_szymczak', 'pl_lis']) {
      const { sim, shooter } = field();
      const a = fall(sim, shooter, id);
      silence(shooter);
      sim.teleportPlayer(a.x - 1.5, a.z, 0);
      assert.ok(sim.interactDoor(), id);
      run(sim, RESCUE_LIFT_SEC + 0.3);
      assert.equal(a.alive, true, id);
      assert.equal(a.health, RESCUE_HEALTH);
      // a segunda queda é definitiva
      fall(sim, shooter, id);
      assert.equal(a.rescue ?? null, null, `${id}: sem segunda janela`);
      assert.equal(a.rescuedCount, 1);
      assert.equal(sim.rescueStatus().length, 0);
    }
  });
});

describe('M02 D1 socorro: a falha de Gruca só chega sem socorro possível num prazo', () => {
  it('Gruca caído com um hostil a vê-lo: durante o prazo não há falha, o roteiro espera e nada se grava; no fim do prazo falha com o actorId e o texto diz sem socorro possível', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
    const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
    for (const e of sim.enemies) if (e !== shooter) kill(e);
    shooter.encounterId = 'TESTE';
    place(sim, shooter, 30, -40);
    sim.teleportPlayer(-40, -60, 0); // z >= -85: sem Gruca caído, C02 passaria a C03 no primeiro tick
    fall(sim, shooter, 'pl_gruca', { farM: 70 });
    const sceneAtFall = sim.script.sceneId;
    const reachedAtFall = [...sim.checkpointsReached];
    sim.drainEvents();
    run(sim, RESCUE_WINDOW_SEC - 1);
    assert.equal(sim.missionFailed, null, 'ainda há prazo');
    assert.equal(requiredCharacterOut(sim), 'pl_gruca', 'está fora de combate');
    assert.equal(requiredCharacterOut(sim, { unlessRescuable: true }), null, 'mas com socorro ainda possível: não é falha');
    assert.equal(sim.script.sceneId, sceneAtFall, 'o roteiro espera pelo socorro');
    assert.deepEqual(sim.checkpointsReached, reachedAtFall, 'nenhum checkpoint com Gruca fora de combate');
    const events = sim.drainEvents();
    assert.equal(events.filter((e) => e.type === 'checkpoint-saved' || e.type === 'checkpoint-rejected').length, 0, 'adiado em silêncio, sem ruído');
    assert.equal(sim.rescueStatus()[0].required, true);
    assert.ok(sim.rescueStatus()[0].remainingSec <= 1.5);
    run(sim, 2);
    assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated');
    assert.equal(sim.missionFailed.actorId, 'pl_gruca');
    const opened = sim.combatLog.find((e) => e.type === 'rescue_window_opened');
    assert.ok(Math.abs(sim.missionFailed.at - opened.deadlineAt) < 0.2, `falha no instante em que o prazo acaba (${sim.missionFailed.at} vs ${opened.deadlineAt})`);
    assert.equal(ofType(sim, 'rescue_window_expired').length, 1);
    assert.match(describeMissionFailure(sim.missionFailed), /^Sgt\. Gruca incapacitado\. Sem socorro possível/);
    assert.equal(sim.saveCheckpoint('cp_m02_manual'), null);
  });

  it('socorrido a tempo não há falha: o roteiro retoma, Gruca segue com pouca vida; cair outra vez é definitivo e falha logo', () => {
    const { sim, shooter } = field();
    sim.tick(DT, {});
    const gruca = fall(sim, shooter, 'pl_gruca', { farM: 60 });
    const sceneAtFall = sim.script.sceneId;
    run(sim, 20);
    assert.equal(sim.script.sceneId, sceneAtFall);
    silence(shooter);
    sim.teleportPlayer(gruca.x - 1.5, gruca.z, 0);
    assert.ok(sim.interactDoor());
    run(sim, RESCUE_LIFT_SEC + 1);
    assert.equal(gruca.alive, true);
    assert.equal(sim.missionFailed, null);
    run(sim, 5);
    assert.notEqual(sim.script.sceneId, sceneAtFall, 'o roteiro retomou (C02 → C03 com Piotr à frente do limite)');
    // outra vez a tiro: sem janela, falha logo
    Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, mag: 5, reserve: 40 });
    place(sim, shooter, gruca.x + 4, gruca.z);
    for (let i = 0; i < 100 && gruca.alive; i++) {
      shooter.mag = 5;
      sim.fireActorBurst(shooter, gruca, { x: gruca.x, y: gruca.y + 1.25, z: gruca.z }, 'enemy');
    }
    assert.equal(gruca.alive, false);
    assert.equal(gruca.rescue ?? null, null);
    sim.tick(DT, {});
    assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated');
    assert.equal(sim.missionFailed.actorId, 'pl_gruca');
  });

  it('a morte de Piotr durante a janela tem precedência (piotr_killed, sem actorId)', () => {
    const { sim, shooter } = field();
    fall(sim, shooter, 'pl_gruca', { farM: 60 });
    sim.player.health = 0;
    sim.player.alive = false;
    sim.tick(DT, {});
    assert.equal(sim.missionFailed?.reason, 'piotr_killed');
    assert.deepEqual(Object.keys(sim.missionFailed).sort(), ['at', 'reason']);
  });

  it('o F5 com Gruca caído é recusado (nunca um ponto de reinício com ele fora de combate); depois do socorro grava-se, e o ponto gravado tem-no de pé', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
    const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
    for (const e of sim.enemies) if (e !== shooter) kill(e);
    shooter.encounterId = 'TESTE';
    place(sim, shooter, 30, -40);
    sim.teleportPlayer(-40, -60, 0);
    const gruca = fall(sim, shooter, 'pl_gruca', { farM: 60 });
    sim.drainEvents();
    assert.equal(sim.saveCheckpoint('cp_m02_manual'), null);
    assert.equal(sim.checkpointsReached.includes('cp_m02_manual'), false);
    assert.ok(sim.drainEvents().some((e) => e.type === 'checkpoint-rejected'));
    assert.equal(sim.missionFailed, null, 'recusar o ponto de reinício não é falhar');
    silence(shooter);
    sim.teleportPlayer(gruca.x - 1.5, gruca.z, 0);
    assert.ok(sim.interactDoor());
    run(sim, RESCUE_LIFT_SEC + 0.5);
    assert.equal(gruca.alive, true);
    const saved = sim.saveCheckpoint('cp_m02_manual');
    assert.ok(saved, 'de pé, o F5 volta a gravar');
    assert.equal(saved.allies.find((a) => a.id === 'pl_gruca').alive, true);
    assert.equal(saved.allies.find((a) => a.id === 'pl_gruca').health, RESCUE_HEALTH);
    assert.equal(saved.allies.find((a) => a.id === 'pl_gruca').rescuedCount, 1);
  });
});

describe('M02 D1 socorro: Lis em C11 (retoma o percurso) e a exportação para a M03', () => {
  /** C11 sem combate; Lis amparado ao lado de Piotr, caído a tiro real e depois socorrido. */
  function c11Supported() {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
    sim.enterAreaCC09();
    sim.startC10OrderChanges();
    for (const e of sim.enemies) kill(e);
    sim.detonateC10FixedArtillery();
    const lis = ally(sim, 'pl_lis');
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0);
    sim.tick(DT, { interact: true }); // [E] junto a Lis: o contacto é deliberado (merge M02 único, Codex e4a46327)
    assert.equal(sim.areaC.lisPhase, 'supported');
    return { sim, lis };
  }
  const shootLis = (sim, lis) => {
    sim.teleportPlayer(lis.x - 40, lis.z, 0); // fora da linha de tiro (as rajadas acertam em quem estiver pelo caminho)
    const shooter = sim.enemies[0];
    Object.assign(shooter, { alive: true, nonCombatant: false, state: 'HOLD_SECTOR', health: 100, weapon: 'kar98k', mag: 5, reserve: 40, x: lis.x + 4, z: lis.z, y: sim.world.heightAt(lis.x + 4, lis.z) });
    for (let i = 0; i < 100 && lis.alive; i++) {
      shooter.mag = 5;
      sim.fireActorBurst(shooter, lis, { x: lis.x, y: lis.y + 1.25, z: lis.z }, 'enemy');
    }
    kill(shooter);
  };

  it('Lis cai amparado, é socorrido por Piotr e retoma o percurso até ao abrigo: wounded_* (não missing), exportação coerente', () => {
    const { sim, lis } = c11Supported();
    const modeBefore = sim.areaC.lisSupportMode;
    const stateBefore = lis.state;
    assert.ok(['WALKING_SUPPORTED', 'CARRIED'].includes(stateBefore));
    shootLis(sim, lis);
    assert.equal(lis.state, 'DOWN');
    assert.equal(lis.rescue.prevState, stateBefore);
    assert.equal(sim.missionFailed, null, 'Lis não é uma personagem exigida');
    sim.teleportPlayer(lis.x + 1.5, lis.z, 0);
    assert.ok(sim.interactDoor());
    run(sim, RESCUE_LIFT_SEC + 0.5);
    assert.equal(lis.alive, true);
    assert.equal(lis.state, stateBefore, 'volta ao estado de amparo que tinha');
    assert.equal(sim.areaC.lisPhase, 'supported');
    assert.equal(sim.areaC.lisSupportMode, modeBefore);
    // acompanha Piotr até ao abrigo: o percurso de C11 retoma
    const idxBefore = sim.areaC.lisRouteIdx;
    let guard = 0;
    while (sim.areaC.lisPhase !== 'sheltered' && guard++ < 6000) {
      const route = cellsBC.cells.C.evacRoute;
      const next = route[Math.min(route.length - 1, Math.max(sim.areaC.lisRouteIdx, 0))];
      sim.teleportPlayer(lis.x + (next[0] > lis.x ? 1.5 : -1.5), lis.z + (next[1] > lis.z ? 1.5 : -1.5), 0);
      sim.tick(DT, {});
    }
    assert.ok(sim.areaC.lisRouteIdx > idxBefore, 'o percurso avançou depois do socorro');
    assert.equal(sim.areaC.lisPhase, 'sheltered');
    assert.ok(['wounded_evacuated', 'wounded_walking'].includes(sim.flags['m02.lis_status']));
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.completed, true);
    assert.equal(pkg.m03ImportState.lisEntry.status, sim.flags['m02.lis_status']);
    assert.equal(pkg.m03ImportState.lisEntry.presentInShelter, true);
    assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
  });

  it('Lis cai e ninguém o socorre no prazo: a janela fecha, continua caído, a missão segue (não é falha) e o desfecho é missing', () => {
    const { sim, lis } = c11Supported();
    shootLis(sim, lis);
    assert.ok(lis.rescue);
    sim.teleportPlayer(EVAC[0], EVAC[1], 0); // Piotr afasta-se
    for (const a of sim.allies) if (a.id !== 'pl_lis' && a.id !== 'pl_gruca') Object.assign(a, { alive: false, state: 'DOWN', health: 0, rescue: null }); // ninguém por perto
    place(sim, ally(sim, 'pl_gruca'), EVAC[0] + 10, EVAC[1] - 10);
    // Merge M02 único: o último grupo evacua agora com navegação física (Codex 21f8d67b) e chegava ao ponto de encontro dentro da
    // janela, fechando C12 antes da asserção; aqui só interessa a janela de Lis, por isso o grupo só parte depois dela.
    for (const lg of sim.areaC.lastGroup) lg.startDelaySec = RESCUE_WINDOW_SEC + 30;
    run(sim, RESCUE_WINDOW_SEC + 1);
    assert.equal(lis.rescue ?? null, null);
    assert.equal(lis.state, 'DOWN');
    assert.equal(sim.missionFailed, null);
    assert.equal(ofType(sim, 'rescue_window_expired').some((e) => e.actorId === 'pl_lis'), true);
    for (const lg of sim.areaC.lastGroup) Object.assign(lg, { evacuated: true, arrivedAt: Number(sim.clock.toFixed(2)), moving: false });
    run(sim, 3);
    assert.equal(sim.areaC.c12Completed, true);
    assert.equal(sim.flags['m02.lis_status'], 'missing');
    assert.equal(sim.exportCampaignResultToM03().m03ImportState.lisEntry.presentInShelter, false);
  });
});

describe('M02 D1 socorro: snapshot, restauro e validador (campos aditivos `rescue` e `rescuedCount`)', () => {
  /** Szymczak já a levantar Lis (caído a tiro), a meio do prazo; Gruca de pé. Lis não é exigido: um checkpoint com ele caído é válido. */
  function midRescue() {
    const { sim, shooter } = field();
    const lis = fall(sim, shooter, 'pl_lis');
    silence(shooter);
    place(sim, ally(sim, 'pl_szymczak'), lis.x, lis.z + 6);
    run(sim, 1.5);
    assert.equal(lis.rescue.by, 'pl_szymczak');
    return { sim, lis };
  }

  it('um snapshot a meio do socorro de um caído NÃO exigido é um checkpoint válido e o restauro reproduz a continuação (incluindo o levantar)', () => {
    const { sim } = midRescue();
    const snap = structuredClone(sim.snapshot());
    snap.checkpointId = 'cp_m02_manual';
    assert.equal(validateM02Snapshot(snap).valid, true);
    assert.equal(snap.allies.find((a) => a.id === 'pl_lis').rescue.by, 'pl_szymczak');
    const trace = (s, n) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        s.tick(DT, {});
        out.push(JSON.stringify([s.clock, s.allies.map((a) => [a.id, a.x, a.z, a.health, a.alive, a.state, a.rescue, a.rescuedCount]), s.rng.state]));
        s.drainEvents();
      }
      return out;
    };
    const ref = trace(sim, 240);
    const fresh = new M02BenchSimulation(5);
    fresh.restoreSnapshot(snap);
    assert.deepEqual(trace(fresh, 240), ref);
    assert.equal(ally(fresh, 'pl_lis').alive, true, 'o socorro acabou depois do restauro');
    assert.equal(ally(fresh, 'pl_lis').rescuedCount, 1);
  });

  it('um checkpoint com Gruca caído (mesmo com janela aberta) continua recusado; um snapshot simples dessa situação mostra-se e restaura-se', () => {
    const { sim, shooter } = field();
    fall(sim, shooter, 'pl_gruca', { farM: 60 });
    const plain = structuredClone(sim.snapshot());
    assert.equal(validateM02Snapshot(plain).valid, true);
    const asCheckpoint = structuredClone(plain);
    asCheckpoint.checkpointId = 'cp_m02_manual';
    const r = validateM02Snapshot(asCheckpoint);
    assert.equal(r.valid, false);
    assert.match(r.reason, /Checkpoint cp_m02_manual recusado.*pl_gruca.*fora de combate/);
    const other = new M02BenchSimulation(3);
    other.restoreSnapshot(plain);
    assert.ok(ally(other, 'pl_gruca').rescue);
    assert.equal(other.missionFailed, null);
  });

  it('o validador recusa janelas incoerentes e socorros gastos inválidos; aceita saves sem os campos novos', () => {
    const { sim } = midRescue();
    const ok = sim.snapshot();
    assert.equal(validateM02Snapshot(ok).valid, true);
    const lisIn = (s) => s.allies.find((a) => a.id === 'pl_lis');
    const cases = [
      ['chave a mais', (s) => { lisIn(s).rescue.extra = 1; }],
      ['chave em falta', (s) => { delete lisIn(s).rescue.by; }],
      ['auxiliar com janela', (s) => { const a = s.allies.find((x) => x.id === 'pl_aux_01'); Object.assign(a, { alive: false, state: 'DOWN', health: 0, rescue: structuredClone(lisIn(s).rescue) }); }],
      ['janela num aliado de pé', (s) => { Object.assign(lisIn(s), { alive: true, state: 'ACTIVE', health: 40 }); }],
      ['janela num evacuado', (s) => { lisIn(s).state = 'EVACUATED'; }],
      ['prazo errado', (s) => { lisIn(s).rescue.deadlineAt += 5; }],
      ['queda no futuro', (s) => { lisIn(s).rescue.downedAt = s.clock + 3; lisIn(s).rescue.deadlineAt = s.clock + 3 + RESCUE_WINDOW_SEC; }],
      ['socorrista desconhecido', (s) => { lisIn(s).rescue.by = 'pl_fantasma'; }],
      ['socorrista é o próprio', (s) => { lisIn(s).rescue.by = 'pl_lis'; }],
      ['levantar sem socorrista', (s) => { lisIn(s).rescue.by = null; lisIn(s).rescue.liftStartedAt = 1; }],
      ['início de levantar no futuro', (s) => { lisIn(s).rescue.liftStartedAt = s.clock + 1; }],
      ['Piotr socorrista sem ter começado a levantar', (s) => { lisIn(s).rescue.by = 'piotr_sokol'; lisIn(s).rescue.liftStartedAt = null; }],
      ['estado anterior inválido', (s) => { lisIn(s).rescue.prevState = 'DOWN'; }],
      ['janela com o socorro já gasto', (s) => { lisIn(s).rescuedCount = 1; }],
      ['rescuedCount acima do máximo', (s) => { lisIn(s).rescue = null; lisIn(s).rescuedCount = 2; }],
      ['rescuedCount negativo', (s) => { lisIn(s).rescue = null; lisIn(s).rescuedCount = -1; }],
      ['rescuedCount texto', (s) => { lisIn(s).rescue = null; lisIn(s).rescuedCount = '1'; }],
      ['janela que não é objeto', (s) => { lisIn(s).rescue = 'aberta'; }],
    ];
    for (const [label, mutate] of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, label);
      assert.match(r.reason, /Janela de socorro|Socorros gastos/, label);
    }
    // saves anteriores: sem `rescue` nem `rescuedCount` em ninguém
    const legacy = structuredClone(new M02BenchSimulation(SEED).snapshot());
    for (const a of legacy.allies) {
      assert.equal('rescue' in a, false);
      assert.equal('rescuedCount' in a, false);
    }
    assert.equal(validateM02Snapshot(legacy).valid, true);
    const withNulls = structuredClone(legacy);
    for (const a of withNulls.allies) a.rescue = null;
    assert.equal(validateM02Snapshot(withNulls).valid, true);
    const restored = new M02BenchSimulation(1);
    restored.restoreSnapshot(legacy);
    assert.equal(restored.rescueStatus().length, 0);
  });

  it('mesmas entradas e mesma semente: o socorro é determinista (estado e registo iguais)', () => {
    const play = () => {
      const { sim, shooter } = field(777);
      const gruca = fall(sim, shooter, 'pl_gruca', { farM: 50 });
      place(sim, ally(sim, 'pl_szymczak'), gruca.x, gruca.z + 20);
      run(sim, 5);
      silence(shooter);
      run(sim, 15);
      return JSON.stringify([sim.snapshot(), sim.combatLog.filter((e) => /rescue|rescued/.test(e.type))]);
    };
    const a = play();
    assert.equal(a, play());
    assert.match(a, /ally_rescued/);
  });
});
