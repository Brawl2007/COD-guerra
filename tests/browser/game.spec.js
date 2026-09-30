import { test, expect } from '@playwright/test';

async function open(page){
  const errors=[],failed=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url()}`);});
  await page.goto('?debug=1');
  await expect(page.locator('#start')).toBeVisible();
  await page.waitForFunction(()=>window.gameDiagnostics?.().models.length===3);
  await expect(page.locator('#error')).toBeHidden();
  return {errors,failed};
}
async function start(page){
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.pointerLockElement?.id==='game');
  await page.waitForFunction(()=>window.gameDiagnostics().clock>.05);
  await expect(page.locator('#hud')).toBeVisible();
}

test('production prefix loads assets; real click captures mouse; shooting, reload and pause work',async({page},info)=>{
  const {errors,failed}=await open(page);
  await page.screenshot({path:info.outputPath('menu.png')});
  await page.locator('#quality').selectOption('medium');
  expect((await page.evaluate(()=>window.gameDiagnostics())).quality).toBe('medium');
  await start(page);
  await page.mouse.click(640,360);
  await expect(page.locator('#mag')).toHaveText('14');
  await page.keyboard.press('KeyR');
  await expect(page.locator('#mag')).toHaveText('—');
  await page.evaluate(()=>document.exitPointerLock());
  await expect(page.locator('#pause')).toBeVisible();
  const paused=await page.evaluate(()=>window.gameDiagnostics().clock);
  await page.waitForTimeout(400);
  expect(await page.evaluate(()=>window.gameDiagnostics().clock)).toBe(paused);
  await page.locator('#resume').click();
  await page.waitForFunction(()=>document.pointerLockElement?.id==='game');
  await expect(page.locator('#mag')).toHaveText('15',{timeout:12000});
  await expect(page.locator('#reserve')).toHaveText('59');
  await page.screenshot({path:info.outputPath('playing.png')});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('real keyboard movement reaches and stores checkpoint; restart and page reload restore it',async({page},info)=>{
  const {errors,failed}=await open(page);await start(page);
  const initial=await page.evaluate(()=>window.gameDiagnostics().player);
  // Initial facing is east. Strafe south along the open western road to checkpoint.
  await page.keyboard.down('KeyD');
  await page.waitForFunction(()=>window.gameDiagnostics().player.y>=600,null,{timeout:20000});
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>window.gameDiagnostics().missionPhase===1,null,{timeout:10000});
  await page.keyboard.up('KeyW');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cod-guerra:checkpoint:v1')));
  expect(saved.mission.phase).toBe(1);expect(saved.player.y).toBeGreaterThan(initial.y);
  await page.evaluate(()=>document.exitPointerLock());
  await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>document.pointerLockElement?.id==='game');
  await page.evaluate(()=>document.exitPointerLock());
  const restored=await page.evaluate(()=>window.gameDiagnostics());
  expect(restored.missionPhase).toBe(1);
  expect(restored.player.x).toBeCloseTo(saved.player.x,4);
  expect(restored.player.y).toBeCloseTo(saved.player.y,4);
  await page.screenshot({path:info.outputPath('checkpoint.png')});
  await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().models.length===3);
  await expect(page.locator('#continue')).toBeVisible();
  await page.locator('#continue').click();
  await page.waitForFunction(()=>document.pointerLockElement?.id==='game');
  expect((await page.evaluate(()=>window.gameDiagnostics())).missionPhase).toBe(1);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('corrupt checkpoint is explained and a new mission remains available',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('cod-guerra:checkpoint:v1','invalid-json'));
  await open(page);await page.locator('#continue').click();
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#error-text')).toContainText('checkpoint');
  await page.locator('#close-error').click();await start(page);
});

test('missing models are reported and procedural fallback keeps the area playable',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/assets/models/**',route=>route.fulfill({status:404,body:'missing test asset'}));
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().assetFailures.length===3);
  expect((await page.evaluate(()=>window.gameDiagnostics())).models).toEqual([]);
  await expect(page.locator('#error')).toBeHidden();await start(page);
  await page.mouse.click(640,360);await expect(page.locator('#mag')).toHaveText('14');
  await page.screenshot({path:info.outputPath('fallback.png')});
  expect(errors).toEqual([]);
});
