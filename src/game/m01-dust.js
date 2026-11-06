// M01 dust and smoke clouds as a fact of the simulation (package 2, 2026-11-04; golden amendment 21).
//
// Until now an explosion left a crater in sectors.damage and the RENDERER drew a column of smoke over it; nothing on the simulation side knew a cloud was there, so a German and a Pole
// saw each other through the dust the player could not see through. A blast now also records a cloud: where it is (the crater), how wide (r, metres) and how high (h) it is, how dense it
// starts (d, 0..1) and how long it lasts (life, seconds of the real clock). The record is the `dust` object of the crater's own damage record (sectors.damage, saved with the game);
// a record that has none (a save made before this module) is given the default of its kind, so an old save simply has the clouds of its recent blasts.
//
// A cloud is a vertical cylinder standing on the ground of the crater. Its density is a pure function of the age of the blast: it builds up in RISE_SEC, holds, and thins linearly over the
// last FADE share of its life. The thickness a sight line meets is the sum over the clouds of density times the length of the line inside the cylinder (metres of full-density cloud). A
// line thicker than DUST.blockAt is blocked: the man at one end does not see the man at the other (M01Simulation.sees, which every AI acquisition of the act goes through). The player's own
// sight is the renderer's and the player's: nothing here decides what the player sees, and the renderer draws these same clouds (renderState.dust) so that what hides a man from the AI is
// on the screen.
//
// GAMEPLAY VALUES, NOT PHYSICS. Radius and life are tuned for a 250 kg bomb (the Ju 87 B of the 04:34 raid), a hand grenade (the smoke of a grenade already lasts 20 s on screen), a bridge
// demolition and a shell; no source gives them. Everything here is a pure function of its arguments: no clock, no world, no random stream, no write.

/** Seconds a cloud takes to build up to its full density, and the share of its life over which it thins out at the end (the first part holds at full density). */
export const DUST_RISE_SEC=1.5,DUST_FADE_SHARE=.4;

export const DUST=Object.freeze({
  // The thickness (metres of cloud at density 1) at which a line of sight is blocked: a man 2 m inside a bomb's dust at its densest can still see out, one 3 m inside cannot, and a man at the
  // heart of a grenade's cloud (4.5 m from its edge) is hidden from every side.
  blockAt:3,
  // Per kind of blast: r radius (m), h height above the ground of the crater (m), d density at the peak (0..1), life seconds of the real clock.
  kinds:Object.freeze({
    bomb:Object.freeze({r:16,h:12,d:1,life:40}),
    demolition:Object.freeze({r:42,h:32,d:1,life:150}),
    grenade:Object.freeze({r:4.5,h:3.5,d:1,life:20}),
    shell:Object.freeze({r:8,h:7,d:1,life:30}),
  }),
  // Limits of a saved record (validateM01Snapshot): a cloud no wider than 80 m, no higher than 60 m, nothing that lasts more than 300 s.
  maxR:80,maxH:60,maxLife:300,
});

/** The kind of blast of a damage record, from its id (the same rule as blastKind in m01-audio-events.js, for a record whose `aerial` flag was not kept). */
export const dustKind=id=>id.startsWith('m01_grenade_')?'grenade':id.includes('demolition')?'demolition':'bomb';

/** The cloud a new blast of this kind leaves (a copy: the record is saved with the game). */
export const dustSpec=kind=>{const k=DUST.kinds[kind]??DUST.kinds.bomb;return {r:k.r,h:k.h,d:k.d,life:k.life};};

/** True for a saved `dust` object the simulation could have written. */
export const validDust=v=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===4&&['r','h','d','life'].every(k=>Object.hasOwn(v,k)&&Number.isFinite(v[k]))&&
  v.r>0&&v.r<=DUST.maxR&&v.h>0&&v.h<=DUST.maxH&&v.d>0&&v.d<=1&&v.life>0&&v.life<=DUST.maxLife;

/** The density of a cloud `age` seconds after its blast: 0 before and after it, building up in DUST_RISE_SEC, full, then thinning over the last DUST_FADE_SHARE of its life. */
export function dustDensity(spec,age){
  if(!(age>=0)||age>=spec.life)return 0;
  const fade=spec.life*DUST_FADE_SHARE;
  return spec.d*Math.min(1,age/DUST_RISE_SEC)*Math.min(1,(spec.life-age)/fade);
}

/**
 * The clouds standing at `clock`, from the damage records (sectors.damage): {id, x, y, z, r, h, density} for each blast younger than its life. A wreck's column (the VII-a hull, `wreck`)
 * is smoke without a blast and leaves no cloud. `out` is reused when given (the list is rebuilt, never kept).
 */
export function dustClouds(damage,clock,out=[]){
  out.length=0;
  for(const d of damage){
    if(d.wreck)continue;
    const spec=d.dust??DUST.kinds[dustKind(d.id)],density=dustDensity(spec,clock-d.started);
    if(density>0)out.push({id:d.id,x:d.x,y:d.y,z:d.z,r:spec.r,h:spec.h,density});
  }
  return out;
}

/** Length (m) of the segment origin -> origin + dir * len that lies inside the cloud's cylinder (its disc in x/z, its height above the ground of the crater). */
export function dustChord(c,o,dir,len){
  let t0=0,t1=len;
  const ox=o.x-c.x,oz=o.z-c.z,a=dir.x*dir.x+dir.z*dir.z;
  if(a<1e-12){if(ox*ox+oz*oz>c.r*c.r)return 0;}
  else{
    const b=ox*dir.x+oz*dir.z,disc=b*b-a*(ox*ox+oz*oz-c.r*c.r);
    if(disc<=0)return 0;
    const s=Math.sqrt(disc);t0=Math.max(t0,(-b-s)/a);t1=Math.min(t1,(-b+s)/a);
  }
  if(t1<=t0)return 0;
  const y0=c.y-.5,y1=c.y+c.h;
  if(Math.abs(dir.y)<1e-9){if(o.y<y0||o.y>y1)return 0;}
  else{const v0=(y0-o.y)/dir.y,v1=(y1-o.y)/dir.y;t0=Math.max(t0,Math.min(v0,v1));t1=Math.min(t1,Math.max(v0,v1));}
  return t1>t0?t1-t0:0;
}

/** The thickness of dust (metres of density-1 cloud) on the straight line from `from` to `to` (points with x, y, z): the sum over the clouds of density times the length inside. */
export function dustThickness(clouds,from,to){
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,len=Math.hypot(dx,dy,dz);
  if(len<1e-6)return 0;
  const dir={x:dx/len,y:dy/len,z:dz/len};let thickness=0;
  for(const c of clouds){
    // the cheap rejection: both ends and the whole segment on one side of the cloud's disc
    if(Math.max(from.x,to.x)<c.x-c.r||Math.min(from.x,to.x)>c.x+c.r||Math.max(from.z,to.z)<c.z-c.r||Math.min(from.z,to.z)>c.z+c.r)continue;
    thickness+=c.density*dustChord(c,from,dir,len);
  }
  return thickness;
}

/** True when the dust on the line from `from` to `to` blocks sight (thickness at least DUST.blockAt). */
export const dustBlocks=(clouds,from,to)=>clouds.length>0&&dustThickness(clouds,from,to)>=DUST.blockAt;
