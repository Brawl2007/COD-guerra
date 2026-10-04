import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01Characters} from '../src/render/m01-characters.js';
import {RiflemanLocomotion,RIFLEMAN_PILOT_IDS,MEASURED_GAITS,GAIT_POLICY,selectGait,playbackRate,phaseOffset} from '../src/render/m01-rifleman-locomotion.js';
import {loadRig,measureClips} from '../tools/verification/m01-rifleman-clip-audit.mjs';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {actorHitboxes,muzzlePosition} from '../src/world/spatial.js';
import {route} from './helpers/m01-route.js';
const rig=await loadRig();
function fixture(enabled=true){
  const c=new M01Characters(new THREE.Scene(),{riflemanLocomotion:enabled});
  for(const nation of ['pl','de'])for(const lod of [0,1,2])c.sources.set(`${nation}:${lod}`,rig);
  for(const clip of rig.animations)c.clips.set(clip.name,clip);
  return c;
}
const actor=(id='de_spans_6')=>({id,role:'RIFLEMAN',group:'grp_de_spans',active:true,alive:true,health:100,team:'enemy',x:0,y:0,z:0,facing:Math.PI/2,state:'ADVANCE',shot:0,firedAt:-1e9});
const matrices=c=>{const out=[];for(const v of c.instances.values())v.root.traverse(n=>out.push(...n.matrixWorld.elements));return out;};
const update=(c,a,t,player={x:0,z:0},quality='low')=>c.update([a],t,player,quality,0);

test('real measured GLB metadata, feet contacts and checked runtime calibration agree',async()=>{
  const actual=await measureClips(),saved=JSON.parse(readFileSync(new URL('../docs/verification/m01-runtime/rifleman-locomotion-2026-10-03/clip-audit.json',import.meta.url)));
  assert.deepEqual(actual,saved);
  for(const [name,m]of Object.entries(actual.clips)){
    assert.equal(m.durationS,MEASURED_GAITS[name].duration);assert.equal(m.nominalSpeedMps,MEASURED_GAITS[name].nominalSpeed);assert.equal(m.inPlace,true);
    assert.ok(m.contacts.left.length&&m.contacts.right.length);assert.ok(m.sourceKeyframes>15);
  }
  assert.ok(actual.clips.walk.nominalSpeedMps<1.2);assert.ok(actual.clips.run.nominalSpeedMps>3.2);
});
test('playback follows measured speed; bounded rates, gait hysteresis and idle threshold',()=>{
  assert.equal(selectGait(1.5),'walk');assert.equal(selectGait(3.6),'run');assert.equal(selectGait(5.5),'run');
  assert.equal(selectGait(GAIT_POLICY.runEnter-.01,'walk'),'walk');assert.equal(selectGait(GAIT_POLICY.runEnter+.01,'walk'),'run');
  assert.equal(selectGait(GAIT_POLICY.runExit+.01,'run'),'run');assert.equal(selectGait(GAIT_POLICY.runExit-.01,'run'),'walk');
  assert.equal(selectGait(0,'run'),'standing_idle');assert.equal(playbackRate(1.099945,'walk'),1);assert.equal(playbackRate(100,'walk'),1.8);assert.equal(playbackRate(.01,'run'),.5);
});
test('mission-time crossfades retain continuous weights when interrupted and same phase on walk/run',()=>{
  const r=new RiflemanLocomotion(),a=actor();r.observe(a,0,true);a.x=.075;const start=r.observe(a,.05,true);
  assert.equal(start.gait,'walk');assert.equal(start.weights.standing_idle,1);assert.equal(start.weights.walk,0);
  a.x+=.15;const middle=r.observe(a,.15,true);assert.ok(middle.weights.walk>0&&middle.weights.walk<1);
  a.x+=.15;const finished=r.observe(a,.25,true); // still within .22 s
  a.x+=.055;const running=r.observe(a,.26,true);assert.equal(running.gait,'run');
  assert.ok(Math.abs(running.weights.walk-finished.weights.walk)<.08);
  assert.equal(running.weights.run,0);assert.equal(running.times.walk/1,running.times.run/.68);
  const paused=r.observe(a,.26,true);assert.deepEqual(paused,running);
  assert.equal(RIFLEMAN_PILOT_IDS.length,4);assert.notEqual(phaseOffset('de_spans_6'),phaseOffset('de_spans_7'));
});
test('real mixer freezes both feet and fade on repeated mission time; no actor mutation',()=>{
  const c=fixture(),a=actor(),before=structuredClone(a);
  try{update(c,a,0);a.z=.15;update(c,a,.1);a.z+=.15;update(c,a,.2);const bones=matrices(c),plan=c.diagnostics.actors[0].locomotion;
    for(let i=0;i<20;i++)update(c,a,.2);assert.deepEqual(matrices(c),bones);assert.deepEqual(c.diagnostics.actors[0].locomotion,plan);
    assert.deepEqual({...a,z:before.z},before);
  }finally{c.dispose();}
});
test('LOD0/LOD2 and camera culling keep phase/gait; identical mission inputs give identical bones',()=>{
  const near=fixture(),far=fixture(),a=actor();try{
    for(let i=0;i<=30;i++){a.z=i*.075;update(near,a,i*.05,{x:0,z:a.z},'high');update(far,a,i*.05,{x:80,z:a.z},'low');}
    assert.equal(near.instances.get(a.id).key,'de:0');assert.equal(far.instances.get(a.id).key,'de:2');
    assert.deepEqual(near.diagnostics.actors[0].locomotion,far.diagnostics.actors[0].locomotion);assert.deepEqual(matrices(near),matrices(far));
    update(far,a,1.5,{x:1000,z:0});assert.equal(far.instances.size,0);
    update(far,a,1.5,{x:80,z:a.z});assert.deepEqual(matrices(near),matrices(far));
  }finally{near.dispose();far.dispose();}
});
test('only selected ordinary riflemen opt in; firing/crouch/wounded/drag/CKM/MG paths keep existing priority',()=>{
  const c=fixture();try{
    for(const id of ['de_east_0','de_east_1','generic_rifleman','leon_dudek','ckm_gunner','ckm_loader','ckm_rifleman','jozef_bak','marek_zielinski'])assert.equal(c.riflemanLocomotion.observe(actor(id),0,true),null);
    const a=actor();update(c,a,0);a.z=.15;update(c,a,.1);assert.ok(c.diagnostics.actors[0].locomotion);
    a.shot=.2;a.firedAt=.1;update(c,a,.15);assert.equal(c.diagnostics.actors[0].clip,'fire_bolt');assert.equal(c.diagnostics.actors[0].locomotion,undefined);
    a.shot=0;a.crouched=true;update(c,a,.2);assert.equal(c.diagnostics.actors[0].clip,'crouched_idle');
    a.state='WOUNDED';update(c,a,.25);assert.equal(c.diagnostics.actors[0].clip,'wounded');
  }finally{c.dispose();}
});
test('missing complete/partial animation GLB returns control to procedural fallback without changing actor',()=>{
  for(const missing of [null,'walk','run','standing_idle']){
    const c=fixture(),a=actor(),before=structuredClone(a);if(missing)c.clips.delete(missing);else c.clips.clear();
    try{assert.equal(update(c,a,0).has(a.id),false);assert.equal(c.instances.size,0);a.z=.15;assert.equal(update(c,a,.1).has(a.id),false);assert.deepEqual({...a,z:before.z},before);}
    finally{c.dispose();}
  }
});
test('baseline vs candidate on real complete mission samples: snapshots, transforms, facing, HP, shots, RNG, hitboxes and gameplay muzzle identical',()=>{
  const base=fixture(false),candidate=fixture(),proof={samples:0,activePilotSamples:0};
  try{
    route(19390901,{onStep:({sim})=>{
      if(++proof.samples%100)return;
      const before=sim.snapshot(),boxes=sim.actors.map(actorHitboxes),muzzles=sim.actors.map(a=>muzzlePosition(a,sim.clock));
      // Camera observes the four pilot IDs in two independent renderer passes.
      for(const a of sim.actors.filter(a=>RIFLEMAN_PILOT_IDS.includes(a.id)&&a.active)){
        proof.activePilotSamples++;base.update(sim.actors,sim.clock,a,'low',sim.battleClock);candidate.update(sim.actors,sim.clock,a,'low',sim.battleClock);
        for(const id of RIFLEMAN_PILOT_IDS){const b=base.instances.get(id),c=candidate.instances.get(id);if(b&&c){assert.deepEqual(c.root.position.toArray(),b.root.position.toArray());assert.deepEqual(c.root.rotation.toArray(),b.root.rotation.toArray());}}
      }
      assert.deepEqual(sim.snapshot(),before);assert.deepEqual(sim.actors.map(actorHitboxes),boxes);assert.deepEqual(sim.actors.map(a=>muzzlePosition(a,sim.clock)),muzzles);
    }});
    assert.ok(proof.samples>20000);assert.ok(proof.activePilotSamples>100);
  }finally{base.dispose();candidate.dispose();}
});
test('schema 2 mid-locomotion restore keeps gameplay exactly equal with fresh visual history',()=>{
  const sim=new M01Simulation();sim.tick(.05,{skip:true});const a=sim.actor('de_spans_6');a.active=true; // explicit test fixture, not mission script
  const c=fixture();try{
    for(let i=0;i<20;i++){sim.tick(.05,{});c.update(sim.actors,sim.clock,a,'low',sim.battleClock);}
    const saved=sim.snapshot(),restored=new M01Simulation();restored.restoreSnapshot(saved);const fresh=fixture();
    try{fresh.update(restored.actors,restored.clock,restored.actor(a.id),'low',restored.battleClock);assert.deepEqual(restored.snapshot(),saved);
      for(let i=0;i<20;i++){sim.tick(.05,{});restored.tick(.05,{});c.update(sim.actors,sim.clock,a);fresh.update(restored.actors,restored.clock,restored.actor(a.id));assert.deepEqual(restored.snapshot(),sim.snapshot());}
      assert.equal(saved.schema,2);assert.equal(JSON.stringify(saved).includes('locomotionActions'),false);
    }finally{fresh.dispose();}
  }finally{c.dispose();}
});

test('two independent schema 2 continuations with same inputs and ON/OFF renderers have exact gameplay and RNG equality per tick',()=>{
  const saved=JSON.parse(readFileSync(new URL('../docs/verification/m01-runtime/rifleman-locomotion-2026-10-03/locomotion-snapshot.json',import.meta.url))),a=new M01Simulation(),b=new M01Simulation();
  a.restoreSnapshot(saved);b.restoreSnapshot(saved);const base=fixture(false),candidate=fixture();let rendered=0;
  try{
    for(let i=0;i<400;i++){
      const input={fire:i%26===0,reload:i%100===0,lookX:i%37===0?.25:0};a.tick(.05,input);b.tick(.05,input);
      const player={...a.actor('pl_east_0')};base.update(a.actors,a.clock,player,'low',a.battleClock);candidate.update(b.actors,b.clock,player,'low',b.battleClock);
      assert.deepEqual(b.snapshot(),a.snapshot(),`tick ${i}`);assert.deepEqual(b.actors.map(actorHitboxes),a.actors.map(actorHitboxes));
      assert.deepEqual(b.actors.map(x=>muzzlePosition(x,b.clock)),a.actors.map(x=>muzzlePosition(x,a.clock)));
      if(candidate.diagnostics.actors.some(a=>a.locomotion?.speed>0))rendered++;
    }
    assert.ok(rendered>20);
  }finally{base.dispose();candidate.dispose();}
});
test('all three quality presets observe identical semantic movement without gameplay RNG',()=>{
  const views=['low','medium','high'].map(()=>fixture()),a=actor();try{
    for(let i=0;i<30;i++){a.x=i*.18;views.forEach((c,k)=>update(c,a,i*.05,{x:a.x+2,z:0},['low','medium','high'][k]));}
    const plans=views.map(c=>c.diagnostics.actors[0].locomotion);assert.deepEqual(plans[0],plans[1]);assert.deepEqual(plans[1],plans[2]);
  }finally{views.forEach(c=>c.dispose());}
});
