import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const base=new URL('../../',import.meta.url);
// Node verification decodes the actual rig/mesh/clip accessors, without a browser image decoder.
export async function nodeGLB(path){
  const b=readFileSync(new URL(path,base)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
  delete j.images;delete j.textures;delete j.samplers;
  for(const m of j.materials??[]){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
  j.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');
  globalThis.ProgressEvent??=class{constructor(type,properties){Object.assign(this,properties);}};
  return new GLTFLoader().parseAsync(JSON.stringify(j),'');
}
export async function nodeCharacterAssets(){
  const sources=new Map(),clips=new Map(),dir='assets/models/provisional/m01/characters/';
  for(const nation of ['pl','de'])for(const lod of [0,1,2])sources.set(`${nation}:${lod}`,await nodeGLB(`${dir}m01_soldier_${nation}_lod${lod}.glb`));
  for(const file of ['m01_soldier_animations.glb','m01_station_animations.glb','station-drag-transitions/m01_station_drag_transitions.glb'])for(const clip of (await nodeGLB(dir+file)).animations)clips.set(clip.name,clip);
  return {sources,clips};
}
