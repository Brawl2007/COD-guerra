import {test,expect} from '@playwright/test';
import {toCoverAdjustment} from '../helpers/m01-route.js';
import {M01Simulation} from '../../src/game/m01-simulation.js';

const key='cod-guerra:checkpoint:m01:v2';

function realRoundFixture({requireHit}){
  const d=toCoverAdjustment({truss:true}),sim=d.sim;
  const shooter=sim.enemies.find(a=>a.active&&a.alive&&a.weapon==='kar98k'&&sim.world.lineOfSight(a,sim.player));
  if(!shooter)throw new Error('No real line-of-sight rifleman available for focused combat fixture');
  for(let attempt=0;attempt<20;attempt++){
    sim.burst(shooter,sim.player,'player',{rounds:1,bias:[0,0],cone:[0,0]});
    sim.drainEvents(); // firing notification only; the authoritative round remains in enemyFire.rounds.
    const before=sim.snapshot(),health=sim.player.health,rng=sim.rng.state;
    const landed=[];
    for(let step=0;step<80&&!landed.some(e=>e.type==='round-impact');step++){
      sim.tick(.05,{});landed.push(...sim.drainEvents());
    }
    const hit=landed.some(e=>e.type==='player-hit'),crack=landed.some(e=>e.type==='round-impact'&&e.crack);
    if(crack&&hit===requireHit)return {snapshot:before,health,rng,shooter:shooter.id};
  }
  throw new Error(`No deterministic real round fixture found (requireHit=${requireHit})`);
}

function realGrenadeFixture(){
  const sim=new M01Simulation(19390901);
  sim.tick(.05,{skip:true});sim.drainEvents(); // leave the skippable intro through normal controls.
  const ammo=sim.grenades.ammo;
  sim.tick(.05,{grenade:true});sim.drainEvents();
  if(sim.grenades.ammo!==ammo-1||sim.grenades.active.length!==1)throw new Error('Real grenade throw was not accepted');
  for(let i=0;i<100&&sim.grenades.active[0]?.fuse>.12;i++){sim.tick(.05,{});sim.drainEvents();}
  const grenade=sim.grenades.active[0];
  if(!grenade||grenade.fuse<=0||grenade.fuse>.12)throw new Error('Could not freeze real grenade immediately before detonation');
  return {snapshot:sim.snapshot(),grenade:{...grenade},player:{x:sim.player.x,y:sim.player.y,z:sim.player.z}};
}

const hitFixture=realRoundFixture({requireHit:true});
const nearFixture=realRoundFixture({requireHit:false});
const grenadeFixture=realGrenadeFixture();

async function openSaved(page,snapshot,quality='medium'){
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.selectOption('#quality',quality);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:30000});
}
const feedback=diag=>diag.m01.combatFeedback;

test('real enemy hit drives bounded directional M01 presentation and reset semantics',async({page},info)=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await openSaved(page,hitFixture.snapshot,'medium');
  const authoritativeBefore=await page.evaluate(()=>window.gameDiagnostics().player);

  await page.waitForFunction(()=>{
    const f=window.gameDiagnostics().m01.combatFeedback;
    return f.counts.playerHit>0&&f.lastHitDirection!==null;
  },null,{timeout:20000});
  const hit=await page.evaluate(()=>window.gameDiagnostics()),h=feedback(hit);
  expect(h.peaks.hitImpulse).toBeGreaterThan(0);expect(h.peaks.overlayAlpha).toBeGreaterThan(0);
  expect(h.peaks.hitImpulse).toBeLessThanOrEqual(1);expect(h.peaks.overlayAlpha).toBeLessThanOrEqual(.42);
  expect(h.peaks.shakeStrength).toBeLessThanOrEqual(.02);expect(Math.abs(h.lastHitDirection)).toBeLessThanOrEqual(1);
  expect(hit.player.angle).toBe(authoritativeBefore.angle);expect(hit.player.pitch).toBe(authoritativeBefore.pitch);
  await page.screenshot({path:info.outputPath('m01-real-player-hit.png')});
  await info.attach('player-hit-diagnostics.json',{body:JSON.stringify(h,null,2),contentType:'application/json'});

  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const frozen=await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback);
  await page.waitForTimeout(350);
  expect(await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback)).toEqual(frozen);

  await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const reset=await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback);
  expect(reset.counts.playerHit).toBe(0);expect(reset.peaks.hitImpulse).toBe(0);expect(reset.peaks.overlayAlpha).toBe(0);

  await page.reload();
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  const reloaded=await page.evaluate(()=>window.gameDiagnostics().m01.combatFeedback);
  expect(reloaded).toMatchObject({activeEvents:0,suppressionVisual:0,overlayAlpha:0});
  expect(reloaded.peaks.hitImpulse).toBe(0);expect(errors).toEqual([]);
});

test('real crack and nearby impact register danger, accumulation caps and Low tier',async({page},info)=>{
  test.setTimeout(180000);
  await openSaved(page,nearFixture.snapshot,'high');

  await page.waitForFunction(()=>{
    const f=window.gameDiagnostics().m01.combatFeedback;
    return f.counts.nearMiss>0&&f.lastDirection!==null;
  },null,{timeout:20000});
  const near=await page.evaluate(()=>window.gameDiagnostics()),n=feedback(near);
  expect(n.peaks.nearMissImpulse).toBeGreaterThan(0);expect(n.peaks.impactImpulse).toBeGreaterThan(0);
  expect(n.peaks.overlayAlpha).toBeGreaterThan(0);expect(n.peaks.nearMissImpulse).toBeLessThanOrEqual(.72);
  expect(n.peaks.impactImpulse).toBeLessThanOrEqual(.5);expect(n.peaks.suppressionVisual).toBeLessThanOrEqual(1);
  expect(n.peaks.overlayAlpha).toBeLessThanOrEqual(.42);expect(n.peaks.shakeStrength).toBeLessThanOrEqual(.02);

  await page.waitForTimeout(2500);
  const accumulated=feedback(await page.evaluate(()=>window.gameDiagnostics()));
  expect(accumulated.counts.nearImpact).toBeGreaterThanOrEqual(n.counts.nearImpact);
  expect(accumulated.peaks.suppressionVisual).toBeLessThanOrEqual(1);
  expect(accumulated.peaks.overlayAlpha).toBeLessThanOrEqual(.42);
  expect(accumulated.peaks.shakeStrength).toBeLessThanOrEqual(.02);

  await page.screenshot({path:info.outputPath('m01-real-near-miss.png')});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  await page.locator('#back-menu').click();await expect(page.locator('#menu')).toBeVisible();
  await page.selectOption('#quality','low');
  const low=feedback(await page.evaluate(()=>window.gameDiagnostics()));
  expect(low.quality).toBe('low');expect(low.exposureFlash).toBe(0);
  await info.attach('near-miss-diagnostics.json',{body:JSON.stringify({near:n,accumulated,low},null,2),contentType:'application/json'});
});

test('real grenade detonation produces bounded nearby explosion feedback without moving the player',async({page},info)=>{
  test.setTimeout(180000);
  await openSaved(page,grenadeFixture.snapshot,'medium');
  const before=await page.evaluate(()=>window.gameDiagnostics());

  await page.waitForFunction(()=>window.gameDiagnostics().m01.combatFeedback.counts.explosion>0,null,{timeout:20000});
  const blast=await page.evaluate(()=>window.gameDiagnostics()),b=feedback(blast);
  expect(b.peaks.explosionImpulse).toBeGreaterThan(0);expect(b.peaks.overlayAlpha).toBeGreaterThan(0);
  expect(b.peaks.explosionImpulse).toBeLessThanOrEqual(1);expect(b.peaks.overlayAlpha).toBeLessThanOrEqual(.42);
  expect(b.peaks.shakeStrength).toBeLessThanOrEqual(.02);
  expect(blast.player.x).toBe(before.player.x);expect(blast.player.z).toBe(before.player.z);
  await page.screenshot({path:info.outputPath('m01-real-near-explosion.png')});
  await info.attach('explosion-diagnostics.json',{body:JSON.stringify(b,null,2),contentType:'application/json'});
});
