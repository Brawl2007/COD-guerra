// M01 squad coordination, slice 3 (owner order 2026-10-22, «coordenação dos soldados»): after the east demolition the section no longer walks as one crowd to one point
// (the old retreat target x -170, z 22). It falls back by bounds along the corridor, one fire team moving while the other holds a post and covers the road where
// Dudek and the player come down with Bąk:
//   move 0  team A (Pawlak, the platoon voice) from the squad post to the sandbags of the repair cluster, on Zieliński's order once the east blast scene is over;
//   move 1  Kowal (the rkm) from the squad post to the same sandbags once the escort has passed him (or he is pinned, or 06:36 has come);
//   move 2  team A on to the rally behind, once the escort has passed the sandbags (or pinned / 06:36);
//   move 3  Kowal on to the rally, 2 s after team A is there.
// A man walks with the simulation's own moveActor (the deterministic A* navigator of src/world/m01-navigation.js, one route() per tick, queued in roster order); a man who holds
// kneels at his slot facing the river. While Kowal holds and the escort is under way he answers a fresh flash on the east bank with an rkm burst (the suppression of kowalFire,
// his own AI stream) and changes his magazine for real (line 029). The callouts go through the bark director (trigger `squadMove`, m01-barks.js).
// State: timers.squad {move, moving, since} (saved; absent before the retreat and in older saves, which start it at their next retreat tick). No draw from this.rng.
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const SQUAD=Object.freeze({
  teams:Object.freeze([Object.freeze(['staszek_pawlak','east_platoon_voice']),Object.freeze(['szymon_kowal'])]),
  // Post 0 is each man's T38 slot at the squad post (grp_squad.stage); posts 1 and 2 are slots [x, z] beside the solids of the repair cluster and west of the rally point,
  // clear of every solid and of the men who already stand there (Zieliński at the rally point, the sappers and the ckm crew at x -168..-173).
  posts:Object.freeze([null,
    Object.freeze({id:'repair_sandbags',slots:Object.freeze({staszek_pawlak:[-149.6,11.5],east_platoon_voice:[-150.6,12.6],szymon_kowal:[-153.1,11.4]})}),
    Object.freeze({id:'rally_west',slots:Object.freeze({staszek_pawlak:[-163.6,17.2],east_platoon_voice:[-165.2,16.4],szymon_kowal:[-163.2,19.4]})})]),
  moves:Object.freeze([
    Object.freeze({team:0,to:1,call:'order',orderAfterSec:3}),
    Object.freeze({team:1,to:1,call:'passed',escortPastX:-55}),
    Object.freeze({team:0,to:2,call:'fallback',escortPastX:-135}),
    Object.freeze({team:1,to:2,call:'follow',afterArrivalSec:2})]),
  pace:4.2,arriveM:.9,stallSec:30,lastCall:'06:36:00',
  // Kowal's covering fire in the corridor: a flash of the last freshSec seconds that he sees is answered (same burst and suppression as kowalFire).
  cover:Object.freeze({freshSec:10,lookSec:[2.5,2]}),
});
const seconds=text=>{const v=text.split(':').map(Number);if(v.length===2)v.push(0);return v.reduce((n,x)=>n*60+x,0);};
const LAST_CALL=seconds(SQUAD.lastCall);
export const SQUAD_IDS=Object.freeze(SQUAD.teams.flat());
const teamOf=id=>SQUAD.teams.findIndex(t=>t.includes(id));
/** The slot of man `id` at post k (post 0: his T38 slot). */
export function squadSlot(stageSlots,id,k){
  if(k===0){const s=stageSlots[id];return {x:s.x,z:s.z};}
  const [x,z]=SQUAD.posts[k].slots[id];return {x,z};
}
/** The post team t holds (or is moving to, when `moving` and the move is its own) after the record's completed moves. */
export function teamPost(q,t){
  let k=0;for(let i=0;i<Math.min(q.move+(q.moving?1:0),SQUAD.moves.length);i++)if(SQUAD.moves[i].team===t)k=SQUAD.moves[i].to;
  return k;
}
export const squadRecord=sim=>sim.timers?.squad??null;
/** True while man `a` of a team walks to his next post. */
export const squadMoving=(q,a)=>Boolean(q?.moving&&SQUAD.moves[q.move]?.team===teamOf(a.id));
/** Where the escort is (Bąk until he is at the station, else the player): the section holds a post until the escort is past it. */
export const escortPoint=(sim,carrier)=>carrier??sim.player;

/**
 * Once per tick before the actors walk (updateActors), from the east demolition until the roll call: starts timers.squad and decides when the next bound starts and ends.
 * `ctx`: {stageSlots, carrier (Bąk until he reaches the station, or null), east (clock of the east demolition), say(node)}. Returns the record.
 */
export function updateSquad(sim,ctx){
  let q=sim.timers.squad;
  const members=t=>SQUAD.teams[t].map(id=>sim.actor(id)).filter(a=>a&&a.alive&&a.active&&a.state!=='WOUNDED'&&!a.carriedBy);
  if(!q){
    // A retreat already under way (an older save) skips the bounds its men have already made: a move is done when every man of its team is west of his slot there.
    let move=0;
    while(move<SQUAD.moves.length){const m=SQUAD.moves[move],team=members(m.team);
      if(!team.length||!team.every(a=>a.x<=squadSlot(ctx.stageSlots,a.id,m.to).x+3))break;move++;}
    q=sim.timers.squad={move,moving:false,since:sim.clock};
  }
  if(q.move>=SQUAD.moves.length)return q;
  const m=SQUAD.moves[q.move],team=members(m.team);
  if(!team.length){q.move++;q.moving=false;q.since=sim.clock;return q;}
  if(q.moving){
    const arrived=team.every(a=>dist(a,squadSlot(ctx.stageSlots,a.id,m.to))<SQUAD.arriveM);
    if(arrived||sim.clock-q.since>=SQUAD.stallSec){q.moving=false;q.move++;q.since=sim.clock;ctx.say('hold');}
    return q;
  }
  const pinned=team.some(a=>sim.clock<a.suppressedUntil);
  let due=false,call=m.call;
  if(m.orderAfterSec!==undefined)due=!sim.scene&&sim.clock-ctx.east>=m.orderAfterSec;
  else if(m.escortPastX!==undefined)due=escortPoint(sim,ctx.carrier).x<m.escortPastX;
  else if(m.afterArrivalSec!==undefined)due=sim.clock-q.since>=m.afterArrivalSec;
  // R2-a (2026-10-24): suppression brings a bound forward, but never the scripted first order (line 155, said after the blast scene): the pair now holds the road deck until the demolition (m01-section.js),
  // in view of the deck assault, so it can well be pinned on that very tick.
  const early=pinned&&m.orderAfterSec===undefined;
  if(!due&&(early||sim.battleClock>=LAST_CALL)){due=true;if(early)call='pinned';}
  if(due){q.moving=true;q.since=sim.clock;ctx.say(call);}
  return q;
}
/** Validation of a saved timers.squad (validateM01Snapshot's reject). */
export function validateSquadRecord(q,clock,reject){
  if(!q||typeof q!=='object'||Array.isArray(q)||Object.keys(q).length!==3||!Number.isInteger(q.move)||q.move<0||q.move>SQUAD.moves.length||typeof q.moving!=='boolean'||
    (q.moving&&q.move>=SQUAD.moves.length)||!Number.isFinite(q.since)||q.since<0||q.since>clock)reject('timer squad');
}
/** The data this module relies on (tests): every slot is a member's, every post has a slot for every member, the moves alternate the teams in post order. */
export function squadDataErrors(stageSlots){
  const errors=[];
  for(const id of SQUAD_IDS)if(!stageSlots[id])errors.push(`${id}: no T38 slot`);
  for(const p of SQUAD.posts.slice(1))for(const id of SQUAD_IDS)if(!p.slots[id])errors.push(`${p.id}: ${id}`);
  for(const t of [0,1]){const to=SQUAD.moves.filter(m=>m.team===t).map(m=>m.to);if(to.some((k,i)=>k!==i+1))errors.push(`team ${t}: posts ${to}`);}
  return errors;
}
