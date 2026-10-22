import {test,expect} from '@playwright/test';
import {firstBurst} from '../helpers/m01-ckm-scenario.js';
import {CKM_POSITION,ckmMuzzle} from '../../src/game/m01-simulation.js';

// T47, real game (production build, Chromium): the ckm wz.30 at post S2 actually fires. The saves come from the real route (tests/helpers/m01-ckm-scenario.js):
// one tick before the first burst, and in the middle of it. Nothing is injected into the page; the simulation decides, and the page must show what it decided:
// the fire_burst clips of the gun and both crew roles, the muzzle flash, the ckm burst in the audio, the sandbag emplacement, and no console error.
const key='cod-guerra:checkpoint:m01:v2';
let fixture;
test.beforeAll(()=>{fixture=firstBurst();});

// The player stands 14 m behind-left of the gun, looking at it: the gun, the crew and the emplacement are in the frame for the screenshot.
function nearTheGun(snapshot){
  const save=structuredClone(snapshot),m=ckmMuzzle();
  Object.assign(save.player,{x:-4,y:-3,z:21.5,angle:Math.atan2(m.z-21.5,m.x+4),pitch:-.02,crouched:false});
  return save;
}
async function startFrom(page,snapshot){
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().audio.state==='running'&&window.gameDiagnostics().audio.loops.includes('wind'),null,{timeout:30000});
}
const watch=page=>{const errors=[],consoleErrors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});return {errors,consoleErrors,failed};};

test('the ckm fires for real: fire_burst clips on the gun and both crew roles, a muzzle flash in the world, the burst in the audio, and no console error',async({page},info)=>{
  test.setTimeout(process.env.CI?300000:200000);
  const seen=watch(page);
  await startFrom(page,nearTheGun(fixture.pre));
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters?.ckm,null,{timeout:60000});   // the optional ckm kit is loaded
  const start=await page.evaluate(()=>window.gameDiagnostics());
  expect(start.m01.ckm).toMatchObject({phase:expect.any(String),belt:expect.any(Number)});
  expect(start.m01.characters.ckm.position).toEqual(Object.values(CKM_POSITION));   // S2, not the casemate
  const belt0=start.m01.ckm.belt;
  // gameDiagnostics().audio.lastEvents is only the last 12 of the manager's history, and footsteps and foley (audio feel) now share it, so the ckm report scrolls out of that window
  // before a poll can see it. Collect every event the diagnostics exposes, keyed by its serial, and look the ckm one up by kind in that log (nothing is injected or filtered out).
  await page.evaluate(()=>{window.__audioLog=new Map();const pull=()=>{for(const e of window.gameDiagnostics?.().audio?.lastEvents??[])window.__audioLog.set(e.serial,e);};pull();setInterval(pull,20);});
  // The burst: simulation phase, then the clips drawn from it (gun + gunner + loader), then the flash frames counted by the view.
  await page.waitForFunction(()=>{const d=window.gameDiagnostics(),c=d.m01.characters;
    return d.m01.ckm?.phase==='fire_burst'&&c.ckm?.clip==='ckm_wz30_gun_fire_burst'&&c.actors.some(a=>a.id==='ckm_gunner'&&a.clip==='ckm_wz30_gunner_fire_burst')&&c.actors.some(a=>a.id==='ckm_loader'&&a.clip==='ckm_wz30_loader_fire_burst');},null,{timeout:60000});
  const burst=await page.evaluate(()=>window.gameDiagnostics());
  expect(burst.m01.ckm.plan).toMatchObject({rounds:8});expect(burst.m01.ckm.plan.emitted).toBeGreaterThanOrEqual(1);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.ckmPresentation.frames>0,null,{timeout:60000});
  await page.screenshot({path:info.outputPath('m01-ckm-burst.png')});
  // The report reaches the player after distance / 343 s: one ckm event recorded by the audio manager, tagged with the muzzle position the simulation published.
  await page.waitForFunction(()=>(window.gameDiagnostics().audio.eventCounts.ckm??0)>=1&&[...window.__audioLog.values()].some(e=>e.kind==='ckm'),null,{timeout:60000});
  const heard=await page.evaluate(()=>window.gameDiagnostics());
  const last=await page.evaluate(()=>[...window.__audioLog.values()].find(e=>e.kind==='ckm'));
  expect(last).toBeTruthy();expect(last.detail).toMatchObject({weapon:'ckm_wz30',rounds:8,interval:.1});expect(last.key.startsWith('ckm_wz30@8,26:')).toBe(true);
  // Presentation only: the pending queue holds fire/blast kinds, the view drew the flash from the saved plan, and the belt fell by the rounds issued.
  expect(heard.m01.pendingAudio.every(s=>['fire','blast','impact'].includes(s.kind))).toBe(true);
  expect(heard.m01.ckmPresentation.frames).toBeGreaterThan(0);expect(heard.m01.ckmPresentation.flashes).toBeGreaterThanOrEqual(1);
  expect(heard.m01.ckm.belt).toBeLessThan(belt0);expect(heard.m01.ckm.bursts).toBeGreaterThanOrEqual(1);
  // The sandbag emplacement round the gun is original procedural decoration without colliders.
  expect(heard.m01.environmentProps.ckmEmplacement).toMatchObject({visible:true,collidersAdded:0});
  expect(heard.m01.environmentProps.ckmEmplacement.instances).toBeGreaterThan(60);
  await info.attach('ckm-live-fire.json',{body:JSON.stringify({start:start.m01.ckm,burst:burst.m01.ckm,heard:{clock:heard.clock,ckm:heard.m01.ckm,ckmPresentation:heard.m01.ckmPresentation,audio:{eventCounts:heard.audio.eventCounts,last}},muzzle:ckmMuzzle()},null,2),contentType:'application/json'});
  expect(seen.errors).toEqual([]);expect(seen.consoleErrors).toEqual([]);expect(seen.failed).toEqual([]);
});

test('a save in the middle of a burst resumes it in the browser: the remaining rounds are issued, flash and land, with the same clips and no error',async({page})=>{
  test.setTimeout(process.env.CI?300000:200000);
  const seen=watch(page);
  await startFrom(page,nearTheGun(fixture.mid));
  const resumed=await page.evaluate(()=>window.gameDiagnostics().m01.ckm);
  expect(resumed.plan).toMatchObject({rounds:8});expect(resumed.plan.emitted).toBeGreaterThanOrEqual(4);
  expect(['fire_burst','aim']).toContain(resumed.phase);
  // The plan empties as its last round lands (about 2.4 s of mission time after the first round), whatever the frame rate of the software GL.
  await page.waitForFunction(()=>{const d=window.gameDiagnostics();return !d.paused&&d.m01.ckm.plan===null;},null,{timeout:120000});
  const done=await page.evaluate(()=>window.gameDiagnostics());
  expect(done.m01.ckm.belt).toBeLessThanOrEqual(resumed.belt);
  expect(done.m01.ckm.phase).not.toBe('abandon');
  expect(done.m01.characters.ckm.clip.startsWith('ckm_wz30_gun_')).toBe(true);
  expect(seen.errors).toEqual([]);expect(seen.consoleErrors).toEqual([]);expect(seen.failed).toEqual([]);
});
