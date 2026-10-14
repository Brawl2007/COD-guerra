import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const args=process.argv.slice(2),option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const baseline=path.resolve(option('--baseline','.agent/runs/M01-T14-T41-20261013/baseline-checkout')),out=path.resolve(option('--out','test-results/m01-bridge-finish-v2-futures.json'));
const seeds=[19390901,1,2,3,7,17,41,73,99,1234,1945,4294967295],expectedHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),script=fileURLToPath(new URL('./m01-bridge-finish-v2-futures.mjs',import.meta.url));
fs.mkdirSync(path.dirname(out),{recursive:true});
const outputStem=out.endsWith('.json')?out.slice(0,-5):out;
const groups=Array.from({length:4},(_,i)=>({part:i+1,seeds:seeds.slice(i*3,i*3+3),output:`${outputStem}-part-${i+1}.json`}));
const jobs=groups.map(group=>new Promise(resolve=>{const child=spawn(process.execPath,[script,'--baseline',baseline,'--seeds',group.seeds.join(','),'--out',group.output],{stdio:'inherit'});let finished=false;const finish=value=>{if(!finished){finished=true;resolve({...group,...value});}};child.on('error',error=>finish({exitCode:null,signal:null,error:error.message}));child.on('exit',(exitCode,signal)=>finish({exitCode,signal}));}));
// Always collect all four process outcomes, even when one fails; keep each partial raw report.
const exits=await Promise.all(jobs);fs.writeFileSync(`${outputStem}-processes.json`,JSON.stringify(exits,null,2)+'\n');
assert.ok(exits.every(p=>p.exitCode===0&&!p.error),'One or more futures subprocesses failed; inspect all four raw reports and exit codes');
const parts=exits.map(p=>JSON.parse(fs.readFileSync(p.output))),reference=parts[0],routes=[],seen=new Set();
assert.equal(reference.baselineHead,'8a0c3622f5375f2c5b5e847db71f4f6e8352ae39');assert.equal(reference.candidateHead,expectedHead);
for(let i=0;i<parts.length;i++){const part=parts[i];assert.equal(part.baselineHead,reference.baselineHead);assert.equal(part.candidateHead,reference.candidateHead);assert.deepEqual(part.sourceHashes,reference.sourceHashes);assert.equal(part.baseline,reference.baseline);assert.deepEqual(part.seeds,groups[i].seeds);assert.equal(part.routes.length,6);for(const route of part.routes){assert.ok(seeds.includes(route.seed));assert.equal(typeof route.support,'boolean');const key=`${route.seed}:${route.support}`;assert.ok(!seen.has(key),`Duplicate future ${key}`);seen.add(key);assert.equal(route.finalSha256,route.baselineFinalSha256);assert.equal(route.finalCheckpointSha256,route.baselineFinalCheckpointSha256);assert.ok(route.checkpointPairs.every(p=>p.candidateSha256===p.baselineSha256));assert.equal(route.complete,true);assert.equal(route.bridge.status,'ready');assert.equal(route.bridge.worldBound,true);assert.ok(route.ticks>0);routes.push(route);}}
assert.equal(routes.length,24);for(const seed of seeds)for(const support of [false,true])assert.ok(seen.has(`${seed}:${support}`));routes.sort((a,b)=>seeds.indexOf(a.seed)-seeds.indexOf(b.seed)||Number(a.support)-Number(b.support));
fs.writeFileSync(out,JSON.stringify({...reference,seeds,routes,processes:exits,kind:'24 real-control A/B futures with original GLB owner active, four independent subprocesses; consolidated only after all process and equality checks pass; CPU actual accessor/decoded PNG material fixture, no GPU or browser-playtest claim'},null,2)+'\n');
console.log(`PASS all 24 unique seed/support futures, equal source/base/candidate heads and state/checkpoint results: ${out}`);
