import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5185'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Vite not ready')),20000);server.stdout.on('data',b=>{if(b.toString().includes('5185')){clearTimeout(timer);resolve();}});server.on('exit',code=>reject(new Error('Vite exit '+code)));});
import {driver,toRepair} from '../../tests/helpers/m01-route.js';
import {seconds} from '../../src/game/m01-simulation.js';
const out=new URL('../../docs/verification/m01-runtime/locomotive-963-2026-10-04/',import.meta.url);await mkdir(out,{recursive:true});
const d=toRepair(driver());d.until(()=>d.sim.battleClock>=seconds('04:45:10'),120);const snapshot=d.sim.snapshot(false);
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={kind:'LOCAL real M01View/GLBs and control-route snapshot; staged visual cameras; BASE uses byte-equivalent original proxy geometry',samples:[],errors};
try{
 await page.goto('http://127.0.0.1:5185/COD-guerra/tools/verification/m01-locomotive-fixture.html');await page.waitForFunction(()=>window.ready===true);
 await page.evaluate(s=>window.stage.restore(s),snapshot);
 for(const [name,position,target,lod]of [['lateral',[1075,5,-26],[1075,2,-2.5],0],['front-quarter',[1063.5,7,16],[1071,2,-2.5],0],['rear-quarter',[1095,7,-20],[1078,2,-2.5],0],['medium',[1085,10,-88],[1075,2,-2.5],1]]){
  let previous;for(const base of [true,false]){const r=await page.evaluate(o=>window.stage.capture(o),{position,target,lod,base});assert.equal(r.locomotive.visible,true);assert.deepEqual(r.snapshot,snapshot);if(previous)assert.deepEqual(r.camera,previous.camera);previous=r;
   const file=`${name}-${base?'before':'after'}.jpg`;await page.screenshot({path:new URL(file,out).pathname,type:'jpeg',quality:90});delete r.snapshot;report.samples.push({name,variant:base?'before':'after',file,...r});}
 }
 report.models=await page.evaluate(()=>window.stage.modelCounts());assert.deepEqual(report.errors,[]);
 await writeFile(new URL('report.json',out),JSON.stringify(report,null,2)+'\n');
 const rows=['lateral','front-quarter','rear-quarter','medium'].map(n=>`<h2>${n}</h2><div><img src="${n}-before.jpg"><img src="${n}-after.jpg"></div>`).join('');
 await writeFile(new URL('pairs.html',out),`<!doctype html><meta charset="utf-8"><title>Locomotive 963 BEFORE / AFTER</title><style>body{background:#202623;color:#eee;font:16px sans-serif}div{display:flex}img{width:50%}</style><h1>Original proxy / Candidate GLB — same state and camera</h1>${rows}`);
 console.log(JSON.stringify({errors,models:report.models,samples:report.samples.length}));
}finally{await browser.close();server.kill();}
