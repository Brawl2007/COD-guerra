import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioManager,AUDIO_PRIORITY,audioHash,audioVariation,audioDistanceShape} from '../src/core/audio.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {DISTANT_SLOT_SEC} from '../src/core/battlefield-audio.js';

class Param{
  constructor(value=0){this.value=value;}
  setValueAtTime(value){this.value=value;}
  exponentialRampToValueAtTime(value){this.value=value;}
  setTargetAtTime(value){this.value=value;}
  cancelScheduledValues(){}
}
class Node{
  constructor(ctx){this.ctx=ctx;this.connections=[];this.disconnected=false;}
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.connections=[];this.disconnected=true;}
}
class Source extends Node{
  constructor(ctx){super(ctx);this.onended=null;this.loop=false;this.playbackRate=new Param(1);ctx.sources.push(this);}
  start(){this.started=true;}
  stop(when=0){this.stopped=true;this.stopAt=when;}
  finish(){if(this.onended){const fn=this.onended;this.onended=null;fn();}}
}
class FakeAudioContext{
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=2000;this.destination=new Node(this);this.sources=[];}
  createGain(){const n=new Node(this);n.gain=new Param(1);return n;}
  createBiquadFilter(){const n=new Node(this);n.frequency=new Param(18000);n.Q=new Param(1);n.type='lowpass';return n;}
  createStereoPanner(){const n=new Node(this);n.pan=new Param(0);return n;}
  createOscillator(){const n=new Source(this);n.frequency=new Param(440);n.type='sine';return n;}
  createBufferSource(){return new Source(this);}
  createBuffer(channels,length,sampleRate){
    const data=Array.from({length:channels},()=>new Float32Array(length));
    return {length,numberOfChannels:channels,duration:length/sampleRate,getChannelData:i=>data[i]};
  }
  async decodeAudioData(){return this.createBuffer(1,2000,this.sampleRate);}
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
  async close(){this.state='closed';}
  flush(){for(const s of [...this.sources])if(s.stopAt!==undefined)s.finish();}
}
const makeAudio=(maxVoices=32)=>{const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx,maxVoices});assert.equal(audio.init(),true);return {audio,ctx};};
const spatial=point=>({distance:Math.hypot(point.x,point.z),pan:Math.sin(Math.atan2(point.z,point.x))});

test('audio variation is deterministic and independent of Math.random',()=>{
  assert.equal(audioHash('mg34:1'),audioHash('mg34:1'));assert.notEqual(audioHash('mg34:1'),audioHash('mg34:2'));
  const a=audioVariation('event',.9,1.1),b=audioVariation('event',.9,1.1);assert.equal(a,b);assert.ok(a>=.9&&a<=1.1);
});

test('rifle, MG34, RKM, CKM, impacts, near miss and layered explosion remain distinct presentation events',()=>{
  const {audio,ctx}=makeAudio(64);
  audio.rifleShot(.2,18,'kar98k','rifle-a');
  audio.mg34Burst(-.4,75,4,.075,'mg-a');
  audio.rkmBurst(.3,55,3,.11,'rkm-a');
  audio.ckmBurst(-.2,80,4,.1,'ckm-a');
  for(const material of ['earth','wood','metal','stone'])audio.impact(material,.1,12,'impact-'+material);
  audio.crack(-.6,3,'near-a');audio.explosion(.4,45,{scale:'demolition',key:'blast-a'});
  const e=audio.diagnostics.eventCounts;
  assert.equal(e.rifle,1);assert.equal(e.mg34,1);assert.equal(e.rkm,1);assert.equal(e.ckm,1);assert.equal(e.impact,4);assert.equal(e['near-miss'],1);assert.equal(e.explosion,1);
  assert.ok(audio.diagnostics.activeVoices<=64);assert.equal(audio.diagnostics.proceduralBuffers,2,'one white and one brown noise buffer, shared by every voice');
  ctx.flush();assert.equal(audio.diagnostics.activeVoices,0);audio.dispose();
});

test('near/mid/far routing lowers gain and bandwidth without changing event identity',()=>{
  const near=audioDistanceShape(5),mid=audioDistanceShape(160),far=audioDistanceShape(900);
  assert.ok(near.gain>mid.gain&&mid.gain>far.gain);
  assert.ok(near.filter>mid.filter&&mid.filter>far.filter);
  const {audio}=makeAudio(8);audio.rifleShot(0,5,'kar98k','near-rifle');audio.rifleShot(0,160,'kar98k','mid-rifle');audio.rifleShot(0,900,'kar98k','far-rifle');
  assert.equal(audio.diagnostics.eventCounts.rifle,3);audio.dispose();
});

test('voice budget evicts low-priority presentation and never exceeds the hard limit',()=>{
  const {audio}=makeAudio(4);
  for(let i=0;i<4;i++)audio.noise(1,.02,0,0,{priority:AUDIO_PRIORITY.ambience,kind:'ambience-'+i,key:'a'+i});
  assert.equal(audio.diagnostics.activeVoices,4);
  audio.crack(0,2,'danger');assert.ok(audio.diagnostics.activeVoices<=4);assert.ok([...audio.voices].some(v=>v.priority===AUDIO_PRIORITY.danger));
  audio.noise(1,.01,0,0,{priority:AUDIO_PRIORITY.ambience,kind:'discard-me',key:'drop'});
  assert.equal(audio.diagnostics.activeVoices,4);assert.ok(audio.diagnostics.droppedVoices>=1);assert.equal(audio.diagnostics.peakVoices,4);
  audio.dispose();
});

test('distant rifle/MG stay low priority and cannot evict more important voices; critical can evict distant',()=>{
  const protectedPriorities=[AUDIO_PRIORITY.impact,AUDIO_PRIORITY.train,AUDIO_PRIORITY.aircraft,AUDIO_PRIORITY.rifle,AUDIO_PRIORITY.danger,AUDIO_PRIORITY.critical];
  const {audio}=makeAudio(protectedPriorities.length);
  protectedPriorities.forEach((priority,i)=>audio.noise(1,.02,0,0,{priority,kind:'protected-'+i,key:'protected-'+i}));
  const before=[...audio.voices].map(v=>({kind:v.kind,priority:v.priority,serial:v.serial}));
  const droppedBefore=audio.diagnostics.droppedVoices;
  audio.distantBattle('rifle',0,700,'distant-rifle-protected');
  audio.distantBattle('mg',0,700,'distant-mg-protected');
  assert.deepEqual([...audio.voices].map(v=>({kind:v.kind,priority:v.priority,serial:v.serial})),before);
  assert.ok(audio.diagnostics.droppedVoices>droppedBefore,'distant voices should be dropped instead of evicting protected voices');
  assert.ok([...audio.voices].every(v=>v.priority>AUDIO_PRIORITY.distant));
  audio.dispose();

  const second=makeAudio(3),a=second.audio;
  // Cada evento é agora uma voz com várias camadas: três salvas longínquas enchem o orçamento de 3.
  for(const k of ['a','b','c'])a.distantBattle('rifle',0,700,'distant-rifle-evictable-'+k);
  assert.equal(a.diagnostics.activeVoices,3);
  assert.ok([...a.voices].every(v=>v.priority===AUDIO_PRIORITY.distant),'all active distant rifle layers must inherit distant priority');
  a.tone(120,.4,'square',.04,0,0,0,{priority:AUDIO_PRIORITY.critical,kind:'critical-test'});
  assert.equal(a.diagnostics.activeVoices,3);
  assert.ok([...a.voices].some(v=>v.priority===AUDIO_PRIORITY.critical),'critical voice should enter the full budget');
  assert.equal([...a.voices].filter(v=>v.priority===AUDIO_PRIORITY.distant).length,2,'critical voice should evict one distant layer');
  a.dispose();

  const third=makeAudio(8),mg=third.audio;
  mg.distantBattle('mg',0,700,'distant-mg-priority');
  assert.ok([...mg.voices].length>0);
  assert.ok([...mg.voices].every(v=>v.priority===AUDIO_PRIORITY.distant),'all distant MG layers must inherit distant priority');
  mg.dispose();
});

test('M01 ambience/aircraft loops are unique; train clank only follows a live false-to-true transition',async()=>{
  const {audio,ctx}=makeAudio();
  const base={stukas:true,secondRaid:false,train963:false};
  audio.resetPresentation(30,base);audio.updateM01Presentation({clock:30,state:base,spatial});
  audio.updateM01Presentation({clock:30.1,state:base,spatial});
  assert.deepEqual(audio.diagnostics.loops,['aircraft','battle-bed','wind']);assert.equal(audio.diagnostics.permanentLoops,3);
  const arrivals=audio.diagnostics.eventCounts['train-arrival']??0;
  audio.updateM01Presentation({clock:31,state:{...base,train963:true},spatial});
  audio.updateM01Presentation({clock:31.1,state:{...base,train963:true},spatial});
  assert.equal(audio.diagnostics.eventCounts['train-arrival'],arrivals+1);
  await audio.suspend();assert.equal(ctx.state,'suspended');audio.init();await Promise.resolve();assert.equal(ctx.state,'running');
  audio.resetPresentation(31,{...base,train963:true});assert.equal(audio.diagnostics.activeVoices,0);assert.equal(audio.diagnostics.permanentLoops,0);
  audio.updateM01Presentation({clock:31.2,state:{...base,train963:true},spatial});
  assert.equal(audio.diagnostics.eventCounts['train-arrival'],arrivals+1,'reload after arrival must not replay the arrival clank');
  assert.deepEqual(audio.diagnostics.loops,['aircraft','battle-bed','locomotive','wind']);audio.dispose();
});

test('distant battle scheduler is presentation-only, bounded and does not backlog skipped clock slots',()=>{
  const {audio}=makeAudio(16),state={stukas:false,secondRaid:false,train963:false};
  audio.resetPresentation(0,state);
  for(const clock of [4.01,8.01,12.01,40.01])audio.updateM01Presentation({clock,state,spatial});
  assert.equal(audio.presentation.lastBattleSlot,Math.floor(40.01/DISTANT_SLOT_SEC));assert.ok((audio.diagnostics.eventCounts['distant-battle']??0)<=4);
  assert.ok(audio.diagnostics.activeVoices<=16);audio.dispose();
});

test('audio activity cannot consume or mutate M01 gameplay RNG/snapshot',()=>{
  const sim=new M01Simulation(19390901),before=sim.snapshot(false),rng=sim.rng.state;
  const {audio}=makeAudio(64);
  audio.rifleShot(.2,30,'kar98k','invariance-rifle');audio.mg34Burst(-.2,80,6,.075,'invariance-mg');
  audio.impact('metal',.3,15,'invariance-impact');audio.explosion(0,60,{scale:'large',key:'invariance-blast'});
  audio.updateM01Presentation({clock:sim.clock,state:sim.renderState,spatial});
  assert.equal(sim.rng.state,rng);assert.deepEqual(sim.snapshot(false),before);audio.dispose();
});

test('reset/dispose stop transient and permanent nodes without duplicated loops',()=>{
  const {audio,ctx}=makeAudio();
  audio.rifleShot(0,10,'kar98k','cleanup');audio.updateM01Presentation({clock:8,state:{stukas:true,secondRaid:false,train963:false},spatial});
  assert.ok(audio.diagnostics.activeVoices>0);assert.equal(audio.diagnostics.permanentLoops,3);
  audio.resetPresentation(8,{stukas:true,secondRaid:false,train963:false});
  assert.equal(audio.diagnostics.activeVoices,0);assert.equal(audio.diagnostics.permanentLoops,0);
  audio.updateM01Presentation({clock:8.1,state:{stukas:true,secondRaid:false,train963:false},spatial});assert.equal(audio.diagnostics.permanentLoops,3);
  audio.dispose();assert.equal(audio.diagnostics.activeVoices,0);assert.equal(audio.diagnostics.permanentLoops,0);assert.equal(ctx.state,'closed');
  assert.ok(audio.diagnostics.nodesDisposed>0);
});
