// M01 squad coordination, slice 4 (R2-a, owner complaint 2026-10-24: «aliados e inimigos mostram pouca inteligência; os polacos fazem pouco para contrariar o ataque; os aliados só
// coordenam na retirada»): the Polish section in the main combat, from the first bomb of 04:34 to the east demolition, on the machinery of slice 3 (m01-squad.js: the fire teams, the
// walk of moveActor with its A* navigator, the arrival rule, the squadMove callouts of the bark director, a saved record that is validated and absent in older saves).
//   spotting   the section's eyes (Zieliński at the rally, Pawlak and the platoon voice when they rise over the sandbags, Bąk on the deck) take turns to look. A German who fired in the last
//              noticeSec seconds and whom the watcher sees (the world's own line of sight, from the posture the man really has) is a NEW threat unless the section called him lately: the watcher
//              emits a `section-callout` (kind mg / gate / dike, the side of the gate as the player sees it, the caller, the target). The deck assault is read the same way from its phases
//              (kind deck / advance / fallback / down), and a man hit or killed (a bomb, Bąk) by the casualty queue (kind casualty). The bark director turns the event into a line.
//   reactions  every other man within hearing reacts, differently each time: a rifleman FIRES at the called German (display-grade rifle fire: the flash, the report, the clip and the
//              animation of the rearguard's rifle shot, but no round is traced and no German is pinned or hurt, so the fights the golden routes pin keep every German decision), LOOKS (stands
//              and turns to him) or DROPS (kneels); Kowal and the sergeant turn to look. Which one is drawn from the man's own stream.
//   orders     Zieliński adapts: «focus» when two kinds of threat are up (one German for everybody: every rifleman who can fires at him), «hold» (heads down: nobody rises to look for holdSec),
//              «shift» (the pair moves along the communication trench to another post when its post has been pinned for shiftLoad seconds within pinWindowSec) and «return», «deck» (at the
//              withdrawal of 06:00 the pair goes up to the road deck beside the player's post to cover the platoon and the deck assault) and «sector» (a man down: the nearest man takes his
//              side and turns to it). The pair walks with moveActor between slots beside authored cover nodes; at the east demolition the record ends and the retreat of slice 3 takes the men
//              from wherever they stand.
//   not touched  Kowal's cadence, his target and his posture, the ckm, every German decision and every draw of this.rng: the section's variety comes from five streams of its own
//              (rng, derived from the state of the main stream when the record starts, never drawn from it). What the Germans see of the Poles (Kowal alone is a target) is unchanged.
// State: timers.section (saved; created on the first tick of the window, absent in older saves, which get it at their next tick; validated by validateSectionRecord).
import {SQUAD} from './m01-squad.js';
import {DECK_ASSAULT} from './m01-deck-assault.js';
import {eyePosition} from '../world/spatial.js';
import {SECTION_CALLOUT_KINDS,SECTION_ORDER_KINDS} from './m01-audio-events.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const E=name=>`evt_m01_${name}`;
export const SECTION=Object.freeze({
  version:1,
  from:E('bombing_0434'),contact:E('train963_arrives'),withdrawal:E('east_platoon_withdraws'),deckFrom:E('germans_on_east_spans'),until:E('east_demolition'),
  leader:'marek_zielinski',rkm:'szymon_kowal',pair:SQUAD.teams[0],deck:'jozef_bak',
  men:Object.freeze(['marek_zielinski','szymon_kowal','staszek_pawlak','east_platoon_voice','jozef_bak']),
  // Own streams (the same LCG as the combat AI), one per man, derived from the main stream's STATE when the record starts. Indices 75.. are free of the AI's (0-39 gate, 40 Kowal, 41-50 deck, 51-74 platoon).
  streams:Object.freeze({marek_zielinski:75,szymon_kowal:76,staszek_pawlak:77,east_platoon_voice:78,jozef_bak:79}),
  // The eyes, in the order they take turns; a man who is dead, wounded, carried or busy does not look.
  watchers:Object.freeze(['marek_zielinski','staszek_pawlak','east_platoon_voice','jozef_bak']),
  // Who can call a casualty: the section, and the ckm crew, which is the nearest to the deck post.
  casualtyCallers:Object.freeze(['marek_zielinski','szymon_kowal','staszek_pawlak','east_platoon_voice','jozef_bak','ckm_gunner','ckm_loader','ckm_reserve']),
  scanSec:.45,noticeSec:2.4,rangeM:1300,deckRangeM:1100,hearM:160,
  repeatSec:Object.freeze({mg:40,gate:50,dike:60,pinned:45,casualty:12}),
  deckRepeatSec:Object.freeze({deck:1e9,advance:16,fallback:30,down:8}),
  calloutGapSec:5,
  // The pair rises over the sandbags to look: every `everySec` for `holdSec` (a man at the sandbags sees the gates only standing: the squad post hides a kneeling man from them).
  look:Object.freeze({everySec:Object.freeze([6,12]),holdSec:Object.freeze([1,1.8])}),
  // A rifleman's answer: after `delaySec`, 1 to 3 shots with the rifle's own bolt (`boltSec`), up on his feet riseSec before and holdSec after each. Display-grade (see the header).
  fire:Object.freeze({delaySec:Object.freeze([.4,1.1]),boltSec:Object.freeze([1.7,2.8]),riseSec:.5,holdSec:.9,count:Object.freeze([.5,.35,.15])}),
  dropSec:Object.freeze([1.5,3.5]),lookSec:Object.freeze([1,2.2]),holdLookSec:Object.freeze([0,6]),
  // What each kind of man does when he hears a call: weights [fire, look, drop]; the kinds with no German to shoot at give their share of «fire» to «look».
  react:Object.freeze({
    rifle:Object.freeze({mg:[.40,.35,.25],gate:[.50,.30,.20],dike:[.50,.25,.25],deck:[.60,.25,.15],advance:[.55,.30,.15],fallback:[.30,.50,.20],down:[.15,.55,.30],pinned:[0,.40,.60],casualty:[0,.60,.40]}),
    watch:Object.freeze({mg:[0,1,0],gate:[0,1,0],dike:[0,1,0],deck:[0,1,0],advance:[0,1,0],fallback:[0,1,0],down:[0,1,0],pinned:[0,1,0],casualty:[0,1,0]})}),
  role:Object.freeze({marek_zielinski:'watch',szymon_kowal:'watch',staszek_pawlak:'rifle',east_platoon_voice:'rifle',jozef_bak:'rifle'}),
  sayWindowSec:8,orderGapSec:7,orderAfterCallSec:1.6,pinWindowSec:18,shiftLoad:3.2,shiftGapSec:40,dwellSec:Object.freeze([14,26]),holdEverySec:Object.freeze([45,80]),holdSec:20,focusWindowSec:25,focusGapSec:40,
  stallSec:40,casHearM:70,casDelaySec:Object.freeze([1.2,2.4]),casOrderSec:Object.freeze([2.2,4]),casMax:6,pinMax:8,seenMax:16,
  // Posts of the pair, [x, z, facing] per man. 0 is the T38 slot at the squad post. 1 and 2 lie along the communication trench (cv_trench_2 12 m east, cv_trench_1 27 m east) just west of the node,
  // which gives the man the cover pose of the existing coverAt rule; 3 is the road deck, west of both pilots' posts (control (30, 40), support (38, 42.4)), on the south side of the lane: the platoon's
  // file runs along the north girder (z 37.8 - 38.15), the south side is the one left free for covering fire.
  posts:Object.freeze([null,
    Object.freeze({id:'trench_west',node:'cv_trench_2',slots:Object.freeze({staszek_pawlak:Object.freeze([-62.4,21.1,0]),east_platoon_voice:Object.freeze([-62.2,23.0,0])})}),
    Object.freeze({id:'trench_mid',node:'cv_trench_1',slots:Object.freeze({staszek_pawlak:Object.freeze([-47.2,13.9,0]),east_platoon_voice:Object.freeze([-47.0,16.2,0])})}),
    Object.freeze({id:'deck_post',node:null,slots:Object.freeze({staszek_pawlak:Object.freeze([20.5,41.3,0]),east_platoon_voice:Object.freeze([17.2,41.5,0])})})]),
  shiftPosts:Object.freeze([1,2]),deckPost:3,
  // The pocket of the squad post (see gateGoal): a gate waypoint north of the wall's end for each man (1.5 m apart: two men sent through one waypoint arrive together and stand inside each other, seed 1
  // at 05:55), and the thresholds that decide when a man goes through it.
  pocket:Object.freeze({gates:Object.freeze({staszek_pawlak:Object.freeze({x:-70.2,z:25.7}),east_platoon_voice:Object.freeze({x:-71.7,z:26.3})}),westX:-70,eastX:-69,releaseM:1}),
});
const SEEN_KEY=/^(mg:de_east_[01]|gate:[NS]|dike|deck:[a-z]+|pinned:[a-z_]+|casualty:[a-z0-9_]+)$/;
const KINDS=new Set(SECTION_CALLOUT_KINDS),ORDERS=new Set(SECTION_ORDER_KINDS);
const HOLD_KINDS=new Set(['look','drop']);
const RECORD_KEYS=Object.freeze(['v','rng','at','next','seen','deckSig','focus','shots','hold','pin','pins','post','order','cas','recent','done','say','n']);
const SAY_NODES=Object.freeze(['arrive_home','arrive_deck','arrive_trench']);
const AT_KEYS=['scan','callout','order','shift'],NEXT_KEYS=[...SECTION.pair,'hold','focus'],N_KEYS=['scans','callouts','orders','shifts','shots','casualties'];
const CAS_KEYS=['id','how','by','at','x','z','called','orderAt','done'];

/** The slot {x, z, facing} of man `id` at post k (post 0: his T38 slot, `stageSlots` of the simulation). */
export function sectionSlot(stageSlots,id,k){
  if(k===0){const s=stageSlots[id];return {x:s.x,z:s.z,facing:s.facing};}
  const [x,z,facing]=SECTION.posts[k].slots[id];return {x,z,facing};
}

/** True from the first bomb of 04:34 to the east demolition (the retreat of slice 3 takes over there). */
export const sectionOn=sim=>sim.consumedEvent(SECTION.from)&&!sim.consumedEvent(SECTION.until)&&sim.mission.phase!=='OUTRO';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The record and its streams
const sectionSeed=(state,index)=>Math.imul(((state>>>0)^0x5ec70a15)+Math.imul(index+1,0x9e3779b9)|0,2654435761)>>>0;
const next=(q,id)=>{const r=q.rng[id]=(Math.imul(1664525,q.rng[id])+1013904223)>>>0;return r/4294967296;};
const between=(q,id,[lo,hi])=>lo+(hi-lo)*next(q,id);
const t3=v=>+v.toFixed(3);
/** A fresh record, its streams derived from the state of the main stream (read, never drawn). Every key is always present. */
export function newSection(sim){
  const q={v:SECTION.version,rng:{},at:Object.fromEntries(AT_KEYS.map(k=>[k,-1e9])),next:{},seen:{},deckSig:'',focus:null,shots:[],hold:{},pin:{},pins:[],post:{},order:null,cas:[],recent:[],done:{deck:false},say:null,
    n:Object.fromEntries(N_KEYS.map(k=>[k,0]))};
  for(const id of SECTION.men)q.rng[id]=sectionSeed(sim.rng.state,SECTION.streams[id]);
  for(const id of SECTION.pair){q.post[id]={k:0,since:sim.clock,moving:false,until:0};q.next[id]=t3(sim.clock+between(q,id,SECTION.look.everySec));}
  q.next.hold=0;q.next.focus=sim.clock;   // (the hold agenda starts at the first shot of the Germans)
  return q;
}
const present=a=>Boolean(a)&&a.alive&&a.active&&!a.carriedBy&&a.state!=='WOUNDED'&&a.state!=='DOWN'&&!a.task;
const walking=a=>Boolean(a.target)&&dist(a,a.target)>=.8;
const standing=a=>({space:'metres',x:a.x,y:a.y,z:a.z,crouched:false});
const pairHome=q=>SECTION.pair.every(id=>q.post[id].k===0&&!q.post[id].moving);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The step: decisions, once per tick before the men walk (updateActors). Returns the record (null outside the window).
export function updateSection(sim,ctx){
  if(!sectionOn(sim)){if(sim.timers.section)endSection(sim);return null;}
  const q=sim.timers.section??=newSection(sim);
  // A man has reached his post: the director gets a few seconds to say so (a line that arrives while another is on screen waits for a gap instead of being lost).
  if(q.say&&(ctx.say(q.say.node)||sim.clock-q.say.at>SECTION.sayWindowSec))q.say=null;
  trackPins(sim,q);
  scheduleLooks(sim,q);
  watch(sim,q);
  handleCasualties(sim,q);
  decide(sim,q);
  return q;
}
/** The window is over: the pair that was shifted forward is left to the retreat of slice 3 (which walks every man of its teams from where he stands). */
function endSection(sim){
  const q=sim.timers.section;
  for(const id of SECTION.pair){const a=sim.actor(id),p=q.post?.[id];if(a&&p&&(p.k>0||p.moving)){a.target=null;delete a.nav;a.state='GUARD';}}
  delete sim.timers.section;
}
/** New suppression episodes of the pair (and of the rkm): the load that decides a shift; a pinned man of the pair also calls it. */
function trackPins(sim,q){
  const clock=sim.clock;
  for(const id of [...SECTION.pair,SECTION.rkm]){
    const a=sim.actor(id);if(!a)continue;
    const u=a.suppressedUntil,before=q.pin[id]??0;
    if(!(u>before+1e-9))continue;
    q.pin[id]=u;
    if(u>clock&&SECTION.pair.includes(id)){
      q.pins.push([clock,t3(u-clock)]);if(q.pins.length>SECTION.pinMax)q.pins.shift();
      const key=`pinned:${id}`;
      if(sim.consumedEvent(SECTION.contact)&&present(a)&&clock-q.at.callout>=SECTION.calloutGapSec&&clock-(q.seen[key]??-1e9)>=SECTION.repeatSec.pinned)callout(sim,q,a,'pinned',null,key);
    }
  }
}
const pinLoad=(q,clock)=>q.pins.reduce((s,[t,sec])=>clock-t<=SECTION.pinWindowSec?s+sec:s,0);
/** The pair rises over the sandbags now and then to look (schedules only; the posture is applied after the combat step). */
function scheduleLooks(sim,q){
  const clock=sim.clock;
  for(const id of SECTION.pair){
    const a=sim.actor(id),p=q.post[id];
    if(!present(a)||p.k!==0||p.moving||clock<q.next[id]||q.hold[id]?.until>clock||!sim.consumedEvent(SECTION.contact))continue;
    const until=t3(clock+between(q,id,SECTION.look.holdSec));
    q.hold[id]={k:'look',until,yaw:null};
    q.next[id]=t3(until+between(q,id,SECTION.look.everySec));
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Spotting. One watcher looks per scan; what he sees is a flash of the last noticeSec seconds or the phases of the deck assault.
const kindOf=a=>a.id==='de_east_0'||a.id==='de_east_1'?'mg':Number(a.id.slice(8))<14?'gate':'dike';
const keyOf=(a,kind)=>kind==='mg'?`mg:${a.id}`:kind==='gate'?`gate:${a.z>20?'N':'S'}`:'dike';
function watch(sim,q){
  const clock=sim.clock;
  if(!sim.consumedEvent(SECTION.contact)||clock-q.at.scan<SECTION.scanSec)return;
  q.at.scan=clock;const w=sim.actor(SECTION.watchers[q.n.scans++%SECTION.watchers.length]);
  if(!present(w)||clock-q.at.callout<SECTION.calloutGapSec)return;
  if(sim.consumedEvent(SECTION.deckFrom)&&watchDeck(sim,q,w))return;
  // Among the Germans who fired just now and whom he sees, the watcher calls the one the rkm is on (the section follows Kowal's burst), else the freshest flash.
  const rk=rkmTarget(sim);let best=null;
  for(const a of sim.actors){
    if(a.team!=='enemy'||a.displayOnly||!a.alive||!a.active||a.group==='grp_de_spans'||!(clock-a.firedAt<SECTION.noticeSec))continue;
    const kind=kindOf(a),key=keyOf(a,kind);
    if(clock-(q.seen[key]??-1e9)<SECTION.repeatSec[kind]||dist(w,a)>SECTION.rangeM||!sim.world.lineOfSight(w,a))continue;
    if(!best||(a.id===rk&&best.a.id!==rk)||(a.id!==rk&&best.a.id!==rk&&a.firedAt>best.a.firedAt))best={a,kind,key};
  }
  if(best)callout(sim,q,w,best.kind,best.a,best.key);
}
/** Whom Kowal's rkm is firing at: the German of his last burst, if the burst was in the last 10 s (his own choice, kowalFire; the section never changes it). */
function rkmTarget(sim){const k=sim.actor(SECTION.rkm),t=k?.ai?.target;return t&&sim.clock-(k.firedAt??-1e9)<10?t:null;}
const LANDMARK=Object.freeze({mg:'gate',gate:'gate',dike:'dike',deck:'deck',advance:'deck',fallback:'deck',down:'deck'});
/** Which side of the gates a shooter is on as the player sees them (the sign of the cross product, as the director's coverFire reads a bearing): positive is the player's right. */
function gateSide(sim,a){
  const p=sim.player,dx=1056-p.x,dz=20-p.z,ox=a.x-p.x,oz=a.z-p.z,sin=(dx*oz-dz*ox)/(Math.hypot(dx,dz)*Math.hypot(ox,oz));
  return sin>.002?'right':sin<-.002?'left':null;
}
const LETTER={advance:'a',cover:'c',hold:'h',fallback:'f',clear:'x'};
const deckSignature=sim=>DECK_ASSAULT.assault.map(id=>{const m=sim.actor(id);return !m||!m.alive||!m.active?'d':LETTER[m.deck?.phase]??'x';}).join('');
/** The deck assault as a watcher sees it: the first sight, the fall back, a man down, a new rush. The watcher must see the westmost man still up; the signature is only read (and kept) then. */
function watchDeck(sim,q,w){
  const clock=sim.clock,men=DECK_ASSAULT.assault.map(id=>sim.actor(id)).filter(m=>m&&m.alive&&m.active&&m.deck).sort((a,b)=>a.x-b.x);
  if(!men.length)return false;
  const lead=men.find(m=>dist(w,m)<=SECTION.deckRangeM&&sim.world.lineOfSight(w,m));
  if(!lead)return false;
  const sig=deckSignature(sim),before=q.deckSig;q.deckSig=sig;
  let fall=false,down=false,rush=false;
  for(let i=0;i<sig.length;i++){
    if(sig[i]==='f'&&before[i]!=='f'&&before[i]!=='d')fall=true;
    else if(sig[i]==='d'&&before[i]!=='d')down=true;
    else if(sig[i]==='a'&&(before[i]==='c'||before[i]==='h'))rush=true;
  }
  const kind=before===''?'deck':fall?'fallback':down?'down':rush?'advance':null;
  if(!kind)return false;
  const key=`deck:${kind}`;if(clock-(q.seen[key]??-1e9)<SECTION.deckRepeatSec[kind])return false;
  callout(sim,q,w,kind,lead,key);return true;
}
/** The call: remember it, let the others react (drawing from their own streams), and tell the world (the bark director turns the event into a line). */
function callout(sim,q,w,kind,target,key){
  const clock=sim.clock;
  q.seen[key]=clock;q.at.callout=clock;q.n.callouts++;
  const keys=Object.keys(q.seen);if(keys.length>SECTION.seenMax){keys.sort((a,b)=>q.seen[a]-q.seen[b]);for(const k of keys.slice(0,keys.length-SECTION.seenMax))delete q.seen[k];}
  const reactions=react(sim,q,w,kind,target);
  if(target&&target.team==='enemy'){q.focus={target:target.id,by:w.id,kind,at:clock};q.recent.push([kind,clock,target.id]);if(q.recent.length>4)q.recent.shift();}
  const side=target&&target.team==='enemy'&&(kind==='mg'||kind==='gate')?gateSide(sim,target):null;
  sim.emit({type:'section-callout',kind,by:w.id,target:target?.id??null,side,landmark:LANDMARK[kind]??null,from:{x:w.x,y:w.y,z:w.z},point:{x:w.x,y:w.y,z:w.z},aim:target?{x:target.x,y:target.y,z:target.z}:null,at:clock,reactions});
}
/** Everyone within hearing of the caller reacts once, with a draw of his own: [id, 'fire' | 'look' | 'drop']. */
function react(sim,q,caller,kind,target){
  const clock=sim.clock,out=[],german=Boolean(target)&&target.team==='enemy';
  for(const id of SECTION.men){
    const a=sim.actor(id);
    if(id===caller.id||!present(a)||dist(a,caller)>SECTION.hearM)continue;
    let [f,l]=SECTION.react[SECTION.role[id]][kind];const u=next(q,id);
    if(!german||!canFire(sim,q,a,target)){l+=f;f=0;}
    const choice=u<f?'fire':u<f+l?'look':'drop';
    if(choice==='fire')queueShots(q,clock,id,target);
    else if(choice==='look'){
      const aim=target??caller;
      q.hold[id]={k:'look',until:t3(clock+between(q,id,SECTION.lookSec)),yaw:+Math.atan2(aim.z-a.z,aim.x-a.x).toFixed(4)};
    }else q.hold[id]={k:'drop',until:t3(clock+between(q,id,SECTION.dropSec)),yaw:null};
    out.push([id,choice]);
  }
  return out;
}
/** A rifleman answers: after a delay, 1 to 3 shots at the German, drawn from the man's own stream (a shot already waiting for him is replaced). */
function queueShots(q,clock,id,target){
  const n=next(q,id),count=n<SECTION.fire.count[0]?1:n<SECTION.fire.count[0]+SECTION.fire.count[1]?2:3;
  q.shots=q.shots.filter(s=>s.id!==id);
  q.shots.push({id,target:target.id,at:t3(clock+between(q,id,SECTION.fire.delaySec)),left:count});
}
/** He can answer: a rifle with rounds, not reloading, on his feet where he is, and a line of sight to the German from his eyes standing. */
function canFire(sim,q,a,target){
  return a.id!==SECTION.rkm&&a.id!==SECTION.leader&&a.rounds>0&&!a.reload&&!walking(a)&&!q.post[a.id]?.moving&&dist(a,target)<=SECTION.rangeM&&sim.world.lineOfSight(standing(a),target);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Casualties: a man of ours down (a bomb, Bąk) is called by the nearest man who is there and then the sergeant reassigns his side.
/** The simulation tells the section a man of ours has been killed or wounded (R1-a bombs, the scripted wounding of Bąk). */
export function sectionCasualty(sim,id,how,by){
  if(!sectionOn(sim))return;
  const a=sim.actor(id);if(!a||a.team!=='ally')return;
  const q=sim.timers.section??=newSection(sim);
  q.cas.push({id,how,by,at:sim.clock,x:a.x,z:a.z,called:false,orderAt:null,done:false});if(q.cas.length>SECTION.casMax)q.cas.shift();
}
function handleCasualties(sim,q){
  const clock=sim.clock;
  for(const c of q.cas){
    if(c.called||clock-c.at<SECTION.casDelaySec[0])continue;
    let caller=null,best=SECTION.casHearM;
    for(const id of SECTION.casualtyCallers){const a=sim.actor(id);if(id===c.id||!present(a))continue;const d=Math.hypot(a.x-c.x,a.z-c.z);if(d<best){best=d;caller=a;}}
    c.called=true;
    if(caller&&clock-(q.seen[`casualty:${c.id}`]??-1e9)>=SECTION.repeatSec.casualty){   // (a man down is called whatever else the section has just called)
      c.orderAt=t3(clock+between(q,SECTION.leader,SECTION.casOrderSec));q.n.casualties++;
      callout(sim,q,caller,'casualty',sim.actor(c.id),`casualty:${c.id}`);
    }else c.done=true;
  }
  q.cas=q.cas.filter(c=>!c.done);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The sergeant's orders: what he does when the situation changes. At most one per orderGapSec.
function decide(sim,q){
  const clock=sim.clock,leader=sim.actor(SECTION.leader);
  if(!present(leader)||clock-q.at.order<SECTION.orderGapSec||clock-q.at.callout<SECTION.orderAfterCallSec)return;
  const load=pinLoad(q,clock),mine=SECTION.pair.map(id=>sim.actor(id)).filter(present),contact=sim.consumedEvent(SECTION.contact);
  // 1. a man is down and called: the nearest man takes his side
  const cas=q.cas.find(c=>c.called&&!c.done&&typeof c.orderAt==='number'&&clock>=c.orderAt);
  if(cas){
    const victim={x:cas.x,z:cas.z};let who=null,best=1e9;
    for(const id of SECTION.men){const a=sim.actor(id);if(id===cas.id||id===SECTION.leader||!present(a))continue;const d=dist(a,victim);if(d<best){best=d;who=id;}}
    cas.done=true;
    if(who){   // the man who takes his side turns to it (stands and looks at the place where the man fell)
      const a=sim.actor(who);q.hold[who]={k:'look',until:t3(clock+between(q,who,SECTION.lookSec)),yaw:+Math.atan2(cas.z-a.z,cas.x-a.x).toFixed(4)};
      return order(sim,q,'sector',[who],cas.id,leader);
    }
  }
  // 2. the platoon withdraws at 06:00: the pair goes up to the road deck beside the player's post to cover it, and the deck assault that follows
  if(contact&&sim.consumedEvent(SECTION.withdrawal)&&!q.done.deck&&mine.length&&SECTION.pair.every(id=>!q.post[id].moving)){   // from the squad post or from wherever the pair holds
    q.done.deck=true;
    for(const a of mine)q.post[a.id]={k:SECTION.deckPost,since:clock,moving:true,until:0};
    q.order={kind:'deck',at:clock,until:clock};return order(sim,q,'deck',mine.map(a=>a.id),null,leader);
  }
  // 3. the pair is pinned at its post: move it along the trench; and bring it back when the dwell is over (never once it has gone to the deck)
  if(contact&&!q.done.deck&&mine.length===SECTION.pair.length){
    const p0=q.post[SECTION.pair[0]];
    if(pairHome(q)&&load>=SECTION.shiftLoad&&clock-q.at.shift>=SECTION.shiftGapSec&&!(q.order?.kind==='hold'&&clock<q.order.until)){
      const k=SECTION.shiftPosts[Math.floor(next(q,SECTION.leader)*SECTION.shiftPosts.length)];
      const until=t3(clock+between(q,SECTION.leader,SECTION.dwellSec));
      for(const a of mine)q.post[a.id]={k,since:clock,moving:true,until};
      q.at.shift=clock;q.n.shifts++;q.order={kind:'shift',at:clock,until};
      return order(sim,q,'shift',mine.map(a=>a.id),null,leader);
    }
    if(p0.k>0&&!p0.moving&&clock>=p0.until){
      for(const a of mine)q.post[a.id]={k:0,since:clock,moving:true,until:0};
      q.order={kind:'return',at:clock,until:clock};return order(sim,q,'return',mine.map(a=>a.id),null,leader);
    }
  }
  // 4. two kinds of threat are up: one target for everybody
  const fresh=q.recent.filter(r=>clock-r[1]<=SECTION.focusWindowSec);
  if(clock>=q.next.focus&&new Set(fresh.map(r=>r[0])).size>=2){
    const rk=rkmTarget(sim),top=fresh.find(r=>r[2]===rk)??fresh.find(r=>r[0]==='mg')??fresh.at(-1),t=sim.actor(top[2]);   // one target for everybody: the rkm's if it was called, else the MG
    if(t&&t.alive&&t.active){
      q.focus={target:t.id,by:leader.id,kind:top[0],at:clock};q.next.focus=t3(clock+SECTION.focusGapSec);
      for(const a of mine)if(canFire(sim,q,a,t))queueShots(q,clock,a.id,t);   // the order is carried out: every rifleman who can fires at the German named
      return order(sim,q,'focus',[SECTION.rkm,...mine.map(a=>a.id)],t.id,leader);
    }
  }
  // 5. nothing has changed for a while and the post is quiet: hold. Nobody gets up to look until it is over (heads down), then the pair looks again after a few seconds of its own.
  if(contact&&q.next.hold===0)q.next.hold=t3(clock+between(q,SECTION.leader,SECTION.holdEverySec));   // the first hold is a while after the first shot
  if(contact&&q.next.hold>0&&clock>=q.next.hold&&load<1){
    q.next.hold=t3(clock+between(q,SECTION.leader,SECTION.holdEverySec));
    q.order={kind:'hold',at:clock,until:t3(clock+SECTION.holdSec)};
    for(const id of SECTION.pair)q.next[id]=t3(Math.max(q.next[id],q.order.until)+between(q,id,SECTION.holdLookSec));
    return order(sim,q,'hold',[SECTION.rkm,...mine.map(a=>a.id)],null,leader);
  }
}
function order(sim,q,kind,to,target,leader){
  const clock=sim.clock;
  q.at.order=clock;q.n.orders++;
  const t=target?sim.actor(target):null;
  const first=sim.actor(to[0]);if(first&&kind!=='sector')leader.facing=Math.atan2(first.z-leader.z,first.x-leader.x);   // the sergeant turns to the post he addresses
  sim.emit({type:'section-order',kind,by:leader.id,to,target:target??null,side:t&&t.team==='enemy'&&(kindOf(t)==='mg'||kindOf(t)==='gate')?gateSide(sim,t):null,
    from:{x:leader.x,y:leader.y,z:leader.z},point:{x:leader.x,y:leader.y,z:leader.z},at:clock});
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The walk of the pair between posts (once per man before the generic walk of updateActors; true = handled). The same walk as slice 3: moveActor at the squad's pace, a man who holds
// kneels at his slot, a bound that does not end in stallSec ends anyway (and he goes on walking to the slot at the ordinary pace).
export function sectionWalk(sim,q,a,dt,ctx){
  const p=q.post[a.id];if(!p)return false;
  const slot=sectionSlot(ctx.stageSlots,a.id,p.k);
  if(p.moving){
    if(dist(a,slot)<SQUAD.arriveM||sim.clock-p.since>=SECTION.stallSec){
      p.moving=false;p.since=sim.clock;a.target=null;delete a.nav;a.facing=slot.facing;a.state='GUARD';
      q.say={node:p.k===0?'arrive_home':p.k===SECTION.deckPost?'arrive_deck':'arrive_trench',at:sim.clock};
    }else{const goal=gateGoal(a,slot);a.crouched=false;a.target=goal;sim.moveActor(a,goal,dt,SQUAD.pace);return true;}
  }
  if(p.k===0)return false;   // at the squad post: the T38 rule of the section (stageSection) is his posture
  if(dist(a,slot)>=.8){const goal=gateGoal(a,slot);a.crouched=false;a.target=goal;sim.moveActor(a,goal,dt);return true;}
  a.target=null;a.state='GUARD';a.crouched=true;return true;
}
/**
 * The squad post is a pocket: the sandbag wall of cv_squad_post (x -70.45..-69.55, z 20.5..23.5) shuts its T38 slots in from the east and the huts at z 17-18 and 20 from the south, so the way in and
 * out is round the north end of the wall, past Kowal's slot. A man sent straight at the far side slides along the corner and the audit counts the graze as clipping (seed 3, a return from the
 * trench): the walk to or from the pocket goes through a gate waypoint with clearance. It reads only where the man is and where he is going (no state): from the pocket to the east, out by the gate
 * first; from the east into the pocket, in by the gate first.
 */
function gateGoal(a,slot){
  const g=SECTION.pocket,gate=g.gates[a.id];
  // (walkStraight stops 0.8 m short of any target, so a man counts as through the gate when he is within releaseM = 1 m of it; the rules read only where he is and where he goes)
  if(slot.x<gate.x&&a.x>gate.x+g.releaseM)return gate;                        // into the pocket from the east: round the north end first
  if(slot.x>g.eastX&&a.x<g.westX&&a.z<gate.z-g.releaseM)return gate;          // out of the pocket to the east: north first
  return slot;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// After the combat step: the shots that are due, and the postures the reactions ask for (the T38 rule has run already; this is applied on top, every tick).
export function sectionAfter(sim){
  const q=sim.timers.section;if(!q||!sectionOn(sim))return;
  const clock=sim.clock;
  for(let i=0;i<q.shots.length;){
    const s=q.shots[i],a=sim.actor(s.id),t=sim.actor(s.target);
    if(!present(a)||!t||!t.alive||!t.active||q.post[s.id]?.moving||walking(a)){q.shots.splice(i,1);continue;}
    if(clock<s.at){i++;continue;}
    if(!(a.rounds>0)||a.reload||!sim.world.lineOfSight(standing(a),t)){q.shots.splice(i,1);continue;}
    shoot(sim,a,t);q.n.shots++;
    if(--s.left>0){s.at=t3(clock+between(q,s.id,SECTION.fire.boltSec));i++;}else q.shots.splice(i,1);
  }
  for(const id of SECTION.men){
    const a=sim.actor(id),h=q.hold[id];
    if(h&&clock>=h.until)delete q.hold[id];
    if(!present(a))continue;
    if(a.state==='SUPPRESS'&&id!==SECTION.rkm&&clock-a.firedAt>=SECTION.fire.holdSec+.9)a.state='GUARD';
    if(id===SECTION.rkm||id===SECTION.leader){   // they only turn: Kowal's posture is his burst cycle's (what the MG34s see of him is not touched) and the sergeant stands anyway
      if(q.hold[id]?.yaw!=null&&clock-(a.firedAt??-1e9)>=1.2)a.facing=q.hold[id].yaw;   // (not while Kowal is bursting: he faces the German he fires at)
      continue;
    }
    if(q.post[id]?.moving||walking(a)||a.motion?.speed>0)continue;   // a man on the move keeps his stride (Bąk walking to the deck, the pair between posts, the tick he arrives)
    const cur=q.hold[id],due=q.shots.some(s=>s.id===id&&s.at-clock<=SECTION.fire.riseSec)||clock-(a.firedAt??-1e9)<SECTION.fire.holdSec;
    if(due)a.crouched=false;
    else if(cur?.k==='look'){a.crouched=false;if(cur.yaw!=null)a.facing=cur.yaw;}
    else if(cur?.k==='drop')a.crouched=true;
  }
}
/** A rifle shot that is seen and heard but not traced: the flash of the allied rifleman (shot, firedAt, SUPPRESS), the clip, the report. */
function shoot(sim,a,t){
  const clock=sim.clock;
  a.rounds=Math.max(0,a.rounds-1);if(a.rounds===0)a.reload={startedAt:clock,duration:3.4,mode:'clip'};
  a.shot=.135;a.firedAt=clock;a.state='SUPPRESS';a.crouched=false;a.facing=Math.atan2(t.z-a.z,t.x-a.x);
  sim.emit({type:'npc-shot',weapon:'ally_rifle',point:eyePosition(a),rounds:1,by:a.id,target:t.id});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Read-only diagnostics (never saved): what the section knows and is doing. */
export function sectionView(sim){
  const q=sim.timers.section;if(!q)return null;
  return {focus:q.focus,order:q.order,posts:Object.fromEntries(SECTION.pair.map(id=>[id,{...q.post[id]}])),shots:q.shots.length,pinLoad:pinLoad(q,sim.clock),n:{...q.n}};
}

/** A saved timers.section: the exact keys, the streams of the five men, times the machine could have written, ids it could have used. Pure check, for validateM01Snapshot. */
export function validateSectionRecord(q,s,reject){
  const clock=s.clock,fin=(v,lo=0,hi=Infinity)=>Number.isFinite(v)&&v>=lo&&v<=hi,plain=v=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
  const keys=(o,list)=>plain(o)&&Object.keys(o).length===list.length&&list.every(k=>Object.hasOwn(o,k));
  const german=id=>typeof id==='string'&&/^de_(east|spans)_\d+$/.test(id),man=id=>SECTION.men.includes(id);
  const bad=what=>reject('secção '+what);
  if(!keys(q,RECORD_KEYS)||q.v!==SECTION.version)bad('registo');
  // The window runs from the first bomb to the tick that consumes the east demolition (the save of that very tick still carries the record: the next tick removes it, endSection).
  if(!Object.hasOwn(s.consumed,SECTION.from)||(Object.hasOwn(s.consumed,SECTION.until)&&!(s.consumed[SECTION.until]>=clock-1e-6)))bad('janela');
  if(!keys(q.rng,SECTION.men)||SECTION.men.some(id=>!Number.isInteger(q.rng[id])||!fin(q.rng[id],0,0xffffffff)))bad('fluxos');
  if(!keys(q.at,AT_KEYS)||AT_KEYS.some(k=>!fin(q.at[k],-1e9,clock)))bad('tempos');
  if(!keys(q.next,NEXT_KEYS)||NEXT_KEYS.some(k=>!fin(q.next[k],0,clock+SECTION.holdEverySec[1]+SECTION.look.everySec[1]+SECTION.look.holdSec[1]+60)))bad('agendas');
  if(!plain(q.seen)||Object.keys(q.seen).length>SECTION.seenMax||Object.entries(q.seen).some(([k,t])=>!SEEN_KEY.test(k)||!fin(t,0,clock)))bad('vistos');
  if(typeof q.deckSig!=='string'||!/^([acdfhx]{6})?$/.test(q.deckSig))bad('assinatura do tabuleiro');
  if(q.focus!==null&&(!keys(q.focus,['target','by','kind','at'])||!german(q.focus.target)||typeof q.focus.by!=='string'||!KINDS.has(q.focus.kind)||!fin(q.focus.at,0,clock)))bad('foco');
  if(!Array.isArray(q.shots)||q.shots.length>SECTION.men.length||q.shots.some(x=>!keys(x,['id','target','at','left'])||!man(x.id)||!german(x.target)||!fin(x.at,0,clock+SECTION.fire.delaySec[1]+SECTION.fire.boltSec[1]+1)||
    !Number.isInteger(x.left)||x.left<1||x.left>3)||new Set(q.shots.map(x=>x.id)).size!==q.shots.length)bad('tiros');
  if(!plain(q.hold)||Object.keys(q.hold).length>SECTION.men.length||Object.entries(q.hold).some(([id,h])=>!man(id)||!keys(h,['k','until','yaw'])||!HOLD_KINDS.has(h.k)||
    !fin(h.until,0,clock+SECTION.lookSec[1]+SECTION.dropSec[1]+SECTION.look.holdSec[1]+1)||!(h.yaw===null||fin(h.yaw,-Math.PI-1e-3,Math.PI+1e-3))))bad('posturas');
  if(!plain(q.pin)||Object.entries(q.pin).some(([id,t])=>![...SECTION.pair,SECTION.rkm].includes(id)||!fin(t,0,clock+10)))bad('supressões');
  if(!Array.isArray(q.pins)||q.pins.length>SECTION.pinMax||q.pins.some(x=>!Array.isArray(x)||x.length!==2||!fin(x[0],0,clock)||!fin(x[1],0,10)))bad('picadas');
  if(!keys(q.post,SECTION.pair)||SECTION.pair.some(id=>{const p=q.post[id];return !keys(p,['k','since','moving','until'])||!Number.isInteger(p.k)||p.k<0||p.k>=SECTION.posts.length||!fin(p.since,0,clock)||typeof p.moving!=='boolean'||!fin(p.until,0,clock+SECTION.dwellSec[1]+5);}))bad('postos');
  if(q.order!==null&&(!keys(q.order,['kind','at','until'])||!ORDERS.has(q.order.kind)||!fin(q.order.at,0,clock)||!fin(q.order.until,0,clock+SECTION.dwellSec[1]+SECTION.holdSec+5)))bad('ordem');
  if(!Array.isArray(q.cas)||q.cas.length>SECTION.casMax||q.cas.some(c=>!keys(c,CAS_KEYS)||typeof c.id!=='string'||!['killed','wounded'].includes(c.how)||!['bomb','script','round'].includes(c.by)||!fin(c.at,0,clock)||
    ![c.x,c.z].every(Number.isFinite)||typeof c.called!=='boolean'||typeof c.done!=='boolean'||!(c.orderAt===null||fin(c.orderAt,0,clock+SECTION.casOrderSec[1]+SECTION.casDelaySec[1]+60))))bad('baixas');
  if(!Array.isArray(q.recent)||q.recent.length>4||q.recent.some(r=>!Array.isArray(r)||r.length!==3||!KINDS.has(r[0])||!fin(r[1],0,clock)||!german(r[2])))bad('recentes');
  if(!keys(q.done,['deck'])||typeof q.done.deck!=='boolean')bad('feitos');
  if(q.say!==null&&(!keys(q.say,['node','at'])||!SAY_NODES.includes(q.say.node)||!fin(q.say.at,0,clock)))bad('chegada');
  if(!keys(q.n,N_KEYS)||N_KEYS.some(k=>!Number.isInteger(q.n[k])||q.n[k]<0))bad('contadores');
}
/** The data this module relies on (tests): every post has a slot for both men, apart, clear of every solid the navigator knows, and a cover node that exists. */
export function sectionDataErrors(stageSlots,{blockedAt,heightAt,hasNode}){
  const errors=[];
  for(const id of SECTION.pair)if(!stageSlots[id])errors.push(`${id}: no T38 slot`);
  SECTION.posts.forEach(post=>{
    if(!post)return;
    for(const id of SECTION.pair){
      const s=post.slots[id];if(!s){errors.push(`${post.id}: no slot for ${id}`);continue;}
      if(blockedAt(s[0],s[1],.35,heightAt(s[0],s[1])))errors.push(`${post.id}: ${id} slot is inside a solid`);
    }
    const [a,b]=SECTION.pair.map(id=>post.slots[id]);if(a&&b&&Math.hypot(a[0]-b[0],a[1]-b[1])<1.2)errors.push(`${post.id}: the pair is closer than 1.2 m`);
    if(post.node&&!hasNode(post.node))errors.push(`${post.id}: unknown cover node ${post.node}`);
  });
  if(SECTION.shiftPosts.some(k=>!SECTION.posts[k]||k===SECTION.deckPost)||!SECTION.posts[SECTION.deckPost])errors.push('shiftPosts / deckPost');
  for(const id of SECTION.pair){const g=SECTION.pocket.gates[id];if(!g)errors.push(`${id}: no gate`);else if(blockedAt(g.x,g.z,.35,heightAt(g.x,g.z)))errors.push(`${id}: the gate of the pocket is inside a solid`);}
  const [g1,g2]=SECTION.pair.map(id=>SECTION.pocket.gates[id]);if(g1&&g2&&Math.hypot(g1.x-g2.x,g1.z-g2.z)<1.2)errors.push('the two gates are closer than 1.2 m');
  return errors;
}
