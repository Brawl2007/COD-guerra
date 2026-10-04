import { test, expect } from '@playwright/test';
import {installBrowserHarness,finalizeBrowserHarness,forceAssetFailure,waitForState,waitForPointerLockRunning} from './helpers/harness.js';

test.beforeEach(async({page})=>{installBrowserHarness(page);});
test.afterEach(async({page},info)=>{await finalizeBrowserHarness(page,info);});

async function open(page){
  const errors=[],failed=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failed.push(`${response.status()} ${response.url()}`);});
  await page.goto('?debug=1&mission=sandbox-1944');
  await expect(page.locator('#start')).toBeVisible();
  await waitForState(page,'sandbox-models-ready',()=>window.gameDiagnostics?.().models.length===3,null,{timeout:30000});
  await expect(page.locator('#error')).toBeHidden();
  return {errors,failed};
}
async function start(page){
  await page.locator('#start').click();
  await waitForPointerLockRunning(page,'sandbox-start-pointer-lock',{timeout:15000});
  await expect(page.locator('#hud')).toBeVisible();
}

test('production prefix loads assets; real click captures mouse; shooting, reload and pause work',async({page},info)=>{
  const {errors,failed}=await open(page);
  await page.screenshot({path:info.outputPath('menu.png')});
  await page.locator('#quality').selectOption('medium');
  expect((await page.evaluate(()=>window.gameDiagnostics())).quality).toBe('medium');
  await start(page);
  const orientation=await page.evaluate(()=>window.gameDiagnostics().player);
  expect(orientation.angle).toBe(0);expect(orientation.pitch).toBe(0);
  // Headless absolute mouse moves generate cancelling cursor-recentring pairs.
  // Exercise relative look through DOM events; other controls use real browser input.
  await page.evaluate(()=>{
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0}));
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:12,movementY:8}));
  });
  await waitForState(page,'sandbox-relative-look',({angle,pitch})=>{
    const player=window.gameDiagnostics().player;
    return player.angle!==angle&&player.pitch!==pitch;
  },orientation,{timeout:12000});
  // Keep the locked cursor in place; an absolute move is not relative game input.
  await page.mouse.down();await page.mouse.up();
  await expect(page.locator('#mag')).toHaveText('14');
  await page.keyboard.press('KeyR');
  await expect(page.locator('#mag')).toHaveText('—');
  await page.evaluate(()=>document.exitPointerLock());
  await expect(page.locator('#pause')).toBeVisible();
  const paused=await page.evaluate(()=>window.gameDiagnostics().clock);
  const pausedPlayer=await page.evaluate(()=>window.gameDiagnostics().player);
  await page.waitForTimeout(400);
  expect(await page.evaluate(()=>window.gameDiagnostics().clock)).toBe(paused);
  await page.locator('#resume').click();
  await waitForPointerLockRunning(page,'sandbox-resume-pointer-lock',{timeout:15000});
  // Reload duration advances on simulation time. Under software WebGL the page can render
  // slower than wall time; wait for both clock progress and the authoritative HUD result
  // instead of a bare 12 s locator timeout that has produced a false red just before READY.
  await waitForState(page,'sandbox-reload-complete',pausedClock=>{
    const g=window.gameDiagnostics?.();
    return Boolean(g&&g.clock>pausedClock+.05&&document.querySelector('#mag')?.textContent==='15'&&document.querySelector('#reserve')?.textContent==='59');
  },paused,{timeout:30000});
  await expect(page.locator('#mag')).toHaveText('15');
  await expect(page.locator('#reserve')).toHaveText('59');
  const resumedPlayer=await page.evaluate(()=>window.gameDiagnostics().player);
  expect(resumedPlayer.angle).toBeCloseTo(pausedPlayer.angle,4);
  expect(resumedPlayer.pitch).toBeCloseTo(pausedPlayer.pitch,4);
  await page.screenshot({path:info.outputPath('playing.png')});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('real keyboard movement reaches and stores checkpoint; restart and page reload restore it',async({page},info)=>{
  const {errors,failed}=await open(page);await start(page);
  const initial=await page.evaluate(()=>window.gameDiagnostics().player);
  expect(initial.angle).toBe(0);expect(initial.pitch).toBe(0);
  // Initial facing is east. Strafe south along the open western road to checkpoint.
  await page.keyboard.down('KeyD');
  await waitForState(page,'sandbox-checkpoint-south-movement',()=>window.gameDiagnostics().player.y>=600,null,{timeout:process.env.CI?120000:20000});
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyW');
  await waitForState(page,'sandbox-checkpoint-phase-1',()=>window.gameDiagnostics().missionPhase===1,null,{timeout:process.env.CI?30000:10000});
  await page.keyboard.up('KeyW');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cod-guerra:checkpoint:v1')));
  expect(saved.mission.phase).toBe(1);expect(saved.player.y).toBeGreaterThan(initial.y);
  await page.evaluate(()=>document.exitPointerLock());
  await page.locator('#restart-checkpoint').click();
  await waitForPointerLockRunning(page,'sandbox-restart-checkpoint',{timeout:15000});
  await page.evaluate(()=>document.exitPointerLock());
  const restored=await page.evaluate(()=>window.gameDiagnostics());
  expect(restored.missionPhase).toBe(1);
  expect(restored.player.x).toBeCloseTo(saved.player.x,4);
  expect(restored.player.y).toBeCloseTo(saved.player.y,4);
  await page.screenshot({path:info.outputPath('checkpoint.png')});
  await page.reload();await waitForState(page,'sandbox-models-ready',()=>window.gameDiagnostics?.().models.length===3,null,{timeout:30000});
  await expect(page.locator('#continue')).toBeVisible();
  await page.locator('#continue').click();
  await waitForPointerLockRunning(page,'sandbox-continue-after-reload',{timeout:15000});
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
  await forceAssetFailure(page,'**/assets/models/**',{label:'sandbox-required-models',body:'missing test asset'});
  await page.goto('?debug=1&mission=sandbox-1944');
  await waitForState(page,'sandbox-procedural-fallback-assets',()=>window.gameDiagnostics?.().assetFailures.length===3,null,{timeout:30000});
  expect((await page.evaluate(()=>window.gameDiagnostics())).models).toEqual([]);
  await expect(page.locator('#error')).toBeHidden();await start(page);
  await page.mouse.down();await page.mouse.up();await expect(page.locator('#mag')).toHaveText('14');
  await page.screenshot({path:info.outputPath('fallback.png')});
  expect(errors).toEqual([]);
});
