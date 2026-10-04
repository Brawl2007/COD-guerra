import {test,expect} from '@playwright/test';
import {route,driver,toRepair,toCoverAdjustment,toStationEvacuation} from '../helpers/m01-route.js';
import {seconds} from '../../src/game/m01-simulation.js';
import {installBrowserHarness,finalizeBrowserHarness,forceAssetFailure,waitForState,waitForPointerLockRunning,waitForM01Ready,assertCheckpointStorage} from './helpers/harness.js';

let result;
const flow=()=>result??=route();
const key='cod-guerra:checkpoint:m01:v2';
test.beforeEach(async({page})=>{installBrowserHarness(page);});
test.afterEach(async({page},info)=>{await finalizeBrowserHarness(page,info);});
async function open(page){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.goto('?debug=1');
  await waitForM01Ready(page,'m01-open-models-ready',{timeout:30000});
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#start')).toBeEnabled();
  return {errors,failed};
}
async function start(page,button='#start'){
  if(button==='#continue')await assertCheckpointStorage(page,{present:true,schema:2});
  await page.locator(button).click();
  await waitForPointerLockRunning(page,`m01-${button.slice(1)}-pointer-lock`,{timeout:15000});
  if(button==='#start'){
    await page.keyboard.press('Space');
    await waitForState(page,'m01-cp-a-created',()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'),null,{timeout:30000});
  }
}
async function freezeClick(page,button){
  // Native pointer-lock handoff preserves the restored frame while optional clips finish loading.
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);
  });
  await page.locator(button).click();await exp
…[30509 chars truncated — re-run with head/grep/tail for full output]…
e.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:flow().outro});
  const {errors,failed}=await open(page);await start(page,'#continue');await expect(page.locator('#interaction')).toContainText('saltar cena');
  await page.keyboard.press('Space');await expect(page.locator('#complete')).toBeVisible();
  expect(await page.locator('#debrief p').count()).toBe(8);await expect(page.locator('#debrief')).toContainText('06:45');await expect(page.locator('#debrief')).toContainText('personagens fictícios');
  const d=await page.evaluate(()=>window.gameDiagnostics());expect(d.complete).toBe(true);expect(d.m01.flags['m01.completed']).toBe(true);expect(d.m01.parts.road_span_01.visible).toBe(false);expect(d.m01.parts.road_portal_west.visible).toBe(false);
  await page.screenshot({path:info.outputPath('m01-debrief.png')});expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('German fire on the repair is drawn from the Lisewo gates and the HUD status line is the simulation state',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  // Staged continuation of a state reached by the simulation route (crate delivered, train 963 firing).
  const d=toRepair(driver());d.walk(-134,13);d.until(()=>d.sim.battleClock>=seconds('04:45:40'),120);
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:d.sim.snapshot()});
  const {errors,failed}=await open(page);await start(page,'#continue');
  const samples=[];
  for(let i=0;i<60&&!(samples.some(s=>s.fx.muzzle>0)&&samples.some(s=>s.fx.puff>0)&&samples.some(s=>s.pinned)&&samples.some(s=>!s.pinned)&&samples.at(-1).progress>samples[0].progress);i++){
    await page.waitForTimeout(250);
    samples.push(await page.evaluate(()=>{const g=window.gameDiagnostics().m01;return {fx:g.fireEffects,hud:document.querySelector('#objective-status').textContent,
      sim:g.threat.status,pinned:g.threat.repair.pinned,origins:g.threat.recentFire.map(f=>f.x),poses:g.actorPoses.pinned,animations:g.actorAnimations,progress:g.objectives.obj_m01_cover_repair.progress};}));
  }
  expect(samples.some(s=>s.fx.muzzle>0)).toBe(true);expect(samples.some(s=>s.fx.puff>0)).toBe(true);
  expect(samples.some(s=>s.pinned)&&samples.some(s=>!s.pinned)).toBe(true);
  // Os sapadores deitados aparecem na pose de quem está sob fogo, e o trabalho retoma depois.
  expect(samples.some(s=>s.pinned&&s.poses>0)).toBe(true);expect(samples.at(-1).progress).toBeGreaterThan(samples[0].progress);
  expect(samples.some(s=>s.animations.aiming>0)).toBe(true);
  expect(samples.some(s=>s.pinned&&s.animations.underFire>0)).toBe(true);
  for(const s of samples){expect(s.hud).toBe(s.sim);expect(s.hud.includes('sapadores deitados')).toBe(s.pinned);for(const x of s.origins)expect(x).toBeGreaterThanOrEqual(1050);}
  await page.screenshot({path:info.outputPath('m01-repair-under-fire.png')});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('the genuine train 963 and both MG34 fire sources use optional GLBs, light instances and reproducible pause/restart',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:120000);
  const d=toRepair(driver());d.until(()=>d.sim.battleClock>=seconds('04:45:10'),120);
  const gun=d.sim.actor('de_east_0'),p=d.sim.player,angle=Math.atan2(gun.z-p.z,gun.x-p.x);
  d.step({lookX:Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle))/.0022});
  const snapshot=d.sim.snapshot(false);   // staged CP for the train/MG visual restart, not a continuation save
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await waitForState(page,'train-mg34-assets-and-burst',()=>{
    const g=window.gameDiagnostics();
    if(!g.paused&&g.m01.wagons.loaded.length===2&&g.m01.characters.actors.some(a=>a.weapon==='mg34'&&a.clip==='mg34_prone_fire_burst')){
      document.exitPointerLock();return true;
    }return false;
  },null,{timeout:90000});
  await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.gameDiagnostics()),w=frozen.m01.wagons,mg=frozen.m01.characters.actors.filter(a=>a.weapon==='mg34');
  expect(w).toMatchObject({wagons:65,step:9.1,lod:2,proxies:0,visible:true,first:[1090,0,-2.5],last:[1672.4,0,-2.5]});
  expect(w.batches).toBeLessThanOrEqual(10);expect(mg.map(a=>a.id).sort()).toEqual(['de_east_0','de_east_1']);
  expect(frozen.m01.characters.active).toBeLessThanOrEqual(18);
  for(const a of mg){expect(a.weaponLOD).toBe(2);expect(a.weaponMeshes).toContain('mg34_body');expect(a.weaponMeshes).not.toContain('rifle');expect(a.weaponMeshes).not.toContain('clip');expect(a.muzzle.every(Number.isFinite)).toBe(true);}
  await page.waitForTimeout(300);const still=await page.evaluate(()=>window.gameDiagnostics());
  expect(still.clock).toBe(frozen.clock);expect(still.m01.characters).toEqual(frozen.m01.characters);expect(still.m01.wagons).toEqual(w);
  await page.screenshot({path:info.outputPath('m01-train-mg34.jpg'),type:'jpeg',quality:85,style:'#pause { visibility:hidden !important; }',timeout:120000});
  await page.locator('#restart-checkpoint').click();await waitForState(page,'train-mg34-restart-running',()=>!window.gameDiagnostics().paused,null,{timeout:30000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const restored=await page.evaluate(()=>window.gameDiagnostics());
  expect(restored.m01.wagons).toEqual(w);expect(restored.geometries).toBeLessThanOrEqual(frozen.geometries+2);expect(restored.textures).toBeLessThanOrEqual(frozen.textures+2);
  await info.attach('train-mg34-samples',{body:JSON.stringify({kind:'production continuation of a genuine simulation-control snapshot; view from west bank',frozen,restored,errors,failed}),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('schema-2 continuation keeps the older CP-A on the real Restart checkpoint button',async({page},info)=>{
  test.setTimeout(120000);
  const d=driver();d.step({skip:true});d.walk(-66,26);
  const snapshot=d.sim.snapshot(),cp=d.sim.checkpoint;
  expect(snapshot.resumeCheckpoint).toEqual(cp);expect(snapshot.clock).toBeGreaterThan(cp.clock);
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);
  await freezeClick(page,'#continue');
  const current=await page.evaluate(()=>window.gameDiagnostics());expect(current.clock).toBe(snapshot.clock);
  for(const axis of ['x','y','z','angle','pitch'])expect(current.player[axis]).toBe(snapshot.player[axis]);
  await freezeClick(page,'#restart-checkpoint');
  const recovered=await page.evaluate(()=>window.gameDiagnostics());expect(recovered.clock).toBe(cp.clock);
  expect(recovered.m01.battleClock).toBe(cp.battleClock);expect(recovered.m01.checkpoints).toEqual(cp.checkpointsReached);
  for(const axis of ['x','y','z','angle','pitch'])expect(recovered.player[axis]).toBe(cp.player[axis]);
  expect(recovered.player.z).not.toBe(current.player.z);
  await info.attach('continuation-checkpoint-proof',{body:JSON.stringify({kind:'actual UI continuation, then recovery to earlier genuine CP-A before first tick',current,recovered,savedClock:snapshot.clock,checkpointClock:cp.clock}),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('missing optional wagon models and MG34 clips preserve 65 proxies, both procedural supports and playable M01',async({page},info)=>{
  const d=toRepair(driver());d.until(()=>d.sim.battleClock>=seconds('04:45:10'),120);const snapshot=d.sim.snapshot();
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await forceAssetFailure(page,'**/m01-wagons/*.glb',{label:'optional-wagon-models',body:'optional wagon missing'});
  await forceAssetFailure(page,'**/mg34/m01_mg34_animations.glb',{label:'optional-mg34-clips',body:'optional MG34 clips missing'});
  await open(page);await waitForState(page,'wagon-mg34-fallbacks-recorded',()=>window.gameDiagnostics().m01.characters.failures.some(f=>f.path.includes('m01_mg34_animations'))&&window.gameDiagnostics().m01.assetFailures.filter(f=>f.path.includes('m01-wagons')).length===2,null,{timeout:30000});
  await start(page,'#continue');const g=await page.evaluate(()=>window.gameDiagnostics());
  expect(g.m01.requiredAssetFailures).toEqual([]);expect(g.m01.wagons).toMatchObject({wagons:65,proxies:65,loaded:[],visible:true});
  expect(g.m01.characters.actors.every(a=>a.weapon!=='mg34')).toBe(true);expect(g.m01.actorAnimations.aiming).toBeGreaterThan(0);
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  await page.screenshot({path:info.outputPath('m01-train-mg34-fallback.jpg'),type:'jpeg',quality:85,style:'#pause { visibility:hidden !important; }',timeout:120000});
});
test('the real roll-call snapshot renders seated actors and keeps their pose after page reload',async({page},info)=>{
  // Visual verification by continuation of a snapshot reached with simulation controls.
  const snapshot=flow().outro,seated=snapshot.actors.filter(a=>a.active&&a.alive&&a.pose==='seated').length;
  expect(seated).toBeGreaterThanOrEqual(6);
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await waitForState(page,'roll-call-seated-count',n=>window.gameDiagnostics().m01.actorPoses.seated===n,seated,{timeout:30000});
  await page.screenshot({path:info.outputPath('m01-roll-call-seated.png')});
  await page.reload();await waitForM01Ready(page,'m01-models-after-reload',{timeout:30000});
  await start(page,'#continue');await waitForState(page,'roll-call-seated-count',n=>window.gameDiagnostics().m01.actorPoses.seated===n,seated,{timeout:30000});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('a real withdrawal continuation loses men only to rounds from the spans, keeps the twelve-survivor floor and shows the count in the HUD',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  const snapshot=flow().combatSnapshots.withdrawal;
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  // O clarão da boca dura uma fracção de segundo e apaga-se antes de o tiro chegar: amostrar até à primeira baixa.
  // Um contador na própria página regista os clarões de cada frame desenhado; a amostragem a 250 ms podia perdê-los
  // no CI com renderização por software (run 36920430287).
  await page.evaluate(()=>{window.__m01MuzzleSeen=0;const tick=()=>{const m=window.gameDiagnostics?.().m01?.fireEffects?.muzzle??0;if(m>window.__m01MuzzleSeen)window.__m01MuzzleSeen=m;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
  const samples=[];
  for(let i=0;i<300&&!(samples.length&&samples.at(-1).n<18);i++){
    await page.waitForTimeout(250);
    samples.push(await page.evaluate(()=>{const g=window.gameDiagnostics().m01;return {n:g.flags['m01.east_platoon_survivors'],muzzle:Math.max(g.fireEffects.muzzle,window.__m01MuzzleSeen),
      hud:document.querySelector('#objective-status').textContent,sim:g.threat.status,origins:g.threat.recentFire.map(f=>f.id)};}));
  }
  const n=samples.at(-1).n;expect(n).toBeLessThan(18);expect(n).toBeGreaterThanOrEqual(12);
  expect(samples.some(s=>s.muzzle>0)).toBe(true);
  for(const s of samples){expect(s.hud).toBe(s.sim);expect(s.hud).toContain(`Pelotão leste: ${s.n} homens`);}
  await page.screenshot({path:info.outputPath('m01-withdrawal-under-fire.png')});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('a failed M01 bridge load prevents an invisible bridge; the French sandbox remains selectable',async({page})=>{
  await forceAssetFailure(page,'**/*.glb',{label:'required-m01-glb-failure',body:'missing M01 test asset'});
  await page.goto('?debug=1');await waitForState(page,'required-bridge-failures-recorded',()=>window.gameDiagnostics?.().m01?.requiredAssetFailures.length===9,null,{timeout:30000});
  await expect(page.locator('#error')).toBeVisible();await expect(page.locator('#start')).toBeDisabled();
  await page.locator('#close-error').click();await page.locator('#mission-select').selectOption('sandbox-1944');
  await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
  await waitForState(page,'sandbox-fallback-running',()=>!window.gameDiagnostics().paused,null,{timeout:15000});await expect(page.locator('#weapon-name')).toHaveText('M1 CARBINE');
});

test('textured atmosphere survives checkpoint restart without duplicating resources; low quality reduces vegetation',async({page},info)=>{
  test.setTimeout(180000);
  const snapshot=flow().checkpoints.cp_m01_d_retirada,shaderErrors=[];
  page.on('console',m=>{if(m.type()==='error')shaderErrors.push(m.text());});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await page.locator('#quality').selectOption('medium');await start(page,'#continue');
  await waitForState(page,'environment-medium-ready',()=>window.gameDiagnostics().m01.smokePuffs>0&&window.gameDiagnostics().m01.environmentInstances>2000,null,{timeout:30000});
  const initial=await page.evaluate(()=>window.gameDiagnostics());
  expect(initial.m01.smokePuffs).toBeLessThanOrEqual(192);
  await page.screenshot({path:info.outputPath('m01-visual-medium.png')});
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#restart-checkpoint').click();
  await waitForPointerLockRunning(page,'m01-running-pointer-lock',{timeout:15000});
  const restored=await page.evaluate(()=>window.gameDiagnostics());
  expect(restored.m01.environmentInstances).toBe(initial.m01.environmentInstances);
  expect(restored.textures).toBeLessThanOrEqual(initial.textures+2);expect(restored.geometries).toBeLessThanOrEqual(initial.geometries+2);
  expect(restored.m01.parts.road_span_06.visible).toBe(false);
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#back-menu').click();
  await page.locator('#quality').selectOption('low');await start(page,'#continue');
  await waitForState(page,'environment-low-reduced',n=>window.gameDiagnostics().m01.environmentInstances<n,initial.m01.environmentInstances,{timeout:30000});
  const low=await page.evaluate(()=>window.gameDiagnostics());expect(low.m01.smokePuffs).toBeLessThanOrEqual(112);
  expect(low.m01.models.length).toBe(9);expect(low.eventIds).toContain('evt_m01_east_demolition');
  await page.screenshot({path:info.outputPath('m01-visual-low.png')});
  expect(errors).toEqual([]);expect(shaderErrors).toEqual([]);expect(failed).toEqual([]);
});


test('ckm west crew and weapon use actual saved abandon time, pause and fresh reload',async({page},info)=>{
  test.setTimeout(180000);
  const flow=route(),snapshot=structuredClone(flow.combatSnapshots.eastDemolition);
  // This snapshot was reached by the route's real controls at the demolition event.
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await waitForState(page,'ckm-abandon-clip-active',()=>window.gameDiagnostics().m01.characters?.actors.some(a=>a.clip==='ckm_wz30_gunner_abandon'),null,{timeout:30000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const before=await page.evaluate(()=>window.gameDiagnostics()),c=before.m01.characters;
  const gunner=c.actors.find(a=>a.id==='ckm_gunner'),loader=c.actors.find(a=>a.id==='ckm_loader');
  expect(loader.clip).toBe('ckm_wz30_loader_abandon');expect(loader.clipTime).toBeCloseTo(gunner.clipTime,5);
  expect(c.ckm.clip).toBe('ckm_wz30_gun_abandon');expect(c.ckm.time).toBeCloseTo(gunner.clipTime,5);
  expect(c.ckm.position).toEqual([24.17,-3,43]);expect(c.ckm.lod).toBe(2);
  await page.waitForTimeout(250);expect((await page.evaluate(()=>window.gameDiagnostics())).m01.characters).toEqual(c);
  await page.screenshot({path:info.outputPath('m01-ckm-abandon.png'),style:'#pause {visibility:hidden !important;}'});
  await page.reload();await open(page);await start(page,'#continue');
  await waitForState(page,'ckm-lod2-loaded-after-reload',()=>window.gameDiagnostics().m01.characters?.loaded.includes('ckm:2'),null,{timeout:30000});
  await expect(page.locator('#error')).toBeHidden();expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('optional ckm kit failure retains the crew fallback and checkpoint restoration',async({page})=>{
  test.setTimeout(120000);await forceAssetFailure(page,'**/m01_ckm_wz30_*.glb',{label:'optional-ckm-kit',body:'forced optional CKM kit failure'});
  const d=driver();d.step({skip:true});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:d.sim.snapshot()});
  const {errors}=await open(page);await start(page,'#continue');
  await waitForState(page,'ckm-fallback-failure-recorded',()=>window.gameDiagnostics().m01.characters?.failures.some(f=>f.path.includes('ckm_wz30')),null,{timeout:30000});
  const c=(await page.evaluate(()=>window.gameDiagnostics())).m01.characters;
  expect(c.actors.filter(a=>a.id.startsWith('ckm_'))).toHaveLength(3);expect(c.ckm).toBeNull();
  expect(c.actors.filter(a=>a.id.startsWith('ckm_')).every(a=>!a.clip.startsWith('ckm_wz30_'))).toBe(true);
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#restart-checkpoint').click();
  await expect(page.locator('#error')).toBeHidden();expect(errors).toEqual([]);
});
