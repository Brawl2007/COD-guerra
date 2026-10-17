// T38 M01-COMBAT-POSTURE-STAGING-V1: where do the gameplay bytes of the two golden routes first differ between two simulation checkouts? Not run by npm test.
// It explains a golden amendment (GOLDEN_AMENDMENT_01.json); it never writes a fixture. Both checkouts run the same two routes of the partials golden
// (seed 19390901 without support, seed 7 with support) through the test pilot (tests/helpers/m01-route.js, taken from the NEW checkout); for each route it
//   - diffs the full gameplay frames of tick 1 leaf by leaf (state and nested checkpoint, presentation fields removed, as in the golden), and
//   - reports the first tick at which the clock, the main RNG state, the rounds issued or in flight, the player's health or the event count differ.
//   git worktree add --detach /tmp/old <old-revision> && ln -s "$PWD/node_modules" /tmp/old/node_modules
//   node tools/verification/m01-t38-golden-divergence.mjs /tmp/old "$PWD" <out.json>
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const [oldRoot,newRoot,outFile]=process.argv.slice(2);
const {route}=await import(pathToFileURL(newRoot+'/tests/helpers/m01-route.js'));
const {gameplayFrame}=await import(pathToFileURL(newRoot+'/tests/helpers/m01-animation-contract.js'));
const {M01Simulation:Old}=await import(pathToFileURL(oldRoot+'/src/game/m01-simulation.js'));
const {M01Simulation:New,clockText}=await import(pathToFileURL(newRoot+'/src/game/m01-simulation.js'));
const partials=JSON.parse(readFileSync(newRoot+'/tests/fixtures/m01-partials-gameplay-baseline.json','utf8'));

/** Every leaf path at which two JSON values differ (arrays and objects walked in key order; capped). */
function diff(a,b,path='$',out=[],cap=400){
  if(out.length>=cap)return out;
  if(a===b||(Number.isNaN(a)&&Number.isNaN(b)))return out;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
    for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],`${path}.${k}`,out,cap);
    return out;
  }
  out.push({path,old:a,new:b});return out;
}
function run(Simulation,seed,support){
  const sig=[],first={};let tick=0,ids=null;
  route(seed,{support,Simulation,onStep:({sim,events})=>{
    tick++;
    sig.push([sim.clock,sim.rng.state,sim.enemyFire.nextId,sim.enemyFire.rounds.length,sim.player.health,events.length,sim.battleClock]);
    if(tick===1){first.frame=gameplayFrame(sim,events);ids=sim.actors.map(a=>a.id);}
  }});
  return {sig,first,ids,ticks:tick};
}
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const describe=root=>({revision:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  simulationSha256:sha(root+'/src/game/m01-simulation.js'),missionSha256:sha(root+'/missions/m01-tczew/mission.json')});
const result={task:'M01-COMBAT-POSTURE-STAGING-V1',old:describe(oldRoot),new:describe(newRoot),routes:[]};
for(const {seed,support} of partials.routes){
  const o=run(Old,seed,support),n=run(New,seed,support);
  const d=diff(o.first.frame,n.first.frame);
  const named=x=>{const m=x.path.match(/^\$\.(state|checkpoint)\.actors\.(\d+)\.(.+)$/);return m?{where:m[1],actor:o.ids[Number(m[2])],field:m[3],old:x.old,new:x.new}:{where:'other',path:x.path,old:x.old,new:x.new};};
  const all=d.map(named);
  const actorsDiffering=[...new Set(all.map(x=>x.actor??x.path))];
  const fieldsDiffering=[...new Set(all.map(x=>x.field??x.path))];
  const len=Math.min(o.sig.length,n.sig.length);
  let rng=null,event=null,health=null,rounds=null,clockDiff=null;
  for(let i=0;i<len;i++){
    if(rng===null&&o.sig[i][1]!==n.sig[i][1])rng=i+1;
    if(rounds===null&&(o.sig[i][2]!==n.sig[i][2]||o.sig[i][3]!==n.sig[i][3]))rounds=i+1;
    if(event===null&&o.sig[i][5]!==n.sig[i][5])event=i+1;
    if(health===null&&o.sig[i][4]!==n.sig[i][4])health=i+1;
    if(clockDiff===null&&o.sig[i][0]!==n.sig[i][0])clockDiff=i+1;
  }
  const at=t=>t===null?null:{tick:t,clock:+n.sig[t-1][0].toFixed(2),battleClock:clockText(n.sig[t-1][6])};
  result.routes.push({seed,support,ticks:{old:o.ticks,new:n.ticks},
    tick1:{leafDifferences:d.length,actorsDifferingAtTick1:actorsDiffering,fieldsDiffering,all},
    firstTickWhere:{mainRngStateDiffers:at(rng),roundsIssuedOrInFlightDiffer:at(rounds),eventCountDiffers:at(event),playerHealthDiffers:at(health),realClockDiffers:at(clockDiff)},
    finalRng:{old:o.sig.at(-1)[1],new:n.sig.at(-1)[1]},finalHealth:{old:o.sig.at(-1)[4],new:n.sig.at(-1)[4]}});
  console.log(JSON.stringify(result.routes.at(-1)).slice(0,1500));
}
writeFileSync(outFile,JSON.stringify(result,null,2)+'\n');
