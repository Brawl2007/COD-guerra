// Writes fixed vegetation camera probes for tools/verification/m01-environment-capture.mjs.
// Genuine route snapshots with explicitly staged player/camera positions; not a human playtest.
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {driver,toRepair} from '../../tests/helpers/m01-route.js';
const out=resolve(process.argv[2]);
const repair=toRepair(driver()).sim.snapshot(false),world=new M01Simulation().world;
const probe=(name,snapshot,p,target)=>{
  const s=structuredClone(snapshot);p={...p,y:world.heightAt(p.x,p.z)};
  Object.assign(s.player,{...p,moveBlend:0,sprinting:false});
  const dx=target.x-p.x,dz=target.z-p.z;s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.atan2(target.y-p.y-1.6,Math.hypot(dx,dz));
  return {name,snapshot:s};
};
const fixtures=[
  probe('V1-rail-grove',repair,{x:-135,z:4},{x:-260,y:-1,z:-30}),
  probe('V2-north-meadow',repair,{x:-120,z:52},{x:-230,y:2,z:110}),
  probe('V3-station-edge',repair,{x:-300,z:8},{x:-420,y:2,z:-40}),
  probe('V4-river-margin',repair,{x:-14,z:62},{x:40,y:-6,z:110}),
  probe('V5-far-battlefield',repair,{x:-50,z:42},{x:-520,y:4,z:-150})
];
await writeFile(`${out}/camera-fixtures.json`,JSON.stringify(fixtures,null,2)+'\n');
console.log(fixtures.map(f=>`${f.name} ${f.snapshot.player.x},${f.snapshot.player.z}`).join('\n'));
