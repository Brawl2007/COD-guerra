import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01TerrainRelief} from '../src/render/m01-terrain-relief.js';
import {railContactRevealAt,eastTrackContactAt} from '../src/render/m01-track-bed.js';

// Independent immutable integration base: the new material registry may add
// exports, but the old sandbox surface generator and game authority stay exact.
const BASE = '6edc3d6f90ea5e12b4d0f554555bac8499423acc';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

test('T09 registry preserves the original sandbox surface generator byte-for-byte', () => {
  const before = git('show', `${BASE}:src/render/materials.js`);
  const originalFunction = before.slice(before.indexOf('export function surface(')).trim();
  const after = readFileSync(new URL('../src/render/materials.js', import.meta.url), 'utf8');
  assert.ok(after.includes(originalFunction), 'existing surface() must remain exactly unchanged');
});

test('terrain rollout preserves the original sampled ground geometry and colliders', () => {
  // T27 authorises extraction and exterior relief. Pin the independently recorded actual original buffers,
  // then compare actual protected surfaces/contact rays; the location of the generator is not an invariant.
  const integration='293a4f116b9b28818b7ff3bda4d83cc49b01014f',world=new TczewWorld(),original=new THREE.PlaneGeometry(2000,650,400,130);
  // PT05 (D33, 1f8bd2d) legitimately added solid yard-wagon obstacles to tczew-world.js in the integration candidate;
  // that file is pinned byte-exact to the PT05 commit (still listed in tests/helpers/m01-byte-guard-allowlist.js).
  const pinned={'src/world/tczew-world.js':'1f8bd2d0af9552abd713a665082d33ce53535214'};
  for(const path of ['src/world/tczew-world.js','assets/models/provisional/m01/bridge-colliders.json','src/render/m01-track-bed.js'])assert.equal(readFileSync(path,'utf8'),git('show',`${pinned[path]??integration}:${path}`),`immutable physics/contact owner ${path}`);
  original.rotateX(-Math.PI/2);original.translate(300,0,40);const p=original.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,world.terrainHeightAt(p.getX(i),p.getZ(i)));original.computeVertexNormals();
  const hashes={position:'25c524bd8f1f2b0a80378bacf1ea10bdba8cdd10b8b9d077b8eb5c148c1f376a',normal:'f76a0411c090ab56f65c7430498e277fa44b162b7e63c95797d9aae013a6531d',uv:'0da77efeb7a2e8cfb7e31f9b9953c1fd1045a460fc7e241d7272d2c6444d5a3d',index:'651345bc42911c8071fc2c38659861331f722b0905e5ed523e89ec16414622f2'};
  for(const [attribute,expected]of Object.entries(hashes)){const a=attribute==='index'?original.index.array:original.attributes[attribute].array;assert.equal(createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex'),expected);}
  const material=new THREE.MeshBasicMaterial(),oldMesh=new THREE.Mesh(original,material),owner=new M01TerrainRelief(new THREE.Group(),world,material),ray=new THREE.Raycaster();owner.parent.updateMatrixWorld(true);oldMesh.updateMatrixWorld(true);
  try{
    const samples=[[-260,64],[-260,70],[-300,60],[-150,0],[-35,40],[-15,4.5],[0,4.5],[8,4.5],[1035,0],[1040,0],[1049.2,0],[1055,2.5],[1062,2.5],[1067.2,2.5]];
    for(const feature of ['rail_embankment_west','road_approach_west']){const line=world.features.get(feature).polyline;for(let i=1;i<line.length;i++)for(let t=0;t<=1;t+=.1){const x=line[i-1][0]+t*(line[i][0]-line[i-1][0]),z=line[i-1][2]+t*(line[i][2]-line[i-1][2]);samples.push([x,z],[x,z+5],[x,z+10]);}}
    for(const [x,z]of samples){assert.ok(owner.envelope.contains(x,z));ray.set(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));const before=ray.intersectObject(oldMesh,false)[0],after=ray.intersectObjects(owner.meshes,false)[0];assert.ok(before&&after,`actual contact ${x},${z}`);assert.ok(Math.abs(after.point.y-before.point.y)<1e-10);assert.ok(after.normal.distanceTo(before.normal)<1e-10);assert.ok(after.uv.distanceTo(before.uv)<1e-10);assert.equal(owner.visualHeightAt(x,z),world.heightAt(x,z));}
    assert.equal(railContactRevealAt(0,-1,2),true);assert.equal(railContactRevealAt(-16,-1,2),false);assert.equal(eastTrackContactAt(1062).top,-.82);assert.equal(world.colliders.length,83);
  }finally{owner.dispose();original.dispose();material.dispose();}
});
