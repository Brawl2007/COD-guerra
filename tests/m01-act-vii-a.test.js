import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arch} from 'node:os';
import {M01AreaSimulation,areaActPlan,areaPlanSolids,validateAreaSnapshot} from '../src/game/m01-area-sim.js';
import {makeApproachPlan,approachFlagOf} from '../src/game/m01-act-factories.js';
import {M01AreaWorld} from '../src/world/m01-area-world.js';
import {buildM01AcceptedPropPlacements} from '../src/world/m01-prop-layout.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {buildTerrainEnvelope} from '../src/render/m01-terrain-envelope.js';
import {cinematicFrame,actCardFrame} from '../src/ui/m01-hud.js';
import {actRoute,actControls,ACT_TICK} from './helpers/m01-act-route.js';
import {clippingAudit,stackingAudit} from './helpers/m01-clipping.js';
import {areaClippingAudit} from './helpers/m01-act-audit.js';
import {ACT_GOLDEN_FIXTURE,actGoldenText} from './helpers/m01-act-golden.js';
import act from '../missions/m01-tczew/areas/np/act.json' with {type:'json'};
import layout from '../missions/m01-tczew/areas/np/layout.json' with {type:'json'};

// R4 INC-1 (WP-1): Act VII-a «Perímetro norte, manhã». Not a playtest: these are deterministic checks of the slice (its data, its world, its routes, its golden).
// 2026-11-03: the fight is two echelons with a lull between them (the owner found 30-60 s of combat too short); the routes below guard that duration.
const strip=s=>JSON.parse(JSON.stringify(s));
const ASSAULT=()=>strip(act.groups.find(g=>g.id==='grp_np_de').assault);
const PB=layout.bounds.playable,SOLIDS=areaPlanSolids(layout);
const build=spec=>makeApproachPlan(spec,{minX:PB.minX,maxX:PB.maxX,groundY:layout.groundY,solids:SOLIDS});

test('the slice data: 400 x 300 m inside north_perimeter, a valid plan of two echelons, every German path clear of every cover, the wreck and the parapet',()=>{
  assert.equal(PB.maxX-PB.minX,400);assert.equal(PB.maxZ-PB.minZ,300);
  assert.ok(PB.minX>=-900&&PB.maxX<=-100&&PB.minZ>=-1500&&PB.maxZ<=-800,'inside map-layout north_perimeter');
  const plan=areaActPlan();assert.equal(plan.line.men.length,7);
  assert.deepEqual(plan.assault.echelons.map(e=>[e.id,e.men.length,e.overwatch.length]),[['first',9,4],['second',16,2]],'9 + 4 in the first echelon (as before), 16 + 2 in the second');
  assert.equal(plan.assault.men.length,31);assert.equal(plan.assault.ids.length,31);
  const [first,second]=plan.assault.echelons;
  assert.ok(second.breakOut>first.breakOut&&second.breakPinnedSec>first.breakPinnedSec,'the second echelon breaks a little harder (its own thresholds)');
  assert.equal(first.lullSec,0);assert.ok(second.lullSec>=20&&second.lullSec<=30,'a lull of 20-30 s');
  assert.equal(act.events.find(e=>e.id==='evt_np_wave_2').trigger.lullSec,second.lullSec,'the event that documents the lull says the lull the data has');
  // the second echelon enters from the treeline line, on lanes that are not the first's, and the men of a lane follow one another in file
  for(const m of plan.assault.men.filter(m=>m.echelon===1)){assert.equal(m.entry.z,plan.assault.entryZ);assert.ok(m.delaySec>=0);}
  assert.ok(plan.assault.men.filter(m=>m.echelon===1&&m.role==='assault').some(m=>m.delaySec>0),'the lanes of the second echelon come in one after the other');
  assert.ok(plan.assault.men.filter(m=>m.echelon===0).every(m=>m.delaySec===0),'the first echelon is on the field when the wave starts');
  const bad=ASSAULT();bad.lanes[0].x[1]=bad.lanes[0].x[0]+1;   // two men 1 m apart: one runs through the other's earth
  assert.throws(()=>build(bad),/crosses/);
});

test('the approach factory validates the echelons with clear messages (a typo stops the game instead of changing it)',()=>{
  const cases=[
    ['echelons empty',a=>{a.echelons=[];},/echelons: a non-empty array/],
    ['echelon without id',a=>{delete a.echelons[0].id;},/echelon #1: id/],
    ['echelon named like the first',a=>{a.echelons[0].id='first';},/echelon first: id/],
    ['unknown key (a typo of breakOut)',a=>{a.echelons[0].brakOut=3;},/echelon second: unknown key brakOut/],
    ['lull too short',a=>{a.echelons[0].lullSec=1;},/echelon second: lullSec 5-180/],
    ['thresholds missing',a=>{delete a.echelons[0].maxSec;},/echelon second: closeAfterSec \/ breakPinnedSec \/ breakOut \/ maxSec/],
    ['breakOut above its own men',a=>{a.echelons[0].breakOut=99;},/echelon second: breakOut 99 is more than its 16 assault men plus 2 on overwatch/],
    ['stations not north to south',a=>{a.echelons[0].stations=[-1300,-1310];},/echelon second: stations/],
    ['limit station beyond the ladder',a=>{a.echelons[0].limitStation=12;},/echelon second: limitStation/],
    ['a man listed in both echelons',a=>{a.echelons[0].lanes[0].men[0]='de_np_4';},/a man listed twice/],
    ['a lane id used twice',a=>{a.echelons[0].lanes[1].id=a.lanes[0].id;},/echelon second: lane west/],
    ['no lanes',a=>{a.echelons[0].lanes=[];},/echelon second: lanes/],
    ['delaySec in the first echelon',a=>{a.lanes[0].delaySec=5;},/lane west: delaySec belongs to the echelons that follow the first/],
    ['delaySec beyond half the clock',a=>{a.echelons[0].lanes[0].delaySec=150;},/echelon second: lane far_west: delaySec 0-100/],
    ['delaySec list of the wrong length',a=>{a.echelons[0].lanes[0].delaySec=[1,2];},/echelon second: lane far_west: delaySec/],
    ['an overwatch gun with a stray key',a=>{a.echelons[0].overwatch[0].rate=9;},/echelon second: overwatch de_np_29/],
    ['a lane through the wreck',a=>{a.echelons[0].lanes=[{id:'only',men:['de_np_13'],x:[-390]}];a.echelons[0].breakOut=3;},/path of de_np_13 crosses np_wreck_(hull|upper)/],
    ['a lane through the first echelon\'s earth',a=>{a.echelons[0].lanes[2].x[0]=a.lanes[1].x[0];},/crosses np_cover_de_np_[0-9]+_[0-9]/],
  ];
  assert.ok(build(ASSAULT()),'the shipped data builds');
  for(const [name,mutate,re] of cases){const a=ASSAULT();mutate(a);assert.throws(()=>build(a),re,name);}
  // a spec without `echelons` is the single-echelon assault of INC-1
  const single=ASSAULT();delete single.echelons;const p=build(single);
  assert.deepEqual(p.echelons.map(e=>e.id),['first']);assert.equal(p.men.length,13);assert.equal(p.breakOut,7);
  assert.equal(p.echelons[0].breakOut,p.breakOut,'the top-level thresholds are the first echelon\'s');
});

test('history guard: no exact hour on screen, no named vehicle type, no SS insignia; every card says what is documented and what is reconstruction; the two echelons are said to be dramatization',()=>{
  const sim=new M01AreaSimulation();
  assert.equal(sim.clockLabel,'MANHÃ · ~07:00');assert.doesNotMatch(sim.clockLabel,/\d\d:\d\d:\d\d/);
  const text=JSON.stringify(act)+JSON.stringify(layout);
  for(const banned of [/Panzer(?!zug)/i,/PzKpfw|Pz\.?\s?Kpfw/i,/Sd\.?\s?Kfz/i,/Panzerspäh/i,/\bTiger\b|\bPanther\b/,/Totenkopf|Waffen-SS|\bSS-[A-Z]/,/\bMP\s?40\b|\bMG\s?42\b|M1 Carbine/])
    assert.doesNotMatch(text.replace(/SS-Heimwehr Danzig chegou[^"]*"/,''),banned,String(banned));
  const entry=act.cards.entry.lines.join(' '),end=act.cards.end.lines.join(' ');
  assert.match(entry,/fonte única/);assert.match(entry,/dramatização/);assert.match(entry,/reconstrução/);assert.match(end,/T08/);
  assert.match(act.history.find(h=>h.id==='h_np_attack').classification,/DOCUMENTED/);assert.match(act.history.find(h=>h.id==='h_np_arrival').classification,/GAMEPLAY_DRAMATIZATION/);
  // two echelons and the lull are dramatization: the source (T08) says a company attacked and the infantry was repelled by machine guns, nothing more
  assert.match(entry,/duas vagas/);
  const h=act.history.find(x=>x.id==='h_np_echelons');assert.equal(h.classification,'GAMEPLAY_DRAMATIZATION');assert.deepEqual(h.sources,[]);assert.match(h.text,/T08/);assert.match(h.text,/dramatização/);
  const ev=act.events.find(x=>x.id==='evt_np_wave_2');assert.equal(ev.certainty,'GAMEPLAY_DRAMATIZATION');assert.deepEqual(ev.sources,[]);
  const de=act.groups.find(g=>g.id==='grp_np_de');assert.match(de.classification,/duas vagas/);assert.match(de.echelonsNote,/DRAMATIZAÇÃO/);assert.match(de.echelonsNote,/T08/);
  assert.match(act.debrief.paragraphs[0].text,/duas vagas/);
  // the new callouts (European Portuguese, said by the section leader through the callout mechanism) exist for every key the simulation says
  for(const on of ['lull','lull_quiet','echelon_seen','final_break']){
    const c=act.callouts.find(x=>x.on===on);assert.ok(c,on);assert.equal(c.speaker,'marek_zielinski');assert.match(c.text,/[a-zç]/);assert.doesNotMatch(c.text,/\b(você|tu|ônibus|trem)\b/i,'not Brazilian Portuguese');
  }
  assert.match(act.callouts.find(x=>x.on==='lull').text,/não acabou/);assert.match(act.callouts.find(x=>x.on==='lull').text,/metralhadora/);
  assert.equal(new Set(act.callouts.map(c=>c.id)).size,act.callouts.length,'callout ids are unique');
  // the HUD: the card frame of an act scene, the current act's scenes unchanged
  const f=actCardFrame({id:'cs_np_entry',elapsed:4,card:{kind:'entry',lines:['a'],seconds:9}});assert.equal(f.locked,true);assert.equal(f.black,1);assert.equal(f.card.lines[0],'a');
  assert.deepEqual(cinematicFrame({id:'cs_np_entry',elapsed:4,card:{kind:'entry',lines:['a'],seconds:9}}),f);
  assert.deepEqual(cinematicFrame(null),{locked:false,black:0,card:null});
});

test('the area world adds its solids and props to the current act\'s world and changes nothing for the current act',()=>{
  const bw=new TczewWorld(),before=buildM01AcceptedPropPlacements(bw);assert.equal(bw.areaProps,undefined);
  const plan=areaActPlan(),w=new M01AreaWorld(layout,{extraCovers:plan.assault.covers});
  assert.deepEqual(buildM01AcceptedPropPlacements(w).slice(0,before.length),before,'the current act\'s kit placements first, unchanged');
  assert.equal(buildM01AcceptedPropPlacements(w).length,before.length+w.areaProps.length);
  assert.equal(w.obstacles.length,bw.obstacles.length+w.areaCovers.length);
  assert.equal(w.terrainHeightAt(-400,-1200),-3);assert.equal(w.terrainHeightAt(-100,30),bw.terrainHeightAt(-100,30));
  // the presentation relief is flattened over the area only when the world carries it
  assert.equal(buildTerrainEnvelope(bw).regions.some(r=>r.id.startsWith('area:')),false);
  assert.ok(buildTerrainEnvelope(w).contains(-400,-1200));assert.equal(buildTerrainEnvelope(bw).contains(-400,-1200),false);
});

/**
 * Watches one route for the rules of the echelons. `observe(sim)` once per tick. The record starts again when the fight does (a death restores CP-E, where the wave is
 * pending): what it keeps is the last fight of the route.
 */
function watcher(){
  const w={};
  const clear=()=>Object.assign(w,{lullStarted:null,lullStatus:false,lullEndPhases:null,secondStatus:false,firstBreakOverwatch:null,finalBreakPhases:null,flagMismatch:0,firstSeen:new Map(),sawLullFlag:false,e2Shooters:new Set()});
  clear();
  w.observe=sim=>{
    const W=sim.timers.wave;if(!W){clear();return;}
    const live=sim.enemies.filter(a=>a.alive&&a.active),plan=sim.plan.assault,man=a=>plan.men.find(m=>m.id===a.id);
    if(sim.flags['m01np.wave']!==approachFlagOf(plan,W))w.flagMismatch++;
    if(W.lullUntil!==null){
      if(w.lullStarted===null)w.lullStarted=sim.clock;
      if(/pausa/.test(sim.mission.status))w.lullStatus=true;
      if(sim.clock+ACT_TICK>=W.lullUntil)w.lullEndPhases=live.map(a=>a.deck.phase);   // the last tick of the lull: who is on the field, and doing what
    }
    if(sim.flags['m01np.wave']==='lull')w.sawLullFlag=true;
    for(const r of sim.enemyFire.rounds)if(plan.men.find(m=>m.id===r.by)?.echelon===1)w.e2Shooters.add(r.by);   // real rounds in flight, by the men of the second echelon
    if(W.ech===1&&W.brokenAt===null&&/2\.ª vaga/.test(sim.mission.status))w.secondStatus=true;
    if(W.echs[0].brokenAt!==null&&w.firstBreakOverwatch===null)w.firstBreakOverwatch=live.filter(a=>man(a).role==='overwatch').map(a=>a.deck.phase);
    if(W.brokenAt!==null&&w.finalBreakPhases===null)w.finalBreakPhases=live.map(a=>a.deck.phase);
    for(const a of sim.enemies)if(man(a).echelon===1&&!w.firstSeen.has(a.id)&&(a.active||!a.alive))w.firstSeen.set(a.id,sim.clock);
  };
  return w;
}

test('the cheap clipping audit of the long routes reports exactly what the full audit reports (a man put inside the earth on purpose is found by both, at the same tick)',()=>{
  const sim=new M01AreaSimulation(19390901,{difficulty:'soldado'}),full=clippingAudit(),light=areaClippingAudit(),state={arrived:false,lastHealth:100};
  const earth=sim.world.areaCovers.find(c=>c.id==='np_cover_de_np_6_0'),inside={x:(earth.min.x+earth.max.x)/2,z:(earth.min.z+earth.max.z)/2};
  let placed=false;
  for(let i=0;i<1100;i++){
    sim.tick(ACT_TICK,actControls(sim,'active',state));sim.drainEvents();
    if(i===700){const g=sim.actor('marek_zielinski');Object.assign(g,inside);g.y=sim.world.heightAt(g.x,g.z);placed=true;}   // the wave is under way; the section leader ends a tick inside a turned earth (he cannot be killed first)
    full.observe({sim});light.observe({sim});
  }
  assert.ok(placed);assert.ok(full.report().length>=1&&full.report().some(l=>/marek_zielinski/.test(l)&&/np_cover_de_np_6_0/.test(l)),`the full audit finds the man: ${full.report()}`);
  assert.deepEqual(light.report(),full.report(),'same events, same ticks');
});

test('the slice completes on 18 routes (passive and active pilot x 3 levels x 3 seeds): two echelons with a lull, at least two minutes of fight, no clipping, no men inside each other',()=>{
  for(const mode of ['passive','active'])for(const d of ['recruta','soldado','veterano'])for(const seed of [19390901,3,7]){
    const sim=new M01AreaSimulation(seed,{difficulty:d}),clip=areaClippingAudit(),stack=stackingAudit(),watch=watcher();
    const r=actRoute(sim,{mode,maxSec:600,onStep:x=>{clip.observe(x);stack.observe(x);watch.observe(x.sim);}});
    const id=`${mode} ${d} ${seed}`;
    assert.equal(r.complete,true,id);assert.equal(sim.flags['m01np.wave'],'repelled',id);assert.equal(sim.objectives.obj_np_hold_north.state,'done',id);
    assert.deepEqual(clip.report(),[],id);assert.equal(stack.summary().pairs,0,id);
    const W=sim.timers.wave,[first,second]=W.echs,plan=sim.plan.assault;
    // the first echelon fights before it breaks, as the single wave of INC-1 did (20 s against the line alone, 10 s with a human-paced rifleman added)
    assert.equal(W.echs.length,2,`${id}: both echelons came`);
    assert.ok(first.brokenAt-first.at>=(mode==='passive'?20:10),`${id}: the first echelon fights before it breaks`);
    // the lull, then the second echelon, which also fights before the last break takes everybody back
    assert.ok(second.at-first.brokenAt>=plan.echelons[1].lullSec,`${id}: the second echelon enters its lull after the first broke`);
    assert.ok(second.brokenAt-second.at>=40,`${id}: the second echelon fights`);
    assert.equal(W.brokenAt,second.brokenAt,id);
    // the duration the owner asked for: the whole fight, wave start to repelled, is at least two minutes with either pilot; the passive pilot is not stuck (6 minutes at most)
    assert.ok(W.repelledAt-W.at>=120,`${id}: wave start to repelled ${Math.round((W.repelledAt-W.at)*10)/10} s must be at least 120 s`);
    if(mode==='passive')assert.ok(sim.clock<=360,`${id}: the passive pilot is done in ${Math.round(sim.clock)} s (6 minutes at most)`);
    assert.ok(sim.enemyFire.nextId>=20,`${id}: the Germans fire real rounds`);assert.ok(watch.e2Shooters.size>=8,`${id}: the second echelon fires real rounds (${watch.e2Shooters.size} of its men did)`);assert.ok(sim.ckm.bursts>=1,`${id}: the ckm fires`);
    assert.ok(W.casualties>=1&&W.casualties<=plan.men.length,id);
    // the state of the fight is always the one its record implies; the status line says the lull and the second echelon
    assert.equal(watch.flagMismatch,0,`${id}: the flag follows the record`);assert.ok(watch.sawLullFlag&&watch.lullStatus,`${id}: the status line says the pause`);assert.ok(watch.secondStatus,`${id}: the status line says the second echelon`);
    // the first break takes the assault only: the overwatch is still on the edge (never falling back); the last break takes everybody
    assert.ok(watch.firstBreakOverwatch.every(p=>p==='hold'),`${id}: the overwatch stays when the first echelon breaks (${watch.firstBreakOverwatch})`);
    assert.ok(watch.finalBreakPhases.length>0&&watch.finalBreakPhases.every(p=>p==='fallback'),`${id}: the last break takes the overwatch too (${watch.finalBreakPhases})`);
    // the men of the second echelon walk in no earlier than their delay, at most a tick after it
    for(const m of plan.men.filter(m=>m.echelon===1)){
      const t=watch.firstSeen.get(m.id);if(t===undefined)continue;   // never entered: the echelon broke before its turn
      assert.ok(t-(second.at+m.delaySec)>=-1e-6&&t-(second.at+m.delaySec)<=ACT_TICK+1e-6,`${id}: ${m.id} enters ${Math.round((t-second.at)*100)/100} s after his echelon, his delay is ${m.delaySec} s`);
    }
    // the overwatch holds the edge through the whole lull (it fires when it has a target and is not pinned: the Polish line often pins it silent, so no round is asserted)
    assert.ok(watch.lullEndPhases.every(p=>p==='hold'),`${id}: nobody but the overwatch is on the field at the end of the lull, and it is still holding (${watch.lullEndPhases})`);
  }
});

test('the lull is quiet for the assault, not for the player: the overwatch holds the edge, the crates resupply, the pause is on the status line',()=>{
  const sim=new M01AreaSimulation(19390901,{difficulty:'recruta'}),state={arrived:false,lastHealth:100};
  for(let i=0;i<20000&&!(sim.timers.wave?.lullUntil>0);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  const W=sim.timers.wave;assert.ok(W.lullUntil>0,'the lull began');
  assert.equal(sim.flags['m01np.wave'],'lull');assert.equal(approachFlagOf(sim.plan.assault,W),'lull');assert.match(sim.mission.status,/^Linha norte · pausa · \d+ atiradores? na orla · \d+ caídos?$/);
  assert.equal(sim.mission.phase,'NP_ATTACK','the objective is still to hold the north');assert.equal(sim.objectives.obj_np_hold_north.state,'active');
  const field=sim.enemies.filter(a=>a.alive&&a.active);
  assert.ok(field.length>0&&field.every(a=>sim.man(a).role==='overwatch'&&a.deck.phase==='hold'),'only the overwatch is left, holding its nodes');
  assert.ok(sim.enemies.filter(a=>sim.man(a).echelon===1).every(a=>!a.active),'nobody of the second echelon yet');
  // resupply works in the pause: beside a crate with the reserve low, E gives cartridges up to the reserve of the act
  const crate=sim.world.areaProps.find(o=>o.type==='ammo_crate_wood');
  Object.assign(sim.player,{x:crate.x,z:crate.z+1});sim.weapon.reserve=6;
  sim.tick(ACT_TICK,{interact:true});
  assert.equal(sim.weapon.reserve,sim.plan.act.resupply.reserveTo,'the crate fills the reserve');
  // the second echelon walks in when the lull is over, and the flag follows
  for(let i=0;i<4000&&sim.timers.wave.ech===0;i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  assert.equal(sim.timers.wave.ech,1);assert.equal(sim.flags['m01np.wave'],'active');assert.ok(sim.timers.wave.echs[1].at>=sim.timers.wave.echs[0].brokenAt+sim.plan.assault.echelons[1].lullSec);
  assert.ok(sim.enemies.some(a=>a.active&&sim.man(a).echelon===1),'the second echelon is on the field');
});

test('the callouts: the section leader says the lull (true to the machine guns), the second echelon and the last break, once each',()=>{
  const said=[];
  for(const [mode,seed] of [['passive',19390901],['active',7]]){
    const sim=new M01AreaSimulation(seed,{difficulty:'soldado'}),state={arrived:false,lastHealth:100},lines=[];
    for(let i=0;i<30000&&!sim.mission.complete;i++){sim.tick(ACT_TICK,actControls(sim,mode,state));sim.drainEvents();if(sim.subtitle&&!lines.includes(sim.subtitle.id))lines.push(sim.subtitle.id);}
    assert.ok(sim.mission.complete,mode);
    const by=on=>act.callouts.find(c=>c.on===on).id;
    // the order of the story: the first break, the pause, the second echelon, the last break, repelled
    const order=['fallback','echelon_seen','final_break','repelled'].map(by);
    const at=order.map(id=>lines.indexOf(id));
    assert.ok(at.every(i=>i>=0)&&at.every((i,k)=>!k||i>at[k-1]),`${mode}: ${lines.join(' ')}`);
    const lull=['lull','lull_quiet'].map(by).filter(id=>lines.includes(id));
    assert.equal(lull.length,1,`${mode}: exactly one of the two lull lines`);
    assert.ok(lines.indexOf(lull[0])>lines.indexOf(by('fallback'))&&lines.indexOf(lull[0])<lines.indexOf(by('echelon_seen')),`${mode}: the lull line is between the first break and the second echelon`);
    said.push(lull[0]);
  }
  assert.ok(said.length===2);
});

test('death and checkpoint: a dead player restores CP-E (the arrival), with the level\'s health, and the restore is valid, in the first echelon and in the second',()=>{
  const sim=new M01AreaSimulation(19390901,{difficulty:'soldado'}),state={arrived:false,lastHealth:100};
  for(let i=0;i<4000&&!(sim.timers.wave&&sim.clock-sim.timers.wave.at>5);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  assert.deepEqual(sim.checkpointsReached,['cp_np_e_perimetro']);assert.equal(sim.respawn.label,'CP-E');
  validateAreaSnapshot(strip(sim.snapshot()));
  sim.player.alive=false;sim.player.health=0;sim.playerDown('shot','de_np_0','mg34');
  assert.match(sim.failure,/fogo alemão|MG34|Kar98k/);
  sim.tick(ACT_TICK,{});const events=sim.drainEvents().map(e=>e.type);
  assert.ok(events.includes('restored'));assert.equal(sim.player.alive,true);assert.equal(sim.player.health,100);assert.equal(sim.flags['m01np.wave'],'pending');
  assert.equal(sim.objectives.obj_np_reach_trench.state,'active');
  // dead in the middle of the second echelon: the same arrival, the fight starts over from its first echelon, the later men are off the field again
  const late=new M01AreaSimulation(19390901,{difficulty:'soldado'}),st={arrived:false,lastHealth:100};
  for(let i=0;i<20000&&!(late.timers.wave?.ech===1&&late.clock-late.timers.wave.echs[1].at>15);i++){late.tick(ACT_TICK,actControls(late,'passive',st));late.drainEvents();}
  assert.equal(late.timers.wave.ech,1);assert.ok(late.enemies.some(a=>a.active&&late.man(a).echelon===1));
  late.player.alive=false;late.player.health=0;late.playerDown('shot','de_np_29','mg34');late.tick(ACT_TICK,{});
  assert.ok(late.drainEvents().some(e=>e.type==='restored'));
  assert.equal(late.timers.wave,null);assert.equal(late.flags['m01np.wave'],'pending');assert.equal(late.player.health,100);
  assert.ok(late.enemies.filter(a=>late.man(a).echelon===1).every(a=>a.alive&&!a.active&&a.deck.phase==='advance'),'the second echelon waits off the field again');
  assert.ok(late.enemies.filter(a=>late.man(a).echelon===0).every(a=>a.alive&&a.active),'the first echelon is on the field again');
  validateAreaSnapshot(strip(late.snapshot()));
});

test('the golden of Act VII-a: both routes regenerate byte for byte (x86_64; tools/verification/m01-act-vii-a-golden.mjs)',{skip:arch()!=='x64'&&'x86_64 only'},()=>{
  assert.equal(actGoldenText(),readFileSync(new URL(`../${ACT_GOLDEN_FIXTURE}`,import.meta.url),'utf8'));
});
