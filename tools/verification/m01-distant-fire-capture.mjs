// VIS-a evidence: the player's real posts looking east at the German shooters, canvas grabbed on the first frame in which the view drew a muzzle flash.
// Usage: CHROME_EXECUTABLE=/opt/pw-browsers/chromium node tools/verification/m01-distant-fire-capture.mjs <distDir> <outDir> <label> <snapshot.json>... [--quality=medium]
// Snapshots come from the real route (tests/helpers/m01-route.js, support pilot) one tick before an enemy-fire event at the east bank.
// Presentation evidence only: the simulation runs in real time inside the page; nothing is injected. Not a playtest, not an FPS measurement.
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {basename,resolve} from 'node:path';

const args=process.argv.slice(2).filter(a=>!a.startsWith('--')),opt=Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith('--')).map(a=>a.slice(2).split('=')));
const [dist,out,label,...snaps]=args,quality=opt.quality??'medium',port=Number(opt.port??4173),frames=Number(opt.frames??4);
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',resolve(dist),'--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
for(let i=0;i<80;i++){
  if(server.exitCode!==null)throw new Error('preview exited: '+log);
  try{if((await fetch(`http://127.0.0.1:${port}/COD-guerra/`)).ok)break;}catch{}
  await new Promise(r=>setTimeout(r,100));
}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={label,quality,viewport:[1366,768],shots:[]};
try{
  for(const file of snaps){
    const name=basename(file,'.json'),snapshot=JSON.parse(await readFile(file,'utf8'));
    const ctx=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1}),page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.addInitScript(({snapshot,frames})=>{
      localStorage.setItem('cod-guerra:checkpoint:m01:v2',JSON.stringify(snapshot));
      // After each game frame (same task, so the drawing buffer is still valid) keep the canvas of frames that drew a muzzle flash.
      window.__grabs=[];window.__gaps=0;const raf=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=cb=>raf(t=>{cb(t);
        try{const g=window.gameDiagnostics?.();if(!g||window.__grabs.length>=frames)return;
          const fx=g.m01?.fireEffects?.muzzle??0,dist=g.m01?.distantFire?.flashes??0;
          if(fx>0||dist>0){const c=document.querySelector('#game');window.__grabs.push({clock:g.clock,muzzle:fx,distant:g.m01?.distantFire??null,png:c.toDataURL('image/png'),camera:g.m01.bridgeCamera,draw:g.drawCalls});}}catch{}
      });
    },{snapshot,frames});
    await page.goto(`http://127.0.0.1:${port}/COD-guerra/?debug=1`);
    await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
    await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
    await page.waitForFunction(()=>!window.gameDiagnostics().paused,null,{timeout:60000});
    await page.waitForFunction(n=>window.__grabs.length>=n,frames,{timeout:240000,polling:250});
    const grabs=await page.evaluate(()=>window.__grabs),diag=await page.evaluate(()=>{const d=window.gameDiagnostics();return {clock:d.clock,drawCalls:d.drawCalls,triangles:d.triangles,impostors:d.m01.impostors?.total,distantFire:d.m01.distantFire??null,player:d.player};});
    const files=[];
    for(let i=0;i<grabs.length;i++){const f=`${name}-${label}-${i}.png`;await writeFile(`${out}/${f}`,Buffer.from(grabs[i].png.split(',')[1],'base64'));files.push({file:f,clock:grabs[i].clock,muzzle:grabs[i].muzzle,distant:grabs[i].distant,camera:grabs[i].camera});}
    report.shots.push({name,errors,files,diag});console.log(name,label,'frames',files.length,'errors',errors.length);
    await ctx.close();
  }
}finally{await browser.close();server.kill();}
await writeFile(`${out}/report-${label}.json`,JSON.stringify(report,null,2)+'\n');
