import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {WEAPON_PRESENTATION,weaponRecoil,recoilImpulse,idleSway,advanceLookLag,mechanicalPulse,viewPointToWorld,viewUp,ejectaPose,
  WeaponViewFx,WeaponWorldFx,WeaponLighting,casingGeometry,stripperClipGeometry} from '../src/render/first-person-weapon-fx.js';
import {Renderer} from '../src/render/three-renderer.js';
import {presentationPose,WZ29_VISUAL} from '../src/render/m01-wz29-presentation.js';
import {M01ViewModel} from '../src/render/m01-viewmodel.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {eyePosition,aimDirection} from '../src/world/spatial.js';
import {viewModelFixture,geometryReport} from './helpers/m01-viewmodel-fixture.js';
import {alignmentReport} from '../tools/verification/m01-wz29-viewmodel-audit.mjs';
import {driver} from './helpers/m01-route.js';

const {wz29,m1_carbine:carbine}=WEAPON_PRESENTATION;
const BOLT=1.05;

test('the presentation modules read gameplay state but never import gameplay code (game, world, core)',()=>{
  // Presentation only: damage, authoritative spread, cadence, ammunition, hits and Simulation stay in src/game. The
  // branch's unchanged gameplay files are recorded as evidence against its base, not pinned here.
  for(const path of ['src/render/first-person-weapon-fx.js','src/render/m01-wz29-presentation.js','src/render/m01-viewmodel.js']){
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8'),imports=[...source.matchAll(/^import\s[^;]*?from\s*['"]([^'"]+)['"]/gm)].map(m=>m[1]);
    assert.ok(imports.includes('three'),path);
    for(const spec of imports)assert.ok(!/(^|\/)(game|world|core)\//.test(spec),`${path} imports ${spec}`);
  }
});

test('each weapon keeps its own frozen presentation identity and carries no gameplay keys',()=>{
  assert.ok(Object.isFrozen(WEAPON_PRESENTATION)&&Object.isFrozen(wz29.recoil.back)&&Object.isFrozen(carbine.flash.tongue));
  const keys=JSON.stringify(WEAPON_PRESENTATION);
  for(const banned of ['damage','spread','fireDelay','magazine','reserve','range','"rate'])assert.ok(!keys.includes(banned),banned);
  assert.equal(wz29.action,'bolt');assert.equal(carbine.action,'semi');
  assert.notEqual(wz29.casing.kind,carbine.casing.kind);
  // Heavy 7,92 mm bolt rifle shoves harder and settles longer; the short carbine has the bushier flash.
  assert.ok(wz29.recoil.back.hip>carbine.recoil.back.hip&&wz29.recoil.pitch.hip>carbine.recoil.pitch.hip&&wz29.recoil.end>carbine.recoil.end);
  assert.ok(carbine.flash.star>wz29.flash.star&&carbine.flash.tongue.width>wz29.flash.tongue.width&&wz29.flash.tongue.length>carbine.flash.tongue.length);
  // The bolt rifle ejects at the authored fire_bolt marker (0,6 of 1,17 s); the carbine with the shot.
  assert.equal(wz29.mechanics.eject,.6/1.17);assert.equal(carbine.mechanics.eject,0);
  const mauser=casingGeometry('7.92x57'),short=casingGeometry('.30-carbine'),clip=stripperClipGeometry();
  try{
    assert.ok(Math.abs(mauser.userData.length-.057)<1e-9&&Math.abs(short.userData.length-.0328)<1e-9);
    mauser.computeBoundingBox();assert.ok(Math.abs(mauser.boundingBox.max.y+mauser.boundingBox.min.y)<1e-9,'centred for tumbling');
    clip.computeBoundingBox();assert.ok(Math.abs(clip.boundingBox.max.z-clip.boundingBox.min.z-.055)<1e-9);
  }finally{mauser.dispose();short.dispose();clip.dispose();}
});

test('recoil is a finite per-weapon impulse: zero at rest, bounded, weaker in ADS, deterministic per shot',()=>{
  for(const profile of [wz29,carbine]){
    assert.deepEqual(weaponRecoil(profile,-1,0,3),weaponRecoil(profile,profile.recoil.end,0,3));
    assert.equal(weaponRecoil(profile,0,0,1).kick,0);assert.equal(weaponRecoil(profile,profile.recoil.end+.01,1,1).kick,0);
    let peak={hip:0,ads:0};
    for(let i=1;i<500;i++){
      const age=i*profile.recoil.end/500,hip=weaponRecoil(profile,age,0,7),ads=weaponRecoil(profile,age,1,7);
      assert.ok(hip.kick>=0&&hip.kick<1&&Math.abs(hip.pitch)<.05&&Math.abs(hip.roll)<.05&&Math.abs(hip.yaw)<.02);
      assert.ok(Math.abs(ads.back)<=Math.abs(hip.back)+1e-12&&Math.abs(ads.rise)<=Math.abs(hip.rise)+1e-12&&Math.abs(ads.roll)<=Math.abs(hip.roll)+1e-12);
      assert.deepEqual(weaponRecoil(profile,age,0,7),hip);peak.hip=Math.max(peak.hip,hip.back);peak.ads=Math.max(peak.ads,ads.back);
    }
    assert.ok(peak.ads<peak.hip&&peak.hip>0);
  }
  // Shot count only varies side/cant through a presentation hash, never through gameplay RNG.
  const sides=new Set(Array.from({length:12},(_,shot)=>Math.sign(weaponRecoil(wz29,.03,0,shot).yaw)));assert.equal(sides.size,2);
  assert.equal(recoilImpulse(.02,wz29.recoil),recoilImpulse(.02,{attack:.012,decay:.085,end:.42}));
});

test('hip sway is bounded and does not visibly loop; ADS at rest keeps the exact sight pose',()=>{
  const samples=Array.from({length:1200},(_,i)=>idleSway(i*.05));
  for(const s of samples)for(const v of Object.values(s))assert.ok(Math.abs(v)<.0062);
  // No lag between 1 and 60 s brings the whole sway state back within 3 % of its range.
  const vector=s=>[s.x/.0032,s.y/.0023,s.pitch/.0038,s.yaw/.0041,s.roll/.0036];
  for(let lag=20;lag<=1200-20;lag+=20){
    let worst=0;for(let i=0;i+lag<samples.length;i+=7){const a=vector(samples[i]),b=vector(samples[i+lag]);worst=Math.max(worst,...a.map((v,k)=>Math.abs(v-b[k])));}
    assert.ok(worst>.03,`sway repeats after ${lag*.05}s`);
  }
  const rest=presentationPose({clock:12.3,lastShot:-1e9,aim:1,move:0,run:0,reload:0,phase:4});
  const legacy=presentationPose({clock:99.1,lastShot:-1e9,aim:1,move:0,run:0,reload:0,phase:0,look:{yaw:0,pitchLag:0},mechanical:0,stroke:0});
  const near=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-15);
  assert.ok(near(rest.position.toArray(),[0,0,-WZ29_VISUAL.rearDepth])&&near(rest.rotation.toArray(),[0,0,0,1]));
  assert.ok(near(legacy.position.toArray(),rest.position.toArray())&&near(legacy.rotation.toArray(),rest.rotation.toArray()));
  // Mid-raise the rifle arcs (dip/cant); at either end of the transition the extra term is zero.
  const mid=presentationPose({clock:12.3,lastShot:-1e9,aim:.5,move:0,run:0,reload:0,phase:0}),hip=presentationPose({clock:12.3,lastShot:-1e9,aim:0,move:0,run:0,reload:0,phase:0});
  assert.ok(mid.position.y<(hip.position.y+rest.position.y)/2);
});

test('look lag trails turns, is clamped, settles, ignores frozen clocks and wraps at ±π',()=>{
  let s=advanceLookLag(null,0,0,0);assert.deepEqual(s,{angle:0,pitch:0,yaw:0,pitchLag:0});
  s=advanceLookLag(s,.05,0,.05);assert.ok(s.yaw>0,'turning right lets the muzzle trail left');
  const frozen={...s};advanceLookLag(s,.05,0,0);assert.deepEqual(s,frozen);
  for(let i=0;i<40;i++)advanceLookLag(s,s.angle+1,0,.05);assert.ok(s.yaw<=.045+1e-12);
  for(let i=0;i<80;i++)advanceLookLag(s,s.angle,0,.05);assert.equal(s.yaw,0);
  s=advanceLookLag(null,Math.PI-.01,0,0);advanceLookLag(s,-Math.PI+.01,0,.05);assert.ok(s.yaw>0&&s.yaw<.02,'wrap is a small right turn');
  s=advanceLookLag(null,0,0,0);advanceLookLag(s,0,.05,.05);assert.ok(s.pitchLag<0,'looking up lets the muzzle trail low');
  assert.equal(mechanicalPulse(1,1),0);assert.ok(mechanicalPulse(1.07,1)>0);assert.equal(mechanicalPulse(1.2,1),0);
});

test('a weapon-pass point maps to the world point under the same pixel at hip and ADS fields of view',()=>{
  for(const fov of [70,48]){
    const camera=new THREE.PerspectiveCamera(fov,16/9,.05,7500),view=new THREE.PerspectiveCamera(58,16/9,.03,6);
    camera.position.set(-260,3.2,20);camera.lookAt(-250,4.1,27);camera.rotateZ(.01);camera.updateMatrixWorld();view.updateMatrixWorld();
    for(const p of [[.012,-.007,-.52],[.189,-.17,-.524],[0,-.033,-1.214]]){
      const point=new THREE.Vector3(...p),world=viewPointToWorld(point,camera,58);
      const a=point.clone().project(view),b=world.clone().project(camera);
      assert.ok(Math.abs(a.x-b.x)<1e-9&&Math.abs(a.y-b.y)<1e-9,`${fov} ${p}`);
      assert.ok(Math.abs(camera.position.distanceTo(world)-point.length())<.3);
    }
  }
  const up=viewUp(.3);assert.ok(Math.abs(up.length()-1)<1e-12);
  assert.ok(up.clone().applyEuler(new THREE.Euler(.3,0,0)).distanceTo(new THREE.Vector3(0,1,0))<1e-12);
});

test('brass/clip flight is analytic in age, never sinks below the ground plane and comes to rest',()=>{
  const item={origin:[2,1.45,3],velocity:[1.6,1.7,.3],ground:.2,radius:.006,spin:26,spinAxis:[.2,1,.3].map(v=>v/Math.hypot(.2,1,.3)),rotation:new THREE.Quaternion(),seed:.37};
  let rest=null;
  for(let i=0;i<=400;i++){
    const age=i*.01,a=ejectaPose(item,age),b=ejectaPose(item,age);
    assert.deepEqual(a.position.toArray(),b.position.toArray());assert.deepEqual(a.quaternion.toArray(),b.quaternion.toArray());
    assert.ok(a.position.y>=item.ground+item.radius*.84,`age ${age}: ${a.position.y}`);
    if(a.phase==='rest')rest??=age;
  }
  assert.ok(rest>.3&&rest<1.5,`rest ${rest}`);
  const final=ejectaPose(item,30);assert.equal(final.phase,'rest');
  assert.ok(Math.abs(new THREE.Vector3(0,1,0).applyQuaternion(final.quaternion).y)<1e-9,'cases lie on their side');
});

test('weapon-pass FX: flash only in the event window, layered on the socket, constant light count, smoke after the shot',()=>{
  const scene=new THREE.Scene(),weapon=new THREE.Object3D();scene.add(weapon);weapon.position.set(.1,-.2,-.6);weapon.updateMatrixWorld(true);
  const fx=new WeaponViewFx(scene,wz29);fx.attach(weapon,WZ29_VISUAL.muzzle);
  const lights=()=>{let n=0;scene.traverse(o=>{if(o.isLight)n++;});return n;};
  try{
    const muzzle=weapon.localToWorld(new THREE.Vector3(...WZ29_VISUAL.muzzle)),axis=new THREE.Vector3(0,0,-1),port=new THREE.Vector3(.12,-.15,-.3),up=viewUp(0);
    const at=(clock,gate=true,aim=0)=>fx.update({clock,shotAt:10,gate,aim,shot:3,muzzle,axis,port,up,chamberAt:10+wz29.mechanics.chamberOpen*BOLT});
    assert.equal(lights(),1);
    const first=at(10);assert.equal(first.flash,1);assert.equal(first.layers,3);assert.ok(first.light>0);
    assert.ok(fx.core.getWorldPosition(new THREE.Vector3()).distanceTo(muzzle)<1e-9);assert.equal(fx.star.material.depthTest,false);
    assert.deepEqual(at(10),first,'a repeated frame is identical');
    assert.ok(at(10.04).flash<1&&at(10.04).flash>0);
    assert.equal(at(10.061).flash,0);assert.equal(fx.core.visible,false);assert.equal(fx.light.intensity,0);assert.equal(lights(),1);
    assert.equal(at(10,false).flash,0,'restored/expired event window never re-flashes');
    assert.ok(at(10.4).wisps>=wz29.smoke.wisps,'barrel wisps and the chamber puff while the bolt opens');
    assert.equal(at(9.99).wisps,0);assert.equal(at(13).wisps,0);
    // Before the tongue is measured the hip view sees its length; looking down the bore it collapses to a bloom.
    at(10);const hipTongue=fx.tongue.scale.x;
    weapon.position.set(0,0,-.74);weapon.updateMatrixWorld(true);muzzle.copy(weapon.localToWorld(new THREE.Vector3(...WZ29_VISUAL.muzzle)));
    at(10,true,1);assert.ok(fx.tongue.scale.x<hipTongue);
    assert.equal(fx.hide().flash,0);
  }finally{fx.dispose();}
  assert.equal(lights(),0);
});

test('world FX: emissions are idempotent by id, bounded, discarded by a restored world or an earlier clock',()=>{
  const scene=new THREE.Scene(),world=new WeaponWorldFx(scene,{casings:3,clips:1,puffs:8}),w1={},w2={};
  const casing=(id,start)=>world.spawnEjecta({id,kind:'7.92x57',start,origin:new THREE.Vector3(0,1.5,0),velocity:new THREE.Vector3(1,1,0),
    rotation:new THREE.Quaternion(),spinAxis:new THREE.Vector3(0,1,0),spin:20,ground:0,rest:20,seed:.2});
  try{
    world.update(0,w1);assert.equal(casing('a',1),true);assert.equal(casing('a',1),false);
    world.update(1.2,w1);assert.equal(world.counts.casings,1);
    for(const id of ['b','c','d'])casing(id,1.1);world.update(1.2,w1);assert.equal(world.counts.casings,3,'oldest brass is recycled');
    assert.equal(world.spawnPuffs({id:'p',start:1,origin:new THREE.Vector3(),direction:new THREE.Vector3(0,0,-1),profile:wz29.smoke,seed:9}),true);
    assert.equal(world.spawnPuffs({id:'p',start:1,origin:new THREE.Vector3(),direction:new THREE.Vector3(0,0,-1),profile:wz29.smoke,seed:9}),false);
    world.update(1.2,w1);assert.ok(world.counts.puffs>0&&world.counts.puffs<=wz29.smoke.puffs);
    const frozen=JSON.stringify(world.counts);world.update(1.2,w1);assert.equal(JSON.stringify(world.counts),frozen);
    world.update(1.05,w1);assert.equal(world.counts.casings,0,'items from a later clock are discarded');
    casing('e',1.1);world.update(1.2,w2);assert.equal(world.counts.casings,0,'a new world clears history');
    casing('f',1.2);world.update(10,w2);assert.equal(world.counts.resting,1);world.update(60,w2);assert.equal(world.counts.casings,0);
  }finally{world.dispose();}
  assert.equal(scene.children.length,0);
});

test('weapon lighting follows the world sky/sun and the view, without new light types per frame',()=>{
  const scene=new THREE.Scene(),lighting=new WeaponLighting(scene),sky=new THREE.HemisphereLight('#b4c8df','#4b4435',1.6),sun=new THREE.DirectionalLight('#ffe0b0',.4);
  const camera=new THREE.PerspectiveCamera(70,16/9,.05,100);sun.position.set(-50,10,0);sun.target.position.set(0,0,0);
  try{
    camera.lookAt(-1,0,0);const facing=lighting.sync({sky,sun,camera,daylight:.1,pitch:0});
    camera.lookAt(1,0,0);const away=lighting.sync({sky,sun,camera,daylight:.1,pitch:.2});
    assert.ok(facing.keyDirection[2]<0&&away.keyDirection[2]>0,'sun ahead lights the front, sun behind lights the back');
    assert.ok(away.keyDirection[1]>=.28);assert.equal(scene.environmentRotation.x,-.2);
    assert.ok(lighting.fill.color.equals(sky.color)&&lighting.fill.groundColor.equals(sky.groundColor));
    const day=lighting.sync({sky,sun:Object.assign(sun,{intensity:5}),camera,daylight:1,pitch:0});
    assert.ok(day.key>away.key&&day.environment>away.environment&&day.key<=2&&away.key>=.55);
    let lights=0;scene.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,2);
  }finally{lighting.dispose();}
});

// ——— Production M01ViewModel with real GLB clips, a real route and real controls ———
const placeCamera=(camera,player)=>{const e=eyePosition(player),d=aimDirection(player.angle,player.pitch);camera.position.set(e.x,e.y,e.z);camera.lookAt(e.x+d.x,e.y+d.y,e.z+d.z);camera.updateMatrixWorld();};
async function rig(){
  const c=await viewModelFixture(),scene=new THREE.Scene(),world=new WeaponWorldFx(new THREE.Scene()),v=new M01ViewModel(scene,c,new THREE.Texture(),world);
  const camera=new THREE.PerspectiveCamera(70,16/9,.05,7500),d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();
  let flashUntil=0;
  const frame=()=>{placeCamera(camera,d.sim.player);const before=JSON.stringify(d.sim.snapshot());
    v.update(d.sim,'low',flashUntil,{camera,viewFov:58});world.update(d.sim.clock,d.sim.world);
    assert.equal(JSON.stringify(d.sim.snapshot()),before,'presentation never mutates the simulation');};
  const tick=(controls={})=>{const shots=d.sim.weapon.shotCount;d.step(controls);if(d.sim.weapon.shotCount>shots)flashUntil=d.sim.clock+.06;frame();};
  return {c,v,world,d,tick,frame,dispose(){v.dispose();world.dispose();c.dispose();}};
}

test('wz.29: one case per shot at the authored eject marker, one muzzle cloud, nothing duplicated by repeated frames',async()=>{
  const r=await rig();
  try{
    const {d,world,v}=r;r.frame();
    r.tick({aim:true,fire:true});const shotAt=d.sim.weapon.lastShot/1000,shot=d.sim.weapon.shotCount;assert.equal(shot,1);
    assert.equal(v.stats.presentation.flash,1);assert.equal(world.puffItems.length,1);assert.equal(world.counts.casings,0);
    let ejected=null;
    while(d.sim.weapon.state!=='READY'){
      r.tick({aim:true});
      if(world.counts.casings&&ejected===null){ejected=d.sim.clock;assert.ok(v.stats.presentation.boltStroke>0,'off the eye for the stroke');}
      r.frame();r.frame();
    }
    const marker=shotAt+wz29.mechanics.eject*BOLT;
    assert.ok(ejected>=marker-1e-9&&ejected<marker+.05+1e-9,`ejected ${ejected} marker ${marker}`);
    assert.equal(world.items.filter(i=>i.kind!=='clip').length,1);assert.equal(world.items[0].start,marker);
    assert.equal(world.puffItems.length,1);
    // READY: back exactly on the sights, stroke over, authoritative aim never changed.
    r.tick({aim:true});assert.equal(v.stats.presentation.boltStroke,0);assert.equal(v.stats.aimBlend,1);
    const a=alignmentReport(v);assert.ok(a.horizontalPixels<WZ29_VISUAL.adsTolerancePixels&&a.verticalPixels<WZ29_VISUAL.adsTolerancePixels);
    r.tick({aim:true,fire:true});while(d.sim.weapon.state!=='READY'){r.tick({aim:true});}
    assert.equal(world.items.filter(i=>i.kind!=='clip').length,2);assert.equal(world.puffItems.length,2);
  }finally{r.dispose();}
});

test('wz.29 clip reload throws exactly one empty stripper clip at 2,45 s; a single-round reload throws none',async()=>{
  const r=await rig();
  try{
    const {d,world,v}=r;
    for(let i=0;i<5;i++){r.tick({fire:true});while(d.sim.weapon.state!=='READY')r.tick();}
    assert.equal(d.sim.weapon.mag,0);r.tick({reload:true});assert.equal(d.sim.weapon.state,'RELOAD_CLIP');
    const started=d.sim.weapon.started/1000,duration=(d.sim.weapon.until-d.sim.weapon.started)/1000;let seen=null;
    while(d.sim.weapon.state==='RELOAD_CLIP'){
      r.tick();const clips=world.items.filter(i=>i.kind==='clip');
      if(clips.length&&seen===null){seen=d.sim.clock;assert.equal(v.root.getObjectByName('clip').visible,false,'asset clip hidden once the world clip flies');}
      if(!clips.length)assert.ok(v.stats.clipTime<wz29.mechanics.clipEjected);
    }
    const marker=started+wz29.mechanics.clipEjected/3.4*duration;
    assert.ok(seen>=marker-1e-9&&seen<marker+.05+1e-9);assert.equal(world.items.filter(i=>i.kind==='clip').length,1);
    assert.equal(world.items.find(i=>i.kind==='clip').start,marker);
    r.tick({fire:true});while(d.sim.weapon.state!=='READY')r.tick();
    r.tick({reload:true});assert.equal(d.sim.weapon.state,'RELOAD_SINGLE');
    while(d.sim.weapon.state==='RELOAD_SINGLE')r.tick();
    assert.equal(world.items.filter(i=>i.kind==='clip').length,1,'no stripper clip for a single round');
  }finally{r.dispose();}
});

test('wz.29 stroke, lag and FX keep every viewmodel vertex beyond the near plane and the flash on the socket',async()=>{
  const r=await rig();
  try{
    const {d,v}=r;
    for(const controls of [{aim:true},{},{aim:true,lookX:40},{lookX:-60},{forward:1,sprint:true}]){
      r.tick({...controls,fire:true});
      for(let i=0;i<24;i++){
        r.tick(controls);
        for(const [name,g]of Object.entries(geometryReport(v)))assert.equal(g.nearViolations,0,`${JSON.stringify(controls)} ${i} ${name} ${g.maxZ}`);
        assert.ok(alignmentReport(v).muzzleFlashDistance<=WZ29_VISUAL.flashToleranceMetres);
      }
      while(d.sim.weapon.state!=='READY')r.tick(controls);
    }
  }finally{r.dispose();}
});

test('pause and restore: repeated frames are frozen; a restored world rebuilds presentation at rest and drops world history',async()=>{
  const r=await rig();
  try{
    // Restore after the presentation windows (case 0,35 s after its marker, cloud 0,3 s) so nothing is due again.
    const {d,v,world}=r;r.tick({fire:true});for(let i=0;i<30;i++)r.tick({lookX:25});
    const stats=JSON.stringify(v.stats),counts=JSON.stringify(world.counts);
    for(let i=0;i<4;i++){r.frame();assert.equal(JSON.stringify(v.stats),stats);assert.equal(JSON.stringify(world.counts),counts);}
    assert.ok(v.stats.presentation.lookYaw>0);
    const save=d.sim.snapshot();d.sim.restoreSnapshot(save);r.frame();
    assert.equal(v.stats.presentation.lookYaw,0);assert.equal(world.counts.casings,0);assert.equal(world.items.length,0);
    assert.deepEqual(d.sim.snapshot(),save);
  }finally{r.dispose();}
});

test('independent renderers of the same restored mid-bolt state produce the same frame (no hidden clocks)',async()=>{
  const c=await viewModelFixture(),sim=new M01Simulation();sim.tick(.05,{skip:true});for(let i=0;i<20;i++)sim.tick(.05,{});
  sim.tick(.05,{fire:true});for(let i=0;i<11;i++)sim.tick(.05,{});
  const copy=new M01Simulation();copy.restoreSnapshot(sim.snapshot());
  const views=[sim,copy].map(s=>{const world=new WeaponWorldFx(new THREE.Scene()),v=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture(),world),camera=new THREE.PerspectiveCamera(70,16/9,.05,7500);
    placeCamera(camera,s.player);v.update(s,'low',0,{camera,viewFov:58});world.update(s.clock,s.world);return {v,world};});
  try{
    const [a,b]=views;assert.deepEqual(a.v.stats,b.v.stats);assert.deepEqual(a.world.counts,b.world.counts);
    assert.deepEqual(a.world.items.map(i=>[i.id,i.start,i.origin,i.velocity]),b.world.items.map(i=>[i.id,i.start,i.origin,i.velocity]));
    assert.equal(a.world.counts.casings,1,'restored after the eject marker: the case is in flight');
  }finally{views.forEach(x=>{x.v.dispose();x.world.dispose();});c.dispose();}
});

test('a slow frame that steps past the 60 ms window still shows the shot once at full strength, never again or after restore',async()=>{
  const r=await rig();
  try{
    const {d,v}=r;let flashUntil=0;
    // 5 fps: four 50 ms ticks per rendered frame; the shot fires in the first tick, like game.js substeps.
    const slowFrame=(controls={})=>{const shots=d.sim.weapon.shotCount;d.step(controls);if(d.sim.weapon.shotCount>shots)flashUntil=d.sim.clock+.06;
      for(let i=0;i<3;i++)d.step();const camera=new THREE.PerspectiveCamera(70,16/9,.05,7500);placeCamera(camera,d.sim.player);
      v.update(d.sim,'low',flashUntil,{camera,viewFov:58});return v.stats.presentation;};
    slowFrame();const shot=slowFrame({fire:true});assert.ok(d.sim.clock-d.sim.weapon.lastShot/1000>.06,'the window is already over');
    assert.equal(shot.flash,1);assert.equal(shot.layers,3);
    assert.equal(slowFrame().flash,0,'one flash per shot');
    const save=d.sim.snapshot();while(d.sim.weapon.state!=='READY')slowFrame();slowFrame({fire:true});
    d.sim.restoreSnapshot(save);flashUntil=0;assert.equal(slowFrame().flash,0,'a restored world never replays an old shot');
  }finally{r.dispose();}
});

test('ejected pieces settle on the surface under their landing point, never inside a slope',()=>{
  const world=new WeaponWorldFx(new THREE.Scene()),slope=(x,z)=>.4*x+.1*z;
  try{
    world.spawnEjecta({id:'s',kind:'7.92x57',start:0,origin:new THREE.Vector3(0,1.5,0),velocity:new THREE.Vector3(1.6,1.7,.2),rotation:new THREE.Quaternion(),
      spinAxis:new THREE.Vector3(0,1,0),spin:20,ground:0,groundAt:slope,rest:20,seed:.5});
    const item=world.items[0],rest=ejectaPose(item,30).position;
    assert.ok(Math.abs(item.ground-slope(rest.x,rest.z))<.02,`ground ${item.ground} surface ${slope(rest.x,rest.z)}`);
    assert.ok(rest.y>=slope(rest.x,rest.z));
    world.spawnEjecta({id:'w',kind:'7.92x57',start:0,origin:new THREE.Vector3(0,1.5,0),velocity:new THREE.Vector3(1,1,0),rotation:new THREE.Quaternion(),
      spinAxis:new THREE.Vector3(0,1,0),spin:20,ground:.2,groundAt:()=>NaN,rest:20,seed:.5});
    assert.equal(world.items[1].ground,.2,'no surface answer keeps the start height');
  }finally{world.dispose();}
});

test('look lag after the authoritative recoil pitch settles by READY at 4 fps as at 20 fps; sights exact',async()=>{
  for(const ticksPerFrame of [1,5]){
    const r=await rig();
    try{
      const {d,v}=r,camera=new THREE.PerspectiveCamera(70,16/9,.05,7500);let flashUntil=0;
      const frame=(controls={})=>{const shots=d.sim.weapon.shotCount;d.step(controls);if(d.sim.weapon.shotCount>shots)flashUntil=d.sim.clock+.06;
        for(let i=1;i<ticksPerFrame;i++)d.step({aim:true});placeCamera(camera,d.sim.player);v.update(d.sim,'low',flashUntil,{camera,viewFov:58});};
      for(let i=0;i<4;i++)frame({aim:true});const pitch=d.sim.player.pitch;frame({aim:true,fire:true});
      assert.ok(d.sim.player.pitch>pitch,'the simulation kicked the view up');
      assert.equal(v.stats.presentation.lookPitch,0,`the recoil kick is not read as looking up (${ticksPerFrame} ticks/frame)`);
      while(d.sim.weapon.state!=='READY')frame({aim:true});
      assert.equal(v.stats.presentation.lookPitch,0,`${ticksPerFrame} ticks/frame`);
      const a=alignmentReport(v);assert.ok(a.horizontalPixels<1e-3&&a.verticalPixels<1e-3,`${a.horizontalPixels} ${a.verticalPixels}`);
    }finally{r.dispose();}
  }
});

test('ejected pieces turn continuously into a resting attitude: cases on their side, the clip flat on its base plate',()=>{
  const clipGeometry=stripperClipGeometry(),caseGeometry=casingGeometry('7.92x57'),angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.dot(b)))),landings=new Set();
  try{
    for(const [geometry,spin]of [[caseGeometry,26],[clipGeometry,-17]])for(const seed of [0,.1,.25,.37,.5,.62,.75,.9]){
      const {radius,attitude,restLift,restLiftFlipped}=geometry.userData,item={origin:[0,1.4,0],velocity:[1.2,2.1,.3],ground:0,radius,attitude,restLift,restLiftFlipped,spin,seed,
        spinAxis:[.25,1,.3].map(v=>v/Math.hypot(.25,1,.3)),rotation:new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2+seed*7,seed*13,seed*3))};
      let previous=null,phases=new Set();
      for(let i=0;i<=1500;i++){const pose=ejectaPose(item,i*.001),q=pose.quaternion.clone();phases.add(pose.phase);
        if(previous)assert.ok(angle(previous,q)<.2,`${attitude} seed ${seed}: orientation jumps ${angle(previous,q).toFixed(3)} rad at ${i} ms`);previous=q;}
      assert.deepEqual([...phases],['flight','bounce','rest']);
      // At rest no vertex is more than a hair inside the surface and the piece lies flat instead of standing on end.
      const rest=ejectaPose(item,30),matrix=new THREE.Matrix4().compose(rest.position,rest.quaternion,new THREE.Vector3(1,1,1)),p=geometry.attributes.position,v=new THREE.Vector3();
      let low=Infinity,high=-Infinity;for(let k=0;k<p.count;k++){v.fromBufferAttribute(p,k).applyMatrix4(matrix);low=Math.min(low,v.y);high=Math.max(high,v.y);}
      assert.ok(low>-.0015&&low<.0005,`${attitude} seed ${seed}: lowest vertex ${low}`);
      assert.ok(high<(attitude==='flat'?.006:.0135),`${attitude} seed ${seed}: stands up to ${high}`);
      const length=new THREE.Vector3(...(attitude==='flat'?[0,0,1]:[0,1,0])).applyQuaternion(rest.quaternion);
      assert.ok(Math.abs(length.y)<1e-9,`${attitude} seed ${seed}: long axis tilted ${length.y}`);
      if(attitude==='flat')landings.add(new THREE.Vector3(0,1,0).applyQuaternion(rest.quaternion).y>0?'base':'walls');
    }
    assert.deepEqual([...landings].sort(),['base','walls'],'the clip comes to rest either way up');
  }finally{clipGeometry.dispose();caseGeometry.dispose();}
});

test('one weapon pass, one muzzle light: the procedural fallback and the rig share it and the drawing FX drives it',()=>{
  const scene=new THREE.Scene(),weapon=new THREE.Object3D();scene.add(weapon);weapon.updateMatrixWorld(true);
  const fallback=new WeaponViewFx(scene,wz29),rig=new WeaponViewFx(scene,wz29,{light:fallback.light});
  fallback.attach(weapon,WZ29_VISUAL.muzzle);rig.attach(weapon,WZ29_VISUAL.muzzle);
  const lights=()=>{let n=0;scene.traverse(o=>{if(o.isLight)n++;});return n;};
  try{
    assert.equal(lights(),1);
    const muzzle=weapon.localToWorld(new THREE.Vector3(...WZ29_VISUAL.muzzle));rig.update({clock:10,shotAt:10,shot:1,muzzle,axis:new THREE.Vector3(0,0,-1),up:viewUp(0)});
    const lit=rig.light.intensity;assert.ok(lit>0);fallback.hide(false);assert.equal(fallback.light.intensity,lit,'a hidden fallback leaves the shared light to the rig');
    rig.hide();assert.equal(fallback.light.intensity,0);
    rig.dispose();assert.equal(lights(),1,'only the owner removes the light');
  }finally{fallback.dispose();}
  assert.equal(lights(),0);
});

test('a quick follow-up shot leaves the previous barrel smoke fading instead of cutting it off; a reset forgets it',()=>{
  const scene=new THREE.Scene(),weapon=new THREE.Object3D();scene.add(weapon);weapon.updateMatrixWorld(true);
  const fx=new WeaponViewFx(scene,carbine);fx.attach(weapon,[0,0,-.4]);
  const muzzle=new THREE.Vector3(0,0,-.4),frame=(clock,shotAt,shot)=>fx.update({clock,shotAt,shot,gate:false,muzzle,axis:new THREE.Vector3(0,0,-1),up:viewUp(0)}).wisps;
  try{
    assert.equal(frame(10.17,10,1),carbine.smoke.wisps);
    // 180 ms later the next shot's wisps have not started yet; the first shot's are still there, then both are.
    assert.equal(frame(10.19,10.18,2),carbine.smoke.wisps);assert.equal(frame(10.19,10.18,2),carbine.smoke.wisps,'a repeated frame is identical');
    assert.equal(frame(10.31,10.18,2),2*carbine.smoke.wisps);
    fx.reset();assert.equal(frame(10.31,10.18,2),carbine.smoke.wisps,'a restored timeline has no previous shot');
    assert.equal(frame(10.31,10,1),carbine.smoke.wisps,'an earlier shot time (restore) drops the history');
  }finally{fx.dispose();}
});

test('down the sights the world muzzle cloud is a thin haze: thinner and smaller than from the hip',()=>{
  const world=new WeaponWorldFx(new THREE.Scene(),{puffs:8});
  const spawn=(id,aim)=>world.spawnPuffs({id,start:1,origin:new THREE.Vector3(),direction:new THREE.Vector3(0,0,-1),profile:wz29.smoke,seed:9,aim});
  try{
    world.update(1,{});spawn('hip',0);spawn('ads',1);const [hip,ads]=world.puffItems;
    assert.equal(hip.opacity,wz29.smoke.puffOpacity);assert.ok(ads.opacity<=.45*hip.opacity&&ads.size<hip.size);
  }finally{world.dispose();}
});

test('bench brass rests on the road slab it lands on, not inside it',()=>{
  const bench={restSurfaces:[new THREE.Box3(new THREE.Vector3(18,-.001,2),new THREE.Vector3(22,.005,34))]},height=(x,z)=>Renderer.prototype.restHeight.call(bench,x,z);
  assert.equal(height(20,18),.005);assert.equal(height(10,18),0);
  const world=new WeaponWorldFx(new THREE.Scene());
  try{
    world.spawnEjecta({id:'c',kind:'.30-carbine',start:0,origin:new THREE.Vector3(19.6,1.5,10),velocity:new THREE.Vector3(.6,1.2,.1),rotation:new THREE.Quaternion(),
      spinAxis:new THREE.Vector3(0,1,0),spin:30,ground:0,groundAt:height,rest:18,seed:.3});
    const item=world.items[0],rest=ejectaPose(item,20).position;
    assert.equal(height(rest.x,rest.z),.005,'it landed on the slab');assert.ok(Math.abs(item.ground-.005)<1e-4,`rest surface ${item.ground}`);
  }finally{world.dispose();}
});
