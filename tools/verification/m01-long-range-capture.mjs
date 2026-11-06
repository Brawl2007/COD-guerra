// R2-c evidence: the player's real posts from a save of the control route, canvas grabbed at fixed simulation-clock offsets after the save (so a build before and a build
// after are compared at the same simulation instants: the simulation is deterministic from the save and only the presentation differs).
// Usage: CHROME_EXECUTABLE=/opt/pw-browsers/chromium node tools/verification/m01-long-range-capture.mjs <distDir> <outDir> <label> <snapshot.json>...
//          [--quality=medium] [--from=0.5] [--step=0.5] [--count=8] [--port=4173]
// Grabs the first frame whose simulation clock reaches save.clock + from + k*step, k < count. Records renderer.info (draw calls, triangles), the effect counts of that frame and,
// for the build with R2-c, `m01.longRangeFire`. Headless Chromium / SwiftShader at 1366x768: presentation evidence only, not a playtest, not an FPS measurement.
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {basename,resolve} from 'node:path';

const args=process.argv.slice(2).filter(a=>!a.startsWith('--')),opt=Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith('--')).map(a=>a.slice(2).split('=')));
const [dist,out,label,...snaps]=args,quality=opt.quality??'medium',port=Number(opt.port??4173),from=Number(opt.from??.5),step=Number(opt.step??.5),count=Number(opt.count??8);
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
const report={label,quality,viewport:[1366,768],from,step,count,shots:[]};
try{
  for(const file of snaps){
    const name=basename(file,'.json'),snapshot=JSON.parse(await readFile(file,'utf8'));
    const ctx=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1}),page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.addInitScript(({snapshot,from,step,count})=>{
      localStorage.setItem('cod-guerra:checkpoint:m01:v2',JSON.stringify(snapshot));
      window.__grabs=[];window.__next=snapshot.clock+from;const raf=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=cb=>raf(t=>{cb(t);
        try{const g=window.gameDiagnostics?.();if(!g||window.__grabs.length>=count||g.paused||g.clock<window.__next)return;
          const c=document.querySelector('#game');
          window.__grabs.push({clock:g.clock,offset:g.clock-snapshot.clock,fx:g.m01?.fireEffects??null,longRange:g.m01?.longRangeFire??null,camera:g.m01?.bridgeCamera??null,distant:g.m01?.distantFire?.flashes??null,
            png:c.toDataURL('image/png'),draw:g.drawCalls,triangles:g.triangles});
          window.__next=snapshot.clock+from+window.__grabs.length*step;}catch{}
      });
    },{snapshot,from,step,count});
    await page.goto(`http://127.0.0.1:${port}/COD-guerra/?debug=1`);
    await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
    await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
    await page.waitForFunction(()=>!window.gameDiagnostics().paused,null,{timeout:60000});
    await page.waitForFunction(n=>window.__grabs.length>=n,count,{timeout:420000,polling:250});
    const grabs=await page.evaluate(()=>window.__grabs),diag=await page.evaluate(()=>{const d=window.gameDiagnostics();return {clock:d.clock,drawCalls:d.drawCalls,triangles:d.triangles,player:d.player,longRange:d.m01.longRangeFire??null,memory:d.memory??null};});
    const files=[];
    for(let i=0;i<grabs.length;i++){const f=`${name}-${label}-${String(i).padStart(2,'0')}.png`;await writeFile(`${out}/${f}`,Buffer.from(grabs[i].png.split(',')[1],'base64'));
      files.push({file:f,clock:grabs[i].clock,offset:Number(grabs[i].offset.toFixed(3)),fx:grabs[i].fx,longRange:grabs[i].longRange,camera:grabs[i].camera,draw:grabs[i].draw,triangles:grabs[i].triangles});}
    report.shots.push({name,errors,files,diag});console.log(name,label,'frames',files.length,'errors',errors.length);
    await ctx.close();
  }
}finally{await browser.close();server.kill();}
await writeFile(`${out}/report-${label}.json`,JSON.stringify(report,null,2)+'\n');
