import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {driver,toStationEvacuation,route} from '../../tests/helpers/m01-route.js';
import {M01Simulation} from '../../src/game/m01-simulation.js';

const out=resolve(process.argv[2]),label=process.argv[3]??'BEFORE',root=resolve(process.argv[4]??'.'),port=process.env.VISUAL_PORT??'4184';
await mkdir(`${out}/screenshots`,{recursive:true});
const fixtures=JSON.parse(gunzipSync(await readFile(`${out}/camera-fixtures.json.gz`)).toString('utf8'));
const server=spawn(process.execPath,[`${root}/node_modules/vite/bin/vite.js`,'preview','--host','127.0.0.1','--port',port,'--strictPort'],{cwd:root,stdio:'pipe'});
let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
const report={label,fixtureHash:createHash('sha256').update(JSON.stringify(fixtures)).digest('hex'),kind:'Production renderer; frozen route saves; staged camera positions, not human playtest',shots:[]};
let browser;
try{
  for(let i=0;i<150;i++){try{if((await fetch(`http://127.0.0.1:${port}/COD-guerra/`)).ok)break;}catch{}if(server.exitCode!==null)throw Error(serverLog);await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const qualities=(process.env.VISUAL_QUALITIES??'high,low,medium').split(',');
  for(const quality of qualities)for(const {name,snapshot}of fixtures.filter(f=>!process.env.VISUAL_SCENES||process.env.VISUAL_SCENES.split(',').includes(f.name))){
    if(quality==='medium'&&!['frontal','oblique','platform','window-door','player-frontal','player-oblique'].includes(name))continue;
    const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>failed.push(r.url()));
    await page.addInitScript(({snapshot,quality})=>{localStorage.setItem('cod-guerra:checkpoint:m01:v2',JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{snapshot,quality});
    await page.goto(`http://127.0.0.1:${port}/COD-guerra/?debug=1&visual-verify=1`);
    await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
    await page.locator('#quality').selectOption(quality);
    await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});
    await page.locator('#continue').click();
    await page.waitForFunction(()=>window.gameDiagnostics().paused&&window.gameDiagnostics().m01.renderedFrames>0,null,{timeout:120000});
    await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.loaded.includes('pl:0'),null,{timeout:120000});
    // Optional assets finish without advancing the frozen mission state.
    await page.waitForFunction(()=>window.gameDiagnostics().m01.wagons.loaded.length===6,null,{timeout:120000});
    await page.waitForTimeout(250);
    const diag=await page.evaluate(()=>window.gameDiagnostics()),state=await page.evaluate(()=>window.gameVerificationState());
    if(diag.clock!==snapshot.clock||diag.m01.battleClock!==snapshot.battleClock)throw Error(`Unfrozen ${name}`);
    const path=`screenshots/${label}-${name}-${quality}.png`;
    await page.screenshot({path:`${out}/${path}`,timeout:120000,style:'#pause,#hud,#menu {visibility:hidden!important}'});
    const held=await page.evaluate(()=>window.gameVerificationState());
    if(JSON.stringify(state)!==JSON.stringify(held))throw Error(`Pause mutation ${name}`);
    report.shots.push({name,quality,path,errors,failed,diagnostics:{drawCalls:diag.drawCalls,triangles:diag.triangles,textures:diag.textures,geometries:diag.geometries,instances:diag.environmentInstances,clock:diag.clock,m01:{stationArchitecture:diag.m01.stationArchitecture,environmentProps:diag.m01.environmentProps,stationEvacuation:diag.m01.stationEvacuation,wagons:diag.m01.wagons,models:diag.m01.models,bridgePortalPolish:diag.m01.bridgePortalPolish,locomotive:diag.m01.locomotive,panzerzug:diag.m01.panzerzug}},stateHash:createHash('sha256').update(JSON.stringify(state)).digest('hex')});
    console.log(`${label} ${name} ${quality}: ${diag.drawCalls} calls, ${diag.triangles} triangles, ${errors.length} errors`);
    await context.close();
  }
}finally{await browser?.close();server.kill();await writeFile(`${out}/${label}-report.json`,JSON.stringify(report,null,2)+'\n');}
if(report.shots.some(s=>s.errors.length||s.failed.length))throw Error('Browser errors');
