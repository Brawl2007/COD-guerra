// Visual-only environment dressing for M01. No simulation RNG, colliders or mission state.
// The cluster table, the T12 kit placements and the gate in the combat-area fence moved to src/world/m01-prop-layout.js: the simulation derives the player's
// solid prop footprints from the very same placements the renderer draws, and a simulation module may not import src/render.
import {M01_PROP_CLUSTERS,propNoise,rotateCluster as rotate,buildM01AcceptedPropPlacements} from '../world/m01-prop-layout.js';
export {M01_PROP_CLUSTERS,propNoise,buildM01AcceptedPropPlacements};
export const M01_PROP_QUALITY_RANK=Object.freeze({low:0,medium:1,high:2});

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
