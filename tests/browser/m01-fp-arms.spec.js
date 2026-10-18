import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {canonicalViews,carryViews} from '../../tools/verification/m01-t40-views.mjs';
import {driver} from '../helpers/m01-route.js';
// Software WebGL boots and re-renders the full M01 scene slowly; keep the production viewport and real controls, budget wall time.
test.describe.configure({timeout:process.env.CI?360000:240000});
const key='cod-guerra:checkpoint:m01:v2';
async function seed(page,snapshot,quality='low'){
 await page.addInitScript(({key,snapshot,quality})=>{if(!sessionStorage.getItem('t40-t50-seeded')){localStorage.setItem(key,JSON.stringify(snapshot));sessionStorage.setItem('t40-t50-seeded','1');}localStorage.setItem('cod-guerra:visual-quality',quality);},{key,snapshot,quality});
 await page.goto('?debug=1&visual-verify=1');await expect(page.locator('#start')).toBeEnabled({timeout:180000});
}
async function holdNext(page){await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});}
async function frozen(page,snapshot){
 await holdNext(page);await page.locator('#continue').click();await expect(page.locator('#pause')).toBeVisible();
 await page.waitForFunction(({clock})=>{const g=window.gameDiagnostics(),v=g.m01.viewModel;return g.paused&&g.clock===clock&&g.m01.demolition.clock===clock&&v.active&&v.clock===clock;},{clock:snapshot.clock},{timeout:180000});
}
async function capture(page,info,name){
 const data=await page.evaluate(()=>({diagnostics:window.gameDiagnostics(),state:window.gameVerificationState?.()}));
 writeFileSync(info.outputPath(name+'.json'),JSON.stringify(data,null,2));
 await page.screenshot({path:info.outputPath(name+'-raw-ui.png'),timeout:120000});
 await page.screenshot({path:info.outputPath(name+'.png'),style:'#pause,#resume-card,#fade{visibility:hidden!important}',timeout:120000});
 return data;
}
for(const id of ['01','05','14'])test(`T40 canonical ${id} exact saved clock and camera`,async({page},info)=>{
 const view=canonicalViews().find(v=>v.name.startsWith(id)),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await seed(page,view.snapshot,'high');await frozen(page,view.snapshot);
 await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.loaded.includes('fp:0'));
 const data=await capture(page,info,view.name),v=data.diagnostics.m01.viewModel;
 expect(data.diagnostics.clock).toBe(view.snapshot.clock);expect(data.diagnostics.player.x).toBe(view.x);expect(data.diagnostics.player.z).toBe(view.z);
 if(v.visible){expect(v.fpVariant).toBe('fp-arms-v2');expect(v.native.clock).toBe(view.snapshot.clock);expect(v.native.triangles).toBeLessThanOrEqual(6000);expect(v.native.triangles).toBeGreaterThan(0);}
 expect(errors).toEqual([]);
});
 test('T40 native ADS/reload and saved midreload reconstruction',async({page},info)=>{
  const d=driver();d.step({skip:true});d.step({fire:true});for(let i=0;i<30;i++)d.step();await seed(page,d.sim.snapshot());await page.locator('#continue').click();
  await page.waitForFunction(()=>document.pointerLockElement?.id==='game'&&!window.gameDiagnostics().paused);await page.mouse.down({button:'right'});await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.aimBlend===1);await page.mouse.up({button:'right'});
  // Arm the read-only rendered-frame observer before the native key.
  await page.evaluate(()=>{
   const raf=window.requestAnimationFrame.bind(window),capture=window.__t40ReloadCapture={armed:true,value:null};
   window.requestAnimationFrame=callback=>raf(time=>{
    callback(time);if(!capture.armed)return;
    const g=window.gameDiagnostics?.();
    if(g&&!g.paused&&g.m01.weapon.state.startsWith('RELOAD')){
     capture.armed=false;window.dispatchEvent(new Event('blur'));document.exitPointerLock();
     capture.value={clock:g.clock,weapon:structuredClone(g.m01.weapon)};
    }
   });
  });
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.__t40ReloadCapture.value);
  await expect(page.locator('#pause')).toBeVisible();
  const observedReload=await page.evaluate(()=>window.__t40ReloadCapture.value);
  expect(observedReload.weapon.state).toMatch(/^RELOAD/);
  expect((await page.evaluate(()=>window.gameDiagnostics())).clock).toBe(observedReload.clock);
  const paused=await capture(page,info,'native-reload'),snapshot=paused.state.snapshot;expect(paused.diagnostics.m01.viewModel.native.triangles).toBeLessThanOrEqual(6000);
  await page.evaluate(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});await page.reload();await expect(page.locator('#start')).toBeEnabled({timeout:180000});await frozen(page,snapshot);
  const restored=await capture(page,info,'restored-native-reload');expect(restored.diagnostics.m01.weapon).toEqual(paused.diagnostics.m01.weapon);expect(restored.diagnostics.m01.viewModel.clipTime).toBe(paused.diagnostics.m01.viewModel.clipTime);
 });
 test('T40 native pickup, saved carry walk and native putdown preserve full FP budget',async({browser},info)=>{
  const views=carryViews();
  for(const [name,snapshot,interact]of [['pickup',views.beforePickup,true],['carry',views.carry,false],['putdown',views.beforePutdown,true]]){
   const page=await browser.newPage();try{
    await seed(page,snapshot);await page.locator('#continue').click();await page.waitForFunction(()=>document.pointerLockElement?.id==='game'&&!window.gameDiagnostics().paused);if(interact)await page.keyboard.press('KeyE');else{await page.keyboard.down('KeyW');await page.waitForFunction(snapshot=>{const g=window.gameDiagnostics();return g.clock>snapshot.clock&&window.gameVerificationState().snapshot.player.moveBlend>0&&Math.hypot(g.player.x-snapshot.player.x,g.player.z-snapshot.player.z)>.02;},snapshot);}
    await page.waitForFunction(name=>{const v=window.gameDiagnostics().m01.viewModel;return v.carrying&&v.clip===(name==='carry'?'carry_walk':`carry_${name}_carrier`);},name);
    if(!interact)await page.keyboard.up('KeyW');await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
    const data=await capture(page,info,'native-'+name),v=data.diagnostics.m01.viewModel;expect(v.clip).toBe(name==='carry'?'carry_walk':`carry_${name}_carrier`);expect(v.native.triangles).toBeLessThanOrEqual(6000);expect(v.native.triangles).toBeGreaterThan(5000);expect(v.native.clock).toBe(data.diagnostics.clock);
   }finally{await page.close();}
  }
 });
test('T40 delayed optional FP residency redraws the paused saved clock, failure preserves play',async({page},info)=>{
 const d=driver();d.step({skip:true});const snapshot=d.sim.snapshot();let release;const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/fp-arms-v2/*.glb',async r=>{await gate;await r.continue();});
 await seed(page,snapshot);await frozen(page,snapshot);
 expect((await page.evaluate(()=>window.gameDiagnostics())).m01.viewModel.fpVariant).toBe('optional-fallback');
 const before=await capture(page,info,'optional-fp-before-residency');release();
 await page.waitForFunction(clock=>{const g=window.gameDiagnostics(),v=g.m01.viewModel;return g.clock===clock&&v.fpVariant==='fp-arms-v2'&&v.native.clock===clock;},snapshot.clock);
 const after=await capture(page,info,'optional-fp-after-residency');expect(after.state).toEqual(before.state);expect(after.diagnostics.m01.renderedFrames).toBeGreaterThan(before.diagnostics.m01.renderedFrames);
 await page.unroute('**/fp-arms-v2/*.glb');await page.route('**/fp-arms-v2/*.glb',r=>r.abort());await page.reload();await expect(page.locator('#start')).toBeEnabled({timeout:180000});await frozen(page,snapshot);
 expect((await page.evaluate(()=>window.gameDiagnostics())).m01.requiredAssetFailures).toEqual([]);expect((await page.evaluate(()=>window.gameDiagnostics())).m01.viewModel.fpVariant).toBe('optional-fallback');
});
test('T40 frozen carry phases exact source snapshots and camera',async({browser},info)=>{
 const views=carryViews();
 for(const name of ['pickup','carry','putdown']){
  const page=await browser.newPage();try{
   const snapshot=views[name];await seed(page,snapshot);await frozen(page,snapshot);
   await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.fpVariant==='fp-arms-v2');
   const data=await capture(page,info,'frozen-'+name);
   expect(data.diagnostics.clock).toBe(snapshot.clock);
   expect(data.diagnostics.m01.viewModel.native.triangles).toBe(data.diagnostics.m01.viewModel.drawnTriangles);expect(data.diagnostics.m01.viewModel.native.triangles).toBeLessThanOrEqual(6000);expect(data.diagnostics.m01.viewModel.native.clock).toBe(snapshot.clock);
  }finally{await page.close();}
 }
});
