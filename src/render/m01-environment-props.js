// Visual-only environment dressing for M01. No simulation RNG, colliders or mission state.
export const M01_PROP_QUALITY_RANK=Object.freeze({low:0,medium:1,high:2});

export const M01_PROP_CLUSTERS=Object.freeze([
  Object.freeze({id:'station_service_west',area:'station-yard',style:'rail',x:-448,z:18,yaw:.08,seed:101}),
  Object.freeze({id:'station_service_center',area:'station-yard',style:'freight',x:-414,z:18,yaw:-.06,seed:102}),
  Object.freeze({id:'station_freight_east',area:'station-yard',style:'freight',x:-374,z:19,yaw:.10,seed:103}),
  Object.freeze({id:'station_north_maintenance',area:'station-yard',style:'rail',x:-432,z:65,yaw:.04,seed:104}),
  Object.freeze({id:'hut_supply_edge',area:'station-yard',style:'freight',x:-286,z:31,yaw:-.22,seed:105}),
  Object.freeze({id:'rail_west_outer',area:'railway-approach',style:'rail',x:-512,z:-43,yaw:.37,seed:201}),
  Object.freeze({id:'rail_west_station',area:'railway-approach',style:'rail',x:-414,z:-34,yaw:.18,seed:202}),
  Object.freeze({id:'rail_west_mid',area:'railway-approach',style:'rail',x:-302,z:-25,yaw:.08,seed:203}),
  Object.freeze({id:'rail_west_inner',area:'railway-approach',style:'rail',x:-185,z:-18,yaw:.02,seed:204}),
  Object.freeze({id:'bridge_rail_margin',area:'bridge-approach',style:'rail',x:-48,z:-13,yaw:0,seed:301}),
  Object.freeze({id:'bridge_between_approaches',area:'bridge-approach',style:'maintenance',x:-43,z:20,yaw:.04,seed:302}),
  Object.freeze({id:'bridge_road_margin',area:'bridge-approach',style:'maintenance',x:-58,z:55,yaw:-.04,seed:303}),
  Object.freeze({id:'combat_repair_scatter',area:'combat-area',style:'combat',x:-145,z:8,yaw:.15,seed:401}),
  Object.freeze({id:'combat_portal_scatter',area:'combat-area',style:'combat',x:-24,z:59,yaw:-.10,seed:402}),
  Object.freeze({id:'combat_squad_edge',area:'combat-area',style:'combat',x:-91,z:62,yaw:.22,seed:403})
]);

export function propNoise(seed,index=0){
  let x=((seed>>>0)+Math.imul((index+1)>>>0,0x9e3779b1))>>>0;
  x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;
  return (x>>>0)/4294967296;
}

const rotate=(cluster,lx,lz)=>{
  const c=Math.cos(cluster.yaw),s=Math.sin(cluster.yaw);
  return {x:cluster.x+lx*c-lz*s,z:cluster.z+lx*s+lz*c};
};

function descriptor(world,cluster,items,kind,material,lx,lz,size,quality,rotation=[0,0,0],color=null,groundMode='box'){
  const p=rotate(cluster,lx,lz),ground=world.terrainHeightAt(p.x,p.z);
  const y=groundMode==='log'?ground+Math.max(size[0],size[2])*.58:
    groundMode==='rock'?ground+size[1]*.22:ground+size[1]*.5;
  items.push(Object.freeze({
    id:`${cluster.id}_${String(items.length).padStart(3,'0')}`,cluster:cluster.id,area:cluster.area,quality,
    kind,material,p:Object.freeze([p.x,y,p.z]),size:Object.freeze([...size]),
    rotation:Object.freeze([rotation[0],rotation[1]+cluster.yaw,rotation[2]]),color
  }));
}

function railCluster(world,c,items){
  // A coherent maintenance pocket: sleepers + timber + crate + drum, then tools/rubble as higher-tier detail.
  for(let i=0;i<4;i++)descriptor(world,c,items,'box','wood',-1.2+i*.12,-.45+i*.42,[2.45,.14,.24],'low',[0,.08*i,0]);
  descriptor(world,c,items,'box','wood',1.10,-.45,[.85,.62,.72],'low',[0,.08,0]);
  descriptor(world,c,items,'trunk','metal',1.42,.55,[.34,.78,.34],'low',[0,0,0]);
  descriptor(world,c,items,'trunk','wood',-.60,1.35,[.12,2.8,.12],'medium',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'trunk','wood',-.46,1.62,[.12,2.5,.12],'medium',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'box','metal',.80,1.38,[1.55,.045,.08],'medium',[0,.34,0]);
  descriptor(world,c,items,'box','wood',1.15,1.52,[.18,.16,1.15],'medium',[0,-.12,0]);
  for(let i=0;i<3;i++){
    const a=propNoise(c.seed,20+i)*Math.PI*2,r=.55+propNoise(c.seed,30+i)*1.15;
    descriptor(world,c,items,'rock','stone',Math.cos(a)*r,2.1+Math.sin(a)*r,[.16+.12*propNoise(c.seed,40+i),.15,.20],'high',[0,a,0],'#6c6a62','rock');
  }
  descriptor(world,c,items,'box','metal',1.62,-1.12,[.62,.05,.06],'high',[0,.65,0]);
  descriptor(world,c,items,'box','wood',1.77,-.86,[.06,.05,.64],'high',[0,-.5,0]);
}

function freightCluster(world,c,items){
  descriptor(world,c,items,'box','wood',-.75,-.35,[.95,.70,.82],'low',[0,.05,0]);
  descriptor(world,c,items,'box','wood',.30,-.18,[.78,.58,.68],'low',[0,-.10,0]);
  descriptor(world,c,items,'box','wood',-.25,.68,[1.05,.54,.78],'low',[0,.14,0]);
  descriptor(world,c,items,'trunk','metal',1.15,.45,[.34,.82,.34],'low');
  descriptor(world,c,items,'trunk','metal',1.55,.28,[.34,.82,.34],'low');
  descriptor(world,c,items,'trunk','wood',-.45,1.45,[.13,3.1,.13],'medium',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'trunk','wood',-.25,1.72,[.13,2.7,.13],'medium',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'box','wood',.55,1.46,[.56,.38,.50],'medium',[0,.22,0]);
  descriptor(world,c,items,'box','metal',1.35,1.42,[.72,.06,.08],'medium',[0,-.30,0]);
  for(let i=0;i<4;i++){
    const a=propNoise(c.seed,50+i)*Math.PI*2,r=.5+propNoise(c.seed,60+i)*1.3;
    descriptor(world,c,items,'rock','stone',-1.1+Math.cos(a)*r,1.9+Math.sin(a)*r,[.12+.13*propNoise(c.seed,70+i),.13,.17],'high',[0,a,0],'#716e64','rock');
  }
}

function maintenanceCluster(world,c,items){
  for(let i=0;i<3;i++)descriptor(world,c,items,'box','wood',-.9+i*.18,-.55+i*.44,[2.1,.14,.24],'low',[0,.10*i,0]);
  descriptor(world,c,items,'trunk','metal',1.05,-.25,[.32,.78,.32],'low');
  descriptor(world,c,items,'box','wood',.75,.72,[.78,.56,.66],'low',[0,.18,0]);
  descriptor(world,c,items,'trunk','wood',-.35,1.35,[.11,2.6,.11],'medium',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'box','metal',.65,1.35,[1.5,.05,.07],'medium',[0,.45,0]);
  descriptor(world,c,items,'box','wood',1.28,1.25,[.16,.16,1.05],'medium',[0,-.15,0]);
  for(let i=0;i<5;i++){
    const a=propNoise(c.seed,80+i)*Math.PI*2,r=.45+propNoise(c.seed,90+i)*1.55;
    descriptor(world,c,items,'rock','stone',Math.cos(a)*r,2.05+Math.sin(a)*r,[.12+.16*propNoise(c.seed,100+i),.14,.18],'high',[0,a,0],'#68665f','rock');
  }
}

function combatCluster(world,c,items){
  descriptor(world,c,items,'box','wood',-.72,-.35,[.82,.54,.70],'low',[0,.18,0]);
  descriptor(world,c,items,'trunk','wood',.35,-.32,[.13,2.9,.13],'low',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'trunk','wood',.55,.05,[.11,2.2,.11],'low',[0,0,Math.PI/2],null,'log');
  for(let i=0;i<3;i++){
    const a=propNoise(c.seed,110+i)*Math.PI*2,r=.45+propNoise(c.seed,120+i)*.95;
    descriptor(world,c,items,'rock','stone',Math.cos(a)*r,1.05+Math.sin(a)*r,[.18+.15*propNoise(c.seed,130+i),.18,.25],'low',[0,a,0],'#67645b','rock');
  }
  descriptor(world,c,items,'trunk','metal',1.35,.82,[.30,.72,.30],'medium',[0,0,.22]);
  descriptor(world,c,items,'box','wood',-1.18,1.55,[.58,.34,.52],'medium',[0,-.28,.18]);
  for(let i=0;i<4;i++){
    const a=propNoise(c.seed,140+i)*Math.PI*2,r=.7+propNoise(c.seed,150+i)*1.65;
    descriptor(world,c,items,'rock','stone',Math.cos(a)*r,1.45+Math.sin(a)*r,[.11+.12*propNoise(c.seed,160+i),.12,.18],'high',[0,a,0],'#777168','rock');
  }
  descriptor(world,c,items,'box','metal',1.25,-1.1,[.85,.045,.07],'high',[0,.52,0]);
}

const BUILDERS={rail:railCluster,freight:freightCluster,maintenance:maintenanceCluster,combat:combatCluster};

export function buildM01EnvironmentProps(world){
  const items=[];
  for(const cluster of M01_PROP_CLUSTERS)BUILDERS[cluster.style](world,cluster,items);
  return Object.freeze(items);
}

export function propCountsForQuality(items,quality='medium'){
  const rank=M01_PROP_QUALITY_RANK[quality]??M01_PROP_QUALITY_RANK.medium;
  const visible=items.filter(p=>M01_PROP_QUALITY_RANK[p.quality]<=rank);
  const byArea={},byCluster={};
  for(const p of visible){byArea[p.area]=(byArea[p.area]??0)+1;byCluster[p.cluster]=(byCluster[p.cluster]??0)+1;}
  return {total:visible.length,byArea,byCluster};
}
