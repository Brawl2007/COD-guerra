// Relative SwiftShader cost A/B (NOT an FPS claim): rAF callbacks and simulation seconds per wall second
// with the production build, same genuine snapshot, same quality, no input, pointer locked.
// Usage: node frame-rate-ab.mjs <repoRoot> <port> <label> [quality] [seconds]
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const [root,port,label,quality='low',seconds='20']=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(`${root}/node_modules/@playwright/test/index.mjs`).href);
const {route}=await import(pathToFileURL(`${root}/tests/helpers/m01-route.js`).href);
const shots={};
route(19390901,{onStep:({sim})=>{const c=sim.consumed;
  if(!shots.east&&Number.isFinite(c.evt_m01_bombing_0530)&&sim.clock>=c.evt_m01_bombing_0530+60)shots.east=sim.snapshot();}});
const server=spawn(process.execPath,[`${root}/node_modules/vite/bin/vite.js`,'preview','--host','127.0.0.1','--port',port,'--strictPort'],{cwd:root,stdio:'ignore'});
let browser;
try{
  const base=`http://127.0.0.1:${port}/COD-guerra/`;
  for(let i=0;i<80;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.addInitScript(({snapshot})=>{localStorage.setItem('cod-guerra:checkpoint:m01:v2',JSON.stringify(snapshot));
    window.__frames=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{window.__frames++;cb(t);});},{snapshot:shots.east});
  await page.goto(`${base}?debug=1`);await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.waitForTimeout(4000);
  const sample=()=>page.evaluate(()=>({frames:window.__frames,clock:window.gameDiagnostics().clock,now:performance.now()}));
  const a=await sample();await page.waitForTimeout(Number(seconds)*1000);const b=await sample();
  const wall=(b.now-a.now)/1000;
  console.log(JSON.stringify({label,quality,wall:+wall.toFixed(2),framesPerWallSecond:+((b.frames-a.frames)/wall).toFixed(2),simSecondsPerWallSecond:+((b.clock-a.clock)/wall).toFixed(3)}));
}finally{await browser?.close();server.kill('SIGTERM');}
