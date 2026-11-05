// M02 C06 (PDF p. 13) + D6 (p. 18): «Primeiro contacto combatível até 60 s de movimento». A entrada na Área B era terreno aberto com 7
// dos 12 defensores de EB1 com linha de tiro a 75-130 m: em soldado e veterano, a dt = 1/60, Piotr morria ~2 s depois de entrar (e a
// secção, com Gruca, levava o fogo todo). Agora a entrada tem uma JANELA DE SEGURANÇA como a de C02 (areaB.contact): EB1 «sem alerta» e a
// secção sem abrir fogo até o contacto abrir — pelo tiro/granada de Piotr, a ≤ 25 m de um defensor, ou 30-60 s depois de ele começar a
// andar. Testes de estado (entradas e relógio reais, dt = 1/60), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { C01_CONTACT_DELAY_SEC, C01_PROXIMITY_DETECTION_M } from '../src/game/m02-acts-director.js';
import { areaBContactPending } from '../src/game/m02-combat-ai.js';
import { createMemoryStorage } from '../src/game/m02-save-store.js';

const FRAME = 1 / 60;
const PROFILES = ['recruta', 'soldado', 'veterano'];
const SEED = 777;

/** Piotr acabado de entrar em B (célula B ativa, EB1 em jogo, secção ao pé dele). */
function enterB(difficulty = 'recruta', seed = SEED) {
  const sim = new M02BenchSimulation(seed, { startScene: 'C01', difficulty });
  sim.enterAreaBC06();
  assert.equal(sim.activeCellId, 'B');
  assert.equal(sim.areaB.contact.opened, false);
  return sim;
}
const eb1 = (sim) => sim.enemies.filter((e) => e.encounterId === 'EB1');
const run = (sim, seconds, controls = {}) => {
  for (let i = 0; i < Math.ceil(seconds / FRAME); i++) sim.tick(FRAME, controls);
};
const enemyHitsOnSide = (sim) => sim.combatLog.filter((e) => e.type === 'enemy_hit_ally');
/** Um passo curto (0,1 s a andar ≈ 0,4 m): o suficiente para a partir de 0,1 m do ponto de entrada contar como «começou a avançar». */
const stepOff = (sim) => run(sim, 0.1, { forward: 1 });

describe('M02 C06: a janela de segurança da entrada em B — nos 3 perfis, a dt = 1/60', () => {
  for (const difficulty of PROFILES) {
    it(`${difficulty}: parado à entrada durante 20 s, Piotr e a secção não levam um tiro; ninguém dispara (EB1 sem alerta, secção sem abrir fogo)`, () => {
      const sim = enterB(difficulty);
      const p = sim.player;
      // controlo: a janela é uma regra, não falta de visão — sete defensores têm linha de tiro e alcance ao ponto de entrada
      const seeing = eb1(sim).filter((e) => Math.hypot(e.x - p.x, e.z - p.z) <= (e.weapon === 'mg34' ? 98 : 180) && sim.world.lineOfSight(e, p, { includeFoliage: true }));
      assert.ok(seeing.length >= 5, `${seeing.length} defensores veem o ponto de entrada`);
      sim.drainEvents();
      run(sim, 20);
      assert.equal(sim.missionFailed, null);
      assert.equal(p.health, 100, 'nem um impacto');
      assert.deepEqual(enemyHitsOnSide(sim), [], 'ninguém foi atingido');
      for (const a of sim.allies) assert.equal(a.health, a.maxHealth, a.id);
      for (const e of eb1(sim)) {
        assert.equal(e.shotsFired, 0, `${e.id} não disparou`);
        assert.equal(e.seeingTargetId, null);
        assert.equal(e.memory, null);
        assert.equal(e.state, 'HOLD_SECTOR');
      }
      assert.equal(sim.allies.reduce((n, a) => n + (a.shotsFired ?? 0), 0), 0, 'a secção também não abre fogo antes do contacto');
      assert.equal(sim.drainEvents().filter((e) => e.type === 'actor-burst').length, 0);
      assert.equal(areaBContactPending(sim), true);
      assert.equal(sim.areaB.contact.movementStartedAt, null, 'sem movimento não há contagem');
    });

    it(`${difficulty}: o controlo — sem a janela (contacto já aberto) o mesmo ponto é fogo imediato e a vida de Piotr desce`, () => {
      const sim = enterB(difficulty);
      sim.areaB.contact = { movementStartedAt: 0, contactAt: 0, opened: true, openedAt: 0, openedBy: 'timer' };
      run(sim, 30);
      // sem disjunção (revisão adversarial): o controlo tem de ser hostil nos três perfis, não «alguma coisa mudou». Medido: 8-9
      // atiradores de EB1, ≥ 1 impacto em Piotr em 30 s (recruta 1 e 68 de vida; soldado/veterano 5 e morre) e impactos na secção.
      const eb1Shooters = eb1(sim).filter((e) => e.shotsFired > 0);
      assert.ok(eb1Shooters.length >= 5, `EB1 abre fogo com vários atiradores (${eb1Shooters.length})`);
      const hitsOnPiotr = enemyHitsOnSide(sim).filter((e) => e.targetId === 'piotr_sokol');
      assert.ok(hitsOnPiotr.length >= 1, 'EB1 acerta em Piotr');
      assert.ok(sim.player.health < 100, `a vida de Piotr desce (${sim.player.health})`);
      assert.ok(enemyHitsOnSide(sim).some((e) => e.targetId !== 'piotr_sokol'), 'e acerta na secção');
    });
  }
});

describe('M02 C06: como a janela fecha (contacto aberto)', () => {
  it('o atraso é sorteado UMA vez no primeiro avanço, em [30, 60) s, com o RNG da simulação: determinista e a semente muda-o', () => {
    const delays = new Set();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const sim = enterB('recruta', seed);
      run(sim, 3);
      assert.equal(sim.areaB.contact.movementStartedAt, null, 'parado: sem sorteio');
      const rngBefore = sim.rng.state;
      stepOff(sim);
      const c = sim.areaB.contact;
      assert.notEqual(c.movementStartedAt, null);
      assert.notEqual(sim.rng.state, rngBefore, 'consumiu o gerador');
      const delay = c.contactAt - c.movementStartedAt;
      assert.ok(delay >= C01_CONTACT_DELAY_SEC.min && delay < C01_CONTACT_DELAY_SEC.max, `atraso ${delay} em [30, 60)`);
      run(sim, 0.2, { forward: 1 });
      assert.equal(sim.areaB.contact.contactAt, c.contactAt, 'sorteado uma só vez');
      delays.add(c.contactAt);
    }
    assert.ok(delays.size >= 8, `os instantes variam com a semente (${delays.size}/10)`);
    const a = enterB('recruta', 42);
    const b = enterB('recruta', 42);
    for (const s of [a, b]) {
      run(s, 1);
      stepOff(s);
    }
    assert.deepEqual(a.areaB.contact, b.areaB.contact);
  });

  it('timer: Piotr dá um passo e fica quieto; EB1 mantém-se sem alerta até ao instante sorteado e então o contacto abre ("timer") e passa a combater', () => {
    const sim = enterB('soldado');
    stepOff(sim); // arranca o relógio do contacto (a partir de 0,1 m)
    const c = sim.areaB.contact;
    assert.ok(Math.hypot(sim.player.x - 0, sim.player.z - 85) >= 0.05);
    sim.drainEvents();
    const openAt = c.contactAt;
    while (sim.clock < openAt - 0.5) sim.tick(FRAME, {});
    assert.equal(c.opened, false);
    assert.equal(areaBContactPending(sim), true);
    assert.equal(enemyHitsOnSide(sim).length, 0);
    assert.equal(sim.allies.reduce((n, a) => n + (a.shotsFired ?? 0), 0), 0, 'até ao contacto a secção não disparou');
    assert.equal(eb1(sim).reduce((n, e) => n + e.shotsFired, 0), 0, 'nem EB1');
    while (sim.clock < openAt + 0.2) sim.tick(FRAME, {});
    assert.equal(c.opened, true);
    assert.equal(c.openedBy, 'timer');
    assert.ok(c.openedAt <= sim.clock && c.openedAt >= openAt - FRAME);
    assert.ok(sim.combatLog.some((e) => e.type === 'b_contact_opened' && e.by === 'timer'));
    assert.ok(c.openedAt - c.movementStartedAt < C01_CONTACT_DELAY_SEC.max + FRAME, 'D6: primeiro contacto combatível até 60 s de movimento');
    run(sim, 8);
    assert.equal(areaBContactPending(sim), false);
    assert.ok(eb1(sim).some((e) => e.shotsFired > 0), 'depois do contacto EB1 combate');
    // sem a disjunção «alguém dispara»: os DOIS lados combatem depois do contacto, cada um por si (a secção já não está calada)
    assert.ok(sim.allies.some((a) => (a.shotsFired ?? 0) > 0), 'e a secção também abre fogo');
  });

  it('proximidade: a ≤ 25 m de um defensor o contacto abre no mesmo tick (quem chega ao pé deles é visto)', () => {
    const sim = enterB('recruta');
    stepOff(sim);
    const target = eb1(sim).find((e) => e.id === 'DE-B11');
    sim.teleportPlayer(target.x - 20, target.z + 5, 0);
    assert.ok(Math.hypot(sim.player.x - target.x, sim.player.z - target.z) <= C01_PROXIMITY_DETECTION_M);
    sim.tick(FRAME, {});
    assert.equal(sim.areaB.contact.opened, true);
    assert.equal(sim.areaB.contact.openedBy, 'proximity');
  });

  it('um tiro ou uma granada de Piotr abrem o contacto já (a iniciativa é dele), mesmo antes de andar', () => {
    for (const [controls, by] of [[{ fire: true }, 'player_shot'], [{ grenade: true }, 'player_grenade']]) {
      const sim = enterB('veterano');
      sim.tick(FRAME, controls);
      const c = sim.areaB.contact;
      assert.equal(c.opened, true, by);
      assert.equal(c.openedBy, by);
      assert.equal(c.movementStartedAt, c.openedAt, 'também conta como o início do avanço');
      assert.equal(c.contactAt, c.openedAt);
    }
  });

  it('a janela só existe em B: em A (C01/C02) e em C não há contacto de B pendente; um save anterior (sem o campo) não a tem', () => {
    const a = new M02BenchSimulation(SEED, { startScene: 'C01' });
    assert.equal(areaBContactPending(a), false);
    const c = new M02BenchSimulation(SEED, { startScene: 'C01' });
    c.enterAreaBC06();
    c.enterAreaCC09();
    assert.equal(areaBContactPending(c), false);
    const b = enterB();
    delete b.areaB.contact; // como um snapshot anterior à correção
    assert.equal(areaBContactPending(b), false);
    run(b, 25);
    assert.ok(enemyHitsOnSide(b).length > 0 || eb1(b).some((e) => e.shotsFired > 0), 'sem janela, EB1 combate logo (comportamento de antes)');
  });
});

describe('M02 C06: snapshot, restauro e validador da janela (campo aditivo areaB.contact)', () => {
  it('a meio da janela o snapshot é válido e restaurar reproduz a continuação, incluindo o instante em que o contacto abre', () => {
    const sim = enterB('soldado');
    stepOff(sim);
    run(sim, 5);
    assert.equal(sim.areaB.contact.opened, false);
    const snap = structuredClone(sim.snapshot());
    assert.equal(validateM02Snapshot(snap).valid, true);
    assert.equal(snap.areaB.contact.opened, false);
    const other = new M02BenchSimulation(5);
    other.restoreSnapshot(snap);
    assert.deepEqual(other.areaB.contact, sim.areaB.contact);
    for (let i = 0; i < Math.ceil(65 / FRAME); i++) {
      sim.tick(FRAME, {});
      other.tick(FRAME, {});
    }
    assert.equal(sim.areaB.contact.opened, true);
    assert.equal(JSON.stringify(other.snapshot()), JSON.stringify(sim.snapshot()));
  });

  it('o validador recusa formas inválidas e aceita um snapshot de B anterior ao campo', () => {
    const sim = enterB();
    stepOff(sim);
    run(sim, 1);
    const ok = sim.snapshot();
    assert.equal(validateM02Snapshot(structuredClone(ok)).valid, true);
    const cases = [
      ['aberto sem openedBy', (c) => { Object.assign(c, { opened: true, openedAt: 1, openedBy: null }); }],
      ['openedBy inventado', (c) => { Object.assign(c, { opened: true, openedAt: 1, openedBy: 'magia' }); }],
      ['fechado com openedBy', (c) => { c.openedBy = 'timer'; }],
      ['opened não booleano', (c) => { c.opened = 'sim'; }],
      ['instante de início no futuro', (c) => { c.movementStartedAt = 9999; c.contactAt = 10020; }],
      ['contacto antes do início', (c) => { c.contactAt = c.movementStartedAt - 1; }],
      ['atraso para lá dos 60 s', (c) => { c.contactAt = c.movementStartedAt + 61; }],
      ['contactAt sem início', (c) => { c.movementStartedAt = null; }],
      ['instante negativo', (c) => { c.movementStartedAt = -1; }],
    ];
    for (const [label, mutate] of cases) {
      const bad = structuredClone(ok);
      mutate(bad.areaB.contact);
      const r = validateM02Snapshot(bad);
      assert.equal(r.valid, false, label);
      assert.match(r.reason, /areaB\.contact/, label);
    }
    const legacy = structuredClone(ok);
    delete legacy.areaB.contact;
    assert.equal(validateM02Snapshot(legacy).valid, true, 'um save de B anterior à janela continua válido');
    const other = new M02BenchSimulation(3);
    other.restoreSnapshot(legacy);
    assert.equal(areaBContactPending(other), false);
  });
});

// FIX (revisão adversarial): `openedAt` e `movementStartedAt` eram gravados com toFixed(3), que arredonda para cima; com o dt real de um
// frame (1/60 s) o instante ficava 0,1-0,5 ms à frente do relógio e o validador (`> clock + 1e-9`) recusava o checkpoint desse passo —
// um F5 no frame em que o avanço começa, ou logo a seguir a um tiro, perdia-se (10 de 30 desfasamentos). `instantAt` arredonda para baixo.
describe('M02 C06/C02: os instantes passados do contacto nunca ficam à frente do relógio (F5 logo a seguir não é recusado)', () => {
  const PRE_TICKS = Array.from({ length: 30 }, (_, i) => i);

  it('o início do avanço em B: em 30 desfasamentos do relógio, o instante gravado ≤ relógio e o F5 desse frame é aceite', () => {
    for (const pre of PRE_TICKS) {
      const sim = new M02BenchSimulation(5, { storage: createMemoryStorage() });
      for (let i = 0; i < pre; i++) sim.tick(FRAME, {});
      sim.enterAreaBC06();
      sim.drainEvents();
      let started = false;
      for (let i = 0; i < 600 && !started; i++) {
        sim.tick(FRAME, { forward: 1 });
        started = sim.areaB.contact.movementStartedAt !== null;
      }
      assert.equal(started, true, `desfasamento ${pre}: o avanço começou`);
      const c = sim.areaB.contact;
      assert.ok(c.movementStartedAt <= sim.clock, `desfasamento ${pre}: movementStartedAt ${c.movementStartedAt} ≤ relógio ${sim.clock}`);
      sim.drainEvents();
      sim.saveCheckpoint('cp_m02_manual');
      const rejected = sim.drainEvents().find((e) => e.type === 'checkpoint-rejected');
      assert.equal(rejected, undefined, `desfasamento ${pre}: F5 aceite (${rejected?.reason ?? ''})`);
    }
  });

  it('a abertura do contacto em B por um tiro fora do tick: openedAt ≤ relógio e o snapshot passa o validador, em 30 desfasamentos', () => {
    for (const pre of PRE_TICKS) {
      const sim = new M02BenchSimulation(7, { storage: createMemoryStorage() });
      sim.enterAreaBC06();
      for (let i = 0; i < 20 + pre; i++) sim.tick(FRAME, { forward: 1 });
      assert.equal(sim.areaB.contact.opened, false, 'ainda dentro da janela');
      sim.firePlayerWeapon(true);
      const c = sim.areaB.contact;
      assert.equal(c.opened, true);
      assert.equal(c.openedBy, 'player_shot');
      assert.ok(c.openedAt <= sim.clock, `desfasamento ${pre}: openedAt ${c.openedAt} ≤ relógio ${sim.clock}`);
      const snap = sim.snapshot();
      snap.checkpointId = 'cp_m02_manual';
      const v = validateM02Snapshot(snap);
      assert.equal(v.valid, true, `desfasamento ${pre}: ${v.reason}`);
    }
  });

  it('o mesmo em C01/C02 (c01Contact): início do avanço e abertura por tiro nunca à frente do relógio', () => {
    for (const pre of PRE_TICKS) {
      const sim = new M02BenchSimulation(3, { startScene: 'C01' });
      for (let i = 0; i < pre; i++) sim.tick(FRAME, {});
      for (let i = 0; i < 6; i++) sim.tick(FRAME, { forward: 1 });
      const c = sim.c01Contact;
      assert.notEqual(c.movementStartedAt, null);
      assert.ok(c.movementStartedAt <= sim.clock, `desfasamento ${pre}: movementStartedAt ${c.movementStartedAt} ≤ relógio ${sim.clock}`);
      sim.firePlayerWeapon(true);
      assert.equal(c.opened, true);
      assert.ok(c.openedAt <= sim.clock, `desfasamento ${pre}: openedAt ${c.openedAt} ≤ relógio ${sim.clock}`);
    }
  });
});
