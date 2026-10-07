// Node-side numeric audit of train 963's consist presentation: approved base vs current tree, with the real wagon GLBs.
// Counts what the train group submits (draw calls, shadow casters, triangles, geometries, materials, textures,
// instances) at the focused browser viewpoints, and measures wheel/rail fit and buffer gaps. Not a frame-time measure.
// Use: node tools/verification/m01-train-consist-audit.mjs [out.json]
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {TczewWorld} from '../../src/world/tczew-world.js';

const ROOT=new URL('../../',import.meta.url),BASE='99309d9cb023cc94a07d41ff863e1362e4460570';
const out=process.argv[2];
globalThis.ProgressEvent??=class{constructor(t,p){Object.assign(this,p);}};
async function wagonAsset(type,lod){
  const b=readFileSync(new URL(`assets/models/provisional/m01-wagons/m01_wagon_${type}_lod${lod}.glb`,ROOT)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
  // Geometry only: textures are counted from the manifest (one atlas per type, shared by its three LODs).
  delete j.images;delete j.textures;delete j.samplers;
  for(const m of j.materials){for(const k of ['normalTexture','occlusionTexture','emissiveTexture'])delete m[k];delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
  j.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
  const gltf=await new GLTFLoader().parseAsync(JSON.stringify(j),'');gltf.scene.traverse(o=>{if(o.isMesh)o.material.userData.atlas=`wagon_${type}_atlas`;});return gltf;
}
const sources=Object.fromEntries(await Promise.all(['covered','open'].flatMap(t=>[0,1,2].map(async l=>[`${t}:${l}`,await wagonAsset(t,l)]))));
const assets={load:async name=>sources[name.replace(/^wagon:/,'')]};
const cache=new URL('node_modules/.cache/m01-train-consist-audit/',ROOT);mkdirSync(cache,{recursive:true});
const baseFile=new URL('m01-train-wagons.base.mjs',cache);writeFileSync(baseFile,execFileSync('git',['show',`${BASE}:src/render/m01-train-wagons.js`],{cwd:ROOT}));
const modules={base:await import(baseFile.href),head:await import(new URL('src/render/m01-train-wagons.js',ROOT).href)};

// Same viewpoints as tests/browser/m01-train-consist-polish.spec.js.
const VIEWS=[['wagon-near',1103.6,-10.4,'high'],['coupling-pair',1120.2,-7.4,'high'],['underframe',1131.4,3.4,'high'],['consist-medium',1098,-24,'high'],
  ['consist-far',1215,-235,'high'],['coupling-pair',1120.2,-7.4,'low'],['consist-medium',1098,-24,'low'],['consist-daylight',1110,-15,'high'],
  ['locomotive-wagon1',1081,-9.5,'high'],['coupling-pair',1120.2,-7.4,'medium']];
function count(group){
  const geometries=new Set(),materials=new Set(),textures=new Set();let drawCalls=0,shadowCasters=0,triangles=0,instances=0;
  group.traverse(o=>{
    if(!o.isMesh||!o.visible||(o.isInstancedMesh&&o.count===0))return;let hidden=false;for(let p=o.parent;p;p=p.parent)if(!p.visible)hidden=true;if(hidden)return;
    const n=o.isInstancedMesh?o.count:1,t=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
    drawCalls++;if(o.castShadow)shadowCasters++;triangles+=t*n;instances+=n;geometries.add(o.geometry);materials.add(o.material);
    for(const k of ['map','bumpMap','normalMap'])if(o.material[k])textures.add(o.material[k]);if(o.material.userData.atlas)textures.add(o.material.userData.atlas);
  });
  return {drawCalls,shadowCasters,triangles,instances,geometries:geometries.size,materials:materials.size,textures:textures.size};
}
const shared={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,8),wood:new THREE.MeshStandardMaterial({map:new THREE.Texture()}),metal:new THREE.MeshStandardMaterial({map:new THREE.Texture()})};
const counters={};
for(const [version,{M01TrainWagons}] of Object.entries(modules)){
  counters[version]=[];
  for(const [view,x,z,quality] of VIEWS){   // fresh renderer per view, as a freshly loaded page
    const train=new M01TrainWagons(new THREE.Group(),assets,shared.box,shared.cylinder,shared.wood,shared.metal);await train.load();
    train.update({x,z},quality);const d=train.diagnostics;
    counters[version].push({view,quality,lod:d.lodDistribution,glbBatches:d.batches,activeInstancesByLod:d.activeInstancesByLod,...count(train.group),
      detail:d.detail?{instancesByTier:d.detail.instancesByTier,drawCalls:d.detail.drawCalls,triangles:d.detail.triangles}:null});
    train.dispose();
  }
}

// Wheel/rail fit at the first wagon of each type for both versions.
const world=new TczewWorld(),east=world.features.get('rail_line_east').polyline;
const envRailCentre=x=>{for(let i=1;i<east.length;i++){const a=east[i-1],b=east[i];if(Math.hypot(b[0]-a[0],b[2]-a[2])>1800)continue;if(x>=a[0]&&x<=b[0])return a[2]+(b[2]-a[2])*(x-a[0])/(b[0]-a[0]);}return null;};
const head=await import(new URL('src/render/m01-train-consist-detail.js',ROOT).href),plan=modules.head.M01_TRAIN_WAGON_PLAN;
const railTop=world.terrainHeightAt(1300,-2.5)+.12+.06,fit=[],{railCentre,headWidth}=head.M01_TRAIN_TRACK;
// Lowest wheel surface in the vertical plane `lateral` m from the wagon axis (mesh triangles sliced, flange excluded by position).
function sliceMinY(geometry,world4,lateral,axisZ){
  const pos=geometry.attributes.position,index=geometry.index.array,v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];let min=Infinity;
  for(let t=0;t<index.length;t+=3){for(let k=0;k<3;k++)v[k].fromBufferAttribute(pos,index[t+k]).applyMatrix4(world4);
    const l=v.map(p=>p.z-axisZ-lateral);for(const [a,b] of [[0,1],[1,2],[2,0]]){if(l[a]===0)min=Math.min(min,v[a].y);if(l[a]*l[b]<0)min=Math.min(min,v[a].y+(v[b].y-v[a].y)*l[a]/(l[a]-l[b]));}}
  return min;
}
for(const version of ['base','head'])for(const [key,src] of Object.entries(sources)){
  const wagon=plan.find(w=>w.type===key.split(':')[0]);src.scene.updateMatrixWorld(true);
  const art=version==='head'?head.m01WagonArtMatrix(wagon):new THREE.Matrix4().makeRotationY(-Math.PI/2).setPosition(wagon.x,0,-2.5);
  const node=src.scene.getObjectByName('wheelset_1'),world4=new THREE.Matrix4().multiplyMatrices(art,node.matrixWorld);
  const at=l=>+(sliceMinY(node.geometry,world4,l,-2.5)-railTop).toFixed(4),centreZ=new THREE.Vector3().setFromMatrixPosition(world4).z;
  const nearestRail=version==='head'?head.M01_TRAIN_TRACK.z:envRailCentre(wagon.x);
  fit.push({version,asset:key,wagon:wagon.id,treadAboveRailTop_m:{inner:at(railCentre-headWidth/2+1e-4),centre:at(railCentre),outer:at(railCentre+headWidth/2-1e-4)},
    lateralOffsetToTrackCentre_m:nearestRail===null?null:+(centreZ-nearestRail).toFixed(3)});
}
const noRail=plan.filter(w=>envRailCentre(w.x)===null).length;
const gaps=Object.fromEntries(Object.entries(sources).map(([key,src])=>{const b=new THREE.Box3().setFromObject(src.scene.getObjectByName('body'));return [key,+(9.1-(b.max.z-b.min.z)).toFixed(3)];}));
const report={task:'M01-TRAIN-DETAIL-COUPLING-POLISH-V1',base:BASE,note:'Train group only (Node, real wagon GLB geometry; atlas textures counted per type). Not a GPU frame-time measurement.',
  railTop:+railTop.toFixed(3),baseWagonsWithoutAnyRail:noRail,bufferGapBetweenBodies_m:gaps,fit,counters};
const json=JSON.stringify(report,null,2);
if(out){mkdirSync(dirname(out),{recursive:true});writeFileSync(out,json+'\n');}
console.log(json);
for(const g of Object.values(shared))g.dispose?.();
