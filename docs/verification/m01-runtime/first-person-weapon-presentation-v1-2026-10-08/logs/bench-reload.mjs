// Bench (sandbox-1944) at Medium (not FPS of the game; SwiftShader wall clock): shoot once, reload, pause/resume as game.spec.js:28 does; measure rAF frames/s and
// the wall time until the reload completes after resume. Usage: CHROME_EXECUTABLE=<chromium> node bench-reload.mjs <repoRoot with dist/ and node_modules/> <port> <label>
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
  await page.goto(`${base}?debug=1&mission=sandbox-1944`);await page.waitForFunction(()=>window.gameDiagnostics?.().models.length===3,null,{timeout:120000});
  await page.locator('#quality').selectOption('medium');
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.pointerLockElement?.id==='game'&&window.gameDiagnostics().clock>.05,null,{timeout:120000});
  const rate=async ms=>{const a=await page.evaluate(()=>[window.__t.length,performance.now(),window.gameDiagnostics().clock]);await page.waitForTimeout(ms);
    const b=await page.evaluate(()=>[window.__t.length,performance.now(),window.gameDiagnostics().clock]);return {fps:+((b[0]-a[0])/((b[1]-a[1])/1000)).toFixed(2),simPerWall:+((b[2]-a[2])/((b[1]-a[1])/1000)).toFixed(3)};};
  const rest=await rate(8000);
  await page.mouse.down();await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#mag')?.textContent==='14',null,{timeout:30000});
  const afterShot=await rate(4000);
  await page.keyboard.press('KeyR');await page.waitForFunction(()=>document.querySelector('#mag')?.textContent==='—',null,{timeout:30000});
  await page.evaluate(()=>document.exitPointerLock());await page.waitForTimeout(400);
  await page.locator('#resume').click();await page.waitForFunction(()=>document.pointerLockElement?.id==='game',null,{timeout:30000});
  const t0=Date.now(),c0=await page.evaluate(()=>window.gameDiagnostics().clock);
  const during=rate(3000);
  await page.waitForFunction(()=>document.querySelector('#mag')?.textContent==='15',null,{timeout:60000});
  const reloadWall=(Date.now()-t0)/1000,c1=await page.evaluate(()=>window.gameDiagnostics().clock);
  console.log(JSON.stringify({label,rest,afterShot,duringReload:await during,reloadWallSeconds:reloadWall,reloadSimSeconds:+(c1-c0).toFixed(2)}));
}finally{await browser?.close();server.kill('SIGTERM');}
