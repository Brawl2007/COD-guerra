// R4 INC-2: the golden of Act VII-b (the counterpart of tests/helpers/m01-act-golden.js, the golden of VII-a). Two routes of the area simulation (the passive and the active pilot of
// tests/helpers/m01-act-b-route.js, seed 19390901, recruta), a sha256 digest of the gameplay state every second of simulation (the barrage and the stretcher-bearers included), the final account
// (clock, checkpoints, wave times, casualties, deaths, the barrages and what they did), the clipping and stacking audits, and the sha256 of every input of the act. Deterministic JSON (no wall clock,
// no paths). Written only by tools/verification/m01-act-vii-b-golden.mjs --write (x86_64); tests/m01-act-vii-b.test.js regenerates and compares it byte for byte.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {actBRoute} from './m01-act-b-route.js';
import {stackingAudit} from './m01-clipping.js';
import {areaClippingAudit} from './m01-act-audit.js';
import {actFrame} from './m01-act-golden.js';

export const ACT_B_GOLDEN_FIXTURE='tests/fixtures/m01-act-vii-b-gameplay-baseline.json';
export const ACT_B_GOLDEN_INPUTS=Object.freeze(['src/game/m01-area-sim.js','src/game/m01-act-factories.js','src/game/m01-shell-blast.js','src/game/m01-unit-hash.js','src/world/m01-area-world.js',
  'src/world/m01-prop-layout.js','missions/m01-tczew/areas/np/act-vii-b.json','missions/m01-tczew/areas/np/layout.json','tests/helpers/m01-act-b-route.js']);
const ROOT=new URL('../../',import.meta.url);
const sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const r6=v=>Math.round(v*1e6)/1e6;

/** The gameplay frame of one tick of VII-b: VII-a's (actFrame) and what only VII-b decides. */
export function actBFrame(sim){
  const p=sim.player,R=sim.timers.barrage,M=sim.timers.medics;
  return {...actFrame(sim),stun:r6(p.concussion??0),craters:sim.sectors.damage.length,
    barrage:{done:R.done,run:R.run&&{id:R.run.id,k:R.run.k,rng:R.run.rng,shells:R.run.shells.map(s=>[s.n,r6(s.x),r6(s.z),r6(s.landAt)])}},
    medics:{state:M.state,patient:M.patient,handled:M.handled},
    wounded:sim.allies.filter(a=>a.state==='WOUNDED').map(a=>[a.id,r6(a.health),Boolean(a.carriedBy),a.active]),
    stretcher:sim.plan.medics.ids.map(id=>{const a=sim.actor(id);return [r6(a.x),r6(a.z),a.active];}),player:{...actFrame(sim).player,concussed:p.concussedUntil!==undefined}};
}
export function actBGoldenRoute(mode,seed=19390901,difficulty='recruta'){
  const sim=new M01AreaSimulation(seed,{difficulty,actId:'act_vii_b_north_day'}),clip=areaClippingAudit(),stack=stackingAudit(),seconds=[];let digest=createHash('sha256');
  const shells=[],minGap={m:Infinity},lifted=new Set();   // lifted: the men a bearer actually took onto his shoulder (a trip whose patient died before the pickup is in medics.handled, not here)
  const r=actBRoute(sim,{mode,maxSec:900,
    onEvent:e=>{if(e.type==='m01-blast'&&e.kind==='shell'){const d=Math.hypot(e.point.x-sim.player.x,e.point.z-sim.player.z);minGap.m=Math.min(minGap.m,d);shells.push([r6(sim.clock),r6(e.point.x),r6(e.point.z),r6(d),r6(e.concussion??0),e.effects.killed.length,e.effects.wounded.length,e.effects.suppressed.length]);}},
    onStep:x=>{clip.observe(x);stack.observe(x);for(const a of x.sim.allies)if(a.carriedBy)lifted.add(a.id);digest.update(JSON.stringify(actBFrame(x.sim)));if(x.tick%20===0){seconds.push(digest.digest('hex').slice(0,16));digest=createHash('sha256');}}});
  const W=sim.timers.wave;
  return {mode,seed,difficulty,ticks:r.ticks,complete:r.complete,clock:r6(r.clock),deaths:r.deaths,checkpoints:[...sim.checkpointsReached],
    wave:W&&{at:r6(W.at),brokenAt:W.brokenAt===null?null:r6(W.brokenAt),repelledAt:W.repelledAt===null?null:r6(W.repelledAt),casualties:W.casualties,
      echelons:W.echs.map(e=>({at:r6(e.at),brokenAt:e.brokenAt===null?null:r6(e.brokenAt),casualties:e.casualties}))},
    barrages:Object.fromEntries(Object.entries(sim.timers.barrage.done).map(([id,at])=>[id,r6(at)])),shells,minShellDistanceToPlayer:r6(minGap.m),
    medics:{...sim.timers.medics},lifted:[...lifted],germansDead:sim.enemies.filter(a=>!a.alive).map(a=>a.id),polesDead:sim.allies.filter(a=>!a.alive).map(a=>a.id),
    polesWounded:sim.allies.filter(a=>a.state==='WOUNDED').map(a=>a.id),roundsFired:sim.enemyFire.nextId,ckmBursts:sim.ckm?.bursts??0,
    clipping:clip.report(),stacking:stack.report(),final:sha(actBFrame(sim)),perSecond:seconds};
}
export function actBGolden(){
  const inputsSha256=Object.fromEntries(ACT_B_GOLDEN_INPUTS.map(f=>[f,sha(readFileSync(new URL(f,ROOT)))]));
  return {task:'M01-R4-INC2-ACT-VII-B',act:'act_vii_b_north_day',generator:'tools/verification/m01-act-vii-b-golden.mjs',platform:'x86_64 only (floating point, as the current act goldens)',
    inputsSha256,routes:[actBGoldenRoute('passive'),actBGoldenRoute('active')]};
}
export const actBGoldenText=()=>JSON.stringify(actBGolden(),null,1)+'\n';
