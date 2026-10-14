// Presentation-only battlefield FX profiles. No simulation state or RNG lives here.
export const M01_FX_QUALITY_DENSITY=Object.freeze({low:.55,medium:.78,high:1});

export const M01_FX_PROFILES=Object.freeze({
  small:Object.freeze({
    scale:8.5,duration:3.25,flashEnd:.075,coreEnd:.28,fireStart:.045,fireEnd:.54,
    dustStart:.055,dustEnd:1.02,smokeStart:.16,smokeEnd:2.95,shardStart:.025,shardEnd:.82,
    counts:Object.freeze({flash:1,core:3,fire:5,dust:6,smoke:6,shard:7}),
    vertical:.62,dustReach:.72,smokeRise:.70,lightPeak:2.1,lightDistance:56
  }),
  bombing:Object.freeze({
    scale:18,duration:4.9,flashEnd:.095,coreEnd:.38,fireStart:.055,fireEnd:.92,
    dustStart:.065,dustEnd:1.48,smokeStart:.18,smokeEnd:4.65,shardStart:.025,shardEnd:1.18,
    counts:Object.freeze({flash:2,core:5,fire:9,dust:11,smoke:11,shard:12}),
    vertical:1.12,dustReach:1.02,smokeRise:1.18,lightPeak:3.6,lightDistance:82
  }),
  demolition:Object.freeze({
    scale:29,duration:6.45,flashEnd:.12,coreEnd:.48,fireStart:.045,fireEnd:1.18,
    dustStart:.055,dustEnd:1.95,smokeStart:.20,smokeEnd:6.25,shardStart:.018,shardEnd:1.42,
    counts:Object.freeze({flash:2,core:7,fire:12,dust:15,smoke:16,shard:18}),
    vertical:1.42,dustReach:1.28,smokeRise:1.52,lightPeak:4.8,lightDistance:108
  })
});

export function battlefieldBlastKind(id='',aerial=false){
  if(id.endsWith('_demolition'))return 'demolition';
  if(aerial||/bomb|raid/.test(id))return 'bombing';
  return 'small';
}
export function battlefieldProfile(id='',aerial=false){return M01_FX_PROFILES[battlefieldBlastKind(id,aerial)];}

export function fxDistanceBand(distance){
  return distance<85?'near':distance<300?'mid':'far';
}
export function fxDensity(quality='medium',distance=0){
  const q=M01_FX_QUALITY_DENSITY[quality]??M01_FX_QUALITY_DENSITY.medium;
  const band=fxDistanceBand(distance),distanceFactor=band==='near'?1:band==='mid'?0.82:0.62;
  return q*distanceFactor;
}
export function fxLayerCount(base,quality='medium',distance=0){
  return Math.max(1,Math.round(base*fxDensity(quality,distance)));
}
export function smooth01(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
export function easedLife(age,start,end,{fadeIn=.16,fadeOut=.34}={}){
  if(age<=start||age>=end)return 0;
  const t=(age-start)/(end-start),a=smooth01(Math.min(1,t/Math.max(.001,fadeIn))),b=smooth01(Math.min(1,(1-t)/Math.max(.001,fadeOut)));
  return Math.min(a,b);
}
export function staggeredLife(age,start,end,offset=0,spread=.16){
  const duration=end-start,delay=duration*spread*Math.max(0,Math.min(1,offset));
  const localStart=start+delay,localEnd=end-duration*spread*.35*(1-offset);
  return {life:easedLife(age,localStart,localEnd),t:Math.max(0,Math.min(1,(age-localStart)/Math.max(.001,localEnd-localStart))),start:localStart,end:localEnd};
}


export const M01_IMPACT_PROFILES=Object.freeze({
  earth:Object.freeze({dust:6,chips:2,life:1.05,color:'#8b7658',rise:.42,spread:2.0,elongation:.8}),
  stone:Object.freeze({dust:4,chips:5,life:.82,color:'#b9b09c',rise:.34,spread:1.55,elongation:.72}),
  brick:Object.freeze({dust:5,chips:6,life:.92,color:'#9e5642',rise:.38,spread:1.68,elongation:.85}),
  water:Object.freeze({dust:5,chips:3,life:.88,color:'#c6d5d8',rise:.68,spread:1.45,elongation:1.25}),
  wood:Object.freeze({dust:3,chips:7,life:.76,color:'#98744f',rise:.30,spread:1.75,elongation:1.75}),
  metal:Object.freeze({dust:0,chips:0,sparks:6,life:.22,color:'#ffd27a',rise:.92,spread:2.6,elongation:1}),
  character:Object.freeze({dust:0,chips:0,sparks:0,life:.35,color:'#7d3028',rise:.2,spread:.6,elongation:1})
});
export function impactProfile(material='earth'){return M01_IMPACT_PROFILES[material]??M01_IMPACT_PROFILES.earth;}

export function blastFlashEnvelope(age,profile=M01_FX_PROFILES.small,distance=0){
 const end=(profile.flashEnd??.1)+(distance>180?Math.min(.14,(distance-180)/4200):0);
 if(age<0||age>=end)return {active:false,opacity:0,minScale:0,lightIntensity:0};
 const k=1-age/end;
 return {active:true,opacity:k*k,minScale:distance>120?Math.min(14,distance*.016):0,
 lightIntensity:(profile.lightPeak??2)*k*Math.max(0,1-distance/Math.max(60,(profile.lightDistance??80)*3.8))};
}
export function sampleMuzzleEnvironmentLight(actors=[],time=0,listener={x:0,z:0},quality='medium'){
 if(quality==='low')return {active:false,intensity:0};
 let top=null,power=0;
 for(const a of actors){if(!a.alive||!a.active)continue;const age=time-(a.firedAt??-1e9);
  if(age<0||age>=.085)continue;
  const d=Math.hypot(a.x-listener.x,a.z-listener.z);
  if(d>=48)continue;const v=(1-age/.085)*(1-d/48)*(a.weapon==='mg34'?1.35:1);
  if(v>power){power=v;top=a;}
 }
 return top?{active:true,intensity:power*1.45,position:[top.x,(top.y??0)+1.35,top.z],color:'#ffd68a'}:{active:false,intensity:0};
}
