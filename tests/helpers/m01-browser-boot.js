import {expect} from '@playwright/test';

// Shared boot/pause waits for the production-build browser specs that freeze the game at the native pointer-lock boundary
// (m01-fp-arms, m01-viewmodel-feel, m01-weapon-presentation, m01-wz29-viewmodel). Guard: tests/m01-browser-boot-helper.test.js.
//
// Two facts of the production page decide how these specs may wait (measured with Chrome 153 + SwiftShader on a shared 4-core VM at
// load average 8-13; on a quiet x86 CI runner both costs are small, which is why the old waits passed there):
//  1. index.html ships `#start` ENABLED and `#continue` enabled-but-hidden. main.js only reaches `missionMenu()` (which disables them
//     until the M01 view is ready) and defines `window.gameDiagnostics` after `await import('./game/game.js')` (T50 lazy boot,
//     afcd970f). Right after `page.goto()` returns, `#start` is enabled and `window.gameDiagnostics` is `undefined` (measured: goto
//     returned at 1.5 s, the hook appeared at 12 s, `#start` was disabled until 34 s), so `expect(#start).toBeEnabled()` alone proves
//     nothing and `#quality` has no handler yet. `gameBooted()` first waits for the diagnostics hook, then for the real enabled state.
//  2. A pointer-lock grant/exit is an event delivered on the main thread between rendered frames. With software WebGL one frame can
//     take seconds (10.6 s measured for the first frame after "start" at low quality; the paused overlay appeared 5-20 s after the
//     `#continue` click in the failing traces), so the 5 s default `expect` timeout is shorter than a single frame. `expectPaused()`
//     is the same `toBeVisible()` assertion with a budget in line with the 180 s boot and frozen-state waits of these specs.
export const BOOT_TIMEOUT=180000;
export const PAUSE_TIMEOUT=60000;
// Software WebGL boots and re-renders the full M01 scene slowly; production viewport and real controls, wall time budgeted.
export const SLOW_GL_TEST_TIMEOUT=process.env.CI?360000:240000;

/** The game graph is loaded, main.js ran to the end (diagnostics hook defined, controls bound) and the required M01 assets are ready. */
export async function gameBooted(page,timeout=BOOT_TIMEOUT){
  await page.waitForFunction(()=>typeof window.gameDiagnostics==='function',null,{timeout});
  await expect(page.locator('#start')).toBeEnabled({timeout});
}

/** The `#pause` overlay is shown (the game saw the pointer lock leave): `toBeVisible()` with a software-GL frame budget. */
export const expectPaused=(page,timeout=PAUSE_TIMEOUT)=>expect(page.locator('#pause')).toBeVisible({timeout});
