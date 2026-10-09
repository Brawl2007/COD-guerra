import * as THREE from 'three';
import {actorPose} from './m01-actor-pose.js';
import {M01_FOG_RANGE} from './m01-lighting.js';
import {seconds} from '../game/m01-simulation.js';

// M01 distant-front impostors (roadmap T20 / BX-02). Presentation only. Humans at or beyond HANDOFF_M that no skinned LOD body draws
// were previously only sub-pixel procedural boxes (a 1.7 m man is 0.8 px at 1.1 km on a 720 px viewport): here each becomes a camera-facing
// silhouette with a minimum on-screen size, one InstancedMesh (one draw call) per nation. Pure model first (size, posture, step phase,
// hand-off, capacity, contrast, backlight), thin THREE class last. Every value is a function of the sim clock and the actor id: no
// wall-clock, no random, nothing is read by src/game, src/world or src/core.

const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const lerp=(a,b,t)=>a+(b-a)*t;

/** Metres from the player at which a human is handed from the procedural/skinned bodies to an impostor. Below it nothing changes. */
export const HANDOFF_M=350;
/** Instance capacity of EACH nation's InstancedMesh, by quality preset. */
export const IMPOSTOR_CAPACITY=Object.freeze({high:128,medium:96,low:64});
export const IMPOSTOR_NATIONS=Object.freeze(['pl','de']);
/** Posture silhouettes: world height (m), width/height aspect and the minimum on-screen height (px; the standing figure is 3 px). */
export const POSTURES=Object.freeze({
  standing:Object.freeze({index:0,heightM:1.7,aspect:.34,minPx:3}),
  crouched:Object.freeze({index:1,heightM:1.15,aspect:.55,minPx:2.1}),
  prone:Object.freeze({index:2,heightM:.45,aspect:3.4,minPx:1.6})
});
/** A silhouette is never narrower than this many pixels (a 3 px tall man is 1 px wide otherwise and shimmers). */
export const MIN_WIDTH_PX=2;
/** Minimum luminance contrast ratio (WCAG form (Y1+.05)/(Y2+.05)) of the ink against the backdrop at the actor distance. */
export const MIN_CONTRAST=3;
/** Mean linear colour of the terrain behind a distant figure, blended into the fog colour by the fog factor. */
export const GROUND_BACKDROP=Object.freeze([.075,.07,.055]);
/** Hue of each nation (linear). Only the hue survives: the luminance is solved from the contrast. */
export const NATION_HUE=Object.freeze({pl:Object.freeze([.34,.29,.17]),de:Object.freeze([.16,.19,.16])});
/** Backdrop luminance (linear) from which the ink is darker than the backdrop; below it (blue hour) the ink is lighter. */
export const DARK_INK_FROM=.12;
export const STEP_HZ=1.1;   // strides per second of the sim clock

/** Backlight window, battle clock. Outside it the term is exactly 0. */
export const BACKLIGHT_FROM=seconds('05:30'),BACKLIGHT_TO=seconds('06:40');
const BACKLIGHT_RAMP=300;

export const focalPx=(fovDeg,viewportHeight)=>(viewportHeight/2)/Math.tan(fovDeg*Math.PI/360);
export const metresPerPixel=(distance,fovDeg,viewportHeight)=>distance/focalPx(fovDeg,viewportHeight);
export const projectedHeightPx=(heightM,distance,fovDeg,viewportHeight)=>heightM*focalPx(fovDeg,viewportHeight)/Math.max(.01,distance);

/** World size of one impostor: height = max(posture height, minPx pixels), width follows the posture aspect with a pixel floor. */
export function impostorSize(posture,distance,fovDeg,viewportHeight){
  const p=POSTURES[posture];if(!p)throw new Error('unknown posture '+posture);
  const mpp=metresPerPixel(distance,fovDeg,viewportHeight);
  const heightM=Math.max(p.heightM,p.minPx*mpp),widthM=Math.max(p.heightM*p.aspect,MIN_WIDTH_PX*mpp);
  return {heightM,widthM,heightPx:heightM/mpp,widthPx:widthM/mpp,floored:heightM>p.heightM+1e-9,aspect:widthM/heightM};
}

/** Posture of a drawable figure from the existing pose state; null = not an impostor (dead, carried, wounded handled as prone). */
export function impostorPosture(actor,time,pose=null){
  if(!actor.active||actor.civilian||!actor.alive)return null;
  pose??=actorPose(actor,time);
  if(pose.prone||pose.name==='wounded')return 'prone';
  if(pose.name==='carried'||pose.name==='fallen'||pose.name==='seated')return null;
  return pose.name==='crouched'||pose.name==='pinned'?'crouched':'standing';
}

const hash=id=>[...String(id)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
/** Stride phase 0..1: sim clock and actor id only. */
export const stepPhase=(id,clock)=>{const p=clock*STEP_HZ+hash(id)/4294967296;return p-Math.floor(p);};

/**
 * Which representation draws an actor: 'lod' (skinned body), 'impostor', or 'none' (dead/hidden/civilian, or below the hand-off, where the
 * existing procedural body is untouched). Exactly one value, so an actor can never be drawn twice.
 */
export function handoff(actor,distance,{skinned=false,time=0,pose=null}={}){
  if(skinned)return 'lod';
  if(distance<HANDOFF_M)return 'none';
  return impostorPosture(actor,time,pose)?'impostor':'none';
}

/** Candidates {actor,distance,posture} sorted by distance then id, cut to the capacity of each nation (overflow = the farthest). */
export function selectImpostors(candidates,quality='low'){
  const cap=IMPOSTOR_CAPACITY[quality]??IMPOSTOR_CAPACITY.low,taken={pl:0,de:0},out=[];
  const sorted=[...candidates].sort((a,b)=>a.distance-b.distance||a.actor.id.localeCompare(b.actor.id));
  for(const c of sorted){const n=c.actor.team==='enemy'?'de':'pl';if(taken[n]>=cap)continue;taken[n]++;out.push({...c,nation:n});}
  return out;
}

export const luminance=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
export const contrastRatio=(a,b)=>{const hi=Math.max(luminance(a),luminance(b)),lo=Math.min(luminance(a),luminance(b));return (hi+.05)/(lo+.05);};
export const fogFactor=(distance,range=M01_FOG_RANGE)=>clamp((distance-range.near)/(range.far-range.near));
/** What the figure is seen against at this distance: terrain fading into the fog colour. */
export const backdropColor=(fog,distance,range=M01_FOG_RANGE)=>{const f=fogFactor(distance,range);return GROUND_BACKDROP.map((g,i)=>lerp(g,fog[i],f));};
/** Ink (linear rgb) of the nation hue with exactly the luminance that gives MIN_CONTRAST (or more) against the backdrop: darker than a light backdrop, lighter than a dark one. */
export function impostorInk(nation,fog,distance,minRatio=MIN_CONTRAST){
  const back=backdropColor(fog,distance),yb=luminance(back),hue=NATION_HUE[nation],yh=luminance(hue);
  const dark=yb>=DARK_INK_FROM;   // light backdrops take dark ink; dark (blue hour) backdrops take light ink
  const target=dark?Math.max(0,(yb+.05)/minRatio-.05):Math.min(1,minRatio*(yb+.05)-.05);
  let ink;
  if(target<=yh)ink=hue.map(v=>v*target/yh);
  else{const t=(target-yh)/(1-yh);ink=hue.map(v=>lerp(v,1,t));}
  return {ink,dark,ratio:contrastRatio(ink,back),backdrop:back};
}

/** 0 outside 05:30..06:40, ramping in/out over five minutes inside it (sun low and behind the far bank). */
export function backlightStrength(battleClock){
  if(!(battleClock>=BACKLIGHT_FROM&&battleClock<=BACKLIGHT_TO))return 0;
  return clamp(Math.min(battleClock-BACKLIGHT_FROM,BACKLIGHT_TO-battleClock)/BACKLIGHT_RAMP);
}
/** How much the camera looks toward the sun (0..1): the rim only shows on a figure the sun is behind. [x,z] horizontal vectors. */
export function sunFacing(viewDir,sunDir){
  const lv=Math.hypot(viewDir[0],viewDir[1]),ls=Math.hypot(sunDir[0],sunDir[1]);if(lv<1e-6||ls<1e-6)return 0;
  return clamp((viewDir[0]*sunDir[0]+viewDir[1]*sunDir[1])/(lv*ls));
}

const VERT=`
attribute vec4 aShape;   // x aspect (w/h), y posture, z stride phase, w moving
attribute vec3 aInk;
varying vec2 vUv;varying vec4 vShape;varying vec3 vInk;
void main(){
  vUv=uv;vShape=aShape;vInk=aInk;
  gl_Position=projectionMatrix*viewMatrix*modelMatrix*instanceMatrix*vec4(position,1.0);
}`;
const FRAG=`
uniform vec3 uRim;uniform float uRimStrength;uniform float uRimSide;
varying vec2 vUv;varying vec4 vShape;varying vec3 vInk;
float box(vec2 p,vec2 c,vec2 h){vec2 q=abs(p-c)-h;return length(max(q,0.0))+min(max(q.x,q.y),0.0);}
// signed distance (units of the figure height) of the posture silhouette; p.x in heights from the centre line, p.y 0 (feet) .. 1 (head top)
float figure(vec2 p){
  float post=vShape.y,swing=vShape.w*sin(vShape.z*6.2831853)*.07;
  if(post<.5){
    float head=length((p-vec2(0.0,.915))*vec2(1.0,.9))-.062;
    float torso=box(p,vec2(0.0,.65),vec2(.085,.20));
    float legA=box(p,vec2(-.045+swing,.24),vec2(.04,.24)),legB=box(p,vec2(.045-swing,.24),vec2(.04,.24));
    float rifle=box(p,vec2(.12,.62),vec2(.018,.15));
    return min(min(head,torso),min(min(legA,legB),rifle));
  }
  if(post<1.5){
    float head=length((p-vec2(.02,.84))*vec2(1.0,.9))-.085;
    float torso=box(p,vec2(0.0,.52),vec2(.17,.24));
    float legs=box(p,vec2(.03,.17),vec2(.17,.17));
    return min(head,min(torso,legs));
  }
  float body=box(p,vec2(-.15,.38),vec2(1.25,.30));
  float head=length((p-vec2(1.33,.50))*vec2(1.0,.9))-.24;
  float rifle=box(p,vec2(.95,.16),vec2(.70,.07));
  return min(min(body,head),rifle);
}
void main(){
  vec2 p=vec2((vUv.x-.5)*vShape.x,vUv.y);
  float px=max(fwidth(p.y),1e-5);
  float d=figure(p);
  float a=clamp(.5-d/px,0.0,1.0);
  if(a<=0.003)discard;
  vec3 col=vInk;
  if(uRimStrength>0.0){
    float inner=figure(p+vec2(uRimSide*max(.045,1.25*px),0.0));
    float rim=a*clamp(.5+inner/px,0.0,1.0);
    col+=uRim*rim*uRimStrength;
  }
  gl_FragColor=vec4(col,a);
  #include <colorspace_fragment>
}`;

/** Two InstancedMeshes (pl, de) of camera-facing quads. `select` runs before the procedural bodies, `sync` after the camera is placed. */
export class M01Impostors {
  constructor(scene,{debug=typeof window!=='undefined'&&typeof location!=='undefined'&&new URLSearchParams(location.search).has('debug')}={}){
    this.scene=scene;this.enabled=true;this.quality='low';this.items=[];this.byId=new Map();
    this.geometry=new THREE.PlaneGeometry(1,1);this.geometry.translate(0,.5,0);
    this.uniforms={uRim:{value:new THREE.Vector3()},uRimStrength:{value:0},uRimSide:{value:1}};
    this.material=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,uniforms:this.uniforms,transparent:true,depthWrite:false,depthTest:true,fog:false,toneMapped:false,side:THREE.DoubleSide});
    this.material.customProgramCacheKey=()=>'m01-distant-front-impostors-v1';
    this.meshes={};this.capacity=0;this.last=null;this.backlight=0;this.rimFacing=0;
    this.dummy=new THREE.Object3D();
    if(debug&&typeof window!=='undefined')window.m01ImpostorDebug={setEnabled:on=>{this.enabled=Boolean(on);}};   // `enabled` is part of the view paused-frame key
  }
  allocate(quality){
    const cap=IMPOSTOR_CAPACITY[quality]??IMPOSTOR_CAPACITY.low;
    if(this.capacity===cap)return;
    for(const m of Object.values(this.meshes)){m.removeFromParent();m.geometry.dispose();m.dispose();}
    this.meshes={};
    for(const n of IMPOSTOR_NATIONS){
      const g=this.geometry.clone();
      const shape=new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4),ink=new THREE.InstancedBufferAttribute(new Float32Array(cap*3),3);
      shape.setUsage(THREE.DynamicDrawUsage);ink.setUsage(THREE.DynamicDrawUsage);g.setAttribute('aShape',shape);g.setAttribute('aInk',ink);
      const m=new THREE.InstancedMesh(g,this.material,cap);m.name='m01_impostors_'+n;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count=0;m.frustumCulled=false;m.castShadow=m.receiveShadow=false;m.renderOrder=2;this.scene.add(m);this.meshes[n]=m;
    }
    this.capacity=cap;
  }
  /** Before the procedural bodies: ids handed to impostors this frame (empty when disabled, which restores the previous behaviour). */
  select(actors,skinned,player,quality,time){
    this.quality=quality;this.allocate(quality);
    const cands=[];
    if(this.enabled)for(const a of actors){
      const d=Math.hypot(a.x-player.x,a.z-player.z);
      if(skinned.has(a.id)||d<HANDOFF_M||!a.active||a.civilian||!a.alive)continue;   // cheap rejects first; handoff() is the single decision
      const pose=actorPose(a,time);
      if(handoff(a,d,{skinned:false,time,pose})==='impostor')cands.push({actor:a,distance:d,posture:impostorPosture(a,time,pose),moving:pose.moving?1:0});
    }
    this.items=selectImpostors(cands,quality);this.byId=new Map(this.items.map(i=>[i.actor.id,i]));
    return new Set(this.byId.keys());
  }
  /** After the camera is placed: matrices, ink and rim. `fog` is the linear fog colour, `sunDir` the game-space sun direction. */
  sync({camera,clock,battleClock,fog,sunColor,sunDir,viewportHeight}){
    const eye=camera.position,fov=camera.fov,counts={pl:0,de:0},list=[];
    const fwd=new THREE.Vector3();camera.getWorldDirection(fwd);
    const strength=backlightStrength(battleClock),facing=sunDir?sunFacing([fwd.x,fwd.z],[sunDir[0],sunDir[2]]):0;
    this.backlight=strength;this.rimFacing=facing;
    // sun side on screen: sign of (sun - view) along the camera's right vector (right = fwd x up)
    const right=sunDir?(-fwd.z)*sunDir[0]+fwd.x*sunDir[2]:0;
    this.uniforms.uRimStrength.value=strength*facing*.9;this.uniforms.uRimSide.value=right>=0?1:-1;   // rim on the side facing the sun
    if(sunColor)this.uniforms.uRim.value.set(Math.min(1,sunColor[0]*1.4),Math.min(1,sunColor[1]*1.2),Math.min(1,sunColor[2]));
    const dummy=this.dummy;
    for(const it of this.items){
      const a=it.actor,mesh=this.meshes[it.nation],i=counts[it.nation]++;
      const dx=eye.x-a.x,dy=eye.y-a.y,dz=eye.z-a.z,dist=Math.hypot(dx,dy,dz),size=impostorSize(it.posture,dist,fov,viewportHeight);
      const moving=it.posture==='standing'?it.moving:0;
      const phase=stepPhase(a.id,clock),ink=impostorInk(it.nation,fog,it.distance);
      dummy.position.set(a.x,a.y,a.z);dummy.rotation.set(0,Math.atan2(dx,dz),0);dummy.scale.set(size.widthM,size.heightM,1);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      const shape=mesh.geometry.getAttribute('aShape'),inkAttr=mesh.geometry.getAttribute('aInk');
      shape.setXYZW(i,size.aspect,POSTURES[it.posture].index,phase,moving);inkAttr.setXYZ(i,...ink.ink);
      list.push({id:a.id,nation:it.nation,posture:it.posture,distance:+it.distance.toFixed(1),position:[a.x,a.y,a.z],heightM:+size.heightM.toFixed(3),widthM:+size.widthM.toFixed(3),
        heightPx:+size.heightPx.toFixed(2),widthPx:+size.widthPx.toFixed(2),phase:+phase.toFixed(4),moving,contrast:+ink.ratio.toFixed(2),dark:ink.dark});
    }
    for(const n of IMPOSTOR_NATIONS){
      const m=this.meshes[n];if(!m)continue;m.count=counts[n];
      m.instanceMatrix.needsUpdate=true;m.geometry.getAttribute('aShape').needsUpdate=true;m.geometry.getAttribute('aInk').needsUpdate=true;
    }
    this.last={clock,list,counts};
  }
  /** `gameDiagnostics().m01.impostors`. */
  get diagnostics(){
    const counts=this.last?.counts??{pl:0,de:0};
    return {enabled:this.enabled,quality:this.quality,capacity:this.capacity,handoffM:HANDOFF_M,count:{...counts},total:counts.pl+counts.de,
      drawCalls:IMPOSTOR_NATIONS.filter(n=>(counts[n]??0)>0).length,meshes:Object.keys(this.meshes).length,selected:this.items.length,
      backlight:this.backlight,rimFacing:this.rimFacing,minContrast:MIN_CONTRAST,clock:this.last?.clock??null,items:this.last?.list??[]};
  }
  dispose(){for(const m of Object.values(this.meshes)){m.removeFromParent();m.geometry.dispose();m.dispose();}this.meshes={};this.material.dispose();this.geometry.dispose();
    if(typeof window!=='undefined'&&window.m01ImpostorDebug)delete window.m01ImpostorDebug;}
}
