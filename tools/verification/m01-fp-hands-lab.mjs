// R6-a close-up views of the first-person hands: the real M01ViewModel on the real GLBs, weapon pass only (tools/verification/m01-fp-hands-lab.html),
// from the player's camera and from free cameras around the rifle. Headless Chromium/SwiftShader, 960x540. Local visual evidence only.
//   CHROME_EXECUTABLE=/opt/pw-browsers/chromium node tools/verification/m01-fp-hands-lab.mjs <out-dir> [plan=basic|grip|ads] [port=5193]
import {mkdirSync} from 'node:fs';
import {writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';

const out=process.argv[2],planName=process.argv[3]??'basic',port=Number(process.argv[4]??5193);
if(!out)throw new Error('usage: m01-fp-hands-lab.mjs <out-dir> [basic|grip|ads] [port]');
mkdirSync(out,{recursive:true});
// [name, pose (authoritative flags, no history), views]
const PLANS={
  basic:[
    ['idle-hip',{state:'READY'},['player','right','gripR','forend','back']],
    ['idle-ads',{state:'READY',aiming:true},['player','right','gripR','back']],
    ['bolt-25',{state:'BOLT_CYCLE',fraction:.25},['player','right','bolt','gripR']],
    ['bolt-50',{state:'BOLT_CYCLE',fraction:.5},['player','right','bolt']],
    ['bolt-80',{state:'BOLT_CYCLE',fraction:.8},['player','right','bolt']],
    ['reload-10',{state:'RELOAD_CLIP',fraction:.1},['player','right','clip']],
    ['reload-25',{state:'RELOAD_CLIP',fraction:.25},['player','right','clip']],
    ['reload-45',{state:'RELOAD_CLIP',fraction:.45},['player','right','clip']],
    ['reload-72',{state:'RELOAD_CLIP',fraction:.72},['player','right','clip']],
    ['reload-85',{state:'RELOAD_CLIP',fraction:.85},['player','right','clip']],
  ],
  grip:[['idle',{state:'READY'},['gripR','gripRtop','gripRbottom','gripRfront','gripRleft','forend','forendR','forendBottom','forendFront','forendTop','right','player','back']]],
  ads:[['ads',{state:'READY',aiming:true},['player','right','back','forendTop']]],
};
const plan=PLANS[planName];if(!plan)throw new Error(`unknown plan ${planName}`);
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(let i=0;i<80;i++){try{await fetch(`http://127.0.0.1:${port}/COD-guerra/`);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-fp-hands-lab.html`);
  await page.waitForFunction(()=>window.labReady,{},{timeout:120000});
  const save=async file=>writeFileSync(file,Buffer.from((await page.evaluate(()=>window.lab.png())).split(',')[1],'base64'));
  for(const [name,pose,views] of plan){
    await page.evaluate(p=>window.lab.pose(p),pose);
    for(const view of views){await page.evaluate(v=>window.lab.draw(v),view);await save(`${out}/${name}-${view}.png`);}
    console.log(name);
  }
  console.log(JSON.stringify({errors}));
}finally{await browser?.close();server.kill('SIGTERM');}
