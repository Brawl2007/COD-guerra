import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {driver,route} from '../helpers/m01-route.js';
const KEY='cod-guerra:checkpoint:m01:v2';
const OUT=process.env.M01_FIELD_EVIDENCE==='1'?'docs/verification/m01-runtime/m01-t13-t32-field-structures-v1/captures':'test-results/field-structures';
const SHOT={style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000};
const fresh=new M01Simulation(19390901);fresh.tick(.05,{skip:true});const start=fresh.snapshot(false),r=route(19390901,{support:true}),day=r.combatSnapshots.eastDemolitionOutside;
// The alternate destruction branch is reached only through real movement/interact/tick controls.
const d=driver();d.step({skip:true});d.walk(-66,26);d.walk(-15,26);d.walk(-15,2);d.walk(16,2);d.step({interact:true});d.walk(-15,2);d.walk(-60,12);d.until(()=>d.sim.flags['m01.forward_post_state']==='destroyed',120);const destroyed=d.sim.snapshot(false);
const centroid=s=>{const a=s.actors.filter(a=>a.alive&&a.active&&!a.civilian&&a.x<-200&&a.z>50);return a.length?{x:a.reduce((n,a)=>n+a.x,0)/a.length,z:a.reduce((n,a)=>n+a.z,0)/a.length,y:a.reduce((n,a)=>n+a.y,0)/a.length+1}:{x:-262,z:70,y:1};};
const VIEWS=[
 {name:'03-start-hut-objective',snapshot:start,x:-242,z:32,target:{x:-262,z:20,y:0}},
 {name:'04-start-west-portal-bridge',snapshot:start,x:-48,z:9,target:{x:-4,z:1,y:5}},
 {name:'15-west-demolition',snapshot:r.combatSnapshots.westDemolition,x:-292,z:26,target:{x:-4,z:3,y:8}},
 {name:'16-roll-call',snapshot:r.outro,x:-248,z:80,target:centroid(r.outro)},
 {name:'close-rail-shed',snapshot:day,x:-277,z:29,target:{x:-260,z:20,y:.3},structure:'rail_shed'},
 {name:'close-shelter',snapshot:day,x:-266,z:61,target:{x:-260,z:70,y:-2},structure:'shelter'},
 {name:'close-forward-post',snapshot:day,x:11,z:9,target:{x:18,z:3,y:.65},structure:'forward_post'},
 // Casemate is below the road deck: see its east embrasures from the river side, without altering terrain/camera rules.
 {name:'close-casemate',snapshot:day,x:31,z:48,target:{x:26,z:40,y:-3},structure:'casemate'},
 {name:'close-forward-post-destroyed',snapshot:destroyed,x:11,z:9,target:{x:18,z:3,y:.25},structure:'forward_post'},
 // Inside the playable rail deck: outside cameras above can be occluded by the unchanged bridge truss.
 {name:'inside-forward-post',snapshot:day,x:14,z:1,target:{x:18,z:3,y:.65},structure:'forward_post'},
 {name:'inside-forward-post-destroyed',snapshot:destroyed,x:14,z:1,target:{x:18,z:3,y:.25},structure:'forward_post'}
];
function relocated(v){const s=structuredClone(v.snapshot),world=new M01Simulation();world.restoreSnapshot(s);const y=world.world.heightAt(v.x,v.z),dx=v.target.x-v.x,dz=v.target.z-v.z;Object.assign(s.player,{x:v.x,y,z:v.z,angle:Math.atan2(dz,dx),pitch:Math.atan2(v.target.y-y-1.6,Math.hypot(dx,dz)),moveBlend:0,sprinting:false,crouched:false,aiming:false});return s;}
async function open(page,v,{quality='high',ready=true}={}){
 const snapshot=relocated(v);await page.addInitScript(({snapshot,KEY,quality})=>{localStorage.setItem(KEY,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{snapshot,KEY,quality});await page.goto(new URL('?debug=1&visual-verify=1',test.info().project.use.baseURL).href);
 await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9&&window.gameDiagnostics().m01.damageDecals.atlasReady,null,{timeout:180000});
 // Exit at pointer acquisition before live ticks; then wait for the restored camera and exact drawn clock.
 await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});
 await page.locator('#continue').click();await page.waitForFunction(({x,z})=>{const d=window.gameDiagnostics();return d.paused&&d.player.x===x&&d.player.z===z&&d.m01.demolition.clock===d.clock&&d.m01.renderedFrames>0;},{x:v.x,z:v.z},{timeout:180000});
 if(ready){await page.waitForFunction(()=>{const d=window.gameDiagnostics();return d.m01.fieldStructures.ready&&d.m01.demolition.clock===d.clock&&d.m01.fieldStructures.structures.every(s=>s.visibleModels===(s.visible?1:0));},null,{timeout:120000});await page.waitForLoadState('networkidle',{timeout:120000});}
 return await page.evaluate(()=>window.gameDiagnostics());
}
async function toggle(page,on){const f=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames);await page.evaluate(on=>window.m01FieldStructuresDebug.setEnabled(on),on);await page.waitForFunction(({f,on})=>{const d=window.gameDiagnostics();return d.m01.renderedFrames>f&&d.m01.fieldStructures.enabled===on&&d.m01.demolition.clock===d.clock;},{f,on},{timeout:120000});}
async function capture(page,name,info){mkdirSync(OUT,{recursive:true});const png=await page.screenshot(SHOT);writeFileSync(`${OUT}/${name}.png`,png);await info.attach(name,{body:png,contentType:'image/png'});return png;}
async function difference(browser,a,b){const p=await browser.newPage();try{return await p.evaluate(async({a,b})=>{const decode=async s=>createImageBitmap(new Blob([Uint8Array.from(atob(s),c=>c.charCodeAt(0))],{type:'image/png'})),[before,after]=await Promise.all([decode(a),decode(b)]),c=new OffscreenCanvas(before.width,before.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(before,0,0);const old=ctx.getImageData(0,0,c.width,c.height).data;ctx.drawImage(after,0,0);const cur=ctx.getImageData(0,0,c.width,c.height).data;let changed=0,controlChanged=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,d=Math.max(Math.abs(old[i]-cur[i]),Math.abs(old[i+1]-cur[i+1]),Math.abs(old[i+2]-cur[i+2]));if(d>2){changed++;if(y<40)controlChanged++;}}before.close();after.close();return {changed,pixels:c.width*c.height,controlChanged,controlPixels:c.width*40};},{a:a.toString('base64'),b:b.toString('base64')});}finally{await p.close();}}
function noDuplicateProxies(diag){const f=diag.m01.fieldStructures;expect(f.roots).toBe(4);expect(f.structures.reduce((n,s)=>n+s.models,0)).toBe(15);for(const s of f.structures){expect(s.ready).toBe(true);expect(s.visibleModels).toBe(s.visible?1:0);}expect(f.environmentProxies.every(p=>!p.visible)).toBe(true);expect(f.viewProxies.every(p=>!p.visible)).toBe(true);for(const s of f.structures)for(const id of s.colliderIds)expect(f.proxyColliderIds).not.toContain(id);expect(f.collidersAdded).toBe(0);}
test('actual renderer: same paused frame A/B for 03/04/15/16 and all four closeups, including destroyed',async({browser},info)=>{
 test.setTimeout(1800000);const report=[];
 for(const v of VIEWS){const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));try{const diag=await open(page,v);noDuplicateProxies(diag);const state=await page.evaluate(()=>window.gameVerificationState());await toggle(page,false);const before=await capture(page,v.name+'-before',info),off=await page.evaluate(()=>window.gameDiagnostics());expect(off.m01.fieldStructures.viewProxies.every(p=>p.visible)).toBe(true);await toggle(page,true);const after=await capture(page,v.name+'-after',info),on=await page.evaluate(()=>window.gameDiagnostics());expect(on.clock).toBe(off.clock);expect(on.m01.demolition.clock).toBe(on.clock);expect(await page.evaluate(()=>window.gameVerificationState())).toEqual(state);noDuplicateProxies(on);const pixels=await difference(browser,before,after);
  if(v.name!=='04-start-west-portal-bridge')expect(pixels.changed).toBeGreaterThan(20);expect(pixels.controlChanged/pixels.controlPixels).toBeLessThan(.005);
  if(v.name.endsWith('destroyed')){const post=on.m01.fieldStructures.structures.find(s=>s.id==='forward_post');expect(post.variant).toBe('destroyed');expect(post.height).toBe(.45);}
  expect(errors).toEqual([]);report.push({name:v.name,clock:on.clock,drawnClock:on.m01.demolition.clock,pixels,structures:on.m01.fieldStructures});
 }finally{await page.close();}}
 writeFileSync(OUT+'/same-pause-report.json',JSON.stringify(report,null,2)+'\n');
});
test('Low/High quality, checkpoint world replacement, reload and toggle churn keep bounded roots and one visible model',async({page},info)=>{
 test.setTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));const v=VIEWS.find(v=>v.name==='close-shelter');let diag=await open(page,v);const clock=diag.clock,state=await page.evaluate(()=>window.gameVerificationState());
 for(const quality of ['low','high','low','high']){await page.locator('#quality').selectOption(quality,{force:true});await page.waitForFunction(q=>{const d=window.gameDiagnostics();return d.quality===q&&d.m01.fieldStructures.quality===q&&d.m01.terrain.tier===q&&d.m01.terrain.files.length===(q==='low'?0:4)&&d.m01.demolition.clock===d.clock;},quality);diag=await page.evaluate(()=>window.gameDiagnostics());noDuplicateProxies(diag);expect(diag.clock).toBe(clock);expect(diag.m01.fieldStructures.structures.find(s=>s.id==='shelter').lod).toBe(quality==='high'?0:1);await capture(page,'shelter-'+quality,info);}
 for(let i=0;i<6;i++){await toggle(page,false);await toggle(page,true);}expect(await page.evaluate(()=>window.gameVerificationState())).toEqual(state);
 const beforeRestore=await page.evaluate(()=>window.gameDiagnostics()),restoreSamples=[];
 async function restartFrozen(){
  await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});
  await page.locator('#restart-checkpoint').click();await page.waitForFunction(()=>{const d=window.gameDiagnostics();return d.paused&&d.m01.demolition.clock===d.clock&&d.m01.fieldStructures.ready;});
  await page.waitForLoadState('networkidle',{timeout:120000});
  // Upload each currently visible actor/effect LOD after the world restore. Only the first restore can introduce
  // previously unseen geometry; subsequent identical restores must plateau, rather than receiving a larger cap.
  await toggle(page,false);await toggle(page,true);
  const diag=await page.evaluate(()=>window.gameDiagnostics());noDuplicateProxies(diag);return diag;
 }
 const warmup=await restartFrozen(),restoredState=await page.evaluate(()=>window.gameVerificationState());
 restoreSamples.push({stage:'first-restore-warmup',geometries:warmup.geometries,clock:warmup.clock,drawnClock:warmup.m01.demolition.clock,field:warmup.m01.fieldStructures});
 for(let i=0;i<3;i++){
  const restored=await restartFrozen();expect(await page.evaluate(()=>window.gameVerificationState())).toEqual(restoredState);
  expect(restored.clock).toBe(warmup.clock);expect(restored.geometries).toBe(warmup.geometries);
  restoreSamples.push({stage:`identical-restore-${i+1}`,geometries:restored.geometries,clock:restored.clock,drawnClock:restored.m01.demolition.clock,field:restored.m01.fieldStructures});
 }
 mkdirSync(OUT,{recursive:true});const lifecycle={beforeRestore:{geometries:beforeRestore.geometries,clock:beforeRestore.clock},restoreSamples};
 writeFileSync(OUT+'/checkpoint-geometry-plateau.json',JSON.stringify(lifecycle,null,2)+'\n');await info.attach('checkpoint-geometry-plateau.json',{body:JSON.stringify(lifecycle,null,2),contentType:'application/json'});
 await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.fieldStructures?.ready,null,{timeout:120000});await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});await page.locator('#continue').click();await page.waitForFunction(()=>{const d=window.gameDiagnostics();return d.paused&&d.m01.fieldStructures.viewProxies.every(p=>!p.visible)&&d.m01.demolition.clock===d.clock;});noDuplicateProxies(await page.evaluate(()=>window.gameDiagnostics()));expect(errors).toEqual([]);
});
test('failed optional kit retains exact proxies; reload restores; async ready redraws a paused frame',async({browser},info)=>{
 test.setTimeout(420000);const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));try{
 await page.route('**/structures/*.glb',r=>r.abort('failed'));const v=VIEWS.find(v=>v.name==='close-rail-shed');await open(page,v,{ready:false});await page.waitForFunction(()=>window.gameDiagnostics().m01.fieldStructures.structures.every(s=>s.failure));const failed=await page.evaluate(()=>window.gameDiagnostics());expect(failed.m01.fieldStructures.ready).toBe(false);expect(failed.m01.fieldStructures.viewProxies.every(p=>p.visible)).toBe(true);expect(failed.m01.fieldStructures.proxyColliderIds).toContain('hut_north');expect(failed.m01.requiredAssetFailures).toEqual([]);await capture(page,'optional-failure-proxies',info);await page.unroute('**/structures/*.glb');
 let release;const gate=new Promise(resolve=>{release=resolve;});await page.route('**/structures/*rail_shed_intact_lod0.glb',async route=>{await gate;await route.continue();});await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});await page.locator('#continue').click();await page.waitForFunction(()=>{const d=window.gameDiagnostics();return d.paused&&d.m01.demolition.clock===d.clock&&d.m01.fieldStructures.structures.find(s=>s.id==='rail_shed').ready===false;});const waiting=await page.evaluate(()=>window.gameDiagnostics());expect(waiting.m01.fieldStructures.proxyColliderIds).toContain('hut_north');const frozen=await page.evaluate(()=>window.gameVerificationState());release();await page.waitForFunction(()=>{const d=window.gameDiagnostics();return d.m01.fieldStructures.ready&&d.m01.fieldStructures.viewProxies.every(p=>!p.visible)&&d.m01.demolition.clock===d.clock;},null,{timeout:120000});const loaded=await page.evaluate(()=>window.gameDiagnostics());expect(loaded.clock).toBe(waiting.clock);expect(loaded.m01.renderedFrames).toBeGreaterThan(waiting.m01.renderedFrames);expect(await page.evaluate(()=>window.gameVerificationState())).toEqual(frozen);noDuplicateProxies(loaded);await capture(page,'optional-reload-restored',info);expect(errors).toEqual([]);
 }finally{await page.close();}
});
