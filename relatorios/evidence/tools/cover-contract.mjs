import fs from 'node:fs';
import {toCoverAdjustment} from '/workspace/COD-guerra/tests/helpers/m01-route.js';
const {sim}=toCoverAdjustment(),id=sim.flags['m01.suggested_cover'];
const r={method:'Separate simulation control route through existing toCoverAdjustment; no event/clock/actor assignment; not the browser playthrough.',head:'68301b779b856af46ed35a10fde42df9559d9ed4',clock:sim.clock,player:{x:sim.player.x,z:sim.player.z},occupied:sim.world.coverAt(sim.player)?.id,suggested:id,guide:sim.guideTarget(),visited:sim.timers.holdAccessVisited,fire:sim.threat.coverFire,status:sim.mission.status};
fs.writeFileSync('/workspace/COD-guerra/docs/verification/m01-quality-inspector/evidence/cover-contract.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));
