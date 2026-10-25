import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {actControls,ACT_TICK} from '../helpers/m01-act-route.js';
import {route} from '../helpers/m01-route.js';

// R4 INC-1 smoke (production build, Chromium/SwiftShader, real controls and pointer lock): the QA flag boots Act VII-a on its card, the area is drawn and lit, the HUD shows
// only the approximate label, a schema 3 save restores mid-wave, a completed current act opens the transition card (only with the switch on), and the debrief comes after
// the last act. The saves are made in Node with the same simulation. A state/presentation check, not a playtest and not a frame-rate figure.
const OUT=new URL('../../docs/verification/m01-runtime/acts-inc1-2026-10-25/',import.meta.url).pathname;
const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3',BW_KEY='cod-guerra:checkpoint:m01:v2';
const envelope=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});

let scenes;
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
  tickUntil(()=>sim.timers.endAt!==null);
  const end=envelope(sim);
  return {spawn,mid,west,wreck,end};
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
  alive:d.m01.enemyAlive,clockText:document.querySelector('#battle-clock')?.textContent,objective:document.querySelector('#objective-text')?.textContent,
  card:document.querySelector('#title-card')?.textContent,frames:d.m01.renderedFrames??null};});
const settle=page=>page.waitForTimeout(2500);

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

test('schema 3 saves restore the slice: spawn, the line mid-wave (north and west), the end beat and the debrief after the last act',async({page,context})=>{
  test.setTimeout(600000);
  const shots=[['spawn','03-spawn-north.png'],['mid','04-line-north-midwave.png'],['west','05-line-west-ckm.png'],['wreck','05b-wreck-aimed.png']],report={};
  for(const [name,file] of shots){
    const p=name==='spawn'?page:await context.newPage();
    const errors=await boot(p,'?debug=1&acts=1',{save:scenes[name],click:'#continue'});
    await p.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_a_north',null,{timeout:60000});
    await settle(p);
    const d=await diag(p);report[name]={...d,errors};
    expect(d.clockText).toBe('MANHÃ · ~07:00');expect(errors).toEqual([]);
    if(name!=='spawn')expect(d.phase).toBe('NP_ATTACK');
    await p.screenshot({path:OUT+file});
    if(p!==page)await p.close();
  }
  const p=await context.newPage();
  const errors=await boot(p,'?debug=1&acts=1',{save:scenes.end,click:'#continue'});
  await p.waitForFunction(()=>window.gameDiagnostics().m01.scene==='cs_np_end',null,{timeout:90000});
  await p.waitForTimeout(3500);await p.screenshot({path:OUT+'06-end-card.png'});
  await p.waitForSelector('#complete:not(.hidden)',{timeout:90000});
  const debrief=await p.locator('#debrief').textContent();
  expect(debrief).toContain('Por volta das 07:00');expect(debrief).toContain('fonte');
  await p.screenshot({path:OUT+'07-debrief.png'});
  report.end={debrief,errors};expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-saves.json',JSON.stringify(report,null,1)+'\n');
});

test('a completed current act: debrief with the switch off (unchanged), transition card into VII-a with ?acts=1',async({page,context})=>{
  test.setTimeout(600000);
  const bw=route(19390901).sim.checkpoint;expect(bw.mission.complete).toBe(true);
  const errorsOff=await boot(page,'?debug=1',{save:bw,key:BW_KEY,click:'#continue'});
  await page.waitForSelector('#complete:not(.hidden)',{timeout:60000});
  const off=await page.evaluate(()=>({act:window.gameDiagnostics().m01.act??null,debrief:document.querySelector('#debrief').textContent}));
  expect(off.act).toBe(null);expect(off.debrief).not.toContain('Por volta das 07:00');expect(errorsOff).toEqual([]);
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
