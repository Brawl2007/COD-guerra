import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01BridgeFinishRuntime} from '../src/render/m01-bridge-finish-runtime.js';
import {bridgeFadeDither} from '../src/render/m01-bridge-material.js';
import {LOD_DEFAULT_FADE_SECONDS,instanceFadeKeeps} from '../src/render/m01-lod-policy.js';
import {LOD_FADE_VALUE_GLSL_BODY} from '../src/render/m01-lod-dither.js';

const NAME='rail_span_01';
function kitFixture(){
  const parent=new THREE.Group(),kits=[0,1,2].map(lod=>{
    const root=new THREE.Group(),node=new THREE.Group();node.name=NAME;root.add(node);parent.add(root);
    const truss=new THREE.Mesh(new THREE.BoxGeometry(100,8,10),new THREE.MeshStandardMaterial({name:'steel_painted'})),body=new THREE.Mesh(new THREE.BoxGeometry(20,8,10),new THREE.MeshStandardMaterial({name:'brick_red'}));
    truss.name=`${NAME}_lod${lod}_steel`;truss.userData.m01SourceMaterial='steel_painted';body.name=`${NAME}_lod${lod}_courses`;body.userData.m01SourceMaterial='brick_red';node.add(truss,body);
    return {root,file:{lod,file:`lod${lod}.glb`},pieces:[{name:NAME,node,truss,body}]};
  });
  return {parent,kits,world:{revision:0},state:{damage:[],parts:{[NAME]:{visible:true,lod:2}}}};
}
const loader=()=>async()=>({texture:new THREE.Texture(),bitmap:{close(){}}});
async function fixture(quality='high'){
  const f=kitFixture(),owner=new M01BridgeFinishRuntime(f.parent,{quality,loadTexture:loader()}),camera=new THREE.PerspectiveCamera();await owner.ready;owner.sync({kits:f.kits,quality,world:f.world});
  const at=(distance,clock,state=f.state)=>{camera.position.set(-distance,4,0);owner.select({kits:f.kits,state,camera,clock});};
  return {...f,owner,camera,at,piece:lod=>f.kits[lod].pieces[0],card:()=>owner.cards.get(NAME),value:m=>m.userData.m01BridgeFade?.value??1,visible:lod=>f.kits[lod].pieces[0].node.visible};
}
const close=(a,b)=>Math.abs(a-b)<1e-9;

test('bridge material: every mapped bridge material carries the per-mesh dither uniform and the cache key changed', async () => {
  const f=await fixture();
  try{
    const m=f.piece(1).truss.material;assert.ok(m.userData.m01BridgeFade,'mapped material has the fade uniform');assert.equal(m.userData.m01BridgeFade.value,1);assert.match(m.customProgramCacheKey(),/m01-bridge-fade-v1/);
    const fragment=THREE.ShaderLib.physical.fragmentShader,shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:fragment};
    m.onBeforeCompile(shader,null);
    assert.equal(shader.uniforms.uBridgeFade,m.userData.m01BridgeFade);assert.match(shader.fragmentShader,/uniform float uBridgeFade;/);assert.ok(shader.fragmentShader.includes(LOD_FADE_VALUE_GLSL_BODY('uBridgeFade')));
    assert.ok(shader.fragmentShader.indexOf('lodBayer4')<shader.fragmentShader.indexOf('void main'));assert.ok(shader.fragmentShader.indexOf('clipping_planes_fragment')<shader.fragmentShader.indexOf('uBridgeFade<.999'));
    assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);
    const plain=new THREE.MeshStandardMaterial(),value=bridgeFadeDither(plain);assert.equal(plain.userData.m01BridgeFade,value);plain.dispose();
  }finally{f.owner.dispose();}
});

test('detailed LOD 1 -> impostor card: both drawn for 0.3 s of the battle clock, complementary dither, then steady card; pause freezes', async () => {
  const f=await fixture();
  try{
    f.at(600,100);assert.equal(f.owner.diagnostics.fade.started,0,'first frame never fades');assert.equal(f.visible(1),true);assert.equal(f.visible(2),false);assert.equal(f.card()?.root.visible??false,false);
    f.at(900,101);   // 1 -> 2 + card: fade starts
    let d=f.owner.diagnostics.fade;assert.equal(d.started,1);assert.equal(d.active,1);
    assert.equal(f.visible(1),true,'outgoing detailed piece still drawn');assert.equal(f.visible(2),true);assert.equal(f.card().root.visible,true);
    assert.equal(f.piece(2).truss.visible,false,'kit-2 trusses stay replaced by the card');
    assert.equal(f.value(f.piece(1).truss),-1);assert.equal(f.value(f.piece(1).body),-1);assert.equal(f.value(f.piece(2).body),0,'incoming starts at 0');assert.equal(f.value(f.card().side),0);assert.equal(f.value(f.card().top),0);
    f.at(900,101+LOD_DEFAULT_FADE_SECONDS/2);
    assert.ok(close(f.value(f.piece(1).body),-0.5)&&close(f.value(f.piece(2).body),0.5)&&close(f.value(f.card().side),0.5));
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const out=instanceFadeKeeps(f.value(f.piece(1).body),x,y),inn=instanceFadeKeeps(f.value(f.piece(2).body),x,y),card=instanceFadeKeeps(f.value(f.card().side),x,y);assert.notEqual(out,inn,'old/new kit partition every pixel');assert.equal(inn,card,'card and incoming body share the incoming pattern');}
    // Pause: same clock for many frames, nothing moves.
    const before=[f.piece(1).body,f.piece(2).body,f.card().side].map(f.value);for(let i=0;i<200;i++)f.at(900,101+LOD_DEFAULT_FADE_SECONDS/2);assert.deepEqual([f.piece(1).body,f.piece(2).body,f.card().side].map(f.value),before);assert.equal(f.owner.diagnostics.fade.started,1);
    // The per-draw hook writes the material uniform only when it changes.
    const mesh=f.piece(1).body,material=mesh.material,u=material.userData.m01BridgeFade;material.uniformsNeedUpdate=false;mesh.onBeforeRender(null,null,f.camera,mesh.geometry,material,null);assert.ok(close(u.value,-0.5));assert.equal(material.uniformsNeedUpdate,true);material.uniformsNeedUpdate=false;mesh.onBeforeRender(null,null,f.camera,mesh.geometry,material,null);assert.equal(material.uniformsNeedUpdate,false,'unchanged value is not re-uploaded');
    const other=f.piece(2).body;other.onBeforeRender(null,null,f.camera,other.geometry,other.material,null);
    // End of fade.
    f.at(900,101+LOD_DEFAULT_FADE_SECONDS-1e-6);assert.equal(f.owner.diagnostics.fade.active,1);
    f.at(900,101+LOD_DEFAULT_FADE_SECONDS+1e-3);assert.equal(f.owner.diagnostics.fade.active,0);
    assert.equal(f.visible(1),false,'outgoing piece hidden again');assert.equal(f.visible(2),true);assert.equal(f.card().root.visible,true);assert.equal(f.piece(2).truss.visible,false);
    for(const m of [f.piece(1).truss,f.piece(1).body,f.piece(2).body,f.card().side,f.card().top])assert.equal(f.value(m),1,'resting value restored');
    // Back to the detailed piece: card out, kit-1 in.
    f.at(600,110);assert.equal(f.owner.diagnostics.fade.started,2);assert.equal(f.visible(1),true);assert.equal(f.visible(2),true);assert.equal(f.card().root.visible,true);assert.equal(f.value(f.card().side),-1);assert.equal(f.value(f.piece(1).body),0);
    f.at(600,110.5);assert.equal(f.visible(2),false);assert.equal(f.card().root.visible,false);assert.equal(f.value(f.piece(1).body),1);
  }finally{f.owner.dispose();}
});

test('bridge fade snaps: no clock, Low, damaged part, rewound clock, hidden authority; detailed 0 <-> 1 swaps fade too', async () => {
  const f=await fixture();
  try{
    f.at(600,100);f.at(900);assert.equal(f.owner.diagnostics.fade.active,0,'no clock => immediate');assert.equal(f.visible(1),false);assert.equal(f.piece(2).truss.visible,false);assert.equal(f.card().root.visible,true);
    f.at(300,200);assert.equal(f.owner.diagnostics.fade.started,1,'card -> detailed 0 fades once a clock exists');f.at(300,201);assert.equal(f.owner.diagnostics.fade.active,0);f.at(600,202);   // 0 -> 1 detailed swap: fades
    assert.equal(f.owner.diagnostics.fade.started,2);assert.equal(f.visible(0),true);assert.equal(f.visible(1),true);assert.equal(f.value(f.piece(0).body),-1);assert.equal(f.value(f.piece(1).body),0);assert.equal(f.piece(0).truss.visible,true,'detailed trusses are not hidden');
    f.at(600,100);assert.equal(f.owner.diagnostics.fade.active,0,'rewound clock snaps');assert.equal(f.visible(0),false);assert.equal(f.value(f.piece(0).body),1);
    f.at(900,101);assert.equal(f.owner.diagnostics.fade.active,1);
    const damaged={...f.state,damage:[{id:'east_demolition'}]};f.at(900,101.1,damaged);assert.equal(f.owner.diagnostics.fade.active,0,'damage snaps');assert.equal(f.card().root.visible,false,'never an intact far card on a damaged bridge');
    f.at(600,152);f.state.parts[NAME].visible=false;f.at(900,153);assert.equal(f.owner.diagnostics.fade.active,0,'hidden authority snaps');assert.equal([0,1,2].some(l=>f.visible(l)),false);f.state.parts[NAME].visible=true;
    f.at(900,154);f.at(600,155);assert.equal(f.owner.diagnostics.fade.active,1);f.owner.sync({kits:f.kits,quality:'low',world:f.world});f.at(600,155.1);assert.equal(f.owner.diagnostics.fade.active,0,'Low snaps');
    f.at(900,156);assert.equal(f.owner.diagnostics.fade.active,0,'no fade at Low');
  }finally{f.owner.dispose();}
});

test('bridge fade: authority state and renderState parts are never modified; dispose rebinds originals and clears dither values', async () => {
  const f=await fixture(),snapshot=JSON.stringify(f.state);
  try{
    f.at(600,100);f.at(900,101);f.at(900,101.1);assert.equal(JSON.stringify(f.state),snapshot);assert.equal(f.owner.diagnostics.fade.active,1);
    const meshes=[f.piece(1).body,f.piece(2).body,f.card().side];f.owner.dispose();
    for(const m of meshes)assert.equal(m.userData.m01BridgeFade.value,1,'dispose resets dither values');
  }finally{f.owner.dispose();}
});

test('bridge fade: a preset change that reloads the impostor maps never fades to/from a card whose maps are released (no 0x0 texture upload)', async () => {
  // Low -> Medium reloads the optional bridge textures (tier low -> high): the previous maps are disposed and their bitmaps closed. The piece leaves "card" only because the
  // card is not ready any more, so it must snap to the detailed truss; a 0.3 s card -> truss fade would draw the card with the released texture (three.js re-uploads it as a
  // 0x0 sRGB texture: one leaked GL texture per card face, found by the m01-terrain-war-ground and m01-bridge-finish-runtime quality-churn specs).
  const f=await fixture('low');
  try{
    f.at(900,100);assert.equal(f.card().root.visible,true,'steady card at Low');const maps=[f.card().side.material.map,f.card().top.material.map];
    f.owner.sync({kits:f.kits,quality:'medium',world:f.world});
    f.at(900,101);
    assert.equal(f.owner.diagnostics.fade.started,0,'no fade is started by the maps going away');assert.equal(f.owner.diagnostics.fade.active,0);
    assert.equal(f.card().root.visible,false,'the card is not drawn without its maps');assert.equal(f.piece(2).truss.visible,true,'the detailed trusses stand in');
    await f.owner.ready;f.owner.sync({kits:f.kits,quality:'medium',world:f.world});f.at(900,102);
    for(const mesh of [f.card().side,f.card().top])assert.ok(!maps.includes(mesh.material.map)||!f.card().root.visible,'a visible card never carries a released map');
  }finally{f.owner.dispose();}
});
