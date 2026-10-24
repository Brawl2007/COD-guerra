// T43 slice 4c: per-preset LOD counters are exposed in renderer diagnostics and Low submits less than High (actors and vegetation).
// Presentation only: nothing here reads or changes simulation state. Node/headless counts are submissions, not FPS.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {M01VegetationRuntime} from '../src/render/m01-vegetation-runtime.js';
import {readVegetationNodeAsset as asset} from '../tools/verification/m01-vegetation-v2-node-asset.mjs';

function characters(){
  const c=new M01Characters(new THREE.Scene(),{visualVariation:false});
  for(const nation of ['pl','de'])for(const lod of [0,1,2]){
    const root=new THREE.Group(),node=new THREE.Group();node.name=`m01_soldier_${nation}`;root.add(node);
    const bone=new THREE.Bone();bone.name='root';node.add(bone);
    for(const n of ['body','rifle','clip','helmet_wz31'])node.add(Object.assign(new THREE.Mesh(),{name:n}));
    c.sources.set(`${nation}:${lod}`,{scene:root,animations:[]});
  }
  for(const n of ['standing_idle','aim','walk','run','fallen'])c.clips.set(n,new THREE.AnimationClip(n,2,[],{}));
  return c;
}
// 40 allied riflemen spread 5..95 m from the player: all inside Low's 100 m cull, more than every skinning budget.
const crowd=()=>Array.from({length:40},(_,i)=>({id:`rifle_${i}`,active:true,alive:true,team:'ally',x:5+i*2.3,y:0,z:(i%5)-2,facing:0,shot:0,state:'GUARD'}));

test('actors: Low submits fewer skinned bodies and meshes than High for the same crowd', () => {
  const out={};
  for(const preset of ['low','medium','high']){
    const c=characters();
    try{
      c.update(crowd(),10,{x:0,z:0},preset);
      out[preset]={active:c.stats.active,meshes:c.stats.submittedMeshes,limit:c.stats.limit,bands:[...c.stats.lodBands],preset:c.diagnostics.lodPreset};
    }finally{c.dispose();}
  }
  assert.deepEqual([out.low.limit,out.medium.limit,out.high.limit],[18,24,48],'skinning budgets: Low/Medium untouched (18/24); High raised 28 -> 48 on 2026-10-18 (playtest-skin-visibility)');
  assert.deepEqual([out.low.active,out.medium.active,out.high.active],[18,24,40],'High now skins the whole 40-actor crowd');
  assert.ok(out.low.meshes<out.medium.meshes&&out.medium.meshes<out.high.meshes,JSON.stringify(out));
  assert.ok(out.low.meshes>0);
  assert.deepEqual([out.low.preset,out.medium.preset,out.high.preset],['low','medium','high']);
  assert.equal(out.low.bands[0],0,'Low never draws the near skinned LOD');
  assert.ok(out.high.bands[0]>0,'High keeps near bodies within 14 m');
});

test('vegetation: Low submits fewer instances and triangles than High; counters are per preset and still frames add none', async () => {
  const world=new TczewWorld(),r=new M01VegetationRuntime(new THREE.Group(),world,{load:async()=>asset(),surfaceY:(x,z)=>world.terrainHeightAt(x,z)+.25});
  try{
    await r.load();assert.equal(r.ready,true);
    const at={x:-74,z:30},seen={};
    for(const q of ['low','medium','high']){r.sync(world,q,at,10);const d=r.diagnostics;seen[q]={instances:r.selectedInstances,triangles:d.structuralTriangles,calls:d.structuralDrawCalls};}
    assert.ok(seen.low.instances<seen.medium.instances&&seen.medium.instances<seen.high.instances,JSON.stringify(seen));
    assert.ok(seen.low.triangles<seen.medium.triangles&&seen.medium.triangles<seen.high.triangles,JSON.stringify(seen));
    assert.ok(seen.low.calls<=seen.high.calls);
    // Switches are tallied under the preset that selected the new band; the counters appear in diagnostics for all three presets.
    const d=r.diagnostics;
    assert.deepEqual(Object.keys(d.lodCounters),['low','medium','high']);assert.deepEqual(Object.keys(d.shrubLodCounters),['low','medium','high']);
    assert.equal(typeof d.lodSwitches,'number');
    // A still camera: re-syncing the same position (and bumping the clock) changes nothing.
    r.sync(world,'high',at,11);r.sync(world,'high',at,12);
    const still=r.diagnostics;assert.equal(still.lodSwitches,d.lodSwitches);assert.deepEqual(still.lodCounters,d.lodCounters);assert.deepEqual(still.shrubLodCounters,d.shrubLodCounters);
    // Walking 2 m inside a band's hysteresis margin does not tally; a jump across several tiers does, under the active preset.
    r.sync(world,'high',{x:-74,z:30.5},12);r.sync(world,'high',{x:-74,z:30},12);
    assert.equal(r.diagnostics.lodSwitches,d.lodSwitches,'sub-metre wobble stays inside the 4 m tree margin');
    const before=r.diagnostics.lodSwitches;r.sync(world,'high',{x:400,z:0},13);
    const after=r.diagnostics;assert.ok(after.lodSwitches>before);
    assert.ok(after.lodCounters.high.some(n=>n>0)||after.shrubLodCounters.high.some(n=>n>0));
  }finally{r.dispose();}
});
