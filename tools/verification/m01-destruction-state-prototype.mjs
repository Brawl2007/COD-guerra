// Isolated data-only prototype. Never imported by production src/.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

export const FORMAT='destruction-prototype/v1';
export const LIMITS=Object.freeze({objects:512,parts:32,events:2048,operations:64,local:256,bytes:2_000_000});
const STRUCTURE=['intact','damaged','heavily_damaged','partial_collapse','destroyed'];
const SURFACE=['clean','scorched','burned'];
const MOBILITY=['operational','disabled','destroyed','wreck'];
const COLLISION=['solid','none','rubble'],COVER=['full','low','none'],TRAVERSAL=['blocked','open','restricted'];
const fail=message=>{throw new Error(`Destruction prototype: ${message}`);};
const check=(condition,message)=>{if(!condition)fail(message);};
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const member=(v,choices,name)=>check(choices.includes(v),`invalid ${name}`);
const number=(v,min=0,max=1e9)=>check(Number.isFinite(v)&&v>=min&&v<=max,'invalid number');
const identifier=v=>check(typeof v==='string'&&v.length<=120&&!['constructor','prototype','__proto__'].includes(v)&&/^[a-z][a-z0-9_]*(?:[.:][a-z0-9_]+)*$/.test(v),'invalid stable ID');
const vector=v=>{check(Array.isArray(v)&&v.length===3,'invalid position');v.forEach(n=>number(n,-1e6,1e6));};
const keys=(v,required,optional=[])=>{
  check(plain(v),'expected plain record');
  check(required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>[...required,...optional].includes(k)),'missing/unknown field');
};
function jsonData(v,depth=0){
  check(depth<=16,'data nesting limit');
  if(v===null||typeof v==='boolean'||typeof v==='string')return;
  if(typeof v==='number'){check(Number.isFinite(v),'non-finite data');return;}
  check(Array.isArray(v)||plain(v),'non-JSON data');
  for(const [k,x] of Object.entries(v)){
    check(!['__proto__','constructor','prototype','isObject3D','matrixWorld'].includes(k),'forbidden field');
    jsonData(x,depth+1);
  }
}
function sorted(v){
  if(Array.isArray(v))return v.map(sorted);
  if(plain(v))return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])]));
  return v;
}
export function canonicalJSON(value){jsonData(value);return JSON.stringify(sorted(value));}
const copy=v=>JSON.parse(canonicalJSON(v));
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const seal=v=>freeze(sorted(v));
const withinMission=(id,mission)=>{identifier(id);check(id.startsWith(mission+'_'),'foreign mission ID');};
const policies=part=>{
  member(part.collisionState,COLLISION,'collision');member(part.coverState,COVER,'cover');member(part.traversalState,TRAVERSAL,'traversal');
};

export function createWorld({missionId,seed,catalogVersion,catalog}){
  identifier(missionId);check(/^m\d{2}$/.test(missionId),'invalid mission');
  check(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff,'invalid uint32 seed');
  identifier(catalogVersion);check(Array.isArray(catalog)&&catalog.length>0&&catalog.length<=LIMITS.objects,'catalog capacity');
  const data=copy(catalog).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),objects={};
  for(const d of data){
    keys(d,['id','category','position','parts']);withinMission(d.id,missionId);
    check(!Object.hasOwn(objects,d.id),'duplicate object ID');
    member(d.category,['building','structure','vehicle','ground'],'category');vector(d.position);
    check(Array.isArray(d.parts)&&d.parts.length>0&&d.parts.length<=LIMITS.parts,'parts capacity');
    const parts={};d.parts.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    for(const p of d.parts){
      keys(p,['id','collisionState','coverState','traversalState']);identifier(p.id);policies(p);
      check(!Object.hasOwn(parts,p.id),'duplicate part ID');
      parts[p.id]={structuralState:'intact',surfaceState:'clean',collisionState:p.collisionState,coverState:p.coverState,
        traversalState:p.traversalState,changedAt:null,causeEventId:null};
    }
    objects[d.id]={id:d.id,parts,fire:null,...(d.category==='vehicle'?{vehicle:{mobility:'operational',crew:'present',changedAt:null,causeEventId:null}}:{})};
  }
  const world={format:FORMAT,missionId,seed,catalogVersion,catalog:data,clock:0,objects,craters:{},debris:{},events:[]};
  check(Buffer.byteLength(canonicalJSON(world))<=LIMITS.bytes,'snapshot byte capacity');
  return seal(world);
}

// Event-local FNV-1a + xorshift32. Does not share production RNG state.
function rngFor(seed,...ids){
  let n=2166136261;for(const c of `${seed}|${ids.join('|')}`)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
  if(n===0)n=0x9e3779b9;
  return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
}
const quantize=n=>Math.round(n*1000)/1000;
function centerFor(world,event,op){
  vector(op.center);number(op.jitter,0,100);
  const r=rngFor(world.seed,event.id,op.targetId,op.effectId);
  return [quantize(op.center[0]+(r()*2-1)*op.jitter),quantize(op.center[1]),quantize(op.center[2]+(r()*2-1)*op.jitter)];
}
function applyOperation(draft,event,op,writes){
  check(plain(op),'invalid operation');withinMission(op.targetId,draft.missionId);
  const object=draft.objects[op.targetId];check(object,'unknown target');
  const claim=key=>{check(!writes.has(key),'duplicate transaction write');writes.add(key);};
  const stamp={changedAt:event.at,causeEventId:event.id};
  if(op.type==='part'){
    keys(op,['type','targetId','partId','structuralState','collisionState','coverState','traversalState'],['surfaceState']);identifier(op.partId);
    check(Object.hasOwn(object.parts,op.partId),'unknown part');const part=object.parts[op.partId];claim(`${op.targetId}:part:${op.partId}`);
    member(op.structuralState,STRUCTURE,'structure');policies(op);
    check(STRUCTURE.indexOf(op.structuralState)>=STRUCTURE.indexOf(part.structuralState),'structural regression');
    const surface=op.surfaceState??part.surfaceState;member(surface,SURFACE,'surface');
    check(SURFACE.indexOf(surface)>=SURFACE.indexOf(part.surfaceState),'surface regression');
    Object.assign(part,{structuralState:op.structuralState,surfaceState:surface,collisionState:op.collisionState,
      coverState:op.coverState,traversalState:op.traversalState,...stamp});
  }else if(op.type==='vehicle'){
    keys(op,['type','targetId','mobility','crew']);check(object.vehicle,'not a vehicle');claim(`${op.targetId}:vehicle`);
    member(op.mobility,MOBILITY,'mobility');member(op.crew,['present','abandoned'],'crew');
    check(MOBILITY.indexOf(op.mobility)>=MOBILITY.indexOf(object.vehicle.mobility),'vehicle regression');
    check(object.vehicle.crew!=='abandoned'||op.crew==='abandoned','crew resurrection');
    object.vehicle={mobility:op.mobility,crew:op.crew,...stamp};
  }else if(op.type==='ignite'){
    keys(op,['type','targetId','intensity','damageClass','spreadAllowed']);claim(`${op.targetId}:fire`);
    check(object.fire===null,'already ignited');member(op.intensity,['low','medium','high'],'fire intensity');
    member(op.damageClass,['none','heat'],'fire damage');check(typeof op.spreadAllowed==='boolean','invalid spread permission');
    object.fire={state:'active',ignitedAt:event.at,extinguishedAt:null,intensity:op.intensity,
      damageClass:op.damageClass,spreadAllowed:op.spreadAllowed,sourceEventId:event.id,causeEventId:event.id};
  }else if(op.type==='extinguish'){
    keys(op,['type','targetId']);claim(`${op.targetId}:fire`);check(object.fire?.state==='active','no active fire');
    Object.assign(object.fire,{state:'extinguished',extinguishedAt:event.at,causeEventId:event.id});
  }else if(op.type==='crater'||op.type==='debris'){
    const common=['type','targetId','effectId','center','jitter','budgetClass'];
    keys(op,[...common,...(op.type==='crater'?['radius','depthClass','affectsCover','affectsMovement']:
      ['proxyClass','collisionState','coverState','traversalState'])]);
    identifier(op.effectId);check(!op.effectId.includes('.')&&!op.effectId.includes(':'),'effect ID must be local');
    member(op.budgetClass,['PERSISTENT_CRITICAL','PERSISTENT_LOCAL'],'persistent budget');
    const id=`${event.id}.${op.effectId}`;identifier(id);claim(id);
    check(!draft.craters[id]&&!draft.debris[id],'duplicate persistent effect');
    check(Object.keys(draft.craters).length+Object.keys(draft.debris).length<LIMITS.local,'local capacity');
    const commonState={id,targetId:op.targetId,center:centerFor(draft,event,op),createdAt:event.at,
      causeEventId:event.id,budgetClass:op.budgetClass};
    if(op.type==='crater'){
      number(op.radius,.1,100);member(op.depthClass,['shallow','medium','deep'],'depth');
      check(typeof op.affectsCover==='boolean'&&typeof op.affectsMovement==='boolean','invalid crater policies');
      draft.craters[id]={...commonState,radius:op.radius,depthClass:op.depthClass,
        affectsCover:op.affectsCover,affectsMovement:op.affectsMovement};
    }else{
      member(op.proxyClass,['rubble_low','rubble_blocker','wreck_blocker'],'proxy');policies(op);
      draft.debris[id]={...commonState,proxyClass:op.proxyClass,collisionState:op.collisionState,
        coverState:op.coverState,traversalState:op.traversalState};
    }
  }else fail('unknown operation');
}

export function applyEvent(world,raw){
  check(world?.format===FORMAT&&Object.isFrozen(world),'expected immutable prototype world');
  const event=copy(raw);keys(event,['id','missionId','at','operations']);
  check(event.missionId===world.missionId,'foreign mission');withinMission(event.id,world.missionId);number(event.at);
  check(Array.isArray(event.operations)&&event.operations.length>0&&event.operations.length<=LIMITS.operations,'operations capacity');
  const previous=world.events.find(e=>e.id===event.id);
  if(previous){check(canonicalJSON(previous)===canonicalJSON(event),'conflicting duplicate event');return {world,applied:false};}
  check(event.at>=world.clock,'out-of-order event');check(world.events.length<LIMITS.events,'events capacity');
  const draft=copy(world),writes=new Set();
  for(const op of event.operations)applyOperation(draft,event,op,writes);
  draft.events.push(event);draft.clock=event.at;
  check(Buffer.byteLength(canonicalJSON(draft))<=LIMITS.bytes,'snapshot byte capacity');
  return {world:seal(draft),applied:true};
}

export function saveWorld(world){
  check(world?.format===FORMAT&&Object.isFrozen(world),'expected immutable prototype world');
  const text=canonicalJSON(world);check(Buffer.byteLength(text)<=LIMITS.bytes,'snapshot byte capacity');return text;
}
export function restoreWorld(text){
  check(typeof text==='string'&&Buffer.byteLength(text)<=LIMITS.bytes,'invalid snapshot size');
  const data=JSON.parse(text);jsonData(data);keys(data,['format','missionId','seed','catalogVersion','catalog','clock','objects','craters','debris','events']);
  check(data.format===FORMAT,'unsupported format');check(Array.isArray(data.events)&&data.events.length<=LIMITS.events,'events capacity');
  let world=createWorld(data);
  for(const e of data.events){const next=applyEvent(world,e);check(next.applied,'duplicate saved event');world=next.world;}
  check(saveWorld(world)===canonicalJSON(data),'snapshot logical inconsistency');return world;
}

// Pure descriptor: no transient blast, audio, mission event or simulation step.
export function materialize(world,id,quality='LOW'){
  member(quality,['LOW','MEDIUM','HIGH'],'quality');check(world.objects[id],'unknown materialization target');
  const d=world.catalog.find(d=>d.id===id),o=world.objects[id];
  const active=o.fire?.state==='active';
  return copy({authoritative:{id,category:d.category,position:d.position,parts:o.parts,
    vehicle:o.vehicle??null,fire:o.fire,craters:Object.values(world.craters).filter(c=>c.targetId===id),
    debris:Object.values(world.debris).filter(c=>c.targetId===id)},presentation:{
    variants:Object.fromEntries(Object.entries(o.parts).map(([k,p])=>[k,p.structuralState])),
    surfaces:Object.fromEntries(Object.entries(o.parts).map(([k,p])=>[k,p.surfaceState])),
    fireEmitter:active,smokeDensity:active?{LOW:1,MEDIUM:2,HIGH:3}[quality]:0,
    temporaryFragmentBudget:{LOW:4,MEDIUM:12,HIGH:24}[quality]}});
}

const part=(id,collisionState='solid',coverState='full',traversalState='blocked')=>({id,collisionState,coverState,traversalState});
export function demoWorld(seed=19390901){return createWorld({missionId:'m01',seed,catalogVersion:'synthetic_v1',catalog:[
  {id:'m01_house_04',category:'building',position:[900,0,40],parts:[part('wall_east'),part('roof','solid','none','blocked'),part('door_front'),
    part('window_01','solid','none','blocked'),part('window_02','solid','none','blocked')]},
  {id:'m01_vehicle_truck_02',category:'vehicle',position:[910,0,50],parts:[part('hull')]},
  {id:'m01_bridge_pier_06',category:'structure',position:[800,0,20],parts:[part('deck')]}
]});}
export function houseHit(){return {id:'m01_house_04_artillery_hit',missionId:'m01',at:10,operations:[
  {type:'part',targetId:'m01_house_04',partId:'wall_east',structuralState:'destroyed',surfaceState:'scorched',collisionState:'none',coverState:'none',traversalState:'open'},
  {type:'part',targetId:'m01_house_04',partId:'roof',structuralState:'partial_collapse',surfaceState:'burned',collisionState:'rubble',coverState:'none',traversalState:'restricted'},
  ...['window_01','window_02'].map(partId=>({type:'part',targetId:'m01_house_04',partId,structuralState:'destroyed',collisionState:'none',coverState:'none',traversalState:'open'})),
  {type:'ignite',targetId:'m01_house_04',intensity:'medium',damageClass:'heat',spreadAllowed:false},
  {type:'crater',targetId:'m01_house_04',effectId:'crater_north_03',center:[904,0,39],jitter:1.5,
    radius:2,depthClass:'medium',affectsCover:true,affectsMovement:true,budgetClass:'PERSISTENT_LOCAL'},
  {type:'debris',targetId:'m01_house_04',effectId:'wall_rubble',center:[902,0,40],jitter:.2,
    proxyClass:'rubble_low',collisionState:'rubble',coverState:'low',traversalState:'restricted',budgetClass:'PERSISTENT_LOCAL'}
]};}
export function wreckEvent(){return {id:'m01_truck_02_wreck',missionId:'m01',at:11,operations:[
  {type:'vehicle',targetId:'m01_vehicle_truck_02',mobility:'wreck',crew:'abandoned'},
  {type:'part',targetId:'m01_vehicle_truck_02',partId:'hull',structuralState:'destroyed',surfaceState:'burned',collisionState:'solid',coverState:'full',traversalState:'blocked'},
  {type:'ignite',targetId:'m01_vehicle_truck_02',intensity:'low',damageClass:'none',spreadAllowed:false}
]};}
export function demoScenario({visible=false,quality='LOW',seed=19390901}={}){
  let world=demoWorld(seed);const initial=saveWorld(world);
  if(visible)materialize(world,'m01_house_04',quality);
  world=applyEvent(world,houseHit()).world;world=applyEvent(world,wreckEvent()).world;
  const saved=saveWorld(world),restored=restoreWorld(saved),duplicate=applyEvent(restored,houseHit());
  const approached=materialize(duplicate.world,'m01_house_04',quality);
  return {initial,saved,restored:saveWorld(duplicate.world),doubleRestore:saveWorld(restoreWorld(saveWorld(restored))),
    duplicateApplied:duplicate.applied,approached};
}
export function evidence(){
  const runs=[];for(const visible of [true,false])for(const quality of ['LOW','MEDIUM','HIGH']){
    const r=demoScenario({visible,quality});runs.push({visible,quality,...r});
  }
  const reference=runs[0].saved;
  check(runs.every(r=>r.saved===reference&&r.restored===reference&&r.doubleRestore===reference&&!r.duplicateApplied),'scenario parity failed');
  return {taskId:'M01-DESTRUCTION-PERSISTENCE-ARCHITECTURE-V1',synthetic:true,runs};
}
function measure(){
  const samples=20,update=[],save=[],restore=[];let bytes=0,objects=0,local=0;
  for(let i=0;i<samples;i++){
    let w=demoWorld();let t=performance.now();w=applyEvent(w,houseHit()).world;w=applyEvent(w,wreckEvent()).world;update.push(performance.now()-t);
    t=performance.now();const s=saveWorld(w);save.push(performance.now()-t);bytes=Buffer.byteLength(s);
    t=performance.now();restoreWorld(s);restore.push(performance.now()-t);objects=Object.keys(w.objects).length;local=Object.keys(w.craters).length+Object.keys(w.debris).length;
  }
  const stats=a=>({samples:a.length,minMs:Math.min(...a),meanMs:a.reduce((s,n)=>s+n,0)/a.length,maxMs:Math.max(...a)});
  return {environment:{node:process.version,platform:process.platform,arch:process.arch},objects,localRecords:local,snapshotBytes:bytes,
    updateTwoEvents:stats(update),serialize:stats(save),restoreReplay:stats(restore),fps:'NOT_MEASURED',scope:'3 synthetic objects / 2 events; host CPU only; not a scale or Chromebook benchmark'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2);check(args.length===2&&args[0]==='--out','usage: --out <directory>');
  const out=resolve(args[1]);mkdirSync(out,{recursive:true});const report=evidence();
  writeFileSync(resolve(out,'scenario.json'),canonicalJSON(report)+'\n');
  writeFileSync(resolve(out,'scenario.csv'),'visible,quality,save_restore_equal,double_restore_equal,duplicate_applied,wall_state,craters,gameplay_debris\n'+
    report.runs.map(r=>`${r.visible},${r.quality},${r.saved===r.restored},${r.saved===r.doubleRestore},${r.duplicateApplied},${r.approached.authoritative.parts.wall_east.structuralState},${r.approached.authoritative.craters.length},${r.approached.authoritative.debris.length}`).join('\n')+'\n');
  writeFileSync(resolve(out,'performance.json'),JSON.stringify(measure(),null,2)+'\n');
  console.log(`6 parity scenarios PASS; evidence: ${out}`);
}
