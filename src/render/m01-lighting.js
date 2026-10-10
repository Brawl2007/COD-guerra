import {seconds} from '../game/m01-simulation.js';

// M01 dawn lighting (roadmap T16, V1). Presentation only: reads the authored sun keyframes (C01) and the mission's battle
// clock, never writes simulation state and consumes no RNG. The model is a set of pure functions of solar altitude/azimuth;
// `applyLighting` is the thin THREE applier used by M01View.

const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
// Same expression as THREE.MathUtils.lerp / degToRad, so the interpolation is bit-identical to the pre-extraction code.
const lerp=(x,y,t)=>(1-t)*x+t*y;
const rad=deg=>deg*(Math.PI/180);
const srgb=hex=>{
  const n=parseInt(hex.slice(1),16);
  return [n>>16&255,n>>8&255,n&255].map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
};
const mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
const scale=(a,k)=>a.map(v=>v*k);

/** Wind that drifts the sky's cloud layer, in cloud-texture units per second of mission clock. Authored here on purpose. */
export const CLOUD_WIND=Object.freeze({x:.00042,z:.00017});
/** The fog's authored range. Not owned here (M01View builds the Fog); exported so tests can pin it. */
export const M01_FOG_RANGE=Object.freeze({near:420,far:2800});
/** Distance of the directional light from the player; the shadow camera in M01View is sized for it. */
export const SUN_DISTANCE=200;
/**
 * Twilight key. Before and just after sunrise the real sun is below or grazing the horizon, where a 1024 px shadow map
 * stretches into smears many metres long. The light is therefore treated as a sky-scattered key whose elevation never drops
 * below KEY_FLOOR_DEG and rises with the sun at KEY_RISE per degree until the real sun is higher than that line (≈17 deg).
 * The azimuth is always the real one; the sky disc and glow use the true altitude.
 */
export const KEY_FLOOR_DEG=12;
export const KEY_RISE=.25;
export const KEY_REFERENCE_ALT_DEG=-3.7;
export const keyElevationDeg=altDeg=>Math.max(altDeg,KEY_FLOOR_DEG+KEY_RISE*(altDeg-KEY_REFERENCE_ALT_DEG));

/**
 * Shadow cascades by quality. Low: no shadow map at all (unchanged). Medium/High: the existing wide ±65 m cascade plus a tight
 * near cascade (±25 m) for contact shadows. The key intensity is split between the two lights (near share + wide share == total),
 * so the lit result is not doubled; outside the near frustum the near light's share is simply unshadowed.
 */
export const NEAR_SHARE=.4;
export function cascadePlan(quality){
  if(quality==='low'||quality===undefined||quality===null)return {cascades:1,nearShare:0,wideHalf:65,wideMap:1024,nearHalf:0,nearMap:0};
  return {cascades:2,nearShare:NEAR_SHARE,wideHalf:65,wideMap:1024,nearHalf:25,nearMap:quality==='high'?2048:1024};
}
/** Splits a total key intensity into [wide, near] so the sum is exactly the total. */
export const splitIntensity=(total,plan)=>[total*(1-plan.nearShare),total*plan.nearShare];

const EARTH_BOUNCE=srgb('#4b4435');
const WHITE=[1,1,1];

// One anchor per mission phase (altitudes of the 04:30, 04:45, 05:30, 06:10 and 07:05 keyframe clocks). Everything between
// two anchors is linear in altitude, so each value is monotone wherever the anchors are.
// fog == the sky's horizon colour on the side away from the sun, so fogged geometry meets the sky without a seam.
const ANCHORS=[
  {id:'blue-hour',altDeg:-3.7,zenith:'#2f4468',fog:'#6f8096',halo:'#d9946e',glow:.50,sunColor:'#d7bccd',sunIntensity:.95,hemiIntensity:1.30,groundScale:.78,exposure:1.30,discStrength:0,discColor:'#ffc08a'},
  {id:'first-light',altDeg:-1.65,zenith:'#3b5580',fog:'#808c9d',halo:'#e89c64',glow:.80,sunColor:'#f0b79a',sunIntensity:1.15,hemiIntensity:1.38,groundScale:.82,exposure:1.23,discStrength:0,discColor:'#ffbb80'},
  {id:'golden',altDeg:4.8,zenith:'#4c6c97',fog:'#9ea3a1',halo:'#f2a85e',glow:1.00,sunColor:'#ffb982',sunIntensity:1.50,hemiIntensity:1.52,groundScale:.90,exposure:1.15,discStrength:.85,discColor:'#ffc58a'},
  {id:'morning',altDeg:10.6,zenith:'#5a7ca6',fog:'#a9b1af',halo:'#f6c581',glow:.80,sunColor:'#ffd3a0',sunIntensity:1.72,hemiIntensity:1.70,groundScale:.96,exposure:1.11,discStrength:.95,discColor:'#ffd9a4'},
  {id:'day',altDeg:18.6,zenith:'#6a8db3',fog:'#a8b2b0',halo:'#f7d79f',glow:.60,sunColor:'#ffe0b0',sunIntensity:1.85,hemiIntensity:1.82,groundScale:1,exposure:1.08,discStrength:1,discColor:'#ffe6b8'},
].map(a=>({...a,zenith:srgb(a.zenith),fog:srgb(a.fog),halo:srgb(a.halo),sunColor:srgb(a.sunColor),discColor:srgb(a.discColor)}));
export const LIGHTING_PHASES=Object.freeze(ANCHORS.map(a=>a.id));

function anchorsAt(altDeg){
  if(altDeg<=ANCHORS[0].altDeg)return [ANCHORS[0],ANCHORS[0],0];
  for(let i=1;i<ANCHORS.length;i++)if(altDeg<=ANCHORS[i].altDeg){
    const a=ANCHORS[i-1],b=ANCHORS[i];return [a,b,(altDeg-a.altDeg)/(b.altDeg-a.altDeg)];
  }
  const last=ANCHORS[ANCHORS.length-1];return [last,last,0];
}
/** Solar altitude (deg) of each phase anchor, by LIGHTING_PHASES id. Read by the colour grade (T44) so both curves turn on the same keys. */
export const PHASE_ALTITUDES=Object.freeze(Object.fromEntries(ANCHORS.map(a=>[a.id,a.altDeg])));
/** Nearest anchor by solar altitude. */
export function phaseAt(altDeg){
  let best=ANCHORS[0];for(const a of ANCHORS)if(Math.abs(a.altDeg-altDeg)<Math.abs(best.altDeg-altDeg))best=a;return best.id;
}

/**
 * Sun position for a battle clock: piecewise-linear interpolation of the authored keyframes (clamped at both ends).
 * Same maths the view used before the extraction. `dir` is the game-space direction towards the sun
 * (sin(az)cos(alt), sin(alt), -cos(az)cos(alt)).
 */
export function sunState(keyframes,battleClock){
  const after=keyframes.findIndex(k=>seconds(k.clock)>battleClock);
  const a=keyframes[Math.max(0,after<0?keyframes.length-1:after-1)],b=keyframes[after<0?keyframes.length-1:after];
  const t=clamp((battleClock-seconds(a.clock))/(seconds(b.clock)-seconds(a.clock)||1));
  const altDeg=lerp(a.altitudeDeg,b.altitudeDeg,t),azDeg=lerp(a.azimuthDeg,b.azimuthDeg,t);
  return {altDeg,azDeg,altRad:rad(altDeg),azRad:rad(azDeg),dir:direction(rad(altDeg),rad(azDeg))};
}
const direction=(alt,az)=>[Math.sin(az)*Math.cos(alt),Math.sin(alt),-Math.cos(az)*Math.cos(alt)];
/** The original 0..1 daylight ramp (-4.6 deg .. 18.3 deg), kept because the weapon pass and the sky follow it. */
export const daylightOf=altRad=>clamp((altRad+.08)/.4);

/**
 * Complete lighting model for one solar altitude/azimuth (degrees). All colours are linear [r,g,b]; nothing here touches THREE.
 *   sky     zenith/horizon/halo colours, glow strength and sun-disc colour/strength for the sky shader
 *   fog     scene fog colour (== sky horizon away from the sun)
 *   hemi    hemisphere light derived from the sky: zenith/horizon mix lifted towards white, earth bounce below
 *   sun     directional light colour/intensity and its twilight-key direction/elevation
 *   exposure tone-mapping exposure; shadows is always true (the effective switch is the quality preset's shadow map)
 */
export function lightingModel(altDeg,azDeg){
  const [a,b,t]=anchorsAt(altDeg),L=(k)=>lerp(a[k],b[k],t),C=(k)=>mix(a[k],b[k],t);
  const zenith=C('zenith'),fog=C('fog'),halo=C('halo'),glow=L('glow');
  const skyMix=mix(zenith,fog,.55),hemiColor=mix(skyMix,WHITE,.22);
  const groundScale=L('groundScale');
  const keyElevDeg=keyElevationDeg(altDeg),alt=rad(altDeg),az=rad(azDeg);
  return {
    phase:phaseAt(altDeg),altDeg,azDeg,daylight:daylightOf(alt),
    sky:{zenith,horizon:fog,halo,glow,disc:C('discColor'),discStrength:L('discStrength'),sunDir:direction(alt,az)},
    fog:{color:fog},
    hemi:{color:hemiColor,groundColor:scale(mix(EARTH_BOUNCE,fog,.18),groundScale),intensity:L('hemiIntensity')},
    sun:{color:C('sunColor'),intensity:L('sunIntensity'),keyElevDeg,keyDir:direction(rad(keyElevDeg),az)},
    exposure:L('exposure'),shadows:true,
  };
}

const round=(v,n=3)=>+v.toFixed(n);
const hex=c=>'#'+c.map(v=>{const s=clamp(v)<=.0031308?v*12.92:1.055*clamp(v)**(1/2.4)-.055;return Math.round(clamp(s)*255).toString(16).padStart(2,'0');}).join('');
/** Plain, JSON-safe counters for `gameDiagnostics().m01.lighting`. */
export function lightingDiagnostics(model,{battleClock=null,shadowMap=false,updates=0,cascades=1}={}){
  return {
    phase:model.phase,battleClock,sunAltDeg:round(model.altDeg),sunAzDeg:round(model.azDeg),keyElevDeg:round(model.sun.keyElevDeg),
    daylight:round(model.daylight),exposure:round(model.exposure),shadows:Boolean(model.shadows&&shadowMap),shadowsModel:model.shadows,shadowMap,cascades:shadowMap?cascades:1,cascadeLayout:cascades===2?'1:wide65+near25':'1:wide65',
    sunIntensity:round(model.sun.intensity),hemiIntensity:round(model.hemi.intensity),sunColor:hex(model.sun.color),fogColor:hex(model.fog.color),
    skyZenith:hex(model.sky.zenith),skyHalo:hex(model.sky.halo),glow:round(model.sky.glow),discStrength:round(model.sky.discStrength),
    cloudWind:{...CLOUD_WIND},fog:{...M01_FOG_RANGE},updates,
  };
}

/**
 * Thin THREE applier. `view` is the M01View (sun, skyLight, scene, engine, atmosphere are its existing fields).
 * Returns the model; counters are built on demand by `viewLightingDiagnostics`, not per frame.
 */
export function applyLighting(view,sim){
  const sun=sunState(sim.world.layout.sun.keyframes,sim.battleClock),m=lightingModel(sun.altDeg,sun.azDeg),p=sim.player;
  const key=m.sun.keyDir;
  view.sun.target.position.set(p.x,p.y,p.z);
  view.sun.position.set(p.x+key[0]*SUN_DISTANCE,p.y+key[1]*SUN_DISTANCE,p.z+key[2]*SUN_DISTANCE);
  const plan=cascadePlan(view.owner?.quality),near=view.sunNear,two=Boolean(near)&&plan.cascades===2;
  view.sun.color.setRGB(...m.sun.color);
  if(near){
    near.visible=two;   // visible=false removes the light from the render list entirely: Low pays nothing for it
    if(two){
      if(near.shadow.mapSize.x!==plan.nearMap){near.shadow.mapSize.set(plan.nearMap,plan.nearMap);near.shadow.map?.dispose();near.shadow.map=null;}
      near.target.position.set(p.x,p.y,p.z);near.position.set(p.x+key[0]*SUN_DISTANCE,p.y+key[1]*SUN_DISTANCE,p.z+key[2]*SUN_DISTANCE);
      near.color.setRGB(...m.sun.color);near.castShadow=m.shadows;
    }
  }
  const [wide,nearI]=two?splitIntensity(m.sun.intensity,plan):[m.sun.intensity,0];
  view.sun.intensity=wide;if(two)near.intensity=nearI;
  // Constant: toggling castShadow at sunrise would recompile every lit material. Low still pays nothing (shadowMap.enabled=false).
  view.sun.castShadow=m.shadows;
  view.skyLight.color.setRGB(...m.hemi.color);view.skyLight.groundColor.setRGB(...m.hemi.groundColor);view.skyLight.intensity=m.hemi.intensity;
  view.daylight=m.daylight;
  const fog=view.scene.fog.color.setRGB(...m.fog.color);
  (view.scene.background??=fog.clone()).copy(fog);
  view.engine.toneMappingExposure=m.exposure;
  view.atmosphere.lighting(p,m,sim.clock);
  view.lightingModel=m;view.lightingCascades=two?2:1;view.lightingClock=sim.battleClock;view.lightingFrames=(view.lightingFrames??0)+1;
  return m;
}
/** `gameDiagnostics().m01.lighting`; shadows reports the effective state (model && the quality preset's shadow map). */
export const viewLightingDiagnostics=view=>view.lightingModel
  ?lightingDiagnostics(view.lightingModel,{battleClock:view.lightingClock,shadowMap:Boolean(view.engine.shadowMap?.enabled),updates:view.lightingFrames,cascades:view.lightingCascades??1})
  :null;
