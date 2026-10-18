import * as THREE from 'three';
import {LOD_BAYER_GLSL,LOD_FADE_VALUE_GLSL_BODY} from './m01-lod-dither.js';
// The GLB material/alpha map remains the source; these clones add only presentation wind, batching and the T43 per-instance LOD dither
// (instanceFade: 1 = resting, 0..1 incoming, -1..0 outgoing; see encodeInstanceFade in m01-lod-policy.js).
export function vegetationKitMaterial(source,{ground=false,wood=false}={}){
 const material=source.clone(),uniforms={m01Time:{value:0}};material.userData.m01Vegetation=uniforms;material.vertexColors=false;
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=`attribute float _wind;attribute float kitSpecies;attribute float instanceSpecies;attribute float instancePhysical;attribute float instanceFade;uniform float m01Time;varying float vKitKeep;varying float vKitDistance;varying float vKitFade;\n`+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vKitFade=instanceFade;
 vec3 kitRoot=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
 vKitDistance=distance(kitRoot.xz,cameraPosition.xz);
 vKitKeep=abs(kitSpecies-instanceSpecies)<.25?1.:0.;
 ${wood?'vKitKeep*=1.-instancePhysical;':''}
 float kitPhase=dot(kitRoot.xz,vec2(.23,.17))+m01Time*1.7;
 transformed.xz+=vec2(sin(kitPhase+position.y*2.),cos(kitPhase*.83))*_wind*${ground?'.075':'.022'};
 if(vKitKeep<.5${ground?'||vKitDistance>=40.':''})transformed=vec3(0.);`);
 shader.fragmentShader='varying float vKitKeep;varying float vKitDistance;varying float vKitFade;\n'+LOD_BAYER_GLSL+shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
 if(vKitKeep<.5${ground?'||vKitDistance>=40.':''})discard;
 ${LOD_FADE_VALUE_GLSL_BODY('vKitFade')} ${ground?'diffuseColor.a*=1.-smoothstep(34.,40.,vKitDistance);if(diffuseColor.a<.42)discard;':''}`);
 };material.customProgramCacheKey=()=>`m01-vegetation-kit-v3:${ground}:${wood}`;return material;
}
