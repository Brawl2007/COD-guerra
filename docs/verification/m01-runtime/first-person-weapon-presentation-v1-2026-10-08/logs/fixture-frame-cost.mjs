// SwiftShader render cost per frame in the weapon-presentation fixture (not FPS). From the route start, 50 frames:
// fire pressed every 7 frames five times, then reload; each step asks dt .25 (the simulation caps it, so this covers
// 1,3-3,75 s of mission clock, two shots going off with their bolt cycles). Each frame is synchronised with a 1x1
// readPixels so its time includes the rasterisation. Usage: CHROME_EXECUTABLE=<chromium> node fixture-frame-cost.mjs
//   <repoRoot with the fixture and node_modules/> <port> <label> [mask json]
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const [root,port,label,maskJson='{}']=process.argv.slice(2);
const {chromium}=await import(pathToFileURL(`${root}/node_modules/@playwright/test/index.mjs`).href);
const {driver}=await import(pathToFileURL(`${root}/tests/helpers/m01-route.js`).href);
const server=spawn(process.execPath,[`${root}/node_modules/vite/bin/vite.js`,'--config','tools/verification/vite.capture.config.mjs','--host','127.0.0.1','--port',port,'--strictPort'],{cwd:root,stdio:'ignore'});
let browser;
try{
  for(let i=0;i<120;i++){try{await fetch(`http://127.0.0.1:${port}/COD-guerra/`);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.addInitScript(()=>{window.__gl={};const names=['compileShader','linkProgram','getProgramParameter','getShaderParameter','getProgramInfoLog','getShaderInfoLog','texImage2D','texSubImage2D','texStorage2D','generateMipmap','bufferData','bufferSubData','drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','readPixels','createProgram'];
    for(const P of [WebGL2RenderingContext.prototype])for(const n of names){const f=P[n];P[n]=function(...a){const t=performance.now();try{return f.apply(this,a);}finally{const c=window.__gl[n]??=[0,0];c[0]++;c[1]+=performance.now()-t;}};}});
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-weapon-presentation-fixture.html`);
  await page.waitForFunction(()=>window.wpReady,{},{timeout:120000});
  const mask=JSON.parse(maskJson);
  if(Object.keys(mask).length)await page.evaluate(async mask=>{const m=await import('/COD-guerra/src/render/first-person-weapon-fx.js');
    const v=m.WeaponViewFx.prototype.update,w=m.WeaponWorldFx.prototype.update;
    m.WeaponViewFx.prototype.update=function(...a){const r=v.apply(this,a);if(mask.wisps===false)for(const s of this.wisps)s.visible=false;if(mask.layers===false)for(const s of this.layers)s.visible=false;if(mask.light===false)this.light.intensity=0;return r;};
    m.WeaponWorldFx.prototype.update=function(...a){const r=w.apply(this,a);if(mask.puffs===false)for(const s of this.sprites)s.visible=false;if(mask.ejecta===false)for(const x of this.meshes.values())x.count=0;return r;};},mask);
  const d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();
  const call=(fn,...a)=>page.evaluate(([fn,a])=>window.wp[fn](...a),[fn,a]);
  await call('prepareM01',d.sim.snapshot(),'low');await call('step',{},4);
  const timed=(controls)=>page.evaluate(c=>{const gl=document.querySelector('canvas').getContext('webgl2'),px=new Uint8Array(4),sync=()=>gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);sync();window.__gl={};const t0=performance.now();const st=window.wp.step(c,1,1,.25);sync();const ms=performance.now()-t0;
    const g=window.__gl,cnt=k=>g[k]?.[0]??0,tm=k=>Math.round(g[k]?.[1]??0);
    window.__frames=(window.__frames??[]).concat([[Math.round(ms),+st.clock.toFixed(2),st.weapon.state,cnt('texSubImage2D'),tm('texSubImage2D'),cnt('texImage2D'),cnt('bufferSubData'),cnt('bufferData'),cnt('drawElements')+cnt('drawArrays')+cnt('drawElementsInstanced')+cnt('drawArraysInstanced')]]);
    if(ms>1500)window.__slow=(window.__slow??[]).concat({ms:Math.round(ms),clock:+st.clock.toFixed(2),weapon:st.weapon.state,mag:st.weapon.mag,gl:Object.entries(window.__gl).filter(([,v])=>v[1]>20).map(([k,v])=>k+'x'+v[0]+':'+Math.round(v[1]))});return ms;},controls);
  const shots=[],reload=[];
  for(let s=0;s<5;s++){shots.push(await timed({fire:true}));for(let k=0;k<6;k++)shots.push(await timed({}));}
  reload.push(await timed({reload:true}));for(let k=0;k<14;k++)reload.push(await timed({}));
  const st=await call('state');const sum=a=>Math.round(a.reduce((x,y)=>x+y,0));
  console.log(JSON.stringify({label,mask,afterShotsMs:sum(shots),reloadMs:sum(reload),reloadFrames:reload.map(Math.round),mag:st.weapon.mag,clock:+st.clock.toFixed(2),slow:await page.evaluate(()=>window.__slow??[]),frames:await page.evaluate(()=>window.__frames??[])}));
}finally{await browser?.close();server.kill('SIGTERM');}
