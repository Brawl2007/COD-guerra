import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {M01ActRunner} from '../../src/game/m01-acts.js';
import {actControls,ACT_TICK} from '../helpers/m01-act-route.js';
import {actBControls,ACT_B_TICK} from '../helpers/m01-act-b-route.js';
import {actCControls,ACT_C_TICK} from '../helpers/m01-act-c-route.js';

// R4 INC-3 smoke (production build, Chromium/SwiftShader, real controls and pointer lock): the QA flag boots Act VII-c on its order card («Por volta das 17:00»), then «Ao anoitecer»; the HUD shows only the label
// «ANOITECER»; the light is the act's own (-3.8 deg, 290 deg, the blue hour); CP-J is stored in the schema 3 envelope when the second card ends; saves with the courier on his way, the order given, the line
// leaving by bounds, the rear guard's dusk retreat and the approach to the exit restore and play on; CP-K is stored when the line is out; and the end of the act is the end card and then the debrief, with the
// paragraphs of the three area acts in order and the current act's (db_npc_01 after db_04). The saves are made in Node with the same simulation, along the real chain VII-a -> VII-b -> VII-c.
// A state/presentation check, not a playtest and not a frame-rate figure.
const OUT=new URL('../../docs/verification/m01-runtime/inc3-vii-c-2026-11-04/',import.meta.url).pathname;
const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3',ID='act_vii_c_withdrawal',LABEL='ANOITECER';
const live=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});

let scenes;
function build(){
  // The real chain: VII-a to its end and VII-b to its end (the passive pilots), then the runner's own VII-c (carry, flags, seed), played by the VII-c pilot up to the moments the page is shown.
  const a=new M01AreaSimulation(19390901,{difficulty:'recruta'}),sa={arrived:false,lastHealth:100};
  for(let i=0;i<30000&&!a.mission.complete;i++){a.tick(ACT_TICK,actControls(a,'passive',sa));a.drainEvents();}
  const runner=new M01ActRunner({enabled:true}),b=runner.enter(a),sb={arrived:false,lastHealth:100};
  for(let i=0;i<40000&&!b.mission.complete;i++){b.tick(ACT_B_TICK,actBControls(b,'passive',sb));b.drainEvents();}
  const sim=runner.enter(b),state={};
  const until=(done,max=40000)=>{for(let i=0;i<max&&!done();i++){sim.tick(ACT_C_TICK,actCControls(sim,'prompt',state));sim.drainEvents();}if(!done())throw new Error('scene not reached');};
  const view=(env,at,toward,pitch=0)=>{Object.assign(env.actSave.player,{...at,crouched:false,angle:Math.atan2(toward.z-at.z,toward.x-at.x),pitch});return env;};
  const out={};
  out.orderCard=live(sim);
  until(()=>sim.scene?.id==='cs_npc_dusk');out.duskCard=live(sim);
  until(()=>!sim.scene);until(()=>sim.clock>sim.timers.withdrawal.since+16);   // CP-J taken, the courier 80 m into his way (16 s at his pace), running in from the SW corner
  const mes=sim.actor('np_mensageiro');
  out.arrival=view(live(sim),{x:-455,z:-1082},{x:mes.x,z:mes.z},.0);   // a QA viewpoint 30 m from him, looking at him (the player may stand anywhere in the area)
  until(()=>sim.timers.withdrawal.messenger==='speaking'&&sim.clock>sim.timers.withdrawal.orderAt+1.5);
  out.order=view(live(sim),{x:-414,z:-1086},{x:-424,z:-1110},.03);   // 24 m from the courier, looking at him and the section
  until(()=>sim.timers.line.move===3&&sim.timers.line.moving);   // the second bounds of the line: the teams are strung out between the parapet and the band
  out.line=view(live(sim),{x:-440,z:-1150},{x:-480,z:-1100},.0);
  until(()=>sim.timers.withdrawal.lineOutAt===null&&sim.timers.withdrawal.out.length>=7);
  // one second before the line is out (found by running to it, then again 20 ticks short of it): the page is watched storing CP-K
  const nearLineOut=(()=>{const copy=runner.enter(b),st={};let n=0;
    for(;n<60000&&copy.timers.withdrawal.lineOutAt===null;n++){copy.tick(ACT_C_TICK,actCControls(copy,'prompt',st));copy.drainEvents();}
    const again=runner.enter(b),s2={};for(let i=0;i<n-20;i++){again.tick(ACT_C_TICK,actCControls(again,'prompt',s2));again.drainEvents();}return view(live(again),{x:-410,z:-1150},{x:-410,z:-1100},.0);})();
  out.nearLineOut=nearLineOut;
  until(()=>sim.timers.withdrawal.lineOutAt!==null);
  until(()=>sim.timers.rear.move===4&&sim.timers.rear.moving);   // the rear guard's second bounds: Pawlak and Kowal are on their way to the band, Zieliński last
  const dusk=sim.actor('marek_zielinski');
  out.dusk=view(live(sim),{x:dusk.x+9,z:dusk.z-26},{x:-585,z:-1060},.02);   // behind the last man, looking down the way they go, into the sun
  // All but the last man are out (Zieliński is not): the field holds 11 men since f13d2292 (roster without pl_np_3, tests/m01-act-vii-c-routes.test.js: R.out.length 12 -> 11), so
  // `rearOutAt===null && out.length>=11` can no longer be true (rearOutAt is set the moment the 11th leaves) and the chain threw «scene not reached».
  // the last man (Zieliński) is the only one still on the field: rearOutAt is set in the very tick the last man joins `out`, so «all but one» is the latest state with rearOutAt still null
  const WC=sim.plan.withdrawal.ids;until(()=>sim.timers.withdrawal.rearOutAt===null&&sim.timers.withdrawal.out.length>=WC.line.length+WC.rear.length-1);
  out.exit=view(live(sim),{x:-540,z:-1092},{x:-580,z:-1062},.0);   // the approach to the band: the last man is nearly there, the marker «Saída» ahead
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
const diag=page=>page.evaluate(()=>{const d=window.gameDiagnostics();const mk=document.querySelector('.objective-marker');return {act:d.m01.act??null,scene:d.m01.scene,phase:d.missionPhase,complete:d.complete,clock:d.clock,player:d.player,
  clockText:document.querySelector('#battle-clock')?.textContent,objective:document.querySelector('#objective-text')?.textContent,status:document.querySelector('#objective-status')?.textContent,
  marker:mk?{label:mk.querySelector('.marker-label')?.textContent,distance:mk.querySelector('.marker-distance')?.textContent,opacity:mk.style.opacity}:null,
  card:document.querySelector('#title-card')?.textContent,subtitle:document.querySelector('#subtitle')?.textContent??null,checkpoints:d.m01.checkpoints,flags:d.m01.flags,lighting:d.m01.lighting?{phase:d.m01.lighting.phase,sunAltDeg:d.m01.lighting.sunAltDeg,sunAzDeg:d.m01.lighting.sunAzDeg,exposure:d.m01.lighting.exposure,hemiIntensity:d.m01.lighting.hemiIntensity}:null,
  dressingMeshes:d.m01.areaDressing?.meshes??null};});
const settle=async page=>{await page.waitForTimeout(2500);await page.waitForFunction(label=>document.querySelector('#battle-clock')?.textContent===label,LABEL,{timeout:120000});};   // software GL under load can take longer than 2.5 s to paint the HUD

test('QA flag ?act=vii-c boots Act VII-c on the order card, then «Ao anoitecer»; the HUD shows only the label «ANOITECER»; the light is the act\'s own (the blue hour, the sun in the west); CP-J is stored in the schema 3 envelope when the second card ends',async({page})=>{
  test.setTimeout(300000);
  const errors=await boot(page,'?debug=1&act=vii-c');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_c_withdrawal'&&window.gameDiagnostics().m01.scene==='cs_npc_order',null,{timeout:60000});
  await expect(page.locator('#mission-briefing')).toContainText('QA · Ato VII-c');
  await page.waitForFunction(()=>window.gameDiagnostics().clock>4.8,null,{timeout:60000});   // every line of the card typed (40 characters a second, half a second between lines: the longest is done at 3.7 s), before the card fades (7.6 s)
  const order=await diag(page);expect(order.card).toContain('Por volta das 17:00');expect(order.card).toContain('Ordem do comandante do batalhão: deixar Tczew ao anoitecer, rumo a Swarożyn–Starogard');expect(order.card).toContain('(T03, resumo, certeza média)');expect(order.card).toContain('desconhecidos');expect(order.card).toContain('dramatização');
  await page.screenshot({path:OUT+'01-order-card.png'});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.scene==='cs_npc_dusk',null,{timeout:60000});
  const c0=await page.evaluate(()=>window.gameDiagnostics().clock);
  await page.waitForFunction(c=>window.gameDiagnostics().clock>c+3.9,c0,{timeout:60000});   // the three lines typed in full (the third is done 3.9 s into the card), before the area appears behind it (4.8 s)
  const dusk=await diag(page);expect(dusk.card).toContain('Ao anoitecer');expect(dusk.card).not.toMatch(/\d\d:\d\d/);
  await page.screenshot({path:OUT+'02-dusk-card.png'});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.gameDiagnostics().m01.scene===null,null,{timeout:60000});
  await settle(page);
  const after=await diag(page);
  expect(after.phase).toMatch(/^NPC_(ARRIVAL|ORDER)$/);expect(after.clockText).toBe(LABEL);expect(after.clockText).not.toMatch(/\d\d:\d\d/);
  expect(after.objective).toBe('Cubra a saída da linha');expect(after.marker?.label).toBe('Parapeito');
  // the light comes from the act's data: the sun at -3.8 deg towards 290 deg at 19:00 (a little lower as the minutes go), the blue hour, not the dawn's keyframes of the current act
  expect(after.lighting.phase).toBe('blue-hour');expect(after.lighting.sunAzDeg).toBeGreaterThan(289.9);expect(after.lighting.sunAzDeg).toBeLessThan(291);expect(after.lighting.sunAltDeg).toBeLessThan(-3.7);expect(after.lighting.sunAltDeg).toBeGreaterThan(-4.3);
  expect(after.lighting.hemiIntensity).toBeGreaterThanOrEqual(1.3);expect(after.lighting.exposure).toBeGreaterThanOrEqual(1.3);
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),ACT_KEY);
  expect(stored.schema).toBe(3);expect(stored.act).toBe(ID);expect(Object.keys(stored).sort()).toEqual(['act','actSave','carry','missionId','schema']);
  expect(stored.actSave.checkpointsReached).toEqual(['cp_npc_j_ordem']);expect(stored.actSave.sceneDone).toEqual(['cs_npc_order','cs_npc_dusk']);expect(stored.actSave.timers.withdrawal.messenger).toBe('idle');expect(stored.actSave.timers.wave).toBeNull();
  await expect(page.locator('#checkpoint-name')).toHaveText('CP-J · Perímetro norte — ordem da tarde · Soldado');   // a new game starts at the default level
  await page.screenshot({path:OUT+'03-arrival-dusk-view.png'});
  expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-boot.json',JSON.stringify({order,dusk,after,checkpoints:stored.actSave.checkpointsReached,errors},null,1)+'\n');
});

test('schema 3 saves restore the act: the courier arriving at the command post with the order, the line leaving by bounds, the rear guard\'s retreat at dusk, the approach to the exit band',async({page,context})=>{
  test.setTimeout(1500000);
  const shots=[['arrival',OUT+'04-courier-on-his-way.png'],['order',OUT+'05-order-given.png'],['line',OUT+'06-line-leaves-by-bounds.png'],['dusk',OUT+'07-dusk-retreat.png'],['exit',OUT+'08-exit-band.png']],report={};
  for(const [name,file] of shots){
    const p=name==='arrival'?page:await context.newPage();
    const errors=await boot(p,'?debug=1&acts=1',{save:scenes[name],click:'#continue'});
    await p.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_c_withdrawal',null,{timeout:60000});
    await settle(p);
    const d=await diag(p);
    report[name]={...d,errors};
    expect(d.clockText).toBe(LABEL);expect(errors).toEqual([]);expect(d.lighting.phase).toBe('blue-hour');
    if(name==='arrival'){expect(d.phase).toBe('NPC_ARRIVAL');expect(d.objective).toBe('Cubra a saída da linha');expect(d.marker?.label).toBe('Parapeito');expect(d.dressingMeshes).toBeGreaterThan(5);}
    if(name==='order'){expect(d.phase).toBe('NPC_ORDER');expect(scenes.order.actSave.timers.withdrawal.messenger).toBe('speaking');}
    if(name==='line'){expect(d.phase).toBe('NPC_ORDER');expect(d.status).toBe('Retirada · a linha sai por lanços');}
    if(name==='dusk'){expect(d.phase).toBe('NPC_REAR');expect(d.status).toBe('Retirada · a secção recua por lanços');expect(d.objective).toBe('Recue com a secção até à saída');expect(d.marker?.label).toBe('Saída');}
    if(name==='exit'){expect(d.phase).toBe('NPC_REAR');expect(d.marker?.label).toBe('Saída');expect(d.objective).toBe('Recue com a secção até à saída');}
    await p.screenshot({path:file});
    if(p!==page)await p.close();
  }
  writeFileSync(OUT+'smoke-saves.json',JSON.stringify(report,null,1)+'\n');
});

test('CP-K: the game stores the checkpoint of the retreat when the line is out, in the same schema 3 envelope as CP-J',async({page})=>{
  test.setTimeout(600000);
  const errors=await boot(page,'?debug=1&acts=1',{save:scenes.nearLineOut,click:'#continue'});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_c_withdrawal',null,{timeout:60000});
  const cps=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).actSave.checkpointsReached,ACT_KEY);
  expect(await cps()).toEqual(['cp_npc_j_ordem']);
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).actSave.checkpointsReached.includes('cp_npc_k_retirada'),ACT_KEY,{timeout:300000});
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),ACT_KEY);
  expect(stored.schema).toBe(3);expect(stored.act).toBe(ID);expect(Object.keys(stored).sort()).toEqual(['act','actSave','carry','missionId','schema']);
  expect(stored.actSave.checkpointsReached).toEqual(['cp_npc_j_ordem','cp_npc_k_retirada']);expect(stored.actSave.timers.withdrawal.lineOutAt).not.toBeNull();
  expect(stored.actSave.timers.withdrawal.out).toHaveLength(8);   // the line leaves: six riflemen and the two men of the ckm (9 before f13d2292 took pl_np_3 off the roster: tests/m01-act-vii-c.test.js, R.out.length 9 -> 8)
  expect(stored.actSave.flags['m01npc.lineOut']).toBe(true);expect(stored.actSave.objectives.obj_npc_withdraw.state).toBe('active');
  await expect(page.locator('#checkpoint-name')).toHaveText('CP-K · Perímetro norte — retirada · Recruta');
  await page.waitForTimeout(2500);const d=await diag(page);expect(d.phase).toBe('NPC_REAR');expect(d.objective).toBe('Recue com a secção até à saída');expect(d.marker?.label).toBe('Saída');
  await page.screenshot({path:OUT+'06b-line-out-cpk.png'});
  expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-cpk-stored.json',JSON.stringify({checkpoints:stored.actSave.checkpointsReached,out:stored.actSave.timers.withdrawal.out,lineOutAt:stored.actSave.timers.withdrawal.lineOutAt,clock:stored.actSave.clock,errors},null,1)+'\n');
});

test('the end of VII-c is the end card and then the debrief, with the paragraphs of the three area acts in order (VII-a\'s, VII-b\'s, VII-c\'s, db_04) and the current act\'s',async({page})=>{
  test.setTimeout(600000);
  const errors=await boot(page,'?debug=1&acts=1',{save:scenes.end,click:'#continue'});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.scene==='cs_npc_end',null,{timeout:90000});
  const c0=await page.evaluate(()=>window.gameDiagnostics().clock);
  await page.waitForFunction(c=>window.gameDiagnostics().clock>c+4.2,c0,{timeout:90000});   // the four lines typed in full (done 3.6 s into the card), before the text fades (7.6 s)
  await page.screenshot({path:OUT+'09-end-card.png'});
  const card=await page.evaluate(()=>document.querySelector('#title-card')?.textContent);
  expect(card).toContain('O 2.º Batalhão deixou Tczew');expect(card).toContain('Retirada entre as 18:00 e as 20:00 (T03, resumo, certeza média)');expect(card).toContain('Pôr do sol às 18:39 (C01)');
  await page.waitForSelector('#complete:not(.hidden)',{timeout:90000});
  const debrief=await page.locator('#debrief').textContent();
  const at=t=>debrief.indexOf(t);
  // f13d2292 (honest labels): the VII-a paragraph says «Às ~07:00 — hora de uma única fonte», not «Por volta das 07:00»; and the VII-c paragraph (the 17:00 order) now comes BEFORE db_04 («até às 20:00»).
  expect(debrief).toContain('Às ~07:00 — hora de uma única fonte');expect(debrief).toContain('Durante o dia, novos ataques vindos do norte');expect(debrief).toContain('Por volta das 17:00 chegou a ordem de deixar Tczew ao anoitecer');expect(debrief).toContain('O Sol pôs-se às 18:39');
  expect(at('Às ~07:00 — hora de uma única fonte')).toBeLessThan(at('Durante o dia, novos ataques'));
  expect(at('Durante o dia, novos ataques')).toBeLessThan(at('Por volta das 17:00 chegou a ordem'));
  expect(at('Por volta das 17:00 chegou a ordem')).toBeLessThan(at('até às 20:00'));   // db_npc_01 comes before db_04 («até às 20:00»)
  const paragraphs=await page.locator('#debrief p').allTextContents();
  const i04=paragraphs.findIndex(t=>/até às 20:00/.test(t)),iC=paragraphs.findIndex(t=>/Por volta das 17:00 chegou a ordem/.test(t));
  expect(iC).toBeGreaterThanOrEqual(0);expect(i04).toBe(iC+1);   // db_04 immediately after db_npc_01
  await page.screenshot({path:OUT+'10-debrief.png'});
  expect(errors).toEqual([]);
  writeFileSync(OUT+'smoke-debrief.json',JSON.stringify({card,paragraphs,errors},null,1)+'\n');
});
