import {chromium} from '@playwright/test';
import os from 'node:os';
const port=process.env.TRIAGE_PORT||45317;
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:Number(process.env.VW||1280),height:Number(process.env.VH||720)}});
const t0=Date.now();
await page.goto(`http://127.0.0.1:${port}/COD-guerra/?debug=1`);
await page.waitForFunction(()=>typeof window.gameDiagnostics==='function',null,{timeout:300000});
await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:300000});
await page.waitForFunction(()=>!document.getElementById('start').disabled,null,{timeout:300000});
console.log('boot ms',Date.now()-t0,'load',os.loadavg().map(x=>x.toFixed(1)).join(' '));
const t1=Date.now();
await page.locator('#start').click();
await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:300000});
console.log('start->locked ms',Date.now()-t1);
const rows=[];
for(let i=0;i<Number(process.env.WINDOWS||6);i++){
  const a=await page.evaluate(()=>({f:window.gameDiagnostics().m01.renderedFrames,c:window.gameDiagnostics().clock,t:performance.now()}));
  await new Promise(r=>setTimeout(r,10000));
  const b=await page.evaluate(()=>({f:window.gameDiagnostics().m01.renderedFrames,c:window.gameDiagnostics().clock,t:performance.now()}));
  rows.push({fps:((b.f-a.f)/((b.t-a.t)/1000)).toFixed(2),simPerWall:((b.c-a.c)/((b.t-a.t)/1000)).toFixed(3),load:os.loadavg()[0].toFixed(1)});
}
console.log(JSON.stringify(rows));
await browser.close();
