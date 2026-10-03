// Isolated fencing/transaction proof. No imports from src or other workers.
import { createHash } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const FORMAT='authority-lease-prototype/v1';
const STATUS=['combatReady','wounded','dead','evacuated'];
const MAX_BYTES=2_000_000,MAX_MEMBERS=256,MAX_COMMANDS=2048;
const requireThat=(ok,message)=>{if(!ok)throw Error(`Authority lease: ${message}`);};
const integer=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const id=s=>typeof s==='string'&&s.length>0&&s.length<=200&&/^[a-zA-Z0-9_/:.\-]+$/.test(s)&&!['constructor','prototype','__proto__'].includes(s);
const point=p=>p&&Object.keys(p).length===3&&['x','y','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=1e6);
const record=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function keys(v,required,optional=[]){requireThat(record(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>[...required,...optional].includes(k)),'missing/unknown field');}
function finiteJSON(v,depth=0){
  requireThat(depth<=16,'snapshot depth');
  if(v===null||typeof v==='string'||typeof v==='boolean')return;
  if(typeof v==='number'){requireThat(Number.isFinite(v),'non-finite number');return;}
  requireThat(Array.isArray(v)||record(v),'non-JSON data');
  for(const [k,n] of Object.entries(v)){requireThat(!['__proto__','constructor','prototype','isObject3D','matrixWorld'].includes(k),'unsafe field');finiteJSON(n,depth+1);}
}
const sorted=v=>Array.isArray(v)?v.map(sorted):record(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
export function canonical(value){finiteJSON(value);return JSON.stringify(sorted(value));}
const copy=v=>JSON.parse(canonical(v));
const fingerprint=v=>createHash('sha256').update(canonical(v)).digest('hex');
function hash32(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n||0x9e3779b9;}
function actorDraw(stream){let n=stream.state;n^=n<<13;n^=n>>>17;n^=n<<5;stream.state=n>>>0;stream.draws++;return stream.state/4294967296;}
function sectorDraw(stream){stream.state=(1664525*stream.state+1013904223)>>>0;stream.draws++;return stream.state/4294967296;}
const active=state=>state.mode==='AGGREGATED'?state.aggregate:state.individual;
const member=(combat,memberId)=>{const m=combat.members.find(m=>m.id===memberId);requireThat(m,'unknown member');return m;};
const source=s=>({identity:s.identity,aggregate:s.aggregate,sectorRng:s.sectorRng});
export function counts(combat){return Object.fromEntries(STATUS.map(status=>[status,combat.members.filter(m=>m.status===status).length]));}

function validateCombat(c,identity){
  keys(c,['revision','updatedAt','anchor','members','reserveAmmunition','resources','objective','destructionRefs']);
  requireThat(integer(c.revision)&&integer(c.updatedAt)&&point(c.anchor)&&integer(c.reserveAmmunition),'combat scalar');
  requireThat(Array.isArray(c.members)&&c.members.length===identity.memberIds.length,'member conservation');
  requireThat(new Set(c.members.map(m=>m.id)).size===c.members.length,'duplicate member');
  const weapons=new Set(),covers=new Set();
  c.members.forEach((m,n)=>{
    keys(m,['id','ordinal','status','position','weaponId','loadedRounds','capacity','weaponCycle','coverId','rng','decisionSerial']);
    requireThat(id(m.id)&&m.ordinal===n&&m.id===identity.memberIds[n],'unknown member/binding');
    requireThat(STATUS.includes(m.status)&&point(m.position),'member state');
    requireThat(id(m.weaponId)&&m.weaponId===identity.weaponIds[n]&&!weapons.has(m.weaponId),'weapon identity');weapons.add(m.weaponId);
    requireThat(integer(m.loadedRounds)&&integer(m.capacity,1000)&&m.capacity>0&&m.loadedRounds<=m.capacity,'loaded ammo');
    requireThat(['idle','cycling','reloading'].includes(m.weaponCycle),'weapon cycle');
    requireThat(m.coverId===null||id(m.coverId)&&identity.coverIds.includes(m.coverId)&&!covers.has(m.coverId)&&m.status==='combatReady','cover occupancy');
    if(m.coverId)covers.add(m.coverId);
    keys(m.rng,['state','draws']);requireThat(integer(m.rng.state,0xffffffff)&&m.rng.state!==0&&integer(m.rng.draws)&&integer(m.decisionSerial),'actor RNG');
  });
  requireThat(Array.isArray(c.resources)&&c.resources.length===identity.resourceIds.length,'resource conservation');
  requireThat(new Set(c.resources.map(r=>r.id)).size===c.resources.length,'duplicate resource');
  const operators=new Set();
  c.resources.forEach((r,n)=>{
    keys(r,['id','kind','state','operatorId']);requireThat(id(r.id)&&r.id===identity.resourceIds[n]&&['mounted','vehicle'].includes(r.kind),'resource identity');
    requireThat(['operational','disabled','destroyed'].includes(r.state),'resource state');
    requireThat(r.operatorId===null||r.state==='operational'&&member(c,r.operatorId).status==='combatReady'&&!operators.has(r.operatorId),'operator binding');
    if(r.operatorId)operators.add(r.operatorId);
  });
  keys(c.objective,['id','progress']);requireThat(id(c.objective.id)&&integer(c.objective.progress,100),'objective progress');
  requireThat(Array.isArray(c.destructionRefs)&&c.destructionRefs.length<=256&&new Set(c.destructionRefs.map(r=>r.id)).size===c.destructionRefs.length,'destruction references');
  c.destructionRefs.forEach(r=>{keys(r,['id','revision','eventId']);requireThat(id(r.id)&&id(r.eventId)&&integer(r.revision),'destruction ref');});
}

export function validateReturnCandidate(state,input){
  keys(input,['token','expectedRevision','sourceFingerprint','combat']);
  requireThat(state.mode==='INDIVIDUAL'&&state.lease&&state.individual,'not individual owner');
  requireThat(input.token===state.lease.id,'lease token mismatch');
  requireThat(input.expectedRevision===state.aggregate.revision&&input.expectedRevision===state.lease.sourceRevision,'stale revision');
  requireThat(input.sourceFingerprint===state.lease.sourceFingerprint&&fingerprint(source(state))===state.lease.sourceFingerprint,'stale source fingerprint');
  validateCombat(input.combat,state.identity);
  requireThat(canonical(input.combat)===canonical(state.individual),'return differs from authoritative individual ledger');
}

/** Input adapter for the approved BattleSector formation shape, not its scheduler. */
export function configFromBattleSector(sector,formation,seed,{localMs=sector.updatedAt,battleMs=16_200_000,weaponBindings}={}){
  requireThat(id(sector.id)&&id(formation.id)&&integer(seed,0xffffffff)&&integer(sector.rng,0xffffffff)&&integer(sector.revision)&&integer(localMs)&&integer(battleMs),'adapter identity/time');
  requireThat(integer(formation.nominalStrength,MAX_MEMBERS)&&formation.nominalStrength>0&&point(formation.position)&&point(formation.initialPosition),'formation input');
  let cursor=0;for(const r of formation.runs){requireThat(r.from===cursor&&integer(r.to)&&r.to>r.from&&STATUS.includes(r.status),'status run partition');cursor=r.to;}
  requireThat(cursor===formation.nominalStrength,'strength conservation');
  const named=formation.namedIds??{},known=formation.individuals??{};
  for(const n of Object.keys(named))requireThat(integer(Number(n))&&String(Number(n))===n&&Number(n)<cursor&&id(named[n]),'named binding');
  for(const n of Object.keys(known))requireThat(integer(Number(n))&&String(Number(n))===n&&Number(n)<cursor,'unknown sparse member');
  const members=Array.from({length:cursor},(_,ordinal)=>{
    const status=formation.runs.find(r=>ordinal>=r.from&&ordinal<r.to).status,override=known[ordinal];
    if(override)requireThat(point(override.position)&&point(override.anchor)&&integer(override.rounds),'sparse override');
    const anchor=status==='combatReady'?formation.position:formation.initialPosition;
    const delta=override&&status==='combatReady'?{x:formation.position.x-override.anchor.x,y:formation.position.y-override.anchor.y,z:formation.position.z-override.anchor.z}:{x:0,y:0,z:0};
    const position=override?Object.fromEntries(['x','y','z'].map(k=>[k,override.position[k]+delta[k]])):
      {x:anchor.x+ordinal%4*2,y:anchor.y,z:anchor.z+Math.floor(ordinal/4)*2};
    const memberId=named[ordinal]??`${formation.id}/soldier/${ordinal}`,weaponId=weaponBindings?.[ordinal];
    requireThat(id(weaponId),'explicit stable weapon binding required');
    return {id:memberId,ordinal,status,position,weaponId,loadedRounds:override?.rounds??5,capacity:5,weaponCycle:'idle',coverId:null,
      rng:{state:hash32(`${seed}|${formation.id}|${memberId}|individual-xorshift32-v1`),draws:0},decisionSerial:0};
  });
  return {seed,sectorId:sector.id,formationId:formation.id,revision:sector.revision,anchor:copy(formation.position),members,
    reserveAmmunition:formation.ammunition,sectorRng:sector.rng,clocks:{localMs,battleMs,paused:false},
    resources:[],coverIds:[],objective:{id:formation.objective,progress:0},destructionRefs:[]};
}

export function representationBand(distanceM,previous){
  requireThat(Number.isFinite(distanceM)&&distanceM>=0&&(previous===null||['NEAR','MID','FAR'].includes(previous)),'gameplay distance/band');
  let band=distanceM<=150?'NEAR':distanceM<=800?'MID':'FAR';
  if(previous==='NEAR'&&distanceM<=170)band='NEAR';
  if(previous==='MID'&&distanceM>130&&distanceM<=820)band='MID';
  if(previous==='FAR'&&distanceM>780)band='FAR';return band;
}
export function relevance(state,{distanceM,interactionRelevant=false,missionRequired=false,simulationBudget=true}){
  requireThat([interactionRelevant,missionRequired,simulationBudget].every(v=>typeof v==='boolean'),'gameplay policy');
  const band=representationBand(distanceM,state.band),needed=band==='NEAR'||interactionRelevant||missionRequired;
  return {band,action:state.clocks.paused?'HOLD':state.mode==='AGGREGATED'?(needed&&simulationBudget?'ACQUIRE':'HOLD'):(needed?'HOLD':'RELEASE')};
}

export class AuthorityLeaseWorld {
  #state;#config;#phase=null;
  constructor(raw){
    const config=copy(raw);keys(config,['seed','sectorId','formationId','revision','anchor','members','reserveAmmunition','sectorRng','clocks','resources','coverIds','objective','destructionRefs']);
    requireThat(integer(config.seed,0xffffffff)&&id(config.sectorId)&&id(config.formationId)&&integer(config.sectorRng,0xffffffff),'world identity/RNG');
    keys(config.clocks,['localMs','battleMs','paused']);requireThat(integer(config.clocks.localMs)&&integer(config.clocks.battleMs)&&typeof config.clocks.paused==='boolean','clocks');
    requireThat(Array.isArray(config.members)&&config.members.length>0&&config.members.length<=MAX_MEMBERS,'member capacity');
    requireThat(Array.isArray(config.resources)&&config.resources.length<=32&&Array.isArray(config.coverIds)&&config.coverIds.length<=512&&new Set(config.coverIds).size===config.coverIds.length&&config.coverIds.every(id),'resource/cover catalog');
    const identity={formationId:config.formationId,sectorId:config.sectorId,memberIds:config.members.map(m=>m.id),weaponIds:config.members.map(m=>m.weaponId),
      resourceIds:config.resources.map(r=>r.id),coverIds:config.coverIds};
    const aggregate={revision:config.revision,updatedAt:config.clocks.localMs,anchor:config.anchor,members:config.members,
      reserveAmmunition:config.reserveAmmunition,resources:config.resources,objective:config.objective,destructionRefs:config.destructionRefs};
    validateCombat(aggregate,identity);
    this.#config=config;this.#state={identity,mode:'AGGREGATED',band:null,serial:0,clocks:config.clocks,
      sectorRng:{state:config.sectorRng,draws:0},aggregate,individual:null,lease:null,history:[]};
    requireThat(Buffer.byteLength(this.save())<=MAX_BYTES,'initial byte capacity');
  }
  #boundary(){requireThat(this.#phase===null,'unsafe transition boundary');}
  #live(){this.#boundary();requireThat(!this.#state.clocks.paused,'paused');}
  #commit(candidate,command){
    validateCombat(candidate.aggregate,candidate.identity);
    if(candidate.mode==='INDIVIDUAL')validateCombat(candidate.individual,candidate.identity);
    requireThat(candidate.history.length<MAX_COMMANDS,'command capacity');candidate.history.push(copy(command));
    requireThat(Buffer.byteLength(canonical({format:FORMAT,config:this.#config,state:candidate}))<=MAX_BYTES,'snapshot byte capacity');
    this.#state=candidate;
  }
  snapshot(){this.#boundary();return copy({format:FORMAT,config:this.#config,state:this.#state});}
  save(){return canonical(this.snapshot());}
  owner(){this.#boundary();return this.#state.mode;}
  combat(){this.#boundary();return copy(active(this.#state));}
  setPaused(paused){
    this.#boundary();requireThat(typeof paused==='boolean','pause value');if(paused===this.#state.clocks.paused)return;
    const c=copy(this.#state);c.clocks.paused=paused;this.#commit(c,{kind:'pause',paused});
  }
  clock(localMs,battleMs){
    this.#boundary();requireThat(integer(localMs)&&integer(battleMs),'clock value');if(this.#state.clocks.paused)return;
    requireThat(localMs>=this.#state.clocks.localMs&&battleMs>=this.#state.clocks.battleMs,'clock regression');
    if(localMs===this.#state.clocks.localMs&&battleMs===this.#state.clocks.battleMs)return;
    const c=copy(this.#state);c.clocks.localMs=localMs;c.clocks.battleMs=battleMs;active(c).updatedAt=localMs;active(c).revision++;
    this.#commit(c,{kind:'clock',localMs,battleMs});
  }
  acquire({expectedRevision},prepare=descriptor=>descriptor){
    this.#live();const s=this.#state;requireThat(s.mode==='AGGREGATED','duplicate acquire / already individual');
    requireThat(expectedRevision===s.aggregate.revision,'stale revision');
    this.#phase='MATERIALIZING';
    try{
      const c=copy(s),staged=c.aggregate.members.map(m=>prepare(copy(m)));
      const individual={...copy(c.aggregate),members:staged};validateCombat(individual,c.identity);
      requireThat(canonical(individual)===canonical(c.aggregate),'materialization altered authoritative state');
      const serial=c.serial+1;
      c.lease={id:`${c.identity.formationId}/lease/${serial}`,sectorId:c.identity.sectorId,formationId:c.identity.formationId,owner:'INDIVIDUAL',
        acquiredAtLocalMs:c.clocks.localMs,sourceRevision:c.aggregate.revision,sourceFingerprint:fingerprint(source(c)),memberIds:copy(c.identity.memberIds)};
      c.serial=serial;c.mode='INDIVIDUAL';c.individual=individual;
      this.#commit(c,{kind:'acquire',expectedRevision});return {lease:copy(c.lease),actors:copy(individual.members)};
    }finally{this.#phase=null;}
  }
  returnPayload(){this.#boundary();requireThat(this.#state.mode==='INDIVIDUAL','not individual owner');return {
    token:this.#state.lease.id,expectedRevision:this.#state.lease.sourceRevision,sourceFingerprint:this.#state.lease.sourceFingerprint,combat:copy(this.#state.individual)};}
  release(raw,preflight=()=>{}){
    this.#live();const input=copy(raw);this.#phase='DEMATERIALIZING';
    try{
      validateReturnCandidate(this.#state,input);const c=copy(this.#state);
      const result=preflight(copy(input.combat)); // Synchronous, data-only validation.
      requireThat(!result||typeof result.then!=='function','async preflight unsupported');
      c.aggregate=copy(input.combat);c.aggregate.revision++;c.aggregate.updatedAt=c.clocks.localMs;
      c.individual=null;c.lease=null;c.mode='AGGREGATED';
      this.#commit(c,{kind:'release',input});return copy(c.aggregate);
    }finally{this.#phase=null;}
  }
  reconcile(raw){
    this.#boundary();const policy={distanceM:raw.distanceM,interactionRelevant:raw.interactionRelevant??false,missionRequired:raw.missionRequired??false,simulationBudget:raw.simulationBudget??true};
    const decision=relevance(this.#state,policy);if(this.#state.clocks.paused)return decision;
    // Transfers finish first; a failure must not even change hysteresis memory.
    if(decision.action==='ACQUIRE')this.acquire({expectedRevision:this.#state.aggregate.revision});
    else if(decision.action==='RELEASE')this.release(this.returnPayload());
    const c=copy(this.#state);c.band=decision.band;this.#commit(c,{kind:'policy',policy});return decision;
  }
  mutate(raw){
    this.#live();const input=copy(raw);keys(input,['eventId','owner','token','operations']);
    requireThat(id(input.eventId)&&input.owner===this.#state.mode,'wrong authority');
    requireThat(input.owner==='INDIVIDUAL'?input.token===this.#state.lease.id:input.token===null,'lease token mismatch');
    requireThat(Array.isArray(input.operations)&&input.operations.length>0&&input.operations.length<=64,'operation capacity');
    const old=this.#state.history.find(h=>h.kind==='mutate'&&h.input.eventId===input.eventId);
    if(old){requireThat(canonical(old.input)===canonical(input),'conflicting duplicate event');return {applied:false,samples:[]};}
    const c=copy(this.#state),combat=active(c),samples=[];
    for(const op of input.operations)applyOperation(c,combat,op,input.owner,samples);
    combat.revision++;combat.updatedAt=c.clocks.localMs;validateCombat(combat,c.identity);
    this.#commit(c,{kind:'mutate',input});return {applied:true,samples};
  }
  static restore(text){
    requireThat(typeof text==='string'&&Buffer.byteLength(text)<=MAX_BYTES,'snapshot size');const raw=JSON.parse(text);finiteJSON(raw);keys(raw,['format','config','state']);
    requireThat(raw.format===FORMAT,'snapshot version');requireThat(Array.isArray(raw.state?.history)&&raw.state.history.length<=MAX_COMMANDS,'command history');
    const world=new AuthorityLeaseWorld(raw.config);
    for(const h of raw.state.history){
      if(h.kind==='pause')world.setPaused(h.paused);
      else if(h.kind==='clock')world.clock(h.localMs,h.battleMs);
      else if(h.kind==='acquire')world.acquire({expectedRevision:h.expectedRevision});
      else if(h.kind==='release')world.release(h.input);
      else if(h.kind==='mutate')world.mutate(h.input);
      else if(h.kind==='policy'){
        keys(h,['kind','policy']);keys(h.policy,['distanceM','interactionRelevant','missionRequired','simulationBudget']);
        // Acquire/release is already a recorded boundary command; replay just band memory.
        const decision=relevance(world.#state,h.policy),c=copy(world.#state);c.band=decision.band;world.#commit(c,h);
      }else throw Error('Authority lease: unknown history command');
    }
    requireThat(world.save()===canonical(raw),'snapshot replay inconsistency');return world;
  }
}

function applyOperation(state,c,op,owner,samples){
  requireThat(record(op),'operation record');
  if(op.type==='moveFormation'){
    keys(op,['type','position']);requireThat(owner==='AGGREGATED'&&point(op.position),'aggregate movement only');
    const d=Object.fromEntries(['x','y','z'].map(k=>[k,op.position[k]-c.anchor[k]]));
    for(const m of c.members)if(m.status==='combatReady')for(const k of ['x','y','z'])m.position[k]+=d[k];c.anchor=copy(op.position);return;
  }
  if(op.type==='anchor'){keys(op,['type','position']);requireThat(owner==='INDIVIDUAL'&&point(op.position),'individual anchor');c.anchor=copy(op.position);return;}
  if(op.type==='resupply'){keys(op,['type','amount']);requireThat(integer(op.amount)&&op.amount>0,'resupply amount');c.reserveAmmunition+=op.amount;return;}
  if(op.type==='progress'){keys(op,['type','amount']);requireThat(integer(op.amount)&&op.amount>0&&c.objective.progress+op.amount<=100,'progress amount');c.objective.progress+=op.amount;return;}
  if(op.type==='destructionRef'){
    keys(op,['type','id','revision','eventId']);requireThat(id(op.id)&&id(op.eventId)&&integer(op.revision),'destruction reference');
    const old=c.destructionRefs.find(r=>r.id===op.id);requireThat(!old||op.revision>old.revision,'stale destruction reference');
    const ref={id:op.id,revision:op.revision,eventId:op.eventId};if(old)c.destructionRefs[c.destructionRefs.indexOf(old)]=ref;else c.destructionRefs.push(ref);return;
  }
  if(op.type==='resource'){
    keys(op,['type','id','state','operatorId']);const r=c.resources.find(r=>r.id===op.id);requireThat(r,'unknown resource');
    const states=['operational','disabled','destroyed'];requireThat(states.includes(op.state)&&states.indexOf(op.state)>=states.indexOf(r.state),'resource resurrection');
    r.state=op.state;r.operatorId=op.operatorId;return;
  }
  const m=member(c,op.memberId);
  if(op.type==='casualty'||op.type==='exposure'){
    keys(op,['type','memberId','to'],op.type==='exposure'?['probability']:[]);
    requireThat(['wounded','dead'].includes(op.to),'casualty status');
    if(op.type==='exposure'){
      requireThat(owner==='AGGREGATED'&&Number.isFinite(op.probability)&&op.probability>=0&&op.probability<=1,'aggregate exposure only');
      requireThat(m.status==='combatReady'||m.status==='wounded','terminal member exposure');const roll=sectorDraw(state.sectorRng);samples.push(roll);if(roll>=op.probability)return;
    }
    if(m.status===op.to)return;
    requireThat(m.status==='combatReady'||m.status==='wounded'&&op.to==='dead','member resurrection/terminal state');m.status=op.to;m.coverId=null;
    for(const r of c.resources)if(r.operatorId===m.id)r.operatorId=null;return;
  }
  if(op.type==='evacuate'){
    keys(op,['type','memberId','position']);requireThat(m.status==='wounded'&&point(op.position),'evacuation requires wounded');m.status='evacuated';m.position=copy(op.position);m.coverId=null;return;
  }
  if(op.type==='move'){
    keys(op,['type','memberId','position'],['helperId']);requireThat(point(op.position),'member position');
    requireThat(m.status==='combatReady'||m.status==='wounded'&&op.helperId!==m.id&&member(c,op.helperId).status==='combatReady','dead/evacuated/unassisted wounded movement');
    m.position=copy(op.position);return;
  }
  if(op.type==='reload'||op.type==='fire'){
    keys(op,['type','memberId','amount']);requireThat(m.status==='combatReady'&&integer(op.amount)&&op.amount>0,'combat/ammo availability');
    if(op.type==='reload'){requireThat(op.amount<=c.reserveAmmunition&&m.loadedRounds+op.amount<=m.capacity,'reload conservation');c.reserveAmmunition-=op.amount;m.loadedRounds+=op.amount;m.weaponCycle='idle';}
    else {requireThat(op.amount<=m.loadedRounds,'insufficient loaded ammo');m.loadedRounds-=op.amount;m.weaponCycle='cycling';}return;
  }
  if(op.type==='cycle'){keys(op,['type','memberId','state']);requireThat(m.status==='combatReady'&&['idle','cycling','reloading'].includes(op.state),'weapon cycle');m.weaponCycle=op.state;return;}
  if(op.type==='cover'){keys(op,['type','memberId','coverId']);requireThat(m.status==='combatReady','cover requires combat ready');m.coverId=op.coverId;return;}
  if(op.type==='sampleAI'){keys(op,['type','memberId']);requireThat(owner==='INDIVIDUAL'&&m.status==='combatReady','individual RNG only');samples.push(actorDraw(m.rng));m.decisionSerial++;return;}
  throw Error('Authority lease: unknown operation');
}

export function demoConfig(seed=19390901){
  const formation={id:'m01_de_platoon_east',nominalStrength:20,runs:[{from:0,to:15,status:'combatReady'},{from:15,to:20,status:'dead'}],
    namedIds:{0:'de_east_named'},individuals:{},position:{x:900,y:0,z:40},initialPosition:{x:900,y:0,z:40},ammunition:100,objective:'m01_hold_local'};
  const config=configFromBattleSector({id:'m01_synthetic_east',rng:12345,revision:42,updatedAt:0},formation,seed,
    {weaponBindings:Object.fromEntries(Array.from({length:20},(_,n)=>[n,`ww:m01:platoon:${n}:rifle:0`]))});
  config.members.forEach(m=>m.loadedRounds=0);config.coverIds=['m01_cover_01','m01_cover_02'];
  config.resources=[{id:'mw:m01:synthetic_mg',kind:'mounted',state:'operational',operatorId:null},{id:'veh:m01:synthetic_truck',kind:'vehicle',state:'operational',operatorId:null}];return config;
}
export function runDemo({quality='HIGH',visible=true}={}){
  const world=new AuthorityLeaseWorld(demoConfig()),before=world.save();
  const policies=[149,151,148,152].map(distanceM=>world.reconcile({distanceM,quality,visible}));const lease=world.snapshot().state.lease;
  world.clock(10_000,16_200_000);const memberIds=world.snapshot().state.identity.memberIds;
  world.mutate({eventId:'m01_player_intervention',owner:'INDIVIDUAL',token:lease.id,operations:[
    {type:'casualty',memberId:memberIds[1],to:'dead'},{type:'casualty',memberId:memberIds[2],to:'dead'},
    ...[5,5,5,5,5,2].flatMap(amount=>[{type:'reload',memberId:memberIds[0],amount},{type:'fire',memberId:memberIds[0],amount}]),
    {type:'sampleAI',memberId:memberIds[0]},{type:'resource',id:'mw:m01:synthetic_mg',state:'destroyed',operatorId:null},
    {type:'resource',id:'veh:m01:synthetic_truck',state:'destroyed',operatorId:null},
    {type:'destructionRef',id:'m01_house_04',revision:1,eventId:'m01_external_house_hit'}]});
  const individual=world.save(),restored=AuthorityLeaseWorld.restore(individual);restored.reconcile({distanceM:171,quality,visible});
  const aggregate=restored.save(),c=restored.combat();requireThat(counts(c).dead===7&&c.reserveAmmunition===73,'demo casualty/ammo failure');
  return {before,individual,aggregate,policies,dead:counts(c).dead,reserve:c.reserveAmmunition,sectorRng:restored.snapshot().state.sectorRng};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2);requireThat(args.length===2&&args[0]==='--out','usage --out <directory>');
  const out=resolve(args[1]);mkdirSync(out,{recursive:true});
  const runs=[];for(const quality of ['LOW','MEDIUM','HIGH'])for(const visible of [false,true]){const r=runDemo({quality,visible});runs.push({quality,visible,
    individualFingerprint:fingerprint(JSON.parse(r.individual)),aggregateFingerprint:fingerprint(JSON.parse(r.aggregate)),dead:r.dead,reserve:r.reserve,policies:r.policies,sectorRng:r.sectorRng});}
  requireThat(runs.every(r=>r.aggregateFingerprint===runs[0].aggregateFingerprint&&r.individualFingerprint===runs[0].individualFingerprint),'quality/camera parity');
  writeFileSync(resolve(out,'scenario.json'),canonical({synthetic:true,runs,reference:runDemo()})+'\n');
  writeFileSync(resolve(out,'scenario.csv'),'quality,visible,dead,reserve,aggregate_rng_draws,acquires\n'+runs.map(r=>`${r.quality},${r.visible},${r.dead},${r.reserve},${r.sectorRng.draws},${r.policies.filter(p=>p.action==='ACQUIRE').length}`).join('\n')+'\n');
  console.log('6 authority scenarios PASS; dead 5→7, reserve 100→73, aggregate RNG draws 0');
}
