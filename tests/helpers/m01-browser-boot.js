import {expect as playwrightExpect} from '@playwright/test';

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

// Frame-bound budgets (specs whose waits are paced by rendered frames, not by seconds: m01, m01-hud-presentation, touch).
//  - The loop simulates at most 5 fixed steps (0.25 s) per rendered frame (src/game/frame-catchup.js, M01_MAX_CATCHUP_STEPS x SIM_STEP): a wait for S seconds of
//    SIMULATED time needs at least ceil(S / 0.25) frames, however fast the machine is, and every HUD/DOM fact is written by a frame.
//  - SLOW_GL_FRAME_MS is the slowest software-GL frame the budgets assume. Measured with Chrome 153 + SwiftShader on a shared 4-core VM at load average 29-36, at the
//    production 1280x720 viewport on 68892bce: 0.1-0.5 frames/s, mean about 0.25 (2.5-10 s per frame; 1280x720 intro, 10 s windows, probe not committed); at load 6-7 the
//    same scene gave 0.8-1.2 frames/s. A quiet runner is faster; these are upper bounds of waits that return as soon as the condition holds, never delays.
//  - ROUTE_TIMEOUT: tests stage their save with a Node `route()` (a whole control route through the real simulation, ~20000 ticks) INSIDE the test body, so its CPU time
//    counts against the test timeout (107-149 s of Node time at load 30, measured with tests/helpers/m01-route.js route(19390901); the staging up to Kowal's second magazine alone is 37 s).
//  - A boot is one `goto` up to `start` (86 s + 30 s measured at load 35); BOOT_TIMEOUT is its budget.
export const SIM_SECONDS_PER_FRAME=.25;
export const SLOW_GL_FRAME_MS=5000;
export const ROUTE_TIMEOUT=240000;
const SLOW_FACTOR=process.env.CI?1.5:1;
/** Wall-time budget of `frames` rendered frames at the slowest assumed software-GL rate. */
export const framesTimeout=frames=>Math.round(frames*SLOW_GL_FRAME_MS*SLOW_FACTOR);
/** Wall-time budget of a wait that needs `simSeconds` of SIMULATED time (at most 0.25 s per rendered frame). */
export const simWaitTimeout=simSeconds=>framesTimeout(Math.ceil(simSeconds/SIM_SECONDS_PER_FRAME));
/** Test timeout: `boots` page boots + the Node route when the test builds its save with `route()` + the paused-overlay allowance + `simSeconds` of frame-bound
 *  simulation waits + `frames` further rendered frames (screenshots, resizes, restarts: each is composited by a frame). */
export const slowGlTestTimeout=({boots=1,simSeconds=0,frames=0,route=false}={})=>
  Math.round((boots*BOOT_TIMEOUT+(route?ROUTE_TIMEOUT:0)+PAUSE_TIMEOUT)*SLOW_FACTOR)+simWaitTimeout(simSeconds)+framesTimeout(frames);
/** Default timeout of every wait/action of the page (`waitForFunction`, `click`, `tap`) is 30 s in Playwright: shorter than the 86 s boot + 30 s start measured at load 35. */
export function slowGlPage(page){page.setDefaultTimeout(BOOT_TIMEOUT);page.setDefaultNavigationTimeout(BOOT_TIMEOUT);return page;}
/** `expect` with a default timeout of six slow frames instead of 5 s: the HUD text, a class or a count asserted right after an input is written by the NEXT frame
 *  (one frame took 2.5-10 s, see above). Same auto-retrying assertions, nothing weakened; an explicit `{timeout}` still wins. */
export const EXPECT_TIMEOUT=framesTimeout(6);
export const expect=playwrightExpect.configure({timeout:EXPECT_TIMEOUT});

/** The game graph is loaded, main.js ran to the end (diagnostics hook defined, controls bound) and the required M01 assets are ready. */
export async function gameBooted(page,timeout=BOOT_TIMEOUT){
  await page.waitForFunction(()=>typeof window.gameDiagnostics==='function',null,{timeout});
  await expect(page.locator('#start')).toBeEnabled({timeout});
}

/** The `#pause` overlay is shown (the game saw the pointer lock leave): `toBeVisible()` with a software-GL frame budget. */
export const expectPaused=(page,timeout=PAUSE_TIMEOUT)=>expect(page.locator('#pause')).toBeVisible({timeout});
