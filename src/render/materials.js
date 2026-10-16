import * as THREE from 'three';
import atlasManifest from '../../assets/textures/m01/atlas/materials.manifest.json' with { type: 'json' };
import { assetUrl } from '../assets/asset-manager.js';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, MeshStandardMaterial } from 'three';

// Original procedural surfaces, generated once. No external or game-extracted textures.
export function surface(kind,color){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  let seed=347;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<5000;i++){
    ctx.fillStyle=`rgba(${random()>.5?'255,242,215':'20,18,13'},${random()*.12})`;
    ctx.fillRect(random()*256,random()*256,1+random()*3,1+random()*3);
  }
  if(kind==='brick'||kind==='stone'){
    const height=kind==='brick'?32:64,width=kind==='brick'?64:96;
    ctx.strokeStyle='rgba(35,31,26,.42)';ctx.lineWidth=3;
    for(let row=0;row<256/height;row++){
      ctx.beginPath();ctx.moveTo(0,row*height);ctx.lineTo(256,row*height);ctx.stroke();
      for(let col=-1;col<5;col++){
        const x=col*width+(row%2)*width/2;
        ctx.beginPath();ctx.moveTo(x,row*height);ctx.lineTo(x,(row+1)*height);ctx.stroke();
      }
    }
  }
  if(kind==='wood')for(let x=0;x<256;x+=5){ctx.fillStyle='rgba(36,21,11,.15)';ctx.fillRect(x,0,1,256);}
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.wrapS=map.wrapT=RepeatWrapping;
  return new MeshStandardMaterial({color:0xffffff,map,roughness:kind==='metal'?.48:.95,metalness:kind==='metal'?.7:0});
}

// T09 opt-in shared atlas. Existing surface() consumers retain their exact procedural behavior.
// One library owns the three GPU textures and all created materials; callers never dispose shared maps.
const freezeTree = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freezeTree); Object.freeze(value); } return value; };
export const M01_MATERIAL_MANIFEST = freezeTree(atlasManifest);
export const M01_MATERIAL_REGISTRY = Object.freeze(Object.fromEntries(atlasManifest.materials.map(material => [material.id, material])));
export function m01MaterialDescriptor(id) {
  const descriptor = M01_MATERIAL_REGISTRY[id];
  if (!descriptor) throw new RangeError(`Unknown M01 material: ${id}`);
  return descriptor;
}
export class M01MaterialLibrary {
  static async load({ quality = 'high', load = async url => {
    const response = await fetch(url); if (!response.ok) throw new Error(`${response.status} ${url}`);
    return createImageBitmap(await response.blob(), { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  } } = {}) {
    const library = new M01MaterialLibrary(quality), failures = [];
    await Promise.all(atlasManifest.files.filter(file => file.tier === library.tier).map(async file => {
      try {
        const image = await load(assetUrl('assets/textures/m01/atlas/' + file.file)), texture = new THREE.Texture(image);
        texture.colorSpace = file.colorSpace === 'sRGB' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.flipY = false; texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true; texture.needsUpdate = true; library.maps[file.role] = texture;
      } catch (error) { failures.push(`${file.file}: ${error.message}`); }
    }));
    if (failures.length) { library.dispose(); throw new Error(failures.sort().join('; ')); }
    return library;
  }
  constructor(quality) { this.tier = quality === 'low' ? 'low' : 'high'; this.maps = {}; this.materials = new Set(); this.disposed = false; }
  createMaterial(id) {
    if (this.disposed) throw new Error('M01 material library disposed');
    const descriptor = m01MaterialDescriptor(id), maps = this.maps;
    if (!maps.albedo || !maps.normal || !maps.orm) throw new Error('M01 atlas is not loaded');
    const material = new THREE.MeshStandardMaterial({ map: maps.albedo, normalMap: maps.normal,
      aoMap: maps.orm, roughnessMap: maps.orm, metalnessMap: maps.orm, roughness: 1, metalness: 1 });
    material.userData.m01Atlas = { id, tier: this.tier, tileMetres: descriptor.tileMetres };
    const uv = new THREE.Vector4(...descriptor.uv), gutter = this.tier === 'low' ? 2 : 4, size = this.tier === 'low' ? 512 : 1024;
    material.onBeforeCompile = shader => {
      shader.uniforms.m01AtlasCell = { value: uv }; shader.uniforms.m01AtlasMaxGradient = { value: gutter / size };
      shader.fragmentShader = `uniform vec4 m01AtlasCell; uniform float m01AtlasMaxGradient;
        vec4 m01AtlasSample(sampler2D tex, vec2 uv){
          vec2 p=m01AtlasCell.xy+fract(uv)*m01AtlasCell.zw;
          vec2 dx=dFdx(uv)*m01AtlasCell.zw,dy=dFdy(uv)*m01AtlasCell.zw;
          // Cap footprint at gutter width: a deep whole-atlas mip would mix unrelated materials.
          float footprint=max(max(length(dx),length(dy)),1e-8);
          float cap=min(1.0,m01AtlasMaxGradient/footprint);
          return textureGrad(tex,p,dx*cap,dy*cap);
        }\n` + shader.fragmentShader;
      for (const name of ['map_fragment', 'normal_fragment_maps', 'roughnessmap_fragment', 'metalnessmap_fragment', 'aomap_fragment']) {
        const chunk = THREE.ShaderChunk[name].replace(/texture2D\(\s*(map|normalMap|roughnessMap|metalnessMap|aoMap)\s*,\s*(v\w+Uv)\s*\)/g, 'm01AtlasSample($1, $2)');
        shader.fragmentShader = shader.fragmentShader.replace(`#include <${name}>`, chunk);
      }
    };
    material.customProgramCacheKey = () => 'm01-shared-atlas-v1';
    this.materials.add(material); return material;
  }
  get diagnostics() {
    const files = atlasManifest.files.filter(file => file.tier === this.tier);
    return { tier: this.tier, loaded: !this.disposed && Object.keys(this.maps).length === 3, textures: Object.keys(this.maps).length,
      materials: this.materials.size, decodedBytes: this.disposed ? 0 : files.reduce((n, file) => n + file.decodedBytes, 0) };
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    for (const material of this.materials) material.dispose(); this.materials.clear();
    for (const texture of Object.values(this.maps)) { texture.dispose(); texture.image?.close?.(); } this.maps = {};
  }
}
