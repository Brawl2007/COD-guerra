// M01 as m01.spec.js:38 does it (production build): five shots, clip reload, pause, resume; wall time from resume
// until the HUD shows mag 5 (the test allows 15 s), plus rAF callbacks and sim seconds per wall second meanwhile.
// SwiftShader wall clock, not game FPS. Usage: CHROME_EXECUTABLE=<chromium> node m01-reload.mjs <repoRoot> <port> <label>
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
  await page.addInitScript(()=>{window.__frames=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{window.__frames++;cb(t);});});
  await page.goto(`${base}?debug=1`);await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>.05&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.keyboard.press('Space');await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'),null,{timeout:120000});
  const mag=n=>page.waitForFunction(n=>document.querySelector('#mag')?.textContent===String(n),n,{timeout:120000});
  await page.mouse.dblclick(640,360,{delay:0});await mag(4);
  for(let i=1;i<5;i++){await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY',null,{timeout:120000});await page.mouse.down();await page.mouse.up();await mag(4-i);}
  await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.state==='READY',null,{timeout:120000});
  await page.keyboard.press('KeyR');await mag('—');
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#pause').waitFor({state:'visible'});await page.waitForTimeout(350);
  const sample=()=>page.evaluate(()=>({frames:window.__frames,clock:window.gameDiagnostics().clock,now:performance.now()}));
  await page.locator('#resume').click();const a=await sample();await mag(5);const b=await sample();
  const wall=(b.now-a.now)/1000;
  console.log(JSON.stringify({label,resumeToMag5Seconds:+wall.toFixed(2),rafPerWallSecond:+((b.frames-a.frames)/wall).toFixed(2),simSecondsPerWallSecond:+((b.clock-a.clock)/wall).toFixed(3),simSeconds:+(b.clock-a.clock).toFixed(2)}));
}finally{await browser?.close();server.kill('SIGTERM');}
