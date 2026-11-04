import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Guards the shared boot/pause waits of the pointer-lock-boundary browser specs (tests/helpers/m01-browser-boot.js).
// The premises are facts of the production page; the specs must not go back to a vacuous `#start` gate or to the 5 s default for `#pause`.
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const SPECS=['m01-fp-arms','m01-viewmodel-feel','m01-weapon-presentation','m01-wz29-viewmodel','m01-difficulty-ui','m01-hud-presentation','m01','touch'].map(name=>`tests/browser/${name}.spec.js`);
const html=read('index.html'),main=read('src/main.js'),helper=read('tests/helpers/m01-browser-boot.js');

test('premise: index.html ships #start enabled and main.js defines the diagnostics hook only after the lazy game import',()=>{
  const start=html.match(/<button id="start"[^>]*>/)?.[0];
  assert.ok(start,'#start button exists');
  assert.doesNotMatch(start,/\bdisabled\b/,'#start is enabled in the markup, so toBeEnabled() alone is vacuous before main.js has run');
  const lazy=main.indexOf("await import('./game/game.js')"),hook=main.indexOf('window.gameDiagnostics=');
  assert.ok(lazy>=0&&hook>lazy,'gameDiagnostics is defined after the top-level await of the game graph');
  assert.match(main,/\$\('#start'\)\.disabled=true;\$\('#continue'\)\.disabled=true;/,'missionMenu() disables the buttons until the M01 view is ready');
});

test('helper: gameBooted waits for the diagnostics hook before the enabled state; expectPaused keeps the toBeVisible assertion',()=>{
  const booted=helper.slice(helper.indexOf('export async function gameBooted'),helper.indexOf('export const expectPaused'));
  assert.ok(booted.indexOf("typeof window.gameDiagnostics==='function'")>=0&&booted.indexOf("typeof window.gameDiagnostics==='function'")<booted.indexOf('toBeEnabled'));
  assert.match(helper,/export const expectPaused=.*expect\(page\.locator\('#pause'\)\)\.toBeVisible\(\{timeout\}\)/);
  assert.match(helper,/PAUSE_TIMEOUT=(\d+)/);
  assert.ok(Number(helper.match(/PAUSE_TIMEOUT=(\d+)/)[1])>=30000,'a pointer-lock event waits behind software-GL frames that take seconds');
});

for(const path of SPECS)test(`${path} uses the shared waits`,()=>{
  const src=read(path);
  assert.match(src,/from '\.\.\/helpers\/m01-browser-boot\.js'/);
  assert.doesNotMatch(src,/expect\(page\.locator\('#pause'\)\)\.toBeVisible\(\)/,'the #pause wait must carry the software-GL budget (expectPaused)');
  assert.doesNotMatch(src,/expect\(page\.locator\('#start'\)\)\.toBeEnabled/,'#start enabled is vacuous before main.js ran: use gameBooted');
});
