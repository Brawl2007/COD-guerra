// R4 INC-3: scripted pilots for Act VII-c «Ordem ~17:00 e retirada» (the counterpart of tests/helpers/m01-act-b-route.js). Deterministic: the controls are a pure function of the simulation state; 50 ms ticks.
// There is nobody to fight in this act, so the two pilots differ in what they do with their time, not with their rifle:
//   prompt:  skips both cards, walks to the parapet (the first objective's marker), kneels there facing north while the line leaves, and when the line is out walks to the exit band and waits in it;
//   laggard: skips both cards, stays where he arrives (the spawn, 80 m from the parapet) until the rear guard has been on its way for 70 s, then walks (never sprints) to the exit band: the rear guard is out long
//            before him, and the act waits for him.
// Neither presses E, fires or throws anything. The men of the act move whatever the player does: nothing in the withdrawal reads the player but the end and the call to a man who lags.
export const ACT_C_TICK=.05;
const LOOK=.0022;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

export function actCControls(sim,mode,state){
  const p=sim.player,c={lookX:0,lookY:0,forward:0,side:0,sprint:false,aim:false,fire:false,reload:false,grenade:false,interact:false,skip:false,crouch:false,sight:false};
  if(sim.scene){c.skip=sim.scene.elapsed>1;return c;}
  const R=sim.timers.withdrawal,post=sim.plan.points.trench_post,exit=sim.plan.points.exit_centre;
  const turn=(angle,pitch=0)=>{c.lookX=wrap(angle-p.angle)/LOOK;c.lookY=-(pitch-p.pitch)/LOOK;};
  const walkTo=(x,z,close,sprint)=>{const d=Math.hypot(x-p.x,z-p.z);turn(Math.atan2(z-p.z,x-p.x));if(d<=close)return true;c.forward=1;c.sprint=sprint&&d>8;if(p.crouched)c.crouch=true;return false;};
  const toExit=sprint=>{if(walkTo(exit.x,exit.z,1.5,sprint)){turn(Math.PI);}};
  if(mode==='prompt'){
    if(R.lineOutAt===null){   // the parapet, and down behind it, looking north, while the line leaves
      if(walkTo(post.x,post.z,1.2,true)){turn(-Math.PI/2);if(!p.crouched)c.crouch=true;}
      return c;
    }
    toExit(true);return c;
  }
  // laggard
  if(R.rearGoAt===null||sim.clock<R.rearGoAt+70){turn(-Math.PI/2);return c;}
  toExit(false);return c;
}

/** Drives `sim` until complete or `maxSec`; `onStep({sim,tick})` after every tick, `onEvent(event)` for every drained event. Returns {ticks, complete, clock, deaths}. */
export function actCRoute(sim,{mode='prompt',maxSec=900,onStep=null,onEvent=null}={}){
  const state={};let ticks=0,deaths=0;
  while(!sim.mission.complete&&sim.clock<maxSec){
    sim.tick(ACT_C_TICK,actCControls(sim,mode,state));ticks++;
    for(const e of sim.drainEvents()){if(e.type==='player-down')deaths++;onEvent?.(e);}
    onStep?.({sim,tick:ticks});
  }
  return {ticks,complete:sim.mission.complete,clock:sim.clock,deaths};
}
