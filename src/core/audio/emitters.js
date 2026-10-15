/**
 * Runtime reader for the mission's `sectors[].audioEmitters[]` (T05a data, T06a reader; T06b decides what to play).
 * Defensive by contract (T06-NOTES): missing or malformed data NEVER throws; a bad entry is dropped with an issue, bad input
 * as a whole yields an empty list (silence from emitters, never a crash). Presentation only: nothing here reads or writes
 * simulation state; the caller passes the clock and the sector states it already has.
 *
 * Accepted input: the mission object (`{sectors:[...]}`), a `sectors` array, a flat emitter array, or JSON text of any of them.
 * Entry shape: {id, weapon, position:[x,y,z], activeFrom?:"HH:MM:SS", activeUntil?:"HH:MM:SS", certainty?, displayOnly?}.
 * Window: active when `activeFrom <= clock < activeUntil`. Missing activeFrom = from the start, missing activeUntil = until the end.
 *
 * CREW GATE (T06-NOTES): the casemate ckm (`ae_s1_ckm_casemate`) is a display-only dramatization, so its window is only an outer
 * bound (06:45). It sounds only while the crew is there: the caller says `crewPresent` or passes the owning sector's state, and
 * the states in CREW_GONE_STATES (s1 evacuates from 06:12) silence it. With no information at all a gated emitter stays silent.
 */
export const CREW_GONE_STATES=Object.freeze(['evacuating_bridgehead','west_blown']);
const MAX_EMITTERS=64;
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const CLOCK=/^(\d{1,2}):([0-5]\d):([0-5]\d)$/;

/** "HH:MM:SS" -> seconds since midnight, or null when malformed. */
export function parseClock(text){
  const m=typeof text==='string'?CLOCK.exec(text):null;
  return m?Number(m[1])*3600+Number(m[2])*60+Number(m[3]):null;
}

function compileEmitter(raw,sector,index,issues){
  const label=`emitters[${index}]`;
  if(!isObj(raw)){issues.push(`${label}: not an object`);return null;}
  const id=typeof raw.id==='string'&&raw.id.length>0&&raw.id.length<=64?raw.id:null;
  if(!id){issues.push(`${label}: bad id`);return null;}
  if(typeof raw.weapon!=='string'||raw.weapon.length===0||raw.weapon.length>64){issues.push(`${label} ${id}: bad weapon`);return null;}
  const p=raw.position;
  if(!Array.isArray(p)||p.length!==3||!p.every(n=>typeof n==='number'&&Number.isFinite(n))){issues.push(`${label} ${id}: bad position`);return null;}
  const from=raw.activeFrom===undefined?0:parseClock(raw.activeFrom),until=raw.activeUntil===undefined?Infinity:parseClock(raw.activeUntil);
  if(from===null||until===null){issues.push(`${label} ${id}: bad activeFrom/activeUntil`);return null;}
  if(!(from<until)){issues.push(`${label} ${id}: activeFrom must precede activeUntil`);return null;}
  const displayOnly=raw.displayOnly===true,certainty=typeof raw.certainty==='string'?raw.certainty:null;
  return Object.freeze({
    id,weapon:raw.weapon,x:p[0],y:p[1],z:p[2],from,until,sector,certainty,displayOnly,
    // Dramatized display fire has no authority of its own: it needs the crew to be there.
    crewGated:displayOnly||certainty==='GAMEPLAY_DRAMATIZATION',
  });
}

/** -> {emitters: frozen compiled list, ok, issues}. Never throws. */
export function parseAudioEmitters(raw){
  const issues=[],emitters=[];
  try{
    if(typeof raw==='string')raw=JSON.parse(raw);
    const flat=[];
    if(isObj(raw)&&Array.isArray(raw.sectors))raw=raw.sectors;
    if(Array.isArray(raw)){
      raw.forEach((item,i)=>{
        if(!isObj(item)){issues.push(`item ${i}: not an object`);return;}
        if(Array.isArray(item.audioEmitters)){
          const sector=typeof item.id==='string'?item.id:null;
          for(const e of item.audioEmitters)flat.push([e,sector]);
        }else if(item.audioEmitters!==undefined)issues.push(`item ${i}: audioEmitters is not an array`);
        else if('weapon' in item||'position' in item)flat.push([item,null]);   // a flat emitter array
        // a sector without audioEmitters simply has none
      });
    }else issues.push('emitters: not a mission, a sectors array or an emitter array');
    const seen=new Set();
    flat.slice(0,MAX_EMITTERS).forEach(([entry,sector],i)=>{
      const c=compileEmitter(entry,sector,i,issues);if(!c)return;
      if(seen.has(c.id)){issues.push(`emitters[${i}] ${c.id}: duplicate id ignored`);return;}
      seen.add(c.id);emitters.push(c);
    });
    if(flat.length>MAX_EMITTERS)issues.push(`emitters: more than ${MAX_EMITTERS}, extra entries ignored`);
  }catch(error){issues.push(`emitters: ${error?.message??error}`);emitters.length=0;}
  return Object.freeze({emitters:Object.freeze(emitters),ok:issues.length===0,issues:Object.freeze(issues)});
}
export const NO_EMITTERS=parseAudioEmitters([]);

/**
 * Is this emitter audible now? Allocation-free. `sectorState` is the owning sector's current state string (optional),
 * `crewPresent` an explicit boolean from the caller (optional, wins over the state). Non-finite clocks are never audible.
 */
export function isEmitterAudible(emitter,clockSec,sectorState,crewPresent){
  if(!emitter||!Number.isFinite(clockSec)||clockSec<emitter.from||clockSec>=emitter.until)return false;
  if(!emitter.crewGated)return true;
  if(crewPresent===true)return true;
  if(crewPresent===false)return false;
  if(typeof sectorState!=='string')return false;                 // no information: dramatized fire stays silent
  for(let i=0;i<CREW_GONE_STATES.length;i++)if(CREW_GONE_STATES[i]===sectorState)return false;
  return true;
}

/**
 * Fills `out` (cleared first, so the caller reuses one array across frames) with the audible emitters.
 * `stateOf(sectorId)` returns the sector's current state or undefined; `crewOf(sectorId)` is optional.
 */
export function activeEmitters(parsed,clockSec,stateOf,out=[],crewOf=null){
  out.length=0;
  const list=parsed?.emitters;if(!list)return out;
  for(let i=0;i<list.length;i++){
    const e=list[i],state=e.sector!==null&&typeof stateOf==='function'?stateOf(e.sector):undefined;
    if(isEmitterAudible(e,clockSec,state,e.sector!==null&&typeof crewOf==='function'?crewOf(e.sector):undefined))out.push(e);
  }
  return out;
}

/** Fetches and parses the mission file for its emitters. Never rejects; any failure yields NO_EMITTERS. */
export async function loadAudioEmitters(url,{fetchImpl=globalThis.fetch?.bind(globalThis)}={}){
  try{
    if(typeof fetchImpl!=='function')return NO_EMITTERS;
    const response=await fetchImpl(url);if(!response||!response.ok)return NO_EMITTERS;
    return parseAudioEmitters(await response.json());
  }catch{return NO_EMITTERS;}
}
