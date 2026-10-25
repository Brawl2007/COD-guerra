// R4 WP-1: the world of a new act's area. It IS the current act's TczewWorld (same bridges, same consumed demolitions, same far geometry: the renderer
// keeps drawing the whole battlefield and a round fired at 1 km still meets the same colliders) with the area's own solids added: the parapet of the
// north line, the turned earth the Germans bound to, the wreck. TczewWorld itself is not modified (an input pinned by the golden of amendment 20).
// Pure data; no renderer, no RNG, no clock.
import {TczewWorld} from './tczew-world.js';
import {buildPlayerSolids,indexSolids} from './m01-collision-layout.js';

const box=(id,min,max,extra={})=>({...extra,id,min:{x:min[0],y:min[1],z:min[2]},max:{x:max[0],y:max[1],z:max[2]},material:extra.material??'earth'});

/** The props of the area (kit T12 types), from layout.props: sandbag runs on the parapet, ammunition boxes behind it, wire in front. */
export function areaPropPlacements(layout){
  const p=layout.props,out=[],y=layout.groundY;
  if(!p)return out;
  const s=p.sandbagRuns;
  for(const c of s.courses)for(let x=s.fromX+c.offsetX;x<=s.toX+1e-9;x+=s.stepX){if(s.skipX.some(([a,b])=>x+1.06>a&&x-1.06<b))continue;out.push({type:'sandbag_run',x:Math.round(x*100)/100,z:s.z,yaw:0,lift:c.lift,quality:'low'});}
  for(const [x,z]of p.ammo)out.push({type:'ammo_crate_wood',x,z,yaw:0,lift:0,quality:'low'});
  for(const [a,b]of p.wire.runs)for(let x=a+p.wire.stepX/2;x<=b-p.wire.stepX/2+1e-9;x+=p.wire.stepX)out.push({type:'fence_barbed',x:Math.round(x*100)/100,z:p.wire.z,yaw:0,lift:0,quality:'low'});
  return out.map(o=>({...o,y,area:'north-perimeter',cluster:`np_${o.type}`}));
}

export class M01AreaWorld extends TczewWorld {
  /**
   * `layout`: areas/<area>/layout.json. `extraCovers`: solids built from the act data (the approach plan's turned earth, {id,min,max}). `eventIds`: the current
   * act's consumed events (the bridges stay as the demolitions left them).
   */
  constructor(layout,{extraCovers=[],eventIds=[],flags={}}={}){
    super();
    this.area=layout;this.extraCovers=extraCovers;
    const b=layout.bounds;
    this.layout={...this.layout,bounds:{...this.layout.bounds,playable:{...b.playable},softWarningX:Infinity,outOfBoundsX:Infinity,outOfBoundsGraceSec:b.outOfBoundsGraceSec},
      areaRegions:[b.terrainRegion],features:[...this.layout.features,...(layout.features??[])],area:layout.area};
    this.areaProps=areaPropPlacements(layout);
    this.refresh(eventIds,flags);
  }
  refresh(eventIds,flags={}){
    super.refresh(eventIds,flags);
    if(!this.area)return;   // TczewWorld's own constructor refreshes before the area exists
    const L=this.area,y=L.groundY,P=L.parapets,consumed=new Set(eventIds);
    const parapets=P.segments.map(([x0,x1],i)=>box(`np_parapet_${i}`,[x0,y,P.z0],[x1,y+P.heightM,P.z1],{coverType:'PARAPET'}));
    parapets.push(box('np_parapet_nest',[P.nestFront.x0,y,P.z0],[P.nestFront.x1,y+P.nestFront.heightM,P.z1],{coverType:'PARAPET'}));
    const wreck=L.wreck.boxes.map(w=>box(w.id,w.min,w.max,{material:'metal',coverType:'VEHICLE'}));
    const earth=this.extraCovers.map(c=>box(c.id,[c.min.x,c.min.y,c.min.z],[c.max.x,c.max.y,c.max.z],{coverType:'EARTH'}));
    this.areaCovers=[...parapets,...wreck,...earth];
    this.covers=[...this.covers,...this.areaCovers];
    this.obstacles=[...this.obstacles,...this.areaCovers];
    this.playerSolids=buildPlayerSolids(this,consumed);this.solidIndex=indexSolids(this.playerSolids);
  }
  /** The area is flat open ground at groundY (the renderer flattens its relief over layout.bounds.terrainRegion). Outside the area: the current act's terrain. */
  terrainHeightAt(x,z){
    const r=this.area?.bounds.terrainRegion;
    if(r&&x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ)return this.area.groundY;
    return super.terrainHeightAt(x,z);
  }
  /** The area cover a man is behind: a parapet, the wreck or turned earth within 2 m of his body (any side). Null when none. */
  coverAt(actor){
    for(const c of this.areaCovers??[]){
      const dx=Math.max(c.min.x-actor.x,0,actor.x-c.max.x),dz=Math.max(c.min.z-actor.z,0,actor.z-c.max.z);
      if(Math.hypot(dx,dz)<2)return {id:c.id,type:c.coverType,heightM:c.max.y-c.min.y,position:[(c.min.x+c.max.x)/2,c.min.y,(c.min.z+c.max.z)/2]};
    }
    return null;
  }
  /** Inside the area's playable rectangle. */
  inside(p){const a=this.area.bounds.playable;return p.x>=a.minX&&p.x<=a.maxX&&p.z>=a.minZ&&p.z<=a.maxZ;}
}
