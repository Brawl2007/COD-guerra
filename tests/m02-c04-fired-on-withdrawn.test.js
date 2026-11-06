// M02 C04 / I4 (PDF pp. 13, 34): `m02.fired_on_wounded` é «ação explícita após estado não combatente» e a consequência é só a fala de
// Gruca (K3 «Baixe a arma. Ele já não combate.»), «sem recompensa». Decisão (documentada em NON_COMBATANT_STATES): um tiro de Piotr que
// acerta num ferido desarmado (C04), num rendido (C03) ou num homem do posto EA0 já RETIRADO (D2: WITHDRAWN, vivo e fora de combate)
// marca a flag; quem ainda recua (WITHDRAWING: D2 diz combatente a andar para um destino) e um combatente em posição não a marcam.
// A nota do handoff de 2026-11-05 («um tiro num EA0 em WITHDRAWN não marca…») era imprecisa: o WITHDRAWN é `nonCombatant` e já marcava,
// mas nenhum teste o fixava. Testes de estado (tiros reais pela via de jogo), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation, validateM02Snapshot } from '../src/game/m02-01-simulation.js';
import { NON_COMBATANT_STATES, isNonCombatantTarget } from '../src/game/m02-combat-ai.js';
import { eyePosition } from '../src/world/spatial.js';

const SEED = 19390909;
const DT = 0.05;
const ea0Of = (sim) => sim.enemies.filter((e) => e.encounterId === 'EA0');
const kill = (e) => Object.assign(e, { alive: false, health: 0, state: 'DEAD' });

/** C01 com a secção desarmada, contacto aberto, dois do posto abatidos e os outros dois a recuar (D2). */
function withdrawingPost() {
  const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
  for (const a of sim.allies) Object.assign(a, { mag: 0, reserve: 0 });
  sim.tick(DT, { fire: true });
  const [a, b, c, d] = ea0Of(sim);
  kill(a);
  kill(b);
  let guard = 0;
  while ((c.state !== 'WITHDRAWING' || d.state !== 'WITHDRAWING') && guard++ < 200) sim.tick(DT, {});
  assert.equal(c.state, 'WITHDRAWING');
  return { sim, c, d };
}

/** Um tiro real de Piotr (firePlayerWeapon) ao peito do alvo, a 6 m, sem obstáculos. */
function shootAt(sim, target) {
  sim.teleportPlayer(target.x + 6, target.z, Math.PI);
  const eye = eyePosition(sim.player);
  const dx = target.x - eye.x;
  const dy = target.y + 1.2 - eye.y;
  const dz = target.z - eye.z;
  sim.player.angle = Math.atan2(dz, dx);
  sim.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  sim.weapon.mag = 5;
  sim.weapon.state = 'READY';
  const rec = sim.firePlayerWeapon(true, true);
  assert.equal(rec.hitKind, 'actor', 'pré-condição: o tiro acertou no ator');
  assert.equal(rec.hitId, target.id);
  return rec;
}

describe('M02 C04/I4: quem conta como «estado não combatente» para m02.fired_on_wounded', () => {
  it('a tabela: ferido desarmado, rendido e retirado; nunca o combatente nem o que ainda recua', () => {
    assert.deepEqual([...NON_COMBATANT_STATES], ['WOUNDED_UNARMED', 'SURRENDERED', 'WITHDRAWN']);
    assert.equal(isNonCombatantTarget({ state: 'WOUNDED_UNARMED', nonCombatant: true }), true);
    assert.equal(isNonCombatantTarget({ state: 'SURRENDERED', nonCombatant: true }), true);
    assert.equal(isNonCombatantTarget({ state: 'WITHDRAWN', nonCombatant: true }), true);
    assert.equal(isNonCombatantTarget({ state: 'WITHDRAWING', nonCombatant: false }), false, 'D2: combatente a andar');
    assert.equal(isNonCombatantTarget({ state: 'HOLD_SECTOR', nonCombatant: false }), false);
    assert.equal(isNonCombatantTarget({ state: 'ENGAGE_VISIBLE' }), false);
    assert.equal(isNonCombatantTarget(null), false);
  });

  it('um tiro num EA0 já retirado (WITHDRAWN) marca a flag, regista o estado no log e dá a fala de Gruca', () => {
    const { sim, c, d } = withdrawingPost();
    for (let i = 0; i < 800 && !(c.state === 'WITHDRAWN' && d.state === 'WITHDRAWN'); i++) sim.tick(DT, {});
    assert.equal(c.state, 'WITHDRAWN');
    assert.equal(c.nonCombatant, true);
    assert.equal(c.alive, true, 'vivo e fora de combate (D2)');
    assert.equal(sim.flags['m02.fired_on_wounded'], false, 'ninguém atirou ainda');
    assert.equal(sim.dialogue.hasTriggered('bz39_c04_05'), false);
    shootAt(sim, c);
    assert.equal(sim.flags['m02.fired_on_wounded'], true);
    assert.equal(sim.dialogue.hasTriggered('bz39_c04_05'), true, 'K3: «Baixe a arma. Ele já não combate.»');
    const logged = sim.combatLog.filter((e) => e.type === 'player_fired_on_wounded');
    assert.deepEqual(logged.map((e) => [e.actorId, e.state]), [[c.id, 'WITHDRAWN']]);
    assert.equal(validateM02Snapshot(sim.snapshot()).valid, true);
  });

  it('um tiro num EA0 que ainda recua (WITHDRAWING) é um tiro a um combatente: não marca a flag nem dá a fala', () => {
    const { sim, c } = withdrawingPost();
    assert.equal(c.nonCombatant, false);
    sim.dialogue.reset(); // a conversa de C01 não pode contar como a fala de C04
    shootAt(sim, c);
    assert.equal(sim.flags['m02.fired_on_wounded'], false);
    assert.equal(sim.dialogue.hasTriggered('bz39_c04_05'), false);
    assert.equal(sim.combatLog.some((e) => e.type === 'player_fired_on_wounded'), false);
  });

  it('um tiro num combatente em posição (EA0 ainda a combater) não marca a flag', () => {
    const sim = new M02BenchSimulation(SEED, { startScene: 'C01' });
    const [post, ...others] = ea0Of(sim);
    for (const e of others) kill(e); // sem tick entre isto e o tiro: só liberta a linha de tiro (o posto ainda não recuou)
    assert.equal(post.nonCombatant, false);
    shootAt(sim, post);
    assert.equal(sim.flags['m02.fired_on_wounded'], false);
  });

  it('o ferido desarmado do pomar (C04) e um rendido continuam a marcar a flag (comportamento de C04/C03 inalterado)', () => {
    const wounded = new M02BenchSimulation(SEED);
    const w = wounded.enemies.find((e) => e.c04Candidate);
    Object.assign(w, { state: 'WOUNDED_UNARMED', nonCombatant: true, crouched: true, eyeHeight: 1.08, health: 28 });
    wounded.teleportPlayer(w.x + 6, w.z, Math.PI);
    shootAt(wounded, w);
    assert.equal(wounded.flags['m02.fired_on_wounded'], true);

    const surrendered = new M02BenchSimulation(SEED);
    const s = surrendered.enemies.find((e) => e.id === 'DE-A13'); // reserva ao ar livre no pátio, sem alvo de calibração em cima
    Object.assign(s, { state: 'SURRENDERED', nonCombatant: true });
    surrendered.teleportPlayer(s.x + 6, s.z, Math.PI);
    shootAt(surrendered, s);
    assert.equal(surrendered.flags['m02.fired_on_wounded'], true);
  });
});
