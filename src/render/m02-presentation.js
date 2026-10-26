import * as THREE from 'three';
import { M01Characters } from './m01-characters.js';
import { M01ViewModel } from './m01-viewmodel.js';
import { WEAPON_PROFILES } from '../game/m02-combat-ai.js';
import { AudioManager } from '../core/audio.js';
import {M02Weapons} from './m02-weapons.js';
import {WeaponLighting} from './first-person-weapon-fx.js';

// Translated actors and weapon records belong to presentation. The shared renderers
// read the collision layout; they never decide M02 combat or advance its clock.
export function m02VisualActor(actor, team, clock) {
  const surrendered = actor.state === 'SURRENDERED';
  const wounded = actor.state === 'WOUNDED_UNARMED'||actor.state==='WOUNDED_LIAISON';
  return { ...actor, team, active: !actor.detachedOutOfCell,
    id: actor.weapon === 'rkm_wz28' ? 'szymon_kowal' : actor.id,
    role: wounded || surrendered || actor.role==='medic'||actor.state==='WALKING_SUPPORTED'||actor.state==='EVACUATED_B12' ? 'MEDIC' : 'RIFLEMAN',
    state: wounded ? 'WOUNDED' : actor.moving ? 'ADVANCE' : actor.shot > 0 ? 'SUPPRESS' : 'GUARD',
    posture: actor.crouched ? 'crouch' : 'stand',
    pose: actor.state==='EVACUATED_B12'?'seated':actor.pose,
    shot: actor.shot ?? (clock - (actor.lastShotAt ?? -Infinity) < .15 ? .15 : 0),
    reload: actor.reloadingUntil > clock ? {startedAt:actor.reloadingUntil-(WEAPON_PROFILES[actor.weapon]?.reloadSec??2.8)} : null,
    motion: { speed: actor.moving ? (actor.speed ?? (actor.suppressed>.55?2.6:4.1)) : 0 },
  };
}

export class M02Presentation {
  constructor(scene, camera, sim) {
    this.camera = camera;
    this.weaponCamera = new THREE.PerspectiveCamera(68,1,.01,20);
    this.fireTimes = new Map();
    this.stepAt = 0;
    this.characters = new M01Characters(scene, { ik:false });
    this.weaponScene = new THREE.Scene();
    this.weaponLighting=new WeaponLighting(this.weaponScene);
    // M01 viewmodel lives in camera space and has its own depth pass.
    this.weapon = new M01ViewModel(this.weaponScene, this.characters);
    this.audio = new AudioManager({quality:'medium'});
    this.m02Weapons=new M02Weapons();
    this.ready = Promise.all([this.characters.load('medium'),this.m02Weapons.ready]);
    this.ids = new Map();
    this.resetClock = sim.clock;
  }
  unlockAudio() { this.audio.init(); }
  update(sim, quality) {
    if (sim.clock < this.resetClock) { this.audio.resetPresentation(sim.clock); this.fireTimes.clear(); this.stepAt=sim.clock; }
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
    for (const [list, team] of [[sim.allies,'ally'],[sim.enemies,'enemy'],[(sim.areaC?.c10Started?sim.areaC.lastGroup:[]).filter(a=>!a.evacuated).map(a=>({...a,state:a.wounded?'WOUNDED_UNARMED':'ACTIVE',weapon:'wz29'})),'ally']]) {
      for (const actor of list ?? []) {
        // Preserve Claude's explicit hands-up surrender pose, not an armed idle.
        if (actor.state === 'SURRENDERED') continue;
        const visual = m02VisualActor(actor, team, sim.clock);
        if (actor.weapon==='mg34') visual.id=`de_east_${mgIndex++}`;
        const profile=WEAPON_PROFILES[actor.weapon];
        const firedAt=actor.shotsFired>0&&profile?actor.nextFireAt-profile.cycleSec:this.fireTimes.get(actor.id)??-1e9;
        visual.firedAt=firedAt; visual.shot=Math.max(0,.2-(sim.clock-firedAt));
        visual.suppressedUntil=actor.suppressed>.4?sim.clock+.1:0;
        this.ids.set(actor.id, visual.id); actors.push(visual);
      }
    }
    this.characters.update(actors, sim.clock, {...sim.player}, quality);
    this.m02Weapons.update(this.characters,actors);
    if (this.audio.ctx?.state==='running' && sim.player.moving && sim.clock>=this.stepAt) {
      this.audio.footstep('earth', {pace:sim.player.sprinting?'run':'walk'});
      this.stepAt=sim.clock+(sim.player.sprinting?.28:.5);
    }
  }
  spatial(point,sim) {
    if(!point)return {pan:0,distance:900,front:1};
    const x=point.x-sim.player.x,z=point.z-sim.player.z;
    const angle=Math.atan2(z,x)-sim.player.angle;
    return {pan:Math.sin(angle),distance:Math.hypot(x,z),front:Math.cos(angle)};
  }
  hasCharacter(id) { return this.characters.instances.has(this.ids.get(id)); }
  updateWeapon(sim, quality) {
    const record = { clock:sim.clock, player:{...sim.player,moveBlend:sim.player.moving?1:0},
      world:{revision:sim.world.revision,obstacles:sim.world.obstacles},
      weapon:Object.assign(Object.create(Object.getPrototypeOf(sim.weapon)), sim.weapon),
      renderState:{weaponVisible:sim.player.health>0} };
    this.visualWorld ??= {};
    Object.assign(this.visualWorld, record.world); record.world=this.visualWorld;
    return this.weapon.update(record, quality, sim.weapon.lastShot/1000+.08, {camera:this.camera, viewFov:68});
  }
  renderWeapon(renderer) {
    if (!this.weapon.root?.visible) return;
    const autoClear=renderer.autoClear;
    renderer.autoClear=false; renderer.clearDepth();
    const camera=this.weaponCamera; camera.fov=this.camera.fov; camera.aspect=this.camera.aspect; camera.updateProjectionMatrix();
    renderer.render(this.weaponScene,camera); renderer.autoClear=autoClear;
  }
  consume(events, sim) {
    for (const event of events) {
      if (event.type==='actor-burst') this.fireTimes.set(event.shooterId,sim.clock);
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
        if (event.shot?.blockedBySolid) this.audio.impact(event.shot.material??'earth',pan,event.shot.distance??distance);
      }
      if (event.type==='actor-burst') this.audio.weaponFire(event.weapon,pan,distance,{rounds:event.rounds,key:`${event.shooterId}:${event.clock}`,source:event.shooterId});
      if(event.type==='horizon-acoustic-boom'){
        const source=sim.horizon.hsA2.events.find(e=>e.id===event.eventId);
        const spatial=this.spatial(source,sim);this.audio.distantBattle('artillery',spatial.pan,spatial.distance,`horizon:${event.eventId}`);
      }
      if (event.type==='mg-burst')this.audio.mg34Burst(pan,distance,event.rounds??3,.09,`mg:${event.clock}`);
      if (event.type==='grenade-exploded') this.audio.explosion(pan,distance);
      this.audio.setOcclusion(null);

    }
  }
  get diagnostics() {
    return {characters:this.characters.stats, loadedModels:[...this.characters.sources.keys()], clips:this.characters.clips.size, failures:this.characters.assets.failures,
      weapon:this.weapon.stats, weaponLighting:this.weaponLighting.state, audio:this.audio.diagnostics};
  }
}
