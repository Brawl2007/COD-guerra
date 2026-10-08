// Programs compiled around the first shot (production build), bench or M01 (optionally from a save), at a chosen
// quality. Counts createProgram/linkProgram per animation frame from the click until two frames after the HUD shows
// the shot, with those frames' wall times. SwiftShader wall clock, not game FPS.
// Usage: CHROME_EXECUTABLE=<chromium> node first-shot-programs.mjs <repoRoot with dist/> <port> <label> <bench|m01> <low|medium|high> [save.json]
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [root,port,label,scene,quality,savePath]=process.argv.slice(2);
const save=savePath?readFileSync(savePath,'utf8'):null;
const {chromium}=await import(pathToFileURL(`${root}/node_modules/@playwright/test/index.mjs`).href);
const server=spawn(process.execPath,[`${root}/node_modules/vite/bin/vite.js`,'preview','--host','127.0.0.1','--port',port,'--strictPort'],{cwd:root,stdio:'ignore'});
let browser;
try{
  const base=`http://127.0.0.1:${port}/COD-guerra/`;
  for(let i=0;i<80;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});const warnings=[];
  page.on('console',m=>{if(m.type()==='warning'&&/ShadowMap/i.test(m.text()))warnings.push(m.text());});
  await page.addInitScript(({quality,save})=>{
    localStorage.setItem('cod-guerra:visual-quality',quality);if(save)localStorage.setItem('cod-guerra:checkpoint:m01:v2',save);
    // Calls between two animation-frame callbacks belong to the frame the first callback drew.
    window.__frames=[];let cur={t0:performance.now(),programs:0,links:0};const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=cb=>raf(t=>{cur.t1=performance.now();window.__frames.push(cur);cur={t0:performance.now(),programs:0,links:0};cb(t);});
    const P=WebGL2RenderingContext.prototype,create=P.createProgram,link=P.linkProgram;
    P.createProgram=function(...a){cur.programs++;return create.apply(this,a);};P.linkProgram=function(...a){cur.links++;return link.apply(this,a);};
  },{quality,save});
  let shotDone;
  if(scene==='bench'){
    await page.goto(`${base}?debug=1&mission=sandbox-1944`);await page.waitForFunction(()=>window.gameDiagnostics?.().models.length===3,null,{timeout:120000});
    await page.locator('#start').click();await page.waitForFunction(()=>document.pointerLockElement?.id==='game'&&window.gameDiagnostics().clock>.05,null,{timeout:120000});
    const mag=await page.locator('#mag').textContent();shotDone=()=>page.waitForFunction(m=>document.querySelector('#mag')?.textContent!==m,mag,{timeout:120000});
  }else{
    await page.goto(`${base}?debug=1`);await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
    await page.locator(save?'#continue':'#start').click();
    await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>.05&&document.pointerLockElement?.id==='game',null,{timeout:120000});
    if(!save){await page.keyboard.press('Space');await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'),null,{timeout:120000});}
    const mag=await page.evaluate(()=>window.gameDiagnostics().m01.weapon.mag);shotDone=()=>page.waitForFunction(m=>window.gameDiagnostics().m01.weapon.mag===m-1,mag,{timeout:120000});
  }
  const state=await page.evaluate(()=>{const d=window.gameDiagnostics();return {quality:d.quality,battleClock:d.m01?.battleClock??null};});
  await page.waitForTimeout(3000);
  const mark=await page.evaluate(()=>window.__frames.length);
  await page.mouse.down();await page.mouse.up();const t0=Date.now();await shotDone();const toHud=(Date.now()-t0)/1000;
  const done=await page.evaluate(()=>window.__frames.length);await page.waitForTimeout(4000);
  const r=await page.evaluate(({mark,done})=>{const f=window.__frames,w=f.slice(mark,done+3);
    return {startupPrograms:f.slice(0,mark).reduce((n,x)=>n+x.programs,0),window:w.map(x=>({ms:Math.round(x.t1-x.t0),programs:x.programs,links:x.links})),
      programsAfterClick:w.reduce((n,x)=>n+x.programs,0),linksAfterClick:w.reduce((n,x)=>n+x.links,0)};},{mark,done});
  console.log(JSON.stringify({label,scene,quality,save:Boolean(save),...state,secondsUntilHud:toHud,...r,shadowMapWarnings:warnings.length}));
}finally{await browser?.close();server.kill('SIGTERM');}
