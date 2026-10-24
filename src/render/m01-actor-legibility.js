// M01 enemy legibility (playtest 2026-10-18: "enemies practically invisible"). Presentation only: nothing here is read by src/game,
// src/world or src/core, and nothing here decides visibility, damage or events.
//
// A German in grey-green wool against grass, brick or a shadowed girder has almost no luminance step on a 1366x768 screen. Atmospheric
// perspective (fog) already lifts the far ground, so a figure at range gets two cues, both scaled by the view distance of each fragment:
//  - a thin Fresnel edge of the live fog colour (the haze catching the silhouette). It is a 1 px cue, so it peaks at 40 m and fades out
//    beyond RIM_FADE_FROM_M, where a 10 px figure would only glitter;
//  - an aerial-perspective fill: albedo x fog colour x RIM_FILL, added to the lit colour (in-scattered haze), which lifts a figure
//    standing in shadow without a flat additive and carries it at long range.
// Same physical idea as the T20 impostor backlight, applied to the skinned LOD bodies between the player and the 350 m hand-off.
// It never depends on the quality tier (enemy silhouettes are a gameplay cue, threejs-conventions).
import * as THREE from 'three';

/** Distance in metres (camera to fragment) below which no rim is added, and from which it reaches full strength. */
export const RIM_NEAR_M=14,RIM_FULL_M=40;
/** The rim fades out again between these distances (it would only glitter on a figure a few pixels tall). */
export const RIM_FADE_FROM_M=55,RIM_FADE_TO_M=140;
/** Aerial-perspective fill of the German bodies: outgoing light += albedo * fog * RIM_FILL * smoothstep(FILL_NEAR_M, FILL_FULL_M, distance). */
export const RIM_FILL=.45,FILL_NEAR_M=20,FILL_FULL_M=110;
/** Peak rim strength of the German bodies (multiplies the fog colour, linear). Allies carry none: the contrast is for the hostile side only. */
export const RIM_STRENGTH={de:.45,pl:0};
/** Fresnel exponent: 2.6 keeps the rim to the silhouette edge (a wide rim would look like a halo). */
export const RIM_POWER=2.6;
export const RIM_PROGRAM_KEY='m01-actor-rim-v3';

const clamp01=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
/** JS mirror of the shader: smoothstep(RIM_NEAR_M, RIM_FULL_M, d) * (1 - smoothstep(RIM_FADE_FROM_M, RIM_FADE_TO_M, d)). */
export const rimDistanceFactor=distance=>smooth(RIM_NEAR_M,RIM_FULL_M,distance)*(1-smooth(RIM_FADE_FROM_M,RIM_FADE_TO_M,distance));
/** JS mirror of the shader's fill factor (before RIM_FILL). */
export const fillDistanceFactor=distance=>smooth(FILL_NEAR_M,FILL_FULL_M,distance);
/** Rim colour (linear rgb) of a distance for the given fog colour and nation strength: strength * fog * distance factor. */
export function rimColor(fog,distance,strength=RIM_STRENGTH.de,out=[0,0,0]){
  const k=strength*rimDistanceFactor(distance);out[0]=fog[0]*k;out[1]=fog[1]*k;out[2]=fog[2]*k;return out;
}
/** Peak luminance (linear Rec.709) the rim adds at full distance and a grazing view. Documents that the term stays a thin edge light, not a glow. */
export const rimPeakLuminance=(fog,strength=RIM_STRENGTH.de)=>strength*(.2126*fog[0]+.7152*fog[1]+.0722*fog[2]);

/** One shared uniform pair for every patched material: updating it once per frame lights all German bodies. */
export const createRimState=()=>({tint:{value:new THREE.Vector3(.63,.65,.65)},strength:{value:RIM_STRENGTH.de}});
export const setRimFog=(state,fog)=>{if(fog)state.tint.value.set(fog[0],fog[1],fog[2]);return state;};

const HEAD='uniform vec3 uRimTint;uniform float uRimStrength;';
const BODY=`{
  float rimDist=length(vViewPosition);
  float rimK=smoothstep(${RIM_NEAR_M.toFixed(1)},${RIM_FULL_M.toFixed(1)},rimDist)*(1.0-smoothstep(${RIM_FADE_FROM_M.toFixed(1)},${RIM_FADE_TO_M.toFixed(1)},rimDist))*uRimStrength;
  outgoingLight+=diffuseColor.rgb*uRimTint*${RIM_FILL.toFixed(2)}*smoothstep(${FILL_NEAR_M.toFixed(1)},${FILL_FULL_M.toFixed(1)},rimDist)*step(0.0001,uRimStrength);
  float rimF=pow(1.0-clamp(dot(normalize(normal),normalize(vViewPosition)),0.0,1.0),${RIM_POWER.toFixed(1)});
  outgoingLight+=uRimTint*rimF*rimK;
}
`;
/** Inject the rim into a MeshStandard/Physical fragment shader. Returns false (and leaves the shader alone) when the chunks are missing. */
export function injectRim(shader,state){
  const f=shader.fragmentShader;
  if(!f.includes('#include <common>')||!f.includes('#include <opaque_fragment>')||!f.includes('vViewPosition'))return false;
  shader.uniforms.uRimTint=state.tint;shader.uniforms.uRimStrength=state.strength;
  shader.fragmentShader=f.replace('#include <common>',`#include <common>\n${HEAD}`).replace('#include <opaque_fragment>',`${BODY}#include <opaque_fragment>`);
  return true;
}
/** Make `material` (already private to the German bodies, i.e. a clone) draw the rim. Same program for every patched material. */
export function patchRimMaterial(material,state){
  material.onBeforeCompile=shader=>{injectRim(shader,state);};
  material.customProgramCacheKey=()=>RIM_PROGRAM_KEY;
  material.needsUpdate=true;
  return material;
}
