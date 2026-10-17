import test from 'node:test';
import assert from 'node:assert/strict';
import {initialQuality} from '../src/render/three-renderer.js';
test('visual quality respects explicit settings; capable hardware GPUs start at maximum quality (PC target)',()=>{
 const capable={cores:4,memory:4,renderer:'Intel UHD Graphics',maxTexture:16384};
 assert.equal(initialQuality(capable),'high');
 for(const saved of ['low','medium','high'])assert.equal(initialQuality({saved}),saved);
 for(const saved of ['low','medium','high'])assert.equal(initialQuality({...capable,saved}),saved);
 for(const modest of [{...capable,memory:2},{...capable,cores:2},{...capable,maxTexture:4096}])assert.equal(initialQuality(modest),'medium');
 for(const software of [{},{...capable,renderer:'SwiftShader'},{...capable,renderer:'llvmpipe (LLVM 15)'},{...capable,renderer:''}])assert.equal(initialQuality(software),'low');
 assert.equal(initialQuality({...capable,saved:'invalid'}),'high');
});
