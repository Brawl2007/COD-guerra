// T47: live fire of the ckm wz.30 at post S2. Node tests of the simulation: the production line, bursts, cooldown, belt and feed, determinism and the
// dedicated random stream, saves (validation, rejection, mid-burst, older rosters), the window of fire, and the whole route still completing.
// The route is the real one of tests/helpers/m01-route.js (no injected event, clock or objective); its numbers are balance facts of THIS build, not ballistics.
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot,seconds,ckmMuzzle,ckmThroughBridge,CKM_POSITION,CKM_POST,CKM_BELT,CKM_BURST_ROUNDS,CKM_INTERVAL,CKM_BURST_SEC,CKM_FEED_SEC} from '../src/game/m01-simulation.js';
import {AUXILIARY_IDS} from '../src/game/m01-yard-life.js';
import {makeRound,traceRound,closestApproach,NEAR_MISS} from '../src/game/m01-fire.js';
import {route} from './helpers/m01-route.js';
import {compareContinuation,json,firstDifference} from './helpers/m01-determinism.js';
import {CkmNeutralSimulation,CkmGhostSimulation} from './helpers/m01-ckm-neutral.js';
import {firstBurst} from './helpers/m01-ckm-scenario.js';
import {collectWindowTargets,evaluateCandidate,postMuzzleFlashWorld,muzzleFlashWorld} from '../tools/m01-ckm-fire-arc.mjs';

const E=name=>`evt_m01_${name}`;
const MUZZLE=ckmMuzzle(),PROBE={space:'metres',...MUZZLE,eyeHeight:0};
const gunnerOf=s=>s.actors.find(a=>a.id==='ckm_gunner');
const crewOf=s=>['ckm_gunner','ckm_loader','ckm_reserve'].map(id=>s.actors.find(a=>a.id===id));
const restore=raw=>{const s=new M01Simulation();s.restoreSnapshot(structuredClone(raw));s.drainEvents();return s;};
const BLOCKED=/Checkpoint M01 inválido/;

// ---------------------------------------------------------------------------------------------------------- the whole route, recorded once
class Recording extends M01Simulation{
  ckmImpact(r){
    const before=new Map(this.enemies.map(a=>[a.id,{health:a.health,until:a.suppressedUntil,alive:a.alive}]));
    super.ckmImpact(r);
    const log=this.ckmLog??=[];
    for(const a of this.enemies){const b=before.get(a.id);
      if(a.health<b.health)log.push({kind:b.alive&&!a.alive?'kill':'hit',id:a.id,clock:this.clock,health:a.health});
      if(a.suppressedUntil>b.until)log.push({kind:'suppressed',id:a.id,clock:this.clock});}
  }
}
let cached;
function routeFixture(){
  if(cached)return cached;
  const rec={bursts:[],ticks:0,phaseMismatch:0,beltMin:CKM_BELT,refills:0,lastBelt:CKM_BELT,afterEast:0,eastTick:null,abandon:null,retreat:null,crewAtEast:null,maxInFlight:0,planWithoutGunner:0};
  const result=route(19390901,{Simulation:Recording,onStep:({sim,events})=>{
    rec.ticks++;
    const [g,l,r]=crewOf(sim),f=g.ckmFire,p=g.ckm.phase;
    if(['idle','aim','feed','fire_burst'].includes(p)&&sim.battleClock>=seconds('04:46:00')&&(l.ckm.phase!==p||r.ckm.phase!==p||l.ckm.startedAt!==g.ckm.startedAt||r.ckm.startedAt!==g.ckm.startedAt))rec.phaseMismatch++;
    rec.beltMin=Math.min(rec.beltMin,f.belt);
    if(f.belt>rec.lastBelt)rec.refills++;
    rec.lastBelt=f.belt;
    if(sim.consumedEvent(E('east_demolition'))&&rec.eastTick===null){rec.eastTick=sim.clock;rec.crewAtEast=crewOf(sim).map(a=>structuredClone(a.ckm));}
    if(p==='abandon'&&rec.abandon===null)rec.abandon=sim.clock;
    if(p==='retreat'&&rec.retreat===null)rec.retreat=sim.clock;
    for(const e of events)if(e.type==='ally-fire'){
      const plan=g.ckm.burstPlan,target=sim.actor(plan.target);if(sim.consumedEvent(E('east_demolition')))rec.afterEast++;
      // The undispersed arc at the aimed point: the very probe the simulation used to choose the target.
      const aimed=makeRound({id:'probe',by:'ckm_gunner',weapon:'ckm_wz30',kind:'ally',origin:MUZZLE,aim:sim.ckmAim(target),firedAt:0,bias:[0,0],cone:[0,0],gauss:()=>0});
      const arc=traceRound(sim.world,aimed,[]);
      rec.bursts.push({event:e,clock:sim.clock,bc:sim.battleClock,target:target.id,alive:target.alive&&target.active,sinceFired:sim.clock-target.firedAt,
        los:sim.world.lineOfSight(PROBE,target),arcFree:!(arc.material!==null&&arc.t<.98),arcThrough:ckmThroughBridge(sim.world,aimed),
        through:plan.plan.map(round=>ckmThroughBridge(sim.world,round)),plan:structuredClone(plan),belt:f.belt,bursts:f.bursts,nextAt:f.nextAt});
    }
  }});
  const sim=result.sim,log=sim.ckmLog??[];
  return cached={rec,result,sim,log,hits:log.filter(x=>x.kind==='hit'||x.kind==='kill'),kills:log.filter(x=>x.kind==='kill'),suppressed:log.filter(x=>x.kind==='suppressed')};
}

test('post S2 is confirmed in the production trace: the gate riflemen are in clear sight of the real muzzle, the casemate sees nobody, no ray touches a bridge',{timeout:240000},async()=>{
  const win=await collectWindowTargets({everyTicks:20});
  assert.deepEqual(postMuzzleFlashWorld(),{x:MUZZLE.x,y:MUZZLE.y,z:MUZZLE.z});
  assert.ok(Math.abs(MUZZLE.x-8)<1e-9&&Math.abs(MUZZLE.y+2.36)<1e-9&&Math.abs(MUZZLE.z-26)<1e-9);
  const s2=evaluateCandidate(win,MUZZLE,{explain:true}),casemate=evaluateCandidate(win,muzzleFlashWorld());
  assert.equal(casemate.productionClearEntries,0,'the pre-T47 casemate muzzle sees no German');
  assert.equal(s2.productionClearEntries,s2.strictClearEntries,'production line == strict: nothing the production trace lets through is a bridge collider');
  assert.equal(s2.strictClearEntries,255,'combat slice 2 (golden amendment 08, 2026-10-18): was 254; the longer repair and the deck fight move the 20-tick samples, one more distinct entry of the same 14 actors (tests/m01-ckm-candidate-posts.test.js); combat AI slice 1 (golden amendment 07, 2026-10-18): was 275; the repair of the neutral route ends sooner, so the window has fewer distinct entries of the same 14 actors (tests/m01-ckm-candidate-posts.test.js); P2 pacing (golden amendment 06, 2026-10-18): 275 was 271; the hold at 24x moves the 20-tick samples onto other ticks, 4 more distinct (world, actor, eye) entries of the same 14 actors (tests/m01-ckm-candidate-posts.test.js); D43: 271 was 270 before T47 amendment 03 (the T23 withdrawal cadence counted on landing changes the neutral route after 06:05; re-measured with tools/m01-ckm-fire-arc.mjs, GOLDEN_AMENDMENT_03.json s2Visibility); 214 before the T38 gate places (re-measured when T47 joined the staging, 3c9cab7; tests/m01-ckm-candidate-posts.test.js)');assert.equal(s2.throughBridgeEntries,0);
  for(const phase of ['repair','post_repair','withdrawal']){
    assert.deepEqual(s2.phases[phase].strict.ids,Array.from({length:14},(_,i)=>`de_east_${i}`).sort(),phase);
  }
  assert.ok(s2.minTargetDistanceM>1044&&s2.maxTargetDistanceM<1051,`${s2.minTargetDistanceM}..${s2.maxTargetDistanceM}`);
  // The terrain under the gun is the flat -3 of the embankment: root y is the ground, the muzzle is 0.64 m above it.
  const sim=new M01Simulation();assert.equal(sim.world.heightAt(CKM_POSITION.x,CKM_POSITION.z),-3);assert.equal(CKM_POSITION.y,-3);
});

test('every burst answers a German who fired in the last 10 s and has a clear production line AND a clear arc; no round crosses a bridge collider',{timeout:240000},()=>{
  const {rec}=routeFixture();
  assert.ok(rec.bursts.length>=40,`${rec.bursts.length} bursts`);
  for(const b of rec.bursts){
    assert.ok(b.alive,b.target);assert.ok(b.sinceFired>=0&&b.sinceFired<10,`${b.target} fired ${b.sinceFired} s before`);
    assert.equal(b.los,true,'production line of sight from the muzzle to the target');
    assert.equal(b.arcFree,true,'the undispersed arc reaches the target area unobstructed');
    assert.equal(b.arcThrough,null);assert.deepEqual(b.through,Array(CKM_BURST_ROUNDS).fill(null),'no dispersed round crosses a bridge collider either');
    assert.match(b.target,/^de_east_(\d|1[0-3])$/,'from S2 only the gate group is in sight');
  }
});

test('no burst without a clear line: a wall across the production line, an obstacle only over the arc, and a bridge collider across the lane each stop the gun',()=>{
  const {pre}=firstBurst();
  const control=restore(pre),ref=control.ckmTarget();
  assert.ok(ref,'control: a German with a clear shot is waiting');
  for(let i=0;i<4;i++)control.tick(.05);
  assert.ok(control.drainEvents().some(e=>e.type==='ally-fire'),'control: the gun answers on the next tick');
  const variants=[
    ['wall across the production line',{x:[500,502],y:[-6,6],z:[10,40],into:'obstacles'},false],
    ['obstacle only over the arc (the straight line passes below it)',{x:[500,502],y:[3,9],z:[10,40],into:'obstacles'},true],
    ['bridge collider across the lane (the production trace ignores it)',{x:[300,302],y:[-5,20],z:[20,34],into:'colliders'},true],
  ];
  for(const [label,w,lineStaysClear] of variants){
    const s=restore(pre),block={id:'test_block',min:{x:w.x[0],y:w.y[0],z:w.z[0]},max:{x:w.x[1],y:w.y[1],z:w.z[1]},material:'stone',collider:'solid'};
    const refresh=s.world.refresh.bind(s.world);
    s.world.refresh=(...a)=>{refresh(...a);s.world[w.into].push(block);};s.world.refresh(Object.keys(s.consumed),s.flags);
    assert.equal(s.world.lineOfSight(PROBE,s.actor(ref.id)),lineStaysClear,`${label}: what the production line sees`);
    assert.equal(s.ckmTarget(),null,label);
    let issued=0;
    for(let i=0;i<160;i++){s.tick(.05);issued+=s.drainEvents().filter(e=>e.type==='ally-fire').length;}
    assert.equal(issued,0,label);assert.equal(s.ckm.bursts,0,label);assert.ok(s.enemyFire.rounds.every(r=>!String(r.by).startsWith('ckm_')));
    assert.ok(s.enemies.some(a=>a.group==='grp_de_east'&&s.clock-a.firedAt<10),'the Germans kept firing in the meantime: there was something to answer');
  }
});

test('burst, cooldown, belt: 8 rounds at 0.1 s, one event per burst, cooldown between bursts, first fire at 04:46, last before 06:09:30, belt falls 8 per burst',{timeout:240000},()=>{
  const {rec,sim,hits,kills,suppressed}=routeFixture();
  assert.equal(rec.bursts.length,sim.actor('ckm_gunner').ckmFire.bursts,'one ally-fire event per burst');
  let previous=null,rounds=0;
  for(const b of rec.bursts){
    const p=b.plan;
    assert.equal(b.event.rounds,CKM_BURST_ROUNDS);assert.equal(b.event.interval,CKM_INTERVAL);assert.equal(b.event.at,p.startedAt);assert.equal(b.event.weapon,'ckm_wz30');
    assert.deepEqual(b.event.origin,{x:MUZZLE.x,y:MUZZLE.y,z:MUZZLE.z});
    assert.equal(p.plan.length,8);p.plan.forEach((r,k)=>{assert.equal(r.firedAt,p.startedAt+k*CKM_INTERVAL);assert.ok(r.arriveAt>r.firedAt+1.5&&r.arriveAt<r.firedAt+2,`flight ${r.arriveAt-r.firedAt}`);});
    assert.ok(b.bc>=seconds('04:46:00')&&b.bc<seconds('06:09:30'),`fires inside the window: ${b.bc}`);
    if(previous)assert.ok(b.clock-previous.clock>=CKM_BURST_SEC+3-1e-9,`cooldown ${b.clock-previous.clock}`);
    previous=b;rounds+=8;
  }
  assert.ok(rec.beltMin>=0&&rec.beltMin<=8,`belt ran down to ${rec.beltMin}`);assert.ok(rec.refills>=1,'a belt of 330 is spent on this route and changed through feed');
  assert.equal(rec.phaseMismatch,0,'loader and third man copy the gunner phase every tick while he is at the gun');
  // 41 bursts of 8 leave 2 rounds of a belt of 330, which is then changed (feed); the belt in the gun at the end accounts for the rest.
  assert.equal(rounds,(CKM_BELT-2)*rec.refills+(CKM_BELT-sim.actor('ckm_gunner').ckmFire.belt),'every round issued came out of a belt of 330');
  // Balance facts of this build (documented in the T47 report): mostly suppression, few hits, no emptied gates.
  assert.ok(rounds>=300&&rounds<=900,`${rounds} rounds`);assert.ok(hits.length<=12,`${hits.length} hits`);assert.ok(kills.length<=3,`${kills.length} kills`);
  assert.ok(suppressed.length>=150,`${suppressed.length} suppressions`);
  assert.ok(sim.enemies.filter(a=>a.group==='grp_de_east'&&a.alive&&a.id.match(/_(\d|1[0-3])$/)).length>=11,'the gates are not emptied');
});

test('a spent belt is changed through the feed phase: 3.2 s without fire, the belt back to 330, the loader and the third man feeding with the gunner',()=>{
  const {pre}=firstBurst();
  const raw=structuredClone(pre);gunnerOf(raw).ckmFire.belt=10;validateM01Snapshot(raw);
  const s=restore(raw),issued=[];let feedAt=null,burstAt=null;
  for(let i=0;i<260;i++){
    s.tick(.05);for(const e of s.drainEvents())if(e.type==='ally-fire')issued.push({at:e.at,clock:s.clock});
    const g=gunnerOf(s);
    if(burstAt===null&&issued.length)burstAt=issued[0].at;
    if(g.ckm.phase==='feed'&&feedAt===null){feedAt=g.ckm.startedAt;assert.equal(g.ckmFire.belt,2,'8 of the 10 left rounds were fired');
      assert.deepEqual(crewOf(s).map(a=>a.ckm.phase),['feed','feed','feed']);}
    if(feedAt!==null&&s.clock<feedAt+CKM_FEED_SEC-1e-9)assert.equal(issued.length,1,'no second burst while the belt is being changed');
    if(feedAt!==null&&s.clock>=feedAt+CKM_FEED_SEC)break;
  }
  assert.ok(burstAt!==null&&feedAt!==null&&feedAt>=burstAt+CKM_BURST_SEC-1e-9,'the feed starts when the burst is over');
  s.tick(.05);const g=gunnerOf(s);assert.equal(g.ckmFire.belt,CKM_BELT);assert.notEqual(g.ckm.phase,'feed');
  compareContinuation(restore(raw),{label:'belt-change',ticks:140,doubleAt:[3,30,80]});
});

test('the quiet cycle of T36 runs unchanged while nobody is engaged: aim 6 s, feed 3 s, idle 9 s, with no round and no event',()=>{
  const s=new M01Simulation();s.tick(.05,{skip:true});const next=s.enemyFire.nextId,rng=s.rng.state;
  s.battleClock=seconds('04:46:02');s.tick(.05);assert.deepEqual(crewOf(s).map(a=>a.ckm.phase),['aim','aim','aim']);
  s.battleClock=seconds('04:46:07');s.tick(.05);assert.deepEqual(crewOf(s).map(a=>a.ckm.phase),['feed','feed','feed']);
  s.battleClock=seconds('04:46:12');s.tick(.05);assert.deepEqual(crewOf(s).map(a=>a.ckm.phase),['idle','idle','idle']);
  assert.ok(!s.drainEvents().some(e=>e.type==='ally-fire'));assert.equal(s.ckm.bursts,0);assert.equal(s.ckm.belt,CKM_BELT);assert.equal(s.enemyFire.nextId,next);
  assert.equal(s.rng.state,rng,'nothing in this quiet minute draws from the main stream, gun included');
});

test('A/B: the same save run twice gives identical events, snapshots and gun state at every tick; a restore in the middle changes nothing',{timeout:240000},()=>{
  const {pre}=firstBurst();
  const a=restore(pre),b=restore(pre),seen=[];
  for(let i=0;i<500;i++){
    a.tick(.05,{crouch:i===0});b.tick(.05,{crouch:i===0});
    const ea=json(a.drainEvents()),eb=json(b.drainEvents());
    assert.deepEqual(ea,eb,`events at tick ${i}`);if(i%25===0)assert.deepEqual(a.snapshot(false),b.snapshot(false),`state at tick ${i}`);
    seen.push(...ea.filter(e=>e.type==='ally-fire'));
  }
  assert.deepEqual(a.snapshot(),b.snapshot());assert.ok(seen.length>=2,`${seen.length} bursts in 25 s`);
  compareContinuation(restore(pre),{label:'ckm-live-ab',ticks:500,doubleAt:[1,20,60,200],input:t=>({crouch:t===0})});
});

test('the gun draws from its own stream only: with and without it firing at all, the main random state and every other actor are identical tick by tick',{timeout:240000},()=>{
  const {pre}=firstBurst();
  const ghost=new CkmGhostSimulation(),neutral=new CkmNeutralSimulation();ghost.restoreSnapshot(structuredClone(pre));neutral.restoreSnapshot(structuredClone(pre));
  // timers.barks is the dialogue director's ledger (src/game/m01-barks.js): what the voices heard, not an actor. It hears the gun by design - an ally-fire is "our side fired" for its
  // `quiet` condition - so the ledger of the world where the gun shoots is not the one of the world where it never engages. The main random state is compared on its own line below.
  const strip=s=>{const v=s.snapshot(false);v.actors=v.actors.filter(a=>!a.id.startsWith('ckm_'));delete v.resumeCheckpoint;delete v.timers.barks;return v;};
  let bursts=0;
  for(let i=0;i<700;i++){
    ghost.tick(.05,{crouch:i===0});neutral.tick(.05,{crouch:i===0});
    bursts+=ghost.drainEvents().filter(e=>e.type==='ally-fire').length;neutral.drainEvents();
    assert.equal(ghost.rng.state,neutral.rng.state,`main rng at tick ${i}`);
    if(i%10===0)assert.deepEqual(firstDifference(strip(ghost),strip(neutral)),null,`world at tick ${i}`);
  }
  assert.ok(bursts>=3,`${bursts} bursts happened in the ghost run`);assert.equal(neutral.ckm.bursts,0);
  // Her own stream moved; the neutral gun never drew.
  assert.notEqual(ghost.actor('ckm_gunner').ckmFire.rng,neutral.actor('ckm_gunner').ckmFire.rng);
});

test('a save taken in the middle of a burst, and one with rounds still in flight, restore identically and continue the same',()=>{
  const {mid,landing}=firstBurst();
  for(const [label,save] of [['mid-burst',mid],['rounds-in-flight',landing]]){
    const s=restore(save),p=gunnerOf(s).ckm.burstPlan;
    assert.equal(p.policy,'live');assert.deepEqual(s.snapshot(),json(save),`${label}: restore is the identity`);
    validateM01Snapshot(s.snapshot());
    compareContinuation(s,{label,ticks:80,doubleAt:[1,8,30],dt:t=>t%7===0?.013:.05});
  }
  const p=gunnerOf(restore(mid)).ckm,q=gunnerOf(restore(landing)).ckm;
  assert.equal(p.phase,'fire_burst');assert.equal(p.burstPlan.emitted,4);assert.equal(q.burstPlan.landed,2);assert.notEqual(q.phase,'fire_burst');
});

test('save validation: every malformed fire record or burst plan is rejected atomically, and the valid shapes load',()=>{
  const {mid,landing}=firstBurst(),target=new M01Simulation(),baseline=target.snapshot();
  validateM01Snapshot(structuredClone(mid));validateM01Snapshot(structuredClone(landing));
  const gun=raw=>raw.actors.find(a=>a.id==='ckm_gunner'),loader=raw=>raw.actors.find(a=>a.id==='ckm_loader');
  const mutations={
    'fire_burst without a plan':raw=>{delete gun(raw).ckm.burstPlan;},
    'unknown policy':raw=>{gun(raw).ckm.burstPlan.policy='armed';},
    'extra plan key':raw=>{gun(raw).ckm.burstPlan.extra=1;},
    'rounds not 8':raw=>{gun(raw).ckm.burstPlan.rounds=7;},
    'interval not 0.1':raw=>{gun(raw).ckm.burstPlan.interval=.075;},
    'emitted ahead of the clock':raw=>{gun(raw).ckm.burstPlan.emitted=8;},
    'emitted behind the clock':raw=>{gun(raw).ckm.burstPlan.emitted=1;},
    'landed ahead of arrival':raw=>{gun(raw).ckm.burstPlan.landed=3;},
    'landed behind arrival':raw=>{gun(raw).ckm.burstPlan.landed=0;},
    'target is not a German':raw=>{gun(raw).ckm.burstPlan.target='jan_wrona';},
    'plan shorter than its rounds':raw=>{gun(raw).ckm.burstPlan.plan.pop();},
    'round from another shooter':raw=>{gun(raw).ckm.burstPlan.plan[2].by='de_east_0';},
    'round of another weapon':raw=>{gun(raw).ckm.burstPlan.plan[2].weapon='mg34';},
    'round id out of sequence':raw=>{gun(raw).ckm.burstPlan.plan[1].id='ckm_9_1';},
    'round fired off the clip beat':raw=>{gun(raw).ckm.burstPlan.plan[1].firedAt+=.01;},
    'round from another muzzle':raw=>{gun(raw).ckm.burstPlan.plan[0].ox=24.85;},
    'round aimed behind the gun':raw=>{gun(raw).ckm.burstPlan.plan[0].ax=100;},
    'round arrives before it is fired':raw=>{gun(raw).ckm.burstPlan.plan[0].arriveAt=gun(raw).ckm.burstPlan.plan[0].firedAt-1;},
    'round with a tracer':raw=>{gun(raw).ckm.burstPlan.plan[0].tracer=true;},
    'round with a victim':raw=>{gun(raw).ckm.burstPlan.plan[0].victim='pl_east_18';},
    'round NaN':raw=>{gun(raw).ckm.burstPlan.plan[0].ay=Number.NaN;},
    'plan older than the burst':raw=>{gun(raw).ckm.burstPlan.startedAt-=1;},
    'plan on the loader':raw=>{loader(raw).ckm.burstPlan=structuredClone(gun(raw).ckm.burstPlan);},
    'plan on a dead gunner':raw=>{Object.assign(gun(raw),{alive:false,health:0,state:'DOWN'});},
    'plan during the abandon':raw=>{raw.consumed[E('east_demolition')]=1;gun(raw).ckm.phase='abandon';},
    'fire record missing with a plan':raw=>{delete gun(raw).ckmFire;},
    'fire record on the loader':raw=>{loader(raw).ckmFire=structuredClone(gun(raw).ckmFire);},
    'fire record with an extra key':raw=>{gun(raw).ckmFire.mood=1;},
    'fire record without a key':raw=>{delete gun(raw).ckmFire.nextAt;},
    'stream state not an integer':raw=>{gun(raw).ckmFire.rng=.5;},
    'stream state out of 32 bits':raw=>{gun(raw).ckmFire.rng=2**32;},
    'belt above a full belt':raw=>{gun(raw).ckmFire.belt=CKM_BELT+1;},
    'belt negative':raw=>{gun(raw).ckmFire.belt=-1;},
    'belt fractional':raw=>{gun(raw).ckmFire.belt=100.5;},
    'bursts negative':raw=>{gun(raw).ckmFire.bursts=-1;},
    'cooldown in the far future':raw=>{gun(raw).ckmFire.nextAt=raw.clock+999;},
    'engagement in the far future':raw=>{gun(raw).ckmFire.engagedUntil=raw.clock+999;},
    'phase fire_burst started after the plan':raw=>{gun(raw).ckm.startedAt=gun(raw).ckm.burstPlan.startedAt+.05;},
  };
  for(const [label,mutate] of Object.entries(mutations)){
    for(const [kind,source] of [['mid',mid],['landing',landing]]){
      if(kind==='landing'&&['fire_burst without a plan','phase fire_burst started after the plan'].includes(label))continue;
      const bad=structuredClone(source);mutate(bad);
      if(JSON.stringify(bad)===JSON.stringify(source))continue;
      assert.throws(()=>validateM01Snapshot(structuredClone(bad)),BLOCKED,`${label} (${kind})`);
      assert.throws(()=>target.restoreSnapshot(structuredClone(bad)),BLOCKED,`${label} (${kind})`);
      assert.deepEqual(target.snapshot(),baseline,`${label}: the running simulation is untouched`);
    }
  }
  // One burst is one arc: makeRound gives its 8 rounds one aim, hence one drop h = ARC_K R^2 and one flight time R / ROUND_SPEED. Each of these is refused for that reason.
  const arc={
    'one round with another drop':raw=>{gun(raw).ckm.burstPlan.plan[3].h*=1.01;},
    'one round with another flight time':raw=>{gun(raw).ckm.burstPlan.plan[5].arriveAt+=.002;},
    'every round with a drop that does not follow the range':raw=>{for(const r of gun(raw).ckm.burstPlan.plan)r.h*=1.5;},
    'every round with a flight time that does not match the drop':raw=>{for(const r of gun(raw).ckm.burstPlan.plan)r.arriveAt+=.0005;},
  };
  for(const [label,mutate] of Object.entries(arc)){
    const bad=structuredClone(mid);mutate(bad);
    assert.throws(()=>validateM01Snapshot(structuredClone(bad)),/Checkpoint M01 inválido: ckm live burst arc/,label);
    assert.throws(()=>target.restoreSnapshot(structuredClone(bad)),/ckm live burst arc/,label);
    assert.deepEqual(target.snapshot(),baseline,`${label}: the running simulation is untouched`);
  }
  // Rounding noise of the float arithmetic is not a malformed plan: the real saves stay valid through JSON, and so does a flight time off by 1e-11 s.
  validateM01Snapshot(JSON.parse(JSON.stringify(mid)));validateM01Snapshot(JSON.parse(JSON.stringify(landing)));
  const wobble=structuredClone(mid);gun(wobble).ckm.burstPlan.plan[2].arriveAt+=1e-11;validateM01Snapshot(wobble);
  // The shapes that must stay valid: the gunner's copied burst phase on the other two men carries no plan, and an unengaged save has no plan at all.
  assert.equal(loader(structuredClone(mid)).ckm.phase,'fire_burst');assert.equal(loader(structuredClone(mid)).ckm.burstPlan,undefined);
  assert.equal(gunnerOf(new M01Simulation().snapshot()).ckm.burstPlan,undefined);
});
test('an older save whose crew carries a typed plan of the disabled policy loads as it was, and the gun fires all the same: the inert plan goes at the first tick',{timeout:240000},()=>{
  const {pre}=firstBurst(),legacy=structuredClone(pre),crew=['ckm_gunner','ckm_loader','ckm_reserve'];
  for(const id of crew){
    const a=legacy.actors.find(x=>x.id===id);assert.ok(['idle','aim','feed'].includes(a.ckm.phase));
    a.ckm.burstPlan={policy:'disabled',startedAt:legacy.clock-.05,rounds:6,interval:.075,emitted:0};   // the shape T36 validated (inert: no round, no flash)
  }
  validateM01Snapshot(structuredClone(legacy));
  assert.deepEqual(restore(legacy).snapshot(),legacy,'the plan round-trips through a load');
  const run=raw=>{const sim=restore(raw),events=[];for(let i=0;i<600;i++){sim.tick(.05,{});events.push(...sim.drainEvents());}return {sim,events};};
  const withPlan=run(legacy),control=run(pre),bursts=ev=>ev.filter(e=>e.type==='ally-fire');
  assert.ok(bursts(control.events).length>=3,'the control save fires '+bursts(control.events).length+' bursts in 30 s');
  assert.deepEqual(bursts(withPlan.events),bursts(control.events),'the same bursts at the same times as without the inert plan (it must not shut the planning gate)');
  for(const id of crew){const plan=withPlan.sim.actor(id).ckm.burstPlan;assert.ok(plan===undefined||plan.policy==='live',id);}
  assert.deepEqual(withPlan.sim.snapshot(),control.sim.snapshot(),'the inert plan leaves no trace after the first tick');
});

test('saves made before T47 (86 and 89 actors, crew on the casemate post, no fire record) load, move the crew to S2 and fire for real afterwards',()=>{
  const {pre}=firstBurst();
  const casemate=[[21.206,42.971],[22.08,42.48],[20.4,41.6]].map(([x,z])=>[x+2.17,z]);   // the exact doubles the previous build saved
  for(const roster of [89,86]){
    const old=structuredClone(pre);
    // What the previous build saved: crew on the casemate post, in the quiet cycle, with no fire record (the T34 yard actors and, for 86, the crew come later).
    old.actors.filter(a=>a.ckm).forEach((a,i)=>{[a.x,a.z]=casemate[i];a.ckm={phase:'aim',startedAt:Math.max(0,old.clock-1),visible:true};delete a.ckmFire;});
    old.actors=old.actors.filter(a=>!AUXILIARY_IDS.includes(a.id)&&(roster===89||!a.ckm));
    assert.equal(old.actors.length,roster);delete old.resumeCheckpoint;
    const keep=structuredClone(old),s=new M01Simulation();validateM01Snapshot(structuredClone(old));s.restoreSnapshot(old);
    assert.deepEqual(old,keep,'the supplied save is not edited');
    assert.equal(s.rng.state,old.rng,'restoring draws nothing from the main stream');
    assert.deepEqual(crewOf(s).map(a=>[a.x,a.z]),CKM_POST.map(([x,z])=>[x,z]),'the crew stands at S2');
    assert.deepEqual(Object.keys(gunnerOf(s).ckmFire).sort(),['belt','bursts','engagedUntil','nextAt','rng']);assert.equal(gunnerOf(s).ckmFire.belt,CKM_BELT);
    validateM01Snapshot(s.snapshot());
    let bursts=0;compareContinuation(s,{label:'pre-T47-'+roster,ticks:400,doubleAt:[1,60,200],input:t=>({crouch:t===0})});
    for(let i=0;i<400;i++){s.tick(.05);bursts+=s.drainEvents().filter(e=>e.type==='ally-fire').length;}
    assert.ok(bursts>=1,'the gun of a restored old save engages the Germans');
  }
});

test('window of fire: no new burst from 30 s before the east demolition, none after it, and abandon then retreat run exactly as before',{timeout:240000},()=>{
  const {rec,sim}=routeFixture();
  assert.equal(rec.afterEast,0,'no ally-fire event after evt_m01_east_demolition');
  assert.ok(rec.bursts.every(b=>b.bc<seconds('06:09:30')),'the last burst starts before 06:09:30');
  // At the blast every man is in the quiet/feed/aim cycle (never mid-burst) and has no plan; then abandon lasts 3 s and retreat starts.
  assert.ok(rec.crewAtEast.every(c=>['idle','aim','feed'].includes(c.phase)&&c.burstPlan===undefined),JSON.stringify(rec.crewAtEast));
  assert.ok(rec.abandon>=rec.eastTick&&rec.abandon-rec.eastTick<=.1,'abandon begins on the first tick after the demolition');
  assert.ok(Math.abs(rec.retreat-rec.abandon-3)<=.06,`abandon lasts 3 s (${rec.retreat-rec.abandon})`);
  assert.ok(crewOf(sim).every(a=>!a.ckm.visible&&a.x<-90&&a.ckm.phase==='retreat'));assert.equal(gunnerOf(sim).ckm.burstPlan,undefined);
  // A burst in the air at the demolition is dropped with the gun: no more rounds, no more events (direct, not on the route).
  const {mid}=firstBurst(),s=restore(mid);assert.equal(gunnerOf(s).ckm.phase,'fire_burst');
  s.consume(E('east_demolition'));s.tick(.05);
  assert.deepEqual(crewOf(s).map(a=>a.ckm.phase),['abandon','abandon','abandon']);assert.equal(gunnerOf(s).ckm.burstPlan,undefined);
  for(let i=0;i<80;i++)s.tick(.05);
  assert.ok(!s.drainEvents().some(e=>e.type==='ally-fire'));assert.deepEqual(crewOf(s).map(a=>a.ckm.phase),['retreat','retreat','retreat']);
  validateM01Snapshot(s.snapshot());
});

test('the retreat from S2 leaves west along the embankment, clear of every solid, and reaches the rally point before the west demolition gate needs it',{timeout:240000},()=>{
  const {sim,result}=routeFixture();
  const s=new M01Simulation();s.scene=null;s.consume(E('east_demolition'));
  const crew=crewOf(s);let steps=0,maxZ=-Infinity,minZ=Infinity;
  while(crew.some(a=>a.x>=-90)&&steps++<2000){
    s.tick(.05);
    for(const a of crew){maxZ=Math.max(maxZ,a.z);minZ=Math.min(minZ,a.z);
      assert.ok(!s.world.obstacles.some(b=>a.y+1.4>b.min.y&&a.y+.1<b.max.y&&a.x+a.radius>b.min.x&&a.x-a.radius<b.max.x&&a.z+a.radius>b.min.z&&a.z-a.radius<b.max.z),`${a.id} inside a solid`);
      assert.equal(a.y,-3,'on the flat ground between the bridges, no ramp');}
  }
  assert.ok(crew.every(a=>a.x<-90),`${steps} ticks`);assert.ok(steps*.05<75,`${steps*.05} s to x < -90`);
  assert.ok(maxZ<29.5&&minZ>20,`the way out keeps z in [${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]: north of the road abutment (29.5), south of the rail portal (11.9)`);
  assert.ok(sim.consumedEvent(E('west_demolition'))&&result.sim.mission.complete);
});

test('the whole route still completes: all 12 objectives resolve, the scripted beats happen, and the east platoon rule holds',{timeout:240000},()=>{
  const {sim,rec}=routeFixture();
  const neutral=route(19390901,{Simulation:CkmNeutralSimulation}).sim;
  assert.ok(sim.mission.complete&&sim.flags['m01.completed']);assert.equal(sim.checkpointsReached.length,4);
  const states=Object.fromEntries(Object.entries(sim.objectives).map(([id,o])=>[id,o.state]));
  assert.equal(Object.keys(states).length,12);
  assert.deepEqual(states,Object.fromEntries(Object.entries(neutral.objectives).map(([id,o])=>[id,o.state])),'every objective ends in the state it has without the gun firing');
  assert.ok(Object.entries(states).every(([id,state])=>['done','expired'].includes(state)),JSON.stringify(states));
  assert.deepEqual(Object.keys(sim.consumed).sort(),Object.keys(neutral.consumed).sort(),'the same scripted events were consumed');
  assert.deepEqual(sim.checkpointsReached,neutral.checkpointsReached);
  assert.equal(sim.flags['m01.east_platoon_survivors'],neutral.flags['m01.east_platoon_survivors']);
  for(let i=18;i<24;i++)assert.equal(sim.actor('pl_east_'+i).alive,false,`T23 attrition: pl_east_${i} still falls`);
  assert.equal(sim.battleClock,seconds('07:05:00'));
  // Re-measured on purpose for the P2 pacing (golden amendment 06, 2026-10-18): the hold at 24x shortens this route from 21 888 to 19 410 ticks (GOLDEN_AMENDMENT_06.json newTicks);
  // the combat AI slice 1 (golden amendment 07, same day) ends the repair sooner: 19 224 ticks (GOLDEN_AMENDMENT_07.json newTicks). The bound still proves the whole route was
  // flown (no short-circuit), just under the measured length.
  assert.ok(rec.ticks>19000,`${rec.ticks} ticks`);
});
test('the two MG34 gunners are never chosen as a target, but nothing shields them: rounds that pass within 3 m suppress them like any German',{timeout:240000},()=>{
  const {rec,sim,log}=routeFixture(),mg=['de_east_0','de_east_1'];
  assert.ok(rec.bursts.length>50&&rec.bursts.every(b=>!mg.includes(b.target)),'no burst is aimed at an MG34 gunner');
  // The beaten zone does cross them: rounds of the plans pass within NEAR_MISS of an MG34 gunner...
  let near=0;
  for(const b of rec.bursts)for(const r of b.plan.plan){
    const end=traceRound(sim.world,r,[]);
    for(const id of mg){const a=sim.actor(id);if(closestApproach(r,end.t,{x:a.x,y:a.y+.9,z:a.z})<=NEAR_MISS)near++;}
  }
  assert.ok(near>0,'rounds of the gun do pass within 3 m of the MG34 gunners ('+near+')');
  // ...and the normal path acts on them exactly as on the riflemen of the gates.
  assert.ok(log.some(x=>x.kind==='suppressed'&&mg.includes(x.id)),'an MG34 gunner is suppressed by a round of the gun');
  assert.ok(log.some(x=>x.kind==='suppressed'&&!mg.includes(x.id)),'the riflemen of the gates are suppressed as well');
});
