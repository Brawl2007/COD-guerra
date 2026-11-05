// M02 D5 (PDF p. 18): «Uma explosão perigosa tem aviso legível de 5-8 s ... A posição do impacto é fixada no mundo; não se desloca
// para poupar o jogador ou persegui-lo.» Todas as fontes de explosão perigosa — o impacto fixo de artilharia scriptado (SP03, C10) e a
// granada de mão inimiga — passam pelo mesmo mecanismo: `scheduleBlastWarning` fixa a posição, limita o aviso a [5, 8] s e emite o
// evento `blast-warning` (consumível pelo audiovisual). Teste de estado, não playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import {
  BLAST_WARNING_SEC,
  BLAST_SOURCES,
  ENEMY_GRENADE_WARNING_SEC,
  ENEMY_GRENADE_MAX_THROW_M,
} from '../src/game/m02-combat-ai.js';
import cellsBC from '../missions/m02-bzura/m02-cells-bc-layout.json' with { type: 'json' };

const DT = 0.1;
const SEED = 19390909;
const kill = (e) => Object.assign(e, { alive: false, state: 'DEAD', health: 0 });
/** Pátio a leste de B01, a ~6 m de DE-A08 (Sala de B01): ao alcance de uma granada de mão. */
const YARD = Object.freeze({ x: -23, z: -12 });

/** Área C com EC1 vencido e Piotr no pátio: o jogo abre C10 e o aviso de artilharia por condições de jogo (sem atalhos). */
function toC10(seed = SEED) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01' });
  sim.enterAreaCC09(); // preparação do cenário (como tests/m02-19)
  sim.enemies.forEach(kill);
  sim.player.x = -6;
  sim.player.z = -10;
  sim.drainEvents();
  return sim;
}

/** Corre ticks e recolhe os eventos de aviso e de explosão. */
function run(sim, seconds, { onTick = null } = {}) {
  const warnings = [];
  const blasts = [];
  for (let i = 0; i < Math.ceil(seconds / DT); i++) {
    onTick?.(i);
    sim.tick(DT, {});
    for (const e of sim.drainEvents()) {
      if (e.type === 'blast-warning') warnings.push(e);
      if (e.type === 'grenade-exploded') blasts.push(e);
    }
  }
  return { warnings, blasts };
}

describe('M02 D5: a janela de aviso é [5, 8] s', () => {
  it('constantes e dados do layout: o impacto fixo SP03 tem um aviso dentro da janela', () => {
    assert.deepEqual(BLAST_WARNING_SEC, { min: 5, max: 8 });
    assert.deepEqual([...BLAST_SOURCES].sort(), ['enemy_grenade', 'scripted_artillery']);
    const spec = cellsBC.cells.C.artilleryFixedImpact;
    assert.ok(spec.warningDurationSec >= BLAST_WARNING_SEC.min && spec.warningDurationSec <= BLAST_WARNING_SEC.max, `SP03: ${spec.warningDurationSec} s`);
    assert.ok(ENEMY_GRENADE_WARNING_SEC >= BLAST_WARNING_SEC.min && ENEMY_GRENADE_WARNING_SEC <= BLAST_WARNING_SEC.max);
  });

  it('fonte scripted_artillery (SP03, C10): do evento de aviso ao impacto passam [5, 8] s, na posição fixa do layout', () => {
    const sim = toC10();
    const { warnings, blasts } = run(sim, 12);
    assert.equal(warnings.length, 1, 'um só aviso');
    assert.equal(blasts.length, 1, 'um só impacto');
    const w = warnings[0];
    const b = blasts[0];
    const spec = cellsBC.cells.C.artilleryFixedImpact;
    assert.equal(w.source, 'scripted_artillery');
    assert.equal(w.thrownBy, null);
    assert.deepEqual([w.position.x, w.position.z], [spec.x, spec.z], 'posição do aviso = posição do layout');
    assert.equal(w.radius, spec.radius);
    assert.ok(w.warningSec >= BLAST_WARNING_SEC.min && w.warningSec <= BLAST_WARNING_SEC.max);
    assert.ok(w.impactAt - w.warnedAt >= BLAST_WARNING_SEC.min - 1e-6 && w.impactAt - w.warnedAt <= BLAST_WARNING_SEC.max + 1e-6);
    // o impacto liga-se ao aviso e cai onde foi avisado, no relógio de simulação, dentro da janela (mais, no máximo, um tick)
    assert.equal(b.source, 'scripted_artillery');
    assert.equal(b.blastId, w.blastId);
    assert.deepEqual([b.center.x, b.center.z], [w.position.x, w.position.z], 'a posição do impacto é a avisada');
    assert.equal(b.warningSkipped, undefined);
    const lead = b.clock - w.warnedAt;
    assert.ok(lead >= BLAST_WARNING_SEC.min && lead <= BLAST_WARNING_SEC.max + DT, `aviso → impacto: ${lead.toFixed(2)} s`);
    assert.equal(sim.hazardBlasts.length, 0, 'a explosão consumida sai da lista');
    assert.equal(sim.areaC.artilleryDetonated, true);
  });

  it('fonte enemy_grenade: o aviso do lançamento ao impacto também fica em [5, 8] s, com o lançador (causa situada) em ambos os eventos', () => {
    const sim = new M02BenchSimulation(SEED);
    const thrower = sim.enemies.find((e) => e.id === 'DE-A08');
    sim.teleportPlayer(YARD.x, YARD.z, 0);
    const target = { x: sim.player.x, z: sim.player.z };
    sim.drainEvents();
    const grenade = sim.throwEnemyGrenade(thrower, target);
    assert.ok(grenade);
    assert.equal(grenade.source, 'enemy_grenade');
    assert.equal(grenade.thrownBy, 'DE-A08');
    assert.equal(grenade.warningSec, ENEMY_GRENADE_WARNING_SEC);
    assert.equal(sim.hazardBlasts.length, 1);
    const emitted = sim.drainEvents().filter((e) => e.type === 'blast-warning');
    assert.equal(emitted.length, 1);
    const w = emitted[0];
    assert.equal(w.thrownBy, 'DE-A08');
    assert.deepEqual([w.position.x, w.position.z], [target.x, target.z]);
    assert.equal(w.warnedAt, Number(sim.clock.toFixed(3)));
    assert.ok(w.impactAt - w.warnedAt >= BLAST_WARNING_SEC.min && w.impactAt - w.warnedAt <= BLAST_WARNING_SEC.max);
    const { blasts } = run(sim, 10);
    assert.equal(blasts.length, 1);
    const b = blasts[0];
    assert.equal(b.source, 'enemy_grenade');
    assert.equal(b.thrownBy, 'DE-A08');
    assert.equal(b.blastId, w.blastId);
    const lead = b.clock - w.warnedAt;
    assert.ok(lead >= BLAST_WARNING_SEC.min - 0.01 && lead <= BLAST_WARNING_SEC.max + DT, `aviso → impacto: ${lead.toFixed(2)} s`);
    assert.equal(sim.hazardBlasts.length, 0);
  });

  it('o aviso pedido fora da janela é limitado a [5, 8] s; sem valor usa o ponto médio', () => {
    const sim = new M02BenchSimulation(SEED);
    const thrower = sim.enemies.find((e) => e.id === 'DE-A08');
    const target = { x: YARD.x, z: YARD.z };
    const lead = (warningSec) => sim.throwEnemyGrenade(thrower, target, warningSec === undefined ? {} : { warningSec });
    assert.equal(lead(1).warningSec, BLAST_WARNING_SEC.min);
    assert.equal(lead(0).warningSec, BLAST_WARNING_SEC.min);
    assert.equal(lead(-3).warningSec, BLAST_WARNING_SEC.min);
    assert.equal(lead(30).warningSec, BLAST_WARNING_SEC.max);
    assert.equal(lead(Infinity).warningSec, BLAST_WARNING_SEC.max);
    assert.equal(lead(5).warningSec, 5);
    assert.equal(lead(8).warningSec, 8);
    assert.equal(lead(7.25).warningSec, 7.25);
    assert.equal(lead(Number.NaN).warningSec, ENEMY_GRENADE_WARNING_SEC);
    assert.equal(lead(undefined).warningSec, ENEMY_GRENADE_WARNING_SEC);
    for (const b of sim.hazardBlasts) {
      assert.ok(b.impactAt - b.warnedAt >= BLAST_WARNING_SEC.min - 1e-6 && b.impactAt - b.warnedAt <= BLAST_WARNING_SEC.max + 1e-6);
    }
  });

  it('só lança um hostil vivo, combatente, desta simulação e ao alcance; fonte ou posição inválidas lançam RangeError', () => {
    const sim = new M02BenchSimulation(SEED);
    const thrower = sim.enemies.find((e) => e.id === 'DE-A08');
    const target = { x: thrower.x + 5, z: thrower.z };
    sim.drainEvents();
    assert.equal(sim.throwEnemyGrenade('DE-XX', target), null, 'id desconhecido');
    assert.equal(sim.throwEnemyGrenade({ ...thrower }, target), null, 'objeto que não é da simulação');
    assert.equal(sim.throwEnemyGrenade(thrower, { x: thrower.x + ENEMY_GRENADE_MAX_THROW_M + 1, z: thrower.z }), null, 'fora de alcance');
    assert.equal(sim.throwEnemyGrenade(thrower, { x: Number.NaN, z: 0 }), null);
    assert.equal(sim.throwEnemyGrenade(thrower, null), null);
    Object.assign(thrower, { nonCombatant: true });
    assert.equal(sim.throwEnemyGrenade(thrower, target), null, 'rendido/ferido não lança');
    Object.assign(thrower, { nonCombatant: false });
    kill(thrower);
    assert.equal(sim.throwEnemyGrenade(thrower, target), null, 'morto não lança');
    assert.equal(sim.hazardBlasts.length, 0);
    assert.equal(sim.drainEvents().filter((e) => e.type === 'blast-warning').length, 0, 'sem lançamento não há aviso');
    assert.throws(() => sim.scheduleBlastWarning({ source: 'magia', x: 0, z: 0 }), RangeError);
    assert.throws(() => sim.scheduleBlastWarning({ source: 'enemy_grenade', x: Number.NaN, z: 0 }), RangeError);
    assert.throws(() => sim.scheduleBlastWarning({ source: 'enemy_grenade', x: 0, z: 0, radius: 0 }), RangeError);
  });

  it('a granada do jogador (rastilho de 2 s) não gera aviso: o jogador não é alvo de uma explosão que ele próprio lança', () => {
    const sim = new M02BenchSimulation(SEED);
    sim.drainEvents();
    assert.ok(sim.throwGrenade());
    const { warnings, blasts } = run(sim, 4);
    assert.equal(warnings.length, 0);
    assert.equal(blasts.length, 1);
    assert.equal(blasts[0].source, undefined, 'registo de sempre, sem metadados de explosão agendada');
  });
});

describe('M02 D5: a posição do impacto é fixa e a explosão fere o que está na zona, não o que a esquiva', () => {
  it('SP03: Piotr atravessa o aviso a correr em todas as direções e o centro do impacto não se mexe', () => {
    const sim = toC10();
    const centers = [];
    const { warnings, blasts } = run(sim, 12, {
      onTick: (i) => {
        // Piotr anda à volta (nunca fica parado, nunca perseguido): o impacto tem de cair sempre no mesmo ponto
        const a = i * 0.7;
        sim.player.x = -6 + 10 * Math.cos(a);
        sim.player.z = -10 + 10 * Math.sin(a);
        sim.player.y = sim.world.heightAt(sim.player.x, sim.player.z);
        centers.push(sim.hazardBlasts.map((b) => [b.x, b.z]));
      },
    });
    assert.equal(warnings.length, 1);
    assert.equal(blasts.length, 1);
    for (const c of centers.filter((c) => c.length)) assert.deepEqual(c, [[4, 18]], 'a lista agendada nunca desloca o ponto');
    assert.deepEqual([blasts[0].center.x, blasts[0].center.z], [4, 18]);
  });

  it('granada inimiga: quem sai do raio durante o aviso não é ferido; quem fica é (a explosão tem efeito real, com distância)', () => {
    const stay = new M02BenchSimulation(SEED);
    const leave = new M02BenchSimulation(SEED);
    const target = { x: YARD.x, z: YARD.z };
    for (const sim of [stay, leave]) {
      sim.enemies.forEach((e) => { if (e.id !== 'DE-A08') kill(e); }); // só o lançador, sem tiros
      sim.enemies.find((e) => e.id === 'DE-A08').nonCombatant = false;
      sim.allies.forEach((a) => Object.assign(a, { x: 60, z: 60 })); // fora do raio e do alcance de tiro
      sim.teleportPlayer(target.x, target.z, 0);
      sim.player.health = 100;
      sim.throwEnemyGrenade('DE-A08', target);
    }
    const hpStay = stay.player.health;
    run(stay, 9);
    run(leave, 9, {
      onTick: (i) => {
        if (i === 10) leave.teleportPlayer(target.x + 20, target.z, 0); // Piotr sai do raio (6,5 m) durante o aviso
      },
    });
    assert.ok(stay.player.health < hpStay, `quem fica é ferido (${hpStay} → ${stay.player.health})`);
    assert.equal(leave.player.health, 100, 'quem sai do raio não é ferido: o impacto não o persegue');
  });
});

describe('M02 D5: explosões agendadas no snapshot, restauro e validador (campo aditivo do schema 2)', () => {
  const warned = () => {
    const sim = new M02BenchSimulation(SEED);
    sim.enemies.forEach((e) => { if (e.id !== 'DE-A08') kill(e); });
    sim.teleportPlayer(YARD.x, YARD.z, 0);
    assert.ok(sim.throwEnemyGrenade('DE-A08', { x: YARD.x + 1, z: YARD.z }));
    return sim;
  };

  it('restaurar a meio do aviso repõe a explosão agendada e a continuação é igual (o impacto cai à mesma hora; o aviso não se repete)', () => {
    const sim = warned();
    run(sim, 2);
    const snap = structuredClone(sim.snapshot());
    assert.equal(snap.hazardBlasts.length, 1);
    assert.equal(snap.hazardBlastSeq, 1);
    assert.equal(validateM02Snapshot(snap).valid, true);
    const ref = run(sim, 7);
    const fresh = new M02BenchSimulation(SEED + 1);
    fresh.restoreSnapshot(snap);
    fresh.drainEvents();
    assert.equal(fresh.hazardBlasts.length, 1);
    const again = run(fresh, 7);
    assert.equal(again.warnings.length, 0, 'o aviso não se emite outra vez depois de restaurar');
    assert.equal(again.blasts.length, 1);
    assert.deepEqual(again.blasts[0].center, ref.blasts[0].center);
    assert.equal(again.blasts[0].clock, ref.blasts[0].clock, 'mesma hora de impacto');
    assert.equal(JSON.stringify(fresh.snapshot()), JSON.stringify(sim.snapshot()), 'mesmo estado depois do impacto');
  });

  it('um snapshot sem os campos (saves anteriores) é válido e restaura sem explosões agendadas', () => {
    const sim = warned();
    const snap = structuredClone(sim.snapshot());
    delete snap.hazardBlasts;
    delete snap.hazardBlastSeq;
    assert.equal(validateM02Snapshot(snap).valid, true);
    const other = warned();
    other.restoreSnapshot(snap);
    assert.deepEqual(other.hazardBlasts, []);
    assert.equal(other.hazardBlastSeq, 0);
  });

  it('o validador recusa aviso fora de 5-8 s, fonte desconhecida, posição inválida, ids repetidos e contador inválido', () => {
    const sim = warned();
    const ok = sim.snapshot();
    assert.equal(validateM02Snapshot(ok).valid, true);
    const cases = [
      (s) => { s.hazardBlasts[0].impactAt = s.hazardBlasts[0].warnedAt + 3; s.hazardBlasts[0].warningSec = 3; },
      (s) => { s.hazardBlasts[0].impactAt = s.hazardBlasts[0].warnedAt + 12; s.hazardBlasts[0].warningSec = 12; },
      (s) => { s.hazardBlasts[0].impactAt = s.hazardBlasts[0].warnedAt + 7.5; }, // warningSec diz 6,5
      (s) => { s.hazardBlasts[0].source = 'magia'; },
      (s) => { s.hazardBlasts[0].x = 'norte'; },
      (s) => { s.hazardBlasts[0].radius = 0; },
      (s) => { s.hazardBlasts[0].warnedAt = s.clock + 5; s.hazardBlasts[0].impactAt = s.clock + 11.5; },
      (s) => { s.hazardBlasts[0].thrownBy = 7; },
      (s) => { s.hazardBlasts.push(structuredClone(s.hazardBlasts[0])); },
      (s) => { s.hazardBlasts = 'nenhuma'; },
      (s) => { s.hazardBlastSeq = -1; },
      (s) => { s.hazardBlasts = [null]; },
    ];
    for (const mutate of cases) {
      const bad = structuredClone(ok);
      mutate(bad);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, `deveria recusar: ${JSON.stringify(bad.hazardBlasts)}`);
      assert.match(r.reason, /hazardBlasts|Explosão agendada/);
    }
  });

  it('mudar de célula descarta as explosões agendadas (pertencem ao mundo em que foram avisadas)', () => {
    const sim = warned();
    assert.equal(sim.hazardBlasts.length, 1);
    sim.enterAreaBC06();
    assert.deepEqual(sim.hazardBlasts, []);
  });
});

describe('M02 D5: o atalho de bancada que rebenta já não finge o aviso', () => {
  it('startC10OrderChanges + detonateC10FixedArtillery no mesmo instante: impacto marcado warningSkipped e sem aviso pendente', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    sim.enterAreaCC09();
    sim.drainEvents();
    sim.runAtomicAction(() => {
      sim.startC10OrderChanges();
      sim.detonateC10FixedArtillery();
    });
    const events = sim.drainEvents();
    const blast = events.find((e) => e.type === 'grenade-exploded');
    assert.equal(blast.source, 'scripted_artillery');
    assert.equal(blast.warningSkipped, true, 'o atalho não cumpre o aviso e fica registado');
    assert.equal(sim.hazardBlasts.length, 0);
  });
});
