import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {AudioManager} from '../src/core/audio.js';
import {
  MusicConductor,LayerModel,createMusicInput,musicGate,readoutIntensity,MUSIC_STEM_IDS,MUSIC_STINGERS,MUSIC_TUNING,PHASE_LAYER_CAP,
  GATE_OFF,GATE_STINGER_ONLY,GATE_LAYERS,STINGER_SLOT,
} from '../src/core/audio/index.js';
import {M01AudioDirector,occlusionFor,deriveBlastKind,deriveNpcShotWeapon,derivePass,EMITTER_SLOT_SEC} from '../src/game/audio-director-m01.js';
import {M01Simulation,seconds} from '../src/game/m01-simulation.js';
import {Game} from '../src/game/game.js';
import mission from '../missions/m01-tczew/mission.json' with {type:'json'};
import {FakeAudioContext} from './helpers/fake-audio-context.js';
import {driver,toRepair,route} from './helpers/m01-route.js';
import {missionWithRetiredCasemate} from './helpers/m01-retired-casemate.js';

// MEMORY SAFETY: nothing here keeps a graph of fake nodes in a value that an assertion could serialise (fake nodes keep ctx/connections
// non-enumerable), the route is run with a bounded fake context that is trimmed as it goes, and no test retains per-tick data.
const E=name=>`evt_m01_${name}`;
const T=MUSIC_TUNING;
const neverFetch=async()=>{throw new Error('network is forbidden in tests');};
const STINGER_IDS=MUSIC_STINGERS.map(s=>s.id);
const ALL_MUSIC_IDS=[...MUSIC_STEM_IDS,...STINGER_IDS];

function makeAudio({realize=true}={}){
  const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx,fetchImpl:neverFetch});
  assert.equal(audio.init(),true);
  // A decoded buffer in the loader store is what makes a stem "real" (there are no music files until T45e).
  if(realize)for(const id of ALL_MUSIC_IDS)audio.buffers.set(id,ctx.createBuffer(1,2000,ctx.sampleRate));
  return {audio,ctx};
}
/** Records the director-visible calls as plain data (arguments are cloned at call time, so reused scratch objects cannot alias). */
function record(audio,log,stamp){
  const wrap=(obj,name,tag=name)=>{const original=obj[name].bind(obj);obj[name]=(...args)=>{log.push([stamp(),tag,...JSON.parse(JSON.stringify(args))]);return original(...args);};};
  wrap(audio,'weaponFire');wrap(audio,'setOcclusion');wrap(audio.core,'playMusic');wrap(audio.core,'stopMusic');wrap(audio.mix,'setMusicGate');
}
/** A deep read-only view of the simulation: any write throws, and the RNG properties cannot even be read. */
const views=new WeakMap();
function readonly(root){
  const wrap=o=>{
    if(o===null||typeof o!=='object')return o;
    let p=views.get(o);if(!p){p=new Proxy(o,handler);views.set(o,p);}return p;
  };
  const denied=(op,k)=>{throw new Error(`director attempted to ${op} ${String(k)}`);};
  const handler={
    get(t,k,r){if(k==='rng')denied('read',k);const v=Reflect.get(t,k,r);return v!==null&&typeof v==='object'?wrap(v):v;},
    set(t,k){denied('write',k);},defineProperty(t,k){denied('define',k);},deleteProperty(t,k){denied('delete',k);},setPrototypeOf(){denied('setPrototypeOf','');},
  };
  return wrap(root);
}
const bc=text=>seconds(text);

// ------------------------------------------------------------------------------------------------ music gate
test('music gate truth table: off | stinger-only | layers per event and scene',()=>{
  const base=createMusicInput(),gate=o=>musicGate({...base,...o});
  const rows=[
    ['plain combat',{clock:300,consumed:{}},GATE_LAYERS],
    ['an unrelated consumed event',{clock:300,consumed:{[E('train963_arrives')]:200}},GATE_LAYERS],
    ['mission complete',{clock:300,consumed:{},complete:true},GATE_OFF],
    ['roll call scene',{clock:300,consumed:{},scene:'cs_m01_roll_call'},GATE_OFF],
    ['roll_call consumed',{clock:300,consumed:{[E('roll_call')]:290}},GATE_OFF],
    ['debrief consumed',{clock:300,consumed:{[E('debrief')]:290}},GATE_OFF],
    ['restored: 0 s after',{clock:100,consumed:{},restoredAt:100},GATE_OFF],
    ['restored: 19.9 s after',{clock:119.9,consumed:{},restoredAt:100},GATE_OFF],
    ['restored: 20 s after',{clock:120,consumed:{},restoredAt:100},GATE_LAYERS],
    ['restored later than the clock (a further rewind)',{clock:90,consumed:{},restoredAt:100},GATE_LAYERS],
    ['east_demolition: hit window start',{clock:1000,consumed:{[E('east_demolition')]:1000}},GATE_STINGER_ONLY],
    ['east_demolition: 7.9 s',{clock:1007.9,consumed:{[E('east_demolition')]:1000}},GATE_STINGER_ONLY],
    ['east_demolition: 8 s -> mandatory silence',{clock:1008,consumed:{[E('east_demolition')]:1000}},GATE_OFF],
    ['east_demolition: 89.9 s',{clock:1089.9,consumed:{[E('east_demolition')]:1000}},GATE_OFF],
    ['east_demolition: 90 s -> back to layers',{clock:1090,consumed:{[E('east_demolition')]:1000}},GATE_LAYERS],
    ['west_demolition: hit window',{clock:2003,consumed:{[E('west_demolition')]:2000}},GATE_STINGER_ONLY],
    ['west_demolition: silence',{clock:2050,consumed:{[E('west_demolition')]:2000}},GATE_OFF],
    ['both demolitions: the second hit still starts inside the first silence',{clock:1030,consumed:{[E('east_demolition')]:1000,[E('west_demolition')]:1028}},GATE_STINGER_ONLY],
    ['wounded_dragged window',{clock:520,consumed:{[E('wounded_dragged')]:500}},GATE_OFF],
    ['wounded_dragged window over',{clock:530,consumed:{[E('wounded_dragged')]:500}},GATE_LAYERS],
    ['bak wounded, not yet retrieved',{clock:900,consumed:{[E('bak_wounded')]:800}},GATE_OFF],
    ['bak retrieved',{clock:900,consumed:{[E('bak_wounded')]:800,[E('dudek_retrieves_bak')]:850}},GATE_LAYERS],
    ['east blast cutscene after the hit',{clock:1020,consumed:{},scene:'cs_m01_east_blast'},GATE_OFF],
    ['west blast cutscene after the hit',{clock:2020,consumed:{},scene:'cs_m01_west_blast'},GATE_OFF],
    ['east blast cutscene during the hit window: the stinger may start',{clock:1003,consumed:{[E('east_demolition')]:1000},scene:'cs_m01_east_blast'},GATE_STINGER_ONLY],
    ['the hit window beats bak_wounded (the demolition happens while Bak is wounded)',{clock:1002,consumed:{[E('bak_wounded')]:990,[E('east_demolition')]:1000}},GATE_STINGER_ONLY],
    ['...and the silence follows',{clock:1010,consumed:{[E('bak_wounded')]:990,[E('east_demolition')]:1000}},GATE_OFF],
    ['roll call beats the hit window',{clock:1002,consumed:{[E('east_demolition')]:1000},scene:'cs_m01_roll_call'},GATE_OFF],
    ['death restore beats the hit window',{clock:1002,consumed:{[E('east_demolition')]:1000},restoredAt:995},GATE_OFF],
  ];
  for(const [label,patch,expected] of rows)assert.equal(gate(patch),expected,label);
});

test('readout intensity: weighted sectors plus 0.3 per blast within 300 m, capped; missing or malformed readouts give 0',()=>{
  const sector=i=>({state:'x',shooters:5,casualties:0,lastFireAt:1,intensity:i});
  const readout=(sectors,recentBlasts=[])=>({sectors,recentBlasts});
  assert.equal(readoutIntensity(readout({s1_west_bridgehead:sector(.5)}),0,0),.5);
  assert.equal(readoutIntensity(readout({s3_station_yard:sector(1)}),0,0),.6);
  assert.equal(readoutIntensity(readout({s4_north_perimeter:sector(1),s5_sky_east:sector(1)}),0,0),.3);
  assert.equal(readoutIntensity(readout({s2_east_bridgehead:sector(.4),s3_station_yard:sector(.5)}),0,0),.4,'the strongest weighted sector wins');
  const blast=(x,z)=>({id:'b',x,y:0,z,started:0,soundAt:0,age:1});
  assert.equal(readoutIntensity(readout({},[blast(100,0),blast(0,299),blast(400,0)]),0,0),.6,'two blasts within 300 m, one beyond');
  assert.equal(readoutIntensity(readout({s1_west_bridgehead:sector(.9)},[blast(1,1),blast(2,2)]),0,0),1,'capped at 1');
  for(const bad of [undefined,null,{},{sectors:null},{sectors:{s1_west_bridgehead:{intensity:'x'}}},42,'text'])assert.equal(readoutIntensity(bad,0,0),0);
});

// ------------------------------------------------------------------------------------------------ hysteresis
function sweep(model,intensityAt,seconds,{cap=3}={}){
  const flips=[[],[],[],[]],prev=[...model.on];
  for(let t=0;t<=seconds;t+=1/T.decisionHz){
    model.step(t,intensityAt(t),cap);
    for(let i=0;i<4;i++)if(model.on[i]!==prev[i]){flips[i].push(t);prev[i]=model.on[i];}
    for(let i=1;i<4;i++)assert.ok(!model.on[i]||model.on[i-1],`layer ${i} on without layer ${i-1} at ${t}`);
  }
  return flips;
}
test('hysteresis: thresholds are strict, the band between on and off holds, and each layer waits its dwell',()=>{
  const m=new LayerModel();
  m.step(0,.25,3);assert.deepEqual(m.on,[true,false,false,false],'exactly the on threshold does not trigger');
  m.step(.25,.26,3);assert.deepEqual(m.on,[true,true,false,false]);
  m.step(1,.2,3);assert.equal(m.on[1],true,'inside the band (.15..25) a layer that is on stays on');
  m.step(2,.05,3);assert.equal(m.on[1],true,'below the off threshold but inside the 8 s dwell');
  m.step(.25+T.dwellSec-.01,.05,3);assert.equal(m.on[1],true,'dwell not over by a hair');
  m.step(.25+T.dwellSec,.05,3);assert.equal(m.on[1],false,'dwell over and below .15');
  // A quiet start climbs all three layers in one step (each layer has its own dwell clock), then L3 leaves first on the way down.
  const up=new LayerModel();up.step(100,.9,3);assert.deepEqual(up.on,[true,true,true,true]);
  up.step(120,.5,3);assert.deepEqual(up.on,[true,true,true,false],'L3 off below .55; L2 holds above .30');
  up.step(130,.2,3);assert.deepEqual(up.on,[true,true,false,false],'L2 off below .30; L1 holds above .15');
  up.step(140,.1,3);assert.deepEqual(up.on,[true,false,false,false]);
});
test('hysteresis: noise around the thresholds does not flap (>= 8 s between changes of a layer; band noise changes nothing)',()=>{
  // Deterministic pseudo-noise (no Math.random): +-0.06 around the L1 band edges and the L2 band.
  const noise=t=>Math.sin(t*7.3)*.04+Math.sin(t*2.9)*.03+Math.sin(t*13.1)*.03;
  // Noise confined to the L1 band (.15, .25): a layer that is off stays off, a layer that is on stays on.
  const off=sweep(new LayerModel(),t=>.2+noise(t)*.45,240);assert.equal(off[1].length,0,'L1 never turned on inside its band');
  const on=new LayerModel();on.step(0,.3,3);assert.equal(on.on[1],true);
  const held=sweep(on,t=>.2+noise(t)*.45,240);assert.equal(held[1].length,0,'L1 never turned off inside its band');
  for(const centre of [.2,.375,.625]){
    const flips=sweep(new LayerModel(),t=>centre+noise(t)*3.5,240);
    for(const list of flips)for(let i=1;i<list.length;i++)assert.ok(list[i]-list[i-1]>=T.dwellSec-1e-9,`flapping around ${centre}: ${list[i-1]} -> ${list[i]}`);
  }
  // Hard square wave across both thresholds every 0.25 s: at most one change per layer per 8 s.
  const square=sweep(new LayerModel(),t=>(Math.floor(t*4)%2?.9:0),120);
  for(const list of square){for(let i=1;i<list.length;i++)assert.ok(list[i]-list[i-1]>=T.dwellSec-1e-9);assert.ok(list.length<=Math.ceil(120/T.dwellSec)+1);}
});
test('phase caps: INTRO, SETUP and OUTRO stay on the drone; a cap drops higher layers immediately; unknown phases are uncapped',()=>{
  for(const phase of ['INTRO','SETUP','OUTRO'])assert.equal(PHASE_LAYER_CAP[phase],0);
  const m=new LayerModel();m.step(10,.9,3);assert.deepEqual(m.on,[true,true,true,true]);
  m.step(10.25,.9,0);assert.deepEqual(m.on,[true,false,false,false],'cap 0 forces L1..L3 off without waiting for the dwell');
  m.step(30,.9,0);assert.deepEqual(m.on,[true,false,false,false],'and keeps them off');
  assert.equal(PHASE_LAYER_CAP.MAIN_COMBAT??3,3);assert.equal(PHASE_LAYER_CAP.SOMETHING_ELSE??3,3);
});

// ------------------------------------------------------------------------------------------------ conductor on a real AudioCore
function rig({realize=true}={}){
  const {audio,ctx}=makeAudio({realize}),conductor=new MusicConductor(audio.core),input=createMusicInput(),log=[];
  let now=0;record(audio,log,()=>now);
  const step=(clock,patch={})=>{now=clock;ctx.currentTime=clock;Object.assign(input,{clock},patch);return conductor.update(input);};
  return {audio,ctx,conductor,input,log,step,core:audio.core};
}
const playing=r=>[...r.core.music.keys()].sort();
const calls=(r,tag)=>r.log.filter(e=>e[1]===tag);

test('no music files: every decision runs, nothing starts, no node is created and nothing throws (silent, not synth)',()=>{
  const r=rig({realize:false}),nodes=r.ctx.nodes.length,consumed={};
  assert.equal(r.core.loader.entries.size,0,'no manifest is loaded in the game today');
  for(let t=0;t<400;t+=.05){
    if(t>=10)consumed[E('planes_heard')]=10;
    if(t>=100)consumed[E('east_demolition')]=100;
    r.step(t,{consumed,phase:'MAIN_COMBAT',intensity:.95});
  }
  assert.equal(r.core.musicStarted,0);assert.equal(r.core.music.size,0);
  const d=r.conductor.diagnostics;
  assert.equal(d.stemStarts,0);assert.equal(d.stingerPlayed,0);assert.equal(d.stingerFired,2,'the decisions were taken');assert.equal(d.stingerSilent,2);
  assert.equal(r.ctx.nodes.length,nodes+0,'no source or gain was created (only the gate moved)');
  assert.equal(r.core.loader.stats.synthUnlisted,0,'the loader was not even asked for a synth stand-in');
  assert.equal(calls(r,'playMusic').length,0);
});
test('real buffers: the drone is always on; layers follow intensity with 4 s fade-ins and 6 s fade-outs',()=>{
  const r=rig();
  r.step(0,{phase:'MAIN_COMBAT',intensity:0,consumed:{}});
  assert.deepEqual(playing(r),['stem0'],'L0 only');
  const fadeIn=calls(r,'playMusic')[0];assert.deepEqual(fadeIn.slice(1,3),['playMusic','stem0']);assert.equal(fadeIn[4].fadeIn,T.fadeInSec);assert.equal(fadeIn[4].loop,true);
  r.step(20,{intensity:.3});assert.deepEqual(playing(r),['stem0','stem1']);
  r.step(30,{intensity:.5});assert.deepEqual(playing(r),['stem0','stem1','stem2']);
  r.step(40,{intensity:.8});assert.deepEqual(playing(r),['stem0','stem1','stem2','stem3']);
  r.step(60,{intensity:.0});assert.deepEqual(playing(r),['stem0'],'everything above the drone left');
  const stops=calls(r,'stopMusic').filter(e=>T.fadeOutSec===e[3]);assert.ok(stops.length>=3,'stems left with the 6 s fade-out');
  // Phase caps: INTRO keeps only the drone however loud it gets.
  r.step(120,{phase:'MAIN_COMBAT',intensity:.9});assert.deepEqual(playing(r),['stem0','stem1','stem2','stem3']);
  r.step(130,{phase:'INTRO'});assert.deepEqual(playing(r),['stem0'],'INTRO keeps only the drone however loud it gets');
});
test('decisions are sampled at 4 Hz: the intensity is only used when a new decision slot opens',()=>{
  const r=rig();
  r.step(0,{phase:'MAIN_COMBAT',intensity:0,consumed:{}});
  assert.equal(r.conductor.due({clock:.1}),false,'same slot');assert.equal(r.conductor.due({clock:.26}),true,'next slot');
  r.step(.1,{intensity:.9});assert.deepEqual(playing(r),['stem0'],'inside the slot: ignored');
  r.step(.26,{intensity:.9});assert.deepEqual(playing(r),['stem0','stem1','stem2','stem3']);
});
test('gate: the MUSIC gate closes with a 2.5 s fade for silence, reopens afterwards, and stems follow it',()=>{
  const r=rig(),consumed={};
  r.step(0,{phase:'MAIN_COMBAT',intensity:.9,consumed});assert.deepEqual(playing(r),['stem0','stem1','stem2','stem3']);
  consumed[E('wounded_dragged')]=10;
  assert.equal(r.step(10,{consumed}),GATE_OFF);
  assert.deepEqual(playing(r),[],'stems stopped');assert.deepEqual(calls(r,'setMusicGate').at(-1).slice(2),[false,T.gateFadeSec]);
  assert.equal(r.conductor.diagnostics.gateOpen,false);
  assert.equal(r.step(10+T.woundedDraggedSec-.1,{consumed}),GATE_OFF);
  assert.equal(r.step(10+T.woundedDraggedSec,{consumed,intensity:.9}),GATE_LAYERS);
  assert.deepEqual(calls(r,'setMusicGate').at(-1).slice(2),[true,T.gateFadeSec]);
  r.step(10+T.woundedDraggedSec+.3,{consumed,intensity:.9});
  assert.deepEqual(playing(r),['stem0','stem1','stem2','stem3'],'the layers come back after the gate reopens');
  assert.equal(calls(r,'setMusicGate').length,2,'two gate changes, no chatter');
});
test('stingers: once per run, re-armed only when the event is unconsumed again, never replayed on continue',()=>{
  const r=rig(),consumed={};
  const stingerPlays=()=>calls(r,'playMusic').filter(e=>e[2]===STINGER_SLOT).map(e=>e[3]);
  r.step(0,{phase:'MAIN_COMBAT',intensity:0,consumed});assert.deepEqual(stingerPlays(),[]);
  consumed[E('planes_heard')]=5;r.step(5,{consumed});assert.deepEqual(stingerPlays(),['m01.stinger.planes_heard']);
  for(let t=5.05;t<60;t+=.05)r.step(t,{consumed});assert.equal(stingerPlays().length,1,'many frames, one stinger');
  consumed[E('bombing_0434')]=20;r.step(61,{consumed});assert.equal(stingerPlays().length,1,'the second trigger of the same stinger does not replay it');
  // checkpoint restore to before the event: unconsumed -> armed; consumed again -> plays again
  r.step(3,{consumed:{}});assert.equal(r.conductor.diagnostics.rewinds,1);
  r.step(4,{consumed:{}});r.step(5,{consumed:{[E('planes_heard')]:5}});assert.equal(stingerPlays().length,2,'re-armed by the restore');
  // restore to a checkpoint AFTER the event: still consumed -> not replayed
  r.step(5.5,{consumed:{[E('planes_heard')]:5}});r.step(3.5,{consumed:{[E('planes_heard')]:5}});r.step(4.5,{consumed:{[E('planes_heard')]:5}});
  assert.equal(stingerPlays().length,2);
  // continue from a save: reset() marks already consumed stingers as fired
  const c=rig();c.conductor.reset({[E('east_demolition')]:100,[E('east_platoon_withdraws')]:90});
  c.step(101,{consumed:{[E('east_demolition')]:100,[E('east_platoon_withdraws')]:90},phase:'MAIN_COMBAT'});
  assert.equal(c.log.filter(e=>e[1]==='playMusic'&&e[2]===STINGER_SLOT).length,0);
});
test('demolition stingers play into the silence and are cut by it; a stinger that arrives in a silence is skipped',()=>{
  const r=rig(),consumed={};
  r.step(0,{phase:'MAIN_COMBAT',intensity:.9,consumed});
  consumed[E('east_demolition')]=50;
  assert.equal(r.step(50,{consumed}),GATE_STINGER_ONLY);
  assert.ok(r.core.music.has(STINGER_SLOT),'the sub hit sounds');assert.deepEqual(playing(r),['stinger'],'stems are muted');
  assert.equal(r.conductor.diagnostics.gateOpen,true,'the gate stays open for the hit');
  assert.equal(r.step(50+T.stingerWindowSec,{consumed}),GATE_OFF);
  assert.equal(r.conductor.diagnostics.gateOpen,false,'closed: the stinger is cut');
  assert.equal(calls(r,'stopMusic').at(-1)[2],STINGER_SLOT);
  assert.equal(r.step(50+T.afterDemolitionSec,{consumed}),GATE_LAYERS);
  // an event that is consumed while the gate is off is skipped, not queued
  const q=rig();q.step(0,{phase:'MAIN_COMBAT',consumed:{},intensity:0});
  q.step(10,{consumed:{[E('roll_call')]:9,[E('east_platoon_withdraws')]:10}});
  assert.equal(q.conductor.diagnostics.stingerSkipped,1);assert.equal(q.log.filter(e=>e[1]==='playMusic'&&e[2]===STINGER_SLOT).length,0);
});
test('stingers duck the stems 12 dB while they sound, and the stems come back afterwards',()=>{
  const r=rig(),consumed={};
  r.step(0,{phase:'MAIN_COMBAT',intensity:.9,consumed});
  const stem=r.core.music.get('stem0'),targets=()=>stem.gain.gain.events.filter(e=>e[0]==='target').map(e=>e[1]);
  consumed[E('planes_heard')]=5;r.step(5,{consumed});
  assert.equal(targets().at(-1),T.stemDuck);assert.ok(Math.abs(20*Math.log10(T.stemDuck)+12)<.1,'-12 dB');
  r.core.music.get(STINGER_SLOT).source.finish();   // the stinger ended
  r.step(5.1,{consumed});assert.equal(targets().at(-1),1);
});
test('ducks on the music bus: -6 dB under a VOICE line, -4 dB for 1.5 s after a near blast',()=>{
  const r=rig(),duck=()=>r.core.mix.musicDuck.gain.events.filter(e=>e[0]==='target').map(e=>e[1]);
  r.step(0,{phase:'MAIN_COMBAT',intensity:0,consumed:{}});
  assert.equal(r.core.playVoice('line'),true);r.step(.1,{});assert.equal(duck().at(-1),T.voiceDuck);
  for(const e of [...r.core.pool.sets.voice])e.source.finish();r.step(.2,{});assert.equal(duck().at(-1),1);
  r.conductor.noteBlast(5);r.step(4.9,{});r.step(5.1,{});assert.equal(duck().at(-1),T.blastDuck);
  r.step(5+T.blastDuckSec-.01,{});assert.equal(duck().at(-1),T.blastDuck);
  r.step(5+T.blastDuckSec,{});assert.equal(duck().at(-1),1);
  assert.ok(Math.abs(20*Math.log10(T.blastDuck)+4)<.1,'-4 dB');
});
test('robust: no context, a disposed core, a disposed conductor, non-finite input and a hostile core never throw',()=>{
  const bare=new MusicConductor(new (audioCoreClass())()),input=createMusicInput();
  input.consumed={[E('planes_heard')]:1,[E('east_demolition')]:2};for(const clock of [0,1,2,50,NaN,Infinity,-1,3])input.clock=clock,bare.update(input);
  const r=rig();r.step(0,{phase:'MAIN_COMBAT',intensity:.9,consumed:{}});
  r.core.dispose();assert.doesNotThrow(()=>{r.step(5,{intensity:0});r.step(6,{consumed:{[E('east_demolition')]:6}});});
  const s=rig();s.step(0,{phase:'MAIN_COMBAT',intensity:.9,consumed:{}});s.conductor.dispose();s.conductor.dispose();
  assert.equal(s.step(1,{}),GATE_OFF);assert.deepEqual(playing(s),[],'dispose stops everything');
  const hostile=rig();hostile.core.playMusic=()=>{throw new Error('boom');};hostile.core.stopMusic=()=>{throw new Error('boom');};hostile.core.mix.setMusicGate=()=>{throw new Error('boom');};
  assert.doesNotThrow(()=>{hostile.step(0,{phase:'MAIN_COMBAT',intensity:.9,consumed:{}});hostile.step(1,{consumed:{[E('roll_call')]:1}});hostile.step(2,{consumed:{}});});
  input.consumed={};input.clock=5;input.intensity='loud';assert.doesNotThrow(()=>bare.update(input));
});
function audioCoreClass(){return makeAudio({realize:false}).audio.core.constructor;}

// ------------------------------------------------------------------------------------------------ presentation derivation
test('presentation-only derivation of weapon, kind and pass (no sim event field is added)',()=>{
  assert.equal(deriveBlastKind('m01_grenade_3',false),'grenade');assert.equal(deriveBlastKind('east_demolition',false),'demolition');
  assert.equal(deriveBlastKind('west_demolition',true),'demolition');assert.equal(deriveBlastKind('station_bomb',true),'bomb');
  assert.equal(deriveBlastKind('shell_x',false),'shell');assert.equal(deriveBlastKind(null,false),'shell');assert.equal(deriveBlastKind(undefined,true),'bomb');
  assert.equal(deriveNpcShotWeapon({type:'npc-shot',rounds:3}),'rkm_wz28');assert.equal(deriveNpcShotWeapon({type:'npc-shot',rounds:1}),'ally_rifle');
  assert.equal(deriveNpcShotWeapon({weapon:'mg34'}),'mg34');assert.equal(deriveNpcShotWeapon(null),'ally_rifle');
  assert.equal(derivePass({crack:true,distance:2}),'crack');assert.equal(derivePass({crack:false,distance:9}),'whizz');
  assert.equal(derivePass({crack:false,distance:40}),'none');assert.equal(derivePass({}),'none');assert.equal(derivePass(null),'none');
});

// ------------------------------------------------------------------------------------------------ director: zones and occlusion
const m01Sim=(clockText='04:50:00')=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});
  sim.mission.phase='MAIN_COMBAT';sim.battleClock=bc(clockText);
  // Sector states from the mission's own schedule, the rule M01Simulation.tick applies each step.
  for(const sector of sim.sectors.sectors){
    const schedule=mission.sectors.find(s=>s.id===sector.id).schedule;
    sector.state=schedule.filter(s=>seconds(s.at)<=sim.battleClock).at(-1).state;
  }
  return sim;
};
const place=(sim,x,y,z)=>{sim.player.x=x;sim.player.y=y;sim.player.z=z;};

test('listener zone: the director follows the player through open, bridge and station and only touches the mix on a change',()=>{
  const {audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),sim=m01Sim(),view=readonly(sim),sends=audio.mix.sends;
  place(sim,-100,-3,20);director.update(view);assert.equal(audio.zone.id,'open');
  place(sim,500,0,20);director.update(view);assert.equal(audio.zone.id,'bridge');assert.equal(sends.B.gain.value,1);assert.equal(sends.A.gain.value,0);
  place(sim,-400,0,30);director.update(view);assert.equal(audio.zone.id,'station');
  assert.equal(audio.mix.zoneFilter.frequency.value,1800,'interior lowpass inside the station');
  place(sim,-100,-3,20);director.update(view);assert.equal(audio.zone.id,'open');assert.equal(audio.mix.zoneFilter.frequency.value,20000);
  let events=0;const count=()=>{events=0;for(const n of ctx.nodes)for(const v of Object.values(n))if(v&&Array.isArray(v.events))events+=v.events.length;return events;};
  const before=count();for(let i=0;i<500;i++){sim.clock+=.001;director.update(view);}
  assert.equal(count(),before,'steady state: no automation events');
  assert.equal(director.errors,0,director.lastError);
});
test('zone occlusion: only a listener inside an interior zone muffles sources outside it (600-900 Hz, -12 dB); open and bridge never do',()=>{
  const {audio}=makeAudio();new M01AudioDirector(audio);
  const layout=audio.core.layout,zone=id=>layout.zones.find(z=>z.id===id)??layout.defaultZone,out={hz:0,gain:1};
  const station=zone('station'),bridge=zone('bridge'),open=layout.defaultZone;
  assert.equal(station.id,'station');assert.equal(open.id,'open');
  const near=occlusionFor(layout,station,25,-3,43,0,{hz:0,gain:1}),far=occlusionFor(layout,station,25,-3,43,400,{hz:0,gain:1});
  assert.equal(near.hz,900);assert.equal(far.hz,600);assert.ok(Math.abs(20*Math.log10(far.gain)+12)<1e-9);
  assert.ok(Math.abs(occlusionFor(layout,station,-100,0,30,100,out).hz-750)<1e-9,'linear between 900 and 600 over 200 m');
  assert.equal(occlusionFor(layout,station,-400,0,30,10,out),null,'a source inside the station is not muffled');
  assert.equal(occlusionFor(layout,bridge,25,-3,43,400,out),null,'the bridge is semi-open (occlusion: null)');
  assert.equal(occlusionFor(layout,open,25,-3,43,400,out),null,'a listener in the open hears everything');
  assert.equal(occlusionFor(layout,null,0,0,0,10,out),null);assert.equal(occlusionFor(null,station,0,0,0,10,out),null);
  assert.equal(occlusionFor(layout,station,25,-3,43,NaN,{hz:0,gain:1}).hz,900,'a non-finite distance is treated as near');
});

// ------------------------------------------------------------------------------------------------ director: emitters and the casemate crew gate
const ckmBursts=log=>log.filter(e=>e[1]==='weaponFire'&&e[2]==='ckm_wz30'&&String(e[5].key).startsWith('ae_s1_ckm_casemate'));
// T47 retired the dramatized casemate ckm from the mission data: the real gun of post S2 is the only ckm of the west bridgehead, and it sounds through the simulation's
// ally-fire event (one ckmBurst per burst). The crew gate, the sector states and the slot-based scheduling that emitter exercised are still the rules of every dramatized
// emitter, so the tests below keep running them on the emitter exactly as it was authored (tests/helpers/m01-retired-casemate.js), put back into the definition of the
// simulation under test (a copy: the mission data itself is never touched).
function withCasemate(sim){sim.definition=missionWithRetiredCasemate(sim.definition);return sim;}
class CasemateSim extends M01Simulation{constructor(seed){super(seed);withCasemate(this);}}
function runEmitters(sim,{frames,dt=.05}){
  const {audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),log=[],view=readonly(sim);
  record(audio,log,()=>sim.battleClock);
  for(let i=0;i<frames;i++){sim.clock+=dt;ctx.currentTime=sim.clock;director.update(view);if(i%200===0){ctx.flush();ctx.nodes.length=0;ctx.sources.length=0;}}
  assert.equal(director.errors,0,director.lastError);
  return {audio,director,log};
}
test('T47: the real mission data has no casemate ckm: the west bridgehead has no emitter and the director schedules no dramatized ckm burst there',()=>{
  const sim=m01Sim('05:00:00');
  assert.deepEqual(sim.definition.sectors.find(s=>s.id==='s1_west_bridgehead').audioEmitters,[]);
  const run=runEmitters(sim,{frames:2400});   // 120 s of the battle at 05:00, the window the casemate emitter used to sound in
  assert.deepEqual(run.audio.activeEmitters(sim.battleClock,run.director.stateOf,[],null).map(e=>e.id).sort(),['ae_s2_ckm_east','ae_s2_mg_dike','ae_s2_mg_train']);
  assert.equal(ckmBursts(run.log).length,0,'no dramatized ckm burst: the only ckm sound of the west bridgehead is the simulation ally-fire event');
  const ckmCalls=run.log.filter(e=>e[1]==='weaponFire'&&e[2]==='ckm_wz30');
  assert.ok(ckmCalls.every(e=>String(e[5].key).startsWith('ae_s2_ckm_east')),'any ckm call of the director belongs to the east emitter, 1 km away');
  assert.ok(run.director.diagnostics.emitters.played>0,'the east emitters still sound');
});
test('dramatized casemate ckm (retired from the mission data, put back here) with real sector states: audible 04:46-06:12 (s1 states), silent from the evacuation',()=>{
  const rows=[['04:45:59',false],['04:46:00',true],['05:00:00',true],['06:09:59',true],['06:10:00',true],['06:11:59',true],['06:12:00',false],['06:12:01',false],['06:30:00',false],['06:44:59',false]];
  for(const [clock,expected] of rows){
    const sim=withCasemate(m01Sim(clock)),{audio}=makeAudio(),director=new M01AudioDirector(audio);director.reset(sim);
    const ids=audio.activeEmitters(sim.battleClock,director.stateOf,[],null).map(e=>e.id);
    assert.equal(ids.includes('ae_s1_ckm_casemate'),expected,`${clock} s1=${sim.sectors.sectors[0].state}`);
  }
  assert.equal(m01Sim('06:12:00').sectors.sectors[0].state,'evacuating_bridgehead');
  // Audible: bursts of the ckm come out of a long run at 05:00 and are tagged with the emitter key...
  const audible=runEmitters(withCasemate(m01Sim('05:00:00')),{frames:2400});
  const bursts=ckmBursts(audible.log);assert.ok(bursts.length>=15,`${bursts.length} ckm bursts in 120 s`);
  for(const b of bursts){assert.ok(b[3]>=-1&&b[3]<=1,'pan');assert.ok(b[4]>0&&b[4]<2500,'distance');assert.ok(b[5].rounds>=3&&b[5].rounds<=6);}
  // ...silent after the evacuation, and before it starts.
  assert.equal(ckmBursts(runEmitters(withCasemate(m01Sim('06:12:00')),{frames:2400}).log).length,0);
  assert.equal(ckmBursts(runEmitters(withCasemate(m01Sim('04:45:00')),{frames:600}).log).length,0);
  // The gate is re-checked when the burst is due: a burst scheduled before the evacuation does not sound after it.
  const sim=withCasemate(m01Sim('06:11:59')),{audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),log=[];record(audio,log,()=>sim.battleClock);
  director.reset(sim);let scheduled=false;
  for(let i=0;i<2400&&!scheduled;i++){sim.clock+=.05;ctx.currentTime=sim.clock;director.update(sim);scheduled=director.pending.some(p=>p.used&&p.emitter.id==='ae_s1_ckm_casemate');}
  assert.ok(scheduled,'a casemate burst is waiting');
  sim.battleClock=bc('06:12:00');for(const s of sim.sectors.sectors)if(s.id==='s1_west_bridgehead')s.state='evacuating_bridgehead';
  for(let i=0;i<120;i++){sim.clock+=.05;director.update(sim);}
  assert.equal(ckmBursts(log).length,0);assert.ok(director.diagnostics.emitters.suppressed>=1);
});
test('emitters: far emitters use the distant category, timing is slot-based without backlog, and a rewind drops pending bursts',()=>{
  const sim=withCasemate(m01Sim('05:00:00')),{audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),log=[];record(audio,log,()=>sim.battleClock);
  place(sim,-70,-3,24);
  for(let i=0;i<1200;i++){sim.clock+=.05;ctx.currentTime=sim.clock;director.update(sim);if(i%100===0){ctx.flush();ctx.nodes.length=0;ctx.sources.length=0;}}
  const east=log.filter(e=>e[1]==='weaponFire'&&e[2]==='mg34'&&String(e[5].key).startsWith('ae_s2_'));
  assert.ok(east.length>0,'the east MG34 emitters sound');assert.ok(east.every(e=>e[5].distant===true&&e[4]>1000),'1 km away: distant category');
  const ckm=ckmBursts(log);assert.ok(ckm.length>0&&ckm.every(e=>e[5].distant===false),'the casemate is close');
  // A jump of one hour does not queue anything: only the current slot's bursts exist.
  const before=director.stats.slots;sim.clock+=3600;director.update(sim);assert.equal(director.stats.slots,before+1);
  assert.ok(director.diagnostics.emitters.pending<=director.pending.length);
  // Rewind: bursts scheduled on the old timeline are dropped and counted; whatever is pending afterwards belongs to the new clock.
  for(let i=0;i<400&&!director.pending.some(p=>p.used);i++){sim.clock+=.05;director.update(sim);}
  assert.ok(director.pending.some(p=>p.used),'a burst is waiting on the old timeline');
  const old=sim.clock;sim.clock-=500;director.update(sim);assert.equal(director.stats.rewinds,1);
  assert.ok(director.pending.every(p=>!p.used||p.at<sim.clock+8),`nothing from t=${old} survived the rewind`);   // 8 s: the d/343 delay of a 2.5 km emitter
});
test('zone occlusion is applied to the director emitter fire and cleared right after (station listener vs open listener)',()=>{
  const station=m01Sim('05:00:00');place(station,-400,0,30);
  const inStation=runEmitters(station,{frames:1200}),sets=inStation.log.filter(e=>e[1]==='setOcclusion');
  assert.ok(sets.length>=2&&sets.some(e=>e[2]!==null),'a muffled burst');
  for(let i=0;i<sets.length;i+=2){assert.ok(sets[i][2]&&sets[i][2].hz>=600&&sets[i][2].hz<=900);assert.equal(sets[i+1][2],null,'cleared');}
  assert.equal(inStation.audio.occlusion,null);
  const open=m01Sim('05:00:00');place(open,-100,-3,20);
  assert.equal(runEmitters(open,{frames:1200}).log.filter(e=>e[1]==='setOcclusion').length,0,'the open listener hears the unmuffled source');
});

// ------------------------------------------------------------------------------------------------ director: with and without battleReadout
test('works with and without battleReadout (T22): the readout drives the layers, the heard intensity and the phase carry the music without it',()=>{
  const make=readoutBehaviour=>{
    const sim=m01Sim('05:00:00'),{audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),base=readonly(sim);
    let reads=0;
    const view=new Proxy(base,{get(t,k,r){
      if(k==='battleReadout'){reads++;return readoutBehaviour(sim);}
      return Reflect.get(t,k,r);
    }});
    return {sim,audio,ctx,director,view,reads:()=>reads};
  };
  const loud=()=>({clock:0,sectors:{s2_east_bridgehead:{intensity:.9},s1_west_bridgehead:{intensity:.2}},recentBlasts:[]});
  // with the readout
  const a=make(loud);
  for(let i=0;i<400;i++){a.sim.clock+=.05;a.ctx.currentTime=a.sim.clock;a.director.update(a.view);}
  assert.deepEqual([...a.audio.core.music.keys()].sort(),['stem0','stem1','stem2','stem3']);
  assert.equal(a.director.stats.readoutMissing,0);assert.ok(a.director.stats.readoutSamples>=70);
  // without it (T22 not present): the getter yields nothing, quiet start -> drone only; loud heard fire -> layers
  const b=make(()=>undefined);
  for(let i=0;i<400;i++){b.sim.clock+=.05;b.ctx.currentTime=b.sim.clock;b.director.update(b.view);}
  assert.deepEqual([...b.audio.core.music.keys()].sort(),['stem0']);
  assert.equal(b.director.stats.readoutSamples,0);assert.ok(b.director.stats.readoutMissing>=70);
  b.audio.clock=b.sim.clock;   // the game's updateM01Presentation keeps the audio clock in step with the sim
  for(let i=0;i<60;i++){b.audio.weaponFire('mg34',0,20,{rounds:9,key:`loud:${i}`});b.audio.explosion(0,25,{key:`b:${i}`});}
  for(let i=0;i<40;i++){b.sim.clock+=.05;b.ctx.currentTime=b.sim.clock;b.director.update(b.view);}
  assert.ok(b.audio.core.music.has('stem1'),'the heard intensity alone raises L1');
  // a throwing getter is not fatal either
  const c=make(()=>{throw new Error('readout exploded');});
  for(let i=0;i<100;i++){c.sim.clock+=.05;c.ctx.currentTime=c.sim.clock;c.director.update(c.view);}
  assert.equal(c.director.errors,0);assert.ok(c.director.stats.readoutMissing>0);assert.ok(c.audio.core.music.has('stem0'));
  // the 4 Hz sampling: 60 s at 60 fps reads the readout about 240 times, not 3600
  const d=make(loud);
  for(let i=0;i<3600;i++){d.sim.clock+=1/60;d.ctx.currentTime=d.sim.clock;d.director.update(d.view);}
  assert.ok(d.reads()>=235&&d.reads()<=245,`readout read ${d.reads()} times in 60 s`);
});

// ------------------------------------------------------------------------------------------------ allocation
/**
 * The measurement runs in a fresh node process: inside this test file the earlier tests feed the director read-only Proxy views, which makes
 * every property load megamorphic and boxes each number it returns (an artefact of the test process, not of the game, where one simulation
 * class is read). The heap sampling profiler includes garbage (includeObjectsCollectedBy*GC), so a closure, an object, a string or a boxed
 * number per frame all show up; `control` proves the instrument sees a 2-object allocation per iteration.
 */
const ALLOC_SCRIPT=`
const [audioUrl,directorUrl,simUrl,ctxUrl,framesText]=process.argv.slice(1);
const {AudioManager}=await import(audioUrl),{M01AudioDirector}=await import(directorUrl),{M01Simulation,seconds}=await import(simUrl),{FakeAudioContext}=await import(ctxUrl);
const frames=Number(framesText),ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx});audio.init();
for(const id of JSON.parse(process.env.MUSIC_IDS))audio.buffers.set(id,ctx.createBuffer(1,2000,ctx.sampleRate));
const sim=new M01Simulation();sim.tick(.05,{skip:true});sim.mission.phase='MAIN_COMBAT';sim.battleClock=seconds('05:00:00');
sim.player.x=-100;sim.player.y=-3;sim.player.z=20;
const director=new M01AudioDirector(audio);
const measure=fn=>{
  const session=new inspector.Session();session.connect();let total=0;const rows=[];
  session.post('HeapProfiler.enable');
  session.post('HeapProfiler.startSampling',{samplingInterval:64,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
  fn();
  session.post('HeapProfiler.stopSampling',(error,result)=>{
    if(error)throw error;
    const walk=n=>{total+=n.selfSize;if(n.selfSize>0)rows.push([n.selfSize,(n.callFrame.functionName||'(anonymous)')+'@'+n.callFrame.url.split('/').pop()+':'+(n.callFrame.lineNumber+1)]);for(const c of n.children)walk(c);};walk(result.profile.head);
  });
  session.disconnect();
  return {total,sites:rows.sort((x,y)=>y[0]-x[0]).slice(0,3).map(r=>r[0]+' '+r[1])};
};
for(let i=0;i<frames;i++)director.update(sim);          // warm-up: JIT, first emitter slot, first decision slot (the clock stays put)
const update=measure(()=>{for(let i=0;i<frames;i++)director.update(sim);});
let sink=null;const control=measure(()=>{for(let i=0;i<frames;i++){sink={i,list:[i,i+1]};}});
console.log(JSON.stringify({frames,update,control:control.total,errors:director.errors,lastError:director.lastError,sink:sink!==null,stems:[...audio.core.music.keys()].sort()}));
`;
test('no per-frame allocation in the director / music update path (steady frames, fresh process, garbage included)',()=>{
  const env={...process.env,MUSIC_IDS:JSON.stringify(ALL_MUSIC_IDS)};delete env.NODE_TEST_CONTEXT;
  const url=path=>new URL(path,import.meta.url).href,frames=60000;
  const out=execFileSync(process.execPath,['--input-type=module','-e',ALLOC_SCRIPT,url('../src/core/audio.js'),url('../src/game/audio-director-m01.js'),url('../src/game/m01-simulation.js'),url('./helpers/fake-audio-context.js'),String(frames)],
    {encoding:'utf8',env,timeout:120000,maxBuffer:1<<20});
  const r=JSON.parse(out.trim().split('\n').at(-1));
  assert.equal(r.errors,0,r.lastError);assert.deepEqual(r.stems,['stem0'],'the music was running (drone only) while it was measured');
  // A boxed number per frame is 16 B; a closure context ~50 B; any object or array more. The optimised path measures ~0.
  assert.ok(r.update.total<4*frames,`${r.update.total} bytes sampled across ${frames} frames (${(r.update.total/frames).toFixed(2)} B/frame); heaviest: ${r.update.sites.join(' | ')}`);
  assert.ok(r.control>40*frames&&r.sink,`control sampled only ${r.control} bytes (it allocates ~105 B per iteration)`);   // the instrument sees allocation at all
  // The structures reused every frame keep their identity (nothing is rebuilt behind the scenes).
  const {audio}=makeAudio(),director=new M01AudioDirector(audio),sim=m01Sim('05:00:00'),view=readonly(sim);
  const reused=[director.active,director.pending,director.input,director.spatialOut,director.conductor.fired,director.conductor.model.on,director.stateOf];
  for(let i=0;i<2000;i++){sim.clock+=.05;director.update(view);}
  assert.deepEqual([director.active,director.pending,director.input,director.spatialOut,director.conductor.fired,director.conductor.model.on,director.stateOf].map((x,i)=>x===reused[i]),reused.map(()=>true));
  assert.equal(director.errors,0,director.lastError);
});

// ------------------------------------------------------------------------------------------------ route proofs
const hash=text=>{let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;};
/** Per-tick fingerprint of everything the director could disturb (clocks, both RNG states, the player, the events), plus the whole snapshot every 10th tick. */
class RouteDigest{
  constructor(){this.ticks=0;this.hash=createHash('sha256');this.blocks=[];}
  add(sim,events){
    this.ticks++;
    const p=sim.player;
    this.hash.update(`${sim.clock}|${sim.battleClock}|${sim.rng.state}|${sim.display.rng.state}|${p.x}|${p.y}|${p.z}|${p.angle}|${p.health}|${sim.weapon.mag}|${JSON.stringify(events)}\n`);
    if(this.ticks%10===0)this.hash.update(JSON.stringify(sim.snapshot(false)));
    if(this.ticks%512===0)this.blocks.push(this.hash.digest('hex')),this.hash=createHash('sha256');
  }
  finish(){this.blocks.push(this.hash.digest('hex'));return {ticks:this.ticks,blocks:this.blocks};}
}
test('full recruta route: the director only reads (deep read-only view, no RNG access, unchanged snapshots and RNG states) and the route is byte-identical with and without it; casemate gate follows real states',()=>{
  // Run A: the route with no director at all.
  const plain=new RouteDigest();
  route(19390901,{support:false,Simulation:CasemateSim,onStep:({sim,events})=>plain.add(sim,events)});
  // Run B: the same route with the director fed through a deep read-only view, as game.js feeds it (events first, then update).
  const {audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),log=[];let stamp=0;record(audio,log,()=>stamp);
  const withDirector=new RouteDigest(),samples=[];let ticks=0,last=director.stats.slots;
  const result=route(19390901,{support:false,Simulation:CasemateSim,onStep:({sim,events})=>{
    ticks++;ctx.currentTime=sim.clock;stamp=sim.battleClock;
    const view=readonly(sim),rng=[sim.rng.state,sim.display.rng.state],clock=[sim.clock,sim.battleClock],consumed=Object.keys(sim.consumed).length;
    const heavy=ticks%10===0,before=heavy?hash(JSON.stringify(sim.snapshot(false))):0;
    for(const event of events)director.handleEvent(event,view);
    director.update(view);
    assert.deepEqual([sim.rng.state,sim.display.rng.state],rng,`sim RNG moved at tick ${ticks}`);
    assert.deepEqual([sim.clock,sim.battleClock],clock);assert.equal(Object.keys(sim.consumed).length,consumed);
    if(heavy)assert.equal(hash(JSON.stringify(sim.snapshot(false))),before,`sim state changed at tick ${ticks}`);
    withDirector.add(sim,events);
    const slots=director.stats.slots;
    if(slots!==last){last=slots;samples.push([sim.battleClock,director.active.some(e=>e.id==='ae_s1_ckm_casemate'),sim.sectors.sectors[0].state]);}
    if(ticks%100===0){ctx.flush();ctx.nodes.length=0;ctx.sources.length=0;}
  }});
  assert.equal(director.errors,0,director.lastError);
  assert.deepEqual(withDirector.finish(),plain.finish(),'every block of the route is byte-identical with the director running');
  // casemate gate over the real route
  const start=bc('04:46:00'),end=bc('06:12:00');
  const inside=samples.filter(s=>s[0]>=start&&s[0]<end),after=samples.filter(s=>s[0]>=end),pre=samples.filter(s=>s[0]<start);
  assert.ok(inside.length>50&&after.length>10&&pre.length>5,`${pre.length}/${inside.length}/${after.length} samples`);
  for(const [clock,has,state] of samples)assert.equal(has,clock>=start&&clock<end,`casemate audibility at ${clock} (s1 ${state})`);
  assert.ok(samples.filter(s=>s[2]==='evacuating_bridgehead').every(s=>s[1]===false));
  const bursts=ckmBursts(log);assert.ok(bursts.length>20,`${bursts.length} ckm bursts`);
  assert.ok(bursts.every(b=>b[0]>=start&&b[0]<end),'no casemate burst outside 04:46-06:12');
  // music over the real route: every stinger at most once, in story order; the mission ends in silence (roll call)
  const stingers=log.filter(e=>e[1]==='playMusic'&&e[2]===STINGER_SLOT).map(e=>e[3]);
  assert.equal(new Set(stingers).size,stingers.length,'once per run');
  assert.deepEqual(stingers,STINGER_IDS.filter(id=>stingers.includes(id)),'story order');
  assert.ok(stingers.includes('m01.stinger.planes_heard')&&stingers.includes('m01.stinger.east_demolition')&&stingers.includes('m01.stinger.west_demolition'),stingers.join());
  const gates=log.filter(e=>e[1]==='setMusicGate').map(e=>e[2]);assert.ok(gates.includes(false)&&gates.at(-1)===false);
  assert.equal(result.sim.mission.complete,true);
  // diagnostics are plain, cloneable data (gameDiagnostics structuredClones them)
  assert.doesNotThrow(()=>structuredClone(audio.diagnostics));assert.equal(audio.diagnostics.director.emitters.played>0,true);
  director.dispose();assert.equal(audio.diagnostics.director,null);audio.dispose();
});

class Stop extends Error{}
/** The route (no readout tweaks) from the start to `until`, with the director fed through a read-only view. */
function segmentRun({readoutOff=false,until='05:05:00'}={}){
  const {audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),log=[];let stamp=0,n=0;record(audio,log,()=>stamp);
  try{
    route(19390901,{support:false,Simulation:CasemateSim,onStep:({sim,events})=>{
      ctx.currentTime=sim.clock;stamp=sim.clock;
      const view=readonlyWithout(sim,readoutOff);for(const e of events)director.handleEvent(e,view);director.update(view);
      if(++n%100===0){ctx.flush();ctx.nodes.length=0;ctx.sources.length=0;}
      if(sim.battleClock>=bc(until))throw new Stop();
    }});
  }catch(error){if(!(error instanceof Stop))throw error;}
  return {log,diagnostics:director.diagnostics,director,audio};
}
const withoutViews=new WeakMap();
function readonlyWithout(sim,off){
  const view=readonly(sim);if(!off)return view;
  let p=withoutViews.get(sim);if(!p){p=new Proxy(view,{get(t,k,r){return k==='battleReadout'?undefined:Reflect.get(t,k,r);}});withoutViews.set(sim,p);}return p;
}
test('determinism: two identical runs produce the identical director call log and diagnostics',()=>{
  const a=segmentRun(),b=segmentRun();
  assert.ok(a.log.length>60,`${a.log.length} logged calls`);assert.ok(a.log.some(e=>e[1]==='playMusic'),'music calls are part of the log');
  assert.ok(ckmBursts(a.log).length>5,'and so is the casemate fire (04:46 onwards)');
  assert.deepEqual(a.log,b.log);assert.deepEqual(a.diagnostics,b.diagnostics);
  assert.equal(a.director.errors,0,a.director.lastError);
});
test('segment runs without battleReadout complete cleanly, with the same emitter calls as with it',()=>{
  const a=segmentRun(),b=segmentRun({readoutOff:true});
  assert.equal(b.director.errors,0,b.director.lastError);assert.equal(b.diagnostics.emitters.readoutSamples,0);assert.ok(b.diagnostics.emitters.readoutMissing>0);
  assert.ok(a.diagnostics.emitters.readoutSamples>0);
  const emitterCalls=log=>log.filter(e=>e[1]==='weaponFire'&&String(e[5]?.key).startsWith('ae_'));
  assert.deepEqual(emitterCalls(a.log),emitterCalls(b.log),'emitter fire does not depend on the readout');
});
test('stingers re-arm on checkpoint restore: restore before the event plays it again; restore after it does not',()=>{
  const {audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),log=[];let stamp=0,n=0;record(audio,log,()=>stamp);
  const d=driver(19390901,{support:false,onStep:({sim,events})=>{
    ctx.currentTime=sim.clock;stamp=sim.clock;const view=readonly(sim);for(const e of events)director.handleEvent(e,view);director.update(view);
    if(++n%100===0){ctx.flush();ctx.nodes.length=0;ctx.sources.length=0;}
  }});
  toRepair(d);
  const planes=()=>log.filter(e=>e[1]==='playMusic'&&e[3]==='m01.stinger.planes_heard').length;
  assert.equal(planes(),1,'the bombing stinger played once on the way');
  const {cp_m01_a_orientacao:before,cp_m01_b_reorganizacao:after}=d.checkpoints;assert.ok(before&&after,Object.keys(d.checkpoints).join());
  const {sim}=d;
  // restore to AFTER the event: still consumed, not replayed
  sim.restoreSnapshot(structuredClone(after));sim.drainEvents();director.reset(sim);
  for(let i=0;i<200;i++)d.step({});assert.equal(planes(),1,'consumed at the checkpoint: no replay');
  // restore to BEFORE the event: re-armed, plays again when the event is consumed again
  sim.restoreSnapshot(structuredClone(before));sim.drainEvents();director.reset(sim);
  assert.equal(sim.consumedEvent(E('planes_heard')),false);
  d.until(()=>sim.consumedEvent(E('planes_heard')),240);for(let i=0;i<20;i++)d.step({});
  assert.equal(planes(),2,'unconsumed at the checkpoint: the stinger is armed again');
  assert.equal(director.errors,0,director.lastError);
});

// ------------------------------------------------------------------------------------------------ lifecycle, source guards and wiring
test('reset and dispose: music stops, scheduling is forgotten, diagnostics detach; a non-M01 sim is ignored',()=>{
  const {audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),sim=m01Sim('05:00:00');
  for(let i=0;i<200;i++){sim.clock+=.05;ctx.currentTime=sim.clock;director.update(sim);}
  assert.ok(audio.core.music.size>0);assert.ok(audio.diagnostics.director);
  director.reset(sim);assert.equal(audio.core.music.size,0,'reset stops the music');assert.equal(director.diagnostics.emitters.pending,0);
  assert.equal(director.update({missionId:'other',clock:1}),false);
  director.reset({missionId:'other'});assert.equal(director.diagnostics.bound,false);
  director.dispose();director.dispose();assert.equal(director.update(sim),false);assert.equal(audio.diagnostics.director,null);
  assert.doesNotThrow(()=>director.handleEvent({type:'restored'},sim));
  // update before the context exists schedules nothing and does not throw
  const cold=new AudioManager({contextFactory:()=>new FakeAudioContext()}),cd=new M01AudioDirector(cold);
  assert.equal(cd.update(sim),false);assert.equal(cd.errors,0);
  // a stub audio without the core API cannot break the loop
  const stub=new M01AudioDirector({});assert.doesNotThrow(()=>{stub.reset(sim);stub.update(sim);stub.handleEvent({type:'restored'},sim);stub.dispose();});
});
test('events: restore silences the music for 20 s; near blasts dip it; derived kinds are counted',()=>{
  const {audio,ctx}=makeAudio(),director=new M01AudioDirector(audio),sim=m01Sim('05:00:00');
  director.reset(sim);
  for(let i=0;i<100;i++){sim.clock+=.05;ctx.currentTime=sim.clock;director.update(sim);}
  assert.ok(audio.core.music.has('stem0'));
  director.handleEvent({type:'restored'},sim);sim.clock+=.05;director.update(sim);
  assert.equal(director.conductor.gate,GATE_OFF);assert.equal(audio.core.music.size,0);
  sim.clock+=T.afterRestoredSec;director.update(sim);assert.equal(director.conductor.gate,GATE_LAYERS);
  sim.sectors.damage.push({id:'m01_grenade_0',x:sim.player.x+10,y:0,z:sim.player.z,started:sim.clock,soundAt:sim.clock+.03});
  director.handleEvent({type:'m01-blast',point:{x:sim.player.x+10,y:0,z:sim.player.z},soundAt:sim.clock+.03,aerial:false},sim);
  assert.equal(director.derived.grenade,1);
  sim.clock+=.05;director.update(sim);assert.equal(audio.core.mix.musicDuck.gain.events.filter(e=>e[0]==='target').at(-1)[1],T.blastDuck);
  director.handleEvent({type:'npc-shot',rounds:3},sim);director.handleEvent({type:'npc-shot',rounds:1},sim);director.handleEvent({type:'round-impact',crack:true,distance:3},sim);
  director.handleEvent({type:'unknown'},sim);director.handleEvent(null,sim);
  assert.equal(director.derived.rkm_wz28,1);assert.equal(director.derived.ally_rifle,1);assert.equal(director.derived.crack,1);
  // a demolition blast does not duck (its own stinger scores it)
  sim.sectors.damage.push({id:'east_demolition',x:sim.player.x+5,y:0,z:sim.player.z,started:sim.clock,soundAt:sim.clock+.02});
  const ducks=audio.core.mix.musicDuck.gain.events.length;
  director.handleEvent({type:'m01-blast',point:{x:sim.player.x+5,y:0,z:sim.player.z},soundAt:sim.clock+.02,aerial:false},sim);
  assert.equal(director.derived.demolition,1);sim.clock+=.1;director.update(sim);assert.equal(audio.core.mix.musicDuck.gain.events.length,ducks);
});
test('presentation only: director and music sources never touch the RNG, the wall clock or write to simulation state',()=>{
  const strip=text=>text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"`])\/\/.*$/gm,'$1');
  const director=strip(readFileSync(new URL('../src/game/audio-director-m01.js',import.meta.url),'utf8')),music=strip(readFileSync(new URL('../src/core/audio/music.js',import.meta.url),'utf8'));
  for(const [name,text] of [['director',director],['music',music]]){
    assert.doesNotMatch(text,/Math\.random|\.rng\b|Date\.now|performance\.now|new Date\b|crypto\./,`${name}: no RNG, no wall clock`);
    assert.doesNotMatch(text,/\b(sim|view|state|event|consumed|input\.consumed)\.[A-Za-z_.\[\]']+\s*(=(?!=)|\+=|-=|\*=|\+\+|--)/,`${name}: no assignment into sim/event state`);
    assert.doesNotMatch(text,/\b(sim|view|state|event|consumed)\.[A-Za-z_.]+\.(push|splice|pop|shift|unshift|sort|reverse|set|delete|clear)\(/,`${name}: no mutating call on sim state`);
  }
  assert.doesNotMatch(director,/currentTime/,'director decisions use sim clocks only');
  assert.doesNotMatch(director+music,/from '\.\.\/(world|render|ui)\/|m01-simulation|simulation\.js/,'no import of simulation, world or render code');
  assert.match(music,/currentTime/,'music uses the audio clock only to schedule fades');
});
test('game.js wiring: optional-chained hooks only, one construction, events after the game sounds',()=>{
  const source=readFileSync(new URL('../src/game/game.js',import.meta.url),'utf8');
  assert.equal(source.match(/new M01AudioDirector\(this\.audio\)/g).length,1);
  assert.equal(source.match(/this\.audioDirector\?\./g).length,6,'reset x3, update, handleEvent, dispose');
  assert.equal(source.match(/audioDirector/g).length,7,'construction + six hooks');
  // Game built the way the older tests build it (no director): nothing changes.
  const calls=[],audio={wz29Mechanism:m=>calls.push(['audio',m]),resetPresentation(){calls.push(['audio-reset']);}};
  const sim=new M01Simulation(),host=Object.assign(Object.create(Game.prototype),{sim,pendingSounds:[],audio,renderer:{m01:{}}});
  host.handleM01Event({type:'reload'});assert.deepEqual(calls,[['audio',sim.weapon.reloadMode]]);
  // ...and with a director: it sees the event after the game's own sound, and is reset after the audio presentation.
  calls.length=0;host.audioDirector={handleEvent:(e,s)=>calls.push(['director',e.type,s===sim]),reset:s=>calls.push(['director-reset',s===sim]),update:()=>{}};
  host.handleM01Event({type:'reload'});assert.deepEqual(calls,[['audio',sim.weapon.reloadMode],['director','reload',true]]);
  calls.length=0;host.rebuildSounds();assert.deepEqual(calls.slice(0,2),[['audio-reset'],['director-reset',true]]);
});
