import {mkdir,writeFile} from 'node:fs/promises';
import {route} from '../tests/helpers/m01-route.js';
import {clockText} from '../src/game/m01-simulation.js';

const seed=19390901,runs=[];
for(const support of [false,true]){
  const {sim,events,combatSnapshots,checkpoints}=route(seed,{support});
  // Tiros alemães que chegaram a menos de 3 m (round-impact.pinned) e baixas por tiro real (victim).
  const rounds=events.filter(e=>e.type==='round-impact'),near=prefix=>rounds.filter(e=>e.pinned.some(id=>id.startsWith(prefix))).length;
  runs.push({support,seed,completed:sim.mission.complete,battleClock:clockText(sim.battleClock),activeSeconds:sim.clock,
    repairSeconds:sim.consumed.evt_m01_repair_complete-combatSnapshots.repair.clock,
    repairNearRounds:near('pawel_krawiec'),repairPins:sim.timers.repairPins,
    withdrawalNearRounds:near('pl_east_'),lethalRounds:rounds.filter(e=>e.victim).map(e=>e.victim),
    survivors:sim.flags['m01.east_platoon_survivors'],playerHealth:sim.player.health,playerShots:sim.weapon.shotCount,
    roundsRemaining:sim.weapon.mag+sim.weapon.reserve,consumedEvents:Object.keys(sim.consumed).length,
    completedRequired:sim.definition.objectives.filter(o=>o.required&&sim.objectives[o.id].state==='done').length,
    checkpoints:Object.keys(checkpoints),platoonCasualties:sim.allies.filter(a=>a.group==='grp_east_platoon'&&a.active&&!a.alive).map(a=>a.id),
    reserveSlots:sim.allies.filter(a=>a.group==='grp_east_platoon'&&!a.active).length,
    enemyCasualties:sim.enemies.filter(a=>!a.alive).map(a=>a.id)});
}
const report={verification:'Two full simulation routes using movement, aim deltas, bolt, reload and shots; not a browser or human playtest',
  limitations:'One fixed seed, precise automated aim. German rounds are data in flight with a game-approximation arc (6e-6 R^2, ~620 m/s), not measured ballistics; the player wz.29 keeps the straight-ray fallback. Multi-seed comparison: tools/m01-cover-comparison.mjs.',
  runs};
const dir=new URL('../docs/verification/m01-runtime/cover-combat/',import.meta.url);await mkdir(dir,{recursive:true});
await writeFile(new URL('report.json',dir),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(runs));
