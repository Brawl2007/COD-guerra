import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02Session,M02_SAVE_KEY} from '../src/m02/m02-session.js';
const renderer={presentation:{unlockAudio(){},audio:{suspend(){}}}};
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),keys:()=>m.keys()}}
// Merge M02 único: a sessão usa a loja v2 da simulação (UM gestor de save); o armazenamento entra pela simulação, não pela sessão.
const simWith=db=>new M02BenchSimulation(19390909,{storage:db});
test('M02 session saves checkpoints across reload without changing the simulation save contract',()=>{
 const db=storage(),s=simWith(db),session=new M02Session(s,renderer,db);
 session.start();assert.equal(s.c01Active,true);assert.equal(session.playing,true);
 s.tick(.1,{});s.saveCheckpoint('proof');session.afterFrame();const stored=s.snapshot();
 const restored=simWith(db),other=new M02Session(restored,renderer,db);
 assert.equal(other.continue(),true);assert.deepEqual(restored.snapshot(),stored);
 assert.equal(db.getItem('cod-guerra:checkpoint:m02:v1'),null,'a sessão nunca grava a chave v1 do Codex');
 other.pause();assert.equal(other.playing,false);other.resume();assert.equal(other.playing,true);
 // A loja v2 recorre ao slot :previous quando o atual está ilegível (FIX-2b); para provar a recusa estragam-se os dois.
 db.setItem(M02_SAVE_KEY,'broken json');db.setItem(`${M02_SAVE_KEY}:previous`,'broken json');const before=restored.snapshot();
 assert.equal(other.continue(),false);assert.deepEqual(restored.snapshot(),before);
});

test('accessibility selected before starting is retained in the initial checkpoint and after restart',()=>{
 const db=storage(),sim=simWith(db),session=new M02Session(sim,renderer,db);
 sim.setAccessibilityOptions({subtitlesEnabled:false,directionalIndicatorsEnabled:false,reducedCameraShake:true});
 session.start();const selected=structuredClone(sim.audiovisual.accessibility);
 assert.equal(selected.subtitlesEnabled,false);assert.equal(selected.directionalIndicatorsEnabled,false);assert.equal(selected.reducedCameraShake,true);
 // Merge M02 único (FIX-2b, PDF I5): a acessibilidade é configuração separada, fora do save; o checkpoint não a leva e o
 // restauro não a reverte. O que o Codex provava aqui (a escolha sobrevive a iniciar/reiniciar/continuar) continua provado abaixo.
 const checkpoint=sim.checkpoints.get('cp_m02_a_preparacao');assert.equal(checkpoint.audiovisual.accessibility,undefined);
 assert.equal(sim.drainEvents().filter(e=>e.type==='checkpoint-saved'&&e.checkpointId==='cp_m02_a_preparacao').length,1,'starting does not duplicate checkpoint events');
 sim.setAccessibilityOptions({subtitlesEnabled:true,directionalIndicatorsEnabled:true,reducedCameraShake:false});session.restart();
 // I5: reiniciar o checkpoint não reverte a configuração que o jogador acabou de escolher.
 assert.deepEqual({...sim.audiovisual.accessibility,subtitlesEnabled:true,directionalIndicatorsEnabled:true,reducedCameraShake:false},sim.audiovisual.accessibility);
 sim.setAccessibilityOptions(selected);assert.deepEqual(sim.audiovisual.accessibility,selected);
 const restored=simWith(db);restored.setAccessibilityOptions(selected);const other=new M02Session(restored,renderer,db);assert.equal(other.continue(),true);
 assert.deepEqual(restored.audiovisual.accessibility,selected,'continuar não reverte a configuração escolhida');
});

test('starting with default accessibility keeps the original C01 snapshot and checkpoint events',()=>{
 const baseline=new M02BenchSimulation(),candidate=new M02BenchSimulation();
 baseline.reset('C01');const session=new M02Session(candidate,renderer,storage());session.start();
 assert.deepEqual(candidate.snapshot(),baseline.snapshot());
 assert.deepEqual(candidate.checkpoints.get('cp_m02_a_preparacao'),baseline.checkpoints.get('cp_m02_a_preparacao'));
 assert.deepEqual(candidate.drainEvents(),baseline.drainEvents());
});
