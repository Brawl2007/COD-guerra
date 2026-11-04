import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01AreaSimulation} from '../src/game/m01-area-sim.js';
import {M01AreaDressing} from '../src/render/m01-area-dressing.js';

// Perf audit 2026-11-05: an act of the same area (VII-a -> VII-b -> VII-c) keeps the field/stubble/trees/scorch (and an unchanged wreck) and rebuilds only the covers' earthworks; nothing leaks.
const ACTS=['act_vii_a_north','act_vii_b_north_day','act_vii_c_withdrawal'];
const worlds=ACTS.map(actId=>new M01AreaSimulation(19390901,{difficulty:'soldado',actId}).world);
const withCanvas=fn=>{const original=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};try{return fn();}finally{globalThis.document=original;}};
const surface=()=>-3.2;
const meshOf=(d,name)=>d.group.children.find(c=>c.name===name);
const owned=d=>new Set([...d.geometries,...d.materials,...d.textures]);
/** Every geometry, material, instance buffer and texture a dressing owns, counted on 'dispose' events. */
const track=(dressing,seen)=>{
  const add=r=>{if(!r||seen.has(r))return;seen.set(r,{disposed:0});r.addEventListener('dispose',()=>{seen.get(r).disposed++;});};
  dressing.group.traverse(o=>{add(o.geometry);add(o.material);});
  for(const r of owned(dressing))add(r);
};

test('a second act of the same area reuses the field, the trees and the stubble (same objects) and rebuilds the earthworks of its covers',()=>withCanvas(()=>{
  const scene=new THREE.Scene(),a=new M01AreaDressing(scene,worlds[0],{surface,quality:'high'});
  const field=meshOf(a,'m01-area-field'),trees=meshOf(a,'m01-area-trees'),stubble=meshOf(a,'m01-area-stubble'),detail=a.textures[0],moundsA=meshOf(a,'m01-area-mounds'),treesDrawn=a.diagnostics.trees,fieldObj=a.field,stubbleObj=a.stubble;
  assert.ok(field&&trees&&stubble&&detail);
  const b=new M01AreaDressing(scene,worlds[1],{surface,quality:'high',reuse:a});
  assert.ok(meshOf(b,'m01-area-field')===field,'the field mesh and so its geometry are the same objects (no new terrain raycasts, no new soil map)');
  assert.ok(b.textures[0]===detail);assert.ok(b.field===fieldObj);
  assert.ok(meshOf(b,'m01-area-trees')===trees);assert.ok(meshOf(b,'m01-area-stubble')===stubble);assert.ok(b.stubble===stubbleObj&&a.stubble===null);
  const moundsB=meshOf(b,'m01-area-mounds');
  if(moundsA&&moundsB)assert.ok(moundsB!==moundsA,'the heaps of the other act\'s covers are built again');
  a.dispose();
  assert.equal(field.geometry.attributes.position.count>0,true);
  assert.ok(b.group.children.includes(trees)&&b.group.children.includes(field),'the old dressing\'s dispose leaves the taken-over pieces in the new group');
  assert.equal(b.diagnostics.trees,treesDrawn,'same tier: the same trees');
  assert.ok(b.replaces('np_wreck_hull'),'the wreck boxes are still drawn by the dressing');
  b.dispose();
}));

test('VII-a -> VII-b -> VII-c -> VII-a leaks nothing: replaced resources are disposed with the old dressing, kept ones only at the end',()=>withCanvas(()=>{
  const scene=new THREE.Scene(),seen=new Map();let prev=null;
  for(const w of [...worlds,worlds[0]]){
    const d=new M01AreaDressing(scene,w,{surface,quality:'medium',reuse:prev});track(d,seen);
    if(prev){
      const before=owned(prev),now=owned(d),gone=[...before].filter(r=>!now.has(r));
      prev.dispose();
      for(const r of gone)assert.ok(seen.get(r)?.disposed>=1,`replaced resource disposed with the old dressing (${r.constructor.name} ${r.name||''})`);
      for(const r of before)if(now.has(r))assert.equal(seen.get(r).disposed,0,`a resource still used is not disposed (${r.constructor.name})`);
    }
    prev=d;
  }
  assert.equal(scene.children.length,1,'one dressing group in the scene at any time');
  prev.dispose();
  assert.equal(scene.children.length,0);
  for(const [r,s] of seen)assert.ok(s.disposed>=1,`released at the end (${r.constructor.name} ${r.name||''})`);
}));

test('a world with another wreck box does not reuse the hull',()=>withCanvas(()=>{
  const scene=new THREE.Scene(),a=new M01AreaDressing(scene,worlds[0],{surface}),w=Object.create(worlds[1]);
  w.areaCovers=worlds[1].areaCovers.map(c=>c.id==='np_wreck_upper'?{...c,max:{...c.max,y:c.max.y+1}}:c);
  const hull=meshOf(a,'m01-area-wreck'),b=new M01AreaDressing(scene,w,{surface,reuse:a});
  assert.ok(hull);assert.ok(meshOf(b,'m01-area-wreck')!==hull);
  a.dispose();b.dispose();
}));

test('syncShellCraters: a fresh array with the same craters redraws nothing; the same count with other craters does',()=>{
  const ctx={geometries:[],materials:[],group:new THREE.Group(),groundY:-3},draw=damage=>M01AreaDressing.prototype.syncShellCraters.call(ctx,damage);
  const shell=n=>({id:`np_shell_crater_brg_npb_1_${n}`,x:-440+n*20,y:-3,z:-1210,started:20+n});
  draw([shell(0),shell(1)]);const discs=ctx.group.children[0],v=discs.instanceMatrix.version;
  draw([{...shell(0)},{...shell(1)}]);assert.equal(discs.instanceMatrix.version,v,'equal records in a new array: no work');
  draw([shell(1),shell(2)]);assert.ok(discs.instanceMatrix.version>v,'same count, other craters: redrawn');
});

test('dispose frees the instance buffers of every InstancedMesh (heaps, clods, crater discs and rims, shell craters, stubble)',()=>withCanvas(()=>{
  const scene=new THREE.Scene(),d=new M01AreaDressing(scene,worlds[1],{surface,quality:'high'});
  d.syncShellCraters([{id:'np_shell_crater_x_0',x:-440,y:-3,z:-1210,started:1},{id:'np_shell_crater_x_1',x:-420,y:-3,z:-1205,started:2}]);
  const meshes=[];d.group.traverse(o=>{if(o.isInstancedMesh)meshes.push(o);});
  const names=meshes.map(m=>m.name);
  for(const n of ['m01-area-mounds','m01-area-clods','m01-area-crater-discs','m01-area-crater-rims','m01-area-shell-crater-discs','m01-area-shell-crater-rims','m01-area-stubble'])assert.ok(names.includes(n),`${n} exists`);
  const hits=new Map(meshes.map(m=>{const c={n:0};m.addEventListener('dispose',()=>{c.n++;});return [m,c];}));
  d.dispose();
  for(const [m,c] of hits)assert.ok(c.n>=1,`${m.name} released`);
}));
