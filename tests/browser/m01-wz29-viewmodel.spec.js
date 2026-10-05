import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';
const key='cod-guerra:checkpoint:m01:v2';
for(const quality of ['low','medium','high'])test(`Wz.29 production ADS, paused save reconstruction and actual sights on ${quality}`,async({page},info)=>{
  const d=driver();d.step({skip:true});for(let i=0;i<12;i++)d.step({aim:true});
  const snapshot=d.sim.snapshot(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await expect(page.locator('#start')).toBeEnabled();await page.locator('#quality').selectOption(quality);
  // Freeze at the first native pointer-lock boundary, before a gameplay tick.
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);
  });
  const menuFrames=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames);
  await page.locator('#continue').click();await expect(page.locator('#pause')).toBeVisible();
  // Wait for a frame from the restored world, not merely an already-active menu viewmodel.
  await page.waitForFunction(({clock,frames})=>{
    const g=window.gameDiagnostics();return g.clock===clock&&g.m01.renderedFrames>frames&&g.m01.viewModel.active;
  },{clock:snapshot.clock,frames:menuFrames});
  const before=await page.evaluate(()=>window.gameDiagnostics());
  const v=before.m01.viewModel;
  expect(v.lod).toBe(0);expect(v.aimBlend).toBe(1);expect(v.clip).toBe('aim');
  for(const sight of Object.values(v.visualSights)){expect(Math.abs(sight[0])).toBeLessThan(1e-8);expect(Math.abs(sight[1])).toBeLessThan(1e-8);expect(sight[2]).toBeLessThan(-.7);}
  expect(before.m01.weapon).toMatchObject(snapshot.weapon);expect(before.clock).toBe(snapshot.clock);
  await page.waitForTimeout(200);const after=await page.evaluate(()=>window.gameDiagnostics());
  expect(after.m01.viewModel).toEqual(v);expect(after.player).toEqual(before.player);expect(after.clock).toBe(before.clock);
  await page.screenshot({path:info.outputPath(`wz29-production-ADS-${quality}.png`),style:'#pause {visibility:hidden !important}'});
  expect(errors).toEqual([]);
});
