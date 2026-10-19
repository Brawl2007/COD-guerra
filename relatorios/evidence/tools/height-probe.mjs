import fs from 'node:fs';
import {driver} from '/workspace/COD-guerra/tests/helpers/m01-route.js';
let previous,steps=0,drops=[];
const d=driver(undefined,{onStep:({sim,dt})=>{const p=sim.player;if(previous&&p.y-previous.y<-.5)drops.push({step:steps,dt,from:previous,to:{x:p.x,y:p.y,z:p.z},deltaY:p.y-previous.y});previous={x:p.x,y:p.y,z:p.z};steps++;}});
let end='controlled shoreline route completed';
try{d.step({skip:true});d.walk(-66,26);d.walk(-15,26);d.walk(10,30);d.walk(45,30);}catch(e){end=e.message;}
const report={head:'68301b779b856af46ed35a10fde42df9559d9ed4',method:'Separate disposable simulation control route from new mission; Space-equivalent skip and walk controls via existing driver. No player/event/clock assignment. Not browser footage or a human physics test.',steps,drops,end};
fs.writeFileSync('/workspace/COD-guerra/docs/verification/m01-quality-inspector/evidence/height-probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify({drops,end}));
