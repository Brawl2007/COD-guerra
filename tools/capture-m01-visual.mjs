import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {route}=await import(pathToFileURL(resolve('tests/helpers/m01-route.js')));

// Staged visual continuations of genuine route snapshots, never a human playtest.
const out=process.argv[2]??'docs/verification/m01-runtime/visual-sprint/after';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'pipe'});
let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
for(let i=0;i<60;i++){
  if(server.exitCode!==null)throw new Error(`Preview exited: ${serverLog}`);
  try{if((await fetch('http://127.0.0.1:4173/COD-guerra/')).ok)break;}catch{}
  await new Promise(r=>setTimeout(r,100));
}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const flow=route(),report={kind:'staged production browser continuations',shots:[]};
const shots=process.argv.includes('--demolition-only')?
  [['demolition-inside',flow.combatSnapshots.eastDemolition],['demolition-outside',flow.combatSnapshots.eastDemolitionOutside]]
    .map(([name,snapshot])=>[name,snapshot,Math.atan2(20-snapshot.player.z,800-snapshot.player.x)]):
  [['repair',flow.combatSnapshots.repairThreat],['station-damage',flow.combatSnapshots.repairThreat,Math.PI],['withdrawal',flow.combatSnapshots.withdrawal],['roll-call',flow.outro]];
try{
  for(const [name,snapshot,lookAt]of shots){
    console.log(`Capturing ${name}`);
    const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.addInitScript(snapshot=>localStorage.setItem('cod-guerra:checkpoint:m01:v2',JSON.stringify(snapshot)),snapshot);
    await page.goto('http://127.0.0.1:4173/COD-guerra/?debug=1');
    await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
    await page.locator('#quality').selectOption('medium');await page.locator('#continue').click();
    await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
    if(lookAt!==undefined){
      const d=await page.evaluate(()=>window.gameDiagnostics()),delta=Math.atan2(Math.sin(lookAt-d.player.angle),Math.cos(lookAt-d.player.angle))/.0022;
      await page.evaluate(delta=>{
        document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0,bubbles:true}));
        document.dispatchEvent(new MouseEvent('mousemove',{movementX:delta,movementY:0,bubbles:true}));
      },delta);
    }
    await page.waitForTimeout(700);
    await page.screenshot({timeout:120000,path:`${out}/${name}.png`});
    report.shots.push({name,errors,diagnostics:await page.evaluate(()=>window.gameDiagnostics())});
    console.log(`Captured ${name}: ${errors.length} errors`);await context.close();
  }
}finally{await browser.close();server.kill();}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
if(report.shots.some(s=>s.errors.length))throw new Error('Browser errors; inspect report');
console.log(report.shots.map(s=>({name:s.name,errors:s.errors,drawCalls:s.diagnostics.drawCalls,triangles:s.diagnostics.triangles})));
