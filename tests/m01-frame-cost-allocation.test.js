import test from 'node:test';
import assert from 'node:assert/strict';
import {M01HudPresenter,markerScreen} from '../src/ui/m01-hud.js';
import {varyLoop,proneReaction} from '../src/render/m01-animation-variety.js';
import {refineCandidate} from '../src/render/m01-animation-resolver.js';
import {actorPose} from '../src/render/m01-actor-pose.js';

// ---- HUD: the root size is read on resize, never per frame; the objective marker is evaluated once per simulation state ----
class FakeNode{
  constructor(){this.styles=new Map();this.dataset={};this.classes=new Set();this.own='';
    this.style={setProperty:(k,v)=>this.styles.set(k,String(v)),removeProperty:k=>this.styles.delete(k)};
    this.classList={toggle:(n,on)=>{on?this.classes.add(n):this.classes.delete(n);return on;},add:n=>this.classes.add(n),remove:(...n)=>n.forEach(x=>this.classes.delete(x)),contains:n=>this.classes.has(n)};}
  get textContent(){return this.own;}set textContent(v){this.own=String(v);}
}
function hudWithCountingRoot(size){
  const reads={n:0},root=new FakeNode();
  Object.defineProperty(root,'clientWidth',{get(){reads.n++;return size.w;}});Object.defineProperty(root,'clientHeight',{get(){reads.n++;return size.h;}});
  const el={root,objectiveMarker:new FakeNode(),markerLabel:new FakeNode(),markerDistance:new FakeNode(),sceneCue:new FakeNode(),tempoCard:new FakeNode(),tempoLabel:new FakeNode(),tempoReason:new FakeNode()};
  return {el,reads,presenter:new M01HudPresenter(el,{document:{createElement:()=>new FakeNode()}})};
}

test('HUD marker: clientWidth/clientHeight are cached on resize, not read in updateMarker every frame',()=>{
  const size={w:1600,h:900},{el,reads,presenter}=hudWithCountingRoot(size);
  const afterConstruction=reads.n;assert.ok(afterConstruction>0,'read once at construction');
  const marker={label:'Posto',distance:123.4,bearing:.3};
  for(let i=0;i<500;i++)presenter.updateMarker(marker,false);
  assert.equal(reads.n,afterConstruction,'no layout read in the per-frame path');
  const x16x9=Number(el.objectiveMarker.styles.get('--marker-x'));
  assert.equal(x16x9.toFixed(4),markerScreen(.3,1600/900).x.toFixed(4));
  // a resize re-reads once and the aspect follows it
  size.w=800;size.h=800;const before=reads.n;presenter.resize();assert.ok(reads.n>before);
  for(let i=0;i<100;i++)presenter.updateMarker(marker,false);
  assert.equal(Number(el.objectiveMarker.styles.get('--marker-x')).toFixed(4),markerScreen(.3,1).x.toFixed(4));
  // no layout box (hidden root): the 16:9 fallback, as before
  size.w=0;presenter.resize();assert.equal(presenter.aspect,16/9);
});

test('HUD marker: sim.objectiveMarker (pacing filter().sort()) runs once per simulation clock/pose, not once per rendered frame; reset drops the memo',()=>{
  const {presenter}=hudWithCountingRoot({w:1280,h:720});let calls=0;
  const sim={clock:10,player:{x:1,z:2,angle:.5},get objectiveMarker(){calls++;return {label:`m${calls}`,distance:5,bearing:0};}};
  const first=presenter.markerFor(sim);
  for(let i=0;i<300;i++)assert.strictEqual(presenter.markerFor(sim),first);
  assert.equal(calls,1);
  sim.clock=10.05;assert.notStrictEqual(presenter.markerFor(sim),first);assert.equal(calls,2);
  for(let i=0;i<50;i++)presenter.markerFor(sim);assert.equal(calls,2);
  sim.player.angle=.6;presenter.markerFor(sim);assert.equal(calls,3,'a changed view direction re-evaluates (bearing)');
  presenter.reset('restore',10.05);presenter.markerFor(sim);assert.equal(calls,4,'restore/continue drop the memo');
  presenter.clear();presenter.markerFor(sim);assert.equal(calls,5);
  const other={clock:sim.clock,player:sim.player,get objectiveMarker(){calls++;return null;}};assert.equal(presenter.markerFor(other),null);assert.equal(calls,6,'another simulation instance is never served the old marker');
});

// ---- animation variety: scratch results hold the same values as the old fresh objects ----
const INFO={standing_idle:{duration:4},standing_idle_b:{duration:4},standing_idle_c:{duration:4},crouched_idle:{duration:3},seated:{duration:4},seated_b:{duration:4},prone_idle:{duration:4},prone_flinch:{duration:.45},
  fidget_look:{duration:2},fidget_shift:{duration:2},fidget_helmet:{duration:2.2},fidget_check_rifle:{duration:2.4},stand_to_crouch:{duration:.45},crouch_to_stand:{duration:.45}};
const clips={has:n=>n in INFO,info:n=>INFO[n],get:n=>INFO[n]&&{duration:INFO[n].duration},size:99};
const soldier=(extra={})=>({id:'pl_east_3',team:'ally',role:'RIFLEMAN',active:true,alive:true,state:'GUARD',x:0,z:0,facing:0,shot:0,crouched:false,posture:'stand',postureSince:0,
  motion:{speed:0,odometer:0,gait:'idle',gaitSince:0},hitAt:-1e9,suppressedAt:-1e9,diedAt:-1e9,firedAt:-1e9,...extra});

test('varyLoop / proneReaction: reuse scratch objects (no allocation per actor per frame) with the same values; refineCandidate output stays independent per actor',()=>{
  // reference values of the former implementation, written out
  const ids=Array.from({length:30},(_,i)=>`de_east_${i}`),seen=new Set(),results=[];
  for(const id of ids){
    const actor=soldier({id}),pose=actorPose(actor,50),c={clip:'standing_idle',time:50.4,loop:true};
    const r=varyLoop(c,{actor,pose,time:50,clips});
    assert.ok(typeof r.clip==='string'&&Number.isFinite(r.time));seen.add(r);
    const refined=refineCandidate(c,{actor,pose,time:50,offset:.4,clips,variety:true});
    results.push({id,clip:refined.clip,time:refined.time,rate:refined.rate,loop:refined.loop});
    assert.notStrictEqual(refined,r,'refineCandidate hands the caller its own object');
  }
  assert.ok(seen.size<=4,`at most the 4 scratch shapes, got ${seen.size} objects for 30 actors`);
  // two actors refined back to back keep their own values (the scratch object is copied by refineCandidate, never stored)
  const a=results[0],b=results[1];assert.notEqual(a.id,b.id);
  const again=ids.slice(0,2).map(id=>{const actor=soldier({id});return refineCandidate({clip:'standing_idle',time:50.4,loop:true},{actor,pose:actorPose(actor,50),time:50,offset:.4,clips,variety:true});});
  assert.equal(again[0].clip,a.clip);assert.equal(again[0].time,a.time);assert.equal(again[1].clip,b.clip);assert.equal(again[1].time,b.time);
  // proneReaction: same values as before (flinch for 0.45 s after the stamp, otherwise the very same candidate)
  const prone=soldier({posture:'prone',suppressedAt:100}),base={clip:'prone_idle',time:10,loop:true};
  const f=proneReaction(base,prone,100.2,clips);assert.equal(f.clip,'prone_flinch');assert.equal(f.loop,false);assert.ok(Math.abs(f.time-.2)<1e-9);assert.deepEqual(Object.keys(f).sort(),['clip','loop','time']);
  assert.strictEqual(proneReaction(base,prone,100.6,clips),base);
});
