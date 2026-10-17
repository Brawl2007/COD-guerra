// M01 shared LOD policy (T43 slice 1). Pure presentation helpers: no THREE, no Date/performance.now, no simulation state.
// Bands are ascending distance thresholds in metres: band i covers [bands[i-1],bands[i]); the last band is open-ended.
export const LOD_DEFAULT_HYSTERESIS_FRACTION=0.15,LOD_DEFAULT_FADE_SECONDS=0.3;
const finiteOr=(v,d)=>Number.isFinite(v)?v:d;
// Hysteresis per boundary i (between band i and i+1): array in metres, one number in metres for all, or fraction*threshold when absent.
// `lowHysteresis` (optional, same shapes) overrides the margin only when checking whether `previous` still holds against the nearer boundary,
// so a boundary may be sticky on one side only (vegetation: far tier is held down to 116 m but never extends past the hard 120 m cut).
function marginAt(bands,i,{hysteresis,fraction=LOD_DEFAULT_HYSTERESIS_FRACTION}={},low=false,lowHysteresis){
  if(low&&lowHysteresis!==undefined)hysteresis=lowHysteresis;
  const h=Array.isArray(hysteresis)?hysteresis[Math.min(i,hysteresis.length-1)]:hysteresis;
  return Math.max(0,Number.isFinite(h)?h:finiteOr(fraction,LOD_DEFAULT_HYSTERESIS_FRACTION)*bands[i]);
}
// Returns the band index for `distance`. `previous` (null/out of range/non-integer ignored) keeps its band until the distance
// crosses the adjacent boundary by the margin. A boundary at <=0 carries no hysteresis (it can never hold the nearer band).
// Options: hysteresis (metres, number or per-boundary array), lowHysteresis (same shapes, nearer-side check only), fraction (default 0.15 when no metres given), upperInclusive.
export function selectLodBand(distance,bands,previous=null,options={}){
  const n=bands.length;
  const x=+distance;
  if(x!==x)return n; // NaN/undefined: farthest/cheapest band
  const d=Math.max(0,x);
  if(Number.isInteger(previous)&&previous>=0&&previous<=n){
    const lowOk=previous===0||d>=bands[previous-1]-marginAt(bands,previous-1,options,true,options.lowHysteresis);
    let highOk=true;
    if(previous<n){const t=bands[previous],edge=t>0?t+marginAt(bands,previous,options):t;highOk=options.upperInclusive&&t>0?d<=edge:d<edge;}
    if(lowOk&&highOk)return previous;
  }
  let band=0;while(band<n&&d>=bands[band])band++;
  return band;
}
const frozenH=h=>Array.isArray(h)?Object.freeze(h):h;
const profile=(bands,hysteresis,lowHysteresis)=>Object.freeze({bands:Object.freeze(bands),hysteresis:frozenH(hysteresis),lowHysteresis:frozenH(lowHysteresis)});
// Vegetation thresholds live here (not in m01-vegetation-runtime.js, which imports THREE) so the runtime and the policy share one table.
// [name, near (tree LOD0 -> LOD1), lod1 (LOD1 -> LOD2), shrubMid]; shrubNear is shrubMid/2; trees hard-cull to the far tier at 120 m.
export const M01_VEGETATION_LOD_THRESHOLDS=Object.freeze({low:Object.freeze({near:20,lod1:55,shrubMid:42}),medium:Object.freeze({near:35,lod1:75,shrubMid:65}),high:Object.freeze({near:50,lod1:90,shrubMid:90})});
export const M01_VEGETATION_FAR_DISTANCE=120,M01_VEGETATION_HYSTERESIS=4;
const vegProfiles=build=>Object.freeze(Object.fromEntries(Object.entries(M01_VEGETATION_LOD_THRESHOLDS).map(([k,t])=>[k,build(t)])));
// Trees: tiers 0..3. +-4 m around near/lod1; the far tier (3) is entered at 120 m and held down to 116 m, tier 2 never extends past 120 m.
const treeProfile=t=>profile([t.near,t.lod1,M01_VEGETATION_FAR_DISTANCE],[M01_VEGETATION_HYSTERESIS,M01_VEGETATION_HYSTERESIS,0],M01_VEGETATION_HYSTERESIS);
// Shared per-quality table for the legacy near/mid/far string LOD: bands 0..2.
const canopyProfile=t=>profile([t.near,M01_VEGETATION_FAR_DISTANCE],[M01_VEGETATION_HYSTERESIS,0],M01_VEGETATION_HYSTERESIS);
// Shrubs: near/mid/culled. Hysteresis is new in T43 (default 15% of each threshold) and only applies when the caller passes `previous`.
const shrubProfile=t=>profile([t.shrubMid*.5,t.shrubMid]);
// Frozen per-consumer/per-preset tables. They encode the thresholds each consumer shipped with before T43, so behaviour is preserved.
// `upperInclusive` mirrors the pre-T43 comparison (wagons held the nearer band with <=, everything else with <).
export const M01_LOD_PROFILES=Object.freeze({
  trainWagons:Object.freeze({upperInclusive:true,presets:Object.freeze({low:profile([45,180],14),medium:profile([80,300],18),high:profile([120,420],24)})}),
  yardWagons:Object.freeze({upperInclusive:true,presets:Object.freeze({low:profile([35,140],10),medium:profile([60,220],14),high:profile([90,300],18)})}),
  fieldStructures:Object.freeze({upperInclusive:false,presets:Object.freeze({low:profile([0,100],[8,12]),medium:profile([55,180],[8,12]),high:profile([90,260],[8,12])})}),
  // Low never shows the near kit LOD (threshold 0 collapses band 0). Hysteresis for props is new in T43 (6/8 m), only applied when the caller passes `previous`.
  props:Object.freeze({upperInclusive:false,presets:Object.freeze({low:profile([0],6),medium:profile([60],6),high:profile([95],8)})}),
  // Locomotive and Panzerzug LOD ignore the quality preset: every preset shares the same table.
  locomotive:Object.freeze({upperInclusive:false,presets:Object.freeze({low:profile([60,180],[6,18]),medium:profile([60,180],[6,18]),high:profile([60,180],[6,18])})}),
  panzerzug:Object.freeze({upperInclusive:false,presets:Object.freeze({low:profile([60,180],[6,18]),medium:profile([60,180],[6,18]),high:profile([60,180],[6,18])})}),
  vegetationTrees:Object.freeze({upperInclusive:false,presets:vegProfiles(treeProfile)}),
  vegetationLod:Object.freeze({upperInclusive:false,presets:vegProfiles(canopyProfile)}),
  vegetationShrubs:Object.freeze({upperInclusive:false,presets:vegProfiles(shrubProfile)}),
});
export const lodProfile=(consumer,preset='medium')=>{const c=M01_LOD_PROFILES[consumer];if(!c)throw new Error(`Unknown LOD consumer: ${consumer}`);return c.presets[preset]??c.presets.medium;};
// Single entry point used by the consumer wrappers.
export function selectConsumerLod(consumer,distance,preset='medium',previous=null){
  const c=M01_LOD_PROFILES[consumer],p=lodProfile(consumer,preset);
  return selectLodBand(distance,p.bands,previous,{hysteresis:p.hysteresis,lowHysteresis:p.lowHysteresis,upperInclusive:c.upperInclusive});
}
// Deterministic cross-fade state driven only by the caller's clock (seconds). Not wired into shaders yet.
// state: {from,to,startedAt,clock,progress,done,value}; `from`/`to` are LOD levels, `value` the current blended level.
// Retargeting mid-fade restarts from the current blended `value`. Equal clock => same result; clock going backwards (reset/restore) snaps.
const snapFade=(level,clock)=>Object.freeze({from:level,to:level,startedAt:clock,clock,progress:1,done:true,value:level});
export function advanceLodFade(state,targetLevel,clock,duration=LOD_DEFAULT_FADE_SECONDS){
  if(!Number.isFinite(clock))return state??snapFade(targetLevel,0);
  if(!state||!Number.isFinite(state.clock)||clock<state.clock||!(duration>0))return snapFade(targetLevel,clock);
  let {from,to,startedAt,value}=state;
  if(targetLevel!==to){from=value;to=targetLevel;startedAt=clock;}
  const progress=Math.min(1,Math.max(0,(clock-startedAt)/duration)),done=progress>=1;
  return Object.freeze({from,to,startedAt,clock,progress,done,value:done?to:from+(to-from)*progress});
}
// Diagnostics: per-preset band tallies, e.g. counters.low[0]++ via tallyLod(counters,'low',band).
export const createLodCounters=(presets=['low','medium','high'])=>Object.fromEntries(presets.map(p=>[p,[]]));
export function tallyLod(counters,preset,band){const row=counters[preset]??(counters[preset]=[]);row[band]=(row[band]??0)+1;return counters;}
export const lodCounterTotals=(counters,preset)=>Array.from(counters[preset]??[],v=>v??0);
export function resetLodCounters(counters){for(const k of Object.keys(counters))counters[k]=[];return counters;}
