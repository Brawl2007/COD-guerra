// Per-frame WebGL call timing (calls over 5 ms per frame) around the first shot in M01 (production build).
// Usage: CHROME_EXECUTABLE=<chromium> node first-shot-gl.mjs <repoRoot with dist/ and node_modules/> <port> <label>
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
  await page.addInitScript(()=>{
    window.__frames=[];let cur={t0:performance.now(),calls:{}};
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=cb=>raf(t=>{cur.t1=performance.now();window.__frames.push(cur);cur={t0:performance.now(),calls:{}};cb(t);});
    const names=['compileShader','linkProgram','getProgramParameter','getShaderParameter','getProgramInfoLog','getShaderInfoLog','getActiveUniform','getUniformLocation','getActiveAttrib','getAttribLocation','texImage2D','texSubImage2D','texStorage2D','texImage3D','generateMipmap','bufferData','bufferSubData','drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','useProgram','readPixels','compressedTexImage2D','createProgram','createShader','shaderSource'];
    for(const P of [WebGL2RenderingContext.prototype,WebGLRenderingContext.prototype])for(const n of names){const f=P[n];if(typeof f!=='function')continue;
      P[n]=function(...a){const s=performance.now();try{return f.apply(this,a);}finally{const d=performance.now()-s,c=cur.calls[n]??=[0,0];c[0]++;c[1]+=d;}};}
  });
  await page.goto(`${base}?debug=1`);await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>.05&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.keyboard.press('Space');await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'),null,{timeout:120000});
  await page.waitForTimeout(3000);
  await page.evaluate(()=>{window.__mark=window.__frames.length;});
  await page.mouse.down();await page.mouse.up();
  const t0=Date.now();await page.waitForFunction(()=>window.gameDiagnostics().m01.weapon.mag===4,null,{timeout:60000});const toMag=(Date.now()-t0)/1000;
  await page.waitForTimeout(6000);
  const r=await page.evaluate(()=>{const f=window.__frames,m=window.__mark;
    const fmt=fr=>({ms:+(fr.t1-fr.t0).toFixed(0),top:Object.entries(fr.calls).filter(([,c])=>c[1]>5).sort((a,b)=>b[1][1]-a[1][1]).map(([n,c])=>`${n}x${c[0]}:${c[1].toFixed(0)}ms`)});
    const all=f.map(fmt);let worst=all.map((x,i)=>[x.ms,i]).sort((a,b)=>b[0]-a[0]).slice(0,6).map(([,i])=>({i,...all[i]}));
    return {first:all.slice(0,6),around:all.slice(Math.max(0,m-2),m+8),worst,mark:m,count:f.length};});
  console.log(JSON.stringify({label,secondsUntilMag4:toMag,...r},null,1));
}finally{await browser?.close();server.kill('SIGTERM');}
