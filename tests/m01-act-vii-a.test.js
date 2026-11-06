import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arch} from 'node:os';
import {M01AreaSimulation,areaActPlan,areaPlanSolids,validateAreaSnapshot} from '../src/game/m01-area-sim.js';
import {makeApproachPlan,approachFlagOf} from '../src/game/m01-act-factories.js';
import {makeRound} from '../src/game/m01-fire.js';
import {pairUnit} from '../src/game/m01-unit-hash.js';
import {eyePosition} from '../src/world/spatial.js';
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
  assert.equal(first.lullSec,0);assert.ok(second.lullSec>=20&&second.lullSec<=45,'a lull of 20-45 s (40 s since the Captain\'s decision of 2026-11-04)');
  assert.equal(act.events.find(e=>e.id==='evt_np_wave_2').trigger.lullSec,second.lullSec,'the event that documents the lull says the lull the data has');
  // the second echelon enters from the treeline line, on lanes that are not the first's, and the men of a lane follow one another in file
  for(const m of plan.assault.men.filter(m=>m.echelon===1)){assert.equal(m.entry.z,plan.assault.entryZ);assert.ok(m.delaySec>=0);}
  assert.ok(plan.assault.men.filter(m=>m.echelon===1&&m.role==='assault').some(m=>m.delaySec>0),'the lanes of the second echelon come in one after the other');
  // Captain's decision 2026-11-04 (duration): the second echelon comes in two groups, a gap of at least 15 s between the last man of the first group and the first of the second
  const delays=plan.assault.men.filter(m=>m.echelon===1&&m.role==='assault').map(m=>m.delaySec).sort((a,b)=>a-b),gaps=delays.slice(1).map((x,i)=>x-delays[i]);
  assert.ok(Math.max(...gaps)>=15&&gaps.filter(g=>g>=15).length===1,`two groups of lanes: the gaps between entries are ${gaps}`);
  assert.ok(delays.at(-1)<=second.maxSec/2,'and everybody is in before half of the echelon\'s clock');
  assert.ok(plan.assault.men.filter(m=>m.echelon===0).every(m=>m.delaySec===0),'the first echelon is on the field when the wave starts');
  const bad=ASSAULT();bad.lanes[0].x[1]=bad.lanes[0].x[0]+1;   // two men 1 m apart: one runs through the other's earth
  assert.throws(()=>build(bad),/crosses/);
  // the pause is a checkpoint (CP-F, Captain's decision 2026-11-04): the second echelon names it, and it is a checkpoint of the act other than the arrival's
  assert.deepEqual(act.checkpoints.map(c=>[c.id,c.label]),[['cp_np_e_perimetro','CP-E'],['cp_np_f_pausa','CP-F']]);
  assert.equal(first.checkpoint,null);assert.equal(second.checkpoint,'cp_np_f_pausa');
  const saved=act.checkpoints.splice(1,1);   // the same object the simulation reads: a checkpoint that is not the act's stops the game
  try{assert.throws(()=>areaActPlan(),/echelon second: checkpoint cp_np_f_pausa must be a checkpoint of the act other than the arrival's/);}finally{act.checkpoints.splice(1,0,...saved);}
  assert.ok(areaActPlan());
  // the suppressive fire of the guns is data (fire.suppress)
  const Z=plan.assault.fire.suppress;assert.equal(Z.weapon,'mg34');assert.ok(Z.memorySec>=5&&Z.memorySec<=60&&Z.rounds[0]<=Z.rounds[1]&&Z.rounds[1]<plan.assault.fire.mg.rounds,'short bursts, shorter than the gun\'s burst at a target');
  assert.ok(Z.pauseSec[0]>=3&&Z.pauseSec[1]<=10&&Z.pinnedPauseFactor>=2,'a burst every few seconds, at least half the cadence while pinned');
});

test('the path check is exact: a thin box on a long leg, between two samples of the old fixed-step check, is found; the ckm nest\'s front is a solid of the plan',()=>{
  const plan=areaActPlan().assault,m=plan.men.find(x=>x.id==='de_np_4'),a=m.entry,b=m.path[0];
  const L=Math.hypot(b.x-a.x,b.z-a.z);assert.ok(L>=80,'a long leg');
  // the old check sampled t = 0, .02, .04 ...: 1.7 m apart on this leg, wider than an expanded earth box (0.9 + 2 x 0.32 = 1.54 m); a box 0.2 m deep centred at t = .51 fell between two samples
  const zAt=a.z+(b.z-a.z)*.51,thin={id:'np_thin_box',min:{x:a.x-.1,z:zAt-.1},max:{x:a.x+.1,z:zAt+.1}};
  const dz=Math.abs(zAt-a.z)%(L*.02);assert.ok(dz>.32+.1&&L*.02-dz>.32+.1,'the box is further than a body from both neighbouring samples');
  const spec=ASSAULT(),withBox=s=>makeApproachPlan(spec,{minX:PB.minX,maxX:PB.maxX,groundY:layout.groundY,solids:s});
  assert.ok(withBox(SOLIDS));
  assert.throws(()=>withBox([...SOLIDS,thin]),/path of de_np_4 crosses np_thin_box/);
  // beside the lane by more than a body, the same box is no obstacle; and one that only touches the edge of the grown box is not a crossing
  const aside=(dx)=>({id:'aside',min:{x:a.x+dx-.1,z:zAt-.1},max:{x:a.x+dx+.1,z:zAt+.1}});
  assert.ok(withBox([...SOLIDS,aside(.5)]),'0.5 m beside the lane (its edge 0.4 m): clear of the 0.32 m a body is grown by');
  assert.throws(()=>withBox([...SOLIDS,aside(.35)]),/crosses aside/);
  assert.ok(SOLIDS.some(x=>x.id==='np_parapet_nest'),'the ckm nest front is among the solids, as the world builds it');
  assert.ok(withBox([...SOLIDS]),'and no shipped path crosses it');
});

test('a man who cannot finish his fall-back is taken off the field (fallbackStallSec), unseen at once, seen after twice the limit; the lull and the end are not held for ever',()=>{
  const stall=areaActPlan().assault.fallbackStallSec;
  for(const [seen,expected] of [[false,stall],[true,2*stall]]){
    const sim=new M01AreaSimulation(19390901,{difficulty:'soldado'}),state={arrived:false,lastHealth:100};
    let stuck=null,brokeAt=null,gone=null;const walk=sim.walk.bind(sim);
    sim.walk=(a,t,v,dt)=>a===stuck&&a.deck.phase==='fallback'?false:walk(a,t,v,dt);   // wedged on something: it never moves
    const hurt=sim.damageGerman.bind(sim);sim.damageGerman=(e,...rest)=>e===stuck?undefined:hurt(e,...rest);   // and the line cannot kill him, or there would be nothing to take off the field
    if(!seen)sim.germanTargets=()=>[];   // nobody has a line of sight to him
    for(let i=0;i<30000&&gone===null;i++){
      sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();
      const W=sim.timers.wave;
      if(W&&W.echs[0].brokenAt!==null&&stuck===null){stuck=sim.enemies.find(a=>a.alive&&a.active&&sim.man(a).role==='assault'&&sim.man(a).echelon===0)??null;brokeAt=sim.clock;}
      if(stuck&&(!stuck.active))gone=sim.clock;
      if(seen&&stuck&&sim.clock>brokeAt){sim.germanTargets=a=>a===stuck?[sim.player]:[];}   // somebody watches him all the time
    }
    assert.ok(stuck,'a man of the first echelon was falling back');assert.ok(gone!==null,'he was taken off the field');
    assert.equal(stuck.deck.phase,'clear');assert.ok(stuck.alive&&!stuck.active,'alive, off the field, `clear`: what a finished fall-back leaves');
    const waited=gone-stuck.deck.since;
    assert.ok(waited>=expected-1e-6&&waited<=expected+.2,`${seen?'seen':'unseen'}: after ${expected} s without progress, got ${waited}`);
    validateAreaSnapshot(strip(sim.snapshot()),sim.plan);   // and what is saved is valid
    for(let i=0;i<30000&&sim.timers.wave.ech===0;i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
    assert.equal(sim.timers.wave.ech,1,'the lull ran and the second echelon walked in');
  }
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
    ['delaySec beyond half the clock',a=>{a.echelons[0].lanes[0].delaySec=150;},/echelon second: lane far_west: delaySec 0-60/],
    ['delaySec list of the wrong length',a=>{a.echelons[0].lanes[0].delaySec=[1,2];},/echelon second: lane far_west: delaySec/],
    ['an overwatch gun with a stray key',a=>{a.echelons[0].overwatch[0].rate=9;},/echelon second: overwatch de_np_29/],
    ['a lane through the wreck',a=>{a.echelons[0].lanes=[{id:'only',men:['de_np_13'],x:[-390]}];a.echelons[0].breakOut=3;},/path of de_np_13 crosses np_wreck_(hull|upper)/],
    ['no fall-back stall limit',a=>{delete a.fallbackStallSec;},/fallbackStallSec 5-120/],
    ['a fall-back stall limit shorter than a leg takes to walk back',a=>{a.fallbackStallSec=15;},/fallbackStallSec 15 is shorter than a third more than the longest leg \(85\.0 m at 5\.2 m\/s\)/],
    ['a lane through the first echelon\'s earth',a=>{a.echelons[0].lanes[2].x[0]=a.lanes[1].x[0];},/crosses np_cover_de_np_[0-9]+_[0-9]/],
    ['a typo in the suppressive fire',a=>{a.fire.suppress.memorysec=9;},/fire\.suppress: unknown key memorysec/],
    ['suppressive fire that is not an object',a=>{a.fire.suppress=[1];},/fire\.suppress: an object/],
    ['suppressive fire of a rifle',a=>{a.fire.suppress.weapon='kar98k';},/fire\.suppress: weapon mg34/],
    ['no memory of the flash',a=>{a.fire.suppress.memorySec=0;},/fire\.suppress: weapon mg34 \/ memorySec 1-120/],
    ['a suppressive burst longer than the gun\'s burst at a target',a=>{a.fire.suppress.rounds=[3,a.fire.mg.rounds+1];},/rounds \[lo, hi\] whole numbers 1-6/],
    ['a suppressive burst of a fraction of a round',a=>{a.fire.suppress.rounds=[2.5,4];},/rounds \[lo, hi\]/],
    ['a pause between suppressive bursts the wrong way round',a=>{a.fire.suppress.pauseSec=[8,4];},/pauseSec \[lo, hi\] 1-60/],
    ['a pinned gun that fires faster than a free one',a=>{a.fire.suppress.pinnedPauseFactor=.5;},/pinnedPauseFactor 1-6/],
    ['a hit chance that is not an object',a=>{a.fire.suppress.hitChance=.3;},/fire\.suppress\.hitChance/],
    ['a hit chance with a stray key',a=>{a.fire.suppress.hitChance.lying=.1;},/fire\.suppress\.hitChance/],
    ['a hit chance of the cover above the exposed one',a=>{a.fire.suppress.hitChance={cover:.6,exposed:.4};},/fire\.suppress\.hitChance/],
    ['a hit chance above 1',a=>{a.fire.suppress.hitChance={cover:.1,exposed:1.5};},/fire\.suppress\.hitChance/],
    ['a blind round that pins for a minute',a=>{a.fire.suppress.pinSec=60;},/fire\.suppress\.pinSec/],
    ['a checkpoint that is not an id',a=>{a.echelons[0].checkpoint='pause';},/echelon second: checkpoint \(an id cp_/],
    ['a checkpoint on the first echelon\'s successor taken twice',a=>{a.echelons.push({...a.echelons[0],id:'third',checkpoint:a.echelons[0].checkpoint,lanes:[{id:'only3',men:['de_np_90'],x:[-540]}],overwatch:[],breakOut:1});},/echelon third: checkpoint/],
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
  // the Captain's decisions of 2026-11-04 are recorded where they act, as reversible, and the suppressive fire is dramatization (the source says only that machine guns repelled the infantry)
  const hs=act.history.find(x=>x.id==='h_np_suppress');assert.equal(hs.classification,'GAMEPLAY_DRAMATIZATION');assert.deepEqual(hs.sources,[]);assert.match(hs.text,/T08/);assert.match(hs.text,/dramatização/);
  const cpF=act.checkpoints.find(c=>c.id==='cp_np_f_pausa');assert.match(cpF.note,/Decisão do Capitão/);assert.match(cpF.note,/reversível/);assert.match(act.checkpoints[0].note,/Decisão do Capitão/);
  const sup=de.assault.fire.suppress;assert.match(sup.note,/Decisão do Capitão/);assert.match(sup.note,/reversível/);assert.match(sup.note,/GAMEPLAY_DRAMATIZATION/);
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
  // What the whole route keeps (a death does not clear it): the checkpoints taken and the suppressive bursts fired in the pause. What the last fight keeps is cleared when the fight begins again.
  const w={checkpoints:[],cpFLate:0,areaLull:0,areaFight:0,lastClock:-1};
  const clear=()=>Object.assign(w,{lullStarted:null,lullStatus:false,lullEndPhases:null,secondStatus:false,firstBreakOverwatch:null,finalBreakPhases:null,flagMismatch:0,firstSeen:new Map(),sawLullFlag:false,e2Shooters:new Set()});
  clear();
  w.event=(sim,e)=>{
    const W=sim.timers.wave;
    if(e.type==='checkpoint'){w.checkpoints.push(e.id);if(e.id==='cp_np_f_pausa'&&!(W&&W.echs[0].brokenAt!==null&&sim.clock-W.echs[0].brokenAt<=ACT_TICK+1e-9))w.cpFLate++;}
    if(e.type==='enemy-fire'&&e.kind==='area'){if(W&&W.echs[0].brokenAt!==null&&W.ech===0)w.areaLull++;else w.areaFight++;}
  };
  w.observe=sim=>{
    const W=sim.timers.wave;if(!W){clear();w.lastClock=sim.clock;return;}
    // A death in the second echelon restores the pause (CP-F): the fight is still on, the clock went back; what was recorded after the pause belongs to a life that no longer exists.
    if(sim.clock<w.lastClock-1e-9){w.lullEndPhases=null;w.secondStatus=false;w.finalBreakPhases=null;w.firstSeen.clear();w.e2Shooters.clear();}
    w.lastClock=sim.clock;
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

test('the slice completes on 18 routes (passive and active pilot x 3 levels x 3 seeds): two echelons with a lull, CP-F in the pause, at least 110 s of fight, no clipping, no men inside each other',t=>{
  const lullBursts=[];   // per route: the bursts of suppressive fire the guns fired in the pause (Captain's decision 2026-11-04: before it the guns fired 0-6 aimed bursts there, about 2 on average)
  for(const mode of ['passive','active'])for(const d of ['recruta','soldado','veterano'])for(const seed of [19390901,3,7]){
    const sim=new M01AreaSimulation(seed,{difficulty:d}),clip=areaClippingAudit(),stack=stackingAudit(),watch=watcher();
    const emit=sim.emit.bind(sim);sim.emit=e=>{watch.event(sim,e);emit(e);};   // the events of the route (the checkpoints, the bursts of suppressive fire)
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
    // the duration the owner asked for: the whole fight, wave start to repelled, is at least 110 s with either pilot (tests/m01-act-vii-a-seeds.test.js guards it on 15 seeds); the passive pilot is not stuck (6 minutes at most)
    assert.ok(W.repelledAt-W.at>=110,`${id}: wave start to repelled ${Math.round((W.repelledAt-W.at)*10)/10} s must be at least 110 s`);
    if(mode==='passive')assert.ok(sim.clock<=360,`${id}: the passive pilot is done in ${Math.round(sim.clock)} s (6 minutes at most)`);
    // CP-F: the pause is a checkpoint, taken in the tick the first echelon broke, once; the arrival is the one before it; a death in the second echelon went back to it
    assert.deepEqual([...new Set(watch.checkpoints)],['cp_np_e_perimetro','cp_np_f_pausa'],`${id}: the checkpoints of the route, in order`);assert.equal(watch.cpFLate,0,`${id}: CP-F is taken in the tick of the first break`);
    assert.deepEqual(sim.checkpointsReached,['cp_np_e_perimetro','cp_np_f_pausa'],id);assert.equal(sim.respawn.label,'CP-F',id);
    lullBursts.push([id,watch.areaLull]);
    assert.ok(sim.enemyFire.nextId>=20,`${id}: the Germans fire real rounds`);assert.ok(watch.e2Shooters.size>=(mode==='passive'?8:2),`${id}: the second echelon fires real rounds (${watch.e2Shooters.size} of its men did; the active pilot snipes men as they step out of the trees, 2-17 of them get to fire, the passive pilot 17-18)`);assert.ok(sim.ckm.bursts>=1,`${id}: the ckm fires`);
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
  // The pause is not silent any more: a gun that stays alive fires at the last flash it saw. Not every route keeps a gun (the Polish line kills the ones that stand up to fire), so the rule is the whole.
  t.diagnostic(`suppressive bursts in the pause by route: ${lullBursts.map(([id,n])=>`${id}=${n}`).join(' ')}`);
  assert.ok(lullBursts.filter(([id,n])=>n>=1).length>=15,`at least 15 of the 18 routes hear the guns in the pause: ${lullBursts.map(([id,n])=>n)}`);
  assert.ok(lullBursts.filter(([id])=>id.startsWith('passive')).every(([id,n])=>n>=1),'and every route of the pilot who never fires');
  assert.ok(lullBursts.reduce((n,[,k])=>n+k,0)>=40,`and the pause has at least 40 bursts over the 18 routes (${lullBursts.reduce((n,[,k])=>n+k,0)})`);
});

test('the lull is quiet for the assault, not for the player: the overwatch holds the edge, the crates resupply, the pause is on the status line',()=>{
  const sim=new M01AreaSimulation(19390901,{difficulty:'recruta'}),state={arrived:false,lastHealth:100};
  for(let i=0;i<20000&&!(sim.timers.wave?.lullUntil>0);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  const W=sim.timers.wave;assert.ok(W.lullUntil>0,'the lull began');
  assert.equal(sim.flags['m01np.wave'],'lull');assert.equal(approachFlagOf(sim.plan.assault,W),'lull');assert.match(sim.mission.status,/^Linha norte · pausa · \d+ atiradores? na orla · \d+ caídos?$/);
  assert.deepEqual(sim.checkpointsReached,['cp_np_e_perimetro','cp_np_f_pausa'],'the pause is a checkpoint (CP-F)');assert.equal(sim.respawn.label,'CP-F');
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

/** A passive route to the first tick of the pause (the first echelon has broken and left the field). */
function toLull(difficulty='soldado',seed=19390901){
  const sim=new M01AreaSimulation(seed,{difficulty}),state={arrived:false,lastHealth:100};
  for(let i=0;i<30000&&!(sim.timers.wave?.lullUntil>0);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  assert.ok(sim.timers.wave?.lullUntil>0,'the pause began');
  return {sim,state};
}

test('suppressive fire (Captain\'s decision 2026-11-04): a gun with nothing in sight fires short bursts at the last flash it saw, at its cadence (half of it while pinned), and forgets the flash',()=>{
  const {sim}=toLull(),Z=sim.plan.assault.fire.suppress;
  const gun=sim.enemies.find(a=>a.alive&&a.active&&a.weapon==='mg34');assert.ok(gun,'a machine gun is on the edge in the pause');
  const pole=sim.actor('pl_np_3'),markOf=()=>({x:pole.x,y:pole.y,z:pole.z,at:sim.clock,who:pole.id});
  sim.germanTargets=()=>[];sim.noteFlash=()=>{};   // nothing in sight, and the Poles\' own flashes put in no mark: only the mark this test puts in can make him fire
  const hurt=sim.damageGerman.bind(sim);sim.damageGerman=(e,...rest)=>e===gun?undefined:hurt(e,...rest);   // and the line cannot kill him: the experiment holds him still
  sim.timers.wave.lullUntil=1e9;   // and the pause does not end under the experiment (the second echelon never comes: the gun holds the edge for as long as the test watches him)
  for(const e of sim.enemies)delete e.ai.seen;
  // The experiment holds the man still: not killed, not pinned unless the test says so, his mark kept fresh unless the test lets it age.
  const trace=(sec,{pinned=false,fresh=true}={})=>{
    const bursts=[],rounds=new Map(),crouched=[];
    for(let i=0;i<Math.round(sec/ACT_TICK);i++){
      gun.suppressedUntil=pinned?sim.clock+10:0;if(fresh&&gun.ai.seen)gun.ai.seen.at=sim.clock;
      sim.tick(ACT_TICK,{});
      for(const e of sim.drainEvents())if(e.type==='enemy-fire'&&e.by===gun.id){bursts.push(e);crouched.push(gun.crouched);}
      for(const r of sim.enemyFire.rounds)if(r.by===gun.id&&!rounds.has(r.id))rounds.set(r.id,r);
    }
    return {bursts,rounds:[...rounds.values()],crouched};
  };
  const gaps=b=>b.slice(1).map((e,i)=>e.at-b[i].at);
  // no flash seen: no fire, however long
  gun.cooldown=0;assert.equal(trace(15).bursts.length,0,'without a mark the gun fires at nothing');
  // a flash seen: bursts of 3-5 real rounds ('area' kind, the gun\'s own weapon) at the place, one every 4-8 s
  gun.ai.seen=markOf();gun.cooldown=0;const mark={...gun.ai.seen};
  const on=trace(60);
  assert.ok(on.bursts.length>=7&&on.bursts.length<=15,`a burst every 4-8 s for 60 s: ${on.bursts.length}`);
  assert.ok(on.bursts.every(e=>e.kind==='area'&&e.weapon==='mg34'&&e.rounds>=Z.rounds[0]&&e.rounds<=Z.rounds[1]),'short bursts of the gun\'s own weapon');
  assert.ok(gaps(on.bursts).every(g=>g>=Z.pauseSec[0]-1e-6&&g<=Z.pauseSec[1]+2*ACT_TICK),`the pause between bursts is ${Z.pauseSec} s: ${gaps(on.bursts).map(g=>Math.round(g*100)/100)}`);
  assert.equal(on.rounds.length,on.bursts.reduce((n,e)=>n+e.rounds,0),'every round of every burst is a real round in flight');
  assert.ok(on.rounds.every(r=>r.kind==='area'&&r.by===gun.id&&Math.hypot(r.ax-mark.x,r.az-mark.z)<=4&&r.oy>mark.y+1&&r.ay>mark.y&&r.ay<mark.y+2.5),'aimed at the place of the flash, torso height of a man standing there, from the gun\'s standing eye');
  assert.ok(on.rounds.some(r=>r.tracer)&&on.rounds.every(r=>r.arriveAt>r.firedAt),'a tracer in the burst, a flight time on every round');
  // pinned: he fires blind from behind his cover, at half the cadence
  gun.cooldown=0;const pinned=trace(90,{pinned:true});
  assert.ok(pinned.bursts.length>=3&&pinned.bursts.length<=Math.floor(90/(Z.pauseSec[0]*Z.pinnedPauseFactor))+1,`pinned: ${pinned.bursts.length} bursts in 90 s`);
  assert.ok(gaps(pinned.bursts).every(g=>g>=Z.pauseSec[0]*Z.pinnedPauseFactor-1e-6&&g<=Z.pauseSec[1]*Z.pinnedPauseFactor+2*ACT_TICK),`pinned pause ${Z.pinnedPauseFactor} x: ${gaps(pinned.bursts).map(g=>Math.round(g*100)/100)}`);
  assert.ok(pinned.bursts.length<on.bursts.length*.75*(90/60),'pinned he fires less, not zero');
  assert.ok(pinned.crouched.every(c=>c===true)&&on.crouched.every(c=>c===false),'pinned: down behind his cover when he fires; free: up');
  // the flash is forgotten after memorySec: a mark that ages out stops the fire
  gun.ai.seen=markOf();gun.cooldown=0;const t0=sim.clock,aged=trace(Z.memorySec+25,{fresh:false});
  assert.ok(aged.bursts.length>=1&&aged.bursts.every(e=>e.at<=t0+Z.memorySec+1e-6),'no burst after the memory of the flash has run out');
  assert.ok(aged.bursts.length<=Math.floor(Z.memorySec/Z.pauseSec[0])+1);
});

test('suppressive fire hits only what its rounds cross, by the level\'s table: a burst at an empty place wounds and pins nobody; a burst at a man standing in the open wounds him once (the cap of the level) for the level\'s damage',()=>{
  const {sim}=toLull('veterano'),L=sim.level,gun=sim.enemies.find(a=>a.alive&&a.active&&a.weapon==='mg34');assert.ok(gun);
  sim.germanTargets=()=>[];sim.noteFlash=()=>{};for(const e of sim.enemies)delete e.ai.seen;
  const hurt=sim.damageGerman.bind(sim);sim.damageGerman=(e,...rest)=>e===gun?undefined:hurt(e,...rest);
  const fire=(mark,sec=4)=>{
    sim.enemyFire.rounds.length=0;gun.ai.seen={...mark,at:sim.clock};gun.cooldown=0;gun.health=100;gun.suppressedUntil=0;const events=[];
    for(let i=0;i<Math.round(sec/ACT_TICK);i++){gun.suppressedUntil=0;sim.tick(ACT_TICK,{});events.push(...sim.drainEvents());}
    return events;
  };
  // an empty place of the field, no man near it: the rounds land (the earth, the air), nobody is pinned or wounded
  const pinnedBefore=sim.allies.map(a=>a.suppressedUntil),health=sim.player.health;
  const empty=fire({x:-600,y:-3,z:-1250,who:'jan_wrona'});
  assert.ok(empty.some(e=>e.type==='enemy-fire'&&e.kind==='area'),'the burst was fired');
  const impacts=empty.filter(e=>e.type==='round-impact'&&e.kind==='area');assert.ok(impacts.length>=3,'its rounds landed');   // (the ckm may answer the flash in these seconds: its rounds are of another kind and are not the burst's)
  assert.ok(impacts.every(e=>e.victim===null&&e.pinned.length===0),'and struck nobody, pinned nobody');
  assert.deepEqual(sim.allies.map(a=>a.suppressedUntil),pinnedBefore);assert.equal(sim.player.health,health);
  // a man standing in the open 25 m in front of the gun: the rounds cross him, the level's table decides (exposed: certain wound on veterano; one wound per burst; the level's damage)
  const p=sim.player;Object.assign(p,{x:gun.x,y:sim.plan.layout.groundY,z:gun.z+25,crouched:false});p.health=100;
  const hit=fire({x:p.x,y:p.y,z:p.z,who:'jan_wrona'});
  assert.equal(hit.filter(e=>e.type==='player-hit').length,L.burstWoundCap,'one wound for the whole burst');
  assert.equal(sim.player.health,100-L.woundDamage,'for the damage of the level');
});

test('a Pole\'s shot is a muzzle flash: every German gun in range with a line to it remembers the place, nobody else does; the player\'s shot too',()=>{
  const sim=new M01AreaSimulation(19390901,{difficulty:'soldado'}),state={arrived:false,lastHealth:100};
  for(let i=0;i<20000&&!(sim.timers.wave&&sim.clock-sim.timers.wave.at>10);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  const F=sim.plan.assault.fire,guns=sim.enemies.filter(a=>a.alive&&a.active&&a.weapon==='mg34');assert.ok(guns.length>=2,'the guns are on the edge');
  for(const shooter of [sim.actor('pl_np_0'),sim.actor('pl_np_3'),sim.actor('szymon_kowal'),sim.actor('ckm_gunner'),sim.player]){
    for(const e of sim.enemies)delete e.ai.seen;
    sim.noteFlash(shooter);
    for(const e of sim.enemies){
      const sees=e.alive&&e.active&&e.weapon===F.suppress.weapon&&Math.hypot(e.x-shooter.x,e.z-shooter.z)<=F.rangeM&&sim.world.lineOfSight({...e,crouched:false},{...shooter,crouched:false});
      if(sees)assert.deepEqual(e.ai.seen,{x:shooter.x,y:shooter.y,z:shooter.z,at:sim.clock,who:shooter.id},`${e.id} saw ${shooter.id}`);
      else assert.equal(e.ai.seen,undefined,`${e.id} did not see ${shooter.id}`);
    }
  }
  assert.ok(guns.some(g=>g.ai.seen),'in this fight some gun sees the shooters');
  // what a man fires at he remembers too (the aimed burst): the real route leaves marks on the guns
  const live=new M01AreaSimulation(19390901,{difficulty:'soldado'}),st={arrived:false,lastHealth:100};
  for(let i=0;i<4000&&!live.enemies.some(a=>a.ai.seen);i++){live.tick(ACT_TICK,actControls(live,'passive',st));live.drainEvents();}
  const marked=live.enemies.filter(a=>a.ai.seen);assert.ok(marked.length>=1&&marked.every(a=>a.weapon==='mg34'),'only the guns keep a mark');
  validateAreaSnapshot(strip(live.snapshot()),live.plan);
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

test('death and checkpoint: a dead player restores CP-E (the arrival) in the first echelon and CP-F (the pause) in the second, with the level\'s health, and the restores are valid',()=>{
  const sim=new M01AreaSimulation(19390901,{difficulty:'soldado'}),state={arrived:false,lastHealth:100};
  for(let i=0;i<4000&&!(sim.timers.wave&&sim.clock-sim.timers.wave.at>5);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  assert.deepEqual(sim.checkpointsReached,['cp_np_e_perimetro']);assert.equal(sim.respawn.label,'CP-E');
  validateAreaSnapshot(strip(sim.snapshot()));
  sim.player.alive=false;sim.player.health=0;sim.playerDown('shot','de_np_0','mg34');
  assert.match(sim.failure,/fogo alemão|MG34|Kar98k/);
  sim.tick(ACT_TICK,{});const events=sim.drainEvents().map(e=>e.type);
  assert.ok(events.includes('restored'));assert.equal(sim.player.alive,true);assert.equal(sim.player.health,100);assert.equal(sim.flags['m01np.wave'],'pending');
  assert.equal(sim.objectives.obj_np_reach_trench.state,'active');
  // dead in the middle of the second echelon (Captain's decision 2026-11-04: CP-F, the pause): back in the pause, the first echelon already gone, the later men off the field again
  const late=new M01AreaSimulation(19390901,{difficulty:'soldado'}),st={arrived:false,lastHealth:100};
  for(let i=0;i<20000&&!(late.timers.wave?.ech===1&&late.clock-late.timers.wave.echs[1].at>15);i++){late.tick(ACT_TICK,actControls(late,'passive',st));late.drainEvents();}
  assert.equal(late.timers.wave.ech,1);assert.ok(late.enemies.some(a=>a.active&&late.man(a).echelon===1));
  assert.deepEqual(late.checkpointsReached,['cp_np_e_perimetro','cp_np_f_pausa']);
  late.player.alive=false;late.player.health=0;late.playerDown('shot','de_np_29','mg34');late.tick(ACT_TICK,{});
  assert.ok(late.drainEvents().some(e=>e.type==='restored'));assert.equal(late.respawn.label,'CP-F');
  assert.equal(late.timers.wave.ech,0);assert.equal(late.timers.wave.echs.length,1);assert.ok(late.timers.wave.echs[0].brokenAt!==null);assert.equal(late.flags['m01np.wave'],'lull');assert.equal(late.player.health,100);
  assert.ok(late.enemies.filter(a=>late.man(a).echelon===1).every(a=>a.alive&&!a.active&&a.deck.phase==='advance'),'the second echelon waits off the field again');
  assert.ok(late.enemies.filter(a=>late.man(a).echelon===0&&late.man(a).role==='assault'&&a.alive&&a.active).every(a=>a.deck.phase==='fallback'),'the first echelon\'s assault that is still on the field is falling back');
  validateAreaSnapshot(strip(late.snapshot()));
  // dead in the first echelon, after the arrival and before the first break: the arrival
  const early=new M01AreaSimulation(19390901,{difficulty:'soldado'}),se={arrived:false,lastHealth:100};
  for(let i=0;i<20000&&!(early.timers.wave&&early.clock-early.timers.wave.at>8);i++){early.tick(ACT_TICK,actControls(early,'passive',se));early.drainEvents();}
  assert.equal(early.timers.wave.echs[0].brokenAt,null);early.player.alive=false;early.player.health=0;early.playerDown('shot','de_np_0','mg34');early.tick(ACT_TICK,{});
  assert.ok(early.drainEvents().some(e=>e.type==='restored'));assert.equal(early.respawn.label,'CP-E');assert.equal(early.timers.wave,null);assert.deepEqual(early.checkpointsReached,['cp_np_e_perimetro']);
});

test('blind fire mostly suppresses (step 0 of INC-2, 2026-11-04): a blind round that crosses a man of the line hurts him with the chance of how he stands, the rest end in the earth and pin him pinSec seconds; aimed rounds are not touched',()=>{
  const {sim}=toLull(),Z=sim.plan.assault.fire.suppress,H=Z.hitChance,gun=sim.enemies.find(a=>a.alive&&a.active&&a.weapon==='mg34');
  assert.ok(H&&H.cover<=.2&&H.exposed>=.3&&H.exposed<=.7&&Z.pinSec>=1&&Z.pinSec<4,'low behind the parapet, about even when risen to fire, a shorter pin than the aimed rounds\' 4 s');
  assert.ok(gun);const man=sim.actor('pl_np_3'),origin=eyePosition({...gun,crouched:false});
  const results={cover:[],exposed:[]};let n=0;
  // One round at a time, from the gun to the man: kneeling (his head, a hand above the parapet, 1.3 m) or risen (his upper torso, 1.4 m: the parapet is 1.15 m). Rounds are landed directly; nothing else moves.
  for(const [posture,aimY,crouched] of [['cover',1.3,true],['exposed',1.4,false]])for(let k=0;k<200;k++){
    sim.enemyFire.rounds.length=0;Object.assign(man,{crouched,health:100,alive:true,suppressedUntil:0});
    const id=`np_round_${9000+n++}`,r=makeRound({id,by:gun.id,weapon:'mg34',kind:'area',origin,aim:{x:man.x,y:man.y+aimY,z:man.z},firedAt:sim.clock-1,bias:[0,0],cone:[0,0],gauss:()=>0});
    sim.enemyFire.rounds.push(r);sim.landRounds();
    const hurt=man.health<100,expected=pairUnit(man.id,id)<H[posture];
    assert.equal(hurt,expected,`${posture} ${id}: the round hurts him exactly when the pure draw of the two ids is under ${H[posture]}`);
    if(!hurt)assert.ok(Math.abs(man.suppressedUntil-(sim.clock+Z.pinSec))<1e-9,'a spared man is pinned pinSec seconds like any near miss, not the aimed 4 s');
    results[posture].push(hurt);
  }
  const share=k=>results[k].filter(Boolean).length/results[k].length;
  assert.ok(share('cover')>0&&share('cover')<=.2,`behind the parapet few are hurt: ${share('cover')}`);assert.ok(share('exposed')>=.35&&share('exposed')<=.65,`risen to fire about half: ${share('exposed')}`);
  // an aimed round (kind 'squad') at the same kneeling man is not gated: every one that reaches him hurts him, and he is pinned the aimed 4 s only by a near miss
  let aimedHits=0;
  for(let k=0;k<20;k++){
    sim.enemyFire.rounds.length=0;Object.assign(man,{crouched:true,health:100,alive:true,suppressedUntil:0});
    sim.enemyFire.rounds.push(makeRound({id:`np_round_${9500+k}`,by:gun.id,weapon:'mg34',kind:'squad',origin,aim:{x:man.x,y:man.y+1.3,z:man.z},firedAt:sim.clock-1,bias:[0,0],cone:[0,0],gauss:()=>0}));sim.landRounds();
    if(man.health<100)aimedHits++;
  }
  assert.equal(aimedHits,20,'aimed rounds hurt whoever they cross: the gate is for blind fire only');
});

test('the golden of Act VII-a: both routes regenerate byte for byte (x86_64; tools/verification/m01-act-vii-a-golden.mjs)',{skip:arch()!=='x64'&&'x86_64 only'},()=>{
  assert.equal(actGoldenText(),readFileSync(new URL(`../${ACT_GOLDEN_FIXTURE}`,import.meta.url),'utf8'));
});
