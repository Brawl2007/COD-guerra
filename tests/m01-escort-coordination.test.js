import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation,validateM01Snapshot,combatStagePlan,seconds} from '../src/game/m01-simulation.js';
import {CORRIDOR,EVACUATION_POINT,PASSED_X,corridorDataErrors,validateCorridorRecord,escortPace} from '../src/game/m01-corridor.js';
import {SQUAD,SQUAD_IDS,squadDataErrors,squadSlot,validateSquadRecord} from '../src/game/m01-squad.js';
import {route,driver,corridorControls} from './helpers/m01-route.js';
import {auditedSolids,clippingAudit,stackingAudit} from './helpers/m01-clipping.js';
import {TczewWorld} from '../src/world/tczew-world.js';

// SP-08 escort and slice-3 squad coordination (owner order 2026-10-22, «Corrigir a escolta SP-08 e a coordenação dos soldados»). State and route tests of the simulation:
// not a playtest. B4 (the west charge waits for Bąk delivered at the station) is pinned by tests/m01-partials-correction-01.test.js and checked again here on the escort route.
const STAGE=combatStagePlan();
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const seen=new Map();
function observe(seed=19390901,support=false){
  const key=seed+':'+support;if(seen.has(key))return seen.get(key);
  const o={statuses:[],counts:[],lines:[],messages:[],phases:[],moves:[],dudekSteps:[],headBeat:null,zAtBeat:null,clipping:null,stacked:null,midEscort:null,cpD:null,delivered:null,west:null,
    teamAtWest:null,crowd:null};
  const clip=clippingAudit(),stack=stackingAudit();let lastSub=null,lastPhase=null,lastMove=null,prevDudek=null;
  const r=route(seed,{support,onStep:step=>{
    const {sim,events}=step;clip.observe(step);stack.observe(step);
    const task=sim.corridorTask,c=sim.timers.corridor,q=sim.timers.squad;
    if(c&&(!o.counts.length||o.counts.at(-1).counted!==c.counted))o.counts.push({counted:c.counted,total:c.total,clock:sim.clock});
    if(sim.active('hold_corridor')&&sim.mission.status)o.statuses.push(sim.mission.status);
    if(task&&task.phase!==lastPhase){o.phases.push({phase:task.phase,clock:sim.clock});lastPhase=task.phase;}
    if(q&&q.move!==lastMove){o.moves.push({move:q.move,clock:sim.clock});lastMove=q.move;}
    if(sim.subtitle&&sim.subtitle!==lastSub){lastSub=sim.subtitle;if(sim.consumedEvent('evt_m01_east_demolition'))o.lines.push({id:sim.subtitle.id,clock:sim.clock});}
    for(const e of events)if(e.type==='message'){o.messages.push(e.message);if(e.message.startsWith('Zieliński baixa-lhe a cabeça')){o.headBeat=sim.clock;o.zAtBeat=dist(sim.actor('marek_zielinski'),sim.player);}}
    const d=sim.actor('leon_dudek'),bak=sim.actor('jozef_bak');
    if(bak.carriedBy===d.id&&bak.carry?.phase==='carry'&&prevDudek)o.dudekSteps.push({step:dist(d,prevDudek),escorted:Boolean(task?.escorted),phase:task?.phase??null,down:sim.clock<d.suppressedUntil});
    prevDudek={x:d.x,z:d.z};
    if(task?.phase==='escort'&&task.escorted&&!o.midEscort&&d.x<-120)o.midEscort=sim.snapshot();
    if(o.delivered===null&&o.dudekSteps.length&&!bak.carriedBy&&!bak.carry)o.delivered=sim.clock;
    if(o.west===null&&sim.consumedEvent('evt_m01_west_demolition')){o.west=sim.clock;o.teamAtWest=SQUAD_IDS.map(id=>({id,...(({x,z})=>({x,z}))(sim.actor(id))}));}
  }});
  o.sim=r.sim;o.cpD=r.checkpoints.cp_m01_d_retirada;o.clipping=clip.events.length;o.stacked=stack.summary().pairs;
  seen.set(key,o);return o;
}

test('SP-08 and slice-3 data: the corridor lines exist (049 and the order scripted), the fire teams have a slot at every post, clear of every solid',()=>{
  assert.deepEqual(corridorDataErrors(),[]);assert.deepEqual(squadDataErrors(STAGE.squad.slots),[]);
  assert.deepEqual(EVACUATION_POINT,{x:-332,z:24});
  assert.match(readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url),'utf8'),/const EVACUATION=\{x:-332,y:-3,z:24\};/,'the station point of the corridor module is the simulation\'s');
  assert.equal(PASSED_X,-275);assert.equal(CORRIDOR.alonePace,1.6,'Dudek alone walks as the old evacuation did');assert.ok(CORRIDOR.escortPace>=CORRIDOR.alonePace);
  const world=new TczewWorld(),solids=auditedSolids(world);
  for(const [k,post] of SQUAD.posts.entries())if(post)for(const id of SQUAD_IDS){
    const {x,z}=squadSlot(STAGE.squad.slots,id,k),y=world.heightAt(x,z),r=.3+.05;
    const inside=solids.filter(b=>y+1.45>b.min.y&&y+.1<b.max.y&&!b.obb&&x+r>b.min.x&&x-r<b.max.x&&z+r>b.min.z&&z-r<b.max.z).map(b=>b.id);
    assert.deepEqual(inside,[],`${post.id} ${id}`);
    for(const other of SQUAD_IDS)if(other!==id)assert.ok(dist(squadSlot(STAGE.squad.slots,other,k),{x,z})>=1,`${post.id}: ${id} and ${other} apart`);
  }
});

test('records are validated: a malformed corridor or squad record, or one before the east demolition, is refused',()=>{
  const reject=m=>{throw new Error(m);};
  assert.doesNotThrow(()=>validateCorridorRecord({phase:'count',counted:3,total:12,at:5,since:1},10,reject));
  for(const bad of [{phase:'wait',counted:0,total:12,at:0,since:0},{phase:'count',counted:13,total:12,at:0,since:0},{phase:'count',counted:0,total:12,at:11,since:0},{phase:'count',counted:0,total:12,at:0}])
    assert.throws(()=>validateCorridorRecord(bad,10,reject),/corridor/);
  assert.doesNotThrow(()=>validateSquadRecord({move:2,moving:true,since:4},10,reject));
  for(const bad of [{move:5,moving:false,since:0},{move:4,moving:true,since:0},{move:0,moving:'yes',since:0},{move:0,moving:false,since:20}])assert.throws(()=>validateSquadRecord(bad,10,reject),/squad/);
  const s=new M01Simulation();s.tick(.05,{skip:true});const snap=s.snapshot();snap.timers.corridor={phase:'count',counted:0,total:12,at:0,since:0};
  assert.throws(()=>validateM01Snapshot(snap),/corridor/,'no corridor before the east demolition');
});

test('control route: Jan counts the platoon one man at a time («passaram X de Y»), 047/048 at the start, 049 at the end, then the escort order',()=>{
  const o=observe();
  const total=o.counts[0].total;assert.ok(total>=12&&total<=18);assert.equal(total,o.sim.flags['m01.east_platoon_survivors']);
  o.counts.forEach((c,i)=>{assert.equal(c.counted,i,'one man at a time');if(i>0)assert.ok(c.clock-o.counts[i-1].clock>=CORRIDOR.countStepSec-1e-6);});
  assert.equal(o.counts.at(-1).counted,total);
  for(let n=0;n<=total;n++)assert.ok(o.statuses.includes(`Corredor · passaram ${n} de ${total} homens do pelotão leste`),`HUD shows ${n} of ${total}`);
  const at=id=>o.lines.find(l=>l.id===id)?.clock;
  assert.ok(at('dlg_m01_047')<at('dlg_m01_048')&&at('dlg_m01_048')<at('dlg_m01_049')&&at('dlg_m01_049')<at('dlg_m01_162'),'047, 048, 049, the order');
  assert.deepEqual(o.phases.map(p=>p.phase),['count','escort','done']);
  assert.ok(o.statuses.some(s=>s.startsWith('A escoltar Dudek com Bąk · faltam ')),'the escort on the status line');
});

test('control route: the escort is real. Dudek keeps his escort pace beside the player and stops under fire alone; the west charge still waits for Bąk (B4)',()=>{
  const o=observe();
  const escorted=o.dudekSteps.filter(s=>s.escorted&&!s.down),alone=o.dudekSteps.filter(s=>s.phase==='escort'&&!s.escorted);
  assert.ok(escorted.length>1000,'most of the carry is escorted on the pilot');
  const pace=escorted.map(s=>s.step/.05).sort((a,b)=>a-b)[Math.floor(escorted.length/2)];
  assert.ok(Math.abs(pace-CORRIDOR.escortPace)<.05,`escort pace ${pace}`);
  assert.ok(alone.some(s=>s.down&&s.step<1e-9),'alone and under fire he stays down');
  assert.ok(o.lines.some(l=>l.id==='dlg_m01_160'),'Dudek calls for cover under real fire');assert.ok(o.lines.some(l=>l.id==='dlg_m01_161'),'and notices the escort');
  assert.ok(o.delivered!==null&&o.delivered<o.west,'B4: the west demolition after the delivery');
  const sim=new M01Simulation();sim.restoreSnapshot(o.midEscort);
  assert.equal(sim.readiness('evt_m01_west_demolition'),false,'B4 in the middle of the escort');
  assert.equal(escortPace(sim,sim.actor('leon_dudek')),CORRIDOR.escortPace);
  sim.player.x+=40;sim.actor('leon_dudek').suppressedUntil=sim.clock+1;assert.equal(escortPace(sim,sim.actor('leon_dudek')),null);
});

test('control route: the section bounds cover-to-cover (four moves in order), nobody walks to the old single point, Zieliński lowers Jan\'s head within 3 m',()=>{
  const o=observe();
  assert.deepEqual(o.moves.map(m=>m.move),[0,1,2,3,4],'four bounds, in order');
  for(const m of o.teamAtWest){const slot=squadSlot(STAGE.squad.slots,m.id,2);assert.ok(dist(m,slot)<1,`${m.id} holds the rally slot at the west demolition`);}
  assert.ok(o.lines.some(l=>l.id==='dlg_m01_155'),'the first bound is ordered (scripted)');
  assert.ok(o.lines.some(l=>/^dlg_m01_15[6-9]$/.test(l.id)),'a bound is called out through the director');
  assert.ok(o.headBeat!==null&&o.zAtBeat<=CORRIDOR.headM,`the head beat (Zieliński at ${o.zAtBeat} m)`);
  assert.ok(!o.messages.some(m=>m.includes('(se o jogador estiver a até 3 m)')),'the condition is no longer printed as text');
  assert.equal(o.clipping,0,'no clipping');assert.equal(o.stacked,0,'nobody inside another man');
});

test('the mission stays whole on the escort route: 12 objectives, CP-A..D, 07:05, 18-24 minutes',()=>{
  const o=observe(),s=o.sim;
  assert.equal(s.mission.complete,true);assert.equal(s.battleClock,seconds('07:05:00'));assert.equal(s.checkpointsReached.length,4);
  assert.equal(Object.keys(s.objectives).length,12);assert.equal(s.objectives.obj_m01_hold_corridor.state,'done');
  assert.ok(s.clock>=18*60&&s.clock<=24*60,`mission ${s.clock} s`);
});

test('old saves load: a corridor save and a CP-D checkpoint without the new records restore, start them, and finish the mission on the route',()=>{
  const o=observe();
  const strip=snap=>{const x=structuredClone(snap);for(const t of [x.timers,x.resumeCheckpoint?.timers]){if(t){delete t.corridor;delete t.squad;}}
    for(const a of [...x.actors,...(x.resumeCheckpoint?.actors??[])])if(a.ai?.seen?.who==='leon_dudek')a.ai.seen=null;return x;};
  for(const [label,save] of [['mid-escort',o.midEscort],['CP-D',o.cpD]]){
    const old=strip(save);assert.ok(!('corridor' in old.timers)&&!('squad' in old.timers));
    validateM01Snapshot(old);
    const d=driver();d.sim.restoreSnapshot(old);
    d.until(()=>d.sim.consumedEvent('evt_m01_west_demolition'),500,()=>corridorControls(d.sim));
    assert.ok(d.sim.timers.squad,`${label}: the squad record started`);
    if(d.sim.corridorTask)d.walk(-292,26);
    d.walk(-263,58);d.walk(-263,70);d.until(()=>d.sim.scene?.id==='cs_m01_roll_call',30);d.step({skip:true});d.until(()=>d.sim.mission.complete,10);
    assert.equal(d.sim.battleClock,seconds('07:05:00'),label);assert.equal(d.sim.objectives.obj_m01_hold_corridor.state,'done',label);
  }
  // A save made in the middle of the retreat by older code: the squad record skips the bounds its men have already made.
  const mid=strip(o.midEscort),s=new M01Simulation();s.restoreSnapshot(mid);s.tick(.05,{});
  assert.ok(s.timers.squad.move>=2,`bounds already made are not walked again (move ${s.timers.squad.move})`);
});
