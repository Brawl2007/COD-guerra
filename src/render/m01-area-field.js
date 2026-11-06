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

/** Hash, value noise and the crop-cell hash of the field's patchwork (shared with the stubble cards, which pick their tint from the same cell). */
export const AREA_CELL_GLSL=`
float aHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float aNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(aHash(i),aHash(i+vec2(1.0,0.0)),f.x),mix(aHash(i+vec2(0.0,1.0)),aHash(i+vec2(1.0,1.0)),f.x),f.y);}
/** The cell hash h1 of the patchwork at a point relative to the field origin: < .34 stubble, < .58 dry stubble, < .74 ploughed, < .88 pasture, else tubers. */
float areaCellH(vec2 ap){
  vec2 aw=ap+(vec2(aNoise(ap*.017+3.1),aNoise(ap*.017+9.7))-.5)*28.0;
  float fu=aw.x*.2181+aw.y*.9759,fv=aw.x*.9759-aw.y*.2181;
  float sid=floor(fv/34.0),off=aHash(vec2(sid,3.0))*.9,pid=floor(fu/118.0+off);
  return aHash(vec2(sid,pid)*1.37+7.0);
}
`;
const GLSL_HEAD=`
uniform sampler2D uAreaDetail;uniform float uAreaLow;uniform vec2 uAreaOrigin;uniform vec4 uAreaTrack[2];uniform vec4 uAreaBand;
varying vec3 vAreaPos;
vec3 areaLin(vec3 c){return pow(c,vec3(2.2));}
${AREA_CELL_GLSL}
float aFbm(vec2 p){float s=.5*aNoise(p);p=p*2.03+17.1;s+=.25*aNoise(p);p=p*2.01+9.3;s+=.125*aNoise(p);return s/.875;}
// Round 2 (pkg4): the soil map repeats every 1.1 m, which printed a lattice on the ground near the camera. Stochastic sampling: every lattice cell takes its own random offset
// and the four neighbours are blended (smooth weights), so no two cells show the same patch of the map and the repeat disappears. textureGrad keeps the mip level of the plain
// coordinate (the offsets jump between cells).
vec3 areaSoil(vec2 p){
  vec2 i=floor(p),f=fract(p);vec3 sum=vec3(0.0);float wsum=0.0;vec2 dx=dFdx(p),dy=dFdy(p);
  for(int y=0;y<2;y++)for(int x=0;x<2;x++){
    vec2 g=vec2(float(x),float(y)),c=i+g,o=vec2(aHash(c+11.0),aHash(c+71.0));
    vec2 d=f-g;float w=max(0.0,1.0-dot(d,d)*1.1);w=w*w+1e-4;
    sum+=w*textureGrad(uAreaDetail,p+o*7.0,dx,dy).rgb;wsum+=w;
  }
  return sum/wsum;
}
`;
// A patchwork of fields (cells of 34 x ~118 m in a frame turned 12.6 degrees from the grid, edges warped by low-frequency noise, each cell with its own crop state), rows that follow
// that frame (drawn only where they do not alias: fwidth), a worn track with two ruts, a trampled strip behind the parapet, and a metre-scale soil grain from the project's own
// procedural soil map (two taps on High, one on Low). Domain-warped, multi-scale: no visible repetition of a single stripe.
const GLSL_BODY=`
vec2 ap=vAreaPos.xz-uAreaOrigin;
float aDist=length(vViewPosition);
// Low: the domain warp and the fbm tint fade out between 50 and 80 m (aWk 0 -> 1) and are not evaluated beyond it (straight cell edges, flat tint at that distance); High/Medium: aWk is 0, as before.
float aWk=uAreaLow>.5?smoothstep(50.0,80.0,aDist):0.0;
vec2 aw=ap;
if(aWk<1.0)aw+=(vec2(aNoise(ap*.017+3.1),aNoise(ap*.017+9.7))-.5)*28.0*(1.0-aWk);
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
// Round 2: the rows used to be a plain sine with one phase shift per cell, which near the camera read as a mown lawn / checkerboard. Now the row coordinate is warped at three
// scales, every row has its own width, strength and gaps, and the strength itself drifts along the row, so no two rows or segments look alike.
// The rows' weight (rowFade) is 0 beyond 20 m: the whole block is skipped there (rowR .4 and amp 0 are the neutral values the bump term below expects).
float rowR=.4,amp=0.0;
if(aDist<20.0){
float rowC=fv/rowSp+(aFbm(ap*.09+vec2(2.0,8.0))-.5)*3.2+(aNoise(ap*.7+4.0)-.5)*.5;
float rowId=floor(rowC),rowJ=aHash(vec2(rowId,sid+31.0)),rowF=fract(rowC);
float rowW=.22+.3*rowJ;rowR=1.0-smoothstep(rowW*.5,rowW,abs(rowF-.5));
rowR*=step(.12,rowJ)*(.55+.45*aNoise(vec2(fu*.31+rowId*7.7,rowId)));
float rowFade=(1.0-smoothstep(.07,.30,fwidth(rowC)))*(1.0-smoothstep(4.0,20.0,aDist));
amp=rowAmp*rowFade*.75*(.6+.8*aNoise(ap*.05+vec2(rowId*.37,1.0)));
aCol*=1.0+(rowR-.4)*amp*.75;
}
// Low: the 3-octave fbm of axis-aligned value noise printed a lattice of dark blobs on the pasture at 15-40 m; Low uses one low-frequency noise, turned 37 degrees off the cell axes, at half the strength.
float aT=.5;if(aWk<1.0)aT=mix(uAreaLow>.5?aNoise(mat2(.8,.6,-.6,.8)*ap*.028+vec2(5.0,2.0)):aFbm(ap*.045+vec2(5.0,2.0)),.5,aWk);
aCol*=uAreaLow>.5?.90+.20*aT:.80+.40*aT;
aCol*=.92+.16*aHash(vec2(sid,pid)+13.0);
float balk=1.0-smoothstep(.5,1.7,edgeD);
aCol=mix(aCol,areaLin(vec3(.30,.38,.19))*(.85+.3*aNoise(ap*.9)),balk*.75);
float wear=0.0,rut=0.0;
if(uAreaLow<.5){   // Low: no worn track, ruts or trampled strip (their cost is the loop and the band, not the look of the cover)
for(int i=0;i<2;i++){
  vec4 s=uAreaTrack[i];vec2 a=s.xy,b=s.zw,pa=vAreaPos.xz-a,ba=b-a;float hh=clamp(dot(pa,ba)/max(dot(ba,ba),.001),0.0,1.0);float dd=length(pa-ba*hh);
  wear=max(wear,1.0-smoothstep(1.2,2.7+aNoise(vAreaPos.xz*.6)*1.5,dd));
  vec2 dir=ba/max(length(ba),.001);float lat=dot(pa,vec2(-dir.y,dir.x));
  rut=max(rut,(1.0-smoothstep(.07,.24,abs(abs(lat)-.78)))*(1.0-smoothstep(1.3,1.9,dd))*(.55+.45*aNoise(vAreaPos.xz*.8+float(i))));
}
vec2 bq=vec2(max(max(uAreaBand.x-vAreaPos.x,0.0),vAreaPos.x-uAreaBand.y),max(max(uAreaBand.z-vAreaPos.z,0.0),vAreaPos.z-uAreaBand.w));
wear=max(wear,(1.0-smoothstep(0.0,3.2+aNoise(vAreaPos.xz*.45)*2.4,length(bq)))*.9);
}
if(wear>0.0)aCol=mix(aCol,areaLin(vec3(.50,.42,.32))*(.80+.40*aNoise(vAreaPos.xz*1.3)),wear*.85);
aCol*=1.0-rut*.25;amp*=1.0-wear;
// Soil grain. High: stochastic sampling (no repeat); Low: one tap with the coordinate warped by a low-frequency noise (the repeat is broken up for one extra noise, not three taps).
// Low: the grain is only worth its taps near the eye; beyond ~15 m the 1.1 m soil map is under-sampled and printed a faint lattice on the ground (15-40 m), so it fades out between 4 and 15 m and the taps are skipped there.
float grainFar=uAreaLow>.5?15.0:60.0;float lum=1.0;float nearK=1.0-smoothstep(uAreaLow>.5?4.0:8.0,grainFar,aDist);
if(aDist<grainFar){   // nearK is 0 beyond grainFar: the soil grain taps are not needed there
if(uAreaLow<.5){
  vec3 dt=areaSoil(vAreaPos.xz*.9);
  lum=dot(dt,vec3(.3,.59,.11))/.12;   // the soil map's mean is about .12 in linear light
  vec3 dt2=texture2D(uAreaDetail,vAreaPos.xz*.213+.37+(vec2(aNoise(vAreaPos.xz*.31),aNoise(vAreaPos.xz*.31+5.0))-.5)*.5).rgb;lum*=mix(1.0,dot(dt2,vec3(.3,.59,.11))/.12,.6);
}else{
  vec2 wp=vAreaPos.xz*.9+(vec2(aNoise(vAreaPos.xz*.23),aNoise(vAreaPos.xz*.23+9.0))-.5)*1.6;
  vec3 dt=texture2D(uAreaDetail,wp).rgb;lum=dot(dt,vec3(.3,.59,.11))/.12;
}
}
aCol*=mix(1.0,lum,.8*nearK);
float areaH=(rowR-.4)*amp*.5+(lum-1.0)*.5*nearK-rut*.5;
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
  material.customProgramCacheKey=()=>'m01-area-field-v2';
  return {material,uniforms,setQuality(q){uniforms.uAreaLow.value=q==='low'?1:0;},dispose(){material.dispose();}};
}
