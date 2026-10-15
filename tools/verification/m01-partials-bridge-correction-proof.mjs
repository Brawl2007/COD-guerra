// Bounded production proof using the exact committed browser harness helpers (no copied lifecycle logic).
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';
import {pngPixels,pixelDelta} from './m01-vegetation-v2-pixels.mjs';
const out=process.env.M01_BRIDGE_EVIDENCE??'test-results/partials-correction-01/bridge';mkdirSync(out,{recursive:true});
process.env.M01_BRIDGE_EVIDENCE=out;process.env.M01_BRIDGE_CURRENT_AUTHORITY='1';assert.notEqual(process.env.M01_BASELINE_CAPTURE,'1');
const spec=resolve('tests/browser/m01-bridge-finish-runtime.spec.js'),source=readFileSync(spec,'utf8'),stop=source.indexOf("\ntest('exact constructor04:30");assert.ok(stop>0);
const code=source.slice(0,stop).replace(/from (['"])([^'"]+)\1/g,(_,q,id)=>`from ${q}${id.startsWith('.')?new URL(id,pathToFileURL(spec)).href:import.meta.resolve(id)}${q}`)+'\nexport {open,save,capture,actual,editorialCamera,materialEnabled,budget,clean};';
const {open,save,capture,actual,editorialCamera,materialEnabled,budget,clean}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const launch=()=>chromium.launch({executablePath:process.env.CHROME_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const camera={x:-330,z:0,target:{x:-399,z:35,y:4}},input=save(route(19390901,{support:true}).combatSnapshots.eastDemolitionOutside,camera),controls={};
for(const enabled of [false,true]){const engine=await launch();try{const browser={newPage:()=>engine.newPage({baseURL:process.env.M01_BASE_URL??'http://127.0.0.1:4173/COD-guerra/',viewport:{width:1280,height:800}})},opened=await open(browser,input);if(!enabled)await materialEnabled(opened.page,false);controls[enabled?'on':'off']=await capture(opened.page,`${enabled?'current':'base'}-0610-control`,input,opened);clean(opened);await opened.page.close();}finally{await engine.close();}}
assert.deepEqual(controls.on.state,controls.off.state);assert.deepEqual(controls.on.diagnostics.m01.bridgeCamera,controls.off.diagnostics.m01.bridgeCamera);assert.deepEqual(controls.on.diagnostics.m01.parts,controls.off.diagnostics.m01.parts);
const pixels=name=>pngPixels(readFileSync(`${out}/${name}.png`));const control=pixelDelta(pixels('current-0610-control'),pixels('base-0610-control'));
writeFileSync(`${out}/cold-control-result.json`,JSON.stringify({control,controls},null,2));assert.equal(control.pixels,0,'cold0610 unaffected WHOLE frame must be exact');console.log('PASS cold0610 owner ON/OFF entire frame0 pixels');
const engine=await launch();let nearReturn;try{const browser={newPage:()=>engine.newPage({baseURL:process.env.M01_BASE_URL??'http://127.0.0.1:4173/COD-guerra/',viewport:{width:1280,height:800}})},nearInput=save(new M01Simulation(19390901).snapshot(),{x:-48,z:9,target:{x:-4,z:1,y:5}}),opened=await open(browser,nearInput),{page}=opened,returnCamera=(await actual(page)).diagnostics.m01.bridgeCamera;
 assert.equal(returnCamera.position[0],nearInput.player.x);assert.equal(returnCamera.position[2],nearInput.player.z);
 await editorialCamera(page,{position:[-650,8,-800],target:[100,6,0]});const far=await capture(page,'focused-far',nearInput,opened);budget(far.diagnostics);assert.ok(far.diagnostics.m01.bridgeFinish.native.impostor.main.calls>0);
 await materialEnabled(page,false);const disabled=await actual(page);assert.equal(disabled.diagnostics.m01.bridgeFinish.native.impostor.main.calls,0);await materialEnabled(page,true);await editorialCamera(page,null,returnCamera);
 const near=await capture(page,'focused-return-near',nearInput,opened);assert.equal(near.diagnostics.m01.bridgeFinish.lod.parts.rail_span_01.impostor,false);clean(opened);nearReturn={returnCamera,far,disabled,near};await page.close();console.log('PASS actual restored camera → far → disabled → enabled → exact near return');
}finally{await engine.close();}
writeFileSync(`${out}/correction-proof.json`,JSON.stringify({result:'PASS',scope:'Bounded cold0610 whole-frame control and high-quality far/disable/enable/near return; not the complete bridge matrix.',harnessSha256:createHash('sha256').update(source).digest('hex'),buildJs:readFileSync('dist/index.html','utf8').match(/assets\/index-[^"']+\.js/)?.[0],control,nearReturn},null,2));
