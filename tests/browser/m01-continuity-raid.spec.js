import {test,expect} from '@playwright/test';
import {driver,toRepair} from '../helpers/m01-route.js';
import {seconds} from '../../src/game/m01-simulation.js';

// Continuação de um estado atingido por controlos reais na simulação.
// Não é um playtest humano nem uma partida contínua no navegador.
const d=toRepair(driver());
d.walk(-115,27);d.walk(-28,28);d.step({crouch:true});
d.until(()=>d.sim.battleClock>=seconds('05:36:00'),500);
d.step({lookX:Math.atan2(Math.sin(Math.PI-d.sim.player.angle),Math.cos(Math.PI-d.sim.player.angle))/.0022});
const snapshot=d.sim.snapshot(false),key='cod-guerra:checkpoint:m01:v2';

test('raid das 05:30 mantém seis impactos e fumo após continuação às 05:36',async({page},info)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.addInitScript(({key,snapshot})=>{
    localStorage.setItem(key,JSON.stringify(snapshot));
    localStorage.setItem('cod-guerra:visual-quality','high');
  },{key,snapshot});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await page.locator('#quality').selectOption('high');
  await page.locator('#continue').click();
  await page.waitForFunction(()=>Boolean(document.pointerLockElement));
  const frame=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames);
  await page.waitForFunction(frame=>{
    const diag=window.gameDiagnostics();
    if(diag.m01.renderedFrames<=frame||diag.m01.smokePuffs<132)return false;
    document.exitPointerLock();return true;
  },frame);
  // Software WebGL can delay the asynchronous pointer-lock event; the mission
  // already stops ticking as soon as the browser releases control.
  await page.waitForFunction(()=>window.gameDiagnostics().paused,null,{timeout:60000});
  const before=await page.evaluate(()=>window.gameDiagnostics());
  const hits=before.m01.damage.filter(d=>/^raid_0530(?:_[1-5])?$/.test(d.id));
  expect(hits).toHaveLength(6);
  expect(new Set(hits.map(d=>d.id)).size).toBe(6);
  expect(before.m01.flags['m01.second_raid_state']).toBe('ended');
  expect(before.m01.smokePuffs).toBeGreaterThanOrEqual(132);
  expect(before.m01.smokePuffs).toBeLessThanOrEqual(256);
  await page.screenshot({path:info.outputPath('raid-0536.png'),style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000});
  const after=await page.evaluate(()=>window.gameDiagnostics());
  expect(after.clock).toBe(before.clock);
  expect(after.m01.damage).toEqual(before.m01.damage);
  expect(after.m01.smokePuffs).toBe(before.m01.smokePuffs);
  expect(errors).toEqual([]);
  await info.attach('raid-frame',{body:JSON.stringify({before,after,errors},null,2),contentType:'application/json'});
});
