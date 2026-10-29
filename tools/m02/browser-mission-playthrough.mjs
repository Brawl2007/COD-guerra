import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out=process.env.M02_PLAY_OUT??'/tmp/m02-continuous';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={startedAt:new Date().toISOString(),method:'Continuous production build; trusted Playwright keyboard/start and pointer-lock mouse input; read-only planner uses actor/collision observations, never writes simulation state.',stages:[],deaths:[],errors:[]};
const verifyOrders=process.env.M02_ORDER_RUN==='1';
if(verifyOrders)report.orders=[];
report.buildCommit=process.env.M02_BUILD_SHA??null;
const started=Date.now();
let page;
try{
 page=await browser.newPage({viewport:{width:480,height:270}});
 page.on('pageerror',e=>report.errors.push(e.stack??e.message));
 await page.goto(`${process.env.M02_BASE_URL??'http://127.0.0.1:4290/COD-guerra'}/m02.html?quality=low&debug=1`);
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled,null,{timeout:120000});
 await page.evaluate(async()=>{const {M02MissionPilot}=await import('/COD-guerra/tools/m02/mission-pilot.mjs');window.m02Pilot=new M02MissionPilot();});
 await page.click('#mission-start');
 await page.waitForFunction(()=>document.pointerLockElement?.id==='m02-canvas');
 const held=new Set();let last='',orderIndex=0,lastOrderAt=-Infinity;
 const orderSequence=[['KeyZ','suppress'],['KeyX','advance'],['KeyB','flank_east']];
 const hold=async(key,on)=>{if(on&&!held.has(key)){await page.keyboard.down(key);held.add(key);}else if(!on&&held.has(key)){await page.keyboard.up(key);held.delete(key);}};
 for(let iteration=0;iteration<24000;iteration++){
  const observed=await page.evaluate(()=>{
   const sim=window.m02Bench.sim;
   return {clock:sim.clock,state:window.m02Diagnostics().state,health:sim.player.health,cell:sim.activeCellId,objective:sim.objective.id,completed:sim.areaC.c12Completed,ammo:{mag:sim.weapon.mag,reserve:sim.weapon.reserve,received:sim.weapon.received,grenades:sim.grenadeAmmo},decision:window.m02Pilot.decide(sim),pos:[sim.player.x,sim.player.z],squadOrder:sim.squadOrder.type};
  });
  const label=`${observed.cell}:${observed.objective}`;
  if(label!==last){last=label;report.stages.push({label,clock:observed.clock,health:observed.health,pos:observed.pos,realSec:(Date.now()-started)/1000});console.log(JSON.stringify(report.stages.at(-1)));await page.screenshot({path:`${out}/${report.stages.length}-${label.replace(':','-')}.png`});}
  if(observed.completed){report.completed=true;break;}
  if(observed.health<=0){
    report.deaths.push({label,clock:observed.clock,realSec:(Date.now()-started)/1000});
    if(report.deaths.length>5)throw Error('Five checkpoint retries exhausted');
    for(const key of held)await page.keyboard.up(key);held.clear();
    await page.waitForFunction(()=>window.m02Diagnostics().state==='dead');
    await page.screenshot({path:`${out}/death-${report.deaths.length}.png`});
    await page.click('#mission-restart');
    await page.waitForFunction(()=>document.pointerLockElement?.id==='m02-canvas');
    await page.evaluate(async attempt=>{const {M02MissionPilot}=await import('/COD-guerra/tools/m02/mission-pilot.mjs');window.m02Pilot=new M02MissionPilot({flankX:attempt%2?-65:-50,flankZ:attempt%2?-70:-52});},report.deaths.length);
    continue;
  }
  if(Date.now()-started>1800000)throw Error('Continuous run exceeded 30 minute wall budget');
  if(report.errors.length)throw Error(report.errors.join('\n'));
  if(verifyOrders&&orderIndex<orderSequence.length&&observed.cell==='A'&&['O01','O02'].includes(observed.objective)&&observed.clock-lastOrderAt>=2){
    const [key,type]=orderSequence[orderIndex++];await page.keyboard.press(key);
    // Input is consumed by the next fixed simulation tick. A frame can have
    // advanced between the observation and keypress, so wait for the actual
    // order rather than mistaking that earlier frame for confirmation.
    await page.waitForFunction(expected=>window.m02Bench.sim.squadOrder.type===expected,type,{timeout:20000});
    const confirmedAt=await page.evaluate(()=>window.m02Bench.sim.clock);
    report.orders.push({key,type,issuedAt:observed.clock,confirmedAt});lastOrderAt=confirmedAt;
  }
  const c=observed.decision.controls;
  // The M01 verification harness uses the same relative mouse events because
  // absolute headless pointer-lock motion cancels. Only the input listener runs.
  await page.evaluate(([x,y])=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y})),[(c.lookX??0)/.0024,(c.lookY??0)/.0022]);
  for(const [key,on] of [['KeyW',c.forward>0],['ShiftLeft',c.sprint],['KeyV',c.aim]])await hold(key,Boolean(on));
  for(const [key,on] of [['KeyC',c.crouch],['KeyE',c.interact],['KeyR',c.reload],['Space',c.fire],['KeyG',c.grenade]])if(on)await page.keyboard.press(key);
  await page.waitForFunction(clock=>window.m02Bench.sim.clock>clock,observed.clock,{timeout:60000});
  if(iteration%100===0)fs.writeFileSync(`${out}/progress.json`,JSON.stringify({...report,last:observed},null,2));
 }
 for(const key of held)await page.keyboard.up(key);
 if(!report.completed)throw Error('Mission not completed');
 if(verifyOrders&&(orderIndex!==orderSequence.length||report.orders.length!==orderSequence.length))throw Error('The complete squad order sequence was not verified');
 for(let i=0;i<3;i++){await page.screenshot({path:`${out}/epilogue-${i}.png`});await page.click('#mission-epilogue-next');}
 await page.waitForFunction(()=>window.m02Diagnostics().state==='debrief');
 report.result=await page.evaluate(()=>structuredClone(window.m02Bench.sim.m03ExportPackage));
 report.diagnostics=await page.evaluate(()=>window.m02Diagnostics());
 await page.setViewportSize({width:1280,height:720});await page.screenshot({path:`${out}/debrief.png`});
 console.log('COMPLETE',JSON.stringify(report.result));
}catch(error){report.failure=error.message;console.log('FAILED',error.message);if(page)await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
