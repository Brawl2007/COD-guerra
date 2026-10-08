// Capturas do HUD de M01 no build de produção, em várias resoluções.
// Estados: snapshots alcançados pela rota real da simulação (tests/helpers/m01-route.js) e controlos reais no browser.
// Cada estado é congelado com a pausa real (pointer lock libertado) e redimensionado sem avançar o relógio.
// Não é playtest humano nem medição de FPS (SwiftShader).
// Uso: npm run build && CHROME_EXECUTABLE=/opt/pw-browsers/chromium node tools/verification/m01-hud-capture.mjs <saída> [rótulo]
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {driver,toRepair,route} from '../../tests/helpers/m01-route.js';

const out=resolve(process.argv[2]??'test-results/m01-hud'),label=process.argv[3]??'after',port=process.env.HUD_PORT??'4187';
const KEY='cod-guerra:checkpoint:m01:v2';
const VIEWPORTS=(process.env.HUD_VIEWPORTS??'1280x720,1366x768,1920x1080,1024x600,800x600,2560x1080').split(',').map(v=>v.split('x').map(Number));
const ONLY=process.env.HUD_SCENES?.split(',');
await mkdir(out,{recursive:true});

// Snapshots da rota real; nada é injectado na simulação depois de carregados.
const flow=route();
const atPost=driver();atPost.step({skip:true});atPost.walk(-66,26);atPost.walk(-15,26);atPost.walk(-15,2);atPost.walk(16,2);
const repair=toRepair(driver()).sim.snapshot();
const scenes=[
  {name:'intro-black',kind:'new',at:1.6},
  {name:'intro-card-place',kind:'new',at:5.8},
  {name:'intro-card-unit',kind:'new',at:9.8},
  {name:'intro-fade-in',kind:'new',at:12.2},
  {name:'intro-dialogue',kind:'new',at:19.5},
  {name:'cp-a-objective',kind:'new',skip:true,after:.9},
  {name:'interaction-post',kind:'continue',snapshot:atPost.sim.snapshot(),after:1.2},
  {name:'objective-update',kind:'continue',snapshot:atPost.sim.snapshot(),press:'KeyE',after:1.3},
  {name:'repair-status',kind:'continue',snapshot:flow.combatSnapshots.repairThreat??repair,after:4.5},
  {name:'withdrawal',kind:'continue',snapshot:flow.combatSnapshots.withdrawal,after:3},
  {name:'cp-d-restore',kind:'continue',snapshot:flow.checkpoints.cp_m01_d_retirada,restart:true,after:.25},
  {name:'outro-card',kind:'continue',snapshot:flow.outro,after:1.2},
  {name:'outro-dialogue',kind:'continue',snapshot:flow.outro,after:6.4},
].filter(s=>!ONLY||ONLY.includes(s.name));

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',port,'--strictPort'],{stdio:'pipe'});
let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
const report={label,kind:'Production build, genuine route snapshots and real controls, frozen by real pause; not a human playtest or FPS measurement',viewports:VIEWPORTS.map(v=>v.join('x')),shots:[]};
let browser;
try{
  for(let i=0;i<150;i++){try{if((await fetch(`http://127.0.0.1:${port}/COD-guerra/`)).ok)break;}catch{}if(server.exitCode!==null)throw Error(serverLog);await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const scene of scenes){
    const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    if(scene.snapshot)await page.addInitScript(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:KEY,s:scene.snapshot});
    await page.goto(`http://127.0.0.1:${port}/COD-guerra/?debug=1`);
    await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
    await page.locator(scene.kind==='new'?'#start':'#continue').click();
    await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
    await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.active||window.gameDiagnostics().m01.scene,null,{timeout:120000}).catch(()=>{});
    if(scene.restart){
      await page.evaluate(()=>document.exitPointerLock());await page.locator('#restart-checkpoint').click();
      await page.waitForFunction(()=>!window.gameDiagnostics().paused,null,{timeout:120000});
    }
    if(scene.skip){await page.keyboard.press('Space');await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'),null,{timeout:120000});}
    if(scene.press)await page.keyboard.press(scene.press);
    const base=await page.evaluate(()=>window.gameDiagnostics().clock);
    const target=scene.at??base+scene.after;
    // Pausa real assim que o relógio do jogo atinge o instante pretendido.
    await page.waitForFunction(t=>{const d=window.gameDiagnostics();if(d.clock>=t){document.exitPointerLock();return true;}return false;},target,{timeout:180000,polling:'raf'});
    await page.waitForFunction(()=>window.gameDiagnostics().paused,null,{timeout:30000});
    const diag=await page.evaluate(()=>window.gameDiagnostics());
    for(const [width,height] of VIEWPORTS){
      await page.setViewportSize({width,height});await page.waitForTimeout(350);
      const path=`${label}-${scene.name}-${width}x${height}.png`;
      await page.screenshot({path:`${out}/${path}`,style:'#pause{visibility:hidden!important}',timeout:120000});
      const layout=await page.evaluate(()=>{
        const box=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);
          return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),visible:s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>.02&&r.width>0,text:e.textContent.trim().slice(0,90)};};
        return Object.fromEntries(['objective','objective-update','battle-clock','subtitle','message','interaction','health-wrap','ammo','checkpoint','title-card','fade'].map(id=>[id,box(id)]));
      });
      const overflow=await page.evaluate(()=>{const vw=innerWidth,vh=innerHeight;return [...document.querySelectorAll('#hud *')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);
        return r.width>0&&s.visibility!=='hidden'&&Number(s.opacity)>.02&&e.textContent.trim()&&(r.left<-1||r.right>vw+1||r.top<-1||r.bottom>vh+1);}).map(e=>e.id||e.className||e.tagName);});
      // Pares que não podem sobrepor-se quando ambos estão visíveis.
      const pairs=[['objective','objective-update'],['objective','battle-clock'],['interaction','subtitle'],['interaction','message'],['subtitle','ammo'],['subtitle','health-wrap'],['message','ammo'],['message','health-wrap'],['objective-update','interaction']];
      const overlaps=pairs.filter(([a,b])=>{const p=layout[a],q=layout[b];return p?.visible&&q?.visible&&p.h&&q.h&&p.x<q.x+q.w&&q.x<p.x+p.w&&p.y<q.y+q.h&&q.y<p.y+p.h;}).map(p=>p.join('×'));
      report.shots.push({scene:scene.name,viewport:`${width}x${height}`,path,clock:diag.clock,battleClock:diag.m01.battleClock,sceneId:diag.m01.scene,layout,overflow,overlaps});
      console.log(`${label} ${scene.name} ${width}x${height}${overflow.length?` overflow:${overflow.join(',')}`:''}${overlaps.length?` overlap:${overlaps.join(',')}`:''}`);
    }
    const after=await page.evaluate(()=>window.gameDiagnostics());
    if(after.clock!==diag.clock)throw Error(`relógio avançou durante a captura de ${scene.name}`);
    report.shots.filter(s=>s.scene===scene.name).forEach(s=>s.errors=errors);
    await context.close();
  }
}finally{await browser?.close();server.kill();await writeFile(`${out}/${label}-report.json`,JSON.stringify(report,null,2)+'\n');}
if(report.shots.some(s=>s.errors?.length))throw Error('Erros no browser: '+JSON.stringify(report.shots.filter(s=>s.errors?.length).map(s=>[s.scene,s.errors])));
