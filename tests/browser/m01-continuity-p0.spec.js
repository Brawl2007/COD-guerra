import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {driver,toRepair,toCoverAdjustment} from '../helpers/m01-route.js';
import {coverOrder} from '../../src/game/m01-cover-guidance.js';
const key='cod-guerra:checkpoint:m01:v2';
test.describe.configure({timeout:180000});
async function boot(page,snapshot,{quality='high',touch=false}={}){
 await page.addInitScript(({key,snapshot,quality})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,snapshot,quality});
 await page.goto('?debug=1&visual-verify=1'+(touch?'&touch=1':''));await expect(page.locator('#start')).toBeEnabled({timeout:90000});
 await page.waitForFunction(()=>window.gameDiagnostics?.()?.m01?.characters.loaded.includes('fp:0'));
 await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
}
async function capture(page,info,name){
 await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();else window.dispatchEvent(new Event('blur'));});await expect(page.locator('#pause')).toBeVisible();
 await page.screenshot({path:info.outputPath(name+'.png'),style:'#pause,#resume-card,#fade{visibility:hidden!important}'});
 const data=await page.evaluate(()=>({diagnostics:window.gameDiagnostics(),state:window.gameVerificationState()}));writeFileSync(info.outputPath(name+'.json'),JSON.stringify(data,null,2));return data;
}
test('crate pickup renders articulated hands in the production High weapon pass',async({page},info)=>{
 let before=null,last=null;
 toRepair(driver(19390901,{onStep:({sim})=>{if(!before&&sim.player.carrying==='sapper_crate')before=last;last=sim.snapshot();}}));
 expect(before).toBeTruthy();await boot(page,before);
 await expect(page.locator('#interaction')).toContainText('carregar material');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.cargo==='sapper_crate');
 const data=await capture(page,info,'crate-high'),v=data.diagnostics.m01.viewModel;
 expect(v.carryFrame.kind).toBe('crate');expect(v.drawnMeshes.some(m=>m.name==='fp_hands')).toBe(true);
 expect(v.native.meshes.some(m=>m.name==='rifle')).toBe(false);expect(v.native.triangles).toBeLessThanOrEqual(6000);
 expect(data.state.snapshot.player.carrying).toBe('sapper_crate');
});
test('real cover salvo guides to another playable position and reduces the marker on arrival',async({page},info)=>{
 const d=toCoverAdjustment(),s=d.sim,order=coverOrder(s);expect(order.arrived).toBe(false);
 // The fixture is reached by normal simulation controls. Only the final metres run in this browser.
 for(const [x,z]of [[-115,32],[-30,40],[-10,40],[order.point.x-3,order.point.z]])d.walk(x,z);
 expect(coverOrder(s).arrived).toBe(false);expect(s.active('hold_access')).toBe(true);
 await boot(page,s.snapshot());await expect(page.locator('.objective-marker .marker-label')).toContainText('Mude para');
 await capture(page,info,'cover-order-high');await page.locator('#resume').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
 await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>/Na posição indicada/.test(window.gameDiagnostics().m01.hudStatus));await page.keyboard.up('KeyW');
 const arrived=await capture(page,info,'cover-arrival-high');
 const {M01Simulation}=await import('../../src/game/m01-simulation.js');const check=new M01Simulation();check.restoreSnapshot(arrived.state.snapshot);
 writeFileSync(info.outputPath('arrival-check.json'),JSON.stringify({order:coverOrder(check),marker:check.objectiveMarker,status:arrived.diagnostics.m01.hudStatus,presentation:arrived.diagnostics.m01.hudPresentation},null,2));
 expect(check.objectiveMarker).toBe(null);
 await expect(page.locator('.objective-marker')).toHaveCSS('opacity','0');
});

test('west demolition pre-roll never exposes an internal staging direction',async({page},info)=>{
 const {route}=await import('../helpers/m01-route.js');let before=null;
 route(19390901,{onStep:({sim})=>{if(!before&&sim.battleClock>=6*3600+44*60+58.7&&!sim.consumedEvent('evt_m01_west_demolition'))before=sim.snapshot();}});
 expect(before).toBeTruthy();await boot(page,before);
 await page.waitForFunction(()=>window.gameDiagnostics().m01.battleClock>=6*3600+45*60);
 await expect(page.locator('#message')).not.toContainText('Zieliński abaixa');
 await expect(page.locator('#message')).not.toContainText('se o jogador');
 await capture(page,info,'west-preroll-high');
});

test.describe('mobile rescue',()=>{
 test.use({viewport:{width:896,height:414},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 test('touch interaction delivers Bąk and the HUD switches to the next objective',async({page},info)=>{
  const {carryViews}=await import('../../tools/verification/m01-t40-views.mjs');
  await boot(page,carryViews().beforePutdown,{touch:true});
  await expect(page.locator('#interaction')).toContainText('entregar Bąk');
  await expect(page.locator('.objective-marker')).toHaveCSS('opacity','0');
  await expect(page.locator('#touch-controls')).toBeVisible();await page.locator('#tb-interact').tap();
  await page.waitForFunction(()=>window.gameDiagnostics().m01.flags['m01.bak_status']==='rescued_by_player');
  await expect(page.locator('#interaction')).not.toContainText('entregar Bąk');
  await expect(page.locator('#message')).toContainText('Bąk entregue');
  await page.locator('#tb-pause').tap();await capture(page,info,'mobile-bak-delivered');
  expect(await page.evaluate(()=>document.pointerLockElement)).toBeNull();
 });
});

test('short-screen rescue guidance stays below the objective panel before E becomes available',async({page},info)=>{
 await page.setViewportSize({width:640,height:360});
 const {carryViews}=await import('../../tools/verification/m01-t40-views.mjs');const d=driver();d.sim.restoreSnapshot(carryViews().beforePutdown);
 const aid=d.sim.world.point('aid_position');d.walk(aid.x-6,aid.z);expect(d.sim.player.carrying).toBe('jozef_bak');expect(d.sim.interaction).not.toMatch(/^E ·/);
 await boot(page,d.sim.snapshot(),{quality:'low'});await expect(page.locator('#hud')).toHaveClass(/compact-guidance/);
 const panel=await page.locator('#objective').boundingBox(),marker=await page.locator('.objective-marker').boundingBox();
 expect(marker.y).toBeGreaterThanOrEqual(panel.y+panel.height+8);await expect(page.locator('.objective-marker .marker-label')).toBeHidden();
 await expect(page.locator('.objective-marker')).toHaveCSS('opacity','1');await capture(page,info,'rescue-guidance-small');
});
