import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {resolveLodWithHysteresis} from '../src/render/m01-animation-resolver.js';
import {lodProfile} from '../src/render/m01-lod-policy.js';
import {nodeCharacterAssets} from '../tools/verification/m01-soldier-variation-assets.mjs';
import {M01Simulation} from '../src/game/m01-simulation.js';

// Playtest 2026-10-18 follow-up. Hypothesis: while (or if) a far-LOD GLB is missing, soldiers fall to LOD 3 = procedural box.
// Reproduced in the browser by aborting m01_soldier_*_lod2.glb: near soldiers stay dressed, every soldier beyond 45 m became a box.
const limits=(p)=>{const [near,middle,far]=lodProfile('actors',p).bands;return {count:48,near,middle,far};};
const set=(...k)=>new Set(k);

test('resolveLodWithHysteresis: a missing far LOD no longer drops a soldier to the box (LOD 3); the nearest loaded dressed LOD is used',()=>{
  const L=limits('high');
  for(const nation of ['pl','de']){
    const s=k=>set(...k.map(i=>`${nation}:${i}`));
    // before the fix these all returned 3 (box)
    assert.equal(resolveLodWithHysteresis(100,L,null,nation,'high',s([0,1])),1,'LOD2 missing -> LOD1');
    assert.equal(resolveLodWithHysteresis(100,L,null,nation,'high',s([0])),0,'only LOD0 loaded -> LOD0');
    assert.equal(resolveLodWithHysteresis(30,L,null,nation,'high',s([0])),0,'LOD1 and LOD2 missing -> LOD0');
    assert.equal(resolveLodWithHysteresis(300,L,`${nation}:2`,nation,'high',s([1])),1);
    // unchanged: the wanted band, a farther band when the wanted one is missing, and 3 only when nothing is loaded
    assert.equal(resolveLodWithHysteresis(100,L,null,nation,'high',s([0,1,2])),2);
    assert.equal(resolveLodWithHysteresis(5,L,null,nation,'high',s([1,2])),1);
    assert.equal(resolveLodWithHysteresis(5,L,null,nation,'high',s([2])),2);
    assert.equal(resolveLodWithHysteresis(5,L,null,nation,'high',new Set()),3,'nothing loaded: the caller keeps the procedural fallback');
    assert.equal(resolveLodWithHysteresis(5,L,null,nation,'high',set(`${nation==='pl'?'de':'pl'}:2`)),3,'the other nation is not a stand-in');
  }
  assert.equal(resolveLodWithHysteresis(100,limits('low'),null,'de','low',set('de:0','de:1')),1);
});

const assets=await nodeCharacterAssets();
const rifleman=(team,id,x)=>({...new M01Simulation().actors.find(a=>a.team===team&&!a.civilian&&a.role==='RIFLEMAN'),id,active:true,alive:true,state:'GUARD',crouched:false,target:null,shot:0,firedAt:-1e9,x,y:0,z:0,facing:0});
function characters(keys){const c=new M01Characters(new THREE.Scene(),{visualVariation:true});c.sources=new Map([...assets.sources].filter(([k])=>keys.includes(k)));c.clips=assets.clips;return c;}

test('M01Characters: with the LOD2 GLBs missing (failed fetch) far soldiers are drawn as dressed LOD1/LOD0 bodies, not dropped to boxes',()=>{
  const c=characters(['pl:0','pl:1','de:0','de:1']);
  try{
    const actors=[rifleman('ally','pl_far',-100),rifleman('enemy','de_far',100),rifleman('ally','pl_mid',-250),rifleman('enemy','de_near',8)];
    const sel=c.update(actors,12,{x:0,z:0},'high');
    assert.deepEqual([...sel].sort(),['de_far','de_near','pl_far','pl_mid']);
    const key=Object.fromEntries(c.stats.actors.map(a=>[a.id,a.key]));
    assert.equal(key.pl_far,'pl:1');assert.equal(key.de_far,'de:1');assert.equal(key.pl_mid,'pl:1');assert.equal(key.de_near,'de:0');
    for(const v of c.instances.values())assert.ok(v.meshes.some(m=>m.visible&&m.isSkinnedMesh&&m.name==='body'),'a dressed body, not a proxy');
  }finally{c.dispose();}
});

test('M01Characters: a soldier drawn from a nearer LOD while the far GLB is late is swapped to the far LOD when it arrives, and never disappears in between',()=>{
  const c=characters(['pl:0']);
  try{
    const a=[rifleman('ally','pl_a',-120)];
    for(let i=0;i<3;i++){assert.ok(c.update(a,12+i*.05,{x:0,z:0},'high').has('pl_a'),`frame ${i}`);assert.equal(c.stats.actors[0].key,'pl:0');}
    c.sources.set('pl:2',assets.sources.get('pl:2'));
    assert.ok(c.update(a,12.2,{x:0,z:0},'high').has('pl_a'));assert.equal(c.stats.actors[0].key,'pl:2');
  }finally{c.dispose();}
});

test('M01Characters: with no soldier GLB loaded at all nothing is skinned (the procedural body stays the only fallback)',()=>{
  const c=characters([]);
  try{assert.equal(c.update([rifleman('ally','pl_a',-20)],12,{x:0,z:0},'high').size,0);}finally{c.dispose();}
});
