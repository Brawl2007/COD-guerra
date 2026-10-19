import fs from 'node:fs';
import {M01Simulation} from '/workspace/COD-guerra/src/game/m01-simulation.js';
const results=[];
for(const [objective,entity,distances] of [['rescue_bak','jozef_bak',[3.5,2.9]],['fetch_material','sapper_crate',[5.5,4.9]]])for(const distance of distances){
 const sim=new M01Simulation();sim.scene=null;sim.activate(objective);
 const target=entity==='jozef_bak'?sim.actor(entity):sim.world.point('rail_hut');
 Object.assign(sim.player,{x:target.x+distance,y:target.y,z:target.z});
 const prompt=sim.interaction;sim.updateObjectives(0,true);
 results.push({objective,distance,prompt,carryingAfterE:sim.player.carrying??null});
}
fs.writeFileSync('/workspace/COD-guerra/docs/verification/m01-quality-inspector/evidence/interaction-probes.json',JSON.stringify({method:'Isolated simulation fixtures; objective activation and position assigned in disposable instances. Not browser gameplay, not part of the continuous route.',head:'68301b779b856af46ed35a10fde42df9559d9ed4',results},null,2));
console.log(JSON.stringify(results,null,2));
