// Node micro-benchmark of M01Characters.update() (renderer only, no GPU, no FPS). Run:
//   node --expose-gc --min-semi-space-size=256 --max-semi-space-size=256 tools/verification/m01-render-perf-bench.mjs [label]
// Reports per frame: update() wall time, skeleton.update invocations a WebGLObjects pass would make (one per distinct
// Skeleton of every rendered skinned mesh, deduplicated per frame like WebGLObjects does), real bone-matrix recomputes,
// distinct Skeletons per soldier and the JS heap growth per update (young generation, no GC inside the window).
// R8-a additions: draw calls per soldier and in total (a WebGLRenderer-style walk of the scene graph: every visible Mesh with a
// visible material is one draw call, one more per extra geometry group), triangles submitted, and the quality tier.
//   BENCH_QUALITY=high|medium|low (default high)   BENCH_BATCHING=0 measures the former one-mesh-per-part path (M01Characters {batching:false}).
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {nodeCharacterAssets} from './m01-soldier-variation-assets.mjs';

// BENCH_MODULE (optional) = path of another copy of m01-characters.js, relative to src/render/, to measure a previous revision.
const {M01Characters}=await import(process.env.BENCH_MODULE?`../../src/render/${process.env.BENCH_MODULE}`:'../../src/render/m01-characters.js');
const label=process.argv[2]??'run';
const QUALITY=process.env.BENCH_QUALITY??'high',BATCHING=process.env.BENCH_BATCHING!=='0';
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
const scene=new THREE.Scene();
const c=new M01Characters(scene,{visualVariation:true,batching:BATCHING});c.sources=new Map(assets.sources);c.clips=assets.clips;
const player={x:0,z:0};
const list=new Array(ACTORS);
function frame(f){const t=20+f*dt;for(let i=0;i<ACTORS;i++)list[i]=make(i,t);return t;}
// WebGLObjects: each rendered skinned mesh updates its skeleton once per frame.
let renderFrame=0;const seen=new Set();let skeletonUpdateCalls=0;
function render(){
  renderFrame++;seen.clear();
  for(const v of c.instances.values())for(const m of v.meshes)if(m.isSkinnedMesh&&m.visible&&!seen.has(m.skeleton)){seen.add(m.skeleton);m.skeleton.update();skeletonUpdateCalls++;}
}
for(let f=0;f<WARM;f++){const t=frame(f);c.update(list,t,player,QUALITY);render();}
// Draw calls / triangles as WebGLRenderer would submit them for the whole scene (no frustum: the soldiers have frustumCulled=false).
function submitted(root){
  let calls=0,triangles=0;
  const walk=o=>{
    if(!o.visible)return;
    if(o.isMesh&&o.material&&!Array.isArray(o.material)&&o.material.visible!==false&&o.geometry){
      const g=o.geometry,count=g.index?g.index.count:g.getAttribute('position').count;
      if(count>0){calls++;triangles+=count/3;}
    }
    for(const k of o.children)walk(k);
  };
  walk(root);return {calls,triangles};
}
const times=[],renderTimes=[];skeletonUpdateCalls=0;c.poseStats.boneUploads=c.poseStats.boneSkips=0;
globalThis.gc?.();let heapBytes=0;
for(let f=WARM;f<WARM+FRAMES;f++){
  const t=frame(f),h0=process.memoryUsage().heapUsed,a=performance.now();c.update(list,t,player,QUALITY);times.push(performance.now()-a);heapBytes+=process.memoryUsage().heapUsed-h0;
  const r0=performance.now();render();renderTimes.push(performance.now()-r0);
}
const total=submitted(scene),perSoldier=[],triPerSoldier=[];
for(const v of c.instances.values()){const r=submitted(v.root);perSoldier.push(r.calls);triPerSoldier.push(r.triangles);}
const per=new Set();for(const v of c.instances.values())per.add(new Set(v.meshes.filter(n=>n.isSkinnedMesh).map(n=>n.skeleton)).size);
times.sort((x,y)=>x-y);
const mean=times.reduce((s,x)=>s+x,0)/times.length,q=p=>times[Math.min(times.length-1,Math.floor(p*times.length))];
const out={label,quality:QUALITY,batching:BATCHING,node:process.version,actors:ACTORS,frames:FRAMES,instances:c.instances.size,
  updateMs:{mean:+mean.toFixed(4),median:+q(.5).toFixed(4),p95:+q(.95).toFixed(4)},
  skeletonPassMs:{mean:+(renderTimes.reduce((s,x)=>s+x,0)/renderTimes.length).toFixed(4),median:+renderTimes.slice().sort((x,y)=>x-y)[renderTimes.length>>1].toFixed(4)},   // CPU bone-matrix pass only (no GPU upload)
  skeletonUpdateCallsPerFrame:+(skeletonUpdateCalls/FRAMES).toFixed(2),
  boneMatrixRecomputesPerFrame:+(c.poseStats.boneUploads/FRAMES).toFixed(2),
  wrappedUpdatesPerFrame:+((c.poseStats.boneUploads+c.poseStats.boneSkips)/FRAMES).toFixed(2),
  drawCalls:{total:total.calls,perSoldierMean:+(perSoldier.reduce((x,y)=>x+y,0)/perSoldier.length).toFixed(2),perSoldierMin:Math.min(...perSoldier),perSoldierMax:Math.max(...perSoldier),statsSubmittedDrawCalls:c.stats.submittedDrawCalls??null,statsSubmittedMeshes:c.stats.submittedMeshes},
  triangles:{total:total.triangles,perSoldierMean:Math.round(triPerSoldier.reduce((x,y)=>x+y,0)/triPerSoldier.length)},
  lodBands:c.stats.lodBands,
  mergeCache:c.mergeCache?.diagnostics??null,   // merged geometries kept for reuse (R8-a): count, builds, bytes
  distinctSkeletonsPerSoldier:[...per],
  heapBytesPerUpdate:Math.round(heapBytes/FRAMES)};
console.log(JSON.stringify(out));
c.dispose();
const leaked=scene.children.length;if(leaked)console.error('scene children after dispose:',leaked);
