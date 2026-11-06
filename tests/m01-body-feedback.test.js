import test from 'node:test';
import assert from 'node:assert/strict';
import {M01BodyFeedback,BODY_FEEDBACK_CAPS} from '../src/render/m01-body-feedback.js';
import {validateM01AudioEvent} from '../src/game/m01-audio-events.js';
import {AudioManager} from '../src/core/audio.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';

const player=(y,extra={})=>({y,x:0,z:0,...extra});

test('a landing dips the camera quickly, then recovers: nothing for a hop, the cap for a lethal drop, softer in water',()=>{
  const f=new M01BodyFeedback();
  assert.equal(f.landing(1,2,'ground'),false,'a 2 m/s hop is not a landing');
  assert.equal(f.sample(1.1,player(0)).dy,0);
  const peak=speed=>{const g=new M01BodyFeedback();g.landing(10,speed);let m=0;for(let t=10;t<12;t+=.01)m=Math.max(m,0-g.sample(t,player(0)).dy);return m;};
  const hop=peak(4),fall=peak(9.9),lethal=peak(14),splash=(()=>{const g=new M01BodyFeedback();g.landing(10,12,'water');let m=0;for(let t=10;t<12;t+=.01)m=Math.max(m,0-g.sample(t,player(0)).dy);return m;})();
  assert.ok(hop>.03&&hop<fall&&fall<lethal,`${hop} < ${fall} < ${lethal}`);
  assert.ok(lethal<=BODY_FEEDBACK_CAPS.dip*1+1e-9&&lethal>.3,`the cap ${lethal}`);
  assert.ok(splash<peak(12)*.7);
  const g=new M01BodyFeedback();g.landing(5,10);
  const series=[0,.02,.055,.1,.2,.4,.7,1.2].map(a=>0-g.sample(5+a,player(0)).dy);
  assert.equal(series[0],0);assert.ok(series[2]>series[1]&&series[2]>=series[3]&&series[3]>series[4]&&series[4]>series[5],'fast attack, then decay');
  assert.equal(series.at(-1),0,'fully recovered');
});

test('quality scales the dip but never past the cap; a restore carries nothing over',()=>{
  const dip=quality=>{const g=new M01BodyFeedback();g.landing(0,13);return 0-g.sample(.055,player(0),quality).dy;};
  assert.ok(dip('low')<dip('medium')&&dip('medium')<=dip('high')&&dip('high')<=BODY_FEEDBACK_CAPS.dip+1e-9);
  const g=new M01BodyFeedback();g.landing(5,13);g.sample(5.03,player(0));
  g.sample(1,player(0));   // the clock went backwards (restore)
  assert.equal(g.sample(1.01,player(0)).stairs,0);
});

test('a stair lifts the camera smoothly instead of popping: the eye lags a 0.35 m step and settles in half a second',()=>{
  const g=new M01BodyFeedback(),dt=1/60;let t=0;
  for(;t<.2;t+=dt)g.sample(t,player(-.35));              // standing on the abutment lip
  const first=g.sample(t,player(0));                     // steps up 0.35 m, one frame at 60 Hz
  assert.ok(first.dy<-.25&&first.dy>-.36,`the eye starts ${first.dy.toFixed(3)} m below its true height`);
  t+=dt;let last=first.dy;for(let k=1;k<=30;k++){const s=g.sample(t+=dt,player(0));assert.ok(s.dy>last-1e-12,'monotone recovery');last=s.dy;}
  assert.ok(Math.abs(last)<.01,`settled (${last})`);
  // stepping down the same stair puts the eye above for a moment; a fall (airborne) is never eased
  const d=new M01BodyFeedback();d.sample(0,player(0));assert.ok(d.sample(dt,player(-.35)).dy>.25);
  const air=new M01BodyFeedback();air.sample(0,player(0));assert.equal(air.sample(.05,player(-2,{fall:{vy:-5}})).dy,0);
  const big=new M01BodyFeedback();big.sample(0,player(0));assert.equal(big.sample(.05,player(-3)).dy,0,'a drop over 0.9 m is a fall, not a stair');
});

test('walking up a steep bank is continuous: no lag at 45 degrees, a lag only for the part a slope cannot explain',()=>{
  const g=new M01BodyFeedback(),dt=1/60;let worst=0;
  for(let i=0;i<120;i++){const x=i*6*dt;worst=Math.max(worst,Math.abs(g.sample(i*dt,{x,z:0,y:x*1.0}).dy));}   // 6 m/s up a 45 degree slope
  assert.ok(worst<.02,`a 45 degree climb lags ${worst.toFixed(3)} m`);
  const lip=new M01BodyFeedback();for(let i=0;i<30;i++)lip.sample(i*dt,{x:i*3.8*dt,z:0,y:-.35});
  const s=lip.sample(30*dt,{x:30*3.8*dt,z:0,y:0});assert.ok(s.dy<-.2&&s.dy>-.3,`a 0.35 m lip at walking speed still eases (${s.dy.toFixed(3)})`);
});

test('the camera feedback is a pure function of the clock and the player: same inputs, same offsets',()=>{
  const run=()=>{const g=new M01BodyFeedback();g.landing(2,11);const out=[];for(let t=2;t<3;t+=.0137)out.push(g.sample(t,player(-1+Math.sin(t))));return out;};
  assert.deepEqual(run(),run());
});

test('the simulation event contract: player-landing needs the numbers the presentation reads',()=>{
  const good={type:'player-landing',speed:8,drop:3.2,damage:2,surface:'ground',point:{x:1,y:-3,z:2}};
  assert.equal(validateM01AudioEvent(good),good);
  for(const bad of [{...good,speed:NaN},{...good,surface:'lava'},{...good,point:undefined},{...good,damage:'x'}])assert.throws(()=>validateM01AudioEvent(bad),/player-landing/);
});

test('the landing sound is synthesised from the speed: a body thud on ground, a splash in water, a second knock only from a hard drop',()=>{
  const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx,quality:'high',fetchImpl:async()=>{throw new Error('offline');}});
  assert.equal(audio.init(),true);
  const before=audio.events.get('player-landing')??0;
  audio.landing(4,'ground');audio.landing(13,'ground');audio.landing(10,'water');
  assert.equal(audio.events.get('player-landing'),before+3);
  const records=audio.history.filter(h=>h.kind==='player-landing');
  assert.deepEqual(records.map(r=>r.detail.surface),['ground','ground','water']);
  assert.equal(records[1].detail.speed,13);
  assert.ok(ctx.sources.length>0,'the sound reached the graph');
});
