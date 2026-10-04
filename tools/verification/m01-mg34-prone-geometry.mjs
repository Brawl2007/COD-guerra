// CPU verification of the real soldier + weapon hierarchy; textures are irrelevant to bone/socket transforms.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fileURLToPath} from 'node:url';
const ROOT=new URL('../../',import.meta.url);
const paths={soldier:'assets/models/provisional/m01/characters/m01_soldier_de_lod2.glb',weapon:'assets/models/provisional/m01/weapons/mg34/m01_mg34_lod2.glb',clips:'assets/models/provisional/m01/weapons/mg34-prone/m01_mg34_prone_animations.glb'};
export async function realMG34Rig(){
  const loader=new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
  const load=async path=>{const b=fs.readFileSync(new URL(path,ROOT));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
  const [soldier,weapon,animations]=await Promise.all([load(paths.soldier),load(paths.weapon),load(paths.clips)]);
  soldier.scene.getObjectByName('weapon').add(weapon.scene);const mixer=new THREE.AnimationMixer(soldier.scene);
  const sample=(name,time)=>{
    mixer.stopAllAction();const action=mixer.clipAction(animations.animations.find(c=>c.name===name)).setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.reset().play();
    mixer.setTime(time);soldier.scene.updateMatrixWorld(true);
    const point=(n,p=[0,0,0])=>new THREE.Vector3(...p).applyMatrix4(soldier.scene.getObjectByName(n).matrixWorld);
    const torso=point('hips').add(point('spine_03')).multiplyScalar(.5);
    const legs=point('calf_l').add(point('calf_r')).add(point('foot_l')).add(point('foot_r')).multiplyScalar(.25);
    return [...point('weapon',[0,.03,-.769]).toArray(),...point('eye_r').toArray(),...point('head').toArray(),...torso.toArray(),...legs.toArray()];
  };
  return {scene:soldier.scene,weaponScene:weapon.scene,mixer,sample,animations:animations.animations};
}
export async function geometryContract(){
  const rig=await realMG34Rig(),curves={};
  for(const [phase,name,end] of [['enter','mg34_prone_enter',1.9],['idle','mg34_prone_idle',0],['aim','mg34_prone_aim',0],['fire_burst','mg34_prone_fire_burst',.525],['exit','mg34_prone_exit',1.9]]){
    const rows=[];
    // Retain authored keys, refining nonlinear segments to 0.1 mm at quarter/midpoints.
    const clip=rig.animations.find(c=>c.name===name);
    const keys=[...new Set([0,end,...clip.tracks.flatMap(t=>Array.from(t.times)).filter(t=>t>0&&t<end)])].sort((a,b)=>a-b);
    const row=(t,v)=>[t,...v.map(n=>Number(n.toFixed(8)))];
    const refine=(t0,v0,t1,v1,depth=0)=>{
      const error=Math.max(...[.25,.5,.75].flatMap(f=>rig.sample(name,t0+(t1-t0)*f).map((v,i)=>Math.abs(v-(v0[i]+(v1[i]-v0[i])*f)))));
      if(error>.0001&&depth<12){const tm=(t0+t1)*.5,vm=rig.sample(name,tm);refine(t0,v0,tm,vm,depth+1);refine(tm,vm,t1,v1,depth+1);}
      else rows.push(row(t1,v1));
    };
    rows.push(row(0,rig.sample(name,0)));
    for(let i=1;i<keys.length;i++)refine(keys[i-1],rig.sample(name,keys[i-1]),keys[i],rig.sample(name,keys[i]));
    curves[phase]=rows;
  }
  return {version:1,units:'metres',forward:'-Z',interpolation:'linear; authored keys refined to 0.1 mm',tolerance:.002,socket:[0,.03,-.769],sources:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,{path:p,sha256:createHash('sha256').update(fs.readFileSync(new URL(p,ROOT))).digest('hex')}])),curves};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const data=await geometryContract();
  const target=new URL('src/world/m01-mg34-prone-geometry.json',ROOT);
  if(process.argv.includes('--write'))fs.writeFileSync(target,JSON.stringify(data)+'\n');
  else{const saved=JSON.parse(fs.readFileSync(target));if(JSON.stringify(saved)!==JSON.stringify(data))throw Error('MG34 geometry contract differs from real GLBs');console.log('MG34 real GLB geometry contract: PASS');}
}
