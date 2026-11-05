import {test} from '@playwright/test';
import {expect,slowGlPage,slowGlTestTimeout,EXPECT_TIMEOUT} from '../helpers/m01-browser-boot.js';
test('explicit visual quality survives reload and the menu agrees with the renderer',async({page})=>{
 // Two boots (the page and a second tab). The default 5 s of expect.poll is shorter than one software-GL frame: the `change` handler of #quality that writes localStorage runs on the main
 // thread between frames (the run of 2026-11-05 on a quiet machine failed here with «Timeout 5000ms exceeded while waiting on the predicate» after 32.7 s); the poll itself is unchanged.
 test.setTimeout(slowGlTestTimeout({boots:2,frames:6}));slowGlPage(page);
 await page.addInitScript(()=>localStorage.setItem('cod-guerra:visual-quality','medium'));
 await page.goto('?debug=1');
 // T50 imports the game graph lazily: `load` fires first and the menu select only mirrors the renderer once the game has booted
 // (seconds on software WebGL), so wait for the boot, then assert the select and the renderer agree.
 await page.waitForFunction(()=>window.gameDiagnostics?.().quality==='medium',null,{timeout:120000});
 await expect(page.locator('#quality')).toHaveValue('medium');
 await page.locator('#quality').selectOption('high');
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('cod-guerra:visual-quality')),{timeout:EXPECT_TIMEOUT}).toBe('high');
 // Remove the init script by using the same session's fresh page, preserving storage.
 const next=slowGlPage(await page.context().newPage());await next.goto('?debug=1');
 await next.waitForFunction(()=>window.gameDiagnostics?.().quality==='high',null,{timeout:120000});await expect(next.locator('#quality')).toHaveValue('high');await next.close();
});
