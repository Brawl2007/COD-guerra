import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {M01Characters} from '../src/render/m01-characters.js';
import {soldierVisualVariant, SoldierVisualVariations} from '../src/render/m01-soldier-variation.js';
import {nodeCharacterAssets} from '../tools/verification/m01-soldier-variation-assets.mjs';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {actorHitboxes,muzzlePosition} from '../src/world/spatial.js';
import {integratedPresentation} from './helpers/m01-byte-guard-allowlist.js';
import {withoutT47} from './helpers/m01-layout-t47-delta.js';
import {driver,toRepair} from './helpers/m01-route.js';
const assets=await nodeCharacterAssets();
function characters(on=true){const c=new M01Characters(new THREE.Scene(),{visualVariation:on});c.sources=assets.sources;c.clips=assets.clips;return c;}
function fixtureActors(nation){return new M01Simulation().actors.filter(a=>a.team===(nation==='de'?'enemy':'ally')&&!a.civilian&&a.role==='RIFLEMAN').slice(0,8).map((a,i)=>({...a,active:true,alive:true,state:'GUARD',crouched:false,target:null,shot:0,firedAt:-1e9,x:(i-3.5)*.7,y:0,z:0,facing:-Math.PI/2}));}
const visibleCounts=c=>{let tris=0,draws=0;for(const v of c.instances.values())for(const m of v.meshes)if(m.visible){draws++;tris+=(m.geometry.index?.count??0)/3;}return {tris,draws};};

test('eight bounded profiles per nation are deterministic by ID/side/real role and independent of clocks, health, order and quality',()=>{
 for(const nation of ['pl','de']){const actors=new M01Simulation().actors.filter(a=>a.team===(nation==='de'?'enemy':'ally')&&!a.civilian),first=actors.map(soldierVisualVariant);assert.ok(new Set(first.map(v=>v.id)).size>=6);assert.ok(new Set(first.map(v=>v.head)).size>2);
  for(const a of actors){const v=soldierVisualVariant(a);assert.deepEqual(soldierVisualVariant({...a,alive:false,state:'WOUNDED',x:42,hp:1,clock:999,quality:'low'}),v);assert.deepEqual(soldierVisualVariant(JSON.parse(JSON.stringify(a))),v);}
  assert.deepEqual([...actors].reverse().map(soldierVisualVariant).reverse(),first);
 }
 const sim=new M01Simulation();assert.equal(soldierVisualVariant(sim.actor('marek_zielinski')).head,'zielinski');assert.equal(soldierVisualVariant(sim.actor('pawel_krawiec')).shovel,true);
});
test('actual GLB variants survive all three LODs, pause, rebind and re-created renderers without actor/source mutation',()=>{
 for(const nation of ['pl','de']){const actors=fixtureActors(nation),saved=structuredClone(actors),c=characters();try{
  let first;for(const distance of [5,25,65,5]){c.update(actors,12,{x:0,z:-distance},'high');assert.equal(c.instances.size,8);const descriptions=c.diagnostics.actors.map(a=>({id:a.id,visual:a.visual}));if(first)assert.deepEqual(descriptions,first);else first=descriptions;
   for(const v of c.instances.values()){assert.equal(v.root.getObjectByName('head_'+v.visual.head).visible,true);assert.equal(v.root.position.y,0);assert.ok(v.meshes.every(m=>!m.geometry.getAttribute('position')||Number.isFinite(m.geometry.getAttribute('position').getX(0))));}
  }
  const d=characters();try{d.update(actors,12,{x:0,z:-5},'high');assert.deepEqual(d.diagnostics.actors.map(a=>({id:a.id,visual:a.visual})),first);}finally{d.dispose();}
  assert.deepEqual(actors,saved);
 }finally{c.dispose();}}
});
test('OFF vs ON has exactly equal world bones, root/facing, gameplay hitboxes, weapon meshes and rendered muzzle at every LOD',()=>{
 for(const nation of ['pl','de']){const actors=fixtureActors(nation),a=characters(false),b=characters();try{
  for(const distance of [5,25,65]){a.update(actors,23,{x:0,z:-distance},'high');b.update(actors,23,{x:0,z:-distance},'high');
   for(const actor of actors){const av=a.instances.get(actor.id),bv=b.instances.get(actor.id);assert.deepEqual(bv.root.matrixWorld.toArray(),av.root.matrixWorld.toArray());
    av.root.traverse(n=>{if(n.isBone)assert.deepEqual(bv.root.getObjectByName(n.name).matrixWorld.toArray(),n.matrixWorld.toArray(),actor.id+':'+n.name);});
    assert.deepEqual(b.muzzle(actor.id).toArray(),a.muzzle(actor.id).toArray());assert.deepEqual(actorHitboxes(actor),actorHitboxes(structuredClone(actor)));assert.deepEqual(muzzlePosition(actor,23),muzzlePosition(structuredClone(actor),23));
    assert.deepEqual(b.diagnostics.actors.find(v=>v.id===actor.id).weaponMeshes,a.diagnostics.actors.find(v=>v.id===actor.id).weaponMeshes);
   }
   assert.ok(visibleCounts(b).tris<=visibleCounts(a).tris+50);assert.equal(visibleCounts(b).draws,visibleCounts(a).draws);
  }
 }finally{a.dispose();b.dispose();}}
});
test('shared originals retain all attributes and indices; source atlas is shared; cached variants add no textures/draws',()=>{
 const snapshots=[];for(const g of assets.sources.values())g.scene.traverse(n=>{if(n.isMesh)snapshots.push({n,geometry:n.geometry,material:n.material,index:n.geometry.index.array.slice(),position:Array.from({length:n.geometry.attributes.position.count},(_,i)=>[n.geometry.attributes.position.getX(i),n.geometry.attributes.position.getY(i),n.geometry.attributes.position.getZ(i)])});});
 const c=characters();try{for(const nation of ['pl','de'])for(const distance of [5,25,65])c.update(fixtureActors(nation),1,{x:0,z:-distance},'high');
  for(const {n,geometry,material,index,position}of snapshots){assert.equal(n.geometry,geometry);assert.equal(n.material,material);assert.deepEqual(n.geometry.index.array,index);for(let i=0;i<position.length;i++)assert.deepEqual([n.geometry.attributes.position.getX(i),n.geometry.attributes.position.getY(i),n.geometry.attributes.position.getZ(i)],position[i]);}
  assert.ok(c.visuals.materials.size<=6);assert.equal(c.visuals.diagnostics.additionalTextures,0);assert.equal(c.visuals.diagnostics.additionalDrawCalls,0);
 }finally{c.dispose();}
});
test('actual gear silhouettes differ through existing breadbag fullness/optional shovel; ammo pouches and skins remain',()=>{
 for(const nation of ['pl','de']){const actors=fixtureActors(nation),c=characters();try{c.update(actors,1,{x:0,z:-5},'high');const geometries=[...c.instances.values()].map(v=>v.root.getObjectByName('gear').geometry),source=assets.sources.get(nation+':0').scene.getObjectByName('gear').geometry;
  assert.ok(geometries.some(g=>g.index.count<source.index.count));assert.ok(geometries.some(g=>g.getAttribute('position')!==source.getAttribute('position')));assert.ok(geometries.every(g=>g.index.count>source.index.count*.70));
  for(const g of geometries){assert.equal(g.getAttribute('skinIndex'),source.getAttribute('skinIndex'));assert.equal(g.getAttribute('skinWeight'),source.getAttribute('skinWeight'));assert.equal(g.getAttribute('uv'),source.getAttribute('uv'));}
 }finally{c.dispose();}}
});
test('simulation futures/RNG/saves/checkpoints are exact with visual OFF vs ON; renderer freeze/reload does not write state',()=>{
 const a=new M01Simulation(),b=new M01Simulation(),ca=characters(false),cb=characters();try{
  for(let i=0;i<120;i++){const dt=[.05,.016,0,.033][i%4],inputs=i===0?{skip:true}:{lookX:i%7,aim:true,fire:i%17===0};a.tick(dt,inputs);b.tick(dt,inputs);ca.update(a.actors,a.clock,a.player,'high',a.battleClock);cb.update(b.actors,b.clock,b.player,'high',b.battleClock);assert.deepEqual(b.snapshot(),a.snapshot());assert.equal(b.rng.state,a.rng.state);}
  const snapshot=b.snapshot(),variants=b.actors.map(soldierVisualVariant);for(let i=0;i<3;i++)cb.update(b.actors,b.clock,b.player,'high',b.battleClock);assert.deepEqual(b.snapshot(),snapshot);
  const restored=new M01Simulation();restored.restoreSnapshot(JSON.parse(JSON.stringify(snapshot)));assert.deepEqual(restored.snapshot(),snapshot);assert.deepEqual(restored.actors.map(soldierVisualVariant),variants);assert.deepEqual(snapshot.resumeCheckpoint?.actors.map(soldierVisualVariant),a.snapshot().resumeCheckpoint?.actors.map(soldierVisualVariant));
 }finally{ca.dispose();cb.dispose();}
});
test('missing optional art stays procedural; release/rebind keeps cached buffers until owner disposal',()=>{
 const c=new M01Characters(new THREE.Scene());try{assert.deepEqual([...c.update(fixtureActors('pl'),1,{x:0,z:0})],[]);}finally{c.dispose();}
 const real=characters();real.update(fixtureActors('de'),1,{x:0,z:-5},'high');let disposed=0;for(const g of real.visuals.geometries.values())g.addEventListener('dispose',()=>disposed++);real.update([],1,{x:0,z:0},'high');assert.equal(disposed,0);const count=real.visuals.geometries.size;real.dispose();assert.equal(disposed,count);real.dispose();assert.equal(disposed,count);
});
test('real continuation and its CP backup keep the same visual identities; German face treatments stay within 3 mm',()=>{
 const d=toRepair(driver()),saved=d.sim.snapshot();assert.ok(saved.resumeCheckpoint?.actors.length>80);
 const identities=new Map(d.sim.actors.map(a=>[a.id,soldierVisualVariant(a)]));
 for(const payload of [saved,saved.resumeCheckpoint]){const sim=new M01Simulation();sim.restoreSnapshot(JSON.parse(JSON.stringify(payload)));for(const a of sim.actors)assert.deepEqual(soldierVisualVariant(a),identities.get(a.id));}
 const c=characters();try{c.update(fixtureActors('de'),12,{x:0,z:-5},'high');for(const v of c.instances.values()){
  const head=v.root.getObjectByName('head_'+v.visual.head),p=head.geometry.getAttribute('position'),original=assets.sources.get(v.key).scene.getObjectByName(head.name).geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){assert.ok(Math.abs(p.getX(i)-original.getX(i))<=.0030001);assert.equal(p.getY(i),original.getY(i));assert.ok(Math.abs(p.getZ(i)-original.getZ(i))<=.0015001);}
 }}finally{c.dispose();}
});
test('integration preserves gameplay, hitbox/muzzle, save, locomotion and non-presentation base assets byte-identical',()=>{
 const base='5f3cc34f53c61beec52255d67f8babd7194c9f7f',paths=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n').filter(p=>/^(src|assets|missions)\//.test(p));
 for(const p of paths){
  if(integratedPresentation.has(p))continue;
  const baseline=execFileSync('git',['show',base+':'+p],{maxBuffer:32*1024*1024});
  const actual=readFileSync(new URL('../'+p,import.meta.url));
  if(p==='missions/m01-tczew/ENGINE_CONTRACT.md'){
    const start=baseline.indexOf(Buffer.from('Dados revistos nos PRs #8 e #10;'));
    assert.ok(start>=0,'baseline engine contract marker');
    assert.ok(actual.includes(baseline.subarray(start)),'original M01 gameplay contract remains intact');
    assert.match(actual.toString('utf8'),/## Apresentação das animações — V1 \(schema 2\)/);
  }else if(p==='missions/m01-tczew/map-layout.json'||p==='missions/m01-tczew/HISTORICAL_RESEARCH.md'||p==='missions/m01-tczew/MAP.md'){assert.deepEqual(withoutT47(p,actual),baseline,p);   // T47: only the named hunks (three layout hunks, one research row, four MAP.md hunks) differ from the base
  }else{assert.deepEqual(actual,baseline,p);}
 }
 const file=readFileSync(new URL('../src/render/m01-characters.js',import.meta.url),'utf8'),old=execFileSync('git',['show',base+':src/render/m01-characters.js'],{encoding:'utf8'});
 const section=(s,begin,end)=>s.slice(s.indexOf(begin),s.indexOf(end,s.indexOf(begin)));
 // Old exact-byte lock was for unchanged visual-variation work. The new animation
 // resolver intentionally changes generic gait/transition selection. Preserve the
 // specialized MG34 prone, CKM and station patient/medic decision block exactly.
 // Partials T36 (ckm aim/feed phases with latent fire_burst shown as aim; Bąk carry pickup/putdown and generic prone/reload
 // clip selection) is the only approved delta: revert exactly those strings, each found once, and every other byte stays locked.
 const T36_DELTA=[
  ["      const phase=actor.ckm.phase==='fire_burst'?'aim':actor.ckm.phase,role=actor.id==='ckm_gunner'?'gunner':'loader';\n      const name=`ckm_wz30_${role}_${phase}`;\n      return {clip:this.clips.has(name)?name:`ckm_wz30_${role}_idle`,time:Math.max(0,time-actor.ckm.startedAt),loop:phase==='idle'||phase==='aim'};\n",
   "      const phase=actor.ckm.phase,role=actor.id==='ckm_gunner'?'gunner':'loader';\n      return {clip:`ckm_wz30_${role}_${phase}`,time:Math.max(0,time-actor.ckm.startedAt),loop:phase==='idle'};\n"],
  ["    }\n    const bak=actor.id==='jozef_bak'?actor:actors.find(a=>a.id==='jozef_bak'&&a.carriedBy===actor.id);\n    if(bak?.carry&&bak.alive){const phase=bak.carry.phase,patient=actor===bak;\n      if(phase!=='carry'){const name=`carry_${phase}_${patient?'patient':'carrier'}`;\n        if(this.clips.has(name))return {clip:name,time:Math.min(1.6,Math.max(0,time-bak.carry.startedAt)),loop:false};\n        return {clip:patient?'wounded':'crouched_idle',time:0,loop:false};}\n      if(patient)return {clip:'carried',time:time+offset,loop:true};\n      if(this.clips.has('carry_walk')){const duration=this.clips.get('carry_walk').duration,phase=(actor.motion?.odometer??0)/(1.6*duration);\n        return {clip:'carry_walk',time:(phase-Math.floor(phase))*duration,loop:true,rate:(actor.motion?.speed??1.6)/1.6};}\n    }\n    if(actor.posture==='prone'&&!actor.mg34Prone){const age=Math.max(0,time-actor.postureSince),clip=age<1.2?'prone_enter':'prone_idle';\n      if(this.clips.has(clip))return {clip,time:age<1.2?age:age-1.2,loop:age>=1.2};\n      return {clip:'pinned',time:0,loop:false};}\n    if(actor.reload&&this.clips.has('reload_clip'))return {clip:'reload_clip',time:Math.min(3.4,time-actor.reload.startedAt),loop:false};\n",
   "    }\n"],
  ["    const v=this.ckm,phase=gunner.ckm.phase==='fire_burst'?'aim':['idle','aim','feed'].includes(gunner.ckm.phase)?gunner.ckm.phase:'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`)??v.clips.find(c=>c.name==='ckm_wz30_gun_idle');\n",
   "    const v=this.ckm,phase=gunner.ckm.phase==='idle'?'idle':'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`);\n"]
 ];
 // T47 (live ckm fire, M01-CKM-FIRE-LIVE): the simulation now publishes a real fire_burst phase and the renderer plays its clip instead of showing it as aim.
 // Same method one level up: revert exactly those two strings, each found once, back to the T36 text, then the T36 reversion below applies unchanged.
 const T47_DELTA=[
  ["      const phase=actor.ckm.phase,role=actor.id==='ckm_gunner'?'gunner':'loader';\n      const name=`ckm_wz30_${role}_${phase}`;\n",
   "      const phase=actor.ckm.phase==='fire_burst'?'aim':actor.ckm.phase,role=actor.id==='ckm_gunner'?'gunner':'loader';\n      const name=`ckm_wz30_${role}_${phase}`;\n"],
  ["    const v=this.ckm,phase=['idle','aim','fire_burst','feed'].includes(gunner.ckm.phase)?gunner.ckm.phase:'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`)??v.clips.find(c=>c.name==='ckm_wz30_gun_idle');\n",
   "    const v=this.ckm,phase=gunner.ckm.phase==='fire_burst'?'aim':['idle','aim','feed'].includes(gunner.ckm.phase)?gunner.ckm.phase:'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`)??v.clips.find(c=>c.name==='ckm_wz30_gun_idle');\n"]
 ];
 // 2026-10-22 (ckm stoppage, golden amendment 13): the renderer reads the clip phase of a saved ckm record through ckmClipPhase (a stoppage plays the authored `feed` drill at the end of its
 // clearance; every other phase comes back as it was, with the same start). Same method one level up: revert exactly those three hunks, each found once, back to the T47 text, then the T47 and
 // T36 reversions below apply unchanged and every other byte stays locked.
 const CKMJAM_DELTA=[
  ["      const role=actor.id==='ckm_gunner'?'gunner':'loader',{phase,time:age}=ckmClipPhase(actor.ckm,time);\n      const name=`ckm_wz30_${role}_${phase}`;\n      return {clip:this.clips.has(name)?name:`ckm_wz30_${role}_idle`,time:age,loop:phase==='idle'||phase==='aim'};\n",
   "      const phase=actor.ckm.phase,role=actor.id==='ckm_gunner'?'gunner':'loader';\n      const name=`ckm_wz30_${role}_${phase}`;\n      return {clip:this.clips.has(name)?name:`ckm_wz30_${role}_idle`,time:Math.max(0,time-actor.ckm.startedAt),loop:phase==='idle'||phase==='aim'};\n"],
  ["    const v=this.ckm,drawn=ckmClipPhase(gunner.ckm,time),phase=['idle','aim','fire_burst','feed'].includes(drawn.phase)?drawn.phase:'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`)??v.clips.find(c=>c.name==='ckm_wz30_gun_idle');\n",
   "    const v=this.ckm,phase=['idle','aim','fire_burst','feed'].includes(gunner.ckm.phase)?gunner.ckm.phase:'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`)??v.clips.find(c=>c.name==='ckm_wz30_gun_idle');\n"],
  ["    const age=gunner.ckm.phase==='retreat'?clip.duration:drawn.time;\n",
   "    const age=gunner.ckm.phase==='retreat'?clip.duration:Math.max(0,time-gunner.ckm.startedAt);\n"]
 ];
 let current=section(file,'    const prone=mg34ProneSample(actor,time);',"    if(pose.name==='carried')")+section(file,'  updateCKM(','  get diagnostics');
 for(const [now,original]of CKMJAM_DELTA){assert.equal(current.split(now).length,2,'approved ckm-stoppage delta occurs exactly once');current=current.replace(now,()=>original);}
 for(const [now,original]of T47_DELTA){assert.equal(current.split(now).length,2,'approved T47 delta occurs exactly once');current=current.replace(now,()=>original);}
 for(const [now,original]of T36_DELTA){assert.equal(current.split(now).length,2,'approved T36 delta occurs exactly once');current=current.replace(now,()=>original);}
 assert.equal(current,section(old,'    const prone=mg34ProneSample(actor,time);',"    if(pose.name==='carried')")+section(old,'  updateCKM(','  get diagnostics'));
 // PR #78 T07/T36: the MG34 loader adapter hunk that precedes the prone sample is byte-pinned (the rest of sample() is locked above, since the unified resolver rewrote its header).
 {const sampler=section(file,'  sample(','  create('),start=sampler.indexOf('    if(actor.mg34Loader)'),end=sampler.indexOf('    const prone=mg34ProneSample',start);assert.ok(start>=0&&end>start);
  assert.equal(createHash('sha256').update(sampler.slice(start,end)).digest('hex'),'5710ad4e1dd2385c3df6e78cf0440067a56cdf9d19a411701841196ad71c5f5f','exact approved T07/T36 loader adapter');}
 const t47CKM="    const v=this.ckm,phase=['idle','aim','fire_burst','feed'].includes(gunner.ckm.phase)?gunner.ckm.phase:'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`)??v.clips.find(c=>c.name==='ckm_wz30_gun_idle');";
 const currentCKM="    const v=this.ckm,phase=gunner.ckm.phase==='fire_burst'?'aim':['idle','aim','feed'].includes(gunner.ckm.phase)?gunner.ckm.phase:'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`)??v.clips.find(c=>c.name==='ckm_wz30_gun_idle');";
 const priorCKM="    const v=this.ckm,phase=gunner.ckm.phase==='idle'?'idle':'abandon',clip=v.clips.find(c=>c.name===`ckm_wz30_gun_${phase}`);";
 let ckmSection=section(file,'  updateCKM(','  get diagnostics');
 for(const [now,original]of CKMJAM_DELTA.slice(1)){assert.equal(ckmSection.split(now).length,2,'approved ckm-stoppage delta occurs exactly once in updateCKM');ckmSection=ckmSection.replace(now,()=>original);}
 assert.equal(ckmSection.split(t47CKM).length,2,'exact T47 live fire_burst/aim/feed adapter');
 const t36Section=ckmSection.replace(t47CKM,currentCKM);assert.equal(t36Section.split(currentCKM).length,2,'exact T36 disabled-burst/aim/feed adapter once T47 is reverted');
 assert.equal(t36Section.replace(currentCKM,priorCKM),section(old,'  updateCKM(','  get diagnostics'));
});
