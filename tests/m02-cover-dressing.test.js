import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {updateGermanGarrison,updateLowCoverExposure,m02VisibleAimPoint} from '../src/game/m02-combat-ai.js';
import {fitM02Prop,m02AuthoredPropModel} from '../src/render/m02-cargo-visuals.js';
import {m02EnvironmentLayout,m02TerrainAxes} from '../src/render/m02-environment-layout.js';

test('P1 is an actual shallow trench with sampled banks, physical exits and safe stationary legacy-save settling',()=>{
 const sim=new M02BenchSimulation();sim.startAreaAFullC01();sim.enemies=[];sim.allies=[];
 assert.equal(sim.player.y,-.42);assert.equal(sim.world.terrainHeightAt(0,-180),0);assert.equal(sim.world.terrainHeightAt(0,-179.2),-.42);
 const axes=m02TerrainAxes(240,340,64,90,true);for(const z of [-180,-179.6,-179.2,-173.6,-173.2,-172.8])assert.ok(axes.z.includes(z));
 assert.ok(axes.x.every((x,i)=>i===0||x>axes.x[i-1]));assert.ok(axes.z.every((z,i)=>i===0||z>axes.z[i-1]));
 const saved=sim.snapshot();saved.player.y=0;sim.restoreSnapshot(saved);const hp=sim.player.health;
 for(let i=0;i<20;i++)sim.tick(.05,{});
 assert.ok(Math.abs(sim.player.y+.42)<.0001,'an old save settles by M01 gravity without a teleport');assert.equal(sim.player.health,hp);
 // Leave by the western sloped end instead of walking through the parapet.
 for(let i=0;i<100;i++)sim.tick(.05,{side:1});
 assert.ok(sim.player.x<-9&&Math.abs(sim.player.y)<.001,'bank can be walked out using the shared physics');
});

test('EA0 defenders use the front parapet: crouching hides them, exposing reveals a head that can really be hit',()=>{
 const sim=new M02BenchSimulation();sim.startAreaAFullC01();updateGermanGarrison(sim,.05);
 const target=sim.enemies.find(e=>e.id==='DE-A02'),shooter={...sim.allies[0],id:'cover-fixture',x:-18,y:0,z:-130,crouched:false,eyeHeight:1.65,moving:false,suppressed:0,mag:5};
 const visible=new Map();
 for(let i=0;i<64;i++){
  sim.clock=i*.05;updateLowCoverExposure(sim,target);
  visible.set(target.crouched,sim.world.lineOfSight(shooter,target,{includeFoliage:false}));
  if(!target.crouched){
   const aim=m02VisibleAimPoint(sim,shooter,target);assert.ok(aim.y>1.2,'aim must reach the visible head, not the hidden chest');
  }
 }
 assert.equal(visible.get(true),false);assert.equal(visible.get(false),true);
 target.crouched=false;target.eyeHeight=1.65;sim.enemies=[target];sim.allies=[shooter];
 const health=target.health;for(let i=0;i<4;i++)sim.fireActorBurst(shooter,target,m02VisibleAimPoint(sim,shooter,target),'ally');
 assert.ok(target.health<health,'exposure must create a physical hit opportunity');assert.equal(shooter.mag,1);
 const node=sim.coverNodesById.get('cv_c01_outpost_clear');assert.ok(sim.navigator.route(shooter,node)?.length,'the capture position remains reachable around the parapet');
});

test('EA0 cover behaviour, ammunition, events and RNG continue exactly through a mid-encounter checkpoint',()=>{
 const sim=new M02BenchSimulation();sim.startAreaAFullC01();for(let i=0;i<110;i++)sim.tick(.05,{});
 const save=sim.snapshot();sim.drainEvents();for(let i=0;i<40;i++)sim.tick(.05,{});
 const expected=sim.snapshot(),events=sim.drainEvents();sim.restoreSnapshot(save);sim.drainEvents();for(let i=0;i<40;i++)sim.tick(.05,{});
 assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),events);
});

test('M01 sack/crate meshes fit the existing M02 solids exactly without changing physics',async()=>{
 const sim=new M02BenchSimulation(),models=new Map();
 for(const name of ['sandbag_run','supply_crate_planked']){
  const b=await fs.readFile(new URL(`../assets/models/provisional/m01/props/m01_prop_${name}_lod0.glb`,import.meta.url));
  models.set(name,(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene);
 }
 let fitted=0;
 for(const cell of ['A','B','C']){
  if(cell==='B')sim.enterAreaBC06();if(cell==='C')sim.enterAreaCC09();const before=sim.snapshot();
  for(const ob of sim.world.obstacles){
   const model=m02AuthoredPropModel(ob);if(!model)continue;
   const box=new THREE.Box3().setFromObject(fitM02Prop(models.get(model),ob));
   assert.ok(box.min.distanceTo(new THREE.Vector3(ob.min.x,ob.min.y,ob.min.z))<.00001);
   assert.ok(box.max.distanceTo(new THREE.Vector3(ob.max.x,ob.max.y,ob.max.z))<.00001);fitted++;
  }
  assert.deepEqual(sim.snapshot(),before);
 }
 assert.equal(fitted,4);
 const layout=m02EnvironmentLayout(sim.world);assert.ok(layout.ground.length>8000);assert.ok(layout.ground.every(p=>p.h<=.6&&Math.abs(p.x)>4.5));
});
