import { vegetationNoise as noise } from './m01-vegetation-layout.js';

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
