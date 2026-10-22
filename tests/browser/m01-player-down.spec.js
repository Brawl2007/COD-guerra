import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {repairWaterView} from '../../tools/verification/m01-d3-views.mjs';
const key='cod-guerra:checkpoint:m01:v2';
const state=page=>page.evaluate(()=>({d:window.gameDiagnostics(),s:window.gameVerificationState().snapshot}));
test.describe.configure({timeout:180000});
async function run(page,info,touch=false){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const saved=repairWaterView();
 await page.addInitScript(({key,saved})=>{localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('cod-guerra:visual-quality','low');},{key,saved});
 await page.goto('?debug=1&visual-verify=1'+(touch?'&touch=1':''));await expect(page.locator('#continue')).toBeEnabled({timeout:90000});
 await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
 let session;
 if(touch){session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:100,y:330}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:100,y:255}]});}
 else await page.keyboard.down('KeyW');
 await page.waitForFunction(()=>window.gameDiagnostics().m01.playerDown!==null,null,{timeout:90000,polling:25});
 if(touch)await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.keyboard.up('KeyW');
 // Pause through the real control-loss/blur handlers, without altering the game state.
 await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();else window.dispatchEvent(new Event('blur'));});
 await expect(page.locator('#pause')).toBeVisible();await expect(page.locator('#hud')).toHaveClass(/player-down/);
 const down=await state(page);expect(down.s.player.alive).toBe(false);expect(down.d.m01.playerDown.cause).toBe('Você caiu no Vístula.');expect(down.d.m01.playerDown.by).toBeNull();
 await expect(page.locator('#title-card')).toContainText('Você caiu no Vístula.');await expect(page.locator('#title-card')).toContainText('CP-B2');await expect(page.locator('#title-card')).toContainText('Soldado');
 if(touch)await expect(page.locator('#touch-controls')).toBeHidden();
 await page.screenshot({path:info.outputPath('actual-water-cause.png'),style:'#pause{visibility:hidden!important}'});
 await page.waitForTimeout(2800);const frozen=await state(page);expect(frozen.s).toEqual(down.s);expect(frozen.d.m01.playerDown.elapsedMs).toBe(down.d.m01.playerDown.elapsedMs);
 await page.locator('#resume').click();await page.waitForFunction(()=>window.gameDiagnostics().m01.playerDown===null&&!window.gameDiagnostics().paused);
 const restored=await state(page);expect(restored.s.player.alive).toBe(true);expect(restored.s.player.health).toBe(100);expect(restored.s.checkpointsReached.at(-1)).toBe('cp_m01_b2_reparo');expect(restored.s.difficulty).toBe('soldado');
 expect(restored.s.objectives.obj_m01_cover_repair.state).toBe('active');expect(Math.hypot(restored.s.player.x-saved.resumeCheckpoint.player.x,restored.s.player.z-saved.resumeCheckpoint.player.z)).toBeLessThan(.1);
 await expect(page.locator('#hud')).not.toHaveClass(/player-down/);await expect(page.locator('#message')).not.toContainText('Você caiu');
 if(touch)await expect(page.locator('#touch-controls')).toBeVisible();
 await page.screenshot({path:info.outputPath('actual-repair-restored.png')});
 writeFileSync(info.outputPath('down-restore.json'),JSON.stringify({fixture:{method:'normal simulation route and controls; Continue load; real forward input causes water death',start:[saved.player.x,saved.player.y,saved.player.z]},down,frozen,restored,errors},null,2));expect(errors).toEqual([]);
}
test('desktop: actual water death pauses presentation and restores the real repair checkpoint',async({page},info)=>run(page,info));
test.describe('touch',()=>{test.use({viewport:{width:896,height:414},hasTouch:true,isMobile:true,deviceScaleFactor:1});test('actual death disables touch controls and restores them with CP-B2',async({page},info)=>run(page,info,true));});
test('E delivers the real crate, persists CP-B2 and Continue resumes its actual objective',async({page},info)=>{
 const {repairDeliveryView}=await import('../../tools/verification/m01-d3-views.mjs');const saved=repairDeliveryView(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,saved})=>{if(sessionStorage.getItem('codex-d3-delivery-seeded'))return;sessionStorage.setItem('codex-d3-delivery-seeded','1');localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('cod-guerra:visual-quality','low');},{key,saved});
 await page.goto('?debug=1&visual-verify=1');await expect(page.locator('#continue')).toBeEnabled({timeout:90000});await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
 await expect(page.locator('#interaction')).toContainText('entregar material');await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.at(-1)==='cp_m01_b2_reparo');await expect(page.locator('#checkpoint-name')).toContainText('CP-B2 · Reparo · Soldado');
 const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(persisted.checkpointsReached.at(-1)).toBe('cp_m01_b2_reparo');expect(persisted.dialogueConsumed).toContain('dlg_m01_024');expect(persisted.player.carrying).toBeNull();
 await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();await page.screenshot({path:info.outputPath('delivery-checkpoint.png'),style:'#pause{visibility:hidden!important}'});
 writeFileSync(info.outputPath('persisted-before-reload.json'),JSON.stringify(persisted,null,2));
 await page.reload();await expect(page.locator('#continue')).toBeEnabled({timeout:90000});await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
 const continued=await state(page);expect(continued.s.checkpointsReached.at(-1)).toBe('cp_m01_b2_reparo');expect(continued.s.objectives.obj_m01_cover_repair.state).toBe('active');expect(continued.s.player.carrying).toBeNull();expect(continued.s.player.health).toBe(100);expect(continued.s.difficulty).toBe('soldado');
 await expect(page.locator('#resume-card')).toContainText('Soldado');await expect(page.locator('#message')).not.toContainText('Você caiu');
 writeFileSync(info.outputPath('delivery-continue.json'),JSON.stringify({persisted,continued,errors},null,2));expect(errors).toEqual([]);
});
