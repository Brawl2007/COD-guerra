import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,seconds} from '../src/game/m01-simulation.js';
import {M01View} from '../src/render/m01-view.js';
import {validRound} from '../src/game/m01-fire.js';
import {DISPLAY_CAP,DISPLAY_TRACER_CAP,DISPLAY_FLASH_SEC,DISPLAY_SEED_XOR,READOUT_WINDOW_SEC,createDisplayFire,displaySeed,displayProfiles,
  normalizeDisplayProfile,updateDisplayFire} from '../src/game/m01-display-fire.js';
import {route,driver,toRepair} from './helpers/m01-route.js';
import {compareContinuation,firstDifference,json} from './helpers/m01-determinism.js';

// T22 M01-BATTLE-READOUT-DISPLAY-ROUNDS-V1. Display fire is plumbing: no mission data uses it yet, so every behaviour test injects a synthetic
// profile (sim.display.profiles). The proofs that matter are isolation ones: with display fire running the main RNG stream, every actor,
// the player, enemyFire, flags and events stay equal to a simulation without it. The golden fixture (m01-animation-contract) covers the default.
// The twelve `route seed N` tests each run a full route (about 80 s on a slow aarch64 board). Environment switches:
//   M01_DISPLAY_FIRE_SEEDS=19390901,1,2   run only these seeds (default: 19390901 and 1..11)
//   M01_DISPLAY_FIRE_REPORT=<file>        write the per-seed sweep (RNG stream hashes, window and round counts) as JSON
const E=name=>`evt_m01_${name}`;
const EVENT_IDS=new Set(definition.events.map(e=>e.id));
const report={task:'M01-BATTLE-READOUT-DISPLAY-ROUNDS-V1',node:process.version,arch:process.arch,routes:[]};
after(()=>{if(process.env.M01_DISPLAY_FIRE_REPORT)writeFileSync(process.env.M01_DISPLAY_FIRE_REPORT,JSON.stringify(report,null,2)+'\n');});
const SEEDS=process.env.M01_DISPLAY_FIRE_SEEDS?process.env.M01_DISPLAY_FIRE_SEEDS.split(',').map(Number):[19390901,1,2,3,4,5,6,7,8,9,10,11];
const keysOf=(o,out=[])=>{if(o&&typeof o==='object')for(const [k,v] of Object.entries(o)){out.push(k);keysOf(v,out);}return out;};
const deepFreeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);Object.values(o).forEach(deepFreeze);}return o;};
const norm=p=>normalizeDisplayProfile(p,{events:EVENT_IDS});

// Profiles used on the real simulation: east bank, west bank (rounds that fly straight over the player's section), an armoured-train
// style fixed origin, allies as shooters, and a group target. Shooters are distinct across profiles.
const SYNTH=[
  {id:'dp_test_dike_mg',shooters:['de_east_14','de_east_15','de_east_20','de_east_30'],weapon:'mg34',rounds:[4,7],intervalSec:[2,5],tracerEvery:2,
    targetBox:[995,1045,-5,45],from:E('train963_arrives'),until:E('east_demolition')},
  {id:'dp_test_dike_vs_platoon',shooters:['de_east_21','de_east_22'],weapon:'kar98k',rounds:[1,1],intervalSec:[3,6],tracerEvery:1,
    targetGroup:'grp_east_platoon',from:E('train963_arrives')},
  {id:'dp_test_gate_at_west',shooters:['de_east_2','de_east_3','de_east_4'],weapon:'kar98k',rounds:[3,5],intervalSec:[1,3],tracerEvery:1,
    targetBox:[-300,-10,0,60],from:E('train963_arrives')},
  {id:'dp_test_squad_east',shooters:['marek_zielinski','szymon_kowal','pawel_krawiec'],weapon:'ckm_wz30',rounds:[5,9],intervalSec:[2,6],tracerEvery:3,
    targetBox:[995,1045,-5,45]},
  {id:'dp_test_train',origin:[1119,3.5,20],weapon:'pz7_75mm',rounds:[1,1],intervalSec:[6,12],tracerEvery:1,targetBox:[995,1045,-5,45],from:E('panzerzug_arrives')},
].map(norm);
const OWNER=new Map(SYNTH.flatMap(p=>(p.shooters??[p.id]).map(who=>[who,p.id])));
/** A simulation whose display list carries the given profiles (the data is assigned after reset, which is the injection seam). */
const profiledClass=profiles=>class extends M01Simulation{reset(seed){super.reset(seed);this.display.profiles=profiles;}};

// ---------------------------------------------------------------- data and validation
test('mission data carries no display profiles yet, so the default simulation has none',()=>{
  assert.deepEqual(displayProfiles(definition),[]);
  assert.ok(!definition.groups.some(g=>g.displayFire!==undefined));
  assert.deepEqual(new M01Simulation(1).display.profiles,[]);
});

test('profiles are validated, defaulted and frozen; malformed authoring data is rejected',()=>{
  const good={id:'p',shooters:['a'],weapon:'mg34',rounds:[4,7],intervalSec:[1,2],targetBox:[0,10,0,10]};
  const p=norm(good);
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.rounds)&&Object.isFrozen(p.targetBox)&&Object.isFrozen(p.shooters));
  assert.equal(p.interval,.075);assert.equal(p.tracerEvery,0);assert.deepEqual(p.bias,[2,1.4]);assert.deepEqual(p.cone,[.7,.5]);
  assert.deepEqual(norm({...good,shooters:undefined,origin:[1,2,3]}).origin,[1,2,3]);
  const bad=[{},{...good,id:''},{...good,shooters:[]},{...good,shooters:undefined},{...good,origin:[1,2,3]},{...good,weapon:''},{...good,rounds:[0,3]},{...good,rounds:[3,2]},
    {...good,rounds:[1.5,3]},{...good,rounds:[1,31]},{...good,intervalSec:[0,1]},{...good,intervalSec:[2,1]},{...good,interval:0},{...good,tracerEvery:-1},
    {...good,tracerEvery:1.5},{...good,targetBox:undefined},{...good,targetBox:[1,0,0,1]},{...good,targetBox:[0,1,0]},{...good,targetGroup:'g'},
    {...good,targetBox:undefined,targetGroup:''},{...good,targetBox:undefined,targetIds:[]},{...good,from:'evt_m01_no_such_event'},{...good,until:7},
    {...good,bias:[-1,0]},{...good,cone:[0]},{...good,shooters:undefined,origin:[1,2]}];
  for(const b of bad)assert.throws(()=>norm(b),/displayFire/,JSON.stringify(b));
});

test('displayProfiles reads groups[].displayFire, checks event ids and rejects duplicate ids',()=>{
  const withProfile=(...profiles)=>({...definition,groups:definition.groups.map(g=>g.id==='grp_de_east'?{...g,displayFire:profiles}:g)});
  const raw={id:'p1',shooters:['de_east_14'],weapon:'mg34',rounds:[4,7],intervalSec:[7,15],tracerEvery:1,targetGroup:'grp_east_platoon',from:E('train963_arrives'),until:E('east_platoon_withdraws')};
  const read=displayProfiles(withProfile(raw));
  assert.equal(read.length,1);assert.equal(read[0].id,'p1');assert.ok(Object.isFrozen(read[0]));
  assert.throws(()=>displayProfiles(withProfile({...raw,from:'evt_m01_typo'})),/displayFire/);
  assert.throws(()=>displayProfiles(withProfile(raw,raw)),/duplicate/);
});

test('the display RNG is a separate stream: construction mixes only the seed, restore also mixes the clock tick',()=>{
  assert.equal(displaySeed(12345),(12345^DISPLAY_SEED_XOR)>>>0);assert.equal(DISPLAY_SEED_XOR,0x5bd1e995);
  assert.equal(displaySeed(12345,10),(12345^0x5bd1e995^200)>>>0);
  for(const rng of [0,1,194409,19390901,0x7fffffff,0x80000000,0xffffffff])for(const clock of [undefined,0,.05,333.35,1048.8]){
    const s=displaySeed(rng,clock);assert.ok(Number.isInteger(s)&&s>=0&&s<=0xffffffff);
  }
  assert.notEqual(displaySeed(7,10),displaySeed(7,10.05));
  for(const seed of [19390901,1,11]){
    const s=new M01Simulation(seed);
    assert.equal(s.display.rng.state,displaySeed(seed));assert.notEqual(s.display.rng,s.rng);assert.notEqual(s.display.rng.state,s.rng.state);
  }
});

// ---------------------------------------------------------------- the module with a synthetic read-only view
const man=(id,x,z,extra={})=>({id,space:'metres',x,y:0,z,team:'enemy',health:100,alive:true,active:true,state:'GUARD',facing:0,shot:0,radius:.3,crouched:false,suppressedUntil:0,cooldown:0,...extra});
const MG={id:'mg',shooters:['s1','s2'],weapon:'mg34',rounds:[6,6],intervalSec:[1,2],tracerEvery:3,targetBox:[1000,1040,0,40]};
/** Drives updateDisplayFire at 20 Hz on a fake view; `seen` keeps every round ever listed (they are dropped on arrival). */
function bench(profiles,{actors=[man('s1',100,0),man('s2',100,10)],seed=1234,events=new Set(),freeze=false}={}){
  const display=createDisplayFire(seed,profiles.map(p=>normalizeDisplayProfile(p)));if(freeze)deepFreeze(actors);
  const b={display,actors,events,clock:0,seen:new Map(),max:0,
    step(n=1,dt=.05){
      for(let i=0;i<n;i++){
        b.clock+=dt;const view={clock:b.clock,battleClock:b.clock,actors,consumedEvent:id=>events.has(id),heightAt:()=>0};
        updateDisplayFire(display,freeze?Object.freeze(view):view,dt);
        b.max=Math.max(b.max,display.rounds.length);
        for(const r of display.rounds)if(!b.seen.has(r.id))b.seen.set(r.id,r);
      }
      return b;
    },
    run(sec,dt=.05){return b.step(Math.round(sec/dt),dt);}};
  return b;
}
const idNumber=r=>Number(r.id.slice('m01_display_'.length));

test('display rounds have the gameplay round shape, are frozen, never enter the saved list, and vanish on arrival with nothing happening',()=>{
  const b=bench([{...MG,from:'evt_go',until:'evt_stop'}],{freeze:true});b.events.add('evt_go');b.run(40);
  assert.ok(b.seen.size>=30);
  for(const r of b.seen.values()){
    assert.equal(r.kind,'display');assert.match(r.id,/^m01_display_\d+$/);assert.ok(['s1','s2'].includes(r.by));assert.equal(r.weapon,'mg34');
    assert.equal(r.victim,null);assert.ok(Object.isFrozen(r));assert.equal(typeof r.tracer,'boolean');
    for(const k of ['ox','oy','oz','ax','ay','az','h','firedAt','arriveAt'])assert.ok(Number.isFinite(r[k]),k);
    assert.ok(r.arriveAt>r.firedAt&&r.h>=0);
    assert.ok(!validRound(r,r.firedAt),'display rounds are not valid enemyFire rounds');
    assert.equal(r.tracer,[2,5].includes(idNumber(r)%6),'every third round of a six-round burst carries a tracer');
    assert.ok(r.ox===100&&r.oz===(r.by==='s1'?0:10)&&r.oy>0,'origin is the shooter eye');
  }
  // rounds of one burst are interval apart; each shooter's flash record is the latest round already fired
  const flashed=new Map();for(const r of b.seen.values())if(r.firedAt<=b.clock)flashed.set(r.by,Math.max(flashed.get(r.by)??-Infinity,r.firedAt));
  assert.deepEqual(b.display.firedAt,Object.fromEntries(flashed));
  for(const t of Object.values(b.display.firedAt))assert.ok(t<=b.clock);
  b.events.add('evt_stop');b.run(5);   // nothing is produced any more; every round has arrived and been dropped
  assert.equal(b.display.rounds.length,0);
  assert.equal(b.display.skipped,0);
});

test('a profile fires only between its from and until events',()=>{
  const b=bench([{...MG,from:'evt_go',until:'evt_stop'}]);
  b.run(10);assert.equal(b.display.nextId,0,'closed before from');assert.deepEqual(b.display.cooldown,{},'no cooldown starts before from');
  b.events.add('evt_go');b.run(10);assert.ok(b.display.nextId>0);
  const made=b.display.nextId;b.events.add('evt_stop');b.run(10);assert.equal(b.display.nextId,made,'nothing new after until');
});

test('only living, active, free, unsuppressed shooters fire, and a shooter coming back waits for a fresh staggered cooldown',()=>{
  for(const [name,patch] of Object.entries({dead:{alive:false},inactive:{active:false},wounded:{state:'WOUNDED'},down:{state:'DOWN'},safe:{state:'reached_safety'},carried:{carriedBy:'s2'},suppressed:{suppressedUntil:1e9}})){
    const b=bench([MG],{actors:[man('s1',100,0,patch),man('s2',100,10)]}).run(40);
    assert.ok(b.seen.size>0&&[...b.seen.values()].every(r=>r.by==='s2'),name);
  }
  const actors=[man('s1',100,0,{alive:false})],b=bench([{...MG,shooters:['s1']}],{actors}).run(5);
  assert.equal(b.display.nextId,0);actors[0].alive=true;b.step();
  assert.equal(b.display.nextId,0,'the first burst after returning is not immediate');b.run(3);assert.ok(b.display.nextId>0);
  assert.deepEqual(Object.keys(b.display.firedAt),['s1']);
});

test('targets: living members of a group, listed ids or a box; no living target means no fire; a fixed origin needs no actor',()=>{
  const exact={bias:[0,0],cone:[0,0]},tgt=(id,x,extra={})=>man(id,x,20,{team:'ally',group:'grp_x',...extra});
  const pool=[man('s1',100,0),tgt('t1',1000),tgt('t2',1010,{alive:false}),tgt('t3',1020,{active:false}),tgt('t4',1030,{crouched:true})];
  for(const spec of [{targetGroup:'grp_x'},{targetIds:['t1','t2','t3','t4']}]){
    const b=bench([{...MG,...exact,shooters:['s1'],rounds:[1,1],intervalSec:[.05,.1],...spec,targetBox:undefined}],{actors:pool}).run(60);
    const aims=new Set([...b.seen.values()].map(r=>`${r.ax},${r.ay},${r.az}`));
    assert.deepEqual([...aims].sort(),['1000,1.1,20','1030,0.75,20'],JSON.stringify(spec));   // dead and inactive men are never targeted
  }
  const box=bench([{...MG,...exact,shooters:['s1'],rounds:[1,1],intervalSec:[.05,.1],targetBox:[1000,1040,5,15]}],{actors:[man('s1',100,0)]}).run(60);
  assert.ok(box.seen.size>20);
  for(const r of box.seen.values())assert.ok(r.ax>=1000&&r.ax<=1040&&r.az>=5&&r.az<=15&&r.ay===1,'box point, ground (0 in this view) plus one metre');
  const none=bench([{...MG,shooters:['s1'],targetBox:undefined,targetGroup:'grp_x'}],{actors:[man('s1',100,0),tgt('t2',1010,{alive:false})]}).run(30);
  assert.equal(none.display.nextId,0);assert.equal(none.display.skipped,0);
  const train=bench([{id:'train',origin:[1119,3.5,20],weapon:'pz7_75mm',rounds:[1,1],intervalSec:[1,2],targetBox:[1000,1040,0,40]}],{actors:[]}).run(20);
  assert.ok(train.seen.size>=5);
  for(const r of train.seen.values()){assert.equal(r.by,'train');assert.deepEqual([r.ox,r.oy,r.oz],[1119,3.5,20]);assert.equal(r.weapon,'pz7_75mm');}
  assert.ok(Object.hasOwn(train.display.firedAt,'train'));
});

test('the display stream is deterministic per seed, differs between seeds, and an empty profile list never draws',()=>{
  const run=seed=>JSON.stringify(bench([MG],{seed}).run(60).display.rounds);
  assert.equal(run(1234),run(1234));assert.notEqual(run(1234),run(4321));
  const idle=bench([],{});const state=idle.display.rng.state;idle.run(30);
  assert.equal(idle.display.rng.state,state);assert.deepEqual(idle.display.rounds,[]);
  const closed=bench([{...MG,from:'evt_never'}]);const before=closed.display.rng.state;closed.run(30);assert.equal(closed.display.rng.state,before,'a closed profile draws nothing');
});

test('the module reads a deeply frozen view: it writes nothing to actors or to the view',()=>{
  const b=bench([MG,{id:'g',shooters:['s2'],weapon:'kar98k',rounds:[1,2],intervalSec:[1,2],targetGroup:'grp_x'}],
    {actors:[man('s1',100,0),man('s2',100,10),man('t1',1000,20,{group:'grp_x'})],freeze:true});
  b.run(60);assert.ok(b.seen.size>0);   // a write to a frozen actor or view would have thrown in strict mode
});

test('the cap holds: a burst that does not fit is skipped whole, never truncated',()=>{
  const flood={id:'flood',shooters:Array.from({length:20},(_,i)=>`f${i}`),weapon:'mg34',rounds:[7,7],intervalSec:[.05,.1],targetBox:[1500,1600,0,40]};
  const b=bench([flood],{actors:flood.shooters.map((id,i)=>man(id,100,i))});
  for(let i=0;i<400;i++){b.step();assert.ok(b.display.rounds.length<=DISPLAY_CAP,`tick ${i}: ${b.display.rounds.length} rounds`);}
  assert.equal(DISPLAY_CAP,120);assert.ok(b.display.skipped>0,'the skip branch ran');assert.ok(b.max>=DISPLAY_CAP-7,`the list actually filled up (max ${b.max})`);
  assert.equal(b.seen.size%7,0);
  const bursts=new Map();for(const r of b.seen.values()){const k=Math.floor(idNumber(r)/7);bursts.set(k,[...(bursts.get(k)??[]),r]);}
  for(const [k,rounds] of bursts){assert.equal(rounds.length,7,`burst ${k}`);assert.equal(new Set(rounds.map(r=>r.by)).size,1);}
  assert.equal(bursts.size,b.display.nextId/7);
});

test('the module cannot reach the main RNG, the world trace, events or the clock by construction',()=>{
  const source=readFileSync(new URL('../src/game/m01-display-fire.js',import.meta.url),'utf8').replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
  assert.ok(!/Math\.random|Date\b|performance\b|setTimeout|setInterval/.test(source));
  assert.ok(!/\b(traceRound|traceShot|traceObstruction|lineOfSight|closestApproach|validRound|recordHit|recordDeath|recordSuppression|recordDamage)\b/.test(source));
  assert.ok(!/\.emit\(|\bemit\b/.test(source));
  for(const m of source.matchAll(/(\w+)\.rng\b/g))assert.equal(m[1],'display','only the display stream is ever used');
  assert.ok(!/\bthis\b/.test(source),'pure functions over {display, view}');
});

// ---------------------------------------------------------------- the simulation
test('without profiles nothing is drawn and nothing is saved; the getters leave the simulation untouched',()=>{
  const s=new M01Simulation(19390901);s.tick(.05,{skip:true});for(let i=0;i<300;i++)s.tick(.05,{});
  assert.deepEqual(s.displayFire,{rounds:[],firedAt:{},skipped:0,nextId:0});
  const before=JSON.stringify(s.snapshot()),rng=s.rng.state,displayRng=s.display.rng.state;
  void s.displayFire;void s.battleReadout;
  assert.equal(JSON.stringify(s.snapshot()),before);assert.equal(s.rng.state,rng);assert.equal(s.display.rng.state,displayRng);
  const save=s.snapshot();assert.ok(save.resumeCheckpoint,'the save carries a nested checkpoint, scanned below too');
  assert.ok(!keysOf(save).some(k=>/display/i.test(k)));assert.ok(!keysOf(s.snapshot(false)).some(k=>/display/i.test(k)));
  const readonly=s.displayFire;readonly.rounds.push({});readonly.firedAt.x=1;assert.deepEqual(s.displayFire.rounds,[]);assert.deepEqual(s.displayFire.firedAt,{});
});

test('battleReadout is computed on every read from existing state, with the designed fields, and is never stored',()=>{
  const s=new M01Simulation(19390901);s.tick(.05,{skip:true});
  const first=s.battleReadout;
  assert.deepEqual(Object.keys(first).sort(),['battleClock','clock','flags','phase','recentBlasts','scene','sectors']);
  assert.deepEqual(Object.keys(first.flags).sort(),['panzerzug','raid','stukas','train963']);
  assert.deepEqual(Object.keys(first.sectors),definition.sectors.map(x=>x.id));
  for(const e of Object.values(first.sectors)){
    assert.deepEqual(Object.keys(e).sort(),['casualties','intensity','lastFireAt','shooters','state']);
    assert.ok(Number.isFinite(e.intensity)&&e.intensity>=0&&e.intensity<=1&&Number.isInteger(e.shooters)&&Number.isInteger(e.casualties));
  }
  assert.equal(first.clock,s.clock);assert.equal(first.battleClock,s.battleClock);assert.equal(first.phase,s.mission.phase);assert.equal(first.scene,s.scene?.id??null);
  assert.deepEqual(first.recentBlasts,[]);
  assert.ok(!Object.hasOwn(s,'battleReadout')&&!Object.keys(s).includes('battleReadout')&&!Object.keys(s).includes('displayFire'),'getters, not stored fields');
  assert.notEqual(s.battleReadout,s.battleReadout);assert.deepEqual(s.battleReadout,first);
  first.sectors.s2_east_bridgehead.shooters=99;first.flags.raid=true;assert.equal(s.battleReadout.sectors.s2_east_bridgehead.shooters,0);assert.equal(s.battleReadout.flags.raid,false);
  assert.ok(!keysOf(s.snapshot()).includes('battleReadout'));
  // it follows the real state: the same event expressions renderState uses, men per sector from the mission data, recent blasts
  const stukas=()=>s.battleReadout.flags.stukas;
  s.consume(E('planes_heard'));assert.equal(stukas(),true);assert.equal(stukas(),s.renderState.stukas);
  s.consume(E('second_air_pass'));assert.equal(stukas(),false);assert.equal(stukas(),s.renderState.stukas);
  s.flags['m01.second_raid_state']='active';assert.equal(s.battleReadout.flags.raid,true);assert.equal(s.battleReadout.flags.raid,s.renderState.secondRaid);
  s.consume(E('panzerzug_arrives'));assert.equal(s.battleReadout.flags.panzerzug,true);
  assert.equal(s.battleReadout.sectors.s2_east_bridgehead.shooters,0);assert.equal(s.battleReadout.flags.train963,false);
  s.consume(E('train963_arrives'));
  const east=()=>s.battleReadout.sectors.s2_east_bridgehead;
  assert.equal(s.battleReadout.flags.train963,true);assert.equal(east().shooters,40);assert.equal(east().casualties,0);assert.equal(east().lastFireAt,null);assert.equal(east().intensity,0);
  Object.assign(s.actor('de_east_3'),{alive:false,health:0,state:'DOWN'});
  assert.equal(east().shooters,39);assert.equal(east().casualties,1);
  for(let i=4;i<14;i++)s.actor(`de_east_${i}`).firedAt=s.clock-5;   // gameplay shots 5 s ago
  s.actor('de_east_3').firedAt=s.clock-1;                            // the dead man's last shot still counts for lastFireAt, not for intensity
  assert.equal(east().lastFireAt,s.clock-1);assert.equal(east().intensity,10/39);
  s.display.firedAt.de_east_20=s.clock-2;s.display.firedAt.de_east_4=s.clock-3;   // a display shot adds a shooter, a second shot by a counted man does not
  assert.equal(east().intensity,11/39);assert.equal(east().lastFireAt,s.clock-1);
  s.actor('de_east_21').firedAt=s.clock-READOUT_WINDOW_SEC-1;assert.equal(east().intensity,11/39,'older than the window is not recent');
  assert.equal(s.battleReadout.sectors.s4_north_perimeter.shooters,0);assert.equal(s.battleReadout.sectors.s4_north_perimeter.intensity,0);
  // the yard's only mapped man is a civilian railway worker: not a shooter; a fallen one still counts as a casualty
  const worker=s.actor('franciszek_lipski');assert.equal(worker.civilian,true);assert.equal(s.battleReadout.sectors.s3_station_yard.shooters,0);
  Object.assign(worker,{alive:false,health:0,state:'DOWN'});assert.equal(s.battleReadout.sectors.s3_station_yard.casualties,1);
  s.impact('probe_blast',{x:0,y:0,z:0},false);
  assert.deepEqual(s.battleReadout.recentBlasts.map(b=>[b.id,b.age]),[['probe_blast',0]]);
  s.clock+=READOUT_WINDOW_SEC+1;assert.deepEqual(s.battleReadout.recentBlasts,[]);
});

test('a restore starts an empty display list re-seeded from the saved state; display fire never changes a save or its continuation',()=>{
  const a=new (profiledClass(SYNTH))(19390901),plain=new M01Simulation(19390901);
  for(const s of [a,plain])s.tick(.05,{skip:true});
  for(let i=0;i<800&&(i<600||a.display.rounds.length===0);i++)for(const s of [a,plain]){s.tick(.05,{});s.drainEvents();}
  assert.ok(a.display.nextId>0&&a.display.rounds.length>0,'rounds were in flight when the save was taken');
  const save=a.snapshot();assert.equal(JSON.stringify(save),JSON.stringify(plain.snapshot()),'the save is byte-identical with and without display fire');
  assert.ok(!keysOf(save).some(k=>/display/i.test(k)));
  const r1=new M01Simulation(1),r2=new M01Simulation(2),r3=new M01Simulation(3);for(const r of [r1,r2,r3])r.restoreSnapshot(json(save));
  const seed=(save.rng^0x5bd1e995^Math.floor(save.clock*20))>>>0;
  for(const r of [r1,r2,r3]){assert.equal(r.display.rng.state,seed);assert.deepEqual(r.displayFire,{rounds:[],firedAt:{},skipped:0,nextId:0});assert.equal(r.rng.state,save.rng);assert.deepEqual(r.display.profiles,[]);}
  assert.notEqual(seed,displaySeed(save.rng));
  r1.display.profiles=r2.display.profiles=SYNTH;
  for(let i=0;i<400;i++)for(const r of [r1,r2,r3]){r.tick(.05,{});r.drainEvents();}
  assert.ok(r1.display.nextId>0);assert.equal(JSON.stringify(r1.displayFire),JSON.stringify(r2.displayFire),'same save, same profile: same display stream');
  assert.equal(r1.display.rng.state,r2.display.rng.state);
  assert.equal(JSON.stringify(r1.snapshot(false)),JSON.stringify(r3.snapshot(false)),'with and without display fire the continuation is identical');
  assert.equal(r3.displayFire.nextId,0);
});

test('a flood of display rounds, including rounds flying straight over the player, changes nothing in the simulation; the cap holds',()=>{
  const cast=['marek_zielinski','pawel_krawiec','szymon_kowal','jozef_bak','leon_dudek','staszek_pawlak','sapper_2','sapper_3','east_platoon_voice','generic_rifleman','tadeusz_nowicki','franciszek_lipski'];
  const flood=[
    {id:'dp_flood_far',shooters:cast,weapon:'mg34',rounds:[7,7],intervalSec:[.05,.1],tracerEvery:2,targetBox:[1500,1600,0,40]},
    {id:'dp_over_player',shooters:['marek_zielinski'],weapon:'kar98k',rounds:[3,3],intervalSec:[.2,.4],tracerEvery:1,targetIds:['szymon_kowal','leon_dudek'],cone:[0,0],bias:[0,0]},
  ].map(norm);
  const plain=new M01Simulation(19390901),flooded=new (profiledClass(flood))(19390901);let max=0,compared=0;
  for(let tick=0;tick<800;tick++){
    const controls=tick===0?{skip:true}:{forward:tick%300<80?1:0,lookX:tick%300===0?40:0,crouch:tick===500};
    plain.tick(.05,controls);flooded.tick(.05,json(controls));max=Math.max(max,flooded.display.rounds.length);
    assert.ok(flooded.display.rounds.length<=DISPLAY_CAP);
    assert.equal(JSON.stringify(flooded.drainEvents()),JSON.stringify(plain.drainEvents()),`events at tick ${tick}`);
    const a=JSON.stringify(flooded.snapshot(false)),b=JSON.stringify(plain.snapshot(false));
    if(a!==b)assert.fail(JSON.stringify({tick,difference:firstDifference(JSON.parse(a),JSON.parse(b))}));compared++;
  }
  assert.equal(compared,800);assert.equal(flooded.rng.state,plain.rng.state);assert.equal(flooded.player.health,100);
  assert.ok(flooded.display.skipped>0&&max>=100,`the cap was reached (max ${max}, skipped ${flooded.display.skipped})`);
  assert.equal(flooded.threat.inFlight,plain.threat.inFlight);assert.equal(flooded.enemyFire.nextId,0);assert.deepEqual(flooded.enemyFire,plain.enemyFire);
  assert.ok(Object.keys(flooded.displayFire.firedAt).length>=cast.length-1&&plain.displayFire.nextId===0);
});

test('positive control: the lockstep comparison detects a display round that leaks into the RNG, an actor or the events',()=>{
  // The same per-tick comparison as the route tests, run against deliberately leaking simulations. Without this the isolation proofs could be vacuous.
  const diverges=Leaky=>{
    const plain=new M01Simulation(19390901),leaky=new Leaky(19390901);
    for(let tick=0;tick<900;tick++){
      const controls=tick===0?{skip:true}:{};plain.tick(.05,controls);leaky.tick(.05,controls);
      if(leaky.rng.state!==plain.rng.state)return `rng at tick ${tick}`;
      if(JSON.stringify(leaky.drainEvents())!==JSON.stringify(plain.drainEvents()))return `events at tick ${tick}`;
      if(JSON.stringify(leaky.snapshot(false))!==JSON.stringify(plain.snapshot(false)))return `state at tick ${tick}`;
    }
    return null;
  };
  const clean=class extends M01Simulation{reset(seed){super.reset(seed);this.display.profiles=SYNTH;}};
  assert.equal(diverges(clean),null,'the real implementation passes the same comparison');
  const leaky=leak=>class extends clean{updateCombat(dt){super.updateCombat(dt);if(this.display.rounds.length)leak(this);}};
  assert.match(diverges(leaky(s=>{s.rng.next();})),/^rng /);
  assert.match(diverges(leaky(s=>{s.actor('szymon_kowal').firedAt=s.clock;})),/^state /);
  assert.match(diverges(leaky(s=>{s.player.health-=1;})),/^state /);
  assert.match(diverges(leaky(s=>{s.enemyFire.nextId++;})),/^state /);
  assert.match(diverges(leaky(s=>{s.emit({type:'enemy-fire'});})),/^events /);
});

test('compareContinuation at 04:47 passes, also with display fire running in the original and none in the restored copy',()=>{
  const d=toRepair(driver(19390901));d.until(()=>d.sim.battleClock>=seconds('04:47:00'),120);
  const save=d.sim.snapshot();
  const plain=new M01Simulation(1),shown=new M01Simulation(2);plain.restoreSnapshot(json(save));shown.restoreSnapshot(json(save));
  shown.display.profiles=SYNTH;
  const quiet=compareContinuation(plain,{label:'04:47 without display fire',ticks:200});
  const loud=compareContinuation(shown,{label:'04:47 with display fire in the original only',ticks:200});
  assert.equal(quiet.firstDivergence,null);assert.equal(loud.firstDivergence,null);
  assert.ok(shown.display.nextId>0&&plain.display.nextId===0);
  assert.equal(quiet.rng,loud.rng,'the main stream ends in the same state');
  assert.equal(JSON.stringify(shown.snapshot(false)),JSON.stringify(plain.snapshot(false)));
});

// ---------------------------------------------------------------- the whole route, 12 seeds
for(const seed of SEEDS)test(`route seed ${seed}: main RNG, events and state equal a plain simulation every tick with display fire running`,()=>{
  const shadow=new M01Simulation(seed),buf=Buffer.alloc(4),rngProfiled=createHash('sha256'),rngPlain=createHash('sha256'),game=createHash('sha256');
  const stats={seed,ticks:0,windowStart:null,windowTicks:0,fullSnapshotCompares:0,maxInFlight:0,displayRounds:0,tracerRounds:0,skipped:0,byProfile:{}};
  let counted=0;
  const compare=(sim,label)=>{
    const a=JSON.stringify(sim.snapshot(false)),b=JSON.stringify(shadow.snapshot(false));stats.fullSnapshotCompares++;
    if(a!==b)assert.fail(JSON.stringify({label,seed,tick:stats.ticks,difference:firstDifference(JSON.parse(a),JSON.parse(b))}));
  };
  const result=route(seed,{Simulation:profiledClass(SYNTH),onStep:({sim,controls,events,dt})=>{
    stats.ticks++;
    shadow.tick(dt,json(controls));const plainEvents=shadow.drainEvents();
    buf.writeUInt32LE(sim.rng.state>>>0);rngProfiled.update(buf);buf.writeUInt32LE(shadow.rng.state>>>0);rngPlain.update(buf);
    game.update(JSON.stringify([sim.clock,sim.battleClock,sim.player.x,sim.player.z,sim.player.health,sim.enemyFire.nextId,sim.enemyFire.rounds.length,sim.flags['m01.east_platoon_survivors']])+'\n');
    if(sim.rng.state!==shadow.rng.state)assert.fail(`rng.state diverged at tick ${stats.ticks} (seed ${seed}): ${sim.rng.state} vs ${shadow.rng.state}`);
    if(sim.clock!==shadow.clock)assert.fail(`clock diverged at tick ${stats.ticks} (seed ${seed})`);
    if(JSON.stringify(events)!==JSON.stringify(plainEvents))assert.fail(`events diverged at tick ${stats.ticks} (seed ${seed}): ${JSON.stringify(events)} vs ${JSON.stringify(plainEvents)}`);
    const display=sim.display;
    stats.maxInFlight=Math.max(stats.maxInFlight,display.rounds.length);assert.ok(display.rounds.length<=DISPLAY_CAP);
    if(display.nextId>counted){
      for(const r of display.rounds)if(idNumber(r)>=counted){
        stats.displayRounds++;if(r.tracer)stats.tracerRounds++;
        const owner=OWNER.get(r.by);assert.ok(owner,`display round by ${r.by} belongs to no synthetic profile`);stats.byProfile[owner]=(stats.byProfile[owner]??0)+1;
      }
      counted=display.nextId;
    }
    if(stats.windowStart===null&&sim.consumedEvent(E('train963_arrives')))stats.windowStart=stats.ticks;
    if(stats.windowStart!==null&&stats.ticks-stats.windowStart<4000){compare(sim,'window');stats.windowTicks++;}
    else if(stats.ticks%250===0)compare(sim,'sparse');
  }});
  const sim=result.sim;compare(sim,'final');
  assert.equal(JSON.stringify(json(sim.checkpoint)),JSON.stringify(json(shadow.checkpoint)),'the respawn checkpoint is equal too');
  assert.equal(sim.rng.state,shadow.rng.state);assert.equal(sim.mission.complete,shadow.mission.complete);assert.equal(sim.player.health,shadow.player.health);
  // not vacuous: display fire ran from every profile, with tracers, flashes and a full 4000-tick comparison window under German fire
  stats.skipped=sim.display.skipped;
  assert.equal(stats.windowTicks,4000);assert.ok(stats.windowStart>0);assert.ok(stats.displayRounds>200&&stats.tracerRounds>50&&stats.maxInFlight>10,JSON.stringify(stats));
  for(const p of SYNTH)assert.ok(stats.byProfile[p.id]>0,`${p.id} produced display rounds`);
  assert.ok(Object.keys(sim.display.firedAt).length>=8);assert.equal(shadow.displayFire.nextId,0);
  assert.equal(sim.display.nextId,stats.displayRounds);
  report.routes.push({...stats,finalRng:sim.rng.state,finalClock:sim.clock,health:sim.player.health,rngStreamSha256:rngProfiled.digest('hex'),
    plainRngStreamSha256:rngPlain.digest('hex'),gameStreamSha256:game.digest('hex'),flashShooters:Object.keys(sim.display.firedAt).length});
  const last=report.routes.at(-1);assert.equal(last.rngStreamSha256,last.plainRngStreamSha256);
});

// ---------------------------------------------------------------- the renderer
function rig(){
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),view=Object.create(M01View.prototype);
  Object.assign(view,{camera:{position:new THREE.Vector3()},fireDummy:new THREE.Object3D(),fireColor:new THREE.Color(),characters:null,impacts:[],fireBatches:{}});
  // The real capacities (createFireEffects): muzzle 96, tracer 48, puff 144, spark 96, smoke 64, chip 128.
  for(const [name,n] of Object.entries({muzzle:96,tracer:48,puff:144,spark:96,smoke:64,chip:128}))view.fireBatches[name]=new THREE.InstancedMesh(geometry,material,n);
  return {view,
    draw(sim){view.updateFire(sim);return structuredClone(view.fx);},
    zOf(name,i){return Math.round(view.fireBatches[name].instanceMatrix.array[i*16+14]);},
    dispose(){Object.values(view.fireBatches).forEach(b=>b.dispose());geometry.dispose();material.dispose();}};
}
const flying=(z,tracer=true)=>({id:`r${z}`,by:'x',weapon:'mg34',kind:'display',ox:0,oy:1,oz:z,ax:300,ay:1,az:z,h:2,firedAt:9.5,arriveAt:10.5,tracer,victim:null});   // t = .5 at clock 10

test('renderer: gameplay tracers are drawn first when the 48-instance batch is full; display fire takes at most 24 of what is left',()=>{
  const r=rig();
  try{
    for(const [gameplay,display,drawnGameplay,drawnDisplay] of [[60,60,48,0],[48,60,48,0],[30,60,30,18],[24,60,24,24],[10,60,10,24],[0,60,0,24],[0,10,0,10],[60,0,48,0],[0,0,0,0]]){
      const g=Array.from({length:gameplay},(_,i)=>flying(100+i)),d=Array.from({length:display},(_,i)=>flying(-100-i));
      const fx=r.draw({clock:10,actors:[],enemyFire:{rounds:g},displayFire:{rounds:d,firedAt:{}}});
      assert.equal(fx.tracer,drawnGameplay+drawnDisplay,JSON.stringify({gameplay,display}));
      for(let i=0;i<drawnGameplay;i++)assert.equal(r.zOf('tracer',i),100+i,`gameplay tracer ${i} comes first`);
      for(let i=0;i<drawnDisplay;i++)assert.equal(r.zOf('tracer',drawnGameplay+i),-100-i,`display tracer ${i} follows the gameplay ones`);
    }
    assert.equal(DISPLAY_TRACER_CAP,24);
    // rounds without a tracer or outside their flight do not spend the display budget
    const mixed=Array.from({length:80},(_,i)=>({...flying(-100-i),tracer:i%2===0,firedAt:i%5===0?10.2:9.5}));   // every fifth has not left yet (t < 0)
    const fx=r.draw({clock:10,actors:[],enemyFire:{rounds:[]},displayFire:{rounds:mixed,firedAt:{}}});
    const eligible=mixed.filter(m=>m.tracer&&m.firedAt<=10);
    assert.equal(fx.tracer,DISPLAY_TRACER_CAP);
    for(let i=0;i<DISPLAY_TRACER_CAP;i++)assert.equal(r.zOf('tracer',i),eligible[i].oz);
    // a partial simulation without a display list still renders its gameplay tracers
    assert.equal(r.draw({clock:10,actors:[],enemyFire:{rounds:[flying(5)]}}).tracer,1);
  }finally{r.dispose();}
});

test('renderer: display muzzle flashes last 0.15 s, serve any team, need a living active man, and are not doubled on a gameplay flash',()=>{
  const r=rig(),sim=new M01Simulation(19390901);sim.tick(.05,{skip:true});
  try{
    const flash=(patch,id,age,after)=>{
      const a=sim.actor(id),saved={...a};Object.assign(a,patch);sim.display.firedAt[id]=sim.clock-age;after?.();
      try{return r.draw(sim).muzzle;}finally{Object.assign(a,saved);delete sim.display.firedAt[id];}
    };
    assert.equal(DISPLAY_FLASH_SEC,.15);
    assert.equal(r.draw(sim).muzzle,0,'no display shooters, no gameplay fire: no flash');
    assert.equal(flash({active:true},'pl_east_0',.1),1,'an ally');
    assert.equal(flash({active:true},'pl_east_0',0),1);
    assert.equal(flash({active:true},'pl_east_0',.2),0,'older than the window');
    assert.equal(flash({active:true},'pl_east_0',-.01),0,'not yet');
    assert.equal(flash({},'pl_east_0',.1),0,'inactive');
    assert.equal(flash({active:true,alive:false,health:0,state:'DOWN'},'pl_east_0',.1),0,'dead');
    assert.equal(flash({active:true},'de_east_20',.1),1,'an enemy that only fires as display (no gameplay shot)');
    // gameplay flash on the same enemy: one flash, not two
    const gameplay={active:true,state:'SUPPRESS',shot:.3,firedAt:sim.clock-.05};
    const alone=(()=>{const a=sim.actor('de_east_21'),saved={...a};Object.assign(a,gameplay);try{return r.draw(sim).muzzle;}finally{Object.assign(a,saved);}})();
    assert.equal(alone,1,'the gameplay flash alone');
    assert.equal(flash(gameplay,'de_east_21',.05),1,'display flash on a gameplay flash is not doubled');
    // two different men: two flashes
    const other=sim.actor('de_east_22'),savedOther={...other};Object.assign(other,gameplay);
    try{assert.equal(flash({active:true},'pl_east_1',.05),2);}finally{Object.assign(other,savedOther);}
    // drawing never writes to the simulation or its display list
    const before=JSON.stringify([sim.snapshot(),sim.displayFire]);sim.display.firedAt.pl_east_0=sim.clock-.05;sim.actor('pl_east_0').active=true;
    const withFlash=JSON.stringify([sim.snapshot(),sim.displayFire]);r.draw(sim);r.draw(sim);
    assert.equal(JSON.stringify([sim.snapshot(),sim.displayFire]),withFlash);assert.notEqual(before,withFlash);
  }finally{r.dispose();}
});
