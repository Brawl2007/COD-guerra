// Staged visual verification of the distant battlefield layer (not a playtest, not an FPS measure).
// Usage: CHROME_EXECUTABLE=/path/chromium node tools/verification/m01-distant-battlefield-capture.mjs [outDir] [--quality low|medium|high]
// "player-*" frames use the player's eye; "probe-*" frames re-render the same world frame from an explicit, recorded
// camera pose (no weapon pass) so a distant sector is not hidden behind trusses or embankments.
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {route} from '../../tests/helpers/m01-route.js';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {planDistantBattlefield} from '../../src/render/m01-distant-battlefield-plan.js';

const args=process.argv.slice(2),out=args.find(a=>!a.startsWith('--'))??'test-results/distant-battlefield';
const quality=args.includes('--quality')?args[args.indexOf('--quality')+1]:'low';
mkdirSync(out,{recursive:true});
// Genuine snapshots from one route through the real simulation (controls only).
const shots={};
const run=route(19390901,{onStep:({sim})=>{
  const c=sim.consumed,at=(id,dt)=>Number.isFinite(c[id])&&sim.clock>=c[id]+dt;
  for(const [name,id,dt]of [['dawn','evt_m01_train963_arrives',70],['hold','evt_m01_bombing_0530',110],['north','evt_m01_north_contact_distant',160],
    ['surge','evt_m01_east_demolition',24],['late','evt_m01_west_demolition',6]])if(!shots[name]&&at(id,dt))shots[name]=sim.snapshot();
}});
// Koźliny (07:00) is normally consumed with the roll call; wait for it from the late snapshot without moving.
{const sim=new M01Simulation();sim.restoreSnapshot(shots.late);for(let i=0;i<30000&&!sim.consumedEvent('evt_m01_kozliny_attack_distant');i++)sim.tick(.05,{});
  for(let i=0;i<1700;i++)sim.tick(.05,{});shots.kozliny=sim.snapshot();}
const port=5186,server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','tools/verification/vite.capture.config.mjs','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
  for(let i=0;i<80;i++){try{await fetch(`http://127.0.0.1:${port}/COD-guerra/`);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-distant-battlefield-fixture.html`);
  await page.waitForFunction(()=>window.dvReady,{},{timeout:90000});
  const report={kind:'LOCAL Chromium/SwiftShader, production M01View, genuine route snapshots; player-eye frames and explicitly posed probe frames; staged captures, not a playtest',
    quality,viewport:[1280,720],commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),captures:[],errors};
  const call=(fn,...a)=>page.evaluate(([fn,a])=>window.dv[fn](...a),[fn,a]);
  const shot=async(name,state)=>{await page.screenshot({path:`${out}/${name}.png`,timeout:180000});report.captures.push({name,state});
    console.log(name,JSON.stringify({events:state.distant.events,layers:state.distant.layers,kinds:state.distant.kinds,inView:state.distant.inView,instances:state.distant.instances}));};
  // Flashes live ~70 ms and tracers ~1 s: seek the first tick where the pure plan has one of them in the sector
  // being framed (same arithmetic as the renderer), step there without drawing, then draw that tick.
  const seek=async(snapshot,sectors,{tracer=false,max=600}={})=>{
    for(let k=1;k<=max;k++){const t=snapshot.clock+k*.05,plan=planDistantBattlefield(t,snapshot.consumed);
      const hit=plan.events.some(e=>sectors.includes(e.sector)&&[...(e.shots??[]),...(e.reply?.shots??[])].some(s=>{const a=t-s.at;
        return tracer?s.tracer&&a>.1&&a<.9:a>=0&&a<.07;}));
      if(hit){if(k>1)await call('step',{},k-1,100000);return k;}}
    return 0;};
  const north=[20,-1.2,-45],south=[20,-1.2,85],NE=[1000,-4.5,-650],SE=[1000,-4.5,650];
  await call('prepare',shots.dawn,quality);await call('step',{},4,3);
  await shot('player-01-dawn-looking-east',await call('look',-.35,.02));
  await call('prepare',shots.dawn,quality);await seek(shots.dawn,['east_dike']);
  await shot('probe-02-dawn-floodplain-flash',await call('step',{},1).then(()=>call('probe',north,NE,34)));
  await call('prepare',shots.dawn,quality);await seek(shots.dawn,['east_dike'],{tracer:true});
  await shot('probe-03-dawn-tracer-across-river',await call('step',{},1).then(()=>call('probe',north,[600,-3,-560],48)));
  await call('prepare',shots.hold,quality);await call('step',{},4,3);
  await shot('probe-04-hold-floodplain-south',await call('probe',south,SE,40));
  await shot('probe-05-far-plain-squads-binocular',await call('probe',south,[2150,-1,60],10));
  await call('prepare',shots.north,quality);await call('step',{},4,3);
  await shot('probe-06-north-front-wide',await call('probe',[-60,-1.2,-120],[-900,30,-1200],70));
  await call('prepare',shots.north,quality);await seek(shots.north,['north_line','north_guns']);
  await shot('probe-07-north-front-flash',await call('step',{},1).then(()=>call('probe',[-120,-1.2,-230],[-900,-3,-1150],30)));
  await shot('player-08-facing-south-north-still-runs',await call('look',Math.PI/2,0));
  await call('prepare',shots.surge,quality);await seek(shots.surge,['east_dike'],{tracer:true});
  await shot('probe-09-east-reaction-surge',await call('step',{},1).then(()=>call('probe',north,NE,40)));
  const air=planDistantBattlefield(shots.surge.clock+1,shots.surge.consumed).aircraft[0];
  if(air)await shot('probe-10-distant-aircraft',await call('probe',south,[air.x,air.y,air.z],14));
  await call('prepare',shots.kozliny,quality);await call('step',{},6,3);
  await shot('player-11-kozliny-columns',await call('look',-Math.PI*.72+.25,.03));
  await shot('probe-12-kozliny-assault',await call('probe',[-300,1.5,-230],[-950,-3,-1650],34));
  writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({captures:report.captures.length,errors}));
  if(errors.length)process.exitCode=1;
}finally{await browser?.close();server.kill('SIGTERM');}
