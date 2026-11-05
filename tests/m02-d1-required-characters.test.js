// M02 D1 (PDF p. 16, «Falhas duras»): (1) sem imunidades ocultas — Gruca, Lis e Szymczak já não voltam a 18/20 de vida quando o fogo
// ou a explosão os derrubam; (2) a 2.ª falha dura, «incapacidade definitiva de uma personagem exigida pelo cânone antes do seu ponto
// de resolução», com motivo próprio (`required_character_incapacitated`, com o `actorId`). Quem é exigido e em que cenas está em
// M02_REQUIRED_CHARACTERS (hoje: o sierż. Gruca, de C01 até C12 fechar; K1 p. 38); Lis NÃO é exigido porque C08/C11/I4 (pp. 14, 34)
// preveem o ramo em que já estava incapacitado. Testes de estado (entradas e rajadas reais), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  M02BenchSimulation,
  validateM02Snapshot,
  M02_MISSION_FAILURE_REASONS,
  M02_MISSION_FAILURE_TEXT,
} from '../src/game/m02-01-simulation.js';
import { M02_REQUIRED_CHARACTERS, requiredCharacterOut, M02_SCENE_IDS } from '../src/game/m02-acts-director.js';
import { createMemoryStorage } from '../src/game/m02-save-store.js';
import quintaLayout from '../missions/m02-bzura/m02-01-quinta-layout.json' with { type: 'json' };

const SEED = 19390909;
const DT = 0.05;
const ally = (sim, id) => sim.allies.find((a) => a.id === id);
const killHostiles = (sim) => {
  for (const e of sim.enemies) Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
};

/**
 * Coloca o aliado em campo aberto e um fuzileiro alemão a 4 m dele; o atirador dispara rajadas reais (`fireActorBurst`, a mesma via
 * da IA) até o aliado cair. Sem tick: a percepção da IA não entra. Devolve o aliado.
 */
function shootDown(sim, id, x = 30, z = -60) {
  const a = ally(sim, id);
  Object.assign(a, { x, z, y: sim.world.heightAt(x, z), crouched: false, goal: null });
  // qualquer Kar98k da célula serve de atirador (a rajada não olha para o estado dele): vivo, ou morto quando o teste já limpou a célula
  const shooter = sim.enemies.find((e) => e.alive && e.weapon === 'kar98k') ?? sim.enemies.find((e) => e.weapon === 'kar98k');
  Object.assign(shooter, { x: x + 4, z, y: sim.world.heightAt(x + 4, z), crouched: false });
  for (let i = 0; i < 80 && a.alive; i++) {
    shooter.mag = 5;
    sim.fireActorBurst(shooter, a, { x: a.x, y: a.y + 1.25, z: a.z }, 'enemy');
  }
  return a;
}

function tickUntilFailed(sim, maxTicks = 400) {
  for (let i = 0; i < maxTicks && !sim.missionFailed; i++) sim.tick(DT, {});
  return sim.missionFailed;
}

/** Percurso por atalhos até C11 (como em tests/m02-17): C10 e o impacto fixo passados e os hostis fora de jogo. */
function setupC11() {
  const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
  sim.enterAreaCC09();
  sim.startC10OrderChanges();
  killHostiles(sim);
  sim.detonateC10FixedArtillery();
  assert.equal(sim.areaC.c11Started, true);
  return sim;
}

describe('M02 D1: sem imunidades ocultas', () => {
  it('o layout e os aliados vivos não têm a marca `essential` (a imunidade que repunha a vida de Gruca, Lis e Szymczak)', () => {
    assert.ok(quintaLayout.polishSquad.length >= 7);
    for (const a of quintaLayout.polishSquad) assert.equal(Object.hasOwn(a, 'essential'), false, `layout: ${a.id}`);
    const sim = new M02BenchSimulation(SEED);
    for (const a of sim.allies) assert.equal(Object.hasOwn(a, 'essential'), false, `estado vivo: ${a.id}`);
  });

  for (const id of ['pl_gruca', 'pl_lis', 'pl_szymczak', 'pl_wierzba', 'pl_malek', 'pl_aux_01', 'pl_aux_02']) {
    it(`${id} cai a tiro real como qualquer outro (DOWN, vida 0, sem reposição a 18) e ao rebentar uma granada a 1 m (DEAD)`, () => {
      const shot = new M02BenchSimulation(SEED);
      const a = shootDown(shot, id);
      assert.equal(a.alive, false, 'o fogo inimigo derruba-o');
      assert.equal(a.state, 'DOWN');
      assert.equal(a.health, 0, 'a vida não é reposta');
      assert.ok(shot.combatLog.some((e) => e.type === 'ally_down' && e.targetId === id), 'o log diz quem caiu');

      const blasted = new M02BenchSimulation(SEED);
      const b = ally(blasted, id);
      Object.assign(b, { x: 30, z: -60, y: blasted.world.heightAt(30, -60) });
      const record = blasted.detonateGrenadeAt(31, b.y, -60, 6.5);
      assert.equal(b.alive, false, 'a explosão mata-o');
      assert.equal(b.state, 'DEAD');
      assert.equal(b.health, 0, 'sem reposição a 20');
      assert.equal(record.affectedActors.find((x) => x.id === id)?.alive, false);
    });
  }

  it('um save anterior, com `essential: true` nos aliados, carrega mas a marca já não protege ninguém', () => {
    const sim = new M02BenchSimulation(SEED);
    const old = structuredClone(sim.snapshot());
    for (const id of ['pl_gruca', 'pl_lis', 'pl_szymczak']) ally({ allies: old.allies }, id).essential = true;
    assert.equal(validateM02Snapshot(old).valid, true, 'schema 2 inalterado: o campo extra é ignorado');
    const other = new M02BenchSimulation(7);
    other.restoreSnapshot(old);
    const gruca = shootDown(other, 'pl_gruca');
    assert.equal(gruca.alive, false);
    assert.equal(gruca.health, 0);
  });
});

describe('M02 D1: 2.ª falha dura — personagem exigida fora de combate', () => {
  it('a tabela diz quem e quando: só o sierż. Gruca, de C01 até C12; Lis, Szymczak, Wierzba, Małek e os auxiliares não falham a missão', () => {
    assert.deepEqual(Object.keys(M02_REQUIRED_CHARACTERS), ['pl_gruca']);
    const gruca = M02_REQUIRED_CHARACTERS.pl_gruca;
    assert.equal(gruca.fromScene, 'C01');
    assert.equal(gruca.untilScene, 'C12');
    assert.ok(M02_SCENE_IDS.includes(gruca.fromScene) && M02_SCENE_IDS.includes(gruca.untilScene));
    assert.deepEqual([...M02_MISSION_FAILURE_REASONS], ['piotr_killed', 'required_character_incapacitated']);
    for (const reason of M02_MISSION_FAILURE_REASONS) assert.ok(M02_MISSION_FAILURE_TEXT[reason], `texto de ${reason}`);
    assert.match(M02_MISSION_FAILURE_TEXT.required_character_incapacitated, /Gruca/);
  });

  it('Gruca derrubado a tiro em A: missionFailed {reason, at, actorId}, evento e registo com o ator; o roteiro e os checkpoints param', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    for (let i = 0; i < 20; i++) sim.tick(DT, {});
    const gruca = shootDown(sim, 'pl_gruca');
    assert.equal(gruca.alive, false);
    sim.drainEvents();
    const failure = tickUntilFailed(sim);
    assert.ok(failure, 'a missão falhou');
    assert.deepEqual(Object.keys(failure).sort(), ['actorId', 'at', 'reason']);
    assert.equal(failure.reason, 'required_character_incapacitated');
    assert.equal(failure.actorId, 'pl_gruca');
    assert.ok(failure.at <= sim.clock);
    assert.equal(sim.player.alive, true, 'Piotr está vivo: a falha é a da personagem exigida');
    const events = sim.drainEvents().filter((e) => e.type === 'mission-failed');
    assert.equal(events.length, 1);
    assert.equal(events[0].reason, 'required_character_incapacitated');
    assert.equal(events[0].actorId, 'pl_gruca');
    assert.deepEqual(sim.combatLog.filter((e) => e.type === 'mission_failed').map((e) => [e.reason, e.actorId]), [['required_character_incapacitated', 'pl_gruca']]);
    // mais ticks não repetem a falha; roteiro e checkpoints parados (os mesmos contratos da morte de Piotr)
    const scriptBefore = JSON.stringify(sim.script);
    const reachedBefore = [...sim.checkpointsReached];
    for (const e of sim.enemies) if (!e.c04Candidate) Object.assign(e, { alive: false, health: 0, state: 'DEAD' }); // a quinta cairia: gravaria cp_m02_b
    sim.player.z = 50;
    for (let i = 0; i < 100; i++) sim.tick(DT, {});
    assert.deepEqual(sim.missionFailed, failure);
    assert.equal(JSON.stringify(sim.script), scriptBefore);
    assert.deepEqual(sim.checkpointsReached, reachedBefore);
    assert.equal(sim.drainEvents().filter((e) => e.type === 'mission-failed' || e.type === 'checkpoint-saved').length, 0);
    assert.equal(sim.saveCheckpoint('cp_m02_manual'), null, 'nem o F5 grava com a missão falhada');
  });

  it('a falha é avaliada no fim de cada ação atómica, antes de gravar: uma explosão que mata Gruca e o último defensor não grava cp_m02_b_acesso', () => {
    const sim = new M02BenchSimulation(SEED);
    // todos os defensores menos DE-A14 (C04) caem e Gruca cai no mesmo tick: cp_m02_b_acesso ficaria pendente
    for (const e of sim.enemies) if (!e.c04Candidate) Object.assign(e, { alive: false, health: 0, state: 'DEAD' });
    Object.assign(ally(sim, 'pl_gruca'), { alive: false, health: 0, state: 'DOWN' });
    sim.tick(DT, {});
    assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated');
    assert.equal(sim.checkpointsReached.includes('cp_m02_b_acesso'), false);
    assert.equal(sim.checkpoints.has('cp_m02_b_acesso'), false);
    // fora do tick (ação de bancada): a granada do jogador mata Gruca e o gravar é recusado na mesma ação
    const sim2 = new M02BenchSimulation(SEED);
    const g = ally(sim2, 'pl_gruca');
    Object.assign(g, { x: 30, z: -60, y: sim2.world.heightAt(30, -60) });
    sim2.detonateGrenadeAt(31, g.y, -60, 6.5);
    assert.equal(g.state, 'DEAD');
    assert.equal(sim2.missionFailed?.actorId, 'pl_gruca', 'a granada do próprio jogador também conta');
    assert.equal(sim2.saveCheckpoint('cp_m02_manual'), null);
  });

  it('em B e em C a falha é a mesma (a mesma tabela, outra célula)', () => {
    for (const [label, enter] of [['B', (s) => s.enterAreaBC06()], ['C', (s) => { s.enterAreaBC06(); s.enterAreaCC09(); }]]) {
      const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
      enter(sim);
      assert.equal(sim.activeCellId, label);
      const a = ally(sim, 'pl_gruca');
      // o atirador é um dos hostis da célula, a 4 m dele, junto do ponto de entrada de Piotr (terreno aberto em B e em C)
      const shooter = sim.enemies.find((e) => e.alive && e.weapon === 'kar98k');
      const spawn = sim.world.layout.playerSpawn;
      const where = { x: spawn.x + 12, z: spawn.z };
      Object.assign(a, { ...where, y: sim.world.heightAt(where.x, where.z), crouched: false, detachedOutOfCell: false });
      Object.assign(shooter, { x: where.x + 4, z: where.z, y: sim.world.heightAt(where.x + 4, where.z) });
      for (let i = 0; i < 80 && a.alive; i++) {
        shooter.mag = 5;
        sim.fireActorBurst(shooter, a, { x: a.x, y: a.y + 1.25, z: a.z }, 'enemy');
      }
      assert.equal(a.alive, false, `${label}: Gruca caiu`);
      sim.tick(DT, {});
      assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated', label);
      assert.equal(sim.missionFailed?.actorId, 'pl_gruca', label);
    }
  });

  it('a morte de Piotr tem precedência (os dois no mesmo tick: piotr_killed, sem actorId)', () => {
    const sim = new M02BenchSimulation(SEED);
    Object.assign(ally(sim, 'pl_gruca'), { alive: false, health: 0, state: 'DOWN' });
    sim.player.health = 0;
    sim.player.alive = false;
    sim.tick(DT, {});
    assert.deepEqual(Object.keys(sim.missionFailed).sort(), ['at', 'reason']);
    assert.equal(sim.missionFailed.reason, 'piotr_killed');
  });

  it('o reinício explícito volta ao último checkpoint com Gruca de pé e a missão volta a andar sem falhar logo a seguir', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    for (let i = 0; i < 20; i++) sim.tick(DT, {});
    const manual = sim.saveCheckpoint('cp_m02_manual');
    assert.ok(manual);
    shootDown(sim, 'pl_gruca');
    assert.ok(tickUntilFailed(sim));
    sim.drainEvents();
    const loaded = sim.restartAfterFailure();
    assert.equal(loaded.checkpointId, 'cp_m02_manual');
    assert.equal(sim.missionFailed, null);
    assert.equal(ally(sim, 'pl_gruca').alive, true);
    assert.equal(sim.clock, manual.clock);
    const restarted = sim.drainEvents().find((e) => e.type === 'mission-restarted');
    assert.equal(restarted.after.reason, 'required_character_incapacitated');
    assert.equal(restarted.after.actorId, 'pl_gruca');
    for (let i = 0; i < 40; i++) sim.tick(DT, {});
    assert.equal(sim.missionFailed, null, 'o reinício não volta a falhar no tick seguinte');
  });

  it('depois de C12 fechado já não há falha: o epílogo é uma elipse e a exportação para a M03 continua concluída', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.completed, true);
    Object.assign(ally(sim, 'pl_gruca'), { alive: false, health: 0, state: 'DOWN' });
    for (let i = 0; i < 10; i++) sim.tick(DT, {});
    assert.equal(sim.missionFailed, null);
    assert.equal(sim.exportCampaignResultToM03().completed, true);
    assert.equal(requiredCharacterOut(sim), null);
  });

  it('um atalho de bancada não conclui a missão com Gruca fora de combate: completeC12Epilogue devolve null e regista a falha', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    Object.assign(ally(sim, 'pl_gruca'), { alive: false, health: 0, state: 'DOWN' });
    assert.equal(sim.completeC12Epilogue(), null);
    assert.equal(sim.missionFailed?.actorId, 'pl_gruca');
    assert.equal(sim.flags['m02.completed'], false);
    assert.equal(sim.m03ExportPackage, null);
  });

  // Revisão adversarial: o KeyM força C10, o SP03 e C11; o impacto fixo (4, 18; raio 8 m) fere quem estiver perto. Só Piotr era
  // revalidado depois dele: com Gruca ao pé do impacto a missão concluía-se (`completed: true`, exportada para a M03) e um F5 gravava
  // cp_m02_manual com Gruca morto (o validador aceitava-o por c12Completed).
  describe('o atalho KeyM (completeC12Epilogue) revalida Gruca depois do SP03 forçado, como a Piotr', () => {
    /** C09 com os hostis fora de jogo, Piotr longe do impacto e Gruca em (gx, gz); depois da primeira passagem do relógio. */
    const keyMSetup = (gx, gz, hp = 100) => {
      const storage = createMemoryStorage();
      const sim = new M02BenchSimulation(7, { storage });
      sim.enterAreaCC09();
      killHostiles(sim);
      sim.teleportPlayer(-6, -16, Math.PI / 2);
      sim.tick(0.1, {});
      const g = ally(sim, 'pl_gruca');
      Object.assign(g, { x: gx, z: gz, y: sim.world.heightAt(gx, gz), goal: null, health: hp });
      sim.drainEvents();
      return { sim, g, storage };
    };
    const storedWithGrucaOut = (storage) => {
      const raw = storage.getItem('cod-guerra:m02:bench:v2');
      if (!raw) return [];
      return Object.entries(JSON.parse(raw).checkpoints)
        .filter(([, s]) => s.allies.find((a) => a.id === 'pl_gruca')?.alive === false)
        .map(([id]) => id);
    };

    for (const [gx, gz, hp] of [[4, 17, 100], [4, 16, 60]]) {
      it(`Gruca a ${Math.hypot(gx - 4, gz - 18).toFixed(0)} m do impacto (vida ${hp}): o SP03 forçado derruba-o, nada se conclui nem exporta, a falha regista pl_gruca e nenhum checkpoint o grava fora de combate`, () => {
        const { sim, g, storage } = keyMSetup(gx, gz, hp);
        const pkg = sim.completeC12Epilogue();
        assert.equal(g.alive, false, 'o impacto forçado derrubou-o (pré-condição do cenário)');
        assert.equal(pkg, null, 'não devolve pacote');
        assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated');
        assert.equal(sim.missionFailed?.actorId, 'pl_gruca');
        assert.equal(sim.flags['m02.completed'], false, 'a missão não se marca concluída');
        assert.equal(sim.areaC.c12Completed, false);
        assert.equal(sim.m03ExportPackage, null, 'nada exportado para a M03');
        assert.equal(sim.exportCampaignResultToM03().completed, false, 'a exportação direta nunca diz concluída com a missão falhada');
        // o F5 que se segue é recusado e a loja não fica com um Gruca fora de combate em nenhum checkpoint
        sim.drainEvents();
        assert.equal(sim.saveCheckpoint('cp_m02_manual'), null);
        assert.ok(sim.drainEvents().some((e) => e.type === 'checkpoint-rejected'));
        assert.deepEqual(storedWithGrucaOut(storage), []);
        // a página recarregada não encontra um save de «missão concluída com Gruca morto»
        const page = new M02BenchSimulation(1, { storage });
        const loaded = page.quickLoadCheckpoint();
        assert.equal(ally(page, 'pl_gruca').alive, true, `F9 (${loaded.checkpointId}/${loaded.source}) repõe Gruca de pé`);
        assert.equal(page.flags['m02.completed'], false);
      });
    }

    it('controlo: com Gruca longe do impacto o mesmo KeyM conclui e exporta (a revalidação não bloqueia o atalho)', () => {
      const { sim, g } = keyMSetup(-30, -30);
      const pkg = sim.completeC12Epilogue();
      assert.equal(g.alive, true);
      assert.equal(sim.missionFailed, null);
      assert.equal(pkg.completed, true);
      assert.equal(sim.flags['m02.completed'], true);
    });
  });
});

describe('M02 D1: o que NÃO falha a missão — o PDF prevê o ramo (C08, C11, I4, K1)', () => {
  it('Lis derrubado antes de C08: a missão continua; C07 evacua-o, C08 não o destaca, C11 usa esse estado (um só Lis) e o desfecho é wounded_evacuated', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    const lis = shootDown(sim, 'pl_lis');
    assert.equal(lis.alive, false);
    for (let i = 0; i < 40; i++) sim.tick(DT, {});
    assert.equal(sim.missionFailed, null, 'C08/C11/I4 preveem Lis já incapacitado: não é falha dura');
    sim.completeC07Reorganization();
    assert.equal(lis.state, 'EVACUATED', '«Feridos graves seguem por evacuação» (C07)');
    sim.beginC08Briefing();
    assert.ok(!lis.detachedOutOfCell, 'não recebe a missão de ligação: mantém o seu estado (C08)');
    sim.enterAreaCC09();
    sim.startC10OrderChanges();
    killHostiles(sim);
    sim.detonateC10FixedArtillery();
    assert.equal(sim.areaC.lisPhase, 'incapacitated');
    assert.equal(sim.areaC.lisWasIncapacitated, true);
    const pkg = sim.completeC12Epilogue();
    assert.equal(sim.missionFailed, null);
    assert.equal(pkg.completed, true);
    assert.equal(pkg.flags['m02.lis_status'], 'wounded_evacuated');
    assert.equal(sim.allies.filter((a) => a.id === 'pl_lis').length, 1, 'nunca um segundo Lis');
    assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
  });

  it('Lis derrubado em C11, no regresso: não falha; sem Piotr ao pé o desfecho é missing («ausência não equivale a morte comprovada»)', () => {
    const sim = setupC11();
    const lis = shootDown(sim, 'pl_lis', 30, -60); // fora do percurso dele; qualquer sítio vale para a prova de estado
    assert.equal(lis.alive, false);
    for (let i = 0; i < 20; i++) sim.tick(DT, {});
    assert.equal(sim.missionFailed, null);
    const pkg = sim.completeC12Epilogue();
    assert.equal(pkg.flags['m02.lis_status'], 'missing');
    assert.equal(lis.state, 'MISSING');
    assert.equal(pkg.completed, true);
    assert.equal(pkg.m03ImportState.lisEntry.presentInShelter, false);
  });

  it('Szymczak, Wierzba, Małek e os auxiliares fora de combate não falham a missão (consequência persistente, K1/D1)', () => {
    const sim = new M02BenchSimulation(SEED);
    ['pl_szymczak', 'pl_wierzba', 'pl_malek', 'pl_aux_01', 'pl_aux_02'].forEach((id, i) => {
      assert.equal(shootDown(sim, id, 30, -60 + 4 * i).alive, false, id);
    });
    for (let i = 0; i < 40; i++) sim.tick(DT, {});
    assert.equal(sim.missionFailed, null);
    assert.equal(ally(sim, 'pl_gruca').alive, true);
    assert.equal(requiredCharacterOut(sim), null);
  });
});

describe('M02 D1: a falha no snapshot, no restauro e no validador (campo aditivo do schema 2)', () => {
  const failedSim = () => {
    const sim = new M02BenchSimulation(SEED);
    for (let i = 0; i < 10; i++) sim.tick(DT, {});
    shootDown(sim, 'pl_gruca');
    tickUntilFailed(sim);
    assert.ok(sim.missionFailed);
    return sim;
  };

  it('o snapshot leva {reason, at, actorId}, valida, e o restauro repõe exatamente a mesma falha com o roteiro parado', () => {
    const sim = failedSim();
    const snap = structuredClone(sim.snapshot());
    assert.deepEqual(snap.missionFailed, sim.missionFailed);
    assert.equal(snap.missionFailed.actorId, 'pl_gruca');
    assert.equal(validateM02Snapshot(snap).valid, true);
    const fresh = new M02BenchSimulation(SEED + 5);
    fresh.restoreSnapshot(snap);
    assert.deepEqual(fresh.missionFailed, sim.missionFailed);
    const scriptBefore = JSON.stringify(fresh.script);
    for (let i = 0; i < 40; i++) fresh.tick(DT, {});
    assert.deepEqual(fresh.missionFailed, sim.missionFailed);
    assert.equal(JSON.stringify(fresh.script), scriptBefore);
  });

  it('o validador recusa a falha sem actorId, com actorId desconhecido, de quem não é exigido, de quem está de pé ou com chaves a mais; e a morte de Piotr não leva actorId', () => {
    const sim = failedSim();
    const ok = sim.snapshot();
    const cases = [
      ['sem actorId', (s) => { delete s.missionFailed.actorId; }],
      ['actorId desconhecido', (s) => { s.missionFailed.actorId = 'pl_fantasma'; }],
      ['actorId de quem não é exigido (Lis)', (s) => { s.missionFailed.actorId = 'pl_lis'; Object.assign(s.allies.find((a) => a.id === 'pl_lis'), { alive: false, health: 0, state: 'DOWN' }); }],
      ['Gruca de pé', (s) => { Object.assign(s.allies.find((a) => a.id === 'pl_gruca'), { alive: true, health: 50, state: 'ACTIVE' }); }],
      ['chave a mais', (s) => { s.missionFailed.extra = 1; }],
      ['piotr_killed com actorId', (s) => { s.missionFailed.reason = 'piotr_killed'; s.player.health = 0; s.player.alive = false; }],
      ['actorId não string', (s) => { s.missionFailed.actorId = 7; }],
    ];
    for (const [label, mutate] of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, label);
      assert.match(r.reason, /missionFailed/, label);
    }
  });

  it('um checkpoint com a personagem exigida já fora de combate não é ponto de reinício; um snapshot simples dessa situação mostra-se e restaura-se (a falha dispara no tick)', () => {
    const sim = new M02BenchSimulation(SEED);
    shootDown(sim, 'pl_gruca'); // sem tick: a falha ainda não foi avaliada
    const plain = structuredClone(sim.snapshot());
    assert.equal(plain.missionFailed, null);
    assert.equal(validateM02Snapshot(plain).valid, true, 'um snapshot sem checkpointId pode mostrar a situação');
    const asCheckpoint = structuredClone(plain);
    asCheckpoint.checkpointId = 'cp_m02_manual';
    const r = validateM02Snapshot(asCheckpoint);
    assert.equal(r.valid, false);
    assert.match(r.reason, /Checkpoint cp_m02_manual recusado.*pl_gruca.*fora de combate/);
    const other = new M02BenchSimulation(3);
    other.restoreSnapshot(plain);
    other.tick(DT, {});
    assert.equal(other.missionFailed?.actorId, 'pl_gruca');
  });

  it('nem com a missão concluída (c12Completed): um checkpoint com Gruca fora de combate continua recusado; um snapshot simples mostra-se', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    assert.equal(sim.completeC12Epilogue().completed, true);
    assert.equal(sim.areaC.c12Completed, true);
    const alive = structuredClone(sim.snapshot());
    alive.checkpointId = 'cp_m02_manual';
    assert.equal(validateM02Snapshot(alive).valid, true, 'controlo: concluído e Gruca de pé é um ponto de reinício válido');
    Object.assign(ally(sim, 'pl_gruca'), { alive: false, health: 0, state: 'DEAD' });
    const plain = structuredClone(sim.snapshot());
    assert.equal(plain.missionFailed, null, 'depois de C12 fechado já não há falha');
    assert.equal(validateM02Snapshot(plain).valid, true, 'um snapshot sem checkpointId mostra o estado');
    const asCheckpoint = structuredClone(plain);
    asCheckpoint.checkpointId = 'cp_m02_manual';
    const r = validateM02Snapshot(asCheckpoint);
    assert.equal(r.valid, false);
    assert.match(r.reason, /Checkpoint cp_m02_manual recusado.*pl_gruca.*fora de combate/);
    assert.equal(requiredCharacterOut(plain), null, 'a regra da falha não mudou: sem falha depois de C12');
    assert.equal(requiredCharacterOut(plain, { ignoreCompletion: true }), 'pl_gruca');
    // o F5 da simulação aplica o mesmo validador
    sim.drainEvents();
    assert.equal(sim.saveCheckpoint('cp_m02_manual'), null);
    assert.ok(sim.drainEvents().some((e) => e.type === 'checkpoint-rejected'));
  });

  it('o F5 (saveCheckpoint) com Gruca fora de combate avalia a falha primeiro e recusa, sem tocar na loja', () => {
    const storage = createMemoryStorage();
    const sim = new M02BenchSimulation(SEED, { storage });
    const keysBefore = storage.keys().length;
    shootDown(sim, 'pl_gruca');
    assert.equal(sim.saveCheckpoint('cp_m02_manual'), null);
    assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated');
    assert.equal(sim.checkpointsReached.includes('cp_m02_manual'), false);
    assert.equal(storage.keys().length, keysBefore);
  });
});

describe('M02 D1: quem está fora da célula (Lis na ligação de C08-C10) não é atingido por fogo nem por explosões da célula atual', () => {
  it('rajadas e uma explosão sobre as coordenadas antigas de Lis não lhe tocam; ao voltar a estar na célula (C11) passa a ser um alvo como os outros', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    sim.enterAreaCC09(); // beginC08Briefing destaca Lis
    const lis = ally(sim, 'pl_lis');
    assert.equal(lis.detachedOutOfCell, true);
    const spawn = sim.world.layout.playerSpawn;
    const where = { x: spawn.x + 12, z: spawn.z }; // terreno aberto da Área C, fora do raio de Piotr
    Object.assign(lis, { ...where, y: sim.world.heightAt(where.x, where.z) });
    const shooter = sim.enemies.find((e) => e.alive && e.weapon === 'kar98k');
    Object.assign(shooter, { x: where.x + 4, z: where.z, y: sim.world.heightAt(where.x + 4, where.z), crouched: false });
    for (let i = 0; i < 40; i++) {
      shooter.mag = 5;
      sim.fireActorBurst(shooter, lis, { x: lis.x, y: lis.y + 1.25, z: lis.z }, 'enemy');
    }
    const record = sim.detonateGrenadeAt(where.x + 1, lis.y, where.z, 6.5);
    assert.equal(lis.alive, true);
    assert.equal(lis.health, lis.maxHealth);
    assert.equal(record.affectedActors.some((x) => x.id === 'pl_lis'), false);
    lis.detachedOutOfCell = false; // regressou
    const burst = [];
    for (let i = 0; i < 80 && lis.alive; i++) {
      shooter.mag = 5;
      burst.push(sim.fireActorBurst(shooter, lis, { x: lis.x, y: lis.y + 1.25, z: lis.z }, 'enemy'));
    }
    assert.equal(lis.alive, false, 'na célula é um alvo como os outros');
  });
});
