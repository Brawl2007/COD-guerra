// Staged visual verification of the first-person weapon presentation (not a playtest, not an FPS measure).
// Usage: CHROME_EXECUTABLE=/path/chromium node tools/verification/m01-weapon-presentation-capture.mjs [outDir] [--quality low|medium|high]
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {driver} from '../../tests/helpers/m01-route.js';

const args=process.argv.slice(2),out=args.find(a=>!a.startsWith('--'))??'test-results/weapon-presentation';
const quality=args.includes('--quality')?args[args.indexOf('--quality')+1]:'low';
mkdirSync(out,{recursive:true});
const port=5184,server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','tools/verification/vite.capture.config.mjs','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
  for(let i=0;i<80;i++){try{await fetch(`http://127.0.0.1:${port}/COD-guerra/`);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-weapon-presentation-fixture.html`);
  await page.waitForFunction(()=>window.wpReady,{},{timeout:60000});
  const report={kind:'LOCAL Chromium/SwiftShader, production M01View/Renderer, simulation stepped with real controls in-page; staged captures, not a playtest',
    quality,viewport:[1280,720],commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),captures:[],errors};
  const shot=async(name,state)=>{await page.screenshot({path:`${out}/${name}.png`,timeout:180000});report.captures.push({name,state});console.log(name);};
  const call=(fn,...a)=>page.evaluate(([fn,a])=>window.wp[fn](...a),[fn,a]);

  // M01: genuine route start, then real controls only.
  const d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();
  await call('prepareM01',d.sim.snapshot(),quality);
  await shot('m01-01-hip-idle',await call('step',{},4));
  await shot('m01-02-ads-mid-raise',await call('step',{aim:true},2));
  await shot('m01-03-ads-idle',await call('step',{aim:true},14,3));
  await shot('m01-04-ads-shot-flash',await call('step',{aim:true,fire:true},1));
  await shot('m01-05-ads-shot-recoil',await call('step',{aim:true},1));
  await shot('m01-06-bolt-chamber-smoke',await call('step',{aim:true},8,3));
  await shot('m01-07-bolt-ejected-case',await call('step',{aim:true},3));
  await shot('m01-08-case-falling',await call('step',{aim:true},3));
  await shot('m01-09-after-bolt-smoke',await call('step',{aim:true},6,3));
  await call('step',{},12,3);
  await shot('m01-10-hip-shot-flash',await call('step',{fire:true},1));
  await shot('m01-11-hip-recoil',await call('step',{},2));
  await shot('m01-12-hip-bolt-eject',await call('step',{},9,3));
  const paused=await call('repeat',3);report.pauseStable=JSON.stringify(paused.presentation)===JSON.stringify((await call('repeat',2)).presentation);
  // Empty the magazine, then the clip reload and the stripper-clip ejection at the authored 2,45 s marker.
  for(let i=0;i<3;i++){await call('step',{},22,3);await call('step',{fire:true},1);}
  await call('step',{},24,3);
  await shot('m01-13-reload-start',await call('step',{reload:true},1));
  await shot('m01-14-reload-clip-in',await call('step',{},20,3));
  await shot('m01-15-reload-clip-ejected',await call('step',{},29,3));
  await shot('m01-16-reload-clip-falling',await call('step',{},3));
  await shot('m01-17-reload-end',await call('step',{},14,3));
  await shot('m01-18-turn-lag',await call('step',{lookX:30},3));
  // The cases and the clip fell to the right of the firing position and lie there for a while.
  await call('step',{lookX:420,lookY:300},1);await shot('m01-19-brass-on-ground',await call('step',{},4));
  // Close look at the pieces lying in the world (candidate fixture only: the base has no world ejecta).
  if(await page.evaluate(()=>typeof window.wp.probeEjecta==='function')){const probe=await call('probeEjecta');if(probe)await shot('m01-19b-ejecta-probe',probe);}
  await call('step',{lookX:-420,lookY:-300},1);
  await shot('m01-20-sprint',await call('step',{forward:1,sprint:true},10,3));
  // Bench M1 Carbine: semi-automatic identity on the preserved French sandbox.
  await call('prepareBench',quality);
  await shot('bench-01-hip-idle',await call('step',{},6,3));
  await shot('bench-02-hip-shot',await call('step',{fire:true},1));
  await shot('bench-03-hip-brass',await call('step',{},2));
  await call('step',{aim:true},12,3);
  await shot('bench-04-ads-shot',await call('step',{aim:true,fire:true},1));
  await shot('bench-05-ads-follow-up',await call('step',{aim:true},4));
  await shot('bench-06-ads-second-shot',await call('step',{aim:true,fire:true},1));
  await shot('bench-07-smoke',await call('step',{aim:true},6,3));
  writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({captures:report.captures.length,pauseStable:report.pauseStable,errors}));
  if(errors.length)process.exitCode=1;
}finally{await browser?.close();server.kill('SIGTERM');}
