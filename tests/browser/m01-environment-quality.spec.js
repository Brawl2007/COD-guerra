import {test,expect} from '@playwright/test';
test('explicit visual quality survives reload and the menu agrees with the renderer',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('cod-guerra:visual-quality','medium'));
 await page.goto('?debug=1');
 // T50 imports the game graph lazily: `load` fires first and the menu select only mirrors the renderer once the game has booted
 // (seconds on software WebGL), so wait for the boot, then assert the select and the renderer agree.
 await page.waitForFunction(()=>window.gameDiagnostics?.().quality==='medium',null,{timeout:120000});
 await expect(page.locator('#quality')).toHaveValue('medium');
 await page.locator('#quality').selectOption('high');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('cod-guerra:visual-quality'))).toBe('high');
 // Remove the init script by using the same session's fresh page, preserving storage.
 const next=await page.context().newPage();await next.goto('?debug=1');
 await next.waitForFunction(()=>window.gameDiagnostics?.().quality==='high',null,{timeout:120000});await expect(next.locator('#quality')).toHaveValue('high');await next.close();
});
