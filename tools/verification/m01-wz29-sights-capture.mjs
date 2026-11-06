// pkg4 evidence: 1280 x 720 captures of the first-person kb wz.29 at the hip and down the sights through the existing verification fixture page
// (real production M01View, GLBs and viewmodel; genuine control snapshots). Pictures for looking at, not a frame rate.
//   node tools/verification/m01-wz29-sights-capture.mjs <out dir> <file prefix> [quality]
import {mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {driver} from '../../tests/helpers/m01-route.js';
const out=process.argv[2],tag=process.argv[3]??'',quality=process.argv[4]??'high';
if(!out)throw new Error('usage: m01-wz29-sights-capture.mjs <out dir> <prefix> [quality]');
mkdirSync(out,{recursive:true});
const d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();
const samples=[['hip',d.sim.snapshot()]];for(let i=0;i<12;i++)d.step({aim:true});samples.push(['ads',d.sim.snapshot()]);
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5184'],{stdio:'ignore'});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:5184/COD-guerra/');break;}catch{await new Promise(r=>setTimeout(r,250));}}
  await page.goto('http://127.0.0.1:5184/COD-guerra/tools/verification/m01-wz29-viewmodel-fixture.html');
  await page.waitForFunction(()=>window.wz29Ready,{},{timeout:60000});
  for(const [name,snapshot] of samples){
    const r=await page.evaluate(arg=>window.sampleWz29(arg),{snapshot,variant:'candidate',quality});
    await page.screenshot({path:`${out}/${tag}${name}.png`});
    console.log(name,JSON.stringify({aimBlend:r.metrics.stats.aimBlend,horizontalPixels:r.metrics.horizontalPixels,verticalPixels:r.metrics.verticalPixels,weaponFrame:r.weaponFrame}));
  }
  console.log(JSON.stringify({errors}));
}finally{await browser?.close();server.kill('SIGTERM');}
