import {test,expect} from '@playwright/test';
import {driver,toRepair} from '../helpers/m01-route.js';
const key='cod-guerra:checkpoint:m01:v2';
function burstSave(count){
 const d=toRepair(driver()),p=d.sim.player,a=d.sim.actor('de_east_0'),angle=Math.atan2(a.z-p.z,a.x-p.x);
 d.step({lookX:Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle))/.0022});
 d.until(()=>d.sim.actor('de_east_0').mg34Prone?.phase==='fire_burst'&&d.sim.actor('de_east_0').mg34Prone.burst.emitted===count,120);
 return d.sim.snapshot();
}
async function continueAndPause(page){
 await page.waitForFunction(()=>{const c=window.gameDiagnostics().m01.characters;return c.proneAvailable&&c.loaded.includes('mg34:2')&&c.loaded.includes('de:2');});
 // Inspect the exact restored frame before the first catch-up tick. The native lock is released
 // in the capture listener before Game's listener unpauses; the subsequent native unlock shows Pause.
 await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});
 await page.locator('#continue').click();await expect(page.locator('#pause')).toBeVisible();
 await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.actors?.some(a=>a.id==='de_east_0'&&a.prone));
}
async function open(page,snapshot,freeze=true){
 await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
 await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
 await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeEnabled();
 if(freeze)await continueAndPause(page);else{await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');}
}
for(const count of [1,4,6])test(`real MG34 prone save after shot ${count}: production continuation, real muzzle, pause and reload`,async({page},info)=>{
 test.setTimeout(process.env.CI?180000:120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const snapshot=burstSave(count),saved=snapshot.actors.find(a=>a.id==='de_east_0');expect(saved.mg34Prone.burst.emitted).toBe(count);
 await open(page,snapshot);
 await expect(page.locator('#pause')).toBeVisible();const frozen=await page.evaluate(()=>window.gameDiagnostics()),a=frozen.m01.characters.actors.find(a=>a.id==='de_east_0');
 expect(a.prone.phase).toBe('fire_burst');expect(a.clipTime).toBeCloseTo(frozen.clock-a.prone.startedAt,5);
 expect(frozen.clock).toBe(snapshot.clock);expect(a.prone.emitted).toBe(count);expect(a.prone.emitted).toBeLessThanOrEqual(a.prone.rounds);
 expect(a.prone.muzzle.y).toBeLessThan(.5);expect(a.prone.eye.y).toBeLessThan(.5);
 const m=a.prone.muzzle;expect(Math.hypot(a.muzzle[0]-m.x,a.muzzle[1]-m.y,a.muzzle[2]-m.z)).toBeLessThanOrEqual(.002);
 await page.waitForTimeout(350);expect((await page.evaluate(()=>window.gameDiagnostics())).m01.characters).toEqual(frozen.m01.characters);
 await page.screenshot({path:info.outputPath(`mg34-prone-shot-${count}.jpg`),type:'jpeg',quality:85,style:'#pause {visibility:hidden !important;}'});
 await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);await continueAndPause(page);
 const restored=await page.evaluate(()=>window.gameDiagnostics());expect(restored.m01.requiredAssetFailures).toEqual([]);
 expect(restored.m01.characters.actors.find(a=>a.id==='de_east_0')).toEqual(a);
 await page.locator('#resume').click();await page.waitForFunction(start=>{const a=window.gameDiagnostics().m01.characters.actors.find(a=>a.id==='de_east_0');return a?.prone.phase==='aim'&&a.prone.firedAt===start;},saved.firedAt);expect(errors).toEqual([]);
 await info.attach('mg34-prone-proof',{body:JSON.stringify({kind:'production continuation from genuine control-route burst save; numerical exact frame restore additionally proved in Node',count,frozen,restored}),contentType:'application/json'});
});

test('missing optional prone GLB keeps real MG34 gameplay and procedural low posture',async({page},info)=>{
 test.setTimeout(process.env.CI?180000:120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const snapshot=burstSave(1);await page.route('**/m01_mg34_prone_animations.glb',r=>r.fulfill({status:404,body:'optional prone kit absent'}));
 await open(page,snapshot,false);await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.failures.some(f=>f.path.includes('m01_mg34_prone_animations')));
 await page.waitForFunction(()=>window.gameDiagnostics().m01.actorPoses.prone===2&&window.gameDiagnostics().m01.fireEffects.muzzle>0);
 await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();const g=await page.evaluate(()=>window.gameDiagnostics());
 expect(g.m01.characters.actors.every(a=>a.id!=='de_east_0'&&a.id!=='de_east_1')).toBe(true);
 expect(g.m01.requiredAssetFailures).toEqual([]);expect(g.m01.actorPoses.prone).toBe(2);expect(errors).toEqual([]);
 await info.attach('mg34-prone-fallback',{body:JSON.stringify({kind:'optional prone clip failure; genuine burst save continued in production',diagnostics:g}),contentType:'application/json'});
});
