import {test,expect} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';

// H9 D5: menu selector, pause line and HUD badge in the real page. The UI only passes the level; the simulation owns it.
// Verifies presentation and wiring; not a playtest of the difficulty tuning.
const key='cod-guerra:checkpoint:m01:v2';
async function open(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await expect(page.locator('#start')).toBeEnabled({timeout:60000});return errors;
}
const level=page=>page.evaluate(()=>window.gameDiagnostics().difficulty);
async function begin(page){
  await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
}
async function pause(page){await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();}

test('a new game defaults to soldado, shows it in Portuguese, and the chosen level reaches the simulation',async({page})=>{
  test.setTimeout(process.env.CI?180000:90000);
  await page.addInitScript(k=>localStorage.removeItem(k),key);
  const errors=await open(page);
  await expect(page.locator('#difficulty')).toHaveValue('soldado');
  expect(await page.locator('#difficulty option').allTextContents()).toEqual(['Recruta','Soldado','Veterano']);
  await begin(page);expect(await level(page)).toBe('soldado');
  await expect(page.locator('#difficulty-badge')).toHaveText('SOLDADO');
  await pause(page);await expect(page.locator('#pause-difficulty')).toHaveText('Dificuldade: Soldado');
  await page.locator('#back-menu').click();await expect(page.locator('#menu')).toBeVisible();
  await page.locator('#difficulty').selectOption('veterano');
  await begin(page);expect(await level(page)).toBe('veterano');
  await expect(page.locator('#difficulty-badge')).toHaveText('VETERANO');
  await pause(page);await expect(page.locator('#pause-difficulty')).toHaveText('Dificuldade: Veterano');
  await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused);expect(await level(page)).toBe('veterano');
  await pause(page);await page.locator('#back-menu').click();
  await page.locator('#difficulty').selectOption('recruta');
  await begin(page);expect(await level(page)).toBe('recruta');
  await pause(page);await expect(page.locator('#pause-difficulty')).toHaveText('Dificuldade: Recruta');
  expect(errors).toEqual([]);
});

test('continuing a checkpoint keeps the difficulty of the save, whatever the selector says',async({page})=>{
  test.setTimeout(process.env.CI?180000:90000);
  const save=JSON.stringify(new M01Simulation(undefined,{difficulty:'veterano'}).snapshot());
  await page.addInitScript(([k,v])=>localStorage.setItem(k,v),[key,save]);
  const errors=await open(page);
  await page.locator('#difficulty').selectOption('recruta');
  await expect(page.locator('#continue')).toBeVisible();await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  expect(await level(page)).toBe('veterano');await expect(page.locator('#difficulty-badge')).toHaveText('VETERANO');
  await pause(page);await expect(page.locator('#pause-difficulty')).toHaveText('Dificuldade: Veterano');
  expect(errors).toEqual([]);
});

// H9 D5 (2026-10-22): the death beat, the level on the checkpoint card and the "continuar em nível mais baixo" offer, in the real page. The simulation decides the death and the
// re-levelling; the page only presents them. A save whose own checkpoint holds the player in a lethal fall (13 m at 30 m/s) kills him on the first tick after every restore,
// which gives three deaths at one checkpoint in about ten seconds without any aiming. Verifies presentation and wiring; not a playtest.
function lethalFallSave(difficulty){
  const sim=new M01Simulation(undefined,{difficulty});sim.tick(.05,{skip:true});   // out of the intro: CP-A saved
  const s=sim.snapshot(false);s.player.y+=13;s.player.fall={vy:-30,vx:0,vz:0,startY:s.player.y,t:1};
  return JSON.stringify(s);
}
const diag=page=>page.evaluate(()=>window.gameDiagnostics());

test('the checkpoint card shows the level of the game',async({page})=>{
  test.setTimeout(process.env.CI?180000:90000);
  await page.addInitScript(k=>localStorage.removeItem(k),key);
  const errors=await open(page);
  await page.locator('#difficulty').selectOption('veterano');
  await begin(page);await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.checkpoints.includes('cp_m01_a_orientacao'));
  await expect(page.locator('#checkpoint-name')).toHaveText('CP-A · Orientação · Veterano');
  expect(errors).toEqual([]);
});

test('a death shows the beat with its cause, does not tick the simulation while it runs, and the third death at one checkpoint offers the lower level',async({page})=>{
  test.setTimeout(process.env.CI?300000:150000);
  await page.addInitScript(([k,v])=>localStorage.setItem(k,v),[key,lethalFallSave('soldado')]);
  const errors=await open(page);
  // The page samples itself every 50 ms from the click on (software GL can be slow to render a frame: nothing here depends on how many frames a second the beat gets).
  await page.evaluate(()=>{window.__samples=[];setInterval(()=>{const g=window.gameDiagnostics();window.__samples.push({clock:g.clock,age:g.death.beat?.age??null,deaths:g.death.beat?.deaths??null,
    text:document.querySelector('#death-cause').textContent,note:document.querySelector('#death-note').textContent,black:Number(getComputedStyle(document.querySelector('#death-beat')).opacity),
    health:g.player.health,paused:g.paused,offer:g.death.offer});},50);});
  await page.locator('#continue').click();
  await page.waitForFunction(()=>window.gameDiagnostics().death.offer!==null,null,{timeout:240000});   // the third death at CP-A: the beat ended and the offer is up
  const offer=await diag(page),samples=await page.evaluate(()=>window.__samples);
  expect(offer.death.offer).toMatchObject({to:'recruta',deaths:3,checkpoint:'cp_m01_a_orientacao',card:'CP-A · Orientação · Soldado'});expect(offer.paused).toBe(true);
  // during each of the three beats: the cause and the card are on the screen, the screen goes black, the player is dead, and the simulation clock does not move at all
  for(const n of [1,2,3]){
    const beat=samples.filter(x=>x.deaths===n&&x.age!==null);
    expect(beat.length,`beat ${n}: sampled`).toBeGreaterThan(3);
    expect(new Set(beat.map(x=>x.clock)).size,`beat ${n}: the clock never moved`).toBe(1);
    expect(beat.every(x=>x.health===0)).toBe(true);expect(beat.every(x=>x.text==='Você caiu de uma altura fatal.'&&x.note==='A retomar em CP-A · Orientação · Soldado')).toBe(true);
    for(let i=1;i<beat.length;i++)expect(beat[i].age).toBeGreaterThanOrEqual(beat[i-1].age);
    expect(Math.max(...beat.map(x=>x.black)),`beat ${n}: black`).toBe(1);expect(Math.max(...beat.map(x=>x.age)),`beat ${n}: it runs to the end`).toBeGreaterThan(1.5);
  }
  await expect(page.locator('#death-offer')).toBeVisible();await expect(page.locator('#pause')).toBeHidden();
  await expect(page.locator('#death-offer-text')).toContainText('Caiu 3 vezes em CP-A · Orientação · Soldado');
  await expect(page.locator('#death-lower')).toHaveText('CONTINUAR EM NÍVEL MAIS BAIXO · RECRUTA');await expect(page.locator('#death-retry')).toHaveText('TENTAR DE NOVO · SOLDADO');
  await page.waitForTimeout(800);expect((await diag(page)).clock).toBe(offer.clock);   // waiting on the offer screen: nothing ticks
  // the lower level: the simulation re-levels the checkpoint; the save keeps it (recruta has no difficulty key); the game resumes
  await page.locator('#death-lower').click();
  await page.waitForFunction(()=>window.gameDiagnostics().difficulty==='recruta');
  await expect(page.locator('#death-offer')).toBeHidden();
  expect(await page.evaluate(k=>'difficulty' in JSON.parse(localStorage.getItem(k)),key)).toBe(false);
  await expect(page.locator('#difficulty-badge')).toHaveText('RECRUTA');
  expect(errors).toEqual([]);
});
