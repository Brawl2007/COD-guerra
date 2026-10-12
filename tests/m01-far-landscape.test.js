import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TczewWorld} from '../src/world/tczew-world.js';
import {buildTerrainEnvelope} from '../src/render/m01-terrain-envelope.js';
import {M01FarLandscape} from '../src/render/m01-far-landscape.js';
import {lightingModel} from '../src/render/m01-lighting.js';
test('actual far meshes are single LOD, original city bands outside full envelope, five submissions including mist',()=>{
  const world=new TczewWorld(),e=buildTerrainEnvelope(world),owner=new M01FarLandscape(new THREE.Group(),world),camera=new THREE.PerspectiveCamera();owner.beginFrame(camera);
  for(const m of owner.meshes){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){assert.ok(p.getX(i)<-460||p.getX(i)>1800);assert.ok(!e.contains(p.getX(i),p.getZ(i)));}assert.equal(m.isLOD,undefined);m.onBeforeRender(null,null,camera,m.geometry);}
  assert.equal(owner.draws,5);assert.ok(owner.draws<=10);assert.deepEqual(owner.anchors.map(a=>a.distanceKm),[39.7,15.8,36.1]);assert.ok(owner.anchors[0].direction[0]>0&&owner.anchors[0].direction[2]<0);assert.ok(owner.anchors[1].direction[2]>0,'+Z south');owner.dispose();
});
test('clock-driven altitude mist, quality/world replacement, immutable resources and once-only teardown',()=>{
  let invalidations=0;const owner=new M01FarLandscape(new THREE.Group(),new TczewWorld(),{onUpdate:()=>invalidations++}),resources=owner.meshes.map(m=>m.geometry);let disposed=0;for(const g of resources)g.addEventListener('dispose',()=>disposed++);
  owner.sync(owner.world,'high',20,lightingModel(-3.7,70));const early=owner.diagnostics.mistDensity,revision=owner.revision;for(let i=0;i<100;i++)owner.sync(owner.world,'high',20,lightingModel(-3.7,70));assert.equal(owner.revision,revision);
  const replacement=new TczewWorld();owner.sync(replacement,'low',40,lightingModel(18.6,95));assert.ok(owner.diagnostics.mistDensity<early);assert.equal(owner.materials.mist.uniforms.clock.value,40);assert.equal(owner.world,replacement);assert.equal(owner.builds,1);assert.deepEqual(owner.meshes.map(m=>m.geometry),resources);owner.setEnabled(false);owner.setEnabled(true);assert.equal(invalidations,2);owner.dispose();owner.dispose();assert.equal(disposed,resources.length);
});
