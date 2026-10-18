// Single source of the dressed placements of the M01 prop kit. Visual and collision layers both derive from here (no render import, no RNG).
export const M01_FENCE_GATE=Object.freeze({x0:-264,x1:-258,z:66});   // section centres removed from the combat-area fence (x -265.5 .. -256.5)

export const M01_PROP_CLUSTERS=Object.freeze([
  Object.freeze({id:'station_south_01',area:'station-yard',style:'rail',x:-452,z:18,yaw:.06,seed:101}),
  Object.freeze({id:'station_south_02',area:'station-yard',style:'freight',x:-438,z:17,yaw:-.08,seed:102}),
  Object.freeze({id:'station_south_03',area:'station-yard',style:'maintenance',x:-424,z:18,yaw:.12,seed:103}),
  Object.freeze({id:'station_south_04',area:'station-yard',style:'freight',x:-410,z:17,yaw:-.04,seed:104}),
  Object.freeze({id:'station_south_05',area:'station-yard',style:'rail',x:-396,z:18,yaw:.10,seed:105}),
  Object.freeze({id:'station_south_06',area:'station-yard',style:'freight',x:-382,z:17,yaw:-.12,seed:106}),
  Object.freeze({id:'station_south_07',area:'station-yard',style:'maintenance',x:-368,z:18,yaw:.08,seed:107}),
  Object.freeze({id:'station_south_08',area:'station-yard',style:'freight',x:-354,z:17,yaw:-.06,seed:108}),
  Object.freeze({id:'station_north_01',area:'station-yard',style:'rail',x:-430,z:60,yaw:.03,seed:109}),
  Object.freeze({id:'station_north_02',area:'station-yard',style:'freight',x:-380,z:60,yaw:-.06,seed:110}),

  Object.freeze({id:'rail_approach_01',area:'railway-approach',style:'rail',x:-520,z:-43,yaw:.34,seed:201}),
  Object.freeze({id:'rail_approach_02',area:'railway-approach',style:'rail',x:-455,z:-44,yaw:.24,seed:202}),
  Object.freeze({id:'rail_approach_03',area:'railway-approach',style:'rail',x:-390,z:-31,yaw:.16,seed:203}),
  Object.freeze({id:'rail_approach_04',area:'railway-approach',style:'rail',x:-325,z:-27,yaw:.10,seed:204}),
  Object.freeze({id:'rail_approach_05',area:'railway-approach',style:'rail',x:-260,z:-22,yaw:.07,seed:205}),
  Object.freeze({id:'rail_approach_06',area:'railway-approach',style:'rail',x:-195,z:-19,yaw:.04,seed:206}),
  Object.freeze({id:'rail_approach_07',area:'railway-approach',style:'rail',x:-130,z:-16,yaw:.02,seed:207}),
  Object.freeze({id:'rail_approach_08',area:'railway-approach',style:'rail',x:-70,z:-14,yaw:0,seed:208}),

  Object.freeze({id:'bridge_rail_01',area:'bridge-approach',style:'rail',x:-55,z:-14,yaw:0,seed:301}),
  Object.freeze({id:'bridge_rail_02',area:'bridge-approach',style:'maintenance',x:-25,z:-14,yaw:.02,seed:302}),
  Object.freeze({id:'bridge_mid_01',area:'bridge-approach',style:'maintenance',x:-70,z:19,yaw:.05,seed:303}),
  Object.freeze({id:'bridge_mid_02',area:'bridge-approach',style:'freight',x:-42,z:20,yaw:-.04,seed:304}),
  Object.freeze({id:'bridge_mid_03',area:'bridge-approach',style:'combat',x:-18,z:20,yaw:.10,seed:305}),
  Object.freeze({id:'bridge_road_01',area:'bridge-approach',style:'maintenance',x:-68,z:56,yaw:-.05,seed:306}),
  Object.freeze({id:'bridge_road_02',area:'bridge-approach',style:'combat',x:-35,z:57,yaw:.12,seed:307}),

  Object.freeze({id:'combat_repair_01',area:'combat-area',style:'combat',x:-150,z:8,yaw:.14,seed:401}),
  Object.freeze({id:'combat_road_01',area:'combat-area',style:'combat',x:-125,z:62,yaw:-.10,seed:402}),
  Object.freeze({id:'combat_road_02',area:'combat-area',style:'combat',x:-100,z:64,yaw:.18,seed:403}),
  Object.freeze({id:'combat_road_03',area:'combat-area',style:'freight',x:-78,z:64,yaw:-.16,seed:404}),
  Object.freeze({id:'combat_portal_01',area:'combat-area',style:'combat',x:-12,z:60,yaw:.08,seed:405})
]);

export function propNoise(seed,index=0){
  let x=((seed>>>0)+Math.imul((index+1)>>>0,0x9e3779b1))>>>0;
  x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;
  return (x>>>0)/4294967296;
}

export const rotateCluster=(cluster,lx,lz)=>{
  const c=Math.cos(cluster.yaw),s=Math.sin(cluster.yaw);
  return {x:cluster.x+lx*c-lz*s,z:cluster.z+lx*s+lz*c};
};


// Original T12 kit placements. Cluster anchors and all gameplay geometry stay authoritative; the player's solid footprints of these props are
// derived from this very list in src/world/m01-collision-layout.js (the renderer draws it, the simulation collides with it).
export function buildM01AcceptedPropPlacements(world){
 const items=[],add=(type,x,z,yaw=0,quality='low',lift=0,scale=[1,1,1],area='railway-approach',cluster='rail-infrastructure')=>items.push({id:`t12_${items.length}`,type,x,z,y:world.terrainHeightAt(x,z)+lift,yaw,quality,scale,area,cluster});
 for(const c of M01_PROP_CLUSTERS){const types=c.style==='rail'?['sleeper_stack','point_lever','railway_lantern','ammo_tin_box']:c.style==='freight'?['supply_crate_planked','barrel_wood','hand_cart','horse_cart']:c.style==='maintenance'?['sleeper_stack','drum_fuel_200l','jerrycans','ammo_tin_box']:['ammo_crate_wood','sandbag_burst','sandbag_run','sandbag_corner'];
  for(let i=0;i<types.length;i++){const p=rotateCluster(c,(i%2)*2.8-1.2,Math.floor(i/2)*2.5-.3);add(types[i],p.x,p.z,c.yaw,i<2||types[i]==='railway_lantern'?'low':i===2?'medium':'high',0,[1,1,1],c.area,c.id);}
 }
 // Wires retain the kit's authored sag and crossbar spacing; pole bases follow the embankment-side terrain.
 for(let x=-520;x<=-64;x+=12){const z=-46+(x+520)*.068;add('telegraph_pole',x,z);if(x<-64){const nextZ=z+12*.068,dy=world.terrainHeightAt(x+12,nextZ)-world.terrainHeightAt(x,z);add('telegraph_wire_span',x,z,-Math.atan2(nextZ-z,12),'low',0,[Math.hypot(12,nextZ-z)/12,1,1]);items.at(-1).rise=dy;}}
 // The combat-area fence has a gate where the guide line of the final objective crosses it (the shelter's north entrance, x -265..-256): without it the
 // fence, now solid for the player, would wall off the shelter. The sections are absent from the drawing as well, so nothing visible is walked through.
 for(let x=-318;x<-42;x+=3)if(x<M01_FENCE_GATE.x0||x>M01_FENCE_GATE.x1)add('fence_barbed',x,66,0,'low',0,[1,1,1],'combat-area');
 for(let x=-450;x<-354;x+=3)add('fence_wood',x,61,0,'medium',0,[1,1,1],'station-yard');
 for(const [type,x,z,yaw]of [['water_crane',-415,-23,0],['coal_pile',-402,-24,0],['semaphore_signal',-345,-22,0],['semaphore_signal',-60,-9,Math.PI],['point_lever',-438,-24,.25]])add(type,x,z,yaw,'low',0,[1,1,1],'station-yard');
 return items;
}
