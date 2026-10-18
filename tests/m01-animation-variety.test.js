// T08 clip library wired into the renderer + per-actor animation variety (owner playtest: "few soldier animations", "repeated movements").
// Pure presentation: every assertion here is about which authored clip a soldier shows and where in it he is, from actor data and sim time only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {actorPose} from '../src/render/m01-actor-pose.js';
import {
  VARIETY,STAND_IDLES,CROUCH_IDLES,FIDGETS,DEATHS,HITS,POSTURE_TRANSITIONS,
  animationSeed,mix32,unit,varietyOf,loopTime,impactSector,hitReactionClip,duckReactionClip,deathVariant,idleChoice,restingVariant,coverLowOf,postureTransition,isAlert,varyLoop,proneReaction,varietyActive
} from '../src/render/m01-animation-variety.js';
import {isFootIkEligible} from '../src/render/m01-foot-ik.js';
import {actorHash,FADE,fadeDuration,refineCandidate,selectGeneric,resolveAnimation,resolveCombatReaction,locomotionSample,wrapAngle} from '../src/render/m01-animation-resolver.js';

// ---- a clip view with the shipped durations (m01_soldier_animations.glb + motion-clips-v1 + clip-library-v2) ----------------------------
const INFO={standing_idle:{duration:4},standing_idle_b:{duration:4},standing_idle_c:{duration:4},crouched_idle:{duration:3},crouched_idle_b:{duration:3},
  cover_low_idle:{duration:3},aim:{duration:2},fire_bolt:{duration:1.17},pinned:{duration:2.4},fallen:{duration:1.4},wounded:{duration:2},seated:{duration:4},seated_b:{duration:4},
  walk:{duration:1,speed_mps:1.1},run:{duration:.68,speed_mps:3.251},sprint:{duration:.64,speed_mps:5,cycle_distance_m:3.2},crouch_walk:{duration:.96,cycle_distance_m:.768},
  fidget_look:{duration:2},fidget_shift:{duration:2},fidget_helmet:{duration:2.2},fidget_check_rifle:{duration:2.4},
  hit_front:{duration:.76},hit_back:{duration:.76},hit_left:{duration:.76},hit_right:{duration:.76},near_miss_duck:{duration:.98},blast_duck:{duration:1},
  death_front:{duration:1.6},death_back:{duration:1.5},death_left:{duration:1.5},death_right:{duration:1.5},death_crumple:{duration:1.8},
  stand_to_crouch:{duration:.45},crouch_to_stand:{duration:.45},prone_idle:{duration:4},prone_flinch:{duration:.45}};
const view=(names=Object.keys(INFO))=>{const set=new Set(names);return {has:n=>set.has(n),info:n=>set.has(n)?INFO[n]:undefined,get:n=>set.has(n)?{duration:INFO[n].duration}:undefined,get size(){return set.size;}};};
const FULL=view(),LEGACY=view(['standing_idle','crouched_idle','aim','fire_bolt','pinned','fallen','wounded','walk','run','sprint','crouch_walk','hit_front','near_miss_duck','prone_idle']);
const OFFSET=.4;
const soldier=(extra={})=>({id:'pl_east_3',team:'ally',role:'RIFLEMAN',active:true,alive:true,state:'GUARD',x:0,z:0,facing:0,shot:0,crouched:false,posture:'stand',postureSince:0,
  motion:{speed:0,odometer:0,gait:'idle',gaitSince:0},hitAt:-1e9,suppressedAt:-1e9,diedAt:-1e9,firedAt:-1e9,...extra});
// What M01Characters.sample() hands the resolver: a corpse is the 'fallen' sample, everyone else goes through the generic selection.
const pick=(actor,time,clips=FULL)=>{
  const pose=actorPose(actor,time);
  if(pose.name==='fallen')return refineCandidate({clip:'fallen',time:1.4,loop:false},{actor,pose,time,offset:OFFSET,clips});
  return selectGeneric({actor,pose,time,offset:OFFSET,clips});
};
const ROSTER=Array.from({length:40},(_,i)=>`de_east_${i+2}`);
const idWhere=(family,variant,coverLow=false)=>ROSTER.find(id=>restingVariant({id},family,coverLow)===variant);
const circ=(a,b)=>{const d=Math.abs(a-b)%1;return Math.min(d,1-d);};

// ================================ seeds: the lockstep root cause ================================
test('the legacy id hash gave sequential ids offsets 4 ms apart; the animation seed does not',()=>{
  const legacy=i=>(actorHash(`pl_east_${i}`)%1000)/250;
  assert.ok(Math.abs(legacy(1)-legacy(0)-.004)<1e-9,'documents the defect: neighbouring platoon men started their loops 4 ms apart');
  const ids=Array.from({length:24},(_,i)=>`pl_east_${i}`);
  const phases=ids.map(id=>varietyOf(id).phase);
  const gaps=ids.slice(1).map((_,i)=>circ(phases[i],phases[i+1])).sort((a,b)=>a-b);
  assert.ok(gaps[Math.floor(gaps.length/2)]>.1,`median neighbour phase gap ${gaps[Math.floor(gaps.length/2)]}`);
  assert.ok(gaps[0]>.004,`closest neighbour pair ${gaps[0]}`);
  const bins=new Set(phases.map(p=>Math.floor(p*10)));
  assert.ok(bins.size>=7,`24 men cover ${bins.size}/10 phase bins`);
});

test('seeds are deterministic, id-sensitive and uniform; profiles stay inside the documented bounds',()=>{
  assert.equal(animationSeed('de_east_7'),animationSeed('de_east_7'));
  assert.notEqual(animationSeed('de_east_7'),animationSeed('de_east_8'));
  assert.equal(mix32(0),0);
  const ids=[...Array.from({length:40},(_,i)=>`de_east_${i}`),...Array.from({length:24},(_,i)=>`pl_east_${i}`),...Array.from({length:10},(_,i)=>`de_spans_${i}`)];
  const profiles=ids.map(varietyOf);
  for(const p of profiles){
    assert.ok(p.phase>=0&&p.phase<1);
    assert.ok(Math.abs(p.rate-1)<=VARIETY.rate+1e-12&&Math.abs(p.stride-1)<=VARIETY.stride+1e-12);
    assert.ok(p.slotLength>=VARIETY.slotMin&&p.slotLength<VARIETY.slotMin+VARIETY.slotSpan);
  }
  assert.equal(new Set(profiles.map(p=>p.rate.toFixed(6))).size,ids.length,'every actor has his own playback rate');
  assert.equal(new Set(profiles.map(p=>p.phase.toFixed(6))).size,ids.length);
  assert.ok(Math.max(...profiles.map(p=>p.rate))-Math.min(...profiles.map(p=>p.rate))>.07,'the rate spread is actually used');
  assert.strictEqual(varietyOf('de_east_7'),varietyOf('de_east_7'),'profiles are cached: nothing is allocated per frame');
  const u=Array.from({length:4000},(_,i)=>unit(12345,i));
  assert.ok(u.every(x=>x>=0&&x<1)&&Math.abs(u.reduce((s,x)=>s+x,0)/u.length-.5)<.02);
});

test('same id and sim time give the same loop time and rate; different ids differ; it is a pure function of sim time (restore-safe)',()=>{
  const a=pick(soldier({id:'pl_east_3'}),123.4),b=pick(soldier({id:'pl_east_3'}),123.4),c=pick(soldier({id:'pl_east_4'}),123.4);
  assert.deepEqual(a,b);
  assert.ok(circ(a.time/4,c.time/4)>.02||a.clip!==c.clip,'neighbouring ids are no longer in lockstep');
  // A rewound clock (load) reproduces the exact value; there is no state to restore.
  const first=pick(soldier(),300.25);pick(soldier(),9000);assert.deepEqual(pick(soldier(),300.25),first);
  // Time advances at the actor's own rate, so two actors drift apart instead of re-synchronising each loop.
  const v1=varietyOf('pl_east_3'),v2=varietyOf('pl_east_4');
  assert.notEqual(v1.rate,v2.rate);
  assert.ok(Math.abs(loopTime(v1,10,4)-(((10*v1.rate+v1.phase*4)%4)+4)%4)<1e-12);
  assert.ok(Math.abs(loopTime(v1,10,4)-loopTime(v2,10,4))>1e-3);
});

test('platoon cohort: eight men idling together are spread over the cycle, none shares a rate, and sprinting men have their own stride phase',()=>{
  const ids=Array.from({length:8},(_,i)=>`pl_east_${i}`),t=500.5;
  const idle=ids.map(id=>pick(soldier({id,crouched:true,posture:'crouch'}),t));
  assert.ok(idle.every(s=>CROUCH_IDLES.slice(0,2).includes(s.clip)),idle.map(s=>s.clip).join());
  const rates=new Set(idle.map(s=>s.rate.toFixed(5)));assert.equal(rates.size,8);
  const phases=idle.map(s=>(s.time%3)/3);
  let tight=0;for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if(circ(phases[i],phases[j])<.02)tight++;
  assert.ok(tight<=1,`${tight} of 28 pairs within 2 % of a cycle`);
  const run=ids.map(id=>pick(soldier({id,state:'ADVANCE',group:'grp_east_platoon',motion:{speed:6,odometer:1234.5,gait:'sprint',gaitSince:1}}),t));
  assert.ok(run.every(s=>s.clip==='sprint'&&s.source==='odometer'));
  assert.equal(new Set(run.map(s=>s.time.toFixed(4))).size,8,'same odometer, eight different foot phases');
  // Stride length varies within +-3.5 % only: the feet cannot slide by more than that of a stride.
  const nominal=6/3.2*.64;
  for(const s of run)assert.ok(Math.abs(s.rate/nominal-1)<=.04,`rate ${s.rate} vs ${nominal}`);
  // A walking platoon (odometer driven walk through the MOVER path) is spread the same way.
  const walk=ids.map(id=>pick(soldier({id,state:'ADVANCE',motion:{speed:1.1,odometer:77.7,gait:'walk',gaitSince:1}}),t));
  assert.ok(walk.every(s=>s.clip==='walk'&&s.source==='odometer'));assert.equal(new Set(walk.map(s=>s.time.toFixed(4))).size,8);
});

test('without the T08 library the output is exactly the previous behaviour (time+offset, rate 1, one idle, fallen); the layer can still be forced on',()=>{
  const a=soldier({id:'pl_east_3'}),b=soldier({id:'pl_east_4'});
  for(const t of [10,333.3]){
    const x=pick(a,t,LEGACY),y=pick(b,t,LEGACY);
    assert.equal(x.clip,'standing_idle');assert.equal(x.time,t+OFFSET);assert.equal(x.rate,1);assert.equal(x.time,y.time,'every id shares the offset: the defect this layer fixes');
  }
  const m=soldier({state:'ADVANCE',motion:{speed:1.1,odometer:5,gait:'walk',gaitSince:1}});
  assert.equal(pick(m,50,LEGACY).time,locomotionSample('walk',INFO.walk,m,50,OFFSET).time);
  const dead=soldier({alive:false,diedAt:40});assert.equal(pick(dead,50,LEGACY).clip,'fallen');
  assert.equal(varietyActive(LEGACY),false);assert.equal(varietyActive(FULL),true);assert.equal(varietyActive(null),false);
  const raw={clip:'standing_idle',time:10+OFFSET,loop:true},ctx={actor:a,pose:actorPose(a,10),time:10,offset:OFFSET,clips:LEGACY};
  const forced=refineCandidate(raw,{...ctx,variety:true});
  assert.equal(forced.clip,'standing_idle');assert.equal(forced.rate,varietyOf('pl_east_3').rate,'forced on: own rate and phase even with one idle clip');
  assert.notEqual(forced.time,10+OFFSET);
});

// ================================ clip coverage per state ================================
test('standing soldiers: three resting idles across the roster, ONE per soldier for ten minutes (no re-roll, so no foot slide), fidgets only from the base idle',()=>{
  const rest=new Set(),fidgets={};let fidgeters=0;
  for(const id of ROSTER){
    const mine=new Set();let n=0;
    for(let i=0;i<1200;i++){
      const t=100+i*.5,s=pick(soldier({id}),t);
      if(s.clip.startsWith('fidget_')){fidgets[s.clip]=(fidgets[s.clip]??0)+1;n++;assert.ok(s.time>=0&&s.time<=INFO[s.clip].duration+1e-9,`${s.clip} age ${s.time}`);}
      else mine.add(s.clip);
    }
    assert.equal(mine.size,1,`${id} shows ${[...mine]}: the resting idle must not change while he stands`);
    mine.forEach(c=>rest.add(c));
    if(n>0){fidgeters++;assert.ok(mine.has('standing_idle'),`${id} fidgets from ${[...mine]}: fidgets are authored from and to the base idle`);}
  }
  assert.deepEqual([...rest].sort(),[...STAND_IDLES].sort());
  for(const f of FIDGETS)assert.ok(fidgets[f]>0,`${f} never shown: ${JSON.stringify(fidgets)}`);
  assert.ok(fidgeters>=8,`${fidgeters} of 40 soldiers fidgeted`);
  for(let i=0;i<200;i++)assert.equal(pick(soldier({id:'de_east_9'}),100+i,LEGACY).clip,'standing_idle');
});

test('different soldiers never show the same clip schedule: ten men over two minutes produce ten distinct (clip, time) sequences',()=>{
  const seq=id=>Array.from({length:60},(_,i)=>{const s=pick(soldier({id}),50+i*2);return `${s.clip}@${s.time.toFixed(2)}`;}).join(',');
  assert.equal(new Set(ROSTER.slice(0,10).map(seq)).size,10);
});

test('a fidget starts and ends inside one slot and is a pure function of time',()=>{
  const id=idWhere('stand',0),actor=soldier({id}),v=varietyOf(id);let seen=0;
  for(let i=0;i<8000;i++){
    const t=200+i*.05,c=idleChoice(actor,t,'stand',FULL,{});
    if(!c.fidget)continue;seen++;
    const dur=INFO[c.fidget].duration,x=(t+v.slotShift)/v.slotLength,s=(x-Math.floor(x))*v.slotLength;
    assert.ok(s-c.fidgetAge>=VARIETY.fidgetMargin-1e-9&&s-c.fidgetAge+dur<=v.slotLength-VARIETY.fidgetMargin+1e-9,'fidget sits inside its slot');
  }
  assert.ok(seen>0);
  const t=321.7,first=idleChoice(actor,t,'stand',FULL,{}),snap=[first.clip,first.fidget,first.fidgetAge];
  idleChoice(actor,t+77,'stand',FULL,{});const again=idleChoice(actor,t,'stand',FULL,{});assert.deepEqual([again.clip,again.fidget,again.fidgetAge],snap);
});

test('an alert soldier (fired, hit or shot at in the last 8 s) does not fidget; a relaxed one does',()=>{
  const id=idWhere('stand',0),times=Array.from({length:6000},(_,i)=>200+i*.1);
  const relaxed=times.filter(t=>idleChoice(soldier({id}),t,'stand',FULL,{}).fidget).length;
  assert.ok(relaxed>0);
  const alertFidgets=times.filter(t=>{const a=soldier({id,firedAt:t-3});return isAlert(a,t)&&idleChoice(a,t,'stand',FULL,{alert:true}).fidget;}).length;
  assert.equal(alertFidgets,0);
  assert.equal(isAlert(soldier({suppressedAt:99}),100),true);assert.equal(isAlert(soldier({suppressedAt:80}),100),false);assert.equal(isAlert(soldier(),100),false);
  for(const t of times.slice(0,1000)){const s=pick(soldier({id,firedAt:t-6}),t);assert.ok(!s.clip.startsWith('fidget_'),s.clip);}
});

test('kneeling soldiers: one kneeling idle per soldier (left or right knee), the squat joins them behind low cover only; nothing changes without the library',()=>{
  const seen=new Set(),seenCover=new Set();
  for(const id of ROSTER){
    const plain=new Set(),cover=new Set(),tall=new Set();
    for(let i=0;i<600;i++){
      const t=30+i*.5,k={id,crouched:true,posture:'crouch'};
      plain.add(pick(soldier(k),t).clip);
      cover.add(pick(soldier({...k,cover:{nodeId:'sb1',type:'SANDBAG',side:'left',height:.8}}),t).clip);
      tall.add(pick(soldier({...k,cover:{nodeId:'w',type:'WALL',side:'left',height:1.6}}),t).clip);
    }
    assert.equal(plain.size,1,`${id}: ${[...plain]}`);assert.equal(cover.size,1);assert.equal(tall.size,1);
    plain.forEach(c=>seen.add(c));cover.forEach(c=>seenCover.add(c));
    assert.ok(!tall.has('cover_low_idle'),'cover_low_idle is a squat below ~1 m of cover only');
  }
  assert.deepEqual([...seen].sort(),['crouched_idle','crouched_idle_b']);
  assert.ok(seenCover.has('cover_low_idle')&&seenCover.has('crouched_idle')&&seenCover.has('crouched_idle_b'));
  assert.equal(coverLowOf({cover:{height:1.2}}),true);assert.equal(coverLowOf({cover:{height:1.21}}),false);assert.equal(coverLowOf({}),false);
  for(let i=0;i<100;i++)assert.equal(pick(soldier({crouched:true,posture:'crouch'}),i,LEGACY).clip,'crouched_idle');
});

test('stand <-> crouch plays the authored transition for its length when his kneeling idle is the base one; every other soldier keeps the plain cross-fade',()=>{
  const right=idWhere('crouch',0),left=idWhere('crouch',1);
  const crouching=soldier({id:right,crouched:true,posture:'crouch',postureSince:50});
  assert.deepEqual([pick(crouching,50).clip,pick(crouching,50.2).clip,pick(crouching,50.44).clip],Array(3).fill('stand_to_crouch'));
  assert.ok(Math.abs(pick(crouching,50.2).time-.2)<1e-9);
  assert.equal(pick(crouching,50.46).clip,'crouched_idle');
  const standing=soldier({id:right,postureSince:50});
  assert.equal(pick(standing,50.1).clip,'crouch_to_stand');assert.ok(STAND_IDLES.includes(pick(standing,50.5).clip));
  // The left-knee soldier would swap 0.76 m of foot position inside 0.1-0.2 s: he gets the plain posture cross-fade.
  assert.equal(pick({...crouching,id:left},50.1).clip,'crouched_idle_b');assert.equal(pick({...standing,id:left},50.1).clip.startsWith('crouch_to'),false);
  assert.ok(!['stand_to_crouch','crouch_to_stand'].includes(pick({...crouching,role:'ENGINEER'},50.1).clip));
  assert.equal(pick(crouching,50.1,LEGACY).clip,'crouched_idle');
  assert.equal(postureTransition(soldier({id:right,postureSince:0}),.1,FULL),null,'postureSince 0 is "unknown", not an event');
  assert.equal(postureTransition(crouching,49,FULL),null,'a stamp in the future is not an event');
  const coverRight=idWhere('crouch',0,true),coverSquat=idWhere('crouch',2,true);
  assert.notEqual(coverSquat,undefined);
  const cover={nodeId:'sb',type:'SANDBAG',side:'left',height:.8};
  assert.equal(pick(soldier({id:coverRight,crouched:true,posture:'crouch',postureSince:50,cover}),50.1).clip,'stand_to_crouch');
  assert.equal(pick(soldier({id:coverSquat,crouched:true,posture:'crouch',postureSince:50,cover}),50.1).clip,'cover_low_idle','the squat variant is never entered through the right-knee clip');
});

test('prone soldiers flinch when shot at or hit and otherwise lie in their prone idle (the idle keeps its sim-stamp time)',()=>{
  const prone=(extra={})=>soldier({posture:'prone',...extra});
  const base={clip:'prone_idle',time:10,loop:true};
  assert.equal(proneReaction(base,prone({suppressedAt:100}),100.2,FULL).clip,'prone_flinch');
  assert.equal(proneReaction(base,prone({hitAt:100}),100.2,FULL).clip,'prone_flinch');
  assert.ok(Math.abs(proneReaction(base,prone({suppressedAt:100}),100.2,FULL).time-.2)<1e-9);
  assert.strictEqual(proneReaction(base,prone({suppressedAt:100}),100.6,FULL),base);
  assert.strictEqual(proneReaction(base,prone(),100,FULL),base);
  assert.strictEqual(proneReaction(base,prone({suppressedAt:100}),100.2,LEGACY),base,'no library: unchanged');
  // End to end through the resolver: the sample() of a prone soldier is prone_idle timed from postureSince.
  const a=prone({postureSince:80,suppressedAt:100.1});
  const flinch=refineCandidate(base,{actor:a,pose:actorPose(a,100.2),time:100.2,offset:OFFSET,clips:FULL});
  assert.equal(flinch.clip,'prone_flinch');assert.equal(flinch.rate,1);
  assert.equal(refineCandidate(base,{actor:a,pose:actorPose(a,101),time:101,offset:OFFSET,clips:FULL}).time,10,'idle time stays stamp driven');
});

test('seated soldiers split between the two seated loops',()=>{
  const clips=new Set(Array.from({length:60},(_,i)=>varyLoop({clip:'seated',time:0,loop:true},{actor:soldier({id:`camp_${i}`}),pose:{name:'seated'},time:10,clips:FULL}).clip));
  assert.deepEqual([...clips].sort(),['seated','seated_b']);
});

// ================================ reactions ================================
test('impact sector follows the sim hitYaw relative to facing: left is facing - 90 degrees in the renderer frame',()=>{
  // The renderer maps the model's -Z (forward) to (cos f, sin f) in (x,z); the model's left (-X) lands on (sin f, -cos f) = angle f - PI/2.
  for(const f of [0,.7,-2.4,Math.PI]){
    const left=Math.atan2(-Math.cos(f),Math.sin(f));
    assert.ok(Math.abs(wrapAngle(left-(f-Math.PI/2)))<1e-9);
    assert.equal(impactSector(f-Math.PI/2,f),'left');assert.equal(impactSector(f+Math.PI/2,f),'right');
    assert.equal(impactSector(f,f),'front');assert.equal(impactSector(f+Math.PI,f),'back');
    assert.equal(impactSector(f+.5,f),'front');assert.equal(impactSector(f-2.6,f),'back');
  }
  assert.equal(impactSector(undefined,0),'front');assert.equal(impactSector(1,NaN),'front');
});

test('hit reactions pick the directional clip when it is loaded and fall back to hit_front otherwise',()=>{
  const hit=(yaw,clips)=>hitReactionClip(soldier({facing:0,hitYaw:yaw,hitAt:10}),clips);
  assert.equal(hit(0,FULL),HITS.front);assert.equal(hit(Math.PI,FULL),HITS.back);assert.equal(hit(-Math.PI/2,FULL),HITS.left);assert.equal(hit(Math.PI/2,FULL),HITS.right);
  for(const yaw of [Math.PI,-Math.PI/2,Math.PI/2])assert.equal(hit(yaw,LEGACY),'hit_front');
  assert.equal(hit(Math.PI,null),'hit_front');
  const a=soldier({facing:0,hitYaw:-Math.PI/2,hitAt:10});
  const map=new Map(Object.keys(INFO).map(n=>[n,{duration:INFO[n].duration}])),r=resolveCombatReaction(a,10.3,null,map);
  assert.ok(r.clip==='hit_left'&&!r.loop&&Math.abs(r.time-.3)<1e-9);
  assert.equal(resolveCombatReaction(a,10.9,null,map),null);
  const legacy=resolveCombatReaction(a,10.3,null,null);assert.ok(legacy.clip==='hit_front'&&Math.abs(legacy.time-.3)<1e-9,'no clip set: the original behaviour');
});

test('near misses show the round-passing duck, and the violent blast duck for a deterministic share',()=>{
  let blast=0;const n=400;
  for(let i=0;i<n;i++){const a=soldier({id:`pl_east_${i%24}`,suppressedAt:20+i*.37});if(duckReactionClip(a,FULL)==='blast_duck')blast++;assert.equal(duckReactionClip(a,FULL),duckReactionClip(a,FULL));}
  assert.ok(blast/n>.15&&blast/n<.35,`blast share ${blast/n}`);
  assert.equal(duckReactionClip(soldier({suppressedAt:20}),LEGACY),'near_miss_duck');
});

test('deaths: the killing shot picks the directional clip, no recorded shot spreads over all five, no library keeps fallen',()=>{
  const dead=(extra={})=>soldier({alive:false,diedAt:100,deathYaw:0,facing:0,...extra});
  const lethal=(yaw,id='de_east_2')=>deathVariant(dead({id,hitAt:100,hitYaw:yaw}),FULL);
  const directed=new Set();
  for(let i=0;i<40;i++){const id=`de_east_${i}`;directed.add(`${lethal(0,id)}|${lethal(Math.PI,id)}|${lethal(-Math.PI/2,id)}|${lethal(Math.PI/2,id)}`);}
  const counts={};for(let i=0;i<200;i++){const k=deathVariant(dead({id:`de_east_${i}`,hitAt:100,hitYaw:Math.PI}),FULL);counts[k]=(counts[k]??0)+1;}
  assert.ok(counts.death_back>counts.death_crumple,JSON.stringify(counts));assert.ok(counts.death_crumple>10&&counts.death_crumple<90,'a share stays the undirected crumple');
  assert.ok(Object.keys(counts).every(k=>['death_back','death_crumple'].includes(k)),JSON.stringify(counts));
  const free={};for(let i=0;i<200;i++){const k=deathVariant(dead({id:`de_east_${i}`,hitAt:-1e9}),FULL);free[k]=(free[k]??0)+1;}
  assert.deepEqual(Object.keys(free).sort(),Object.values(DEATHS).sort());
  assert.equal(deathVariant(dead({hitAt:100,hitYaw:Math.PI}),LEGACY),'fallen');
  assert.equal(deathVariant(dead({hitAt:100,hitYaw:Math.PI,posture:'prone'}),FULL),'fallen','a prone corpse keeps the original lying clip');
  assert.equal(deathVariant(dead({id:'de_east_0',mg34Prone:{phase:'aim',progress:1}}),FULL),'fallen');
  // The real dead MG34 gunner as the simulation leaves him (route to 257.55 s): posture 'crouch', mg34Prone removed, weapon/role kept. The browser spec
  // tests/browser/m01-anim-resolver.spec.js ('cold load: the MG34 gunner death cross-fades into fallen') relies on exactly this.
  const gunner=dead({id:'de_east_0',team:'enemy',role:'SUPPORT',weapon:'mg34',group:'grp_de_east',posture:'crouch',hitAt:100,hitYaw:Math.PI});
  assert.equal(gunner.mg34Prone,undefined);assert.equal(deathVariant(gunner,FULL),'fallen');
  assert.equal(deathVariant(dead({id:'de_mg34_loader_0',group:'grp_mg34_loaders',role:'RIFLEMAN',posture:'stand',hitAt:100,hitYaw:Math.PI}),FULL),'fallen');
  assert.equal(pick(gunner,101).clip,'fallen');
  // A wound that was not the killing blow (hit long before death) is undirected.
  assert.ok(Object.values(DEATHS).includes(deathVariant(dead({hitAt:60,hitYaw:Math.PI}),FULL)));
});

test('a corpse plays its death clip from diedAt, holds the last frame, and fades in over FADE.death',()=>{
  const live=soldier({id:'de_east_2',hitAt:100,hitYaw:Math.PI,diedAt:-1e9});
  const corpse={...live,alive:false,diedAt:100,deathYaw:0};
  let prev=null,dead=null;
  for(let t=99;t<104;t+=1/60){
    const a=t<100?live:corpse,cand=pick(a,t),r=resolveAnimation({actor:a,time:t,candidate:cand,prev,alt:null});prev=r.state;
    if(t>=100&&!dead)dead=cand;
    assert.ok(Math.abs(r.blend.reduce((s,b)=>s+b.weight,0)-1)<1e-9);
  }
  assert.ok(Object.values(DEATHS).includes(dead.clip)&&dead.kind==='death');
  const end=resolveAnimation({actor:corpse,time:104,candidate:pick(corpse,104),prev,alt:null});
  assert.equal(end.clip,dead.clip);assert.ok(Math.abs(end.time-INFO[dead.clip].duration)<1e-9,'holds the final lying frame');
  assert.equal(fadeDuration('standing_idle','death_front'),FADE.death);
  assert.equal(pick({...corpse,id:'de_east_2'},100.5,LEGACY).clip,'fallen');
});

// ================================ fades ================================
test('cross-fade lengths: slow between idle variants, short in and out of fidgets and posture transitions, none for exact clips',()=>{
  assert.equal(fadeDuration('standing_idle','standing_idle_b'),FADE.variant);
  assert.equal(fadeDuration('crouched_idle','cover_low_idle'),FADE.variant);
  assert.equal(fadeDuration('standing_idle','fidget_look'),FADE.toFidget);assert.equal(fadeDuration('fidget_shift','standing_idle_c'),FADE.fromFidget);
  assert.equal(fadeDuration('standing_idle','stand_to_crouch'),FADE.toTransition);assert.equal(fadeDuration('stand_to_crouch','crouched_idle'),FADE.fromTransition);
  assert.equal(fadeDuration('standing_idle','crouched_idle'),FADE.posture,'a posture change without the authored transition is unchanged');
  assert.equal(fadeDuration('mg34_prone_idle','death_back'),FADE.death,'death still fades in, whatever the clip');
  assert.equal(fadeDuration('mg34_prone_idle','standing_idle'),0);
});

test('one-shots keep playing through their own cross-fade (age driven), loops keep their rate',()=>{
  for(const clip of [...FIDGETS,'hit_left','hit_back','blast_duck','stand_to_crouch','crouch_to_stand','prone_flinch'])
    assert.equal(refineCandidate({clip,time:.2,loop:false},{actor:soldier(),pose:actorPose(soldier(),1),time:1,offset:0,clips:FULL}).rate,1,clip);
  const idle=pick(soldier(),77);assert.equal(idle.rate,varietyOf('pl_east_3').rate);
});

test('the previous behaviour is one switch away: variety:false keeps time+offset, rate 1 and the single idle / fallen',()=>{
  const a=soldier(),raw={clip:'standing_idle',time:100+OFFSET,loop:true};
  const c=refineCandidate(raw,{actor:a,pose:actorPose(a,100),time:100,offset:OFFSET,clips:FULL,variety:false});
  assert.equal(c.clip,'standing_idle');assert.equal(c.time,100+OFFSET);assert.equal(c.rate,1);
  const d={...a,alive:false,diedAt:90};
  assert.equal(refineCandidate({clip:'fallen',time:1.4,loop:false},{actor:d,pose:actorPose(d,100),time:100,offset:0,clips:FULL,variety:false}).clip,'fallen');
  const m={...a,motion:{speed:1.1,odometer:5,gait:'walk',gaitSince:1}};
  assert.equal(locomotionSample('walk',INFO.walk,m,10,OFFSET).time,((5/(1.1*1)+OFFSET/4)%1+1)%1*1);
});

// ================================ state coverage and determinism at the M01Characters level ================================
const NAMES=Object.keys(INFO);
function rig(){
  const root=new THREE.Group();root.name='m01_soldier_pl';root.userData={sockets:{muzzle:[0,.032,-.765]},weapons:{wz29:{muzzle:[0,.032,-.765]}}};
  const bone=new THREE.Bone();bone.name='root';root.add(bone);const hips=new THREE.Bone();hips.name='hips';bone.add(hips);
  for(const name of ['weapon','carry_socket','foot_l','foot_r']){const b=new THREE.Bone();b.name=name;hips.add(b);}
  return root;
}
function clipFor(name,i){
  const d=INFO[name].duration,q=a=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a);
  const a=q(i*.07),b=q(i*.07+.3);
  const clip=new THREE.AnimationClip(name,d,[new THREE.VectorKeyframeTrack('hips.position',[0,d],[0,.5+i*.01,0,1,.5+i*.01,0]),
    new THREE.QuaternionKeyframeTrack('hips.quaternion',[0,d],[a.x,a.y,a.z,a.w,b.x,b.y,b.z,b.w])]);
  clip.userData={...(INFO[name].speed_mps?{speed_mps:INFO[name].speed_mps}:{}),...(INFO[name].cycle_distance_m?{cycle_distance_m:INFO[name].cycle_distance_m}:{})};return clip;
}
function characters(names=NAMES){
  const c=new M01Characters(new THREE.Scene(),{visualVariation:false});
  for(const lod of [1,2])c.sources.set(`pl:${lod}`,{scene:rig(),animations:[]});
  names.forEach((n,i)=>c.clips.set(n,clipFor(n,i)));return c;
}
const near={x:4,z:0};
const stats=(c,id)=>c.stats.actors.find(a=>a.id===id);
const matrices=(c,id)=>{const out=[];c.instances.get(id).root.traverse(n=>out.push(...n.matrixWorld.elements));return out;};

test('M01Characters: every state maps to the intended clip, at distinct phases for neighbouring ids',()=>{
  const c=characters();
  try{
    const mk=(id,extra={})=>soldier({id,x:4,z:Number(id.slice(-1)),...extra});
    const cases=[
      ['idle standing',{},STAND_IDLES],['idle kneeling',{crouched:true,posture:'crouch'},CROUCH_IDLES],
      ['aiming',{role:'RIFLEMAN',state:'SUPPRESS',shot:.1,firedAt:299.9},['fire_bolt']],
      ['pinned',{team:'ally',suppressedUntil:400},['pinned']],
      ['hit from the left',{hitAt:299.9,hitYaw:-Math.PI/2},['hit_left']],['hit from behind',{hitAt:299.9,hitYaw:Math.PI},['hit_back']],
      ['kneeling down',{crouched:true,posture:'crouch',postureSince:299.9},['stand_to_crouch','crouched_idle','crouched_idle_b']],
      ['dead from behind',{alive:false,diedAt:299,hitAt:299,hitYaw:Math.PI,deathYaw:0},Object.values(DEATHS)],
      ['prone, shot at',{posture:'prone',suppressedAt:299.9,suppressedUntil:302},['prone_flinch','pinned']]];
    for(const [label,extra,allowed] of cases){
      const actors=Array.from({length:6},(_,i)=>mk(`pl_east_${i}`,extra));c.update(actors,300,near);
      const clips=actors.map(a=>stats(c,a.id)?.clip);
      assert.ok(clips.every(n=>allowed.includes(n)),`${label}: ${clips}`);
    }
    // The same six men at the same instant: the idle clip times are spread, and every rate differs.
    const actors=Array.from({length:6},(_,i)=>mk(`pl_east_${i}`));c.update(actors,320,near);
    const times=actors.map(a=>stats(c,a.id)).filter(s=>s.clip==='standing_idle').map(s=>s.clipTime);
    if(times.length>1)assert.equal(new Set(times.map(t=>t.toFixed(3))).size,times.length);
  }finally{c.dispose();}
});

test('M01Characters: a fresh renderer rebuilds the exact pose of one that lived through the variety (restore-safe, pause-stable)',()=>{
  const actors=()=>Array.from({length:5},(_,i)=>soldier({id:`de_east_${i+2}`,x:4,z:i*1.5}));
  const live=characters();
  try{
    let t=100;for(let i=0;i<900;i++){t=100+i/30;live.update(actors(),t,near);}
    const a=actors();live.update(a,t,near);const A=a.map(x=>matrices(live,x.id));
    live.update(a,t,near);for(let i=0;i<a.length;i++)assert.deepEqual(matrices(live,a[i].id),A[i],'pause: repeated sim time is bit-identical');
    const fresh=characters();
    try{
      fresh.update(actors(),t,near);
      a.forEach((x,i)=>{
        assert.equal(stats(fresh,x.id).clip,stats(live,x.id).clip,`${x.id} clip`);
        assert.ok(Math.abs(stats(fresh,x.id).clipTime-stats(live,x.id).clipTime)<1e-9,`${x.id} clip time`);
      });
    }finally{fresh.dispose();}
  }finally{live.dispose();}
});

test('M01Characters.load() registers the T08 clip library under its own key, and a missing library degrades to the single-clip behaviour',async()=>{
  const c=new M01Characters(new THREE.Scene(),{visualVariation:false}),loaded=[];
  c.assets.load=async(key,path)=>{loaded.push({key,path});return {animations:key==='m01-clip-library'?['standing_idle_b','death_front'].map(n=>new THREE.AnimationClip(n,1,[])):[]};};
  c.loadSource=async()=>{};c.loadCKM=async()=>{};c.loadMG=async()=>{};
  await c.load('low');
  assert.ok(loaded.some(x=>x.key==='m01-clip-library'&&x.path.endsWith('/clip-library-v2/m01_soldier_clip_library_v2.glb')));
  assert.ok(c.clips.has('standing_idle_b')&&c.clips.has('death_front'));
  const failing=new M01Characters(new THREE.Scene(),{visualVariation:false});
  failing.assets.load=async key=>{if(key==='m01-clip-library')throw new Error('404');return {animations:[]};};
  failing.loadSource=async()=>{};failing.loadCKM=async()=>{};failing.loadMG=async()=>{};
  await failing.load('low');assert.equal(failing.clips.has('standing_idle_b'),false);
  c.dispose();failing.dispose();
});

// ================================ the shipped GLB really contains every name the variety layer can select ================================
test('every clip name the variety layer can pick exists in the shipped clip library or soldier packs, with the durations it assumes',()=>{
  const dir='assets/models/provisional/m01/characters/';
  const glb=file=>{const buf=readFileSync(new URL(`../${dir}${file}`,import.meta.url)),len=buf.readUInt32LE(12);return JSON.parse(buf.subarray(20,20+len).toString('utf8'));};
  const lib=glb('clip-library-v2/m01_soldier_clip_library_v2.glb'),base=glb('m01_soldier_animations.glb');
  const names=new Set([...lib.animations,...base.animations].map(a=>a.name));
  const manifest=JSON.parse(readFileSync(new URL(`../${dir}clip-library-v2/manifest.json`,import.meta.url),'utf8'));
  const duration=Object.fromEntries(manifest.clips.map(c=>[c.name,c.durationS]));
  const used=[...STAND_IDLES,...CROUCH_IDLES,...FIDGETS,...Object.values(DEATHS),...Object.values(HITS),...Object.values(POSTURE_TRANSITIONS),
    'blast_duck','near_miss_duck','prone_flinch','prone_idle','seated','seated_b'];
  for(const n of used)assert.ok(names.has(n),`${n} is not in the shipped GLBs`);
  for(const n of used.filter(n=>lib.animations.some(a=>a.name===n)&&INFO[n]))assert.ok(Math.abs(duration[n]-INFO[n].duration)<1e-6,`${n}: ${duration[n]} vs ${INFO[n].duration}`);
  // The four names shared with the motion/crews packs are byte-identical there (manifest), so loading both is order independent.
  for(const n of manifest.integration.overlap_with_motion_clips_v1)assert.ok(names.has(n));
});

test('the variety module is pure: no RNG, wall clock, THREE or mixer-wide stop, and it never imports the resolver (no cycle)',()=>{
  const code=readFileSync(new URL('../src/render/m01-animation-variety.js',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');
  for(const banned of [/Math\.random/,/performance\.now/,/\bDate\b/,/requestAnimationFrame/,/setTimeout|setInterval/,/crypto/,/stopAllAction/,/from\s+['"]three/,/m01-animation-resolver/])assert.ok(!banned.test(code),String(banned));
});

test('foot IK leaves the non-ground library clips alone (seated, death) and still plants the feet in standing idles, fidgets and transitions',()=>{
  const live={active:true,alive:true,state:'GUARD',posture:'stand'};
  for(const n of ['seated_b',...Object.values(DEATHS),'prone_flinch'])assert.equal(isFootIkEligible(live,n),false,n);
  for(const n of [...STAND_IDLES,...CROUCH_IDLES,...FIDGETS,...Object.values(HITS),...Object.values(POSTURE_TRANSITIONS)])assert.equal(isFootIkEligible(live,n),true,n);
});
