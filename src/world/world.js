import { CONFIG, MAP } from '../config.js';

export class World {
  constructor(layout = MAP) {
    this.layout = layout.map(row => [...row]); this.spawns = {};
    for (let y=0;y<this.layout.length;y++) for(let x=0;x<this.layout[y].length;x++) {
      const cell=this.layout[y][x];
      if ('PEACR'.includes(cell)) { (this.spawns[cell] ??= []).push({x:(x+.5)*CONFIG.tile,y:(y+.5)*CONFIG.tile}); this.layout[y][x]='0'; }
    }
  }
  wallAt(x,y) { const tx=Math.floor(x/CONFIG.tile), ty=Math.floor(y/CONFIG.tile); return this.layout[ty]?.[tx] !== '0'; }
  canMove(x,y,radius=CONFIG.playerRadius) { return ![[radius,radius],[-radius,radius],[radius,-radius],[-radius,-radius]].some(([dx,dy])=>this.wallAt(x+dx,y+dy)); }
  move(actor,dx,dy) { if(this.canMove(actor.x+dx,actor.y,actor.radius)) actor.x+=dx; if(this.canMove(actor.x,actor.y+dy,actor.radius)) actor.y+=dy; }
  raycast(x,y,angle,max=1000) { const step=4; for(let d=0;d<max;d+=step){const px=x+Math.cos(angle)*d,py=y+Math.sin(angle)*d;if(this.wallAt(px,py))return {distance:d,x:px,y:py};} return {distance:max,x:x+Math.cos(angle)*max,y:y+Math.sin(angle)*max}; }
  lineOfSight(a,b) { const angle=Math.atan2(b.y-a.y,b.x-a.x), dist=Math.hypot(b.x-a.x,b.y-a.y); return this.raycast(a.x,a.y,angle,dist).distance>=dist-5; }
  nextStep(from,to) {
    const start=[Math.floor(from.x/CONFIG.tile),Math.floor(from.y/CONFIG.tile)],goal=[Math.floor(to.x/CONFIG.tile),Math.floor(to.y/CONFIG.tile)],key=p=>p.join(',');
    const queue=[start],came=new Map([[key(start),null]]);let found=null;
    while(queue.length){const cur=queue.shift();if(key(cur)===key(goal)){found=cur;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const next=[cur[0]+dx,cur[1]+dy],k=key(next);if(!came.has(k)&&this.layout[next[1]]?.[next[0]]==='0'){came.set(k,cur);queue.push(next);}}}
    if(!found)return to;const path=[];while(found){path.push(found);found=came.get(key(found));}path.reverse();const step=path[1]??path[0];return {x:(step[0]+.5)*CONFIG.tile,y:(step[1]+.5)*CONFIG.tile};
  }
}
