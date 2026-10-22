// M01 SP-08, the corridor (owner order 2026-10-22, «corrigir a escolta SP-08»): from the moment the player reaches the firing point (obj_m01_hold_corridor) to the west
// demolition he has a task instead of a wait. Approved rule B4 is untouched: readiness(evt_m01_west_demolition) still waits for Bąk delivered at the station
// (tests/m01-partials-correction-01.test.js); what changes is what the player does meanwhile.
//   count   one man of the east platoon at a time, as each passes the firing point («passaram X de Y» on the HUD; lines 047/048 when it starts, 049 when it is complete);
//   escort  Zieliński sends him back up the road to Dudek, who carries Bąk to the station: with the player within ESCORT_NEAR_M Dudek keeps going at his escort pace;
//           alone, a near miss puts him down until it passes. The gate riflemen and the gate MG who see Dudek shoot at him ('squad' rounds, which never wound an ally):
//           the escort is a short walk under real fire, not a wait;
//   done    Bąk is delivered (or there is no carrier): the existing west demolition readiness takes over.
// State: timers.corridor {phase, counted, total, at, since} (saved; absent in older saves and before the corridor). Everything else is computed. No random number is drawn here.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** The withdrawing men count as "passed" once they are this far west, at the firing point (x -290). */
export const PASSED_X=-275;
/** SP-08 numbers. countStepSec: Jan counts one man at a time, at most one every this many real seconds. escortNearM: the player within this distance of Dudek
 *  covers him. escortPace / alonePace: Dudek's walk with Bąk on his shoulder (alonePace is the 1.6 m/s of the old evacuation). countTimeoutSec: real seconds after the
 *  count starts after which Zieliński sends the player to the escort even if a man has not passed (no soft lock). zielinskiJoinX: once Dudek is west of this x (or Bąk
 *  is delivered) Zieliński comes to the player, so he is beside him for the head beat of the west demolition pre-roll (≤ headM, mission.json preRoll near). */
export const CORRIDOR=Object.freeze({countStepSec:.5,escortNearM:10,escortPace:1.7,alonePace:1.6,countTimeoutSec:90,zielinskiJoinX:-200,joinSafeX:-100,headM:3});
const PHASES=Object.freeze(['count','escort','done']);
const ORDER_LINE='dlg_m01_162';

const platoon=sim=>sim.actors.filter(a=>a.group==='grp_east_platoon'&&a.alive&&a.active);
/** Dudek while he carries Bąk, or goes to pick him up for the station (task evacuate_bak), and Bąk is not yet delivered; null otherwise. */
export function escortCarrier(sim){
  const bak=sim.actor('jozef_bak'),medic=sim.actor('leon_dudek');
  if(!bak?.alive||!medic?.alive||!medic.active||medic.state==='WOUNDED')return null;
  if(bak.carriedBy===medic.id)return medic;
  return medic.task==='evacuate_bak'&&bak.active&&!bak.carriedBy?medic:null;
}
/** Bąk while he still has to reach the station (wounded on the deck, waiting for Dudek, or on a shoulder); null when he is there, unhurt or gone. What the section covers. */
export function escortSubject(sim){
  const bak=sim.actor('jozef_bak');
  if(!bak?.alive||sim.flags['m01.bak_status']==='unhurt'||(!bak.active&&!bak.carriedBy))return null;
  return bak.carriedBy||dist(bak,EVACUATION_POINT)>3?bak:null;
}
/** The corridor record, or null before the corridor (and in older saves until their first corridor tick). */
export const corridorRecord=sim=>sim.timers?.corridor??null;
/** True when the player is close enough to Dudek to cover him (escort phase only). */
export function escorted(sim){
  const c=corridorRecord(sim),carrier=c?.phase==='escort'?escortCarrier(sim):null;
  return Boolean(carrier)&&dist(sim.player,carrier)<=CORRIDOR.escortNearM;
}
/** Dudek's walk this tick while he carries Bąk: his speed, or null when he stays down under fire (alone, in the escort phase, suppressed). */
export function escortPace(sim,medic){
  const c=corridorRecord(sim);
  if(c?.phase!=='escort')return CORRIDOR.alonePace;
  if(dist(sim.player,medic)<=CORRIDOR.escortNearM)return CORRIDOR.escortPace;
  return sim.clock<medic.suppressedUntil?null:CORRIDOR.alonePace;
}
/** The man the east bank shoots at in the corridor besides the player: Dudek with Bąk while the escort lasts. */
export function escortTarget(sim){
  const c=corridorRecord(sim);if(c?.phase!=='escort')return null;
  const carrier=escortCarrier(sim);return carrier&&sim.actor('jozef_bak').carriedBy===carrier.id?carrier:null;
}
/** Zieliński comes to the player at the end of the escort (head beat of the west pre-roll), never into the demolition zone. Returns the point beside the player, or null. */
export function zielinskiJoinPoint(sim){
  const c=corridorRecord(sim),p=sim.player;
  if(!c||c.phase==='count'||sim.consumedEvent('evt_m01_west_demolition')||p.x>=CORRIDOR.joinSafeX)return null;
  const carrier=escortCarrier(sim);
  if(c.phase==='escort'&&carrier&&carrier.x>=CORRIDOR.zielinskiJoinX)return null;
  return {x:Math.min(p.x-1.1,CORRIDOR.joinSafeX),z:p.z-1.1};
}

/**
 * One tick of SP-08, from updateObjectives while obj_m01_hold_corridor is active. Writes timers.corridor and says the corridor lines; reads the platoon, Dudek and Bąk.
 * Old saves without the record start it here (the men already west of PASSED_X are counted one by one, as the player would).
 */
export function stepCorridor(sim){
  if(!sim.active('hold_corridor'))return;
  let c=sim.timers.corridor;
  if(!c){
    c=sim.timers.corridor={phase:'count',counted:0,total:platoon(sim).length,at:sim.clock,since:sim.clock};
    sim.line('dlg_m01_047');sim.line('dlg_m01_048');
  }
  if(c.phase==='count'){
    const passed=platoon(sim).filter(a=>a.x<=PASSED_X).length;
    if(c.counted<Math.min(passed,c.total)&&sim.clock-c.at>=CORRIDOR.countStepSec-1e-9){c.counted++;c.at=sim.clock;}
    if(c.counted>=c.total||sim.clock-c.since>=CORRIDOR.countTimeoutSec){
      if(c.counted>=c.total)sim.line('dlg_m01_049');
      const carrier=escortCarrier(sim);
      if(carrier&&carrier.x>PASSED_X){c.phase='escort';sim.line(ORDER_LINE);}else c.phase='done';
      c.since=sim.clock;
    }
    return;
  }
  if(c.phase==='escort'&&!escortCarrier(sim)){c.phase='done';c.since=sim.clock;}
}

/** HUD status line of the corridor phases (pacingStatus), '' when the record says nothing new. */
export function corridorStatus(sim,where){
  const c=corridorRecord(sim);if(!c)return null;
  if(c.phase==='count')return `Corredor · passaram ${c.counted} de ${c.total} homens do pelotão leste`;
  if(c.phase==='escort'){
    const carrier=escortCarrier(sim);if(!carrier)return null;
    const station=Math.ceil(dist(carrier,EVACUATION_POINT));
    if(dist(sim.player,carrier)<=CORRIDOR.escortNearM)return `A escoltar Dudek com Bąk · faltam ${station} m até à estação`;
    if(sim.clock<carrier.suppressedUntil)return `Dudek abrigado sob fogo com Bąk · ${where(carrier)} · vá cobri-lo`;
    return `Escolte Dudek com Bąk · ${where(carrier)} · fique a menos de ${CORRIDOR.escortNearM} m para o cobrir`;
  }
  return null;
}
/** Where Dudek takes Bąk (EVACUATION of m01-simulation.js, pinned equal by tests/m01-escort-coordination.test.js). */
export const EVACUATION_POINT=Object.freeze({x:-332,z:24});
/** Read-only view for the HUD, the test pilot and the tests. */
export function corridorView(sim){
  const c=corridorRecord(sim);if(!c)return null;
  const carrier=escortCarrier(sim);
  return {phase:c.phase,counted:c.counted,total:c.total,carrier:carrier?{id:carrier.id,x:carrier.x,z:carrier.z,distance:dist(sim.player,carrier)}:null,escorted:escorted(sim)};
}
/** Validation of a saved timers.corridor (validateM01Snapshot's reject). */
export function validateCorridorRecord(c,clock,reject){
  const fin=(v,lo=-Infinity,hi=Infinity)=>Number.isFinite(v)&&v>=lo&&v<=hi;
  if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['phase','counted','total','at','since'].includes(k))||Object.keys(c).length!==5)reject('timer corridor');
  if(!PHASES.includes(c.phase)||!Number.isInteger(c.total)||c.total<0||c.total>24||!Number.isInteger(c.counted)||c.counted<0||c.counted>c.total||
    !fin(c.at,0,clock)||!fin(c.since,0,clock))reject('timer corridor');
}
/** The data this module relies on, checked by the tests (no runtime cost). */
export function corridorDataErrors(def=definition){
  const errors=[],lines=new Set(def.dialogue.map(l=>l.id));
  for(const id of ['dlg_m01_047','dlg_m01_048','dlg_m01_049',ORDER_LINE])if(!lines.has(id))errors.push(`line ${id}`);
  if(def.dialogue.find(l=>l.id===ORDER_LINE)?.bark)errors.push(`${ORDER_LINE} is scripted (always said)`);
  return errors;
}
