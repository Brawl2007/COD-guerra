import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';
const key='cod-guerra:checkpoint:m01:v2';
function fixture(){const d=driver();d.step({skip:true});const s=d.sim.snapshot(false);Object.assign(s.player,{x:-325,y:-3,z:17,angle:Math.PI,pitch:.03});return s;}
async function startFrozen(page){
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});
  await page.locator('#continue').click();
  await page.waitForFunction(()=>window.gameDiagnostics().paused&&window.gameDiagnostics().m01.renderedFrames>0,null,{timeout:120000});
}
test('Station quality, checkpoint restart and page reload retain one architectural root and all prop clusters',async({page},info)=>{
  test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
  const snapshot=fixture();await page.addInitScript(({key,snapshot})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality','high');},{key,snapshot});
  await page.goto('?debug=1&visual-verify=1');await startFrozen(page);
  const samples=[];
  for(const [quality,lod]of [['low',2],['medium',1],['high',0]]){
    await page.locator('#back-menu').click();
    await page.locator('#quality').selectOption(quality);
    await startFrozen(page);
    await page.waitForFunction(q=>window.gameDiagnostics().m01.stationArchitecture.quality===q,quality);
    const diag=await page.evaluate(()=>window.gameDiagnostics());samples.push(diag.m01.stationArchitecture);
    expect(diag.m01.stationArchitecture.fidelity).toBe('v3');expect(diag.m01.stationArchitecture.textureBytes).toBe(1441792);expect(diag.m01.stationArchitecture.geometryBytes).toBeLessThan(11000000);
    expect(diag.m01.stationArchitecture.lod).toBe(lod);expect(diag.m01.stationArchitecture.openings).toBe(140);expect(diag.m01.stationArchitecture.drawCalls).toBe(7);
    expect(diag.m01.environmentProps.clusters).toBe(30);expect(diag.m01.stationArchitecture.collidersAdded).toBe(0);
  }
  const before=await page.evaluate(()=>window.gameDiagnostics());
  await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>window.gameDiagnostics().m01.stationArchitecture.ready);
  const restart=await page.evaluate(()=>window.gameDiagnostics());
  expect(restart.m01.stationArchitecture.geometries).toBe(before.m01.stationArchitecture.geometries);
  expect(restart.m01.environmentProps.totalAll).toBe(before.m01.environmentProps.totalAll);
  await page.reload();await startFrozen(page);const reloaded=await page.evaluate(()=>window.gameDiagnostics());
  expect(reloaded.m01.stationArchitecture).toEqual(before.m01.stationArchitecture);expect(reloaded.m01.environmentProps).toEqual(before.m01.environmentProps);expect(errors).toEqual([]);
  await info.attach('station-quality-lifecycle.json',{body:JSON.stringify({samples,before:before.m01.stationArchitecture,restart:restart.m01.stationArchitecture,reloaded:reloaded.m01.stationArchitecture}),contentType:'application/json'});
});
test('missing optional soldier, aircraft and train GLBs preserve Station architecture and solid gameplay envelopes',async({page},info)=>{
  test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*.glb',r=>r.request().url().includes('/provisional/m01/')&&!r.request().url().includes('/characters/')?r.continue():r.abort('failed'));
  const snapshot=fixture();await page.addInitScript(({key,snapshot})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality','low');},{key,snapshot});
  await page.goto('?debug=1&visual-verify=1');await startFrozen(page);
  const d=await page.evaluate(()=>window.gameDiagnostics());
  expect(d.m01.stationArchitecture.ready).toBe(true);expect(d.m01.stationArchitecture.source).toBe('original-mesh-no-external-asset-dependency');
  expect(d.m01.requiredAssetFailures).toEqual([]);expect(d.m01.stationArchitecture.anchor).toEqual({min:{x:-460,y:-3,z:28},max:{x:-338,y:11,z:55}});expect(errors).toEqual([]);
  await info.attach('station-optional-fallback.json',{body:JSON.stringify(d.m01),contentType:'application/json'});
});
