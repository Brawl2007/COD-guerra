import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot,seconds} from '../src/game/m01-simulation.js';
import {AUXILIARY_IDS,YARD_IDS,updateYard} from '../src/game/m01-yard-life.js';
import {validateM01AudioEvent,enemyFireSoundPlan} from '../src/game/m01-audio-events.js';
import {sceneBeatFrame} from '../src/ui/m01-hud.js';
import {actorHitboxes,eyePosition} from '../src/world/spatial.js';
import {TRAIN_ARRIVALS,trainX,M01TrainLife} from '../src/render/m01-train-life.js';
import {M01BridgeFinishRuntime} from '../src/render/m01-bridge-finish-runtime.js';
import {M01StationDamage} from '../src/render/m01-station-damage.js';
import {M01_TRAIN_WAGON_PLAN} from '../src/render/m01-train-wagons.js';
import {LOCOMOTIVE_PLACEMENT} from '../src/render/m01-locomotive.js';
import {PANZERZUG_PLACEMENT} from '../src/render/m01-panzerzug.js';
import {Game} from '../src/game/game.js';
import {compareContinuation} from './helpers/m01-determinism.js';
const live=()=>{const s=new M01Simulation();s.tick(.05,{skip:true});return s;};
const clone=structuredClone;

test('all beats have nonnegative time; pre-roll is explicit and cannot move bomb instants or gates',()=>{
  const s=live(),m=s.definition;
  for(const scene of m.cutscenes){assert.ok(scene.timeline.every(b=>b.t>=0));for(const beat of scene.preRoll?.timeline??[])assert.ok(beat.t>=0&&beat.t<=scene.preRoll.duration);}
  assert.equal(m.events.find(e=>e.id==='evt_m01_east_demolition').trigger.at,'06:10:00');
  assert.equal(m.events.find(e=>e.id==='evt_m01_west_demolition').trigger.at,'06:45:00');
  assert.equal(m.events.find(e=>e.id==='evt_m01_east_demolition').trigger.gate,true);
  s.line('dlg_m01_051');s.battleClock=seconds('06:44:54');s.updatePreRoll();
  assert.equal(s.dialogueQueue.filter(l=>l.id==='dlg_m01_051').length,1,'warning cannot be queued twice');
});

test('019 remains absent at reorganization and after reload when the forward post survives a real near-miss',()=>{
  for(const near of [true,false]){const s=live(),point=s.world.point('forward_post');
    Object.assign(s.player,near?point:{x:-300,y:-3,z:60});s.consume('evt_m01_bombing_0434');s.consume('evt_m01_forward_post_bombed');
    assert.equal(s.flags['m01.forward_post_state'],near?'intact_near_miss':'destroyed');
    const r=new M01Simulation();r.restoreSnapshot(s.snapshot());
    for(const sim of [s,r]){sim.activate('follow_sergeant');Object.assign(sim.player,sim.world.point('rally_point'));sim.updateObjectives(.05,false);
      assert.equal(sim.dialogueQueue.some(l=>l.id==='dlg_m01_019'),!near);assert.ok(sim.dialogueQueue.some(l=>l.id==='dlg_m01_018'));
      const again=new M01Simulation();again.restoreSnapshot(sim.snapshot());again.updateObjectives(.05,false);
      assert.equal(again.dialogueQueue.some(l=>l.id==='dlg_m01_019'),!near);
    }
  }
});

test('audio contracts reject missing fields and real Game queues every enemy fire at 3D distance/343',()=>{
  for(const type of ['npc-shot','m01-blast','round-impact'])assert.throws(()=>validateM01AudioEvent({type}));
  const sim=live(),game=Object.create(Game.prototype);Object.assign(game,{sim,pendingSounds:[],renderer:{m01:{}}});
  const events=[0,1,2].map(i=>({type:'enemy-fire',origin:{x:sim.player.x+343,y:eyePosition(sim.player).y+343*i,z:sim.player.z},at:sim.clock,weapon:'mg34',rounds:1,interval:.075}));
  for(const event of events){game.handleM01Event(event);const request=game.pendingSounds.at(-1),p=enemyFireSoundPlan(event,sim.player);
    assert.equal(request.at,event.at+Math.sqrt(1+((event.origin.y-eyePosition(sim.player).y)/343)**2));assert.equal(request.distance,p.distance);}
  assert.equal(game.pendingSounds.length,events.length);assert.ok(game.pendingSounds[2].at>game.pendingSounds[0].at);
});

test('grenade smoke expires at20s even for old records, ground impacts retain safeImpact displacement',()=>{
  const s=live(),p={x:s.player.x+3,y:-100,z:s.player.z};const expected=s.safeImpact(p),actual=s.impact('forward_post',p,true);
  assert.equal(actual.x,expected.x);assert.equal(actual.z,expected.z);assert.ok(Math.abs(actual.y-s.world.heightAt(actual.x,actual.z))<=.2);
  s.impact('m01_grenade_0',{x:-100,y:-3,z:60},false);const d=s.sectors.damage.at(-1);assert.equal(d.smokeSeconds,20);
  delete d.smokeSeconds;s.clock=d.started+19.999;assert.equal(s.renderState.damage.at(-1).smokeVisible,true);
  s.clock=d.started+20;assert.equal(s.renderState.damage.at(-1).smokeVisible,false);validateM01Snapshot(s.snapshot());
  d.smokeSeconds=21;assert.throws(()=>validateM01Snapshot(s.snapshot()));
});

test('auxiliary roster is atomic/legacy-compatible; every yard actor clears real solids and the platoon corridor for90s',()=>{
  const s=live(),before=s.rng.state,legacy=s.snapshot(false);legacy.actors=legacy.actors.filter(a=>!AUXILIARY_IDS.includes(a.id));
  // 2026-10-23 (R1-a, amendment 16): the roster is 103, the 97 of the partials plus the six unnamed men of the west garrison (also displayOnly, kept in this legacy save and not counted among the enemies).
  const r=new M01Simulation();r.restoreSnapshot(legacy);assert.equal(r.actors.length,103);assert.equal(r.rng.state,before);assert.equal(r.enemies.length,50);
  const invalid=s.snapshot(false);invalid.actors=invalid.actors.filter(a=>a.id!==YARD_IDS[0]);const saved=r.snapshot();
  assert.throws(()=>r.restoreSnapshot(invalid));assert.deepEqual(r.snapshot(),saved);
  for(const at of ['04:30:00','04:36:00','05:41:00'])for(let t=0;t<=90;t+=.5){updateYard(s.actors,seconds(at)+t,t,s.world);
    for(const a of s.actors.filter(a=>YARD_IDS.includes(a.id))){assert.ok(a.z<27||a.z>42);
      assert.ok(!s.world.obstacles.some(b=>a.y+1.45>b.min.y&&a.y+.1<b.max.y&&a.x+a.radius>b.min.x&&a.x-a.radius<b.max.x&&a.z+a.radius>b.min.z&&a.z-a.radius<b.max.z),`${at}+${t}: ${a.id}`);}
  }assert.equal(s.rng.state,before);
});

test('display-only auxiliaries cannot intercept real player rays or become grenade damage/suppression targets',()=>{
  for(const kind of ['rifle','grenade']){const s=live(),target=s.actor('de_east_14'),aux=s.actor('de_mg34_loader_0');s.clock=5;
    Object.assign(target,{x:696,y:0,z:0,active:true});Object.assign(aux,{x:kind==='rifle'?693:696,y:0,z:kind==='rifle'?0:.5,active:true});
    Object.assign(s.player,{x:690,y:0,z:0,angle:0,pitch:Math.atan2(-.5,6),aiming:true});
    if(kind==='rifle')s.fire();else{s.grenades.active=[{id:'m01_grenade_0',x:696,y:0,z:0,vx:0,vy:0,vz:0,fuse:.01}];s.updateGrenades(.02,false);}
    assert.ok(target.health<100,kind+' hits the real enemy behind the auxiliary');assert.equal(aux.health,100);assert.equal(aux.suppressedUntil,0);assert.equal(aux.hitAt,-1e9);
    assert.ok(!s.combatants.includes(aux));assert.ok(!s.enemies.includes(aux));
  }
});

test('optional cover validation binds mapped node/type; legitimate predecessor carry speed migrates but corrupt new speed rejects',()=>{
  const s=live(),a=s.actor('marek_zielinski'),save=s.snapshot(false),old=save.actors.find(x=>x.id===a.id);
  delete old.postureProgress;old.motion.speed=27;const r=new M01Simulation();r.restoreSnapshot(save);assert.equal(r.actor(a.id).motion.speed,8);
  const bad=r.snapshot(false);bad.actors[0].motion.speed=9;assert.throws(()=>validateM01Snapshot(bad));
  const cover=s.world.coverNodes[0];a.cover={nodeId:cover.id,type:cover.type,side:'left',height:cover.heightM??0};validateM01Snapshot(s.snapshot());
  a.cover.nodeId='unknown-node';assert.throws(()=>validateM01Snapshot(s.snapshot()));
});

test('generic prone hitboxes lower and orient the silhouette from authoritative progress, with atomic corruption rejection',()=>{
  const s=live(),a=s.actor('sapper_2');a.suppressedUntil=s.clock+3;s.tick(.05);
  assert.equal(a.posture,'prone');const entering=actorHitboxes(a)[0];for(let i=0;i<25;i++)s.tick(.05);
  const box=actorHitboxes(a)[0];assert.ok(box.max.y<entering.max.y-.5);assert.ok(eyePosition(a).y<a.y+.5);
  const flatX=box.max.x-box.min.x;a.facing=Math.PI/2;const turned=actorHitboxes(a)[0];assert.ok(Math.abs((turned.max.z-turned.min.z)-flatX)<1e-8);
  const bad=s.snapshot();bad.actors.find(x=>x.id==='de_east_5').posture='prone';assert.throws(()=>validateM01Snapshot(bad));
  compareContinuation(s,{label:'generic-prone',ticks:80,doubleAt:[30]});
});

test('carry finite phases retain midphase saves, exact1.6m/s movement and death cleanup',()=>{
  const s=live(),bak=s.actor('jozef_bak'),medic=s.actor('leon_dudek');
  Object.assign(bak,{x:-120,y:-3,z:24,state:'WOUNDED',target:null});Object.assign(medic,{x:-121,y:-3,z:24,task:'evacuate_bak'});
  s.tick(.05);assert.equal(bak.carry.phase,'pickup');compareContinuation(s,{label:'carry-pickup',ticks:16,doubleAt:[7]});
  for(let i=0;i<25;i++)s.tick(.05);assert.equal(bak.carry.phase,'carry');s.tick(.05);assert.ok(Math.abs(medic.motion.speed-1.6)<1e-8);
  compareContinuation(s,{label:'carry-walk',ticks:15});Object.assign(medic,{x:-332,z:24});s.tick(.05);assert.equal(bak.carry.phase,'putdown');
  compareContinuation(s,{label:'carry-putdown',ticks:14});medic.alive=false;medic.health=0;medic.state='DOWN';s.tick(.05);
  assert.equal(bak.carriedBy,null);assert.equal(bak.carry,undefined);validateM01Snapshot(s.snapshot());
});

test('battle-clock train arrival is monotone, stops at exact final anchors and leaves simulation/count65 untouched',()=>{
  const s=live(),saved=s.snapshot(),scene=new THREE.Scene(),parents=[new THREE.Group(),new THREE.Group()];scene.add(...parents);const life=new M01TrainLife(...parents);
  for(const [id,p]of Object.entries(TRAIN_ARRIVALS)){let previous=Infinity;
    for(let at=p.from;at<=p.until+10;at+=.5){const x=trainX(at,id);assert.ok(x<=previous);previous=x;life.update(at);}
    assert.equal(trainX(p.until,id),p.finalX);assert.equal(trainX(p.until+100,id),p.finalX);
  }
  assert.equal(M01_TRAIN_WAGON_PLAN.length,65);assert.deepEqual(s.snapshot(),saved);assert.ok(life.diagnostics.trains.every(t=>t.fog===false));life.dispose();assert.equal(parents[0].children.length,0);
  assert.equal(TRAIN_ARRIVALS.train963.finalX,LOCOMOTIVE_PLACEMENT.position[0]);assert.equal(TRAIN_ARRIVALS.panzerzug.finalX,PANZERZUG_PLACEMENT.position[0]);
});

test('MG34 loader feeds through a real finite reload, restores mid-feed and leaves immediately on gunner death without additional shots',()=>{
  const s=live(),gun=s.actor('de_east_0');Object.assign(gun,{active:true,cooldown:100});for(let i=0;i<40;i++)s.tick(.05);
  gun.mg34Prone.beltRemaining=4;assert.equal(s.burst(gun,{x:100,y:0,z:22},'area',{rounds:4}),true);
  for(let i=0;i<8;i++)s.tick(.05);assert.equal(gun.mg34Prone.phase,'reload');const loader=s.actor(gun.mg34Prone.loader);s.tick(.05);
  assert.equal(loader.mg34Loader.phase,'feed');assert.equal(loader.loaderFor,gun.id);assert.equal(loader.mg34Loader.duration,4.8);
  compareContinuation(s,{label:'mg34-reload-feed',ticks:24,doubleAt:[5,13]});const issued=s.enemyFire.nextId;
  Object.assign(gun,{health:0,alive:false,state:'DOWN'});s.tick(.05);assert.equal(loader.mg34Loader.phase,'leave');assert.equal(loader.shot,0);
  for(let i=0;i<40;i++)s.tick(.05);assert.equal(loader.active,false);assert.equal(s.enemyFire.nextId,issued);validateM01Snapshot(s.snapshot());
});

test('ckm aim/feed are display-only and the finite west exit clears every real solid before retreat',()=>{
  const s=live(),crew=s.actors.filter(a=>a.ckm),before=s.enemyFire.nextId;s.battleClock=seconds('04:46:02');s.tick(.05);
  assert.ok(crew.every(a=>a.ckm.phase==='aim'&&a.shot===0));s.battleClock=seconds('04:46:07');s.tick(.05);assert.ok(crew.every(a=>a.ckm.phase==='feed'&&a.shot===0));
  s.consume('evt_m01_east_demolition');let steps=0;
  while(crew.some(a=>a.x>=-90)&&steps++<2000){s.tick(.05);
    for(const a of crew){assert.ok(!s.world.obstacles.some(b=>a.y+1.4>b.min.y&&a.y+.1<b.max.y&&a.x+a.radius>b.min.x&&a.x-a.radius<b.max.x&&a.z+a.radius>b.min.z&&a.z-a.radius<b.max.z),a.id+' physical exit');}
  }
  assert.ok(crew.every(a=>a.x<-90));assert.ok(s.enemyFire.rounds.every(r=>!crew.some(a=>a.id===r.by)));assert.ok(crew.every(a=>a.shot===0));
  compareContinuation(s,{label:'ckm-physical-exit',ticks:15,doubleAt:[5]});
});

test('four free scenes expose letterbox and a visible cue; scene elapsed/pause/reload alone determine the frame and camera stays unchanged',()=>{
  const s=live();for(const id of ['cs_m01_bombing','cs_m01_order','cs_m01_east_blast','cs_m01_west_blast']){
    s.scene={id,elapsed:1,beats:[]};const frame=sceneBeatFrame(s),player=clone(s.player);assert.equal(frame.letterbox,true);assert.ok(frame.lookPrompt.length>0);
    s.tick(0);assert.deepEqual(sceneBeatFrame(s),frame);assert.deepEqual(s.player,player);const r=new M01Simulation();r.restoreSnapshot(s.snapshot());assert.deepEqual(sceneBeatFrame(r),frame);
  }
});

test('station soot/glass derive from event age and restore cleanly; old protected station remains untouched',()=>{
  const scene=new THREE.Scene(),damage=new M01StationDamage(scene),records=[{id:'station_bomb',started:10}];
  damage.update(records,11);const early=damage.diagnostics;damage.update(records,70);assert.ok(damage.diagnostics.soot>early.soot);assert.equal(damage.diagnostics.brokenPanes,12);
  damage.update([],70);assert.equal(damage.diagnostics.visible,false);damage.update(records,11);assert.deepEqual(damage.diagnostics,early);damage.dispose();assert.equal(scene.children.length,0);
});

test('disabling warmed bridge owner stays disabled on its next native selection and all borrowed originals remain visible',async()=>{
  const root=new THREE.Group(),node=new THREE.Group();node.name='rail_span_01';root.add(node);const material=new THREE.MeshStandardMaterial({name:'steel_painted'}),mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);node.add(mesh);
  const owner=new M01BridgeFinishRuntime(root,{loadTexture:async()=>({texture:new THREE.Texture()})}),kits=[{root,file:{lod:2},pieces:[{name:node.name,node}]}],state={parts:{rail_span_01:{visible:true,lod:2}},damage:[]},camera=new THREE.PerspectiveCamera();camera.position.set(-1000,4,0);
  await owner.ready;owner.sync({kits,quality:'low',world:{revision:1}});await owner.ready;owner.select({kits,state,camera});assert.equal(owner.diagnostics.impostors.activeParts,1);
  owner.setEnabled(false);owner.sync({kits,quality:'low',world:{revision:1}});owner.select({kits,state,camera});owner.beginFrame(camera);
  assert.equal(owner.diagnostics.impostors.activeParts,0);assert.equal(owner.diagnostics.native.impostor.main.calls,0);assert.equal(mesh.visible,true);assert.equal(mesh.material,material);
  owner.dispose();mesh.geometry.dispose();material.dispose();
  const source=readFileSync(new URL('../src/render/m01-bridge-finish-runtime.js',import.meta.url),'utf8').split('beginFrame(camera)')[1].split('get diagnostics')[0];
  assert.doesNotMatch(source,/Object\.values|\.\.\.|\['main','shadow'\]/,'steady counter reset reuses persistent records');
});

test('real projectile near-pass classification uses closest approach even when impact is hundreds of metres away',()=>{
  for(const [offset,pass]of [[5,'crack'],[7,'whizz'],[13,'none']]){const s=live();Object.assign(s.player,{x:0,y:0,z:0});
    s.world.traceTerrain=()=>null;s.world.obstacles=[];
    s.landRound({id:'m01_round_test',by:'de_east_3',weapon:'kar98k',kind:'area',ox:-100,oy:eyePosition(s.player).y,oz:offset,ax:100,ay:eyePosition(s.player).y,az:offset,h:0,firedAt:0,arriveAt:1,tracer:false,victim:null});
    const event=s.drainEvents().find(e=>e.type==='round-impact');assert.ok(event.distance>200);assert.equal(event.pass,pass);assert.equal(event.crack,pass==='crack');
  }
});

test('far wagon batching independently preserves all authored vertices/UVs/normals/material identity and disposes only copies',async()=>{
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{batchFarWagon}=await import('../src/render/m01-train-batching.js');
  const loader=new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
  for(const type of ['covered','open']){const b=readFileSync(`assets/models/provisional/m01-wagons/m01_wagon_${type}_lod2.glb`),source=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');source.scene.updateMatrixWorld(true);
    const expected=[];source.scene.traverse(n=>{if(!n.isMesh)return;const g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();g.applyMatrix4(n.matrixWorld);expected.push({material:n.material,attributes:Object.fromEntries(Object.entries(g.attributes).map(([key,a])=>[key,Array.from(a.array)]))});g.dispose();});
    const batched=batchFarWagon(source);assert.equal(batched.scene.children.length,1);const actual=batched.scene.children[0];assert.equal(actual.material,expected[0].material);
    for(const key of Object.keys(expected[0].attributes))assert.deepEqual(Array.from(actual.geometry.attributes[key].array),expected.flatMap(e=>e.attributes[key]));
    assert.equal(expected.reduce((n,e)=>n+e.attributes.position.length/3,0),actual.geometry.attributes.position.count);for(const g of batched.ownedBatchGeometries)g.dispose();
    let originalMeshes=0;source.scene.traverse(n=>{if(n.isMesh)originalMeshes++;});assert.ok(originalMeshes>1);assert.equal(M01_TRAIN_WAGON_PLAN.length,65);
  }
});

test('legacy mid-demolition scene beat indices remain valid after explicit pre-roll extraction',()=>{
  const s=live();for(const id of ['cs_m01_east_blast','cs_m01_west_blast']){const def=s.definition.cutscenes.find(c=>c.id===id);assert.equal(def.timeline[0].preRollOnly,true);assert.equal(def.timeline[1].preRollOnly,true);
    const saved=s.snapshot();saved.scene={id,elapsed:1.1,beats:[0,1,2]};const r=new M01Simulation();r.restoreSnapshot(saved);assert.deepEqual(r.scene,saved.scene);compareContinuation(r,{label:id+' legacy beats',ticks:12,doubleAt:[4]});
  }
});

test('grenade smoke contributes actual pooled puffs before20s and none at expiry after save continuation, while raid columns persist',async()=>{
  const {M01Atmosphere}=await import('../src/render/m01-atmosphere.js');const original=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
  const owner=new M01Atmosphere(new THREE.Scene()),restoredOwner=new M01Atmosphere(new THREE.Scene());
  try{for(const legacy of [false,true]){const s=live();s.impact('m01_grenade_0',{x:-100,y:-3,z:60},false);s.impact('raid_0530',{x:-600,y:-3,z:100},true);
    const grenade=s.sectors.damage.find(d=>d.id==='m01_grenade_0');if(legacy)delete grenade.smokeSeconds;
    s.clock=grenade.started+19.95;const r=new M01Simulation();r.restoreSnapshot(s.snapshot());
    owner.update(s.renderState,s.clock,'high');restoredOwner.update(r.renderState,r.clock,'high');assert.ok(owner.diagnostics.smokeByDamage.m01_grenade_0>0);assert.deepEqual(restoredOwner.diagnostics.smokeByDamage,owner.diagnostics.smokeByDamage);
    s.tick(.05);r.tick(.05);assert.deepEqual(r.snapshot(),s.snapshot());
    for(const [sim,fx]of [[s,owner],[r,restoredOwner]]){fx.update(sim.renderState,sim.clock,'high');assert.equal(fx.diagnostics.smokeByDamage.m01_grenade_0,0);assert.ok(fx.diagnostics.smokeByDamage.raid_0530>0);}
  }}finally{owner.dispose();restoredOwner.dispose();globalThis.document=original;}
});

test('ckm typed fire_burst plan is saveable but policy-disabled, never fires, and malformed/armed plans reject atomically',()=>{
  const s=live();s.clock=2;s.battleClock=seconds('04:46:03');const a=s.actor('ckm_gunner');
  a.ckm={phase:'fire_burst',startedAt:1.5,visible:true,burstPlan:{policy:'disabled',startedAt:1.5,rounds:6,interval:.075,emitted:0}};
  const save=s.snapshot(),r=new M01Simulation();r.restoreSnapshot(save);assert.deepEqual(r.snapshot(),save);
  for(const mutation of [b=>b.ckm.burstPlan.policy='enabled',b=>b.ckm.burstPlan.emitted=1,b=>delete b.ckm.burstPlan,b=>b.ckm.burstPlan.rounds=2,b=>b.shot=1]){const bad=clone(save);mutation(bad.actors.find(x=>x.id===a.id));assert.throws(()=>r.restoreSnapshot(bad));assert.deepEqual(r.snapshot(),save);}
  const rounds=clone(s.enemyFire.rounds),next=s.enemyFire.nextId;s.updateActors(.05);r.updateActors(.05);
  assert.deepEqual(r.snapshot(),s.snapshot());assert.equal(a.ckm.phase,'aim');assert.equal(a.shot,0);assert.deepEqual(s.enemyFire.rounds,rounds);assert.equal(s.enemyFire.nextId,next);assert.ok(!s.drainEvents().some(e=>e.by?.startsWith('ckm_')));
});

test('supplemental original crew GLB has finite paired carry phases, complete rig bindings and reproducible saved-time poses',async()=>{
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{createHash}=await import('node:crypto');
  const base='assets/models/provisional/m01/characters/crews-evacuation/',bytes=readFileSync(base+'m01_crews_evacuation.glb'),manifest=JSON.parse(readFileSync(base+'manifest.json'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256);assert.ok(manifest.author.length>0&&manifest.license.length>0);assert.equal(manifest.units,'metres');
  const loader=new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)})),g=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  for(const phase of ['pickup','putdown'])for(const role of ['carrier','patient']){const name=`carry_${phase}_${role}`,clip=g.animations.find(c=>c.name===name);assert.ok(clip);assert.ok(Math.abs(clip.duration-1.6)<1e-6);
    for(const track of clip.tracks){assert.ok(g.scene.getObjectByName(track.name.split('.')[0]),track.name);assert.ok(Array.from(track.values).every(Number.isFinite));assert.ok(!track.name.startsWith('root.position'));}
    const mixer=new THREE.AnimationMixer(g.scene),action=mixer.clipAction(clip).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    const frame=t=>{mixer.setTime(t);g.scene.updateMatrixWorld(true);return g.scene.getObjectByName('hips').matrixWorld.toArray();};
    const start=frame(0),middle=frame(.8),end=frame(1.6);assert.notDeepEqual(start,end);assert.notDeepEqual(start,middle);assert.deepEqual(frame(.8),middle);mixer.stopAllAction();mixer.uncacheRoot(g.scene);
  }
  assert.ok(g.animations.some(c=>c.name==='carry_walk'));assert.ok(g.animations.some(c=>c.name==='prone_enter'));
});

test('train headlamp halo is in front of the actual original engine geometry, without changing engine anchors',async()=>{
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{TRAIN_HEADLAMP_OFFSET}=await import('../src/render/m01-train-life.js');
  for(const path of ['locomotive/m01_locomotive_freight','panzerzug/m01_panzerzug_visual'])for(const lod of [0,1,2]){const b=readFileSync('assets/models/production/m01/'+path+'_lod'+lod+'.glb');
    const g=await new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');g.scene.rotation.y=Math.PI/2;g.scene.updateMatrixWorld(true);
    assert.ok(TRAIN_HEADLAMP_OFFSET<new THREE.Box3().setFromObject(g.scene).min.x-.1,`${path}LOD${lod}: halo clears original front geometry`);
  }
});
