// Original in-place backward drag for the existing M01 rig. Uses only repository data and Three.js.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GAME_BONES} from '../m01-soldiers/src/human.mjs';
import {rigInfo,solve,q} from '../m01-soldiers/src/pose.mjs';
import {v3,smoothstep} from '../m01-soldiers/src/meshops.mjs';

const output=new URL('../../../assets/models/provisional/m01/characters/',import.meta.url);
const input=await readFile(new URL('m01_soldier_pl_lod1.glb',output));
const json=JSON.parse(input.subarray(20,20+input.readUInt32LE(12))),J={},bones=new Map(),scene=new THREE.Scene();
for(const b of GAME_BONES){
  const node=json.nodes.find(n=>n.name===b.name);if(!node)throw new Error(`Missing ${b.name}`);
  if(node.rotation?.some((v,i)=>Math.abs(v-(i===3?1:0))>1e-6))throw new Error('The solver requires the documented world-aligned bind axes');
  const offset=node.translation??[0,0,0];J[b.name]=b.parent?v3.add(J[b.parent],offset):offset;
  const bone=new THREE.Bone();bone.name=b.name;bone.position.fromArray(offset);bones.set(b.name,bone);
  if(b.parent)bones.get(b.parent).add(bone);else scene.add(bone);
}
const R=rigInfo(J),duration=1.4,FPS=30,times=Array.from({length:43},(_,i)=>i/FPS),poses=[];
for(const t of times){
  const u=t/duration,phase=u*Math.PI*2,bob=.006*Math.sin(phase*2),feet={};
  for(const s of ['l','r']){
    const ph=(u+(s==='r'?.5:0))%1,swing=ph<.5;
    const z=swing?-.23+.46*smoothstep(0,.5,ph):.23-.46*(ph-.5)/.5;
    feet[s]={pos:[s==='l'?-.16:.16,.072+(swing?.055*Math.sin(ph*Math.PI*2):0),z],rot:q.id(),pole:[s==='l'?-.2:.2,0,-1]};
  }
  const body={hips:{pos:[0,.60+bob,.09],rot:{pitch:16}},spine:[{pitch:14},{pitch:14},{pitch:10}],neck:{pitch:18},head:{pitch:14},feet,
    hands:{l:{pos:[-.18,.29,-.40],fdir:[0,-.4,-1],palm:[1,0,0],pole:[-.6,-.3,.3]},
      r:{pos:[.18,.29,-.40],fdir:[0,-.4,-1],palm:[-1,0,0],pole:[.6,-.3,.3]}},
    fingers:{l:{curl:.75,thumb:.65},r:{curl:.75,thumb:.65}},weaponScale:0};
  poses.push(solve(R,body));
}
const tracks=[];
for(const b of GAME_BONES){
  const values=poses.map(p=>p.local[b.name]??q.id());
  for(let i=1;i<values.length;i++)if(values[i].reduce((sum,v,k)=>sum+v*values[i-1][k],0)<0)values[i]=values[i].map(v=>-v);
  tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`,times,values.flat()));
  const positions=poses.map(p=>p.trans[b.name]);
  if(positions.every(Boolean))tracks.push(new THREE.VectorKeyframeTrack(`${b.name}.position`,times,positions.flat()));
}
for(const name of ['weapon','weapon_clip'])tracks.push(new THREE.VectorKeyframeTrack(`${name}.scale`,[0,duration],[0,0,0,0,0,0],THREE.InterpolateDiscrete));
const clip=new THREE.AnimationClip('drag_wounded',duration,tracks);
// GLTFExporter needs the browser FileReader API for Blob buffers, without requiring any DOM or texture library.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};
scene.userData={units:'metres',forward:'-Z',author:'COD Guerra original procedural animation',loop:true,speed_mps:.65};
const buffer=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[clip],onlyVisible:false});
await mkdir(output,{recursive:true});await writeFile(new URL('m01_station_animations.glb',output),Buffer.from(buffer));
await writeFile(new URL('station-animations.manifest.json',output),JSON.stringify({
  file:'m01_station_animations.glb',bytes:buffer.byteLength,sha256:createHash('sha256').update(Buffer.from(buffer)).digest('hex'),
  sourceRig:'m01_soldier_pl_lod1.glb',sourceRigSHA256:createHash('sha256').update(input).digest('hex'),
  units:'metres',forward:'-Z',clips:[{name:'drag_wounded',duration,fps:FPS,loop:true,speed_mps:.65}],
  author:'Original COD Guerra procedural clip; solver and rig from the preserved Claude M01 kit',
  note:'Presentation only. Movement, injury, carrier and delivery are decided by M01Simulation. Original project licence pending owner decision.'
},null,2)+'\n');
console.log(JSON.stringify({clip:clip.name,frames:times.length,bytes:buffer.byteLength}));
