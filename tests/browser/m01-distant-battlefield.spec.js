import {test,expect} from '@playwright/test';
import {route} from '../helpers/m01-route.js';

// Production build: the distant layer renders from genuine route snapshots and never touches the simulation.
const key='cod-guerra:checkpoint:m01:v2',shots={};
route(19390901,{onStep:({sim})=>{
  const c=sim.consumed,at=(id,dt)=>Number.isFinite(c[id])&&sim.clock>=c[id]+dt;
  if(!shots.east&&at('evt_m01_bombing_0530',60))shots.east=sim.snapshot();
  if(!shots.north&&at('evt_m01_north_contact_distant',160))shots.north=sim.snapshot();
}});
if(!shots.east||!shots.north)throw new Error('distant battlefield fixtures not reached through the real route');

async function openFrom(page,snapshot,quality){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  return {errors,failed};
}

for(const [name,quality]of [['east','low'],['north','high']])test(`distant battlefield (${name}, ${quality}): presentation + ambient layers render bounded, freeze on pause, leave gameplay untouched`,async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  const snapshot=shots[name],{errors,failed}=await openFrom(page,snapshot,quality);
  await page.waitForFunction(()=>{const d=window.gameDiagnostics().m01.distantBattlefield;return d.events>0&&d.instances.flashes+d.instances.puffs+d.instances.streaks>0;},null,{timeout:process.env.CI?120000:60000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const a=await page.evaluate(()=>window.gameDiagnostics());await page.waitForTimeout(300);const b=await page.evaluate(()=>window.gameDiagnostics());
  const d=a.m01.distantBattlefield;
  expect(b.clock).toBe(a.clock);expect(b.m01.distantBattlefield).toEqual(d);
  for(const [k,v]of Object.entries(d.instances))expect(v).toBeLessThanOrEqual(d.limits[k]);
  expect(d.layers.ambient).toBeGreaterThan(0);
  if(name==='north'){expect(d.layers.presentation).toBeGreaterThan(0);expect(d.sources).toContain('evt_m01_north_contact_distant');}
  expect(d.sources.every(s=>s.startsWith('evt_m01_')||s.startsWith('ambient:'))).toBe(true);
  // Gameplay authority is the simulation's: without input the weapon kept its saved state while the war went on around it.
  expect(a.m01.weapon).toMatchObject({mag:snapshot.weapon.mag,reserve:snapshot.weapon.reserve,shotCount:snapshot.weapon.shotCount});
  await page.screenshot({path:info.outputPath(`distant-${name}-${quality}.png`),style:'#pause {visibility:hidden !important}'});
  await info.attach('distant-battlefield',{body:JSON.stringify(d,null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
