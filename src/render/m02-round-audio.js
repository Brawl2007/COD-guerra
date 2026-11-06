import {traceObstruction} from '../world/spatial.js';

const finitePoint=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);

// The shared M01 bank uses broad surface families; M02 has thickness variants.
const impactFamily=material=>/^wood/.test(material)?'wood':
  /^metal/.test(material)?'metal':material==='foliage'?'earth':material;
const listener=player=>({x:player.x,y:player.y+(player.eyeHeight??(player.crouched?1.08:1.65)),z:player.z});

// The finite, already-obstructed segment is the only source of a near pass.
// A wall between that segment and the listener must not produce a close crack.
export function m02RoundPass(trace,player,world){
  if(!finitePoint(trace?.origin)||!finitePoint(trace?.point))return null;
  const a=trace.origin,b=trace.point,ear=listener(player);
  if(!finitePoint(ear))return null;
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len2=dx*dx+dy*dy+dz*dz;
  if(len2<1e-8)return null;
  const t=((ear.x-a.x)*dx+(ear.y-a.y)*dy+(ear.z-a.z)*dz)/len2;
  if(t<=0||t>=1)return null;
  const point={x:a.x+t*dx,y:a.y+t*dy,z:a.z+t*dz};
  const x=ear.x-point.x,y=ear.y-point.y,z=ear.z-point.z,distance=Math.hypot(x,y,z);
  if(distance>2.5)return null;
  if(distance>.02&&traceObstruction(world,point,{x:x/distance,y:y/distance,z:z/distance},distance-.02))return null;
  return {point,distance};
}

export function playM02RoundAudio(audio,trace,sim,spatial,key,{nearPass=false}={}){
  if(!trace||!finitePoint(trace.point))return;
  if(nearPass){
    const pass=m02RoundPass(trace,sim.player,sim.world);
    if(pass){const s=spatial(pass.point,sim);audio.crack(s.pan,pass.distance,`${key}:pass`,s.front);}
  }
  if(trace.hitKind!=='world')return;
  const s=spatial(trace.point,sim);
  // Distant, inaudible impacts would otherwise flood the M01 voice pool.
  if(s.distance>120)return;
  const ear=listener(sim.player),dx=trace.point.x-ear.x,dy=trace.point.y-ear.y,dz=trace.point.z-ear.z,dist=Math.hypot(dx,dy,dz);
  const blocked=dist>.04&&traceObstruction(sim.world,ear,{x:dx/dist,y:dy/dist,z:dz/dist},dist-.04);
  audio.setOcclusion(blocked?{hz:1200,gain:.4}:null);
  audio.impact(impactFamily(trace.material??'earth'),s.pan,s.distance,`${key}:impact`,s.front);
  audio.setOcclusion(null);
}
