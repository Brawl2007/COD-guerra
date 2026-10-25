// R4 WP-1 (INC-1, 2026-10-25): the simulation of a new act's area, here Act VII-a «Perímetro norte, manhã» (missions/m01-tczew/areas/np).
// The current act (04:30-07:05) stays a closed box (M01Simulation, untouched). This class has the same contract the game, the HUD, the renderer and the
// audio read (tick, drainEvents, snapshot/restoreSnapshot/checkpoint, renderState, actors, enemyFire, objectives, scene, subtitle...), composed from the
// reusable modules of the current act: the player's body physics and rifle (m01-player-physics, wz29), real rounds with an arc and a flight time
// (m01-fire makeRound/traceRound, m01-aim), the presentation records (m01-animation-presentation), and the section machinery as factories
// (m01-act-factories: the squad bounds, the firing line of the rearguard, the deck assault generalised to a line of approach).
// Everything is decided here, from seeded streams; the renderer only draws it. No wall clock, no unseeded draw, no DOM.
import bwDefinition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with { type: 'json' };
import npLayout from '../../missions/m01-tczew/areas/np/layout.json' with { type: 'json' };
import npAct from '../../missions/m01-tczew/areas/np/act.json' with { type: 'json' };
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
import {makeApproachPlan,makeLinePlan,makeSquadPlan,squadStep,squadSlotOf,squadMovingIn,validApproachRecord,validSquadRecord} from './m01-act-factories.js';

export const AREA_SAVE_SCHEMA=1;
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

/** The area acts this module can run. One today; WP-2..WP-4 add theirs here. */
export const AREA_ACTS=Object.freeze({act_vii_a_north:Object.freeze({layout:npLayout,act:npAct})});

/** Everything of the act that is data, validated once (a typo stops the game instead of changing it). */
export function areaActPlan(actId='act_vii_a_north'){
  const entry=AREA_ACTS[actId];if(!entry)throw new Error(`M01 act: unknown area act ${actId}`);
  const {layout,act}=entry,group=id=>act.groups.find(g=>g.id===id);
  const pb=layout.bounds.playable,def={groups:act.groups,events:act.events};
  const line=makeLinePlan(def,{group:'grp_np_line',key:'rearguard',man:'^pl_np_\\d+$',postBox:{minX:pb.minX,maxX:pb.maxX,minZ:-1160,maxZ:-1158},survivorFloor:false,label:'M01 VII-a line'});
  const section=group('grp_np_section'),squad=makeSquadPlan(section.squad,'M01 VII-a squad');
  const assault=makeApproachPlan(group('grp_np_de').assault,{minX:pb.minX,maxX:pb.maxX,groundY:layout.groundY,label:'M01 VII-a assault'});
  const ckm=group('grp_np_ckm');
  if(!Array.isArray(ckm.root)||ckm.root.length!==3||!Number.isFinite(ckm.yawDeg))throw new Error('M01 VII-a ckm root/yawDeg');
  const stageSlots=Object.fromEntries(Object.entries(section.stage.slots).map(([id,[x,z]])=>[id,{x,z}]));
  return Object.freeze({actId,layout,act,line,squad,assault,ckm,section,stageSlots,waveAt:seconds(act.events.find(e=>e.id==='evt_np_wave').trigger.at),
    clockStart:seconds(act.clock.battleClockStart)});
}

const CKM_IDS=['ckm_gunner','ckm_loader'];
/** The roster of an area act, in actor order (makeActors). */
export const areaRoster=plan=>['marek_zielinski','staszek_pawlak','szymon_kowal',...plan.line.men,...CKM_IDS,...plan.assault.men.map(m=>m.id)];
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
    this.difficulty=difficulty;this.actId=actId;this.plan=areaActPlan(actId);this.carry=clone(carry??defaultCarry(difficulty));this.reset(seed);
  }
  get level(){return M01_DIFFICULTY[this.difficulty];}
  reset(seed=this.seed??19390901){
    const P=this.plan,L=P.layout,A=P.act;
    this.seed=seed;this.missionId=bwDefinition.id;this.area=L.area;this.rng=new Random(seed);
    // The definition the HUD and the audio read: the current act's, with this act's objectives, checkpoints and an empty cutscene list (the cards are scene.card).
    this.definition={...bwDefinition,objectives:A.objectives.map(o=>({...o})),checkpoints:A.checkpoints.map(c=>({...c})),cutscenes:[],sectors:[],
      debrief:{...bwDefinition.debrief,paragraphs:debriefWith(A.debrief)}};
    this.world=new M01AreaWorld(L,{extraCovers:P.assault.covers,eventIds:this.carry.events,flags:this.carry.flags});
    this.clock=0;this.battleClock=P.clockStart;this.events=[];
    // The current act's consumed events stay consumed (the bridges as the demolitions left them), an hour before this act's clock; this act's own events at their clock.
    this.consumed=Object.fromEntries(this.carry.events.map(id=>[id,-3600]));
    this.objectives=Object.fromEntries(A.objectives.map(o=>[o.id,{state:'locked',progress:0}]));
    this.flags={...this.carry.flags,'m01np.wave':'pending'};
    this.destruction=[];this.dialogueQueue=[];this.subtitle=null;this.sceneDone=[];this.scene=null;this.checkpointsReached=[];this.failure=null;
    const s=L.points.spawn;
    this.player=entity('jan_wrona',{x:s.x,y:L.groundY,z:s.z},'player',{angle:s.facingDeg*Math.PI/180,pitch:0,radius:.36,aiming:false,moveBlend:0,sprinting:false,weaponShotAt:-1e9,carrying:null,headgear:'pl_rogatywka_wz37'});
    this.weapon=new Wz29();this.weapon.mag=this.carry.weapon.mag;this.weapon.reserve=this.carry.weapon.reserve;
    this.grenades={ammo:this.carry.grenades,active:[],nextId:0};
    this.actors=this.makeActors(seed);
    for(const a of this.actors)initializePresentation(a,this.clock);
    // The squad record starts at its first bound: the current act's updateSquad infers a retreat already made from men WEST of their slots, which means nothing here.
    this.timers={boundary:0,boundaryCountdown:0,said:{},lastHitAt:-1e9,burstWound:null,wave:null,endAt:null,playerPinnedAt:-1e9,squad:{move:0,moving:false,since:0}};
    this.enemyFire={rounds:[],nextId:0};
    const w=L.wreck.smoke;
    this.sectors={sectors:[],damage:[{id:w.id,x:w.x,y:w.y,z:w.z,started:-w.burningSinceSec,soundAt:-w.burningSinceSec,wreck:true}]};
    this.mission={phase:'NP_ENTRY',complete:false,text:'',status:''};
    this.startCard('entry');
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
    // The Germans are already in the field when the act opens (the infantry of the ~07:00 attack went to ground when its vehicle was hit, T08): each man kneels at his
    // first stop behind turned earth, silent, until the wave goes on (updateWave). Spawned under the entry card, never in sight.
    P.assault.men.forEach((m,i)=>{const n=m.path[m.stops[0]];add(entity(m.id,{x:n.x,y,z:n.z},'enemy',{group:'grp_np_de',weapon:m.weapon,role:m.weapon==='mg34'?'SUPPORT':'RIFLEMAN',
      facing:Math.PI/2,firedAt:-1e9,cooldown:2+i*.4,crouched:true,deck:{v:1,phase:m.role==='overwatch'?'hold':'cover',node:m.stops[0],until:0,since:0,t0:0,pinned:0}}),30+i);});
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
    if(s.card.kind==='entry'){
      this.consume('evt_np_card_end');this.activate('obj_np_reach_trench');this.mission.phase='NP_ARRIVAL';
      this.saveCheckpoint('cp_np_e_perimetro');this.say('arrive_card_end');
    }else{this.mission.complete=true;this.mission.phase='NP_END';this.flags['m01np.completed']=true;this.emit({type:'complete'});}
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- tick
  tick(dt,controls={}){
    if(!Number.isFinite(dt)||dt<=0||this.mission.complete)return;dt=Math.min(.05,dt);
    if(!this.player.alive){const reason=this.failure;this.restoreCheckpoint();this.emit({type:'restored'});if(reason)this.message(reason);return;}
    this.clock+=dt;this.battleClock+=dt;const p=this.player;
    p.angle+=(controls.lookX??0)*.0022;p.pitch=Math.max(-1.25,Math.min(1.25,p.pitch-(controls.lookY??0)*.0022));p.aiming=Boolean(controls.aim);
    if(controls.crouch)p.crouched=!p.crouched;
    this.updateScene(dt,controls.skip);
    const locked=Boolean(this.scene);
    if(!locked){
      const f=controls.forward??0,s=controls.side??0,len=Math.hypot(f,s)||1;
      const speed=(controls.sprint?6:3.8)*(p.crouched?.6:1)*(p.aiming?.65:1);
      const dx=(Math.cos(p.angle)*f-Math.sin(p.angle)*s)*speed*dt/len,dz=(Math.sin(p.angle)*f+Math.cos(p.angle)*s)*speed*dt/len;
      const before={x:p.x,z:p.z},landing=movePlayer(this.world,p,dx,dz,dt);if(landing)this.emit({type:'player-landing',...landing,point:{x:landing.x,y:landing.y,z:landing.z}});
      p.moveBlend=Math.min(1,dist(before,p)/(dt*3.8));p.sprinting=Boolean(controls.sprint)&&p.moveBlend>.1;
      this.weapon.update(this.clock*1000);
      if(controls.reload&&this.weapon.reload(this.clock*1000))this.emit({type:'reload',weapon:'kb_wz29'});
      if(controls.sight)this.message(`Alça: ${this.weapon.adjustSight()} m`);
      if(controls.fire)this.fire();
      this.updateGrenades(dt,controls.grenade);
      if(controls.interact)this.interact();
      this.boundaries(dt);
    }
    const before=this.actors.map(a=>({x:a.x,z:a.z}));
    this.updateWave();
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
    this.advanceSubtitle();
  }
  // ------------------------------------------------------------------------------------------------------------------------------------------------- player
  fire(){
    const p=this.player,now=this.clock*1000;if(!this.weapon.shoot(now))return;
    const aim=this.weapon.shotDirection(p.angle,p.pitch,p.aiming,p.moveBlend>.1,this.rng.next);
    const dir=aimDirection(aim.angle,aim.pitch),origin=eyePosition(p),hit=traceShot(this.world,origin,dir,this.actors,1200,muzzlePosition(p));
    p.weaponShotAt=now;p.pitch=Math.min(1.25,p.pitch+.024);
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
  updateWave(){
    if(this.flags['m01np.wave']!=='pending'||this.scene)return;
    if(!(this.battleClock>=this.plan.waveAt||this.objectives.obj_np_reach_trench.state==='done'))return;
    this.flags['m01np.wave']='active';this.consume('evt_np_wave');this.timers.wave={at:this.clock,casualties:0,brokenAt:null,repelledAt:null,closed:false,seen:false};
    this.activate('obj_np_hold_north');this.mission.phase='NP_ATTACK';
    for(const a of this.enemies)if(a.alive&&a.active){const S=this.plan.assault;a.deck.since=this.clock;a.deck.until=this.clock+between(a.ai,S.coverSec);a.cooldown=1.5+3*aiNext(a.ai);}
  }
  man(a){return this.plan.assault.men.find(m=>m.id===a.id);}
  atNode(a,m){const n=m.path[a.deck.node];return Boolean(n)&&Math.hypot(a.x-n.x,a.z-n.z)<.06;}
  /** The approach assault: advance (bound to the next node), cover (kneel at a stop), hold (at the limit), fallback (back along the path), clear (gone). */
  stepGermans(dt){
    const W=this.timers.wave;
    if(!W){for(const a of this.enemies)if(a.alive&&a.active){a.crouched=true;a.facing=Math.PI/2;}return;}
    const S=this.plan.assault,alive=this.enemies.filter(a=>a.alive&&a.active);
    // The wave breaks on its casualties, on the pinning of the assault, or on its clock.
    if(W.brokenAt===null){
      const assault=alive.filter(a=>this.man(a).role==='assault'),pinned=assault.length?assault.reduce((n,a)=>n+a.deck.pinned,0)/assault.length:0;
      if(W.casualties>=S.breakOut||pinned>=S.breakPinnedSec||this.clock-W.at>=S.maxSec){
        W.brokenAt=this.clock;this.flags['m01np.wave']='broken';this.say('fallback');
        // Back along his own path: from the last node he actually reached (a man on his way to a node, or pinned short of it, turns back to the one before).
        for(const a of alive){const m=this.man(a),at=this.atNode(a,m);if(!at)a.deck.node--;a.deck.phase='fallback';a.deck.since=this.clock;a.crouched=false;}
      }
    }
    if(W.brokenAt===null&&!W.closed&&this.clock-W.at>=S.closeAfterSec&&W.casualties<S.breakOut-1){
      W.closed=true;for(const a of alive){const m=this.man(a);if(m.role==='assault'&&a.deck.lim===undefined)a.deck.lim=m.deepestStop;}
    }
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
          if(d.node>=0)d.node--;
          else{d.phase='clear';d.since=this.clock;a.active=false;}
        }
      }
    }
    if(W.brokenAt!==null&&W.repelledAt===null&&!this.enemies.some(a=>a.alive&&a.active)){
      W.repelledAt=this.clock;this.flags['m01np.wave']='repelled';this.say('repelled');
      this.finish('obj_np_hold_north');this.timers.endAt=this.clock+this.plan.act.endBeatSec;this.mission.phase='NP_REPELLED';
    }
    if(!W.seen&&alive.some(a=>a.z>-1350)){W.seen=true;this.say('wave_seen');this.timers.openFireAt=this.clock+2.5;}
    if(this.timers.openFireAt&&this.clock>=this.timers.openFireAt){this.timers.openFireAt=null;this.say('open_fire');}
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
    a.cooldown-=dt;
    if(suppressed){a.crouched=true;a.cooldown=Math.max(a.cooldown,a.suppressedUntil-this.clock+.6);return;}
    // Up from cover riseBeforeSec before the shot and holdAfterSec after it; down otherwise.
    a.crouched=!(a.cooldown<=F.riseBeforeSec||this.clock-a.firedAt<F.holdAfterSec);
    if(a.cooldown>0)return;
    const targets=this.germanTargets(a,F.rangeM);
    if(!targets.length){a.cooldown=.8+.6*aiNext(a.ai);return;}
    const w=S.playerWeight[this.difficulty]??1,weights=targets.map(t=>t===this.player?w:1),sum=weights.reduce((n,x)=>n+x,0);
    let u=aiNext(a.ai)*sum,target=targets[0];for(let i=0;i<targets.length;i++){u-=weights[i];if(u<=0){target=targets[i];break;}}
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
  /** German rounds land: the world, the player (wound by the level's table), a man of the line (wounded or killed), the named men (pinned), near misses (pinned). */
  landRounds(){
    if(!this.enemyFire.rounds.some(r=>r.arriveAt<=this.clock))return;
    const due=this.enemyFire.rounds.filter(r=>r.arriveAt<=this.clock);this.enemyFire.rounds=this.enemyFire.rounds.filter(r=>r.arriveAt>this.clock);
    const p=this.player,L=this.level;
    for(const r of due){
      const targets=[p,...this.allies.filter(b=>b.alive&&b.active)],hit=traceRound(this.world,r,targets),point=hit.point,victim=hit.actor??null,near=[];
      if(victim===p){
        const covered=Boolean(this.world.coverAt(p))&&p.crouched,chance=L.woundChance[covered?'cover':'exposed'];
        if(this.rng.next()<chance)this.woundPlayer(r);
      }else if(victim){
        if(victim.essential){const prev=victim.suppressedUntil;victim.suppressedUntil=Math.max(prev,this.clock+ESSENTIAL_PIN_SEC);recordSuppression(victim,prev,this.clock);recordHit(victim,this.clock,{x:r.ox,z:r.oz});}
        else{const h=victim.health,was=victim.alive;victim.health=Math.max(0,h-LINE_DAMAGE*hit.multiplier);victim.alive=victim.health>0;victim.state=victim.alive?'HIT_REACTION':'DOWN';
          recordDamage(victim,h,was,this.clock,{x:r.ox,z:r.oz});if(was&&!victim.alive)this.say('man_down');}
      }
      for(const b of this.allies){if(!b.alive||!b.active||b===victim)continue;
        if(closestApproach(r,hit.t,eyePosition(b))<=NEAR_MISS){const prev=b.suppressedUntil;b.suppressedUntil=Math.max(prev,this.clock+NEAR_PIN_SEC);recordSuppression(b,prev,this.clock);near.push(b.id);}}
      const approach=closestApproach(r,hit.t,eyePosition(p)),crack=approach<=6;
      if(crack&&approach<=2.5&&this.clock-this.timers.playerPinnedAt>6){this.timers.playerPinnedAt=this.clock;if(!p.crouched)this.say('player_pinned');}
      if(point)this.emit({type:'round-impact',kind:r.kind,by:r.by,point,material:hit.material??'earth',crack,distance:dist(point,p),pass:impactPass(crack,approach),victim:victim&&victim!==p?victim.id:null,pinned:near});
    }
  }
  damageGerman(e,amount,source,by){
    const h=e.health,was=e.alive;e.health=Math.max(0,h-amount);e.alive=e.health>0;e.state=e.alive?'HIT_REACTION':'DOWN';
    recordDamage(e,h,was,this.clock,source);
    if(was&&!e.alive){
      if(this.timers.wave)this.timers.wave.casualties++;
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
    if(this.scene&&!this.sceneDone.includes('cs_np_entry'))return;
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
  squadPostOf(q,id){const t=this.plan.squad.teams.findIndex(team=>team.includes(id));let k=0;for(let i=0;i<Math.min(q.move+(q.moving?1:0),this.plan.squad.moves.length);i++)if(this.plan.squad.moves[i].team===t)k=this.plan.squad.moves[i].to;return k;}
  stepLine(dt){if(!this.timers.wave)return;for(const id of this.plan.line.men){const a=this.actor(id);if(a.alive&&a.active)this.lineShooter(a,dt);}}
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
    a.shot=.12;a.firedAt=this.clock;a.facing=aimed;
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
    f.bursts++;f.engagedUntil=clock+C.holdSec;f.nextAt=clock+C.burstSec+C.cooldown[0]+(C.cooldown[1]-C.cooldown[0])*nx();
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
  // ------------------------------------------------------------------------------------------------------------------------------------------------- objectives, voices
  updateObjectives(){
    const p=this.player,post=this.plan.layout.points.trench_post,reach=this.plan.act.objectives.find(o=>o.id==='obj_np_reach_trench');
    if(this.active('obj_np_reach_trench')&&Math.hypot(p.x-post.x,p.z-post.z)<reach.reachM)this.finish('obj_np_reach_trench');
    if(this.timers.endAt!==null&&this.clock>=this.timers.endAt&&!this.scene&&!this.sceneDone.includes('cs_np_end')){this.timers.endAt=null;this.startCard('end');}
    const current=this.plan.act.objectives.find(o=>this.active(o.id));
    this.mission.text=current?.text??(this.objectives.obj_np_hold_north.state==='done'?'Ataque repelido':'');
    const W=this.timers.wave;
    this.mission.status=W&&W.repelledAt===null?`Linha norte · ${this.enemies.filter(a=>a.alive&&a.active).length} atacantes no campo · ${W.casualties} caídos`:'';
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
    if(this.scene||this.mission.complete||!this.active('obj_np_reach_trench'))return null;
    const p=this.player,pt=this.plan.layout.points.trench_post,rel=Math.atan2(pt.z-p.z,pt.x-p.x)-p.angle;
    return {label:'Parapeito norte',x:pt.x,y:this.plan.layout.groundY,z:pt.z,distance:dist(p,pt),bearing:Math.atan2(Math.sin(rel),Math.cos(rel))};
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
      damage:this.sectors.damage.map(d=>({...d,smokeVisible:d.wreck||(d.id.startsWith('m01_grenade_')?this.clock-d.started<20:this.clock-d.started<240)}))};
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

/** The debrief of the last act: the current act's enabled paragraphs, this act's inserted after `insertAfter`. Text and rules of the current act's paragraphs untouched. */
export function debriefWith(extra){
  const out=[];for(const p of bwDefinition.debrief.paragraphs){out.push({...p});if(p.id===extra.insertAfter)out.push(...extra.paragraphs.map(q=>({...q})));}
  return out;
}

/** Rejects an area save that this build could not have written (wrong schema/area/act, unknown or missing actors, impossible numbers, bad records). */
export function validateAreaSnapshot(s,plan=areaActPlan(s?.act)){
  const reject=m=>{throw new Error(`Checkpoint do ato inválido: ${m}.`);};
  if(!s||typeof s!=='object'||Array.isArray(s))reject('formato');
  if(s.schema!==AREA_SAVE_SCHEMA)reject('esquema');
  if(s.area!==plan.layout.area||s.act!==plan.actId)reject('área/ato');
  if(!M01_DIFFICULTY_IDS.includes(s.difficulty))reject('dificuldade');
  for(const k of ['seed','clock','battleClock','rng'])if(!Number.isFinite(s[k]))reject(k);
  if(s.clock<0||s.clock>36000||s.battleClock<plan.clockStart)reject('relógio');
  const ids=areaRoster(plan);
  if(!Array.isArray(s.actors)||s.actors.length!==ids.length||s.actors.some((a,i)=>a?.id!==ids[i]))reject('elenco');
  for(const a of s.actors){
    if(![a.x,a.y,a.z,a.health].every(Number.isFinite)||a.health<0||a.health>100)reject(`ator ${a.id}`);
    if(a.team==='enemy'&&a.deck!==undefined&&!validApproachRecord(plan.assault,a,s.clock))reject(`registo de assalto ${a.id}`);
  }
  const p=s.player;if(!p||![p.x,p.y,p.z,p.angle,p.pitch,p.health].every(Number.isFinite)||p.health<=0||p.health>100||!p.alive)reject('jogador');
  const w=s.weapon;if(!w||!Number.isInteger(w.mag)||w.mag<0||w.mag>5||!Number.isInteger(w.reserve)||w.reserve<0||w.reserve>200)reject('arma');
  if(!s.objectives||plan.act.objectives.some(o=>!['locked','active','done'].includes(s.objectives[o.id]?.state)))reject('objetivos');
  if(s.timers?.squad!==undefined&&!validSquadRecord(plan.squad,s.timers.squad,s.clock))reject('registo da secção');
  if(!Array.isArray(s.checkpointsReached)||s.checkpointsReached.some(id=>!plan.act.checkpoints.some(c=>c.id===id)))reject('checkpoints');
  if(!s.enemyFire||!Array.isArray(s.enemyFire.rounds))reject('fogo');
  if(s.resumeCheckpoint!==undefined)validateAreaSnapshot({...s.resumeCheckpoint},plan);
}
