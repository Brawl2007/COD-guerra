// R4 INC-3: the golden of Act VII-c (the counterpart of tests/helpers/m01-act-b-golden.js, the golden of VII-b). Two routes of the area simulation (the prompt and the laggard pilot of
// tests/helpers/m01-act-c-route.js, seed 19390901, recruta), a sha256 digest of the gameplay state every second of simulation (the courier, the three squads and the men who have left the field included),
// the final account (clock, checkpoints, the stages of the withdrawal, the lines said and when), the clipping and stacking audits, and the sha256 of every input of the act. Deterministic JSON (no wall clock,
// no paths). Written only by tools/verification/m01-act-vii-c-golden.mjs --write (x86_64); tests/m01-act-vii-c.test.js regenerates and compares it byte for byte.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {actCRoute} from './m01-act-c-route.js';
import {stackingAudit} from './m01-clipping.js';
import {areaClippingAudit} from './m01-act-audit.js';

export const ACT_C_GOLDEN_FIXTURE='tests/fixtures/m01-act-vii-c-gameplay-baseline.json';
export const ACT_C_GOLDEN_INPUTS=Object.freeze(['src/game/m01-area-sim.js','src/game/m01-act-factories.js','src/game/m01-withdrawal.js','src/game/m01-unit-hash.js','src/world/m01-area-world.js',
  'src/world/m01-prop-layout.js','missions/m01-tczew/areas/np/act-vii-c.json','missions/m01-tczew/areas/np/layout.json','tests/helpers/m01-act-c-route.js']);
const ROOT=new URL('../../',import.meta.url);
const sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const r6=v=>Math.round(v*1e6)/1e6;
const t6=v=>v===null?null:r6(v);

/** The gameplay frame of one tick of VII-c: where everybody is and what the withdrawal has decided, never presentation-only records. */
export function actCFrame(sim){
  const R=sim.timers.withdrawal,p=sim.player;
  return {clock:r6(sim.clock),rng:sim.rng.state,phase:sim.mission.phase,scene:sim.scene?.id??null,player:{x:r6(p.x),z:r6(p.z),angle:r6(p.angle),health:r6(p.health),crouched:Boolean(p.crouched)},
    objectives:sim.objectives,flags:sim.flags,
    withdrawal:{messenger:R.messenger,since:r6(R.since),orderAt:t6(R.orderAt),lineOutAt:t6(R.lineOutAt),rearGoAt:t6(R.rearGoAt),rearOutAt:t6(R.rearOutAt),exitedAt:t6(R.exitedAt),out:R.out},
    squads:{up:sim.timers.squad,line:sim.timers.line,rear:sim.timers.rear},
    actors:sim.actors.map(a=>[a.id,r6(a.x),r6(a.z),r6(a.facing),a.alive,a.active,Boolean(a.crouched),a.ckm?.phase??null])};
}
export function actCGoldenRoute(mode,seed=19390901,difficulty='recruta'){
  const sim=new M01AreaSimulation(seed,{difficulty,actId:'act_vii_c_withdrawal'}),clip=areaClippingAudit(),stack=stackingAudit(),seconds=[],said=[];let digest=createHash('sha256');
  const say=sim.say.bind(sim);sim.say=on=>{const spoke=say(on);if(spoke)said.push([r6(sim.clock),on]);return spoke;};   // which line the act said, and when (the callout table's keys)
  const r=actCRoute(sim,{mode,maxSec:900,onStep:x=>{clip.observe(x);stack.observe(x);digest.update(JSON.stringify(actCFrame(x.sim)));if(x.tick%20===0){seconds.push(digest.digest('hex').slice(0,16));digest=createHash('sha256');}}});
  const R=sim.timers.withdrawal;
  return {mode,seed,difficulty,ticks:r.ticks,complete:r.complete,clock:r6(r.clock),deaths:r.deaths,checkpoints:[...sim.checkpointsReached],
    withdrawal:{orderAt:t6(R.orderAt),lineOutAt:t6(R.lineOutAt),rearGoAt:t6(R.rearGoAt),rearOutAt:t6(R.rearOutAt),exitedAt:t6(R.exitedAt),out:R.out},said,
    clipping:clip.report(),stacking:stack.report(),final:sha(actCFrame(sim)),perSecond:seconds};
}
export function actCGolden(){
  const inputsSha256=Object.fromEntries(ACT_C_GOLDEN_INPUTS.map(f=>[f,sha(readFileSync(new URL(f,ROOT)))]));
  return {task:'M01-R4-INC3-ACT-VII-C',act:'act_vii_c_withdrawal',generator:'tools/verification/m01-act-vii-c-golden.mjs',platform:'x86_64 only (floating point, as the current act goldens)',
    inputsSha256,routes:[actCGoldenRoute('prompt'),actCGoldenRoute('laggard')]};
}
export const actCGoldenText=()=>JSON.stringify(actCGolden(),null,1)+'\n';
