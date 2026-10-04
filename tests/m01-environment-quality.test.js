import test from 'node:test';
import assert from 'node:assert/strict';
import {initialQuality} from '../src/render/three-renderer.js';
test('visual quality respects explicit settings and conservative hardware fallback',()=>{
 const capable={cores:4,memory:4,renderer:'Intel UHD Graphics',maxTexture:16384};
 assert.equal(initialQuality(capable),'medium');
 for(const saved of ['low','medium','high'])assert.equal(initialQuality({saved}),'low'===saved?'low':saved);
 for(const limited of [{},{...capable,memory:2},{...capable,renderer:'SwiftShader'},{...capable,cores:2},{...capable,renderer:''}])assert.equal(initialQuality(limited),'low');
 assert.equal(initialQuality({...capable,saved:'invalid'}),'medium');
});
