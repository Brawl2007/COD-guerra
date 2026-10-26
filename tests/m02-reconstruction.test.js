import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {stepActorNavigation,updateLowCoverExposure,updatePolishSquad} from '../src/game/m02-combat-ai.js';
import {crouchedClip,m02CharacterSample} from '../src/render/m02-character-adapter.js';

async function load(path){const b=await fs.readFile(new URL(`../assets/models/provisional/m01/${path}`,import.meta.url));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const assets=Promise.all([load('characters/m01_soldier_animations.glb'),load('characters/clip-library-v2/m01_soldier_clip_library_v2.glb'),load('weapons/mg34/m01_mg34_animations.glb')]);
function sampled(scene,clip,time){const root=scene.clone(true),mixer=new THREE.AnimationMixer(root);mixer.clipAction(clip).setLoop(THREE.LoopOnce,1).play();mixer.setTime(time);root.updateMatrixWorld(true);return root;}
const worldPosition=(root,name)=>root.getObjectByName(name).getWorldPosition(new THREE.Vector3());

test('real M01 GLB crouched adaptation preserves the lower body and weapon/hand contact without mutating clips',async()=>{
 const kits=await assets,clips=new Map(kits.flatMap(g=>g.animations).map(c=>[c.name,c]));
 const base=clips.get('crouched_idle');assert.ok(base);
 for(const name of ['fidget_check_rifle','fidget_look','reload_clip','mg34_reload','fire_bolt','mg34_fire_burst','rkm_fire_burst']){
  const source=clips.get(name);assert.ok(source,name);const before=JSON.stringify(source.toJSON());
  const derived=crouchedClip(source,base,`m02_${name}`);
  const scene=kits.find(g=>g.animations.includes(source)).scene;
  for(const time of [.1,source.duration*.4,source.duration*.8]){
   const original=sampled(scene,source,time),crouched=sampled(scene,derived,time);
   const expected=sampled(scene,base,0);
   for(const bone of ['hips','foot_l','foot_r'])assert.ok(worldPosition(crouched,bone).distanceTo(worldPosition(expected,bone))<.0001,`${name}: grounded ${bone}`);
   const weapon=worldPosition(original,'weapon'),newWeapon=worldPosition(crouched,'weapon');
   for(const hand of ['hand_l','hand_r'])assert.ok(Math.abs(worldPosition(original,hand).distanceTo(weapon)-worldPosition(crouched,hand).distanceTo(newWeapon))<.003,`${name}: ${hand} must follow weapon`);
  }
  assert.equal(JSON.stringify(source.toJSON()),before,'shared M01 animation must remain untouched');
 }
});

test('M02 reloads use the full appropriate M01 timeline and automatic weapons never select a rifle bolt',async()=>{
 const kits=await assets,clips=new Map(kits.flatMap(g=>g.animations).map(c=>[c.name,c]));
 for(const [source,name]of [['reload_clip','m02_rifle_crouch_reload'],['mg34_reload','m02_mg34_crouch_reload'],['rkm_fire_burst','m02_auto_crouch_fire']])clips.set(name,crouchedClip(clips.get(source),clips.get('crouched_idle'),name));
 for(const [weapon,name,durationSec]of [['mg34','m02_mg34_crouch_reload',4],['wz29','m02_rifle_crouch_reload',2.6],['rkm_wz28','rkm_reload',3.2],['mp38','rkm_reload',2.7]]){
  const actor={alive:true,weapon,state:'ACTIVE',reload:{startedAt:10,durationSec}};
  const sample=m02CharacterSample(actor,10+durationSec/2,clips);assert.equal(sample.clip,name);assert.ok(Math.abs(sample.time-clips.get(name).duration/2)<1e-6);
 }
 const mp={alive:true,weapon:'mp38',state:'ACTIVE',crouched:false,lastShotAt:10,firedAt:10};
 assert.equal(m02CharacterSample(mp,10.05,clips).clip,'rkm_fire_burst');assert.equal(m02CharacterSample(mp,10.5,clips).clip,'aim');
});

test('C01 preparation positions are absolute, remain sheltered and survive save/restore',()=>{
 const sim=new M02BenchSimulation();sim.startAreaAFullC01();
 const positions=sim.allies.map(a=>[a.id,a.x,a.z]);sim.startAreaAFullC01();
 assert.deepEqual(sim.allies.map(a=>[a.id,a.x,a.z]),positions);
 for(let i=0;i<40;i++)sim.tick(.05,{});
 assert.ok(sim.allies.every(a=>a.crouched&&!a.moving&&!a.shotsFired));
 const snapshot=sim.snapshot();sim.restoreSnapshot(snapshot);assert.deepEqual(sim.snapshot(),snapshot);
});

test('low-cover exposure changes physical line of sight predictably and reloads stop navigation',()=>{
 const sim=new M02BenchSimulation(),ally=sim.allies[0];
 Object.assign(ally,{x:-8.5,y:0,z:-142,moving:false,suppressed:0,goal:{x:-8.5,z:-142,crouch:true,nodeId:'test-bank'}});
 const target={x:-8.5,y:0,z:-135,eyeHeight:1.65,space:'metres'};
 const observations=new Map();
 for(let i=0;i<64;i++){
  sim.clock=i*.05;updateLowCoverExposure(sim,ally);
  observations.set(ally.crouched,sim.world.lineOfSight(ally,target,{includeFoliage:false}));
 }
 assert.equal(observations.get(true),false);assert.equal(observations.get(false),true);
 ally.reloadingUntil=sim.clock+2;ally.goal={x:10,z:-142};const x=ally.x;
 stepActorNavigation(sim,ally,.05);assert.equal(ally.x,x);assert.equal(ally.moving,false);assert.equal(ally.eyeHeight,1.08);
});

test('supported Lis cannot continue a queued burst or fire/reload as a combatant',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaCC09();const lis=sim.allies.find(a=>a.id==='pl_lis');
 sim.areaC.c11Started=true;sim.areaC.lisContactedInC11=true;lis.detachedOutOfCell=false;
 for(const state of ['WOUNDED_LIAISON','WALKING_SUPPORTED','EVACUATED_B12']){
  Object.assign(lis,{alive:true,state,mag:0,reloadingUntil:0,burst:{remaining:2},nextFireAt:0,shotsFired:0});
  updatePolishSquad(sim,.05);assert.equal(lis.shotsFired,0);assert.equal(lis.reloadingUntil,0);assert.equal(lis.burst,null);
 }
});

test('a visible target above a parapet cannot be hit through the lower blocked muzzle',()=>{
 const sim=new M02BenchSimulation();sim.startAreaAFullC01();const ally=sim.allies[0],enemy=sim.enemies.find(e=>e.id==='DE-A01');
 sim.allies=[ally];sim.enemies=[enemy];Object.assign(ally,{x:-8.5,y:0,z:-142,eyeHeight:1.25,crouched:false,weapon:'wz29',mag:5,suppressed:0});
 Object.assign(enemy,{x:-8.5,y:0,z:-135,crouched:false,eyeHeight:1.65});
 assert.ok(sim.world.lineOfSight(ally,enemy,{includeFoliage:false}));
 const health=enemy.health;sim.fireActorBurst(ally,enemy,{x:enemy.x,y:1.3,z:enemy.z},'ally');
 assert.equal(ally.mag,4);assert.equal(enemy.health,health,'blocked weapon may spend ammunition but cannot damage the target');
});
