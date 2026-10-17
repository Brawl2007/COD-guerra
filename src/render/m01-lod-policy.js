// M01 shared LOD policy (T43 slice 1). Pure presentation helpers: no THREE, no Date/performance.now, no simulation state.
// Bands are ascending distance thresholds in metres: band i covers [bands[i-1],bands[i]); the last band is open-ended.
export const LOD_DEFAULT_HYSTERESIS_FRACTION=0.15,LOD_DEFAULT_FADE_SECONDS=0.3;
export const LOD_ACTOR_HYSTERESIS_M=.5;   // near/middle margin the actors shipped with (m01-animation-resolver.js)
const finiteOr=(v,d)=>Number.isFinite(v)?v:d;
// Hysteresis per boundary i (between band i and i+1): array in metres, one number in metres for all, or fraction*threshold when absent.
// `upper` selects options.upperHysteresis (when given) for the hold-nearer side, without allocating a merged options object.
function marginAt(bands,i,{hysteresis,upperHysteresis,fraction=LOD_DEFAULT_HYSTERESIS_FRACTION}={},upper=false){
  const src=upper&&upperHysteresis!==undefined?upperHysteresis:hysteresis,h=Array.isArray(src)?src[Math.min(i,src.length-1)]:src;
  return Math.max(0,Number.isFinite(h)?h:finiteOr(fraction,LOD_DEFAULT_HYSTERESIS_FRACTION)*bands[i]);
}
// Returns the band index for `distance`. `previous` (null/out of range/non-integer ignored) keeps its band until the distance
// crosses the adjacent boundary by the margin. A boundary at <=0 carries no hysteresis (it can never hold the nearer band).
// Options: hysteresis (metres, number or per-boundary array), fraction (default 0.15 when no metres given), upperInclusive,
// upperHysteresis (same shape as hysteresis, used only for the hold-nearer side; lets a boundary act as a hard cut with 0),
// directional (when `previous` is valid, leaving the hold re-evaluates every boundary with enter/exit thresholds: boundaries below
// `previous` use bands[i]-margin, the others bands[i]+margin; a NaN distance keeps `previous`).
export function selectLodBand(distance,bands,previous=null,options={}){
  const n=bands.length;
  const x=+distance;
  const valid=Number.isInteger(previous)&&previous>=0&&previous<=n;
  if(x!==x)return options.directional&&valid?previous:n; // NaN/undefined: farthest/cheapest band (directional: hold previous)
  const d=Math.max(0,x);
  if(valid){
    const lowOk=previous===0||d>=bands[previous-1]-marginAt(bands,previous-1,options);
    let highOk=true;
    if(previous<n){const t=bands[previous],edge=t>0?t+marginAt(bands,previous,options,true):t;highOk=options.upperInclusive&&t>0?d<=edge:d<edge;}
    if(lowOk&&highOk)return previous;
    if(options.directional){let b=0;while(b<n&&d>=(b<previous?bands[b]-marginAt(bands,b,options):bands[b]+marginAt(bands,b,options)))b++;return b;}
  }
  let band=0;while(band<n&&d>=bands[band])band++;
  return band;
}
const profile=(bands,hysteresis,upperHysteresis)=>Object.freeze({bands:Object.freeze(bands),hysteresis:Array.isArray(hysteresis)?Object.freeze(hysteresis):hysteresis,...(upperHysteresis===undefined?{}:{upperHysteresis:Array.isArray(upperHysteresis)?Object.freeze(upperHysteresis):upperHysteresis})});
const actorProfile=(near,middle,far)=>profile([near,middle,far],[LOD_ACTOR_HYSTERESIS_M,LOD_ACTOR_HYSTERESIS_M,far*LOD_DEFAULT_HYSTERESIS_FRACTION]);
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
  // Trees: tiers 0..3 = [near, lod1, mid-cut=120]; 4 m hysteresis, but the 120 m far cut is hard on the way out (upper margin 0) and 116 m on the way back.
  vegetationTrees:Object.freeze({upperInclusive:false,presets:Object.freeze({low:profile([20,55,120],4,[4,4,0]),medium:profile([35,75,120],4,[4,4,0]),high:profile([50,90,120],4,[4,4,0])})}),
  // Bark/leaf-card LOD: near/mid/far = [near, 120]; same hysteresis as trees.
  vegetationLod:Object.freeze({upperInclusive:false,presets:Object.freeze({low:profile([20,120],4,[4,0]),medium:profile([35,120],4,[4,0]),high:profile([50,120],4,[4,0])})}),
  // Shrubs: near/mid/culled = [shrubNear, shrubMid]. Hysteresis is new in T43 (default 15% of each threshold) and only applies when the caller passes `previous`.
  vegetationShrubs:Object.freeze({upperInclusive:false,presets:Object.freeze({low:profile([21,42]),medium:profile([32.5,65]),high:profile([45,90])})}),
  // Actors (m01-characters.js): bands = [near, middle, far]; band 0..2 are skinned LODs, band 3 = culled beyond `far`. Low/Medium have no
  // near LOD (0 collapses band 0). near/middle keep the shipped 0.5 m margin; the cull edge is new in T43 and holds a visible actor for 15%
  // of `far` (15/19.5/24 m), so a soldier hovering on the cull distance does not pop in and out. Only applied when `previous` is passed.
  actors:Object.freeze({upperInclusive:false,presets:Object.freeze({low:actorProfile(0,15,100),medium:actorProfile(0,40,130),high:actorProfile(14,45,160)})}),
  // Bridge parts ignore the preset. Authority owns 400/800; renderer enters 412/824 and leaves 388/776 (directional enter/exit thresholds).
  bridgeParts:Object.freeze({upperInclusive:false,directional:true,presets:Object.freeze({low:profile([400,800],[12,24]),medium:profile([400,800],[12,24]),high:profile([400,800],[12,24])})}),
});
export const lodProfile=(consumer,preset='medium')=>{const c=M01_LOD_PROFILES[consumer];if(!c)throw new Error(`Unknown LOD consumer: ${consumer}`);return c.presets[preset]??c.presets.medium;};
// Single entry point used by the consumer wrappers.
export function selectConsumerLod(consumer,distance,preset='medium',previous=null){
  const c=M01_LOD_PROFILES[consumer],p=lodProfile(consumer,preset);
  return selectLodBand(distance,p.bands,previous,{hysteresis:p.hysteresis,upperHysteresis:p.upperHysteresis,upperInclusive:c.upperInclusive,directional:c.directional});
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
