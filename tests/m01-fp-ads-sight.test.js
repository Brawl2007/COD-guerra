import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01ViewModel,fpFixture,fakeSim,HandRig,sample} from './helpers/m01-fp-hand-metrics.js';
import {classifyRifle,sightPicture,regionShare,frameShare,eyeGeometry,PART,LOWER_CENTRE} from './helpers/m01-fp-sight-picture.js';
import {WZ29_VISUAL,FACE_CLIP,adsEase,presentationPose} from '../src/render/m01-wz29-presentation.js';
import {alignmentReport} from '../tools/verification/m01-wz29-viewmodel-audit.mjs';

// R6-b: the shouldered sight picture of the kb wz.29. Deterministic, from the real rig, the real clips and the real M01ViewModel; the picture is a software
// rasterisation of what the weapon camera sees (tests/helpers/m01-fp-sight-picture.js: depth test, 0.03 m near plane, 58 degrees, 16:9), not a screenshot.
//
// BEFORE (bc6d4b0, R6-a): the eye sat 0.74 m behind the rear sight, which is 11.5 cm BEHIND the butt plate (a point no shooter's eye can reach), so the whole top
// of the stock, from the butt to the receiver, rose as a triangle under the sights: 30.6 % of the lower-centre region of the frame (3.6 % of the whole frame), and
// the bolt shroud, sitting 0.37 m in front of the eye with its top edge a few millimetres under the sight line, hid the rear sight and the front post (rear sight 104 px
// of 1280 x 720, front sight 0 px).
const characters=await fpFixture(),view=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim=fakeSim();
view.update(sim,'high',0);
const rig=new HandRig(view);
sample(view,rig,sim,{state:'READY',aiming:true,authored:false});
const classes=classifyRifle(rig);
after(()=>{view.dispose();characters.dispose();});

const clipDepth=()=>{const c=view.rifleMaterial.userData.m01FaceClip;return c.value*c.depth;};
const picture=()=>sightPicture(rig,classes,{faceClip:clipDepth()});
const stockShare=pic=>regionShare(pic,LOWER_CENTRE,PART.stock),pixels=(pic,kind)=>pic.part.reduce((n,k)=>n+(k===kind?1:0),0)*(1280*720)/(pic.cols*pic.rows);
const pose=opts=>{sample(view,rig,sim,{...opts,authored:false,lite:true});return picture();};
const pct=x=>`${(x*100).toFixed(1)} %`;

test('the alignment lock: the eye, the rear sight and the front sight are on one line through the screen centre, rest and bolt cycle, with the muzzle flash on the socket',()=>{
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false,lite:true});
  const a=alignmentReport(view);
  for(const key of ['horizontalPixels','verticalPixels','centerHorizontalPixels','centerVerticalPixels'])assert.ok(a[key]<WZ29_VISUAL.adsTolerancePixels,`${key}: ${a[key]}`);
  assert.ok(a.muzzleFlashDistance<=WZ29_VISUAL.flashToleranceMetres);
  // The rear sight sits rearDepth in front of the eye on the camera axis, the front sight further along the same axis.
  assert.ok(Math.abs(a.points.rear[2]+WZ29_VISUAL.rearDepth)<1e-9&&Math.abs(a.points.rear[0])<1e-9&&Math.abs(a.points.rear[1])<1e-9,`rear ${a.points.rear}`);
  assert.ok(a.points.front[2]<a.points.rear[2]);
  assert.ok(eyeGeometry(rig).eyeToLine<1e-9,'the eye is on the line rear sight -> front sight');
});

test('the eye is on the rifle where a shooter\'s eye is: in front of the butt plate, a cheek weld above the comb, at a plausible eye relief',()=>{
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false,lite:true});
  const g=eyeGeometry(rig);
  // BEFORE: eye relief 0.74 m, 11.5 cm behind the butt plate, not over the stock at all.
  assert.ok(g.eyeRelief>=.45&&g.eyeRelief<=.60,`eye relief ${g.eyeRelief.toFixed(3)} m behind the rear sight`);
  assert.ok(g.forwardOfButt>=.07&&g.forwardOfButt<=.28,`the eye is ${(g.forwardOfButt*100).toFixed(1)} cm in front of the butt plate`);
  assert.ok(g.aboveComb!==null&&g.aboveComb>=.02&&g.aboveComb<=.045,`the eye is ${g.aboveComb===null?'not over the stock':(g.aboveComb*100).toFixed(1)+' cm'} above the comb`);
  // The hip hold is untouched: the rear sight stays 0.74 m from the eye there.
  assert.equal(WZ29_VISUAL.hipDepth,.74);
  assert.equal(presentationPose({clock:3,lastShot:-1e9,aim:0,move:0,run:0,reload:0}).position.z+WZ29_VISUAL.hipDepth<1e-9,true);
});

test('aimed: the top of the stock fills at most 3 % of the lower-centre region, at rest and over the shouldered bolt cycle',()=>{
  const rows=[['ads',pose({state:'READY',aiming:true})],
    ...[.05,.10,.15,.20,.25,.30,.45,.60,.70,.85,.92,.97].map(f=>[`bolt-ads-${f.toFixed(2)}`,pose({state:'BOLT_CYCLE',fraction:f,aiming:true})])];
  let worst=0;
  for(const [name,pic] of rows){worst=Math.max(worst,stockShare(pic));assert.ok(stockShare(pic)<=.03,`${name}: the stock fills ${pct(stockShare(pic))} of the lower-centre region`);}
  assert.ok(worst>=0);
});

test('aimed: the rear sight and the front sight are in the picture',()=>{
  const pic=pose({state:'READY',aiming:true});
  assert.ok(pixels(pic,PART.rear)>=150,`rear sight ${pixels(pic,PART.rear)} px of 1280 x 720`);
  assert.ok(pixels(pic,PART.front)>=20,`front sight ${pixels(pic,PART.front)} px of 1280 x 720`);
});
