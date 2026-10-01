import { distance } from '../core/math.js';
import { UNITS_PER_METRE } from '../config.js';
import { toScene, traceObstruction } from '../world/spatial.js';
import { AI_STATES } from './actors.js';

export class GrenadeSystem {
  constructor(){this.ammo=3;this.active=[];this.cooldownUntil=0;this.nextId=0;}
  throw(player,now){
    if(!this.ammo||now<this.cooldownUntil)return false;
    this.ammo--;this.cooldownUntil=now+900;
    this.active.push({id:`grenade-${this.nextId++}`,x:player.x,y:player.y,height:52,
      vx:Math.cos(player.angle)*330,vy:Math.sin(player.angle)*330,
      vz:185+Math.sin(player.pitch||0)*170,fuse:2.6,alive:true});return true;
  }
  clearPath(world, grenade, target){
    const origin=toScene(grenade,grenade.height/UNITS_PER_METRE),end=toScene(target,.9);
    const range=Math.hypot(end.x-origin.x,end.y-origin.y,end.z-origin.z);
    if(range<.001)return true;
    const dir={x:(end.x-origin.x)/range,y:(end.y-origin.y)/range,z:(end.z-origin.z)/range};
    return !traceObstruction(world,origin,dir,Math.max(0,range-.02));
  }
  update(dt,world,actors,player,onExplosion){
    for(const g of this.active){
      if(!g.alive)continue;
      g.fuse-=dt;g.vz-=360*dt;
      const origin=toScene(g,g.height/UNITS_PER_METRE);
      const travel=Math.hypot(g.vx,g.vy)/UNITS_PER_METRE*dt;
      const horizontal=Math.hypot(g.vx,g.vy)||1;
      const obstacle=traceObstruction(world,origin,{x:g.vx/horizontal,y:0,z:g.vy/horizontal},travel+.125);
      if(obstacle){
        // Reflect along the face nearest the contact, preserving a visibly plausible bounce.
        const contactX=origin.x+g.vx/horizontal*obstacle.distance;
        const contactZ=origin.z+g.vy/horizontal*obstacle.distance;
        const xFace=Math.min(Math.abs(contactX-obstacle.min.x),Math.abs(contactX-obstacle.max.x));
        const zFace=Math.min(Math.abs(contactZ-obstacle.min.z),Math.abs(contactZ-obstacle.max.z));
        if(xFace<zFace)g.vx*=-.42;else g.vy*=-.42;
      }else{g.x+=g.vx*dt;g.y+=g.vy*dt;}
      g.height+=g.vz*dt;
      if(g.height<5){g.height=5;g.vz=Math.abs(g.vz)*.3;g.vx*=.72;g.vy*=.72;}
      for(const actor of actors)if(actor.alive&&actor.active!==false&&distance(actor,g)<150&&this.clearPath(world,g,actor)){
        actor.state=AI_STATES.TAKE_COVER;actor.tacticTimer=0;actor.crouched=true;
        actor.danger={x:g.x,y:g.y,remaining:Math.max(.1,g.fuse)};
      }
      if(g.fuse<=0)this.explode(g,actors,player,onExplosion,world);
    }
    this.active=this.active.filter(g=>g.alive);
  }
  explode(grenade,actors,player,onExplosion,world){
    grenade.alive=false;
    for(const actor of [...actors,player]){
      if(!actor.alive||actor.active===false)continue;
      const d=distance(actor,grenade);
      if(d<190&&(!world||this.clearPath(world,grenade,actor)))actor.damage(Math.max(0,115*(1-d/190)));
    }
    onExplosion(grenade);
  }
}
