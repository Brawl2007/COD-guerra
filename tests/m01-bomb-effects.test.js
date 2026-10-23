import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,seconds,clockText,validateM01Snapshot,earlyRaidPlan} from '../src/game/m01-simulation.js';
import {BOMB_BLAST,CONCUSSION,castIds,concussionPeak,concussionSeconds,sightPoint,blastTarget} from '../src/game/m01-blast.js';
import {YARD_IDS} from '../src/game/m01-yard-life.js';
import {validateM01AudioEvent} from '../src/game/m01-audio-events.js';
import {compareContinuation} from './helpers/m01-determinism.js';
import {driver,toRepair,route} from './helpers/m01-route.js';

// R1-a (2026-10-23, golden amendment 16): what an aerial bomb does to the men beside it, the 04:34 raid's schedule, the player's concussion, saves and the audio event.
// Casualties here are GAMEPLAY_DRAMATIZATION (no source gives Polish losses); nothing below is a count of real dead.

const E=n=>'evt_m01_'+n;
const N=definition.raidTargets0434.length;   // the impacts of the 04:34 raid's schedule
const active=(seed=17)=>{const s=new M01Simulation(seed);s.tick(.05,{skip:true});s.drainEvents();return s;};
const place=(s,a,x,z,extra={})=>{Object.assign(a,{x,z,active:true,...extra});a.y=s.world.heightAt(x,z);return a;};
const CRATER={x:-160,z:26};   // open ground along the x axis (the strip between the approaches): no cover between the crater and any man placed on z 26
const CAST=castIds(definition);
const blast=(s,at=CRATER,id='bomb_test')=>{s.drainEvents();const p=s.impact(id,{x:at.x,y:0,z:at.z},true);return {p,event:s.drainEvents().find(e=>e.type==='m01-blast')};};
const bombWindow=sim=>sim.battleClock>=seconds('04:33:59')&&sim.battleClock<seconds('04:44:30');   // (the event of 04:34:00 fires within 1e-6 s of its time)

test('a bomb kills the man at its crater, wounds the man beyond and shakes the next; the stretcher patient and the cart are only shaken',()=>{
  const s=active(),[rw0,rw1,orderly,patient,aid,cart]=YARD_IDS.map(id=>s.actor(id));
  place(s,rw0,CRATER.x-3,CRATER.z);place(s,rw1,CRATER.x+16,CRATER.z);place(s,orderly,CRATER.x-40,CRATER.z);place(s,aid,CRATER.x+70,CRATER.z);
  place(s,patient,CRATER.x+2,CRATER.z);place(s,cart,CRATER.x-2,CRATER.z);
  const before=Object.fromEntries([patient,cart,aid].map(a=>[a.id,{health:a.health,state:a.state}])),clock=s.clock;
  const {event}=blast(s);
  assert.equal(rw0.alive,false);assert.equal(rw0.state,'DOWN');assert.equal(rw0.health,0);assert.equal(rw0.diedAt,clock);assert.equal(rw0.hitAt,clock,'the body stays, with its stamps for the presentation');
  assert.equal(rw1.alive,true);assert.equal(rw1.state,'WOUNDED');assert.ok(rw1.health>=1&&rw1.health<=BOMB_BLAST.woundLoss[1]*0+100-BOMB_BLAST.woundLoss[1]+0.0001,`${rw1.health}`);
  assert.ok(rw1.health<100-BOMB_BLAST.woundLoss[1]+1e-9&&rw1.health>=100-BOMB_BLAST.woundLoss[0]-1e-9,'health fell by the wound of its distance');assert.equal(rw1.hitAt,clock);assert.equal(rw1.target,null);
  assert.equal(orderly.alive,true);assert.equal(orderly.health,100);assert.notEqual(orderly.state,'WOUNDED');assert.ok(orderly.suppressedUntil>clock&&orderly.suppressedUntil<=clock+BOMB_BLAST.suppressSec[1]+1e-9,'shaken, not hurt');
  assert.equal(orderly.suppressedAt,clock);
  assert.equal(aid.suppressedUntil,0,'beyond the reach nothing happens');assert.equal(aid.health,100);
  for(const a of [patient,cart]){assert.equal(a.alive,true);assert.equal(a.health,before[a.id].health);assert.equal(a.state,before[a.id].state,`${a.id}: scenery with a procedural layout is only shaken`);
    assert.equal(a.suppressedUntil,clock+BOMB_BLAST.suppressSec[1]);}
  assert.deepEqual(event.effects.killed,['yard_railway_0']);assert.deepEqual(event.effects.wounded,['yard_railway_1']);
  assert.deepEqual(event.effects.suppressed.sort(),['yard_cart','yard_orderly','yard_patient']);
  assert.equal(event.concussion,0,'the player is hundreds of metres away');validateM01AudioEvent(event);
  validateM01Snapshot(s.snapshot(),'a station yard with a dead and a wounded man is a valid save');
});

test('every member of the cast, the ckm crew and the east platoon is only shaken, even in the crater: nobody the plot needs is killed or wounded',()=>{
  const s=active();
  const named=s.actors.filter(a=>CAST.has(a.id)||a.group==='grp_ckm_crew'||a.group==='grp_east_platoon');
  assert.ok(named.length>=15+24);
  named.forEach((a,i)=>place(s,a,CRATER.x+(i%5)-2,CRATER.z+(i%3)-1,{carriedBy:null}));
  const before=named.map(a=>({id:a.id,health:a.health,state:a.state,alive:a.alive,carry:a.carry}));
  const clock=s.clock,{event}=blast(s);
  named.forEach((a,i)=>{
    assert.equal(a.alive,before[i].alive,a.id);assert.equal(a.health,before[i].health,a.id);assert.equal(a.state,before[i].state,a.id);
    assert.equal(a.suppressedUntil,clock+BOMB_BLAST.suppressSec[1],`${a.id} is shaken at the strongest`);
  });
  assert.deepEqual(event.effects.killed,[]);assert.deepEqual(event.effects.wounded,[]);assert.equal(event.effects.suppressed.length,named.length);
  const gates=s.actors.filter(a=>a.id==='de_east_0'||a.id==='de_east_1');
  gates.forEach(a=>place(s,a,CRATER.x+1,CRATER.z,{active:true}));blast(s,CRATER,'bomb_test_2');
  for(const a of gates){assert.equal(a.alive,true);assert.equal(a.health,100);}
});

test('everyone near the crater at the real places of the 04:34 raid: the cast is only shaken (the repair crater is among the sappers), the player is not touched',()=>{
  const s=active();s.battleClock=seconds('04:34:00');
  const sappers=['pawel_krawiec','sapper_2','sapper_3'].map(id=>s.actor(id));
  assert.ok(sappers.every(a=>Math.hypot(a.x+40,a.z-10)<10),'the sappers stand at the ignition cable, in the crater of the scripted bomb');
  const clock=s.clock;s.consume(E('bombing_0434'));s.drainEvents();s.consume(E('nowicki_lost'));
  for(const a of sappers){assert.equal(a.alive,true);assert.equal(a.health,100);assert.equal(a.state,'GUARD');assert.ok(a.suppressedUntil>=clock+BOMB_BLAST.suppressSec[1]-1e-9,`${a.id} hits the dirt`);}
  assert.equal(s.player.health,100);assert.equal(s.flags['m01.nowicki_status'],'missing');assert.equal(s.actor('tadeusz_nowicki').active,false,'the scripted loss is untouched');
});

test('cover matters: a man behind a wall at 9 m is hurt, the man at 9 m in the open dies',()=>{
  const s=active(),[rw0,rw1]=YARD_IDS.map(id=>s.actor(id));
  place(s,rw0,CRATER.x+9,CRATER.z);place(s,rw1,CRATER.x-9,CRATER.z);
  s.world.obstacles.push({id:'test_wall',min:{x:CRATER.x-4,y:-10,z:CRATER.z-10},max:{x:CRATER.x-3.5,y:20,z:CRATER.z+10},material:'stone'});
  blast(s);
  assert.equal(rw0.alive,false,'in the open: killed');assert.equal(rw1.alive,true,'behind the wall: alive');assert.equal(rw1.state,'WOUNDED','9 m x 1.8 is the wounding ring');
});

test('posture matters: a man lying flat at 10 m is wounded where a man standing at 10 m dies',()=>{
  const s=active(),[rw0,rw1,orderly]=YARD_IDS.map(id=>s.actor(id));
  place(s,rw0,CRATER.x+10,CRATER.z);place(s,rw1,CRATER.x-10,CRATER.z,{posture:'prone',postureProgress:1});place(s,orderly,CRATER.x,CRATER.z+0,{});orderly.x=CRATER.x-10;orderly.z=CRATER.z+.5;
  s.actor('yard_aid').active=false;
  blast(s);
  assert.equal(rw0.alive,false);assert.equal(rw1.alive,true);assert.equal(rw1.state,'WOUNDED');
});

test('the Germans are hit like men: a German is killed or shaken, and a wounded one is hit as by a round and goes on',()=>{
  const s=active(),dike=s.actor('de_east_20'),spans=s.actor('de_spans_3');
  place(s,dike,CRATER.x+4,CRATER.z);place(s,spans,CRATER.x-17,CRATER.z);dike.suppressedUntil=0;
  blast(s);
  assert.equal(dike.alive,false);assert.equal(dike.state,'DOWN');
  assert.equal(spans.alive,true);assert.equal(spans.state,'HIT_REACTION','a wounded German keeps the state of a man hit by a round');assert.ok(spans.health<100&&spans.health>=1);
});

test('the player is never damaged by a bomb, even in its crater, and is stunned by the near ones',()=>{
  const s=active(),p=s.player;
  Object.assign(p,{x:CRATER.x+31,z:CRATER.z,y:s.world.heightAt(CRATER.x+31,CRATER.z)});const clock=s.clock;
  const {event}=blast(s);
  assert.equal(p.health,100);assert.equal(p.alive,true);
  const k=concussionPeak({distance:Math.hypot(31,Math.abs(blastTarget(p).y-(s.world.heightAt(CRATER.x,CRATER.z)+BOMB_BLAST.sourceHeight)))});
  assert.ok(k>.9&&k<1,`${k}`);assert.equal(p.concussion,k);assert.equal(p.concussedUntil,clock+concussionSeconds(k));assert.equal(event.concussion,k);
  assert.equal(s.sectors.damage.at(-1).concussion,k,'the crater records it for the audio, also after a restore');assert.ok(s.concussion>0&&s.concussion<=k);
  // a bomb placed right on him by a test (the safety shift would never allow it): still no damage, full stun
  const t=active();t.drainEvents();const r=t.bombEffects('on_top',{x:t.player.x,y:t.player.y,z:t.player.z});
  assert.equal(t.player.health,100);assert.equal(t.player.alive,true);assert.equal(r.concussion,1);assert.deepEqual(r.casualties.killed,[]);
  // crouching and a wall soften it; the strongest effect wins and they do not add up
  const c=active();Object.assign(c.player,{x:CRATER.x+31,z:CRATER.z,y:-3,crouched:true});blast(c);assert.ok(c.player.concussion<k&&c.player.concussion>0);
  const w=active();Object.assign(w.player,{x:CRATER.x+31,z:CRATER.z,y:-3});w.world.obstacles.push({id:'test_wall',min:{x:CRATER.x+10,y:-10,z:CRATER.z-10},max:{x:CRATER.x+10.5,y:20,z:CRATER.z+10},material:'stone'});
  blast(w);assert.ok(w.player.concussion<k&&w.player.concussion>0);
  const until=p.concussedUntil;blast(s,{x:CRATER.x-10,z:CRATER.z+0},'second_bomb');   // 41 m from him: weaker than what he already has
  assert.equal(p.concussedUntil,until);assert.equal(p.concussion,k);
});

test('a stunned player loses speed and cannot sprint when badly stunned, aims less steadily, and returns to the shape he had when the stun ends',()=>{
  const plain=active(),stunned=active();
  Object.assign(stunned.player,{concussion:1,concussedUntil:stunned.clock+CONCUSSION.maxSec});
  const walk=(s,n)=>{const x0=s.player.x;for(let i=0;i<n;i++)s.tick(.05,{forward:1,sprint:true});return Math.abs(s.player.x-x0)+Math.abs(s.player.z-22);};
  for(const s of [plain,stunned])Object.assign(s.player,{angle:0});
  const a=walk(plain,10),b=walk(stunned,10);
  assert.ok(b<a*.75&&b>a*.3,`sprint ${a} against ${b}`);assert.equal(plain.player.sprinting,true);assert.equal(stunned.player.sprinting,false,'above sprintOffAt he cannot sprint');
  // the same two draws of the rifle, their deviation widened by 1 + aimSway x level
  const open=active(),shaken=active();for(const s of [open,shaken]){s.player.pitch=.5;s.player.aiming=true;}
  Object.assign(shaken.player,{concussion:.8,concussedUntil:shaken.clock+concussionSeconds(.8)});
  const shot=s=>{s.drainEvents();s.fire();const e=s.drainEvents().find(x=>x.type==='player-shot'),o=s.player;return Math.atan2(e.point.z-o.z,e.point.x-o.x)-o.angle;};
  const level=shaken.concussion,ratio=shot(shaken)/shot(open);
  assert.ok(Math.abs(ratio-(1+CONCUSSION.aimSway*level))<1e-6,`${ratio} against ${1+CONCUSSION.aimSway*level}`);
  assert.equal(open.rng.state,shaken.rng.state,'the same draws: a stun does not move the random stream');
  // it ends by the clock, and the player is exactly what he was before
  const end=active(),before=JSON.stringify(end.player);Object.assign(end.player,{concussion:.5,concussedUntil:end.clock+1});
  for(let i=0;i<30;i++)end.tick(.05);
  assert.equal(end.player.concussion,undefined);assert.equal(end.player.concussedUntil,undefined);assert.equal(end.concussion,0);
  assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(end.player))),Object.keys(JSON.parse(before)));
});

test('the 04:34 raid plan: eleven fixed-time impacts after the scripted three, in the playable area, clear of the objectives, deterministic',()=>{
  const plan=earlyRaidPlan();
  assert.equal(N,11);assert.equal(plan.length,N);assert.deepEqual(plan.map(t=>t.id),Array.from({length:N},(_,i)=>`raid_0434_${i+1}`));
  assert.ok(plan[0].at>seconds('04:34:20')&&plan.at(-1).at<seconds('04:44:00'),'inside the raid of 04:34-04:44');
  for(let i=1;i<plan.length;i++)assert.ok(plan[i].at>plan[i-1].at);
  const world=new M01Simulation(1).world,b=world.layout.bounds.playable;
  for(const t of plan){
    assert.ok(t.point.x>=b.minX+10&&t.point.x<=b.maxX&&t.point.z>=b.minZ+10&&t.point.z<=b.maxZ-10,t.id);assert.equal(t.point.y,world.heightAt(t.point.x,t.point.z));
    for(const id of ['repair_site_2','rally_point','rail_hut','firing_point','shelter','aid_position','squad_post'])assert.ok(Math.hypot(t.point.x-world.point(id).x,t.point.z-world.point(id).z)>=20,`${t.id} keeps clear of ${id}`);
  }
  for(const t of definition.raidTargets0434)assert.equal(t.certainty,'GAMEPLAY_DRAMATIZATION');
  // a typo in the data stops the game
  const bad=mutate=>{const d=JSON.parse(JSON.stringify(definition));mutate(d);return ()=>earlyRaidPlan(d);};
  assert.throws(bad(d=>{d.raidTargets0434[2].id='raid_0434_9';}),/IDs\/times/);assert.throws(bad(d=>{d.raidTargets0434[1].at='04:34:30';d.raidTargets0434[0].at='04:34:40';}),/IDs\/times/);
  assert.throws(bad(d=>{d.raidTargets0434[0].at='04:34:10';}),/IDs\/times/);assert.throws(bad(d=>{d.raidTargets0434.at(-1).at='04:44:00';}),/IDs\/times/);
  assert.throws(bad(d=>{d.raidTargets0434[0].position=[0,0,0];}),/position/);assert.throws(bad(d=>{d.raidTargets0434[0].position=[-900,20];}),/outside the playable area/);
  assert.throws(bad(d=>{d.raidTargets0434[0].position=[-118,12];}),/too close to an objective/);assert.throws(bad(d=>{d.raidTargets0434[0].certainty='DOCUMENTED';}),/certainty/);
  assert.throws(bad(d=>{d.raidTargets0434.length=5;}),/6 to 12/);assert.throws(bad(d=>{delete d.raidTargets0434;}),/6 to 12/);
});

test('the raid schedule is created by the 04:34 event, emits each impact once at its time, 30 m or more from the player, grounded, without drawing a random number',()=>{
  const s=active();s.battleClock=seconds('04:34:00');const rng=s.rng.state;
  assert.equal(s.timers.raidSchedule0434,undefined,'nothing before the event');
  s.consume(E('bombing_0434'));const schedule=s.timers.raidSchedule0434,plan=earlyRaidPlan();
  assert.equal(schedule.length,N);assert.ok(schedule.every(t=>!t.emitted),'the first impact is after 04:34:20');assert.deepEqual(schedule.map(t=>t.at),plan.map(t=>t.at));
  Object.assign(s.player,{x:-300,z:40,y:s.world.heightAt(-300,40)});
  for(const t of schedule){
    s.battleClock=t.at-.001;s.updateEarlyRaid();assert.equal(s.sectors.damage.filter(d=>d.id===t.id).length,0,`${t.id} is not early`);
    s.battleClock=t.at;s.updateEarlyRaid();s.updateEarlyRaid();   // twice: once
    const hits=s.sectors.damage.filter(d=>d.id===t.id);assert.equal(hits.length,1);const d=hits[0];
    assert.equal(t.emitted,true);assert.equal(d.y,s.world.heightAt(d.x,d.z));assert.ok(Math.hypot(d.x-s.player.x,d.z-s.player.z)>=30);
    assert.ok(Math.hypot(d.x-t.point.x,d.z-t.point.z)<1e-9,'the emitted point is kept in the schedule');
    assert.equal(typeof d.concussion,'number');
  }
  assert.equal(s.rng.state,rng,'no draw from the combat stream');
  validateM01Snapshot(s.snapshot());
  const again=active();again.battleClock=seconds('04:34:00');again.consume(E('bombing_0434'));Object.assign(again.player,{x:-300,z:40,y:again.world.heightAt(-300,40)});
  for(const t of again.timers.raidSchedule0434){again.battleClock=t.at;again.updateEarlyRaid();}
  assert.deepEqual(again.sectors.damage,s.sectors.damage,'deterministic');
});

test('an impact the player stands next to is moved 40 m from him and never onto an objective, the river or a building',()=>{
  const free=(s,x,z)=>s.earlyRaidFree(x,z);
  for(const [i,plan] of earlyRaidPlan().entries()){
    const s=active();s.battleClock=seconds('04:34:00');s.consume(E('bombing_0434'));
    // the player right at the planned point, and 12 m from it: the safety shift
    for(const [dx,dz] of [[0,0],[12,0],[0,-12],[-9,9]]){
      const t=s.timers.raidSchedule0434[i];t.emitted=false;t.point={...plan.point};s.sectors.damage=s.sectors.damage.filter(d=>d.id!==t.id);
      Object.assign(s.player,{x:plan.point.x+dx,z:plan.point.z+dz,y:s.world.heightAt(plan.point.x+dx,plan.point.z+dz)});
      s.battleClock=t.at;s.updateEarlyRaid();
      const d=s.sectors.damage.find(d=>d.id===t.id);
      assert.ok(Math.hypot(d.x-s.player.x,d.z-s.player.z)>=30,`${t.id} (${dx},${dz})`);assert.ok(Math.hypot(d.x-plan.point.x,d.z-plan.point.z)<=70.000001);
      assert.equal(free(s,d.x,d.z),true,`${t.id} (${dx},${dz}) fell on a free place`);
    }
  }
});

test('legacy saves: a save made after the 04:34 event without the schedule loads and invents no retroactive impact; one made before it gets the whole raid',()=>{
  const s=active();s.battleClock=seconds('04:34:00');s.consume(E('bombing_0434'));s.battleClock=seconds('04:36:00');s.updateEarlyRaid();
  assert.ok(s.timers.raidSchedule0434.some(t=>t.emitted)&&s.timers.raidSchedule0434.some(t=>!t.emitted));
  const legacy=s.snapshot();delete legacy.timers.raidSchedule0434;legacy.sectors.damage=legacy.sectors.damage.filter(d=>!/^raid_0434_/.test(d.id));
  for(const d of legacy.sectors.damage)delete d.concussion;delete legacy.player.concussion;delete legacy.player.concussedUntil;
  validateM01Snapshot(legacy);
  const old=new M01Simulation(1);old.restoreSnapshot(legacy);old.drainEvents();assert.equal(old.timers.raidSchedule0434,undefined);
  const before=old.sectors.damage.map(d=>d.id);
  for(let i=0;i<400;i++){old.battleClock=Math.min(seconds('04:46:00'),old.battleClock+3);old.tick(.05);}
  assert.equal(old.sectors.damage.filter(d=>/^raid_0434_/.test(d.id)).length,0,'no retroactive impact');assert.equal(old.timers.raidSchedule0434,undefined);
  assert.deepEqual(old.sectors.damage.map(d=>d.id).filter(id=>!before.includes(id)),['forward_post','repair_crater'],'the older save plays on with the scripted bombs of its own event and nothing else');
  // a save from before the event: the event creates the schedule as in a new game
  const early=active(),save=early.snapshot();const fresh=new M01Simulation(1);fresh.restoreSnapshot(save);fresh.battleClock=seconds('04:34:00');fresh.consume(E('bombing_0434'));
  assert.equal(fresh.timers.raidSchedule0434.length,N);
});

test('the validator accepts the schedule and the stun mid-raid and refuses what the machine could not have made',()=>{
  const s=active();s.battleClock=seconds('04:34:00');s.consume(E('bombing_0434'));Object.assign(s.player,{x:-100,z:12,y:s.world.heightAt(-100,12)});
  for(const t of s.timers.raidSchedule0434.slice(0,3)){s.battleClock=t.at;s.updateEarlyRaid();}
  const good=s.snapshot();validateM01Snapshot(good);assert.ok(good.timers.raidSchedule0434.filter(t=>t.emitted).length===3);
  const reject=(mutate,pattern,label)=>{const x=JSON.parse(JSON.stringify(good));mutate(x);assert.throws(()=>validateM01Snapshot(x),pattern,label);
    const probe=new M01Simulation(2);const before=JSON.stringify(probe.snapshot());assert.throws(()=>probe.restoreSnapshot(x),pattern,label);assert.equal(JSON.stringify(probe.snapshot()),before,`${label}: a refused save changes nothing`);};
  reject(x=>{x.timers.raidSchedule0434[0].id='raid_0434_2';},/raid target 0434/,'id');
  reject(x=>{x.timers.raidSchedule0434[0].at+=1;},/raid target 0434/,'time');
  reject(x=>{x.timers.raidSchedule0434.pop();},/raid schedule 0434/,'length');
  reject(x=>{x.timers.raidSchedule0434[5].emitted=true;},/raid target 0434/,'emitted before its time (and without a crater)');
  reject(x=>{x.timers.raidSchedule0434[0].point.x+=100;},/raid target 0434/,'moved off the plan beyond the safety shift');
  reject(x=>{x.timers.raidSchedule0434[0].point.y+=1;},/raid target 0434/,'not on the ground');
  reject(x=>{x.timers.raidSchedule0434[0].extra=1;},/raid target 0434/,'unknown key');
  reject(x=>{x.sectors.damage=x.sectors.damage.filter(d=>d.id!=='raid_0434_1');},/raid target 0434/,'an emitted impact without its crater');
  reject(x=>{x.sectors.damage.push({...x.sectors.damage.at(-1),id:'raid_0434_8'});},/raid target 0434|raid damage 0434/,'a crater of an impact not emitted');
  reject(x=>{x.sectors.damage.push({...x.sectors.damage.at(-1),id:'raid_0434_77'});},/raid damage 0434/,'a crater outside the plan');
  reject(x=>{delete x.timers.raidSchedule0434;},/missing raid schedule 0434/,'craters without a schedule');
  reject(x=>{x.sectors.damage.at(-1).concussion=2;},/destruição/,'a crater with a stun above 1');
  // a due impact that the checkpoint was written just before (updateObjectives saves CP-B before updateEarlyRaid) is valid: the next tick emits it
  const due=JSON.parse(JSON.stringify(good));due.battleClock=due.timers.raidSchedule0434[3].at+.01;validateM01Snapshot(due);
  // the stun
  const stunned=JSON.parse(JSON.stringify(good));Object.assign(stunned.player,{concussion:.5,concussedUntil:stunned.clock+3});validateM01Snapshot(stunned);
  for(const [name,patch] of Object.entries({zero:{concussion:0},above:{concussion:1.5},nan:{concussion:'x'},noEnd:{concussedUntil:undefined},past:{concussedUntil:stunned.clock},far:{concussedUntil:stunned.clock+7}})){
    const x=JSON.parse(JSON.stringify(stunned));Object.assign(x.player,patch);if(patch.concussedUntil===undefined&&'concussedUntil' in patch)delete x.player.concussedUntil;
    assert.throws(()=>validateM01Snapshot(x),/atordoamento/,name);
  }
  const lone=JSON.parse(JSON.stringify(good));delete lone.player.concussedUntil;lone.player.concussion=.5;assert.throws(()=>validateM01Snapshot(lone),/atordoamento/,'a peak without its end');
  const end=JSON.parse(JSON.stringify(good));delete end.player.concussion;end.player.concussedUntil=end.clock+2;assert.throws(()=>validateM01Snapshot(end),/atordoamento/,'an end without its peak');
});

test('a save and its restore agree tick for tick through the raid, with a stunned player and casualties',()=>{
  const s=active(77);Object.assign(s.player,{x:-300,z:40,y:s.world.heightAt(-300,40)});
  const [rw0,rw1]=YARD_IDS.map(id=>s.actor(id));
  s.battleClock=seconds('04:34:00');s.consume(E('bombing_0434'));
  for(const t of s.timers.raidSchedule0434.slice(0,2)){s.battleClock=t.at;s.updateEarlyRaid();}
  place(s,rw0,-336,18);place(s,rw1,-342,26);   // near the station-yard impacts that come later
  s.battleClock=seconds('04:38:40');
  Object.assign(s.player,{x:-300,z:30,y:s.world.heightAt(-300,30)});
  s.drainEvents();
  const r=compareContinuation(s,{label:'raid with casualties and a stunned player',ticks:260,doubleAt:[40,130],
    input:tick=>tick<120?{forward:1,sprint:true}:{}});
  assert.equal(r.firstDivergence,null);
  const yard=earlyRaidPlan().filter(t=>t.point.x<-300).map(t=>t.id);assert.equal(yard.length,2);assert.ok(yard.every(id=>s.sectors.damage.some(d=>d.id===id)),'the yard impacts fell during the comparison');
});

test('the 04:34 window on the golden control route: the raid is felt, never closer than 30 m, nobody the plot needs is hurt, and a generic man falls',()=>{
  const impacts=[],casualties={killed:[],wounded:[]};let stunned=0,nearest=Infinity;
  const d=driver(19390901,{onStep:({sim,events})=>{
    if(bombWindow(sim)&&sim.concussion>0)stunned++;
    for(const e of events)if(e.type==='m01-blast'&&e.aerial&&bombWindow(sim)){
      const hit=sim.sectors.damage.at(-1),distance=Math.hypot(e.point.x-sim.player.x,e.point.z-sim.player.z);
      impacts.push({id:hit.id,distance,concussion:e.concussion});nearest=Math.min(nearest,distance);
      casualties.killed.push(...e.effects.killed);casualties.wounded.push(...e.effects.wounded);
    }
  }});
  toRepair(d);const sim=d.sim;
  assert.deepEqual(impacts.map(i=>i.id),['station_bomb','forward_post','repair_crater',...Array.from({length:N},(_,i)=>`raid_0434_${i+1}`).filter(id=>sim.sectors.damage.some(x=>x.id===id))]);
  assert.ok(impacts.length>=11,`${impacts.length} impacts before the repair begins`);
  for(const i of impacts.slice(1))assert.ok(i.distance>=30,`${i.id} ${i.distance}`);   // (the first is the scripted station, 400 m away)
  assert.ok(nearest>=30&&nearest<45,`the nearest bomb to the player: ${nearest}`);
  assert.ok(impacts.some(i=>i.concussion>=.5),'at least one bomb stuns him hard');assert.ok(stunned>0);
  const casualtyIds=[...casualties.killed,...casualties.wounded];
  assert.ok(casualtyIds.length>=1,'at least one generic man is killed or wounded in the 04:34 window');
  for(const id of casualtyIds)assert.ok(!CAST.has(id)&&YARD_IDS.includes(id),`${id} is a man of the station yard, not of the plot`);
  for(const c of definition.cast){const a=sim.actor(c.id);if(!a)continue;assert.equal(a.alive,true,`${c.id} is alive`);assert.ok(a.state!=='DOWN',c.id);}
  assert.equal(sim.player.health,100);
  assert.ok(sim.actors.filter(a=>YARD_IDS.includes(a.id)&&(!a.alive||a.state==='WOUNDED')).length>=2);
});

test('the whole mission still completes on the control route with the raid: the plot survives it (cast alive, 12 objectives, four checkpoints, survivors 12-18, 07:05:00)',()=>{
  const r=route(19390901),sim=r.sim;
  assert.equal(sim.mission.complete,true);assert.equal(sim.battleClock,seconds('07:05:00'));assert.equal(sim.checkpointsReached.length,4);
  const states=Object.values(sim.objectives).map(o=>o.state);assert.equal(states.length,12);assert.ok(states.every(x=>x==='done'||x==='expired'));
  const survivors=sim.flags['m01.east_platoon_survivors'];assert.ok(survivors>=12&&survivors<=18);
  assert.equal(sim.sectors.damage.filter(d=>/^raid_0434_/.test(d.id)).length,N);
  assert.equal(sim.player.health>0,true);
});

test('the audio event: a bomb says how hard it stunned the player and whom it hurt; a grenade says neither; malformed values are refused',()=>{
  const s=active();
  const {event}=blast(s,{x:-300,z:40},'raid_0434_x');assert.equal(event.kind,'bomb');assert.equal(event.aerial,true);assert.equal(typeof event.concussion,'number');assert.deepEqual(Object.keys(event.effects),['killed','wounded','suppressed']);
  s.grenades.active=[{id:'m01_grenade_9',x:-150,y:-3,z:26,vx:0,vy:0,vz:0,fuse:.01}];s.drainEvents();s.updateGrenades(.02,false);
  const g=s.drainEvents().find(e=>e.type==='m01-blast');assert.equal(g.kind,'grenade');assert.equal(g.concussion,undefined);assert.equal(g.effects,undefined);
  s.drainEvents();s.impact('east_demolition',{x:800,y:0,z:20},false);const demo=s.drainEvents().find(e=>e.type==='m01-blast');assert.equal(demo.kind,'demolition');assert.equal(demo.effects,undefined);
  assert.equal(s.sectors.damage.at(-1).concussion,undefined,'only a bomb records a stun');
  const ok={type:'m01-blast',kind:'bomb',point:{x:0,y:0,z:0},soundAt:1,aerial:true};
  validateM01AudioEvent({...ok,concussion:0,effects:{killed:[],wounded:['a'],suppressed:[]}});
  for(const bad of [{concussion:-.1},{concussion:1.1},{concussion:NaN},{concussion:'1'},{effects:null},{effects:{killed:[],wounded:[]}},{effects:{killed:[1],wounded:[],suppressed:[]}}])
    assert.throws(()=>validateM01AudioEvent({...ok,...bad}),/m01-blast/,JSON.stringify(bad));
});

test('a wounded railwayman of the station yard lies where he fell: the patrol no longer moves him or resets his state',()=>{
  const s=active(),rw=s.actor('yard_railway_0'),walker=s.actor('yard_railway_1'),x0=walker.x;
  s.battleClock=16220;   // 04:30:20: the first slot of the guard rota, 'patrol': an unhurt man paces +-2 m along his post
  Object.assign(rw,{state:'WOUNDED',health:30});const at={x:rw.x,z:rw.z};
  for(let i=0;i<6;i++)s.tick(.05);
  assert.equal(rw.state,'WOUNDED');assert.deepEqual({x:rw.x,z:rw.z},at);assert.equal(rw.y,s.world.heightAt(rw.x,rw.z));
  assert.equal(walker.state,'ADVANCE');assert.notEqual(walker.x,x0,'the unhurt man still patrols');
});
