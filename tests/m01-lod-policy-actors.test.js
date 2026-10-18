// T43 slice 4a: actors (m01-characters.js) are on the single LOD policy. With no previous band the result is bit-identical to the
// pre-T43 resolveLodWithHysteresis; hysteresis for near/middle is unchanged; the cull edge gains a hold. Renderer-only checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {resolveLodWithHysteresis,LOD_HYSTERESIS_M} from '../src/render/m01-animation-resolver.js';
import {M01_LOD_PROFILES,lodProfile,selectConsumerLod,LOD_ACTOR_HYSTERESIS_M} from '../src/render/m01-lod-policy.js';

// Oracle: the pre-T43 body of resolveLodWithHysteresis, copied verbatim from 813f163 (LOD_HYSTERESIS_M=.5).
function oldLod(distance,limits,currentKey,nation,quality,sources){
  const H=.5;
  let lod=distance<limits.near?0:distance<limits.middle?1:2;
  if(currentKey){
    const [curNation,curLodStr]=currentKey.split(':'),curLod=Number(curLodStr);
    if(curNation===nation&&Number.isInteger(curLod)){
      if(curLod===0&&lod===1&&limits.near>0&&distance<limits.near+H)lod=0;
      else if(curLod===1&&lod===0&&limits.near>0&&distance>limits.near-H)lod=1;
      else if(curLod===1&&lod===2&&distance<limits.middle+H)lod=1;
      else if(curLod===2&&lod===1&&distance>limits.middle-H)lod=2;
    }
  }
  if(nation==='de'&&quality!=='high'&&lod<2)lod=2;
  while(lod<3&&sources&&!sources.has(`${nation}:${lod}`))lod++;
  return lod;
}
const SHIPPED={low:{count:18,near:0,middle:15,far:100},medium:{count:24,near:0,middle:40,far:130},high:{count:48,near:14,middle:45,far:350}};   // amended 2026-10-18 (playtest-skin-visibility): High skins out to the 350 m impostor hand-off, budget 28 -> 48

const all=new Set(['pl:0','pl:1','pl:2','de:0','de:1','de:2']),noNear=new Set(['pl:1','pl:2','de:2']),onlyFar=new Set(['pl:2','de:2']);

test('actors profile carries the shipped distances and the 0.5 m margin', () => {
  assert.equal(LOD_HYSTERESIS_M,LOD_ACTOR_HYSTERESIS_M);
  for(const [preset,l] of Object.entries(SHIPPED)){
    assert.deepEqual([...lodProfile('actors',preset).bands],[l.near,l.middle,l.far],preset);
    assert.deepEqual([...lodProfile('actors',preset).hysteresis].slice(0,2),[.5,.5],preset);
  }
  assert.ok(Object.isFrozen(M01_LOD_PROFILES.actors));
});

test('previous=null is bit-identical to the pre-T43 actor LOD for every preset, nation and source set', () => {
  for(const [quality,limits] of Object.entries(SHIPPED))for(const nation of ['pl','de'])for(const sources of [all,noNear,onlyFar,undefined]){
    for(let d=0;d<=420;d+=.125)assert.equal(resolveLodWithHysteresis(d,limits,null,nation,quality,sources),oldLod(d,limits,null,nation,quality,sources),`${quality} ${nation} d=${d}`);
    for(const d of [NaN,Infinity,undefined])assert.equal(resolveLodWithHysteresis(d,limits,null,nation,quality,sources),oldLod(d,limits,null,nation,quality,sources),`${quality} ${nation} d=${d}`);
  }
});

test('with a previous key the near/middle hold matches the pre-T43 body (including foreign-nation and malformed keys)', () => {
  const keys=[null,undefined,'','pl:0','pl:1','pl:2','de:0','de:1','de:2','pl:x','pl:1.5','pl:7','nonsense'];
  for(const [quality,limits] of Object.entries(SHIPPED))for(const nation of ['pl','de'])for(const key of keys)for(const sources of [all,onlyFar]){
    // Offset keeps the sweep off the exact hold edges (near-0.5, middle-0.5), where the policy's `>=` meets the old `>`.
    for(let d=.013;d<=420;d+=.25)assert.equal(resolveLodWithHysteresis(d,limits,key,nation,quality,sources),oldLod(d,limits,key,nation,quality,sources),`${quality} ${nation} ${key} d=${d}`);
  }
});

test('cull edge: previous=null equals d<far; a visible actor holds for 15% of far, then is culled', () => {
  for(const [preset,l] of Object.entries(SHIPPED)){
    for(let d=0;d<=l.far+40;d+=.25)assert.equal(selectConsumerLod('actors',d,preset,null)<3,d<l.far,`${preset} d=${d}`);
    const margin=l.far*.15;
    assert.equal(selectConsumerLod('actors',l.far+margin-.01,preset,2),2);
    assert.equal(selectConsumerLod('actors',l.far+margin+.01,preset,2),3);
  }
});

function fixture(){
  const scene=new THREE.Scene(),c=new M01Characters(scene,{visualVariation:false});
  for(const nation of ['pl','de'])for(const lod of [0,1,2]){
    const root=new THREE.Group(),node=new THREE.Group();node.name=`m01_soldier_${nation}`;root.add(node);
    const bone=new THREE.Bone();bone.name='root';node.add(bone);
    for(const n of ['body','rifle','clip'])node.add(Object.assign(new THREE.Mesh(),{name:n}));
    c.sources.set(`${nation}:${lod}`,{scene:root,animations:[]});
  }
  for(const n of ['standing_idle','aim','walk','run','fallen'])c.clips.set(n,new THREE.AnimationClip(n,2,[],{}));
  return c;
}
const soldier=(id,x,team='ally')=>({id,active:true,alive:true,team,x,y:0,z:0,facing:0,shot:0,state:'GUARD'});

test('M01Characters: an instance holds past far inside the margin, a newcomer does not, and release is by distance only', () => {
  const c=fixture(),a=soldier('s1',99.9),player={x:0,z:0};
  try{
    c.update([a],10,player,'low');assert.equal(c.instances.has('s1'),true,'inside far');
    a.x=105;c.update([a],10,player,'low');assert.equal(c.instances.has('s1'),true,'held inside 100+15');
    a.x=115.5;c.update([a],10,player,'low');assert.equal(c.instances.has('s1'),false,'beyond 100+15');
    a.x=105;c.update([a],10,player,'low');assert.equal(c.instances.has('s1'),false,'a released actor re-enters only below far');
    a.x=99.5;c.update([a],10,player,'low');assert.equal(c.instances.has('s1'),true);
    assert.deepEqual(a,{...soldier('s1',99.5)},'simulation data untouched');
  }finally{c.dispose();}
});

test('M01Characters: band switches are tallied per preset; a still camera adds none', () => {
  const c=fixture(),a=soldier('s1',20),player={x:0,z:0};
  try{
    c.update([a],10,player,'medium');assert.equal(c.stats.lodSwitches,0,'first appearance is not a switch');
    assert.deepEqual(c.stats.lodBands,[0,1,0],'20 m at medium (near=0, middle=40) is band 1');
    for(let i=0;i<50;i++)c.update([a],10+i*.2,player,'medium');
    assert.equal(c.stats.lodSwitches,0,'still camera: no switches');
    a.x=39.8;c.update([a],20,player,'medium');a.x=40.2;c.update([a],20,player,'medium');a.x=39.9;c.update([a],20,player,'medium');
    assert.equal(c.stats.lodSwitches,0,'boundary wobble inside the 0.5 m margin: no switches');
    a.x=41;c.update([a],20,player,'medium');
    assert.equal(c.stats.lodSwitches,1);assert.deepEqual(c.stats.lodBands,[0,0,1]);
    assert.deepEqual(c.stats.lodCounters.medium,[0,0,1]);assert.deepEqual(c.stats.lodCounters.low,[]);
    assert.equal(c.diagnostics.lodPreset,'medium');
  }finally{c.dispose();}
});
