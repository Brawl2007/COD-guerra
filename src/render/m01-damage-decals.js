import * as THREE from 'three';
import kit from '../../assets/models/provisional/m01/bridge-colliders.json' with {type:'json'};
import {visualNoise} from './m01-atmosphere.js';
import {eyePosition} from '../world/spatial.js';
import {TczewWorld} from '../world/tczew-world.js';

// Presentation-only battle damage for M01: bullet marks, blast scorch/craters, settled debris and embers.
// Every mark starts from an authoritative simulation event (round-impact, player-shot) or a saved damage record
// (sectors.damage). Nothing here decides hits, damage, visibility, events or mission state; it never reads the
// gameplay RNG and never writes to the simulation. Variation is a pure hash of event data (visualNoise).
// Marks are placed on an analytic model of the art that is actually drawn (exact terrain triangles, drawn boxes,
// trunk/tower polygons, bridge deck strips, track beds). Where no drawn surface matches the authoritative point,
// no mark is created rather than a floating one.
export const M01_DAMAGE_DECAL_VERSION='m01-environmental-damage-decal-pass-v1';

export const M01_DAMAGE_DECAL_LIMITS=Object.freeze({
  quality:Object.freeze({
    low:Object.freeze({marks:48,debris:64,embers:0,range:55,cluster:4}),
    medium:Object.freeze({marks:96,debris:128,embers:24,range:90,cluster:5}),
    high:Object.freeze({marks:144,debris:192,embers:40,range:130,cluster:6})
  }),
  // Persistent aftermath: saved blasts drawn at once, merged triangles and the share of the debris pool they may use.
  blasts:16,residueTriangles:6000,residueDebrisShare:.7,
  // Extra draw calls (marks, residue, debris, embers) and textures (colour atlas, height atlas).
  drawCalls:4,textures:2,
  // Marks smaller than ~1 px are never spawned: range = min(quality range, size × pxRange).
  pxRange:450,clusterRadius:.6,earthClusterRadius:1.1
});

// Visual surface kinds. `cells` index the 8×4 atlas of 64 px cells, `size` is the mark span in metres, `aspect`
// stretches along the surface grain (wood, rail) or along the incoming direction (earth, ballast), `life` is
// mission-clock seconds. `fx` names the existing impact FX that matches the drawn surface (sparks, splinters, chips)
// when the simulation reports another material for it (decks, joints and track beds are 'earth' to the simulation).
export const M01_SURFACE_PROFILES=Object.freeze({
  stone:Object.freeze({cells:[0,1],size:[.11,.18],aspect:1,life:180,spall:2,debris:'stone',fx:'stone'}),
  brick:Object.freeze({cells:[2,3],size:[.1,.2],aspect:1,life:180,spall:2,debris:'brick'}),
  wood:Object.freeze({cells:[4,5],size:[.07,.1],aspect:1.75,life:180,spall:1,debris:'splinter',grain:true,fx:'wood'}),
  bark:Object.freeze({cells:[4,5],size:[.065,.09],aspect:1.7,life:180,spall:1,debris:'splinter',grain:true,fx:'wood'}),
  sleeper:Object.freeze({cells:[4,5],size:[.075,.11],aspect:1.6,life:180,spall:1,debris:'splinter',grain:true,fx:'wood'}),   // creosoted oak: darker tint, blunter tear
  metal:Object.freeze({cells:[6],size:[.05,.075],aspect:1,life:200,spall:0,fx:'metal'}),
  rail:Object.freeze({cells:[7],size:[.045,.065],aspect:2.4,life:200,spall:0,grain:true,fx:'metal'}),
  earth:Object.freeze({cells:[8,9],size:[.2,.32],aspect:1.4,life:70,spall:2,debris:'clod',directional:true}),
  ballast:Object.freeze({cells:[10],size:[.2,.3],aspect:1.2,life:90,spall:2,debris:'gravel',directional:true,fx:'stone'}),
  road:Object.freeze({cells:[11],size:[.1,.15],aspect:1,life:150,spall:1,debris:'stone',fx:'stone'})
});
const CELL=Object.freeze({soot:12,charWood:13,sootRail:14,ember:15});
const BIG=Object.freeze({scorchA:0,scorchB:1,crater:2,ash:3});   // 128 px blocks in atlas rows 2–3

// ——— Drawn geometry this module must match (all in metres) ———
// M01View terrain: PlaneGeometry(2000,650,400,130).rotateX(-PI/2).translate(300,0,40); vertex y = terrainHeightAt.
export const M01_TERRAIN_MESH=Object.freeze({x0:-700,z0:-285,step:5,nx:400,nz:130,water:{x0:25,x1:265,top:-9.9}});
// Track beds: sleepers/tie plates/ballast from M01Environment.buildTracks, rails from M01View.buildTerrain.
export const M01_TRACK_BED=Object.freeze({ids:Object.freeze(['rail_embankment_west','rail_line_southwest','rail_line_east']),
  sleeperStep:1.35,sleeperHalfAlong:.115,sleeperHalfAcross:1.325,sleeperTop:.105,railOffset:.72,railHalf:.04,railTop:.18,
  railPiece:10,ballastHalf:1.3,ballastTop:.042,maxSegment:1800});
// Bridge decks (tools/assets/m01-bridges/src/bridges.mjs addRailDeck/addRoadDeck, LOD0): strips across the axis.
export const M01_DECK_LAYOUT=Object.freeze({
  rail:Object.freeze({axisZ:0,strips:Object.freeze([[-4.7,-3.7,-.25,'wood'],[-3.3,-.7,-.15,'wood'],[.7,3.3,-.15,'wood'],[3.7,4.7,-.25,'wood']]),
    rails:Object.freeze([-2.7175,-1.2825,1.2825,2.7175]),railHalf:.035,railTop:0}),
  road:Object.freeze({axisZ:40,strips:Object.freeze([[-2.565,2.565,0,'road'],[-2.965,-2.565,.2,'stone'],[2.565,2.965,.2,'stone']]),
    rails:Object.freeze([]),railHalf:0,railTop:0})
});
// West portals (portal() with x -4, thickness 5) and their towers (20-sided at LOD0): course r+.25 up to base+1.6,
// brick shaft r up to top-3.2, corbel r+.35 above. Road towers on piers 1–5: the same tower() translated to y -1.2.
export const M01_PORTALS=Object.freeze({
  rail:Object.freeze({ids:Object.freeze(['rail_portal_n','rail_portal_s','rail_portal_top']),x:-4,half:2.5,axisZ:0,halfWidth:7.2,
    opening:4.2,spring:5,apex:8.4,base:-1,top:11.5,tower:Object.freeze({r:2.6,dz:9.3,base:-1,top:15})}),
  road:Object.freeze({ids:Object.freeze(['road_portal_n','road_portal_s','road_portal_top']),x:-4,half:2.5,axisZ:40,halfWidth:4.6,
    opening:3,spring:4.8,apex:8.6,base:-1,top:12.5,tower:Object.freeze({r:3,dz:7.1,base:-1,top:17})})
});
export const M01_ROAD_TOWER=Object.freeze({r:2.65,base:-1.2,top:21.8,segments:20});
const TOWER_SEGMENTS=20,TRUNK_SEGMENTS=10,PIER_CAP=-1.8;

const v3=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b,s=1)=>v3(a.x+b.x*s,a.y+b.y*s,a.z+b.z*s);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>v3(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const len=a=>Math.hypot(a.x,a.y,a.z);
const unit=a=>{const l=len(a)||1;return v3(a.x/l,a.y/l,a.z/l);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

/** Deterministic 32-bit seed from event data (quantised to millimetres/milliseconds). */
export function m01DecalSeed(...values){
  let h=0x811c9dc5;
  for(const value of values){
    const n=typeof value==='number'?Math.round(value*1000):[...String(value)].reduce((s,c)=>Math.imul(s^c.charCodeAt(0),0x01000193),0x9e3779b1);
    h=Math.imul(h^(n>>>0),0x01000193);h^=h>>>15;
  }
  return h>>>0;
}

// ——— Terrain (exact) ———
/** Height of the drawn terrain mesh at x/z (the same two triangles per 5 m cell as PlaneGeometry), or null outside. */
export function renderedTerrainHeight(world,x,z){
  const g=M01_TERRAIN_MESH,fx=(x-g.x0)/g.step,fz=(z-g.z0)/g.step;
  if(!(fx>=0&&fz>=0&&fx<=g.nx&&fz<=g.nz))return null;
  const ix=Math.min(g.nx-1,Math.floor(fx)),iz=Math.min(g.nz-1,Math.floor(fz)),u=fx-ix,v=fz-iz;
  const h=(i,j)=>world.terrainHeightAt(g.x0+i*g.step,g.z0+j*g.step);
  if(u+v<=1){const a=h(ix,iz),b=h(ix,iz+1),d=h(ix+1,iz);return a+(d-a)*u+(b-a)*v;}
  const b=h(ix,iz+1),c=h(ix+1,iz+1),d=h(ix+1,iz);return c+(b-c)*(1-u)+(d-c)*(1-v);
}
/** Terrain triangle (world vertices, unit normal) under x/z. */
function terrainTriangle(world,x,z){
  const g=M01_TERRAIN_MESH,fx=(x-g.x0)/g.step,fz=(z-g.z0)/g.step;
  if(!(fx>=0&&fz>=0&&fx<=g.nx&&fz<=g.nz))return null;
  const ix=Math.min(g.nx-1,Math.floor(fx)),iz=Math.min(g.nz-1,Math.floor(fz));
  return cellTriangles(world,ix,iz)[(fx-ix)+(fz-iz)<=1?0:1];
}
function cellTriangles(world,ix,iz){
  const g=M01_TERRAIN_MESH,p=(i,j)=>{const x=g.x0+i*g.step,z=g.z0+j*g.step;return v3(x,world.terrainHeightAt(x,z),z);};
  const a=p(ix,iz),b=p(ix,iz+1),c=p(ix+1,iz+1),d=p(ix+1,iz);
  const tri=(p0,p1,p2)=>{const n=unit(cross(add(p1,p0,-1),add(p2,p0,-1)));return {v:[p0,p1,p2],n:n.y<0?v3(-n.x,-n.y,-n.z):n};};
  return [tri(a,b,d),tri(b,c,d)];
}
const underWater=(x,y)=>x>M01_TERRAIN_MESH.water.x0&&x<M01_TERRAIN_MESH.water.x1&&y<M01_TERRAIN_MESH.water.top+.03;

// ——— Track beds ———
const SEGMENTS=new WeakMap();
// M01Environment.buildTracks and M01View.buildTerrain sample heightAt once, on the fresh mission world (menu render).
// Demolitions later remove walkable colliders, but the drawn sleepers and rails keep those original heights.
let DRAWN_WORLD=null;
const drawnHeight=(x,z)=>(DRAWN_WORLD??=new TczewWorld()).heightAt(x,z);
function trackSegments(world){
  if(SEGMENTS.has(world.layout))return SEGMENTS.get(world.layout);
  const list=[];
  for(const id of M01_TRACK_BED.ids){
    const points=world.features.get(id)?.polyline??[];
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);
      if(length>M01_TRACK_BED.maxSegment||length<1e-6)continue;
      list.push({id:`${id}:${i}`,ax:a[0],az:a[2],ux:dx/length,uz:dz/length,length,pieces:Math.ceil(length/M01_TRACK_BED.railPiece)});
    }
  }
  SEGMENTS.set(world.layout,list);return list;
}
/** Track-bed sub-surface at x/z: rail head, sleeper top or ballast, with the art's own heights. */
export function trackBedAt(world,x,z){
  const T=M01_TRACK_BED;let best=null;
  for(const s of trackSegments(world)){
    const along=(x-s.ax)*s.ux+(z-s.az)*s.uz,lateral=-(x-s.ax)*s.uz+(z-s.az)*s.ux;
    if(along<-T.ballastHalf||along>s.length+T.ballastHalf||Math.abs(lateral)>T.ballastHalf)continue;
    if(best&&Math.abs(lateral)>=Math.abs(best.lateral))continue;
    best={segment:s,along,lateral};
  }
  if(!best)return null;
  const {segment:s,along,lateral}=best,at=d=>v3(s.ax+s.ux*d,0,s.az+s.uz*d),left=v3(-s.uz,0,s.ux);
  for(const offset of [-T.railOffset,T.railOffset]){
    if(Math.abs(lateral-offset)>T.railHalf||along<0||along>s.length)continue;
    const k=clamp(Math.floor(along/(s.length/s.pieces)),0,s.pieces-1),c=at(s.length*(k+.5)/s.pieces);
    const cx=c.x+left.x*offset,cz=c.z+left.z*offset,top=drawnHeight(cx,cz)+T.railTop;
    return {kind:'rail',y:top,segment:s,along,lateral,center:v3(x-left.x*(lateral-offset),top,z-left.z*(lateral-offset)),
      halfU:T.railHalf,halfV:Infinity,axisU:left,axisV:v3(s.ux,0,s.uz),id:`${s.id}:rail${offset<0?'L':'R'}`};
  }
  const j=Math.round(along/T.sleeperStep),d=j*T.sleeperStep;
  if(j>=0&&d<s.length&&Math.abs(along-d)<=T.sleeperHalfAlong&&Math.abs(lateral)<=T.sleeperHalfAcross){
    const c=at(d),top=drawnHeight(c.x,c.z)+T.sleeperTop;
    return {kind:'sleeper',y:top,segment:s,along,lateral,center:v3(c.x,top,c.z),halfU:T.sleeperHalfAcross,halfV:T.sleeperHalfAlong,
      axisU:left,axisV:v3(s.ux,0,s.uz),id:`${s.id}:sleeper${j}`};
  }
  const ground=drawnHeight(x,z)+T.ballastTop;
  return {kind:'ballast',y:ground,segment:s,along,lateral,center:v3(x-left.x*lateral,ground,z-left.z*lateral),halfU:T.ballastHalf,halfV:Infinity,
    axisU:left,axisV:v3(s.ux,0,s.uz),id:`${s.id}:ballast`};
}

// ——— Bridge decks, joints and the west abutments (walkable surfaces) ———
function deckLayoutFor(id){return id.startsWith('rail_collider_deck')?M01_DECK_LAYOUT.rail:id.startsWith('road_collider_deck')?M01_DECK_LAYOUT.road:null;}
/** Visual top under x/z of a walkable bridge surface, or null; `gap` when the rail deck is open there. */
export function deckSurfaceAt(world,x,z){
  const surfaces=world.walkSurfaces.filter(c=>x>=c.min.x&&x<=c.max.x&&z>=c.min.z&&z<=c.max.z);
  if(!surfaces.length)return null;
  const c=surfaces.reduce((a,b)=>b.max.y>a.max.y?b:a);
  if(c.material==='metal')return {kind:'metal',y:c.max.y,surface:c,rect:{x0:c.min.x,x1:c.max.x,z0:c.min.z,z1:c.max.z},grain:'x',id:c.id};
  if(c.id.includes('abutment'))return {kind:'stone',y:c.max.y,surface:c,rect:{x0:c.min.x,x1:c.max.x,z0:c.min.z,z1:c.max.z},id:c.id};
  const layout=deckLayoutFor(c.id);if(!layout)return null;
  const local=z-layout.axisZ;
  for(const r of layout.rails)if(Math.abs(local-r)<=layout.railHalf+.012)
    return {kind:'rail',y:layout.railTop,surface:c,rect:{x0:c.min.x,x1:c.max.x,z0:layout.axisZ+r-layout.railHalf,z1:layout.axisZ+r+layout.railHalf},grain:'x',id:`${c.id}:rail${r}`};
  // Strips are listed road surface first so curbs win where they overlap its edges.
  let strip=null;for(const s of layout.strips)if(local>=s[0]&&local<=s[1]&&(!strip||s[2]>strip[2]))strip=s;
  if(!strip)return {kind:'gap',y:null,surface:c,id:c.id};
  return {kind:strip[3],y:strip[2],surface:c,rect:{x0:c.min.x,x1:c.max.x,z0:layout.axisZ+strip[0],z1:layout.axisZ+strip[1]},grain:strip[3]==='wood'?'x':null,id:`${c.id}:${strip[0]}`};
}

// ——— Boxes, polygons and portals ———
function boxFace(b,p,dir,tol=.015){
  let best=null;
  for(const axis of ['x','y','z'])for(const sign of [-1,1]){
    const value=sign<0?b.min[axis]:b.max[axis],gap=Math.abs(p[axis]-value);if(gap>tol)continue;
    if(['x','y','z'].some(a=>a!==axis&&(p[a]<b.min[a]-tol||p[a]>b.max[a]+tol)))continue;
    const n=v3();n[axis]=sign;const facing=dir?-dot(n,dir):0;if(dir&&facing<-.02)continue;
    const score=gap-facing*.01;if(!best||score<best.score)best={axis,sign,value,normal:n,score};
  }
  return best;
}
const FACE_AXES={x:['z','y'],z:['x','y'],y:['x','z']};
/**
 * Regular polygon prism/cone surface (CylinderGeometry, thetaStart 0) at height y along the radial direction to p.
 * A point closer than `keep` to a facet edge slides back along that facet (by at most `keep`) so a mark can fit.
 */
function polygonSurface(center,radius,segments,p,keep=0){
  const phi=Math.atan2(p.x-center.x,p.z-center.z),step=Math.PI*2/segments;
  const k=Math.floor(((phi%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/step),mid=(k+.5)*step;
  const apothem=radius*Math.cos(step/2),half=radius*Math.sin(step/2),room=Math.max(0,half-keep);
  const t=clamp(apothem*Math.tan(phi-mid),-room,room),n=v3(Math.sin(mid),0,Math.cos(mid));   // tangent (cos mid,0,-sin mid)
  return {point:v3(center.x+n.x*apothem+Math.cos(mid)*t,p.y,center.z+n.z*apothem-Math.sin(mid)*t),normal:n,halfU:half-Math.abs(t),facet:k};
}
function towerRadius(t,y){const course=t.base+1.6,shaft=t.top-3.2;return y<course?t.r+.25:y<shaft?t.r:t.top-1.2>y?t.r+.35:null;}
function towerSurface(t,center,p,kindAt){
  const r=towerRadius(t,p.y);if(r===null||p.y<t.base)return null;
  const s=polygonSurface(center,r,TOWER_SEGMENTS,p);
  const course=t.base+1.6,shaft=t.top-3.2,lo=p.y<course?t.base:p.y<shaft?course:shaft,hi=p.y<course?course:p.y<shaft?shaft:t.top-1.2;
  return {kind:kindAt(p.y<course),point:s.point,normal:s.normal,up:v3(0,1,0),halfU:s.halfU,vRange:[lo,hi],id:`facet${s.facet}`};
}
/**
 * Where a round meets a drawn tower. A tower's square collider corner can stand over a metre in front of the round
 * shaft, so with a known direction follow the round's own path to the shaft (up to `reach` metres; a round that
 * visually passes beside the tower gets no mark); otherwise project radially.
 */
function towerHit(t,center,p,dir,kindAt,reach=1.6){
  const r=towerRadius(t,p.y);if(r===null||p.y<t.base)return null;
  let q=p;const h=dir?Math.hypot(dir.x,dir.z):0;
  if(h>1e-3){
    const ux=dir.x/h,uz=dir.z/h,ox=p.x-center.x,oz=p.z-center.z,R=r*(1+Math.cos(Math.PI/TOWER_SEGMENTS))/2;
    const b=ox*ux+oz*uz,disc=b*b-(ox*ox+oz*oz-R*R);if(disc<0)return null;
    const travel=-b-Math.sqrt(disc);if(travel<-.35||travel>reach)return null;
    q=v3(p.x+ux*travel,p.y+dir.y/h*travel,p.z+uz*travel);
  }else if(Math.hypot(p.x-center.x,p.z-center.z)>r+.75)return null;
  const s=towerSurface(t,center,q,kindAt);
  if(!s||Math.hypot(s.point.x-q.x,s.point.z-q.z)>(h>1e-3?.12:.75)||dir&&dot(s.normal,dir)>.05)return null;
  return s;
}
function portalSurface(portal,box,p,dir){
  const t=portal.tower,brick=course=>course?'stone':'brick';
  for(const side of [-1,1]){
    const center=v3(portal.x,0,portal.axisZ+side*t.dz);if(Math.hypot(p.x-center.x,p.z-center.z)>t.r+1.4)continue;
    const s=towerHit(t,center,p,dir,brick);if(s)return {...s,receiver:{type:'portal',id:box.id,part:`tower${side}`}};
  }
  const local=p.z-portal.axisZ;
  if(Math.abs(local)>portal.halfWidth||p.y>portal.top||p.y<portal.base)return null;
  const face=boxFace(box,p,dir,.02);
  if(face?.axis==='x'){
    const x=portal.x+face.sign*portal.half;if(Math.abs(x-p.x)>.75)return null;
    if(Math.abs(local)<portal.opening&&p.y<portal.apex)return null;   // under the arch: no masonry at this face
    // Beside the opening the mark stays on that pier of the wall; above it, on the spandrel over the apex.
    const side=Math.abs(local)>=portal.opening,sign=Math.sign(local)||1;
    return {kind:'brick',point:v3(x,p.y,p.z),normal:v3(face.sign,0,0),up:v3(0,1,0),halfU:Infinity,vRange:[side?portal.base:portal.apex,portal.top],
      uRange:side?[portal.axisZ+Math.min(sign*portal.opening,sign*portal.halfWidth),portal.axisZ+Math.max(sign*portal.opening,sign*portal.halfWidth)]:
        [portal.axisZ-portal.halfWidth,portal.axisZ+portal.halfWidth],receiver:{type:'portal',id:box.id,part:'wall'}};
  }
  if(face?.axis==='z'&&Math.abs(Math.abs(local)-portal.opening)<.03&&p.y<portal.spring){   // jamb inside the opening
    const sign=local>0?-1:1;
    return {kind:'brick',point:v3(p.x,p.y,portal.axisZ+Math.sign(local)*portal.opening),normal:v3(0,0,sign),up:v3(0,1,0),halfU:Infinity,
      vRange:[portal.base,portal.spring],uRange:[portal.x-portal.half,portal.x+portal.half],receiver:{type:'portal',id:box.id,part:'jamb'}};
  }
  return null;
}
function pierSurface(box,p,dir){
  const face=boxFace(box,p,dir,.02);if(face?.axis!=='x'||p.y>PIER_CAP||underWater(p.x,p.y))return null;
  return {kind:'stone',point:v3(face.value,p.y,p.z),normal:face.normal,up:v3(0,1,0),halfU:Infinity,vRange:[box.min.y,PIER_CAP],
    uRange:[box.min.z,box.max.z],receiver:{type:'pier',id:box.id}};
}
const TRUNK_MATRIX=new THREE.Matrix4(),TRUNK_INVERSE=new THREE.Matrix4(),TRUNK_NORMAL=new THREE.Matrix3();
const TRUNK_Q=new THREE.Quaternion(),TRUNK_E=new THREE.Euler(),TRUNK_V=new THREE.Vector3(),TRUNK_S=new THREE.Vector3();
/** The near-LOD trunk of M01Environment.appendTrunk: CylinderGeometry(.58,1,1,10) scaled (r,.68h,r), leaned and yawed. */
function trunkSurface(t,p){
  TRUNK_E.set(t.leanZ,t.yaw,-t.leanX);TRUNK_Q.setFromEuler(TRUNK_E);
  TRUNK_MATRIX.compose(TRUNK_V.set(t.x+t.leanX*t.height*.15,t.y+t.height*.34,t.z+t.leanZ*t.height*.15),TRUNK_Q,TRUNK_S.set(t.radius,t.height*.68,t.radius));
  TRUNK_INVERSE.copy(TRUNK_MATRIX).invert();
  const local=new THREE.Vector3(p.x,p.y,p.z).applyMatrix4(TRUNK_INVERSE);
  if(local.y<-.47||local.y>.42)return null;   // keep clear of the root flare and the crown
  // Local units are trunk radii: keep room for the widest bark mark (≤5 cm of slide towards the facet centre).
  const radius=lerp(1,.58,local.y+.5),keep=Math.min(radius*Math.sin(Math.PI/TRUNK_SEGMENTS)*.9,M01_SURFACE_PROFILES.bark.size[1]*.55/t.radius);
  const s=polygonSurface(v3(0,0,0),radius,TRUNK_SEGMENTS,{x:local.x,y:local.y,z:local.z},keep);
  const world=new THREE.Vector3(s.point.x,local.y,s.point.z).applyMatrix4(TRUNK_MATRIX);
  if(world.distanceTo(TRUNK_V.set(p.x,p.y,p.z))>.35)return null;
  TRUNK_NORMAL.getNormalMatrix(TRUNK_MATRIX);
  const n=new THREE.Vector3(s.normal.x,.42,s.normal.z).applyMatrix3(TRUNK_NORMAL).normalize();   // cone side: radius falls .42 per unit height
  const axis=new THREE.Vector3(0,1,0).applyQuaternion(TRUNK_Q);
  return {kind:'bark',point:v3(world.x,world.y,world.z),normal:v3(n.x,n.y,n.z),up:v3(axis.x,axis.y,axis.z),
    halfU:s.halfU*t.radius,vRange:null,receiver:{type:'tree',id:t.id}};
}

/**
 * Where a mark can sit for an authoritative impact point: a drawn surface, its kind and frame, or null.
 * `dir` is the incoming direction (unit), `trees` the M01Environment tree descriptors. Pure: no state is written.
 */
export function m01VisualSurface(world,point,{dir=null,trees=null,material=null}={}){
  if(!point||![point.x,point.y,point.z].every(Number.isFinite)||material==='character'||!material)return null;
  const p=v3(point.x,point.y,point.z);
  const candidates=world.obstacles.filter(b=>p.x>=b.min.x-.02&&p.x<=b.max.x+.02&&p.y>=b.min.y-.02&&p.y<=b.max.y+.02&&p.z>=b.min.z-.02&&p.z<=b.max.z+.02);
  for(const hit of candidates){
    const s=obstacleSurface(world,hit,p,dir,trees);if(s)return {...s,simMaterial:material};
  }
  if(candidates.length||material!=='earth')return null;
  const side=abutmentFace(world,p,dir);if(side)return {...side,simMaterial:material};
  const g=m01VisibleGround(world,p.x,p.z,p.y,1,.6);if(!g)return null;
  const point2=v3(p.x,g.y,p.z);
  if(g.type==='terrain')return {kind:'earth',point:point2,normal:terrainTriangle(world,p.x,p.z).n,up:null,terrain:true,receiver:{type:'terrain',id:'terrain'},simMaterial:material};
  if(g.type==='track')return {...trackMark(g.bed,point2),receiver:{type:'track',id:g.bed.id},simMaterial:material};
  return {kind:g.kind,point:point2,normal:v3(0,1,0),up:g.grain==='x'?v3(1,0,0):null,rect:g.rect,receiver:{type:g.type,id:g.id,part:g.part??''},simMaterial:material};
}
/**
 * Drawn horizontal surfaces at x/z: terrain mesh, bridge deck strips/joints/abutment tops, the authored damaged
 * abutments and the track bed. The visible one is the highest within [refY-below, refY+above] of the reference.
 */
function groundCandidates(world,x,z){
  const out=[],mesh=renderedTerrainHeight(world,x,z);
  if(mesh!==null&&!underWater(x,mesh))out.push({type:'terrain',y:mesh,kind:'earth'});
  const deck=deckSurfaceAt(world,x,z);
  if(deck&&deck.kind!=='gap')out.push({type:deck.surface.id.includes('abutment')?'abutment':'deck',y:deck.y,kind:deck.kind,rect:deck.rect,grain:deck.grain,id:deck.surface.id,part:deck.id});
  for(const a of damagedAbutments(world))if(x>=a.x0&&x<=a.x1&&z>=a.z0&&z<=a.z1)
    out.push({type:'abutment',y:a.y,kind:'stone',rect:{x0:a.x0,x1:a.x1,z0:a.z0,z1:a.z1},id:a.id,part:a.id,after:a.after});
  const bed=trackBedAt(world,x,z);if(bed)out.push({type:'track',y:bed.y,kind:bed.kind,bed,id:bed.id});
  return out;
}
export function m01VisibleGround(world,x,z,refY=null,below=1.2,above=.9){
  const lo=refY===null?-Infinity:refY-below,hi=refY===null?Infinity:refY+above;let best=null;
  for(const c of groundCandidates(world,x,z))if(c.y>=lo&&c.y<=hi&&(!best||c.y>best.y))best=c;
  return best;
}
/** A round that the terrain march stopped inside a west abutment came through one of its drawn stone faces. */
function abutmentFace(world,p,dir){
  for(const c of world.walkSurfaces){
    if(!c.id.includes('abutment')||p.x<c.min.x-.02||p.x>c.max.x+.02||p.z<c.min.z-.02||p.z>c.max.z+.02||p.y>c.max.y-.05||p.y<c.min.y)continue;
    let best=null;
    for(const axis of ['x','z'])for(const sign of [-1,1]){
      const n=v3();n[axis]=sign;if(dir&&dot(n,dir)>-.05)continue;
      const value=sign<0?c.min[axis]:c.max[axis],gap=Math.abs(p[axis]-value);if(gap<=.6&&(!best||gap<best.gap))best={axis,sign,value,normal:n,gap};
    }
    if(!best)continue;
    const point=v3(p.x,p.y,p.z);point[best.axis]=best.value;
    const ground=renderedTerrainHeight(world,point.x+best.normal.x*.05,point.z+best.normal.z*.05);
    if(ground!==null&&point.y<ground+.05)continue;   // that part of the face is buried under the drawn embankment
    const [u]=FACE_AXES[best.axis];
    return {kind:'stone',point,normal:best.normal,up:v3(0,1,0),uRange:[c.min[u],c.max[u]],vRange:[Math.max(c.min.y,ground??c.min.y),c.max.y],uAxis:u,vAxis:'y',
      receiver:{type:'abutment-face',id:c.id,axis:best.axis,sign:best.sign,value:best.value}};
  }
  return null;
}
function obstacleSurface(world,hit,p,dir,trees){
  const id=hit.id??'';
  if(id.startsWith('m01_tree_')){const t=trees?.find(d=>d.id===id);return t?trunkSurface(t,p):null;}
  if(id.includes('_collider_tower_')){
    const s=towerHit(M01_ROAD_TOWER,v3((hit.min.x+hit.max.x)/2,0,(hit.min.z+hit.max.z)/2),p,dir,course=>course?'stone':'brick');
    return s&&{...s,receiver:{type:'tower',id}};
  }
  if(id.includes('_collider_pier_'))return pierSurface(hit,p,dir);
  const portal=Object.values(M01_PORTALS).find(q=>q.ids.includes(id));if(portal)return portalSurface(portal,hit,p,dir);
  // Station, huts and covers are drawn as these very boxes (M01View.syncSolids): exact faces.
  if(!world.buildings.includes(hit)&&!world.covers.includes(hit))return null;
  const face=boxFace(hit,p,dir);if(!face||face.axis==='y'&&face.sign<0)return null;
  const [u,v]=FACE_AXES[face.axis],kind=hit.material==='brick'?'brick':hit.material==='wood'?'wood':hit.material==='earth'?'earth':'stone';
  const point=v3(p.x,p.y,p.z);point[face.axis]=face.value;
  return {kind,point,normal:face.normal,up:face.axis==='y'?null:v3(0,1,0),uRange:[hit.min[u],hit.max[u]],vRange:[hit.min[v],hit.max[v]],uAxis:u,vAxis:v,
    receiver:{type:'box',id:hit.id,axis:face.axis,sign:face.sign,value:face.value}};
}
function trackMark(bed,point){
  // Sleeper grain runs across the track, rail scrapes along the head; ballast scuffs follow the incoming round.
  const up=bed.kind==='sleeper'?bed.axisU:bed.kind==='rail'?bed.axisV:null;
  return {kind:bed.kind,point:bed.kind==='rail'?v3(bed.center.x,bed.y,bed.center.z):v3(point.x,bed.y,point.z),normal:v3(0,1,0),up,track:bed};
}

/**
 * The player's ground hits come from a terrain march with steps of up to 1.2 m, and at the west bridgehead the
 * walkable abutment lies 0.35 m under the drawn embankment. Walk back along the same eye→point ray and return
 * where it first meets the drawn ground (presentation only; the authoritative point is unchanged).
 */
export function refineGroundPoint(world,eye,point,back=3,step=.05){
  const dx=point.x-eye.x,dy=point.y-eye.y,dz=point.z-eye.z,dist=Math.hypot(dx,dy,dz);if(!(dist>1e-6&&dist<5000))return point;   // also NaN/Infinity
  const at=t=>v3(eye.x+dx/dist*t,eye.y+dy/dist*t,eye.z+dz/dist*t);
  const above=t=>{const q=at(t),g=m01VisibleGround(world,q.x,q.z,point.y,1,.6);return g?q.y-g.y:1;};
  let lo=Math.max(0,dist-back);if(above(lo)<=0)return point;
  for(let t=lo+step;t<=dist+1e-9;t+=step){
    if(above(t)>0){lo=t;continue;}
    let hi=t;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(above(mid)>0)lo=mid;else hi=mid;}
    return at(hi);
  }
  return point;
}

// ——— Mark placement (pure) ———
const DECAL_OFFSET=.004,TERRAIN_OFFSET=.008,MAX_TERRAIN_GAP=.012;
/**
 * Fit a mark of size u×v on a surface: returns {position,normal,axisU,axisV,sizeU,sizeV} or null if no drawn surface
 * can hold at least 45 % of it (avoids overhanging edges, terrain creases and floating corners).
 */
export function fitMark(world,surface,{sizeU,sizeV,roll=0,along=null}){
  const n=unit(surface.normal);
  let V=surface.up?unit(add(surface.up,n,-dot(surface.up,n))):null;
  if(!V&&along){const a=add(along,n,-dot(along,n));if(len(a)>1e-4)V=unit(a);}
  if(!V){const ref=Math.abs(n.y)<.9?v3(0,1,0):v3(1,0,0);V=unit(add(ref,n,-dot(ref,n)));}
  let U=unit(cross(V,n));
  if(roll){const c=Math.cos(roll),s=Math.sin(roll),U2=add(v3(U.x*c,U.y*c,U.z*c),V,s),V2=add(v3(V.x*c,V.y*c,V.z*c),U,-s);U=U2;V=V2;}
  for(const scale of [1,.8,.62,.45]){
    const su=sizeU*scale,sv=sizeV*scale;let p=v3(surface.point.x,surface.point.y,surface.point.z);
    const corners=()=>[[-1,-1],[1,-1],[1,1],[-1,1],[0,-1],[0,1],[-1,0],[1,0]].map(([a,b])=>add(add(p,U,a*su/2),V,b*sv/2));
    if(surface.uRange||surface.vRange||surface.rect||surface.halfU!==undefined||surface.track){
      p=clampToBounds(surface,p,U,V,su,sv);if(!p)continue;
    }
    if(surface.terrain){
      // Signed distance of the drawn terrain from the mark plane at its corners/edges (across a triangle crease):
      // never sink below a concave crease, never float more than MAX_TERRAIN_GAP over a convex one.
      let above=0,below=0;
      for(const c of corners()){const h=renderedTerrainHeight(world,c.x,c.z);if(h===null){below=Infinity;break;}
        const gap=(h-c.y)*n.y;above=Math.max(above,gap);below=Math.max(below,-gap);}
      if(above>MAX_TERRAIN_GAP||below>MAX_TERRAIN_GAP)continue;
      return {position:add(p,n,TERRAIN_OFFSET+above),normal:n,axisU:U,axisV:V,sizeU:su,sizeV:sv,scale};
    }
    return {position:add(p,n,DECAL_OFFSET),normal:n,axisU:U,axisV:V,sizeU:su,sizeV:sv,scale};
  }
  return null;
}
function clampToBounds(surface,p,U,V,su,sv){
  // Half extent of the rotated mark along world axes (its bounding box on the receiving plane).
  const ext=axis=>Math.abs(U[axis])*su/2+Math.abs(V[axis])*sv/2;
  const q=v3(p.x,p.y,p.z);
  const fit=(axis,lo,hi)=>{const e=ext(axis);if(hi-lo<2*e-1e-6)return false;q[axis]=clamp(q[axis],lo+e,hi-e);return true;};
  if(surface.rect){if(!fit('x',surface.rect.x0,surface.rect.x1)||!fit('z',surface.rect.z0,surface.rect.z1))return null;}
  if(surface.uAxis){if(!fit(surface.uAxis,...surface.uRange)||!fit(surface.vAxis,...surface.vRange))return null;}
  else{
    if(surface.uRange){const axis=Math.abs(surface.normal.x)>.5?'z':'x';if(!fit(axis,...surface.uRange))return null;}
    if(surface.vRange&&!fit('y',...surface.vRange))return null;
    if(surface.halfU!==undefined&&surface.halfU!==Infinity){const e=Math.abs(dot(U,horizontal(surface.normal)))*su/2+Math.abs(dot(V,horizontal(surface.normal)))*sv/2;if(e>surface.halfU+1e-6)return null;}
  }
  if(surface.track){
    const b=surface.track,e=Math.abs(dot(U,b.axisU))*su/2+Math.abs(dot(V,b.axisU))*sv/2,eAlong=Math.abs(dot(U,b.axisV))*su/2+Math.abs(dot(V,b.axisV))*sv/2;
    const lateral=dot(add(q,b.center,-1),b.axisU),along=dot(add(q,b.center,-1),b.axisV);
    if(e>b.halfU+1e-6||(b.halfV!==Infinity&&eAlong>b.halfV+1e-6))return null;
    const nl=clamp(lateral,-b.halfU+e,b.halfU-e),na=b.halfV===Infinity?along:clamp(along,-b.halfV+eAlong,b.halfV-eAlong);
    return v3(b.center.x+b.axisU.x*nl+b.axisV.x*na,q.y,b.center.z+b.axisU.z*nl+b.axisV.z*na);
  }
  return q;
}
const horizontal=n=>unit(v3(-n.z,0,n.x));

// ——— Blast aftermath (pure) ———
const BLAST=Object.freeze({
  grenade:Object.freeze({radius:1.7,cell:BIG.scorchB,faceRange:2.4,faceSize:1.7,debris:12,debrisSize:[.02,.06],embers:4,emberLife:24,tint:[1,1,1,.9]}),
  bomb:Object.freeze({radius:5.4,cell:BIG.crater,faceRange:12,faceSize:6.5,debris:30,debrisSize:[.05,.24],embers:9,emberLife:80,tint:[1,1,1,.95]}),
  demolition:Object.freeze({radius:13,cell:BIG.scorchB,faceRange:0,faceSize:0,debris:30,debrisSize:[.12,.45],embers:10,emberLife:120,tint:[.72,.7,.68,1]})
});
const SCRIPTED_BOMBS=new Set(['station_bomb','forward_post','repair_crater','raid_0530']);
export function m01BlastKind(id=''){
  if(id.startsWith('m01_grenade_'))return 'grenade';
  if(id.endsWith('_demolition'))return 'demolition';
  if(SCRIPTED_BOMBS.has(id)||/bomb|raid|crater/.test(id))return 'bomb';
  return 'grenade';
}
const blastSeed=d=>m01DecalSeed(d.id,d.x,d.z,d.started);
const atlasBlock=(index,inset=.012)=>{const u0=index*.25,v0=.5;return {u0:u0+inset*.25,u1:u0+.25-inset*.25,v0:v0+inset*.5,v1:v0+.5-inset*.5};};
function blastUv(cx,cz,radius,angle,block){
  const c=Math.cos(angle),s=Math.sin(angle);
  return (x,z)=>{const dx=(x-cx)/(2*radius),dz=(z-cz)/(2*radius),u=dx*c-dz*s+.5,v=dx*s+dz*c+.5;
    return [lerp(block.u0,block.u1,u),lerp(block.v0,block.v1,v)];};
}
function clipPolygon(points,inside,intersect){
  let out=points;
  for(const [test,cut] of inside){
    const input=out;out=[];if(!input.length)break;
    for(let i=0;i<input.length;i++){
      const a=input[i],b=input[(i+1)%input.length],ia=test(a),ib=test(b);
      if(ia){out.push(a);if(!ib)out.push(intersect(a,b,cut));}else if(ib)out.push(intersect(a,b,cut));
    }
  }
  return out;
}
/** Clip a planar polygon (xz footprint) to the square |x-cx|,|z-cz| <= r; y stays linear on the plane. */
function clipSquare(points,cx,cz,r){
  const edges=[[p=>p.x>=cx-r,['x',cx-r]],[p=>p.x<=cx+r,['x',cx+r]],[p=>p.z>=cz-r,['z',cz-r]],[p=>p.z<=cz+r,['z',cz+r]]];
  return clipPolygon(points,edges,(a,b,[axis,value])=>{const t=(value-a[axis])/(b[axis]-a[axis]);return v3(lerp(a.x,b.x,t),lerp(a.y,b.y,t),lerp(a.z,b.z,t));});
}
function clipRect(points,uAxis,vAxis,u0,u1,v0,v1){
  const edges=[[p=>p[uAxis]>=u0,[uAxis,u0]],[p=>p[uAxis]<=u1,[uAxis,u1]],[p=>p[vAxis]>=v0,[vAxis,v0]],[p=>p[vAxis]<=v1,[vAxis,v1]]];
  return clipPolygon(points,edges,(a,b,[axis,value])=>{const t=(value-a[axis])/(b[axis]-a[axis]);return v3(lerp(a.x,b.x,t),lerp(a.y,b.y,t),lerp(a.z,b.z,t));});
}
/** Destroyed bridge parts that anchor a demolition's residue (piers, towers, abutments; decks fall with them). */
function demolitionAnchors(id){
  const event=`evt_m01_${id}`;
  return kit.boxes.filter(b=>b.destroyedBy===event&&!b.id.includes('_deck_')&&!b.id.includes('_truss_')).map(b=>{
    const min=v3(...b.min),max=v3(...b.max);return {id:b.id,min,max,x:(min.x+max.x)/2,z:(min.z+max.z)/2,half:Math.max(max.x-min.x,max.z-min.z)/2};
  });
}
/** A demolished part's scorch: one wide disc on it plus four smaller ones just outside its footprint, because the
 *  wide disc's dark core lies under the collapsed span and the rubble the bridge kit draws there. */
function demolitionScorch(part,index,P,n){
  const out=[{x:part.x,z:part.z,r:Math.min(16,part.half+P.radius*.55),y:null,cell:index%2?BIG.scorchA:BIG.scorchB,main:true}];
  [['x',-1],['x',1],['z',-1],['z',1]].forEach(([axis,sign],k)=>{
    const other=axis==='x'?'z':'x',i=index*16+k*3,p={};
    p[axis]=(sign<0?part.min[axis]:part.max[axis])+sign*(2.2+1.6*n(400+i));
    p[other]=lerp(part.min[other],part.max[other],.25+.5*n(401+i));
    out.push({x:p.x,z:p.z,r:4.4+1.4*n(402+i),y:null,cell:(index+k)%2?BIG.scorchB:BIG.scorchA,main:false});
  });
  return out;
}
/** Remaining deck spans next to a demolition gap: their ends get soot. */
function demolitionDeckEnds(world,id){
  const event=`evt_m01_${id}`,gone=kit.boxes.filter(b=>b.destroyedBy===event&&b.id.includes('_deck_'));
  const ends=[];
  for(const g of gone)for(const d of world.decks){
    if(d.id.includes('_deck_')===false||d.id.slice(0,4)!==g.id.slice(0,4))continue;
    if(Math.abs(d.max.x-g.min[0])<3.5)ends.push({deck:d,x0:d.max.x-9,x1:d.max.x});
    if(Math.abs(d.min.x-g.max[0])<3.5)ends.push({deck:d,x0:d.min.x,x1:d.min.x+9});
  }
  return ends;
}
function surfacePolygons(world,cx,cz,r,{includeDecks=true,includeTerrain=true,includeTrack=true}={}){
  // Every drawn horizontal receiver inside the square, as polygons lying exactly on that art.
  const out=[],g=M01_TERRAIN_MESH;
  if(includeTerrain){
    const i0=Math.max(0,Math.floor((cx-r-g.x0)/g.step)),i1=Math.min(g.nx-1,Math.floor((cx+r-g.x0)/g.step));
    const j0=Math.max(0,Math.floor((cz-r-g.z0)/g.step)),j1=Math.min(g.nz-1,Math.floor((cz+r-g.z0)/g.step));
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)for(const tri of cellTriangles(world,i,j)){
      if(tri.v.every(p=>underWater(p.x,p.y)))continue;
      const poly=clipSquare(tri.v,cx,cz,r);if(poly.length>=3)out.push({poly,normal:tri.n,lift:.012,kind:'terrain'});
    }
  }
  if(includeDecks){
    for(const c of world.walkSurfaces){
      if(c.max.x<cx-r||c.min.x>cx+r||c.max.z<cz-r||c.min.z>cz+r)continue;
      const strips=c.material==='metal'||c.id.includes('abutment')?[[c.min.z,c.max.z,c.max.y,c.material==='metal'?'metal':'stone']]:
        (deckLayoutFor(c.id)?.strips??[]).map(s=>[deckLayoutFor(c.id).axisZ+s[0],deckLayoutFor(c.id).axisZ+s[1],s[2],s[3]]);
      const layout=deckLayoutFor(c.id);
      for(const rail of layout?.rails??[])strips.push([layout.axisZ+rail-layout.railHalf,layout.axisZ+rail+layout.railHalf,layout.railTop,'rail']);
      for(const [z0,z1,y,kind] of strips){
        const rect=[v3(c.min.x,y,z0),v3(c.max.x,y,z0),v3(c.max.x,y,z1),v3(c.min.x,y,z1)],poly=clipSquare(rect,cx,cz,r);
        if(poly.length>=3)out.push({poly,normal:v3(0,1,0),lift:kind==='rail'?.003:.004,kind});
      }
    }
  }
  if(includeDecks)for(const a of damagedAbutments(world)){
    if(a.x1<cx-r||a.x0>cx+r||a.z1<cz-r||a.z0>cz+r)continue;
    const poly=clipSquare([v3(a.x0,a.y,a.z0),v3(a.x1,a.y,a.z0),v3(a.x1,a.y,a.z1),v3(a.x0,a.y,a.z1)],cx,cz,r);
    if(poly.length>=3)out.push({poly,normal:v3(0,1,0),lift:.004,kind:'stone'});
  }
  if(includeTrack){
    const T=M01_TRACK_BED;
    for(const s of trackSegments(world)){
      const along=(cx-s.ax)*s.ux+(cz-s.az)*s.uz,lateral=-(cx-s.ax)*s.uz+(cz-s.az)*s.ux,reach=r*1.42;
      if(Math.abs(lateral)>reach+T.sleeperHalfAcross||along<-reach||along>s.length+reach)continue;
      const left=v3(-s.uz,0,s.ux),dirv=v3(s.ux,0,s.uz),j0=Math.max(0,Math.ceil((along-reach)/T.sleeperStep)),j1=Math.floor((Math.min(s.length-1e-6,along+reach))/T.sleeperStep);
      for(let j=j0;j<=j1;j++){
        const d=j*T.sleeperStep,c=v3(s.ax+s.ux*d,0,s.az+s.uz*d),y=drawnHeight(c.x,c.z)+T.sleeperTop;
        const corner=(a,b)=>v3(c.x+dirv.x*a+left.x*b,y,c.z+dirv.z*a+left.z*b),h=T.sleeperHalfAlong,w=T.sleeperHalfAcross;
        const poly=clipSquare([corner(-h,-w),corner(h,-w),corner(h,w),corner(-h,w)],cx,cz,r);if(poly.length>=3)out.push({poly,normal:v3(0,1,0),lift:.003,kind:'sleeper'});
      }
      for(let k=0;k<s.pieces;k++)for(const offset of [-T.railOffset,T.railOffset]){
        const a0=s.length*k/s.pieces-.025,a1=s.length*(k+1)/s.pieces+.025;if(a1<along-reach||a0>along+reach)continue;
        const m=v3(s.ax+s.ux*s.length*(k+.5)/s.pieces+left.x*offset,0,s.az+s.uz*s.length*(k+.5)/s.pieces+left.z*offset),y=drawnHeight(m.x,m.z)+T.railTop;
        const corner=(a,b)=>v3(s.ax+s.ux*a+left.x*(offset+b),y,s.az+s.uz*a+left.z*(offset+b));
        const poly=clipSquare([corner(a0,-T.railHalf),corner(a1,-T.railHalf),corner(a1,T.railHalf),corner(a0,T.railHalf)],cx,cz,r);
        if(poly.length>=3)out.push({poly,normal:v3(0,1,0),lift:.003,kind:'rail'});
      }
    }
  }
  // Walkable tops and track beds that the drawn terrain covers (the west abutments under the embankment) stay hidden.
  return out.filter(s=>s.kind==='terrain'||s.poly.some(p=>{const h=renderedTerrainHeight(world,p.x,p.z);return h===null||p.y>h-.01;}));
}
/** Drawn surface for settling debris/embers near a reference height (null over water or open deck). */
export function m01SurfaceTop(world,x,z,refY=null){
  const g=m01VisibleGround(world,x,z,refY,1.2,.9);
  return g&&{y:g.y,kind:g.kind,type:g.type};
}
// Debris colours stay CSS strings in the (pure) residue data; their THREE.Color is converted once.
const DEBRIS_RGB=new Map(),debrisColor=hex=>DEBRIS_RGB.get(hex)??DEBRIS_RGB.set(hex,new THREE.Color(hex)).get(hex);
const DEBRIS_COLORS=Object.freeze({clod:['#4e3f30','#6a5641','#3a3027'],stone:['#8f8b82','#a39d91','#6f6b64'],brick:['#8a4a37','#a65c42','#6c3a2c'],
  splinter:['#a8875f','#7b5f42','#3a2e24'],gravel:['#7d7a72','#94918a','#5d5b56'],masonry:['#7a756c','#8b7158','#5b5650'],burlap:['#8f7d5a','#a58f66','#6f6047'],steel:['#4f5253','#3e4142','#5d5246']});

// The west abutments' authored damaged state (bridges.mjs abutment_west_damaged: abX0..faceWest-14, top -.35) stays
// drawn after the west demolition although its walkable collider is gone; residue may settle on that top.
export const M01_DAMAGED_ABUTMENTS=Object.freeze([
  Object.freeze({id:'rail_support_00_damaged',x0:-20.1,x1:-2.1,z0:-9.5,z1:9.5,y:-.35,after:'evt_m01_west_demolition'}),
  Object.freeze({id:'road_support_00_damaged',x0:-22,x1:-4,z0:29.5,z1:50.5,y:-.35,after:'evt_m01_west_demolition'})
]);
const damagedAbutments=world=>M01_DAMAGED_ABUTMENTS.filter(a=>world.events?.includes(a.after));
/** What blast residue can lie on, beyond the static terrain and track: walkable decks/joints/abutments, the damaged
 *  abutments, and the drawn buildings/covers with their heights. Equal signatures give identical residue. */
const receiverSignature=world=>[world.walkSurfaces.map(c=>c.id).join(','),damagedAbutments(world).map(a=>a.id).join(','),
  [...world.buildings,...world.covers].map(b=>`${b.id}:${b.min.y}:${b.max.y}`).join(',')].join('|');
const DEBRIS_TYPES=Object.freeze({demolition:['masonry','masonry','brick','steel'],forward_post:['burlap','splinter','clod','burlap'],
  building:['brick','brick','masonry'],earth:['clod','clod','stone'],ballast:['gravel','gravel','clod'],sleeper:['splinter','gravel','clod'],
  wood:['splinter','splinter','burlap'],road:['stone','stone','masonry'],stone:['stone','masonry','stone'],rail:['gravel','steel','gravel'],metal:['steel','stone','gravel']});
const insideBuilding=(world,x,y,z)=>world.buildings.find(b=>x>b.min.x&&x<b.max.x&&z>b.min.z&&z<b.max.z&&y>b.min.y-.6&&y<b.max.y)??null;

/**
 * Persistent aftermath of one saved blast (sectors.damage entry): clipped polygons on drawn surfaces, debris and
 * embers. Pure and deterministic in (damage record, world state); destroyed receivers are simply absent.
 */
// The surface a saved blast went off on. Saved points can sit under the ground (the forward post's near miss is
// recorded at y -10 on land at -3) or above it (the 05:30 raid at y 0 over -3): take the highest drawn surface not
// above the point; a blast under a deck keeps the ground in its own height window.
function blastSurface(world,d){
  const top=m01VisibleGround(world,d.x,d.z,null);if(!top||!Number.isFinite(d.y)||top.y<=d.y+.9)return top;
  return m01VisibleGround(world,d.x,d.z,d.y,1.2,.9)??top;
}
export function m01BlastResidue(world,damage){
  const kind=m01BlastKind(damage.id),P=BLAST[kind],seed=blastSeed(damage),n=i=>visualNoise(seed,i);
  const polys=[],debris=[],embers=[],start=damage.started;
  const centerTop=kind==='demolition'?null:blastSurface(world,damage);
  const onDeck=centerTop?.type==='deck',blastY=centerTop?.y??damage.y??0,building=kind==='demolition'?null:insideBuilding(world,damage.x,blastY,damage.z);
  let anchors;
  if(kind==='demolition')anchors=demolitionAnchors(damage.id).flatMap((part,i)=>demolitionScorch(part,i,P,n));
  else if(building){
    // A bomb through a roof: rubble and dust at the base of the nearest facade, outside the drawn box.
    const faces=[['x',-1,damage.x-building.min.x],['x',1,building.max.x-damage.x],['z',-1,damage.z-building.min.z],['z',1,building.max.z-damage.z]].sort((a,b)=>a[2]-b[2]);
    const [axis,sign]=faces[0],other=axis==='x'?'z':'x',p={x:damage.x,z:damage.z};
    p[axis]=(sign<0?building.min[axis]:building.max[axis])+sign*1.6;p[other]=clamp(damage[other],building.min[other]+2.5,building.max[other]-2.5);
    const top=m01SurfaceTop(world,p.x,p.z,blastY);anchors=top?[{x:p.x,z:p.z,r:4.5,y:top.y}]:[];
  }else anchors=[{x:damage.x,z:damage.z,r:P.radius,y:blastY}];
  const near=(y,ref)=>ref===null||ref===undefined||(y>ref-1.2&&y<ref+.9);
  anchors.forEach((a,ai)=>{
    const block=atlasBlock(building?BIG.ash:onDeck?BIG.scorchA:a.cell??P.cell),uv=blastUv(a.x,a.z,a.r,n(ai*7)*Math.PI*2,block);
    for(const s of surfacePolygons(world,a.x,a.z,a.r,{includeTerrain:!onDeck,includeTrack:!onDeck})){
      const meanY=s.poly.reduce((m,p)=>m+p.y,0)/s.poly.length;
      // A blast on a deck scorches that deck only; one on the ground never climbs onto a deck metres above it.
      // The drawn terrain itself is never filtered by height: an embankment slope is ground, not another surface.
      if(s.kind!=='terrain'&&!near(meanY,a.y)||s.poly.every(p=>insideBuilding(world,p.x,p.y,p.z)))continue;
      polys.push({points:s.poly.map(p=>add(p,s.normal,s.lift)),uvs:s.poly.map(p=>uv(p.x,p.z)),normal:s.normal,color:building?[1,1,1,.92]:P.tint,start,kind:s.kind});
    }
  });
  if(kind==='demolition'){
    // Soot on the remaining deck ends at the gap (rail and road bridges).
    for(const end of demolitionDeckEnds(world,damage.id)){
      const cx=(end.x0+end.x1)/2,cz=(end.deck.min.z+end.deck.max.z)/2,r=Math.max(end.x1-end.x0,end.deck.max.z-end.deck.min.z)/2+.01;
      const uv=blastUv(end.x1>end.deck.max.x-1?end.x1:end.x0,cz,9,n(91)*Math.PI*2,atlasBlock(BIG.scorchA));
      for(const s of surfacePolygons(world,cx,cz,r,{includeTerrain:false,includeTrack:false})){
        // Exactly the last 9 m of this deck: the square around it is wider than the strip along x.
        const poly=clipRect(s.poly,'x','z',end.x0,end.x1,end.deck.min.z,end.deck.max.z);
        if(poly.length<3||poly.some(p=>Math.abs(p.y)>.5))continue;
        polys.push({points:poly.map(p=>add(p,s.normal,s.lift)),uvs:poly.map(p=>uv(p.x,p.z)),normal:s.normal,color:[1,1,1,.9],start,kind:'deck-end'});
      }
    }
  }
  if(P.faceRange){
    for(const b of [...world.buildings,...world.covers]){
      if(blastY>b.max.y||blastY<b.min.y-1)continue;
      for(const axis of ['x','z'])for(const sign of [-1,1]){
        const value=sign<0?b.min[axis]:b.max[axis],gap=(damage[axis]-value)*sign;if(gap<-.05||gap>P.faceRange)continue;
        const other=axis==='x'?'z':'x';if(damage[other]<b.min[other]-P.faceRange*.5||damage[other]>b.max[other]+P.faceRange*.5)continue;
        const top=m01SurfaceTop(world,clamp(damage.x,b.min.x,b.max.x)+(axis==='x'?sign*.3:0),clamp(damage.z,b.min.z,b.max.z)+(axis==='z'?sign*.3:0),blastY);
        const ground=Math.max(b.min.y,top?.y??b.min.y),size=P.faceSize*(1-.55*Math.max(0,gap)/P.faceRange),c=clamp(damage[other],b.min[other],b.max[other]);
        const u0=c-size/2,u1=c+size/2,y0=ground-.05,y1=Math.min(b.max.y,ground+size*.9);if(y1-y0<.25)continue;
        const corner=(u,y)=>{const p=v3();p[axis]=value+sign*DECAL_OFFSET;p[other]=u;p.y=y;return p;};
        const poly=clipRect([corner(u0,y0),corner(u1,y0),corner(u1,y1),corner(u0,y1)],other,'y',b.min[other],b.max[other],b.min.y,b.max.y);
        if(poly.length<3)continue;
        const normal=v3();normal[axis]=sign;const c2=cellUv(CELL.soot);
        polys.push({points:poly,uvs:poly.map(p=>[lerp(c2.u0,c2.u1,(p[other]-u0)/(u1-u0)),lerp(c2.v0,c2.v1,(p.y-y0)/(y1-y0))]),normal,color:[1,1,1,.85],start,kind:'face'});
      }
    }
    if(damage.id==='station_bomb'){
      // Smoke-blackened windows on the station's north facade nearest the bomb (M01Environment.buildArchitecture).
      const station=world.buildings.find(b=>b.id==='station');
      if(station)for(let x=-450;x<-340;x+=10)for(const y of [1.5,6]){
        if(Math.abs(x-damage.x)>16)continue;const w=2.5,y0=y+1.35,y1=y0+(y>3?2.6:1.5),z=station.min.z-DECAL_OFFSET,c=cellUv(CELL.soot);
        polys.push({points:[v3(x-w/2,y0,z),v3(x+w/2,y0,z),v3(x+w/2,y1,z),v3(x-w/2,y1,z)],uvs:[[c.u0,c.v0],[c.u1,c.v0],[c.u1,c.v1],[c.u0,c.v1]],normal:v3(0,0,-1),color:[1,1,1,.92],start,kind:'window-soot'});
      }
    }
  }
  const debrisCount=building?Math.round(P.debris*.6):P.debris;
  // Debris and embers only around anchors that stand on drawn ground (a demolished pier in the river leaves none).
  const landed=kind==='demolition'?anchors.filter(a=>m01SurfaceTop(world,a.x,a.z,a.y)):anchors;
  for(let i=0;i<debrisCount&&landed.length;i++){
    const a=landed[i%landed.length],angle=n(100+i*5)*Math.PI*2,radius=a.r*(.25+.75*Math.sqrt(n(101+i*5)))*(kind==='demolition'?.9:1);
    const x=a.x+Math.cos(angle)*radius,z=a.z+Math.sin(angle)*radius,top=m01SurfaceTop(world,x,z,a.y);
    if(!top||insideBuilding(world,x,top.y,z))continue;
    const types=DEBRIS_TYPES[kind==='demolition'?'demolition':damage.id==='forward_post'?'forward_post':building?'building':top.kind]??DEBRIS_TYPES.earth;
    const type=types[Math.floor(n(108+i*5)*types.length)%types.length],size=lerp(P.debrisSize[0],P.debrisSize[1],n(102+i*5)**1.6)*(building?1.4:1);
    debris.push({x,y:top.y+size*.3,z,size,type,shape:[1,.42+.4*n(103+i*5),.55+.45*n(104+i*5)],yaw:n(105+i*5)*Math.PI*2,tilt:(n(106+i*5)-.5)*.9,
      color:DEBRIS_COLORS[type][Math.floor(n(107+i*5)*3)%3]});
  }
  for(let i=0;i<P.embers&&landed.length&&!building;i++){
    const a=landed[i%landed.length],angle=n(300+i*4)*Math.PI*2,radius=a.r*.45*Math.sqrt(n(301+i*4));
    const x=a.x+Math.cos(angle)*radius,z=a.z+Math.sin(angle)*radius,top=m01SurfaceTop(world,x,z,a.y);if(!top)continue;
    embers.push({x,y:top.y+.03,z,start,life:P.emberLife*(.7+.6*n(302+i*4)),size:(kind==='grenade'?.05:.09)*(.7+.6*n(303+i*4)),phase:n(304+i*4)*Math.PI*2});
  }
  return {id:damage.id,kind,polys,debris,embers};
}
const cellUv=(index,inset=.04)=>{const col=index%8,row=Math.floor(index/8);return {u0:(col+inset)/8,u1:(col+1-inset)/8,v0:(row+inset)/4,v1:(row+1-inset)/4};};

// ——— Procedural atlas (original art, deterministic) ———
const hash2=(x,y,s)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(s|0,0x27d4eb2d);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
const smooth=t=>t*t*(3-2*t);
function vnoise(x,y,s){const i=Math.floor(x),j=Math.floor(y),u=smooth(x-i),v=smooth(y-j),a=hash2(i,j,s),b=hash2(i+1,j,s),c=hash2(i,j+1,s),d=hash2(i+1,j+1,s);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const fbm=(x,y,s,octaves=3)=>{let n=0,a=.5,f=1,norm=0;for(let k=0;k<octaves;k++){n+=a*vnoise(x*f,y*f,s+k*101);norm+=a;a*=.5;f*=2.03;}return n/norm;};
const ring=(t,s,freq=1.4)=>fbm(Math.cos(t)*freq+5,Math.sin(t)*freq+9,s,3);   // periodic angular noise
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const warp=(u,v,s,amount)=>[u+amount*(fbm(u*1.7+3.1,v*1.7,s+17,3)-.5),v+amount*(fbm(u*1.7,v*1.7+5.3,s+29,3)-.5)];
const speck=(u,v,s,scale)=>hash2(Math.floor((u+1)*scale),Math.floor((v+1)*scale),s);
/** Bullet strike in masonry: jagged spalled crater, dark shot hole, fresh exposed material, edge shadow, cracks, flecks and dust. */
function masonry(u,v,s,{fresh,hole,edge,dust,size=.74,holeR=.17,cracks=4,dustAlpha=.36,flecks=.64,jag=1,shift=0}){
  const [wu,wv]=warp(u,v,s,.2),r=Math.hypot(wu,wv),t=Math.atan2(wv,wu),sector=Math.floor((t/(2*Math.PI)+.5)*11);
  const R=size*(.62+.34*jag*ring(t,s,1.9)+.16*jag*hash2(sector,s,3)),grain=fbm(u*13,v*13,s+4,3),fine=speck(u,v,s+2,40);
  let crack=0;
  for(let k=0;k<cracks;k++){
    const a=(k+.6*hash2(k,s,7))*Math.PI*2/cracks,reach=R+.12+.22*hash2(k,s,8),bend=.06*(fbm(r*5,k*3.7,s+k,2)-.5);
    const off=Math.abs(Math.sin(t-a)*r+bend),w=.011+.012*Math.max(0,1-r);
    if(Math.cos(t-a)>0&&r>R*.75&&r<reach&&off<w)crack=Math.max(crack,(1-off/w)*(1-(r-R*.75)/(reach-R*.75)*.5));
  }
  // An oblique round leaves its hole off-centre in the spall (shift: up to that fraction of the spall radius).
  const su=shift*R*(hash2(1,s,9)-.5)*2,sv=shift*R*(hash2(2,s,9)-.5)*2,hd=Math.hypot(wu-su,wv-sv),hr=holeR*(.8+.45*ring(Math.atan2(wv-sv,wu-su),s+7,2.4));
  if(hd<hr){const k=hd/hr;return [...mix(hole,mix(hole,fresh,.22),k*k),1,.04+.1*k];}
  if(r<R){
    const k=clamp((r-hr)/(R-hr),0,1),depth=sstep(0,.62,Math.min(k,(hd-hr)/(R-hr)+.15));
    let c=mix(mix(hole,fresh,.42),fresh,depth).map(x=>x*(.84+.3*grain)+(fine-.5)*14);
    if(k>.84)c=mix(c,edge,.6*(k-.84)/.16);
    return [...c,.97,.14+.38*depth+(k>.84?.08:0)];
  }
  if(crack>0)return [...edge,.78*crack,.4];
  const out=(r-R)/Math.max(.01,.97-R),fleck=fbm(u*17+7,v*17,s+9,2);
  if(out<.42&&fleck>flecks)return [...fresh.map(x=>x*(.9+.15*grain)),.86,.55];
  if(out<1)return [...dust,dustAlpha*(1-out)**1.6*(.55+.45*fbm(u*6,v*6,s+13,2)),.5];
  return [...dust,0,.5];
}
const PAINT={
  stone:(u,v,s)=>masonry(u,v,s,{fresh:[214,207,190],hole:[44,42,39],edge:[96,92,85],dust:[222,216,202]}),
  // Each brick cell its own chip: spall size, hole size/offset and outline differ, so neighbouring marks never repeat.
  brick:(u,v,s)=>masonry(u,v,s,{fresh:[204,114,78],hole:[50,25,19],edge:[104,52,38],dust:[198,142,112],size:.62+.18*hash2(3,s,5),holeR:.09+.07*hash2(4,s,5),
    cracks:2+Math.floor(3*hash2(5,s,5)),dustAlpha:.3,jag:1.3+.9*hash2(6,s,5),shift:.2+.4*hash2(7,s,5)}),
  road:(u,v,s)=>masonry(u,v,s,{fresh:[174,170,160],hole:[38,37,35],edge:[84,82,78],dust:[190,187,178],size:.6,holeR:.15,cracks:5,dustAlpha:.4,jag:.8}),
  wood:(u,v,s)=>{
    // Grain runs along v: a dark shot hole torn open, jagged bright splinters lifted along the fibres, bruised wood around.
    const [wu,wv]=warp(u,v,s,.1),hole=(wu/.21)**2+(wv/.28)**2,fiber=fbm(u*30,v*1.9,s,2),reach=.9+.06*hash2(1,s,3),along=Math.max(0,1-Math.abs(wv)/reach);
    if(hole<1)return [...mix([16,11,8],[40,28,19],hole),1,.04];
    if(hole<1.7)return [...[92,64,42].map(x=>x*(.8+.4*fiber)),.95,.32];
    const left=.5*along**.6*(.5+.8*fbm(v*9,1.3,s+5,2)),right=.5*along**.6*(.5+.8*fbm(v*9,7.1,s+6,2)),edge=wu<0?left:right;
    if(Math.abs(wu)<edge){
      if(Math.abs(wu)>edge-.04)return [100,72,49,.92*along**.25,.46];
      const lit=fiber>.38;return [...(lit?[232,203,156]:[160,124,86]).map(x=>x*(.86+.26*fiber)),.96*along**.25,lit?.64:.48];
    }
    for(let k=0;k<5;k++){const x0=(hash2(k,s,5)-.5)*.8,len=.35+.55*hash2(k,s,6);if(Math.abs(u-x0)<.014&&Math.abs(v)<len&&Math.abs(v)>.2)return [226,196,148,.82,.6];}
    const bruise=(wu/.62)**2+(wv/.95)**2;if(bruise<1)return [70,52,36,.32*(1-bruise),.5];
    return [180,150,110,0,.5];
  },
  metal:(u,v,s)=>{
    // Bright cratered steel with a dark burr, a grey lead smear thrown one way and a faint heat tint.
    const [wu,wv]=warp(u,v,s,.16),r=Math.hypot(wu,wv),t=Math.atan2(wv,wu),grain=fbm(u*20,v*20,s,2),R=.3*(.75+.55*ring(t,s,2.3));
    const smear=wv>0&&Math.abs(wu)<.5*wv+.06&&r<.9&&fbm(u*7,v*11,s+3,2)>.45;
    if(r<.11)return [46,48,52,1,.06];if(r<R)return [...[230,232,234].map(x=>x*(.8+.25*grain)),1,.3+.25*r/R];
    if(r<R+.06)return [70,68,66,.92,.66];
    if(smear)return [...[150,150,152].map(x=>x*(.85+.2*grain)),.62*(1-r/.9),.5];
    if(r<R+.26)return [...mix([126,112,138],[150,118,82],(r-R)/.26),.36*(1-(r-R-.06)/.2),.5];
    return [180,182,186,0,.5];
  },
  rail:(u,v,s)=>{
    const w=.2*Math.sqrt(Math.max(0,1-(v*1.05)**2))*(.8+.4*fbm(v*5,0,s,2)),line=fbm(u*36,v*3,s,2);
    if(v<-.5&&Math.abs(u)<w*1.25)return [44,44,46,.96,.12];
    if(Math.abs(u)<w*.7)return [...[234,236,238].map(x=>x*(.84+.18*line)),.97,.4];
    if(Math.abs(u)<w)return [92,90,88,.9,.6];
    return [200,202,204,0,.5];
  },
  earth:(u,v,s)=>{
    // Strike crater: black shot hole, a ring of freshly turned damp soil (darker than the weathered ground) broken by
    // pale dry clods, soil thrown forward (+v, the round's direction of travel) and a faint dust film.
    const [wu,wv]=warp(u,v,s,.24),d=Math.hypot(wu/.92,(wv+.16)/1.12),t=Math.atan2(wv+.16,wu),n=fbm(u*6,v*6,s,3),clod=fbm(u*11,v*11,s+5,2),crumb=fbm(u*17,v*9,s+8,2);
    if(d<.2*(.8+.4*ring(t,s,2)))return [20,16,12,.97,.05];
    if(d<.62*(.82+.4*ring(t,s+3,1.8)))return [...(clod>.7?[150,128,98]:[56,44,33]).map(x=>x*(.8+.36*n)),.9,clod>.7?.6:.34];
    const fan=wv>-.45&&Math.abs(wu)<.75*(wv+.65);
    if(d<.97&&fan&&crumb>.5)return [...(crumb>.74?[156,134,102]:[50,40,30]),.88*(1-d)**.35,.56];
    if(d<.9)return [70,58,44,.22*(1-d/.9),.5];
    return [60,50,38,0,.5];
  },
  ballast:(u,v,s)=>{
    const [wu,wv]=warp(u,v,s,.25),r=Math.hypot(wu,wv),edge=.78+.16*(ring(Math.atan2(wv,wu),s)-.5)*2,n=fbm(u*7,v*7,s,3),stone=fbm(u*14,v*14,s+9,2);
    if(r>edge)return [190,186,176,0,.5];
    if(stone>.7)return [38,37,35,.8,.3];
    if(stone<.18)return [228,225,218,.82,.62];
    return [196,192,182,.6*(.45+.55*n)*(1-(r/edge)**3),.53];
  },
  soot:(u,v,s)=>{
    const h=(v+1)/2,[wu]=warp(u,v,s,.35),w=.3+.48*h,n=fbm(u*3+s%5,v*2.2-s%3,s,3),d=(1-h)**.7*Math.max(0,1-(wu/w)**2)*(.5+.5*n);
    return [34,30,27,clamp(.9*d*sstep(0,.08,h),0,1),.5];
  },
  charWood:(u,v,s)=>{const [wu,wv]=warp(u,v,s,.3),r=Math.hypot(wu,wv),n=fbm(u*2,v*14,s,3),a=sstep(.95,.45,r*(1+.18*(n-.5)));return [...[28,22,17].map(x=>x*(.8+.45*n)),.86*a,.44];},
  sootRail:(u,v,s)=>{const w=.22*Math.sqrt(Math.max(0,1-v*v)),n=fbm(u*8,v*4,s,2);return [24,22,21,Math.abs(u)<w?.75*(.6+.4*n):0,.5];},
  ember:(u,v)=>{const r=Math.hypot(u,v);return [255,255,255,clamp((1-r)**2.2,0,1),.5];}
};
function paintBig(kind,u,v,s){
  const [wu,wv]=warp(u,v,s,kind==='ash'?.4:.28),r=Math.hypot(wu,wv),t=Math.atan2(wv,wu),n=fbm(u*2.4+3,v*2.4+1,s,4),fine=fbm(u*15,v*15,s+21,2);
  // Spray rays: soft wedges that widen outward and break up along their length (no thin "legs").
  let ray=0;for(let k=0;k<15;k++){const a=(k+.8*hash2(k,s,2))*Math.PI*2/15,da=Math.abs(Math.atan2(Math.sin(t-a),Math.cos(t-a))),w=.05+.11*hash2(k,s,3),len=.6+.38*hash2(k,s,4);
    if(da<w&&r<len)ray=Math.max(ray,(1-da/w)**1.5*(1-r/len)**.6*(.45+.55*fbm(r*9,k*2.3,s+k,2)));}
  if(kind==='crater'){
    // Bowl of scorched earth, raised rim of thrown-out soil with clods, ejecta rays and soot.
    const bowl=.34*(.85+.3*ring(t,s,1.6)),rim=.58*(.85+.3*ring(t,s+4,1.4));
    if(r<bowl){const k=r/bowl;return [...mix([26,21,17],[60,48,37],k*k).map(x=>x*(.85+.3*n)),.95,.12+.3*k];}
    const lip=sstep(rim*1.1,rim*.9,r);
    if(lip>0){const clod=fbm(u*10,v*10,s+3,2),soil=mix([124,102,76],[66,53,41],.35+.5*(fbm(u*4,v*4,s+6,2)-.3));
      const c=clod>.64?[50,40,31]:soil.map(x=>x*(.74+.42*n)),out=[...mix([70,58,46],[30,26,22],ray*.5),(.18+.55*ray)*.9];
      return [...mix(out.slice(0,3),c,lip),.9*lip+out[3]*(1-lip),clod>.64?.7:.66];}
    const k=(r-rim)/(.97-rim);if(k>=1)return [96,80,62,0,.5];
    if(fine>.72)return [56,45,35,.75*(1-k),.56];
    return [...mix([118,98,74],[44,37,31],.45+.4*n),(.18+.55*ray)*(1-k)**1.2,.52];
  }
  if(kind==='ash'){
    // Pale masonry and plaster dust with darker soot flecks: it has to read on dark soil and in the facade's shadow.
    const edge=sstep(1,.5,r*(1+.25*(n-.5))),light=fbm(u*5,v*5,s+4,3);
    return [...(light<.34?[74,70,64]:[150,142,130].map(x=>x*(.84+.3*n))),.8*edge*(.78+.22*ray),.48];
  }
  // Charred centre fading through burnt soil into soot spray; no hard outline.
  const R=.62*(.85+.3*ring(t,s,2.1)),core=sstep(.5,0,r),body=sstep(R*1.08,R*.7,r),k=clamp((r-R*.7)/(.97-R*.7),0,1);
  const ash=fine>.82&&r>.16&&r<R,color=ash?[96,92,86]:mix(mix([66,56,46],[26,22,19],ray*.6),mix([46,37,30],[11,9,8],clamp(core*1.1+.12*n,0,1)),body);
  return [...color,clamp(.96*body+(.26+.6*ray)*(1-k)**1.2*(.7+.3*n)*(1-body),0,.97),.5-.12*core];
}
let ATLAS=null,ATLAS_JOB=null,ATLAS_BUFFERS=null,ATLAS_ERROR=null,ATLAS_DONE=null,ATLAS_FAIL=null;
const ATLAS_READY=new Promise((resolve,reject)=>{ATLAS_DONE=resolve;ATLAS_FAIL=reject;});ATLAS_READY.catch(()=>{});
const ATLAS_W=512,ATLAS_H=256,ATLAS_SLICE=2048;   // pixels painted per slice
/** The atlas pixel buffers (allocated once, transparent until painted); textures can wrap them before painting ends. */
function atlasBuffers(){return ATLAS_BUFFERS??={width:ATLAS_W,height:ATLAS_H,color:new Uint8Array(ATLAS_W*ATLAS_H*4),heightMap:new Uint8Array(ATLAS_W*ATLAS_H)};}
// Paints the atlas 2048 pixels of one cell/block at a time (64 slices), so it never blocks a frame for long.
function* atlasJob(){
  const {color,heightMap:height}=atlasBuffers(),W=ATLAS_W;
  const put=(x,y,c)=>{const i=y*W+x;color[i*4]=clamp(Math.round(c[0]),0,255);color[i*4+1]=clamp(Math.round(c[1]),0,255);
    color[i*4+2]=clamp(Math.round(c[2]),0,255);color[i*4+3]=clamp(Math.round(c[3]*255),0,255);height[i]=clamp(Math.round(c[4]*255),0,255);};
  const small=['stone','stone','brick','brick','wood','wood','metal','rail','earth','earth','ballast','road','soot','charWood','sootRail','ember'];
  for(const [index,kind] of small.entries()){
    const ox=(index%8)*64,oy=Math.floor(index/8)*64,s=1009+index*7919;
    for(let y=0;y<64;y++){
      for(let x=0;x<64;x++){
        const u=(x+.5)/32-1,v=(y+.5)/32-1,edge=Math.max(Math.abs(u),Math.abs(v));
        const c=PAINT[kind](u,v,s);if(edge>.94)c[3]=0;put(ox+x,oy+y,c);
      }
      if((y+1)*64%ATLAS_SLICE===0)yield;
    }
  }
  for(const [index,kind] of ['scorchA','scorchB','crater','ash'].entries()){
    const ox=index*128,oy=128,s=4441+index*613;
    for(let y=0;y<128;y++){
      for(let x=0;x<128;x++){
        const u=(x+.5)/64-1,v=(y+.5)/64-1,c=paintBig(kind==='scorchB'?'scorch':kind==='scorchA'?'scorch':kind,u,v,s);
        if(Math.max(Math.abs(u),Math.abs(v))>.97)c[3]=0;put(ox+x,oy+y,c);
      }
      if((y+1)*128%ATLAS_SLICE===0)yield;
    }
  }
  let checksum=0x811c9dc5;for(let i=0;i<color.length;i+=7)checksum=Math.imul(checksum^color[i],0x01000193)>>>0;
  ATLAS=Object.freeze({width:W,height:ATLAS_H,color,heightMap:height,checksum});ATLAS_DONE(ATLAS);
}
/** Advance the atlas painting by up to `slices` slices; true once it has finished (or failed: see m01DecalAtlas). */
export function m01DecalAtlasStep(slices=1){
  if(ATLAS||ATLAS_ERROR)return true;ATLAS_JOB??=atlasJob();
  try{for(let i=0;i<slices&&!ATLAS;i++)if(ATLAS_JOB.next().done&&!ATLAS)throw new Error('decal atlas painting ended without an atlas');}
  catch(error){ATLAS_ERROR=error;ATLAS_FAIL(error);}   // a failed job is never resumed or rescheduled
  return Boolean(ATLAS||ATLAS_ERROR);
}
/** 512×256 RGBA colour atlas + R8 height atlas (8×4 cells of 64 px; rows 2–3 hold four 128 px blast blocks). Completes synchronously. */
export function m01DecalAtlas(){while(!m01DecalAtlasStep(128));if(ATLAS_ERROR)throw ATLAS_ERROR;return ATLAS;}
/** Resolves with the atlas once painting has finished (verification fixtures wait for it before capturing). */
export const m01DecalAtlasReady=()=>ATLAS_READY;

// ——— Runtime (bounded pools) ———
const MARK_FADE_IN=.05,MARK_FADE_OUT=.32,RANK_FADE=.12;
// Empty residue with the full attribute layout (RGBA colour), so the warmed-up program is the one used later.
// It holds one degenerate, fully transparent triangle: drawn only by the warm-up frame (no pixels), hidden otherwise.
function emptyResidue(){
  const g=new THREE.BufferGeometry();
  for(const [name,size] of [['position',3],['normal',3],['uv',2],['color',4],['residueStart',1]])g.setAttribute(name,new THREE.BufferAttribute(new Float32Array(3*size).fill(name==='residueStart'?1e9:0),size));
  return g;
}
// A rock rather than a die: each of the icosahedron's 12 corners moves in/out by a hash of its own position, so every
// face sharing a corner moves it identically (closed mesh, same for all instances; scale/rotation vary per piece).
function DEBRIS_GEOMETRY(){
  const g=new THREE.IcosahedronGeometry(1,0),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),seed=m01DecalSeed('debris',x,y,z),f=.68+.5*visualNoise(seed,0);
    p.setXYZ(i,x*f,y*f*(.78+.22*visualNoise(seed,1)),z*f);
  }
  g.computeVertexNormals();return g;
}
const EMBER_VERTEX=`attribute float emberGlow;varying vec2 vUv;varying float vGlow;varying vec3 vTint;
  void main(){vUv=uv;vGlow=emberGlow;vTint=instanceColor;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
    float size=length(instanceMatrix[0].xyz);center.xy+=position.xy*size;gl_Position=projectionMatrix*center;}`;
const EMBER_FRAGMENT=`uniform sampler2D map;varying vec2 vUv;varying float vGlow;varying vec3 vTint;
  void main(){float a=texture2D(map,vec2(.875+vUv.x*.125,.25+vUv.y*.25)).a*vGlow;if(a<.01)discard;gl_FragColor=vec4(vTint*a,a);}`;

export class M01DamageDecals {
  constructor(scene){
    this.scene=scene;this.group=new THREE.Group();this.group.name='m01-damage-decals';scene.add(this.group);
    // The textures wrap the atlas buffers at once; the art is painted in short timer slices and uploaded when complete
    // (marks placed meanwhile stay transparent; the first combat comes minutes into the mission).
    const atlas=atlasBuffers();
    this.map=new THREE.DataTexture(atlas.color,atlas.width,atlas.height,THREE.RGBAFormat);this.map.colorSpace=THREE.SRGBColorSpace;
    this.heightMap=new THREE.DataTexture(atlas.heightMap,atlas.width,atlas.height,THREE.RedFormat);
    for(const t of [this.map,this.heightMap]){t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=4;t.needsUpdate=true;}
    this.atlasTimer=null;
    this.paintAtlas=()=>{this.atlasTimer=null;if(!m01DecalAtlasStep(1)){this.atlasTimer=setTimeout(this.paintAtlas,0);return;}
      if(ATLAS_ERROR)this.fail(ATLAS_ERROR);else this.map.needsUpdate=this.heightMap.needsUpdate=true;};
    const decal=(extra={})=>new THREE.MeshStandardMaterial({map:this.map,bumpMap:this.heightMap,bumpScale:1.2,transparent:true,depthWrite:false,
      polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4,roughness:.93,metalness:0,alphaTest:.012,...extra});
    this.markMaterial=decal();
    this.markMaterial.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 decalCell;attribute float decalOpacity;varying float vDecalOpacity;')
        .replace('#include <uv_vertex>',`#include <uv_vertex>
          vec2 decalUv=vec2(decalCell.y<0.0?1.0-uv.x:uv.x,uv.y);
          vMapUv=(vec2(mod(decalCell.x,8.0),floor(decalCell.x/8.0))+.03+decalUv*.94)*vec2(.125,.25);
          #ifdef USE_BUMPMAP
          vBumpMapUv=vMapUv;
          #endif
          vDecalOpacity=decalOpacity;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vDecalOpacity;')
        .replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.a*=vDecalOpacity;');
    };
    this.markMaterial.customProgramCacheKey=()=>'m01-damage-marks-v1';
    this.residueClock={value:0};
    this.residueMaterial=decal({vertexColors:true});
    this.residueMaterial.onBeforeCompile=shader=>{
      shader.uniforms.m01ResidueClock=this.residueClock;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float residueStart;uniform float m01ResidueClock;varying float vResidueFade;')
        .replace('#include <uv_vertex>','#include <uv_vertex>\nvResidueFade=clamp((m01ResidueClock-residueStart-.04)/.55,0.0,1.0);\n#ifdef USE_BUMPMAP\nvBumpMapUv=vMapUv;\n#endif');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vResidueFade;')
        .replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.a*=vResidueFade;');
    };
    this.residueMaterial.customProgramCacheKey=()=>'m01-damage-residue-v1';
    const capacity=M01_DAMAGE_DECAL_LIMITS.quality.high;
    this.quad=new THREE.PlaneGeometry(1,1);
    this.cellAttribute=new THREE.InstancedBufferAttribute(new Float32Array(capacity.marks*2),2);this.cellAttribute.setUsage(THREE.DynamicDrawUsage);
    this.opacityAttribute=new THREE.InstancedBufferAttribute(new Float32Array(capacity.marks),1);this.opacityAttribute.setUsage(THREE.DynamicDrawUsage);
    this.quad.setAttribute('decalCell',this.cellAttribute);this.quad.setAttribute('decalOpacity',this.opacityAttribute);
    this.marksMesh=new THREE.InstancedMesh(this.quad,this.markMaterial,capacity.marks);this.marksMesh.name='m01-damage-marks';
    this.marksMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.marksMesh.setColorAt(0,new THREE.Color(1,1,1));
    this.residueGeometry=emptyResidue();this.residueMesh=new THREE.Mesh(this.residueGeometry,this.residueMaterial);this.residueMesh.name='m01-damage-residue';
    this.debrisGeometry=DEBRIS_GEOMETRY();this.debrisMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.97,metalness:0,flatShading:true});
    this.debrisMesh=new THREE.InstancedMesh(this.debrisGeometry,this.debrisMaterial,capacity.debris);this.debrisMesh.name='m01-damage-debris';
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.debrisMesh.setColorAt(0,new THREE.Color(1,1,1));
    this.emberGeometry=new THREE.PlaneGeometry(1,1);this.glowAttribute=new THREE.InstancedBufferAttribute(new Float32Array(capacity.embers),1);
    this.glowAttribute.setUsage(THREE.DynamicDrawUsage);this.emberGeometry.setAttribute('emberGlow',this.glowAttribute);
    this.emberMaterial=new THREE.ShaderMaterial({uniforms:{map:{value:this.map}},vertexShader:EMBER_VERTEX,fragmentShader:EMBER_FRAGMENT,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    this.emberMesh=new THREE.InstancedMesh(this.emberGeometry,this.emberMaterial,capacity.embers);this.emberMesh.name='m01-damage-embers';
    this.emberMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.emberMesh.setColorAt(0,new THREE.Color(1,1,1));
    for(const mesh of [this.marksMesh,this.residueMesh,this.debrisMesh,this.emberMesh]){mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;this.group.add(mesh);}
    this.marksMesh.receiveShadow=this.residueMesh.receiveShadow=this.debrisMesh.receiveShadow=true;
    this.marksMesh.renderOrder=-2;this.residueMesh.renderOrder=-3;this.emberMesh.renderOrder=-1;   // before soft particles
    this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.matrix=new THREE.Matrix4();this.basis=new THREE.Matrix4();
    this.treeList=null;this.treeIndex=new Map();this.compiled=false;
    this.reset();this.paintAtlas();   // after reset(): a failed atlas is counted, never thrown from the constructor
  }
  reset(){
    this.marks=[];this.spall=[];this.sequence=0;this.residueKey=null;this.residue=[];this.world=null;this.revision=-1;this.receivers='';this.lastTime=0;this.lastError=null;
    this.counts={spawned:0,placed:0,noSurface:0,outOfRange:0,dedup:0,clustered:0,evicted:0,expired:0,invalidated:0,errors:0};
    for(const mesh of [this.marksMesh,this.debrisMesh,this.emberMesh]){mesh.count=0;mesh.visible=false;}
    this.residueGeometry.dispose();this.residueGeometry=emptyResidue();this.residueMesh.geometry=this.residueGeometry;this.residueMesh.visible=false;
    this.residueTriangles=0;
  }
  limits(quality){return M01_DAMAGE_DECAL_LIMITS.quality[quality]??M01_DAMAGE_DECAL_LIMITS.quality.medium;}
  /** A presentation failure is counted (diagnostics) and reported once; it never interrupts the game's own handlers. */
  fail(error){this.counts.errors++;this.lastError=String(error?.message??error);if(this.counts.errors===1)console.error('M01 damage decals:',error);}
  /** Authoritative round-impact / player-shot → at most one bounded mark (+ spall). Returns where the impact FX belong. */
  impact(event,{world,trees=null,player=null,shooter=null,clock=0,quality='medium'}={}){
    if(!event||!world||!['round-impact','player-shot'].includes(event.type))return null;
    const material=event.material;if(!material||material==='character'||!event.point)return null;
    this.counts.spawned++;this.prune(clock,world);
    const eye=player?eyePosition(player):null,origin=shooter?(shooter===player?eye:v3(shooter.x,(shooter.y??0)+1.35,shooter.z)):null;
    let point=v3(event.point.x,event.point.y,event.point.z);
    if(event.type==='player-shot'&&material==='earth'&&eye)point=refineGroundPoint(world,eye,point);
    const dir=origin?unit(add(point,origin,-1)):null;
    const surface=m01VisualSurface(world,point,{dir,trees,material});
    const fxPoint=surface?v3(surface.point.x,surface.point.y,surface.point.z):point,profile=surface?M01_SURFACE_PROFILES[surface.kind]:null;
    const result={placed:false,kind:surface?.kind??null,fxPoint,secondaryFx:profile?.fx&&profile.fx!==material?profile.fx:null,reason:null};
    if(!surface||!profile){this.counts.noSurface++;result.reason='no-surface';return result;}
    const L=this.limits(quality),seed=m01DecalSeed(event.type,event.by??'player',point.x,point.y,point.z,clock),n=i=>visualNoise(seed,i);
    const size=lerp(profile.size[0],profile.size[1],n(1)),range=Math.min(L.range,size*M01_DAMAGE_DECAL_LIMITS.pxRange);
    if(eye&&Math.hypot(fxPoint.x-eye.x,fxPoint.y-eye.y,fxPoint.z-eye.z)>range){this.counts.outOfRange++;result.reason='out-of-range';return result;}
    // Ground kicks stretch along the incoming round; on a vertical soil face they stay round with a free roll.
    const vertical=Math.abs(surface.normal.y)<.5,along=profile.directional&&dir&&!vertical?v3(dir.x,dir.y,dir.z):null,grain=profile.grain;
    const aspect=profile.directional&&vertical?1.12:profile.aspect;
    const fit=fitMark(world,surface,{sizeU:size,sizeV:size*aspect,roll:grain||along?(n(2)-.5)*.3:n(2)*Math.PI*2,along});
    if(!fit){this.counts.noSurface++;result.reason='no-fit';return result;}
    const receiver=surface.receiver,key=`${receiver.type}:${receiver.id}:${receiver.part??''}:${receiver.axis??''}${receiver.sign??''}`;
    const radius=surface.kind==='earth'||surface.kind==='ballast'?M01_DAMAGE_DECAL_LIMITS.earthClusterRadius:M01_DAMAGE_DECAL_LIMITS.clusterRadius;
    const near=this.marks.filter(m=>m.key===key&&Math.hypot(m.position.x-fit.position.x,m.position.y-fit.position.y,m.position.z-fit.position.z)<radius);
    if(near.some(m=>Math.hypot(m.position.x-fit.position.x,m.position.y-fit.position.y,m.position.z-fit.position.z)<Math.min(m.size,size)*.35)){this.counts.dedup++;result.reason='dedup';return result;}
    if(near.length>=L.cluster){this.remove(near[0]);this.counts.clustered++;}
    const mark={sequence:this.sequence++,key,kind:surface.kind,receiver,cell:profile.cells[Math.floor(n(3)*profile.cells.length)%profile.cells.length],flip:n(4)<.5?-1:1,
      position:fit.position,normal:fit.normal,axisU:fit.axisU,axisV:fit.axisV,sizeU:fit.sizeU,sizeV:fit.sizeV,size,start:clock,life:profile.life*(.85+.3*n(5)),
      tint:tintFor(surface.kind,n(6)),tree:receiver.type==='tree'?receiver.id:null};
    mark.matrix=new THREE.Matrix4().makeBasis(new THREE.Vector3(fit.axisU.x,fit.axisU.y,fit.axisU.z).multiplyScalar(fit.sizeU),
      new THREE.Vector3(fit.axisV.x,fit.axisV.y,fit.axisV.z).multiplyScalar(fit.sizeV),new THREE.Vector3(fit.normal.x,fit.normal.y,fit.normal.z))
      .setPosition(fit.position.x,fit.position.y,fit.position.z);
    this.marks.push(mark);this.counts.placed++;
    while(this.marks.length>L.marks){this.remove(this.marks[0]);this.counts.evicted++;}
    this.addSpall(world,mark,profile,n,eye,L);
    result.placed=true;return result;
  }
  addSpall(world,mark,profile,n,eye,L){
    if(!profile.spall||!profile.debris||(eye&&Math.hypot(mark.position.x-eye.x,mark.position.z-eye.z)>28))return;
    const vertical=Math.abs(mark.normal.y)<.5;
    for(let i=0;i<profile.spall;i++){
      const a=n(20+i*4)*Math.PI*2,d=vertical?.12+.5*n(21+i*4):.08+.32*n(21+i*4);
      const x=mark.position.x+(vertical?mark.normal.x*d+Math.cos(a)*.12:Math.cos(a)*d),z=mark.position.z+(vertical?mark.normal.z*d+Math.sin(a)*.12:Math.sin(a)*d);
      const top=m01SurfaceTop(world,x,z,mark.position.y);if(!top||(!vertical&&Math.abs(top.y-mark.position.y)>.25)||top.y>mark.position.y+.05)continue;
      const size=(profile.debris==='clod'?.022:profile.debris==='gravel'?.02:.012)*(1+1.4*n(22+i*4));
      this.spall.push({mark,x,y:top.y+size*.3,z,size,shape:[1,.4+.4*n(23+i*4),.55+.4*n(24+i*4)],yaw:a,tilt:(n(25+i*4)-.5)*.8,
        color:DEBRIS_COLORS[profile.debris][Math.floor(n(26+i*4)*3)%3]});
    }
    const cap=Math.floor(L.debris*(1-M01_DAMAGE_DECAL_LIMITS.residueDebrisShare));
    while(this.spall.length>cap)this.spall.shift();
  }
  remove(mark){const i=this.marks.indexOf(mark);if(i>=0)this.marks.splice(i,1);if(this.spall.some(s=>s.mark===mark))this.spall=this.spall.filter(s=>s.mark!==mark);}
  /** Expire by the mission clock and drop marks whose drawn receiver no longer exists (demolished deck, lowered cover). */
  prune(clock,world){
    for(let i=this.marks.length-1;i>=0;i--){const m=this.marks[i];if(clock-m.start>=m.life||clock<m.start-1e-6){this.remove(m);this.counts.expired++;}}
    if(world&&(world!==this.world||world.revision!==this.revision)){
      // Every consumed mission event refreshes the world; the residue is rebuilt only when what it lies on changed.
      this.world=world;this.revision=world.revision;this.receivers=receiverSignature(world);
      for(let i=this.marks.length-1;i>=0;i--){const m=this.marks[i];if(!receiverExists(world,m)){this.remove(m);this.counts.invalidated++;}}
    }
  }
  /** Per rendered frame: persistent aftermath from saved damage, mark fades, bounded debris and embers. */
  update({state,time,world,trees=null,quality='medium',camera=null,renderer=null,view=null,warm=[]}){
    // Compile the four (still hidden) programs on the first frame, not on the first impact in combat.
    if(renderer&&view&&!this.compiled){this.compiled=true;this.warmFrame=true;renderer.compile(this.group,view,this.scene);}
    if(!world||!state)return;
    this.prune(time,world);this.lastTime=time;this.residueClock.value=time;
    const L=this.limits(quality),damage=(state.damage??[]).slice(-M01_DAMAGE_DECAL_LIMITS.blasts);
    const key=`${quality}|${this.receivers}|${damage.map(d=>`${d.id}@${d.started}@${d.x}@${d.z}`).join('|')}`;
    if(key!==this.residueKey){this.buildResidue(world,damage,L);this.residueKey=key;}
    while(this.marks.length>L.marks){this.remove(this.marks[0]);this.counts.evicted++;}
    const spallCap=Math.floor(L.debris*(1-M01_DAMAGE_DECAL_LIMITS.residueDebrisShare));if(this.spall.length>spallCap)this.spall.splice(0,this.spall.length-spallCap);
    this.writeMarks(time,L,trees);this.writeDebris(time,L);this.writeEmbers(time,L,camera);this.residueMesh.visible=this.residueTriangles>0;
    if(this.warmFrame){this.warmFrame=false;this.warmUp(warm);}
  }
  /** One invisible draw of each mesh (zero-size instances, the degenerate residue triangle) on the first frame, so drivers
   *  that build their pipeline at first draw (ANGLE over Vulkan, SwiftShader) do it while loading, not on a first impact.
   *  `extra` are the owner's empty instanced meshes this module makes appear (the chip FX of rounds on drawn wood and
   *  stone): same zero-size draw; the owner rewrites their counts on its next frame. */
  warmUp(extra=[]){
    const zero=this.matrix.makeScale(0,0,0);
    for(const mesh of [this.marksMesh,this.debrisMesh,this.emberMesh])if(!mesh.visible){mesh.setMatrixAt(0,zero);mesh.count=1;mesh.visible=true;mesh.instanceMatrix.needsUpdate=true;}
    for(const mesh of extra)if(mesh?.isInstancedMesh&&mesh.count===0){mesh.setMatrixAt(0,zero);mesh.count=1;mesh.instanceMatrix.needsUpdate=true;}
    if(this.marksMesh.count===1&&!this.marks.length){this.opacityAttribute.setX(0,0);this.opacityAttribute.needsUpdate=true;}
    if(this.emberMesh.count===1&&!(this.residueEmbers??[]).length){this.glowAttribute.setX(0,0);this.glowAttribute.needsUpdate=true;}
    this.residueMesh.visible=true;
  }
  buildResidue(world,damage,L){
    let blasts=damage.map(d=>m01BlastResidue(world,d));
    const triangles=list=>list.reduce((n,b)=>n+b.polys.reduce((m,p)=>m+p.points.length-2,0),0);
    while(blasts.length>1&&triangles(blasts)>M01_DAMAGE_DECAL_LIMITS.residueTriangles){const i=blasts.findIndex(b=>b.kind!=='demolition');blasts.splice(i<0?0:i,1);}
    this.residue=blasts;const count=triangles(blasts),position=new Float32Array(count*9),normal=new Float32Array(count*9),uv=new Float32Array(count*6),
      color=new Float32Array(count*12),start=new Float32Array(count*3);let t=0;
    for(const b of blasts)for(const p of b.polys)for(let k=1;k<p.points.length-1;k++){
      const flip=dot(newellNormal(p.points),p.normal)<0;
      for(const [j,i] of flip?[[0,0],[1,k+1],[2,k]]:[[0,0],[1,k],[2,k+1]]){
        const at=t*3+j,q=p.points[i];position.set([q.x,q.y,q.z],at*3);normal.set([p.normal.x,p.normal.y,p.normal.z],at*3);uv.set(p.uvs[i],at*2);
        color.set(p.color,at*4);start[at]=p.start;
      }
      t++;
    }
    this.residueGeometry.dispose();const g=count?new THREE.BufferGeometry():emptyResidue();
    if(count){g.setAttribute('position',new THREE.BufferAttribute(position,3));g.setAttribute('normal',new THREE.BufferAttribute(normal,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
      g.setAttribute('color',new THREE.BufferAttribute(color,4));g.setAttribute('residueStart',new THREE.BufferAttribute(start,1));g.computeBoundingSphere();}
    this.residueGeometry=g;this.residueMesh.geometry=g;this.residueMesh.visible=count>0;this.residueTriangles=count;
    this.residueDebris=blasts.flatMap(b=>b.debris.map(d=>({...d,start:damage.find(x=>x.id===b.id)?.started??0}))).slice(-Math.floor(L.debris*M01_DAMAGE_DECAL_LIMITS.residueDebrisShare));
    this.residueEmbers=L.embers?blasts.flatMap(b=>b.embers).slice(-L.embers):[];
  }
  writeMarks(time,L,trees){
    const mesh=this.marksMesh,tint=this.color,overflow=Math.max(0,this.marks.length-Math.floor(L.marks*(1-RANK_FADE)));let count=0;
    // Descriptors are updated in place (and appended while the environment builds): re-index only when the list changes.
    if(trees&&(trees!==this.treeList||trees.length!==this.treeIndex.size)){this.treeList=trees;this.treeIndex=new Map(trees.map(t=>[t.id,t]));}
    const lod=trees?this.treeIndex:null;
    this.marks.forEach((m,rank)=>{
      const age=time-m.start;if(age<0||age>=m.life)return;
      if(m.tree&&lod&&lod.get(m.tree)?.lod!=='near')return;   // the decal matches the near trunk polygon only
      const fadeIn=Math.min(1,age/MARK_FADE_IN),fadeOut=Math.min(1,(m.life-age)/(m.life*MARK_FADE_OUT)),rankFade=rank<overflow?(rank+1)/(overflow+1):1;
      const opacity=fadeIn*fadeOut*rankFade;if(opacity<=.004)return;
      mesh.setMatrixAt(count,m.matrix);mesh.setColorAt(count,tint.setRGB(...m.tint));
      this.cellAttribute.setXY(count,m.cell,m.flip);this.opacityAttribute.setX(count,opacity);count++;
    });
    mesh.count=count;mesh.visible=count>0;
    if(count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;this.cellAttribute.needsUpdate=true;this.opacityAttribute.needsUpdate=true;}
  }
  writeDebris(time,L){
    const mesh=this.debrisMesh,d=this.dummy;let count=0;
    const put=p=>{if(count>=L.debris)return;d.position.set(p.x,p.y,p.z);d.rotation.set(p.tilt,p.yaw,p.tilt*.6);d.scale.set(p.size*p.shape[0],p.size*p.shape[1],p.size*p.shape[2]);d.updateMatrix();
      mesh.setMatrixAt(count,d.matrix);mesh.setColorAt(count,debrisColor(p.color));count++;};
    for(const p of this.residueDebris??[])if(time>=p.start+.35)put(p);   // settles after the flying shards of the blast
    for(const p of this.spall){const age=time-p.mark.start,life=p.mark.life;if(age>=.25&&age<life)put(p);}
    mesh.count=count;mesh.visible=count>0;if(count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}
  }
  writeEmbers(time,L,camera){
    const mesh=this.emberMesh,d=this.dummy;let count=0;
    for(const e of this.residueEmbers??[]){
      if(count>=L.embers)break;const age=time-e.start;if(age<.6||age>=e.life)continue;
      if(camera&&Math.hypot(e.x-camera.x,e.z-camera.z)>140)continue;
      const fade=Math.min(1,(age-.6)/2)*Math.pow(1-age/e.life,1.4),flicker=.72+.28*Math.sin(time*(3.1+e.phase)+e.phase*7)*Math.sin(time*1.7+e.phase);
      const glow=fade*flicker;if(glow<.01)continue;
      d.position.set(e.x,e.y,e.z);d.rotation.set(0,0,0);d.scale.setScalar(e.size*(.85+.3*flicker));d.updateMatrix();
      mesh.setMatrixAt(count,d.matrix);mesh.setColorAt(count,this.color.setRGB(1,.42+.18*flicker,.12));this.glowAttribute.setX(count,glow*.9);count++;
    }
    mesh.count=count;mesh.visible=count>0;if(count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;this.glowAttribute.needsUpdate=true;}
  }
  get diagnostics(){
    const byKind={};for(const m of this.marks)byKind[m.kind]=(byKind[m.kind]??0)+1;
    return {version:M01_DAMAGE_DECAL_VERSION,marks:this.marks.length,visibleMarks:this.marksMesh.count,byKind,spall:this.spall.length,
      residueBlasts:this.residue.map(b=>({id:b.id,kind:b.kind,polygons:b.polys.length,debris:b.debris.length,embers:b.embers.length})),
      residueTriangles:this.residueTriangles,debris:this.debrisMesh.count,embers:this.emberMesh.count,
      drawCalls:[this.marksMesh,this.residueMesh,this.debrisMesh,this.emberMesh].filter(m=>m.visible).length,
      counts:{...this.counts},lastError:this.lastError,limits:M01_DAMAGE_DECAL_LIMITS,atlasReady:Boolean(ATLAS),atlasError:ATLAS_ERROR?String(ATLAS_ERROR.message??ATLAS_ERROR):null,atlasChecksum:ATLAS?.checksum??null};
  }
  dispose(){
    clearTimeout(this.atlasTimer);this.atlasTimer=null;
    this.group.removeFromParent();for(const mesh of [this.marksMesh,this.debrisMesh,this.emberMesh])mesh.dispose();
    for(const g of [this.quad,this.residueGeometry,this.debrisGeometry,this.emberGeometry])g.dispose();
    for(const m of [this.markMaterial,this.residueMaterial,this.debrisMaterial,this.emberMaterial])m.dispose();this.map.dispose();this.heightMap.dispose();
    this.marks=[];this.spall=[];this.residue=[];
  }
}
const TINTS=Object.freeze({stone:[1,1,1],brick:[1,.97,.95],wood:[1,.98,.95],bark:[.92,.9,.88],sleeper:[.86,.82,.78],metal:[1,1,1],rail:[1,1,1],
  earth:[1,1,1],ballast:[1,1,1],road:[1,1,1]});
// Polygon orientation (Newell's method); residue is drawn FrontSide, so every polygon is wound to face its receiver.
function newellNormal(points){
  let x=0,y=0,z=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];x+=(a.y-b.y)*(a.z+b.z);y+=(a.z-b.z)*(a.x+b.x);z+=(a.x-b.x)*(a.y+b.y);}
  return v3(x,y,z);
}
const tintFor=(kind,n)=>(TINTS[kind]??[1,1,1]).map(c=>c*(.9+.2*n));
function receiverExists(world,m){
  const r=m.receiver;
  if(r.type==='terrain'||r.type==='tree'||r.type==='track')return true;   // drawn art that no event removes
  if(r.type==='deck'||r.type==='abutment-face')return world.walkSurfaces.some(c=>c.id===r.id);
  if(r.type==='abutment')return world.walkSurfaces.some(c=>c.id===r.id)||damagedAbutments(world).some(a=>a.id===r.id);
  const b=world.obstacles.find(o=>o.id===r.id);if(!b)return false;
  if(r.type==='box'){
    if((r.sign<0?b.min[r.axis]:b.max[r.axis])!==r.value)return false;
    const half=Math.max(m.sizeU,m.sizeV)/2;
    return ['x','y','z'].every(a=>a===r.axis||m.position[a]>=b.min[a]+half*.2-1e-6&&m.position[a]<=b.max[a]-half*.2+1e-6);
  }
  return true;
}
