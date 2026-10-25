// R4 INC-1: the golden of Act VII-a (the counterpart of the current act's gameplay goldens, which stay untouched). Two routes of the area simulation (the passive
// and the active pilot of tests/helpers/m01-act-route.js, seed 19390901, recruta), a sha256 digest of the gameplay state every second of simulation, the final
// account (clock, wave times, casualties, deaths), the clipping and stacking audits, and the sha256 of every input of the act. Deterministic JSON (no wall clock,
// no paths). Written only by tools/verification/m01-act-vii-a-golden.mjs --write (x86_64); tests/m01-act-vii-a.test.js regenerates and compares it byte for byte.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {actRoute} from './m01-act-route.js';
import {clippingAudit,stackingAudit} from './m01-clipping.js';

export const ACT_GOLDEN_FIXTURE='tests/fixtures/m01-act-vii-a-gameplay-baseline.json';
export const ACT_GOLDEN_INPUTS=Object.freeze(['src/game/m01-area-sim.js','src/game/m01-act-factories.js','src/world/m01-area-world.js','src/world/m01-prop-layout.js',
  'missions/m01-tczew/areas/np/act.json','missions/m01-tczew/areas/np/layout.json','tests/helpers/m01-act-route.js']);
const ROOT=new URL('../../',import.meta.url);
const sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const r6=v=>Math.round(v*1e6)/1e6;

/** The gameplay frame of one tick: what the act decides (never presentation-only records such as motion odometers). */
export function actFrame(sim){
  return {clock:r6(sim.clock),rng:sim.rng.state,player:{x:r6(sim.player.x),z:r6(sim.player.z),angle:r6(sim.player.angle),health:r6(sim.player.health),crouched:Boolean(sim.player.crouched)},
    weapon:{mag:sim.weapon.mag,reserve:sim.weapon.reserve},objectives:sim.objectives,flags:sim.flags,rounds:sim.enemyFire.nextId,
    actors:sim.actors.map(a=>[a.id,r6(a.x),r6(a.z),r6(a.health),a.alive,a.active,Boolean(a.crouched),a.deck?`${a.deck.phase}:${a.deck.node}`:null,r6(a.suppressedUntil),a.ckm?.phase??null])};
}
export function actGoldenRoute(mode,seed=19390901,difficulty='recruta'){
  const sim=new M01AreaSimulation(seed,{difficulty}),clip=clippingAudit(),stack=stackingAudit(),seconds=[];let digest=createHash('sha256');
  const r=actRoute(sim,{mode,maxSec:600,onStep:x=>{clip.observe(x);stack.observe(x);digest.update(JSON.stringify(actFrame(x.sim)));if(x.tick%20===0){seconds.push(digest.digest('hex').slice(0,16));digest=createHash('sha256');}}});
  const W=sim.timers.wave;
  return {mode,seed,difficulty,ticks:r.ticks,complete:r.complete,clock:r6(r.clock),deaths:r.deaths,
    wave:W&&{at:r6(W.at),brokenAt:W.brokenAt===null?null:r6(W.brokenAt),repelledAt:W.repelledAt===null?null:r6(W.repelledAt),casualties:W.casualties},
    germansDead:sim.enemies.filter(a=>!a.alive).map(a=>a.id),polesDead:sim.allies.filter(a=>!a.alive).map(a=>a.id),roundsFired:sim.enemyFire.nextId,
    ckmBursts:sim.ckm?.bursts??0,clipping:clip.report(),stacking:stack.report(),final:sha(actFrame(sim)),perSecond:seconds};
}
export function actGolden(){
  const inputsSha256=Object.fromEntries(ACT_GOLDEN_INPUTS.map(f=>[f,sha(readFileSync(new URL(f,ROOT)))]));
  return {task:'M01-R4-INC1-ACT-VII-A',act:'act_vii_a_north',generator:'tools/verification/m01-act-vii-a-golden.mjs',platform:'x86_64 only (floating point, as the current act goldens)',
    inputsSha256,routes:[actGoldenRoute('passive'),actGoldenRoute('active')]};
}
export const actGoldenText=()=>JSON.stringify(actGolden(),null,1)+'\n';
