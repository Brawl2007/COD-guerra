import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generate,FAMILIES} from '../tools/assets/m01-bridges/materials/generate.mjs';
import {decodePng} from '../tools/assets/m01-materials/src/png.mjs';
test('original bridge sidecar regenerates exactly, with useful physical channels and bounded tiers',()=>{
 const a=generate(),b=generate();assert.equal(a.files.length,49);
 for(let i=0;i<a.files.length;i++){const f=a.files[i];assert.deepEqual(f.bytes,b.files[i].bytes);assert.deepEqual(readFileSync(`assets/models/provisional/m01/m01-bridges/materials/${f.file}`),f.bytes);if(f.file==='manifest.json')continue;const p=decodePng(f.bytes);assert.equal(p.width,f.tier==='high'?256:128);assert.ok(new Set(Array.from(p.pixels).filter((_,i)=>i%4!==3)).size>3);for(let j=3;j<p.pixels.length;j+=4)assert.equal(p.pixels[j],255);assert.equal(f.tileMetres,2);}
 assert.equal(Object.keys(FAMILIES).length,8);for(const t of Object.values(a.manifest.budget.tiers))assert.ok(t.decodedBytes<t.limitBytes);assert.match(a.manifest.provenance,/unchosen licence remain unchanged/);
});
