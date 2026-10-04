import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';

const key='cod-guerra:checkpoint:m01:v2';
const E=name=>`evt_m01_${name}`;

function intactSnapshot(){
  const d=driver(),{sim,step,walk}=d;step({skip:true});walk(-300,8);return sim.snapshot();
}
function burnedSnapshot(){
  const d=driver(),{sim,step,until,walk}=d;
  step({skip:true});walk(-66,26);walk(-15,26);walk(-15,2);walk(16,2);step({interact:true});
  until(()=>sim.consumedEvent(E('station_wagon_hit')),120);
  walk(-330,8);return sim.snapshot();
}
async function open(page,snapshot){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.yardWagons?.lod!==null);
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeVisible();
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  return errors;
}
async function restartContinuation(page){
  await page.reload();
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.yardWagons?.lod!==null);
  await expect(page.locator('#continue')).toBeVisible();await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
}

test('station yard screenshots prove intact then persisted burned/fire state; pause, off-camera and double continuation restore do not reset it',async({page},info)=>{
  test.setTimeout(180000);
  const intact=intactSnapshot(),errors=await open(page,intact);
  let diag=await page.evaluate(()=>window.gameDiagnostics());
  expect(diag.m01.destruction).not.toContain('station_wagon_fire');
  expect(diag.m01.yardWagons.wagons.map(w=>w.state)).toEqual(['intact','intact','intact']);
  await page.screenshot({path:info.outputPath('station-wagon-intact.png')});

  await page.evaluate(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:burnedSnapshot()});
  await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.yardWagons?.lod!==null);
  await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.yardFireVisible&&window.gameDiagnostics().m01.smokePuffs>0);
  diag=await page.evaluate(()=>window.gameDiagnostics());
  expect(diag.m01.destruction.filter(x=>x==='station_wagon_fire')).toHaveLength(1);
  expect(diag.m01.eventIds??diag.eventIds).toBeDefined();
  expect(diag.eventIds).toContain('evt_m01_station_wagon_hit');
  expect(diag.m01.yardWagons.wagons.find(w=>w.id==='yard_wagon_3').state).toBe('burned');
  await page.screenshot({path:info.outputPath('station-wagon-burning.png')});

  const beforeTurn=diag;
  await page.evaluate(()=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0,bubbles:true})));
  await page.evaluate(()=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:Math.PI/.0022,movementY:0,bubbles:true})));
  await page.waitForFunction(angle=>Math.abs(Math.atan2(Math.sin(window.gameDiagnostics().player.angle-angle),Math.cos(window.gameDiagnostics().player.angle-angle)))>2.5,beforeTurn.player.angle);
  const away=await page.evaluate(()=>window.gameDiagnostics());
  expect(away.m01.destruction).toEqual(beforeTurn.m01.destruction);
  expect(away.m01.yardWagons.wagons.map(w=>[w.id,w.state,w.key])).toEqual(beforeTurn.m01.yardWagons.wagons.map(w=>[w.id,w.state,w.key]));

  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.gameDiagnostics());await page.waitForTimeout(400);
  const still=await page.evaluate(()=>window.gameDiagnostics());
  expect(still.clock).toBe(frozen.clock);expect(still.m01.battleClock).toBe(frozen.m01.battleClock);
  expect(still.m01.yardWagons).toEqual(frozen.m01.yardWagons);expect(still.m01.smokePuffs).toBe(frozen.m01.smokePuffs);
  expect(still.m01.renderedFrames).toBe(frozen.m01.renderedFrames);
  await page.screenshot({path:info.outputPath('station-wagon-paused.png'),style:'#pause { visibility:hidden !important; }'});

  await restartContinuation(page);
  let restored=await page.evaluate(()=>window.gameDiagnostics());
  expect(restored.m01.destruction.filter(x=>x==='station_wagon_fire')).toHaveLength(1);
  expect(restored.m01.yardWagons.wagons.find(w=>w.id==='yard_wagon_3').state).toBe('burned');
  await page.screenshot({path:info.outputPath('station-wagon-restored.png')});
  await restartContinuation(page);
  restored=await page.evaluate(()=>window.gameDiagnostics());
  expect(restored.m01.destruction.filter(x=>x==='station_wagon_fire')).toHaveLength(1);
  expect(restored.m01.yardWagons.wagons.find(w=>w.id==='yard_wagon_3').state).toBe('burned');
  expect(errors).toEqual([]);
});

test('blocked yard wagon GLBs use visible procedural fallbacks while the persisted gameplay state remains burned',async({page},info)=>{
  test.setTimeout(120000);
  await page.route('**/m01-wagons/*.glb',route=>route.abort());
  await page.route('**/m01-wagon-damage/*.glb',route=>route.abort());
  const errors=await open(page,burnedSnapshot());
  await page.waitForFunction(()=>window.gameDiagnostics().m01.yardWagons.wagons.every(w=>w.key==='fallback'));
  const diag=await page.evaluate(()=>window.gameDiagnostics());
  expect(diag.m01.destruction).toContain('station_wagon_fire');
  expect(diag.m01.yardWagons.wagons.every(w=>w.fallbackVisible&&!w.modelVisible)).toBe(true);
  expect(diag.m01.yardWagons.wagons.find(w=>w.id==='yard_wagon_3').state).toBe('burned');
  expect(diag.m01.yardFireVisible).toBe(true);expect(diag.m01.smokePuffs).toBeGreaterThan(0);
  expect(diag.m01.assetFailures.filter(f=>f.path.includes('m01-wagon')).length).toBeGreaterThan(0);
  await page.screenshot({path:info.outputPath('station-wagon-fallback.png')});
  expect(errors).toEqual([]);
});
