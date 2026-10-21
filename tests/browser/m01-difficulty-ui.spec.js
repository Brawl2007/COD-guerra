import {test,expect} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';

// H9 D5: menu selector, pause line and HUD badge in the real page. The UI only passes the level; the simulation owns it.
// Verifies presentation and wiring; not a playtest of the difficulty tuning.
const key='cod-guerra:checkpoint:m01:v2';
async function open(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await expect(page.locator('#start')).toBeEnabled({timeout:60000});return errors;
}
const level=page=>page.evaluate(()=>window.gameDiagnostics().difficulty);
async function begin(page){
  await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
}
async function pause(page){await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();}

test('a new game defaults to soldado, shows it in Portuguese, and the chosen level reaches the simulation',async({page})=>{
  test.setTimeout(process.env.CI?180000:90000);
  await page.addInitScript(k=>localStorage.removeItem(k),key);
  const errors=await open(page);
  await expect(page.locator('#difficulty')).toHaveValue('soldado');
  expect(await page.locator('#difficulty option').allTextContents()).toEqual(['Recruta','Soldado','Veterano']);
  await begin(page);expect(await level(page)).toBe('soldado');
  await expect(page.locator('#difficulty-badge')).toHaveText('SOLDADO');
  await pause(page);await expect(page.locator('#pause-difficulty')).toHaveText('Dificuldade: Soldado');
  await page.locator('#back-menu').click();await expect(page.locator('#menu')).toBeVisible();
  await page.locator('#difficulty').selectOption('veterano');
  await begin(page);expect(await level(page)).toBe('veterano');
  await expect(page.locator('#difficulty-badge')).toHaveText('VETERANO');
  await pause(page);await expect(page.locator('#pause-difficulty')).toHaveText('Dificuldade: Veterano');
  await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused);expect(await level(page)).toBe('veterano');
  await pause(page);await page.locator('#back-menu').click();
  await page.locator('#difficulty').selectOption('recruta');
  await begin(page);expect(await level(page)).toBe('recruta');
  await pause(page);await expect(page.locator('#pause-difficulty')).toHaveText('Dificuldade: Recruta');
  expect(errors).toEqual([]);
});

test('continuing a checkpoint keeps the difficulty of the save, whatever the selector says',async({page})=>{
  test.setTimeout(process.env.CI?180000:90000);
  const save=JSON.stringify(new M01Simulation(undefined,{difficulty:'veterano'}).snapshot());
  await page.addInitScript(([k,v])=>localStorage.setItem(k,v),[key,save]);
  const errors=await open(page);
  await page.locator('#difficulty').selectOption('recruta');
  await expect(page.locator('#continue')).toBeVisible();await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  expect(await level(page)).toBe('veterano');await expect(page.locator('#difficulty-badge')).toHaveText('VETERANO');
  await pause(page);await expect(page.locator('#pause-difficulty')).toHaveText('Dificuldade: Veterano');
  expect(errors).toEqual([]);
});
