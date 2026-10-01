import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { M01Simulation } from '../src/game/m01-simulation.js';
import { M01View } from '../src/render/m01-view.js';
import { route } from './helpers/m01-route.js';

let completed;
const outro=()=>structuredClone((completed??=route()).outro);
const harness=()=>{
  const view=Object.create(M01View.prototype);view.scene=new THREE.Scene();view.batches=new Map();
  view.box=new THREE.BoxGeometry(1,1,1);view.sphere=new THREE.SphereGeometry(1,8,6);view.cylinder=new THREE.CylinderGeometry(1,1,1,8);
  view.materials=Object.fromEntries(['cloth','skin','metal','dark','wood','glow'].map(k=>[k,new THREE.MeshBasicMaterial()]));
  view.createActors();
  view.cleanup=()=>{view.batches.forEach(b=>b.dispose());[view.box,view.sphere,view.cylinder].forEach(g=>g.dispose());Object.values(view.materials).forEach(m=>m.dispose());};
  return view;
};
const matrix=(view,batch,index=0)=>{const m=new THREE.Matrix4();view.batches.get(batch).getMatrixAt(index,m);return m;};
const center=m=>new THREE.Vector3().setFromMatrixPosition(m);

test('the real roll call seats only the present actors and keeps their positions and pose through save/reload',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(outro());
  const seated=sim.actors.filter(a=>a.pose==='seated');assert.ok(seated.length>=6);
  for(const a of seated){assert.ok(a.alive&&a.active&&a.team==='ally');assert.equal(a.crouched,true);assert.equal(a.target,null);assert.equal(a.task,null);}
  for(const id of ['jozef_bak','leon_dudek','tadeusz_nowicki'])assert.notEqual(sim.actor(id).pose,'seated',id);
  const before=sim.snapshot();const restored=new M01Simulation();restored.restoreSnapshot(before);
  assert.deepEqual(restored.snapshot(),before);
  for(let i=0;i<200;i++)restored.tick(.05);
  for(const a of seated){const b=restored.actor(a.id);assert.deepEqual([b.x,b.y,b.z,b.facing,b.pose],[a.x,a.y,a.z,a.facing,a.pose]);}
});

test('actual instance matrices lower seated/crouched heads, keep seated feet on the floor and render horizontal wounded/carried bodies without mutating data',()=>{
  const view=harness();
  try{
    const base={id:'sample',x:0,y:0,z:0,facing:0,team:'ally',alive:true,active:true,state:'GUARD',shot:0};
    view.updateActors([base],0);const standing=center(matrix(view,'head'));
    const seated={...base,pose:'seated',crouched:true},copy=structuredClone(seated);
    view.updateActors([seated],0);const head=center(matrix(view,'head')),foot=matrix(view,'boots');
    assert.ok(standing.y-head.y>.35&&standing.y-head.y<.6);
    const bounds=new THREE.Box3().setFromBufferAttribute(view.box.attributes.position).applyMatrix4(foot);
    assert.ok(Math.abs(bounds.min.y)<1e-6,'a bota assenta no chão');
    const still=view.batches.get('limbs').instanceMatrix.array.slice(0,view.batches.get('limbs').count*16);
    view.updateActors([seated],40);assert.deepEqual(view.batches.get('limbs').instanceMatrix.array.slice(0,still.length),still);
    assert.deepEqual(seated,copy);
    view.updateActors([{...base,crouched:true}],0);assert.ok(center(matrix(view,'head')).y<standing.y-.3);
    view.updateActors([{...base,state:'WOUNDED'}],0);
    const wounded=center(matrix(view,'head')),torso=center(matrix(view,'torso'));
    assert.ok(wounded.y<.7);assert.ok(Math.abs(wounded.z-torso.z)>.3,'corpo horizontal');
    view.updateActors([{...base,state:'WOUNDED',carriedBy:'leon_dudek',y:1.15,facing:Math.PI/2}],0);
    assert.ok(center(matrix(view,'head')).y>wounded.y+.5);assert.equal(view.actorPoses.carried,1);
    const actors=new M01Simulation().actors.map(a=>({...a,active:true})),saved=structuredClone(actors);
    view.updateActors(actors,3);assert.deepEqual(actors,saved);
    for(const b of view.batches.values()){
      assert.ok(b.count<=b.instanceMatrix.count,'capacidade para o elenco inteiro');
      assert.ok([...b.instanceMatrix.array.slice(0,b.count*16)].every(Number.isFinite));
    }
  }finally{view.cleanup();}
});

test('legacy actors without pose remain accepted and an unknown saved pose is rejected atomically',()=>{
  const sim=new M01Simulation();const old=outro();old.actors.forEach(a=>delete a.pose);
  assert.equal(sim.loadCheckpoint(JSON.stringify(old)).ok,true);
  const before=sim.snapshot(),bad=structuredClone(before);bad.actors[0].pose='floating';
  assert.equal(sim.loadCheckpoint(JSON.stringify(bad)).ok,false);assert.deepEqual(sim.snapshot(),before);
});
