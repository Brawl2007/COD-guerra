// Required data contract for M01's existing transient events. Never persisted in a save.
import {eyePosition} from '../world/spatial.js';
export const BLAST_KINDS=Object.freeze(['grenade','demolition','bomb','shell']);
export const PASS_KINDS=Object.freeze(['crack','whizz','none']);
export function blastKind(id,aerial){return id.startsWith('m01_grenade_')?'grenade':id.includes('demolition')?'demolition':aerial?'bomb':'shell';}
export function impactPass(crack,distance){return crack?'crack':distance<=12?'whizz':'none';}
export function validateM01AudioEvent(event){
  if(event.type==='npc-shot'&&(typeof event.weapon!=='string'||!event.weapon))throw Error('M01 npc-shot.weapon required');
  if(event.type==='m01-blast'&&!BLAST_KINDS.includes(event.kind))throw Error('M01 m01-blast.kind required');
  if(event.type==='round-impact'&&!PASS_KINDS.includes(event.pass))throw Error('M01 round-impact.pass required');
  if(event.type==='enemy-fire'&&(!Number.isFinite(event.at)||typeof event.weapon!=='string'||!event.origin||
    ![event.origin.x,event.origin.y,event.origin.z].every(Number.isFinite)))throw Error('M01 enemy-fire origin/clock/weapon required');
  return event;
}
export function enemyFireSoundPlan(event,player){
  const eye=eyePosition(player),dx=event.origin.x-eye.x,dz=event.origin.z-eye.z,distance=Math.hypot(dx,event.origin.y-eye.y,dz),angle=Math.atan2(dz,dx)-player.angle;
  return {distance,pan:Math.sin(angle),front:Math.cos(angle),at:event.at+distance/343};
}
