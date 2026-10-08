import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../src/game/game.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {M01View} from '../src/render/m01-view.js';
import {M01BridgePortalPolish,M01_PORTAL_DETAIL_LAYOUTS} from '../src/render/m01-bridge-portal-polish.js';
import {WeaponViewFx,WEAPON_PRESENTATION} from '../src/render/first-person-weapon-fx.js';
import {driver,route} from './helpers/m01-route.js';

const pending=[];
route(19390901,{support:true,onStep:({sim,events})=>{
  for(const event of events)if(event.type==='m01-blast')pending.push({snapshot:sim.snapshot(false),event});
}});
// The grenade uses real input and its normal fuse rather than a fabricated blast.
const grenade=driver();grenade.step({skip:true});grenade.step({grenade:true});
for(let i=0;i<200&&grenade.sim.grenades.active.length;i++){
  const from=grenade.events.length;grenade.step();
  for(const event of grenade.events.slice(from))if(event.type==='m01-blast')pending.push({snapshot:grenade.sim.snapshot(false),event});
}
const host=sim=>Object.assign(Object.create(Game.prototype),{sim,pendingSounds:[],audio:{resetPresentation(){}},renderer:{m01:{explosionFeedback(){},explosion(){}}}});

test('actual M01 aerial/demolition/grenade events rebuild identical delayed sound, shake and pull-out metadata from Schema 2',()=>{
  const ids=new Set();
  for(const fixture of pending){
    const sim=new M01Simulation();sim.restoreSnapshot(fixture.snapshot);const before=sim.snapshot(false),live=host(sim);
    live.handleM01Event(fixture.event);const expected=live.pendingSounds[0];ids.add(expected.key);
    // Restore before the authoritative delayed sound arrival, including far aerials.
    if(expected.at<=sim.clock)continue;
    const restored=new M01Simulation();restored.restoreSnapshot(before);const game=host(restored);game.rebuildSounds();
    assert.deepEqual(game.pendingSounds.find(x=>x.key===expected.key),expected);
    game.rebuildSounds();assert.equal(game.pendingSounds.filter(x=>x.key===expected.key).length,1,'no duplicate queue');
    assert.deepEqual(restored.snapshot(false),before,'presentation cannot mutate RNG or save');
    restored.clock=expected.at;game.rebuildSounds();assert.ok(!game.pendingSounds.some(x=>x.key===expected.key),'expired sounds are not replayed');
  }
  for(const id of ['station_bomb','forward_post','repair_crater','raid_0530','east_demolition','west_demolition'])assert.ok(ids.has(id),id);
  assert.ok([...ids].some(id=>id.startsWith('m01_grenade_')));
});

test('portal recreate/dispose releases every owned instanced buffer exactly once and preserves shared materials',()=>{
  const stone=new THREE.MeshBasicMaterial();let materialDisposals=0;stone.addEventListener('dispose',()=>materialDisposals++);
  for(let cycle=0;cycle<3;cycle++){
    const polish=new M01BridgePortalPolish({stone}),scene=new THREE.Scene(),disposed=new Map();
    for(const name of Object.keys(M01_PORTAL_DETAIL_LAYOUTS)){const node=new THREE.Group();node.name=name;scene.add(node);assert.equal(polish.attach(node),true);}
    scene.traverse(mesh=>{if(mesh.isInstancedMesh){disposed.set(mesh,0);mesh.addEventListener('dispose',()=>disposed.set(mesh,disposed.get(mesh)+1));}});
    assert.equal(disposed.size,9);polish.sync('low');polish.dispose();polish.dispose();
    assert.ok([...disposed.values()].every(count=>count===1));assert.equal(polish.diagnostics.totalBatches,0);
    scene.traverse(node=>assert.ok(!node.userData.m01PortalPolish));assert.equal(materialDisposals,0);
  }
  stone.dispose();
});

test('missing viewmodel renders a repeated first-shot flash after restart even when the first frame is 100 ms late',()=>{
  const scene=new THREE.Scene(),root=new THREE.Group(),fx=new WeaponViewFx(scene,WEAPON_PRESENTATION.wz29);scene.add(root);fx.attach(root,[0,.045,-.66]);
  const view=Object.assign(Object.create(M01View.prototype),{weaponRoot:root,fallbackFx:fx,planes:[],combatFeedback:{reset(){}},damageDecals:{reset(){}},fireBatches:{},battlefieldFxBatches:{},battlefieldShards:{},explosionLight:{}});
  try{
    for(let restart=0;restart<2;restart++){
      if(restart)view.resetEffects();
      const d=driver();d.step({skip:true});d.step({fire:true});assert.equal(d.sim.weapon.shotCount,1);
      view.muzzle(d.sim.weapon.lastShot/1000);for(let i=0;i<2;i++)d.step();
      const saved=d.sim.snapshot(false),first=view.updateFallbackWeapon(d.sim);
      assert.equal(first.flash,1);assert.equal(first.layers,3);assert.equal(fx.core.visible,true);
      assert.equal(view.updateFallbackWeapon(d.sim).flash,0,'fresh flag is consumed once after the normal event window');
      assert.deepEqual(d.sim.snapshot(false),saved);
      view.resetEffects();assert.equal(view.updateFallbackWeapon(d.sim).flash,0,'restoring an early shot without a new muzzle event cannot replay it');
    }
  }finally{fx.dispose();}
});
