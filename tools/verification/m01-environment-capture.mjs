import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {driver,toRepair,toStationEvacuation,route} from '../../tests/helpers/m01-route.js';
const out=resolve(process.argv[2]),label=process.argv[3]??'BASE',root=resolve(process.argv[4]??'.'),port=process.env.VISUAL_PORT??'4183';
await mkdir(`${out}/screenshots`,{recursive:true});
const fixtureFile=`${out}/camera-fixtures.json`;
let fixtures;
try{fixtures=JSON.parse(await readFile(fixtureFile,'utf8'));}catch{
 const flow=route(),station=toStationEvacuation(driver(),{observe:true}).sim.snapshot(false),repair=toRepair(driver()).sim.snapshot(false);
 const probe=(name,snapshot,p,target)=>{const s=structuredClone(snapshot);p={...p,y:new M01Simulation().world.heightAt(p.x,p.z)};Object.assign(s.player,{...p,moveBlend:0,sprinting:false});const dx=target.x-p.x,dz=target.z-p.z;s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.atan2(target.y-p.y-1.6,Math.hypot(dx,dz));return {name,snapshot:s};};
 fixtures=[probe('A-station',station,{x:-327,y:-3,z:12},{x:-398,y:5,z:32}),probe('B-rail-sappers',repair,{x:-135,y:-3,z:4},{x:-250,y:-1,z:19}),
 probe('C-bridge-approach',repair,{x:-50,y:-3,z:42},{x:50,y:7,z:28}),probe('D-long-bridge',flow.combatSnapshots.withdrawal,{x:-145,y:-3,z:76},{x:500,y:8,z:30}),
 probe('E-bombing',flow.combatSnapshots.eastDemolitionOutside,{x:-110,y:-3,z:42},{x:800,y:15,z:30})];
 await writeFile(fixtureFile,JSON.stringify(fixtures,null,2)+'\n');
}
const server=spawn(process.execPath,[`${root}/node_modules/vite/bin/vite.js`,'preview','--host','127.0.0.1','--port',port,'--strictPort'],{cwd:root,stdio:'pipe'});
let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
const report={label,kind:'Frozen production browser camera probes; genuine route states with explicitly staged camera/player positions, not human playtest',shots:[]};
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}/COD-guerra/`)).ok)break;}catch{}if(server.exitCode!==null)throw Error(serverLog);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const quality of ['medium','high','low']) for(const {name,snapshot} of fixtures.filter(f=>!process.env.VISUAL_SCENES||process.env.VISUAL_SCENES.split(',').includes(f.name))){
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(s=>localStorage.setItem('cod-guerra:checkpoint:m01:v2',JSON.stringify(s)),snapshot);
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/?debug=1&visual-verify=1`);
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#quality').selectOption(quality);
  await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});
  await page.locator('#continue').click();await page.waitForFunction(()=>window.gameDiagnostics().paused&&window.gameDiagnostics().clock>0,null,{timeout:120000});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.loaded.includes('pl:0')&&window.gameDiagnostics().m01.viewModel.active,null,{timeout:120000});
  if(quality==='high')await page.waitForFunction(()=>['de:0','de:1','mg34:0','mg34:1','ckm:0','ckm:1'].every(k=>window.gameDiagnostics().m01.characters.loaded.includes(k)),null,{timeout:120000});
  await page.waitForTimeout(500);
  const diag=await page.evaluate(()=>window.gameDiagnostics()),state=await page.evaluate(()=>window.gameVerificationState?.());
  if(diag.clock!==snapshot.clock||diag.m01.battleClock!==snapshot.battleClock)throw Error(`unfrozen ${name}`);
  const path=`screenshots/${label}-${name}-${quality}.png`;
  await page.screenshot({path:`${out}/${path}`,timeout:120000,style:'#pause,#hud,#menu {visibility:hidden!important}'});
  report.shots.push({name,quality,path,errors,diagnostics:diag,stateHash:state?createHash('sha256').update(JSON.stringify(state)).digest('hex'):null});
  console.log(`${label} ${name} ${quality}: ${diag.drawCalls} calls, ${diag.triangles} tris, ${errors.length} errors`);
  const held=await page.evaluate(()=>window.gameVerificationState?.());if(state&&JSON.stringify(state)!==JSON.stringify(held))throw Error(`pause state changed ${name}`);
  await context.close();
 }
}finally{await browser?.close();server.kill();await writeFile(`${out}/${label}-report.json`,JSON.stringify(report,null,2)+'\n');}
if(report.shots.some(s=>s.errors.length))throw Error('Browser errors');
