import definition from '../../missions/m01-tczew/mission.json' with {type:'json'};

export const M01_ENVELOPE_MARGIN=20;
const rect=(id,minX,maxX,minZ,maxZ)=>Object.freeze({id,minX,maxX,minZ,maxZ});
const bounds=(id,points)=>rect(id,Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0])),Math.min(...points.map(p=>p.at(-1))),Math.max(...points.map(p=>p.at(-1))));

/** Renderer data only. Source arithmetic not exported by M01Simulation is recorded here with its provenance.
 * These are bounds over whole destination families, not observations of the initial active cast. Rectangle hulls
 * also protect every connecting route and firing origin; the 20 m margin is applied after the hulls are built.
 * Decorative water, distant railway to Malbork and aircraft flight paths are not ground participant routes.
 */
export function buildTerrainEnvelope(world){
  const regions=[],add=(id,points)=>regions.push(bounds(id,points));
  const p=world.layout.bounds.playable;regions.push(rect('layout:playable',p.minX,p.maxX,p.minZ,p.maxZ));
  for(const feature of world.layout.features){
    if(feature.point||feature.pickup)add(`feature:${feature.id}`,[feature.point??feature.pickup]);
    if(feature.polyline&&['bridge','road','objective_path','vehicle'].includes(feature.type))add(`route:${feature.id}`,feature.polyline);
    if(feature.id==='rail_embankment_west'||feature.id==='rail_line_southwest')add(`route:${feature.id}`,feature.polyline);
    if(feature.type==='building'&&feature.polygon)add(`feature:${feature.id}`,feature.polygon);
  }
  // All authored nodes, including nodes inactive/destroyed in the current world revision.
  for(const node of world.layout.coverNodes)add(`cover:${node.id}`,[node.position]);
  const lines=(id,value)=>{if(value.x&&value.z)regions.push(rect(id,...value.x,...value.z));else for(const [key,line]of Object.entries(value))lines(`${id}:${key}`,line);};
  for(const group of definition.groups)for(const fire of group.firePositions??[]){
    if(fire.position)add(`fire:${fire.id}`,[fire.position]);
    if(fire.line)lines(`fire:${fire.id}`,fire.line);
  }
  // src/game/m01-simulation.js reset/eastPosition: every cast slot and both inactive eastern groups.
  const cast=definition.cast.filter(c=>c.id!=='jan_wrona');
  const spawn=cast.map((c,i)=>c.id==='tadeusz_nowicki'?[17,3]:c.id==='generic_rifleman'?[-300,30]:c.role==='ENGINEER'?[-42-i*.6,10]:c.role==='MEDIC'?[world.point('aid_position').x,world.point('aid_position').z]:[-76-i*1.6,24+i%3*2]);
  add('source:reset-cast',spawn);
  const east=[];for(let i=2;i<40;i++){const k=i<14?i-2:i-14;east.push(i<14?[1053+k%3*2,9.5+k*2]:k<14?[1076+k%4*7,-80+k*5]:[1076+k%4*6,52+(k-14)*4]);}add('source:eastPosition',east);
  // T23 (east front visible) holdSlot: the 24 east-platoon men stand on the deck end from mission data grp_east_platoon.hold.layout.
  const hold=definition.groups.find(g=>g.id==='grp_east_platoon')?.hold?.layout;
  if(hold){const slots=[];for(let i=0;i<24;i++)slots.push([hold.x0+i%hold.columns*hold.dx,hold.z0+Math.floor(i/hold.columns)*hold.dz]);add('source:east-hold-layout',slots);}
  // updateActors: full 24-member withdrawal, offscreen recovery (x655), Germans 690..1080.
  const platoon=[];for(let i=0;i<24;i++)platoon.push([1040+i%4*2,38+i%4*.65],[-322-i%4*1.6,30+Math.floor(i/4)%6*1.3],[12,37.8+i%2*.35],[-110,40],[-235,30]);
  add('source:platoon-all-stages',platoon);
  const spans=definition.groups.find(g=>g.id==='grp_de_spans');add('source:span-advance-retreat',[[spans.maxAdvanceX,39.6],[1080,41.8]]);
  // makeCKMCrew/updateActors, evacuation roots + carried casualty offset, roll-call seats.
  add('source:ckm-crew-route',[[21.206+2.17,42.971],[22.08+2.17,42.48],[20.4+2.17,41.6],[10,40],[-14,40],[-173.2,24.4]]);
  add('source:evacuation-and-roll-call',[[-300-1.4-.92,30+2.3+.92],[-332-2-.92,24+2.2-.92],[-332+.9,24+.7],[-263.2,69.6],[-256.9,73.9]]);
  // consume(): actual distant fire origins are isolated protected regions, never a fictitious far city.
  for(const [id,x,z]of [['second_air_pass',-550,60],['north_contact_distant',-500,-1100],['kozliny_attack_distant',-500,-1300]])add(`source:fire:${id}`,[[x,z]]);
  const frozen=Object.freeze(regions),extent=rect('extent',Math.min(...regions.map(r=>r.minX))-20,Math.max(...regions.map(r=>r.maxX))+20,Math.min(...regions.map(r=>r.minZ))-20,Math.max(...regions.map(r=>r.maxZ))+20);
  // Distance to the union's raw rectangle hulls. Negative means inside a hull. No per-sample allocation.
  const distance=(x,z)=>{let d=Infinity;for(const r of frozen){const dx=Math.max(r.minX-x,0,x-r.maxX),dz=Math.max(r.minZ-z,0,z-r.maxZ);d=Math.min(d,Math.hypot(dx,dz));}return d;};
  return Object.freeze({margin:M01_ENVELOPE_MARGIN,regions:frozen,extent,distance,contains:(x,z)=>distance(x,z)<=M01_ENVELOPE_MARGIN});
}
