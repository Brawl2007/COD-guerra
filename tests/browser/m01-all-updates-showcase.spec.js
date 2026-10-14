import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {driver,toRepair,toStationEvacuation,toCoverAdjustment,route} from '../helpers/m01-route.js';

// EVIDÊNCIA DE VÍDEO. Cada imagem é Chromium + renderizador Three.js reais.
// Os cenários de vários tempos usam saves obtidos por comandos reais da simulação,
// não estados inventados. O catálogo de soldados é uma inspeção técnica separada.
test.use({video:'on'});
const SAVE='cod-guerra:checkpoint:m01:v2';
let vite=null;
test.beforeAll(async()=>{
 vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5189','--strictPort'],{stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Vite de inspeção técnica indisponível')),30000);
  vite.stdout.on('data',b=>{if(b.toString().includes('5189')){clearTimeout(timer);resolve();}});
  vite.on('exit',c=>{clearTimeout(timer);reject(Error('Vite saiu: '+c));});
 });
});
test.afterAll(()=>vite?.kill());
async function label(page,title,sub=''){
 await page.evaluate(({title,sub})=>{
  let el=document.getElementById('showcase-credit');
  if(!el){el=document.createElement('div');el.id='showcase-credit';Object.assign(el.style,{
   position:'fixed',top:'96px',right:'20px',zIndex:'99999',background:'rgba(8,18,20,.82)',border:'1px solid #bad3b2',
   borderRadius:'8px',padding:'15px 19px',color:'#f4f1e9',font:'bold 21px system-ui',maxWidth:'420px',
   pointerEvents:'none',boxShadow:'0 2px 15px #0006'
  });document.body.append(el);}
  el.textContent=title;
  if(sub){const small=document.createElement('div');small.textContent=sub;Object.assign(small.style,{
   font:'14px system-ui',color:'#d2e8cf',marginTop:'4px'
  });el.append(small);}
 },{title,sub});
}
async function scene(page,info,{name,snapshot,title,subtitle,ms=2500,aimId=null}){
 if(snapshot){
  await page.evaluate(({key,payload})=>localStorage.setItem(key,JSON.stringify(payload)),
   {key:SAVE,payload:snapshot});
  await page.reload();
 }else await page.goto('?debug=1');
 await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models?.length===9,null,{timeout:60000});
 await expect(page.locator('#error')).toBeHidden();
 const button=snapshot?'#continue':'#start';
 await page.locator(button).click();
 await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>.1,null,{timeout:60000});
 if(!snapshot){await page.keyboard.press('Space');}
 if(aimId){
  const a=await page.evaluate(id=>{
   const diag=window.gameDiagnostics();return {
    player:diag.player,target:diag.m01.animationPresentation?.actors?.find(a=>a.id===id)??null
   };
  },aimId);
  if(a.target?.x!=null&&a.target?.z!=null){
   await page.evaluate(({x,z})=>{
    const p=window.gameDiagnostics().player,angle=Math.atan2(z-p.z,x-p.x);
    const delta=Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle));
    window.dispatchEvent(new MouseEvent('mousemove',{movementX:delta/.0022,movementY:0,bubbles:true}));
   },a.target);
  }
 }
 await label(page,title,subtitle);
 await page.waitForTimeout(ms);
 const status=await page.evaluate(()=>{const d=window.gameDiagnostics();return {
  clock:d.clock,mission:d.missionId,models:d.m01.models.length,
  actorCount:d.m01.characters.active,aircraft:d.m01.aircraft?.planes?.length,
  graphics:d.quality,scene:d.m01.scene?.id??null,weapon:d.m01.weapon?.state
 }});
 await page.screenshot({path:info.outputPath(name)});
 return status;
}
test('COD-guerra V7 + Argon: vídeo panorâmico das atualizações realmente aplicadas',async({page},info)=>{
 test.setTimeout(process.env.CI?900000:720000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const samples=[];
 // 1: Boot + mission opening.
 samples.push({scene:'Missão M01 / ambiente, ponte, rifle e HUD',...(await scene(page,info,{
  name:'01-abertura-m01-ponte-hud-armas.png',title:'01 · M01 TCZEW · PONTE & HUD',
  subtitle:'Cenário 3D, terreno, objetivos, arma em primeira pessoa',ms:3500
 }))});
 // 2: historic first air raid from the real event clock.
 const raid=driver();raid.step({skip:true});
 raid.until(()=>raid.sim.renderState.stukas,200);
 samples.push({scene:'Ju 87 e efeitos aéreos',...(await scene(page,info,{
  name:'02-ju87-batalha-real.png',snapshot:raid.sim.snapshot(),title:'02 · AVIÕES JU 87 & BATALHA',
  subtitle:'Eventos da simulação real, LODs, áudio e efeitos',ms:4300
 }))});
 // 3: players reach the sappers through real controls.
 const repair=toRepair(driver());
 samples.push({scene:'sappers, ponte e aliados',...(await scene(page,info,{
  name:'03-engenheiros-ponte-reparacao.png',snapshot:repair.sim.snapshot(),
  title:'03 · ENGENHEIROS & PONTE',
  subtitle:'Militares, objetivos, material e reparação na campanha',ms:3900
 }))});
 // 4: cover and artillery situation during the actual control route.
 const cover=toCoverAdjustment();
 samples.push({scene:'combat FX cover, suppression',...(await scene(page,info,{
  name:'04-cobertura-combate-explosoes.png',snapshot:cover.sim.snapshot(),
  title:'04 · COMBATE & EFEITOS',
  subtitle:'Supressão, tiros, cobertura e efeitos de batalha',ms:4000
 }))});
 // 5: genuine station evacuation.
 const station=toStationEvacuation(driver(),{observe:true,phase:'drag'});
 samples.push({scene:'station evacuation, medic and casualty',...(await scene(page,info,{
  name:'05-estacao-feridos-arrasto.png',snapshot:station.sim.snapshot(),
  title:'05 · ESTAÇÃO & EVACUAÇÃO',
  subtitle:'Edifícios, médico e ferido — simulação da missão',ms:3500
 }))});
 // 6: a real later mission stage (not a fabricated scene).
 const completed=route();
 const east=completed.combatSnapshots.eastDemolitionOutside??completed.combatSnapshots.eastDemolition;
 if(east){samples.push({scene:'post-demolition bridge',...(await scene(page,info,{
  name:'06-demolicao-pontes-trem.png',snapshot:east,
  title:'06 · DEMOLIÇÃO & FERROVIA',
  subtitle:'Ponte, vagões, danos e continuidade da missão',ms:4000
 }))});}
 // 7-9: Separate TECHNICAL lineup using M01Characters and actual GLBs.
 await page.goto('http://127.0.0.1:5189/COD-guerra/tools/verification/m01-argon-animation-showcase.html');
 await page.waitForFunction(()=>window.ready===true&&window.showcase?.diagnostics()?.renderedModels>=9,null,{timeout:120000});
 const motion=async(mode,title,sub,img,ms)=>{
  await page.evaluate(x=>window.showcase.setMode(x),mode);
  await label(page,title,sub);
  await page.waitForTimeout(ms);
  const diag=await page.evaluate(()=>window.showcase.diagnostics());
  await page.screenshot({path:info.outputPath(img)});
  samples.push({scene:mode,stage:'technical camera with real GLBs',clips:diag.actors.map(a=>a.clip),
    loaded:diag.availableClips,models:diag.renderedModels});
 };
 await motion('platoon','07 · ANIMAÇÕES DOS SOLDADOS','Inspeção técnica com GLBs reais — walk · run · sprint · crouch',
   '07-soldados-caminhada-corrida-sprint.png',4800);
 await motion('reactions','08 · REAÇÕES E ROTAÇÕES','Inspeção técnica — hit_front · near_miss_duck · turn_left/right',
   '08-soldados-hit-duck-turn.png',3600);
 await motion('closeup','09 · SOLDADOS 3D EM DETALHE','Inspeção técnica — armas, uniformes, rig e movimentos',
   '09-soldados-closeup.png',5000);
 await info.attach('cod-guerra-M01-full-video-evidence',{
  body:JSON.stringify({scope:'M01 V7 plus PR #62',scenes:samples,errors,
    limitations:'Test route snapshots = real simulation controls; lineup = separate technical inspection; does not certify every task or performance on Chromebook'},
    null,2),contentType:'application/json'});
 expect(errors).toEqual([]);
 expect(samples.length).toBeGreaterThanOrEqual(8);
});
