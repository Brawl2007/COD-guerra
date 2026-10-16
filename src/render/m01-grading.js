import * as THREE from 'three';
import {PHASE_ALTITUDES} from './m01-lighting.js';

// M01 post grade (roadmap T44, V1). Presentation only: per-phase colour grade, a soft vignette and a cheap depth-based ambient
// occlusion, applied in ONE full-screen pass on Medium/High. Low never builds anything: no pass, no render target, the scene is
// drawn to the canvas exactly as before. Every uniform is a pure function of (T16 lighting model, quality); the model follows the
// sim battle clock, which stops when the game is paused, so the grade freezes with it. No time, no RNG (the AO rotation is a hash
// of the pixel coordinate). Nothing here is read by src/game, src/world or src/core.
//
// Where the pass sits. M01View draws the world into this module's render target instead of the canvas (Medium/High only), then
// `composite` draws that image once to the canvas, then the weapon scene is drawn on top as before. The weapon / viewmodel is NOT
// graded and NOT part of the AO depth (its own camera range would pollute it); WeaponLighting already follows the same T16 phase
// model, and the DOM HUD is untouched. The rifle therefore keeps the exact pixels it had, and the vignette stops at the weapon.
//
// Tone mapping. The target is flagged `isXRRenderTarget` with an sRGB texture, the way three's own WebXR manager flags its layers:
// three then applies the renderer's tone mapping (ACES, exposure unchanged) and the sRGB encode when drawing INTO the target, with
// the same shader programs as a canvas draw. The target therefore holds the display-referred image the canvas would have shown
// (materials with toneMapped:false stay untouched) and the grade works on it. HalfFloat storage keeps the sRGB-coded values exact
// (no sRGB8_ALPHA8 blit ambiguity). A Node test pins the three.js lines this relies on.

const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mixv=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
const LUMA=Object.freeze([.2126,.7152,.0722]);
const luma=c=>c[0]*LUMA[0]+c[1]*LUMA[1]+c[2]*LUMA[2];

/** Pivot of the contrast curve (display value that does not move). Black stays black and white stays white. */
export const CONTRAST_PIVOT=.4;
/** Hard ceiling of the vignette's darkening at the corner of the frame (fraction of the value). Authored anchors stay below it. */
export const VIGNETTE_MAX=.25;
/** Vignette geometry: r is 0 at the centre and 1 at the corner (aspect corrected); nothing darkens inside INNER. */
export const VIGNETTE_INNER=.42;
export const VIGNETTE_OUTER=1;

/**
 * One grade per lighting phase. All values act on the display-referred (tone mapped, sRGB coded) image, 0..1.
 *   shadow / highlight  additive split-tone, weighted by (1-luma)^2 and luma^2
 *   gain                white-balance multiplier (luma weighted mean kept at 1: the grade tints, it does not change exposure)
 *   contrast            >1 steepens the curve around CONTRAST_PIVOT, end points fixed (no new clipping, no crushed blacks)
 *   lift                lifts the blacks (fraction of the remaining headroom)
 *   saturation          1 = unchanged
 *   vignette            darkening at the corner of the frame
 * `night` lies below the mission's first light (04:30 is already the blue hour); it keeps the model total and is never reached
 * by the authored sun keyframes. The five others turn on the same altitudes as m01-lighting.js.
 */
const ANCHORS=[
  {id:'night',altDeg:-9,shadow:[-.018,-.004,.030],highlight:[-.006,0,.012],gain:[.965,.99,1.05],contrast:1.04,lift:.006,saturation:.82,vignette:.23},
  {id:'blue-hour',altDeg:PHASE_ALTITUDES['blue-hour'],shadow:[-.014,-.002,.026],highlight:[.008,-.002,-.002],gain:[.97,.99,1.03],contrast:1.04,lift:.005,saturation:.90,vignette:.21},
  {id:'first-light',altDeg:PHASE_ALTITUDES['first-light'],shadow:[-.010,-.001,.020],highlight:[.014,.003,-.010],gain:[.985,.995,1.02],contrast:1.04,lift:.004,saturation:.95,vignette:.20},
  {id:'golden',altDeg:PHASE_ALTITUDES.golden,shadow:[-.008,.002,.014],highlight:[.026,.010,-.020],gain:[1.015,1.0,.97],contrast:1.05,lift:.004,saturation:1.06,vignette:.18},
  {id:'morning',altDeg:PHASE_ALTITUDES.morning,shadow:[-.004,.001,.008],highlight:[.014,.006,-.010],gain:[1.01,1.0,.985],contrast:1.04,lift:.003,saturation:1.04,vignette:.16},
  {id:'day',altDeg:PHASE_ALTITUDES.day,shadow:[-.002,0,.004],highlight:[.006,.003,-.004],gain:[1.0,1.0,.995],contrast:1.03,lift:.003,saturation:1.02,vignette:.14},
];
export const GRADING_PHASES=Object.freeze(ANCHORS.map(a=>a.id));

function bracket(altDeg){
  if(altDeg<=ANCHORS[0].altDeg)return [ANCHORS[0],ANCHORS[0],0];
  for(let i=1;i<ANCHORS.length;i++)if(altDeg<=ANCHORS[i].altDeg){const a=ANCHORS[i-1],b=ANCHORS[i];return [a,b,(altDeg-a.altDeg)/(b.altDeg-a.altDeg)];}
  const last=ANCHORS[ANCHORS.length-1];return [last,last,0];
}
/** Grade at a solar altitude: piecewise linear between the phase anchors, so it is continuous in the sim clock. */
export function gradeAt(altDeg){
  const [a,b,t]=bracket(altDeg);
  return {shadow:mixv(a.shadow,b.shadow,t),highlight:mixv(a.highlight,b.highlight,t),gain:mixv(a.gain,b.gain,t),
    contrast:lerp(a.contrast,b.contrast,t),lift:lerp(a.lift,b.lift,t),saturation:lerp(a.saturation,b.saturation,t),vignette:lerp(a.vignette,b.vignette,t)};
}

/**
 * Quality policy. Low: nothing at all. Medium/High: ONE full-screen pass, ONE colour target (MSAA like the canvas) plus its depth
 * texture for the AO, AO inline in the same pass (no second target, no half-resolution buffer). The two differ in AO taps only.
 */
export function gradingQuality(quality){
  if(quality==='high')return {enabled:true,passes:1,renderTargets:1,depthTextures:1,samples:4,aoTaps:12,aoStrength:.62,aoRadius:.8,aoBias:.12,aoFadeStart:28,aoFadeEnd:70};
  if(quality==='medium')return {enabled:true,passes:1,renderTargets:1,depthTextures:1,samples:4,aoTaps:8,aoStrength:.55,aoRadius:.7,aoBias:.12,aoFadeStart:28,aoFadeEnd:70};
  return {enabled:false,passes:0,renderTargets:0,depthTextures:0,samples:0,aoTaps:0,aoStrength:0,aoRadius:0,aoBias:0,aoFadeStart:0,aoFadeEnd:0};
}

/** Vignette multiplier at r (0 centre, 1 corner): exactly 1 inside VIGNETTE_INNER, 1-strength at the corner. */
export const vignetteFactor=(r,strength)=>1-strength*smoothstep(VIGNETTE_INNER,VIGNETTE_OUTER,r);

/** CPU twin of the shader's grade on one display-referred colour (0..1). Pure; the tests pin its properties. */
export function gradeColor(rgb,g){
  const l=luma(rgb),sh=(1-l)*(1-l),hi=l*l;
  let c=rgb.map((v,i)=>(v+g.shadow[i]*sh+g.highlight[i]*hi)*g.gain[i]);
  const k=g.contrast,P=CONTRAST_PIVOT;
  c=c.map(v=>{v=clamp(v);return v<P?P*(v/P)**k:P+(1-P)*((v-P)/(1-P))**(1/k);});
  c=c.map(v=>v+g.lift*(1-v));
  const l2=luma(c);
  return c.map(v=>clamp(l2+(v-l2)*g.saturation));
}

/** Every shader uniform as plain numbers / arrays. Pure: same (model, quality) => identical result; null when the pass does not exist (Low). */
export function gradingUniforms(model,quality){
  const q=gradingQuality(quality);
  if(!q.enabled||!model)return null;
  const g=gradeAt(model.altDeg);
  return {
    phase:model.phase,altDeg:model.altDeg,
    shadow:g.shadow,highlight:g.highlight,gain:g.gain,contrast:g.contrast,lift:g.lift,saturation:g.saturation,
    vignette:{strength:g.vignette,inner:VIGNETTE_INNER,outer:VIGNETTE_OUTER},
    ao:{strength:q.aoStrength,radius:q.aoRadius,bias:q.aoBias,taps:q.aoTaps,fadeStart:q.aoFadeStart,fadeEnd:q.aoFadeEnd}
  };
}

const VERTEX=`
varying vec2 vUv;
void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}
`;
const FRAGMENT=`
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uSize;
uniform vec2 uProj;
uniform vec2 uClip;
uniform vec3 uShadow;
uniform vec3 uHighlight;
uniform vec3 uGain;
uniform float uContrast;
uniform float uLift;
uniform float uSaturation;
uniform float uGradeOn;
uniform float uVignette;
uniform vec2 uVignetteRange;
uniform float uAoStrength;
uniform float uAoRadius;
uniform float uAoBias;
uniform vec2 uAoFade;
varying vec2 vUv;
const float PIVOT=${CONTRAST_PIVOT.toFixed(3)};
float viewDist(vec2 uv){return -perspectiveDepthToViewZ(textureLod(tDepth,uv,0.).x,uClip.x,uClip.y);}
vec3 viewPos(vec2 uv,float z){vec2 n=uv*2.-1.;return vec3(n.x*z/uProj.x,n.y*z/uProj.y,-z);}
vec3 curve(vec3 v){
  v=clamp(v,0.,1.);
  vec3 lo=PIVOT*pow(v/PIVOT,vec3(uContrast));
  vec3 hi=PIVOT+(1.-PIVOT)*pow(max((v-PIVOT)/(1.-PIVOT),vec3(0.)),vec3(1./uContrast));   // base clamped: pow() of a negative is NaN and mix() would carry it
  return mix(lo,hi,step(vec3(PIVOT),v));
}
float occlusion(float z,vec3 P,vec3 N){
  float rot=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2831853;
  float px=clamp(uAoRadius*uProj.y*uSize.y*.5/z,3.,40.);
  float sum=0.;
  for(int i=0;i<AO_TAPS;i++){
    float f=(float(i)+.5)/float(AO_TAPS),a=rot+float(i)*2.3999632;
    vec2 uv=vUv+vec2(cos(a),sin(a))*sqrt(f)*px/uSize;
    float zs=viewDist(uv);
    vec3 v=viewPos(uv,zs)-P;
    float d=length(v);
    float h=dot(v,N)/max(d,1e-4);
    sum+=clamp((h-uAoBias)/(1.-uAoBias),0.,1.)*(1.-smoothstep(uAoRadius,uAoRadius*2.,d));
  }
  return 1.-uAoStrength*(sum/float(AO_TAPS))*(1.-smoothstep(uAoFade.x,uAoFade.y,z));
}
void main(){
  vec3 c=texture2D(tColor,vUv).rgb;
  if(uGradeOn>.5){
    float l=dot(c,vec3(.2126,.7152,.0722));
    c=(c+uShadow*(1.-l)*(1.-l)+uHighlight*l*l)*uGain;
    c=curve(c);
    c+=uLift*(1.-c);
    float l2=dot(c,vec3(.2126,.7152,.0722));
    c=clamp(l2+(c-l2)*uSaturation,0.,1.);
  }
  vec2 p=(vUv-.5)*vec2(uSize.x/uSize.y,1.);
  float r=length(p)/length(vec2(uSize.x/uSize.y,1.)*.5);
  c*=1.-uVignette*smoothstep(uVignetteRange.x,uVignetteRange.y,r);
  if(uAoStrength>0.){
    // derivatives are taken in uniform control flow (uAoStrength is a uniform), before the per-pixel distance test
    float z=viewDist(vUv);
    vec3 P=viewPos(vUv,z);
    vec3 N=normalize(cross(dFdx(P),dFdy(P)));
    if(z<uAoFade.y)c*=occlusion(z,P,N);
  }
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}
`;

/**
 * Owns the single render target and the single full-screen pass. `begin` returns the target the scene must be drawn into (null on Low
 * or when bypassed), `composite` draws it once to the canvas, `release` / `dispose` free the GPU objects.
 */
export class M01Grading{
  constructor(){
    this.quality='low';this.target=null;this.depth=null;this.size=[0,0];this.last=null;this.frames=0;this.resizes=0;this.allocations=0;this.passesLastFrame=0;this.disposed=false;this.tone=null;
    this.debug={bypass:false,grade:true,vignette:true,ao:true};
    this.uniforms={
      tColor:{value:null},tDepth:{value:null},uSize:{value:new THREE.Vector2(1,1)},uProj:{value:new THREE.Vector2(1,1)},uClip:{value:new THREE.Vector2(.05,7500)},
      uShadow:{value:new THREE.Vector3()},uHighlight:{value:new THREE.Vector3()},uGain:{value:new THREE.Vector3(1,1,1)},
      uContrast:{value:1},uLift:{value:0},uSaturation:{value:1},uGradeOn:{value:1},uVignette:{value:0},uVignetteRange:{value:new THREE.Vector2(VIGNETTE_INNER,VIGNETTE_OUTER)},
      uAoStrength:{value:0},uAoRadius:{value:.7},uAoBias:{value:.12},uAoFade:{value:new THREE.Vector2(28,70)}
    };
    this.material=null;this.taps=0;
    this.scene=new THREE.Scene();
    // One triangle covers the screen: no diagonal seam, no second primitive.
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
    this.mesh=new THREE.Mesh(this.geometry,undefined);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    // Test-only hook (opt-in with ?debug): bypass / per-term toggles of a live paused page for A/B captures. Presentation only.
    if(typeof window!=='undefined'&&typeof location!=='undefined'&&new URLSearchParams(location.search).has('debug'))
      window.m01GradingDebug={set:state=>{Object.assign(this.debug,Object.fromEntries(Object.entries(state).filter(([k])=>k in this.debug).map(([k,v])=>[k,Boolean(v)])));return {...this.debug};},get:()=>({...this.debug})};
  }
  /** Part of the view's paused-frame cache key: the debug toggles change the picture at a frozen clock. */
  get stateKey(){const d=this.debug;return `${+d.bypass}${+d.grade}${+d.vignette}${+d.ao}`;}
  get active(){return Boolean(this.target)&&this.passesLastFrame>0;}
  ensureMaterial(taps){
    if(this.material&&this.taps===taps)return;
    this.material?.dispose();this.taps=taps;
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:VERTEX,fragmentShader:FRAGMENT,defines:{AO_TAPS:taps},
      depthTest:false,depthWrite:false,toneMapped:false,fog:false});
    this.material.customProgramCacheKey=()=>'m01-postprocess-grading-v1';
    this.mesh.material=this.material;
  }
  ensureTarget(width,height,samples){
    if(!this.target){
      this.depth=new THREE.DepthTexture(width,height);
      this.depth.minFilter=this.depth.magFilter=THREE.NearestFilter;
      this.target=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,colorSpace:THREE.SRGBColorSpace,
        minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false,depthBuffer:true,stencilBuffer:false,depthTexture:this.depth,samples});
      // Same flag three's WebXRManager sets on its layer targets: tone mapping and the sRGB encode apply when drawing into it.
      this.target.isXRRenderTarget=true;
      this.allocations++;
    }else if(this.target.width!==width||this.target.height!==height){this.target.setSize(width,height);this.resizes++;}
    this.size=[width,height];
  }
  /** Per frame, before the scene is drawn. Returns the render target to draw into, or null (Low / bypass / no lighting model yet). */
  begin(engine,quality,model,camera){
    this.quality=quality;this.passesLastFrame=0;
    const q=gradingQuality(quality);
    if(!q.enabled){this.release();this.last=null;return null;}
    if(this.debug.bypass||!model)return null;
    const u=this.last=gradingUniforms(model,quality),size=engine.getDrawingBufferSize(this.sizeScratch??=new THREE.Vector2());
    this.ensureTarget(Math.max(1,size.x),Math.max(1,size.y),q.samples);this.ensureMaterial(q.aoTaps);
    const v=this.uniforms,d=this.debug;
    v.uSize.value.set(this.size[0],this.size[1]);v.uProj.value.set(camera.projectionMatrix.elements[0],camera.projectionMatrix.elements[5]);v.uClip.value.set(camera.near,camera.far);
    v.uShadow.value.set(...u.shadow);v.uHighlight.value.set(...u.highlight);v.uGain.value.set(...u.gain);
    v.uContrast.value=u.contrast;v.uLift.value=u.lift;v.uSaturation.value=u.saturation;v.uGradeOn.value=d.grade?1:0;
    v.uVignette.value=d.vignette?u.vignette.strength:0;v.uVignetteRange.value.set(u.vignette.inner,u.vignette.outer);
    v.uAoStrength.value=d.ao?u.ao.strength:0;v.uAoRadius.value=u.ao.radius;v.uAoBias.value=u.ao.bias;v.uAoFade.value.set(u.ao.fadeStart,u.ao.fadeEnd);
    return this.target;
  }
  /** After the scene was drawn into the target: the one full-screen pass, to the canvas. */
  composite(engine){
    const v=this.uniforms;v.tColor.value=this.target.texture;v.tDepth.value=this.depth;
    engine.setRenderTarget(null);engine.render(this.scene,this.camera);
    this.tone={mapping:engine.toneMapping??null,exposure:engine.toneMappingExposure??null};   // read-only evidence: ACES and the T16 phase exposure are untouched
    this.frames++;this.passesLastFrame=1;
  }
  release(){
    if(this.target){this.target.dispose();this.depth?.dispose();this.target=null;this.depth=null;this.size=[0,0];}
    this.uniforms.tColor.value=this.uniforms.tDepth.value=null;
  }
  /** `gameDiagnostics().m01.grading`: plain JSON. */
  get diagnostics(){
    const q=gradingQuality(this.quality),u=this.last;
    return {quality:this.quality,enabled:q.enabled,bypass:this.debug.bypass,active:this.active,passes:this.passesLastFrame,planned:{passes:q.passes,renderTargets:q.renderTargets,depthTextures:q.depthTextures,samples:q.samples},
      renderTargets:this.target?1:0,depthTextures:this.depth?1:0,samples:this.target?.samples??0,size:[...this.size],aoTaps:this.material?this.taps:0,
      frames:this.frames,resizes:this.resizes,allocations:this.allocations,debug:{...this.debug},weapon:'ungraded',tone:this.tone?{...this.tone}:null,
      uniforms:u?{phase:u.phase,altDeg:u.altDeg,shadow:[...u.shadow],highlight:[...u.highlight],gain:[...u.gain],contrast:u.contrast,lift:u.lift,saturation:u.saturation,
        vignette:{...u.vignette},ao:{...u.ao}}:null};
  }
  dispose(){
    this.disposed=true;this.release();this.material?.dispose();this.material=null;this.geometry.dispose();
  }
}
