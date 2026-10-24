import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01ViewModel,fpFixture,fakeSim,setWeapon,HandRig,sample,GRID} from './helpers/m01-fp-hand-metrics.js';
import {WEAPON_PRESENTATION} from '../src/render/first-person-weapon-fx.js';
import {STOCK_SHADE} from '../src/render/m01-wz29-presentation.js';

// R6-a: how the first-person hands and arms hold the kb wz.29. Deterministic, from the real rig, the real clips and the real M01ViewModel:
// no browser, no timing. Distances in metres (reported in cm), angles in degrees. A passing test is a measured geometric contact or clearance;
// it is not a playtest and says nothing about how the animation feels.
//
// BEFORE (commit e7f5f28, `M01_FP_SRC=<tree> node --test tests/m01-fp-hand-grip.test.js`): trigger finger 6.2 cm off the trigger, right hand 1.5 cm and
// left 1.8 cm inside the wood, left fingertips 4.7 cm up the forend, forearm/hand angle up to 125 deg beyond the authored wrist, stock filling 5.8 % of the
// frame during the reload, 224 hand/sleeve vertices in the sight window when aiming (centred on the front post), a 38.6 cm per-frame jump of the right wrist when a shot cuts a reload short.
const cm=x=>x*100;
const characters=await fpFixture(),view=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim=fakeSim();
view.update(sim,'high',0);
const rig=new HandRig(view),rows=new Map();
for(const [name,opts] of GRID)rows.set(name,sample(view,rig,sim,{...opts,contacts:true}));
after(()=>{view.dispose();characters.dispose();});
const names=re=>[...rows.keys()].filter(n=>re.test(n));
const each=(re,fn)=>{for(const n of names(re))fn(n,rows.get(n));};

test('idle holds (hip, shoulder, sprint): trigger finger on the trigger, palms on the wood, fingers not through it',()=>{
  each(/^(hip|ads|sprint)$/,(n,m)=>{
    assert.ok(cm(m.triggerGap)<=2.0,`${n}: index tip ${cm(m.triggerGap).toFixed(1)} cm from the trigger`);
    assert.ok(cm(m.right.depth)<=1.0,`${n}: right hand ${cm(m.right.depth).toFixed(1)} cm inside the wood (${m.right.deepest})`);
    assert.ok(cm(m.right.palmGap)<=1.0,`${n}: right palm ${cm(m.right.palmGap).toFixed(1)} cm off the stock`);
    assert.ok(cm(m.left.depth)<=.8,`${n}: left hand ${cm(m.left.depth).toFixed(1)} cm inside the wood (${m.left.deepest})`);
    assert.ok(cm(m.left.palmGap)<=1.0,`${n}: left palm ${cm(m.left.palmGap).toFixed(1)} cm off the forend`);
    // The left fingers wrap the forend but do not climb over the top into the sight line (wood top is at +2.2 cm, handguard +4.5 cm).
    assert.ok(cm(m.leftTopTip)<=3.0,`${n}: left fingertip ${cm(m.leftTopTip).toFixed(1)} cm up the forend`);
  });
});

test('bolt cycle: the right fist stays on the bolt handle while it works, the left hold never moves',()=>{
  each(/^bolt-(ads|hip)-0\.(2|3|4|5|6|7|8|9)/,(n,m)=>{
    assert.ok(cm(m.handToKnob)<=2.5,`${n}: knob ${cm(m.handToKnob).toFixed(1)} cm from the hand`);
    assert.ok(cm(m.right.depth)<=2.0,`${n}: right hand ${cm(m.right.depth).toFixed(1)} cm inside the wood`);
  });
  each(/^bolt-/,(n,m)=>{assert.ok(cm(m.left.depth)<=1.0&&cm(m.leftTopTip)<=3.0,`${n}: left hold ${cm(m.left.depth).toFixed(1)} cm inside, ${cm(m.leftTopTip).toFixed(1)} cm up`);});
});

test('clip reload: the clip stays in the right hand while it is carried and loaded, and the hand is on the bolt when it opens and closes',()=>{
  each(/^reload-0\.(2|3|4|5)/,(n,m)=>assert.ok(cm(m.clipToRightHand)<=1.0,`${n}: clip ${cm(m.clipToRightHand).toFixed(1)} cm from the hand`));
  each(/^reload-0\.(10|65|70|75|80|85)$/,(n,m)=>assert.ok(cm(m.handToKnob)<=2.5,`${n}: knob ${cm(m.handToKnob).toFixed(1)} cm from the hand`));
  each(/^reload-/,(n,m)=>assert.ok(cm(m.left.depth)<=1.0&&cm(m.leftTopTip)<=3.0,`${n}: left hold ${cm(m.left.depth).toFixed(1)} cm inside, ${cm(m.leftTopTip).toFixed(1)} cm up`));
});

test('wrist angle stays within 40 degrees of the authored one: the hand does not fold back onto a re-aimed forearm',()=>{
  let worst=0;
  for(const [n,m] of rows)for(const side of ['R','L']){
    const d=Math.abs(m[`wristBend${side}`]-m[`authoredWristBend${side}`]);worst=Math.max(worst,d);
    assert.ok(d<=40,`${n}/${side}: wrist ${m[`wristBend${side}`].toFixed(0)} deg against ${m[`authoredWristBend${side}`].toFixed(0)} authored`);
  }
  assert.ok(worst>0);
});

test('arms: bone lengths exact, right elbow bent in the idle holds, no sleeve cut end inside the frame, sleeve start behind the lens limit',()=>{
  const a=rig.bone('upperarm_r').distanceTo(rig.bone('lowerarm_r')),b=rig.bone('lowerarm_r').distanceTo(rig.bone('hand_r'));
  for(const [n,m] of rows){
    assert.equal(m.sleeveStartInViewR,0,`${n}: right sleeve cut end in frame`);assert.equal(m.sleeveStartInViewL,0,`${n}: left sleeve cut end in frame`);
    assert.ok(m.sleeveStartNearest>=.03,`${n}: sleeve vertex ${cm(m.sleeveStartNearest).toFixed(1)} cm from the eye`);
    // The camera never sits inside a sleeve or a hand: every arm vertex that is in the frame stays at least 12 cm from the lens (near plane: 3 cm).
    assert.ok(m.armNearest>=.12,`${n}: a visible arm vertex is ${cm(m.armNearest).toFixed(1)} cm from the lens`);
  }
  each(/^(hip|sprint)$/,(n,m)=>assert.ok(m.elbowR<=135,`${n}: right elbow ${m.elbowR.toFixed(0)} deg (a stiff arm reads as a rod)`));
  // Aimed, the forearms are drawn down the sights (out of the bottom of the frame), which opens the elbow: up to 140 deg, never a straight rod.
  each(/^ads$/,(n,m)=>assert.ok(m.elbowR<=140&&m.elbowL<=140,`${n}: elbows ${m.elbowR.toFixed(0)} / ${m.elbowL.toFixed(0)} deg`));
  // Not one rigid body with the rifle: the shoulder anchor lives in the view frame, so the elbow flexes as the rifle goes from the hip to the
  // shoulder and back to the run (BEFORE it was 130.3 deg in all three).
  assert.ok(Math.abs(rows.get('ads').elbowR-rows.get('hip').elbowR)>=20&&Math.abs(rows.get('sprint').elbowR-rows.get('ads').elbowR)>=20,
    `right elbow hip ${rows.get('hip').elbowR.toFixed(0)} / ads ${rows.get('ads').elbowR.toFixed(0)} / sprint ${rows.get('sprint').elbowR.toFixed(0)} deg`);
  // Bone lengths are an invariant of the rig: the solve only rotates and places bones.
  for(const [state,opts] of [['READY',{}],['BOLT_CYCLE',{fraction:.5}],['RELOAD_CLIP',{fraction:.3}],['RELOAD_CLIP',{fraction:.72,aiming:true}]]){
    sample(view,rig,sim,{state,...opts,authored:false});
    for(const side of ['r','l']){
      const u=rig.bone(`upperarm_${side}`),e=rig.bone(`lowerarm_${side}`),h=rig.bone(`hand_${side}`);
      assert.ok(Math.abs(u.distanceTo(e)-a)<1e-4&&Math.abs(e.distanceTo(h)-b)<1e-4,`${state}/${side}: bone lengths drifted`);
    }
  }
});

test('reload keeps the butt at the shoulder: the stock never fills more of the frame than it does at the hip',()=>{
  const hipWorst=Math.max(...names(/^(hip|sprint|bolt-hip)/).map(n=>rows.get(n).stockCoverage));
  each(/^(reload|single)-/,(n,m)=>assert.ok(m.stockCoverage<=.02,`${n}: stock fills ${(m.stockCoverage*100).toFixed(1)} % of the frame`));
  assert.ok(hipWorst<=.02,`hip stock coverage ${(hipWorst*100).toFixed(1)} %`);
});

// The sight window is centred on the tip of the front post: 0.075 x 0.10 ndc on each side = 96 x 72 px of a 1280 x 720 frame (SIGHT_WINDOW in the helper).
// Pixels are counted on the rasterised triangles (a finger is two vertices and a hundred pixels: the round-1 vertex count said 2 for a thumb that
// covered 366 px, and it was the thumb that the Captain saw next to the front post).
// BEFORE (e7f5f28): 216 skin vertices in the window when aiming (the hands were on the sights); round 1 (d600fe0): 122; thumb across the top of the
// wrist at idle: 366 px, 0 pixels now.
test('aiming: no skin in the sight window around the front post: shoulder idle and the whole bolt cycle on the shoulder',()=>{
  // The only frame that is not on the sights is 0.85: the right thumb pushes the bolt home while the rifle is still 39 % down (the stroke eases it
  // back on the eye by 0.95); it is allowed 60 px (0.9 % of the window), every other frame 20 px (0.3 %).
  each(/^(ads|bolt-ads-)/,(n,m)=>{
    const allowed=n==='bolt-ads-0.85'?60:20;
    assert.ok(m.sightFlesh<=allowed,`${n}: ${m.sightFlesh} px of skin inside the sight window (${allowed} allowed)`);
    assert.ok(m.sightOcclusion<=allowed,`${n}: ${m.sightOcclusion} px of hand/sleeve inside the sight window (${allowed} allowed)`);
  });
  assert.ok(rows.get('ads').sightFlesh<=10,`ads: ${rows.get('ads').sightFlesh} px of skin`);
});

test('aiming: both forearms leave through the bottom edge (right to the lower right, left to the lower left) and the sleeves stay under 12 % of the frame',()=>{
  each(/^(ads|bolt-ads-)/,(n,m)=>{
    assert.equal(m.armExitR.edge,'bottom',`${n}: right arm leaves through the ${m.armExitR.edge}`);assert.equal(m.armExitL.edge,'bottom',`${n}: left arm leaves through the ${m.armExitL.edge}`);
    assert.ok(m.armExitR.dx>0,`${n}: right forearm runs ${m.armExitR.dx.toFixed(2)} ndc sideways (must go right)`);assert.ok(m.armExitL.dx<0,`${n}: left forearm runs ${m.armExitL.dx.toFixed(2)} ndc sideways (must go left)`);
  });
  // Sleeve, cuff, cap and strap area of the frame (96 x 54 raster). Idle and on the sights: <= 12 %. While the right arm reaches out to push the
  // bolt (0.85 .. 0.92 of the cycle, rifle still eased off the eye) it may reach 14 %.
  for(const n of ['ads','bolt-ads-0.05','bolt-ads-0.10','bolt-ads-0.15','bolt-ads-0.97'])assert.ok(rows.get(n).armCoverage<=.12,`${n}: sleeves fill ${(rows.get(n).armCoverage*100).toFixed(1)} % of the frame`);
  each(/^bolt-ads-/,(n,m)=>assert.ok(m.armCoverage<=.14,`${n}: sleeves fill ${(m.armCoverage*100).toFixed(1)} % of the frame`));
});

// The bright wedge under the sights when aimed is the top of the rifle's own wood stock (the eye sits 11 cm behind the butt and the sights are locked
// by the alignment tests, so the geometry cannot move). It is not skin, but it reads as skin: aimed, the wood near the eye sits in the head's shadow.
test('aiming: the stock wood is shaded only while aimed (steel and the far forend are not), through the rifle material',()=>{
  const shade=()=>view.rifleMaterial.userData.m01StockShade.value;
  sample(view,rig,sim,{state:'READY',authored:false});assert.equal(shade(),0,'no shade at the hip');
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false});assert.ok(Math.abs(shade()-STOCK_SHADE.strength)<1e-6,`shade ${shade()} on the sights`);
  const shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};view.rifleMaterial.onBeforeCompile(shader);
  assert.equal(shader.uniforms.m01StockShade,view.rifleMaterial.userData.m01StockShade,'the uniform the view model drives is the compiled one');
  const f=shader.fragmentShader,iMetal=f.indexOf('metalnessFactor = min(metalnessFactor, 0.86)'),iShade=f.indexOf('outgoingLight *= 1.0 - m01StockShade * (1.0 - metalnessFactor)'),iOut=f.indexOf('#include <opaque_fragment>');
  assert.ok(iMetal>0&&iShade>iMetal&&iOut>iShade,'wood-only (metalness mask), applied to the final light, before the output');
  assert.match(f,new RegExp(`smoothstep\\(${STOCK_SHADE.near.toFixed(2)}, ${STOCK_SHADE.far.toFixed(2)}, length\\(vViewPosition\\)\\)`),'distance range from STOCK_SHADE');
  assert.ok(STOCK_SHADE.far<.70,'the far forend (hand at 0.8 m) and the sights (0.74 m) are outside the shaded range');
  assert.match(view.rifleMaterial.customProgramCacheKey(),/v4$/,'program key moved with the shader');
});

test('a shot that cuts a single-round reload short eases the hands and rifle back instead of snapping them (and settles on the aim pose)',()=>{
  const pos=n=>view.root.getObjectByName(n).getWorldPosition(new THREE.Vector3());
  for(const aiming of [false,true]){
    const s=fakeSim();s.player.aiming=aiming;s.weapon.mag=2;s.clock=30;view.visual=null;view.sampleKey=null;view.poseValid=false;view.update(s,'high',0);
    s.weapon.reload(s.clock*1000);
    const dt=1/60;let prev=null,atCut=0,after=0;
    for(let i=0;i<72;i++){
      s.clock+=dt;
      if(i===24){const w=s.weapon;w.state='BOLT_CYCLE';w.started=s.clock*1000;w.until=w.started+1050;w.lastShot=w.started;w.mag--;w.shotCount++;}
      else if(i<24)s.weapon.update(s.clock*1000);
      view.update(s,'high',0);
      const h=pos('hand_r'),r=pos('weapon');
      if(prev){
        const step=Math.max(h.distanceTo(prev.h),r.distanceTo(prev.r))*100;
        if(i===24)atCut=step;else if(i>24)after=Math.max(after,step);
      }
      prev={h,r};
    }
    assert.ok(atCut<=4,`${aiming?'ADS':'hip'}: ${atCut.toFixed(1)} cm jump on the frame of the shot`);
    assert.ok(after<=8,`${aiming?'ADS':'hip'}: ${after.toFixed(1)} cm per-frame step while recovering`);
    // After the fade a fresh view model of the same state is at the same place.
    const fresh=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture());
    try{fresh.update(s,'high',0);for(const n of ['hand_r','hand_l','weapon'])assert.ok(fresh.root.getObjectByName(n).getWorldPosition(new THREE.Vector3()).distanceTo(pos(n))<1e-4,`${n} settled`);}
    finally{fresh.dispose();}
  }
});

test('aim and sprint pressed and released during a clip reload never snap the rifle or the left hand (60 Hz steps)',()=>{
  const pos=n=>view.root.getObjectByName(n).getWorldPosition(new THREE.Vector3());
  const s=fakeSim();s.weapon.mag=0;s.clock=40;view.visual=null;view.sampleKey=null;view.poseValid=false;view.update(s,'high',0);s.weapon.reload(s.clock*1000);
  const toggles=[[40,'aiming',true],[80,'sprinting',true],[140,'aiming',false],[170,'sprinting',false]];let prev=null,rifle=0,left=0;
  for(let i=0;i<260;i++){
    s.clock+=1/60;s.weapon.update(s.clock*1000);for(const [frame,flag,value] of toggles)if(i===frame){s.player[flag]=value;s.player.moveBlend=s.player.sprinting?1:0;}
    view.update(s,'high',0);const w=pos('weapon'),l=pos('hand_l');
    if(prev){rifle=Math.max(rifle,w.distanceTo(prev.w)*100);left=Math.max(left,l.distanceTo(prev.l)*100);}prev={w,l};
  }
  assert.ok(rifle<=1.5,`rifle stepped ${rifle.toFixed(2)} cm in one frame`);assert.ok(left<=1.5,`left wrist stepped ${left.toFixed(2)} cm in one frame`);
});

test('mechanical markers of the presentation profile coincide with the authored clips (timing sync: no marker needs moving)',()=>{
  const M=WEAPON_PRESENTATION.wz29.mechanics,at=(clip,t)=>{view.root.position.set(0,0,0);view.root.rotation.set(0,0,0);view.play(view.root,view.mixer,clip,t);return {bolt:rig.bone('weapon_bolt').z,clip:rig.bone('weapon_clip'),knob:rig.knob()};};
  const boltDuration=characters.clips.get('fire_bolt').duration,rest=at('fire_bolt',0),open=at('fire_bolt',.7);
  const travel=open.bolt-rest.bolt;assert.ok(travel>.07,'bolt travel');
  // chamberOpen: the handle is up and still locked, the bolt has not started to travel.
  const chamber=at('fire_bolt',M.chamberOpen*boltDuration);assert.ok(chamber.knob.y-rest.knob.y>.05&&chamber.bolt-rest.bolt<.01,`chamberOpen: handle ${cm(chamber.knob.y-rest.knob.y).toFixed(1)} cm up, bolt ${cm(chamber.bolt-rest.bolt).toFixed(1)} cm back`);
  // eject: the case leaves while the bolt is travelling (between a third and nine tenths of its stroke).
  const eject=at('fire_bolt',M.eject*boltDuration),f=(eject.bolt-rest.bolt)/travel;assert.ok(f>.33&&f<.9,`eject at ${(f*100).toFixed(0)} % of the stroke`);
  // chambered: bolt forward again.
  assert.ok(at('fire_bolt',M.chambered*boltDuration).bolt-rest.bolt<.003,'chambered: bolt forward');
  // reload: clip_ejected (2.45 s) is where the stripper clip starts to leave the guide; bolt_closed (2.7 s) is the handle back down.
  const before=at('reload_clip',2.3).clip,start=at('reload_clip',M.clipEjected),late=at('reload_clip',2.6).clip;
  assert.ok(start.clip.distanceTo(before)>.01,'the clip has started to move at the clip_ejected marker');assert.ok(late.distanceTo(before)<.002,'and is gone by 2.6 s');
  const closed=at('reload_clip',M.boltClosed),opened=at('reload_clip',M.boltClosed-.15);
  assert.ok(closed.knob.distanceTo(rest.knob)<.002&&opened.knob.distanceTo(rest.knob)>.03,'bolt_closed: the handle is down at the marker and was up 0.15 s earlier');
});
