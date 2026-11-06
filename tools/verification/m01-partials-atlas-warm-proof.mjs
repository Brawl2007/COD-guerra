// Bounded production proof: fresh pages in ONE warm browser, original save/camera/capture helpers.
// The complete original nine-view paired matrix and coupled regressions remain independent CI gates.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {pngPixels,pixelDelta} from './m01-vegetation-v2-pixels.mjs';
const args=process.argv.slice(2),i=args.indexOf('--baseline'),baseline=i<0?null:args[i+1];
const out=process.env.M01_BRIDGE_EVIDENCE??'test-results/partials-correction-02/warm-final';mkdirSync(out,{recursive:true});
process.env.M01_BRIDGE_EVIDENCE=out;process.env.M01_BRIDGE_CURRENT_AUTHORITY='1';assert.notEqual(process.env.M01_BASELINE_CAPTURE,'1');
const spec=resolve('tests/browser/m01-bridge-finish-runtime.spec.js'),source=readFileSync(spec,'utf8'),stop=source.indexOf("\ntest('exact constructor04:30");assert.ok(stop>0);
const code=source.slice(0,stop).replace(/from (['"])([^'"]+)\1/g,(_,q,id)=>`from ${q}${id.startsWith('.')?new URL(id,pathToFileURL(spec)).href:import.meta.resolve(id)}${q}`)+'\nexport {open,save,capture,materialEnabled,clean};';
const {open,save,capture,materialEnabled,clean}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const sha=b=>createHash('sha256').update(b).digest('hex'),camera={x:-330,z:0,target:{x:-399,z:35,y:4}},input=save(route(19390901,{support:true}).combatSnapshots.eastDemolitionOutside,camera);
const engine=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const browser={newPage:async()=>{const page=await engine.newPage({baseURL:process.env.M01_BASE_URL??'http://127.0.0.1:4173/COD-guerra/',viewport:{width:1280,height:800}});page.setDefaultTimeout(120000);return page;}};
const proof={scope:'Bounded same-browser warm constructor → real-route06:10 OFF/ON entire-frame control. Not the complete bridge matrix or independent acceptance.',harnessSha256:sha(source),viewSha256:sha(readFileSync('src/render/m01-view.js')),buildIndexSha256:sha(readFileSync('dist/index.html'))};
try{
 const warmInput=save(new M01Simulation(19390901).snapshot(),camera),warm=await open(browser,warmInput);proof.warm=await capture(warm.page,'warm-0430-control',warmInput,warm);clean(warm);await warm.page.close();
 let before,basePixels;
 if(baseline){before=JSON.parse(readFileSync(baseline.replace(/\.png$/,'.json'))).raw;basePixels=pngPixels(readFileSync(baseline));proof.baseline={path:baseline,sha256:sha(readFileSync(baseline))};}
 else {const off=await open(browser,input);await materialEnabled(off.page,false);before=await capture(off.page,'base-0610-control',input,off);clean(off);await off.page.close();basePixels=pngPixels(readFileSync(`${out}/base-0610-control.png`));}
 const on=await open(browser,input),after=await capture(on.page,'current-0610-control',input,on);clean(on);await on.page.close();
 assert.deepEqual(after.state,before.state);assert.deepEqual(after.diagnostics.m01.bridgeCamera,before.diagnostics.m01.bridgeCamera);assert.deepEqual(after.diagnostics.m01.parts,before.diagnostics.m01.parts);
 proof.current=after;proof.control=pixelDelta(basePixels,pngPixels(readFileSync(`${out}/current-0610-control.png`)));proof.fullStateEqual=true;proof.cameraEqual=true;proof.partsEqual=true;proof.result=proof.control.pixels===0?'PASS':'FAIL';
 writeFileSync(`${out}/proof.json`,JSON.stringify(proof,null,2)+'\n');assert.equal(proof.control.pixels,0,'same-browser warm06:10 entire frame must be exact');console.log(JSON.stringify({result:'PASS',scope:proof.scope,control:proof.control}));
}finally{await engine.close();}
