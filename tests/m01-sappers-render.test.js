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
import {SapperKit,KIT_FIT,LAMP_COLOR,GLOW} from '../src/render/m01-sapper-kit.js';
import {M01RepairLine,cableSamples,arcOf,STAKE} from '../src/render/m01-repair-line.js';
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
  assert.ok(made&&[made.pliers,made.tester,made.coil,made.crate,made.glow].every(m=>m.visible===false));
  kit.sync(made,'leader',ops('test2',{lamp:{on:true,result:'pass'}}));assert.equal(made.tester.visible,true);assert.equal(made.pliers.visible,false);assert.equal(made.lamp.material.color.getHexString(),new THREE.Color(LAMP_COLOR.pass).getHexString());
  // the glow around the lamp is what is read from 8-15 m: its colour follows the lamp (amber while it tests, red with no passage, green with passage), it is unlit and additive, and it is off when the lamp is dim or the tester is not in his hand
  assert.equal(made.glow.visible,true);assert.equal(made.glow.material.color.getHexString(),new THREE.Color(LAMP_COLOR.pass).getHexString());assert.equal(made.glow.material.blending,THREE.AdditiveBlending);assert.equal(made.glow.material.depthWrite,false);
  assert.ok(made.glow.scale.x===GLOW.size&&GLOW.size>=.3,'a glow of at least 30 cm: about 20 px at 10 m on the 720 p frame');
  kit.sync(made,'leader',ops('test',{lamp:{on:true,result:null}}));assert.equal(made.glow.visible,true);assert.equal(made.glow.material.color.getHexString(),new THREE.Color(LAMP_COLOR.testing).getHexString());
  kit.sync(made,'leader',ops('fail',{lamp:{on:true,result:'fail'}}));assert.equal(made.glow.material.color.getHexString(),new THREE.Color(LAMP_COLOR.fail).getHexString());
  kit.sync(made,'helper',ops('test'));assert.equal(made.glow.visible,false,'the helper does not hold the tester');
  kit.sync(made,'leader',ops('retreat'));assert.ok([made.pliers,made.tester,made.coil,made.crate,made.glow].every(m=>!m.visible));
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
  // each open cut is marked by two stakes with white rags (legible from 8-15 m on the dark slope), beyond the edges of the gap, on the player's side; a closed cut has none
  assert.equal(line.markers.children.length,12,'a stake and a rag at each end of three cuts');
  for(const p of ['crater','fault','second']){const c=SAPPERS.points[p],near=line.markers.children.filter(o=>o.name==='cut_stake'&&Math.hypot(o.position.x-c.x,o.position.z-c.z)<c.gapM/2+STAKE.along+STAKE.aside+.3);
    assert.equal(near.length,2,`two stakes at the ${p} cut`);for(const o of near){const dx=Math.abs(o.position.x-c.x);assert.ok(dx>c.gapM/2&&dx<c.gapM/2+STAKE.along+.4,`${p}: a stake beyond the edge of the gap, not on it (dx ${dx.toFixed(2)})`);assert.ok(o.position.z>c.z,`${p}: on the player's (south) side`);}}
  assert.ok(line.markers.children.every(o=>o.name==='cut_stake'||o.name==='cut_rag'));
  line.sync(view({crater:'closed',fault:'closed',second:'open'}),world);
  assert.equal(line.dynamic.children.filter(o=>o!==line.cable).length,3+3+2,'a sleeve and two rings of tape at each of the two closed cuts, two frayed ends at the open one');
  assert.equal(line.markers.children.length,4,'only the open cut keeps its stakes');
  line.sync(view({crater:'closed',fault:'closed',second:'closed'}),world);assert.equal(verts().length,whole,'all closed: the whole cable again');assert.equal(line.markers.children.length,0,'no stake at a repaired cut');
  assert.equal(line.diagnostics.revision,4);
  // the crate is drawn on the ground from the delivery, at the cut they work at, and not while the helper carries it
  line.sync(view({crater:'closed',fault:'closed',second:'open'},{state:'ground',point:'second'}),world);assert.equal(line.crate.visible,true);
  assert.ok(Math.abs(line.crate.position.x-(SAPPERS.points.second.slots.sapper_2.x-.7))<1e-9,'0.7 m west of the helper\'s place (2026-10-24: .55 -> .7 with the bigger crate)');
  line.sync(view({crater:'closed',fault:'closed',second:'open'},{state:'carried',carrier:'sapper_2'}),world);assert.equal(line.crate.visible,false);
  line.sync(null,world);assert.equal(line.group.visible,false);
  line.dispose();
});

test('the cable and the crate rest on the drawn ground (the injected surface), not on the analytic height, and fall back to it when the surface has no answer',()=>{
  // 2026-10-24: the terrain mesh is a 5 m lattice of terrainHeightAt, whose chords stand above the analytic profile at the toe of the slope: a 3 cm cable on the analytic height was buried there.
  const surface=(x,z)=>-2.4+.2*Math.sin(x*.7)+.05*z,world={terrainHeightAt:()=>-2.6},gaps={crater:'none',fault:'open',second:'none'},ops={gaps,box:{state:'ground',point:'fault'}};
  const line=new M01RepairLine(new THREE.Scene(),{surfaceY:surface});line.sync(ops,world);
  const a=line.cable.geometry.getAttribute('position');let lowest=Infinity;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),floor=Math.max(surface(x,z),surface(x,z-1.2),surface(x,z+1.2));lowest=Math.min(lowest,a.getY(i)-floor);}
  assert.ok(lowest>-.031,`no vertex of the tube is below the drawn ground by more than its radius (${lowest.toFixed(3)})`);
  const slot=SAPPERS.points.fault.slots[SAPPERS.helper],z=SAPPERS.points.fault.z+1.25,x=slot.x-.7;
  const corners=[[-.3,-.3],[.3,-.3],[-.3,.3],[.3,.3]].map(([dx,dz])=>surface(x+dx,z+dz));
  assert.ok(Math.abs(line.crate.position.y-(Math.max(...corners)+.02))<1e-9,'the crate rests on the highest corner of its footprint');
  const y0=line.crate.position.y;line.sync(ops,world);assert.equal(line.crate.position.y,y0,'placed once per cut, not every frame');
  // The ground under the tube is found once (a raycast on the drawn mesh per point of the route): a later rebuild interpolates that profile and only the stakes and the crate ask the surface again.
  let calls=0;const counting=new M01RepairLine(new THREE.Scene(),{surfaceY:(x,z)=>{calls++;return surface(x,z);}});counting.sync(ops,world);const first=calls;
  assert.ok(first>300,`the profile asks the surface for every sample of the route (${first} calls)`);
  counting.sync({...ops,gaps:{crater:'closed',fault:'open',second:'none'}},world);assert.ok(calls-first<40,`a rebuild asks only for the stakes and the crate (${calls-first} calls)`);
  counting.dispose();
  const fallback=new M01RepairLine(new THREE.Scene(),{surfaceY:()=>null});fallback.sync(ops,world);
  const b=fallback.cable.geometry.getAttribute('position');for(let i=0;i<b.count;i++)assert.ok(Number.isFinite(b.getY(i))&&Math.abs(b.getY(i)+2.6)<.1,'no answer from the surface: the world\'s height');
  line.dispose();fallback.dispose();
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
