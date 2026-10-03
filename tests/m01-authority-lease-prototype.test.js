import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { AuthorityLeaseWorld,demoConfig,counts,canonical,configFromBattleSector,validateReturnCandidate,relevance,representationBand,runDemo } from '../tools/verification/m01-authority-lease-prototype.mjs';

const clone=v=>JSON.parse(JSON.stringify(v));
const setup=()=>new AuthorityLeaseWorld(demoConfig());
function acquire(w=setup()){const transfer=w.acquire({expectedRevision:w.combat().revision});return {w,token:transfer.lease.id,ids:transfer.lease.memberIds};}
const update=(w,eventId,operations,token=null,owner=token?'INDIVIDUAL':'AGGREGATED')=>w.mutate({eventId,owner,token,operations});
const rounds=(id,amount)=>[...[5,5,5,5,5,2].slice(0,amount===27?6:0).flatMap(n=>[{type:'reload',memberId:id,amount:n},{type:'fire',memberId:id,amount:n}])];
const unchanged=(w,fn,pattern)=>{const old=w.save();assert.throws(fn,pattern);assert.equal(w.save(),old);};

test('exactly one owner exists at every persisted boundary',()=>{
  const w=setup();let s=w.snapshot().state;assert.equal(s.mode,'AGGREGATED');assert.equal(s.individual,null);assert.equal(s.lease,null);
  acquire(w);s=w.snapshot().state;assert.equal(s.mode,'INDIVIDUAL');assert.ok(s.individual&&s.lease);assert.equal(w.owner(),'INDIVIDUAL');
  w.release(w.returnPayload());s=w.snapshot().state;assert.equal(s.mode,'AGGREGATED');assert.equal(s.individual,null);assert.equal(s.lease,null);
});

test('acquire captures revision, identity, source fingerprint and current clock',()=>{
  const w=setup();w.clock(500,16_201_000);const revision=w.combat().revision,old=w.combat(),{token,ids}=acquire(w),s=w.snapshot().state;
  assert.equal(s.lease.sourceRevision,revision);assert.equal(s.lease.acquiredAtLocalMs,500);assert.equal(s.lease.sourceFingerprint.length,64);
  assert.equal(s.lease.owner,'INDIVIDUAL');assert.equal(ids[0],'de_east_named');assert.equal(ids[17],'m01_de_platoon_east/soldier/17');
  assert.equal(token,'m01_de_platoon_east/lease/1');assert.deepEqual(s.aggregate,old);assert.deepEqual(s.individual,old);
});

test('duplicate acquire and stale acquire revision reject without consuming a serial',()=>{
  const w=setup();unchanged(w,()=>w.acquire({expectedRevision:41}),/stale revision/);acquire(w);
  unchanged(w,()=>w.acquire({expectedRevision:42}),/duplicate acquire/);assert.equal(w.snapshot().state.serial,1);
});

test('actor 17 staging failure rolls back all 1–16 and keeps aggregate ownership',()=>{
  const w=setup(),old=w.save(),visited=[];
  assert.throws(()=>w.acquire({expectedRevision:42},m=>{visited.push(m.ordinal);if(m.ordinal===17)throw Error('actor 17 failed');return m;}),/actor 17 failed/);
  assert.equal(visited.length,18);assert.equal(w.save(),old);assert.equal(w.owner(),'AGGREGATED');
  assert.equal(acquire(w).token,'m01_de_platoon_east/lease/1');
});

test('factory cannot replace identity, ammo or terminal status at materialization',()=>{
  for(const change of [m=>m.id='unknown',m=>m.loadedRounds=5,m=>m.status='combatReady']){
    const w=setup();unchanged(w,()=>w.acquire({expectedRevision:42},m=>{if(m.ordinal===17)change(m);return m;}));
  }
});

test('no MATERIALIZING save or reentrant clock/mutation can publish a half transfer',()=>{
  const w=setup();let checked=false;
  w.acquire({expectedRevision:42},m=>{if(m.ordinal===0){
    assert.throws(()=>w.save(),/unsafe transition/);assert.throws(()=>w.snapshot(),/unsafe transition/);
    assert.throws(()=>w.clock(1,16_200_001),/unsafe transition/);checked=true;
  }return m;});assert.equal(checked,true);assert.doesNotThrow(()=>w.save());
});

test('return is atomic; failed final preflight keeps source, lease and live individual state',()=>{
  const {w,token,ids}=acquire();update(w,'kill',[{type:'casualty',memberId:ids[1],to:'dead'}],token);
  const payload=w.returnPayload();unchanged(w,()=>w.release(payload,()=>{throw Error('proxy validation failed');}),/proxy validation/);
  assert.equal(w.owner(),'INDIVIDUAL');w.release(payload);assert.equal(w.owner(),'AGGREGATED');assert.equal(counts(w.combat()).dead,6);
});

test('no DEMATERIALIZING save or reentrant acquisition is possible',()=>{
  const {w}=acquire();let checked=false;
  w.release(w.returnPayload(),()=>{assert.throws(()=>w.save(),/unsafe transition/);assert.throws(()=>acquire(w),/unsafe transition/);checked=true;});
  assert.equal(checked,true);assert.doesNotThrow(()=>w.save());
});

test('async return preflight cannot silently commit before validation finishes',()=>{
  const {w}=acquire();unchanged(w,()=>w.release(w.returnPayload(),()=>Promise.resolve()),/async preflight/);
  assert.equal(w.owner(),'INDIVIDUAL');
});

test('old individual payload rejects even if aggregate source revision is still 42',()=>{
  const {w,token,ids}=acquire(),stale=w.returnPayload();update(w,'new_live_death',[{type:'casualty',memberId:ids[1],to:'dead'}],token);
  assert.equal(w.snapshot().state.aggregate.revision,42);unchanged(w,()=>w.release(stale),/ledger/);assert.equal(counts(w.combat()).dead,6);
});

test('invalid aggregate exposure outcome rejects before RNG or history is consumed',()=>{
  const w=setup(),id=w.combat().members[0].id;
  unchanged(w,()=>update(w,'invalid_exposure',[{type:'exposure',memberId:id,to:'combatReady',probability:0}]),/casualty status/);
  assert.equal(w.snapshot().state.sectorRng.draws,0);
});

test('stale aggregate revision 43 rejects return built from source revision 42',()=>{
  const {w}=acquire(),payload=w.returnPayload(),state=w.snapshot().state;state.aggregate.revision=43;
  assert.throws(()=>validateReturnCandidate(state,payload),/stale revision/);
  const bad=clone(payload);bad.expectedRevision=43;unchanged(w,()=>w.release(bad),/stale revision/);
});

test('stale source fingerprint rejects even when revision number is unchanged',()=>{
  const {w}=acquire(),payload=w.returnPayload(),state=w.snapshot().state;state.aggregate.reserveAmmunition--;
  assert.throws(()=>validateReturnCandidate(state,payload),/stale source fingerprint/);
  const altered=w.returnPayload();altered.sourceFingerprint='0'.repeat(64);unchanged(w,()=>w.release(altered),/stale source/);
});

test('lease token mismatch and released-token ABA cannot control a later authority',()=>{
  const {w,token,ids}=acquire();const bad=w.returnPayload();bad.token='wrong';unchanged(w,()=>w.release(bad),/token/);
  w.release(w.returnPayload());const current=acquire(w);assert.notEqual(current.token,token);
  unchanged(w,()=>update(w,'old_ai',[{type:'sampleAI',memberId:ids[0]}],token),/token/);
});

test('BattleSector cannot move, expose, kill, spend ammo, reserve cover or RNG during individual lease',()=>{
  const {w,ids}=acquire();
  for(const op of [{type:'moveFormation',position:{x:1000,y:0,z:40}},
    {type:'exposure',memberId:ids[1],to:'dead',probability:1},
    {type:'casualty',memberId:ids[1],to:'dead'},
    {type:'reload',memberId:ids[0],amount:5},
    {type:'cover',memberId:ids[0],coverId:'m01_cover_01'}]){
    unchanged(w,()=>update(w,'aggregate_collision',[op],null,'AGGREGATED'),/wrong authority/);
  }
  assert.equal(w.snapshot().state.sectorRng.draws,0);assert.equal(counts(w.combat()).dead,5);
});

test('Individual AI is absent and cannot mutate when aggregated',()=>{
  const w=setup(),id=w.combat().members[0].id;
  unchanged(w,()=>update(w,'orphan_ai',[{type:'sampleAI',memberId:id}],'stale','INDIVIDUAL'),/wrong authority/);
  unchanged(w,()=>update(w,'wrong_rng',[{type:'sampleAI',memberId:id}]),/individual RNG only/);
  assert.equal(w.snapshot().state.individual,null);
});

test('5 dead + 2 individual deaths returns 7, with aggregate frozen at 5 until commit',()=>{
  const {w,token,ids}=acquire();update(w,'player_two_kills',[{type:'casualty',memberId:ids[1],to:'dead'},{type:'casualty',memberId:ids[2],to:'dead'}],token);
  assert.equal(counts(w.snapshot().state.aggregate).dead,5);assert.equal(counts(w.combat()).dead,7);
  w.release(w.returnPayload());assert.equal(counts(w.combat()).dead,7);assert.equal(counts(w.combat()).combatReady,13);
});

test('reserve 100, load/fire 27 in five-round clips, return reserve 73 with no double counting',()=>{
  const {w,token,ids}=acquire();update(w,'27_shots',rounds(ids[0],27),token);
  assert.equal(w.combat().reserveAmmunition,73);assert.equal(w.combat().members[0].loadedRounds,0);
  assert.equal(w.snapshot().state.aggregate.reserveAmmunition,100);w.release(w.returnPayload());
  assert.equal(w.combat().reserveAmmunition,73);assert.equal(w.combat().members[0].weaponCycle,'cycling');
});

test('loaded ammo is distinct from reserve and a reload transfers rather than creates',()=>{
  const {w,token,ids}=acquire();update(w,'load',[{type:'reload',memberId:ids[0],amount:5}],token);
  assert.equal(w.combat().reserveAmmunition,95);assert.equal(w.combat().members[0].loadedRounds,5);
  update(w,'fire',[{type:'fire',memberId:ids[0],amount:2}],token);w.release(w.returnPayload());
  assert.equal(w.combat().reserveAmmunition,95);assert.equal(w.combat().members[0].loadedRounds,3);
});

test('duplicate gameplay receipt cannot duplicate ammo use, casualty, progress or RNG',()=>{
  const {w,token,ids}=acquire();const ops=[{type:'reload',memberId:ids[0],amount:5},{type:'fire',memberId:ids[0],amount:2},
    {type:'casualty',memberId:ids[1],to:'dead'},{type:'progress',amount:10},{type:'sampleAI',memberId:ids[0]}];
  assert.equal(update(w,'combined',ops,token).applied,true);const after=w.save();assert.equal(update(w,'combined',ops,token).applied,false);assert.equal(w.save(),after);
  const conflict=clone(ops);conflict[1].amount=3;unchanged(w,()=>update(w,'combined',conflict,token),/conflicting duplicate/);
});

test('duplicate return is rejected rather than consuming casualty or ammo again',()=>{
  const {w}=acquire(),p=w.returnPayload();w.release(p);unchanged(w,()=>w.release(p),/not individual owner/);
});

test('terminal actors cannot resurrect through commands or forged return payload',()=>{
  const {w,token,ids}=acquire();unchanged(w,()=>update(w,'heal_dead',[{type:'casualty',memberId:ids[17],to:'wounded'}],token),/resurrection/);
  const p=w.returnPayload();p.combat.members[17].status='combatReady';unchanged(w,()=>w.release(p),/ledger/);
  unchanged(w,()=>update(w,'heal_ready',[{type:'casualty',memberId:ids[0],to:'combatReady'}],token),/casualty status/);
});

test('dead-body position remains at death through return, formation movement and reentry',()=>{
  const {w,token,ids}=acquire(),death={x:930,y:1,z:42};update(w,'death_here',[{type:'move',memberId:ids[1],position:death},{type:'casualty',memberId:ids[1],to:'dead'}],token);
  w.release(w.returnPayload());update(w,'formation_moves',[{type:'moveFormation',position:{x:950,y:0,z:40}}]);
  assert.deepEqual(w.combat().members[1].position,death);acquire(w);assert.deepEqual(w.combat().members[1].position,death);
  unchanged(w,()=>update(w,'corpse_moves',[{type:'move',memberId:ids[1],position:{x:940,y:0,z:0}}],w.snapshot().state.lease.id),/dead/);
});

test('wounded requires explicit live helper, evacuated stays at extraction after movement',()=>{
  const {w,token,ids}=acquire();update(w,'wound',[{type:'casualty',memberId:ids[3],to:'wounded'}],token);
  unchanged(w,()=>update(w,'walk_wounded',[{type:'move',memberId:ids[3],position:{x:920,y:0,z:40}}],token));
  update(w,'rescue',[{type:'move',memberId:ids[3],position:{x:920,y:0,z:40},helperId:ids[0]},
    {type:'evacuate',memberId:ids[3],position:{x:850,y:0,z:20}}],token);
  w.release(w.returnPayload());update(w,'depart',[{type:'moveFormation',position:{x:960,y:0,z:40}}]);
  assert.equal(counts(w.combat()).evacuated,1);assert.deepEqual(w.combat().members[3].position,{x:850,y:0,z:20});
});

test('player kills/rescue/MG/vehicle/destruction/ammo/progress survive return and restore',()=>{
  const {w,token,ids}=acquire();update(w,'player_changes',[
    {type:'casualty',memberId:ids[1],to:'dead'},{type:'casualty',memberId:ids[3],to:'wounded'},
    {type:'evacuate',memberId:ids[3],position:{x:850,y:0,z:20}},
    {type:'resource',id:'mw:m01:synthetic_mg',state:'destroyed',operatorId:null},
    {type:'resource',id:'veh:m01:synthetic_truck',state:'destroyed',operatorId:null},
    {type:'resupply',amount:11},{type:'progress',amount:15},
    {type:'destructionRef',id:'m01_house_04',revision:1,eventId:'m01_external_house_hit'}],token);
  w.release(w.returnPayload());const r=AuthorityLeaseWorld.restore(w.save()),c=r.combat();
  assert.equal(counts(c).dead,6);assert.equal(counts(c).evacuated,1);assert.equal(c.reserveAmmunition,111);assert.equal(c.objective.progress,15);
  assert.ok(c.resources.every(a=>a.state==='destroyed'));assert.deepEqual(c.destructionRefs,[{id:'m01_house_04',revision:1,eventId:'m01_external_house_hit'}]);
});

test('mounted occupancy and cover references persist; operator death releases station',()=>{
  const {w,token,ids}=acquire();update(w,'mount',[{type:'resource',id:'mw:m01:synthetic_mg',state:'operational',operatorId:ids[0]},
    {type:'cover',memberId:ids[1],coverId:'m01_cover_01'}],token);w.release(w.returnPayload());
  assert.equal(w.combat().resources[0].operatorId,ids[0]);assert.equal(w.combat().members[1].coverId,'m01_cover_01');
  update(w,'gunner_dies',[{type:'casualty',memberId:ids[0],to:'dead'}]);assert.equal(w.combat().resources[0].operatorId,null);
});

test('resource, cover and destruction graph errors reject an entire prior casualty transaction',()=>{
  const {w,token,ids}=acquire();
  for(const bad of [{type:'resource',id:'unknown_mg',state:'destroyed',operatorId:null},
    {type:'cover',memberId:ids[1],coverId:'unknown_cover'},
    {type:'resource',id:'mw:m01:synthetic_mg',state:'operational',operatorId:ids[17]}]){
    unchanged(w,()=>update(w,'bad_graph',[{type:'casualty',memberId:ids[2],to:'dead'},bad],token));
  }
});

test('save AGGREGATED restores only the aggregate owner with identical bytes',()=>{
  const w=setup();w.clock(1000,16_210_000);update(w,'agg_move',[{type:'moveFormation',position:{x:905,y:0,z:40}}]);
  const r=AuthorityLeaseWorld.restore(w.save());assert.equal(r.save(),w.save());assert.equal(r.owner(),'AGGREGATED');assert.equal(r.snapshot().state.individual,null);
});

test('save active INDIVIDUAL restores lease, actor RNG and frozen aggregate source',()=>{
  const {w,token,ids}=acquire();w.clock(1000,16_201_000);update(w,'ai',[{type:'sampleAI',memberId:ids[0]}],token);
  const r=AuthorityLeaseWorld.restore(w.save());assert.equal(r.save(),w.save());assert.equal(r.owner(),'INDIVIDUAL');assert.equal(r.returnPayload().token,token);
  unchanged(r,()=>update(r,'wrong_resumed_aggregate',[{type:'moveFormation',position:{x:910,y:0,z:0}}]),/wrong authority/);
  r.release(r.returnPayload());assert.equal(r.owner(),'AGGREGATED');
});

test('double restore and subsequent individual inputs produce identical snapshots',()=>{
  const {w,token,ids}=acquire(),b=w.save(),r=AuthorityLeaseWorld.restore(AuthorityLeaseWorld.restore(b).save());assert.equal(r.save(),b);
  const op=[{type:'sampleAI',memberId:ids[0]}];assert.deepEqual(update(w,'after_restore',op,token),update(r,'after_restore',op,token));assert.equal(r.save(),w.save());
});

test('restore rejects both owners active, altered deaths, stale tokens and half-transition state',()=>{
  const {w}=acquire(),raw=w.snapshot();
  for(const change of [s=>s.state.mode='MATERIALIZING',s=>s.state.mode='DEMATERIALIZING',s=>s.state.mode='AGGREGATED',
    s=>s.state.lease.id='obsolete',s=>s.state.individual.members[17].status='combatReady',s=>s.state.sectorRng.state++]){
    const bad=clone(raw);change(bad);assert.throws(()=>AuthorityLeaseWorld.restore(JSON.stringify(bad)),/inconsistency/);
  }
});

test('restore rejects unsafe JSON, unknown version and malformed input log',()=>{
  const w=setup(),raw=w.snapshot();raw.format='authority-lease-prototype/v2';assert.throws(()=>AuthorityLeaseWorld.restore(JSON.stringify(raw)),/version/);
  assert.throws(()=>AuthorityLeaseWorld.restore(w.save().replace('"format":','"__proto__":{},"format":')),/unsafe/);
  const bad=w.snapshot();bad.state.history.push({kind:'unknown'});assert.throws(()=>AuthorityLeaseWorld.restore(JSON.stringify(bad)),/unknown history/);
});

test('149/151/148/152 acquires once, holds until >170 and reuses approved MID hysteresis',()=>{
  const w=setup(),actions=[149,151,148,152].map(distanceM=>w.reconcile({distanceM}).action);
  assert.deepEqual(actions,['ACQUIRE','HOLD','HOLD','HOLD']);assert.equal(w.snapshot().state.serial,1);
  assert.equal(w.reconcile({distanceM:170}).action,'HOLD');assert.equal(w.reconcile({distanceM:171}).action,'RELEASE');
  assert.equal(w.reconcile({distanceM:149}).action,'HOLD');assert.equal(w.reconcile({distanceM:129}).action,'ACQUIRE');
  assert.equal(w.snapshot().state.serial,2);assert.equal(representationBand(810,'MID'),'MID');assert.equal(representationBand(790,'FAR'),'FAR');
});

test('camera/visibility/LOW/MEDIUM/HIGH change neither authority nor canonical outcomes',()=>{
  const reference=runDemo({visible:true,quality:'HIGH'});
  for(const quality of ['LOW','MEDIUM','HIGH'])for(const visible of [false,true]){
    const r=runDemo({quality,visible});assert.equal(r.individual,reference.individual);assert.equal(r.aggregate,reference.aggregate);
    const w=setup();assert.equal(w.reconcile({distanceM:149,camera:{x:99999},visible,quality}).action,'ACQUIRE');
  }
});

test('gameplay relevance holds ownership; budget can defer acquire but cannot revoke live combat',()=>{
  const w=setup();assert.equal(w.reconcile({distanceM:100,simulationBudget:false}).action,'HOLD');
  assert.equal(w.reconcile({distanceM:900,interactionRelevant:true}).action,'ACQUIRE');
  assert.equal(w.reconcile({distanceM:900,missionRequired:true,simulationBudget:false}).action,'HOLD');
  assert.equal(w.owner(),'INDIVIDUAL');
});

test('duplicate and unknown return members reject atomically',()=>{
  const {w}=acquire();const duplicate=w.returnPayload();duplicate.combat.members[17]=clone(duplicate.combat.members[16]);
  unchanged(w,()=>w.release(duplicate),/duplicate member/);
  const unknown=w.returnPayload();unknown.combat.members[17].id='unknown_actor';unchanged(w,()=>w.release(unknown),/unknown member/);
  const missing=w.returnPayload();missing.combat.members.pop();unchanged(w,()=>w.release(missing),/conservation/);
});

test('return cannot invent reserve, loaded ammo, weapon identity or unrecorded progress',()=>{
  const {w}=acquire();for(const change of [p=>p.combat.reserveAmmunition++,p=>p.combat.members[0].loadedRounds++,
    p=>p.combat.members[0].weaponId='new_random_weapon',p=>p.combat.objective.progress++]){
    const p=w.returnPayload();change(p);unchanged(w,()=>w.release(p));
  }
});

test('RNG freezes aggregate stream, advances actor only, then resumes aggregate without mixing',()=>{
  const w=setup(),id=w.combat().members[0].id;update(w,'agg_exposure',[{type:'exposure',memberId:id,to:'wounded',probability:0}]);
  const sectorBefore=w.snapshot().state.sectorRng,actorBefore=w.combat().members[0].rng,{token}=acquire(w);
  const draw=update(w,'actor_decision',[{type:'sampleAI',memberId:id}],token);assert.equal(draw.samples.length,1);
  assert.deepEqual(w.snapshot().state.sectorRng,sectorBefore);assert.equal(w.combat().members[0].rng.draws,actorBefore.draws+1);
  const actorAfter=w.combat().members[0].rng;w.release(w.returnPayload());assert.deepEqual(w.snapshot().state.sectorRng,sectorBefore);
  update(w,'agg_resume',[{type:'exposure',memberId:id,to:'wounded',probability:0}]);assert.equal(w.snapshot().state.sectorRng.draws,sectorBefore.draws+1);
  assert.deepEqual(w.combat().members[0].rng,actorAfter);
});

test('individual RNG persists across reentry instead of being reseeded',()=>{
  const {w,token,ids}=acquire();update(w,'decision_1',[{type:'sampleAI',memberId:ids[0]}],token);const stream=w.combat().members[0].rng;
  w.release(w.returnPayload());const second=acquire(w);assert.deepEqual(w.combat().members[0].rng,stream);
  update(w,'decision_2',[{type:'sampleAI',memberId:ids[0]}],second.token);assert.equal(w.combat().members[0].rng.draws,2);
  assert.notEqual(w.combat().members[0].rng.state,stream.state);
});

test('failed operation after RNG draw rolls back stream, casualty and event consumption',()=>{
  const {w,token,ids}=acquire();unchanged(w,()=>update(w,'invalid_after_draw',[{type:'sampleAI',memberId:ids[0]},
    {type:'casualty',memberId:ids[1],to:'dead'},{type:'fire',memberId:ids[0],amount:10}],token),/insufficient/);
  assert.equal(w.combat().members[0].rng.draws,0);assert.equal(counts(w.combat()).dead,5);
});

test('both clocks pause, save paused lease and ignore elapsed wall time',()=>{
  const {w,token,ids}=acquire();w.clock(1000,16_200_000);w.setPaused(true);const paused=w.save();
  w.clock(999999,99999999);assert.equal(w.save(),paused);
  unchanged(w,()=>update(w,'paused_ai',[{type:'sampleAI',memberId:ids[0]}],token),/paused/);
  unchanged(w,()=>w.release(w.returnPayload()),/paused/);
  const r=AuthorityLeaseWorld.restore(paused);assert.equal(r.save(),paused);r.setPaused(false);r.clock(1100,16_200_000);
  assert.equal(r.snapshot().state.clocks.localMs,1100);assert.equal(r.snapshot().state.clocks.battleMs,16_200_000);
});

test('historical clock jumps do not move actors, expire leases or consume RNG',()=>{
  const {w}=acquire(),before=w.combat().members;w.clock(1000,25_500_000);
  assert.deepEqual(w.combat().members,before);assert.equal(w.owner(),'INDIVIDUAL');assert.equal(w.snapshot().state.sectorRng.draws,0);
});

test('return resets aggregate time boundary without catch-up movement or exposures',()=>{
  const {w}=acquire(),old=w.snapshot().state.aggregate;w.clock(600000,16_200_000);
  assert.deepEqual(w.snapshot().state.aggregate,old);w.release(w.returnPayload());
  assert.equal(w.combat().updatedAt,600000);assert.deepEqual(w.combat().anchor,old.anchor);assert.equal(w.snapshot().state.sectorRng.draws,0);
  update(w,'next_aggregate_move',[{type:'moveFormation',position:{x:901,y:0,z:40}}]);
  assert.equal(w.combat().members[0].position.x,old.members[0].position.x+1);
});

test('deterministic replay uses no Math.random and unchanged seed/input reproduces results',()=>{
  const old=Math.random;Math.random=()=>{throw Error('unseeded RNG');};
  try{const a=runDemo(),b=runDemo();assert.equal(a.aggregate,b.aggregate);assert.equal(a.individual,b.individual);}finally{Math.random=old;}
});

test('config adapter conserves ordinals, named IDs and known body/weapon ammo positions',()=>{
  const f={id:'fixture',nominalStrength:2,runs:[{from:0,to:1,status:'combatReady'},{from:1,to:2,status:'dead'}],namedIds:{0:'existing_runtime_actor'},
    individuals:{1:{position:{x:3,y:0,z:8},anchor:{x:0,y:0,z:0},rounds:4}},position:{x:100,y:0,z:0},initialPosition:{x:0,y:0,z:0},ammunition:20,objective:'hold'};
  const c=configFromBattleSector({id:'sector',revision:42,rng:10,updatedAt:0},f,1,{weaponBindings:{0:'weapon_0',1:'weapon_1'}}),w=new AuthorityLeaseWorld(c);
  assert.equal(w.combat().members[0].id,'existing_runtime_actor');assert.equal(w.combat().members[1].id,'fixture/soldier/1');
  assert.deepEqual(w.combat().members[1].position,{x:3,y:0,z:8});assert.equal(w.combat().members[1].loadedRounds,4);
  assert.throws(()=>configFromBattleSector({id:'sector',revision:42,rng:10,updatedAt:0},f,1),/weapon binding/);
  const bad=clone(f);bad.runs[1].from=0;assert.throws(()=>configFromBattleSector({id:'sector',revision:42,rng:10,updatedAt:0},bad,1),/partition/);
});

test('descriptor/snapshot edits cannot mutate the private authority store',()=>{
  const w=setup(),before=w.save(),s=w.snapshot(),c=w.combat();s.state.aggregate.members[0].status='dead';c.reserveAmmunition=999;
  assert.equal(w.save(),before);const {actors}=w.acquire({expectedRevision:42});actors[0].position.x=999;assert.notEqual(w.combat().members[0].position.x,999);
});

test('fresh processes produce identical canonical scenario JSON/CSV',()=>{
  const dir=mkdtempSync(join(tmpdir(),'m01-lease-'));
  try{for(const run of ['a','b']){const r=spawnSync(process.execPath,['tools/verification/m01-authority-lease-prototype.mjs','--out',join(dir,run)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
    for(const file of ['scenario.json','scenario.csv'])assert.equal(readFileSync(join(dir,'a',file),'utf8'),readFileSync(join(dir,'b',file),'utf8'));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
