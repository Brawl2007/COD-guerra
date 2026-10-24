import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {rayBox} from '../src/world/spatial.js';
import {deepestWall,PLAYER_PHYSICS as P} from '../src/world/m01-player-physics.js';

// The bridge heads are where the whole mission is played. The kit's collider boxes (bridge-colliders.json) were exported for bullets and for the deck; the meshes the player
// SEES have more: parapets along the abutments, wide portal piers, steel under the first span. Every standable point of each head casts horizontal rays at chest and knee
// height against the intact lod0 mesh; wherever a ray meets the drawing, a player solid must have been met first (within 20 cm: the eye, 0.36 m behind the body's surface, then stays 16 cm or more from the drawing).
globalThis.ProgressEvent??=class{constructor(type,props){Object.assign(this,props);}};
const load=async file=>{
  const b=readFileSync(new URL('../assets/models/provisional/m01/'+file,import.meta.url)),loader=new GLTFLoader();
  loader.register(()=>({name:'node_no_texture_decode',loadTexture:()=>Promise.resolve(null)}));
  return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
};
const HEADS=[
  {name:'rail',file:'bridge_rail_1891_1912.glb',x0:-27,x1:42,z0:-16,z1:16},
  {name:'road',file:'bridge_road_lentze_1857_1912.glb',x0:-27,x1:42,z0:24,z1:56}];

for(const head of HEADS)test(`${head.name} bridge head: no standable point reaches the drawn bridge before a player solid stops it`,async()=>{
  const world=new TczewWorld(),{scene}=await load(head.file);scene.updateMatrixWorld(true);
  const meshes=[];   // the intact variants only: the destroyed ones are hidden until the demolition
  scene.traverse(n=>{
    if(!n.isMesh)return;let p=n,intact=false;while(p){if(/_intact$/.test(p.name)){intact=true;break;}p=p.parent;}
    if(!intact)return;const b=new THREE.Box3().setFromObject(n);if(b.max.x<head.x0-8||b.min.x>head.x1+8)return;meshes.push(n);
  });
  assert.ok(meshes.length>=6,`${meshes.length} intact meshes near the head`);
  const raycaster=new THREE.Raycaster(),failures=[],H=P.standHeight;let rays=0,hits=0;
  for(let x=head.x0;x<=head.x1;x+=3)for(let z=head.z0;z<=head.z1;z+=3){
    const y=world.heightAt(x,z);
    if(y<-3.2||deepestWall(world,x,z,y,P.radius,H))continue;   // not a place a body can stand (river, inside a wall)
    for(let k=0;k<8;k++)for(const h of [.6,1.3]){
      const a=k*Math.PI/4+.17,d={x:Math.cos(a),y:0,z:Math.sin(a)},o={x,y:y+h,z};
      raycaster.set(new THREE.Vector3(o.x,o.y,o.z),new THREE.Vector3(d.x,0,d.z));raycaster.far=6;rays++;
      const hit=raycaster.intersectObjects(meshes,false)[0];if(!hit)continue;hits++;
      let first=null;for(const s of world.playerSolids){const t=rayBox(o,d,{x:s.minX,y:s.y0,z:s.minZ},{x:s.maxX,y:s.y1,z:s.maxZ},6);if(t!==null&&(first===null||t<first))first=t;}
      if(first===null||first>hit.distance+.2)failures.push(`${hit.object.name} from (${x},${z}) y ${y.toFixed(2)} h ${h} heading ${(a*57.3).toFixed(0)}: mesh at ${hit.distance.toFixed(2)} m, solid ${first===null?'none':first.toFixed(2)}`);
    }
  }
  assert.ok(rays>1500&&hits>200,`the sweep is not vacuous (${rays} rays, ${hits} hit the drawing)`);
  assert.deepEqual(failures.slice(0,10),[],`${failures.length}/${hits} rays reach the drawn ${head.name} bridge head without meeting a solid`);
});
