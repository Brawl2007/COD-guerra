import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMP38} from '../tools/assets/m02-mp38/build.mjs';
import {planWeaponBurst,weaponProfileId} from '../src/core/battlefield-audio.js';

test('MP38 GLB has real scale, a grip origin and a cheaper distant LOD',()=>{
 const near=generateMP38(0),far=generateMP38(1);
 assert.ok(Math.abs(near.bounds.max[2]-near.bounds.min[2]-.833)<.001);
 assert.equal(near.buffer.readUInt32LE(0),0x46546c67);
 assert.ok(near.triangles<600&&far.triangles<near.triangles/2);
 assert.deepEqual(generateMP38(0).buffer,near.buffer);
});
test('MP38 acoustic bursts preserve the three causally fired rounds and 90 ms cadence',()=>{
 assert.equal(weaponProfileId('mp38'),'mp38');
 const grains=planWeaponBurst('mp38',10,{rounds:3,key:'mp38'});
 const cracks=grains.filter(g=>g.layer==='crack');
 assert.equal(cracks.length,3);
 assert.ok(Math.abs(cracks[1].at-cracks[0].at-.09)<.02);
});
