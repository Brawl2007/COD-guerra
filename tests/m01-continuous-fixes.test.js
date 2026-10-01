// Regressões dos problemas encontrados na primeira partida contínua de M01 no navegador
// (docs/verification/m01-runtime/continuous/README.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { M01Simulation, seconds } from '../src/game/m01-simulation.js';
import { route } from './helpers/m01-route.js';

const E=name=>'evt_m01_'+name;
let completed;
const full=()=>completed??=route();
const run=(sim,secs,controls={})=>{for(let i=0;i<secs*20;i++)sim.tick(.05,controls);};
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.z-b.z)<=r;
const messages=sim=>sim.drainEvents().filter(e=>e.type==='message').map(e=>e.message);

test('the sappers walk to the second cut where the crate is delivered, so "leve a caixa aos sapadores" is true',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_b_reorganizacao);
  Object.assign(sim.player,sim.world.point('repair_site_1'));run(sim,.1);
  assert.equal(sim.active('fetch_material'),true);
  run(sim,40);
  const site=sim.world.point('repair_site_2'),engineers=sim.allies.filter(a=>a.role==='ENGINEER'&&a.alive&&a.active);
  assert.ok(engineers.length>=1);
  for(const a of engineers)assert.ok(near(a,site,6),`${a.id} em ${a.x.toFixed(1)},${a.z.toFixed(1)}, entrega em ${site.x},${site.z}`);
});

test('Bąk takes the deck position with the 05:30 order and falls at bak_wound_point, in front of the player',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_c_engenheiros);
  Object.assign(sim.player,{x:29,y:0,z:40,angle:0});
  for(let i=0;i<8000&&!sim.consumedEvent(E('bak_wounded'));i++)sim.tick(.05);
  const bak=sim.actor('jozef_bak'),point=sim.world.point('bak_wound_point');
  assert.equal(sim.flags['m01.bak_status'],'wounded');assert.equal(bak.state,'WOUNDED');
  assert.ok(near(bak,point,1.5),`Bąk ferido em ${bak.x.toFixed(1)},${bak.z.toFixed(1)}`);
  assert.ok(bak.x>sim.player.x,'à frente de um jogador virado para leste');
  sim.tick(.05);   // o texto do HUD é recalculado no tick seguinte ao evento
  assert.match(sim.mission.text,/\(Opcional\) Leve Bąk até o socorrista/);
});

test('a direction hint names the destination, distance and side when the player does not approach it',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_b_reorganizacao);
  Object.assign(sim.player,{angle:Math.PI});sim.drainEvents();       // virado para oeste, sapadores a leste
  run(sim,5);
  const hint=messages(sim).find(m=>m.startsWith('Sapadores no aterro'));
  assert.match(hint??'',/^Sapadores no aterro: \d+ m, atrás de si$/);
  // A avançar na direcção certa não há repetição; parado, volta a indicar após 15 s.
  sim.player.angle=0;run(sim,8,{forward:1,sprint:true});
  assert.equal(messages(sim).filter(m=>m.startsWith('Sapadores')).length,0);
  run(sim,25);
  assert.deepEqual(messages(sim).filter(m=>m.startsWith('Sapadores')).map(m=>m.replace(/\d+ m/,'N m')),['Sapadores no aterro: N m, em frente']);
});

test('once the repair gate is ready the rest of seg_repair runs at readyScale; before that it keeps scale',()=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});
  sim.battleClock=seconds('04:50:00');sim.advanceBattle(1);assert.equal(sim.battleClock,seconds('04:50:09'));
  sim.objectives.obj_m01_cover_repair.progress=100;sim.advanceBattle(1);assert.equal(sim.battleClock,seconds('04:50:36'));
});

test('the full control route still reaches the debrief with every required objective after the fixes',()=>{
  const {sim}=full();
  assert.equal(sim.mission.complete,true);
  for(const o of sim.definition.objectives.filter(o=>o.required))assert.equal(sim.objectives[o.id].state,'done',o.id);
});

test('the withdrawing east platoon runs past the firing point during the corridor phase and does not stall at x = -109',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_c_engenheiros);
  Object.assign(sim.player,{x:29,y:0,z:40,angle:0});
  const fp=sim.world.point('firing_point'),passed=new Set();let moved=false;
  for(let i=0;i<20*900&&!sim.consumedEvent(E('west_demolition'));i++){
    if(!moved&&sim.consumedEvent(E('east_demolition'))){Object.assign(sim.player,{x:-291,y:-3,z:26});moved=true;}
    sim.tick(.05);
    for(const a of sim.actors.filter(a=>a.group==='grp_east_platoon'&&a.alive))if(near(a,fp,15))passed.add(a.id);
  }
  const survivors=sim.actors.filter(a=>a.group==='grp_east_platoon'&&a.alive);
  assert.equal(sim.consumedEvent(E('west_demolition')),true);
  assert.equal(passed.size,survivors.length,'todos os sobreviventes passam junto ao posto de disparo');
  assert.equal(new Set(survivors.map(a=>`${a.x.toFixed(1)},${a.z.toFixed(1)}`)).size,survivors.length,'cada um no seu lugar');
});
