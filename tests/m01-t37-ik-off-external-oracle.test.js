import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Characters} from '../src/render/m01-characters.js';
import {runOracleScene} from './helpers/m01-pre-t37-oracle.js';

// T37 review note: "IK off is bit-identical to pre-T37" anchored to an EXTERNAL reference. The fixture holds the sha256 of every bone
// (local position/quaternion + world matrix, doubles) and muzzle, produced by the pre-T37 M01Characters (commit 5a169ba), not by this code.
const fixture=JSON.parse(readFileSync(new URL('./fixtures/m01-pre-t37-bones.json',import.meta.url),'utf8'));

test('T37 external oracle: ik:false reproduces the frozen pre-T37 (5a169ba) bone snapshots bit-for-bit', async () => {
  const keys=Object.keys(fixture.snapshots);
  assert.ok(keys.length>=60,'fixture covers 3 terrain spots x 3 clocks x 7 actors');
  const now=await runOracleScene(M01Characters,{ik:false});
  assert.deepEqual(Object.keys(now),keys);
  for(const k of keys)assert.deepEqual(now[k],fixture.snapshots[k],`ik:false differs from pre-T37 for ${k}`);
});

test('T37 external oracle is sensitive: IK on changes every snapshot', async () => {
  const on=await runOracleScene(M01Characters,{ik:true});
  for(const k of Object.keys(fixture.snapshots))assert.notEqual(on[k].sha256,fixture.snapshots[k].sha256,`IK on must differ for ${k}`);
});

test('T37: boot-clearance re-sampling (measure) is diagnostics-only: off by default outside debug, never changes the pose', async () => {
  const on=await runOracleScene(M01Characters,{ik:true,ikMeasure:true}),off=await runOracleScene(M01Characters,{ik:true});
  assert.deepEqual(off,on,'measure must not change any bone');
  const {TczewWorld}=await import('../src/world/tczew-world.js');
  const {createIkCharacters}=await import('./helpers/m01-ik-fixture.js');
  const world=new TczewWorld(),actor={id:'m',active:true,alive:true,team:'ally',role:'RIFLEMAN',state:'SUPPRESS',crouched:false,suppressedUntil:0,x:-50,y:world.heightAt(-50,9),z:9,facing:.4,bodyYaw:.4,shot:0,firedAt:-100,rounds:5};
  const calls={};
  for(const [label,opts] of [['production',{ikMeasure:false}],['debug',{ikMeasure:true}]]){
    const c=await createIkCharacters({world,...opts});let n=0;const orig=world.heightAt.bind(world);world.heightAt=(x,z)=>{n++;return orig(x,z);};
    try{c.update([actor],6,{x:-50,z:9},'high',null,world);calls[label]=n;
      const f=c.instances.get('m').ik.footIk;
      if(label==='production')assert.equal(f.stanceClearanceM,null);else assert.ok(f.stanceClearanceM!==null&&f.stanceClearanceM<=0.02);
    }finally{world.heightAt=orig;c.dispose();}
  }
  assert.ok(calls.production<calls.debug,`heightAt calls: production ${calls.production} < debug ${calls.debug}`);
  const d=new M01Characters(new (await import('three')).Scene(),{visualVariation:false,debug:true});
  assert.equal(d.ikMeasure,true);d.dispose();
  assert.equal(new M01Characters(new (await import('three')).Scene(),{visualVariation:false,debug:false}).ikMeasure,false);
});
