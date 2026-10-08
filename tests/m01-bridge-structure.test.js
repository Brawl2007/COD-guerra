import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import manifest from '../assets/models/provisional/m01/bridges.manifest.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {LOCOMOTIVE_PLACEMENT} from '../src/render/m01-locomotive.js';
import {M01BridgeStructure,M01_BRIDGE_CLEARANCE,M01_BRIDGE_MICRO_DETAIL_RANGE,M01_BRIDGE_STRUCTURE_SPEC,M01_TRACK_CENTRES,
  lentzeCrossings,spanStructureDescriptors,supportStructureDescriptors} from '../src/render/m01-bridge-structure.js';

const root=new URL('../',import.meta.url),read=path=>fs.readFileSync(new URL(path,root));
const DIR='assets/models/provisional/m01/';
const blobSha=buf=>createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
// Authored bridge kit and its collider authority: structural closeout must not regenerate them.
const AUTHORITY={
  'bridge_rail_1891_1912.glb':'089e40610cf90106063eb4785a47c166c5d10ab4',
  'bridge_rail_1891_1912.lod1.glb':'bd4027ac60637194708091c130e3b9f8bf9c2f79',
  'bridge_rail_1891_1912.lod2.glb':'e189b0d5dca5aa0bdafcd2b8cb8ac3fd9ed78746',
  'bridge_rail_1891_1912.colliders.glb':'00b92dfd87682f243f748d7f2d9f0851030a674b',
  'bridge_road_lentze_1857_1912.glb':'b35be1c664eb7abee7d223f3274e2c794cf818e6',
  'bridge_road_lentze_1857_1912.lod1.glb':'20f3ac29aa00be21df25eb47359da20e08d84e67',
  'bridge_road_lentze_1857_1912.lod2.glb':'b1045b5a671d931b415363a4fd86e689d2313b97',
  'bridge_road_lentze_1857_1912.colliders.glb':'91dc21c0bf8f4510e3f882e01ccea5d486eb319f',
  'bridges.manifest.json':'6faf49694923a6e8cf036185793347fa0cface87',
  'bridge-colliders.json':'df8f3b19df6dbbd379935c13987eefacc015a55c'
};
const FILES={rail:'bridge_rail_1891_1912',road:'bridge_road_lentze_1857_1912'};
const fileFor=(prefix,lod)=>`${DIR}${FILES[prefix]}${lod?`.lod${lod}`:''}.glb`;
function gltfJson(path){const b=read(path),n=b.readUInt32LE(12);return {buf:b,json:JSON.parse(b.subarray(20,20+n))};}
function nodeBounds(json,node){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const p of json.meshes[node.mesh].primitives){const a=json.accessors[p.attributes.POSITION];for(let i=0;i<3;i++){min[i]=Math.min(min[i],a.min[i]);max[i]=Math.max(max[i],a.max[i]);}}
  return {min,max};
}
// Axis-aligned bounds of an instanced box descriptor (handles rotated members).
function itemBounds(it){
  const m=new THREE.Matrix4().compose(new THREE.Vector3(...it.p),it.q?new THREE.Quaternion(...it.q):new THREE.Quaternion(),new THREE.Vector3(...it.s));
  return new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(m);
}
const spans=prefix=>{const {json}=gltfJson(fileFor(prefix,0));return json.nodes.filter(n=>/_span_\d\d$/.test(n.name)).map(n=>({node:n,json,index:Number(n.name.slice(-2)),length:n.extras.m01.lengthM}));};
const supportsX=prefix=>gltfJson(fileFor(prefix,0)).json.nodes.find(n=>n.extras?.m01?.supportsX).extras.m01.supportsX;

test('authored bridge GLBs, manifest and collider authority stay byte-identical',()=>{
  for(const [file,sha] of Object.entries(AUTHORITY))assert.equal(blobSha(read(DIR+file)),sha,file);
});

test('structural detail stays inside each span and support macro envelope in every LOD',()=>{
  for(const prefix of ['rail','road'])for(const lod of [0,1,2]){
    const {json}=gltfJson(fileFor(prefix,lod));
    for(const node of json.nodes.filter(n=>/_span_\d\d$/.test(n.name))){
      const d=spanStructureDescriptors({prefix,index:Number(node.name.slice(-2)),length:node.extras.m01.lengthM,lod}),b=nodeBounds(json,node);
      if(lod===2){assert.equal(d.medium.length+d.high.length,0,node.name);continue;}
      assert.ok(d.medium.length>0,node.name);
      for(const it of [...d.medium,...d.high]){
        const box=itemBounds(it);
        // Rails continue 1.2 m over each pier joint; everything else hugs the authored members.
        assert.ok(box.min.x>=b.min[0]-1.25&&box.max.x<=b.max[0]+1.25,`${node.name} ${it.kind} x`);
        assert.ok(box.min.y>=b.min[1]-.6&&box.max.y<=b.max[1]+.6,`${node.name} ${it.kind} y ${box.min.y} ${box.max.y}`);
        assert.ok(box.min.z>=b.min[2]-.35&&box.max.z<=b.max[2]+.35,`${node.name} ${it.kind} z`);
      }
    }
    const xs=supportsX(prefix);
    for(const node of json.nodes.filter(n=>/_support_\d\d$/.test(n.name))){
      const d=supportStructureDescriptors({prefix,supportIndex:Number(node.name.slice(-2)),supportsX:xs,lod}),b=nodeBounds(json,node);
      for(const it of d.medium){const box=itemBounds(it);
        assert.ok(box.min.x>=b.min[0]-.6&&box.max.x<=b.max[0]+.6&&box.min.z>=b.min[2]-.6&&box.max.z<=b.max[2]+.6&&box.min.y>=b.min[1]-.1&&box.max.y<=b.max[1]+.1,`${node.name} ${it.kind}`);}
      for(const band of d.bands){
        assert.ok(band.y0>=b.min[1]&&band.y1<=b.max[1],`${node.name} course height`);
        assert.ok(band.lengthX/2+band.offset<=b.max[0]+.5,`${node.name} course width`);
      }
    }
  }
});

test('walkable decks and both rail loading gauges stay clear of new structure',()=>{
  const rail=M01_BRIDGE_CLEARANCE.rail,road=M01_BRIDGE_CLEARANCE.road;
  for(const prefix of ['rail','road'])for(const s of spans(prefix)){
    const d=spanStructureDescriptors({prefix,index:s.index,length:s.length,lod:0});
    for(const it of [...d.medium,...d.high]){
      const b=itemBounds(it),inside=(z0,z1,y0,y1)=>b.max.x>0&&b.min.x<s.length&&b.max.z>z0&&b.min.z<z1&&b.max.y>y0&&b.min.y<y1;
      if(prefix==='rail'){
        assert.ok(!inside(-rail.walkHalf,rail.walkHalf,.02,rail.walkTop),`${s.node.name} ${it.kind} intrudes into deck walk space`);
        for(const tz of M01_BRIDGE_STRUCTURE_SPEC.rail.tracks)assert.ok(!inside(tz-rail.gaugeHalf,tz+rail.gaugeHalf,.02,rail.gaugeTop),`${s.node.name} ${it.kind} in loading gauge`);
      }else assert.ok(!inside(-road.walkHalf,road.walkHalf,.03,road.walkTop),`${s.node.name} ${it.kind} intrudes into carriageway`);
    }
  }
  // The track across the abutments rises from the embankment rail head to the bridge rail head without stepping into the walk volume.
  const west=supportStructureDescriptors({prefix:'rail',supportIndex:0,supportsX:supportsX('rail'),lod:0});
  const rails=west.medium.filter(i=>i.kind==='rail'),tops=rails.map(i=>itemBounds(i).max.y);
  assert.ok(rails.length===12&&Math.max(...tops)<=.03&&Math.min(...tops)>=-.2);
});

test('quality tiers: LOD2 and Low add nothing; High only adds rivets and fishplates; LOD0 > LOD1',()=>{
  for(const prefix of ['rail','road'])for(const s of spans(prefix)){
    const [l0,l1,l2]=[0,1,2].map(lod=>spanStructureDescriptors({prefix,index:s.index,length:s.length,lod}));
    assert.ok(l0.medium.length>l1.medium.length&&l1.medium.length>0);assert.equal(l2.medium.length+l2.high.length,0);
    assert.equal(l1.high.length,0);assert.ok(l0.high.length>0);
    assert.deepEqual([...new Set(l0.high.map(i=>i.kind))].sort(),prefix==='rail'?['fishplate','rivet']:['rivet']);
    // Only the rail LOD0 deck replaces authored primitives (plank slab and flat rails); road decks keep theirs.
    assert.deepEqual([...l0.hide],prefix==='rail'?['timber','steel_rail']:[]);assert.deepEqual([...l1.hide],[]);
  }
  // Lentze lattice rivets sit exactly on the crossings of the generator's two 45° families.
  for(const [x,y] of lentzeCrossings(100,7.68,1.6,-.4)){assert.ok(y>=.3&&y<=2.6);assert.ok(Math.abs(((x-(y+.4))+7.68)/1.6-Math.round(((x-(y+.4))+7.68)/1.6))<1e-6);}
});

test('descriptors are deterministic and never touch gameplay RNG, saves or colliders',()=>{
  const sim=new M01Simulation(19390901),rng=sim.rng.state,snapshot=sim.snapshot(false),obstacles=JSON.stringify(sim.world.obstacles),walk=JSON.stringify(sim.world.walkSurfaces);
  for(const prefix of ['rail','road']){
    for(const s of spans(prefix))assert.deepEqual(spanStructureDescriptors({prefix,index:s.index,length:s.length,lod:0}),spanStructureDescriptors({prefix,index:s.index,length:s.length,lod:0}));
    for(let i=0;i<10;i++)supportStructureDescriptors({prefix,supportIndex:i,supportsX:supportsX(prefix),lod:0});
  }
  assert.equal(sim.rng.state,rng);assert.deepEqual(sim.snapshot(false),snapshot);
  assert.equal(JSON.stringify(sim.world.obstacles),obstacles);assert.equal(JSON.stringify(sim.world.walkSurfaces),walk);
});

test('double-track approach lines up with the bridge tracks and the trains already placed east of Lisewo',()=>{
  assert.deepEqual([...M01_TRACK_CENTRES.rail_embankment_west],[...M01_BRIDGE_STRUCTURE_SPEC.rail.tracks]);
  assert.ok(M01_TRACK_CENTRES.rail_line_east.includes(LOCOMOTIVE_PLACEMENT.position[2]));
  assert.ok(M01_TRACK_CENTRES.rail_line_east.includes(2.5));assert.deepEqual([...M01_TRACK_CENTRES.rail_line_southwest],[0]);
});

async function loadKit(prefix,lod){
  const {json,buf}=gltfJson(fileFor(prefix,lod)),n=buf.readUInt32LE(12),bin=buf.subarray(28+n);
  json.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
  globalThis.ProgressEvent??=class{constructor(type,properties){Object.assign(this,properties);}};
  const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
  // Same tagging as M01View.loadKit before its material replacement.
  gltf.scene.traverse(o=>{if(o.isMesh)o.userData.m01SourceMaterial=o.material?.name;});
  return gltf.scene;
}

test('runtime attaches to real GLB nodes, swaps only the rail deck primitives by quality and disposes cleanly',async()=>{
  const steel=new THREE.MeshStandardMaterial(),timber=new THREE.MeshStandardMaterial(),stone=new THREE.MeshStandardMaterial();
  const structure=new M01BridgeStructure({steel,timber,stone}),scene=await loadKit('rail',0),road=await loadKit('road',0),lod1=await loadKit('rail',1);
  const file=lod=>manifest.files.find(f=>f.lod===lod);
  assert.ok(structure.attachKit(scene,file(0))>=13);assert.ok(structure.attachKit(road,file(0))>=13);assert.ok(structure.attachKit(lod1,file(1))>=9);
  const names=structure.attachments.map(a=>a.node.name);
  for(const n of ['rail_span_01','rail_span_06_collapsed','rail_span_07_collapsed','road_span_01_collapsed','rail_support_00','rail_support_01','rail_support_06','rail_support_09'])assert.ok(names.includes(n),n);
  const span=scene.getObjectByName('rail_span_03'),sources=[];span.traverse(o=>{if(o.isMesh&&o.userData.m01SourceMaterial)sources.push(o);});
  const hidden=sources.filter(o=>['timber','steel_rail'].includes(o.userData.m01SourceMaterial)),steelSource=sources.find(o=>o.userData.m01SourceMaterial==='steel_painted');
  assert.equal(hidden.length,2);
  for(const quality of ['medium','high','low','medium']){
    structure.sync(quality,new THREE.Vector3(1e5,0,0));
    for(const o of hidden)assert.equal(o.visible,quality==='low');assert.equal(steelSource.visible,true);
    const d=structure.diagnostics;assert.equal(d.collidersAdded,0);
    if(quality==='low')assert.equal(d.visibleDetails,0);else assert.ok(d.visibleDetails>0);
  }
  // Rivets/fishplates only resolve within range of the viewer; medium detail is unaffected.
  const a=structure.attachments.find(x=>x.node.name==='rail_span_01'),rivets=a.batches.find(b=>b.slot==='rivet'),rails=a.batches.find(b=>b.slot==='rail');
  assert.equal(rivets.medium,0);assert.ok(rivets.high>500&&rails.high>0);
  structure.sync('high',new THREE.Vector3(1e5,0,0));assert.equal(rivets.mesh.count,0);assert.equal(rivets.mesh.visible,false);assert.equal(rails.mesh.count,rails.medium);
  structure.sync('high',new THREE.Vector3(30,2,0));assert.equal(rivets.mesh.count,rivets.high);assert.equal(rivets.mesh.visible,true);assert.equal(rails.mesh.count,rails.medium+rails.high);
  structure.sync('medium',new THREE.Vector3(30,2,0));assert.equal(rivets.mesh.count,0);
  assert.ok(M01_BRIDGE_MICRO_DETAIL_RANGE>=100);
  // Rail stubs over a pier joint follow the world's joints: a demolished neighbour removes them, restore brings them back.
  const sim=new M01Simulation(19390901),span3=structure.attachments.find(x=>x.node.name==='rail_span_03'),west=span3.stubs.filter(st=>st.side==='w');
  assert.ok(west.length===12&&span3.stubs.length===24);
  const shown=st=>{const m=new THREE.Matrix4();st.mesh.getMatrixAt(st.index,m);return m.determinant()!==0;};
  structure.sync('medium',null,sim.world);assert.ok(span3.stubs.every(shown));assert.equal(structure.diagnostics.hiddenJointStubs>0,true); // collapsed copies stay hidden
  const collapsedStubs=structure.attachments.find(x=>x.node.name==='rail_span_02_collapsed').stubs;assert.ok(collapsedStubs.length>0&&!collapsedStubs.some(shown));
  sim.world.refresh(['evt_m01_east_demolition','evt_m01_west_demolition']);structure.sync('medium',null,sim.world);
  assert.ok(!west.some(shown));assert.ok(span3.stubs.filter(st=>st.side==='e').every(shown));
  const span5=structure.attachments.find(x=>x.node.name==='rail_span_05');assert.ok(!span5.stubs.filter(st=>st.side==='e').some(shown));
  sim.world.refresh([]);structure.sync('medium',null,sim.world);assert.ok(span3.stubs.every(shown)&&span5.stubs.every(shown));
  // Collapsed spans inherit the same structure as their intact span (same descriptors, posed by the GLB node).
  const intact=structure.attachments.find(x=>x.node.name==='rail_span_06'),collapsed=structure.attachments.find(x=>x.node.name==='rail_span_06_collapsed');
  assert.deepEqual(collapsed.detail,intact.detail);
  const before=scene.children.length;structure.dispose();assert.equal(scene.children.length,before);
  for(const o of hidden)assert.equal(o.visible,true);
  let leftovers=0;for(const s of [scene,road,lod1])s.traverse(o=>{if(o.userData.m01BridgeStructure)leftovers++;});assert.equal(leftovers,0);
});
