import * as THREE from 'three';
import {GeoBuilder,hash01} from './m01-area-geo.js';

// VII-a visual package: the tree line north of the area (layout.treeLine: only drawing, RECONSTRUCTED; no source gives the vegetation). One merged geometry, one draw call:
// pines (tall bent trunk, a crown of three or four lumpy blobs near the top), broadleaves (a short trunk and a crown of five or six overlapping blobs of different greens) and
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
    const pine=h(3)<.38,height=pine?10+h(4)*7:6.5+h(4)*5.5,green=GREENS[Math.floor(h(5)*GREENS.length)],light=lightOf(green),shade=.8+.4*h(6);
    if(pine){
      const trunkH=height*(.62+.1*h(7)),top=b.trunk(x,y,z,trunkH,.2+.05*h(8),.09,{sides:5,rings:3,bend:[(h(9)-.5)*1.4,(h(10)-.5)*1.4],color:[.20,.13,.08],seed:slot});
      const crownR=1.7+h(11)*1.4,blobs=3;
      for(let k=0;k<blobs;k++){
        const t=k/(blobs-1),ox=(h(20+k)-.5)*crownR*1.1,oz=(h(30+k)-.5)*crownR*1.1;
        b.blob(top[0]+ox,top[1]+(height-trunkH)*(.2+.55*t)-.4,top[2]+oz,crownR*(1.05-.35*t)*(.8+.4*h(40+k)),(height-trunkH)*.34,crownR*(1.05-.35*t)*(.8+.4*h(50+k)),
          {detail:1,seed:slot*7+k,lump:.30,bottom:[green[0]*.45,green[1]*.45,green[2]*.45],top:light,yaw:h(60+k)*6.28,shade});
      }
    }else{
      const trunkH=height*(.30+.1*h(7)),top=b.trunk(x,y,z,trunkH,.22+.1*h(8),.12,{sides:5,rings:2,bend:[(h(9)-.5)*.8,(h(10)-.5)*.8],color:[.19,.14,.10],seed:slot});
      const crownR=2.7+h(11)*2.6,blobs=5+Math.floor(h(12)*2),crownH=height-trunkH;
      for(let k=0;k<blobs;k++){
        const a=k/blobs*6.283+h(70)*3,ring=k===0?0:crownR*.62*(.55+.5*h(80+k)),g2=GREENS[Math.floor(h(90+k)*GREENS.length)],l2=lightOf(g2);
        b.blob(top[0]+Math.cos(a)*ring,top[1]+crownH*(k===0?.62:.2+.5*h(100+k)),top[2]+Math.sin(a)*ring,crownR*(.6+.3*h(110+k)),crownH*(.30+.12*h(120+k)),crownR*(.6+.3*h(130+k)),
          {detail:1,seed:slot*7+k,lump:.34,bottom:[g2[0]*.5,g2[1]*.5,g2[2]*.5],top:l2,yaw:h(140+k)*6.28,shade});
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
