import test from 'node:test';
import assert from 'node:assert/strict';
import {stepM02Grenade} from '../src/game/m02-grenade-physics.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';

const floor={obstacles:[],heightAt:()=>0};
const wall={...floor,obstacles:[{id:'wall',min:{x:1,y:0,z:-10},max:{x:1.2,y:3,z:10},material:'brick'}]};

test('ground contact preserves forward motion while the vertical velocity bounces',()=>{
 const g={x:0,y:.2,z:0,vx:3,vy:-5,vz:2};stepM02Grenade(floor,g,.05);
 assert.ok(g.x>0&&g.z>0);assert.ok(g.vx>0&&g.vz>0);assert.ok(g.vy>0);assert.ok(g.y>=.08);
 const x=g.x;for(let i=0;i<12;i++)stepM02Grenade(floor,g,.05);
 assert.ok(g.x>x,'a ground bounce must not reverse the trajectory');assert.ok(g.y>=.08-1e-8);
});

test('a glancing wall collision reflects only the normal component and stops before the wall',()=>{
 const g={x:0,y:1.5,z:0,vx:10,vy:0,vz:3};stepM02Grenade(wall,g,.2);
 assert.ok(g.x<1&&g.x>.99);assert.ok(g.vx<0);assert.equal(g.vz,3);
 const before=g.x;stepM02Grenade(wall,g,.05);assert.ok(g.x<before,'the grenade must leave the struck face');
});

test('a projectile restored exactly on a wall face can move away, and an embedded legacy projectile escapes',()=>{
 const atFace={x:1,y:1,z:0,vx:-2,vy:0,vz:0};stepM02Grenade(wall,atFace,.05);
 assert.ok(atFace.x<1);assert.ok(atFace.vx<0);
 const embedded={x:1.1,y:1,z:0,vx:-2,vy:0,vz:0};stepM02Grenade(wall,embedded,.05);
 assert.ok(embedded.x<1);assert.ok(embedded.vx<0);
});

test('a ceiling collision reflects vertical motion without reversing horizontal movement',()=>{
 const ceiling={...floor,obstacles:[{id:'ceiling',min:{x:-10,y:2,z:-10},max:{x:10,y:2.2,z:10},material:'wood_thick'}]};
 const g={x:0,y:1.8,z:0,vx:2,vy:4,vz:1};stepM02Grenade(ceiling,g,.1);
 assert.ok(g.y<2);assert.ok(g.vy<0);assert.equal(g.vx,2);assert.equal(g.vz,1);
});

test('an actual grenade cannot cross a wall and its bounce, fuse and explosion replay after restore',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.enemies=[];sim.allies=[];
 sim.world.obstacles.push({id:'grenade-test-wall',min:{x:1,y:0,z:97},max:{x:1.2,y:3,z:103},material:'brick'});
 const grenade=sim.throwGrenade({x:0,y:1.5,z:100},{x:1,y:0,z:.15});const id=grenade.id;
 const save=sim.snapshot();sim.drainEvents();
 for(let i=0;i<8;i++){sim.tick(.05,{});const g=sim.grenades.find(g=>g.id===id);assert.ok(g.x<1,'the live grenade cannot pass the solid wall');}
 assert.ok(sim.grenades.find(g=>g.id===id).vx<0,'wall impact reverses the normal velocity');
 for(let i=0;i<40;i++)sim.tick(.05,{});
 const expected=sim.snapshot(),events=sim.drainEvents();assert.equal(events.filter(e=>e.type==='grenade-exploded').length,1);
 // The synthetic wall belongs to the world, not to its snapshot; reapply it
 // after refresh so both sides of the replay use the same collision scene.
 sim.restoreSnapshot(save);sim.world.obstacles.push({id:'grenade-test-wall',min:{x:1,y:0,z:97},max:{x:1.2,y:3,z:103},material:'brick'});
 sim.drainEvents();for(let i=0;i<48;i++)sim.tick(.05,{});
 assert.deepEqual(sim.snapshot(),expected);assert.deepEqual(sim.drainEvents(),events);
});

test('a grenade released next to a solid wall starts on the player side and bounces back',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.enemies=[];sim.allies=[];
 sim.world.obstacles.push({id:'near-wall',min:{x:.2,y:0,z:99},max:{x:.3,y:3,z:101},material:'brick'});
 const g=sim.throwGrenade({x:0,y:1.5,z:100},{x:1,y:0,z:0});
 assert.ok(g.x<.2,'the projectile must not appear through a wall before its first update');
 sim.tick(.05,{});assert.ok(g.x<.2);assert.ok(g.vx<0);
});
