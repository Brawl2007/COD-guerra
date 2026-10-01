import { UNITS_PER_METRE } from '../config.js';
import { Input } from '../core/input.js';
import { AudioSystem } from '../core/audio.js';
import { Renderer } from '../render/three-renderer.js';
import { Simulation } from './simulation.js';
import { M01Simulation, clockText } from './m01-simulation.js';

const SAVE_KEY='cod-guerra:checkpoint:v1';

export class Game {
  constructor(canvas,hud,onState=()=>{},missionId='m01_tczew'){
    this.canvas=canvas;this.hud=hud;this.onState=onState;
    this.input=new Input(canvas);this.audio=new AudioSystem();this.renderer=new Renderer(canvas);
    this.sim=missionId==='m01_tczew'?new M01Simulation():new Simulation();this.started=false;this.paused=true;this.disposed=false;
    if(this.isM01)this.renderer.prepareM01();
    this.last=performance.now();this.messageUntil=0;this.checkpointUntil=0;this.hitUntil=0;
    this.pendingSounds=[];this.frame=null;this.listeners=[];
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
    this.menu();this.sim=id==='m01_tczew'?new M01Simulation():new Simulation();this.pendingSounds=[];
    this.messageUntil=0;this.hitUntil=0;this.checkpointUntil=0;this.renderer.resetEffects();
    if(this.isM01)this.renderer.prepareM01();this.onState('menu');
  }
  start({continueSaved=false}={}){
    if(this.started)return this.resume();
    if(continueSaved){
      let result;
      try{result=this.sim.loadCheckpoint(localStorage.getItem(this.saveKey));}catch(error){result={ok:false,error:error.message};}
      if(!result.ok){this.onState('save-error',result.error);return false;}
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
    this.sim.restoreCheckpoint();this.rebuildSounds();this.messageUntil=0;this.hitUntil=0;
    this.renderer.resetEffects();this.input.clear();
    if(this.sim.mission.complete)this.onState('complete');else this.resume();
  }
  restartMission(){
    this.sim.reset();this.started=true;this.paused=true;this.pendingSounds=[];
    this.messageUntil=0;this.checkpointUntil=0;this.hitUntil=0;
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
      due.forEach(sound=>{this.audio.explosion(sound.pan,sound.distance*UNITS_PER_METRE);if(sound.shake&&this.isM01)this.renderer.m01.blast(this.sim.clock);});
    }
    if(this.isM01)this.renderer.renderMission(this.sim);
    else this.renderer.render(this.sim.world,this.sim.player,this.sim.combatants,this.sim.radio,
        this.sim.weapon,this.sim.grenades.active,this.sim.clock*1000,this.sim.sectors);
    this.updateHud();this.frame=requestAnimationFrame(time=>this.loop(time));
  }
  spatial(point){
    const dx=point.x-(this.isM01?this.sim.player.x:this.sim.player.x/UNITS_PER_METRE),
      dz=point.z-(this.isM01?this.sim.player.z:this.sim.player.y/UNITS_PER_METRE);
    return {distance:Math.hypot(dx,dz),pan:Math.sin(Math.atan2(dz,dx)-this.sim.player.angle)};
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
    this.pendingSounds=[];if(!this.isM01)return;
    for(const damage of this.sim.sectors.damage)if(damage.soundAt>this.sim.clock)this.pendingSounds.push({...this.spatial(damage),at:damage.soundAt});
  }
  handleM01Event(event){
    const now=this.sim.clock*1000;
    if(event.type==='message')this.say(event.message,2600);
    if(event.type==='reload')this.audio.wz29Mechanism(this.sim.weapon.reloadMode);
    if(event.type==='player-shot'){
      this.audio.wz29Shot();this.audio.wz29Mechanism('bolt');this.renderer.m01.muzzle(this.sim.clock);
      if(event.material&&event.material!=='character')this.audio.impact(event.material);
    }
    if(['npc-shot','distant-shot','cover-suppression'].includes(event.type)){
      const s=this.spatial(event.point);this.audio.wz29Shot(s.pan,Math.max(40,s.distance));
    }
    if(event.type==='player-hit'){this.audio.hit();this.hitUntil=now+170;}
    if(event.type==='m01-blast'){
      // O estrondo e a vibração chegam juntos (atraso = distância/343 m/s); demolições abanam até 1 km (cs_m01_east_blast t=2,1).
      const s=this.spatial(event.point);this.pendingSounds.push({...s,at:event.soundAt,shake:s.distance<(event.aerial?500:1000)});
      this.renderer.m01.explosion(event.point,this.sim.clock,event.aerial);
    }
    if(event.type==='checkpoint'){
      this.checkpointUntil=now+2400;this.persistCheckpoint();
      const label=this.sim.definition.checkpoints.find(c=>c.id===event.id).label;this.say(`${label} · progresso guardado`,1800);
    }
    if(event.type==='restored'){
      this.rebuildSounds();this.renderer.resetEffects();this.input.clear();this.say('A retomar o último checkpoint');
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
    this.hud.health.textContent=Math.ceil(p.health);this.hud.healthBar.style.width=`${p.health}%`;
    this.hud.grenades.textContent=`GRANADAS ×${this.sim.grenades.ammo}`;
    this.hud.mag.textContent=this.sim.weapon.reloading?'—':this.sim.weapon.mag;this.hud.reserve.textContent=this.sim.weapon.reserve;
    this.hud.objective.textContent=this.sim.mission.text;
    this.hud.weaponName.textContent=this.isM01?'KARABINEK WZ.29':'M1 CARBINE';
    this.hud.clock.textContent=this.isM01?clockText(this.sim.battleClock):'';
    this.hud.weaponState.textContent=this.isM01?`${this.sim.weapon.sight} m · ${this.sim.weapon.boltCycling?'FERROLHO':this.sim.weapon.reloading?'A CARREGAR':'5 CARTUCHOS'}`:'';
    this.hud.interaction.textContent=this.isM01?this.sim.interaction:'';
    this.hud.subtitle.textContent=this.isM01&&this.sim.subtitle?`${this.sim.subtitle.speaker}: ${this.sim.subtitle.text}`:'';
    this.hud.crosshair.classList.toggle('hidden',this.isM01&&(p.aiming||this.sim.scene?.id==='cs_m01_roll_call'));
    if(now>=this.messageUntil)this.hud.message.textContent='';
    this.hud.checkpoint.classList.toggle('show',now<this.checkpointUntil);
    this.hud.vignette.classList.toggle('hit',now<this.hitUntil);
  }
  get diagnostics(){return structuredClone({...this.renderer.diagnostics,missionId:this.sim.missionId,clock:this.sim.clock,paused:this.paused,
    missionPhase:this.sim.mission.phase,complete:this.sim.mission.complete,
    player:{x:this.player.x,y:this.player.y,z:this.player.z,angle:this.player.angle,pitch:this.player.pitch,health:this.player.health},
    sectors:this.sim.sectors.sectors.map(s=>({...s})),eventIds:this.isM01?Object.keys(this.sim.consumed):[...this.sim.sectors.consumed],
    ...(this.isM01?{m01:{...this.renderer.m01.diagnostics,battleClock:this.sim.battleClock,weapon:this.sim.weapon.snapshot(),
      checkpoints:[...this.sim.checkpointsReached],flags:{...this.sim.flags},scene:this.sim.scene?.id??null,gate:this.sim.gate,
      objectives:structuredClone(this.sim.objectives),parts:this.sim.renderState.parts,enemyAlive:this.sim.enemies.filter(a=>a.alive).length}}:{})});}
  dispose(){
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);
    this.listeners.forEach(remove=>remove());this.input.dispose();this.audio.dispose?.();this.renderer.dispose();
  }
}
