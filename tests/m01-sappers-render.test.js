// R3-a (2026-10-24, golden amendment 19): the presentation of the sappers' staged operation. No browser here (the captures are in docs/verification/m01-runtime/sappers-r3a-2026-10-24): the pure choice of
// clip per phase and role from the T08 library (src/render/m01-sapper-pose.js), the props the men hold (m01-sapper-kit.js), the cable with its cuts and splices (m01-repair-line.js) and the wiring
// in M01Characters, all reading sim.sapperOps. Presentation only: nothing here writes a simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {SAPPERS,sapperPhase,sapperView,SAPPER_PHASES,SAPPER_STAGE_IDS} from '../src/game/m01-sappers.js';
import {sapperSample,SAPPER_POSE_CLIPS,WORK_RATE,CALL_OUT_SEC} from '../src/render/m01-sapper-pose.js';
import {SapperKit,KIT_FIT,LAMP_COLOR} from '../src/render/m01-sapper-kit.js';
import {M01RepairLine,cableSamples,arcOf} from '../src/render/m01-repair-line.js';
import {M01Characters} from '../src/render/m01-characters.js';
import {actorPose} from '../src/render/m01-actor-pose.js';
import {driver,toRepair} from './helpers/m01-route.js';

const manifest=path=>JSON.parse(readFileSync(new URL(`../assets/models/provisional/m01/characters/${path}`,import.meta.url),'utf8'));
const LIBRARY=new Set([...manifest('manifest.json').files['m01_soldier_animations.glb'].clips.map(c=>c.name),...manifest('clip-library-v2/manifest.json').clips.map(c=>c.name),
  ...manifest('crews-evacuation/manifest.json').clips.map(c=>c.name),...manifest('motion-clips-v1/manifest.json').clips.map(c=>c.name)]);
const ROLES={pawel_krawiec:'leader',sapper_2:'helper',sapper_3:'watch'};
const man=(id,extra={})=>({id,role:'ENGINEER',alive:true,active:true,state:'GUARD',team:'ally',crouched:false,posture:'stand',postureSince:0,suppressedUntil:0,firedAt:-1e9,shot:0,facing:0,bodyYaw:0,
  motion:{speed:0,odometer:0,gait:'idle',gaitSince:0},...extra});
const ops=(phase,extra={})=>({phase,stage:SAPPER_STAGE_IDS.includes(phase)?phase:null,t:5,roles:ROLES,leader:'pawel_krawiec',box:{state:'ground',point:'fault'},lamp:{on:false,result:null},gaps:{crater:'closed',fault:'open',second:'open'},...extra});

test('every clip the operation plays is in the T08 library or the base packs, and the library has no clip named for a kind of work the game does not show',()=>{
  for(const c of SAPPER_POSE_CLIPS)assert.ok(LIBRARY.has(c),`${c} is in the clip library`);
  assert.ok(LIBRARY.has('sapper_work')&&LIBRARY.has('sapper_work_pinned'));
  // nothing here needed a new clip: the stage poses are the old ones played slower, faster, or in another role
  assert.ok(WORK_RATE.inspect<WORK_RATE.splice&&WORK_RATE.test<WORK_RATE.inspect&&WORK_RATE.splice===1,JSON.stringify(WORK_RATE));
});

test('the clip of each phase and role: the work stages kneel at the cable (the leader and the helper work, the watch looks out), the test and the report are told with the shout, the rest stand',()=>{
  const clipOf=(phase,id,o={},extra={})=>sapperSample(man(id,extra),ops(phase,o),12,0,null,{name:'standing'})?.clip??null;
  for(const phase of ['inspect','splice','inspect2','splice2']){
    assert.equal(clipOf(phase,'pawel_krawiec'),'sapper_work',`${phase} leader`);assert.equal(clipOf(phase,'sapper_2'),'sapper_work',`${phase} helper`);assert.equal(clipOf(phase,'sapper_3'),'cover_low_idle',`${phase} watch`);
  }
  for(const phase of ['test','test2']){
    assert.equal(clipOf(phase,'pawel_krawiec'),'sapper_work');assert.equal(clipOf(phase,'sapper_2'),'crouched_idle_b');assert.equal(clipOf(phase,'sapper_3'),'cover_low_idle');
  }
  // the pace of the hands: slow while he examines or tests, full while he splices
  const rate=(phase)=>sapperSample(man('pawel_krawiec'),ops(phase),12,0,null,{name:'standing'}).rate;
  assert.equal(rate('inspect'),WORK_RATE.inspect);assert.equal(rate('splice'),1);assert.equal(rate('test'),WORK_RATE.test);
  // the failed test: the leader stands and calls to the others, then stands; the helper and the watch kneel
  assert.equal(sapperSample(man('pawel_krawiec'),ops('fail',{t:.5}),12,0,null,{}).clip,'call_out');
  assert.equal(sapperSample(man('pawel_krawiec'),ops('fail',{t:CALL_OUT_SEC+.5}),12,0,null,{}).clip,'standing_idle_c');
  assert.equal(clipOf('fail','sapper_2'),'crouched_idle_b');assert.equal(clipOf('fail','sapper_3'),'cover_low_idle');
  // the wait for the box, the report, the wait for the order, the look at the blast
  assert.deepEqual(['pawel_krawiec','sapper_2','sapper_3'].map(id=>clipOf('standby',id)),['crouched_idle_b','standing_idle_c','crouched_idle']);
  assert.equal(sapperSample(man('pawel_krawiec'),ops('report',{t:.3}),12,0,null,{}).clip,'call_out');
  assert.deepEqual(['pawel_krawiec','sapper_2','sapper_3'].map(id=>clipOf('ready',id)),['crouched_idle_b','standing_idle_c','standing_idle']);
  assert.deepEqual(['pawel_krawiec','sapper_2','sapper_3'].map(id=>clipOf('verify',id)),['standing_idle_c','standing_idle_b','standing_idle']);
  assert.equal(clipOf('verify_west','sapper_2'),'standing_idle_b');
  // every phase of the plan is either drawn by this module or left to the old rules, never an unknown clip
  for(const phase of SAPPER_PHASES)for(const id of Object.keys(ROLES)){const c=sapperSample(man(id),ops(phase),12,0,null,{});if(c)assert.ok(LIBRARY.has(c.clip),`${phase} ${id}: ${c.clip}`);}
});

test('the old rules decide the camp, the retreat, the walk to the cut, a man on the move (but the crate carrier), a man lying down, a flinch, and a man who is not a sapper',()=>{
  for(const phase of ['camp','retreat','locate'])assert.equal(sapperSample(man('pawel_krawiec',{crouched:true}),ops(phase),12,0,null,{}),null,phase);
  const walking={motion:{speed:1.8,odometer:30,gait:'walk',gaitSince:1}};
  assert.equal(sapperSample(man('pawel_krawiec',walking),ops('relocate',{box:{state:'carried',carrier:'sapper_2'}}),12,0,null,{moving:true}),null,'the leader walks with the ordinary gait');
  const carry=sapperSample(man('sapper_2',walking),ops('relocate',{box:{state:'carried',carrier:'sapper_2'}}),12,0,null,{moving:true});
  assert.equal(carry.clip,'carry_walk');assert.equal(carry.loop,true);assert.ok(Math.abs(carry.rate-1.8/1.6)<1e-9,'the stride follows his real speed');
  assert.equal(sapperSample(man('sapper_3',walking),ops('relocate',{box:{state:'carried',carrier:'sapper_2'}}),12,0,null,{moving:true}),null,'only the helper carries');
  assert.equal(sapperSample(man('sapper_2',{posture:'prone'}),ops('splice'),12,0,null,{}),null,'prone: the library\'s prone clips');
  assert.equal(sapperSample(man('sapper_2'),null,12,0,null,{}),null,'no operation view: the old rules');
  assert.equal(sapperSample({...man('marek_zielinski'),role:'SQUAD_LEADER'},ops('splice'),12,0,null,{}),null);
  assert.equal(sapperSample({...man('sapper_2'),alive:false},ops('splice'),12,0,null,{}),null);
  // a near miss is still a flinch: the reaction of the resolver wins over the work
  const hit=man('sapper_2',{hitAt:11.9,hitYaw:0}),r=sapperSample(hit,ops('splice'),12,0,{has:()=>true,get:()=>({duration:1}),size:99,info:()=>({duration:1})},{});
  assert.ok(r&&r.clip!=='sapper_work','a hit this instant is shown, not the work');
});

test('the props: pliers while the leader examines or splices, the tester while the line is tested (its lamp dim, red with no passage, green with passage), the coil in the helper\'s hand, the crate on his shoulder for the walk',()=>{
  const v=(role,phase,extra)=>SapperKit.visibility(role,ops(phase,extra));
  for(const phase of ['inspect','splice','inspect2','splice2'])assert.deepEqual(v('leader',phase),{pliers:true,tester:false,coil:false,crate:false},phase);
  for(const phase of ['test','test2','fail'])assert.deepEqual(v('leader',phase),{pliers:false,tester:true,coil:false,crate:false},phase);
  assert.equal(v('leader','report',{t:1}).tester,true,'he still holds it as he calls');assert.equal(v('leader','report',{t:5}).tester,false);
  assert.deepEqual(v('helper','splice'),{pliers:false,tester:false,coil:true,crate:false});
  assert.deepEqual(v('helper','relocate',{box:{state:'carried',carrier:'helper'}}),{pliers:false,tester:false,coil:false,crate:true});
  for(const phase of SAPPER_PHASES)assert.deepEqual(v('watch',phase),{pliers:false,tester:false,coil:false,crate:false},`the watch holds nothing in ${phase}`);
  for(const phase of ['camp','locate','standby','ready','verify','retreat'])for(const role of ['leader','helper'])assert.ok(Object.values(v(role,phase)).every(x=>!x),`${role} in ${phase}`);
  assert.equal(SapperKit.lamp(ops('test',{lamp:{on:true,result:null}})),LAMP_COLOR.testing);assert.equal(SapperKit.lamp(ops('fail',{lamp:{on:true,result:'fail'}})),LAMP_COLOR.fail);
  assert.equal(SapperKit.lamp(ops('report',{lamp:{on:false,result:'pass'}})),LAMP_COLOR.pass);assert.equal(SapperKit.lamp(ops('camp')),LAMP_COLOR.idle);
  // the kit builds on a rig with the bones (the soldier GLB's names) and hides everything until a phase asks
  const root=new THREE.Group(),bones={};for(const f of Object.values(KIT_FIT)){bones[f.bone]??=new THREE.Object3D();bones[f.bone].name=f.bone;root.add(bones[f.bone]);}
  const kit=new SapperKit(),made=kit.attach(root);
  assert.ok(made&&[made.pliers,made.tester,made.coil,made.crate].every(m=>m.visible===false));
  kit.sync(made,'leader',ops('test2',{lamp:{on:true,result:'pass'}}));assert.equal(made.tester.visible,true);assert.equal(made.pliers.visible,false);assert.equal(made.lamp.material.color.getHexString(),new THREE.Color(LAMP_COLOR.pass).getHexString());
  kit.sync(made,'leader',ops('retreat'));assert.ok([made.pliers,made.tester,made.coil,made.crate].every(m=>!m.visible));
  kit.sync(null,'x',null);   // a LOD without the bones has no kit: nothing happens
  assert.equal(kit.attach(new THREE.Group()),null);
  kit.dispose();
});

test('the cable: sampled along the drawn route, cut where the simulation says (open: a gap with frayed ends; closed: a sleeve; none: whole), rebuilt only when a cut changes',()=>{
  const s=cableSamples(),route=SAPPERS.cable;
  const length=route.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0);
  assert.ok(Math.abs(s.total-length)<1e-9&&s.pts.at(-1).s===s.total);
  for(let i=1;i<s.pts.length;i++)assert.ok(s.pts[i].s>s.pts[i-1].s&&s.pts[i].s-s.pts[i-1].s<=2.1+1e-9,'a sample at most 1.5 steps from the last');
  const line=new M01RepairLine(new THREE.Scene()),world={terrainHeightAt:()=>-2.6};
  const arcFault=arcOf(s,SAPPERS.points.fault.x,SAPPERS.points.fault.z),arcSecond=arcOf(s,SAPPERS.points.second.x,SAPPERS.points.second.z);
  assert.ok(arcSecond<arcFault&&Math.abs(arcFault-arcSecond-16.2)<1.2,'the second cut is 16 m before the fault along the route');
  const view=(gaps,box={state:'none'})=>({gaps,box});
  // the tube's x range per gap: no vertex inside an open gap, vertices on both sides
  const verts=()=>{const a=line.cable.geometry.getAttribute('position'),out=[];for(let i=0;i<a.count;i++)out.push([a.getX(i),a.getZ(i)]);return out;};
  line.sync(view({crater:'none',fault:'none',second:'none'}),world);const whole=verts().length;
  assert.ok(whole>200);assert.equal(line.diagnostics.revision,1);
  line.sync(view({crater:'none',fault:'none',second:'none'}),world);assert.equal(line.diagnostics.revision,1,'unchanged state: no rebuild');
  line.sync(view({crater:'open',fault:'open',second:'open'}),world);
  const open=verts();assert.ok(open.length<whole,'three cuts take cable away');
  for(const p of ['crater','fault','second']){const c=SAPPERS.points[p];
    const inside=open.filter(([x,z])=>Math.hypot(x-c.x,z-c.z)<c.gapM/2-.05);assert.equal(inside.length,0,`no cable inside the ${p} cut`);
    assert.ok(open.some(([x,z])=>Math.hypot(x-c.x,z-c.z)<c.gapM/2+.2),`cable reaches the edge of the ${p} cut`);}
  const stubs=line.dynamic.children.filter(o=>o!==line.cable).length;assert.equal(stubs,6,'two frayed ends at each open cut');
  line.sync(view({crater:'closed',fault:'closed',second:'open'}),world);
  assert.equal(line.dynamic.children.filter(o=>o!==line.cable).length,3+3+2,'a sleeve and two rings of tape at each of the two closed cuts, two frayed ends at the open one');
  line.sync(view({crater:'closed',fault:'closed',second:'closed'}),world);assert.equal(verts().length,whole,'all closed: the whole cable again');
  assert.equal(line.diagnostics.revision,4);
  // the crate is drawn on the ground from the delivery, at the cut they work at, and not while the helper carries it
  line.sync(view({crater:'closed',fault:'closed',second:'open'},{state:'ground',point:'second'}),world);assert.equal(line.crate.visible,true);
  assert.ok(Math.abs(line.crate.position.x-(SAPPERS.points.second.slots.sapper_2.x-.55))<1e-9);
  line.sync(view({crater:'closed',fault:'closed',second:'open'},{state:'carried',carrier:'sapper_2'}),world);assert.equal(line.crate.visible,false);
  line.sync(null,world);assert.equal(line.group.visible,false);
  line.dispose();
});

test('the wiring: M01Characters draws a sapper with the clip of his phase when it has the operation view and with the old rules when it has none',async()=>{
  const d=toRepair(driver(19390901)),{sim,step}=d;sim.landRound=()=>{};
  const c=new M01Characters(new THREE.Scene());
  for(const name of LIBRARY)c.clips.set(name,new THREE.AnimationClip(name,name==='call_out'?2:3,[]));
  try{
    for(let i=0;i<20*30;i++)step({});   // into the splice
    const o=sim.sapperOps,leader=sim.actor('pawel_krawiec'),helper=sim.actor('sapper_2'),watch=sim.actor('sapper_3');
    assert.equal(o.phase,'splice');
    c.ops=o;assert.deepEqual([leader,helper,watch].map(a=>c.sample(a,sim.clock,sim.actors,actorPose(a,sim.clock),sim.battleClock).clip),['sapper_work','sapper_work','cover_low_idle']);
    c.ops=null;assert.deepEqual([leader,helper,watch].map(a=>c.sample(a,sim.clock,sim.actors,actorPose(a,sim.clock),sim.battleClock).clip),['sapper_work','sapper_work','sapper_work'],'without it the old single pose');
    // the walk with the crate
    for(let i=0;i<20*200&&sim.sapperOps.phase!=='relocate';i++)step({});
    for(let i=0;i<20*3;i++)step({});
    c.ops=sim.sapperOps;assert.equal(c.ops.box.state,'carried');
    assert.equal(c.sample(helper,sim.clock,sim.actors,actorPose(helper,sim.clock),sim.battleClock).clip,'carry_walk');
    assert.notEqual(c.sample(leader,sim.clock,sim.actors,actorPose(leader,sim.clock),sim.battleClock).clip,'carry_walk');
    // sync of the kit through the real attach path needs the GLBs (browser); here the view the renderer reads is the simulation's own
    assert.deepEqual(sapperView(sim),sim.sapperOps);
  }finally{c.dispose();}
});
