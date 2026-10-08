import {test,expect} from '@playwright/test';
import {driver,toStationEvacuation} from '../helpers/m01-route.js';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {gameplaySnapshot} from '../helpers/m01-animation-contract.js';

const key='cod-guerra:checkpoint:m01:v2';
async function freezeClick(page,selector){
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);
  });
  await page.locator(selector).click();await expect(page.locator('#pause')).toBeVisible();
}
async function open(page,snapshot){
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeEnabled();
  await freezeClick(page,'#continue');
}

for(const legacy of [false,true])test(`schema-2 animation contract ${legacy?'legacy 86':'current 89'}: exact production restore, pause, reload and prior checkpoint`,async({page},info)=>{
  test.setTimeout(process.env.CI?180000:120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const d=toStationEvacuation(driver(29),{phase:'drag'});let snapshot=d.sim.snapshot();
  if(legacy){
    snapshot=gameplaySnapshot(snapshot);snapshot.actors=snapshot.actors.filter(a=>!a.ckm);
    if(snapshot.resumeCheckpoint)snapshot.resumeCheckpoint.actors=snapshot.resumeCheckpoint.actors.filter(a=>!a.ckm);
  }
  const expected=new M01Simulation();expected.restoreSnapshot(snapshot);
  await open(page,snapshot);const frozen=await page.evaluate(()=>window.gameDiagnostics());
  expect(frozen.clock).toBe(snapshot.clock);expect(frozen.m01.animationPresentation).toEqual(expected.animationPresentation);
  expect(frozen.m01.animationPresentation.actors).toHaveLength(89);
  expect(frozen.m01.stationEvacuation.patient.stationDrag.phase).toBe('drag');
  await page.waitForTimeout(300);expect((await page.evaluate(()=>window.gameDiagnostics())).m01.animationPresentation).toEqual(frozen.m01.animationPresentation);
  await page.screenshot({path:info.outputPath(`animation-contract-${legacy?'legacy':'current'}-restore.jpg`),type:'jpeg',quality:80});
  await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);await freezeClick(page,'#continue');
  const reloaded=await page.evaluate(()=>window.gameDiagnostics());
  expect(reloaded.clock).toBe(snapshot.clock);expect(reloaded.m01.animationPresentation).toEqual(frozen.m01.animationPresentation);
  expected.restoreCheckpoint();await freezeClick(page,'#restart-checkpoint');const checkpoint=await page.evaluate(()=>window.gameDiagnostics());
  expect(checkpoint.clock).toBe(expected.clock);expect(checkpoint.m01.animationPresentation).toEqual(expected.animationPresentation);
  expect(errors).toEqual([]);
  await info.attach('animation-contract-restore',{body:JSON.stringify({kind:'production UI continuation of a control-route save; no Animation Resolver or visual quality claim',legacy,frozen,reloaded,checkpoint}),contentType:'application/json'});
});
