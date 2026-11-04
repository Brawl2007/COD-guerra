import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {M01ActRunner} from '../../src/game/m01-acts.js';
import {actControls,ACT_TICK} from '../helpers/m01-act-route.js';
import {actBControls} from '../helpers/m01-act-b-route.js';

// R4 INC-2 smoke (production build, Chromium/SwiftShader, real controls and pointer lock): the QA flag boots Act VII-b on its «Mais tarde…» card, the HUD shows only the label «DURANTE O DIA»,
// CP-I is stored in the schema 3 envelope when the card ends, a save in the middle of the barrage (shells in the air) and one in the middle of the first attack restore and play on, the bearers carry
// the wounded man, CP-I2 is stored when the first attack breaks, and the debrief follows the end card with the paragraphs of both area acts. The saves are made in Node with the same simulation.
// A state/presentation check, not a playtest and not a frame-rate figure.
const OUT=new URL('../../docs/verification/m01-runtime/inc2-vii-b-2026-11-04/',import.meta.url).pathname;
const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3',ID='act_vii_b_north_day',LABEL='DURANTE O DIA';
const live=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});

let scenes;
function build(){
  // The real chain: VII-a to its end (the passive pilot), then the runner's own VII-b (carry, flags, seed), played by the VII-b pilots up to the moments the page is shown.
  const a=new M01AreaSimulation(19390901,{difficulty:'recruta'}),sa={arrived:false,lastHealth:100};
  for(let i=0;i<30000&&!a.mission.complete;i++){a.tick(ACT_TICK,actControls(a,'passive',sa));a.drainEvents();}
  const runner=new M01ActRunner({enabled:true}),sim=runner.enter(a),state={arrived:false,lastHealth:100};
  const until=(done,max=40000,mode='passive')=>{for(let i=0;i<max&&!done();i++){sim.tick(ACT_TICK,actBControls(sim,mode,state));sim.drainEvents();}if(!done())throw new Error('scene not reached');};
  const face=(env,angle,pitch=.02)=>{Object.assign(env.actSave.player,{crouched:false,angle,pitch});return env;};
  const out={};
  until(()=>!sim.scene);out.arrival=live(sim);
  until(()=>sim.timers.barrage.run?.k>=6&&sim.timers.barrage.run.shells.length>0);out.barrage=face(live(sim),-Math.PI/2);
  until(()=>sim.timers.barrage.done.brg_npb_1&&sim.clock>sim.timers.barrage.done.brg_npb_1+1);   // barrage 1 is over: the craters it left, seen from the post (the nearest one)
  const near=sim.sectors.damage.filter(d=>d.id.startsWith('np_shell_crater_')).sort((c,d)=>Math.hypot(c.x-sim.player.x,c.z-sim.player.z)-Math.hypot(d.x-sim.player.x,d.z-sim.player.z))[0];
  out.craters=live(sim);Object.assign(out.craters.actSave.player,{crouched:false,angle:Math.atan2(near.z-sim.player.z,near.x-sim.player.x),pitch:-.05});
  until(()=>sim.timers.medics.state==='carry'&&sim.clock-sim.timers.medics.since>9&&sim.actor(sim.timers.medics.patient).carriedBy);   // the bearers walking south with the wounded man on the first one's shoulder
  const m=sim.actor('np_maqueiro_0');   // the player turns to them
  out.carry=live(sim);const at={x:-476,z:-1118};   // behind the line, west of the bearers' way, 20-35 m from them (a QA viewpoint: the player may stand anywhere in the area)
  Object.assign(out.carry.actSave.player,{...at,crouched:false,angle:Math.atan2(m.z-at.z,m.x-at.x),pitch:-.03});
  const inView=a=>{const b=Math.atan2(a.z-sim.player.z,a.x-sim.player.x)+Math.PI/2;return Math.abs(Math.atan2(Math.sin(b),Math.cos(b)))<.6;};
  until(()=>sim.timers.wave&&sim.clock-sim.timers.wave.at>8&&sim.enemies.filter(a=>a.alive&&a.active&&!a.crouched&&inView(a)).length>=3);out.attack=face(live(sim),-Math.PI/2,.015);   // the first attack, at least three Germans up in the field of view
  // one second before the first attack breaks (found by running to the break, then again 20 ticks short of it): the page is watched storing CP-I2
  const nearBreak=(()=>{const copy=runner.enter(a),st={arrived:false,lastHealth:100};let n=0;
    for(;n<60000&&!(copy.timers.wave?.echs[0].brokenAt>0);n++){copy.tick(ACT_TICK,actBControls(copy,'passive',st));copy.drainEvents();}
    const again=runner.enter(a),s2={arrived:false,lastHealth:100};for(let i=0;i<n-20;i++){again.tick(ACT_TICK,actBControls(again,'passive',s2));again.drainEvents();}return face(live(again),-Math.PI/2,.02);})();
  out.nearBreak=nearBreak;
  until(()=>sim.timers.barrage.run?.id==='brg_npb_2'&&sim.timers.barrage.run.k>=3);out.barrage2=face(live(sim),-Math.PI/2);
  until(()=>sim.timers.endAt!==null,60000);out.end=live(sim);
  return out;
}
test.beforeAll(()=>{scenes=build();mkdirSync(OUT,{recursive:true});});

async function boot(page,query,{save=null,key=ACT_KEY,click='#start'}={}){
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);if(process.env.ACT_DEBUG)console.log('PAGEERROR',e.message,e.stack);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(save)await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key,save});
  await page.goto(query);await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:150000});
  await page.locator(click).click();
  return errors;
}
const diag=page=>page.evaluate(()=>{const d=window.gameDiagnostics();return {act:d.m01.act??null,scene:d.m01.scene,phase:d.missionPhase,complete:d.complete,clock:d.clock,player:d.player,
  alive:d.m01.enemyAlive,clockText:document.querySelector('#battle-clock')?.textContent,objective:document.querySelector('#objective-text')?.textContent,status:document.querySelector('#objective-status')?.textContent,
  card:document.querySelector('#title-card')?.textContent,craters:(d.m01.damage??[]).filter(x=>x.id.startsWith('np_shell_crater_')).length,
  pending:(d.m01.pendingAudio??[]).map(s=>s.kind),checkpoints:d.m01.checkpoints,flags:d.m01.flags,dressingMeshes:d.m01.areaDressing?.meshes??null};});
const settle=async page=>{await page.waitForTimeout(2500);await page.waitForFunction(label=>document.querySelector('#battle-clock')?.textContent===label,LABEL,{timeout:120000});};   // software GL under load can take longer than 2.5 s to paint the HUD

test('QA flag ?act=vii-b boots Act VII-b on «Mais tarde…»; the HUD shows only the label «DURANTE O DIA»; CP-I is stored in the schema 3 envelope when the card ends',async({page})=>{
  test.setTimeout(300000);
  const errors=await boot(page,'?debug=1&act=vii-b');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_b_north_day'&&window.gameDiagnostics().m01.scene==='cs_npb_entry',null,{timeout:60000});
  await expect(page.locator('#mission-briefing')).toContainText('QA · Ato VII-b');
  await page.waitForFunction(()=>window.gameDiagnostics().clock>3.2,null,{timeout:60000});
  const card=await diag(page);expect(card.card).toContain('Mais tarde');expect(card.card).toContain('durante o dia');expect(card.card).toContain('desconhecido');expect(card.card).toContain('reconstrução e dramatização');
  await page.screenshot({path:OUT+'01-entry-card.png'});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.scene===null,null,{timeout:60000});
  await settle(page);
  const after=await diag(page);
  expect(after.phase).toBe('NPB_ARRIVAL');expect(after.clockText).toBe(LABEL);expect(after.clockText).not.toMatch(/\d\d:\d\d/);
  expect(after.objective).toBe('Reabasteça-se e ocupe o flanco oeste do parapeito');
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),ACT_KEY);
  expect(stored.schema).toBe(3);expect(stored.act).toBe(ID);expect(Object.keys(stored).sort()).toEqual(['act','actSave','carry','missionId','schema']);
  expect(stored.actSave.checkpointsReached).toEqual(['cp_npb_i_dia']);expect(stored.actSave.timers.barrage).toEqual({done:{},run:null});expect(stored.actSave.timers.medics.state).toBe('idle');
  await expect(page.locator('#checkpoint-name')).toHaveText('CP-I · Perímetro norte — durante o dia · Soldado');   // a new game starts at the default level
  await page.screenshot({path:OUT+'02-arrival-default-view.png'});
  expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-boot.json',JSON.stringify({card,after,checkpoints:stored.actSave.checkpointsReached,errors},null,1)+'\n');
});

test('schema 3 saves restore the act: the arrival with the resupply marker, the barrage with shells in the air (craters, whistle), the bearers carrying, the first attack, the second barrage',async({page,context})=>{
  test.setTimeout(1500000);
  const shots=[['arrival',OUT+'03-arrival-resupply.png'],['barrage',OUT+'04-barrage-impacts.png'],['craters',OUT+'04b-craters-after-barrage.png'],['carry',OUT+'05-bearers-carry.png'],['attack',OUT+'06-attack-north.png'],['barrage2',OUT+'07-barrage-pause.png']],report={};
  for(const [name,file] of shots){
    const p=name==='arrival'?page:await context.newPage();
    const errors=await boot(p,'?debug=1&acts=1',{save:scenes[name],click:'#continue'});
    await p.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_b_north_day',null,{timeout:60000});
    await settle(p);
    let d=await diag(p);
    if(name==='barrage'||name==='barrage2'){
      // the page plays the shells in the air: wait for a crater of the sim and take the picture while the burst is on the screen
      const before=d.craters;
      await p.waitForFunction(n=>{const x=window.gameDiagnostics().m01.damage.filter(d=>d.id.startsWith('np_shell_crater_')).length;return x>n;},before,{timeout:120000});
      d=await diag(p);
    }
    report[name]={...d,errors};
    expect(d.clockText).toBe(LABEL);expect(errors).toEqual([]);
    if(name==='arrival'){expect(d.phase).toBe('NPB_ARRIVAL');expect(d.objective).toBe('Reabasteça-se e ocupe o flanco oeste do parapeito');}
    if(name==='barrage'||name==='barrage2'){expect(d.phase).toBe('NPB_BARRAGE');expect(d.status).toBe('Fogo de artilharia · abrigue-se atrás do parapeito');expect(d.objective).toBe('Abrigue-se atrás do parapeito');expect(d.craters).toBeGreaterThan(0);}
    if(name==='carry'){expect(scenes.carry.actSave.timers.medics.state).toBe('carry');}   // the page shows what the save says: the first bearer carries the man on his shoulder
    if(name==='craters'){expect(d.craters).toBeGreaterThanOrEqual(10);expect(d.dressingMeshes).toBe(report.arrival.dressingMeshes+2);}   // the records of the first barrage's shells are in the page's damage list, and the dressing drew them (two instanced meshes: discs and rims)
    if(name==='arrival'){expect(d.dressingMeshes).toBeGreaterThan(5);}
    if(name==='attack'){expect(d.phase).toBe('NPB_ATTACK');expect(d.status).toMatch(/^Linha norte · \d+ atacantes? no campo · \d+ caídos?$/);expect(d.status).not.toMatch(/\.ª/);}
    await p.screenshot({path:file});
    if(name==='barrage'||name==='barrage2'){await p.waitForTimeout(900);await p.screenshot({path:file.replace('.png','-later.png')});}   // the same view a moment later (the burst of the new crater has gone, its smoke is up)
    if(p!==page)await p.close();
  }
  writeFileSync(OUT+'smoke-saves.json',JSON.stringify(report,null,1)+'\n');
});

test('CP-I2: the game stores the checkpoint of the interval when the first attack breaks, in the same schema 3 envelope as CP-I',async({page})=>{
  test.setTimeout(600000);
  const errors=await boot(page,'?debug=1&acts=1',{save:scenes.nearBreak,click:'#continue'});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_b_north_day',null,{timeout:60000});
  const cps=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).actSave.checkpointsReached,ACT_KEY);
  expect(await cps()).toEqual(['cp_npb_i_dia']);
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).actSave.checkpointsReached.includes('cp_npb_i2_pausa'),ACT_KEY,{timeout:300000});
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),ACT_KEY);
  expect(stored.schema).toBe(3);expect(stored.act).toBe(ID);expect(Object.keys(stored).sort()).toEqual(['act','actSave','carry','missionId','schema']);
  expect(stored.actSave.checkpointsReached).toEqual(['cp_npb_i_dia','cp_npb_i2_pausa']);expect(stored.actSave.timers.wave.echs[0].brokenAt).not.toBeNull();expect(stored.actSave.timers.wave.echs).toHaveLength(1);
  expect(stored.actSave.flags['m01npb.wave']).toBe('lull');expect(Object.keys(stored.actSave.timers.barrage.done)).toEqual(['brg_npb_1']);
  await expect(page.locator('#checkpoint-name')).toHaveText('CP-I2 · Perímetro norte — intervalo · Recruta');
  await page.waitForTimeout(3500);await page.screenshot({path:OUT+'06b-first-attack-breaks.png'});   // the Germans of the first attack falling back across the open, seen from the west post
  const d=await diag(page);expect(d.phase).toBe('NPB_ATTACK');
  expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-cpi2-stored.json',JSON.stringify({checkpoints:stored.actSave.checkpointsReached,flag:stored.actSave.flags['m01npb.wave'],brokenAt:stored.actSave.timers.wave.echs[0].brokenAt,clock:stored.actSave.clock,status:d.status,errors},null,1)+'\n');
});

test('the end of VII-b is the end card and then the debrief, with the paragraphs of both area acts (VII-a\'s, then VII-b\'s) and the current act\'s',async({page})=>{
  test.setTimeout(600000);
  const errors=await boot(page,'?debug=1&acts=1',{save:scenes.end,click:'#continue'});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.scene==='cs_npb_end',null,{timeout:90000});
  await page.waitForTimeout(3500);await page.screenshot({path:OUT+'08-end-card.png'});
  await page.waitForSelector('#complete:not(.hidden)',{timeout:90000});
  const debrief=await page.locator('#debrief').textContent();
  expect(debrief).toContain('Por volta das 07:00');expect(debrief).toContain('Durante o dia, novos ataques vindos do norte');expect(debrief).toContain('As fontes do repositório não dizem');
  expect(debrief.indexOf('Por volta das 07:00')).toBeLessThan(debrief.indexOf('Durante o dia, novos ataques'));
  await page.screenshot({path:OUT+'09-debrief.png'});
  expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-debrief.json',JSON.stringify({debrief,errors},null,1)+'\n');
});
