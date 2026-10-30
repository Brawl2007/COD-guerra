import {test,expect} from '@playwright/test';
import {M02_DIALOGUE_CATALOG} from '../../src/game/m02-combat-ai.js';
import {writeFileSync} from 'node:fs';

test('the B02 mounted gunner takes cover from the player grenade',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench;await Promise.all([renderer.materialLibraryReady,renderer.presentation.ready]);
  sim.reset('C02');sim.c01Active=false;const gunner=sim.enemies.find(a=>a.id==='DE-A05');
  sim.enemies=[gunner];sim.allies=[];gunner.nextFireAt=100;sim.teleportPlayer(8,-30,0,0);renderer.renderFrame(0,0);
 });
 const aim=await page.evaluate(()=>window.m02Bench.renderer.presentation.characters.stats.actors.find(v=>v.id==='de_east_0'));
 expect(aim.weapon).toBe('mg34');expect(aim.weaponMeshes).toContain('mg34_body');expect(aim.muzzle).toHaveLength(3);
 console.log('M02 mounted MG visual aim',JSON.stringify({clip:aim.clip,muzzle:aim.muzzle,meshes:aim.weaponMeshes}));
 const overlay=await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · MG34 NA ABERTURA";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('mg34-before-grenade.png')});
 await overlay.evaluate(el=>el.remove());
 await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 await page.keyboard.press('KeyG');
 await page.waitForFunction(()=>window.m02Bench.sim.enemies[0].tacticalState==='TakeCoverGrenade');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench,a=sim.enemies[0];renderer.renderFrame(0,0);
  return {ammo:sim.grenadeAmmo,grenades:sim.grenades.length,state:a.state,tacticalState:a.tacticalState,
   crouched:a.crouched,x:a.x,z:a.z,clip:renderer.presentation.characters.stats.actors.find(v=>v.id==='de_east_0')?.clip,
   sight:sim.evaluateMgLineOfFire()};
 });
 expect(result.ammo).toBe(1);expect(result.grenades).toBe(1);expect(result.crouched).toBe(true);
 expect(result.x).toBe(13.2);expect(result.z).toBe(-30);expect(result.clip).toBe('m02_mg34_crouch_aim');
 expect(result.sight.mgActive).toBe(true);expect(result.sight.canHitTarget).toBe(false);
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · MG34 REAGE À GRANADA";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('mg34-grenade-cover.png')});expect(errors).toEqual([]);
 console.log('M02 mounted MG grenade reaction',JSON.stringify(result));
});

test('the B02 MG bench uses the existing M01 ammunition tin',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench;await Promise.all([renderer.materialLibraryReady,renderer.cargo.ready]);
  sim.reset('C02');sim.c01Active=false;sim.enemies=[];sim.allies=[];
  sim.teleportPlayer(14.8,-28.1,Math.atan2(-1.9,-2.4),-.23);const before=JSON.stringify(sim.snapshot());renderer.renderFrame(0,0);
  const bench=renderer.staticGroup.getObjectByName('M02 furniture prop_b02_mg_mount');
  const tin=renderer.staticGroup.getObjectByName('M02 B02 MG bench dressing');
  let phantom=0;renderer.staticGroup.traverse(n=>{if(n.isMesh&&n.geometry.type==='CylinderGeometry'&&n.position.x===12.25&&n.position.y===1.38&&n.position.z===-30)phantom++;});
  return {parts:bench?.children.map(n=>n.name),models:tin?.children.map(n=>n.name),phantom,unchanged:before===JSON.stringify(sim.snapshot())};
 });
 expect(result.parts).toEqual(['table top','table leg','table leg','table leg','table leg']);
 expect(result.models).toEqual(['M02 B02 ammo_tin_box']);expect(result.phantom).toBe(0);expect(result.unchanged).toBe(true);
 await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench,bench=renderer.staticGroup.getObjectByName('M02 furniture prop_b02_mg_mount');
  const tin=renderer.staticGroup.getObjectByName('M02 B02 MG bench dressing'),ob=sim.world.obstacles.find(o=>o.id==='prop_b02_mg_mount');
  const part=bench.children[0],geometry=new part.geometry.constructor(ob.max.x-ob.min.x,ob.max.y-ob.min.y,ob.max.z-ob.min.z);
  const proxy=new part.constructor(geometry,renderer.materials.wood_thick);proxy.name='controlled original MG bench block';
  proxy.position.set((ob.min.x+ob.max.x)/2,(ob.min.y+ob.max.y)/2,(ob.min.z+ob.max.z)/2);
  proxy.castShadow=proxy.receiveShadow=true;bench.visible=false;tin.visible=false;renderer.staticGroup.add(proxy);renderer.renderFrame(0,0);
 });
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · BLOCO ANTERIOR";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('mg-bench-block.png')});
 await page.evaluate(()=>{
  const {renderer}=window.m02Bench,proxy=renderer.staticGroup.getObjectByName('controlled original MG bench block');proxy.removeFromParent();proxy.geometry.dispose();
  renderer.staticGroup.getObjectByName('M02 furniture prop_b02_mg_mount').visible=true;
  renderer.staticGroup.getObjectByName('M02 B02 MG bench dressing').visible=true;renderer.renderFrame(0,0);
 });
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · BANCADA E CAIXA M01"}'});
 await page.screenshot({path:testInfo.outputPath('mg-bench-dressed.png')});expect(errors).toEqual([]);
});

test('changing cells releases furniture geometry but retains the shared M01 props',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench;await renderer.cargo.ready;sim.reset('C02');renderer.renderFrame(0,0);
  const table=renderer.staticGroup.getObjectByName('M02 furniture prop_b01_table'),oldParts=table.children;
  let released=0,sharedReleased=0;for(const part of oldParts)part.geometry.addEventListener('dispose',()=>released++);
  let shared=null;renderer.cargo.models.get('railway_lantern').traverse(n=>{if(!shared&&n.isMesh)shared=n.geometry;});
  shared.addEventListener('dispose',()=>sharedReleased++);
  sim.enterAreaBC06();let snapshot=JSON.stringify(sim.snapshot());renderer.renderFrame(0,0);const bUnchanged=snapshot===JSON.stringify(sim.snapshot());
  sim.reset('C02');snapshot=JSON.stringify(sim.snapshot());renderer.renderFrame(0,0);
  const back=renderer.staticGroup.getObjectByName('M02 B01 kitchen dressing');let restoredShared=false;
  back?.traverse(n=>{if(n.isMesh&&n.geometry===shared)restoredShared=true;});
  return {released,expected:oldParts.length,sharedReleased,restoredShared,bUnchanged,aUnchanged:snapshot===JSON.stringify(sim.snapshot())};
 });
 expect(result.released).toBe(result.expected);expect(result.expected).toBe(5);expect(result.sharedReleased).toBe(0);expect(result.restoredShared).toBe(true);
 expect(result.bUnchanged).toBe(true);expect(result.aUnchanged).toBe(true);expect(errors).toEqual([]);
});

test('B01 kitchen uses the original M01 lantern and crate',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench;await Promise.all([renderer.materialLibraryReady,renderer.cargo.ready]);sim.reset('C02');sim.c01Active=false;sim.enemies=[];sim.allies=[];
  sim.teleportPlayer(-38,-15.6,Math.atan2(-1.1,2.85),-.24);const before=JSON.stringify(sim.snapshot());renderer.renderFrame(0,0);
  const root=renderer.staticGroup.getObjectByName('M02 B01 kitchen dressing');
  return {objects:root?.children.map(n=>n.name),unchanged:before===JSON.stringify(sim.snapshot())};
 });
 expect(result.objects).toEqual(['M02 B01 railway_lantern','M02 B01 supply_crate_planked']);expect(result.unchanged).toBe(true);
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · MESA SEM OBJETOS";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.evaluate(()=>{const {renderer}=window.m02Bench;renderer.staticGroup.getObjectByName('M02 B01 kitchen dressing').visible=false;renderer.renderFrame(0,0);});
 await page.screenshot({path:testInfo.outputPath('b01-table-undressed.png')});
 await page.evaluate(()=>{const {renderer}=window.m02Bench;renderer.staticGroup.getObjectByName('M02 B01 kitchen dressing').visible=true;renderer.renderFrame(0,0);});
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · OBJETOS M01"}'});
 await page.screenshot({path:testInfo.outputPath('b01-table-dressed.png')});expect(errors).toEqual([]);
});

test('a soldier hears a real grenade bounce behind him',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.evaluate(()=>{
  const s=window.m02Bench.sim;s.enterAreaBC06();const a=s.allies.find(a=>a.id==='pl_gruca');s.allies=[a];s.enemies=[];
  Object.assign(a,{x:4,y:0,z:100,facing:0,state:'ACTIVE',goal:null,reloadingUntil:s.clock+100});s.teleportPlayer(0,100,0,-1.1);
 });
 await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');await page.keyboard.press('KeyG');
 await page.waitForFunction(()=>{
  const {sim,renderer}=window.m02Bench;return sim.allies[0].state==='FLEE_GRENADE'&&renderer.presentation.grenadeWarning?.perception==='bounce';
 });
 const result=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;return {ammo:sim.grenadeAmmo,x:sim.allies[0].x,reload:sim.allies[0].reloadingUntil,perception:renderer.presentation.grenadeWarning.perception};});
 expect(result.ammo).toBe(1);expect(result.x).toBeGreaterThan(4);expect(result.reload).toBe(0);expect(result.perception).toBe('bounce');expect(errors).toEqual([]);
});

test('real MP38 rounds remain audible while sharing a gunner voice',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  // This controlled audio fixture advances simulation explicitly below. Stop
  // the paused render loop so software WebGL cannot stretch its 50 ms steps.
  window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,100));
  const {sim,renderer}=window.m02Bench,p=renderer.presentation,a=p.audio;sim.enterAreaBC06();sim.allies=[];
  const gun=sim.enemies.find(e=>e.id==='DE-B03');sim.enemies=[gun];
  Object.assign(gun,{x:0,y:0,z:100,facing:Math.PI/2,mag:32,reserve:0,suppressed:0});sim.teleportPlayer(20,120,Math.PI,0);
  sim.drainEvents();sim.fireActorBurst(gun,sim.player,{x:0,y:5,z:120},'enemy');
  const shots=sim.drainEvents().filter(e=>e.type==='actor-burst'&&e.shooterId===gun.id);
  for(let i=0;i<8;i++){sim.tick(.05,{});shots.push(...sim.drainEvents().filter(e=>e.type==='actor-burst'&&e.shooterId===gun.id));}
  await a.ctx.resume();a.stopAll(false);const count=a.diagnostics.eventCounts.rifle??0;
  const dest=a.ctx.createMediaStreamDestination(),recorder=new MediaRecorder(dest.stream),chunks=[];a.master.connect(dest);
  recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();let rounds=0,unchanged=true,previous=shots[0]?.clock??0;const voiceRounds=[];
  // Replay only the actual emitted round events at their simulation intervals;
  // the fixture generates no hits, so the recording isolates the weapon.
  for(const shot of shots){
   await new Promise(r=>setTimeout(r,Math.max(0,(shot.clock-previous)*1000)));previous=shot.clock;
   const before=JSON.stringify(sim.snapshot());p.consume([shot],sim);unchanged&&=before===JSON.stringify(sim.snapshot());
   rounds+=shot.rounds;voiceRounds.push({round:a.bursts.get(gun.id)?.round,voices:[...a.voices].filter(v=>v.kind==='mp38').length});
  }
  await new Promise(r=>setTimeout(r,300));await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});
  const blob=new Blob(chunks,{type:recorder.mimeType}),buffer=await a.ctx.decodeAudioData(await blob.arrayBuffer());let peak=0;
  for(let c=0;c<buffer.numberOfChannels;c++)for(const value of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(value));
  const encoded=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  a.master.disconnect(dest);return {rounds,mag:gun.mag,voiceRounds,peak,encoded,unchanged,rifleEvents:(a.diagnostics.eventCounts.rifle??0)-count,hitKinds:shots.flatMap(e=>e.traces.map(t=>t.hitKind))};
 });
 console.log('M02 MP38 burst audio',JSON.stringify({rounds:result.rounds,mag:result.mag,voiceRounds:result.voiceRounds,peak:result.peak,hitKinds:result.hitKinds}));
 expect(result.rounds).toBe(3);expect(result.mag).toBe(29);expect(result.rifleEvents).toBe(3);
 expect(result.voiceRounds[0].round).toBe(0);expect(result.voiceRounds.slice(1).some(v=>v.round>0)).toBe(true);
 expect(result.voiceRounds.every(v=>v.voices===1)).toBe(true);expect(result.hitKinds).toEqual(['none','none','none']);
 expect(result.peak).toBeGreaterThan(.0001);expect(result.unchanged).toBe(true);expect(errors).toEqual([]);
 writeFileSync(testInfo.outputPath('mp38-three-round-burst.webm'),Buffer.from(result.encoded,'base64'));
});

test('MP38 rounds batched in one frame keep their real cadence',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:640,height:360});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,100));
  const {sim,renderer}=window.m02Bench,p=renderer.presentation,a=p.audio;sim.enterAreaBC06();sim.allies=[];
  const gun=sim.enemies.find(e=>e.id==='DE-B03');sim.enemies=[gun];
  Object.assign(gun,{x:0,y:0,z:100,facing:Math.PI/2,mag:32,reserve:0,suppressed:0});sim.teleportPlayer(20,120,Math.PI,0);
  sim.drainEvents();sim.fireActorBurst(gun,sim.player,{x:0,y:5,z:120},'enemy');
  const shots=sim.drainEvents().filter(e=>e.type==='actor-burst'&&e.shooterId===gun.id);
  for(let i=0;i<8;i++){sim.tick(.05,{});shots.push(...sim.drainEvents().filter(e=>e.type==='actor-burst'&&e.shooterId===gun.id));}
  await a.ctx.resume();a.stopAll(false);const count=a.diagnostics.eventCounts.rifle??0,grain=a._grain,cracks=[];
  a._grain=function(voice,g,at,key){if(voice.kind==='mp38'&&g.layer==='crack')cracks.push(at+(g.at??0));return grain.call(this,voice,g,at,key);};
  const before=JSON.stringify(sim.snapshot());let firstCount;
  try{p.consume(shots.slice(0,2),sim);firstCount=cracks.length;p.consume(shots.slice(2),sim);}finally{a._grain=grain;}
  return {shots:shots.length,mag:gun.mag,firstCount,cracks,round:a.bursts.get(gun.id)?.round,
   voices:[...a.voices].filter(v=>v.kind==='mp38').length,rifleEvents:(a.diagnostics.eventCounts.rifle??0)-count,unchanged:before===JSON.stringify(sim.snapshot())};
 });
 expect(result.shots).toBe(3);expect(result.mag).toBe(29);expect(result.firstCount).toBe(2);
 expect(result.cracks).toHaveLength(3);expect(result.round).toBe(2);expect(result.voices).toBe(1);expect(result.rifleEvents).toBe(3);
 expect(result.cracks[1]-result.cracks[0]).toBeCloseTo(.11,3);expect(result.cracks[2]-result.cracks[1]).toBeCloseTo(.11,3);
 expect(result.unchanged).toBe(true);expect(errors).toEqual([]);
 console.log('M02 batched MP38 cadence',JSON.stringify(result));
});

test('a soldier flees and warns after seeing the player grenade',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.evaluate(()=>{
  const s=window.m02Bench.sim;s.enterAreaBC06();const a=s.allies.find(a=>a.id==='pl_gruca');s.allies=[a];s.enemies=[];
  Object.assign(a,{x:4,y:0,z:100,facing:Math.PI,state:'ACTIVE',goal:null,reloadingUntil:0});s.teleportPlayer(0,100,0,0);
 });
 await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 await page.keyboard.press('KeyG');
 await page.waitForFunction(()=>{
  const s=window.m02Bench.sim,n=document.querySelector('#mission-grenade-warning');
  return s.allies[0].state==='FLEE_GRENADE'&&s.allies[0].x>4&&s.grenadeAmmo===1&&!n.hidden&&n.textContent.includes('Granada!');
 });
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;return {x:sim.allies[0].x,threat:sim.allies[0].m02GrenadeThreat?.id,grenades:sim.grenades.length,warning:renderer.presentation.grenadeWarning};});
 expect(result.x).toBeGreaterThan(4);expect(result.threat).toBeTruthy();expect(result.grenades).toBe(1);expect(result.warning?.name).toContain('Gruca');
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · GRANADA VISTA";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('grenade-warning-and-flee.png')});expect(errors).toEqual([]);
});

test('B01 furniture gives the authored solids recognisable interiors',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench;await renderer.materialLibraryReady;sim.reset('C02');sim.c01Active=false;sim.enemies=[];sim.allies=[];
  sim.teleportPlayer(-38,-15.6,Math.atan2(-1.1,2.85),-.24);const before=JSON.stringify(sim.snapshot());renderer.renderFrame(0,0);
  const groups=['prop_b01_stove','prop_b01_table','prop_b01_bed_west','prop_b01_bed_east'].map(id=>{
   const group=renderer.staticGroup.getObjectByName(`M02 furniture ${id}`);return {id,parts:group?.children.map(n=>n.name)};
  });
  return {groups,unchanged:before===JSON.stringify(sim.snapshot())};
 });
 expect(result.groups.map(g=>g.parts?.length)).toEqual([3,5,6,6]);expect(result.groups[1].parts.filter(n=>n==='table leg')).toHaveLength(4);expect(result.unchanged).toBe(true);
 await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench,group=renderer.staticGroup.getObjectByName('M02 furniture prop_b01_table'),ob=sim.world.obstacles.find(o=>o.id==='prop_b01_table');
  const part=group.children[0],geometry=new part.geometry.constructor(ob.max.x-ob.min.x,ob.max.y-ob.min.y,ob.max.z-ob.min.z);
  const proxy=new part.constructor(geometry,renderer.materials.wood_thin);proxy.name='controlled original table block';
  proxy.position.set((ob.min.x+ob.max.x)/2,(ob.min.y+ob.max.y)/2,(ob.min.z+ob.max.z)/2);proxy.castShadow=proxy.receiveShadow=true;group.visible=false;renderer.staticGroup.add(proxy);renderer.renderFrame(0,0);
 });
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · BLOCO DE MESA";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('b01-table-block.png')});
 await page.evaluate(()=>{
  const {renderer}=window.m02Bench,proxy=renderer.staticGroup.getObjectByName('controlled original table block');proxy.removeFromParent();proxy.geometry.dispose();
  renderer.staticGroup.getObjectByName('M02 furniture prop_b01_table').visible=true;renderer.renderFrame(0,0);
 });
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · COZINHA B01"}'});
 await page.screenshot({path:testInfo.outputPath('b01-kitchen.png')});
 await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;sim.teleportPlayer(-35.8,-10,Math.PI,-.2);renderer.renderFrame(0,0);});
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · QUARTO B01"}'});
 await page.screenshot({path:testInfo.outputPath('b01-bedroom.png')});expect(errors).toEqual([]);
});

test('real player steps use the visible farm floor and M01 interior audio',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.evaluate(()=>{const s=window.m02Bench.sim;s.reset('C02');s.c01Active=false;s.enemies=[];s.allies=[];});
 for(const [name,x,z,material,zone] of [['earth',-10,-60,'earth','open'],['wood',-38,-15,'wood','m02_B01']]){
  await page.evaluate(async({x,z})=>{
   const {sim,renderer}=window.m02Bench,a=renderer.presentation.audio;sim.teleportPlayer(x,z,0,-.4);
   await a.ctx.resume();a.stopAll(false);renderer.presentation.footsteps.reset();
   const destination=a.ctx.createMediaStreamDestination(),recorder=new MediaRecorder(destination.stream),chunks=[];
   a.master.connect(destination);recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
   window.m02StepRecording={destination,recorder,chunks};
  },{x,z});
  await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(material=>window.m02Bench.renderer.presentation.audio.diagnostics.lastEvents.some(e=>e.kind==='footstep'&&!e.detail.npc&&e.detail.surface===material),material);
  await page.keyboard.up('KeyW');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
  const result=await page.evaluate(async()=>{
   const a=window.m02Bench.renderer.presentation.audio,{destination,recorder,chunks}=window.m02StepRecording;
   await new Promise(r=>setTimeout(r,300));await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});
   const blob=new Blob(chunks,{type:recorder.mimeType}),buffer=await a.ctx.decodeAudioData(await blob.arrayBuffer());let peak=0;
   for(let c=0;c<buffer.numberOfChannels;c++)for(const v of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(v));
   const encoded=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
   const step=a.diagnostics.lastEvents.filter(e=>e.kind==='footstep'&&!e.detail.npc).at(-1);
   a.master.disconnect(destination);return {peak,encoded,step,zone:a.core.zone.id,surface:a.core.surface.material};
  });
  expect(result.step.detail.surface).toBe(material);expect(result.surface).toBe(material);expect(result.zone).toBe(zone);expect(result.peak).toBeGreaterThan(.0001);
  writeFileSync(testInfo.outputPath(`step-${name}.webm`),Buffer.from(result.encoded,'base64'));
  if(name==='wood'){
   await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · PISO B01";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
   await page.screenshot({path:testInfo.outputPath('wood-floor-b01.png')});
  }
  console.log('M02 surface step',JSON.stringify({material,zone:result.zone,peak:result.peak,step:result.step}));
 }
 expect(errors).toEqual([]);
});

test('squad can hold and resume in B and C using the normal keys',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 for(const cell of ['B','C']){
  await page.evaluate(cell=>{const s=window.m02Bench.sim;if(cell==='B')s.enterAreaBC06();else s.enterAreaCC09();s.enemies=[];s.allies=s.allies.filter(a=>a.id==='pl_gruca');},cell);
  await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
  await page.keyboard.press('KeyZ');await page.waitForFunction(cell=>{const s=window.m02Bench.sim;return s.squadOrder.type==='suppress'&&s.squadOrder.issuedCell===cell&&s.allies[0].goal?.nodeId==='order_hold_pl_gruca'&&!document.querySelector('#mission-order').hidden;},cell);
  const hold=await page.evaluate(()=>{const s=window.m02Bench.sim;return {actor:[s.allies[0].x,s.allies[0].z],anchor:s.squadOrder.holdPositions.pl_gruca,text:document.querySelector('#mission-order').textContent};});
  expect(Math.hypot(hold.actor[0]-hold.anchor.x,hold.actor[1]-hold.anchor.z)).toBeLessThan(.01);expect(hold.text).toContain('segurar');
  if(cell==='B'){
   await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · ORDEM EM B";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
   await page.screenshot({path:testInfo.outputPath('squad-hold-area-b.png')});
  }
  await page.keyboard.press('KeyX');await page.waitForFunction(()=>{const s=window.m02Bench.sim;return s.squadOrder.type==='advance'&&s.allies[0].goal?.nodeId!=='order_hold_pl_gruca'&&document.querySelector('#mission-order').textContent.includes('prosseguir');});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 }
 expect(errors).toEqual([]);
});

test('farm squad orders change real cover goals through normal keys and show confirmation',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.evaluate(()=>{const s=window.m02Bench.sim;s.reset('C02');s.clock=10;s.ea1StartedAt=0;s.c01Active=false;s.enemies=[];s.allies=s.allies.filter(a=>a.id==='pl_gruca');});
 await page.click('#mission-resume');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 await page.keyboard.press('KeyZ');await page.waitForFunction(()=>window.m02Bench.sim.squadOrder.type==='suppress'&&!document.querySelector('#mission-order').hidden);
 const held=await page.evaluate(()=>({node:window.m02Bench.sim.allies[0].goal.nodeId,text:document.querySelector('#mission-order').textContent}));
 expect(held.node).toBe('cv_ditch_mid_a');expect(held.text).toContain('segurar e suprimir');
 await page.keyboard.press('KeyX');await page.waitForFunction(()=>window.m02Bench.sim.squadOrder.type==='advance'&&window.m02Bench.sim.allies[0].goal?.nodeId==='cv_b01_north_wall');
 await page.waitForFunction(()=>document.querySelector('#mission-order').textContent.includes('avançar'));
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · ORDENS";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('squad-order-advance.png')});
 await page.keyboard.press('KeyB');await page.waitForFunction(()=>window.m02Bench.sim.squadOrder.type==='flank_east'&&document.querySelector('#mission-order').textContent.includes('pomar'));
 const flank=await page.evaluate(()=>window.m02Bench.sim.allies[0].goal.nodeId);
 expect(['cv_orchard_bank_e','cv_b03_south_entry','cv_courtyard_consolidate']).toContain(flank);expect(errors).toEqual([]);
});

test('a physically bounced grenade produces an audible local material cue',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/COD-guerra/m02.html?quality=low&debug=1');await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench,p=renderer.presentation,a=p.audio;await a.ctx.resume();sim.enterAreaBC06();sim.enemies=[];sim.allies=[];
  Object.assign(sim.player,{x:-2,y:0,z:100,eyeHeight:1.65,angle:0});
  sim.world.obstacles.push({id:'audio-bounce-wall',min:{x:1,y:0,z:97},max:{x:1.2,y:3,z:103},material:'wood_thick'});
  sim.throwGrenade({x:0,y:1.5,z:100},{x:1,y:0,z:0});sim.drainEvents();for(let i=0;i<4;i++)sim.tick(.05,{});
  const bounce=sim.drainEvents().filter(e=>e.type==='grenade-bounced'),before=JSON.stringify(sim.snapshot());
  p.syncSession(sim);a.stopAll(false);const dest=a.ctx.createMediaStreamDestination();a.master.connect(dest);
  const recorder=new MediaRecorder(dest.stream),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
  const count=a.diagnostics.eventCounts['grenade-bounce']??0;p.consume(bounce,sim);
  await new Promise(r=>setTimeout(r,350));await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});
  const blob=new Blob(chunks,{type:recorder.mimeType}),buffer=await a.ctx.decodeAudioData(await blob.arrayBuffer());
  let peak=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const v of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(v));
  const encoded=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  a.master.disconnect(dest);return {bounce,peak,encoded,count:(a.diagnostics.eventCounts['grenade-bounce']??0)-count,unchanged:before===JSON.stringify(sim.snapshot()),state:a.ctx.state};
 });
 expect(result.bounce).toHaveLength(1);expect(result.bounce[0].material).toBe('wood_thick');expect(result.count).toBe(1);
 expect(result.peak).toBeGreaterThan(.0001);expect(result.unchanged).toBe(true);expect(result.state).toBe('running');expect(errors).toEqual([]);
 writeFileSync(testInfo.outputPath('grenade-bounce.webm'),Buffer.from(result.encoded,'base64'));
 console.log('M02 grenade bounce sound',JSON.stringify({peak:result.peak,count:result.count,bounce:result.bounce[0]}));
});

test('the B05 workshop uses M01 tabletop props without changing the simulation',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench;await renderer.cargo.ready;sim.enterAreaBC06();sim.enemies=[];sim.allies=[];
  sim.teleportPlayer(-45,-24.8,Math.atan2(-3.6,-3.5),-.13);
  const before=JSON.stringify(sim.snapshot());renderer.renderFrame(0,0);
  const root=renderer.staticGroup.getObjectByName('M02 B05 workbench dressing');
  return {objects:root?.children.map(n=>n.name),unchanged:before===JSON.stringify(sim.snapshot()),preset:renderer.lightingPreset.id};
 });
 expect(result.objects).toEqual(['M02 B05 ammo_tin_box','M02 B05 jerrycans','M02 B05 ammo_crate_wood']);
 expect(result.preset).toBe('night_1939_09_09');expect(result.unchanged).toBe(true);expect(errors).toEqual([]);
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · OFICINA B05";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.evaluate(()=>{const {renderer}=window.m02Bench;renderer.staticGroup.getObjectByName('M02 B05 workbench dressing').visible=false;renderer.renderFrame(0,0);});
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · BANCADA SEM DETALHES"}'});
 await page.screenshot({path:testInfo.outputPath('b05-workbench-undressed.png')});
 await page.evaluate(()=>{const {renderer}=window.m02Bench;renderer.staticGroup.getObjectByName('M02 B05 workbench dressing').visible=true;renderer.renderFrame(0,0);});
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · OFICINA B05"}'});
 await page.screenshot({path:testInfo.outputPath('b05-workbench.png')});
});

test('night lighting remains active in the B05 interior at Low quality',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench;sim.enterAreaBC06();sim.enemies=[];sim.allies=[];
  sim.teleportPlayer(-38,-24,Math.PI,-.08);const before=JSON.stringify(sim.snapshot());renderer.renderFrame(0,0);
  return {preset:renderer.lightingPreset.id,daylight:renderer.lighting.model.daylight,exposure:renderer.lighting.model.exposure,
   unchanged:before===JSON.stringify(sim.snapshot()),player:[sim.player.x,sim.player.z]};
 });
 expect(result.preset).toBe('night_1939_09_09');expect(result.daylight).toBe(0);expect(result.exposure).toBe(1.4);expect(result.unchanged).toBe(true);expect(errors).toEqual([]);
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · B05 · NOITE · LOW";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('night-b05-low.png')});
});

test('a real NPC reload produces a nearby audible M01 mechanism cue',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(async()=>{
  const {sim,renderer}=window.m02Bench,p=renderer.presentation,a=p.audio;await a.ctx.resume();
  sim.enterAreaBC06();sim.allies=[];const gun=sim.enemies.find(e=>e.id==='DE-B05');sim.enemies=[gun];
  Object.assign(gun,{x:2,y:0,z:100,mag:0,reserve:50,reloadingUntil:0,nextFireAt:1000,suppressed:0});
  Object.assign(sim.player,{x:0,y:0,z:100,eyeHeight:1.65,angle:0});sim.drainEvents();sim.tick(.05,{});
  const cues=sim.drainEvents().filter(e=>e.type==='actor-reload-cue'),before=JSON.stringify(sim.snapshot());
  p.syncSession(sim);a.stopAll(false);const dest=a.ctx.createMediaStreamDestination();a.master.connect(dest);
  const recorder=new MediaRecorder(dest.stream),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
  const count=a.diagnostics.eventCounts['npc-reload']??0;p.consume(cues,sim);
  await new Promise(r=>setTimeout(r,350));await new Promise(resolve=>{recorder.onstop=resolve;recorder.stop();});
  const blob=new Blob(chunks,{type:recorder.mimeType}),buffer=await a.ctx.decodeAudioData(await blob.arrayBuffer());
  let peak=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const v of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(v));
  const encoded=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  a.master.disconnect(dest);return {cues,peak,encoded,count:(a.diagnostics.eventCounts['npc-reload']??0)-count,unchanged:before===JSON.stringify(sim.snapshot()),state:a.ctx.state};
 });
 expect(result.cues.map(e=>e.phase)).toEqual(['open']);expect(result.count).toBe(1);expect(result.peak).toBeGreaterThan(.0001);
 expect(result.unchanged).toBe(true);expect(result.state).toBe('running');expect(errors).toEqual([]);
 writeFileSync(testInfo.outputPath('npc-reload.webm'),Buffer.from(result.encoded,'base64'));
 console.log('M02 NPC reload sound',JSON.stringify({peak:result.peak,count:result.count,cue:result.cues[0]}));
});

test('the real wz28 team reloads and covers the same visible target',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench;sim.enterAreaBC06();sim.clock=10;
  const gun=sim.allies.find(a=>a.id==='pl_aux_01'),loader=sim.allies.find(a=>a.id==='pl_aux_02');
  const target=sim.enemies.find(a=>a.id==='DE-B01'),near=sim.enemies.find(a=>a.id==='DE-B02');
  Object.assign(gun,{x:-2,y:0,z:75,mag:1,reserve:100,reloadingUntil:0,nextFireAt:0,suppressed:0,goal:null});
  Object.assign(loader,{x:-.5,y:0,z:75,mag:5,reserve:30,reloadingUntil:0,nextFireAt:100,suppressed:0,goal:null});
  Object.assign(target,{x:-2,y:0,z:65,health:1000,alive:true,nonCombatant:false,nextFireAt:100});
  Object.assign(near,{x:4,y:0,z:68,health:1000,alive:true,nonCombatant:false,nextFireAt:100});
  sim.allies=[gun,loader];sim.enemies=[target];sim.teleportPlayer(0,80,-Math.PI/2,-.1);sim.drainEvents();
  sim.tick(.05,{});const first=sim.events.find(e=>e.type==='actor-burst'&&e.shooterId===gun.id);
  loader.nextFireAt=0;sim.enemies.push(near);sim.tick(.05,{});
  const cover=sim.events.find(e=>e.type==='actor-burst'&&e.shooterId===loader.id);
  const snapshot=JSON.stringify(sim.snapshot());renderer.renderFrame(0,0);
  const visuals=renderer.presentation.characters.stats.actors.filter(a=>['szymon_kowal','pl_aux_02'].includes(a.id)).map(a=>({id:a.id,clip:a.clip}));
  const lighting={preset:renderer.lightingPreset.id,daylight:renderer.lighting.model.daylight,exposure:renderer.lighting.model.exposure,hemi:renderer.lighting.model.hemi.intensity};
  return {first,cover,gunMag:gun.mag,loaderMag:loader.mag,reloadingUntil:gun.reloadingUntil,clock:sim.clock,unchanged:snapshot===JSON.stringify(sim.snapshot()),visuals,lighting};
 });
 expect(result.first?.targetId).toBe('DE-B01');expect(result.cover?.targetId).toBe('DE-B01');expect(result.cover?.crewCoverFor).toBe('pl_aux_01');
 expect(result.gunMag).toBe(0);expect(result.loaderMag).toBe(4);expect(result.reloadingUntil).toBeGreaterThan(result.clock);
 expect(result.unchanged).toBe(true);expect(result.visuals.find(v=>v.id==='szymon_kowal')?.clip).toBe('rkm_reload');
 expect(result.lighting).toEqual({preset:'night_1939_09_09',daylight:0,exposure:1.4,hemi:2.25});
 expect(result.visuals.find(v=>v.id==='pl_aux_02')).toBeTruthy();expect(errors).toEqual([]);
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · DUPLA WZ.28";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('wz28-reload-cover-night.png')});
 await page.evaluate(()=>{const {renderer}=window.m02Bench;renderer.applyLightingPreset('neutral_review');renderer.renderFrame(0,0);});
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · DUPLA WZ.28 · LUZ TÉCNICA"}'});
 await page.screenshot({path:testInfo.outputPath('wz28-reload-cover-neutral.png')});
 console.log('M02 wz28 team',JSON.stringify({first:result.first?.targetId,cover:result.cover?.targetId,visuals:result.visuals,lighting:result.lighting}));
});

test('C12 exit warns before leaving an unrescued Lis and preserves the missing outcome',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.evaluate(()=>{
  const {sim}=window.m02Bench;sim.enterAreaCC09();sim.startC10OrderChanges();sim.detonateC10FixedArtillery();sim.enemies=[];
  sim.teleportPlayer(-54,54.1,Math.PI/2,-.12);sim.objective={id:'O09',status:'active'};
 });
 await page.click('#mission-resume');await page.waitForFunction(()=>document.querySelector('#door-prompt').textContent.includes('Recuar sem socorrer Lis'));
 await page.addStyleTag({content:'body:after{content:"INSPEÇÃO CONTROLADA · SAÍDA C12";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('c12-exit-without-lis.png')});
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.m02Bench.sim.areaC.c12Completed);
 const result=await page.evaluate(()=>{const s=window.m02Bench.sim;return {status:s.flags['m02.lis_status'],lis:s.m03ExportPackage.m03ImportState.lisEntry};});
 expect(result.status).toBe('missing');expect(result.lis.presentInShelter).toBe(false);expect(result.lis.canSpeakCanonicalWaterLine).toBe(false);
 expect(errors).toEqual([]);
});

test('B12 aid station presents the two physical stretchers at their authored positions',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.keyboard.press('Escape');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const result=await page.evaluate(()=>{
  const {sim,renderer}=window.m02Bench;sim.enterAreaCC09();sim.enemies=[];sim.allies=[];
  sim.teleportPlayer(-57,51,Math.PI,-.15);renderer.renderFrame(0,0);
  const groups=[];renderer.staticGroup.traverse(n=>{if(n.name.startsWith('M02 aid stretcher '))groups.push({name:n.name,parts:n.children.length,position:n.position.toArray()});});
  return groups;
 });
 expect(result).toEqual([
  {name:'M02 aid stretcher prop_b12_stretcher_1',parts:3,position:[-61.75,0,50.05]},
  {name:'M02 aid stretcher prop_b12_stretcher_2',parts:3,position:[-61.75,0,53.05]},
 ]);
 await page.addStyleTag({content:'#mission-menu{display:none!important}body:after{content:"INSPEÇÃO CONTROLADA · POSTO DE SOCORRO";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('b12-aid-stretchers.png')});
 expect(errors).toEqual([]);
});

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
 const result=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench,g=sim.grenades[0],v=renderer.grenadeViews.views.get(g.id);return {x:g.x,y:g.y,z:g.z,vx:g.vx,vz:g.vz,view:v.position.toArray(),ammo:sim.grenadeAmmo,sounds:renderer.presentation.audio.diagnostics.eventCounts['grenade-bounce']??0};});
 expect(result.x).toBeGreaterThanOrEqual(wall.max.x);expect(result.vx).toBeGreaterThan(0);expect(result.ammo).toBe(1);
 expect(result.view).toEqual([result.x,result.y,result.z]);expect(result.sounds).toBeGreaterThan(0);await page.screenshot({path:testInfo.outputPath('grenade-wall-bounce.png')});
 expect(errors).toEqual([]);console.log('M02 grenade bounce in B05',JSON.stringify({wall,result}));
});

test('the normal grenade input displays the live projectile and a checkpoint removes it',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:800,height:450});await page.goto('/COD-guerra/m02.html?quality=low&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 const handBefore=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;window.m02BeforeGrenade=sim.snapshot();const p=renderer.presentation,hand=p.weapon.root.getObjectByName('hand_r');return hand.getWorldPosition(hand.position.clone()).project(p.weaponCamera).toArray();});
 await page.keyboard.press('KeyG');await page.waitForFunction(()=>window.m02Diagnostics().grenades.active===1);
 const follow=await page.evaluate(()=>{const p=window.m02Bench.renderer.presentation,hand=p.weapon.root.getObjectByName('hand_r');return {...window.m02Diagnostics().presentation.grenadeFollowThrough,hand:hand.getWorldPosition(hand.position.clone()).project(p.weaponCamera).toArray()};});
 expect(follow.startedAt).not.toBeNull();expect(follow.weight).toBeGreaterThan(0);
 expect(Math.hypot(follow.hand[0]-handBefore[0],follow.hand[1]-handBefore[1])).toBeGreaterThan(.04);
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
 const restored=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;sim.restoreSnapshot(window.m02BeforeGrenade);renderer.renderFrame(0,0);return {ammo:sim.grenadeAmmo,active:renderer.grenadeViews.diagnostics.active,follow:renderer.presentation.diagnostics.grenadeFollowThrough};});
 expect(restored).toEqual({ammo:2,active:0,follow:{startedAt:null,weight:0}});expect(errors).toEqual([]);
 console.log('M02 real grenade input',JSON.stringify({shown,handBefore,follow,restored}));
});

test('High quality shows the released grenade and returning first-person arm',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await page.goto('/COD-guerra/m02.html?quality=high&debug=1');
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled);
 await page.click('#mission-start');await page.waitForFunction(()=>window.m02Diagnostics().state==='playing');
 await page.evaluate(()=>{const freeze=()=>{if(window.m02Bench.renderer.presentation.grenadeFollowThroughWeight>0)window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape'}));else requestAnimationFrame(freeze);};requestAnimationFrame(freeze);});
 await page.keyboard.press('KeyG');await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 const shot=await page.evaluate(()=>{const {sim,renderer}=window.m02Bench;return {ammo:sim.grenadeAmmo,projectiles:sim.grenades.length,follow:renderer.presentation.diagnostics.grenadeFollowThrough};});
 expect(shot.ammo).toBe(1);expect(shot.projectiles).toBe(1);expect(shot.follow.weight).toBeGreaterThan(0);
 await page.addStyleTag({content:'#mission-menu{display:none!important}.mission-paused .hud-layer{visibility:visible}body:after{content:"LANÇAMENTO REAL · G · HIGH";position:fixed;right:12px;top:12px;z-index:80;padding:6px;background:#111;color:#fff;font:12px sans-serif}'});
 await page.screenshot({path:testInfo.outputPath('grenade-follow-through-high.png')});expect(errors).toEqual([]);
 console.log('M02 High grenade follow-through',JSON.stringify(shot));
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
