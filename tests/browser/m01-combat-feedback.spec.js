import {test,expect} from '@playwright/test';
import {toCoverAdjustment} from '../helpers/m01-route.js';

const key='cod-guerra:checkpoint:m01:v2';

function findFixture(predicate,{limit=3600,expose=false}={}){
  const d=toCoverAdjustment({truss:expose}),seenStart=d.events.length;
  let seen=seenStart;
  for(let i=0;i<limit;i++){
    const before=d.sim.snapshot(),health=d.sim.player.health,rng=d.sim.rng.state;
    d.step({});
    const fresh=d.events.slice(seen);seen=d.events.length;
    const event=fresh.find(predicate);
    if(event)return {snapshot:before,event,health,rng};
  }
  throw new Error('Focused combat feedback fixture not found in deterministic real route');
}
const hitFixture=findFixture(e=>e.type==='player-hit',{limit:7200,expose:true});
const nearFixture=findFixture(e=>e.type==='round-impact'&&e.crack,{limit:3600,expose:false});

async function openSaved(page,snapshot,quality='medium'){
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.selectOption('#quality',quality);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:30000});
}
const feedback=diag=>diag.m01.combatFeedback;

test('real enemy hit and real near miss drive bounded directional M01 presentation only',async({page},info)=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await openSaved(page,hitFixture.snapshot,'medium');
  const authoritativeBefore=await page.evaluate(()=>window.gameDiagnostics().player);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.combatFeedback.counts.playerHit>0,null,{timeout:20000});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.combatFeedback.lastHitDirection!==null,null,{timeout:20000});
  const hit=await page.evaluate(()=>window.gameDiagnostics());
  expect(feedback(hit).hitImpulse).toBeGreaterThan(0);expect(feedback(hit).overlayAlpha).toBeGreaterThan(0);
  expect(feedback(hit).overlayAlpha).toBeLessThanOrEqual(.42);expect(feedback(hit).shakeStrength).toBeLessThanOrEqual(.02);
  expect(Math.abs(feedback(hit).roll)).toBeLessThanOrEqual(.012);
  expect(hit.player.angle).toBe(authoritativeBefore.angle);expect(hit.player.pitch).toBe(authoritativeBefore.pitch);
  await page.screenshot({path:info.outputPath('m01-real-player-hit.png')});

  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback);await page.waitForTimeout(350);
  expect((await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback)).toEqual(frozen);
  await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.combatFeedback.activeEvents===0);
  const reset=await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback);
  expect(reset.suppressionVisual).toBe(0);expect(reset.overlayAlpha).toBe(0);

  await page.evaluate(()=>document.exitPointerLock());await page.reload();
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  expect((await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback)).toMatchObject({activeEvents:0,suppressionVisual:0,overlayAlpha:0});
  expect(errors).toEqual([]);
});

test('real crack/impact, MG accumulation, close grenade and quality caps remain presentation-only',async({page},info)=>{
  test.setTimeout(180000);
  await openSaved(page,nearFixture.snapshot,'high');
  const start=await page.evaluate(()=>window.gameDiagnostics());
  await page.waitForFunction(()=>window.gameDiagnostics().m01.combatFeedback.counts.nearMiss>0,null,{timeout:20000});
  const near=await page.evaluate(()=>window.gameDiagnostics());
  expect(feedback(near).nearMissImpulse).toBeGreaterThan(0);expect(feedback(near).direction).not.toBe(0);
  expect(feedback(near).suppressionVisual).toBeLessThanOrEqual(1);
  expect(feedback(near).overlayAlpha).toBeLessThanOrEqual(.42);

  await page.waitForTimeout(2500);
  const accumulated=await page.evaluate(()=>window.gameDiagnostics());
  expect(feedback(accumulated).counts.nearImpact).toBeGreaterThanOrEqual(feedback(near).counts.nearImpact);
  expect(feedback(accumulated).suppressionVisual).toBeLessThanOrEqual(1);
  expect(feedback(accumulated).shakeStrength).toBeLessThanOrEqual(.02);

  // Real grenade through normal input, aimed down so the authoritative blast remains close enough to have visual weight.
  await page.evaluate(()=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:360,bubbles:true})));
  await page.waitForFunction(()=>window.gameDiagnostics().player.pitch<-.45);
  const explosionCount=feedback(await page.evaluate(()=>window.gameDiagnostics())).counts.explosion;
  await page.keyboard.press('KeyG');
  await page.waitForFunction(count=>window.gameDiagnostics().m01.combatFeedback.counts.explosion>count,explosionCount,{timeout:15000});
  const blast=await page.evaluate(()=>window.gameDiagnostics());
  expect(feedback(blast).explosionImpulse).toBeGreaterThan(0);
  expect(feedback(blast).overlayAlpha).toBeLessThanOrEqual(.42);expect(feedback(blast).shakeStrength).toBeLessThanOrEqual(.02);
  expect(blast.player.x).toBe(start.player.x);expect(blast.player.z).toBe(start.player.z);
  await page.screenshot({path:info.outputPath('m01-near-miss-and-explosion.png')});

  await page.selectOption('#quality','low');
  const low=await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback);
  expect(low.quality).toBe('low');expect(low.exposureFlash).toBe(0);expect(low.overlayAlpha).toBeLessThanOrEqual(.42);
});
