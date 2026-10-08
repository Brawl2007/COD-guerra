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
const integratedPresentation=new Set([
 // Simulation presentation additions are checked against immutable per-tick gameplay traces in m01-animation-contract.test.js.
 'src/game/m01-simulation.js',
 'src/core/audio.js','src/game/game.js','src/main.js','src/styles.css',
 'src/render/m01-atmosphere.js','src/render/m01-characters.js','src/render/m01-environment.js','src/render/m01-surfaces.js',
 'src/render/m01-train-wagons.js','src/render/m01-view.js','src/render/m01-viewmodel.js','src/render/three-renderer.js'
]);
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
  }else{assert.deepEqual(actual,baseline,p);}
 }
 const file=readFileSync(new URL('../src/render/m01-characters.js',import.meta.url),'utf8'),old=execFileSync('git',['show',base+':src/render/m01-characters.js'],{encoding:'utf8'});
 const section=(s,begin,end)=>s.slice(s.indexOf(begin),s.indexOf(end,s.indexOf(begin)));
 assert.equal(section(file,'  sample(','  create('),section(old,'  sample(','  create('));
 assert.equal(section(file,'  updateCKM(','  get diagnostics'),section(old,'  updateCKM(','  get diagnostics'));
});
