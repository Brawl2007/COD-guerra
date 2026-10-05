import {test,expect} from '@playwright/test';
import {driver,toRepair} from '../helpers/m01-route.js';

const key='cod-guerra:checkpoint:m01:v2';

function snapshotBeforeRealMG34(){
  const d=toRepair(driver()),{sim,walk,step,until}=d;
  walk(-115,27);walk(-28,28);step({crouch:true});
  until(()=>sim.active('hold_access'),500);
  let seen=d.events.length;
  for(let i=0;i<2400;i++){
    const before=sim.snapshot();
    step({crouch:true});
    const fresh=d.events.slice(seen);seen=d.events.length;
    if(fresh.some(e=>e.type==='enemy-fire'&&e.weapon==='mg34'))return before;
  }
  throw new Error('No real MG34 event found for focused audio fixture');
}
const combatSnapshot=snapshotBeforeRealMG34();

async function waitMenu(page){
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeVisible();
}
async function startSaved(page){
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game'&&window.gameDiagnostics().audio.state==='running',null,{timeout:30000});
  await page.waitForFunction(()=>window.gameDiagnostics().audio.loops.includes('wind'),null,{timeout:30000});
}
async function pause(page){
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible({timeout:30000});
  await page.waitForFunction(()=>window.gameDiagnostics().paused&&window.gameDiagnostics().audio.state==='suspended',null,{timeout:30000});
}
const count=(d,name)=>d.audio.eventCounts[name]??0;

test('M01 battlefield audio follows real rifle/MG/impact/blast events and survives pause checkpoint reload without duplicate loops',async({page},info)=>{
  test.setTimeout(process.env.CI?300000:180000);
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:combatSnapshot});
  await page.goto('?debug=1');await waitMenu(page);await startSaved(page);

  const initial=await page.evaluate(()=>window.gameDiagnostics());
  expect(initial.audio.maxVoices).toBe(32);expect(initial.audio.loops).toContain('wind');expect(initial.audio.activeVoices).toBeLessThanOrEqual(32);

  // Real MG34 event: the fixture is the immediately preceding authoritative simulation snapshot.
  await page.waitForFunction(()=>((window.gameDiagnostics().audio.eventCounts.mg34??0)>0),null,{timeout:20000});
  const afterMG=await page.evaluate(()=>window.gameDiagnostics());
  expect(count(afterMG,'mg34')).toBeGreaterThan(0);

  // Player rifle and material impact through normal controls; look down so the shot meets nearby world geometry.
  await page.evaluate(()=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:260,bubbles:true})));
  await page.waitForFunction(()=>window.gameDiagnostics().player.pitch<-.25);
  const beforeShot=await page.evaluate(()=>window.gameDiagnostics());
  await page.mouse.click(640,360);
  await page.waitForFunction(before=>((window.gameDiagnostics().audio.eventCounts['wz29-shot']??0)>before),count(beforeShot,'wz29-shot'),{timeout:15000});
  await page.waitForFunction(before=>((window.gameDiagnostics().audio.eventCounts.impact??0)>before),count(beforeShot,'impact'),{timeout:15000});

  // A real grenade supplies an authoritative small blast after its existing fuse expires.
  // Observe simulation time rather than assuming wall-clock pace under the combined renderer load.
  const beforeBlast=await page.evaluate(()=>window.gameDiagnostics()),beforeAmmo=beforeBlast.m01.grenades.ammo;
  await page.keyboard.press('KeyG');
  await page.waitForFunction(ammo=>{
    const g=window.gameDiagnostics();return g.m01.grenades.ammo===ammo-1&&g.m01.grenades.active.length===1;
  },beforeAmmo,{timeout:10000});
  const thrown=await page.evaluate(()=>window.gameDiagnostics());
  expect(thrown.m01.grenades.active[0].fuse).toBeGreaterThan(0);expect(thrown.m01.grenades.active[0].fuse).toBeLessThanOrEqual(4);
  await page.waitForFunction(({before,start})=>{
    const g=window.gameDiagnostics(),authority=g.m01.damage.some(d=>d.id?.startsWith('m01_grenade_'));
    return g.clock>=start+4&&authority&&(g.audio.eventCounts.explosion??0)>before;
  },{before:count(beforeBlast,'explosion'),start:beforeBlast.clock},{timeout:process.env.CI?120000:30000});
  const afterBlast=await page.evaluate(()=>window.gameDiagnostics()),grenadeDamage=afterBlast.m01.damage.find(d=>d.id?.startsWith('m01_grenade_'));
  expect(grenadeDamage).toBeTruthy();expect(afterBlast.m01.grenades.active).toEqual([]);
  await info.attach('grenade-audio-proof',{body:JSON.stringify({before:{clock:beforeBlast.clock,ammo:beforeAmmo},thrown:{clock:thrown.clock,grenades:thrown.m01.grenades},after:{clock:afterBlast.clock,grenades:afterBlast.m01.grenades,damage:grenadeDamage,explosions:count(afterBlast,'explosion')}}),contentType:'application/json'});

  // Presentation-only distant battlefield activity uses its own deterministic scheduling domain.
  await page.waitForFunction(()=>((window.gameDiagnostics().audio.eventCounts['distant-battle']??0)>0),null,{timeout:30000});

  await pause(page);const paused=await page.evaluate(()=>window.gameDiagnostics());
  const pausedLoops=[...paused.audio.loops];expect(new Set(pausedLoops).size).toBe(pausedLoops.length);expect(paused.audio.activeVoices).toBeLessThanOrEqual(32);
  await page.locator('#resume').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().audio.state==='running'&&window.gameDiagnostics().audio.loops.includes('wind'),null,{timeout:30000});
  const resumed=await page.evaluate(()=>window.gameDiagnostics());
  expect(new Set(resumed.audio.loops).size).toBe(resumed.audio.loops.length);expect(resumed.audio.loops.filter(x=>x==='wind')).toHaveLength(1);

  await pause(page);await page.locator('#restart-checkpoint').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().audio.state==='running'&&window.gameDiagnostics().audio.loops.includes('wind'),null,{timeout:30000});
  const checkpoint=await page.evaluate(()=>window.gameDiagnostics());
  expect(new Set(checkpoint.audio.loops).size).toBe(checkpoint.audio.loops.length);expect(checkpoint.audio.activeVoices).toBeLessThanOrEqual(32);

  await pause(page);await page.reload();await waitMenu(page);await startSaved(page);
  const reloaded=await page.evaluate(()=>window.gameDiagnostics());
  expect(new Set(reloaded.audio.loops).size).toBe(reloaded.audio.loops.length);expect(reloaded.audio.loops.filter(x=>x==='wind')).toHaveLength(1);
  expect(reloaded.audio.activeVoices).toBeLessThanOrEqual(32);expect(pageErrors).toEqual([]);

  await info.attach('m01-audio-runtime-diagnostics.json',{body:JSON.stringify({initial,afterMG,paused,resumed,checkpoint,reloaded},null,2),contentType:'application/json'});
});
