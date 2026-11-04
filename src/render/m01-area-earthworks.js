import * as THREE from 'three';
import {GeoBuilder,hash01,smooth01,valueNoise} from './m01-area-geo.js';

// VII-a visual package: heaped earth for the area's solids. Presentation only: the colliders are the simulation's boxes (m01-area-world.js) and are not moved or resized.
//  - a mound (the German turned-earth covers) is a lumpy heap whose base footprint is the box's (x1.1) and whose crest is the box's top: no vertex is higher than the box;
//  - the parapet is an earth berm along the box run (north face flush with the box face where the T12 sandbag courses stand, back slope 0.3 m past the south face, the crest
//    exactly the box top, a saddle down to the low nest front);
//  - clods and crater rims are instanced; every kind is one draw call.
const TAU=Math.PI*2;
export const EARTH_DARK=[.085,.06,.04],EARTH_LIGHT=[.24,.18,.115];

/** A unit heap: footprint a superellipse in [-1,1]^2 (the box's corners are 0.79 of the way out, hence the x1.1 at the instance), y 0..1, lumps only ever lower the crest. */
export function buildMoundGeometry(seed=0,{seg=22,detail=1}={}){
  const b=new GeoBuilder(),S=detail>=1?[1,.8,.55,.28]:[1,.6,.25],p=3,rings=S.length;
  const ringStart=[];
  for(let r=0;r<rings;r++){
    const s=S[r];ringStart.push(b.vertexCount);
    for(let k=0;k<seg;k++){
      const a=k/seg*TAU,c=Math.cos(a),sn=Math.sin(a),norm=Math.pow(Math.pow(Math.abs(c),p)+Math.pow(Math.abs(sn),p),1/p);
      const jag=1+.13*(valueNoise(c*1.9+seed*5.3,sn*1.9+r*1.3,seed)*2-1)*(r===0?1:1.2);
      const lump=1-.14*valueNoise(c*2.7+r*.9,sn*2.7+seed,seed+3);
      const y=r===0?-.04:(1-Math.pow(s,2.2))*lump,t=smooth01(y);
      const shade=.8+.4*valueNoise(c*3+seed,sn*3+r,seed+9);
      b.vertex(c/norm*s*jag,y,sn/norm*s*jag,(EARTH_DARK[0]+(EARTH_LIGHT[0]-EARTH_DARK[0])*t)*shade,(EARTH_DARK[1]+(EARTH_LIGHT[1]-EARTH_DARK[1])*t)*shade,(EARTH_DARK[2]+(EARTH_LIGHT[2]-EARTH_DARK[2])*t)*shade);
    }
  }
  const apex=b.vertex(0,1,0,...EARTH_LIGHT);
  for(let r=0;r<rings-1;r++)for(let k=0;k<seg;k++){const a=ringStart[r]+k,bb=ringStart[r]+(k+1)%seg,c=ringStart[r+1]+(k+1)%seg,d=ringStart[r+1]+k;b.quad(a,d,c,bb);}
  for(let k=0;k<seg;k++)b.tri(ringStart[rings-1]+k,apex,ringStart[rings-1]+(k+1)%seg);
  return b.build();
}

/**
 * Berm along the parapet boxes. `parapets` = [{min:{x,y,z},max:{x,y,z}}] (the world's np_parapet_* covers). Boxes that touch end to end form one run; the run's height is
 * the box's own, with a cosine saddle (over `saddleM`, inside the taller box) down to a lower neighbour.
 */
export function buildBermGeometry(parapets,{step=1.25,saddleM=1.1}={}){
  const b=new GeoBuilder(),boxes=[...parapets].sort((a,c)=>a.min.x-c.min.x),runs=[];
  for(const box of boxes){const run=runs.at(-1);if(run&&Math.abs(run.at(-1).max.x-box.min.x)<1e-6)run.push(box);else runs.push([box]);}
  for(const run of runs){
    const x0=run[0].min.x,x1=run.at(-1).max.x,y0=run[0].min.y,zc=(run[0].min.z+run[0].max.z)/2,half=(run[0].max.z-run[0].min.z)/2;
    const heightAt=x=>{
      let hb=null;for(const box of run)if(x>=box.min.x-1e-6&&x<=box.max.x+1e-6){const hh=box.max.y-box.min.y;if(hb===null||hh>hb)hb=hh;}
      let h=hb??0;
      // saddle: within saddleM of a lower neighbour the crest eases down to that neighbour's height (inside the taller box, so never above its top)
      for(const box of run){const lower=box.max.y-box.min.y;if(lower<(hb??0)-1e-6){const d=Math.max(box.min.x-x,0,x-box.max.x);if(d<saddleM)h=Math.min(h,lower+(hb-lower)*smooth01(d/saddleM));}}
      return h;};
    const xs=[];for(let x=x0;x<x1-1e-6;x+=step)xs.push(x);xs.push(x1);
    // extra sections at the saddles
    for(const box of run){for(const k of [-saddleM,-saddleM/2,0])xs.push(box.min.x+k,box.max.x-k);}
    const sorted=[...new Set(xs.filter(x=>x>=x0-1e-6&&x<=x1+1e-6).map(x=>Math.round(x*1000)/1000))].sort((a,c)=>a-c);
    // profile: [dz/half (north negative), height share]; north face steep (the sandbags stand there), south back slope 0.3 m past the box face
    const prof=[[-1.22,0],[-1.05,.5],[-.78,.93],[-.45,1],[.45,.995],[.78,.92],[1.08,.55],[1.38,.14],[1.6,0]];
    const rowsStart=[];
    sorted.forEach((x,si)=>{
      const h=heightAt(x),crestDip=.05*valueNoise(x*.37,0,5)+.03*valueNoise(x*1.3,2,6),wob=.1*(valueNoise(x*.21,1,7)-.5);
      rowsStart.push(b.vertexCount);
      prof.forEach(([dz,ys],pi)=>{
        const crest=pi>0&&pi<prof.length-1,y=y0+(ys===0?-.03:h*ys*(1-(crest?crestDip/Math.max(h,.3):0)));
        const shade=.82+.3*valueNoise(x*.9,pi*1.7,8),t=smooth01(ys);
        const z=zc+dz*half+(ys>0?wob*(1-ys*.4):0);
        b.vertex(x,y,z,(EARTH_DARK[0]+(EARTH_LIGHT[0]-EARTH_DARK[0])*t)*shade,(EARTH_DARK[1]+(EARTH_LIGHT[1]-EARTH_DARK[1])*t)*shade,(EARTH_DARK[2]+(EARTH_LIGHT[2]-EARTH_DARK[2])*t)*shade);
      });
      if(si>0){const n=prof.length,a0=rowsStart[si-1],a1=rowsStart[si];for(let q=0;q<n-1;q++)b.quad(a0+q,a0+q+1,a1+q+1,a1+q);}
    });
    // end caps (closed so the run's ends are not hollow): a fan around the section's centre, facing along -x / +x
    const n=prof.length;
    for(const [row,dir] of [[rowsStart[0],-1],[rowsStart.at(-1),1]]){
      const c=b.vertex(sorted[dir<0?0:sorted.length-1],y0+.2,zc,...EARTH_DARK);
      for(let q=0;q<n;q++){const next=(q+1)%n;if(dir<0)b.tri(c,row+next,row+q);else b.tri(c,row+q,row+next);}
    }
  }
  return b.build();
}

/** A small lumpy clod (20-80 triangles), unit size, base on y=0. */
export function buildClodGeometry(){const b=new GeoBuilder();b.blob(0,.5,0,.7,.5,.62,{detail:0,seed:4,lump:.28,bottom:EARTH_DARK,top:EARTH_LIGHT,floorY:.12});return b.build();}

/** A crater's rim: a lumpy raised ring in the unit disc (inner radius .8, crest 1.0, outer 1.4), y 0..1 scaled at the instance. */
export function buildCraterRimGeometry({seg=26}={}){
  const b=new GeoBuilder(),radii=[[.74,0],[.9,.55],[1.04,1],[1.2,.5],[1.42,0]],starts=[];
  for(let r=0;r<radii.length;r++){starts.push(b.vertexCount);
    for(let k=0;k<seg;k++){const a=k/seg*TAU,c=Math.cos(a),s=Math.sin(a),j=1+.12*(valueNoise(c*2+r,s*2,2)*2-1),h=radii[r][1]*(.55+.45*valueNoise(c*3.1,s*3.1+r,3));
      const t=smooth01(h);b.vertex(c*radii[r][0]*j,h,s*radii[r][0]*j,EARTH_DARK[0]*(1+.9*t),EARTH_DARK[1]*(1+.9*t),EARTH_DARK[2]*(1+.9*t));}}
  for(let r=0;r<radii.length-1;r++)for(let k=0;k<seg;k++){const a=starts[r]+k,bb=starts[r]+(k+1)%seg,c=starts[r+1]+(k+1)%seg,d=starts[r+1]+k;b.quad(a,bb,c,d);}
  return b.build();
}

const EARTH_HEAD='varying vec3 vEarthPos;\n';
const EARTH_FRAG=`
float eHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float eNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(eHash(i),eHash(i+vec2(1.0,0.0)),f.x),mix(eHash(i+vec2(0.0,1.0)),eHash(i+vec2(1.0,1.0)),f.x),f.y);}
`;
/** Soil for the heaped earth: the vertex colour carries the heap's own shading; this adds world-space grain (two scales) and a derivative bump. */
export function createEarthMaterial(){
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,metalness:0});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=EARTH_HEAD+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 earthP=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        earthP=instanceMatrix*earthP;
      #endif
      vEarthPos=(modelMatrix*earthP).xyz;`);
    shader.fragmentShader=EARTH_HEAD+shader.fragmentShader.replace('#include <common>',`#include <common>\n${EARTH_FRAG}`).replace('#include <map_fragment>',`#include <map_fragment>
      float eG=eNoise(vEarthPos.xz*7.0+vEarthPos.y*5.0)*.6+eNoise(vEarthPos.xz*23.0+vEarthPos.y*17.0)*.4;
      diffuseColor.rgb*=.55+.9*eG;`).replace('#include <normal_fragment_maps>',`normal=normalize(normal-vec3(dFdx(eG),dFdy(eG),0.0)*.35);`);
  };
  material.customProgramCacheKey=()=>'m01-area-earth-v1';
  return material;
}

/**
 * Instanced mounds for the world's turned-earth covers: ONE draw call. `covers` = [{id,min,max}] (EARTH covers that are not parapets). Every mound is drawn on every
 * quality tier (cover readability never depends on the tier); only the clods round them scale.
 */
export function buildMoundInstances(covers,geometry,material){
  const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,covers.length)),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),pos=new THREE.Vector3(),sc=new THREE.Vector3(),col=new THREE.Color();
  covers.forEach((c,i)=>{
    const w=c.max.x-c.min.x,d=c.max.z-c.min.z,h=c.max.y-c.min.y,yaw=(hash01(i,1)-.5)*.2;
    pos.set((c.min.x+c.max.x)/2,c.min.y,(c.min.z+c.max.z)/2);e.set(0,yaw,0);q.setFromEuler(e);
    sc.set(w/2*1.1*(.94+.12*hash01(i,2)),h*(.93+.07*hash01(i,3)),d/2*1.1*(.94+.12*hash01(i,4)));
    m.compose(pos,q,sc);mesh.setMatrixAt(i,m);const v=.88+.24*hash01(i,5);col.setRGB(v,v*(.97+.06*hash01(i,6)),v*.94);mesh.setColorAt(i,col);
  });
  mesh.count=covers.length;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.name='m01-area-mounds';
  return mesh;
}

/**
 * Clods scattered round the mounds' feet and the berm's toe (instanced, ONE draw call). The prefix `count` is drawn: the list is a seeded permutation, so every tier
 * shows an even sample of the same positions. Returns the mesh and the total number of instances it holds.
 */
export function buildClodInstances(covers,parapets,geometry,material,{perMound=7,perBermMetre=.7}={}){
  const list=[];
  covers.forEach((c,i)=>{
    const cx=(c.min.x+c.max.x)/2,cz=(c.min.z+c.max.z)/2,hx=(c.max.x-c.min.x)/2,hz=(c.max.z-c.min.z)/2;
    for(let k=0;k<perMound;k++){const a=hash01(i*31+k,1)*TAU,r=1.12+.55*hash01(i*31+k,2);list.push([cx+Math.cos(a)*hx*r*1.1,c.min.y,cz+Math.sin(a)*hz*r*1.1,.10+.20*hash01(i*31+k,3),hash01(i*31+k,4)*TAU]);}
  });
  parapets.forEach((c,i)=>{
    const len=c.max.x-c.min.x,n=Math.round(len*perBermMetre);
    for(let k=0;k<n;k++){const side=hash01(i*97+k,5)<.45?-1:1,x=c.min.x+hash01(i*97+k,6)*len,z=side<0?c.min.z-.12-.45*hash01(i*97+k,7):c.max.z+.2+.5*hash01(i*97+k,7);list.push([x,c.min.y,z,.08+.17*hash01(i*97+k,8),hash01(i*97+k,9)*TAU]);}
  });
  // seeded permutation (Fisher-Yates with the hash)
  for(let i=list.length-1;i>0;i--){const j=Math.floor(hash01(i,77)*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,list.length)),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),pos=new THREE.Vector3(),sc=new THREE.Vector3(),col=new THREE.Color();
  list.forEach(([x,y,z,s,yaw],i)=>{pos.set(x,y-.02,z);e.set((hash01(i,11)-.5)*.5,yaw,(hash01(i,12)-.5)*.5);q.setFromEuler(e);sc.set(s*(1+.5*hash01(i,13)),s*(.7+.4*hash01(i,14)),s*(1+.4*hash01(i,15)));
    m.compose(pos,q,sc);mesh.setMatrixAt(i,m);const v=.8+.35*hash01(i,16);col.setRGB(v,v*.96,v*.9);mesh.setColorAt(i,col);});
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;mesh.name='m01-area-clods';
  mesh.frustumCulled=false;mesh.userData.total=list.length;mesh.count=list.length;
  return mesh;
}
