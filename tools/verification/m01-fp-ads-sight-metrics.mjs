// R6-b numeric audit of the shouldered sight picture of the kb wz.29: where the eye is on the rifle, how much of the lower-centre region the stock fills,
// whether the rear and front sights are visible, and how continuous the aim transition and the recoil are. Real rig, real clips, real M01ViewModel,
// deterministic, no browser (the software rasteriser of tests/helpers/m01-fp-sight-picture.js).
//   node tools/verification/m01-fp-ads-sight-metrics.mjs [--src <tree with src/render/m01-viewmodel.js>] [--out <file.json>] [--table]
// --src runs the same audit on an older source tree (e.g. `git archive <sha> src research | tar -x -C <dir>`) for the BEFORE numbers.
import * as THREE from 'three';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;};
const src=arg('--src'),out=arg('--out');
if(src)process.env.M01_FP_SRC=resolve(src);
const {M01ViewModel,fpFixture,fakeSim,HandRig,sample,setWeapon}=await import('../../tests/helpers/m01-fp-hand-metrics.js');
const {classifyRifle,sightPicture,regionShare,frameShare,eyeGeometry,PART,LOWER_CENTRE}=await import('../../tests/helpers/m01-fp-sight-picture.js');

export async function sightAudit(){
  const characters=await fpFixture(),view=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim=fakeSim();
  view.update(sim,'high',0);const rig=new HandRig(view);
  sample(view,rig,sim,{state:'READY',aiming:true,authored:false});const classes=classifyRifle(rig);
  // The rifle material's own head clip in metres (R6-b); absent on older trees.
  const clipDepth=()=>view.rifleMaterial?.userData?.m01FaceClip?.value??0;
  const px=(pic,kind)=>pic.part.reduce((n,k)=>n+(k===kind?1:0),0)*(1280*720)/(pic.cols*pic.rows);
  const measure=()=>{
    const pic=sightPicture(rig,classes,{faceClip:clipDepth()});
    const wood=[PART.stock,PART.comb];
    return {combLowerCentrePct:+(regionShare(pic,LOWER_CENTRE,PART.comb)*100).toFixed(2),woodLowerCentrePct:+(regionShare(pic,LOWER_CENTRE,wood)*100).toFixed(2),stockFramePct:+(frameShare(pic,wood)*100).toFixed(2),
      metalLowerCentrePct:+(regionShare(pic,LOWER_CENTRE,PART.metal)*100).toFixed(2),handsLowerCentrePct:+(regionShare(pic,LOWER_CENTRE,PART.hands)*100).toFixed(2),handsFramePct:+(frameShare(pic,PART.hands)*100).toFixed(2),sleevesFramePct:+(frameShare(pic,PART.sleeves)*100).toFixed(2),
      rearSightPx:Math.round(px(pic,PART.rear)),frontSightPx:Math.round(px(pic,PART.front)),faceClipM:+clipDepth().toFixed(3)};
  };
  const rows={};
  const pose=(name,opts)=>{sample(view,rig,sim,{...opts,authored:false,lite:true});rows[name]={...measure(),eye:eyeGeometry(rig)};};
  pose('hip',{state:'READY'});
  pose('ads',{state:'READY',aiming:true});
  for(const f of [.05,.20,.45,.70,.95])pose(`bolt-ads-${f.toFixed(2)}`,{state:'BOLT_CYCLE',fraction:f,aiming:true});
  // The aim transition, stepped at 60 Hz of mission time from the hip: stock share, and how far the rear sight moves per frame.
  const steps=[];
  {const s=fakeSim();s.clock=100;view.visual=null;view.sampleKey=null;view.update(s,'high',0);s.player.aiming=true;let prev=null;
    for(let i=0;i<=24;i++){
      s.clock+=1/60;view.update(s,'high',0);const rear=rig.weapon.localToWorld(new THREE.Vector3(0,.056,-.29)),m=measure();
      steps.push({aim:+view.visual.aim.toFixed(3),combLowerCentrePct:m.combLowerCentrePct,rearStepCm:prev?+(rear.distanceTo(prev)*100).toFixed(2):0});prev=rear;
    }}
  rows.transition=steps;
  // Recoil: one shot from the shoulder, 60 Hz for 0.5 s: stock share and the per-frame step of the rear sight.
  const recoil=[];
  {const s=fakeSim();s.player.aiming=true;s.clock=200;view.visual=null;view.sampleKey=null;view.update(s,'high',0);
    s.weapon.state='BOLT_CYCLE';s.weapon.started=(s.clock+1/60)*1000;s.weapon.until=s.weapon.started+1050;s.weapon.lastShot=s.weapon.started;s.weapon.shotCount++;
    let prev=null;
    for(let i=0;i<=30;i++){
      s.clock+=1/60;view.update(s,'high',0);const rear=rig.weapon.localToWorld(new THREE.Vector3(0,.056,-.29)),m=measure();
      recoil.push({t:+(i/60).toFixed(3),combLowerCentrePct:m.combLowerCentrePct,rearStepCm:prev?+(rear.distanceTo(prev)*100).toFixed(2):0});prev=rear;
    }}
  rows.recoil=recoil;
  view.dispose();characters.dispose();
  return rows;
}
const rows=await sightAudit();
if(process.argv.includes('--table')){
  console.table(Object.fromEntries(Object.entries(rows).filter(([,v])=>!Array.isArray(v)).map(([k,v])=>[k,{...v,eye:undefined,eyeRelief:+v.eye.eyeRelief.toFixed(3),eyeToLine:+v.eye.eyeToLine.toExponential(1),forwardOfButt:+v.eye.forwardOfButt.toFixed(3),aboveComb:v.eye.aboveComb===null?null:+v.eye.aboveComb.toFixed(4)}])));
  console.log('transition',JSON.stringify(rows.transition));console.log('recoil',JSON.stringify(rows.recoil));
}
if(out){mkdirSync(dirname(resolve(out)),{recursive:true});writeFileSync(out,JSON.stringify({source:src??'working tree',frame:'1280x720 pixel counts from a 640x360 software raster; lower centre = |x|<=0.25, -1<=y<=-0.05 (ndc)',rows},null,1));}
