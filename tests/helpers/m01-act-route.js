// R4 INC-1: scripted pilots for an area act (Act VII-a), the counterpart of tests/helpers/m01-route.js for M01Simulation. Deterministic: the controls are a pure
// function of the simulation state; 50 ms ticks. Two pilots:
//   passive: skips the card, walks to the trench post, kneels behind the parapet and never fires (the line, Kowal and the ckm must repel the wave alone);
//   active:  the same walk, then stands and fires at the nearest German he sees (aimed, at a measured cadence), reloads, kneels when hit or pinned.
import {eyePosition} from '../../src/world/spatial.js';
import {aimPoint} from '../../src/game/m01-aim.js';

export const ACT_TICK=.05;
const LOOK=.0022;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

export function actControls(sim,mode,state){
  const p=sim.player,c={lookX:0,lookY:0,forward:0,side:0,sprint:false,aim:false,fire:false,reload:false,grenade:false,interact:false,skip:false,crouch:false,sight:false};
  if(sim.scene){c.skip=sim.scene.elapsed>1;return c;}
  const post=sim.plan.layout.points.trench_post,d=Math.hypot(post.x-p.x,post.z-p.z);
  const turn=(angle,pitch=0)=>{c.lookX=wrap(angle-p.angle)/LOOK;c.lookY=-(pitch-p.pitch)/LOOK;};
  if(d>.6&&(!state.arrived||d>4)){state.arrived=false;
    turn(Math.atan2(post.z-p.z,post.x-p.x));c.forward=1;c.sprint=d>8;
    if(p.crouched)c.crouch=true;return c;
  }
  state.arrived=true;
  if(mode==='passive'){turn(-Math.PI/2);if(!p.crouched)c.crouch=true;return c;}
  // active: pick the nearest visible German, stand, aim, fire when the bolt is ready.
  const seen=sim.enemies.filter(a=>a.alive&&a.active&&sim.world.lineOfSight({...p,crouched:false},a)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  const hurt=p.health<state.lastHealth;state.lastHealth=p.health;if(hurt)state.downUntil=sim.clock+3;
  const wantDown=sim.clock<(state.downUntil??-1)||!seen.length;
  if(wantDown!==Boolean(p.crouched))c.crouch=true;
  if(sim.weapon.mag===0&&sim.weapon.reserve>0&&sim.weapon.state==='READY'){c.reload=true;return c;}
  if(sim.weapon.reserve<10&&sim.interaction.startsWith('E ·'))c.interact=true;
  if(!seen.length||p.crouched){turn(-Math.PI/2);return c;}
  // A human-paced rifleman, not an aimbot: he keeps one target, needs 0.8 s on it before a shot and fires at most once every 2.5 s.
  const t=seen.find(a=>a.id===state.target)??seen[0];if(t.id!==state.target){state.target=t.id;state.since=sim.clock;}
  const eye=eyePosition(p),aim=aimPoint(t),h=Math.hypot(aim.x-eye.x,aim.z-eye.z);
  turn(Math.atan2(aim.z-eye.z,aim.x-eye.x),Math.atan2(aim.y-eye.y,h));c.aim=true;
  const settled=Math.abs(wrap(Math.atan2(aim.z-eye.z,aim.x-eye.x)-p.angle))<.004&&sim.clock-state.since>=.8;
  if(settled&&sim.weapon.state==='READY'&&sim.clock-(state.lastShot??-9)>2.5){c.fire=true;state.lastShot=sim.clock;}
  return c;
}

/** Drives `sim` until complete or `maxSec`; `onStep({sim,tick})` after every tick. Returns {ticks, complete, clock, deaths}. */
export function actRoute(sim,{mode='passive',maxSec=600,onStep=null}={}){
  const state={arrived:false,lastHealth:sim.player.health};let ticks=0,deaths=0;
  while(!sim.mission.complete&&sim.clock<maxSec){
    const c=actControls(sim,mode,state);
    sim.tick(ACT_TICK,c);ticks++;
    for(const e of sim.drainEvents())if(e.type==='player-down')deaths++;
    onStep?.({sim,tick:ticks});
  }
  return {ticks,complete:sim.mission.complete,clock:sim.clock,deaths};
}
