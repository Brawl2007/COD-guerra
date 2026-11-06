import {test,expect} from '@playwright/test';
import {driver,toRepair} from '../helpers/m01-route.js';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {actorPose} from '../../src/render/m01-actor-pose.js';
import {muzzlePosition} from '../../src/world/spatial.js';
const key='cod-guerra:checkpoint:m01:v2';
// The search starts at 207.4 s of game time. With the ckm live (T47) the first burst of de_east_0 that reaches a sixth round fires it at 328.8 s, 121.4 s in, with the gun itself mid-burst:
// the window must be longer than 121.4 s (180 s leaves a margin of 58 s; at 120 s it ends at 327.4 s and fails with "Route stalled").
function burstSave(count){
 const d=toRepair(driver()),p=d.sim.player,a=d.sim.actor('de_east_0'),angle=Math.atan2(a.z-p.z,a.x-p.x);
 d.step({lookX:Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle))/.0022});
 d.until(()=>d.sim.actor('de_east_0').mg34Prone?.phase==='fire_burst'&&d.sim.actor('de_east_0').mg34Prone.burst.emitted===count,180);
 return d.sim.snapshot();
}
async function continueAndPause(page,optionalFailure=false){
 await page.waitForFunction(optionalFailure=>{const c=window.gameDiagnostics().m01.characters;return (optionalFailure?c.failures.some(f=>f.path.includes('m01_mg34_prone_animations')):c.proneAvailable)&&c.loaded.includes('mg34:2')&&c.loaded.includes('de:2');},optionalFailure);
 // Inspect the exact restored frame before the first catch-up tick. The native lock is released
 // in the capture listener before Game's listener unpauses; the subsequent native unlock shows Pause.
 await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});
 await page.locator('#continue').click();await expect(page.locator('#pause')).toBeVisible();
 await page.waitForFunction(optionalFailure=>{const d=window.gameDiagnostics(),s=window.gameVerificationState().snapshot;return d.clock===s.clock&&(optionalFailure?d.m01.actorPoses.prone>0:d.m01.characters.actors?.some(a=>a.id==='de_east_0'&&a.prone));},optionalFailure);
}
async function open(page,snapshot,freeze=true,optionalFailure=false){
 await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
 await page.goto('?debug=1&visual-verify=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
 await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeEnabled({timeout:60000});
 if(freeze)await continueAndPause(page,optionalFailure);else{await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');}
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
 await open(page,snapshot,true,true);await expect(page.locator('#pause')).toBeVisible();
 const {diagnostics:g,state}=await page.evaluate(()=>({diagnostics:window.gameDiagnostics(),state:window.gameVerificationState()}));
 const authority=new M01Simulation();authority.restoreSnapshot(snapshot);expect(state.snapshot).toEqual(authority.snapshot());expect(state.events).toEqual([]);
 expect(g.clock).toBe(snapshot.clock);expect(g.m01.characters.proneAvailable).toBe(false);
 expect(g.m01.characters.failures.some(f=>f.path.includes('m01_mg34_prone_animations'))).toBe(true);
 const lowActors=state.snapshot.actors.filter(a=>a.active&&actorPose(a,g.clock).name==='prone');
 expect(lowActors.map(a=>a.id).sort()).toEqual(['de_east_0','de_east_1','de_mg34_loader_0','de_mg34_loader_1']);
 expect(g.m01.actorPoses.prone).toBe(lowActors.length);
 for(const a of lowActors){
  expect(g.m01.characters.actors.some(skinned=>skinned.id===a.id)).toBe(false);
  const pose=actorPose(a,g.clock);expect(pose.prone).toBe(true);expect(pose.head[1]).toBeLessThan(.6);
  if(a.mg34Loader){expect(a.loaderFor).toBe(`de_east_${a.id.at(-1)}`);expect(a.mg34Loader.phase).not.toBe('leave');}
  else {expect(a.mg34Prone.phase).not.toBe('standing');expect(muzzlePosition(a,g.clock).y-a.y).toBeLessThan(.5);}
 }
 expect(g.m01.fireEffects.muzzle).toBeGreaterThan(0);expect(g.m01.requiredAssetFailures).toEqual([]);expect(errors).toEqual([]);
 await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);await continueAndPause(page,true);
 const restored=await page.evaluate(()=>({diagnostics:window.gameDiagnostics(),state:window.gameVerificationState()}));
 expect(restored.state).toEqual(state);expect(restored.diagnostics.m01.actorPoses).toEqual(g.m01.actorPoses);expect(restored.diagnostics.m01.fireEffects).toEqual(g.m01.fireEffects);
 await info.attach('mg34-prone-fallback',{body:JSON.stringify({kind:'actual optional prone clip failure; exact genuine burst save, both gunner/loader identities, real muzzle and full authority retained across reload',lowActorIds:lowActors.map(a=>a.id),diagnostics:g,state,restored}),contentType:'application/json'});
});
