// M01 actor navigation: a deterministic, data-only route planner over the same solids the player collides with.
//
// What it is: a uniform grid rasterised on demand over a window round one query, A* over it, then string pulling with exact segment tests. Nothing here
// draws from a random stream, keeps hidden state or reads the clock; the same world, start and goal always give the same corners. It never moves anybody:
// the simulation keeps the corners it was given in the actor's own (saved) data and walks them with the ordinary TczewWorld.move.
//
// ponytail: reuse first. The map has no waypoint graph and its cover nodes are firing positions, not routes (nothing leads round the hut door, the station or the yard wagons),
// so this reads the collider lists TczewWorld already keeps and authors no nodes; an authored graph would have to be edited every time a collider moves or a span falls.
// ponytail: deliberately simple. Two dimensions only (one height band per query, the walker's own), a grid made per query instead of a stored navmesh (a plan is only made when
// the straight walk is blocked, a handful of times a mission), no dynamic obstacles here (men are steered round in m01-simulation.js), at most 24 corners per route.
// Solids, in this order of authority:
//   1. world.obstacles       every solid the player and the bullets meet (piers, towers, portals, huts, station, sandbag covers, trees, yard wagons);
//   2. truss girders         the bridge's 'partialCover' boxes: a bullet passes between them, a body does not;
//   3. deck edges            TczewWorld.move already keeps a man's centre on a span; the edge strips keep his BODY off the girders too;
//   4. the ckm emplacement   sandbags drawn without a world collider (m01-nav-layout.js); gone with the west demolition;
//   5. extra solids          (the simulation passes playerSolidsForNav) what only the player's body collided with before 2026-10-18: the casemate and the shelter walls, the
//                            bridge-head parapets, portal piers and span chords, the girders' drawn overhang and the joint rails, the hut barrels and the T12 prop kit
//                            (src/world/m01-collision-layout.js buildPlayerSolids). Oriented boxes (88 rotated props) are tested in their own frame.
// Solids 4 and 5 have no world collider, so TczewWorld.move cannot stop a man at them: they are 'decor' here and `settle` pushes a man out of them after every walk.
// M01_PASSAGES cut the doorways of slabs that the exported collider fills (Lisewo's portal). The vertical rule is the one of TczewWorld.move.
// Height (2026-10-18, phys x npc integration): TczewWorld.move puts a walker's feet at heightAt(x, z) wherever he goes, so a solid is a wall at a place when it meets the band of
// a body standing on the ground THERE, not at the walker's starting height. A route from the lowland up to the road deck passes over the buried casemate (its roof is 1.4 m
// under the deck) and must not see it as a wall where the deck covers it, while beside the deck the casemate stands 1.6 m above the lowland. The deck attachments (girders and
// edge strips: solids of a span, `walkerBand`) keep the walker's own height: their ground is the river or the lowland below, which a man on the span never reaches.
import {M01_PASSAGES,ckmEmplacementSolids} from './m01-nav-layout.js';

export const NAV={margin:.15,tightMargin:.03,cell:.5,maxCells:120000,band:{low:.1,high:1.45},edge:2,bucket:32,voidBelow:-6,maxSnap:6,reachSnap:3,retrySec:5,widePadMax:200};
const EAST='evt_m01_east_demolition',WEST='evt_m01_west_demolition';

// Rectangle minus rectangle (xz): up to four pieces, the y range is kept.
function subtract(b,h){
  if(h.max.x<=b.min.x||h.min.x>=b.max.x||h.max.z<=b.min.z||h.min.z>=b.max.z)return [b];
  const out=[],piece=(x0,x1,z0,z1)=>{if(x1>x0&&z1>z0)out.push({...b,min:{...b.min,x:x0,z:z0},max:{...b.max,x:x1,z:z1}});};
  piece(b.min.x,b.max.x,b.min.z,Math.min(h.min.z,b.max.z));                                  // below the hole
  piece(b.min.x,b.max.x,Math.max(h.max.z,b.min.z),b.max.z);                                  // above the hole
  const z0=Math.max(b.min.z,h.min.z),z1=Math.min(b.max.z,h.max.z);
  piece(b.min.x,Math.min(h.min.x,b.max.x),z0,z1);piece(Math.max(h.max.x,b.min.x),b.max.x,z0,z1);
  return out;
}

// Open-interval slab test of the segment a->b against the box [x0,x1]x[z0,z1]: touching a face is not a crossing. The part of the segment inside, [t0, t1], or null.
function segmentSpan(ax,az,bx,bz,x0,x1,z0,z1){
  const dx=bx-ax,dz=bz-az;let t0=0,t1=1;
  if(Math.abs(dx)<1e-12){if(ax<=x0||ax>=x1)return null;}
  else{let u=(x0-ax)/dx,v=(x1-ax)/dx;if(u>v){const w=u;u=v;v=w;}t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>=t1)return null;}
  if(Math.abs(dz)<1e-12){if(az<=z0||az>=z1)return null;}
  else{let u=(z0-az)/dz,v=(z1-az)/dz;if(u>v){const w=u;u=v;v=w;}t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>=t1)return null;}
  return [t0,t1];
}
const inBand=(s,y)=>y+NAV.band.high>s.min.y&&y+NAV.band.low<s.max.y;

class Heap {
  constructor(){this.f=[];this.i=[];}
  get size(){return this.f.length;}
  less(a,b){return this.f[a]<this.f[b]||this.f[a]===this.f[b]&&this.i[a]<this.i[b];}
  swap(a,b){const f=this.f[a],i=this.i[a];this.f[a]=this.f[b];this.i[a]=this.i[b];this.f[b]=f;this.i[b]=i;}
  push(f,i){let k=this.f.push(f)-1;this.i.push(i);while(k>0){const p=(k-1)>>1;if(!this.less(k,p))break;this.swap(k,p);k=p;}}
  pop(){
    const top=this.i[0],lf=this.f.pop(),li=this.i.pop();
    if(this.f.length){this.f[0]=lf;this.i[0]=li;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;
      if(l<this.f.length&&this.less(l,m))m=l;if(r<this.f.length&&this.less(r,m))m=r;if(m===k)break;this.swap(k,m);k=m;}}
    return top;
  }
}

/** The kinds of world.playerSolids the actors route round and are kept out of (see 5. above). 'obstacle' is world.obstacles again, 'deck' is ground for TczewWorld.move,
 * 'emplacement' is solid 4 again (one table, m01-nav-layout.js). */
export const NAV_PLAYER_SOLID_KINDS=Object.freeze(['structure','bridge','truss','prop']);
/** world.playerSolids as navigation solids: the axis-aligned bounds plus, for a rotated box, its frame (`obb`: centre, half sizes, cos/sin of the yaw as in m01-collision-layout.js). */
export function playerSolidsForNav(world){
  const out=[];
  for(const b of world.playerSolids??[])if(NAV_PLAYER_SOLID_KINDS.includes(b.kind))
    out.push({id:'player:'+b.id,min:{x:b.minX,y:b.y0,z:b.minZ},max:{x:b.maxX,y:b.y1,z:b.maxZ},obb:b.s===0&&Math.abs(b.c)===1?null:{cx:b.cx,cz:b.cz,hx:b.hx,hz:b.hz,c:b.c,s:b.s},
      walkerBand:b.kind==='truss'});   // girders and joint rails belong to a span, like the girders of the colliders
  return out;
}
// A point in the frame of an oriented box, and the box's own extent there.
const toLocal=(o,x,z)=>{const dx=x-o.cx,dz=z-o.cz;return [dx*o.c-dz*o.s,dx*o.s+dz*o.c];};

export class M01Navigator {
  /**
   * `emplacement`: the ckm gun root ({x,y,z}) round which the sandbag walls stand; null leaves them out.
   * `extraSolids`: more walls to route round, an array or a function of the world returning one, of boxes {id,min:{x,y,z},max:{x,y,z}} in metres (for solids the world keeps apart
   * from `obstacles`, e.g. what only the player collides with), optionally with an `obb` frame (playerSolidsForNav). They have no world collider, so they are 'decor': routed
   * round like the colliders and enforced by `settle`; read again whenever the world's revision changes.
   */
  constructor(world,{emplacement=null,extraSolids=null}={}){this.world=world;this.emplacement=emplacement;this.extraSolids=extraSolids;this.built=-1;this.solids=[];this.buckets=new Map();this.stamp=0;}
  /** What the saved routes depend on besides the map: which spans and which walls still stand. Stable across a save and a restore. */
  get key(){const e=this.world.events;return (e.includes(EAST)?1:0)+(e.includes(WEST)?2:0);}
  sync(){
    if(this.built===this.world.revision)return;
    const w=this.world,list=[],add=(id,kind,b)=>list.push({id,kind,min:{x:b.min.x,y:b.min.y,z:b.min.z},max:{x:b.max.x,y:b.max.y,z:b.max.z},...(b.obb?{obb:b.obb}:{}),
      walkerBand:kind==='truss'||kind==='edge'||b.walkerBand===true});
    for(const b of w.obstacles)add(b.id,'collider',b);
    for(const c of w.colliders)if(c.collider==='partialCover')add(c.id,'truss',c);
    for(const b of (typeof this.extraSolids==='function'?this.extraSolids(w):this.extraSolids)??[])add(b.id??'extra','decor',b);
    for(const s of w.spanDecks){   // the strips beside a span: the body stays clear of the girders, the centre rule of TczewWorld.move is unchanged
      const y0=s.max.y-.6,y1=s.max.y+3.5;
      add(`${s.id}:edge_n`,'edge',{min:{x:s.min.x,y:y0,z:s.min.z-NAV.edge},max:{x:s.max.x,y:y1,z:s.min.z}});
      add(`${s.id}:edge_s`,'edge',{min:{x:s.min.x,y:y0,z:s.max.z},max:{x:s.max.x,y:y1,z:s.max.z+NAV.edge}});
    }
    if(this.emplacement&&!w.events.includes(WEST))for(const s of ckmEmplacementSolids(this.emplacement))add(s.id,'decor',s);
    const solids=[];
    for(const s of list){
      let pieces=[s];
      for(const p of M01_PASSAGES)if(p.solid===s.id&&!s.obb)pieces=pieces.flatMap(b=>subtract(b,{min:p.min,max:p.max}));
      solids.push(...pieces);
    }
    this.solids=solids;this.buckets=new Map();this.marks=new Int32Array(solids.length);
    solids.forEach((s,i)=>{
      const c=NAV.bucket;
      for(let bx=Math.floor(s.min.x/c);bx<=Math.floor(s.max.x/c);bx++)for(let bz=Math.floor(s.min.z/c);bz<=Math.floor(s.max.z/c);bz++){
        const k=bx*65536+bz;let l=this.buckets.get(k);if(!l)this.buckets.set(k,l=[]);l.push(i);}
    });
    this.built=w.revision;
  }
  /**
   * Indices of the solids whose xz box meets the rectangle and whose height band meets the body standing at `y`. With `ground`, only the deck attachments are filtered by `y`
   * (the others are returned for the caller to test against the ground under each place: see the header).
   */
  near(x0,z0,x1,z1,y,ground=false){
    this.sync();const c=NAV.bucket,out=[],stamp=++this.stamp;
    for(let bx=Math.floor(x0/c);bx<=Math.floor(x1/c);bx++)for(let bz=Math.floor(z0/c);bz<=Math.floor(z1/c);bz++){
      const l=this.buckets.get(bx*65536+bz);if(!l)continue;
      for(const i of l){
        if(this.marks[i]===stamp)continue;this.marks[i]=stamp;const s=this.solids[i];
        if((ground&&!s.walkerBand||inBand(s,y))&&s.max.x>x0&&s.min.x<x1&&s.max.z>z0&&s.min.z<z1)out.push(i);
      }
    }
    return out;
  }
  /** True when a body of `radius` standing at (x,z) touches a solid (the TczewWorld.move test, plus the navigation solids). */
  blockedAt(x,z,radius,y){
    for(const i of this.near(x-radius,z-radius,x+radius,z+radius,y)){const s=this.solids[i];
      if(s.obb){const [lx,lz]=toLocal(s.obb,x,z);if(Math.abs(lx)<s.obb.hx+radius&&Math.abs(lz)<s.obb.hz+radius)return true;continue;}
      if(x+radius>s.min.x&&x-radius<s.max.x&&z+radius>s.min.z&&z-radius<s.max.z)return true;}
    return false;
  }
  /**
   * True when a body of `radius` can walk the straight line a->b without touching any solid. A solid on the ground is a wall where the line crosses it only if it meets the
   * band of a body standing on the ground there (sampled every half metre of the crossing); a deck attachment, at the walker's height `y`.
   */
  clear(ax,az,bx,bz,radius,y,margin=0){
    const r=radius+margin,len=Math.hypot(bx-ax,bz-az);
    for(const i of this.near(Math.min(ax,bx)-r,Math.min(az,bz)-r,Math.max(ax,bx)+r,Math.max(az,bz)+r,y,true)){const s=this.solids[i];
      let span;
      if(s.obb){const o=s.obb,[pa,qa]=toLocal(o,ax,az),[pb,qb]=toLocal(o,bx,bz);span=segmentSpan(pa,qa,pb,qb,-o.hx-r,o.hx+r,-o.hz-r,o.hz+r);}
      else span=segmentSpan(ax,az,bx,bz,s.min.x-r,s.max.x+r,s.min.z-r,s.max.z+r);
      if(!span)continue;
      if(s.walkerBand)return false;
      const k=Math.max(1,Math.ceil((span[1]-span[0])*len/.5));
      for(let j=0;j<=k;j++){const t=span[0]+(span[1]-span[0])*j/k;if(inBand(s,this.world.heightAt(ax+(bx-ax)*t,az+(bz-az)*t)))return false;}
    }
    return true;
  }
  /**
   * Pushes an actor out of the solids that have no world collider (sandbags, and the player layer: props, the casemate, the shelter), so TczewWorld.move, which cannot stop
   * him at them, never leaves him inside one. The way out is the shallowest face whose straight push meets no other solid (2026-10-18, phys x npc integration: the push used to be
   * the shallowest face whatever stood behind it, and beside the shelter gate it carried a man out of a fence section through the cover box next to it); when every face is
   * behind another solid he is moved towards the shallowest by TczewWorld.move, which the colliders still stop.
   */
  settle(a){
    this.sync();
    for(let pass=0;pass<2;pass++){
      let moved=false;
      for(const i of this.near(a.x-a.radius,a.z-a.radius,a.x+a.radius,a.z+a.radius,a.y)){const s=this.solids[i];
        if(s.kind!=='decor')continue;
        const exits=this.exits(a,s);if(!exits)continue;
        const out=exits.find(e=>this.pushFree(a,e.x,e.z,i));
        if(out){a.x=out.x;a.z=out.z;}else this.world.move(a,exits[0].x-a.x,exits[0].z-a.z);
        moved=true;
      }
      if(!moved)break;
      a.y=this.world.heightAt(a.x,a.z);
    }
  }
  /** The four places just outside solid `s` for the body of `a`, shallowest first (faces in the fixed order -x, +x, -z, +z on ties), or null when he does not overlap it. */
  exits(a,s){
    const r=a.radius;
    if(s.obb){   // the same faces in the box's own frame, then back to the world
      const o=s.obb,[lx,lz]=toLocal(o,a.x,a.z),d=[lx+r+o.hx,o.hx-(lx-r),lz+r+o.hz,o.hz-(lz-r)];
      if(d.some(v=>v<=0))return null;
      const at=(px,pz)=>({x:o.cx+px*o.c+pz*o.s,z:o.cz-px*o.s+pz*o.c});
      return [{depth:d[0],...at(-o.hx-r,lz)},{depth:d[1],...at(o.hx+r,lz)},{depth:d[2],...at(lx,-o.hz-r)},{depth:d[3],...at(lx,o.hz+r)}].sort((p,q)=>p.depth-q.depth);
    }
    const d=[a.x+r-s.min.x,s.max.x-(a.x-r),a.z+r-s.min.z,s.max.z-(a.z-r)];
    if(d.some(v=>v<=0))return null;
    return [{depth:d[0],x:s.min.x-r,z:a.z},{depth:d[1],x:s.max.x+r,z:a.z},{depth:d[2],x:a.x,z:s.min.z-r},{depth:d[3],x:a.x,z:s.max.z+r}].sort((p,q)=>p.depth-q.depth);
  }
  /** True when the body of `a` can be pushed in a straight line to (x, z) without meeting any solid but `skip` (at his own height). */
  pushFree(a,x,z,skip){
    const r=a.radius;
    for(const j of this.near(Math.min(a.x,x)-r,Math.min(a.z,z)-r,Math.max(a.x,x)+r,Math.max(a.z,z)+r,a.y)){
      if(j===skip)continue;const s=this.solids[j];
      if(s.obb){const o=s.obb,[pa,qa]=toLocal(o,a.x,a.z),[pb,qb]=toLocal(o,x,z);if(segmentSpan(pa,qa,pb,qb,-o.hx-r,o.hx+r,-o.hz-r,o.hz+r))return false;}
      else if(segmentSpan(a.x,a.z,x,z,s.min.x-r,s.max.x+r,s.min.z-r,s.max.z+r))return false;
    }
    return true;
  }
  /**
   * Corners of a walkable route from the actor to the goal, ending at the goal, or null when no route exists. A straight free walk gives just the goal.
   * Tried with the full clearance first, then with a tight one (a man who starts hard against a wall, a gap that is narrow).
   */
  route(a,goal){
    this.sync();
    for(const margin of [NAV.margin,NAV.tightMargin])for(const wide of [false,true]){const r=this.plan(a,goal,margin,wide);if(r)return r;}
    return null;
  }
  plan(a,goal,margin,wide=false){
    const radius=a.radius+margin,y=a.y;
    if(this.clear(a.x,a.z,goal.x,goal.z,a.radius,y,margin))return [[goal.x,goal.z]];
    const dist=Math.hypot(goal.x-a.x,goal.z-a.z),dx=Math.abs(goal.x-a.x),dz=Math.abs(goal.z-a.z);
    let pad=Math.min(80,Math.max(24,dist*.35));
    if(wide){
      // The second try: the widest window that still fits the cell budget at full resolution, so a wall longer than the first window (the station is 122 m) can be walked round.
      const area=NAV.maxCells*NAV.cell*NAV.cell,wider=(-(dx+dz)+Math.sqrt((dx+dz)**2-4*(dx*dz-area)))/4;
      if(!(wider>pad+1))return null;
      pad=Math.min(NAV.widePadMax,wider);
    }
    const x0=Math.min(a.x,goal.x)-pad,x1=Math.max(a.x,goal.x)+pad,z0=Math.min(a.z,goal.z)-pad,z1=Math.max(a.z,goal.z)+pad;
    let cell=NAV.cell;while((x1-x0)/cell*((z1-z0)/cell)>NAV.maxCells)cell*=2;
    const nx=Math.ceil((x1-x0)/cell),nz=Math.ceil((z1-z0)/cell),n=nx*nz,blocked=new Uint8Array(n);
    const cx=i=>x0+(i%nx+.5)*cell,cz=i=>z0+(Math.floor(i/nx)+.5)*cell;
    const near=this.near(x0,z0,x1,z1,y,true);
    // The ground under a cell, measured once per cell and only where a solid could block it.
    const groundY=new Float32Array(n).fill(NaN),ground=i=>{let g=groundY[i];if(g!==g)g=groundY[i]=this.world.heightAt(x0+(i%nx+.5)*cell,z0+(Math.floor(i/nx)+.5)*cell);return g;};
    for(const k of near){
      const s=this.solids[k],ax=s.min.x-radius,bx=s.max.x+radius,az=s.min.z-radius,bz=s.max.z+radius;
      const i0=Math.max(0,Math.floor((ax-x0)/cell-.5)+1),i1=Math.min(nx-1,Math.ceil((bx-x0)/cell-.5)-1);
      const j0=Math.max(0,Math.floor((az-z0)/cell-.5)+1),j1=Math.min(nz-1,Math.ceil((bz-z0)/cell-.5)-1);
      const wall=c=>s.walkerBand||inBand(s,ground(c));   // a deck attachment at the walker's height (near() kept only those in his band); anything else at the ground under the cell
      if(s.obb){const o=s.obb;   // a rotated box: the cells of its bounds whose centre is inside it grown by the radius, in its own frame
        for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const c=j*nx+i;if(blocked[c])continue;const [lx,lz]=toLocal(o,x0+(i+.5)*cell,z0+(j+.5)*cell);if(Math.abs(lx)<o.hx+radius&&Math.abs(lz)<o.hz+radius&&wall(c))blocked[c]=1;}
        continue;}
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const c=j*nx+i;if(!blocked[c]&&wall(c))blocked[c]=1;}
    }
    // Water and void: ground below the walkable band that is not a deck. Only the river reach needs the test.
    const hasVoid=x1>24;const voidCell=i=>{const x=cx(i),z=cz(i);return this.world.heightAt(x,z)<NAV.voidBelow;};
    if(hasVoid)for(let i=0;i<n;i++)if(!blocked[i]&&cx(i)>24&&voidCell(i))blocked[i]=2;
    const index=(x,z)=>Math.min(nz-1,Math.max(0,Math.floor((z-z0)/cell)))*nx+Math.min(nx-1,Math.max(0,Math.floor((x-x0)/cell)));
    const snap=(x,z,limit)=>{
      const home=index(x,z);if(!blocked[home])return home;
      let best=-1,bd=Infinity;const hi=home%nx,hj=Math.floor(home/nx),span=Math.ceil(limit/cell);
      for(let dj=-span;dj<=span;dj++)for(let di=-span;di<=span;di++){
        const i=hi+di,j=hj+dj;if(i<0||j<0||i>=nx||j>=nz||blocked[j*nx+i])continue;
        const d=Math.hypot(cx(j*nx+i)-x,cz(j*nx+i)-z);if(d<bd-1e-9||Math.abs(d-bd)<=1e-9&&j*nx+i<best){bd=d;best=j*nx+i;}
      }
      return bd<=limit?best:-1;
    };
    const start=snap(a.x,a.z,NAV.maxSnap),end=snap(goal.x,goal.z,NAV.maxSnap);
    if(start<0||end<0)return null;
    // A*, eight neighbours, no corner cutting; ties break on the lower index so the route never depends on insertion order.
    const g=new Float32Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),closed=new Uint8Array(n),heap=new Heap();
    const ex=end%nx,ez=Math.floor(end/nx),h=i=>{const dx=Math.abs(i%nx-ex),dz=Math.abs(Math.floor(i/nx)-ez);return (Math.max(dx,dz)+(Math.SQRT2-1)*Math.min(dx,dz))*cell;};
    g[start]=0;heap.push(h(start),start);
    const D=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];let found=false;
    while(heap.size){
      const c=heap.pop();if(closed[c])continue;closed[c]=1;if(c===end){found=true;break;}
      const ci=c%nx,cj=Math.floor(c/nx);
      for(const [di,dj]of D){
        const i=ci+di,j=cj+dj;if(i<0||j<0||i>=nx||j>=nz)continue;const m=j*nx+i;if(blocked[m]||closed[m])continue;
        if(di&&dj&&(blocked[cj*nx+i]||blocked[j*nx+ci]))continue;
        const cost=g[c]+(di&&dj?Math.SQRT2:1)*cell;if(cost<g[m]-1e-9){g[m]=cost;parent[m]=c;heap.push(cost+h(m),m);}
      }
    }
    if(!found)return null;
    const cells=[];for(let i=end;i!==-1;i=parent[i])cells.push(i);cells.reverse();
    const pts=cells.map(i=>[cx(i),cz(i)]);
    // The route starts at the actor and ends at the goal exactly; the snapped cells only carry it past blocked ground at either end.
    pts[0]=[a.x,a.z];pts[pts.length-1]=[goal.x,goal.z];
    const voidFree=(ax,az,bx,bz)=>{if(!hasVoid)return true;const len=Math.hypot(bx-ax,bz-az),k=Math.max(1,Math.ceil(len/cell));
      for(let t=1;t<=k;t++){const x=ax+(bx-ax)*t/k,z=az+(bz-az)*t/k;if(blocked[index(x,z)]===2)return false;}return true;};
    const free=(p,q)=>this.clear(p[0],p[1],q[0],q[1],a.radius,y,margin)&&voidFree(p[0],p[1],q[0],q[1]);
    const out=[];let at=0;
    while(at<pts.length-1){
      let to=pts.length-1;while(to>at+1&&!free(pts[at],pts[to]))to--;
      out.push(pts[to]);at=to;
    }
    return out.length>24?out.slice(0,24):out;
  }
}
