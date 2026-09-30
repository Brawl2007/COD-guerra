import { CONFIG } from '../config.js';
import { distance, normalizeAngle } from '../core/math.js';

export class Player {
  constructor(pos){Object.assign(this,pos);this.angle=0;this.health=CONFIG.maxHealth;this.radius=CONFIG.playerRadius;this.alive=true;}
  damage(amount){this.health=Math.max(0,this.health-amount);this.alive=this.health>0;}
}
export class Soldier {
  constructor(pos,team='enemy'){Object.assign(this,pos);this.team=team;this.health=team==='enemy'?75:100;this.radius=12;this.cooldown=Math.random()*700;this.state='guard';this.alive=true;this.flash=0;}
  damage(amount){this.health-=amount;this.flash=.12;if(this.health<=0){this.alive=false;this.state='down';}}
  update(dt,world,target,now,allies=[]) {
    if(!this.alive)return null; this.flash=Math.max(0,this.flash-dt);
    const dist=distance(this,target), sees=dist<520&&world.lineOfSight(this,target);
    if(sees){this.state='engage';this.cooldown-=dt*1000;
      if(dist>190){const waypoint=world.nextStep(this,target),a=Math.atan2(waypoint.y-this.y,waypoint.x-this.x);world.move(this,Math.cos(a)*dt*38,Math.sin(a)*dt*38);}
      if(this.cooldown<=0){this.cooldown=this.team==='enemy'?850+Math.random()*500:700+Math.random()*350;return {shooter:this,target,damage:this.team==='enemy'?8:24,hitChance:Math.max(.18,.78-dist/900),time:now};}
    } else if(this.team==='ally'){const follow=allies[0]??target;if(distance(this,follow)>115){const waypoint=world.nextStep(this,follow),a=Math.atan2(waypoint.y-this.y,waypoint.x-this.x);world.move(this,Math.cos(a)*dt*55,Math.sin(a)*dt*55);}this.state='advance';}
    return null;
  }
}
