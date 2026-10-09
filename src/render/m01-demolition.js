// M01 demolition set-piece (T18): pure, presentation-only model. No THREE, no DOM, no wall clock, no simulation RNG.
//
// Clock contract: every function here takes `age = simulation clock - damage.started`, i.e. the SAME mission clock that
// m01-view compares with `damage.started` in updateBattlefieldFx. Nothing reads performance.now or accumulates frame deltas, so
// pausing freezes every pose (the view does not redraw while the clock is frozen) and a checkpoint restore replays the same
// pose, particles and feedback from the saved `damage` entry. The simulation never imports this module (tests grep for it).
import {M01_FX_QUALITY_DENSITY} from './m01-battlefield-fx-profile.js';

export const M01_DEMOLITION_IDS=Object.freeze(['east_demolition','west_demolition']);
export const isDemolitionDamage=id=>M01_DEMOLITION_IDS.includes(id);
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};

// Same integer hash family as m01-atmosphere's visualNoise, kept local so this module stays free of THREE.
export function demolitionNoise(seed,index=0){
  let x=((seed>>>0)+Math.imul((index+1)>>>0,0x9e3779b1))>>>0;
  x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;
  return (x>>>0)/4294967296;
}
/** Stable per-name seed (FNV-1a): every LOD of the same piece animates identically. */
export function collapseSeed(name=''){
  let h=0x811c9dc5;for(let i=0;i<name.length;i++){h^=name.charCodeAt(i);h=Math.imul(h,0x01000193);}
  return h>>>0;
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. Span / pier collapse

export const M01_COLLAPSE_DURATION=3.2;      // s from the blast to the stored final pose (contract: 2..4 s)
export const M01_COLLAPSE_MAX_DELAY=.4;      // s: per-piece stagger; every piece still lands exactly at M01_COLLAPSE_DURATION
export const M01_COLLAPSE_MIN_DROP=2;        // m: pieces whose stored pose is (almost) the intact pose still settle by at least this
export const M01_COLLAPSE_START_TILT=.026;   // rad (1.5 deg): largest deterministic start rotation per axis

/** `rail_span_01_collapsed` / `rail_support_06_rubble` / `road_support_00_damaged` -> the intact node they replace. */
export function collapseTwinName(name=''){
  const match=/^(.*)_(collapsed|rubble|damaged)$/.exec(name);return match?match[1]:null;
}
/** Manifest `showAfterEvent` (evt_m01_east_demolition) -> damage id (east_demolition); null for anything else. */
export function collapseDamageId(eventId){
  const id=typeof eventId==='string'?eventId.replace(/^evt_m01_/,''):null;return id&&isDemolitionDamage(id)?id:null;
}
export const collapseDelay=seed=>demolitionNoise(seed,1)*M01_COLLAPSE_MAX_DELAY;
export function collapseStartTilt(seed){
  return [(demolitionNoise(seed,2)-.5)*2*M01_COLLAPSE_START_TILT,(demolitionNoise(seed,3)-.5)*M01_COLLAPSE_START_TILT,(demolitionNoise(seed,4)-.5)*2*M01_COLLAPSE_START_TILT];
}
/** Start offset from the stored pose: intact pivot - collapsed pivot, with a minimum drop for pieces that barely move. */
export const collapseStartOffset=offset=>[offset[0],Math.max(offset[1],M01_COLLAPSE_MIN_DROP),offset[2]];

/** Fraction of the fall completed (0..1). Gravity-like ease-in (p^2): slow release, fastest at impact. Exactly 1 from `duration` on. */
export function collapseProgress(age,delay=0,duration=M01_COLLAPSE_DURATION){
  if(!(age>0))return 0;
  if(age>=duration)return 1;
  const p=(age-delay)/(duration-delay);
  return p<=0?0:p*p;
}

const UNTOUCHED=Object.freeze({active:false,progress:0,remaining:0,offset:Object.freeze([0,0,0]),tilt:Object.freeze([0,0,0])});
const SETTLED=Object.freeze({active:false,progress:1,remaining:0,offset:Object.freeze([0,0,0]),tilt:Object.freeze([0,0,0])});

/**
 * Pose of a collapsed/rubble node `age` seconds after the blast, as a displacement from its STORED transform:
 *   position = stored.position + offset         quaternion = slerp(stored.quaternion, quat(tilt), remaining)
 * `active:false` means "use the stored transform exactly": before the blast (age < 0, NaN, no damage entry) and from
 * `duration` on (`progress` 1). offset and the rotation angle both scale with `remaining`, so the distance to the stored
 * pose never increases while the piece falls.
 */
export function collapsePose({age,offset=[0,0,0],seed=0,duration=M01_COLLAPSE_DURATION}={}){
  if(!Number.isFinite(age)||age<0)return UNTOUCHED;
  if(age>=duration)return SETTLED;
  const progress=collapseProgress(age,collapseDelay(seed),duration),remaining=1-progress,start=collapseStartOffset(offset);
  return {active:true,progress,remaining,offset:start.map(v=>v*remaining),tilt:collapseStartTilt(seed)};
}

// ---------------------------------------------------------------------------------------------------------------------
// 2. Flash / light: minimum size and duration by distance

export const M01_FLASH_MIN_ANGULAR=.08;        // rad (~4.6 deg, ~41 px of a 720 px / 70 deg view): smallest flash angular size beyond ~360 m
export const M01_FLASH_MIN_DURATION=.45;       // s: flash lifetime from ~300 m outwards (the profile's 0.12 s is kept below 85 m)
export const M01_FLASH_MAX_SCALE_FACTOR=3.2;   // the size floor never inflates the profile by more than this (93 m: keeps .08 rad out to ~1.15 km)
export const M01_LIGHT_FAR_SECONDS=.9;         // s the explosion light lasts for a far viewer (profile: <= 0.34 s)
export const M01_LIGHT_RANGE_GAIN=2.4;         // light range multiplier for a far viewer (profile 108 m -> ~260 m)
export const M01_FLASH_NEAR_DISTANCE=85;       // same band edges as fxDistanceBand: near < 85 m, far >= 300 m
export const M01_FLASH_FAR_DISTANCE=300;
// One flash billboard is the shared soft puff: texture alpha <= .68 (centre ~.35) times the .94 peak, so a single far flash over the
// pale horizon haze differs from it by ~30/255 at its centre only (measured with the real texture and tone mapping: 7..23 px beyond
// +20/255) and vanishes. Stacking the same billboard raises the accumulated alpha; the colour warms with distance so the flash also
// differs from the haze in hue (blue channel), not only in luminance. Near the viewer (< 85 m) nothing changes.
export const M01_FLASH_FAR_LAYERS=5;           // extra stacked flash billboards at >= 300 m (the flash pool holds 16; the profile uses 2)
export const M01_FLASH_NEAR_COLOR='#fff0c0';
export const M01_FLASH_FAR_COLOR='#ffd27a';
const mixHex=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)+(parseInt(b.slice(i,i+2),16)-parseInt(a.slice(i,i+2),16))*t).toString(16).padStart(2,'0')).join('');

/**
 * Flash/light parameters for a viewer `distance` metres from the blast. Below 85 m this returns the profile values
 * unchanged (scale factor 1, profile duration, 0.34 s light, 108 m range, decay 2).
 */
export function demolitionFlash(distance,{scale=29,flashEnd=.12,lightRange=108,lightSeconds=.34}={}){
  const d=Math.max(0,Number(distance)||0),k=smooth((d-M01_FLASH_NEAR_DISTANCE)/(M01_FLASH_FAR_DISTANCE-M01_FLASH_NEAR_DISTANCE));
  const wanted=M01_FLASH_MIN_ANGULAR*d,flashScale=Math.min(scale*M01_FLASH_MAX_SCALE_FACTOR,Math.max(scale,wanted));
  return {distance:d,scale:flashScale,scaleFactor:flashScale/scale,angular:d>0?flashScale/d:Infinity,
    extraLayers:Math.round(M01_FLASH_FAR_LAYERS*k),color:mixHex(M01_FLASH_NEAR_COLOR,M01_FLASH_FAR_COLOR,k),
    duration:flashEnd+(Math.max(flashEnd,M01_FLASH_MIN_DURATION)-flashEnd)*k,
    lightSeconds:lightSeconds+(Math.max(lightSeconds,M01_LIGHT_FAR_SECONDS)-lightSeconds)*k,
    lightRange:lightRange*(1+(M01_LIGHT_RANGE_GAIN-1)*k),lightDecay:2-k};
}

/**
 * Screen position (CSS pixels, y down) of a world point for a camera described by the view diagnostics
 * ({position:[x,y,z],quaternion:[x,y,z,w],fov (vertical, degrees),aspect,near,width,height}); the camera looks down its local -Z.
 * `behind` is true when the point is not in front of the near plane; `inside` when it is also within the viewport.
 */
export function projectToScreen(camera,point){
  const [qx,qy,qz,qw]=camera.quaternion,px=point.x-camera.position[0],py=point.y-camera.position[1],pz=point.z-camera.position[2];
  // v' = conjugate(q) * v: t = 2 (u x v), v' = v + w t + u x t with u = -q.xyz
  const ux=-qx,uy=-qy,uz=-qz,tx=2*(uy*pz-uz*py),ty=2*(uz*px-ux*pz),tz=2*(ux*py-uy*px);
  const vx=px+qw*tx+(uy*tz-uz*ty),vy=py+qw*ty+(uz*tx-ux*tz),vz=pz+qw*tz+(ux*ty-uy*tx);
  const depth=-vz,focal=1/Math.tan(camera.fov*Math.PI/360),behind=!(depth>(camera.near??.05));
  const x=((vx*focal/(depth*camera.aspect))*.5+.5)*camera.width,y=((-vy*focal/depth)*.5+.5)*camera.height;
  return {x,y,depth,behind,inside:!behind&&x>=0&&x<=camera.width&&y>=0&&y<=camera.height};
}

// ---------------------------------------------------------------------------------------------------------------------
// 3. Far-field feedback (>= ~180 m): exposure flash when the light arrives (age 0), tremor when the sound arrives

export const M01_SOUND_SPEED=343;
export const M01_NEAR_FEEDBACK_RANGE=180;          // mirrors M01CombatFeedback.explosion: strength = 1 - d/180 ...
export const M01_NEAR_FEEDBACK_MIN_STRENGTH=.02;   // ... and nothing at strength <= .02
export const M01_FAR_EXPOSURE_SECONDS=.9;
export const M01_FAR_TREMOR_SECONDS=1.6;
/** True when the existing near path (game.js -> M01CombatFeedback.explosion) produces an event for this distance. */
export const nearExplosionFeedbackApplies=distance=>clamp(1-(Math.max(0,Number(distance)||0))/M01_NEAR_FEEDBACK_RANGE)>M01_NEAR_FEEDBACK_MIN_STRENGTH;
/** Exact complement of the near path: a demolition is covered by exactly one of the two, never doubled. */
export const farFeedbackApplies=distance=>Number.isFinite(distance)&&!nearExplosionFeedbackApplies(distance);
export const tremorDelay=distance=>Math.max(0,distance)/M01_SOUND_SPEED;
export const farFeedbackWindow=distance=>tremorDelay(distance)+M01_FAR_TREMOR_SECONDS;
const decay=(age,duration)=>age<0||age>=duration?0:(1-age/duration)**2;
const exposureStrength=distance=>clamp(1.05-distance/3000,.45,1);
const tremorStrength=distance=>clamp(.9-distance/2500,.3,.85);

/** Pure function of age: `exposure` is at its peak at age 0 (light), `tremor` starts at distance/343 s (sound). */
export function farFeedback(age,distance){
  if(!farFeedbackApplies(distance)||!Number.isFinite(age)||age<0)return {applies:farFeedbackApplies(distance),exposure:0,tremor:0,exposureAt:0,tremorAt:Number.isFinite(distance)?tremorDelay(distance):Infinity};
  const tremorAt=tremorDelay(distance);
  return {applies:true,exposure:decay(age,M01_FAR_EXPOSURE_SECONDS)*exposureStrength(distance),
    tremor:decay(age-tremorAt,M01_FAR_TREMOR_SECONDS)*tremorStrength(distance),exposureAt:0,tremorAt};
}

// ---------------------------------------------------------------------------------------------------------------------
// 4. Silence hook (the audio mix is not touched here: the window is exposed in the view diagnostics for the audio task)

export const M01_SILENCE_SECONDS=2;
export const demolitionSilenceWindow=damage=>({id:damage.id,from:damage.started,to:damage.started+M01_SILENCE_SECONDS});
export const demolitionSilenceActive=(damage,clock)=>{const w=demolitionSilenceWindow(damage);return clock>=w.from&&clock<w.to;};

// ---------------------------------------------------------------------------------------------------------------------
// 5. Debris, splashes, earth rain, suspended dust: particle descriptors for the existing atmosphere pools

// Water is x in (25,265) at y -10 (src/world/tczew-world.js terrainHeightAt); east of it the ground is at y -5 (flood plain).
export const M01_WATER_RANGE=Object.freeze([25,265]);
export const M01_WATER_Y=-10;
export const surfaceAt=x=>x>M01_WATER_RANGE[0]&&x<M01_WATER_RANGE[1]?'water':'earth';
// x of the collapsed span pivots in bridges.manifest.json (west: spans 01/02, east: spans 06/07). The rail bridge lies at
// damage.z - 20 (z 0) and the road bridge at damage.z + 20 (z 40; its GLB root is placed at z 40).
const FALL=Object.freeze({
  west_demolition:Object.freeze([[10.4,-20],[142.1,-20],[8.5,20],[142.1,20]]),
  east_demolition:Object.freeze([[663.5,-20],[795,-20],[663.3,20],[808.6,20]])
});
export function demolitionFallPoints(damage){
  return (FALL[damage?.id]??[]).map(([x,dz])=>({x,z:damage.z+dz,surface:surfaceAt(x)}));
}
// missions/m01-tczew/map-layout.json feature `firing_point` (RECONSTRUCTED position): the sappers' firing post, west side.
export const M01_WEST_FIRING_POST=Object.freeze({x:-290,y:-3,z:22});

export const M01_SPLASH_DELAY=3;       // s after the blast: the spans reach the river / flood plain (just before the 3.2 s landing)
export const M01_SPLASH_LIFE=1.8;
export const M01_HAZE_LIFE=10;
export const M01_HAZE_DELAY=M01_COLLAPSE_DURATION-.6;   // the dust starts hanging just before the spans land
export const M01_RAIN_HEIGHT=26;       // m the earth falls from
export const M01_DEMOLITION_BUDGET=Object.freeze({
  // Inside M01Atmosphere's pools: puffs <= 112/192/256 (per preset) and 64 debris shared with the generic blast chips (<= 28).
  low:Object.freeze({puffs:24,debris:18}),medium:Object.freeze({puffs:36,debris:28}),high:Object.freeze({puffs:48,debris:36})
});
// Blast chips / shards take their colour per instance (setColorAt); the material must NOT set vertexColors:
// TetrahedronGeometry has no `color` attribute, so vertexColors:true multiplies every chip by black.
export const M01_BLAST_CHIP_MATERIALS=Object.freeze({
  chip:Object.freeze({color:'#ffffff',roughness:.88}),
  blastShard:Object.freeze({color:'#5c5142',roughness:1})
});

const EMPTY=Object.freeze({puffs:Object.freeze([]),chips:Object.freeze([])});
const count=(base,density)=>Math.max(1,Math.round(base*density));

/**
 * Presentation particles for one demolition at `clock`: {puffs:[{x,y,z,sx,sy,opacity,color,seed,variant}], chips:[{x,y,z,rx,ry,rz,sx,sy,sz}]}.
 * Pure function of (damage.id, damage.started, damage.x/z, clock, quality); never more than M01_DEMOLITION_BUDGET[quality].
 * `surfaceY(x,z)` supplies the ground height (the view passes terrainHeightAt).
 */
export function demolitionParticles({damage,clock,quality='medium',surfaceY=()=>-5}={}){
  if(!damage||!isDemolitionDamage(damage.id))return EMPTY;
  const age=clock-damage.started;if(!(age>=0))return EMPTY;
  const budget=M01_DEMOLITION_BUDGET[quality]??M01_DEMOLITION_BUDGET.medium,density=M01_FX_QUALITY_DENSITY[quality]??M01_FX_QUALITY_DENSITY.medium;
  // Seeded by the blast point only (each demolition happens once): the particles depend on the age, never on the absolute clock.
  const seed=(Math.floor((damage.x+2048)*29)^Math.floor((damage.z+2048)*53)^collapseSeed(damage.id))>>>0;
  const puffs=[],chips=[],points=demolitionFallPoints(damage);
  // Impact at the fall points: splash column on water, ground dust thump on earth, plus thrown masonry.
  points.forEach((point,i)=>{
    const a=age-(M01_SPLASH_DELAY+demolitionNoise(seed,10+i)*.35);if(a<0||a>M01_SPLASH_LIFE)return;
    const k=a/M01_SPLASH_LIFE,ground=point.surface==='water'?M01_WATER_Y:surfaceY(point.x,point.z),water=point.surface==='water';
    for(let j=0,n=count(4,density);j<n;j++){
      const n0=demolitionNoise(seed,100+i*8+j*2),n1=demolitionNoise(seed,101+i*8+j*2),angle=n0*Math.PI*2;
      const width=(water?7+11*k:6+10*k)*(.7+n1*.6),r=water?(n1-.5)*7:k*5.5*(.5+n0);
      puffs.push({x:point.x+Math.cos(angle)*r,y:ground+(water?(2+9*Math.sqrt(k))*(.6+n0*.8):1+a*2+n1),z:point.z+Math.sin(angle)*r,
        sx:width,sy:width*(water?1.5:.7),opacity:(water?.85:.72)*(1-k)*Math.min(1,a/.15),color:water?'#d7e1e3':'#a08e72',seed:seed+i,variant:300+i*4+j});
    }
    for(let j=0,n=count(4,density);j<n;j++){
      const n0=demolitionNoise(seed,200+i*8+j*3),n1=demolitionNoise(seed,201+i*8+j*3),n2=demolitionNoise(seed,202+i*8+j*3),angle=n0*Math.PI*2;
      const speed=6+n1*5,y=ground+.3+(7+n2*6)*a-4.9*a*a;if(y<ground)continue;
      const s=.3+n2*.5;
      chips.push({x:point.x+Math.cos(angle)*speed*a,y,z:point.z+Math.sin(angle)*speed*a,rx:a*(2+n0*3),ry:angle,rz:a*(3+n1*4),sx:s,sy:s*(.5+n0*.4),sz:s*.8});
    }
  });
  // Earth rain at the west firing post once the shock reaches it (distance / 343 s), each clod falling from M01_RAIN_HEIGHT.
  if(damage.id==='west_demolition'){
    const post=M01_WEST_FIRING_POST,arrive=tremorDelay(Math.hypot(damage.x-post.x,damage.z-post.z))+.3,fall=Math.sqrt(2*M01_RAIN_HEIGHT/9.8);
    for(let j=0,n=count(16,density);j<n;j++){
      const n0=demolitionNoise(seed,400+j*4),n1=demolitionNoise(seed,401+j*4),n2=demolitionNoise(seed,402+j*4),angle=n0*Math.PI*2,r=Math.sqrt(n1)*16;
      const a=age-(arrive+n2*2.9);if(a<0||a>fall+.6)continue;
      const x=post.x+Math.cos(angle)*r+a*.8,z=post.z+Math.sin(angle)*r,ground=surfaceY(x,z)??post.y;
      if(a<=fall){
        const s=.3+n0*.5;
        chips.push({x,y:ground+M01_RAIN_HEIGHT-4.9*a*a,z,rx:a*(2+n1*3),ry:angle,rz:a*(3+n2*4),sx:s,sy:s*.6,sz:s*.8});
      }else if(j%2===0){
        const k=(a-fall)/.6,w=(2.5+4*k)*(.7+n1*.6);
        puffs.push({x,y:ground+.6+k*1.2,z,sx:w,sy:w*.55,opacity:.55*(1-k),color:'#8f7f66',seed:seed+j,variant:500+j});
      }
    }
    if(age>arrive&&age<arrive+5){
      const k=(age-arrive)/5;
      for(let j=0,n=count(3,density);j<n;j++){
        const n0=demolitionNoise(seed,450+j);
        puffs.push({x:post.x+(n0-.5)*18+age*.8,y:(surfaceY(post.x,post.z)??post.y)+7+n0*5,z:post.z+(demolitionNoise(seed,460+j)-.5)*18,sx:16,sy:9,
          opacity:.45*Math.min(1,k*6)*(1-k),color:'#9a8a70',seed:seed+40+j,variant:520+j});
      }
    }
  }
  // Suspended dust: a slow haze over the fall points after the spans have landed.
  const hazeAge=age-M01_HAZE_DELAY;
  if(hazeAge>0&&hazeAge<M01_HAZE_LIFE){
    const k=hazeAge/M01_HAZE_LIFE;
    points.forEach((point,i)=>{
      for(let j=0,n=count(2,density);j<n;j++){
        const n0=demolitionNoise(seed,600+i*4+j),n1=demolitionNoise(seed,601+i*4+j);
        const ground=point.surface==='water'?M01_WATER_Y:surfaceY(point.x,point.z),w=(22+hazeAge*1.4)*(.75+n0*.5);
        puffs.push({x:point.x+(n0-.5)*18+hazeAge*.9,y:ground+6+hazeAge*.5+n1*4,z:point.z+(n1-.5)*14,sx:w,sy:w*.45,
          opacity:.34*Math.min(1,hazeAge/1.2)*(1-k)*(1-k*.4),color:point.surface==='water'?'#a9aca6':'#9e8d72',seed:seed+60+i*2+j,variant:640+i*3+j});
      }
    });
  }
  // Fully faded puffs are not drawn (the view's own guard is opacity <= .004).
  return {puffs:puffs.filter(p=>p.opacity>.004).slice(0,budget.puffs),chips:chips.slice(0,budget.debris)};
}
