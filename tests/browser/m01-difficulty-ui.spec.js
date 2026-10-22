import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';
const key='cod-guerra:checkpoint:m01:v2';
test.describe.configure({timeout:180000});
const errors=new WeakMap();
test.beforeEach(async({page})=>{const list=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
async function ready(page){await page.goto('?debug=1&visual-verify=1');await page.waitForFunction(()=>typeof window.gameVerificationState==='function');await expect(page.locator('#start')).toBeEnabled({timeout:90000});}
const level=page=>page.evaluate(()=>window.gameVerificationState().snapshot.difficulty??'recruta');
async function pause(page){await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();}
test('new mission defaults to Soldado and every selected level reaches the real simulation',async({page},info)=>{
 await page.addInitScript(()=>{localStorage.setItem('cod-guerra:visual-quality','high');localStorage.removeItem('cod-guerra:difficulty');});
 await ready(page);await expect(page.locator('#difficulty')).toHaveValue('soldado');
 await page.locator('#difficulty').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('difficulty-menu-high.png')});
 for(const id of ['soldado','veterano','recruta']){
  await page.locator('#difficulty').selectOption(id);await page.locator('#start').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
  expect(await level(page)).toBe(id);await pause(page);
  await expect(page.locator('#pause-objective')).toContainText(id[0].toUpperCase()+id.slice(1));
  await page.locator('#back-menu').click();
 }
 expect(await page.evaluate(()=>localStorage.getItem('cod-guerra:difficulty'))).toBe('recruta');
 await page.locator('#mission-select').selectOption('sandbox-1944');await expect(page.locator('#difficulty-control')).toBeHidden();
 await page.locator('#mission-select').selectOption('m01_tczew');await expect(page.locator('#difficulty-control')).toBeVisible();
});
test('legacy checkpoint wins over Veterano preference and its continue card says Recruta',async({page},info)=>{
 const d=driver();d.step({skip:true});const saved=d.sim.snapshot();expect(saved.difficulty).toBeUndefined();
 await page.addInitScript(({key,saved})=>{localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('cod-guerra:difficulty','veterano');localStorage.setItem('cod-guerra:visual-quality','low');},{key,saved});
 await ready(page);await expect(page.locator('#difficulty')).toHaveValue('veterano');await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
 expect(await level(page)).toBe('recruta');await expect(page.locator('#resume-card')).toContainText('Recruta');await pause(page);
 await expect(page.locator('#pause-objective')).toContainText('Recruta');await page.screenshot({path:info.outputPath('legacy-recruta-pause.png')});
});
test.describe('mobile difficulty',()=>{
 test.use({viewport:{width:896,height:414},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 test('selector stays reachable on a short touch screen and checkpoint reports Soldado',async({page},info)=>{
  await ready(page);await page.locator('#difficulty').scrollIntoViewIfNeeded();await expect(page.locator('#difficulty')).toBeVisible();
  await page.locator('#difficulty').selectOption('soldado');const box=await page.locator('#difficulty').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(896);
  await page.screenshot({path:info.outputPath('difficulty-mobile-menu.png')});await page.locator('#start').tap();await expect(page.locator('#touch-controls')).toBeVisible();
  await page.locator('#tb-skip').tap();await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'),null,{timeout:30000});await expect(page.locator('#checkpoint-name')).toContainText('Soldado');
  await page.locator('#tb-pause').tap();await expect(page.locator('#pause-objective')).toContainText('Soldado');await page.locator('#resume').scrollIntoViewIfNeeded();await expect(page.locator('#resume')).toBeVisible();
 });
});
