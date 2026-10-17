import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Characters} from '../../src/render/m01-characters.js';

// Real production GLBs (soldiers LOD0..2, animation libraries) parsed on the CPU, no textures. Used by the T37 IK tests.
const parse=async path=>{
  const b=readFileSync(new URL('../../assets/models/provisional/m01/'+path,import.meta.url));
  const loader=new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
  return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
};
const CLIP_FILES=['characters/m01_soldier_animations.glb','characters/motion-clips-v1/m01_soldier_motion_clips.glb','characters/m01_station_animations.glb',
  'characters/station-drag-transitions/m01_station_drag_transitions.glb','characters/crews-evacuation/m01_crews_evacuation.glb'];
let cache=null;
export const loadIkAssets=()=>cache??=(async()=>{
  const sources=new Map(),clips=new Map();
  await Promise.all([0,1,2].flatMap(lod=>['pl','de'].map(async n=>sources.set(`${n}:${lod}`,await parse(`characters/m01_soldier_${n}_lod${lod}.glb`)))));
  for(const f of CLIP_FILES)for(const c of (await parse(f)).animations)clips.set(c.name,c);
  return {sources,clips};
})();
/** M01Characters wired with the real soldier GLBs and clip libraries (no network). */
export async function createIkCharacters(options={}){
  const {sources,clips}=await loadIkAssets();
  const c=new M01Characters(new THREE.Scene(),{visualVariation:false,debug:false,...options});
  for(const [k,v] of sources)c.sources.set(k,v);
  for(const [k,v] of clips)c.clips.set(k,v);
  return c;
}
/** World-space snapshot of every bone (local + world matrices) of an instance, for exact comparisons. */
export function boneSnapshot(inst){
  inst.root.updateMatrixWorld(true);
  const out=[];
  inst.root.traverse(n=>{if(n.isBone)out.push([n.name,n.position.toArray(),n.quaternion.toArray(),n.matrixWorld.toArray()]);});
  return out;
}
