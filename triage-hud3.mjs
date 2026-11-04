import {M01Simulation} from './src/game/m01-simulation.js';
import {newBarkState} from './src/game/m01-barks.js';
import {route} from './tests/helpers/m01-route.js';
const t0=Date.now();
const sim=new M01Simulation();
sim.restoreSnapshot(route(19390901).combatSnapshots.eastDemolitionOutside);sim.drainEvents();
console.log('route ms',Date.now()-t0);
sim.timers.barks=newBarkState();sim.subtitle=null;sim.dialogueQueue=[];
let save;
for(let i=0;i<400;i++){
  const crew=sim.actor('ckm_reserve'),x=crew.x+6;
  Object.assign(sim.player,{x,z:crew.z,y:sim.world.heightAt(x,crew.z)});
  const before=sim.snapshot();sim.tick(.05,{});
  if(sim.dialogueConsumed.includes('dlg_m01_118#1')){save=before;break;}
}
const sim2=new M01Simulation();sim2.restoreSnapshot(save);
const c0=sim2.clock;let seen=[];
for(let i=0;i<4000;i++){
  sim2.tick(.05,{});
  const t=sim2.subtitle?.text??JSON.stringify(sim2.subtitle);
  if(sim2.subtitle&&seen.at(-1)?.t!==t)seen.push({t,at:+(sim2.clock-c0).toFixed(2)});
  if(String(t).includes('De lá também atira'))break;
}
console.log(JSON.stringify(seen));
