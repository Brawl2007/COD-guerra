// A genuine M01 save after sunrise (04:56:34 battle time), weapon ready: the route through the real simulation, controls
// only. Usage: node sunrise-save.mjs <repoRoot> <out.json> (then first-shot-programs.mjs ... m01 medium <out.json>).
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const [root,out]=process.argv.slice(2);
const {driver}=await import(pathToFileURL(`${root}/tests/helpers/m01-route.js`).href);
const {seconds}=await import(pathToFileURL(`${root}/src/game/m01-simulation.js`).href);
const d=driver(19390901);d.step({skip:true});
d.until(()=>d.sim.battleClock>=seconds('04:58')&&!d.sim.scene&&d.sim.weapon.state==='READY'&&d.sim.weapon.mag>0,900);
const s=d.sim.snapshot();mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(s));
console.log(JSON.stringify({battleClock:d.sim.battleClock,clock:d.sim.clock,mag:d.sim.weapon.mag,state:d.sim.weapon.state,phase:d.sim.mission.phase,text:d.sim.mission.text,player:{x:+d.sim.player.x.toFixed(1),z:+d.sim.player.z.toFixed(1)},bytes:JSON.stringify(s).length}));
