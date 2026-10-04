// One formation in one exclusively locked combat sector. No renderer, wall time or global RNG.
export const PILOT_IDS=Object.freeze(['de_east_36','de_east_37','de_east_38','de_east_39']);
export const PILOT_SECTOR='m01_pilot_lisewo_dike',PILOT_FORMATION='m01_pilot_dike_riflemen';
export const pilotActor=a=>PILOT_IDS.includes(typeof a==='string'?a:a?.id);
export const copy=v=>JSON.parse(JSON.stringify(v));
export const requirePilot=(ok,message)=>{if(!ok)throw Error(`M01 authority pilot: ${message}`);};
export const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export function hash32(s){let n=2166136261;for(const ch of s)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;return n||0x9e3779b9;}
export function draw(stream,individual=false){let n=stream.state;if(individual){n^=n<<13;n^=n>>>17;n^=n<<5;}else n=Math.imul(1664525,n)+1013904223;
  stream.state=n>>>0;stream.draws++;return stream.state/4294967296;}
export const activeCombat=s=>s.owner==='AGGREGATED'?s.aggregate:s.individual;
const source=s=>canonical({aggregate:s.aggregate,sectorRng:s.sectorRng});
const integer=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const finite=(n,min=-1e9,max=1e9)=>Number.isFinite(n)&&n>=min&&n<=max;
const keys=(v,names)=>requirePilot(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k)),'missing/unknown fields');
const point=p=>{keys(p,['x','y','z']);requirePilot(Object.values(p).every(n=>finite(n,-10000,10000)),'position');};
const stream=(r,individual=false)=>{keys(r,['state','draws']);requirePilot(integer(r.state,0xffffffff)&&(!individual||r.state!==0)&&integer(r.draws),'RNG');};
const weapon=w=>{keys(w,['loaded','cycle','until']);requirePilot(integer(w.loaded,5)&&['READY','BOLT_CYCLE','RELOAD_CLIP'].includes(w.cycle)&&finite(w.until,0),'weapon');};
export function pilotProjection(s,m){return {x:m.position.x,y:m.position.y,z:m.position.z,health:m.health,alive:m.status!=='dead',
  active:s.enabled,state:m.status==='dead'?'DOWN':m.status==='wounded'?'WOUNDED':m.action==='FIRE'?'SUPPRESS':m.action==='MOVE'?'ADVANCE':'GUARD',
  facing:m.facing,rounds:m.ammo.loaded,crouched:s.localClock<m.suppressedUntil,suppressedUntil:m.suppressedUntil,
  shot:m.shot,firedAt:m.firedAt,target:null};}
function validateCombat(c,s){
  keys(c,['revision','updatedAt','anchor','velocity','nextAggregateAt','reserve','spent','localProgress','members','retainedDead']);
  requirePilot(integer(c.revision)&&finite(c.updatedAt,0,s.localClock)&&finite(c.nextAggregateAt,0)&&integer(c.reserve,100)&&integer(c.spent)&&integer(c.localProgress,100),'combat scalar');
  point(c.anchor);keys(c.velocity,['x','z']);requirePilot(Object.values(c.velocity).every(n=>finite(n,-.5,.5)),'velocity');
  requirePilot(Array.isArray(c.members)&&c.members.length===4,'complete roster');
  for(const [i,m]of c.members.entries()){
    keys(m,['id','ordinal','weaponId','status','health','position','facing','suppressedUntil','shot','firedAt','ammo','rng','action','decisionAt','lastSeen']);
    requirePilot(m.id===PILOT_IDS[i]&&m.ordinal===i&&m.weaponId===`${PILOT_FORMATION}/weapon/${m.id}`,'member identity');point(m.position);
    requirePilot(['combatReady','wounded','dead'].includes(m.status)&&finite(m.health,0,100)&&(m.status==='dead')===(m.health===0),'member status');
    requirePilot([m.facing,m.firedAt].every(n=>finite(n))&&finite(m.suppressedUntil,0)&&finite(m.shot,0,1)&&finite(m.decisionAt,0),'member timers');
    requirePilot(['HOLD','OBSERVE','PINNED','RELOAD','FIRE','MOVE'].includes(m.action),'intent');if(m.lastSeen!==null){keys(m.lastSeen,['position','at']);point(m.lastSeen.position);requirePilot(finite(m.lastSeen.at,0,s.localClock),'observation');}
    weapon(m.ammo);stream(m.rng,true);
  }
  requirePilot(c.reserve+c.spent+c.members.reduce((n,m)=>n+m.ammo.loaded,0)===s.initialAmmunition,'ammo conservation');
  requirePilot(Array.isArray(c.retainedDead)&&c.retainedDead.length<=5,'retained bodies');
  c.retainedDead.forEach((m,i)=>{keys(m,['id','status','health','position']);requirePilot(m.id===`${PILOT_FORMATION}/soldier/${i}`&&m.status==='dead'&&m.health===0,'retained dead identity');point(m.position);});
}
export function validatePilotState(s,actors,clock,battleClock){
  keys(s,['version','sectorId','formationId','seed','owner','serial','localClock','battleClock','enabled','band','initialAmmunition','sectorRng','aggregate','individual','lease','receipts']);
  requirePilot(s.version===1&&s.sectorId===PILOT_SECTOR&&s.formationId===PILOT_FORMATION&&integer(s.seed,0xffffffff),'version/identity');
  requirePilot(['AGGREGATED','INDIVIDUAL'].includes(s.owner)&&integer(s.serial)&&typeof s.enabled==='boolean'&&[null,'NEAR','MID','FAR'].includes(s.band),'owner/band');
  requirePilot(finite(s.localClock,0,clock)&&finite(s.battleClock,16200,battleClock)&&integer(s.initialAmmunition,120)&&s.initialAmmunition>=100,'clocks/ammo');
  stream(s.sectorRng);validateCombat(s.aggregate,s);
  if(s.owner==='AGGREGATED')requirePilot(s.individual===null&&s.lease===null,'double owner');
  else{
    requirePilot(s.individual&&s.lease,'missing individual owner');validateCombat(s.individual,s);
    keys(s.lease,['id','generation','owner','sourceRevision','sourceFingerprint','acquiredAt','memberIds']);
    requirePilot(s.lease.id===`${PILOT_FORMATION}/lease/${s.serial}`&&s.lease.generation===s.serial&&s.serial>0&&s.lease.owner==='INDIVIDUAL'&&
      s.lease.sourceRevision===s.aggregate.revision&&s.lease.sourceFingerprint===source(s)&&finite(s.lease.acquiredAt,0,s.localClock)&&
      canonical(s.lease.memberIds)===canonical(PILOT_IDS),'lease fencing/frozen sector');
    requirePilot(s.individual.revision>=s.aggregate.revision&&canonical(s.individual.retainedDead)===canonical(s.aggregate.retainedDead),'individual revision/history');
    s.aggregate.members.forEach((old,i)=>{const m=s.individual.members[i];requirePilot(m.health<=old.health&&!(old.status==='dead'&&m.status!=='dead'),'resurrection/healing');
      if(old.status==='dead')requirePilot(canonical(old.position)===canonical(m.position),'dead body moved');});
  }
  requirePilot(Array.isArray(s.receipts)&&s.receipts.length<=256&&new Set(s.receipts.map(r=>r.id)).size===s.receipts.length,'receipt capacity/duplicates');
  s.receipts.forEach(r=>{keys(r,['id','envelope']);requirePilot(typeof r.id==='string'&&r.id.length>0&&r.id.length<=180&&typeof r.envelope==='string'&&r.envelope.length<10000,'receipt');});
  if(actors)for(const m of activeCombat(s).members){const a=actors.find(a=>a.id===m.id),p=pilotProjection(s,m);
    requirePilot(a&&a.group==='grp_de_east'&&a.weapon==='kar98k'&&a.team==='enemy'&&!a.essential,'bound roster actor');
    requirePilot(Object.entries(p).every(([k,v])=>canonical(a[k]??null)===canonical(v)),'actor projection diverged / competing owner');}
  return s;
}
export function physicalBand(distance,previous){
  requirePilot(finite(distance,0)&&[null,'NEAR','MID','FAR'].includes(previous),'distance/band');
  if(previous==='NEAR'&&distance<=170)return 'NEAR';
  if(previous==='MID'&&distance>130&&distance<=820)return 'MID';
  if(previous==='FAR'&&distance>780)return 'FAR';
  return distance<=150?'NEAR':distance<=800?'MID':'FAR';
}
export const pilotCounts=c=>({alive:c.members.filter(m=>m.status!=='dead').length,dead:c.retainedDead.length+c.members.filter(m=>m.status==='dead').length});

export class M01AuthorityCoordinator {
  #state;#actors;#phase=null;
  constructor(actors,seed,{clock=0,battleClock=16200,enabled=false,retainedDead=[]}={}){
    this.#actors=actors;
    const members=PILOT_IDS.map((id,i)=>{const a=actors.find(a=>a.id===id);requirePilot(a,'missing pilot actor');return {id,ordinal:i,weaponId:`${PILOT_FORMATION}/weapon/${id}`,
      status:a.alive?(a.state==='WOUNDED'?'wounded':'combatReady'):'dead',health:a.health,position:{x:a.x,y:a.y,z:a.z},facing:a.facing,
      suppressedUntil:a.suppressedUntil,shot:a.shot,firedAt:a.firedAt??-1e9,ammo:{loaded:a.rounds,cycle:'READY',until:0},
      rng:{state:hash32(`${seed>>>0}|${PILOT_FORMATION}|${id}|individual-xorshift32-v1`),draws:0},action:'HOLD',decisionAt:clock,lastSeen:null};});
    const anchor={x:members.reduce((n,m)=>n+m.position.x,0)/4,y:members.reduce((n,m)=>n+m.position.y,0)/4,z:members.reduce((n,m)=>n+m.position.z,0)/4};
    const aggregate={revision:0,updatedAt:clock,anchor,velocity:{x:0,z:0},nextAggregateAt:clock+2,reserve:100,spent:0,localProgress:0,members,retainedDead:copy(retainedDead)};
    this.#state={version:1,sectorId:PILOT_SECTOR,formationId:PILOT_FORMATION,seed:seed>>>0,owner:'AGGREGATED',serial:0,localClock:clock,battleClock,enabled,band:null,
      initialAmmunition:100+members.reduce((n,m)=>n+m.ammo.loaded,0),sectorRng:{state:(seed^hash32(PILOT_SECTOR))>>>0,draws:0},aggregate,individual:null,lease:null,receipts:[]};
    this.#publish(this.#state);
  }
  static restore(raw,actors,clock,battleClock){validatePilotState(raw,actors,clock,battleClock);const c=new M01AuthorityCoordinator(actors,raw.seed,{clock:raw.localClock,battleClock:raw.battleClock,enabled:raw.enabled});c.#publish(copy(raw));return c;}
  #boundary(){requirePilot(this.#phase===null,'unsafe transaction boundary');}
  #publish(c){
    validatePilotState(c,null,c.localClock,c.battleClock);
    const projections=activeCombat(c).members.map(m=>({actor:this.#actors.find(a=>a.id===m.id),value:pilotProjection(c,m)}));
    for(const {actor,value}of projections)requirePilot(actor&&Object.getPrototypeOf(actor)===Object.prototype&&Object.isExtensible(actor)&&
      Object.keys(value).every(k=>!Object.hasOwn(actor,k)||Object.getOwnPropertyDescriptor(actor,k)?.writable),'actor publication preflight');
    for(const {actor,value}of projections)Object.assign(actor,value);
    this.#state=c;
  }
  snapshot(){this.#boundary();this.assertOwner();return copy(this.#state);}
  assertOwner(){validatePilotState(this.#state,this.#actors,this.#state.localClock,this.#state.battleClock);return this.#state.owner;}
  get owner(){return this.#state.owner;}
  get token(){return this.#state.lease?.id??null;}
  get revision(){return activeCombat(this.#state).revision;}
  #acquire(c,expectedRevision,prepare){
    requirePilot(c.owner==='AGGREGATED','duplicate acquire');requirePilot(expectedRevision===c.aggregate.revision,'stale acquire revision');
    this.#phase='MATERIALIZING';
    try{const staged=c.aggregate.members.map(m=>prepare(copy(m)));requirePilot(canonical(staged)===canonical(c.aggregate.members),'materialization changed descriptor');
      c.serial++;c.individual=copy(c.aggregate);c.individual.updatedAt=c.localClock;c.individual.revision++;
      c.lease={id:`${PILOT_FORMATION}/lease/${c.serial}`,generation:c.serial,owner:'INDIVIDUAL',sourceRevision:c.aggregate.revision,sourceFingerprint:source(c),acquiredAt:c.localClock,memberIds:[...PILOT_IDS]};c.owner='INDIVIDUAL';
    }finally{this.#phase=null;}
  }
  acquire(expectedRevision=this.#state.aggregate.revision,prepare=m=>m){this.#boundary();this.assertOwner();const c=copy(this.#state);this.#acquire(c,expectedRevision,prepare);this.#publish(c);return this.token;}
  returnPayload(){this.#boundary();this.assertOwner();requirePilot(this.owner==='INDIVIDUAL','return without individual owner');return {
    token:this.token,generation:this.#state.serial,sourceRevision:this.#state.lease.sourceRevision,sourceFingerprint:this.#state.lease.sourceFingerprint,combat:copy(this.#state.individual)};}
  #release(c,payload,prepare){
    this.#phase='DEMATERIALIZING';
    try{keys(payload,['token','generation','sourceRevision','sourceFingerprint','combat']);requirePilot(c.owner==='INDIVIDUAL'&&payload.token===c.lease.id&&payload.generation===c.serial&&
      payload.sourceRevision===c.aggregate.revision&&payload.sourceFingerprint===source(c),'stale return');validateCombat(payload.combat,c);
      requirePilot(canonical(payload.combat)===canonical(c.individual),'partial/altered return');const result=prepare(copy(payload.combat));requirePilot(!result||typeof result.then!=='function','async return preflight');
      c.aggregate=copy(payload.combat);c.aggregate.revision++;c.aggregate.updatedAt=c.localClock;c.aggregate.nextAggregateAt=c.localClock+2;
      c.aggregate.velocity={x:0,z:0};c.individual=null;c.lease=null;c.owner='AGGREGATED';
    }finally{this.#phase=null;}
  }
  release(payload=this.returnPayload(),prepare=()=>{}){this.#boundary();this.assertOwner();const c=copy(this.#state);this.#release(c,payload,prepare);this.#publish(c);}
  setEnabled(enabled){this.#boundary();requirePilot(typeof enabled==='boolean','activation');if(enabled===this.#state.enabled)return;const c=copy(this.#state);c.enabled=enabled;this.#publish(c);}
  advance(clock,battleClock,{distance,interactionRelevant=false,paused=false,step,prepare=m=>m}={}){
    this.#boundary();this.assertOwner();requirePilot(typeof paused==='boolean'&&typeof interactionRelevant==='boolean','policy');if(paused)return [];
    requirePilot(finite(clock,this.#state.localClock)&&finite(battleClock,this.#state.battleClock),'clock regression');if(clock===this.#state.localClock)return [];
    const c=copy(this.#state);c.localClock=clock;c.battleClock=battleClock;
    const band=physicalBand(distance,c.band),needed=c.enabled&&(band==='NEAR'||interactionRelevant);
    if(c.owner==='AGGREGATED'&&needed)this.#acquire(c,c.aggregate.revision,prepare);
    else if(c.owner==='INDIVIDUAL'&&!needed)this.#release(c,{token:c.lease.id,generation:c.serial,sourceRevision:c.lease.sourceRevision,sourceFingerprint:c.lease.sourceFingerprint,combat:copy(c.individual)},()=>{});
    c.band=band;const before=source(c),events=step?step(c):[];
    if(c.owner==='INDIVIDUAL')requirePilot(source(c)===before,'aggregate mutating resolver ran under individual lease');
    this.#publish(c);return events;
  }
  operate({eventId,owner,token,operations},apply){
    this.#boundary();this.assertOwner();requirePilot(owner===this.owner&&(owner==='INDIVIDUAL'?token===this.token:token===null),'wrong/stale owner');
    requirePilot(typeof eventId==='string'&&eventId.length>0&&eventId.length<=180&&Array.isArray(operations)&&operations.length>0,'command envelope');
    const envelope=canonical({owner,token,operations}),old=this.#state.receipts.find(r=>r.id===eventId);
    if(old){requirePilot(old.envelope===envelope,'conflicting duplicate event');return {applied:false,events:[]};}
    requirePilot(this.#state.receipts.length<256,'receipt capacity');const c=copy(this.#state),before=source(c);const events=apply(c,copy(operations));
    if(owner==='INDIVIDUAL')requirePilot(source(c)===before,'aggregate command under lease');
    activeCombat(c).revision++;c.receipts.push({id:eventId,envelope});this.#publish(c);return {applied:true,events};
  }
  diagnostics(){const c=activeCombat(this.#state);return {sectorId:PILOT_SECTOR,formationId:PILOT_FORMATION,authorityOwner:this.owner,
    leaseId:this.token,generation:this.#state.serial,revision:c.revision,memberIds:[...PILOT_IDS],aggregateRng:copy(this.#state.sectorRng),
    individualMemberCount:this.owner==='INDIVIDUAL'?4:0,counts:pilotCounts(c),reserve:c.reserve,loaded:c.members.reduce((n,m)=>n+m.ammo.loaded,0),spent:c.spent,
    localClock:this.#state.localClock,battleClock:this.#state.battleClock,band:this.#state.band};}
}
