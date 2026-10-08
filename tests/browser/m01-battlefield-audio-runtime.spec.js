import {test,expect} from '@playwright/test';
import {driver,toRepair,route} from '../helpers/m01-route.js';

// Jogo real (build de produção, AudioContext do Chromium): estados guardados pela própria simulação,
// sem injecção de eventos. Prova que o áudio de campo de batalha corre no runtime; não é um playtest de escuta.
const key='cod-guerra:checkpoint:m01:v2';
function snapshotBeforeRealMG34(){
  const d=toRepair(driver()),{sim,walk,step,until}=d;
  walk(-115,27);walk(-28,28);step({crouch:true});until(()=>sim.active('hold_access'),500);
  let seen=d.events.length;
  for(let i=0;i<2400;i++){const before=sim.snapshot();step({crouch:true});const fresh=d.events.slice(seen);seen=d.events.length;
    if(fresh.some(e=>e.type==='enemy-fire'&&e.weapon==='mg34'))return before;}
  throw new Error('No real MG34 event found');
}
let combat,demolition;
test.beforeAll(()=>{combat=snapshotBeforeRealMG34();demolition=route(19390901,{support:true}).combatSnapshots.eastDemolition;});

async function startFrom(page,snapshot){
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().audio.state==='running'&&window.gameDiagnostics().audio.loops.includes('wind'),null,{timeout:30000});
}
const limitsHold=d=>Object.entries(d.audio.categories).every(([c,n])=>n<=d.audio.categoryLimits[c])&&d.audio.activeVoices<=d.audio.maxVoices&&d.audio.peakVoices<=d.audio.maxVoices;

test('live M01 combat: real MG34 fire raises intensity; front bed, reverb, buses and limits are live',async({page},info)=>{
  test.setTimeout(process.env.CI?300000:200000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await startFrom(page,combat);
  const initial=await page.evaluate(()=>window.gameDiagnostics().audio);
  expect(initial.reverb).toBe(true);expect(initial.compressor).toBe(true);expect(initial.maxVoices).toBe(32);
  expect(initial.loops).toEqual(expect.arrayContaining(['wind','battle-bed']));
  await page.waitForFunction(()=>(window.gameDiagnostics().audio.eventCounts.mg34??0)>1,null,{timeout:30000});
  await page.waitForFunction(()=>window.gameDiagnostics().audio.intensity>0,null,{timeout:30000});
  await page.waitForFunction(()=>(window.gameDiagnostics().audio.eventCounts['distant-battle']??0)>0,null,{timeout:60000});
  const live=await page.evaluate(()=>window.gameDiagnostics());
  expect(limitsHold(live)).toBe(true);expect(new Set(live.audio.loops).size).toBe(live.audio.loops.length);
  expect(live.audio.liveSources).toBeLessThanOrEqual(live.audio.sourceBudget+80);expect(live.audio.quality).toBe('low');
  // A simulação continua a autoridade: o áudio só lê eventos já emitidos (fila pendente = tiros alemães em voo sonoro).
  expect(live.m01.pendingAudio.every(s=>['fire','blast'].includes(s.kind))).toBe(true);
  await info.attach('live-combat-audio.json',{body:JSON.stringify({initial,live:live.audio},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);
});

test('live M01 east demolition: one authoritative blast becomes the layered bridge demolition with metal stress',async({page},info)=>{
  test.setTimeout(process.env.CI?300000:200000);
  expect(demolition).toBeTruthy();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await startFrom(page,demolition);
  await page.waitForFunction(()=>(window.gameDiagnostics().audio.eventCounts['bridge-demolition']??0)>0,null,{timeout:60000});
  const after=await page.evaluate(()=>window.gameDiagnostics());
  expect(after.audio.eventCounts['bridge-demolition']).toBe(1);expect(after.audio.eventCounts['metal-stress']).toBeGreaterThanOrEqual(1);
  expect(after.m01.damage.some(d=>d.id==='east_demolition')).toBe(true);
  expect(after.audio.loops).toEqual(expect.arrayContaining(['locomotive']));
  expect(limitsHold(after)).toBe(true);
  await info.attach('live-demolition-audio.json',{body:JSON.stringify(after.audio,null,2),contentType:'application/json'});
  expect(errors).toEqual([]);
});
