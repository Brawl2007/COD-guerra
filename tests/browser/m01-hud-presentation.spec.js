import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';

// Apresentação do HUD de M01: cena real da introdução, controlos reais e snapshot alcançado pela rota da simulação.
// Verifica apresentação e contratos de texto; não é playtest humano nem medição de desempenho.
const key='cod-guerra:checkpoint:m01:v2';
async function open(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await expect(page.locator('#start')).toBeEnabled();return errors;
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
  // O aviso fica por cima das faixas e do fade: o ponto central do texto pertence ao próprio #interaction.
  expect(await page.evaluate(()=>{const r=document.querySelector('#interaction .interaction-action').getBoundingClientRect();
    return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#interaction')!==null;})).toBe(true);
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
  const route=driver();route.step({skip:true});route.walk(-66,26);route.walk(-15,26);route.walk(-15,2);route.walk(16,2);
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
