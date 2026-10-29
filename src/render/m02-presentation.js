import * as THREE from 'three';
import {M02Characters} from './m02-character-adapter.js';
import { M01ViewModel } from './m01-viewmodel.js';
import { WEAPON_PROFILES } from '../game/m02-combat-ai.js';
import { AudioManager } from '../core/audio.js';
import {M02Weapons} from './m02-weapons.js';
import {WeaponLighting} from './first-person-weapon-fx.js';
import {WZ29_VISUAL} from './m01-wz29-presentation.js';
import {M02Footsteps} from './m02-footsteps.js';
import {playM02RoundAudio} from './m02-round-audio.js';
import {M01CombatFeedback} from './m01-combat-feedback.js';
import {M02GrenadeFollowThrough} from './m02-grenade-follow-through.js';
import {playM02NpcReloadAudio} from './m02-npc-reload-audio.js';

// Match the shared M01 viewmodel projection. ADS zoom belongs to the world
// camera; changing this lens crops the stock and magnifies the near hands.
export const createM02WeaponCamera=()=>new THREE.PerspectiveCamera(58,1,WZ29_VISUAL.near,6);

// Damage source is presentation-only and is sampled against mission time.
// The angle remains correct as the player turns or moves after the hit.
export function m02DamageIndicator(source,player,clock,enabled=true){
 if(!enabled||!source||!Number.isFinite(clock))return null;
 const age=clock-source.clock;if(age<-.001||age>=1.2)return null;
 const dx=source.x-player.x,dz=source.z-player.z;if(!Number.isFinite(dx)||!Number.isFinite(dz)||Math.hypot(dx,dz)<.05)return null;
 return {angle:Math.atan2(dz,dx)-player.angle,opacity:Math.max(0,1-Math.max(0,age)/1.2)};
}

// Translated actors and weapon records belong to presentation. The shared renderers
// read the collision layout; they never decide M02 combat or advance its clock.
export function m02VisualActor(actor, team, clock) {
  const surrendered = actor.state === 'SURRENDERED';
  const wounded = actor.state === 'WOUNDED_UNARMED'||actor.state==='WOUNDED_LIAISON';
  return { ...actor, team, active: !actor.detachedOutOfCell,
    m02WoundedWalking:actor.state==='WALKING_SUPPORTED'||actor.state==='WOUNDED_WALKING',
    id: actor.weapon === 'rkm_wz28' ? 'szymon_kowal' : actor.id,
    role: wounded || surrendered || actor.role==='medic'||actor.state==='WOUNDED_WALKING'||actor.state==='WALKING_SUPPORTED'||actor.state==='EVACUATED_B12' ? 'MEDIC' : 'RIFLEMAN',
    state: wounded ? 'WOUNDED' : actor.moving ? 'ADVANCE' : actor.shot > 0 ? 'SUPPRESS' : 'GUARD',
    posture: actor.crouched ? 'crouch' : 'stand',
    suppressedUntil:actor.suppressed>.4&&actor.crouched&&!actor.moving?clock+.1:0,
    pose: actor.state==='EVACUATED_B12'?'seated':actor.pose,
    shot: actor.shot ?? (clock - (actor.lastShotAt ?? -Infinity) < .15 ? .15 : 0),
    reload: actor.reloadingUntil > clock ? {startedAt:actor.reloadingUntil-(WEAPON_PROFILES[actor.weapon]?.reloadSec??2.8),durationSec:WEAPON_PROFILES[actor.weapon]?.reloadSec??2.8} : null,
    motion: { speed: actor.moving ? (actor.effectiveSpeed??actor.speed??(actor.suppressed>.55?2.6:4.1)) : 0,odometer:actor.motionDistance??0 },
  };
}

export class M02Presentation {
  constructor(scene, camera, sim) {
    this.camera = camera;
    this.weaponCamera = createM02WeaponCamera();
    this.fireTimes = new Map();
    this.roundEvents = new Map();
    this.characters = new M02Characters(scene, { ik:false });
    this.weaponScene = new THREE.Scene();
    this.weaponLighting=new WeaponLighting(this.weaponScene);
    // M01 viewmodel lives in camera space and has its own depth pass.
    this.weapon = new M01ViewModel(this.weaponScene, this.characters);
    this.audio = new AudioManager({quality:'medium'});
    this.feedback=new M01CombatFeedback();
    this.grenadeFollowThrough=new M02GrenadeFollowThrough();
    this.damageSource=null;
    this.footsteps=new M02Footsteps(this.audio);
    this.m02Weapons=new M02Weapons();
    this.ready = Promise.all([this.characters.load('medium').then(()=>this.characters.prepareM02Clips()),this.m02Weapons.ready]);
    this.ids = new Map();
    this.resetClock = sim.clock;
    this.playerRecord=sim.player;this.presentationWorld=sim.world;
  }
  unlockAudio() { this.audio.init(); }
  syncSession(sim){
    if(sim.clock<this.resetClock||sim.player!==this.playerRecord||sim.world!==this.presentationWorld){
      this.audio.resetPresentation(sim.clock);this.fireTimes.clear();this.roundEvents.clear();this.footsteps.reset();
      this.feedback?.reset();
      this.grenadeFollowThrough?.reset();
      this.damageSource=null;
      this.characters.resetM02Pose();this.visualWorld=null;
    }
    this.playerRecord=sim.player;this.presentationWorld=sim.world;this.resetClock=sim.clock;
  }
  update(sim, quality) {
    this.syncSession(sim);
    this.resetClock = sim.clock;
    this.audio.setQuality(quality);
    this.audio.updateM01Presentation({clock:sim.clock,quality,state:{},fires:[],phase:sim.areaC?.c12Completed?'OUTRO':'MAIN_COMBAT',spatial:point=>this.spatial(point,sim)});
    if(sim.weapon.state!==this.weaponState){
      if(sim.weapon.reloading)this.audio.wz29Mechanism(sim.weapon.reloadMode,`reload:${sim.clock}`);
      this.weaponState=sim.weapon.state;
    }
    this.audio.setConcussionScale(sim.audiovisual?.accessibility?.tinnitusIntensity??1);
    this.ids.clear();
    let mgIndex=0;
    const actors = [];
    for (const [list, team] of [[sim.allies,'ally'],[sim.enemies,'enemy'],[(sim.areaC?.c10Started?sim.areaC.lastGroup:[]).filter(a=>!a.evacuated).map(a=>({...a,state:a.wounded?'WOUNDED_WALKING':'ACTIVE',weapon:'wz29'})),'ally']]) {
      for (const actor of list ?? []) {
        // Preserve Claude's explicit hands-up surrender pose, not an armed idle.
        if (actor.state === 'SURRENDERED') continue;
        const visual = m02VisualActor(actor, team, sim.clock);
        if(sim.c01Active&&!actor.shotsFired){
          if(actor.id==='pl_lis')visual.m02PreparationAction={clip:'m02_check_rifle',startedAt:sim.c01StartedAt+.6};
          if(actor.id==='pl_gruca')visual.m02PreparationAction={clip:'m02_scan_field',startedAt:sim.c01StartedAt};
        }
        if (actor.weapon==='mg34') visual.id=`de_east_${mgIndex++}`;
        const profile=WEAPON_PROFILES[actor.weapon];
        const firedAt=actor.lastShotAt??(actor.shotsFired>0&&profile?actor.nextFireAt-profile.cycleSec:this.fireTimes.get(actor.id)??-1e9);
        visual.firedAt=actor.burstStartedAt??firedAt; visual.shot=Math.max(0,.2-(sim.clock-firedAt));
        const event=this.roundEvents.get(actor.id);
        visual.m02RoundIndex=event&&Math.abs(event.clock-firedAt)<.001?event.roundIndex:actor.burst?actor.burst.emitted-1:Math.max(0,Math.round((firedAt-visual.firedAt)/(profile?.burstGapSec||1)));
        if(visual.state==='GUARD'&&sim.clock-firedAt<2.5)visual.state='SUPPRESS';
        this.ids.set(actor.id, visual.id); actors.push(visual);
      }
    }
    this.characters.update(actors, sim.clock, {...sim.player}, quality);
    this.m02Weapons.update(this.characters,actors,sim.clock);
    if(this.audio.ctx?.state==='running')this.footsteps.update(sim.player,actors,sim.clock);else this.footsteps.reset();
  }
  spatial(point,sim) {
    if(!point)return {pan:0,distance:900,front:1};
    const x=point.x-sim.player.x,z=point.z-sim.player.z;
    const angle=Math.atan2(z,x)-sim.player.angle;
    return {pan:Math.sin(angle),distance:Math.hypot(x,z),front:Math.cos(angle)};
  }
  hasCharacter(id) { return this.characters.instances.has(this.ids.get(id)); }
  updateWeapon(sim, quality) {
    this.grenadeFollowThrough??=new M02GrenadeFollowThrough();
    this.grenadeFollowThrough.restore();
    const record = { clock:sim.clock, player:{...sim.player,moveBlend:sim.player.moving?1:0},
      world:{revision:sim.world.revision,obstacles:sim.world.obstacles},
      weapon:Object.assign(Object.create(Object.getPrototypeOf(sim.weapon)), sim.weapon),
      renderState:{weaponVisible:sim.player.health>0} };
    this.visualWorld ??= {};
    Object.assign(this.visualWorld, record.world); record.world=this.visualWorld;
    const ready=this.weapon.update(record, quality, sim.weapon.lastShot/1000+.08, {camera:this.camera, viewFov:this.weaponCamera.fov});
    const throwAt=this.grenadeFollowThrough.startedAt;
    const eligible=ready&&sim.player.health>0&&!sim.player.carryingVolumeId&&!sim.weapon.reloading&&!sim.weapon.boltCycling&&
      !(throwAt!==null&&sim.weapon.lastShot/1000>=throwAt);
    this.grenadeFollowThroughWeight=this.grenadeFollowThrough.apply(this.weapon.root,sim.clock,eligible);
    return ready;
  }
  renderWeapon(renderer) {
    if (!this.weapon.root?.visible) return;
    const autoClear=renderer.autoClear;
    renderer.autoClear=false; renderer.clearDepth();
    const camera=this.weaponCamera;camera.aspect=this.camera.aspect;camera.updateProjectionMatrix();
    renderer.render(this.weaponScene,camera); renderer.autoClear=autoClear;
  }
  consume(events, sim) {
    this.syncSession(sim);
    for (const event of events) {
      if(event.type==='grenade-thrown'&&event.throwerId===sim.player.id)(this.grenadeFollowThrough??=new M02GrenadeFollowThrough()).begin(event.clock);
      if (event.type==='actor-burst') {this.fireTimes.set(event.shooterId,event.clock);this.roundEvents.set(event.shooterId,{clock:event.clock,roundIndex:event.roundIndex??0});}
      const playerHit=event.type==='actor-burst'&&event.side==='enemy'&&event.traces?.some(trace=>trace.hitKind==='actor'&&trace.hitId===sim.player.id);
      const blastHit=event.type==='grenade-exploded'&&event.affectedActors?.some(actor=>actor.id===sim.player.id&&actor.damage>0);
      if(playerHit||blastHit){
        const source=event.origin??event.center,direction=this.spatial(source,sim).pan;
        this.feedback?.playerHit(event.clock??sim.clock,direction);
        if(Number.isFinite(source?.x)&&Number.isFinite(source?.z))this.damageSource={x:source.x,z:source.z,clock:event.clock??sim.clock};
      }
      // A trusted gesture may still be resuming the context. Web Audio accepts
      // scheduled voices while suspended; dropping this event loses the first shot.
      if (!this.audio.ctx || this.audio.ctx.state==='closed') continue;
      const origin=event.origin??event.shot?.origin??event.center??sim.player;
      const shooter=event.shooterId?sim.enemies.find(a=>a.id===event.shooterId)??sim.allies.find(a=>a.id===event.shooterId):null;
      const occluded=shooter&&!sim.world.lineOfSight(sim.player,shooter,{includeFoliage:false});
      this.audio.setOcclusion(occluded?{hz:1200,gain:.4}:null);
      const dx=origin.x-sim.player.x, dz=origin.z-sim.player.z;
      const distance=Math.hypot(dx,dz);
      const pan=Math.sin(Math.atan2(dz,dx)-sim.player.angle);
      if (event.type==='shot-fired') {
        this.audio.wz29Shot(); this.audio.wz29Mechanism('bolt',`bolt:${sim.weapon.shotCount}`);
      }
      if (event.type==='actor-burst') this.audio.weaponFire(event.weapon,pan,distance,{rounds:event.rounds,interval:event.interval,key:`${event.burstId??event.shooterId}:${event.roundIndex??event.clock}`,source:event.shooterId});
      if(event.type==='horizon-acoustic-boom'){
        const source=sim.horizon.hsA2.events.find(e=>e.id===event.eventId);
        const spatial=this.spatial(source,sim);this.audio.distantBattle('artillery',spatial.pan,spatial.distance,`horizon:${event.eventId}`);
      }
      if (event.type==='mg-burst')this.audio.mg34Burst(pan,distance,event.rounds??3,.09,`mg:${event.clock}`);
      if (event.type==='grenade-exploded') this.audio.explosion(pan,distance);
      this.audio.setOcclusion(null);
      // Only the actual hit victim (not the intended target) receives the
      // high-priority M01 body cue. Cover and friendly casualties stay silent.
      if(playerHit)this.audio.hit(`m02-hit:${event.burstId}:${event.roundIndex}`);
      if(blastHit)this.audio.hit(`m02-blast-hit:${event.clock}`);
      if(event.type==='player-landing'&&event.damage>0)this.audio.landing(event.speed,event.surface,`m02-landing:${event.clock}`);
      if(event.type==='rifle-ammo-collected')this.audio.wz29Mechanism('magazine',`m02-ammo:${event.actorId}:${event.clock}`);
      if(event.type==='actor-reload-cue')playM02NpcReloadAudio(this.audio,event,sim,this.spatial.bind(this));
      // Impacts and passing rounds have their own locations; the shooter's
      // occlusion and panning do not describe where a bullet lands.
      if(event.type==='shot-fired')playM02RoundAudio(this.audio,event.shot,sim,this.spatial.bind(this),event.shot?.id??`player:${sim.clock}`);
      if(event.type==='actor-burst')for(const [i,trace] of (event.traces??[]).entries()){
        playM02RoundAudio(this.audio,trace,sim,this.spatial.bind(this),`${event.burstId??event.shooterId}:${event.roundIndex??event.clock}:${i}`,{nearPass:event.side==='enemy'});
      }

    }
  }
  get diagnostics() {
    return {characters:this.characters.stats, loadedModels:[...this.characters.sources.keys()], clips:this.characters.clips.size, failures:this.characters.assets.failures,
      weapon:this.weapon.stats, grenadeFollowThrough:{startedAt:this.grenadeFollowThrough?.startedAt??null,weight:this.grenadeFollowThroughWeight??0}, weaponLighting:this.weaponLighting.state, audio:this.audio.diagnostics,footsteps:this.footsteps.diagnostics};
  }
}
