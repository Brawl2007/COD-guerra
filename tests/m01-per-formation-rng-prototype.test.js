import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FormationWorld,FORMAT,deriveRng,draw,checksum,copy,counts,active,envelope,migrateLegacy} from '../tools/verification/m01-per-formation-rng-prototype.mjs';
import {longFuture,benchmark,command} from '../tools/verification/m01-per-formation-rng-verification.mjs';
const combat=(w,fid)=>active(w.formation(fid));
const loss=(w,fid,ordinal,id,at=w.snapshot().clock+1)=>command(w,fid,'loss',{memberId:`${fid}/soldier/${ordinal}`,status:'dead'},id,at);
const resign=s=>{s.checksum=checksum(s.payload);return s;};
test('stable RNG derivation and domain separation, no indexes/global RNG',()=>{
  const a=deriveRng(19390901,'S','A');assert.deepEqual(a,{state:1928607582,draws:0});assert.deepEqual(a,deriveRng(19390901,'S','A'));
  for(const b of [deriveRng(7,'S','A'),deriveRng(19390901,'T','A'),deriveRng(19390901,'S','B'),deriveRng(19390901,'S','A','A/soldier/0')])assert.notDeepEqual(a,b);
  const r=copy(a);draw(r);assert.equal(r.draws,1);assert.notDeepEqual(a,r);assert.throws(()=>deriveRng(-1,'S','A'));
});
test('formation array and object insertion reorder cannot change state/future',()=>{
  const a=new FormationWorld(),b=new FormationWorld({formations:[{dead:0,id:'C'},{dead:5,id:'A'},{dead:3,id:'B'}]});
  for(let i=0;i<40;i++){assert.deepEqual(a.save(),b.save());a.tick(37);b.tick(37);}assert.deepEqual(a.save(),b.save());
});
test('same-time reversed input yields identical future',()=>{
  const a=new FormationWorld(),b=FormationWorld.restore(a.save()),es=[loss(a,'B',3,'b-loss'),loss(a,'A',5,'a-loss')];
  a.tick(100,es);b.tick(100,es.toReversed());assert.deepEqual(a.snapshot(),b.snapshot());
});
test('one owner, multiple simultaneous leases, independent return',()=>{
  const w=new FormationWorld();w.acquire('A');w.acquire('B');assert.deepEqual(w.snapshot().formations.map(f=>f.owner),['INDIVIDUAL','INDIVIDUAL','AGGREGATED']);
  assert.throws(()=>w.acquire('A'),/duplicate/);w.release('A');assert.equal(w.formation('B').owner,'INDIVIDUAL');w.snapshot().formations.forEach(f=>assert.equal(f.individual!==null,f.owner==='INDIVIDUAL'));
});
test('lease A does not freeze B or consume B RNG; source A stays frozen',()=>{
  const a=new FormationWorld(),b=new FormationWorld();a.acquire('A');const frozen=a.formation('A').aggregate;
  for(let i=0;i<20;i++){a.tick(100);b.tick(100);assert.deepEqual(a.formation('B'),b.formation('B'));}
  assert.deepEqual(a.formation('A').aggregate,frozen);assert.equal(combat(a,'B').rng.draws,20);assert.equal(combat(a,'A').rng.draws,0);assert.equal(combat(a,'A').members[5].rng.draws,20);
});
test('streams persist acquire/release, never reseeded/merged',()=>{
  const w=new FormationWorld();w.tick(300);const rng=copy(combat(w,'A').rng);w.acquire('A');w.tick(700);const mr=copy(combat(w,'A').members[5].rng);
  w.release('A');w.acquire('A');assert.deepEqual(combat(w,'A').rng,rng);assert.deepEqual(combat(w,'A').members[5].rng,mr);w.release('A');w.tick(100);assert.equal(combat(w,'A').rng.draws,rng.draws+1);
});
test('failed atomic materialization ordinal7 leaves A B C RNG unchanged',()=>{
  const w=new FormationWorld(),before=w.snapshot();assert.throws(()=>w.acquire('A',{prepare:m=>{if(m.ordinal===7)throw Error('actor7');return m;}}),/actor7/);assert.deepEqual(w.snapshot(),before);
  assert.throws(()=>w.acquire('A',{prepare:m=>({...m,id:'duplicate'})}),/descriptor/);assert.deepEqual(w.snapshot(),before);
});
test('failed atomic return leaves both leases intact',()=>{
  const w=new FormationWorld();w.acquire('A');w.acquire('B');w.tick(100);const before=w.snapshot();
  assert.throws(()=>w.release('A',w.returnPayload('A'),()=>{throw Error('crash');}),/crash/);assert.deepEqual(w.snapshot(),before);
  const bad=w.returnPayload('A');bad.combat.members.pop();assert.throws(()=>w.release('A',bad));assert.deepEqual(w.snapshot(),before);
});
test('stale A and B returns independent; ABA/generation/source/token/identity fences',()=>{
  const w=new FormationWorld();w.acquire('A');w.acquire('B');const old=w.returnPayload('A'),oldB=w.returnPayload('B');w.tick(100);const before=w.snapshot();
  assert.throws(()=>w.release('A',old),/stale/);assert.throws(()=>w.release('B',oldB),/stale/);assert.deepEqual(w.snapshot(),before);
  for(const field of ['sourceRevision','sourceFingerprint','generation','id','formationId']){const bad=w.returnPayload('A');bad.lease[field]=['generation','sourceRevision'].includes(field)?999:'wrong';assert.throws(()=>w.release('A',bad),/stale/);assert.deepEqual(w.snapshot(),before);}
  const aBefore=w.formation('A');w.release('B');assert.deepEqual(w.formation('A'),aBefore);w.release('A');w.acquire('A');assert.throws(()=>w.release('A',old));
});
test('stale acquire revision rejected independently',()=>{
  const w=new FormationWorld();w.tick(100);const before=w.snapshot();assert.throws(()=>w.acquire('A',{expectedRevision:0}),/stale/);assert.deepEqual(w.snapshot(),before);w.acquire('B');
});
test('B/shared revisions do not invalidate pure local return A',()=>{
  const w=new FormationWorld();w.acquire('A');const p=w.returnPayload('A');w.tick(1,[loss(w,'B',3,'B-loss'),command(w,'B','sharedSpend',{amount:10,expectedSharedRevision:0},'B-supply')]);
  w.release('A',p);assert.equal(counts(combat(w,'B')).dead,4);assert.equal(w.snapshot().shared.reserve,90);
});
test('optional shared dependency fence rejects stale shared return atomically',()=>{
  const w=new FormationWorld();w.acquire('A',{sharedSectorRevision:0});w.tick(1,[command(w,'B','sharedSpend',{amount:10,expectedSharedRevision:0},'supply')]);const before=w.snapshot();assert.throws(()=>w.release('A'),/shared dependency/);assert.deepEqual(w.snapshot(),before);
});
test('explicit shared dependency reconciliation is fenced, atomic, cannot change B/shared state',()=>{
  const w=new FormationWorld();w.acquire('A',{sharedSectorRevision:0});w.tick(1,[command(w,'B','sharedSpend',{amount:10,expectedSharedRevision:0},'supply')]);const before=w.snapshot();
  const args={authority:w.authority('A'),expectedSharedRevision:1,prepare:()=>false};assert.throws(()=>w.reconcileShared('A',args),/rejected/);assert.deepEqual(w.snapshot(),before);
  assert.throws(()=>w.reconcileShared('A',{...args,expectedSharedRevision:0}),/fence/);assert.deepEqual(w.snapshot(),before);
  const old=w.returnPayload('A');w.reconcileShared('A',{...args,prepare:(shared,c)=>shared.reserve===90&&c.members.length===12});
  assert.deepEqual(w.formation('B'),before.formations[1]);assert.deepEqual(w.snapshot().shared,before.shared);assert.throws(()=>w.release('A',old),/stale/);w.release('A');assert.equal(w.formation('A').owner,'AGGREGATED');
});
test('critical casualties5+2=7,3+1=4,total11 no duplication or crossing',()=>{
  const w=new FormationWorld();w.acquire('A');const es=[loss(w,'A',5,'a5'),loss(w,'A',6,'a6'),loss(w,'B',3,'b3')];w.tick(1,[...es,copy(es[0])]);w.release('A');
  assert.equal(counts(combat(w,'A')).dead,7);assert.equal(counts(combat(w,'B')).dead,4);assert.equal(w.snapshot().formations.reduce((n,f)=>n+counts(active(f)).dead,0),11);
  const before=w.snapshot();w.retry(es[0]);assert.deepEqual(w.snapshot(),before);
});
test('dead bodies stable per ID/formation and no resurrection on return',()=>{
  const w=new FormationWorld();w.acquire('A');w.tick(1,[loss(w,'A',5,'kill')]);const body=copy(combat(w,'A').members[5]),bBodies=combat(w,'B').members.slice(0,3);
  w.tick(1000);w.release('A');w.tick(1000);w.acquire('A');assert.deepEqual(combat(w,'A').members[5],body);assert.deepEqual(combat(w,'B').members.slice(0,3),bBodies);
  const bad=w.returnPayload('A');bad.combat.members[5].status='combatReady';assert.throws(()=>w.release('A',bad));
});
test('local ammo reserve100 to73 with27 reload transfers, no refill/magazine double-count',()=>{
  const w=new FormationWorld();w.acquire('A');for(let i=0;i<6;i++){w.tick(1,[command(w,'A','fire',{memberId:'A/soldier/5',rounds:5},`fire${i}`)]);w.tick(1,[command(w,'A','reload',{memberId:'A/soldier/5',rounds:i<5?5:2},`reload${i}`)]);}
  w.release('A');assert.equal(combat(w,'A').reserve,73);assert.equal(combat(w,'A').spent,30);assert.equal(combat(w,'A').members[5].loaded,2);assert.equal(w.snapshot().shared.reserve,100);
});
test('shared reserve100 same-time A/B70 canonical grant/deny idempotent retry',()=>{
  const a=new FormationWorld(),b=FormationWorld.restore(a.save());a.acquire('A');b.acquire('A');const es=['A','B'].map(fid=>command(a,fid,'sharedSpend',{amount:70,expectedSharedRevision:0},`${fid}-request`));
  assert.deepEqual(a.tick(1,es),b.tick(1,es.toReversed()));assert.equal(a.snapshot().shared.reserve,30);assert.equal(combat(a,'A').received,70);assert.equal(combat(a,'B').received,0);
  const before=a.snapshot();assert.equal(a.retry(es[0]).applied,true);assert.equal(a.retry(es[1]).applied,false);assert.deepEqual(a.snapshot(),before);assert.deepEqual(a.snapshot(),b.snapshot());
});
test('stale shared request/conflicting duplicate leaves reserve and formations intact',()=>{
  const w=new FormationWorld(),e=command(w,'A','sharedSpend',{amount:70,expectedSharedRevision:0},'request');w.tick(1,[e]);const before=w.snapshot();
  assert.throws(()=>w.tick(1,[command(w,'B','sharedSpend',{amount:70,expectedSharedRevision:0},'stale')]),/stale shared/);assert.deepEqual(w.snapshot(),before);
  const bad=copy(e);bad.payload.amount=71;assert.throws(()=>w.retry(bad),/conflicting/);assert.deepEqual(w.snapshot(),before);
});
test('failed A event rolls entire batch back including B mutation/RNG',()=>{
  const w=new FormationWorld(),before=w.snapshot();assert.throws(()=>w.tick(100,[loss(w,'B',3,'valid'),loss(w,'A',999,'invalid')]),/unknown member/);assert.deepEqual(w.snapshot(),before);
});
test('aggregate attacks/suppresses aggregated and individual B only via current owner',()=>{
  for(const individual of [false,true]){const w=new FormationWorld();if(individual)w.acquire('B');const frozen=w.formation('B').aggregate;
    const e=command(w,'A','attack',{memberId:'A/soldier/5',targetFormationId:'B',targetMemberId:'B/soldier/3',status:'dead'},'attack');w.tick(1,[e,command(w,'A','suppress',{targetFormationId:'B',amount:9},'suppress')]);
    assert.equal(counts(combat(w,'B')).dead,4);assert.equal(combat(w,'B').suppression,9);assert.equal(combat(w,'A').spent,1);if(individual)assert.deepEqual(w.formation('B').aggregate,frozen);
    const before=w.snapshot();w.retry(e);assert.deepEqual(w.snapshot(),before);
  }
});
test('artillery/shared destruction envelopes affect A+B once independent of input order',()=>{
  const a=new FormationWorld(),b=FormationWorld.restore(a.save());a.acquire('A');b.acquire('A');const es=[envelope({id:'artillery',at:1,type:'artillery',payload:{targets:[{formationId:'B',memberId:'B/soldier/3',status:'dead'},{formationId:'A',memberId:'A/soldier/5',status:'wounded'}]}}),envelope({id:'destruction',at:1,type:'destruction',payload:{reference:{id:'bridge/result/7',version:2},targets:['B','A']}})];
  a.tick(1,es);b.tick(1,es.toReversed());assert.deepEqual(a.snapshot(),b.snapshot());a.release('A');assert.equal(combat(a,'A').members[5].status,'wounded');assert.equal(combat(a,'B').members[3].status,'dead');assert.deepEqual(combat(a,'A').destructionRefs,combat(a,'B').destructionRefs);assert.equal(a.snapshot().shared.artillery,1);
});
for(const leases of [0,1,2])test(`save/restore ${leases} leases and double restore identical continuation`,()=>{
  const a=new FormationWorld();for(const fid of ['A','B'].slice(0,leases))a.acquire(fid);a.tick(345);const save=a.save(),b=FormationWorld.restore(save);assert.deepEqual(a.snapshot(),b.snapshot());b.restoreInto(save);b.restoreInto(save);a.tick(155);b.tick(155);assert.deepEqual(a.snapshot(),b.snapshot());
});
const corruptions={formation:s=>s.formations[0].aggregate.members[5].status='zombie',shared:s=>s.shared.reserve=-1,missingRng:s=>delete s.formations[0].aggregate.rng,duplicateFormation:s=>s.formations.push(copy(s.formations[0])),staleGeneration:s=>s.formations[0].lease.generation--,doubleOwner:s=>s.formations[0].owner='AGGREGATED',movedDead:s=>s.formations[0].individual.members[0].position.x++,duplicateMember:s=>s.formations[0].individual.members[1].id=s.formations[0].individual.members[0].id};
for(const [name,mutate]of Object.entries(corruptions))test(`corrupt restore ${name} rejected atomically even with recomputed checksum`,()=>{
  const w=new FormationWorld();w.acquire('A');w.acquire('B');w.tick(100);const before=w.snapshot(),bad=w.save();mutate(bad.payload);resign(bad);assert.throws(()=>w.restoreInto(bad));assert.deepEqual(w.snapshot(),before);
});
test('checksum/monotonic generation floor reject stale in-place restore',()=>{
  const w=new FormationWorld();w.acquire('A');const old=w.save();w.release('A');w.acquire('A');const before=w.snapshot();assert.throws(()=>w.restoreInto(old),/stale generation/);assert.deepEqual(w.snapshot(),before);
  const bad=w.save();bad.payload.shared.reserve--;assert.throws(()=>w.restoreInto(bad),/checksum/);assert.deepEqual(w.snapshot(),before);
});
test('same-generation older clock/combat/receipts cannot rewind a live lease',()=>{
  const w=new FormationWorld();w.acquire('A');const old=w.save();w.tick(100,[loss(w,'A',5,'kill')]);const before=w.snapshot();
  assert.throws(()=>w.restoreInto(old),/stale in-place/);assert.deepEqual(w.snapshot(),before);
  // An intentional checkpoint fork is a fresh instance, not a live-controller replacement.
  const fork=FormationWorld.restore(old);assert.equal(counts(combat(fork,'A')).dead,5);assert.equal(counts(combat(w,'A')).dead,6);
});
test('no half-transition save or reentrant mutation',()=>{
  const w=new FormationWorld(),before=w.snapshot();assert.throws(()=>w.acquire('A',{prepare:m=>{w.save();return m;}}),/unsafe/);assert.deepEqual(w.snapshot(),before);w.acquire('A');const leased=w.snapshot();
  assert.throws(()=>w.release('A',w.returnPayload('A'),c=>{w.save();return c;}),/unsafe/);assert.deepEqual(w.snapshot(),leased);assert.throws(()=>w.release('A',w.returnPayload('A'),c=>{w.tick(100);return c;}),/unsafe/);assert.deepEqual(w.snapshot(),leased);
});
test('pause/zero dt freeze clocks streams leases movement and events',()=>{
  const w=new FormationWorld();w.acquire('A');w.acquire('B');w.tick(100);const before=w.snapshot();w.tick(999,[],{paused:true});w.tick(0);assert.deepEqual(w.snapshot(),before);assert.throws(()=>w.tick(0,[loss(w,'C',0,'pause')]),/paused/);assert.deepEqual(w.snapshot(),before);
});
test('camera/quality/budget absent from semantics',()=>{const w=new FormationWorld(),before=w.snapshot();for(const o of [{camera:{}},{quality:'LOW'},{budget:4}])assert.throws(()=>w.tick(100,[],o),/semantic options/);assert.deepEqual(w.snapshot(),before);});
test('late same-time inputs require complete sealed batch',()=>{const w=new FormationWorld();w.tick(1,[loss(w,'A',5,'first')]);const before=w.snapshot();assert.throws(()=>w.tick(1,[loss(w,'B',3,'late',1)]),/late/);assert.deepEqual(w.snapshot(),before);});
function legacy(){const w=new FormationWorld();w.tick(300);const s=w.snapshot();return {version:'legacy-sector-rng/v0',seed:s.seed,sectorId:s.sectorId,clock:s.clock,battleClock:s.battleClock,sectorRng:{state:42,draws:17},sectorReserve:100,activeLeases:0,pendingEvents:[],formations:s.formations.map(f=>({id:f.id,revision:f.aggregate.revision,reserve:f.aggregate.reserve,spent:f.aggregate.spent,members:f.aggregate.members.map(({rng,...m})=>m)}))};}
test('legacy migration preserves IDs bodies ammo at explicit changed lineage; reordered archive equal',()=>{
  const old=legacy(),a=migrateLegacy(old),reorder=copy(old);reorder.formations.reverse();reorder.formations.forEach(f=>f.members.reverse());const b=migrateLegacy(reorder);assert.deepEqual(a.save(),b.save());assert.equal(a.snapshot().lineage.boundary,300);assert.equal(a.snapshot().lineage.legacySectorRng.state,42);
  for(const f of a.snapshot().formations){const prior=old.formations.find(o=>o.id===f.id);assert.equal(f.aggregate.reserve,prior.reserve);assert.equal(f.aggregate.spent,prior.spent);assert.deepEqual(f.aggregate.members.map(({rng,...m})=>m),prior.members);}
  assert.notEqual(combat(a,'A').rng.state,42);assert.equal(a.save().format,FORMAT);a.tick(100);b.tick(100);assert.deepEqual(a.snapshot(),b.snapshot());
});
test('legacy active lease/pending events/invalid RNG rejected without mutating input',()=>{for(const mutate of [s=>s.activeLeases=1,s=>s.pendingEvents=[{id:'pending'}],s=>delete s.sectorRng.state,s=>s.formations[0].members[5].rng=null]){const old=legacy();mutate(old);const before=copy(old);assert.throws(()=>migrateLegacy(old));assert.deepEqual(old,before);}});
test('already persisted legacy individual streams survive migration; derivation seed archived',()=>{
  const old=legacy();old.formations[0].members[5].rng={state:123456,draws:27};const w=migrateLegacy(old);
  assert.deepEqual(combat(w,'A').members[5].rng,{state:123456,draws:27});assert.ok(Number.isInteger(w.snapshot().lineage.derivationSeed));
});
test('10,000 exact future ticks after save: variable dt, pause, overlapping leases and reordered events',()=>{
  const r=longFuture(10000);assert.equal(r.comparisons,10000);assert.equal(r.divergences,0);assert.ok(r.overlappingLeaseTicks>0&&r.aggregateBTicksWhileALeased>0&&r.zeroDtTicks>0&&r.events>0);assert.match(r.checksum,/^[a-f0-9]{64}$/);console.log('LONG_FUTURE',JSON.stringify(r));
});
test('Node benchmark reports formations ticks events microseconds and checksum',()=>{const r=benchmark(300);assert.equal(r.formations,3);assert.equal(r.ticks,300);assert.ok(r.microsecondsPerTick>0);assert.match(r.checksum,/^[a-f0-9]{64}$/);});
