// Required data contract for M01's existing transient events. Never persisted in a save.
import {eyePosition} from '../world/spatial.js';
import {M01_DEATH_CAUSES} from './m01-difficulty.js';
export const BLAST_KINDS=Object.freeze(['grenade','demolition','bomb','shell']);
export const PASS_KINDS=Object.freeze(['crack','whizz','none']);
export function blastKind(id,aerial){return id.startsWith('m01_grenade_')?'grenade':id.includes('demolition')?'demolition':aerial?'bomb':'shell';}
export function impactPass(crack,distance){return crack?'crack':distance<=12?'whizz':'none';}
export function validateM01AudioEvent(event){
  if(event.type==='npc-shot'&&(typeof event.weapon!=='string'||!event.weapon))throw Error('M01 npc-shot.weapon required');
  if(event.type==='m01-blast'&&!BLAST_KINDS.includes(event.kind))throw Error('M01 m01-blast.kind required');
  // The player's feet meet the ground after a fall (src/world/m01-player-physics.js); one event per landing, never persisted. The audio and the camera dip read the speed.
  if(event.type==='player-landing'&&(![event.speed,event.drop,event.damage].every(Number.isFinite)||!['ground','water'].includes(event.surface)||
    !event.point||![event.point.x,event.point.y,event.point.z].every(Number.isFinite)))throw Error('M01 player-landing speed/drop/damage/surface/point required');
  if(event.type==='round-impact'&&!PASS_KINDS.includes(event.pass))throw Error('M01 round-impact.pass required');
  // H9 F5: the player has died (once per death, never persisted). The simulation decided it; the HUD shows `text` in the death beat. `by` is the shooter's id (a German) or null.
  if(event.type==='player-down'&&(!M01_DEATH_CAUSES.includes(event.cause)||typeof event.text!=='string'||!event.text||
    !(event.by===null||/^de_(east|spans)_\d+$/.test(event.by))))throw Error('M01 player-down cause/by/text required');
  if(event.type==='enemy-fire'&&(!Number.isFinite(event.at)||typeof event.weapon!=='string'||!event.origin||
    ![event.origin.x,event.origin.y,event.origin.z].every(Number.isFinite)))throw Error('M01 enemy-fire origin/clock/weapon required');
  // T47: the ckm wz.30 of the west bridgehead answers the German fire. One event per burst, at its first round (rounds * interval long); never persisted.
  if(event.type==='ally-fire'&&(!Number.isFinite(event.at)||typeof event.weapon!=='string'||!event.weapon||typeof event.by!=='string'||!event.origin||
    ![event.origin.x,event.origin.y,event.origin.z].every(Number.isFinite)||!Number.isInteger(event.rounds)||event.rounds<1||!(event.interval>0)))throw Error('M01 ally-fire origin/clock/weapon/rounds required');
  // The ckm wz.30 stops (CKM_STOPPAGES, owner decision 2026-10-22): one `ckm_stoppage` when the burst it was about to fire is not fired (clearAt: when the loader will have cleared it) and one
  // `ckm_stoppage_cleared` when he has; `n` is the stoppage of the mission (1, 2...). The reactive dialogue says 114 and 115 on them. Never persisted.
  if((event.type==='ckm_stoppage'||event.type==='ckm_stoppage_cleared')&&(!Number.isFinite(event.at)||typeof event.by!=='string'||!event.by||!event.origin||
    ![event.origin.x,event.origin.y,event.origin.z].every(Number.isFinite)||!Number.isInteger(event.n)||event.n<1||
    (event.type==='ckm_stoppage'&&!(Number.isFinite(event.clearAt)&&event.clearAt>event.at))))throw Error(`M01 ${event.type} by/at/origin/n${event.type==='ckm_stoppage'?'/clearAt':''} required`);
  // Combat slice 2: a German the player's own rifle or grenade has just killed (the reactive dialogue's NEEDS_EVENT enemy_down_by_player). One per death, never persisted.
  if(event.type==='enemy_down_by_player'&&(typeof event.id!=='string'||!/^de_(east|spans)_\d+$/.test(event.id)||!['kb_wz29','grenade'].includes(event.weapon)||!Number.isFinite(event.at)||
    !Number.isFinite(event.distance)||!event.point||![event.point.x,event.point.y,event.point.z].every(Number.isFinite)))throw Error('M01 enemy_down_by_player id/weapon/distance/point/at required');
  return event;
}
export function enemyFireSoundPlan(event,player){
  const eye=eyePosition(player),dx=event.origin.x-eye.x,dz=event.origin.z-eye.z,distance=Math.hypot(dx,event.origin.y-eye.y,dz),angle=Math.atan2(dz,dx)-player.angle;
  return {distance,pan:Math.sin(angle),front:Math.cos(angle),at:event.at+distance/343};
}
