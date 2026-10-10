import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01ViewModel} from '../src/render/m01-viewmodel.js';
import {WZ29_FEEL,WZ29_VISUAL,adsEase,advanceAdsProgress,adsFieldOfView,breathSway,gaitBob,wallClearance,wallLowerTarget,advanceWallLower,presentationPose}
  from '../src/render/m01-wz29-presentation.js';
import {idleSway,WEAPON_PRESENTATION} from '../src/render/first-person-weapon-fx.js';
import {Wz29} from '../src/game/wz29.js';
import {aimDirection,eyePosition,muzzlePosition,traceObstruction} from '../src/world/spatial.js';
import {viewModelFixture,viewModelReach} from './helpers/m01-viewmodel-fixture.js';
import {alignmentReport} from '../tools/verification/m01-wz29-viewmodel-audit.mjs';
import {driver} from './helpers/m01-route.js';

// T39 M01-VIEWMODEL-FEEL-V2. The viewmodel is presentation: these tests pin its curves, its purity in the mission clock, the
// recoil return, the read-only wall probe and the field-of-view wiring. Nothing here lets the viewmodel touch the simulation.
const ADS=WZ29_FEEL.ads,WALL=WZ29_FEEL.wall,wz29=WEAPON_PRESENTATION.wz29;
const near=(a,b,eps=1e-9)=>Math.abs(a-b)<=eps;
let shared=null;const fixture=()=>shared??=viewModelFixture();
test.after(async()=>{if(shared)(await shared).dispose();});

// ——— Pure curves (no assets) ———
test('ADS curve is eased, exact at both ends and takes 0.30 s in and 0.22 s out at any frame schedule',()=>{
  assert.equal(ADS.in,.30);assert.equal(ADS.out,.22);
  assert.equal(adsEase(0),0);assert.equal(adsEase(1),1);assert.ok(near(adsEase(.5),.5,1e-15));assert.equal(adsEase(-3),0);assert.equal(adsEase(7),1);
  let last=-1;for(let i=0;i<=1000;i++){const e=adsEase(i/1000);assert.ok(e>=last,'monotonic');last=e;}
  assert.ok(adsEase(.1)<.1&&adsEase(.9)>.9,'eased: slow at both ends');
  for(const dt of [.001,.005,1/60,.02,.05,.1,.25,.5]){
    let p=0,t=0,steps=0;while(p<1){p=advanceAdsProgress(p,true,dt);t+=dt;steps++;assert.ok(steps<5000);}
    assert.ok(t>=.30-1e-9&&t<.30+dt+1e-9,`in at dt ${dt}: ${t}`);
    let q=1;t=0;steps=0;while(q>0){q=advanceAdsProgress(q,false,dt);t+=dt;steps++;assert.ok(steps<5000);}
    assert.ok(t>=.22-1e-9&&t<.22+dt+1e-9,`out at dt ${dt}: ${t}`);
  }
  // Exact ends, half way in 0.15 s / 0.11 s, and the same total time lands on the same progress at any schedule.
  assert.equal(advanceAdsProgress(0,true,.3),1);assert.equal(advanceAdsProgress(1,false,.22),0);
  assert.ok(near(advanceAdsProgress(0,true,.15),.5)&&near(advanceAdsProgress(1,false,.11),.5));
  let fine=0,coarse=0;for(let i=0;i<10;i++)fine=advanceAdsProgress(fine,true,.01);coarse=advanceAdsProgress(coarse,true,.1);
  assert.ok(near(fine,coarse,1e-12));
  // A repeated or negative clock step cannot move it; reversing mid-way continues from where it is, without a jump.
  assert.equal(advanceAdsProgress(.4,true,0),.4);assert.equal(advanceAdsProgress(.4,false,-1),.4);
  const rising=advanceAdsProgress(0,true,.1),back=advanceAdsProgress(rising,false,.02);
  assert.ok(near(rising,.1/.3)&&near(back,rising-.02/.22));
});

test('world field of view 70 -> 48 uses the very same curve as the weapon pose',()=>{
  assert.equal(ADS.fov.hip,70);assert.equal(ADS.fov.ads,48);
  assert.equal(adsFieldOfView(0),70);assert.equal(adsFieldOfView(1),48);assert.ok(near(adsFieldOfView(.5),59,1e-12));
  let last=Infinity;
  for(let i=0;i<=200;i++){
    const p=i/200,fov=adsFieldOfView(p);
    assert.ok(fov<=last,'monotonic');last=fov;
    assert.ok(near((70-fov)/22,adsEase(p),1e-12),`fov follows adsEase at ${p}`);
  }
  // The pose's lateral hip offset is hip*(.145+sway) on exactly adsEase(aim): same ease, no second curve.
  for(const aim of [0,.1,.25,.5,.75,.9,1]){
    const clock=33.3,pose=presentationPose({clock,lastShot:-1e9,aim,move:0,run:0,reload:0}),hip=1-adsEase(aim);
    assert.ok(near(pose.position.x,hip*(.145+idleSway(clock).x)-0,1e-12),`pose x at aim ${aim}`);
  }
});

test('ADS keeps the exact sight pose: breath, bob, wall and recoil terms are exact zeros at rest in full ADS',()=>{
  for(const clock of [0,1.234,12.3,99.1,1234.5]){
    const rest=presentationPose({clock,lastShot:-1e9,aim:1,move:0,run:0,reload:0,crouch:0,wall:0});
    assert.ok(near(rest.position.x,0,1e-15)&&near(rest.position.y,0,1e-15)&&near(rest.position.z,-WZ29_VISUAL.rearDepth,1e-15));
    assert.ok(rest.rotation.toArray().every((v,i)=>near(v,[0,0,0,1][i],1e-15)));
    // Moving in ADS: the rifle follows the view exactly, the gait only moves the camera.
    const moving=presentationPose({clock,lastShot:-1e9,aim:1,move:1,run:1,reload:0,crouch:1,wall:0});
    assert.ok(moving.position.toArray().every((v,i)=>near(v,[0,0,-WZ29_VISUAL.rearDepth][i],1e-15)));
  }
});

test('breath sway and gait bob are pure functions of the clock and gait weights; a gait change never pops',()=>{
  const a=gaitBob(12.34,{run:.3,crouch:.2});
  gaitBob(99,{run:1});breathSway(5);gaitBob(0,{crouch:1});
  assert.deepEqual(gaitBob(12.34,{run:.3,crouch:.2}),a,'same inputs, same output, whatever was evaluated in between');
  assert.deepEqual(breathSway(7.7),breathSway(7.7));
  // The walking gait is the 9 rad/s oscillator: x peaks a quarter period in, y (second harmonic) at an eighth.
  const walk=WZ29_FEEL.gait.walk;
  assert.ok(near(gaitBob(0,{}).x,0,1e-15));assert.ok(near(gaitBob(Math.PI/18,{}).x,walk.x,1e-12));assert.ok(near(gaitBob(Math.PI/36,{}).y,walk.y,1e-12));
  assert.ok(near(gaitBob(Math.PI/14/2,{run:1}).x,WZ29_FEEL.gait.run.x,1e-12),'running is the 14 rad/s oscillator');
  assert.ok(near(gaitBob(Math.PI/13,{crouch:1}).x,WZ29_FEEL.gait.crouch.x,1e-12),'crouching is the slow oscillator');
  // Bounded for any clock.
  for(let i=0;i<4000;i++){
    const g=gaitBob(i*.137,{run:(i%7)/6,crouch:(i%5)/4}),b=breathSway(i*.137);
    assert.ok(Math.abs(g.x)<=.0051&&Math.abs(g.y)<=.0086&&Math.abs(g.roll)<=.0131&&Math.abs(g.pitch)<=.0051,`bob ${i}`);
    assert.ok(Math.abs(b.y)<=.0015+1e-12&&Math.abs(b.pitch)<=.0028+1e-12);
  }
  // Cross-faded oscillators: moving the gait weight by 1 % moves the bob by 1 % of the gap between gaits. A phase that accumulated
  // from clock*(9+5*run) would swing by 0.05*clock rad (here 0.6 rad, millimetres) for the same weight step.
  const clock=12.34;let worst=0;
  for(let i=0;i<100;i++)worst=Math.max(worst,Math.abs(gaitBob(clock,{run:(i+1)/100}).y-gaitBob(clock,{run:i/100}).y));
  assert.ok(worst<2e-4,`worst weight step ${worst}`);
  const naive=(run)=>Math.sin(2*clock*(9+5*run))*(.004+.004*run);
  assert.ok(Math.abs(naive(.01)-naive(0))>worst*5,'the closed-form single-phase alternative would pop');
});

test('every changed render module is free of randomness, wall clocks and timers',()=>{
  for(const path of ['src/render/m01-viewmodel.js','src/render/m01-wz29-presentation.js']){
    const source=readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
    for(const pattern of [/Math\.random/,/\bDate\b/,/performance\.now/,/requestAnimationFrame/,/\bsetTimeout\b|\bsetInterval\b/,/\bcrypto\b/])
      assert.doesNotMatch(source,pattern,`${path}: ${pattern}`);
  }
});

test('recoil kicks, returns to rest exactly and is deterministic per shot index',()=>{
  const rest=presentationPose({clock:20,lastShot:-1e9,aim:0,move:0,run:0,reload:0,shot:0});
  const at=(age,shot,aim=0)=>presentationPose({clock:20,lastShot:(20-age)*1000,aim,move:0,run:0,reload:0,shot});
  const end=wz29.recoil.end;
  for(const aim of [0,1])for(let shot=1;shot<=10;shot++){
    let peak=0;
    for(let i=0;i<=84;i++){
      const age=i*.005,pose=at(age,shot,aim),again=at(age,shot,aim);
      assert.deepEqual(pose.position.toArray(),again.position.toArray());assert.deepEqual(pose.rotation.toArray(),again.rotation.toArray());
      assert.ok(pose.kick>=0&&pose.kick<1);peak=Math.max(peak,pose.kick);
      assert.ok(pose.position.distanceTo(at(end+1,shot,aim).position)<.04,'bounded kick');
    }
    assert.ok(peak>.5&&peak<1,`peak ${peak}`);
    // Back at rest: after the envelope the pose is the no-shot pose, bit for bit (hip; ADS is the exact sight pose).
    for(const age of [end+1e-9,end+.001,end+.5,5]){
      const pose=at(age,shot,aim),base=presentationPose({clock:20,lastShot:-1e9,aim,move:0,run:0,reload:0,shot});
      assert.equal(pose.kick,0);assert.deepEqual(pose.position.toArray(),base.position.toArray());assert.deepEqual(pose.rotation.toArray(),base.rotation.toArray());
    }
    assert.equal(at(0,shot,aim).kick,0,'zero at the instant of the shot');
  }
  // The shot index (never an RNG) varies side and cant: both signs occur, each index always the same.
  const yaw=pose=>new THREE.Euler().setFromQuaternion(pose.rotation,'XYZ').y,sides=()=>Array.from({length:16},(_,i)=>Math.sign(yaw(at(.03,i+1))-yaw(rest)));
  assert.ok(sides().includes(1)&&sides().includes(-1),'side varies with the shot index');
  assert.deepEqual(sides(),sides());
  // ADS recoil is weaker than the hip's; both lift the muzzle (climb) then settle.
  assert.ok(at(.03,3,1).position.distanceTo(presentationPose({clock:20,lastShot:-1e9,aim:1,move:0,run:0,reload:0}).position)<
    at(.03,3,0).position.distanceTo(rest.position));
});

// ——— Wall probe: pure, read-only ———
const frame=(origin=[0,1.7,0],forward=[1,0,0])=>{
  const f=new THREE.Vector3(...forward).normalize(),r=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize(),u=new THREE.Vector3().crossVectors(r,f);
  const plain=v=>({x:v.x,y:v.y,z:v.z});return {origin:{x:origin[0],y:origin[1],z:origin[2]},forward:plain(f),right:plain(r),up:plain(u)};
};
const box=(x0,x1,z0=-6,z1=6,y0=-1,y1=5)=>({min:{x:x0,y:y0,z:z0},max:{x:x1,y:y1,z:z1}});
const freezeDeep=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freezeDeep(v);return Object.freeze(o);};

test('wall probe measures the first collision box along the aim and ignores what is not in front, without writing',()=>{
  const walls=freezeDeep([box(1.0,1.5)]),f=frame();
  assert.ok(near(wallClearance(walls,f),1.0,1e-12),'flat wall straight ahead');
  assert.equal(wallClearance(freezeDeep([box(-3,-1)]),f),Infinity,'behind');
  assert.equal(wallClearance(freezeDeep([box(1.0,1.5,.5,6)]),f),Infinity,'a wall beside the aim, parallel to it');
  assert.equal(wallClearance(freezeDeep([box(1.0,1.5,-6,6,-1,1.2)]),f),Infinity,'low cover below the rifle');
  assert.ok(wallClearance(freezeDeep([box(1.0,1.5,-6,6,-1,2.6)]),f)<Infinity,'a tall wall');
  assert.equal(wallClearance(freezeDeep([box(WALL.reach+.05,WALL.reach+2)]),f),Infinity,'beyond the muzzle reach');
  assert.ok(near(wallClearance(freezeDeep([box(1.0,1.5),box(.6,.8)]),f),.6,1e-12),'nearest of several');
  // A post only a rifle-width off the centre line is still found (parallel probes), a thin post far off it is not.
  assert.ok(near(wallClearance(freezeDeep([box(1.0,1.2,.17,.3)]),f),1.0,1e-12));
  assert.equal(wallClearance(freezeDeep([box(1.0,1.2,.6,.7)]),f),Infinity);
  // Looking along z with a pitch: the probe follows the aim, not the world axes.
  const up=frame([0,1.7,0],[0,.6,.8]);
  // Parallel probes start a little apart along the view's right/up axes; the lowest one (-0.17 up, tilted back) meets this wall first.
  assert.ok(near(wallClearance(freezeDeep([box(-5,5,.8,1.2,-1,9)]),up),(.8-.17*.6)/.8,1e-9));
  // Bad input is "clear", never a throw.
  for(const bad of [null,undefined,{},frame([NaN,0,0]),{...f,forward:{x:NaN,y:0,z:0}}])assert.equal(wallClearance([box(1,2)],bad),Infinity);
  assert.equal(wallClearance(null,f),Infinity);assert.equal(wallClearance([],f),Infinity);
});

test('wall lowering target: none beyond the reach, full at the lowest pose, linear between; lowers fast, raises slowly',()=>{
  assert.equal(wallLowerTarget(Infinity),0);assert.equal(wallLowerTarget(WALL.reach),0);assert.equal(wallLowerTarget(WALL.full),1);assert.equal(wallLowerTarget(.2),1);
  let last=1;for(let d=0;d<=2;d+=.01){const t=wallLowerTarget(d);assert.ok(t<=last+1e-12&&t>=0&&t<=1);last=t;}
  assert.ok(near(wallLowerTarget((WALL.reach+WALL.full)/2),.5,1e-12));
  const time=(from,to)=>{let v=from,t=0;while(Math.abs(v-to)>.05*Math.abs(to-from)&&t<5){v=advanceWallLower(v,to,.01);t+=.01;}return t;};
  const inTime=time(0,1),outTime=time(1,0);
  assert.ok(inTime<.2&&outTime>inTime*2&&outTime<1,`in ${inTime} out ${outTime}`);
  assert.equal(advanceWallLower(.3,1,0),.3,'a repeated clock cannot move it');
  assert.equal(advanceWallLower(.5,0,10),0);assert.equal(advanceWallLower(.5,1,10),1);
});

// ——— Production viewmodel with real GLB clips ———
function rig(characters,obstacles=null){
  const camera=new THREE.PerspectiveCamera(70,16/9,.05,7500);camera.position.set(0,1.7,0);camera.lookAt(10,1.7,0);camera.updateMatrixWorld();
  const world={obstacles:obstacles??[],revision:1};
  const sim={clock:10,player:{aiming:false,moveBlend:0,sprinting:false,crouched:false,angle:0,pitch:0},weapon:new Wz29(),renderState:{weaponVisible:true},world};
  const v=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture());
  return {v,sim,camera,world,
    step(dt=0){sim.clock+=dt;v.update(sim,'low',0,{camera,viewFov:58});return v.stats;},
    /** Reconstruct at the authoritative state (as after a restore): the steady state for the current world. */
    settle(){world.revision++;v.visual=null;v.sampleKey=null;sim.clock+=1;v.update(sim,'low',0,{camera,viewFov:58});return v.stats;},
    dispose(){v.dispose();}};
}

test('production viewmodel aims in 0.30 s and out 0.22 s of mission time; the camera FOV rides the same curve; a repeated clock is frozen',async()=>{
  const c=await fixture(),r=rig(c);
  try{
    r.step();assert.equal(r.v.stats.aimBlend,0);assert.equal(r.camera.fov,70);
    r.sim.player.aiming=true;
    const dt=.01;let t=0;const samples=[];
    while(r.v.stats.aimBlend<1&&t<1){t+=dt;r.step(dt);samples.push({t,aim:r.v.stats.aimBlend,fov:r.camera.fov});}
    assert.ok(t>=.30-1e-9&&t<=.30+dt+1e-9,`in ${t}`);
    for(const s of samples){
      assert.equal(s.fov,adsFieldOfView(s.aim),'camera fov is the shared curve of the aim progress');
      assert.ok(near(s.aim,Math.min(1,s.t/.3),1e-9),`aim progress at ${s.t}`);
    }
    const mid=samples.find(s=>near(s.t,.15,1e-9));assert.ok(near(mid.aim,.5,1e-9)&&near(mid.fov,59,1e-6));
    assert.equal(r.camera.fov,48);assert.ok(near(r.camera.projectionMatrix.elements[5],1/Math.tan(THREE.MathUtils.degToRad(48)/2),1e-9),'projection updated');
    const a=alignmentReport(r.v);assert.ok(a.horizontalPixels<WZ29_VISUAL.adsTolerancePixels&&a.verticalPixels<WZ29_VISUAL.adsTolerancePixels,'exact sights in ADS');
    // Out in 0.22 s.
    r.sim.player.aiming=false;t=0;
    while(r.v.stats.aimBlend>0&&t<1){t+=dt;r.step(dt);assert.equal(r.camera.fov,adsFieldOfView(r.v.stats.aimBlend));}
    assert.ok(t>=.22-1e-9&&t<=.22+dt+1e-9,`out ${t}`);assert.equal(r.camera.fov,70);
    // Pause: flipping the input at an unchanged clock leaves the whole presentation and the camera exactly as it was.
    r.step(.05);const frozen=structuredClone(r.v.stats),matrix=r.v.root.getObjectByName('weapon').matrixWorld.toArray(),fov=r.camera.fov;
    r.sim.player.aiming=true;
    for(let i=0;i<4;i++){r.step(0);assert.deepEqual(r.v.stats,frozen);assert.deepEqual(r.v.root.getObjectByName('weapon').matrixWorld.toArray(),matrix);assert.equal(r.camera.fov,fov);}
    // A hitch lands where the fast schedule would: one 0.30 s frame equals thirty 0.01 s frames.
    r.step(.3);assert.equal(r.v.stats.aimBlend,1);assert.equal(r.camera.fov,48);
  }finally{r.dispose();}
});

test('ADS timing, gait bob and breath are the same at 40, 20 and 4 frames per second of mission time',async()=>{
  const c=await fixture(),runs=[.025,.05,.25].map(dt=>({dt,r:rig(c)}));
  try{
    for(const {r} of runs){r.sim.player.moveBlend=1;r.step();}
    const flips=[[0,false],[.5,true],[1.5,false]];   // aiming flips at these mission seconds, multiples of 0.25 on every grid
    for(let t=0;t<2-1e-9;t+=.25){
      for(const {dt,r} of runs)for(let i=0;i<Math.round(.25/dt);i++){
        r.sim.player.aiming=flips.filter(([at])=>at<=t+i*dt+1e-9).at(-1)[1];r.step(dt);
      }
      const [fast,mid,slow]=runs.map(({r})=>r.v.stats);
      for(const other of [mid,slow]){
        assert.ok(near(fast.aimBlend,other.aimBlend,1e-9),`aim at ${t+.25}: ${fast.aimBlend} ${other.aimBlend}`);
        assert.ok(near(fast.presentation.fov,other.presentation.fov,2e-4)&&near(fast.presentation.breath,other.presentation.breath,2e-6)&&near(fast.presentation.bob,other.presentation.bob,2e-6),`feel at ${t+.25}`);
      }
    }
    assert.equal(runs[0].r.v.stats.aimBlend,0,'aim flipped back out at 1.5 s and has finished by 2.0 s');
  }finally{runs.forEach(({r})=>r.dispose());}
});

test('walking bob and breath are alive on the hip, frozen when the clock stops, and absent in ADS',async()=>{
  const c=await fixture(),r=rig(c);
  try{
    r.sim.player.moveBlend=1;r.step();
    const bobs=new Set(),breaths=new Set();
    for(let i=0;i<40;i++){r.step(.025);bobs.add(r.v.stats.presentation.bob);breaths.add(r.v.stats.presentation.breath);}
    assert.ok(bobs.size>20&&breaths.size>20,'bob and breath move with the mission clock');
    assert.ok(Math.max(...bobs)>0&&Math.min(...bobs)<0,'bob swings both ways');
    const frozen=structuredClone(r.v.stats);for(let i=0;i<4;i++){r.step(0);assert.deepEqual(r.v.stats,frozen);}
    // Run: faster step rate than walk (more sign changes in the same second).
    const crossings=(run)=>{const q=rig(c);try{q.sim.player.moveBlend=1;q.sim.player.sprinting=run;q.step();let n=0,last=0;
      for(let i=0;i<200;i++){q.step(.005);const b=q.v.stats.presentation.bob;if(last&&Math.sign(b)&&Math.sign(b)!==Math.sign(last))n++;if(b)last=b;}return n;}finally{q.dispose();}};
    assert.ok(crossings(true)>crossings(false),'sprinting bobs faster than walking');
    // Down the sights, standing and moving: the rifle is on the sights and the presentation bob is exactly zero.
    r.sim.player.aiming=true;r.step(1);assert.equal(r.v.stats.aimBlend,1);assert.equal(Math.abs(r.v.stats.presentation.bob),0);assert.equal(Math.abs(r.v.stats.presentation.breath),0);
    const a=alignmentReport(r.v);assert.ok(a.horizontalPixels<1e-3&&a.verticalPixels<1e-3);
  }finally{r.dispose();}
});

test('wall lowering keeps the rifle in front of the wall down to the lowest pose and never cuts geometry at the near plane',async()=>{
  const c=await fixture(),r=rig(c),open=rig(c);
  try{
    for(const aiming of [false,true]){
      r.sim.player.aiming=aiming;open.sim.player.aiming=aiming;
      const restStats=open.settle(),rest=viewModelReach(open.v);
      assert.equal(restStats.presentation.wallLower,0);assert.equal(restStats.presentation.wallDistance,null);
      let lastLower=2,lastReach=0;
      for(const d of [.36,.5,.7,.8,.85,.9,1.0,1.1,1.2,1.3,1.4,WALL.reach,2,3]){
        r.world.obstacles=[box(d,d+.5)];const stats=r.settle(),p=stats.presentation,reach=viewModelReach(r.v);
        assert.ok(p.wallLower<=lastLower+1e-9&&reach.rifleReach>=lastReach-.01,`monotonic at ${d}`);lastLower=p.wallLower;lastReach=reach.rifleReach;
        assert.ok(reach.maxZ<-.03,`no vertex at or beyond the near plane at ${d}: ${reach.maxZ}`);
        assert.ok(near(p.wallLower,+wallLowerTarget(d).toFixed(4),1e-9),`steady lowering at ${d}`);
        if(d<=WALL.reach)assert.ok(near(p.wallDistance,d,1e-3),`probe ${p.wallDistance} at ${d}`);else assert.equal(p.wallDistance,null);
        // The reach claim: the drawn rifle stands at least 5 cm short of the wall wherever the lowest pose can make room.
        if(d>=WALL.full)assert.ok(reach.rifleReach<=d-.05,`${aiming?'ADS':'hip'}: rifle reach ${reach.rifleReach} wall ${d}`);
        else assert.ok(reach.rifleReach<=.75&&p.wallLower===1,`lowest pose at ${d}: ${reach.rifleReach}`);
        assert.ok(near(p.muzzleReach,reach.rifleReach,.05));
      }
      // Clear (the 3 m wall is beyond the reach): the open-ground pose at the same mission clock, no lowering.
      assert.ok(near(rest.rifleReach,aiming?1.215:1.208,.01));
      open.sim.clock=r.sim.clock;open.v.sampleKey=null;open.step(0);
      assert.deepEqual(r.v.root.getObjectByName('weapon').matrixWorld.toArray(),open.v.root.getObjectByName('weapon').matrixWorld.toArray());
    }
    // Sights stay exact in ADS whenever nothing is in the way (also with a wall to the side and low cover ahead).
    r.sim.player.aiming=true;r.world.obstacles=[box(1,2,.45,6),box(1,2,-6,6,-1,1.2)];
    const stats=r.settle();assert.equal(stats.presentation.wallLower,0);assert.equal(stats.presentation.wallDistance,null);
    const a=alignmentReport(r.v);assert.ok(a.horizontalPixels<1e-3&&a.verticalPixels<1e-3);
  }finally{r.dispose();open.dispose();}
});

test('wall lowering lowers fast when the wall arrives and raises once it is clear, on the mission clock only',async()=>{
  const c=await fixture(),r=rig(c);
  try{
    r.settle();r.world.obstacles=[box(.9,1.4)];r.world.revision++;
    let t=0,lowered=null;
    for(;t<1;){t+=.01;r.step(.01);if(lowered===null&&r.v.stats.presentation.wallLower>=.9*wallLowerTarget(.9))lowered=t;}
    assert.ok(lowered>0&&lowered<.2,`lowered in ${lowered}`);
    assert.ok(near(r.v.stats.presentation.wallLower,wallLowerTarget(.9),1e-3));
    // Paused with the wall there: nothing moves however often it is drawn.
    const frozen=structuredClone(r.v.stats);for(let i=0;i<4;i++){r.step(0);assert.deepEqual(r.v.stats,frozen);}
    // The wall goes (a demolition, a step to the side): the rifle comes back, more slowly, and ends at the exact rest pose.
    r.world.obstacles=[];r.world.revision++;
    let raised=null;t=0;
    for(;t<2;){t+=.01;r.step(.01);if(raised===null&&r.v.stats.presentation.wallLower<.1)raised=t;}
    assert.ok(raised>lowered*2&&raised<1.2,`raised in ${raised} after ${lowered}`);
    assert.equal(r.v.stats.presentation.wallLower,0);
    const open=rig(c);try{open.settle();open.sim.clock=r.sim.clock;open.v.sampleKey=null;open.step(0);
      assert.ok(near(viewModelReach(r.v).rifleReach,viewModelReach(open.v).rifleReach,1e-6),'back at the open-ground pose');}finally{open.dispose();}
  }finally{r.dispose();}
});

test('wall lowering needs the render camera and the world boxes; without either the pose is the old one',async()=>{
  const c=await fixture(),r=rig(c,[box(.9,1.4)]);
  try{
    r.sim.clock+=1;r.v.update(r.sim,'low',0);   // no view: no probe
    assert.equal(r.v.stats.presentation.wallLower,0);assert.equal(r.v.stats.presentation.wallDistance,null);
    delete r.sim.world;r.v.visual=null;r.v.sampleKey=null;r.sim.clock+=1;r.v.update(r.sim,'low',0,{camera:r.camera,viewFov:58});
    assert.equal(r.v.stats.presentation.wallLower,0);
  }finally{r.dispose();}
});

// ——— The mission itself: real simulation, real collision boxes, nothing written back ———
const snapshot=sim=>JSON.stringify(sim.snapshot());
const place=(camera,player)=>{const e=eyePosition(player),d=aimDirection(player.angle,player.pitch);camera.position.set(e.x,e.y,e.z);camera.lookAt(e.x+d.x,e.y+d.y,e.z+d.z);camera.updateMatrixWorld();};

test('real mission: the rifle lowers at the road portal wall on the sim collision boxes and raises when turning away; aim, shots and saves are untouched',async()=>{
  const c=await fixture(),d=driver(),twin=driver(),v=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture());
  const camera=new THREE.PerspectiveCamera(70,16/9,.05,7500);
  const both=(controls)=>{d.step(controls);twin.step(controls);};
  try{
    both({skip:true});for(let i=0;i<20;i++)both({});
    const nav=(x,z)=>{for(let i=0;i<3000;i++){const p=d.sim.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<1.2)return;
      let turn=Math.atan2(dz,dx)-p.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));both({lookX:turn/.0022,forward:1,sprint:true});}throw new Error('walk');};
    nav(-10.9,32.8);
    const face=angle=>{let turn=angle-d.sim.player.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));both({lookX:turn/.0022});};
    face(0);assert.ok(Math.abs(d.sim.player.angle)<1e-9);
    const frame=(label)=>{
      place(camera,d.sim.player);
      const before=snapshot(d.sim),aim=aimDirection(d.sim.player.angle,d.sim.player.pitch),muzzle=muzzlePosition(d.sim.player);
      v.update(d.sim,'low',0,{camera,viewFov:58});
      assert.equal(snapshot(d.sim),before,`${label}: presentation never mutates the simulation`);
      assert.deepEqual(aimDirection(d.sim.player.angle,d.sim.player.pitch),aim);assert.deepEqual(muzzlePosition(d.sim.player),muzzle);
      assert.equal(snapshot(d.sim),snapshot(twin.sim),`${label}: same save as a simulation that never had a viewmodel`);
      return v.stats.presentation;
    };
    // Open ground, 4 m from the wall face at x = -7: nothing in reach.
    let p=frame('far');assert.equal(p.wallLower,0);assert.equal(p.wallDistance,null);
    // Walk up to about a metre, firing and aiming by the real controls on the way (the sim decides, the view follows).
    let guard=0;
    while(-7-d.sim.player.x>1.0&&guard++<80){both({forward:1,aim:guard%7<3});frame('approach');}
    both({aim:true});
    for(let i=0;i<12;i++){both({aim:true});p=frame('settled');}
    const eye=eyePosition(d.sim.player),dir=aimDirection(d.sim.player.angle,d.sim.player.pitch),hit=traceObstruction(d.sim.world,eye,dir,5);
    assert.equal(hit.id,'road_portal_n');
    assert.ok(near(p.wallDistance,hit.distance,1e-3),`probe ${p.wallDistance} vs the sim's own trace ${hit.distance}`);
    assert.ok(p.wallDistance>=WALL.full&&p.wallDistance<=1.01,`stand-off ${p.wallDistance}`);
    assert.ok(p.wallLower>.5,`lowered ${p.wallLower}`);assert.ok(near(p.wallLower,+wallLowerTarget(p.wallDistance).toFixed(4),1e-3));
    assert.ok(p.muzzleReach<=p.wallDistance-.04,`muzzle ${p.muzzleReach} stays short of the wall at ${p.wallDistance}`);
    assert.ok(viewModelReach(v).rifleReach<=p.wallDistance-.04&&viewModelReach(v).maxZ<-.03);
    // The simulation's shot is unchanged by the lowered pose: the muzzle the sim fires from is where it always was.
    assert.deepEqual(muzzlePosition(d.sim.player),muzzlePosition(twin.sim.player));
    // Shots while lowered: recoil and flash are drawn on the lowered pose; the save still matches the twin.
    both({aim:true,fire:true});p=frame('shot');
    for(let i=0;i<30;i++){both({aim:true});frame('bolt');}
    // Turn away from the wall: the rifle comes back to the open-ground pose within two seconds of mission time.
    face(Math.PI);for(let i=0;i<40;i++){both({});p=frame('turned');}
    assert.equal(p.wallLower,0);assert.equal(p.wallDistance,null);
  }finally{v.dispose();}
});
