import * as THREE from 'three';
import {LOD_BAYER_GLSL,LOD_FADE_VALUE_GLSL_BODY} from './m01-lod-dither.js';
import manifest from '../../assets/models/provisional/m01/m01-bridges/materials/manifest.json' with {type:'json'};
export const M01_BRIDGE_MATERIAL_MANIFEST=manifest;
export function bridgeFamily(mesh,source){
 const name=mesh.userData.m01SourceMaterial??source.name;
 const slots={steel_painted:'painted-steel',steel_rail:'rail',brick_red:'brick',stone_masonry:'stone',timber:'timber',gate_timber_iron:'timber',road_surface:'road',rubble_mixed:'soot'};
 if(slots[name])return slots[name];
 if(/_courses|polish|plinth|tower-base/.test(mesh.name))return 'stone';
 if(/_(rail|fishplate)$/.test(mesh.name))return 'rail';
 if(/_timber$/.test(mesh.name))return 'timber';
 if(/_(steel|rivet)$/.test(mesh.name))return 'painted-steel';
 return null;
}
// T43 slice 5: screen-door dither for the detailed-truss <-> impostor-card crossfade. One shared float uniform per material, written per mesh
// in onBeforeRender (see M01BridgeFinishRuntime.observe) with the single-float role+progress encoding of encodeInstanceFade():
// 1 = resting (keeps every pixel), 0..1 incoming, -1..0 outgoing. No blending, no transparency sorting, depthWrite unchanged.
// Wraps whatever onBeforeCompile / cache key the material already has; call it last.
export function bridgeFadeDither(material){
 const fade={value:1},previous=material.onBeforeCompile,baseKey=typeof material.customProgramCacheKey==='function'?material.customProgramCacheKey():'';
 material.userData.m01BridgeFade=fade;
 material.onBeforeCompile=(shader,renderer)=>{
  if(typeof previous==='function')previous.call(material,shader,renderer);
  shader.uniforms.uBridgeFade=fade;
  shader.fragmentShader=shader.fragmentShader
   .replace(/void\s+main\s*\(\s*\)\s*\{/,m=>`uniform float uBridgeFade;\n${LOD_BAYER_GLSL}${m}`)
   .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+LOD_FADE_VALUE_GLSL_BODY('uBridgeFade'));
 };
 material.customProgramCacheKey=()=>`${baseKey}:m01-bridge-fade-v1`;
 return fade;
}
// Wrap the complete inherited shader, including T31's contact discard and original cache key.
// World-metre sampling supplies scale for baked GLB shapes and transformed instances without touching UV/accessor bytes.
export function bridgeMappedMaterial(source,family,maps){
 const material=source.clone(),compile=source.onBeforeCompile,key=source.customProgramCacheKey;
 material.userData={...source.userData,m01BridgeFamily:family,m01BridgeTileMetres:manifest.materials[family].tileMetres};material.color.setRGB(1,1,1);material.map=maps.albedo;material.normalMap=maps.normal;material.bumpMap=null;material.aoMap=material.roughnessMap=material.metalnessMap=maps.orm;material.metalness=material.roughness=1;
 material.onBeforeCompile=shader=>{
  // The shared ground shader is deliberately not inherited by the existing road deck: it samples terrain masks and wet-bank roughness. Other families retain the complete source hook, including T31 contact discard.
  // Reserve the normal chunk before the inherited surface hook replaces it with its albedo-derived bump.
  // Contact/discard and weathering still compile; only the old perturbation is superseded.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','/* M01_BRIDGE_NORMAL */');
  if(family!=='road')compile.call(material,shader);
  shader.vertexShader='varying vec3 vM01BridgeMetres;\n'+shader.vertexShader.replace('#include <project_vertex>',`vec4 bridgePosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
 bridgePosition=instanceMatrix*bridgePosition;
#endif
 vM01BridgeMetres=(modelMatrix*bridgePosition).xyz;
#include <project_vertex>`);
  shader.fragmentShader=`varying vec3 vM01BridgeMetres;
vec3 bridgeWeights(){vec3 n=abs(cross(dFdx(vM01BridgeMetres),dFdy(vM01BridgeMetres)));n=pow(normalize(n),vec3(6.));return n/max(.00001,n.x+n.y+n.z);}
vec2 bridgeUv(){vec3 p=vM01BridgeMetres/${manifest.materials[family].tileMetres.toFixed(1)},w=bridgeWeights();return w.y>=max(w.x,w.z)?p.xz:w.x>=w.z?p.zy:p.xy;}
vec4 bridgeSample(sampler2D tex){vec3 p=vM01BridgeMetres/${manifest.materials[family].tileMetres.toFixed(1)},w=bridgeWeights();return texture2D(tex,p.zy)*w.x+texture2D(tex,p.xz)*w.y+texture2D(tex,p.xy)*w.z;}
`+shader.fragmentShader;
  // Legacy opt-in bridge weathering uses artColor, and contact clones wrap that hook. Its colour sampling consumes the new map.
  for(const s of ['texture2D(map,uv)','texture2D(map,artUV.zy)','texture2D(map,artUV.xz)','texture2D(map,artUV.xy)'])shader.fragmentShader=shader.fragmentShader.split(s).join('bridgeSample(map)');
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','bridgeSample(map)'));
  for(const chunk of ['roughnessmap_fragment','metalnessmap_fragment','aomap_fragment'])shader.fragmentShader=shader.fragmentShader.replace(`#include <${chunk}>`,THREE.ShaderChunk[chunk].replace(/texture2D\( (roughnessMap|metalnessMap|aoMap), v\w+Uv \)/g,'bridgeSample($1)'));
  // The derivative tangent frame is built from metre-space projection, so shape UVs cannot stretch the authored normal.
  shader.fragmentShader=shader.fragmentShader.replace('/* M01_BRIDGE_NORMAL */',`vec3 bridgeNormal=texture2D(normalMap,bridgeUv()).xyz*2.-1.;bridgeNormal.xy*=normalScale;
 mat3 bridgeFrame=getTangentFrame(-vViewPosition,normal,bridgeUv());
#ifdef DOUBLE_SIDED
 bridgeFrame[0]*=faceDirection;bridgeFrame[1]*=faceDirection;
#endif
 normal=normalize(bridgeFrame*bridgeNormal);`);
 };
 material.customProgramCacheKey=()=>`${key.call(source)}:m01-bridge-metre-v1:${family}`;bridgeFadeDither(material);material.needsUpdate=true;return material;
}
export async function loadBridgeTexture(url,{signal}={}){
 const response=await fetch(url,{signal});if(!response.ok)throw Error(`Bridge texture HTTP ${response.status}`);
 const bitmap=await createImageBitmap(await response.blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'}),texture=new THREE.Texture(bitmap);texture.flipY=false;texture.needsUpdate=true;return {texture,bitmap};
}
export function configureBridgeTexture(resource,role){const texture=resource.texture;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=role==='albedo'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.anisotropy=2;texture.flipY=false;texture.needsUpdate=true;}
