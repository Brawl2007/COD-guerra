import {test,expect} from '@playwright/test';
import {driver,route} from '../helpers/m01-route.js';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {newBarkState} from '../../src/game/m01-barks.js';

// Apresentação do HUD de M01: cena real da introdução, controlos reais e snapshot alcançado pela rota da simulação.
// Verifica apresentação e contratos de texto; não é playtest humano nem medição de desempenho.
const key='cod-guerra:checkpoint:m01:v2';
async function open(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await expect(page.locator('#start')).toBeEnabled({timeout:60000});return errors;
}
const hud=page=>page.evaluate(()=>window.gameDiagnostics().m01.hudPresentation);
const opacity=(page,id)=>page.evaluate(id=>Number(getComputedStyle(document.getElementById(id)).opacity),id);
async function pauseAt(page,clock){
  await page.waitForFunction(t=>{if(window.gameDiagnostics().clock>=t){document.exitPointerLock();return true;}return false;},clock,{polling:'raf',timeout:120000});
  await expect(page.locator('#pause')).toBeVisible();
}
function boxesOverlap(a,b){return a&&b&&a.w&&b.w&&a.h&&b.h&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;}

test('the intro is presented as black screen, typed title card and letterbox; skipping reveals the objective and checkpoint',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  const errors=await open(page);await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  await pauseAt(page,5.5);
  let h=await hud(page);expect(h.cinematic).toBe(true);expect(h.fade).toBe(1);expect(h.titleCard).toMatch(/^place\|TCZEW, POLÓNIA/);
  await expect(page.locator('#hud')).toHaveClass(/cinematic/);await expect(page.locator('#title-card')).toContainText('1 de setembro de 1939');
  expect(await opacity(page,'objective')).toBe(0);
  // A pausa congela a cartela: nenhum valor de apresentação muda sem o relógio da simulação.
  await page.waitForTimeout(400);expect(await hud(page)).toEqual(h);
  await page.screenshot({path:info.outputPath('m01-hud-intro-card.png'),style:'#pause{visibility:hidden!important}'});
  await page.locator('#resume').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
  await expect(page.locator('#interaction kbd')).toHaveText('Espaço');await expect(page.locator('#interaction')).toHaveText('Espaço · saltar cena');
  // O aviso fica por cima das faixas e do fade: no centro do texto, o primeiro elemento visível empilhado é o próprio #interaction.
  // O HUD não recebe rato (pointer-events:none); o teste activa-o só durante a medição e ignora camadas transparentes.
  expect(await page.evaluate(()=>{
    const style=document.createElement('style');style.textContent='#hud,#hud *{pointer-events:auto!important}';document.head.append(style);
    const r=document.querySelector('#interaction .interaction-action').getBoundingClientRect();
    const alpha=e=>{let a=1;for(let n=e;n&&n!==document.documentElement;n=n.parentElement){const c=getComputedStyle(n);if(c.visibility==='hidden'||c.display==='none')return 0;a*=Number(c.opacity);}return a;};
    const top=document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).find(e=>alpha(e)>.05);style.remove();
    return Boolean(top?.closest('#interaction'));})).toBe(true);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'));
  const skipped=await page.evaluate(()=>window.gameDiagnostics().clock);await pauseAt(page,skipped+.8);
  h=await hud(page);expect(h.cinematic).toBe(false);expect(h.fade).toBe(0);expect(h.banner).toEqual({kind:'new',id:'obj_m01_deliver_message'});
  expect(h.checkpoint).toBeGreaterThan(.9);
  await expect(page.locator('#objective-update')).toContainText('Leve a mensagem e o café ao posto da ponte');
  await expect(page.locator('#checkpoint-name')).toHaveText('CP-A · Orientação');
  const d=await page.evaluate(()=>window.gameDiagnostics());
  expect(await page.locator('#objective-text').textContent()).toBe('Leve a mensagem e o café ao posto da ponte');
  expect(await page.locator('#objective-status').textContent()).toBe(d.m01.threat.status);
  await expect(page.locator('#weapon-state')).toContainText(`${d.m01.weapon.sight} m`);await expect(page.locator('#rounds i:not(.spent)')).toHaveCount(5);
  await page.screenshot({path:info.outputPath('m01-hud-cp-a.png'),style:'#pause{visibility:hidden!important}'});
  expect(errors).toEqual([]);
});

test('a continued save shows the place card and keyed interaction prompt; HUD fits common resolutions without overlap',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);
  // 2026-10-18 (integration integ-pc): the player body physics (D44) made the old waypoint x -15 run into a solid on the way to (-15,2); this is the detour of
  // tests/helpers/m01-route.js (toRepair), which the Node routes already use. Only the path to the post changed, not what the test asserts.
  const route=driver();route.step({skip:true});route.walk(-66,26);route.walk(-30,26);route.walk(-30,2);route.walk(16,2);
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:route.sim.snapshot()});
  const errors=await open(page);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  const start=await page.evaluate(()=>window.gameDiagnostics().clock);await pauseAt(page,start+1.6);
  const h=await hud(page);expect(h.resumeCard).toMatch(/^resume\|Tczew — pontes do Vístula\|1 de setembro de 1939 · 04:3\d\|CP-A · Orientação$/);
  await expect(page.locator('#interaction kbd')).toHaveText('E');await expect(page.locator('#interaction')).toHaveText('E · entregar mensagem e café');
  await expect(page.locator('#pause-objective')).toHaveText('Objectivo: Leve a mensagem e o café ao posto da ponte');
  for(const [width,height] of [[1280,720],[1366,768],[1920,1080],[1024,600],[800,600]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(250);
    const boxes=await page.evaluate(()=>Object.fromEntries(['objective','clock-wrap','objective-update','interaction','captions','health-wrap','ammo','resume-card'].map(id=>{
      const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,w:r.width,h:r.height}];})));
    for(const [id,b] of Object.entries(boxes))if(b.w){
      expect(b.x,`${id} @${width}x${height}`).toBeGreaterThanOrEqual(0);expect(b.y,`${id} @${width}x${height}`).toBeGreaterThanOrEqual(0);
      expect(b.x+b.w,`${id} @${width}x${height}`).toBeLessThanOrEqual(width+.5);expect(b.y+b.h,`${id} @${width}x${height}`).toBeLessThanOrEqual(height+.5);
    }
    for(const [a,b] of [['objective','clock-wrap'],['objective','objective-update'],['interaction','captions'],['captions','health-wrap'],['captions','ammo'],['resume-card','health-wrap'],['health-wrap','ammo']])
      expect(boxesOverlap(boxes[a],boxes[b]),`${a} × ${b} @${width}x${height}`).toBeFalsy();
    await page.screenshot({path:info.outputPath(`m01-hud-continue-${width}x${height}.png`),style:'#pause{visibility:hidden!important}'});
  }
  expect(errors).toEqual([]);
});

// Reactive dialogue (src/game/m01-barks.js): the subtitles of a real run reach the page with the speaker's name, 118 and 119 are two different voices, and the caption block
// does not touch the rest of the HUD at 1366x768. The save is made by the Node pilot: the golden control route up to the east demolition, then a quiet minute (the director's ledger
// cleared: at this point the route has just spoken five lines and a priority-3 remark has to wait for the budget) with the player standing by the ckm crew as it retreats along the
// embankment, stopped one tick before the second man asks the way (118). It proves the page shows what the simulation says; not a playtest.
function crewSave(){
  const sim=new M01Simulation();
  sim.restoreSnapshot(route(19390901).combatSnapshots.eastDemolitionOutside);sim.drainEvents();
  sim.timers.barks=newBarkState();sim.subtitle=null;sim.dialogueQueue=[];
  for(let i=0;i<400;i++){
    const crew=sim.actor('ckm_reserve'),x=crew.x+6;
    Object.assign(sim.player,{x,z:crew.z,y:sim.world.heightAt(x,crew.z)});
    const before=sim.snapshot();sim.tick(.05,{});
    if(sim.dialogueConsumed.includes('dlg_m01_118#1'))return before;
  }
  throw new Error('the crew never asked the way');
}
test('reactive dialogue: the subtitles render with their speaker, 118 and 119 show two different names, and the captions overlap nothing at 1366x768',async({page},info)=>{
  test.setTimeout(process.env.CI?300000:200000);
  const snapshot=crewSave();
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  const errors=await open(page);
  await page.setViewportSize({width:1366,height:768});
  // every subtitle that appears, in order (speaker and text as the page shows them)
  await page.evaluate(()=>{window.__subtitles=[];const node=document.getElementById('subtitle');
    new MutationObserver(()=>{const speaker=node.querySelector('.subtitle-speaker')?.textContent??'',text=node.querySelector('.subtitle-text')?.textContent.trim()??'';
      if(speaker&&window.__subtitles.at(-1)?.text!==text)window.__subtitles.push({speaker,text});}).observe(node,{childList:true,subtree:true,characterData:true});});
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  // pause on the frame that shows the second voice, so that the page is measured with the subtitle on it
  await page.waitForFunction(()=>{const node=document.getElementById('subtitle');
    if(node.classList.contains('show')&&node.textContent.includes('De lá também atira')){document.exitPointerLock();return true;}return false;},null,{polling:'raf',timeout:150000});
  await expect(page.locator('#pause')).toBeVisible();
  const heard=await page.evaluate(()=>window.__subtitles);
  const first=heard.find(l=>l.text.includes('Cabo, pelo aterro para oeste?')),second=heard.find(l=>l.text.includes('Pelo aterro. De lá também atira.'));
  expect(first,JSON.stringify(heard)).toBeTruthy();expect(second).toBeTruthy();
  expect(first.speaker).toBe('Soldado da ckm:');expect(second.speaker).toBe('Atirador da ckm:');
  expect(first.speaker).not.toBe(second.speaker);
  expect(heard.indexOf(second)).toBeGreaterThan(heard.indexOf(first));
  await expect(page.locator('#subtitle .subtitle-speaker')).toHaveText('Atirador da ckm:');
  // the caption block fits the window and touches nothing else of the HUD
  const ids=['subtitle','message','captions','objective','clock-wrap','objective-update','interaction','health-wrap','ammo','crosshair'];
  const boxes=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>{const r=document.getElementById(id)?.getBoundingClientRect();return [id,r?{x:r.x,y:r.y,w:r.width,h:r.height}:null];})),ids);
  expect(boxes.subtitle.w,'the subtitle has a box').toBeGreaterThan(0);
  for(const id of ['subtitle','captions','health-wrap','ammo'])if(boxes[id]?.w){
    expect(boxes[id].x,id).toBeGreaterThanOrEqual(0);expect(boxes[id].y,id).toBeGreaterThanOrEqual(0);
    expect(boxes[id].x+boxes[id].w,id).toBeLessThanOrEqual(1366.5);expect(boxes[id].y+boxes[id].h,id).toBeLessThanOrEqual(768.5);
  }
  for(const other of ['objective','clock-wrap','objective-update','interaction','health-wrap','ammo','crosshair'])
    expect(boxesOverlap(boxes.subtitle,boxes[other]),`subtitle x ${other} @1366x768`).toBeFalsy();
  expect(boxesOverlap(boxes.captions,boxes['health-wrap'])).toBeFalsy();expect(boxesOverlap(boxes.captions,boxes.ammo)).toBeFalsy();
  await page.screenshot({path:info.outputPath('m01-hud-dialogue-1366x768.png'),style:'#pause{visibility:hidden!important}'});
  expect(errors).toEqual([]);
});
