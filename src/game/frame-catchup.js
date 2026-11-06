// Frame catch-up policy of the real-time loop (presentation/frame loop only; the simulation tick and its fixed 0.05 s step are untouched).
// A slow rendered frame is caught up with bounded simulation steps. Without a cap a single hitch (shader compile, GC, tab switch) makes the
// next frame simulate up to 0.25 s, which costs more than the hitch itself and snowballs. The excess real time is dropped, not carried over.
export const SIM_STEP=.05;
export const M01_MAX_CATCHUP_STEPS=5;
/** Simulation seconds to run for a rendered frame of `dt` real seconds: the whole frame up to 5 steps (250 ms) for M01, one step otherwise. */
export const frameSimBudget=(dt,m01)=>Math.max(0,Math.min(dt,m01?SIM_STEP*M01_MAX_CATCHUP_STEPS:SIM_STEP));
/** Number of fixed steps that budget is split into (diagnostics/tests). Mirrors the loop in game.js: step=min(SIM_STEP,remaining) while remaining>1e-7. */
export function frameSimSteps(budget){let n=0,remaining=budget;while(remaining>1e-7){remaining-=Math.min(SIM_STEP,remaining);n++;}return n;}
/** Plays every queued sound that has come due (`at <= clock`) and compacts the rest in place, order kept: no filter() arrays per frame.
 *  `play` must not push to or replace `queue`. Returns the number of sounds still pending. */
export function playDueSounds(queue,clock,play){
  let keep=0;
  for(let i=0;i<queue.length;i++){const sound=queue[i];if(sound.at<=clock)play(sound);else queue[keep++]=sound;}
  queue.length=keep;return keep;
}
