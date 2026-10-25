import {ROUND_SPEED} from '../game/m01-fire.js';
import {M01_SURFACE_PROFILES,m01VisualSurface,m01VisibleGround,overWater} from './m01-damage-decals.js';
import {visualNoise} from './m01-atmosphere.js';

// R2-c: long-range presentation of the exchange of fire: where the Polish rounds land (impact puffs by surface), which German rounds are drawn as tracers
// (and how faintly), and the shapes/pools those need. Presentation only: it reads events and rounds the simulation already issued (`npc-shot.end/hit`,
// `enemyFire.rounds[].tracer`), decides no damage, no visibility and draws nothing from the simulation's random stream (fixed hash seeds).
// Pools are preallocated; a pool never grows; the draw loop allocates nothing (the caller's `put` and a few scratch numbers are all it uses).

// ---- tracers -------------------------------------------------------------------------------------------------------------------------------------
/**
 * GAMEPLAY_DRAMATIZATION. Which weapons may be drawn with a tracer. The simulation marks the traced rounds (`round.tracer`: one in a burst of the MG34, a fixed
 * cadence authored per display profile); the renderer only decides whether that mark is DRAWN. German MG belts of 1939 were commonly loaded with a tracer
 * round mixed among the ball rounds (the practice, not a ratio, is what is claimed here; no primary source is cited in this repository, so treat the look
 * as dramatization, not as ballistic evidence). A rifle (Kar98k, kb wz.29) shot has no tracer. The Polish rkm/ckm are left out too: no source for their loading
 * is in the project. One constant: add a weapon id here to draw its tracers.
 */
export const TRACER_WEAPONS=Object.freeze(['mg34']);
export const tracerWeapon=weapon=>TRACER_WEAPONS.includes(weapon);
/** Tracers drawn at once, by quality tier (the view's tracer batch has 48 instances; gameplay rounds first, then display rounds up to DISPLAY_TRACER_CAP). Low stays readable. */
export const TRACER_QUOTA_BY_TIER=Object.freeze({low:6,medium:12,high:20});
/** A tracer ignites a short way out of the muzzle (pyrotechnic burn-in): nothing is drawn for the first metres of its flight. */
export const TRACER_BURN_IN_M=25;
export const tracerQuota=quality=>TRACER_QUOTA_BY_TIER[quality]??TRACER_QUOTA_BY_TIER.low;
/** Half-thickness and half-length (m) of a tracer streak seen from `distance`: about a 1.4 px wide, ~7 px long streak, never longer than 16 m (short and fast, not a laser). */
export const tracerHalfWidth=distance=>Math.max(.012,distance*.0013);
export const tracerHalfLength=distance=>Math.min(8,Math.max(.5,distance*.007));
/** Instance tint of a tracer (the material is orange): bright at night and dawn, dimmer in daylight and with distance (floor .55). */
export function tracerTint(daylight,distance){
  const day=Math.min(1,Math.max(0,Number.isFinite(daylight)?daylight:.5)),far=Math.min(1,Math.max(0,(distance-150)/1500));
  return Math.max(.55,(1-.35*day)*(1-.3*far));
}
/**
 * Whether a round is drawn as a tracer at flight fraction `t`: the simulation marked it, its weapon may carry one, it is in flight and it has left the burn-in
 * stretch (`range` = horizontal muzzle-to-aim distance of the round, m).
 */
export function tracerDrawn(round,t,range){
  return round.tracer===true&&tracerWeapon(round.weapon)&&t>=0&&t<=1&&range*t>=TRACER_BURN_IN_M;
}

// ---- round impacts ---------------------------------------------------------------------------------------------------------------------------------
/** Surface classes of a round's end point. Index = value stored in the pool; `body` is a round that struck its man (a faint puff of dust from cloth, no ground kick). */
export const IMPACT_MATERIALS=Object.freeze(['earth','stone','brick','wood','metal','water','body']);
const MAT=Object.freeze(Object.fromEntries(IMPACT_MATERIALS.map((m,i)=>[m,i])));
/** Per class, for one RIFLE round (smaller than the 'impactProfile' of the German rounds, which stand for a burst): puffs, chips, sparks, colour, rise (m/s), spread (m/s), life (s). */
export const ROUND_IMPACT_PROFILE=Object.freeze({
  earth:Object.freeze({dust:3,chips:1,sparks:0,color:0x8b7658,rise:.42,spread:1.5,life:.95}),
  stone:Object.freeze({dust:2,chips:2,sparks:0,color:0xb9b09c,rise:.34,spread:1.2,life:.75}),
  brick:Object.freeze({dust:2,chips:3,sparks:0,color:0x9e5642,rise:.38,spread:1.3,life:.8}),
  wood:Object.freeze({dust:1,chips:3,sparks:0,color:0x98744f,rise:.30,spread:1.3,life:.7}),
  metal:Object.freeze({dust:0,chips:0,sparks:3,color:0xffd27a,rise:.92,spread:2.2,life:.22}),
  water:Object.freeze({dust:3,chips:0,sparks:0,color:0xc6d5d8,rise:.68,spread:1.2,life:.8}),
  body:Object.freeze({dust:1,chips:0,sparks:0,color:0xa89c88,rise:.3,spread:.9,life:.5}),
});
const PROFILES=IMPACT_MATERIALS.map(m=>ROUND_IMPACT_PROFILE[m]);
/** Slots of the pool (pending and live impacts) and impacts that may be DRAWN at once by tier (the pool is oldest-first; the tier only caps). */
export const IMPACT_POOL_SLOTS=64;
export const IMPACT_DRAW_BY_TIER=Object.freeze({low:14,medium:24,high:36});
export const IMPACT_DENSITY=Object.freeze({low:.55,medium:.78,high:1});
/** Minimum on-screen diameter of an impact puff (drawing-buffer px at 1366x768) and its physical radius up close (m). */
export const IMPACT_MIN_PX=4,IMPACT_RADIUS_M=.2;
/** Beyond this the chips are sub-pixel and are not spent (sparks: 1.6x); the dust keeps its pixel floor. */
export const IMPACT_DETAIL_M=90;
const focal=(fovDeg,vh)=>(vh/2)/Math.tan(fovDeg*Math.PI/360);
const dens=quality=>IMPACT_DENSITY[quality]??IMPACT_DENSITY.low;
/** Puffs of class `mat` seen from `distance` at quality `quality`: the profile, thinned by tier, one puff at least; far away (> 150 m) a single one. */
export function impactDustCount(mat,distance,quality){
  const p=PROFILES[mat];if(!p||!p.dust)return 0;
  return distance>150?1:Math.max(1,Math.round(p.dust*dens(quality)*(distance<60?1:.7)));
}
export function impactChipCount(mat,distance,quality){
  const p=PROFILES[mat];if(!p||!p.chips||distance>IMPACT_DETAIL_M)return 0;
  return Math.max(1,Math.round(p.chips*dens(quality)));
}
export function impactSparkCount(mat,distance,quality){
  const p=PROFILES[mat];if(!p||!p.sparks||distance>IMPACT_DETAIL_M*1.6)return 0;
  return Math.max(1,Math.round(p.sparks*dens(quality)));
}
/** Radius (m) of a puff of age fraction `k` at `distance`: physical up close, never under IMPACT_MIN_PX pixels across. */
export function impactPuffRadius(distance,k,fovDeg,vh){
  const mpp=Math.max(1e-6,distance)/focal(fovDeg,vh);
  return Math.max(IMPACT_RADIUS_M*(.6+k*.9),IMPACT_MIN_PX*mpp/2);
}

/** Preallocated pool of impacts, scheduled when the shot is heard and drawn from the moment the round arrives (`at`) for `life` seconds. */
export class RoundImpactPool{
  constructor(slots=IMPACT_POOL_SLOTS){
    this.slots=slots;this.x=new Float64Array(slots);this.y=new Float64Array(slots);this.z=new Float64Array(slots);
    this.at=new Float64Array(slots).fill(-Infinity);this.mat=new Uint8Array(slots);this.seed=new Uint32Array(slots);
    this.scheduled=0;this.dropped=0;this.lastDrawn=0;
  }
  reset(){this.at.fill(-Infinity);this.scheduled=0;this.dropped=0;this.lastDrawn=0;}
  /** Over (expired) at `time`: arrival + life. */
  free(i,time){return time>=this.at[i]+PROFILES[this.mat[i]].life;}
  /** Stores one impact; returns its slot or -1 when full (an impact that has not arrived yet is never evicted; the oldest arrived one is). */
  schedule(x,y,z,at,mat,seed,now){
    let slot=-1,oldest=-1,oldestAt=Infinity;
    for(let i=0;i<this.slots;i++){
      if(this.free(i,now)){slot=i;break;}
      if(this.at[i]<=now&&this.at[i]<oldestAt){oldestAt=this.at[i];oldest=i;}
    }
    if(slot<0)slot=oldest;
    if(slot<0){this.dropped++;return -1;}
    this.x[slot]=x;this.y[slot]=y;this.z[slot]=z;this.at[slot]=at;this.mat[slot]=mat;this.seed[slot]=seed>>>0;this.scheduled++;return slot;
  }
  /** Impacts drawn (arrived, not over) at `time`. */
  live(time){let n=0;for(let i=0;i<this.slots;i++)if(time>=this.at[i]&&!this.free(i,time))n++;return n;}
  /** Impacts still in flight at `time`. */
  pending(time){let n=0;for(let i=0;i<this.slots;i++)if(this.at[i]>time)n++;return n;}
}

/**
 * `npc-shot` -> one pooled impact when the round has an end point (the Polish section's real rounds: `end` where it stopped, `hit` whether it struck its man).
 * `material` is the surface class of `end` (an IMPACT_MATERIALS name, null = nothing to draw: the round stopped in the air); a hit round draws the 'body' puff.
 * Arrival = event clock + flight (distance muzzle->end at the gameplay ROUND_SPEED). Returns the slot, or -1 (no end / nothing to draw / pool full).
 */
export function scheduleRoundImpact(pool,event,clock,material,seed){
  const e=event?.end;if(!e||![e.x,e.y,e.z].every(Number.isFinite))return -1;
  const mat=event.hit===true?MAT.body:MAT[material];if(mat===undefined)return -1;
  const o=event.point,fly=o&&[o.x,o.y,o.z].every(Number.isFinite)?Math.hypot(e.x-o.x,e.y-o.y,e.z-o.z)/ROUND_SPEED:0;
  return pool.schedule(e.x,e.y,e.z,clock+fly,mat,seed,clock);
}

/** Surface class of the end of a round (the same drawn-surface classification the damage decals use for the player's rounds). Event-time only: it allocates. */
export function classifyRoundEnd(world,end,{trees=null,dir=null}={}){
  if(!world||!end||![end.x,end.y,end.z].every(Number.isFinite))return null;
  const inside=world.obstacles?.find(b=>end.x>=b.min.x-.06&&end.x<=b.max.x+.06&&end.y>=b.min.y-.06&&end.y<=b.max.y+.06&&end.z>=b.min.z-.06&&end.z<=b.max.z+.06)??null;
  const guess=inside?.material??'earth',point={x:end.x,y:end.y,z:end.z};
  if(!inside&&overWater(world,point))return 'water';
  const surface=m01VisualSurface(world,point,{dir,trees,material:guess});
  if(surface){const profile=M01_SURFACE_PROFILES[surface.kind];return IMPACT_MATERIALS.includes(profile?.fx)?profile.fx:IMPACT_MATERIALS.includes(surface.kind)?surface.kind:'earth';}
  if(inside)return IMPACT_MATERIALS.includes(inside.material)?inside.material:'stone';
  // Not inside a solid and not on a drawn surface: a round that stopped on the ground within a metre of the drawn one is earth, one that stopped in the air
  // (a miss that flew on) has no impact to show.
  return m01VisibleGround(world,end.x,end.z,end.y,1.2,.9)?'earth':null;
}

/**
 * Draws every arrived impact of the pool at `time` through `put(name,point,scale,dir,opacity,color,seed,variant)` (the view's batch writer): dust puffs ('puff'),
 * sparks off steel ('spark') and chips off stone/brick/wood ('chip', only near). `cam` = camera position, `P`/`SC` = scratch point and scale array owned by
 * the caller. Allocation-free. Returns the number of impacts drawn (<= the tier's cap).
 */
export function drawRoundImpacts(pool,time,cam,fovDeg,vh,quality,put,P,SC){
  const cap=IMPACT_DRAW_BY_TIER[quality]??IMPACT_DRAW_BY_TIER.low;let drawn=0;
  for(let i=0;i<pool.slots&&drawn<cap;i++){
    const age=time-pool.at[i];if(!(age>=0))continue;
    const mat=pool.mat[i],p=PROFILES[mat];if(age>=p.life)continue;
    const x=pool.x[i],y=pool.y[i],z=pool.z[i],seed=pool.seed[i],d=Math.max(.5,Math.hypot(x-cam.x,y-cam.y,z-cam.z)),k=age/p.life;drawn++;
    const dust=impactDustCount(mat,d,quality);
    if(dust){
      const fadeIn=Math.min(1,age/.08),life=fadeIn*Math.pow(1-k,1.18);
      for(let j=0;j<dust&&life>0;j++){
        const n0=visualNoise(seed,30+j*4),n1=visualNoise(seed,31+j*4),n2=visualNoise(seed,32+j*4),a=n0*Math.PI*2,r=age*p.spread*(.45+n1*.75);
        const w=2*impactPuffRadius(d,k,fovDeg,vh)*(.8+n2*.4);SC[0]=w;SC[1]=w*(.62+.3*n1);SC[2]=1;   // the billboard quad is 1 m wide at scale 1: the scale is the WIDTH, not the radius
        P.x=x+Math.cos(a)*r;P.y=y+.05+age*(p.rise+.2*n2);P.z=z+Math.sin(a)*r;
        put('puff',P,SC,null,.75*life,p.color,seed,30+j);
      }
    }
    const sparks=impactSparkCount(mat,d,quality);
    for(let j=0;j<sparks;j++){
      const a=visualNoise(seed,j*4)*Math.PI*2,r=(.06+age*p.spread)*(1+visualNoise(seed,j*4+1)*.8);
      P.x=x+Math.cos(a)*r;P.y=y+.03+age*(p.rise+visualNoise(seed,j*4+2)*2);P.z=z+Math.sin(a)*r;
      put('spark',P,Math.max(.022,d*.0012)*(1-k),null,.9*(1-k),p.color);
    }
    const chips=age<.7?impactChipCount(mat,d,quality):0;
    if(chips){
      const life=Math.max(.16,1-age/.7);
      for(let j=0;j<chips;j++){
        const a=visualNoise(seed,70+j*4)*Math.PI*2,v=.65+visualNoise(seed,71+j*4)*p.spread,s=(.03+visualNoise(seed,72+j*4)*.05)*life;
        P.x=x+Math.cos(a)*v*age;P.y=y+.05+(.9+visualNoise(seed,100+j)*1.5)*age-2.8*age*age;P.z=z+Math.sin(a)*v*age;
        SC[0]=s*1.2;SC[1]=s*.5;SC[2]=s*.6;put('chip',P,SC,null,1,p.color);
      }
    }
  }
  pool.lastDrawn=drawn;return drawn;
}
