import {test,expect} from '@playwright/test';
import {M02_DIALOGUE_CATALOG} from '../../src/game/m02-combat-ai.js';

test('C11 Lis is helped by the normal interaction only when the player reaches him',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const setup=await page.evaluate(()=>{
  const {sim}=window.m02Bench;sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.enemies=[];
  const lis=sim.allies.find(a=>a.id==='pl_lis');sim.teleportPlayer(lis.x,lis.z-1.4,Math.PI/2,-.12);
  return {x:lis.x,z:lis.z,state:lis.state,contact:sim.areaC.lisContactedInC11};
 });
 expect(setup.state).toBe('WOUNDED_LIAISON');expect(setup.contact).toBe(false);
 await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 await page.waitForFunction(()=>document.querySelector('#door-prompt').textContent.includes('Socorrer Lis'));
 expect(await page.evaluate(()=>window.m02Bench.sim.areaC.lisContactedInC11)).toBe(false);
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · SOCORRO";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('lis-contact-prompt.png')});
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.m02Bench.sim.areaC.lisContactedInC11);
 const result=await page.evaluate(()=>{const s=window.m02Bench.sim,l=s.allies.find(a=>a.id==='pl_lis');return {contact:s.areaC.lisContactedInC11,status:s.flags['m02.lis_status'],state:l.state,at:[l.x,l.z],line:s.dialogue.hasTriggered('dlg_m02_003')};});
 expect(result.contact).toBe(true);expect(result.status).toBe('wounded_walking');expect(result.state).toBe('WALKING_SUPPORTED');
 expect(Math.hypot(result.at[0]-setup.x,result.at[1]-setup.z)).toBeLessThan(2);expect(result.line).toBe(true);expect(errors).toEqual([]);
 console.log('M02 Lis contact',JSON.stringify({setup,result}));
});

test('subtitle and damage direction options work through start, hit and checkpoint restore',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await expect(page.locator('#mission-subtitles')).toBeChecked();await expect(page.locator('#mission-direction-toggle')).toBeChecked();
 await page.uncheck('#mission-subtitles');await page.uncheck('#mission-direction-toggle');await page.click('#mission-start');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 const initial=await page.evaluate(()=>({options:window.m02Bench.sim.audiovisual.accessibility,checkpoint:window.m02Bench.sim.checkpoints.get('cp_m02_a_preparacao').audiovisual.accessibility,subtitle:document.querySelector('#dialogue-banner').style.display}));
 expect(initial.options.subtitlesEnabled).toBe(false);expect(initial.options.directionalIndicatorsEnabled).toBe(false);
 expect(initial.checkpoint.subtitlesEnabled).toBe(false);expect(initial.checkpoint.directionalIndicatorsEnabled).toBe(false);expect(initial.subtitle).toBe('none');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.check('#mission-subtitles');await page.check('#mission-direction-toggle');
 await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench;sim.enterAreaBC06();sim.allies=[];
  const gun=sim.enemies.find(e=>e.weapon==='mg34');sim.enemies=[gun];
  Object.assign(gun,{x:0,y:0,z:100,mag:50,suppressed:0,nextFireAt:sim.clock+100});
  Object.assign(sim.player,{x:0,y:0,z:106,eyeHeight:1.65,health:100,angle:0});sim.drainEvents();renderer.renderFrame(0,0);
  window.m02BeforeDirection=sim.snapshot();
 });
 await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 const hit=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench,gun=sim.enemies[0];const e=sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:106},'enemy');renderer.renderFrame(0,0);return {hitId:e.traces[0].hitId,health:sim.player.health};});
 expect(hit.hitId).toBe('piotr_sokol');expect(hit.health).toBeLessThan(100);
 await page.waitForFunction(()=>!document.querySelector('#mission-direction').hidden);
 const visible=await page.evaluate(()=>({transform:document.querySelector('#mission-direction').style.transform,opacity:Number(document.querySelector('#mission-direction').style.opacity)}));
 expect(visible.transform).toContain('rotate(');expect(visible.opacity).toBeGreaterThan(0);
 const banner=await page.locator('#cartela-banner').boundingBox(),marker=await page.locator('#mission-direction').boundingBox();
 expect(banner.y+banner.height).toBeLessThan(marker.y);
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · DIREÇÃO DO DANO";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('damage-direction.png')});
 await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;sim.restoreSnapshot(window.m02BeforeDirection);renderer.renderFrame(0,0);});
 await page.waitForFunction(()=>document.querySelector('#mission-direction').hidden);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await expect(page.locator('#mission-subtitles')).toBeChecked();await expect(page.locator('#mission-direction-toggle')).toBeChecked();
 await page.uncheck('#mission-direction-toggle');await page.click('#mission-resume');
 const disabled=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench,gun=sim.enemies[0];sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:106},'enemy');renderer.renderFrame(0,0);return {source:renderer.presentation.damageSource,enabled:sim.audiovisual.accessibility.directionalIndicatorsEnabled};});
 expect(disabled.source).not.toBeNull();expect(disabled.enabled).toBe(false);
 await page.waitForTimeout(100);expect(await page.locator('#mission-direction').isHidden()).toBe(true);expect(errors).toEqual([]);
 console.log('M02 accessibility and damage direction',JSON.stringify({initial,hit,visible,disabled}));
});

test('location card stays inside the viewport and clear of the aiming area',async({page})=>{
 await page.goto('/COD-guerra/m02.html?quality=low&debug=1');await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#cartela-banner')).display!=='none');
 for(const viewport of [{width:480,height:270},{width:1280,height:720}]){
  await page.setViewportSize(viewport);
  const banner=await page.locator('#cartela-banner').boundingBox();
  expect(banner.x).toBeGreaterThanOrEqual(0);expect(banner.x+banner.width).toBeLessThanOrEqual(viewport.width);
  expect(banner.y+banner.height).toBeLessThan(viewport.height/2-49);
 }
});

test('the player can collect real compatible ammunition from a defeated rifleman using E',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.evaluate(()=>{
  const {sim}=window.m02Bench;sim.enterAreaBC06();sim.allies=[];sim.calibrationTargets=[];
  const enemy=sim.enemies.find(e=>e.weapon==='kar98k');sim.enemies=[enemy];
  Object.assign(enemy,{x:1.5,y:0,z:100,alive:true,health:1,state:'HOLD_SECTOR',nonCombatant:false,mag:3,reserve:12,nextFireAt:sim.clock+100,goal:null});
  sim.teleportPlayer(0,100,0,-.2);sim.weapon.mag=5;sim.weapon.reserve=30;
 });
 await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 await page.keyboard.press('Space');await page.waitForFunction(()=>window.m02Bench.sim.enemies[0].alive===false);
 await page.waitForFunction(()=>document.querySelector('#door-prompt').textContent.includes('Recolher munição'));
 await page.addStyleTag({content:'#cartela-banner{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · MUNIÇÃO";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('ammo-prompt.png')});
 const before=await page.evaluate(()=>{const s=window.m02Bench.sim,e=s.enemies[0];return {reserve:s.weapon.reserve,available:e.mag+e.reserve};});
 await page.keyboard.press('KeyE');await page.waitForFunction(n=>window.m02Bench.sim.weapon.reserve>n,before.reserve);
 const after=await page.evaluate(()=>{const s=window.m02Bench.sim,e=s.enemies[0];return {reserve:s.weapon.reserve,available:e.mag+e.reserve,weapon:s.weapon.mag};});
 expect(after.reserve).toBe(40);expect(after.available+after.reserve).toBe(before.available+before.reserve);
 expect(after.weapon).toBe(4);expect(errors).toEqual([]);console.log('M02 recovered actual rifle ammunition',JSON.stringify({before,after}));
});

test('a grenade thrown by the player bounces off the actual B05 wall',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const wall=await page.evaluate(()=>{
  const {sim}=window.m02Bench;sim.enterAreaBC06();sim.enemies=[];sim.allies=[];sim.teleportPlayer(-31,-22,Math.PI,0);
  const w=sim.world.obstacles.find(o=>o.id==='B05_east_seg_1');return {min:w.min,max:w.max};
 });
 await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 await page.keyboard.press('KeyG');
 await page.waitForFunction(()=>{const {sim,renderer}=window.m02Bench,g=sim.grenades[0];return g&&g.vx>0&&renderer.grenadeViews.views.has(g.id);});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.addStyleTag({content:'#mission-menu,#cartela-banner{display:none!important}.mission-paused .hud-layer{visibility:visible}body:after{content:"INSPEÇÃO CONTROLADA · RESSALTO";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 const result=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench,g=sim.grenades[0],v=renderer.grenadeViews.views.get(g.id);return {x:g.x,y:g.y,z:g.z,vx:g.vx,vz:g.vz,view:v.position.toArray(),ammo:sim.grenadeAmmo};});
 expect(result.x).toBeGreaterThanOrEqual(wall.max.x);expect(result.vx).toBeGreaterThan(0);expect(result.ammo).toBe(1);
 expect(result.view).toEqual([result.x,result.y,result.z]);await page.screenshot({path:testInfo.outputPath('grenade-wall-bounce.png')});
 expect(errors).toEqual([]);console.log('M02 grenade bounce in B05',JSON.stringify({wall,result}));
});

test('the normal grenade input displays the live projectile and a checkpoint removes it',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 await page.evaluate(()=>{window.m02BeforeGrenade=window.m02Bench.sim.snapshot();});
 await page.keyboard.press('KeyG');await page.waitForFunction(()=>window.m02Diagnostics().grenades.active===1);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.addStyleTag({content:'#mission-menu{display:none!important}.mission-paused .hud-layer{visibility:visible}body:after{content:"INSPEÇÃO CONTROLADA · GRANADA";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 const shown=await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench,g=sim.grenades[0],mesh=renderer.grenadeViews.views.get(g.id),before=JSON.stringify(sim.snapshot());
  renderer.grenadeViews.update(sim);
  return {ammo:sim.grenadeAmmo,ids:renderer.grenadeViews.diagnostics.ids,position:mesh.position.toArray(),actual:[g.x,g.y,g.z],radius:mesh.scale.x,visible:mesh.visible,unchanged:before===JSON.stringify(sim.snapshot())};
 });
 expect(shown.ammo).toBe(1);expect(shown.ids).toHaveLength(1);expect(shown.position).toEqual(shown.actual);
 expect(shown.radius).toBe(.07);expect(shown.visible).toBe(true);expect(shown.unchanged).toBe(true);
 await page.screenshot({path:testInfo.outputPath('grenade-in-flight.png')});
 const restored=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;sim.restoreSnapshot(window.m02BeforeGrenade);renderer.renderFrame(0,0);return {ammo:sim.grenadeAmmo,active:renderer.grenadeViews.diagnostics.active};});
 expect(restored).toEqual({ammo:2,active:0});expect(errors).toEqual([]);
 console.log('M02 real grenade input',JSON.stringify({shown,restored}));
});

test('C11 real casualty retains an M01 death pose after a same-clock checkpoint restore',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.addStyleTag({content:'#mission-menu,#cartela-banner{display:none!important}.mission-paused .hud-layer{visibility:visible}body:after{content:"INSPEÇÃO CONTROLADA · C11";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 const result=await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench;sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();
  const gun=sim.enemies.find(e=>e.weapon==='mg34')??sim.enemies[0];sim.enemies=[gun];sim.allies=[];
  Object.assign(gun,{x:70,y:0,z:-100,weapon:'kar98k',facing:0,mag:5,reserve:10,suppressed:0,goal:null,nextFireAt:0});
  for(const a of sim.areaC.lastGroup)a.evacuated=true;
  const man=sim.areaC.lastGroup[0];Object.assign(man,{x:80,y:0,z:-100,health:1,alive:true,evacuated:false});
  sim.teleportPlayer(75,-96,Math.atan2(-4,5),-.12);sim.drainEvents();renderer.renderFrame(0,0);
  const shot=sim.fireActorBurst(gun,man,{x:80,y:1.25,z:-100},'enemy');sim.enemies=[];
  for(let i=0;i<10;i++)sim.tick(.05,{});renderer.renderFrame(0,0);
  const saved=sim.snapshot(),read=()=>renderer.presentation.characters.stats.actors.find(a=>a.id===man.id);
  const first=read();sim.restoreSnapshot(saved);renderer.renderFrame(0,0);
  return {hitId:shot.traces[0].hitId,alive:sim.areaC.lastGroup[0].alive,first,restored:read()};
 });
 expect(result.hitId).toBe('LG01');expect(result.alive).toBe(false);
 expect(result.first?.clip).toMatch(/^(death_|fallen)/);expect(result.restored?.clip).toMatch(/^(death_|fallen)/);
 await page.screenshot({path:testInfo.outputPath('c11-casualty.png')});expect(errors).toEqual([]);
 console.log('M02 C11 casualty fixture',JSON.stringify(result));
});

test('a real hit gives the player M01 audio and visible feedback, cleared by checkpoint restore',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 // Paused inspection fixture: expose the normal HUD and label the screenshot.
 await page.addStyleTag({content:'#mission-menu{display:none!important}#mission-hit[hidden]{display:block!important}.mission-paused .hud-layer{visibility:visible}body:after{content:"INSPEÇÃO CONTROLADA · IMPACTO";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 const before=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench;await renderer.presentation.audio.ctx.resume();
  sim.enterAreaBC06();sim.allies=[];const gun=sim.enemies.find(e=>e.weapon==='mg34');sim.enemies=[gun];
  Object.assign(gun,{x:0,y:0,z:100,mag:50,suppressed:0});Object.assign(sim.player,{x:0,y:0,z:106,eyeHeight:1.65,health:100,angle:-Math.PI/2});
  sim.drainEvents();renderer.renderFrame(0,0);window.m02DamageSave=sim.snapshot();return sim.player.health;
 });
 await page.screenshot({path:testInfo.outputPath('before-hit.png')});
 const result=await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench,gun=sim.enemies[0];
  sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:106},'enemy');const after=JSON.stringify(sim.snapshot());
  renderer.renderFrame(0,0);
  return {health:sim.player.health,count:renderer.presentation.feedback.counts.playerHit,flash:renderer.presentation.feedback.sample(sim.clock,'low').overlayAlpha,
   sounds:renderer.presentation.audio.diagnostics.eventCounts['player-hit'],unchanged:after===JSON.stringify(sim.snapshot())};
 });
 expect(result.health).toBeLessThan(before);expect(result.count).toBe(1);expect(result.flash).toBeGreaterThan(0);expect(result.sounds).toBeGreaterThan(0);expect(result.unchanged).toBe(true);
 await page.waitForFunction(()=>Number(document.querySelector('#mission-hit').style.opacity)>0);
 await page.waitForTimeout(450);await page.screenshot({path:testInfo.outputPath('after-hit.png')});
 const restored=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;sim.restoreSnapshot(window.m02DamageSave);renderer.renderFrame(0,0);return {health:sim.player.health,count:renderer.presentation.feedback.counts.playerHit};});
 expect(restored.health).toBe(before);expect(restored.count).toBe(0);expect(errors).toEqual([]);
 console.log('M02 real player hit fixture',JSON.stringify({before,...result,restored}));
});

test('M02 real NPC collision drives an audible material impact in Web Audio',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench,p=renderer.presentation,a=p.audio;
  await a.ctx.resume();sim.enterAreaBC06();sim.allies=[];
  const gun=sim.enemies.find(e=>e.weapon==='mg34');sim.enemies=[gun];
  Object.assign(gun,{x:0,y:0,z:100,mag:50,suppressed:0});Object.assign(sim.player,{x:0,y:0,z:120,eyeHeight:1.65,angle:0});
  sim.world.obstacles.push({id:'audio-probe-wall',min:{x:-3,y:0,z:103},max:{x:3,y:3,z:103.3},material:'wood_thick'});
  sim.drainEvents();sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:120},'enemy');
  const events=sim.drainEvents(),round=events.find(e=>e.type==='actor-burst'),before=JSON.stringify(sim.snapshot());
  const destination=a.ctx.createMediaStreamDestination();a.master.connect(destination);
  const recorder=new MediaRecorder(destination.stream),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
  const prior=a.diagnostics.eventCounts.impact??0;
  // Isolate the impact in this instrumented fixture; the normal game still plays the shot.
  const weaponFire=a.weaponFire;a.weaponFire=()=>{};p.consume(events,sim);a.weaponFire=weaponFire;
  await new Promise(r=>setTimeout(r,350));await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});
  const buffer=await a.ctx.decodeAudioData(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer());
  let peak=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const v of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(v));
  a.master.disconnect(destination);
  return {peak,impactCount:(a.diagnostics.eventCounts.impact??0)-prior,trace:round.traces[0],unchanged:before===JSON.stringify(sim.snapshot()),state:a.ctx.state};
 });
 console.log('M02 NPC impact audio probe',JSON.stringify(result));
 expect(result.trace.hitKind).toBe('world');expect(result.trace.material).toBe('wood_thick');
 expect(result.trace.point.z-result.trace.origin.z).toBeGreaterThan(1);
 expect(result.impactCount).toBe(1);expect(result.peak).toBeGreaterThan(.001);expect(result.state).toBe('running');
 expect(result.unchanged).toBe(true);expect(errors).toEqual([]);
});

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
