// M01 reactive dialogue: a small deterministic director over the existing dialogue and callout lines (docs/direction/M01_REACTIVE_DIALOGUE.md).
// There is no second dialogue system: a bark is an ordinary entry of mission.json `dialogue` (or of `callouts.lines`, once it has an id) that carries a `bark` rule,
// and it is spoken through M01Simulation.line(). The director only decides WHEN a rule's line may be said:
//   trigger  `on`      an event that M01Simulation.emit() has just recorded (round-impact, ally-fire, player-hit, player-shot, reload, enemy_down_by_player, enemy-fire),
//                      an explicit call of the simulation (coverRotation, guide), or `poll` (a state read at the end of every tick)
//   when     {...}     conditions, all of which must hold (the vocabulary below is closed; an unknown name stops the game at load, like a typo in the combat data)
//   cooldown, max      real seconds on `clock` (never the compressed battle clock) and times per mission; group: lines that alternate and share a cooldown
//   replaces/unless/requires/after   substitution against the callouts and other lines: «substitui X», «não toca se X tocou há N s», «só depois de X», «X + N s»
// then two global limits keep the channel readable: a minimum gap since the last line of any kind and a rolling 60 s budget per priority (mission.json `barks`); a busy minute
// of scripted lines leaves little room for reactive ones. Priority 1 is the most urgent.
// Nothing here draws from a random stream, writes an actor, moves anyone or reads a wall clock. The state it keeps (timers.barks) is saved and validated; the line queue is
// the simulation's own (line() / advanceSubtitle() in m01-simulation.js). Absent timers.barks (an older save) means nothing was said yet.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import mapLayout from '../../missions/m01-tczew/map-layout.json' with { type: 'json' };
import { HOLD_AREA, WEST_SAFE_X } from './m01-pacing.js';

const seconds=text=>{const v=text.split(':').map(Number);if(v.length===2)v.push(0);return v.reduce((n,x)=>n*60+x,0);};
const inside=(p,a)=>p.x>=a.minX&&p.x<=a.maxX&&p.z>=a.minZ&&p.z<=a.maxZ;
const SAPPERS=['pawel_krawiec','sapper_2','sapper_3'];
const gateIndex=id=>Number(id.slice(id.lastIndexOf('_')+1));
/** The ckm wz.30 belt and burst length of m01-simulation.js (CKM_BELT, CKM_BURST_ROUNDS), pinned by tests/m01-barks.test.js. */
export const CKM_BELT_FULL=330,CKM_BURST_ROUNDS_FULL=8;
const RECENT_MAX=8;
export const TRIGGERS=Object.freeze(['poll','coverRotation','guide','round-impact','ally-fire','player-hit','player-shot','reload','enemy_down_by_player','enemy-fire']);

/** The saved record (timers.barks). last, recent: when the last line was queued and the last RECENT_MAX ones, scripted or reactive alike (the gap and the 60 s budget count all voices);
 *  at: when each watched line was last said; n: how often each rule line was said; g: per variant group [next member, when the group last spoke];
 *  seen: small memories of what was observed (see NEEDS). */
export const newBarkState=()=>({last:-1e9,recent:[],at:{},n:{},g:{},seen:{}});
const EMPTY=Object.freeze({last:-1e9,recent:Object.freeze([]),at:Object.freeze({}),n:Object.freeze({}),g:Object.freeze({}),seen:Object.freeze({})});
const ledger=sim=>sim.timers.barks??EMPTY;
const ensure=sim=>sim.timers.barks??=newBarkState();

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Conditions. Each factory gets its argument from the rule's `when` and returns [rank, test, applicable triggers|null]; cheaper tests run first.
// test(sim, ctx, rule): ctx.event is the event of the trigger, ctx.point where it happened, ctx.node the cover node of a rotation, ctx.hitN / ctx.prevKill bookkeeping.
const NEEDS={allyFire:false,kill:false,hits:false};
const EVENT_ONLY=['round-impact'];
function present(s,id){
  if(id==='jan_wrona')return s.player;
  const a=s.actor(id);
  return a&&a.alive&&(a.active||a.carriedBy)?a:null;   // a man carried on the shoulder is still a voice (Bąk, 146)
}
const anyOf=(list,test)=>{for(let i=0;i<list.length;i++)if(test(list[i]))return true;return false;};
const flagsOk=(s,flag)=>{for(const k in flag)if(s.flags[k]!==flag[k])return false;return true;};
const bearing=(s,pt)=>{const rel=Math.atan2(pt.z-s.player.z,pt.x-s.player.x)-s.player.angle;return Math.atan2(Math.sin(rel),Math.cos(rel));};   // positive is the player's right, as in directionTo()
function peekers(s,los){   // men of grp_de_east with an open peek (and in the player's sight when `los`)
  let n=0;
  for(const a of s.actors){
    if(a.group!=='grp_de_east'||!a.alive||!a.active||!(a.ai&&a.ai.peek>0))continue;
    if(los&&!s.world.lineOfSight(a,s.player))continue;
    n++;
  }
  return n;
}
const SUN=mapLayout.sun.keyframes.map(k=>({t:seconds(k.clock),az:k.azimuthDeg}));
function sunAzimuth(b){
  if(b<=SUN[0].t)return SUN[0].az;
  for(let i=1;i<SUN.length;i++)if(b<=SUN[i].t){const u=(b-SUN[i-1].t)/(SUN[i].t-SUN[i-1].t);return SUN[i-1].az+(SUN[i].az-SUN[i-1].az)*u;}
  return SUN[SUN.length-1].az;
}
const area=(name,fail)=>{const a={hold:HOLD_AREA}[name];if(!a)fail(`unknown area ${name}`);return a;};
const gunner=s=>s.actor('ckm_gunner');

/** The vocabulary. `zones` and `fail` come from the compile step. */
const CONDITIONS={
  // -- the event that fired the rule
  victim:()=>[0,(s,c)=>c.event.victim!=null,EVENT_ONLY],
  crack:()=>[0,(s,c)=>c.event.pass==='crack',EVENT_ONLY],
  pinned:()=>[0,(s,c)=>c.event.pinned.length>0,EVENT_ONLY],
  pinnedSapper:()=>[0,(s,c)=>{for(const id of c.event.pinned)if(SAPPERS.includes(id))return true;return false;},EVENT_ONLY],
  byMg34:()=>[0,(s,c)=>c.event.by==='de_east_0'||c.event.by==='de_east_1',EVENT_ONLY],
  hit:()=>[0,(s,c)=>c.event.hit===true,['player-shot']],
  by:id=>[0,(s,c)=>c.event.by===id,['ally-fire']],
  fireFrom:(name,k)=>{const z=k.zone(name);return [0,(s,c)=>inside(c.event.origin,z),['enemy-fire']];},
  downGroup:g=>[0,(s,c)=>c.event.group===g,['enemy_down_by_player']],
  downGate:()=>[0,(s,c)=>gateIndex(c.event.id)<14&&c.event.id.startsWith('de_east_'),['enemy_down_by_player']],
  everyNth:n=>{NEEDS.hits=true;return [0,(s,c)=>(c.hitN-1)%n===0,['player-shot']];},
  repeatKill:sec=>{NEEDS.kill=true;return [0,(s,c)=>c.prevKill!==undefined&&s.clock-c.prevKill<=sec,['enemy_down_by_player']];},
  node:list=>{const prefixes=list.map(p=>p.endsWith('*')?[p.slice(0,-1),true]:[p,false]);
    return [0,(s,c)=>{const n=c.node;if(typeof n!=='string')return false;for(const [p,glob] of prefixes)if(glob?n.startsWith(p):n===p)return true;return false;},['coverRotation']];},
  // -- the state of the mission
  active:list=>[1,s=>anyOf(list,id=>s.objectives[id]?.state==='active')],
  done:list=>[1,s=>anyOf(list,id=>s.objectives[id]?.state==='done')],
  consumed:id=>[1,s=>s.consumedEvent(id)],
  notConsumed:id=>[1,s=>!s.consumedEvent(id)],
  flag:flag=>[1,s=>flagsOk(s,flag)],
  carrying:id=>[1,s=>s.player.carrying===id],
  clock:([from,to])=>{const a=from===null?-Infinity:seconds(from),b=to===null?Infinity:seconds(to);return [1,s=>s.battleClock>=a&&s.battleClock<b];},
  sinceEvent:({event,min,max})=>[1,s=>{const t=s.consumed[event];if(t===undefined)return false;const age=s.clock-t;return age>=min&&age<=max;}],
  progress:({objective,min})=>[1,s=>s.objectives[objective].progress>=min],
  holdVisited:()=>[1,s=>s.timers.holdAccessVisited===true],
  inArea:(name,k)=>{const a=area(name,k.fail);return [1,s=>inside(s.player,a)];},
  repairPins:({min,eq})=>[1,s=>{const n=s.timers.repairPins??0;return eq!==undefined?n===eq:n>=min;}],
  repairResume:()=>[1,s=>{const u=s.timers.repairSuppressedUntil;return (s.timers.repairPins??0)>=1&&u>0&&s.clock>=u&&s.clock-u<1.5;}],
  ckmPhase:list=>[1,s=>{const g=gunner(s);return Boolean(g?.ckm)&&list.includes(g.ckm.phase);}],
  ckmBurst:({max})=>[1,s=>(gunner(s)?.ckmFire?.bursts??Infinity)<=max],
  ckmTarget:kind=>[1,s=>{const t=gunner(s)?.ckm?.burstPlan?.target;return typeof t==='string'&&kind==='gate'&&t.startsWith('de_east_')&&gateIndex(t)<14;}],
  ckmFeed:()=>[1,s=>{const g=gunner(s);return g?.ckm?.phase==='feed'&&(g.ckmFire?.belt??CKM_BELT_FULL)<CKM_BURST_ROUNDS_FULL;}],   // a real belt change: the quiet cycle's feed has belt to spare
  ckmBeltFull:()=>[1,s=>(gunner(s)?.ckmFire?.belt??0)>=CKM_BELT_FULL-CKM_BURST_ROUNDS_FULL*2],
  // -- the player
  playerStill:mps=>[1,s=>s.player.moveBlend*3.8<mps],   // moveBlend is the fraction of the 3.8 m/s walk the last tick covered
  playerHurt:()=>[1,s=>s.player.health<100],
  notAiming:()=>[1,s=>!s.player.aiming],
  notShotFor:sec=>[1,s=>s.clock*1000-s.player.weaponShotAt>sec*1000],
  inCover:()=>[2,s=>s.world.coverAt(s.player)!==null],
  farFrom:({point,m})=>[1,s=>{const p=s.world.point(point);return Math.hypot(s.player.x-p.x,s.player.z-p.z)>m;}],
  distTo:({point,min,max})=>[1,s=>{const p=s.world.point(point),d=Math.hypot(s.player.x-p.x,s.player.z-p.z);return d>=min&&d<=max;}],
  bearing:({point,side})=>[1,s=>{const a=bearing(s,s.world.point(point));return side==='left'?a<-.35&&a>-2.09:a>.35&&a<2.09;}],   // the side directionTo() calls «à sua esquerda/direita»
  platoonPassing:()=>[2,s=>{for(const a of s.actors)if(a.group==='grp_east_platoon'&&a.alive&&a.active&&a.x>-275)return true;return false;}],
  westWait:()=>[2,s=>{   // the three first terms of readiness(west_demolition), and Bąk still on a man's shoulder: the charge waits for him
    if(!s.consumedEvent('evt_m01_east_demolition')||s.player.x>=WEST_SAFE_X)return false;
    const bak=s.actor('jozef_bak');if(!(bak.carry||bak.carriedBy))return false;
    for(const a of s.actors)if(a.alive&&a.active&&a.team==='ally'&&!a.civilian&&a.x>=WEST_SAFE_X)return false;
    return true;}],
  readiness:id=>[2,s=>s.readiness(id)],
  grenade:({fuseMax,fuseMin,allyWithin})=>[2,s=>{
    for(const g of s.grenades.active){
      if(g.fuse>fuseMax||g.fuse<fuseMin)continue;
      for(const a of s.actors)if(a.team==='ally'&&!a.displayOnly&&!a.civilian&&a.alive&&a.active&&Math.hypot(a.x-g.x,a.z-g.z)<=allyWithin)return true;
    }
    return false;}],
  // -- what the Germans do
  mg34:({phase,los})=>[2,s=>{
    for(const id of ['de_east_0','de_east_1']){const a=s.actor(id);if(a&&a.alive&&a.active&&a.mg34Prone?.phase===phase&&(!los||s.world.lineOfSight(a,s.player)))return true;}
    return false;}],
  peek:({los})=>[2,s=>peekers(s,los)>0],
  peekCount:({min})=>[2,s=>peekers(s,false)>=min],
  peekClosed:()=>[2,s=>{   // a visible peek that was open a moment ago and is closed now
    const now=peekers(s,true),last=ledger(s).seen.peek;
    if(now>0){if(last===undefined||s.clock-last>=.25)ensure(s).seen.peek=s.clock;return false;}
    return last!==undefined&&s.clock-last>=.3&&s.clock-last<=2;}],
  mgSilenced:()=>[2,s=>{for(const id of ['de_east_0','de_east_1']){const a=s.actor(id);if(a&&a.alive&&a.active&&a.suppressedAt===s.clock&&a.suppressedUntil>s.clock)return true;}return false;},['player-shot']],
  coverFire:({side,ageMax,zone},k)=>{
    const z=k.zone(zone),cx=(z.minX+z.maxX)/2,cz=(z.minZ+z.maxZ)/2;
    return [1,s=>{
      const f=s.timers.coverFire;if(!f||s.clock<f.at||s.clock-f.at>ageMax||!inside(f,z))return false;
      const p=s.player,dx=cx-p.x,dz=cz-p.z,ox=f.x-p.x,oz=f.z-p.z,sin=(dx*oz-dz*ox)/(Math.hypot(dx,dz)*Math.hypot(ox,oz));
      return side==='right'?sin>.002:sin<-.002;   // the sign of the cross product, as directionTo() reads a bearing: positive is the player's right
    },['enemy-fire']];},
  quiet:({allySec})=>{NEEDS.allyFire=true;return [2,s=>{   // nobody has fired for a while: the Germans not in the last 2.5 s and nothing in the air; our side not for allySec s
    if(s.enemyFire.rounds.length)return false;
    for(const a of s.actors)if(a.team==='enemy'&&!a.displayOnly&&a.alive&&a.active&&s.clock-a.firedAt<2.5)return false;
    if(s.clock-(ledger(s).seen.allyFire??-1e9)<allySec)return false;
    return s.clock*1000-s.player.weaponShotAt>=allySec*1000;}];},
  sunGlare:({deg,holdSec})=>[2,s=>{   // the player has been looking at the sun for holdSec seconds (saved: seen.sun = [since, last seen])
    const p=s.player,az=sunAzimuth(s.battleClock)*Math.PI/180,facing=Math.sin(az-p.angle)>=Math.cos(deg*Math.PI/180)&&p.pitch>-.35&&p.pitch<.6;
    const sun=ledger(s).seen.sun;
    if(!facing){if(sun!==undefined)delete ensure(s).seen.sun;return false;}
    if(sun===undefined||s.clock-sun[1]>.5){ensure(s).seen.sun=[s.clock,s.clock];return false;}
    if(s.clock-sun[1]>=.25)sun[1]=s.clock;
    return s.clock-sun[0]>=holdSec;}],
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Validates mission data and compiles the rules. Throws on anything the director could not run; used at load and by the tests (with mutated copies of the data). */
export function compileBarks(def=definition){
  const fail=m=>{throw new Error(`M01 barks: ${m}`);};
  const cfg=def.barks;if(!cfg||typeof cfg!=='object')fail('mission.json needs a `barks` block');
  const numRow=(name,keys=['1','2','3'])=>{const r=cfg[name];if(!r||keys.some(k=>!(r[k]>0)))fail(`barks.${name} needs a positive number for priority ${keys.join(', ')}`);return r;};
  numRow('gapSec');numRow('ttlSec');numRow('budget60');
  for(const k of ['followGapSec','cutAfterSec'])if(!(cfg[k]>0))fail(`barks.${k}`);
  if(!Number.isInteger(cfg.voices)||cfg.voices<2)fail('barks.voices');
  if(!Array.isArray(cfg.anonymous))fail('barks.anonymous');
  if(Math.max(...Object.values(cfg.budget60))>RECENT_MAX)fail(`barks.budget60 above ${RECENT_MAX}`);
  const zones=cfg.zones??{};
  const zone=name=>{const z=zones[name];if(!z||!['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(z[k])))fail(`unknown or malformed zone ${name}`);return z;};
  const lines=new Map(),castIds=new Set(def.cast.map(c=>c.id)),eventIds=new Set(def.events.map(e=>e.id)),objectiveIds=new Set(def.objectives.map(o=>o.id)),anonymous=new Set(cfg.anonymous);
  for(const l of [...def.dialogue,...def.callouts.lines])if(l.id){if(lines.has(l.id))fail(`duplicate line id ${l.id}`);lines.set(l.id,l);}
  const featureIds=new Set(mapLayout.features.map(f=>f.id));
  const known=id=>lines.has(id)||fail(`unknown line ${id}`);
  const eventKnown=id=>eventIds.has(id)||fail(`unknown event ${id}`);
  const objectiveKnown=id=>objectiveIds.has(id)||fail(`unknown objective ${id}`);
  const rules=[];
  for(const l of lines.values()){
    const b=l.bark;if(b===undefined)continue;
    const id=l.id,at=m=>fail(`${id}: ${m}`);
    if(!b||typeof b!=='object'||Array.isArray(b))at('bark must be an object');
    const allowed=['on','when','cooldown','max','group','replaces','unless','requires','after'];
    for(const k of Object.keys(b))if(!allowed.includes(k))at(`unknown bark key ${k}`);
    if(!TRIGGERS.includes(b.on))at(`unknown trigger ${b.on}`);
    if(![1,2,3].includes(l.priority))at('priority must be 1, 2 or 3');
    if(!castIds.has(l.speaker)&&!anonymous.has(l.speaker))at(`unknown speaker ${l.speaker}`);
    const cooldown=b.cooldown??0,max=b.max??0;
    if(!(cooldown>=0)||!Number.isInteger(max)||max<0)at('cooldown/max');
    for(const key of ['replaces','requires'])for(const x of b[key]??[])known(x);
    for(const u of b.unless??[]){known(u.line);if(!(u.within>0))at('unless.within');}
    const k={zone,fail:at};
    const checks=[];
    const when=b.when??{};
    for(const [name,arg] of Object.entries(when)){
      if(name==='near')continue;
      const make=CONDITIONS[name];if(!make)at(`unknown condition ${name}`);
      if(name==='active'||name==='done')for(const o of arg)objectiveKnown(o);
      if(name==='consumed'||name==='notConsumed')eventKnown(arg);
      if(name==='sinceEvent')eventKnown(arg.event);
      if(name==='progress')objectiveKnown(arg.objective);
      if(name==='readiness')eventKnown(arg);
      if(name==='farFrom'||name==='distTo'||name==='bearing')featureIds.has(arg.point)||at(`unknown map point ${arg.point}`);
      const [rank,test,only]=make(arg,k);
      if(only&&!only.includes(b.on))at(`condition ${name} needs the trigger ${only.join('/')}, not ${b.on}`);
      checks.push([rank,test]);
    }
    const nearTest=near=>{
      if(!near||typeof near!=='object'||!(near.m>0))at('near needs {of, m}');
      const of=near.of;if(of!=='event'&&of!=='speaker'&&!castIds.has(of))at(`near.of ${of}`);
      if(of==='event'&&['poll','coverRotation','guide'].includes(b.on))at('near.of event needs an event trigger');
      return (s,c,r)=>{
        const t=of==='event'?c.point:of==='speaker'?present(s,r.speaker):present(s,of);
        return t!=null&&Math.hypot(s.player.x-t.x,s.player.z-t.z)<=near.m;
      };
    };
    if(when.near)checks.push([3,nearTest(when.near)]);
    // after: [{line|event, sec, window, near?}]. A follow-up is due between sec and sec + window after its anchor, once per anchor.
    let after=null;
    if(b.after!==undefined){
      if(!Array.isArray(b.after)||!b.after.length)at('after must be a non-empty list');
      after=b.after.map(a=>{
        if((a.line===undefined)===(a.event===undefined))at('an after anchor names a line or an event');
        if(a.line!==undefined)known(a.line);else eventKnown(a.event);
        if(!(a.sec>=0)||!(a.window>0))at('after.sec/window');
        return {...a,nearTest:a.near?nearTest(a.near):null};
      });
      checks.push([1,(s,c,r)=>{
        const L=ledger(s),mine=r.group?L.g[r.group]?.[1]:L.at[r.id];   // once per anchor: by the rule, or by its group when the group answers one call with one of its lines
        for(const a of after){
          const t=a.line!==undefined?L.at[a.line]:s.consumed[a.event];
          if(t===undefined)continue;
          const age=s.clock-t;
          if(age>=a.sec&&age<=a.sec+a.window&&(mine===undefined||mine<t)&&(!a.nearTest||a.nearTest(s,c,r)))return true;
        }
        return false;}]);
    }
    if(b.unless?.length)checks.push([1,s=>{const L=ledger(s);for(const u of b.unless){const t=L.at[u.line];if(t!==undefined&&s.clock-t<u.within)return false;}return true;}]);
    if(b.requires?.length)checks.push([1,s=>{const L=ledger(s);for(const x of b.requires)if(L.at[x]===undefined)return false;return true;}]);
    // The speaker must be there: a named man who is dead or gone says nothing (PR #44). Anonymous voices (the platoon, any_pl) are not bound to an actor.
    const anon=anonymous.has(l.speaker);
    if(!anon)checks.push([3,(s,c,r)=>present(s,r.speaker)!==null]);
    checks.sort((x,y)=>x[0]-y[0]);
    rules.push({id,priority:l.priority,speaker:l.speaker,anon,on:b.on,cooldown,max,group:b.group??null,replaces:b.replaces??[],after:after!==null,order:rules.length,
      checks:checks.map(x=>x[1])});
  }
  rules.sort((a,b)=>a.priority-b.priority||a.order-b.order);   // arbitration order: most urgent first, then the order of the data
  // Groups alternate: their members are the rule lines that name the group, the most urgent first (then in data order): the first to speak is the one a player most needs to hear.
  const groups=new Map();
  for(const r of rules)if(r.group){if(!groups.has(r.group))groups.set(r.group,{members:[],index:new Map()});const g=groups.get(r.group);g.index.set(r.id,g.members.length);g.members.push(r.id);}
  for(const [name,g] of groups)if(g.members.length<2)fail(`group ${name} has one member`);
  // A line the rules look at after it was said (the ledger records its time): the rules themselves and everything a rule refers to.
  const watched=new Set(rules.map(r=>r.id));
  for(const l of lines.values())if(l.bark){for(const x of [...(l.bark.replaces??[]),...(l.bark.requires??[]),...(l.bark.unless??[]).map(u=>u.line),...(l.bark.after??[]).flatMap(a=>a.line?[a.line]:[])])watched.add(x);}
  const byTrigger=new Map();
  for(const r of rules){if(!byTrigger.has(r.on))byTrigger.set(r.on,[]);byTrigger.get(r.on).push(r);}
  return {config:cfg,rules,byTrigger,groups,watched,lines,ruleById:new Map(rules.map(r=>[r.id,r])),
    zones:Object.fromEntries(Object.keys(zones).map(n=>[n,zones[n]]))};
}
const COMPILED=compileBarks();
export const BARK_CONFIG=COMPILED.config,BARK_RULES=COMPILED.ruleById,BARK_GROUPS=COMPILED.groups,BARK_WATCHED=COMPILED.watched,BARK_LINES=COMPILED.lines;
export const BARK_RULE_LIST=COMPILED.rules;
const BY_TRIGGER=COMPILED.byTrigger,POLL=BY_TRIGGER.get('poll')??[];

// A cutscene may play a pre-roll before its event (the whistle and the warning before a demolition): barks wait for it too.
const PREROLL=definition.cutscenes.filter(c=>c.preRoll).map(c=>{
  const event=definition.events.find(e=>e.id===c.preRoll.event),at=seconds(event.trigger.at);
  return {event:event.id,from:at-c.preRoll.duration,to:at};
});

/** True while the bark channel is open: no scene, no German silence, no pre-roll, not the end of the mission. */
export function barkChannelOpen(s){
  if(s.scene||s.mission.complete||s.mission.phase==='OUTRO'||s.germanSilence())return false;
  for(const w of PREROLL)if(s.battleClock>=w.from&&s.battleClock<w.to&&!s.consumedEvent(w.event))return false;
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const CTX={event:null,point:null,node:null,hitN:0,prevKill:undefined};
const SCRATCH=[];
const BOOKED=new Set(['ally-fire','npc-shot','enemy_down_by_player','player-shot']);

function cooledDown(L,r,clock){
  const last=r.after||!r.group?L.at[r.id]:L.g[r.group]?.[1];   // a follow-up waits on its own line; a group shares one clock
  return last===undefined||clock-last>=r.cooldown;
}
function eligible(sim,r,c){
  const L=ledger(sim);
  if(r.max&&(L.n[r.id]??0)>=r.max)return false;
  if(!cooledDown(L,r,sim.clock))return false;
  for(let i=0;i<r.checks.length;i++)if(!r.checks[i](sim,c,r))return false;
  return true;
}
/** The global limits: a minimum gap since the last bark began (shorter for a follow-up) and a rolling 60 s budget per priority. */
export function barkAdmits(sim,priority,followUp){
  const L=ledger(sim),clock=sim.clock,cfg=BARK_CONFIG;
  if(clock-L.last<(followUp?cfg.followGapSec:cfg.gapSec[priority]))return false;
  let n=0;
  for(let i=L.recent.length-1;i>=0&&clock-L.recent[i]<60;i--)n++;
  return n<cfg.budget60[priority];
}
function speak(sim,r){
  const L0=ledger(sim),token=`${r.id}#${(L0.n[r.id]??0)+1}`;
  if(!sim.line(r.id,token))return false;   // the channel is full: nothing is recorded, the chance has passed
  const L=ensure(sim);   // (line() has told noteSpoken: the time of this line is in `last` and `recent`)
  L.n[r.id]=(L.n[r.id]??0)+1;
  if(r.group){const g=BARK_GROUPS.get(r.group);L.g[r.group]=[(g.index.get(r.id)+1)%g.members.length,sim.clock];}
  return true;
}
/** Takes the eligible rules (already in arbitration order) and says at most one: a line that substitutes another drops it from the offer, a group offers only the member
 *  whose turn it is, and the first of what is left that the global limits admit is spoken. */
function choose(sim,E){
  let offer=E;
  if(E.length>1){
    const replaced=new Set();
    for(const r of E)for(const id of r.replaces)replaced.add(id);
    offer=E.filter(r=>!replaced.has(r.id));
    const L=ledger(sim),first=new Map();
    for(const r of offer){
      if(!r.group)continue;
      const info=BARK_GROUPS.get(r.group),k=info.members.length,away=(info.index.get(r.id)-(L.g[r.group]?.[0]??0)+k)%k,cur=first.get(r.group);
      if(!cur||away<cur.away)first.set(r.group,{id:r.id,away});
    }
    offer=offer.filter(r=>!r.group||first.get(r.group).id===r.id);
  }
  for(const r of offer)if(barkAdmits(sim,r.priority,r.after)&&speak(sim,r))return true;
  return false;
}
function run(sim,rules,c){
  const E=SCRATCH;E.length=0;
  for(let i=0;i<rules.length;i++)if(eligible(sim,rules[i],c))E.push(rules[i]);
  const said=E.length>0&&choose(sim,E);
  E.length=0;
  return said;
}
function book(sim,event,c){
  const t=event.type;
  if((t==='ally-fire'||t==='npc-shot')&&NEEDS.allyFire)ensure(sim).seen.allyFire=sim.clock;
  else if(t==='enemy_down_by_player'&&NEEDS.kill){const s=ensure(sim).seen;c.prevKill=s.kill;s.kill=sim.clock;}
  else if(t==='player-shot'&&NEEDS.hits&&event.hit===true){const s=ensure(sim).seen;c.hitN=s.hits=(s.hits??0)+1;}
}
/** Called by M01Simulation.emit() for every event: bookkeeping for what the conditions watch, then the rules of that trigger. */
export function barkEvent(sim,event){
  const rules=BY_TRIGGER.get(event.type),booked=BOOKED.has(event.type);
  if(!rules&&!booked)return false;
  if(!sim.timers||!sim.world)return false;   // the simulation is still being built
  const c=CTX;c.event=event;c.point=event.point??event.origin??null;c.node=null;c.hitN=0;c.prevKill=undefined;
  if(booked)book(sim,event,c);
  return rules!==undefined&&barkChannelOpen(sim)&&run(sim,rules,c);
}
/** An explicit trigger of the simulation (coverRotation, guide). True when a line was said. */
export function barkTrigger(sim,name,{node=null}={}){
  const rules=BY_TRIGGER.get(name);
  if(!rules||!barkChannelOpen(sim))return false;
  const c=CTX;c.event=null;c.point=null;c.node=node;c.hitN=0;c.prevKill=undefined;
  return run(sim,rules,c);
}
/** The rules that read state: called at the end of every tick. */
export function barkPoll(sim){
  if(!POLL.length||!sim.timers||!barkChannelOpen(sim))return false;
  const c=CTX;c.event=null;c.point=null;c.node=null;c.hitN=0;c.prevKill=undefined;
  return run(sim,POLL,c);
}
/** M01Simulation.line() tells the director every line it queues, scripted or reactive: all of them count for the gap and the 60 s budget (a reactive line yields to a busy minute of
 *  scripted ones), and the lines the rules refer to are remembered by time, so «tocou há N s» also holds for lines the director did not choose (the callouts the combat code says). */
export function noteSpoken(sim,id){
  const L=ensure(sim),clock=sim.clock;
  L.last=clock;L.recent.push(clock);if(L.recent.length>RECENT_MAX)L.recent.shift();
  if(BARK_WATCHED.has(id))L.at[id]=clock;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Checks a saved timers.barks (called by validateM01Snapshot with its `reject`). Only what the machine can write is accepted. */
export function validateBarkState(b,clock,reject){
  const fin=(v,lo=0,hi=Infinity)=>Number.isFinite(v)&&v>=lo&&v<=hi,plain=v=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
  if(!plain(b)||Object.keys(b).some(k=>!['last','recent','at','n','g','seen'].includes(k))||['last','recent','at','n','g','seen'].some(k=>!Object.hasOwn(b,k)))reject('barks');
  if(!fin(b.last,-1e9,clock)||!Array.isArray(b.recent)||b.recent.length>RECENT_MAX||b.recent.some((t,i)=>!fin(t,0,clock)||(i>0&&t<b.recent[i-1])))reject('barks last/recent');
  if(!plain(b.at)||Object.entries(b.at).some(([id,t])=>!BARK_WATCHED.has(id)||!fin(t,0,clock)))reject('barks at');
  if(!plain(b.n)||Object.entries(b.n).some(([id,n])=>!BARK_RULES.has(id)||!Number.isInteger(n)||n<1||n>(BARK_RULES.get(id).max||10000)))reject('barks n');
  if(!plain(b.g)||Object.entries(b.g).some(([name,v])=>!BARK_GROUPS.has(name)||!Array.isArray(v)||v.length!==2||!Number.isInteger(v[0])||v[0]<0||v[0]>=BARK_GROUPS.get(name).members.length||!fin(v[1],0,clock)))reject('barks g');
  const s=b.seen;
  if(!plain(s)||Object.keys(s).some(k=>!['allyFire','peek','kill','hits','sun'].includes(k)))reject('barks seen');
  for(const k of ['allyFire','peek','kill'])if(s[k]!==undefined&&!fin(s[k],0,clock))reject('barks seen '+k);
  if(s.hits!==undefined&&(!Number.isInteger(s.hits)||s.hits<1))reject('barks seen hits');
  if(s.sun!==undefined&&(!Array.isArray(s.sun)||s.sun.length!==2||!fin(s.sun[0],0,clock)||!fin(s.sun[1],s.sun[0],clock)))reject('barks seen sun');
  return b;
}
