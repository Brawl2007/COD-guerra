import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import mapLayout from '../../missions/m01-tczew/map-layout.json' with {type:'json'};
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with { type: 'json' };
import { TczewWorld } from '../world/tczew-world.js';
import { Wz29 } from './wz29.js';
import { M01_DIFFICULTY_IDS, M01_DIFFICULTY_SIM_DEFAULT } from './m01-difficulty.js';
import { Random } from '../core/random.js';
import { eyePosition, aimDirection, muzzlePosition, traceShot, traceObstruction, rayBox } from '../world/spatial.js';
import { makeRound, traceRound, closestApproach, roundPoint, validRound, NEAR_MISS, ATTRITION_VICTIM, ARC_K, ROUND_SPEED } from './m01-fire.js';
import { aimPoint } from './m01-aim.js';
import { createDisplayFire, displaySeed, displayProfiles, updateDisplayFire, displayFireView, computeBattleReadout } from './m01-display-fire.js';
import { initializePresentation, updateMotion, updatePosture, updateBodyYaw, recordSuppression, recordHit, recordDeath,
  recordDamage, validatePresentation, presentationDiagnostics,updateActorDetails } from './m01-animation-presentation.js';
import {makeAuxiliaries,updateYard,updateLoaders,AUXILIARY_IDS,YARD_IDS,MG_LOADER_IDS,YARD_TASKS} from './m01-yard-life.js';
import {blastKind,impactPass,validateM01AudioEvent} from './m01-audio-events.js';

export const seconds=text=>{const values=text.split(':').map(Number);if(values.length===2)values.push(0);return values.reduce((n,v)=>n*60+v,0);};
export const clockText=n=>new Date(Math.round(n)*1000).toISOString().slice(11,19);
const E=name=>`evt_m01_${name}`,O=name=>`obj_m01_${name}`;
const clone=value=>JSON.parse(JSON.stringify(value));
const definitionMapCover=cover=>mapLayout.coverNodes.some(n=>n.id===cover.nodeId&&n.type===cover.type&&cover.height===(n.heightM??0));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(p,a)=>p.x>=a.minX&&p.x<=a.maxX&&p.z>=a.minZ&&p.z<=a.maxZ;
const entity=(id,point,team='ally',extra={})=>({id,space:'metres',...point,team,health:100,alive:true,active:true,
  state:'GUARD',facing:0,shot:0,radius:.3,crouched:false,suppressedUntil:0,cooldown:0,rounds:5,...extra});
const phaseText={INTRO:'04:30 · Tczew, Polónia',OUTRO:'07:05 · Chamada no abrigo'};
// Dudek leva Bąk para junto da estação ("Levaram o Bąk para a estação", dlg_m01_056b), fora da zona de demolição oeste.
const EVACUATION={x:-332,y:-3,z:24};
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
  const castIds=definition.cast.filter(c=>c.id!=='jan_wrona').map(c=>c.id),seat=(a,x,z,facing)=>{a.x=x;a.z=z;a.y=world.heightAt(x,z);if(facing!==undefined&&a.facing===0)a.facing=facing;};
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
  const point=withdrawn?{x:-170-i*1.6,z:22+i*1.2}:{x,z};
  return entity(id,{...point,y:withdrawn?world.heightAt(point.x,point.z):CKM_POSITION.y},'ally',{
    group:'grp_ckm_crew',role:i<2?'SUPPORT':'RIFLEMAN',facing:i===1?112*Math.PI/180:0,
    ckm:{phase:withdrawn?'retreat':'idle',startedAt:clock,visible:true},...(i===0?{ckmFire:newCKMFire(seed)}:{})});
});
// Lugares no abrigo de campanha (interior x −264…−256, z 66…75) para a chamada das 07:05.
const ROLL_CALL_SEATS=[[-262.8,73.6],[-261.2,73.9],[-259.6,73.9],[-258,73.6],[-263.2,71.6],[-256.9,71.6],[-262.9,69.6],[-257.1,69.6]];
// Trabalho dos sapadores sem supressão, em segundos de jogo. Com 75 s, a caixa entregue por volta das 04:42 deixava
// dois terços do reparo feitos antes do trem 963 (04:45) e nenhum fogo o podia interromper; com 150 s ele decorre sob fogo.
const REPAIR_WORK_SEC=150;
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
const eastPosition=(i,world)=>{
  const mg=FIRE_POSITIONS.find(f=>f.actor===`de_east_${i}`);if(mg)return {x:mg.position[0],y:mg.position[1],z:mg.position[2]};
  // faixa dos portões, entre as pontes (vista da margem oeste); T38: lugares desencontrados contra o portal, no chão
  if(i<14){const {x,z}=STAGE.gates.positions[i-2];return {x,y:world.heightAt(x,z),z};}
  const k=i-14;return k<14?{x:1076+(k%4)*7,y:-1,z:-80+k*5}:{x:1076+(k%4)*6,y:-1,z:52+(k-14)*4};   // dique, atrás das treliças
};
const gateShooter=a=>Number(a.id.split('_').at(-1))<14;
/** T38: a gate rifleman of grp_de_east (not an MG34 gunner, not the dike). */
const gateRifleman=a=>a.group==='grp_de_east'&&a.weapon==='kar98k'&&gateShooter(a);
const MG34_IDS=['de_east_0','de_east_1'],MG34_TRANSITION_SEC=1.9,MG34_INTERVAL=.075;
const proneGunner=a=>MG34_IDS.includes(a.id);
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

// T48 (BX-09), the Germans after the east demolition. Roadmap schedule, in battle clock: no German shot from 06:10 to 06:11 (60 s), regrouped by 06:12.
// A man's march to the close-up knot is a pure function of the battle clock (fallBack), so 06:12 holds at any time scale and tick length.
const GERMAN_SILENCE_FROM=seconds('06:10:00'),GERMAN_SILENCE_UNTIL=seconds('06:11:00'),GERMAN_REGROUP_AT=seconds('06:12:00');
// The knot forms REGROUP_AHEAD metres east of the westmost survivor (carriers then walk at ~1.2 m/s over the 14 s of play until 06:12), at most at x 1080, the
// old retreat's destination. GERMAN_FELLED is the number of men of the spans the east demolition kills, GERMAN_CARRIED how many of them are lifted.
const REGROUP_AHEAD=17,REGROUP_EAST_END=1080,REGROUP_Z=40.2,GERMAN_FELLED=4,GERMAN_CARRIED=2;
const REGROUP_SLOTS=[[0,0],[-1.8,1.1],[-1.8,-1.1],[1.8,1.1],[1.8,-1.1],[0,2.2]];   // metres east/south of the knot centre, westmost survivor first

export class M01Simulation {
  // H9 D1: the level is stored before reset() because reset() ends with a snapshot. Nothing reads it yet; reset() keeps whatever level the instance has.
  constructor(seed=19390901,{difficulty=M01_DIFFICULTY_SIM_DEFAULT}={}){
    if(!M01_DIFFICULTY_IDS.includes(difficulty))throw new RangeError('Dificuldade M01 desconhecida: '+String(difficulty));
    this.difficulty=difficulty;this.reset(seed);
  }
  reset(seed=19390901){
    this.missionId=definition.id;this.definition=definition;this.rng=new Random(seed);this.world=new TczewWorld();
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
    this.actors=definition.cast.filter(c=>c.id!=='jan_wrona').map((c,i)=>entity(c.id,
      c.id==='tadeusz_nowicki'?{x:17,y:0,z:3}:c.id===STATION_PATIENT?STATION_YARD:staged(c.id)??(c.role==='ENGINEER'?{x:-42-i*.6,y:-2,z:10}:
      c.role==='MEDIC'?this.world.point('aid_position'):{x:-76-i*1.6,y:-3,z:24+i%3*2}),'ally',{role:c.role,essential:Boolean(c.essential),civilian:c.role==='CIVILIAN',
      ...(c.id==='szymon_kowal'?{rounds:20}:{}),...(staged(c.id)?{facing:(STAGE.squad.slots[c.id]??STAGE.sappers[c.id]).facing}:{})}));   // Kowal: carregador de 20 da rkm wz.28
    for(let i=0;i<40;i++)this.actors.push(entity(`de_east_${i}`,eastPosition(i,this.world),'enemy',
      {group:'grp_de_east',weapon:i<2?'mg34':'kar98k',active:false,cooldown:1+i*.37%9,role:i<2?'SUPPORT':'RIFLEMAN',firedAt:-1e9,
        ...(i>=2&&i<14?{facing:STAGE.gates.positions[i-2].facing}:{})}));   // T38: the gate riflemen face the west bank
    // Pela metade sul do tabuleiro; o pelotão recua em fila junto à treliça norte.
    for(let i=0;i<10;i++)this.actors.push(entity(`de_spans_${i}`,{x:1050+i*3,y:0,z:39.6+i%3*1.1},'enemy',
      {group:'grp_de_spans',weapon:'kar98k',active:false,firedAt:-1e9}));
    for(let i=0;i<24;i++)this.actors.push(entity(`pl_east_${i}`,holdSlot(i),'ally',
      {group:'grp_east_platoon',active:false,role:'RIFLEMAN'}));
    this.actors.push(...makeCKMCrew(this.world,0,false,seed));
    this.actors.push(...makeAuxiliaries(entity,this.world,this.actors));
    for(const a of this.actors)initializePresentation(a,this.clock);
    this.timers={boundary:0,water:0,cover:0,repairStall:0,repairSuppressedUntil:0,withdrawalCasualty:seconds('06:00:00'),
      ambient:0,nextCoverCall:40,guide:0,guideKey:null,guideAt:0,guideDist:0,guideShown:false,kowalRounds:30,lowAmmoHint:false,escort:false,escortSpoke:false,boundaryWarning:false,boundaryCountdown:0,holdAccessVisited:false,
      occupiedCover:null,coverExposure:0,coverCallIndex:0,repairPins:0,fireEase:false,calloutAt:-1e9,nextCombatCall:0};
    this.enemyFire={rounds:[],nextId:0};
    this.display=createDisplayFire(displaySeed(this.rng.state),displayProfiles(definition,{actors:this.actors}));   // visual-only rounds: never saved, own RNG (m01-display-fire.js)
    this.sectors={sectors:definition.sectors.map(s=>({id:s.id,state:s.schedule[0].state,strength:100,morale:1,supply:1})),damage:[]};
    this.mission={phase:'INTRO',complete:false,text:phaseText.INTRO,status:''};
    this.consume(E('intro_card'));this.startScene('cs_m01_intro');this.checkpoint=this.snapshot(false);
  }
  actor(id){return this.actors.find(a=>a.id===id);}
  get enemies(){return this.actors.filter(a=>a.team==='enemy'&&!a.displayOnly);}
  get allies(){return this.actors.filter(a=>a.team==='ally'&&!a.displayOnly);}
  get combatants(){return this.actors.filter(a=>!a.displayOnly);}
  emit(event){this.events.push(validateM01AudioEvent(event));}
  drainEvents(){const events=this.events;this.events=[];return events;}
  consumedEvent(id){return Object.hasOwn(this.consumed,id);}
  active(name){return this.objectives[O(name)]?.state==='active';}
  done(name){return this.objectives[O(name)]?.state==='done';}
  activate(name){const o=this.objectives[O(name)];if(o.state==='locked')o.state='active';}
  finish(name){const o=this.objectives[O(name)];if(o.state==='done')return;o.state='done';o.progress=100;}
  line(id,token=id){
    if(this.dialogueConsumed.includes(token))return;
    const line=definition.dialogue.find(d=>d.id===id)??definition.callouts.lines.find(d=>d.id===id);if(!line)return;
    this.dialogueConsumed.push(token);
    const count=['doze','treze','catorze','quinze','dezasseis','dezassete','dezoito'][this.flags['m01.east_platoon_survivors']-12];
    this.dialogueQueue.push({id,speaker:definition.cast.find(c=>c.id===line.speaker)?.name??'Soldado',
      text:line.text.replaceAll('{n}',count),duration:Math.max(2.5,Math.min(6,line.text.length/24))});
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
        if(this.dialogueConsumed.includes(token))return;this.dialogueConsumed.push(token);this.message(beat.action);
      });
    }
  }
  updateContinuity(){
    if(this.scene?.id==='cs_m01_intro'||this.mission.phase==='OUTRO')return;
    for(const cue of definition.continuityCues){const from=seconds(cue.from),until=seconds(cue.until);
      if(this.battleClock<from||this.battleClock>=until)continue;
      const slot=Math.floor((this.battleClock-from)/cue.intervalSec),token=`continuity:${cue.kind}:${slot}`;
      if(this.dialogueConsumed.includes(token))continue;this.dialogueConsumed.push(token);
      const progress=this.objectives[O('cover_repair')].progress;
      const text=cue.kind==='repair'&&this.active('cover_repair')?`${cue.text} Reparo: ${Math.floor(progress)}%.`:
        cue.kind==='withdrawal'?`${cue.text} ${this.flags['m01.east_platoon_survivors']} homens no pelotão.`:cue.text;
      this.emit({type:'message',message:text,continuity:{kind:cue.kind,slot,battleClock:this.battleClock}});
    }
    // Finite delivery milestones remain legible in real time while the existing west gate holds battleClock.
    const bak=this.actor('jozef_bak');
    if(this.gate?.id===E('west_demolition')&&(bak.carry||bak.carriedBy)){
      const remaining=dist(bak,EVACUATION),metres=[360,300,240,180,120,60,30,10].findLast(limit=>remaining<=limit),token=`continuity:bak_delivery_hold:${metres}`;
      if(metres!==undefined&&!this.dialogueConsumed.includes(token)){
        this.dialogueConsumed.push(token);this.emit({type:'message',message:`Dudek leva Bąk para a estação. Corredor livre; faltam cerca de ${Math.ceil(remaining)} metros.`,continuity:{kind:'bak_delivery_hold',slot:metres,battleClock:this.battleClock}});
      }
    }
    if(this.consumedEvent(E('panzerzug_arrives'))&&this.inView({x:1119,y:0,z:2.5}))this.line('dlg_m01_038');
    if(this.active('hold_corridor')&&this.clock-this.consumed[E('east_demolition')]>=10){this.line('dlg_m01_048');
      if(!this.dialogueQueue.some(l=>l.id==='dlg_m01_048')&&this.subtitle?.id!=='dlg_m01_048')this.line('dlg_m01_049');}
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
    if(id===E('east_demolition'))return this.done('hold_access')&&this.actors.filter(a=>a.alive&&a.active&&a.group==='grp_east_platoon').every(a=>a.x<660)&&this.player.x<660;
    if(id===E('west_demolition')){const bak=this.actor('jozef_bak');return this.consumedEvent(E('east_demolition'))&&this.player.x<-90&&this.actors.filter(a=>a.alive&&a.active&&a.team==='ally'&&!a.civilian).every(a=>a.x<-90)&&!bak.carry&&!bak.carriedBy;}
    if(id===E('dudek_retrieves_bak'))return this.player.carrying!=='jozef_bak';
    if(id===E('roll_call'))return this.scene?.id!=='cs_m01_west_blast';
    return true;
  }
  advanceBattle(dt){
    const segment=definition.clock.segments.find(s=>this.battleClock>=seconds(s.from)&&this.battleClock<seconds(s.to));
    if(!segment)return;
    // readyScale: com o gate já pronto (ex.: reparo concluído), encurta a espera sem tarefa até à hora seguinte.
    let scale=segment.gate&&segment.readyScale&&this.readiness(segment.gate)?segment.readyScale:segment.scale,next=this.battleClock+dt*scale;
    if(segment.gate&&!this.readiness(segment.gate)){
      const at=seconds(segment.to);
      if(at-this.battleClock<=60)scale=1;
      next=Math.min(this.battleClock+dt*scale,at-30);
      if(this.battleClock>=at-30){
        if(this.gate?.id!==segment.gate)this.gate={id:segment.gate,started:this.clock,hold:0};
        this.gate.hold=this.clock-this.gate.started;
        if(segment.gate===E('east_demolition')&&this.gate.hold>90)for(const a of this.actors.filter(a=>a.group==='grp_east_platoon'&&a.active&&a.alive&&a.x>=660)){
          const inView=this.inView(a);
          if(!inView){a.x=655;a.state='reached_safety';this.recoveries.push({id:a.id,reason:'offscreen_straggler',clock:this.clock});}
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
      case E('planes_heard'):this.mission.phase='BUILDUP';line(12);line(13);line(66);this.actor('tadeusz_nowicki').target=this.world.point('repair_site_1');break;
      case E('bombing_0434'):
        this.finish('deliver_message');this.activate('take_cover');this.player.headgear='pl_helmet_wz31';
        this.message('Abrigue-se! Cabeça baixa, junto à cobertura!');
        this.mission.phase='FIRST_CONTACT';this.startScene('cs_m01_bombing');
        this.impact('station_bomb',this.world.point('tczew_station'),true);break;
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
        if(inside(bak,{minX:20,maxX:160,minZ:30,maxZ:50})){bak.state='WOUNDED';bak.target=null;this.flags['m01.bak_status']='wounded';this.activate('rescue_bak');line(41);line(43);recordHit(bak,this.clock);}break;}
      // Os 20 s de relógio da regra de baixas contam a partir da entrada dos alemães no tabuleiro (cover_withdrawal.mechanic).
      case E('germans_on_east_spans'):this.enemies.filter(a=>a.group==='grp_de_spans').forEach((a,i)=>{a.active=true;a.cooldown=2+i*.7;});
        this.timers.withdrawalCasualty=this.battleClock;this.message('Eles entram pelo tabuleiro leste! Cubra os últimos homens do pelotão.');break;
      case E('east_demolition'):
        this.finish('cover_withdrawal');this.activate('leave_bridge');this.destruction.push('east_ends_destroyed');this.mission.phase='CLIMAX';
        this.enemies.filter(a=>a.group==='grp_de_spans').forEach((a,i)=>{const wasAlive=a.alive;if(i<GERMAN_FELLED){a.health=0;a.alive=false;a.state='DOWN';recordDeath(a,wasAlive,this.clock);}else{a.state='RETREAT';}});
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
  impact(id,point,aerial){
    const p=aerial?this.safeImpact(point):{...point};
    if(aerial)p.y=this.world.heightAt(p.x,p.z);   // Ground only after the existing safety shift, including near-miss alternatives.
    const kind=blastKind(id,aerial);
    this.sectors.damage.push({id,...p,started:this.clock,soundAt:this.clock+dist(p,this.player)/343,...(kind==='grenade'?{smokeSeconds:20}:{})});
    this.emit({type:'m01-blast',kind,point:p,soundAt:this.clock+dist(p,this.player)/343,aerial});return p;
  }
  updateRaidSchedule(){
    // A missing schedule is a legacy schema-2 raid: never invent retroactive impacts on resume.
    for(const t of this.timers.raidSchedule??[])if(!t.emitted&&this.battleClock>=t.at){
      t.point=this.impact(t.id,t.point,true);t.emitted=true;
    }
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
    this.checkpointsReached.push(id);this.pendingCheckpoint=null;this.checkpoint=this.snapshot(false);this.emit({type:'checkpoint',id});
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
      else if(p.carrying==='sapper_crate'&&dist(p,this.world.point('repair_site_2'))<6){p.carrying=null;this.finish('fetch_material');this.activate('cover_repair');this.line('dlg_m01_024');}
    }
    if(this.active('cover_repair')){
      const repair=this.objectives[O('cover_repair')];
      if(this.clock>=this.timers.repairSuppressedUntil){repair.progress=Math.min(100,repair.progress+dt*100/REPAIR_WORK_SEC);this.timers.repairStall=0;this.timers.fireEase=false;}
      else this.timers.repairStall+=dt;
      // Tolerância (mechanic): 120 s parado baixa, sem aviso, a cadência sobre o reparo até o trabalho retomar.
      if(this.timers.repairStall>120){this.timers.fireEase=true;this.timers.repairSuppressedUntil=this.clock;}
      if(repair.progress>=40)this.line('dlg_m01_022');   // fala obrigatória: se ainda não houve supressão, não fica por dizer
    }
    if(this.active('rescue_bak')&&interact){
      const bak=this.actor('jozef_bak');
      if(!p.carrying&&dist(p,bak)<3){p.carrying='jozef_bak';bak.active=false;bak.carriedBy=p.id;bak.carry={phase:'pickup',startedAt:this.clock,duration:1.6};this.message('Bąk está consigo. Leve-o ao socorrista.');}
      else if(p.carrying==='jozef_bak'&&dist(p,this.world.point('aid_position'))<4){p.carrying=null;this.finish('rescue_bak');
        this.flags['m01.bak_status']='rescued_by_player';this.flags['m01.dudek_status']='unhurt';this.message('Bąk entregue ao socorrista.');
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
    if(!this.timers.lowAmmoHint&&kowalRounds>0&&this.weapon.mag+this.weapon.reserve<=10&&kowal.alive&&kowal.active){
      this.timers.lowAmmoHint=true;const d=dist(p,kowal),rel=Math.atan2(kowal.z-p.z,kowal.x-p.x)-p.angle,a=Math.atan2(Math.sin(rel),Math.cos(rel)),deg=Math.abs(a)*180/Math.PI;
      this.message(`Pouca munição. Kowal tem carregadores: ${Math.round(d)} m, ${deg<35?'em frente':deg>120?'atrás de si':a>0?'à sua direita':'à sua esquerda'}`);
    }
    if(this.active('hold_access')&&inside(p,{minX:-10,maxX:160,minZ:30,maxZ:50})){this.timers.holdAccessVisited=true;if(this.consumedEvent(E('east_platoon_withdraws')))this.finish('hold_access');}
    if(this.active('leave_bridge')&&dist(p,this.world.point('firing_point'))<12){this.finish('leave_bridge');this.activate('hold_corridor');}
    if(this.active('hold_corridor')&&this.consumedEvent(E('west_demolition')))this.finish('hold_corridor');
    if(this.active('reach_shelter')&&this.done('hold_access')&&this.done('hold_corridor')&&dist(p,this.world.point('shelter'))<5)this.finish('reach_shelter');
    if(this.pendingCheckpoint==='cp_m01_b_reorganizacao'&&this.clock-this.consumed[E('bombing_0434')]>=20)this.saveCheckpoint(this.pendingCheckpoint);
    if(this.pendingCheckpoint==='cp_m01_c_engenheiros'&&this.flags['m01.second_raid_state']==='ended')this.saveCheckpoint(this.pendingCheckpoint);
    if(this.consumedEvent(E('east_demolition'))&&p.x<-20&&!p.carrying&&!(this.battleClock>=seconds('06:36:00')&&p.x>=-90))this.saveCheckpoint('cp_m01_d_retirada');
    const active=definition.objectives.find(o=>o.required&&this.objectives[o.id].state==='active');
    const optional=definition.objectives.find(o=>!o.required&&this.objectives[o.id].state==='active');
    this.mission.text=this.scene?.id==='cs_m01_intro'?phaseText.INTRO:this.scene?.id==='cs_m01_roll_call'?phaseText.OUTRO:
      (active?.text??'Mantenha contacto com a secção')+(optional?` · ${optional.text}`:'');
    this.mission.status=this.scene?.id==='cs_m01_roll_call'?'':this.threatStatus();
  }
  moveActor(a,target,dt,speed=3.6){
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
   */
  updateCKMGunner(g,retreat){
    // Only a live plan is kept. A typed plan of the old disabled policy (TASK D, older saves; it is inert, never emitted a round) would keep the planning gate
    // below shut for ever, so it goes at the first tick. The save itself still round-trips with it (validateM01Snapshot accepts it).
    if(g?.ckm?.burstPlan&&g.ckm.burstPlan.policy!=='live')delete g.ckm.burstPlan;
    if(!g||retreat||this.battleClock<CKM_FIRE_FROM||!g.alive||!g.active||!['idle','aim','feed','fire_burst'].includes(g.ckm.phase))return;
    const f=g.ckmFire??=newCKMFire(this.rng.state),clock=this.clock,p=g.ckm,live=p.burstPlan?.policy==='live';
    // Every phase change keeps the plan of rounds still in flight; the plan is removed when its last round has landed (landCKMRounds).
    const to=(phase,startedAt)=>{g.ckm={phase,startedAt,visible:p.visible,...(g.ckm.burstPlan?.policy==='live'?{burstPlan:g.ckm.burstPlan}:{})};};
    if(p.phase==='fire_burst'){
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
        this.startCKMBurst(g,target);return;
      }
      f.nextAt=clock+CKM_RESCAN_SEC;
    }
    if(!firing||!(clock<f.engagedUntil)){const q=ckmQuiet(this.battleClock,clock);if(g.ckm.phase!==q.phase)to(q.phase,q.startedAt);}
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
  /** Read-only diagnostics of the gun (never saved): phase, belt, cooldown and the burst in progress. */
  get ckm(){
    const g=this.actor('ckm_gunner'),f=g?.ckmFire,b=g?.ckm?.burstPlan;
    return g?{phase:g.ckm.phase,startedAt:g.ckm.startedAt,belt:f?.belt??null,bursts:f?.bursts??null,nextAt:f?.nextAt??null,engagedUntil:f?.engagedUntil??null,
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
    this.holdEastPlatoon();
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
      }
      a.shot=Math.max(0,a.shot-dt);this.updateMG34Posture(a);if(!a.alive||!a.active)continue;
      if(proneGunner(a)&&a.mg34Prone.phase==='exit')continue;
      if(a.team==='enemy')a.crouched=this.clock<a.suppressedUntil||this.gateKneels(a);   // T38: gate riflemen kneel until they rise to shoot
      if(a.group==='grp_ckm_crew'){
        // An unfinished burst plan is dropped here: the crew leaves the gun (no new round is issued after the demolition).
        if(retreat&&['idle','aim','feed','fire_burst'].includes(a.ckm.phase))a.ckm={phase:'abandon',startedAt:this.clock,visible:a.ckm.visible};
        if(!retreat&&this.battleClock>=CKM_FIRE_FROM&&a.id!=='ckm_gunner'){
          // The gunner's phase (live fire, or the quiet cycle when nobody is engaged) is copied; with the gunner down the old quiet cycle runs alone.
          const lead=gunner?.alive&&gunner.active&&['idle','aim','feed','fire_burst'].includes(gunner.ckm.phase)?gunner.ckm:ckmQuiet(this.battleClock,this.clock);
          if(a.ckm.phase!==lead.phase||a.ckm.startedAt!==lead.startedAt)a.ckm={phase:lead.phase,startedAt:lead.startedAt,visible:a.ckm.visible};
        }
        if(a.ckm.phase==='abandon'&&this.clock-a.ckm.startedAt>=CKM_ABANDON_SEC)
          a.ckm={phase:'retreat',startedAt:this.clock,visible:a.ckm.visible};
        if(a.ckm.phase==='retreat'){
          // T47: from the S2 post the way out is west along the embankment between the bridges (z 22..26, clear of both portals). A save made on the old
          // way out under the deck (z >= 33) keeps it, ramp included: legs to (9, 41.4) and (-14, 40), then the common way to the rally point.
          const i=CKM_IDS.indexOf(a.id),underDeck=a.z>=33&&a.x>-12,final={x:-170-i*1.6,z:22+i*1.2},
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
        const destination=retreat?1080:690;
        if(this.clock>=a.suppressedUntil){a.x+=Math.sign(destination-a.x)*Math.min(Math.abs(destination-a.x),dt*1.5);a.state=retreat?'RETREAT':'ADVANCE';}
        continue;
      }
      if(a.task==='evacuate_bak'){this.evacuate(a,dt);continue;}
      if(a.task==='evacuate_station_wounded'){this.evacuateStation(a,dt);continue;}
      if(a.task==='stay_with_bak'||(this.mission.phase==='OUTRO'&&a.team==='ally'))continue;   // chamada: ninguém sai do lugar
      if(retreat&&a.team==='ally'&&!a.civilian&&a.state!=='WOUNDED')a.target={x:-170,z:22};
      if(this.timers.escort&&a.id==='marek_zielinski')a.target=this.player;
      this.stageSection(a);
      // Sappers: kneeling at the cable until called to the second cut (T38), crouched while working there, kneeling again once they reach the
      // west after the retreat (not under fire there); prone is presentation (T07/T38).
      if(a.role==='ENGINEER'){a.crouched=this.active('cover_repair')&&dist(a,this.world.point('repair_site_2'))<6||!a.target||retreat&&a.state==='GUARD';if(this.clock<a.suppressedUntil)continue;}
      if(a.target&&(!proneGunner(a)||a.mg34Prone.phase==='standing'))this.moveActor(a,a.target,dt);
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
      if(dist(leader,this.player)<3){this.world.move(this.player,-dt*3,0);
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
        this.timers.withdrawalCasualty=this.battleClock;if(!spans.some(a=>a.suppressedUntil>this.clock))this.lethalShot(spans);
      }
    }
    updateMotion(this.actors,motionBefore,dt,this.clock);
    updateLoaders(this.actors,this.clock);updateActorDetails(this.actors,this.clock,this.world);
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
      if(this.clock<a.suppressedUntil){a.cooldown=Math.max(a.cooldown,a.suppressedUntil-this.clock+(a.weapon==='mg34'?2.5:1.2));continue;}
      if(a.cooldown>0)continue;
      if(a.group==='grp_de_spans')this.spansFire(a,retreat);else this.eastFire(a,retreat,withdrawal);
    }
    this.attritionTick();this.kowalFire(dt);this.landRounds();this.landCKMRounds();this.stageGateRiflemen();
    const rkm=this.actor(STAGE.squad.rkm.actor);if(rkm.alive&&rkm.active&&this.mission.phase!=='OUTRO')this.stageSection(rkm);   // T38: up or down after his burst
    updateDisplayFire(this.display,{clock:this.clock,battleClock:this.battleClock,actors:this.actors,consumedEvent:id=>this.consumedEvent(id),heightAt:(x,z)=>this.world.heightAt(x,z)},dt);
  }
  /**
   * T38: a staged section man kneels at his slot behind the sandbags once the post is under fire; leaving it (a target elsewhere) he stands.
   * The rkm gunner rises over the sandbags rkm.riseBeforeSec before each burst and stays up rkm.holdAfterSec after it (the burst clip).
   */
  stageSection(a){
    const slot=STAGE.squad.slots[a.id];if(!slot||!this.consumedEvent(STAGE.squad.underFireFrom))return;
    const rkm=STAGE.squad.rkm,firing=a.id===rkm.actor&&this.consumedEvent(E('train963_arrives'))&&!this.consumedEvent(E('east_demolition'))&&
      (a.cooldown<=rkm.riseBeforeSec||this.clock-a.firedAt<rkm.holdAfterSec);
    a.crouched=a.state!=='WOUNDED'&&!a.carriedBy&&!a.task&&dist(a,slot)<.5&&!(a.target&&dist(a.target,a)>=.8)&&!firing;
  }
  /** T38: after this tick's shots and suppression, each active gate rifleman kneels or stands as he will be drawn (and hit) until the next tick. */
  stageGateRiflemen(){for(const a of this.enemies)if(a.alive&&a.active&&gateRifleman(a))a.crouched=this.clock<a.suppressedUntil||this.gateKneels(a);}
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
      a.cooldown=(mg?16:32)+r()*20;if(gateShooter(a)&&west&&sees(p)){target=p;kind='player';}
    }else if(withdrawal){
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
      if(!gateShooter(a)||r()<.5){target=this.eastBridgeheadPoint(r);kind='east';}   // o pelotão leste ainda segura a cabeça de ponte leste
      else if(this.active('cover_repair')&&r()<.45){if(this.timers.fireEase)return;target=this.repairAim();kind='repair';}
      else if(west&&sees(p)){target=p;kind='player';}
    }
    if(!target||this.germanSilence())return;   // T48: the cadence above is re-armed as usual, but nothing is shot, said or flagged in the silence
    this.burst(a,target,kind,mg?{rounds:4+Math.floor(r()*3),bias:[1.2,.8],cone:[.7,.5],tracer:kind!=='east'}:{rounds:1,bias:[2.5,1.6],cone:[0,0]});
    if(kind==='repair'&&west)this.line('dlg_m01_026');
    if(mg&&['player','squad'].includes(kind)&&west){this.line('co_m01_enemy_mg_fire_on_squad');if(this.clock-(this.timers.firstMgAt??this.clock)>8)this.line('dlg_m01_027');this.timers.firstMgAt??=this.clock;}
  }
  /** grp_de_spans no tabuleiro: disparam sobre o último homem do pelotão e, às vezes, sobre o jogador. */
  spansFire(a,retreat){
    const r=()=>this.rng.next();a.cooldown=3+r()*3;if(retreat){a.cooldown=99;return;}
    const sees=t=>this.world.lineOfSight(a,t),last=this.withdrawingPlatoon().filter(s=>s.x<a.x).sort((x,y)=>y.x-x.x)[0];
    if(r()<.25&&sees(this.player))this.burst(a,this.player,'player',{rounds:1,bias:[2,1.4],cone:[0,0]});
    else if(last&&sees(last))this.burst(a,last,'platoon',{rounds:1,bias:[2,1.4],cone:[0,0]});
  }
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
      a.firedAt=this.clock;a.state='SUPPRESS';this.emitMG34Rounds(a);return true;
    }
    const origin=eyePosition(a),shared=[bias[0]*this.gauss(),bias[1]*this.gauss()];
    for(let k=0;k<rounds;k++)this.enemyFire.rounds.push(makeRound({id:`m01_round_${this.enemyFire.nextId++}`,by:a.id,weapon:a.weapon,kind,origin,aim,
      firedAt:this.clock+k*interval,bias:shared,cone,gauss:()=>this.gauss(),tracer:tracer&&k===Math.min(1,rounds-1),victim}));
    a.shot=rounds*interval+.06;a.firedAt=this.clock;a.state='SUPPRESS';a.facing=Math.atan2(aim.z-a.z,aim.x-a.x);
    // Rifle reload fits inside its existing cooldown; never delays or creates a combat request.
    if(a.weapon==='kar98k'&&rounds===1){a.rounds=Math.max(0,a.rounds-1);if(a.rounds===0)a.reload={startedAt:this.clock,duration:3.4,mode:'clip'};}
    if(kind==='cover')this.timers.coverFire={by:a.id,at:this.clock,...origin};
    this.emit({type:'enemy-fire',origin,rounds,interval,weapon:a.weapon,at:this.clock});return true;
  }
  /** Kowal (rkm wz.28) responde aos clarões: rajadas curtas na posição do dique que disparou há menos tempo e que ele vê. */
  kowalFire(dt){
    const kowal=this.actor('szymon_kowal');kowal.cooldown-=dt;
    if(!kowal.alive||!kowal.active||kowal.cooldown>0||!this.consumedEvent(E('train963_arrives'))||this.consumedEvent(E('east_demolition')))return;
    kowal.cooldown=4;
    const dike=this.enemies.filter(a=>a.group==='grp_de_east'&&a.alive&&a.active);
    const target=dike.filter(a=>this.clock-a.firedAt<10).sort((a,b)=>b.firedAt-a.firedAt).find(a=>this.world.lineOfSight(kowal,a))??
      dike.find(a=>a.weapon==='mg34'&&this.world.lineOfSight(kowal,a));
    if(!target)return;
    kowal.shot=.25;kowal.firedAt=this.clock;kowal.facing=Math.atan2(target.z-kowal.z,target.x-kowal.x);kowal.rounds-=3;
    const previousUntil=target.suppressedUntil;
    target.suppressedUntil=Math.max(target.suppressedUntil,this.clock+2);this.updateMG34Posture(target);this.emit({type:'npc-shot',weapon:'rkm_wz28',point:eyePosition(kowal),rounds:3});
    recordSuppression(target,previousUntil,this.clock);
    if(kowal.rounds<=0){kowal.rounds=20;kowal.cooldown=5;if(dist(kowal,this.player)<120)this.line('dlg_m01_029',`dlg_m01_029:${Math.floor(this.clock/90)}`);}
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
    }else if(hit.actor===p&&this.rng.next()<(this.world.coverAt(p)?.06:.2)){   // afinação de protótipo, não dano garantido

      p.health=Math.max(0,p.health-8);p.alive=p.health>0;this.emit({type:'player-hit'});
    }
    // Aliados nunca são feridos por estes tiros (baixas só por ID): quem está a menos de 3 m da trajectória deita-se.
    let pinned=false;const site=this.world.point('repair_site_2'),near=[];
    for(const a of this.allies){
      if(!a.alive||!a.active||a===victim||a.carriedBy||(Math.abs(a.x-point.x)>80&&Math.abs(a.x-r.ax)>80))continue;
      if(closestApproach(r,hit.t,{x:a.x,y:a.y+.9,z:a.z})>NEAR_MISS)continue;
      const working=a.role==='ENGINEER'&&this.active('cover_repair')&&dist(a,site)<6;
      const previousUntil=a.suppressedUntil;
      a.suppressedUntil=Math.max(a.suppressedUntil,this.clock+(working?3.5:a.group==='grp_east_platoon'?1:1.5));pinned||=working;near.push(a.id);
      recordSuppression(a,previousUntil,this.clock);
    }
    if(pinned){   // o trabalho pára e a equipa inteira abriga-se
      this.timers.repairSuppressedUntil=Math.max(this.timers.repairSuppressedUntil,this.clock+3.5);this.timers.repairPins++;this.line('dlg_m01_022');
      for(const a of this.actors)if(a.role==='ENGINEER'&&a.alive&&a.active&&dist(a,site)<6){const previousUntil=a.suppressedUntil;a.suppressedUntil=Math.max(a.suppressedUntil,this.timers.repairSuppressedUntil);if(!near.includes(a.id))near.push(a.id);recordSuppression(a,previousUntil,this.clock);}
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
    const dir=aimDirection(aim.angle,aim.pitch),origin=eyePosition(p),hit=traceShot(this.world,origin,dir,this.combatants,1200,muzzlePosition(p));
    p.weaponShotAt=now;p.pitch=Math.min(1.25,p.pitch+.024);
    if(hit?.actor?.team==='enemy'){const a=hit.actor,health=a.health,wasAlive=a.alive;a.health=Math.max(0,a.health-this.weapon.profile.damage*hit.multiplier);a.alive=a.health>0;a.state=a.alive?'HIT_REACTION':'DOWN';recordDamage(a,health,wasAlive,this.clock,p);}
    const targetPoint=hit?.point??{x:origin.x+dir.x*1200,y:origin.y+dir.y*1200,z:origin.z+dir.z*1200};
    let silenced=false;
    for(const a of this.enemies.filter(a=>a.alive&&a.active)){
      const d=Math.max(0,(a.x-origin.x)*dir.x+(a.y+1-origin.y)*dir.y+(a.z-origin.z)*dir.z);
      if(d>0&&d<1200&&Math.hypot(a.x-origin.x-dir.x*d,a.y+1-origin.y-dir.y*d,a.z-origin.z-dir.z*d)<3&&(!hit||d<=hit.distance+3)){
        const previousUntil=a.suppressedUntil;
        silenced||=a.suppressedUntil<=this.clock&&(a.weapon==='mg34'||a.group==='grp_de_spans');a.suppressedUntil=this.clock+5;
        recordSuppression(a,previousUntil,this.clock);
      }
    }
    // Callout real (enemy_group_suppressed): só quando o tiro do jogador acabou de calar uma MG ou os alemães do tabuleiro.
    const kowal=this.actor('szymon_kowal');
    if(silenced&&this.clock-this.timers.calloutAt>25&&kowal.alive&&kowal.active&&dist(kowal,p)<150){
      this.timers.calloutAt=this.clock;this.line('co_m01_enemy_group_suppressed',`co_m01_enemy_group_suppressed:${Math.round(this.clock)}`);
    }
      for(const a of this.enemies)if(proneGunner(a))this.updateMG34Posture(a);
    for(const a of this.actors)updatePosture(a,this.clock);
    this.emit({type:'player-shot',point:targetPoint,material:hit?.material,hit:hit?.actor?.team==='enemy',weapon:'kb_wz29'});
  }
  updateGrenades(dt,request){
    if(request&&this.grenades.ammo&&!this.player.carrying){const p=this.player,d=aimDirection(p.angle,p.pitch+.12);this.grenades.ammo--;
      this.grenades.active.push({id:`m01_grenade_${this.grenades.nextId++}`,...eyePosition(p),vx:d.x*12,vy:d.y*12+2,vz:d.z*12,fuse:4});}
    for(const g of this.grenades.active){g.fuse-=dt;g.vy-=9.81*dt;
      const step={x:g.vx*dt,y:g.vy*dt,z:g.vz*dt},length=Math.hypot(step.x,step.y,step.z);
      const hit=length>0?traceObstruction(this.world,g,{x:step.x/length,y:step.y/length,z:step.z/length},length):null;
      if(hit){g.vx*=-.3;g.vz*=-.3;g.vy=Math.abs(g.vy)*.3;}
      else{g.x+=step.x;g.y+=step.y;g.z+=step.z;}
      const floor=this.world.heightAt(g.x,g.z)+.08;if(g.y<floor){g.y=floor;g.vy=Math.abs(g.vy)*.3;g.vx*=.65;g.vz*=.65;}
      if(g.fuse<=0){this.impact(g.id,g,false);for(const a of [this.player,...this.enemies]){
        const distance=Math.hypot(a.x-g.x,a.y+.9-g.y,a.z-g.z);
        if(a.alive&&a.active&&distance<8&&this.world.lineOfSight({...g,space:'metres',eyeHeight:.04},a)){
          const health=a.health,wasAlive=a.alive;
          a.health=Math.max(0,a.health-(1-distance/8)*100);a.alive=a.health>0;
          if(a!==this.player)recordDamage(a,health,wasAlive,this.clock,g);}
      }}
    }this.grenades.active=this.grenades.active.filter(g=>g.fuse>0);
    for(const a of this.enemies)if(proneGunner(a))this.updateMG34Posture(a);
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
      this.failure=this.timers.water>=8?'Você caiu no Vístula.':'Você se afastou da sua secção.';this.player.alive=false;
    }
  }
  tick(dt,controls={}){
    if(!Number.isFinite(dt)||dt<=0||this.mission.complete)return;dt=Math.min(.05,dt);
    if(!this.player.alive){const reason=this.failure;this.restoreCheckpoint();this.emit({type:'restored'});if(reason)this.message(reason);return;}
    this.clock+=dt;const p=this.player;
    // Player rays use this tick's transition frame, matching the frame later sampled by presentation.
    for(const a of this.enemies)if(proneGunner(a))this.updateMG34Posture(a);
    p.angle+=(controls.lookX??0)*.0022;p.pitch=Math.max(-1.25,Math.min(1.25,p.pitch-(controls.lookY??0)*.0022));p.aiming=Boolean(controls.aim);
    if(controls.crouch)p.crouched=!p.crouched;
    this.updateScene(dt,controls.skip);
    const locked=this.scene?.id==='cs_m01_intro'||this.scene?.id==='cs_m01_roll_call';
    if(locked&&this.scene.id==='cs_m01_intro')this.advanceBattle(dt);
    if(!locked){
      const f=controls.forward??0,s=controls.side??0,len=Math.hypot(f,s)||1;
      const speed=(controls.sprint?6:3.8)*(p.carrying?.55:1)*(p.crouched?.6:1)*(p.aiming?.65:1);
      const dx=(Math.cos(p.angle)*f-Math.sin(p.angle)*s)*speed*dt/len,dz=(Math.sin(p.angle)*f+Math.cos(p.angle)*s)*speed*dt/len;
      const before={x:p.x,z:p.z};this.world.move(p,dx,dz);p.moveBlend=Math.min(1,dist(before,p)/(dt*3.8));p.sprinting=Boolean(controls.sprint)&&p.moveBlend>.1;
      this.weapon.update(this.clock*1000);
      if(controls.reload&&this.weapon.reload(this.clock*1000))this.emit({type:'reload',weapon:'kb_wz29'});
      if(controls.sight)this.message(`Alça: ${this.weapon.adjustSight()} m`);
      if(controls.fire)this.fire();this.updateGrenades(dt,controls.grenade);
      this.advanceBattle(dt);this.boundaries(dt);
    }
    this.updateActors(dt);this.updateCombat(dt);
    for(const a of this.actors){updatePosture(a,this.clock);updateBodyYaw(a,dt);}
    if(!p.alive)return;
    this.updateObjectives(dt,controls.interact);this.updatePreRoll();this.processEvents();this.updateRaidSchedule();this.updateContinuity();
    if(this.flags['m01.second_raid_state']==='active'&&this.battleClock>=seconds('05:34:00'))this.flags['m01.second_raid_state']='ended';
    for(const sector of this.sectors.sectors){const schedule=definition.sectors.find(s=>s.id===sector.id).schedule;
      const current=schedule.filter(s=>seconds(s.at)<=this.battleClock).at(-1);sector.state=current.state;
      if(sector.id==='s2_east_bridgehead')sector.strength=this.enemies.filter(a=>a.alive).length*2;}
    if(this.battleClock>=seconds('06:36:00')&&!this.consumedEvent(E('west_demolition')))this.line('dlg_m01_050');
    if(this.battleClock>=seconds('06:38:30')&&!this.consumedEvent(E('west_demolition')))this.line('dlg_m01_051');
    if(this.active('follow_sergeant')&&this.clock>this.timers.guide){this.timers.guide=this.clock+7;this.message('Zieliński chama-o da trincheira, a oeste.');}
    this.updateGuide();
    if(this.active('hold_access')){
      const cover=this.world.coverAt(p)?.id??null;
      if(cover!==this.timers.occupiedCover){this.timers.occupiedCover=cover;this.timers.coverExposure=0;}
      else if(cover)this.timers.coverExposure+=dt;
      if(this.timers.coverExposure>=42&&this.clock>this.timers.nextCoverCall){
        const rotation=['cv_sandbag_mid_2','cv_portal_road_n','cv_road_truss_1','cv_road_truss_3','cv_tower_p1_n'];
        // "Ajusta sobre a cobertura": rajada real de uma MG que vê o jogador (impactos na cobertura, não dano garantido).
        // Uma MG que o veja dispara uma rajada; sem MG, uma salva de até quatro atiradores (um tiro cada).
        const shooters=this.enemies.filter(a=>a.group==='grp_de_east'&&a.alive&&a.active&&this.clock>=a.suppressedUntil&&canMG34Fire(a)).sort((a,b)=>(b.weapon==='mg34')-(a.weapon==='mg34'))
          .filter(a=>this.world.lineOfSight(a,p)).slice(0,4);
        // No warning or cover reservation until a real salvo is emitted. Retry at a bounded cadence.
        this.timers.nextCoverCall=this.clock+(shooters.length?42:4);
        if(shooters.length)this.flags['m01.suggested_cover']=rotation[this.timers.coverCallIndex++%rotation.length];
        for(const a of shooters[0]?.weapon==='mg34'?shooters.slice(0,1):shooters){
          this.burst(a,p,'cover',a.weapon==='mg34'?{rounds:7,bias:[.5,.3],cone:[.6,.4],tracer:true}:{rounds:1,bias:[.8,.5],cone:[0,0]});a.cooldown=Math.max(a.cooldown,6);
        }
        if(shooters.length){this.mission.status=this.coverFireStatus();this.message(`Zieliński: ${this.mission.status}.`);}
      }
    }
    if(this.subtitle&&this.clock>=this.subtitle.until)this.subtitle=null;
    if(!this.subtitle&&this.dialogueQueue.length){this.subtitle=this.dialogueQueue.shift();this.subtitle.until=this.clock+this.subtitle.duration;}
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
    if(phase.phase==='carry')this.moveActor(medic,EVACUATION,dt,1.6);
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
    Object.assign(p,{x:shelter.x-.5,z:shelter.z-1.8,crouched:true,pitch:-.06});p.y=this.world.heightAt(p.x,p.z);
    present.forEach((a,i)=>{const [x,z]=ROLL_CALL_SEATS[i%ROLL_CALL_SEATS.length];
      Object.assign(a,{x,z,target:null,task:null,state:'GUARD',pose:'seated',crouched:true});a.y=this.world.heightAt(x,z);a.facing=Math.atan2(p.z-z,p.x-x);});
    p.angle=Math.atan2(72.6-p.z,-260-p.x);
  }
  /** Destino do objectivo activo que exige deslocação (dados do mapa ou actor). */
  guideTarget(){
    const p=this.player,pt=id=>this.world.point(id);
    if(this.active('rescue_bak'))return p.carrying==='jozef_bak'?{label:'Socorrista Dudek',point:pt('aid_position')}:{label:'Bąk ferido',point:this.actor('jozef_bak')};
    if(this.active('deliver_message'))return {label:'Posto da ponte ferroviária',point:pt('forward_post')};
    if(this.active('find_sappers'))return {label:'Sapadores no aterro',point:pt('repair_site_1')};
    if(this.active('fetch_material'))return p.carrying?{label:'Sapadores no segundo corte da linha',point:pt('repair_site_2')}:{label:'Barracão ferroviário, porta oeste',point:pt('rail_hut')};
    if(this.active('cover_repair')){const mg=this.enemies.find(a=>a.alive&&a.active&&a.weapon==='mg34');if(mg)return {label:'Metralhadora no dique · V para alça 1000 m',point:mg};}
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
      return `Reparo ${progress}% · sapadores a trabalhar${mg.alive&&this.clock<mg.suppressedUntil?' · metralhadora do dique suprimida':''}`;
    }
    if(this.active('cover_withdrawal')){
      const n=this.flags['m01.east_platoon_survivors'];
      if(!this.consumedEvent(E('germans_on_east_spans')))return `Pelotão leste: ${n} homens a atravessar o tabuleiro`;
      const spans=this.enemies.filter(a=>a.group==='grp_de_spans'&&a.alive&&a.active);
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
    if(!s.actors.some(a=>AUXILIARY_IDS.includes(a.id)))candidate.actors.push(...makeAuxiliaries(entity,candidate.world,candidate.actors,candidate.clock));
    candidate.enemyFire=s.enemyFire??{rounds:[],nextId:0};   // saves anteriores ao fogo em voo começam sem tiros no ar
    // Legacy MG bursts pre-created future rounds. Keep shots already in flight, cancel unissued ones, and
    // resume from standing on the next update, without a migration marker or an RNG draw.
    for(const a of candidate.actors)if(proneGunner(a)&&a.mg34Prone===undefined){
      a.shot=0;candidate.enemyFire.rounds=candidate.enemyFire.rounds.filter(r=>r.by!==a.id||r.firedAt<=s.clock);
    }
    candidate.timers={...s.timers,kowalRounds:s.timers.kowalRounds??30,lowAmmoHint:s.timers.lowAmmoHint??false,nextCombatCall:s.timers.nextCombatCall??0};
    // Saves anteriores activavam as 24 instâncias: só os 18 primeiros podem estar no pelotão; as reservas ficam fora de cena.
    if(!('enemyFire' in s)&&!('withdrawalPressure' in s.timers))for(const a of candidate.actors.filter(a=>a.group==='grp_east_platoon'&&Number(a.id.split('_').at(-1))>=18))
      Object.assign(a,{active:false,alive:false,health:0,state:'DOWN'});
    for(const a of candidate.actors)initializePresentation(a,candidate.clock);
    candidate.weapon.restore(s.weapon);candidate.rng.state=s.rng;candidate.events=[];candidate.world.refresh(Object.keys(s.consumed),s.flags);
    candidate.display=createDisplayFire(displaySeed(s.rng,s.clock),displayProfiles(definition,{actors:candidate.actors}));   // not saved: restarts empty, re-seeded from the saved state
    if(s.resumeCheckpoint!==undefined){
      const backup=new M01Simulation(undefined,{difficulty});backup.restoreSnapshot(s.resumeCheckpoint);candidate.checkpoint=backup.snapshot(false);
    }else candidate.checkpoint=candidate.snapshot(false);   // legacy schema 2 used the loaded state itself as CP
    Object.assign(this,candidate);return true;
  }
  restoreCheckpoint(){return this.restoreSnapshot(this.checkpoint);}
  loadCheckpoint(text){try{if(typeof text!=='string'||text.length>1000000)throw new Error('Ficheiro ausente ou demasiado grande.');this.restoreSnapshot(JSON.parse(text));return {ok:true};}catch(error){return {ok:false,error:error.message};}}
}

// T47. The gunner's fire record: own random stream, belt, bursts fired, cooldown and engagement window (all finite and inside what the machine can produce).
function validateCKMFire(a,s,reject){
  const f=a.ckmFire,finite=(v,min=0,max=Infinity)=>Number.isFinite(v)&&v>=min&&v<=max;
  if(a.id!=='ckm_gunner'||!f||Object.keys(f).length!==5||['rng','belt','bursts','nextAt','engagedUntil'].some(k=>!Object.hasOwn(f,k))||
    !Number.isInteger(f.rng)||!finite(f.rng,0,0xffffffff)||!Number.isInteger(f.belt)||!finite(f.belt,0,CKM_BELT)||!Number.isInteger(f.bursts)||f.bursts<0||
    !finite(f.nextAt,0,s.clock+CKM_BURST_SEC+CKM_COOLDOWN[1]+CKM_FEED_SEC+1)||!finite(f.engagedUntil,0,s.clock+CKM_HOLD_SEC+1e-6))reject('ckm fire record');
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
  const actorIds=[...definition.cast.filter(c=>c.id!=='jan_wrona').map(c=>c.id),...Array.from({length:40},(_,i)=>`de_east_${i}`),...Array.from({length:10},(_,i)=>`de_spans_${i}`),...Array.from({length:24},(_,i)=>`pl_east_${i}`)];
  const hasCKM=Array.isArray(s.actors)&&s.actors.some(a=>CKM_IDS.includes(a?.id));
  if(hasCKM)actorIds.push(...CKM_IDS);
  const hasAuxiliary=Array.isArray(s.actors)&&s.actors.some(a=>AUXILIARY_IDS.includes(a?.id));
  if(hasAuxiliary)actorIds.push(...AUXILIARY_IDS);
  if(!Array.isArray(s.actors)||s.actors.length!==actorIds.length||new Set(s.actors.map(a=>a.id)).size!==s.actors.length||!s.actors.every(a=>point(a)&&actorIds.includes(a.id)&&Number.isFinite(a.radius)&&a.radius>0))reject('actores');
  for(const a of s.actors)validatePresentation(a,s.clock,reject);
  for(const a of s.actors){
    if(a.cover&&!definitionMapCover(a.cover))reject('cover node '+a.id);
    if(a.displayOnly!==undefined&&(!AUXILIARY_IDS.includes(a.id)||a.displayOnly!==true))reject('display-only actor');
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
      Object.keys(t).some(k=>!['phase','startedAt','visible','burstPlan'].includes(k))||!['idle','aim','feed','fire_burst','abandon','retreat'].includes(t.phase)||
      !finite(t.startedAt,0,s.clock)||typeof t.visible!=='boolean'||
      ['abandon','retreat'].includes(t.phase)&&!finite(s.consumed?.[E('east_demolition')],0,t.startedAt))reject('guarnição ckm');
    if(t.phase==='fire_burst'&&!t.burstPlan&&a.id==='ckm_gunner')reject('ckm burst plan required');   // the other two men copy the gunner's burst without a plan
    if(t.burstPlan){
      const b=t.burstPlan;
      if(b.policy==='live')validateCKMLive(a,s,reject);
      else if(Object.keys(b).some(k=>!['policy','startedAt','rounds','interval','emitted'].includes(k))||b.policy!=='disabled'||b.emitted!==0||!finite(b.startedAt,0,s.clock)||!Number.isInteger(b.rounds)||!finite(b.rounds,4,7)||b.interval!==.075||a.shot!==0||!a.alive||!a.active||['abandon','retreat'].includes(t.phase))reject('ckm disabled burst plan');
    }
    if(a.ckmFire!==undefined)validateCKMFire(a,s,reject);
  }
  if(s.actors.some(a=>a.team==='enemy'&&a.x<690)||s.actors.some(a=>definition.historicalPersonsOffscreen.some(h=>h.id===a.id)))reject('elenco');
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
  if(s.enemyFire!==undefined&&(!s.enemyFire||!Array.isArray(s.enemyFire.rounds)||s.enemyFire.rounds.length>200||!Number.isInteger(s.enemyFire.nextId)||s.enemyFire.nextId<0||
    new Set(s.enemyFire.rounds.map(r=>r?.id)).size!==s.enemyFire.rounds.length||s.enemyFire.rounds.some(r=>!validRound(r,s.clock))))reject('fogo em voo');
  if(s.actors.some(a=>a.pose!=null&&a.pose!=='seated'))reject('pose');
  const w=s.weapon;
  if(w?.id!=='kb_wz29'||Object.keys(w).some(k=>!['id','mag','reserve','state','until','started','lastShot','shotCount','received','sight','reloadMode'].includes(k))||
    !Number.isInteger(w.mag)||w.mag<0||w.mag>5||!Number.isInteger(w.reserve)||w.reserve<0||w.reserve>40||
    !['READY','BOLT_CYCLE','RELOAD_CLIP','RELOAD_SINGLE'].includes(w.state)||![300,500,800,1000].includes(w.sight)||![w.until,w.started,w.lastShot,w.shotCount].every(Number.isFinite)||
    !Number.isInteger(w.shotCount)||w.shotCount<0||!Number.isInteger(w.received??0)||(w.received??0)<0||(w.received??0)>30||
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
    d.smokeSeconds!==undefined&&!finite(d.smokeSeconds,0,d.id.startsWith('m01_grenade_')?20:240)))reject('destruição');
  if(!Number.isInteger(s.grenades.nextId)||s.grenades.nextId<0||s.grenades.active.length>2||s.grenades.active.some(g=>typeof g.id!=='string'||![g.x,g.y,g.z,g.vx,g.vy,g.vz,g.fuse].every(Number.isFinite)||g.fuse<=0))reject('granadas em voo');
  for(const key of ['boundary','water','cover','repairStall','repairSuppressedUntil','withdrawalCasualty','ambient','nextCoverCall','guide',
    'boundaryCountdown','coverExposure','coverCallIndex'])if(!finite(s.timers[key]))reject('timer '+key);
  for(const key of ['guideAt','guideDist'])if(key in s.timers&&!finite(s.timers[key]))reject('timer '+key);
  if('guideKey' in s.timers&&s.timers.guideKey!==null&&typeof s.timers.guideKey!=='string')reject('timer guideKey');
  if('guideShown' in s.timers&&typeof s.timers.guideShown!=='boolean')reject('timer guideShown');
  if('kowalRounds' in s.timers&&(!Number.isInteger(s.timers.kowalRounds)||s.timers.kowalRounds<0||s.timers.kowalRounds>30))reject('timer kowalRounds');
  if((s.timers.kowalRounds??30)+(s.weapon?.received??0)!==30)reject('munição da secção');
  if('lowAmmoHint' in s.timers&&typeof s.timers.lowAmmoHint!=='boolean')reject('timer lowAmmoHint');
  for(const key of ['repairPins','calloutAt','firstMgAt'])if(key in s.timers&&!Number.isFinite(s.timers[key]))reject('timer '+key);
  if('fireEase' in s.timers&&typeof s.timers.fireEase!=='boolean')reject('timer fireEase');
  if('withdrawalPressure' in s.timers&&(!Number.isInteger(s.timers.withdrawalPressure)||!finite(s.timers.withdrawalPressure,0,7)))reject('timer withdrawalPressure');
  if('nextCombatCall' in s.timers&&!finite(s.timers.nextCombatCall))reject('timer nextCombatCall');
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
  const dialogue=d=>d&&[...definition.dialogue,...definition.callouts.lines].some(line=>line.id&&line.id===d.id)&&typeof d.speaker==='string'&&typeof d.text==='string'&&d.text.length<600&&finite(d.duration,1,15);
  if(s.dialogueQueue.some(d=>!dialogue(d))||(s.subtitle&&(!dialogue(s.subtitle)||!finite(s.subtitle.until))))reject('legendas');
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
