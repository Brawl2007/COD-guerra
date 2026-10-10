import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FADE,GAP,HOLD,smoothstep,layerWeights,layerTime,fadeDuration,isExactClip,strideCycle,locomotionSample,
  isLocomoting,locomotionClip,selectGeneric,resolveAnimation} from '../src/render/m01-animation-resolver.js';
import {actorPose} from '../src/render/m01-actor-pose.js';

// Clip metadata as shipped in m01_soldier_animations.glb (durations and speed_mps extras).
const INFO={standing_idle:{duration:4},crouched_idle:{duration:3},aim:{duration:2},fire_bolt:{duration:1.17},
  walk:{duration:1,speed_mps:1.1},run:{duration:.68,speed_mps:3.251},pinned:{duration:2.4},fallen:{duration:1.4},wounded:{duration:2},
  mg34_prone_idle:{duration:3},mg34_prone_aim:{duration:1}};
const clips={has:n=>n in INFO,info:n=>INFO[n]};
const OFFSET=.4;
function candidate(actor,time){
  const pose=actorPose(actor,time);
  if(pose.name==='fallen')return {clip:'fallen',time:1.4,loop:false,rate:0,kind:'death',duration:1.4,...(Number.isFinite(actor.diedAt)?{since:actor.diedAt}:{})};
  if(actor.task==='prone')return {clip:'mg34_prone_idle',time:time-actor.proneAt,loop:false,rate:1,exact:true,duration:3};
  if(pose.underFire)return {clip:'pinned',time:time+OFFSET,loop:true,rate:1,duration:2.4};
  const s=selectGeneric({actor,pose,time,offset:OFFSET,clips});
  return {...s,duration:INFO[s.clip].duration};
}
const resolve=(actor,time,prev=null)=>resolveAnimation({actor,time,candidate:candidate(actor,time),prev,alt:patch=>candidate({...actor,...patch},time)});
const base=(extra={})=>({id:'de_spans_01',team:'enemy',alive:true,active:true,state:'GUARD',shot:0,crouched:false,x:0,z:0,facing:0,...extra});
const total=blend=>blend.reduce((s,b)=>s+b.weight,0);
const weightOf=(r,clip)=>r.blend.find(b=>b.clip===clip)?.weight??0;
const near=(a,b,e=1e-9)=>Math.abs(a-b)<=e;
/** Run the resolver at 60 Hz, mutating the actor through `mutate(actor,t)`. */
function drive(actor,from,to,mutate=()=>{},prev=null,hz=60){
  const frames=[];
  for(let i=0,t=from;t<=to+1e-9;i++,t=from+i/hz){
    mutate(actor,t);const r=resolve(actor,t,prev);prev=r.state;frames.push({t,r});
  }
  return {frames,prev};
}

test('blend curve is monotonic, symmetric, flat at both ends and weights always sum to one',()=>{
  assert.equal(smoothstep(-1),0);assert.equal(smoothstep(0),0);assert.equal(smoothstep(1),1);assert.equal(smoothstep(2),1);
  assert.ok(near(smoothstep(.5),.5)&&near(smoothstep(.25)+smoothstep(.75),1));
  let last=0;for(let i=0;i<=100;i++){const v=smoothstep(i/100);assert.ok(v>=last);last=v;}
  assert.ok(smoothstep(.02)<.002&&smoothstep(.98)>.998,'zero slope at both ends: no velocity pop');
  const state={target:'b',start:10,dur:.3,layers:[{clip:'a',w0:1},{clip:'b',w0:0}]};
  for(let t=9.9;t<10.5;t+=.01){const w=layerWeights(state,t);assert.ok(near(w[0]+w[1],1));}
  assert.deepEqual(layerWeights(state,10),[1,0]);assert.deepEqual(layerWeights(state,10.3),[0,1]);
  // A fade that restarts from a half-blended pose keeps the instantaneous weights.
  const mid=layerWeights(state,10.15);assert.ok(near(mid[0],.5));
  const again={target:'a',start:10.15,dur:.3,layers:[{clip:'a',w0:mid[0]},{clip:'b',w0:mid[1]}]};
  assert.ok(near(layerWeights(again,10.15)[0],.5));assert.ok(near(layerWeights(again,10.3)[0]+layerWeights(again,10.3)[1],1));
});

test('stand to crouch blends over 0.3 s of sim time without a single hard cut, in both directions',()=>{
  const flip=(crouched,since)=>(a,t)=>{if(t>=10-1e-9&&a.crouched!==crouched){a.crouched=crouched;a.posture=crouched?'crouch':'stand';a.postureSince=since;}};
  for(const [crouched,from,to] of [[true,'standing_idle','crouched_idle'],[false,'crouched_idle','standing_idle']]){
    const a=base({crouched:!crouched,posture:crouched?'stand':'crouch',postureSince:1});
    const {frames}=drive(a,9.5,10.8,flip(crouched,10));
    let previous=null,worst=0;
    for(const {t,r} of frames){
      assert.ok(near(total(r.blend),1),`sum at ${t}`);
      const w=weightOf(r,to);if(previous!==null)worst=Math.max(worst,Math.abs(w-previous));previous=w;
      if(t<10-1e-9)assert.equal(r.clip,from);else assert.equal(r.clip,to);
      if(t<10-1e-9)assert.equal(w,0);
      if(t>=10.3+1e-9){assert.equal(w,1);assert.equal(r.blend.length,1,'finished fade keeps one layer');}
    }
    assert.ok(worst<=1.5/(FADE.posture*60)+1e-9,`largest per-frame weight step ${worst} (smoothstep peak slope 1.5/dur; a hard cut would be 1)`);
    const half=frames.find(f=>near(f.t,10.15,1e-6)).r;assert.ok(near(weightOf(half,to),.5,.02),'half way at 0.15 s');
  }
  assert.equal(FADE.posture,.3);assert.equal(fadeDuration('standing_idle','crouched_idle'),.3);assert.equal(fadeDuration('crouched_idle','standing_idle'),.3);
});

test('idle, aim, walk, run and pinned switch with short cross-fades; bolt and pinned entry are faster than posture',()=>{
  assert.equal(fadeDuration('standing_idle','aim'),FADE.default);
  assert.equal(fadeDuration('aim','fire_bolt'),FADE.toFire);assert.equal(fadeDuration('fire_bolt','aim'),FADE.fromFire);
  assert.equal(fadeDuration('standing_idle','pinned'),FADE.toPinned);assert.equal(fadeDuration('pinned','crouched_idle'),FADE.fromPinned);
  assert.equal(fadeDuration('walk','standing_idle'),FADE.fromLoco);assert.equal(fadeDuration('walk','run'),FADE.default);
  for(const [a,b] of [['standing_idle','walk'],['walk','run'],['aim','standing_idle'],['pinned','aim'],['wounded','standing_idle']]){
    const d=fadeDuration(a,b);assert.ok(d>=FADE.toFire&&d<=FADE.posture,`${a}->${b}: ${d}`);
  }
  // Death always fades into the fall, even out of an authored clip.
  assert.equal(fadeDuration('mg34_prone_idle','fallen'),FADE.death);
  for(const exact of ['mg34_prone_enter','mg34_aim','mg34_fire_burst','ckm_wz30_gunner_idle','station_drag_medic_grab'])assert.ok(isExactClip(exact),exact);
  for(const generic of ['aim','walk','rkm_fire_burst','drag_wounded','carry_wounded'])assert.ok(!isExactClip(generic),generic);
  assert.equal(fadeDuration('standing_idle','mg34_prone_idle'),0);assert.equal(fadeDuration('mg34_prone_idle','standing_idle'),0);
});

test('an authored (exact) clip is never cross-faded: one layer at full weight on both edges',()=>{
  const actor=base();
  const {frames}=drive(actor,5,6.4,(a,t)=>{if(t>=5.5-1e-9&&t<6-1e-9){a.task='prone';a.proneAt=5.5;}else delete a.task;});
  for(const {t,r} of frames){assert.equal(r.blend.length,1,`t=${t}`);assert.equal(r.blend[0].weight,1);}
  assert.ok(frames.some(f=>f.r.clip==='mg34_prone_idle')&&frames.some(f=>f.r.clip==='standing_idle'));
});

test('death falls over the sim clock from diedAt, cross-fading from the live pose and landing on the final frame',()=>{
  const actor=base({postureSince:1,posture:'stand'});
  const {frames}=drive(actor,19.5,22,(a,t)=>{if(t>=20-1e-9&&a.alive){a.alive=false;a.diedAt=20;a.deathYaw=0;}});
  for(const {t,r} of frames){
    assert.ok(near(total(r.blend),1),`sum at ${t}`);
    if(t<20-1e-9){assert.equal(r.clip,'standing_idle');continue;}
    assert.equal(r.clip,'fallen');
    assert.ok(near(r.time,Math.min(1.4,t-20),1e-9),`fall time follows sim time at ${t}: ${r.time}`);
    const w=weightOf(r,'fallen');
    if(t>=20.2+1e-9){assert.equal(w,1);assert.equal(r.blend.length,1);}
    if(near(t,20.1,1e-6))assert.ok(near(w,.5,.03));
  }
  const last=frames.at(-1).r;assert.equal(last.time,1.4,'final frame once the fall has played');assert.equal(last.state.alive,false);
  let previous=0,worst=0;for(const {r} of frames.filter(f=>f.t>=20)){const w=weightOf(r,'fallen');worst=Math.max(worst,w-previous);previous=w;}
  assert.ok(worst<=1.5/(FADE.death*60)+1e-9,`death never snaps: largest weight step ${worst}`);
});

test('death without a sim timestamp keys on the sim time the renderer first saw it, or lands on the final pose',()=>{
  // First seen alive then dead (no diedAt): the fall plays from that sim time.
  const a=base();
  const {frames}=drive(a,30,32,(x,t)=>{if(t>=30.5-1e-9)x.alive=false;});
  const first=frames.find(f=>f.r.clip==='fallen');
  assert.ok(near(first.t,30.5,1e-6));assert.ok(near(first.r.time,0,1e-6));assert.ok(near(weightOf(first.r,'fallen'),0,1e-6),'starts from the live pose');
  const later=frames.find(f=>near(f.t,31,1e-6)).r;assert.ok(near(later.time,.5,1e-6));assert.equal(later.blend.length,1);
  assert.ok(near(frames.at(-1).r.time,1.4,1e-6)||frames.at(-1).r.time===1.4,'the fall completes');
  // Never seen alive (legacy loss, restore): final pose at full weight, nothing invented.
  const dead=base({alive:false});
  const r=resolve(dead,50);assert.equal(r.clip,'fallen');assert.equal(r.time,1.4);assert.deepEqual(r.blend.map(b=>b.weight),[1]);
  // The same dead actor seen again after a long silence is still the final pose.
  const again=resolve(dead,50.5,r.state);assert.equal(again.time,1.4);assert.equal(again.blend.length,1);
  // A resurrected actor (restored earlier checkpoint, clock goes back) resets cleanly.
  const back=resolve(base(),10,again.state);assert.equal(back.clip,'standing_idle');assert.equal(back.blend.length,1);
});

test('reload rebuilds an in-flight posture, death and gait-start fade from sim data alone',()=>{
  const postured=(t)=>base({crouched:true,posture:'crouch',postureSince:10});
  const live=drive(base({posture:'stand',postureSince:1}),9.5,10.4,(a,t)=>{if(t>=10-1e-9){a.crouched=true;a.posture='crouch';a.postureSince=10;}});
  for(const {t,r} of live.frames.filter(f=>f.t>=10&&f.t<10.3-1e-9)){
    const fresh=resolve(postured(t),t,null);
    assert.equal(fresh.clip,r.clip);
    for(const b of r.blend){const o=fresh.blend.find(x=>x.clip===b.clip);assert.ok(o,`layer ${b.clip} at ${t}`);assert.ok(near(o.weight,b.weight,1e-9)&&near(o.time,b.time,1e-9),`${b.clip} at ${t}`);}
  }
  // Death.
  const dying=drive(base({posture:'stand',postureSince:1}),19.5,20.4,(a,t)=>{if(t>=20-1e-9&&a.alive){a.alive=false;a.diedAt=20;a.deathYaw=0;}});
  for(const {t,r} of dying.frames.filter(f=>f.t>=20)){
    const fresh=resolve(base({alive:false,diedAt:20,deathYaw:0}),t,null);
    assert.ok(near(fresh.time,r.time,1e-9),`fall time at ${t}`);
    for(const b of r.blend){const o=fresh.blend.find(x=>x.clip===b.clip);assert.ok(o);assert.ok(near(o.weight,b.weight,1e-9)&&near(o.time,b.time,1e-9),`${b.clip} at ${t}`);}
  }
  // Gait start (idle -> walk) with the odometer.
  const walker=(odo,gaitSince)=>base({state:'ADVANCE',group:'grp_x',motion:{speed:1,odometer:odo,gait:'walk',gaitSince}});
  const moving=drive(base({motion:{speed:0,odometer:0,gait:'idle',gaitSince:1}}),14.5,15.4,(a,t)=>{
    if(t>=15-1e-9){a.state='ADVANCE';a.group='grp_x';a.motion={speed:1,odometer:t-15+0,gait:'walk',gaitSince:15};}});
  for(const {t,r} of moving.frames.filter(f=>f.t>=15&&f.t<15.2-1e-9)){
    const fresh=resolve(walker(t-15,15),t,null);assert.equal(fresh.clip,'walk');
    for(const b of r.blend){const o=fresh.blend.find(x=>x.clip===b.clip);assert.ok(o,`${b.clip} at ${t}`);assert.ok(near(o.weight,b.weight,1e-9)&&near(o.time,b.time,1e-9),`${b.clip} at ${t}`);}
  }
  // Unknown or ancient stamps never invent a fade (defaults are clock-1 or 0).
  assert.equal(resolve(base({crouched:true,posture:'crouch',postureSince:0}),.1,null).blend.length,1);
  assert.equal(resolve(base({crouched:true,posture:'crouch',postureSince:9}),10,null).blend.length,1);
});

test('same actor data at the same sim time gives identical output; pause (repeated clock) freezes every layer',()=>{
  const actor=base({crouched:true,posture:'crouch',postureSince:10});
  const first=resolve(actor,10.1,null);
  const sameAgain=resolve(structuredClone(actor),10.1,null);
  assert.deepEqual(sameAgain.blend,first.blend);assert.deepEqual(sameAgain.state,first.state);
  // Pause: the clock stops, the renderer keeps calling. Nothing may advance.
  let prev=first.state;const frozen=structuredClone(first.blend);
  for(let i=0;i<50;i++){const r=resolve(actor,10.1,prev);prev=r.state;assert.deepEqual(r.blend,frozen);}
  assert.deepEqual(prev,first.state);
  // And resuming continues from the same record rather than restarting it.
  const resumed=resolve(actor,10.1+1/60,prev);assert.ok(weightOf(resumed,'crouched_idle')>weightOf(first,'crouched_idle'));
  // Evaluating late then early (clock goes back after a load) does not use the stale record.
  const back=resolve(actor,10.05,resumed.state);assert.ok(back.state.t===10.05);assert.ok(near(weightOf(back,'crouched_idle'),smoothstep(.05/.3),1e-9));
  // A long silence also resets: no fade is invented from an old record.
  const silent=resolve(base({crouched:true,posture:'crouch',postureSince:2}),10+GAP+1,resumed.state);assert.equal(silent.blend.length,1);
});

test('a retarget in mid-fade (A, B, A) is continuous: no pop, one layer per clip, weights sum to one',()=>{
  const a=base({posture:'stand',postureSince:1});
  const script=(x,t)=>{
    const crouch=(t>=10&&t<10.1)||t>=10.2; // stand, crouch, stand again after 0.1 s, crouch again 0.1 s later
    x.crouched=crouch;x.posture=crouch?'crouch':'stand';x.postureSince=t>=10.2?10.2:t>=10.1?10.1:t>=10?10:1;
  };
  const {frames}=drive(a,9.9,10.8,script);
  let previous=null,worst=0;
  for(const {t,r} of frames){
    assert.ok(near(total(r.blend),1,1e-9),`sum ${t}`);assert.equal(new Set(r.blend.map(b=>b.clip)).size,r.blend.length);
    const w=weightOf(r,'crouched_idle');if(previous!==null)worst=Math.max(worst,Math.abs(w-previous));previous=w;
  }
  assert.ok(worst<.1,`largest step across interrupted fades ${worst}`);
  assert.equal(frames.at(-1).r.blend.length,1);assert.equal(frames.at(-1).r.clip,'crouched_idle');
});

test('foot drift: locomotion phase comes from the odometer so mean planted-foot speed error stays under 0.10 m/s',()=>{
  const dt=1/60,speeds=[[0,1],[3.6,4],[0,1],[1.4,2],[4.5,3],[0,1],[5.5,3],[3.6,3],[0,1]];
  const run=(useOdometer)=>{
    const actor=base({state:'ADVANCE',group:'grp_east_platoon',motion:{speed:0,odometer:0,gait:'idle',gaitSince:0}});
    let t=0,prev=null,odo=0,error=0,frames=0,last=null,gaitSince=0,gait='idle';
    for(const [speed,seconds] of speeds)for(let i=0;i<seconds*60;i++){
      t+=dt;odo+=speed*dt;
      const g=speed===0?'idle':speed<=2.2?'walk':speed<=4.4?'run':'sprint';if(g!==gait){gait=g;gaitSince=t;}
      actor.state=speed===0?'GUARD':'ADVANCE';
      actor.motion=useOdometer?{speed,odometer:odo,gait,gaitSince}:undefined;
      const r=resolve(actor,t,prev);prev=r.state;
      const own=r.blend.find(b=>b.target),info=INFO[own.clip];
      if(last&&speed>0&&info.speed_mps&&last.clip===own.clip){
        let cycles=(own.time-last.time)/info.duration;cycles-=Math.round(cycles); // fraction of a loop advanced this frame
        // The planted foot moves back at cycles*cycleDistance/dt relative to the body; the body moves at `speed`.
        error+=Math.abs(cycles*strideCycle(info)/dt-speed);frames++;
      }
      last={clip:own.clip,time:own.time};
    }
    return {mean:frames?error/frames:0,frames};
  };
  const withOdometer=run(true),withoutOdometer=run(false);
  assert.ok(withOdometer.frames>600);
  assert.ok(withOdometer.mean<=.10,`mean drift ${withOdometer.mean}`);
  assert.ok(withoutOdometer.mean>.5,`the old fixed-rate playback slides: ${withoutOdometer.mean}`);
});

test('locomotion helpers: clip from gait, cycle distance from GLB extras, blocked movers go idle after HOLD',()=>{
  assert.ok(near(strideCycle({duration:1,speed_mps:1.1}),1.1));assert.equal(strideCycle({duration:.64,cycle_distance_m:3.2,speed_mps:5}),3.2);
  assert.equal(strideCycle(undefined),0);assert.equal(strideCycle({duration:2}),0);
  const motion=(gait,gaitSince=0)=>({speed:1,odometer:5,gait,gaitSince});
  assert.equal(locomotionClip({motion:motion('walk')},clips),'walk');assert.equal(locomotionClip({motion:motion('run')},clips),'run');
  assert.equal(locomotionClip({motion:motion('sprint')},clips),'run','no sprint clip shipped: run');
  assert.equal(locomotionClip({motion:motion('sprint')},{has:n=>n==='sprint',info:()=>undefined}),'sprint','sprint is used when present');
  assert.equal(locomotionClip({motion:motion('run')},clips,{rkm:true}),'rkm_run');assert.equal(locomotionClip({motion:motion('walk')},clips,{rkm:true}),'rkm_walk');
  assert.equal(locomotionClip({group:'grp_east_platoon'},clips),'run','legacy fallback keeps the group rule');
  assert.equal(locomotionClip({motion:motion('idle')},clips,{hint:'run'}),'run','held gait keeps the playing clip');
  const moving={moving:true};
  assert.equal(isLocomoting({motion:motion('idle',10)},moving,10+HOLD/2),true,'idle for less than HOLD: still moving');
  assert.equal(isLocomoting({motion:motion('idle',10)},moving,10+HOLD+.01),false,'blocked for longer than HOLD: stand still');
  assert.equal(isLocomoting({motion:motion('walk',10)},moving,99),true);assert.equal(isLocomoting({},moving,5),true);assert.equal(isLocomoting({motion:motion('walk')},{moving:false},5),false);
  // Odometer phase: continuous, wraps once per cycle and is zero-drift by construction; no motion data keeps the old playback.
  const a={id:'x',motion:{speed:3.251,odometer:0,gait:'run',gaitSince:0}};
  const one=locomotionSample('run',INFO.run,a,100,0);assert.equal(one.source,'odometer');assert.equal(one.time,0);
  const cycle=strideCycle(INFO.run);a.motion.odometer=cycle/2;assert.ok(near(locomotionSample('run',INFO.run,a,100,0).time,.34));
  a.motion.odometer=cycle*7+cycle/4;assert.ok(near(locomotionSample('run',INFO.run,a,100,0).time,.17));
  assert.ok(near(locomotionSample('run',INFO.run,a,100,0).rate,1),'rate = speed / nominal speed');
  const legacy=locomotionSample('walk',INFO.walk,{id:'x'},12,.5);assert.deepEqual(legacy,{clip:'walk',time:12.5,loop:true,rate:1,source:'time'});
  // Different actors start at different foot phases.
  assert.notEqual(locomotionSample('run',INFO.run,{motion:{odometer:0,speed:1}},0,.4).time,locomotionSample('run',INFO.run,{motion:{odometer:0,speed:1}},0,2.8).time);
});

test('a blocked mover fades out of walking instead of sliding in place, and weights stay bounded by the layer cap',()=>{
  const actor=base({state:'ADVANCE',group:'grp_east_platoon',motion:{speed:3.6,odometer:0,gait:'run',gaitSince:5}});
  let odo=0;
  const {frames}=drive(actor,5,8,(a,t)=>{
    const blocked=t>=6;if(!blocked)odo+=3.6/60;
    a.motion={speed:blocked?0:3.6,odometer:odo,gait:blocked?'idle':'run',gaitSince:blocked?6:5};
  });
  const at=t=>frames.find(f=>near(f.t,t,1e-6)).r;
  assert.equal(at(6.2).clip,'run','inside HOLD the run continues');
  assert.equal(at(6.4).clip,'standing_idle','after HOLD it stands (state label still says ADVANCE)');
  assert.equal(at(7.5).blend.length,1);
  // Pathological flapping between clips never builds more than the layer cap and weights remain valid.
  let prev=null;const names=['standing_idle','aim','pinned','wounded'];
  for(let i=0;i<120;i++){
    const c={clip:names[i%4],time:i/60,loop:true,rate:1,duration:2};
    const r=resolveAnimation({actor:base(),time:20+i/60,candidate:c,prev});prev=r.state;
    assert.ok(r.blend.length<=4+0);assert.ok(near(total(r.blend),1,1e-9));assert.ok(r.blend.every(b=>b.weight>=0&&b.weight<=1+1e-12));
  }
});

test('layer clip time follows its own rate from sim time and never uses the wall clock',()=>{
  const l={clip:'a',loop:true,duration:2,t0:10,time0:1.5,rate:1,w0:1};
  assert.equal(layerTime(l,10),1.5);assert.ok(near(layerTime(l,10.75),.25));
  assert.equal(layerTime({...l,loop:false},13),2,'one-shot clamps at its end');
  assert.equal(layerTime({...l,rate:0},50),1.5,'held clip');
});

test('the new presentation modules contain no RNG or wall clock, and nothing stops all actions on the generic path',()=>{
  const read=p=>readFileSync(new URL(`../src/render/${p}`,import.meta.url),'utf8');
  const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');
  for(const file of ['m01-animation-resolver.js','m01-animation-player.js']){
    const code=strip(read(file));
    for(const banned of [/Math\.random/,/performance\.now/,/\bDate\b/,/requestAnimationFrame/,/setTimeout|setInterval/,/crypto/,/stopAllAction/])assert.ok(!banned.test(code),`${file}: ${banned}`);
  }
  assert.ok(!/from\s+['"]three/.test(read('m01-animation-resolver.js')),'the resolver is independent of THREE');
  const characters=strip(read('m01-characters.js'));
  // The generic actor path is create() .. update() .. release(): everything between `create(` and `updateCKM(`. The CKM gun prop
  // (updateCKM and the dispose clause for it) keeps its own authored mixer; it is not an actor and is outside this resolver.
  const from=characters.indexOf('create(actor,key,weaponLOD){'),to=characters.indexOf('updateCKM(actors,time,player,quality){');
  assert.ok(from>0&&to>from,'actor path located');
  const actorPath=characters.slice(from,to);
  assert.ok(/update\(actors,time,player/.test(actorPath)&&/release\(v\)\{/.test(actorPath));
  assert.ok(!/stopAllAction/.test(actorPath),'create/update/release never use a mixer-wide stop');
  assert.ok(!/\.setTime\(/.test(actorPath),'actors are not driven by mixer.setTime');
  assert.ok(!/Math\.random|performance\.now|\bDate\b/.test(characters),'pose code stays free of RNG and wall clocks');
  assert.ok(!/\bsetTime\b/.test(strip(read('m01-animation-player.js'))),'the player never uses mixer.setTime (it zeroes other actions)');
});
