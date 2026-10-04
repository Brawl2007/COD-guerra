import {test,expect} from '@playwright/test';
import {route,driver} from '../helpers/m01-route.js';
import {seconds} from '../../src/game/m01-simulation.js';

const key='cod-guerra:checkpoint:m01:v2';
let preBlast,preImpact;
const reached=route(19390901,{onStep:({sim})=>{
  if(!preBlast&&!sim.consumedEvent('evt_m01_east_demolition')&&sim.battleClock>=seconds('06:09:48'))preBlast=structuredClone(sim.snapshot());
  if(!preImpact&&sim.active('cover_repair')&&sim.enemyFire.rounds.some(r=>r.arriveAt>sim.clock&&r.arriveAt-sim.clock<.35))preImpact=structuredClone(sim.snapshot());
}});
if(!preBlast||!preImpact)throw new Error('Focused FX fixtures were not reached through the real simulation route');
const grenadeDriver=driver(19390901);grenadeDriver.step({skip:true});grenadeDriver.step({grenade:true});
grenadeDriver.until(()=>grenadeDriver.sim.grenades.active[0]?.fuse<1.55,8);
const preGrenade=structuredClone(grenadeDriver.sim.snapshot());

async function openFrom(page,snapshot,quality='medium'){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  return {errors,failed};
}

test('nearby real grenade provides same-camera BEFORE/AFTER proof of the layered small blast',async({page},info)=>{
  test.setTimeout(60000);
  const {errors,failed}=await openFrom(page,preGrenade,'high');
  // Freeze the exact pre-blast camera before taking the BEFORE image; screenshot latency must not consume the fuse.
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  await page.screenshot({path:info.outputPath('BEFORE-near-grenade.png'),style:'#pause {visibility:hidden !important;}',timeout:30000});
  await page.evaluate(()=>{
    window.__m01GrenadeHot=null;
    const tick=()=>{const g=window.gameDiagnostics?.(),f=g?.m01?.battlefieldFx;
      if(f?.active>0&&f.counts.dust>0&&(f.counts.core>0||f.counts.fire>0)){window.__m01GrenadeHot=g;document.exitPointerLock();return;}
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  });
  await page.locator('#resume').click();
  await page.waitForFunction(()=>window.__m01GrenadeHot,null,{timeout:30000});await expect(page.locator('#pause')).toBeVisible();
  const hot=await page.evaluate(()=>window.__m01GrenadeHot),fx=hot.m01.battlefieldFx;
  expect(fx.counts.core+fx.counts.fire).toBeGreaterThan(0);expect(fx.counts.dust).toBeGreaterThan(0);expect(fx.extraLights).toBeLessThanOrEqual(1);
  await page.screenshot({path:info.outputPath('AFTER-near-grenade.png'),style:'#pause {visibility:hidden !important;}',timeout:30000});
  await info.attach('near-grenade-counters',{body:JSON.stringify({fx,drawCalls:hot.drawCalls,triangles:hot.triangles},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('east demolition runs layered blast -> dust -> smoke, freezes on pause and cleans transient pools',async({page},info)=>{
  test.setTimeout(90000);
  const {errors,failed}=await openFrom(page,preBlast,'medium');
  // Capture the short hot phase in-page so software WebGL/remote polling cannot skip the one or two relevant frames.
  await page.evaluate(()=>{
    window.__m01FxHot=null;
    const tick=()=>{const g=window.gameDiagnostics?.(),f=g?.m01?.battlefieldFx;
      if(f?.active>0&&f.counts.dust>0&&(f.counts.core>0||f.counts.fire>0)){window.__m01FxHot=g;document.exitPointerLock();return;}
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  });
  await page.waitForFunction(()=>window.__m01FxHot,null,{timeout:30000});await expect(page.locator('#pause')).toBeVisible();
  const hot=await page.evaluate(()=>window.__m01FxHot);
  expect(hot.m01.battlefieldFx.counts.core+hot.m01.battlefieldFx.counts.fire).toBeGreaterThan(0);
  expect(hot.m01.battlefieldFx.counts.dust).toBeGreaterThan(0);
  expect(hot.m01.battlefieldFx.extraLights).toBeLessThanOrEqual(1);
  expect(hot.m01.battlefieldFx.atmosphere.puffs).toBeLessThanOrEqual(192);
  expect(hot.m01.battlefieldFx.atmosphere.debris).toBeLessThanOrEqual(64);
  await page.screenshot({path:info.outputPath('AFTER-east-demolition-hot-core.png'),style:'#pause {visibility:hidden !important;}',timeout:30000});

  // Resume into the cooling phase and freeze a smoke-dominant frame from the same authoritative blast.
  await page.evaluate(()=>{
    window.__m01FxSmoke=null;
    const tick=()=>{const g=window.gameDiagnostics?.(),f=g?.m01?.battlefieldFx;
      if(f?.active>0&&f.counts.smoke>0&&f.counts.core===0&&f.counts.fire===0){window.__m01FxSmoke=g;document.exitPointerLock();return;}
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  });
  await page.locator('#resume').click();
  await page.waitForFunction(()=>window.__m01FxSmoke,null,{timeout:15000});await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.__m01FxSmoke),fx=frozen.m01.battlefieldFx;
  await page.screenshot({path:info.outputPath('AFTER-east-demolition-smoke.png'),style:'#pause {visibility:hidden !important;}',timeout:30000});
  await page.waitForTimeout(350);
  const still=await page.evaluate(()=>window.gameDiagnostics());
  expect(still.clock).toBe(frozen.clock);expect(still.m01.battlefieldFx).toEqual(fx);

  // Restore while the transient cloud is alive: resetEffects must clear all event-owned pools immediately,
  // independent of software-WebGL frame rate, and the restored checkpoint must not inherit a phantom blast.
  await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  const clean=await page.evaluate(()=>window.gameDiagnostics()),cleanFx=clean.m01.battlefieldFx;
  expect(cleanFx.active).toBe(0);expect(Object.values(cleanFx.counts).every(n=>n===0)).toBe(true);expect(cleanFx.extraLights).toBe(0);
  expect(clean.m01.smokePuffs).toBeLessThanOrEqual(192);
  await page.waitForTimeout(250);expect((await page.evaluate(()=>window.gameDiagnostics())).m01.battlefieldFx).toEqual(cleanFx);
  await info.attach('fx-counters',{body:JSON.stringify({hot:hot.m01.battlefieldFx,frozen:fx,clean:cleanFx,drawCalls:hot.drawCalls,triangles:hot.triangles,textures:hot.textures,geometries:hot.geometries},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('real in-flight round produces bounded material impact FX without altering the saved simulation path',async({page},info)=>{
  test.setTimeout(60000);
  const {errors,failed}=await openFrom(page,preImpact,'high');
  const before=await page.evaluate(()=>window.gameDiagnostics());
  await page.waitForFunction(()=>{const f=window.gameDiagnostics().m01.fireEffects;return f.puff>0||f.spark>0||f.chip>0;},null,{timeout:20000});
  const impact=await page.evaluate(()=>window.gameDiagnostics());
  expect(impact.m01.fireEffects.puff).toBeLessThanOrEqual(144);
  expect(impact.m01.fireEffects.spark).toBeLessThanOrEqual(96);
  expect(impact.m01.fireEffects.chip).toBeLessThanOrEqual(128);
  await page.screenshot({path:info.outputPath('AFTER-real-round-impact.png'),timeout:30000});
  await info.attach('impact-counters',{body:JSON.stringify({before:before.m01.fireEffects,impact:impact.m01.fireEffects,drawCalls:impact.drawCalls,triangles:impact.triangles},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
