// Visual-only M01 vegetation layout. Pure data: no THREE, no simulation RNG, no colliders.
// Art direction for a late-summer Vistula landscape, not a survey of 1939 trees or hedges.
// Everything here is decoration: solid tree colliders stay in src/world/m01-decoration-layout.js.

export function vegetationNoise(seed,index=0){
  let x=((seed>>>0)+Math.imul((index+1)>>>0,0x9e3779b1))>>>0;
  x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;
  return (x>>>0)/4294967296;
}
export function vegetationStream(seed){let i=0;return ()=>vegetationNoise(seed,i++);}

// Smooth 2D value noise in world metres; drives patchy density instead of uniform scatter.
const lattice=(ix,iz,seed)=>vegetationNoise((Math.imul(ix|0,0x1f123bb5)^Math.imul(iz|0,0x5f356495)^seed)>>>0,7);
export function vegetationField(x,z,scale,seed=0){
  const fx=x/scale,fz=z/scale,ix=Math.floor(fx),iz=Math.floor(fz),tx=fx-ix,tz=fz-iz;
  const sx=tx*tx*(3-2*tx),sz=tz*tz*(3-2*tz);
  const a=lattice(ix,iz,seed),b=lattice(ix+1,iz,seed),c=lattice(ix,iz+1,seed),d=lattice(ix+1,iz+1,seed);
  return a+(b-a)*sx+(c-a)*sz+(a-b-c+d)*sx*sz;
}

export const M01_VEGETATION_BUDGET=Object.freeze({visualTrees:190,shrubs:760,groundCover:26000,reeds:900});

// Species drive silhouette, bark tint and crown colour. Hue/sat/light are HSL multipliers for the shared canopy.
export const M01_TREE_SPECIES=Object.freeze({
  oak:Object.freeze({crown:[.36,.98],crownWidth:.34,lobes:7,trunkTop:.62,lean:.05,bark:'#6f675b',hue:[.19,.235],sat:[.26,.36],light:[.20,.26],branches:5,spacing:7}),
  lime:Object.freeze({crown:[.30,1.00],crownWidth:.29,lobes:6,trunkTop:.66,lean:.04,bark:'#7a7262',hue:[.20,.245],sat:[.30,.42],light:[.24,.30],branches:4,spacing:6}),
  poplar:Object.freeze({crown:[.22,1.00],crownWidth:.13,lobes:6,trunkTop:.86,lean:.03,bark:'#8a8676',hue:[.17,.21],sat:[.26,.34],light:[.22,.28],branches:3,spacing:5}),
  birch:Object.freeze({crown:[.42,1.00],crownWidth:.22,lobes:5,trunkTop:.82,lean:.11,bark:'#d9d5c9',hue:[.15,.19],sat:[.34,.48],light:[.30,.37],branches:4,spacing:4.5}),
  pine:Object.freeze({crown:[.66,1.00],crownWidth:.25,lobes:5,trunkTop:.92,lean:.06,bark:'#9a6c4e',hue:[.26,.31],sat:[.16,.24],light:[.16,.21],branches:4,spacing:5.5}),
  willow:Object.freeze({crown:[.30,1.00],crownWidth:.40,lobes:7,trunkTop:.50,lean:.12,bark:'#6a6558',hue:[.17,.21],sat:[.14,.22],light:[.31,.37],branches:5,spacing:6}),
  pollard:Object.freeze({crown:[.58,1.00],crownWidth:.32,lobes:4,trunkTop:.62,lean:.08,bark:'#625d52',hue:[.17,.21],sat:[.16,.24],light:[.28,.34],branches:5,spacing:7}),
  snag:Object.freeze({crown:[.55,.80],crownWidth:.20,lobes:0,trunkTop:.70,lean:.09,bark:'#8f8b80',hue:[.09,.12],sat:[.18,.26],light:[.20,.26],branches:4,spacing:6})
});
export const M01_SHRUB_SPECIES=Object.freeze({
  hazel:Object.freeze({height:[1.4,2.4],width:[1.4,2.4],lumps:[3,5],hue:[.19,.24],sat:[.28,.38],light:[.19,.25]}),
  elder:Object.freeze({height:[1.1,1.9],width:[1.2,2.0],lumps:[2,4],hue:[.21,.26],sat:[.30,.40],light:[.17,.22]}),
  bramble:Object.freeze({height:[.6,1.15],width:[1.1,2.2],lumps:[2,4],hue:[.18,.23],sat:[.24,.34],light:[.15,.21]}),
  broom:Object.freeze({height:[.7,1.3],width:[.8,1.4],lumps:[2,3],hue:[.23,.28],sat:[.20,.30],light:[.15,.20]}),
  dry:Object.freeze({height:[.5,1.1],width:[.8,1.6],lumps:[2,3],hue:[.10,.14],sat:[.26,.36],light:[.22,.28]}),
  dead:Object.freeze({height:[.8,1.6],width:[.8,1.4],lumps:[0,1],hue:[.09,.11],sat:[.16,.22],light:[.19,.23]})
});
export const M01_GROUND_TYPES=Object.freeze(['meadow','tall','weed','dry','reed']);
// Tallest blade of each tuft geometry at scale 1 (m01-vegetation-art.js), used for the in-bounds cap.
export const GROUND_MAX_HEIGHT=Object.freeze({meadow:.56,dry:.56,tall:.89,weed:.36,reed:1.15});

const pointSegment=(x,z,a,b)=>{
  const dx=b[0]-a[0],dz=b[2]-a[2],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz);
};
export const polylineDistance=(x,z,line)=>{let d=Infinity;for(let i=1;i<line.length;i++)d=Math.min(d,pointSegment(x,z,line[i-1],line[i]));return d;};

// Static keep-outs derived from the mission layout. "tall" covers shrubs/trees, "low" covers grass/weeds.
export function vegetationKeepOut(world){
  const f=id=>world.features.get(id),pt=id=>{const p=world.point(id);return [p.x,p.z];};
  const rails=['rail_embankment_west','rail_line_southwest'].map(id=>f(id).polyline);
  const road=f('road_approach_west').polyline,ignition=f('ignition_line').polyline;
  const objectives=['repair_site_1','repair_site_2','rally_point','squad_post','firing_point','forward_post','aid_position','shelter'].map(pt);
  const covers=world.layout.coverNodes.map(c=>[c.position[0],c.position[2]]);
  const bounds=world.layout.bounds.playable;
  return {rails,road,ignition,objectives,covers,bounds};
}
const inRect=(x,z,x0,x1,z0,z1)=>x>=x0&&x<=x1&&z>=z0&&z<=z1;
export function insideTerrain(x,z){return x>-695&&x<1295&&z>-280&&z<360;}
export function inPlayableBounds(k,x,z,margin=0){const b=k.bounds;return x>b.minX-margin&&x<b.maxX+margin&&z>b.minZ-margin&&z<b.maxZ+margin;}
export function onWater(x){return x>22&&x<268;}
// Combat lanes and the bridgehead stay readable: no tall decoration where actors fight or walk.
export function inCombatCore(x,z){
  return inRect(x,z,-305,30,-16,56)||inRect(x,z,-475,-296,-14,24)||inRect(x,z,-305,-238,56,80)||inRect(x,z,-30,30,-60,110);
}
export function tallClearance(k,x,z,{rail=10,road=9}={}){
  if(!insideTerrain(x,z)||onWater(x)||inCombatCore(x,z))return false;
  if(inRect(x,z,-476,-324,14,61)||inRect(x,z,-274,-246,10,30))return false;// station and rail hut
  if(k.rails.some(l=>polylineDistance(x,z,l)<rail)||polylineDistance(x,z,k.road)<road||polylineDistance(x,z,k.ignition)<7)return false;
  if(k.objectives.some(([ox,oz])=>Math.hypot(x-ox,z-oz)<14)||k.covers.some(([cx,cz])=>Math.hypot(x-cx,z-cz)<8))return false;
  if(x>=268&&Math.abs(z-20)<58)return false;// keep the bridge and the east floodplain below it open
  return true;
}
export function lowClearance(k,x,z){
  if(!insideTerrain(x,z)||onWater(x))return false;
  if(inRect(x,z,-471,-329,19,56)||inRect(x,z,-271,-249,13,27))return false;
  if(polylineDistance(x,z,k.road)<3.6)return false;
  if(k.objectives.some(([ox,oz])=>Math.hypot(x-ox,z-oz)<3.5)||k.covers.some(([cx,cz])=>Math.hypot(x-cx,z-cz)<1.6))return false;
  if(x>-12&&x<25&&Math.abs(z-20)<34)return false;// portals and abutment apron
  return true;
}

// Poisson-like dart throwing inside a disc with a species-dependent minimum spacing: no grid, no rows.
function throwDarts(r,count,cx,cz,radius,minSpacing,accept,placed,tries=14){
  const out=[];
  for(let i=0;i<count;i++){
    for(let t=0;t<tries;t++){
      const a=r()*Math.PI*2,d=Math.sqrt(r())*radius,x=cx+Math.cos(a)*d*(1+.35*(r()-.5)),z=cz+Math.sin(a)*d;
      if(!accept(x,z))continue;
      if(placed.some(p=>Math.hypot(p.x-x,p.z-z)<minSpacing*(.75+.5*r())))continue;
      const p={x,z};placed.push(p);out.push(p);break;
    }
  }
  return out;
}
const pickWeighted=(roll,weights)=>{
  const total=Object.values(weights).reduce((a,b)=>a+b,0);let acc=0;
  for(const [k,w]of Object.entries(weights)){acc+=w/total;if(roll<acc)return k;}
  return Object.keys(weights).at(-1);
};

// Groves are authored as loose regions; trees, edges and understory inside them are seeded per grove.
export const M01_GROVES=Object.freeze([
  // South belt (beyond z -80), broken by the curving west embankment.
  {id:'s_birch_copse',x:-120,z:-118,r:26,n:9,mix:{birch:5,oak:2,lime:1,snag:1.2}},
  {id:'s_mixed_01',x:-205,z:-150,r:40,n:15,mix:{oak:4,lime:3,birch:2,pine:1,snag:1.3}},
  {id:'s_pine_stand',x:-305,z:-196,r:46,n:16,mix:{pine:6,birch:2,oak:1,snag:1.4}},
  {id:'s_oak_clump',x:-388,z:-110,r:22,n:7,mix:{oak:4,lime:2,snag:1}},
  {id:'s_mixed_02',x:-468,z:-205,r:44,n:15,mix:{pine:3,oak:3,birch:2,lime:1,snag:1.2}},
  {id:'s_far_edge',x:-640,z:-210,r:50,n:13,mix:{pine:4,oak:2,birch:1}},
  {id:'s_willow_bank',x:-30,z:-170,r:34,n:8,mix:{willow:5,poplar:1,birch:1}},
  // West, beyond the station end of the playable area.
  {id:'w_station_back',x:-560,z:-10,r:40,n:11,mix:{lime:3,oak:2,poplar:2,birch:1}},
  {id:'w_orchard_edge',x:-600,z:95,r:36,n:9,mix:{lime:2,oak:2,birch:2,snag:.9}},
  // North belt (beyond z 140), crossed by the south-west line.
  {id:'n_lime_row',x:-150,z:180,r:38,n:11,mix:{lime:4,oak:2,poplar:1}},
  {id:'n_mixed_01',x:-285,z:225,r:46,n:15,mix:{oak:3,lime:2,birch:3,pine:1,snag:1.2}},
  {id:'n_birch_01',x:-420,z:170,r:28,n:9,mix:{birch:6,pine:1,oak:1}},
  {id:'n_far_edge',x:-560,z:290,r:56,n:14,mix:{pine:4,oak:3,birch:1}},
  {id:'n_willow_bank',x:-25,z:215,r:36,n:9,mix:{willow:5,poplar:2,birch:1}},
  // East floodplain: willow lines along drainage ditches, away from the bridge sightlines.
  {id:'e_ditch_south',x:470,z:-120,r:60,n:10,mix:{pollard:6,willow:2,poplar:1},line:{dx:1,dz:.18}},
  {id:'e_ditch_north',x:640,z:170,r:70,n:11,mix:{pollard:5,willow:3,poplar:1},line:{dx:1,dz:-.12}},
  {id:'e_bank_south',x:330,z:-180,r:38,n:7,mix:{willow:4,poplar:2}},
  {id:'e_bank_north',x:345,z:230,r:40,n:7,mix:{willow:4,poplar:2,birch:1}},
  {id:'e_far_farm',x:960,z:-170,r:40,n:7,mix:{lime:2,poplar:3,oak:1}}
].map(g=>Object.freeze(g)));

export function buildVisualTreeLayout(world,solidTrees=world.trees){
  const k=vegetationKeepOut(world),placed=solidTrees.map(t=>({x:t.x,z:t.z})),trees=[];
  for(const g of M01_GROVES){
    const seed=(Math.imul([...g.id].reduce((a,c)=>Math.imul(a^c.charCodeAt(0),16777619),2166136261),1)+0x7a11)>>>0,r=vegetationStream(seed);
    const accept=(x,z)=>tallClearance(k,x,z,{rail:13,road:12})&&!inPlayableBounds(k,x,z,4)&&
      (!g.line||Math.abs((x-g.x)*-g.line.dz+(z-g.z)*g.line.dx)/Math.hypot(g.line.dx,g.line.dz)<4.5);
    const darts=g.line?Array.from({length:g.n},()=>{
      // Irregular ditch line: gaps and jittered spacing, never an even row.
      const t=(r()-.5)*2*g.r,len=Math.hypot(g.line.dx,g.line.dz),x=g.x+g.line.dx/len*t+(r()-.5)*3,z=g.z+g.line.dz/len*t+(r()-.5)*3;
      if(!accept(x,z)||placed.some(p=>Math.hypot(p.x-x,p.z-z)<6+r()*5))return null;const p={x,z};placed.push(p);return p;
    }).filter(Boolean):throwDarts(r,g.n,g.x,g.z,g.r,6.2,accept,placed);
    for(const p of darts){
      const species=pickWeighted(r(),g.mix);
      const edge=Math.hypot(p.x-g.x,p.z-g.z)/g.r,base=species==='pine'?17:species==='poplar'?19:species==='birch'?13:species==='pollard'?6.5:species==='snag'?10:14;
      const height=base*(.72+r()*.5)*(1-.18*Math.max(0,edge-.6));
      trees.push({id:`m01_visual_tree_${trees.length}`,grove:g.id,x:p.x,z:p.z,y:world.terrainHeightAt(p.x,p.z),height,
        radius:(.16+r()*.12)*(species==='pollard'?2.1:species==='willow'?1.5:species==='birch'?.75:1)*(height/14)**.5,species,solid:false,edge});
    }
  }
  return trees;
}

// Species for the 17 approved solid trees: contextual, not serial%N. Positions/heights/radii are not touched.
export function solidTreeSpecies(t){
  const n=vegetationNoise((Math.imul(t.x|0,73856093)^Math.imul(t.z|0,19349663))>>>0,3);
  if(t.z<0)return n<.45?'oak':n<.7?'lime':n<.9?'birch':'snag';
  return n<.4?'lime':n<.72?'oak':n<.92?'poplar':'birch';
}

// Decoration does not block simulation line of sight, so inside the playable area it stays below a
// crouched soldier's eye: nothing the AI shoots through can hide a standing or kneeling actor.
export const M01_IN_BOUNDS_SHRUB_HEIGHT=1.1,M01_IN_BOUNDS_GRASS_HEIGHT=.8;
function shrubAt(r,x,z,species,world,extra={},cap=Infinity){
  const s=M01_SHRUB_SPECIES[species],lerp=(a,t)=>a[0]+(a[1]-a[0])*t;
  return {x,z,y:world.terrainHeightAt(x,z),species,height:Math.min(cap,lerp(s.height,r())),width:lerp(s.width,r()),yaw:r()*Math.PI*2,
    lumps:Math.round(lerp(s.lumps,r())),hue:lerp(s.hue,r()),sat:lerp(s.sat,r()),light:lerp(s.light,r()),seed:Math.floor(r()*4294967296)>>>0,...extra};
}

export function buildShrubLayout(world,trees){
  const k=vegetationKeepOut(world),shrubs=[],placed=[],r=vegetationStream(0x5b0b1939);
  const ok=(x,z,min=1.7)=>tallClearance(k,x,z)&&!placed.some(p=>Math.hypot(p.x-x,p.z-z)<min);
  const add=(x,z,species,extra)=>{if(!ok(x,z))return false;placed.push({x,z});shrubs.push(shrubAt(r,x,z,species,world,extra,inPlayableBounds(k,x,z)?M01_IN_BOUNDS_SHRUB_HEIGHT:Infinity));return true;};
  const damage=(x,z)=>x>-260&&x<20&&z>-90&&z<120;// shelled ground around the bridgehead
  // Understory and woodland edges: denser on the open-field side of each grove.
  for(const t of trees){
    const count=t.species==='snag'?1:t.edge>.65?3:1+Math.floor(r()*2);
    for(let i=0;i<count;i++){
      const a=r()*Math.PI*2,d=1.6+r()*(t.edge>.65?6:3.5),x=t.x+Math.cos(a)*d,z=t.z+Math.sin(a)*d;
      const wet=t.species==='willow'||t.species==='pollard';
      add(x,z,pickWeighted(r(),wet?{elder:3,bramble:2,dry:1}:t.species==='pine'?{broom:3,bramble:2,dry:1,dead:.5}:{hazel:3,elder:2,bramble:2,dry:.6,dead:.3}),{under:t.id});
    }
  }
  // In-bounds scrub: small clumps in the unmown corners the routes never cross, breaking the open fields.
  for(let i=0;i<900;i++){
    const x=k.bounds.minX+r()*(k.bounds.maxX-k.bounds.minX),z=k.bounds.minZ+r()*(k.bounds.maxZ-k.bounds.minZ);
    if(x>20||vegetationField(x,z,34,0x93)<.5)continue;
    const n=1+Math.floor(r()*3),species=damage(x,z)&&r()<.5?pickWeighted(r(),{dry:3,dead:1.5,bramble:2}):pickWeighted(r(),{bramble:3,hazel:2,elder:2,broom:1.5,dry:1});
    for(let j=0;j<n;j++)add(x+(r()-.5)*4.5,z+(r()-.5)*4.5,j&&r()<.5?'bramble':species);
  }
  // Open-field clumps where the patchy field says "unmown" and the fight never goes.
  for(let i=0;i<1100&&shrubs.length<M01_VEGETATION_BUDGET.shrubs-150;i++){
    const x=-690+r()*700,z=-275+r()*630;
    if(vegetationField(x,z,48,0x91)<.58||r()<.35)continue;
    const n=1+Math.floor(r()*4),species=damage(x,z)&&r()<.45?pickWeighted(r(),{dry:3,dead:2,bramble:1}):pickWeighted(r(),{hazel:2,bramble:3,elder:2,broom:2,dry:1});
    for(let j=0;j<n;j++)add(x+(r()-.5)*5,z+(r()-.5)*5,j&&r()<.5?'bramble':species);
  }
  // Railway margins: scrub at the embankment toe, never on ballast or the sapper lanes.
  for(const line of k.rails)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);
    for(let d=r()*20;d<len;d+=8+r()*26){
      const side=r()<.5?-1:1,off=side*(10.5+r()*5),x=a[0]+dx*d/len-dz/len*off,z=a[2]+dz*d/len+dx/len*off;
      add(x,z,pickWeighted(r(),damage(x,z)?{dry:2,dead:1,bramble:1}:{bramble:3,broom:2,elder:1,dry:1}));
    }
  }
  // Field boundary behind the north fence, broken by gaps where the withdrawal crosses.
  for(let x=-318;x<-42;x+=4+r()*9){if(r()<.35)continue;add(x,71+r()*4,pickWeighted(r(),{bramble:3,elder:1,hazel:1,dry:1}));}
  return shrubs.slice(0,M01_VEGETATION_BUDGET.shrubs);
}

// Ground cover: clumped tufts in patches, rail weeds, wall/fence bases and reed beds.
export function buildGroundCoverLayout(world,trees,shrubs){
  const k=vegetationKeepOut(world),out=[],r=vegetationStream(0x6a55e5);
  const push=(type,x,z,h,extra)=>{if(!lowClearance(k,x,z))return;
    const wet=vegetationField(x,z,36,0x2c),dry=vegetationField(x,z,60,0x3d);
    if(inPlayableBounds(k,x,z))h=Math.min(h,M01_IN_BOUNDS_GRASS_HEIGHT/GROUND_MAX_HEIGHT[type]);
    out.push({type,x,z,y:world.terrainHeightAt(x,z),h,yaw:r()*Math.PI*2,lean:(r()-.5)*.2,
      hue:type==='dry'?.105+r()*.03:.15+wet*.07+r()*.02-(dry>.62?.035:0),sat:.20+wet*.12+r()*.06,light:type==='dry'?.34+r()*.08:.24+dry*.08+r()*.05,...extra});
  };
  const trampled=(x,z)=>inCombatCore(x,z);
  // Meadow patches: density follows two noise octaves, each accepted seed spawns a small clump.
  // Streamed around the player at runtime, so density is spent only where tufts can be seen.
  for(let i=0;i<26000&&out.length<20000;i++){
    const x=-500+r()*520,z=-102+r()*264,density=vegetationField(x,z,30,0x11)*.7+vegetationField(x,z,9,0x12)*.3;
    if(density<(trampled(x,z)?.54:.43)||r()<.25)continue;
    const clump=2+Math.floor(r()*(trampled(x,z)?3:8)),spread=.45+r()*1.3,dryPatch=vegetationField(x,z,60,0x3d)>.62;
    for(let j=0;j<clump;j++){
      const px=x+(r()-.5)*spread*2,pz=z+(r()-.5)*spread*2,roll=r();
      const type=trampled(px,pz)?(roll<.55?'meadow':'dry'):dryPatch?(roll<.5?'dry':roll<.8?'meadow':'tall'):(roll<.52?'meadow':roll<.78?'tall':roll<.9?'weed':'dry');
      push(type,px,pz,(trampled(px,pz)?.68:1)*(type==='tall'?.8+r()*.6:type==='weed'?.5+r()*.4:.45+r()*.5));
    }
  }
  // Rail weeds: dry shoulders and the odd tuft between sleepers, spaced irregularly.
  for(const line of k.rails)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);
    for(let d=r()*3;d<len;d+=.6+r()*r()*7){
      const inner=r()<.18,off=inner?(r()-.5)*1.9:(r()<.5?-1:1)*(1.55+r()*2.2),x=a[0]+dx*d/len-dz/len*off,z=a[2]+dz*d/len+dx/len*off;
      if(k.objectives.some(([ox,oz])=>Math.hypot(x-ox,z-oz)<7))continue;
      push(inner||r()<.45?'dry':r()<.6?'weed':'tall',x,z,inner?.25+r()*.2:.4+r()*.55);
    }
  }
  // Bases of trees, shrubs and walls/fences anchor objects to the ground.
  const nearPlay=(x,z)=>inPlayableBounds(k,x,z,45);
  for(const t of trees.filter(t=>nearPlay(t.x,t.z)))for(let i=0;i<7;i++){const a=r()*Math.PI*2,d=t.radius+.25+r()*2.2;push(r()<.5?'tall':'weed',t.x+Math.cos(a)*d,t.z+Math.sin(a)*d,.45+r()*.6);}
  for(const s of shrubs.filter(s=>nearPlay(s.x,s.z)))for(let i=0;i<3;i++){const a=r()*Math.PI*2,d=s.width*(.4+r()*.5);push(s.species==='dry'||s.species==='dead'?'dry':'tall',s.x+Math.cos(a)*d,s.z+Math.sin(a)*d,.4+r()*.5);}
  for(let x=-320;x<-40;x+=.5+r()*2.4)push(r()<.6?'tall':'weed',x,66+(r()-.5)*1.4,.6+r()*.6);
  for(let x=-468;x<-332;x+=.6+r()*2.8)push(r()<.5?'weed':'tall',x,56+r()*1.2,.45+r()*.5);
  for(let x=-271;x<-249;x+=.6+r()*2)for(const z of [13.4,26.6])push(r()<.6?'weed':'dry',x,z+(r()-.5)*.6,.35+r()*.4);
  const ground=out.slice(0,M01_VEGETATION_BUDGET.groundCover);
  // Reed beds in broken stands on both banks, thickest in sheltered pockets.
  const reeds=[];
  for(const bank of [{x:23,dir:-1},{x:266,dir:1}]){
    for(let z=-290;z<350;z+=1.2+r()*4){
      if(vegetationField(bank.x,z,26,0x77+bank.x)<.36)continue;
      const n=3+Math.floor(r()*6);
      for(let j=0;j<n;j++){const x=bank.dir<0?21.6+r()*3.2:265+r()*3.6,zz=z+(r()-.5)*2.4;
        if(bank.x<100&&Math.abs(zz-20)<30)continue;
        reeds.push({type:'reed',x,z:zz,y:world.terrainHeightAt(x,zz),h:1.3+r()*1.2,yaw:r()*Math.PI*2,lean:(r()-.5)*.25,hue:.14+r()*.04,sat:.20+r()*.1,light:.36+r()*.1});}
    }
  }
  return [...ground,...reeds.slice(0,M01_VEGETATION_BUDGET.reeds)];
}

// Deterministic interleave so that Low's "first half" of every batch stays spatially even.
export function interleaveForDensity(items,seed=0x1e5){
  return items.map((it,i)=>({it,k:vegetationNoise(seed,i)})).sort((a,b)=>a.k-b.k).map(o=>o.it);
}

export function buildM01VegetationLayout(world){
  const visualTrees=buildVisualTreeLayout(world),solid=world.trees.map(t=>({...t,species:solidTreeSpecies(t),solid:true,edge:0}));
  const allTrees=[...solid,...visualTrees],shrubs=buildShrubLayout(world,allTrees);
  const ground=buildGroundCoverLayout(world,allTrees,shrubs);
  return {solid,visualTrees,shrubs,ground};
}
