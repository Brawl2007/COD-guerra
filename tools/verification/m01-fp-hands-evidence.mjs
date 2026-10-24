// R6-a first-person hands evidence: real production renderer + simulation, headless Chromium (SwiftShader), 1280x720.
//   CHROME_EXECUTABLE=/opt/pw-browsers/chromium node tools/verification/m01-fp-hands-evidence.mjs <out-dir> [port]
// Each phase writes <name>.png (the game camera + weapon pass) and <name>-right.png / <name>-top.png (weapon pass from a free camera).
// Local visual evidence, not an FPS measurement and not a playtest.
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';

const out=process.argv[2]??'docs/verification/m01-runtime/fp-hands-2026-10-23/before',port=Number(process.argv[3]??5191);
mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  for(let i=0;i<80;i++){try{await fetch(`http://127.0.0.1:${port}/COD-guerra/`);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-fp-hands-fixture.html`);
  await page.waitForFunction(()=>window.fpReady,{},{timeout:120000});
  const log=[];
  const step=async(controls={},render=true)=>page.evaluate(([c,r])=>window.fp.step(c,r),[controls,render]);
  const steps=async(n,controls)=>{let info;for(let i=0;i<n;i++)info=await step(controls);return info;};
  // The drawing buffer is read straight from the canvas (preserveDrawingBuffer): no compositor wait under SwiftShader.
  const save=async file=>writeFileSync(file,Buffer.from((await page.evaluate(()=>window.fp.png())).split(',')[1],'base64'));
  const shoot=async(name,info)=>{
    log.push({name,...info});
    await save(`${out}/${name}.png`);
    for(const side of ['right','top']){await page.evaluate(s=>window.fp.inspect(s),side);await save(`${out}/${name}-${side}.png`);}
    await page.evaluate(()=>window.fp.render());
    console.log(name,JSON.stringify(info));
  };
  await step({skip:true});await steps(20,{});
  await shoot('01-hip-idle',await page.evaluate(()=>window.fp.render()));
  // ADS transition: 0.30 s in. Mid = 0.15 s; settled after 0.6 s.
  await steps(3,{aim:true});await shoot('02-ads-transition-mid',await page.evaluate(()=>window.fp.info()));
  await steps(9,{aim:true});await shoot('03-ads-settled',await page.evaluate(()=>window.fp.info()));
  // Bolt from the shoulder: shoot, then three phases of the 1.05 s cycle (clip 1.17 s).
  await step({aim:true,fire:true});
  await steps(4,{aim:true});await shoot('04a-fire-bolt-ads-0.20s',await page.evaluate(()=>window.fp.info()));
  await steps(5,{aim:true});await shoot('04b-fire-bolt-ads-0.45s',await page.evaluate(()=>window.fp.info()));
  await steps(5,{aim:true});await shoot('04c-fire-bolt-ads-0.70s',await page.evaluate(()=>window.fp.info()));
  for(let i=0;i<10;i++)await step({aim:true});
  // Bolt from the hip.
  await steps(8,{});await step({fire:true});
  await steps(8,{});await shoot('05-fire-bolt-hip-0.40s',await page.evaluate(()=>window.fp.info()));
  for(let i=0;i<20;i++)await step({});
  // Empty the magazine, then a clip reload from the hip; five phases plus the closing bolt.
  for(let n=0;n<4;n++){await step({fire:true});for(let i=0;i<24;i++)await step({});}
  const before=await page.evaluate(()=>window.fp.info());console.log('mag before reload',before.mag,before.state);
  await step({reload:true});
  const marks=[[8,'06a-reload-clip-0.45s'],[12,'06b-reload-clip-1.05s'],[14,'06c-reload-clip-1.75s'],[15,'06d-reload-clip-2.50s'],[6,'06e-reload-clip-2.80s'],[8,'06f-reload-clip-3.25s']];
  for(const [n,name] of marks){await steps(n,{});await shoot(name,await page.evaluate(()=>window.fp.info()));}
  for(let i=0;i<12;i++)await step({});
  // ADS reload (aim held through the reload) at the closing bolt.
  // Sprint.
  await steps(14,{forward:1,sprint:true});await shoot('07-sprint',await page.evaluate(()=>window.fp.info()));
  await steps(5,{forward:1,aim:true});await shoot('08-ads-walk',await page.evaluate(()=>window.fp.info()));
  writeFileSync(`${out}/capture-log.json`,JSON.stringify({kind:'LOCAL Chromium/SwiftShader, real M01View + M01Simulation, 0.05 s steps, medium quality',viewport:[1280,720],log,errors,failed},null,1));
  console.log(JSON.stringify({frames:log.length,errors,failed}));
}finally{await browser?.close();server.kill('SIGTERM');}
