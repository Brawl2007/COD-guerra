import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {vegetationNoise} from './m01-vegetation-layout.js';

// Original procedural foliage art for M01. Geometry is generated once and shared by every instance.

// A crown/shrub lobe with a broken outline: radial noise on a merged icosphere, darker underside
// baked in vertex colour so lobes read as volumes under the low dawn sun.
export function lumpyCanopyGeometry(base,seed){
  const welded=mergeVertices(base.deleteAttribute('normal').deleteAttribute('uv'),1e-4);base.dispose();
  const p=welded.attributes.position,v=new THREE.Vector3(),colors=[];
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);const n=v.clone().normalize();
    const bump=.80+vegetationNoise(seed,i)*.34+Math.max(0,n.y)*.06-Math.max(0,-n.y)*.16;
    v.copy(n).multiplyScalar(bump);if(n.y<-.2)v.y*=.82;p.setXYZ(i,v.x,v.y,v.z);
    const ao=.56+.5*THREE.MathUtils.smoothstep(n.y,-.85,.75)+(vegetationNoise(seed,i+977)-.5)*.10;colors.push(ao,ao,ao*.96);
  }
  welded.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));welded.computeVertexNormals();welded.computeBoundingSphere();
  return welded;
}

// Trunk with a root flare and a slight taper; branches reuse it (the flare becomes a collar).
export function trunkGeometry(segments){
  const g=new THREE.LatheGeometry([[1.42,-.5],[1.12,-.47],[.92,-.38],[.80,-.2],[.70,.12],[.60,.5]].map(([r,y])=>new THREE.Vector2(r,y)),segments);
  g.computeVertexNormals();return g;
}

// Each blade is one tapered triangle (two base corners, one bent tip); leaves are two-triangle strips.
function blades(list){
  const pos=[],col=[],nor=[];
  for(const b of list){
    const {x=0,z=0,yaw,w,h,bend,quad=false,base=[.34,.37,.24],tip=[.80,.82,.56]}=b,c=Math.cos(yaw),s=Math.sin(yaw);
    const px=(lx,ly,lz)=>[x+lx*c-lz*s,ly,z+lx*s+lz*c];
    const mid=base.map((v,j)=>v+(tip[j]-v)*.5);
    const tris=quad?[[px(-w,0,0),base],[px(w,0,0),base],[px(w*.7,h*.5,bend*.35),mid],[px(-w,0,0),base],[px(w*.7,h*.5,bend*.35),mid],[px(-w*.7,h*.5,bend*.35),mid],
      [px(-w*.7,h*.5,bend*.35),mid],[px(w*.7,h*.5,bend*.35),mid],[px(0,h,bend),tip]]:[[px(-w,0,0),base],[px(w,0,0),base],[px(0,h,bend),tip]];
    for(const [p,cc]of tris){pos.push(...p);col.push(...cc);nor.push(0,1,0);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeBoundingSphere();return g;
}
// Up-facing normals light the tufts like the ground they grow from, avoiding black-backed blades.
export function grassGeometries(){
  const golden=2.399963,ring=(i,n,r)=>({x:Math.cos(i*golden)*r*Math.sqrt((i+.5)/n),z:Math.sin(i*golden)*r*Math.sqrt((i+.5)/n)});
  const tuft=blades(Array.from({length:7},(_,i)=>({...ring(i,7,.16),yaw:i*golden,w:.028,h:.32+(i%4)*.08,bend:.08+(i%3)*.06})));
  const seed=blades([
    ...Array.from({length:5},(_,i)=>({...ring(i,5,.12),yaw:i*golden,w:.024,h:.52+(i%3)*.12,bend:.12+(i%2)*.08})),
    // Thin stalks with pale heads: late-summer meadow grass gone to seed.
    ...Array.from({length:2},(_,i)=>({...ring(i+2,5,.10),yaw:i*2.1+.4,w:.010,h:.80+i*.09,bend:.20,base:[.48,.46,.33],tip:[.98,.90,.62]}))]);
  const leafy=blades(Array.from({length:4},(_,i)=>({yaw:i*1.5708+.3,w:.06,h:.30+(i%2)*.06,bend:.24,quad:true,base:[.34,.40,.24],tip:[.80,.90,.58]})));
  const reed=blades(Array.from({length:8},(_,i)=>({...ring(i,8,.22),yaw:i*golden,w:.016,h:.85+(i%4)*.1,bend:.10+(i%3)*.06,base:[.42,.42,.30],tip:[.90,.86,.62]})));
  return {tuft,seed,leafy,reed};
}

// Tileable leaf mass: leaves drawn with wrap-around, alpha gaps between them for a broken crown outline.
export function canopyLeafTexture(){
  const size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
  for(let i=0;i<900;i++){
    const x=vegetationNoise(0x1eaf,i*5)*size,y=vegetationNoise(0x1eaf,i*5+1)*size,a=vegetationNoise(0x1eaf,i*5+2)*Math.PI;
    const r=2.2+vegetationNoise(0x1eaf,i*5+3)*3.6,v=vegetationNoise(0x1eaf,i*5+4),l=Math.round(120+v*125);
    ctx.fillStyle=`rgb(${l-8},${l},${l-26})`;
    for(const ox of [-size,0,size])for(const oy of [-size,0,size]){ctx.save();ctx.translate(x+ox,y+oy);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,r,r*.52,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
  const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.NoColorSpace;return map;
}

export function groundShadowTexture(){
  const size=64,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
  const image=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x+.5)/size*2-1,dy=(y+.5)/size*2-1,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    const edge=.78+.16*Math.sin(a*3+1.1)*Math.sin(a*5),v=Math.max(0,1-THREE.MathUtils.smoothstep(r,edge*.35,edge));
    const i=(y*size+x)*4;image.data[i]=image.data[i+1]=image.data[i+2]=255;image.data[i+3]=Math.round(v*255);
  }
  ctx.putImageData(image,0,0);const map=new THREE.CanvasTexture(canvas);return map;
}

const NOISE3=`
float m01VegHash(vec3 p){p=fract(p*.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float m01VegNoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(m01VegHash(i),m01VegHash(i+vec3(1,0,0)),f.x),mix(m01VegHash(i+vec3(0,1,0)),m01VegHash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(m01VegHash(i+vec3(0,0,1)),m01VegHash(i+vec3(1,0,1)),f.x),mix(m01VegHash(i+vec3(0,1,1)),m01VegHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`;

// Leaf texture projected in world space (triplanar) on every lobe: leaf-scale detail, dark gaps inside the
// crown and a ragged outline where grazing fragments fall on a gap. Fades to the mip average with distance.
export function canopyMaterial(leafMap){
  const material=new THREE.MeshStandardMaterial({color:'#f4f4e6',roughness:.96,metalness:0,vertexColors:true,emissive:'#1f2918',emissiveIntensity:.06});
  material.onBeforeCompile=shader=>{
    shader.uniforms.m01LeafMap={value:leafMap};
    shader.vertexShader='varying vec3 vM01Leaf;varying vec3 vM01LeafNormal;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 m01LeafPos=vec4(transformed,1.0);vec3 m01LeafN=objectNormal;
      #ifdef USE_INSTANCING
        m01LeafPos=instanceMatrix*m01LeafPos;m01LeafN=mat3(instanceMatrix)*m01LeafN;
      #endif
      vM01Leaf=(modelMatrix*m01LeafPos).xyz;vM01LeafNormal=normalize(mat3(modelMatrix)*m01LeafN);`);
    shader.fragmentShader='uniform sampler2D m01LeafMap;varying vec3 vM01Leaf;varying vec3 vM01LeafNormal;\n'+NOISE3+'\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 m01Blend=pow(abs(normalize(vM01LeafNormal)),vec3(3.0));m01Blend/=m01Blend.x+m01Blend.y+m01Blend.z;
      vec3 m01Uv=vM01Leaf*.62;
      vec4 m01Leaf=texture2D(m01LeafMap,m01Uv.zy)*m01Blend.x+texture2D(m01LeafMap,m01Uv.xz+.37)*m01Blend.y+texture2D(m01LeafMap,m01Uv.xy+.71)*m01Blend.z;
      float m01Dist=length(vViewPosition),m01Rag=1.0-smoothstep(60.0,170.0,m01Dist);
      #ifndef FLAT_SHADED
        float m01Facing=abs(dot(normalize(vNormal),normalize(vViewPosition)));
        if(m01Rag>0.0&&m01Leaf.a<(.78-m01Facing)*1.15*m01Rag)discard;
      #endif
      float m01Clump=m01VegNoise(vM01Leaf*.9);
      vec3 m01LeafTone=mix(vec3(.30,.31,.26),m01Leaf.rgb/max(m01Leaf.a,.05),smoothstep(.15,.85,m01Leaf.a));
      diffuseColor.rgb*=mix(vec3(.74),m01LeafTone*1.18,m01Rag*.85+.15)*mix(.72,1.12,m01Clump);`);
  };
  material.customProgramCacheKey=()=>'m01-canopy-v3';
  return material;
}

// Grass tufts sway from the mission clock (deterministic frames) and shrink to nothing past the fade
// distance, so far tufts cost no fill and do not shimmer; they never cast shadows.
export function grassMaterial(){
  const uniforms={m01Time:{value:0},m01Fade:{value:new THREE.Vector2(70,110)}};
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:0,side:THREE.DoubleSide,vertexColors:true});
  material.userData.m01Grass=uniforms;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='uniform float m01Time;uniform vec2 m01Fade;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 m01Root=vec3(0.0);
      #ifdef USE_INSTANCING
        m01Root=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
      #endif
      float m01Fall=1.0-smoothstep(m01Fade.x,m01Fade.y,distance(m01Root.xz,cameraPosition.xz));
      float m01H=max(position.y,0.0),m01Phase=dot(m01Root.xz,vec2(.23,.17))+m01Time*1.7;
      transformed.xz+=vec2(sin(m01Phase),cos(m01Phase*.83))*m01H*m01H*.10;
      transformed*=m01Fall;`);
  };
  material.customProgramCacheKey=()=>'m01-grass-v2';
  return material;
}
