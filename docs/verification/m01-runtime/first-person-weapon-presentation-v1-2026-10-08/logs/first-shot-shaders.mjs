// Which shaders are compiled after the first shot (production build): bench or M01, at a chosen quality. Records the
// SHADER_NAME three.js writes into each vertex shader and whether it uses instance colours, for every shader compiled
// from the click until the HUD shows the shot plus 4 s. Not a timing tool.
// Usage: CHROME_EXECUTABLE=<chromium> node first-shot-shaders.mjs <repoRoot with dist/> <port> <label> <bench|m01> <low|medium|high> [save.json]
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
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.addInitScript(({quality,save})=>{
    localStorage.setItem('cod-guerra:visual-quality',quality);if(save)localStorage.setItem('cod-guerra:checkpoint:m01:v2',save);
    window.__shaders=[];const P=WebGL2RenderingContext.prototype,source=P.shaderSource;
    P.shaderSource=function(shader,text){if(/gl_Position/.test(text)){const name=text.match(/#define SHADER_NAME (\S+)/)?.[1]??'?';
      window.__shaders.push({at:performance.now(),name,instanceColor:/#define USE_INSTANCING_COLOR/.test(text),instancing:/#define USE_INSTANCING\b/.test(text),shadows:/#define USE_SHADOWMAP/.test(text)});}
      return source.call(this,shader,text);};
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
  await page.waitForTimeout(3000);
  const click=await page.evaluate(()=>performance.now());await page.mouse.down();await page.mouse.up();await shotDone();await page.waitForTimeout(4000);
  const r=await page.evaluate(click=>({before:window.__shaders.filter(s=>s.at<click).length,after:window.__shaders.filter(s=>s.at>=click).map(({at,...s})=>s)}),click);
  console.log(JSON.stringify({label,scene,quality,save:Boolean(save),shadersBeforeClick:r.before,shadersAfterClick:r.after}));
}finally{await browser?.close();server.kill('SIGTERM');}
