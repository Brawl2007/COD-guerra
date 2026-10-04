/** Data-only architecture prototype. No imports from src, clocks, rendering or global RNG. */
import {createHash} from 'node:crypto';
export const FORMAT='per-formation-authority-prototype/v1';
export const RNG_TAG='formation-lcg32-v1/member-xorshift32-v1';
export const copy=v=>structuredClone(v);
const check=(ok,message)=>{if(!ok)throw Error(`Formation prototype: ${message}`);};
const integer=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const id=s=>typeof s==='string'&&/^[A-Za-z0-9_:/.-]{1,180}$/.test(s);
const compare=(a,b)=>a<b?-1:a>b?1:0;
const fields=(o,ks)=>check(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k)),'missing/unknown fields');
export function canonical(o){
  if(Array.isArray(o))return '['+o.map(canonical).join(',')+']';
  if(o&&typeof o==='object')return '{'+Object.keys(o).sort(compare).map(k=>JSON.stringify(k)+':'+canonical(o[k])).join(',')+'}';
  check(o!==undefined&&(typeof o!=='number'||Number.isFinite(o)),'non-JSON data');return JSON.stringify(o);
}
export const checksum=o=>createHash('sha256').update(canonical(o)).digest('hex');
export function deriveRng(seed,sectorId,formationId,memberId=null){
  check(integer(seed,0xffffffff)&&id(sectorId)&&id(formationId)&&(memberId===null||id(memberId)),'RNG inputs');
  const h=createHash('sha256').update(canonical([RNG_TAG,memberId===null?'formation':'member',seed,sectorId,formationId,memberId])).digest();
  return {state:h.readUInt32BE(0)||0x9e3779b9,draws:0};
}
export function draw(r,member=false){
  let n=r.state;if(member){n^=n<<13;n^=n>>>17;n^=n<<5;}else n=Math.imul(n,1664525)+1013904223;
  r.state=n>>>0;r.draws++;return r.state;
}
const point=p=>{fields(p,['x','y','z']);check(Object.values(p).every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=1e9),'position mm');};
const stream=(r,member=false)=>{fields(r,['state','draws']);check(integer(r.state,0xffffffff)&&(!member||r.state>0)&&integer(r.draws),'RNG');};
export const active=f=>f.owner==='AGGREGATED'?f.aggregate:f.individual;
export const counts=c=>Object.fromEntries(['combatReady','wounded','dead','evacuated'].map(s=>[s,c.members.filter(m=>m.status===s).length]));
const find=(s,fid)=>{const f=s.formations.find(f=>f.id===fid);check(f,'unknown formation');return f;};
const member=(c,mid)=>{const m=c.members.find(m=>m.id===mid);check(m,'unknown member');return m;};
const fingerprint=f=>checksum({sectorId:f.sectorId,formationId:f.id,aggregate:f.aggregate});
function validateCombat(c,f,clock){
  fields(c,['revision','updatedAt','rng','anchor','reserve','spent','received','suppression','objective','destructionRefs','members']);
  check(['revision','updatedAt','reserve','spent','received','suppression','objective'].every(k=>integer(c[k]))&&c.updatedAt<=clock,'combat scalar');stream(c.rng);point(c.anchor);
  check(Array.isArray(c.members)&&c.members.length===f.strength,'complete roster');
  c.members.forEach((m,i)=>{fields(m,['id','ordinal','weaponId','status','position','loaded','rng']);
    check(m.ordinal===i&&m.id===`${f.id}/soldier/${i}`&&m.weaponId===`${f.id}/weapon/${i}`,'member identity/order');
    check(['combatReady','wounded','dead','evacuated'].includes(m.status)&&integer(m.loaded,5),'member combat');point(m.position);stream(m.rng,true);
  });
  check(c.reserve+c.spent+c.members.reduce((a,m)=>a+m.loaded,0)===f.initialAmmo+c.received,'local ammo conservation');validateRefs(c.destructionRefs);
}
function validateRefs(rs){check(Array.isArray(rs)&&rs.every((r,i)=>{fields(r,['id','version']);return id(r.id)&&integer(r.version)&&(!i||compare(rs[i-1].id,r.id)<0);}), 'destruction references');}
function validate(s){
  fields(s,['format','rngTag','seed','lineage','clock','battleClock','quantumMs','sectorId','formations','shared','receipts']);
  check(s.format===FORMAT&&s.rngTag===RNG_TAG&&integer(s.seed,0xffffffff)&&id(s.sectorId)&&integer(s.clock)&&integer(s.battleClock)&&s.quantumMs===100,'version/clock');
  fields(s.lineage,['version','boundary','derivationSeed','legacyDigest','legacySectorRng']);
  check(s.lineage.version===1&&integer(s.lineage.boundary)&&s.lineage.boundary<=s.clock&&integer(s.lineage.derivationSeed,0xffffffff)&&
    ((s.lineage.legacyDigest===null&&s.lineage.legacySectorRng===null)||(/^[a-f0-9]{64}$/.test(s.lineage.legacyDigest)&&s.lineage.legacySectorRng!==null)),'lineage');
  if(s.lineage.legacySectorRng!==null)stream(s.lineage.legacySectorRng);
  check(Array.isArray(s.formations)&&s.formations.length>0&&s.formations.length<=100,'formations');
  s.formations.forEach((f,i)=>{fields(f,['id','sectorId','strength','initialAmmo','generation','owner','aggregate','individual','lease']);
    check(id(f.id)&&f.sectorId===s.sectorId&&integer(f.strength,100)&&f.strength>0&&integer(f.initialAmmo)&&integer(f.generation)&&
      ['AGGREGATED','INDIVIDUAL'].includes(f.owner)&&(!i||compare(s.formations[i-1].id,f.id)<0),'formation identity/order');
    validateCombat(f.aggregate,f,s.clock);
    if(f.owner==='AGGREGATED')check(f.individual===null&&f.lease===null,'double owner');
    else{validateCombat(f.individual,f,s.clock);const l=f.lease;
      fields(l,['id','sectorId','formationId','owner','generation','sourceRevision','sourceFingerprint','acquiredAt','memberIds','sharedSectorRevision']);
      check(l.id===`${f.sectorId}/${f.id}/lease/${f.generation}`&&l.sectorId===f.sectorId&&l.formationId===f.id&&l.owner==='INDIVIDUAL'&&
        f.generation>0&&l.generation===f.generation&&l.sourceRevision===f.aggregate.revision&&l.sourceFingerprint===fingerprint(f)&&
        integer(l.acquiredAt)&&l.acquiredAt<=s.clock&&canonical(l.memberIds)===canonical(f.aggregate.members.map(m=>m.id))&&
        (l.sharedSectorRevision===null||integer(l.sharedSectorRevision)),'lease fencing');
      check(f.individual.revision>=f.aggregate.revision&&canonical(f.individual.rng)===canonical(f.aggregate.rng),'frozen aggregate RNG');
      f.aggregate.members.forEach((old,j)=>{const m=f.individual.members[j];if(['dead','evacuated'].includes(old.status))check(m.status===old.status&&canonical(m.position)===canonical(old.position),'resurrection/terminal movement');});
    }
  });
  fields(s.shared,['revision','initialReserve','reserve','delivered','destructionRefs','control','macroObjective','artillery']);
  check(['revision','initialReserve','reserve','macroObjective','artillery'].every(k=>integer(s.shared[k]))&&s.shared.control==='neutral','shared scalars');
  check(s.shared.delivered&&typeof s.shared.delivered==='object'&&!Array.isArray(s.shared.delivered)&&Object.keys(s.shared.delivered).length===s.formations.length&&
    s.formations.every(f=>integer(s.shared.delivered[f.id])&&active(f).received===s.shared.delivered[f.id]),'shared deliveries');
  check(s.shared.reserve+Object.values(s.shared.delivered).reduce((a,n)=>a+n,0)===s.shared.initialReserve,'shared conservation');validateRefs(s.shared.destructionRefs);
  check(Array.isArray(s.receipts)&&s.receipts.length<=50000,'receipt capacity');
  s.receipts.forEach((r,i)=>{fields(r,['id','envelope','result']);check(id(r.id)&&typeof r.envelope==='string'&&(!i||compare(s.receipts[i-1].id,r.id)<0),'receipt identity/order');
    const e=JSON.parse(r.envelope);validateEvent(e,s);check(e.id===r.id&&canonical(e)===r.envelope&&e.at<=s.clock,'receipt envelope');
    check(r.result&&typeof r.result.applied==='boolean'&&Object.keys(r.result).every(k=>['applied','reason'].includes(k)),'receipt result');
  });return s;
}
function authority(f,a){fields(a,['owner','token','generation']);check(a.owner===f.owner&&a.generation===f.generation&&a.token===(f.lease?.id??null),'wrong/stale authority');}
function loss(c,mid,status){
  const m=member(c,mid);check(['dead','wounded','evacuated'].includes(status),'loss status');if(m.status===status)return;
  check(!['dead','evacuated'].includes(m.status)&&!(status==='evacuated'&&m.status!=='wounded')&&!(status==='wounded'&&m.status!=='combatReady'),'terminal/resurrection');m.status=status;
}
function fire(c,mid,n){const m=member(c,mid);check(m.status==='combatReady'&&integer(n)&&n>0&&m.loaded>=n,'fire ammo');m.loaded-=n;c.spent+=n;}
function updateRef(rs,r){const old=rs.find(v=>v.id===r.id);check(!old||r.version>=old.version,'stale destruction');if(old)old.version=r.version;else rs.push(copy(r));rs.sort((a,b)=>compare(a.id,b.id));}
export function envelope({id:eventId,at,formationId='',type,payload,authority:auth=null,sectorId='S'}){return {id:eventId,at,sectorId,formationId,type,payload:copy(payload),authority:copy(auth)};}
function validateEvent(e,s){
  fields(e,['id','at','sectorId','formationId','type','payload','authority']);check(id(e.id)&&integer(e.at)&&e.sectorId===s.sectorId&&typeof e.formationId==='string','event envelope');
  const shapes={loss:['memberId','status'],fire:['memberId','rounds'],reload:['memberId','rounds'],sharedSpend:['amount','expectedSharedRevision'],attack:['memberId','targetFormationId','targetMemberId','status'],suppress:['targetFormationId','amount'],artillery:['targets'],destruction:['reference','targets']};
  check(Object.hasOwn(shapes,e.type),'unknown event');fields(e.payload,shapes[e.type]);
  if(['artillery','destruction'].includes(e.type))check(e.formationId===''&&e.authority===null,'sector envelope');else check(id(e.formationId)&&s.formations.some(f=>f.id===e.formationId),'event formation');
  if(e.type==='artillery')check(Array.isArray(e.payload.targets)&&e.payload.targets.length>0&&e.payload.targets.every(t=>{fields(t,['formationId','memberId','status']);return id(t.formationId)&&id(t.memberId)&&['dead','wounded'].includes(t.status);})&&new Set(e.payload.targets.map(t=>t.memberId)).size===e.payload.targets.length,'artillery targets');
  if(e.type==='destruction'){fields(e.payload.reference,['id','version']);check(id(e.payload.reference.id)&&integer(e.payload.reference.version)&&Array.isArray(e.payload.targets)&&e.payload.targets.length>0&&e.payload.targets.every(id)&&new Set(e.payload.targets).size===e.payload.targets.length,'destruction targets');}
}
function applyEvent(s,e,sharedBase){
  validateEvent(e,s);const serialized=canonical(e),old=s.receipts.find(r=>r.id===e.id);if(old){check(old.envelope===serialized,'conflicting duplicate');return copy(old.result);}
  check(s.receipts.length<50000,'receipt capacity');let result={applied:true};
  if(e.formationId){const f=find(s,e.formationId),c=active(f),p=e.payload;authority(f,e.authority);
    if(e.type==='loss')loss(c,p.memberId,p.status);
    if(e.type==='fire')fire(c,p.memberId,p.rounds);
    if(e.type==='reload'){const m=member(c,p.memberId);check(m.status==='combatReady'&&integer(p.rounds)&&p.rounds>0&&p.rounds<=Math.min(5-m.loaded,c.reserve),'reload amount');m.loaded+=p.rounds;c.reserve-=p.rounds;}
    if(e.type==='sharedSpend'){check(integer(p.amount)&&p.amount>0&&integer(p.expectedSharedRevision)&&p.expectedSharedRevision===sharedBase,'stale shared request');
      if(p.amount>s.shared.reserve)result={applied:false,reason:'insufficient reserve'};else{s.shared.reserve-=p.amount;s.shared.delivered[f.id]+=p.amount;c.reserve+=p.amount;c.received+=p.amount;}s.shared.revision++;
    }
    if(e.type==='attack'){check(p.targetFormationId!==f.id,'cross target');fire(c,p.memberId,1);const target=active(find(s,p.targetFormationId));loss(target,p.targetMemberId,p.status);target.revision++;}
    if(e.type==='suppress'){check(p.targetFormationId!==f.id&&integer(p.amount)&&p.amount>0,'suppression');const target=active(find(s,p.targetFormationId));check(integer(target.suppression+p.amount),'overflow');target.suppression+=p.amount;target.revision++;}
    if(result.applied)c.revision++;
  }else if(e.type==='artillery'){for(const t of [...e.payload.targets].sort((a,b)=>compare(a.formationId,b.formationId)||compare(a.memberId,b.memberId))){const c=active(find(s,t.formationId));loss(c,t.memberId,t.status);c.revision++;}s.shared.artillery++;s.shared.revision++;
  }else if(e.type==='destruction'){updateRef(s.shared.destructionRefs,e.payload.reference);s.shared.revision++;
    for(const fid of [...e.payload.targets].sort(compare)){const c=active(find(s,fid));updateRef(c.destructionRefs,e.payload.reference);c.revision++;}
  }
  s.receipts.push({id:e.id,envelope:serialized,result});s.receipts.sort((a,b)=>compare(a.id,b.id));return copy(result);
}
function autoStep(f,at){
  const c=active(f),dt=at-c.updatedAt,live=c.members.filter(m=>m.status==='combatReady');check(dt>=0,'clock regression');
  if(f.owner==='AGGREGATED'){const r=draw(c.rng);if(live.length){const m=live[r%live.length];if(m.loaded){m.loaded--;c.spent++;}else{const n=Math.min(5,c.reserve);c.reserve-=n;m.loaded+=n;}}for(const m of live)m.position.x+=Math.round((r%3-1)*dt/100);
  }else for(const m of live){const r=draw(m.rng,true);m.position.x+=Math.round((r%3-1)*dt/100);}
  if(live.length)c.anchor=copy(live[0].position);c.updatedAt=at;c.revision++;
}
export class FormationWorld {
  #s;#phase=null;
  constructor({seed=19390901,sectorId='S',formations=[{id:'A',dead:5},{id:'B',dead:3},{id:'C',dead:0}],sectorReserve=100}={}){
    check(integer(seed,0xffffffff)&&id(sectorId)&&Array.isArray(formations)&&integer(sectorReserve),'config');
    this.#s={format:FORMAT,rngTag:RNG_TAG,seed,lineage:{version:1,boundary:0,derivationSeed:seed,legacyDigest:null,legacySectorRng:null},clock:0,battleClock:16200000,quantumMs:100,sectorId,
      formations:formations.map(d=>{const strength=d.strength??12,dead=d.dead??0;check(id(d.id)&&integer(strength,100)&&strength>0&&integer(dead,strength),'formation config');
        const members=Array.from({length:strength},(_,ordinal)=>({id:`${d.id}/soldier/${ordinal}`,ordinal,weaponId:`${d.id}/weapon/${ordinal}`,status:ordinal<dead?'dead':'combatReady',position:{x:ordinal*1000,y:0,z:0},loaded:5,rng:deriveRng(seed,sectorId,d.id,`${d.id}/soldier/${ordinal}`)}));
        return {id:d.id,sectorId,strength,initialAmmo:100+strength*5,generation:0,owner:'AGGREGATED',aggregate:{revision:0,updatedAt:0,rng:deriveRng(seed,sectorId,d.id),anchor:{x:0,y:0,z:0},reserve:100,spent:0,received:0,suppression:0,objective:0,destructionRefs:[],members},individual:null,lease:null};
      }).sort((a,b)=>compare(a.id,b.id)),shared:{revision:0,initialReserve:sectorReserve,reserve:sectorReserve,delivered:Object.fromEntries(formations.map(f=>[f.id,0])),destructionRefs:[],control:'neutral',macroObjective:0,artillery:0},receipts:[]};validate(this.#s);
  }
  #boundary(){check(this.#phase===null,'unsafe transition/reentrant operation');}
  #commit(s){validate(s);this.#s=s;}
  snapshot(){this.#boundary();return copy(this.#s);}
  save(){this.#boundary();return {format:FORMAT,payload:copy(this.#s),checksum:checksum(this.#s)};}
  static restore(raw,{generationFloor={}}={}){
    fields(raw,['format','payload','checksum']);check(raw.format===FORMAT&&raw.checksum===checksum(raw.payload),'save checksum/format');const s=copy(raw.payload);validate(s);
    for(const [fid,min]of Object.entries(generationFloor))check(integer(min)&&find(s,fid).generation>=min,'stale generation restore');
    const w=new FormationWorld({seed:s.seed,sectorId:s.sectorId,formations:s.formations.map(f=>({id:f.id,strength:f.strength}))});w.#s=s;return w;
  }
  restoreInto(raw){this.#boundary();const candidate=FormationWorld.restore(raw,{generationFloor:Object.fromEntries(this.#s.formations.map(f=>[f.id,f.generation]))}).snapshot();
    check(candidate.sectorId===this.#s.sectorId&&candidate.seed===this.#s.seed&&canonical(candidate.lineage)===canonical(this.#s.lineage)&&canonical(candidate.formations.map(f=>[f.id,f.strength]))===canonical(this.#s.formations.map(f=>[f.id,f.strength])),'restore lineage/roster');
    check(candidate.clock>=this.#s.clock&&candidate.battleClock>=this.#s.battleClock&&candidate.shared.revision>=this.#s.shared.revision&&
      this.#s.formations.every(f=>active(find(candidate,f.id)).revision>=active(f).revision)&&
      this.#s.receipts.every(r=>candidate.receipts.some(next=>canonical(next)===canonical(r))),'stale in-place restore');
    this.#commit(candidate);}
  formation(fid){return copy(find(this.#s,fid));}
  authority(fid){const f=find(this.#s,fid);return {owner:f.owner,token:f.lease?.id??null,generation:f.generation};}
  retry(e){this.#boundary();validateEvent(e,this.#s);const r=this.#s.receipts.find(r=>r.id===e.id);check(r&&r.envelope===canonical(e),'unknown/conflicting retry');return copy(r.result);}
  reconcileShared(fid,{authority:auth,expectedSharedRevision,prepare}){
    this.#boundary();const s=copy(this.#s),f=find(s,fid);authority(f,auth);
    check(f.owner==='INDIVIDUAL'&&f.lease.sharedSectorRevision!==null&&expectedSharedRevision===s.shared.revision&&typeof prepare==='function','shared reconciliation fence');
    this.#phase='RECONCILING_DEPENDENCY';
    try{check(prepare(copy(s.shared),copy(f.individual))===true,'shared reconciliation rejected');
      f.lease.sharedSectorRevision=s.shared.revision;f.individual.revision++;this.#commit(s);return copy(f.lease);
    }finally{this.#phase=null;}
  }
  acquire(fid,{expectedRevision=active(find(this.#s,fid)).revision,sharedSectorRevision=null,prepare=m=>m}={}){
    this.#boundary();const s=copy(this.#s),f=find(s,fid);check(f.owner==='AGGREGATED'&&f.aggregate.revision===expectedRevision,'duplicate/stale acquire');check(sharedSectorRevision===null||sharedSectorRevision===s.shared.revision,'shared lease fence');this.#phase='MATERIALIZING';
    try{const staged=f.aggregate.members.map(m=>prepare(copy(m)));check(canonical(staged)===canonical(f.aggregate.members),'materialization descriptors');f.generation++;f.individual=copy(f.aggregate);f.individual.updatedAt=s.clock;f.individual.revision++;
      f.lease={id:`${f.sectorId}/${f.id}/lease/${f.generation}`,sectorId:f.sectorId,formationId:f.id,owner:'INDIVIDUAL',generation:f.generation,sourceRevision:f.aggregate.revision,sourceFingerprint:fingerprint(f),acquiredAt:s.clock,memberIds:f.aggregate.members.map(m=>m.id),sharedSectorRevision};f.owner='INDIVIDUAL';this.#commit(s);return copy(f.lease);
    }finally{this.#phase=null;}
  }
  returnPayload(fid){this.#boundary();const f=find(this.#s,fid);check(f.owner==='INDIVIDUAL','return without lease');return {lease:copy(f.lease),combat:copy(f.individual)};}
  release(fid,payload=this.returnPayload(fid),prepare=c=>c){
    this.#boundary();const s=copy(this.#s),f=find(s,fid);fields(payload,['lease','combat']);check(f.owner==='INDIVIDUAL'&&canonical(payload.lease)===canonical(f.lease)&&f.lease.sourceRevision===f.aggregate.revision&&f.lease.sourceFingerprint===fingerprint(f),'stale return');
    check(f.lease.sharedSectorRevision===null||f.lease.sharedSectorRevision===s.shared.revision,'stale shared dependency');check(canonical(payload.combat)===canonical(f.individual),'stale/altered return');this.#phase='DEMATERIALIZING';
    try{check(canonical(prepare(copy(payload.combat)))===canonical(payload.combat),'return preflight');f.aggregate=copy(payload.combat);f.aggregate.revision++;f.aggregate.updatedAt=s.clock;f.individual=null;f.lease=null;f.owner='AGGREGATED';this.#commit(s);}finally{this.#phase=null;}
  }
  tick(dtMs,events=[],options={}){
    this.#boundary();check(Object.keys(options).every(k=>k==='paused')&&typeof (options.paused??false)==='boolean','semantic options');check(integer(dtMs,60000)&&Array.isArray(events),'tick');
    if(!dtMs||options.paused){check(events.length===0,'paused events');return [];}
    const s=copy(this.#s),end=s.clock+dtMs;check(integer(end)&&integer(s.battleClock+dtMs),'clock overflow');const unique=new Map();
    for(const e of events){validateEvent(e,s);const old=s.receipts.find(r=>r.id===e.id);if(old){check(old.envelope===canonical(e),'conflicting duplicate');continue;}
      check(e.at>s.clock&&e.at<=end,'late/out-of-interval event');const duplicate=unique.get(e.id);check(!duplicate||canonical(duplicate)===canonical(e),'conflicting duplicate batch');unique.set(e.id,copy(e));}
    const agenda=[...unique.values()].map(e=>({at:e.at,priority:0,fid:e.formationId,id:e.id,event:e}));
    for(let at=(Math.floor(s.clock/100)+1)*100;at<=end;at+=100)for(const f of s.formations)agenda.push({at,priority:1,fid:f.id,id:`tick/${at}/${f.id}`});
    agenda.sort((a,b)=>a.at-b.at||a.priority-b.priority||compare(a.fid,b.fid)||compare(a.id,b.id));let at=-1,sharedBase=0;const results=[];
    for(const item of agenda){if(at!==item.at){at=item.at;sharedBase=s.shared.revision;}s.clock=at;if(item.event)results.push({id:item.id,...applyEvent(s,item.event,sharedBase)});else autoStep(find(s,item.fid),at);}
    s.clock=end;s.battleClock+=dtMs;this.#commit(s);return results;
  }
}
/** Synthetic v0 boundary converter, not a production schema2 importer. */
export function migrateLegacy(legacy){
  fields(legacy,['version','seed','sectorId','clock','battleClock','sectorRng','formations','sectorReserve','activeLeases','pendingEvents']);
  check(legacy.version==='legacy-sector-rng/v0'&&integer(legacy.clock)&&integer(legacy.battleClock)&&legacy.activeLeases===0&&Array.isArray(legacy.pendingEvents)&&!legacy.pendingEvents.length,'unsafe migration boundary');stream(legacy.sectorRng);
  const normalized={...copy(legacy),formations:copy(legacy.formations).sort((a,b)=>compare(a.id,b.id)).map(f=>({...f,members:f.members.sort((a,b)=>a.ordinal-b.ordinal)}))};
  const w=new FormationWorld({seed:legacy.seed,sectorId:legacy.sectorId,formations:normalized.formations.map(f=>({id:f.id,strength:f.members.length})),sectorReserve:legacy.sectorReserve});
  const migrationSeed=parseInt(checksum([legacy.seed,legacy.sectorId,legacy.clock,legacy.sectorRng,'lineage-split-v1']).slice(0,8),16);
  const s=w.snapshot();s.clock=legacy.clock;s.battleClock=legacy.battleClock;s.lineage={version:1,boundary:legacy.clock,derivationSeed:migrationSeed,legacyDigest:checksum(normalized),legacySectorRng:copy(legacy.sectorRng)};
  for(const old of normalized.formations){fields(old,['id','revision','reserve','spent','members']);check(integer(old.revision)&&integer(old.reserve)&&integer(old.spent),'legacy scalars');const f=find(s,old.id),c=f.aggregate;
    c.revision=old.revision;c.updatedAt=legacy.clock;c.reserve=old.reserve;c.spent=old.spent;c.members=old.members.map(m=>{const hasStream=Object.hasOwn(m,'rng');fields(m,['id','ordinal','weaponId','status','position','loaded',...(hasStream?['rng']:[])]);if(hasStream)stream(m.rng,true);return {...copy(m),rng:hasStream?copy(m.rng):deriveRng(migrationSeed,s.sectorId,f.id,m.id)};});
    c.rng=deriveRng(migrationSeed,s.sectorId,f.id);f.initialAmmo=c.reserve+c.spent+c.members.reduce((a,m)=>a+m.loaded,0);
  }
  return FormationWorld.restore({format:FORMAT,payload:s,checksum:checksum(s)});
}
