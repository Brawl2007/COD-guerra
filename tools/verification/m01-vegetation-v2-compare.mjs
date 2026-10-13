import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pngPixels,pixelDelta} from './m01-vegetation-v2-pixels.mjs';
const [baseRoot,currentRoot,output='test-results/m01-vegetation-v2-pixels.json']=process.argv.slice(2);
if(!baseRoot||!currentRoot)throw Error('Usage: node tools/verification/m01-vegetation-v2-compare.mjs BASE_CAPTURE_DIR CURRENT_CAPTURE_DIR [REPORT]');
const baseline=JSON.parse(fs.readFileSync(path.join(baseRoot,'frozen-canonical-raw.json'))),current=JSON.parse(fs.readFileSync(path.join(currentRoot,'frozen-canonical-raw.json'))),report=[];
assert.equal(baseline.length,9);assert.equal(current.length,9);
for(const original of baseline){const candidate=current.find(r=>r.name===original.name);assert.ok(candidate,original.name);assert.deepEqual(candidate.state,original.state,`${original.name} input save`);assert.deepEqual(candidate.actual,original.actual,`${original.name} actual snapshot/checkpoint/events`);assert.deepEqual(candidate.camera,original.camera,`${original.name} actual camera`);assert.equal(candidate.diagnostics.clock,original.diagnostics.clock,`${original.name} actual clock`);const before=pngPixels(fs.readFileSync(path.join(baseRoot,original.name+'.png'))),after=pngPixels(fs.readFileSync(path.join(currentRoot,original.name+'.png'))),pixels=pixelDelta(before,after),control=pixelDelta(before,after,{x:600,y:4,w:80,h:40});report.push({name:original.name,pixels,control,saveEqual:true,cameraEqual:true,clock:candidate.diagnostics.clock});fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');assert.ok(pixels.pixels>100,`${original.name} changed foliage pixels`);assert.equal(control.pixels,0,`${original.name} control patch`);}
console.log(`PASS ${report.length} untouched-base/current save/camera/clock and exact changed/control pixels: ${output}`);
