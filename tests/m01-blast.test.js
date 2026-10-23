import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {BOMB_BLAST,BOMB_REACH_M,CONCUSSION,SAFE_IMPACT_M,SHIFTED_IMPACT_M,blastJitter,blastProtection,castIds,blastPosture,blastTarget,sightPoint,blastOutcome,
  concussionPeak,concussionSeconds,concussionLevel,mergeConcussion,earlyRaidPoint} from '../src/game/m01-blast.js';

// R1-a (2026-10-23): the pure part of what a bomb does to a man. Gameplay values, not ballistics: the tests pin the SHAPE (rings, cover, posture, protection, determinism) and the documented numbers.

const open=(distance,extra={})=>blastOutcome({distance,covered:false,posture:'stand',u:.5,...extra});

test('the rings: a lethal core, a wounding ring and a suppression ring in the open, nothing beyond',()=>{
  assert.deepEqual([BOMB_BLAST.lethalM,BOMB_BLAST.woundM,BOMB_BLAST.shakenM],[12,24,50],'the documented gameplay radii of a ~250 kg bomb');
  assert.equal(open(0).outcome,'kill');assert.equal(open(12).outcome,'kill');assert.equal(open(12.01).outcome,'wound');
  assert.equal(open(24).outcome,'wound');assert.equal(open(24.01).outcome,'suppress');assert.equal(open(50).outcome,'suppress');assert.equal(open(50.01).outcome,'none');
  assert.equal(open(200).outcome,'none');assert.equal(open(200).suppressSec,0);assert.equal(open(200).healthLoss,0);
});

test('severity never grows with distance; the shake and the wound shrink outward; the wound never reaches zero health',()=>{
  const rank={kill:3,wound:2,suppress:1,none:0};let previous=Infinity,sec=Infinity,loss=Infinity;
  for(let d=0;d<=80;d+=.25){
    const r=open(d);assert.ok(rank[r.outcome]<=previous,`outcome at ${d} m`);previous=rank[r.outcome];
    if(r.outcome==='suppress'){assert.ok(r.suppressSec<=sec+1e-12,`shake at ${d} m`);sec=r.suppressSec;assert.ok(r.suppressSec>=BOMB_BLAST.suppressSec[0]-1e-12&&r.suppressSec<=BOMB_BLAST.suppressSec[1]);}
    if(r.outcome==='wound'){assert.ok(r.healthLoss<=loss+1e-12,`wound at ${d} m`);loss=r.healthLoss;assert.ok(r.healthLoss>=BOMB_BLAST.woundLoss[1]-1e-12&&r.healthLoss<=BOMB_BLAST.woundLoss[0]+1e-12&&r.healthLoss<100);}
    if(r.outcome==='kill'||r.outcome==='wound')assert.equal(r.suppressSec,BOMB_BLAST.suppressSec[1],'a man in the core is shaken the longest if he lives');
  }
  assert.ok(Math.abs(open(12.01).healthLoss-BOMB_BLAST.woundLoss[0])<.1&&Math.abs(open(24).healthLoss-BOMB_BLAST.woundLoss[1])<1e-9);
});

test('cover matters: no line of sight from the blast to the chest pushes a man out by the cover factor',()=>{
  const B=BOMB_BLAST;
  assert.equal(open(10).outcome,'kill');assert.equal(open(10,{covered:true}).outcome,'wound','behind a bank at 10 m (10 x 1.8 = 18) he is hurt, not killed');
  assert.equal(open(B.lethalM/B.coverMul,{covered:true}).outcome,'kill');assert.equal(open(B.lethalM/B.coverMul+.01,{covered:true}).outcome,'wound');
  assert.equal(open(B.woundM/B.coverMul,{covered:true}).outcome,'wound');assert.equal(open(B.woundM/B.coverMul+.01,{covered:true}).outcome,'suppress');
  assert.equal(open(B.shakenM/B.coverMul,{covered:true}).outcome,'suppress');assert.equal(open(B.shakenM/B.coverMul+.01,{covered:true}).outcome,'none');
  assert.equal(open(40).outcome,'suppress');assert.equal(open(40,{covered:true}).outcome,'none','40 m behind cover is outside the shaken ring (40 x 1.8 = 72)');
  // never worse for the covered man than for the exposed one, at any distance
  const rank={kill:3,wound:2,suppress:1,none:0};
  for(let d=0;d<=80;d+=.5)assert.ok(rank[open(d,{covered:true}).outcome]<=rank[open(d).outcome],`${d} m`);
});

test('posture matters: crouching and lying down shelter a man, lying the most',()=>{
  const d=10;
  assert.equal(open(d,{posture:'stand'}).outcome,'kill');
  assert.equal(open(d,{posture:'crouch'}).outcome,'wound','10 m x 1.25 = 12.5');
  assert.equal(open(d,{posture:'prone'}).outcome,'wound','10 m x 1.6 = 16');
  assert.equal(open(7,{posture:'prone'}).outcome,'kill');assert.equal(open(8,{posture:'prone'}).outcome,'wound');
  // cover and posture multiply: lying behind a bank at 18 m is outside the wounding ring (18 x 1.8 x 1.6 = 51.8)
  assert.equal(open(18,{posture:'prone',covered:true}).outcome,'none');
  assert.equal(open(18).outcome,'wound');
  // an unknown posture is a standing man
  assert.equal(open(10,{posture:'dancing'}).outcome,'kill');
});

test('the jitter moves the edges by at most +-12 % and only through the (man, impact) pair',()=>{
  const B=BOMB_BLAST;
  assert.equal(blastOutcome({distance:12.5,covered:false,posture:'stand',u:0}).outcome,'kill','the unluckiest man: 12.5 x .88 = 11');
  assert.equal(blastOutcome({distance:12.5,covered:false,posture:'stand',u:1}).outcome,'wound','the luckiest: 12.5 x 1.12 = 14');
  assert.ok(Math.abs(blastOutcome({distance:10,covered:false,posture:'stand',u:0}).effective-10*(1-B.jitter))<1e-12);
  assert.ok(Math.abs(blastOutcome({distance:10,covered:false,posture:'stand',u:1}).effective-10*(1+B.jitter))<1e-12);
  assert.equal(blastJitter('yard_aid','raid_0434_7'),blastJitter('yard_aid','raid_0434_7'));
  assert.notEqual(blastJitter('yard_aid','raid_0434_7'),blastJitter('yard_aid','raid_0434_8'));
  assert.notEqual(blastJitter('yard_aid','raid_0434_7'),blastJitter('yard_orderly','raid_0434_7'));
  for(const [a,b] of [['x','y'],['marek_zielinski','station_bomb'],['de_east_13','raid_0530'],['','']]){const u=blastJitter(a,b);assert.ok(u>=0&&u<1);}
  // The FNV-1a of the pair is the same on every machine: two pinned values guard it (the ids are the mission's own).
  assert.equal(blastJitter('yard_railway_1','station_bomb'),1094651006/4294967296);
  assert.equal(blastJitter('yard_aid','raid_0434_7'),909262076/4294967296);
});

test('the reach covers every man the bomb can affect: nobody beyond it is ever touched, whatever the jitter, posture or cover',()=>{
  assert.equal(BOMB_REACH_M,Math.ceil(BOMB_BLAST.shakenM/(1-BOMB_BLAST.jitter)));
  for(const posture of ['stand','crouch','prone'])for(const covered of [false,true])for(const u of [0,.25,.5,.75,.999])
    assert.equal(blastOutcome({distance:BOMB_REACH_M+.01,covered,posture,u}).outcome,'none',`${posture} ${covered} ${u}`);
  assert.equal(blastOutcome({distance:BOMB_REACH_M-1,covered:false,posture:'stand',u:0}).outcome,'suppress','and the luckless man inside it is shaken');
});

test('protected men are only ever shaken, at the strongest, where a man in the open would die or be wounded',()=>{
  const cast=castIds(definition);
  for(const distance of [0,1,5,12,20,24,30,49]){
    const p=blastOutcome({distance,covered:false,posture:'stand',protectedBy:'cast',u:.5}),g=open(distance);
    assert.equal(p.healthLoss,0);assert.ok(['suppress','none'].includes(p.outcome),`${distance} m`);
    if(g.outcome==='kill'||g.outcome==='wound'){assert.equal(p.outcome,'suppress');assert.equal(p.suppressSec,BOMB_BLAST.suppressSec[1]);}
    else assert.equal(p.outcome,g.outcome);
  }
  assert.ok(cast.size>=15&&cast.has('szymon_kowal')&&cast.has('ckm_gunner'));
});

test('who is protected is derived from the mission cast and from its groups, never guessed',()=>{
  const cast=castIds(definition);
  assert.deepEqual([...cast].sort(),definition.cast.map(c=>c.id).sort());
  // every one of the cast the script, the objectives, the cutscenes, the B4 rule, the squad's bounds and the repair need
  for(const id of ['marek_zielinski','pawel_krawiec','tadeusz_nowicki','szymon_kowal','jozef_bak','leon_dudek','staszek_pawlak','franciszek_lipski','sapper_2','sapper_3','east_platoon_voice','generic_rifleman','ckm_gunner','ckm_loader','ckm_reserve'])
    assert.equal(blastProtection({id},cast),'cast',id);
  assert.equal(blastProtection({id:'pl_east_3',group:'grp_east_platoon'},cast),'platoon','the survivors of the east platoon are counted by id');
  assert.equal(blastProtection({id:'x',group:'grp_ckm_crew'},cast),'ckm');
  assert.equal(blastProtection({id:'de_east_0',weapon:'mg34'},cast),'mg34');assert.equal(blastProtection({id:'de_east_1',weapon:'mg34'},cast),'mg34');
  assert.equal(blastProtection({id:'a',carriedBy:'leon_dudek'},cast),'carried');assert.equal(blastProtection({id:'a',carry:{phase:'carry'}},cast),'carried');
  assert.equal(blastProtection({id:'yard_patient',task:'yard_patient'},cast),'scenery');assert.equal(blastProtection({id:'yard_cart',task:'cart'},cast),'scenery');
  // and who may become a casualty: the rest of the station yard, a German of the gates, a man of the spans
  for(const a of [{id:'yard_railway_0',group:'grp_station_yard',task:'watch_bridge'},{id:'yard_railway_1',group:'grp_station_yard'},{id:'yard_orderly',group:'grp_station_yard',task:'coffee'},
    {id:'yard_aid',group:'grp_station_yard',task:'clean_weapon'},{id:'de_east_5',group:'grp_de_east',weapon:'kar98k'},{id:'de_spans_2',group:'grp_de_spans'}])
    assert.equal(blastProtection(a,cast),null,a.id);
});

test('posture and target: a wounded man lies flat, the torso is where a shot would be aimed',()=>{
  assert.equal(blastPosture({state:'WOUNDED'}),'prone');assert.equal(blastPosture({posture:'prone'}),'prone');assert.equal(blastPosture({posture:'crouch'}),'crouch');
  assert.equal(blastPosture({crouched:true}),'crouch','the player has no posture field');assert.equal(blastPosture({posture:'stand'}),'stand');assert.equal(blastPosture({}),'stand');
  assert.deepEqual(blastTarget({x:1,y:-3,z:2}),{x:1,y:-1.9,z:2});assert.deepEqual(blastTarget({x:1,y:-3,z:2,crouched:true}),{x:1,y:-2.25,z:2});
  assert.deepEqual(blastTarget({x:1,y:-3,z:2,state:'WOUNDED',posture:'stand'}),{x:1,y:-2.7,z:2});
  assert.deepEqual(sightPoint({x:1,y:2,z:3}),{space:'metres',x:1,y:2,z:3,eyeHeight:0});
});

test('concussion: full at the nearest a bomb can fall, none at 60 m, softened by cover and a crouch, never above 1',()=>{
  assert.equal(CONCUSSION.fullM,SAFE_IMPACT_M,'the strongest stun is the one at the safeImpact distance');
  assert.equal(concussionPeak({distance:30}),1);assert.equal(concussionPeak({distance:10}),1);assert.equal(concussionPeak({distance:60}),0);assert.equal(concussionPeak({distance:300}),0);
  assert.ok(Math.abs(concussionPeak({distance:45})-.5)<1e-12);
  assert.ok(Math.abs(concussionPeak({distance:40,covered:true})-(60-40*1.35)/30)<1e-12,'a bank takes a quarter off the distance');
  assert.ok(concussionPeak({distance:40,covered:true})<concussionPeak({distance:40}));
  assert.ok(concussionPeak({distance:40,crouched:true})<concussionPeak({distance:40}));
  assert.equal(concussionPeak({distance:44.5,covered:true}),0,'the crest of the rail embankment turns a bomb beyond 44.4 m on the far side into a loud noise only');
  let previous=Infinity;for(let d=0;d<=100;d+=.5){const k=concussionPeak({distance:d});assert.ok(k<=previous&&k>=0&&k<=1);previous=k;}
});

test('concussion level: the saved peak falls linearly to zero at concussedUntil; nothing saved means nothing',()=>{
  assert.equal(concussionLevel({},10),0);assert.equal(concussionLevel({concussion:.8},10),0,'a peak without its end is nothing');
  assert.equal(concussionSeconds(0),CONCUSSION.minSec);assert.equal(concussionSeconds(1),CONCUSSION.maxSec);assert.ok(Math.abs(concussionSeconds(.5)-4)<1e-12);
  const player={concussion:1,concussedUntil:10+CONCUSSION.maxSec};
  assert.equal(concussionLevel(player,10),1);assert.equal(concussionLevel(player,9),1,'before the blast the level is capped at the peak');
  assert.ok(Math.abs(concussionLevel(player,10+CONCUSSION.maxSec/2)-.5)<1e-12);assert.equal(concussionLevel(player,10+CONCUSSION.maxSec),0);assert.equal(concussionLevel(player,99),0);
});

test('merging a concussion: the strongest effect wins, they never add up and a weaker blast changes nothing',()=>{
  const player={};
  assert.equal(mergeConcussion(player,5,0),null);
  const first=mergeConcussion(player,5,.6);assert.deepEqual(first,{concussion:.6,concussedUntil:5+concussionSeconds(.6)});Object.assign(player,first);
  assert.equal(mergeConcussion(player,5.5,.3),null,'a weaker blast while he is still stunned');
  assert.equal(mergeConcussion(player,5.5,concussionLevel(player,5.5)),null,'the same strength does not extend it');
  const stronger=mergeConcussion(player,6,.9);assert.deepEqual(stronger,{concussion:.9,concussedUntil:6+concussionSeconds(.9)});
  Object.assign(player,stronger);assert.ok(player.concussedUntil-6<=CONCUSSION.maxSec);
  // once the stun is nearly over a modest new blast takes over
  const late=mergeConcussion(player,player.concussedUntil-.2,.3);assert.ok(late&&late.concussion===.3);
});

test('early raid placement: the planned point when the player is 30 m away, else 40 m from him on the first free bearing, never more than 70 m from the plan',()=>{
  const free=()=>true,planned={x:-100,z:30};
  assert.deepEqual(earlyRaidPoint(planned,{x:-100,z:0},free),{x:-100,z:30},'exactly 30 m: unchanged');
  const moved=earlyRaidPoint(planned,{x:-100,z:1},free);
  assert.ok(Math.abs(Math.hypot(moved.x+100,moved.z-1)-SHIFTED_IMPACT_M)<1e-9&&moved.z>1,'29 m: moved to 40 m from the player, further along the same bearing');
  assert.ok(Math.hypot(moved.x-planned.x,moved.z-planned.z)<=70);
  // a blocked place is skipped: the bearing turns away in steps of 30 degrees, positive first
  const blockedFirst=(x,z)=>Math.hypot(x-moved.x,z-moved.z)>1;
  const second=earlyRaidPoint(planned,{x:-100,z:1},blockedFirst);assert.notDeepEqual(second,moved);assert.ok(Math.abs(Math.hypot(second.x+100,second.z-1)-SHIFTED_IMPACT_M)<1e-9);
  assert.ok(Math.abs(Math.atan2(second.z-1,second.x+100)-Math.atan2(moved.z-1,moved.x+100)-Math.PI/6)<1e-9);
  assert.equal(earlyRaidPoint(planned,{x:-100,z:1},()=>false),null,'nowhere free: the caller keeps safeImpact');
  assert.equal(earlyRaidPoint(planned,{x:-100,z:60},()=>false),null,'a blocked planned point is not used either');
  // the player right on the plan: any bearing works and the result is deterministic
  assert.deepEqual(earlyRaidPoint(planned,{x:-100,z:30},free),earlyRaidPoint(planned,{x:-100,z:30},free));
  for(const player of [{x:-100,z:30},{x:-110,z:20},{x:-80,z:45}]){const p=earlyRaidPoint(planned,player,free);assert.ok(Math.hypot(p.x-player.x,p.z-player.z)>=SAFE_IMPACT_M&&Math.hypot(p.x-planned.x,p.z-planned.z)<=70.000001);}
});
