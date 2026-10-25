// Headless Chromium captures of the opening life's acts in the isolated fixture (tools/verification/m01-opening-r1b-fixture.html): the real characters, clips, foot IK, procedural poses and props, one
// close-up per act from the front-right and from the side. For tuning the poses and the props; the evidence captures are those of the game itself (m01-opening-r1b-captures.spec.js).
//   CHROME_EXECUTABLE=/opt/pw-browsers/chromium node tools/verification/m01-opening-r1b-fixture-capture.mjs <outDir> [--only binoculars,smoke] [--dist 3.2] [--views front,side] [--t 4] [--fov 40]
// Starts the vite dev server on 127.0.0.1:5193. SwiftShader: pixels, never FPS.
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

const arg=(n,d)=>{const i=process.argv.indexOf(n);return i<0?d:process.argv[i+1];};
const out=process.argv[2]??'test-results/m01-opening-r1b-fixture',port=5193;
const only=arg('--only',null)?.split(','),dist=Number(arg('--dist',3.2)),views=(arg('--views','front,side')).split(','),tOver=arg('--t',null),fov=Number(arg('--fov',40));
await mkdir(out,{recursive:true});
// [name, man, act, t, extra] The men are placed at the squad post (-70, 22) facing east; `crouched` for a kneeling act; `second` a second man in the shot.
const X=-70,Z=22;
const SHOTS=[
  ['binoculars','pl_west_2','binoculars',4],['smoke-a','east_platoon_voice','smoke',0.6],['smoke-b','east_platoon_voice','smoke',1.4],['coffee-a','jozef_bak','coffee',0.8],['coffee-b','jozef_bak','coffee',1.8],
  ['map','marek_zielinski','map',4],['phone','staszek_pawlak','phone',4],['phone-dead','staszek_pawlak','phone_dead',5],['ammo','pl_west_0','ammo_check',4],['aid','leon_dudek','aid_kit',4],
  ['track','franciszek_lipski','track_check',4],['lookup','pl_west_3','look_up',1.5],['point','pl_west_3','point',1.5],['deliver','pl_west_1','deliver',1.5,{to:'pl_west_0'}],['cover','jozef_bak','cover',3,{crouched:true}],
  ['rifle','pl_west_3','rifle_check',1.0],['shout','marek_zielinski','shout',0.8],['brace','pl_west_4','brace',3],['inspect','pawel_krawiec','cable_inspect',4,{crouched:true}],['hold','sapper_2','cable_hold',4],
  ['clean','szymon_kowal','clean_rkm',4],['walk','pl_west_1','errand',2,{motion:{speed:4.6,gait:'run'}}],['idle','pl_west_2','idle',2],
];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','tools/verification/vite.capture.config.mjs','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('vite did not start')),30000);server.stdout.on('data',d=>{if(String(d).includes('Local')){clearTimeout(t);resolve();}});server.stderr.on('data',d=>process.stderr.write(d));});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-opening-r1b-fixture.html`);
  await page.waitForFunction(()=>window.ready===true,null,{timeout:240000});
  const report=[];
  for(const [name,id,act,t0,extra={}] of SHOTS){
    if(only&&!only.includes(name))continue;
    const t=tOver!==null?Number(tOver):t0;
    for(const view of views){
      const az=view==='front'?-.55:view==='side'?-1.45:view==='back'?2.6:0;   // radians from his forward (east) towards his right (south)... negative: his left-front
      const y=sim=>0;void y;
      const h=await page.evaluate(([x,z])=>window.fixture.ground(x,z),[X,Z]);
      const cam={x:X+Math.cos(az)*dist,y:h+1.45,z:Z+Math.sin(az)*dist,tx:X,ty:h+1.3,tz:Z,fov};
      const men=[{id,act,t,x:X,z:Z,facing:0,...extra}];
      if(extra.second)men.push({...extra.second,x:X+extra.second.dx,z:Z+extra.second.dz});
      const r=await page.evaluate(([men,cam])=>window.fixture.show(men,cam),[men,cam]);
      await writeFile(`${out}/${name}-${view}.png`,Buffer.from(r.url.split(',')[1],'base64'));
      report.push({name,view,diag:r.diag.filter(d=>d.id===id)});
    }
    console.log(name,JSON.stringify(report.at(-1).diag));
  }
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
  if(errors.length)console.error('page errors:',errors);
}finally{await browser?.close();server.kill();}
