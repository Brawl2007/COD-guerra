import {eyePosition} from '../world/spatial.js';

// VIS-a: one muzzle flash per real NPC shot, whatever the distance, and a small pooled gun-smoke puff per shooter. Presentation only.
// The renderer decides nothing here: every flash is read from a round the simulation already issued (enemyFire.rounds: German rifles and the
// MG34 round by round; display.rounds: the visual-only fire of the distant front) or from the gameplay fire state of an allied actor
// (firedAt + the burst length left in `shot`: Kowal's rkm and the allied riflemen, which have no per-round record). The ckm keeps its own module
// (m01-ckm-fx.js). Nothing is stored in the simulation, no random draw, no wall clock: a frame that never saw the shot start draws the same flash.
// Before this module the flash lived in three places (a per-actor window for German gameplay fire, display.firedAt, the ckm plan), only for
// `team==='enemy'`, so the Polish rkm and rifles never flashed, an MG34 burst flickered on a sine instead of on its rounds, and the size was a
// fixed fraction of the distance (8 m radius at 1 km) with no notion of pixels or light.

/** Flash window of one round (s). Rounds are 0.075 s apart (MG34), 0.11 s (rkm), so consecutive rounds of a burst never merge into one steady glow. */
export const SHOT_FLASH_SEC=.06;
export const RKM_INTERVAL=.11;
/** The sim clock is a float sum of 0.05 steps: a round fired at an exact tick may read 1e-10 early. A round starts flashing from that tolerance on. */
export const CLOCK_EPS=1e-6;
/** Capacity of the flash list; the view's `muzzle` batch holds 96 instances. A frame never exceeds it, the pool never grows. */
export const MAX_FLASHES=96;
/** Shooters that may carry a smoke puff at once (a slot is recycled when its puff is over); the tier below caps how many are drawn. */
export const SHOOTER_SLOTS=64;
export const SMOKE_SLOTS_BY_TIER=Object.freeze({low:12,medium:24,high:40});
/** Gun smoke life (s): a rifle puff is short, a machine gun leaves more. */
export const SMOKE_SEC=Object.freeze({rifle:1.3,mg:1.9});
/** Within this distance a rendered body still gives the flash its true muzzle (skinned or procedural); beyond it the round origin / impostor muzzle is used. */
export const NEAR_BODY_M=150;
/** Minimum on-screen diameter of a flash in drawing-buffer pixels (1366x768: a few-pixel bright point) and its physical radius up close (m). */
export const FLASH_MIN_PX=Object.freeze({rifle:5,mg:7});
export const FLASH_RADIUS_M=Object.freeze({rifle:.13,mg:.2});
export const SMOKE_MIN_PX=3;
/** A flash is brighter against a dark scene: the instance tint goes from DAWN (1) to NOON (lowest), and the pixel floor grows up to this share in the dark. */
export const FLASH_TINT_NOON=.62,FLASH_DARK_GROWTH=.3;

const clamp01=v=>v<0?0:v>1?1:v;
export const isHeavyWeapon=w=>typeof w==='string'&&(w.startsWith('mg')||w.startsWith('rkm')||w.startsWith('ckm'));
/** Focal length in pixels of a vertical field of view over the drawing-buffer height. */
export const focalPx=(fovDeg,viewportHeight)=>(viewportHeight/2)/Math.tan(fovDeg*Math.PI/360);

/** Radius (m) of a flash seen from `distance`: the physical radius, or the pixel floor (diameter in px, a little larger in the dark) if that is bigger. */
export function flashRadius(heavy,distance,fovDeg,viewportHeight,daylight=.5){
  const cls=heavy?'mg':'rifle',mpp=Math.max(1e-6,distance)/focalPx(fovDeg,viewportHeight),px=FLASH_MIN_PX[cls]*(1+FLASH_DARK_GROWTH*(1-clamp01(daylight)));
  return Math.max(FLASH_RADIUS_M[cls],px*mpp/2);
}
/** Instance tint (0..1) of a flash: full at night, FLASH_TINT_NOON at full daylight. */
export const flashTint=daylight=>1-(1-FLASH_TINT_NOON)*clamp01(daylight);
/** Radius (m) of a smoke puff of age fraction k (0..1) at `distance`: it grows, never below SMOKE_MIN_PX pixels across. */
export function smokeRadius(heavy,k,distance,fovDeg,viewportHeight){
  const mpp=Math.max(1e-6,distance)/focalPx(fovDeg,viewportHeight),grown=(heavy?.34:.22)*(.55+k*.95);
  return Math.max(grown,SMOKE_MIN_PX*mpp/2);
}

/** Preallocated flash list: filled by `collectShotFlashes` every frame, never resized. */
export function createFlashList(capacity=MAX_FLASHES){
  return {count:0,capacity,dropped:0,by:new Array(capacity).fill(''),x:new Float64Array(capacity),y:new Float64Array(capacity),z:new Float64Array(capacity),
    at:new Float64Array(capacity),index:new Uint16Array(capacity),heavy:new Uint8Array(capacity),source:new Uint8Array(capacity)};   // source: 0 gameplay round, 1 display round, 2 allied fire state
}
const push=(list,by,x,y,z,at,index,heavy,source)=>{
  const i=list.count;if(i>=list.capacity){list.dropped++;return;}
  list.by[i]=by;list.x[i]=x;list.y[i]=y;list.z[i]=z;list.at[i]=at;list.index[i]=index;list.heavy[i]=heavy?1:0;list.source[i]=source;list.count=i+1;
};
const EMPTY=Object.freeze([]);
const shooterLives=(index,id)=>{const a=index?.get(id);return !a||a.alive&&a.active;};

/**
 * Every real NPC shot whose flash window contains `time`, one entry per round:
 *  - `sim.enemyFire.rounds` and `sim.display.rounds` (m01-fire.js, m01-display-fire.js): the round's own origin and firedAt;
 *  - an allied actor (not the ckm crew) with `shot>0` and a finite `firedAt`: a burst longer than 0.2 s is an rkm burst of round(shot0/0.11) rounds
 *    at RKM_INTERVAL, anything shorter is one rifle shot. `shot0` is firedAt-to-end, constant over the burst (time - firedAt + shot).
 * A round-based flash lasts SHOT_FLASH_SEC (0.06 s, the MG34's own `shot` window per round). Fills `list` (no allocation) and returns it.
 */
export function collectShotFlashes(sim,time,list,actorById=null){
  list.count=0;list.dropped=0;
  const fire=sim.enemyFire?.rounds??EMPTY,disp=sim.display?.rounds??EMPTY;
  // `actorById` (optional Map id -> actor): a round of a man who is dead or off the scene draws no flash (a fixed-origin profile id is not an actor and always does).
  for(let i=0;i<fire.length;i++){const r=fire[i],age=time-r.firedAt;if(age>=-CLOCK_EPS&&age<SHOT_FLASH_SEC&&shooterLives(actorById,r.by))push(list,r.by,r.ox,r.oy,r.oz,r.firedAt,0,isHeavyWeapon(r.weapon),0);}
  for(let i=0;i<disp.length;i++){const r=disp[i],age=time-r.firedAt;if(age>=-CLOCK_EPS&&age<SHOT_FLASH_SEC&&shooterLives(actorById,r.by))push(list,r.by,r.ox,r.oy,r.oz,r.firedAt,0,isHeavyWeapon(r.weapon),1);}
  const actors=sim.actors??EMPTY;
  for(let i=0;i<actors.length;i++){
    const a=actors[i];
    if(a.team==='enemy'||!(a.shot>0)||!Number.isFinite(a.firedAt)||!a.alive||!a.active||a.ckm)continue;
    const age=time-a.firedAt;if(age<-CLOCK_EPS)continue;
    const shot0=Math.max(0,age)+a.shot,rounds=shot0>.2?Math.max(2,Math.round(shot0/RKM_INTERVAL)):1,k=rounds>1?Math.floor(Math.max(0,age)/RKM_INTERVAL):0;
    if(k>=rounds||Math.max(0,age)-k*(rounds>1?RKM_INTERVAL:0)>=SHOT_FLASH_SEC)continue;
    const eye=eyePosition(a);   // one small object per firing ally and frame (a handful at most); the round-based sources above allocate nothing
    push(list,a.id,eye.x,eye.y,eye.z,a.firedAt+k*(rounds>1?RKM_INTERVAL:0),k,rounds>1,2);
  }
  return list;
}

/**
 * Smoke puffs: a fixed table of SHOOTER_SLOTS (one puff per shooter, refreshed by his next shot; a burst keeps one growing cloud). Slot arrays are
 * preallocated; an id is looked up by a linear scan, so no Map entry or object is created after construction.
 */
export class ShotSmokeTable{
  constructor(slots=SHOOTER_SLOTS){
    this.slots=slots;this.id=new Array(slots).fill('');this.at=new Float64Array(slots).fill(-Infinity);this.x=new Float64Array(slots);this.y=new Float64Array(slots);this.z=new Float64Array(slots);
    this.heavy=new Uint8Array(slots);this.seed=new Uint32Array(slots);this.skipped=0;
  }
  reset(){this.id.fill('');this.at.fill(-Infinity);this.skipped=0;}
  alive(i,time){const age=time-this.at[i];return age>=0&&age<(this.heavy[i]?SMOKE_SEC.mg:SMOKE_SEC.rifle);}
  /** Registers the flashes of the frame; a shooter already in the table has his puff moved to the newer shot. `cap` = puffs allowed on screen (tier). */
  note(list,time,cap){
    for(let n=0;n<list.count;n++){
      const by=list.by[n],at=list.at[n];let slot=-1,free=-1,live=0;
      for(let i=0;i<this.slots;i++){
        if(this.id[i]===by){slot=i;break;}
        if(this.alive(i,time))live++;else if(free<0)free=i;
      }
      if(slot<0){
        if(free<0||live>=cap){this.skipped++;continue;}
        slot=free;this.id[slot]=by;
      }
      if(at>=this.at[slot]||!this.alive(slot,time)){
        this.at[slot]=at;this.x[slot]=list.x[n];this.y[slot]=list.y[n];this.z[slot]=list.z[n];this.heavy[slot]=list.heavy[n];
        this.seed[slot]=(Math.floor(at*1000)^(Math.floor((list.x[n]+4096)*73)^Math.floor((list.z[n]+4096)*197)))>>>0;
      }
    }
  }
  /** Puffs on screen at `time` (at most `cap`). */
  activeCount(time,cap){let n=0;for(let i=0;i<this.slots&&n<cap;i++)if(this.alive(i,time))n++;return n;}
}
