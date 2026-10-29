import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M02Lighting,m02LightingModel} from '../src/render/m02-lighting.js';
import {M02_LIGHTING_PRESETS} from '../src/render/m02-01-renderer.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {lightingModel} from '../src/render/m01-lighting.js';

test('M02 shadows follow P1 and streamed areas using the M01 cascade contract without changing the save',()=>{
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0,40,300);
 const engine={toneMappingExposure:1,setRenderTarget(t){this.target=t;},getDrawingBufferSize(v){return v.set(640,360);}};
 const sun=new THREE.DirectionalLight(),hemi=new THREE.HemisphereLight();scene.add(sun,hemi);
 const atmosphere={texture:new THREE.Texture(),lighting(){}};
 const lighting=new M02Lighting(scene,engine,sun,hemi,atmosphere),sim=new M02BenchSimulation();
 const camera=new THREE.PerspectiveCamera(68,16/9,.12,8000);
 try{
  for(const [enter,phase,preset]of [
   [()=>sim.startAreaAFullC01(),'T0','afternoon_1939_09_09'],
   [()=>sim.enterAreaBC06(),'T1','night_1939_09_09'],
   [()=>sim.enterAreaCC09(),'T3','afternoon_1939_09_10'],
  ]){
   enter();assert.equal(sim.horizon.temporalState,phase);const before=sim.snapshot();
   const model=lighting.update(sim,M02_LIGHTING_PRESETS[preset],'high');
   assert.deepEqual(sun.target.position.toArray(),[sim.player.x,sim.player.y,sim.player.z]);
   assert.ok(Math.abs(sun.position.distanceTo(sun.target.position)-200)<1e-10);
   assert.equal(lighting.cascades,2);assert.equal(lighting.near.visible,true);
   assert.ok(Math.abs(sun.intensity+lighting.near.intensity-model.sun.intensity)<1e-12);
   assert.equal(lighting.near.shadow.mapSize.x,2048);assert.equal(lighting.contacts.count>0,true);
   assert.equal(lighting.begin(camera,'high',true),true);assert.equal(engine.target.samples,0);
   assert.deepEqual(sim.snapshot(),before,'rendering must preserve exact simulation state/RNG/events');
  }
  lighting.update(sim,M02_LIGHTING_PRESETS.morning_1939_09_10,'low');
  assert.equal(lighting.near.visible,false);assert.equal(lighting.begin(camera,'low'),false);
  assert.equal(engine.target,null);assert.equal(lighting.grading.target,null,'Low releases the postprocess render target');
 }finally{lighting.dispose();atmosphere.texture.dispose();}
});

test('the existing bench lighting selector can preview another phase without rewriting the mission time of day',()=>{
 const sim=new M02BenchSimulation(),before=sim.snapshot();
 const night=m02LightingModel(sim.horizon.temporalState,M02_LIGHTING_PRESETS.night_1939_09_09);
 assert.equal(night.daylight,0);assert.equal(night.sun.intensity,M02_LIGHTING_PRESETS.night_1939_09_09.sunIntensity);
 assert.equal(night.hemi.intensity,2.25);assert.equal(night.exposure,1.4);assert.equal(night.sky.discStrength,0);
 const day=m02LightingModel('T1',M02_LIGHTING_PRESETS.afternoon_1939_09_09);
 assert.deepEqual(day,lightingModel(14,255));assert.deepEqual(sim.snapshot(),before);
});
