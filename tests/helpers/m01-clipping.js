// Deterministic clipping audit for M01 actors (NPC navigation, PR "npc-nav").
//
// It runs on the REAL simulation state, one observation per tick, and never touches the simulation:
//   overlap : an actor's body (circle, `radius`) overlaps a solid at the end of a tick (same vertical rule as TczewWorld.move);
//   sweep   : the straight move of one tick passes through a solid without ending inside it (tunnelling through a thin wall).
// Solids audited, all of them things the player SEES as a wall:
//   collider  every entry of world.obstacles (bridge piers, towers, portals, huts, station, sandbags, trees, drawn yard wagons)
//   truss     the bridge girders (collider 'partialCover': bullets pass between them, bodies do not)
//   sandbag   the ckm emplacement walls (decoration without a world collider; they leave with the west demolition)
// One event is counted per actor and solid each time the actor ENTERS the solid; staying inside is not counted again.
// PASSAGES are the doorways of the authored geometry: a solid that is drawn with an opening but exported as one slab. Inside a passage the
// slab is not a wall for the actors walking through it (src/world/m01-nav-layout.js, M01_PASSAGES).
import {ckmEmplacementSolids,M01_PASSAGES} from '../../src/world/m01-nav-layout.js';
import {CKM_POSITION} from '../../src/game/m01-simulation.js';

// A passage is the opening: the man's centre in its lane, his body allowed to reach the slab faces from outside.
const inPassage=(solidId,a,r)=>M01_PASSAGES.some(p=>p.solid===solidId&&a.x>=p.min.x-r-1e-6&&a.x<=p.max.x+r+1e-6&&a.z>=p.min.z&&a.z<=p.max.z);
const vertical=(a,b)=>a.y+1.45>b.min.y&&a.y+.1<b.max.y;
const overlaps=(a,b)=>vertical(a,b)&&a.x+a.radius>b.min.x&&a.x-a.radius<b.max.x&&a.z+a.radius>b.min.z&&a.z-a.radius<b.max.z;
// Segment p->q against the box grown by the radius (slab test, open interval: grazing a face is not a crossing).
function crosses(p,q,b,r){
  const lo=[b.min.x-r,b.min.z-r],hi=[b.max.x+r,b.max.z+r],o=[p.x,p.z],d=[q.x-p.x,q.z-p.z];let t0=0,t1=1;
  for(let k=0;k<2;k++){
    if(Math.abs(d[k])<1e-12){if(o[k]<=lo[k]||o[k]>=hi[k])return false;continue;}
    let u=(lo[k]-o[k])/d[k],v=(hi[k]-o[k])/d[k];if(u>v)[u,v]=[v,u];t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>=t1)return false;
  }
  return true;
}
export function auditedSolids(world){
  const box=(id,kind,b)=>({id,kind,min:b.min,max:b.max});
  const list=world.obstacles.map(b=>box(b.id,'collider',b));
  for(const c of world.colliders)if(c.collider==='partialCover')list.push(box(c.id,'truss',c));
  if(!world.events.includes('evt_m01_west_demolition'))for(const s of ckmEmplacementSolids(CKM_POSITION))list.push(box(s.id,'sandbag',s));
  return list;
}

/** `observe({sim})` once per tick (the `onStep` of the route driver). `report()` returns the deterministic list of events. */
export function clippingAudit(){
  const events=[],previous=new Map(),flagged=new Set();let ticks=0,solids=null,revision=-1;
  function observe({sim}){
    ticks++;
    if(revision!==sim.world.revision){solids=auditedSolids(sim.world);revision=sim.world.revision;}
    for(const a of sim.actors){
      if(!a.alive||!a.active||a.carriedBy){previous.delete(a.id);continue;}
      const before=previous.get(a.id);previous.set(a.id,{x:a.x,z:a.z});
      for(const s of solids){
        const key=a.id+'|'+s.id;let kind=null;
        if(vertical(a,s)&&!inPassage(s.id,a,a.radius)&&!(before&&inPassage(s.id,before,a.radius))){
          if(overlaps(a,s))kind='overlap';
          else if(before&&(before.x!==a.x||before.z!==a.z)&&crosses(before,a,s,a.radius))kind='sweep';
        }
        if(kind&&!flagged.has(key)){flagged.add(key);
          events.push({tick:ticks,clock:Math.round(sim.clock*100)/100,actor:a.id,group:a.group??null,task:a.task??null,state:a.state,solid:s.id,kind:s.kind,hit:kind,
            x:Math.round(a.x*100)/100,z:Math.round(a.z*100)/100});}
        else if(!kind)flagged.delete(key);
      }
    }
  }
  return {observe,events,get ticks(){return ticks;},
    report(){return events.map(e=>`${e.tick} t=${e.clock} ${e.actor} [${e.group??'-'}/${e.task??'-'}/${e.state}] ${e.hit} ${e.kind}:${e.solid} at (${e.x},${e.z})`);}};
}
