import { UNITS_PER_METRE } from '../config.js';
import { Input } from '../core/input.js';
import { AudioSystem } from '../core/audio.js';
import { Renderer } from '../render/three-renderer.js';
import { Simulation } from './simulation.js';
import { M01Simulation } from './m01-simulation.js';
import { M01HudPresenter, playerImpactSoundPlan } from '../ui/m01-hud.js';

const SAVE_KEY='cod-guerra:checkpoint:v1';
// These are the four aerial impacts emitted by M01. Schema 2 stores their IDs,
// so delayed presentation can be recovered without extending simulation/save data.
const AERIAL_BLAST_IDS=new Set(['station_bomb','forward_post','repair_crater','raid_0530']);
const blastScale=id=>id?.startsWith('m01_grenade_')?'small':id?.includes('demolition')?'demolition':'large';

export class Game {
  constructor(canvas,hud,onState=()=>{},missionId='m01_tczew'){
    this.canvas=canvas;this.hud=hud;this.onState=onState;this.m01Hud=new M01HudPresenter(hud);
    this.input=new Input(canvas);this.audio=new AudioSystem();this.renderer=new Renderer(canvas);this.audio.setQuality(this.renderer.quality);
    this.sim=missionId==='m01_tczew'?new M01Simulation():new Simulation();this.started=false;this.paused=true;this.disposed=false;
    if(this.isM01)this.renderer.prepareM01();
    this.last=performance.now();this.messageUntil=0;this.checkpointUntil=0;this.hitUntil=0;
    this.pendingSounds=[];this.pendingM01HitFeedback=null;this.frame=null;this.listeners=[];
    const listen=(target,type,callback)=>{target.addEventListener(type,callback);this.listeners.push(()=>target.removeEventListener(type,callback));};
    listen(window,'resize',()=>this.renderer.resize());
    listen(window,'blur',()=>this.pause());
    listen(document,'visibilitychange',()=>{if(document.hidden)this.pause();});
    listen(document,'pointerlockchange',()=>{
      if(document.pointerLockElement===canvas&&this.started&&!document.hidden){this.paused=false;this.canvas.focus();this.audio.init();this.onState('playing');}
      else if(this.started)this.pause();
    });
    listen(document,'pointerlockerror',()=>{this.pause();this.onState('control-error');});
    this.frame=requestAnimationFrame(now=>this.loop(now));
  }
  get player(){return this.sim.player;}
  get world(){return this.sim.world;}
  get weapon(){return this.sim.weapon;}
  get enemies(){return this.sim.enemies;}
  get allies(){return this.sim.allies;}
  get mission(){return this.sim.mission;}
  get isM01(){return this.sim.missionId==='m01_tczew';}
  get saveKey(){return this.isM01?'cod-guerra:checkpoint:m01:v2':SAVE_KEY;}
  get hasSave(){try{return Boolean(localStorage.getItem(this.saveKey));}catch{return false;}}
  selectMission(id){
    this.menu();this.sim=id==='m01_tczew'?new M01Simulation():new Simulation();this.pendingSounds=[];this.pendingM01HitFeedback=null;
    this.audio.resetPresentation?.(this.sim.clock,this.isM01?this.sim.renderState:null);
    this.messageUntil=0;this.hitUntil=0;this.checkpointUntil=0;this.renderer.resetEffects();
    this.m01Hud.clear();this.m01Hud.reset('new',this.sim.clock);
    if(this.isM01)this.renderer.prepareM01();this.onState('menu');
  }
  start({continueSaved=false}={}){
    if(this.started)return this.resume();
    if(continueSaved){
      let result;
      try{result=this.sim.loadCheckpoint(localStorage.getItem(this.saveKey));}catch(error){result={ok:false,error:error.message};}
      if(!result.ok){this.onState('save-error',result.error);return false;}
      this.m01Hud.reset('continue',this.sim.clock);
    }
    this.started=true;this.rebuildSounds();
    if(this.sim.mission.complete){this.onState('complete');return true;}
    this.audio.init();this.requestControl();return true;
  }
  requestControl(){
    if(this.disposed)return;
    try{const request=this.canvas.requestPointerLock();request?.catch(()=>{this.pause();this.onState('control-error');});}
    catch{this.pause();this.onState('control-error');}
  }
  resume(){if(!this.started||this.sim.mission.complete)return;this.audio.init();this.input.clear();this.requestControl();}
  pause(){
    this.paused=true;this.input.clear();this.audio.suspend?.();
    if(this.started&&!this.sim.mission.complete)this.onState('paused');
  }
  restartCheckpoint(){
    this.sim.restoreCheckpoint();this.rebuildSounds();this.messageUntil=0;this.hitUntil=0;this.pendingM01HitFeedback=null;this.m01Hud.reset('restore',this.sim.clock);
    this.renderer.resetEffects();this.input.clear();
    if(this.sim.mission.complete)this.onState('complete');else this.resume();
  }
  restartMission(){
    this.sim.reset();this.started=true;this.paused=true;this.pendingSounds=[];this.pendingM01HitFeedback=null;
    this.audio.resetPresentation?.(this.sim.clock,this.isM01?this.sim.renderState:null);
    this.messageUntil=0;this.checkpointUntil=0;this.hitUntil=0;this.m01Hud.reset('new',this.sim.clock);
    this.renderer.resetEffects();this.resume();
  }
  menu(){
    this.pause();this.started=false;this.input.clear();
    if(document.pointerLockElement===this.canvas)document.exitPointerLock();
    this.onState('menu');
  }
  loop(now){
    if(this.disposed)return;
    const dt=Math.min(.25,Math.max(0,(now-this.last)/1000));this.last=now;
    if(this.started&&!this.paused&&!document.hidden&&document.pointerLockElement===this.canvas){
      const controls={lookX:this.input.consumeLook(),lookY:this.input.consumeLookY(),
        forward:Number(this.input.down('KeyW'))-Number(this.input.down('KeyS')),
        side:Number(this.input.down('KeyD'))-Number(this.input.down('KeyA')),
        sprint:this.input.down('ShiftLeft')||this.input.down('ShiftRight'),aim:this.input.aim,
        fire:this.input.consumeFire(),reload:this.input.consumePressed('KeyR'),grenade:this.input.consumePressed('KeyG'),
        interact:this.input.consumePressed('KeyE'),skip:this.input.consumePressed('Space'),
        crouch:this.input.consumePressed('KeyC'),sight:this.input.consumePressed('KeyV')};
      // M01 catches up a slow rendered frame with bounded physics steps in this same loop.
      // Single-press actions and relative look are consumed once, never once per substep.
      let remaining=this.isM01?dt:Math.min(.05,dt),first=true;
      while(remaining>1e-7&&!this.paused){
        const step=Math.min(.05,remaining);
        this.sim.tick(step,first?controls:{...controls,lookX:0,lookY:0,fire:false,reload:false,grenade:false,interact:false,skip:false,crouch:false,sight:false});
        const events=this.sim.drainEvents();for(const event of events)this.handleEvent(event);
        remaining-=step;first=false;if(events.some(event=>event.type==='restored')||this.sim.mission.complete)break;
      }
      const due=this.pendingSounds.filter(sound=>sound.at<=this.sim.clock);
      this.pendingSounds=this.pendingSounds.filter(sound=>sound.at>this.sim.clock);
      due.forEach(sound=>{
        if(sound.kind==='fire'){
          if(this.isM01)this.audio.weaponFire(sound.weapon??'kar98k',sound.pan,sound.distance,{rounds:sound.rounds,interval:sound.interval,key:sound.key,front:sound.front,source:sound.source});
          else if(sound.weapon==='mg34')this.audio.mg34Burst(sound.pan,sound.distance,sound.rounds,sound.interval,sound.key);
          else this.audio.rifleShot(sound.pan,sound.distance,sound.weapon??'kar98k',sound.key);
          return;
        }
        if(sound.kind==='impact'){this.audio.impact(sound.material,sound.pan,sound.distance,sound.key);return;}
        if(sound.kind==='blast'){
          this.audio.explosion(sound.pan,sound.distance,{scale:sound.scale??'large',key:sound.key,front:sound.front});
          // Ju 87 a sair da picada: só depois de um sopro aéreo real, vindo de cima do ponto de impacto.
          if(sound.aerial&&this.isM01)this.audio.ju87PullOutNearest(this.sim.clock,point=>this.spatial(point),`${sound.key}:ju87`,this.sim.renderState.stukas);
        }
        else this.audio.explosion(sound.pan,sound.distance*UNITS_PER_METRE);
        if(sound.shake&&this.isM01)this.renderer.m01.blast(this.sim.clock);
      });
      if(this.isM01)this.audio.updateM01Presentation({clock:this.sim.clock,state:this.sim.renderState,spatial:point=>this.spatial(point),
        phase:this.sim.mission.phase,quality:this.renderer.quality});
    }
    if(this.isM01)this.renderer.renderMission(this.sim);
    else this.renderer.render(this.sim.world,this.sim.player,this.sim.combatants,this.sim.radio,
        this.sim.weapon,this.sim.grenades.active,this.sim.clock*1000,this.sim.sectors);
    this.updateHud();this.frame=requestAnimationFrame(time=>this.loop(time));
  }
  spatial(point){
    const dx=point.x-(this.isM01?this.sim.player.x:this.sim.player.x/UNITS_PER_METRE),
      dz=point.z-(this.isM01?this.sim.player.z:this.sim.player.y/UNITS_PER_METRE);
    const relative=Math.atan2(dz,dx)-this.sim.player.angle,dy=this.isM01&&Number.isFinite(point.y)?point.y-this.sim.player.y:0;
    // front = cos do ângulo relativo: o áudio escurece ligeiramente o que vem de trás. dy serve só a aviões (distância 3D).
    return {distance:Math.hypot(dx,dz),pan:Math.sin(relative),front:Math.cos(relative),dy};
  }
  handleEvent(event){
    const now=this.sim.clock*1000;
    if(this.isM01)return this.handleM01Event(event);
    if(event.type==='message')this.say(event.message);
    if(event.type==='reload'){this.audio.reload();this.say('RECARREGANDO');}
    if(event.type==='player-shot'){
      this.audio.shot();this.renderer.muzzle(now);
      if(event.point){this.renderer.impact(event.point.x*UNITS_PER_METRE,event.point.z*UNITS_PER_METRE,event.material,event.point.y,now);this.audio.impact(event.material);}
      if(event.hit)this.say('ACERTO',350);
    }
    if(event.type==='npc-shot'||event.type==='distant-shot'){
      const spatial=this.spatial(event.point);this.audio.shot(spatial.pan,spatial.distance>16);
    }
    if(event.type==='player-hit'){this.audio.hit();this.hitUntil=now+170;this.renderer.shake=5;}
    if(event.type==='explosion'){
      const spatial=this.spatial(event.point);this.audio.explosion(spatial.pan,spatial.distance*UNITS_PER_METRE);
      this.renderer.explosion(event.point.x*UNITS_PER_METRE,event.point.z*UNITS_PER_METRE,event.point.y,now);
    }
    if(event.type==='sector-impact'){
      const spatial=this.spatial(event.point);this.pendingSounds.push({...spatial,at:this.sim.clock+spatial.distance/343});
      this.say(event.message,2600);
    }
    if(event.type==='checkpoint'){
      this.checkpointUntil=now+2400;this.say('SGT. HALE: CONTATO À FRENTE!');this.persistCheckpoint();
    }
    if(event.type==='restored'){
      this.pendingSounds=[];this.renderer.resetEffects();this.input.clear();this.say('RETORNANDO AO ÚLTIMO CHECKPOINT');
    }
    if(event.type==='complete'){
      this.persistCheckpoint();this.pause();if(document.pointerLockElement===this.canvas)document.exitPointerLock();this.onState('complete');
    }
  }
  rebuildSounds(){
    this.pendingSounds=[];this.audio.resetPresentation?.(this.sim.clock,this.isM01?this.sim.renderState:null);if(!this.isM01)return;
    for(const damage of this.sim.sectors.damage)if(damage.soundAt>this.sim.clock){
      const s=this.spatial(damage),aerial=AERIAL_BLAST_IDS.has(damage.id);
      this.pendingSounds.push({...s,at:damage.soundAt,kind:'blast',scale:blastScale(damage.id),key:damage.id,
        shake:s.distance<(aerial?500:1000),aerial,point:{x:damage.x,y:damage.y,z:damage.z}});
    }
  }
  handleM01Event(event){
    const now=this.sim.clock*1000;
    if(event.type==='round-impact'||event.type==='player-shot')this.renderer.m01.surfaceDamage(event,this.sim);   // presentation only
    if(event.type==='message')this.say(event.message,2600);
    if(event.type==='reload')this.audio.wz29Mechanism(this.sim.weapon.reloadMode);
    if(event.type==='player-shot'){
      this.audio.wz29Shot();this.audio.wz29Mechanism('bolt');this.renderer.m01.muzzle(this.sim.clock);
      if(event.hit===true)this.m01Hud.hit(this.sim.clock);
      if(event.material&&event.material!=='character'){
        const s=this.spatial(event.point),key=`player:${this.sim.weapon.shotCount}`,material=this.renderer.m01.lastSurface?.kind==='water'?'water':event.material,plan=playerImpactSoundPlan(s.distance,this.sim.clock);
        // Beyond 60 m the impact is heard after distance/343 s of mission clock (cleared by rebuildSounds on restore/restart).
        if(plan.immediate)this.audio.impact(material,s.pan,s.distance,key);
        else this.pendingSounds.push({...s,at:plan.at,kind:'impact',material,key});
      }
    }
    if(event.type==='npc-shot'){
      const s=this.spatial(event.point);
      if(event.rounds>1)this.audio.rkmBurst(s.pan,s.distance,event.rounds,.11,`kowal:${this.sim.clock.toFixed(3)}`,s.front);
      else this.audio.rifleShot(s.pan,s.distance,'ally-rifle',`ally:${this.sim.clock.toFixed(3)}`,undefined,s.front);
    }
    if(event.type==='distant-shot'){
      const s=this.spatial(event.point);this.audio.distantBattle('rifle',s.pan,Math.max(500,s.distance),`scripted:${this.sim.clock.toFixed(3)}`,{rounds:3,front:s.front});
    }
    // Fogo alemão: o estampido chega com o atraso da distância (343 m/s); o impacto e o estalo de quem passa perto, à chegada do tiro.
    // source: arma que dispara (posição da boca arredondada), só para juntar os tiros da MG34 deitada numa rajada sonora.
    if(event.type==='enemy-fire'){const s=this.spatial(event.origin),source=`${event.weapon}@${Math.round(event.origin.x)},${Math.round(event.origin.z)}`;
      this.pendingSounds.push({...s,at:event.at+s.distance/343,kind:'fire',rounds:event.rounds,interval:event.interval,weapon:event.weapon,source,key:`${source}:${event.at.toFixed(3)}`});}
    if(event.type==='round-impact'){
      this.renderer.m01.impact(event.point,event.material,this.sim.clock);
      const s=this.spatial(event.point),key=`${event.by}:${this.sim.clock.toFixed(3)}`,shooter=this.sim.actor?.(event.by);
      const direction=shooter?this.spatial(shooter).pan:s.pan,weapon=shooter?.weapon??null;
      this.renderer.m01.roundFeedback(event,this.sim.clock,direction,weapon);
      if(this.pendingM01HitFeedback&&Math.abs(this.pendingM01HitFeedback.clock-this.sim.clock)<1e-6){
        this.renderer.m01.directionalHit(this.sim.clock,direction);this.pendingM01HitFeedback=null;
      }
      // Estalo supersónico só quando a simulação diz que o tiro passou a ≤6 m (o zumbido fica para ricochetes próximos).
      if(event.crack)this.audio.crack(s.pan,Math.min(12,event.distance),key,s.front);
      if(event.distance<120)this.audio.impact(event.material,s.pan,event.distance,key,s.front);
    }
    if(event.type==='player-hit'){
      this.audio.hit();this.hitUntil=now+170;this.pendingM01HitFeedback={clock:this.sim.clock};
      this.renderer.m01.playerHit(this.sim.clock);
    }
    if(event.type==='m01-blast'){
      // O estrondo e a vibração chegam juntos (atraso = distância/343 m/s); o áudio só apresenta a autoridade já emitida.
      const s=this.spatial(event.point),damage=[...this.sim.sectors.damage].reverse().find(d=>d.soundAt===event.soundAt&&d.x===event.point.x&&d.z===event.point.z);
      const scale=blastScale(damage?.id);
      this.pendingSounds.push({...s,at:event.soundAt,kind:'blast',scale,key:damage?.id??`blast:${event.soundAt.toFixed(3)}`,shake:s.distance<(event.aerial?500:1000),
        aerial:Boolean(event.aerial),point:{x:event.point.x,y:event.point.y,z:event.point.z}});
      this.renderer.m01.explosionFeedback(this.sim.clock,s.distance,s.pan);
      this.renderer.m01.explosion(event.point,this.sim.clock,event.aerial);
    }
    if(event.type==='checkpoint'){
      this.checkpointUntil=now+2400;this.persistCheckpoint();
      const checkpoint=this.sim.definition.checkpoints.find(c=>c.id===event.id);this.m01Hud.checkpoint(`${checkpoint.label} · ${checkpoint.name}`,this.sim.clock);
    }
    if(event.type==='restored'){
      this.rebuildSounds();this.pendingM01HitFeedback=null;this.renderer.resetEffects();this.input.clear();this.m01Hud.reset('restore',this.sim.clock);this.say('A retomar o último checkpoint');
    }
    if(event.type==='complete'){
      this.persistCheckpoint();this.pause();if(document.pointerLockElement===this.canvas)document.exitPointerLock();this.onState('complete');
    }
  }
  persistCheckpoint(){
    try{localStorage.setItem(this.saveKey,JSON.stringify(this.sim.checkpoint));}
    catch{this.say('Checkpoint guardado nesta partida. O navegador não permitiu guardá-lo no dispositivo.',2800);}
  }
  say(text,ms=1600){this.hud.message.textContent=text;this.messageUntil=this.sim.clock*1000+ms;}
  updateHud(){
    const now=this.sim.clock*1000,p=this.sim.player;
    if(now>=this.messageUntil)this.hud.message.textContent='';
    this.hud.crosshair.classList.toggle('hidden',this.isM01&&(p.aiming||this.sim.scene?.id==='cs_m01_roll_call'));
    if(this.isM01){
      // Apresentação de M01: textos, cartelas, fades e avisos lidos da simulação (src/ui/m01-hud.js).
      this.m01Hud.update(this.sim);
      const feedback=this.renderer.m01.feedbackState(this.sim.clock),v=this.hud.vignette;
      v.classList.remove('hit');v.classList.add('combat-feedback');
      v.style.setProperty('--combat-edge',feedback.overlayAlpha.toFixed(3));
      v.style.setProperty('--combat-flash',feedback.exposureFlash.toFixed(3));
      v.style.setProperty('--combat-suppression',(feedback.suppressionVisual*.13).toFixed(3));
      v.style.setProperty('--combat-center',`${(50-feedback.direction*18).toFixed(1)}%`);
      return;
    }
    this.hud.health.textContent=Math.ceil(p.health);this.hud.healthBar.style.width=`${p.health}%`;
    this.hud.grenades.textContent=`GRANADAS ×${this.sim.grenades.ammo}`;
    this.hud.mag.textContent=this.sim.weapon.reloading?'—':this.sim.weapon.mag;this.hud.reserve.textContent=this.sim.weapon.reserve;
    this.hud.objective.textContent=this.sim.mission.text;if(this.hud.objectiveStatus)this.hud.objectiveStatus.textContent='';
    this.hud.weaponName.textContent='M1 CARBINE';
    this.hud.clock.textContent='';this.hud.weaponState.textContent='';this.hud.interaction.textContent='';this.hud.subtitle.textContent='';
    this.hud.checkpoint.classList.toggle('show',now<this.checkpointUntil);
    this.hud.vignette.classList.remove('combat-feedback');
    this.hud.vignette.classList.toggle('hit',now<this.hitUntil);
  }
  get diagnostics(){return structuredClone({...this.renderer.diagnostics,audio:this.audio?.diagnostics??null,missionId:this.sim.missionId,clock:this.sim.clock,paused:this.paused,
    missionPhase:this.sim.mission.phase,complete:this.sim.mission.complete,
    player:{x:this.player.x,y:this.player.y,z:this.player.z,angle:this.player.angle,pitch:this.player.pitch,health:this.player.health,crouched:Boolean(this.player.crouched),aiming:Boolean(this.player.aiming)},
    sectors:this.sim.sectors.sectors.map(s=>({...s})),eventIds:this.isM01?Object.keys(this.sim.consumed):[...this.sim.sectors.consumed],
    ...(this.isM01?{m01:{...this.renderer.m01.diagnostics,battleClock:this.sim.battleClock,weapon:this.sim.weapon.snapshot(),
      grenades:structuredClone(this.sim.grenades),damage:(this.sim.sectors.damage??[]).map(d=>({...d})),pendingAudio:(this.pendingSounds??[]).map(s=>({...s})),
      checkpoints:[...this.sim.checkpointsReached],flags:{...this.sim.flags},scene:this.sim.scene?.id??null,gate:this.sim.gate,
      objectives:structuredClone(this.sim.objectives),parts:this.sim.renderState.parts,enemyAlive:this.sim.enemies.filter(a=>a.alive).length,
      threat:this.sim.threat,stationEvacuation:this.sim.stationEvacuation,animationPresentation:this.sim.animationPresentation,
      hudStatus:this.hud?.objectiveStatus?.textContent??'',hudPresentation:this.m01Hud?.diagnostics??null}}:{})});}
  dispose(){
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);
    this.listeners.forEach(remove=>remove());this.input.dispose();this.audio.dispose?.();this.renderer.dispose();
  }
}
