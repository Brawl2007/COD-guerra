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
