// R6-a numeric audit of the first-person hands/arms on the kb wz.29: real rig, real clips, real M01ViewModel, deterministic.
//   node tools/verification/m01-fp-hands-metrics.mjs [--src <tree with src/render/m01-viewmodel.js>] [--out <file.json>]
// --src lets the same audit run on an older source tree (e.g. `git archive <sha> src research | tar -x -C <dir>`) for BEFORE numbers.
import * as THREE from 'three';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;};
const src=arg('--src'),out=arg('--out');
if(src)process.env.M01_FP_SRC=resolve(src);
const {M01ViewModel,fpFixture,fakeSim,HandRig,sample,GRID}=await import('../../tests/helpers/m01-fp-hand-metrics.js');
const characters=await fpFixture(),view=new M01ViewModel(new THREE.Scene(),characters,new THREE.Texture()),sim=fakeSim();
view.update(sim,'high',0);const rig=new HandRig(view);

const rows={};
for(const [name,opts] of GRID)rows[name]=sample(view,rig,sim,{...opts,contacts:true});
const cm=v=>+(v*100).toFixed(1),deg=v=>+v.toFixed(1);
const table=Object.fromEntries(Object.entries(rows).map(([name,m])=>[name,{
  triggerGapCm:cm(m.triggerGap),palmToGripCm:cm(m.rightPalmToGrip),leftPalmToForendCm:cm(m.leftPalmToForend),handToKnobCm:cm(m.handToKnob),
  clipToHandCm:m.clipToRightHand===undefined?null:cm(m.clipToRightHand),rightDepthCm:cm(m.right.depth),rightPalmGapCm:cm(m.right.palmGap),leftDepthCm:cm(m.left.depth),leftPalmGapCm:cm(m.left.palmGap),leftTopTipCm:cm(m.leftTopTip),
  wristBendR:deg(m.wristBendR),authoredWristBendR:deg(m.authoredWristBendR),wristBendL:deg(m.wristBendL),authoredWristBendL:deg(m.authoredWristBendL),
  elbowR:deg(m.elbowR),elbowL:deg(m.elbowL),sleeveStartInViewR:m.sleeveStartInViewR,sleeveStartInViewL:m.sleeveStartInViewL,sleeveStartNearestCm:cm(m.sleeveStartNearest),rifleNearView:m.rifleNearView,stockCoveragePct:+(m.stockCoverage*100).toFixed(1),sightOcclusion:m.sightOcclusion,sightFlesh:m.sightFlesh,armCoveragePct:+(m.armCoverage*100).toFixed(1),armNearestCm:cm(m.armNearest),
}]));
if(process.argv.includes('--table'))console.table(table);
if(out){mkdirSync(dirname(resolve(out)),{recursive:true});writeFileSync(out,JSON.stringify({source:src??'working tree',units:'cm and degrees',samples:table},null,1));}
view.dispose();characters.dispose();
export {table};
