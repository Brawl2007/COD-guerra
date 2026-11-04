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
// R4 duration work (2026-11-03): the assault may come in ECHELONS. The first is the spec itself (overwatch, lanes, stations and thresholds at its top level, as
// before: a spec without `echelons` is the single-echelon assault of INC-1, unchanged). `spec.echelons` lists the ones that follow: each enters from the entry line
// `lullSec` after the echelon before it has left the field (the overwatch keeps its posts through the lull), on lanes of its own that may follow one another by `delaySec`
// (a column in file), with thresholds of its own and, if it wants, an overwatch of its own that walks in with it. The overwatch of every echelon stays on the field until the
// LAST echelon breaks, which makes everybody fall back.
// 2026-11-04 (Captain's decisions, reversible): an echelon may name a `checkpoint` (the one saved when the echelon before it breaks: the pause that leads to it), and the assault's `fire` may carry
// `suppress` (the suppressive fire of its machine guns). Both are optional, validated here, and read by m01-area-sim.js; validGermanAi checks what the guns keep of it in a save.
export const APPROACH_PHASES=DECK_PHASES,APPROACH_KEYS=DECK_KEYS,APPROACH_VERSION=DECK_ASSAULT_VERSION;
/** The keys of sim.timers.wave and of each of its echelon records (the saved state of an approach assault; validApproachWave). */
export const APPROACH_WAVE_KEYS=Object.freeze(['at','brokenAt','casualties','closeCalled','ech','echs','lullUntil','repelledAt']);
export const APPROACH_ECHELON_KEYS=Object.freeze(['at','brokenAt','casualties','closed','seen']);
const ECHELON_SPEC_KEYS=Object.freeze(['id','lullSec','checkpoint','overwatch','lanes','stations','limitStation','closeAfterSec','breakPinnedSec','breakOut','maxSec']);
const LANE_KEYS=Object.freeze(['id','men','x','delaySec']),OVERWATCH_KEYS=Object.freeze(['id','weapon','node','delaySec']);
// Suppressive fire of the machine guns (Captain's decision 2026-11-04): `fire.suppress` of the assault. A gun of `weapon` that has no target in sight fires short bursts of real rounds at the
// place where it last saw a muzzle flash of a Pole (or of the player), for `memorySec` after it, one burst every `pauseSec` seconds (drawn), `pinnedPauseFactor` times that pause while it is pinned.
const SUPPRESS_KEYS=Object.freeze(['weapon','memorySec','rounds','pauseSec','pinnedPauseFactor','note']);
const CHECKPOINT_ID=/^cp_[a-z0-9_]+$/;
/**
 * `spec`: act.json grp_*.assault. `bounds`: {minX,maxX} the lanes and nodes must lie in, `groundY`; `solids`: boxes {id,min:{x,z},max:{x,z}} of the area (wreck,
 * parapet) that no path may cross and no cover may touch. Returns the frozen plan: per man his echelon, entry, path (stops and bypass waypoints round his own
 * cover), stop indices, the covers (one per stop, south of it, the side the fire comes from), and per echelon its men and thresholds.
 */
export function makeApproachPlan(spec,{minX,maxX,groundY=-3,label='M01 approach assault',solids=[]}){
  const fail=m=>{throw new Error(`${label}: ${m}`);};
  if(!spec||spec.version!==APPROACH_VERSION)fail('version');
  const range=(r,lo,hi)=>Array.isArray(r)&&r.length===2&&num(r[0],lo,hi)&&num(r[1],r[0],hi);
  if(!num(spec.entryZ,-1e5,1e5)||!num(spec.clearZ,spec.entryZ,1e5))fail('entryZ / clearZ');
  const stationsOk=st=>Array.isArray(st)&&st.length>=2&&st.every((z,i)=>Number.isFinite(z)&&z>spec.entryZ&&(!i||z>st[i-1]));
  const limitOk=(l,st)=>Number.isInteger(l)&&l>=0&&l<st.length;
  const timingsOk=e=>num(e.closeAfterSec,0,600)&&num(e.breakPinnedSec,1,300)&&Number.isInteger(e.breakOut)&&e.breakOut>=1&&num(e.maxSec,30,900);
  if(!stationsOk(spec.stations))fail('stations: z, north to south, south of entryZ');
  if(!limitOk(spec.limitStation,spec.stations))fail('limitStation');
  const c=spec.cover;if(!c||!num(c.widthM,.5,6)||!num(c.depthM,.3,3)||!num(c.heightM,.3,2)||!num(c.aheadM,.4,3)||!num(c.bypassM,c.widthM/2+.6,6))fail('cover');
  if(!num(spec.walkSpeed,.5,4)||!num(spec.rushSpeed,2,7)||!num(spec.fallbackSpeed,2,7))fail('speeds');
  if(!num(spec.fallbackStallSec,5,120))fail('fallbackStallSec 5-120 (seconds a man may go without reaching a node on his fall-back before he is taken off the field)');
  if(!range(spec.coverSec,.5,30)||!range(spec.holdSec,1,120)||!num(spec.pinnedWaitMaxSec,0,30)||!timingsOk(spec))fail('timings');
  const f=spec.fire,pair=p=>Array.isArray(p)&&p.length===2&&p.every(v=>num(v,0,20));
  if(!f||!num(f.assaultPauseSec,1,60)||!num(f.overwatchPauseSec,1,60)||!num(f.riseBeforeSec,.1,3)||!num(f.holdAfterSec,.1,3)||!num(f.rangeM,50,1500)||
    !f.rifle||!pair(f.rifle.bias)||!pair(f.rifle.cone)||!f.mg||!Number.isInteger(f.mg.rounds)||f.mg.rounds<1||f.mg.rounds>20||!num(f.mg.interval,.03,.5)||!pair(f.mg.bias)||!pair(f.mg.cone))fail('fire');
  const w=spec.playerWeight;if(!w||!['recruta','soldado','veterano'].every(k=>num(w[k],0,10)))fail('playerWeight');
  if(f.suppress!==undefined){   // optional: without it the machine guns fire at what they see and at nothing else, as in INC-1
    const z=f.suppress,whole=r=>Array.isArray(r)&&r.length===2&&r.every(v=>Number.isInteger(v)&&v>=1&&v<=f.mg.rounds)&&r[0]<=r[1];
    if(!z||typeof z!=='object'||Array.isArray(z))fail('fire.suppress: an object, or leave it out');
    const bad=Object.keys(z).find(k=>!SUPPRESS_KEYS.includes(k));if(bad!==undefined)fail(`fire.suppress: unknown key ${bad}`);
    if(z.weapon!=='mg34'||!num(z.memorySec,1,120)||!whole(z.rounds)||!range(z.pauseSec,1,60)||!num(z.pinnedPauseFactor,1,6))
      fail(`fire.suppress: weapon mg34 / memorySec 1-120 / rounds [lo, hi] whole numbers 1-${f.mg.rounds} (a short burst) / pauseSec [lo, hi] 1-60 / pinnedPauseFactor 1-6`);
  }
  // The echelons: the spec itself, then those that follow it.
  if(spec.echelons!==undefined&&(!Array.isArray(spec.echelons)||!spec.echelons.length))fail('echelons: a non-empty array, or leave it out');
  const specs=[{id:'first',lullSec:0,overwatch:spec.overwatch,lanes:spec.lanes,stations:spec.stations,limitStation:spec.limitStation,closeAfterSec:spec.closeAfterSec,
    breakPinnedSec:spec.breakPinnedSec,breakOut:spec.breakOut,maxSec:spec.maxSec}];
  for(const [i,e] of (spec.echelons??[]).entries()){
    const name=`echelon ${typeof e?.id==='string'&&e.id?e.id:'#'+(i+1)}`;
    if(!e||typeof e!=='object'||Array.isArray(e)||typeof e.id!=='string'||!e.id||specs.some(x=>x.id===e.id))fail(`${name}: id (a string, different from the other echelons' and from "first")`);
    const extra=Object.keys(e).find(k=>!ECHELON_SPEC_KEYS.includes(k));if(extra!==undefined)fail(`${name}: unknown key ${extra}`);
    if(!num(e.lullSec,5,180))fail(`${name}: lullSec 5-180 (seconds from the moment the echelon before has left the field to the entry of this one)`);
    if(e.checkpoint!==undefined&&(typeof e.checkpoint!=='string'||!CHECKPOINT_ID.test(e.checkpoint)||specs.some(x=>x.checkpoint===e.checkpoint)))
      fail(`${name}: checkpoint (an id cp_..., different from the other echelons': the checkpoint saved when the echelon before breaks and the pause that leads to this one begins)`);
    const st=e.stations??spec.stations,lim=e.limitStation??spec.limitStation;
    if(!stationsOk(st))fail(`${name}: stations: z, north to south, south of entryZ`);
    if(!limitOk(lim,st))fail(`${name}: limitStation`);
    if(!timingsOk(e))fail(`${name}: closeAfterSec / breakPinnedSec / breakOut / maxSec (every echelon sets its own thresholds)`);
    specs.push({...e,overwatch:e.overwatch??[],stations:st,limitStation:lim});
  }
  const ids=[],covers=[],men=[],laneIds=new Set(),echelons=[];
  const cover=(id,x,z)=>{const box={id,min:{x:x-c.widthM/2,y:groundY,z:z+c.aheadM},max:{x:x+c.widthM/2,y:groundY+c.heightM,z:z+c.aheadM+c.depthM}};covers.push(box);return box.id;};
  const inX=x=>num(x,minX,maxX);
  specs.forEach((e,k)=>{
    const name=k?`echelon ${e.id}: `:'',mine={assault:[],overwatch:[]};
    // delaySec: seconds after the echelon's entry that a man walks in (a gun: a number; a lane: a number for all its men, or one number per man for a column in file).
    // The first echelon is already in the field when the wave goes on, so it takes none. Never more than half the echelon's clock.
    const maxDelay=Math.min(120,e.maxSec/2);
    const delaysOf=(o,count,what)=>{
      if(o.delaySec===undefined)return Array(count).fill(0);
      if(!k)fail(`${what}: delaySec belongs to the echelons that follow the first (the first is on the field when the wave starts)`);
      const list=Array.isArray(o.delaySec)?o.delaySec:Array(count).fill(o.delaySec);
      if(list.length!==count||!list.every(v=>num(v,0,maxDelay)))fail(`${name}${what}: delaySec 0-${maxDelay} s (half the echelon's maxSec at most), one number or one per man`);
      return list;
    };
    if(!Array.isArray(e.overwatch)||(!k&&!e.overwatch.length))fail(`${name}overwatch`);
    for(const o of e.overwatch){
      if(!o||typeof o.id!=='string'||!['mg34','kar98k'].includes(o.weapon)||!Array.isArray(o.node)||!inX(o.node[0])||!(o.node[1]>spec.entryZ)||Object.keys(o).some(x=>!OVERWATCH_KEYS.includes(x)))fail(`${name}overwatch ${o?.id}`);
      const [delaySec]=delaysOf(o,1,`overwatch ${o.id}`);
      ids.push(o.id);mine.overwatch.push(o.id);const node={x:o.node[0],z:o.node[1]};
      men.push({id:o.id,role:'overwatch',echelon:k,delaySec,weapon:o.weapon,entry:{x:node.x,z:spec.entryZ},path:[{x:node.x,z:node.z,stop:true,station:-1}],stops:[0],limitStop:0,deepestStop:0,cover:cover(`np_cover_${o.id}`,node.x,node.z)});
    }
    if(!Array.isArray(e.lanes)||!e.lanes.length)fail(`${name}lanes`);
    for(const lane of e.lanes){
      if(!lane||typeof lane.id!=='string'||!lane.id||laneIds.has(lane.id)||!Array.isArray(lane.men)||!lane.men.every(id=>typeof id==='string'&&id)||!Array.isArray(lane.x)||
        lane.men.length!==lane.x.length||!lane.x.every(inX)||Object.keys(lane).some(x=>!LANE_KEYS.includes(x)))fail(`${name}lane ${lane?.id}`);
      const delays=delaysOf(lane,lane.men.length,`lane ${lane.id}`);
      laneIds.add(lane.id);
      lane.men.forEach((id,j)=>{
        ids.push(id);mine.assault.push(id);const x=lane.x[j],path=[],stops=[];
        e.stations.forEach((z,s)=>{
          if(s){const prev=e.stations[s-1],b=x+c.bypassM;path.push({x:b,z:prev,stop:false,station:s-1});path.push({x:b,z:prev+c.aheadM+c.depthM+.5,stop:false,station:s-1});}
          stops.push(path.length);path.push({x,z,stop:true,station:s});cover(`np_cover_${id}_${s}`,x,z);
        });
        men.push({id,role:'assault',echelon:k,delaySec:delays[j],lane:lane.id,weapon:'kar98k',entry:{x,z:spec.entryZ},path,stops,limitStop:stops[e.limitStation],deepestStop:stops.at(-1)});
      });
    }
    // Its casualties are its own men, the assault and the overwatch it brings (the first echelon's overwatch is the first echelon's): it cannot break on more than that.
    if(e.breakOut>mine.assault.length+mine.overwatch.length)fail(`${name}breakOut ${e.breakOut} is more than its ${mine.assault.length} assault men plus ${mine.overwatch.length} on overwatch`);
    echelons.push({index:k,id:e.id,lullSec:e.lullSec,checkpoint:e.checkpoint??null,men:mine.assault,overwatch:mine.overwatch,stations:[...e.stations],limitStation:e.limitStation,
      closeAfterSec:e.closeAfterSec,breakPinnedSec:e.breakPinnedSec,breakOut:e.breakOut,maxSec:e.maxSec});
  });
  if(new Set(ids).size!==ids.length)fail('a man listed twice');
  // Every cover clear of every path segment of every other man (bodies are 0.3 m), every path and cover clear of the area's own solids (wreck, parapet): a typo
  // that puts a lane through somebody's earth, or through the wreck, stops the game.
  const segs=men.flatMap(m=>[m.entry,...m.path].slice(1).map((p,i,arr)=>({id:m.id,a:i?arr[i-1]:m.entry,b:p})));
  // Exact: the segment clipped against the box grown by r on every side (slab method), so no leg is too long for a thin box to slip between samples. Touching an edge is not crossing.
  const near=(s,box,r)=>{
    let t0=0,t1=1;
    for(const k of ['x','z']){
      const lo=box.min[k]-r,hi=box.max[k]+r,a=s.a[k],d=s.b[k]-a;
      if(Math.abs(d)<1e-12){if(!(a>lo&&a<hi))return false;continue;}
      let u=(lo-a)/d,v=(hi-a)/d;if(u>v)[u,v]=[v,u];
      t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>=t1)return false;
    }
    return true;
  };
  // A man that falls back walks every leg of his path at fallbackSpeed: the stall limit must leave a leg a third again of the time it takes, or a healthy man would be taken for stuck.
  const longestLeg=Math.max(...segs.map(s=>Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z)));
  if(spec.fallbackStallSec<longestLeg/spec.fallbackSpeed*1.33)fail(`fallbackStallSec ${spec.fallbackStallSec} is shorter than a third more than the longest leg (${longestLeg.toFixed(1)} m at ${spec.fallbackSpeed} m/s)`);
  for(const s of segs)for(const box of [...covers,...solids])if(near(s,box,.32))fail(`path of ${s.id} crosses ${box.id}`);
  for(const box of covers)for(const s of solids)if(box.max.x>s.min.x-.3&&box.min.x<s.max.x+.3&&box.max.z>s.min.z-.3&&box.min.z<s.max.z+.3)fail(`${box.id} touches ${s.id}`);
  return deepFreeze({version:spec.version,from:spec.from,entryZ:spec.entryZ,clearZ:spec.clearZ,men,ids,covers,cover:{...c},echelons,
    walkSpeed:spec.walkSpeed,rushSpeed:spec.rushSpeed,fallbackSpeed:spec.fallbackSpeed,fallbackStallSec:spec.fallbackStallSec,coverSec:[...spec.coverSec],holdSec:[...spec.holdSec],closeAfterSec:spec.closeAfterSec,
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
/** The state of the fight a wave record stands for: pending (no record), active (an echelon is on the field), lull (it broke and another follows), broken (the last broke), repelled. */
export function approachFlagOf(plan,W){
  if(!W)return 'pending';
  if(W.repelledAt!==null)return 'repelled';
  if(W.brokenAt!==null)return 'broken';
  return W.echs[W.ech].brokenAt!==null?'lull':'active';
}
/**
 * A saved wave record (sim.timers.wave) and the men it implies: the exact keys, an echelon record for every echelon that has entered (and none for one that has not),
 * times in the order the machine writes them (an echelon enters at least its lull after the one before broke), the final break and the lull timer only where they can
 * exist, the men of echelons that have not entered still waiting at the entry line untouched, the assault of the echelons that have gone gone, a man off the field only
 * waiting at the entry line or gone (phase `clear`) after his fall-back, every man on the field of a broken echelon falling back (everybody after the last break), no more
 * German dead counted than there are dead Germans (the fight's and each echelon's), the lull timer no earlier than the break plus the lull, a later echelon's man on the field no earlier than his echelon's entry plus his delay, and `flag`
 * (the sim's own flag of the fight) the one the record implies. `actors`: the saved actors. `why`: an array that receives the reason of a refusal where there is one. Never throws.
 */
export function validApproachWave(plan,W,flag,clock,actors,why=[]){
  const no=m=>{why.push(m);return false;};   // `why`: where the reason of a refusal goes (the checks that say one; the others only refuse)
  const n=plan.echelons.length,total=plan.men.length,finite=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi,count=v=>Number.isInteger(v)&&v>=0&&v<=total;
  const record=(o,keys)=>Boolean(o)&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join()===keys.join();
  if(!Array.isArray(actors)||(W!==null&&(typeof W!=='object'||!Number.isInteger(W.ech)||W.ech<0||W.ech>=n)))return false;
  const byId=new Map(actors.map(a=>[a?.id,a])),entered=W?W.ech:0;   // before the wave only the first echelon is on the field
  const here=W?.echs?.[entered],lulling=Number.isFinite(W?.lullUntil);   // the record of the echelon on the field (checked below); its lull timer running
  for(const m of plan.men){
    const a=byId.get(m.id),d=a?.deck;if(!a||!d||typeof d!=='object'||typeof a.alive!=='boolean'||typeof a.active!=='boolean')return false;
    const waiting=a.alive&&!a.active&&d.phase==='advance'&&d.node===0&&d.pinned===0&&a.x===m.entry.x&&a.z===m.entry.z;
    if(m.echelon>entered&&!waiting)return false;
    if(m.echelon===0&&waiting)return false;   // the first echelon is on the field from the start of the act: it never waits at the entry line
    // a man of the echelon on the field still waiting at the entry line: his delay has not run out (a tick of grace), or the echelon broke before it did
    if(m.echelon===entered&&waiting&&here&&here.brokenAt===null&&clock>here.at+m.delaySec+.06)return false;
    if(m.role==='assault'&&(m.echelon<entered||(m.echelon===entered&&lulling))&&a.alive&&a.active)return false;   // gone: the echelons before, and this one once its lull runs
    // Off the field a living man is either waiting for his echelon or has finished his fall-back (the machine writes `clear` and `active:false` together, nowhere else).
    if(a.alive&&!a.active&&!waiting&&d.phase!=='clear')return false;
    if(d.phase==='clear'&&!(a.alive&&!a.active))return false;
  }
  if(W===null)return flag==='pending';
  if(!record(W,APPROACH_WAVE_KEYS)||!finite(W.at,0,clock)||!count(W.casualties)||typeof W.closeCalled!=='boolean'||!Array.isArray(W.echs)||W.echs.length!==W.ech+1)return false;
  for(const [k,R] of W.echs.entries()){
    if(!record(R,APPROACH_ECHELON_KEYS)||!finite(R.at,0,clock)||!count(R.casualties)||typeof R.closed!=='boolean'||typeof R.seen!=='boolean')return false;
    if(R.brokenAt!==null&&!finite(R.brokenAt,R.at,clock))return false;
    if(k<W.ech&&R.brokenAt===null)return false;
    if(k&&R.at<W.echs[k-1].brokenAt+plan.echelons[k].lullSec-1e-9)return false;
  }
  // a man of a later echelon who is on the field walked in at his turn (admit writes deck.t0 then), never before his echelon's entry plus his delay
  for(const m of plan.men)if(m.echelon&&byId.get(m.id).active&&byId.get(m.id).deck.t0<W.echs[m.echelon].at+m.delaySec-1e-9)return false;
  const R=W.echs[W.ech],last=W.ech===n-1;
  if(W.echs[0].at!==W.at||W.brokenAt!==(last?R.brokenAt:null))return false;
  // Once an echelon has broken (the machine switches its assault on the field to `fallback` in the very tick of the break, and nobody of it is admitted after), every living man of its
  // assault who is still on the field is falling back; after the LAST break so is everybody (the overwatch of every echelon goes with it).
  for(const m of plan.men){const a=byId.get(m.id);
    if(!a.alive||!a.active||a.deck.phase==='fallback')continue;
    if(W.brokenAt!==null||(m.role==='assault'&&Number.isFinite(W.echs[m.echelon]?.brokenAt)))return no(`${m.id} is on the field in phase ${a.deck.phase} after ${W.brokenAt!==null?'the last break':'the break of his echelon'} (he would be falling back)`);}
  // The German dead the record counts are men who are dead: the fight's count and each echelon's own (its assault and its own overwatch) can be no more than that.
  const dead=plan.men.filter(m=>!byId.get(m.id).alive);
  if(W.casualties>dead.length)return no(`the fight counts ${W.casualties} German dead, only ${dead.length} are dead`);
  const over=W.echs.findIndex((E,k)=>E.casualties>dead.filter(m=>m.echelon===k).length);
  if(over>=0)return no(`echelon ${over} counts ${W.echs[over].casualties} dead of its own, only ${dead.filter(m=>m.echelon===over).length} of its men are dead`);
  if(W.repelledAt!==null&&(W.brokenAt===null||!finite(W.repelledAt,W.brokenAt,clock)))return false;
  if(W.lullUntil!==null&&(last||R.brokenAt===null||!finite(W.lullUntil,R.brokenAt+plan.echelons[W.ech+1].lullSec-1e-9,clock+plan.echelons[W.ech+1].lullSec+1e-6)))   // set at the break or later, lullSec ahead
    return no(`lull timer ${W.lullUntil} outside [break + lullSec, clock + lullSec]`);
  return flag===approachFlagOf(plan,W);
}
/**
 * The decision record of a German (`actor.ai`): the state of his own stream of draws (`rng`, a 32-bit whole number) and, for a gun with suppressive fire (`fire.suppress`), the place where he
 * last saw a muzzle flash (`seen` = {x, y, z, at, who}: the feet of the Pole or of the player who fired, when, and who). `shooters`: the ids of the men who can fire at him; `box`: the area
 * the place must lie in (a margin included). A save older than the decision streams has no `ai` at all; one older than the suppressive fire has no `seen`. Never throws.
 */
export function validGermanAi(plan,a,clock,shooters,box){
  const ai=a.ai;
  if(ai===undefined)return true;
  if(!ai||typeof ai!=='object'||Array.isArray(ai)||!Number.isInteger(ai.rng)||ai.rng<0||ai.rng>4294967295)return false;
  const extra=Object.keys(ai).filter(k=>k!=='rng');
  if(!extra.length)return true;
  const z=plan.fire.suppress,s=ai.seen;
  if(extra.length!==1||extra[0]!=='seen'||!z||a.weapon!==z.weapon||!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join()!=='at,who,x,y,z')return false;
  return [s.x,s.y,s.z,s.at].every(Number.isFinite)&&s.at>=0&&s.at<=clock+1e-9&&shooters.includes(s.who)&&s.x>=box.minX&&s.x<=box.maxX&&s.z>=box.minZ&&s.z<=box.maxZ&&s.y>=-100&&s.y<=100;
}
