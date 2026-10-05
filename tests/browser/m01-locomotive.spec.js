import {test,expect} from '@playwright/test';
import {driver,toRepair} from '../helpers/m01-route.js';
import {seconds} from '../../src/game/m01-simulation.js';
const key='cod-guerra:checkpoint:m01:v2';
const d=toRepair(driver());d.until(()=>d.sim.battleClock>=seconds('04:45:10'),120);const snapshot=d.sim.snapshot(false);
for(const fallback of [false,true])test(`locomotive 963 production ${fallback?'optional failure fallback':'GLBs load, far LOD, pause and restore'}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(fallback)await page.route('**/locomotive/*.glb',r=>r.abort());
 await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
 await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
 await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
 await page.waitForFunction(fallback=>{const l=window.gameDiagnostics().m01.locomotive;return l.visible&&(fallback?l.fallback:l.loaded.length===3);},fallback);
 await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
 const frozen=await page.evaluate(()=>window.gameDiagnostics()),l=frozen.m01.locomotive;
 expect(l.position).toEqual([1075,0,-2.5]);expect(l.rotationY).toBe(Math.PI/2);expect(l.fallback).toBe(fallback);expect(l.visible).toBe(true);
 if(!fallback){expect(l.loaded).toEqual([0,1,2]);expect(l.lod).toBe(2);expect(frozen.m01.assetFailures.filter(f=>f.path.includes('/locomotive/'))).toEqual([]);}
 else expect(frozen.m01.assetFailures.filter(f=>f.path.includes('/locomotive/'))).toHaveLength(3);
 await page.waitForTimeout(200);const paused=await page.evaluate(()=>window.gameDiagnostics());expect(paused.clock).toBe(frozen.clock);expect(paused.m01.locomotive).toEqual(l);
 if(!fallback){await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.locomotive.loaded.length===3);await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);await page.evaluate(()=>document.exitPointerLock());expect((await page.evaluate(()=>window.gameDiagnostics())).m01.locomotive).toEqual(l);}
 expect(errors).toEqual([]);
});
