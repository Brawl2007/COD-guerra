// The west bridgehead garrison (R1-a, 2026-10-23; golden amendment 16). Until now nobody stood where the 04:34 bombs fell on the west bank but the cast, who the plot needs alive and who a
// bomb therefore only shakes: the owner's playtest saw "soldiers next to the bombings survive with no consequences". These are a few unnamed Polish riflemen of the garrison of the bridgehead
// (HISTORICAL_RESEARCH.md: the raid of 04:34 hit the west bank next to the bridges) posted along the strip between the approaches and the road, on the stretches the schedule
// `raidTargets0434` and the scripted bomb of the cable fall on. They are authored presentation actors, like the station yard (m01-yard-life.js): `displayOnly`, so outside allies / enemies /
// combatants, with no behaviour of their own (the generic actor loop skips them), no weapon fire, no cover reservation, no corridor occupancy and no draw from any random stream. What happens to
// them is only what a bomb does to any man who is not the cast (m01-blast.js): killed (the body stays), wounded (they lie where they fell, in the existing WOUNDED pose) or shaken (the existing
// suppression: they go to the ground and rise again). The survivors stay at their posts for the rest of the mission.
//
// Certainty: that a garrison stood there is RECONSTRUCTED (T08/T27 document a post at the west bridgehead; the number and the posts are open), the men, their posts and everything the bombs do to
// them are GAMEPLAY_DRAMATIZATION. No source gives Polish losses for this raid: nothing here may be shown as a count or told as a fact.
export const GARRISON_GROUP='grp_west_garrison';
const POSTURES=Object.freeze(['stand','crouch']);

/**
 * The garrison of mission.json `westGarrison`, validated (a typo in the data stops the game, like the other plans): 4 to 6 men, ids pl_west_0.., each on a free place of the west bank (inside the
 * playable area, out of the river and the buildings, away from the places of the objectives) and facing a finite heading. `keep` are the objective places to stay clear of, `clearM` the distance.
 */
export function garrisonPlan(def,world,keep=[],clearM=7){   // 7 m: outside the 6 m reach circle of the objective at the cable camp (repair_site_1)
  const fail=m=>{throw new Error(`M01 west garrison: ${m}`);},g=def.westGarrison,list=g?.soldiers,b=world.layout.bounds.playable;
  if(!Array.isArray(list)||list.length<4||list.length>6)fail('4 to 6 soldiers required');
  if(g.certainty!=='GAMEPLAY_DRAMATIZATION'||g.presence!=='RECONSTRUCTED')fail('certainty: presence RECONSTRUCTED, men and posts GAMEPLAY_DRAMATIZATION');
  return list.map((s,i)=>{
    const id=`pl_west_${i}`;
    if(s?.id!==id||!Array.isArray(s.position)||s.position.length!==2||!s.position.every(Number.isFinite)||!Number.isFinite(s.facing)||!POSTURES.includes(s.posture))fail(`${id}: id, position [x, z], facing and posture`);
    const [x,z]=s.position;
    if(!(x>=b.minX+10&&x<=b.maxX&&z>=b.minZ+10&&z<=b.maxZ-10))fail(`${id} outside the playable area`);
    if(world.isWater(x)||world.buildings.some(o=>x>=o.min.x-1&&x<=o.max.x+1&&z>=o.min.z-1&&z<=o.max.z+1))fail(`${id} in the river or a building`);
    if(keep.some(k=>Math.hypot(x-k.x,z-k.z)<clearM))fail(`${id} too close to an objective`);
    return Object.freeze({id,x,z,facing:s.facing,crouched:s.posture==='crouch'});
  });
}
/** The actors of the plan, at their posts, standing guard: `entity` is the simulation's actor factory. */
export function makeGarrison(entity,world,plan){
  return plan.map(p=>entity(p.id,{x:p.x,y:world.heightAt(p.x,p.z),z:p.z},'ally',{group:GARRISON_GROUP,role:'RIFLEMAN',displayOnly:true,facing:p.facing,crouched:p.crouched}));
}
