import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01View} from '../src/render/m01-view.js';
import {ju87HeardAt,ju87Fade,ju87Attitude} from '../src/render/m01-aircraft.js';
import {m01StukaPosition,m01RaidPlanePosition,M01_RAID_PASS_SECONDS} from '../src/world/m01-aircraft-path.js';
import {driver} from './helpers/m01-route.js';

function fixture(fail=()=>false){
  const view=Object.create(M01View.prototype),sources=new Map();
  Object.assign(view,{scene:new THREE.Scene(),owner:{quality:'low'},box:new THREE.BoxGeometry(),
    materials:{dark:new THREE.MeshStandardMaterial()},disposed:false});
  for(const lod of [0,1,2]){
    const scene=new THREE.Group(),prop=new THREE.Mesh(view.box,view.materials.dark);prop.name='propeller';scene.add(prop);
    const bomb=prop.clone();bomb.name='bomb_sc250';scene.add(bomb);
    const clip=new THREE.AnimationClip('propeller_spin',1,[new THREE.QuaternionKeyframeTrack('propeller.quaternion',
      [0,.25,.5,.75,1],[0,0,0,1,0,0,-Math.SQRT1_2,Math.SQRT1_2,0,0,-1,0,0,0,-Math.SQRT1_2,-Math.SQRT1_2,0,0,0,-1])]);
    sources.set(lod,{scene,animations:[clip]});
  }
  view.assets={load:async key=>{const lod=Number(key.split(':')[1]);if(fail(lod))throw new Error('optional download');return sources.get(lod);}};
  view.createAircraft();return {view,sources};
}

test('Ju 87 clones use native LODs, share art, sample the saved clock and follow the stukaPath anchored to the bombing',async()=>{
  const {view,sources}=fixture();await view.loadAircraft();
  assert.deepEqual([...view.aircraftSources.keys()].sort(),[0,1,2]);assert.equal(view.aircraftMixers.length,9);
  // The bombing anchor comes from the saved station_bomb impact: about 1.7 s have passed since evt_m01_bombing_0434.
  const time=12.013,started=10.3,since=time-started,state=Object.freeze({stukas:true,secondRaid:false,damage:Object.freeze([Object.freeze({id:'station_bomb',started})])});
  const player=Object.freeze(m01StukaPosition(since,0));
  for(const [quality,want] of [['low',2],['medium',1],['high',0]]){
    view.owner.quality=quality;view.updateAircraft(state,time,player);
    const selected=view.planes[0].levels.filter(l=>l.object.visible);assert.equal(selected.length,1);
    assert.equal(selected[0].object.userData.lod,want);
    assert.equal(selected[0].object.getObjectByName('propeller').geometry,sources.get(want).scene.getObjectByName('propeller').geometry);
    assert.equal(selected[0].object.getObjectByName('bomb_sc250').visible,false,'unverified payload is not displayed');
    assert.equal(view.planes[0].visible,true);assert.equal(view.raidPlane.visible,false);
  }
  const model=view.planes[0].levels[0].object,prop=model.getObjectByName('propeller'),frozen=prop.quaternion.toArray();
  assert.notDeepEqual(frozen,[0,0,0,1]);
  assert.notEqual(model,view.planes[1].levels[0].object);assert.notEqual(model.userData.propellerMixer,view.planes[1].levels[0].object.userData.propellerMixer);
  view.updateAircraft(state,time,player);assert.deepEqual(prop.quaternion.toArray(),frozen);
  view.updateAircraft(state,time+.005,player);assert.notDeepEqual(prop.quaternion.toArray(),frozen);
  view.updateAircraft(state,time,player);assert.deepEqual(prop.quaternion.toArray(),frozen,'restoring clock restores pose');
  assert.deepEqual(view.planes[0].position.toArray(),[player.x,player.y,player.z]);
  assert.equal(view.planes[0].rotation.y,ju87Attitude(since,0).yaw);
  // The raid is hidden, then shown from its own state at the start of the high pass.
  view.updateAircraft(Object.freeze({stukas:false,secondRaid:true,damage:Object.freeze([Object.freeze({id:'raid_0530',started:time})])}),time,player);
  assert.ok(view.planes.every(p=>!p.visible));assert.equal(view.raidPlane.visible,true);
  assert.deepEqual(view.raidPlane.position.toArray(),Object.values(m01RaidPlanePosition(0)));
});

test('missing optional Ju 87 art keeps the silhouettes; partial failure uses available detail and disposal prevents attachment',async()=>{
  const {view}=fixture(()=>true);await view.loadAircraft();view.updateAircraft({stukas:true,secondRaid:false},10,{x:0,y:0,z:0});
  assert.equal(view.aircraftRevision,0);assert.equal(view.aircraftMixers.length,0);
  assert.ok(view.planes.every(p=>p.visible&&p.levels[0].object.userData.lod==='proxy'));
  const partial=fixture(lod=>lod===2).view;await partial.loadAircraft();partial.updateAircraft({stukas:true},10,{x:0,y:0,z:0});
  assert.ok(partial.planes.every(p=>p.levels.find(l=>l.object.visible).object.userData.lod===1));
  const cancelled=fixture().view;cancelled.disposed=true;await cancelled.loadAircraft();
  assert.equal(cancelled.aircraftRevision,0);assert.equal(cancelled.aircraftMixers.length,0);
  assert.ok(cancelled.planes.every(p=>p.levels.length===1));
});

function namedFixture(){
  // Same node/material layout as the generated GLB: atlas body, translucent canopy and propeller disc.
  const {view,sources}=fixture();
  for(const [lod,{scene}] of sources){
    const body=new THREE.MeshStandardMaterial({name:'ju87_b1',map:new THREE.Texture()}),glass=new THREE.MeshStandardMaterial({name:'ju87_glass',transparent:true,opacity:.3});
    const disc=new THREE.MeshStandardMaterial({name:'ju87_prop_disc',transparent:true,side:THREE.DoubleSide});
    scene.getObjectByName('propeller').material=body;
    for(const [name,material] of [['fuselage',body],['canopy',glass],['propeller_disc',disc]]){const m=new THREE.Mesh(view.box,material);m.name=name;scene.add(m);}
    scene.userData.body=body;scene.userData.lod=lod;
  }
  return {view,sources};
}

test('each Ju 87 gets its own light-weight material instances over shared textures, propeller rpm/phase and attitude',async()=>{
  const {view,sources}=namedFixture();await view.loadAircraft();
  const time=33.4,started=30,since=time-started,state={stukas:true,secondRaid:false,damage:[{id:'station_bomb',started}]},player={x:0,y:0,z:0};view.owner.quality='high';
  view.updateAircraft(state,time,player);
  const bodies=view.planes.map(p=>p.levels[0].object.getObjectByName('fuselage').material);
  assert.equal(new Set(bodies).size,3,'one material instance per aircraft');
  assert.ok(bodies.every(m=>m.map===sources.get(0).scene.userData.body.map&&m.alphaHash&&m.envMap===view.aircraftSky),'textures shared, dithered fade, sky reflections');
  assert.equal(sources.get(0).scene.userData.body.alphaHash,false,'source GLB material is never modified');
  assert.notDeepEqual(bodies[1].color.toArray(),bodies[0].color.toArray(),'paint batches differ slightly');
  const model=view.planes[0].levels[0].object;assert.equal(model.getObjectByName('propeller').material,model.getObjectByName('fuselage').material,'one instance per GLB material');
  assert.equal(model.getObjectByName('propeller_disc').material.forceSinglePass,true,'transparent double-sided disc drawn in one pass');
  assert.equal(sources.get(0).scene.getObjectByName('propeller_disc').material.forceSinglePass,false);
  const props=view.planes.map(p=>p.levels.find(l=>l.object.visible).object.getObjectByName('propeller').quaternion.toArray());
  assert.notDeepEqual(props[0],props[1]);assert.notDeepEqual(props[1],props[2]);
  // Position and attitude come from the path tangent at the same saved clock, so pause/restore repeats them.
  view.planes.forEach((p,i)=>{
    assert.deepEqual(p.position.toArray(),Object.values(m01StukaPosition(since,i)));
    const attitude=ju87Attitude(since,i);assert.deepEqual([p.rotation.x,p.rotation.y,p.rotation.z],[attitude.pitch,attitude.yaw,attitude.bank]);
    assert.equal(p.rotation.order,'YXZ');
  });
  assert.ok(view.planes[2].rotation.x<-.3&&view.planes[1].rotation.x>0,'3.4 s after the bombing the third plane is still diving while the second pulls out');
  const attitude=view.planes.map(p=>p.rotation.toArray());view.updateAircraft(state,time+7,player);view.updateAircraft(state,time,player);
  assert.deepEqual(view.planes.map(p=>p.rotation.toArray()),attitude);
});

test('Ju 87 fade has no 90 s wrap (the path never loops) and eases in after the planes are heard, deterministically',async()=>{
  const {view}=namedFixture();await view.loadAircraft();
  const state={stukas:true,secondRaid:false},player={x:0,y:0,z:0};view.owner.quality='high';
  const shown=()=>view.planes[0].levels.find(l=>l.object.visible);
  for(const time of [89.95,90,90.05,180,181.25]){
    view.updateAircraft(state,time,player);assert.equal(view.planes[0].userData.fade,1,`no dissolve at ${time}`);
    assert.ok(shown().object.userData.materials.every(m=>m.opacity===m.userData.baseOpacity));
  }
  view.updateAircraft(state,200,player);assert.equal(view.planes[0].userData.fade,1);
  assert.equal(shown().object.getObjectByName('fuselage').material.opacity,1);
  view.updateAircraft(state,200,player,199);const entering=view.planes[0].userData.fade,glass=shown().object.getObjectByName('canopy').material;
  assert.ok(entering>0&&entering<.5,'fades in after planes_heard');assert.ok(Math.abs(glass.opacity-.3*entering)<1e-9,'translucent parts fade from their own opacity');
  view.updateAircraft(state,215,player,199);assert.equal(view.planes[0].userData.fade,1);
  view.updateAircraft(state,200,player,199);assert.equal(view.planes[0].userData.fade,entering,'restoring the clock restores the fade');
});

test('Ju 87 LOD keeps 10 % hysteresis at thresholds while the quality floor always applies',async()=>{
  const {view}=namedFixture();await view.loadAircraft();const state={stukas:true},time=40;
  const p0=()=>view.planes[0].position,at=d=>({x:p0().x,y:p0().y-d,z:p0().z});
  const lod=d=>{view.updateAircraft(state,time,at(d));return view.planes[0].levels.find(l=>l.object.visible).object.userData.lod;};
  view.owner.quality='high';view.updateAircraft(state,time,{x:0,y:0,z:0});
  assert.deepEqual([160,145,140,130,160,170,640,670,560,520].map(lod),[1,1,1,0,0,1,1,2,2,1]);
  view.owner.quality='low';assert.equal(lod(10),2,'low quality never shows LOD0/1');
  view.owner.quality='medium';assert.equal(lod(10),1);
});

test('at fade 0 the selected level (GLB or fallback proxy) stays visible and reported; opacity does the hiding',async()=>{
  const state={stukas:true,secondRaid:false},player={x:0,y:0,z:0},time=146;
  const proxy=fixture(()=>true).view;await proxy.loadAircraft();proxy.updateAircraft(state,time,player,time);
  assert.ok(proxy.planes.every(p=>p.userData.fade===0&&p.levels.filter(l=>l.object.visible).length===1&&p.levels[p.userData.level].object.userData.lod==='proxy'));
  const {view}=namedFixture();await view.loadAircraft();view.owner.quality='low';view.updateAircraft(state,time,player,time);
  for(const plane of view.planes){
    const shown=plane.levels.filter(l=>l.object.visible);assert.equal(shown.length,1);assert.equal(shown[0].object.userData.lod,2);
    assert.ok(shown[0].object.userData.materials.every(m=>m.opacity===0),'fully dissolved, not culled');
  }
  view.resetEffects?.call({planes:view.planes,fireBatches:{},battlefieldFxBatches:{},combatFeedback:{reset(){}},battlefieldShards:{},explosionLight:{},damageDecals:{reset(){}}});
  assert.ok(view.planes.every(p=>p.userData.level===null),'checkpoint restore forgets LOD hysteresis');
});

test('the entry fade reads the saved planes_heard time of the real simulation',()=>{
  const d=driver();d.step({skip:true});d.until(()=>d.sim.renderState.stukas,200);
  const heard=ju87HeardAt(d.sim);
  assert.equal(typeof heard,'number');assert.ok(heard>0&&heard<=d.sim.clock);
  assert.equal(ju87Fade(heard,heard),0);assert.equal(ju87Fade(heard+3,heard),1);
  const restored=structuredClone(d.sim.snapshot());assert.equal(restored.consumed.evt_m01_planes_heard,heard,'saved with the checkpoint');
  assert.equal(ju87HeardAt({consumed:{}}),undefined);assert.equal(ju87HeardAt(undefined),undefined);
});
