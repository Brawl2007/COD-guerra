// T24 (M01-TRAIN-ARRIVAL-AND-LIFE-V1) real in-game captures: real production build, real app, real WebGL (SwiftShader here).
// Not a playtest and not a performance measurement: states are restored paused, from a real simulation route, and only the
// player pose (position/yaw/pitch) of the restored snapshot is chosen so the trains are in view. Nothing else is injected.
//
//   node tools/verification/m01-train-arrival-t24-shots.mjs [outDir] [--no-build] [--only=a,b]
//   CHROME_EXECUTABLE=/opt/pw-browsers/chromium node ...
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {driver,toRepair} from '../../tests/helpers/m01-route.js';
import {seconds} from '../../src/game/m01-simulation.js';

const args=process.argv.slice(2),flag=n=>args.find(a=>a.startsWith(`--${n}=`))?.split('=')[1];
const out=path.resolve(args.find(a=>!a.startsWith('--'))??'t24-shots');fs.mkdirSync(out,{recursive:true});
const only=flag('only')?.split(',');
const url='http://127.0.0.1:4173/COD-guerra/',key='cod-guerra:checkpoint:m01:v2';

// Player poses (metres, x/z on the ground; angle 0 looks towards +x, i.e. from the west bank towards Lisewo).
// "at" is the battle clock the snapshot is taken at; the exact clock after restore is reported from the app.
// The east gates (x~1056) are closed and the trains stand behind them, so a camera on the bridge sees only the smoke: the shots are taken from
// the east bridgehead (x>=1062), still looking east towards Lisewo. Angles are atan2(dz,dx) towards the subject.
const DEFAULT_SHOTS=[
  {id:'a-0444-30-train-963-arriving',at:'04:44:28',player:{x:1092,z:9,angle:-0.39,pitch:0.03},note:'04:44:30 train 963 braking towards the gates; headlamps, twin buffer lamps, smoke and the wagons moving with it'},
  {id:'b-0445-00-train-963-stopped',at:'04:45:01',player:{x:1066,z:6,angle:-0.42,pitch:0.12},note:'04:45:00 train 963 stopped at x=1075: chimney smoke, lamps'},
  {id:'c-0451-35-panzerzug-arriving',at:'04:51:33',player:{x:1150,z:9,angle:-0.31,pitch:0.03},note:'04:51:35 Panzerzug 7 arriving on the parallel track (z=2.5) beside the stopped 963 consist'},
  {id:'d1-locomotive-front-lamps',at:'04:45:01',player:{x:1061,z:3.5,angle:-0.62,pitch:0.1},note:'close view of the locomotive front: smokebox headlamp with soft halo, buffer lamps, dawn beam'},
  {id:'d2-locomotive-firebox',at:'04:45:01',player:{x:1068,z:6,angle:-0.7,pitch:0.0},note:'close view of the locomotive side: firebox glow under the cab, brake-shoe glow'},
];

const SHOTS=flag('poses')?JSON.parse(fs.readFileSync(flag('poses'),'utf8')):DEFAULT_SHOTS;
if(!args.includes('--no-build')){
  const r=spawnSync('npm',['run','build'],{stdio:'inherit'});if(r.status!==0)throw Error('build failed');
}
// Real route through the simulation (same helper the browser specs use) and a snapshot per distinct clock.
const snapshots={};
{
  const d=toRepair(driver());
  for(const at of [...new Set(SHOTS.map(s=>s.at))].sort()){d.until(()=>d.sim.battleClock>=seconds(at),400);snapshots[at]=d.sim.snapshot(false);}
}
const server=spawn('npm',['run','preview','--','--port','4173','--strictPort'],{stdio:'ignore',detached:true});   // own process group: npm and vite both stop
for(let i=0;i<80;i++){try{if((await fetch(url)).ok)break;}catch{}if(i===79){process.kill(-server.pid);throw Error('preview server unavailable');}await new Promise(r=>setTimeout(r,250));}
const exe=process.env.CHROME_EXECUTABLE??'/opt/pw-browsers/chromium';
const browser=await chromium.launch({executablePath:exe,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[],concurrency=Number(flag('parallel')??1);
async function capture(shot){
  const snapshot=structuredClone(snapshots[shot.at]);Object.assign(snapshot.player,shot.player);
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto(url+'?debug=1&visual-verify=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:300000});
  await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused,null,{timeout:300000});
  await page.evaluate(()=>document.exitPointerLock());await page.locator('#pause').waitFor({state:'visible'});
  // Wait until the presentation has drawn the paused state (art loaded, a rendered frame after the pause), then hide only transient overlays.
  await page.waitForFunction(()=>{const m=window.gameDiagnostics().m01;return m.locomotive.loaded.length===3&&m.panzerzug.loaded.length===3&&m.wagons.loaded.length>=1;},null,{timeout:300000});
  const before=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames);
  await page.waitForFunction(b=>window.gameDiagnostics().m01.renderedFrames>b,before,{timeout:300000}).catch(()=>{});
  await page.addStyleTag({content:'#pause,#fade,#resume-card,#title-card,#letterbox,#message,#subtitle,#captions,#objective-update{display:none!important}'});
  await page.waitForTimeout(800);
  const state=await page.evaluate(()=>{const d=window.gameDiagnostics(),v=window.gameVerificationState().snapshot;
    return {battleClock:v.battleClock,player:{x:v.player.x,z:v.player.z,angle:v.player.angle,pitch:v.player.pitch},clock:d.clock,
      locomotive:d.m01.locomotive,panzerzug:d.m01.panzerzug,wagonsOffset:d.m01.wagons.arrivalOffset,railwayPuffs:d.m01.battlefieldFx.atmosphere.railwayPuffs,
      smokePuffs:d.m01.smokePuffs,renderedFrames:d.m01.renderedFrames};});
  const file=path.join(out,`${shot.id}.png`);await page.screenshot({path:file,timeout:300000});
  report.push({...shot,file,state,errors});console.log(shot.id,JSON.stringify({battleClock:state.battleClock,player:state.player,loco:state.locomotive.position,pz:state.panzerzug.position,wagons:state.wagonsOffset,errors}));
  await page.close();
}
try{
  const queue=SHOTS.filter(s=>!only||only.some(o=>s.id.startsWith(o)));
  await Promise.all(Array.from({length:concurrency},async()=>{while(queue.length)await capture(queue.shift());}));
}finally{fs.writeFileSync(path.join(out,'t24-shots-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();process.kill(-server.pid,'SIGTERM');}
