import test from 'node:test';
import assert from 'node:assert/strict';
import { M02BenchSimulation } from '../src/game/m02-01-simulation.js';
import {m02VisualActor,M02Presentation,createM02WeaponCamera} from '../src/render/m02-presentation.js';
import * as THREE from 'three';
import {M01ViewModel} from '../src/render/m01-viewmodel.js';
import {WZ29_VISUAL} from '../src/render/m01-wz29-presentation.js';
import {viewModelFixture,loadCharacterGLB} from './helpers/m01-viewmodel-fixture.js';
import {alignmentReport} from '../tools/verification/m01-wz29-viewmodel-audit.mjs';

test('M02 keeps the real M01 first-person rig on its own 58 degree lens while ADS zooms the world',async()=>{
 const characters=await viewModelFixture();characters.sources.set('fp:0',await loadCharacterGLB('fp-arms-v2/m01_fp_arms_v2.glb'));
 const p=Object.create(M02Presentation.prototype);p.camera=new THREE.PerspectiveCamera(70,16/9,.05,500);
 p.weaponCamera=createM02WeaponCamera();p.weaponScene=new THREE.Scene();p.weapon=new M01ViewModel(p.weaponScene,characters);
 const sim=new M02BenchSimulation();sim.player.aiming=true;
 p.camera.position.set(sim.player.x,sim.player.y+sim.player.eyeHeight,sim.player.z);p.camera.rotation.y=-sim.player.angle-Math.PI/2;
 p.camera.updateMatrixWorld(true);
 try{
  assert.ok(p.updateWeapon(sim,'high'));assert.equal(p.camera.fov,48);
  const alignment=alignmentReport(p.weapon);
  for(const key of ['horizontalPixels','verticalPixels','centerHorizontalPixels','centerVerticalPixels'])assert.ok(alignment[key]<WZ29_VISUAL.adsTolerancePixels,key);
  let drawn;const renderer={autoClear:true,clearDepth(){},render(scene,camera){drawn=camera;}};
  for(const fov of [48,70]){
   p.camera.fov=fov;p.renderWeapon(renderer);
   assert.equal(drawn.fov,58);assert.equal(drawn.near,WZ29_VISUAL.near);assert.equal(drawn.aspect,p.camera.aspect);assert.equal(renderer.autoClear,true);
  }
 }finally{p.weapon.dispose();characters.dispose();}
});

test('M02 presentation adapts live roles and reload timing without changing snapshots', () => {
  const sim=new M02BenchSimulation();
  const before=sim.snapshot();
  for (const [list,team] of [[sim.allies,'ally'],[sim.enemies,'enemy']]) {
    for (const actor of list) {
      const visual=m02VisualActor(actor,team,sim.clock);
      assert.notEqual(visual,actor);
      assert.equal(visual.team,team);
      assert.equal(visual.x,actor.x);
      assert.equal(visual.z,actor.z);
    }
  }
  assert.deepEqual(sim.snapshot(),before);
  const wounded=m02VisualActor({...sim.enemies[0],state:'WOUNDED_UNARMED'},'enemy',0);
  assert.equal(wounded.role,'MEDIC');
  assert.equal(wounded.state,'WOUNDED');
  const reloading=m02VisualActor({...sim.enemies[0],weapon:'kar98k',reloadingUntil:12.8},'enemy',11);
  assert.equal(reloading.reload.startedAt,10);
});

import { m02PlayerAction, performM02PlayerAction } from '../src/game/m02-player-actions.js';

test('contextual actions cannot skip unfinished combat or manufacture supplies', () => {
  const sim=new M02BenchSimulation();
  const before=sim.snapshot();
  assert.equal(m02PlayerAction(sim),null);
  assert.equal(performM02PlayerAction(sim),false);
  assert.deepEqual(sim.snapshot(),before);
  sim.enterAreaBC06();
  sim.teleportPlayer(0,-70,0);
  assert.notEqual(m02PlayerAction(sim)?.id,'reorganize');
  assert.equal(sim.areaB.reorganizedC07,false);
});

test('resolved farm enables normal interaction to enter area B with state retained', () => {
  const sim=new M02BenchSimulation();
  sim.teleportPlayer(0,50,0);
  sim.objective={id:'COMPLETE',status:'completed'};
  const weapon=sim.weapon.snapshot();
  assert.equal(m02PlayerAction(sim)?.id,'area-b');
  assert.equal(performM02PlayerAction(sim),true);
  assert.equal(sim.activeCellId,'B');
  assert.deepEqual(sim.weapon.snapshot(),weapon);
  assert.equal(performM02PlayerAction(sim),false);
});
