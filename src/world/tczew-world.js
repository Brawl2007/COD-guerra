import layout from '../../missions/m01-tczew/map-layout.json' with { type: 'json' };
import kit from '../../assets/models/provisional/m01/bridge-colliders.json' with { type: 'json' };
import { visible } from './spatial.js';

const xyz=a=>({x:a[0],y:a[1],z:a[2]});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const box=(id,min,max,extra={})=>({...extra,id,min:xyz(min),max:xyz(max),material:extra.material??'stone'});
export class TczewWorld {
  constructor(){this.missionId='m01_tczew';this.layout=layout;this.features=new Map(layout.features.map(f=>[f.id,f]));this.events=[];this.revision=0;this.refresh([]);}
  point(id){
    const f=this.features.get(id);if(!f)throw new Error(`Ponto M01 desconhecido: ${id}`);
    if(f.point||f.pickup)return xyz(f.point??f.pickup);
    if(f.polygon)return {x:f.polygon.reduce((n,p)=>n+p[0],0)/f.polygon.length,
      y:f.groundY??-3,z:f.polygon.reduce((n,p)=>n+p[1],0)/f.polygon.length};
    throw new Error(`A feature ${id} não contém um ponto.`);
  }
  refresh(eventIds,flags={}){
    this.events=[...eventIds];const consumed=new Set(eventIds);
    this.colliders=kit.boxes.filter(b=>!b.destroyedBy||!consumed.has(b.destroyedBy)).map(b=>box(b.id,b.min,b.max,b));
    this.decks=this.colliders.filter(c=>c.collider==='walkable');
    this.joints=[];
    for(const prefix of ['rail','road']){
      const spans=kit.boxes.filter(c=>c.id.startsWith(prefix+'_collider_deck_span')).sort((a,b)=>a.min[0]-b.min[0]);
      for(let i=1;i<spans.length;i++){
        const a=spans[i-1],b=spans[i];
        if([a,b].some(c=>c.destroyedBy&&consumed.has(c.destroyedBy)))continue;
        this.joints.push(box(`${prefix}_joint_${i}`,[a.max[0],-.2,a.min[2]],[b.min[0],0,a.max[2]],{visual:true,material:'metal'}));
      }
    }
    this.walkSurfaces=[...this.decks,...this.joints];
    // Tabuleiros dos vãos e juntas: a treliça/guarda-corpo segura quem anda nelas (encontros e margens ficam de fora).
    this.spanDecks=[...this.decks.filter(c=>c.id.includes('_deck_')),...this.joints];
    this.coverNodes=layout.coverNodes.filter(c=>(!c.activeAfter||consumed.has(c.activeAfter))&&(!c.activeUntil||!consumed.has(c.activeUntil))&&
      !(consumed.has('evt_m01_west_demolition')&&c.position[0]>-90));
    this.covers=this.coverNodes.filter(c=>!c.partial&&!['WINDOW','WALL_CORNER','BUILDING_CORNER','VEHICLE'].includes(c.type)).map(c=>{
      const [x,y,z]=c.position,h=c.id==='cv_forward_post'&&flags['m01.forward_post_state']==='destroyed'?.45:c.heightM;
      return box(c.id,[x-.45,y,z-1.5],[x+.45,y+h,z+1.5],{visual:true,material:c.type==='HIGH_COVER'?'wood':'earth'});
    });
    this.buildings=[box('hut_north',[-270,-3,14],[-250,.5,14.35],{visual:true,material:'wood'}),
      box('hut_east',[-250,-3,14],[-249.65,.5,26],{visual:true,material:'wood'}),
      box('hut_south',[-270,-3,25.65],[-250,.5,26],{visual:true,material:'wood'}),
      box('hut_west_n',[-270,-3,14],[-269.65,.5,18],{visual:true,material:'wood'}),
      box('hut_west_s',[-270,-3,24],[-269.65,.5,26],{visual:true,material:'wood'}),
      box('station',[-460,-3,28],[-338,11,55],{visual:true,material:'brick'})];
    // Conservative solid posts and lintels matching the provisional kit's open arches.
    // Never fill the open rail/road passage with an invisible wall.
    this.portals=consumed.has('evt_m01_west_demolition')?[]:[
      box('rail_portal_n',[-6.5,-1,-11.9],[-1.5,14,-4.2]),box('rail_portal_s',[-6.5,-1,4.2],[-1.5,14,11.9]),
      box('rail_portal_top',[-6.5,8.4,-4.2],[-1.5,11.5,4.2]),
      box('road_portal_n',[-7,-1,29.9],[-1,14,37]),box('road_portal_s',[-7,-1,43],[-1,14,50.1]),
      box('road_portal_top',[-6.5,8.6,37],[-1.5,12.5,43])];
    this.obstacles=[...this.colliders.filter(c=>c.collider==='solid'),...this.portals,...this.buildings,...this.covers];this.revision++;
  }
  heightAt(x,z){
    let deck=-Infinity;
    for(const c of this.walkSurfaces)if(x>=c.min.x&&x<=c.max.x&&z>=c.min.z&&z<=c.max.z)deck=Math.max(deck,c.max.y);
    if(deck!==-Infinity)return deck;
    return this.terrainHeightAt(x,z);
  }
  terrainHeightAt(x,z){
    if(x>25&&x<265)return -10;
    if(x>=265)return x>=1055?-1:x>1035?-5+(x-1035)/5:-5;
    let height=-3;
    const rail=this.features.get('rail_embankment_west').polyline;
    const road=this.features.get('road_approach_west').polyline;
    for(const [line,width]of [[rail,6],[road,5]])for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],dx=b[0]-a[0],dz=b[2]-a[2];
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz)));
      const d=Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz),crest=a[1]+t*(b[1]-a[1]);
      if(d<width+6)height=Math.max(height,-3+(crest+3)*Math.max(0,Math.min(1,1-(d-width)/6)));
    }
    if(distance({x,z},this.point('shelter'))<8)height=-4;
    return height;
  }
  move(actor,dx,dz){
    const blocked=(x,z)=>this.obstacles.some(b=>actor.y+1.45>b.min.y&&actor.y+.1<b.max.y&&x+actor.radius>b.min.x&&x-actor.radius<b.max.x&&z+actor.radius>b.min.z&&z-actor.radius<b.max.z);
    // Sobre um vão, não se cai pela lateral nem para um vão demolido: a treliça contém o movimento (não as balas).
    const onSpan=(x,z)=>this.spanDecks.some(c=>x>=c.min.x&&x<=c.max.x&&z>=c.min.z&&z<=c.max.z);
    const falls=(x,z)=>onSpan(actor.x,actor.z)&&!onSpan(x,z)&&this.heightAt(x,z)<actor.y-1.5;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
    for(let i=0;i<steps;i++){
      if(!blocked(actor.x+dx/steps,actor.z)&&!falls(actor.x+dx/steps,actor.z))actor.x+=dx/steps;
      if(!blocked(actor.x,actor.z+dz/steps)&&!falls(actor.x,actor.z+dz/steps))actor.z+=dz/steps;
    }
    actor.y=this.heightAt(actor.x,actor.z);
  }
  coverAt(actor){return this.coverNodes.find(c=>Math.hypot(actor.x-c.position[0],actor.z-c.position[2])<3.5&&actor.x<=c.position[0]+.5)??null;}
  lineOfSight(a,b){return visible(this,a,b);}
  traceTerrain(origin,dir,range){
    if(dir.y>=0&&origin.y>7)return null;
    const step=Math.min(2,Math.max(.25,range/1000));
    for(let d=step;d<range;d+=step){
      const p={x:origin.x+dir.x*d,y:origin.y+dir.y*d,z:origin.z+dir.z*d};
      if(p.y<this.heightAt(p.x,p.z)-.04)return {distance:d,kind:'world',material:'earth'};
    }return null;
  }
}
