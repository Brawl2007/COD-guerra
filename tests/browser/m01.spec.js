import {test,expect} from '@playwright/test';
import {route,driver,toRepair,toCoverAdjustment} from '../helpers/m01-route.js';
import {seconds} from '../../src/game/m01-simulation.js';

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
test('licensed character rigs and first-person hands follow real weapon state, preserve pause and use the light preset',async({page},info)=>{
  test.setTimeout(180000);
  const {errors,failed}=await open(page);await start(page);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.active>0&&window.gameDiagnostics().m01.viewModel.active);
  const initial=await page.evaluate(()=>window.gameDiagnostics());
  expect(initial.m01.characters.loaded).toEqual(expect.arrayContaining(['pl:0','pl:1','pl:2','de:2']));
  expect(initial.m01.characters.active).toBeLessThanOrEqual(18);expect(initial.m01.viewModel.lod).toBe(0);
  expect(initial.m01.viewModel.armTriangles).toBeGreaterThan(200);
  async function horizontal(){
    // Native headless clicks can move the locked cursor; restore the view with the same relative look controls.
    const view=await page.evaluate(()=>window.gameDiagnostics().player);
    await page.evaluate(({angle,pitch})=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:-angle/.0022,movementY:pitch/.0022})),view);
    await page.waitForFunction(()=>Math.abs(window.gameDiagnostics().player.pitch)<.03);
  }
  async function capture(name){
    await page.evaluate(()=>document.exitPointerLock());
    await expect(page.locator('#pause')).toBeVisible();
    await page.screenshot({path:info.outputPath(name),style:'#pause { visibility:hidden !important; }'});
  }
  await page.mouse.down({button:'right'});await expect(page.locator('#crosshair')).toBeHidden();
  await horizontal();
  await capture('m01-rig-iron-sights.png');
  const frozen=await page.evaluate(()=>window.gameDiagnostics());await page.waitForTimeout(300);
  expect((await page.evaluate(()=>window.gameDiagnostics())).m01.viewModel).toEqual(frozen.m01.viewModel);
  await page.locator('#resume').click();
  for(let i=0;i<5;i++){
    await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');
    await page.mouse.click(640,360);await expect(page.locator('#mag')).toHaveText(String(4-i));
  }
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');await horizontal();await page.keyboard.press('KeyR');
  await page.waitForFunction(()=>{const g=window.gameDiagnostics().m01;if(g.weapon.state==='RELOAD_CLIP'&&g.viewModel.clip==='reload_clip'&&g.viewModel.clipTime>1.1){document.exitPointerLock();return true;}return false;});
  await capture('m01-rig-clip.png');
  await page.locator('#resume').click();await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');
  await page.mouse.click(640,360);await expect(page.locator('#mag')).toHaveText('4');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');
  await horizontal();
  await page.keyboard.press('KeyR');
  await page.waitForFunction(()=>{if(window.gameDiagnostics().m01.viewModel.singleRound){document.exitPointerLock();return true;}return false;});
  await capture('m01-rig-single-round.png');
  const single=await page.evaluate(()=>window.gameDiagnostics());expect(single.m01.weapon.state).toBe('RELOAD_SINGLE');
  await page.locator('#back-menu').click();await page.locator('#quality').selectOption('high');await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.lod===0);
  const high=await page.evaluate(()=>window.gameDiagnostics());expect(high.m01.characters.failures).toEqual([]);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('an optional character download failure preserves playable procedural actors without blocking bridge validation',async({page})=>{
  await page.route('**/characters/*.glb',r=>r.abort());
  await open(page);await start(page);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.failures.length>0);
  const data=await page.evaluate(()=>window.gameDiagnostics());
  expect(data.m01.characters.active).toBe(0);expect(data.m01.viewModel.active).toBe(false);
  expect(data.m01.assetFailures).toEqual([]);expect(data.m01.actorPoses.standing).toBeGreaterThan(0);
});
test('missing close-up LOD0 falls back to intact LOD1 hands while the light world actors remain available',async({page})=>{
  await page.route('**/m01_soldier_pl_lod0.glb',r=>r.abort());
  await open(page);await start(page);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.active);
  const data=await page.evaluate(()=>window.gameDiagnostics());
  expect(data.m01.viewModel.lod).toBe(1);expect(data.m01.viewModel.armTriangles).toBeGreaterThan(200);
  expect(data.m01.characters.active).toBeGreaterThan(0);expect(data.m01.assetFailures).toEqual([]);
});
test('real keyboard movement traverses the approaches and E delivers the message at the rail bridge',async({page},info)=>{
  // Slow software rendering needs room for input and the final, paused evidence capture.
  test.setTimeout(process.env.CI?240000:130000);
  const {errors,failed}=await open(page);await start(page);await page.keyboard.down('ShiftLeft');
  async function axis(code,axis,target,direction){
    await page.keyboard.down(code);
    await page.waitForFunction(({axis,target,direction})=>window.gameDiagnostics().player[axis]*direction>=target*direction,{axis,target,direction},{timeout:process.env.CI?90000:45000});
    await page.keyboard.up(code);
  }
  await axis('KeyD','z',32,1);await axis('KeyW','x',-15,1);await page.keyboard.up('ShiftLeft');
  // Walk the final approach. A key-up queued behind a slow software-rendered frame
  // can carry a sprint several metres beyond the point's actual interaction radius.
  await axis('KeyA','z',3,-1);await axis('KeyW','x',17,1);
  await expect(page.locator('#interaction')).toContainText('entregar mensagem');
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.gameDiagnostics().m01.objectives.obj_m01_deliver_message.state==='done');
  const data=await page.evaluate(()=>window.gameDiagnostics());expect(data.m01.battleClock).toBeGreaterThanOrEqual(4*3600+33*60+10);expect(data.eventIds).toContain('evt_m01_planes_heard');
  // A real pause stops animation and avoids competing GPU frames during readback.
  // Headless Chromium does not release pointer lock from Playwright's Escape key.
  // Use the browser release API, as in the existing pause/control tests.
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const paused=await page.evaluate(()=>window.gameDiagnostics());await page.waitForTimeout(300);
  const still=await page.evaluate(()=>window.gameDiagnostics());
  expect(still.clock).toBe(paused.clock);expect(still.m01.renderedFrames).toBe(paused.m01.renderedFrames);
  await page.screenshot({path:info.outputPath('m01-message-delivered-paused.png')});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
for(const truss of [false,true])test(`adjustment salvo ${truss?'behind the truss':'at the gates'} restores its actual origin and follows mouse look`,async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  const snapshot=toCoverAdjustment({truss}).sim.snapshot(),source=snapshot.timers.coverFire;
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await expect(page.locator('#objective-status')).toContainText(truss?'Salva do dique norte':'Metralhadora nos portões de Lisewo');
  const before=await page.evaluate(()=>window.gameDiagnostics());
  expect(before.m01.threat.coverFire.by).toBe(source.by);expect(before.m01.threat.coverFire.x).toBe(source.x);
  expect(before.m01.threat.status).toBe(await page.locator('#objective-status').textContent());
  const aim=Math.atan2(source.z-before.player.z,source.x-before.player.x);
  await page.evaluate(delta=>{
    document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0,bubbles:true}));
    document.dispatchEvent(new MouseEvent('mousemove',{movementX:delta,movementY:0,bubbles:true}));
  },Math.atan2(Math.sin(aim+Math.PI-before.player.angle),Math.cos(aim+Math.PI-before.player.angle))/.0022);
  await expect(page.locator('#objective-status')).toContainText('atrás de si');
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  await page.screenshot({path:info.outputPath('m01-cover-origin-paused.png'),timeout:120000});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('demolition inside the road truss shows the actual bearing while mouse look remains free',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  const snapshot=flow().combatSnapshots.eastDemolition;
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  const initial=await page.evaluate(()=>window.gameDiagnostics());
  expect(initial.player.x).toBeGreaterThan(20);expect(initial.player.z).toBeGreaterThan(35);expect(initial.player.z).toBeLessThan(45);
  expect(initial.eventIds).toContain('evt_m01_east_demolition');
  const aim=Math.atan2(20-initial.player.z,800-initial.player.x);
  const turn=angle=>page.evaluate(delta=>{
    document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0,bubbles:true}));
    document.dispatchEvent(new MouseEvent('mousemove',{movementX:delta,movementY:0,bubbles:true}));
  },Math.atan2(Math.sin(angle),Math.cos(angle))/.0022);
  await turn(aim+Math.PI-initial.player.angle);
  await expect(page.locator('#objective-status')).toContainText('atrás de si');
  const away=await page.evaluate(()=>window.gameDiagnostics());
  await turn(aim-away.player.angle);
  await expect(page.locator('#objective-status')).toContainText('em frente');
  const facing=await page.evaluate(()=>window.gameDiagnostics());
  expect(facing.m01.threat.status).toBe(await page.locator('#objective-status').textContent());
  expect(Math.abs(Math.atan2(Math.sin(facing.player.angle-aim),Math.cos(facing.player.angle-aim)))).toBeLessThan(.01);
  expect(facing.player.x).toBe(initial.player.x);expect(facing.player.z).toBe(initial.player.z);
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  await page.screenshot({path:info.outputPath('m01-demolition-inside-truss.png'),timeout:120000});
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
  await page.route('**/*.glb',r=>r.fulfill({status:404,body:'missing M01 test asset'}));
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.assetFailures.length===9);
  await expect(page.locator('#error')).toBeVisible();await expect(page.locator('#start')).toBeDisabled();
  await page.locator('#close-error').click();await page.locator('#mission-select').selectOption('sandbox-1944');
  await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused);await expect(page.locator('#weapon-name')).toHaveText('M1 CARBINE');
});

test('textured atmosphere survives checkpoint restart without duplicating resources; low quality reduces vegetation',async({page},info)=>{
  test.setTimeout(180000);
  const snapshot=flow().checkpoints.cp_m01_d_retirada,shaderErrors=[];
  page.on('console',m=>{if(m.type()==='error')shaderErrors.push(m.text());});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await page.locator('#quality').selectOption('medium');await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.smokePuffs>0&&window.gameDiagnostics().m01.environmentInstances>2000);
  const initial=await page.evaluate(()=>window.gameDiagnostics());
  expect(initial.m01.smokePuffs).toBeLessThanOrEqual(192);
  await page.screenshot({path:info.outputPath('m01-visual-medium.png')});
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  const restored=await page.evaluate(()=>window.gameDiagnostics());
  expect(restored.m01.environmentInstances).toBe(initial.m01.environmentInstances);
  expect(restored.textures).toBeLessThanOrEqual(initial.textures+2);expect(restored.geometries).toBeLessThanOrEqual(initial.geometries+2);
  expect(restored.m01.parts.road_span_06.visible).toBe(false);
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#back-menu').click();
  await page.locator('#quality').selectOption('low');await start(page,'#continue');
  await page.waitForFunction(n=>window.gameDiagnostics().m01.environmentInstances<n,initial.m01.environmentInstances);
  const low=await page.evaluate(()=>window.gameDiagnostics());expect(low.m01.smokePuffs).toBeLessThanOrEqual(112);
  expect(low.m01.models.length).toBe(9);expect(low.eventIds).toContain('evt_m01_east_demolition');
  await page.screenshot({path:info.outputPath('m01-visual-low.png')});
  expect(errors).toEqual([]);expect(shaderErrors).toEqual([]);expect(failed).toEqual([]);
});
