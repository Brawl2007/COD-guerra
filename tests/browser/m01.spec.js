import {test,expect} from '@playwright/test';
import {route,driver,toRepair,toCoverAdjustment,toStationEvacuation} from '../helpers/m01-route.js';
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
async function freezeClick(page,button){
  // Native pointer-lock handoff preserves the restored frame while optional clips finish loading.
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);
  });
  await page.locator(button).click();await expect(page.locator('#pause')).toBeVisible();
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
test('the genuine first raid displays three Ju 87 GLBs with light LODs and freezes the propellers on pause',async({page},info)=>{
  test.setTimeout(180000);
  const d=driver();d.step({skip:true});d.until(()=>d.sim.renderState.stukas,200);
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:d.sim.snapshot()});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.aircraft.loaded.length===3);
  // The restored snapshot is the instant the planes are heard: wait for the presentation fade-in to finish.
  await page.waitForFunction(()=>window.gameDiagnostics().m01.aircraft.planes.every(p=>p.fade===1));
  const before=await page.evaluate(()=>window.gameDiagnostics()),planes=before.m01.aircraft.planes;
  expect(planes).toHaveLength(3);expect(planes.every(p=>p.visible&&p.lod===2&&p.propeller.every(Number.isFinite))).toBe(true);
  const target=planes[0].position,dx=target[0]-before.player.x,dz=target[2]-before.player.z;
  const angle=Math.atan2(dz,dx),pitch=Math.atan2(target[1]-before.player.y-1.6,Math.hypot(dx,dz));
  await page.evaluate(({x,y})=>{
    document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0,bubbles:true}));
    document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true}));
  },{x:Math.atan2(Math.sin(angle-before.player.angle),Math.cos(angle-before.player.angle))/.0022,y:(before.player.pitch-pitch)/.0022});
  await page.waitForFunction(()=>window.gameDiagnostics().player.pitch>.2);
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.gameDiagnostics());await page.waitForTimeout(300);
  expect((await page.evaluate(()=>window.gameDiagnostics())).m01.aircraft).toEqual(frozen.m01.aircraft);
  await page.screenshot({path:info.outputPath('m01-ju87-real-raid.png'),style:'#pause { visibility:hidden !important; }'});
  await page.locator('#resume').click();await page.waitForFunction(clock=>window.gameDiagnostics().clock>clock+.05,frozen.clock);
  expect((await page.evaluate(()=>window.gameDiagnostics())).m01.aircraft.planes[0].position).not.toEqual(frozen.m01.aircraft.planes[0].position);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('unavailable optional Ju 87 models retain all three raid silhouettes and the playable mission',async({page})=>{
  await page.route('**/m01_ju87_b1_lod*.glb',route=>route.abort());
  const d=driver();d.step({skip:true});d.until(()=>d.sim.renderState.stukas,200);
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:d.sim.snapshot()});
  const {errors}=await open(page);await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.assetFailures.filter(f=>f.path.includes('m01-aircraft')).length===3);
  const diag=await page.evaluate(()=>window.gameDiagnostics());
  expect(diag.m01.aircraft.loaded).toEqual([]);expect(diag.m01.aircraft.planes.every(p=>p.visible&&p.lod==='proxy')).toBe(true);
  await expect(page.locator('#error')).toBeHidden();expect(errors).toEqual([]);
});
test('licensed character rigs and first-person hands follow real weapon state, preserve pause and use the light preset',async({page},info)=>{
  test.setTimeout(180000);
  const {errors,failed}=await open(page);await start(page);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.active>0&&window.gameDiagnostics().m01.viewModel.active);
  const initial=await page.evaluate(()=>window.gameDiagnostics());
  expect(initial.m01.characters.loaded).toEqual(expect.arrayContaining(['pl:0','pl:1','pl:2','de:2']));
  expect(initial.m01.characters.active).toBeLessThanOrEqual(18);expect(initial.m01.viewModel.lod).toBe(0);
  expect(initial.m01.viewModel.armTriangles).toBeGreaterThan(200);
  const kowal=initial.m01.characters.actors.find(a=>a.id==='szymon_kowal'),bak=initial.m01.characters.actors.find(a=>a.id==='jozef_bak');
  expect(kowal.weaponMeshes).toEqual(expect.arrayContaining(['rkm_wz28','rkm_bipod_folded','rkm_pouch']));
  expect(kowal.weaponMeshes).not.toContain('rifle');expect(bak.weaponMeshes).toContain('rifle_wz98a');expect(bak.weaponMeshes).not.toContain('rifle');
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
  const fireRound=async expectedMag=>{
    // Resume requests pointer lock asynchronously; pointerlockchange clears Input.
    // A READY weapon alone does not mean the browser has returned control yet.
    await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
    const before=await page.evaluate(()=>window.gameDiagnostics().m01.weapon.shotCount);
    // Pointer-lock native mouse movement can race the slow rendered frame. Dispatch the same window input
    // consumed by Input without repositioning the locked cursor, then wait on authoritative weapon state.
    await page.evaluate(()=>{window.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));window.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));});
    await page.waitForFunction(expected=>window.gameDiagnostics().m01.weapon.mag===expected,expectedMag,{timeout:process.env.CI?30000:10000});
    expect((await page.evaluate(()=>window.gameDiagnostics())).m01.weapon.shotCount).toBe(before+1);
    await expect(page.locator('#mag')).toHaveText(String(expectedMag));
  };
  for(let i=0;i<5;i++){
    await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');
    await fireRound(4-i);
  }
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');await horizontal();
  const clipVisible=page.waitForFunction(()=>{const g=window.gameDiagnostics().m01;if(g.weapon.state==='RELOAD_CLIP'&&g.viewModel.clip==='reload_clip'&&g.viewModel.clipTime>1.1){document.exitPointerLock();return true;}return false;});
  await page.keyboard.press('KeyR');await clipVisible;
  await capture('m01-rig-clip.png');
  await page.locator('#resume').click();await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');
  await fireRound(4);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY');
  await horizontal();
  const singleVisible=page.waitForFunction(()=>{const v=window.gameDiagnostics().m01.viewModel;if(v.singleRound&&v.clipTime>1.1){document.exitPointerLock();return true;}return false;});
  await page.keyboard.press('KeyR');await singleVisible;
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
test('Kowal fires and changes the rkm magazine from actual combat state, preserving both poses in pause',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:120000);
  const d=toRepair(driver());d.walk(-115,32);d.walk(-74,30);d.step({crouch:true});
  d.until(()=>d.sim.actor('szymon_kowal').rounds===2,240);
  const k=d.sim.actor('szymon_kowal'),p=d.sim.player,angle=Math.atan2(k.z-p.z,k.x-p.x);
  d.step({lookX:Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle))/.0022});
  const snapshot=d.sim.snapshot();
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  const samples=[];
  for(const [clip,file]of [['rkm_fire_burst','m01-kowal-rkm-burst.png'],['rkm_reload','m01-kowal-rkm-reload.png']]){
    await page.waitForFunction(clip=>{
      const g=window.gameDiagnostics();
      if(!g.paused&&g.m01.characters.actors?.some(a=>a.id==='szymon_kowal'&&a.clip===clip)){document.exitPointerLock();return true;}
      return false;
    },clip,{timeout:90000});
    await expect(page.locator('#pause')).toBeVisible();
    const frozen=await page.evaluate(()=>window.gameDiagnostics()),actor=frozen.m01.characters.actors.find(a=>a.id==='szymon_kowal');
    expect(actor.clip).toBe(clip);expect(actor.weapon).toBe('rkm_wz28');expect(actor.weaponMeshes).toContain('rkm_wz28');
    expect(actor.weaponMeshes).not.toContain('rifle');expect(actor.weaponMeshes).not.toContain('clip');
    await page.waitForTimeout(300);const still=await page.evaluate(()=>window.gameDiagnostics());
    expect(still.clock).toBe(frozen.clock);expect(still.m01.characters).toEqual(frozen.m01.characters);
    await page.screenshot({path:info.outputPath(file),style:'#pause { visibility:hidden !important; }',timeout:120000});
    samples.push({clip,clock:frozen.clock,battleClock:frozen.m01.battleClock,actor});
    if(clip==='rkm_fire_burst')await page.locator('#resume').click();
  }
  await info.attach('kowal-rkm-samples',{body:JSON.stringify({kind:'production browser continuation of a genuine simulation-control snapshot',samples,errors,failed}),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('missing close-up LOD0 falls back to intact LOD1 hands while the light world actors remain available',async({page})=>{
  await page.route('**/m01_soldier_pl_lod0.glb',r=>r.abort());
  await open(page);await start(page);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.active);
  const data=await page.evaluate(()=>window.gameDiagnostics());
  expect(data.m01.viewModel.lod).toBe(1);expect(data.m01.viewModel.armTriangles).toBeGreaterThan(200);
  expect(data.m01.characters.active).toBeGreaterThan(0);expect(data.m01.assetFailures).toEqual([]);
});
test('the station clip alone cannot enable a viewmodel when the required weapon animations fail to download',async({page})=>{
  await page.route('**/m01_soldier_animations.glb',r=>r.abort());
  const {errors}=await open(page);await start(page);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.failures.length>0);
  const data=await page.evaluate(()=>window.gameDiagnostics());
  expect(data.m01.viewModel.active).toBe(false);expect(data.m01.characters.active).toBe(0);
  expect(data.m01.assetFailures).toEqual([]);expect(data.m01.actorPoses.standing).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test('the station evacuation restores its grounded drag, pauses with the mission and delivers the casualty',async({page},info)=>{
  test.setTimeout(process.env.CI?240000:180000);
  // Staged continuation of real simulation controls; not an uninterrupted browser playthrough.
  const station=toStationEvacuation(driver(),{observe:true});
  // Genuine simulation-control state, staged later so combined rendering cannot turn the remaining drag into a wall-clock timeout.
  station.until(()=>station.sim.stationEvacuation.patient.x<-329,60);
  const snapshot=station.sim.snapshot();
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.actors?.some(a=>a.id==='leon_dudek'&&a.clip==='drag_wounded'));
  const current=await page.evaluate(()=>window.gameDiagnostics()),pair=current.m01.stationEvacuation;
  expect(pair.patient.carriedBy).toBe('leon_dudek');expect(pair.patient.y).toBeLessThanOrEqual(pair.medic.y+.1);
  expect(current.m01.characters.actors).toContainEqual(expect.objectContaining({id:'generic_rifleman',clip:'station_drag_patient_grab',loop:false,clipTime:expect.closeTo(1.6,5)}));
  const angle=Math.atan2(pair.patient.z-current.player.z,pair.patient.x-current.player.x);
  await page.evaluate(({delta,pitch})=>{
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0}));
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:delta,movementY:(pitch+.18)/.0022}));
  },{delta:Math.atan2(Math.sin(angle-current.player.angle),Math.cos(angle-current.player.angle))/.0022,pitch:current.player.pitch});
  await page.waitForFunction(angle=>Math.abs(Math.atan2(Math.sin(window.gameDiagnostics().player.angle-angle),Math.cos(window.gameDiagnostics().player.angle-angle)))<.02,angle);
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.gameDiagnostics());await page.waitForTimeout(300);
  expect((await page.evaluate(()=>window.gameDiagnostics())).m01.stationEvacuation).toEqual(frozen.m01.stationEvacuation);
  await page.screenshot({path:info.outputPath('m01-station-ground-drag.png'),style:'#pause { visibility:hidden !important; }',timeout:120000});
  await page.locator('#resume').click();
  await page.waitForFunction(()=>window.gameDiagnostics().m01.stationEvacuation.delivered,null,{timeout:120000});
  const delivered=await page.evaluate(()=>window.gameDiagnostics());
  expect(delivered.m01.stationEvacuation.patient.carriedBy).toBeNull();expect(delivered.m01.stationEvacuation.patient.x).toBe(-334);
  expect(delivered.m01.stationEvacuation.patient.state).toBe('WOUNDED');expect(delivered.m01.flags['m01.bak_status']).toBe('unhurt');
  await info.attach('station-evacuation',{body:JSON.stringify({kind:'production browser continuation of a genuine simulation-control snapshot',drag:frozen.m01.stationEvacuation,delivered:delivered.m01.stationEvacuation,errors,failed}),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
for(const phase of ['grab','release'])test(`the real station ${phase} restores synchronized clips, pauses and keeps both roots fixed`,async({page},info)=>{
  test.setTimeout(process.env.CI?180000:120000);
  const d=toStationEvacuation(driver(),{observe:true,phase});for(let i=0;i<7;i++)d.step();
  const snapshot=d.sim.snapshot(false),pair=d.sim.stationEvacuation,p=snapshot.player;
  // Look controls applied to the genuine route, before saving. No hand-written actor states.
  const angle=Math.atan2(pair.patient.z-p.z,pair.patient.x-p.x);
  d.step({lookX:Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle))/.0022,lookY:(p.pitch+.18)/.0022});
  // This staged visual test installs the observed phase as a CP, so Restart must return to that phase.
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:d.sim.snapshot(false)});
  const {errors,failed}=await open(page);await freezeClick(page,'#continue');
  await page.waitForFunction(phase=>{
    const g=window.gameDiagnostics(),actors=g.m01.characters.actors;
    if(g.m01.stationEvacuation.patient.stationDrag?.phase===phase&&
      actors?.some(a=>a.id==='generic_rifleman'&&a.clip===`station_drag_patient_${phase}`)&&
      actors.some(a=>a.id==='leon_dudek'&&a.clip===`station_drag_medic_${phase}`)){
      document.exitPointerLock();return true;
    }return false;
  },phase);
  await expect(page.locator('#pause')).toBeVisible();const frozen=await page.evaluate(()=>window.gameDiagnostics());
  const roles=frozen.m01.characters.actors.filter(a=>['generic_rifleman','leon_dudek'].includes(a.id));
  expect(roles).toHaveLength(2);expect(roles[0].clipTime).toBeCloseTo(roles[1].clipTime,6);
  for(const a of roles){expect(a.loop).toBe(false);expect(a.weaponMeshes).toEqual([]);}
  expect(frozen.m01.stationEvacuation.delivered).toBe(false);
  await page.waitForTimeout(300);const still=await page.evaluate(()=>window.gameDiagnostics());
  expect(still.m01.stationEvacuation).toEqual(frozen.m01.stationEvacuation);expect(still.m01.characters).toEqual(frozen.m01.characters);
  await page.screenshot({path:info.outputPath(`m01-station-${phase}.png`),style:'#pause { visibility:hidden !important; }',timeout:90000});
  await freezeClick(page,'#restart-checkpoint');
  await page.waitForFunction(phase=>{
    const g=window.gameDiagnostics();if(g.paused&&g.m01.characters.actors?.some(a=>a.clip===`station_drag_patient_${phase}`)){
      document.exitPointerLock();return true;
    }return false;
  },phase);
  await expect(page.locator('#pause')).toBeVisible();const restored=await page.evaluate(()=>window.gameDiagnostics());
  expect(restored.m01.stationEvacuation.patient.stationDrag.startedAt).toBe(snapshot.actors.find(a=>a.id==='generic_rifleman').stationDrag.startedAt);
  for(const role of ['patient','medic'])for(const axis of ['x','y','z','facing'])
    expect(restored.m01.stationEvacuation[role][axis]).toBe(frozen.m01.stationEvacuation[role][axis]);
  await info.attach(`station-${phase}`,{body:JSON.stringify({kind:'production browser continuation of genuine simulation controls',frozen,restored,errors,failed}),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('a missing optional station transition GLB keeps the grounded fallback and completes evacuation',async({page},info)=>{
  test.setTimeout(process.env.CI?240000:180000);
  const d=toStationEvacuation(driver(),{observe:true,phase:'release'}),snapshot=d.sim.snapshot();
  await page.route('**/m01_station_drag_transitions.glb',r=>r.abort());
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors}=await open(page);await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.failures.some(f=>f.path.endsWith('m01_station_drag_transitions.glb')));
  await page.waitForFunction(()=>window.gameDiagnostics().m01.stationEvacuation.delivered);
  const data=await page.evaluate(()=>window.gameDiagnostics());
  expect(data.m01.characters.actors).toContainEqual(expect.objectContaining({id:'generic_rifleman',clip:'wounded'}));
  expect(data.m01.stationEvacuation.patient.carriedBy).toBeNull();expect(data.m01.stationEvacuation.patient.y).toBe(-3);
  expect(data.m01.assetFailures).toEqual([]);expect(data.m01.flags['m01.bak_status']).toBe('unhurt');expect(errors).toEqual([]);
  await info.attach('station-transition-fallback',{body:JSON.stringify({kind:'production continuation; intentional optional asset failure',data,errors}),contentType:'application/json'});
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
test('the genuine train 963 and both MG34 fire sources use optional GLBs, light instances and reproducible pause/restart',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:120000);
  const d=toRepair(driver());d.until(()=>d.sim.battleClock>=seconds('04:45:10'),120);
  const gun=d.sim.actor('de_east_0'),p=d.sim.player,angle=Math.atan2(gun.z-p.z,gun.x-p.x);
  d.step({lookX:Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle))/.0022});
  const snapshot=d.sim.snapshot(false);   // staged CP for the train/MG visual restart, not a continuation save
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await page.waitForFunction(()=>{
    const g=window.gameDiagnostics();
    if(!g.paused&&g.m01.wagons.loaded.length===6&&g.m01.characters.actors.some(a=>a.weapon==='mg34'&&a.clip==='mg34_prone_fire_burst')){
      document.exitPointerLock();return true;
    }return false;
  },null,{timeout:90000});
  await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.gameDiagnostics()),w=frozen.m01.wagons,mg=frozen.m01.characters.actors.filter(a=>a.weapon==='mg34');
  expect(w).toMatchObject({wagons:65,step:9.1,proxies:0,visible:true,first:[1090,0,-2.5],last:[1672.4,0,-2.5]});
  expect(w.loaded).toEqual(['covered:0','covered:1','covered:2','open:0','open:1','open:2']);expect(w.lodDistribution).toEqual({0:0,1:0,2:65});
  expect(w.batches).toBeLessThanOrEqual(10);expect(mg.map(a=>a.id).sort()).toEqual(['de_east_0','de_east_1']);
  expect(frozen.m01.characters.active).toBeLessThanOrEqual(18);
  for(const a of mg){expect(a.weaponLOD).toBe(2);expect(a.weaponMeshes).toContain('mg34_body');expect(a.weaponMeshes).not.toContain('rifle');expect(a.weaponMeshes).not.toContain('clip');expect(a.muzzle.every(Number.isFinite)).toBe(true);}
  await page.waitForTimeout(300);const still=await page.evaluate(()=>window.gameDiagnostics());
  expect(still.clock).toBe(frozen.clock);expect(still.m01.characters).toEqual(frozen.m01.characters);expect(still.m01.wagons).toEqual(w);
  await page.screenshot({path:info.outputPath('m01-train-mg34.jpg'),type:'jpeg',quality:85,style:'#pause { visibility:hidden !important; }',timeout:120000});
  await page.locator('#restart-checkpoint').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
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
  await page.route('**/m01-wagons/*.glb',r=>r.fulfill({status:404,body:'optional wagon missing'}));
  await page.route('**/mg34/m01_mg34_animations.glb',r=>r.fulfill({status:404,body:'optional MG34 clips missing'}));
  await open(page);await page.waitForFunction(()=>{
    const g=window.gameDiagnostics();return g.m01.characters.failures.some(f=>f.path.includes('m01_mg34_animations'))&&
      g.m01.wagons.loaded.length===0&&g.m01.wagons.proxies===65&&g.m01.assetFailures.some(f=>f.path.includes('m01-wagons'));
  });
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
  // Renderer telemetry is latched only after a world frame with a real muzzle batch was submitted.
  // Unlike polling fireEffects.muzzle, the count remains observable after the short visual flash disappears.
  const muzzleStart=await page.evaluate(()=>window.gameDiagnostics().m01.muzzlePresentation.frames),samples=[];
  for(let i=0;i<300&&!(samples.length&&samples.at(-1).n<18);i++){
    await page.waitForTimeout(250);
    samples.push(await page.evaluate(()=>{const d=window.gameDiagnostics(),g=d.m01;return {clock:d.clock,frame:g.renderedFrames,
      n:g.flags['m01.east_platoon_survivors'],muzzle:{...g.muzzlePresentation},inFlight:g.threat.inFlight,
      hud:document.querySelector('#objective-status').textContent,sim:g.threat.status,origins:g.threat.recentFire.map(f=>f.id)};}));
  }
  await info.attach('withdrawal-muzzle-presentation-proof',{body:JSON.stringify({muzzleStart,samples}),contentType:'application/json'});
  const n=samples.at(-1).n;expect(n).toBeLessThan(18);expect(samples.every(s=>s.n>=12)).toBe(true);
  expect(samples.some(s=>s.origins.some(id=>id.startsWith('de_spans_')))).toBe(true);
  expect(samples.some(s=>s.muzzle.frames>muzzleStart)).toBe(true);
  for(const s of samples){expect(s.hud).toBe(s.sim);expect(s.hud).toContain(`Pelotão leste: ${s.n} homens`);}
  await page.screenshot({path:info.outputPath('m01-withdrawal-under-fire.png')});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('a failed M01 bridge load prevents an invisible bridge; the French sandbox remains selectable',async({page})=>{
  await page.route('**/*.glb',r=>r.fulfill({status:404,body:'missing M01 test asset'}));
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.requiredAssetFailures.length===9);
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


test('ckm west crew and weapon use actual saved abandon time, pause and fresh reload',async({page},info)=>{
  test.setTimeout(180000);
  const flow=route(),snapshot=structuredClone(flow.combatSnapshots.eastDemolition);
  // This snapshot was reached by the route's real controls at the demolition event.
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const {errors,failed}=await open(page);await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters?.actors.some(a=>a.clip==='ckm_wz30_gunner_abandon'));
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const before=await page.evaluate(()=>window.gameDiagnostics()),c=before.m01.characters;
  const gunner=c.actors.find(a=>a.id==='ckm_gunner'),loader=c.actors.find(a=>a.id==='ckm_loader');
  expect(loader.clip).toBe('ckm_wz30_loader_abandon');expect(loader.clipTime).toBeCloseTo(gunner.clipTime,5);
  expect(c.ckm.clip).toBe('ckm_wz30_gun_abandon');expect(c.ckm.time).toBeCloseTo(gunner.clipTime,5);
  expect(c.ckm.position).toEqual([24.17,-3,43]);expect(c.ckm.lod).toBe(2);
  await page.waitForTimeout(250);expect((await page.evaluate(()=>window.gameDiagnostics())).m01.characters).toEqual(c);
  await page.screenshot({path:info.outputPath('m01-ckm-abandon.png'),style:'#pause {visibility:hidden !important;}'});
  await page.reload();await open(page);await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters?.loaded.includes('ckm:2'));
  await expect(page.locator('#error')).toBeHidden();expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('optional ckm kit failure retains the crew fallback and checkpoint restoration',async({page})=>{
  test.setTimeout(120000);await page.route('**/m01_ckm_wz30_*.glb',r=>r.abort());
  const d=driver();d.step({skip:true});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:d.sim.snapshot()});
  const {errors}=await open(page);await start(page,'#continue');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters?.failures.some(f=>f.path.includes('ckm_wz30')));
  const c=(await page.evaluate(()=>window.gameDiagnostics())).m01.characters;
  expect(c.actors.filter(a=>a.id.startsWith('ckm_'))).toHaveLength(3);expect(c.ckm).toBeNull();
  expect(c.actors.filter(a=>a.id.startsWith('ckm_')).every(a=>!a.clip.startsWith('ckm_wz30_'))).toBe(true);
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#restart-checkpoint').click();
  await expect(page.locator('#error')).toBeHidden();expect(errors).toEqual([]);
});
