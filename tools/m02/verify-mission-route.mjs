import {M02BenchSimulation} from '../../src/game/m02-01-simulation.js';
import {performM02PlayerAction} from '../../src/game/m02-player-actions.js';
import {M02MissionPilot} from './mission-pilot.mjs';
const sim=new M02BenchSimulation(19390909,{startScene:'C01'}),pilot=new M02MissionPilot();
let last='',lastAlive=-1;
for(let tick=0;tick<24000;tick++){
 const active=sim.enemies.filter(e=>e.alive&&!e.nonCombatant).length;
 const status=`${sim.activeCellId}:${sim.objective.id}:${active}`;
 if(status!==last){console.log(JSON.stringify({tick,clock:+sim.clock.toFixed(2),status,health:sim.player.health,ammo:sim.weapon.mag+sim.weapon.reserve,pos:[sim.player.x,sim.player.z]}));last=status;}
 if(sim.player.health<=0){console.log('PLAYER DEAD');process.exitCode=1;break;}
 if(sim.areaC.c12Completed){console.log('COMPLETE',JSON.stringify(sim.exportCampaignResultToM03()));break;}
 const decision=pilot.decide(sim);
 if(decision.controls.interact&&performM02PlayerAction(sim))decision.controls.interact=false;
 sim.tick(.05,decision.controls);sim.drainEvents();
 if(![sim.player.x,sim.player.y,sim.player.z].every(Number.isFinite)){throw Error('Non-finite player position '+JSON.stringify(decision));}
 if(tick%2000===1999)console.log('PROGRESS',JSON.stringify({clock:sim.clock,health:sim.player.health,position:[sim.player.x,sim.player.z],decision}));
 if(tick===23999){console.log('INCOMPLETE',JSON.stringify({objective:sim.objective,enemies:sim.enemies.filter(e=>e.alive&&!e.nonCombatant),position:sim.player,decision}));process.exitCode=1;}
}
