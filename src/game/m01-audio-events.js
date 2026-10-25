// Required data contract for M01's existing transient events. Never persisted in a save.
import {eyePosition} from '../world/spatial.js';
import {M01_DEATH_CAUSES} from './m01-difficulty.js';
export const BLAST_KINDS=Object.freeze(['grenade','demolition','bomb','shell']);
export const PASS_KINDS=Object.freeze(['crack','whizz','none']);
export function blastKind(id,aerial){return id.startsWith('m01_grenade_')?'grenade':id.includes('demolition')?'demolition':aerial?'bomb':'shell';}
export function impactPass(crack,distance){return crack?'crack':distance<=12?'whizz':'none';}
/** R2-a (src/game/m01-section.js): what a Pole of the section can call (a German by class, the deck assault by phase, a man down, a man pinned) and what the sergeant can order. */
export const SECTION_CALLOUT_KINDS=Object.freeze(['mg','gate','dike','deck','advance','fallback','down','pinned','casualty']);
export const SECTION_ORDER_KINDS=Object.freeze(['focus','hold','shift','return','deck','sector']);
/** R2-b: what a man of the deck assault does besides the old bounds: press on to a closing line, fall back one line, search for the Pole he lost. */
export const DECK_TACTIC_KINDS=Object.freeze(['stage','pullback','search']);
const finitePoint=p=>Boolean(p)&&[p.x,p.y,p.z].every(Number.isFinite);
export function validateM01AudioEvent(event){
  if(event.type==='npc-shot'&&(typeof event.weapon!=='string'||!event.weapon))throw Error('M01 npc-shot.weapon required');
  // R2-b: a real round of the Polish section also carries where it stopped (`end`) and whether it struck its target (`hit`). Optional; the display-grade shots of R2-a and the rearguard's carry neither.
  if(event.type==='npc-shot'&&(event.end!==undefined||event.hit!==undefined)&&(!finitePoint(event.end)||typeof event.hit!=='boolean'))throw Error('M01 npc-shot.end/hit: a point and a boolean, together');
  // R2-a: a man of the section has seen (or heard, or suffered) something new: who called, what, where he stands (`from` = `point`, the place the bark director measures hearing from) and where it is
  // (`aim`, null when there is no target), the side of the gates as the player sees them (mg / gate only), and what each listener did about it. Never persisted.
  if(event.type==='section-callout'&&(!SECTION_CALLOUT_KINDS.includes(event.kind)||typeof event.by!=='string'||!event.by||!(event.target===null||typeof event.target==='string')||
    !(event.side===null||event.side==='left'||event.side==='right')||!(event.landmark===null||['gate','dike','deck'].includes(event.landmark))||!finitePoint(event.from)||!finitePoint(event.point)||
    !(event.aim===null||finitePoint(event.aim))||!Number.isFinite(event.at)||
    !Array.isArray(event.reactions)||event.reactions.some(r=>!Array.isArray(r)||r.length!==2||typeof r[0]!=='string'||!['fire','look','drop'].includes(r[1]))))throw Error('M01 section-callout kind/by/target/side/from/point/aim/at/reactions required');
  // R2-a: the sergeant's order (to the men it names, about a target when it has one). Never persisted.
  if(event.type==='section-order'&&(!SECTION_ORDER_KINDS.includes(event.kind)||typeof event.by!=='string'||!event.by||!Array.isArray(event.to)||!event.to.length||event.to.some(id=>typeof id!=='string')||
    !(event.target===null||typeof event.target==='string')||!(event.side===null||event.side==='left'||event.side==='right')||!finitePoint(event.from)||!finitePoint(event.point)||!Number.isFinite(event.at)))
    throw Error('M01 section-order kind/by/to/target/side/from/point/at required');
  if(event.type==='m01-blast'&&!BLAST_KINDS.includes(event.kind))throw Error('M01 m01-blast.kind required');
  // R2-b: a stick grenade of the deck assault has been thrown (the warning: who, from where, where it is aimed, the fuse from the throw and the flight) and, on its explosion, the m01-blast of kind grenade
  // carries `by` (the thrower). A change of line of the assault is `deck-tactic` (stage: on to a closing line, pullback: one line back, search: a bound to see where the Pole was last seen). Never persisted.
  if(event.type==='enemy-grenade'&&(!/^de_spans_\d+$/.test(event.by??'')||!finitePoint(event.origin)||!finitePoint(event.target)||!(event.fuse>0)||!(event.flight>0)||!Number.isFinite(event.at)))
    throw Error('M01 enemy-grenade by/origin/target/fuse/flight/at required');
  if(event.type==='m01-blast'&&event.by!==undefined&&(event.kind!=='grenade'||!/^de_spans_\d+$/.test(event.by)))throw Error('M01 m01-blast.by is the thrower of a stick grenade');
  if(event.type==='deck-tactic'&&(!DECK_TACTIC_KINDS.includes(event.kind)||!/^de_spans_\d+$/.test(event.by??'')||!Number.isInteger(event.line)||event.line<0||!Number.isFinite(event.at)))
    throw Error('M01 deck-tactic kind/by/line/at required');
  // R1-a: an aerial bomb also says how hard it stunned the player (`concussion`, 0..1: the audio presents it as the mix's concussion duck) and whom it killed, wounded and shook (`effects`, ids).
  // Both are optional, and a grenade or a demolition carries neither. Transient: never persisted (the state is in the actors and in player.concussion).
  if(event.type==='m01-blast'&&event.concussion!==undefined&&!(Number.isFinite(event.concussion)&&event.concussion>=0&&event.concussion<=1))throw Error('M01 m01-blast.concussion must be 0..1');
  if(event.type==='m01-blast'&&event.effects!==undefined&&(!event.effects||['killed','wounded','suppressed'].some(k=>!Array.isArray(event.effects[k])||event.effects[k].some(id=>typeof id!=='string'))))throw Error('M01 m01-blast.effects killed/wounded/suppressed required');
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
