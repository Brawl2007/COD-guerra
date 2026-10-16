// Matched visual probes, not a playtest or a hardware performance measurement.
// Both versions use their existing weapon fixture, real M01Simulation ticks and identical controls.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {driver,route} from '../../tests/helpers/m01-route.js';

const out=path.resolve(process.env.M01_V7_EVIDENCE??'docs/verification/m01-runtime/final-approved-deliveries-integration-v7');
const base='cbc7de5668a1b2e4bc646b86548196a5f4f1039a',hash=x=>createHash('sha256').update(x).digest('hex');
const supplementary=process.argv.includes('--supplementary'),reportName=supplementary?'SUPPLEMENTARY_EXPLOSIONS.json':'TRANSIENT_COMPARISON.json';
assert.ok(process.env.M01_V6_CHECKOUT,'Set M01_V6_CHECKOUT');
fs.mkdirSync(path.join(out,'visual'),{recursive:true});
const start=driver();start.step({skip:true});for(let i=0;i<20;i++)start.step();
const grenade=driver();grenade.step({skip:true});grenade.step({grenade:true});
let grenadeBefore,grenadeEvent;
for(let i=0;i<100;i++){grenadeBefore=grenade.sim.snapshot();const n=grenade.events.length;grenade.step();grenadeEvent=grenade.events.slice(n).find(e=>e.type==='m01-blast');if(grenadeEvent)break;}
assert.ok(grenadeEvent,'A real thrown grenade must detonate');
let previous,eastBefore,eastControls,eastEvent;
route(19390901,{support:true,onStep:({sim,controls,events})=>{
  const event=events.find(e=>e.type==='m01-blast');
  if(event&&sim.scene?.id==='cs_m01_east_blast'){eastBefore=previous;eastControls=controls;eastEvent=event;}
  if(!eastBefore&&sim.battleClock>=6*3600+9*60+58)previous=sim.snapshot();
}});
assert.ok(eastBefore&&eastEvent,'Real east demolition event must be reached');
const servers=[],captures=[],errors=[];
let browser;
try{
  for(const [cwd,port] of [[process.env.M01_V6_CHECKOUT,5286],[process.cwd(),5287]]){
    servers.push(spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','tools/verification/vite.capture.config.mjs','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,stdio:'ignore'}));
    for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${port}/COD-guerra/`)).ok)break;}catch{}if(i===59)throw Error('Fixture server unavailable');await new Promise(r=>setTimeout(r,250));}
  }
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const quality of ['low','medium','high'])for(const [version,port] of [['V6',5286],['V7',5287]]){
    const page=await browser.newPage({viewport:{width:1280,height:720}}),pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))pageErrors.push(`${r.status()} ${r.url()}`);});
    await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-weapon-presentation-fixture.html`);
    await page.waitForFunction(()=>window.wpReady,null,{timeout:120000});
    const call=(fn,...a)=>page.evaluate(([fn,a])=>window.wp[fn](...a),[fn,a]);
    const capture=async(name)=>{
      const before=await call('snapshot'),state=await call('state');await call('repeat',2);assert.deepEqual(await call('snapshot'),before,'Pause cannot advance simulation');
      const file=`visual/${version}-${name}-${quality}.png`;await page.screenshot({path:path.join(out,file),timeout:120000});
      assert.deepEqual(pageErrors,[]);captures.push({version,name,quality,file,clock:before.clock,snapshotSha256:hash(JSON.stringify(before)),state,errors:[...pageErrors]});
      fs.writeFileSync(path.join(out,reportName),JSON.stringify({base,testedHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),kind:'Existing production-renderer fixture, genuine saves/events and identical stepped controls; no authority or event injection',viewport:[1280,720],events:{grenade:grenadeEvent,eastDemolition:eastEvent},captures,errors},null,2)+'\n');
      console.log(`${version} ${name} ${quality}: ${state.render?.calls??'not exposed by V6 fixture'} calls / ${state.render?.triangles??'not exposed by V6 fixture'} triangles`);
    };
    await call('prepareM01',start.sim.snapshot(),quality);await page.waitForLoadState('networkidle');
    if(supplementary){
      await call('prepareM01',grenadeBefore,quality);await call('step',{},5);await capture('grenade-explosion-hot');
      await call('prepareM01',eastBefore,quality);await call('step',eastControls,1);await call('step',{},5);await capture('east-demolition-hot');
    }else{
    await call('step',{},4);await capture('weapon-hip');
    await call('step',{aim:true},16,3);await call('step',{aim:true,lookX:10},2);await capture('weapon-ads-turn');
    await call('step',{aim:true,fire:true},1);await capture('weapon-shot');
    await call('step',{aim:true},13,3);await capture('weapon-brass');
    await call('step',{},23,3);
    for(let i=0;i<4;i++){await call('step',{fire:true},1);await call('step',{},24,3);}
    const empty=await call('state');assert.equal(empty.weapon.mag,0);assert.equal(empty.weapon.state,'READY');
    await call('step',{reload:true},1);await call('step',{},20,3);assert.equal((await call('state')).weapon.state,'RELOAD_CLIP');await capture('weapon-reload');
    await call('prepareM01',grenadeBefore,quality);await call('step',{},1);await capture('grenade-explosion');
    await call('prepareM01',eastBefore,quality);await call('step',eastControls,1);await capture('east-demolition');
    }
    await page.close();
  }
  for(const quality of ['low','medium','high'])for(const name of [...new Set(captures.map(c=>c.name))]){
    const pair=captures.filter(c=>c.quality===quality&&c.name===name);assert.equal(pair.length,2);assert.equal(pair[0].snapshotSha256,pair[1].snapshotSha256,`${name}/${quality} equivalent gameplay`);
  }
  console.log(`PASS: ${supplementary?6:21} matched transient pairs; every simulation snapshot identical`);
}finally{await browser?.close();servers.forEach(s=>s.kill('SIGTERM'));}
