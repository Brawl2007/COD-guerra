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
 expect(await page.evaluate(()=>window.m02Diagnostics().clock)).toBe(0);
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
