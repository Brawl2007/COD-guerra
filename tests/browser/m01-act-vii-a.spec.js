import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {actControls,ACT_TICK} from '../helpers/m01-act-route.js';
import {route} from '../helpers/m01-route.js';

// R4 INC-1 smoke (production build, Chromium/SwiftShader, real controls and pointer lock): the QA flag boots Act VII-a on its card, the area is drawn and lit, the HUD shows
// only the approximate label, a schema 3 save restores mid-wave, a completed current act opens the transition card (only with the switch on), and the debrief comes after
// the last act (VII-b since INC-2). The saves are made in Node with the same simulation. A state/presentation check, not a playtest and not a frame-rate figure.
const OUT=new URL('../../docs/verification/m01-runtime/acts-inc1-2026-10-25/',import.meta.url).pathname;
const OUT2=new URL('../../docs/verification/m01-runtime/vii-a-duration-pkg1-2026-11-04/',import.meta.url).pathname;   // the lull and the second echelon (2026-11-04)
const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3',BW_KEY='cod-guerra:checkpoint:m01:v2';
const envelope=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});

let scenes;
// 2026-11-04 (CP-F, the pause checkpoint): a save one second before the first echelon breaks (found by running the passive route to the tick of the break, then again 20 ticks short of it),
// so the page can be watched storing the checkpoint when the break comes.
function nearBreak(){
  const run=n=>{const sim=new M01AreaSimulation(19390901,{difficulty:'recruta'}),state={arrived:false,lastHealth:100};let i=0;
    for(;i<n&&!(sim.timers.wave?.echs[0].brokenAt>0);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}return {sim,ticks:i};};
  return envelope(run(run(1e5).ticks-20).sim);
}
function build(){
  const sim=new M01AreaSimulation(19390901,{difficulty:'recruta'}),state={arrived:false,lastHealth:100};
  const tickUntil=(done,max=6000)=>{for(let i=0;i<max&&!done();i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}};
  tickUntil(()=>!sim.scene);
  const spawn=envelope(sim);spawn.actSave.player.angle=-Math.PI/2;spawn.actSave.player.pitch=.03;
  // Mid-wave: the first tick, 8 s into the wave, with at least three Germans up (bounding or rising to fire) in the player's field of view.
  const p=sim.player,inView=a=>Math.abs(Math.atan2(Math.sin(Math.atan2(a.z-p.z,a.x-p.x)+Math.PI/2),Math.cos(Math.atan2(a.z-p.z,a.x-p.x)+Math.PI/2)))<.6;
  tickUntil(()=>sim.timers.wave&&sim.clock-sim.timers.wave.at>8&&sim.enemies.filter(a=>a.alive&&a.active&&!a.crouched&&inView(a)).length>=3);
  const mid=envelope(sim);Object.assign(mid.actSave.player,{crouched:false,angle:-Math.PI/2,pitch:.015});
  const west=envelope(sim);Object.assign(west.actSave.player,{crouched:false,angle:Math.PI+.06,pitch:-.03});
  const w=sim.plan.layout.points.wreck,wreck=envelope(sim);Object.assign(wreck.actSave.player,{crouched:false,angle:Math.atan2(w.z-p.z,w.x-p.x),pitch:.01,aiming:true});
  // 2026-11-04: the fight is two echelons with a lull between them. A save 10 s before the lull ends (the first echelon is off the field, the overwatch holds the edge) and one 25 s
  // into the second echelon (the lanes of the second echelon come out of the trees one after the other).
  tickUntil(()=>sim.timers.wave.lullUntil>0&&sim.clock>sim.timers.wave.lullUntil-10,9000);
  const lull=envelope(sim);Object.assign(lull.actSave.player,{crouched:false,angle:-Math.PI/2,pitch:.015});
  tickUntil(()=>sim.timers.wave.ech===1&&sim.clock-sim.timers.wave.echs[1].at>25,9000);
  const ech2=envelope(sim);Object.assign(ech2.actSave.player,{crouched:false,angle:-Math.PI/2,pitch:.015});
  tickUntil(()=>sim.timers.endAt!==null,9000);   // two echelons: the passive pilot repels the attack ~4 minutes (4800 ticks) after the wave starts
  const end=envelope(sim);
  return {spawn,mid,west,wreck,lull,ech2,end,nearBreak:nearBreak()};
}
test.beforeAll(()=>{scenes=build();mkdirSync(OUT,{recursive:true});mkdirSync(OUT2,{recursive:true});});

async function boot(page,query,{save=null,key=ACT_KEY,click='#start'}={}){
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);if(process.env.ACT_DEBUG)console.log('PAGEERROR',e.message,e.stack);});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(save)await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key,save});
  await page.goto(query);await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:150000});
  await page.locator(click).click();
  return errors;
}
const diag=page=>page.evaluate(()=>{const d=window.gameDiagnostics();return {act:d.m01.act??null,scene:d.m01.scene,phase:d.missionPhase,complete:d.complete,clock:d.clock,player:d.player,
  alive:d.m01.enemyAlive,clockText:document.querySelector('#battle-clock')?.textContent,objective:document.querySelector('#objective-text')?.textContent,status:document.querySelector('#objective-status')?.textContent,
  card:document.querySelector('#title-card')?.textContent,frames:d.m01.renderedFrames??null};});
const settle=async page=>{await page.waitForTimeout(2500);await page.waitForFunction(()=>document.querySelector('#battle-clock')?.textContent==='MANHÃ · ~07:00',null,{timeout:120000});};   // (software GL under load can take longer than 2.5 s to paint the HUD of the act it loaded)

test('QA flag ?act=vii-a boots Act VII-a on its card; the HUD shows only the approximate morning label',async({page})=>{
  test.setTimeout(300000);
  const errors=await boot(page,'?debug=1&act=vii-a');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_a_north'&&window.gameDiagnostics().m01.scene==='cs_np_entry',null,{timeout:60000});
  await expect(page.locator('#mission-briefing')).toContainText('QA · Ato VII-a');
  await page.waitForFunction(()=>window.gameDiagnostics().clock>3.2,null,{timeout:60000});
  const card=await diag(page);expect(card.card).toContain('Perímetro norte de Tczew');expect(card.card).toContain('fonte única');
  await page.screenshot({path:OUT+'01-entry-card.png'});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.scene===null,null,{timeout:60000});
  await settle(page);
  const after=await diag(page);
  expect(after.phase).toBe('NP_ARRIVAL');expect(after.clockText).toBe('MANHÃ · ~07:00');expect(after.clockText).not.toMatch(/\d\d:\d\d:\d\d/);
  expect(after.objective).toBe('Junte-se à secção no parapeito norte');
  await page.screenshot({path:OUT+'02-arrival-default-view.png'});
  expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-boot.json',JSON.stringify({card,after,errors},null,1)+'\n');
});

test('schema 3 saves restore the slice: spawn, the line mid-wave (north and west), the lull, the second echelon, the end beat and, since INC-2, the «Mais tarde…» card of VII-b (the debrief now follows VII-b)',async({page,context})=>{
  test.setTimeout(1500000);   // eight pages in one test: software GL on a shared machine needs more than ten minutes
  const shots=[['spawn',OUT+'03-spawn-north.png'],['mid',OUT+'04-line-north-midwave.png'],['west',OUT+'05-line-west-ckm.png'],['wreck',OUT+'05b-wreck-aimed.png'],
    ['lull',OUT2+'01-lull-overwatch-only.png'],['ech2',OUT2+'02-second-echelon.png']],report={};
  for(const [name,file] of shots){
    const p=name==='spawn'?page:await context.newPage();
    const errors=await boot(p,'?debug=1&acts=1',{save:scenes[name],click:'#continue'});
    await p.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_a_north',null,{timeout:60000});
    await settle(p);
    const d=await diag(p);report[name]={...d,errors};
    expect(d.clockText).toBe('MANHÃ · ~07:00');expect(errors).toEqual([]);
    if(name!=='spawn')expect(d.phase).toBe('NP_ATTACK');
    if(name==='lull')expect(d.status).toMatch(/^Linha norte · pausa · /);   // the status line says the pause
    if(name==='ech2')expect(d.status).toMatch(/^Linha norte · 2\.ª vaga · /);   // and the second echelon
    await p.screenshot({path:file});
    if(p!==page)await p.close();
  }
  const p=await context.newPage();
  const errors=await boot(p,'?debug=1&acts=1',{save:scenes.end,click:'#continue'});
  await p.waitForFunction(()=>window.gameDiagnostics().m01.scene==='cs_np_end',null,{timeout:90000});
  await p.waitForTimeout(3500);await p.screenshot({path:OUT+'06-end-card.png'});
  // INC-2 (2026-11-04): VII-a has a next act now, so its end is the transition card into VII-b («Mais tarde…»), not the debrief; the debrief comes after VII-b (tests/browser/m01-act-vii-b.spec.js).
  await p.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_b_north_day'&&window.gameDiagnostics().m01.scene==='cs_npb_entry',null,{timeout:90000});
  await p.waitForFunction(()=>window.gameDiagnostics().clock>3,null,{timeout:60000});
  expect(await p.locator('#complete').evaluate(el=>el.classList.contains('hidden'))).toBe(true);
  expect(await p.locator('#title-card').textContent()).toContain('Mais tarde');
  await p.screenshot({path:OUT+'07-transition-card-into-vii-b.png'});
  report.end={card:await p.locator('#title-card').textContent(),errors};expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-saves.json',JSON.stringify(report,null,1)+'\n');
});

test('CP-F (Captain\'s decision 2026-11-04): the game stores the pause checkpoint when the first echelon breaks, in the same schema 3 envelope as the arrival',async({page})=>{
  test.setTimeout(600000);
  const errors=await boot(page,'?debug=1&acts=1',{save:scenes.nearBreak,click:'#continue'});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_a_north',null,{timeout:60000});
  const cps=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).actSave.checkpointsReached,ACT_KEY);
  expect(await cps()).toEqual(['cp_np_e_perimetro']);
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).actSave.checkpointsReached.includes('cp_np_f_pausa'),ACT_KEY,{timeout:300000});
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),ACT_KEY);
  expect(stored.schema).toBe(3);expect(stored.act).toBe('act_vii_a_north');expect(Object.keys(stored).sort()).toEqual(['act','actSave','carry','missionId','schema']);
  expect(stored.actSave.checkpointsReached).toEqual(['cp_np_e_perimetro','cp_np_f_pausa']);
  expect(stored.actSave.timers.wave.echs[0].brokenAt).not.toBeNull();expect(stored.actSave.timers.wave.echs).toHaveLength(1);expect(stored.actSave.flags['m01np.wave']).toBe('lull');
  await expect(page.locator('#checkpoint-name')).toHaveText('CP-F · Perímetro norte — pausa · Recruta');
  const d=await diag(page);expect(d.phase).toBe('NP_ATTACK');expect(d.status).toMatch(/^Linha norte · (vaga a recuar|pausa) · /);
  expect(errors).toEqual([]);
  writeFileSync(OUT2+'smoke-cpf-stored.json',JSON.stringify({checkpoints:stored.actSave.checkpointsReached,flag:stored.actSave.flags['m01np.wave'],brokenAt:stored.actSave.timers.wave.echs[0].brokenAt,clock:stored.actSave.clock,status:d.status,errors},null,1)+'\n');
});

test('a death in the second echelon returns to CP-F, the pause, and not to the arrival',async({page})=>{
  test.setTimeout(600000);
  // 25 s into the second echelon (the checkpoint inside this save is CP-F), the player outside the area with the out-of-bounds countdown nearly out: the next tick ends this life
  const save=JSON.parse(JSON.stringify(scenes.ech2));Object.assign(save.actSave.player,{x:-700});save.actSave.timers.boundary=7.99;
  expect(save.actSave.resumeCheckpoint.checkpointsReached).toEqual(['cp_np_e_perimetro','cp_np_f_pausa']);
  const errors=await boot(page,'?debug=1&acts=1',{save,click:'#continue'});
  await page.waitForFunction(()=>window.gameDiagnostics().death.beat!==null,null,{timeout:120000});
  const beat=await page.evaluate(()=>window.gameDiagnostics().death.beat);
  expect(beat.cause).toBe('bounds');expect(beat.checkpoint).toBe('cp_np_f_pausa');
  await expect(page.locator('#death-note')).toHaveText('A retomar em CP-F · Perímetro norte — pausa · Recruta');
  await page.waitForFunction(()=>window.gameDiagnostics().death.beat===null&&/pausa|a recuar/.test(document.querySelector('#objective-status')?.textContent??''),null,{timeout:120000});
  const after=await diag(page),cps=await page.evaluate(()=>window.gameDiagnostics().m01.checkpoints);
  expect(cps).toEqual(['cp_np_e_perimetro','cp_np_f_pausa']);expect(after.phase).toBe('NP_ATTACK');expect(after.status).toMatch(/^Linha norte · (vaga a recuar|pausa) · /);
  expect(after.clock).toBeLessThan(scenes.ech2.actSave.clock-20);   // the clock went back to the pause (the second echelon had been on the field 25 s)
  expect(errors).toEqual([]);
  writeFileSync(OUT2+'smoke-cpf-death.json',JSON.stringify({beat,after,checkpoints:cps,errors},null,1)+'\n');
});

test('a completed current act: debrief with the switch off (unchanged), transition card into VII-a with ?acts=1',async({page,context})=>{
  test.setTimeout(600000);
  const bw=route(19390901).sim.checkpoint;expect(bw.mission.complete).toBe(true);
  const errorsOff=await boot(page,'?debug=1',{save:bw,key:BW_KEY,click:'#continue'});
  await page.waitForSelector('#complete:not(.hidden)',{timeout:60000});
  const off=await page.evaluate(()=>({act:window.gameDiagnostics().m01.act??null,debrief:document.querySelector('#debrief').textContent}));
  expect(off.act).toBe(null);expect(off.debrief).not.toContain('Às ~07:00 — hora de uma única fonte');expect(errorsOff).toEqual([]);   // the VII-a paragraph; f13d2292 reworded it from «Por volta das 07:00», which left this guard vacuous
  const p=await context.newPage();
  const errorsOn=await boot(p,'?debug=1&acts=1',{save:bw,key:BW_KEY,click:'#continue'});
  await p.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_a_north'&&window.gameDiagnostics().m01.scene==='cs_np_entry',null,{timeout:60000});
  await p.waitForFunction(()=>window.gameDiagnostics().clock>3,null,{timeout:60000});
  await p.screenshot({path:OUT+'08-transition-card-from-roll-call.png'});
  const stored=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),ACT_KEY);
  expect(stored.schema).toBe(3);expect(stored.carry.from).toBe('act_bw_0430_0705');expect(stored.carry.events).toContain('evt_m01_west_demolition');
  expect(errorsOn).toEqual([]);
  writeFileSync(OUT+'smoke-transition.json',JSON.stringify({off:{act:off.act},on:{carryFrom:stored.carry.from,events:stored.carry.events.length}},null,1)+'\n');
});
