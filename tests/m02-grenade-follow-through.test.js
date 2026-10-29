import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M02GrenadeFollowThrough} from '../src/render/m02-grenade-follow-through.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02Presentation} from '../src/render/m02-presentation.js';

test('throw follow-through is a reversible, clock-driven M01 arm pose',()=>{
 const root=new THREE.Group(),upper=new THREE.Bone(),lower=new THREE.Bone();
 upper.name='upperarm_r';lower.name='lowerarm_r';root.add(upper);upper.add(lower);
 const base=[upper.quaternion.toArray(),lower.quaternion.toArray()],view=new M02GrenadeFollowThrough();
 view.begin(5);assert.ok(view.apply(root,5.1)>0);
 const posed=[upper.quaternion.toArray(),lower.quaternion.toArray()];assert.notDeepEqual(posed,base);
 view.restore();assert.deepEqual([upper.quaternion.toArray(),lower.quaternion.toArray()],base);
 view.apply(root,5.1);assert.deepEqual([upper.quaternion.toArray(),lower.quaternion.toArray()],posed);
 view.restore();assert.equal(view.apply(root,5.1,false),0);assert.equal(view.startedAt,null);
 view.begin(5);assert.equal(view.apply(root,5.45),0);assert.deepEqual([upper.quaternion.toArray(),lower.quaternion.toArray()],base);
 view.begin(6);view.apply(root,6.1);view.reset();assert.equal(view.startedAt,null);assert.deepEqual([upper.quaternion.toArray(),lower.quaternion.toArray()],base);
});

test('only an actual player grenade release carries the player identity',()=>{
 const sim=new M02BenchSimulation();sim.startAreaAFullC01();sim.drainEvents();
 const before=sim.snapshot();sim.throwGrenade();const first=sim.drainEvents().find(e=>e.type==='grenade-thrown');
 assert.equal(first.throwerId,sim.player.id);assert.equal(sim.grenadeAmmo,before.grenadeAmmo-1);
 sim.throwGrenade({x:0,y:2,z:100},{x:1,y:0,z:0});const custom=sim.drainEvents().find(e=>e.type==='grenade-thrown');
 assert.equal(custom.throwerId,null);
 sim.restoreSnapshot(before);sim.drainEvents();sim.throwGrenade();assert.deepEqual(sim.drainEvents().find(e=>e.type==='grenade-thrown'),first);
 sim.grenadeAmmo=0;assert.equal(sim.throwGrenade(),null);assert.equal(sim.drainEvents().some(e=>e.type==='grenade-thrown'),false);
});

test('actual firing or reloading takes precedence over the release follow-through',()=>{
 const sim=new M02BenchSimulation();sim.startAreaAFullC01();sim.drainEvents();
 const root=new THREE.Group(),upper=new THREE.Bone(),lower=new THREE.Bone();upper.name='upperarm_r';lower.name='lowerarm_r';root.add(upper);upper.add(lower);
 const p=Object.create(M02Presentation.prototype);
 Object.assign(p,{weapon:{root,update:()=>true},weaponCamera:{fov:58},camera:{},audio:{ctx:null},syncSession:()=>{}});
 sim.throwGrenade();p.consume(sim.drainEvents(),sim);p.updateWeapon(sim,'low');assert.ok(p.grenadeFollowThroughWeight>0);
 sim.firePlayerWeapon();p.updateWeapon(sim,'low');assert.equal(p.grenadeFollowThroughWeight,0);assert.equal(p.grenadeFollowThrough.startedAt,null);
 sim.weapon.update(10000);sim.clock=10;sim.weapon.mag=3;sim.weapon.reload(10000);
 sim.throwGrenade();p.consume(sim.drainEvents(),sim);p.updateWeapon(sim,'low');assert.equal(p.grenadeFollowThroughWeight,0);assert.equal(p.grenadeFollowThrough.startedAt,null);
});
