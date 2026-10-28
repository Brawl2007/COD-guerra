import {test,expect} from '@playwright/test';
import {M02_DIALOGUE_CATALOG} from '../../src/game/m02-combat-ai.js';

test('M02 subtitle and interaction fixtures remain readable together at small and desktop sizes',async({page})=>{
 await page.goto('/COD-guerra/m02.html?quality=low');
 await page.waitForFunction(()=>window.m02Diagnostics&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 // Explicit UI inspection fixture, never represented as a continuous playtest.
 await page.addStyleTag({content:'#mission-menu,#cartela-banner{display:none!important}.mission-paused #dialogue-banner,.mission-paused #door-prompt,.mission-paused .hud-layer{visibility:visible}'});
 const line=Object.values(M02_DIALOGUE_CATALOG).sort((a,b)=>b.text.length-a.text.length)[0];
 for(const viewport of [{width:480,height:270},{width:1280,height:720}]){
  await page.setViewportSize(viewport);
  await page.evaluate(line=>{
   const subtitle=document.querySelector('#dialogue-banner'),prompt=document.querySelector('#door-prompt');
   subtitle.style.display='block';subtitle.textContent=`${line.speakerName}: «${line.text}»`;
   prompt.style.display='block';prompt.textContent='[E] Sinalizar o ferido com giz';
  },line);
  const rect=await page.evaluate(()=>{
   const box=id=>{const el=document.querySelector(id),r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scroll:el.scrollWidth,width:el.clientWidth};};
   return {dialogue:box('#dialogue-banner'),prompt:box('#door-prompt'),objective:box('.mission-header')};
  });
  expect(rect.prompt.bottom).toBeLessThanOrEqual(rect.dialogue.top);
  expect(rect.objective.bottom).toBeLessThan(rect.prompt.top);
  expect(rect.dialogue.left).toBeGreaterThanOrEqual(0);expect(rect.dialogue.right).toBeLessThanOrEqual(viewport.width);
  expect(rect.dialogue.bottom).toBeLessThan(viewport.height);expect(rect.dialogue.scroll).toBeLessThanOrEqual(rect.dialogue.width);
 }
});

test('M02 default quality follows M01 software GPU detection and maximum remains selectable',async({page})=>{
 await page.setViewportSize({width:800,height:450});
 await page.goto('/COD-guerra/m02.html');
 await page.waitForFunction(()=>window.m02Diagnostics&&!document.querySelector('#mission-start').disabled);
 expect(await page.evaluate(()=>window.m02Diagnostics().telemetry.qualityProfile)).toBe('low');
 await page.selectOption('#mission-quality','high');
 await page.waitForFunction(()=>{const d=window.m02Diagnostics();return d.telemetry.qualityProfile==='high'&&d.environment.terrain.tier==='high'&&d.environment.terrain.files.length===4;});
 expect(await page.locator('#mission-quality').inputValue()).toBe('high');
 expect(await page.evaluate(()=>window.m02Diagnostics().environment.terrain.tier)).toBe('high');
 expect(await page.evaluate(()=>window.m02Diagnostics().environment.terrain.failures)).toEqual([]);
 await page.waitForFunction(()=>window.m02Diagnostics().lighting.grading.active);
 expect(await page.evaluate(()=>window.m02Diagnostics().lighting.cascades)).toBe(2);
 expect(await page.evaluate(()=>window.m02Diagnostics().clock)).toBe(0);
});

test('M02 drawn terrain and shared material mask cover every streamed cell, including B/C outer edges',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:640,height:360});
 await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 for(const cell of ['B','C']){
  const result=await page.evaluate(cell=>{
   const {sim,renderer}=window.m02Bench;
   if(cell==='B')sim.enterAreaBC06();else sim.enterAreaCC09();
   const p=sim.world.layout.bounds.playable;sim.teleportPlayer(p.maxX-2,p.maxZ-2,-2.3,-.08);
   const clock=sim.clock;renderer.renderFrame(0,0);
   const terrain=renderer.staticGroup.children.find(m=>m.name==='M02 playable terrain');terrain.geometry.computeBoundingBox();
   const b=terrain.geometry.boundingBox,u=renderer.environment.terrain.uniforms.m01Extent.value;
   return {cell:sim.activeCellId,clock,afterClock:sim.clock,playable:p,drawn:{minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z},mask:[u.x,u.y,1/u.z,1/u.w],groundSurfaces:renderer.staticGroup.children.filter(m=>m.userData.m02Ground).length,grading:renderer.lighting.grading.diagnostics};
  },cell);
  expect(result.cell).toBe(cell);expect(result.afterClock).toBe(result.clock);
  for(const axis of ['X','Z']){expect(result.drawn[`min${axis}`]).toBeLessThan(result.playable[`min${axis}`]);expect(result.drawn[`max${axis}`]).toBeGreaterThan(result.playable[`max${axis}`]);}
  expect(result.mask[0]).toBeLessThan(result.playable.minX);expect(result.mask[0]+result.mask[2]).toBeGreaterThan(result.playable.maxX);
  expect(result.mask[1]).toBeLessThan(result.playable.minZ);expect(result.mask[1]+result.mask[3]).toBeGreaterThan(result.playable.maxZ);
  expect(result.groundSurfaces).toBe(5);expect(result.grading.active).toBe(false);
 }
 expect(errors).toEqual([]);
});

test('M02 playable entry starts C01, pauses without advancing, and resumes a persisted checkpoint',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:600});
 await page.goto('/COD-guerra/m02.html?quality=low');
 await page.waitForFunction(()=>window.m02Diagnostics&&!document.querySelector('#mission-start').disabled);
 expect(await page.evaluate(()=>typeof window.m02Bench)).toBe('undefined');
 const menuClock=await page.evaluate(()=>window.m02Diagnostics().clock);
 await page.waitForTimeout(150);
 expect(await page.evaluate(()=>window.m02Diagnostics().clock)).toBe(menuClock);
 await page.click('#mission-start');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 const start=await page.evaluate(()=>window.m02Diagnostics().player);
 expect(start.z).toBeLessThan(-170);
 await page.keyboard.down('KeyW');
 await page.waitForFunction(z=>window.m02Diagnostics().player.z>z+.6,start.z);
 await page.keyboard.up('KeyW');
 await page.keyboard.press('F5');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('cod-guerra:checkpoint:m02:v1'))?.id==='cp_m02_manual');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cod-guerra:checkpoint:m02:v1')).snapshot);
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const clock=await page.evaluate(()=>window.m02Diagnostics().clock);
 await page.waitForTimeout(150);
 expect(await page.evaluate(()=>window.m02Diagnostics().clock)).toBe(clock);
 await page.reload();
 await page.waitForFunction(()=>window.m02Diagnostics&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-continue');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 const restored=await page.evaluate(()=>window.m02Diagnostics());
 expect(restored.activeCellId).toBe(saved.activeCellId);
 expect(restored.player.x).toBeCloseTo(saved.player.x,1);
 expect(restored.player.z).toBeCloseTo(saved.player.z,1);
 expect(restored.environment.failure).toBeNull();
 expect(restored.environment.loaded).toBe(true);
 expect(errors).toEqual([]);
});

test('C11 wounded men use the real unarmed torso pose and retain it after a same-clock restore',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});
 await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 const result=await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench;
  sim.reset('C02');sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.assistLisInC11('wounded_walking');
  for(let i=0;i<100;i++)sim.tick(.05,{});
  const lis=sim.allies.find(a=>a.id==='pl_lis');sim.teleportPlayer(lis.x+3,lis.z,Math.PI,0);
  renderer.renderFrame(0,0);
  const observe=()=>{
   const entry=renderer.presentation.characters.stats.actors.find(a=>a.id==='pl_lis');
   const v=renderer.presentation.characters.instances.get('pl_lis');v.root.updateMatrixWorld(true);
   const hips=v.root.getObjectByName('hips'),hand=v.root.getObjectByName('hand_l');
   const target=hips.localToWorld(hips.position.clone().set(0,.16,-.18));
   return {clip:entry.clip,weaponMeshes:entry.weaponMeshes,distance:hand.getWorldPosition(target.clone()).distanceTo(target)};
  };
  const before=observe(),save=sim.snapshot();sim.restoreSnapshot(save);const afterRestore=sim.snapshot();
  renderer.presentation.update(sim,renderer.qualityProfile.id);
  return {before,after:observe(),sameSnapshot:JSON.stringify(sim.snapshot())===JSON.stringify(afterRestore)};
 });
 for(const pose of [result.before,result.after]){
  expect(pose.clip).toBe('m02_wounded_walk');expect(pose.weaponMeshes).toEqual([]);expect(pose.distance).toBeLessThan(.06);
 }
 expect(result.sameSnapshot).toBe(true);expect(errors).toEqual([]);
});
