import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01View} from '../src/render/m01-view.js';

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

test('Ju 87 clones use native LODs, share art, sample the saved clock and preserve the existing raid path',async()=>{
  const {view,sources}=fixture();await view.loadAircraft();
  assert.deepEqual([...view.aircraftSources.keys()].sort(),[0,1,2]);assert.equal(view.aircraftMixers.length,9);
  const time=12.013,state=Object.freeze({stukas:true,secondRaid:false});
  const player=Object.freeze({x:80+Math.sin(time*.02)*250,y:160,z:240-time%90*4});
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
  assert.equal(view.planes[0].rotation.y,.1);
  view.updateAircraft(Object.freeze({stukas:false,secondRaid:true}),time,player);
  assert.ok(view.planes.every(p=>!p.visible));assert.equal(view.raidPlane.visible,true);
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
