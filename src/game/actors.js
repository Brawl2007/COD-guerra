import { CONFIG } from '../config.js';
import { distance, normalizeAngle } from '../core/math.js';
export const AI_STATES=Object.freeze({GUARD:'GUARD',ALERT:'ALERT',TAKE_COVER:'TAKE_COVER',MOVE_TO_COVER:'MOVE_TO_COVER',PEEK:'PEEK',SUPPRESS:'SUPPRESS',ADVANCE:'ADVANCE',FLANK:'FLANK',RETREAT:'RETREAT',RELOAD:'RELOAD',HIT_REACTION:'HIT_REACTION',DOWN:'DOWN'});

export class Player {
  constructor(pos){Object.assign(this,pos);this.angle=0;this.pitch=0;this.weaponShotAt=-Infinity;this.health=CONFIG.maxHealth;this.radius=CONFIG.playerRadius;this.alive=true;}
  damage(amount){this.health=Math.max(0,this.health-amount);this.alive=this.health>0;}
}
export class Soldier {
  constructor(pos,team='enemy'){Object.assign(this,pos);this.team=team;this.health=team==='enemy'?75:100;this.radius=12;this.cooldown=Math.random()*700;this.state=AI_STATES.GUARD;this.alive=true;this.flash=0;this.shot=0;this.facing=0;this.cover=null;this.tacticTimer=.4+Math.random();this.crouched=false;this.lastX=this.x;this.lastY=this.y;this.stuck=0;this.rounds=5;this.reloadTimer=0;this.deathBlend=0;}
  damage(amount){this.health-=amount;this.flash=.24;this.state=AI_STATES.HIT_REACTION;this.tacticTimer=.25;this.crouched=true;if(this.health<=0){this.alive=false;this.state=AI_STATES.DOWN;}}
  update(dt,world,target,now,allies=[]) {
    if(this.active===false)return null;
    if(!this.alive){this.deathBlend=Math.min(1,this.deathBlend+dt*2.8);return null;}this.flash=Math.max(0,this.flash-dt);this.shot=Math.max(0,this.shot-dt);if(this.reloadTimer>0){this.reloadTimer-=dt;this.state=AI_STATES.RELOAD;if(this.reloadTimer<=0)this.rounds=5;return null;}
    const dist=distance(this,target), sees=dist<520&&world.lineOfSight(this,target);this.tacticTimer-=dt;
    if(this.state===AI_STATES.HIT_REACTION&&this.tacticTimer>0)return null;
    if((sees||this.cover||this.team==='ally')&&this.tacticTimer<=0){const occupied=allies.filter(Boolean),hold=this.role==='guard'&&this.cover;if(!hold)this.cover=this.role==='flanker'?world.findFlank(this,target,occupied):world.findCover(this,target,occupied);this.tacticTimer=(this.role==='support'?4:2.5)+Math.random()*3;this.crouched=this.role==='support'||Math.random()>.48;}
    if(this.cover&&distance(this,this.cover)>24){this.state=this.role==='flanker'?AI_STATES.FLANK:(this.team==='ally'?AI_STATES.ADVANCE:AI_STATES.MOVE_TO_COVER);const waypoint=world.nextStep(this,this.cover),a=Math.atan2(waypoint.y-this.y,waypoint.x-this.x);this.facing=a;const speed=this.team==='ally'?62:48;world.move(this,Math.cos(a)*dt*speed,Math.sin(a)*dt*speed);
      const moved=Math.hypot(this.x-this.lastX,this.y-this.lastY);this.stuck=moved<.05?this.stuck+dt:0;if(this.stuck>.8){this.cover=null;this.tacticTimer=0;this.stuck=0;}
    } else if(sees||(this.cover&&dist<520)){this.state=this.role==='support'?AI_STATES.SUPPRESS:AI_STATES.PEEK;this.facing=Math.atan2(target.y-this.y,target.x-this.x);this.cooldown-=dt*1000;
      if(this.cooldown<=0){if(this.rounds<=0){this.reloadTimer=1.5;this.state=AI_STATES.RELOAD;return null;}this.cooldown=this.team==='enemy'?850+Math.random()*500:700+Math.random()*350;this.rounds--;this.shot=.09;const exposure=sees?1:.62;return {shooter:this,target,damage:this.team==='enemy'?8:24,hitChance:Math.max(.12,(.78-dist/900)*exposure),time:now};}
    } else if(this.team==='ally'){const follow=allies[0]??target;if(distance(this,follow)>150){const waypoint=world.nextStep(this,follow),a=Math.atan2(waypoint.y-this.y,waypoint.x-this.x);this.facing=a;world.move(this,Math.cos(a)*dt*55,Math.sin(a)*dt*55);}this.state=AI_STATES.ADVANCE;}
    else {this.state=AI_STATES.GUARD;this.crouched=true;}
    this.lastX=this.x;this.lastY=this.y;
    return null;
  }
}
