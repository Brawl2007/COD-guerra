import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioManager,AUDIO_PRIORITY} from '../src/core/audio.js';
import {
  AudioCore,VOICE_PRIORITY,VoicePool,BufferLoader,parseManifest,generateImpulse,impulseSeconds,IR_MAX_SECONDS,MAX_CONVOLVERS,
  SFX_VOICE_CAP,VOICE_BUS_CAP,MUSIC_SLOTS,sfxVoiceCap,FALLBACK_LAYOUT,parseAudioLayout,loadAudioLayout,zoneAt,surfaceAt,
  CREW_GONE_STATES,NO_EMITTERS,parseClock,parseAudioEmitters,isEmitterAudible,activeEmitters,loadAudioEmitters,
} from '../src/core/audio/index.js';
import {FakeAudioContext,MAX_FAKE_SAMPLES} from './helpers/fake-audio-context.js';
import {MusicConductor,createMusicInput,MUSIC_STEM_IDS,MUSIC_STINGERS,GATE_OFF} from '../src/core/audio/index.js';   // T06b
import {missionWithRetiredCasemate} from './helpers/m01-retired-casemate.js';   // T47

const LAYOUT_URL=new URL('../missions/m01-tczew/audio-layout.json',import.meta.url);
const realLayoutRaw=()=>JSON.parse(readFileSync(LAYOUT_URL,'utf8'));
const MISSION_URL=new URL('../missions/m01-tczew/mission.json',import.meta.url);
const realMissionRaw=()=>JSON.parse(readFileSync(MISSION_URL,'utf8'));
// T47 retired the dramatized casemate ckm from the mission data (tests/helpers/m01-retired-casemate.js). The crew gate is an engine rule of every dramatized emitter, so the
// tests of the gate run on the emitter as it was authored, put back into a copy of the real mission; the tests of the real data assert what is there now.
const missionWithCasemate=()=>missionWithRetiredCasemate(realMissionRaw());
const hms=(h,m,sec=0)=>h*3600+m*60+sec;
class DecodeFailContext extends FakeAudioContext{async decodeAudioData(){throw new Error('EncodingError');}}
class EmptyDecodeContext extends FakeAudioContext{async decodeAudioData(){return this.createBuffer(1,0,this.sampleRate);}}
const okFetch=async()=>({ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(16)});
const neverFetch=async()=>{throw new Error('network is forbidden in tests');};
const make=({Ctx=FakeAudioContext,ctxOptions={},quality='high',fetchImpl=neverFetch,sampleRate=null}={})=>{
  const ctx=new Ctx(ctxOptions);if(sampleRate)ctx.sampleRate=sampleRate;
  const audio=new AudioManager({contextFactory:()=>ctx,quality,fetchImpl});assert.equal(audio.init(),true);return {audio,ctx};
};
/** Does `from` reach `to` following connect() edges, never passing through `avoid`? */
const reaches=(from,to,avoid=null)=>{
  const seen=new Set([from]),queue=[from];
  while(queue.length){const n=queue.shift();if(n===to)return true;for(const m of n.connections)if(m!==avoid&&!seen.has(m)){seen.add(m);queue.push(m);}}
  return false;
};
const paramEvents=ctx=>{let n=0;for(const node of ctx.nodes)for(const v of Object.values(node))if(v&&Array.isArray(v.events))n+=v.events.length;return n;};
const convolvers=ctx=>ctx.nodes.filter(n=>n.type==='convolver');
const manifest=ids=>({schemaVersion:1,files:ids.map((id,i)=>({id,file:`sfx/${id}.ogg`,tier:i%2,durationSec:.3}))});

test('graph topology: SFX / VOICE / MUSIC buses feed the master limiter, then destination',()=>{
  const {audio,ctx}=make(),mix=audio.mix;
  assert.equal(mix.limiter.type,'compressor','the limiter is a DynamicsCompressor');
  for(const bus of [mix.sfx,mix.voice,mix.music])assert.ok(reaches(bus,mix.limiter),'bus reaches the limiter');
  for(const bus of Object.values(audio.buses))assert.ok(reaches(bus,mix.sfx),'group buses feed the SFX bus');
  // The limiter is not bypassable: with it removed from the graph nothing reaches the destination.
  for(const bus of [mix.sfx,mix.voice,mix.music,...Object.values(audio.buses),mix.reverbIn])assert.equal(reaches(bus,ctx.destination,mix.limiter),false,'no path around the limiter');
  assert.ok(mix.limiter.connections.includes(mix.master)&&mix.master.connections.includes(ctx.destination),'limiter -> master -> destination');
  assert.equal(audio.compressor,mix.limiter);assert.equal(audio.diagnostics.compressor,true);
  audio.dispose();
});

test('graph degrades without DynamicsCompressor and ConvolverNode, and never throws',()=>{
  const {audio,ctx}=make({ctxOptions:{convolver:false,compressor:false}}),mix=audio.mix;
  assert.equal(mix.limiter,null);assert.equal(convolvers(ctx).length,0);assert.equal(audio.diagnostics.reverb,false);
  for(const bus of [mix.sfx,mix.voice,mix.music])assert.ok(reaches(bus,ctx.destination));
  assert.doesNotThrow(()=>{audio.setListener(0,0,0);audio.playVoice('x');audio.playMusic('stem0','m');audio.explosion(0,10);});
  audio.dispose();assert.equal(audio.diagnostics.nodesCreated,audio.diagnostics.nodesDisposed);
});

test('caps: 32 SFX voices (20 on low), VOICE 3, music outside the pool',()=>{
  assert.deepEqual({...SFX_VOICE_CAP},{low:20,medium:32,high:32});assert.equal(VOICE_BUS_CAP,3);
  assert.equal(sfxVoiceCap('low'),20);assert.equal(sfxVoiceCap('high'),32);assert.deepEqual([...MUSIC_SLOTS],['stem0','stem1','stem2','stem3','stinger']);
  const hi=make({quality:'high'}).audio;assert.equal(hi.maxVoices,32);assert.equal(hi.diagnostics.core.sfxCap,32);
  const lo=make({quality:'low'}).audio;assert.equal(lo.maxVoices,20);assert.equal(lo.diagnostics.core.sfxCap,20);
  hi.setQuality('low');assert.equal(hi.maxVoices,20,'quality switch lowers the cap');hi.setQuality('medium');assert.equal(hi.maxVoices,32);
  assert.equal(new AudioManager({maxVoices:8,quality:'high'}).maxVoices,8,'an explicit smaller max is kept');
});

test('SFX priority stealing at the cap: lowest priority (oldest first) goes, never an equal or higher one',()=>{
  for(const [quality,cap] of [['high',32],['low',20]]){
    const {audio}=make({quality});
    // Fill the pool with category fx; probe with category `impact` (limit 6, empty) so only the SFX pool rule decides.
    const impact=priority=>audio._voice({kind:'t',category:'impact',priority,volume:.1});
    for(let i=0;i<cap;i++)assert.ok(audio.channel(.1,0,0,50+i),`voice ${i} admitted`);
    assert.equal(audio.voices.size,cap);
    assert.equal(impact(49)===null,true,'lower priority than everything playing is refused');
    assert.equal(impact(50)===null,true,'equal priority does not steal');
    assert.equal(audio.dropped,2);assert.equal(audio.voices.size,cap);
    const lowest=[...audio.voices].find(v=>v.priority===50);
    assert.ok(impact(200),'higher priority steals');
    assert.equal(audio.voices.size,cap);assert.equal(audio.evicted,1);assert.equal(audio.voices.has(lowest),false,'the lowest-priority voice was the victim');
    assert.equal(audio.diagnostics.core.sfxStolen,1);assert.equal(audio.diagnostics.core.sfxRefused,2);audio.dispose();
  }
});

test('legacy per-category limits are unchanged: inside a full category an equal priority still replaces the oldest of that category',()=>{
  // Pre-T06a rule (AudioManager._admit: `victim.priority > priority` refuses; equal replaces). `channel()` is category fx whose limit (32)
  // equals the high-quality pool cap, so at high the category rule fires first. Kept as is: presentation-only, bench callers rely on it.
  const {audio}=make({quality:'high'});
  for(let i=0;i<32;i++)assert.ok(audio.channel(.1,0,0,50+i));
  const oldest=[...audio.voices].find(v=>v.priority===50);
  assert.equal(audio.channel(.1,0,0,49)===null,true,'strictly lower priority than the category minimum is refused');
  assert.ok(audio.channel(.1,0,0,50),'equal priority replaces within a full category (legacy rule)');
  assert.equal(audio.voices.has(oldest),false);assert.equal(audio.voices.size,32);
  const low=make({quality:'low'}).audio;   // fx limit 32 > pool cap 20: the pool rule decides, equal is refused
  for(let i=0;i<20;i++)low.channel(.1,0,0,50+i);
  assert.equal(low.channel(.1,0,0,50)===null,true,'at low the SFX pool rule applies: equal priority does not steal');
  audio.dispose();low.dispose();
});

test('shrinking to low evicts down to the new cap on the next higher-priority admission',()=>{
  const {audio}=make({quality:'high'});
  for(let i=0;i<32;i++)audio.channel(.1,0,0,50+i);
  audio.setQuality('low');
  assert.ok(audio.channel(.1,0,0,300));
  assert.equal(audio.voices.size,20);assert.equal(audio.evicted,13);audio.dispose();
});

test('loops count toward the cap but are never stolen',()=>{
  const pool=new VoicePool({sfx:2});
  const loop={priority:1,serial:0,loop:true},one={priority:5,serial:1,loop:false};
  pool.add('sfx',loop);pool.add('sfx',one);
  const stolen=[];assert.equal(pool.admit('sfx',9,v=>{stolen.push(v);pool.sets.sfx.delete(v);}),true);
  assert.deepEqual(stolen,[one]);assert.ok(pool.sets.sfx.has(loop));
  pool.add('sfx',{priority:6,serial:2});assert.equal(pool.admit('sfx',7,v=>pool.sets.sfx.delete(v)),true);
  const full=new VoicePool({sfx:1});full.add('sfx',{priority:1,serial:0,loop:true});
  assert.equal(full.admit('sfx',99,()=>assert.fail('a loop must not be released')),false);
});

test('VOICE bus: hard cap 3, priority stealing, independent of the SFX pool',()=>{
  const {audio,ctx}=make();audio.loadManifest(manifest(['l1','l2','l3','l4','l5']));
  for(let i=0;i<32;i++)audio.channel(.1,0,0,50+i);
  assert.equal(audio.playVoice('l1',{priority:VOICE_PRIORITY.callout}),true,'a full SFX pool does not block dialogue');
  assert.equal(audio.playVoice('l2',{priority:VOICE_PRIORITY.callout}),true);assert.equal(audio.playVoice('l3',{priority:VOICE_PRIORITY.walla}),true);
  assert.equal(audio.core.pool.count('voice'),3);
  assert.equal(audio.playVoice('l4',{priority:VOICE_PRIORITY.walla}),false,'equal priority does not steal');
  assert.equal(audio.playVoice('l4',{priority:5}),false,'lower priority refused');
  const [s1,s2,s3]=ctx.sources;
  assert.equal(audio.playVoice('l5',{priority:VOICE_PRIORITY.story}),true,'story line steals');
  assert.equal(audio.core.pool.count('voice'),3);assert.equal(s3.stopAt!==undefined,true,'victim is the lowest priority line (walla)');
  assert.equal(s1.stopAt,undefined);assert.equal(s2.stopAt,undefined);
  assert.equal(audio.voices.size,32,'dialogue is not in the SFX pool');
  assert.equal(audio.diagnostics.core.voiceStolen,1);assert.equal(audio.diagnostics.core.voiceRefused,2);
  ctx.flush();assert.equal(s3.disconnected,true,'stolen line is disconnected after it ends');
  audio.dispose();
});

test('MUSIC runs outside the SFX pool: 4 stems + 1 stinger, unknown slots refused, slots replaced in place',()=>{
  const {audio,ctx}=make();
  for(let i=0;i<32;i++)audio.channel(.1,0,0,50+i);
  for(const slot of MUSIC_SLOTS)assert.equal(audio.playMusic(slot,`m_${slot}`),true,slot);
  assert.equal(audio.playMusic('stem9','m'),false);assert.equal(audio.voices.size,32);
  assert.deepEqual(audio.diagnostics.core.musicSlots,['stem0','stem1','stem2','stem3','stinger']);
  const before=ctx.sources.length;audio.playMusic('stem0','m_again');assert.equal(ctx.sources.length,before+1);assert.equal(audio.diagnostics.core.musicSlots.length,5);
  assert.equal(audio.stopMusic('stem1',.1),true);assert.equal(audio.stopMusic('stem1'),false);
  audio.dispose();
});

test('loader: a missing file, an HTTP error or a network failure falls back to synthesis without throwing',async()=>{
  const cases={
    http404:async()=>({ok:false,status:404,arrayBuffer:async()=>new ArrayBuffer(0)}),
    networkDown:async()=>{throw new TypeError('fetch failed');},
    brokenBody:async()=>({ok:true,arrayBuffer:async()=>{throw new Error('aborted');}}),
    noResponse:async()=>undefined,
  };
  for(const [name,fetchImpl] of Object.entries(cases)){
    const {audio}=make({fetchImpl});assert.equal(audio.loadManifest(manifest(['shot_near'])),true);
    assert.equal(await audio.loadAsset('shot_near'),'synth:missing',name);
    assert.equal(audio.core.loader.isReal('shot_near'),false);
    const buf=audio.core.loader.get('shot_near');assert.ok(buf&&buf.length>0,`${name}: synth buffer is audible length`);
    assert.deepEqual(audio.core.loader.missing,['shot_near']);assert.equal(audio.playVoice('shot_near'),true,'a missing asset still plays (synthesised)');
    audio.dispose();
  }
});

test('loader: decode failure (rejecting or empty buffer) falls back to synthesis; a good decode is used',async()=>{
  for(const Ctx of [DecodeFailContext,EmptyDecodeContext]){
    const {audio}=make({Ctx,fetchImpl:okFetch});audio.loadManifest(manifest(['a']));
    assert.equal(await audio.loadAsset('a'),'synth:decode',Ctx.name);assert.equal(audio.core.loader.isReal('a'),false);
    assert.ok(audio.core.loader.get('a').length>0);assert.equal(audio.diagnostics.core.loader.synthDecode,1);audio.dispose();
  }
  const {audio}=make({fetchImpl:okFetch});audio.loadManifest(manifest(['good']));
  assert.equal(await audio.loadAsset('good'),'decoded');assert.equal(audio.core.loader.isReal('good'),true);assert.equal(audio.buffers.has('good'),true,'decoded buffers are shared with play()');
  const same=audio.core.loader.get('good');assert.equal(same,audio.buffers.get('good'));audio.dispose();
});

test('loader: malformed manifests and unknown ids never throw; synthesis is deterministic',async()=>{
  const {audio,ctx}=make();
  for(const bad of [null,undefined,42,'{{{',[],{files:'x'},{files:[null,7,{id:''},{id:'ok',file:'../escape.ogg'},{id:'abs',file:'/etc/passwd'},{id:'url',file:'http://x/y.ogg'}]}])
    assert.doesNotThrow(()=>audio.loadManifest(bad));
  const parsed=parseManifest({files:[{id:'dup',file:'a.ogg'},{id:'dup',file:'b.ogg'},{id:'bad',file:'../x'}]});
  assert.equal(parsed.entries.size,2);assert.equal(parsed.entries.get('dup').file,'a.ogg','first duplicate wins');assert.equal(parsed.entries.get('bad').file,null,'path traversal is refused, synth only');
  assert.equal(await audio.loadAsset('nope'),'synth:unlisted');
  const a=audio.core.loader.get('nope'),loader2=new BufferLoader({fetchImpl:neverFetch});loader2.attach(ctx);
  assert.deepEqual([...a.getChannelData(0).slice(0,50)],[...loader2.get('nope').getChannelData(0).slice(0,50)],'same id -> same samples');
  assert.notDeepEqual([...a.getChannelData(0).slice(0,50)],[...loader2.get('other').getChannelData(0).slice(0,50)]);
  assert.equal(audio.core.loader.bandedId('rifle',10),'rifle');
  audio.loadManifest({files:[{id:'rifle',file:'r.ogg'},{id:'rifle.distant',file:'rd.ogg'}]});
  assert.equal(audio.core.loader.bandedId('rifle',10),'rifle','close band not listed -> base');assert.equal(audio.core.loader.bandedId('rifle',400),'rifle.distant','distance picks the banded variant');
  audio.dispose();
});

test('loader: a decode finishing after dispose is dropped',async()=>{
  let release;const gate=new Promise(r=>{release=r;});
  const {audio}=make({fetchImpl:async()=>{await gate;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
  audio.loadManifest(manifest(['late']));const pending=audio.loadAsset('late');audio.dispose();release();
  assert.notEqual(await pending,'decoded');assert.equal(audio.buffers.size,0);
});

test('concussion ducks the SFX path only: MUSIC is untouched and VOICE is only touched above 0.6',()=>{
  const {audio,ctx}=make(),mix=audio.mix;
  assert.ok(reaches(mix.sfx,mix.concussion));assert.equal(reaches(mix.music,mix.concussion),false,'MUSIC does not pass through the concussion filter');
  assert.equal(reaches(mix.voice,mix.concussion),false,'VOICE bypasses the concussion filter');
  const musicNodes=[mix.music,mix.musicGate,mix.musicDuck],before=musicNodes.map(n=>n.gain.events.length);
  audio.explosion(0,55,{scale:'large',key:'mild'});
  assert.ok(audio.lastDuck.concussion>0&&audio.lastDuck.concussion<=.6,'mild blast');
  assert.ok(mix.concussion.frequency.events.some(e=>e[0]==='target'),'SFX concussion lowpass moved');
  assert.equal(mix.voiceFilter.frequency.events.length,0,'VOICE untouched at or below 0.6');
  audio.explosion(0,5,{scale:'large',key:'near'});
  assert.ok(audio.lastDuck.concussion>.6);
  assert.ok(mix.voiceFilter.frequency.events.some(e=>e[0]==='target'&&e[1]===2500),'VOICE gets the 2.5 kHz lowpass above 0.6');
  assert.deepEqual(musicNodes.map(n=>n.gain.events.length),before,'no automation on MUSIC after two blasts');
  for(const n of musicNodes)assert.equal(n.gain.value,1);
  assert.equal(mix.music.gain.events.length,0);
  assert.ok(ctx.nodes.length>0);audio.dispose();
});

test('at most 2 ConvolverNodes with procedural impulses within the design lengths',()=>{
  for(const quality of ['low','medium','high']){
    const {audio,ctx}=make({quality,sampleRate:48000});
    assert.equal(convolvers(ctx).length,MAX_CONVOLVERS);
    audio.setLayout(realLayoutRaw());
    for(let i=0;i<200;i++)audio.setListener(i%2?-400:500,0,30);   // bridge <-> station, many switches
    for(let i=0;i<40;i++)audio.weaponFire('kar98k',0,300,{key:'k'+i});audio.explosion(0,30);
    assert.ok(convolvers(ctx).length<=2,'never more than two, after zone switches and many voices');
    const [a,b]=audio.mix.convolvers;
    assert.ok(a.buffer.length<=Math.floor(48000*IR_MAX_SECONDS.A)&&b.buffer.length<=Math.floor(48000*IR_MAX_SECONDS.B),`${quality}: IR lengths A=${(a.buffer.length/48000).toFixed(2)}s B=${(b.buffer.length/48000).toFixed(2)}s`);
    assert.ok(b.buffer.length<a.buffer.length);audio.dispose();
  }
  assert.ok(impulseSeconds('A','high')<=IR_MAX_SECONDS.A&&impulseSeconds('B','high')<=IR_MAX_SECONDS.B);
  assert.ok(impulseSeconds('A','low')<impulseSeconds('A','high')&&impulseSeconds('B','low')<impulseSeconds('B','high'),'quality picks shorter responses');
});

test('impulse responses are generated from a seed: deterministic, finite, decaying, and need no files',()=>{
  const ctx=new FakeAudioContext();ctx.sampleRate=8000;
  const a1=generateImpulse(ctx,'A','high'),a2=generateImpulse(ctx,'A','high'),b=generateImpulse(ctx,'B','high');
  assert.deepEqual([...a1.getChannelData(0)],[...a2.getChannelData(0)],'same seed, same samples');
  assert.notDeepEqual([...a1.getChannelData(0).slice(0,500)],[...a1.getChannelData(1).slice(0,500)],'channels decorrelated');
  for(const buf of [a1,b])for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);assert.ok(d.every(Number.isFinite));
    const rms=(from,to)=>Math.sqrt(d.slice(from,to).reduce((s,v)=>s+v*v,0)/(to-from));
    assert.ok(rms(0,d.length>>2)>rms(d.length>>1,d.length)*2,'energy decays');}
  assert.equal(generateImpulse(ctx,'zzz','nonsense').numberOfChannels,2,'unknown kind/quality falls back to a valid IR');
});

test('allocation is bounded: IR length <= rate * max seconds for any rate or quality, and the fake refuses runaway buffers',()=>{
  for(const rate of [2000,8000,44100,48000,96000])for(const kind of ['A','B','zzz'])for(const quality of ['low','medium','high','nonsense',undefined]){
    const ctx=new FakeAudioContext();ctx.sampleRate=rate;const buf=generateImpulse(ctx,kind,quality);
    const max=Math.floor(rate*(kind==='B'?IR_MAX_SECONDS.B:IR_MAX_SECONDS.A));
    assert.ok(buf.length>=1&&buf.length<=max,`rate ${rate} kind ${kind} quality ${quality}: ${buf.length} samples vs bound ${max}`);
    assert.ok(buf.length*buf.numberOfChannels<=MAX_FAKE_SAMPLES);
  }
  assert.ok(impulseSeconds('A','high')<=IR_MAX_SECONDS.A&&impulseSeconds('B','high')<=IR_MAX_SECONDS.B);
  assert.throws(()=>new FakeAudioContext().createBuffer(2,1e9,48000),RangeError,'the fake allocation guard trips before RAM does');
  // The whole graph (mix + reverb + 32 voices) stays far below the guard: nothing in init or play scales with anything unbounded.
  const {audio,ctx}=make({sampleRate:48000});for(let i=0;i<40;i++)audio.weaponFire('kar98k',0,300,{key:'k'+i});audio.explosion(0,30);
  let samples=0;for(const buffer of audio.mix.convolvers.map(c=>c.buffer))samples+=buffer.length*buffer.numberOfChannels;
  assert.ok(samples<=2*Math.floor(48000*(IR_MAX_SECONDS.A+IR_MAX_SECONDS.B)),'both IRs together stay within their design bound');
  assert.ok(ctx.nodes.length<2000,`node count stays bounded (${ctx.nodes.length})`);audio.dispose();
});

test('regression: a failing assertion on a graph node produces a small message (it once grew past 2 GB)',()=>{
  // node:assert inspects the actual value with depth 1000; enumerable ctx/connections back-edges made that combinatorial.
  const {audio}=make();for(let i=0;i<20;i++)audio.weaponFire('kar98k',0,300,{key:'m'+i});
  const node=audio.mix.sfx,failures=[];
  for(const attempt of [()=>assert.equal(node,null),()=>assert.deepEqual(node,{}),()=>assert.equal(audio.mix.limiter,null)]){
    try{attempt();failures.push(null);}catch(error){failures.push(error.message.length);}
  }
  assert.ok(failures.every(n=>n!==null&&n<4000),`assertion messages stay small: ${failures.join(', ')}`);
  assert.equal(Object.keys(node).includes('connections'),false);assert.ok(Array.isArray(node.connections),'connections stay readable for the topology walkers');
  audio.dispose();
});

test('zone changes crossfade reverb A/B and apply the interior lowpass only inside the station',()=>{
  const {audio}=make(),mix=audio.mix;audio.setLayout(realLayoutRaw());
  assert.equal(audio.zone.id,'open');
  assert.equal(audio.setListener(-400,0,30).id,'station');assert.equal(mix.sends.B.gain.value,1);assert.equal(mix.sends.A.gain.value,0);assert.equal(mix.zoneFilter.frequency.value,1800);
  assert.equal(audio.setListener(500,0,20).id,'bridge');assert.equal(mix.sends.B.gain.value,1);assert.equal(mix.zoneFilter.frequency.value,20000,'bridge is semi-open: no interior lowpass');
  assert.equal(audio.setListener(-1000,0,500).id,'open');assert.equal(mix.sends.A.gain.value,1);assert.equal(mix.sends.B.gain.value,0);
  assert.ok(mix.sends.A.gain.events.every(e=>e[0]==='target'||e[0]==='cancel'),'ramped, never a hard step');audio.dispose();
});

test('layout loader: the real audio-layout.json compiles; open is the default zone, surfaces are resolved',()=>{
  const layout=parseAudioLayout(realLayoutRaw());
  assert.equal(layout.ok,true,layout.issues.join('; '));assert.equal(layout.defaultZone.id,'open');assert.deepEqual(layout.zones.map(z=>z.id),['bridge','station']);
  assert.equal(layout.surfaces.length,5);
  assert.equal(zoneAt(layout,500,0,20).id,'bridge');assert.equal(zoneAt(layout,-400,0,30).id,'station');assert.equal(zoneAt(layout,-100,0,200).id,'open');
  assert.equal(layout.zones[1].interiorLowpassHz,1800,'1800 Hz is provisional data, retuned at H12 (PH-A7)');
  assert.equal(surfaceAt(layout,-400,0,30).id,'tczew_station');assert.equal(surfaceAt(layout,-400,0,30).material,'brick');
  assert.equal(surfaceAt(layout,100,-8,0).id,'vistula_channel');assert.equal(surfaceAt(layout,100,-8,0).material,'water');
  assert.equal(surfaceAt(layout,-1000,0,500).material,'earth');assert.equal(surfaceAt(layout,-260,1,20).id,'rail_hut');
});

test('layout tie-break: equal priority -> FIRST DECLARED wins (bridge_deck over casemates_west); priority still beats order',()=>{
  const raw=realLayoutRaw(),layout=parseAudioLayout(raw);
  const bridge=raw.surfaces.find(s=>s.id==='bridge_deck'),cas=raw.surfaces.find(s=>s.id==='casemates_west');
  assert.equal(bridge.priority,cas.priority,'the documented tie really is a tie');
  // (10, -1.5, 40) is inside both boxes: y -2..-1, x 0..26, z 34..46.
  assert.equal(surfaceAt(layout,10,-1.5,40).id,'bridge_deck');assert.equal(surfaceAt(layout,10,-1.5,40).material,'metal');
  assert.equal(surfaceAt(layout,10,-5,40).id,'casemates_west','below the deck only the casemate contains the point');
  const swapped=structuredClone(raw);swapped.surfaces=[cas,bridge,...raw.surfaces.filter(s=>s!==cas&&s!==bridge)];
  assert.equal(surfaceAt(parseAudioLayout(swapped),10,-1.5,40).id,'casemates_west','declaration order decides ties');
  const raised=structuredClone(raw);raised.surfaces.find(s=>s.id==='casemates_west').priority=4;
  assert.equal(surfaceAt(parseAudioLayout(raised),10,-1.5,40).id,'casemates_west','higher priority beats declaration order');
  const zoneTie=parseAudioLayout({schemaVersion:1,zones:[{id:'open',default:true,priority:0},
    {id:'first',priority:1,reverb:'B',box:{minX:0,maxX:10,minZ:0,maxZ:10}},{id:'second',priority:1,reverb:'A',box:{minX:0,maxX:10,minZ:0,maxZ:10}}],surfaces:[]});
  assert.equal(zoneAt(zoneTie,5,0,5).id,'first');
});

test('layout loader: malformed data falls back to open/earth and never throws',async()=>{
  const bads=[null,undefined,0,'',' not json ','[]',[],{},{schemaVersion:2,zones:[],surfaces:[]},{schemaVersion:1},{schemaVersion:1,zones:'x',surfaces:7}];
  for(const bad of bads){
    let layout;assert.doesNotThrow(()=>{layout=parseAudioLayout(bad);},String(bad));
    assert.equal(layout.defaultZone.id,'open');assert.equal(layout.defaultZone.reverb,'A');assert.equal(layout.defaultSurface.material,'earth');
    assert.equal(zoneAt(layout,1,2,3).id,'open');assert.equal(surfaceAt(layout,1,2,3).material,'earth');assert.equal(layout.ok,false);
  }
  const partial=parseAudioLayout({schemaVersion:1,defaultSurface:'lava',zones:[null,{id:'x'},{id:'nobox',priority:1},{id:'nan',priority:1,box:{minX:NaN}},{id:'inv',priority:1,box:{minX:5,maxX:1}},
    {id:'ok',priority:2,reverb:'Q',box:{minX:0,maxX:1,minZ:0,maxZ:1},occlusion:{interiorLowpassHz:'x',outsideLowpassHz:[1]}}],
    surfaces:[{id:'s1',priority:1,material:'lava',box:{minX:0,maxX:1,minZ:0,maxZ:1}},{id:'s2',priority:'high',box:{}},{id:'s3',priority:1,box:{minX:'a'}},'x']});
  assert.deepEqual(partial.zones.map(z=>z.id),['ok']);assert.equal(partial.zones[0].reverb,'A','unknown reverb id -> A');assert.equal(partial.zones[0].interiorLowpassHz,null);
  assert.deepEqual(partial.surfaces.map(s=>[s.id,s.material]),[['s1','earth']],'unknown material -> earth, bad entries dropped');
  assert.equal(partial.defaultSurface.material,'earth');assert.equal(partial.ok,false);assert.ok(partial.issues.length>=5);
  // Non-finite query inputs still resolve (never NaN-poison the zone).
  assert.equal(zoneAt(partial,NaN,0,0).id,'open');
  assert.equal(await loadAudioLayout('x',{fetchImpl:neverFetch}),FALLBACK_LAYOUT);
  assert.equal(await loadAudioLayout('x',{fetchImpl:async()=>({ok:false})}),FALLBACK_LAYOUT);
  assert.equal(await loadAudioLayout('x',{fetchImpl:async()=>({ok:true,json:async()=>{throw new SyntaxError('bad json');}})}),FALLBACK_LAYOUT);
  const good=await loadAudioLayout('x',{fetchImpl:async()=>({ok:true,json:async()=>realLayoutRaw()})});assert.equal(good.ok,true);
  const {audio}=make();assert.equal(audio.core.layout,FALLBACK_LAYOUT);
  assert.equal((await audio.loadLayout('x',async()=>({ok:false}))).defaultZone.id,'open');
  assert.equal((await audio.loadLayout('x',async()=>({ok:true,json:async()=>realLayoutRaw()}))).ok,true);assert.equal(audio.setListener(500,0,20).id,'bridge');
  assert.equal(audio.setLayout('}{').ok,false);assert.equal(audio.zone.id,'open');audio.dispose();
});

test('layout and update path are allocation-free in steady state: same objects, no nodes, no automation churn',()=>{
  const {audio,ctx}=make();audio.setLayout(realLayoutRaw());
  const zone=audio.setListener(500,0,20),surface=audio.surface,nodes=ctx.nodes.length,events=paramEvents(ctx);
  assert.ok(Object.isFrozen(zone)&&Object.isFrozen(surface)&&Object.isFrozen(audio.core.layout));
  for(let i=0;i<20000;i++){
    const z=audio.setListener(10+(i%400)*.5,-1.5+(i%3)*.1,5+(i%40));   // stays on the bridge
    if(z!==zone||audio.surface.id==='')assert.fail('result object changed');
  }
  assert.equal(audio.zone,zone);assert.equal(ctx.nodes.length,nodes,'no node created per update');assert.equal(paramEvents(ctx),events,'no automation per update inside one zone');
  audio.setListener(-400,0,30);const afterSwitch=paramEvents(ctx);assert.ok(afterSwitch>events&&afterSwitch-events<=12,'a zone change schedules a bounded handful of events');
  for(let i=0;i<1000;i++)audio.setListener(-400+(i%5),0,30);assert.equal(paramEvents(ctx),afterSwitch);
  for(const bad of [NaN,Infinity,undefined])assert.equal(audio.setListener(bad,0,0),audio.zone,'non-finite input is ignored');
  // The pool's membership test is the same Set the AudioManager exposes (no copy per frame).
  assert.equal(audio.voices,audio.core.pool.sets.sfx);audio.dispose();
});

test('dispose releases every node (graph, voices, dialogue, music) and the created/disposed audit balances',()=>{
  const {audio,ctx}=make();audio.setLayout(realLayoutRaw());audio.loadManifest(manifest(['v1','v2']));
  audio.weaponFire('mg34',0,40,{rounds:5,key:'d'});audio.explosion(0,20);audio.playVoice('v1');audio.playVoice('v2');audio.playMusic('stem0','m');audio.playMusic('stinger','s',{loop:false,fadeIn:1});
  audio.setListener(-400,0,30);audio.updateM01Presentation({clock:1,state:{},phase:'MAIN_COMBAT'});
  ctx.flush();audio.dispose();
  const alive=ctx.nodes.filter(n=>n!==ctx.destination&&!n.disconnected);
  assert.deepEqual(alive.map(n=>n.type),[],'every node was disconnected');
  assert.equal(audio.diagnostics.nodesCreated,audio.diagnostics.nodesDisposed);
  assert.equal(audio.mix,null);assert.equal(audio.master,null);assert.equal(audio.playVoice('v1'),false,'inert after dispose');assert.equal(audio.playMusic('stem0','m'),false);
  assert.doesNotThrow(()=>{audio.setListener(0,0,0);audio.dispose();});
});

test('without an AudioContext every new entry point is an inert no-op',()=>{
  const audio=new AudioManager();   // never init()ed
  assert.equal(audio.playVoice('x'),false);assert.equal(audio.playMusic('stem0','x'),false);assert.equal(audio.setBusVolume('music',.5),false);
  assert.doesNotThrow(()=>{audio.setListener(1,2,3);audio.loadManifest({files:[]});audio.setLayout(null);});
  const core=new AudioCore();assert.equal(core.playVoice('x'),false);assert.equal(core.dispose(),0);
});

test('bus volumes (master/sfx/voice/music) are independent gains; the existing master volume still works',()=>{
  const {audio}=make(),mix=audio.mix;
  assert.equal(audio.setBusVolume('music',.25),true);assert.equal(mix.music.gain.value,.25);assert.equal(mix.sfx.gain.value,1);assert.equal(audio.setBusVolume('nope',1),false);
  audio.setVolume(.4);assert.equal(mix.master.gain.value,.4);audio.dispose();
});

test('audio core never writes simulation state: sources read nothing but plain arguments',()=>{
  const state=Object.freeze({clock:1,renderState:Object.freeze({stukas:false})});
  const {audio}=make();assert.doesNotThrow(()=>{audio.setListener(1,0,1);audio.updateM01Presentation({clock:2,state:{},spatial:()=>({pan:0,distance:900})});audio.explosion(0,30);});
  assert.equal(state.clock,1);assert.ok(AUDIO_PRIORITY.explosion>AUDIO_PRIORITY.rifle);audio.dispose();
});

test('emitters: the real mission data compiles; windows and sectors are read, and T47 left no dramatized casemate ckm in it',()=>{
  const parsed=parseAudioEmitters(realMissionRaw());
  assert.equal(parsed.ok,true,parsed.issues.join('; '));
  assert.deepEqual(parsed.emitters.map(e=>e.id),['ae_s2_mg_dike','ae_s2_mg_train','ae_s2_ckm_east']);
  assert.ok(parsed.emitters.every(e=>!e.crewGated&&!e.displayOnly),'T47: the real gun of post S2 is the only ckm of the west bridgehead; no display-only twin is left in the data');
  assert.equal(realMissionRaw().sectors.find(s=>s.id==='s1_west_bridgehead').audioEmitters.length,0);
  const [dike,train,ckmEast]=parsed.emitters;
  assert.equal(dike.crewGated,false);assert.equal(dike.until,Infinity,'no activeUntil -> until the end of the mission');
  assert.equal(train.from,hms(4,52));assert.equal(ckmEast.until,hms(6,0));
  assert.ok(Object.isFrozen(parsed)&&Object.isFrozen(parsed.emitters)&&Object.isFrozen(dike));
  // The same list from the sectors array or a flat array.
  assert.equal(parseAudioEmitters(realMissionRaw().sectors).emitters.length,3);
  assert.equal(parseAudioEmitters(JSON.stringify(realMissionRaw())).emitters.length,3);
  assert.equal(parseAudioEmitters(parsed.emitters.map(e=>({id:e.id,weapon:e.weapon,position:[e.x,e.y,e.z]}))).emitters.length,3);
  assert.equal(parseClock('04:46:00'),hms(4,46));assert.equal(parseClock('4:46'),null);assert.equal(parseClock('25:61:61'),null);assert.equal(parseClock(5),null);
  // The reader still compiles a display-only, GAMEPLAY_DRAMATIZATION emitter (the casemate ckm as it was authored, in a copy of the mission) as a crew-gated one, in its sector.
  const withCasemate=parseAudioEmitters(missionWithCasemate());
  assert.equal(withCasemate.ok,true,withCasemate.issues.join('; '));
  assert.deepEqual(withCasemate.emitters.map(e=>e.id),['ae_s1_ckm_casemate','ae_s2_mg_dike','ae_s2_mg_train','ae_s2_ckm_east']);
  const casemate=withCasemate.emitters[0];
  assert.equal(casemate.crewGated,true);assert.equal(casemate.displayOnly,true);assert.equal(casemate.sector,'s1_west_bridgehead');
  assert.deepEqual([casemate.x,casemate.y,casemate.z],[25,-3,43]);assert.equal(casemate.from,hms(4,46));assert.equal(casemate.until,hms(6,45));
  assert.ok(Object.isFrozen(casemate));
  assert.equal(parseAudioEmitters(missionWithCasemate().sectors).emitters.length,4);
  assert.equal(parseAudioEmitters(JSON.stringify(missionWithCasemate())).emitters.length,4);
});

test('emitters: a dramatized (display-only) ckm is gated on crew presence / s1 state (the 06:45 window is only the outer bound)',()=>{
  const {emitters}=parseAudioEmitters(missionWithCasemate()),[casemate,dike,,ckmEast]=emitters;
  assert.deepEqual([...CREW_GONE_STATES],['evacuating_bridgehead','west_blown']);
  const states=['repair_under_fire','holding','withdrawal_cover','east_blown'];
  for(const state of states)assert.equal(isEmitterAudible(casemate,hms(5,0),state),true,`crew still fires in ${state}`);
  assert.equal(isEmitterAudible(casemate,hms(6,12),'evacuating_bridgehead'),false,'s1 evacuates from 06:12: silent although the window runs to 06:45');
  assert.equal(isEmitterAudible(casemate,hms(6,30),'evacuating_bridgehead'),false);assert.equal(isEmitterAudible(casemate,hms(6,44,59),'west_blown'),false);
  assert.equal(isEmitterAudible(casemate,hms(6,30),undefined,true),true,'an explicit crewPresent=true wins over the state');
  assert.equal(isEmitterAudible(casemate,hms(5,0),'holding',false),false,'crewPresent=false silences it');
  assert.equal(isEmitterAudible(casemate,hms(5,0)),false,'no information at all: dramatized fire stays silent');
  assert.equal(isEmitterAudible(casemate,hms(4,45,59),'repair_under_fire'),false,'before activeFrom');assert.equal(isEmitterAudible(casemate,hms(4,46),'repair_under_fire'),true);
  assert.equal(isEmitterAudible(casemate,hms(6,45),'holding',true),false,'activeUntil is exclusive');
  // Other emitters follow their window only (no state needed).
  assert.equal(isEmitterAudible(dike,hms(4,45,59)),false);assert.equal(isEmitterAudible(dike,hms(4,46)),true);assert.equal(isEmitterAudible(dike,hms(23,0)),true);
  assert.equal(isEmitterAudible(ckmEast,hms(5,59,59)),true);assert.equal(isEmitterAudible(ckmEast,hms(6,0)),false);
  for(const clock of [NaN,Infinity,undefined,'05:00:00'])assert.equal(isEmitterAudible(dike,clock),false,String(clock));
  assert.equal(isEmitterAudible(null,hms(5,0)),false);
});

test('emitters: activeEmitters reuses the caller array (no per-frame allocation) and follows the s1 state',()=>{
  // The real data: no emitter depends on the s1 state or on a crew any more, and the east ckm ends at 06:00.
  const real=make();real.audio.setEmitters(realMissionRaw());
  const none=()=>undefined,out0=[];
  assert.deepEqual(real.audio.activeEmitters(hms(5,10),none,out0).map(e=>e.id),['ae_s2_mg_dike','ae_s2_mg_train','ae_s2_ckm_east']);
  assert.deepEqual(real.audio.activeEmitters(hms(5,10),id=>id==='s1_west_bridgehead'?'evacuating_bridgehead':undefined,out0,id=>id==='s1_west_bridgehead'?false:undefined).map(e=>e.id),
    ['ae_s2_mg_dike','ae_s2_mg_train','ae_s2_ckm_east'],'T47: no crew gate is left in the data, so the s1 state and the crew say nothing about the audible emitters');
  assert.deepEqual(real.audio.activeEmitters(hms(6,20),none,out0).map(e=>e.id),['ae_s2_mg_dike','ae_s2_mg_train']);
  assert.equal(real.audio.diagnostics.core.emitters,3);real.audio.dispose();
  // The same engine on the casemate ckm as it was authored (a copy of the mission with it put back).
  const {audio}=make();audio.setEmitters(missionWithCasemate());
  const stateOf=id=>id==='s1_west_bridgehead'?state.s1:undefined,state={s1:'holding'},out=[];
  assert.equal(audio.activeEmitters(hms(5,10),stateOf,out),out);
  assert.deepEqual(out.map(e=>e.id),['ae_s1_ckm_casemate','ae_s2_mg_dike','ae_s2_mg_train','ae_s2_ckm_east']);
  state.s1='evacuating_bridgehead';audio.activeEmitters(hms(6,20),stateOf,out);
  assert.deepEqual(out.map(e=>e.id),['ae_s2_mg_dike','ae_s2_mg_train'],'ckm_east ended at 06:00, the casemate crew evacuated');
  const first=out[0];for(let i=0;i<5000;i++)audio.activeEmitters(hms(6,20)+i*.01,stateOf,out);
  assert.equal(out.length,2);assert.equal(out[0],first,'same frozen emitter objects every frame');
  assert.equal(audio.activeEmitters(hms(5,0),stateOf,out,id=>id==='s1_west_bridgehead'?false:undefined)[0].id,'ae_s2_mg_dike','crewOf(false) silences the casemate');
  assert.equal(audio.diagnostics.core.emitters,4);audio.dispose();
  assert.deepEqual(audio.activeEmitters(hms(5,0),stateOf,[{}]),[],'inert after dispose');
});

test('emitters: malformed or missing data never throws and falls back to silence; bad entries drop alone',async()=>{
  const bads=[null,undefined,0,'',' not json ','{}','[]',[],{},{sectors:'x'},{sectors:[null,5,'x',{id:'s',audioEmitters:7}]},[null],[[]]];
  for(const bad of bads){
    let parsed;assert.doesNotThrow(()=>{parsed=parseAudioEmitters(bad);},String(bad));
    assert.equal(parsed.emitters.length,0,String(bad));assert.deepEqual(activeEmitters(parsed,hms(5,0),()=>'holding',[{}]),[]);
  }
  assert.equal(parseAudioEmitters({}).ok,false);assert.equal(parseAudioEmitters({sectors:[]}).ok,true,'a mission without emitters is fine');
  const good={id:'a',weapon:'mg34',position:[1,2,3],activeFrom:'05:00:00'};
  const partial=parseAudioEmitters({sectors:[{id:'s9',audioEmitters:[
    good,{...good},{...good,id:'b',position:[1,2]},{...good,id:'c',position:[1,NaN,3]},{...good,id:'d',weapon:''},{...good,id:'e',activeFrom:'soon'},
    {...good,id:'f',activeUntil:'04:00:00'},{...good,id:'g',activeUntil:5},{id:'h',weapon:'mg34',position:[0,0,0]},null,'x',{...good,id:'x'.repeat(65)},
  ]}]});
  assert.deepEqual(partial.emitters.map(e=>e.id),['a','h'],'only valid, unique entries survive');assert.equal(partial.ok,false);assert.ok(partial.issues.length>=9);
  assert.equal(partial.emitters[1].from,0,'a missing activeFrom means from the start');assert.equal(partial.emitters[0].sector,'s9');
  const many=parseAudioEmitters({sectors:[{id:'s',audioEmitters:Array.from({length:200},(_,i)=>({id:'e'+i,weapon:'mg34',position:[0,0,0]}))}]});
  assert.equal(many.emitters.length,64,'bounded list');
  assert.equal(await loadAudioEmitters('x',{fetchImpl:neverFetch}),NO_EMITTERS);assert.equal(await loadAudioEmitters('x',{fetchImpl:async()=>({ok:false})}),NO_EMITTERS);
  assert.equal(await loadAudioEmitters('x',{fetchImpl:async()=>({ok:true,json:async()=>{throw new SyntaxError('bad');}})}),NO_EMITTERS);
  assert.equal(await loadAudioEmitters('x',{fetchImpl:null}),NO_EMITTERS);
  const {audio}=make();
  assert.equal((await audio.loadEmitters('x',async()=>({ok:true,json:async()=>realMissionRaw()}))).emitters.length,3);
  assert.equal(audio.setEmitters('}{').emitters.length,0);assert.equal(audio.core.emitters.ok,false);
  const late=audio.loadEmitters('x',async()=>({ok:true,json:async()=>realMissionRaw()}));audio.setEmitters([]);   // a newer call wins
  await late;assert.equal(audio.core.emitters.emitters.length,0,'a stale load cannot overwrite a newer setEmitters');
  const pending=audio.loadEmitters('x',async()=>({ok:true,json:async()=>realMissionRaw()}));audio.dispose();await pending;
  assert.equal(audio.core.emitters.emitters.length,0,'a load finishing after dispose is dropped');
});

test('hardening: invalid caps and options fall back instead of meaning unbounded or throwing',()=>{
  for(const bad of [NaN,-1,Infinity,'x',undefined]){const pool=new VoicePool({sfx:bad,voice:bad});assert.deepEqual({...pool.caps},{sfx:32,voice:3},String(bad));}
  assert.deepEqual({...new VoicePool({sfx:4.9,voice:0}).caps},{sfx:4,voice:0});
  const {audio}=make();audio.loadManifest(manifest(['v']));
  assert.doesNotThrow(()=>{audio.playVoice('v',null);audio.playMusic('stem0','m',null);assert.equal(audio.setBusVolume('music',NaN),false);assert.equal(audio.setBusVolume('music',{}),false);audio.setLayout(()=>{});audio.setEmitters(Symbol.iterator);});
  assert.equal(audio.mix.music.gain.value>=0&&audio.mix.music.gain.value<=1,true);audio.dispose();
});

test('presentation only: the audio core modules import nothing from simulation, game, render or world code',()=>{
  const dir=new URL('../src/core/audio/',import.meta.url);
  let imports=0,external=[];
  for(const file of ['constants','core','emitters','index','ir','layout','loader','mix','pool']){
    const text=readFileSync(new URL(file+'.js',dir),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');   // code only, comments may mention Math.random
    for(const [, from] of text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]/g))
      {imports++;if(!from.startsWith('./'))external.push(from);assert.ok(from.startsWith('./')||from==='../battlefield-audio.js',`${file}.js imports ${from}`);}
    assert.doesNotMatch(text,/\b(sim|simulation|snapshot)\.\w+\s*=[^=]/,`${file}.js assigns into simulation-looking state`);
    assert.doesNotMatch(text,/Math\.random|\bsim\.rng\b/,`${file}.js is deterministic`);
  }
  assert.ok(imports>=12,`the import scan actually found the imports (${imports})`);assert.deepEqual(external,['../battlefield-audio.js'],'the only outside module is the pure acoustic table');
});

// ---------------------------------------------------------------- T06b hooks (music module, occlusion, director probe)
test('music (T06b): with no music files nothing starts, no synth drone is requested and nothing throws; a real buffer in the store plays',()=>{
  const {audio,ctx}=make(),core=audio.core,conductor=new MusicConductor(core),input=createMusicInput();
  assert.equal(core.loader.entries.size,0,'the game loads no manifest yet');
  const nodes=ctx.nodes.length;
  input.phase='MAIN_COMBAT';input.intensity=.95;input.consumed={'evt_m01_planes_heard':1};
  for(let t=0;t<30;t+=.05){input.clock=t;assert.doesNotThrow(()=>conductor.update(input));}
  assert.equal(core.musicStarted,0);assert.equal(core.music.size,0);assert.equal(ctx.nodes.length,nodes,'no source, no gain');
  assert.equal(core.loader.stats.synthUnlisted,0,'the loader was never asked for a procedural stand-in');
  assert.equal(conductor.diagnostics.stingerFired,1,'the decision was taken, silently');
  // a decoded buffer in the loader store (what a manifest + decode would leave there) is what makes a stem real
  audio.buffers.set(MUSIC_STEM_IDS[0],ctx.createBuffer(1,2000,ctx.sampleRate));
  input.clock=40;conductor.update(input);
  assert.deepEqual([...core.music.keys()],['stem0']);assert.equal(core.musicStarted,1);
  for(const id of MUSIC_STEM_IDS.slice(1))assert.equal(core.loader.isReal(id),false);
  conductor.dispose();assert.equal(core.music.size,0);audio.dispose();
});
test('music (T06b): the module is presentation-only (imports constants only) and the gate constants are exported from the package index',()=>{
  const text=readFileSync(new URL('../src/core/audio/music.js',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
  const imports=[...text.matchAll(/(?:^|\n)\s*import\b[^'"]*?from\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
  assert.deepEqual(imports,['./constants.js']);
  assert.doesNotMatch(text,/Math\.random|\bsim\.rng\b|Date\.now|performance\.now/);
  assert.equal(GATE_OFF,'off');assert.equal(MUSIC_STINGERS.length,4);
});
test('occlusion hook (T06b): voices created while it is set are lowpassed and attenuated; null restores the normal path',()=>{
  const {audio}=make();
  audio.rifleShot(0,50,'kar98k','free');
  audio.setOcclusion({hz:700,gain:.25});audio.rifleShot(0,50,'kar98k','occluded');audio.setOcclusion(null);
  audio.rifleShot(0,50,'kar98k','free-again');
  const [free,occluded,again]=[...audio.voices];
  assert.ok(occluded.filter.frequency.value<=700,`lowpass ${occluded.filter.frequency.value}`);assert.ok(free.filter.frequency.value>700);
  assert.ok(Math.abs(occluded.gain.gain.value-free.gain.gain.value*.25)<1e-9,'-12 dB');
  assert.equal(again.gain.gain.value,free.gain.gain.value);assert.equal(again.filter.frequency.value,free.filter.frequency.value);
  assert.equal(audio.occlusion,null);audio.setOcclusion(undefined);assert.equal(audio.occlusion,null);
});
test('director probe (T06b): diagnostics.director is null until a probe is registered, plain data when it is, and null again afterwards',()=>{
  const {audio}=make();
  assert.equal(audio.diagnostics.director,null);
  audio.setDirectorProbe(()=>({zone:'open',emitters:{played:2}}));
  assert.deepEqual(audio.diagnostics.director,{zone:'open',emitters:{played:2}});assert.doesNotThrow(()=>structuredClone(audio.diagnostics));
  audio.setDirectorProbe('not a function');assert.equal(audio.diagnostics.director,null);
});
