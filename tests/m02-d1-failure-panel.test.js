// M02 D1 (PDF p. 16): «apresentar falha clara». A bancada só mostra a falha; o texto do painel vem de `missionFailed.reason` e
// `missionFailed.actorId` (a simulação decide, a bancada apresenta), em português: «Sgt. Gruca incapacitado…» e não uma frase genérica
// que fixe uma personagem. Testes de estado e de código-fonte da bancada (não há DOM em Node), não são playtest.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  M02BenchSimulation,
  M02_MISSION_FAILURE_REASONS,
  M02_MISSION_FAILURE_TEXT,
  describeMissionFailure,
} from '../src/game/m02-01-simulation.js';
import { M02_REQUIRED_CHARACTERS } from '../src/game/m02-acts-director.js';

const SEED = 19390909;
const DT = 0.05;

describe('M02 D1: texto do painel de falha a partir de reason e actorId', () => {
  it('personagem exigida: «Sgt. Gruca incapacitado» (nome curto da tabela), em português, com o motivo de ser falha', () => {
    const text = describeMissionFailure({ reason: 'required_character_incapacitated', at: 12.5, actorId: 'pl_gruca' });
    assert.match(text, /^Sgt\. Gruca incapacitado\./);
    assert.match(text, /exigida pelo roteiro/);
    assert.match(text, /a missão falhou/);
    assert.equal(/sierż|incapacitated|required/i.test(text), false, 'sem nomes polacos nem identificadores internos no ecrã');
  });

  it('cada personagem exigida tem nome curto em português e o texto usa-o (o painel não fixa o nome de uma só)', () => {
    for (const [id, who] of Object.entries(M02_REQUIRED_CHARACTERS)) {
      assert.equal(typeof who.shortName, 'string', id);
      assert.ok(who.shortName.length > 3, id);
      assert.ok(describeMissionFailure({ reason: 'required_character_incapacitated', at: 1, actorId: id }).startsWith(`${who.shortName} incapacitado`), id);
    }
  });

  it('Piotr morto: a frase própria, sem personagem; um actorId a mais não a muda', () => {
    const text = describeMissionFailure({ reason: 'piotr_killed', at: 3 });
    assert.equal(text, M02_MISSION_FAILURE_TEXT.piotr_killed);
    assert.match(text, /Piotr Sokół morreu/);
    assert.equal(describeMissionFailure({ reason: 'piotr_killed', at: 3, actorId: 'pl_gruca' }), text);
  });

  it('entradas inesperadas nunca lançam: razão desconhecida, actorId fora da tabela ou ausente, falha ausente', () => {
    assert.equal(describeMissionFailure(null), 'A missão falhou.');
    assert.equal(describeMissionFailure(undefined), 'A missão falhou.');
    assert.equal(describeMissionFailure({ reason: 'razao_nova', at: 1 }), 'A missão falhou.');
    assert.equal(describeMissionFailure({ reason: 'required_character_incapacitated', at: 1, actorId: 'pl_lis' }), M02_MISSION_FAILURE_TEXT.required_character_incapacitated);
    assert.equal(describeMissionFailure({ reason: 'required_character_incapacitated', at: 1 }), M02_MISSION_FAILURE_TEXT.required_character_incapacitated);
    assert.equal(describeMissionFailure({ reason: 'required_character_incapacitated', at: 1, actorId: '__proto__' }), M02_MISSION_FAILURE_TEXT.required_character_incapacitated);
    for (const reason of M02_MISSION_FAILURE_REASONS) assert.ok(describeMissionFailure({ reason, at: 1 }).length > 10, reason);
  });

  it('com a simulação: Gruca fora de combate dá missionFailed {reason, actorId} e o painel diz «Sgt. Gruca incapacitado»', () => {
    const sim = new M02BenchSimulation(SEED);
    Object.assign(sim.allies.find((a) => a.id === 'pl_gruca'), { alive: false, health: 0, state: 'DOWN' });
    sim.tick(DT, {});
    assert.equal(sim.missionFailed?.reason, 'required_character_incapacitated');
    assert.equal(sim.missionFailed?.actorId, 'pl_gruca');
    assert.match(describeMissionFailure(sim.missionFailed), /^Sgt\. Gruca incapacitado/);
    const dead = new M02BenchSimulation(SEED);
    dead.player.health = 0;
    dead.player.alive = false;
    dead.tick(DT, {});
    assert.equal(dead.missionFailed?.reason, 'piotr_killed');
    assert.match(describeMissionFailure(dead.missionFailed), /Piotr Sokół morreu/);
  });

  it('a bancada mostra o texto da simulação: usa describeMissionFailure(missionFailed) e o instante, não a tabela por razão', () => {
    const main = readFileSync(new URL('../src/m02/m02-01-main.js', import.meta.url), 'utf8');
    const html = readFileSync(new URL('../m02-01.html', import.meta.url), 'utf8');
    assert.match(main, /import \{[^}]*describeMissionFailure[^}]*\} from '\.\.\/game\/m02-01-simulation\.js'/);
    assert.match(main, /describeMissionFailure\(failure\)/);
    assert.match(main, /failure\.at\.toFixed\(1\)/);
    assert.equal(main.includes('M02_MISSION_FAILURE_TEXT[failure.reason]'), false, 'a frase já não se escolhe só pela razão');
    assert.match(html, /id="mission-failed-text"/);
    assert.match(html, /<h2>Missão falhada<\/h2>/);
  });
});
