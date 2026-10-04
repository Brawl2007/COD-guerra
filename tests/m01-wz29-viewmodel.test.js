import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {M01ViewModel} from '../src/render/m01-viewmodel.js';
import {M01ViewModel as BaseViewModel} from '../tools/verification/fixtures/m01-wz29-base-viewmodel.mjs';
import {WZ29_VISUAL,recoilEnvelope,presentationPose,advanceVisualBlend} from '../src/render/m01-wz29-presentation.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {Wz29} from '../src/game/wz29.js';
import {muzzlePosition,actorHitboxes} from '../src/world/spatial.js';
import {viewModelFixture,geometryReport,readCharacterGLB} from './helpers/m01-viewmodel-fixture.js';
import {alignmentReport} from '../tools/verification/m01-wz29-viewmodel-audit.mjs';

const make=characters=>new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture());
const data=()=>({clock:10,player:{aiming:true,moveBlend:0,sprinting:false},weapon:new Wz29(),renderState:{weaponVisible:true}});

test('measured real clips and asset socket metadata are locked; archived BASE is exact',async()=>{
  const c=await viewModelFixture();
  try{
    assert.equal(c.clips.get('aim').duration,2);
    assert.equal(c.clips.get('fire_bolt').duration,1.1699999570846558);
    assert.equal(c.clips.get('reload_clip').duration,3.4000000953674316);
    const source=readCharacterGLB('m01_soldier_pl_lod0.glb').json.nodes[0].extras;
    assert.deepEqual(source.sockets.rear_sight,WZ29_VISUAL.rear);assert.deepEqual(source.sockets.muzzle,WZ29_VISUAL.muzzle);
    const root=c.sources.get('pl:0').scene,rifle=root.getObjectByName('rifle'),weapon=root.getObjectByName('weapon');
    const position=rifle.geometry.getAttribute('position'),point=new THREE.Vector3(),blade=[];
    for(let i=0;i<position.count;i++){
      point.fromBufferAttribute(position,i);rifle.applyBoneTransform(i,point).applyMatrix4(rifle.matrixWorld);weapon.worldToLocal(point);
      if(Math.abs(point.x)<.003&&Math.abs(point.z-WZ29_VISUAL.front[2])<.004&&point.y>.056)blade.push(point.y);
    }
    assert.ok(blade.length>0);assert.ok(Math.abs(Math.max(...blade)-WZ29_VISUAL.front[1])<1e-6,'front landmark measured on actual simplified blade vertices');
    assert.equal(createHash('sha256').update(readFileSync(new URL('../tools/verification/fixtures/m01-wz29-base-viewmodel.mjs',import.meta.url))).digest('hex'),'6fd9cc2fc5831c7d22d2f3b774b17b1194152e2a7a73b6a41f7bf37679dd062a');
  }finally{c.dispose();}
});
test('production simulation, muzzle/hitboxes, RNG, third-person and environment retain BASE bytes',()=>{
  const hashes=JSON.parse(readFileSync(new URL('../tools/verification/fixtures/m01-wz29-protected-hashes.json',import.meta.url)));
  for(const [path,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash,path);
});
for(const lod of [0,1])test(`ADS aligns actual rear/front with camera -Z on LOD${lod}, all qualities`,async()=>{
  const c=await viewModelFixture(lod),v=make(c),s=data();
  try{for(const quality of ['low','medium','high']){
    v.update(s,quality,0);const a=alignmentReport(v);
    for(const key of ['horizontalPixels','verticalPixels','centerHorizontalPixels','centerVerticalPixels'])assert.ok(a[key]<WZ29_VISUAL.adsTolerancePixels,`${key}: ${a[key]}`);
    assert.ok(a.points.rear[2]<-.7&&a.points.front[2]<a.points.rear[2]);
  }}finally{v.dispose();c.dispose();}
});
test('visual flash starts exactly on the barrel socket through hip, ADS, bolt, reload and run',async()=>{
  const c=await viewModelFixture(),v=make(c),s=data();
  try{for(let i=0;i<80;i++){
    s.clock+=.05;s.player.aiming=i%3===0;s.player.moveBlend=i%2;s.player.sprinting=i%5===0;
    if(i===5)s.weapon.shoot(s.clock*1000);s.weapon.update(s.clock*1000);
    if(i===30)s.weapon.reload(s.clock*1000);
    v.update(s,'low',s.clock+.01);assert.ok(alignmentReport(v).muzzleFlashDistance<=WZ29_VISUAL.flashToleranceMetres);
  }}finally{v.dispose();c.dispose();}
});
for(const lod of [0,1])test(`dense clipping matrix samples all referenced vertices, LOD${lod}`,async()=>{
  const c=await viewModelFixture(lod),v=make(c),s=data();
  try{for(const aiming of [false,true])for(const state of ['READY','BOLT_CYCLE','RELOAD_CLIP','RELOAD_SINGLE'])for(let i=0;i<=34;i++){
    s.clock=20+i*.05;s.player.aiming=aiming;s.player.moveBlend=i%3?1:0;s.player.sprinting=i%3===2;
    s.weapon.state=state;s.weapon.started=s.clock*1000-i/34*(state==='BOLT_CYCLE'?1050:3400);
    s.weapon.until=s.weapon.started+(state==='BOLT_CYCLE'?1050:3400);s.weapon.lastShot=state==='BOLT_CYCLE'?s.weapon.started:-1e9;
    v.visual=null;v.update(s,'low',state==='BOLT_CYCLE'&&i===0?s.clock+.06:0);
    for(const [name,geometry]of Object.entries(geometryReport(v)))assert.equal(geometry.nearViolations,0,`${state} ${aiming} ${i} ${name} maxZ ${geometry.maxZ}`);
  }}finally{v.dispose();c.dispose();}
});
test('local arm skin/pose/material changes leave source geometry, bones, clips and materials intact',async()=>{
  const c=await viewModelFixture(),source=c.sources.get('pl:0').scene,body=source.getObjectByName('body'),rifle=source.getObjectByName('rifle');
  const weights=Array.from(body.geometry.getAttribute('skinWeight').data?.array??body.geometry.getAttribute('skinWeight').array),indices=Array.from(body.geometry.index.array);
  const bones=body.skeleton.bones.map(b=>({p:b.position.toArray(),q:b.quaternion.toArray()})),material=rifle.material.clone(),v=make(c),s=data();
  try{
    v.update(s,'low',0);assert.notEqual(v.root.getObjectByName('rifle').material,rifle.material);
    assert.deepEqual(Array.from(body.geometry.getAttribute('skinWeight').data?.array??body.geometry.getAttribute('skinWeight').array),weights);
    assert.deepEqual(Array.from(body.geometry.index.array),indices);assert.deepEqual(body.skeleton.bones.map(b=>({p:b.position.toArray(),q:b.quaternion.toArray()})),bones);
    assert.ok(rifle.material.color.equals(material.color));assert.equal(rifle.material.onBeforeCompile,material.onBeforeCompile);
    const weapon=v.root.getObjectByName('weapon'),target=weapon.localToWorld(new THREE.Vector3(.055,-.025,.065));
    assert.ok(target.distanceTo(v.root.getObjectByName('hand_r').getWorldPosition(new THREE.Vector3()))<1e-6,'corrected right grip contact');
  }finally{v.dispose();material.dispose();c.dispose();}
});
test('pause freezes phase, transition, arms and mechanics including clamped clip endpoint',async()=>{
  const c=await viewModelFixture(),v=make(c),s=data();
  try{for(const state of ['READY','BOLT_CYCLE','RELOAD_CLIP','RELOAD_SINGLE']){
    s.weapon.state=state;s.weapon.started=s.clock*1000-1050;s.weapon.until=s.clock*1000;
    s.player.aiming=false;v.update(s,'low',0);s.player.aiming=true;
    const matrix=v.root.getObjectByName('hand_r').matrixWorld.toArray(),stats=structuredClone(v.stats);
    for(let n=0;n<4;n++){v.update(s,'high',0);assert.deepEqual(v.stats,stats);assert.deepEqual(v.root.getObjectByName('hand_r').matrixWorld.toArray(),matrix);}
  }}finally{v.dispose();c.dispose();}
});
test('ADS/run transitions are controlled by mission dt and converge without action rebind',async()=>{
  const c=await viewModelFixture(),v=make(c),s=data();s.player.aiming=false;
  try{
    v.update(s,'low',0);const action=v.mixer.existingAction(c.clips.get('aim'));s.player.aiming=true;s.player.sprinting=true;s.player.moveBlend=1;
    let previous=v.stats.aimBlend;
    for(let i=0;i<20;i++){s.clock+=.05;v.update(s,'low',0);assert.ok(v.stats.aimBlend>=previous);previous=v.stats.aimBlend;assert.equal(v.mixer.existingAction(c.clips.get('aim')),action);}
    assert.equal(v.stats.aimBlend,1);assert.ok(v.stats.runBlend>.99);assert.ok(alignmentReport(v).verticalPixels<.5);
    assert.equal(advanceVisualBlend(.3,1,0,.045),.3);
  }finally{v.dispose();c.dispose();}
});
test('recoil is finite, damped, bounded and has weaker ADS presentation',()=>{
  for(let i=0;i<500;i++){
    const clock=i*.001,kick=recoilEnvelope(clock,0);assert.ok(kick>=0&&kick<1);
    for(const aim of [0,1]){const pose=presentationPose({clock,lastShot:0,aim,move:0,run:0,reload:0,phase:0});assert.ok(pose.position.z>=-.74&&pose.position.z<=-.718);}
  }
  assert.equal(recoilEnvelope(1,0),0);assert.equal(recoilEnvelope(0,0),0);assert.equal(recoilEnvelope(10,-1e9),0);
});
test('missing optional model/clips returns to existing caller fallback; LOD1 remains viable',async()=>{
  const c=await viewModelFixture(1),s=data(),v=make(c);
  try{assert.equal(v.update(s,'low',0),true);assert.equal(v.lod,1);c.clips.delete('fire_bolt');const absent=make(c);assert.equal(absent.update(s,'low',0),false);assert.equal(absent.root,null);absent.dispose();}
  finally{v.dispose();c.dispose();}
});
test('restore mid-bolt and both reloads reconstruct mechanical phase without saving a mixer',async()=>{
  const c=await viewModelFixture(),sim=new M01Simulation();sim.tick(.05,{skip:true});
  try{for(const kind of ['bolt','single','clip']){
    sim.weapon=new Wz29();
    if(kind==='bolt')sim.weapon.shoot(sim.clock*1000);else{
      for(let shot=0;shot<(kind==='clip'?5:1);shot++){
        sim.weapon.shoot(sim.clock*1000);for(let i=0;i<23;i++)sim.tick(.05,{});
      }sim.weapon.reload(sim.clock*1000);
    }
    for(let i=0;i<12;i++)sim.tick(.05,{});
    const save=sim.snapshot(),copy=new M01Simulation();copy.restoreSnapshot(save);
    const a=make(c),b=make(c);a.update(sim,'low',sim.weapon.lastShot/1000+.06);b.update(copy,'high',copy.weapon.lastShot/1000+.06);
    assert.deepEqual(copy.snapshot(),save);assert.equal(a.stats.clip,b.stats.clip);assert.equal(a.stats.clipTime,b.stats.clipTime);
    assert.deepEqual(a.root.getObjectByName('weapon').matrixWorld.toArray(),b.root.getObjectByName('weapon').matrixWorld.toArray());
    assert.equal('mixer' in save,false);a.dispose();b.dispose();
  }}finally{c.dispose();}
});
test('BASE/CANDIDATE whole save, HP/ammo/shots/hits/transforms/muzzle/RNG/clocks/CP remain exact for 600 input ticks',async()=>{
  const c=await viewModelFixture(),a=new M01Simulation(19390901),b=new M01Simulation(19390901);
  const old=new BaseViewModel(new THREE.Scene(),c,new THREE.Texture()),candidate=make(c);
  try{for(let i=0;i<600;i++){
    const dt=i%37===0?0:i%3===0?.025:.05,controls={skip:i===1,aim:i%110>65,forward:i>100&&i<120?1:0,sprint:i>110&&i<120,
      fire:i%30===20,reload:i%65===50,lookX:i%90===0?2:0};
    a.tick(dt,controls);b.tick(dt,controls);const ea=a.drainEvents(),eb=b.drainEvents();assert.deepEqual(ea,eb,`events ${i}`);
    const before=b.snapshot();old.update(a,'low',a.weapon.lastShot/1000+.06);candidate.update(b,i%2?'low':'high',b.weapon.lastShot/1000+.06);
    assert.deepEqual(b.snapshot(),before,`presentation mutation ${i}`);assert.deepEqual(a.snapshot(),b.snapshot(),`save equality ${i}`);
    assert.deepEqual(muzzlePosition(a.player),muzzlePosition(b.player));assert.deepEqual(actorHitboxes(a.player),actorHitboxes(b.player));
    if(i===210||i===400){a.restoreSnapshot(a.snapshot());b.restoreSnapshot(b.snapshot());}
    if(i===540){a.restoreCheckpoint();b.restoreCheckpoint();}
  }}finally{old.dispose();candidate.dispose();c.dispose();}
});
