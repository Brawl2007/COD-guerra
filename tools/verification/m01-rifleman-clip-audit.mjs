import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const CLIP_FILE='assets/models/provisional/m01/characters/m01_soldier_animations.glb';
export async function loadRig(){
  const b=readFileSync(new URL('../../'+CLIP_FILE,import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
}
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const rounded=x=>Number(x.toFixed(6));
export async function measureClips(){
  const rig=await loadRig(),mixer=new THREE.AnimationMixer(rig.scene),hz=240,clips={};
  for(const name of ['standing_idle','walk','run']){
    mixer.stopAllAction();const clip=rig.animations.find(c=>c.name===name),action=mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    const frames=Math.ceil(clip.duration*hz),samples=[];
    for(let i=0;i<=frames;i++){
      const t=i*clip.duration/frames;action.reset().play();mixer.setTime(t);rig.scene.updateMatrixWorld(true);
      const p=n=>rig.scene.getObjectByName(n).getWorldPosition(new THREE.Vector3()).toArray();
      samples.push({t,root:p('root'),left:p('foot_l'),right:p('foot_r')});
    }
    const contacts={},slopes=[],displacement={};
    for(const side of ['left','right']){
      const minY=Math.min(...samples.map(s=>s[side][1])),maxY=Math.max(...samples.map(s=>s[side][1]));
      const zs=samples.map(s=>s[side][2]);displacement[side]={foreAftRangeM:rounded(Math.max(...zs)-Math.min(...zs)),verticalRangeM:rounded(maxY-minY)};
      // Low ankle and backward relative motion identify flat support; excludes toe-off and swing.
      const windows=[];let start=null;
      for(let i=0;i<samples.length-1;i++){
        const a=samples[i],b=samples[i+1],velocity=(b[side][2]-a[side][2])/(b.t-a.t);
        const plant=a[side][1]<=minY+.015&&b[side][1]<=minY+.015&&(name==='standing_idle'||velocity>.2);
        if(plant){if(start===null)start=i;if(name!=='standing_idle')slopes.push(velocity);}
        if(start!==null&&(!plant||i===samples.length-2)){
          const end=plant?i+1:i;if(samples[end].t-samples[start].t>.025)windows.push({startS:rounded(samples[start].t),endS:rounded(samples[end].t),sampleFrames:[start,end]});start=null;
        }
      }
      contacts[side]=windows;
    }
    const root=samples[0].root,rootRange=Math.max(...samples.map(s=>Math.hypot(...s.root.map((v,i)=>v-root[i]))));
    clips[name]={durationS:rounded(clip.duration),sampleHz:hz,sourceKeyframes:Math.max(...clip.tracks.map(t=>t.times.length)),rootDisplacementM:rounded(rootRange),inPlace:rootRange<1e-6,
      cycleFrequencyHz:rounded(1/clip.duration),cadenceStepsPerMinute:name==='standing_idle'?0:rounded(120/clip.duration),contacts,displacement,
      nominalSpeedMps:name==='standing_idle'?0:rounded(median(slopes)),supportVelocityRangeMps:name==='standing_idle'?[0,0]:[rounded(Math.min(...slopes)),rounded(Math.max(...slopes))]};
  }
  mixer.stopAllAction();mixer.uncacheRoot(rig.scene);
  return {asset:CLIP_FILE,sha256:createHash('sha256').update(readFileSync(new URL('../../'+CLIP_FILE,import.meta.url))).digest('hex'),
    method:'240 Hz Three.js AnimationMixer; ankle <= minY + 15 mm with positive local Z velocity > 0.2 m/s. Median support velocity calibrates in-place nominal speed. Foot origin proxy; excludes toe-off; not boot sole/IK.',clips};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=await measureClips();if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
