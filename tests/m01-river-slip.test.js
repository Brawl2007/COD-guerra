import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01TerrainRelief} from '../src/render/m01-terrain-relief.js';
import {freshSim,drive} from './helpers/m01-collision-probe.js';

// The slip: a way out of the river on the west bank (src/world/tczew-world.js terrainHeightAt, x 25..40, z 10..15, 7 m over 15 m). Before it the bank was a 7 m
// step: a man who fell in (no damage) could walk 240 m along the bed and never get out. The east bank is NOT done (5 m step at x 265), by decision.
const landings=path=>path.flatMap(p=>p.events??[]).filter(e=>e.type==='player-landing');

test('the drawn ground is the slip: the actual terrain meshes agree with the physics height over the whole ramp, and the ramp is a walkable slope',()=>{
  const world=new TczewWorld(),material=new THREE.MeshBasicMaterial(),owner=new M01TerrainRelief(new THREE.Group(),world,material),ray=new THREE.Raycaster();
  owner.parent.updateMatrixWorld(true);
  try{
    let worst=0,n=0;
    for(let x=25.2;x<=39.8;x+=.4)for(let z=10.2;z<=14.8;z+=.4){
      ray.set(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(owner.meshes,false)[0];
      assert.ok(hit,`the ground is drawn at ${x.toFixed(1)},${z.toFixed(1)}`);worst=Math.max(worst,Math.abs(hit.point.y-world.heightAt(x,z)));n++;
    }
    assert.ok(n>400);assert.ok(worst<1e-6,`the mesh differs from the physics by up to ${worst} m`);
    // the ends meet the existing ground: the lowland at x 25 (-3) and the river bed at x 40 (-10)
    assert.equal(world.heightAt(25,12.5),-3);assert.equal(world.heightAt(25.0001,12.5),world.heightAt(25,12.5)-7*.0001/15);assert.ok(Math.abs(world.heightAt(39.9999,12.5)+10)<1e-3);
    // a slope the body can walk: 7 m over 15 m is ~25 degrees, well inside what a body follows (a step of 0.45 m within its 0.36 m radius is ~51)
    assert.ok(Math.atan(7/15)*180/Math.PI<30);
  }finally{owner.dispose();material.dispose();}
});

test('from the river bed the player walks out up the slip onto the west bank: no landing, no damage, a smooth climb',()=>{
  const sim=freshSim(),world=sim.world;
  assert.equal(world.heightAt(45,12.5),-10,'the start is the bed');
  const path=drive(sim,{x:45,z:12.5,y:-10,angle:Math.PI,ticks:150,sprint:false});
  assert.deepEqual(landings(path),[],'climbing out is not a fall');
  assert.equal(sim.player.health,100);assert.equal(sim.player.fall,undefined);
  assert.ok(sim.player.x<23,`out on the bank at x ${sim.player.x.toFixed(2)}`);assert.equal(sim.player.y,-3,'on the lowland');
  let steepest=0;for(let i=1;i<path.length;i++){const d=path[i].y-path[i-1].y;steepest=Math.max(steepest,d);assert.ok(d>=-1e-9,`only up on the way out (tick ${i})`);assert.equal(path[i].y,world.heightAt(path[i].x,path[i].z),`on the ground at tick ${i}`);}
  assert.ok(steepest<.12,`a steady climb, at most ${steepest.toFixed(3)} m a tick`);
  assert.ok(path.some(p=>p.x>26&&p.x<39&&p.y>-9.5&&p.y<-3.5),'it really walked the ramp, between the bed and the bank');
});

test('walking down the slip into the river is a descent, not a fall; beside the slip the bank is still a 7 m drop and the bed still cannot be left',()=>{
  const down=freshSim(),p1=drive(down,{x:22,z:12.5,y:-3,angle:0,ticks:150,sprint:false});
  assert.deepEqual(landings(p1),[]);assert.equal(down.player.health,100);assert.equal(down.player.y,-10);assert.ok(down.player.x>40);
  // beside the ramp (z 6 and z 22): walking east off the bank is the splash fall it always was
  for(const z of [6,22]){
    const sim=freshSim(),p=drive(sim,{x:22,z,y:-3,angle:0,ticks:60,sprint:false}),l=landings(p);
    assert.equal(l.length,1,`one landing at z ${z}`);assert.equal(l[0].surface,'water');assert.equal(l[0].damage,0);assert.ok(Math.abs(l[0].drop-7)<.01);
    // and from the bed there, west is a wall
    const back=drive(sim,{x:30,z,y:-10,angle:Math.PI,ticks:60,sprint:false});
    assert.ok(sim.player.x>25,`stopped by the bank at x ${sim.player.x.toFixed(2)} (z ${z})`);assert.equal(sim.player.y,-10);assert.deepEqual(landings(back),[]);
  }
});
