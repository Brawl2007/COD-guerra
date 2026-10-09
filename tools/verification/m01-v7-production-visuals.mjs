import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {driver,route,toStationEvacuation} from '../../tests/helpers/m01-route.js';

const out=path.resolve(process.env.M01_V7_EVIDENCE??'docs/verification/m01-runtime/final-approved-deliveries-integration-v7');
const base='cbc7de5668a1b2e4bc646b86548196a5f4f1039a',key='cod-guerra:checkpoint:m01:v2';
const hash=x=>createHash('sha256').update(x).digest('hex');
const supplementary=process.argv.includes('--supplementary');
const reportName=supplementary?'SUPPLEMENTARY_PRODUCTION.json':'VISUAL_COMPARISON.json';
fs.mkdirSync(path.join(out,'visual'),{recursive:true});

const d=driver();d.step({skip:true});const initial=d.sim.snapshot();
const evacuation=toStationEvacuation(driver(),{observe:true}).sim.snapshot();
let trainState,panzerState;
const full=route(19390901,{support:true,onStep:({sim})=>{
  if(sim.renderState.train963&&!trainState)trainState=sim.snapshot();
  if(sim.renderState.panzerzug&&!panzerState)panzerState=sim.snapshot();
}}),repair=full.combatSnapshots.repair;
assert.ok(trainState&&panzerState,'Real train and Panzerzug visibility events must be reached');
const world=new M01Simulation().world;
function camera(snapshot,x,z,tx,ty,tz){
  const s=structuredClone(snapshot),y=world.heightAt(x,z),dx=tx-x,dz=tz-z;
  Object.assign(s.player,{x,y,z,angle:Math.atan2(dz,dx),pitch:Math.atan2(ty-y-1.6,Math.hypot(dx,dz)),aiming:false,sprinting:false,moveBlend:0});return s;
}
// Player-height cameras. No spectator transform or renderer mutation.
const views=supplementary?[
  ['soldiers-close',camera(repair,-121,15,-122,-1.7,10)],
  ['train-963-close',camera(trainState,1088,-12,1075,2,-2.5)],
  // Explicit artistic inspection, not a navigable point or player-height gameplay claim.
  ['station-roof-artistic',(()=>{const s=camera(initial,-397,4,-399,10.5,42);s.player.y=17.5;s.player.pitch=Math.atan2(10.5-19.1,Math.hypot(2,38));return s;})()]
]:[
  ['station-frontal',camera(initial,-397,17,-397,3,39)],
  ['station-oblique',camera(initial,-323,10,-403,5,40)],
  ['station-platform',camera(initial,-392,65,-391,4,45)],
  ['station-yard',camera(initial,-300,4,-397,5,40)],
  ['station-window',camera(initial,-403,22,-403,4.4,28)],
  ['soldiers',camera(repair,3.5,6,13,.8,4)],
  ['bridge-west',camera(repair,-28,23,90,8,20)],
  ['bridge-east',camera(repair,38,42,900,9,20)],
  ['train-963',camera(trainState,1063,-17,1075,2.5,-2.5)],
  ['panzerzug',camera(panzerState,1107,18,1119,2.5,2.5)],
  ['evacuation',evacuation],['roll-call',full.outro]
];
const servers=[];
if(process.argv.includes('--start-servers')){
  assert.ok(process.env.M01_V6_CHECKOUT,'Set the protected V6 checkout');
  for(const [cwd,port] of [[process.env.M01_V6_CHECKOUT,4186],[process.cwd(),4187]]){
    servers.push(spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,stdio:'ignore'}));
    for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${port}/COD-guerra/`)).ok)break;}catch{}if(i===59)throw Error('Production preview unavailable');await new Promise(r=>setTimeout(r,250));}
  }
}
const executablePath=process.env.CHROME_EXECUTABLE;assert.ok(executablePath,'Set CHROME_EXECUTABLE');
const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const captures=[];
const builds=[];
try{
  for(const quality of ['low','medium','high'])
    for(const [version,url] of [['V6',process.env.M01_V6_URL??'http://127.0.0.1:4186/COD-guerra/'],['V7',process.env.M01_V7_URL??'http://127.0.0.1:4187/COD-guerra/']]){
      const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],failed=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
      await page.addInitScript(({key,snapshot,quality})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,snapshot:views[0][1],quality});
      await page.goto(url+'?debug=1&visual-verify=1');
      const script=await page.locator('script[type="module"][src]').getAttribute('src');
      const scriptUrl=new URL(script,url).href,response=await page.request.get(scriptUrl);
      assert.ok(response.ok(),'Production JS bundle must load');
      const bundleSha256=hash(await response.body());
      builds.push({version,quality,url,scriptUrl,bundleSha256});
      await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
      await page.waitForLoadState('networkidle');
      // Reuse one page per version/quality, and finish the incremental atlas before
      // restoring the camera. The new world then forces a real, fully painted frame.
      await page.waitForFunction(()=>window.gameDiagnostics().m01.damageDecals.atlasReady,null,{timeout:120000});
      for(const [name,snapshot] of views){
      await page.evaluate(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
      await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){
        document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
      }};document.addEventListener('pointerlockchange',hold,true);});
      await page.locator('#continue').click();
      await page.waitForFunction(s=>{const d=window.gameDiagnostics();return d.paused&&d.clock===s.clock&&d.player.x===s.player.x&&d.m01.renderedFrames>0;},snapshot,{timeout:120000});
      await page.waitForFunction(()=>{const m=window.gameDiagnostics().m01;return m.characters.loaded.includes('pl:0')&&m.aircraft.loaded.length===3&&m.locomotive.loaded.length===3&&m.panzerzug.loaded.length===3&&m.wagons.loaded.length>=6&&m.yardWagons.pending.length===0;},null,{timeout:120000});
      await page.waitForLoadState('networkidle');
      const before=await page.evaluate(()=>window.gameVerificationState().snapshot);
      await page.waitForTimeout(750);
      const diagnostics=await page.evaluate(()=>window.gameDiagnostics()),after=await page.evaluate(()=>window.gameVerificationState().snapshot);
      assert.deepEqual(after,before);assert.equal(diagnostics.clock,snapshot.clock);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
      const filename=`${version}-${name}-${quality}.png`;
      await page.screenshot({path:path.join(out,'visual',filename),style:'#pause,#menu,#hud{visibility:hidden!important}',timeout:120000});
      const record={version,name,quality,file:`visual/${filename}`,snapshotSha256:hash(JSON.stringify(after)),clock:diagnostics.clock,player:diagnostics.player,
        drawCalls:diagnostics.drawCalls,triangles:diagnostics.triangles,textures:diagnostics.textures,geometries:diagnostics.geometries,
        environmentInstances:diagnostics.m01.environmentInstances,station:diagnostics.m01.stationArchitecture,bridge:diagnostics.m01.bridgeStructure,
        props:diagnostics.m01.environmentProps,aircraft:diagnostics.m01.aircraft,characters:diagnostics.m01.characters,fireEffects:diagnostics.m01.fireEffects,
        train:diagnostics.m01.wagons,locomotive:diagnostics.m01.locomotive,panzerzug:diagnostics.m01.panzerzug,
        battlefieldFx:diagnostics.m01.battlefieldFx,errors,failed};
      captures.push(record);await page.locator('#back-menu').click();
      fs.writeFileSync(path.join(out,reportName),JSON.stringify({base,testedHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),kind:supplementary?'Production app, genuine saves; soldiers/train at player height, elevated roof pose explicitly artistic':'Production app, real Schema 2 saves and frozen player-height cameras; no tick or renderer injection',browserVersion:browser.version(),viewport:{width:1280,height:720},builds,captures},null,2)+'\n');
      console.log(`${version} ${name} ${quality}: ${record.drawCalls} calls / ${record.triangles} triangles`);
      }
      await page.close();
    }
  for(const quality of ['low','medium','high'])for(const [name] of views){
    const pair=captures.filter(c=>c.name===name&&c.quality===quality);
    assert.equal(pair[0].snapshotSha256,pair[1].snapshotSha256,`${name}/${quality} frozen state`);
  }
}finally{await browser.close();servers.forEach(s=>s.kill('SIGTERM'));}
