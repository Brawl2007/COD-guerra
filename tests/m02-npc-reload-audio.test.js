import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {m02ReloadGrains,playM02NpcReloadAudio} from '../src/render/m02-npc-reload-audio.js';
import {AudioManager} from '../src/core/audio.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

function reloadScene(){
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.allies=[];
 const gun=sim.enemies.find(e=>e.id==='DE-B05');sim.enemies=[gun];
 Object.assign(gun,{x:0,y:0,z:100,mag:0,reserve:50,reloadingUntil:0,nextFireAt:1000,suppressed:0});
 Object.assign(sim.player,{x:-1000,y:0,z:100});sim.drainEvents();return {sim,gun};
}

test('actual reload emits three bounded cues, consumes finite ammunition and replays exactly from a checkpoint',()=>{
 const {sim,gun}=reloadScene();sim.tick(.05,{});
 const start=sim.drainEvents().filter(e=>e.type==='actor-reload-cue');
 assert.deepEqual(start.map(e=>e.phase),['open']);assert.equal(start[0].weapon,'mg34');
 assert.equal(gun.mag,0);assert.equal(gun.reserve,50);const end=gun.reloadingUntil,saved=sim.snapshot();
 for(let i=0;i<85;i++)sim.tick(.05,{});
 const tail=sim.drainEvents(),cues=tail.filter(e=>e.type==='actor-reload-cue');
 assert.deepEqual(cues.map(e=>e.phase),['seat','close']);assert.equal(gun.mag,50);assert.equal(gun.reserve,0);
 assert.ok(cues.every(e=>e.clock>start[0].clock&&e.clock<end));
 const expected=sim.snapshot();sim.restoreSnapshot(saved);sim.drainEvents();for(let i=0;i<85;i++)sim.tick(.05,{});
 assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),tail);
});

test('an incapacitated reloader cannot emit later mechanical stages',()=>{
 const {sim,gun}=reloadScene();sim.tick(.05,{});sim.drainEvents();gun.alive=false;gun.health=0;
 for(let i=0;i<85;i++)sim.tick(.05,{});
 assert.deepEqual(sim.drainEvents().filter(e=>e.type==='actor-reload-cue'),[]);
});

test('weapon stages reuse short M01 mechanisms and follow source position and solid occlusion',()=>{
 for(const weapon of ['wz29','kar98k','rkm_wz28','mg34','mp38'])for(const phase of ['open','seat','close']){
  const grains=m02ReloadGrains(weapon,phase,`${weapon}:${phase}`);
  assert.ok(grains.length);assert.ok(grains.every(g=>g.at>=0&&g.at<.2),'no entire future reload is pre-scheduled');
 }
 const sim={clock:5,player:{x:0,y:0,z:0,eyeHeight:1.65},world:{lineOfSight:()=>false}};
 const event={shooterId:'de',weapon:'mg34',phase:'seat',clock:5,origin:{x:3,y:0,z:4,eyeHeight:1.08}};
 const calls=[],audio={setOcclusion:v=>calls.push(['occlusion',v]),_record:(...a)=>calls.push(['record',...a]),_playPlan:(...a)=>{calls.push(['play',...a]);return 'voice';}};
 const spatial=()=>({pan:.6,distance:5,front:.8});
 assert.equal(playM02NpcReloadAudio(audio,event,sim,spatial),'voice');
 assert.deepEqual(calls[0],['occlusion',{hz:1200,gain:.4}]);assert.equal(calls[2][2].category,'foley');
 assert.equal(calls[2][2].pan,.6);assert.equal(calls[2][2].distance,5);assert.deepEqual(calls[3],['occlusion',null]);
 assert.equal(playM02NpcReloadAudio(audio,event,{...sim,clock:6},spatial),null,'stale events are not replayed');
 assert.equal(playM02NpcReloadAudio(audio,event,sim,()=>({pan:0,distance:31,front:1})),null,'distant mechanisms do not flood the voice pool');
});

test('a nearby cue creates real grains through the M01 audio voice pool',()=>{
 const audio=new AudioManager({contextFactory:()=>new FakeAudioContext(),quality:'low'});audio.init();
 try{
  const sim={clock:5,player:{x:0,y:0,z:0},world:{lineOfSight:()=>true}};
  const event={shooterId:'ally',weapon:'rkm_wz28',phase:'open',clock:5,origin:{x:2,y:0,z:0}};
  const voice=playM02NpcReloadAudio(audio,event,sim,()=>({pan:1,distance:2,front:0}));
  assert.ok(voice);assert.ok(voice.sources.size>0);assert.equal(audio.diagnostics.eventCounts['npc-reload'],1);
 }finally{audio.dispose();}
});
