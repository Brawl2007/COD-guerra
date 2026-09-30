import { CONFIG } from '../config.js';
import { distance } from '../core/math.js';

export const AI_STATES = Object.freeze(Object.fromEntries([
  'GUARD','ALERT','TAKE_COVER','MOVE_TO_COVER','PEEK','SUPPRESS','ADVANCE','FLANK',
  'RETREAT','RELOAD','HIT_REACTION','DOWN','INVESTIGATE',
].map(name => [name, name])));

export class Player {
  constructor(pos) {
    Object.assign(this, pos);
    this.id = 'player'; this.angle = 0; this.pitch = 0; this.weaponShotAt = -1e9;
    this.health = CONFIG.maxHealth; this.radius = CONFIG.playerRadius; this.alive = true;
    this.feetHeight = 0; this.aiming = false; this.moveBlend = 0; this.sprinting = false;
  }
  damage(amount) { this.health = Math.max(0, this.health-amount); this.alive = this.health>0; }
}

export class Soldier {
  constructor(pos, team = 'enemy', random = Math.random) {
    Object.assign(this, pos); this.random = random;
    this.team = team; this.health = team === 'enemy' ? 75 : 100; this.radius = 12;
    this.cooldown = random()*700; this.state = AI_STATES.GUARD; this.alive = true;
    this.flash = 0; this.shot = 0; this.facing = 0; this.cover = null; this.peek = null;
    this.tacticTimer = .4+random(); this.crouched = false; this.lastX = this.x; this.lastY = this.y;
    this.stuck = 0; this.rounds = 5; this.reloadTimer = 0; this.deathBlend = 0;
    this.lastSeen = null; this.memoryTime = 0; this.danger = null;
  }
  damage(amount) {
    this.health = Math.max(0, this.health-amount); this.flash = .24;
    this.state = AI_STATES.HIT_REACTION; this.tacticTimer = .25; this.crouched = true;
    if (this.health <= 0) { this.alive = false; this.state = AI_STATES.DOWN; this.shot = 0; }
  }
  moveTowards(dt, world, destination, speed) {
    const waypoint = world.nextStep(this, destination);
    if (!waypoint) { this.cover = null; this.peek = null; return false; }
    const angle = Math.atan2(waypoint.y-this.y, waypoint.x-this.x);
    const step = Math.min(distance(this, waypoint), dt*speed);
    this.facing = angle;
    world.move(this, Math.cos(angle)*step, Math.sin(angle)*step);
    return true;
  }
  update(dt, world, target, now, allies = []) {
    if (this.active === false) return null;
    if (!this.alive) { this.deathBlend = Math.min(1,this.deathBlend+dt*2.8); return null; }
    this.flash = Math.max(0,this.flash-dt); this.shot = Math.max(0,this.shot-dt);
    this.cooldown -= dt*1000; this.tacticTimer -= dt; this.memoryTime = Math.max(0,this.memoryTime-dt);
    if (this.reloadTimer > 0) {
      this.reloadTimer = Math.max(0,this.reloadTimer-dt); this.state = AI_STATES.RELOAD;
      if (this.reloadTimer === 0) this.rounds = 5;
      return null;
    }
    if (this.state === AI_STATES.HIT_REACTION && this.tacticTimer > 0) return null;
    const hostile = target && target.team !== this.team && target.id !== 'player-follow';
    const sees = hostile && target.alive !== false && distance(this,target)<650 && world.lineOfSight(this,target);
    if (sees) { this.lastSeen = { x:target.x, y:target.y }; this.memoryTime = 6; }
    const threat = sees ? target : this.memoryTime>0 ? this.lastSeen : null;
    const occupied = allies.filter(Boolean).map(other=>other.cover ?? other);
    if (this.danger) {
      this.danger.remaining -= dt;
      if (this.danger.remaining <= 0) this.danger = null;
      else {
        this.state = AI_STATES.RETREAT; this.crouched = false;
        const refuge = world.findCover(this,this.danger,occupied);
        if (refuge) this.moveTowards(dt,world,refuge,105);
        return null;
      }
    }
    if (threat && this.tacticTimer <= 0) {
      this.cover = this.role === 'flanker' ? world.findFlank(this,threat,occupied) : world.findCover(this,threat,occupied);
      this.peek = null; this.tacticTimer = 2.5+this.random()*3;
    }
    if (this.cover && distance(this,this.cover)>22) {
      this.state = this.role === 'flanker' ? AI_STATES.FLANK : this.team === 'ally' ? AI_STATES.ADVANCE : AI_STATES.MOVE_TO_COVER;
      this.crouched = false; this.moveTowards(dt,world,this.cover,this.team==='ally'?62:48);
    } else if (threat) {
      this.crouched = this.tacticTimer>2;
      if (!sees) {
        this.peek ??= world.findPeek(this,threat);
        if (this.peek && distance(this,this.peek)>4) {
          this.state = AI_STATES.PEEK; this.crouched = false;
          const angle = Math.atan2(this.peek.y-this.y,this.peek.x-this.x);
          world.move(this,Math.cos(angle)*dt*42,Math.sin(angle)*dt*42);
        } else this.state = AI_STATES.INVESTIGATE;
      } else {
        this.state = this.role==='support' ? AI_STATES.SUPPRESS : AI_STATES.PEEK;
        this.facing = Math.atan2(target.y-this.y,target.x-this.x);
        if (this.cooldown<=0 && world.lineOfSight(this,target)) {
          if (this.rounds<=0) { this.reloadTimer=1.5; this.state=AI_STATES.RELOAD; return null; }
          this.cooldown=700+this.random()*600; this.rounds--; this.shot=.09;
          return { shooter:this, target, damage:this.team==='enemy'?8:24,
            hitChance:Math.max(.12,.78-distance(this,target)/900), time:now };
        }
      }
    } else if (this.team==='ally' && allies[0]) {
      const follow=allies[0]; this.state=AI_STATES.ADVANCE; this.crouched=false;
      if (distance(this,follow)>140) this.moveTowards(dt,world,follow,55);
    } else { this.state=AI_STATES.GUARD; this.crouched=false; this.cover=null; }
    const moved=Math.hypot(this.x-this.lastX,this.y-this.lastY);
    this.stuck=moved<.05?this.stuck+dt:0;
    if(this.stuck>.8){this.cover=null;this.peek=null;this.tacticTimer=0;this.stuck=0;}
    this.lastX=this.x;this.lastY=this.y;
    return null;
  }
}
