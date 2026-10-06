// Visual-only environment dressing for M01. No simulation RNG, colliders or mission state.
export const M01_PROP_QUALITY_RANK=Object.freeze({low:0,medium:1,high:2});

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
  Object.freeze({id:'rail_approach_02',area:'railway-approach',style:'rail',x:-455,z:-38,yaw:.24,seed:202}),
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

const rotate=(cluster,lx,lz)=>{
  const c=Math.cos(cluster.yaw),s=Math.sin(cluster.yaw);
  return {x:cluster.x+lx*c-lz*s,z:cluster.z+lx*s+lz*c};
};

function descriptor(world,cluster,items,kind,material,lx,lz,size,quality,rotation=[0,0,0],color=null,groundMode='box',lift=0){
  const p=rotate(cluster,lx,lz),ground=world.terrainHeightAt(p.x,p.z);
  const base=groundMode==='log'?ground+Math.max(size[0],size[2])*.62:
    groundMode==='rock'?ground+size[1]*.28:ground+size[1]*.5;
  items.push(Object.freeze({
    id:`${cluster.id}_${String(items.length).padStart(3,'0')}`,cluster:cluster.id,area:cluster.area,quality,
    kind,material,p:Object.freeze([p.x,base+lift,p.z]),size:Object.freeze([...size]),
    rotation:Object.freeze([rotation[0],rotation[1]+cluster.yaw,rotation[2]]),color
  }));
}

function railCluster(world,c,items){
  // Two visible sleeper stacks establish railway use at Low; tools/rubble enrich Medium/High.
  for(let i=0;i<4;i++)descriptor(world,c,items,'box','wood',-.72,-.48,[2.75,.16,.26],'low',[0,.035*i,0],null,'box',i*.17);
  for(let i=0;i<2;i++)descriptor(world,c,items,'box','wood',.05,.58,[2.45,.16,.25],'low',[0,-.05*i,0],null,'box',i*.17);
  descriptor(world,c,items,'box','wood',1.22,-.55,[1.02,.76,.86],'medium',[0,.08,0]);
  descriptor(world,c,items,'box','wood',1.24,-.53,[.78,.56,.70],'medium',[0,-.06,0],null,'box',.72);
  descriptor(world,c,items,'trunk','metal',1.75,.42,[.42,1.05,.42],'medium');
  descriptor(world,c,items,'trunk','wood',-.42,1.55,[.15,3.4,.15],'medium',[0,0,Math.PI/2],null,'log');
  for(let i=0;i<4;i++){
    const a=propNoise(c.seed,20+i)*Math.PI*2,r=.75+propNoise(c.seed,30+i)*1.55;
    descriptor(world,c,items,'rock','stone',Math.cos(a)*r,2.0+Math.sin(a)*r,[.18+.16*propNoise(c.seed,40+i),.17,.24],'high',[0,a,0],'#6c6a62','rock');
  }
  descriptor(world,c,items,'box','metal',1.55,1.58,[1.85,.055,.09],'high',[0,.36,0]);
  descriptor(world,c,items,'box','wood',1.92,1.25,[.20,.18,1.35],'high',[0,-.18,0]);
}

function freightCluster(world,c,items){
  descriptor(world,c,items,'box','wood',-.72,-.30,[1.10,.78,.92],'low',[0,.05,0]);
  descriptor(world,c,items,'box','wood',-.70,-.28,[.88,.62,.76],'low',[0,-.08,0],null,'box',.76);
  descriptor(world,c,items,'box','wood',.45,-.15,[.92,.66,.82],'low',[0,-.10,0]);
  descriptor(world,c,items,'trunk','metal',1.45,.28,[.42,1.05,.42],'low');
  descriptor(world,c,items,'trunk','metal',1.92,.22,[.42,1.05,.42],'low');
  descriptor(world,c,items,'box','wood',.42,-.14,[.70,.48,.66],'medium',[0,.12,0],null,'box',.65);
  descriptor(world,c,items,'trunk','wood',-.38,1.58,[.15,3.5,.15],'medium',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'trunk','wood',-.18,1.92,[.15,3.0,.15],'medium',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'box','metal',1.48,1.52,[1.15,.06,.09],'medium',[0,-.22,0]);
  for(let i=0;i<4;i++){
    const a=propNoise(c.seed,50+i)*Math.PI*2,r=.70+propNoise(c.seed,60+i)*1.55;
    descriptor(world,c,items,'rock','stone',-1.05+Math.cos(a)*r,2.15+Math.sin(a)*r,[.14+.16*propNoise(c.seed,70+i),.15,.21],'high',[0,a,0],'#716e64','rock');
  }
}

function maintenanceCluster(world,c,items){
  for(let i=0;i<3;i++)descriptor(world,c,items,'box','wood',-.62,-.48,[2.55,.16,.25],'low',[0,.045*i,0],null,'box',i*.17);
  descriptor(world,c,items,'trunk','metal',1.30,-.25,[.40,1.00,.40],'low');
  descriptor(world,c,items,'box','wood',.92,.78,[.94,.66,.78],'low',[0,.18,0]);
  descriptor(world,c,items,'box','wood',.92,.78,[.72,.48,.62],'medium',[0,-.10,0],null,'box',.64);
  descriptor(world,c,items,'trunk','wood',-.30,1.50,[.14,3.1,.14],'medium',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'box','metal',.85,1.55,[1.75,.055,.08],'medium',[0,.45,0]);
  for(let i=0;i<5;i++){
    const a=propNoise(c.seed,80+i)*Math.PI*2,r=.62+propNoise(c.seed,90+i)*1.75;
    descriptor(world,c,items,'rock','stone',Math.cos(a)*r,2.10+Math.sin(a)*r,[.14+.18*propNoise(c.seed,100+i),.15,.21],'high',[0,a,0],'#68665f','rock');
  }
}

function combatCluster(world,c,items){
  descriptor(world,c,items,'box','wood',-.72,-.35,[.98,.66,.82],'low',[0,.18,0]);
  descriptor(world,c,items,'box','wood',-.70,-.32,[.70,.44,.62],'low',[0,-.12,.08],null,'box',.62);
  descriptor(world,c,items,'trunk','wood',.42,-.38,[.15,3.3,.15],'low',[0,0,Math.PI/2],null,'log');
  descriptor(world,c,items,'trunk','wood',.64,.05,[.13,2.6,.13],'low',[0,0,Math.PI/2],null,'log');
  for(let i=0;i<3;i++){
    const a=propNoise(c.seed,110+i)*Math.PI*2,r=.48+propNoise(c.seed,120+i)*1.15;
    descriptor(world,c,items,'rock','stone',Math.cos(a)*r,1.10+Math.sin(a)*r,[.20+.17*propNoise(c.seed,130+i),.20,.28],'low',[0,a,0],'#67645b','rock');
  }
  descriptor(world,c,items,'trunk','metal',1.55,.84,[.38,.92,.38],'medium',[0,0,.18]);
  descriptor(world,c,items,'box','wood',-1.22,1.55,[.70,.42,.62],'medium',[0,-.28,.12]);
  for(let i=0;i<4;i++){
    const a=propNoise(c.seed,140+i)*Math.PI*2,r=.78+propNoise(c.seed,150+i)*1.80;
    descriptor(world,c,items,'rock','stone',Math.cos(a)*r,1.55+Math.sin(a)*r,[.13+.14*propNoise(c.seed,160+i),.14,.20],'high',[0,a,0],'#777168','rock');
  }
  descriptor(world,c,items,'box','metal',1.45,-1.20,[1.00,.05,.08],'high',[0,.52,0]);
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
