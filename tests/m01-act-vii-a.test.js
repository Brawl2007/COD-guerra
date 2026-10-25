import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arch} from 'node:os';
import {M01AreaSimulation,areaActPlan,validateAreaSnapshot} from '../src/game/m01-area-sim.js';
import {makeApproachPlan} from '../src/game/m01-act-factories.js';
import {M01AreaWorld} from '../src/world/m01-area-world.js';
import {buildM01AcceptedPropPlacements} from '../src/world/m01-prop-layout.js';
import {TczewWorld} from '../src/world/tczew-world.js';
import {buildTerrainEnvelope} from '../src/render/m01-terrain-envelope.js';
import {cinematicFrame,actCardFrame} from '../src/ui/m01-hud.js';
import {actRoute,actControls,ACT_TICK} from './helpers/m01-act-route.js';
import {clippingAudit,stackingAudit} from './helpers/m01-clipping.js';
import {ACT_GOLDEN_FIXTURE,actGoldenText} from './helpers/m01-act-golden.js';
import act from '../missions/m01-tczew/areas/np/act.json' with {type:'json'};
import layout from '../missions/m01-tczew/areas/np/layout.json' with {type:'json'};

// R4 INC-1 (WP-1): Act VII-a «Perímetro norte, manhã». Not a playtest: these are deterministic checks of the slice (its data, its world, its routes, its golden).
const strip=s=>JSON.parse(JSON.stringify(s));

test('the slice data: 400 x 300 m inside north_perimeter, a valid plan, every German path clear of every cover',()=>{
  const p=layout.bounds.playable;assert.equal(p.maxX-p.minX,400);assert.equal(p.maxZ-p.minZ,300);
  assert.ok(p.minX>=-900&&p.maxX<=-100&&p.minZ>=-1500&&p.maxZ<=-800,'inside map-layout north_perimeter');
  const plan=areaActPlan();assert.equal(plan.assault.men.length,13);assert.equal(plan.line.men.length,7);
  const bad=strip(act.groups.find(g=>g.id==='grp_np_de').assault);bad.lanes[0].x[1]=bad.lanes[0].x[0]+1;   // two men 1 m apart: one runs through the other's earth
  assert.throws(()=>makeApproachPlan(bad,{minX:p.minX,maxX:p.maxX}),/crosses/);
});

test('history guard: no exact hour on screen, no named vehicle type, no SS insignia; every card says what is documented and what is reconstruction',()=>{
  const sim=new M01AreaSimulation();
  assert.equal(sim.clockLabel,'MANHÃ · ~07:00');assert.doesNotMatch(sim.clockLabel,/\d\d:\d\d:\d\d/);
  const text=JSON.stringify(act)+JSON.stringify(layout);
  for(const banned of [/Panzer(?!zug)/i,/PzKpfw|Pz\.?\s?Kpfw/i,/Sd\.?\s?Kfz/i,/Panzerspäh/i,/\bTiger\b|\bPanther\b/,/Totenkopf|Waffen-SS|\bSS-[A-Z]/,/\bMP\s?40\b|\bMG\s?42\b|M1 Carbine/])
    assert.doesNotMatch(text.replace(/SS-Heimwehr Danzig chegou[^"]*"/,''),banned,String(banned));
  const entry=act.cards.entry.lines.join(' '),end=act.cards.end.lines.join(' ');
  assert.match(entry,/fonte única/);assert.match(entry,/dramatização/);assert.match(entry,/reconstrução/);assert.match(end,/T08/);
  assert.match(act.history.find(h=>h.id==='h_np_attack').classification,/DOCUMENTED/);assert.match(act.history.find(h=>h.id==='h_np_arrival').classification,/GAMEPLAY_DRAMATIZATION/);
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

test('the slice completes on 18 routes (passive and active pilot x 3 levels x 3 seeds) with no clipping and no men inside each other',()=>{
  for(const mode of ['passive','active'])for(const d of ['recruta','soldado','veterano'])for(const seed of [19390901,3,7]){
    const sim=new M01AreaSimulation(seed,{difficulty:d}),clip=clippingAudit(),stack=stackingAudit();
    const r=actRoute(sim,{mode,maxSec:600,onStep:x=>{clip.observe(x);stack.observe(x);}});
    const id=`${mode} ${d} ${seed}`;
    assert.equal(r.complete,true,id);assert.equal(sim.flags['m01np.wave'],'repelled',id);assert.equal(sim.objectives.obj_np_hold_north.state,'done',id);
    assert.deepEqual(clip.report(),[],id);assert.equal(stack.summary().pairs,0,id);
    assert.ok(sim.timers.wave.brokenAt-sim.timers.wave.at>=(mode==='passive'?20:10),`${id}: the wave fights before it breaks (20 s against the line alone, 10 s with a human-paced rifleman added)`);
    assert.ok(sim.enemyFire.nextId>=20,`${id}: the Germans fire real rounds`);assert.ok(sim.ckm.bursts>=1,`${id}: the ckm fires`);
    assert.ok(sim.timers.wave.casualties>=1&&sim.timers.wave.casualties<=13,id);
  }
});

test('death and checkpoint: a dead player restores CP-E (the arrival), with the level\'s health, and the restore is valid',()=>{
  const sim=new M01AreaSimulation(19390901,{difficulty:'soldado'}),state={arrived:false,lastHealth:100};
  for(let i=0;i<4000&&!(sim.timers.wave&&sim.clock-sim.timers.wave.at>5);i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}
  assert.deepEqual(sim.checkpointsReached,['cp_np_e_perimetro']);assert.equal(sim.respawn.label,'CP-E');
  validateAreaSnapshot(strip(sim.snapshot()));
  sim.player.alive=false;sim.player.health=0;sim.playerDown('shot','de_np_0','mg34');
  assert.match(sim.failure,/fogo alemão|MG34|Kar98k/);
  sim.tick(ACT_TICK,{});const events=sim.drainEvents().map(e=>e.type);
  assert.ok(events.includes('restored'));assert.equal(sim.player.alive,true);assert.equal(sim.player.health,100);assert.equal(sim.flags['m01np.wave'],'pending');
  assert.equal(sim.objectives.obj_np_reach_trench.state,'active');
});

test('the golden of Act VII-a: both routes regenerate byte for byte (x86_64; tools/verification/m01-act-vii-a-golden.mjs)',{skip:arch()!=='x64'&&'x86_64 only'},()=>{
  assert.equal(actGoldenText(),readFileSync(new URL(`../${ACT_GOLDEN_FIXTURE}`,import.meta.url),'utf8'));
});
