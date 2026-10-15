import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='/workspace/COD-guerra',scratch='/workspace/scratch/m01-partials-correction3',workflow=path.join(root,'.github/workflows/m01-partials-completion-integration-v1.yml');
const measuredPath=path.join(root,'test-results/partials-correction-02/cap03-seed1.json'),bytes=fs.readFileSync(measuredPath),measured=JSON.parse(bytes),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(measured.result,'PASS');assert.equal(measured.exactStatsAndSummary,'PASS');assert.equal(measured.routes.length,2);
const workflowBytes=fs.readFileSync(workflow),line=workflowBytes.toString().split('\n').find(l=>l.trimStart().startsWith("node --input-type=module -e '"));assert.ok(line);
const match=line.match(/^\s*node --input-type=module -e '(.*)'$/);assert.ok(match);const code=match[1];
let focused=code;for(const [from,to]of [['r.seeds.length,12','r.seeds.length,1'],['r[k].runs.length,24','r[k].runs.length,2'],['r.routes.length,24','r.routes.length,2']]){assert.equal(focused.split(from).length-1,1);focused=focused.replace(from,to);}assert.equal(focused.replace('r.seeds.length,1','r.seeds.length,12').replace('r[k].runs.length,2','r[k].runs.length,24').replace('r.routes.length,2','r.routes.length,24'),code,'only focused count guards adapted');
const clone=o=>structuredClone(o),seeds=[19390901,1,2,3,4,5,6,7,8,9,10,11],positive=clone(measured);positive.seeds=seeds;
for(const k of ['rawPredecessor','current','policyReplayPredecessor'])positive[k].runs=seeds.flatMap(seed=>measured[k].runs.map(run=>({...clone(run),seed})));
positive.routes=seeds.flatMap(seed=>measured.routes.map(row=>({...clone(row),seed})));
positive.guardFixture={synthetic:true,purpose:'24-route schema-only positive derived from measured seed1 help/ignore rows; never actual24-route certification',sourceSha256:sha(bytes)};
const result={scope:'Exact workflow-embedded assertion validation only; no simulation/browser run or synthetic route acceptance',workflowSha256:sha(workflowBytes),embeddedCodeSha256:sha(code),measuredPath,measuredSha256:sha(bytes),focusedAdaptation:'Only count guards12/24/24 →1/2/2 in scratch code',cases:[]};
let n=0;function run(name,data,expected,program=code){const dir=path.join(scratch,'case-'+String(n++).padStart(2,'0'));fs.mkdirSync(path.join(dir,'evidence'),{recursive:true});fs.writeFileSync(path.join(dir,'evidence/cover-policy-replay.json'),JSON.stringify(data));const proc=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:dir,encoding:'utf8'}),accepted=proc.status===0;result.cases.push({name,expected,accepted,exitCode:proc.status});assert.equal(accepted,expected,name);}
run('measured successful CAP03 focused report; only focused count guards adapted',measured,true,focused);
run('exact12seeds/24runs/24routes synthetic schema positive',positive,true);
function reject(name,mutate){const v=clone(positive);mutate(v);run(name,v,false);}
reject('missing report result',r=>delete r.result);reject('FAIL report result',r=>r.result='FAIL');reject('UNKNOWN report result',r=>r.result='UNKNOWN');
reject('missing top-level exactStatsAndSummary',r=>delete r.exactStatsAndSummary);reject('FAIL top-level exactStatsAndSummary',r=>r.exactStatsAndSummary='FAIL');reject('UNKNOWN top-level exactStatsAndSummary',r=>r.exactStatsAndSummary='UNKNOWN');
reject('FAIL route result',r=>r.routes[12].result='FAIL');reject('UNKNOWN route result',r=>r.routes[12].result='UNKNOWN');reject('missing route result',r=>delete r.routes[12].result);
reject('FAIL route check',r=>r.routes[12].checks[0].result='FAIL');reject('UNKNOWN route check',r=>r.routes[12].checks[0].result='UNKNOWN');reject('SKIPPED route check',r=>r.routes[12].checks[0].result='SKIPPED');reject('missing route check result',r=>delete r.routes[12].checks[0].result);reject('empty route checks',r=>r.routes[12].checks=[]);reject('missing route checks',r=>delete r.routes[12].checks);reject('non-array route checks',r=>r.routes[12].checks='PASS');reject('null route check',r=>r.routes[12].checks[0]=null);
reject('missing seeds count',r=>delete r.seeds);reject('11seeds instead of12',r=>r.seeds.pop());reject('13seeds instead of12',r=>r.seeds.push(12));
for(const k of ['rawPredecessor','current','policyReplayPredecessor']){reject(`missing ${k} runs count`,r=>delete r[k].runs);reject(`23 ${k} runs instead of24`,r=>r[k].runs.pop());reject(`25 ${k} runs instead of24`,r=>r[k].runs.push(clone(r[k].runs[0])));}
reject('missing route count',r=>delete r.routes);reject('23routes instead of24',r=>r.routes.pop());reject('25routes instead of24',r=>r.routes.push(clone(r.routes[0])));
assert.equal(sha(fs.readFileSync(measuredPath)),sha(bytes),'original successful report remains unchanged');
result.productionDiffAgainst016b=execFileSync('git',['diff','--name-only','016b2486025342d33629cbc301e8317d47606bc8','--','src','tests','tools','assets','missions','package.json','package-lock.json','vite.config.js','playwright.config.js'],{cwd:root,encoding:'utf8'}).trim();assert.equal(result.productionDiffAgainst016b,'');
result.positives=result.cases.filter(c=>c.expected).length;result.negatives=result.cases.filter(c=>!c.expected).length;result.result='PASS';fs.writeFileSync(path.join(scratch,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:result.result,positives:result.positives,negatives:result.negatives,workflowSha256:result.workflowSha256,codeSha256:result.embeddedCodeSha256,productionDiffAgainst016b:result.productionDiffAgainst016b}));
