import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01ViewModel,fpFixture,fakeSim,HandRig,sample} from './helpers/m01-fp-hand-metrics.js';
import {classifyRifle,sightPicture,regionShare,eyeGeometry,PART,LOWER_CENTRE} from './helpers/m01-fp-sight-picture.js';
import {WZ29_VISUAL,FACE_CLIP,faceClipWeight,adsEase,riflePresentationMaterial} from '../src/render/m01-wz29-presentation.js';
import {alignmentReport} from '../tools/verification/m01-wz29-viewmodel-audit.mjs';

// R6-b: the shouldered sight picture of the kb wz.29. Deterministic, from the real rig, the real clips and the real M01ViewModel; the picture is a software
// rasterisation of what the weapon camera sees (tests/helpers/m01-fp-sight-picture.js: depth test, 0.03 m near plane, 58 degrees, 16:9), not a screenshot.
// Region: LOWER_CENTRE = the central half of the frame's width, from just under the aim point to the bottom edge (|x| <= 0.25, -1 <= y <= -0.05 in ndc).
//
// BEFORE (bc6d4b0, R6-a): the wood of the stock filled 30.6 % of the lower-centre region (the comb alone 30.1 %; 3.6 % of the whole frame) and the dark strip under it was the
// rear face of the steel butt plate: the eye (0.74 m behind the rear sight, which is 11.5 cm BEHIND the butt plate) looks at the butt from behind. The bolt shroud and the
// receiver ring, 0.37 and 0.42 m in front of the eye with their tops a few millimetres under the sight line, hid the rear sight (104 px of 1280 x 720) and the front post (0 px).
// AFTER: the comb, heel and butt (wood and plate) are not drawn while aimed (FACE_CLIP): comb 0.1 %, all wood 3.0 %, the metal in the region 3.7 % (was 22.1 %).
const characters=await fpFixture(),view=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim=fakeSim();
view.update(sim,'high',0);
const rig=new HandRig(view);
sample(view,rig,sim,{state:'READY',aiming:true,authored:false,lite:true});
const classes=classifyRifle(rig);
after(()=>{view.dispose();characters.dispose();});

const clipDepth=()=>view.rifleMaterial.userData.m01FaceClip.value;
const picture=()=>sightPicture(rig,classes,{faceClip:clipDepth()});
const wood=[PART.stock,PART.comb,PART.handguard];
const share=(pic,kinds)=>regionShare(pic,LOWER_CENTRE,kinds),pixels=(pic,kind)=>pic.part.reduce((n,k)=>n+(k===kind?1:0),0)*(1280*720)/(pic.cols*pic.rows);
const pose=opts=>{sample(view,rig,sim,{...opts,authored:false,lite:true});return picture();};
const pct=x=>`${(x*100).toFixed(1)} %`;

test('the alignment lock is intact: the eye, the rear sight and the front sight are on one line through the screen centre, and the muzzle flash is on its socket',()=>{
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false,lite:true});
  const a=alignmentReport(view);
  for(const key of ['horizontalPixels','verticalPixels','centerHorizontalPixels','centerVerticalPixels'])assert.ok(a[key]<WZ29_VISUAL.adsTolerancePixels,`${key}: ${a[key]}`);
  assert.ok(a.muzzleFlashDistance<=WZ29_VISUAL.flashToleranceMetres);
  assert.ok(Math.abs(a.points.rear[2]+WZ29_VISUAL.rearDepth)<1e-9&&Math.abs(a.points.rear[0])<1e-9&&Math.abs(a.points.rear[1])<1e-9,`rear sight ${a.points.rear}`);
  assert.ok(a.points.front[2]<a.points.rear[2]);
  assert.ok(eyeGeometry(rig).eyeToLine<1e-9,'the eye is on the line rear sight -> front sight');
});

// Why the eye is not moved (R6-b investigation, numbers in docs/verification/m01-runtime/fp-ads-sight-2026-10-24/README.md): the line of sight passes 2.7 to 3.5 cm over
// the comb whatever the eye relief, so the wedge is the asset's, and every metre taken off the eye relief brings the hands and sleeves into the lens (right sleeve and cuff
// 14.3 % of the frame at 0.60 m, 16.6 % at 0.56 m, against the 12 % that tests/m01-fp-hand-grip.test.js holds). This test pins the geometry the head clip is derived from.
test('the eye relief the head clip is derived from: eye on the sight line behind the butt plate, comb 3 cm under the line, receiver ring 0.415 m ahead of the eye',()=>{
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false,lite:true});
  const g=eyeGeometry(rig);
  assert.ok(Math.abs(g.eyeRelief-WZ29_VISUAL.rearDepth)<1e-9);
  assert.ok(g.forwardOfButt<0,`the eye is ${(-g.forwardOfButt*100).toFixed(1)} cm behind the butt plate`);
  // Eye height over the stock's top line at the butt end (the nearest wood): between 2 and 4 cm, as 'eye over the comb' of the asset.
  const eyeY=g.eye[1],buttTop=.019;assert.ok(eyeY-buttTop>=.02&&eyeY-buttTop<=.04,`eye ${((eyeY-buttTop)*100).toFixed(1)} cm over the butt top`);
  const ring=rig.weapon.localToWorld(new THREE.Vector3(0,.03,.035));assert.ok(Math.abs(-ring.z-.415)<2e-3,`receiver ring rear end ${(-ring.z).toFixed(3)} m ahead of the eye`);
  assert.ok(Math.abs(FACE_CLIP.depth-(-ring.z-.005))<2e-3,`the clip falls 5 mm short of the ring: ${FACE_CLIP.depth} vs ${(-ring.z).toFixed(3)}`);
});

test('the head clip weight: 0 at the hip, engaged late while the rifle comes up, 1 on the sights; gone during the bolt stroke, a reload and a wall',()=>{
  assert.equal(faceClipWeight(0),0);assert.equal(faceClipWeight(1),1);assert.equal(faceClipWeight(1,0,0,0),1);
  const [e0,e1]=FACE_CLIP.engage,smooth=(x,a,b)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
  for(const aim of [.1,.3,.5,.7,.9]){assert.equal(faceClipWeight(aim),smooth(adsEase(aim),e0,e1));}
  // Not engaged until the rifle is nearly at the eye (the aim ease reaches the first `engage` value), full from the second.
  assert.equal(faceClipWeight(.2),0);assert.equal(adsEase(.8)>=e1,true);assert.equal(faceClipWeight(.8),1);
  // Stroke: untouched up to 40 % of it (the rifle is still on the eye), fully gone from 80 %, smooth in between. Reload and wall lowering: scale it to zero.
  assert.equal(faceClipWeight(1,.4),1);assert.equal(faceClipWeight(.64,.8),0);assert.equal(faceClipWeight(.64,1),0);assert.ok(faceClipWeight(1,.5)<1&&faceClipWeight(1,.5)>faceClipWeight(1,.7));
  assert.equal(faceClipWeight(1,0,1),0);assert.equal(faceClipWeight(1,0,0,1),0);assert.ok(Math.abs(faceClipWeight(1,0,.25)-.75)<1e-12);
});

test('the head clip is presentation only: 0 at the hip, the engaged ease of its full distance while the rifle comes up, exactly the full distance on the sights; the bolt keeps its own bone',()=>{
  const bolt=view.rifleMaterial.userData.m01FaceClip;
  sample(view,rig,sim,{state:'READY',aiming:false,authored:false,lite:true});assert.equal(clipDepth(),0,'no clip at the hip');
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false,lite:true});assert.equal(clipDepth(),FACE_CLIP.depth,'the full distance on the sights');assert.equal(bolt.depth,FACE_CLIP.depth);
  // 60 Hz raise from the hip: never decreasing, no step of more than 35 % of the full distance in a frame (the comb is gone within three or four frames).
  const s=fakeSim();s.clock=300;view.visual=null;view.sampleKey=null;view.update(s,'high',0);assert.equal(clipDepth(),0);
  s.player.aiming=true;let last=0,step=0;
  for(let i=0;i<24;i++){s.clock+=1/60;view.update(s,'high',0);step=Math.max(step,clipDepth()-last);assert.ok(clipDepth()>=last-1e-12,'monotone');last=clipDepth();}
  assert.equal(last,FACE_CLIP.depth);assert.ok(step<=FACE_CLIP.depth*.35,`largest step ${(step*100).toFixed(2)} cm per frame`);
  // Material: the bolt's bone index is the one in the rifle skeleton, the shader carries the clip and the bolt exemption, the cache key moved.
  const index=view.root.getObjectByName('rifle').skeleton.bones.findIndex(b=>b.name==='weapon_bolt');assert.ok(index>0);
  const probe=riflePresentationMaterial(view.root.getObjectByName('rifle').material,index),shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  probe.onBeforeCompile(shader);
  assert.equal(shader.uniforms.m01BoltBone.value,index);assert.equal(shader.uniforms.m01FaceClip,probe.userData.m01FaceClip);
  assert.match(shader.vertexShader,/vM01Bolt = abs\( skinIndex\.x - m01BoltBone \) < 0\.5/);
  assert.match(shader.fragmentShader,/if \( m01FaceClip > 0\.0 && vM01Bolt < 0\.5 && vViewPosition\.z < m01FaceClip \) discard;/);
  assert.ok(shader.fragmentShader.indexOf('#include <clipping_planes_fragment>')<shader.fragmentShader.indexOf('discard;'),'the clip comes after the clipping planes include');
  assert.equal(riflePresentationMaterial(view.root.getObjectByName('rifle').material).userData.m01FaceClip.depth,0,'without a bolt bone the clip is off (it would eat the bolt)');
  probe.dispose();
});

test('through the view model: the clip is on the sights at rest, off in the middle of a clip reload with the aim button held, and back when the bolt is closed',()=>{
  const at=(state,fraction)=>{sample(view,rig,sim,{state,fraction,aiming:true,authored:false,lite:true});return clipDepth();};
  assert.equal(at('READY',0),FACE_CLIP.depth);
  assert.equal(at('RELOAD_CLIP',.5),0,'the rifle is across the body in the middle of the reload: nothing is cut');
  assert.ok(at('RELOAD_CLIP',.99)>FACE_CLIP.depth*.99,'and the clip is back by the end of it');
  assert.equal(at('READY',0),FACE_CLIP.depth);
});

test('aimed: the top of the stock (the comb) is not in the picture, and all the stock wood fills at most 5 % of the lower-centre region, at rest and while the rifle is on the eye',()=>{
  // Fractions of the shouldered bolt cycle with the rifle still (or again) on the eye; the comb filled 27 to 33 % of the region at every one of them BEFORE.
  const rows=[['ads',pose({state:'READY',aiming:true})],...[.05,.10,.12,.15,.90,.92,.95,.97].map(f=>[`bolt-ads-${f.toFixed(2)}`,pose({state:'BOLT_CYCLE',fraction:f,aiming:true})])];
  for(const [name,pic] of rows){
    assert.ok(share(pic,PART.comb)<=.03,`${name}: the comb fills ${pct(share(pic,PART.comb))} of the lower-centre region`);
    assert.ok(share(pic,wood)<=.05,`${name}: stock and handguard wood fills ${pct(share(pic,wood))} of the lower-centre region`);
  }
  // The butt plate (steel, the dark strip BEFORE) is gone from under the sights as well: the region holds only the receiver ring and the shroud.
  assert.ok(share(rows[0][1],PART.metal)<=.06,`metal ${pct(share(rows[0][1],PART.metal))} of the region (22.1 % BEFORE)`);
});

test('during the bolt stroke the rifle is off the eye and canted and the clip is off: the stock is seen, never more than it was before R6-b (10 % of the region for the comb)',()=>{
  for(const f of [.20,.25,.30,.45,.60,.70,.80,.82,.85,.87]){
    const pic=pose({state:'BOLT_CYCLE',fraction:f,aiming:true});
    assert.ok(share(pic,PART.comb)<=.11,`bolt-ads-${f}: the comb fills ${pct(share(pic,PART.comb))} of the lower-centre region`);
  }
});

test('the aim transition and the recoil are continuous: the rifle never steps more than 2 cm in a frame, the comb never fills more than it does at the hip, no frame jumps in the wood share (BEFORE: up to 6.9 % of the region per frame; now 3.2 %)',()=>{
  const s=fakeSim();s.clock=400;view.visual=null;view.sampleKey=null;view.update(s,'high',0);
  const hip=pose({state:'READY'}),hipComb=share(hip,PART.comb),hipWood=share(hip,wood);
  const rear=()=>rig.weapon.localToWorld(new THREE.Vector3(...WZ29_VISUAL.rear));
  const run=(frames,fn)=>{let prev=null,prevWood=null,stepCm=0,jump=0,worstComb=0;
    for(let i=0;i<frames;i++){fn(i);view.update(s,'high',0);const p=rear(),pic=picture(),w=share(pic,wood);
      if(prev){stepCm=Math.max(stepCm,p.distanceTo(prev)*100);jump=Math.max(jump,Math.abs(w-prevWood));}
      worstComb=Math.max(worstComb,share(pic,PART.comb));prev=p;prevWood=w;}
    return {stepCm,jump,worstComb};};
  // Raise from the hip, then lower again.
  s.player.aiming=true;let r=run(24,()=>{s.clock+=1/60;});
  assert.ok(r.stepCm<=2,`raise: rear sight steps ${r.stepCm.toFixed(2)} cm per frame`);assert.ok(r.jump<=.045,`raise: wood share jumps ${pct(r.jump)} in a frame`);
  assert.ok(r.worstComb<=Math.max(hipComb,.03)+.02,`raise: comb ${pct(r.worstComb)} of the region at worst`);
  s.player.aiming=false;r=run(20,()=>{s.clock+=1/60;});
  assert.ok(r.stepCm<=3,`lower: rear sight steps ${r.stepCm.toFixed(2)} cm per frame`);assert.ok(r.jump<=.045,`lower: wood share jumps ${pct(r.jump)} in a frame`);
  // One shot from the shoulder, half a second at 60 Hz: the recoil kick and the bolt stroke that follows it.
  s.player.aiming=true;for(let i=0;i<24;i++){s.clock+=1/60;view.update(s,'high',0);}
  s.weapon.state='BOLT_CYCLE';s.weapon.started=(s.clock+1/60)*1000;s.weapon.until=s.weapon.started+1050;s.weapon.lastShot=s.weapon.started;s.weapon.shotCount++;
  r=run(5,()=>{s.clock+=1/60;});
  assert.ok(r.stepCm<=1.5,`recoil: rear sight steps ${r.stepCm.toFixed(2)} cm per frame`);assert.ok(r.jump<=.045,`recoil: wood share jumps ${pct(r.jump)} in a frame`);assert.ok(r.worstComb<=.03,`recoil: comb ${pct(r.worstComb)} of the region`);
  // The bolt stroke that follows takes the rifle off the eye and back (pose untouched by R6-b: its step is the same BEFORE).
  r=run(37,()=>{s.clock+=1/60;});
  assert.ok(r.stepCm<=3.2,`stroke: rear sight steps ${r.stepCm.toFixed(2)} cm per frame`);assert.ok(r.jump<=.14,`stroke: wood share jumps ${pct(r.jump)} in a frame`);
  assert.ok(hipWood>=0);
});

test('aimed: the rear sight block is in the picture (a flat block, the asset has no notch) and the front post is documented as hidden behind it',()=>{
  const pic=pose({state:'READY',aiming:true});
  // BEFORE: 104 px of 1280 x 720. A sliver above the receiver ring: the sight line grazes the top of the block, 3 mm over the ring.
  assert.ok(pixels(pic,PART.rear)>=90,`rear sight ${pixels(pic,PART.rear)} px of 1280 x 720`);
  // The front post tip is on the line, 1 mm over the top of the rear block, so the block hides the post (0 px in the rasteriser, a few pixels of its ears on screen).
  assert.ok(pixels(pic,PART.front)<=40,`front sight ${pixels(pic,PART.front)} px of 1280 x 720`);
});
