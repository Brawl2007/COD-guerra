import * as THREE from 'three';
import {smooth01} from './m01-area-geo.js';

// VII-a visual package: the drawn ground of an act area (world.area): its relief and its soil/crop surface. Presentation only.
//
// RELIEF RULE (the sim's ground is flat at area.groundY over area.bounds.terrainRegion, and every actor, the player's eye and every shot sit on it):
//  - inside the playable rectangle grown by AREA_FLAT_MARGIN_M the drawn ground IS the simulation's ground (offset exactly 0). The strip that is walked and fought on
//    is therefore never displaced; its furrows, ruts and wear are colour and shading only (see the field shader below);
//  - outside it a visual-only offset grows over AREA_RAMP_M metres: a slight rise toward the north tree line (about 1.7 m at the trees, 90 m beyond the fight) and a low
//    undulation (<= 0.75 m) on the other sides. It is never negative (the field mesh is laid over the existing terrain and must stay above it) and it fades to 0 at the
//    border of the field mesh (AREA_EDGE_M), where it meets the existing terrain;
//  - nothing the simulation does reads it: `areaReliefOffset` is a renderer function, the simulation's `terrainHeightAt` is untouched.
export const AREA_FLAT_MARGIN_M=6,AREA_RAMP_M=70,AREA_EDGE_M=60,AREA_RISE_M=1.7,AREA_UNDULATION_M=.75,AREA_LIFT_M=.03;

/** The visual offset (metres, >= 0) added to the existing terrain surface at (x,z) of an act area. 0 on the fought-over strip and at the border of the field mesh. */
export function areaReliefOffset(area,x,z){
  const P=area.bounds.playable,F=area.ground,M=AREA_FLAT_MARGIN_M;
  const dx=Math.max(P.minX-M-x,0,x-(P.maxX+M)),dz=Math.max(P.minZ-M-z,0,z-(P.maxZ+M));
  const d=Math.hypot(dx,dz);if(d<=0)return 0;
  const edge=smooth01(Math.min(x-F.minX,F.maxX-x,z-F.minZ,F.maxZ-z)/AREA_EDGE_M);if(edge<=0)return 0;
  const ramp=smooth01(d/AREA_RAMP_M),w=ramp*ramp;
  const north=smooth01((P.minZ-M-z)/90),rise=AREA_RISE_M*north*north;
  const undulation=.5+.25*(Math.sin(x*.021+1.3)*Math.cos(z*.017)+Math.sin(x*.047+z*.039+.6));
  return edge*(w*(AREA_LIFT_M+AREA_UNDULATION_M*Math.max(0,Math.min(1,undulation)))+rise);
}

/** The field mesh: a grid laid over the existing terrain (`base(x,z)` = its submitted surface) plus the visual offset. `cell` metres between vertices. */
export function buildFieldGeometry(area,base,{cell=12}={}){
  const F=area.ground,R=area.bounds.terrainRegion,y0=area.groundY;
  const cols=Math.ceil((F.maxX-F.minX)/cell),rows=Math.ceil((F.maxZ-F.minZ)/cell),position=new Float32Array((cols+1)*(rows+1)*3),index=new Uint32Array(cols*rows*6);
  let v=0;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const x=F.minX+(F.maxX-F.minX)*i/cols,z=F.minZ+(F.maxZ-F.minZ)*j/rows,off=areaReliefOffset(area,x,z);
    const flat=off===0&&x>=R.minX&&x<=R.maxX&&z>=R.minZ&&z<=R.maxZ;   // inside the simulation's flat region: exactly its ground
    position[v++]=x;position[v++]=(flat?y0:base(x,z))+off;position[v++]=z;
  }
  let k=0;
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;index[k++]=a;index[k++]=b;index[k++]=a+1;index[k++]=b;index[k++]=b+1;index[k++]=a+1;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(position,3));g.setIndex(new THREE.BufferAttribute(index,1));
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData={cols,rows,cell};return g;
}

const GLSL_HEAD=`
uniform sampler2D uAreaDetail;uniform float uAreaLow;uniform vec2 uAreaOrigin;uniform vec4 uAreaTrack[2];uniform vec4 uAreaBand;
varying vec3 vAreaPos;
vec3 areaLin(vec3 c){return pow(c,vec3(2.2));}
float aHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float aNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(aHash(i),aHash(i+vec2(1.0,0.0)),f.x),mix(aHash(i+vec2(0.0,1.0)),aHash(i+vec2(1.0,1.0)),f.x),f.y);}
float aFbm(vec2 p){float s=.5*aNoise(p);p=p*2.03+17.1;s+=.25*aNoise(p);p=p*2.01+9.3;s+=.125*aNoise(p);return s/.875;}
`;
// A patchwork of fields (cells of 34 x ~118 m in a frame turned 12.6 degrees from the grid, edges warped by low-frequency noise, each cell with its own crop state), rows that follow
// that frame (drawn only where they do not alias: fwidth), a worn track with two ruts, a trampled strip behind the parapet, and a metre-scale soil grain from the project's own
// procedural soil map (two taps on High, one on Low). Domain-warped, multi-scale: no visible repetition of a single stripe.
const GLSL_BODY=`
vec2 ap=vAreaPos.xz-uAreaOrigin;
float aDist=length(vViewPosition);
vec2 aw=ap+(vec2(aNoise(ap*.017+3.1),aNoise(ap*.017+9.7))-.5)*28.0;
float aCs=.9759,aSn=.2181;
float fu=aw.x*aSn+aw.y*aCs,fv=aw.x*aCs-aw.y*aSn;
float sid=floor(fv/34.0),off=aHash(vec2(sid,3.0))*.9,pf=fu/118.0+off,pid=floor(pf);
float h1=aHash(vec2(sid,pid)*1.37+7.0);
float edgeD=min(min(fract(fv/34.0),1.0-fract(fv/34.0))*34.0,min(fract(pf),1.0-fract(pf))*118.0);
vec3 aCol;float rowSp=.5,rowAmp=.55;
if(h1<.34){aCol=areaLin(vec3(.62,.55,.37));rowAmp=.4;}
else if(h1<.58){aCol=areaLin(vec3(.55,.46,.29));rowSp=.45;rowAmp=.4;}
else if(h1<.74){aCol=areaLin(vec3(.34,.26,.19));rowSp=.85;rowAmp=.8;}
else if(h1<.88){aCol=areaLin(vec3(.34,.42,.21));rowAmp=.12;}
else{aCol=areaLin(vec3(.31,.39,.21));rowSp=.62;rowAmp=.5;}
float rowC=fv/rowSp;
float rowR=.5+.5*sin(rowC*6.2832+aNoise(vec2(fu*.18,sid))*2.2);
float rowFade=(1.0-smoothstep(.07,.24,fwidth(rowC)))*(1.0-smoothstep(45.0,150.0,aDist));
float amp=rowAmp*rowFade;
aCol*=1.0+(rowR-.5)*amp*.85;
aCol*=.80+.40*aFbm(ap*.045+vec2(5.0,2.0));
aCol*=.92+.16*aHash(vec2(sid,pid)+13.0);
float balk=1.0-smoothstep(.5,1.7,edgeD);
aCol=mix(aCol,areaLin(vec3(.30,.38,.19))*(.85+.3*aNoise(ap*.9)),balk*.75);
float wear=0.0,rut=0.0;
for(int i=0;i<2;i++){
  vec4 s=uAreaTrack[i];vec2 a=s.xy,b=s.zw,pa=vAreaPos.xz-a,ba=b-a;float hh=clamp(dot(pa,ba)/max(dot(ba,ba),.001),0.0,1.0);float dd=length(pa-ba*hh);
  wear=max(wear,1.0-smoothstep(1.2,2.7+aNoise(vAreaPos.xz*.6)*1.5,dd));
  vec2 dir=ba/max(length(ba),.001);float lat=dot(pa,vec2(-dir.y,dir.x));
  rut=max(rut,(1.0-smoothstep(.07,.24,abs(abs(lat)-.78)))*(1.0-smoothstep(1.3,1.9,dd))*(.55+.45*aNoise(vAreaPos.xz*.8+float(i))));
}
vec2 bq=vec2(max(max(uAreaBand.x-vAreaPos.x,0.0),vAreaPos.x-uAreaBand.y),max(max(uAreaBand.z-vAreaPos.z,0.0),vAreaPos.z-uAreaBand.w));
wear=max(wear,(1.0-smoothstep(0.0,3.2+aNoise(vAreaPos.xz*.45)*2.4,length(bq)))*.9);
aCol=mix(aCol,areaLin(vec3(.50,.42,.32))*(.80+.40*aNoise(vAreaPos.xz*1.3)),wear*.85);
aCol*=1.0-rut*.25;amp*=1.0-wear;
vec3 dt=texture2D(uAreaDetail,vAreaPos.xz*.9).rgb;
float lum=dot(dt,vec3(.3,.59,.11))/.12;   // the soil map's mean is about .12 in linear light
if(uAreaLow<.5){vec3 dt2=texture2D(uAreaDetail,vAreaPos.xz*.213+.37).rgb;lum*=mix(1.0,dot(dt2,vec3(.3,.59,.11))/.12,.6);}
float nearK=1.0-smoothstep(8.0,60.0,aDist);
aCol*=mix(1.0,lum,.8*nearK);
float areaH=(rowR-.5)*amp*.55+(lum-1.0)*.5*nearK-rut*.5;
diffuseColor.rgb*=aCol;
`;
const GLSL_BUMP=`normal=normalize(normal-vec3(dFdx(areaH),dFdy(areaH),0.0)*.22);`;

/**
 * The field surface. `detail` = the project's procedural soil map (owned by the caller). Returns {material, setQuality(tier), dispose()}; the material owns no texture.
 * `track` = polylines of worn tracks [[x,z],...] (only the first two segments are used), `band` = [minX,maxX,minZ,maxZ] trampled strip.
 */
export function createFieldMaterial(detail,{track=[],band=[0,0,0,0],origin=[0,0],quality='high'}={}){
  const seg=[new THREE.Vector4(),new THREE.Vector4()];
  for(let i=0;i<2&&i<track.length-1;i++)seg[i].set(track[i][0],track[i][1],track[i+1][0],track[i+1][1]);
  if(track.length<3)seg[1].copy(seg[0]);
  const uniforms={uAreaDetail:{value:detail},uAreaLow:{value:quality==='low'?1:0},uAreaOrigin:{value:new THREE.Vector2(origin[0],origin[1])},uAreaTrack:{value:seg},uAreaBand:{value:new THREE.Vector4(...band)}};
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.97,metalness:0});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec3 vAreaPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAreaPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${GLSL_HEAD}`).replace('#include <map_fragment>',GLSL_BODY).replace('#include <normal_fragment_maps>',GLSL_BUMP);
  };
  material.customProgramCacheKey=()=>'m01-area-field-v1';
  return {material,uniforms,setQuality(q){uniforms.uAreaLow.value=q==='low'?1:0;},dispose(){material.dispose();}};
}
