import {test,expect} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';

const key='cod-guerra:checkpoint:m01:v2',E=name=>`evt_m01_${name}`,target={x:-352,z:8};
function snapshotAt(x,z,{burned=false,checkpoint=false}={}){
  const sim=new M01Simulation(19390901);sim.player.x=x;sim.player.z=z;sim.player.y=sim.world.heightAt(x,z);
  sim.player.angle=Math.atan2(target.z-z,target.x-x);sim.player.pitch=0;
  if(checkpoint)sim.checkpoint=sim.snapshot(false);
  if(burned)sim.consume(E('wounded_dragged'));
  return sim.snapshot();
}
const nearIntact=snapshotAt(-330,20),nearBurnedWithIntactCheckpoint=snapshotAt(-330,20,{burned:true,checkpoint:true});
const midIntact=snapshotAt(-150,20),farIntact=snapshotAt(100,20);

async function waitMenu(page){
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeVisible();
}
async function freezeButton(page,selector){
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};
    document.addEventListener('pointerlockchange',hold,true);
  });
  await page.locator(selector).click();await expect(page.locator('#pause')).toBeVisible({timeout:30000});
  await page.waitForFunction(()=>window.gameDiagnostics().paused&&window.gameDiagnostics().m01?.yardWagons?.wagons?.length===3);
}
async function installSnapshotOverride(page){
  await page.addInitScript(({key})=>{
    const forced=sessionStorage.getItem('__m01_wagon_forced_snapshot');
    if(forced){localStorage.setItem(key,forced);sessionStorage.removeItem('__m01_wagon_forced_snapshot');}
  },{key});
  await page.goto('?debug=1');
}
async function loadSnapshot(page,snapshot,quality='high'){
  await page.evaluate(snapshot=>sessionStorage.setItem('__m01_wagon_forced_snapshot',JSON.stringify(snapshot)),snapshot);
  await page.reload();await waitMenu(page);await page.locator('#quality').selectOption(quality);await freezeButton(page,'#continue');
  return page.evaluate(()=>window.gameDiagnostics());
}
const yard3=d=>d.m01.yardWagons.wagons.find(w=>w.id==='yard_wagon_3');

test('yard wagon uses real LOD0/1/2 and authoritative burned state survives reload then obeys prior checkpoint',async({page},info)=>{
  test.setTimeout(180000);
  await installSnapshotOverride(page);
  const intact=await loadSnapshot(page,nearIntact,'high'),i3=yard3(intact);
  expect(i3).toMatchObject({state:'intact',lod:0,key:'covered:intact:0',fire:false});
  await page.screenshot({path:info.outputPath('BEFORE-yard-wagon-intact-lod0.png'),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});

  const burned=await loadSnapshot(page,nearBurnedWithIntactCheckpoint,'high'),b3=yard3(burned);
  expect(b3.state).toBe('burned');expect(b3.lod).toBe(0);expect(b3.key).toBe('covered:burned:0');expect(b3.fire).toBe(true);
  expect(burned.m01.smokePuffs).toBeGreaterThan(0);
  await page.screenshot({path:info.outputPath('AFTER-yard-wagon-burned-lod0.png'),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});

  await page.reload();await waitMenu(page);await page.locator('#quality').selectOption('high');await freezeButton(page,'#continue');
  const reloaded=await page.evaluate(()=>window.gameDiagnostics());expect(yard3(reloaded)).toMatchObject({state:'burned',lod:0,fire:true});

  await freezeButton(page,'#restart-checkpoint');
  const restarted=await page.evaluate(()=>window.gameDiagnostics());expect(yard3(restarted)).toMatchObject({state:'intact',lod:0,fire:false});

  const mid=await loadSnapshot(page,midIntact,'high');expect(yard3(mid).lod).toBe(1);
  const far=await loadSnapshot(page,farIntact,'high');expect(yard3(far).lod).toBe(2);
  await page.screenshot({path:info.outputPath('AFTER-yard-wagon-lod2-far.png'),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});

  console.log('M01_WAGON_COUNTERS '+JSON.stringify({near:{yard:intact.m01.yardWagons,train:intact.m01.wagons,total:{drawCalls:intact.drawCalls,triangles:intact.triangles,textures:intact.textures,geometries:intact.geometries}},mid:{yard:mid.m01.yardWagons},far:{yard:far.m01.yardWagons}}));
});

test('total wagon GLB failure keeps train and yard procedural fallbacks visible and semantic state burned',async({page},info)=>{
  test.setTimeout(120000);
  await page.route('**/assets/models/provisional/m01-wagons/*.glb',r=>r.abort());
  await page.route('**/assets/models/provisional/m01-wagon-damage/*.glb',r=>r.abort());
  await installSnapshotOverride(page);
  const d=await loadSnapshot(page,nearBurnedWithIntactCheckpoint,'high'),w=yard3(d);
  expect(w.state).toBe('burned');expect(w.key).toBe('fallback');expect(w.fire).toBe(true);
  expect(d.m01.yardWagons.wagons.every(x=>x.key==='fallback')).toBe(true);expect(d.m01.wagons.proxies).toBe(65);
  await expect(page.locator('#error')).toBeHidden();
  await page.screenshot({path:info.outputPath('AFTER-yard-wagon-total-fallback.png'),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
});
