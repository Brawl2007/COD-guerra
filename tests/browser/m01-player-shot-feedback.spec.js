import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';

// T19 remainder, browser side. Honest scope: a confirmed enemy hit (player-shot hit:true) cannot be staged here, because the
// checkpoint validator only allows enemies at x >= 690 m and Game is not exposed to the page. The hit-driven timing (0.15 s of
// mission clock, pause freeze, reset, hit:true only) and the delayed far-impact sound are proven against the real Game code in
// tests/m01-player-shot-feedback.test.js. This spec proves what only a browser can: the built page carries the marker
// element and its CSS (hidden by default, drawn when lit, forced hidden in cinematic HUD), and that a real player shot that
// hits no enemy leaves it dark.
const key='cod-guerra:checkpoint:m01:v2';
const ready=(()=>{const d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();for(let i=0;i<12;i++)d.step({aim:true});return d.sim.snapshot();})();
const marker=page=>page.evaluate(()=>{const m=document.querySelector('#hit-marker');return {ticks:m?.querySelectorAll('i').length,
  opacity:Number(getComputedStyle(m).opacity),inHud:Boolean(m.closest('#hud')),cinematic:document.querySelector('#hud').classList.contains('cinematic')};});

test('hit marker: wired into the HUD, dark after a real non-hit shot, lit only outside cinematic HUD',async({page})=>{
  test.setTimeout(process.env.CI?180000:90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:ready});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  let m=await marker(page);expect(m).toMatchObject({ticks:4,opacity:0,inHud:true,cinematic:false});
  await page.evaluate(()=>{window.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));window.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.shotCount===1);
  await page.waitForTimeout(300);m=await marker(page);expect(m.opacity).toBe(0);   // the shot hit no enemy: no marker
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  // Lit style (what the presenter writes) is visible in a live HUD and forced off in the cinematic HUD.
  await page.evaluate(()=>{document.querySelector('#hit-marker').style.setProperty('opacity','1');});
  expect((await marker(page)).opacity).toBe(1);
  await page.evaluate(()=>document.querySelector('#hud').classList.add('cinematic'));expect((await marker(page)).opacity).toBe(0);
  await page.evaluate(()=>{document.querySelector('#hud').classList.remove('cinematic');document.querySelector('#hit-marker').style.removeProperty('opacity');});
  expect((await marker(page)).opacity).toBe(0);
  expect(errors).toEqual([]);
});
