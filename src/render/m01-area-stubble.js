import * as THREE from 'three';
import {AREA_CELL_GLSL} from './m01-area-field.js';
import {hash01} from './m01-area-geo.js';

// Round 2 (pkg4), High tier only: short stubble / grass tufts on the ground round the player. The field shader shows its crop rows and soil grain as colour, which up close is
// flat; a few thousand tufts of three or four thin blades (no texture, no alpha: plain triangles) give the ground a silhouette and parallax where the eye can tell.
// ONE InstancedMesh, ONE draw call. The instances are a fixed random tile of 2R x 2R metres; the vertex shader wraps that tile round the camera (the camera position is a
// uniform set in onBeforeRender), so the carpet follows the player without any per-frame CPU work or allocation. Tufts shrink away towards the tile border, are not drawn
// outside the fought-over flat strip (where the drawn ground is the simulation's), and take their colour from the same crop cell as the field shader: straw on the stubble
// cells, greener on pasture, none on ploughed land. Presentation only: not solid, casts no shadow, nothing here reads or writes the simulation.
export const STUBBLE={count:3400,radius:13,bladesPerTuft:4};

/** One tuft: `bladesPerTuft` thin tapered, slightly bent blades fanned round the origin. Vertex colour is a base-to-tip gradient; normals point up (they light like the ground). */
export function buildTuftGeometry(blades=STUBBLE.bladesPerTuft){
  const position=[],color=[],normal=[],index=[];
  for(let k=0;k<blades;k++){
    const a=(k+hash01(k,3)*.6)/blades*Math.PI*2,h=.11+.1*hash01(k,4),w=.0075,lean=.035+.05*hash01(k,5),cx=Math.cos(a),cz=Math.sin(a),tx=-cz,tz=cx;
    const base=position.length/3;
    // base left, base right, tip (leaned outwards)
    for(const [bx,by,bz,shade] of [[cx*.012-tx*w,0,cz*.012-tz*w,.45],[cx*.012+tx*w,0,cz*.012+tz*w,.45],[cx*(.012+lean),h,cz*(.012+lean),1]]){
      position.push(bx,by,bz);color.push(shade,shade,shade);normal.push(0,1,0);
    }
    index.push(base,base+1,base+2);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));g.setIndex(index);return g;
}

const VERT_HEAD=`uniform vec2 uStubCam;uniform float uStubR;uniform vec4 uStubBounds;uniform float uStubGround;uniform vec2 uStubOrigin;
${AREA_CELL_GLSL}
`;
const VERT_BODY=`
vec2 sCell=vec2(instanceMatrix[3].x,instanceMatrix[3].z);
vec2 sW=uStubCam+mod(sCell-uStubCam+uStubR,2.0*uStubR)-uStubR;
float sDist=length(sW-uStubCam),sRnd=aHash(sCell*.37+3.0);
float sIn=step(uStubBounds.x,sW.x)*step(sW.x,uStubBounds.y)*step(uStubBounds.z,sW.y)*step(sW.y,uStubBounds.w);
float sH=areaCellH(sW-uStubOrigin);
// crop cell: straw (< .58), none on ploughed land (< .74), green on pasture and tubers
float sCrop=step(sH,.58)+step(.74,sH)*.8;
float sSize=sIn*sCrop*(1.0-smoothstep(.62*uStubR,uStubR,sDist))*(.55+.9*sRnd);
float sYaw=aHash(sCell+17.0)*6.2832,sc=cos(sYaw),ss=sin(sYaw);
transformed=vec3(transformed.x*sc-transformed.z*ss,transformed.y,transformed.x*ss+transformed.z*sc)*sSize;
transformed.xz+=sW-sCell;
transformed.y+=uStubGround;
#ifdef USE_COLOR
{float tr=aHash(sCell*1.31+7.0);
 vec3 straw=mix(vec3(.30,.22,.085),vec3(.38,.30,.13),tr),green=mix(vec3(.10,.14,.04),vec3(.16,.19,.06),tr);
 vColor.rgb*=sH<.58?straw:green;}
#endif
`;

/**
 * The stubble mesh. `bounds` = [minX,maxX,minZ,maxZ] where tufts may stand (the fought-over flat strip: drawn ground = simulation ground), `groundY` = that ground's height,
 * `origin` = the field's origin (as the field shader). Returns {mesh, dispose()}; the caller adds it to a scene and decides visibility (High only).
 */
export function createStubble({bounds,groundY,origin,count=STUBBLE.count,radius=STUBBLE.radius}){
  const geometry=buildTuftGeometry(),uniforms={uStubCam:{value:new THREE.Vector2()},uStubR:{value:radius},uStubBounds:{value:new THREE.Vector4(...bounds)},uStubGround:{value:groundY},uStubOrigin:{value:new THREE.Vector2(...origin)}};
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=VERT_HEAD+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n${VERT_BODY}`);
    // The blades are single triangles seen from both sides with an upward normal: the double-sided flip would turn the back faces black, so light them like the ground.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\nnormal=normalize(vNormal);\n#endif');
  };
  material.customProgramCacheKey=()=>'m01-area-stubble-v1';
  const mesh=new THREE.InstancedMesh(geometry,material,count),m=new THREE.Matrix4(),side=2*radius;
  // Instance translation = the tuft's position in the tile (x,z in [0,2R), y unused by the shader: the ground height is a uniform). Deterministic, no RNG state.
  for(let i=0;i<count;i++){m.makeTranslation(hash01(i,501)*side,0,hash01(i,502)*side);mesh.setMatrixAt(i,m);}
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.name='m01-area-stubble';
  mesh.onBeforeRender=(renderer,scene,camera)=>{uniforms.uStubCam.value.set(camera.position.x,camera.position.z);};
  return {mesh,uniforms,triangles:count*geometry.index.count/3,dispose(){mesh.dispose();geometry.dispose();material.dispose();}};
}
