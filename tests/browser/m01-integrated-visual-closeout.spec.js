import {test,expect} from '@playwright/test';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {driver,toRepair} from '../helpers/m01-route.js';

const key='cod-guerra:checkpoint:m01:v2';
const fresh=new M01Simulation(19390901);
const repair=toRepair(driver());repair.until(()=>repair.sim.battleClock>=seconds('04:45:10'),120);
const armored=toRepair(driver());armored.until(()=>armored.sim.battleClock>=seconds('04:52:10'),240);

function relocated(sim,snapshot,x,z,target){
  const s=structuredClone(snapshot);s.player.x=x;s.player.z=z;s.player.y=sim.world.heightAt(x,z);
  s.player.angle=Math.atan2(target.z-z,target.x-x);s.player.pitch=0;s.player.aiming=false;return s;
}
async function open(page,snapshot,quality='high'){
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await expect(page.locator('#error')).toBeHidden();await page.locator('#quality').selectOption(quality);
  await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>1,null,{timeout:120000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
}
async function shot(page,info,name){
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
  const d=await page.evaluate(()=>window.gameDiagnostics());
  await info.attach(name+'.json',{body:JSON.stringify({player:d.player,drawCalls:d.drawCalls,triangles:d.triangles,textures:d.textures,geometries:d.geometries,m01:{locomotive:d.m01.locomotive,panzerzug:d.m01.panzerzug,wagons:d.m01.wagons,yardWagons:d.m01.yardWagons,vegetation:d.m01.vegetation,actorPoses:d.m01.actorPoses,actorAnimations:d.m01.actorAnimations,battlefieldFx:d.m01.battlefieldFx}},null,2),contentType:'application/json'});
}

test('integrated closeout: station facade roof yard and annexes',async({page},info)=>{
  test.setTimeout(180000);
  const views=[
    ['station-facade-oblique.png',-320,42,{x:-400,z:42}],
    ['station-yard-south.png',-400,6,{x:-400,z:36}],
    ['station-roof-annex.png',-325,12,{x:-405,z:48}]
  ];
  for(let i=0;i<views.length;i++){
    const [name,x,z,target]=views[i],snapshot=relocated(fresh,fresh.snapshot(false),x,z,target);
    if(i===0)await open(page,snapshot,'high');else{
      await page.evaluate(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
      await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
      await page.locator('#quality').selectOption('high');await page.locator('#continue').click();
      await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
      await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>1,null,{timeout:120000});
      await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
    }
    await shot(page,info,name);
  }
});

test('integrated closeout: locomotive wagons and Panzerzug near mid far',async({page},info)=>{
  test.setTimeout(240000);
  const baseL=repair.sim.snapshot(false),baseP=armored.sim.snapshot(false);
  const views=[
    ['train-locomotive-near.png',repair.sim,baseL,1046,22,{x:1075,z:-2.5}],
    ['train-locomotive-mid.png',repair.sim,baseL,930,18,{x:1075,z:-2.5}],
    ['train-consist-far.png',repair.sim,baseL,720,12,{x:1090,z:-2.5}],
    ['panzerzug-near.png',armored.sim,baseP,1090,25,{x:1119,z:2.5}]
  ];
  for(let i=0;i<views.length;i++){
    const [name,sim,base,x,z,target]=views[i],snapshot=relocated(sim,base,x,z,target);
    if(i===0)await open(page,snapshot,'high');else{
      await page.evaluate(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
      await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
      await page.locator('#quality').selectOption('high');await page.locator('#continue').click();
      await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
      await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>1,null,{timeout:120000});
      await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
    }
    await page.waitForFunction(()=>{const d=window.gameDiagnostics().m01;return d.locomotive.loaded.length===3&&d.panzerzug.loaded.length===3&&d.wagons.loaded.length===6;},null,{timeout:120000});
    await shot(page,info,name);
  }
});
