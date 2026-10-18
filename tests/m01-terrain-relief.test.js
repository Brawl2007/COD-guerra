import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01TerrainRelief,createLegacyGround,reliefOffset} from '../src/render/m01-terrain-relief.js';

const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const make=()=>new M01TerrainRelief(new THREE.Group(),new TczewWorld(),new THREE.MeshBasicMaterial());
test('actual reconstructed source buffers match independently recorded integration ground',()=>{
  // Independently recorded from integration 293a4f1's actual M01View.buildTerrain, not regenerated expectations.
  // The player's body physics (D44, golden amendment 04) turned the shelter pit from -4 m flat (a 5 m cliff cut into the road embankment, a wall the player could neither
  // leave nor reach) into a depression relative to the ground, so exactly five of the 52531 vertices changed: (-265,65) -4 -> -1.216, (-260,65) -4 -> -2.115,
  // (-255,65) -4 -> -1.935, (-265,75) and (-255,75) -4 -> -3.464. positionHash and normalHash moved with them (the integration values were 25c524bd8f1f... and f76a0411c090...);
  // uv and index are the integration buffers, byte for byte. The same re-pin is in tests/m01-material-authority.test.js.
  const evidence={positionHash:'35d11fa7ea416a062df3adc81ec164971a2cf971925bd2acb18fc43102da9529',normalHash:'f7e0d30eb0721db5f7f5ee5584a36d1eacb9cf7ca2d1524efcf6d46ef8fb5dad',uvHash:'0da77efeb7a2e8cfb7e31f9b9953c1fd1045a460fc7e241d7272d2c6444d5a3d',indexHash:'651345bc42911c8071fc2c38659861331f722b0905e5ed523e89ec16414622f2'},g=createLegacyGround(new TczewWorld());
  assert.equal(g.index.count/3,104000);for(const [attr,key]of [['position','positionHash'],['normal','normalHash'],['uv','uvHash']])assert.equal(hash(g.attributes[attr].array),evidence[key]);assert.equal(hash(g.index.array),evidence.indexHash);g.dispose();
});
test('every protected and crossing source triangle, its surface, exact normals and rounded UVs survives extraction',()=>{
  const owner=make(),legacy=createLegacyGround(owner.world),source=legacy.attributes.position,retained=new Set();
  for(const m of owner.meshes.filter(m=>m.geometry.userData.kind==='legacy-lattice')){
    const g=m.geometry,ids=g.userData.sourceIndices;
    for(let i=0;i<ids.length;i++){const j=ids[i],x=source.getX(j),z=source.getZ(j);if(owner.envelope.distance(x,z)<=30)for(const attr of ['position','normal','uv']){
      const a=g.attributes[attr],b=legacy.attributes[attr];for(let k=0;k<a.itemSize;k++)assert.equal(a.array[i*a.itemSize+k],b.array[j*b.itemSize+k],`${attr} source vertex ${j}`);
    }}
    for(let i=0;i<g.index.count;i+=3)retained.add([ids[g.index.getX(i)],ids[g.index.getX(i+1)],ids[g.index.getX(i+2)]].join(','));
  }
  let triangles=0;for(let i=0;i<legacy.index.count;i+=3){const ids=[legacy.index.getX(i),legacy.index.getX(i+1),legacy.index.getX(i+2)],xs=ids.map(v=>source.getX(v)),zs=ids.map(v=>source.getZ(v));
    const crossing=owner.envelope.regions.some(r=>Math.min(...xs)<=r.maxX+20&&Math.max(...xs)>=r.minX-20&&Math.min(...zs)<=r.maxZ+20&&Math.max(...zs)>=r.minZ-20);
    if(crossing){triangles++;assert.ok(retained.has(ids.join(',')),`actual crossing triangle ${i/3}`);}
  }assert.ok(triangles>20000,'meaningful coverage of the protected source lattice');owner.dispose();legacy.dispose();
});
test('complete 1m protected union: physics/visual height delta zero, fixed-seed outside fields and river retained',()=>{
  const owner=make(),world=owner.world,e=owner.envelope,copy=new TczewWorld();let sampled=0;
  for(let z=Math.ceil(e.extent.minZ);z<=e.extent.maxZ;z++)for(let x=Math.ceil(e.extent.minX);x<=e.extent.maxX;x++)if(e.contains(x,z)){
    assert.equal(world.heightAt(x,z),copy.heightAt(x,z));assert.equal(owner.visualHeightAt(x,z),world.heightAt(x,z));assert.equal(reliefOffset(e,x,z),0);sampled++;
  }
  assert.ok(sampled>300000);assert.notEqual(reliefOffset(e,-900,-500),0);assert.notEqual(reliefOffset(e,-900,-500,1),reliefOffset(e,-900,-500,2));
  for(let z=-3000;z<=3000;z+=10)for(const x of [30,100,200,260])assert.equal(reliefOffset(e,x,z),0);
  owner.dispose();
});
test('camera-culled actual buffers satisfy canonical ground budgets, steady sync and borrowed-resource lifetime',()=>{
  const owner=make(),geometries=owner.geometries.slice(),material=owner.material;let released=0,borrowed=0;material.addEventListener('dispose',()=>borrowed++);for(const g of geometries)g.addEventListener('dispose',()=>released++);
  owner.parent.updateMatrixWorld(true);
  for(const [x,z,tx,tz,ty]of [[-74,30,-66,22,1],[-146,14,-123,8,1],[1092,24,1150,2.5,2.5]]){
    const camera=new THREE.PerspectiveCamera(70,1280/720,.05,7500);camera.position.set(x,owner.world.heightAt(x,z)+1.6,z);camera.lookAt(tx,ty,tz);camera.updateMatrixWorld(true);
    const f=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));owner.beginFrame(camera,0);
    for(const m of owner.meshes)if(f.intersectsObject(m))m.onBeforeRender(null,null,camera,m.geometry);
    assert.ok(owner.triangles+12<=52000,`actual submitted ground ${owner.triangles}`);assert.ok(owner.draws>0);
  }
  owner.sync(owner.world,'high');const revision=owner.revision;for(let i=0;i<100;i++)owner.sync(owner.world,'high');assert.equal(owner.revision,revision);assert.deepEqual(owner.geometries,geometries);
  const replacement=new TczewWorld();replacement.refresh(['evt_m01_west_demolition']);owner.sync(replacement,'low');assert.equal(owner.world,replacement);assert.equal(owner.builds,1);owner.setEnabled(false);owner.setEnabled(true);assert.deepEqual(owner.geometries,geometries);
  owner.dispose();owner.dispose();assert.equal(released,geometries.length);assert.equal(borrowed,0);material.dispose();
});
