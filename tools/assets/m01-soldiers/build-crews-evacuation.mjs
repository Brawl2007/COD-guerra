// Optional supplemental clips. All predecessor GLBs and clip-library V2 are preserved.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {preservedRig,CHARACTER_DIR,sha256} from './motion/rig.mjs';
import {bakeClip,standingBody,mixBody,kneelBody,solve,q,v3} from './motion/library/common.mjs';
import {locomotionClips} from './motion/library/locomotion.mjs';
import {postureClips} from './motion/library/posture.mjs';
const rig=await preservedRig(),R=rig.R,clips=[],duration=1.6;
const eased=u=>u*u*(3-2*u);
for(const phase of ['pickup','putdown'])for(const role of ['carrier','patient']){
  const poseAt=u=>{const progress=eased(phase==='pickup'?u:1-u);
    if(role==='carrier'){
      const body=mixBody(kneelBody(0,{bend:30}),standingBody(0),progress);
      return solve(R,{...body,spine:[{pitch:25*(1-progress)+5},{pitch:15*(1-progress)+5},{pitch:5}],
        hands:{l:{pos:[-.22,.3+progress*.7,-.35],fdir:[0,0,-1],palm:[1,0,0],pole:[-.6,-.2,.1]},
          r:{pos:[.22,.3+progress*1.1,-.22],fdir:[0,0,-1],palm:[-1,0,0],pole:[.6,-.2,.1]}},weaponScale:0});
    }
    const rot=q.mul(q.axis([1,0,0],90+38*progress),q.axis([0,1,0],180*progress));
    const body={hips:{pos:[0,.35*(1-progress)+.02*progress,0],q:rot},spine:[{pitch:12},{pitch:10},{pitch:8}],neck:{pitch:25},head:{pitch:25},
      feet:{l:{pos:[-.12,.08,.6],rot:q.id(),pole:[-.2,0,-1]},r:{pos:[.12,.08,.6],rot:q.id(),pole:[.2,0,-1]}}};
    const W=solve(R,body).W;
    return solve(R,{...body,hands:Object.fromEntries(['l','r'].map(s=>[s,{pos:v3.add(W[`upperarm_${s}`].p,[0,-.47,0]),fdir:[0,-1,0],palm:[s==='l'?1:-1,0,0],pole:[0,0,-1]}])),weaponScale:0});
  };
  const clip=bakeClip(`carry_${phase}_${role}`,duration,30,poseAt);clip.userData={family:'carry',duration,loop:false};clips.push(clip);
}
for(const spec of [...locomotionClips(R),...postureClips(R)].filter(s=>['carry_walk','prone_enter','prone_exit','prone_idle','sapper_cover'].includes(s.name)))clips.push(spec.clip??bakeClip(spec.name,spec.duration,spec.fps,spec.poseAt));
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const bytes=Buffer.from(await new GLTFExporter().parseAsync(rig.scene,{binary:true,animations:clips,onlyVisible:false}));
const out=new URL('crews-evacuation/',CHARACTER_DIR);await mkdir(out,{recursive:true});await writeFile(new URL('m01_crews_evacuation.glb',out),bytes);
const source=await readFile(new URL('m01_soldier_pl_lod1.glb',CHARACTER_DIR));
await writeFile(new URL('manifest.json',out),JSON.stringify({version:1,file:'m01_crews_evacuation.glb',bytes:bytes.length,sha256:sha256(bytes),
  author:'COD-guerra original procedural animation, using preserved project rig and solver',license:'Original project assets; project licence pending owner decision',units:'metres',
  sourceRig:{file:'m01_soldier_pl_lod1.glb',sha256:sha256(source)},generator:'tools/assets/m01-soldiers/build-crews-evacuation.mjs',
  clips:clips.map(c=>({name:c.name,duration:c.duration,loop:['carry_walk','prone_idle','sapper_cover'].includes(c.name),rootMotion:false})),
  authority:'simulation owns transport phases/position/posture; clips contain no root-motion channel'},null,2)+'\n');
console.log(JSON.stringify({file:'m01_crews_evacuation.glb',bytes:bytes.length,clips:clips.length}));
