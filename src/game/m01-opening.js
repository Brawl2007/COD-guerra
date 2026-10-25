// M01 opening life, Act I (R1-b, 2026-10-25; golden amendment 20). Owner order: «rebuild the mission opening to convey that the war begins at 04:34». Until now the four minutes before the first bomb were a
// row of men standing still: the section stood behind its sandbags in one idle, the sappers knelt on the ground «hammering» a cable nobody had cut, the garrison stood where the bombs would fall, and the
// only life was six yard actors on fixed 45 s loops. Now every Polish soldier near the player's opening route is doing something that fits the minute, the news that reaches the post makes the post change,
// and the planes make every man react, each in his own way and at his own moment, before the first bomb.
//   calm     from the first tick: alert, but busy. The sergeant reads his map and glasses the east, Kowal cleans the rkm, Bąk drinks his coffee, Pawlak listens at the field telephone, the platoon voice
//            smokes, the garrison men check ammunition and rifles or watch the accesses through binoculars, the ckm crew checks its belt and lays the gun, the medic checks his kit, the sappers walk the
//            cable that is not cut yet, kneel at a joint and test it, a runner takes the sergeant's messages along the line.
//   warned   evt_m01_railway_worker_report (04:31, the telephone call from Szymankowo and then the dead line): Pawlak finds the line dead, the sergeant orders eyes to the east, the runner carries the
//            word along the line (and each man he reaches is on alert at once), the men who were relaxing put their cups out and take up their glasses.
//   planes   evt_m01_planes_heard (04:33:10, or the delivery of the message): each man reacts after a delay of his own: looks up, points, shouts, braces; the sappers go home (R1-a then takes them to cover),
//            the runner runs back to his post, Nowicki looks up and points and then runs for the sappers (dlg_m01_012 / 013 / 066).
//   raid     evt_m01_bombing_0434: the record ends and the acts with it; the bombs (R1-a) and the section (R2-a) take the men from where they stand.
// Nothing here is a loop on a clock: each man is a small machine of his own. He holds an act for a time drawn from his OWN stream (`act.rng`, derived from the state of the main stream when his act
// is created, never drawn from it), picks the next from the weights of the tension he is in (never the same act twice running), reacts to a change of tension after a delay drawn from the same stream,
// and a man who is walking (the runner, the sapper team) is steered by the simulation's own A* walk (moveActor). No two neighbours are in step, and nothing is drawn from the main stream. An order that is
// not the opening's own is never overridden: a man somebody else sends away (the scripted run of Nowicki, a test) is not the opening's until he stops, and a sapper with a target of that kind lets the whole team go.
// The simulation stores data only: `actor.act` ({k, at, until, ...}) says what a man is doing; the renderer draws it (clip, props, hands: src/render/m01-opening-pose.js, m01-opening-kit.js). Certainty:
// that the men of the post were occupied like this is RECONSTRUCTED from the general picture of the night (HISTORICAL_RESEARCH.md §1-3: a post on alert, the Szymankowo warning T13); every act, every
// man and every minute is GAMEPLAY_DRAMATIZATION. No act is a procedure of demolition (HISTORICAL_RESEARCH.md §79).
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import {barkTrigger} from './m01-barks.js';

const seconds=text=>{const v=text.split(':').map(Number);if(v.length===2)v.push(0);return v.reduce((n,x)=>n*60+x,0);};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

export const OPENING_VERSION=1;
/** The tensions, in order: the plans are chosen by name. `raid` ends the record. */
export const TENSIONS=Object.freeze(['calm','warned','planes']);
/**
 * The vocabulary of acts. `crouch`: he kneels (the simulation's `crouched`); `face`: where he looks (`east` the bridges, `courier`, `recipient`, else his own base facing) and `scan` the half width in
 * radians of the glances he takes around it; `walk`: the simulation walks him; `hook`: what the act says when it begins (a bark trigger); `repeat`: it may follow itself. The renderer
 * (m01-opening-pose.js) knows the same names.
 */
export const OPENING_ACTS=Object.freeze({
  idle:{},map:{},binoculars:{face:'east',scan:.55},smoke:{},coffee:{},clean_rkm:{},rifle_check:{},phone:{},phone_dead:{hook:'phone_dead'},
  ammo_check:{},track_check:{crouch:true},aid_kit:{},ckm_scan:{},ckm_belt:{hook:'ammo'},ckm_up:{},
  order:{face:'courier',hook:'order'},look_up:{face:'east'},point:{face:'east'},shout:{face:'east'},brace:{face:'east',scan:.25,repeat:true},cover:{crouch:true,face:'east',scan:.3,repeat:true},
  errand:{walk:true},deliver:{face:'recipient',hook:'deliver'},cover_run:{walk:true},
  cable_walk:{walk:true},cable_inspect:{crouch:true,face:'west'},cable_hold:{crouch:true,face:'leader'},cable_wait:{crouch:true},cable_watch:{crouch:true,face:'east',scan:.5},home:{walk:true},
});
const ACT_KEYS=Object.freeze(['k','at','until','rng','n','b','tn','s','hx','hz']);
const ACT_OPTIONAL=Object.freeze(['f','to','spd','w']);
const RECORD_KEYS=Object.freeze(['v','flags','courier','sap']);
const COURIER_LEGS=Object.freeze(['post','run','deliver','back','cover']);
const SAP_LEGS=Object.freeze(['rest','out','inspect','back','home']);
const OPEN_SEC=60;   // an act that lasts until something happens (a walk, a wait) is renewed every tick and never ends more than this far ahead

/**
 * The plan as mission data (mission.json `openingLife`), validated when the module loads (a typo or an act the renderer does not know stops the game, like the other plans).
 * Returns the frozen plan: the men with their weighted lists per tension, the runner's errands, the sapper team's walk.
 */
export function openingPlan(def=definition){
  const fail=m=>{throw new Error(`M01 opening life: ${m}`);},o=def.openingLife;
  if(!o)fail('mission.json needs `openingLife`');
  if(o.version!==OPENING_VERSION)fail('version');
  if(o.classification!=='GAMEPLAY_DRAMATIZATION'||o.presence!=='RECONSTRUCTED')fail('classification: GAMEPLAY_DRAMATIZATION, presence RECONSTRUCTED');
  const num=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi,pair=(v,lo,hi)=>Array.isArray(v)&&v.length===2&&num(v[0],lo,hi)&&num(v[1],v[0],hi);
  const events=new Set(def.events.map(e=>e.id)),ids=new Set([...def.cast.map(c=>c.id),...(def.westGarrison?.soldiers??[]).map(s=>s.id)]);
  for(const k of ['alert','planes','raid'])if(!events.has(o.events?.[k]))fail(`events.${k} is not an event`);
  if(!pair(o.reactSec,0,6))fail('reactSec [lo, hi] 0-6 s');
  const men={};
  for(const [id,m] of Object.entries(o.men??{})){
    if(!ids.has(id))fail(`${id}: not a cast member or a garrison man`);
    if(m.driver!==undefined&&!['courier','sappers'].includes(m.driver))fail(`${id}: driver`);
    if(m.react!==undefined&&!pair(m.react,0,6))fail(`${id}: react`);
    const plans={};
    if(m.driver!=='sappers'){
      for(const t of TENSIONS){
        const list=m[t];if(t==='calm'&&!Array.isArray(list))fail(`${id}: a calm plan`);
        if(list===undefined)continue;
        if(!Array.isArray(list)||!list.length)fail(`${id}.${t}`);
        plans[t]=Object.freeze(list.map(e=>{
          if(!Array.isArray(e)||e.length<3||e.length>4||!Object.hasOwn(OPENING_ACTS,e[0])||OPENING_ACTS[e[0]].walk||!num(e[1],.01,100)||!pair(e[2],.5,60)||(e[3]!==undefined&&!['first','afterLine','delivered','undelivered'].includes(e[3])))
            fail(`${id}.${t}: [act, weight, [lo, hi] s, first|afterLine|delivered|undelivered]`);
          return Object.freeze({act:e[0],w:e[1],sec:Object.freeze([...e[2]]),...(e[3]==='first'||e[3]==='afterLine'?{first:true}:{}),...(e[3]==='afterLine'||e[3]==='delivered'||e[3]==='undelivered'?{when:e[3]}:{})});
        }));
      }
      if(plans.calm.every(e=>e.first))fail(`${id}: a calm plan of only first acts`);
    }
    men[id]=Object.freeze({...(m.driver?{driver:m.driver}:{}),...(m.react?{react:Object.freeze([...m.react])}:{}),plans:Object.freeze(plans)});
  }
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  const driverOf=name=>Object.entries(men).filter(([,m])=>m.driver===name).map(([id])=>id);
  // the runner
  const c=o.courier;
  if(driverOf('courier').length!==1)fail('exactly one man has driver `courier`');
  if(!c||!num(c.speed,2,7)||!num(c.coverSpeed,2,8)||!pair(c.deliverSec,1,8)||!Array.isArray(c.errands)||!c.errands.length)fail('courier: speed, coverSpeed, deliverSec, errands');
  const errands=c.errands.map((e,i)=>{
    if(typeof e.id!=='string'||(e.after!==undefined&&e.after!=='order')||!pair(e.afterSec,0,60)||!Array.isArray(e.stops)||!e.stops.length||e.stops.some(s=>!ids.has(s.to)||!point(s.at)))fail(`courier.errands[${i}]`);
    return Object.freeze({id:e.id,after:e.after??null,afterSec:Object.freeze([...e.afterSec]),stops:Object.freeze(e.stops.map(s=>Object.freeze({to:s.to,at:Object.freeze({x:s.at[0],z:s.at[1]})})))});
  });
  const courier=Object.freeze({id:driverOf('courier')[0],speed:c.speed,coverSpeed:c.coverSpeed,deliverSec:Object.freeze([...c.deliverSec]),errands:Object.freeze(errands)});
  // the sapper team
  const s=o.sappers,group=def.groups.find(g=>g.id==='grp_sappers');
  if(driverOf('sappers').length!==3)fail('three men have driver `sappers`');
  if(!s||[s.leader,s.helper,s.watch].some(id=>!group.members.includes(id))||new Set([s.leader,s.helper,s.watch]).size!==3||driverOf('sappers').some(id=>![s.leader,s.helper,s.watch].includes(id)))fail('sappers: leader, helper and watch are the three members of grp_sappers');
  if(!num(s.speed,.6,3)||!num(s.homeSpeed,1,5)||!pair(s.restSec,2,120)||!pair(s.inspectSec,2,60)||!num(s.followM,1,5)||!Array.isArray(s.stops)||!s.stops.length||!s.stops.every(point))fail('sappers: speed, homeSpeed, restSec, inspectSec, followM, stops');
  if(s.releaseAt!==group.stage?.shelter?.from)fail('sappers.releaseAt is the time the shelter of grp_sappers.stage begins');
  const sappers=Object.freeze({leader:s.leader,helper:s.helper,watch:s.watch,release:seconds(s.releaseAt),speed:s.speed,homeSpeed:s.homeSpeed,restSec:Object.freeze([...s.restSec]),inspectSec:Object.freeze([...s.inspectSec]),
    followM:s.followM,stops:Object.freeze(s.stops.map(([x,z])=>Object.freeze({x,z})))});
  // Nowicki: a short reaction at the post before he runs for the sappers
  const pr=o.planesRun;
  if(!pr||!men[pr.man]||!num(pr.afterSec,0,12))fail('planesRun: { man, afterSec }');
  return Object.freeze({events:Object.freeze({...o.events}),reactSec:Object.freeze([...o.reactSec]),men:Object.freeze(men),order:Object.freeze(Object.keys(men)),courier,sappers,planesRun:Object.freeze({man:pr.man,afterSec:pr.afterSec})});
}
export const OPENING=openingPlan();
const SAPPER_IDS=Object.freeze([OPENING.sappers.leader,OPENING.sappers.helper,OPENING.sappers.watch]);
const ZIELINSKI='marek_zielinski';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Streams: the same LCG as the combat AI and the section, one per man, derived from the state of the main stream (read, never drawn).
const openingSeed=(state,index)=>Math.imul(((state>>>0)^0x0b3a71c3)+Math.imul(index+1,0x9e3779b9)|0,2654435761)>>>0;
const nextU=st=>{st.rng=(Math.imul(1664525,st.rng)+1013904223)>>>0;return st.rng/4294967296;};
const between=(st,[lo,hi])=>lo+(hi-lo)*nextU(st);
const seedOf=st=>(nextU(st)*4294967296)>>>0;
/** Independent uniform sample of (seed, salt), for the glances of a scan: a pure function of the act's own seed and the second. */
const unitOf=(seed,salt)=>{let h=(seed^Math.imul(salt+1,0x9e3779b1))>>>0;h^=h>>>16;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>13;h=Math.imul(h,0xc2b2ae35)>>>0;h^=h>>>16;return (h>>>0)/4294967296;};

/** 0 calm, 1 warned, 2 planes, 3 raid: a pure function of the consumed events. */
export const tensionOf=sim=>sim.consumedEvent(OPENING.events.raid)?3:sim.consumedEvent(OPENING.events.planes)?2:sim.consumedEvent(OPENING.events.alert)?1:0;
/** True until the first bomb of 04:34 and never at the roll call: the record lives only here. */
export const openingOn=sim=>!sim.consumedEvent(OPENING.events.raid)&&sim.mission.phase!=='OUTRO';
const usable=a=>Boolean(a)&&a.alive&&a.active&&!a.carriedBy&&a.state!=='WOUNDED'&&a.state!=='DOWN';

/** A fresh record. The act of each man is on the man (actor.act); this keeps what belongs to nobody in particular. */
export function newOpening(){
  return {v:OPENING_VERSION,flags:{},courier:{leg:'post',e:0,s:0,at:-1,since:0},sap:{leg:'rest',k:0,at:0,until:0}};
}
/** A fresh act for a man the opening meets: a short beat of idle (a different one for each man: nobody starts in step), his stream, his base facing and the place he is sent back to. */
function newAct(sim,a,tn){
  const index=OPENING.order.indexOf(a.id),st={k:'idle',at:sim.clock,until:0,rng:openingSeed(sim.rng.state,index),n:0,b:a.facing,tn,s:0,hx:a.x,hz:a.z};
  st.until=sim.clock+between(st,[.2,4.5]);st.s=seedOf(st);
  return st;
}
const home=a=>({x:a.act.hx,z:a.act.hz});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * The step: once per tick before the men walk (updateActors). Returns the record (null outside the window). Decisions only: the walking of the sapper team is done by openingWalk (the simulation's
 * loop) and the runner's here, through moveActor.
 */
export function updateOpening(sim,dt){
  if(!openingOn(sim)){if(sim.timers.opening)endOpening(sim);return null;}
  const q=sim.timers.opening??=newOpening();
  const tn=tensionOf(sim),clock=sim.clock;
  // Nowicki's reaction at the post: the run to the sappers (the old immediate order of evt_m01_planes_heard) starts planesRun.afterSec seconds after the planes are heard
  if(q.flags.nowickiAt!==undefined&&clock>=q.flags.nowickiAt+OPENING.planesRun.afterSec){
    const n=sim.actor(OPENING.planesRun.man);delete q.flags.nowickiAt;q.flags.nowickiGone=true;
    if(n){if(n.act)releaseAct(n);if(n.alive&&n.active&&!n.carriedBy)n.target=sim.world.point('repair_site_1');}
  }
  for(const id of OPENING.order){
    const a=sim.actor(id),plan=OPENING.men[id];
    if(!a)continue;
    // a man the opening has let go (the sappers at their shelter, Nowicki on his run) is not met again
    if(plan.driver==='sappers'&&q.flags.sapReleased||q.flags.nowickiGone&&id===OPENING.planesRun.man)continue;
    if(!usable(a)){if(a.act)releaseAct(a);continue;}
    if(!a.act)a.act=newAct(sim,a,tn);
    if(plan.driver==='sappers')continue;   // the team's own machine below
    stepMan(sim,q,a,plan,tn);
  }
  stepCourier(sim,q,tn,dt);
  stepSappers(sim,q,tn);
  return q;
}
/** The window is over (the first bomb): every act ends, the record goes; the men are where they are and the bombs and the section take them from there. The sappers are not touched: the shelter has them. */
export function closeOpening(sim){if(sim.timers.opening)endOpening(sim);}
function endOpening(sim){
  const q=sim.timers.opening;if(q&&!q.flags.sapReleased)releaseSappers(sim,q);   // (a bomb before the shelter time, in a test: the team is let go where it stands)
  for(const id of OPENING.order){const a=sim.actor(id);if(a?.act)releaseAct(a);}
  const c=sim.actor(OPENING.courier.id);if(c&&c.target&&!c.task){c.target=null;delete c.nav;c.state='GUARD';}
  delete sim.timers.opening;
}
function releaseAct(a){delete a.act;}   // (the posture stays as it is: a man kneeling in cover when the bombs begin stays down; nobody stands up for the first bomb)

/** What a man does next, by the weights of the tension he is in: never the act he has just had (unless it may repeat), the `first` act of a tension before any other, `when` the news has come or the message is delivered. */
function pickAct(sim,q,st,plan,tn){
  const list=plan.plans[TENSIONS[Math.min(tn,2)]]??plan.plans.calm;
  const delivered=sim.done('deliver_message'),line=q.flags.lineDead!==undefined&&sim.clock-q.flags.lineDead>=1;
  const ok=list.filter(e=>e.when===undefined||(e.when==='afterLine'?line:(e.when==='delivered')===delivered));
  const first=ok.find(e=>e.first&&(st.f??-1)<tn);
  if(first){st.f=tn;return first;}
  const rest=ok.filter(x=>!x.first),fresh=rest.filter(x=>x.act!==st.k||OPENING_ACTS[x.act].repeat),pool=fresh.length?fresh:rest.length?rest:ok;
  let total=0;for(const x of pool)total+=x.w;
  let u=nextU(st)*total,e=pool[pool.length-1];
  for(const x of pool){if(u<x.w){e=x;break;}u-=x.w;}
  return e;
}
function startAct(sim,q,a,st,k,sec){
  st.k=k;st.at=sim.clock;st.until=sim.clock+sec;st.n++;st.s=seedOf(st);delete st.to;delete st.w;
  hook(sim,q,a,st);
}
function stepMan(sim,q,a,plan,tn){
  const st=a.act,clock=sim.clock;
  if(a.target&&plan.driver!=='courier'&&dist(a,a.target)>=.8)return;   // somebody else is sending him (the scripted run of Nowicki): he is not ours until he stops (the runner is walked by nobody but stepCourier: the garrison is display-only)
  if(tn>st.tn){   // the tension rose: he reacts after a delay of his own
    st.tn=tn;st.until=Math.min(st.until,clock+between(st,plan.react??OPENING.reactSec));
  }
  if(plan.driver==='courier'&&q.courier.leg!=='post')return;   // out on an errand: the runner's machine decides
  if(clock>=st.until){const e=pickAct(sim,q,st,plan,Math.max(st.tn,tn));startAct(sim,q,a,st,e.act,between(st,e.sec));}
  applyAct(sim,a,st);
}
/**
 * The effects of the act on the man, every tick: kneeling, and where he looks. The facing is written when the act's own wish changes (`act.w`, the yaw last wished), not every tick: whatever turns a man
 * meanwhile (a scripted turn, a later system, a test) is respected until the act wants something else, and a man who only stands keeps the very bits of the facing he was given.
 */
function applyAct(sim,a,st){
  const def=OPENING_ACTS[st.k];
  if(def.walk)return;
  a.crouched=Boolean(def.crouch);
  let yaw=st.b;
  if(def.face==='east')yaw=0;
  else if(def.face==='courier'){const c=sim.actor(OPENING.courier.id);if(c&&usable(c)&&dist(a,c)<30)yaw=Math.atan2(c.z-a.z,c.x-a.x);}
  else if(def.face==='recipient'){const r=st.to&&sim.actor(st.to);if(r)yaw=Math.atan2(r.z-a.z,r.x-a.x);}
  else if(def.face==='west')yaw=Math.PI;
  else if(def.face==='leader'){const l=sim.actor(OPENING.sappers.leader);if(l&&l!==a)yaw=Math.atan2(l.z-a.z,l.x-a.x);}
  if(def.scan){   // glances: a new one every 2.2-3.8 s, from the act's own seed
    const t=sim.clock-st.at,g=2.2+1.6*unitOf(st.s,997),i=Math.floor(t/g);
    yaw+=(unitOf(st.s,i)*2-1)*def.scan;
  }
  if(Math.abs(yaw)>Math.PI)yaw=wrap(yaw);
  if(st.w!==yaw){a.facing=yaw;st.w=yaw;}
}
/**
 * The last metres of a walk that has to end ON a place (the runner at his post, a sapper at the camp: R1-a stands the garrison at its posts when the bombs fall, R3-a kneels the sappers at the cable).
 * moveActor stops 0.8 m short of its goal by design, so the rest is a short straight walk at the same pace and the man is set on the place itself. A place taken by somebody else's body is not forced:
 * he stays where he is. True when the walk is over.
 */
function arrive(sim,a,p,dt,speed){
  const d=dist(a,p);
  if(d>=.8){sim.moveActor(a,p,dt,speed);return false;}
  if(d<=1e-9)return true;
  if(sim.bodiesNear(a,p.x,p.z,1.2).some(b=>dist(b,p)<(a.radius+b.radius)*.8)){a.state='GUARD';return true;}
  const step=Math.min(d,speed*dt);
  if(step>=d){a.facing=Math.atan2(p.z-a.z,p.x-a.x);a.x=p.x;a.z=p.z;a.y=sim.world.heightAt(p.x,p.z);a.state='GUARD';return true;}
  a.facing=Math.atan2(p.z-a.z,p.x-a.x);a.state='ADVANCE';
  sim.world.move(a,Math.cos(a.facing)*step,Math.sin(a.facing)*step);
  return false;
}
/** Cuts a man's act short so that he picks the next at once (the sergeant turns to the telephone when the line is called dead). */
function poke(sim,id,sec,st=null){
  const a=sim.actor(id);if(!a?.act)return;
  const s=a.act;s.until=Math.min(s.until,sim.clock+between(st??s,sec));
}
/** What an act says when it begins: the bark director decides whether it is heard (the player within hearing, once, cooldowns). */
function hook(sim,q,a,st){
  const h=OPENING_ACTS[st.k].hook;if(!h)return;
  if(h==='phone_dead'){q.flags.lineDead=sim.clock;barkTrigger(sim,'opening',{node:'phone_dead',point:a});poke(sim,ZIELINSKI,[3.2,4.2],st);}   // (the order follows the line by 3.2-4.2 s: the director's follow-up gap is 2.6 s and dlg_m01_211 waits 2.7 s for dlg_m01_210)
  else if(h==='order'){q.flags.order=sim.clock;barkTrigger(sim,'opening',{node:'alert_order',point:a});}
  else if(h==='deliver')barkTrigger(sim,'opening',{node:'courier_report',point:a});
  else if(h==='ammo')barkTrigger(sim,'opening',{node:'ammo_report',point:a});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The runner: a garrison man of the strip who takes the sergeant's word along the line. His errands are mission data; he runs with the simulation's A* walk (moveActor), stops about 2 m from each man he
// has to tell, tells him (the man is on alert at once: he does not wait for the news to reach him) and goes back to his post. At the planes he runs back to it at once.
function stepCourier(sim,q,tn,dt){
  const C=OPENING.courier,a=sim.actor(C.id);if(!a||!a.act||!usable(a))return;
  const k=q.courier,st=a.act,clock=sim.clock,post=home(a);
  const go=(p,spd,leg)=>{k.leg=leg;a.target={x:p.x,z:p.z};delete a.nav;st.k=leg==='cover'?'cover_run':'errand';st.at=clock;st.until=clock+OPEN_SEC;st.spd=spd;delete st.to;delete st.w;};
  if(tn>=2&&k.leg!=='cover'&&k.leg!=='post'){go(post,C.coverSpeed,'cover');k.since=clock;}
  if(k.leg==='post'){
    // arm the next errand when its cause has come (control is given, or the sergeant has ordered the alert): a delay of the runner's own
    const e=C.errands[k.e];
    if(e&&k.at<0&&tn<2&&!sim.scene&&(e.after===null||q.flags[e.after]!==undefined))k.at=Math.max(clock,e.after?q.flags[e.after]:0)+between(st,e.afterSec);
    if(e&&k.at>=0&&clock>=k.at&&tn<2){k.s=0;k.since=clock;go(e.stops[0].at,C.speed,'run');}
    return;
  }
  const e=C.errands[Math.min(k.e,C.errands.length-1)];
  if(k.leg==='run'){
    sim.moveActor(a,a.target,dt,st.spd);
    const stop=e.stops[k.s];
    if(dist(a,stop.at)<1.3){
      k.leg='deliver';k.since=clock;a.target=null;delete a.nav;a.state='GUARD';
      st.k='deliver';st.at=clock;st.until=clock+between(st,C.deliverSec);st.to=stop.to;st.n++;st.s=seedOf(st);delete st.spd;delete st.w;
      alertMan(sim,stop.to);hook(sim,q,a,st);
    }
    return;
  }
  if(k.leg==='deliver'){
    applyAct(sim,a,st);
    if(clock>=st.until){
      if(k.s+1<e.stops.length){k.s++;go(e.stops[k.s].at,C.speed,'run');}
      else go(post,C.speed,'back');
    }
    return;
  }
  // back or cover: to his post, and onto it (the garrison stands at its posts when the bombs fall: R1-a)
  if(arrive(sim,a,post,dt,st.spd)){
    a.target=null;delete a.nav;a.state='GUARD';
    if(k.leg==='back'){k.e++;k.at=-1;}
    k.leg='post';k.s=0;delete st.spd;delete st.to;delete st.w;st.k='idle';st.at=clock;st.until=clock+between(st,[.6,2.4]);st.s=seedOf(st);
  }
}
/** A man the runner has told is on alert at once (the warned plan, after a reaction delay of his own), whatever the news has done so far. */
function alertMan(sim,id){
  const a=sim.actor(id),plan=OPENING.men[id];
  if(!a?.act||!usable(a)||!plan||plan.driver==='sappers')return;
  const st=a.act;
  if(st.tn<1){st.tn=1;st.until=Math.min(st.until,sim.clock+between(st,plan.react??OPENING.reactSec));}
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The sapper team before the bomb: the cable is not cut yet and they are checking it. The leader walks a few metres along the line, kneels at a joint and tests it with his meter, the helper follows with
// the coil and stands by, the watch stays at the camp and keeps his eyes on the east; then they go back to the camp and rest a while before the next joint. At the planes they go home, and from the shelter
// time of grp_sappers.stage (R1-a) the old logic takes them (sapperShelter). The camp is where grp_sappers.stage puts them at the start.
function stepSappers(sim,q,tn){
  const S=OPENING.sappers,sap=q.sap;
  if(q.flags.sapReleased)return;
  const [L,H,W]=[sim.actor(S.leader),sim.actor(S.helper),sim.actor(S.watch)],men=[L,H,W];
  if(sim.battleClock>=S.release||men.some(a=>!a||!a.act||!usable(a))){releaseSappers(sim,q);return;}
  // somebody else is sending one of the three (a scripted run, a system after this one, a test): the opening never overrides an order that is not its own, it lets the whole team go (the old camp and shelter
  // logic has them, target untouched), as it does for the man Nowicki's run belongs to (stepMan)
  if(men.some(a=>a.target&&!ownTarget(a))){releaseSappers(sim,q);return;}
  const clock=sim.clock,sl=L.act;
  for(const a of men)if(a.act.tn<tn)a.act.tn=tn;
  const goTo=(a,p,spd)=>{if(!a.target||Math.abs(a.target.x-p.x)>.01||Math.abs(a.target.z-p.z)>.01){a.target={x:p.x,z:p.z};delete a.nav;}a.act.spd=spd;};
  const setAct=(a,k)=>{const st=a.act;if(st.k!==k){st.k=k;delete st.w;st.at=clock;st.n++;st.s=seedOf(st);if(k!=='cable_walk'&&k!=='home')delete st.spd;}st.until=clock+OPEN_SEC;};
  const stay=a=>{if(a.target)a.target=null;delete a.nav;a.crouched=true;};   // (a man of the team who is let stand where he is kneels in this very tick: none of the three ever stands still)
  const helperAt=stop=>helperPlace(stop);
  const atHome=a=>dist(a,home(a))<1e-6||!a.target&&dist(a,home(a))<1;   // on the place, or stopped within a metre of it (a body is on it: openingWalk lets him be)
  if(tn>=2&&sap.leg!=='home'){sap.leg='home';sap.at=clock;}
  if(sap.leg==='rest'){
    if(sap.until===0)sap.until=clock+between(sl,S.restSec)*.5;
    for(const a of men)stay(a);
    setAct(L,'cable_wait');setAct(H,'cable_wait');setAct(W,'cable_watch');
    if(clock>=sap.until&&tn<2){sap.leg='out';sap.at=clock;sap.k=Math.floor(nextU(sl)*S.stops.length)%S.stops.length;}
  }else if(sap.leg==='out'){
    const stop=S.stops[sap.k],hp=helperAt(stop);
    goTo(L,stop,S.speed);setAct(L,'cable_walk');goTo(H,hp,S.speed);setAct(H,'cable_walk');setAct(W,'cable_watch');
    if(dist(L,stop)<.9&&dist(H,hp)<.9){sap.leg='inspect';sap.at=clock;sap.until=clock+between(sl,S.inspectSec);stay(L);stay(H);}
  }else if(sap.leg==='inspect'){
    setAct(L,'cable_inspect');setAct(H,'cable_hold');setAct(W,'cable_watch');
    if(clock>=sap.until){sap.leg='back';sap.at=clock;}
  }else if(sap.leg==='back'){
    for(const a of [L,H]){if(!atHome(a))goTo(a,home(a),S.speed);setAct(a,'cable_walk');}
    setAct(W,'cable_watch');
    if(atHome(L)&&atHome(H)){sap.leg='rest';sap.until=clock+between(sl,S.restSec);stay(L);stay(H);}
  }else{   // home: the planes are heard; back to the camp at a good pace and wait there (look up, then watch), until the shelter takes them
    for(const a of men){if(atHome(a)){stay(a);setAct(a,'cover');}else{goTo(a,home(a),S.homeSpeed);setAct(a,'home');}}
  }
}
/** Where the helper stands beside the leader at a joint of the cable. */
const helperPlace=stop=>({x:stop.x+OPENING.sappers.followM+.3,z:stop.z+.5});
/** True when a sapper's target is one the team machine gave him itself (a joint of the cable, the helper's place beside it, his place at the camp); any other target is somebody else's order. */
function ownTarget(a){
  const t=a.target;if(!t)return false;
  const at=p=>Math.abs(t.x-p.x)<.01&&Math.abs(t.z-p.z)<.01;
  return Boolean(a.act)&&at(home(a))||OPENING.sappers.stops.some(s=>at(s)||at(helperPlace(s)));
}
/** The team is let go: the acts end and the targets the machine gave end with them (a target that is somebody else's stays: the old logic walks him there). */
function releaseSappers(sim,q){
  q.flags.sapReleased=true;
  for(const id of SAPPER_IDS){const a=sim.actor(id);if(!a)continue;if(ownTarget(a)){a.target=null;delete a.nav;}if(a.act)releaseAct(a);}
}

/**
 * The generic loop's hook for the sapper team (updateActors, once per sapper before the old camp / shelter logic): while the opening holds the man he is walked here, at the pace of his act, and the
 * old logic does not run; true = handled. A man at his place has no target and is kneeling or standing as his act says (applyAct).
 */
export function openingWalk(sim,q,a,dt){
  if(!q||q.flags.sapReleased||!SAPPER_IDS.includes(a.id)||!a.act)return false;
  const st=a.act;
  if(a.target){
    a.crouched=false;
    const spd=st.spd??OPENING.sappers.speed,toCamp=a.target.x===st.hx&&a.target.z===st.hz;   // the camp is reached exactly; the joints of the cable within a metre
    const over=toCamp?arrive(sim,a,a.target,dt,spd):dist(a,a.target)<.8||(sim.moveActor(a,a.target,dt,spd),false);
    if(over){a.target=null;delete a.nav;a.state='GUARD';a.crouched=true;}   // a man of the team who stops kneels (at the camp, at a joint of the cable), in this very tick: none of the three ever stands still
  }else applyAct(sim,a,st);
  return true;
}

/** The delay of Nowicki's run: the event handler (planes_heard) asks the opening to hold him at the post for planesRun.afterSec; without a record the old immediate run stays. */
export function holdNowicki(sim){
  const q=sim.timers.opening;
  if(!q||!openingOn(sim)||q.flags.nowickiGone)return false;
  q.flags.nowickiAt=sim.clock;return true;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Read-only, never saved: what the renderer, the HUD and the tests ask for. */
export function openingView(sim){
  const q=sim.timers.opening;if(!q)return null;
  const acts={};
  for(const id of OPENING.order){const a=sim.actor(id);if(a?.act)acts[id]={act:a.act.k,at:a.act.at,until:a.act.until,to:a.act.to??null};}
  return {tension:TENSIONS[Math.min(tensionOf(sim),2)],acts,flags:{...q.flags},courier:{...q.courier},sap:{...q.sap}};
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
/** A saved timers.opening: the exact keys, a known leg, times the machine could have written. Pure check, for validateM01Snapshot. */
export function validateOpeningRecord(q,s,reject){
  const clock=s.clock,fin=(v,lo=0,hi=Infinity)=>Number.isFinite(v)&&v>=lo&&v<=hi,plain=v=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
  const bad=m=>reject('abertura '+m);
  if(!plain(q)||Object.keys(q).length!==RECORD_KEYS.length||RECORD_KEYS.some(k=>!Object.hasOwn(q,k))||q.v!==OPENING_VERSION)bad('registo');
  if(Object.hasOwn(s.consumed,OPENING.events.raid))bad('janela');   // the record ends with the first bomb
  const f=q.flags;
  if(!plain(f)||Object.keys(f).some(k=>!['lineDead','order','nowickiAt','nowickiGone','sapReleased'].includes(k))||
    ['lineDead','order','nowickiAt'].some(k=>f[k]!==undefined&&!fin(f[k],0,clock))||['nowickiGone','sapReleased'].some(k=>f[k]!==undefined&&f[k]!==true))bad('bandeiras');
  const c=q.courier;
  if(!plain(c)||Object.keys(c).length!==5||['leg','e','s','at','since'].some(k=>!Object.hasOwn(c,k))||!COURIER_LEGS.includes(c.leg)||!Number.isInteger(c.e)||c.e<0||c.e>OPENING.courier.errands.length||
    !Number.isInteger(c.s)||c.s<0||c.s>=Math.max(...OPENING.courier.errands.map(e=>e.stops.length))||!fin(c.at,-1,clock+120)||!fin(c.since,0,clock))bad('estafeta');
  const p=q.sap;
  if(!plain(p)||Object.keys(p).length!==4||['leg','k','at','until'].some(k=>!Object.hasOwn(p,k))||!SAP_LEGS.includes(p.leg)||!Number.isInteger(p.k)||p.k<0||p.k>=OPENING.sappers.stops.length||!fin(p.at,0,clock)||
    !fin(p.until,0,clock+OPENING.sappers.restSec[1]+OPENING.sappers.inspectSec[1]+5))bad('sapadores');
}
/** The act on a man (actor.act): the exact keys, a known act, a man the opening meets, times and a stream the machine could have written. */
export function validateOpeningAct(a,s,reject){
  const st=a.act,clock=s.clock,fin=(v,lo=0,hi=Infinity)=>Number.isFinite(v)&&v>=lo&&v<=hi;
  const bad=m=>reject(`acto ${a.id} ${m}`);
  if(!st||typeof st!=='object'||Array.isArray(st))bad('registo');
  if(ACT_KEYS.some(k=>!Object.hasOwn(st,k))||Object.keys(st).some(k=>!ACT_KEYS.includes(k)&&!ACT_OPTIONAL.includes(k)))bad('chaves');
  if(!OPENING.men[a.id]||s.timers?.opening===undefined)bad('sem registo');
  if(!Object.hasOwn(OPENING_ACTS,st.k)||!fin(st.at,0,clock)||!fin(st.until,st.at,clock+120)||!Number.isInteger(st.rng)||!fin(st.rng,0,0xffffffff)||!Number.isInteger(st.n)||st.n<0||
    !Number.isFinite(st.b)||!Number.isInteger(st.tn)||st.tn<0||st.tn>2||!Number.isInteger(st.s)||!fin(st.s,0,0xffffffff)||!Number.isFinite(st.hx)||!Number.isFinite(st.hz))bad('valores');
  if(st.f!==undefined&&(!Number.isInteger(st.f)||st.f<0||st.f>2))bad('first');
  if(st.to!==undefined&&(typeof st.to!=='string'||!/^[a-z0-9_]{1,40}$/.test(st.to)))bad('destinatário');
  if(st.spd!==undefined&&!fin(st.spd,0,8))bad('passo');
  if(st.w!==undefined&&!(Number.isFinite(st.w)&&Math.abs(st.w)<=Math.PI+1e-9))bad('olhar');
}
/** The data this module relies on (tests): every errand stop and every sapper stop is on free ground, a free way apart from the men it is for. */
export function openingDataErrors({blockedAt,heightAt,actors}){
  const errors=[],free=(x,z)=>!blockedAt(x,z,.35,heightAt(x,z));
  for(const e of OPENING.courier.errands)for(const s of e.stops){
    if(!free(s.at.x,s.at.z))errors.push(`${e.id}: the stop for ${s.to} (${s.at.x}, ${s.at.z}) is inside a solid`);
    const r=actors.find(a=>a.id===s.to);if(r){const d=dist(s.at,r);if(d<1.4||d>3.4)errors.push(`${e.id}: the stop for ${s.to} is ${d.toFixed(1)} m from him (1.4-3.4 m)`);}
  }
  for(const s of OPENING.sappers.stops){
    if(!free(s.x,s.z))errors.push(`sapper stop (${s.x}, ${s.z}) is inside a solid`);
    const h=helperPlace(s);if(!free(h.x,h.z))errors.push(`the helper's place at the stop (${s.x}, ${s.z}) is inside a solid`);
  }
  return errors;
}
