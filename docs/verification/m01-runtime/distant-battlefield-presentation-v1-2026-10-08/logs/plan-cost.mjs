// Relative JS cost of planDistantBattlefield per call (Node, not FPS). Usage, from the repository root:
//   node docs/verification/m01-runtime/distant-battlefield-presentation-v1-2026-10-08/logs/plan-cost.mjs [label=module.mjs ...]
// Collects (clock, consumed) at every tick of the genuine route, then times each plan module over all of them,
// three repetitions after one warm-up pass. With no argument it times the current plan. A first-version module
// can be compared by extracting it next to its own m01-atmosphere.js, e.g. with `git show <commit>:<path>`.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {route} from '../../../../../tests/helpers/m01-route.js';

const modules=process.argv.slice(2).map(a=>{const i=a.indexOf('=');return [a.slice(0,i),resolve(a.slice(i+1))];});
if(!modules.length)modules.push(['HEAD',resolve('src/render/m01-distant-battlefield-plan.js')]);
const ticks=[];
route(19390901,{onStep:({sim})=>ticks.push([sim.clock,{...sim.consumed}])});
console.log(JSON.stringify({ticks:ticks.length,lastClock:+ticks.at(-1)[0].toFixed(2)}));
for(const [label,file]of modules){
  const {planDistantBattlefield}=await import(pathToFileURL(file).href);
  for(const [clock,consumed]of ticks)planDistantBattlefield(clock,consumed);
  const runs=[];
  for(let r=0;r<3;r++){const t0=process.hrtime.bigint();let events=0;for(const [clock,consumed]of ticks)events+=planDistantBattlefield(clock,consumed).events.length;
    runs.push({usPerCall:+(Number(process.hrtime.bigint()-t0)/1e3/ticks.length).toFixed(1),events});}
  console.log(JSON.stringify({label,runs}));
}
