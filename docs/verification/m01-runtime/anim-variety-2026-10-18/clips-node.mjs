// Loads the animation-only GLBs the way the browser does (GLTFLoader.parse), for tools/measure.mjs. Not shipped, not imported by src/.
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const ROOT=new URL('../../../../',import.meta.url);
const DIR=new URL('assets/models/provisional/m01/characters/',ROOT).pathname;
export const PACKS={
 base:'m01_soldier_animations.glb',
 motion:'motion-clips-v1/m01_soldier_motion_clips.glb',
 station:'m01_station_animations.glb',
 stationTr:'station-drag-transitions/m01_station_drag_transitions.glb',
 crews:'crews-evacuation/m01_crews_evacuation.glb',
 mg34:'../weapons/mg34/m01_mg34_animations.glb',
 mg34p:'../weapons/mg34-prone/m01_mg34_prone_animations.glb',
 ckm:'../weapons/ckm_wz30/m01_ckm_wz30_animations.glb',
 lib:'clip-library-v2/m01_soldier_clip_library_v2.glb'};
export async function loadPack(key){
  const buf=fs.readFileSync(DIR+PACKS[key]);
  const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
  const gltf=await new Promise((res,rej)=>new GLTFLoader().parse(ab,'',res,rej));
  return gltf.animations;
}
