import * as THREE from 'three';
import {CLOUD_WIND} from './m01-lighting.js';

// M01 Vistula water (roadmap T42, V1). Presentation only: a pure model of the river surface (fresnel, sky reflection, flow,
// pier foam, bank wetness, quality policy) plus ONE lit MeshStandardMaterial patched with onBeforeCompile. No render target,
// no planar reflection and no extra pass: the reflection is the T16 sky gradient evaluated analytically in the fragment shader
// along the reflected view ray. Every uniform is a pure function of (sim clock, lighting model, quality); the sim clock stops
// when the game is paused, so the water freezes with it. Nothing here is read by src/game, src/world or src/core.

const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;

/** missions/m01-tczew/map-layout.json vistula_channel (pinned by tests): x extent, flow direction (north, -z) and water line. */
export const WATER_CHANNEL=Object.freeze({x0:25,x1:265,flowDirection:Object.freeze([0,0,-1])});
/** Bulk current in m/s along flowDirection (visual only; the river has no gameplay current). */
export const FLOW_SPEED=.55;
/** Cloud-texture units per second (T16) -> m/s of ripple drift on the surface. */
export const WIND_SURFACE_GAIN=600;
/** Water body colour (linear): dark green-brown Vistula. */
export const BODY_COLOR=Object.freeze([.018,.034,.027]);
export const SHALLOW_COLOR=Object.freeze([.011,.015,.009]);   // wet bank blend: darker, browner wet silt
export const FOAM_COLOR=Object.freeze([.62,.66,.62]);
export const F0=.02;   // water, normal incidence
/** Low quality body tint: fraction of the horizon colour mixed into the water (constant, no per-pixel reflection ray). Without it the
 *  dark body colour alone read as an oil slick at dawn (mean luminance 7.5 against 56 on the previous material). */
export const LOW_TINT=.26;
export const BANK_FOAM_WIDTH=3;   // metres: mean width of the lapping foam fringe at the waterline (x 25 and 265)
export const BANK_WET_WIDTH=14;   // metres from the bank edge over which the wet blend fades

/**
 * Bridge supports standing in the channel (assets/models/provisional/m01/bridges.manifest.json, pivots with x inside 25..265):
 * rail_support_01 at (140.9, z 0) and road_support_01 at (140.9, z 40). Half extents are the pier plan of
 * m01-bridge-structure.js (lengthX 6/7, lengthZ 15/18, nose 4/5). Downstream is -z. Foam stays after the demolition (rubble).
 */
export const PIERS=Object.freeze([
  Object.freeze({id:'rail_support_01',x:140.9,z:0,hx:3.2,hz:9}),
  Object.freeze({id:'road_support_01',x:140.9,z:40,hx:3.8,hz:11})
]);

/** Schlick fresnel; cosTheta = dot(normal, viewDir). 1 at grazing, ~F0 looking straight down. */
export const fresnel=cosTheta=>{const c=clamp(cosTheta);return F0+(1-F0)*(1-c)**5;};

/** Analytic T16 sky colour along a ray (linear rgb). `sky` is lightingModel().sky; rayY is the ray's y, sunDot its dot with sunDir. */
export function skyReflection(sky,rayY,sunDot){
  const up=Math.sqrt(clamp(rayY)),glow=sky.glow*.5*clamp(sunDot)**8;
  return sky.horizon.map((h,i)=>lerp(h,sky.zenith[i],up)+sky.halo[i]*glow);
}

/** World offset of the surface pattern at a sim clock: bulk flow along flowDirection plus the T16 wind drift. */
export function flowOffset(clock){
  const [fx,,fz]=WATER_CHANNEL.flowDirection,t=Math.max(0,clock);
  return {x:fx*FLOW_SPEED*t+CLOUD_WIND.x*WIND_SURFACE_GAIN*t,z:fz*FLOW_SPEED*t+CLOUD_WIND.z*WIND_SURFACE_GAIN*t};
}

/** 0..1 foam envelope around one pier: a ring at its waterline plus a wake that widens and fades downstream (-z). */
function pierFoam(p,x,z){
  const dx=(x-p.x)/p.hx,dz=(z-p.z)/p.hz,d=Math.hypot(dx,dz);
  const ring=smoothstep(.8,1.0,d)*(1-smoothstep(1.2,2.4,d));
  const down=p.z-z-p.hz*.6,wake=down>0?(1-smoothstep(0,60,down))*(1-smoothstep(0,p.hx*(1.3+down/20),Math.abs(x-p.x)))*.9:0;
  return Math.max(ring,wake);
}
/** Foam envelope at (x,z): 0 mid-channel, >0 around the in-channel piers. */
export const pierFoamMask=(x,z)=>PIERS.reduce((m,p)=>Math.max(m,pierFoam(p,x,z)),0);

/** Wet bank blend at x: 1 on the bank line (x 25 and 265), 0 once BANK_WET_WIDTH metres into the channel. */
export const bankWetness=x=>1-smoothstep(0,BANK_WET_WIDTH,Math.min(x-WATER_CHANNEL.x0,WATER_CHANNEL.x1-x));

/** Lapping foam fringe at the waterline: width oscillates with the sim clock and z (deterministic). 1 on the bank line, 0 beyond the fringe. */
export const bankFoamWidth=(clock,z)=>BANK_FOAM_WIDTH+.9*Math.sin(clock*.9+z*.11);
export const bankFoamFringe=(x,z,clock)=>{const e=Math.min(x-WATER_CHANNEL.x0,WATER_CHANNEL.x1-x),w=bankFoamWidth(clock,z);return 1-smoothstep(w,w+1.8,e);};

/** Quality policy. Low: one wave octave and no reflection term; Medium/High: reflection, 2/3 octaves. Never a render target. */
export function waterQuality(quality){
  if(quality==='high')return {reflection:true,octaves:3,planar:false,renderTargets:0,extraPasses:0};
  if(quality==='medium')return {reflection:true,octaves:2,planar:false,renderTargets:0,extraPasses:0};
  return {reflection:false,octaves:1,planar:false,renderTargets:0,extraPasses:0};
}

/** Every shader uniform as plain numbers/arrays. Pure: same (model, clock, quality) => identical result. */
export function waterUniforms(model,clock,quality){
  const q=waterQuality(quality),flow=flowOffset(clock),sky=model.sky;
  return {
    time:clock,flow:[flow.x,flow.z],reflect:q.reflection?1:0,tint:q.reflection?0:LOW_TINT,octaves:q.octaves,
    zenith:[...sky.zenith],horizon:[...sky.horizon],halo:[...sky.halo],glow:sky.glow,sunDir:[...sky.sunDir],
    body:[...BODY_COLOR],shallow:[...SHALLOW_COLOR],foam:[...FOAM_COLOR]
  };
}

const pierGlsl=PIERS.map(p=>`vec4(${p.x.toFixed(2)},${p.z.toFixed(2)},${p.hx.toFixed(2)},${p.hz.toFixed(2)})`).join(',');
const GLSL_HEAD=`
varying vec3 vWaterPos;
uniform float uWaterTint; uniform float uWaterDetail; uniform float uWaterTime; uniform vec2 uWaterFlow; uniform float uWaterReflect; uniform float uWaterOctaves;
uniform vec3 uWaterZenith; uniform vec3 uWaterHorizon; uniform vec3 uWaterHalo; uniform float uWaterGlow; uniform vec3 uWaterSunDir;
uniform vec3 uWaterBody; uniform vec3 uWaterShallow; uniform vec3 uWaterFoam;
float wHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float wNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(wHash(i),wHash(i+vec2(1.0,0.0)),f.x),mix(wHash(i+vec2(0.0,1.0)),wHash(i+vec2(1.0,1.0)),f.x),f.y);}
// Surface height from flowing noise layers. The pattern is sampled at (p - flow), so it travels along +flow, i.e. toward -z.
float wHeight(vec2 p){
  vec2 q=p-uWaterFlow;float h=wNoise(q*.22)*.55;
  if(uWaterOctaves>1.5)h+=wNoise(q*.7+vec2(11.0,3.0)+vec2(0.0,uWaterTime*.05))*.28;
  if(uWaterOctaves>2.5)h+=wNoise(q*2.1+vec2(5.0,17.0)-uWaterFlow*.4)*.13;
  return h;
}
const vec4 WATER_PIERS[${PIERS.length}]=vec4[${PIERS.length}](${pierGlsl});
float waterPierFoam(vec2 p){
  float m=0.0;
  for(int i=0;i<${PIERS.length};i++){
    vec4 s=WATER_PIERS[i];vec2 d=vec2((p.x-s.x)/s.z,(p.y-s.y)/s.w);float r=length(d);
    float ring=smoothstep(.8,1.0,r)*(1.0-smoothstep(1.2,2.4,r));
    float down=s.y-p.y-s.w*.6;
    float wake=down>0.0?(1.0-smoothstep(0.0,60.0,down))*(1.0-smoothstep(0.0,s.z*(1.3+down/20.0),abs(p.x-s.x)))*.9:0.0;
    m=max(m,max(ring,wake));
  }
  return m;
}
float waterBankWet(float x){return 1.0-smoothstep(0.0,${BANK_WET_WIDTH.toFixed(1)},min(x-${WATER_CHANNEL.x0.toFixed(1)},${WATER_CHANNEL.x1.toFixed(1)}-x));}
`;

/** Owns the single river material. `sync` is the only per-frame call; `dispose` releases the material. */
export class M01Water{
  constructor(){
    this.material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.28,metalness:0});
    this.uniforms={
      uWaterTint:{value:0},uWaterDetail:{value:1},uWaterTime:{value:0},uWaterFlow:{value:new THREE.Vector2()},uWaterReflect:{value:1},uWaterOctaves:{value:3},
      uWaterZenith:{value:new THREE.Vector3()},uWaterHorizon:{value:new THREE.Vector3()},uWaterHalo:{value:new THREE.Vector3()},
      uWaterGlow:{value:0},uWaterSunDir:{value:new THREE.Vector3(0,1,0)},
      uWaterBody:{value:new THREE.Vector3(...BODY_COLOR)},uWaterShallow:{value:new THREE.Vector3(...SHALLOW_COLOR)},uWaterFoam:{value:new THREE.Vector3(...FOAM_COLOR)}
    };
    this.material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader='varying vec3 vWaterPos;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vWaterPos=(modelMatrix*vec4(transformed,1.0)).xyz;`);
      shader.fragmentShader=GLSL_HEAD+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float wWet=waterBankWet(vWaterPos.x)*uWaterDetail;
        float wFoamMask=waterPierFoam(vWaterPos.xz);
        float wBreak=wNoise((vWaterPos.xz-uWaterFlow)*1.4)*.6+wNoise((vWaterPos.xz-uWaterFlow*1.3)*3.7)*.4;
        float wStreak=wNoise(vec2(vWaterPos.x*1.1,(vWaterPos.z-uWaterFlow.y)*.18));
        float wPier=wFoamMask*smoothstep(.2,.48,mix(wBreak,wStreak,.5)+wFoamMask*.5);
        float wEdge=min(vWaterPos.x-${WATER_CHANNEL.x0.toFixed(1)},${WATER_CHANNEL.x1.toFixed(1)}-vWaterPos.x);
        float wLap=${BANK_FOAM_WIDTH.toFixed(2)}+.9*sin(uWaterTime*.9+vWaterPos.z*.11);
        float wBank=(1.0-smoothstep(wLap,wLap+1.8,wEdge))*smoothstep(.18,.46,wBreak*.7+wStreak*.5);
        float wFoam=clamp(max(wPier,wBank*.9),0.0,1.0)*uWaterDetail;
        vec3 wBody=mix(uWaterBody,uWaterShallow,wWet*.85);
        diffuseColor.rgb=mix(wBody,uWaterFoam,wFoam);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        {
          float wE=.35;vec2 wP=vWaterPos.xz;
          float wH=wHeight(wP);
          vec3 wN=normalize(vec3(-(wHeight(wP+vec2(wE,0.0))-wH)/wE*.55,1.0,-(wHeight(wP+vec2(0.0,wE))-wH)/wE*.55));
          wN=normalize(mix(wN,vec3(0.0,1.0,0.0),wFoam*.6));
          normal=normalize((viewMatrix*vec4(wN,0.0)).xyz);
          wWorldNormal=wN;
        }`);
      shader.fragmentShader=shader.fragmentShader.replace('void main() {','vec3 wWorldNormal=vec3(0.0,1.0,0.0);\nvoid main() {');
      shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`
        {
          vec3 wView=normalize(cameraPosition-vWaterPos);
          float wCos=clamp(dot(wWorldNormal,wView),0.0,1.0);
          float wF=${F0.toFixed(2)}+(1.0-${F0.toFixed(2)})*pow(1.0-wCos,5.0);
          vec3 wRay=reflect(-wView,wWorldNormal);
          float wUp=sqrt(clamp(wRay.y,0.0,1.0));
          vec3 wSky=mix(uWaterHorizon,uWaterZenith,wUp)+uWaterHalo*uWaterGlow*.5*pow(clamp(dot(wRay,normalize(uWaterSunDir)),0.0,1.0),8.0);
          float wMix=wF*uWaterReflect*(1.0-wWet*.5)*(1.0-wFoam);
          gl_FragColor.rgb=mix(gl_FragColor.rgb,wSky,wMix);
          gl_FragColor.rgb=mix(gl_FragColor.rgb,uWaterHorizon,uWaterTint*(1.0-wFoam)*(1.0-wWet*.5));
          gl_FragColor.rgb=mix(gl_FragColor.rgb,uWaterFoam*(.35+uWaterHorizon*1.2),wFoam*.8);
        }
        #include <tonemapping_fragment>`);
    };
    this.material.customProgramCacheKey=()=>'m01-water-vistula-v1';
    this.last=null;this.detail=1;
    // Test-only hook (opt-in with ?debug): toggles the foam and wet-bank terms of a live paused page for A/B captures. Presentation only.
    if(typeof window!=='undefined'&&typeof location!=='undefined'&&new URLSearchParams(location.search).has('debug'))
      window.m01WaterDebug={setDetail:on=>{this.detail=on?1:0;this.uniforms.uWaterDetail.value=this.detail;}};
  }
  /** Per-frame: lighting model (view.lightingModel), sim clock and quality in; uniforms out. No-op until a model exists. */
  sync(model,clock,quality){
    if(!model)return null;
    const u=waterUniforms(model,clock,quality),v=this.uniforms;
    v.uWaterTime.value=u.time;v.uWaterFlow.value.set(...u.flow);v.uWaterReflect.value=u.reflect;v.uWaterTint.value=u.tint;v.uWaterOctaves.value=u.octaves;
    v.uWaterZenith.value.set(...u.zenith);v.uWaterHorizon.value.set(...u.horizon);v.uWaterHalo.value.set(...u.halo);
    v.uWaterGlow.value=u.glow;v.uWaterSunDir.value.set(...u.sunDir);
    this.last=u;return u;
  }
  /** `gameDiagnostics().m01.water`: plain JSON, no per-frame allocation outside the call. */
  get diagnostics(){
    const u=this.last;
    return {active:Boolean(u),time:u?.time??null,flow:u?.flow??null,reflect:u?.reflect??null,tint:u?.tint??null,detail:this.detail,octaves:u?.octaves??null,piers:PIERS.length,renderTargets:0,planar:false};
  }
  dispose(){this.material.dispose();}
}
