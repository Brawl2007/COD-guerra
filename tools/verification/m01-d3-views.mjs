// Focused browser fixture reached only by the simulation's normal controls.
// Continue loads this alive position beside the river; actual browser W causes the water failure.
import {M01Simulation,validateM01Snapshot} from '../../src/game/m01-simulation.js';
import {driver,toRepair} from '../../tests/helpers/m01-route.js';
export function repairWaterView(){
 class Soldado extends M01Simulation{constructor(seed){super(seed,{difficulty:'soldado'});}}
 const d=toRepair(driver(19390901,{Simulation:Soldado}));
 for(const [x,z]of [[-115,27],[-115,32],[-30,40],[-30,56],[-8,56]])d.walk(x,z);
 const angle=d.sim.player.angle;d.step({lookX:Math.atan2(Math.sin(-angle),Math.cos(-angle))/.0022});
 const snapshot=d.sim.snapshot();validateM01Snapshot(snapshot);
 if(!snapshot.player.alive||snapshot.checkpointsReached.at(-1)!=='cp_m01_b2_reparo')throw Error('D3 water view did not retain a live CP-B2 route');
 return snapshot;
}
export function repairDeliveryView(){
 class Soldado extends M01Simulation{constructor(seed){super(seed,{difficulty:'soldado'});}}
 let before=null;
 toRepair(driver(19390901,{Simulation:Soldado,onStep:({sim})=>{
  const p=sim.player,site=sim.world.point('repair_site_2');
  if(p.carrying==='sapper_crate'&&Math.hypot(p.x-site.x,p.z-site.z)<6)before=sim.snapshot();
 }}));
 if(!before||before.checkpointsReached.includes('cp_m01_b2_reparo'))throw Error('D3 delivery view must precede the actual material delivery');
 validateM01Snapshot(before);return before;
}
