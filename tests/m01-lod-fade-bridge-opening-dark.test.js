import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01BridgeFinishRuntime} from '../src/render/m01-bridge-finish-runtime.js';
import {bridgeFamily} from '../src/render/m01-bridge-material.js';
import {LOD_DEFAULT_FADE_SECONDS} from '../src/render/m01-lod-policy.js';

// T43 review note: LOD0 bridge meshes with material 'opening_dark' (no bridge family, so no mapped/dithered clone) used to pop on LOD0 <-> LOD1.
const NAME='road_span_01';
function kits(){
  const parent=new THREE.Group(),list=[0,1,2].map(lod=>{
    const root=new THREE.Group(),node=new THREE.Group();node.name=NAME;root.add(node);parent.add(root);
    const body=new THREE.Mesh(new THREE.BoxGeometry(20,8,10),new THREE.MeshStandardMaterial({name:'brick_red'})),dark=new THREE.Mesh(new THREE.BoxGeometry(4,4,10),new THREE.MeshStandardMaterial({name:'opening_dark'}));
    body.name=`${NAME}_lod${lod}_courses`;body.userData.m01SourceMaterial='brick_red';dark.name=`${NAME}_lod${lod}_opening`;dark.userData.m01SourceMaterial='opening_dark';node.add(body,dark);
    return {root,file:{lod,file:`lod${lod}.glb`},pieces:[{name:NAME,node,truss:body,body,dark}]};
  });
  return {parent,list,world:{revision:0},state:{damage:[],parts:{[NAME]:{visible:true,lod:2}}}};
}
const loader=()=>async()=>({texture:new THREE.Texture(),bitmap:{close(){}}});

test('opening_dark has no bridge family and still gets the LOD dither fallback (same uniform path), source material untouched', async () => {
  const f=kits(),owner=new M01BridgeFinishRuntime(f.parent,{quality:'high',loadTexture:loader()}),camera=new THREE.PerspectiveCamera(),dark=lod=>f.list[lod].pieces[0].dark,body=lod=>f.list[lod].pieces[0].body;
  const originals=[0,1,2].map(l=>dark(l).material),value=mesh=>mesh.userData.m01BridgeFade?.value??1;
  assert.equal(bridgeFamily(dark(0),originals[0]),null);
  await owner.ready;owner.sync({kits:f.list,quality:'high',world:f.world});
  try{
    const at=(d,clock)=>{camera.position.set(-d,4,0);owner.select({kits:f.list,state:f.state,camera,clock});};
    for(const l of [0,1,2]){
      const m=dark(l).material;assert.notEqual(m,originals[l],`lod${l} opening_dark is rebound to the fade fallback`);
      assert.ok(m.userData.m01BridgeFade,'carries the dither uniform');assert.match(m.customProgramCacheKey(),/m01-bridge-fade-v1/);
      assert.equal(originals[l].userData.m01BridgeFade,undefined,'source material not modified');assert.equal(m.name,'opening_dark');
    }
    at(300,200);at(300,201);at(600,202);   // LOD0 -> LOD1 swap fades
    assert.equal(owner.diagnostics.fade.active,1);
    assert.equal(value(dark(0)),-1,'outgoing opening_dark dithers out with the rest of the piece');assert.equal(value(dark(1))===0,true,'incoming dithers in');
    assert.equal(value(dark(0)),value(body(0)),'same role+progress as the mapped body');
    at(600,202+LOD_DEFAULT_FADE_SECONDS/2);
    assert.ok(Math.abs(value(dark(0))+.5)<1e-9&&Math.abs(value(dark(1))-.5)<1e-9);
    at(600,203);assert.equal(owner.diagnostics.fade.active,0);assert.equal(value(dark(0)),1,'resting value keeps every pixel');
    // The per-draw hook copies the mesh value into the fallback material uniform, like every mapped bridge material.
    const m=dark(1),u=m.material.userData.m01BridgeFade;u.value=.25;m.onBeforeRender(null,null,camera,m.geometry,m.material,null);assert.equal(u.value,1);
  }finally{owner.dispose();}
  for(const l of [0,1,2])assert.equal(dark(l).material,originals[l],'dispose rebinds the original opening_dark material');
});

test('real bridge GLBs: the only mesh material without a bridge family is opening_dark (2 rail + 13 road LOD0 primitives)', async () => {
  const {readFileSync}=await import('node:fs'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const counts={};
  for(const file of ['bridge_rail_1891_1912','bridge_road_lentze_1857_1912']){
    const b=readFileSync(new URL(`../assets/models/provisional/m01/${file}.glb`,import.meta.url));
    const g=await new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
    g.scene.traverse(m=>{if(m.isMesh&&bridgeFamily(m,m.material)===null)counts[file]=(counts[file]??0)+(m.material.name==='opening_dark'?1:1000);});
  }
  assert.deepEqual(counts,{bridge_rail_1891_1912:2,bridge_road_lentze_1857_1912:13});
});
