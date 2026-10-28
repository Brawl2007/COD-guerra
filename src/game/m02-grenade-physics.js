import {traceObstruction} from '../world/spatial.js';

const GRAVITY=9.81,GROUND_OFFSET=.08,SEPARATION=.002;
const clamp01=n=>Math.max(0,Math.min(1,n));

function leavingFace(hit,p,dir){
 return ['x','y','z'].some(axis=>
  Math.abs(p[axis]-hit.min[axis])<1e-7&&dir[axis]<0||
  Math.abs(p[axis]-hit.max[axis])<1e-7&&dir[axis]>0);
}

function traceProjectile(world,start,dir,length){
 let hit=traceObstruction(world,start,dir,length),excluded=null;
 // A ray beginning exactly on a face and moving away intersects at t=0 in
 // the shared slab test. Ignore just that face's box and still test the rest.
 while(hit?.min&&hit?.max&&hit.distance<1e-8&&leavingFace(hit,start,dir)){
  excluded??=new Set();excluded.add(hit.min);
  const proxy={obstacles:world.obstacles.filter(box=>!excluded.has(box.min))};
  if(world.traceTerrain)proxy.traceTerrain=world.traceTerrain.bind(world);
  hit=traceObstruction(proxy,start,dir,length);
 }
 return hit;
}

function recoverEmbedded(hit,g){
 if(!['x','y','z'].every(axis=>g[axis]>hit.min[axis]+1e-7&&g[axis]<hit.max[axis]-1e-7))return false;
 let best=null;
 for(const axis of ['x','y','z'])for(const side of [-1,1]){
  const face=side<0?hit.min[axis]:hit.max[axis],distance=Math.abs(g[axis]-face);
  if(!best||distance<best.distance-1e-9||(Math.abs(distance-best.distance)<1e-9&&g[`v${axis}`]*side>0))best={axis,side,face,distance};
 }
 g[best.axis]=best.face+best.side*SEPARATION;
 if(g[`v${best.axis}`]*best.side<0)g[`v${best.axis}`]*=-.32;
 return true;
}

// A slab hit has an unambiguous entry face. Pick the closest entry face using
// the existing world's exact hit point, not the direction of the target.
function hitAxis(hit,point,direction){
 let axis=null,best=Infinity;
 for(const key of ['x','y','z']){
  if(Math.abs(direction[key])<1e-9)continue;
  const face=direction[key]>0?hit.min[key]:hit.max[key];
  const error=Math.abs(point[key]-face);
  if(error<best){best=error;axis=key;}
 }
 return axis;
}

// One causal simulation step. The projectile stops at the first solid surface
// for this tick, so even a large tick cannot place it beyond a wall. Ground
// contact uses the same M02 height function used by movement and rendering.
export function stepM02Grenade(world,g,dt){
 const start={x:g.x,y:g.y,z:g.z};
 const dx=g.vx*dt,dy=g.vy*dt,dz=g.vz*dt,length=Math.hypot(dx,dy,dz);
 const dir=length>1e-9?{x:dx/length,y:dy/length,z:dz/length}:null;
 const hit=dir?traceProjectile(world,start,dir,length):null;
 const nx=start.x+dx,ny=start.y+dy,nz=start.z+dz;
 const h0=world.heightAt(start.x,start.z)+GROUND_OFFSET,h1=world.heightAt(nx,nz)+GROUND_OFFSET;
 const c0=start.y-h0,c1=ny-h1;
 let groundFraction=c1< -1e-7?clamp01(c0/(c0-c1||1)):Infinity;
 if(hit?.role==='terrain')groundFraction=Math.min(groundFraction,clamp01(hit.distance/length));
 const solid=hit?.min&&hit?.max?hit:null;
 const solidFraction=solid?clamp01(solid.distance/length):Infinity;

 if(solid&&solidFraction<=groundFraction){
  if(solid.distance<1e-8&&recoverEmbedded(solid,g)){g.vy-=GRAVITY*dt;return;}
  const contact={x:start.x+dir.x*solid.distance,y:start.y+dir.y*solid.distance,z:start.z+dir.z*solid.distance};
  const axis=hitAxis(solid,contact,dir),travel=Math.max(0,solid.distance-SEPARATION);
  g.x=start.x+dir.x*travel;g.y=start.y+dir.y*travel;g.z=start.z+dir.z*travel;
  if(axis)g[`v${axis}`]*=-.32;
  g.vy-=GRAVITY*dt;
 }else if(groundFraction!==Infinity){
  g.x=start.x+dx*groundFraction;g.z=start.z+dz*groundFraction;
  g.y=world.heightAt(g.x,g.z)+GROUND_OFFSET;
  if(g.vy<0)g.vy=-g.vy*.25;
  g.vx*=.65;g.vz*=.65;
 }else{
  g.x=nx;g.y=ny;g.z=nz;g.vy-=GRAVITY*dt;
 }
}
