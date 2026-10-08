// CPU cost of M01DamageDecals fed with the real route's own events (Node, the machine it runs on). It times the
// module's impact() and update() calls only: not FPS, not GPU time and not a Chromebook measurement.
// Use: node tools/verification/m01-damage-decals-cpu.mjs [support|nosupport] [low|medium|high]
import {performance} from 'node:perf_hooks';
import {Scene} from 'three';
import {route} from '../../tests/helpers/m01-route.js';
import {eyePosition} from '../../src/world/spatial.js';
import {M01Environment} from '../../src/render/m01-environment.js';
import {M01DamageDecals} from '../../src/render/m01-damage-decals.js';

const support=process.argv[2]==='support',quality=process.argv[3]??'medium';
const decals=new M01DamageDecals(new Scene()),build=decals.buildResidue.bind(decals),times={impact:[],update:[],residueRebuild:[]};
const peak={marks:0,spall:0,debris:0,embers:0,residueTriangles:0};let trees=null,rebuilt=0;
decals.buildResidue=(...args)=>{const t=performance.now();build(...args);rebuilt+=performance.now()-t;};
route(19390901,{support,onStep:({sim,events})=>{
  // Every solid tree counted as near LOD: the worst case for drawn bark marks.
  trees??=sim.world.trees.map((t,i)=>Object.assign(M01Environment.prototype.makeTreeDescriptor.call(null,{...t,solid:true,serial:i}),{lod:'near'}));
  for(const e of events){
    if(e.type!=='round-impact'&&e.type!=='player-shot')continue;
    const shooter=e.type==='round-impact'?sim.actor(e.by)??null:sim.player,t=performance.now();
    decals.impact(e,{world:sim.world,trees,player:sim.player,shooter,clock:sim.clock,quality});times.impact.push(performance.now()-t);
  }
  const state=sim.renderState;rebuilt=0;const t=performance.now();
  decals.update({state,time:sim.clock,world:sim.world,trees,quality,camera:eyePosition(sim.player)});
  const dt=performance.now()-t;if(rebuilt>0)times.residueRebuild.push(dt);else times.update.push(dt);
  const d=decals.diagnostics;for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],k==='spall'?d.spall:d[k]);
}});
const stats=list=>{const s=[...list].sort((a,b)=>a-b),q=p=>s[Math.min(s.length-1,Math.floor(p*s.length))]??0;
  return {calls:s.length,medianMs:+q(.5).toFixed(4),p95Ms:+q(.95).toFixed(4),p99Ms:+q(.99).toFixed(4),maxMs:+(s.at(-1)??0).toFixed(3)};};
console.log(JSON.stringify({kind:'Node CPU timing of the presentation module on the real route; not FPS',route:support?'support':'no-support',quality,
  impact:stats(times.impact),update:stats(times.update),residueRebuild:stats(times.residueRebuild),peak,counts:decals.counts,node:process.version},null,1));
