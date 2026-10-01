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

const untilEvent=(sim,id,limit=20*900)=>{for(let i=0;i<limit&&!sim.consumedEvent(E(id));i++)sim.tick(.05);};
const inShelter=a=>a.x>=-264&&a.x<=-256&&a.z>=66&&a.z<=75.5;

test('a Bąk delivered by the player stays visible beside Dudek, who carries him west before the west demolition',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_d_retirada);
  const bak=sim.actor('jozef_bak'),dudek=sim.actor('leon_dudek');
  Object.assign(sim.player,{x:bak.x,y:bak.y,z:bak.z});sim.updateObjectives(0,true);
  Object.assign(sim.player,sim.world.point('aid_position'));sim.updateObjectives(0,true);
  assert.equal(sim.flags['m01.bak_status'],'rescued_by_player');
  assert.equal(bak.active,true);assert.equal(bak.state,'WOUNDED');assert.ok(near(bak,sim.world.point('aid_position'),2));
  // CP-D é depois da demolição leste: a entrega deve iniciar a evacuação sem ajuda do teste.
  assert.equal(dudek.task,'evacuate_bak');
  Object.assign(sim.player,{x:-291,y:-3,z:26});
  let carried=false;
  for(let i=0;i<20*400&&!sim.consumedEvent(E('west_demolition'));i++){sim.tick(.05);carried||=bak.carriedBy==='leon_dudek';}
  assert.ok(carried,'Dudek leva Bąk ao ombro');
  assert.equal(sim.consumedEvent(E('west_demolition')),true,'a evacuação não segura a demolição oeste');
  assert.equal(bak.carriedBy,null);assert.ok(bak.x<-300,`Bąk em ${bak.x.toFixed(0)}`);
  assert.ok(dudek.x<-90&&dudek.task===null,'Dudek volta à secção ("Presente" na chamada)');
  assert.ok(bak.active&&bak.alive);
});

test('when Dudek retrieves Bąk he walks to him on the deck and carries him to the station, visible all the way',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_d_retirada);
  Object.assign(sim.player,{x:-291,y:-3,z:26});
  const bak=sim.actor('jozef_bak'),dudek=sim.actor('leon_dudek');
  untilEvent(sim,'dudek_retrieves_bak');
  assert.equal(sim.flags['m01.bak_status'],'rescued_by_dudek');assert.equal(bak.active,true);assert.equal(dudek.task,'evacuate_bak');
  let carried=false;
  for(let i=0;i<20*400&&!sim.consumedEvent(E('west_demolition'));i++){sim.tick(.05);carried||=bak.carriedBy==='leon_dudek';}
  assert.ok(carried);assert.equal(sim.consumedEvent(E('west_demolition')),true);
  run(sim,30);assert.ok(bak.x<-300&&dudek.x<-300,'ambos na estação');assert.equal(dudek.task,'stay_with_bak');
});

test('the roll call positions the present section in the shelter facing Jan; the absent stay away',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_d_retirada);
  Object.assign(sim.player,{x:-291,y:-3,z:26});
  untilEvent(sim,'west_demolition');
  for(const [x,z] of [[-292,68],[-262,70]])for(let i=0;i<20*60&&Math.hypot(sim.player.x-x,sim.player.z-z)>1.2;i++){
    const p=sim.player;sim.tick(.05,{lookX:(Math.atan2(z-p.z,x-p.x)-p.angle)/.0022,forward:1});
  }
  for(let i=0;i<20*30&&sim.scene?.id!=='cs_m01_roll_call';i++)sim.tick(.05);
  assert.equal(sim.scene?.id,'cs_m01_roll_call');
  const p=sim.player;assert.ok(inShelter(p));assert.equal(p.crouched,true);
  for(const id of ['marek_zielinski','szymon_kowal','pawel_krawiec']){
    const a=sim.actor(id);assert.ok(inShelter(a),`${id} em ${a.x.toFixed(1)},${a.z.toFixed(1)}`);
    const rel=Math.atan2(a.z-p.z,a.x-p.x)-p.angle;assert.ok(Math.abs(Math.atan2(Math.sin(rel),Math.cos(rel)))<Math.PI/3,`${id} no campo de visão`);
  }
  // Ramo Dudek: Bąk e Dudek estão na estação, não no abrigo; Nowicki desaparecido não é encenado.
  for(const id of ['jozef_bak','leon_dudek','tadeusz_nowicki'])assert.equal(inShelter(sim.actor(id)),false,id);
});

test('Kowal hands over at most six clips of section ammunition; saves keep the ammunition invariant',()=>{
  const sim=new M01Simulation();sim.restoreSnapshot(full().checkpoints.cp_m01_c_engenheiros);sim.drainEvents();
  const w=sim.weapon,kowal=sim.actor('szymon_kowal');
  for(let i=0;i<9;i++){w.shoot(i*2000);w.update(i*2000+1100);if(!w.mag){w.reload(i*2000+1200);w.update(i*2000+5000);}}
  w.reserve=3;w.shotCount=45-w.mag-3;                           // quase sem munição, invariante 45 respeitado
  sim.tick(.05);assert.ok(messages(sim).some(m=>m.startsWith('Pouca munição. Kowal tem carregadores:')));
  Object.assign(sim.player,{x:kowal.x+1,y:kowal.y,z:kowal.z});
  assert.equal(sim.interaction,'E · pedir munição a Kowal');
  sim.updateObjectives(0,true);assert.equal(w.reserve,18);assert.equal(w.received,15);assert.equal(sim.timers.kowalRounds,15);
  assert.equal(sim.loadCheckpoint(JSON.stringify(sim.snapshot())).ok,true);
  const v=sim.weapon;                                             // o restauro substitui a arma
  v.reserve=10;v.shotCount+=8;sim.updateObjectives(0,true);assert.equal(v.reserve,25);assert.equal(sim.timers.kowalRounds,0);
  v.reserve=5;v.shotCount+=20;assert.notEqual(sim.interaction,'E · pedir munição a Kowal');
  sim.updateObjectives(0,true);assert.equal(v.reserve,5,'Kowal já não tem carregadores');
  for(const corrupt of [s=>{s.weapon.received=31;},s=>{s.timers.kowalRounds=30;},s=>{s.weapon.reserve+=5;}]){
    const data=structuredClone(sim.snapshot());corrupt(data);assert.equal(sim.loadCheckpoint(JSON.stringify(data)).ok,false);
  }
});

test('legacy schema 2 saves receive the unused section supply and can resupply after loading',()=>{
  const old=structuredClone(full().checkpoints.cp_m01_c_engenheiros);
  delete old.weapon.received;delete old.timers.kowalRounds;delete old.timers.lowAmmoHint;
  const sim=new M01Simulation();assert.equal(sim.loadCheckpoint(JSON.stringify(old)).ok,true);
  assert.equal(sim.weapon.received,0);assert.equal(sim.timers.kowalRounds,30);
  const w=sim.weapon,kowal=sim.actor('szymon_kowal');w.reserve=10;w.shotCount=45-w.mag-w.reserve;
  Object.assign(sim.player,{x:kowal.x+1,y:kowal.y,z:kowal.z});
  sim.updateObjectives(0,true);
  assert.equal(w.reserve,25);assert.equal(w.received,15);assert.equal(sim.timers.kowalRounds,15);
  assert.equal(sim.loadCheckpoint(JSON.stringify(sim.snapshot())).ok,true);
});

test('the bridge trusses contain movement: no falling off a span sideways or into a blown gap; the river bank still can',()=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});
  const p=sim.player,w=sim.world;
  Object.assign(p,{x:60,y:0,z:0});w.move(p,0,8);assert.ok(Math.abs(p.z)<=4.6&&p.y===0,`lateral ferroviária: ${p.z.toFixed(2)}, y ${p.y}`);
  Object.assign(p,{x:300,y:0,z:40});w.move(p,0,-8);assert.ok(p.z>=36&&p.y===0,`lateral rodoviária: ${p.z.toFixed(2)}`);
  w.refresh([E('east_demolition')]);
  Object.assign(p,{x:655,y:0,z:40});w.move(p,20,0);assert.ok(p.y===0&&p.x<662,`beira do vão 6 demolido: ${p.x.toFixed(1)}`);
  Object.assign(p,{x:20,y:-3,z:30});w.move(p,10,0);assert.ok(p.y<=-9,'da margem ainda se cai ao Vístula (falha intencional)');
});
