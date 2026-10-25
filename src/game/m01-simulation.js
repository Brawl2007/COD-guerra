import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import mapLayout from '../../missions/m01-tczew/map-layout.json' with {type:'json'};
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with { type: 'json' };
import { TczewWorld } from '../world/tczew-world.js';
import { movePlayer } from '../world/m01-player-physics.js';
import { M01Navigator, NAV, playerSolidsForNav } from '../world/m01-navigation.js';
import { Wz29 } from './wz29.js';
import { M01_DIFFICULTY, M01_DIFFICULTY_IDS, M01_DIFFICULTY_SIM_DEFAULT, oddsWeight, M01_WEST_BANK_KINDS, M01_AIMED_AT_PLAYER_KINDS, F1_TELEGRAPH_GAP_SEC, BURST_GROUP_SEC,
  M01_CHECKPOINT_B2, checkpointApplies, deathText } from './m01-difficulty.js';
import { Random } from '../core/random.js';
import { eyePosition, aimDirection, muzzlePosition, traceShot, traceObstruction, rayBox } from '../world/spatial.js';
import { makeRound, traceRound, closestApproach, roundPoint, validRound, NEAR_MISS, ATTRITION_VICTIM, ARC_K, ROUND_SPEED } from './m01-fire.js';
import { aimPoint } from './m01-aim.js';
import { createDisplayFire, displaySeed, displayProfiles, updateDisplayFire, displayFireView, computeBattleReadout } from './m01-display-fire.js';
import { initializePresentation, updateMotion, updatePosture, updateBodyYaw, recordSuppression, recordHit, recordDeath,
  recordDamage, validatePresentation, presentationDiagnostics,updateActorDetails } from './m01-animation-presentation.js';
import {makeAuxiliaries,updateYard,updateLoaders,AUXILIARY_IDS,YARD_IDS,MG_LOADER_IDS,YARD_TASKS} from './m01-yard-life.js';
import {GARRISON_GROUP,garrisonPlan,makeGarrison} from './m01-garrison.js';
import {blastKind,impactPass,validateM01AudioEvent} from './m01-audio-events.js';
import {activeCompression,tempoState,interludeText,continuityAllowed,objectiveMarker,pacingStatus,HOLD_AREA,HOLD_POSITION,WEST_SAFE_X} from './m01-pacing.js';
import {DECK_ASSAULT,DECK_SAFE_X,deckRole,assaultIndex,deckEntry,deckGoal,deckLimitNode,deckLines,deckLineNumber,validDeckRecord} from './m01-deck-assault.js';
import {REARGUARD,rearguardIndex,rearguardPost,validRearguardRecord} from './m01-rearguard.js';
import {barkEvent,barkTrigger,barkPoll,barkShown,noteSpoken,validateBarkState,BARK_RULES,BARK_CONFIG,BARK_LINES} from './m01-barks.js';
import {stepCorridor,escortPace,escortTarget,zielinskiJoinPoint,escortSubject,corridorView,corridorRecord,validateCorridorRecord,CORRIDOR} from './m01-corridor.js';
import {SQUAD,SQUAD_IDS,updateSquad,squadSlot,teamPost,squadMoving,validateSquadRecord} from './m01-squad.js';
import {SECTION,updateSection,sectionWalk,sectionAfter,sectionCasualty,sectionView,sectionRealOn,validateSectionRecord} from './m01-section.js';
import {BOMB_BLAST,BOMB_REACH_M,CONCUSSION,blastJitter,blastProtection,castIds,blastPosture,blastTarget,sightPoint,blastOutcome,concussionPeak,concussionLevel,mergeConcussion,earlyRaidPoint} from './m01-blast.js';
import {REPAIR_WORK_SEC,SAPPERS,sapperPhase,sapperGoal,sapperRate,sapperCover,sapperView,workDistance} from './m01-sappers.js';
import {ckmFinal,retreatSlot} from './m01-retreat.js';
import {updateOpening,openingWalk,holdNowicki,closeOpening,openingView,validateOpeningRecord,validateOpeningAct} from './m01-opening.js';

export const seconds=text=>{const values=text.split(':').map(Number);if(values.length===2)values.push(0);return values.reduce((n,v)=>n*60+v,0);};
export const clockText=n=>new Date(Math.round(n)*1000).toISOString().slice(11,19);
const E=name=>`evt_m01_${name}`,O=name=>`obj_m01_${name}`;
const clone=value=>JSON.parse(JSON.stringify(value));
const definitionMapCover=cover=>mapLayout.coverNodes.some(n=>n.id===cover.nodeId&&n.type===cover.type&&cover.height===(n.heightM??0));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// A reactive line cuts the reactive line on screen only when it is this many priorities more urgent (priority 1, danger, over 3, ambient); a scripted line always may (after cutAfterSec).
const BARK_CUT_STEP=2;
// The cast that has a body in the world. The three ckm crew voices (`voiceOnly`) are cast for the subtitles; their bodies are the crew makeCKMCrew makes.
const ACTOR_CAST=definition.cast.filter(c=>c.id!=='jan_wrona'&&!c.voiceOnly);
const inside=(p,a)=>p.x>=a.minX&&p.x<=a.maxX&&p.z>=a.minZ&&p.z<=a.maxZ;
const entity=(id,point,team='ally',extra={})=>({id,space:'metres',...point,team,health:100,alive:true,active:true,
  state:'GUARD',facing:0,shot:0,radius:.3,crouched:false,suppressedUntil:0,cooldown:0,rounds:5,...extra});
const phaseText={INTRO:'04:30 · Tczew, Polónia',OUTRO:'07:05 · Chamada no abrigo'};
// Dudek leva Bąk para junto da estação ("Levaram o Bąk para a estação", dlg_m01_056b), fora da zona de demolição oeste.
const EVACUATION={x:-332,y:-3,z:24};
// Personal space of walking men (moveActor): a shoulder's slack off the sum of the radii, the longest push of one tick, and the last metres in which a crowd queues.
const SEPARATION_SLACK=.1,SEPARATION_PUSH=.15,CROWD_NEAR=2.5,STEER_TURNS=Object.freeze([.6,-.6,1.2,-1.2]);   // STEER_TURNS: the turns steerAround tries, in order, to the free side
// The actors' navigator: the colliders, girders and ckm sandbags, plus (2026-10-18, phys x npc integration) every solid the player's body meets that no collider covers
// (the casemate, the shelter walls, the bridge heads, the prop kit: playerSolidsForNav), so a man routes round what the player walks into and is never left inside it.
// It is built and warmed (solid list, buckets) at construction and after a load, so the first plan of a mission does not pay for them.
const simulationNavigator=world=>new M01Navigator(world,{emplacement:CKM_POSITION,extraSolids:playerSolidsForNav}).prewarm();
// The men a walking man must keep clear of, gathered by gatherBodies into one list that is reused and never shortened (its first n entries are the answer; the callers read them
// before they ask again).
const BODY_SCRATCH=[];
// The scripted station casualty is fictional and already in the yard before the raid, avoiding a visible relocation.
const STATION_YARD={x:-300,y:-3,z:30},STATION_PATIENT='generic_rifleman';
// Estimated presentation timing, owned by simulation and saved with the pair (schema 2).
const STATION_TRANSITION_SEC=1.6,STATION_DRAG_OFFSET=.92;
const STATION_DELIVERY={x:EVACUATION.x-2,z:EVACUATION.z+2.2};
// ckm wz.30, post S2 (T47, RECONSTRUCTED). T08/T27 document "a bunker at the west bridgehead" (P12: exact position open); no source places the gun.
// The casemates under the abutments cannot see a single German (T04; docs/verification/m01-runtime/ckm-fire-arc-phase0-2026-10-16), so the gun stands in
// a field emplacement on the embankment between the bridges, against the north face of the road abutment, at the level of the casemates. The
// gun_muzzle_flash socket (0.83 m ahead of the root, 0.64 m up: manifest sockets.scene; yaw -PI/2 turns local -Z into +X) is at (8, -2.36, 26),
// 1045-1049 m from the gate riflemen of Lisewo with a clear production line (no bridge collider on the line or the arc).
export const CKM_POSITION={x:7.17,y:-3,z:26};
// The pre-T47 post (embrasure cv_casemate_emb_s, muzzle_flash at the mapped x=25): only for older saves and for the phase-0 measurements.
export const CKM_CASEMATE_POSITION={x:24.17,y:-3,z:43};
export const ckmMuzzle=(root=CKM_POSITION)=>({x:root.x+.83,y:root.y+.64,z:root.z});
const CKM_IDS=['ckm_gunner','ckm_loader','ckm_reserve'],CKM_ABANDON_SEC=3,CKM_PLACEMENT_DX=2.17;
const CKM_LEGACY_POST=[[21.206,42.971],[22.08,42.48],[20.4,41.6]];                         // first placement, before the +2.17 alignment to the embrasure
const CKM_CASEMATE_POST=CKM_LEGACY_POST.map(([x,z])=>[x+CKM_PLACEMENT_DX,z]);              // placement up to T47, around the casemate gun
// The same rigid layout around the S2 gun root (manifest crew places): gunner behind the gun, loader at the belt side, third man behind the loader.
export const CKM_POST=[[-.794,-.029],[.08,-.52],[-1.6,-1.4]].map(([dx,dz])=>[CKM_POSITION.x+dx,CKM_POSITION.z+dz]);
const migrateCKMPlacement=(actors,consumed)=>{
  // Older schema-2 saves have no placement-version marker. The only unambiguous signature is an idle/aim/feed/abandon crew member still at an exact
  // older authored post (the first one or the +2.17 alignment). T47 moves it to S2; the phase, its start time and every other field stay as saved.
  // Retreat actors are never moved.
  if(Object.hasOwn(consumed,E('west_demolition')))return;
  CKM_IDS.forEach((id,i)=>{
    const a=actors.find(actor=>actor.id===id);
    if(a?.ckm&&a.ckm.phase!=='retreat'&&a.y===-3&&[CKM_LEGACY_POST,CKM_CASEMATE_POST].some(post=>a.x===post[i][0]&&a.z===post[i][1]))[a.x,a.z]=CKM_POST[i];
  });
};
// T38: saves made before the staging carry the old waiting places. A man still standing exactly on his old authored place (the only unambiguous
// signature) and not sent anywhere is put on his new slot when the save loads; anyone who has moved keeps his position.
const migrateT38Staging=(actors,world)=>{
  const castIds=ACTOR_CAST.map(c=>c.id),seat=(a,x,z,facing)=>{a.x=x;a.z=z;a.y=world.heightAt(x,z);if(facing!==undefined&&a.facing===0)a.facing=facing;};
  for(const a of actors){
    const i=castIds.indexOf(a.id),slot=STAGE.squad.slots[a.id]??STAGE.sappers[a.id],idle=!a.target&&!a.task&&!a.carriedBy&&a.alive;
    if(slot&&idle&&a.role==='ENGINEER'&&a.x===-42-i*.6&&a.z===10&&a.y===-2)seat(a,slot.x,slot.z,slot.facing);
    else if(slot&&idle&&a.role!=='ENGINEER'&&a.x===-76-i*1.6&&a.z===24+i%3*2&&a.y===-3)seat(a,slot.x,slot.z,slot.facing);
    const k=a.group==='grp_east_platoon'?Number(a.id.slice(8)):-1;
    if(k>=0&&a.alive&&!a.carriedBy&&a.x===1033+k%6*2&&a.z===38.2+Math.floor(k/6)*1.2&&a.y===0){const p=holdSlot(k);seat(a,p.x,p.z);}
    const g=a.group==='grp_de_east'?Number(a.id.slice(8))-2:-1;
    if(g>=0&&g<12&&a.alive&&a.x===1053+g%3*2&&a.z===9.5+g*2&&a.y===-1){const p=STAGE.gates.positions[g];seat(a,p.x,p.z,p.facing);}   // a fallen man is not moved
  }
};
// Live fire (T47). The belt is the documented wz.30 fabric belt of 330 rounds (research/weapons/ckm_wz30.md and manifest measures.belt, T34); the 0.1 s
// interval (600 rounds/min cyclic), the 8-round burst, the 1.3 s fire_burst clip and the 3.2 s feed clip are those of the authored clips
// (ckm_wz30_gun_fire_burst events.fire 0..0.7 s). Everything below is simulation data: the renderer and the audio only read it.
export const CKM_BELT=330,CKM_BURST_ROUNDS=8,CKM_INTERVAL=.1,CKM_BURST_SEC=1.3,CKM_FEED_SEC=3.2;
const CKM_FIRE_FROM=seconds('04:46:00'),CKM_CEASE_AT=seconds('06:09:30');   // 06:09:30 = 30 s before the east demolition, where advanceBattle holds the clock (gate - 30 s)
// Stoppages (owner decision 2026-10-22, golden amendment 15; docs/verification/m01-runtime/ckm-jam-2026-10-22/README.md). The wz.30 is a Browning M1917 copy fed from a fabric belt: a bad
// round or a twisted belt stops the gun. A table, not a lottery: the k-th stoppage strikes when the gunner is about to fire the burst after the `after`-th one (he has fired `after` bursts of 8
// rounds), and the loader clears it in `sec` real seconds: the 3.2 s feed drill of the authored clips (belt tip in, handle back twice, `ready` at 3.0 s) behind a lead in which the gunner calls it.
// Nothing is drawn, so no random stream moves and every burst keeps the dispersion it had; the only saved state is the phase `stoppage` with its `clearAt`, and `ckmFire.jams` (how many have
// struck; the key is absent until the first, so every older save loads as it was). A stoppage can only strike where a burst could start, from 04:46:00 to 06:09:30 (CKM_FIRE_FROM, CKM_CEASE_AT);
// one already under way clears by the clock (at most CKM_STOPPAGE_MAX_SEC later) or gives way to the abandon of the demolition. The two slots: burst 14 (about 04:58, the repair under the MG34s) and burst 45
// (about 05:54 to 06:01, the end of the hold, three bursts after the belt change of burst 42 so that 112 / 113 and 114 / 115 are two stories); both strike on the two golden routes (58 and 56 bursts).
export const CKM_STOPPAGES=Object.freeze([{after:13,sec:3.8},{after:44,sec:4.6}].map(s=>Object.freeze(s)));
const CKM_STOPPAGE_MAX_SEC=5,CKM_STOPPAGE_HOLD=1;   // the longest clearance a record may carry; the gun stays laid this long after clearing, so the burst it was about to fire follows at once
const CKM_PHASES=Object.freeze(['idle','aim','feed','fire_burst','stoppage']);   // the phases the gunner's machine drives; abandon and retreat belong to the demolition
const CKM_ENGAGE_SEC=10,CKM_SCAN_MAX=50,CKM_RESCAN_SEC=.5,CKM_AIM_SEC=1.2,CKM_HOLD_SEC=8,CKM_COOLDOWN=[3,7],CKM_TRIES=6;
// Suppressive area fire at ~1050 m, not aimed fire (game balance, not measured ballistics): the beaten zone floats CKM_AIM_UP over the chest aim of the
// German answered, with a burst-wide bias and a per-round cone in thousandths (makeRound). Most rounds only pass within NEAR_MISS (3 m) of a German and
// suppress him for CKM_SUPPRESS_SEC; few land on one (about 2-8 hits and 0-1 kills in a whole route of ~590 rounds, tools/verification/m01-t47-ckm-fire-audit.mjs).
// A hit uses the existing damage path; CKM_DAMAGE per part multiplier is a wound at this range (a head hit leaves 10 health), not a kill.
// CKM_SUPPRESS_SEC is the 1.5 s that a German near miss pins an ally who is not working (landRound), below Kowal's aimed 2 s: with 2.5 s the beaten zone, laid on the
// riflemen beside the gate MG, kept that MG down for up to 30 % of the repair on the route that ignores it (24 seeds; the limit is 20 %) and took the duel from the player
// (docs/verification/m01-runtime/ckm-fire-live-2026-10-16/T47_T38_INTERACTION.md).
const CKM_AIM_UP=2.8,CKM_BIAS=[1.6,.8],CKM_CONE=[2.2,1],CKM_DAMAGE=45,CKM_SUPPRESS_SEC=1.5;
// Own stream derived from the mission seed: the ckm never draws from this.rng, so every other actor keeps its draws. State: ckmFire.rng (saved).
const ckmSeed=seed=>Math.imul((seed>>>0)^0x7a30c0de,2654435761)>>>0;
const newCKMFire=seed=>({rng:ckmSeed(seed),belt:CKM_BELT,bursts:0,nextAt:0,engagedUntil:0});
const ckmNext=f=>{f.rng=(Math.imul(1664525,f.rng)+1013904223)>>>0;return f.rng/4294967296;};
const ckmGauss=f=>{let u=0;while(u<=1e-12)u=ckmNext(f);return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*ckmNext(f));};
// The quiet cycle of T36 (aim 6 s, feed 3 s, idle 9 s every 18 s of battle clock): what the crew does while nobody is engaged. Unchanged numerics.
const ckmQuiet=(battleClock,clock)=>{
  const elapsed=battleClock-CKM_FIRE_FROM,slot=Math.floor(elapsed/18),age=elapsed-slot*18;
  const phase=age<6?'aim':age<9?'feed':'idle';
  return {phase,startedAt:Math.max(0,clock-age+(phase==='feed'?6:phase==='idle'?9:0))};
};
// The strict test of phase 0b: the whole arc, not just the production obstacles, must stay clear of every live bridge collider (trusses, piers, decks).
export const ckmThroughBridge=(world,r)=>{
  const R=Math.max(1,Math.hypot(r.ax-r.ox,r.az-r.oz)),n=Math.max(4,Math.min(40,Math.ceil(R/40)));let prev=roundPoint(r,0);
  for(let i=1;i<=n;i++){
    const cur=roundPoint(r,i/n),len=Math.hypot(cur.x-prev.x,cur.y-prev.y,cur.z-prev.z);
    if(len>1e-6){const d={x:(cur.x-prev.x)/len,y:(cur.y-prev.y)/len,z:(cur.z-prev.z)/len};for(const b of world.colliders)if(rayBox(prev,d,b.min,b.max,len)!==null)return b.id;}
    prev=cur;
  }
  return null;
};
const makeCKMCrew=(world,clock=0,withdrawn=false,seed=0)=>CKM_IDS.map((id,i)=>{
  const [x,z]=CKM_POST[i];
  const point=withdrawn?ckmFinal(i):{x,z};
  return entity(id,{...point,y:withdrawn?world.heightAt(point.x,point.z):CKM_POSITION.y},'ally',{
    group:'grp_ckm_crew',role:i<2?'SUPPORT':'RIFLEMAN',facing:i===1?112*Math.PI/180:0,
    ckm:{phase:withdrawn?'retreat':'idle',startedAt:clock,visible:true},...(i===0?{ckmFire:newCKMFire(seed)}:{})});
});
// Lugares no abrigo de campanha (interior x −264…−256, z 66…75) para a chamada das 07:05.
const ROLL_CALL_SEATS=[[-262.8,73.6],[-261.2,73.9],[-259.6,73.9],[-258,73.6],[-263.2,71.6],[-256.9,71.6],[-262.9,69.6],[-257.1,69.6]];
// Trabalho dos sapadores sem supressão, em segundos de jogo: REPAIR_WORK_SEC = 150 (src/game/m01-sappers.js, com as etapas da operação). Com 75 s, a caixa entregue por volta das 04:42 deixava
// dois terços do reparo feitos antes do trem 963 (04:45) e nenhum fogo o podia interromper; com 150 s ele decorre sob fogo.
// Seconds a near miss keeps the working sappers down: a rifle round, and a round of an MG34 burst (the beaten zone of a machine gun pins a team longer than one shot).
const REPAIR_PIN_SEC=3.5,REPAIR_PIN_MG_SEC=5;
// Posições alemãs (grp_de_east.firePositions): as duas MG34 e 12 atiradores na faixa dos portões de Lisewo, entre as pontes, que é o
// que a cabeça de ponte oeste vê da margem leste por cima da água; os restantes no dique, atrás das treliças.
const FIRE_POSITIONS=definition.groups.find(g=>g.id==='grp_de_east').firePositions;
/**
 * T38 (M01-COMBAT-POSTURE-STAGING-V1): waiting positions in cover, as mission data. Gate riflemen de_east_2..13 at firePositions
 * fp_m01_riflemen_gates.positions [x, z, facing], kneeling (`crouched`) except riseBeforeSec before and holdAfterSec after a shot of their own;
 * the section behind the sandbags of the squad post (grp_squad.stage), crouched at its slot from stage.underFireFrom; the sappers at their
 * own places on the ignition line (grp_sappers.stage). Pure data, no RNG draw; validated when the module loads (a typo stops the game).
 */
export function combatStagePlan(def=definition){
  const fail=m=>{throw new Error(`M01 combat stage: ${m}`);},group=id=>def.groups.find(g=>g.id===id);
  const finite=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
  const gates=group('grp_de_east')?.firePositions?.find(f=>f.id==='fp_m01_riflemen_gates'),st=gates?.stage;
  if(!Array.isArray(gates?.positions)||gates.positions.length!==12||!gates.positions.every(p=>finite(p,3)))fail('fp_m01_riflemen_gates.positions: 12 x [x, z, facing]');
  if(st?.posture!=='crouch'||!(st.riseBeforeSec>=.1&&st.riseBeforeSec<=3)||!(st.holdAfterSec>=.1&&st.holdAfterSec<=3))fail('fp_m01_riflemen_gates.stage');
  const slots=(g,members)=>{const s=g?.stage?.slots;if(!s||typeof s!=='object')fail(`${g?.id}.stage.slots`);
    const ids=Object.keys(s);if(!ids.length||ids.some(id=>!members.includes(id)||!finite(s[id],3)))fail(`${g.id}.stage.slots: [x, z, facing] per cast member`);
    return Object.freeze(Object.fromEntries(ids.map(id=>[id,Object.freeze({x:s[id][0],z:s[id][1],facing:s[id][2]})])));};
  const cast=def.cast.map(c=>c.id),squad=group('grp_squad'),sappers=group('grp_sappers');
  if(squad?.stage?.posture!=='crouch'||def.events.find(e=>e.id===squad.stage.underFireFrom)?.trigger?.type!=='battleClock')fail('grp_squad.stage');
  const section=slots(squad,cast.filter(id=>id!=='jan_wrona'&&id!=='tadeusz_nowicki'&&!sappers.members.includes(id)&&def.cast.find(c=>c.id===id).role!=='CIVILIAN'));
  const crew=slots(sappers,sappers.members);if(Object.keys(crew).length!==sappers.members.length)fail('every sapper needs a slot');
  const rkm=squad.stage.rkm;
  if(!rkm||!section[rkm.actor]||!(rkm.riseBeforeSec>=.1&&rkm.riseBeforeSec<=2)||!(rkm.holdAfterSec>=.8&&rkm.holdAfterSec<=3))fail('grp_squad.stage.rkm: a staged gunner, rise 0.1-2 s, hold >= the 0.8 s burst');
  return Object.freeze({gates:Object.freeze({positions:Object.freeze(gates.positions.map(([x,z,facing])=>Object.freeze({x,z,facing}))),
    riseBeforeSec:st.riseBeforeSec,holdAfterSec:st.holdAfterSec}),
    squad:Object.freeze({underFireFrom:squad.stage.underFireFrom,slots:section,rkm:Object.freeze({actor:rkm.actor,riseBeforeSec:rkm.riseBeforeSec,holdAfterSec:rkm.holdAfterSec})}),sappers:crew});
}
const STAGE=combatStagePlan();
/**
 * R1-a (2026-10-23): the bomb that cuts the cable falls where the three sappers kneel (repair_site_1) and used to fall 1.6 m from the nearest of them. Nowicki arrives shouting that the planes are
 * coming (dlg_m01_066) and, from `from` (04:33:30), the sappers run for the sandbags of the section's post, 26 m or more from the crater, and come back to the cable `returnAfterSec` real
 * seconds after the bomb has fallen (evt_m01_nowicki_lost), always before `until`. The crater, the dented mug and the cut cable stay where the script has them. Pure data in mission.json
 * (grp_sappers.stage.shelter), validated when the module loads; the walk itself is a pure function of the clocks and of the saved event time (M01Simulation.sapperShelter).
 */
export function sapperShelterPlan(def=definition,world=new TczewWorld()){
  const fail=m=>{throw new Error(`M01 sapper shelter: ${m}`);},group=def.groups.find(g=>g.id==='grp_sappers'),sh=group?.stage?.shelter;
  const from=typeof sh?.from==='string'?seconds(sh.from):NaN,until=typeof sh?.until==='string'?seconds(sh.until):NaN,crater=world.point('repair_site_1');
  if(!(from>=seconds('04:33:00')&&from<seconds('04:34:00'))||!(until>seconds('04:34:30')&&until<=seconds('04:40:00'))||!(sh.returnAfterSec>=2&&sh.returnAfterSec<=20))
    fail('from before the bombing, until after it, return 2 to 20 s');
  const slots=Object.fromEntries(group.members.map(id=>{
    const s=sh.slots?.[id];if(!Array.isArray(s)||s.length!==3||!s.every(Number.isFinite))fail(`${id}: a slot [x, z, facing]`);
    if(Math.hypot(s[0]-crater.x,s[1]-crater.z)<26)fail(`${id}: the shelter is within 26 m of the crater`);
    return [id,Object.freeze({x:s[0],z:s[1],facing:s[2]})];}));
  return Object.freeze({from,until,returnAfterSec:sh.returnAfterSec,slots:Object.freeze(slots)});
}
const SHELTER=sapperShelterPlan();
const eastPosition=(i,world)=>{
  const mg=FIRE_POSITIONS.find(f=>f.actor===`de_east_${i}`);if(mg)return {x:mg.position[0],y:mg.position[1],z:mg.position[2]};
  // faixa dos portões, entre as pontes (vista da margem oeste); T38: lugares desencontrados contra o portal, no chão
  if(i<14){const {x,z}=STAGE.gates.positions[i-2];return {x,y:world.heightAt(x,z),z};}
  const k=i-14;return k<14?{x:1076+(k%4)*7,y:-1,z:-80+k*5}:{x:1076+(k%4)*6,y:-1,z:52+(k-14)*4};   // dique, atrás das treliças
};
const gateShooter=a=>Number(a.id.split('_').at(-1))<14;
// SP-08 (2026-10-22): the east bank's fire on the escort: [MG34, rifle, spread] seconds between a man's shots at Dudek (or at where he saw him last), and how long he keeps firing
// where he lost him (the dead ground of the road approach, x -100..-150, where nobody on the east bank sees the road).
const ESCORT_FIRE_SEC=[10,12,10],ESCORT_SEARCH_SEC=25;
/** T38: a gate rifleman of grp_de_east (not an MG34 gunner, not the dike). */
const gateRifleman=a=>a.group==='grp_de_east'&&a.weapon==='kar98k'&&gateShooter(a);
const MG34_IDS=['de_east_0','de_east_1'],MG34_TRANSITION_SEC=1.9,MG34_INTERVAL=.075;
const proneGunner=a=>MG34_IDS.includes(a.id);
/**
 * Combat AI, slice 1 (owner playtest P1; docs/direction/COD_WAW_WWII_BENCHMARK.md, «Combate e IA»). Replaces the flat per-shot cooldowns of grp_de_east
 * (uniform 9-18 s per rifle round, 6-13 s per MG34 burst) and Kowal's fixed 4 s rkm cycle with target-driven, jittered, reload-aware cycles:
 *   rifleman  PEEK of 1-3 aimed rounds (bolt and re-aim 1.7-2.8 s apart, the T38 rise/hold keeps him up through it), then COVER for a skewed draw around the
 *             old mean rate, never shorter than his clip reload; the player who fired in the last AI_THREAT_SEC is the target he prefers;
 *   MG34      a GROUP of 1-3 bursts on one target (0.45-1.35 s between them, 4-7 rounds by target), then a skewed pause; searching fire goes to where a
 *             threat was last seen, not to a fixed point; it holds while the loader changes the belt;
 *   suppressed (any source: the player, Kowal, the ckm) a man breaks his peek or group, stays down a drawn extra moment and is SHAKEN (wider aim) for a while;
 *   Kowal     2-5 round bursts from his 20-round magazine, quick when he answers a fresh flash, slower on the MG he is told to keep down.
 * Every draw comes from the man's own stream `ai.rng`, derived from the mission seed like the ckm stream (T47), never from this.rng: the target dispersion
 * of a shot still comes from this.rng as before. State: actor.ai (saved, validated; a save without it gets one on restore, derived from the saved seed).
 */
const AI_THREAT_SEC=8,AI_BOLT=[1.7,1.1],AI_RELOAD_COVER=4,AI_SHAKEN_SEC=4,AI_SHAKEN_BIAS=1.9,AI_RESCAN=[2.5,3];
const AI_KEYS=['rng','peek','shakenUntil','pinnedUntil','recover','target','seen'];
// ponytail: one LCG stream per man derived from the mission seed, the same scheme as the T47 ckm stream, so a man's choices never shift anyone else's draws.
const aiSeed=(seed,index)=>Math.imul(((seed>>>0)^0x41c0b1a7)+Math.imul(index+1,0x9e3779b9)|0,2654435761)>>>0;
const newAI=(seed,index,pinnedUntil=0)=>({rng:aiSeed(seed,index),peek:0,shakenUntil:0,pinnedUntil,recover:0,target:null,seen:null});
const aiNext=ai=>{ai.rng=(Math.imul(1664525,ai.rng)+1013904223)>>>0;return ai.rng/4294967296;};
const aiGauss=ai=>{let u=0;while(u<=1e-12)u=aiNext(ai);return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*aiNext(ai));};
/** Skewed pause around `mean` (lognormal, sd 0.5 in log space, mean preserved), clamped to [lo, 3 x mean]. */
// The 05:35 fill (2026-10-19): the weight of the player on the road deck for a dike rifleman, against the east bridgehead block (1) before 06:00 and the withdrawing
// platoon (2.3) after it. Measured on the control route (tools/verification/m01-combat-ai-metrics.mjs): longest stretch without contact 131.5 s -> see DEVELOPMENT_STATUS.
const DIKE_DECK_PLAYER_WEIGHT=1;
const aiPause=(ai,mean,lo)=>Math.min(3*mean,Math.max(lo,mean*Math.exp(.5*aiGauss(ai)-.125)));
/** 1, 2 or 3 with weights w (the length of a peek or of a burst group). */
const aiCount=(ai,w)=>{const u=aiNext(ai)*(w[0]+w[1]+w[2]);return u<w[0]?1:u<w[0]+w[1]?2:3;};
// Combat slice 2 (deck assault): the men of grp_de_spans get their record when they enter the deck (evt_m01_germans_on_east_spans), derived from the main state of that
// tick, never at reset and never by the restore migration, so a save made before the entry has none and gets none (AI_MIGRATE).
const AI_MIGRATE=a=>a.group==='grp_de_east'||a.id==='szymon_kowal';
// Combat slice 2b: a man of the Polish rearguard gets his record the tick it forms (formRearguard), never at reset or by the restore migration.
const AI_ACTOR=a=>AI_MIGRATE(a)||a.group==='grp_de_spans'||(a.rear!==undefined&&rearguardIndex(a)>=0);
// ponytail: the state machine is implicit in existing fields (cooldown = time to the next trigger, suppressedUntil, reload, the T38 rise/hold posture rule); actor.ai
// only adds what those cannot hold (the open peek/group, the stream, the suppression episode). No movement between cover nodes yet (slice 2), no callout events.
const aiIndex=id=>id==='szymon_kowal'?40:id.startsWith('de_spans_')?41+Number(id.slice(9)):id.startsWith('pl_east_')?51+Number(id.slice(8)):Number(id.slice(8));
const fixedMG34=a=>a.alive&&a.active&&!['ADVANCE','RETREAT','WOUNDED','DOWN','reached_safety'].includes(a.state)&&
  !(a.target&&dist(a,a.target)>=.8);
const canMG34Fire=a=>!proneGunner(a)||(fixedMG34(a)&&['idle','aim','reload'].includes(a.mg34Prone?.phase));
// T23, the east front made visible (RECONSTRUCTED data in grp_east_platoon). From hold.from to hold.until the platoon stands on the end of the
// road deck instead of staying off stage; six reserve men fall at the fixed battle-clock times of `attrition`, shot by a rifleman of the dike
// or the gates. Validated when the module loads, so a typo in the data stops the game instead of changing it.
export function eastFrontPlan(def=definition){
  const fail=m=>{throw new Error(`M01 east front: ${m}`);},group=def.groups.find(g=>g.id==='grp_east_platoon'),hold=group?.hold,slots=hold?.slots,list=group?.attrition;
  const at=id=>{const t=def.events.find(e=>e.id===id)?.trigger;if(t?.type!=='battleClock')fail(`${id} must be a battleClock event`);return seconds(t.at);};
  if(!hold||at(hold.from)>=at(hold.until))fail('hold needs from before until');
  // T38: explicit staggered slots [x, z] (no grid, no row); one per man, distinct, at least 1.2 m apart; the platoon waits crouched (hold.stage).
  if(!Array.isArray(slots)||slots.length!==group.startSize||!slots.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))fail('hold.slots needs one [x, z] per man');
  if(slots.some((p,i)=>slots.some((q,j)=>j>i&&Math.hypot(p[0]-q[0],p[1]-q[1])<1.2)))fail('hold.slots closer than 1.2 m');
  if(hold.stage?.posture!=='crouch')fail('hold.stage.posture must be crouch');
  if(!Array.isArray(list)||!list.length)fail('attrition must list the casualties');
  const entries=list.map(e=>typeof e?.at==='string'&&typeof e.cutoff==='string'?{victim:e.victim,at:seconds(e.at),cutoff:seconds(e.cutoff)}:fail('attrition entry needs at and cutoff'));
  entries.forEach((e,i)=>{
    if(!ATTRITION_VICTIM.test(e.victim)||entries.findIndex(o=>o.victim===e.victim)!==i)fail(`victim ${e.victim}`);
    // The cutoff leaves the flight time (3 s) before the withdrawal, so a round fired in time lands before the rule of 06:00 takes over.
    if(!(e.at>=at(hold.from)&&e.at<e.cutoff&&e.cutoff<=at(hold.until)-3)||(i&&e.at<=entries[i-1].at))fail(`times of ${e.victim}`);
  });
  return {hold:{from:hold.from,until:hold.until},slots:slots.map(([x,z])=>({x,z})),attrition:entries};
}
const EAST_FRONT=eastFrontPlan(),SLOTS=EAST_FRONT.slots;
const holdSlot=i=>({x:SLOTS[i].x,y:0,z:SLOTS[i].z});
// The block the east rifles aim at: the slots' bounds plus one metre in x and 0.2 m in z around them (two z bands of equal height), as in T23.
const BLOCK=(([x0,x1,z0,z1])=>({x:x0-1,w:x1-x0+2,z:z0-.2,h:z1-z0+.4}))([Math.min(...SLOTS.map(p=>p.x)),Math.max(...SLOTS.map(p=>p.x)),
  Math.min(...SLOTS.map(p=>p.z)),Math.max(...SLOTS.map(p=>p.z))]);

// T25 estimates for gameplay, not historical impact locations. H16 chooses fixed battle-clock times; no gameplay RNG draw.
const RAID_ID=/^raid_0530(?:_[1-5])?$/;
export function raidPlan(def=definition,world=new TczewWorld()){
  const fail=m=>{throw new Error(`M01 raid: ${m}`);},event=def.events.find(e=>e.id===E('bombing_0530'));
  const targets=def.raidTargets;if(!Array.isArray(targets)||targets.length!==6)fail('six targets required');
  const from=seconds(event.window.from),to=seconds(event.window.to),bounds=world.layout.bounds.playable;
  return targets.map((t,i)=>{
    const id=`raid_0530${i?'_'+i:''}`,at=typeof t?.at==='string'?seconds(t.at):NaN;
    if(t?.id!==id||!Number.isFinite(at)||at<from||at>=to||(i&&at<=seconds(targets[i-1].at))||(!i&&at!==from))fail('IDs/times');
    if(!Array.isArray(t.position)||t.position.length!==2||!t.position.every(Number.isFinite))fail('position');
    const [x,z]=t.position;
    // A 70 m envelope also covers safeImpact's maximum displacement (30 m approach + 40 m replacement).
    if(x>bounds.minX-100)fail('west safety envelope');
    return {id,at,point:{x,y:world.heightAt(x,z),z}};
  });
}
const RAID_PLAN=raidPlan();

// The 04:34 raid felt in the playable area (R1-a, 2026-10-23; golden amendment 16). The three scripted Stuka bombs of 04:34 (station_bomb, forward_post, repair_crater) are followed by this fixed
// schedule of further aerial impacts, in mission.json `raidTargets0434`, until 04:44 (the raid lasted about ten minutes, 04:34-04:44: HISTORICAL_RESEARCH.md, low certainty). The positions are
// GAMEPLAY_DRAMATIZATION along the west bank: the bridge approaches, the south slope of the rail embankment (the ignition line) and the station area. Fixed battle-clock times, no draw from any
// random stream. Every impact still passes safeImpact (never within 30 m of the player) and is kept clear of the places the objectives use (EARLY_RAID_CLEAR), so a crater never lies on the
// repair site, the rally point or the crate's shed. Saved like the 05:30 schedule: timers.raidSchedule0434, created when evt_m01_bombing_0434 is consumed, absent in older saves (which get no
// retroactive impacts).
const EARLY_RAID_ID=/^raid_0434_[1-9]\d?$/,EARLY_RAID_CLEAR=Object.freeze(['repair_site_2','rally_point','rail_hut','firing_point','shelter','aid_position','squad_post']),EARLY_RAID_CLEAR_M=20;
const earlyRaidKeep=(world=new TczewWorld())=>EARLY_RAID_CLEAR.map(id=>world.point(id));
export function earlyRaidPlan(def=definition,world=new TczewWorld()){
  const fail=m=>{throw new Error(`M01 early raid: ${m}`);},targets=def.raidTargets0434;
  if(!Array.isArray(targets)||targets.length<6||targets.length>12)fail('6 to 12 targets required');
  // After the last scripted impact of 04:34 (repair_crater, 5 s after the event at 3.5x = 04:34:17.5) and before the German arrival at 04:45.
  const from=seconds('04:34:20'),to=seconds('04:44:00'),b=world.layout.bounds.playable,keep=earlyRaidKeep(world);
  return targets.map((t,i)=>{
    const id=`raid_0434_${i+1}`,at=typeof t?.at==='string'?seconds(t.at):NaN;
    if(t?.id!==id||!EARLY_RAID_ID.test(id)||!Number.isFinite(at)||at<from||at>=to||(i&&at<=seconds(targets[i-1].at)))fail('IDs/times');
    if(!Array.isArray(t.position)||t.position.length!==2||!t.position.every(Number.isFinite))fail('position');
    const [x,z]=t.position;
    if(!(x>=b.minX+10&&x<=b.maxX&&z>=b.minZ+10&&z<=b.maxZ-10))fail(`${id} outside the playable area`);
    // An impact only moves by safeImpact (30 m approach + 40 m replacement = 70 m), so a point clear of the objectives' places by 20 m stays clear of them unless the player stands within 30 m.
    if(keep.some(k=>Math.hypot(x-k.x,z-k.z)<EARLY_RAID_CLEAR_M))fail(`${id} too close to an objective`);
    if(t.certainty!=='GAMEPLAY_DRAMATIZATION')fail('certainty');
    return {id,at,point:{x,y:world.heightAt(x,z),z}};
  });
}
const RAID0434_PLAN=earlyRaidPlan(),EARLY_RAID_KEEP=earlyRaidKeep();
// The unnamed garrison of the west bridgehead (m01-garrison.js, mission.json westGarrison): standing where the 04:34 bombs fall. Kept clear of the places of the objectives and of the cable camp.
const GARRISON_PLAN=(world=>garrisonPlan(definition,world,[...EARLY_RAID_KEEP,world.point('repair_site_1')]))(new TczewWorld());
export const GARRISON_IDS=Object.freeze(GARRISON_PLAN.map(p=>p.id));
// Who a bomb may never kill or wound (only shake): the whole cast, by id (m01-blast.js blastProtection).
const BLAST_CAST=castIds(definition);

// T48 (BX-09), the Germans after the east demolition. Roadmap schedule, in battle clock: no German shot from 06:10 to 06:11 (60 s), regrouped by 06:12.
// A man's march to the close-up knot is a pure function of the battle clock (fallBack), so 06:12 holds at any time scale and tick length.
const GERMAN_SILENCE_FROM=seconds('06:10:00'),GERMAN_SILENCE_UNTIL=seconds('06:11:00'),GERMAN_REGROUP_AT=seconds('06:12:00');
// The knot forms REGROUP_AHEAD metres east of the westmost survivor (carriers then walk at ~1.2 m/s over the 14 s of play until 06:12), at most at x 1080, the
// old retreat's destination. GERMAN_FELLED is the number of men of the spans the east demolition kills, GERMAN_CARRIED how many of them are lifted.
const REGROUP_AHEAD=17,REGROUP_EAST_END=1080,REGROUP_Z=40.2,GERMAN_FELLED=4,GERMAN_CARRIED=2;
// Combat slice 2: the spare clips of the section at its deck post (see updateObjectives). Gameplay tuning, not a documented load.
// The box holds DECK_AMMO_POOL rounds: a player who keeps firing at the deck for the whole fight (the golden support pilot, about 0.55 rounds/s for ~250 s) does not run dry.
export const DECK_AMMO_POOL=120,DECK_AMMO_LOW=15,DECK_AMMO_SEC=3;
// Combat slice 2: how far along the player's ray, from where his round lands or ends, a man of the deck assault is still pinned by its near miss (see fire()).
const DECK_SUPPRESS_ALONG_M=25;
// R2-b: the most grenades in the air at once (the player's two and the stick grenades of the assault: perMan x six men, one for the squad every gapSec) and in a save.
const DECK_GRENADES_MAX=8;
// Combat slice 2 (2026-10-19 review fix): seconds of gate hold, past DECK_ASSAULT.maxSec, after which a man of the assault still west of clearX is placed on his fall-back
// place even in the player's view (the absolute bound of the 06:09:30 hold).
const DECK_HOLD_CAP_SEC=240;
const REGROUP_SLOTS=[[0,0],[-1.8,1.1],[-1.8,-1.1],[1.8,1.1],[1.8,-1.1],[0,2.2]];   // metres east/south of the knot centre, westmost survivor first

export class M01Simulation {
  // H9 D1: the level is stored before reset() because reset() ends with a snapshot. Nothing reads it yet; reset() keeps whatever level the instance has.
  constructor(seed=19390901,{difficulty=M01_DIFFICULTY_SIM_DEFAULT}={}){
    if(!M01_DIFFICULTY_IDS.includes(difficulty))throw new RangeError('Dificuldade M01 desconhecida: '+String(difficulty));
    this.difficulty=difficulty;this.reset(seed);
  }
  reset(seed=19390901){
    this.missionId=definition.id;this.definition=definition;this.rng=new Random(seed);this.world=new TczewWorld();this.navigator=simulationNavigator(this.world);
    this.navPlanAt=-1;this.navPlans=0;   // the tick (clock) of the last route() and how many that tick has had: NAV.routesPerTick (not saved: a tick starts from the saved clock)
    this.clock=0;this.battleClock=seconds(definition.clock.start);this.events=[];this.consumed={};this.objectives={};
    definition.objectives.forEach(o=>{this.objectives[o.id]={state:'locked',progress:0};});
    this.flags={'m01.completed':false,'m01.nowicki_status':'present','m01.bak_status':'unhurt','m01.dudek_status':'unhurt',
      'm01.east_platoon_survivors':18,'m01.second_raid_state':'pending','m01.forward_post_state':'pending'};
    this.destruction=[];this.dialogueConsumed=[];this.dialogueQueue=[];this.subtitle=null;this.sceneDone=[];this.scene=null;
    this.checkpointsReached=[];this.pendingCheckpoint=null;this.gate=null;this.recoveries=[];this.failure=null;
    this.player=entity('jan_wrona',{x:-66,y:-3,z:22},'player',{angle:0,pitch:0,radius:.36,
      aiming:false,moveBlend:0,sprinting:false,weaponShotAt:-1e9,carrying:null,headgear:'pl_rogatywka_wz37'});
    this.weapon=new Wz29();this.grenades={ammo:2,active:[],nextId:0};this.projectileTraces=[];
    // T38: the section and the sappers start on their staged slots (grp_squad.stage / grp_sappers.stage), on the ground, with their own facing.
    const staged=id=>{const s=STAGE.squad.slots[id]??STAGE.sappers[id];return s&&{x:s.x,y:this.world.heightAt(s.x,s.z),z:s.z};};
    this.actors=ACTOR_CAST.map((c,i)=>entity(c.id,
      c.id==='tadeusz_nowicki'?{x:17,y:0,z:3}:c.id===STATION_PATIENT?STATION_YARD:staged(c.id)??(c.role==='ENGINEER'?{x:-42-i*.6,y:-2,z:10}:
      c.role==='MEDIC'?this.world.point('aid_position'):{x:-76-i*1.6,y:-3,z:24+i%3*2}),'ally',{role:c.role,essential:Boolean(c.essential),civilian:c.role==='CIVILIAN',
      ...(c.id==='szymon_kowal'?{rounds:20}:{}),...(staged(c.id)?{facing:(STAGE.squad.slots[c.id]??STAGE.sappers[c.id]).facing}:{})}));   // Kowal: carregador de 20 da rkm wz.28
    this.actor('szymon_kowal').ai=newAI(seed,aiIndex('szymon_kowal'));
    for(let i=0;i<40;i++)this.actors.push(entity(`de_east_${i}`,eastPosition(i,this.world),'enemy',
      {group:'grp_de_east',weapon:i<2?'mg34':'kar98k',active:false,cooldown:1+i*.37%9,role:i<2?'SUPPORT':'RIFLEMAN',firedAt:-1e9,ai:newAI(seed,i),
        ...(i>=2&&i<14?{facing:STAGE.gates.positions[i-2].facing}:{})}));   // T38: the gate riflemen face the west bank
    // Pela metade sul do tabuleiro; o pelotão recua em fila junto à treliça norte.
    for(let i=0;i<10;i++)this.actors.push(entity(`de_spans_${i}`,{x:1050+i*3,y:0,z:39.6+i%3*1.1},'enemy',
      {group:'grp_de_spans',weapon:'kar98k',active:false,firedAt:-1e9}));
    for(let i=0;i<24;i++)this.actors.push(entity(`pl_east_${i}`,holdSlot(i),'ally',
      {group:'grp_east_platoon',active:false,role:'RIFLEMAN'}));
    this.actors.push(...makeCKMCrew(this.world,0,false,seed));
    this.actors.push(...makeAuxiliaries(entity,this.world,this.actors));
    this.actors.push(...makeGarrison(entity,this.world,GARRISON_PLAN));
    for(const a of this.actors)initializePresentation(a,this.clock);
    this.timers={boundary:0,water:0,cover:0,repairStall:0,repairSuppressedUntil:0,withdrawalCasualty:seconds('06:00:00'),
      ambient:0,nextCoverCall:40,guide:0,guideKey:null,guideAt:0,guideDist:0,guideShown:false,kowalRounds:this.level.kowalRounds,lowAmmoHint:false,escort:false,escortSpoke:false,boundaryWarning:false,boundaryCountdown:0,holdAccessVisited:false,
      occupiedCover:null,coverExposure:0,coverCallIndex:0,repairPins:0,fireEase:false,calloutAt:-1e9,nextCombatCall:0};
    this.enemyFire={rounds:[],nextId:0};
    this.display=createDisplayFire(displaySeed(this.rng.state),displayProfiles(definition,{actors:this.actors}));   // visual-only rounds: never saved, own RNG (m01-display-fire.js)
    this.sectors={sectors:definition.sectors.map(s=>({id:s.id,state:s.schedule[0].state,strength:100,morale:1,supply:1})),damage:[]};
    this.mission={phase:'INTRO',complete:false,text:phaseText.INTRO,status:''};
    this.consume(E('intro_card'));this.startScene('cs_m01_intro');this.checkpoint=this.snapshot(false);
    this.navigator.prewarm();   // after the events above moved the world's revision: the first plan finds the solid list already made
  }
  actor(id){return this.actors.find(a=>a.id===id);}
  get enemies(){return this.actors.filter(a=>a.team==='enemy'&&!a.displayOnly);}
  get allies(){return this.actors.filter(a=>a.team==='ally'&&!a.displayOnly);}
  get combatants(){return this.actors.filter(a=>!a.displayOnly);}
  emit(event){this.events.push(validateM01AudioEvent(event));barkEvent(this,event);}   // reactive dialogue (m01-barks.js): the director reads the event, it writes only dialogue state
  drainEvents(){const events=this.events;this.events=[];return events;}
  consumedEvent(id){return Object.hasOwn(this.consumed,id);}
  active(name){return this.objectives[O(name)]?.state==='active';}
  done(name){return this.objectives[O(name)]?.state==='done';}
  activate(name){const o=this.objectives[O(name)];if(o.state==='locked')o.state='active';}
  finish(name){const o=this.objectives[O(name)];if(o.state==='done')return;o.state='done';o.progress=100;}
  /**
   * Says a line: queues its subtitle. A scripted line (every line without a `bark` rule) keeps the old FIFO and is never dropped, cut or jumped. A reactive line (a `bark` rule,
   * src/game/m01-barks.js) is ordered by its priority (1 is the most urgent) among the reactive ones, waits behind every scripted line, and lives only `barks.ttlSec` in the queue
   * (advanceSubtitle); at most `barks.voices` lines are on screen and waiting together, so a reactive line is dropped unless it is more urgent than one it can replace.
   * Returns true when the line was queued, false when it was not (already said under this token, unknown, no room). The director is told what was said, for «tocou há N s»:
   * a scripted line when it is queued (it is always shown), a reactive one when it goes on screen (barkShown; review N1, 2026-10-19: a reactive line dropped by its time to live or
   * by a more urgent one was never said, so it spends no `max`, no cooldown and no budget, and its token is given back). Until then it carries `queuedAt` and its `token`.
   */
  line(id,token=id){
    if(this.dialogueConsumed.includes(token))return false;
    const line=BARK_LINES.get(id);if(!line)return false;
    const rule=BARK_RULES.get(id),count=['doze','treze','catorze','quinze','dezasseis','dezassete','dezoito'][this.flags['m01.east_platoon_survivors']-12];
    const record={id,speaker:definition.cast.find(c=>c.id===line.speaker)?.name??'Soldado',
      text:line.text.replaceAll('{n}',count),duration:Math.max(2.5,Math.min(6,line.text.length/24))};
    const queue=this.dialogueQueue;
    let at=queue.length;
    if(rule){
      if(!this.makeRoom(rule.priority))return false;
      Object.assign(record,{priority:rule.priority,bark:true,expires:this.clock+BARK_CONFIG.ttlSec[rule.priority],queuedAt:this.clock,token});
      at=queue.length;while(at>0&&queue[at-1].bark&&queue[at-1].priority>rule.priority)at--;
    }else while(at>0&&queue[at-1].bark)at--;
    this.dialogueConsumed.push(token);
    queue.splice(at,0,record);
    if(!rule)noteSpoken(this,id);
    return true;
  }
  /** A reactive line leaves the queue unseen (its time to live, a more urgent line, a skipped scene): its token is given back, and the HUD message it stood for, if any, is shown. */
  dropBark(record,{fallback=true}={}){
    if(record.queuedAt===undefined)return;   // a line of an older save: it was counted when it was queued, as then
    const i=this.dialogueConsumed.indexOf(record.token);if(i>=0)this.dialogueConsumed.splice(i,1);
    if(fallback&&record.fallback)this.message(record.fallback);
  }
  /** Room for one more reactive line of this priority: fewer than `barks.voices` lines on screen and waiting, or a waiting reactive line less urgent than it (which it replaces), or a reactive line on screen that it may cut (advanceSubtitle). */
  makeRoom(priority){
    const queue=this.dialogueQueue,last=queue[queue.length-1],shown=this.subtitle;
    if((shown?1:0)+queue.length<BARK_CONFIG.voices)return true;
    if(last?.bark&&last.priority>priority){this.dropBark(queue.pop());return true;}
    return Boolean(shown?.bark&&shown.priority-priority>=BARK_CUT_STEP&&this.clock-(shown.until-shown.duration)>=BARK_CONFIG.cutAfterSec);
  }
  /**
   * The end of every tick: the line on screen ends at its time, or is cut (the head of the queue is a scripted line, or a reactive one at least BARK_CUT_STEP priorities more urgent: a
   * danger call over an ambient remark; and the reactive line on screen has been up for `barks.cutAfterSec`); a reactive line that waited past its time to live is dropped; the head of the queue goes on screen. One subtitle at a time: nobody talks over anybody.
   */
  advanceSubtitle(){
    const queue=this.dialogueQueue;let shown=this.subtitle;
    if(shown&&this.clock>=shown.until)shown=this.subtitle=null;
    if(shown?.bark&&queue.length&&(!queue[0].bark||shown.priority-queue[0].priority>=BARK_CUT_STEP)&&this.clock-(shown.until-shown.duration)>=BARK_CONFIG.cutAfterSec)shown=this.subtitle=null;
    while(queue.length&&queue[0].expires!==undefined&&this.clock>queue[0].expires)this.dropBark(queue.shift());
    if(!shown&&queue.length){this.subtitle=queue.shift();this.subtitle.until=this.clock+this.subtitle.duration;if(this.subtitle.queuedAt!==undefined)barkShown(this,this.subtitle);}
  }
  message(message){this.emit({type:'message',message});}
  startScene(id){if(this.sceneDone.includes(id))return;this.scene={id,elapsed:0,beats:[]};}
  endScene(){
    if(!this.scene)return;const id=this.scene.id;this.sceneDone.push(id);this.scene=null;
    if(id==='cs_m01_intro'){this.battleClock=Math.max(this.battleClock,seconds('04:30:44'));this.consume(E('prelude_start'));this.saveCheckpoint('cp_m01_a_orientacao');}
    if(id==='cs_m01_roll_call')this.consume(E('debrief'));
  }
  updateScene(dt,skip){
    if(!this.scene)return;
    const data=definition.cutscenes.find(c=>c.id===this.scene.id);
    if(skip&&data.skippable){
      data.timeline.forEach((b,i)=>{const token=`${data.id}:${i}:${b.line}`;if(b.line&&!this.dialogueConsumed.includes(token))this.dialogueConsumed.push(token);});
      for(const q of this.dialogueQueue)this.dropBark(q,{fallback:false});
      this.dialogueQueue=[];this.subtitle=null;this.endScene();return;
    }
    this.scene.elapsed+=dt;
    data.timeline.forEach((beat,i)=>{
      if(beat.preRollOnly)return; // Keep original index slots so legacy mid-scene saves stay valid, without replaying pre-roll.
      if(beat.t>this.scene.elapsed||this.scene.beats.includes(i))return;
      this.scene.beats.push(i);
      let line=beat.line;
      for(const [condition,value]of Object.entries(beat.lineVariants??{})){
        const [key,expected]=condition.split('=');if(this.flags[key]===expected)line=value;
      }
      if(line)this.line(line,`${data.id}:${i}:${line}`);
    });
    const end=data.id==='cs_m01_intro'?44:data.id==='cs_m01_roll_call'?60:data.maxDurationSec;
    if(this.scene?.elapsed>=end)this.endScene();
  }
  updatePreRoll(){
    for(const scene of definition.cutscenes){const pre=scene.preRoll;if(!pre||this.consumedEvent(pre.event))continue;
      const event=definition.events.find(e=>e.id===pre.event),at=seconds(event.trigger.at),elapsed=this.battleClock-(at-pre.duration);
      if(elapsed<0||elapsed>pre.duration||!this.readiness(pre.event))continue;
      pre.timeline.forEach((beat,i)=>{if(elapsed<beat.t)return;const token=`${scene.id}:pre:${i}`;
        if(beat.line){this.line(beat.line);return;}
        if(this.dialogueConsumed.includes(token))return;
        // SP-08 (2026-10-22): a beat with `near` happens only with that man within its distance of the player (Zieliński lowers Jan's head: ≤ 3 m), and may wait for him in the window.
        if(beat.near){const who=this.actor(beat.near.of);if(!who?.alive||!who.active||dist(who,this.player)>beat.near.m)return;}
        this.dialogueConsumed.push(token);this.message(beat.action);
      });
    }
  }
  updateContinuity(){
    if(this.scene?.id==='cs_m01_intro'||this.mission.phase==='OUTRO')return;
    for(const cue of definition.continuityCues){const from=seconds(cue.from),until=seconds(cue.until);
      if(this.battleClock<from||this.battleClock>=until)continue;
      const slot=Math.floor((this.battleClock-from)/cue.intervalSec),token=`continuity:${cue.kind}:${slot}`;
      if(this.dialogueConsumed.includes(token))continue;this.dialogueConsumed.push(token);
      // P2: a slot that falls outside its objective or too soon after the last cue is spent silently (a compressed clock crosses slots in seconds).
      if(!continuityAllowed(this,cue))continue;this.timers.continuityAt=this.clock;
      const progress=this.objectives[O('cover_repair')].progress;
      const text=cue.kind==='repair'&&this.active('cover_repair')?`${cue.text} Reparo: ${Math.floor(progress)}%.`:
        cue.kind==='withdrawal'?`${cue.text} ${this.flags['m01.east_platoon_survivors']} homens no pelotão.`:cue.text;
      this.emit({type:'message',message:text,continuity:{kind:cue.kind,slot,battleClock:this.battleClock}});
    }
    // Finite delivery milestones remain legible in real time while the existing west gate holds battleClock.
    const bak=this.actor('jozef_bak');
    if(this.gate?.id===E('west_demolition')&&(bak.carry||bak.carriedBy)&&corridorRecord(this)?.phase!=='escort'){   // SP-08: in the escort the status line counts the metres
      const remaining=dist(bak,EVACUATION),metres=[360,300,240,180,120,60,30,10].findLast(limit=>remaining<=limit),token=`continuity:bak_delivery_hold:${metres}`;
      if(metres!==undefined&&!this.dialogueConsumed.includes(token)){
        this.dialogueConsumed.push(token);this.emit({type:'message',message:`Dudek leva Bąk para a estação. Corredor livre; faltam cerca de ${Math.ceil(remaining)} metros.`,continuity:{kind:'bak_delivery_hold',slot:metres,battleClock:this.battleClock}});
      }
    }
    if(this.consumedEvent(E('panzerzug_arrives'))&&this.inView({x:1119,y:0,z:2.5}))this.line('dlg_m01_038');
    // SP-08 (2026-10-22): 047 and 048 when the count starts, 049 when it is complete (src/game/m01-corridor.js, from updateObjectives).
  }
  trigger(t){
    if(t.type==='missionStart')return true;
    if(t.type==='battleClock')return this.battleClock+1e-6>=seconds(t.at);
    if(t.type==='cutsceneComplete')return this.sceneDone.includes(t.cutscene);
    if(t.type==='eventComplete')return this.consumedEvent(t.event)&&this.clock-this.consumed[t.event]>=(t.delaySec??0);
    if(t.type==='objectiveComplete')return this.objectives[t.objective]?.state==='done';
    if(t.type==='objectiveState')return this.objectives[t.objective]?.state===t.state;
    if(t.type==='objectiveProgress')return this.objectives[t.objective]?.progress>=t.value;
    if(t.type==='actorInArea')return inside(this.actor(t.actor),t.area);
    if(t.type==='any')return t.of.some(c=>this.trigger(c));
    if(t.type==='all')return t.of.every(c=>this.trigger(c));
    throw new Error(`Gatilho M01 sem handler: ${t.type}`);
  }
  readiness(id){
    if(id===E('repair_complete'))return this.objectives[O('cover_repair')].progress>=100;
    // Combat slice 2: and nobody of the deck assault alive west of clearX, so the spans that fall (06-07, x 663-877) leave no German on the Polish side.
    if(id===E('east_demolition'))return this.done('hold_access')&&this.actors.filter(a=>a.alive&&a.active&&a.group==='grp_east_platoon').every(a=>a.x<660)&&this.player.x<660&&this.deckClear();
    // ponytail: P2 keeps the approved B4 rule (the charge waits for Bąk's delivery at the station, tests/m01-partials-correction-01.test.js); releasing it at
    // x < WEST_SAFE_X would save ~2 min at the firing point but needs a human decision (docs/direction/COD_WAW_WWII_BENCHMARK.md).
    if(id===E('west_demolition')){const bak=this.actor('jozef_bak');return this.consumedEvent(E('east_demolition'))&&this.player.x<WEST_SAFE_X&&this.actors.filter(a=>a.alive&&a.active&&a.team==='ally'&&!a.civilian&&!a.displayOnly).every(a=>a.x<WEST_SAFE_X)&&!bak.carry&&!bak.carriedBy;}
    if(id===E('dudek_retrieves_bak'))return this.player.carrying!=='jozef_bak';
    if(id===E('roll_call'))return this.scene?.id!=='cs_m01_west_blast';
    return true;
  }
  advanceBattle(dt){
    const segment=definition.clock.segments.find(s=>this.battleClock>=seconds(s.from)&&this.battleClock<seconds(s.to));
    if(!segment)return;
    // readyScale: com o gate já pronto (ex.: reparo concluído), encurta a espera sem tarefa até à hora seguinte.
    let scale=segment.gate&&segment.readyScale&&this.readiness(segment.gate)?segment.readyScale:segment.scale;
    // P2 (compress): the player has done what this stretch needs; the clock runs faster up to compress.to, never past it. Event times are unchanged.
    const compress=activeCompression(this,segment);if(compress)scale=Math.max(scale,compress.scale);
    let next=this.battleClock+dt*scale;if(compress)next=Math.min(next,seconds(compress.to));
    if(segment.gate&&!this.readiness(segment.gate)){
      const at=seconds(segment.to);
      if(at-this.battleClock<=60)scale=1;
      next=Math.min(this.battleClock+dt*scale,at-30);if(compress)next=Math.min(next,seconds(compress.to));
      if(this.battleClock>=at-30){
        if(this.gate?.id!==segment.gate)this.gate={id:segment.gate,started:this.clock,hold:0};
        this.gate.hold=this.clock-this.gate.started;
        if(segment.gate===E('east_demolition')&&this.gate.hold>90)for(const a of this.actors.filter(a=>a.group==='grp_east_platoon'&&a.active&&a.alive&&a.x>=660)){
          const inView=this.inView(a);
          if(!inView){a.x=655;a.state='reached_safety';this.recoveries.push({id:a.id,reason:'offscreen_straggler',clock:this.clock});}
        }
        // Combat slice 2: the deck assault always falls back by DECK_ASSAULT.maxSec (R2-b: plus closeExtraSec while a man is on a closing line, and the longer run back from there: holdBaseSec); a man still west of clearX long after that (a route the navigator could not walk) is
        // placed on his fall-back place when the player cannot see him, as the platoon's offscreen stragglers above. Measured: never on the audited routes.
        // 2026-10-19 review fix: and after DECK_HOLD_CAP_SEC of hold he is placed even in view, so the clock held at 06:09:30 always resumes (a stuck man in sight held it for good).
        if(segment.gate===E('east_demolition')&&this.gate.hold>DECK_ASSAULT.holdBaseSec+120)for(const a of this.actors.filter(a=>a.group==='grp_de_spans'&&a.deck&&a.alive&&a.active&&deckRole(a)==='assault'&&a.x<DECK_ASSAULT.clearX)){
          const cap=this.gate.hold>DECK_ASSAULT.holdBaseSec+DECK_HOLD_CAP_SEC;if(!cap&&this.inView(a))continue;const f=DECK_ASSAULT.fallback[assaultIndex(a)];
          Object.assign(a,{x:f.x,z:f.z,state:'GUARD',facing:Math.PI});a.y=this.world.heightAt(a.x,a.z);delete a.nav;Object.assign(a.deck,{phase:'clear',since:this.clock,until:this.clock});
          this.recoveries.push({id:a.id,reason:cap?'deck_hold_cap':'offscreen_deck_straggler',clock:this.clock});
        }
        if(segment.gate===E('west_demolition')&&this.gate.hold>120&&this.player.x>=-90&&!this.timers.escort){this.timers.escort=true;this.message('Zieliński vem buscá-lo. A demolição espera pela saída da secção.');}
      }
    }else this.gate=null;
    this.battleClock=Math.max(this.battleClock,Math.min(next,seconds(segment.to)));
  }
  inView(a){const angle=Math.atan2(a.z-this.player.z,a.x-this.player.x)-this.player.angle;
    return Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<Math.PI/3&&this.world.lineOfSight(this.player,a);}
  consume(id){
    if(this.consumedEvent(id))return false;
    this.consumed[id]=this.clock;
    const line=n=>this.line(`dlg_m01_${String(n).padStart(3,'0')}`,`${id}:${n}`);
    switch(id){
      case E('intro_card'):break;
      case E('prelude_start'):this.activate('deliver_message');this.mission.phase='SETUP';break;
      case E('railway_worker_report'):if(dist(this.player,this.actor('franciszek_lipski'))<15)line(8);break;
      // R1-b: Nowicki looks up and points for the length of lines 012 and 013 (OPENING.planesRun.afterSec) before he runs for the sappers, when the opening life is running (without its record: the old immediate run)
      case E('planes_heard'):this.mission.phase='BUILDUP';line(12);line(13);line(67);line(66);if(!holdNowicki(this))this.actor('tadeusz_nowicki').target=this.world.point('repair_site_1');break;
      case E('bombing_0434'):
        closeOpening(this);   // R1-b: the first bomb ends the opening life (every act, the record), here and not a tick later, so that no state holds the event and the record together
        this.finish('deliver_message');this.activate('take_cover');this.player.headgear='pl_helmet_wz31';
        this.message('Abrigue-se! Cabeça baixa, junto à cobertura!');
        this.mission.phase='FIRST_CONTACT';this.startScene('cs_m01_bombing');
        this.impact('station_bomb',this.world.point('tczew_station'),true);
        // R1-a: the raid goes on until 04:44 (raidTargets0434). The schedule is data in the save; an older save past this event has none and gets no retroactive impacts.
        this.timers.raidSchedule0434=RAID0434_PLAN.map(t=>({...clone(t),emitted:false}));this.updateEarlyRaid();break;
      case E('forward_post_bombed'):{const p=this.world.point('forward_post');
        const near=dist(this.player,p)<=30;this.flags['m01.forward_post_state']=near?'intact_near_miss':'destroyed';
        this.impact('forward_post',near?{x:0,y:-10,z:-40}:p,true);break;}
      case E('nowicki_lost'):this.flags['m01.nowicki_status']='missing';this.actor('tadeusz_nowicki').active=false;
        this.impact('repair_crater',this.world.point('repair_site_1'),true);break;
      case E('cable_cut'):this.destruction.push('ignition_line_damaged');break;
      case E('wounded_dragged'):{
        this.destruction.push('station_wagon_fire');
        const patient=this.actor(STATION_PATIENT),medic=this.actor('leon_dudek');
        if(patient.alive&&patient.active){
          Object.assign(patient,{health:Math.min(patient.health,45),state:'WOUNDED',task:'station_wounded',target:null,crouched:false});
          recordHit(patient,this.clock);
          if(medic.alive&&medic.active){medic.task='evacuate_station_wounded';medic.target=null;}
        }
        break;
      }
      case E('second_air_pass'):this.emit({type:'distant-shot',point:{x:-550,y:20,z:60}});break;
      case E('train963_arrives'):this.enemies.filter(a=>a.group==='grp_de_east').forEach(a=>{a.active=true;});this.stageGateRiflemen();this.holdEastPlatoon();line(25);line(28);break;
      case E('panzerzug_arrives'):if(this.inView({x:1119,y:0,z:2.5}))this.line('dlg_m01_038');break;
      case E('repair_complete'):this.finish('cover_repair');this.destruction.push('ignition_line_repaired');line(31);line(32);break;
      case E('order_demolish'):this.activate('hold_access');this.pendingCheckpoint='cp_m01_c_engenheiros';this.startScene('cs_m01_order');this.mission.phase='MAIN_COMBAT';
        // Bąk ocupa cedo a posição no tabuleiro: às 06:04 cai em bak_wound_point, à frente do jogador, e não no caminho.
        this.actor('jozef_bak').target=this.world.point('bak_wound_point');break;
      case E('bombing_0530'):this.flags['m01.second_raid_state']='active';
        this.timers.raidSchedule=RAID_PLAN.map(t=>({...clone(t),emitted:false}));this.updateRaidSchedule();break;
      case E('runner_pressure_report'):line(37);break;
      case E('north_contact_distant'):this.emit({type:'distant-shot',point:{x:-500,y:2,z:-1100}});break;
      case E('east_platoon_withdraws'):if(this.timers.holdAccessVisited)this.finish('hold_access');this.activate('cover_withdrawal');this.mission.phase='SET_PIECE';line(39);
        // Recuam os sobreviventes (18 no máximo, survivorsRange); os outros caíram antes, na cabeça de ponte leste, fora de cena.
        // Assim cada baixa seguinte é um homem a menos à vista, e não vários de uma vez.
        this.actors.filter(a=>a.group==='grp_east_platoon').forEach(a=>{a.active=Number(a.id.split('_').at(-1))<this.flags['m01.east_platoon_survivors'];a.crouched=false;   // T38: up to run
          if(!a.active)Object.assign(a,{alive:false,health:0,state:'DOWN'});});
        this.actor('jozef_bak').target=this.world.point('bak_wound_point');break;
      case E('bak_wounded'):{const bak=this.actor('jozef_bak');
        if(inside(bak,{minX:20,maxX:160,minZ:30,maxZ:50})){bak.state='WOUNDED';bak.target=null;this.flags['m01.bak_status']='wounded';this.activate('rescue_bak');line(41);if(this.actor('leon_dudek').alive&&this.actor('leon_dudek').active)line(42);line(43);recordHit(bak,this.clock);this.noteCasualty('jozef_bak','wounded','script');}break;}
      // Os 20 s de relógio da regra de baixas contam a partir da entrada dos alemães no tabuleiro (cover_withdrawal.mechanic).
      case E('germans_on_east_spans'):this.enemies.filter(a=>a.group==='grp_de_spans').forEach((a,i)=>{a.active=true;a.cooldown=2+i*.7;});
        this.beginDeckAssault();this.timers.withdrawalCasualty=this.battleClock;this.message('Eles entram pelo tabuleiro leste! Cubra os últimos homens do pelotão.');break;
      case E('east_demolition'):
        this.finish('cover_withdrawal');this.activate('leave_bridge');this.destruction.push('east_ends_destroyed');this.mission.phase='CLIMAX';
        // 2026-10-19 review fix: only a living man retreats; a man already dead stays DOWN (he lay on the deck with state RETREAT).
        this.enemies.filter(a=>a.group==='grp_de_spans').forEach((a,i)=>{const wasAlive=a.alive;if(i<GERMAN_FELLED){a.health=0;a.alive=false;a.state='DOWN';recordDeath(a,wasAlive,this.clock);}else if(a.alive)a.state='RETREAT';});
        this.beginFallBack();
        this.startScene('cs_m01_east_blast');this.impact('east_demolition',{x:800,y:0,z:20},false);
        if(this.flags['m01.bak_status']==='rescued_by_player'&&this.actor('jozef_bak').active)this.actor('leon_dudek').task='evacuate_bak';break;
      case E('dudek_retrieves_bak'):this.flags['m01.bak_status']='rescued_by_dudek';this.flags['m01.dudek_status']='wounded_arm';
        this.objectives[O('rescue_bak')].state='expired';this.player.carrying=null;this.actor('leon_dudek').task='evacuate_bak';break;
      case E('west_demolition'):if(this.done('leave_bridge'))this.finish('hold_corridor');this.activate('reach_shelter');this.destruction.push('west_end_destroyed');this.mission.phase='AFTERMATH';
        this.startScene('cs_m01_west_blast');this.impact('west_demolition',{x:70,y:0,z:20},false);break;
      case E('kozliny_attack_distant'):this.emit({type:'distant-shot',point:{x:-500,y:0,z:-1300}});break;
      case E('roll_call'):this.battleClock=Math.max(this.battleClock,seconds('07:05:00'));this.mission.phase='OUTRO';this.startScene('cs_m01_roll_call');this.stageRollCall();break;
      case E('debrief'):this.flags['m01.completed']=true;this.mission.complete=true;this.checkpoint=this.snapshot(false);this.emit({type:'complete'});break;
      default:throw new Error(`Evento M01 sem resultado implementado: ${id}`);
    }
    this.world.refresh(Object.keys(this.consumed),this.flags);
    // 2026-10-19 review fix: a German who died on spans 06-07 falls with them. After the east demolition every dead, uncarried man of the spans lies on the ground under him
    // (the riverbed where the deck has gone), not in the air where the deck was.
    if(id===E('east_demolition'))for(const a of this.actors)if(a.group==='grp_de_spans'&&!a.alive&&!a.carriedBy)a.y=this.world.heightAt(a.x,a.z);
    // T38: an event can open or close the rkm gunner's firing window (train 963, east demolition): stage him at once, as he will be drawn.
    const rkm=this.actor(STAGE.squad.rkm.actor);if(rkm.alive&&rkm.active&&this.mission.phase!=='OUTRO')this.stageSection(rkm);
    for(const a of this.actors)updatePosture(a,this.clock);
    return true;
  }
  safeImpact(point){
    let p={...point};if(dist(p,this.player)<30){const angle=Math.atan2(p.z-this.player.z,p.x-this.player.x);
      p={x:this.player.x+Math.cos(angle)*40,z:this.player.z+Math.sin(angle)*40,y:point.y};}
    if(dist(p,this.player)<30)throw new Error('Impacto aéreo inseguro.');return p;
  }
  impact(id,point,aerial,extra={}){
    const p=aerial?this.safeImpact(point):{...point};
    if(aerial)p.y=this.world.heightAt(p.x,p.z);   // Ground only after the existing safety shift, including near-miss alternatives.
    const kind=blastKind(id,aerial);
    // R1-a: a bomb now does something to the men beside it (bombEffects). Grenades and the demolitions keep their own rules, and their event is the one it always was. The crater records how hard
    // the bomb stunned the player (`concussion`, 0..1): the audio presents that strength, also after a restore, and a record without it (an older save) keeps the audio's own distance rule.
    const effects=aerial&&kind==='bomb'?this.bombEffects(id,p):null;
    if(effects)for(const how of ['killed','wounded'])for(const who of effects.casualties[how])this.noteCasualty(who,how,'bomb');   // R2-a: the section calls the men of ours a bomb has hit
    this.sectors.damage.push({id,...p,started:this.clock,soundAt:this.clock+dist(p,this.player)/343,...(kind==='grenade'?{smokeSeconds:20}:{}),...(effects?{concussion:effects.concussion}:{})});
    this.emit({type:'m01-blast',kind,point:p,soundAt:this.clock+dist(p,this.player)/343,aerial,...(effects?{concussion:effects.concussion,effects:effects.casualties}:{}),...extra});return p;
  }
  /**
   * What an aerial bomb does to everyone near its crater (R1-a; the numbers and the reasons are in m01-blast.js, gameplay values and never a count of real dead). For every living, present
   * man within reach (not carried): the distance to his torso, whether the blast sees that torso (the world's line of sight from the crater, so a bank, a wall or a sandbag line shelters him),
   * how he lies, and a jitter from the (man, impact) pair give the outcome: killed (DOWN, the body stays), wounded (WOUNDED if he is ours, HIT_REACTION if he is a German, health down but
   * at least 1), or shaken (suppressedUntil, the existing suppression: the sappers stop and lie down, the allies are drawn pinned, a German goes to cover). The cast, the east platoon, the
   * ckm crew and the scenery of the station yard are only ever shaken (blastProtection): the plot needs them. The player is never hurt (F4/F1) but is stunned near a blast
   * (player.concussion / concussedUntil: reduced sprint and a less steady rifle for a few seconds), and the audio presents the strength the crater records. No draw from any random stream.
   * Returns {casualties: {killed, wounded, suppressed: [ids]}, concussion: 0..1}; the transient `m01-blast` event carries both.
   */
  bombEffects(id,p){
    const clock=this.clock,source=sightPoint({x:p.x,y:p.y+BOMB_BLAST.sourceHeight,z:p.z}),casualties={killed:[],wounded:[],suppressed:[]};
    for(const a of this.actors){
      if(!a.alive||!a.active||a.carriedBy||Math.abs(a.x-p.x)>BOMB_REACH_M||Math.abs(a.z-p.z)>BOMB_REACH_M)continue;
      const target=blastTarget(a),distance=Math.hypot(a.x-p.x,target.y-source.y,a.z-p.z);
      if(distance>BOMB_REACH_M)continue;
      const r=blastOutcome({distance,covered:!this.world.lineOfSight(source,sightPoint(target)),posture:blastPosture(a),protectedBy:blastProtection(a,BLAST_CAST),u:blastJitter(a.id,id)});
      if(r.outcome==='none')continue;
      const health=a.health,wasAlive=a.alive;
      if(r.outcome==='kill'){a.health=0;a.alive=false;a.state='DOWN';a.crouched=false;recordDamage(a,health,wasAlive,clock,p);casualties.killed.push(a.id);}
      else if(r.outcome==='wound'){
        a.health=Math.max(1,a.health-r.healthLoss);a.crouched=false;
        if(a.team==='enemy')a.state='HIT_REACTION';else{a.state='WOUNDED';a.target=null;}   // our wounded lie down (the WOUNDED pose); a German is hit as by a round and goes on
        recordDamage(a,health,wasAlive,clock,p);casualties.wounded.push(a.id);
      }else{
        const previousUntil=a.suppressedUntil;a.suppressedUntil=Math.max(previousUntil,clock+r.suppressSec);
        recordSuppression(a,previousUntil,clock);if(a.suppressedUntil>previousUntil)casualties.suppressed.push(a.id);
        // R3-a: a bomb that shakes a man at work interrupts the stage, as a pin does: the bar stops until he is up again (the same gate as landRound's, timers.repairSuppressedUntil).
        if(a.role==='ENGINEER'&&this.active('cover_repair')&&workDistance(a)<6)this.timers.repairSuppressedUntil=Math.max(this.timers.repairSuppressedUntil,a.suppressedUntil);
      }
      if(proneGunner(a))this.updateMG34Posture(a);
    }
    // The player: never damaged by a bomb. Stunned by the nearest ones, less behind cover or crouching; the strongest effect wins, they do not add up.
    const pl=this.player,body=blastTarget(pl),distance=Math.hypot(pl.x-p.x,body.y-source.y,pl.z-p.z);let peak=0;
    if(pl.alive&&concussionPeak({distance})>0)peak=concussionPeak({distance,covered:!this.world.lineOfSight(source,sightPoint(body)),crouched:Boolean(pl.crouched)});
    const merged=mergeConcussion(pl,clock,peak);if(merged)Object.assign(pl,merged);
    return {casualties,concussion:peak};
  }
  /** The player's concussion now, 0..1 (read-only; 0 when nothing is wrong with him). */
  get concussion(){return concussionLevel(this.player,this.clock);}
  updateRaidSchedule(){
    // A missing schedule is a legacy schema-2 raid: never invent retroactive impacts on resume.
    for(const t of this.timers.raidSchedule??[])if(!t.emitted&&this.battleClock>=t.at){
      t.point=this.impact(t.id,t.point,true);t.emitted=true;
    }
  }
  /**
   * The 04:34 raid's schedule (raidTargets0434), same rules as the 05:30 one: fixed battle-clock times, nothing retroactive for a save without the field. Each impact falls on its planned point,
   * or, when the player stands within 30 m of it, 40 m from him on the first free bearing (earlyRaidPoint: never on an objective's place, in the river or in a building); impact() then
   * applies safeImpact as for every aerial impact, so the 30 m guarantee holds even if no free place was found.
   */
  updateEarlyRaid(){
    for(const t of this.timers.raidSchedule0434??[])if(!t.emitted&&this.battleClock>=t.at){
      const free=(x,z)=>this.earlyRaidFree(x,z),at=earlyRaidPoint(t.point,this.player,free);
      t.point=this.impact(t.id,at?{x:at.x,y:t.point.y,z:at.z}:t.point,true);t.emitted=true;
    }
  }
  /** A place the early raid may drop a bomb: inside the playable area (10 m in), out of the river and the buildings, 20 m from the places of the objectives. */
  earlyRaidFree(x,z){
    const b=this.world.layout.bounds.playable;
    return x>=b.minX+10&&x<=b.maxX&&z>=b.minZ+10&&z<=b.maxZ-10&&!this.world.isWater(x)&&
      !this.world.buildings.some(o=>x>=o.min.x-2&&x<=o.max.x+2&&z>=o.min.z-2&&z<=o.max.z+2)&&EARLY_RAID_KEEP.every(k=>Math.hypot(x-k.x,z-k.z)>=EARLY_RAID_CLEAR_M);
  }
  processEvents(){
    for(let pass=0;pass<4;pass++)for(const event of definition.events){
      if(this.consumedEvent(event.id))continue;
      const ready=event.id===E('bak_wounded')?this.battleClock>=seconds('06:04:00'):this.trigger(event.trigger);
      if(ready&&this.readiness(event.id))this.consume(event.id);
    }
  }
  saveCheckpoint(id){
    if(this.checkpointsReached.includes(id))return;
    this.checkpointsReached.push(id);this.pendingCheckpoint=null;
    // H9 D2: on soldado/veterano a checkpoint is saved (and so restored) with full health, no death spiral; recruta keeps the health as it is.
    if(this.level.hpOnCheckpoint!==null&&this.player.alive)this.player.health=this.level.hpOnCheckpoint;
    this.checkpoint=this.snapshot(false);this.emit({type:'checkpoint',id});
  }
  updateObjectives(dt,interact){
    const p=this.player;
    if(this.active('deliver_message')&&interact&&dist(p,this.world.point('forward_post'))<4){
      this.finish('deliver_message');[9,10,11].forEach(n=>this.line(`dlg_m01_${String(n).padStart(3,'0')}`));
      this.battleClock=Math.max(this.battleClock,seconds('04:33:10'));
    }
    const sinceBombing=this.clock-this.consumed[E('bombing_0434')];
    if(this.active('take_cover')&&sinceBombing>=2.5&&(this.world.coverAt(p)||sinceBombing>=12)){
      this.finish('take_cover');this.activate('follow_sergeant');this.actor('marek_zielinski').target=this.world.point('rally_point');
    }
    if(this.active('follow_sergeant')&&dist(p,this.world.point('rally_point'))<8){
      this.finish('follow_sergeant');this.activate('find_sappers');this.pendingCheckpoint='cp_m01_b_reorganizacao';
      this.line('dlg_m01_018');if(this.flags['m01.forward_post_state']==='destroyed')this.line('dlg_m01_019');this.line('dlg_m01_020');
    }
    if(this.active('find_sappers')&&dist(p,this.world.point('repair_site_1'))<6){this.finish('find_sappers');this.activate('fetch_material');this.line('dlg_m01_021');this.line('dlg_m01_023');
      // A caixa é entregue no segundo corte (repair_site_2): os sapadores vão para lá enquanto o jogador vai ao barracão.
      const site=this.world.point('repair_site_2');
      // Junto ao cabo, na encosta sul do aterro (z≈10–11): é aí que o fogo mergulhante dos portões de Lisewo chega e de onde o
      // jogador vê os clarões. Mais acima (z≈8), a crista e o portal ferroviário tapam-nos desse fogo.
      this.actors.filter(a=>a.role==='ENGINEER'&&a.alive&&a.active).forEach((a,i)=>{a.target={x:site.x-1.5-i*1.2,y:site.y,z:site.z+1+i%2};});}
    if(this.active('fetch_material')&&interact){
      if(!p.carrying&&dist(p,this.world.point('rail_hut'))<5){p.carrying='sapper_crate';this.message('Material recolhido. Leve a caixa aos sapadores.');}
      else if(p.carrying==='sapper_crate'&&dist(p,this.world.point('repair_site_2'))<6){p.carrying=null;this.finish('fetch_material');this.activate('cover_repair');this.line('dlg_m01_024');
        // H9 D3: the repair is the first hard phase and CP-B (04:38) lies before find_sappers and fetch_material, so soldado and veterano save CP-B2 here (below, at the end of this tick); recruta does not.
        if(checkpointApplies(M01_CHECKPOINT_B2,this.difficulty))this.pendingCheckpoint=M01_CHECKPOINT_B2;}
    }
    if(this.active('cover_repair')){
      const repair=this.objectives[O('cover_repair')];
      // R3-a: the bar still counts the work seconds (REPAIR_WORK_SEC without a pin), but the team works through the stages of its operation (src/game/m01-sappers.js), so it advances only while the leader
      // stands at the place of the stage (or is walking to the second cut) and is not suppressed, by a pin or by a bomb; the walk cannot end before he is there.
      if(this.clock>=this.timers.repairSuppressedUntil){
        const rate=sapperRate(this,sapperPhase(this));
        if(rate.works)repair.progress=Math.max(repair.progress,Math.min(rate.cap,Math.min(100,repair.progress+dt*100/REPAIR_WORK_SEC)));
        this.timers.repairStall=0;this.timers.fireEase=false;
      }else this.timers.repairStall+=dt;
      // Tolerância (mechanic): 120 s parado baixa, sem aviso, a cadência sobre o reparo até o trabalho retomar.
      if(this.timers.repairStall>120){this.timers.fireEase=true;this.timers.repairSuppressedUntil=this.clock;}
      if(repair.progress>=40)this.line('dlg_m01_022');   // fala obrigatória: se ainda não houve supressão, não fica por dizer
      if(sapperPhase(this).id==='fail')this.line('dlg_m01_204');   // R3-a: the one failed test is told by the helper (scripted: the busy minute of train 963 would starve a reactive line); said once, like every scripted line
    }
    if(this.active('rescue_bak')&&interact){
      const bak=this.actor('jozef_bak');
      if(!p.carrying&&dist(p,bak)<3){p.carrying='jozef_bak';bak.active=false;bak.carriedBy=p.id;bak.carry={phase:'pickup',startedAt:this.clock,duration:1.6};
        const aid=this.world.point('aid_position');this.message(`Bąk está consigo. Leve-o ao socorrista Dudek: ${Math.round(dist(p,aid))} m, ${this.directionTo(aid)}.`);}
      else if(p.carrying==='jozef_bak'&&dist(p,this.world.point('aid_position'))<4){p.carrying=null;this.finish('rescue_bak');
        this.flags['m01.bak_status']='rescued_by_player';this.flags['m01.dudek_status']='unhurt';this.message('Bąk entregue. Dudek trata dele — volte à secção.');
        const aid=this.world.point('aid_position');Object.assign(bak,{active:true,state:'WOUNDED',target:null,x:aid.x-1.2,z:aid.z+.6});bak.y=this.world.heightAt(bak.x,bak.z);
        bak.carriedBy=p.id;bak.carry={phase:'putdown',startedAt:this.clock,duration:1.6};
        // Entregue depois das 06:10, Dudek leva-o já: ninguém pode ficar ferido junto ao portal (x≈−9) à espera da demolição oeste.
        if(this.consumedEvent(E('east_demolition')))this.actor('leon_dudek').task='evacuate_bak';}
    }
    const kowal=this.actor('szymon_kowal'),kowalRounds=this.timers.kowalRounds??0;
    if(interact&&!p.carrying&&kowalRounds>0&&kowal.alive&&kowal.active&&dist(p,kowal)<3&&this.weapon.reserve<=25){
      const given=this.weapon.resupply(Math.min(15,kowalRounds));this.timers.kowalRounds=kowalRounds-given;this.timers.lowAmmoHint=false;
      this.message(`Kowal passa-lhe ${given/5} carregador${given>5?'es':''} (+${given}).`);
    }
    // Combat slice 2: the deck fight now lasts minutes, 100 m from Kowal. The section's spare clips wait at its deck post (DECK_AMMO_POOL rounds): while the player covers the
    // withdrawal from the deck post (HOLD_AREA) with DECK_AMMO_LOW rounds or fewer in reserve, he takes one clip of 5 every DECK_AMMO_SEC, until the box is empty. timers.deckAmmo is
    // what he has taken (absent in older saves = none) and enters the section's ammunition account (validateM01Snapshot «munição da secção»).
    const deckAmmo=this.timers.deckAmmo??0;
    if(this.active('cover_withdrawal')&&deckAmmo<DECK_AMMO_POOL&&!p.carrying&&inside(p,HOLD_AREA)&&this.weapon.reserve<=DECK_AMMO_LOW&&this.clock>=(this.timers.deckAmmoAt??-1e9)+DECK_AMMO_SEC){
      const given=this.weapon.resupply(Math.min(5,DECK_AMMO_POOL-deckAmmo));
      if(given>0){this.timers.deckAmmo=deckAmmo+given;this.timers.deckAmmoAt=this.clock;this.timers.lowAmmoHint=false;
        if(deckAmmo===0)this.message(`Caixa de carregadores da secção no posto do tabuleiro: +${given}. Fique no posto para recarregar.`);
        else if(this.timers.deckAmmo>=DECK_AMMO_POOL)this.message('A caixa de carregadores do tabuleiro está vazia. Kowal tem munição no posto da secção.');}
    }
    if(!this.timers.lowAmmoHint&&kowalRounds>0&&this.weapon.mag+this.weapon.reserve<=10&&kowal.alive&&kowal.active){
      this.timers.lowAmmoHint=true;const d=dist(p,kowal),rel=Math.atan2(kowal.z-p.z,kowal.x-p.x)-p.angle,a=Math.atan2(Math.sin(rel),Math.cos(rel)),deg=Math.abs(a)*180/Math.PI;
      this.message(`Pouca munição. Kowal tem carregadores: ${Math.round(d)} m, ${deg<35?'em frente':deg>120?'atrás de si':a>0?'à sua direita':'à sua esquerda'}`);
    }
    if(this.active('hold_access')&&inside(p,HOLD_AREA)){this.timers.holdAccessVisited=true;if(this.consumedEvent(E('east_platoon_withdraws')))this.finish('hold_access');}
    if(this.active('leave_bridge')&&dist(p,this.world.point('firing_point'))<12){this.finish('leave_bridge');this.activate('hold_corridor');}
    if(this.active('hold_corridor')&&this.consumedEvent(E('west_demolition')))this.finish('hold_corridor');
    stepCorridor(this);   // SP-08: count, escort (src/game/m01-corridor.js)
    // Slice 3: the escort may have begun in this very tick (the count is complete): Kowal's end-of-tick posture follows his covering rule at once, as stageSection does after combat.
    if(this.timers.squad&&this.mission.phase!=='OUTRO'){const k=this.actor('szymon_kowal');if(k.alive&&k.active){this.squadPosture(k);updatePosture(k,this.clock);}}
    if(this.active('reach_shelter')&&this.done('hold_access')&&this.done('hold_corridor')&&dist(p,this.world.point('shelter'))<5)this.finish('reach_shelter');
    if(this.pendingCheckpoint==='cp_m01_b_reorganizacao'&&this.clock-this.consumed[E('bombing_0434')]>=20)this.saveCheckpoint(this.pendingCheckpoint);
    if(this.pendingCheckpoint===M01_CHECKPOINT_B2)this.saveCheckpoint(this.pendingCheckpoint);   // H9 D3: soldado and veterano only (it is set above only for them)
    if(this.pendingCheckpoint==='cp_m01_c_engenheiros'&&this.flags['m01.second_raid_state']==='ended')this.saveCheckpoint(this.pendingCheckpoint);
    if(this.consumedEvent(E('east_demolition'))&&p.x<-20&&!p.carrying&&!(this.battleClock>=seconds('06:36:00')&&p.x>=-90))this.saveCheckpoint('cp_m01_d_retirada');
    const active=definition.objectives.find(o=>o.required&&this.objectives[o.id].state==='active');
    const optional=definition.objectives.find(o=>!o.required&&this.objectives[o.id].state==='active');
    this.mission.text=this.scene?.id==='cs_m01_intro'?phaseText.INTRO:this.scene?.id==='cs_m01_roll_call'?phaseText.OUTRO:
      (active?.text??interludeText(this)??'Mantenha contacto com a secção')+(optional?` · ${optional.text}`:'');
    this.mission.status=this.scene?.id==='cs_m01_roll_call'?'':(p.carrying==='jozef_bak'&&pacingStatus(this))||this.threatStatus()||pacingStatus(this);   // carrying Bąk: where to take him comes first
  }
  /**
   * The one walking routine of every actor (NPC navigation, M01-NPC-NAVIGATION-V1). With no solid and no man in the way it is the old straight walk, to the bit
   * (`walkStraight`, byte for byte what moveActor was). Otherwise the walker follows the corners of a route round the solids (`navAim`, saved in `a.nav`),
   * turns away from a man in the way (`steerAround`), and at a crowded goal waits where he is; after every walk anyone inside his personal space pushes him
   * out (`separate`). No random number and no clock are read here.
   */
  moveActor(a,target,dt,speed=3.6){
    if(!a.alive||!a.active||a.state==='WOUNDED')return;
    const d=dist(a,target);
    if(d<.8){delete a.nav;return this.walkStraight(a,target,dt,speed);}
    const aim=this.navAim(a,target),detour=aim!==target,beforeX=a.x,beforeZ=a.z;
    const wanted=Math.atan2(aim.z-a.z,aim.x-a.x),step=Math.min(detour?dist(a,aim):d,speed*dt);
    const heading=this.steerAround(a,wanted,step);
    // settle after the straight walk too: a no-op unless he ended inside a solid without a world collider (the failed-route fallback and the sidestep of walkStraight can).
    if(!detour&&heading===wanted){this.walkStraight(a,target,dt,speed);this.navigator.settle(a);}
    else{
      a.facing=heading??wanted;a.state='ADVANCE';
      // The last metres of a crowded goal: a man with no free way forward stops where he is, as a queue does.
      if(heading===null&&d<CROWD_NEAR){a.state='GUARD';return;}
      this.world.move(a,Math.cos(a.facing)*step,Math.sin(a.facing)*step);
      this.navigator.settle(a);
    }
    this.separate(a);
    if(detour&&a.nav)a.nav.stall=Math.hypot(a.x-beforeX,a.z-beforeZ)<step*.25?a.nav.stall+1:0;
  }
  /** Everyone whose body counts for a walking man: the other living, present men on his level, and the player. Nobody carried (he is part of his carrier). */
  bodiesNear(a,x,z,reach){const n=this.gatherBodies(a,x,z,reach);return BODY_SCRATCH.slice(0,n);}
  /** The same men in the same (roster) order as bodiesNear, written into BODY_SCRATCH[0..n) (the player last); returns n. What a walking man asks every tick, so it builds no list of its own. */
  gatherBodies(a,x,z,reach){
    const out=BODY_SCRATCH,actors=this.actors,ay=a.y,carrier=a.carriedBy;let n=0;
    for(let i=0;i<actors.length;i++){
      const b=actors[i];
      if(!b.alive||!b.active)continue;   // the men who are not there (most of the roster), then the far ones: nearly every call rejects by here
      if(!(Math.abs(b.x-x)<=reach&&Math.abs(b.z-z)<=reach))continue;
      if(b===a||b.carriedBy||carrier===b.id||Math.abs(b.y-ay)>1.5)continue;
      out[n++]=b;
    }
    const p=this.player;if(p.alive&&Math.abs(p.y-ay)<=1.5&&Math.abs(p.x-x)<=reach&&Math.abs(p.z-z)<=reach)out[n++]=p;
    return n;
  }
  /**
   * Local avoidance. A step is "in the way" when it ends within personal space of somebody and closer to him than the walker is now; the walker then turns
   * away from that man (about 35 degrees, then 70) towards the free side, and null means no free way at all. Returns `wanted` itself when nobody is in the way.
   * Pure geometry on the roster order: no random number, no clock.
   */
  // ponytail: two turns (35 and 70 degrees) to the free side and a stop, no look-ahead and no reciprocal avoidance; enough for a file of men and a crowd at one goal.
  steerAround(a,wanted,step){
    const n=this.gatherBodies(a,a.x,a.z,step+1.2);if(!n)return wanted;
    const first=this.blockingBody(n,a,wanted,step);if(!first)return wanted;
    const cross=Math.cos(wanted)*(first.z-a.z)-Math.sin(wanted)*(first.x-a.x),side=Math.abs(cross)>1e-3?(cross>0?-1:1):(this.actors.indexOf(a)%2?1:-1);
    for(let k=0;k<4;k++){const h=wanted+side*STEER_TURNS[k];if(!this.blockingBody(n,a,h,step))return h;}
    return null;
  }
  /** The first of the `n` men in BODY_SCRATCH (roster order) that a step of `a` along heading `h` would end inside the personal space of, closer to him than `a` is now; undefined when the step is free. */
  blockingBody(n,a,h,step){
    const px=a.x+Math.cos(h)*step,pz=a.z+Math.sin(h)*step;
    for(let i=0;i<n;i++){const b=BODY_SCRATCH[i],d=Math.hypot(b.x-px,b.z-pz);if(d<a.radius+b.radius-SEPARATION_SLACK&&d<dist(b,a))return b;}
    return undefined;
  }
  /**
   * Personal space: after a walking man moves, anyone nearer than the sum of both radii less a shoulder's slack pushes him away along the line between
   * them (all the way from a man standing still, half the way from one who also walks), through TczewWorld.move so a wall still stops the push.
   * Two men on the very same spot are parted along a direction that depends only on their places in the roster. No random number, no clock.
   */
  // ponytail: a push for walkers only; men who stand are never moved by it, so authored slots (kneeling squad, gate riflemen) keep their places.
  separate(a){
    const n=this.gatherBodies(a,a.x,a.z,1);
    for(let i=0;i<n;i++){
      const b=BODY_SCRATCH[i],space=a.radius+b.radius-SEPARATION_SLACK;let dx=a.x-b.x,dz=a.z-b.z,d=Math.hypot(dx,dz);
      if(d>=space)continue;
      if(d<1e-6){const angle=(this.actors.indexOf(a)-Math.max(0,this.actors.indexOf(b)))*2.399963;dx=Math.cos(angle);dz=Math.sin(angle);d=1;}
      const push=Math.min(SEPARATION_PUSH,(space-Math.min(d,space))*(b.state==='ADVANCE'?.5:1));
      this.world.move(a,dx/d*push,dz/d*push);this.navigator.settle(a);
    }
  }
  /**
   * Where an actor walks to this tick. The straight walk to the target is kept exactly as it always was whenever no solid is in the way; otherwise he
   * follows the corners of a route round the solids (src/world/m01-navigation.js), which are saved with him (`nav`) and re-made from his position and
   * the target when the target moves, a span falls, the route is spent or he makes no headway (nothing else in the world changes under a route, so no timer). Nothing here reads or writes the random stream.
   */
  navAim(a,target){
    if(this.navigator.world!==this.world)this.navigator=simulationNavigator(this.world);   // a world swapped under the simulation (tests do)
    const nav=this.navigator;
    if(nav.clear(a.x,a.z,target.x,target.z,a.radius,a.y)){delete a.nav;return target;}
    let n=a.nav;
    // A route that failed is not asked for again every tick: the failure is saved (`fail`) and kept until the goal moves, a span falls or NAV.retrySec pass (the walk is the old one meanwhile).
    if(n?.fail&&n.key===nav.key&&Math.hypot(n.goal[0]-target.x,n.goal[1]-target.z)<=1.5&&this.clock-n.at<NAV.retrySec)return target;
    const spent=n&&n.i>=n.pts.length-1&&Math.hypot(n.pts[n.pts.length-1][0]-a.x,n.pts[n.pts.length-1][1]-a.z)<.06;
    if(!n||spent||n.key!==nav.key||Math.hypot(n.goal[0]-target.x,n.goal[1]-target.z)>1.5||n.stall>=20){
      // One route() per tick (NAV.routesPerTick; a plan can cost tens of milliseconds and several men may need one at once): the walker the roster reaches first plans, the others keep the
      // straight walk of this tick and ask again at the next. Nothing is saved for a man who waits, so the queue is the roster order and the saved routes, and a restored run makes the same choices.
      if(!this.takeRouteSlot())return target;
      const pts=nav.route(a,target);
      if(!pts){a.nav={goal:[target.x,target.z],key:nav.key,at:this.clock,i:0,stall:0,pts:[[target.x,target.z]],fail:true};return target;}   // no way round: the old walk, with its sidestep
      n=a.nav={goal:[target.x,target.z],key:nav.key,at:this.clock,i:0,stall:0,pts};
    }
    while(n.i<n.pts.length-1&&nav.clear(a.x,a.z,n.pts[n.i+1][0],n.pts[n.i+1][1],a.radius,a.y,NAV.tightMargin))n.i++;
    if(n.i<n.pts.length-1&&Math.hypot(n.pts[n.i][0]-a.x,n.pts[n.i][1]-a.z)<.06)n.i++;
    return {x:n.pts[n.i][0],z:n.pts[n.i][1]};
  }
  /** True when this tick (this clock) has a route() left to spend; spends it. A tick always moves the clock on, so the count starts again at the next one. */
  takeRouteSlot(){
    if(this.navPlanAt!==this.clock){this.navPlanAt=this.clock;this.navPlans=0;}
    if(this.navPlans>=NAV.routesPerTick)return false;
    this.navPlans++;return true;
  }
  walkStraight(a,target,dt,speed=3.6){
    if(!a.alive||!a.active||a.state==='WOUNDED')return;
    const d=dist(a,target);if(d<.8){a.state='GUARD';return;}
    a.facing=Math.atan2(target.z-a.z,target.x-a.x);a.state='ADVANCE';
    const step=Math.min(d,speed*dt);this.world.move(a,Math.cos(a.facing)*step,Math.sin(a.facing)*step);
    // A blocked follower walks around nearby solid cover instead of clipping through it.
    if(dist(a,target)>d-.01)this.world.move(a,0,dt*speed);
  }
  // Only the existing two gunners own this state. Missing legacy data means standing, with no pending shots.
  updateMG34Posture(a){
    if(!proneGunner(a))return;
    if(!a.alive||!a.active){delete a.mg34Prone;a.shot=0;return;}
    const phase=(name,at=this.clock)=>{const previous=a.mg34Prone;a.mg34Prone={phase:name,startedAt:at,duration:MG34_TRANSITION_SEC,
      progress:['idle','aim','fire_burst','reload'].includes(name)?1:0,loader:MG_LOADER_IDS[MG34_IDS.indexOf(a.id)],beltRemaining:previous?.beltRemaining??50};};
    if(!a.mg34Prone){phase('standing');a.shot=0;}
    let p=a.mg34Prone;
    if(!fixedMG34(a)&&!['standing','exit'].includes(p.phase)){
      const fromProgress=p.phase==='enter'?Math.min(1,(this.clock-p.startedAt)/p.duration):1;
      phase('exit');a.mg34Prone.fromProgress=fromProgress;a.shot=0;p=a.mg34Prone;
    }
    if(p.phase==='exit'&&this.clock-p.startedAt>=p.duration){phase('standing',p.startedAt+p.duration);p=a.mg34Prone;}
    if(p.phase==='standing'&&fixedMG34(a)){phase('enter');p=a.mg34Prone;}
    if(p.phase==='enter'&&this.clock-p.startedAt>=p.duration){phase('idle',p.startedAt+p.duration);p=a.mg34Prone;}
    if(p.phase==='reload'&&this.clock-p.startedAt>=4.8){phase('aim',p.startedAt+4.8);a.mg34Prone.beltRemaining=50;p=a.mg34Prone;}
    // Suppression keeps a fixed gunner low and cancels only shots which have not left the muzzle.
    if((this.clock<a.suppressedUntil||a.state==='HIT_REACTION'||this.mission.phase==='OUTRO'||this.mission.complete)&&['aim','fire_burst'].includes(p.phase)){phase('idle');a.shot=0;}
    // T48: so does the silence after the east demolition, for a burst begun before it; a gun that is only aimed stays aimed.
    if(this.germanSilence()&&a.mg34Prone.phase==='fire_burst'){phase('idle');a.shot=0;}
    p=a.mg34Prone;p.progress=['enter','exit'].includes(p.phase)?Math.min(1,Math.max(0,(this.clock-p.startedAt)/p.duration)):
      p.phase==='standing'?0:1;
  }
  emitMG34Rounds(a){
    const p=a.mg34Prone,b=p?.burst;if(p?.phase!=='fire_burst'||!b)return;
    while(b.emitted<b.rounds&&b.plan[b.emitted].firedAt<=this.clock+1e-9){
      const r=b.plan[b.emitted++];this.enemyFire.rounds.push({...r});
      p.beltRemaining=Math.max(0,(p.beltRemaining??50)-1);
      a.shot=Math.max(0,r.firedAt+.06-this.clock);
      if(r.kind==='cover'&&b.emitted===1)this.timers.coverFire={by:a.id,at:r.firedAt,x:r.ox,y:r.oy,z:r.oz};
      this.emit({type:'enemy-fire',origin:{x:r.ox,y:r.oy,z:r.oz},rounds:1,interval:MG34_INTERVAL,weapon:a.weapon,at:r.firedAt});
    }
    // The asset's 4/6-shot cut points are exactly count * 0.075, before the next event.
    if(b.emitted===b.rounds&&this.clock>=p.startedAt+b.rounds*MG34_INTERVAL)
      a.mg34Prone={phase:p.beltRemaining===0?'reload':'aim',startedAt:p.startedAt+b.rounds*MG34_INTERVAL,
        duration:MG34_TRANSITION_SEC,progress:1,loader:p.loader,beltRemaining:p.beltRemaining,
        fade:{startedAt:p.startedAt+b.rounds*MG34_INTERVAL,burstAt:p.startedAt,rounds:b.rounds,duration:.2}};
  }
  /**
   * T47 live fire of the ckm wz.30 at post S2. Data only: the gunner's phase (idle/aim/fire_burst/feed), his ckmFire record (own random stream,
   * belt, cooldown) and the burstPlan of the burst in progress are saved; the renderer and the audio read them and the `ally-fire` event.
   * While nobody is engaged the T36 quiet cycle runs unchanged. A German rifleman who fired in the last CKM_ENGAGE_SEC and has a clear line (the
   * production straight line AND the arc, none through a bridge collider) is answered with an 8-round burst (the authored clip), then a
   * cooldown; a spent belt is changed through the feed phase. No new burst starts from 30 s before the east demolition, and none after it.
   * Stoppage (CKM_STOPPAGES): when the table says the gun is due one, the burst it was about to fire is not fired; the phase is `stoppage` until `clearAt`, the gun silent, the crew
   * showing the clearance; then `ckm_stoppage_cleared` and, the gun being still laid, the burst follows. Events `ckm_stoppage` / `ckm_stoppage_cleared`; the director says 114 / 115 on them.
   */
  updateCKMGunner(g,retreat){
    // Only a live plan is kept. A typed plan of the old disabled policy (TASK D, older saves; it is inert, never emitted a round) would keep the planning gate
    // below shut for ever, so it goes at the first tick. The save itself still round-trips with it (validateM01Snapshot accepts it).
    if(g?.ckm?.burstPlan&&g.ckm.burstPlan.policy!=='live')delete g.ckm.burstPlan;
    if(!g||retreat||this.battleClock<CKM_FIRE_FROM||!g.alive||!g.active||!CKM_PHASES.includes(g.ckm.phase))return;
    const f=g.ckmFire??=newCKMFire(this.rng.state),clock=this.clock,p=g.ckm,live=p.burstPlan?.policy==='live';
    // Every phase change keeps the plan of rounds still in flight; the plan is removed when its last round has landed (landCKMRounds).
    const to=(phase,startedAt)=>{g.ckm={phase,startedAt,visible:p.visible,...(g.ckm.burstPlan?.policy==='live'?{burstPlan:g.ckm.burstPlan}:{})};};
    if(p.phase==='stoppage'){
      if(clock<p.clearAt)return;   // the loader is clearing it: the gun is silent and nothing else of the machine moves
      to('aim',clock);f.engagedUntil=Math.max(f.engagedUntil,clock+CKM_STOPPAGE_HOLD);   // still laid on the German: the burst he was about to fire follows below, on this tick
      this.emit({type:'ckm_stoppage_cleared',by:'ckm_loader',at:clock,origin:ckmMuzzle(),n:f.jams});
    }else if(p.phase==='fire_burst'){
      if(!live)return;   // a typed plan of the disabled policy: the generic reversion to aim handles it
      this.emitCKMRounds(g);
      if(clock-p.startedAt<CKM_BURST_SEC)return;
      to('aim',p.startedAt+CKM_BURST_SEC);
    }else if(p.phase==='feed'&&f.belt<CKM_BURST_ROUNDS){   // a real belt change: the quiet cycle's feed has a belt to spare
      if(clock-p.startedAt<CKM_FEED_SEC)return;
      f.belt=CKM_BELT;to('aim',p.startedAt+CKM_FEED_SEC);
    }
    const firing=this.battleClock<CKM_CEASE_AT;
    if(firing&&f.belt<CKM_BURST_ROUNDS){to('feed',clock);f.nextAt=Math.max(f.nextAt,clock+CKM_FEED_SEC);return;}
    if(firing&&clock>=f.nextAt&&!g.ckm.burstPlan){   // never plan over rounds of the last burst that are still in the air
      const target=this.ckmTarget();
      if(target){
        if(!(clock<f.engagedUntil)){to('aim',clock);f.engagedUntil=clock+CKM_HOLD_SEC;f.nextAt=clock+CKM_AIM_SEC;return;}   // lay the gun first
        if(this.ckmJamDue(f)){this.startCKMStoppage(g);return;}
        this.startCKMBurst(g,target);return;
      }
      f.nextAt=clock+CKM_RESCAN_SEC;
    }
    if(!firing||!(clock<f.engagedUntil)){const q=ckmQuiet(this.battleClock,clock);if(g.ckm.phase!==q.phase)to(q.phase,q.startedAt);}
  }
  /** The next stoppage of the table is due: the gun has fired the bursts it waits for. Also the hook that the tests and the audit switch off to run the same route without stoppages. */
  ckmJamDue(f){const slot=CKM_STOPPAGES[f.jams??0];return slot!==undefined&&f.bursts>=slot.after;}
  /** The burst about to start is not fired: the gun stops for the slot's `sec` seconds. No plan is in flight here (the planning gate above), so the phase record has none to keep. */
  startCKMStoppage(g){
    const f=g.ckmFire,clock=this.clock,clearAt=clock+CKM_STOPPAGES[f.jams??0].sec;
    f.jams=(f.jams??0)+1;
    g.ckm={phase:'stoppage',startedAt:clock,visible:g.ckm.visible,clearAt};
    this.emit({type:'ckm_stoppage',by:g.id,at:clock,clearAt,origin:ckmMuzzle(),n:f.jams});
  }
  /**
   * The gun is laid on the flash it answered, not on the man's posture of the moment: a rifleman fires standing (T38 gate riflemen rise to shoot), so the
   * beaten zone floats CKM_AIM_UP over the standing chest (1.1 m) and the clear-shot test looks at the standing man. At ~1050 m the crew cannot tell a
   * kneeling man from a standing one; and the gun's choice stays independent of the T38 postures, which only the attrition volleys of T23 change.
   */
  ckmAim(t){return {x:t.x,y:t.y+1.1+CKM_AIM_UP,z:t.z};}
  /**
   * The German to answer: the rifleman who fired most recently (his flash is visible) among those with a clear shot; deterministic, no random draw.
   * The two MG34 gunners are never CHOSEN: they lie behind the gate masonry (a hitbox under half a metre) and their duel with the sappers is the player's
   * (cover_repair, tests/m01-cover-threat.test.js: with the gun answering them, the route that ignores the MG saw it suppressed 21% of the time, over the 20% that
   * beat allows). That is all the exclusion does. A round of the beaten zone that passes within NEAR_MISS of one of them suppresses or hits him like any other
   * German (ckmImpact), so the gun can still interrupt an MG34 burst when its zone happens to cross him.
   */
  ckmTarget(){
    const o=ckmMuzzle(),probe={space:'metres',x:o.x,y:o.y,z:o.z,eyeHeight:0};
    const seen=this.enemies.filter(a=>a.alive&&a.active&&a.weapon!=='mg34'&&this.clock-a.firedAt<CKM_ENGAGE_SEC).sort((a,b)=>b.firedAt-a.firedAt);
    for(const a of seen.slice(0,CKM_SCAN_MAX))if(this.ckmClearShot(probe,o,a))return a;
    return null;
  }
  /** Clear shot = the production line of sight from the muzzle AND the undispersed arc free of every obstacle up to the target and of every bridge collider. */
  ckmClearShot(probe,o,t){
    if(!this.world.lineOfSight(probe,{space:'metres',x:t.x,y:t.y,z:t.z,crouched:false}))return false;   // the standing man who fired (ckmAim)
    const r=makeRound({id:'probe',by:'ckm_gunner',weapon:'ckm_wz30',kind:'ally',origin:o,aim:this.ckmAim(t),firedAt:0,bias:[0,0],cone:[0,0],gauss:()=>0}),hit=traceRound(this.world,r,[]);
    return !(hit.material!==null&&hit.t<.98)&&ckmThroughBridge(this.world,r)===null;
  }
  /** Plans the whole burst now (dispersion from the ckm stream only, like the MG34 burst plans); a round whose arc would cross a bridge collider is drawn again. */
  startCKMBurst(g,target){
    const f=g.ckmFire,clock=this.clock,o=ckmMuzzle(),aim=this.ckmAim(target),shared=[CKM_BIAS[0]*ckmGauss(f),CKM_BIAS[1]*ckmGauss(f)],plan=[];
    for(let k=0;k<CKM_BURST_ROUNDS;k++){
      const make=(bias,cone,gauss)=>makeRound({id:`ckm_${f.bursts}_${k}`,by:g.id,weapon:'ckm_wz30',kind:'ally',origin:o,aim,firedAt:clock+k*CKM_INTERVAL,bias,cone,gauss});
      let r=null;
      for(let tries=0;tries<CKM_TRIES&&!r;tries++){const c=make(shared,CKM_CONE,()=>ckmGauss(f));if(ckmThroughBridge(this.world,c)===null)r=c;}
      plan.push(r??make([0,0],[0,0],()=>0));   // the aimed arc itself was proved clear by ckmClearShot
    }
    g.ckm={phase:'fire_burst',startedAt:clock,visible:g.ckm.visible,
      burstPlan:{policy:'live',startedAt:clock,rounds:CKM_BURST_ROUNDS,interval:CKM_INTERVAL,emitted:0,landed:0,target:target.id,plan}};
    f.bursts++;f.engagedUntil=clock+CKM_HOLD_SEC;f.nextAt=clock+CKM_BURST_SEC+CKM_COOLDOWN[0]+(CKM_COOLDOWN[1]-CKM_COOLDOWN[0])*ckmNext(f);
    this.emitCKMRounds(g);
  }
  emitCKMRounds(g){
    const b=g.ckm.burstPlan,f=g.ckmFire;
    while(b.emitted<b.rounds&&b.plan[b.emitted].firedAt<=this.clock+1e-9){
      const r=b.plan[b.emitted++];f.belt=Math.max(0,f.belt-1);
      if(b.emitted===1)this.emit({type:'ally-fire',by:g.id,weapon:r.weapon,origin:{x:r.ox,y:r.oy,z:r.oz},rounds:b.rounds,interval:b.interval,at:r.firedAt});
    }
  }
  /** Rounds land in order at firedAt + range / ROUND_SPEED; the plan goes away with its last round. */
  landCKMRounds(){
    const g=this.actors.find(a=>a.id==='ckm_gunner'),b=g?.ckm?.burstPlan;if(b?.policy!=='live')return;
    while(b.landed<b.emitted&&b.plan[b.landed].arriveAt<=this.clock)this.ckmImpact(b.plan[b.landed++]);
    if(b.landed>=b.rounds)delete g.ckm.burstPlan;
  }
  /**
   * What one landed round does to EVERY living German (the MG34 gunners included; they are only never chosen as a target, see ckmTarget), through the existing
   * paths: a hit damages (part multiplier, recordDamage); a pass within NEAR_MISS suppresses. An MG34 gunner hit or suppressed goes through updateMG34Posture,
   * exactly as when the player's fire reaches him.
   */
  ckmImpact(r){
    const targets=this.enemies.filter(a=>a.alive&&a.active),hit=traceRound(this.world,r,targets),source={x:r.ox,z:r.oz};
    if(hit.actor){
      const a=hit.actor,health=a.health,wasAlive=a.alive;
      a.health=Math.max(0,a.health-CKM_DAMAGE*hit.multiplier);a.alive=a.health>0;a.state=a.alive?'HIT_REACTION':'DOWN';
      recordDamage(a,health,wasAlive,this.clock,source);this.updateMG34Posture(a);
    }
    for(const a of targets){
      if(!a.alive||(Math.abs(a.x-hit.point.x)>80&&Math.abs(a.x-r.ax)>80)||closestApproach(r,hit.t,{x:a.x,y:a.y+.9,z:a.z})>NEAR_MISS)continue;
      const previousUntil=a.suppressedUntil;a.suppressedUntil=Math.max(a.suppressedUntil,this.clock+CKM_SUPPRESS_SEC);
      recordSuppression(a,previousUntil,this.clock);this.updateMG34Posture(a);
    }
  }
  /** Read-only diagnostics of the gun (never saved): phase, belt, cooldown, the stoppages so far (and when the one under way clears) and the burst in progress. */
  get ckm(){
    const g=this.actor('ckm_gunner'),f=g?.ckmFire,b=g?.ckm?.burstPlan;
    return g?{phase:g.ckm.phase,startedAt:g.ckm.startedAt,belt:f?.belt??null,bursts:f?.bursts??null,nextAt:f?.nextAt??null,engagedUntil:f?.engagedUntil??null,
      jams:f?f.jams??0:null,clearAt:g.ckm.clearAt??null,
      plan:b?.policy==='live'?{target:b.target,emitted:b.emitted,landed:b.landed,rounds:b.rounds,startedAt:b.startedAt}:null}:null;
  }
  updateActors(dt){
    // Measure only this movement pass: scene staging/offscreen recovery are not footsteps.
    const motionBefore=this.actors.map(a=>({x:a.x,z:a.z}));
    this.interruptStationEvacuation();
    this.interruptCarry();updateYard(this.actors,this.battleClock,this.clock,this.world);
    const playerPatient=this.actor('jozef_bak');
    if(playerPatient.carriedBy===this.player.id&&playerPatient.carry){const c=playerPatient.carry;
      if(this.clock-c.startedAt>=c.duration){if(c.phase==='pickup')playerPatient.carry={phase:'carry',startedAt:c.startedAt+c.duration,duration:1.6};
        else if(c.phase==='putdown'){playerPatient.carriedBy=null;delete playerPatient.carry;const aid=this.world.point('aid_position');playerPatient.x=aid.x-1.2;playerPatient.z=aid.z+.6;playerPatient.y=this.world.heightAt(playerPatient.x,playerPatient.z);}}
    }
    const retreat=this.consumedEvent(E('east_demolition')),holding=this.holdingEast();
    const sapperNow=sapperPhase(this);   // R3-a: the phase of the sappers' operation (src/game/m01-sappers.js), decided once before anyone walks
    this.holdEastPlatoon();this.formRearguard();
    // Slice 3 (2026-10-22): the section's bounds along the corridor (src/game/m01-squad.js), decided once before anyone walks; null before the east demolition and at the roll call.
    const squad=retreat&&this.mission.phase!=='OUTRO'?this.stepSquad():null;
    // Slice 4 / R2-a (2026-10-24, src/game/m01-section.js): from the first bomb of 04:34 to the east demolition the section sees, calls, reacts and is ordered; null outside that window.
    const section=this.stepSection(),sectionCtx={stageSlots:STAGE.squad.slots};
    // R1-b (2026-10-25, src/game/m01-opening.js): until the first bomb of 04:34 each man near the opening route has an act of his own (actor.act), the runner walks his errands and the sapper team walks the
    // cable that is not cut yet; null from the first bomb on.
    const opening=updateOpening(this,dt);
    // T47: the ckm gunner decides first (his own saved stream, never this.rng); the other two men then copy his phase.
    const gunner=this.actors.find(a=>a.id==='ckm_gunner');
    this.updateCKMGunner(gunner,retreat);
    const bursting=Boolean(gunner?.alive&&gunner.active&&gunner.ckm.phase==='fire_burst'&&gunner.ckm.burstPlan?.policy==='live');
    for(const a of this.actors){
      if(a.displayOnly)continue;
      if(a.ckm){a.ckm.visible=!this.consumedEvent(E('west_demolition'));
        // A typed plan of the old disabled policy (TASK D; older saves) cannot emit rounds/flash and returns to ordinary aim before activity.
        // Only a live plan of the gunner (T47), and the two men copying his burst, keep fire_burst.
        if(a.ckm.phase==='fire_burst'&&!(a.id==='ckm_gunner'?a.ckm.burstPlan?.policy==='live':bursting))a.ckm={phase:'aim',startedAt:this.clock,visible:a.ckm.visible};
        if(a.ckm.burstPlan&&a.ckm.burstPlan.policy!=='live')delete a.ckm.burstPlan;   // an inert typed plan of the old disabled policy never outlives the first tick
        if(!a.alive||!a.active)delete a.ckm.burstPlan;
        // A man who falls (or leaves the scene) in the middle of a stoppage does not keep a clearance nobody is working: his record goes back to aim, like his plan above.
        if(a.ckm.phase==='stoppage'&&(!a.alive||!a.active))a.ckm={phase:'aim',startedAt:this.clock,visible:a.ckm.visible};
      }
      a.shot=Math.max(0,a.shot-dt);this.updateMG34Posture(a);if(!a.alive||!a.active)continue;
      if(proneGunner(a)&&a.mg34Prone.phase==='exit')continue;
      if(a.team==='enemy')a.crouched=this.clock<a.suppressedUntil||this.gateKneels(a)||this.deckKneels(a);   // T38: gate riflemen kneel until they rise to shoot; slice 2: so do the deck men in cover
      if(a.group==='grp_ckm_crew'){
        // An unfinished burst plan is dropped here: the crew leaves the gun (no new round is issued after the demolition).
        if(retreat&&CKM_PHASES.includes(a.ckm.phase))a.ckm={phase:'abandon',startedAt:this.clock,visible:a.ckm.visible};   // (a stoppage under way too: the crew leaves the jammed gun)
        if(!retreat&&this.battleClock>=CKM_FIRE_FROM&&a.id!=='ckm_gunner'){
          // The gunner's phase (live fire, a stoppage with its clearAt, or the quiet cycle when nobody is engaged) is copied; with the gunner down the old quiet cycle runs alone.
          const lead=gunner?.alive&&gunner.active&&CKM_PHASES.includes(gunner.ckm.phase)?gunner.ckm:ckmQuiet(this.battleClock,this.clock);
          if(a.ckm.phase!==lead.phase||a.ckm.startedAt!==lead.startedAt)a.ckm={phase:lead.phase,startedAt:lead.startedAt,visible:a.ckm.visible,...(lead.clearAt!==undefined?{clearAt:lead.clearAt}:{})};
        }
        if(a.ckm.phase==='abandon'&&this.clock-a.ckm.startedAt>=CKM_ABANDON_SEC)
          a.ckm={phase:'retreat',startedAt:this.clock,visible:a.ckm.visible};
        if(a.ckm.phase==='retreat'){
          // T47: from the S2 post the way out is west along the embankment between the bridges (z 22..26, clear of both portals). A save made on the old
          // way out under the deck (z >= 33) keeps it, ramp included: legs to (9, 41.4) and (-14, 40), then the common way to the rally point.
          const i=CKM_IDS.indexOf(a.id),underDeck=a.z>=33&&a.x>-12,final=ckmFinal(i),
            target=underDeck?(a.x>10?{x:9,z:41.4}:{x:-14,z:40}):final;
          this.moveActor(a,target,dt);
          // Physical west passage of the old post: the cellar floor remains -3 until the exit, then a finite 12 m ramp reaches the road approach.
          if(underDeck&&a.x>-12)a.y=-3+3*Math.max(0,Math.min(1,(10-a.x)/12));
          if(a.state==='ADVANCE')a.state='RETREAT';
        }
        continue;
      }
      if(a.group==='grp_east_platoon'){
        if(holding){a.crouched=true;continue;}   // T23: parado no tabuleiro até à retirada das 06:00 (hold.until); T38: de joelhos no seu lugar
        if(a.rear&&a.rear.phase!=='released'){this.stepRearguard(a,dt);continue;}   // combat slice 2b: the rearguard holds the deck while the gate waits for it
        a.crouched=false;   // T38: na retirada levantam-se e correm
        // Etapas do recuo: portal rodoviário, sul do barracão e passagem pelo posto de disparo até junto da estação.
        // Os limiares ficam aquém dos pontos (moveActor pára a 0,8 m), para nenhum soldado ficar preso numa etapa.
        // O pelotão recua a correr sob fogo (5,5 m/s): ~1,3 km até à estação dentro da fase do corredor.
        const k=Number(a.id.split('_').at(-1));   // lugar próprio no fim, para não se sobreporem
        // No tabuleiro correm em fila junto à treliça norte: o lado sul fica livre para o fogo de cobertura ("Nos nossos, não!").
        const file={x:a.x-30,z:37.8+(k%2)*.35};
        this.moveActor(a,a.x>12?file:a.x>-105?{x:-110,z:40}:a.x>-230?{x:-235,z:30}:{x:-322-(k%4)*1.6,z:30+Math.floor(k/4)%6*1.3},dt,5.5);continue;
      }
      if(a.group==='grp_de_spans'){
        if(a.fallBack){this.stepFallBack(a);continue;}   // T48: marching to the close-up knot, whatever the fire; once there the men stay (REGROUP)
        if(a.state==='REGROUP')continue;
        if(a.deck&&!retreat){this.stepDeck(a,dt);continue;}   // combat slice 2: the deck assault (a man without the record keeps the old march below)
        const destination=retreat?1080:690;
        if(this.clock>=a.suppressedUntil){
          // A suppressed man stands still while the others walk on: nobody walks into the one who stands in his lane (NPC navigation, personal space).
          // ponytail: the spans stay a scripted straight march along x (no routes, no world.move); only the queue behind a man who stands is added.
          const x=a.x+Math.sign(destination-a.x)*Math.min(Math.abs(destination-a.x),dt*1.5);
          // The old retreat of saves made before T48 is not queued: its men all end on x 1080 by design (tests/m01-german-retreat.test.js).
          if(retreat||!this.bodiesNear(a,x,a.z,1).some(b=>dist(b,{x,z:a.z})<a.radius+b.radius-SEPARATION_SLACK&&dist(b,{x,z:a.z})<dist(b,a))){a.x=x;a.state=retreat?'RETREAT':'ADVANCE';}
          else a.state='GUARD';   // waiting behind the man who stands: on guard, not walking in place
        }
        continue;
      }
      if(a.task==='evacuate_bak'){this.evacuate(a,dt);continue;}
      if(a.task==='evacuate_station_wounded'){this.evacuateStation(a,dt);continue;}
      if(a.task==='stay_with_bak'||(this.mission.phase==='OUTRO'&&a.team==='ally'))continue;   // chamada: ninguém sai do lugar
      if(section&&sectionWalk(this,section,a,dt,sectionCtx))continue;   // slice 4: the pair moves between posts (shift, return, the road deck); false for everybody else and for the pair at the squad post
      if(opening&&openingWalk(this,opening,a,dt))continue;   // R1-b: the sapper team walks the cable and rests at its camp until the shelter time (04:33:30); false for everybody else
      if(squad&&this.squadWalk(a,squad,dt))continue;   // slice 3: a man of a fire team bounds or holds; Zieliński comes to the player at the end of the escort (SP-08)
      // R3-a review (2026-10-25, src/game/m01-retreat.js): in the retreat each man of the section walks to a place of his own near the old retreat point (-170, 22), not to that one point
      // where they stopped inside each other's personal space (a walker stops 0.8 m short of his goal and nothing parts men who stand) and the sergeant could not get out of the pile.
      const post=retreat&&a.team==='ally'&&!a.civilian&&a.state!=='WOUNDED'?retreatSlot(a.id):null;
      if(post)a.target={x:post.x,z:post.z};
      if(this.timers.escort&&a.id==='marek_zielinski')a.target=this.player;
      this.stageSection(a);
      // Sappers: kneeling at the cable until called to the second cut (T38), kneeling again once they reach the west after the retreat (not under fire there); prone is presentation (T07/T38).
      // R3-a: from the call to the retreat the team carries out its operation (src/game/m01-sappers.js): each man walks to or holds his place of the phase, at the pace of the phase.
      let pace,creep=null;
      if(a.role==='ENGINEER'){
        this.sapperShelter(a);
        delete a.coverRun;   // (set again below on the ticks of a run for cover)
        const goal=sapperGoal(this,a,sapperNow);
        if(goal.mode==='none')a.crouched=this.active('cover_repair')&&dist(a,this.world.point('repair_site_2'))<6||!a.target||retreat&&a.state==='GUARD';
        else({pace,creep}=this.sapperSet(a,goal));
        if(this.clock<a.suppressedUntil){
          // R3-a: suppressed or shaken (a pin, a bomb), the stage is interrupted. If a cover node lies within seek.coverM he makes for it by his own decision (the lee side of the nearest one) and lies down there;
          // otherwise he goes down where he is, as before. The stage resumes where it left off, from his place of the stage, when the suppression ends. (Not in the camp or the retreat.)
          const cover=goal.mode==='none'?null:sapperCover(this.world,a);
          if(cover){a.target=cover;a.crouched=false;a.coverRun=true;this.moveActor(a,cover,dt,SAPPERS.seek.speed);}   // coverRun: drawn running, not prone, until he is behind it
          else if(goal.mode!=='none')a.state='GUARD';   // he stopped where he was: no longer «on the move»
          continue;
        }
        if(creep)this.sapperCreep(a,creep,dt);
      }
      const arriving=post&&a.state==='ADVANCE';
      if(a.target&&(!proneGunner(a)||a.mg34Prone.phase==='standing'))this.moveActor(a,a.target,dt,pace);
      if(arriving&&a.state==='GUARD'&&post.facing!==undefined&&dist(a,post)<.8)a.facing=post.facing;   // on arrival at his place he turns to the river, once (as the squad's men do at their posts)
    }
    for(const a of this.actors)if(a.carriedBy){
      const c=this.actor(a.carriedBy)??(a.carriedBy===this.player.id?this.player:null);
      if(!c?.alive||!c.active){a.carriedBy=null;a.y=this.world.heightAt(a.x,a.z);continue;}
      if(a.task==='station_wounded'){
        // The casualty trails a backward-walking medic, at ground height rather than at the shoulder socket.
        a.facing=c.facing;a.x=c.x+Math.cos(c.facing)*STATION_DRAG_OFFSET;a.z=c.z+Math.sin(c.facing)*STATION_DRAG_OFFSET;
        a.y=this.world.heightAt(a.x,a.z);continue;
      }
      // Ferido ao ombro (presentação deriva só destes dados): atravessado sobre o carregador, um pouco atrás.
      const carry=a.carry,age=carry?Math.min(1,Math.max(0,(this.clock-carry.startedAt)/carry.duration)):1;
      const lift=carry?.phase==='pickup'?age:carry?.phase==='putdown'?1-age:1;
      a.facing=c.facing+Math.PI/2;
      a.x=c.x-Math.cos(c.facing)*.25;a.z=c.z-Math.sin(c.facing)*.25;a.y=c.y+1.15*lift;
    }
    if(this.timers.escort){const leader=this.actor('marek_zielinski');
      if(dist(leader,this.player)<3){this.moveBody(-dt*3,0,0);   // a push (dt 0): gravity is advanced once, by the player's own move of this tick
        if(!this.timers.escortSpoke){this.timers.escortSpoke=true;this.message('Zieliński: venha comigo, para oeste!');}}
      if(this.player.x<-95)this.timers.escort=false;
    }
    // O primeiro homem do pelotão que passa pelo jogador grita o que vem atrás deles (dlg_m01_040, "soldado do pelotão leste passando").
    if(this.consumedEvent(E('germans_on_east_spans'))&&this.withdrawingPlatoon().some(a=>dist(a,this.player)<25))this.line('dlg_m01_040');
    if(this.consumedEvent(E('germans_on_east_spans'))&&!retreat){
      // cover_withdrawal.mechanic: cada 20 s de relógio sem supressão sobre os alemães do tabuleiro, um tiro certeiro no último
      // homem do pelotão (baixa por ID ao chegar). Enquanto esse tiro voa, a contagem espera por ele: recomeça quando ele chega, por isso
      // as baixas ficam a pelo menos 20 s de relógio umas das outras («intervalo mínimo de 20 s de relógio entre baixas»), também quando o
      // relógio passa de 8x para 1x durante o voo (06:09:00, a 60 s da demolição leste).
      if(this.enemyFire.rounds.some(r=>r.victim))this.timers.withdrawalCasualty=this.battleClock;
      else if(this.battleClock-this.timers.withdrawalCasualty>=20){
        const spans=this.enemies.filter(a=>a.group==='grp_de_spans'&&a.alive&&a.active);
        this.timers.withdrawalCasualty=this.battleClock;if(!spans.some(a=>(a.playerSuppressedUntil??0)>this.clock))this.lethalShot(spans);   // R2-b: only the player's covering fire shields the platoon (the Poles' own fire does not)
      }
    }
    updateMotion(this.actors,motionBefore,dt,this.clock);
    updateLoaders(this.actors,this.clock);updateActorDetails(this.actors,this.clock,this.world);
  }
  /** Slice 3: the section's bound of this tick (src/game/m01-squad.js); the callouts go through the bark director (trigger squadMove). */
  stepSquad(){
    return updateSquad(this,{stageSlots:STAGE.squad.slots,carrier:escortSubject(this),east:this.consumed[E('east_demolition')],say:node=>node==='order'?this.line('dlg_m01_155'):barkTrigger(this,'squadMove',{node})});   // the first order is scripted (always said), the rest are callouts
  }
  /**
   * Slice 3: one man of a fire team in the retreat: he runs to his next post while his team bounds, otherwise he holds his slot there, kneeling and facing the river.
   * SP-08: Zieliński (not a team man) comes to the player at the end of the escort and stays beside him for the head beat of the west pre-roll. False: not handled here.
   */
  squadWalk(a,q,dt){
    if(a.id==='marek_zielinski'){
      if(this.timers.escort)return false;   // the old fetch of a player left in the demolition zone keeps its own walk
      const join=zielinskiJoinPoint(this);
      if(join){a.crouched=false;a.target=join;this.moveActor(a,join,dt);return true;}
      if(this.consumedEvent(E('west_demolition'))&&corridorRecord(this)&&a.x<CORRIDOR.zielinskiJoinX){a.state='GUARD';return true;}   // he stays beside the player after the blast
      return false;
    }
    if(!SQUAD_IDS.includes(a.id))return false;
    const team=SQUAD.teams.findIndex(t=>t.includes(a.id)),slot=squadSlot(STAGE.squad.slots,a.id,teamPost(q,team));
    // His target is the slot he walks to (as every staged man's, T38: a target 0.8 m away or more means he is leaving and stands); none while he holds.
    if(squadMoving(q,a)){a.crouched=false;a.target=slot;this.moveActor(a,slot,dt,SQUAD.pace);return true;}
    if(dist(a,slot)>=.8){a.crouched=false;a.target=slot;this.moveActor(a,slot,dt);return true;}
    if(a.state!=='GUARD')a.facing=0;   // he turns to the river once, on arrival
    a.target=null;a.state='GUARD';this.squadPosture(a);return true;
  }
  /** Slice 3: a fire-team man's gameplay crouch. Moving or walking in: up. Holding: he kneels; Kowal rises over his cover riseBeforeSec before each look and holdAfterSec after each
   *  covering burst (the T38 rkm rule). Also called by stageSection, so the rkm's end-of-tick posture follows his cooldown as before 06:10. */
  squadPosture(a){
    if(squadMoving(this.timers.squad,a)||a.target){a.crouched=false;return;}
    const rkm=STAGE.squad.rkm,up=a.id===rkm.actor&&this.kowalCovers()&&(a.cooldown<=rkm.riseBeforeSec||this.clock-a.firedAt<rkm.holdAfterSec);
    a.crouched=!up;
  }
  /** Slice 3: Kowal covers the escort now (he holds a post, SP-08 escort phase, not in the German silence or the roll call). Read by squadWalk and squadCoverFire. */
  kowalCovers(){
    const q=this.timers.squad,k=this.actor('szymon_kowal');
    return Boolean(q)&&k.alive&&k.active&&!squadMoving(q,k)&&!this.germanSilence()&&this.mission.phase!=='OUTRO'&&corridorRecord(this)?.phase==='escort';
  }
  /**
   * R1-b: where a burst of Kowal's rkm lands, for the presentation only (the `end` of its `npc-shot`, with `hit:false`): on the ground just past the German it is aimed at, along the line from the gun. The burst
   * is display-grade suppression (the target's suppressedUntil; no round is traced and nobody is struck), so this point decides nothing and draws no random number: the impact dust beside the German is all it gives.
   */
  kowalBurstEnd(kowal,target){
    const dx=target.x-kowal.x,dz=target.z-kowal.z,d=Math.hypot(dx,dz)||1;
    return {x:target.x+dx/d*1.2,y:target.y+.05,z:target.z+dz/d*1.2};
  }
  /**
   * Slice 3: Kowal covers the escort from the post he holds. While the escort lasts (SP-08) a gate German who fired in the last SQUAD.cover.freshSec seconds and whom he sees gets
   * an rkm burst: the suppression, cadence and magazine of kowalFire, drawn from his own AI stream; the empty magazine is changed for real (line 029). No round is traced.
   */
  squadCoverFire(){
    const kowal=this.actor('szymon_kowal');
    if(kowal.cooldown>0||!this.kowalCovers())return;
    const ai=kowal.ai,u=ai?()=>aiNext(ai):()=>.5;
    const target=this.enemies.filter(a=>a.group==='grp_de_east'&&gateShooter(a)&&a.alive&&a.active&&this.clock-a.firedAt<SQUAD.cover.freshSec).sort((a,b)=>b.firedAt-a.firedAt)
      .find(a=>this.world.lineOfSight(kowal,a));
    if(!target){kowal.cooldown=SQUAD.cover.lookSec[0]+SQUAD.cover.lookSec[1]*u();return;}
    let n=Math.min(kowal.rounds,2+Math.floor(u()*2)+Math.floor(u()*2.2));if(kowal.rounds-n===1)n+=n<5?1:-1;
    kowal.cooldown=n*.11+3.4+2.8*u();if(ai)ai.target=target.id;
    kowal.shot=Math.max(.25,n*.11);kowal.firedAt=this.clock;kowal.facing=Math.atan2(target.z-kowal.z,target.x-kowal.x);kowal.rounds-=n;kowal.crouched=false;   // up over his cover for the burst
    const previousUntil=target.suppressedUntil;
    target.suppressedUntil=Math.max(target.suppressedUntil,this.clock+1.4+.2*n);this.updateMG34Posture(target);this.emit({type:'npc-shot',weapon:'rkm_wz28',point:eyePosition(kowal),rounds:n,end:this.kowalBurstEnd(kowal,target),hit:false});
    recordSuppression(target,previousUntil,this.clock);
    if(kowal.rounds<=0){kowal.rounds=20;kowal.cooldown=5+u();if(dist(kowal,this.player)<120)this.line('dlg_m01_029',`dlg_m01_029:${Math.floor(this.clock/90)}`);}
  }
  combatCall(message){if(this.clock<this.timers.nextCombatCall)return;this.timers.nextCombatCall=this.clock+4;this.message(message);}
  updateCombat(dt){
    if(this.mission.phase==='OUTRO')return;
    const retreat=this.consumedEvent(E('east_demolition')),withdrawal=this.consumedEvent(E('east_platoon_withdraws'))&&!retreat;
    for(const a of this.enemies){
      this.updateMG34Posture(a);if(!a.alive||!a.active)continue;
      a.cooldown-=dt;
      if(proneGunner(a)){this.emitMG34Rounds(a);if(!canMG34Fire(a))continue;}
      // Deitados: só voltam a disparar depois de a supressão acabar e de se recomporem (a guarnição da MG volta à arma).
      if(this.clock<a.suppressedUntil){if(a.ai)this.aiPinned(a);a.cooldown=Math.max(a.cooldown,a.suppressedUntil-this.clock+(a.weapon==='mg34'?2.5:1.2)+(a.ai?.recover??0));continue;}
      if(a.cooldown>0)continue;
      if(a.group==='grp_de_spans'){if(a.deck)this.deckFire(a,retreat);else this.spansFire(a,retreat);}else this.eastFire(a,retreat,withdrawal);
    }
    this.attritionTick();this.kowalFire(dt);this.squadCoverFire();this.rearguardFire(dt);this.landRounds();this.landCKMRounds();this.stageGateRiflemen();this.stageRearguard();
    const rkm=this.actor(STAGE.squad.rkm.actor);if(rkm.alive&&rkm.active&&this.mission.phase!=='OUTRO')this.stageSection(rkm);   // T38: up or down after his burst
    this.afterSection();   // slice 4: the answers of the section that are due (display-grade rifle shots) and the postures its reactions ask for, on top of T38's
    updateDisplayFire(this.display,{clock:this.clock,battleClock:this.battleClock,actors:this.actors,consumedEvent:id=>this.consumedEvent(id),heightAt:(x,z)=>this.world.heightAt(x,z)},dt);
  }
  /**
   * T38: a staged section man kneels at his slot behind the sandbags once the post is under fire; leaving it (a target elsewhere) he stands.
   * The rkm gunner rises over the sandbags rkm.riseBeforeSec before each burst and stays up rkm.holdAfterSec after it (the burst clip).
   */
  stageSection(a){
    // Slice 3 (2026-10-22): in the retreat a fire-team man's posture is the bound's (squadPosture), not his slot at the squad post's.
    if(this.timers.squad&&SQUAD_IDS.includes(a.id)&&this.mission.phase!=='OUTRO'){this.squadPosture(a);return;}
    const slot=STAGE.squad.slots[a.id];if(!slot||!this.consumedEvent(STAGE.squad.underFireFrom))return;
    const rkm=STAGE.squad.rkm,firing=a.id===rkm.actor&&this.consumedEvent(E('train963_arrives'))&&!this.consumedEvent(E('east_demolition'))&&
      (a.cooldown<=rkm.riseBeforeSec||this.clock-a.firedAt<rkm.holdAfterSec);
    a.crouched=a.state!=='WOUNDED'&&!a.carriedBy&&!a.task&&dist(a,slot)<.5&&!(a.target&&dist(a.target,a)>=.8)&&!firing;
  }
  /** R1-a: the sappers have been called to the second cut (the player found them at repair_site_1: find_sappers done) or the repair is already further on. The order to go is given once, then; the shelter never undoes it. */
  sappersCalled(){return this.done('find_sappers')||['fetch_material','cover_repair'].some(n=>this.active(n)||this.done(n));}
  /**
   * R1-a: the sappers of the cable camp take cover while the bomb that cuts the cable falls (sapperShelterPlan): from `from` they walk to the sandbags of the section's post, and
   * `returnAfterSec` real seconds after evt_m01_nowicki_lost they walk back to their places at the cable. A pure function of the battle clock, the clock and the saved time of that event:
   * no saved state of its own, so a save made at any moment of the walk goes on as it was. Never after `until` and never once the player has called them to the second cut (sappersCalled:
   * that order is given once, and the shelter must not undo it). No draw.
   */
  sapperShelter(a){
    const haven=SHELTER.slots[a.id],home=STAGE.sappers[a.id];
    if(!haven||!home||!a.alive||!a.active||this.battleClock<SHELTER.from||this.battleClock>=SHELTER.until||this.sappersCalled())return;
    const lostAt=this.consumed[E('nowicki_lost')],goal=lostAt!==undefined&&this.clock>=lostAt+SHELTER.returnAfterSec?home:haven;
    if(dist(a,goal)<1){if(a.target){a.target=null;delete a.nav;}a.facing=goal.facing;a.state='GUARD';return;}   // there: kneeling (no target), on guard, facing as staged
    if(!a.target||Math.abs(a.target.x-goal.x)>.01||Math.abs(a.target.z-goal.z)>.01)a.target={x:goal.x,z:goal.z};
  }
  /**
   * R3-a: sets one sapper's target, posture and facing for the phase (sapperGoal): {pace, creep}. On the way (a walk, or more than 0.8 m from his place) he walks upright with the target he is going to;
   * at his place he has no target, kneels or stands as the phase says and faces as it says, and creeps the last centimetres onto the place (moveActor stops 0.8 m short). Draws nothing.
   */
  sapperSet(a,goal){
    if(goal.mode==='free'){a.target=null;a.crouched=false;a.facing=goal.face;a.state='GUARD';return {};}
    if(goal.mode==='walk'){a.target={x:goal.target.x,z:goal.target.z};a.crouched=false;return {pace:goal.speed};}
    const slot=goal.slot,d=dist(a,slot);
    if(d>=.8){a.target={x:slot.x,z:slot.z};a.crouched=false;return {pace:d>4?3.6:2};}
    a.target=null;a.crouched=goal.crouched;a.facing=goal.face??slot.facing;a.state='GUARD';
    return {creep:d>.03?slot:null};
  }
  /** R3-a: the last 0.8 m onto a work place, at 0.8 m/s, through the world's move (a wall still stops it). */
  sapperCreep(a,slot,dt){
    const d=dist(a,slot),step=Math.min(d,.8*dt);
    this.world.move(a,(slot.x-a.x)/d*step,(slot.z-a.z)/d*step);this.navigator.settle(a);
  }
  /** T38: after this tick's shots and suppression, each active gate rifleman kneels or stands as he will be drawn (and hit) until the next tick. */
  stageGateRiflemen(){for(const a of this.enemies)if(a.alive&&a.active&&(gateRifleman(a)||a.deck))a.crouched=this.clock<a.suppressedUntil||this.gateKneels(a)||this.deckKneels(a);}
  /**
   * T38: a gate rifleman kneels in cover and stands only to shoot: riseBeforeSec before his own cooldown runs out and holdAfterSec after his own
   * shot, and for each fixed-time attrition fall (T23) from its time until holdAfterSec after the man falls (the volley that kills him is fired
   * standing). Reads only gameplay data (cooldown, firedAt, the plan, the victim's state and his recorded death); writes nothing.
   */
  gateKneels(a){
    if(!gateRifleman(a))return false;
    const g=STAGE.gates;if(a.cooldown<=g.riseBeforeSec||this.clock-a.firedAt<g.holdAfterSec)return false;
    if(this.holdingEast())for(const e of EAST_FRONT.attrition){
      if(this.battleClock<e.at)break;const v=this.actor(e.victim);
      if(this.battleClock<e.cutoff&&v.active&&(v.alive||this.clock-v.diedAt<g.holdAfterSec))return false;
    }
    return true;
  }
  /** grp_de_east no dique: MG34 sobre o reparo/jogador/secção; atiradores sobretudo sobre a cabeça de ponte leste até às 06:00. */
  eastFire(a,retreat,withdrawal){
    const p=this.player,r=()=>this.rng.next(),mg=a.weapon==='mg34',sees=t=>this.world.lineOfSight(a,t),west=inside(p,this.world.layout.bounds.playable);
    let target=null,kind=null;
    if(retreat){   // s2 german_regroup: fogo esporádico da margem leste depois da demolição
      const u=r();a.cooldown=(mg?16:32)+u*20;if(gateShooter(a)&&west&&sees(p)){target=p;kind='player';}
      // SP-08 (2026-10-22): in the escort a man of the east bank who sees Dudek with Bąk (the gates, or the dike where it looks down the road approach) shoots at him
      // ('squad' rounds pin, never wound an ally) and remembers where (ai.seen, who 'leon_dudek'); for ESCORT_SEARCH_SEC after he lost them in the dead ground of the road
      // approach he fires where he saw them last ('area' rounds), at the escort cadence; one who sees nobody looks again in 2-5 s instead of a whole cycle. The same single draw.
      else{const e=escortTarget(this),seen=a.ai?.seen;
        if(e&&sees(e)){target=e;kind='squad';if(a.ai)a.ai.seen={x:e.x,y:e.y,z:e.z,at:this.clock,who:e.id};a.cooldown=(mg?ESCORT_FIRE_SEC[0]:ESCORT_FIRE_SEC[1])+u*ESCORT_FIRE_SEC[2];}
        else if(e&&seen?.who===e.id&&this.clock-seen.at<ESCORT_SEARCH_SEC){target={x:seen.x,y:seen.y,z:seen.z};kind='area';a.cooldown=(mg?ESCORT_FIRE_SEC[0]:ESCORT_FIRE_SEC[1])+u*ESCORT_FIRE_SEC[2];}
        else if(e)a.cooldown=2+u*3;}
    }else if(a.ai)return this.aiFire(a,withdrawal,sees,west);   // combat AI slice 1: peeks, burst groups, threat (until the east demolition)
    else if(withdrawal){
      a.cooldown=mg?6+r()*5:8+r()*10;
      const near=this.withdrawingPlatoon().filter(s=>s.x>650&&dist(s,a)<520),s=near.length?near[Math.floor(r()*near.length)]:null;
      if(s&&r()<.7&&sees(s)){target=s;kind='platoon';}else if(gateShooter(a)&&west&&sees(p)){target=p;kind='player';}
    }else if(mg&&a.id==='de_east_0'&&this.active('cover_repair')){
      a.cooldown=(6+r()*4)*(this.timers.fireEase?4:1);target=this.repairAim();kind='repair';
    }else if(mg){
      a.cooldown=8+r()*5;const kowal=this.actor('szymon_kowal');
      if(west&&sees(p)){target=p;kind='player';}else if(kowal.alive&&kowal.active&&sees(kowal)){target=kowal;kind='squad';}
      else{target=this.world.point('forward_post');kind='area';}
    }else{
      a.cooldown=9+r()*9;
      // Só os atiradores dos portões (à vista da margem oeste) disparam sobre ela; os do dique ficam na cabeça de ponte leste.
      if(!gateShooter(a)||r()<this.level.rifleGateEastThreshold){target=this.eastBridgeheadPoint(r);kind='east';}   // o pelotão leste ainda segura a cabeça de ponte leste
      else if(this.active('cover_repair')&&r()<.45){if(this.timers.fireEase)return;target=this.repairAim();kind='repair';}
      else if(west&&sees(p)){target=p;kind='player';}
    }
    if(target&&M01_WEST_BANK_KINDS.includes(kind))a.cooldown*=this.level.cooldownScale;   // H9 D2: after the draw; x1 on recruta
    if(!target||this.germanSilence())return;   // T48: the cadence above is re-armed as usual, but nothing is shot, said or flagged in the silence
    this.burst(a,target,kind,mg?{rounds:4+Math.floor(r()*3),bias:[1.2,.8],cone:[.7,.5],tracer:kind!=='east'}:{rounds:1,bias:[2.5,1.6],cone:[0,0]});
    if(kind==='repair'&&west)this.line('dlg_m01_026');
    if(mg&&['player','squad'].includes(kind)&&west){this.line('co_m01_enemy_mg_fire_on_squad');if(this.clock-(this.timers.firstMgAt??this.clock)>8)this.line('dlg_m01_027');this.timers.firstMgAt??=this.clock;}
  }
  /**
   * Combat AI slice 1: one trigger of a German of grp_de_east before the east demolition (cooldown run out, not suppressed). A trigger opens a peek (rifle) or a
   * burst group (MG34) when none is open, picks a target by line of sight and threat (aiTarget), fires through the usual burst path and sets the time to the
   * next trigger: inside the peek/group a bolt or a short pause, after it a skewed cover pause whose mean keeps the old rate of fire (dike rifles 13.5 s per round;
   * gate rifles 16.5 s, since they now always have a target where the old draw often fired nothing, measured 20.8 s per shot; 13 s in the withdrawal; MG34 10.5 s per burst, 8.5 s in the withdrawal, 8 s on the repair, x4 when the repair fire eases). Draws only from a.ai.rng.
   */
  aiFire(a,withdrawal,sees,west){
    const ai=a.ai,u=()=>aiNext(ai),p=this.player,mg=a.weapon==='mg34';
    // The player fired in the last AI_THREAT_SEC seconds: his flash makes him the target a German prefers.
    const threat=west&&this.clock*1000-p.weaponShotAt<AI_THREAT_SEC*1000;
    // Reload-aware: the MG34 holds while its loader changes the belt; a rifleman with an empty clip reloads in cover before he peeks again.
    if(mg&&a.mg34Prone?.phase==='reload'){ai.peek=0;a.cooldown=Math.max(.3,a.mg34Prone.startedAt+4.8-this.clock+.3);return;}
    if(!mg&&!(a.rounds>0)){
      ai.peek=0;if(!a.reload)a.reload={startedAt:this.clock,duration:3.4,mode:'clip'};
      a.cooldown=Math.max(.3,a.reload.startedAt+a.reload.duration-this.clock)+.4+u();return;
    }
    const open=ai.peek===0,pick=this.aiTarget(a,withdrawal,sees,west,threat);
    if(!pick){ai.peek=0;ai.target=null;a.cooldown=AI_RESCAN[0]+AI_RESCAN[1]*u();return;}   // nothing in sight: he stays down and looks again
    // The threat changes WHOM he shoots (aiTarget), never how much: a faster or longer answer to a player who covers the sappers from beside them pinned the
    // sappers more and made covering fire slower than ignoring the MG (tests/m01-cover-threat.test.js, tests/m01-cover-combat.test.js).
    if(open)ai.peek=mg?aiCount(ai,[.35,.45,.2]):aiCount(ai,[.4,.4,.2]);
    ai.target=pick.id;
    const k=this.clock<ai.shakenUntil?AI_SHAKEN_BIAS:1,rounds=mg?this.aiBurstRounds(ai,pick.kind):1;
    const fired=this.burst(a,pick.target,pick.roundKind??pick.kind,mg?{rounds,bias:[1.2*k,.8*k],cone:[.7,.5],tracer:pick.kind!=='east'}:{rounds:1,bias:[2.5*k,1.6*k],cone:[0,0]});
    ai.peek=Math.max(0,ai.peek-1);
    if(ai.peek>0&&(mg||a.rounds>0))a.cooldown=mg?rounds*MG34_INTERVAL+.45+.9*u():AI_BOLT[0]+AI_BOLT[1]*u();
    else{
      ai.peek=0;
      const base=withdrawal?(mg?8.5:13):mg?(a.id==='de_east_0'&&this.active('cover_repair')?8*(this.timers.fireEase?4:1):10.5):gateShooter(a)?16.5:13.5;
      // Mean rounds per peek 1.8 (bolt 2.25 s), bursts per group 1.85 (1.3 s apart): the cover pause keeps the old mean interval per round/burst.
      // ponytail: one log-normal around the old mean per role/phase; no intensity waves yet (a director would scale `base` by phase).
      let pause=aiPause(ai,mg?base*1.85-1.1:base*1.8-1.8,mg?3:4);
      // H9 D2: the level's cadence at the west bank, on the cover pause after the peek/group (the bolt and the burst stay physical); x1 on recruta.
      if(M01_WEST_BANK_KINDS.includes(pick.roundKind??pick.kind))pause*=this.level.cooldownScale;
      if(!mg&&!(a.rounds>0))pause=Math.max(pause,AI_RELOAD_COVER+u());   // the clip is changed in cover
      a.cooldown=pause;
    }
    if(!fired)return;
    if(pick.kind==='repair'&&west)this.line('dlg_m01_026');
    if(mg&&['player','squad'].includes(pick.kind)&&west){this.line('co_m01_enemy_mg_fire_on_squad');if(this.clock-(this.timers.firstMgAt??this.clock)>8)this.line('dlg_m01_027');this.timers.firstMgAt??=this.clock;}
  }
  /**
   * Target by line of sight and threat, weighted, from the man's own stream; the man he aimed at last keeps a triple weight while he can still take him.
   * Every rifleman: the T23 block of the held east platoon ('east', the show of fire that never lands). Gate riflemen (in sight of the west bank) also: the
   * sappers during the repair (not while it eases), the player if they see him, much more if he is the threat. MG34: the
   * repair for the gate MG during it, else the player or Kowal in sight, else searching fire where one of them was last seen (60 s), else the forward post.
   * Withdrawal: the men crossing the deck within 520 m, or the player.
   */
  aiTarget(a,withdrawal,sees,west,threat){
    const ai=a.ai,u=()=>aiNext(ai),p=this.player,mg=a.weapon==='mg34',gate=gateShooter(a),c=[];
    const add=(id,target,kind,w)=>c.push({id,target,kind,w:w*(id===ai.target?3:1)});
    // 2026-10-19 (bark director review B1): a sight of the player is remembered in the man's own record (ai.seen, who 'player'), riflemen too, so the director's peek
    // lines read what the AI already saw instead of tracing their own lines of sight every tick. Only the MG34's searching fire reads ai.seen, and it is set there as before.
    const seesPlayer=()=>{if(!(west&&sees(p)))return false;ai.seen={x:p.x,y:p.y,z:p.z,at:this.clock,who:'player'};return true;},sapper=()=>{const s=this.actors.filter(x=>x.role==='ENGINEER'&&x.alive&&x.active);
      return s.length?s[Math.floor(u()*s.length)]:this.world.point('repair_site_2');};
    if(withdrawal){
      const near=this.withdrawingPlatoon().filter(s=>s.x>650&&dist(s,a)<520),s=near.find(m=>m.id===ai.target)??(near.length?near[Math.floor(u()*near.length)]:null);
      if(s&&sees(s))add(s.id,s,'platoon',2.3);
      if((gate||mg)&&seesPlayer())add('player',p,'player',1+(threat?1.6:0));
      else if(!gate&&!mg&&this.dikeSeesDeckHolder(seesPlayer))add('player',p,'player',DIKE_DECK_PLAYER_WEIGHT+(threat?1.6:0));   // the 05:35 fill (below)
    }else if(mg){
      if(a.id==='de_east_0'&&this.active('cover_repair')){
        // H9 D2: on soldado/veterano a share of the gate MG's repair fire goes to a player he sees within withinSappersM of a working sapper (a draw only on those levels).
        const R=this.level.deEast0Repair;
        if(R.share>0&&west&&sees(p)&&this.actors.some(x=>x.role==='ENGINEER'&&x.alive&&x.active&&dist(x,p)<=R.withinSappersM)&&u()<R.share){
          ai.seen={x:p.x,y:p.y,z:p.z,at:this.clock,who:'player'};return {id:'player',target:p,kind:'player'};}
        const t=sapper();return {id:t.id??'repair_site_2',target:t,kind:'repair'};}
      const kowal=this.actor('szymon_kowal');
      // 2026-10-18 review fix: the sighting remembers WHO was seen (`who`), so searching fire on the player's last-seen spot leaves as fire at the player (round kind
      // 'player': the per-target player settings of H9 D2 apply to it) while its burst length, its callouts and its choice stay those of searching fire.
      if(seesPlayer()){ai.seen={x:p.x,y:p.y,z:p.z,at:this.clock,who:'player'};add('player',p,'player',1);}
      else if(kowal.alive&&kowal.active&&sees(kowal)){ai.seen={x:kowal.x,y:kowal.y,z:kowal.z,at:this.clock,who:kowal.id};add(kowal.id,kowal,'squad',1);}
      else{const recent=ai.seen&&this.clock-ai.seen.at<60,t=recent?ai.seen:this.world.point('forward_post');add('area',{x:t.x,y:t.y,z:t.z},'area',1);
        if(recent&&ai.seen.who==='player')c.at(-1).roundKind='player';}
    }else{
      // The T23 block where the held platoon kneels, three draws of the main stream as before (the T22 twin of tests/m01-east-front.test.js draws the same three).
      // ponytail: still aimed at a point of the block, not at a man, and still never lands (T23 data); the dike riflemen only get the new cadence.
      // H9 D2: rifleGateEastThreshold as the gate rifleman's 'east' weight (oddsWeight: recruta x1, soldado x.54, veterano x.33); a dike rifleman has no other choice here.
      add('east',this.eastBridgeheadPoint(()=>this.rng.next()),'east',gate?oddsWeight(this.level.rifleGateEastThreshold,M01_DIFFICULTY.recruta.rifleGateEastThreshold):1);
      if(gate&&this.active('cover_repair')&&!this.timers.fireEase){const t=sapper();add(t.id??'repair_site_2',t,'repair',.8);}
      if(gate&&seesPlayer())add('player',p,'player',.6+(threat?1.6:0));
      // 2026-10-19 (the empty stretch, owner complaint #9): from the deck post the player is in sight of the dike riflemen (de_east_14..), whose only target was the
      // east bridgehead block, so from 05:35 to the deck fight nothing came near him (131.5 s on the control route). A man of the section holding the road deck is a
      // target they take too, as the gate riflemen take the player in sight. Weight only: the same cadence, the same draws of his own stream.
      else if(!gate&&this.dikeSeesDeckHolder(seesPlayer))add('player',p,'player',DIKE_DECK_PLAYER_WEIGHT+(threat?1.6:0));
    }
    if(!c.length)return null;
    let x=u()*c.reduce((s,o)=>s+o.w,0);return c.find(o=>(x-=o.w)<0)??c.at(-1);
  }
  /** The 05:35 fill: the player holds the road deck (HOLD_AREA, the deck post) from hold_access to the east demolition, and this dike rifleman sees him. */
  dikeSeesDeckHolder(seesPlayer){
    return (this.active('hold_access')||this.active('cover_withdrawal'))&&inside(this.player,HOLD_AREA)&&seesPlayer();
  }
  /** MG34 burst length by target (the authored 4-7 round clips): a long burst may go to a man in sight, short ones to searching fire; mean 5 as before. */
  aiBurstRounds(ai,kind){const [lo,hi]=kind==='player'?[4,7]:kind==='area'?[4,5]:[4,6];return lo+Math.floor(aiNext(ai)*(hi-lo+1));}
  /**
   * A German (or Kowal) under fire: on a NEW suppression (not an extension of the one he is already under) he breaks his peek or burst group, draws how long
   * he stays down after it ends (`recover`: MG34 0-1.5 s, riflemen 0.5-3 s, on top of the existing 2.5/1.2 s) and is shaken (wider aim) until AI_SHAKEN_SEC after.
   */
  aiPinned(a){
    const ai=a.ai;if(!(a.suppressedUntil>ai.pinnedUntil))return;
    if(!(ai.pinnedUntil>this.clock)){ai.peek=0;ai.recover=a.weapon==='mg34'?1.5*aiNext(ai):.5+2.5*aiNext(ai);}
    ai.pinnedUntil=a.suppressedUntil;ai.shakenUntil=a.suppressedUntil+ai.recover+AI_SHAKEN_SEC;
  }
  /** grp_de_spans no tabuleiro: disparam sobre o último homem do pelotão e, às vezes, sobre o jogador. */
  spansFire(a,retreat){
    const r=()=>this.rng.next();a.cooldown=3+r()*3;if(retreat){a.cooldown=99;return;}
    const sees=t=>this.world.lineOfSight(a,t),last=this.withdrawingPlatoon().filter(s=>s.x<a.x).sort((x,y)=>y.x-x.x)[0];
    if(r()<this.level.spansPickPlayerThreshold&&sees(this.player)){this.burst(a,this.player,'player',{rounds:1,bias:[2,1.4],cone:[0,0]});a.cooldown*=this.level.cooldownScale;}
    else if(last&&sees(last))this.burst(a,last,'platoon',{rounds:1,bias:[2,1.4],cone:[0,0]});
  }
  /**
   * Combat slice 2, the deck assault (grp_de_spans.deckAssault in mission.json, src/game/m01-deck-assault.js). At evt_m01_germans_on_east_spans every man of the spans is
   * set on his entry place at the east end of the road deck (he was inactive and unseen until now) and gets his combat AI stream, derived from the main state of this tick
   * (read, never drawn), and his deck record. Writes actor data only.
   */
  beginDeckAssault(){
    for(const a of this.actors.filter(a=>a.group==='grp_de_spans'&&a.alive)){
      const e=deckEntry(a);Object.assign(a,{x:e.x,z:e.z,facing:Math.PI,state:'ADVANCE',crouched:false});a.y=this.world.heightAt(a.x,a.z);delete a.nav;
      a.ai=newAI(this.rng.state,aiIndex(a.id),a.suppressedUntil);
      a.deck={v:1,phase:'advance',node:0,until:this.clock,since:this.clock,t0:this.clock,pinned:0};
      a.playerSuppressedUntil=0;   // R2-b: until when the PLAYER's rifle keeps him down (the rule of the 20 s); suppressedUntil is anybody's
    }
  }
  /**
   * One man of the deck assault, every tick until the east demolition. Overwatch: run to his post on span 08 and stay there (clear). Assault: run the pursuit leg (stations
   * east of pursuitToX) without stopping, then bound: a rush of rushStations stations at rushSpeed, a COVER at the girder for a drawn coverSec, longer while he is suppressed
   * (but at most pinnedWaitMaxSec longer), until his forward limit, where he HOLDS for a drawn holdSec. He FALLS BACK to his place east of clearX, at a run, when the hold is
   * over or when the suppression he has taken in cover reaches breakPinnedSec, and with the whole squad when breakOut of the six are down or maxSec after the entry, whichever
   * comes first;
   * then he is CLEAR. He shoots only standing still (deckFire). Movement is the ordinary moveActor (navigator, local avoidance, queue). Draws only from a.ai.rng.
   */
  stepDeck(a,dt){
    const P=DECK_ASSAULT,T=P.tactics,d=a.deck,now=this.clock,over=deckRole(a)==='overwatch',u=()=>aiNext(a.ai),suppressed=now<a.suppressedUntil;
    if(suppressed&&(d.phase==='cover'||d.phase==='hold'))d.pinned+=dt;
    const set=(phase,until=now)=>{d.phase=phase;d.since=now;d.until=until;};
    // The squad breaks when breakOut of its six are down: the rest go back with them. Suppression alone slows a man (and in the end sends him back), it does not rout the squad.
    const out=P.assault.filter(id=>{const m=this.actor(id);return !m.alive||!m.active;}).length;
    const pursuit=d.phase==='advance'&&deckGoal(a).x>P.pursuitToX;
    // R2-b: at a line a man presses on to the next closing line while the Poles who hold the deck are pinned and nobody of the assault has fallen lately, or is pulled back one line by a casualty.
    if(!over&&d.phase==='hold'&&deckLines(a).length>1)this.deckLine(a,set,u);
    if(!over&&['advance','cover','hold'].includes(d.phase)){
      if(out>=P.breakOut||now-d.t0>=P.maxSec+this.deckExtraSec()||!pursuit&&(d.pinned>=P.breakPinnedSec||d.phase==='hold'&&now>=d.until)){
        set('fallback');a.ai.peek=0;
        if(!this.dialogueConsumed.includes('deck:fallback')){this.dialogueConsumed.push('deck:fallback');this.message('Recuam! Os alemães largam o tabuleiro.');}
      }
    }
    const goal=deckGoal(a),arrived=dist(a,goal)<.9;
    if(d.phase==='advance'||d.phase==='fallback'){
      if(!arrived){this.moveActor(a,goal,dt,P.rushSpeed);return;}
      a.state='GUARD';a.facing=Math.PI;a.cooldown=Math.max(a.cooldown,.6+.8*u());
      if(over||d.phase==='fallback'){set('clear');return;}
      if(goal.x>P.pursuitToX){d.node++;return;}   // the pursuit leg: on to the next station at once
      if(!this.dialogueConsumed.includes('deck:advance')){this.dialogueConsumed.push('deck:advance');this.message('Os alemães avançam pelo tabuleiro! Faça-os recuar a tiro.');}
      const hold=deckLineNumber(a)>0?T.closeHoldSec:P.holdSec;   // (a closing line is held for less than line 0)
      if(d.node>=deckLimitNode(a))set('hold',now+hold[0]+(hold[1]-hold[0])*u());
      else set('cover',now+P.coverSec[0]+(P.coverSec[1]-P.coverSec[0])*u());
      return;
    }
    if(d.phase==='cover'&&now>=d.until&&(!suppressed||now>=d.until+P.pinnedWaitMaxSec)){
      if(!this.deckMayRush(a))return;   // R2-b: on the closing lines the two girders bound in turn
      d.node=Math.min(deckLimitNode(a),d.node+P.rushStations);set('advance');a.ai.peek=0;a.crouched=false;
    }
  }
  /**
   * R2-b (2026-10-24), a man holding a line of the assault, every tick: a casualty on a closing line since he took his puts him back one line (his forward limit and his node go to the line behind;
   * he walks back to it at a run), the Poles pinned and no casualty for casualtyHoldSec put him on to the next closing line (a cover, then bounds like any other). Pure functions of the actors'
   * saved data (suppressedUntil of the pair and of the rearguard, diedAt of the dead); the man's own stream is drawn only for the cover that follows. No draw from this.rng.
   */
  deckLine(a,set,u){
    const P=DECK_ASSAULT,T=P.tactics,d=a.deck,now=this.clock,lines=deckLines(a),line=deckLineNumber(a),fell=this.deckLastCasualty();
    if(line>0&&this.deckLastCasualty(true)>d.since){
      const to=lines[line-1];if(line-1===0)delete d.lim;else d.lim=to;
      d.node=to;set('advance');a.ai.peek=0;a.crouched=false;a.facing=0;   // (he turns to the east: the section reads a man going back as a fall-back, not as a rush)
      this.emit({type:'deck-tactic',kind:'pullback',by:a.id,line:line-1,at:now});
    }else if(line<lines.length-1&&now-fell>=T.casualtyHoldSec&&this.deckPressure()>=T.pressure.share){
      d.lim=lines[line+1];set('cover',now+P.coverSec[0]+(P.coverSec[1]-P.coverSec[0])*u());
      this.emit({type:'deck-tactic',kind:'stage',by:a.id,line:line+1,at:now});
    }
  }
  /** The squad's deadline grows by closeExtraSec while any living man of the assault has a closing line as his forward limit (a function of the records, so it needs no saved key). */
  deckExtraSec(){
    for(const id of DECK_ASSAULT.assault){const m=this.actor(id);if(m.deck&&m.alive&&m.active&&deckLineNumber(m)>0)return DECK_ASSAULT.tactics.closeExtraSec;}
    return 0;
  }
  /** When the last man of the assault fell (his diedAt), -Infinity when none has (a test that kills a man by hand leaves diedAt at its default, which counts as long ago); with `forward`, only a man who fell
   *  on or west of his own line 0 (on a closing line: the ones who fell on the approach do not turn the front back). */
  deckLastCasualty(forward=false){
    let at=-Infinity;
    for(const id of DECK_ASSAULT.assault){const m=this.actor(id);if(!m.alive&&m.diedAt>0&&m.diedAt>at&&(!forward||m.x<=DECK_ASSAULT.limits[DECK_ASSAULT.assault.indexOf(id)]))at=m.diedAt;}
    return at;
  }
  /** A Pole who holds the deck against the assault: the section's pair at its deck post and the rearguard at its posts (present, on their feet, on the bridge). */
  isDeckDefender(a){return a.team==='ally'&&a.alive&&a.active&&!a.carriedBy&&a.state!=='WOUNDED'&&a.x>0&&(a.id==='staszek_pawlak'||a.id==='east_platoon_voice'||a.rear?.phase==='hold');}
  deckDefenders(){
    const out=[];
    for(const a of this.actors)if(this.isDeckDefender(a))out.push(a);
    return out;
  }
  /** The share of them under fire now or within tactics.pressure.windowSec (the suppression of a near miss is the sim's own: suppressedUntil); 0 when none of them is on the deck. */
  deckPressure(){
    const W=DECK_ASSAULT.tactics.pressure.windowSec,now=this.clock,men=this.deckDefenders();let n=0;
    for(const a of men)if(a.suppressedUntil>now-W)n++;
    return men.length?n/men.length:0;
  }
  /** On the closing lines the two girders bound in turn: a man whose cover is over waits (at most tactics.alternateWaitSec) while a man of the other girder is still on the run. Line 0 and before: no wait. */
  deckMayRush(a){
    const P=DECK_ASSAULT,T=P.tactics,d=a.deck,lines=deckLines(a);
    if(!(T.alternateWaitSec>0)||lines.length<2||d.node<lines[0]||this.clock-d.until>=T.alternateWaitSec)return true;
    const north=P.lanes[assaultIndex(a)][0]<40;
    for(const id of P.assault){
      const m=this.actor(id);if(m===a||!m.alive||!m.active||m.deck.phase!=='advance')continue;
      if((P.lanes[assaultIndex(m)][0]<40)!==north&&dist(m,deckGoal(m))>=.9)return false;
    }
    return true;
  }
  /** Combat slice 2: a deck man still in cover kneels at the girder, and stands up to shoot (riseBeforeSec before his trigger, holdAfterSec after his shot), as T38's gate riflemen. */
  deckKneels(a){
    const d=a.deck;if(!d||!['cover','hold','clear'].includes(d.phase)||this.consumedEvent(E('east_demolition')))return false;
    const f=DECK_ASSAULT.fire;return !(a.cooldown<=f.riseBeforeSec||this.clock-a.firedAt<f.holdAfterSec);
  }
  /** True when no man of the deck assault is alive west of clearX (readiness of the east demolition). A man without the record (an older save) is not one of them. */
  deckClear(){return this.actors.every(a=>a.group!=='grp_de_spans'||!a.deck||!a.alive||!a.active||deckRole(a)==='overwatch'||a.x>=DECK_ASSAULT.clearX);}
  /**
   * A trigger of a deck man (cooldown run out, not suppressed): the slice-1 cycle (aiFire) with the deck's own targets. Standing still only; a running man looks again soon.
   * A peek of 1-3 aimed rounds 1.7-2.8 s apart, then a skewed pause around fire.assaultPauseSec / overwatchPauseSec per round, never shorter than his clip reload.
   */
  deckFire(a,retreat){
    if(retreat){
      // SP-08 (2026-10-22): the men of the deck assault who regrouped on the surviving spans fire on the escort when they see Dudek with Bąk (their own AI stream); otherwise,
      // as before, nothing (looked at again every 2 s once the corridor task exists, every 99 s before it).
      const e=escortTarget(this);
      if(!e||a.state!=='REGROUP'||!(a.rounds>0)||!this.world.lineOfSight(a,e)){a.cooldown=corridorRecord(this)?2:99;return;}
      this.burst(a,e,'squad',{rounds:1,bias:[2,1.4],cone:[0,0]});a.state='REGROUP';   // he shoots from his place in the knot and stays in it (burst() marks a shooter SUPPRESS)
      a.cooldown=DECK_ASSAULT.fire.assaultPauseSec+4*aiNext(a.ai);return;
    }
    const d=a.deck,ai=a.ai,u=()=>aiNext(ai),p=this.player,over=deckRole(a)==='overwatch';
    if(!['cover','hold','clear'].includes(d.phase)){ai.peek=0;a.cooldown=.4;return;}
    if(!(a.rounds>0)){ai.peek=0;if(!a.reload)a.reload={startedAt:this.clock,duration:3.4,mode:'clip'};a.cooldown=Math.max(.3,a.reload.startedAt+a.reload.duration-this.clock)+.4+u();return;}
    const west=inside(p,this.world.layout.bounds.playable),threat=west&&this.clock*1000-p.weaponShotAt<AI_THREAT_SEC*1000;
    if(!over&&this.deckGrenade(a))return;   // R2-b: a Pole he cannot hit with the rifle, within a stick grenade's throw
    const open=ai.peek===0,pick=this.deckTarget(a,west,threat,over);
    if(!pick){ai.peek=0;ai.target=null;a.cooldown=AI_RESCAN[0]+AI_RESCAN[1]*u();if(!over)this.deckSearch(a);return;}
    if(open)ai.peek=aiCount(ai,[.4,.4,.2]);
    ai.target=pick.id;
    const k=this.clock<ai.shakenUntil?AI_SHAKEN_BIAS:1;
    this.burst(a,pick.target,pick.kind,{rounds:1,bias:[2*k,1.4*k],cone:[0,0]});
    ai.peek=Math.max(0,ai.peek-1);
    if(ai.peek>0&&a.rounds>0)a.cooldown=AI_BOLT[0]+AI_BOLT[1]*u();
    else{
      ai.peek=0;const base=over?DECK_ASSAULT.fire.overwatchPauseSec:DECK_ASSAULT.fire.assaultPauseSec;
      let pause=aiPause(ai,base*1.8-1.8,3);if(pick.kind==='player')pause*=this.level.cooldownScale;   // H9 D2: x1 on recruta
      if(!(a.rounds>0))pause=Math.max(pause,AI_RELOAD_COVER+u());a.cooldown=pause;
    }
  }
  /** The deck man's target: a withdrawing platoon man ahead of him (west) within fire.platoonRangeM in sight, or the player in sight (more when he is the threat). */
  deckTarget(a,west,threat,over){
    const ai=a.ai,u=()=>aiNext(ai),p=this.player,c=[],add=(id,target,kind,w)=>c.push({id,target,kind,w:w*(id===ai.target?3:1)});
    const near=this.withdrawingPlatoon().filter(s=>s.x<a.x&&dist(s,a)<DECK_ASSAULT.fire.platoonRangeM&&this.world.lineOfSight(a,s));
    const s=near.find(m=>m.id===ai.target)??(near.length?near[Math.floor(u()*near.length)]:null);
    if(s)add(s.id,s,'platoon',2.3);
    // H9 D2: spansPickPlayerThreshold as a weight (oddsWeight: recruta x1, soldado x2, veterano x3).
    const seesPlayer=west&&this.world.lineOfSight(a,p);
    if(seesPlayer)add('player',p,'player',((over?.6:1)+(threat?1.6:0))*oddsWeight(this.level.spansPickPlayerThreshold,M01_DIFFICULTY.recruta.spansPickPlayerThreshold));
    // R2-b: the Poles who hold the deck are targets too (rounds of kind `squad`: they pin whoever they pass, they never wound an ally); the nearest he sees, or the player, is what he remembers (ai.seen, for the search).
    const SQ=DECK_ASSAULT.tactics.squadTargets;let seen=seesPlayer?p:null,seenId='player';
    if(!over)for(const b of this.deckDefenders()){
      if(b.x>=a.x||dist(a,b)>SQ.rangeM||!this.world.lineOfSight(a,b))continue;
      if(SQ.weight>0)add(b.id,b,'squad',SQ.weight*(this.clock-b.firedAt<AI_THREAT_SEC?3:1));   // (the ones who fire at him are the ones he answers: x3, as for the player who fires)
      if(!seen||dist(a,b)<dist(a,seen)){seen=b;seenId=b.id;}
    }
    if(seen)a.ai.seen={x:seen.x,y:seen.y,z:seen.z,at:this.clock,who:seenId};
    if(!c.length)return null;
    let x=u()*c.reduce((t,o)=>t+o.w,0);return c.find(o=>(x-=o.w)<0)??c.at(-1);
  }
  /**
   * R2-b: SEARCH. A man in cover on the way to his line who saw a Pole in the last search.memorySec seconds and has none in sight now (afterSec on) moves on to the first station toward his forward limit
   * (at most one bound of rushStations, never past the limit: the closing lines are the pressure's to open) from which a man on his feet would see the place where the Pole was last seen, instead of waiting
   * out his cover; it can repeat only while the memory lasts and ends at the limit. Reads the sight record (ai.seen) and the world's line of sight; no draw.
   */
  deckSearch(a){
    const P=DECK_ASSAULT,S=P.tactics.search,d=a.deck,ai=a.ai,now=this.clock,seen=ai.seen;
    if(!seen||d.phase!=='cover'||now-seen.at>S.memorySec||now-seen.at<S.afterSec)return false;
    const path=P.paths[assaultIndex(a)],last=Math.min(deckLimitNode(a),d.node+P.rushStations),target={space:'metres',x:seen.x,y:seen.y,z:seen.z,crouched:true};
    for(let n=d.node+1;n<=last;n++){
      const p=path[n],probe={space:'metres',x:p.x,y:this.world.heightAt(p.x,p.z),z:p.z,crouched:false};
      if(this.world.lineOfSight(probe,target)){
        d.node=n;d.phase='advance';d.since=now;d.until=now;ai.peek=0;a.crouched=false;
        this.emit({type:'deck-tactic',kind:'search',by:a.id,line:deckLineNumber(a),at:now});return true;
      }
    }
    return false;
  }
  /**
   * R2-b: a stick grenade (Stielhandgranate). A man of the assault in cover or on a line, with a Pole between tactics.grenade.minM and rangeM from him whom he cannot hit with the rifle (no line of sight,
   * the player in authored cover, or a defender pinned down on his post), lobs one at him: at most perMan each, one for the squad every gapSec, thrown from his feet on a flat arc of flightSec to the Pole's place plus an error of 5 % of the range
   * (his own stream), a fuse of fuseSec from the throw (so the grenade lies on the ground for the rest of it: the warning). A transient `enemy-grenade` event and, when it falls near the player, a HUD message
   * say it is coming; it is a grenade of grenades.active (the renderer draws it) with `by` and `at`, which the explosion (germanGrenadeBlast) reads. Never against the player when he sees him and is not in cover.
   */
  deckGrenade(a){
    const G=DECK_ASSAULT.tactics.grenade,d=a.deck,now=this.clock;
    if(G.perMan<1||(d.gr??0)>=G.perMan||!['cover','hold'].includes(d.phase)||now-(this.timers.deckGrenadeAt??-1e9)<G.gapSec||this.germanSilence()||this.grenades.active.length>=DECK_GRENADES_MAX)return false;
    const p=this.player;let best=null,bd=Infinity;
    for(const b of [p,...this.deckDefenders()]){
      if(!b.alive||(b!==p&&!b.active)||b.x>=a.x)continue;
      const dd=dist(a,b);if(dd<G.minM||dd>G.rangeM||dd>=bd)continue;
      // A Pole he cannot hit with the rifle: out of his sight; or the player in authored cover (the sim's own test of cover, world.coverAt); or a defender pinned down on his post (kneeling and suppressed:
      // there is nothing to aim at but the cover he lies in, which is what a grenade is for). A standing or an unsuppressed Pole in his sight is the rifle's.
      const covered=b===p?Boolean(this.world.coverAt(p)):Boolean(b.crouched)&&this.clock<b.suppressedUntil;
      if(this.world.lineOfSight(a,b)&&!covered)continue;   // he can hit him with his rifle
      best=b;bd=dd;
    }
    if(!best)return false;
    const ai=a.ai,g=()=>aiGauss(ai),sigma=.05*bd,T=G.flightSec;
    const tx=best.x+g()*sigma,tz=best.z+g()*sigma,ty=this.world.heightAt(tx,tz)+.1,ox=a.x,oy=a.y+1.5,oz=a.z;
    this.grenades.active.push({id:`m01_grenade_${this.grenades.nextId++}`,x:ox,y:oy,z:oz,vx:(tx-ox)/T,vy:(ty-oy)/T+.5*9.81*T,vz:(tz-oz)/T,fuse:G.fuseSec,by:a.id,at:now});
    this.timers.deckGrenadeAt=now;d.gr=(d.gr??0)+1;
    a.firedAt=now;a.state='SUPPRESS';a.facing=Math.atan2(best.z-a.z,best.x-a.x);a.crouched=false;ai.peek=0;a.cooldown=G.gapSec;
    if(best===p)this.noteTelegraph(a,'player',1,0);   // F1: the throw is the telegraph (the fuse is the grace)
    this.emit({type:'enemy-grenade',by:a.id,origin:{x:ox,y:oy,z:oz},target:{x:tx,y:ty,z:tz},fuse:G.fuseSec,flight:T,at:now});
    if(dist({x:tx,z:tz},p)<G.reachM+10)this.combatCall('Granada alemã! Afaste-se!');
    return true;
  }
  /** Read-only diagnostics of the deck assault (never saved): each man's phase and place, and the nearest living German to the player. */
  get deckAssault(){
    const men=this.actors.filter(a=>a.group==='grp_de_spans'&&a.deck);
    return {active:men.length>0&&!this.consumedEvent(E('east_demolition')),clear:this.deckClear(),
      men:men.map(a=>({id:a.id,role:deckRole(a),phase:a.deck.phase,node:a.deck.node,x:a.x,z:a.z,alive:a.alive,pinned:a.deck.pinned}))};
  }
  /**
   * Combat slice 2b (grp_east_platoon.rearguard in mission.json, src/game/m01-rearguard.js): true while the east demolition's gate holds the clock for the deck, from
   * 06:09:30 (CKM_CEASE_AT, the gate time: 30 s before the segment's end) until no man of the deck assault is alive west of clearX. The 20 s rule runs on the battle
   * clock, which is held then, so nothing the rearguard does can move a casualty.
   */
  rearguardHolds(){return this.consumedEvent(REARGUARD.from)&&this.battleClock>=CKM_CEASE_AT&&!this.consumedEvent(E('east_demolition'))&&!this.deckClear();}
  /**
   * Forms and releases the rearguard. The tick the hold begins, each man of it still on the deck east of (his post - joinWithinM) gets his record `rear` and his combat AI
   * stream, derived from the main state of this tick (read, never drawn); once the hold is over he is `released` for good and runs on with the withdrawal. Writes actor data only.
   */
  formRearguard(){
    const holds=this.rearguardHolds();
    for(const id of REARGUARD.men){
      const a=this.actor(id);if(!a?.alive||!a.active)continue;
      if(!a.rear){
        if(holds&&a.x>rearguardPost(a).x-REARGUARD.joinWithinM){a.rear={v:1,phase:'post',since:this.clock};a.ai=newAI(this.rng.state,aiIndex(a.id),a.suppressedUntil);a.firedAt??=-1e9;}
        continue;
      }
      if(a.rear.phase!=='released'&&!holds){a.rear.phase='released';a.rear.since=this.clock;a.ai.peek=0;a.crouched=false;}
    }
  }
  /** A man of the rearguard, every tick of the hold: he runs to his post (moveActor: the navigator, local avoidance and the queue), then stays there; his posture is set after the combat step. */
  stepRearguard(a,dt){
    const r=a.rear,post=rearguardPost(a);
    if(r.phase==='post'){
      if(dist(a,post)>=.9){a.crouched=false;this.moveActor(a,post,dt,REARGUARD.runSpeed);return;}
      r.phase='hold';r.since=this.clock;a.facing=0;delete a.nav;a.cooldown=Math.max(a.cooldown,.6+.8*aiNext(a.ai));
    }
    if(this.clock-a.firedAt>=REARGUARD.fire.holdAfterSec)a.state='GUARD';
  }
  /** The rearguard's trigger, after the Germans' (updateCombat): the slice-1 cycle (aiPinned under fire, peeks, bolt, pause, the clip reloaded in cover). */
  rearguardFire(dt){
    for(const id of REARGUARD.men){
      const a=this.actor(id);if(!a?.alive||!a.active||a.rear?.phase!=='hold')continue;
      a.cooldown-=dt;
      if(this.clock<a.suppressedUntil){this.aiPinned(a);a.cooldown=Math.max(a.cooldown,a.suppressedUntil-this.clock+1.2+a.ai.recover);}
      else if(a.cooldown<=0)this.rearguardShot(a);
    }
  }
  /** T38 as the deck men, after this tick's shots and suppression (the rounds landed): a rearguard man at his post kneels, is up riseBeforeSec before his trigger and holdAfterSec after his shot, and is down while suppressed. */
  stageRearguard(){
    const F=REARGUARD.fire;
    for(const id of REARGUARD.men){const a=this.actor(id);if(a?.alive&&a.active&&a.rear?.phase==='hold')a.crouched=this.clock<a.suppressedUntil||!(a.cooldown<=F.riseBeforeSec||this.clock-a.firedAt<F.holdAfterSec);}
  }
  /** The living deck-assault man the rearguard man shoots: the one he aimed at last while he still sees him, else the nearest in sight within rangeM (ties: roster order). No draw. */
  rearguardTarget(a){
    const F=REARGUARD.fire,standing={...a,crouched:false};let best=null,bestD=Infinity;
    for(const m of this.actors){
      if(m.group!=='grp_de_spans'||!m.deck||!m.alive||!m.active||deckRole(m)!=='assault'||m.deck.phase==='clear')continue;
      const d=dist(a,m);if(d>F.rangeM||!this.world.lineOfSight(standing,m))continue;
      if(m.id===a.ai.target)return m;
      if(d<bestD){best=m;bestD=d;}
    }
    return best;
  }
  /** Everyone of our side a rearguard round must never go through: the player and every living, present ally but the shooter. */
  rearguardFriends(a){const out=this.actors.filter(b=>b!==a&&b.team==='ally'&&!b.displayOnly&&b.alive&&b.active);if(this.player.alive)out.push(this.player);return out;}
  /**
   * Line-of-fire rule: a friend ahead of the muzzle (from 0.5 m to the target) within clearanceM of the aimed line in plan blocks the shot, unless the line passes more than
   * headroomM over the top of his body there (the hitbox top: 1.88 m standing, 1.40 m kneeling, src/world/spatial.js), so a man may fire over a comrade who kneels in front
   * of him but never past one who stands, runs or is in line with the shot. Pure geometry.
   */
  lineOfFireBlocked(origin,aim,friends,clearanceM=REARGUARD.fire.clearanceM){
    const dx=aim.x-origin.x,dz=aim.z-origin.z,h=Math.hypot(dx,dz);if(h<1e-6)return false;
    const ux=dx/h,uz=dz/h,F=REARGUARD.fire;
    for(const f of friends){
      const fx=f.x-origin.x,fz=f.z-origin.z,along=fx*ux+fz*uz;if(along<=.5||along>=h||Math.abs(fx*uz-fz*ux)>=clearanceM)continue;
      if(origin.y+(aim.y-origin.y)*along/h<f.y+(f.crouched?1.4:1.88)+F.headroomM)return true;
    }
    return false;
  }
  /**
   * One aimed kb wz.29 round of a rearguard man. Dispersion from his own stream only (sigmaMil, wider while shaken); held, with no round, when the line-of-fire rule
   * blocks it or the dispersed ray itself would reach a friend. The round is the player's: traced at once against everyone (traceShot), a German it hits takes the
   * rifle's damage, and suppressAlong() pins the Germans it cracks past by the same rule as the player's shots. One `npc-shot` (the allied rifle report) per round.
   */
  rearguardShot(a){
    const ai=a.ai,u=()=>aiNext(ai),F=REARGUARD.fire;
    if(!(a.rounds>0)){ai.peek=0;if(!a.reload)a.reload={startedAt:this.clock,duration:3.4,mode:'clip'};a.cooldown=Math.max(.3,a.reload.startedAt+a.reload.duration-this.clock)+.4+u();return;}
    const t=this.rearguardTarget(a);
    if(!t){ai.peek=0;ai.target=null;a.cooldown=AI_RESCAN[0]+AI_RESCAN[1]*u();return;}
    if(ai.peek===0)ai.peek=aiCount(ai,[.4,.4,.2]);
    ai.target=t.id;a.crouched=false;
    const origin=eyePosition(a),aim=aimPoint(t),dx=aim.x-origin.x,dy=aim.y-origin.y,dz=aim.z-origin.z,h=Math.hypot(dx,dz);
    const k=this.clock<ai.shakenUntil?AI_SHAKEN_BIAS:1,angle=Math.atan2(dz,dx)+aiGauss(ai)*F.sigmaMil[0]/1000*k,pitch=Math.atan2(dy,h)+aiGauss(ai)*F.sigmaMil[1]/1000*k;
    const dir=aimDirection(angle,pitch),friends=this.rearguardFriends(a);
    if(this.lineOfFireBlocked(origin,aim,friends)||traceShot(this.world,origin,dir,friends,Math.hypot(h,dy)+1)?.kind==='actor'){ai.peek=0;a.cooldown=.6+.6*u();return;}
    // R2-b: the round ends 40 m past the German it was aimed at (a miss at 450 m killed men at the far end of the bridge, 750 m away, who had run clear: the four of the overwatch are the demolition's)
    const R=Math.hypot(h,dy)+40,hit=traceShot(this.world,origin,dir,this.combatants.filter(b=>b!==a),R);
    if(hit?.actor?.team==='enemy'){const e=hit.actor,health=e.health,wasAlive=e.alive;e.health=Math.max(0,e.health-this.weapon.profile.damage*hit.multiplier);e.alive=e.health>0;e.state=e.alive?'HIT_REACTION':'DOWN';
      recordDamage(e,health,wasAlive,this.clock,a);this.updateMG34Posture(e);}
    this.suppressAlong(origin,dir,hit,false,R);
    a.rounds=Math.max(0,a.rounds-1);if(a.rounds===0)a.reload={startedAt:this.clock,duration:3.4,mode:'clip'};
    a.shot=.135;a.firedAt=this.clock;a.state='SUPPRESS';a.facing=angle;
    // The report of an allied rifle (audio weapon id `ally_rifle`, the profile of a Polish rifle heard at a distance); `by` names the man.
    this.emit({type:'npc-shot',weapon:'ally_rifle',point:origin,rounds:1,by:a.id,end:hit?.point?{x:hit.point.x,y:hit.point.y,z:hit.point.z}:{x:origin.x+dir.x*R,y:origin.y+dir.y*R,z:origin.z+dir.z*R},hit:hit?.actor?.team==='enemy'});   // R1-b: where it stopped and whether it struck, for the presentation (as the section's real rounds say)
    ai.peek=Math.max(0,ai.peek-1);
    if(ai.peek>0&&a.rounds>0)a.cooldown=AI_BOLT[0]+AI_BOLT[1]*u();
    else{ai.peek=0;let pause=aiPause(ai,F.pauseSec*1.8-1.8,3);if(!(a.rounds>0))pause=Math.max(pause,AI_RELOAD_COVER+u());a.cooldown=pause;}
  }
  /**
   * R2-b (2026-10-24): one aimed round of a man of the Polish section (kb wz.29) at a German of the deck assault, by the model of the player's rifle and of the rearguard's: a ray from his eye to the
   * torso of the posture the German is in, with milliradian dispersion (sigmaMil, the error grows with the range as every German round's does; wider while shaken), held with no round when a friend
   * stands in the line of fire or the dispersed ray itself would reach one (the rule of the rearguard), traced at once against everyone, damage by part (a torso kills, a limb wounds), and the
   * suppression of suppressAlong for the Germans it cracks past, NOT marked as the player's (the rule of the 20 s does not count it: the platoon's fate stays the player's). `gauss()` draws
   * from the man's own stream. Returns {fired, hit, angle, end}: fired false means no round was fired and no ammunition spent; `end` is where the round stopped (what it struck, or 40 m past the German), for the presentation.
   */
  alliedRound(a,t,{gauss,sigmaMil,shaken=false,clearanceM=REARGUARD.fire.clearanceM}){
    const origin=eyePosition(a),aim=aimPoint(t),dx=aim.x-origin.x,dy=aim.y-origin.y,dz=aim.z-origin.z,h=Math.hypot(dx,dz),k=shaken?AI_SHAKEN_BIAS:1;
    const aimed=Math.atan2(dz,dx),angle=aimed+gauss()*sigmaMil[0]/1000*k,pitch=Math.atan2(dy,h)+gauss()*sigmaMil[1]/1000*k;
    // A man of ours who lies wounded on the deck (Bąk, 06:04) is under the line of fire, not in it: his hitbox is the standing one, which would swallow every round of the pair.
    const lying=b=>b.team==='ally'&&(b.state==='WOUNDED'||b.state==='DOWN');
    const dir=aimDirection(angle,pitch),friends=this.rearguardFriends(a).filter(b=>!lying(b));
    if(this.lineOfFireBlocked(origin,aim,friends,clearanceM)||traceShot(this.world,origin,dir,friends,Math.hypot(h,dy)+1)?.kind==='actor')return {fired:false,hit:false,angle:aimed};
    // The round ends 40 m past the German it was aimed at (what a rifle does at 500 m is a hit or a miss on him, not a death at the other end of the bridge: the four of the overwatch are the demolition's).
    const R=Math.hypot(h,dy)+40,hit=traceShot(this.world,origin,dir,this.combatants.filter(b=>b!==a&&!lying(b)),R);
    let struck=false;
    if(hit?.actor?.team==='enemy'){
      const e=hit.actor,health=e.health,wasAlive=e.alive;
      e.health=Math.max(0,e.health-this.weapon.profile.damage*hit.multiplier);e.alive=e.health>0;e.state=e.alive?'HIT_REACTION':'DOWN';
      recordDamage(e,health,wasAlive,this.clock,a);this.updateMG34Posture(e);struck=true;
    }
    this.suppressAlong(origin,dir,hit,false,R);
    return {fired:true,hit:struck,angle:aimed,end:hit?.point?{x:hit.point.x,y:hit.point.y,z:hit.point.z}:{x:origin.x+dir.x*R,y:origin.y+dir.y*R,z:origin.z+dir.z*R}};
  }
  /** Read-only diagnostics of the rearguard (never saved). */
  get rearguard(){
    return {holds:this.rearguardHolds(),men:REARGUARD.men.map(id=>{const a=this.actor(id);return {id,phase:a.rear?.phase??null,x:a.x,z:a.z,crouched:a.crouched,rounds:a.rounds,target:a.rear?a.ai?.target??null:null};})};
  }
  /** R2-a: read-only diagnostics of the section's record (never saved): the focus, the last order, the posts of the pair, the shots waiting, the pin load and the counters. */
  get section(){return sectionView(this);}
  /** R2-a (src/game/m01-section.js), the three entry points of the section in the simulation: its decisions before the men walk, its answers and postures after the combat step, and the news that a
   *  man of ours has been hit. Methods so that a test (and the audit) can run the same route without the section and prove it changes nothing the Germans or the player can feel. */
  stepSection(){return updateSection(this,{say:node=>barkTrigger(this,'squadMove',{node})});}   // the arrival of a man at a post is called through the director (trigger squadMove), as slice 3's bounds are
  afterSection(){sectionAfter(this);}
  /** R2-b: from the deck assault on, the section's riflemen fire REAL rounds at the Germans of the deck (alliedRound) and Kowal's rkm answers them too. A hook so that a test (and the audit) can run the same route with the display-grade fire of R2-a. */
  sectionRealFire(){return sectionRealOn(this);}
  noteCasualty(id,how,by){sectionCasualty(this,id,how,by);}
  /** Tiro certeiro da regra dos 20 s: a vítima é o homem cuja baixa a contagem por ID já define. */
  lethalShot(spans){
    const n=this.flags['m01.east_platoon_survivors'],victim=this.actor(`pl_east_${n-1}`);
    if(n<=12||!victim?.alive||!victim.active)return;
    const shooter=spans.find(a=>this.world.lineOfSight(a,victim));
    if(shooter){
      // Lead the running soldier. A designated ID never bypasses the actual collision at arrival.
      const flight=Math.hypot(victim.x-shooter.x,victim.z-shooter.z)/620;
      const aim={x:victim.x-5.5*flight,z:37.8+(Number(victim.id.split('_').at(-1))%2)*.35};
      aim.y=this.world.heightAt(aim.x,aim.z)+.1;
      this.burst(shooter,aim,'platoon',{rounds:1,bias:[0,0],cone:[0,0],victim:victim.id});
    }
  }
  withdrawingPlatoon(){return this.actors.filter(a=>a.group==='grp_east_platoon'&&a.alive&&a.active);}
  /** T48: true from 06:10 to 06:11 of the battle clock, the 60 s after the east demolition in which no German starts a shot. Read from the clock alone. */
  germanSilence(){return this.battleClock>=GERMAN_SILENCE_FROM&&this.battleClock<GERMAN_SILENCE_UNTIL;}
  /**
   * T48: called by east_demolition once it has felled the first GERMAN_FELLED men of grp_de_spans. Each of the GERMAN_CARRIED westmost living survivors
   * (nearest the fallen) lifts the nearest fallen man (carriedBy; no `carry` record, that one is Bąk's), and every living survivor gets a plan
   * `fallBack` {t0,x0,z0,x1,z1} to his place in a close-up knot ahead of the westmost of them, reached at GERMAN_REGROUP_AT. A man without a plan (a save
   * made before this rule, or one not on the spans) keeps the old retreat, so no migration exists. Writes actor data only and draws nothing from this.rng.
   */
  beginFallBack(){
    const spans=this.actors.filter(a=>a.group==='grp_de_spans'),fallen=spans.slice(0,GERMAN_FELLED);
    const men=spans.slice(GERMAN_FELLED).filter(a=>a.alive&&a.active).sort((a,b)=>a.x-b.x||spans.indexOf(a)-spans.indexOf(b));
    if(!men.length)return;
    const rx=Math.min(men[0].x+REGROUP_AHEAD,REGROUP_EAST_END);
    men.forEach((a,k)=>{
      const [dx,dz]=REGROUP_SLOTS[k%REGROUP_SLOTS.length];
      a.fallBack={t0:this.battleClock,x0:a.x,z0:a.z,x1:rx+dx,z1:REGROUP_Z+dz};a.facing=Math.atan2(a.fallBack.z1-a.z,a.fallBack.x1-a.x);
    });
    for(const carrier of men.slice(0,GERMAN_CARRIED)){
      fallen.sort((p,q)=>Math.abs(p.x-carrier.x)-Math.abs(q.x-carrier.x)||spans.indexOf(p)-spans.indexOf(q));
      const patient=fallen.shift();if(!patient)break;
      patient.carriedBy=carrier.id;patient.facing=carrier.facing+Math.PI/2;
      patient.x=carrier.x-Math.cos(carrier.facing)*.25;patient.z=carrier.z-Math.sin(carrier.facing)*.25;patient.y=carrier.y+1.15;
    }
  }
  /** T48: one man of the withdrawal, every tick. A straight line from where the east demolition found him to his place in the knot, by the battle clock
   * (suppression does not stop a man who is leaving). At GERMAN_REGROUP_AT he is there, REGROUP, and sets down whom he carried beside him. */
  stepFallBack(a){
    const f=a.fallBack,span=GERMAN_REGROUP_AT-f.t0,u=span>0?Math.min(1,Math.max(0,(this.battleClock-f.t0)/span)):1;
    if(u<1){a.x=f.x0+(f.x1-f.x0)*u;a.z=f.z0+(f.z1-f.z0)*u;a.y=this.world.heightAt(a.x,a.z);a.state='RETREAT';return;}
    Object.assign(a,{x:f.x1,z:f.z1,state:'REGROUP',facing:Math.PI});a.y=this.world.heightAt(a.x,a.z);delete a.fallBack;
    const patient=this.actors.find(p=>p.carriedBy===a.id);
    if(patient){patient.carriedBy=null;patient.x=a.x-1.1;patient.z=a.z;patient.y=this.world.heightAt(patient.x,patient.z);}
  }
  /** T48, computed on every read and never stored: where the German withdrawal stands. FALL_BACK while a living man still marches on his plan, REGROUP once
   * the men that lived have arrived, IDLE otherwise (before the east demolition, or on a save made before this rule). */
  get germanWithdrawal(){
    const spans=this.actors.filter(a=>a.group==='grp_de_spans'),regrouped=spans.filter(a=>a.state==='REGROUP').map(a=>a.id);
    return {phase:spans.some(a=>a.fallBack&&a.alive&&a.active)?'FALL_BACK':regrouped.length?'REGROUP':'IDLE',silent:this.germanSilence(),
      carried:spans.filter(a=>a.carriedBy).map(a=>({patient:a.id,carrier:a.carriedBy})),regrouped};
  }
  /** T23: true from hold.from (train 963) to hold.until (the withdrawal at 06:00). Read from the consumed events only, so a save needs no new key. */
  holdingEast(){return this.consumedEvent(EAST_FRONT.hold.from)&&!this.consumedEvent(EAST_FRONT.hold.until);}
  /** Puts every living platoon man on guard while the hold lasts. Also brings a save made inside that window by older code into line on its next tick. */
  holdEastPlatoon(){
    if(!this.holdingEast())return;
    // T38: from the very tick the hold starts every living man kneels on his slot (gameplay crouch: hitbox, eye, aim height).
    for(const a of this.actors)if(a.group==='grp_east_platoon'&&a.alive){if(!a.active){a.active=true;a.state='GUARD';}a.crouched=true;}
  }
  /**
   * T23 attrition. At each fixed battle-clock time of the plan one reserve man (pl_east_18..23) is shot by the lowest-numbered rifleman who
   * can hit him; a round that misses or finds a wall is simply retried on the next tick until the entry's cutoff. There is no timer key: what
   * is done is read from the men themselves and from the rounds in flight (kept by the save), so a restore can neither skip nor repeat a casualty.
   * Draws nothing from this.rng (the round is built without dispersion) and writes nothing on the shooter except his display flash, so his own
   * eastFire cadence and Kowal's pick of the latest flash stay as they were. It is never aimed at the player: for H9 it is no telegraph.
   */
  attritionTick(){
    if(!this.holdingEast())return;
    for(const e of EAST_FRONT.attrition){
      if(this.battleClock<e.at)return;   // in time order: nothing later is due either
      const victim=this.actor(e.victim);
      if(!victim.alive||!victim.active||this.battleClock>=e.cutoff)continue;   // already fallen, or too late to land before the withdrawal
      if(this.enemyFire.rounds.some(r=>r.kind==='attrition'&&r.victim===e.victim))return;   // the round is in flight
      this.shootAttrition(victim);return;
    }
  }
  shootAttrition(victim){
    const aim=aimPoint(victim);   // T38: a held platoon man kneels, so his torso is at 0.75 m
    for(let i=2;i<40;i++){   // riflemen only: de_east_0 and de_east_1 are the MG34 gunners
      const a=this.actor(`de_east_${i}`);
      if(!a.alive||!a.active||this.clock<a.suppressedUntil)continue;
      const r=makeRound({id:`m01_round_${this.enemyFire.nextId}`,by:a.id,weapon:'kar98k',kind:'attrition',origin:eyePosition(a),aim,firedAt:this.clock,
        bias:[0,0],cone:[0,0],gauss:()=>0,tracer:true,victim:victim.id});
      if(traceRound(this.world,r,[victim]).actor!==victim)continue;   // the very trace of the landing: a wall in the way tries the next man
      this.enemyFire.nextId++;this.enemyFire.rounds.push(r);this.display.firedAt[a.id]=r.firedAt;return;   // the muzzle flash is display data (not saved)
    }
  }
  repairAim(){
    const sappers=this.actors.filter(a=>a.role==='ENGINEER'&&a.alive&&a.active);
    return sappers.length?sappers[Math.floor(this.rng.next()*sappers.length)]:this.world.point('repair_site_2');
  }
  // T23: the east rifles aim into the block where the platoon stands (two z bands over the layout), so their rounds fly at real men;
  // still three draws per call (band, x, z), which keeps the main RNG stream exactly where it was.
  eastBridgeheadPoint(r){return r()<.5?{x:BLOCK.x+r()*BLOCK.w,y:.5,z:BLOCK.z+r()*BLOCK.h/2}:{x:BLOCK.x+r()*BLOCK.w,y:.5,z:BLOCK.z+BLOCK.h/2+r()*BLOCK.h/2};}
  gauss(){let u=0;while(u<=1e-12)u=this.rng.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*this.rng.next());}
  /** Uma rajada (ou um tiro) com dispersão em milésimos; os tiros ficam em voo até à hora de chegada (enemyFire.rounds). */
  burst(a,target,kind,{rounds=1,interval=.075,bias=[0,0],cone=[0,0],tracer=false,victim=null}={}){
    if(a.team==='enemy'&&this.germanSilence())return false;   // T48: nobody on the east bank starts a shot from 06:10 to 06:11
    if(proneGunner(a)&&(!canMG34Fire(a)||this.clock<a.suppressedUntil||this.mission.phase==='OUTRO'||this.mission.complete))return false;
    // H9 D2: the level's aim error on fire at the player (kinds player/cover, incl. searching fire on his last-seen spot), on the bias and the cone; the gauss draws are
    // the same, only scaled (recruta: x1, the same numbers).
    const ae=a.team==='enemy'&&M01_AIMED_AT_PLAYER_KINDS.includes(kind)?this.level.aimErrorScale:1;
    if(ae!==1){bias=[bias[0]*ae,bias[1]*ae];cone=[cone[0]*ae,cone[1]*ae];}
    const aim=target.id?aimPoint(target):   // T38: torso of the posture he is in (a prone sapper is aimed at low)
      {x:target.x,y:(target.y??this.world.heightAt(target.x,target.z))+1,z:target.z};
    if(proneGunner(a)){
      if(!Number.isInteger(rounds)||rounds<4||rounds>7||interval!==MG34_INTERVAL)return false;
      a.facing=Math.atan2(aim.z-a.z,aim.x-a.x);
      a.mg34Prone={phase:'fire_burst',startedAt:this.clock,duration:MG34_TRANSITION_SEC,progress:1,
        loader:a.mg34Prone.loader??MG_LOADER_IDS[MG34_IDS.indexOf(a.id)],beltRemaining:a.mg34Prone.beltRemaining??50,
        burst:{rounds,emitted:0,interval:MG34_INTERVAL,plan:[]}};
      const shared=[bias[0]*this.gauss(),bias[1]*this.gauss()],b=a.mg34Prone.burst;
      // Plan dispersion in the existing RNG order, but do not emit future rounds or presentation events.
      for(let k=0;k<rounds;k++)b.plan.push(makeRound({id:`m01_round_${this.enemyFire.nextId++}`,by:a.id,weapon:a.weapon,kind,
        origin:muzzlePosition(a,this.clock+k*interval),aim,firedAt:this.clock+k*interval,bias:shared,cone,
        gauss:()=>this.gauss(),tracer:tracer&&k===Math.min(1,rounds-1),victim}));
      this.noteTelegraph(a,kind,rounds,MG34_INTERVAL);a.firedAt=this.clock;a.state='SUPPRESS';this.emitMG34Rounds(a);return true;
    }
    const origin=eyePosition(a),shared=[bias[0]*this.gauss(),bias[1]*this.gauss()];
    for(let k=0;k<rounds;k++)this.enemyFire.rounds.push(makeRound({id:`m01_round_${this.enemyFire.nextId++}`,by:a.id,weapon:a.weapon,kind,origin,aim,
      firedAt:this.clock+k*interval,bias:shared,cone,gauss:()=>this.gauss(),tracer:tracer&&k===Math.min(1,rounds-1),victim}));
    this.noteTelegraph(a,kind,rounds,interval);a.shot=rounds*interval+.06;a.firedAt=this.clock;a.state='SUPPRESS';a.facing=Math.atan2(aim.z-a.z,aim.x-a.x);
    // Rifle reload fits inside its existing cooldown; never delays or creates a combat request.
    if(a.weapon==='kar98k'&&rounds===1){a.rounds=Math.max(0,a.rounds-1);if(a.rounds===0)a.reload={startedAt:this.clock,duration:3.4,mode:'clip'};}
    if(kind==='cover')this.timers.coverFire={by:a.id,at:this.clock,...origin};
    this.emit({type:'enemy-fire',origin,rounds,interval,weapon:a.weapon,at:this.clock});return true;
  }
  /** Kowal (rkm wz.28) responde aos clarões: rajadas curtas na posição do dique que disparou há menos tempo e que ele vê. */
  kowalFire(dt){
    const kowal=this.actor('szymon_kowal');kowal.cooldown-=dt;
    if(!kowal.alive||!kowal.active||kowal.cooldown>0||!this.consumedEvent(E('train963_arrives'))||this.consumedEvent(E('east_demolition')))return;
    // ponytail: Kowal keeps the old target rule (latest visible flash, else an MG) and ignores fire on himself; only his burst and reaction change.
    const ai=kowal.ai,u=ai?()=>aiNext(ai):()=>.5;   // combat AI slice 1: his own stream (a legacy actor without one keeps the mean cycle)
    // R2-b: from the deck assault on, a man of the assault who fired in the last 10 s within the rkm's reach is a target like the dike's.
    const deckToo=this.sectionRealFire();
    const dike=this.enemies.filter(a=>a.alive&&a.active&&(a.group==='grp_de_east'||(deckToo&&a.deck!==undefined&&deckRole(a)==='assault'&&dist(a,kowal)<=SECTION.real.rkmRangeM)));
    const fresh=dike.filter(a=>this.clock-a.firedAt<10).sort((a,b)=>b.firedAt-a.firedAt).find(a=>this.world.lineOfSight(kowal,a));
    const target=fresh??dike.find(a=>a.weapon==='mg34'&&this.world.lineOfSight(kowal,a));
    // Nothing to answer: he stays behind the sandbags and looks again (he rises riseBeforeSec before each look, as before every burst).
    if(!target){kowal.cooldown=ai?2.5+2*u():4;return;}
    // A burst of 2-5 rounds (3 on average, as the old fixed 3) that never leaves a single round in the 20-round magazine.
    let n=ai?Math.min(kowal.rounds,2+Math.floor(u()*2)+Math.floor(u()*2.2)):3;if(kowal.rounds-n===1)n+=n<5?1:-1;
    // Reaction: a flash of the last 3 s is answered at once, an older one or the MG he keeps down more slowly (mean cycle about 4 s, as before).
    kowal.cooldown=ai?n*.11+(fresh&&this.clock-fresh.firedAt<3?2.2+2.6*u():3.4+2.8*u()):4;
    if(ai)ai.target=target.id;
    kowal.shot=Math.max(.25,n*.11);kowal.firedAt=this.clock;kowal.facing=Math.atan2(target.z-kowal.z,target.x-kowal.x);kowal.rounds-=n;
    const previousUntil=target.suppressedUntil;
    target.suppressedUntil=Math.max(target.suppressedUntil,this.clock+1.4+.2*n);this.updateMG34Posture(target);this.emit({type:'npc-shot',weapon:'rkm_wz28',point:eyePosition(kowal),rounds:n,end:this.kowalBurstEnd(kowal,target),hit:false});
    recordSuppression(target,previousUntil,this.clock);
    if(kowal.rounds<=0){kowal.rounds=20;kowal.cooldown=5+(ai?u():0);if(dist(kowal,this.player)<120)this.line('dlg_m01_029',`dlg_m01_029:${Math.floor(this.clock/90)}`);}
  }
  /**
   * H9 D2: an enemy round that collided with the player and won the wound roll. recruta: -8, nothing recorded (today's prototype tuning, byte for byte). soldado/veterano:
   * the level's damage, the burst cap F2 (soldado: at most burstWoundCap wounds from one MG burst) and the fair-death rule F1 (health stays >= 1 unless the same shooter
   * has engaged the player for reactionGraceSec before this round); the time of the wound feeds the regen. No draw here: the roll was made by landRound.
   */
  woundPlayer(r){
    const p=this.player,L=this.level;
    if(L===M01_DIFFICULTY.recruta){p.health=Math.max(0,p.health-L.woundDamage);p.alive=p.health>0;this.emit({type:'player-hit'});if(!p.alive)this.playerDown('shot',r.by,r.weapon);return;}
    if(L.burstWoundCap!==null){
      const b=this.timers.burstWound,same=b&&b.by===r.by&&Math.abs(r.firedAt-b.at)<=BURST_GROUP_SEC+1e-9;
      if(same&&b.n>=L.burstWoundCap)return;   // the cap: the round still struck (impact, crack, suppression), it does not wound again
      this.timers.burstWound=same?{by:b.by,at:b.at,n:b.n+1}:{by:r.by,at:r.firedAt,n:1};
    }
    let health=Math.max(0,p.health-L.woundDamage);
    if(health<=0&&L.reactionGraceSec!==null){const e=this.timers.telegraph?.[r.by];if(!e||r.firedAt-e.first<L.reactionGraceSec-1e-9)health=1;}   // F1
    if(health<=0&&this.scene)health=1;   // F4 (H9 D4): no lethal wound while a cutscene is playing (rounds do land during cs_m01_order, the bombing and the blast scenes); soldado and veterano only
    p.health=health;p.alive=health>0;this.timers.lastHitAt=this.clock;this.emit({type:'player-hit'});
    if(!p.alive)this.playerDown('shot',r.by,r.weapon);
  }
  /**
   * H9 F5 (D3/D4): the player is down. `failure` carries the cause and the shooter (the restore of the next tick shows it as a message, like the fall and the river did before) and one
   * `player-down` event tells the presentation, which shows the death beat WITHOUT ticking the simulation; the simulation has already decided: the next tick restores the checkpoint.
   * No draw, no state beyond `failure` (never saved: a snapshot is always of a living player).
   */
  playerDown(cause,by=null,weapon=null){
    this.failure=deathText(cause,by,weapon);this.emit({type:'player-down',cause,by,text:this.failure});
  }
  /** What the next tick restores (H9 D5, the death beat and the checkpoint card): the last checkpoint reached, from the saved respawn point. */
  get respawn(){
    const id=this.checkpoint?.checkpointsReached?.at(-1)??null,cp=id&&this.definition.checkpoints.find(c=>c.id===id);
    return cp?{id,label:cp.label,name:cp.name,difficulty:this.checkpoint.difficulty??M01_DIFFICULTY_SIM_DEFAULT}:null;
  }
  /** H9 D2 rule F1 bookkeeping (soldado/veterano only, draw-free): a shooter's rounds of kind player/cover open or extend his engagement of the player. */
  noteTelegraph(a,kind,rounds,interval){
    if(this.level.reactionGraceSec===null||a.team!=='enemy'||!M01_AIMED_AT_PLAYER_KINDS.includes(kind))return;
    const t=this.timers.telegraph??={},last=this.clock+(rounds-1)*interval,e=t[a.id];
    for(const [id,x] of Object.entries(t))if(this.clock-x.last>F1_TELEGRAPH_GAP_SEC)delete t[id];   // broken engagements are dropped (the record stays small)
    if(e&&this.clock-e.last<=F1_TELEGRAPH_GAP_SEC)e.last=Math.max(e.last,last);else t[a.id]={first:this.clock,last};
  }
  /** H9 D2 regen (soldado): healing.ratePerSec after healing.afterUnhitSec without a wound, up to healing.cap. recruta and veterano have none. */
  regenerate(dt){
    const h=this.level.healing,p=this.player;if(!h||!p.alive||p.health>=h.cap)return;
    if(this.clock-(this.timers.lastHitAt??-Infinity)>=h.afterUnhitSec)p.health=Math.min(h.cap,p.health+h.ratePerSec*dt);
  }
  landRounds(){
    if(!this.enemyFire.rounds.some(r=>r.arriveAt<=this.clock))return;
    const due=this.enemyFire.rounds.filter(r=>r.arriveAt<=this.clock);this.enemyFire.rounds=this.enemyFire.rounds.filter(r=>r.arriveAt>this.clock);
    for(const r of due)this.landRound(r);
  }
  /** Chegada de um tiro: impacto no mundo, ferimento possível no jogador, supressão de quem estiver a menos de 3 m da trajectória. */
  landRound(r){
    if(r.kind==='east')return;   // cabeça de ponte leste: só clarão e estampido para o jogador
    if(r.kind==='attrition')return this.landAttrition(r);
    const p=this.player,victim=r.victim&&!this.consumedEvent(E('east_demolition'))?this.actor(r.victim):null;
    const hit=traceRound(this.world,r,victim?.alive?[p,victim]:[p]);
    let point=hit.point,material=hit.material??'earth';
    const casualty=victim?.alive&&hit.actor===victim;
    if(casualty){
      const n=this.flags['m01.east_platoon_survivors'];this.flags['m01.east_platoon_survivors']=Math.max(12,n-1);
      if(victim.alive&&Number(victim.id.split('_').at(-1))>=this.flags['m01.east_platoon_survivors']){
        point={x:victim.x,y:victim.y+1.1,z:victim.z};material='character';victim.alive=false;victim.health=0;victim.state='DOWN';
        recordHit(victim,this.clock,{x:r.ox,z:r.oz});recordDeath(victim,true,this.clock);
        this.combatCall('Um homem caiu na retirada! Suprima o fogo do tabuleiro leste.');
      }
    }else if(hit.actor===p&&this.rng.next()<(this.world.coverAt(p)?this.level.woundChance.cover:this.level.woundChance.exposed)){   // H9 D2: one draw per collision on every level
      this.woundPlayer(r);
    }
    // Aliados nunca são feridos por estes tiros (baixas só por ID): quem está a menos de 3 m da trajectória deita-se.
    // 2026-10-18 review fix (seed 4: covering fire beat ignoring the MG by only 4.9 s): a burst of the MG34 among the working sappers keeps them down REPAIR_PIN_MG_SEC, a rifle
    // round REPAIR_PIN_SEC as before, so silencing the gun is what pays (measured on 12 seeds in tests/m01-cover-combat.test.js).
    const repairPin=r.weapon==='mg34'?REPAIR_PIN_MG_SEC:REPAIR_PIN_SEC;
    let pinned=false;const near=[];
    for(const a of this.allies){
      if(!a.alive||!a.active||a===victim||a.carriedBy||(Math.abs(a.x-point.x)>80&&Math.abs(a.x-r.ax)>80))continue;
      if(closestApproach(r,hit.t,{x:a.x,y:a.y+.9,z:a.z})>NEAR_MISS)continue;
      const working=a.role==='ENGINEER'&&this.active('cover_repair')&&workDistance(a)<6;   // R3-a: within 6 m of the line between the two cuts (it was: of repair site 2)
      const previousUntil=a.suppressedUntil;
      // R2-b: a round of the deck assault that cracks past a man who holds the deck (the section's pair, the rearguard) pins him for tactics.pinSec, as a rifle round of ours pins a German for 5 s (suppressAlong); every other
      // ally keeps the 1.5 s (1 s for a man of the platoon) the rounds at the escort and the platoon always gave.
      const pin=working?repairPin:/^de_spans_/.test(r.by)&&this.isDeckDefender(a)?DECK_ASSAULT.tactics.pinSec:a.group==='grp_east_platoon'?1:1.5;
      a.suppressedUntil=Math.max(a.suppressedUntil,this.clock+pin);pinned||=working;near.push(a.id);
      recordSuppression(a,previousUntil,this.clock);
    }
    if(pinned){   // o trabalho pára e a equipa inteira abriga-se
      this.timers.repairSuppressedUntil=Math.max(this.timers.repairSuppressedUntil,this.clock+repairPin);this.timers.repairPins++;this.line('dlg_m01_022');
      for(const a of this.actors)if(a.role==='ENGINEER'&&a.alive&&a.active&&workDistance(a)<6){const previousUntil=a.suppressedUntil;a.suppressedUntil=Math.max(a.suppressedUntil,this.timers.repairSuppressedUntil);if(!near.includes(a.id))near.push(a.id);recordSuppression(a,previousUntil,this.clock);}
    }
    const approach=closestApproach(r,hit.t,eyePosition(p)),crack=approach<=6,distance=dist(point,p);
    this.emit({type:'round-impact',kind:r.kind,by:r.by,point,material,crack,distance,pass:impactPass(crack,approach),
      victim:casualty?victim.id:null,pinned:near});
  }
  /**
   * T23: an attrition round traces against its victim only. A hit is the casualty: the man falls, with no write to m01.east_platoon_survivors
   * (the rule of 06:00 and dlg_m01_049 keep counting 18), no combatCall, no wound roll on the player, no event, and it returns before the loop
   * that pins allies near the path, so his neighbours are not suppressed. A miss or a wall does nothing; the tick retries until the cutoff.
   */
  landAttrition(r){
    const victim=this.actor(r.victim);
    if(!victim?.alive||!victim.active||this.consumedEvent(E('east_platoon_withdraws')))return;
    if(traceRound(this.world,r,[victim]).actor!==victim)return;
    victim.alive=false;victim.health=0;victim.state='DOWN';
    recordHit(victim,this.clock,{x:r.ox,z:r.oz});recordDeath(victim,true,this.clock);
  }
  fire(){
    const p=this.player,now=this.clock*1000;if(p.carrying||!this.weapon.shoot(now))return;
    const aim=this.weapon.shotDirection(p.angle,p.pitch,p.aiming,p.moveBlend>.1,this.rng.next);
    // R1-a: a stunned player's rifle is less steady: the same two draws, their deviation from his aim multiplied (exactly 1 when he is not stunned).
    const sway=1+CONCUSSION.aimSway*concussionLevel(p,this.clock);
    if(sway!==1){aim.angle=p.angle+(aim.angle-p.angle)*sway;aim.pitch=p.pitch+(aim.pitch-p.pitch)*sway;}
    const dir=aimDirection(aim.angle,aim.pitch),origin=eyePosition(p),hit=traceShot(this.world,origin,dir,this.combatants,1200,muzzlePosition(p));
    p.weaponShotAt=now;p.pitch=Math.min(1.25,p.pitch+.024);
    if(hit?.actor?.team==='enemy'){const a=hit.actor,health=a.health,wasAlive=a.alive;a.health=Math.max(0,a.health-this.weapon.profile.damage*hit.multiplier);a.alive=a.health>0;a.state=a.alive?'HIT_REACTION':'DOWN';recordDamage(a,health,wasAlive,this.clock,p);
      if(wasAlive&&!a.alive)this.enemyDown(a,'kb_wz29');}
    const targetPoint=hit?.point??{x:origin.x+dir.x*1200,y:origin.y+dir.y*1200,z:origin.z+dir.z*1200};
    this.suppressAlong(origin,dir,hit,true);
    for(const a of this.enemies)if(proneGunner(a))this.updateMG34Posture(a);
    for(const a of this.actors)updatePosture(a,this.clock);
    this.emit({type:'player-shot',point:targetPoint,material:hit?.material,hit:hit?.actor?.team==='enemy',weapon:'kb_wz29'});
  }
  /**
   * What a rifle round of our side does to the Germans it cracks past (the player's kb wz.29, and since slice 2b the rearguard's): every living German within 3 m of the
   * ray, short of what it hit, is suppressed 5 s; on the road deck only the deck man it came closest to and his neighbours along the ray. Then Kowal's callout when the
   * round has just silenced an MG34 or the men on the spans. Extracted unchanged from fire() (2026-10-19) so the rearguard's rounds follow the same rule.
   */
  suppressAlong(origin,dir,hit,fromPlayer=false,reach=1200){
    const p=this.player;
    let silenced=false;
    const along=a=>Math.max(0,(a.x-origin.x)*dir.x+(a.y+1-origin.y)*dir.y+(a.z-origin.z)*dir.z),off=(a,d)=>Math.hypot(a.x-origin.x-dir.x*d,a.y+1-origin.y-dir.y*d,a.z-origin.z-dir.z*d);
    const passes=a=>{const d=along(a);return d>0&&d<reach&&off(a,d)<3&&(!hit||d<=hit.distance+3);};
    // Combat slice 2: on the road deck the ray runs down a 5.6 m corridor and passed within 3 m of every man of the assault, so one rifle pinned all ten for good. A man of the
    // deck assault is pinned only when the round cracks past the deck man it came closest to, or a man within DECK_SUPPRESS_ALONG_M of him along the ray (his neighbours).
    const deck=!this.consumedEvent(E('east_demolition'))&&this.enemies.filter(a=>a.alive&&a.active&&a.deck&&passes(a)).sort((a,b)=>off(a,along(a))-off(b,along(b))||this.actors.indexOf(a)-this.actors.indexOf(b))[0];
    for(const a of this.enemies.filter(a=>a.alive&&a.active)){
      const d=along(a);
      if(a.deck&&!this.consumedEvent(E('east_demolition'))&&!(deck&&Math.abs(d-along(deck))<=DECK_SUPPRESS_ALONG_M))continue;
      if(passes(a)){
        const previousUntil=a.suppressedUntil;
        silenced||=a.suppressedUntil<=this.clock&&(a.weapon==='mg34'||a.group==='grp_de_spans');a.suppressedUntil=this.clock+5;
        if(fromPlayer&&a.group==='grp_de_spans')a.playerSuppressedUntil=this.clock+5;   // R2-b: the rule of the 20 s (updateActors) reads this, not suppressedUntil
        recordSuppression(a,previousUntil,this.clock);
      }
    }
    // Callout real (enemy_group_suppressed): só quando o tiro (do jogador ou, desde a fatia 2b, da retaguarda) acabou de calar uma MG ou os alemães do tabuleiro.
    const kowal=this.actor('szymon_kowal');
    if(silenced&&this.clock-this.timers.calloutAt>25&&kowal.alive&&kowal.active&&dist(kowal,p)<150){
      this.timers.calloutAt=this.clock;this.line('co_m01_enemy_group_suppressed',`co_m01_enemy_group_suppressed:${Math.round(this.clock)}`);
    }
  }
  /** The reactive dialogue's NEEDS_EVENT (docs/direction/M01_REACTIVE_DIALOGUE.md, lines 141/142): a German the player's own rifle or grenade has just killed. */
  enemyDown(a,weapon){this.emit({type:'enemy_down_by_player',id:a.id,group:a.group??null,weapon,distance:dist(a,this.player),point:{x:a.x,y:a.y,z:a.z},at:this.clock});}
  updateGrenades(dt,request){
    if(request&&this.grenades.ammo&&!this.player.carrying){const p=this.player,d=aimDirection(p.angle,p.pitch+.12);this.grenades.ammo--;
      this.grenades.active.push({id:`m01_grenade_${this.grenades.nextId++}`,...eyePosition(p),vx:d.x*12,vy:d.y*12+2,vz:d.z*12,fuse:4});}
    for(const g of this.grenades.active){g.fuse-=dt;g.vy-=9.81*dt;
      const step={x:g.vx*dt,y:g.vy*dt,z:g.vz*dt},length=Math.hypot(step.x,step.y,step.z);
      const hit=length>0?traceObstruction(this.world,g,{x:step.x/length,y:step.y/length,z:step.z/length},length):null;
      if(hit){g.vx*=-.3;g.vz*=-.3;g.vy=Math.abs(g.vy)*.3;}
      else{g.x+=step.x;g.y+=step.y;g.z+=step.z;}
      const floor=this.world.heightAt(g.x,g.z)+.08;if(g.y<floor){g.y=floor;g.vy=Math.abs(g.vy)*.3;g.vx*=.65;g.vz*=.65;}
      if(g.fuse<=0&&g.by){this.germanGrenadeBlast(g);continue;}   // R2-b: a stick grenade of the deck assault hurts the Poles' side, never the Germans
      if(g.fuse<=0){this.impact(g.id,g,false);for(const a of [this.player,...this.enemies]){
        const distance=Math.hypot(a.x-g.x,a.y+.9-g.y,a.z-g.z);
        if(a.alive&&a.active&&distance<8&&this.world.lineOfSight({...g,space:'metres',eyeHeight:.04},a)){
          const health=a.health,wasAlive=a.alive;
          a.health=Math.max(0,a.health-(1-distance/8)*100);a.alive=a.health>0;
          if(a!==this.player){recordDamage(a,health,wasAlive,this.clock,g);if(wasAlive&&!a.alive)this.enemyDown(a,'grenade');}
          else if(wasAlive&&!a.alive)this.playerDown('grenade');}   // F5: his own grenade
      }}
    }this.grenades.active=this.grenades.active.filter(g=>g.fuse>0);
    for(const a of this.enemies)if(proneGunner(a))this.updateMG34Posture(a);
  }
  /**
   * R2-b: a German stick grenade goes off (updateGrenades, fuse spent). The m01-blast of kind grenade with its smoke (impact, `by` on the event); the player takes ONE wound of his level (woundPlayer: the
   * level's damage, the burst cap, the fair-death clamp F1, F4) when he is within tactics.grenade.woundM of it with the grenade's own line of sight to him, and nothing otherwise; the Poles of the section and of
   * the rearguard within suppressM with a clear path are pinned for suppressSec (never wounded: allies fall only by their scripted rules). The thrower's telegraph is the throw (noteTelegraph at the throw),
   * so the first grenade of an engagement can never take the player to 0. No draw.
   */
  germanGrenadeBlast(g){
    const G=DECK_ASSAULT.tactics.grenade,clock=this.clock,at={x:g.x,y:g.y,z:g.z};
    this.impact(g.id,at,false,{by:g.by});
    const clear=b=>this.world.lineOfSight({space:'metres',...at,eyeHeight:.04},b);
    const p=this.player;
    if(p.alive&&Math.hypot(p.x-g.x,p.y+.9-g.y,p.z-g.z)<=G.woundM&&clear(p))this.woundPlayer({by:g.by,weapon:'stielhandgranate',kind:'grenade',firedAt:g.at});
    for(const a of this.allies){
      if(!a.alive||!a.active||a.carriedBy||Math.hypot(a.x-g.x,a.z-g.z)>G.suppressM||!clear(a))continue;
      const previousUntil=a.suppressedUntil;a.suppressedUntil=Math.max(a.suppressedUntil,clock+G.suppressSec);recordSuppression(a,previousUntil,clock);
    }
  }
  boundaries(dt){
    const p=this.player,b=this.world.layout.bounds;
    if(p.x>b.softWarningX&&!this.timers.boundaryWarning){this.timers.boundaryWarning=true;this.message('Você está demasiado longe. Volte à sua secção, para oeste.');}
    if(p.x<=b.softWarningX)this.timers.boundaryWarning=false;
    const a=b.playable,out=p.x>b.outOfBoundsX||p.x<a.minX||p.z<a.minZ||p.z>a.maxZ;
    this.timers.boundary=out?this.timers.boundary+dt:0;
    this.timers.water=p.y<=-9?this.timers.water+dt:0;
    const countdown=Math.max(0,Math.ceil(b.outOfBoundsGraceSec-this.timers.boundary));
    if(out&&countdown!==this.timers.boundaryCountdown){this.timers.boundaryCountdown=countdown;this.message(`Você se afastou da sua secção. Volte em ${countdown} s.`);}
    if(this.timers.boundary>=b.outOfBoundsGraceSec||this.timers.water>=8){
      const was=this.player.alive,cause=this.timers.water>=8?'water':'bounds';this.player.alive=false;
      if(was)this.playerDown(cause);else this.failure=deathText(cause);   // F5: 'Você caiu no Vístula.' / 'Você se afastou da sua secção.' (the event once, the text as before)
    }
  }
  tick(dt,controls={}){
    if(!Number.isFinite(dt)||dt<=0||this.mission.complete)return;dt=Math.min(.05,dt);
    if(!this.player.alive){const reason=this.failure;this.restoreCheckpoint();this.emit({type:'restored'});if(reason)this.message(reason);return;}
    this.clock+=dt;const p=this.player;
    if(p.concussedUntil!==undefined&&!(this.clock<p.concussedUntil)){delete p.concussion;delete p.concussedUntil;}   // R1-a: the stun is over; the player returns to the shape he had before it
    // Player rays use this tick's transition frame, matching the frame later sampled by presentation.
    for(const a of this.enemies)if(proneGunner(a))this.updateMG34Posture(a);
    p.angle+=(controls.lookX??0)*.0022;p.pitch=Math.max(-1.25,Math.min(1.25,p.pitch-(controls.lookY??0)*.0022));p.aiming=Boolean(controls.aim);
    if(controls.crouch)p.crouched=!p.crouched;
    this.updateScene(dt,controls.skip);
    const locked=this.scene?.id==='cs_m01_intro'||this.scene?.id==='cs_m01_roll_call';
    if(locked&&this.scene.id==='cs_m01_intro')this.advanceBattle(dt);
    if(!locked){
      const f=controls.forward??0,s=controls.side??0,len=Math.hypot(f,s)||1;
      // R1-a: a concussed player (a bomb within 60 m, m01-blast.js) loses part of his speed and cannot sprint when badly stunned; stun is 0 for everyone else, and the numbers are then exactly the old ones.
      const stun=concussionLevel(p,this.clock);
      const speed=(controls.sprint?6*(1-CONCUSSION.sprintCut*stun):3.8*(1-CONCUSSION.walkCut*stun))*(p.carrying?.55:1)*(p.crouched?.6:1)*(p.aiming?.65:1);
      const dx=(Math.cos(p.angle)*f-Math.sin(p.angle)*s)*speed*dt/len,dz=(Math.sin(p.angle)*f+Math.cos(p.angle)*s)*speed*dt/len;
      const before={x:p.x,z:p.z};this.moveBody(dx,dz,dt);p.moveBlend=Math.min(1,dist(before,p)/(dt*3.8));p.sprinting=Boolean(controls.sprint)&&p.moveBlend>.1&&stun<CONCUSSION.sprintOffAt;
      this.weapon.update(this.clock*1000);
      if(controls.reload&&this.weapon.reload(this.clock*1000))this.emit({type:'reload',weapon:'kb_wz29'});
      if(controls.sight)this.message(`Alça: ${this.weapon.adjustSight()} m`);
      if(controls.fire)this.fire();this.updateGrenades(dt,controls.grenade);
      this.advanceBattle(dt);this.boundaries(dt);
    }
    this.updateActors(dt);this.updateCombat(dt);
    for(const a of this.actors){updatePosture(a,this.clock);updateBodyYaw(a,dt);}
    if(!p.alive)return;
    this.regenerate(dt);
    this.updateObjectives(dt,controls.interact);this.updatePreRoll();this.processEvents();this.updateRaidSchedule();this.updateEarlyRaid();this.updateContinuity();
    if(this.flags['m01.second_raid_state']==='active'&&this.battleClock>=seconds('05:34:00'))this.flags['m01.second_raid_state']='ended';
    for(const sector of this.sectors.sectors){const schedule=definition.sectors.find(s=>s.id===sector.id).schedule;
      const current=schedule.filter(s=>seconds(s.at)<=this.battleClock).at(-1);sector.state=current.state;
      if(sector.id==='s2_east_bridgehead')sector.strength=this.enemies.filter(a=>a.alive).length*2;}
    if(this.battleClock>=seconds('06:36:00')&&!this.consumedEvent(E('west_demolition')))this.line('dlg_m01_050');
    if(this.battleClock>=seconds('06:38:30')&&!this.consumedEvent(E('west_demolition')))this.line('dlg_m01_051');
    if(this.active('follow_sergeant')&&this.clock>this.timers.guide)this.followCall();
    this.updateGuide();
    if(this.active('hold_access')){
      const cover=this.world.coverAt(p)?.id??null;
      if(cover!==this.timers.occupiedCover){this.timers.occupiedCover=cover;this.timers.coverExposure=0;}
      else if(cover)this.timers.coverExposure+=dt;
      if(this.timers.coverExposure>=this.level.coverAdjustSalvoSec&&this.clock>this.timers.nextCoverCall){
        const rotation=['cv_sandbag_mid_2','cv_portal_road_n','cv_road_truss_1','cv_road_truss_3','cv_tower_p1_n'];
        // "Ajusta sobre a cobertura": rajada real de uma MG que vê o jogador (impactos na cobertura, não dano garantido).
        // Uma MG que o veja dispara uma rajada; sem MG, uma salva de até quatro atiradores (um tiro cada).
        const shooters=this.enemies.filter(a=>a.group==='grp_de_east'&&a.alive&&a.active&&this.clock>=a.suppressedUntil&&canMG34Fire(a)).sort((a,b)=>(b.weapon==='mg34')-(a.weapon==='mg34'))
          .filter(a=>this.world.lineOfSight(a,p)).slice(0,4);
        // No warning or cover reservation until a real salvo is emitted. Retry at a bounded cadence.
        this.timers.nextCoverCall=this.clock+(shooters.length?this.level.coverAdjustSalvoSec:4);   // H9 D2: 42 / 30 / 20 s
        if(shooters.length)this.flags['m01.suggested_cover']=rotation[this.timers.coverCallIndex++%rotation.length];
        // The order to change cover is spoken (a line of m01-barks.js for the node: 035, 136, 137 or the generic callout), before the salvo; the HUD message below is what is left when no voice can be said.
        const spoken=shooters.length>0&&barkTrigger(this,'coverRotation',{node:this.flags['m01.suggested_cover']});
        for(const a of shooters[0]?.weapon==='mg34'?shooters.slice(0,1):shooters){
          this.burst(a,p,'cover',a.weapon==='mg34'?{rounds:7,bias:[.5,.3],cone:[.6,.4],tracer:true}:{rounds:1,bias:[.8,.5],cone:[0,0]});a.cooldown=Math.max(a.cooldown,6);
        }
        if(shooters.length){this.mission.status=this.coverFireStatus();const toast=`Zieliński: ${this.mission.status}.`;
          // Review N1 (2026-10-19): the voice is only queued here; if it expires unseen the HUD message is shown then (dropBark), so the order is never lost.
          if(!spoken)this.message(toast);else{const q=this.dialogueQueue.findLast(q=>q.queuedAt===this.clock&&BARK_RULES.get(q.id)?.on==='coverRotation');if(q)q.fallback=toast;}}
      }
    }
    barkPoll(this);   // the reactive lines that read state (m01-barks.js)
    this.advanceSubtitle();
  }
  /** The player's body moves (walls, ledges, gravity: src/world/m01-player-physics.js) and, if it touched down after a fall, lands. Every move of the player goes through here. */
  moveBody(dx,dz,dt){const landing=movePlayer(this.world,this.player,dx,dz,dt);if(landing)this.playerLanded(landing);}
  /**
   * The body touched down after a real fall (src/world/m01-player-physics.js): the impact costs health from a 3 m drop, a man at full health dies from 9 m,
   * and a splash in the river costs nothing. The event is transient (presentation: camera dip, thud); the health is the only state.
   */
  playerLanded(landing){
    const p=this.player,{speed,drop,damage,surface,x,y,z}=landing;
    if(damage>0){p.health=Math.max(0,p.health-damage);p.alive=p.health>0;if(this.level.healing)this.timers.lastHitAt=this.clock;}
    this.emit({type:'player-landing',speed,drop,damage,surface,point:{x,y,z}});
    if(!p.alive)this.playerDown('fall');   // 'Você caiu de uma altura fatal.' (F5: the event after player-landing)
    else if(damage>0)this.message(`Queda dura: -${damage} de vida.`);
  }
  /** 04:35:30: Dudek reaches the station casualty, drags him to the aid point, then returns to his bridge post. */
  interruptStationEvacuation(){
    const patient=this.actor(STATION_PATIENT),medic=this.actor('leon_dudek');
    if(!patient.stationDrag&&!(patient.task==='station_wounded'&&patient.carriedBy===medic.id)&&medic.task!=='evacuate_station_wounded')return;
    if(patient.alive&&patient.active&&patient.task==='station_wounded'&&medic.alive&&medic.active&&medic.state!=='WOUNDED'&&medic.task==='evacuate_station_wounded')return;
    if(patient.carriedBy===medic.id)patient.carriedBy=null;
    delete patient.stationDrag;patient.y=this.world.heightAt(patient.x,patient.z);
    if(medic.task==='evacuate_station_wounded')Object.assign(medic,{task:null,crouched:false,target:this.world.point('aid_position')});
  }
  evacuateStation(medic,dt){
    const patient=this.actor(STATION_PATIENT);
    const phase=name=>patient.stationDrag={phase:name,startedAt:this.clock,duration:STATION_TRANSITION_SEC};
    // Only this pair needs an exact endpoint. Leave the common follower arrival logic intact.
    const reach=(target,speed)=>{
      const d=dist(medic,target);
      if(d>.9)this.moveActor(medic,target,dt,speed);
      else if(d>=.001){
        const step=Math.min(d,speed*dt);
        this.world.move(medic,(target.x-medic.x)*step/d,(target.z-medic.z)*step/d);medic.state='ADVANCE';
      }
    };
    if(patient.carriedBy!==medic.id){
      // Reach the head from the side instead of walking through the casualty's body.
      const facing=Math.atan2(patient.z-STATION_DELIVERY.z,patient.x-STATION_DELIVERY.x);
      const head={x:patient.x-Math.cos(facing)*STATION_DRAG_OFFSET,z:patient.z-Math.sin(facing)*STATION_DRAG_OFFSET};
      reach(medic.x>patient.x-.7?{x:patient.x-1.4,z:patient.z+2.3}:head,4.5);
      if(dist(medic,head)<.001){
        patient.carriedBy=medic.id;Object.assign(medic,{crouched:true,facing,state:'GUARD'});phase('grab');
        this.line('dlg_m01_017',`${E('wounded_dragged')}:17`);
      }
      return;
    }
    // Legacy schema 2 saves already in transit resume their drag without replaying the grab.
    if(!patient.stationDrag)phase('drag');
    const transport=patient.stationDrag,elapsed=this.clock-transport.startedAt;
    if(transport.phase==='grab'){
      if(elapsed+1e-9<transport.duration)return;
      phase('drag');return;
    }
    if(transport.phase==='release'){
      if(elapsed+1e-9<transport.duration)return;
      // The roots have already arrived here; this only removes numerical movement residue.
      Object.assign(patient,{carriedBy:null,task:'station_aid_post',...STATION_DELIVERY});delete patient.stationDrag;
      patient.y=this.world.heightAt(patient.x,patient.z);
      Object.assign(medic,{task:null,crouched:false,state:'GUARD',target:this.world.point('aid_position')});
      return;
    }
    const destination={x:STATION_DELIVERY.x-Math.cos(medic.facing)*STATION_DRAG_OFFSET,z:STATION_DELIVERY.z-Math.sin(medic.facing)*STATION_DRAG_OFFSET};
    if(dist(medic,destination)>=.001){const facing=medic.facing;reach(destination,.65);medic.facing=facing;}
    if(dist(medic,destination)<.001){medic.state='GUARD';phase('release');}
  }
  /** Dudek vai até Bąk, carrega-o e deixa-o junto à estação; Bąk nunca fica na zona de demolição oeste. */
  interruptCarry(){
    const bak=this.actor('jozef_bak');if(!bak.carry&&!bak.carriedBy)return;
    const carrier=this.actor(bak.carriedBy)??(bak.carriedBy===this.player.id?this.player:null);
    if(bak.alive&&(bak.active||carrier===this.player)&&carrier?.alive&&carrier.active&&carrier.state!=='WOUNDED')return;
    bak.carriedBy=null;delete bak.carry;bak.y=this.world.heightAt(bak.x,bak.z);
    if(carrier?.task==='evacuate_bak'){carrier.task=null;carrier.target=null;carrier.shot=0;}
  }
  evacuate(medic,dt){
    const bak=this.actor('jozef_bak');
    if(!bak.alive||!bak.active){medic.task=null;return;}
    if(bak.carriedBy===this.player.id&&bak.carry)return;
    if(bak.carriedBy!==medic.id){
      this.moveActor(medic,bak,dt,4.5);
      if(dist(medic,bak)<1.6){bak.carriedBy=medic.id;bak.carry={phase:'pickup',startedAt:this.clock,duration:1.6};medic.state='GUARD';}
      return;
    }
    // Legacy saves already on the shoulder continue carrying, without replaying pickup.
    bak.carry??={phase:'carry',startedAt:this.clock,duration:1.6};
    const phase=bak.carry;
    if(phase.phase==='pickup'){
      if(this.clock-phase.startedAt>=phase.duration)bak.carry={phase:'carry',startedAt:phase.startedAt+phase.duration,duration:1.6};
      return;
    }
    if(phase.phase==='putdown'&&this.clock-phase.startedAt<phase.duration)return;
    // SP-08 (2026-10-22): with the player beside him Dudek keeps his escort pace; alone in the escort, a near miss puts him down until it passes (src/game/m01-corridor.js).
    if(phase.phase==='carry'){const pace=escortPace(this,medic);if(pace===null){medic.state='GUARD';return;}this.moveActor(medic,EVACUATION,dt,pace);}
    if(dist(medic,EVACUATION)<1.2){
      if(phase.phase!=='putdown'){bak.carry={phase:'putdown',startedAt:this.clock,duration:1.6};medic.state='GUARD';return;}
      bak.carriedBy=null;bak.x=medic.x+.9;bak.z=medic.z+.7;bak.y=this.world.heightAt(bak.x,bak.z);bak.facing=medic.facing;
      delete bak.carry;
      // Ramo Dudek: fica com Bąk na estação (dlg_m01_056b/057b). Ramo do jogador: volta à secção (dlg_m01_057a).
      medic.task=this.flags['m01.bak_status']==='rescued_by_dudek'?'stay_with_bak':null;medic.target=null;medic.state='GUARD';
    }
  }
  /** 07:05: os presentes na chamada reúnem-se no abrigo, de frente para Jan; ausentes ficam onde estão. */
  stageRollCall(){
    const present=['marek_zielinski','szymon_kowal','pawel_krawiec','staszek_pawlak','sapper_2','sapper_3',
      ...(this.flags['m01.dudek_status']==='unhurt'?['leon_dudek']:[]),...(this.flags['m01.bak_status']==='unhurt'?['jozef_bak']:[])]
      .map(id=>this.actor(id)).filter(a=>a&&a.alive&&a.active&&!a.carriedBy&&a.state!=='WOUNDED');
    const p=this.player,shelter=this.world.point('shelter');
    Object.assign(p,{x:shelter.x-.5,z:shelter.z-1.2,crouched:true,pitch:-.06});p.y=this.world.heightAt(p.x,p.z);   // 0.6 m further in than before: the L return wall (z 68.0-68.35) used to enclose the camera
    present.forEach((a,i)=>{const [x,z]=ROLL_CALL_SEATS[i%ROLL_CALL_SEATS.length];
      Object.assign(a,{x,z,target:null,task:null,state:'GUARD',pose:'seated',crouched:true});a.y=this.world.heightAt(x,z);a.facing=Math.atan2(p.z-z,p.x-x);});
    p.angle=Math.atan2(72.6-p.z,-260-p.x);
  }
  /**
   * Zieliński calls the player to the rally point («siga a voz»): once the voice that is speaking has finished, then every 14 s, and not while the player is closing in (8 m since the last
   * call). It was the same HUD message every 7 s; it is a voice now (the guide variants dlg_m01_015a-d, m01-barks.js) and the message is only what is left when no voice can be said.
   */
  followCall(){
    const t=this.timers;
    if(this.subtitle||this.dialogueQueue.length)return;   // wait for the voice that is speaking; asked again at the next tick
    const d=dist(this.player,this.world.point('rally_point')),progressing=t.guide!==0&&t.guideDist-d>=8;   // guide 0: the first call
    t.guide=this.clock+14;t.guideDist=d;
    if(progressing)return;
    if(!barkTrigger(this,'guide'))this.message('Zieliński chama-o da trincheira, a oeste.');
  }
  /** Destino do objectivo activo que exige deslocação (dados do mapa ou actor). */
  guideTarget(){
    const p=this.player,pt=id=>this.world.point(id);
    if(this.active('rescue_bak'))return p.carrying==='jozef_bak'?{label:'Socorrista Dudek',point:pt('aid_position')}:{label:'Bąk ferido',point:this.actor('jozef_bak')};
    if(this.active('deliver_message'))return {label:'Posto da ponte ferroviária',point:pt('forward_post')};
    if(this.active('find_sappers'))return {label:'Sapadores no aterro',point:pt('repair_site_1')};
    if(this.active('fetch_material'))return p.carrying?{label:'Sapadores no segundo corte da linha',point:pt('repair_site_2')}:{label:'Barracão ferroviário, porta oeste',point:pt('rail_hut')};
    if(this.active('cover_repair')){const mg=this.enemies.find(a=>a.alive&&a.active&&a.weapon==='mg34');if(mg)return {label:'Metralhadora no dique · V para alça 1000 m',point:mg};}
    if(this.active('hold_access')&&!this.timers.holdAccessVisited)return {label:'Posição no tabuleiro rodoviário',point:HOLD_POSITION};
    if(this.active('leave_bridge'))return {label:'Posto de disparo',point:pt('firing_point')};
    if(this.active('reach_shelter'))return {label:'Abrigo',point:pt('shelter')};
    return null;
  }
  /** Mostra destino, distância e lado quando o jogador não se aproxima; cala-se enquanto ele progride. */
  updateGuide(){
    const t=this.timers,g=this.scene?.id==='cs_m01_intro'||this.scene?.id==='cs_m01_roll_call'?null:this.guideTarget();
    if(!g){t.guideKey=null;return;}
    const p=this.player,d=dist(p,g.point);
    if(t.guideKey!==g.label){t.guideKey=g.label;t.guideAt=this.clock+4;t.guideDist=d;t.guideShown=false;return;}
    if(this.clock<t.guideAt)return;
    const progressing=t.guideDist-d>=8;t.guideAt=this.clock+15;t.guideDist=d;
    if(d<10||(t.guideShown&&progressing))return;
    t.guideShown=true;
    this.message(`${g.label}: ${Math.round(d)} m, ${this.directionTo(g.point)}`);
  }
  directionTo(point){
    const p=this.player,rel=Math.atan2(point.z-p.z,point.x-p.x)-p.angle;
    const a=Math.atan2(Math.sin(rel),Math.cos(rel)),deg=Math.abs(a)*180/Math.PI;
    return deg<35?'em frente':deg>120?'atrás de si':a>0?'à sua direita':'à sua esquerda';
  }
  /** Direcção do impacto real, mesmo quando a treliça tapa a poeira. Não muda a câmara nem guarda estado adicional. */
  demolitionStatus(){
    const damage=this.sectors.damage.findLast(d=>(d.id==='east_demolition'||d.id==='west_demolition')&&
      this.clock>=d.started&&this.clock-d.started<(d.id==='east_demolition'?12:15));
    if(!damage)return '';
    const east=damage.id==='east_demolition';
    return `Demolição ${east?'leste':'oeste'} · ${Math.round(dist(this.player,damage))} m, ${this.directionTo(damage)} · ${east?'recue para o posto de disparo':'siga para o abrigo'}`;
  }
  /** Linha de estado do HUD: só lê a simulação (progresso, supressão real, contagem por ID). */
  threatStatus(){
    if(this.active('cover_repair')){
      const progress=Math.floor(this.objectives[O('cover_repair')].progress),mg=this.actor('de_east_0');
      if(this.clock<this.timers.repairSuppressedUntil)return `Reparo ${progress}% · sapadores deitados sob fogo da metralhadora do dique`;
      return `Reparo ${progress}% · ${sapperPhase(this).stage?.text??'sapadores a trabalhar'}${mg.alive&&this.clock<mg.suppressedUntil?' · metralhadora do dique suprimida':''}`;   // R3-a: the stage of the operation
    }
    if(this.active('cover_withdrawal')){
      const n=this.flags['m01.east_platoon_survivors'];
      if(!this.consumedEvent(E('germans_on_east_spans')))return `Pelotão leste: ${n} homens a atravessar o tabuleiro`;
      const spans=this.enemies.filter(a=>a.group==='grp_de_spans'&&a.alive&&a.active);
      // Combat slice 2: once the platoon is across, the line says where the deck assault is and what it does; the demolition waits for the deck to clear.
      const assault=spans.filter(a=>a.deck&&deckRole(a)==='assault'),crossing=this.withdrawingPlatoon().some(a=>a.x>=660);
      if(assault.length&&!crossing){
        const near=Math.round(Math.min(...assault.map(a=>dist(a,this.player)))),back=assault.every(a=>['fallback','clear'].includes(a.deck.phase));
        return this.deckClear()?'Tabuleiro livre · demolição leste iminente':back?`Alemães no tabuleiro a ${near} m · a recuar · a demolição espera que saiam dos vãos`:
          `Alemães no tabuleiro a ${near} m · a avançar · faça-os recuar a tiro`;
      }
      return `Pelotão leste: ${n} homens · alemães no tabuleiro ${spans.some(a=>a.suppressedUntil>this.clock)?'suprimidos':'a disparar sobre eles'}`;
    }
    return this.coverFireStatus()||this.demolitionStatus();
  }
  /** A origem da salva real continua legível depois de os tiros chegarem, sem exigir ver através da treliça. */
  coverFireStatus(){
    const fire=this.timers.coverFire;
    if(!this.active('hold_access')||!fire||this.clock<fire.at||this.clock-fire.at>=8)return '';
    const actor=this.actor(fire.by),gate=gateShooter(actor);
    const source=gate?(actor.weapon==='mg34'?'Metralhadora':'Atiradores')+' nos portões de Lisewo':`Salva do dique ${fire.z<0?'norte':'sul'}`;
    return `${source} · ${Math.round(dist(this.player,fire))} m, ${this.directionTo(fire)} · mude de cobertura`;
  }
  /** Diagnóstico só de leitura: o que um jogador vê (clarões recentes) e o estado real por trás do HUD. */
  get stationEvacuation(){
    const patient=this.actor(STATION_PATIENT),medic=this.actor('leon_dudek');
    const data=a=>({id:a.id,x:a.x,y:a.y,z:a.z,facing:a.facing,alive:a.alive,active:a.active,state:a.state,task:a.task??null,carriedBy:a.carriedBy??null,
      ...(a.stationDrag?{stationDrag:{...a.stationDrag}}:{})});
    return {patient:data(patient),medic:data(medic),delivered:patient.task==='station_aid_post'};
  }
  get threat(){
    const repair=this.objectives[O('cover_repair')];
    return {inFlight:this.enemyFire.rounds.length,status:this.mission.status??'',
      coverFire:this.timers.coverFire?{...this.timers.coverFire,age:this.clock-this.timers.coverFire.at}:null,
      recentFire:this.enemies.filter(a=>a.alive&&a.active&&this.clock-a.firedAt<2.5).map(a=>({id:a.id,weapon:a.weapon,...eyePosition(a),age:this.clock-a.firedAt})),
      repair:{progress:repair.progress,state:repair.state,pinned:this.clock<this.timers.repairSuppressedUntil,pins:this.timers.repairPins??0,fireEase:Boolean(this.timers.fireEase)},
      survivors:this.flags['m01.east_platoon_survivors'],
      spansSuppressed:this.enemies.some(a=>a.group==='grp_de_spans'&&a.alive&&a.active&&a.suppressedUntil>this.clock),
      mgSuppressed:this.enemies.filter(a=>a.weapon==='mg34'&&a.alive&&a.suppressedUntil>this.clock).map(a=>a.id)};
  }
  /** Read-only copy of the visual-only display rounds ({rounds, firedAt, skipped, nextId}); the renderer draws them after the gameplay tracers. */
  get displayFire(){return displayFireView(this.display);}
  /** P2, computed on every read and never saved: the current objective's marker (label, point, distance, bearing) and the battle-clock tempo. */
  get objectiveMarker(){return objectiveMarker(this);}
  /** SP-08, computed on every read: the corridor task (phase, count, Dudek with Bąk, escorted) or null before the corridor. */
  get corridorTask(){return corridorView(this);}
  get tempo(){return tempoState(this);}
  /** R3-a, computed on every read, never saved: the phase of the sappers' operation (stage, which cut is open, the box, the tester) for the renderer, the HUD and the tests (src/game/m01-sappers.js). */
  get sapperOps(){return sapperView(this);}
  /** R1-b: what the men of the opening are doing (read-only, never saved; null from the first bomb of 04:34): the renderer, the HUD, the metrics and the tests read it. */
  get openingView(){return openingView(this);}
  /** Computed on every read, never stored or saved: clock, phase, scene, event flags, per-sector men and fire, recent blasts. */
  get battleReadout(){return computeBattleReadout(this.display,this);}
  get interaction(){
    const p=this.player;
    if(this.scene&&definition.cutscenes.find(c=>c.id===this.scene.id).skippable)return 'Espaço · saltar cena';
    if(this.active('deliver_message')&&dist(p,this.world.point('forward_post'))<4)return 'E · entregar mensagem e café';
    if(this.active('fetch_material')&&dist(p,this.world.point(p.carrying?'repair_site_2':'rail_hut'))<6)return p.carrying?'E · entregar material':'E · carregar material';
    if(this.active('rescue_bak')&&dist(p,p.carrying?this.world.point('aid_position'):this.actor('jozef_bak'))<4)return p.carrying?'E · entregar Bąk':'E · levar Bąk';
    const kowal=this.actor('szymon_kowal');
    if(!p.carrying&&(this.timers.kowalRounds??0)>0&&kowal.alive&&kowal.active&&dist(p,kowal)<3&&this.weapon.reserve<=25)return 'E · pedir munição a Kowal';
    return p.carrying?'Está a transportar '+(p.carrying==='jozef_bak'?'Bąk':'material dos sapadores'):'';
  }
  get renderState(){
    const parts={};for(const file of manifest.files.filter(f=>f.lod===0))for(const n of file.nodes){
      const origin=n.pivot??[0,0,0],z=origin[2]+file.placement.translation[2];const d=Math.hypot(origin[0]-this.player.x,z-this.player.z);
      parts[n.name]={lod:d<400?0:d<800?1:2,visible:n.name.endsWith('portal_west')? !this.consumedEvent(E('west_demolition')):
        n.showAfterEvent?this.consumedEvent(n.showAfterEvent):!n.destroyedBy||!this.consumedEvent(n.destroyedBy)};
    }return {parts,events:Object.keys(this.consumed),destruction:[...this.destruction],flags:{...this.flags},
      battleClock:this.battleClock,interaction:this.interaction,subtitle:this.subtitle,scene:this.scene,
      debrief:definition.debrief.paragraphs.filter(p=>p.enabled),repairProgress:this.objectives[O('cover_repair')].progress,
      train963:this.consumedEvent(E('train963_arrives')),panzerzug:this.consumedEvent(E('panzerzug_arrives')),
      stukas:this.consumedEvent(E('planes_heard'))&&!this.consumedEvent(E('second_air_pass')),
      secondRaid:this.flags['m01.second_raid_state']==='active',weaponVisible:!this.player.carrying&&this.scene?.id!=='cs_m01_roll_call',
      damage:this.sectors.damage.map(d=>({...d,smokeVisible:d.id.startsWith('m01_grenade_')?this.clock-d.started<Math.min(20,d.smokeSeconds??20):
        this.clock-d.started<240||d.id==='station_bomb'||RAID_ID.test(d.id)}))};
  }
  snapshot(includeCheckpoint=true){const s=clone({schema:2,missionId:this.missionId,clock:this.clock,battleClock:this.battleClock,rng:this.rng.state,
    player:this.player,weapon:this.weapon.snapshot(),actors:this.actors,consumed:this.consumed,objectives:this.objectives,flags:this.flags,
    destruction:this.destruction,dialogueConsumed:this.dialogueConsumed,dialogueQueue:this.dialogueQueue,subtitle:this.subtitle,
    scene:this.scene,sceneDone:this.sceneDone,checkpointsReached:this.checkpointsReached,pendingCheckpoint:this.pendingCheckpoint,
    gate:this.gate,recoveries:this.recoveries,timers:this.timers,sectors:this.sectors,grenades:this.grenades,mission:this.mission,enemyFire:this.enemyFire,
    // H9 D1: omitted for recruta so recruta saves (and the committed golden) stay byte-identical; legacy saves restore as recruta.
    ...(this.difficulty!==M01_DIFFICULTY_SIM_DEFAULT?{difficulty:this.difficulty}:{})});
    // A continuation save must preserve the previous respawn point, not promote the current tick to a CP.
    // Actual CP-A..D remain flat schema-2 saves; omit the backup when it already equals this state.
    if(includeCheckpoint&&this.checkpoint&&JSON.stringify(s)!==JSON.stringify(this.checkpoint))s.resumeCheckpoint=clone(this.checkpoint);
    return s;}
  get animationPresentation(){return presentationDiagnostics(this.actors);}
  /** H9 D2: the frozen row of the D35 table for this simulation's level (never saved: the snapshot carries only `difficulty`). */
  get level(){return M01_DIFFICULTY[this.difficulty];}
  restoreSnapshot(raw){
    const s=clone(raw);validateM01Snapshot(s);const difficulty=s.difficulty??M01_DIFFICULTY_SIM_DEFAULT,candidate=new M01Simulation(s.rng,{difficulty});
    for(const key of ['clock','battleClock','player','actors','consumed','objectives','flags','destruction','dialogueConsumed','dialogueQueue','subtitle',
      'scene','sceneDone','checkpointsReached','pendingCheckpoint','gate','recoveries','timers','sectors','grenades','mission'])candidate[key]=s[key];
    // Schema 2 legacy saves contain the exact old roster. Add only the absent complete group,
    // outside the blast zone after the existing retreat event, without touching old actors or RNG.
    if(!s.actors.some(a=>CKM_IDS.includes(a.id))){
      const at=s.consumed[E('east_demolition')],crew=makeCKMCrew(candidate.world,at??0,at!==undefined,s.rng);
      crew.forEach(a=>a.ckm.visible=!Object.hasOwn(s.consumed,E('west_demolition')));candidate.actors.push(...crew);
    }else{
      migrateCKMPlacement(candidate.actors,s.consumed);
      // Saves made before T47 have no fire record: the gunner starts with a full belt and his own stream, derived from the saved main state (no draw from it).
      const gunner=candidate.actors.find(a=>a.id==='ckm_gunner');if(gunner&&!gunner.ckmFire)gunner.ckmFire=newCKMFire(s.rng);
    }
    migrateT38Staging(candidate.actors,candidate.world);
    // R2-b: every man of the deck assault carries playerSuppressedUntil from the entry (beginDeckAssault), so a deck man without it is from a save made before R2-b, which kept no record of who suppressed him: all of that
    // suppression was the player's, and the rule of the 20 s reads it (no draw, nothing else touched). A save of R2-b always has the key, so restoring it changes nothing.
    for(const a of candidate.actors)if(a.group==='grp_de_spans'&&a.deck!==undefined&&a.playerSuppressedUntil===undefined)a.playerSuppressedUntil=a.suppressedUntil>s.clock?a.suppressedUntil:0;
    // Combat AI slice 1: a save made before it has no actor.ai. Each German of grp_de_east and Kowal gets his stream, derived from the saved main state (no draw
    // from it), no open peek and his current suppression already taken into account, so his saved cooldown runs out exactly as it would have.
    for(const a of candidate.actors)if(AI_MIGRATE(a)&&a.ai===undefined)a.ai=newAI(s.rng,aiIndex(a.id),a.suppressedUntil);
    if(!s.actors.some(a=>AUXILIARY_IDS.includes(a.id)))candidate.actors.push(...makeAuxiliaries(entity,candidate.world,candidate.actors,candidate.clock));
    // R1-a: a save made before the west garrison existed gets the whole group at its posts (outside allies / enemies / combatants, no draw): nothing happened to them, nothing is invented.
    if(!s.actors.some(a=>GARRISON_IDS.includes(a.id)))candidate.actors.push(...makeGarrison(entity,candidate.world,GARRISON_PLAN));
    candidate.enemyFire=s.enemyFire??{rounds:[],nextId:0};   // saves anteriores ao fogo em voo começam sem tiros no ar
    // Legacy MG bursts pre-created future rounds. Keep shots already in flight, cancel unissued ones, and
    // resume from standing on the next update, without a migration marker or an RNG draw.
    for(const a of candidate.actors)if(proneGunner(a)&&a.mg34Prone===undefined){
      a.shot=0;candidate.enemyFire.rounds=candidate.enemyFire.rounds.filter(r=>r.by!==a.id||r.firedAt<=s.clock);
    }
    candidate.timers={...s.timers,kowalRounds:s.timers.kowalRounds??M01_DIFFICULTY[difficulty].kowalRounds,lowAmmoHint:s.timers.lowAmmoHint??false,nextCombatCall:s.timers.nextCombatCall??0};
    // Saves anteriores activavam as 24 instâncias: só os 18 primeiros podem estar no pelotão; as reservas ficam fora de cena.
    if(!('enemyFire' in s)&&!('withdrawalPressure' in s.timers))for(const a of candidate.actors.filter(a=>a.group==='grp_east_platoon'&&Number(a.id.split('_').at(-1))>=18))
      Object.assign(a,{active:false,alive:false,health:0,state:'DOWN'});
    for(const a of candidate.actors)initializePresentation(a,candidate.clock);
    candidate.weapon.restore(s.weapon);candidate.rng.state=s.rng;candidate.events=[];candidate.world.refresh(Object.keys(s.consumed),s.flags);candidate.navigator.prewarm();   // the refresh moved the world's revision: the navigator's solids are made now, not by the first plan
    // 2026-10-18 (phys x npc integration): no release from the ckm sandbag ring any more. The ring has a door at the rear (one table, src/world/m01-nav-layout.js), so a player
    // saved inside it walks out, and a new save made there is restored where it was made; a body overlapping a new solid is pushed out by its first move.
    candidate.display=createDisplayFire(displaySeed(s.rng,s.clock),displayProfiles(definition,{actors:candidate.actors}));   // not saved: restarts empty, re-seeded from the saved state
    if(s.resumeCheckpoint!==undefined){
      const backup=new M01Simulation(undefined,{difficulty});backup.restoreSnapshot(s.resumeCheckpoint);candidate.checkpoint=backup.snapshot(false);
    }else candidate.checkpoint=candidate.snapshot(false);   // legacy schema 2 used the loaded state itself as CP
    Object.assign(this,candidate);return true;
  }
  restoreCheckpoint(){return this.restoreSnapshot(this.checkpoint);}
  /**
   * H9 D5, "continuar em nível mais baixo" after repeated deaths at one checkpoint: the checkpoint the next tick would restore is restored as a save of the lower level `to` (strictly
   * lower than this simulation's: a running mission is never made harder), and becomes its respawn point. The presentation only asks; the simulation re-levels (relevelSnapshot).
   */
  lowerDifficulty(to){
    if(!M01_DIFFICULTY_IDS.includes(to)||M01_DIFFICULTY_IDS.indexOf(to)>=M01_DIFFICULTY_IDS.indexOf(this.difficulty))throw new RangeError(`Nível M01 não é mais baixo: ${String(to)} (agora ${this.difficulty})`);
    return this.restoreSnapshot(relevelSnapshot(this.checkpoint,to));
  }
  loadCheckpoint(text){try{if(typeof text!=='string'||text.length>1000000)throw new Error('Ficheiro ausente ou demasiado grande.');this.restoreSnapshot(JSON.parse(text));return {ok:true};}catch(error){return {ok:false,error:error.message};}}
}

/**
 * H9 D5: the snapshot `raw` as a save of the LOWER (or the same) level `to`; pure, `raw` is not touched, and the result is for restoreSnapshot (which validates it). What depends on the
 * level in a save: the key `difficulty` (omitted on recruta, as snapshot() does), Kowal's pool (timers.kowalRounds counts down from the level's pool, so the rounds already taken stay
 * taken: veterano 15 -> soldado 30 gives back 15 rounds of the pool) and the state only soldado and veterano write (timers.lastHitAt, burstWound, telegraph: the validator rejects them on
 * recruta). A checkpoint reached on a harder level (CP-B2) stays reached. Raising the level is refused.
 */
export function relevelSnapshot(raw,to){
  const s=clone(raw),from=M01_DIFFICULTY[s.difficulty??M01_DIFFICULTY_SIM_DEFAULT],target=M01_DIFFICULTY[to];
  if(!target||M01_DIFFICULTY_IDS.indexOf(to)>M01_DIFFICULTY_IDS.indexOf(from.id))throw new RangeError(`Nível M01 não é mais baixo: ${String(to)} (a gravação é ${from.id})`);
  if(to===M01_DIFFICULTY_SIM_DEFAULT)delete s.difficulty;else s.difficulty=to;
  if(s.timers&&'kowalRounds' in s.timers)s.timers.kowalRounds+=target.kowalRounds-from.kowalRounds;
  if(to===M01_DIFFICULTY_SIM_DEFAULT&&s.timers)for(const k of ['lastHitAt','burstWound','telegraph'])delete s.timers[k];
  if(s.resumeCheckpoint)s.resumeCheckpoint=relevelSnapshot(s.resumeCheckpoint,to);
  return s;
}

// T47. The gunner's fire record: own random stream, belt, bursts fired, cooldown and engagement window (all finite and inside what the machine can produce).
function validateCKMFire(a,s,reject){
  const f=a.ckmFire,finite=(v,min=0,max=Infinity)=>Number.isFinite(v)&&v>=min&&v<=max,jammed=f?.jams!==undefined;
  if(a.id!=='ckm_gunner'||!f||Object.keys(f).length!==(jammed?6:5)||['rng','belt','bursts','nextAt','engagedUntil',...(jammed?['jams']:[])].some(k=>!Object.hasOwn(f,k))||
    !Number.isInteger(f.rng)||!finite(f.rng,0,0xffffffff)||!Number.isInteger(f.belt)||!finite(f.belt,0,CKM_BELT)||!Number.isInteger(f.bursts)||f.bursts<0||
    !finite(f.nextAt,0,s.clock+CKM_BURST_SEC+CKM_COOLDOWN[1]+CKM_FEED_SEC+1)||!finite(f.engagedUntil,0,s.clock+CKM_HOLD_SEC+1e-6)||
    // `jams` (CKM_STOPPAGES) is absent until the first stoppage, so every save of an earlier build is valid as it is; then it counts the slots struck, each only after the bursts it waits for.
    (jammed&&(!Number.isInteger(f.jams)||f.jams<1||f.jams>CKM_STOPPAGES.length||f.bursts<CKM_STOPPAGES[f.jams-1].after)))reject('ckm fire record');
}
// A stoppage under way (CKM_STOPPAGES): a living man at the gun, from 04:46:00 on, with a clearAt that is one clearance away from its start and still ahead; no burst in the air. The gunner's own
// record names the slot (his ckmFire.jams) and so the exact clearance; the other two men are a copy of his phase, start and clearAt, never anything of their own.
function validateCKMStoppage(a,s,reject){
  const t=a.ckm,f=a.ckmFire,g=s.actors.find(x=>x.id==='ckm_gunner')?.ckm??{},finite=(v,min=0,max=Infinity)=>Number.isFinite(v)&&v>=min&&v<=max;
  if(!a.alive||!a.active||t.burstPlan!==undefined||s.battleClock<CKM_FIRE_FROM||!finite(t.clearAt,t.startedAt+CKM_FEED_SEC-1e-9,t.startedAt+CKM_STOPPAGE_MAX_SEC+1e-9)||!(s.clock<t.clearAt))reject('ckm stoppage');
  if(a.id==='ckm_gunner'){if(!f||!Number.isInteger(f.jams)||f.jams<1||!(Math.abs(t.clearAt-t.startedAt-(CKM_STOPPAGES[f.jams-1]?.sec??-1))<=1e-9))reject('ckm stoppage slot');}
  else if(g.phase!=='stoppage'||g.startedAt!==t.startedAt||g.clearAt!==t.clearAt)reject('ckm stoppage copy');
}
// A live burst plan: the 8 rounds of the authored clip, issued in time (emitted) and landed in order (landed); nothing the machine could not have planned.
function validateCKMLive(a,s,reject){
  const t=a.ckm,b=t.burstPlan,f=a.ckmFire,finite=(v,min=0,max=Infinity)=>Number.isFinite(v)&&v>=min&&v<=max,o=ckmMuzzle();
  if(a.id!=='ckm_gunner'||!a.alive||!a.active||!f||!['idle','aim','feed','fire_burst'].includes(t.phase)||
    Object.keys(b).length!==8||['policy','startedAt','rounds','interval','emitted','landed','target','plan'].some(k=>!Object.hasOwn(b,k))||
    b.rounds!==CKM_BURST_ROUNDS||b.interval!==CKM_INTERVAL||!finite(b.startedAt,0,s.clock)||!Array.isArray(b.plan)||b.plan.length!==b.rounds||
    typeof b.target!=='string'||!/^de_(east|spans)_\d+$/.test(b.target)||!Number.isInteger(f.bursts)||f.bursts<1)reject('ckm live burst plan');
  const emitted=Math.min(b.rounds,Math.floor((s.clock-b.startedAt+1e-9)/b.interval)+1),landed=b.plan.filter(r=>r.arriveAt<=s.clock).length;
  if(b.emitted!==emitted||b.landed!==landed||landed>=b.rounds)reject('ckm live burst progress');
  // fire_burst lasts exactly the clip; afterwards the plan only waits for its last round to land (and a spent belt can already be changing).
  if((t.phase==='fire_burst')!==(s.clock-b.startedAt<CKM_BURST_SEC)||(t.phase==='fire_burst'&&t.startedAt!==b.startedAt))reject('ckm live burst phase');
  let flight0=null,h0=null;
  b.plan.forEach((r,k)=>{
    if(!r||typeof r!=='object'||Object.keys(r).length!==15||r.id!==`ckm_${f.bursts-1}_${k}`||r.by!=='ckm_gunner'||r.weapon!=='ckm_wz30'||r.kind!=='ally'||
      r.ox!==o.x||r.oy!==o.y||r.oz!==o.z||![r.ax,r.ay,r.az,r.h,r.arriveAt].every(Number.isFinite)||!finite(r.ax,690,1500)||!finite(r.az,-300,300)||!finite(r.ay,-50,100)||
      !finite(r.h,0,40)||r.firedAt!==b.startedAt+k*b.interval||!(r.arriveAt>=r.firedAt)||r.arriveAt-s.clock>10||r.tracer!==false||r.victim!==null)reject('ckm live burst round');
    // makeRound gives the 8 rounds of a burst one aim and so one nominal range R: the same flight time R / ROUND_SPEED and the same drop h = ARC_K R². The float
    // tolerances cover the rounding of firedAt + R / ROUND_SPEED (clock values up to ~1.1e3 s, ulp ~2e-13) and of the reconstruction of R from it.
    const flight=r.arriveAt-r.firedAt,R=flight*ROUND_SPEED;
    if(k===0){flight0=flight;h0=r.h;}
    if(Math.abs(flight-flight0)>1e-9||r.h!==h0||Math.abs(r.h-ARC_K*R*R)>1e-9||R<1-1e-9)reject('ckm live burst arc');
  });
}

// A saved detour (src/world/m01-navigation.js): the corners to walk, which of them is next, and what it was made for. Anything the machine could not have made is refused.
const validNavRoute=(n,clock)=>Boolean(n)&&typeof n==='object'&&!Array.isArray(n)&&Object.keys(n).length===(n.fail===undefined?6:7)&&['goal','key','at','i','stall','pts'].every(k=>Object.hasOwn(n,k))&&(n.fail===undefined||n.fail===true&&n.i===0&&n.pts.length===1)&&
  Array.isArray(n.goal)&&n.goal.length===2&&n.goal.every(Number.isFinite)&&Number.isInteger(n.key)&&n.key>=0&&n.key<=3&&Number.isFinite(n.at)&&n.at>=0&&n.at<=clock+1e-9&&
  Array.isArray(n.pts)&&n.pts.length>=1&&n.pts.length<=24&&Number.isInteger(n.i)&&n.i>=0&&n.i<n.pts.length&&Number.isInteger(n.stall)&&n.stall>=0&&n.stall<=100000&&
  n.pts.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
export function validateM01Snapshot(s){
  const reject=message=>{throw new Error('Checkpoint M01 inválido: '+message);};
  if(!s||s.schema!==2||s.missionId!==definition.id)reject('versão ou missão');
  if(s.difficulty!==undefined&&!M01_DIFFICULTY_IDS.includes(s.difficulty))reject('dificuldade');   // H9 D1: absent (legacy = recruta) or one of the three levels
  const scan=(v,depth=0)=>{if(depth>14)reject('estrutura');if(typeof v==='number'&&!Number.isFinite(v))reject('número');
    if(v&&typeof v==='object')for(const [k,item]of Object.entries(v)){if(['__proto__','constructor','prototype','isObject3D','matrixWorld'].includes(k))reject('campo');scan(item,depth+1);}};scan(s);
  if(!Number.isFinite(s.clock)||s.clock<0||!Number.isFinite(s.battleClock)||s.battleClock<seconds('04:30:00')||s.battleClock>seconds('07:05:00')||!Number.isInteger(s.rng)||s.rng<0||s.rng>0xffffffff)reject('relógios');
  const finite=(v,min=0,max=Infinity)=>Number.isFinite(v)&&v>=min&&v<=max;
  const point=p=>p&&p.space==='metres'&&[p.x,p.y,p.z].every(Number.isFinite)&&finite(p.health,0,100)&&typeof p.alive==='boolean';
  if(!point(s.player)||s.player.health<=0||s.player.health>100||!s.player.alive||![s.player.angle,s.player.pitch].every(Number.isFinite))reject('jogador');
  // An airborne player carries his fall (src/world/m01-player-physics.js); a grounded one has none, so older saves need no migration.
  if(s.player.fall!==undefined){const f=s.player.fall;
    if(!f||typeof f!=='object'||Object.keys(f).length!==5||['vy','vx','vz','startY','t'].some(k=>!Number.isFinite(f[k]))||f.vy>0||f.vy<-60||Math.abs(f.vx)>20||Math.abs(f.vz)>20||f.t<0||f.t>30)reject('queda do jogador');}
  // R1-a: a player stunned by a bomb carries his peak (0..1] and the time it ends, both or neither; absent in every older save and once the stun is over (the next tick deletes them, so a
  // save whose end is already past is harmless and accepted). The end is never farther than the longest stun.
  if(s.player.concussion!==undefined||s.player.concussedUntil!==undefined){
    const k=s.player.concussion,u=s.player.concussedUntil;
    if(!(Number.isFinite(k)&&k>0&&k<=1)||!Number.isFinite(u)||u>s.clock+CONCUSSION.maxSec+1e-6)reject('atordoamento do jogador');
  }
  const actorIds=[...ACTOR_CAST.map(c=>c.id),...Array.from({length:40},(_,i)=>`de_east_${i}`),...Array.from({length:10},(_,i)=>`de_spans_${i}`),...Array.from({length:24},(_,i)=>`pl_east_${i}`)];
  const hasCKM=Array.isArray(s.actors)&&s.actors.some(a=>CKM_IDS.includes(a?.id));
  if(hasCKM)actorIds.push(...CKM_IDS);
  const hasAuxiliary=Array.isArray(s.actors)&&s.actors.some(a=>AUXILIARY_IDS.includes(a?.id));
  if(hasAuxiliary)actorIds.push(...AUXILIARY_IDS);
  const hasGarrison=Array.isArray(s.actors)&&s.actors.some(a=>GARRISON_IDS.includes(a?.id));   // R1-a: the unnamed west garrison enters whole or not at all
  if(hasGarrison)actorIds.push(...GARRISON_IDS);
  if(!Array.isArray(s.actors)||s.actors.length!==actorIds.length||new Set(s.actors.map(a=>a.id)).size!==s.actors.length||!s.actors.every(a=>point(a)&&actorIds.includes(a.id)&&Number.isFinite(a.radius)&&a.radius>0))reject('actores');
  for(const a of s.actors)validatePresentation(a,s.clock,reject);
  for(const a of s.actors){
    if(a.cover&&!definitionMapCover(a.cover))reject('cover node '+a.id);
    if(a.displayOnly!==undefined&&(!(AUXILIARY_IDS.includes(a.id)||GARRISON_IDS.includes(a.id))||a.displayOnly!==true))reject('display-only actor');
    if(GARRISON_IDS.includes(a.id)&&(a.displayOnly!==true||a.group!==GARRISON_GROUP||a.team!=='ally'||a.role!=='RIFLEMAN'||a.civilian))reject('west garrison');
    if(a.nav!==undefined&&!validNavRoute(a.nav,s.clock))reject('route '+a.id);   // NPC navigation: a saved detour round the solids (absent in older saves, re-made on demand)
    if(a.act!==undefined)validateOpeningAct(a,s,reject);   // R1-b: what a man of the opening is doing (absent in every older save and from the first bomb of 04:34)
    if(a.coverRun!==undefined&&(a.coverRun!==true||a.role!=='ENGINEER'||a.team!=='ally'||!(s.clock<a.suppressedUntil)||!a.target))reject('corrida para a cobertura '+a.id);   // R3-a: a shaken sapper running for cover (absent in every older save)
    if(AUXILIARY_IDS.includes(a.id)&&(!a.displayOnly||a.group!==(YARD_IDS.includes(a.id)?'grp_station_yard':'grp_mg34_loaders')))reject('auxiliary group');
    if(MG_LOADER_IDS.includes(a.id)){
      const p=a.mg34Loader,index=MG_LOADER_IDS.indexOf(a.id);
      if(a.loaderFor!==MG34_IDS[index]||!p||Object.keys(p).some(k=>!['phase','startedAt','duration'].includes(k))||!['idle','feed','leave'].includes(p.phase)||
        !finite(p.startedAt,0,s.clock)||p.duration!==(p.phase==='feed'?4.8:1.9)||a.shot!==0)reject('MG34 loader');
    }
    if(a.carriedBy===s.player.id&&(a.id!=='jozef_bak'||!a.carry||a.carry.phase!=='putdown'&&s.player.carrying!=='jozef_bak'))reject('player carry association');
    if(a.carry&&a.carriedBy!==s.player.id){const medic=s.actors.find(m=>m.id===a.carriedBy);if(medic?.id!=='leon_dudek'||medic.task!=='evacuate_bak'||!medic.alive||!medic.active)reject('carry medic association');}
  }
  for(const a of s.actors)if(CKM_IDS.includes(a.id)||a.ckm!==undefined||a.group==='grp_ckm_crew'){
    const t=a.ckm,i=CKM_IDS.indexOf(a.id);
    if(i<0||a.group!=='grp_ckm_crew'||a.role!==(i<2?'SUPPORT':'RIFLEMAN')||!t||
      Object.keys(t).some(k=>!['phase','startedAt','visible','burstPlan','clearAt'].includes(k))||!['idle','aim','feed','fire_burst','stoppage','abandon','retreat'].includes(t.phase)||
      !finite(t.startedAt,0,s.clock)||typeof t.visible!=='boolean'||
      ['abandon','retreat'].includes(t.phase)&&!finite(s.consumed?.[E('east_demolition')],0,t.startedAt))reject('guarnição ckm');
    if(t.phase==='fire_burst'&&!t.burstPlan&&a.id==='ckm_gunner')reject('ckm burst plan required');   // the other two men copy the gunner's burst without a plan
    if((t.phase==='stoppage')!==(t.clearAt!==undefined))reject('ckm stoppage clearAt');   // only a stoppage has one
    if(t.phase==='stoppage')validateCKMStoppage(a,s,reject);
    if(t.burstPlan){
      const b=t.burstPlan;
      if(b.policy==='live')validateCKMLive(a,s,reject);
      else if(Object.keys(b).some(k=>!['policy','startedAt','rounds','interval','emitted'].includes(k))||b.policy!=='disabled'||b.emitted!==0||!finite(b.startedAt,0,s.clock)||!Number.isInteger(b.rounds)||!finite(b.rounds,4,7)||b.interval!==.075||a.shot!==0||!a.alive||!a.active||['abandon','retreat','stoppage'].includes(t.phase))reject('ckm disabled burst plan');
    }
    if(a.ckmFire!==undefined)validateCKMFire(a,s,reject);
  }
  for(const a of s.actors)if(a.ai!==undefined){   // combat AI slice 1: own stream, open peek/burst group, suppression bookkeeping, last target and sighting
    const ai=a.ai,seen=ai?.seen;
    if(!AI_ACTOR(a)||!ai||typeof ai!=='object'||Array.isArray(ai)||Object.keys(ai).length!==AI_KEYS.length||AI_KEYS.some(k=>!Object.hasOwn(ai,k))||
      !Number.isInteger(ai.rng)||!finite(ai.rng,0,0xffffffff)||!Number.isInteger(ai.peek)||!finite(ai.peek,0,3)||!finite(ai.shakenUntil,0,s.clock+20)||
      !finite(ai.pinnedUntil,0,s.clock+10)||!finite(ai.recover,0,3)||(ai.target!==null&&(typeof ai.target!=='string'||!/^[a-z0-9_]{1,40}$/.test(ai.target)))||
      (seen!==null&&(!seen||typeof seen!=='object'||Object.keys(seen).length!==(seen.who===undefined?4:5)||(seen.who!==undefined&&!/^(player|szymon_kowal|leon_dudek|staszek_pawlak|east_platoon_voice|pl_east_\d+)$/.test(seen.who))||
        ![seen.x,seen.y,seen.z,seen.at].every(Number.isFinite)||!finite(seen.at,0,s.clock))))reject('IA de combate '+a.id);   // `who`: optional, absent in saves before the 2026-10-18 fix
  }
  // Combat slice 2, versioned rule (deck record v1, src/game/m01-deck-assault.js): a man of grp_de_spans who carries the deck record may stand west of x 690 down to
  // DECK_SAFE_X (450, mission data); every other German, and any man of the spans without the record (every save made before this rule), keeps x >= 690.
  for(const a of s.actors)if(a.deck!==undefined&&(a.group!=='grp_de_spans'||!Object.hasOwn(s.consumed??{},DECK_ASSAULT.from)||!validDeckRecord(a,s.clock)||a.ai===undefined))reject('assalto do tabuleiro '+a.id);
  // Combat slice 2b (rearguard record v1, src/game/m01-rearguard.js): only a man of the rearguard, after the deck assault began, with his combat AI stream.
  for(const a of s.actors)if(a.rear!==undefined&&(a.group!=='grp_east_platoon'||!Object.hasOwn(s.consumed??{},REARGUARD.from)||!validRearguardRecord(a,s.clock)||a.ai===undefined))reject('retaguarda '+a.id);
  if(s.actors.some(a=>a.team==='enemy'&&a.x<(a.group==='grp_de_spans'&&a.deck!==undefined?DECK_SAFE_X:690))||s.actors.some(a=>definition.historicalPersonsOffscreen.some(h=>h.id===a.id)))reject('elenco');
  if(s.actors.some(a=>a.team!==(a.id.startsWith('de_')?'enemy':'ally')||
    !['GUARD','ADVANCE','SUPPRESS','RETREAT','REGROUP','HIT_REACTION','DOWN','WOUNDED','reached_safety'].includes(a.state)||
    ![a.facing,a.shot,a.cooldown,a.suppressedUntil].every(Number.isFinite)||typeof a.active!=='boolean'||(a.target&&![a.target.x,a.target.z].every(Number.isFinite))))reject('estado dos actores');
  if(s.actors.some(a=>(a.carriedBy!=null&&a.carriedBy!==s.player.id&&!s.actors.some(c=>c.id===a.carriedBy&&c.alive&&c.active))||
    (a.task!=null&&![...YARD_TASKS,'evacuate_bak','stay_with_bak','evacuate_station_wounded','station_wounded','station_aid_post'].includes(a.task))))reject('transporte');
  // T48: the withdrawal's plan and its REGROUP state exist only for the Germans on the spans after the east demolition; a German carried is a fallen man lifted by a marching one.
  for(const a of s.actors){
    const f=a.fallBack;
    if(f!==undefined&&(a.group!=='grp_de_spans'||!Object.hasOwn(s.consumed,E('east_demolition'))||!f||Object.keys(f).some(k=>!['t0','x0','z0','x1','z1'].includes(k))||
      ![f.t0,f.x0,f.z0,f.x1,f.z1].every(Number.isFinite)||f.t0<seconds('04:30:00')||f.t0>s.battleClock))reject('retirada alemã '+a.id);
    if(a.state==='REGROUP'&&(a.group!=='grp_de_spans'||f!==undefined))reject('reagrupamento '+a.id);
    if(a.group==='grp_de_spans'&&a.carriedBy!=null&&(a.alive||!s.actors.some(c=>c.id===a.carriedBy&&c.group==='grp_de_spans'&&c.fallBack!==undefined)))reject('transporte alemão '+a.id);
  }
  if(s.actors.some(a=>['station_wounded','station_aid_post'].includes(a.task)&&(a.id!==STATION_PATIENT||!['WOUNDED','DOWN'].includes(a.state)||
    (a.carriedBy!=null&&(a.carriedBy!=='leon_dudek'||a.task==='station_aid_post')))||a.task==='evacuate_station_wounded'&&a.id!=='leon_dudek'))reject('evacuação da estação');
  for(const a of s.actors)if(a.stationDrag!==undefined){
    const t=a.stationDrag,m=s.actors.find(c=>c.id==='leon_dudek'),eventAt=s.consumed?.[E('wounded_dragged')];
    if(a.id!==STATION_PATIENT||!t||Object.keys(t).some(k=>!['phase','startedAt','duration'].includes(k))||
      !['grab','drag','release'].includes(t.phase)||!finite(eventAt,0,s.clock)||!finite(t.startedAt,eventAt,s.clock)||t.duration!==STATION_TRANSITION_SEC||
      !a.alive||!a.active||a.task!=='station_wounded'||a.carriedBy!==m.id||!m.alive||!m.active||m.state==='WOUNDED'||m.task!=='evacuate_station_wounded')reject('transição da evacuação da estação');
  }
  const pendingMG34Ids=new Set();
  for(const a of s.actors)if(a.mg34Prone!==undefined){
    const p=a.mg34Prone,phases=['standing','enter','idle','aim','fire_burst','reload','exit'];
    if(!proneGunner(a)||a.weapon!=='mg34'||a.group!=='grp_de_east'||!a.alive||!a.active||!p||
      Object.keys(p).some(k=>!['phase','startedAt','duration','progress','fromProgress','burst','loader','beltRemaining','fade'].includes(k))||!phases.includes(p.phase)||
      !finite(p.startedAt,0,s.clock)||p.duration!==MG34_TRANSITION_SEC||!finite(p.progress,0,1))reject('postura MG34');
    if(p.loader!==undefined&&p.loader!==MG_LOADER_IDS[MG34_IDS.indexOf(a.id)]||p.beltRemaining!==undefined&&(!Number.isInteger(p.beltRemaining)||!finite(p.beltRemaining,0,50)))reject('MG34 association/belt');
    if(p.fade){const f=p.fade;if(Object.keys(f).some(k=>!['startedAt','burstAt','rounds','duration'].includes(k))||!finite(f.startedAt,0,s.clock)||!finite(f.burstAt,0,f.startedAt)||!Number.isInteger(f.rounds)||!finite(f.rounds,4,7)||f.duration!==.2)reject('MG34 fade');}
    const progress=['enter','exit'].includes(p.phase)?Math.min(1,(s.clock-p.startedAt)/p.duration):p.phase==='standing'?0:1;
    if(Math.abs(p.progress-progress)>1e-8||(['enter','exit'].includes(p.phase)&&s.clock-p.startedAt>=p.duration)||
      (!['standing','exit'].includes(p.phase)&&!fixedMG34(a))||
      (p.phase==='exit'?!finite(p.fromProgress,0,1):p.fromProgress!==undefined))reject('transição MG34');
    if(p.phase!=='fire_burst'){if(p.burst!==undefined)reject('rajada MG34');continue;}
    const b=p.burst;
    if(!b||Object.keys(b).some(k=>!['rounds','emitted','interval','plan'].includes(k))||
      !Number.isInteger(b.rounds)||!finite(b.rounds,4,7)||!Number.isInteger(b.emitted)||!finite(b.emitted,1,b.rounds)||
      b.interval!==MG34_INTERVAL||!Array.isArray(b.plan)||b.plan.length!==b.rounds||a.firedAt!==p.startedAt||
      a.state!=='SUPPRESS'||s.clock<a.suppressedUntil||!s.enemyFire||
      b.emitted!==Math.min(b.rounds,Math.floor((s.clock-p.startedAt+1e-9)/MG34_INTERVAL)+1)||
      s.clock>=p.startedAt+b.rounds*MG34_INTERVAL)reject('rajada MG34');
    for(let k=0;k<b.rounds;k++){
      const r=b.plan[k],id=Number(r?.id?.replace('m01_round_',''));
      if(!validRound(r,s.clock)||r.by!==a.id||r.weapon!=='mg34'||r.firedAt!==p.startedAt+k*MG34_INTERVAL||
        !/^m01_round_\d+$/.test(r.id)||!Number.isInteger(id)||id<0||id>=s.enemyFire.nextId||pendingMG34Ids.has(r.id)||
        (k>=b.emitted&&s.enemyFire.rounds.some(emitted=>emitted.id===r.id)))reject('plan de rajada MG34');
      const flight=s.enemyFire.rounds.find(emitted=>emitted.id===r.id);
      if(k<b.emitted&&((r.arriveAt>s.clock&&!flight)||(flight&&(Object.keys(flight).length!==Object.keys(r).length||Object.keys(r).some(key=>flight[key]!==r[key])))))reject('tiro emitido MG34');
      pendingMG34Ids.add(r.id);
    }
    const last=b.plan[b.emitted-1];
    if(Math.abs(a.shot-Math.max(0,last.firedAt+.06-s.clock))>1e-8)reject('tiro MG34');
  }
  if(s.actors.some(a=>(a.firedAt!==undefined&&!Number.isFinite(a.firedAt))||(a.rounds!==undefined&&(!Number.isInteger(a.rounds)||a.rounds<-2||a.rounds>20))))reject('fogo dos actores');
  if(s.actors.some(a=>a.playerSuppressedUntil!==undefined&&(a.group!=='grp_de_spans'||!finite(a.playerSuppressedUntil,0,s.clock+5+1e-6))))reject('supressão do jogador');   // R2-b: only on the Germans of the spans
  if(s.enemyFire!==undefined&&(!s.enemyFire||!Array.isArray(s.enemyFire.rounds)||s.enemyFire.rounds.length>200||!Number.isInteger(s.enemyFire.nextId)||s.enemyFire.nextId<0||
    new Set(s.enemyFire.rounds.map(r=>r?.id)).size!==s.enemyFire.rounds.length||s.enemyFire.rounds.some(r=>!validRound(r,s.clock))))reject('fogo em voo');
  if(s.actors.some(a=>a.pose!=null&&a.pose!=='seated'))reject('pose');
  const w=s.weapon;
  if(w?.id!=='kb_wz29'||Object.keys(w).some(k=>!['id','mag','reserve','state','until','started','lastShot','shotCount','received','sight','reloadMode'].includes(k))||
    !Number.isInteger(w.mag)||w.mag<0||w.mag>5||!Number.isInteger(w.reserve)||w.reserve<0||w.reserve>40||
    !['READY','BOLT_CYCLE','RELOAD_CLIP','RELOAD_SINGLE'].includes(w.state)||![300,500,800,1000].includes(w.sight)||![w.until,w.started,w.lastShot,w.shotCount].every(Number.isFinite)||
    !Number.isInteger(w.shotCount)||w.shotCount<0||!Number.isInteger(w.received??0)||(w.received??0)<0||(w.received??0)>30+(s.timers?.deckAmmo??0)||
    w.mag+w.reserve+w.shotCount!==45+(w.received??0))reject('arma');
  if(!s.consumed||Object.keys(s.consumed).some(id=>!definition.events.some(e=>e.id===id))||Object.values(s.consumed).some(t=>!Number.isFinite(t)||t<0||t>s.clock))reject('eventos');
  if(!s.objectives||definition.objectives.some(o=>!s.objectives[o.id]||!['locked','active','done','expired'].includes(s.objectives[o.id].state)||!Number.isFinite(s.objectives[o.id].progress)||s.objectives[o.id].progress<0||s.objectives[o.id].progress>100))reject('objectivos');
  if(!s.flags||!Number.isInteger(s.flags['m01.east_platoon_survivors'])||s.flags['m01.east_platoon_survivors']<12||s.flags['m01.east_platoon_survivors']>18)reject('continuidade');
  for(const [key,values]of Object.entries({'m01.nowicki_status':['present','missing'],
    'm01.bak_status':['unhurt','wounded','rescued_by_player','rescued_by_dudek'],'m01.dudek_status':['unhurt','wounded_arm'],
    'm01.second_raid_state':['pending','active','ended'],'m01.forward_post_state':['pending','destroyed','intact_near_miss']}))if(!values.includes(s.flags[key]))reject('flag '+key);
  if(typeof s.flags['m01.completed']!=='boolean')reject('conclusão');
  if(!s.grenades||!Array.isArray(s.grenades.active)||!Number.isInteger(s.grenades.ammo)||s.grenades.ammo<0||s.grenades.ammo>2)reject('granadas');
  if(!s.sectors?.sectors||s.sectors.sectors.length!==5||!Array.isArray(s.sectors.damage)||!s.timers||!s.mission||typeof s.mission.complete!=='boolean')reject('estado');
  if(s.sectors.sectors.some((sector,i)=>sector.id!==definition.sectors[i].id||!definition.sectors[i].schedule.some(entry=>entry.state===sector.state)||
    ![sector.strength,sector.morale,sector.supply].every(Number.isFinite)))reject('sectores');
  if(s.sectors.damage.some(d=>typeof d.id!=='string'||![d.x,d.y,d.z].every(Number.isFinite)||!finite(d.started,0,s.clock)||!finite(d.soundAt,d.started)||
    d.smokeSeconds!==undefined&&!finite(d.smokeSeconds,0,d.id.startsWith('m01_grenade_')?20:240)||d.concussion!==undefined&&!finite(d.concussion,0,1)))reject('destruição');
  // R2-b: besides the player's (at most two), the stick grenades of the deck assault: `by` the thrower of the assault and `at` the time of the throw, the fuse at most the stick grenade's.
  const german=g=>g.by!==undefined;
  if(!Number.isInteger(s.grenades.nextId)||s.grenades.nextId<0||s.grenades.active.filter(g=>!german(g)).length>2||s.grenades.active.length>DECK_GRENADES_MAX||s.grenades.active.some(g=>typeof g.id!=='string'||![g.x,g.y,g.z,g.vx,g.vy,g.vz,g.fuse].every(Number.isFinite)||g.fuse<=0||
    (german(g)&&(Object.keys(g).length!==10||!/^de_spans_\d$/.test(g.by)||!Number.isFinite(g.at)||g.at>s.clock||g.fuse>DECK_ASSAULT.tactics.grenade.fuseSec||!/^m01_grenade_\d+$/.test(g.id)||!Object.hasOwn(s.consumed,DECK_ASSAULT.from)))))reject('granadas em voo');
  for(const key of ['boundary','water','cover','repairStall','repairSuppressedUntil','withdrawalCasualty','ambient','nextCoverCall','guide',
    'boundaryCountdown','coverExposure','coverCallIndex'])if(!finite(s.timers[key]))reject('timer '+key);
  for(const key of ['guideAt','guideDist'])if(key in s.timers&&!finite(s.timers[key]))reject('timer '+key);
  if('continuityAt' in s.timers&&!(Number.isFinite(s.timers.continuityAt)&&s.timers.continuityAt<=s.clock))reject('timer continuityAt');
  if('guideKey' in s.timers&&s.timers.guideKey!==null&&typeof s.timers.guideKey!=='string')reject('timer guideKey');
  if('guideShown' in s.timers&&typeof s.timers.guideShown!=='boolean')reject('timer guideShown');
  // H9 D2: the pool is the level's (recruta and soldado 30, veterano 15); a legacy save has no difficulty and is recruta.
  const level=M01_DIFFICULTY[s.difficulty??M01_DIFFICULTY_SIM_DEFAULT],pool=level.kowalRounds;
  if('kowalRounds' in s.timers&&(!Number.isInteger(s.timers.kowalRounds)||s.timers.kowalRounds<0||s.timers.kowalRounds>pool))reject('timer kowalRounds');
  // Combat slice 2: the clips taken from the section's box at the deck post (timers.deckAmmo, 1-DECK_AMMO_POOL rounds, with the time of the last one) are the only rounds received
  // outside Kowal's pool of 30.
  if('deckAmmo' in s.timers&&(!Number.isInteger(s.timers.deckAmmo)||!finite(s.timers.deckAmmo,1,DECK_AMMO_POOL)||!finite(s.timers.deckAmmoAt,0,s.clock)))reject('timer deckAmmo');
  if(('deckAmmoAt' in s.timers)!==('deckAmmo' in s.timers))reject('timer deckAmmo');
  if((s.timers.kowalRounds??pool)+(s.weapon?.received??0)-(s.timers.deckAmmo??0)!==pool)reject('munição da secção');
  // H9 D2 state, written only on soldado/veterano (absent on recruta and in older saves): the time of the last wound (regen), the open MG burst that wounded (cap F2) and
  // each shooter's engagement of the player (rule F1).
  if('lastHitAt' in s.timers&&!(Number.isFinite(s.timers.lastHitAt)&&s.timers.lastHitAt<=s.clock))reject('timer lastHitAt');
  if('burstWound' in s.timers){const b=s.timers.burstWound;if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).length!==3||typeof b.by!=='string'||!Number.isFinite(b.at)||
    b.at>s.clock+1||!Number.isInteger(b.n)||b.n<1||b.n>99)reject('timer burstWound');}
  if('telegraph' in s.timers){const t=s.timers.telegraph;if(!t||typeof t!=='object'||Array.isArray(t)||Object.getPrototypeOf(t)!==Object.prototype)reject('timer telegraph');
    for(const [by,e] of Object.entries(t))if(!/^de_(east|spans)_\d+$/.test(by)||!e||typeof e!=='object'||Object.keys(e).length!==2||!Number.isFinite(e.first)||!Number.isFinite(e.last)||
      e.first>e.last||e.last>s.clock+1)reject('timer telegraph');}
  if(level===M01_DIFFICULTY.recruta&&['lastHitAt','burstWound','telegraph'].some(k=>k in s.timers))reject('estado de dificuldade em recruta');
  if('lowAmmoHint' in s.timers&&typeof s.timers.lowAmmoHint!=='boolean')reject('timer lowAmmoHint');
  if('deckGrenadeAt' in s.timers&&(!finite(s.timers.deckGrenadeAt,0,s.clock)||!Object.hasOwn(s.consumed,DECK_ASSAULT.from)))reject('timer deckGrenadeAt');   // R2-b: the time of the last stick grenade of the assault
  for(const key of ['repairPins','calloutAt','firstMgAt'])if(key in s.timers&&!Number.isFinite(s.timers[key]))reject('timer '+key);
  if('fireEase' in s.timers&&typeof s.timers.fireEase!=='boolean')reject('timer fireEase');
  if('withdrawalPressure' in s.timers&&(!Number.isInteger(s.timers.withdrawalPressure)||!finite(s.timers.withdrawalPressure,0,7)))reject('timer withdrawalPressure');
  if('nextCombatCall' in s.timers&&!finite(s.timers.nextCombatCall))reject('timer nextCombatCall');
  if('barks' in s.timers)validateBarkState(s.timers.barks,s.clock,reject);
  // SP-08 and slice 3 (2026-10-22): the corridor task and the section's bounds; absent in older saves and before the east demolition.
  if('corridor' in s.timers){validateCorridorRecord(s.timers.corridor,s.clock,reject);if(!Object.hasOwn(s.consumed,E('east_demolition')))reject('timer corridor');}
  if('squad' in s.timers){validateSquadRecord(s.timers.squad,s.clock,reject);if(!Object.hasOwn(s.consumed,E('east_demolition')))reject('timer squad');}   // reactive dialogue: cooldowns, repeats, rotation, what was seen (m01-barks.js); absent in older saves
  // R2-a (2026-10-24): the section's record, from the first bomb of 04:34 to the east demolition (m01-section.js); absent in older saves, which start it at their next tick.
  if('section' in s.timers)validateSectionRecord(s.timers.section,s,reject);
  // R1-b (2026-10-25): the opening life's record, from the first tick to the first bomb of 04:34 (m01-opening.js); absent in older saves, which start it at their next tick (before 04:34 only).
  if('opening' in s.timers)validateOpeningRecord(s.timers.opening,s,reject);
  if(s.timers.raidSchedule===undefined&&s.sectors.damage.some(d=>/^raid_0530_[1-5]$/.test(d.id)))reject('missing raid schedule');
  if(s.timers.raidSchedule!==undefined){
    const schedule=s.timers.raidSchedule,world=new TczewWorld(),raidAt=s.consumed[E('bombing_0530')];
    if(!Array.isArray(schedule)||schedule.length!==RAID_PLAN.length||raidAt===undefined||s.battleClock<RAID_PLAN[0].at||
      s.flags['m01.second_raid_state']!==(s.battleClock>=seconds('05:34:00')?'ended':'active'))reject('raid schedule');
    for(const [i,t] of schedule.entries()){
      const plan=RAID_PLAN[i],p=t?.point,emitted=t?.emitted,damage=s.sectors.damage.filter(d=>d.id===plan.id);
      if(!t||Object.keys(t).some(k=>!['id','at','point','emitted'].includes(k))||t.id!==plan.id||t.at!==plan.at||
        !p||Object.keys(p).some(k=>!['x','y','z'].includes(k))||![p.x,p.y,p.z].every(Number.isFinite)||
        p.y!==world.heightAt(p.x,p.z)||p.x>world.layout.bounds.playable.minX-30||
        typeof emitted!=='boolean'||emitted!==(s.battleClock>=plan.at)||
        (emitted?dist(p,plan.point)>70.000001:p.x!==plan.point.x||p.y!==plan.point.y||p.z!==plan.point.z)||
        damage.length!==(emitted?1:0)||damage.some(d=>d.x!==p.x||d.y!==p.y||d.z!==p.z||d.started<raidAt))reject('raid target');
    }
    if(s.sectors.damage.some(d=>RAID_ID.test(d.id)&&!schedule.some(t=>t.id===d.id&&t.emitted)))reject('raid damage');
  }
  // R1-a: the 04:34 raid's schedule (raidTargets0434), created by evt_m01_bombing_0434 and absent in an older save. An entry is emitted once the battle clock has reached its time; the checkpoint of a
  // tick may be written between the clock's advance and the schedule's update (updateObjectives saves CP-B and CP-B2 before updateEarlyRaid), so a due entry that is not yet emitted is valid: the next
  // tick emits it. What cannot be is an impact before its time, a crater without its entry, an entry moved off the plan, or a point the safety shift (70 m at most) could not have made.
  if(s.timers.raidSchedule0434===undefined&&s.sectors.damage.some(d=>EARLY_RAID_ID.test(d.id)))reject('missing raid schedule 0434');
  if(s.timers.raidSchedule0434!==undefined){
    const schedule=s.timers.raidSchedule0434,world=new TczewWorld(),raidAt=s.consumed[E('bombing_0434')];
    if(!Array.isArray(schedule)||schedule.length!==RAID0434_PLAN.length||raidAt===undefined)reject('raid schedule 0434');
    for(const [i,t] of schedule.entries()){
      const plan=RAID0434_PLAN[i],p=t?.point,emitted=t?.emitted,damage=s.sectors.damage.filter(d=>d.id===plan.id);
      if(!t||Object.keys(t).some(k=>!['id','at','point','emitted'].includes(k))||t.id!==plan.id||t.at!==plan.at||
        !p||Object.keys(p).some(k=>!['x','y','z'].includes(k))||![p.x,p.y,p.z].every(Number.isFinite)||p.y!==world.heightAt(p.x,p.z)||
        typeof emitted!=='boolean'||(emitted&&s.battleClock<plan.at)||
        (emitted?dist(p,plan.point)>70.000001:p.x!==plan.point.x||p.y!==plan.point.y||p.z!==plan.point.z)||
        damage.length!==(emitted?1:0)||damage.some(d=>d.x!==p.x||d.y!==p.y||d.z!==p.z||d.started<raidAt))reject('raid target 0434');
    }
    if(s.sectors.damage.some(d=>EARLY_RAID_ID.test(d.id)&&!schedule.some(t=>t.id===d.id&&t.emitted)))reject('raid damage 0434');
  }
  if(s.timers.coverFire!==undefined){
    const fire=s.timers.coverFire,actor=s.actors.find(a=>a.id===fire?.by);
    if(!fire||!actor||actor.group!=='grp_de_east'||!finite(fire.at,0,s.clock)||
      !finite(fire.x,690,1400)||!finite(fire.y,-50,100)||!finite(fire.z,-200,200))reject('timer coverFire');
  }
  for(const key of ['escort','escortSpoke','boundaryWarning','holdAccessVisited'])if(typeof s.timers[key]!=='boolean')reject('timer '+key);
  if(!Array.isArray(s.destruction)||!Array.isArray(s.sceneDone)||!Array.isArray(s.dialogueConsumed)||!Array.isArray(s.dialogueQueue)||!Array.isArray(s.checkpointsReached)||!Array.isArray(s.recoveries))reject('listas');
  const knownScene=id=>definition.cutscenes.some(c=>c.id===id);
  if(s.sceneDone.some(id=>!knownScene(id))||new Set(s.sceneDone).size!==s.sceneDone.length)reject('cenas terminadas');
  if(s.scene){const scene=definition.cutscenes.find(c=>c.id===s.scene.id);
    if(!scene||!finite(s.scene.elapsed)||!Array.isArray(s.scene.beats)||s.scene.beats.some(i=>!Number.isInteger(i)||i<0||i>=scene.timeline.length))reject('cena');}
  if(s.gate&&(![E('repair_complete'),E('east_demolition'),E('west_demolition')].includes(s.gate.id)||!finite(s.gate.started,0,s.clock)||!finite(s.gate.hold)))reject('gate');
  if(s.checkpointsReached.some(id=>!definition.checkpoints.some(c=>c.id===id))||new Set(s.checkpointsReached).size!==s.checkpointsReached.length||
    (s.pendingCheckpoint!==null&&!definition.checkpoints.some(c=>c.id===s.pendingCheckpoint)))reject('checkpoint');
  if(s.dialogueConsumed.some(token=>typeof token!=='string')||new Set(s.dialogueConsumed).size!==s.dialogueConsumed.length)reject('falas consumidas');
  // A scripted line is {id, speaker, text, duration}; a reactive one (a line with a `bark` rule) also carries its rule's priority, `bark: true` and the time it expires in the queue.
  const dialogue=d=>{
    if(!d||!BARK_LINES.has(d.id)||typeof d.speaker!=='string'||typeof d.text!=='string'||d.text.length>=600||!finite(d.duration,1,15))return false;
    if(d.bark===undefined)return d.priority===undefined&&d.expires===undefined;
    // Not yet on screen (review N1): when it was queued, its token (among the consumed ones) and, for the order to change cover, the HUD message it stands for.
    if(d.queuedAt!==undefined&&(!finite(d.queuedAt,0,s.clock)||typeof d.token!=='string'||!s.dialogueConsumed.includes(d.token)))return false;
    if(d.fallback!==undefined&&(typeof d.fallback!=='string'||d.fallback.length>=300||d.queuedAt===undefined))return false;
    return d.bark===true&&BARK_RULES.get(d.id)?.priority===d.priority&&finite(d.expires);
  };
  if(s.dialogueQueue.some(d=>!dialogue(d))||(s.subtitle&&(!dialogue(s.subtitle)||!finite(s.subtitle.until))))reject('legendas');
  // The queue keeps its order: scripted lines first (as they came), then the reactive ones from the most urgent.
  for(let i=1;i<s.dialogueQueue.length;i++){
    const before=s.dialogueQueue[i-1],now=s.dialogueQueue[i];
    if(before.bark&&(!now.bark||before.priority>now.priority))reject('ordem das legendas');
  }
  if(s.mission.complete!==s.flags['m01.completed']||s.mission.complete!==Object.hasOwn(s.consumed,E('debrief')))reject('estado final');
  if(!['INTRO','SETUP','BUILDUP','FIRST_CONTACT','MAIN_COMBAT','SET_PIECE','CLIMAX','AFTERMATH','OUTRO'].includes(s.mission.phase))reject('fase');
  if(s.resumeCheckpoint!==undefined){
    const cp=s.resumeCheckpoint;
    if(!cp||Object.hasOwn(cp,'resumeCheckpoint')||cp.clock>s.clock||cp.battleClock>s.battleClock)reject('checkpoint de retoma');
    validateM01Snapshot(cp);
    if((cp.difficulty??M01_DIFFICULTY_SIM_DEFAULT)!==(s.difficulty??M01_DIFFICULTY_SIM_DEFAULT))reject('dificuldade do checkpoint de retoma');
    if(cp.checkpointsReached.some((id,i)=>id!==s.checkpointsReached[i]))reject('checkpoint de retoma');
  }
  return s;
}
