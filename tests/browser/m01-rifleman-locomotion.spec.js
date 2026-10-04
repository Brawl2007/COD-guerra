import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot} from '../../src/game/m01-simulation.js';
const dir='docs/verification/m01-runtime/rifleman-locomotion-2026-10-03';
const key='cod-guerra:checkpoint:m01:v2';
const saved=JSON.parse(readFileSync(dir+'/locomotion-snapshot.json'));
// Naturally reached mission state. Only camera yaw is oriented toward the observed rifleman for evidence.
const actor=saved.actors.find(a=>a.id==='pl_east_0');saved.player.angle=Math.atan2(actor.z-saved.player.z,actor.x-saved.player.x);
validateM01Snapshot(saved);
async function freezeContinue(page){
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);
  });
  await page.locator('#continue').click();await expect(page.locator('#pause')).toBeVisible();
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.actors.some(a=>a.id==='pl_east_0'&&a.locomotion));
}
const authoritative=g=>({clock:g.clock,battleClock:g.m01.battleClock,player:g.player,flags:g.m01.flags,weapon:g.m01.weapon,
  phase:g.missionPhase,events:g.eventIds,objectives:g.m01.objectives,parts:g.m01.parts,enemyAlive:g.m01.enemyAlive});
test('rifleman pilot resumes a real schema 2 locomotion snapshot, freezes fades in pause and reloads same gameplay',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,saved})=>localStorage.setItem(key,JSON.stringify(saved)),{key,saved});
  await page.goto('?debug=1');await expect(page.locator('#continue')).toBeEnabled();await freezeContinue(page);
  const first=await page.evaluate(()=>window.gameDiagnostics());
  expect(first.clock).toBe(saved.clock);expect(first.player.x).toBe(saved.player.x);expect(first.player.y).toBe(saved.player.y);expect(first.player.z).toBe(saved.player.z);
  expect(first.m01.weapon).toEqual(saved.weapon);expect(first.m01.flags).toEqual(saved.flags);
  await page.screenshot({path:info.outputPath('pilot-loaded-snapshot.png'),style:'#pause { visibility:hidden !important; }'});
  await page.locator('#resume').click();await page.waitForFunction(clock=>window.gameDiagnostics().clock>clock+.35,first.clock);
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const paused=await page.evaluate(()=>window.gameDiagnostics());const p=paused.m01.characters.actors.find(a=>a.id==='pl_east_0');expect(p.locomotion.speed).toBeGreaterThan(0);
  expect(['walk','run']).toContain(p.clip);expect(p.locomotion.playbackRate).toBeLessThanOrEqual(1.8);
  // Repeated reads after a real paused render preserve both presentation and authority.
  await expect.poll(async()=>page.evaluate(()=>window.gameDiagnostics().m01.characters.actors.find(a=>a.id==='pl_east_0'))).toEqual(p);
  await page.screenshot({path:info.outputPath('pilot-paused-locomotion.png'),style:'#pause { visibility:hidden !important; }'});
  await page.reload();await expect(page.locator('#continue')).toBeEnabled();await freezeContinue(page);
  const reloaded=await page.evaluate(()=>window.gameDiagnostics());expect(authoritative(reloaded)).toEqual(authoritative(first));
  const reconstructed=new M01Simulation();reconstructed.restoreSnapshot(saved);expect(reconstructed.snapshot(false)).toEqual(saved);
  await page.screenshot({path:info.outputPath('pilot-reloaded-snapshot.png'),style:'#pause { visibility:hidden !important; }'});
  const report={snapshotClock:saved.clock,cameraOnlyYaw:saved.player.angle,first,paused,reloaded,authorityEqual:true,errors};
  await info.attach('pilot-diagnostics',{body:JSON.stringify(report),contentType:'application/json'});
  if(process.env.M01_RIFLEMAN_EVIDENCE){const out=process.env.M01_RIFLEMAN_EVIDENCE;mkdirSync(out,{recursive:true});writeFileSync(out+'/production-save-restore.json',JSON.stringify(report,null,2)+'\n');
    for(const [name,target]of [['pilot-loaded-snapshot.png','production-loaded.png'],['pilot-paused-locomotion.png','production-paused.png'],['pilot-reloaded-snapshot.png','production-reloaded.png']])copyFileSync(info.outputPath(name),out+'/'+target);
  }
  expect(errors).toEqual([]);
});
