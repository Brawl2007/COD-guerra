// R4 duration work (2026-11-03): the clipping audit of m01-clipping.js made cheap enough for the long routes of Act VII-a (two echelons, 31 Germans, 163 earth covers: a route is
// 4000-5000 ticks and the full audit costs ~6 ms a tick). The events are the SAME as the full audit's, tick numbers included (tests/m01-act-vii-a.test.js checks that on a route
// with an overlap put in on purpose), because the two things it leaves out cannot change them:
//   - the men who did not move since the last observation: a man standing still cannot ENTER a solid (the audit counts the ENTRY, once, and the entry of a man who arrived inside
//     a solid was counted when he arrived); his `previous` position is the one the audit kept for him, which is his position;
//   - the solids far from the act's area (the current act's bridges, station and props, 700 m away): no man of the act can touch them.
// The world the audit sees is the same world with its solid lists cut to the area; it is rebuilt when the world's revision changes.
import {clippingAudit} from './m01-clipping.js';

export const ACT_AREA=Object.freeze({minX:-700,maxX:-150,minZ:-1450,maxZ:-1000});
export function areaClippingAudit(area=ACT_AREA){
  const inner=clippingAudit(),last=new Map();let view=null;
  const near=b=>b.max.x>area.minX&&b.min.x<area.maxX&&b.max.z>area.minZ&&b.min.z<area.maxZ;
  return {
    observe({sim}){
      const w=sim.world;
      if(!view||view.revision!==w.revision)view={revision:w.revision,events:w.events,obstacles:w.obstacles.filter(near),colliders:[],
        playerSolids:(w.playerSolids??[]).filter(b=>b.maxX>area.minX&&b.minX<area.maxX&&b.maxZ>area.minZ&&b.minZ<area.maxZ)};
      const moved=sim.actors.filter(a=>{
        const l=last.get(a.id),changed=!l||l.x!==a.x||l.y!==a.y||l.z!==a.z||l.alive!==a.alive||l.active!==a.active||l.carriedBy!==a.carriedBy;
        last.set(a.id,{x:a.x,y:a.y,z:a.z,alive:a.alive,active:a.active,carriedBy:a.carriedBy});return changed;
      });
      inner.observe({sim:{actors:moved,clock:sim.clock,world:view}});
    },
    get events(){return inner.events;},get placements(){return inner.placements;},get ticks(){return inner.ticks;},report:()=>inner.report()
  };
}
