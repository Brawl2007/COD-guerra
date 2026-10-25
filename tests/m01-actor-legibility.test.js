import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Characters,ACTOR_BUDGET} from '../src/render/m01-characters.js';
import {lodProfile,selectConsumerLod} from '../src/render/m01-lod-policy.js';
import {HANDOFF_M,handoff} from '../src/render/m01-impostors.js';
import {RIM_NEAR_M,RIM_FULL_M,RIM_FADE_FROM_M,RIM_FADE_TO_M,RIM_FILL,FILL_NEAR_M,FILL_FULL_M,RIM_STRENGTH,fillDistanceFactor,RIM_PROGRAM_KEY,rimDistanceFactor,rimColor,rimPeakLuminance,createRimState,setRimFog,injectRim,patchRimMaterial} from '../src/render/m01-actor-legibility.js';
import {nodeCharacterAssets} from '../tools/verification/m01-soldier-variation-assets.mjs';
import {M01Simulation} from '../src/game/m01-simulation.js';

// Playtest 2026-10-18: soldiers read as box proxies between 160 m and the impostor hand-off, and German bodies melted into terrain.
const assets=await nodeCharacterAssets();
function characters(){const c=new M01Characters(new THREE.Scene(),{visualVariation:true});c.sources=assets.sources;c.clips=assets.clips;return c;}
const rifleman=(team,id,x)=>({...new M01Simulation().actors.find(a=>a.team===team&&!a.civilian&&a.role==='RIFLEMAN'),id,active:true,alive:true,state:'GUARD',crouched:false,target:null,shot:0,firedAt:-1e9,x,y:0,z:0,facing:0});

test('High skins every soldier up to the impostor hand-off, with no box-proxy gap and no double draw',()=>{
  assert.equal(lodProfile('actors','high').bands.at(-1),HANDOFF_M,'cull edge == impostor hand-off');
  assert.equal(ACTOR_BUDGET.high,48);assert.deepEqual([ACTOR_BUDGET.low,ACTOR_BUDGET.medium],[18,24],'Low/Medium budgets untouched');
  assert.deepEqual([...lodProfile('actors','low').bands],[0,15,100]);assert.deepEqual([...lodProfile('actors','medium').bands],[0,40,130]);
  for(const d of [100,159,161,200,300,349])assert.ok(selectConsumerLod('actors',d,'high',null)<3,`skinned at ${d} m`);
  assert.equal(selectConsumerLod('actors',HANDOFF_M+1,'high',null),3);
  const a=rifleman('enemy','de_x',0);
  assert.equal(handoff(a,HANDOFF_M-.01,{skinned:false}),'none');assert.equal(handoff(a,HANDOFF_M,{skinned:false}),'impostor');
});

test('High draws enemy and ally soldiers as skinned LOD bodies at 200 m and 300 m, and hands over to impostors beyond',()=>{
  const c=characters();
  try{
    const actors=[rifleman('enemy','de_a',0),rifleman('enemy','de_b',0),rifleman('ally','pl_a',0),rifleman('ally','pl_b',0)];
    actors[0].x=200;actors[1].x=300;actors[2].x=-200;actors[3].x=-300;
    const sel=c.update(actors,12,{x:0,z:0},'high');
    assert.deepEqual([...sel].sort(),['de_a','de_b','pl_a','pl_b']);
    for(const v of c.stats.actors)assert.equal(v.lod,2,`${v.id} uses the far skinned LOD`);
    assert.equal(c.instances.size,4);
    for(const v of c.instances.values())assert.ok(v.meshes.some(m=>m.visible&&m.isSkinnedMesh),'a real body mesh, not a proxy');
    actors[0].x=410;   // past 350 m plus the 15% hold (52 m)
    const later=c.update(actors,12.05,{x:0,z:0},'high');assert.ok(!later.has('de_a'),'beyond the hand-off the impostor takes over');
  }finally{c.dispose();}
});

test('the High budget covers a combat crowd of 48 and still sorts by distance',()=>{
  const c=characters();
  try{
    const crowd=Array.from({length:60},(_,i)=>rifleman(i%2?'enemy':'ally',`crowd_${i}`,10+i*5));
    const sel=c.update(crowd,12,{x:0,z:0},'high');
    assert.equal(sel.size,48);assert.ok(sel.has('crowd_0')&&sel.has('crowd_47')&&!sel.has('crowd_48'));
  }finally{c.dispose();}
});

test('rim distance factor: none near, full at mid range, fades out where a figure is a few pixels tall; the aerial fill grows to a plateau',()=>{
  assert.equal(rimDistanceFactor(0),0);assert.equal(rimDistanceFactor(RIM_NEAR_M),0);assert.equal(rimDistanceFactor(RIM_FULL_M),1);assert.equal(rimDistanceFactor(RIM_FADE_FROM_M),1);assert.ok(RIM_FULL_M<=RIM_FADE_FROM_M);
  assert.equal(rimDistanceFactor(RIM_FADE_TO_M),0);assert.equal(rimDistanceFactor(1e6),0);
  let prev=0;for(let d=0;d<=RIM_FULL_M;d+=2){const k=rimDistanceFactor(d);assert.ok(k>=prev&&k>=0&&k<=1);prev=k;}
  prev=1;for(let d=RIM_FADE_FROM_M;d<=RIM_FADE_TO_M;d+=2){const k=rimDistanceFactor(d);assert.ok(k<=prev&&k>=0);prev=k;}
  assert.equal(fillDistanceFactor(FILL_NEAR_M),0);assert.equal(fillDistanceFactor(FILL_FULL_M),1);assert.equal(fillDistanceFactor(1e6),1);
  assert.ok(RIM_FILL>0&&RIM_FILL<=.5,'the fill stays a fraction of albedo x haze');
  assert.equal(RIM_STRENGTH.pl,0,'allies carry no rim');assert.ok(RIM_STRENGTH.de>0);
});

test('rim colour follows the fog colour and stays a thin edge light, never a glow',()=>{
  const fog=[.63,.65,.65];
  assert.deepEqual(rimColor(fog,5),[0,0,0]);
  const far=rimColor(fog,RIM_FULL_M);assert.ok(far.every((v,i)=>Math.abs(v-fog[i]*RIM_STRENGTH.de)<1e-12));
  assert.ok(rimPeakLuminance(fog)<.4,'peak added luminance is bounded');
  assert.ok(rimPeakLuminance([.05,.06,.1])<.06,'blue hour: the rim darkens with the fog, so it never glows at night');
  assert.deepEqual(rimColor(fog,RIM_FULL_M,0),[0,0,0]);assert.deepEqual(rimColor(fog,1000),[0,0,0],'no rim on a distant speck');
});

test('the rim is injected into the real three.js standard and physical fragment shaders, exactly once',()=>{
  for(const lib of [THREE.ShaderLib.standard,THREE.ShaderLib.physical]){
    const state=createRimState(),shader={fragmentShader:lib.fragmentShader,uniforms:{}};
    assert.equal(injectRim(shader,state),true);
    assert.equal(shader.fragmentShader.split('uniform vec3 uRimTint;').length-1,1);
    assert.equal(shader.fragmentShader.split('outgoingLight+=uRimTint*rimF*rimK;').length-1,1);
    assert.equal(shader.fragmentShader.split('outgoingLight+=diffuseColor.rgb*uRimTint*').length-1,1,'one aerial fill');
    assert.ok(shader.fragmentShader.indexOf('outgoingLight+=uRimTint')<shader.fragmentShader.indexOf('#include <opaque_fragment>'),'rim lands before the final colour is written');
    assert.equal(shader.uniforms.uRimTint,state.tint);assert.equal(shader.uniforms.uRimStrength,state.strength);
  }
  const untouched={fragmentShader:'void main(){}',uniforms:{}};
  assert.equal(injectRim(untouched,createRimState()),false);assert.equal(untouched.fragmentShader,'void main(){}');assert.deepEqual(untouched.uniforms,{});
});

test('only German body materials are patched; allies, weapons and the shared source materials are not',()=>{
  const c=characters();
  try{
    c.update([rifleman('enemy','de_a',30),rifleman('ally','pl_a',-30)],12,{x:0,z:0},'high');
    const patched={de:0,pl:0};
    for(const [id,v] of c.instances){
      const nation=id.startsWith('de_')?'de':'pl';
      for(const m of v.meshes)if(m.material?.customProgramCacheKey?.()===RIM_PROGRAM_KEY)patched[nation]++;
    }
    assert.ok(patched.de>0,'German body/gear/helmet/head materials carry the rim');assert.equal(patched.pl,0);
    for(const [key,src] of assets.sources)src.scene.traverse(n=>{if(n.isMesh)assert.notEqual(n.material.customProgramCacheKey?.(),RIM_PROGRAM_KEY,`source ${key} stays untouched`);});
    const fog=[.4,.5,.6];c.setRimFog(fog);assert.deepEqual(c.visuals.rim.tint.value.toArray(),fog);
  }finally{c.dispose();}
});

test('patchRimMaterial: one shared program key and compile hook, uniforms shared through the state object',()=>{
  const state=createRimState(),a=patchRimMaterial(new THREE.MeshStandardMaterial(),state),b=patchRimMaterial(new THREE.MeshStandardMaterial(),state);
  assert.equal(a.customProgramCacheKey(),b.customProgramCacheKey());
  const shader={fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};a.onBeforeCompile(shader);
  setRimFog(state,[.1,.2,.3]);assert.deepEqual(shader.uniforms.uRimTint.value.toArray().map(v=>+v.toFixed(3)),[.1,.2,.3]);
  a.dispose();b.dispose();
});
