import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Characters} from '../src/render/m01-characters.js';
import {driver,toStationEvacuation} from './helpers/m01-route.js';
import {M01Simulation} from '../src/game/m01-simulation.js';

const names=['station_drag_medic_grab','station_drag_patient_grab','station_drag_medic_release','station_drag_patient_release'];
const load=async file=>{
  const b=readFileSync(new URL('../assets/models/provisional/m01/characters/'+file,import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
};
const [soldier,station,transitions]=await Promise.all([
  load('m01_soldier_animations.glb'),load('m01_station_animations.glb'),load('station-drag-transitions/m01_station_drag_transitions.glb')
]);
function fixture(){
  const c=new M01Characters(new THREE.Scene());
  for(const lod of [1,2])c.sources.set(`pl:${lod}`,transitions);
  for(const g of [soldier,station,transitions])for(const clip of g.animations)c.clips.set(clip.name,clip);
  return c;
}
const matrices=c=>Object.fromEntries([...c.instances].map(([id,v])=>{
  const values=[];v.root.traverse(n=>values.push(...n.matrixWorld.elements));return [id,values];
}));
const near=(a,b)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8,`${i}: ${v} != ${b[i]}`));};

test('the real station clips sample both roles from saved phase time, with pause, fresh renderer and LOD restore',()=>{
  for(const phase of ['grab','drag','release']){
    const d=toStationEvacuation(driver(),{observe:true,phase}),s=d.sim;for(let i=0;i<11;i++)d.step();
    const c=fixture(),copy=fixture(),saved=s.snapshot(),restore=new M01Simulation();restore.restoreSnapshot(saved);
    try{
      c.update(s.actors,s.clock,s.player,'low',s.battleClock);
      const patient=c.instances.get('generic_rifleman'),medic=c.instances.get('leon_dudek'),transport=s.actor('generic_rifleman').stationDrag;
      assert.equal(patient.root.parent,c.scene,'ground drag never uses the shoulder socket');
      const offset=patient.root.position.clone().sub(medic.root.position).applyAxisAngle(new THREE.Vector3(0,1,0),-medic.root.rotation.y);
      near(offset.toArray(),[0,0,-.92]);
      assert.equal(patient.clip,phase==='drag'?'station_drag_patient_grab':`station_drag_patient_${phase}`);
      assert.equal(medic.clip,phase==='drag'?'drag_wounded':`station_drag_medic_${phase}`);
      if(phase==='drag')assert.equal(patient.action.time,c.clips.get(patient.clip).duration);
      else assert.ok(Math.abs(patient.action.time-medic.action.time)<1e-9,'paired clips have no per-actor time offset');
      const initial=matrices(c);c.update(s.actors,s.clock,s.player);assert.deepEqual(matrices(c),initial);
      copy.update(restore.actors,restore.clock,restore.player);assert.deepEqual(matrices(copy),initial,'renderer needs no prior local transition state');
      c.update(s.actors,s.clock,{x:s.player.x-50,z:s.player.z});assert.equal(c.instances.get('leon_dudek').key,'pl:2');
      for(const id of ['generic_rifleman','leon_dudek'])near(matrices(c)[id],initial[id]);
      assert.deepEqual(s.snapshot(),saved,'presentation never changes saved gameplay data');
      assert.ok(transport.startedAt<=s.clock);
    }finally{c.dispose();copy.dispose();}
  }
});
test('the patient holds the actual final grab pose throughout the moving backward drag',()=>{
  const d=toStationEvacuation(driver(),{observe:true}),s=d.sim,c=fixture();
  try{
    c.update(s.actors,s.clock,s.player);const v=c.instances.get('generic_rifleman');
    const local=()=>{const out=[];v.root.traverse(n=>{if(n!==v.root)out.push(...n.position.toArray(),...n.quaternion.toArray(),...n.scale.toArray());});return out;};
    const first=local(),position=v.root.position.clone();
    for(let i=0;i<20;i++)d.step();c.update(s.actors,s.clock,s.player);
    assert.deepEqual(local(),first);assert.ok(v.root.position.distanceTo(position)>.6);
    const actual=c.clips.get('station_drag_patient_grab'),endpoint=transitions.scene.clone(true),mixer=new THREE.AnimationMixer(endpoint);
    const action=mixer.clipAction(actual).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(actual.duration);
    for(const name of ['hips','spine_01','upperarm_l','upperarm_r']){
      const bone=v.root.getObjectByName(name),reference=endpoint.getObjectByName(name);
      near(bone.position.toArray(),reference.position.toArray());near(bone.quaternion.toArray(),reference.quaternion.toArray());
    }
    mixer.stopAllAction();mixer.uncacheRoot(endpoint);
  }finally{c.dispose();}
});
test('a missing or incomplete optional transition pair falls back together and leaves evacuation success to simulation',()=>{
  for(const phase of ['grab','drag','release'])for(const missing of [null,...names]){
    const d=toStationEvacuation(driver(),{observe:true,phase}),s=d.sim,c=fixture();
    if(missing)c.clips.delete(missing);else for(const name of names)c.clips.delete(name);
    try{
      const before=s.snapshot();c.update(s.actors,s.clock,s.player);
      assert.equal(c.instances.get('generic_rifleman').clip,'wounded');
      assert.equal(c.instances.get('leon_dudek').clip,phase==='drag'?'drag_wounded':'crouched_idle');
      assert.deepEqual(s.snapshot(),before);d.until(()=>s.stationEvacuation.delivered,100);assert.equal(s.actor('generic_rifleman').stationDrag,undefined);
    }finally{c.dispose();}
  }
});
