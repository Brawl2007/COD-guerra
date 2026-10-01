import {writeFile,mkdir} from 'node:fs/promises';
import {route} from '../tests/helpers/m01-route.js';
import {clockText} from '../src/game/m01-simulation.js';
const {sim,checkpoints,events}=route();
const report={verification:'Automated simulation control route; not an uninterrupted browser playthrough',
  missionId:sim.missionId,activeSeconds:sim.clock,battleClock:clockText(sim.battleClock),health:sim.player.health,
  completed:sim.mission.complete,consumedEvents:Object.keys(sim.consumed),objectives:sim.objectives,flags:sim.flags,
  checkpoints:Object.entries(checkpoints).map(([id,s])=>({id,activeSeconds:s.clock,battleClock:clockText(s.battleClock),
    player:{x:s.player.x,y:s.player.y,z:s.player.z,health:s.player.health,carrying:s.player.carrying},
    consumedEvents:Object.keys(s.consumed),flags:s.flags,casualties:s.actors.filter(a=>!a.alive).map(a=>a.id)})),
  completionEvents:events.filter(e=>e.type==='complete').length,recoveries:sim.recoveries};
const dir=new URL('../docs/verification/m01-runtime/',import.meta.url);await mkdir(dir,{recursive:true});
await writeFile(new URL('simulation-report.json',dir),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({completed:report.completed,events:report.consumedEvents.length,checkpoints:report.checkpoints.length,
  activeSeconds:report.activeSeconds,health:report.health}));
