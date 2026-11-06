// Deliberately expose the player to live enemy fire using normal controls.
// Read-only navigation planning; never write health, enemies, time or saves.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.M02_CHECKPOINT_OUT??'/tmp/m02-checkpoint-playtest';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={method:'Live enemy damage, trusted keyboard and relative mouse input listener. Planner only reads navigation/position. No health, clock, enemy, objective or save injection.',errors:[],samples:[]};
let page;const started=Date.now();
try{
 page=await browser.newPage({viewport:{width:640,height:360}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`${process.env.M02_BASE_URL??'http://127.0.0.1:5173/COD-guerra'}/m02.html?quality=low&debug=1`);
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled,null,{timeout:120000});
 await page.click('#mission-start');
 for(let step=0;step<6000;step++){
  const state=await page.evaluate(()=>{
   const {sim}=window.m02Bench,p=sim.player,goal={x:3,z:-30},route=sim.navigator.route(p,goal)??[];
   while(route.length&&Math.hypot(route[0][0]-p.x,route[0][1]-p.z)<.4)route.shift();
   const corner=route[0],angle=corner?Math.atan2(corner[1]-p.z,corner[0]-p.x):p.angle;
   return {clock:sim.clock,state:window.m02Diagnostics().state,health:p.health,x:p.x,z:p.z,crouched:p.crouched,move:Boolean(corner),turn:Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle)),pitch:p.pitch};
  });
  if(step%40===0){report.samples.push(state);fs.writeFileSync(`${out}/progress.json`,JSON.stringify(report,null,2));}
  if(state.state==='dead'){
   report.death=state;await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
   await page.screenshot({path:`${out}/death.png`});break;
  }
  if(Date.now()-started>180000)throw Error('Live enemy fire did not kill the exposed player within this playtest budget');
  if(state.crouched)await page.keyboard.press('KeyC');
  await page.evaluate(([x,y])=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y})),[state.turn/.0024,state.pitch/.0022]);
  await page.keyboard.down('ShiftLeft');
  if(state.move)await page.keyboard.down('KeyW');else await page.keyboard.up('KeyW');
  await page.waitForFunction(clock=>window.m02Bench.sim.clock>clock||window.m02Diagnostics().state==='dead',state.clock,{timeout:60000});
 }
 assert.ok(report.death,'death must come from live simulation combat');
 report.saved=await page.evaluate(()=>{let best=null;for(const [id,s]of window.m02Bench.sim.checkpoints)if(!best||s.clock>=best.clock)best={id,clock:s.clock,health:s.player.health,x:s.player.x,z:s.player.z};return best;});
 await page.click('#mission-restart');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='playing'&&document.pointerLockElement?.id==='m02-canvas');
 report.restored=await page.evaluate(()=>window.m02Diagnostics());
 assert.ok(report.restored.player.health>0);assert.ok(report.restored.clock<report.death.clock);
 assert.ok(Math.hypot(report.restored.player.x-report.saved.x,report.restored.player.z-report.saved.z)<.5);
 await page.screenshot({path:`${out}/restored.png`});
 assert.deepEqual(report.errors,[]);report.passed=true;
 console.log(JSON.stringify({passed:true,death:report.death,saved:report.saved,restoredClock:report.restored.clock}));
}catch(error){report.failure=error.message;process.exitCode=1;console.log('FAILED',error.message);}
finally{report.wallSeconds=(Date.now()-started)/1000;fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
