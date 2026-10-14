// Approved gameplay delta audit. Requires the immutable pre-task checkout; never changes production or the historical provenance fields.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {gameplayFrame,GameplayDigest} from '../../tests/helpers/m01-animation-contract.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
const root=resolve(import.meta.dirname,'../..'),baseline=resolve(process.env.M01_APPROVED_BASELINE??'/workspace/scratch/COD-guerra-baseline');
const out=resolve(process.env.M01_RAID_AUDIT_REPORT??root+'/docs/verification/m01-runtime/continuity-raid-integration-v1/gameplay-delta-audit.json');
const hash=s=>createHash('sha256').update(s).digest('hex'),read=p=>readFileSync(p,'utf8');
const {M01Simulation:Approved}=await import(pathToFileURL(baseline+'/src/game/m01-simulation.js'));
const original=JSON.parse(read(baseline+'/tests/fixtures/m01-anim-gameplay-baseline.json'));
const golden=structuredClone(original),report={task:'M01-CONTINUITY-RAID-INTEGRATION-V1',base:'2d65dd0b9837d5e6f21fe24dd8a8b167ca76df55',architecture:process.arch,protectedFiles:[],protectedMethods:[],routes:[]};
assert.equal(process.arch,'x64','D30: regenerate golden only on x86');
for(const p of ['src/game/wz29.js','src/game/m01-fire.js','src/world/spatial.js','src/core/random.js','src/world/tczew-world.js']){
 assert.equal(read(root+'/'+p),read(baseline+'/'+p),p+' remains byte-identical');report.protectedFiles.push({path:p,sha256:hash(read(root+'/'+p))});
}
const source=read(root+'/src/game/m01-simulation.js'),old=read(baseline+'/src/game/m01-simulation.js');
function method(s,name){const start=s.indexOf('\n  '+name+'(');assert.ok(start>=0,name);const next=s.slice(start+1).search(/\n  (?:\w+\(|get \w+)/);return s.slice(start,next<0?undefined:start+1+next);}
for(const name of ['safeImpact','readiness','advanceBattle','burst','landRounds','spansFire']){
 assert.equal(method(source,name),method(old,name),name+' remains byte-identical');report.protectedMethods.push({name,sha256:hash(method(source,name))});
}
assert.equal(method(source,'eastFire').replace('west=inside(p,this.world.layout.bounds.playable)','west=p.x>-200'),method(old,'eastFire'));
report.protectedMethods.push({name:'eastFire',change:'only west eligibility expression; cadence, target policy, LOS and RNG algorithm preserved'});
golden.approvedIntegration={task:report.task,base:report.base,sourceSha256:hash(source)};golden.routes=[];
for(const expected of original.routes){
 const reference=new Approved(expected.seed),candidateTrace=new GameplayDigest(),referenceTrace=new GameplayDigest();
 const row={seed:expected.seed,support:expected.support,firstDifference:null,firstRngDifference:null,differentTicks:0,changedStateFields:{},newWestFire:[],checkpoints:[]};
 const rawEastFire=M01Simulation.prototype.eastFire;
 class Audited extends M01Simulation{
  eastFire(a,...args){
   const prev=this.enemyFire.nextId,eligible=this.player.x<=-200&&this.player.x>=this.world.layout.bounds.playable.minX;
   rawEastFire.call(this,a,...args);
   if(eligible&&this.enemyFire.nextId>prev&&row.newWestFire.length<12)row.newWestFire.push({tick:candidateTrace.ticks+1,by:a.id,battleClock:this.battleClock,position:{x:this.player.x,z:this.player.z},lineOfSight:this.world.lineOfSight(a,this.player)});
  }
 }
 const result=route(expected.seed,{support:expected.support,Simulation:Audited,onStep:({sim,controls,events,dt})=>{
  reference.tick(dt,controls);const oldEvents=reference.drainEvents(),a=gameplayFrame(reference,oldEvents),b=gameplayFrame(sim,events);
  candidateTrace.add(b);referenceTrace.add(a);
  if(JSON.stringify(a)!==JSON.stringify(b)){
   row.differentTicks++;row.firstDifference??={tick:candidateTrace.ticks,battleClock:sim.battleClock,difference:firstDifference(a,b)};
   for(const k of Object.keys(b.state))if(JSON.stringify(a.state[k])!==JSON.stringify(b.state[k]))row.changedStateFields[k]=(row.changedStateFields[k]??0)+1;
  }
  if(reference.rng.state!==sim.rng.state&&!row.firstRngDifference){
   row.firstRngDifference={tick:candidateTrace.ticks,battleClock:sim.battleClock,position:{x:sim.player.x,z:sim.player.z},reference:reference.rng.state,candidate:sim.rng.state};
   assert.ok(row.newWestFire.length,'RNG first diverges only after new legally eligible west fire');
  }
 }});
 const approvedTrace=referenceTrace.finish();assert.deepEqual(approvedTrace,{ticks:expected.ticks,blocks:expected.blocks},'pre-task source still matches original golden using the same input sequence');
 row.approvedBaselineGoldenEqual=true;row.raidSchedulingUsesNoRng=true;row.checkpoints=result.sim.checkpointsReached;row.complete=result.sim.mission.complete;
 row.trace=candidateTrace.finish();golden.routes.push({seed:expected.seed,support:expected.support,...row.trace});delete row.trace;
 report.routes.push(row);console.log(JSON.stringify(row));
}
mkdirSync(resolve(out,'..'),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--write-golden'))writeFileSync(root+'/tests/fixtures/m01-anim-gameplay-baseline.json',JSON.stringify(golden,null,2)+'\n');
else assert.deepEqual(JSON.parse(read(root+'/tests/fixtures/m01-anim-gameplay-baseline.json')),golden);
