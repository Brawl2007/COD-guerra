import {mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {driver} from '../../tests/helpers/m01-route.js';

export function captureFixtures(){
  const d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();
  const samples=[];const take=name=>samples.push({name,snapshot:d.sim.snapshot()});
  take('A-hip-idle');for(let i=0;i<12;i++)d.step({aim:true});take('B-ADS');
  d.step({fire:true});take('H-muzzle-flash');d.step();take('C-recoil');for(let i=0;i<9;i++)d.step();take('D-bolt');
  d.until(()=>d.sim.weapon.state==='READY');
  for(let n=0;n<4;n++){d.step({fire:true});d.until(()=>d.sim.weapon.state==='READY');}
  d.step({reload:true});for(let i=0;i<27;i++)d.step();take('E-reload');d.until(()=>d.sim.weapon.state==='READY');
  d.step({fire:true});d.until(()=>d.sim.weapon.state==='READY');d.step({reload:true});for(let i=0;i<7;i++)d.step();take('I-single-round');
  d.until(()=>d.sim.weapon.state==='READY');for(let i=0;i<12;i++)d.step({forward:1});take('F-walk');
  for(let i=0;i<12;i++)d.step({forward:1,sprint:true});take('G-run');
  for(let i=0;i<12;i++)d.step({forward:1,aim:true});take('J-ADS-walk');
  d.step({fire:true,aim:true});d.step({aim:true});take('K-ADS-fire');
  const saved=d.sim.snapshot();d.sim.restoreSnapshot(saved);take('L-save-restore');d.sim.restoreCheckpoint();take('M-checkpoint-restore');
  return samples;
}
const out=process.argv[2]??'docs/verification/m01-runtime/wz29-viewmodel-2026-10-04';
mkdirSync(out,{recursive:true});mkdirSync('test-results',{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5183'],{stdio:'ignore'});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:5183/COD-guerra/');break;}catch{await new Promise(r=>setTimeout(r,250));}}
  await page.goto('http://127.0.0.1:5183/COD-guerra/tools/verification/m01-wz29-viewmodel-fixture.html');
  await page.waitForFunction(()=>window.wz29Ready,{},{timeout:30000});
  const samples=captureFixtures(),report={kind:'LOCAL Chromium/SwiftShader, real production M01View and GLBs, fixed genuine control snapshots, staged verification',viewport:[1280,720],base:'5f3cc34f53c61beec52255d67f8babd7194c9f7f',samples:[],errors,failed};
  writeFileSync(`${out}/fixtures.json`,JSON.stringify(samples,null,2));
  for(const quality of ['low','medium','high'])for(const {name,snapshot}of samples)for(const variant of ['base','candidate']){
    const result=await page.evaluate(arg=>window.sampleWz29(arg),{snapshot,variant,quality});
    report.samples.push({name,...result});
    if(quality==='low'){await page.screenshot({path:`${out}/${name}-${variant}.png`});console.log(`${name} ${variant} captured`);}
  }
  writeFileSync(`${out}/browser-metrics.json`,JSON.stringify(report,null,2));
  if(errors.length||failed.length||report.samples.some(s=>!s.snapshotEqual||!s.pauseEqual))throw new Error('Browser evidence failed; inspect browser-metrics.json');
  console.log(JSON.stringify({samples:report.samples.length,errors,failed}));
}finally{await browser?.close();server.kill('SIGTERM');}
