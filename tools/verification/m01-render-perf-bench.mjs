// Node micro-benchmark of M01Characters.update() (renderer only, no GPU, no FPS). Run:
//   node --expose-gc --min-semi-space-size=256 --max-semi-space-size=256 tools/verification/m01-render-perf-bench.mjs [label]
// Reports per frame: update() wall time, skeleton.update invocations a WebGLObjects pass would make (one per distinct
// Skeleton of every rendered skinned mesh, deduplicated per frame like WebGLObjects does), real bone-matrix recomputes,
// distinct Skeletons per soldier and the JS heap growth per update (young generation, no GC inside the window).
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {nodeCharacterAssets} from './m01-soldier-variation-assets.mjs';

// BENCH_MODULE (optional) = path of another copy of m01-characters.js, relative to src/render/, to measure a previous revision.
const {M01Characters}=await import(process.env.BENCH_MODULE?`../../src/render/${process.env.BENCH_MODULE}`:'../../src/render/m01-characters.js');
const label=process.argv[2]??'run';
const assets=await nodeCharacterAssets();
const proto=new M01Simulation().actors;
const base=team=>proto.find(a=>a.team===team&&!a.civilian&&a.role==='RIFLEMAN');
const make=(i,t)=>{
  const team=i%2?'enemy':'ally',far=i>=20,d=far?130+(i-20)*10:8+i*5.4,ang=i*2.399963;
  const moving=i%3===0;
  return {...base(team),id:`bench_${i}`,active:true,alive:true,state:moving?'ADVANCE':'GUARD',crouched:false,target:null,shot:0,firedAt:-1e9,
    x:Math.cos(ang)*d+(moving?Math.sin(t)*2:0),y:0,z:Math.sin(ang)*d,facing:ang,
    motion:{...(base(team).motion??{}),speed:moving?1.4:0,gait:moving?'walk':'idle',odometer:t*1.4}};
};
const ACTORS=40,FRAMES=240,WARM=60,dt=1/60;
const c=new M01Characters(new THREE.Scene(),{visualVariation:true});c.sources=new Map(assets.sources);c.clips=assets.clips;
const player={x:0,z:0};
const list=new Array(ACTORS);
function frame(f){const t=20+f*dt;for(let i=0;i<ACTORS;i++)list[i]=make(i,t);return t;}
// WebGLObjects: each rendered skinned mesh updates its skeleton once per frame.
let renderFrame=0;const seen=new Set();let skeletonUpdateCalls=0;
function render(){
  renderFrame++;seen.clear();
  for(const v of c.instances.values())for(const m of v.meshes)if(m.isSkinnedMesh&&m.visible&&!seen.has(m.skeleton)){seen.add(m.skeleton);m.skeleton.update();skeletonUpdateCalls++;}
}
for(let f=0;f<WARM;f++){const t=frame(f);c.update(list,t,player,'high');render();}
const times=[],renderTimes=[];skeletonUpdateCalls=0;c.poseStats.boneUploads=c.poseStats.boneSkips=0;
globalThis.gc?.();let heapBytes=0;
for(let f=WARM;f<WARM+FRAMES;f++){
  const t=frame(f),h0=process.memoryUsage().heapUsed,a=performance.now();c.update(list,t,player,'high');times.push(performance.now()-a);heapBytes+=process.memoryUsage().heapUsed-h0;
  const r0=performance.now();render();renderTimes.push(performance.now()-r0);
}
const per=new Set();for(const v of c.instances.values())per.add(new Set(v.meshes.filter(n=>n.isSkinnedMesh).map(n=>n.skeleton)).size);
times.sort((x,y)=>x-y);
const mean=times.reduce((s,x)=>s+x,0)/times.length,q=p=>times[Math.min(times.length-1,Math.floor(p*times.length))];
const out={label,node:process.version,actors:ACTORS,frames:FRAMES,instances:c.instances.size,
  updateMs:{mean:+mean.toFixed(4),median:+q(.5).toFixed(4),p95:+q(.95).toFixed(4)},
  skeletonPassMs:{mean:+(renderTimes.reduce((s,x)=>s+x,0)/renderTimes.length).toFixed(4),median:+renderTimes.slice().sort((x,y)=>x-y)[renderTimes.length>>1].toFixed(4)},   // CPU bone-matrix pass only (no GPU upload)
  skeletonUpdateCallsPerFrame:+(skeletonUpdateCalls/FRAMES).toFixed(2),
  boneMatrixRecomputesPerFrame:+(c.poseStats.boneUploads/FRAMES).toFixed(2),
  wrappedUpdatesPerFrame:+((c.poseStats.boneUploads+c.poseStats.boneSkips)/FRAMES).toFixed(2),
  distinctSkeletonsPerSoldier:[...per],
  heapBytesPerUpdate:Math.round(heapBytes/FRAMES)};
console.log(JSON.stringify(out));
c.dispose();
