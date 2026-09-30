import { distance } from '../core/math.js';
import { AI_STATES } from './actors.js';

export class GrenadeSystem {
  constructor(){this.ammo=3;this.active=[];this.cooldownUntil=0;}
  throw(player,now){if(!this.ammo||now<this.cooldownUntil)return false;this.ammo--;this.cooldownUntil=now+900;this.active.push({x:player.x,y:player.y,height:58,vx:Math.cos(player.angle)*330,vy:Math.sin(player.angle)*330,vz:185,fuse:2.6,alive:true});return true;}
  update(dt,world,actors,player,onExplosion){for(const grenade of this.active){if(!grenade.alive)continue;grenade.fuse-=dt;grenade.vz-=360*dt;const nx=grenade.x+grenade.vx*dt,ny=grenade.y+grenade.vy*dt;if(world.canMove(nx,grenade.y,4))grenade.x=nx;else grenade.vx*=-.42;if(world.canMove(grenade.x,ny,4))grenade.y=ny;else grenade.vy*=-.42;grenade.height+=grenade.vz*dt;if(grenade.height<5){grenade.height=5;grenade.vz=Math.abs(grenade.vz)*.3;grenade.vx*=.72;grenade.vy*=.72;}for(const actor of actors)if(actor.alive&&distance(actor,grenade)<150){actor.state=AI_STATES.TAKE_COVER;actor.tacticTimer=0;actor.crouched=true;}if(grenade.fuse<=0)this.explode(grenade,actors,player,onExplosion);}
    this.active=this.active.filter(g=>g.alive);
  }
  explode(grenade,actors,player,onExplosion){grenade.alive=false;for(const actor of [...actors,player]){if(!actor.alive)continue;const d=distance(actor,grenade);if(d<190){const damage=Math.max(0,115*(1-d/190));actor.damage(damage);}}onExplosion(grenade);}
}
