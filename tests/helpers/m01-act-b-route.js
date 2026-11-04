// R4 INC-2: scripted pilots for Act VII-b «Norte, durante o dia» (the counterpart of tests/helpers/m01-act-route.js, which is an input of the VII-a golden and is not touched). Deterministic: the controls are a pure
// function of the simulation state; 50 ms ticks. Two pilots, as in VII-a:
//   passive: skips the card, goes to the nearest ammunition crate when the reserve is short and presses E, walks to the west post, kneels behind the parapet and never fires;
//   active:  the same walk, then stands and fires at the nearest German he sees (aimed, at a measured cadence), reloads, kneels when hit, pinned or under the barrage.
// Both kneel under a barrage (the shells never hurt the player, but a crouched man behind the parapet is stunned less: the test of the barrage checks that too).
import {eyePosition} from '../../src/world/spatial.js';
import {aimPoint} from '../../src/game/m01-aim.js';

export const ACT_B_TICK=.05;
const LOOK=.0022;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

/** The ammunition crate nearest to the player (the props of the area). */
export function nearestCrate(sim){
  const p=sim.player;let best=null,bd=Infinity;
  for(const o of sim.world.areaProps)if(o.type==='ammo_crate_wood'){const d=Math.hypot(o.x-p.x,o.z-p.z);if(d<bd){bd=d;best=o;}}
  return best;
}

export function actBControls(sim,mode,state){
  const p=sim.player,c={lookX:0,lookY:0,forward:0,side:0,sprint:false,aim:false,fire:false,reload:false,grenade:false,interact:false,skip:false,crouch:false,sight:false};
  if(sim.scene){c.skip=sim.scene.elapsed>1;return c;}
  const R=sim.plan.act.resupply,west=sim.plan.points.west_post;
  const turn=(angle,pitch=0)=>{c.lookX=wrap(angle-p.angle)/LOOK;c.lookY=-(pitch-p.pitch)/LOOK;};
  const walkTo=(x,z,close)=>{const d=Math.hypot(x-p.x,z-p.z);turn(Math.atan2(z-p.z,x-p.x));c.forward=1;c.sprint=d>8;if(p.crouched)c.crouch=true;return d<=close;};
  // 1. the ammunition and the west post: the objective is done when he stands at the post with the reserve full (after a death the act is back at CP-I with the objective open: he does it again)
  if(sim.active(sim.profile.arrivalObjective))state.arrived=false;
  if(!state.arrived){
    const d=Math.hypot(west.x-p.x,west.z-p.z);
    if(sim.weapon.reserve<R.reserveTo){
      const crate=nearestCrate(sim);
      if(crate&&!walkTo(crate.x,crate.z,R.reachM-.4))return c;
      c.forward=0;c.sprint=false;c.interact=true;return c;
    }
    if(d>.6){walkTo(west.x,west.z,.6);return c;}
    state.arrived=true;
  }
  // The barrage the pilot has just walked into, or the post he has walked back to: he is at the west post (within 4 m) or goes back to it
  const d=Math.hypot(west.x-p.x,west.z-p.z);
  if(d>4){walkTo(west.x,west.z,.6);return c;}
  const barrage=Boolean(sim.timers.barrage?.run);
  if(mode==='passive'||barrage){turn(-Math.PI/2);if(!p.crouched)c.crouch=true;return c;}
  // active: pick the nearest visible German, stand, aim, fire when the bolt is ready (a human-paced rifleman: 0.8 s on a target, one shot every 2.5 s)
  const seen=sim.enemies.filter(a=>a.alive&&a.active&&sim.world.lineOfSight({...p,crouched:false},a)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  const hurt=p.health<state.lastHealth;state.lastHealth=p.health;if(hurt)state.downUntil=sim.clock+3;
  const wantDown=sim.clock<(state.downUntil??-1)||!seen.length;
  if(wantDown!==Boolean(p.crouched))c.crouch=true;
  if(sim.weapon.mag===0&&sim.weapon.reserve>0&&sim.weapon.state==='READY'){c.reload=true;return c;}
  if(!seen.length||p.crouched){turn(-Math.PI/2);return c;}
  const t=seen.find(a=>a.id===state.target)??seen[0];if(t.id!==state.target){state.target=t.id;state.since=sim.clock;}
  const eye=eyePosition(p),aim=aimPoint(t),h=Math.hypot(aim.x-eye.x,aim.z-eye.z);
  turn(Math.atan2(aim.z-eye.z,aim.x-eye.x),Math.atan2(aim.y-eye.y,h));c.aim=true;
  const settled=Math.abs(wrap(Math.atan2(aim.z-eye.z,aim.x-eye.x)-p.angle))<.004&&sim.clock-state.since>=.8;
  if(settled&&sim.weapon.state==='READY'&&sim.clock-(state.lastShot??-9)>2.5){c.fire=true;state.lastShot=sim.clock;}
  return c;
}

/** Drives `sim` until complete or `maxSec`; `onStep({sim,tick})` after every tick, `onEvent(event)` for every drained event. Returns {ticks, complete, clock, deaths}. */
export function actBRoute(sim,{mode='passive',maxSec=900,onStep=null,onEvent=null}={}){
  const state={arrived:false,lastHealth:sim.player.health};let ticks=0,deaths=0;
  while(!sim.mission.complete&&sim.clock<maxSec){
    sim.tick(ACT_B_TICK,actBControls(sim,mode,state));ticks++;
    for(const e of sim.drainEvents()){if(e.type==='player-down')deaths++;onEvent?.(e);}
    onStep?.({sim,tick:ticks});
  }
  return {ticks,complete:sim.mission.complete,clock:sim.clock,deaths};
}
