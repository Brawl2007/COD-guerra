import test from 'node:test';import assert from 'node:assert/strict';
import {M01Simulation,seconds} from '../src/game/m01-simulation.js';
import {M01AmbientDirector,seededVisualRandom} from '../src/render/m01-ambient.js';
import ambience from '../missions/m01-tczew/battlefield-ambience.json' with {type:'json'};
import {json} from './helpers/m01-determinism.js';
// T21 acceptance (roadmap): (a) no write, (b) determinism + own RNG, (c) continuation at 05:52 after real checkpoint/restore, (d) reads T22 battleReadout, cadences untouched.
const live=()=>{const s=new M01Simulation(1);s.tick(.05,{skip:true});s.battleClock=seconds('05:52:00');s.drainEvents();return s;};
const run=(sim,director,seconds_,quality='high')=>{for(let i=0;i<seconds_*20;i++){sim.tick(.05,{});sim.drainEvents();director.sample(sim,quality);}};

test('T21 a: N ambient updates leave sim.snapshot() deep-equal (no write)',()=>{
 const sim=live(),before=json(sim.snapshot()),d=new M01AmbientDirector();
 for(let i=0;i<400;i++)d.sample(sim,'high');
 assert.deepEqual(json(sim.snapshot()),before);
 // live simulation: the director sees the sim at moving clocks and the snapshot still matches an unobserved twin (see also d)
 const watched=live(),twin=live();
 for(let i=0;i<200;i++){watched.tick(.05,{});twin.tick(.05,{});watched.drainEvents();twin.drainEvents();d.sample(watched,'high');}
 assert.deepEqual(json(watched.snapshot()),json(twin.snapshot()));assert.ok(d.flashes>0);
});
test('T21 b: same seed -> same sequence; ambient never consumes sim.rng',()=>{
 const seq=seed=>{const d=new M01AmbientDirector(seed);return Array.from({length:600},(_,i)=>d.sampleHorizonFlash(i*.1,17000,'high'));};
 assert.deepEqual(seq(7),seq(7));assert.notDeepEqual(seq(7),seq(8));
 assert.equal(seededVisualRandom(5,3),seededVisualRandom(5,3));
 const sim=live(),rng=sim.rng.state,d=new M01AmbientDirector();
 for(let i=0;i<500;i++){sim.clock+=.05;d.sample(sim,'high');}
 assert.equal(sim.rng.state,rng);
 // flashes sit on the north horizon (north = -Z): z offset negative for every azimuth
 const [lo,hi]=[ambience.flash.northAzimuthDeg-ambience.flash.halfSpreadDeg,ambience.flash.northAzimuthDeg+ambience.flash.halfSpreadDeg];
 for(const f of seq(19390901).filter(f=>f.active)){assert.ok(f.azimuthDeg>=lo&&f.azimuthDeg<=hi);assert.ok(Math.sin(f.azimuthDeg*Math.PI/180)<0);}
});
test('T21 c: real checkpoint/restore at 05:52 continues with ambient.flashes>0 and identical flashes',()=>{
 const a=live(),save=json(a.snapshot()),b=new M01Simulation(2);b.restoreSnapshot(save);
 assert.equal(b.battleClock,seconds('05:52:00'));
 const da=new M01AmbientDirector(),db=new M01AmbientDirector();
 run(a,da,20);run(b,db,20);
 assert.ok(da.diagnostics.flashes>0);assert.equal(db.diagnostics.flashes,da.diagnostics.flashes);
 assert.deepEqual(db.diagnostics.horizonFlash,da.diagnostics.horizonFlash);
 assert.equal(json(a.snapshot()).clock,json(b.snapshot()).clock);
});
test('T21 d: reads battleReadout (never writes) and does not change real cadences',()=>{
 const plain=live(),watched=live(),d=new M01AmbientDirector();
 let reads=0;const real=Object.getOwnPropertyDescriptor(M01Simulation.prototype,'battleReadout').get;
 Object.defineProperty(watched,'battleReadout',{get(){reads++;return real.call(this);}});
 for(let i=0;i<400;i++){plain.tick(.05,{});watched.tick(.05,{});plain.drainEvents();watched.drainEvents();d.sample(watched,'high');}
 assert.ok(reads>0&&reads<=400*.05/ambience.readout.refreshSeconds+2,`throttled readout reads: ${reads}`);
 assert.ok(d.diagnostics.readout&&d.diagnostics.readout.boost<=ambience.readout.boostMax);
 assert.equal(JSON.stringify(watched.snapshot()),JSON.stringify(plain.snapshot()));
 assert.equal(watched.rng.state,plain.rng.state);
 // brightness may rise with the readout, timing may not
 const f0=d.sampleHorizonFlash(12.1,17000,'high',0),f1=d.sampleHorizonFlash(12.1,17000,'high',.25);
 assert.equal(f0.active,f1.active);
});
