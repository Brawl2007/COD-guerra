// M02 C11 (PDF p. 14) + I4/I6 (pp. 34-35): «Não há mínimo artificial de dez sobreviventes. Quem foi atingido permanece ferido ou morto; o
// objetivo é abrir possibilidade de retirada, não alcançar uma pontuação.» + «m02.last_group_survivors: inteiro 0…12, derivado de
// LG01…LG12 … manter destino individual». Antes o último grupo era invulnerável (sempre 12/12). Agora, a partir de C10, é alvo do fogo e
// das explosões como os outros; o resumo de C12 e a exportação para a M03 dizem evacuados / mortos / em trânsito, por homem.
// Testes de estado (rajadas e explosões reais), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import cellsBC from '../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };

const SEED = 19390909;
const DT = 0.1;
const EVAC_POINT = cellsBC.cells.C.evacRoute.at(-1);
const lisOf = (sim) => sim.allies.find((a) => a.id === 'pl_lis');
const lg = (sim, n) => sim.areaC.lastGroup[n - 1];
const killHostiles = (sim) => {
  for (const e of sim.enemies) Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
};
const disarmAllies = (sim) => {
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
};

/** Área C no instante do impacto SP03 (C11 começou), hostis fora de jogo, Lis já evacuado (C11 não depende dele), Piotr longe de tudo. */
function setupC11() {
  const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
  lisOf(sim).state = 'EVACUATED';
  sim.enterAreaCC09();
  sim.startC10OrderChanges();
  killHostiles(sim);
  sim.detonateC10FixedArtillery();
  assert.equal(sim.areaC.c11Started, true);
  disarmAllies(sim);
  return sim;
}

/** Um Kar98k alemão a 4 m do alvo, em campo aberto, dispara rajadas reais até ele cair (ou `max` rajadas). Devolve o número de rajadas. */
function shootAt(sim, target, max = 80) {
  const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
  target.y = sim.world.heightAt(target.x, target.z);
  Object.assign(shooter, { x: target.x + 4, z: target.z, y: sim.world.heightAt(target.x + 4, target.z), crouched: false });
  let bursts = 0;
  for (; bursts < max && target.alive; bursts++) {
    shooter.mag = 5;
    sim.fireActorBurst(shooter, target, { x: target.x, y: target.y + 1.25, z: target.z }, 'enemy');
  }
  return bursts;
}

describe('M02 C11: o último grupo deixou de ser invulnerável', () => {
  it('antes de C10 não está em jogo (não é alvo); a partir de C10 o fogo inimigo fere-o e mata-o, com registo e velocidade de ferido', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    sim.enterAreaCC09();
    const first = lg(sim, 1);
    assert.equal(sim.areaC.c10Started, false);
    disarmAllies(sim);
    const e = sim.enemies.find((x) => x.weapon === 'kar98k');
    first.y = sim.world.heightAt(first.x, first.z);
    Object.assign(e, { x: first.x + 4, z: first.z, y: sim.world.heightAt(first.x + 4, first.z) });
    for (let i = 0; i < 20; i++) {
      e.mag = 5;
      sim.fireActorBurst(e, first, { x: first.x, y: first.y + 1.25, z: first.z }, 'enemy');
    }
    assert.equal(first.health, first.maxHealth, 'em C09 o grupo ainda não está exposto (nem sequer é desenhado: renderer, c10Started)');

    sim.startC10OrderChanges();
    const speedBefore = first.speed;
    assert.equal(first.wounded, false);
    sim.fireActorBurst(e, first, { x: first.x, y: first.y + 1.25, z: first.z }, 'enemy');
    for (let i = 0; i < 80 && first.health === first.maxHealth; i++) {
      e.mag = 5;
      sim.fireActorBurst(e, first, { x: first.x, y: first.y + 1.25, z: first.z }, 'enemy');
    }
    assert.ok(first.health < first.maxHealth, 'foi atingido');
    assert.equal(first.wounded, true, 'quem foi atingido permanece ferido');
    assert.ok(first.speed <= speedBefore && first.speed <= 3.8, `anda a velocidade de ferido (${first.speed})`);
    assert.ok(first.alive);

    shootAt(sim, first);
    assert.equal(first.alive, false, 'ou morto');
    assert.equal(first.health, 0);
    assert.equal(first.moving, false);
    assert.equal(first.evacuated, false);
    const log = sim.combatLog.filter((x) => x.type === 'last_group_casualty' && x.actorId === 'LG01');
    assert.equal(log.length, 1, 'uma baixa registada com o atirador');
    assert.ok(log[0].shooterId && log[0].cause === 'fire');
    assert.ok(sim.combatLog.some((x) => x.type === 'enemy_hit_ally' && x.targetId === 'LG01'));
  });

  it('uma explosão fere e mata o grupo (alcance, oclusão e dano como para os outros); o evacuado já está a salvo', () => {
    const sim = setupC11();
    const a = lg(sim, 1);
    const b = lg(sim, 2);
    const c = lg(sim, 3);
    for (const [m, dx] of [[a, 0], [b, 3], [c, 5.5]]) Object.assign(m, { x: 30 + dx, z: -60, y: sim.world.heightAt(30 + dx, -60) });
    const safe = lg(sim, 4);
    Object.assign(safe, { x: 30.5, z: -60, y: sim.world.heightAt(30.5, -60), evacuated: true, arrivedAt: sim.clock });
    const record = sim.detonateGrenadeAt(30, a.y, -60, 6.5);
    const hit = (m) => record.affectedActors.find((x) => x.id === m.id);
    assert.equal(a.alive, false, 'no centro morre');
    assert.ok(hit(a) && hit(a).alive === false);
    assert.ok(b.alive && b.health < b.maxHealth && b.wounded, 'a 3 m fica ferido');
    assert.ok(c.alive && c.health < c.maxHealth, 'a 5,5 m ainda leva');
    assert.equal(hit(safe), undefined, 'o evacuado está fora do perigo');
    assert.equal(safe.health, safe.maxHealth);
    assert.ok(sim.combatLog.some((x) => x.type === 'last_group_casualty' && x.actorId === a.id && x.cause === 'blast'));
  });

  it('o fogo da própria IA hostil chega-lhes: um atirador com linha de vista ao percurso fere e mata sem ser chamado à mão', () => {
    const sim = setupC11();
    sim.c01Active = false; // como no jogo: por atalho o C01 nunca terminou e a guarnição das outras células ficaria em pausa
    sim.teleportPlayer(-60, 80, 0);
    const shooter = sim.enemies.find((e) => e.weapon === 'kar98k');
    const first = lg(sim, 1);
    first.startDelaySec = 999; // parado à vista: a prova é a percepção e o disparo da IA
    Object.assign(first, { x: 20, z: -40, y: sim.world.heightAt(20, -40) });
    // um grupo de moral só dele (os 7 abatidos de EC1/EC2 fariam este cair por rendição) e terreno aberto a leste do grupo
    Object.assign(shooter, {
      alive: true, health: 100, state: 'HOLD_SECTOR', nonCombatant: false, active: true, mag: 5, reserve: 35, suppressed: 0, encounterId: 'TESTE',
      x: 32, z: -40, y: sim.world.heightAt(32, -40), facing: Math.PI, goal: null, nextFireAt: 0, reloadingUntil: 0,
    });
    for (let i = 0; i < 600 && first.alive; i++) {
      shooter.mag = Math.max(shooter.mag, 1);
      sim.tick(DT, {});
    }
    assert.ok(first.health < first.maxHealth || !first.alive, 'a percepção hostil conta o grupo como alvo');
    assert.ok(sim.combatLog.some((x) => x.type === 'enemy_hit_ally' && x.targetId === 'LG01' && x.shooterId === shooter.id));
  });
});

describe('M02 C11/C12: o resumo e a exportação para a M03 dizem evacuados, mortos e em trânsito, sem mínimo artificial', () => {
  /** Mata `n` homens do grupo (os primeiros) por fogo real. */
  const kill = (sim, n) => {
    for (let i = 1; i <= n; i++) shootAt(sim, lg(sim, i));
  };

  it('5 mortos, 7 chegam: C12 fecha com evacuados 7, mortos 5, em trânsito 0; o fluxo M03 leva o destino individual; a missão conclui-se (sem piso de 10)', () => {
    const sim = setupC11();
    kill(sim, 5);
    for (let i = 1; i <= 5; i++) assert.equal(lg(sim, i).alive, false);
    sim.teleportPlayer(EVAC_POINT[0], EVAC_POINT[1], 0);
    for (let i = 0; i < 3000 && sim.script.sceneId !== 'C12'; i++) sim.tick(DT, {});
    assert.equal(sim.script.sceneId, 'C12', 'a passagem termina quando os sobreviventes alcançáveis chegaram');
    assert.deepEqual(sim.areaC.lastGroupSummary, { evacuated: 7, inTransit: 0, dead: 5 });
    assert.equal(sim.flags['m02.last_group_survivors'], 7);
    assert.equal(sim.missionFailed, null);
    assert.equal(sim.flags['m02.completed'], true);
    const pkg = sim.m03ExportPackage;
    assert.equal(pkg.completed, true);
    assert.equal(pkg.m03ImportState.lastGroupSurvivorsCount, 7);
    const g = pkg.m03ImportState.lastGroup;
    assert.deepEqual({ survivors: g.survivors, dead: g.dead, inTransit: g.inTransit }, { survivors: 7, dead: 5, inTransit: 0 });
    assert.equal(g.members.length, 12);
    assert.deepEqual(g.members.map((m) => m.id), Array.from({ length: 12 }, (_, i) => `LG${String(i + 1).padStart(2, '0')}`));
    assert.deepEqual(g.members.filter((m) => m.fate === 'dead').map((m) => m.id), ['LG01', 'LG02', 'LG03', 'LG04', 'LG05']);
    assert.ok(g.members.filter((m) => m.fate === 'evacuated').length === 7);
    assert.ok(g.members.filter((m) => m.initialWounded).length === 2 || g.members.some((m) => m.wounded), 'os dois feridos iniciais mantêm-se identificados');
    assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
    assert.match(sim.objective.title, /Grupo final=7\/12/);
  });

  it('o grupo todo morto: 0 sobreviventes, a missão fecha na mesma (nenhum piso artificial); Lis e o resto seguem as suas regras', () => {
    const sim = setupC11();
    kill(sim, 12);
    sim.teleportPlayer(EVAC_POINT[0], EVAC_POINT[1], 0);
    for (let i = 0; i < 400 && sim.script.sceneId !== 'C12'; i++) sim.tick(DT, {});
    assert.equal(sim.script.sceneId, 'C12');
    assert.deepEqual(sim.areaC.lastGroupSummary, { evacuated: 0, inTransit: 0, dead: 12 });
    assert.equal(sim.flags['m02.last_group_survivors'], 0);
    assert.equal(sim.m03ExportPackage.m03ImportState.lastGroup.survivors, 0);
    assert.equal(sim.m03ExportPackage.m03ImportState.lastGroupSurvivorsCount, 0);
    assert.equal(sim.flags['m02.completed'], true);
  });

  it('em trânsito: um fecho antes de chegarem conta os vivos como em trânsito (não evacuados) e os mortos como mortos', () => {
    const sim = setupC11();
    kill(sim, 3);
    for (let i = 0; i < 100; i++) sim.tick(DT, {}); // 10 s: ainda a caminho
    const pkg = sim.completeC12Epilogue();
    assert.deepEqual(sim.areaC.lastGroupSummary, { evacuated: 0, inTransit: 9, dead: 3 });
    const g = pkg.m03ImportState.lastGroup;
    assert.deepEqual({ survivors: g.survivors, dead: g.dead, inTransit: g.inTransit }, { survivors: 0, dead: 3, inTransit: 9 });
    assert.equal(g.members.filter((m) => m.fate === 'in_transit').length, 9);
    assert.equal(pkg.m03ImportState.lastGroupSurvivorsCount, 0, 'em trânsito não é sobrevivente evacuado');
  });

  it('o objetivo de C11 diz evacuados e mortos enquanto a passagem não fecha', () => {
    const sim = setupC11();
    kill(sim, 2);
    // os restantes chegam; Piotr ainda longe: todos resolvidos, objetivo O09 «romper contacto»
    for (const m of sim.areaC.lastGroup.filter((x) => x.alive)) Object.assign(m, { evacuated: true, arrivedAt: sim.clock, x: EVAC_POINT[0], z: EVAC_POINT[1] });
    sim.tick(DT, {});
    assert.equal(sim.objective.id, 'O09');
    assert.match(sim.objective.title, /10 evacuados/);
    assert.match(sim.objective.title, /2 mortos/);
  });

  it('determinista: a mesma semente e as mesmas entradas dão os mesmos destinos individuais', () => {
    const run = () => {
      const sim = setupC11();
      kill(sim, 4);
      sim.teleportPlayer(EVAC_POINT[0], EVAC_POINT[1], 0);
      for (let i = 0; i < 3000 && sim.script.sceneId !== 'C12'; i++) sim.tick(DT, {});
      return JSON.stringify(sim.m03ExportPackage.m03ImportState.lastGroup);
    };
    assert.equal(run(), run());
  });
});

describe('M02 C11: snapshot, restauro e validador do último grupo', () => {
  it('o estado de baixas faz parte do snapshot e o restauro reproduz a continuação; o validador recusa incoerências', () => {
    const sim = setupC11();
    shootAt(sim, lg(sim, 1));
    for (let i = 0; i < 50; i++) sim.tick(DT, {});
    const snap = structuredClone(sim.snapshot());
    assert.equal(snap.areaC.lastGroup[0].alive, false);
    assert.equal(validateM02Snapshot(snap).valid, true);
    const other = new M02BenchSimulation(5);
    other.restoreSnapshot(snap);
    sim.teleportPlayer(EVAC_POINT[0], EVAC_POINT[1], 0);
    other.teleportPlayer(EVAC_POINT[0], EVAC_POINT[1], 0);
    for (let i = 0; i < 400; i++) {
      sim.tick(DT, {});
      other.tick(DT, {});
    }
    assert.equal(JSON.stringify(other.snapshot()), JSON.stringify(sim.snapshot()));

    const cases = [
      ['evacuado e morto', (s) => { Object.assign(s.areaC.lastGroup[0], { alive: false, evacuated: true, arrivedAt: 1 }); }],
      ['vida acima da máxima', (s) => { s.areaC.lastGroup[1].health = 500; }],
      ['vida negativa', (s) => { s.areaC.lastGroup[1].health = -1; }],
      ['vivo com vida 0', (s) => { Object.assign(s.areaC.lastGroup[1], { alive: true, health: 0 }); }],
      ['ferido não booleano', (s) => { s.areaC.lastGroup[1].wounded = 'sim'; }],
      ['resumo que não bate com os homens (mortos)', (s) => { s.areaC.lastGroupSummary = { evacuated: 0, inTransit: 12, dead: 0 }; }],
    ];
    for (const [label, mutate] of cases) {
      const bad = structuredClone(snap);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, label);
      assert.match(r.reason, /último grupo|lastGroup/i, label);
    }
  });

  it('um save anterior (membros sem maxHealth/state e todos vivos) continua válido e restaura-se', () => {
    const sim = new M02BenchSimulation(SEED);
    const snap = structuredClone(sim.snapshot());
    for (const m of snap.areaC.lastGroup) {
      delete m.maxHealth;
      delete m.state;
    }
    assert.equal(validateM02Snapshot(snap).valid, true);
    new M02BenchSimulation(3).restoreSnapshot(snap);
  });
});
