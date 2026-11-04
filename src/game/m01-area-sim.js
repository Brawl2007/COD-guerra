// R4 WP-1 (INC-1, 2026-10-25): the simulation of a new act's area, here Act VII-a «Perímetro norte, manhã» (missions/m01-tczew/areas/np).
// The current act (04:30-07:05) stays a closed box (M01Simulation, untouched). This class has the same contract the game, the HUD, the renderer and the
// audio read (tick, drainEvents, snapshot/restoreSnapshot/checkpoint, renderState, actors, enemyFire, objectives, scene, subtitle...), composed from the
// reusable modules of the current act: the player's body physics and rifle (m01-player-physics, wz29), real rounds with an arc and a flight time
// (m01-fire makeRound/traceRound, m01-aim), the presentation records (m01-animation-presentation), and the section machinery as factories
// (m01-act-factories: the squad bounds, the firing line of the rearguard, the deck assault generalised to a line of approach).
// Everything is decided here, from seeded streams; the renderer only draws it. No wall clock, no unseeded draw, no DOM.
// 2026-11-03 (duration of the combat): the German assault comes in ECHELONS. The first is on the field when the wave starts; when it breaks its assault falls back, the overwatch
// holds the edge through a lull, and the next echelon walks in from the treeline line on lanes of its own (stepEchelons); the last echelon's break takes everybody back.
// 2026-11-04 (Captain's decisions, reversible; docs/verification/m01-runtime/vii-a-duration-pkg1-2026-11-04): (1) CP-F, a second checkpoint when the first echelon breaks (the pause begins):
// a death in the second echelon returns there, not to the arrival (lullCheckpoint); (2) suppressive fire: a German MG34 with nothing in sight fires short bursts of real rounds at the
// place where it last saw a muzzle flash of a Pole or of the player, and still fires, at half the cadence, while it is pinned (noteFlash, germanFire, areaBurst): GAMEPLAY_DRAMATIZATION.
// 2026-11-04 (INC-2, Act VII-b «Norte, durante o dia», docs/direction/M01_R4_VII_BC_DESIGN.md): the names the first act kept in the code (its cards, objectives, phases, flags, arrival checkpoint,
// marker) are the DEFAULTS of an act profile (act.profile; makeProfile), so that a second act of the same area can name its own; the barrage (artillery with an effect by radius, stepBarrage), the
// checkpoints with a trigger of data (lullCheckpoint) and the stretcher-bearers (stepMedics) are optional blocks of the act data that an act without them (VII-a) never meets: its saves, its
// streams and its golden are what they were.
// 2026-11-04 (INC-3, Act VII-c «Ordem ~17:00 e retirada», docs/direction/M01_R4_VII_BC_DESIGN.md §3): an act with no assault at all. Its plan has a WITHDRAWAL instead (act.withdrawal; m01-withdrawal.js): a courier brings
// the order to the command post, the section goes up to the parapet, the line and the ckm crew leave by bounds (the squad machinery of m01-act-factories.js, a second and a third plan with records of their own), the section
// stays as rear guard and leaves by bounds when the line is out, and the act ends when the player stands in the exit band and the rear guard is out (stepWithdrawal). A card for the order comes before the entry card
// (cards.order), the checkpoints are CP-J at the end of the entry card and CP-K by a flag. Nobody fires: an act without the blocks (VII-a, VII-b) never meets any of this, as with the barrage.
import bwDefinition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with { type: 'json' };
import npLayout from '../../missions/m01-tczew/areas/np/layout.json' with { type: 'json' };
import npAct from '../../missions/m01-tczew/areas/np/act.json' with { type: 'json' };
import npbAct from '../../missions/m01-tczew/areas/np/act-vii-b.json' with { type: 'json' };
import npcAct from '../../missions/m01-tczew/areas/np/act-vii-c.json' with { type: 'json' };
import {M01AreaWorld} from '../world/m01-area-world.js';
import {movePlayer} from '../world/m01-player-physics.js';
import {Wz29} from './wz29.js';
import {Random} from '../core/random.js';
import {M01_DIFFICULTY,M01_DIFFICULTY_IDS,M01_DIFFICULTY_SIM_DEFAULT,deathText} from './m01-difficulty.js';
import {eyePosition,aimDirection,muzzlePosition,traceShot,traceObstruction} from '../world/spatial.js';
import {makeRound,traceRound,closestApproach,NEAR_MISS} from './m01-fire.js';
import {aimPoint} from './m01-aim.js';
import {initializePresentation,updateMotion,updatePosture,updateBodyYaw,recordSuppression,recordDamage,recordHit,updateActorDetails,presentationDiagnostics} from './m01-animation-presentation.js';
import {impactPass} from './m01-audio-events.js';
import {pairUnit} from './m01-unit-hash.js';   // a uniform number in [0, 1) from two ids (no stream is drawn)
import {CONCUSSION,blastPosture,blastTarget,sightPoint,concussionPeak,concussionLevel,mergeConcussion} from './m01-blast.js';   // act 1's pure blast helpers, read and never changed
import {SHELL_SPECS,SHELL_REACH_M,PLANNED_IMPACT_M,shellOutcome,shellProtection,makeBarragePlan,makeMedicPlan,barrageSeed,barrageNext,pickShellPoint,landingPoint,freshBarrageRecord,freshMedicRecord,validBarrageRecord,validMedicRecord} from './m01-shell-blast.js';
import {makeApproachPlan,makeLinePlan,makeSquadPlan,squadStep,squadSlotOf,squadMovingIn,validApproachRecord,validApproachWave,validGermanAi,validSquadRecord} from './m01-act-factories.js';
import {makeWithdrawalPlan,freshWithdrawalRecord,validWithdrawalRecord,validWithdrawalSquads,ckmCrewStage,inBand} from './m01-withdrawal.js';

// 2 (2026-11-03, the second echelon): the roster grew (the men of the echelons that follow the first) and the wave record gained its echelon state (timers.wave.ech/echs/lullUntil).
// A schema 1 save of this act (QA only: the acts are off by default) is REJECTED with a message, not migrated: it cannot hold the later echelons' men, and the act restarts in seconds.
export const AREA_SAVE_SCHEMA=2;
const seconds=text=>{const v=text.split(':').map(Number);if(v.length===2)v.push(0);return v.reduce((n,x)=>n*60+x,0);};
const clone=v=>JSON.parse(JSON.stringify(v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleOf=(from,to)=>Math.atan2(to.z-from.z,to.x-from.x);
const entity=(id,point,team='ally',extra={})=>({id,space:'metres',...point,team,health:100,alive:true,active:true,
  state:'GUARD',facing:0,shot:0,radius:.3,crouched:false,suppressedUntil:0,cooldown:0,rounds:5,...extra});
// Per-man decision streams (the LCG of the current act's AI, m01-simulation newAI): never the main stream, so a decision of one man never moves another's.
const aiSeed=(seed,index)=>Math.imul(((seed>>>0)^0x6e70a1b3)+Math.imul(index+1,0x9e3779b9)|0,2654435761)>>>0;
const aiNext=ai=>{ai.rng=(Math.imul(1664525,ai.rng)+1013904223)>>>0;return ai.rng/4294967296;};
const aiGauss=ai=>{let u=0;while(u<=1e-12)u=aiNext(ai);return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*aiNext(ai));};
const between=(ai,[lo,hi])=>lo+(hi-lo)*aiNext(ai);
const pause=(ai,mean,lo)=>Math.min(3*mean,Math.max(lo,mean*Math.exp(.5*aiGauss(ai)-.125)));

/** The area acts this module can run, in the order of the chain (m01-acts.js): VII-a, VII-b, VII-c. */
export const AREA_ACTS=Object.freeze({act_vii_a_north:Object.freeze({layout:npLayout,act:npAct}),act_vii_b_north_day:Object.freeze({layout:npLayout,act:npbAct}),
  act_vii_c_withdrawal:Object.freeze({layout:npLayout,act:npcAct})});

/**
 * The names an area act uses for its parts (F1 of the design): ids of its cards, objectives, event and checkpoint, the prefix of its phases and flags, the label of its marker. VII-a's are the defaults
 * (act.profile may omit any), so its data and its saves are exactly as they were; VII-b names its own. `ordinals`: whether the status line may say «2.ª vaga» (VII-b never counts its attacks on screen).
 */
export const PROFILE_DEFAULTS=Object.freeze({label:'VII-a',phasePrefix:'NP',flagPrefix:'m01np',markerLabel:'Parapeito norte',marker:'trench_post',entryCard:'cs_np_entry',endCard:'cs_np_end',
  arrivalObjective:'obj_np_reach_trench',holdObjective:'obj_np_hold_north',coverObjective:null,cardEndEvent:'evt_np_card_end',waveEvent:'evt_np_wave',arrivalCheckpoint:'cp_np_e_perimetro',
  statusLabel:'Linha norte',repelledText:'Ataque repelido',ordinals:true,arrivalNeedsReserve:false});
export function makeProfile(act,layout){
  const fail=m=>{throw new Error(`M01 ${act.id}: profile: ${m}`);};
  const given=act.profile??{};
  if(typeof given!=='object'||Array.isArray(given))fail('an object, or leave it out');
  const bad=Object.keys(given).find(k=>k!=='note'&&!Object.hasOwn(PROFILE_DEFAULTS,k));if(bad!==undefined)fail(`unknown key ${bad}`);
  const P={...PROFILE_DEFAULTS,...given};delete P.note;
  for(const [k,v] of Object.entries(P)){
    if(typeof PROFILE_DEFAULTS[k]==='boolean'){if(typeof v!=='boolean')fail(`${k}: true or false`);}
    else if(k==='coverObjective'){if(v!==null&&(typeof v!=='string'||!v))fail('coverObjective: an objective id, or null');}
    else if(typeof v!=='string'||!v)fail(`${k}: a non-empty text`);
  }
  if(!/^[A-Z]+$/.test(P.phasePrefix)||!/^m01np[a-z]*$/.test(P.flagPrefix))fail('phasePrefix (capitals) / flagPrefix (m01np...)');
  const objective=id=>act.objectives.some(o=>o.id===id);
  if(P.entryCard!==act.cards.entry.id||P.endCard!==act.cards.end.id)fail('entryCard / endCard must be the ids of cards.entry / cards.end');
  if(!objective(P.arrivalObjective)||!objective(P.holdObjective)||(P.coverObjective!==null&&!objective(P.coverObjective)))fail('arrivalObjective / holdObjective / coverObjective must be objectives of the act');
  if(!act.events.some(e=>e.id===P.waveEvent))fail('waveEvent must be an event of the act');
  if(!act.checkpoints.some(c=>c.id===P.arrivalCheckpoint))fail('arrivalCheckpoint must be a checkpoint of the act');
  if(!Object.hasOwn(act.points??{},P.marker)&&!Object.hasOwn(layout.points,P.marker))fail('marker must be a point of the act or of the layout');
  return Object.freeze(P);
}

/** The solids of the area that no German path may cross and no turned earth may touch: the wreck, the parapet segments and the low front of the ckm nest (the footprints of the
 *  boxes the world builds, m01-area-world.js refresh; the heights do not matter to a path on the ground). */
export const areaPlanSolids=layout=>[...layout.wreck.boxes.map(b=>({id:b.id,min:{x:b.min[0],z:b.min[2]},max:{x:b.max[0],z:b.max[2]}})),
  ...layout.parapets.segments.map(([x0,x1],i)=>({id:`np_parapet_${i}`,min:{x:x0,z:layout.parapets.z0},max:{x:x1,z:layout.parapets.z1}})),
  {id:'np_parapet_nest',min:{x:layout.parapets.nestFront.x0,z:layout.parapets.z0},max:{x:layout.parapets.nestFront.x1,z:layout.parapets.z1}}];

/** Everything of the act that is data, validated once (a typo stops the game instead of changing it). */
export function areaActPlan(actId='act_vii_a_north'){
  const entry=AREA_ACTS[actId];if(!entry)throw new Error(`M01 act: unknown area act ${actId}`);
  return areaPlanOf(actId,entry);
}
/** The plan of an act from its data ({layout, act}): areaActPlan for a registered act; the tests give it edited copies to see what a typo does. */
export function areaPlanOf(actId,entry){
  const {layout,act}=entry,group=id=>act.groups.find(g=>g.id===id),profile=makeProfile(act,layout),L=profile.label;
  const pb=layout.bounds.playable,def={groups:act.groups,events:act.events};
  const line=makeLinePlan(def,{group:'grp_np_line',key:'rearguard',man:'^pl_np_\\d+$',postBox:{minX:pb.minX,maxX:pb.maxX,minZ:-1160,maxZ:-1158},survivorFloor:false,label:`M01 ${L} line`});
  const section=group('grp_np_section'),squad=makeSquadPlan(section.squad,`M01 ${L} squad`);
  // INC-3: an act has an assault (VII-a, VII-b: grp_np_de) or a withdrawal (VII-c: act.withdrawal), never both and never neither.
  const assault=group('grp_np_de')!==undefined?makeApproachPlan(group('grp_np_de').assault,{minX:pb.minX,maxX:pb.maxX,groundY:layout.groundY,label:`M01 ${L} assault`,solids:areaPlanSolids(layout)}):null;
  const known=act.checkpoints.map(c=>c.id);
  for(const e of assault?.echelons??[])if(e.checkpoint!==null&&(!known.includes(e.checkpoint)||e.checkpoint===profile.arrivalCheckpoint))
    throw new Error(`M01 ${L} assault: echelon ${e.id}: checkpoint ${e.checkpoint} must be a checkpoint of the act other than the arrival's`);
  const ckm=group('grp_np_ckm');
  if(!Array.isArray(ckm.root)||ckm.root.length!==3||!Number.isFinite(ckm.yawDeg))throw new Error(`M01 ${L} ckm root/yawDeg`);
  const stageSlots=Object.fromEntries(Object.entries(section.stage.slots).map(([id,[x,z]])=>[id,{x,z}]));
  // The event that sends the first echelon on: at a battle clock (VII-a: or when the player reaches the post), or some seconds after a barrage has ended (VII-b); in VII-c, the order (the courier's arrival).
  const waveTrigger=act.events.find(e=>e.id===profile.waveEvent).trigger;
  if(!assault&&(act.barrages!==undefined||act.medics!==undefined))throw new Error(`M01 ${L}: barrages and medics belong to an act with an assault`);
  const barrages=act.barrages!==undefined?makeBarragePlan(act.barrages,{playable:pb,objectives:act.objectives.map(o=>o.id),echelons:assault.echelons.length,line:line.men,label:`M01 ${L} barrage`}):null;
  const medics=act.medics!==undefined?makeMedicPlan(act.medics,{playable:pb,label:`M01 ${L} medics`}):null;
  if(barrages){for(const b of barrages.barrages)if(b.callout&&!act.callouts.some(c=>c.on===b.callout))throw new Error(`M01 ${L} barrage ${b.id}: callout ${b.callout} is not a callout of the act`);}
  const crewIds=['ckm_gunner','ckm_loader'];
  const withdrawal=act.withdrawal!==undefined?makeWithdrawalPlan(act.withdrawal,{playable:pb,label:`M01 ${L} withdrawal`,lineIds:[...line.men,...crewIds],lineStage:{...Object.fromEntries(line.men.map((id,i)=>[id,line.posts[i]])),...ckmCrewStage(ckm.root,crewIds)},section:squad}):null;
  if(Boolean(assault)===Boolean(withdrawal))throw new Error(`M01 ${L}: an area act has an assault (grp_np_de) or a withdrawal (act.withdrawal), not both and not neither`);
  if(withdrawal){if(waveTrigger.type!=='order')throw new Error(`M01 ${L}: the order event trigger is {type: order}`);}
  else if(waveTrigger.type==='battleClock'){if(typeof waveTrigger.at!=='string')throw new Error(`M01 ${L}: the wave event needs a battle clock time`);}
  else if(waveTrigger.type==='barrageEnd'){if(!barrages?.byId[waveTrigger.barrage]||!(waveTrigger.afterSec>=0&&waveTrigger.afterSec<=60))throw new Error(`M01 ${L}: the wave event follows a barrage of the act, 0-60 s after its end`);}
  else throw new Error(`M01 ${L}: the wave event trigger is battleClock or barrageEnd`);
  const triggers=checkpointTriggers(act,profile,assault?assault.echelons.length:0);
  if(medics&&!barrages)throw new Error(`M01 ${L}: medics need a barrage (the wounded man is a shell's)`);
  if(act.cards.order!==undefined){const c=act.cards.order;if(!c||typeof c.id!=='string'||!c.id||!(c.seconds>0)||typeof c.skippable!=='boolean'||!Array.isArray(c.lines)||!c.lines.length)throw new Error(`M01 ${L}: cards.order {id, seconds, skippable, lines}`);}
  const points=Object.freeze({...layout.points,...(act.points??{})});
  return Object.freeze({actId,layout,act,profile,line,squad,assault,ckm,section,stageSlots,waveTrigger,waveAt:waveTrigger.type==='battleClock'?seconds(waveTrigger.at):null,barrages,medics,withdrawal,triggers,points,
    clockStart:seconds(act.clock.battleClockStart)});
}
/**
 * The checkpoints of an act that carry a trigger of DATA (F4 of the design; VII-a's carry a text that documents when they are taken, and one is taken by the entry card and one by an echelon's `checkpoint`):
 * {type:'sceneEnd', scene}: the end of the entry card (the arrival's checkpoint); {type:'echelonBroken', echelon: k}: the end of the tick in which echelon k breaks and another follows; {type:'flag', flag}: the
 * tick in which the flag of the act becomes true. Returns the ones that are taken during the fight (echelonBroken, flag), validated.
 */
function checkpointTriggers(act,profile,echelons){
  const fail=m=>{throw new Error(`M01 ${profile.label}: checkpoints: ${m}`);},out=[];
  for(const c of act.checkpoints){
    const t=c.trigger;if(t===undefined||typeof t==='string')continue;
    if(!t||typeof t!=='object'||Array.isArray(t))fail(`${c.id}: trigger (a text, or {type, ...})`);
    if(t.type==='sceneEnd'){if(t.scene!==act.cards.entry.id||c.id!==profile.arrivalCheckpoint||Object.keys(t).length!==2)fail(`${c.id}: sceneEnd is the end of the entry card and the arrival's checkpoint`);}
    else if(t.type==='echelonBroken'){
      if(!Number.isInteger(t.echelon)||t.echelon<0||t.echelon>=echelons-1||Object.keys(t).length!==2)fail(`${c.id}: echelonBroken: the index of an echelon that another follows`);
      out.push({id:c.id,type:t.type,echelon:t.echelon});
    }else if(t.type==='flag'){
      if(typeof t.flag!=='string'||!t.flag.startsWith(profile.flagPrefix+'.')||Object.keys(t).length!==2)fail(`${c.id}: flag: a flag of the act (${profile.flagPrefix}.*)`);
      out.push({id:c.id,type:t.type,flag:t.flag});
    }else fail(`${c.id}: trigger type ${t.type} (sceneEnd, echelonBroken or flag)`);
  }
  return Object.freeze(out);
}

const CKM_IDS=['ckm_gunner','ckm_loader'];
// The arrival's checkpoint is profile.arrivalCheckpoint (VII-a: CP-E, at the end of the entry card; the pause's checkpoint, CP-F, is the second echelon's `checkpoint` in the data; VII-b: CP-I, and CP-I2 by a trigger of data).
/** The roster of an area act, in actor order (makeActors). */
export const areaRoster=plan=>['marek_zielinski','staszek_pawlak','szymon_kowal',...plan.line.men,...CKM_IDS,...(plan.assault?plan.assault.men.map(m=>m.id):[]),...(plan.medics?.ids??[]),...(plan.withdrawal?[plan.withdrawal.messenger.id]:[])];
const LINE_DAMAGE=40;                    // a German round that strikes a man of the line (not the named section or the ckm crew: they are pinned, never killed, as the plot needs them)
const ESSENTIAL_PIN_SEC=3,NEAR_PIN_SEC=4,PLAYER_SUPPRESS_SEC=5;
const RKM={burst:[3,5],sigmaMil:[7,5],pauseSec:4,mag:20,reloadSec:4};
const ckmSeed=seed=>Math.imul((seed>>>0)^0x2c4b30de,2654435761)>>>0;

/** carry = what the previous act hands over (m01-acts.js carryFrom). A start without a previous act uses defaultCarry. */
export function defaultCarry(difficulty=M01_DIFFICULTY_SIM_DEFAULT){
  const L=M01_DIFFICULTY[difficulty]??M01_DIFFICULTY.recruta;
  return {v:1,from:null,difficulty:L.id,seed:19390901,events:[],flags:{},weapon:{mag:L.loadout.mag,reserve:L.loadout.reserve},grenades:L.loadout.grenades};
}

export class M01AreaSimulation {
  constructor(seed=19390901,{difficulty=M01_DIFFICULTY_SIM_DEFAULT,actId='act_vii_a_north',carry=null}={}){
    if(!M01_DIFFICULTY_IDS.includes(difficulty))throw new RangeError('Dificuldade M01 desconhecida: '+String(difficulty));
    this.difficulty=difficulty;this.actId=actId;this.plan=areaActPlan(actId);this.profile=this.plan.profile;this.waveFlag=`${this.profile.flagPrefix}.wave`;this.carry=clone(carry??defaultCarry(difficulty));this.reset(seed);
  }
  phase(name){return `${this.profile.phasePrefix}_${name}`;}
  get level(){return M01_DIFFICULTY[this.difficulty];}
  reset(seed=this.seed??19390901){
    const P=this.plan,L=P.layout,A=P.act;
    this.seed=seed;this.missionId=bwDefinition.id;this.area=L.area;this.rng=new Random(seed);
    // The definition the HUD and the audio read: the current act's, with this act's objectives, checkpoints and an empty cutscene list (the cards are scene.card).
    this.definition={...bwDefinition,objectives:A.objectives.map(o=>({...o})),checkpoints:A.checkpoints.map(c=>({...c})),cutscenes:[],sectors:[],
      debrief:{...bwDefinition.debrief,paragraphs:debriefWith(...debriefChain(this.actId,this.carry))}};
    this.world=new M01AreaWorld(L,{extraCovers:P.assault?P.assault.covers:[],eventIds:this.carry.events,flags:this.carry.flags,...(A.clock.sun?{sun:A.clock.sun}:{})});
    this.clock=0;this.battleClock=P.clockStart;this.events=[];
    // The current act's consumed events stay consumed (the bridges as the demolitions left them), an hour before this act's clock; this act's own events at their clock.
    this.consumed=Object.fromEntries(this.carry.events.map(id=>[id,-3600]));
    this.objectives=Object.fromEntries(A.objectives.map(o=>[o.id,{state:'locked',progress:0}]));
    this.flags={...this.carry.flags,...(P.assault?{[this.waveFlag]:'pending'}:{})};   // an act with no assault (VII-c) has no wave to be pending
    this.destruction=[];this.dialogueQueue=[];this.subtitle=null;this.sceneDone=[];this.scene=null;this.checkpointsReached=[];this.failure=null;
    const s=L.points.spawn;
    this.player=entity('jan_wrona',{x:s.x,y:L.groundY,z:s.z},'player',{angle:s.facingDeg*Math.PI/180,pitch:0,radius:.36,aiming:false,moveBlend:0,sprinting:false,weaponShotAt:-1e9,carrying:null,headgear:'pl_rogatywka_wz37'});
    this.weapon=new Wz29();this.weapon.mag=this.carry.weapon.mag;this.weapon.reserve=this.carry.weapon.reserve;
    this.grenades={ammo:this.carry.grenades,active:[],nextId:0};
    this.actors=this.makeActors(seed);
    for(const a of this.actors)initializePresentation(a,this.clock);
    // The squad record starts at its first bound: the current act's updateSquad infers a retreat already made from men WEST of their slots, which means nothing here.
    this.timers={boundary:0,boundaryCountdown:0,said:{},lastHitAt:-1e9,burstWound:null,wave:null,endAt:null,playerPinnedAt:-1e9,squad:{move:0,moving:false,since:0},
      ...(P.barrages?{barrage:freshBarrageRecord()}:{}),...(P.medics?{medics:freshMedicRecord()}:{}),   // the records of the blocks an act has; an act without them (VII-a) keeps the timers it always had
      ...(P.withdrawal?{withdrawal:freshWithdrawalRecord(),line:{move:0,moving:false,since:0},rear:{move:0,moving:false,since:0}}:{})};   // INC-3: the withdrawal's record and its two squads (the line's bounds, the rear guard's)
    this.enemyFire={rounds:[],nextId:0};
    const w=L.wreck.smoke;
    this.sectors={sectors:[],damage:[{id:w.id,x:w.x,y:w.y,z:w.z,started:-w.burningSinceSec,soundAt:-w.burningSinceSec,wreck:true}]};
    this.mission={phase:this.phase('ENTRY'),complete:false,text:'',status:''};
    this.startCard(A.cards.order?'order':'entry');   // INC-3: an act may open on a card before its entry card (VII-c: the order of ~17:00, then «Ao anoitecer»)
    this.checkpoint=this.snapshot(false);
  }
  makeActors(seed){
    const P=this.plan,y=P.layout.groundY,out=[],face=-Math.PI/2;   // north
    const sec=P.section,cast=id=>P.act.cast.find(c=>c.id===id)??{};
    const add=(a,i)=>{a.ai={rng:aiSeed(seed,i)};out.push(a);};
    add(entity('marek_zielinski',{x:sec.leader.from[0],y,z:sec.leader.from[1]},'ally',{role:'SQUAD_LEADER',essential:true,group:'grp_np_section',facing:face,post:{x:sec.leader.post[0],z:sec.leader.post[1]}}),0);
    for(const [i,id] of ['staszek_pawlak','szymon_kowal'].entries()){const st=P.stageSlots[id];
      add(entity(id,{x:st.x,y,z:st.z},'ally',{role:cast(id).role,essential:true,group:'grp_np_section',facing:face,...(id==='szymon_kowal'?{rounds:RKM.mag}:{})}),1+i);}
    P.line.men.forEach((id,i)=>{const p=P.line.posts[i];add(entity(id,{x:p.x,y,z:p.z},'ally',{role:'RIFLEMAN',group:'grp_np_line',facing:face,crouched:true,cooldown:1+i*.7}),10+i);});
    // The ckm wz.30 crew at their posts round the gun root (the current act's post offsets turned from east to north: x' = dz, z' = -dx).
    const [rx,ry,rz]=P.ckm.root,yaw=P.ckm.yawDeg*Math.PI/180,turn=Math.PI/2-yaw;   // the current act's gun faces east (yaw -PI/2 in the renderer); here yaw 0 faces north
    const posts=[[-.794,-.029],[.08,-.52]];
    CKM_IDS.forEach((id,i)=>{const [dx,dz]=posts[i];add(entity(id,{x:rx+dz,y:ry,z:rz-dx},'ally',{group:'grp_ckm_crew',role:'SUPPORT',essential:true,facing:(i===1?112*Math.PI/180:0)-turn,
      ckm:{phase:'idle',startedAt:0,visible:true,root:{x:rx,y:ry,z:rz},yaw},...(i===0?{ckmFire:{rng:ckmSeed(seed),belt:P.ckm.fire.belt,bursts:0,nextAt:0,engagedUntil:0}}:{})}),20+i);});
    // The Germans of the first echelon are already in the field when the act opens (the infantry of the ~07:00 attack went to ground when its vehicle was hit, T08): each
    // man kneels at his first stop behind turned earth, silent, until the wave goes on (updateWave). Spawned under the entry card, never in sight. The echelons that follow
    // wait off the field (inactive: never drawn, never hit, never counted) at the entry line, ready to walk in when their lull is over (enterEchelon).
    (P.assault?.men??[]).forEach((m,i)=>{const later=m.echelon>0,n=later?m.entry:m.path[m.stops[0]];add(entity(m.id,{x:n.x,y,z:n.z},'enemy',{group:'grp_np_de',weapon:m.weapon,role:m.weapon==='mg34'?'SUPPORT':'RIFLEMAN',
      facing:Math.PI/2,firedAt:-1e9,cooldown:2+i*.4,crouched:!later,active:!later,
      deck:later?{v:1,phase:'advance',node:0,until:0,since:0,t0:0,pinned:0}:{v:1,phase:m.role==='overwatch'?'hold':'cover',node:m.stops[0],until:0,since:0,t0:0,pinned:0}}),30+i);});
    // The stretcher-bearers (act.medics) wait off the field, at the south edge, until a man of the line is wounded (stepMedics). They are of the named kind: the plot needs them, so a round only pins them.
    (P.medics?.ids??[]).forEach((id,i)=>add(entity(id,{x:P.medics.from[0]+i*1.2,y,z:P.medics.from[1]},'ally',{role:'MEDIC',group:'grp_np_medics',essential:true,active:false,facing:-Math.PI/2}),60+i));
    // The courier of the withdrawal (act.withdrawal.messenger) waits off the field, at the SW corner of the slice, until the dusk card has ended (stepWithdrawal). Fictional, named by nothing but his errand; the plot needs him, so he cannot be hurt.
    if(P.withdrawal){const M=P.withdrawal.messenger;add(entity(M.id,{x:M.from[0],y,z:M.from[1]},'ally',{role:'RIFLEMAN',group:'grp_np_messenger',essential:true,active:false,facing:0}),70);}
    for(const a of out)if(a.firedAt===undefined)a.firedAt=-1e9;
    return out;
  }
  actor(id){return this.actors.find(a=>a.id===id);}
  get enemies(){return this.actors.filter(a=>a.team==='enemy');}
  get allies(){return this.actors.filter(a=>a.team==='ally');}
  get combatants(){return this.actors;}
  emit(event){this.events.push(event);}
  drainEvents(){const e=this.events;this.events=[];return e;}
  consumedEvent(id){return Object.hasOwn(this.consumed,id);}
  consume(id){if(!this.consumedEvent(id))this.consumed[id]=this.clock;}
  active(id){return this.objectives[id]?.state==='active';}
  activate(id){const o=this.objectives[id];if(o.state==='locked')o.state='active';}
  finish(id){const o=this.objectives[id];if(o.state!=='done'){o.state='done';o.progress=100;}}
  message(text){this.emit({type:'message',message:text});}
  // ------------------------------------------------------------------------------------------------------------------------------------------------- cards
  startCard(kind){
    const c=this.plan.act.cards[kind];if(this.sceneDone.includes(c.id))return;
    this.scene={id:c.id,elapsed:0,card:{kind,lines:[...c.lines],seconds:c.seconds},skippable:c.skippable};
  }
  updateScene(dt,skip){
    const s=this.scene;if(!s)return;
    s.elapsed+=dt;
    if(s.elapsed<s.card.seconds&&!(skip&&s.skippable&&s.elapsed>.6))return;
    this.sceneDone.push(s.id);this.scene=null;
    if(s.card.kind==='order'){this.startCard('entry');return;}   // INC-3: the order's card is followed at once by the entry card (the screen stays black between the two)
    if(s.card.kind==='entry'){
      this.consume(this.profile.cardEndEvent);this.activate(this.profile.arrivalObjective);this.mission.phase=this.phase('ARRIVAL');
      this.saveCheckpoint(this.profile.arrivalCheckpoint);this.say('arrive_card_end');
    }else{this.mission.complete=true;this.mission.phase=this.phase('END');this.flags[`${this.profile.flagPrefix}.completed`]=true;this.emit({type:'complete'});}
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- tick
  tick(dt,controls={}){
    if(!Number.isFinite(dt)||dt<=0||this.mission.complete)return;dt=Math.min(.05,dt);
    if(!this.player.alive){const reason=this.failure;this.restoreCheckpoint();this.emit({type:'restored'});if(reason)this.message(reason);return;}
    this.clock+=dt;this.battleClock+=dt;const p=this.player;
    if(p.concussedUntil!==undefined&&!(this.clock<p.concussedUntil)){delete p.concussion;delete p.concussedUntil;}   // the stun of a shell is over (exactly the rule of the bombs of act 1)
    p.angle+=(controls.lookX??0)*.0022;p.pitch=Math.max(-1.25,Math.min(1.25,p.pitch-(controls.lookY??0)*.0022));p.aiming=Boolean(controls.aim);
    if(controls.crouch)p.crouched=!p.crouched;
    this.updateScene(dt,controls.skip);
    const locked=Boolean(this.scene);
    if(!locked){
      const f=controls.forward??0,s=controls.side??0,len=Math.hypot(f,s)||1;
      const stun=concussionLevel(p,this.clock),speed=(controls.sprint?6*(1-CONCUSSION.sprintCut*stun):3.8*(1-CONCUSSION.walkCut*stun))*(p.crouched?.6:1)*(p.aiming?.65:1);   // stun is 0 for a man who was never stunned: the old numbers
      const dx=(Math.cos(p.angle)*f-Math.sin(p.angle)*s)*speed*dt/len,dz=(Math.sin(p.angle)*f+Math.cos(p.angle)*s)*speed*dt/len;
      const before={x:p.x,z:p.z},landing=movePlayer(this.world,p,dx,dz,dt);if(landing)this.emit({type:'player-landing',...landing,point:{x:landing.x,y:landing.y,z:landing.z}});
      p.moveBlend=Math.min(1,dist(before,p)/(dt*3.8));p.sprinting=Boolean(controls.sprint)&&p.moveBlend>.1&&stun<CONCUSSION.sprintOffAt;
      this.weapon.update(this.clock*1000);
      if(controls.reload&&this.weapon.reload(this.clock*1000))this.emit({type:'reload',weapon:'kb_wz29'});
      if(controls.sight)this.message(`Alça: ${this.weapon.adjustSight()} m`);
      if(controls.fire)this.fire();
      this.updateGrenades(dt,controls.grenade);
      if(controls.interact)this.interact();
      this.boundaries(dt);
    }
    const before=this.actors.map(a=>({x:a.x,z:a.z}));
    this.stepBarrage();
    this.updateWave();
    this.stepMedics(dt);
    this.stepWithdrawal(dt);
    this.stepSection(dt);
    this.stepGermans(dt);
    this.stepLine(dt);this.stepKowal(dt);this.stepCKM();
    this.landRounds();this.landCKMRounds();
    for(const a of this.actors){if(a.shot>0)a.shot=Math.max(0,a.shot-dt);}
    updateMotion(this.actors,before,dt,this.clock);
    for(const a of this.actors){updatePosture(a,this.clock);updateBodyYaw(a,dt);}
    updateActorDetails(this.actors,this.clock,this.world);
    if(!p.alive)return;
    if(this.level.healing&&p.health<this.level.healing.cap&&this.clock-this.timers.lastHitAt>=this.level.healing.afterUnhitSec)p.health=Math.min(this.level.healing.cap,p.health+this.level.healing.ratePerSec*dt);
    this.updateObjectives();
    this.lullCheckpoint();
    this.advanceSubtitle();
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- player
  fire(){
    const p=this.player,now=this.clock*1000;if(!this.weapon.shoot(now))return;
    const aim=this.weapon.shotDirection(p.angle,p.pitch,p.aiming,p.moveBlend>.1,this.rng.next);
    const sway=1+CONCUSSION.aimSway*concussionLevel(p,this.clock);   // a stunned player's rifle is less steady: the same two draws, their deviation multiplied (exactly 1 when he is not stunned)
    if(sway!==1){aim.angle=p.angle+(aim.angle-p.angle)*sway;aim.pitch=p.pitch+(aim.pitch-p.pitch)*sway;}
    const dir=aimDirection(aim.angle,aim.pitch),origin=eyePosition(p),hit=traceShot(this.world,origin,dir,this.actors,1200,muzzlePosition(p));
    p.weaponShotAt=now;p.pitch=Math.min(1.25,p.pitch+.024);this.noteFlash(p);
    if(hit?.actor?.team==='enemy')this.damageGerman(hit.actor,this.weapon.profile.damage*hit.multiplier,p,'player');
    const point=hit?.point??{x:origin.x+dir.x*1200,y:origin.y+dir.y*1200,z:origin.z+dir.z*1200};
    this.suppressAlong(origin,dir,hit,1200);
    for(const a of this.actors)updatePosture(a,this.clock);
    this.emit({type:'player-shot',point,material:hit?.material,hit:hit?.actor?.team==='enemy',weapon:'kb_wz29'});
  }
  interact(){
    const R=this.plan.act.resupply,p=this.player;
    if(this.weapon.reserve>=R.reserveTo)return;
    const near=this.world.areaProps.some(o=>o.type==='ammo_crate_wood'&&Math.hypot(o.x-p.x,o.z-p.z)<R.reachM);
    if(near){const given=this.weapon.resupply(R.reserveTo-this.weapon.reserve);if(given)this.message(`+${given} cartuchos da caixa de munições`);}
  }
  get interaction(){
    if(this.scene?.skippable)return 'Espaço · saltar cartão';
    const R=this.plan.act.resupply,p=this.player;
    if(this.weapon.reserve<R.reserveTo&&this.world.areaProps.some(o=>o.type==='ammo_crate_wood'&&Math.hypot(o.x-p.x,o.z-p.z)<R.reachM))return R.text;
    return '';
  }
  updateGrenades(dt,request){
    const p=this.player;
    if(request&&this.grenades.ammo>0){const d=aimDirection(p.angle,p.pitch+.12);this.grenades.ammo--;
      this.grenades.active.push({id:`m01_grenade_${this.grenades.nextId++}`,...eyePosition(p),vx:d.x*12,vy:d.y*12+2,vz:d.z*12,fuse:4});}
    for(const g of this.grenades.active){g.fuse-=dt;g.vy-=9.81*dt;
      const step={x:g.vx*dt,y:g.vy*dt,z:g.vz*dt},length=Math.hypot(step.x,step.y,step.z);
      const hit=length>0?traceObstruction(this.world,g,{x:step.x/length,y:step.y/length,z:step.z/length},length):null;
      if(hit){g.vx*=-.3;g.vz*=-.3;g.vy=Math.abs(g.vy)*.3;}else{g.x+=step.x;g.y+=step.y;g.z+=step.z;}
      const floor=this.world.heightAt(g.x,g.z)+.08;if(g.y<floor){g.y=floor;g.vy=Math.abs(g.vy)*.3;g.vx*=.65;g.vz*=.65;}
      if(g.fuse<=0){
        const at={x:g.x,y:g.y,z:g.z},soundAt=this.clock+dist(at,p)/343;
        this.sectors.damage.push({id:g.id,...at,started:this.clock,soundAt,smokeSeconds:20});
        this.emit({type:'m01-blast',kind:'grenade',point:at,soundAt,aerial:false});
        for(const a of [p,...this.enemies]){
          const d=Math.hypot(a.x-g.x,a.y+.9-g.y,a.z-g.z);
          if(!a.alive||!a.active||d>=8||!this.world.lineOfSight({...g,space:'metres',eyeHeight:.04},a))continue;
          if(a===p){p.health=Math.max(0,p.health-(1-d/8)*100);p.alive=p.health>0;if(!p.alive)this.playerDown('grenade');}
          else this.damageGerman(a,(1-d/8)*100,g,'player');
        }
      }
    }
    this.grenades.active=this.grenades.active.filter(g=>g.fuse>0);
  }
  boundaries(dt){
    const out=!this.world.inside(this.player);
    this.timers.boundary=out?this.timers.boundary+dt:0;
    const grace=this.plan.layout.bounds.outOfBoundsGraceSec,countdown=Math.max(0,Math.ceil(grace-this.timers.boundary));
    if(out&&countdown!==this.timers.boundaryCountdown){this.timers.boundaryCountdown=countdown;this.message(`Você se afastou da linha norte. Volte em ${countdown} s.`);}
    if(!out)this.timers.boundaryCountdown=0;
    if(this.timers.boundary>=grace&&this.player.alive){this.player.alive=false;this.playerDown('bounds');}
  }
  playerDown(cause,by=null,weapon=null){this.failure=deathText(cause,by,weapon);this.emit({type:'player-down',cause,by,text:this.failure});}
  woundPlayer(r){
    const p=this.player,L=this.level;
    if(L.burstWoundCap!==null){
      const b=this.timers.burstWound,same=b&&b.by===r.by&&Math.abs(r.firedAt-b.at)<=1+1e-9;
      if(same&&b.n>=L.burstWoundCap)return;
      this.timers.burstWound=same?{by:b.by,at:b.at,n:b.n+1}:{by:r.by,at:r.firedAt,n:1};
    }
    const health=Math.max(0,p.health-L.woundDamage);
    p.health=health;p.alive=health>0;this.timers.lastHitAt=this.clock;this.emit({type:'player-hit'});
    if(!p.alive)this.playerDown('shot',r.by,r.weapon);
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- the wave
  /** The attack goes on: at a battle clock or when the player has reached the post (VII-a), or some seconds after a barrage has ended (VII-b, plan.waveTrigger). */
  waveDue(){
    const T=this.plan.waveTrigger;
    if(T.type==='barrageEnd'){const end=this.timers.barrage?.done[T.barrage];return Number.isFinite(end)&&this.clock>=end+T.afterSec;}
    return this.battleClock>=this.plan.waveAt||this.objectives[this.profile.arrivalObjective].state==='done';
  }
  updateWave(){
    if(this.flags[this.waveFlag]!=='pending'||this.scene)return;
    if(!this.waveDue())return;
    // The record of the fight: its start, the German dead, the LAST echelon's break and the end (brokenAt, repelledAt), and one record per echelon that has entered (`echs`).
    this.flags[this.waveFlag]='active';this.consume(this.profile.waveEvent);
    this.timers.wave={at:this.clock,casualties:0,brokenAt:null,repelledAt:null,closeCalled:false,ech:0,echs:[this.echelonRecord()],lullUntil:null};
    this.activate(this.profile.holdObjective);this.mission.phase=this.phase('ATTACK');
    for(const a of this.enemies)if(a.alive&&a.active){const S=this.plan.assault;a.deck.since=this.clock;a.deck.until=this.clock+between(a.ai,S.coverSec);a.cooldown=1.5+3*aiNext(a.ai);}
  }
  echelonRecord(){return {at:this.clock,casualties:0,brokenAt:null,closed:false,seen:false};}
  /**
   * CP-F (Captain's decision 2026-11-04, reversible): when an echelon breaks and another follows, the checkpoint the next echelon names in the data (`checkpoint`) is taken, once, at the end of the
   * tick: a death in that echelon returns to the pause, not to the arrival. Only when the player can live in it: alive, inside the bounds (a countdown running outside would end the restored
   * life at once), no card up. A save in the pause from before this checkpoint existed takes it on its next tick. The same envelope path as CP-E (the game stores sim.checkpoint on the event).
   * INC-2 (F4): the checkpoints of the act with a trigger of data (plan.triggers: echelonBroken, flag) are taken the same way, once, in the tick their trigger is true.
   */
  lullCheckpoint(){
    const W=this.timers.wave;if(this.scene)return;
    const id=W?this.plan.assault.echelons[W.ech+1]?.checkpoint:null;   // INC-3: an act with no assault (VII-c) has no wave, and its CP-K comes from a flag
    if(id&&W.echs[W.ech].brokenAt!==null&&!this.checkpointsReached.includes(id)&&this.player.alive&&!(this.timers.boundary>0))this.saveCheckpoint(id);
    for(const t of this.plan.triggers){
      if(this.checkpointsReached.includes(t.id)||!this.player.alive||this.timers.boundary>0)continue;
      if(t.type==='echelonBroken'?Number.isFinite(W?.echs[t.echelon]?.brokenAt):Boolean(this.flags[t.flag]))this.saveCheckpoint(t.id);
    }
  }
  man(a){return this.plan.assault.men.find(m=>m.id===a.id);}
  atNode(a,m){const n=m.path[a.deck.node];return Boolean(n)&&Math.hypot(a.x-n.x,a.z-n.z)<.06;}
  /** The approach assault: advance (bound to the next node), cover (kneel at a stop), hold (at the limit), fallback (back along the path), clear (gone). In echelons (stepEchelons). */
  stepGermans(dt){
    const W=this.timers.wave;
    if(!W){for(const a of this.enemies)if(a.alive&&a.active){a.crouched=true;a.facing=Math.PI/2;}return;}
    const S=this.plan.assault,alive=this.enemies.filter(a=>a.alive&&a.active);
    this.stepEchelons(W,S,alive);
    const moving=new Set(alive.filter(a=>a.deck.phase==='advance'&&this.man(a).role==='assault').map(a=>this.man(a).lane));
    for(const a of alive){
      const m=this.man(a),d=a.deck,suppressed=this.clock<a.suppressedUntil;
      if(suppressed&&d.phase!=='fallback')d.pinned+=dt;
      if(d.phase==='advance'){
        // Pinned on his way to a stop he goes down where he is (a man rounding his own earth to the next bound keeps running: it is a few steps).
        if(suppressed&&m.role==='assault'&&m.path[d.node].stop){d.phase='cover';d.until=a.suppressedUntil+between(a.ai,[.5,S.pinnedWaitMaxSec]);d.since=this.clock;a.crouched=true;continue;}
        const target=m.path[d.node];
        a.crouched=false;
        if(this.walk(a,target,S.rushSpeed,dt)){
          if(target.stop){d.phase=m.role==='overwatch'?'hold':'cover';d.since=this.clock;d.until=this.clock+between(a.ai,S.coverSec);a.crouched=true;a.facing=Math.PI/2;a.cooldown=Math.max(a.cooldown,S.fire.riseBeforeSec+.4);}
          else d.node++;
        }
        continue;
      }
      if(d.phase==='cover'||d.phase==='hold'){
        a.facing=Math.PI/2;
        this.germanFire(a,m,dt);
        if(m.role==='overwatch')continue;
        const lim=d.lim??m.limitStop,stop=m.stops.indexOf(d.node);
        if(this.clock>=d.until&&!suppressed&&this.clock-a.firedAt>=S.fire.holdAfterSec){
          if(!this.atNode(a,m)){d.phase='advance';d.since=this.clock;moving.add(m.lane);a.crouched=false;}   // pinned short of his stop: on to the same stop
          else if(d.node<lim&&!moving.has(m.lane)){d.node++;d.phase='advance';d.since=this.clock;moving.add(m.lane);a.crouched=false;}
          else if(d.node>=lim&&d.phase==='cover'){d.phase='hold';d.since=this.clock;d.until=this.clock+between(a.ai,S.holdSec);}
          else if(d.phase==='hold'&&d.node<lim){d.phase='cover';d.until=this.clock;}
        }
        if(stop===m.stops.length-1&&!W.closeCalled){W.closeCalled=true;this.say('close');}
        continue;
      }
      if(d.phase==='fallback'){
        const target=d.node>=0?m.path[Math.min(d.node,m.path.length-1)]:m.entry;
        if(this.walk(a,target,S.fallbackSpeed,dt)){
          d.since=this.clock;   // `since` is the last progress of his fall-back (set when he broke, and at every node he reaches): the stall below reads it
          if(d.node>=0)d.node--;
          else{d.phase='clear';a.active=false;}
        }
        else this.fallbackStall(a,S);
      }
    }
    if(W.brokenAt!==null&&W.repelledAt===null&&!this.enemies.some(a=>a.alive&&a.active)){
      W.repelledAt=this.clock;this.flags[this.waveFlag]='repelled';this.say('repelled');
      this.finish(this.profile.holdObjective);this.timers.endAt=this.clock+this.plan.act.endBeatSec;this.mission.phase=this.phase('REPELLED');
    }
    // The first echelon is seen when anybody of it is inside the field (it starts there); a later one two seconds after its first men step out of the trees.
    const R=W.echs[W.ech];
    if(!R.seen&&alive.some(a=>this.man(a).echelon===W.ech&&(W.ech===0?a.z>-1350:this.clock-a.deck.t0>=2))){
      R.seen=true;
      if(W.ech===0){this.say('wave_seen');this.timers.openFireAt=this.clock+2.5;}else this.say('echelon_seen');
    }
    if(this.timers.openFireAt&&this.clock>=this.timers.openFireAt){this.timers.openFireAt=null;this.say('open_fire');}
  }
  /**
   * Safety: a man in fallback who makes no progress (reaches no node) for `fallbackStallSec` is stuck on something, and a man who can never finish falling back would hold the lull
   * (and the end of the act) for ever. He is taken off the field the way a finished fall-back does it (phase `clear`, inactive: nobody draws, hits or counts him), but in the least
   * visible way: at once if no Pole and not the player has a line of sight to him; else he keeps trying until twice the stall time, and then goes anyway. No new saved state: the
   * progress clock is `deck.since`, which the fall-back rewrites at every node.
   */
  fallbackStall(a,S){
    const d=a.deck,idle=this.clock-d.since;
    if(idle<S.fallbackStallSec)return;
    if(idle<2*S.fallbackStallSec&&this.germanTargets(a,1e9).length)return;
    d.phase='clear';a.active=false;
  }
  /**
   * The echelons. The one on the field breaks on its casualties (its own men and the overwatch that falls while it is there), on the pinning of its assault, or on its clock;
   * its assault falls back, the overwatch stays on its nodes (it fires whenever it has a target and is not pinned, as ever: a line that pins it keeps the lull quiet), and only the
   * LAST echelon's break takes the overwatch with it. The lull runs from the moment the broken echelon's assault is off the field (fallen or gone); when it is over the next
   * echelon walks in from the entry line (enterEchelon, admit).
   */
  stepEchelons(W,S,alive){
    const k=W.ech,E=S.echelons[k],R=W.echs[k],last=k===S.echelons.length-1;
    const own=alive.filter(a=>{const m=this.man(a);return m.role==='assault'&&m.echelon===k;});
    if(R.brokenAt===null){
      const pinned=own.length?own.reduce((n,a)=>n+a.deck.pinned,0)/own.length:0;
      if(R.casualties>=E.breakOut||pinned>=E.breakPinnedSec||this.clock-R.at>=E.maxSec){
        R.brokenAt=this.clock;
        if(last)W.brokenAt=this.clock;
        this.flags[this.waveFlag]=last?'broken':'lull';this.say(last&&k>0?'final_break':'fallback');
        // Back along his own path: from the last node he actually reached (a man on his way to a node, or pinned short of it, turns back to the one before).
        for(const a of alive){const m=this.man(a);if(!last&&!(m.role==='assault'&&m.echelon===k))continue;
          const at=this.atNode(a,m);if(!at)a.deck.node--;a.deck.phase='fallback';a.deck.since=this.clock;a.crouched=false;}
      }
    }
    if(R.brokenAt===null&&!R.closed&&this.clock-R.at>=E.closeAfterSec&&R.casualties<E.breakOut-1){
      R.closed=true;for(const a of own)if(a.deck.lim===undefined)a.deck.lim=this.man(a).deepestStop;
    }
    if(R.brokenAt!==null&&!last&&W.lullUntil===null&&!own.length){
      W.lullUntil=this.clock+S.echelons[k+1].lullSec;
      this.say(alive.some(a=>a.weapon==='mg34')?'lull':'lull_quiet');   // the voice says what is true: a machine gun is still on the edge, or none is left
    }
    if(W.lullUntil!==null&&this.clock>=W.lullUntil)this.enterEchelon(W,k+1);
    else if(R.brokenAt===null)this.admit(W);
  }
  /** Echelon k walks in from the entry line (phase advance to its first stop, as the first echelon's men do after their cover); its overwatch, if it brings any, walks to its node. */
  enterEchelon(W,k){
    W.ech=k;W.lullUntil=null;W.echs.push(this.echelonRecord());this.flags[this.waveFlag]='active';this.admit(W);
  }
  /** The men of the echelon on the field whose delay has run out walk in from the entry line (a lane or a gun that follows the others by delaySec). Once the echelon has broken, nobody else enters. */
  admit(W){
    const R=W.echs[W.ech];
    for(const a of this.enemies){
      const m=this.man(a);
      if(m.echelon!==W.ech||a.active||!a.alive||a.deck.phase!=='advance'||this.clock<R.at+m.delaySec-1e-9)continue;
      a.active=true;a.crouched=false;a.facing=Math.PI/2;a.deck.since=this.clock;a.deck.t0=this.clock;a.cooldown=1.5+3*aiNext(a.ai);
    }
  }
  /** Straight walk to a point (the paths are built clear of every solid, m01-act-factories makeApproachPlan); true on arrival. */
  walk(a,target,speed,dt){
    const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz);
    if(d<.05){a.x=target.x;a.z=target.z;a.y=this.world.heightAt(a.x,a.z);return true;}
    const step=Math.min(d,speed*dt);a.facing=Math.atan2(dz,dx);
    this.world.move(a,dx/d*step,dz/d*step);
    return Math.hypot(target.x-a.x,target.z-a.z)<.05;
  }
  /** Who a German can shoot at: the player and the Poles he sees (eye to eye, the world's line of sight), within range. */
  germanTargets(a,range){
    const out=[],p=this.player;
    if(p.alive&&dist(a,p)<=range&&this.world.lineOfSight(a,p))out.push(p);
    for(const b of this.allies)if(b.alive&&b.active&&dist(a,b)<=range&&this.world.lineOfSight(a,b))out.push(b);
    return out;
  }
  germanFire(a,m,dt){
    const S=this.plan.assault,F=S.fire,mg=a.weapon==='mg34',suppressed=this.clock<a.suppressedUntil;
    // Suppressive fire (fire.suppress, the guns it names): a gun that saw a muzzle flash lately (its mark) keeps firing at the place when it has nothing in sight, and when it is pinned too.
    const Z=F.suppress&&a.weapon===F.suppress.weapon?F.suppress:null,mark=Z?this.flashMark(a,Z):null;
    a.cooldown-=dt;
    if(suppressed&&!mark){a.crouched=true;a.cooldown=Math.max(a.cooldown,a.suppressedUntil-this.clock+.6);return;}
    // Up from cover riseBeforeSec before the shot and holdAfterSec after it; down otherwise (pinned with a mark to fire at: down, firing blind over the cover).
    a.crouched=suppressed||!(a.cooldown<=F.riseBeforeSec||this.clock-a.firedAt<F.holdAfterSec);
    if(a.cooldown>0)return;
    const targets=suppressed?[]:this.germanTargets(a,F.rangeM);
    if(!targets.length){
      if(mark){this.areaBurst(a,mark,Z,suppressed);return;}
      a.cooldown=.8+.6*aiNext(a.ai);return;
    }
    const w=S.playerWeight[this.difficulty]??1,weights=targets.map(t=>t===this.player?w:1),sum=weights.reduce((n,x)=>n+x,0);
    let u=aiNext(a.ai)*sum,target=targets[0];for(let i=0;i<targets.length;i++){u-=weights[i];if(u<=0){target=targets[i];break;}}
    if(Z)a.ai.seen={x:target.x,y:target.y,z:target.z,at:this.clock,who:target.id};   // what he fires at he remembers
    const kind=target===this.player?'player':'squad',ae=kind==='player'?this.level.aimErrorScale:1,spec=mg?F.mg:F.rifle;
    const rounds=mg?F.mg.rounds:1,interval=mg?F.mg.interval:.1,origin=eyePosition(a),aim=aimPoint(target);
    const shared=[spec.bias[0]*ae*aiGauss(a.ai),spec.bias[1]*ae*aiGauss(a.ai)],cone=[spec.cone[0]*ae,spec.cone[1]*ae];
    for(let k=0;k<rounds;k++)this.enemyFire.rounds.push(makeRound({id:`np_round_${this.enemyFire.nextId++}`,by:a.id,weapon:a.weapon,kind,origin,aim,firedAt:this.clock+k*interval,
      bias:shared,cone,gauss:()=>aiGauss(a.ai),tracer:mg&&k===Math.min(1,rounds-1)}));
    a.shot=rounds*interval+.06;a.firedAt=this.clock;a.state='SUPPRESS';a.facing=angleOf(a,target);a.crouched=false;
    a.cooldown=pause(a.ai,m.role==='overwatch'?F.overwatchPauseSec:F.assaultPauseSec,2);
    this.emit({type:'enemy-fire',by:a.id,origin,rounds,interval,weapon:a.weapon,at:this.clock});
    if(mg&&this.clock-(this.timers.said.mg_fire??-1e9)>40)this.say('mg_fire');
  }
  /** Where this gun last saw a muzzle flash of a Pole or of the player (`ai.seen`), if that was no more than `memorySec` ago; else null. */
  flashMark(a,Z){const s=a.ai.seen;return s&&this.clock-s.at<=Z.memorySec?s:null;}
  /**
   * A Pole (or the player) has fired. Every German gun of `fire.suppress` within range that has a line to the flash remembers the place (`ai.seen`: the shooter's feet, when, who). The line is
   * a standing man's, eye to eye: the flash shows above the parapet whatever the posture of the man who made it. Decides nothing by itself: germanFire fires at the mark. No draw of any stream.
   */
  noteFlash(shooter){
    const F=this.plan.assault.fire,Z=F.suppress;if(!Z||!this.timers.wave)return;
    const from={...shooter,crouched:false};
    for(const g of this.enemies){
      if(!g.alive||!g.active||g.weapon!==Z.weapon||dist(g,shooter)>F.rangeM||!this.world.lineOfSight({...g,crouched:false},from))continue;
      g.ai.seen={x:shooter.x,y:shooter.y,z:shooter.z,at:this.clock,who:shooter.id};
    }
  }
  /**
   * Suppressive fire (GAMEPLAY_DRAMATIZATION): a short burst of real rounds, the model of every German round (makeRound now, traceRound when it lands, the level's table for the player), at
   * the place where the gun last saw a flash: the torso of a man standing there, the gun's usual dispersion. Nothing is aimed at a man and a round hits only what it crosses (mostly the
   * parapet, the earth, the air above it). Pinned, the gun fires blind from behind its cover, and its pause is `pinnedPauseFactor` times longer. Draws of the man's own stream only.
   */
  areaBurst(a,mark,Z,pinned){
    const spec=this.plan.assault.fire.mg,rounds=Z.rounds[0]+Math.floor(aiNext(a.ai)*(Z.rounds[1]-Z.rounds[0]+1)),interval=spec.interval;
    const origin=eyePosition({...a,crouched:false}),aim=aimPoint({x:mark.x,y:mark.y,z:mark.z,crouched:false}),shared=[spec.bias[0]*aiGauss(a.ai),spec.bias[1]*aiGauss(a.ai)];
    for(let k=0;k<rounds;k++)this.enemyFire.rounds.push(makeRound({id:`np_round_${this.enemyFire.nextId++}`,by:a.id,weapon:a.weapon,kind:'area',origin,aim,firedAt:this.clock+k*interval,
      bias:shared,cone:spec.cone,gauss:()=>aiGauss(a.ai),tracer:k===Math.min(1,rounds-1)}));
    a.shot=rounds*interval+.06;a.firedAt=this.clock;a.state='SUPPRESS';a.facing=angleOf(a,mark);a.crouched=pinned;
    a.cooldown=between(a.ai,Z.pauseSec)*(pinned?Z.pinnedPauseFactor:1);
    this.emit({type:'enemy-fire',by:a.id,origin,rounds,interval,weapon:a.weapon,at:this.clock,kind:'area'});
    if(this.clock-(this.timers.said.mg_fire??-1e9)>40)this.say('mg_fire');
  }
  /** German rounds land: the world, the player (wound by the level's table), a man of the line (wounded or killed), the named men (pinned), near misses (pinned). */
  landRounds(){
    if(!this.enemyFire.rounds.some(r=>r.arriveAt<=this.clock))return;
    const due=this.enemyFire.rounds.filter(r=>r.arriveAt<=this.clock);this.enemyFire.rounds=this.enemyFire.rounds.filter(r=>r.arriveAt>this.clock);
    const p=this.player,L=this.level;
    for(const r of due){
      const targets=[p,...this.allies.filter(b=>b.alive&&b.active&&!b.carriedBy)],hit=traceRound(this.world,r,targets),point=hit.point,near=[];
      let victim=hit.actor??null,material=hit.material??'earth';
      // Blind fire (kind 'area', fire.suppress.hitChance; 2026-11-04, step 0 of INC-2): the gun fired at a place, not at a man. A round of it that crosses a man of the line hurts him only with the chance of how
      // he stands (kneeling behind the parapet: low; risen to fire: higher); otherwise it ends in the earth beside him and pins him like any near miss. A pure function of the two ids (pairUnit): no draw of any stream.
      const H=r.kind==='area'?this.plan.assault.fire.suppress?.hitChance:undefined;
      if(H&&victim&&victim!==p&&!victim.essential&&pairUnit(victim.id,r.id)>=H[victim.crouched?'cover':'exposed']){victim=null;material='earth';}
      if(victim===p){
        const covered=Boolean(this.world.coverAt(p))&&p.crouched,chance=L.woundChance[covered?'cover':'exposed'];
        if(this.rng.next()<chance)this.woundPlayer(r);
      }else if(victim){
        if(victim.essential){const prev=victim.suppressedUntil;victim.suppressedUntil=Math.max(prev,this.clock+ESSENTIAL_PIN_SEC);recordSuppression(victim,prev,this.clock);recordHit(victim,this.clock,{x:r.ox,z:r.oz});}
        else{const h=victim.health,was=victim.alive;victim.health=Math.max(0,h-LINE_DAMAGE*hit.multiplier);victim.alive=victim.health>0;victim.state=victim.alive?(victim.state==='WOUNDED'?'WOUNDED':'HIT_REACTION'):'DOWN';
          recordDamage(victim,h,was,this.clock,{x:r.ox,z:r.oz});if(was&&!victim.alive)this.say('man_down');}
      }
      const pinSec=r.kind==='area'?this.plan.assault.fire.suppress?.pinSec??NEAR_PIN_SEC:NEAR_PIN_SEC;   // blind fire pins for `pinSec` (fire.suppress.pinSec), aimed fire for NEAR_PIN_SEC
      for(const b of this.allies){if(!b.alive||!b.active||b===victim)continue;
        if(closestApproach(r,hit.t,eyePosition(b))<=NEAR_MISS){const prev=b.suppressedUntil;b.suppressedUntil=Math.max(prev,this.clock+pinSec);recordSuppression(b,prev,this.clock);near.push(b.id);}}
      const approach=closestApproach(r,hit.t,eyePosition(p)),crack=approach<=6;
      if(crack&&approach<=2.5&&this.clock-this.timers.playerPinnedAt>6){this.timers.playerPinnedAt=this.clock;if(!p.crouched)this.say('player_pinned');}
      if(point)this.emit({type:'round-impact',kind:r.kind,by:r.by,point,material,crack,distance:dist(point,p),pass:impactPass(crack,approach),victim:victim&&victim!==p?victim.id:null,pinned:near});
    }
  }
  damageGerman(e,amount,source,by){
    const h=e.health,was=e.alive;e.health=Math.max(0,h-amount);e.alive=e.health>0;e.state=e.alive?'HIT_REACTION':'DOWN';
    recordDamage(e,h,was,this.clock,source);
    if(was&&!e.alive){
      // The fight's count, and the count of the echelon on the field: its own men (assault and its own overwatch) who fall before it breaks. The overwatch of an earlier echelon
      // falling during a later one does not break that one; with a single echelon this is every German, as it always was.
      const W=this.timers.wave;
      if(W){W.casualties++;if(W.echs[W.ech].brokenAt===null&&this.man(e).echelon===W.ech)W.echs[W.ech].casualties++;}
      if(by==='player')this.emit({type:'enemy_down_by_player',id:e.id,group:e.group,weapon:'kb_wz29',distance:dist(e,this.player),point:{x:e.x,y:e.y,z:e.z},at:this.clock});
      if(this.clock-(this.timers.said.enemy_down??-1e9)>18)this.say('enemy_down');
    }
  }
  /** Every living German within 3 m of the ray, short of what it struck, is suppressed 5 s (the rule of the player's rifle in the current act). */
  suppressAlong(origin,dir,hit,reach){
    const along=a=>Math.max(0,(a.x-origin.x)*dir.x+(a.y+1-origin.y)*dir.y+(a.z-origin.z)*dir.z),off=(a,d)=>Math.hypot(a.x-origin.x-dir.x*d,a.y+1-origin.y-dir.y*d,a.z-origin.z-dir.z*d);
    for(const a of this.enemies){if(!a.alive||!a.active)continue;const d=along(a);
      if(d>0&&d<reach&&off(a,d)<3&&(!hit||d<=hit.distance+3)){const prev=a.suppressedUntil;a.suppressedUntil=this.clock+PLAYER_SUPPRESS_SEC;recordSuppression(a,prev,this.clock);}}
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- the Poles
  stepSection(dt){
    if(this.scene&&!this.sceneDone.includes(this.profile.entryCard))return;
    if(this.plan.withdrawal)return;   // INC-3: in VII-c the section is moved by stepWithdrawal (up to the parapet with the order, back with the rear guard)
    const z=this.actor('marek_zielinski');
    if(z.alive&&dist(z,z.post)>.05)this.walk(z,z.post,4,dt);
    else if(z.alive)z.atPost=true;
    const q=squadStep(this.plan.squad,this,{stageSlots:this.plan.stageSlots,carrier:null,east:0,say:node=>{if(node==='order')this.say('arrive_card_end');}});
    for(const id of this.plan.squad.teams.flat()){
      const a=this.actor(id);if(!a.alive)continue;
      const k=this.squadPostOf(q,id),slot=squadSlotOf(this.plan.squad,this.plan.stageSlots,id,k);
      if(squadMovingIn(this.plan.squad,q,a)||dist(a,slot)>.05)this.walk(a,slot,this.plan.squad.pace,dt);
      else a.atPost=k>0;
    }
    // At their posts the section fights like the line (Zieliński and Pawlak: rifles; Kowal: stepKowal).
    for(const a of [z,this.actor('staszek_pawlak')])if(a.alive&&a.atPost&&this.timers.wave)this.lineShooter(a,dt);
    if(z.alive&&z.atPost&&!this.timers.wave)z.crouched=true;
  }
  squadPostOf(q,id,plan=this.plan.squad){const t=plan.teams.findIndex(team=>team.includes(id));let k=0;for(let i=0;i<Math.min(q.move+(q.moving?1:0),plan.moves.length);i++)if(plan.moves[i].team===t)k=plan.moves[i].to;return k;}
  stepLine(dt){if(!this.timers.wave)return;for(const id of this.plan.line.men){const a=this.actor(id);if(a.alive&&a.active&&a.state!=='WOUNDED'&&!a.carriedBy)this.lineShooter(a,dt);}}
  /** A rifleman of the firing line (the rearguard's fire model, m01-act-factories makeLinePlan): kneel, rise riseBeforeSec before the shot, one aimed round, hold, kneel. */
  lineShooter(a,dt){
    const F=this.plan.line.fire;a.facing=-Math.PI/2;
    a.cooldown-=dt;
    if(this.clock<a.suppressedUntil){a.crouched=true;a.cooldown=Math.max(a.cooldown,a.suppressedUntil-this.clock+1.2);return;}
    a.crouched=!(a.cooldown<=F.riseBeforeSec||this.clock-a.firedAt<F.holdAfterSec);
    if(a.cooldown>0)return;
    const target=this.polishTarget(a,F.rangeM);
    if(!target){a.cooldown=.9+.8*aiNext(a.ai);return;}
    const r=this.alliedRound(a,target,F.sigmaMil);
    if(!r.fired){a.cooldown=.7;return;}
    a.cooldown=pause(a.ai,F.pauseSec,2.5);
    this.emit({type:'npc-shot',by:a.id,weapon:'kb_wz29',point:eyePosition(a),rounds:1,end:r.end,hit:r.hit});
  }
  /** The German a Pole fires at: the one he sees who fired last (his flash is what a man in the trench sees), else the nearest he sees. Deterministic. */
  polishTarget(a,range){
    let best=null,score=-Infinity;
    for(const e of this.enemies){if(!e.alive||!e.active||dist(a,e)>range||!this.world.lineOfSight(a,e))continue;
      const s=(this.clock-e.firedAt<6?1000-(this.clock-e.firedAt)*10:0)-dist(a,e);if(s>score){score=s;best=e;}}
    return best;
  }
  /** One aimed round of a Pole (the model of m01-simulation alliedRound): a ray from his eye to the German's torso with milliradian dispersion, traced at once. */
  alliedRound(a,t,sigmaMil){
    const origin=eyePosition(a),aim=aimPoint(t),dx=aim.x-origin.x,dy=aim.y-origin.y,dz=aim.z-origin.z,h=Math.hypot(dx,dz);
    const aimed=Math.atan2(dz,dx),angle=aimed+aiGauss(a.ai)*sigmaMil[0]/1000,pitch=Math.atan2(dy,h)+aiGauss(a.ai)*sigmaMil[1]/1000,dir=aimDirection(angle,pitch);
    const friends=[this.player,...this.allies].filter(b=>b!==a&&b.alive&&b.active);
    if(traceShot(this.world,origin,dir,friends,Math.hypot(h,dy)+1)?.kind==='actor')return {fired:false,hit:false};
    const R=Math.hypot(h,dy)+40,hit=traceShot(this.world,origin,dir,this.actors.filter(b=>b!==a),R);
    let struck=false;
    if(hit?.actor?.team==='enemy'){this.damageGerman(hit.actor,this.weapon.profile.damage*hit.multiplier,a,a.id);struck=true;}
    this.suppressAlong(origin,dir,hit,R);
    a.shot=.12;a.firedAt=this.clock;a.facing=aimed;this.noteFlash(a);
    return {fired:true,hit:struck,end:hit?.point?{x:hit.point.x,y:hit.point.y,z:hit.point.z}:{x:origin.x+dir.x*R,y:origin.y+dir.y*R,z:origin.z+dir.z*R}};
  }
  /** Kowal's rkm wz.28: short bursts (3-5 rounds of his 20) at the German he sees, a real magazine change. */
  stepKowal(dt){
    const k=this.actor('szymon_kowal');if(!k.alive||!k.atPost||!this.timers.wave)return;
    k.facing=-Math.PI/2;
    if(k.reload){if(this.clock-k.reload.startedAt>=k.reload.duration){delete k.reload;k.rounds=RKM.mag;}else{k.crouched=true;return;}}
    k.cooldown-=dt;
    if(this.clock<k.suppressedUntil){k.crouched=true;k.cooldown=Math.max(k.cooldown,k.suppressedUntil-this.clock+1);return;}
    k.crouched=!(k.cooldown<=.8||this.clock-k.firedAt<1.4);
    if(k.cooldown>0)return;
    const t=this.polishTarget(k,450);if(!t){k.cooldown=1;return;}
    const n=Math.min(k.rounds,RKM.burst[0]+Math.floor(aiNext(k.ai)*(RKM.burst[1]-RKM.burst[0]+1)));let hit=false,end=null;
    for(let i=0;i<n;i++){const r=this.alliedRound(k,t,RKM.sigmaMil);if(!r.fired)break;hit||=r.hit;end=r.end;}
    k.rounds-=n;k.shot=Math.max(.25,n*.11);k.cooldown=pause(k.ai,RKM.pauseSec,2);
    if(end)this.emit({type:'npc-shot',by:k.id,weapon:'rkm_wz28',point:eyePosition(k),rounds:n,end,hit});
    if(k.rounds<=0){k.reload={startedAt:this.clock,duration:RKM.reloadSec,mode:'magazine'};this.say('kowal_reload');}
  }
  ckmMuzzle(){const r=this.plan.ckm.root,y=this.plan.ckm.yawDeg*Math.PI/180;return {x:r[0]+Math.sin(y)*.83,y:r[1]+.64,z:r[2]-Math.cos(y)*.83};}
  /** The ckm wz.30: the machine of the current act (idle/aim/fire_burst/feed) with its burst plan of real rounds, answering the German it sees fire. */
  stepCKM(){
    const g=this.actor('ckm_gunner'),C=this.plan.ckm.fire;if(!g?.alive||!this.timers.wave)return;
    const f=g.ckmFire,p=g.ckm,clock=this.clock;
    const to=(phase,at)=>{g.ckm={phase,startedAt:at,visible:true,root:p.root,yaw:p.yaw,...(g.ckm.burstPlan?{burstPlan:g.ckm.burstPlan}:{})};};
    if(p.phase==='fire_burst'){if(p.burstPlan)this.emitCKMRounds(g);if(clock-p.startedAt<C.burstSec)return;to('aim',p.startedAt+C.burstSec);}
    else if(p.phase==='feed'){if(clock-p.startedAt<C.feedSec)return;f.belt=C.belt;to('aim',p.startedAt+C.feedSec);}
    if(f.belt<C.burstRounds){to('feed',clock);this.say('ckm_feed');return;}
    if(clock<f.nextAt||g.ckm.burstPlan||clock<g.suppressedUntil)return;
    const target=this.ckmTarget();
    if(!target){f.nextAt=clock+.5;if(g.ckm.phase!=='idle'&&!(clock<f.engagedUntil))to('idle',clock);return;}
    if(!(clock<f.engagedUntil)){to('aim',clock);f.engagedUntil=clock+C.holdSec;f.nextAt=clock+C.aimSec;return;}
    const o=this.ckmMuzzle(),aim=aimPoint(target),nx=()=>{f.rng=(Math.imul(1664525,f.rng)+1013904223)>>>0;return f.rng/4294967296;};
    const gauss=()=>{let u=0;while(u<=1e-12)u=nx();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*nx());};
    const shared=[C.bias[0]*gauss(),C.bias[1]*gauss()],plan=[];
    for(let k=0;k<C.burstRounds;k++)plan.push(makeRound({id:`np_ckm_${f.bursts}_${k}`,by:g.id,weapon:'ckm_wz30',kind:'ally',origin:o,aim,firedAt:clock+k*C.interval,bias:shared,cone:C.cone,gauss}));
    g.ckm={phase:'fire_burst',startedAt:clock,visible:true,root:p.root,yaw:p.yaw,burstPlan:{policy:'live',startedAt:clock,rounds:C.burstRounds,interval:C.interval,emitted:0,landed:0,target:target.id,plan}};
    this.noteFlash(g);f.bursts++;f.engagedUntil=clock+C.holdSec;f.nextAt=clock+C.burstSec+C.cooldown[0]+(C.cooldown[1]-C.cooldown[0])*nx();
    this.emitCKMRounds(g);
  }
  ckmTarget(){
    const o=this.ckmMuzzle(),probe={space:'metres',x:o.x,y:o.y,z:o.z,eyeHeight:0},C=this.plan.ckm.fire;
    // As the current act's gun: it answers a flash (a German who fired within engageSec); a German closing within closeM is swept whether he fired or not.
    const seen=this.enemies.filter(a=>a.alive&&a.active&&dist(a,o)<=C.rangeM&&(this.clock-a.firedAt<C.engageSec||dist(a,o)<=C.closeM)).sort((a,b)=>b.firedAt-a.firedAt||dist(a,o)-dist(b,o));
    for(const a of seen)if(this.world.lineOfSight(probe,{space:'metres',x:a.x,y:a.y,z:a.z,crouched:a.crouched}))return a;
    return null;
  }
  emitCKMRounds(g){
    const b=g.ckm.burstPlan,f=g.ckmFire;
    while(b.emitted<b.rounds&&b.plan[b.emitted].firedAt<=this.clock+1e-9){
      const r=b.plan[b.emitted++];f.belt=Math.max(0,f.belt-1);
      if(b.emitted===1)this.emit({type:'ally-fire',by:g.id,weapon:'ckm_wz30',origin:{x:r.ox,y:r.oy,z:r.oz},rounds:b.rounds,interval:b.interval,at:r.firedAt});
    }
  }
  landCKMRounds(){
    const g=this.actor('ckm_gunner'),b=g?.ckm?.burstPlan;if(!b)return;
    const C=this.plan.ckm.fire;
    while(b.landed<b.emitted&&b.plan[b.landed].arriveAt<=this.clock){
      const r=b.plan[b.landed++],hit=traceRound(this.world,r,this.enemies.filter(a=>a.alive&&a.active));
      if(hit.actor)this.damageGerman(hit.actor,C.damage*hit.multiplier,{x:r.ox,z:r.oz},g.id);
      for(const a of this.enemies){if(!a.alive||!a.active||a===hit.actor)continue;
        if(closestApproach(r,hit.t,eyePosition(a))<=NEAR_MISS){const prev=a.suppressedUntil;a.suppressedUntil=Math.max(prev,this.clock+C.suppressSec);recordSuppression(a,prev,this.clock);}}
      if(hit.point)this.emit({type:'round-impact',kind:'ally',by:g.id,point:hit.point,material:hit.material??'earth',crack:false,distance:dist(hit.point,this.player),pass:'none',victim:hit.actor?.id??null,pinned:[]});
    }
    if(b.landed>=b.rounds)delete g.ckm.burstPlan;
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- the barrages and the stretcher-bearers (INC-2)
  /**
   * The artillery of the act (plan.barrages, m01-shell-blast.js). A barrage begins when its `from` is met (an objective done, or some seconds after an echelon broke). Each impact is LAUNCHED `warnSec` before it
   * falls (the whistle: a `shell-incoming` event with the point), at a point drawn from the barrage's own stream in its band and at least PLANNED_IMPACT_M from the player; it LANDS (landShell): a crater in the
   * damage record, the `m01-blast` event of kind shell, the Poles near it hurt by shellOutcome (the cast, the ckm crew and the bearers only shaken), the player only stunned and never within SAFE_IMPACT_M of a
   * shell. Draws only from the barrage's stream (timers.barrage.run.rng), never from the simulation's: GAMEPLAY_DRAMATIZATION, no calibre, no battery, no count on screen.
   */
  stepBarrage(){
    const B=this.plan.barrages;if(!B)return;
    const R=this.timers.barrage;
    if(!R.run)for(const b of B.barrages)if(!Object.hasOwn(R.done,b.id)&&this.barrageDue(b)){this.startBarrage(b,B.barrages.indexOf(b));break;}
    const run=R.run;if(!run)return;
    const b=B.byId[run.id],lastLaunch=run.startedAt+b.durationSec-b.warnSec;
    while(run.k<b.impacts&&this.clock>=run.nextLaunchAt-1e-9&&run.nextLaunchAt<=lastLaunch+1e-9)this.launchShell(run,b);
    for(const s of run.shells.filter(x=>x.landAt<=this.clock+1e-9))this.landShell(run,b,s);
    run.shells=run.shells.filter(x=>x.landAt>this.clock+1e-9);
    if(!run.shells.length&&(run.k>=b.impacts||run.nextLaunchAt>lastLaunch+1e-9))this.endBarrage(b);
  }
  barrageDue(b){
    const f=b.from;
    if(typeof f==='string')return this.objectives[f].state==='done';
    const E=this.timers.wave?.echs[f.echelonBroken];
    return Boolean(E)&&Number.isFinite(E.brokenAt)&&this.clock>=E.brokenAt+f.afterSec-1e-9;
  }
  startBarrage(b,index){
    this.timers.barrage.run={id:b.id,startedAt:this.clock,rng:barrageSeed(this.seed,index),k:0,nextLaunchAt:this.clock,shells:[]};
    if(this.profile.coverObjective)this.objectives[this.profile.coverObjective]={state:'active',progress:0};
    this.mission.phase=this.phase('BARRAGE');
    if(b.callout)this.say(b.callout);
  }
  /** One impact is on its way: where it will fall is decided now (the scripted casualty of the barrage, else a draw in the band away from the player), and the whistle begins. */
  launchShell(run,b){
    const n=run.k++,next=()=>barrageNext(run),P=this.player,c=b.casualty;
    let at=null;
    if(c&&c.impact===n){const man=this.actor(c.near);if(man.alive&&man.active&&man.state!=='WOUNDED'&&!man.carriedBy){const cand={x:man.x+c.offsetM[0],z:man.z+c.offsetM[1]};if(dist(cand,P)>=PLANNED_IMPACT_M)at=cand;}}
    if(!at)at=pickShellPoint(next,b.band,P);
    run.nextLaunchAt=this.clock+b.intervalSec[0]+(b.intervalSec[1]-b.intervalSec[0])*next();
    run.shells.push({n,x:at.x,z:at.z,launchedAt:this.clock,landAt:this.clock+b.warnSec});
    this.emit({type:'shell-incoming',point:{x:at.x,y:this.world.heightAt(at.x,at.z),z:at.z},warnSec:b.warnSec,at:this.clock});
  }
  /**
   * A shell lands. Its centre is the planned point unless the player has come within SAFE_IMPACT_M of it (landingPoint). Every living, present, uncarried Pole within reach: the distance to his torso, whether the blast sees that
   * torso (the world's line of sight from the centre, so the parapet shelters a man kneeling behind it), how he lies and a hash of the (man, crater) pair give the outcome (shellOutcome): killed, wounded (WOUNDED, health
   * down but at least 1) or shaken (suppressedUntil). The player is never hurt: stunned by the nearest ones, less behind cover or crouching (the strongest effect wins). The Germans are not touched (it is their artillery).
   */
  landShell(run,b,shell){
    const SB=SHELL_SPECS[b.spec],P=this.player,clock=this.clock,L=landingPoint(shell,P);
    const at={x:L.x,y:this.world.heightAt(L.x,L.z),z:L.z},id=`np_shell_crater_${run.id}_${shell.n}`;
    const source=sightPoint({x:at.x,y:at.y+SB.sourceHeight,z:at.z}),casualties={killed:[],wounded:[],suppressed:[]};
    for(const a of this.allies){
      if(!a.alive||!a.active||a.carriedBy||Math.abs(a.x-at.x)>SHELL_REACH_M||Math.abs(a.z-at.z)>SHELL_REACH_M)continue;
      const target=blastTarget(a),distance=Math.hypot(a.x-at.x,target.y-source.y,a.z-at.z);if(distance>SHELL_REACH_M)continue;
      const r=shellOutcome({distance,covered:!this.world.lineOfSight(source,sightPoint(target)),posture:blastPosture(a),protectedBy:shellProtection(a),u:pairUnit(a.id,id),spec:SB});
      if(r.outcome==='none')continue;
      const health=a.health,wasAlive=a.alive;
      if(r.outcome==='kill'){a.health=0;a.alive=false;a.state='DOWN';a.crouched=false;recordDamage(a,health,wasAlive,clock,at);casualties.killed.push(a.id);}
      else if(r.outcome==='wound'){a.health=Math.max(1,a.health-r.healthLoss);a.crouched=false;a.state='WOUNDED';recordDamage(a,health,wasAlive,clock,at);casualties.wounded.push(a.id);}
      else{const prev=a.suppressedUntil;a.suppressedUntil=Math.max(prev,clock+r.suppressSec);recordSuppression(a,prev,clock);if(a.suppressedUntil>prev)casualties.suppressed.push(a.id);}
    }
    const body=blastTarget(P);let peak=0;
    if(P.alive&&concussionPeak({distance:Math.hypot(P.x-at.x,body.y-source.y,P.z-at.z)})>0)
      peak=concussionPeak({distance:Math.hypot(P.x-at.x,body.y-source.y,P.z-at.z),covered:!this.world.lineOfSight(source,sightPoint(body)),crouched:Boolean(P.crouched)});
    const merged=mergeConcussion(P,clock,peak);if(merged)Object.assign(P,merged);
    const soundAt=clock+dist(at,P)/343;
    this.sectors.damage.push({id,x:at.x,y:at.y,z:at.z,started:clock,soundAt,smokeSeconds:30,concussion:peak});
    this.emit({type:'m01-blast',kind:'shell',point:{...at},soundAt,aerial:false,concussion:peak,effects:casualties});
    if(casualties.killed.length)this.say('man_down');
  }
  endBarrage(b){
    const R=this.timers.barrage;R.done[b.id]=this.clock;R.run=null;
    if(this.profile.coverObjective)this.finish(this.profile.coverObjective);
    this.activate(this.profile.holdObjective);
    this.mission.phase=this.timers.wave?this.phase('ATTACK'):this.phase('AFTER');
    this.say('barrage_over');
  }
  /**
   * The stretcher-bearers (plan.medics; NPC only: the player never carries anyone). When a man of the line is WOUNDED (a shell's casualty), the two bearers come on at the south edge and run to him, the first lifts
   * him onto his shoulder (the carriedBy of the bearers of act 1: the renderer's existing carry), and both walk south to the exit and leave the field (inactive: nobody draws or hits them). At most `maxCasualties` per act.
   */
  stepMedics(dt){
    const M=this.plan.medics;if(!M)return;
    const R=this.timers.medics,[m0,m1]=M.ids.map(id=>this.actor(id));
    if(R.state==='idle'){
      if(R.handled>=M.maxCasualties)return;
      const patient=this.plan.line.men.map(id=>this.actor(id)).find(a=>a.alive&&a.active&&a.state==='WOUNDED'&&!a.carriedBy);
      if(!patient)return;
      R.state='toPatient';R.patient=patient.id;R.since=this.clock;
      [m0,m1].forEach((m,i)=>{m.x=M.from[0]+i*1.2;m.z=M.from[1];m.y=this.world.heightAt(m.x,m.z);m.active=true;m.crouched=false;});   // they come on at the south edge, side by side (off the field they are nowhere)
      this.say('medic_call');return;
    }
    const patient=this.actor(R.patient);
    if(R.state==='toPatient'){
      const spots=[{x:patient.x-.8,z:patient.z+.9},{x:patient.x+.8,z:patient.z+.9}];   // south of him (the parapet is on his north), each on the side he starts on: the first bearer starts west of the second, so their paths never cross
      [m0,m1].forEach((m,i)=>{this.walk(m,spots[i],M.runPace,dt);m.crouched=false;});
      if(!patient.alive){R.state='carry';R.since=this.clock;return;}   // he died before they came: they go back
      if([m0,m1].every(m=>dist(m,patient)<=M.pickupM)){patient.carriedBy=m0.id;patient.facing=m0.facing+Math.PI/2;R.state='carry';R.since=this.clock;}
      return;
    }
    // carry: both go to the exit; the patient (if he is carried) rides on the first one's shoulder (act 1's convention)
    const arrived=this.walk(m0,{x:M.exit[0],z:M.exit[1]},M.pace,dt);
    this.walk(m1,{x:m0.x+1,z:m0.z+.3},M.pace*1.15,dt);
    if(patient.carriedBy===m0.id){patient.facing=m0.facing+Math.PI/2;patient.x=m0.x-Math.cos(m0.facing)*.25;patient.z=m0.z-Math.sin(m0.facing)*.25;patient.y=m0.y+1.15;}
    if(arrived){
      if(patient.carriedBy===m0.id){patient.carriedBy=null;patient.active=false;}
      m0.active=false;m1.active=false;R.handled++;R.state='idle';R.patient=null;R.since=this.clock;
    }
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- the withdrawal (INC-3)
  /**
   * The withdrawal of Act VII-c (plan.withdrawal, m01-withdrawal.js). Nothing happens under the cards. When the entry card has ended the courier walks in from the SW corner of the slice to the command post
   * (stepMessenger); on his arrival the order is given (the flag, the event, two lines) and from that moment the section goes up to the parapet (plan.squad, `east` = the order) while the line and the ckm crew leave by bounds
   * (plan.withdrawal.line: three teams, two bounds each; a bound ends when its team has arrived or after stallSec, and the next team is on its way at once, as in the squad of the current act). A man who reaches the
   * exit band leaves the field (inactive). When the last of them is out (`lineOut`, the flag that takes CP-K) and the section stands at the parapet, the rear guard leaves the same way (plan.withdrawal.rear,
   * `east` = the line out), Zieliński last. The act ends when the rear guard is out and the player stands in the band (`exited`): the end beat, the end card. No stream is drawn anywhere here: every move is a function of
   * the record and the plan, so a restore continues exactly. GAMEPLAY_DRAMATIZATION: the sources give the order and the withdrawal at dusk (T03), not who brought it, the way, the bounds, nor any contact.
   */
  stepWithdrawal(dt){
    const W=this.plan.withdrawal;if(!W||this.scene)return;
    const R=this.timers.withdrawal,F=name=>`${this.profile.flagPrefix}.${name}`;
    this.stepMessenger(W,R,dt);
    if(R.orderAt===null)return;
    if(R.rearGoAt===null)this.driveSquad(dt,this.plan.squad,'squad',this.plan.stageSlots,R.orderAt,{});   // up to the parapet, until the rear guard leaves from it
    this.driveSquad(dt,W.line,'line',W.lineStage,R.orderAt,{line_go:'line_go'});
    this.retire(W.line,'line',W.lineStage,W.ids.line);
    if(R.lineOutAt===null&&W.ids.line.every(id=>R.out.includes(id))){
      R.lineOutAt=this.clock;this.flags[F('lineOut')]=true;this.finish(this.profile.arrivalObjective);this.activate(this.profile.holdObjective);this.mission.phase=this.phase('REAR');this.say('line_out');
    }
    if(R.lineOutAt!==null&&R.rearGoAt===null&&this.sectionAtParapet())R.rearGoAt=this.clock;
    if(R.rearGoAt!==null){
      this.driveSquad(dt,W.rear,'rear',W.rearStage,R.lineOutAt,{});
      this.retire(W.rear,'rear',W.rearStage,W.ids.rear);
      if(R.rearOutAt===null&&W.ids.rear.every(id=>R.out.includes(id)))R.rearOutAt=this.clock;
    }
    const p=this.player,centre=this.plan.points.exit_centre;
    if(R.exitedAt===null&&R.rearOutAt!==null&&p.alive&&inBand(W.exit,p)){
      R.exitedAt=this.clock;this.flags[F('exited')]=true;this.finish(this.profile.holdObjective);this.timers.endAt=this.clock+this.plan.act.endBeatSec;this.mission.phase=this.phase('EXIT');this.say('exit');
    }
    if(R.rearGoAt!==null&&R.exitedAt===null&&this.clock-R.rearGoAt>=W.lag.afterSec){   // far behind the rear guard (or the band, when it is out): Pawlak calls him; the line has a cooldown, nothing fails
      const field=W.ids.rear.map(id=>this.actor(id)).filter(a=>a.active),behind=dist(centre,p)-(field.length?Math.max(...field.map(a=>dist(centre,a))):0);   // how far behind the last man of the rear guard he is (the band itself, when they are out)
      if(behind>W.lag.distanceM)this.say('lag');
    }
  }
  /** The courier: off the field until the entry card has ended, then walking in to the command post at his pace; on arrival the order (flag, event, the two lines), a few seconds of speaking, and back the way he came. */
  stepMessenger(W,R,dt){
    const M=W.messenger,m=this.actor(M.id),to={x:M.to[0],z:M.to[1]},from={x:M.from[0],z:M.from[1]};
    if(R.messenger==='idle'){R.messenger='walking';R.since=this.clock;m.active=true;m.crouched=false;m.y=this.world.heightAt(m.x,m.z);}
    if(R.messenger==='walking'){
      if(!this.walk(m,to,M.pace,dt))return;
      R.messenger='speaking';R.since=R.orderAt=this.clock;this.flags[`${this.profile.flagPrefix}.order`]=true;this.consume(this.profile.waveEvent);
      this.mission.phase=this.phase('ORDER');this.say('order_given');this.say('order_section');
    }
    if(R.messenger==='speaking'){
      const z=this.actor('marek_zielinski');m.facing=angleOf(m,z);z.facing=angleOf(z,m);
      if(this.clock-R.since<M.speakSec)return;
      R.messenger='leaving';R.since=this.clock;
    }
    if(R.messenger==='leaving'&&this.walk(m,from,M.pace,dt)){R.messenger='gone';R.since=this.clock;m.active=false;}
  }
  /**
   * One squad plan of the withdrawal (the section's own, the line's, the rear guard's): the generic squad step over its record (sim.timers[key]), then every man who is still on the field walks to the slot of his team's
   * current post (a team whose bound has ended on stallSec keeps walking to its slot while the next team starts), and a man held at a post after the first kneels facing north. The crew of the ckm, once on its way, is on its
   * `retreat` phase (the renderer draws the gun in its abandoned pose and the crew walking). `calls`: which of the plan's calls say a line of the act.
   */
  driveSquad(dt,plan,key,stage,east,calls){
    const q=squadStep(plan,this,{stageSlots:stage,carrier:null,east,say:node=>{if(calls[node])this.say(calls[node]);}},key);
    for(const id of plan.teams.flat()){
      const a=this.actor(id);if(!a.alive||!a.active)continue;
      const k=this.squadPostOf(q,id,plan),slot=squadSlotOf(plan,stage,id,k);
      if(squadMovingIn(plan,q,a)||dist(a,slot)>.05){
        a.crouched=false;a.atPost=false;this.walk(a,slot,plan.pace,dt);
        if(k>0&&a.ckm&&a.ckm.phase!=='retreat')a.ckm={...a.ckm,phase:'retreat',startedAt:this.clock};
      }else if(k>0){a.crouched=true;a.facing=-Math.PI/2;a.atPost=true;}
    }
    return q;
  }
  /** The men of a plan who have reached their slot at the last post (the exit band) leave the field at once; a man stuck on something for outGraceSec after the plan's last bound is taken off the field in his slot. */
  retire(plan,key,stage,ids){
    const R=this.timers.withdrawal,q=this.timers[key],last=plan.posts.length-1;
    const stuck=q.move>=plan.moves.length&&!q.moving&&this.clock-q.since>=this.plan.withdrawal.outGraceSec;
    for(const id of ids){
      if(R.out.includes(id))continue;
      const a=this.actor(id),slot=squadSlotOf(plan,stage,id,last);
      if(stuck||(this.squadPostOf(q,id,plan)===last&&dist(a,slot)<=plan.arriveM)){
        if(stuck){a.x=slot.x;a.z=slot.z;a.y=this.world.heightAt(slot.x,slot.z);}
        a.active=false;a.crouched=false;a.atPost=false;R.out.push(id);
      }
    }
  }
  /** The section stands at the parapet: the up plan has finished and every man is at his slot. */
  sectionAtParapet(){
    const P=this.plan,q=this.timers.squad,last=P.squad.posts.length-1;
    if(q.move<P.squad.moves.length||q.moving)return false;
    return P.squad.teams.flat().every(id=>{const a=this.actor(id);return !a.alive||dist(a,squadSlotOf(P.squad,P.stageSlots,id,last))<=P.squad.arriveM;});
  }
  /** The status line of the withdrawal, as the HUD shows it under the objective: no number, no hour. */
  withdrawalStatus(){
    const R=this.timers.withdrawal,L=this.profile.statusLabel;
    if(R.orderAt===null||R.exitedAt!==null)return '';
    return R.lineOutAt===null?`${L} · a linha sai por lanços`:`${L} · a secção recua por lanços`;
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- objectives, voices
  updateObjectives(){
    const p=this.player,A=this.profile,post=this.plan.points[A.marker],reach=this.plan.act.objectives.find(o=>o.id===A.arrivalObjective);
    if(!this.plan.withdrawal&&this.active(A.arrivalObjective)&&Math.hypot(p.x-post.x,p.z-post.z)<reach.reachM&&(!A.arrivalNeedsReserve||this.weapon.reserve>=this.plan.act.resupply.reserveTo))this.finish(A.arrivalObjective);   // VII-c's first objective closes with the line's exit, not at the marker
    if(this.timers.endAt!==null&&this.clock>=this.timers.endAt&&!this.scene&&!this.sceneDone.includes(A.endCard)){this.timers.endAt=null;this.startCard('end');}
    const current=this.plan.act.objectives.find(o=>this.active(o.id));
    this.mission.text=current?.text??(this.objectives[A.holdObjective].state==='done'?A.repelledText:'');
    const W=this.timers.wave;
    this.mission.status=this.plan.withdrawal?this.withdrawalStatus():this.timers.barrage?.run?'Fogo de artilharia · abrigue-se atrás do parapeito':W&&W.repelledAt===null?this.fightStatus(W):'';
  }
  /** The status line of the fight, as the HUD shows it: the echelon on the field (the first one's wording is the original), its men falling back, or the lull between two echelons. */
  fightStatus(W){
    const field=this.enemies.filter(a=>a.alive&&a.active).length,R=W.echs[W.ech],more=W.ech<this.plan.assault.echelons.length-1;
    const fallen=`${W.casualties} ${W.casualties===1?'caído':'caídos'}`;
    const L=this.profile.statusLabel;
    if(R.brokenAt!==null&&more)return W.lullUntil===null?`${L} · vaga a recuar · ${field} no campo · ${fallen}`:
      `${L} · pausa · ${field?`${field} ${field===1?'atirador':'atiradores'} na orla`:'campo livre'} · ${fallen}`;
    return `${L} · ${W.ech&&this.profile.ordinals?`${W.ech+1}.ª vaga · `:''}${field} ${field===1?'atacante':'atacantes'} no campo · ${fallen}`;
  }
  say(on){
    const c=this.plan.act.callouts.find(x=>x.on===on);if(!c)return false;
    const last=this.timers.said[on]??-1e9;if(this.clock-last<c.cooldownSec)return false;
    const speaker=this.actor(c.speaker);if(speaker&&!speaker.alive)return false;
    this.timers.said[on]=this.clock;
    if(this.dialogueQueue.length>=2)this.dialogueQueue.shift();
    this.dialogueQueue.push({id:c.id,speaker:this.plan.act.speakers[c.speaker]??c.speaker,text:c.text,duration:Math.min(5,2.2+c.text.length*.04),priority:2});
    return true;
  }
  advanceSubtitle(){
    if(this.subtitle&&this.clock>=this.subtitle.until)this.subtitle=null;
    if(!this.subtitle&&this.dialogueQueue.length){this.subtitle=this.dialogueQueue.shift();this.subtitle.until=this.clock+this.subtitle.duration;}
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- read-only views
  get clockLabel(){return this.plan.act.clock.label;}
  get objectiveMarker(){
    const A=this.profile;
    if(this.plan.withdrawal){   // VII-c: the parapet while the line leaves, then the exit band
      if(this.scene||this.mission.complete)return null;
      const q=this.player,mark=this.active(A.arrivalObjective)?[this.plan.points[A.marker],A.markerLabel]:this.active(A.holdObjective)?[this.plan.points.exit_centre,'Saída']:null;
      if(!mark)return null;
      const [pt,label]=mark,rel=Math.atan2(pt.z-q.z,pt.x-q.x)-q.angle;
      return {label,x:pt.x,y:this.plan.layout.groundY,z:pt.z,distance:dist(q,pt),bearing:Math.atan2(Math.sin(rel),Math.cos(rel))};
    }
    if(this.scene||this.mission.complete||!this.active(A.arrivalObjective))return null;
    const p=this.player;let pt=this.plan.points[A.marker],label=A.markerLabel;
    if(A.arrivalNeedsReserve&&this.weapon.reserve<this.plan.act.resupply.reserveTo){   // short of ammunition: the first place is the nearest crate
      let best=null;for(const o of this.world.areaProps)if(o.type==='ammo_crate_wood'&&(!best||Math.hypot(o.x-p.x,o.z-p.z)<Math.hypot(best.x-p.x,best.z-p.z)))best=o;
      if(best){pt=best;label='Caixa de munições';}
    }
    const rel=Math.atan2(pt.z-p.z,pt.x-p.x)-p.angle;
    return {label,x:pt.x,y:this.plan.layout.groundY,z:pt.z,distance:dist(p,pt),bearing:Math.atan2(Math.sin(rel),Math.cos(rel))};
  }
  get tempo(){return null;}
  get sapperOps(){return null;}
  get openingView(){return null;}
  get battleReadout(){return null;}
  get displayFire(){return null;}
  get display(){return null;}
  get stationEvacuation(){return null;}
  get gate(){return null;}
  get threat(){return {inFlight:this.enemyFire.rounds.length,status:this.mission.status,wave:this.timers.wave?{...this.timers.wave}:null,alive:this.enemies.filter(a=>a.alive&&a.active).length};}
  get ckm(){const g=this.actor('ckm_gunner');return g?{phase:g.ckm.phase,belt:g.ckmFire.belt,bursts:g.ckmFire.bursts}:null;}
  get animationPresentation(){return presentationDiagnostics(this.actors);}
  get respawn(){
    const id=this.checkpoint?.checkpointsReached?.at(-1)??null,cp=id&&this.definition.checkpoints.find(c=>c.id===id);
    return cp?{id,label:cp.label,name:cp.name,difficulty:this.checkpoint.difficulty??M01_DIFFICULTY_SIM_DEFAULT}:null;
  }
  get renderState(){
    const parts={};for(const file of manifest.files.filter(f=>f.lod===0))for(const n of file.nodes){
      const origin=n.pivot??[0,0,0],z=origin[2]+file.placement.translation[2],d=Math.hypot(origin[0]-this.player.x,z-this.player.z);
      parts[n.name]={lod:d<400?0:d<800?1:2,visible:n.name.endsWith('portal_west')?!this.consumedEvent('evt_m01_west_demolition'):
        n.showAfterEvent?this.consumedEvent(n.showAfterEvent):!n.destroyedBy||!this.consumedEvent(n.destroyedBy)};
    }
    return {parts,events:Object.keys(this.consumed),destruction:[],flags:{...this.flags},battleClock:this.battleClock,interaction:this.interaction,subtitle:this.subtitle,scene:this.scene,
      debrief:this.definition.debrief.paragraphs.filter(p=>p.enabled),repairProgress:100,train963:this.consumedEvent('evt_m01_train963_arrives'),panzerzug:this.consumedEvent('evt_m01_panzerzug_arrives'),
      stukas:false,secondRaid:false,weaponVisible:!this.scene,
      damage:this.sectors.damage.map(d=>({...d,smokeVisible:d.wreck||this.clock-d.started<(d.smokeSeconds??(d.id.startsWith('m01_grenade_')?20:240))}))};
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- saves
  saveCheckpoint(id){
    if(!this.checkpointsReached.includes(id))this.checkpointsReached.push(id);
    if(this.level.hpOnCheckpoint!==null)this.player.health=this.level.hpOnCheckpoint;
    this.checkpoint=this.snapshot(false);this.emit({type:'checkpoint',id});
  }
  snapshot(includeCheckpoint=true){
    const s=clone({schema:AREA_SAVE_SCHEMA,area:this.area,act:this.actId,seed:this.seed,clock:this.clock,battleClock:this.battleClock,rng:this.rng.state,difficulty:this.difficulty,
      player:this.player,weapon:this.weapon.snapshot(),grenades:this.grenades,actors:this.actors,consumed:this.consumed,objectives:this.objectives,flags:this.flags,
      dialogueQueue:this.dialogueQueue,subtitle:this.subtitle,scene:this.scene,sceneDone:this.sceneDone,checkpointsReached:this.checkpointsReached,timers:this.timers,
      enemyFire:this.enemyFire,sectors:this.sectors,mission:this.mission});
    if(includeCheckpoint&&this.checkpoint&&JSON.stringify(s)!==JSON.stringify(this.checkpoint))s.resumeCheckpoint=clone(this.checkpoint);
    return s;
  }
  restoreSnapshot(raw){
    const s=clone(raw);validateAreaSnapshot(s,this.plan);
    const candidate=new M01AreaSimulation(s.seed,{difficulty:s.difficulty,actId:s.act,carry:this.carry});
    for(const k of ['clock','battleClock','player','grenades','actors','consumed','objectives','flags','dialogueQueue','subtitle','scene','sceneDone','checkpointsReached','timers','enemyFire','sectors','mission'])candidate[k]=s[k];
    candidate.rng.state=s.rng;candidate.weapon.restore(s.weapon);
    candidate.checkpoint=clone(s.resumeCheckpoint??s);delete candidate.checkpoint.resumeCheckpoint;
    for(const k of Object.keys(candidate))this[k]=candidate[k];
    this.events=[];this.failure=null;
    return this;
  }
  restoreCheckpoint(){return this.restoreSnapshot(this.checkpoint);}
  lowerDifficulty(to){
    const order=M01_DIFFICULTY_IDS;if(order.indexOf(to)<0||order.indexOf(to)>=order.indexOf(this.difficulty))throw new RangeError('Só se pode descer de nível.');
    const cp=clone(this.checkpoint);cp.difficulty=to;this.difficulty=to;this.carry.difficulty=to;this.restoreSnapshot(cp);this.checkpoint=clone(cp);
  }
  loadCheckpoint(text){
    try{if(typeof text!=='string'||text.length>1000000)throw new Error('Ficheiro ausente ou demasiado grande.');this.restoreSnapshot(JSON.parse(text));return {ok:true};}
    catch(e){return {ok:false,error:e.message};}
  }
}

/**
 * The debrief of the last act: the current act's paragraphs (text and rules untouched) with the paragraphs of every area act played inserted after the paragraph each names (`insertAfter`), in the order of
 * the chain: VII-a's after db_03, VII-b's after db_np_01. An extra whose anchor is not there (the QA start at VII-b has no db_np_01) goes after db_03, where the first area act's go.
 */
export function debriefWith(...extras){
  const out=bwDefinition.debrief.paragraphs.map(p=>({...p}));
  for(const extra of extras){
    let at=out.findIndex(p=>p.id===extra.insertAfter);if(at<0)at=out.findIndex(p=>p.id==='db_03');
    out.splice(at<0?out.length:at+1,0,...extra.paragraphs.map(q=>({...q})));
  }
  return out;
}
/** The debrief blocks of the acts whose paragraphs this act's debrief carries: the area acts before it that the carry says were completed (their completion flag), then its own. */
export function debriefChain(actId,carry){
  const ids=Object.keys(AREA_ACTS),mine=ids.indexOf(actId),out=[];
  for(const id of ids.slice(0,mine)){const e=AREA_ACTS[id];if(carry.flags?.[`${makeProfile(e.act,e.layout).flagPrefix}.completed`])out.push(e.act.debrief);}
  out.push(AREA_ACTS[actId].act.debrief);
  return out;
}

/**
 * The card on screen in a save, and the cards already played: the act's cards play in their order (the order's, the entry's, the end's: the ones it has), so the cards done are a prefix of that order and the one
 * on screen is the next, at the kind, length, lines and skippability the data gives it and not yet over. Never throws.
 */
function validScene(plan,scene,done){
  const cards=plan.act.cards,seq=[['order',cards.order],['entry',cards.entry],['end',cards.end]].filter(([,c])=>c);
  if(!Array.isArray(done)||done.length>seq.length||done.some((id,i)=>id!==seq[i][1].id))return false;
  if(scene===null)return true;
  if(!scene||typeof scene!=='object'||Array.isArray(scene)||Object.keys(scene).sort().join()!=='card,elapsed,id,skippable')return false;
  const next=seq[done.length];if(!next)return false;
  const [kind,c]=next,k=scene.card;
  return scene.id===c.id&&scene.skippable===c.skippable&&Number.isFinite(scene.elapsed)&&scene.elapsed>=0&&scene.elapsed<c.seconds+1e-9&&Boolean(k)&&typeof k==='object'&&
    Object.keys(k).sort().join()==='kind,lines,seconds'&&k.kind===kind&&k.seconds===c.seconds&&JSON.stringify(k.lines)===JSON.stringify(c.lines);
}

/** Rejects an area save that this build could not have written (wrong schema/area/act, unknown or missing actors, impossible numbers, bad records). */
export function validateAreaSnapshot(s,plan=areaActPlan(s?.act)){
  const reject=m=>{throw new Error(`Checkpoint do ato inválido: ${m}.`);};
  if(!s||typeof s!=='object'||Array.isArray(s))reject('formato');
  if(s.schema===1)reject('esquema 1, anterior à segunda vaga do ato (os saves de teste antigos não são migrados: recomece o ato)');
  if(s.schema!==AREA_SAVE_SCHEMA)reject('esquema');
  if(s.area!==plan.layout.area||s.act!==plan.actId)reject('área/ato');
  if(!M01_DIFFICULTY_IDS.includes(s.difficulty))reject('dificuldade');
  for(const k of ['seed','clock','battleClock','rng'])if(!Number.isFinite(s[k]))reject(k);
  if(s.clock<0||s.clock>36000||s.battleClock<plan.clockStart)reject('relógio');
  const ids=areaRoster(plan);
  if(!Array.isArray(s.actors)||s.actors.length!==ids.length||s.actors.some((a,i)=>a?.id!==ids[i]))reject('elenco');
  // The place a gun last saw a flash lies in the area (a margin round it) and was made by a Pole or by the player.
  const pb=plan.layout.bounds.playable,box={minX:pb.minX-30,maxX:pb.maxX+30,minZ:pb.minZ-30,maxZ:pb.maxZ+30},shooters=['jan_wrona',...ids.filter(id=>!(plan.assault?.ids??[]).includes(id))];
  const waveFlag=`${plan.profile.flagPrefix}.wave`;
  for(const a of s.actors){
    if(![a.x,a.y,a.z,a.health].every(Number.isFinite)||a.health<0||a.health>100)reject(`ator ${a.id}`);
    if(a.team==='enemy'&&!plan.assault)reject(`ator ${a.id}`);   // INC-3: an act with no assault has nobody on the other side
    if(a.team==='enemy'&&a.deck!==undefined&&!validApproachRecord(plan.assault,a,s.clock))reject(`registo de assalto ${a.id}`);
    if(a.team==='enemy'&&!validGermanAi(plan.assault,a,s.clock,shooters,box))reject(`registo de decisões ${a.id}`);
  }
  const why=[];
  if(plan.assault){if(!validApproachWave(plan.assault,s.timers?.wave,s.flags?.[waveFlag],s.clock,s.actors,why))reject(`registo da vaga (${why[0]??'vagas, pausa ou estado do combate'})`);}
  else if(s.timers?.wave!==null||s.flags?.[waveFlag]!==undefined)reject('registo da vaga (este ato não tem ataque)');
  const p=s.player;if(!p||![p.x,p.y,p.z,p.angle,p.pitch,p.health].every(Number.isFinite)||p.health<=0||p.health>100||!p.alive)reject('jogador');
  const w=s.weapon;if(!w||!Number.isInteger(w.mag)||w.mag<0||w.mag>5||!Number.isInteger(w.reserve)||w.reserve<0||w.reserve>200)reject('arma');
  if(!s.objectives||plan.act.objectives.some(o=>!['locked','active','done'].includes(s.objectives[o.id]?.state)))reject('objetivos');
  if(s.timers?.squad!==undefined&&!validSquadRecord(plan.squad,s.timers.squad,s.clock))reject('registo da secção');
  if(!Array.isArray(s.checkpointsReached)||s.checkpointsReached.some(id=>!plan.act.checkpoints.some(c=>c.id===id))||new Set(s.checkpointsReached).size!==s.checkpointsReached.length)reject('checkpoints');
  // The checkpoint of a pause exists only once the echelon before it has broken.
  for(const e of plan.assault?.echelons??[])if(e.checkpoint&&s.checkpointsReached.includes(e.checkpoint)&&!Number.isFinite(s.timers?.wave?.echs?.[e.index-1]?.brokenAt))reject(`checkpoint ${e.checkpoint} sem a quebra da vaga anterior`);
  if(!s.enemyFire||!Array.isArray(s.enemyFire.rounds))reject('fogo');
  // INC-2: the records of the blocks an act has are required (and checked) when its plan has them, and refused when it has not (a barrage record in a VII-a save is not one this build could have written).
  if(Boolean(plan.barrages)!==(s.timers?.barrage!==undefined))reject('registo das barragens (exigido pelos atos que as têm, recusado nos outros)');
  if(plan.barrages&&!validBarrageRecord(plan.barrages,s.timers.barrage,s.clock,box))reject('registo das barragens');
  if(Boolean(plan.medics)!==(s.timers?.medics!==undefined))reject('registo dos maqueiros (exigido pelos atos que os têm, recusado nos outros)');
  if(plan.medics&&!validMedicRecord(plan.medics,s.timers.medics,s.clock,plan.line.men))reject('registo dos maqueiros');
  if(plan.medics){   // who is carried, by whom, and where the bearers are: the record and the men agree
    const R=s.timers.medics,byId=new Map(s.actors.map(a=>[a.id,a])),carried=s.actors.filter(a=>a.carriedBy);
    if(carried.length>1||carried.some(a=>R.state!=='carry'||a.id!==R.patient||a.carriedBy!==plan.medics.ids[0]||!a.alive||!a.active))reject('registo dos maqueiros (homem transportado)');
    for(const id of plan.medics.ids)if(byId.get(id).active===(R.state==='idle'))reject('registo dos maqueiros (maqueiro no campo ou fora dele contra o registo)');
    if(R.state!=='idle'&&R.patient!==null&&!byId.get(R.patient))reject('registo dos maqueiros (doente)');
  }
  // INC-3: the withdrawal's record, its two squads and the flags and objectives that must agree with it are required when the plan has a withdrawal and refused when it has not.
  if(Boolean(plan.withdrawal)!==(s.timers?.withdrawal!==undefined))reject('registo da retirada (exigido pelos atos que a têm, recusado nos outros)');
  if(plan.withdrawal){
    const R=s.timers.withdrawal,F=n=>`${plan.profile.flagPrefix}.${n}`,O=s.objectives,A=plan.profile;
    if(!validWithdrawalRecord(plan.withdrawal,R,s.clock,s.actors))reject('registo da retirada');
    if(!validWithdrawalSquads(plan.withdrawal,s.timers,s.clock))reject('registo dos lanços da retirada');
    for(const [name,at] of [['order',R.orderAt],['lineOut',R.lineOutAt],['exited',R.exitedAt]])if(Boolean(s.flags?.[F(name)])!==(at!==null))reject(`registo da retirada (a flag ${name} e o registo discordam)`);
    if((R.lineOutAt!==null)!==(O[A.arrivalObjective].state==='done')||(R.lineOutAt===null)!==(O[A.holdObjective].state==='locked')||(R.exitedAt!==null)!==(O[A.holdObjective].state==='done'))reject('registo da retirada (os objetivos e o registo discordam)');
  }else if(s.timers?.line!==undefined||s.timers?.rear!==undefined)reject('registo dos lanços da retirada (recusado nos atos sem retirada)');
  if(!validScene(plan,s.scene,s.sceneDone))reject('cartão');
  for(const t of plan.triggers)if(t.type==='echelonBroken'&&s.checkpointsReached.includes(t.id)&&!Number.isFinite(s.timers?.wave?.echs?.[t.echelon]?.brokenAt))reject(`checkpoint ${t.id} sem a quebra da vaga ${t.echelon}`);
  if(p.concussion!==undefined||p.concussedUntil!==undefined){
    if(!(Number.isFinite(p.concussion)&&p.concussion>0&&p.concussion<=1)||!Number.isFinite(p.concussedUntil)||p.concussedUntil>s.clock+CONCUSSION.maxSec+1e-6)reject('atordoamento do jogador');
  }
  // The craters of the shells are records of the act's saved damage: where and when they fell, with the sound that reaches the player after them.
  for(const d of s.sectors?.damage??[])if(![d.x,d.y,d.z,d.started,d.soundAt].every(Number.isFinite)||typeof d.id!=='string'||d.started>s.clock+1e-6||(d.concussion!==undefined&&!(d.concussion>=0&&d.concussion<=1)))reject('destruição');
  if(s.resumeCheckpoint!==undefined)validateAreaSnapshot({...s.resumeCheckpoint},plan);
}
