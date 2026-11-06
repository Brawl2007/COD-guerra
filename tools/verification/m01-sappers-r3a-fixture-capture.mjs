// Headless Chromium captures of the sappers' staged operation in the isolated fixture (tools/verification/m01-sappers-r3a-fixture.html): the real characters, repair line and simulation state of a
// real route, one frame per phase from `--dist` metres away. For tuning the props and the poses; the evidence captures are those of the game itself (m01-sappers-r3a-captures.spec.js).
//   CHROME_EXECUTABLE=/opt/pw-browsers/chromium/chrome node tools/verification/m01-sappers-r3a-fixture-capture.mjs <outDir> [--dist 9] [--angle 70] [--phases splice,test] [--support 1] [--seed 19390901] [--after 0]
// Starts the vite dev server on 127.0.0.1:5192. SwiftShader: pixels, never FPS.
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {route} from '../../tests/helpers/m01-route.js';
import {sapperPhase,SAPPERS} from '../../src/game/m01-sappers.js';

const arg=(n,d)=>{const i=process.argv.indexOf(n);return i<0?d:process.argv[i+1];};
const out=process.argv[2]??'test-results/m01-sappers-r3a-fixture',port=5192;
const dist=Number(arg('--dist',9)),angle=Number(arg('--angle',70))*Math.PI/180,only=arg('--phases',null)?.split(','),support=arg('--support','1')==='1',seed=Number(arg('--seed',19390901)),after=Number(arg('--after',0));
await mkdir(out,{recursive:true});

// 1. the snapshots: the middle of each stage (a quarter of the way for the short ones), one second into every other phase, of one real route
const snaps={},ticks={};
route(seed,{support,onStep:({sim})=>{
  const ph=sapperPhase(sim),id=ph.id;ticks[id]=(ticks[id]??0)+1;
  if(snaps[id])return;
  if(ph.stage?ph.t>=ph.stage.sec*.5:ticks[id]>=24)snaps[id]=sim.snapshot();
}});
console.log('snapshots',Object.keys(snaps).join(','));

// 2. the page
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','tools/verification/vite.capture.config.mjs','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('vite did not start')),30000);server.stdout.on('data',d=>{if(String(d).includes('Local')){clearTimeout(t);resolve();}});server.stderr.on('data',d=>process.stderr.write(d));});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-sappers-r3a-fixture.html`);
  await page.waitForFunction(()=>window.ready===true,null,{timeout:180000});
  const report={dist,angle:arg('--angle',70),seed,support,views:[]};
  for(const [id,snap] of Object.entries(snaps)){
    if(only&&!only.includes(id))continue;
    const men=snap.actors.filter(a=>SAPPERS.members.includes(a.id)),c={x:men.reduce((n,a)=>n+a.x,0)/3,z:men.reduce((n,a)=>n+a.z,0)/3};
    const cam={x:c.x+Math.cos(angle)*dist,y:-2.6+1.7,z:c.z+Math.sin(angle)*dist,tx:c.x,ty:-2.6+.45,tz:c.z,fov:Number(arg('--fov',46))};
    const r=await page.evaluate(([snap,cam,after])=>after>0?window.fixture.at(snap,cam,after):window.fixture.show(snap,cam),[snap,cam,after]);
    await writeFile(`${out}/${id}.png`,Buffer.from(r.url.split(',')[1],'base64'));
    report.views.push({phase:id,clips:r.clips,ops:{phase:r.ops.phase,stage:r.ops.stage,t:r.ops.t,gaps:r.ops.gaps,box:r.ops.box,lamp:r.ops.lamp}});
    console.log(id,JSON.stringify(r.clips));
  }
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
  if(errors.length)console.error('page errors:',errors);
}finally{await browser?.close();server.kill();}
