// M01 combat slice 2, the deck assault (owner playtest P1: "the battle is planes, flashes and distant shots"; the nearest German was >= 963 m all mission).
// Mission data only (missions/m01-tczew/mission.json, grp_de_spans.deckAssault), validated when the module loads so a typo stops the game instead of changing it.
// The simulation (src/game/m01-simulation.js) owns the state: each man of grp_de_spans gets, when he enters at evt_m01_germans_on_east_spans, a saved record
// `deck` {v, phase, node, until, since, t0, pinned} and his combat AI stream `ai`. Nothing here draws a random number, reads a clock or moves anybody.
// R2-b (2026-10-24, owner complaint «os polacos fazem pouco para contrariar o ataque; os inimigos mostram pouca inteligência; combate artificial»): the assault now has closing lines west of
// its old limit, down to the single number the owner decides, `safeX`; the tactics (pressure, alternation of the two girders, search, stick grenades) are `deckAssault.tactics`. The record
// gains two OPTIONAL keys, `lim` (the node of the forward line he may go to now: absent = the old limit, line 0) and `gr` (grenades thrown, absent = 0), so every older record is valid as it is.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };

/** Version of the saved deck record and of the widened save rule (grp_de_spans west of x 690, never west of safeX). A save without records keeps the old rule. */
export const DECK_ASSAULT_VERSION=1;
export const DECK_PHASES=Object.freeze(['advance','cover','hold','fallback','clear']);
export const DECK_KEYS=Object.freeze(['v','phase','node','until','since','t0','pinned']);
/** R2-b: the keys a record may carry besides DECK_KEYS (absent = the value in the comment). */
export const DECK_OPTIONAL_KEYS=Object.freeze(['lim','gr']);   // lim: the node of line 0 (his old limit); gr: 0
/** The deepest line of a man keeps this many metres east of safeX (the old data had 450 / 458: the same 8 m), so a body that ends a step west of its goal is still east of the safety line. */
export const DECK_LINE_MARGIN_M=8;
/**
 * The lowest safeX the data may hold (deckAssaultPlan). Package 2 critical review, 2026-11-04: also the lowest x at which a FALLEN man of the assault may lie in a save (validateM01Snapshot, «elenco»): a body
 * lies where the man fell, east of the safeX of the build that played him, and that may be lower than the safeX of the build that loads the save (a move of safeX up must not refuse the checkpoints of
 * the fights already played). A man on his feet is held to the live safeX as ever.
 */
export const DECK_SAFE_X_MIN=120;
/** Amendment 22: the id of the crater record of the German supporting round (at most one in a game) and the nearest the round may fall to the front post of the rearguard (the 20 m ring in which a shell shakes a man, plus 2 m). */
export const DECK_SUPPORT_ID='de_support_shell_1';
export const DECK_SUPPORT_MIN_AHEAD_M=22;

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
  // 2026-10-24 (R2-b): safeX may go down to 120 (it was 400-690): the closing lines reach the west posts of the Polish side (x 165-175) and the deck post (x 17-38) must stay 80 m away.
  if(!num(d.safeX,DECK_SAFE_X_MIN,690)||!num(d.clearX,880,1000))fail('safeX / clearX');
  if(!Array.isArray(d.entry)||d.entry.length!==g.size||!d.entry.every(p=>pair(p,1020,1045)))fail('entry: one deck place per man, x 1020-1045');
  if(!Array.isArray(d.overwatchNodes)||d.overwatchNodes.length!==d.overwatch.length||!d.overwatchNodes.every(p=>pair(p,880,d.clearX-1)))fail('overwatchNodes: on span 08, west of clearX');
  if(!Array.isArray(d.fallback)||d.fallback.length!==d.assault.length||!d.fallback.every((p,i)=>pair(p,d.clearX+.5,963)&&(!i||p[0]-d.fallback[i-1][0]>=2)))fail('fallback: on span 08, east of clearX, at least 2 m apart in x (T48 pairs a carrier with the nearest fallen by x)');
  if(!Array.isArray(d.stations)||d.stations.length<4||d.stations.some((x,i)=>!num(x,120,1040)||(i&&x>=d.stations[i-1])))fail('stations: x, east to west, inside the deck');
  if(!Array.isArray(d.lanes)||d.lanes.length!==d.assault.length||!d.lanes.every(l=>Array.isArray(l)&&l.length===2&&num(l[0],37.6,42.4)&&num(l[1],0,20)))fail('lanes: [z, x offset] per assault man');
  if(!Array.isArray(d.limits)||d.limits.length!==d.assault.length||!d.limits.every(x=>num(x,d.safeX,600)))fail('limits: the forward line of each assault man, x safeX..600');
  if(!num(d.pursuitToX,700,1000)||!Number.isInteger(d.rushStations)||d.rushStations<1||d.rushStations>4||!num(d.rushSpeed,2,6))fail('pursuitToX / rushStations / rushSpeed');
  if(!range(d.coverSec,.5,15)||!range(d.holdSec,1,120)||!num(d.pinnedWaitMaxSec,0,30)||!num(d.breakPinnedSec,1,120)||!Number.isInteger(d.breakOut)||
    d.breakOut<1||d.breakOut>d.assault.length||!num(d.maxSec,30,600))fail('timings');
  const f=d.fire;if(!f||!num(f.assaultPauseSec,2,30)||!num(f.overwatchPauseSec,2,30)||!num(f.platoonRangeM,100,1200)||!num(f.riseBeforeSec,.1,3)||!num(f.holdAfterSec,.1,3))fail('fire');
  // The tactics of R2-b (pressure, closing lines, alternation, squad targets, search, stick grenades). Every number is bounded so a typo stops the game.
  const t=d.tactics;if(!t||typeof t!=='object')fail('tactics missing');
  const plain=o=>Boolean(o)&&typeof o==='object'&&!Array.isArray(o);
  if(!num(t.closeGapM,1,200)||!Number.isInteger(t.stages)||t.stages<1||t.stages>4||!plain(t.pressure)||!num(t.pressure.windowSec,0,60)||!num(t.pressure.share,.01,1)||
    !num(t.casualtyHoldSec,0,120)||!range(t.closeHoldSec,1,120)||!num(t.closeExtraSec,0,300)||!num(t.alternateWaitSec,0,60))fail('tactics: closing lines / pressure / casualty hold / holds / alternation');
  const sq=t.squadTargets;if(!plain(sq)||!num(sq.weight,0,5)||!num(sq.rangeM,50,1200))fail('tactics.squadTargets');
  if(!num(t.pinSec,0,10))fail('tactics.pinSec');
  // Amendment 22: `hold` (optional, boolean) lets a man who HOLDS a line search toward the next closing line; absent or false = the search of R2-b, from cover only.
  const se=t.search;if(!plain(se)||!num(se.memorySec,1,60)||!num(se.afterSec,.5,30)||se.afterSec>=se.memorySec||(se.hold!==undefined&&typeof se.hold!=='boolean'))fail('tactics.search');
  // Amendment 22 (2026-11-05): `support` (optional) is the one round of German supporting fire that gives the search its cause (updateDeckSupport in m01-simulation.js): it falls delaySec after the last living man of the
  // Polish rearguard took his post (never later than windowSec after that moment, so a save loaded long after it gets no round it did not have), aheadM metres east of the front post (a ground burst of kind
  // `shell`, m01-dust.js: a cloud of 8 m, 30 s). aheadM stays outside the 20 m ring in which the shells of m01-shell-blast.js shake a man (SHELL_BLAST.shakenM), so the round touches no one: it leaves a crater and a cloud.
  // Absent = no round (the game of before the amendment).
  const sp=t.support;if(sp!==undefined&&(!plain(sp)||!num(sp.delaySec,0,30)||!num(sp.windowSec,1,60)||!num(sp.aheadM,DECK_SUPPORT_MIN_AHEAD_M,120)))fail('tactics.support');
  const gr=t.grenade;
  if(!plain(gr)||!num(gr.rangeM,10,60)||!num(gr.minM,2,gr.rangeM)||!Number.isInteger(gr.perMan)||gr.perMan<0||gr.perMan>2||!num(gr.gapSec,1,120)||!num(gr.flightSec,.8,3)||!num(gr.fuseSec,gr.flightSec+1.5,6)||
    !num(gr.woundM,1,gr.reachM??10)||!num(gr.reachM,gr.woundM,12)||!num(gr.suppressSec,0,10)||!num(gr.suppressM,1,30))fail('tactics.grenade');
  // Each assault man's path: the stations east of his limit (shifted by his lane's x offset, never west of the limit), then the limit itself (line 0, the path of before, node for node).
  // R2-b: then, when the deepest line (safeX + DECK_LINE_MARGIN_M + the man's offset in the formation, limits[k] - min(limits)) lies at least closeGapM west of the limit, the stations between
  // them (the closing lines are the nodes nearest to 1/stages, 2/stages... of the way) and the deepest line itself. `stages[k]` lists the node of line 0, the closing lines, the deepest.
  const minLimit=Math.min(...d.limits);
  const paths=[],lineNodes=[];
  d.assault.forEach((id,k)=>{
    const [z,dx]=d.lanes[k],lim=d.limits[k],deep=d.safeX+DECK_LINE_MARGIN_M+(lim-minLimit),col=d.stations.map(x=>x+dx);
    const pts=col.filter(x=>x>lim+6).map(x=>({x,z}));pts.push({x:lim,z});
    const lines=[pts.length-1];
    if(lim-deep>=t.closeGapM){
      const mid=col.filter(x=>x>deep+6&&x<lim-6);
      const first=pts.length;for(const x of mid)pts.push({x,z});pts.push({x:deep,z});
      for(let j=1;j<t.stages;j++){
        const want=lim-(lim-deep)*j/t.stages;let best=-1;
        for(let i=first;i<pts.length-1;i++)if(i>lines.at(-1)&&(best<0||Math.abs(pts[i].x-want)<Math.abs(pts[best].x-want)))best=i;
        if(best>=0&&best<pts.length-1)lines.push(best);
      }
      lines.push(pts.length-1);
    }
    paths.push(Object.freeze(pts.map(p=>Object.freeze(p))));lineNodes.push(Object.freeze(lines));
  });
  const freezePts=list=>Object.freeze(list.map(([x,z])=>Object.freeze({x,z})));
  // 2026-11-04 (package 2, critical review): the highest node index the path of each assault man can have under ANY safeX. Every station of his column lies in at most one of the two groups (east of
  // his limit, or between the limit and the deepest line), and the path adds the limit and the deepest line; so with safeX low enough for all the stations west of the limit to count, the deepest line
  // is node (stations east of the limit) + 1 + (stations west of it). `lim` and `node` of a record written under another safeX are integers in 0..maxNodes[k] (validDeckRecord, olderPlan).
  const maxNodes=d.assault.map((id,k)=>{const col=d.stations.map(x=>x+d.lanes[k][1]),lim=d.limits[k];return col.filter(x=>x>lim+6).length+1+col.filter(x=>x<lim-6).length;});
  // The longest a normal fight can hold the east demolition's gate, from the first tick of the hold: the squad's deadline (maxSec, plus closeExtraSec while any man is on a closing line) and
  // the run back from the deepest line to clearX at rushSpeed, less the gate's own start, 60 s after the entry. The absolute bounds of the hold (advanceBattle) are measured from it.
  const closing=lineNodes.some(l=>l.length>1);
  const holdBaseSec=d.maxSec+(closing?t.closeExtraSec+Math.max(0,(minLimit-(d.safeX+DECK_LINE_MARGIN_M))/d.rushSpeed):0);
  const tactics=Object.freeze({closeGapM:t.closeGapM,stages:t.stages,pressure:Object.freeze({...t.pressure}),casualtyHoldSec:t.casualtyHoldSec,closeHoldSec:Object.freeze([...t.closeHoldSec]),
    closeExtraSec:t.closeExtraSec,alternateWaitSec:t.alternateWaitSec,pinSec:t.pinSec,squadTargets:Object.freeze({...sq}),search:Object.freeze({...se}),support:sp===undefined?null:Object.freeze({...sp}),grenade:Object.freeze({...gr})});
  return Object.freeze({version:d.version,from:d.from,safeX:d.safeX,clearX:d.clearX,overwatch:Object.freeze([...d.overwatch]),assault:Object.freeze([...d.assault]),
    entry:freezePts(d.entry),overwatchNodes:freezePts(d.overwatchNodes),fallback:freezePts(d.fallback),paths:Object.freeze(paths),lines:Object.freeze(lineNodes),maxNodes:Object.freeze(maxNodes),
    lanes:Object.freeze(d.lanes.map(l=>Object.freeze([...l]))),limits:Object.freeze([...d.limits]),tactics,pursuitToX:d.pursuitToX,
    rushStations:d.rushStations,rushSpeed:d.rushSpeed,coverSec:Object.freeze([...d.coverSec]),holdSec:Object.freeze([...d.holdSec]),pinnedWaitMaxSec:d.pinnedWaitMaxSec,
    breakPinnedSec:d.breakPinnedSec,breakOut:d.breakOut,maxSec:d.maxSec,holdBaseSec,fire:Object.freeze({...f})});
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
/** The nodes of a man's lines: [line 0 (his old limit), the closing lines..., the deepest]. One node when the data has no closing line for him. */
export const deckLines=a=>DECK_ASSAULT.lines[assaultIndex(a)];
/** The last node index of the path (his deepest line), whatever line he may go to now. */
export const deckDeepestNode=a=>DECK_ASSAULT.paths[assaultIndex(a)].length-1;
/** The node of the forward line he may go to now: his record's `lim`, else line 0 (the limit of before R2-b). */
export const deckLimitNode=a=>a.deck?.lim??deckLines(a)[0];
/** Which line his forward limit is: 0 = the old limit, 1.. = closing lines. */
export const deckLineNumber=a=>{const i=deckLines(a).indexOf(deckLimitNode(a));return i<0?0:i;};
/**
 * A saved deck record: the exact keys (plus the optional ones), a known phase, a node on the man's path and times the machine could have written. Pure check, for the validator.
 * `olderPlan` (what validateM01Snapshot asks, 2026-11-04, package 2 critical review): the record may have been written under ANOTHER safeX. `lim` and `node` are indices into the path, and moving safeX moves
 * the closing lines and the deepest line along it (250 -> 190 renumbered the lines of de_spans_5 from [22, 26, 31] to [22, 28, 33]), so a record of an older build is accepted with a `lim` that is not a line
 * of the live data and a `node` past the live deepest line, as long as both are integers of a path some safeX could give the man (0..plan.maxNodes[k], and `lim` not before line 0); restoreSnapshot then
 * puts them on the live lines (normalizeDeckRecord). Without `olderPlan` the record must be one the live data could have written: `lim` a line of his, `node` on his path. `plan` is the live plan
 * unless a test asks for another (deckAssaultPlan of a changed definition).
 */
export function validDeckRecord(a,clock,{olderPlan=false,plan=DECK_ASSAULT}={}){
  const d=a.deck,finite=(v,lo,hi)=>Number.isFinite(v)&&v>=lo&&v<=hi;
  if(!d||typeof d!=='object'||Array.isArray(d)||DECK_KEYS.some(k=>!Object.hasOwn(d,k)))return false;
  const extra=Object.keys(d).filter(k=>!DECK_KEYS.includes(k));
  if(extra.some(k=>!DECK_OPTIONAL_KEYS.includes(k)))return false;
  if(d.v!==DECK_ASSAULT_VERSION||!DECK_PHASES.includes(d.phase)||!Number.isInteger(d.node)||d.node<0)return false;
  if(plan.overwatch.includes(a.id)){if(d.node!==0||!['advance','clear'].includes(d.phase)||extra.length)return false;}
  else{
    const k=plan.assault.indexOf(a.id);if(k<0)return false;
    const lines=plan.lines[k],last=olderPlan?plan.maxNodes[k]:plan.paths[k].length-1;
    if(d.lim!==undefined&&(!Number.isInteger(d.lim)||(olderPlan?d.lim<lines[0]||d.lim>last:!lines.includes(d.lim))))return false;
    if(d.gr!==undefined&&(!Number.isInteger(d.gr)||d.gr<1||d.gr>plan.tactics.grenade.perMan))return false;
    if(d.node>last)return false;   // (a man pulled back to an earlier line is still west of it for a while: his node may be past his limit, never past the deepest line)
  }
  return finite(d.t0,0,clock)&&finite(d.since,d.t0,clock)&&finite(d.until,0,clock+Math.max(plan.holdSec[1],plan.coverSec[1],plan.tactics.closeHoldSec[1])+1)&&finite(d.pinned,0,1e6);
}

/** The line of `lines` (ascending node indices) nearest to the node `n` by index; a tie goes to the deeper line (the later one). */
export function nearestDeckLine(n,lines){
  let best=lines[0];
  for(const line of lines)if(Math.abs(line-n)<=Math.abs(best-n))best=line;
  return best;
}
/**
 * RESTORE of a record written under another plan (2026-11-04, package 2 critical review). `lim` (the node of the forward line he may go to) and `node` are indices into the path, and safeX shapes the
 * path: lowering it adds stations west of the old deepest line and moves the closing lines along; raising it takes them away. So a record whose `lim` is not one of the man's live lines is put on the
 * nearest live line by node index (a tie to the deeper line: the old deepest line of every man is the live deepest line for the shipped 250 -> 190, which a tie-to-shallower rule would not give), line 0
 * written as no key as deckLine() does, and a `node` past the live deepest line is put on it. This is done for every man with a record, alive or not, in any phase: a man who fell back keeps the line he
 * had been on, which is what deckExtraSec reads (the squad's deadline). A record that is already valid for the live data is left exactly as it is (nothing changes for a save of the same build).
 * Deterministic, no clock, no draw; returns true when it changed anything. `plan` is the live plan unless a test asks for another.
 */
export function normalizeDeckRecord(a,plan=DECK_ASSAULT){
  const d=a.deck,k=plan.assault.indexOf(a.id);
  if(!d||k<0)return false;
  const lines=plan.lines[k],last=plan.paths[k].length-1;let changed=false;
  if(d.lim!==undefined&&!lines.includes(d.lim)){
    const to=nearestDeckLine(d.lim,lines);
    if(to===lines[0])delete d.lim;else d.lim=to;
    changed=true;
  }
  if(d.node>last){d.node=last;changed=true;}
  return changed;
}
