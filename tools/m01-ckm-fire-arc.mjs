import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import layout from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import manifest from '../assets/models/provisional/m01/weapons/ckm_wz30/manifest.json' with {type:'json'};
import {CKM_POSITION as POST_POSITION,CKM_CASEMATE_POSITION} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {traceObstruction,eyePosition,rayBox} from '../src/world/spatial.js';

export const CKM_YAW=-Math.PI/2;
export const DEG=Math.PI/180;
const round=(n,d=6)=>Number(n.toFixed(d));
// The phase-0/0b facts are about the world BEFORE the ckm answered the Germans: the route runs with a gun that never engages (it differs from the
// pre-T47 build only by the crew standing at S2, proved per tick by tools/verification/m01-t47-ckm-fire-audit.mjs).
const neutralSimulation=async()=>(await import(pathToFileURL(resolve('tests/helpers/m01-ckm-neutral.js')))).CkmNeutralSimulation;
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
// Phase 0 (T47) measured the casemate gun: muzzleFlashWorld()/muzzleWorld() default to that pre-T47 root. `postMuzzleFlashWorld()` is the gun at the S2 post.
export function muzzleFlashWorld(root=CKM_CASEMATE_POSITION){return transformLocal(root,manifest.sockets.scene.gun_muzzle_flash);}
export function muzzleWorld(root=CKM_CASEMATE_POSITION){return transformLocal(root,manifest.sockets.scene.gun_muzzle);}
export function postMuzzleFlashWorld(){return muzzleFlashWorld(POST_POSITION);}
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
  const {route}=await import(pathToFileURL(resolve('tests/helpers/m01-route.js'))),flow=route(19390901,{Simulation:await neutralSimulation()}),origin=muzzleFlashWorld();
  const snapshots={repair:flow.combatSnapshots.repairThreat,withdrawal:flow.combatSnapshots.withdrawal};
  return Object.fromEntries(Object.entries(snapshots).map(([name,snapshot])=>{
    const world=new TczewWorld();world.refresh(Object.keys(snapshot.consumed??{}),snapshot.flags??{});
    const enemies=snapshot.actors.filter(a=>a.team==='enemy'&&a.alive&&a.active).map(a=>targetTrace(world,origin,a));
    return [name,{battleClock:snapshot.battleClock,clock:snapshot.clock,targets:enemies,clearTargets:enemies.filter(t=>!t.firstBlocker).map(t=>t.id)}];
  }));
}
// Passive sweep of the real route (tests/helpers/m01-route.js): every `everyTicks` ticks, every active, alive enemy is traced from the muzzle
// with the production world (the world the simulation holds at that tick, so demolitions are honoured). Nothing is injected or changed.
export async function routeSweep({everyTicks=20}={}){
  const {route}=await import(pathToFileURL(resolve('tests/helpers/m01-route.js'))),origin=muzzleFlashWorld(),probe={space:'metres',x:origin.x,y:origin.y,z:origin.z,eyeHeight:0};
  let tick=0;const out={everyTicks,samples:0,samplesBeforeEastDemolition:0,enemySamples:0,enemySamplesBeforeEastDemolition:0,clearEnemySamples:0,clearEnemySamplesBeforeEastDemolition:0,clearEnemySamplesAfterEastBeforeWestDemolition:0,clearEnemySamplesAfterWestDemolition:0,
    productionLineOfSightMismatches:0,groups:{},firstBlockers:{},clearTargets:{}};
  route(19390901,{Simulation:await neutralSimulation(),onStep:({sim})=>{
    if(tick++%everyTicks)return;
    const before=!sim.consumedEvent('evt_m01_east_demolition'),west=sim.consumedEvent('evt_m01_west_demolition'),crew=sim.actors.find(a=>a.ckm);out.samples++;if(before)out.samplesBeforeEastDemolition++;
    for(const a of sim.enemies.filter(a=>a.alive&&a.active)){
      const t=targetTrace(sim.world,origin,a),los=sim.world.lineOfSight(probe,a),clear=!t.firstBlocker;
      out.enemySamples++;if(before)out.enemySamplesBeforeEastDemolition++;
      out.groups[a.group]=(out.groups[a.group]??0)+1;const k=t.firstBlocker??'CLEAR';out.firstBlockers[k]=(out.firstBlockers[k]??0)+1;
      if(clear!==los)out.productionLineOfSightMismatches++;
      if(clear){
        out.clearEnemySamples++;if(before)out.clearEnemySamplesBeforeEastDemolition++;else if(west)out.clearEnemySamplesAfterWestDemolition++;else out.clearEnemySamplesAfterEastBeforeWestDemolition++;
        const e=out.clearTargets[a.id]??={group:a.group,samples:0,samplesBeforeEastDemolition:0,samplesAfterWestDemolition:0,firstBattleClock:round(sim.battleClock,2),lastBattleClock:0,firstPosition:t.position,targetDistanceM:t.targetDistanceM,ckmPhaseAtFirst:crew?.ckm?.phase??null};
        e.samples++;if(before)e.samplesBeforeEastDemolition++;if(west)e.samplesAfterWestDemolition++;e.lastBattleClock=round(sim.battleClock,2);
      }
    }
  }});
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Candidate ckm posts on the west bridgehead (T47 phase 0b). Same production line of sight as the MG34 fire (world.obstacles via rayBox +
// world.traceTerrain, i.e. traceObstruction), plus a STRICT test: a ray that enters ANY live bridge collider (trusses/partialCover, piers,
// walkable boxes) is not clear, because the fire must not go through the bridge. Production ignores 'partialCover' trusses for bullets.
export const CANDIDATE_PHASES=['pre_repair','repair','withdrawal','post_repair'];
export const MUZZLE_ABOVE_GROUND=.7;
export const CASEMATE_BOX={min:{x:0,y:-7,z:34},max:{x:26,y:-1,z:46}};
export function phaseOf(sim){
  if(sim.consumedEvent('evt_m01_germans_on_east_spans'))return 'withdrawal';
  if(sim.active('cover_repair'))return 'repair';
  if(!sim.done('cover_repair'))return 'pre_repair';
  return 'post_repair';
}
// One passive pass over the real route: unique (world state, German actor, eye position) tuples before evt_m01_east_demolition, with sample counts per phase.
export async function collectWindowTargets({everyTicks=20,seed=19390901}={}){
  const {route}=await import(pathToFileURL(resolve('tests/helpers/m01-route.js')));
  const worlds=new Map(),entries=new Map(),out={everyTicks,seed,samples:0,enemySamples:0,phaseSamples:{},phaseActors:{},worlds};
  let tick=0,lastRevision=-1,worldKey=null;const actorsByPhase={};
  route(seed,{Simulation:await neutralSimulation(),onStep:({sim})=>{
    if(tick++%everyTicks)return;
    if(sim.consumedEvent('evt_m01_east_demolition'))return;
    if(sim.world.revision!==lastRevision){lastRevision=sim.world.revision;worldKey=JSON.stringify([sim.world.events,sim.flags]);
      if(!worlds.has(worldKey)){const w=new TczewWorld();w.refresh([...sim.world.events],{...sim.flags});worlds.set(worldKey,w);}}
    const phase=phaseOf(sim);out.samples++;
    for(const a of sim.enemies.filter(a=>a.alive&&a.active)){
      const eye=eyePosition(a),k=`${worldKey}|${a.id}|${eye.x.toFixed(3)},${eye.y.toFixed(3)},${eye.z.toFixed(3)}`;
      let e=entries.get(k);if(!e){e={worldKey,id:a.id,group:a.group,eye:{x:eye.x,y:eye.y,z:eye.z},phases:{}};entries.set(k,e);}
      e.phases[phase]=(e.phases[phase]??0)+1;out.enemySamples++;out.phaseSamples[phase]=(out.phaseSamples[phase]??0)+1;
      (actorsByPhase[phase]??=new Set()).add(a.id);
    }
  }});
  for(const [p,set] of Object.entries(actorsByPhase))out.phaseActors[p]=set.size;
  out.entries=[...entries.values()];return out;
}
// Blocked-ness identical to traceObstruction (any box hit within range, or a terrain hit): the nearest-hit bookkeeping is skipped for speed.
export function productionClear(world,o,eye){
  const dx=eye.x-o.x,dy=eye.y-o.y,dz=eye.z-o.z,dist=Math.hypot(dx,dy,dz);if(dist<1e-6)return {clear:true,dist,dir:null,range:0};
  const dir={x:dx/dist,y:dy/dist,z:dz/dist},range=Math.max(0,dist-.02);
  for(const b of world.obstacles)if(rayBox(o,dir,b.min,b.max,range)!==null)return {clear:false,dist,dir,range};
  return {clear:!world.traceTerrain(o,dir,range),dist,dir,range};
}
export function throughBridge(world,o,dir,range){for(const b of world.colliders)if(rayBox(o,dir,b.min,b.max,range)!==null)return b.id;return null;}
// Smallest height of the ray above a deck/joint top, taken over the part of the ray that lies over that deck footprint (analytic: y is linear along the ray).
export function deckClearance(world,o,dir,range){
  let best=Infinity;
  for(const c of world.spanDecks){
    let a=0,b=range;
    for(const ax of ['x','z']){
      if(Math.abs(dir[ax])<1e-9){if(o[ax]<c.min[ax]||o[ax]>c.max[ax]){a=1;b=0;}continue;}
      const t0=(c.min[ax]-o[ax])/dir[ax],t1=(c.max[ax]-o[ax])/dir[ax];a=Math.max(a,Math.min(t0,t1));b=Math.min(b,Math.max(t0,t1));
    }
    if(a>b)continue;
    best=Math.min(best,o.y+dir.y*Math.max(0,a)-c.max.y,o.y+dir.y*Math.min(range,b)-c.max.y);
  }
  return best;
}
// Smallest 3D gap (m) between the ray and any live bridge collider box, sampled every 2 m (only meaningful for rays that enter none).
export function minGapToColliders(world,o,dir,range,step=2){
  let best=Infinity;
  for(let d=0;d<=range;d+=step){
    const p={x:o.x+dir.x*d,y:o.y+dir.y*d,z:o.z+dir.z*d};
    for(const b of world.colliders){const gx=Math.max(b.min.x-p.x,0,p.x-b.max.x),gy=Math.max(b.min.y-p.y,0,p.y-b.max.y),gz=Math.max(b.min.z-p.z,0,p.z-b.max.z);const g=Math.hypot(gx,gy,gz);if(g<best)best=g;}
  }
  return best;
}
export function candidateMuzzle(world,x,z,above=MUZZLE_ABOVE_GROUND){const g=world.heightAt(x,z);return {x,y:g+above,z,groundY:g};}
export function candidateExclusion(world,x,z){
  const g=world.heightAt(x,z),pts=[{x,y:g+.01,z},{x,y:g+MUZZLE_ABOVE_GROUND,z}];
  if(g<=-5)return 'water/off-terrain';
  for(const c of world.spanDecks)if(x>=c.min.x&&x<=c.max.x&&z>=c.min.z&&z<=c.max.z)return `bridge-deck:${c.id}`;
  const inside=(b,p)=>p.x>=b.min.x&&p.x<=b.max.x&&p.y>=b.min.y&&p.y<=b.max.y&&p.z>=b.min.z&&p.z<=b.max.z;
  for(const b of [...world.colliders,...world.obstacles,CASEMATE_BOX])for(const p of pts)if(inside(b,p))return `inside:${b.id??'casemate_box'}`;
  return null;
}
export function distanceToCasemate(x,z){const dx=Math.max(CASEMATE_BOX.min.x-x,0,x-CASEMATE_BOX.max.x),dz=Math.max(CASEMATE_BOX.min.z-z,0,z-CASEMATE_BOX.max.z);return Math.hypot(dx,dz);}
export function evaluateCandidate(window,origin,{explain=false}={}){
  const res={origin:{x:round(origin.x,3),y:round(origin.y,3),z:round(origin.z,3)},phases:{},groups:{},minClearanceM:null,minTargetDistanceM:null,maxTargetDistanceM:null,productionClearEntries:0,strictClearEntries:0,throughBridgeEntries:0,blockers:explain?{}:undefined,throughBridgeIds:explain?{}:undefined};
  const bucket=p=>res.phases[p]??={production:{actors:new Set(),samples:0},strict:{actors:new Set(),samples:0}};
  let clearance=Infinity,dMin=Infinity,dMax=0;
  for(const e of window.entries){
    const world=window.worlds.get(e.worldKey),r=productionClear(world,origin,e.eye),n=Object.values(e.phases).reduce((a,b)=>a+b,0);
    if(explain){const k=r.clear?'CLEAR':(traceObstructionId(world,origin,r));res.blockers[k]=(res.blockers[k]??0)+n;}
    if(!r.clear)continue;
    res.productionClearEntries++;
    for(const [p,c] of Object.entries(e.phases)){const b=bucket(p).production;b.actors.add(e.id);b.samples+=c;}
    const hit=r.dir?throughBridge(world,origin,r.dir,r.range):null;
    if(hit){res.throughBridgeEntries++;if(explain)res.throughBridgeIds[hit]=(res.throughBridgeIds[hit]??0)+n;continue;}
    res.strictClearEntries++;
    const cl=r.dir?deckClearance(world,origin,r.dir,r.range):Infinity;if(cl<clearance)clearance=cl;
    dMin=Math.min(dMin,r.dist);dMax=Math.max(dMax,r.dist);
    for(const [p,c] of Object.entries(e.phases)){const b=bucket(p).strict;b.actors.add(e.id);b.samples+=c;}
    const g=res.groups[e.group]??={actors:new Set(),samples:0};g.actors.add(e.id);g.samples+=n;
  }
  res.minClearanceM=clearance===Infinity?null:round(clearance,3);res.minTargetDistanceM=dMin===Infinity?null:round(dMin,2);res.maxTargetDistanceM=dMax?round(dMax,2):null;
  for(const b of Object.values(res.phases))for(const k of ['production','strict']){b[k]={actors:b[k].actors.size,ids:[...b[k].actors].sort(),samples:b[k].samples};}
  for(const [k,g] of Object.entries(res.groups))res.groups[k]={actors:g.actors.size,ids:[...g.actors].sort(),samples:g.samples};
  return res;
}
function traceObstructionId(world,o,r){
  const hit=traceObstruction(world,o,r.dir,r.range);if(!hit)return 'CLEAR';
  const surface=!hit.id&&hit.material==='earth'?world.walkSurfaces.find(c=>{const p={x:o.x+r.dir.x*hit.distance,z:o.z+r.dir.z*hit.distance,y:o.y+r.dir.y*hit.distance};return p.x>=c.min.x&&p.x<=c.max.x&&p.z>=c.min.z&&p.z<=c.max.z&&p.y<c.max.y-.04;}):null;
  return hit.id??surface?.id??'terrain';
}
export function candidateGrid({xMin=-40,xMax=10,zMin=-20,zMax=60,step=2}={}){
  const pts=[];for(let x=xMin;x<=xMax+1e-9;x+=step)for(let z=zMin;z<=zMax+1e-9;z+=step)pts.push({x:round(x,3),z:round(z,3)});return pts;
}
export function gateAzimuth(o,{x=1055,zMin=9.5,zMax=31.5}={}){
  const az=z=>Math.atan2(z-o.z,x-o.x)/DEG;return {toRiflemenCentreDeg:round(az((zMin+zMax)/2),3),minDeg:round(az(zMin),3),maxDeg:round(az(zMax),3),horizontalToGatesM:round(Math.hypot(x-o.x,(zMin+zMax)/2-o.z),1)};
}
// Shortlist: (x,z) on the 2 m grid; ground and muzzle come from the production heightAt (+0.7 m).
export const SHORTLIST=Object.freeze([{id:'S1',x:8,z:30,kind:'abutment_top_north_edge'},{id:'S2',x:8,z:26,kind:'embankment_between_bridges'},
  {id:'S3',x:8,z:40,kind:'abutment_top_road_axis'},{id:'S4',x:8,z:54,kind:'south_flank'}]);
export function describeCandidate(window,{x,z},{above=MUZZLE_ABOVE_GROUND}={}){
  const world0=[...window.worlds.values()][0],m=candidateMuzzle(world0,x,z,above),ev=evaluateCandidate(window,m,{explain:true});
  const clear=window.entries.filter(e=>{const w=window.worlds.get(e.worldKey),r=productionClear(w,m,e.eye);return r.clear&&r.dir&&!throughBridge(w,m,r.dir,r.range);});
  const az=[],el=[];for(const e of clear){const dx=e.eye.x-m.x,dz=e.eye.z-m.z,dy=e.eye.y-m.y;az.push(Math.atan2(dz,dx)/DEG);el.push(Math.atan2(dy,Math.hypot(dx,dz))/DEG);}
  let gap=Infinity;for(const e of clear){const w=window.worlds.get(e.worldKey),r=productionClear(w,m,e.eye);gap=Math.min(gap,minGapToColliders(w,m,r.dir,r.range));}
  const range=a=>a.length?[round(Math.min(...a),3),round(Math.max(...a),3)]:null;
  return {x,z,groundY:round(m.groundY,3),muzzleY:round(m.y,3),exclusion:candidateExclusion(world0,x,z),distanceToCasemateM:round(distanceToCasemate(x,z),2),...ev,
    minGapToBridgeM:gap===Infinity?null:round(gap,2),strictAzimuthDeg:range(az),strictElevationDeg:range(el),gateAzimuth:gateAzimuth(m)};
}
export async function candidateReport({window,step=2}={}){
  window??=await collectWindowTargets();
  const world0=[...window.worlds.values()][0],baselineOrigin=muzzleFlashWorld(),rows=[];
  const baseline={id:'C0',...evaluateCandidate(window,baselineOrigin,{explain:true}),groundY:-3,distanceToCasemateM:0};
  const excluded={};
  for(const {x,z} of candidateGrid({step})){
    const why=candidateExclusion(world0,x,z);if(why){const k=why.split(':')[0];excluded[k]=(excluded[k]??0)+1;continue;}
    const m=candidateMuzzle(world0,x,z),ev=evaluateCandidate(window,m);
    rows.push({x,z,groundY:round(m.groundY,3),...ev,distanceToCasemateM:round(distanceToCasemate(x,z),2),azimuth:gateAzimuth(m)});
  }
  return {schemaVersion:1,muzzleAboveGroundM:MUZZLE_ABOVE_GROUND,window:{seed:window.seed,everyTicks:window.everyTicks,samples:window.samples,enemySamples:window.enemySamples,phaseSamples:window.phaseSamples,phaseActors:window.phaseActors,uniqueEntries:window.entries.length,worldStates:window.worlds.size},baseline,excluded,rows};
}
export function candidateCsv(report){
  const cols=['x','z','groundY','muzzleY','distCasemateM','azCentreDeg','prodClearActors','prodClearSamples','strictClearActors','strictClearSamples','strictRepairActors','strictRepairSamples','strictWithdrawalActors','strictWithdrawalSamples','throughBridgeEntries','minDeckClearanceM','minTargetDistM','maxTargetDistM'];
  const line=r=>{
    const sum=(k,f)=>Object.values(r.phases).reduce((a,p)=>a+p[k][f],0),ids=k=>new Set(Object.values(r.phases).flatMap(p=>p[k].ids)).size;
    const ph=(p,f)=>r.phases[p]?.strict[f]??0;
    return [r.x,r.z,r.groundY,round(r.origin.y,3),r.distanceToCasemateM,r.azimuth.toRiflemenCentreDeg,ids('production'),sum('production','samples'),ids('strict'),sum('strict','samples'),
      ph('repair','actors'),ph('repair','samples'),ph('withdrawal','actors'),ph('withdrawal','samples'),r.throughBridgeEntries,r.minClearanceM??'',r.minTargetDistanceM??'',r.maxTargetDistanceM??''].join(',');
  };
  return [cols.join(','),...report.rows.map(line)].join('\n')+'\n';
}
export async function buildReport(options={}){
  const origin=muzzleFlashWorld(),rows=scanArc({...options,origin}),targets=await scenarioTargets();
  return {schemaVersion:1,root:{...CKM_CASEMATE_POSITION},yawRad:CKM_YAW,yawDeg:-90,sockets:{muzzleLocal:manifest.sockets.scene.gun_muzzle,muzzleFlashLocal:manifest.sockets.scene.gun_muzzle_flash,
    muzzleWorld:muzzleWorld(),muzzleFlashWorld:origin},embrasure:embrasureContract(),scan:{config:{azMin:options.azMin??-30,azMax:options.azMax??30,azStep:options.azStep??.5,elMin:options.elMin??-5,elMax:options.elMax??10,elStep:options.elStep??.5,range:options.range??1200},summary:summariseRows(rows),rows},targets};
}
async function main(argv){
  if(argv.includes('--candidates')){
    const flag=n=>{const i=argv.indexOf(n);return i>=0?argv[i+1]:null;},report=await candidateReport({step:Number(flag('--step')??2)});
    const text=JSON.stringify(report,null,2)+'\n';if(flag('--out-json'))await writeFile(resolve(flag('--out-json')),text);
    if(flag('--out-csv'))await writeFile(resolve(flag('--out-csv')),candidateCsv(report));
    if(!flag('--out-json')&&!flag('--out-csv'))process.stdout.write(text);return;
  }
  if(argv.includes('--route')){process.stdout.write(JSON.stringify(await routeSweep(),null,2)+'\n');return;}
  const take=(name,fallback)=>{const i=argv.indexOf(name);return i>=0?Number(argv[i+1]):fallback;},outIndex=argv.indexOf('--out');
  const report=await buildReport({azMin:take('--az-min',-30),azMax:take('--az-max',30),azStep:take('--az-step',.5),elMin:take('--el-min',-5),elMax:take('--el-max',10),elStep:take('--el-step',.5),range:take('--range',1200)});
  const text=JSON.stringify(report,null,2)+'\n';if(outIndex>=0)await writeFile(resolve(argv[outIndex+1]),text);else process.stdout.write(text);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1;});
