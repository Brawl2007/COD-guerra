import {test,expect} from '@playwright/test';
import fixtures from '../../docs/verification/m01-runtime/environment-visual-runtime-pass-2026-10-04/camera-fixtures.json' with {type:'json'};
import {TczewWorld} from '../../src/world/tczew-world.js';
import {buildM01VegetationLayout} from '../../src/render/m01-vegetation-layout.js';

const key='cod-guerra:checkpoint:m01:v2';
const rail=fixtures.find(f=>f.name==='B-rail-sappers');
if(!rail)throw new Error('B-rail-sappers camera fixture missing');
// The deterministic layout is pure data, so the expected counts come from the same module the page runs.
const layout=buildM01VegetationLayout(new TczewWorld()),TREES=layout.solid.length+layout.visualTrees.length,SHRUBS=layout.shrubs.length;

async function observe(page){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  return {errors,failed};
}
async function waitMenu(page){
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.vegetation?.ready&&window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeVisible();
}
async function freezeContinue(page){
  const frames=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames);
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);
  });
  await page.locator('#continue').click();
  await page.waitForFunction(frames=>{const d=window.gameDiagnostics(),overlay=document.querySelector('#pause');return d.paused&&overlay&&!overlay.classList.contains('hidden')&&getComputedStyle(overlay).display!=='none'&&d.m01.vegetation.treeCount>17&&d.m01.vegetation.ready&&d.m01.renderedFrames>frames&&d.m01.demolition.clock===d.clock&&d.m01.damageDecals.atlasReady&&d.m01.fieldStructures.ready&&d.m01.environmentProps.runtime.ready&&d.m01.wagons.loaded.length===6;},frames,{timeout:120000});
  await page.waitForLoadState('networkidle',{timeout:120000});
  await expect(page.locator('#pause')).toBeVisible();
}
// A look sample can land in a frame that does not consume it (CI 38921344585 shard 3 waited out the test on an unchanged angle):
// re-aim from the current pose until the same tolerance holds. The tolerance and the target are unchanged.
async function lookAt(page,target){
  for(let attempt=0;;attempt++){
  const p=await page.evaluate(()=>window.gameDiagnostics().player),dx=target.x-p.x,dz=target.z-p.z;
  const angle=Math.atan2(dz,dx),pitch=Math.atan2((target.y??p.y+5)-p.y-1.6,Math.hypot(dx,dz));
  const turn=Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle));
  await page.evaluate(({x,y})=>{
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0,bubbles:true}));
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true}));
  },{x:turn/.0022,y:(p.pitch-pitch)/.0022});
  try{await page.waitForFunction(angle=>Math.abs(Math.atan2(Math.sin(window.gameDiagnostics().player.angle-angle),Math.cos(window.gameDiagnostics().player.angle-angle)))<.035,angle,{timeout:20000});return;}
  catch(error){if(attempt>=3)throw error;}
  }
}
async function capture(page,info,name){
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
}

test('fixed rail camera shows volumetric grove in High and a cheaper intact silhouette in Low',async({page},info)=>{
  test.setTimeout(180000);
  const watch=await observe(page);
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:rail.snapshot});
  await page.goto('?debug=1');await waitMenu(page);
  await page.locator('#quality').selectOption('high');await freezeContinue(page);
  const high=await page.evaluate(()=>window.gameDiagnostics()),vh=high.m01.vegetation;
  expect(vh.treeCount).toBe(TREES);expect(vh.solidTreeCount).toBe(17);expect(vh.visualTreeCount).toBe(layout.visualTrees.length);expect(['near','mid','far']).toContain(vh.tracked.m01_tree_0);
  expect(vh.lod.near+vh.lod.mid+vh.lod.far).toBe(TREES);expect(vh.leafCards).toBeGreaterThan(0);
  expect(vh.shrubCount).toBe(SHRUBS);expect(vh.shrubLod.near).toBeGreaterThan(0);expect(vh.collidersAdded).toBe(0);
  expect(Object.keys(vh.species).length).toBeGreaterThanOrEqual(7);expect(vh.groundShadows).toBeGreaterThan(0);expect(vh.groundShadows).toBeLessThanOrEqual(TREES+SHRUBS);
  expect(vh.grassInstances).toBeGreaterThan(0);expect(vh.grassInstances).toBeLessThan(vh.groundCoverTotal);
  expect(vh.ready).toBe(true);expect(vh.atlasTextures).toBe(1);expect(vh.drawCalls).toBeLessThanOrEqual(48);expect(vh.triangles).toBeLessThanOrEqual(350000);expect(vh.submitted.every(s=>s.paddingIncluded)).toBe(true);
  await page.screenshot({path:info.outputPath('CANDIDATE-B-rail-sappers-high.png'),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});

  await page.locator('#back-menu').click();await page.waitForFunction(()=>window.gameDiagnostics().paused);
  await page.locator('#quality').selectOption('low');await freezeContinue(page);
  const low=await page.evaluate(()=>window.gameDiagnostics()),vl=low.m01.vegetation;
  expect(low.player.x).toBeCloseTo(high.player.x,6);expect(low.player.z).toBeCloseTo(high.player.z,6);
  expect(low.player.angle).toBeCloseTo(high.player.angle,6);expect(vl.treeCount).toBe(TREES);expect(vl.ready).toBe(true);expect(['near','mid','far']).toContain(vl.tracked.m01_tree_0);expect(vl.drawCalls).toBeLessThanOrEqual(24);expect(vl.triangles).toBeLessThanOrEqual(120000);
  expect(vl.treeTriangles).toBeLessThan(vh.treeTriangles);expect(vl.treeDrawCalls).toBeLessThanOrEqual(vh.treeDrawCalls);
  expect(vl.grassInstances).toBeLessThan(vh.grassInstances/2);expect(vl.groundTriangles).toBeLessThan(vh.groundTriangles);
  expect(vl.shrubLod.culled).toBeGreaterThan(vh.shrubLod.culled);expect(vl.drawCalls).toBeLessThanOrEqual(vh.drawCalls);
  await page.screenshot({path:info.outputPath('CANDIDATE-B-rail-sappers-low.png'),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
  const counters={high:{total:{drawCalls:high.drawCalls,triangles:high.triangles,textures:high.textures,geometries:high.geometries},vegetation:vh},low:{total:{drawCalls:low.drawCalls,triangles:low.triangles,textures:low.textures,geometries:low.geometries},vegetation:vl}};
  console.log('M01_VEGETATION_COUNTERS '+JSON.stringify(counters));
  await info.attach('vegetation-fixed-camera-counters',{body:JSON.stringify(counters,null,2),contentType:'application/json'});
  expect(watch.errors).toEqual([]);expect(watch.failed).toEqual([]);
});

test('Medium keeps volumetric near and distant battlefield vegetation without changing gameplay state',async({page},info)=>{
  test.setTimeout(process.env.CI?240000:120000);
  const watch=await observe(page);
  await page.addInitScript(({key,snapshot})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality','medium');},{key,snapshot:rail.snapshot});
  await page.goto('?debug=1&visual-verify=1');await waitMenu(page);
  await page.locator('#quality').selectOption('high');await freezeContinue(page);
  await page.waitForFunction(()=>{const d=window.gameDiagnostics();return d.quality==='high'&&d.m01.vegetation.quality==='high'&&d.m01.vegetation.lod.near>0;});
  const highWarmup=await page.evaluate(()=>window.gameDiagnostics());
  await page.locator('#quality').selectOption('medium',{force:true});
  await page.waitForFunction(frames=>{const d=window.gameDiagnostics();return d.quality==='medium'&&d.m01.vegetation.quality==='medium'&&d.m01.renderedFrames>frames;},highWarmup.m01.renderedFrames);
  const frozenState=await page.evaluate(()=>window.gameVerificationState());
  expect(frozenState.snapshot.player).toEqual(rail.snapshot.player);
  const before=await page.evaluate(()=>window.gameDiagnostics());
  await page.locator('#resume').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  const nearTree=layout.solid.find(t=>t.id==='m01_tree_4');
  // This real rail save is 34.54 m from tree4. Real High→Medium warmup retains its near tier through the documented hysteresis.
  await lookAt(page,{x:nearTree.x,z:nearTree.z,y:nearTree.y+nearTree.height*.62});await capture(page,info,'AFTER-near-tree-medium.png');
  await page.locator('#resume').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  await lookAt(page,{x:-520,z:-150,y:6});await capture(page,info,'AFTER-battlefield-far-medium.png');
  const after=await page.evaluate(()=>window.gameDiagnostics());
  expect(after.player.x).toBeCloseTo(before.player.x,5);expect(after.player.z).toBeCloseTo(before.player.z,5);expect(after.player.y).toBe(before.player.y);
  expect(after.m01.vegetation.treeCount).toBe(TREES);expect(after.m01.vegetation.shrubCount).toBe(SHRUBS);
  expect(after.m01.vegetation.lod.near).toBeGreaterThan(0);expect(after.m01.vegetation.lod.mid).toBeGreaterThan(0);expect(after.m01.vegetation.lod.far).toBeGreaterThan(0);
  await info.attach('vegetation-medium-counters',{body:JSON.stringify({fixture:rail.name,highWarmup:{player:highWarmup.player,vegetation:highWarmup.m01.vegetation},frozenPlayer:frozenState.snapshot.player,nearTarget:{id:nearTree.id,distance:Math.hypot(nearTree.x-before.player.x,nearTree.z-before.player.z)},before:{player:before.player,vegetation:before.m01.vegetation},after:{player:after.player,vegetation:after.m01.vegetation}},null,2),contentType:'application/json'});
  expect(watch.errors).toEqual([]);expect(watch.failed).toEqual([]);
});
