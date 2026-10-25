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
