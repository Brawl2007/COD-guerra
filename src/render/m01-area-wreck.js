import * as THREE from 'three';
import {GeoBuilder,valueNoise} from './m01-area-geo.js';

// VII-a visual package: the burnt-out armoured hull of the ~07:00 attack, drawn inside the simulation's two boxes (layout.wreck.boxes: lower hull and upper casemate). A generic hull:
// a sloped front and rear plate, a low sloped upper casemate, an open hatch, a blast hole and torn plate lying beside it, soot and rust. NO turret, no gun, no wheels or tracks, no
// markings: T08's single source gives neither the type nor the model (P9), so nothing here may identify one. Every hull vertex lies inside its box (the slopes cut the corners).
// One merged geometry, one draw call. Presentation only.
const SOOT=[.05,.046,.042],RUST=[.24,.12,.065],STEEL=[.13,.12,.105],CHAR=[.07,.063,.056];

const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function face(b,pts,color,centre,seed=0,groundY=0){
  // wound outward from the part's centre; flat shading comes from not sharing vertices
  const [p0,p1,p2]=pts,e1=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],e2=[p2[0]-p0[0],p2[1]-p0[1],p2[2]-p0[2]],n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];
  const mid=[0,1,2].map(k=>pts.reduce((s,p)=>s+p[k],0)/pts.length),out=n[0]*(mid[0]-centre[0])+n[1]*(mid[1]-centre[1])+n[2]*(mid[2]-centre[2]);
  const ordered=out<0?[...pts].reverse():pts;
  const idx=ordered.map(p=>{const t=Math.min(1,Math.max(0,(p[1]-groundY)/2.6)),v=.8+.4*valueNoise(p[0]*1.7+seed,p[2]*1.7+p[1]*2.1,seed+3),c=mix(color,SOOT,t*.55);return b.vertex(p[0],p[1],p[2],c[0]*v,c[1]*v,c[2]*v);});
  for(let k=1;k<idx.length-1;k++)b.tri(idx[0],idx[k],idx[k+1]);
}
/** A frustum between two rectangles (bottom {x0,x1,z0,z1,y}, top likewise) with a little seeded damage on the top corners; returns the top corners. */
function frustum(b,bot,top,{color=STEEL,jitter=0,seed=0,cap=true,sideColors=null,groundY=0}={}){
  const j=i=>jitter*(valueNoise(i*3.7+seed,seed*1.3,seed)-.5)*2;
  const B=[[bot.x0,bot.y,bot.z0],[bot.x1,bot.y,bot.z0],[bot.x1,bot.y,bot.z1],[bot.x0,bot.y,bot.z1]];
  const T=[[top.x0,top.y+j(1),top.z0],[top.x1,top.y+j(2),top.z0],[top.x1,top.y+j(3),top.z1],[top.x0,top.y+j(4),top.z1]];
  const centre=[(bot.x0+bot.x1+top.x0+top.x1)/4,(bot.y+top.y)/2,(bot.z0+bot.z1+top.z0+top.z1)/4];
  for(let k=0;k<4;k++){const n=(k+1)%4;face(b,[B[k],B[n],T[n],T[k]],sideColors?.[k]??color,centre,seed+k,groundY);}
  if(cap)face(b,[T[0],T[1],T[2],T[3]],mix(color,CHAR,.7),centre,seed+9,groundY);
  face(b,[B[0],B[1],B[2],B[3]],CHAR,centre,seed+8,groundY);
  return T;
}

/** Wreck geometry in world coordinates from the two simulation boxes (`hull` lower box, `upper` casemate box, as {min:[x,y,z],max:[x,y,z]}); the ground is hull.min[1]. */
export function buildWreckGeometry(hull,upper){
  const b=new GeoBuilder(),cx=(hull.min[0]+hull.max[0])/2,cz=(hull.min[2]+hull.max[2])/2,w=(hull.max[0]-hull.min[0])/2,d=(hull.max[2]-hull.min[2])/2,y0=hull.min[1],h=hull.max[1]-y0,e=.03,G=y0;
  // lower hull: almost vertical sides, then a sloped deck with a sloped front (+x) and rear (-x) plate up to the hull box's top
  const yMid=y0+h*.62,top=hull.max[1]-.02;
  frustum(b,{x0:cx-w+e,x1:cx+w-e,z0:cz-d+e,z1:cz+d-e,y:y0},{x0:cx-w+.06,x1:cx+w-.1,z0:cz-d+.03,z1:cz+d-.03,y:yMid},{color:RUST,seed:1,cap:false,sideColors:[CHAR,RUST,STEEL,RUST],groundY:G});
  frustum(b,{x0:cx-w+.06,x1:cx+w-.1,z0:cz-d+.03,z1:cz+d-.03,y:yMid},{x0:cx-w+.75,x1:cx+w-1.15,z0:cz-d+.2,z1:cz+d-.2,y:top},{color:STEEL,seed:2,jitter:.04,sideColors:[SOOT,RUST,STEEL,CHAR],groundY:G});
  // casemate: a low sloped box on the deck (the simulation's upper box), without a turret, gun or mantlet
  const u={x0:upper.min[0]+.02,x1:upper.max[0]-.02,z0:upper.min[2]+.02,z1:upper.max[2]-.02,y:upper.min[1]},uTopY=upper.max[1]-.02;
  const uTop=frustum(b,u,{x0:u.x0+.38,x1:u.x1-.38,z0:u.z0+.18,z1:u.z1-.18,y:uTopY},{color:STEEL,seed:3,jitter:.035,sideColors:[CHAR,STEEL,SOOT,RUST],groundY:G});
  // open hatch: a short ring on the roof and its lid thrown back
  const hx=(uTop[0][0]+uTop[1][0])/2-.1,hz=cz,hy=uTopY;
  for(let k=0;k<8;k++){const a0=k/8*6.283,a1=(k+1)/8*6.283,r=.26,r2=.22;
    face(b,[[hx+Math.cos(a0)*r,hy,hz+Math.sin(a0)*r],[hx+Math.cos(a1)*r,hy,hz+Math.sin(a1)*r],[hx+Math.cos(a1)*r2,hy+.07,hz+Math.sin(a1)*r2],[hx+Math.cos(a0)*r2,hy+.07,hz+Math.sin(a0)*r2]],RUST,[hx,hy,hz],20+k,G);}
  const lid=[[hx-.28,hy+.05,hz+.2],[hx+.2,hy+.05,hz+.2],[hx+.2,hy+.42,hz+.34],[hx-.28,hy+.42,hz+.34]];
  face(b,lid,STEEL,[hx,hy+.2,hz-.3],30,G);face(b,lid.map(p=>[p[0],p[1]+.025,p[2]-.015]),CHAR,[hx,hy+.2,hz+.8],31,G);
  // blast hole on the +z side of the deck plate (dark, slightly proud of it)
  const bz=cz+d-.2+.012,bx=cx-.2;
  face(b,[[bx-.34,yMid+.06,bz],[bx+.3,yMid+.04,bz],[bx+.22,top-.04,bz-.12],[bx-.28,top-.05,bz-.12]],[.006,.005,.004],[bx,yMid,cz],40,G);
  // a torn plate on the ground beside the hull and a smaller fragment near the rear (debris, outside the simulation's boxes by under a metre)
  const px=cx+w*.55,pz=cz+d+.95,pt=y0+.04;
  frustum(b,{x0:px-.7,x1:px+.7,z0:pz-.38,z1:pz+.38,y:pt},{x0:px-.66,x1:px+.62,z0:pz-.34,z1:pz+.3,y:pt+.07},{color:RUST,seed:5,jitter:.03,groundY:G});
  frustum(b,{x0:cx-w-.9,x1:cx-w-.2,z0:cz-d*.4,z1:cz-d*.4+.45,y:pt},{x0:cx-w-.85,x1:cx-w-.3,z0:cz-d*.4+.03,z1:cz-d*.4+.4,y:pt+.12},{color:STEEL,seed:6,jitter:.03,groundY:G});
  return b.build();
}
export function createWreckMaterial(){return new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.82,metalness:.32,flatShading:true});}
