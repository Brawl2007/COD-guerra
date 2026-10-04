import {test,expect} from '@playwright/test';
import {driver,toRepair} from '../helpers/m01-route.js';
import {PILOT_IDS} from '../../src/game/m01-authority-coordinator.js';
import {M01Simulation} from '../../src/game/m01-simulation.js';
const key='cod-guerra:checkpoint:m01:v2';
let fixtures;
function saves(){
  if(fixtures)return fixtures;
  const d=toRepair(driver());d.walk(-123,27);d.walk(-150,27);d.walk(-150,65);
  d.until(()=>d.sim.consumedEvent('evt_m01_train963_arrives'),250);
  d.step({lookX:Math.atan2(Math.sin(-d.sim.player.angle),Math.cos(-d.sim.player.angle))/.0022});
  const far=d.sim.snapshot();d.walk(-100,65);const near=d.sim.snapshot(),nearDiagnostic=d.sim.authorityPilot.diagnostics();
  expect(far.authorityPilot.owner).toBe('AGGREGATED');expect(near.authorityPilot.owner).toBe('INDIVIDUAL');
  return fixtures={far,near,nearDiagnostic};
}
async function open(page,snapshot){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await expect(page.locator('#continue')).toBeVisible();return errors;
}
async function pause(page){await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();}
async function face(page,angle){
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  // Bounded feedback through normal mouse input, as the Node route steers through
  // controls. Entry may discard a sample; movementX is quantized to whole pixels.
  for(let i=0;i<8;i++){
    const current=await page.evaluate(()=>({angle:window.gameDiagnostics().player.angle,clock:window.gameDiagnostics().clock}));
    const turn=Math.atan2(Math.sin(angle-current.angle),Math.cos(angle-current.angle));
    if(Math.abs(turn)<.003)return;
    await page.evaluate(x=>{
      document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:0,bubbles:true}));
      document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:0,bubbles:true}));
    },Math.round(turn/.0022));
    await page.waitForFunction(clock=>window.gameDiagnostics().clock>clock+.001,current.clock,{timeout:10000});
  }
  const actual=await page.evaluate(()=>window.gameDiagnostics().player.angle);
  throw Error(`Normal mouse steering failed: target=${angle}, actual=${actual}`);
}
async function frozenContinue(page,button='#continue'){
  await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){
    document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
  }};document.addEventListener('pointerlockchange',hold,true);});
  await page.locator(button).click();await expect(page.locator('#pause')).toBeVisible();
}
const diagnostic=page=>page.evaluate(()=>window.gameDiagnostics().m01.authorityPilot);
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus&&!page.isClosed()){
  try{await info.attach('pilot-diagnostics',{body:JSON.stringify(await page.evaluate(()=>window.gameDiagnostics())),contentType:'application/json'});}catch{}
}});
test('real west-bank approach opens LOS, atomically leases the same four riflemen, pauses and returns',async({page},info)=>{
  test.setTimeout(180000);const errors=await open(page,saves().far);
  await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  expect((await diagnostic(page)).authorityOwner).toBe('AGGREGATED');
  await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');
  try{await page.waitForFunction(()=>window.gameDiagnostics().m01.authorityPilot.authorityOwner==='INDIVIDUAL',{},{timeout:90000});}
  finally{await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');}
  const acquired=await diagnostic(page);expect(acquired.memberIds).toEqual(PILOT_IDS);expect(acquired.individualMemberCount).toBe(4);
  expect(acquired.generation).toBe(1);expect(acquired.band).toBe('FAR'); // Reachable rifle interaction, not a fabricated 150 m walk.
  await pause(page);const frozen=await diagnostic(page);await page.waitForTimeout(300);expect(await diagnostic(page)).toEqual(frozen);
  const beforeAngle=await page.evaluate(()=>window.gameDiagnostics().player.angle);
  await page.locator('#resume').click();await face(page,beforeAngle+.6);await pause(page);
  const turned=await diagnostic(page);expect(turned.authorityOwner).toBe('INDIVIDUAL');expect(turned.leaseId).toBe(frozen.leaseId);expect(turned.aggregateRng).toEqual(frozen.aggregateRng);
  await info.attach('pilot-acquired',{body:JSON.stringify({acquired,frozen,turned}),contentType:'application/json'});
  // Face west using the normal input handler, then walk back to the blocked sightline.
  await page.locator('#resume').click();
  await face(page,Math.PI);
  await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');
  try{await page.waitForFunction(()=>window.gameDiagnostics().m01.authorityPilot.authorityOwner==='AGGREGATED',{},{timeout:90000});}
  finally{await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');}
  await pause(page);const returned=await diagnostic(page);expect(returned.memberIds).toEqual(PILOT_IDS);expect(returned.individualMemberCount).toBe(0);expect(returned.leaseId).toBeNull();expect(returned.generation).toBe(1);
  expect(returned.reserve+returned.loaded+returned.spent).toBe(120);expect(errors).toEqual([]);
  await info.attach('pilot-returned',{body:JSON.stringify(returned),contentType:'application/json'});
});
test('active schema-2 lease restores exactly at LOW/MEDIUM/HIGH and Restart uses the previous checkpoint',async({page},info)=>{
  test.setTimeout(180000);const {near,nearDiagnostic}=saves(),errors=await open(page,near);
  expect(near.schema).toBe(2);
  for(const quality of ['low','medium','high']){
    await page.locator('#quality').selectOption(quality);await frozenContinue(page);
    expect(await diagnostic(page)).toEqual(nearDiagnostic);
    await page.waitForTimeout(250);expect(await diagnostic(page)).toEqual(nearDiagnostic);
    await page.locator('#back-menu').click();
  }
  await frozenContinue(page);await frozenContinue(page,'#restart-checkpoint');
  const expectedCheckpoint=new M01Simulation();expectedCheckpoint.restoreSnapshot(near.resumeCheckpoint);
  expect(await diagnostic(page)).toEqual(expectedCheckpoint.authorityPilot.diagnostics());
  const restarted=await diagnostic(page);expect(restarted.authorityOwner).toBe('AGGREGATED');expect(restarted.individualMemberCount).toBe(0);expect(restarted.leaseId).toBeNull();expect(restarted.generation).toBe(0);expect(restarted.memberIds).toEqual(PILOT_IDS);
  expect(errors).toEqual([]);await info.attach('pilot-checkpoint-owner',{body:JSON.stringify(restarted),contentType:'application/json'});
});
