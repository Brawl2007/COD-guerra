// Player body physics for M01: a vertical capsule (circle on the ground plane, a height) that slides along walls, steps up small ledges, falls under
// gravity and lands with an impact. Pure functions over plain data (the world's `playerSolids`, `terrainHeightAt`, `walkSurfaces`): deterministic, no RNG, no clock,
// nothing from the renderer. NPCs keep TczewWorld.move; this is the player's.
//
// State added to the player is only `fall`, present while airborne ({vy, vx, vz, startY, t}); a grounded player is bit-identical to what the previous
// movement produced in open ground, so saves made before this change load unchanged and a save never carries a field it does not need.
export const PLAYER_PHYSICS=Object.freeze({
  radius:.36,
  standHeight:1.8,crouchHeight:1.25,
  stepUp:.45,          // tallest ledge stepped onto (a sandbag course, a crate lid, the 0.35 m abutment lip)
  snapDown:.5,         // a drop up to this is a stair, taken without leaving the ground; a bigger one is a fall
  gravity:9.81,        // m/s^2
  terminalSpeed:55,
  airControl:.25,      // share of the walking input that steers an airborne body (its momentum is kept)
  safeFallM:3,         // landing speed below sqrt(2 g 3 m) = 7.67 m/s hurts nothing
  lethalFallM:9,       // from 9 m (13.3 m/s) a man at full health dies
  mapMargin:10,        // hard stop this far beyond the warned boundary (the 8 s countdown still decides)
});
const P=PLAYER_PHYSICS;
export const SAFE_LANDING_SPEED=Math.sqrt(2*P.gravity*P.safeFallM),LETHAL_LANDING_SPEED=Math.sqrt(2*P.gravity*P.lethalFallM);
/** Health lost on landing at `speed` m/s (0 up to a 3 m fall, 100 from 9 m, linear in the speed between). */
export const fallDamage=speed=>Math.max(0,Math.min(100,Math.ceil(100*(speed-SAFE_LANDING_SPEED)/(LETHAL_LANDING_SPEED-SAFE_LANDING_SPEED))));

const SAMPLES=[[1,0],[.7071,.7071],[0,1],[-.7071,.7071],[-1,0],[-.7071,-.7071],[0,-1],[.7071,-.7071]];

/** Highest walkable surface under (x, z) the feet can reach: a deck/abutment top at most `reach` above `y`, else the terrain; low solids (props, covers) also count. */
export function supportAt(world,x,z,y,reach=P.stepUp,ledges=true){
  let best=-Infinity;
  for(const d of world.walkSurfaces)if(x>=d.min.x&&x<=d.max.x&&z>=d.min.z&&z<=d.max.z&&d.max.y<=y+reach&&d.max.y>best)best=d.max.y;
  if(best===-Infinity)best=world.terrainHeightAt(x,z);
  if(ledges)for(const b of world.solidIndex.near(x,z)){
    if(b.kind==='deck'||b.y1>y+reach||b.y1<=best||x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)continue;
    const dx=x-b.cx,dz=z-b.cz;
    if(Math.abs(dx*b.c-dz*b.s)<=b.hx&&Math.abs(dx*b.s+dz*b.c)<=b.hz)best=b.y1;
  }
  return best;
}

/** The ground may not rise more than a step anywhere under the body (cliffs, steep embankments); decks and masses are walls handled by the solids. */
export function groundOk(world,x,z,y,r,reach=P.stepUp){
  if(supportAt(world,x,z,y,reach,false)-y>reach+1e-9)return false;
  for(const [ux,uz] of SAMPLES)if(supportAt(world,x+ux*r,z+uz*r,y,reach,false)-y>reach+1e-9)return false;
  return true;
}

/** Deepest wall overlapping the circle at (x, z) for a body standing at `y` with height `h`: {depth, nx, nz} or null. */
export function deepestWall(world,x,z,y,r,h,skip=null){
  let best=null;
  for(const b of world.solidIndex.near(x,z)){
    if(b.y1<=y+P.stepUp||b.y0>=y+h||x+r<b.minX||x-r>b.maxX||z+r<b.minZ||z-r>b.maxZ||b===skip)continue;
    const dx=x-b.cx,dz=z-b.cz,lx=dx*b.c-dz*b.s,lz=dx*b.s+dz*b.c;
    const ox=Math.abs(lx)-b.hx,oz=Math.abs(lz)-b.hz;
    let depth,nlx,nlz;
    if(ox<=0&&oz<=0){   // the centre is inside the footprint: leave through the nearest face
      if(ox>oz){depth=r-ox;nlx=lx<0?-1:1;nlz=0;}else{depth=r-oz;nlx=0;nlz=lz<0?-1:1;}
    }else{
      const cx=Math.max(-b.hx,Math.min(b.hx,lx)),cz=Math.max(-b.hz,Math.min(b.hz,lz)),ex=lx-cx,ez=lz-cz,d=Math.hypot(ex,ez);
      if(d>=r)continue;
      depth=r-d;nlx=ex/d;nlz=ez/d;
    }
    if(!best||depth>best.depth)best={depth,nx:nlx*b.c+nlz*b.s,nz:-nlx*b.s+nlz*b.c,b};
  }
  return best;
}

/** Push (x, z) out of every wall; up to 6 passes. Returns the corrected point and whether it is clear. */
function pushOut(world,x,z,y,r,h){
  for(let i=0;i<6;i++){
    const wall=deepestWall(world,x,z,y,r,h);
    if(!wall)return {x,z,clear:true};
    x+=wall.nx*(wall.depth+1e-4);z+=wall.nz*(wall.depth+1e-4);
  }
  return {x,z,clear:!deepestWall(world,x,z,y,r,h)};
}

/** One slice of ground movement: a full step first, then each axis alone (so a cliff or a steep bank is slid along), then the walls push the body out. */
function slide(world,p,sx,sz,r,h){
  const x0=p.x,z0=p.z;
  let x=x0+sx,z=z0+sz;
  if(!groundOk(world,x,z,p.y,r)){
    const okX=groundOk(world,x0+sx,z0,p.y,r);x=okX?x0+sx:x0;
    z=groundOk(world,x,z0+sz,p.y,r)?z0+sz:z0;
  }
  const out=pushOut(world,x,z,p.y,r,h);
  if(out.clear&&groundOk(world,out.x,out.z,p.y,r)){p.x=out.x;p.z=out.z;}
  else {p.x=x0;p.z=z0;}   // wedged between two walls: stay where the body was clear
}

function clampToMap(world,p){
  const a=world.layout.bounds.playable,m=P.mapMargin;
  p.x=Math.max(a.minX-m,Math.min(a.maxX+m,p.x));p.z=Math.max(a.minZ-m,Math.min(a.maxZ+m,p.z));
}

/**
 * Moves the player by the input displacement (dx, dz) of this tick and advances gravity by dt.
 * Returns null, or the landing of this tick: {speed, drop, damage, surface, x, y, z}.
 */
export function movePlayer(world,p,dx,dz,dt){
  const r=p.radius??P.radius,h=p.crouched?P.crouchHeight:P.standHeight;
  // A body that starts inside a wall (a save made before the wall existed, a scripted placement) is moved out, never trapped.
  const free=pushOut(world,p.x,p.z,p.y,r,h);if(free.clear){p.x=free.x;p.z=free.z;}
  let landing=null,left=1;   // `left`: share of this tick still to move
  if(!p.fall){
    const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2)),sx=dx/n,sz=dz/n;
    for(let i=0;i<n;i++){
      slide(world,p,sx,sz,r,h);
      const ground=supportAt(world,p.x,p.z,p.y);
      if(p.y-ground>P.snapDown){   // walked off an edge: leave the ground with the walking velocity
        p.fall={vy:0,vx:dt>0?dx/dt:0,vz:dt>0?dz/dt:0,startY:p.y,t:0};left=(n-i-1)/n;break;
      }
      p.y=ground;
    }
    if(!p.fall)left=0;
  }
  if(p.fall&&left>0)landing=fall(world,p,left*dt,dt>0?left*dx:0,dt>0?left*dz:0,r,h);
  clampToMap(world,p);
  return landing;
}

function fall(world,p,dt,inputX,inputZ,r,h){
  const f=p.fall,g=P.gravity;
  // Momentum carries on; the input only steers a share of it. In slices of at most 0.2 m, like the ground, so a thin fence cannot be skipped in the air.
  const mx=f.vx*dt+P.airControl*inputX,mz=f.vz*dt+P.airControl*inputZ,n=Math.max(1,Math.ceil(Math.hypot(mx,mz)/.2));
  for(let i=0;i<n;i++)slide(world,p,mx/n,mz/n,r,h);
  const y0=p.y;
  const vy=Math.max(-P.terminalSpeed,f.vy-g*dt),y1=y0+(f.vy+vy)/2*dt;   // exact y0 + vy dt - g dt^2 / 2 until the terminal speed, then constant speed
  const ground=supportAt(world,p.x,p.z,y0,.05);
  f.t+=dt;
  if(y1>ground+1e-9){p.y=y1;f.vy=vy;return null;}
  // Touchdown: the speed at the surface from the energy (exact for the continuous fall), the drop from where the body left the ground.
  const speed=Math.min(P.terminalSpeed,Math.sqrt(f.vy*f.vy+2*g*Math.max(0,y0-ground))),drop=f.startY-ground;
  const surface=world.isWater(p.x)&&ground<=world.waterY+.5?'water':'ground';
  const damage=surface==='water'||drop<=0?0:fallDamage(speed);
  p.y=ground;delete p.fall;
  return speed>=2.5?{speed,drop,damage,surface,x:p.x,y:ground,z:p.z}:null;
}
