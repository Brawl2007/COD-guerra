import { CONFIG, MAP, UNITS_PER_METRE, WALL_HEIGHT } from '../config.js';
import { visible } from './spatial.js';

export class World {
  constructor(layout = MAP) {
    this.layout = layout.map(row => [...row]); this.spawns = {};
    for (let y=0;y<this.layout.length;y++) for(let x=0;x<this.layout[y].length;x++) {
      const cell=this.layout[y][x];
      if ('PEACR'.includes(cell)) { (this.spawns[cell] ??= []).push({x:(x+.5)*CONFIG.tile,y:(y+.5)*CONFIG.tile}); this.layout[y][x]='0'; }
    }
    this.paths = new Map();
    this.obstacles = [];
    const tile = CONFIG.tile / UNITS_PER_METRE;
    for (let y = 0; y < this.layout.length; y++) for (let x = 0; x < this.layout[y].length; x++) {
      if (this.layout[y][x] === '0') continue;
      this.obstacles.push({ id: `wall-${x}-${y}`, material: this.materialAt((x+.5)*CONFIG.tile,(y+.5)*CONFIG.tile),
        min: { x: x*tile, y: 0, z: y*tile }, max: { x: (x+1)*tile, y: WALL_HEIGHT, z: (y+1)*tile } });
    }
    this.coverPoints=[];
    for(let y=1;y<this.layout.length-1;y++)for(let x=1;x<this.layout[y].length-1;x++)if(this.layout[y][x]==='0'){
      const walls=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>this.layout[y+dy]?.[x+dx]!=='0');
      if(walls.length)this.coverPoints.push({id:`cover-${x}-${y}`,x:(x+.5)*CONFIG.tile,y:(y+.5)*CONFIG.tile,wall:walls[0],normal:walls[0].map(n=>-n),height:WALL_HEIGHT,window:false});
    }
  }
  wallAt(x,y) { const tx=Math.floor(x/CONFIG.tile), ty=Math.floor(y/CONFIG.tile); return this.layout[ty]?.[tx] !== '0'; }
  materialAt(x,y){const tx=Math.floor(x/CONFIG.tile),ty=Math.floor(y/CONFIG.tile);if(!this.wallAt(x,y))return 'earth';if(tx===0||ty===0||ty===this.layout.length-1||tx===this.layout[0].length-1)return 'stone';return(tx+ty)%4===0?'wood':(tx+ty)%3===0?'brick':'stone';}
  canMove(x,y,radius=CONFIG.playerRadius) { return ![[radius,radius],[-radius,radius],[radius,-radius],[-radius,-radius]].some(([dx,dy])=>this.wallAt(x+dx,y+dy)); }
  move(actor,dx,dy) { if(this.canMove(actor.x+dx,actor.y,actor.radius)) actor.x+=dx; if(this.canMove(actor.x,actor.y+dy,actor.radius)) actor.y+=dy; }
  raycast(x,y,angle,max=1000) { const step=4; for(let d=0;d<max;d+=step){const px=x+Math.cos(angle)*d,py=y+Math.sin(angle)*d;if(this.wallAt(px,py))return {distance:d,x:px,y:py};} return {distance:max,x:x+Math.cos(angle)*max,y:y+Math.sin(angle)*max}; }
  lineOfSight(a,b) { return visible(this,a,b); }
  nextStep(from,to) {
    const start=[Math.floor(from.x/CONFIG.tile),Math.floor(from.y/CONFIG.tile)],goal=[Math.floor(to.x/CONFIG.tile),Math.floor(to.y/CONFIG.tile)],key=p=>p.join(',');
    const cacheKey=`${key(start)}:${key(goal)}`;
    if(this.paths.has(cacheKey))return this.paths.get(cacheKey);
    const queue=[start],came=new Map([[key(start),null]]);let found=null;
    while(queue.length){const cur=queue.shift();if(key(cur)===key(goal)){found=cur;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next=[cur[0]+dx,cur[1]+dy],k=key(next);if(!came.has(k)&&this.layout[next[1]]?.[next[0]]==='0'){came.set(k,cur);queue.push(next);}}}
    if(!found){this.paths.set(cacheKey,null);return null;}const path=[];while(found){path.push(found);found=came.get(key(found));}path.reverse();const step=path[1]??path[0],result={x:(step[0]+.5)*CONFIG.tile,y:(step[1]+.5)*CONFIG.tile};
    if(this.paths.size>1024)this.paths.clear();this.paths.set(cacheKey,result);return result;
  }
  findCover(actor,threat,occupied=[]) {
    const candidates=this.coverPoints.filter(p=>Math.hypot(p.x-actor.x,p.y-actor.y)<360&&
      (Math.hypot(p.x-actor.x,p.y-actor.y)>24||!this.lineOfSight(actor,threat))&&
      !occupied.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<35));
    candidates.sort((a,b)=>this.coverScore(b,actor,threat)-this.coverScore(a,actor,threat));
    return candidates.find(p=>this.nextStep(actor,p))??null;
  }
  findFlank(actor,threat,occupied=[]){const direct=Math.atan2(actor.y-threat.y,actor.x-threat.x),options=this.coverPoints.filter(p=>Math.hypot(p.x-actor.x,p.y-actor.y)<420&&!occupied.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<40));options.sort((a,b)=>{const score=p=>Math.abs(Math.sin(Math.atan2(p.y-threat.y,p.x-threat.x)-direct))*180-Math.hypot(p.x-actor.x,p.y-actor.y)*.25;return score(b)-score(a);});return options.find(p=>this.nextStep(actor,p))??this.findCover(actor,threat,occupied);}
  findPeek(actor,threat){
    for(const [dx,dy] of [[32,0],[-32,0],[0,32],[0,-32],[64,0],[-64,0],[0,64],[0,-64]]){
      const p={x:actor.x+dx,y:actor.y+dy,crouched:false};
      if(this.canMove(p.x,p.y,actor.radius)&&this.lineOfSight(actor,p)&&this.lineOfSight(p,threat))return p;
    }
    return null;
  }
  coverScore(p,actor,threat){const travel=Math.hypot(p.x-actor.x,p.y-actor.y),range=Math.hypot(p.x-threat.x,p.y-threat.y),hidden=!this.lineOfSight(p,threat);return(hidden?260:0)+(p.window?35:0)-travel*.45-Math.abs(range-260)*.08;}
}
