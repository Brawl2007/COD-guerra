import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {driver,toRepair} from '../helpers/m01-route.js';
const key='cod-guerra:checkpoint:m01:v2',snapshot=toRepair(driver()).sim.snapshot(false);
const out=process.env.SOLDIER_EVIDENCE_DIR??'test-results/m01-soldier-variation';let server;
test.beforeAll(async()=>{await mkdir(out,{recursive:true});server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],{stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('visual review Vite not ready')),20000);server.stdout.on('data',b=>{if(b.toString().includes('5187')){clearTimeout(t);resolve();}});server.on('exit',c=>{clearTimeout(t);reject(Error('Vite exit '+c));});});});
test.afterAll(()=>server?.kill());
test('real character renderer: German/Polish faces, gear, roles, all LODs, pause and save/reload; matched BEFORE/AFTER',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5187/COD-guerra/tools/verification/m01-soldier-variation-fixture.html');await page.waitForFunction(()=>window.ready===true);
 await page.evaluate(s=>window.stage.restore(s),snapshot);const report={validation:'LOCAL Chromium/SwiftShader',scope:'Real M01Characters, original GLBs/atlases/rigs; staged read-only copies of existing actors, poses and inspection lights. Not mission playtest.',samples:[],errors};
 for(const [name,kind,distance]of [['de-close','de',5],['pl-close','pl',5],['medium','pl',25],['roles','roles',5]]){
  let before;for(const base of [true,false]){const r=await page.evaluate(o=>window.stage.capture(o),{kind,distance,base});expect(r.snapshot).toEqual(snapshot);expect(r.untouched).toEqual(snapshot);if(base)before=r;else{expect(r.camera).toEqual(before.camera);expect(r.ids).toEqual(before.ids);expect(r.counts.drawCalls).toBe(before.counts.drawCalls);}
   expect(r.actors).toHaveLength(kind==='roles'?4:5);expect(new Set(r.actors.map(a=>a.lod))).toEqual(new Set([distance===25?1:0]));
   const file=`${name}-${base?'before':'after'}.jpg`;await page.screenshot({path:out+'/'+file,type:'jpeg',quality:90});delete r.snapshot;delete r.untouched;report.samples.push({name,variant:base?'before':'after',file,...r});}
 }
 const close=await page.evaluate(()=>window.stage.capture({kind:'pl',distance:5})),far=await page.evaluate(()=>window.stage.capture({kind:'pl',distance:65})),again=await page.evaluate(()=>window.stage.capture({kind:'pl',distance:5}));
 const variants=r=>r.actors.map(({id,visual})=>({id,visual}));expect(variants(far)).toEqual(variants(close));expect(variants(again)).toEqual(variants(close));expect(far.actors.every(a=>a.lod===2)).toBe(true);expect(again.actors.map(a=>a.clipTime)).toEqual(close.actors.map(a=>a.clipTime));
 await page.reload();await page.waitForFunction(()=>window.ready===true);await page.evaluate(s=>window.stage.restore(s),snapshot);const restored=await page.evaluate(()=>window.stage.capture({kind:'pl',distance:5}));expect(variants(restored)).toEqual(variants(close));expect(restored.snapshot).toEqual(snapshot);expect(errors).toEqual([]);
 report.restore={variants:variants(restored),allLODs:[0,1,2],saveExact:true,pauseExact:true};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 const rows=['de-close','pl-close','medium','roles'].map(n=>`<h2>${n}</h2><div><img src="${n}-before.jpg"><img src="${n}-after.jpg"></div>`).join('');await writeFile(out+'/pairs.html',`<!doctype html><meta charset="utf-8"><title>Soldier variation BEFORE / AFTER</title><style>body{background:#202623;color:#eee;font:16px sans-serif}div{display:flex}img{width:50%}</style><h1>Same actors, camera, pose and light</h1><p>LOCAL real production character renderer; staged inspection lineups.</p>${rows}`);
});
test('production UI continuation and reload keep visual IDs stable with no gameplay fields added to schema 2',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
 await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.characters?.loaded.includes('pl:2'));await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
 const first=await page.evaluate(()=>window.gameDiagnostics()),variants=d=>d.m01.characters.actors.map(({id,visual})=>({id,visual}));expect(variants(first).length).toBeGreaterThan(0);expect(variants(first).every(a=>a.visual?.version==='m01-soldier-visual/v1')).toBe(true);
 await page.waitForTimeout(150);const frozen=await page.evaluate(()=>window.gameDiagnostics());expect(frozen.clock).toBe(first.clock);expect(variants(frozen)).toEqual(variants(first));
 await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.characters?.loaded.includes('pl:2'));await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);await page.evaluate(()=>document.exitPointerLock());const restored=await page.evaluate(()=>window.gameDiagnostics());expect(variants(restored)).toEqual(variants(first));expect(errors).toEqual([]);
 await writeFile(out+'/production-ui.json',JSON.stringify({validation:'LOCAL',variants:variants(restored),saveSchema:2,pause:true,reload:true,errors},null,2)+'\n');
});
