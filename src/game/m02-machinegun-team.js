// The mission's authored pairs, not extra actors. A rifleman can cover the
// actual target last engaged by the gunner while that gunner reloads. Both
// men must still be present and able to see each other; the assistant's own
// perception and line-of-fire checks remain mandatory at target selection.
const TEAMMATES=Object.freeze({
  pl_aux_02:'pl_aux_01',
  'DE-A06':'DE-A05',
  'DE-B06':'DE-B05',
  'DE-C05':'DE-C04',
});

export function m02MachineGunCover(sim,assistant,side){
  const gunnerId=TEAMMATES[assistant?.id];
  if(!gunnerId||!assistant.alive||assistant.nonCombatant||assistant.detachedOutOfCell||assistant.state==='DOWN'||
    assistant.reloadingUntil>sim.clock||assistant.mag<=0||assistant.suppressed>=.88)return null;
  const team=side==='ally'?sim.allies:side==='enemy'?sim.enemies:null;
  const gunner=team?.find(actor=>actor.id===gunnerId);
  if(!gunner?.alive||gunner.nonCombatant||gunner.detachedOutOfCell||gunner.state==='DOWN'||!(gunner.reloadingUntil>sim.clock))return null;
  if(Math.hypot(gunner.x-assistant.x,gunner.z-assistant.z)>6||!sim.world.lineOfSight(assistant,gunner,{includeFoliage:false}))return null;
  const shotAge=sim.clock-(gunner.lastShotAt??-Infinity);
  const targetId=side==='ally'
    ? shotAge>=0&&shotAge<=8?gunner.m02LastEngagedTargetId:null
    : gunner.seeingTargetId;
  return typeof targetId==='string'?{gunnerId,targetId}:null;
}
