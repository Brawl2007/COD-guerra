import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import map from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import manifest from '../assets/models/provisional/m01-wagons/manifest.json' with {type:'json'};
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01_YARD_WAGON_PLAN as PLAN,M01_YARD_WAGON_SIZE as SIZE,yardWagonFootprint} from '../src/world/m01-yard-wagon-layout.js';
import {M01YardWagons,M01_YARD_WAGON_PLAN as RENDER_PLAN,yardWagonPosition} from '../src/render/m01-yard-wagons.js';

const R=.36,EPS=1e-9;
const ALL_EVENTS=map.coverNodes.flatMap(c=>[c.activeAfter,c.activeUntil]).filter(Boolean);
const worlds=()=>{const w=new TczewWorld(),late=new TczewWorld();late.refresh([...new Set([...ALL_EVENTS,'evt_m01_west_demolition'])],{});return [w,late];};
const overlaps=(a,b,y)=>a.x+R>b.min.x&&a.x-R<b.max.x&&a.z+R>b.min.z&&a.z-R<b.max.z&&y+1.45>b.min.y&&y<b.max.y;
const actor=(world,x,z)=>({x,z,y:world.heightAt(x,z),radius:R});
const slide=(world,a,dx,dz,steps=1)=>{for(let i=0;i<steps;i++)world.move(a,dx/steps,dz/steps);return a;};

test('plan is single source: render re-exports the same frozen plan, ids/positions/covers unchanged',()=>{
  assert.equal(RENDER_PLAN,PLAN);assert.ok(Object.isFrozen(PLAN));
  assert.deepEqual(PLAN.map(w=>[w.id,w.type,[...w.position],w.cover,w.damageKey]),[
    ['yard_wagon_1','covered',[-320,0,-6],'cv_wagon_1',undefined],
    ['yard_wagon_2','open',[-340,0,8],'cv_wagon_2',undefined],
    ['yard_wagon_3','covered',[-352,0,8],undefined,'station_wagon_fire']]);
  const cv={cv_wagon_1:[-318,-3],cv_wagon_2:[-338,11]};
  for(const [id,[x,z]] of Object.entries(cv)){const n=map.coverNodes.find(c=>c.id===id);assert.ok(n);assert.equal(n.position[0],x);assert.equal(n.position[2],z);}
});

test('size table derives from the manifest',()=>{
  const d=t=>({...manifest.dimensions_m,height:manifest.dimensions_m[t].height});
  for(const t of ['covered','open']){assert.ok(Math.abs(SIZE[t].halfX-d(t).width/2)<EPS);assert.ok(Math.abs(SIZE[t].halfZ-d(t).frame/2)<EPS);}
  assert.equal(SIZE.covered.height,3.85);assert.equal(SIZE.covered.height,d('covered').height);assert.equal(SIZE.open.height,2.84);
});

test('every drawn yard wagon has exactly one obstacle equal to its footprint, before and after all events; covers untouched',()=>{
  for(const world of worlds()){
    for(const w of PLAN){
      const hits=world.obstacles.filter(o=>o.id===w.id);assert.equal(hits.length,1,w.id);
      const f=yardWagonFootprint(w,(x,z)=>world.heightAt(x,z));
      assert.deepEqual({id:hits[0].id,min:hits[0].min,max:hits[0].max},f);
      const [x,cy,z]=yardWagonPosition(w,world),s=SIZE[w.type];
      assert.ok(Math.abs((f.min.x+f.max.x)/2-x)<EPS&&Math.abs((f.min.z+f.max.z)/2-z)<EPS);
      assert.ok(Math.abs(f.max.y-cy-s.height)<EPS);assert.ok(f.min.y<=cy);
      assert.ok(!world.covers.some(c=>c.id===w.id),'wagons must not be drawn as covers');
    }
  }
  assert.ok(new TczewWorld().coverNodes.some(c=>c.id==='cv_wagon_1')&&new TczewWorld().coverNodes.some(c=>c.id==='cv_wagon_2'));
});

test('drawn procedural body is inside the solid box',async()=>{
  const world=new TczewWorld(),parent=new THREE.Group();
  const y=new M01YardWagons(parent,{load:async()=>{throw new Error('x');}},new THREE.BoxGeometry(1,1,1),new THREE.CylinderGeometry(1,1,1,6),new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial(),null);
  await y.load();y.update([],'high',world,{x:-340,z:8},0);parent.updateMatrixWorld(true);
  for(const slot of y.slots){
    const f=yardWagonFootprint(slot.wagon,(x,z)=>world.heightAt(x,z)),bb=new THREE.Box3().setFromObject(slot.fallback);
    assert.ok(bb.min.x>=f.min.x-1e-6&&bb.max.x<=f.max.x+1e-6,slot.wagon.id+' x');
    assert.ok(bb.min.z>=f.min.z-1e-6&&bb.max.z<=f.max.z+1e-6,slot.wagon.id+' z');
    assert.ok(bb.max.y<=f.max.y+1e-6,slot.wagon.id+' top');
  }
  y.dispose();
});

test('movement is blocked from every side of every wagon, including the slope end of yard_wagon_1',()=>{
  for(const world of worlds()){
    for(const w of PLAN){
      const f=yardWagonFootprint(w,(x,z)=>world.heightAt(x,z)),cx=(f.min.x+f.max.x)/2,cz=(f.min.z+f.max.z)/2;
      const cases=[ // [start x,z, dx,dz]
        [f.min.x-4,cz,8,0],[f.max.x+4,cz,-8,0],[cx,f.min.z-4,0,8],[cx,f.max.z+4,0,-8],
        [f.min.x-4,f.max.z-.5,8,0],[f.min.x-4,f.min.z+.5,8,0],[f.max.x+4,f.max.z-.5,-8,0]];
      for(const [x,z,dx,dz] of cases){
        for(const steps of [1,40]){
          const a=slide(world,actor(world,x,z),dx,dz,steps);
          for(const o of world.obstacles.filter(o=>PLAN.some(p=>p.id===o.id)))assert.ok(!overlaps(a,o,a.y),`${w.id} ${x},${z} steps ${steps}`);
          if(dx)assert.equal(a.z,z);
          if(dx>0)assert.ok(a.x<=f.min.x-R+EPS);if(dx<0)assert.ok(a.x>=f.max.x+R-EPS);
          if(dz>0)assert.ok(a.z<=f.min.z-R+EPS);if(dz<0)assert.ok(a.z>=f.max.z+R-EPS);
        }
      }
    }
    const w1=worlds()[0],a=slide(w1,actor(w1,-324,-2.5),6,0);
    assert.ok(a.x<=-321.45-R+EPS&&a.z===-2.5,'slope end of yard_wagon_1');
  }
});

test('line of sight through a wagon is blocked, above it is clear',()=>{
  const world=new TczewWorld(),f=yardWagonFootprint(PLAN[1],(x,z)=>world.heightAt(x,z)),z=8;
  const eye=(x,y)=>({space:'metres',x,y:y-1.5,z,eyeHeight:1.5});
  assert.equal(world.lineOfSight(eye(f.min.x-5,f.max.y-1),eye(f.max.x+5,f.max.y-1)),false);
  assert.equal(world.lineOfSight(eye(f.min.x-5,f.max.y+3),eye(f.max.x+5,f.max.y+3)),true);
});
