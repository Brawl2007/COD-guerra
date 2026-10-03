import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import layout from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import manifest from '../assets/models/provisional/m01/weapons/ckm_wz30/manifest.json' with {type:'json'};
import {CKM_POSITION} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {traceObstruction,eyePosition} from '../src/world/spatial.js';

export const CKM_YAW=-Math.PI/2;
export const DEG=Math.PI/180;
const round=(n,d=6)=>Number(n.toFixed(d));
const xyz=a=>({x:a[0],y:a[1],z:a[2]});
export function transformLocal(root,local,yaw=CKM_YAW){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return {x:root.x+local[0]*c+local[2]*s,y:root.y+local[1],z:root.z-local[0]*s+local[2]*c};
}
export function directionFor(azimuthDeg,elevationDeg){
  const a=azimuthDeg*DEG,e=elevationDeg*DEG,ce=Math.cos(e);
  // 0° = +X/east (the authored embrasure normal); +azimuth turns toward +Z/south.
  return {x:Math.cos(a)*ce,y:Math.sin(e),z:Math.sin(a)*ce};
}
export function traceRay(world,origin,azimuthDeg,elevationDeg,range=1200){
  const direction=directionFor(azimuthDeg,elevationDeg),hit=traceObstruction(world,origin,direction,range),distance=hit?.distance??range;
  const point={x:origin.x+direction.x*distance,y:origin.y+direction.y*distance,z:origin.z+direction.z*distance};
  // Production traceTerrain returns material=earth for both terrain and the walkable bridge surfaces used by heightAt().
  // Keep the production result, but annotate which authored walk-surface contains that first contact when one exists.
  const surface=hit&&!hit.id&&hit.material==='earth'?world.walkSurfaces?.find(c=>point.x>=c.min.x&&point.x<=c.max.x&&point.z>=c.min.z&&point.z<=c.max.z&&point.y<c.max.y-.04):null;
  return {azimuthDeg:round(azimuthDeg,3),elevationDeg:round(elevationDeg,3),firstBlocker:hit?.id??surface?.id??(hit?.material==='earth'?'terrain':null),
    blockerKind:hit?.kind??null,blockerMaterial:hit?.material??null,blockerSurface:surface?.id??null,blockerDistanceM:hit?round(hit.distance,3):null,clearDistanceM:round(distance,3),
    worldEnd:{x:round(point.x,3),y:round(point.y,3),z:round(point.z,3)}};
}
export function scanArc({azMin=-30,azMax=30,azStep=.5,elMin=-5,elMax=10,elStep=.5,range=1200,world=new TczewWorld(),origin=muzzleFlashWorld()}={}){
  const rows=[];
  for(let el=elMin;el<=elMax+1e-9;el+=elStep)for(let az=azMin;az<=azMax+1e-9;az+=azStep)rows.push(traceRay(world,origin,az,el,range));
  return rows;
}
export function muzzleFlashWorld(){return transformLocal(CKM_POSITION,manifest.sockets.scene.gun_muzzle_flash);}
export function muzzleWorld(){return transformLocal(CKM_POSITION,manifest.sockets.scene.gun_muzzle);}
export function embrasureContract(){
  const feature=layout.features.find(f=>f.id==='casemates_west'),cover=layout.coverNodes.find(c=>c.id==='cv_casemate_emb_s');
  const mapped=feature.embrasures[1];
  return {mappedPoint:xyz(mapped),coverPoint:xyz(cover.position),normal:xyz(cover.normal),heightM:cover.heightM,
    widthM:null,openingHeightM:null,note:'map-layout defines a point/normal/cover height, not an embrasure opening polygon or mechanical traverse limits'};
}
export function summariseRows(rows){
  const byBlocker=new Map();for(const r of rows){const k=r.firstBlocker??'CLEAR';byBlocker.set(k,(byBlocker.get(k)??0)+1);}
  const clear=rows.filter(r=>!r.firstBlocker),blocked=rows.length-clear.length;
  const azimuths=[...new Set(rows.map(r=>r.azimuthDeg))],elevations=[...new Set(rows.map(r=>r.elevationDeg))];
  const perAz=azimuths.map(az=>{const set=rows.filter(r=>r.azimuthDeg===az),free=set.filter(r=>!r.firstBlocker);return {azimuthDeg:az,clearElevations:free.map(r=>r.elevationDeg),clearCount:free.length,total:set.length};});
  return {samples:rows.length,blocked,clear:clear.length,clearFraction:round(clear.length/rows.length,4),byBlocker:Object.fromEntries([...byBlocker].sort((a,b)=>b[1]-a[1])),azimuths,elevations,perAz};
}
export function targetTrace(world,origin,actor){
  const dest=eyePosition(actor),dx=dest.x-origin.x,dy=dest.y-origin.y,dz=dest.z-origin.z,distance=Math.hypot(dx,dy,dz),horizontal=Math.hypot(dx,dz);
  const azimuthDeg=Math.atan2(dz,dx)/DEG,elevationDeg=Math.atan2(dy,horizontal)/DEG,row=traceRay(world,origin,azimuthDeg,elevationDeg,Math.max(0,distance-.02));
  return {id:actor.id,group:actor.group,state:actor.state,alive:actor.alive,active:actor.active,position:{x:round(actor.x,3),y:round(actor.y,3),z:round(actor.z,3)},
    eye:{x:round(dest.x,3),y:round(dest.y,3),z:round(dest.z,3)},targetDistanceM:round(distance,3),...row};
}
async function scenarioTargets(){
  const {route}=await import(pathToFileURL(resolve('tests/helpers/m01-route.js'))),flow=route(),origin=muzzleFlashWorld();
  const snapshots={repair:flow.combatSnapshots.repairThreat,withdrawal:flow.combatSnapshots.withdrawal};
  return Object.fromEntries(Object.entries(snapshots).map(([name,snapshot])=>{
    const world=new TczewWorld();world.refresh(Object.keys(snapshot.consumed??{}),snapshot.flags??{});
    const enemies=snapshot.actors.filter(a=>a.team==='enemy'&&a.alive&&a.active).map(a=>targetTrace(world,origin,a));
    return [name,{battleClock:snapshot.battleClock,clock:snapshot.clock,targets:enemies,clearTargets:enemies.filter(t=>!t.firstBlocker).map(t=>t.id)}];
  }));
}
export async function buildReport(options={}){
  const origin=muzzleFlashWorld(),rows=scanArc({...options,origin}),targets=await scenarioTargets();
  return {schemaVersion:1,root:{...CKM_POSITION},yawRad:CKM_YAW,yawDeg:-90,sockets:{muzzleLocal:manifest.sockets.scene.gun_muzzle,muzzleFlashLocal:manifest.sockets.scene.gun_muzzle_flash,
    muzzleWorld:muzzleWorld(),muzzleFlashWorld:origin},embrasure:embrasureContract(),scan:{config:{azMin:options.azMin??-30,azMax:options.azMax??30,azStep:options.azStep??.5,elMin:options.elMin??-5,elMax:options.elMax??10,elStep:options.elStep??.5,range:options.range??1200},summary:summariseRows(rows),rows},targets};
}
async function main(argv){
  const take=(name,fallback)=>{const i=argv.indexOf(name);return i>=0?Number(argv[i+1]):fallback;},outIndex=argv.indexOf('--out');
  const report=await buildReport({azMin:take('--az-min',-30),azMax:take('--az-max',30),azStep:take('--az-step',.5),elMin:take('--el-min',-5),elMax:take('--el-max',10),elStep:take('--el-step',.5),range:take('--range',1200)});
  const text=JSON.stringify(report,null,2)+'\n';if(outIndex>=0)await writeFile(resolve(argv[outIndex+1]),text);else process.stdout.write(text);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
