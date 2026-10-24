import test from 'node:test';
import assert from 'node:assert/strict';
import v8 from 'node:v8';
import vm from 'node:vm';
import * as THREE from 'three';
import {M01View} from '../src/render/m01-view.js';
import {M01CombatFeedback} from '../src/render/m01-combat-feedback.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {ROUND_SPEED} from '../src/game/m01-fire.js';
import {
  TRACER_WEAPONS,TRACER_QUOTA_BY_TIER,TRACER_BURN_IN_M,tracerWeapon,tracerQuota,tracerDrawn,tracerHalfWidth,tracerHalfLength,tracerTint,
  IMPACT_MATERIALS,ROUND_IMPACT_PROFILE,IMPACT_POOL_SLOTS,IMPACT_DRAW_BY_TIER,IMPACT_MIN_PX,IMPACT_RADIUS_M,RoundImpactPool,scheduleRoundImpact,classifyRoundEnd,
  drawRoundImpacts,impactDustCount,impactChipCount,impactSparkCount,impactPuffRadius,
} from '../src/render/m01-long-range-fx.js';
import {AudioManager} from '../src/core/audio.js';
import {
  IMPACT_IMMEDIATE_M,IMPACT_AUDIBLE_M,GRENADE_THROW_AUDIBLE_M,roundImpactSoundPlan,grenadeThrowSoundPlan,planGrenadeThrow,planBulletPass,planImpact,soundDelay,acousticBand,
} from '../src/core/battlefield-audio.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';
import {route} from './helpers/m01-route.js';

// R2-c: where the rounds go and land, seen and heard at a distance. These tests pin the event -> FX mapping, the pools and the audio planning; the
// look itself is the browser evidence in docs/verification/m01-runtime/long-range-fx-r2c-2026-10-24. Nothing here is a playtest.
const shot=(over={})=>({type:'npc-shot',weapon:'ally_rifle',point:{x:600,y:1.4,z:40},rounds:1,by:'staszek_pawlak',target:'de_spans_1',end:{x:850,y:0,z:42},hit:false,...over});
const round=(over={})=>({id:'r',by:'de_spans_0',weapon:'mg34',kind:'squad',ox:900,oy:1.2,oz:20,ax:600,ay:1,az:20,h:1,firedAt:10,arriveAt:10.5,tracer:true,victim:null,...over});

test('tracer rule: only an MG34 belt is drawn with tracers (one constant), never a rifle, never inside the burn-in stretch, and never unless the simulation marked the round',()=>{
  assert.deepEqual([...TRACER_WEAPONS],['mg34'],'GAMEPLAY_DRAMATIZATION constant: the MG34 only');
  assert.ok(tracerWeapon('mg34')&&!tracerWeapon('kar98k')&&!tracerWeapon('kb_wz29')&&!tracerWeapon('ally_rifle')&&!tracerWeapon('rkm_wz28')&&!tracerWeapon('ckm_wz30')&&!tracerWeapon(undefined));
  const range=300;
  assert.equal(tracerDrawn(round(),.5,range),true);
  assert.equal(tracerDrawn(round({weapon:'kar98k'}),.5,range),false,'a rifle round marked as a tracer by the simulation is not drawn as one');
  assert.equal(tracerDrawn(round({tracer:false}),.5,range),false,'the renderer invents no tracer');
  assert.equal(tracerDrawn(round(),TRACER_BURN_IN_M/range-.001,range),false,'nothing in the first metres');
  assert.equal(tracerDrawn(round(),TRACER_BURN_IN_M/range,range),true);
  assert.equal(tracerDrawn(round(),-.01,range),false);assert.equal(tracerDrawn(round(),1.01,range),false);
});

test('tracer look: about 1 px wide, a short streak, dimmer in daylight and far away, never below the floor; quotas per tier keep Low readable',()=>{
  const f=(768/2)/Math.tan(70*Math.PI/360);
  for(const d of [100,300,600,1000]){
    const wpx=2*tracerHalfWidth(d)/(d/f),lpx=2*tracerHalfLength(d)/(d/f);
    assert.ok(wpx>=.9&&wpx<=1.5,`${d} m: ${wpx.toFixed(2)} px wide`);
    assert.ok(tracerHalfLength(d)<=3&&lpx>=2,`${d} m: ${lpx.toFixed(1)} px long, at most 6 m`);
  }
  assert.ok(tracerTint(0,200)>tracerTint(1,200)&&tracerTint(.5,200)>tracerTint(.5,1500));
  for(const day of [0,.5,1])for(const d of [0,500,5000])assert.ok(tracerTint(day,d)>=.35&&tracerTint(day,d)<=1);
  assert.deepEqual([tracerQuota('low'),tracerQuota('medium'),tracerQuota('high')],[6,12,20]);
  assert.ok(TRACER_QUOTA_BY_TIER.low>=6,'Low still draws a readable handful');
  assert.equal(tracerQuota('x'),TRACER_QUOTA_BY_TIER.low);
});

// ---------------------------------------------------------------- impacts: event -> pool
test('event -> impact: one pooled impact per ended round, at the end point, arriving after the flight at the gameplay round speed; no end, nothing to draw and hits are handled',()=>{
  const pool=new RoundImpactPool(),clock=100;
  const slot=scheduleRoundImpact(pool,shot(),clock,'earth',7);
  assert.ok(slot>=0);assert.equal(pool.scheduled,1);
  assert.deepEqual([pool.x[slot],pool.y[slot],pool.z[slot]],[850,0,42]);
  const fly=Math.hypot(850-600,0-1.4,42-40)/ROUND_SPEED;
  assert.ok(Math.abs(pool.at[slot]-(clock+fly))<1e-9,'arrives after the flight');
  assert.equal(pool.pending(clock),1);assert.equal(pool.live(clock),0,'not drawn before it arrives');assert.equal(pool.live(clock+fly+.01),1);
  assert.equal(pool.live(clock+fly+ROUND_IMPACT_PROFILE.earth.life+.01),0,'over after its life');
  // The rounds of the display-grade fire (R2-a, no end), of Kowal's rkm and of the rearguard carry no `end`: nothing is invented.
  assert.equal(scheduleRoundImpact(pool,shot({end:undefined,hit:undefined}),clock,'earth',1),-1);
  assert.equal(scheduleRoundImpact(pool,shot({end:{x:1,y:NaN,z:3}}),clock,'earth',1),-1);
  assert.equal(scheduleRoundImpact(pool,shot(),clock,null,1),-1,'a round that stopped in the air: nothing to show');
  assert.equal(scheduleRoundImpact(pool,shot(),clock,'nonsense',1),-1);
  assert.equal(pool.scheduled,1);
  // A round that struck its man is a faint body puff whatever the ground class was.
  const h=scheduleRoundImpact(pool,shot({hit:true}),clock,'earth',2);assert.equal(IMPACT_MATERIALS[pool.mat[h]],'body');
  // Every class has a profile and a slot index.
  for(const m of IMPACT_MATERIALS){const s=scheduleRoundImpact(new RoundImpactPool(),shot(),0,m==='body'?'earth':m,3);assert.ok(s>=0,m);}
});

test('pool bounds: it never grows, never evicts an impact that has not arrived, drops (counted) when every slot is pending, and recycles expired slots',()=>{
  const pool=new RoundImpactPool(8),now=50;
  for(let i=0;i<8;i++)assert.ok(pool.schedule(i,0,0,now+1+i*.1,0,i,now)>=0);
  assert.equal(pool.schedule(99,0,0,now+3,0,99,now),-1);assert.equal(pool.dropped,1,'every slot pending: the 9th is dropped, no pending impact is evicted');
  assert.equal(pool.slots,8);assert.equal(pool.x.length,8);
  // Once they have arrived the oldest is recycled.
  const s=pool.schedule(77,0,0,now+3,0,77,now+2);assert.ok(s>=0&&pool.x[s]===77);assert.equal(pool.scheduled,9);
  // Expired slots are recycled first.
  const late=now+20;for(let i=0;i<8;i++)pool.schedule(1000+i,0,0,late,1,i,late);
  assert.ok(pool.pending(late-.001)<=8&&pool.live(late+.01)<=8);
  pool.reset();assert.equal(pool.live(late),0);assert.equal(pool.scheduled,0);assert.equal(pool.dropped,0);
  assert.equal(IMPACT_POOL_SLOTS,64);
});

test('the draw: bounded by the tier, every class draws what its profile says, far away the dust keeps a pixel floor and chips are not spent, nothing is drawn before arrival',()=>{
  const cam={x:0,y:1.7,z:0},P={x:0,y:0,z:0},SC=[0,0,1],f=(768/2)/Math.tan(70*Math.PI/360);
  const calls={puff:0,spark:0,chip:0},put=name=>{calls[name]++;};
  const fill=n=>{const pool=new RoundImpactPool();for(let i=0;i<n;i++)pool.schedule(40+i*3,0,10,10,i%6,i+1,10);return pool;};
  for(const q of ['low','medium','high']){
    const pool=fill(64);calls.puff=calls.spark=calls.chip=0;
    assert.equal(drawRoundImpacts(pool,9.9,cam,70,768,q,put,P,SC),0,'before arrival');
    const n=drawRoundImpacts(pool,10.05,cam,70,768,q,put,P,SC);
    assert.equal(n,Math.min(IMPACT_DRAW_BY_TIER[q],pool.live(10.05)),`${q}: capped at ${IMPACT_DRAW_BY_TIER[q]}`);
    assert.ok(calls.puff+calls.spark+calls.chip>=n,`${q}: something per impact`);
    assert.ok(calls.puff<=n*3&&calls.chip<=n*3&&calls.spark<=n*3,'bounded per impact');
  }
  assert.ok(IMPACT_DRAW_BY_TIER.low>=14&&IMPACT_DRAW_BY_TIER.low<IMPACT_DRAW_BY_TIER.medium&&IMPACT_DRAW_BY_TIER.medium<IMPACT_DRAW_BY_TIER.high);
  // Counts by class / distance / tier.
  const E=IMPACT_MATERIALS.indexOf('earth'),M=IMPACT_MATERIALS.indexOf('metal'),W=IMPACT_MATERIALS.indexOf('wood');
  assert.equal(impactDustCount(M,10,'high'),0);assert.ok(impactSparkCount(M,10,'high')>=2&&impactSparkCount(M,10,'low')>=1);
  assert.equal(impactSparkCount(M,400,'high'),0,'sparks are sub-pixel far away');
  assert.ok(impactDustCount(E,20,'high')>impactDustCount(E,20,'low')||impactDustCount(E,20,'high')>=2);
  assert.equal(impactDustCount(E,500,'high'),1,'one puff far away');assert.equal(impactChipCount(W,500,'high'),0);assert.ok(impactChipCount(W,20,'low')>=1);
  // Pixel floor and near-field size.
  for(const d of [100,300,600,1000]){const px=2*impactPuffRadius(d,0,70,768)/(d/f);assert.ok(px>=IMPACT_MIN_PX-1e-9,`${d} m: ${px.toFixed(2)} px`);}
  assert.equal(impactPuffRadius(5,0,70,768),IMPACT_RADIUS_M*.6,'up close the puff is physical (a rifle round, not a shell)');
  assert.ok(impactPuffRadius(10,.9,70,768)>impactPuffRadius(10,0,70,768),'it grows as it ages');
});

test('no allocation per frame: the impact draw settles to zero heap growth over 30000 frames of a full pool',()=>{
  v8.setFlagsFromString('--expose_gc');const gc=vm.runInNewContext('gc');
  const pool=new RoundImpactPool(),cam={x:0,y:1.7,z:0},P={x:0,y:0,z:0},SC=[0,0,1];let sink=0;
  for(let i=0;i<64;i++)pool.schedule(30+i*5,0,i-30,10,i%IMPACT_MATERIALS.length,i,10);
  const put=(name,p,scale,dir,opacity,color)=>{sink+=p.x+(typeof scale==='number'?scale:scale[0])+opacity+(color||0);};
  const frame=i=>drawRoundImpacts(pool,10.02+(i%30)*.01,cam,70,768,'high',put,P,SC);
  for(let i=0;i<3000;i++)frame(i);
  gc();const before=process.memoryUsage().heapUsed;
  for(let i=0;i<30000;i++)frame(i);
  gc();const grown=process.memoryUsage().heapUsed-before;
  assert.ok(sink>0&&pool.lastDrawn>10,'it drew');assert.ok(grown<150*1024,`heap grew ${grown} bytes over 30000 frames`);
});

// ---------------------------------------------------------------- surface classification (the drawn-surface rule of the player's rounds)
test('classification of a round end reuses the drawn-surface rule: stone/brick colliders, wood, sandbags/earth, ground, water; a round that stopped in the air has nothing',()=>{
  const sim=new M01Simulation(1),w=sim.world,pick=m=>w.obstacles.filter(b=>b.material===m);
  const centre=(b,y)=>({x:(b.min.x+b.max.x)/2,y:y??(b.min.y+b.max.y)/2,z:(b.min.z+b.max.z)/2});
  const station=w.obstacles.find(b=>b.id==='station'),sandbag=w.obstacles.find(b=>b.id==='cv_sandbag_mid_1'),stone=pick('stone')[0],wood=pick('wood')[0];
  assert.equal(classifyRoundEnd(w,centre(station)),'brick');
  assert.equal(classifyRoundEnd(w,centre(sandbag)),'earth','sandbags are earth-class in the simulation and in the drawn-surface rule');
  assert.ok(['stone','brick'].includes(classifyRoundEnd(w,centre(stone))));
  assert.equal(classifyRoundEnd(w,centre(wood)),'wood');
  assert.equal(classifyRoundEnd(w,{x:300,y:w.terrainHeightAt(300,150),z:150}),'earth','terrain');
  assert.equal(classifyRoundEnd(w,{x:300,y:80,z:150}),null,'in the air');
  assert.equal(classifyRoundEnd(w,{x:NaN,y:0,z:0}),null);assert.equal(classifyRoundEnd(null,{x:0,y:0,z:0}),null);
  for(const b of [...pick('stone').slice(0,6),...pick('wood').slice(0,6)])assert.ok(IMPACT_MATERIALS.includes(classifyRoundEnd(w,centre(b))));
});

// ---------------------------------------------------------------- the view
function rig(quality,extra={}){
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),view=Object.create(M01View.prototype);
  Object.assign(view,{camera:(()=>{const c=new THREE.PerspectiveCamera(70,16/9);c.position.set(0,1.7,0);return c;})(),fireDummy:new THREE.Object3D(),fireColor:new THREE.Color(),characters:null,impacts:[],fireBatches:{},
    owner:{quality,canvas:{height:768}},lightingModel:{daylight:.5},...extra});
  for(const [name,n] of Object.entries({muzzle:96,tracer:48,puff:144,spark:96,smoke:64,chip:128}))view.fireBatches[name]=new THREE.InstancedMesh(geometry,material,n);
  return {view,dispose(){Object.values(view.fireBatches).forEach(b=>b.dispose());geometry.dispose();material.dispose();}};
}
const sim=(over={})=>({clock:10.2,actors:[],enemyFire:{rounds:[]},display:{rounds:[],fixed:{}},...over});

test('the view draws only MG34 tracers, capped by the tier (a crowd of 40 marked rounds), none for rifles; the old flash/impact paths still work',()=>{
  const rounds=[...Array(40).keys()].map(i=>round({id:`m${i}`,by:`de_east_${i}`,ox:700,oz:-20+i,ax:200,az:-20+i,firedAt:10,arriveAt:10.6,weapon:i%4===0?'kar98k':'mg34'}));
  const out={};
  for(const q of ['low','medium','high']){
    const r=rig(q);try{
      r.view.updateFire(sim({enemyFire:{rounds}}));out[q]=r.view.fx.tracer;
      const d=r.view.longRangeDiagnostics.tracers;
      assert.equal(d.drawn,out[q]);assert.equal(d.quota,tracerQuota(q));assert.ok(d.suppressed>=10,'the 10 rifle rounds marked as tracers are suppressed');
    }finally{r.dispose();}
  }
  assert.deepEqual([out.low,out.medium,out.high],[6,12,20]);
  const none=rig('high');try{
    none.view.updateFire(sim({enemyFire:{rounds:rounds.map(r=>({...r,weapon:'kar98k'}))}}));assert.equal(none.view.fx.tracer,0);
    none.view.updateFire(sim({enemyFire:{rounds:rounds.map(r=>({...r,tracer:false}))}}));assert.equal(none.view.fx.tracer,0);
  }finally{none.dispose();}
});

test('the view: a Polish round with an end point becomes one impact drawn on arrival, on every tier (Low included), and a restore clears it',()=>{
  for(const q of ['low','medium','high']){
    const r=rig(q);try{
      const world=new M01Simulation(1).world,ground={x:300,y:world.terrainHeightAt(300,150),z:150};
      const slot=r.view.longRangeShot(shot({point:{x:200,y:1.4,z:150},end:ground}),{world,clock:10});
      assert.ok(slot>=0);assert.equal(r.view.lastEndMaterial,'earth');
      const arrive=10+Math.hypot(100,1.4)/ROUND_SPEED;
      r.view.updateFire(sim({clock:arrive-.01}));assert.equal(r.view.fx.puff,0,'not before it arrives');
      r.view.updateFire(sim({clock:arrive+.1}));r.view.lastClock=arrive+.1;assert.ok(r.view.fx.puff>=1,`${q}: the dust is drawn`);
      assert.equal(r.view.longRangeDiagnostics.scheduled,1);assert.equal(r.view.longRangeDiagnostics.live,1);
      // An airborne end and a hit: the first draws nothing, the second a body puff.
      assert.equal(r.view.longRangeShot(shot({end:{x:300,y:90,z:150}}),{world,clock:11}),-1);assert.equal(r.view.lastEndMaterial,null);assert.equal(r.view.longRangeDiagnostics.airborne,1);
      assert.ok(r.view.longRangeShot(shot({hit:true}),{world,clock:11})>=0);assert.equal(r.view.lastEndMaterial,null,'a hit makes no ground thud');
      r.view.longRange.pool.reset();assert.equal(r.view.longRangeDiagnostics.live,0);
    }finally{r.dispose();}
  }
});

// ---------------------------------------------------------------- near miss: only when the simulation says so
test('near miss: the camera flinch and the crack come only from the simulation\'s mark (crack <= 6 m); a far impact flinches nothing, an impact close to the player a little',()=>{
  const fb=new M01CombatFeedback();
  fb.roundImpact({clock:1,distance:300,crack:false,weapon:'mg34'});assert.equal(fb.counts.nearMiss,0);assert.equal(fb.counts.nearImpact,0);
  fb.roundImpact({clock:2,distance:80,crack:false,weapon:'mg34'});assert.equal(fb.counts.nearMiss,0,'no mark, no near miss, however loud the fight');
  fb.roundImpact({clock:3,distance:20,crack:true,weapon:'mg34'});assert.equal(fb.counts.nearMiss,1);
  const s=fb.sample(3.05,'medium');assert.ok(s.nearMissImpulse>0&&s.shakeStrength>0&&s.shakeStrength<=.02,'a small, bounded camera flinch');
  assert.ok(fb.sample(3.05,'low').shakeStrength<s.shakeStrength,'smaller on Low, still present');
  // The sound of the pass is the simulation's too: the audio plans a crack only when asked to.
  assert.ok(planBulletPass('crack',{key:'a'}).some(g=>g.layer==='crack')&&planBulletPass('whizz',{key:'a'}).every(g=>g.layer!=='crack'));
});

// ---------------------------------------------------------------- audio planning
test('audio: the thud of a landed round is immediate only in the close band, then delayed by distance/343 after the flight, and inaudible beyond the mid band',()=>{
  assert.equal(IMPACT_IMMEDIATE_M,45);assert.equal(acousticBand(IMPACT_IMMEDIATE_M-.01),'close');assert.equal(acousticBand(IMPACT_IMMEDIATE_M+.01),'mid');
  assert.ok(IMPACT_AUDIBLE_M>IMPACT_IMMEDIATE_M&&IMPACT_AUDIBLE_M<=220);
  const near=roundImpactSoundPlan(20,100);assert.deepEqual([near.audible,near.immediate,near.at,near.band],[true,true,100,'close']);
  const mid=roundImpactSoundPlan(120,100);assert.deepEqual([mid.audible,mid.immediate,mid.band],[true,false,'mid']);assert.ok(Math.abs(mid.at-(100+soundDelay(120)))<1e-12);
  const far=roundImpactSoundPlan(IMPACT_AUDIBLE_M+1,100);assert.equal(far.audible,false);
  // A Polish round: the flight comes first, then the sound; never immediate even if it landed close.
  const polish=roundImpactSoundPlan(30,100,.25);assert.equal(polish.immediate,false);assert.ok(Math.abs(polish.at-(100+.25+soundDelay(30)))<1e-12);
  // Monotonic: farther is later.
  let prev=-1;for(const d of [50,80,110,140,160]){const p=roundImpactSoundPlan(d,0);assert.ok(p.at>prev);prev=p.at;}
  assert.equal(roundImpactSoundPlan(NaN,5).audible,true,'a bad distance is treated as 0, not as silence');
});

test('audio: a supersonic round is heard (crack) before the muzzle report of the same shot; the report waits distance/343 s',()=>{
  for(const d of [100,300,700,1200]){
    const crackAt=d/ROUND_SPEED,reportAt=soundDelay(d);
    assert.ok(ROUND_SPEED>343);assert.ok(crackAt<reportAt,`${d} m: crack ${crackAt.toFixed(2)} s before the report ${reportAt.toFixed(2)} s`);
  }
  // The impact thud of a near round is a different, softer sound from the crack; each material has a plan with grains at 30 m.
  for(const m of ['earth','stone','brick','wood','metal','water'])assert.ok(planImpact(m,30,{key:'k'}).length>=2,m);
});

test('audio: the German grenade throw is a short, quiet plan heard near only, deterministic by key, richer up close, with a recorded event',()=>{
  assert.ok(GRENADE_THROW_AUDIBLE_M>=60&&GRENADE_THROW_AUDIBLE_M<=150);
  const p=grenadeThrowSoundPlan(40,200);assert.deepEqual([p.audible,p.band],[true,'close']);assert.ok(Math.abs(p.at-(200+soundDelay(40)))<1e-12);
  assert.equal(grenadeThrowSoundPlan(GRENADE_THROW_AUDIBLE_M+5,200).audible,false);
  const a=planGrenadeThrow(20,{key:'x'}),b=planGrenadeThrow(20,{key:'x'}),c=planGrenadeThrow(20,{key:'y'}),far=planGrenadeThrow(100,{key:'x'});
  assert.deepEqual(a,b);assert.notDeepEqual(a,c);
  assert.ok(a.some(g=>g.layer==='igniter-pop')&&a.some(g=>g.layer==='cord-click')&&a.some(g=>g.layer==='fuse-hiss'));
  assert.ok(!far.some(g=>g.layer==='fuse-hiss')&&far.length<a.length,'far: no fuse hiss');
  const total=Math.max(...a.map(g=>g.at+g.dur));assert.ok(total<.5,`short: ${total.toFixed(2)} s`);
  assert.ok(a.every(g=>g.vol>0&&g.vol<=.12),'quiet: a throw is not a shot');
  const ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx});assert.equal(audio.init(),true);
  const before=audio.events.get('grenade-throw')??0;audio.grenadeThrow(.3,25,'t1',1);
  assert.equal(audio.events.get('grenade-throw'),before+1);
});

// ---------------------------------------------------------------- the real route (control pilot): the sim's own events through the mapping
test('sampled real route (control): every Polish round that ended maps to exactly one impact (or a counted airborne/hit), the pool stays bounded, and the MG34 tracer cadence is the simulation\'s',()=>{
  const pool=new RoundImpactPool(),seen=new Set(),mg=new Map(),byClass={};let ended=0,hits=0,airborne=0,scheduled=0,pendingPeak=0,rifleTracerMarks=0,drawnTracers=0;
  const events={grenades:0,tactics:0};
  route(19390901,{support:false,onStep:({sim:s,events:emitted})=>{
    for(const e of emitted){
      if(e.type==='enemy-grenade')events.grenades++;
      if(e.type==='deck-tactic')events.tactics++;
      if(e.type!=='npc-shot'||!e.end)continue;
      ended++;
      const material=e.hit?'earth':classifyRoundEnd(s.world,e.end);
      const slot=scheduleRoundImpact(pool,e,s.clock,material,ended);
      if(e.hit){hits++;assert.ok(slot>=0||pool.dropped>0);}
      else if(material===null){airborne++;assert.equal(slot,-1);}
      else{assert.ok(slot>=0||pool.dropped>0,'one impact for a round that ended on a surface');byClass[material]=(byClass[material]??0)+1;}
      if(slot>=0)scheduled++;
    }
    pendingPeak=Math.max(pendingPeak,pool.pending(s.clock));assert.ok(pool.live(s.clock)<=pool.slots);
    for(const r of s.enemyFire.rounds){
      if(seen.has(r.id))continue;seen.add(r.id);
      if(r.weapon==='mg34'){(mg.get(r.by+'@'+Math.round(r.firedAt*4))??mg.set(r.by+'@'+Math.round(r.firedAt*4),[]).get(r.by+'@'+Math.round(r.firedAt*4))).push(r);}
      if(r.tracer&&r.weapon!=='mg34')rifleTracerMarks++;
      if(r.tracer&&tracerDrawn(r,.5,Math.hypot(r.ax-r.ox,r.az-r.oz)+TRACER_BURN_IN_M*2))drawnTracers++;
    }
  }});
  const mgRounds=[...mg.values()].flat(),marked=mgRounds.filter(r=>r.tracer).length;
  console.log(`route: ${ended} ended Polish rounds (${hits} hit, ${airborne} airborne, ${scheduled} pooled, dropped ${pool.dropped}), classes ${JSON.stringify(byClass)}, pending peak ${pendingPeak}; MG34 rounds ${mgRounds.length}, tracer-marked ${marked}; rifle-marked ${rifleTracerMarks}; grenades ${events.grenades}, tactics ${events.tactics}`);
  assert.ok(ended>=5,`the section really fires on the control route (${ended})`);
  assert.equal(scheduled+pool.dropped+airborne,ended,'every ended round is accounted for: pooled, dropped (counted) or in the air');
  assert.ok(pendingPeak<=pool.slots&&pool.slots===IMPACT_POOL_SLOTS);
  assert.ok(Object.keys(byClass).length>=1&&Object.keys(byClass).every(k=>IMPACT_MATERIALS.includes(k)));
  // MG34 belts: the simulation marks one traced round per burst of 4..7 (and 7 for the cover bursts), so the share of drawn tracers among MG34 rounds is about 1 in 5.
  if(mgRounds.length>=20){const share=marked/mgRounds.length;assert.ok(share>.08&&share<.35,`MG34 tracer share ${share.toFixed(3)}`);}
  assert.equal(drawnTracers,marked,'every MG34 round the simulation marked is drawable, and no marked rifle round is');
  assert.ok(rifleTracerMarks>=0);
});
