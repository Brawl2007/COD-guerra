import {M01Simulation} from './src/game/m01-simulation.js';
import {route} from './tests/helpers/m01-route.js';
const t0=Date.now();
const flow=route();
console.log('route ms',Date.now()-t0);
// CP-D reload: how does enemyAlive evolve after the restore?
{
  const sim=new M01Simulation();sim.restoreSnapshot(flow.checkpoints.cp_m01_d_retirada);
  const c0=sim.clock;let last=sim.enemies.filter(a=>a.alive&&a.active).length;const rows=[{t:0,alive:last,m01:sim.enemies.filter(a=>a.alive).length}];
  console.log('cpd restore: enemyAlive field?',typeof sim.enemyAlive,sim.enemyAlive);
  for(let i=0;i<1200;i++){
    sim.tick(.05,{});
    const alive=sim.enemies.filter(a=>a.alive&&a.active).length;
    if(alive!==last){rows.push({t:+(sim.clock-c0).toFixed(2),alive});last=alive;}
  }
  console.log('cpd alive timeline',JSON.stringify(rows),'cp clock',c0.toFixed(1));
}
// withdrawal: first casualty among the east platoon
{
  const sim=new M01Simulation();sim.restoreSnapshot(flow.combatSnapshots.withdrawal);
  const c0=sim.clock;let rows=[];let last=sim.flags['m01.east_platoon_survivors'];
  console.log('withdrawal start n',last);
  for(let i=0;i<2400;i++){
    sim.tick(.05,{});
    const n=sim.flags['m01.east_platoon_survivors'];
    if(n!==last){rows.push({t:+(sim.clock-c0).toFixed(2),n});last=n;if(rows.length>=3)break;}
  }
  console.log('withdrawal timeline',JSON.stringify(rows));
}
