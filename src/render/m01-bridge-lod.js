import {selectLodBand} from './m01-lod-policy.js';
// Renderer-only hysteresis. Authority still owns complete part descriptors and hard 400/800 distances.
// Enter far at 824m, leave at 776m (24m each side); medium band is 412/388m.
// Far cards require actual distance >800m on first selection; hysteresis retains them only as far as 776m.
export const M01_BRIDGE_LOD_BANDS=Object.freeze({mediumEnter:412,mediumExit:388,farEnter:824,farExit:776});
// Hard authority distances. Stateful transitions below stay bespoke: they step one level at a time (0->2 only past 824 m, 2->1 down to 388 m),
// which the shared single-hold-band hysteresis cannot reproduce without changing behaviour in the 800-824 m and 388-400 m zones.
const BRIDGE_HARD_BANDS=Object.freeze([400,800]);
export class M01BridgeLOD{
 constructor(){this.levels=new Map();this.parts=new Map();this.transitions=0;this.world=null;this.worldRevision=-1;}
 syncWorld(world){if(world!==this.world||world?.revision!==this.worldRevision){this.world=world;this.worldRevision=world?.revision;this.levels.clear();this.parts.clear();}}
 select(id,distance,{visible=true,impostorReady=false,damaged=false,authorityLOD=2}={}){
  let old=this.levels.get(id),level;
  if(damaged)level=authorityLOD;
  else if(old===undefined)level=selectLodBand(distance,BRIDGE_HARD_BANDS); // first selection = shared policy (no previous)
  else if(old===0)level=distance>=M01_BRIDGE_LOD_BANDS.farEnter?2:distance>=M01_BRIDGE_LOD_BANDS.mediumEnter?1:0;
  else if(old===1)level=distance>=M01_BRIDGE_LOD_BANDS.farEnter?2:distance<M01_BRIDGE_LOD_BANDS.mediumExit?0:1;
  else level=distance<M01_BRIDGE_LOD_BANDS.mediumExit?0:distance<M01_BRIDGE_LOD_BANDS.farExit?1:2;
  const previous=this.parts.get(id),wasCard=previous?.impostor??false,impostor=visible&&!damaged&&impostorReady&&level===2&&(distance>824||wasCard&&distance>=776||old===undefined&&distance>800);
  if(old!==undefined&&(level!==old||impostor!==wasCard))this.transitions++;
  this.levels.set(id,level);const record=previous??{};record.level=level;record.impostor=impostor;record.visible=visible;record.distance=distance;record.damaged=damaged;this.parts.set(id,record);return level;
 }
 get diagnostics(){return {bands:M01_BRIDGE_LOD_BANDS,transitions:this.transitions,parts:Object.fromEntries(this.parts)};}
}
