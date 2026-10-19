// M01 combat slice 2, the deck assault (owner playtest P1: "the battle is planes, flashes and distant shots"; the nearest German was >= 963 m all mission).
// Mission data only (missions/m01-tczew/mission.json, grp_de_spans.deckAssault), validated when the module loads so a typo stops the game instead of changing it.
// The simulation (src/game/m01-simulation.js) owns the state: each man of grp_de_spans gets, when he enters at evt_m01_germans_on_east_spans, a saved record
// `deck` {v, phase, node, until, since, t0, pinned} and his combat AI stream `ai`. Nothing here draws a random number, reads a clock or moves anybody.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };

/** Version of the saved deck record and of the widened save rule (grp_de_spans west of x 690, never west of safeX). A save without records keeps the old rule. */
export const DECK_ASSAULT_VERSION=1;
export const DECK_PHASES=Object.freeze(['advance','cover','hold','fallback','clear']);
export const DECK_KEYS=Object.freeze(['v','phase','node','until','since','t0','pinned']);

export function deckAssaultPlan(def=definition){
  const fail=m=>{throw new Error(`M01 deck assault: ${m}`);};
  const g=def.groups.find(x=>x.id==='grp_de_spans'),d=g?.deckAssault;if(!d)fail('grp_de_spans.deckAssault missing');
  const num=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
  const pair=(p,x0,x1)=>Array.isArray(p)&&p.length===2&&num(p[0],x0,x1)&&num(p[1],37.6,42.4);   // inside the road deck, the body off both girders (z 37.18 / 42.82)
  const range=(r,lo,hi)=>Array.isArray(r)&&r.length===2&&num(r[0],lo,hi)&&num(r[1],r[0],hi);
  if(d.version!==DECK_ASSAULT_VERSION)fail('version');
  if(def.events.find(e=>e.id===d.from)?.trigger?.type!=='battleClock')fail('from must be a battleClock event');
  const ids=Array.from({length:g.size},(_,i)=>`de_spans_${i}`);
  if(!Array.isArray(d.overwatch)||!Array.isArray(d.assault)||d.overwatch.length+d.assault.length!==g.size||![...d.overwatch,...d.assault].every((id,i)=>id===ids[i]))
    fail('overwatch then assault must list de_spans_0.. in order');
  // The four men the east demolition fells (GERMAN_FELLED, T48) are the overwatch: their posts lie inside the blast radius, the assault's places outside it
  // (tests/m01-deck-assault.test.js checks both against map-layout bz_east).
  if(!num(d.safeX,400,690)||!num(d.clearX,880,1000))fail('safeX / clearX');
  if(!Array.isArray(d.entry)||d.entry.length!==g.size||!d.entry.every(p=>pair(p,1020,1045)))fail('entry: one deck place per man, x 1020-1045');
  if(!Array.isArray(d.overwatchNodes)||d.overwatchNodes.length!==d.overwatch.length||!d.overwatchNodes.every(p=>pair(p,880,d.clearX-1)))fail('overwatchNodes: on span 08, west of clearX');
  if(!Array.isArray(d.fallback)||d.fallback.length!==d.assault.length||!d.fallback.every((p,i)=>pair(p,d.clearX+.5,963)&&(!i||p[0]-d.fallback[i-1][0]>=2)))fail('fallback: on span 08, east of clearX, at least 2 m apart in x (T48 pairs a carrier with the nearest fallen by x)');
  if(!Array.isArray(d.stations)||d.stations.length<4||d.stations.some((x,i)=>!num(x,d.safeX,1040)||(i&&x>=d.stations[i-1])))fail('stations: x, east to west, inside the deck');
  if(!Array.isArray(d.lanes)||d.lanes.length!==d.assault.length||!d.lanes.every(l=>Array.isArray(l)&&l.length===2&&num(l[0],37.6,42.4)&&num(l[1],0,20)))fail('lanes: [z, x offset] per assault man');
  if(!Array.isArray(d.limits)||d.limits.length!==d.assault.length||!d.limits.every(x=>num(x,d.safeX,600)))fail('limits: the forward line of each assault man, x safeX..600');
  if(!num(d.pursuitToX,700,1000)||!Number.isInteger(d.rushStations)||d.rushStations<1||d.rushStations>4||!num(d.rushSpeed,2,6))fail('pursuitToX / rushStations / rushSpeed');
  if(!range(d.coverSec,.5,15)||!range(d.holdSec,1,120)||!num(d.pinnedWaitMaxSec,0,30)||!num(d.breakPinnedSec,1,120)||!Number.isInteger(d.breakOut)||
    d.breakOut<1||d.breakOut>d.assault.length||!num(d.maxSec,30,600))fail('timings');
  const f=d.fire;if(!f||!num(f.assaultPauseSec,2,30)||!num(f.overwatchPauseSec,2,30)||!num(f.platoonRangeM,100,1200)||!num(f.riseBeforeSec,.1,3)||!num(f.holdAfterSec,.1,3))fail('fire');
  // Each assault man's path: the stations east of his limit (shifted by his lane's x offset, never west of the limit), then the limit itself.
  const paths=d.assault.map((id,k)=>{const [z,dx]=d.lanes[k],lim=d.limits[k];
    const pts=d.stations.map(x=>x+dx).filter(x=>x>lim+6).map(x=>Object.freeze({x,z}));pts.push(Object.freeze({x:lim,z}));return Object.freeze(pts);});
  const freezePts=list=>Object.freeze(list.map(([x,z])=>Object.freeze({x,z})));
  return Object.freeze({version:d.version,from:d.from,safeX:d.safeX,clearX:d.clearX,overwatch:Object.freeze([...d.overwatch]),assault:Object.freeze([...d.assault]),
    entry:freezePts(d.entry),overwatchNodes:freezePts(d.overwatchNodes),fallback:freezePts(d.fallback),paths:Object.freeze(paths),pursuitToX:d.pursuitToX,
    rushStations:d.rushStations,rushSpeed:d.rushSpeed,coverSec:Object.freeze([...d.coverSec]),holdSec:Object.freeze([...d.holdSec]),pinnedWaitMaxSec:d.pinnedWaitMaxSec,
    breakPinnedSec:d.breakPinnedSec,breakOut:d.breakOut,maxSec:d.maxSec,fire:Object.freeze({...f})});
}
export const DECK_ASSAULT=deckAssaultPlan();
/** The x a German of grp_de_spans may never be west of; any other German stays at x >= 690 (the old cast rule, validateM01Snapshot «elenco»). */
export const DECK_SAFE_X=DECK_ASSAULT.safeX;
const index=id=>Number(id.slice(9));
/** 'overwatch' or 'assault' for a man of grp_de_spans (by roster index). */
export const deckRole=a=>DECK_ASSAULT.overwatch.includes(a.id)?'overwatch':'assault';
/** The k-th assault man's own index (0..5), or -1 for an overwatch man. */
export const assaultIndex=a=>DECK_ASSAULT.assault.indexOf(a.id);
/** Where a man stands at entry, and where an overwatch man posts. */
export const deckEntry=a=>DECK_ASSAULT.entry[index(a.id)];
export const overwatchNode=a=>DECK_ASSAULT.overwatchNodes[DECK_ASSAULT.overwatch.indexOf(a.id)];
/** The node a man is walking to or holding now: his path node (assault), his post (overwatch) or his fall-back place. */
export function deckGoal(a){
  const d=a.deck;if(!d)return null;
  if(deckRole(a)==='overwatch')return overwatchNode(a);
  const k=assaultIndex(a);if(d.phase==='fallback'||d.phase==='clear')return DECK_ASSAULT.fallback[k];
  const path=DECK_ASSAULT.paths[k];return path[Math.min(d.node,path.length-1)];
}
/** The last node index of an assault man's path (his forward limit). */
export const deckLimitNode=a=>DECK_ASSAULT.paths[assaultIndex(a)].length-1;
/** A saved deck record: the exact keys, a known phase, a node on the man's path and times the machine could have written. Pure check, for the validator. */
export function validDeckRecord(a,clock){
  const d=a.deck,finite=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
  if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length!==DECK_KEYS.length||DECK_KEYS.some(k=>!Object.hasOwn(d,k)))return false;
  if(d.v!==DECK_ASSAULT_VERSION||!DECK_PHASES.includes(d.phase)||!Number.isInteger(d.node)||d.node<0)return false;
  const role=deckRole(a);
  if(role==='overwatch'?(d.node!==0||!['advance','clear'].includes(d.phase)):d.node>deckLimitNode(a))return false;
  return finite(d.t0,0,clock)&&finite(d.since,d.t0,clock)&&finite(d.until,0,clock+Math.max(DECK_ASSAULT.holdSec[1],DECK_ASSAULT.coverSec[1])+1)&&finite(d.pinned,0,1e6);
}
