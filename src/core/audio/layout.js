/**
 * Runtime loader and queries for `missions/m01-tczew/audio-layout.json` (T05a data, T06a reader).
 * Defensive by contract (T06-NOTES): malformed or missing data NEVER throws; it degrades to the `open` zone (reverb A)
 * and the `earth` surface. Entry-level problems drop only that entry. Presentation only: never read by simulation code.
 *
 * TIE-BREAK (documented, tested): when several zones (or surfaces) contain the point, the highest `priority` wins;
 * on EQUAL priority the FIRST DECLARED entry (lowest index in the file) wins. Rationale: declaration order is the
 * author's intent and, unlike "smallest volume", does not depend on how unbounded faces are measured. Consequence for
 * M01: `bridge_deck` (metal) and `casemates_west` (stone) are both priority 3 and overlap at x 0..26, y -2..-1,
 * z 34..46; `bridge_deck` is declared first, so that overlap is metal.
 *
 * Query functions are allocation-free: they return the frozen compiled entries, never new objects.
 */
export const KNOWN_MATERIALS=Object.freeze(['earth','metal','water','stone','brick','wood','sand','grass','gravel','concrete']);
const MAX_ENTRIES=64,AXES=['X','Y','Z'];
const INF=Object.freeze({minX:-Infinity,maxX:Infinity,minY:-Infinity,maxY:Infinity,minZ:-Infinity,maxZ:Infinity});
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clampHz=v=>Math.max(200,Math.min(20000,v));

const OPEN_ZONE=Object.freeze({id:'open',priority:0,order:-1,reverb:'A',box:null,outsideLowpassHz:null,outsideGainDb:0,interiorLowpassHz:null,wind:null});
const EARTH_SURFACE=Object.freeze({id:'default',material:'earth',priority:-Infinity,order:-1,box:null});

function compileBox(raw){
  if(!isObj(raw))return null;
  const box={...INF};
  for(const a of AXES)for(const edge of ['min','max']){
    const key=edge+a;if(!(key in raw))continue;
    const v=raw[key];if(typeof v!=='number'||!Number.isFinite(v))return null;box[key]=v;
  }
  for(const a of AXES)if(box['min'+a]>box['max'+a])return null;
  return Object.freeze(box);
}
const priorityOf=raw=>raw===undefined?0:(typeof raw==='number'&&Number.isFinite(raw)?raw:null);
const idOf=raw=>typeof raw==='string'&&raw.length>0&&raw.length<=64?raw:null;

function compileZone(raw,order,issues){
  if(!isObj(raw)){issues.push(`zones[${order}]: not an object`);return null;}
  const id=idOf(raw.id),priority=priorityOf(raw.priority);
  if(!id||priority===null){issues.push(`zones[${order}]: bad id or priority`);return null;}
  const isDefault=raw.default===true,box=isDefault?null:compileBox(raw.box);
  if(!isDefault&&!box){issues.push(`zones[${order}] ${id}: missing or invalid box`);return null;}
  let outsideLowpassHz=null,outsideGainDb=0,interiorLowpassHz=null;
  if(isObj(raw.occlusion)){
    const o=raw.occlusion;
    if(Array.isArray(o.outsideLowpassHz)&&o.outsideLowpassHz.length===2&&o.outsideLowpassHz.every(n=>typeof n==='number'&&Number.isFinite(n)))
      outsideLowpassHz=Object.freeze([clampHz(o.outsideLowpassHz[0]),clampHz(o.outsideLowpassHz[1])]);
    if(typeof o.outsideGainDb==='number'&&Number.isFinite(o.outsideGainDb))outsideGainDb=Math.max(-60,Math.min(0,o.outsideGainDb));
    // 1800 Hz in the shipped data is provisional (T06-NOTES, PH-A7): retune at H12 listening, no code change needed.
    if(typeof o.interiorLowpassHz==='number'&&Number.isFinite(o.interiorLowpassHz))interiorLowpassHz=clampHz(o.interiorLowpassHz);
  }
  return Object.freeze({id,priority,order,reverb:raw.reverb==='B'?'B':'A',box,outsideLowpassHz,outsideGainDb,interiorLowpassHz,wind:typeof raw.wind==='string'?raw.wind:null});
}
function compileSurface(raw,order,issues){
  if(!isObj(raw)){issues.push(`surfaces[${order}]: not an object`);return null;}
  const id=idOf(raw.id),priority=priorityOf(raw.priority),box=compileBox(raw.box);
  if(!id||priority===null||!box){issues.push(`surfaces[${order}]: bad id, priority or box`);return null;}
  const known=KNOWN_MATERIALS.includes(raw.material);if(!known)issues.push(`surfaces[${order}] ${id}: unknown material, using earth`);
  return Object.freeze({id,priority,order,material:known?raw.material:'earth',box});
}
const freezeLayout=(zones,defaultZone,surfaces,defaultSurface,ok,issues)=>Object.freeze({
  zones:Object.freeze(zones),defaultZone,surfaces:Object.freeze(surfaces),defaultSurface,ok,issues:Object.freeze(issues),schemaVersion:1});

/** Open/earth fallback: used for missing files, bad JSON and unsupported schema versions. */
export const FALLBACK_LAYOUT=freezeLayout([],OPEN_ZONE,[],EARTH_SURFACE,false,['fallback: open/earth']);

export function parseAudioLayout(raw){
  try{
    if(typeof raw==='string')raw=JSON.parse(raw);
    if(!isObj(raw)||raw.schemaVersion!==1)return freezeLayout([],OPEN_ZONE,[],EARTH_SURFACE,false,['layout: not an object or unsupported schemaVersion']);
    const issues=[],zones=[],surfaces=[];let defaultZone=null;
    if(Array.isArray(raw.zones))raw.zones.slice(0,MAX_ENTRIES).forEach((z,i)=>{
      const c=compileZone(z,i,issues);if(!c)return;
      if(z.default===true){if(!defaultZone)defaultZone=c;else issues.push(`zones[${i}]: second default zone ignored`);}else zones.push(c);
    });else issues.push('zones: not an array');
    if(Array.isArray(raw.surfaces))raw.surfaces.slice(0,MAX_ENTRIES).forEach((s,i)=>{const c=compileSurface(s,i,issues);if(c)surfaces.push(c);});
    else issues.push('surfaces: not an array');
    const mat=KNOWN_MATERIALS.includes(raw.defaultSurface)?raw.defaultSurface:'earth';
    const defaultSurface=mat==='earth'?EARTH_SURFACE:Object.freeze({id:'default',material:mat,priority:-Infinity,order:-1,box:null});
    return freezeLayout(zones,defaultZone??OPEN_ZONE,surfaces,defaultSurface,issues.length===0,issues);
  }catch(error){return freezeLayout([],OPEN_ZONE,[],EARTH_SURFACE,false,[`layout: ${error?.message??error}`]);}
}

const inside=(b,x,y,z)=>x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY&&z>=b.minZ&&z<=b.maxZ;
/** Highest priority wins; equal priority: first declared wins (strict `>` while scanning in declaration order). */
export function zoneAt(layout,x,y,z){
  let best=null;
  for(const zone of layout.zones)if(inside(zone.box,x,y,z)&&(!best||zone.priority>best.priority))best=zone;
  return best??layout.defaultZone;
}
export function surfaceAt(layout,x,y,z){
  let best=null;
  for(const s of layout.surfaces)if(inside(s.box,x,y,z)&&(!best||s.priority>best.priority))best=s;
  return best??layout.defaultSurface;
}

/** Fetches and parses the layout. Never rejects; any failure yields the open/earth fallback. */
export async function loadAudioLayout(url,{fetchImpl=globalThis.fetch?.bind(globalThis)}={}){
  try{
    if(typeof fetchImpl!=='function')return FALLBACK_LAYOUT;
    const response=await fetchImpl(url);if(!response||!response.ok)return FALLBACK_LAYOUT;
    return parseAudioLayout(await response.json());
  }catch{return FALLBACK_LAYOUT;}
}
