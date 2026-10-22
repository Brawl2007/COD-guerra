// Authentic schema-2 danger save from published D3. Never hand-edit the generated fixture.
import {readFileSync,writeFileSync,mkdtempSync,symlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const ROOT=resolve(import.meta.dirname,'../..'),commit='8ebc9086f8429fdc3197b88bd136411840d32cc4';
const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{maxBuffer:1<<29});
const sha=b=>createHash('sha256').update(b).digest('hex'),dir=mkdtempSync(join(tmpdir(),'m01-d4-legacy-'));
const data=git('ls-tree','-r','--name-only',commit,'assets','research').toString().split('\n').filter(p=>p.endsWith('.json'));
execFileSync('tar',['-x','-C',dir],{input:git('archive','--format=tar',commit,'src','missions','tests/helpers',...data)});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
const {M01Simulation}=await import(pathToFileURL(join(dir,'src/game/m01-simulation.js'))),{toCoverAdjustment}=await import(pathToFileURL(join(dir,'tests/helpers/m01-route.js')));
class Soldado extends M01Simulation{constructor(seed){super(seed,{difficulty:'soldado'});}}
const save=toCoverAdjustment({Simulation:Soldado}).sim.snapshot(),records=Object.values(save.timers.telegraph??{});
if(!save.player.alive||!records.length||records.some(e=>'cue'in e))throw Error('D3 legacy fixture must be alive with actual old engagement records');
const text=JSON.stringify(save)+'\n',fixture=join(ROOT,'tests/fixtures/m01-d3-legacy-danger-save.json');
if(process.argv.includes('--write'))writeFileSync(fixture,text);else if(readFileSync(fixture,'utf8')!==text)throw Error('legacy fixture does not reproduce D3');
const provenance={sourceCommit:commit,sourceSha256:sha(readFileSync(join(dir,'src/game/m01-simulation.js'))),method:'published D3 simulation and route helper, Soldado, seed 19390901, normal controls to actual cover-adjustment salvo; no state/clock/HP/event injection',difficulty:save.difficulty,clock:save.clock,health:save.player.health,engagementRecords:records.length,fixtureSha256:sha(text)};
if(process.argv.includes('--write'))writeFileSync(join(ROOT,'tests/fixtures/m01-d3-legacy-danger-save-origin.json'),JSON.stringify(provenance,null,2)+'\n');
console.log(JSON.stringify(provenance));
