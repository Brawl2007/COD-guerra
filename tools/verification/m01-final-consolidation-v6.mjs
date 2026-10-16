import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {driver,route,toStationEvacuation} from '../../tests/helpers/m01-route.js';

const out=path.resolve('docs/verification/m01-runtime/final-production-consolidation-v6');
const base='d277b06937170aa433bc418ef5b83b2925c6d6de',key='cod-guerra:checkpoint:m01:v2';
const hash=x=>createHash('sha256').update(x).digest('hex');
fs.mkdirSync(path.join(out,'visual'),{recursive:true});

if(process.argv.includes('--invariants')){
  assert.ok(process.env.M01_V5_CHECKOUT,'Set M01_V5_CHECKOUT to an isolated V5 checkout');
  const {M01Simulation:Baseline}=await import(pathToFileURL(path.join(process.env.M01_V5_CHECKOUT,'src/game/m01-simulation.js')));
  const files=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n')
    .filter(p=>/^(assets\/|src\/|tools\/assets\/)/.test(p)&&!['src/game/game.js','src/main.js','src/render/m01-view.js','src/render/m01-bridge-portal-polish.js'].includes(p));
  const protectedFiles=files.map(p=>{const before=execFileSync('git',['show',`${base}:${p}`],{maxBuffer:20*1024*1024}),after=fs.readFileSync(p);assert.deepEqual(after,before,p);return {path:p,sha256:hash(after),bytes:after.length};});
  const summaries=[];
  for(const seed of [19390901,7]){
    const a=route(seed,{support:true,Simulation:Baseline}),b=route(seed,{support:true});
    assert.deepEqual(b.sim.snapshot(),a.sim.snapshot());assert.deepEqual(b.checkpoints,a.checkpoints);assert.deepEqual(b.events,a.events);assert.deepEqual(b.outro,a.outro);
    summaries.push({seed,events:b.events.length,eventIds:Object.keys(b.sim.consumed),objectives:b.sim.objectives,checkpoints:Object.keys(b.checkpoints),schema:b.sim.snapshot().schema,rng:b.sim.rng.state,
      snapshotSha256:hash(JSON.stringify(b.sim.snapshot())),eventSha256:hash(JSON.stringify(b.events)),equivalent:true});
  }
  fs.writeFileSync(path.join(out,'INVARIANTS.json'),JSON.stringify({base,protectedFiles,summaries},null,2)+'\n');
  console.log(`PASS ${protectedFiles.length} protected files and two equivalent complete mission routes`);
  process.exit(0);
}

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
const views=[
  ['station-frontal',camera(initial,-397,17,-397,3,39)],
  ['station-oblique',camera(initial,-323,10,-403,5,40)],
  ['station-platform',camera(initial,-392,65,-391,4,45)],
  ['station-yard',camera(initial,-300,4,-397,5,40)],
  ['bridge-west',camera(repair,-28,23,90,8,20)],
  ['bridge-east',camera(repair,38,42,900,9,20)],
  ['train-963',camera(trainState,1063,-17,1075,2.5,-2.5)],
  ['panzerzug',camera(panzerState,1107,18,1119,2.5,2.5)],
  ['evacuation',evacuation],['roll-call',full.outro]
];
const executablePath=process.env.CHROME_EXECUTABLE;assert.ok(executablePath,'Set CHROME_EXECUTABLE');
const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const captures=[];
const builds=[];
try{
  for(const quality of ['low','medium','high'])
    for(const [version,url] of [['V5',process.env.M01_V5_URL??'http://127.0.0.1:4184/COD-guerra/'],['V6',process.env.M01_V6_URL??'http://127.0.0.1:4185/COD-guerra/']]){
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
      fs.writeFileSync(path.join(out,'VISUAL_COMPARISON.json'),JSON.stringify({base,browserVersion:browser.version(),viewport:{width:1280,height:720},builds,captures},null,2)+'\n');
      console.log(`${version} ${name} ${quality}: ${record.drawCalls} calls / ${record.triangles} triangles`);
      }
      await page.close();
    }
  for(const quality of ['low','medium','high'])for(const [name] of views){
    const pair=captures.filter(c=>c.name===name&&c.quality===quality);
    assert.equal(pair[0].snapshotSha256,pair[1].snapshotSha256,`${name}/${quality} frozen state`);
  }
}finally{await browser.close();}
