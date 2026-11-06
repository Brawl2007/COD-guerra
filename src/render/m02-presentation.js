// M02 «Operação Bzura» — apresentação. Merge M02 único (2026-11-06): este módulo junta as DUAS camadas de apresentação que as
// linhas Claude e Codex criaram com o mesmo nome de ficheiro, sem duplicar responsabilidades:
//   1) M02PresentationFeed (Claude, secção L do PDF): consome eventos -> legendas, indicadores direcionais, aviso de explosão D5 e
//      pedidos de áudio placeholder (só os que o áudio M01 abaixo não cobre: aviso de explosão e portas; ver m02-01-main.js).
//   2) M02Presentation (Codex): personagens GLB da M01, arma em primeira pessoa (M01ViewModel), gestos de granada e de água (C04),
//      feedback de dano e o áudio M01 partilhado (AudioManager) dos tiros, rondas, granadas, recargas, passos e água.
// Nenhuma das duas decide dano, visibilidade, eventos ou estado da missão: só LEEM a simulação.

import * as THREE from 'three';
import {M02Characters} from './m02-character-adapter.js';
import { M01ViewModel } from './m01-viewmodel.js';
import { WEAPON_PROFILES } from '../game/m02-combat-ai.js';
import {m02ActorPresent} from '../game/m02-actor-presence.js';
import { AudioManager } from '../core/audio.js';
import {M02Weapons} from './m02-weapons.js';
import {WeaponLighting} from './first-person-weapon-fx.js';
import {WZ29_VISUAL} from './m01-wz29-presentation.js';
import {M02Footsteps} from './m02-footsteps.js';
import {playM02RoundAudio} from './m02-round-audio.js';
import {M01CombatFeedback} from './m01-combat-feedback.js';
import {M02GrenadeFollowThrough} from './m02-grenade-follow-through.js';
import {M02GrenadePreparation} from './m02-grenade-preparation.js';
import {m02CanteenGeometry} from './m02-canteen.js';
import {playM02NpcReloadAudio} from './m02-npc-reload-audio.js';
import {playM02GrenadeBounce,playM02GrenadeHandling} from './m02-grenade-audio.js';
import {playM02WaterHandling} from './m02-water-audio.js';
import { computeSpatialAudioParams, MATERIAL_IMPACT_AUDIO_MAP } from '../game/m02-audiovisual-director.js';
import { eyePosition } from '../world/spatial.js';

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
  return { ...actor, team, active: m02ActorPresent(actor),
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
  constructor(scene, camera, sim, {grenadeGeometry=null,grenadeMaterial=null}={}) {
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
    this.grenadePreparation=new M02GrenadePreparation(grenadeGeometry,grenadeMaterial);
    this.waterGeometry=m02CanteenGeometry();this.waterPreparation=new M02GrenadePreparation(this.waterGeometry,grenadeMaterial);
    if(this.waterPreparation.mesh)this.waterPreparation.mesh.name='M02 provisional canteen in hand';
    this.grenadeWarning=null;
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
      this.grenadePreparation?.reset();
      this.waterPreparation?.reset();
      // A checkpoint can be made just after the projectile left the hand.
      // Its optional release view identifies the player's new-style throw;
      // rebuild only the remaining arm motion and retain rifle priority.
      if(!sim.playerGrenadeAction&&sim.player.health>0&&!sim.player.carryingVolumeId&&!sim.weapon.reloading&&!sim.weapon.boltCycling){
        let recent=null;
        for(const g of sim.grenades??[])if(g.releaseView&&sim.clock>=g.spawnedAt-.001&&sim.clock-g.spawnedAt<.45&&
          sim.weapon.lastShot/1000<g.spawnedAt&&(!recent||g.spawnedAt>recent.spawnedAt))recent=g;
        if(recent)this.grenadeFollowThrough?.begin(Math.min(sim.clock,recent.spawnedAt));
      }
      this.grenadeWarning=null;
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
    if(this.audio.ctx?.state==='running')this.footsteps.update(sim.player,actors,sim.clock,sim.world);else this.footsteps.reset();
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
    this.grenadePreparation?.restore();
    this.waterPreparation?.restore();
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
    this.grenadePreparationState=ready&&sim.player.health>0?this.grenadePreparation?.apply(this.weapon,sim.playerGrenadeAction,sim.clock)??null:null;
    const water=sim.playerWaterAction;
    this.waterPreparationState=ready&&sim.player.health>0&&water?this.waterPreparation?.apply(this.weapon,{startedAt:water.startedAt,releaseAt:water.finishAt},sim.clock)??null:null;
    this.grenadeFollowThroughWeight=this.grenadeFollowThrough.apply(this.weapon.root,sim.clock,eligible&&!this.grenadePreparationState&&!this.waterPreparationState);
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
      if(event.type==='grenade-warning'&&event.heardByPlayer)this.grenadeWarning={clock:event.clock,name:event.actorName,perception:event.perception};
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
      if(event.type==='grenade-bounced')playM02GrenadeBounce(this.audio,event,sim,this.spatial.bind(this));
      if(event.type==='grenade-handling-started')playM02GrenadeHandling(this.audio,event,sim);
      if(event.type==='c04-water-started')playM02WaterHandling(this.audio,event,sim);
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
      weapon:this.weapon.stats, grenadePreparation:this.grenadePreparationState??null,waterPreparation:this.waterPreparationState??null,grenadeFollowThrough:{startedAt:this.grenadeFollowThrough?.startedAt??null,weight:this.grenadeFollowThroughWeight??0}, weaponLighting:this.weaponLighting.state, audio:this.audio.diagnostics,footsteps:this.footsteps.diagnostics};
  }
}


// ——— Camada de eventos para legendas/indicadores/áudio placeholder (linha Claude) ———

// M02 «Operação Bzura» — consumidores de APRESENTAÇÃO dos eventos da simulação e do diretor audiovisual (secção L do PDF, pp. 41-43; auditoria L.md).
// Módulo PURO (sem Three.js, sem DOM, sem AudioContext): converte eventos/estado em indicadores direcionais, legendas PT e pedidos de áudio placeholder.
// FRONTEIRA: só LÊ a simulação (sim.hazardBlasts, sim.horizon, sim.player, sim.audiovisual). Nunca escreve na simulação, no diretor nem no snapshot:
// o diretor guarda spatialAudioLog/directionalIndicators no snapshot (SAVE-01), por isso aqui os parâmetros acústicos vêm de computeSpatialAudioParams (puro).
// Tudo em METROS (x/z solo). Bearing: 0 = em frente, positivo = à direita (sentido horário visto de cima).

export const SUBTITLE_TTL_SEC = 3.6;
export const MAX_SUBTITLES = 3;
export const BURST_RATE_LIMIT_SEC = 0.9; // no máximo uma legenda/aviso por categoria de rajada neste intervalo (evita encher o ecrã)
export const FIRE_INDICATOR_TTL_SEC = 2.2; // igual à validade dos indicadores do diretor
export const FIRE_AUDIBLE_MAX_M = 700; // fogo mais longe que isto não gera legenda nem indicador (continua visível como traçante, se existir)
export const BLAST_LINGER_SEC = 0.35; // o aviso persiste este tempo depois do impacto agendado, para não piscar no tick da explosão

/** Ângulo (rad, em (−π, π]) da fonte (x, z) relativo ao jogador: 0 = em frente, positivo = à direita. Convenção do jogo: olhar = (cos a, sin a) em (x, z). */
export function relativeBearingRad(player, x, z) {
  const world = Math.atan2(z - player.z, x - player.x);
  let rel = world - player.angle;
  rel = ((rel + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return rel === -Math.PI ? Math.PI : rel;
}

const BEARING_WORDS = Object.freeze([
  'à frente',
  'à frente, à direita',
  'à direita',
  'atrás, à direita',
  'atrás',
  'atrás, à esquerda',
  'à esquerda',
  'à frente, à esquerda',
]);

/** Palavra PT-PT do setor (8 de 45°) onde está a fonte, para as legendas. */
export function bearingWord(relRad) {
  const sector = Math.round(relRad / (Math.PI / 4));
  return BEARING_WORDS[((sector % 8) + 8) % 8];
}

/** Pan estéreo −1 (esquerda) .. +1 (direita) a partir do ângulo relativo (seno: frente/trás ficam centrados). */
export function panFromBearing(relRad) {
  return Math.max(-1, Math.min(1, Math.sin(relRad)));
}

/**
 * Tabela evento -> consumidor. Cada tipo de evento emitido pela simulação (ou pelo horizonte) tem de aparecer aqui, com o consumidor REAL ou a razão de não ter
 * consumidor próprio. Verificada por tests/m02-23-presentation-consumers.test.js contra o código-fonte da simulação: um evento novo sem entrada faz o teste falhar.
 * consumer: 'renderer' (m02-01-renderer.js), 'presentation' (este módulo -> HUD/áudio placeholder em m02-01-main.js), 'hud' (m02-01-main.js lê o estado),
 *           'state-only' (o efeito é um estado já mostrado noutro sítio; sem apresentação própria do evento).
 */
export const EVENT_CONSUMERS = Object.freeze({
  'shot-fired': Object.freeze({ consumer: 'renderer+presentation', note: 'traçante (renderer) e áudio placeholder do tiro próprio; impacto pelo log do diretor' }),
  'actor-burst': Object.freeze({ consumer: 'renderer+presentation', note: 'traçante (renderer); fogo inimigo gera indicador direcional, legenda e áudio' }),
  // Merge M02 único: eventos da linha Codex, consumidos por M02Presentation (acima) e pelo HUD.
  'grenade-preparing': Object.freeze({ consumer: 'presentation+hud', note: 'granada reservada: braço M01 a preparar (M02GrenadePreparation) e HUD «preparando/em espera»' }),
  'grenade-handling-started': Object.freeze({ consumer: 'presentation', note: 'som causal do manuseamento da granada no instante real em que a mão larga a arma' }),
  'grenade-bounced': Object.freeze({ consumer: 'presentation', note: 'som do ressalto físico da granada (material e velocidade do impacto; abaixo de 1,2 m/s não há evento)' }),
  'actor-reload-cue': Object.freeze({ consumer: 'presentation', note: 'som das fases reais da recarga de um NPC (abrir, assentar, fechar), espacializado' }),
  'grenade-warning': Object.freeze({ consumer: 'presentation+hud', note: 'aviso «Granada!» de um soldado que viu/ouviu a granada; o HUD mostra-o se o jogador o ouviu' }),
  'rifle-ammo-collected': Object.freeze({ consumer: 'presentation', note: 'som do carregador ao recolher munição de 7,92 mm de um caído (transferida, nunca criada)' }),
  'mg-burst': Object.freeze({ consumer: 'renderer+presentation', note: 'traçante (renderer); rajada da MG34 gera indicador direcional, legenda e áudio' }),
  'grenade-thrown': Object.freeze({ consumer: 'presentation', note: 'áudio placeholder do lançamento; o voo não é simulado' }),
  'grenade-exploded': Object.freeze({ consumer: 'renderer+presentation', note: 'esfera de clarão (renderer); legenda, indicador e áudio' }),
  'blast-warning': Object.freeze({ consumer: 'presentation', note: 'aviso 5-8 s: indicador direcional e contagem no HUD, legenda e áudio crítico (sem atraso)' }),
  'horizon-flash': Object.freeze({ consumer: 'renderer', note: 'clarão desenhado por estado (sim.horizon.hsA2); a legenda/áudio chegam com o estrondo' }),
  'horizon-acoustic-boom': Object.freeze({ consumer: 'presentation', note: 'estrondo distante com atraso d/343 m/s: legenda e áudio placeholder' }),
  'horizon-actor-promoted': Object.freeze({ consumer: 'renderer', note: 'LOD do ator distante lido por estado a cada frame' }),
  'horizon-actor-demoted': Object.freeze({ consumer: 'renderer', note: 'LOD do ator distante lido por estado a cada frame' }),
  'temporal-state-changed': Object.freeze({ consumer: 'renderer', note: 'renderFrame sincroniza o preset de luz com sim.horizon.lightingPreset' }),
  'door-toggled': Object.freeze({ consumer: 'renderer+presentation', note: 'abertura redesenhada pela revisão do mundo; áudio placeholder da porta' }),
  'player-landing': Object.freeze({ consumer: 'presentation', note: 'áudio placeholder da aterragem; o dano é decidido pela simulação' }),
  'dialogue-line': Object.freeze({ consumer: 'hud', note: 'faixa de diálogo (legenda PT) lida de sim.dialogue.activeLine' }),
  'dialogue-line-dropped': Object.freeze({ consumer: 'state-only', note: 'linha descartada pela simulação; nada a mostrar' }),
  'scene-changed': Object.freeze({ consumer: 'hud', note: 'objetivo/cena no HUD lidos do estado' }),
  'transition-tab': Object.freeze({ consumer: 'hud', note: 'cartela lida de sim.activeCartela' }),
  'squad-order': Object.freeze({ consumer: 'hud', note: 'linha «Ordem à secção» lida do estado' }),
  'squad-order-rejected': Object.freeze({ consumer: 'hud', note: 'recusa e motivo na linha «Ordem à secção»' }),
  'squad-order-lapsed': Object.freeze({ consumer: 'hud', note: 'a ordem caduca no estado; a linha de ordem reflete-o' }),
  'checkpoint-saved': Object.freeze({ consumer: 'hud', note: 'aviso de saves lido de sim.lastCheckpointPersist' }),
  'checkpoint-rejected': Object.freeze({ consumer: 'hud', note: 'aviso de saves lido de sim.lastCheckpointPersist' }),
  restored: Object.freeze({ consumer: 'renderer+presentation', note: 'o renderer reconstrói pela revisão do mundo; a apresentação descarta legendas, indicadores e áudio pendentes' }),
  'mission-failed': Object.freeze({ consumer: 'hud', note: 'ecrã de falha lido de sim.missionFailed' }),
  // D1 socorro quando seguro: a linha «Socorro (D1)» e o aviso [E] da bancada leem sim.rescueStatus() / sim.currentRescuePrompt() a cada frame
  'rescue-window-opened': Object.freeze({ consumer: 'hud', note: 'janela de socorro: linha «Socorro (D1)» lida de sim.rescueStatus()' }),
  'rescue-started': Object.freeze({ consumer: 'hud', note: 'quem socorre e a contagem de levantar vêm de sim.rescueStatus()/currentRescuePrompt()' }),
  'rescue-aborted': Object.freeze({ consumer: 'hud', note: 'socorro interrompido (local inseguro, socorrista caído ou afastado): o estado da janela reflete-o' }),
  'ally-rescued': Object.freeze({ consumer: 'state-only', note: 'o aliado volta a estar de pé pelo estado; sem cue próprio (pendente do áudio)' }),
  'rescue-window-expired': Object.freeze({ consumer: 'hud', note: 'prazo esgotado: a linha de socorro desaparece e, para Gruca, o ecrã de falha lê sim.missionFailed' }),
  'mission-restarted': Object.freeze({ consumer: 'hud+presentation', note: 'o ecrã de falha desaparece pelo estado; a apresentação descarta legendas e áudio pendentes' }),
  'supply-volume-picked': Object.freeze({ consumer: 'hud', note: 'prompt de volume lido de sim.currentVolumePrompt()' }),
  'supply-volumes-abandoned': Object.freeze({ consumer: 'state-only', note: 'estado dos volumes lido pelo renderer (cena B)' }),
  'c04-wounded-marked': Object.freeze({ consumer: 'state-only', note: 'marca de giz lida pelo prompt de giz do HUD' }),
  'cart-shaft-broken': Object.freeze({ consumer: 'state-only', note: 'carroça redesenhada pelo estado (sem cue próprio; pendente do áudio de carroça)' }),
});

const OWN_SHOT_CUE = Object.freeze({ cueId: 'sfx_player_shot_placeholder', family: 'weapon' });

/**
 * Alimenta o HUD e o áudio placeholder a partir dos eventos de um frame e do estado da simulação. Uma instância por bancada.
 * `ingest(sim, events)` consome os eventos; `view(sim)` devolve o modelo de vista (indicadores, avisos de explosão, legendas, estado da arma, zumbido);
 * `drainAudio(out)` entrega os pedidos de áudio pendentes. Nada escreve na simulação.
 */
export class M02PresentationFeed {
  constructor() {
    this.reset();
  }

  reset() {
    this.subtitles = []; // { text, expiresAt, category }
    this.fireIndicators = []; // { x, z, category, expiresAt }
    this.audioQueue = []; // pedidos de áudio placeholder pendentes
    this.lastBurstAt = Object.create(null);
    this.lastAudioRecord = null;
    this.lastAudioClock = -Infinity;
    this.logBaselinePending = true; // o 1.º ingestDirectorLog só fixa a linha de base (um restauro não reproduz o passado)
    this.announcedBlasts = new Set();
    this.counters = { subtitlesShown: 0, audioRequests: 0, blastWarningsSeen: 0 };
  }

  #subtitle(sim, text, category, ttl = SUBTITLE_TTL_SEC) {
    if (!sim.audiovisual?.accessibility.subtitlesEnabled) return;
    const same = this.subtitles.find((s) => s.text === text);
    if (same) {
      same.expiresAt = Math.max(same.expiresAt, sim.clock + ttl); // a mesma legenda renova-se em vez de se repetir no ecrã
      return;
    }
    this.subtitles.push({ text, expiresAt: sim.clock + ttl, category });
    if (this.subtitles.length > MAX_SUBTITLES) this.subtitles.shift();
    this.counters.subtitlesShown++;
  }

  #audio(cue) {
    this.audioQueue.push(cue);
    this.counters.audioRequests++;
  }

  #rateLimited(sim, category) {
    const last = this.lastBurstAt[category];
    if (last !== undefined && sim.clock - last < BURST_RATE_LIMIT_SEC && sim.clock >= last) return true;
    this.lastBurstAt[category] = sim.clock;
    return false;
  }

  #spatialCue(sim, sourcePos, { cueId, category, family, critical = false }) {
    const eye = eyePosition(sim.player);
    const p = computeSpatialAudioParams(sim.world, eye, sourcePos, {
      isCriticalWarning: critical,
      reducedDynamicRange: sim.audiovisual?.accessibility.reducedDynamicRange ?? false,
    });
    const rel = relativeBearingRad(sim.player, sourcePos.x, sourcePos.z);
    this.#audio({
      cueId,
      category,
      family,
      scale: p.scale,
      distanceM: Number(p.dist.toFixed(1)),
      delaySec: p.delaySec,
      gain: p.gainMultiplier,
      lowPassHz: p.lowPassHz,
      pan: Number(panFromBearing(rel).toFixed(3)),
      critical,
      placeholder: true,
    });
    return { params: p, rel };
  }

  /** Consome os eventos de um frame (renderer.frameEvents). Seguro com lista vazia. */
  ingest(sim, events) {
    for (const evt of events) {
      switch (evt.type) {
        case 'blast-warning': {
          this.counters.blastWarningsSeen++;
          this.announcedBlasts.add(evt.blastId);
          const { params, rel } = this.#spatialCue(sim, evt.position, { cueId: 'sfx_blast_warning_placeholder', category: 'blast_warning', family: 'warning', critical: true });
          const secs = Math.max(1, Math.ceil(evt.warningSec));
          this.#subtitle(sim, `[Aviso: explosão iminente ${bearingWord(rel)}, a ${Math.round(params.dist)} m, daqui a ${secs} s]`, 'blast_warning', Math.max(SUBTITLE_TTL_SEC, evt.warningSec));
          break;
        }
        case 'grenade-exploded': {
          if (!evt.center) break;
          const { rel } = this.#spatialCue(sim, evt.center, { cueId: MATERIAL_IMPACT_AUDIO_MAP.earth.cueId, category: 'explosion_detonation', family: 'explosion' });
          this.#subtitle(sim, `[Explosão ${bearingWord(rel)}]`, 'explosion');
          this.fireIndicators.push({ x: evt.center.x, z: evt.center.z, category: 'explosion_detonation', expiresAt: sim.clock + FIRE_INDICATOR_TTL_SEC });
          break;
        }
        case 'mg-burst':
        case 'actor-burst': {
          if (!evt.origin) break;
          const ally = evt.type === 'actor-burst' && evt.side === 'ally';
          const category = ally ? 'ally_fire' : 'enemy_fire';
          if (Math.hypot(evt.origin.x - sim.player.x, evt.origin.z - sim.player.z) > FIRE_AUDIBLE_MAX_M) break;
          if (this.#rateLimited(sim, `${category}:${evt.type === 'mg-burst' ? evt.sourceId : bearingWord(relativeBearingRad(sim.player, evt.origin.x, evt.origin.z))}`)) break;
          const { rel } = this.#spatialCue(sim, evt.origin, { cueId: ally ? 'sfx_ally_fire_placeholder' : 'sfx_enemy_fire_placeholder', category, family: 'weapon' });
          const what = evt.type === 'mg-burst' ? 'Rajada de MG34' : ally ? 'Tiros da secção polaca' : 'Fogo inimigo';
          this.#subtitle(sim, `[${what} ${bearingWord(rel)}]`, category);
          if (!ally) this.fireIndicators.push({ x: evt.origin.x, z: evt.origin.z, category: 'enemy_fire', expiresAt: sim.clock + FIRE_INDICATOR_TTL_SEC });
          break;
        }
        case 'shot-fired': {
          this.#audio({ cueId: OWN_SHOT_CUE.cueId, category: 'own_shot', family: OWN_SHOT_CUE.family, scale: 'close_mechanical', distanceM: 0, delaySec: 0, gain: 1, lowPassHz: 18000, pan: 0, critical: false, placeholder: true });
          break;
        }
        case 'grenade-thrown':
          this.#audio({ cueId: 'sfx_grenade_throw_placeholder', category: 'own_action', family: 'weapon', scale: 'close_mechanical', distanceM: 0, delaySec: 0, gain: 0.8, lowPassHz: 18000, pan: 0, critical: false, placeholder: true });
          break;
        case 'door-toggled': {
          const door = sim.world.doors?.find((d) => d.id === evt.doorId) ?? null;
          const src = door?.center ? { x: door.center.x, y: 1.1, z: door.center.z } : { x: sim.player.x, y: 1.1, z: sim.player.z };
          this.#spatialCue(sim, src, { cueId: evt.state === 'open' || evt.state === true ? 'sfx_door_open_placeholder' : 'sfx_door_close_placeholder', category: 'door', family: 'wood' });
          break;
        }
        case 'player-landing':
          this.#audio({ cueId: 'sfx_landing_placeholder', category: 'own_action', family: 'body', scale: 'close_mechanical', distanceM: 0, delaySec: 0, gain: 0.7, lowPassHz: 18000, pan: 0, critical: false, placeholder: true });
          break;
        case 'horizon-acoustic-boom': {
          const ev = sim.horizon?.hsA2.events.find((e) => e.id === evt.eventId);
          if (!ev) break;
          // O atraso d/343 já foi esperado pela simulação (o evento só nasce quando o som chega): sem atraso adicional aqui.
          const rel = relativeBearingRad(sim.player, ev.x, ev.z);
          this.#audio({
            cueId: 'sfx_distant_artillery_placeholder',
            category: 'distant_operation',
            family: 'explosion',
            scale: 'distant_operation',
            distanceM: Number(Math.hypot(ev.x - sim.player.x, ev.z - sim.player.z).toFixed(0)),
            delaySec: 0,
            gain: 0.55,
            lowPassHz: 900,
            pan: Number(panFromBearing(rel).toFixed(3)),
            critical: false,
            placeholder: true,
          });
          this.#subtitle(sim, `[Estrondo de artilharia distante ${bearingWord(rel)}]`, 'distant_operation');
          break;
        }
        case 'restored':
        case 'mission-restarted':
          // O relógio da simulação volta atrás: legendas, indicadores e cues pendentes pertencem à linha temporal anterior.
          this.subtitles.length = 0;
          this.fireIndicators.length = 0;
          this.audioQueue.length = 0;
          this.lastAudioRecord = null;
          this.logBaselinePending = true;
          break;
        default:
          break; // restantes tipos: ver EVENT_CONSUMERS (renderer, HUD por estado ou sem apresentação própria)
      }
    }
  }

  /**
   * Impactos balísticos do diretor (log do snapshot, só leitura): gera áudio com o material certo (metal não toca em terra). Os registos são identificados
   * por referência de objeto; depois de um restauro (log substituído) só entram os registos do instante atual.
   */
  ingestDirectorLog(sim) {
    const log = sim.audiovisual?.spatialAudioLog;
    if (!log) return;
    if (this.logBaselinePending) {
      this.logBaselinePending = false;
      this.lastAudioRecord = log.length ? log[log.length - 1] : null;
      this.lastAudioClock = this.lastAudioRecord ? this.lastAudioRecord.clock : -Infinity;
      return;
    }
    if (log.length === 0) return;
    let start = 0;
    const idx = this.lastAudioRecord ? log.lastIndexOf(this.lastAudioRecord) : -1;
    if (idx >= 0) start = idx + 1;
    else if (this.lastAudioRecord) start = log.findIndex((r) => r.clock >= sim.clock - 0.25 && r.clock > this.lastAudioClock - 1e-9);
    if (start < 0) start = log.length;
    for (let i = start; i < log.length; i++) {
      const r = log[i];
      if (r.category !== 'ballistic_impact') continue; // explosões têm o seu cue em ingest(); o resto não tem cue próprio
      this.#audio({
        cueId: r.cueId,
        category: r.category,
        family: r.surfaceFamily,
        scale: r.scale,
        distanceM: r.distanceM,
        delaySec: r.delaySec,
        gain: r.gainMultiplier,
        lowPassHz: r.lowPassHz,
        pan: Number(Math.max(-1, Math.min(1, Math.sin(r.azimuthRad - sim.player.angle))).toFixed(3)),
        critical: false,
        metallic: r.isMetallic,
        placeholder: true,
      });
    }
    this.lastAudioRecord = log[log.length - 1];
    this.lastAudioClock = this.lastAudioRecord.clock;
  }

  /** Move os pedidos de áudio pendentes para `out` (array do chamador, reutilizável) e limpa a fila. */
  drainAudio(out) {
    out.length = 0;
    for (const c of this.audioQueue) out.push(c);
    this.audioQueue.length = 0;
    return out;
  }

  /**
   * Modelo de vista do frame. `blastWarnings` vem do ESTADO (sim.hazardBlasts: sobrevive a restauros e checkpoints); `indicators` junta o fogo/explosões
   * recentes. O aviso crítico de explosão não depende das opções (só o indicador direcional depende de directionalIndicatorsEnabled).
   */
  view(sim) {
    const clock = sim.clock;
    this.subtitles = this.subtitles.filter((s) => clock < s.expiresAt && s.expiresAt - clock <= 60);
    this.fireIndicators = this.fireIndicators.filter((f) => clock < f.expiresAt && f.expiresAt - clock <= FIRE_INDICATOR_TTL_SEC + 1e-6);
    const acc = sim.audiovisual?.accessibility;
    const directional = acc?.directionalIndicatorsEnabled !== false;

    const blastWarnings = [];
    for (const blast of sim.hazardBlasts ?? []) {
      if (clock > blast.impactAt + BLAST_LINGER_SEC) continue;
      const distanceM = Math.hypot(blast.x - sim.player.x, blast.z - sim.player.z);
      const rel = relativeBearingRad(sim.player, blast.x, blast.z);
      blastWarnings.push({
        blastId: blast.id,
        remainingSec: Math.max(0, Number((blast.impactAt - clock).toFixed(2))),
        warningSec: blast.warningSec,
        distanceM: Number(distanceM.toFixed(1)),
        radiusM: blast.radius,
        relRad: rel,
        word: bearingWord(rel),
        directional,
      });
    }

    const indicators = [];
    if (directional) {
      for (const f of this.fireIndicators) {
        indicators.push({ category: f.category, relRad: relativeBearingRad(sim.player, f.x, f.z), remainingSec: Number((f.expiresAt - clock).toFixed(2)) });
      }
    }

    const wk = sim.audiovisual?.weaponKinematics;
    return {
      blastWarnings,
      indicators,
      subtitles: this.subtitles.map((s) => ({ text: s.text, category: s.category })),
      weapon: wk ? { state: wk.clearanceState, obstructionId: wk.obstructionId, lowerPitchRad: wk.lowerPitchRad, pullBackM: wk.pullBackM } : null,
      tinnitusLevel: sim.audiovisual?.cameraShake.tinnitusLevel ?? 0,
    };
  }
}

/**
 * Marcos L3 visíveis no centro da vista (±halfFovRad), para o rótulo «provisório» no HUD (ART-01: Tum só como volume de estudo rotulado).
 * `landmarks` = HORIZON_L3_LANDMARKS. Azimute desde o Norte (−Z), horário. Devolve rótulos; nunca decide visibilidade de jogo (só o que a câmara aponta).
 */
export function landmarksInView(player, landmarks, halfFovRad = (14 * Math.PI) / 180) {
  const out = [];
  for (const m of landmarks) {
    const az = (m.azimuthDeg * Math.PI) / 180;
    const dx = Math.sin(az);
    const dz = -Math.cos(az); // azimute 0 = norte = −Z
    const rel = relativeBearingRad({ x: 0, z: 0, angle: player.angle }, dx, dz);
    if (Math.abs(rel) <= halfFovRad) out.push({ id: m.id, label: m.label, relRad: rel, distanceM: m.distanceM, provisional: m.provisional });
  }
  return out;
}
