import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01LodFade,createLodDitherMaterial,LOD_DITHER_GLSL_DECL,LOD_DITHER_GLSL_BODY} from '../src/render/m01-lod-dither.js';
import {M01Locomotive} from '../src/render/m01-locomotive.js';
import {M01Panzerzug} from '../src/render/m01-panzerzug.js';
import {M01FieldStructures} from '../src/render/m01-field-structures.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {LOD_DEFAULT_FADE_SECONDS} from '../src/render/m01-lod-policy.js';

// Synthetic LOD node: one mesh with a material shared with its clones (as scene.clone(true) shares it with the asset cache).
const sharedMaterials=[];
function node(name){const g=new THREE.Group();g.name=name;const m=new THREE.MeshStandardMaterial({color:'#889'});sharedMaterials.push(m);g.add(new THREE.Mesh(new THREE.BoxGeometry(),m));return g;}
const meshOf=n=>{let found=null;n.traverse(o=>{if(o.isMesh)found=o;});return found;};

// JS port of the GLSL threshold, used to prove the two roles partition every pixel.
const v2=(x,y)=>2*x+3*y-4*x*y,bayer4=(px,py)=>{const ax=px%2,ay=py%2,bx=Math.floor(px/2)%2,by=Math.floor(py/2)%2;return (4*v2(ax,ay)+v2(bx,by)+0.5)/16;};

test('dither material: screen-door test only, no blending, depthWrite kept, source untouched', () => {
  const source=new THREE.MeshStandardMaterial({color:'#abc'}),progress={value:0.5};
  const incoming=createLodDitherMaterial(source,progress,false),outgoing=createLodDitherMaterial(source,progress,true);
  for(const m of [incoming,outgoing]){assert.notEqual(m,source);assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);assert.equal(m.alphaTest,0);assert.equal(m.color.getHexString(),'aabbcc');assert.match(m.customProgramCacheKey(),/m01-lod-dither/);}
  assert.equal(source.onBeforeCompile.toString(),new THREE.MeshStandardMaterial().onBeforeCompile.toString());
  const shader={uniforms:{},fragmentShader:'#include <common>\nvoid main() {\n  #include <clipping_planes_fragment>\n  gl_FragColor=vec4(1.0);\n}\n'};
  incoming.onBeforeCompile(shader,null);
  assert.equal(shader.uniforms.uLodFadeProgress,progress,'progress uniform is the shared object');assert.equal(shader.uniforms.uLodFadeOut.value,0);
  assert.ok(shader.fragmentShader.includes(LOD_DITHER_GLSL_DECL)&&shader.fragmentShader.includes(LOD_DITHER_GLSL_BODY));
  assert.ok(shader.fragmentShader.indexOf('lodBayer4')<shader.fragmentShader.indexOf('void main'),'helper declared before main');
  assert.ok(shader.fragmentShader.indexOf('clipping_planes_fragment')<shader.fragmentShader.indexOf('discard'));
  assert.doesNotMatch(shader.fragmentShader,/gl_FragColor\.a|alpha/i);
  const out={uniforms:{},fragmentShader:shader.fragmentShader.split('\n')[0]+'\nvoid main(){#include <clipping_planes_fragment>}'};outgoing.onBeforeCompile(out,null);assert.equal(out.uniforms.uLodFadeOut.value,1);
  for(const m of [incoming,outgoing,source])m.dispose();
});

test('dither thresholds: incoming and outgoing partition every pixel exactly once at any progress', () => {
  const seen=new Set();for(let y=0;y<4;y++)for(let x=0;x<4;x++)seen.add(bayer4(x,y));assert.equal(seen.size,16,'16 distinct thresholds');
  for(let step=0;step<=40;step++){const p=step/40;let incomingKept=0;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const t=bayer4(x,y),keepIn=t<p,keepOut=t>=p;assert.notEqual(keepIn,keepOut);if(keepIn)incomingKept++;}
    assert.ok(Math.abs(incomingKept/64-p)<=1/16+1e-9,`coverage tracks progress at ${p}`);}
});

function lodFixture(levels=[0,1,2]){const fade=new M01LodFade(),nodes=new Map();for(const l of levels){const n=node('lod'+l);nodes.set(l,n);fade.register(l,n);}return {fade,nodes};}
const visibleLevels=(fade,levels=[0,1,2])=>levels.filter(l=>fade.shows(l));

test('controller: fade starts on switch, both levels visible, ends exactly after the clock duration, originals restored', () => {
  const {fade,nodes}=lodFixture(),m0=meshOf(nodes.get(0)),m1=meshOf(nodes.get(1)),o0=m0.material,o1=m1.material;
  assert.equal(fade.set(2,100,true),true);assert.equal(fade.switches,0,'first level is not a switch');assert.equal(fade.active,false);assert.deepEqual(visibleLevels(fade),[2]);
  assert.equal(fade.set(2,100.5,true),false);
  assert.equal(fade.set(1,101,true),true);assert.equal(fade.switches,1);assert.equal(fade.active,true);assert.equal(fade.fades,1);
  assert.deepEqual(visibleLevels(fade),[1,2],'outgoing and incoming both drawn');
  assert.equal(fade.progress.value,0);assert.notEqual(meshOf(nodes.get(2)).material,o1);assert.equal(meshOf(nodes.get(2)).material.name.endsWith('lodfade-out'),true);assert.equal(m1.material.name.endsWith('lodfade-in'),true);
  assert.equal(m1.material.transparent,false);assert.equal(m1.material.depthWrite,true);
  fade.set(1,101+LOD_DEFAULT_FADE_SECONDS/2,true);assert.ok(Math.abs(fade.progress.value-0.5)<1e-9);assert.equal(fade.active,true);assert.deepEqual(visibleLevels(fade),[1,2]);
  fade.set(1,101+LOD_DEFAULT_FADE_SECONDS-1e-6,true);assert.equal(fade.active,true,'not finished before 0.3 s');
  assert.equal(fade.set(1,101+LOD_DEFAULT_FADE_SECONDS+1e-9,true),true);assert.equal(fade.active,false);assert.deepEqual(visibleLevels(fade),[1]);
  assert.equal(m1.material,o1,'resting object uses its original material');assert.equal(fade.fades,1);assert.equal(fade.snaps,0);
  assert.equal(m0.material,o0);
  fade.dispose();
});

test('controller: disabled (low preset), missing asset, no clock and backwards clock all snap', () => {
  const {fade,nodes}=lodFixture([0,2]);fade.set(2,10,true);
  fade.set(0,10.1,false);assert.equal(fade.active,false);assert.deepEqual(visibleLevels(fade),[0]);assert.equal(fade.fades,0);assert.equal(fade.snaps,1);assert.equal(meshOf(nodes.get(0)).material.name.includes('lodfade'),false,'no dither material on low');
  fade.set(1,11,true);assert.equal(fade.active,false,'level 1 never loaded => no fade to it');assert.equal(fade.snaps,2);
  fade.set(2,12,true);assert.equal(fade.active,false,'level 1 not loaded => no fade from it');assert.equal(fade.snaps,3);
  fade.set(0,null,true);assert.equal(fade.active,false,'no clock => snap');
  fade.set(2,50,true);assert.equal(fade.active,true);fade.set(2,50.1,true);assert.equal(fade.active,true);
  assert.equal(fade.set(2,3,true),true,'clock rewound');assert.equal(fade.active,false);assert.deepEqual(visibleLevels(fade),[2]);
  fade.set(0,60,true);assert.equal(fade.active,true);fade.set(0,60.1,false);assert.equal(fade.active,false,'preset dropped to low mid-fade');
  fade.set(2,70,true);assert.equal(fade.active,true);fade.set(0,70.1,true);assert.equal(fade.active,true,'retarget restarts');assert.deepEqual(visibleLevels(fade),[0,2],'previous outgoing is dropped, only the level before the retarget fades out');
  fade.dispose();
});

test('controller: dispose rebinds originals, disposes only its clones and is idempotent', () => {
  const {fade,nodes}=lodFixture();fade.set(2,1,true);fade.set(0,2,true);
  const source=[...fade.variants.keys()],counts=new Map();let variantDisposals=0;
  for(const [mat,v] of fade.variants){mat.addEventListener('dispose',()=>counts.set(mat,(counts.get(mat)??0)+1));for(const x of [v.in,v.out])x.addEventListener('dispose',()=>variantDisposals++);}
  assert.equal(fade.active,true);fade.dispose();fade.dispose();
  assert.equal(variantDisposals,2*source.length);assert.equal(counts.size,0,'source materials belong to the asset cache, never disposed here');
  for(const [l,n] of nodes)assert.ok(source.includes(meshOf(n).material),'level '+l+' rebound to original');
  assert.equal(fade.set(1,5,true),false);
});

test('resting controller does no fade work: state object is untouched for thousands of calls', () => {
  const {fade}=lodFixture();fade.set(1,0,true);fade.set(0,1,true);fade.set(0,1.4,true);const state=fade.state;assert.equal(fade.active,false);
  for(let i=0;i<5000;i++)assert.equal(fade.set(0,2+i/60,true),false);assert.equal(fade.state,state);
  fade.dispose();
});

function trainFixture(Cls,metal=new THREE.MeshStandardMaterial()){
  const parent=new THREE.Group(),box=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(1,1,1,12),dark=new THREE.MeshStandardMaterial();
  const assets={load:async key=>({scene:node(key)})};
  const t=Cls===M01Locomotive?new Cls(parent,assets,box,cylinder,dark,metal):new Cls(parent,assets,box,cylinder,metal);
  return {t,parent,metal,close(){t.dispose();box.dispose();cylinder.dispose();dark.dispose();metal.dispose();}};
}
const trainCases=[['locomotive',M01Locomotive,1075,-2.5],['panzerzug',M01Panzerzug,1119,2.5]];

for(const [name,Cls,x,z] of trainCases){
  test(`${name}: LOD switch cross-fades for 0.3 s of the battle clock; both models visible; counters and diagnostics`, async () => {
    const f=trainFixture(Cls);await f.t.load();const t=f.t,clock0=17600;   // after arrival: stationary at the anchor
    assert.equal(t.diagnostics.lodSwitches,0,"asset arrival order is not counted as camera LOD switches");
    const at=(d,c)=>t.update({x:x-d,z},c,true);
    at(20,clock0);   // initial pick 2 -> 0 starts a fade (first update, 3 assets loaded)
    assert.equal(t.diagnostics.fading,true);
    at(20,clock0+0.31);assert.equal(t.diagnostics.fading,false);assert.equal(t.selectedLOD,0);const base=t.diagnostics.lodSwitches,counted=t.diagnostics.lodCounters.medium[1]??0;
    at(100,clock0+1);
    let d=t.diagnostics;assert.equal(d.lodSwitches,base+1);assert.equal(d.fading,true);assert.equal(d.lod,1);assert.equal(d.lodLevel,1);
    assert.deepEqual([...t.models].filter(([,m])=>m.visible).map(([l])=>l),[0,1],'old and new LOD both drawn while fading');assert.equal(t.proxy.visible,false);
    at(100,clock0+1.15);d=t.diagnostics;assert.equal(d.fading,true);assert.ok(Math.abs(d.lodFadeProgress-0.5)<1e-6);
    at(100,clock0+1.29);assert.equal(t.diagnostics.fading,true);
    at(100,clock0+1.31);d=t.diagnostics;assert.equal(d.fading,false);assert.deepEqual([...t.models].filter(([,m])=>m.visible).map(([l])=>l),[1]);
    assert.equal(meshOf(t.models.get(1)).material.name.includes('lodfade'),false);
    assert.equal(d.lodCounters.medium[1]??0,counted+1,'one more entry into band 1 for the medium preset');assert.deepEqual(d.lodCounters.low,[]);
    // Clock rewound (restore): snap, no leftover second model.
    at(200,clock0+2);assert.equal(t.diagnostics.fading,true);at(200,clock0-5);d=t.diagnostics;assert.equal(d.fading,false);assert.equal([...t.models.values()].filter(m=>m.visible).length,1);
    f.close();
  });

  test(`${name}: low preset swaps instantly with no dither material (shared m01LowDetail uniform or explicit quality)`, async () => {
    const metal=new THREE.MeshStandardMaterial();metal.userData.m01LowDetail={value:1};
    const f=trainFixture(Cls,metal);await f.t.load();const t=f.t;
    t.update({x:x-20,z},17600,true);assert.equal(t.diagnostics.fading,false);t.update({x:x-100,z},17601,true);
    const d=t.diagnostics;assert.equal(d.fading,false);assert.equal(d.lodFades,0);assert.equal(d.lodPreset,'low');assert.equal([...t.models.values()].filter(m=>m.visible).length,1);assert.equal(d.lodCounters.low.length>0,true);
    metal.userData.m01LowDetail.value=0;t.update({x:x-20,z},17602,true);assert.equal(t.diagnostics.fading,true,'medium fades again');
    t.update({x:x-100,z},17603,true,'low');assert.equal(t.diagnostics.fading,false,'explicit quality argument wins');
    f.close();
  });

  test(`${name}: still camera for 10 s at 60 Hz with jitter never switches LOD or fades; no clock => instant`, async () => {
    const f=trainFixture(Cls);await f.t.load();const t=f.t;t.update({x:x-60,z},17700,true);t.update({x:x-60,z},17701,true);
    let seed=12345;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const settled=t.diagnostics.lodSwitches,state=t.lodFade.state;assert.equal(t.diagnostics.fading,false);
    for(let i=0;i<600;i++){t.update({x:x-60+(rnd()-.5)*2,z:z+(rnd()-.5)},17702+i/60+(rnd()-.5)*1e-3,true);assert.equal(t.diagnostics.fading,false);}
    assert.equal(t.diagnostics.lodSwitches,settled);assert.equal(t.lodFade.state,state);f.close();
    const g=trainFixture(Cls);await g.t.load();g.t.update({x:x-20,z});g.t.update({x:x-100,z});assert.equal(g.t.diagnostics.fading,false);assert.equal([...g.t.models.values()].filter(m=>m.visible).length,1);g.close();
  });

  test(`${name}: dispose rebinds originals and frees only the dither clones`, async () => {
    const f=trainFixture(Cls);await f.t.load();f.t.update({x:x-20,z},17600,true);assert.equal(f.t.diagnostics.fading,true);
    const originals=[...f.t.lodFade.variants.keys()];let disposed=0;for(const v of f.t.lodFade.variants.values())for(const m of [v.in,v.out])m.addEventListener('dispose',()=>disposed++);
    f.t.dispose();assert.equal(disposed,originals.length*2);for(const m of originals)assert.equal(m.name.includes('lodfade'),false);f.close();
  });
}

function fieldFixture(clock){
  const parent=new THREE.Group(),kit=new M01FieldStructures(parent,{load:async()=>({scene:node('a')}),clock}),world=new TczewWorld();return {kit,parent,world};
}
const visibleModels=r=>r.models.filter(m=>m.node.visible);

test('field structures: LOD switch dithers both levels for 0.3 s of the frame clock; low and preset change swap instantly', async () => {
  let t=500;const {kit,world}=fieldFixture(()=>t);await kit.load();
  try{
    const r=kit.records[0],x=r.root.position.x,z=r.root.position.z,near=d=>({x:x+d,z});
    kit.sync(world,'high',near(20));assert.equal(r.lod,0);assert.equal(visibleModels(r).length,1);assert.equal(kit.diagnostics.fading,false);const switches0=kit.diagnostics.lodSwitches;
    t=501;kit.sync(world,'high',near(120));   // 90..? band 1 for high
    let d=kit.diagnostics;assert.equal(r.lod,1);assert.equal(d.fading,true);assert.ok(d.lodSwitches>=switches0+1);assert.equal(d.structures[0].fading,true);assert.equal(d.structures[0].lodSwitches,1);
    assert.equal(visibleModels(r).length,2,'both LODs of the active variant are drawn');assert.deepEqual(visibleModels(r).map(m=>m.file.lod).sort(),[0,1]);
    const rev=kit.revision;t=501.15;kit.sync(world,'high',near(120));assert.equal(kit.diagnostics.fading,true);assert.equal(kit.revision,rev,'no revision churn mid-fade');
    t=501.31;kit.sync(world,'high',near(120));d=kit.diagnostics;assert.equal(d.fading,false);assert.equal(visibleModels(r).length,1);assert.ok(kit.revision>rev,'fade end invalidates a retained frame');
    assert.equal(d.lodCounters.high.reduce((n,v)=>n+(v??0),0),d.lodSwitches,'every switch tallied under the preset it happened in');assert.ok(d.lodCounters.high[1]>=1);
    // No change while still for 10 s at 60 Hz with jitter around the boundary.
    const sw=d.lodSwitches;for(let i=0;i<600;i++){t=510+i/60;kit.sync(world,'high',near(120+Math.sin(i*1.7)*2));assert.equal(kit.diagnostics.fading,false);}
    assert.equal(kit.diagnostics.lodSwitches,sw);
    // Preset change at the same spot is a snap.
    t=520;kit.sync(world,'medium',near(120));assert.equal(kit.diagnostics.fading,false);assert.equal(visibleModels(r).length,1);
    // Low: instant swap, zero fades.
    const fades=kit.diagnostics.lodFades;t=530;kit.sync(world,'low',near(5));t=531;kit.sync(world,'low',near(150));assert.equal(kit.diagnostics.fading,false);assert.equal(visibleModels(r).length,1);assert.equal(kit.diagnostics.lodFades,fades);
    // Clock rewind mid-fade snaps.
    t=540;kit.sync(world,'medium',near(10));assert.equal(kit.diagnostics.fading,false,'preset change snaps');
    t=542;kit.sync(world,'medium',near(70));assert.equal(kit.diagnostics.fading,true);t=1;kit.sync(world,'medium',near(70));assert.equal(kit.diagnostics.fading,false);assert.equal(visibleModels(r).length,1);
    // Explicit clock argument wins over the injected source.
    t=9999;kit.sync(world,'medium',near(10),600);kit.sync(world,'medium',near(100),601);assert.equal(kit.diagnostics.fading,true);kit.sync(world,'medium',near(100),601.31);assert.equal(kit.diagnostics.fading,false);
  }finally{kit.dispose();}
});

test('field structures: default clock is null in node (instant swap), dispose frees dither clones before the source materials', async () => {
  const {kit,world}=fieldFixture(undefined);await kit.load();const r=kit.records[0],x=r.root.position.x,z=r.root.position.z;
  try{
    kit.sync(world,'high',{x:x+20,z});kit.sync(world,'high',{x:x+120,z});assert.equal(kit.diagnostics.fading,false);assert.equal(visibleModels(r).length,1);
    let fadeClones=0;for(const rec of kit.records)for(const v of rec.fade.variants.values())for(const m of [v.in,v.out])m.addEventListener('dispose',()=>fadeClones++);
    const expected=kit.records.reduce((n,rec)=>n+rec.fade.variants.size*2,0);kit.dispose();assert.equal(fadeClones,expected);assert.ok(expected>0);
  }finally{kit.dispose();}
});
