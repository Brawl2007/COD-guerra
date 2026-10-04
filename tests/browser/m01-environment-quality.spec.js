import {test,expect} from '@playwright/test';
test('explicit visual quality survives reload and the menu agrees with the renderer',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('cod-guerra:visual-quality','medium'));
 await page.goto('?debug=1');
 await expect(page.locator('#quality')).toHaveValue('medium');
 await page.waitForFunction(()=>window.gameDiagnostics?.().quality==='medium');
 await page.locator('#quality').selectOption('high');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('cod-guerra:visual-quality'))).toBe('high');
 // Remove the init script by using the same session's fresh page, preserving storage.
 const next=await page.context().newPage();await next.goto('?debug=1');
 await expect(next.locator('#quality')).toHaveValue('high');await next.waitForFunction(()=>window.gameDiagnostics?.().quality==='high');await next.close();
});
