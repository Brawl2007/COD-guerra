// R4 WP-0 (2026-10-25): the section machinery of the current act as FACTORIES, so a new act can build its own squad bounds, firing line and approach assault
// from its own data. The current act keeps importing the modules it always imported (m01-squad.js, m01-rearguard.js, m01-deck-assault.js): those files are inputs
// pinned by sha256 in the golden of amendment 20 and are NOT touched. What this module proves instead (tests/m01-acts.test.js) is that each factory, given the
// current act's data, returns a plan deep-equal to the constant the current act uses (SQUAD, REARGUARD) and that the generic squad step decides exactly what
// updateSquad decides. Pure data and pure functions: no RNG, no clock, no imports from the renderer.
import {DECK_ASSAULT_VERSION,DECK_PHASES,DECK_KEYS} from './m01-deck-assault.js';

const seconds=text=>{const v=text.split(':').map(Number);if(v.length===2)v.push(0);return v.reduce((n,x)=>n*60+x,0);};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const num=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
const deepFreeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const x of Object.values(v))deepFreeze(x);}return v;};
const copy=v=>JSON.parse(JSON.stringify(v));

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Squad bounds (m01-squad.js). The current act's SQUAD as data: makeSquadPlan(BW_SQUAD_SPEC) is deep-equal to SQUAD.
export const BW_SQUAD_SPEC=deepFreeze({
  teams:[['staszek_pawlak','east_platoon_voice'],['szymon_kowal']],
  posts:[null,
    {id:'repair_sandbags',slots:{staszek_pawlak:[-149.6,11.5],east_platoon_voice:[-150.6,12.6],szymon_kowal:[-153.1,11.4]}},
    {id:'rally_west',slots:{staszek_pawlak:[-163.6,17.2],east_platoon_voice:[-165.2,16.4],szymon_kowal:[-163.2,19.4]}}],
  moves:[{team:0,to:1,call:'order',orderAfterSec:3},{team:1,to:1,call:'passed',escortPastX:-55},{team:0,to:2,call:'fallback',escortPastX:-135},{team:1,to:2,call:'follow',afterArrivalSec:2}],
  pace:4.2,arriveM:.9,stallSec:30,lastCall:'06:36:00',
  cover:{freshSec:10,lookSec:[2.5,2]},
});
const MOVE_TRIGGERS=['orderAfterSec','escortPastX','afterArrivalSec'];
/** A squad plan from data: teams of actor ids, posts (post 0 is each man's staged slot, so it is null), the bounds in order, pace and timings. Throws on a typo. */
export function makeSquadPlan(spec,label='M01 squad'){
  const fail=m=>{throw new Error(`${label}: ${m}`);};
  if(!spec||!Array.isArray(spec.teams)||!spec.teams.length||!spec.teams.every(t=>Array.isArray(t)&&t.length&&t.every(id=>typeof id==='string'&&id)))fail('teams');
  const ids=spec.teams.flat();if(new Set(ids).size!==ids.length)fail('a man in two teams');
  if(!Array.isArray(spec.posts)||spec.posts[0]!==null||spec.posts.length<2)fail('posts: [null, {id, slots}...]');
  for(const p of spec.posts.slice(1)){if(!p||typeof p.id!=='string'||!p.slots)fail('post id/slots');
    for(const id of ids)if(!Array.isArray(p.slots[id])||p.slots[id].length!==2||!p.slots[id].every(Number.isFinite))fail(`${p.id}: slot of ${id}`);}
  if(!Array.isArray(spec.moves)||!spec.moves.length)fail('moves');
  for(const m of spec.moves){
    if(!Number.isInteger(m.team)||m.team<0||m.team>=spec.teams.length||!Number.isInteger(m.to)||m.to<1||m.to>=spec.posts.length||typeof m.call!=='string')fail('move team/to/call');
    if(MOVE_TRIGGERS.filter(k=>m[k]!==undefined).length!==1||!MOVE_TRIGGERS.every(k=>m[k]===undefined||Number.isFinite(m[k])))fail('move: exactly one of '+MOVE_TRIGGERS.join(' / '));
  }
  if(!num(spec.pace,.5,8)||!num(spec.arriveM,.1,5)||!num(spec.stallSec,1,600)||!/^\d\d:\d\d(:\d\d)?$/.test(spec.lastCall??''))fail('pace / arriveM / stallSec / lastCall');
  if(!spec.cover||!num(spec.cover.freshSec,0,120)||!Array.isArray(spec.cover.lookSec)||spec.cover.lookSec.length!==2||!spec.cover.lookSec.every(Number.isFinite))fail('cover');
  const plan=copy({teams:spec.teams,posts:spec.posts,moves:spec.moves,pace:spec.pace,arriveM:spec.arriveM,stallSec:spec.stallSec,lastCall:spec.lastCall,cover:spec.cover});
  return deepFreeze(plan);
}
export const squadIdsOf=plan=>plan.teams.flat();
const teamOfIn=(plan,id)=>plan.teams.findIndex(t=>t.includes(id));
/** The slot of man `id` at post k of `plan` (post 0: his staged slot). Same as m01-squad.js squadSlot for SQUAD. */
export function squadSlotOf(plan,stageSlots,id,k){
  if(k===0){const s=stageSlots[id];return {x:s.x,z:s.z};}
  const [x,z]=plan.posts[k].slots[id];return {x,z};
}
export const squadMovingIn=(plan,q,a)=>Boolean(q?.moving&&plan.moves[q.move]?.team===teamOfIn(plan,a.id));
/**
 * The generic step of m01-squad.js updateSquad over any plan: the same rules, line for line (tests/m01-acts.test.js runs both over the same states).
 * `ctx`: {stageSlots, carrier (or null), east (the clock the first order counts from), say(node)}. The record lives in sim.timers[key].
 */
export function squadStep(plan,sim,ctx,key='squad'){
  const lastCall=seconds(plan.lastCall);
  let q=sim.timers[key];
  const members=t=>plan.teams[t].map(id=>sim.actor(id)).filter(a=>a&&a.alive&&a.active&&a.state!=='WOUNDED'&&!a.carriedBy);
  if(!q){
    let move=0;
    while(move<plan.moves.length){const m=plan.moves[move],team=members(m.team);
      if(!team.length||!team.every(a=>a.x<=squadSlotOf(plan,ctx.stageSlots,a.id,m.to).x+3))break;move++;}
    q=sim.timers[key]={move,moving:false,since:sim.clock};
  }
  if(q.move>=plan.moves.length)return q;
  const m=plan.moves[q.move],team=members(m.team);
  if(!team.length){q.move++;q.moving=false;q.since=sim.clock;return q;}
  if(q.moving){
    const arrived=team.every(a=>dist(a,squadSlotOf(plan,ctx.stageSlots,a.id,m.to))<plan.arriveM);
    if(arrived||sim.clock-q.since>=plan.stallSec){q.moving=false;q.move++;q.since=sim.clock;ctx.say('hold');}
    return q;
  }
  const pinned=team.some(a=>sim.clock<a.suppressedUntil);
  let due=false,call=m.call;
  if(m.orderAfterSec!==undefined)due=!sim.scene&&sim.clock-ctx.east>=m.orderAfterSec;
  else if(m.escortPastX!==undefined)due=(ctx.carrier??sim.player).x<m.escortPastX;
  else if(m.afterArrivalSec!==undefined)due=sim.clock-q.since>=m.afterArrivalSec;
  const early=pinned&&m.orderAfterSec===undefined;
  if(!due&&(early||sim.battleClock>=lastCall)){due=true;if(early)call='pinned';}
  if(due){q.moving=true;q.since=sim.clock;ctx.say(call);}
  return q;
}
/** Saved record of a squad step (as m01-squad.js validateSquadRecord, over any plan). */
export function validSquadRecord(plan,q,clock){
  return Boolean(q)&&typeof q==='object'&&!Array.isArray(q)&&Object.keys(q).length===3&&Number.isInteger(q.move)&&q.move>=0&&q.move<=plan.moves.length&&typeof q.moving==='boolean'&&
    !(q.moving&&q.move>=plan.moves.length)&&Number.isFinite(q.since)&&q.since>=0&&q.since<=clock;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Firing line (m01-rearguard.js rearguardPlan): men who kneel at their posts and rise to fire one real round. makeLinePlan(definition, BW_LINE_OPTIONS) is
// deep-equal to REARGUARD; another act passes its own group, id pattern and post box.
export const BW_LINE_OPTIONS=deepFreeze({group:'grp_east_platoon',key:'rearguard',man:'^pl_east_\\d+$',postBox:{minX:161,maxX:400,minZ:37.6,maxZ:42.4},survivorFloor:true,label:'M01 rearguard'});
export function makeLinePlan(def,o=BW_LINE_OPTIONS){
  const fail=m=>{throw new Error(`${o.label}: ${m}`);};
  const g=def.groups.find(x=>x.id===o.group),r=g?.[o.key];if(!r)fail(`${o.group}.${o.key} missing`);
  if(r.version!==1)fail('version');
  if(def.events.find(e=>e.id===r.from)?.trigger?.type!=='battleClock')fail('from must be a battleClock event');
  const floor=g.survivorsRange?.[0],pattern=new RegExp(o.man),index=id=>Number(/\d+$/.exec(id)[0]);
  if(!Array.isArray(r.men)||!r.men.length||new Set(r.men).size!==r.men.length||!r.men.every(id=>pattern.test(id)&&(!o.survivorFloor||index(id)<floor)))fail(o.survivorFloor?'men: pl_east_* below the survivors floor':'men');
  const b=o.postBox;
  if(!Array.isArray(r.posts)||r.posts.length!==r.men.length||!r.posts.every(p=>Array.isArray(p)&&p.length===2&&num(p[0],b.minX,b.maxX)&&num(p[1],b.minZ,b.maxZ)))fail(`posts: one place per man, x ${b.minX}-${b.maxX}`);
  for(let i=0;i<r.posts.length;i++)for(let k=0;k<i;k++)if(Math.hypot(r.posts[i][0]-r.posts[k][0],r.posts[i][1]-r.posts[k][1])<1.3)fail('posts at least 1.3 m apart');
  if(!num(r.joinWithinM,0,100)||!num(r.runSpeed,2,7))fail('joinWithinM / runSpeed');
  const f=r.fire;
  if(!f||f.weapon!=='kb_wz29'||!num(f.pauseSec,2,30)||!Array.isArray(f.sigmaMil)||f.sigmaMil.length!==2||
    !f.sigmaMil.every(v=>num(v,.1,20))||!num(f.clearanceM,.5,5)||!num(f.headroomM,0,1)||!num(f.rangeM,100,1200)||!num(f.riseBeforeSec,.1,3)||!num(f.holdAfterSec,.1,3))fail('fire');
  return Object.freeze({version:r.version,from:r.from,men:Object.freeze([...r.men]),posts:Object.freeze(r.posts.map(([x,z])=>Object.freeze({x,z}))),
    joinWithinM:r.joinWithinM,runSpeed:r.runSpeed,fire:Object.freeze({...f,sigmaMil:Object.freeze([...f.sigmaMil])})});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// Approach assault: the deck assault (m01-deck-assault.js) generalised from the road deck (west along x) to a line of approach over open ground (from north to
// south along z). Same phases and the same saved record keys as the deck man's `deck` record (DECK_PHASES, DECK_KEYS, version DECK_ASSAULT_VERSION): an
// overwatch that walks to its node and fires from cover, an assault that bounds from station to station (cover behind turned earth), holds at its limit, may
// press on to a closing line, and falls back along its own path when the casualties or the suppression break it.
export const APPROACH_PHASES=DECK_PHASES,APPROACH_KEYS=DECK_KEYS,APPROACH_VERSION=DECK_ASSAULT_VERSION;
/**
 * `spec`: act.json grp_*.assault. `bounds`: {minX,maxX} the lanes and nodes must lie in, `groundY`. Returns the frozen plan: per man his entry, his path
 * (stops and bypass waypoints round his own cover), his stop indices, the covers (one per stop, south of it, the side the fire comes from) and the timings.
 */
export function makeApproachPlan(spec,{minX,maxX,groundY=-3,label='M01 approach assault'}){
  const fail=m=>{throw new Error(`${label}: ${m}`);};
  if(!spec||spec.version!==APPROACH_VERSION)fail('version');
  const range=(r,lo,hi)=>Array.isArray(r)&&r.length===2&&num(r[0],lo,hi)&&num(r[1],r[0],hi);
  if(!num(spec.entryZ,-1e5,1e5)||!num(spec.clearZ,spec.entryZ,1e5))fail('entryZ / clearZ');
  const st=spec.stations;
  if(!Array.isArray(st)||st.length<2||st.some((z,i)=>!Number.isFinite(z)||z<=spec.entryZ||(i&&z<=st[i-1])))fail('stations: z, north to south, south of entryZ');
  if(!Number.isInteger(spec.limitStation)||spec.limitStation<0||spec.limitStation>=st.length)fail('limitStation');
  const c=spec.cover;if(!c||!num(c.widthM,.5,6)||!num(c.depthM,.3,3)||!num(c.heightM,.3,2)||!num(c.aheadM,.4,3)||!num(c.bypassM,c.widthM/2+.6,6))fail('cover');
  if(!num(spec.walkSpeed,.5,4)||!num(spec.rushSpeed,2,7)||!num(spec.fallbackSpeed,2,7))fail('speeds');
  if(!range(spec.coverSec,.5,30)||!range(spec.holdSec,1,120)||!num(spec.closeAfterSec,0,600)||!num(spec.pinnedWaitMaxSec,0,30)||!num(spec.breakPinnedSec,1,300)||
    !Number.isInteger(spec.breakOut)||spec.breakOut<1||!num(spec.maxSec,30,900))fail('timings');
  const f=spec.fire,pair=p=>Array.isArray(p)&&p.length===2&&p.every(v=>num(v,0,20));
  if(!f||!num(f.assaultPauseSec,1,60)||!num(f.overwatchPauseSec,1,60)||!num(f.riseBeforeSec,.1,3)||!num(f.holdAfterSec,.1,3)||!num(f.rangeM,50,1500)||
    !f.rifle||!pair(f.rifle.bias)||!pair(f.rifle.cone)||!f.mg||!Number.isInteger(f.mg.rounds)||f.mg.rounds<1||f.mg.rounds>20||!num(f.mg.interval,.03,.5)||!pair(f.mg.bias)||!pair(f.mg.cone))fail('fire');
  const w=spec.playerWeight;if(!w||!['recruta','soldado','veterano'].every(k=>num(w[k],0,10)))fail('playerWeight');
  const ids=[],covers=[],men=[];
  const cover=(id,x,z)=>{const box={id,min:{x:x-c.widthM/2,y:groundY,z:z+c.aheadM},max:{x:x+c.widthM/2,y:groundY+c.heightM,z:z+c.aheadM+c.depthM}};covers.push(box);return box.id;};
  const inX=x=>num(x,minX,maxX);
  if(!Array.isArray(spec.overwatch)||!spec.overwatch.length)fail('overwatch');
  for(const o of spec.overwatch){
    if(typeof o.id!=='string'||!['mg34','kar98k'].includes(o.weapon)||!Array.isArray(o.node)||!inX(o.node[0])||!(o.node[1]>spec.entryZ))fail(`overwatch ${o.id}`);
    ids.push(o.id);const node={x:o.node[0],z:o.node[1]};
    men.push({id:o.id,role:'overwatch',weapon:o.weapon,entry:{x:node.x,z:spec.entryZ},path:[{x:node.x,z:node.z,stop:true,station:-1}],stops:[0],limitStop:0,deepestStop:0,cover:cover(`np_cover_${o.id}`,node.x,node.z)});
  }
  if(!Array.isArray(spec.lanes)||!spec.lanes.length)fail('lanes');
  for(const lane of spec.lanes){
    if(!Array.isArray(lane.men)||!Array.isArray(lane.x)||lane.men.length!==lane.x.length||!lane.x.every(inX))fail(`lane ${lane.id}`);
    lane.men.forEach((id,k)=>{
      ids.push(id);const x=lane.x[k],path=[],stops=[];
      st.forEach((z,s)=>{
        if(s){const prev=st[s-1],b=x+c.bypassM;path.push({x:b,z:prev,stop:false,station:s-1});path.push({x:b,z:prev+c.aheadM+c.depthM+.5,stop:false,station:s-1});}
        stops.push(path.length);path.push({x,z,stop:true,station:s});cover(`np_cover_${id}_${s}`,x,z);
      });
      men.push({id,role:'assault',lane:lane.id,weapon:'kar98k',entry:{x,z:spec.entryZ},path,stops,limitStop:stops[spec.limitStation],deepestStop:stops.at(-1)});
    });
  }
  if(new Set(ids).size!==ids.length)fail('a man listed twice');
  // Every cover clear of every path segment of every other man (bodies are 0.3 m): a typo that puts a lane through somebody's earth stops the game.
  const segs=men.flatMap(m=>[m.entry,...m.path].slice(1).map((p,i,arr)=>({id:m.id,a:i?arr[i-1]:m.entry,b:p})));
  const near=(s,box,r)=>{for(let t=0;t<=1;t+=.02){const x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t;if(x>box.min.x-r&&x<box.max.x+r&&z>box.min.z-r&&z<box.max.z+r)return true;}return false;};
  for(const s of segs)for(const box of covers)if(near(s,box,.32))fail(`path of ${s.id} crosses ${box.id}`);
  return deepFreeze({version:spec.version,from:spec.from,entryZ:spec.entryZ,clearZ:spec.clearZ,men,ids,covers,cover:{...c},
    walkSpeed:spec.walkSpeed,rushSpeed:spec.rushSpeed,fallbackSpeed:spec.fallbackSpeed,coverSec:[...spec.coverSec],holdSec:[...spec.holdSec],closeAfterSec:spec.closeAfterSec,
    pinnedWaitMaxSec:spec.pinnedWaitMaxSec,breakPinnedSec:spec.breakPinnedSec,breakOut:spec.breakOut,maxSec:spec.maxSec,fire:copy(f),playerWeight:{...w}});
}
/** A saved approach record: the deck keys (and `lim` optionally), a known phase, a node on the man's path, times the machine could have written. */
export function validApproachRecord(plan,a,clock){
  const d=a.deck,man=plan.men.find(m=>m.id===a.id),finite=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
  if(!man||!d||typeof d!=='object'||Array.isArray(d)||APPROACH_KEYS.some(k=>!Object.hasOwn(d,k)))return false;
  if(Object.keys(d).some(k=>!APPROACH_KEYS.includes(k)&&k!=='lim'))return false;
  if(d.v!==APPROACH_VERSION||!APPROACH_PHASES.includes(d.phase)||!Number.isInteger(d.node)||d.node<-1||d.node>=man.path.length)return false;
  if(d.lim!==undefined&&(!Number.isInteger(d.lim)||!man.stops.includes(d.lim)))return false;
  return finite(d.t0,0,clock)&&finite(d.since,d.t0,clock)&&finite(d.until,0,clock+600)&&finite(d.pinned,0,1e6);
}
