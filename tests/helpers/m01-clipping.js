// Deterministic clipping audit for M01 actors (NPC navigation, PR "npc-nav").
//
// It runs on the REAL simulation state, one observation per tick, and never touches the simulation:
//   overlap : an actor's body (circle, `radius`) overlaps a solid at the end of a tick (same vertical rule as TczewWorld.move);
//   sweep   : the straight move of one tick passes through a solid without ending inside it (tunnelling through a thin wall).
// Solids audited, all of them things the player SEES as a wall:
//   collider  every entry of world.obstacles (bridge piers, towers, portals, huts, station, sandbags, trees, drawn yard wagons)
//   truss     the bridge girders (collider 'partialCover': bullets pass between them, bodies do not)
//   sandbag   the ckm emplacement walls (decoration without a world collider; they leave with the west demolition)
//   player:*  (2026-10-18, phys x npc integration) every solid of world.playerSolids that is not already above: the casemate and the shelter walls (structure), the parapets,
//             portal piers and span chords of the bridge heads (bridge), the girders with their drawn overhang and the rails over the joints (truss), the hut barrels and the
//             423-prop T12 kit (prop). Oriented boxes are tested in their own frame. Left out: 'obstacle' (the same boxes as world.obstacles), 'deck' (walking surfaces,
//             whose faces the NPC height rule of TczewWorld.move treats as ground) and 'emplacement' (the same bags as the sandbag layer, one table: m01-nav-layout.js).
// One event is counted per actor and solid each time the actor ENTERS the solid; staying inside is not counted again.
// 2026-10-18 (phys x npc integration), two rules for the new player layer, both reported, neither hiding a walk:
//   placements  a jump of more than PLACEMENT_M in one tick is the simulation PLACING a man (the roll call seats the squad in the shelter, a restore), not a walk (the fastest
//               walk is 6 m/s = 0.3 m a tick): what it passes over is listed in `placements` (not asserted), and where it ENDS is still audited as an overlap;
//   seated      a man the roll call seats (pose 'seated') sits on the shelter bench: that overlap is not a clip. Any other solid still counts for him.
// And one for every layer (2026-10-18): a sweep is judged at the height the man walked at, the height at the start of the tick, which is the height TczewWorld.move tests a
// solid's band at during the whole step (it sets y only at the end). A man coming down the road embankment across the top of the half-buried cover at the shelter entrance
// (cv_shelter_entrance, top -1.8 m, the slope above it) walked over it, not through it; where he ENDS is still audited at his new height.
// PASSAGES are the doorways of the authored geometry: a solid that is drawn with an opening but exported as one slab. Inside a passage the
// slab is not a wall for the actors walking through it (src/world/m01-nav-layout.js, M01_PASSAGES).
import {ckmEmplacementSolids,M01_PASSAGES,CKM_EMPLACEMENT} from '../../src/world/m01-nav-layout.js';
import {CKM_POSITION} from '../../src/game/m01-simulation.js';

// A passage is the opening: the man's centre in its lane, his body allowed to reach the slab faces from outside.
const inPassage=(solidId,a,r)=>M01_PASSAGES.some(p=>p.solid===solidId&&a.x>=p.min.x-r-1e-6&&a.x<=p.max.x+r+1e-6&&a.z>=p.min.z&&a.z<=p.max.z);
const vertical=(a,b)=>a.y+1.45>b.min.y&&a.y+.1<b.max.y;
// An oriented box (b.obb: centre, half sizes, the cos/sin of its yaw as in src/world/m01-collision-layout.js) is tested in its own frame; an axis-aligned one as before.
const local=(b,p)=>{const dx=p.x-b.obb.cx,dz=p.z-b.obb.cz;return {x:dx*b.obb.c-dz*b.obb.s,z:dx*b.obb.s+dz*b.obb.c};};
const frame=b=>b.obb?{min:{x:-b.obb.hx,z:-b.obb.hz},max:{x:b.obb.hx,z:b.obb.hz}}:b;
const overlaps=(a,b)=>{if(!vertical(a,b))return false;const p=b.obb?local(b,a):a,f=frame(b);
  return p.x+a.radius>f.min.x&&p.x-a.radius<f.max.x&&p.z+a.radius>f.min.z&&p.z-a.radius<f.max.z;};
// Segment p->q against the box grown by the radius (slab test, open interval: grazing a face is not a crossing).
function crosses(p,q,b,r){
  if(b.obb){p=local(b,p);q=local(b,q);b=frame(b);}
  const lo=[b.min.x-r,b.min.z-r],hi=[b.max.x+r,b.max.z+r],o=[p.x,p.z],d=[q.x-p.x,q.z-p.z];let t0=0,t1=1;
  for(let k=0;k<2;k++){
    if(Math.abs(d[k])<1e-12){if(o[k]<=lo[k]||o[k]>=hi[k])return false;continue;}
    let u=(lo[k]-o[k])/d[k],v=(hi[k]-o[k])/d[k];if(u>v)[u,v]=[v,u];t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>=t1)return false;
  }
  return true;
}
/** The emplacement as it was drawn before the rear door: closed on four sides. For auditing the predecessor, which still has that wall. */
export const CLOSED_EMPLACEMENT=Object.freeze({...CKM_EMPLACEMENT,walls:CKM_EMPLACEMENT.walls.map(({gap,...w})=>w)});
/** The kinds of world.playerSolids that are audited on top of the colliders, girders and sandbags (see the header). */
export const AUDITED_PLAYER_KINDS=Object.freeze(['structure','bridge','truss','prop']);
export function auditedSolids(world,layout=CKM_EMPLACEMENT,{playerSolids=true}={}){
  const box=(id,kind,b)=>({id,kind,min:b.min,max:b.max});
  const list=world.obstacles.map(b=>box(b.id,'collider',b));
  for(const c of world.colliders)if(c.collider==='partialCover')list.push(box(c.id,'truss',c));
  if(!world.events.includes('evt_m01_west_demolition'))for(const s of ckmEmplacementSolids(CKM_POSITION,layout))list.push(box(s.id,'sandbag',s));
  // The player's solid list (absent on trees before the body physics). Ids get a prefix: a girder is in both layers, its player box is 0.2 m longer at each end.
  if(playerSolids)for(const b of world.playerSolids??[])if(AUDITED_PLAYER_KINDS.includes(b.kind))
    list.push({id:'player:'+b.id,kind:'player:'+b.kind,min:{x:b.minX,y:b.y0,z:b.minZ},max:{x:b.maxX,y:b.y1,z:b.maxZ},obb:b.s===0&&Math.abs(b.c)===1?null:{cx:b.cx,cz:b.cz,hx:b.hx,hz:b.hz,c:b.c,s:b.s}});
  return list;
}

/** `observe({sim})` once per tick (the `onStep` of the route driver). `report()` returns the deterministic list of events. */
export const PLACEMENT_M=1;
const SEAT_SOLIDS=new Set(['player:shelter_bench']);
export function clippingAudit({layout=CKM_EMPLACEMENT,playerSolids=true}={}){
  const events=[],placements=[],previous=new Map(),flagged=new Set();let ticks=0,solids=null,revision=-1;
  function observe({sim}){
    ticks++;
    if(revision!==sim.world.revision){solids=auditedSolids(sim.world,layout,{playerSolids});revision=sim.world.revision;}
    for(const a of sim.actors){
      if(!a.alive||!a.active||a.carriedBy){previous.delete(a.id);continue;}
      const before=previous.get(a.id);previous.set(a.id,{x:a.x,y:a.y,z:a.z});
      const placed=before&&Math.hypot(a.x-before.x,a.z-before.z)>PLACEMENT_M;
      for(const s of solids){
        const key=a.id+'|'+s.id;let kind=null;
        if(!inPassage(s.id,a,a.radius)&&!(before&&inPassage(s.id,before,a.radius))&&!(a.pose==='seated'&&SEAT_SOLIDS.has(s.id))){
          if(overlaps(a,s))kind='overlap';
          else if(before&&vertical(before,s)&&(before.x!==a.x||before.z!==a.z)&&crosses(before,a,s,a.radius)){
            if(placed)placements.push(`${ticks} t=${Math.round(sim.clock*100)/100} ${a.id} placed over ${s.kind}:${s.id} (${Math.round(before.x*100)/100},${Math.round(before.z*100)/100}) -> (${Math.round(a.x*100)/100},${Math.round(a.z*100)/100})`);
            else kind='sweep';
          }
        }
        if(kind&&!flagged.has(key)){flagged.add(key);
          events.push({tick:ticks,clock:Math.round(sim.clock*100)/100,actor:a.id,group:a.group??null,task:a.task??null,state:a.state,solid:s.id,kind:s.kind,hit:kind,
            x:Math.round(a.x*100)/100,z:Math.round(a.z*100)/100});}
        else if(!kind)flagged.delete(key);
      }
    }
  }
  return {observe,events,placements,get ticks(){return ticks;},
    report(){return events.map(e=>`${e.tick} t=${e.clock} ${e.actor} [${e.group??'-'}/${e.task??'-'}/${e.state}] ${e.hit} ${e.kind}:${e.solid} at (${e.x},${e.z})`);}};
}

/**
 * Men standing inside each other: two living, present, uncarried men on one level whose centres are closer than 0.35 m (a body is 0.30 m in radius), counted once
 * per pair and episode, with the longest stay in ticks. `observe({sim})` once per tick, like clippingAudit.
 * Out of scope, on purpose: two Germans who are both on the T48 withdrawal march (`fallBack`): that march is a straight line by the battle clock (stepFallBack) from where the
 * east demolition found each man to his place in the knot, 700 m from the player, and two such lines may cross for a couple of seconds. They are not exempt once they stand.
 */
export function stackingAudit(){
  const open=new Map(),pairs=new Map();let ticks=0;
  return {
    observe({sim}){
      // Display-only actors (the station-yard civilians and the two MG34 loaders) are authored presentation: placed on fixed yard slots or a metre behind their gun, set directly
      // by updateYard/updateLoaders and never walked by moveActor, so a pair with one of them is no navigation failure. They still count in the wall audit (clippingAudit).
      ticks++;const men=sim.actors.filter(a=>a.alive&&a.active&&!a.carriedBy&&!a.displayOnly);
      for(let i=0;i<men.length;i++)for(let j=i+1;j<men.length;j++){
        const a=men[i],b=men[j],k=a.id+'|'+b.id;
        if(Math.abs(a.y-b.y)<=1.5&&Math.hypot(a.x-b.x,a.z-b.z)<.35&&!(a.fallBack&&b.fallBack)){
          const e=pairs.get(k)??{first:Math.round(sim.clock*100)/100,episodes:0,longestTicks:0};
          if(!open.has(k)){open.set(k,0);e.episodes++;}
          open.set(k,open.get(k)+1);e.longestTicks=Math.max(e.longestTicks,open.get(k));pairs.set(k,e);
        }else open.delete(k);
      }
    },
    get ticks(){return ticks;},
    summary(){return {pairs:pairs.size,longestStayTicks:Math.max(0,...[...pairs.values()].map(e=>e.longestTicks)),list:[...pairs].map(([k,v])=>({pair:k,...v}))};},
    report(){return [...pairs].map(([k,v])=>`${k} from t=${v.first} (${v.episodes} episode(s), longest ${v.longestTicks} ticks)`);}
  };
}
