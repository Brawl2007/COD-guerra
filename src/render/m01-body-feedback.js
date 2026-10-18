// Presentation of the player's own body: the camera dip of a landing and the easing of a stair. Pure functions of the mission clock and the
// simulation's player (feet height, `fall`); nothing here decides health, damage or the landing itself (those are the simulation's `player-landing`).
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const lerp=(a,b,t)=>a+(b-a)*t;

export const BODY_FEEDBACK_CAPS=Object.freeze({dip:.34,tilt:.12,stairs:.5,stairTau:.11});
const QUALITY=Object.freeze({low:.6,medium:1,high:1.1});
const PROFILE=Object.freeze({attack:.055,minDuration:.42,maxDuration:.9});

export class M01BodyFeedback {
  constructor(){this.reset();}
  reset(){this.landings=[];this.lastY=null;this.lastX=null;this.lastZ=null;this.lastClock=null;this.stairOffset=0;this.count=0;this.lastSpeed=null;this.lastDip=0;}
  /** A landing at `speed` m/s: nothing below a short hop, a 0.34 m dip from a lethal height; a splash in water is softer. */
  landing(clock,speed,surface='ground'){
    if(!Number.isFinite(clock)||!Number.isFinite(speed)||speed<2.5)return false;
    const hard=clamp((speed-2.5)/10.5),depth=lerp(.035,BODY_FEEDBACK_CAPS.dip,hard**.85)*(surface==='water'?.6:1);
    this.landings.push({clock,depth,duration:lerp(PROFILE.minDuration,PROFILE.maxDuration,hard)});this.lastSpeed=speed;
    if(this.landings.length>6)this.landings.shift();this.count++;return true;
  }
  /** Read-only: how many landings were presented, the last one's speed and the dip and stair offsets of the last sample (for the browser specs). */
  diagnostics(){return {landings:this.count,lastSpeed:this.lastSpeed??null,lastDip:this.lastDip??0,lastStairs:this.stairOffset};}
  /** Camera offsets at `clock`: dy (metres, negative = lower), tilt (metres of gaze lowered 1 m ahead). */
  sample(clock,player,quality='medium'){
    const q=QUALITY[quality]??1,dt=this.lastClock===null?0:clock-this.lastClock;
    // A restore, a pause or a long gap carries nothing over.
    if(this.lastClock!==null&&(dt<0||dt>.5)){this.stairOffset=0;this.lastY=null;}
    if(this.lastY!==null&&!player.fall){
      // Only the part of a height change that a slope of 45 degrees cannot explain is a step: walking up a steep bank is continuous and must not make the eye lag.
      const dy=player.y-this.lastY,run=this.lastX===null?0:Math.hypot(player.x-this.lastX,player.z-this.lastZ),step=dy-Math.sign(dy)*Math.min(Math.abs(dy),run+.02);
      if(Math.abs(step)>.02&&Math.abs(dy)<=.9)this.stairOffset=clamp(this.stairOffset-step,-BODY_FEEDBACK_CAPS.stairs,BODY_FEEDBACK_CAPS.stairs);
    }
    this.lastY=player.y;this.lastX=player.x??null;this.lastZ=player.z??null;this.lastClock=clock;
    if(dt>0)this.stairOffset*=Math.exp(-Math.min(dt,.5)/BODY_FEEDBACK_CAPS.stairTau);
    if(Math.abs(this.stairOffset)<1e-4)this.stairOffset=0;
    let dip=0;const alive=[];
    for(const e of this.landings){
      const age=clock-e.clock;
      if(age>=e.duration)continue;alive.push(e);if(age<0)continue;
      const u=age<PROFILE.attack?Math.sin(age/PROFILE.attack*Math.PI/2):(1-(age-PROFILE.attack)/(e.duration-PROFILE.attack))**2;
      dip+=e.depth*u;
    }
    this.landings=alive;
    dip=Math.min(BODY_FEEDBACK_CAPS.dip,dip*q);
    this.lastDip=dip;
    return {dy:this.stairOffset*q-dip,tilt:Math.min(BODY_FEEDBACK_CAPS.tilt,dip*.35),dip,stairs:this.stairOffset};
  }
}
