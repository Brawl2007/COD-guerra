import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/t50-proof';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const started=Date.now();
try{
 await page.goto('http://127.0.0.1:4173/COD-guerra/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForSelector('#m01-loading',{state:'visible'});
 await page.screenshot({path:out+'/01-m01-loading.png'});
 await page.waitForFunction(()=>document.querySelector('#m01-loading')?.dataset.phase==='ready',{timeout:90000});
 await page.screenshot({path:out+'/02-m01-loaded-menu.png'});
 const percent=await page.locator('#m01-loading-bar').getAttribute('aria-valuenow');
 if(percent!=='100')throw Error('Reported ready but not 100%');
 await page.locator('#quality').selectOption('low');
 await page.locator('#start').click();
 await page.waitForSelector('#hud:not(.hidden)',{timeout:15000});
 await page.waitForTimeout(2000);
 await page.screenshot({path:out+'/03-m01-gameplay-hud-weapon.png'});
 const game=await page.evaluate(()=>({hasCanvas:!!document.querySelector('#game')?.getContext('webgl2'),
  clock:document.querySelector('#battle-clock')?.textContent,
  weapon:document.querySelector('#weapon-name')?.textContent,
  status:document.querySelector('#mission-status')?.textContent}));
 if(!game.hasCanvas||!game.weapon)throw Error('M01 gameplay camera/weapon HUD not verified');
 if(errors.length)throw Error('Browser errors: '+JSON.stringify(errors.slice(0,8)));
 await writeFile(out+'/browser-observations.json',JSON.stringify({game,loadMs:Date.now()-started,errors},null,2));
 console.log('M01 gameplay captured:',game);
}finally{await context.close();await browser.close();}
