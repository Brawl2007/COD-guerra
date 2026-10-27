import { vegetationNoise as noise } from './m01-vegetation-layout.js';

export function m02TerrainAxes(width=140,length=340,segmentsX=90,segmentsZ=90,corridor=false){
  const unique=list=>list.sort((a,b)=>a-b).filter((n,i,a)=>i===0||n-a[i-1]>1e-6);
  const x=Array.from({length:segmentsX+1},(_,i)=>-width/2+i*width/segmentsX),z=Array.from({length:segmentsZ+1},(_,i)=>-length/2-65+i*length/segmentsZ);
  if(corridor){
    x.push(-26.5,-26,-25.5,-9.5,-9,-8.5,-7.7,6.7,7.5);
    z.push(-180,-179.6,-179.2,-173.6,-173.2,-172.8,-172.5,-171.8,-112.5,-112.25,-112,-111.8,-109.7,-109.45,-109.2);
  }
  return {x:unique(x),z:unique(z)};
}

// Decoration follows M02's existing collision layout, with its own deterministic
// noise. It neither adds blockers nor consumes the mission RNG.
export function m02EnvironmentLayout(world) {
  const inside=(x,z,margin=0)=>(world.layout.buildings??[]).some(b=>{
    const [x0,x1,z0,z1]=b.bounds;return x>x0-margin&&x<x1+margin&&z>z0-margin&&z<z1+margin;
  });
  const trees=(world.layout.orchardTrees??[]).map((t,i)=>({x:t.x,z:t.z,height:t.canopyY1,width:t.canopyRadius*2,species:i%2?'oak':'lime',yaw:noise(i,2)*6.28}));
  // Only outside the playable envelope: these visual trees cannot conceal an
  // enemy without the simulation's corresponding foliage sight blockers.
  const bounds=world.layout.bounds.playable;
  for(let i=0;i<100;i++) {
    const angle=noise(i,41)*Math.PI*2,r=110+noise(i,42)*145;
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r-30;
    if(x>bounds.minX-22&&x<bounds.maxX+22&&z>bounds.minZ-22&&z<bounds.maxZ+22)continue;
    trees.push({x,z,height:7+noise(i,43)*10,width:3+noise(i,44)*5,species:['oak','lime','poplar'][i%3],yaw:noise(i,45)*6.28});
  }
  if(world.layout.c01Corridor)for(const side of [-1,1])for(let i=0;i<13;i++){
    const x=side*(76+noise(i,61)*12),z=-202+i*10+noise(i,62)*5;
    trees.push({x,z,height:8+noise(i,63)*7,width:4+noise(i,64)*3,species:i%3===0?'poplar':i%2?'oak':'lime',yaw:noise(i,65)*6.28});
  }
  const ground=[];
  for(let i=0;i<6500;i++) {
    const x=-105+noise(i,51)*210,z=-220+noise(i,52)*325;
    if(inside(x,z,1)||Math.abs(x)<4.5||world.obstacles.some(o=>x>o.min.x-.3&&x<o.max.x+.3&&z>o.min.z-.3&&z<o.max.z+.3))continue;
    ground.push({x,z,h:.2+noise(i,53)*.3,yaw:noise(i,54)*6.28,species:i%3});
  }
  // Authored meadow strips enrich the flanks, leaving the road, doors and all
  // physical cover readable. Knee-high foliage never becomes an AI blocker.
  const patches=world.layout.c01Corridor?[[-48,-8,-190,-118],[10,48,-190,-118]]:[[-65,-8,-62,62],[10,65,-62,62]];
  for(const [patch,[x0,x1,z0,z1]]of patches.entries())for(let i=0;i<2000;i++){
    const seed=i+patch*4096,x=x0+noise(seed,71)*(x1-x0),z=z0+noise(seed,72)*(z1-z0);
    if(inside(x,z,1.3)||world.obstacles.some(o=>x>o.min.x-.4&&x<o.max.x+.4&&z>o.min.z-.4&&z<o.max.z+.4))continue;
    ground.push({x,z,h:.25+noise(seed,73)*.35,yaw:noise(seed,74)*6.28,species:i%3});
  }
  return {trees,ground};
}

export function m02TerrainSources(world) {
  const route=(world.layout.cartRoute??[[0,-220],[0,90]]).map(p=>Array.isArray(p)?p:[p.x,p.z]);
  const tracks=[{halfWidth:3,points:route}];
  for(const b of world.layout.buildings??[]) {
    const [x0,x1,z0,z1]=b.bounds;
    tracks.push({halfWidth:1.2,points:[[0,(z0+z1)/2],[(x0+x1)/2,(z0+z1)/2]]});
  }
  const meadow=world.layout.c01Corridor?[
    [[-48,-189],[-7,-189],[-7,-97],[-48,-97]],
    [[8,-189],[48,-189],[48,-97],[8,-97]],
  ]:[];
  return {tracks,rails:[],channel:null,meadow};
}
