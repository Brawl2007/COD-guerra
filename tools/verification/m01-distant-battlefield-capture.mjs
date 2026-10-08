// Staged visual verification of the distant battlefield layer (not a playtest, not an FPS measure).
// Usage: CHROME_EXECUTABLE=/path/chromium node tools/verification/m01-distant-battlefield-capture.mjs [outDir] [--quality low|medium|high]
// "player-*" frames are the player's eye with the game's own field of view. "eye-*" frames keep that eye and only turn
// and narrow the view toward a sector (a recorded pose, no weapon pass). "probe-*" frames re-render the same world
// frame from an explicit, recorded camera pose. Every frame is re-rendered once with the distant layer hidden; the
// report lists what the layer adds on screen and `<name>.layer.png` shows only those pixels.
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
if(Object.keys(shots).length<5)throw new Error(`route did not reach every fixture (${Object.keys(shots)}; ${run?.sim?.clock})`);
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
  const report={kind:'LOCAL Chromium/SwiftShader, production M01View, genuine route snapshots; player-eye frames, eye-pose and explicitly posed probe frames, each diffed against the same frame without the distant layer; staged captures, not a playtest',
    quality,viewport:[1280,720],commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),captures:[],errors};
  const call=(fn,...a)=>page.evaluate(([fn,a])=>window.dv[fn](...a),[fn,a]);
  // draw = the fixture call that draws this frame; redraw repeats it without ticking (same clock, same pose) for
  // the layer-off comparison: player frames are re-rendered as they are, posed frames re-render the same pose.
  const shot=async(name,draw,drawArgs=[])=>{
    const posed=draw==='probe',state=await call(draw,...drawArgs);
    await page.screenshot({path:`${out}/${name}.png`,timeout:180000});
    const {mask,...layer}=await call('layerDiff',posed?'probe':'redraw',posed?drawArgs:[]);
    writeFileSync(`${out}/${name}.layer.png`,Buffer.from(mask.split(',')[1],'base64'));
    report.captures.push({name,state,layer});
    console.log(name,JSON.stringify({layer,events:state.distant.events,layers:state.distant.layers,kinds:state.distant.kinds,inView:state.distant.inView,instances:state.distant.instances}));};
  // Flashes live ~70 ms and tracers ~1 s: seek the first tick where the pure plan has one of them in the sector
  // being framed (same arithmetic as the renderer), step there drawing only the last ticks, and return where it is.
  const seek=async(snapshot,sectors,{tracer=false,max=600}={})=>{
    for(let k=1;k<=max;k++){const t=snapshot.clock+k*.05,plan=planDistantBattlefield(t,snapshot.consumed);
      for(const e of plan.events){if(!sectors.includes(e.sector))continue;
        for(const [shots,origin,target]of [[e.shots??[],e.origin,e.target],[e.reply?.shots??[],e.reply?.origin,e.reply?.target]])for(const s of shots){const a=t-s.at;
          if(tracer?s.tracer&&a>.1&&a<.9:a>=0&&a<.07){
            await call('step',{},k,100000);
            if(!tracer)return [origin.x,origin.y,origin.z];
            const len=Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z),q=Math.min(.9,a*e.speed/len);
            return [origin.x+(target.x-origin.x)*q,origin.y+(target.y-origin.y)*q,origin.z+(target.z-origin.z)*q];}}}}
    throw new Error(`no ${tracer?'tracer':'flash'} in ${sectors} within ${max} ticks`);};
  const round=p=>p.map(v=>Math.round(v*10)/10);
  const south=[20,-1.2,85],SE=[1000,-4.5,650];
  await call('prepare',shots.dawn,quality);await call('step',{},4,3);
  await shot('player-01-dawn-looking-east','look',[-.35,.02]);
  await call('prepare',shots.dawn,quality);
  await shot('eye-02-dawn-floodplain-flash','probe',['eye',round(await seek(shots.dawn,['east_dike'])),24]);
  await call('prepare',shots.dawn,quality);
  await shot('eye-03-dawn-tracer-across-river','probe',['eye',round(await seek(shots.dawn,['east_dike'],{tracer:true})),40]);
  await call('prepare',shots.hold,quality);await call('step',{},4,3);
  await shot('probe-04-hold-floodplain-south','probe',[south,SE,40]);
  await shot('probe-05-far-plain-squads-binocular','probe',[south,[2150,-1,60],10]);
  await call('prepare',shots.north,quality);await call('step',{},4,3);
  await shot('eye-06-north-front-wide','probe',['eye',[-900,30,-1200],60]);
  await call('prepare',shots.north,quality);
  await shot('eye-07-north-front-flash','probe',['eye',round(await seek(shots.north,['north_line','north_guns'])),24]);
  await shot('player-08-facing-south-north-still-runs','look',[Math.PI/2,0]);
  await call('prepare',shots.surge,quality);
  await shot('eye-09-east-reaction-surge','probe',['eye',round(await seek(shots.surge,['east_dike'],{tracer:true})),40]);
  await call('prepare',shots.surge,quality);
  const later=await call('step',{},20,100000),air=planDistantBattlefield(later.clock,later.consumed).aircraft[0];
  if(air)await shot('eye-10-distant-aircraft','probe',['eye',round([air.x,air.y,air.z]),14]);
  await call('prepare',shots.kozliny,quality);await call('step',{},6,3);
  await shot('player-11-kozliny-columns','look',[-Math.PI*.72+.25,.03]);
  await shot('eye-12-kozliny-assault','probe',['eye',[-950,-3,-1650],24]);
  writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({captures:report.captures.length,errors}));
  if(errors.length)process.exitCode=1;
}finally{await browser?.close();server.kill('SIGTERM');}
