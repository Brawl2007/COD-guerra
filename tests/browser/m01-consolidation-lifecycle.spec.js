import {test,expect} from '@playwright/test';

test('menu Low quality controls first audio allocation; persisted pagehide pauses and remains resumable',async({page},info)=>{
  test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    localStorage.setItem('cod-guerra:visual-quality','high');
    const original=AudioContext.prototype.createConvolver;
    window.__convolvers=[];
    AudioContext.prototype.createConvolver=function(...args){const node=original.apply(this,args);window.__convolvers.push(node);return node;};
  });
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await page.locator('#quality').selectOption('low');await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().audio.state==='running');
  // T06a builds two zone reverbs (src/core/audio/mix.js): A is the open exterior tail, 1.2 s on Low (the allocation this spec has always pinned); B is the short metallic one, 0.45 s on Low.
  expect(await page.evaluate(()=>window.__convolvers.map(c=>c.buffer.duration))).toEqual([expect.closeTo(1.2,5),expect.closeTo(.45,5)]);
  const initial=await page.evaluate(()=>window.gameDiagnostics());expect(initial.quality).toBe('low');expect(initial.audio.quality).toBe('low');
  // Exercise the persisted lifecycle branch with the browser's PageTransitionEvent.
  // Chromium may not admit a WebGL/Pointer Lock page to its actual BFCache.
  await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));document.exitPointerLock();});
  await expect(page.locator('#pause')).toBeVisible();const paused=await page.evaluate(()=>window.gameDiagnostics());
  await page.waitForTimeout(350);expect((await page.evaluate(()=>window.gameDiagnostics())).clock).toBe(paused.clock);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await page.locator('#resume').click();await page.waitForFunction(clock=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>clock,paused.clock);
  await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));document.exitPointerLock();});
  await expect(page.locator('#pause')).toBeVisible();await page.locator('#resume').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().audio.state==='running');
  const resumed=await page.evaluate(()=>window.gameDiagnostics());expect(new Set(resumed.audio.loops).size).toBe(resumed.audio.loops.length);expect(errors).toEqual([]);
  await info.attach('persisted-page-lifecycle.json',{body:JSON.stringify({initial,paused,resumed,actualBFCacheNavigation:'not asserted; persisted event path tested'}),contentType:'application/json'});
});
