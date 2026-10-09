import * as THREE from 'three';
import {m01StukaAnchor,m01StukaPosition,m01StukaVelocity,M01_STUKA_COUNT} from '../world/m01-aircraft-path.js';

// Presentation only for the three Ju 87 of the first raid. Path, timings, events and damage stay with the
// existing raid code and M01Simulation; everything here is a pure function of the saved clock (pause/restore safe).
export const JU87_LOD_DISTANCES=Object.freeze([0,150,600]);
export const JU87_QUALITY_FLOOR=Object.freeze({low:600,medium:150,high:0});
// Small per-aircraft differences (paint batch, wear, engine): not unit markings, which remain undocumented.
export const JU87_VARIANTS=Object.freeze([
  Object.freeze({tint:[1,1,1],roughness:1,rps:25,phase:0}),
  Object.freeze({tint:[.95,.98,.94],roughness:.93,rps:24.6,phase:.37}),
  Object.freeze({tint:[1.04,1.03,.99],roughness:1.06,rps:25.4,phase:.71}),
]);
const ENTER_S=3,LOD_HYSTERESIS=.1;
const finite=Number.isFinite,smooth=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
const variantOf=i=>JU87_VARIANTS[i%JU87_VARIANTS.length];

/**
 * Attitude from the path tangent (nose is -Z, 'YXZ' order): heading from the horizontal velocity, pitch from the climb angle
 * (negative while diving) and a coordinated bank from the heading rate. `since` is the time after evt_m01_bombing_0434.
 */
export const JU87_HEADING_WINDOW_S=4,JU87_HEADING_TAPS=10;
/**
 * Presented heading (rad) at `since`: the path heading averaged (Gaussian weights, as angle offsets from the centre sample so the
 * +-pi wrap never matters) over JU87_HEADING_WINDOW_S around that instant. The pull-out turns the horizontal velocity by ~180 degrees
 * in ~0.3 s while the plane is nearly vertical; averaging keeps the visible yaw rate bounded. Pure function of time (no frame state);
 * the position is never touched.
 */
export function ju87Heading(since,i){
  const heading=t=>{const v=m01StukaVelocity(t,i);return Math.hypot(v.x,v.z)>1e-6?Math.atan2(-v.x,-v.z):0;};
  const centre=heading(since);let sum=0,weight=0;
  for(let k=-JU87_HEADING_TAPS;k<=JU87_HEADING_TAPS;k++){
    const w=Math.exp(-.5*(2*k/JU87_HEADING_TAPS)**2),d=heading(since+k*JU87_HEADING_WINDOW_S/JU87_HEADING_TAPS)-centre;
    sum+=w*Math.atan2(Math.sin(d),Math.cos(d));weight+=w;
  }
  return centre+sum/weight;
}
export function ju87Attitude(since,i){
  const v=m01StukaVelocity(since,i),horizontal=Math.hypot(v.x,v.z),speed=Math.hypot(v.x,v.y,v.z)||1;
  let turn=ju87Heading(since+.3,i)-ju87Heading(since-.3,i);turn=Math.atan2(Math.sin(turn),Math.cos(turn));
  const bank=Math.max(-.8,Math.min(.8,Math.atan(speed*(turn/.6)/9.81)*.6));
  return {yaw:ju87Heading(since,i),pitch:Math.atan2(v.y,horizontal),bank};
}
/** Saved mission-clock time of the event that makes the first raid visible (read-only; undefined before it). */
export const JU87_HEARD_EVENT='evt_m01_planes_heard';
export function ju87HeardAt(sim){return sim?.consumed?.[JU87_HEARD_EVENT];}
/** Dithered entry: the formation fades in over a few seconds after the planes are heard (the path itself never loops). */
export function ju87Fade(time,heardAt){
  return Number.isFinite(heardAt)?smooth((time-heardAt)/ENTER_S):1;
}
/** Propeller clip time (one revolution = 1 s) at ~1500 rpm, each aircraft with its own rpm and phase. */
export function ju87PropellerTime(time,i){const v=variantOf(i),t=(time*v.rps+v.phase)%1;return t<0?t+1:t;}
/** LOD index with 10 % hysteresis around each threshold; the quality floor always wins. */
export function selectJu87Level(levels,distance,floor,current){
  const pick=d=>{let k=0;for(let j=1;j<levels.length;j++)if(d>=levels[j].distance)k=j;return k;};
  const d=Number.isFinite(distance)?distance:Infinity,min=pick(floor),want=Math.max(min,pick(Math.max(d,floor)));
  if(!Number.isInteger(current)||current<min||current>=levels.length||current===want)return want;
  const lo=current?levels[current].distance*(1-LOD_HYSTERESIS):0,hi=current+1<levels.length?levels[current+1].distance*(1+LOD_HYSTERESIS):Infinity;
  return d>=lo&&d<hi?current:want;
}
/**
 * Tiny equirectangular dawn sky (PMREM is done by three.js) so the canopy and bare metal reflect it and the RLM 65
 * underside receives the ground bounce that the scene's hemisphere light alone leaves near black against the sky.
 */
export function ju87SkyEnvironment(){
  const w=256,h=128,data=new Uint8Array(w*h*4),zenith=new THREE.Color('#9fb4cc'),horizon=new THREE.Color('#d3d7d2'),ground=new THREE.Color('#6f6752'),c=new THREE.Color();
  for(let y=0;y<h;y++){
    const el=((y+.5)/h-.5)*Math.PI;   // row 0 is the bottom of an equirectangular map
    if(el>=0)c.copy(horizon).lerp(zenith,smooth(el/(Math.PI/2)*1.6));else c.copy(horizon).lerp(ground,smooth(-el/(Math.PI/2)*5));
    const {r,g,b}=c.getRGB({},THREE.SRGBColorSpace);   // THREE.Color is linear; the texture stores sRGB bytes
    for(let x=0;x<w;x++)data.set([r*255,g*255,b*255,255].map(Math.round),(y*w+x)*4);
  }
  const texture=new THREE.DataTexture(data,w,h);
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
  return texture;
}
/** Per-aircraft material instances (textures and geometry stay shared) with the variant and a dithered fade. */
export function instanceJu87Materials(model,i,sky){
  const v=variantOf(i),own=new Map();
  model.traverse(o=>{
    if(!o.isMesh)return;
    let m=own.get(o.material);
    if(!m){
      m=o.material.clone();m.userData.baseOpacity=m.opacity;
      if(m.name==='ju87_b1'){m.color.multiply(new THREE.Color(...v.tint));m.roughness*=v.roughness;m.alphaHash=true;m.envMap=sky;m.envMapIntensity=.85;}
      else if(m.name==='ju87_glass'){m.envMap=sky;m.envMapIntensity=1.2;}
      else if(m.name==='ju87_prop_disc')m.forceSinglePass=true;   // flat double-sided disc: one draw instead of two
      own.set(o.material,m);
    }
    o.material=m;
  });
  return [...own.values()];
}
export function setJu87Fade(materials,fade){for(const m of materials)m.opacity=m.userData.baseOpacity*fade;}

// ---- Visible bombs (presentation only) -------------------------------------------------------------------------------------
// The three aerial blasts of evt_m01_bombing_0434, in the order the simulation emits them: the impact id, the plane that carries it
// (formation order), the delay after the bombing event (evt_m01_forward_post_bombed 2.1 s, evt_m01_nowicki_lost 5.0 s; a test
// compares them with mission.json) and the named point the simulation aims at. raid_0530 fires at the first instant of the high
// raid, when its plane is not yet in the scene, so it has no carrier and no visible bomb.
export const JU87_BOMB_FALL_S=1.5;
export const JU87_BOMB_RUN=Object.freeze([
  Object.freeze({id:'station_bomb',plane:0,delay:0,point:'tczew_station'}),
  Object.freeze({id:'forward_post',plane:1,delay:2.1,point:'forward_post'}),
  Object.freeze({id:'repair_crater',plane:2,delay:5,point:'repair_site_1'}),
]);
const ground=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/**
 * Where the simulation will put an aerial impact, for the 1.5 s before it exists. It mirrors the two safety rules of
 * M01Simulation (forward_post near miss, no impact closer than 30 m to the player); the authoritative damage point replaces it
 * as soon as it is emitted, so a wrong guess can only move the last frames of the flight, never the blast.
 */
export function predictedBlastPoint(run,world,player){
  const named=world.point(run.point);let point={x:named.x,y:named.y??0,z:named.z};
  if(run.id==='forward_post'&&player&&ground(player,named)<=30)point={x:0,y:-10,z:-40};
  if(player&&ground(point,player)<30){
    const angle=Math.atan2(point.z-player.z,point.x-player.x);
    point={x:player.x+Math.cos(angle)*40,y:point.y,z:player.z+Math.sin(angle)*40};
  }
  return point;
}
/** Cubic Bezier position and derivative (per second) over `duration` seconds. */
function bezier(p0,p1,p2,p3,s,duration){
  const u=1-s,out={position:{},velocity:{}};
  for(const axis of ['x','y','z']){
    out.position[axis]=u*u*u*p0[axis]+3*u*u*s*p1[axis]+3*u*s*s*p2[axis]+s*s*s*p3[axis];
    out.velocity[axis]=3*(u*u*(p1[axis]-p0[axis])+2*u*s*(p2[axis]-p1[axis])+s*s*(p3[axis]-p2[axis]))/duration;
  }
  return out;
}
/**
 * Bombs in flight at `clock`: a pure function of the clock, the saved damage list and the battle clock. A bomb leaves its
 * carrier JU87_BOMB_FALL_S before the blast instant (damage `started` once emitted, otherwise anchor + delay), inherits the
 * plane's velocity at that moment and reaches the blast point exactly at the blast instant (flight s=1); before and after it
 * is not listed. `state`: renderState-like {damage, battleClock}; `world`: M01 world (named points); `player`: {x,z}.
 */
export function m01BombFlights({clock,state,world,player}){
  const anchor=m01StukaAnchor(clock,state),flights=[];
  for(const run of JU87_BOMB_RUN){
    const hit=state?.damage?.find?.(d=>d.id===run.id),authoritative=finite(hit?.started);
    const at=authoritative?hit.started:anchor+run.delay,releaseAt=at-JU87_BOMB_FALL_S,s=(clock-releaseAt)/JU87_BOMB_FALL_S;
    // A predicted blast that is due but not emitted yet (s>=1) shows nothing: a bomb never waits at the target.
    if(!(s>=-1e-9&&s<=(authoritative?1+1e-9:1-1e-9)))continue;
    const target=hit&&finite(hit.x)&&finite(hit.z)?{x:hit.x,y:hit.y??0,z:hit.z}:predictedBlastPoint(run,world,player);
    const sinceRelease=releaseAt-anchor,carrier=m01StukaPosition(sinceRelease,run.plane),v=m01StukaVelocity(sinceRelease,run.plane);
    const from={x:carrier.x,y:carrier.y-1.2,z:carrier.z},chord={x:(target.x-from.x)/JU87_BOMB_FALL_S,y:(target.y-from.y)/JU87_BOMB_FALL_S,z:(target.z-from.z)/JU87_BOMB_FALL_S};
    // Leaves with the plane's velocity and finishes steeper than the chord (gravity); the Bezier ends exactly on the target.
    const D=JU87_BOMB_FALL_S,end={x:chord.x*1.05,y:chord.y*1.2-15,z:chord.z*1.05};
    const c1={x:from.x+v.x*D/3,y:from.y+v.y*D/3,z:from.z+v.z*D/3},c2={x:target.x-end.x*D/3,y:target.y-end.y*D/3,z:target.z-end.z*D/3};
    const sample=bezier(from,c1,c2,target,Math.min(1,Math.max(0,s)),D);
    flights.push({id:run.id,plane:run.plane,s:Math.min(1,Math.max(0,s)),releaseAt,at,predicted:!authoritative,target,from,
      position:sample.position,velocity:sample.velocity});
  }
  return flights;
}
/** Shared bounds for the bomb pool: one bomb per carrier. */
export const JU87_BOMB_POOL=M01_STUKA_COUNT;
