import {test,expect} from '@playwright/test';
import fixtures from '../../docs/verification/m01-runtime/environment-visual-runtime-pass-2026-10-04/camera-fixtures.json' with {type:'json'};

const key='cod-guerra:checkpoint:m01:v2';
const rail=fixtures.find(f=>f.name==='B-rail-sappers');
if(!rail)throw new Error('B-rail-sappers camera fixture missing');

async function observe(page){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  return {errors,failed};
}
async function waitMenu(page){
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeVisible();
}
async function freezeContinue(page){
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);
  });
  await page.locator('#continue').click();
  await page.waitForFunction(()=>window.gameDiagnostics().paused&&window.gameDiagnostics().m01?.vegetation?.treeCount===85,null,{timeout:120000});
  await expect(page.locator('#pause')).toBeVisible();
}
async function lookAt(page,target){
  const p=await page.evaluate(()=>window.gameDiagnostics().player),dx=target.x-p.x,dz=target.z-p.z;
  const angle=Math.atan2(dz,dx),pitch=Math.atan2((target.y??p.y+5)-p.y-1.6,Math.hypot(dx,dz));
  const turn=Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle));
  await page.evaluate(({x,y})=>{
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0,bubbles:true}));
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true}));
  },{x:turn/.0022,y:(p.pitch-pitch)/.0022});
  await page.waitForFunction(angle=>Math.abs(Math.atan2(Math.sin(window.gameDiagnostics().player.angle-angle),Math.cos(window.gameDiagnostics().player.angle-angle)))<.035,angle);
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
  expect(vh.treeCount).toBe(85);expect(vh.solidTreeCount).toBe(17);expect(vh.visualTreeCount).toBe(68);expect(vh.tracked.m01_tree_0).toBe('near');
  expect(vh.lod.near+vh.lod.mid+vh.lod.far).toBe(85);expect(vh.leafCards).toBeGreaterThan(0);
  expect(vh.leafCards).toBeLessThanOrEqual(170);expect(vh.alphaCardReductionApprox).toBeGreaterThan(.88);
  await page.screenshot({path:info.outputPath('CANDIDATE-B-rail-sappers-high.png'),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});

  await page.locator('#back-menu').click();await page.waitForFunction(()=>window.gameDiagnostics().paused);
  await page.locator('#quality').selectOption('low');await freezeContinue(page);
  const low=await page.evaluate(()=>window.gameDiagnostics()),vl=low.m01.vegetation;
  expect(low.player.x).toBeCloseTo(high.player.x,6);expect(low.player.z).toBeCloseTo(high.player.z,6);
  expect(low.player.angle).toBeCloseTo(high.player.angle,6);expect(vl.treeCount).toBe(85);expect(vl.leafCards).toBe(0);expect(vl.tracked.m01_tree_0).toBe('mid');
  expect(vl.treeTriangles).toBeLessThan(vh.treeTriangles);expect(vl.treeDrawCalls).toBeLessThanOrEqual(vh.treeDrawCalls);
  await page.screenshot({path:info.outputPath('CANDIDATE-B-rail-sappers-low.png'),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
  await info.attach('vegetation-fixed-camera-counters',{body:JSON.stringify({high:{total:{drawCalls:high.drawCalls,triangles:high.triangles,textures:high.textures,geometries:high.geometries},vegetation:vh},low:{total:{drawCalls:low.drawCalls,triangles:low.triangles,textures:low.textures,geometries:low.geometries},vegetation:vl}},null,2),contentType:'application/json'});
  expect(watch.errors).toEqual([]);expect(watch.failed).toEqual([]);
});

test('Medium keeps volumetric near and distant battlefield vegetation without changing gameplay state',async({page},info)=>{
  test.setTimeout(120000);
  const watch=await observe(page);
  await page.addInitScript(()=>localStorage.setItem('cod-guerra:visual-quality','medium'));
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#quality').selectOption('medium');await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.keyboard.press('Space');await page.waitForFunction(()=>window.gameDiagnostics().m01?.vegetation?.treeCount===85);
  const before=await page.evaluate(()=>window.gameDiagnostics());

  await lookAt(page,{x:-36,z:-9,y:5});await capture(page,info,'AFTER-near-tree-medium.png');
  await page.locator('#resume').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  await lookAt(page,{x:-520,z:-150,y:6});await capture(page,info,'AFTER-battlefield-far-medium.png');
  const after=await page.evaluate(()=>window.gameDiagnostics());
  expect(after.player.x).toBeCloseTo(before.player.x,5);expect(after.player.z).toBeCloseTo(before.player.z,5);
  expect(after.m01.vegetation.treeCount).toBe(85);
  expect(after.m01.vegetation.lod.near).toBeGreaterThan(0);expect(after.m01.vegetation.lod.mid).toBeGreaterThan(0);expect(after.m01.vegetation.lod.far).toBeGreaterThan(0);
  await info.attach('vegetation-medium-counters',{body:JSON.stringify({before:{player:before.player,vegetation:before.m01.vegetation},after:{player:after.player,vegetation:after.m01.vegetation}},null,2),contentType:'application/json'});
  expect(watch.errors).toEqual([]);expect(watch.failed).toEqual([]);
});
