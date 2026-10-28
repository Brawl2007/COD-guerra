import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02Session,M02_SAVE_KEY} from '../src/m02/m02-session.js';
const renderer={presentation:{unlockAudio(){},audio:{suspend(){}}}};
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}}
test('M02 session saves checkpoints across reload without changing the simulation save contract',()=>{
 const db=storage(),s=new M02BenchSimulation(),session=new M02Session(s,renderer,db);
 session.start();assert.equal(s.c01Active,true);assert.equal(session.playing,true);
 s.tick(.1,{});s.saveCheckpoint('proof');session.afterFrame();const stored=s.snapshot();
 const restored=new M02BenchSimulation(),other=new M02Session(restored,renderer,db);
 assert.equal(other.continue(),true);assert.deepEqual(restored.snapshot(),stored);
 other.pause();assert.equal(other.playing,false);other.resume();assert.equal(other.playing,true);
 db.setItem(M02_SAVE_KEY,'broken json');const before=restored.snapshot();
 assert.equal(other.continue(),false);assert.deepEqual(restored.snapshot(),before);
});

test('accessibility selected before starting is retained in the initial checkpoint and after restart',()=>{
 const db=storage(),sim=new M02BenchSimulation(),session=new M02Session(sim,renderer,db);
 sim.setAccessibilityOptions({subtitlesEnabled:false,directionalIndicatorsEnabled:false,reducedCameraShake:true});
 session.start();const selected=structuredClone(sim.audiovisual.accessibility);
 assert.equal(selected.subtitlesEnabled,false);assert.equal(selected.directionalIndicatorsEnabled,false);assert.equal(selected.reducedCameraShake,true);
 const checkpoint=sim.checkpoints.get('cp_m02_a_preparacao');assert.deepEqual(checkpoint.audiovisual.accessibility,selected);
 assert.equal(sim.drainEvents().filter(e=>e.type==='checkpoint-saved'&&e.checkpointId==='cp_m02_a_preparacao').length,1,'starting does not duplicate checkpoint events');
 sim.setAccessibilityOptions({subtitlesEnabled:true,directionalIndicatorsEnabled:true,reducedCameraShake:false});session.restart();
 assert.deepEqual(sim.audiovisual.accessibility,selected);
 const restored=new M02BenchSimulation(),other=new M02Session(restored,renderer,db);assert.equal(other.continue(),true);
 assert.deepEqual(restored.audiovisual.accessibility,selected);
});

test('starting with default accessibility keeps the original C01 snapshot and checkpoint events',()=>{
 const baseline=new M02BenchSimulation(),candidate=new M02BenchSimulation();
 baseline.reset('C01');const session=new M02Session(candidate,renderer,storage());session.start();
 assert.deepEqual(candidate.snapshot(),baseline.snapshot());
 assert.deepEqual(candidate.checkpoints.get('cp_m02_a_preparacao'),baseline.checkpoints.get('cp_m02_a_preparacao'));
 assert.deepEqual(candidate.drainEvents(),baseline.drainEvents());
});
