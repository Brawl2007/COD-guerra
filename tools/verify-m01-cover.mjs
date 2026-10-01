import {mkdir,writeFile} from 'node:fs/promises';
import {route} from '../tests/helpers/m01-route.js';
import {clockText} from '../src/game/m01-simulation.js';

const seed=19390901,runs=[];
for(const support of [false,true]){
  const {sim,events,combatSnapshots,checkpoints}=route(seed,{support});
  const shots=events.filter(e=>e.type==='incoming-shot');
  runs.push({support,seed,completed:sim.mission.complete,battleClock:clockText(sim.battleClock),activeSeconds:sim.clock,
    repairSeconds:sim.consumed.evt_m01_repair_complete-combatSnapshots.repair.clock,
    repairIncomingShots:shots.filter(e=>e.targetId==='pawel_krawiec').length,
    withdrawalIncomingShots:shots.filter(e=>e.targetId.startsWith('pl_east_')).length,
    survivors:sim.flags['m01.east_platoon_survivors'],playerHealth:sim.player.health,playerShots:sim.weapon.shotCount,
    roundsRemaining:sim.weapon.mag+sim.weapon.reserve,consumedEvents:Object.keys(sim.consumed).length,
    completedRequired:sim.definition.objectives.filter(o=>o.required&&sim.objectives[o.id].state==='done').length,
    checkpoints:Object.keys(checkpoints),platoonCasualties:sim.allies.filter(a=>a.group==='grp_east_platoon'&&!a.alive).map(a=>a.id),
    enemyCasualties:sim.enemies.filter(a=>!a.alive).map(a=>a.id)});
}
const report={verification:'Two full simulation routes using movement, aim deltas, bolt, reload and shots; not a browser or human playtest',
  limitations:'One fixed seed, precise automated aim, prototype pressure/accuracy. Shot trails illustrate an already resolved ray; they do not implement ballistic flight or measured tracer ammunition.',
  runs};
const dir=new URL('../docs/verification/m01-runtime/cover-combat/',import.meta.url);await mkdir(dir,{recursive:true});
await writeFile(new URL('report.json',dir),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(runs));
