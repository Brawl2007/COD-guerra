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
 // Reference laptop (Intel HD Graphics 5500: 4 threads, 8 GB, 16384 px textures) must never start at High, with or without the ANGLE wrapper; UHD stays High.
 for(const renderer of ['Intel(R) HD Graphics 5500','ANGLE (Intel, Intel(R) HD Graphics 5500 Direct3D11 vs_5_0 ps_5_0, D3D11)','Intel(R) HD Graphics 620'])assert.equal(initialQuality({cores:4,memory:8,renderer,maxTexture:16384}),'medium',renderer);
 for(const renderer of ['Intel(R) UHD Graphics 630','ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'])assert.equal(initialQuality({cores:4,memory:8,renderer,maxTexture:16384}),'high',renderer);
 assert.equal(initialQuality({cores:4,memory:8,renderer:'Intel(R) HD Graphics 5500',maxTexture:16384,saved:'high'}),'high','an explicit saved choice still wins');
});
