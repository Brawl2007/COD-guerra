import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// VII-a visual package: small deterministic helpers shared by the area's earthworks, trees and wreck (renderer only; no simulation RNG, no clock, no allocation per frame).
/** Deterministic 0..1 hash of two integers: the same value on every machine and run. */
export function hash01(i,n=0){let v=Math.imul(i+1,0x9e3779b1)^Math.imul(n+7,0x85ebca6b);v^=v>>>15;v=Math.imul(v,0x2c1b3c6d);v^=v>>>12;v=Math.imul(v,0x297a2d39);v^=v>>>15;return (v>>>0)/4294967296;}
export const smooth01=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
/** Value noise on an integer lattice (seeded), smooth in x/z; ~0..1. */
export function valueNoise(x,z,seed=0){
  const i=Math.floor(x),j=Math.floor(z),u=smooth01(x-i),v=smooth01(z-j);
  return lerp(lerp(hash01(i*73856093^j*19349663,seed),hash01((i+1)*73856093^j*19349663,seed),u),lerp(hash01(i*73856093^(j+1)*19349663,seed),hash01((i+1)*73856093^(j+1)*19349663,seed),u),v);
}

/** Collects positions, vertex colours (linear) and indices of many small pieces into one geometry. Built once, never at frame time. */
export class GeoBuilder{
  constructor(){this.p=[];this.c=[];this.i=[];}
  get vertexCount(){return this.p.length/3;}
  get triangleCount(){return this.i.length/3;}
  vertex(x,y,z,r,g,b){this.p.push(x,y,z);this.c.push(r,g,b);return this.p.length/3-1;}
  tri(a,b,c){this.i.push(a,b,c);}
  quad(a,b,c,d){this.i.push(a,b,c,a,c,d);}
  /**
   * A lumpy ellipsoid ("blob"): a welded icosphere (smooth normals) with seeded radial lumps, a vertical colour gradient (shadowed underside to lit top)
   * and optional flattening of everything below `floorY` (so a heap or bush sits on the ground instead of floating). Returns the first index it used.
   */
  blob(cx,cy,cz,rx,ry,rz,{detail=1,seed=0,lump=.18,bottom=[.3,.3,.3],top=[.6,.6,.6],yaw=0,floorY=-Infinity,shade=1}={}){
    let g=new THREE.IcosahedronGeometry(1,detail);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g,1e-4);
    const pos=g.attributes.position,start=this.vertexCount,cos=Math.cos(yaw),sin=Math.sin(yaw);
    for(let k=0;k<pos.count;k++){
      const x=pos.getX(k),y=pos.getY(k),z=pos.getZ(k);
      const n=1+lump*(valueNoise(x*2.1+seed*3.1,z*2.1+y*1.7+seed*1.3,seed)*2-1+(valueNoise(x*4.7+y*3.3,z*4.7,seed+11)*2-1)*.5);
      let px=x*rx*n,py=y*ry*n,pz=z*rz*n;
      const t=smooth01((y+1)/2),wx=px*cos+pz*sin,wz=-px*sin+pz*cos;
      this.vertex(cx+wx,Math.max(cy+py,floorY),cz+wz,lerp(bottom[0],top[0],t)*shade,lerp(bottom[1],top[1],t)*shade,lerp(bottom[2],top[2],t)*shade);
    }
    const idx=g.index;for(let k=0;k<idx.count;k+=3)this.tri(start+idx.getX(k),start+idx.getX(k+1),start+idx.getX(k+2));
    g.dispose();return start;
  }
  /** A tapered, slightly bent trunk (n sided, `rings` rings) from (x,y,z) upward, ending at the returned top point. */
  trunk(x,y,z,height,r0,r1,{sides=5,rings=3,bend=[0,0],color=[.17,.12,.08],seed=0}={}){
    const start=this.vertexCount;
    for(let r=0;r<=rings;r++){
      const t=r/rings,rad=lerp(r0,r1,t),cx=x+bend[0]*t*t,cz=z+bend[1]*t*t,cy=y+height*t;
      for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2,j=1+.12*(hash01(s+r*9,seed)-.5);this.vertex(cx+Math.cos(a)*rad*j,cy,cz+Math.sin(a)*rad*j,color[0]*(.8+.3*t),color[1]*(.8+.3*t),color[2]*(.8+.3*t));}
    }
    for(let r=0;r<rings;r++)for(let s=0;s<sides;s++){const a=start+r*sides+s,b=start+r*sides+(s+1)%sides;this.quad(a,a+sides,b+sides,b);}
    return [x+bend[0],y+height,z+bend[1]];
  }
  build(){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    g.setIndex(this.i);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
  }
}
