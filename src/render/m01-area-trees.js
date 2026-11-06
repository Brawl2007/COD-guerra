import * as THREE from 'three';
import {GeoBuilder,hash01} from './m01-area-geo.js';

// VII-a visual package: the tree line north of the area (layout.treeLine: only drawing, RECONSTRUCTED; no source gives the vegetation). One merged geometry, one draw call:
// pines (tall bent trunk, a conical crown of four lumpy blobs), poplars (a tall column of three) and broadleaves (a short trunk and a taller-than-wide crown of a core and four lobes) and
// undergrowth (low bushes and dry brown scrub at the foot). Every tree has its own shape and size (seeded; nothing here uses the simulation RNG).
// Quality tiers: the trees are placed in a seeded permutation and the geometry's draw range is a prefix of whole trees, so Low draws an even sample of the same line.
export const TREE_SHARE={low:.55,medium:.8,high:1};
const GREENS=[[.055,.10,.04],[.07,.115,.045],[.05,.085,.04],[.085,.125,.05],[.075,.095,.04]];
const lightOf=c=>[c[0]*1.7,c[1]*1.65,c[2]*1.4];

/**
 * `T` = layout.treeLine {minX,maxX,z,depthM,count}; `surface(x,z)` = drawn ground height there. Returns {geometry, trees:[{firstIndex,indexCount}], total}.
 */
export function buildTreeLine(T,surface){
  const b=new GeoBuilder(),perm=Array.from({length:T.count},(_,i)=>i);
  for(let i=perm.length-1;i>0;i--){const j=Math.floor(hash01(i,501)*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]];}
  const trees=[];
  for(let n=0;n<T.count;n++){
    const slot=perm[n],h=k=>hash01(slot*13+n,k),firstIndex=b.i.length;
    const x=T.minX+(T.maxX-T.minX)*(slot+h(1)*.8)/T.count,z=T.z+(h(2)-.5)*T.depthM,y=surface(x,z)-.05;
    // Round 2 (pkg4): larger and no flat 'umbrella' crowns. Three silhouettes: tall conical pines (blobs stacked and narrowing upward, taller than wide), tall columnar poplars,
    // and broadleaves whose crown is a taller-than-wide core with lobes round it (every lobe at least as tall as it is wide, lobes at different heights and greens).
    const kind=h(3)<.34?'pine':h(3)<.52?'poplar':'broad',green=GREENS[Math.floor(h(5)*GREENS.length)],light=lightOf(green),shade=.8+.4*h(6);
    if(kind==='pine'){
      const height=15+h(4)*11,trunkH=height*(.5+.1*h(7)),crownH=height-trunkH,top=b.trunk(x,y,z,trunkH*.78,.26+.06*h(8),.12,{sides:5,rings:3,bend:[(h(9)-.5)*1.2,(h(10)-.5)*1.2],color:[.20,.13,.08],seed:slot});
      const crownR=2.0+h(11)*1.1,blobs=4;
      for(let k=0;k<blobs;k++){
        const t=k/(blobs-1),r=crownR*(1.05-.72*t)*(.85+.3*h(40+k)),ox=(h(20+k)-.5)*crownR*.5*(1-t),oz=(h(30+k)-.5)*crownR*.5*(1-t);
        b.blob(top[0]+ox,y+trunkH*.62+crownH*(.14+.66*t),top[2]+oz,r,crownH*(.34-.05*t),r,
          {detail:1,seed:slot*7+k,lump:.26,bottom:[green[0]*.42,green[1]*.42,green[2]*.42],top:light,yaw:h(60+k)*6.28,shade});
      }
    }else if(kind==='poplar'){
      const height=19+h(4)*10,trunkH=height*(.2+.08*h(7)),crownH=height-trunkH,top=b.trunk(x,y,z,trunkH,.2+.05*h(8),.1,{sides:5,rings:2,bend:[(h(9)-.5)*.5,(h(10)-.5)*.5],color:[.21,.15,.10],seed:slot});
      const crownR=1.3+h(11)*.7,blobs=3,g2=[green[0]*1.15,green[1]*1.2,green[2]*1.05],l2=lightOf(g2);
      for(let k=0;k<blobs;k++){
        const t=k/(blobs-1),r=crownR*(1-.42*t*t)*(.9+.2*h(40+k));
        b.blob(top[0]+(h(20+k)-.5)*.5,y+trunkH*.9+crownH*(.22+.5*t),top[2]+(h(30+k)-.5)*.5,r,crownH*(.30-.04*t),r,
          {detail:1,seed:slot*7+k,lump:.22,bottom:[g2[0]*.45,g2[1]*.45,g2[2]*.45],top:l2,yaw:h(60+k)*6.28,shade});
      }
    }else{
      const height=11.5+h(4)*7,trunkH=height*(.34+.08*h(7)),top=b.trunk(x,y,z,trunkH,.26+.1*h(8),.14,{sides:5,rings:2,bend:[(h(9)-.5)*.8,(h(10)-.5)*.8],color:[.19,.14,.10],seed:slot});
      const crownR=3.0+h(11)*1.6,crownH=height-trunkH,lobes=4;
      // the core: taller than wide, then lobes round it
      b.blob(top[0],y+trunkH+crownH*.5,top[2],crownR*.62,crownH*.46,crownR*.62,{detail:1,seed:slot*7,lump:.26,bottom:[green[0]*.5,green[1]*.5,green[2]*.5],top:light,yaw:h(60)*6.28,shade});
      for(let k=0;k<lobes;k++){
        const a=k/lobes*6.283+h(70)*3,ring=crownR*.5*(.7+.4*h(80+k)),g2=GREENS[Math.floor(h(90+k)*GREENS.length)],l2=lightOf(g2),ry=crownH*(.30+.1*h(120+k));
        b.blob(top[0]+Math.cos(a)*ring,y+trunkH+crownH*(.24+.42*h(100+k)),top[2]+Math.sin(a)*ring,crownR*(.42+.14*h(110+k)),ry,crownR*(.42+.14*h(130+k)),
          {detail:1,seed:slot*7+k+1,lump:.28,bottom:[g2[0]*.5,g2[1]*.5,g2[2]*.5],top:l2,yaw:h(140+k)*6.28,shade});
      }
    }
    // undergrowth at the foot: two to four bushes (greens and dry browns), sitting on the ground
    const bushes=2+Math.floor(h(150)*3);
    for(let k=0;k<bushes;k++){
      const bx=x+(h(160+k)-.5)*5.5,bz=z+(h(170+k)-.5)*5.5,by=surface(bx,bz)-.05,r=.7+h(180+k)*.9,dry=h(190+k)<.3,c=dry?[.17,.12,.06]:GREENS[Math.floor(h(200+k)*GREENS.length)];
      b.blob(bx,by+r*.35,bz,r*1.3,r*.62,r*1.2,{detail:0,seed:slot*5+k,lump:.3,bottom:[c[0]*.45,c[1]*.45,c[2]*.45],top:dry?[.30,.22,.11]:lightOf(c),yaw:h(210+k)*6.28,floorY:by,shade});
    }
    trees.push({firstIndex,indexCount:b.i.length-firstIndex});
  }
  const geometry=b.build();
  // the trees' triangles are appended in order, so a prefix of trees is a prefix of the index buffer
  return {geometry,trees,total:trees.length};
}

/** The draw range of the first `share` of the trees (whole trees only). */
export function treeDrawRange(trees,share){const n=Math.max(1,Math.round(trees.length*share)),last=trees[n-1];return {start:0,count:last.firstIndex+last.indexCount,trees:n};}

export function createTreeMaterial(){return new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,metalness:0});}
