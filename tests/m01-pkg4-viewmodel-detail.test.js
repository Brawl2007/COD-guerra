import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01ViewModel,fpFixture,fakeSim,HandRig,sample} from './helpers/m01-fp-hand-metrics.js';
import {WZ29_VISUAL} from '../src/render/m01-wz29-presentation.js';
import {WZ29_SIGHTS,REAR_BLOCK,leafGeometry,postGeometry,rearBlockTriangles,bindOrigin} from '../src/render/m01-wz29-sights.js';
import {FINGER_DETAIL} from '../src/render/m01-fp-fingers.js';
import {alignmentReport} from '../tools/verification/m01-wz29-viewmodel-audit.mjs';

// pkg4 (2026-11-04): the notched rear sight, the front post and the finer hands of the first-person kb wz.29. Deterministic, real rig and clips, no browser.
const characters=await fpFixture(),view=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim=fakeSim();
view.update(sim,'high',0);
const rig=new HandRig(view);
after(()=>{view.dispose();characters.dispose();});

test('the GLB rear block is replaced, not stacked: 80 triangles leave the rifle, three sight meshes ride the weapon bone, the GLB geometry itself is untouched',()=>{
  const rifle=view.root.getObjectByName('rifle'),source=characters.sources.get('fp:0').scene.getObjectByName('rifle');
  assert.equal(source.geometry.index.count/3,1414,'the shared GLB rifle is never edited');assert.equal(rifle.geometry.index.count/3,1414-80);
  assert.notEqual(rifle.geometry,source.geometry);
  assert.equal(rearBlockTriangles(rifle.geometry,bindOrigin(rifle,'weapon')).length,0,'no triangle of the flat block is left');
  assert.equal(rearBlockTriangles(source.geometry,bindOrigin(source,'weapon')).length,80);
  const weapon=view.root.getObjectByName('weapon');
  for(const name of ['wz29_rear_base','wz29_rear_leaf','wz29_front_post'])assert.equal(weapon.getObjectByName(name)?.parent,weapon,name);
});

test('the sight geometry stays on the ADS landmarks: the notch is centred on the rear landmark, the post tip is the front landmark, nothing sits higher than the leaf',()=>{
  const {leaf,post,base}=WZ29_SIGHTS;
  assert.equal(leaf.z,WZ29_VISUAL.rear[2]);assert.equal(post.z,WZ29_VISUAL.front[2]);assert.equal(post.tip,WZ29_VISUAL.front[1],'post tip = front landmark height');
  // the line of sight (eye, rear landmark, front landmark) passes through the open notch: above its bottom, below the shoulders
  assert.ok(leaf.notchBottom<WZ29_VISUAL.rear[1]-.003&&WZ29_VISUAL.rear[1]<leaf.shoulder-.005,'the sight line is inside the notch');
  assert.ok(leaf.notchHalf*2>=.005,'the notch is at least 5 mm wide');assert.ok(base.y1<=leaf.notchBottom,'the base does not close the notch');
  // symmetric about x = 0
  for(const g of [leafGeometry(),postGeometry()]){g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox.min.x+g.boundingBox.max.x)<1e-6);assert.ok(g.index.count/3<=100);}
  const post3=postGeometry();post3.computeBoundingBox();assert.ok(Math.abs(post3.boundingBox.max.y-post.tip)<1e-6);
  // the removed block lay under the old line of sight: its top was the only thing it offered
  assert.ok(REAR_BLOCK.y1>WZ29_VISUAL.rear[1]-.002);
  // and the ADS alignment itself (eye, rear, front on one line through the screen centre) is the existing lock
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false,lite:true});
  const a=alignmentReport(view);for(const key of ['horizontalPixels','verticalPixels','centerHorizontalPixels','centerVerticalPixels'])assert.ok(a[key]<WZ29_VISUAL.adsTolerancePixels,`${key}: ${a[key]}`);
});

test('hands: finer standing mesh (ten sides, rounded tips, smooth normals) on the same bones; the original low-triangle hands stay for carry',()=>{
  const hands=view.root.getObjectByName('fp_hands'),carry=view.root.getObjectByName('fp_hands_carry'),g=hands.geometry;
  assert.ok(hands.isSkinnedMesh&&carry?.isSkinnedMesh&&hands.skeleton===carry.skeleton);
  assert.equal(carry.geometry.index.count/3,1028,'the GLB hands are untouched');assert.equal(carry.visible,false);assert.equal(hands.visible,true);
  assert.equal(FINGER_DETAIL.radial,10);const triangles=g.index.count/3;assert.ok(triangles>2000&&triangles<=3400,`${triangles} triangles`);
  // every vertex is skinned to one bone of the hand, weight 1, and normals are unit and present (smooth shading)
  const names=hands.skeleton.bones.map(b=>b.name),skin=g.getAttribute('skinIndex'),weight=g.getAttribute('skinWeight'),normal=g.getAttribute('normal');
  for(let i=0;i<skin.count;i+=7){assert.match(names[skin.getX(i)],/^(hand|thumb|index|middle|ring|pinky)_/);assert.equal(weight.getX(i),1);assert.ok(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-4);}
  // the fingers (thirty phalanges) are all there: each bone of the five fingers of both hands owns vertices
  const owned=new Set();for(let i=0;i<skin.count;i++)owned.add(names[skin.getX(i)]);
  for(const side of ['l','r'])for(const f of ['thumb','index','middle','ring','pinky'])for(const k of [1,2,3])assert.ok(owned.has(`${f}_0${k}_${side}`),`${f}_0${k}_${side}`);
  // nothing of the hands is closer than the near plane in the shouldered pose and the carry budget is still the GLB's (checked by m01-fp-arms.test.js)
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false,lite:true});
  const pos=new Float32Array(g.getAttribute('position').count*3);rig.skinned(hands,pos,'view');let maxZ=-Infinity;for(let i=0;i<pos.length;i+=3)maxZ=Math.max(maxZ,pos[i+2]);
  assert.ok(maxZ<-.03,`nearest hand vertex z ${maxZ}`);
});

test('disposal: the geometry built in code is released with the view model and rebuilt with the rig',()=>{
  const v=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture());v.update(sim,'high',0);
  let disposed=0;for(const g of [v.rifleGeometry,v.handGeometry,...v.sights.geometries])g.addEventListener('dispose',()=>disposed++);
  const count=v.sights.geometries.length+2;v.dispose();assert.equal(disposed,count);assert.equal(v.sights,null);
});
