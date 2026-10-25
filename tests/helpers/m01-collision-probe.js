import {M01Simulation} from '../../src/game/m01-simulation.js';

// Test pilot for player collision. The player is placed by the test (setup), then driven only through the real
// M01Simulation.tick controls (forward + sprint), so every result comes from the production movement path.
export const R=.36;                       // player.radius in M01Simulation.reset
export const STEP=.45;                    // tallest ledge the player steps onto (src/world/m01-player-physics.js PLAYER_PHYSICS.stepUp)
export const G=9.81;

/** A simulation with the intro skipped, so movement is unlocked. */
export function freshSim(seed=17){const sim=new M01Simulation(seed);sim.tick(.05,{skip:true});sim.drainEvents();return sim;}

/** Oriented box on the ground plane. yaw uses the three.js rotation.y convention: world = [cos sin; -sin cos] * local. */
export function obb({id,cx,cz,hx,hz,yaw=0,y0=-Infinity,y1=Infinity,kind='solid'}){
  return {id,kind,cx,cz,hx,hz,yaw,y0,y1,c:Math.cos(yaw),s:Math.sin(yaw)};
}
export const aabb=(id,min,max,kind='solid')=>obb({id,kind,cx:(min.x+max.x)/2,cz:(min.z+max.z)/2,hx:(max.x-min.x)/2,hz:(max.z-min.z)/2,y0:min.y,y1:max.y});
export const toLocal=(b,x,z)=>[(x-b.cx)*b.c-(z-b.cz)*b.s,(x-b.cx)*b.s+(z-b.cz)*b.c];
export const toWorld=(b,lx,lz)=>[b.cx+lx*b.c+lz*b.s,b.cz-lx*b.s+lz*b.c];
/** Distance from a point to the footprint (0 inside). */
export function footprintDistance(b,x,z){const [lx,lz]=toLocal(b,x,z);return Math.hypot(Math.max(Math.abs(lx)-b.hx,0),Math.max(Math.abs(lz)-b.hz,0));}
/** Penetration of the player circle into a box footprint: positive = overlap depth. */
export function penetration(b,x,z){
  const [lx,lz]=toLocal(b,x,z),ox=Math.abs(lx)-b.hx,oz=Math.abs(lz)-b.hz;
  if(ox<=0&&oz<=0)return R-Math.max(ox,oz);   // centre inside: deeper than the radius
  return R-Math.hypot(Math.max(ox,0),Math.max(oz,0));
}

/** Place the player and drive it for `ticks` ticks at sprint (6 m/s) or walk speed. Returns the per-tick path. */
export function drive(sim,{x,z,y,angle,ticks=40,sprint=true,forward=1,side=0,crouched=false}){
  const p=sim.player;
  Object.assign(p,{x,z,y:y??sim.world.heightAt(x,z),angle,pitch:0,health:100,alive:true,crouched,moveBlend:0});delete p.fall;
  const path=[{x:p.x,y:p.y,z:p.z,t:0}];
  for(let i=1;i<=ticks;i++){
    sim.tick(.05,{forward,side,sprint});
    const events=sim.drainEvents();
    if(events.some(e=>e.type==='restored'))throw new Error(`the probe was restored (${sim.failure??'death'}) at tick ${i}`);
    path.push({x:p.x,y:p.y,z:p.z,t:i*.05,events});
  }
  return path;
}

/**
 * Approach one box face from outside along its local axis. `side` is +x,-x,+z,-z in the box frame; `offset` slides the line along the face.
 * Returns the start, the heading and the path, or null when the start would be inside another expected solid.
 */
export function approach(sim,box,side,{offset=0,gap=4,ticks=36,others=[],sprint=true}={}){
  const axisX=side[1]==='x',sign=side[0]==='+'?1:-1;
  const lx=axisX?sign*(box.hx+gap):offset,lz=axisX?offset:sign*(box.hz+gap);
  const [x,z]=toWorld(box,lx,lz);
  // The player heads for the point on the face line: direction = -sign along the local axis.
  const [tx,tz]=toWorld(box,axisX?0:offset,axisX?offset:0),angle=Math.atan2(tz-z,tx-x);
  // The corridor from the start to the face must be free of every other expected solid (so a stop is attributable to this box).
  for(const o of others){
    if(o.id===box.id)continue;
    for(let t=0;t<=1.0001;t+=.05){const px=x+(tx-x)*t,pz=z+(tz-z)*t;if(penetration(o,px,pz)>-.45)return null;}
  }
  const y=sim.world.heightAt(x,z);
  const path=drive(sim,{x,z,y,angle,ticks,sprint});
  return {start:{x,z,y},angle,path};
}
