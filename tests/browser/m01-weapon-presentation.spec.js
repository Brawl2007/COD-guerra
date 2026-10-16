import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';

// Presentation-only verification in the production build. Snapshots come from genuine controls in the
// real simulation; the browser then fires/reloads with the same window input the game consumes.
const key='cod-guerra:checkpoint:m01:v2';
const ready=(()=>{const d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();for(let i=0;i<12;i++)d.step({aim:true});return d.sim.snapshot();})();
const empty=(()=>{const d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();
  for(let n=0;n<5;n++){d.step({fire:true});d.until(()=>d.sim.weapon.state==='READY');}return d.sim.snapshot();})();
if(ready.weapon.mag!==5||empty.weapon.mag!==0||empty.weapon.state!=='READY')throw new Error('weapon fixtures not reached through real controls');

async function openFrom(page,snapshot,quality='low'){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game'&&window.gameDiagnostics().m01.viewModel.active);
  return {errors,failed};
}
// Records the first rendered diagnostics frame matching each named predicate, from inside the page.
async function watch(page,predicates){
  await page.evaluate(sources=>{
    const tests=Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,new Function('g',`return (${s})(g);`)]));
    window.__wp={};const tick=()=>{const g=window.gameDiagnostics?.();
      if(g)for(const [k,f]of Object.entries(tests))if(!window.__wp[k]&&f(g))window.__wp[k]=structuredClone(g);
      if(Object.keys(window.__wp).length<Object.keys(tests).length)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  },Object.fromEntries(Object.entries(predicates).map(([k,f])=>[k,f.toString()])));
}
const fire=page=>page.evaluate(()=>{window.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));window.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));});
const frozen=async page=>{
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const a=await page.evaluate(()=>window.gameDiagnostics());await page.waitForTimeout(300);const b=await page.evaluate(()=>window.gameDiagnostics());
  expect(b.clock).toBe(a.clock);expect(b.m01?.viewModel??b.weaponFx).toEqual(a.m01?.viewModel??a.weaponFx);if(a.m01)expect(b.m01.weaponFx).toEqual(a.m01.weaponFx);
};

test('wz.29 ADS shot: layered flash on the socket, bolt stroke, one case into the world; gameplay state is the simulation\'s',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  const {errors,failed}=await openFrom(page,ready);
  await page.mouse.down({button:'right'});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.aimBlend===1);
  await watch(page,{flash:g=>g.m01.viewModel.presentation?.flash>0,stroke:g=>g.m01.viewModel.presentation?.boltStroke>.5,
    case:g=>g.m01.weaponFx.casings>0,ready:g=>g.m01.weapon.state==='READY'&&g.m01.weapon.shotCount===1});
  await fire(page);
  await page.waitForFunction(()=>window.__wp.flash&&window.__wp.case&&window.__wp.ready,null,{timeout:process.env.CI?120000:60000});
  const {flash,stroke,case:ejected,ready:after}=await page.evaluate(()=>window.__wp);
  const v=flash.m01.viewModel;
  expect(v.presentation.layers).toBe(3);expect(v.presentation.light).toBeGreaterThan(0);expect(v.presentation.profile).toBe('wz29');
  expect(flash.m01.weapon.shotCount).toBe(1);expect(flash.m01.weapon.mag).toBe(4);
  expect(stroke.m01.viewModel.aimBlend).toBe(1);expect(stroke.player.aiming).toBe(true);
  expect(ejected.m01.weaponFx.casings).toBe(1);expect(ejected.m01.weaponFx.puffs).toBeGreaterThan(0);
  // READY again: back exactly on the sights, still one case, nothing mutated by presentation.
  expect(after.m01.viewModel.presentation.boltStroke).toBe(0);expect(after.m01.weaponFx.casings).toBe(1);
  for(const sight of Object.values(after.m01.viewModel.visualSights)){expect(Math.abs(sight[0])).toBeLessThan(1e-6);expect(Math.abs(sight[1])).toBeLessThan(1e-6);}
  expect(after.m01.weapon.mag).toBe(4);expect(after.m01.weapon.reserve).toBe(ready.weapon.reserve);
  expect(after.m01.weaponLighting.fill).toBeGreaterThan(0);
  await frozen(page);
  await page.screenshot({path:info.outputPath('wz29-after-shot.png'),style:'#pause {visibility:hidden !important}'});
  await info.attach('weapon-presentation',{body:JSON.stringify({flash:v.presentation,stroke:stroke.m01.viewModel.presentation,weaponFx:ejected.m01.weaponFx,lighting:after.m01.weaponLighting},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('wz.29 clip reload: the empty stripper clip leaves at the 2,45 s marker and lands in the world',async({page})=>{
  test.setTimeout(process.env.CI?180000:90000);
  const {errors,failed}=await openFrom(page,empty);
  await watch(page,{clip:g=>g.m01.weaponFx.clips>0,done:g=>g.m01.weapon.state==='READY'&&g.m01.weapon.mag===5});
  await page.keyboard.press('KeyR');
  await page.waitForFunction(()=>window.__wp.clip&&window.__wp.done,null,{timeout:process.env.CI?120000:60000});
  const {clip,done}=await page.evaluate(()=>window.__wp);
  expect(clip.m01.weapon.state).toBe('RELOAD_CLIP');expect(clip.m01.viewModel.clip).toBe('reload_clip');
  expect(clip.m01.viewModel.clipTime).toBeGreaterThanOrEqual(2.45);expect(clip.m01.viewModel.presentation.clipEjected).toBe(true);
  expect(done.m01.weaponFx.clips).toBe(1);expect(done.m01.weapon.reserve).toBe(empty.weapon.reserve-5);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('bench M1 Carbine keeps its own semi-auto identity: flash, brass with the shot, smooth ADS',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.goto('?debug=1&mission=sandbox-1944');await page.waitForFunction(()=>window.gameDiagnostics?.().models.length===3);
  await page.locator('#start').click();await page.waitForFunction(()=>document.pointerLockElement?.id==='game'&&window.gameDiagnostics().clock>.05);
  await watch(page,{flash:g=>g.weaponFx?.flash>0,brass:g=>g.weaponFx?.world.casings>0});
  await fire(page);
  await page.waitForFunction(()=>window.__wp.flash&&window.__wp.brass,null,{timeout:process.env.CI?120000:60000});
  const {flash,brass}=await page.evaluate(()=>window.__wp);
  expect(flash.weaponFx.layers).toBe(3);expect(brass.weaponFx.world.casings).toBe(1);
  await expect(page.locator('#mag')).toHaveText('14');
  await frozen(page);
  await page.screenshot({path:info.outputPath('bench-carbine-after-shot.png'),style:'#pause {visibility:hidden !important}'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
