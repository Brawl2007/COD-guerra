import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [beforeDir,afterDir,out]=process.argv.slice(2);assert.ok(beforeDir&&afterDir,'Usage: beforeDir afterDir [report.json]');
function records(dir){const found=new Map();function walk(d){for(const e of readdirSync(d,{withFileTypes:true})){const path=join(d,e.name);if(e.isDirectory())walk(path);else if(e.name.endsWith('.json')){const value=JSON.parse(readFileSync(path));if(value.diagnostics&&value.state)found.set(e.name,{path,value});}}}walk(dir);return found;}
const before=records(beforeDir),after=records(afterDir),reports=[];
for(const [name,a]of after){const b=before.get(name);if(!b)continue;
 assert.deepEqual(a.value.state,b.value.state,name+' actual snapshot/checkpoint/events');
 assert.deepEqual(a.value.diagnostics.player,b.value.diagnostics.player,name+' player/camera controls');
 assert.equal(a.value.diagnostics.clock,b.value.diagnostics.clock,name+' saved clock');
 assert.deepEqual(a.value.diagnostics.m01.bridgeCamera,b.value.diagnostics.m01.bridgeCamera,name+' native camera');
 const hash=path=>createHash('sha256').update(readFileSync(path.replace(/\.json$/,'.png'))).digest('hex');
 reports.push({name,clock:a.value.diagnostics.clock,snapshotExact:true,cameraExact:true,before:b.path,after:a.path,pngBefore:hash(b.path),pngAfter:hash(a.path),native:a.value.diagnostics.m01.viewModel.native});
}
for(const prefix of ['01','05','14','frozen-pickup','frozen-carry','frozen-putdown'])assert.ok(reports.some(r=>r.name.startsWith(prefix)),`Missing before/after ${prefix}`);
if(out)writeFileSync(out,JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports,null,2));
