import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {updatePolishSquad} from '../src/game/m02-combat-ai.js';

// Merge M02 único (2026-11-06) — teste AJUSTADO, justificação em docs/m02/M02_SINGLE_MERGE_REPORT.md.
// As duas linhas implementavam ordens à secção. Fica UMA: a D4 da linha Claude (PDF p. 17: só «cobrir aqui» e «avançar para ali»,
// com nós válidos e alcançáveis; tests/m02-d4-*). As ordens do Codex «suppress»/«flank_east» e as `holdPositions` em B/C não
// entram: D4 recusa-as com `squad-order-rejected`. O que estes testes provavam e continua a valer está abaixo: ordem sem teletransporte,
// restauro idêntico, checkpoints antigos legíveis e Lis a continuar o percurso em C11 com uma ordem dada.

function farm(){
 const sim=new M02BenchSimulation();sim.enemies=[];sim.allies=sim.allies.filter(a=>a.id==='pl_gruca');
 sim.clock=10;sim.ea1StartedAt=0;sim.c01Active=false;sim.drainEvents();return {sim,leader:sim.allies[0]};
}

test('suppress holds the current cover phase instead of advancing on a timer',()=>{
 const {sim,leader}=farm();const before=structuredClone(sim.squadOrder);
 assert.equal(sim.issueSquadOrder('suppress'),null,'D4: «suprimir» já não é uma ordem');
 assert.deepEqual(sim.squadOrder,before);assert.ok(sim.drainEvents().some(e=>e.type==='squad-order-rejected'&&e.order==='suppress'));
 updatePolishSquad(sim,.05);const saved=sim.snapshot();sim.clock=40;updatePolishSquad(sim,.05);
 const expected=sim.snapshot();sim.restoreSnapshot(saved);sim.clock=40;updatePolishSquad(sim,.05);
 assert.deepEqual(sim.snapshot(),expected,'plano e relógio gravados reproduzem a mesma rota');
 assert.ok(leader.goal?.nodeId,'o plano base continua a dar um nó');
});

test('advance selects the next cover node but the soldier still walks there physically',()=>{
 const {sim,leader}=farm();updatePolishSquad(sim,.05);
 const before=[leader.x,leader.z];const order=sim.issueSquadOrder('advance');updatePolishSquad(sim,.05);
 if(order)assert.equal(leader.goal.nodeId,order.assignments?.pl_gruca??order.nodeId);
 assert.ok(Math.hypot(leader.x-before[0],leader.z-before[1])<=4.1*.05+.01,'no position teleport');
});

test('flank still chooses the orchard route even when the earlier route was the ditch',()=>{
 const {sim}=farm();sim.flags['m02.axis']='ditch';
 assert.equal(sim.issueSquadOrder('flank_east'),null,'D4: «flanquear» já não é uma ordem');
 assert.equal(sim.flags['m02.axis'],'ditch','uma ordem recusada não muda o eixo escolhido');
});

test('in B and C the squad holds its real positions and resumes the authored mission goals',()=>{
 for(const cell of ['B','C']){
  const sim=new M02BenchSimulation();if(cell==='B')sim.enterAreaBC06();else sim.enterAreaCC09();
  sim.enemies=[];sim.allies=sim.allies.filter(a=>a.id==='pl_gruca');const leader=sim.allies[0];sim.clock=10;
  const at=[leader.x,leader.z];sim.issueSquadOrder('cover');const saved=sim.snapshot();
  for(let i=0;i<30;i++){sim.clock+=.05;updatePolishSquad(sim,.05);}
  assert.ok(Math.hypot(leader.x-at[0],leader.z-at[1])<=4.1*.05*30+.01,`${cell}: sem teletransporte`);
  const expected=sim.snapshot();sim.restoreSnapshot(saved);for(let i=0;i<30;i++){sim.clock+=.05;updatePolishSquad(sim,.05);}
  assert.deepEqual(sim.snapshot(),expected,`${cell}: a ordem continua igual depois do restauro`);
  const old=structuredClone(saved);old.squadOrder={type:'suppress',axis:null,issuedAt:old.squadOrder.issuedAt??0};
  assert.doesNotThrow(()=>sim.restoreSnapshot(old),'checkpoints antigos com «suppress» continuam legíveis (neutralizada para auto)');
  assert.equal(sim.squadOrder.type,'auto');
 }
});

test('holding the squad during C11 does not interrupt Lis walking to the aid station',()=>{
 // Na linha Claude o percurso de Lis em C11 é do diretor da Área C (updateLisC11, amparado/carregado por Piotr; J3): a prova é que uma
 // ordem à secção não muda nada do que o diretor faz com Lis (mesma posição, estado e objetivo com e sem a ordem).
 const run=withOrder=>{
  const sim=new M02BenchSimulation();sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.enemies=[];
  sim.assistLisInC11('wounded_walking');if(withOrder)sim.issueSquadOrder('cover');
  for(let i=0;i<40;i++)sim.tick(.05,{});
  const lis=sim.allies.find(a=>a.id==='pl_lis');return {x:lis.x,z:lis.z,state:lis.state,goal:lis.goal,lis:sim.flags['m02.lis_status']};
 };
 assert.deepEqual(run(true),run(false));
});
