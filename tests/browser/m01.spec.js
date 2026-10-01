import {test,expect} from '@playwright/test';
import {route} from '../helpers/m01-route.js';

let result;
const flow=()=>result??=route();
const key='cod-guerra:checkpoint:m01:v2';
test.afterEach(async({page},info)=>{
  if(info.status===info.expectedStatus||page.isClosed())return;
  try{await info.attach('m01-diagnostics',{body:JSON.stringify(await page.evaluate(()=>window.gameDiagnostics?.())),contentType:'application/json'});}catch{/* Trace remains available after a timeout. */}
});
async function open(page){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#start')).toBeEnabled();
  return {errors,failed};
}
async function start(page,button='#start'){
  await page.locator(button).click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>.05&&document.pointerLockElement?.id==='game');
  if(button==='#start'){
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'));
  }
}
test('M01 loads the nine bridge LODs; real controls operate bolt, clip, sight, aiming, pause and CP-A',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  const {errors,failed}=await open(page);await page.screenshot({path:info.outputPath('m01-menu.png')});await start(page);
  const initial=await page.evaluate(()=>window.gameDiagnostics());
  expect(initial.missionId).toBe('m01_tczew');expect(initial.m01.visiblePieces).toBeGreaterThan(40);expect(initial.player.angle).toBe(0);
  // One native double-click before reading the HUD. Separate remote assertions/clicks
  // can outlast the 1.05 s bolt cycle on CI, so they cannot assert a timed refusal.
  await page.mouse.dblclick(640,360,{delay:0});await expect(page.locator('#mag')).toHaveText('4');
  for(let i=1;i<5;i++){
    await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');
    await page.mouse.down();await page.mouse.up();await expect(page.locator('#mag')).toHaveText(String(4-i));
  }
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');
  await page.keyboard.press('KeyR');await expect(page.locator('#mag')).toHaveText('—');
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.gameDiagnostics());await page.waitForTimeout(350);
  const still=await page.evaluate(()=>window.gameDiagnostics());expect(still.clock).toBe(frozen.clock);expect(still.m01.battleClock).toBe(frozen.m01.battleClock);expect(still.m01.weapon).toEqual(frozen.m01.weapon);
  await page.locator('#resume').click();await expect(page.locator('#mag')).toHaveText('5',{timeout:15000});await expect(page.locator('#reserve')).toHaveText('35');
  await page.keyboard.press('KeyV');await expect(page.locator('#weapon-state')).toContainText('500 m');
  await page.mouse.down({button:'right'});await expect(page.locator('#crosshair')).toBeHidden();await page.mouse.up({button:'right'});
  await page.screenshot({path:info.outputPath('m01-playing.png')});
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#restart-checkpoint').click();
  await expect(page.locator('#reserve')).toHaveText('40');await expect(page.locator('#mag')).toHaveText('5');
  await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await expect(page.locator('#continue')).toBeVisible();await start(page,'#continue');
  expect((await page.evaluate(()=>window.gameDiagnostics())).m01.checkpoints).toEqual(['cp_m01_a_orientacao']);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('real keyboard movement traverses the approaches and E delivers the message at the rail bridge',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:130000);
  const {errors,failed}=await open(page);await start(page);await page.keyboard.down('ShiftLeft');
  async function axis(code,axis,target,direction){
    await page.keyboard.down(code);
    await page.waitForFunction(({axis,target,direction})=>window.gameDiagnostics().player[axis]*direction>=target*direction,{axis,target,direction},{timeout:process.env.CI?90000:45000});
    await page.keyboard.up(code);
  }
  await axis('KeyD','z',32,1);await axis('KeyW','x',-15,1);await axis('KeyA','z',2,-1);await axis('KeyW','x',15,1);
  await page.keyboard.up('ShiftLeft');await expect(page.locator('#interaction')).toContainText('entregar mensagem');
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.gameDiagnostics().m01.objectives.obj_m01_deliver_message.state==='done');
  const data=await page.evaluate(()=>window.gameDiagnostics());expect(data.m01.battleClock).toBeGreaterThanOrEqual(4*3600+33*60+10);expect(data.eventIds).toContain('evt_m01_planes_heard');
  await page.screenshot({path:info.outputPath('m01-message-delivered.png')});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('a genuine CP-D reload keeps east destruction and casualties, including restart and page reload',async({page},info)=>{
  const snapshot=flow().checkpoints.cp_m01_d_retirada;
  await page.addInitScript(({key,snapshot})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(snapshot));},{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  let d=await page.evaluate(()=>window.gameDiagnostics());expect(d.eventIds).toContain('evt_m01_east_demolition');expect(d.m01.enemyAlive).toBe(46);expect(d.m01.flags['m01.nowicki_status']).toBe('missing');
  expect(d.m01.parts.road_span_06.visible).toBe(false);expect(d.m01.parts.rail_support_06.visible).toBe(false);
  await page.screenshot({path:info.outputPath('m01-cp-d.png')});await page.evaluate(()=>document.exitPointerLock());
  await page.locator('#restart-checkpoint').click();await page.waitForFunction(()=>document.pointerLockElement?.id==='game');
  d=await page.evaluate(()=>window.gameDiagnostics());expect(d.m01.enemyAlive).toBe(46);expect(d.player.x).toBeCloseTo(snapshot.player.x,2);
  await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);await start(page,'#continue');
  expect((await page.evaluate(()=>window.gameDiagnostics())).m01.parts.road_span_06.visible).toBe(false);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('the actual outro state can be skipped through the UI into the enabled historical debrief',async({page},info)=>{
  // Staged browser continuation of a snapshot reached by the full simulation route.
  // This is not an uninterrupted browser playthrough.
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:flow().outro});
  const {errors,failed}=await open(page);await start(page,'#continue');await expect(page.locator('#interaction')).toContainText('saltar cena');
  await page.keyboard.press('Space');await expect(page.locator('#complete')).toBeVisible();
  expect(await page.locator('#debrief p').count()).toBe(8);await expect(page.locator('#debrief')).toContainText('06:45');await expect(page.locator('#debrief')).toContainText('personagens fictícios');
  const d=await page.evaluate(()=>window.gameDiagnostics());expect(d.complete).toBe(true);expect(d.m01.flags['m01.completed']).toBe(true);expect(d.m01.parts.road_span_01.visible).toBe(false);expect(d.m01.parts.road_portal_west.visible).toBe(false);
  await page.screenshot({path:info.outputPath('m01-debrief.png')});expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('the real roll-call snapshot renders seated actors and keeps their pose after page reload',async({page},info)=>{
  // Visual verification by continuation of a snapshot reached with simulation controls.
  const snapshot=flow().outro,seated=snapshot.actors.filter(a=>a.active&&a.alive&&a.pose==='seated').length;
  expect(seated).toBeGreaterThanOrEqual(6);
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await page.waitForFunction(n=>window.gameDiagnostics().m01.actorPoses.seated===n,seated);
  await page.screenshot({path:info.outputPath('m01-roll-call-seated.png')});
  await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await start(page,'#continue');await page.waitForFunction(n=>window.gameDiagnostics().m01.actorPoses.seated===n,seated);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('a failed M01 bridge load prevents an invisible bridge; the French sandbox remains selectable',async({page})=>{
  await page.route('**/*.glb',r=>r.fulfill({status:404,body:'missing M01 test asset'}));
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.assetFailures.length===9);
  await expect(page.locator('#error')).toBeVisible();await expect(page.locator('#start')).toBeDisabled();
  await page.locator('#close-error').click();await page.locator('#mission-select').selectOption('sandbox-1944');
  await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused);await expect(page.locator('#weapon-name')).toHaveText('M1 CARBINE');
});
