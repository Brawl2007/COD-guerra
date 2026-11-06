import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioManager} from '../src/core/audio.js';
import {M01AudioDirector} from '../src/game/audio-director-m01.js';
import {AreaAudio,AREA_AUDIO,AREA_AUDIO_LABEL,areaSpecOf} from '../src/game/m01-area-audio.js';
import {AUDIO_PROVISIONAL_LABEL} from '../src/core/battlefield-audio.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

// Provisional area audio (T45): fake AudioContext, fake sims (the events are only shaped like the area sim's `shell-incoming` / `m01-blast`).
const make=()=>{const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx});assert.equal(audio.init(),true);
  audio.toneLog=[];const tone=audio.tone.bind(audio);   // tone() leaves no history entry: spy on it, keeping the real call (and its result: false means the voice was dropped or inaudible)
  audio.tone=(freq,dur,type,vol,slide,pan,delay,opts)=>{const ok=tone(freq,dur,type,vol,slide,pan,delay,opts);audio.toneLog.push({freq,dur,pan,kind:opts?.kind,distance:opts?.distance,ok,at:audio.clock});return ok;};
  return {audio,ctx};};
const player={x:0,y:0,z:0,angle:0,alive:true};
const areaSim=(actId,clock=0,extra={})=>({missionId:'m01_tczew',actId,clock,battleClock:46800+clock,player,consumed:{},mission:{phase:'X',complete:false},scene:null,timers:{barrage:{run:null}},definition:{},...extra});
const act1Sim=(clock=0)=>({missionId:'m01_tczew',clock,battleClock:17000+clock,player,consumed:{},mission:{phase:'X',complete:false},scene:null,definition:{}});
const tones=audio=>audio.toneLog.filter(h=>h.kind==='shell-whistle');
const advance=(audio,director,sim,to,step=.25)=>{for(let t=sim.clock;t<=to+1e-9;t+=step){sim.clock=t;audio.clock=t;director.update(sim);}};

test('the label is the T45 provisional one and the two acts have their own ambience data',()=>{
  assert.equal(AREA_AUDIO_LABEL,AUDIO_PROVISIONAL_LABEL);
  for(const spec of Object.values(AREA_AUDIO))assert.equal(spec.label,AUDIO_PROVISIONAL_LABEL);
  assert.ok(AREA_AUDIO.act_vii_b_north_day.artillery&&AREA_AUDIO.act_vii_b_north_day.birds);
  assert.equal(AREA_AUDIO.act_vii_c_withdrawal.birds,null,'dusk: birds stopped');
  assert.ok(Object.keys(AREA_AUDIO.act_vii_c_withdrawal.beds).length>=2,'dusk: wind and town fires');
  assert.equal(areaSpecOf(act1Sim()),null);assert.equal(areaSpecOf(areaSim('act_vii_a_north')),null,'VII-a has no new ambience');
});

test('the whistle is heard distance/343 s after the launch and ends with the thud: it leads the impact by exactly warnSec',()=>{
  const {audio}=make(),director=new M01AudioDirector(audio),sim=areaSim('act_vii_b_north_day',10);
  director.reset(sim);
  const point={x:0,y:0,z:-343*2};   // 686 m north: 2 s of sound travel
  const launch={type:'shell-incoming',point,warnSec:1.5,at:10};
  director.handleEvent(launch,sim);
  const landing={type:'m01-blast',kind:'shell',point,soundAt:10+1.5+2,aerial:false};   // the sim's soundAt = landing + distance/343 (game.js queues the thud at it)
  assert.equal(director.area.pending.length,1);
  const w=director.area.pending[0];
  assert.ok(Math.abs(w.at-12)<1e-9,'whistle starts at launch + 2 s');
  assert.ok(Math.abs((landing.soundAt-w.at)-launch.warnSec)<1e-9,'the whistle leads the thud by warnSec');
  assert.ok(Math.abs(w.at+w.duration-landing.soundAt)<1e-9,'and lasts until the thud arrives');
  advance(audio,director,sim,11.75);assert.equal(tones(audio).length,0,'not before it arrives');
  advance(audio,director,sim,12.25);assert.equal(tones(audio).length,1,'once it arrives');assert.equal(tones(audio)[0].ok,true,'a real voice was created (not dropped)');assert.equal(tones(audio)[0].dur,1.5);
  advance(audio,director,sim,20);assert.equal(tones(audio).length,1,'never again');
  assert.equal(director.errors,0);
});

test('a barrage of shells: one whistle per launch, none for a different mission',()=>{
  const {audio}=make(),director=new M01AudioDirector(audio),sim=areaSim('act_vii_b_north_day',0);director.reset(sim);
  const launches=[0,2,4,6];
  for(const at of launches)director.handleEvent({type:'shell-incoming',point:{x:30+at,y:0,z:-100},warnSec:1.5,at},sim);
  advance(audio,director,sim,12);
  assert.equal(tones(audio).length,launches.length);
  const other={...areaSim('act_vii_b_north_day',0),missionId:'other'};director.handleEvent({type:'shell-incoming',point:{x:0,y:0,z:-9},warnSec:1.5,at:0},other);
  assert.equal(director.area.pending.filter(s=>s.kind==='whistle').length,0);
});

test('a restore or new sim drops the whistles still in the air',()=>{
  const {audio}=make(),director=new M01AudioDirector(audio),sim=areaSim('act_vii_b_north_day',5);director.reset(sim);
  director.handleEvent({type:'shell-incoming',point:{x:0,y:0,z:-300},warnSec:1.5,at:5},sim);assert.equal(director.area.pending.length,1);
  director.reset(sim);assert.equal(director.area.pending.length,0);advance(audio,director,sim,9);assert.equal(tones(audio).length,0);
});

test('VII-c dusk: wind and town-fire beds start, the birds are silent; leaving the act stops the beds',()=>{
  const {audio}=make(),director=new M01AudioDirector(audio),dusk=areaSim('act_vii_c_withdrawal',0);director.reset(dusk);
  advance(audio,director,dusk,120,.5);
  assert.ok(audio.loops.has('area-wind')&&audio.loops.has('area-fires'),'both beds run');
  assert.equal(audio.toneLog.filter(h=>h.kind==='area-bird').length,0);
  assert.deepEqual([...director.area.beds].sort(),['area-fires','area-wind']);
  const day=areaSim('act_vii_b_north_day',0);director.reset(day);   // transition: the game resets the director on a new act
  assert.equal(audio.loops.has('area-wind'),false,'wind bed gone with the act');assert.equal(audio.loops.has('area-fires'),false);
  assert.equal(director.area.beds.size,0);
});

test('a transition seen only through update() (no reset) also ends the previous act\'s beds',()=>{
  const {audio}=make(),area=new AreaAudio(audio),dusk=areaSim('act_vii_c_withdrawal',0);
  area.reset(dusk);area.update(dusk);assert.ok(audio.loops.has('area-wind'));
  area.update(act1Sim(1));assert.equal(audio.loops.has('area-wind'),false);assert.equal(audio.loops.has('area-fires'),false);
});

test('VII-b day: distant artillery and birds appear over time, none during a barrage, and the day has no beds',()=>{
  const {audio}=make(),director=new M01AudioDirector(audio),day=areaSim('act_vii_b_north_day',0);director.reset(day);
  advance(audio,director,day,600,.5);
  const stats={...director.area.stats};
  assert.ok(stats.guns>=3,`distant guns between barrages: ${stats.guns}`);assert.ok(stats.chirps>=3,`birds: ${stats.chirps}`);
  assert.ok(audio.history.some(h=>h.kind==='distant-artillery'));assert.ok(audio.toneLog.some(h=>h.kind==='area-bird'&&h.ok),'bird notes make real voices');
  assert.equal(audio.loops.has('area-wind'),false);
  day.timers.barrage.run={id:'x'};
  advance(audio,director,day,1200,.5);
  assert.ok(director.area.stats.chirps-stats.chirps<=1,'no new birds scheduled while the guns fire');
  assert.ok(director.area.stats.guns-stats.guns<=1,'no new guns scheduled while the guns fire (at most one already in the air)');
});

test('it is deterministic: two identical runs produce the same area calls',()=>{
  const run=()=>{const {audio}=make(),director=new M01AudioDirector(audio),sim=areaSim('act_vii_c_withdrawal',0);director.reset(sim);advance(audio,director,sim,300,.5);return JSON.stringify(director.area.diagnostics)+JSON.stringify(audio.history.map(h=>[h.kind,h.key,h.distance]))+JSON.stringify(audio.toneLog.map(t=>[t.kind,t.freq,t.at]));};
  assert.equal(run(),run());
});

test('act 1: nothing of the area audio plays or is scheduled, whatever happens',()=>{
  const {audio}=make(),director=new M01AudioDirector(audio),sim=act1Sim(0);director.reset(sim);
  director.handleEvent({type:'shell-incoming',point:{x:0,y:0,z:-50},warnSec:1.5,at:0},sim);   // not emitted by act 1; even so it is ignored
  assert.equal(director.area.pending.length,0);
  advance(audio,director,sim,600,.5);
  assert.deepEqual(director.area.diagnostics,{label:AREA_AUDIO_LABEL,actId:null,beds:[],pending:0,whistles:0,guns:0,chirps:0,dropped:0});
  assert.equal(audio.loops.has('area-wind'),false);assert.equal(audio.loops.has('area-fires'),false);
  assert.equal(audio.toneLog.filter(h=>['shell-whistle','area-bird'].includes(h.kind)).length,0);
});

test('source guard: game.js no longer queues its own whistle (a duplicate); the director owns the area audio without a new hook',()=>{
  const game=readFileSync(new URL('../src/game/game.js',import.meta.url),'utf8');
  assert.equal(/kind:'whistle'/.test(game),false);assert.equal(/shell-whistle/.test(game),false);
  assert.match(readFileSync(new URL('../src/game/audio-director-m01.js',import.meta.url),'utf8'),/this\.area\.handleEvent\(event, sim\)/);
  assert.match(readFileSync(new URL('../src/game/m01-area-audio.js',import.meta.url),'utf8'),/PROVISIONAL/);
});
