// Wall-clock frame durations around the first shot in M01 (production build), to compare base vs candidate (not FPS).
// Usage: CHROME_EXECUTABLE=<chromium> node first-shot-ab.mjs <repoRoot with dist/ and node_modules/> <port> <label>
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const [root,port,label]=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(`${root}/node_modules/@playwright/test/index.mjs`).href);
const server=spawn(process.execPath,[`${root}/node_modules/vite/bin/vite.js`,'preview','--host','127.0.0.1','--port',port,'--strictPort'],{cwd:root,stdio:'ignore'});
let browser;
try{
  const base=`http://127.0.0.1:${port}/COD-guerra/`;
  for(let i=0;i<80;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.addInitScript(()=>{window.__t=[];const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{window.__t.push(performance.now());cb(t);});});
  await page.goto(`${base}?debug=1`);await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>.05&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.keyboard.press('Space');await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'),null,{timeout:120000});
  await page.waitForTimeout(3000);
  const mark=await page.evaluate(()=>{window.__shotAt=performance.now();window.__mark=window.__t.length;return window.__t.length;});
  await page.mouse.down();await page.mouse.up();
  const t0=Date.now();await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.mag===4,null,{timeout:60000});const toMag=(Date.now()-t0)/1000;
  await page.waitForTimeout(6000);
  const r=await page.evaluate(()=>{const t=window.__t,m=window.__mark,before=[],after=[];for(let i=Math.max(1,m-5);i<m;i++)before.push(+(t[i]-t[i-1]).toFixed(0));for(let i=m;i<Math.min(t.length,m+8);i++)after.push(+(t[i]-t[i-1]).toFixed(0));return {before,after};});
  console.log(JSON.stringify({label,secondsUntilMag4:toMag,frameMsBefore:r.before,frameMsAfterClick:r.after}));
}finally{await browser?.close();server.kill('SIGTERM');}
