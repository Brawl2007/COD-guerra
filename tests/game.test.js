import test from 'node:test';
import assert from 'node:assert/strict';
import { Weapon } from '../src/game/weapon.js';
import { World } from '../src/world/world.js';
import { Mission } from '../src/game/mission.js';
import { segmentPointDistance } from '../src/core/math.js';

test('weapon enforces cadence, ammo, and reload transfer',()=>{const w=new Weapon({magazine:3,reserve:4,fireDelay:100,reloadMs:500});assert.equal(w.shoot(0),true);assert.equal(w.shoot(50),false);assert.equal(w.shoot(100),true);assert.equal(w.reload(150),true);assert.equal(w.update(649),false);assert.equal(w.update(650),true);assert.deepEqual([w.mag,w.reserve],[3,2]);});
test('world blocks walls and permits open cells',()=>{const world=new World(['111','1P1','101','111']);assert.equal(world.canMove(96,96,10),true);assert.equal(world.canMove(60,96,10),false);assert.equal(world.lineOfSight({x:96,y:96},{x:96,y:160}),true);});
test('navigation chooses a walkable next tile around cover',()=>{const world=new World(['11111','1P101','10001','11111']);const step=world.nextStep({x:96,y:96},{x:224,y:96});assert.deepEqual(step,{x:96,y:160});});
test('mission advances through checkpoint, combat, and radio',()=>{const m=new Mission({x:10,y:0},{x:20,y:0}),p={x:10,y:0},enemies=[{alive:true}];assert.equal(m.update(p,enemies),'checkpoint');assert.equal(m.phase,1);enemies[0].alive=false;assert.equal(m.update(p,enemies),'clear');p.x=20;assert.equal(m.update(p,enemies),'complete');assert.equal(m.complete,true);});
test('shot geometry detects targets on aim line',()=>{assert.equal(segmentPointDistance({x:0,y:0},{x:100,y:0},{x:50,y:4}),4);assert.equal(segmentPointDistance({x:0,y:0},{x:100,y:0},{x:150,y:0}),50);});
