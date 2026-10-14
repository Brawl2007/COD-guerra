import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/t50-proof';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[],consoleErrors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
const started=Date.now();
try{
 await page.goto('http://127.0.0.1:4173/COD-guerra/?debug=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('#m01-loading',{state:'visible'});
 await page.screenshot({path:out+'/01-m01-loading.png'});
 await page.waitForFunction(()=>document.querySelector('#m01-loading')?.dataset.phase==='ready',null,{timeout:90000});
 await page.screenshot({path:out+'/02-m01-loaded-menu.png'});
 const percent=await page.locator('#m01-loading-bar').getAttribute('aria-valuenow');
 if(percent!=='100')throw Error('Reported ready but not 100%');
 await page.locator('#quality').selectOption('low');
 await page.locator('#start').click();
 await page.waitForFunction(()=>window.gameDiagnostics?.()&&!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:60000});
 // Actual user input skips the genuine black cinematic introduction.
 await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.checkpoints?.includes('cp_m01_a_orientacao'),null,{timeout:90000});
 await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.viewModel?.active===true,null,{timeout:60000});
 // Pause via the native pointer-lock release to capture a fixed real world frame.
 await page.evaluate(()=>document.exitPointerLock());
 await page.waitForSelector('#pause:not(.hidden)',{timeout:10000});
 await page.screenshot({path:out+'/03-m01-gameplay-hud-weapon.png',style:'#pause{visibility:hidden!important}',timeout:90000});
 const game=await page.evaluate(()=>({hasCanvas:!!document.querySelector('#game')?.getContext('webgl2'),
  clock:document.querySelector('#battle-clock')?.textContent,
  weapon:document.querySelector('#weapon-name')?.textContent,
  paused:window.gameDiagnostics().paused,
  checkpoints:window.gameDiagnostics().m01.checkpoints,
  characters:window.gameDiagnostics().m01.characters?.active,
  status:document.querySelector('#mission-status')?.textContent}));
 if(!game.hasCanvas||!game.weapon||!game.checkpoints.includes('cp_m01_a_orientacao')||!game.paused)throw Error('Genuine post-intro M01 gameplay state not verified');
 if(errors.length)throw Error('Browser errors: '+JSON.stringify(errors.slice(0,8)));
 await writeFile(out+'/browser-observations.json',JSON.stringify({game,loadMs:Date.now()-started,errors,consoleErrors},null,2));
 console.log('M01 gameplay captured:',game);
}finally{await context.close();await browser.close();}
