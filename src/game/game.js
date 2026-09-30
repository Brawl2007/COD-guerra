import { UNITS_PER_METRE } from '../config.js';
import { Input } from '../core/input.js';
import { AudioSystem } from '../core/audio.js';
import { Renderer } from '../render/three-renderer.js';
import { Simulation } from './simulation.js';

const SAVE_KEY='cod-guerra:checkpoint:v1';

export class Game {
  constructor(canvas,hud,onState=()=>{}){
    this.canvas=canvas;this.hud=hud;this.onState=onState;
    this.input=new Input(canvas);this.audio=new AudioSystem();this.renderer=new Renderer(canvas);
    this.sim=new Simulation();this.started=false;this.paused=true;this.disposed=false;
    this.last=performance.now();this.messageUntil=0;this.checkpointUntil=0;this.hitUntil=0;
    this.pendingSounds=[];this.frame=null;this.listeners=[];
    const listen=(target,type,callback)=>{target.addEventListener(type,callback);this.listeners.push(()=>target.removeEventListener(type,callback));};
    listen(window,'resize',()=>this.renderer.resize());
    listen(window,'blur',()=>this.pause());
    listen(document,'visibilitychange',()=>{if(document.hidden)this.pause();});
    listen(document,'pointerlockchange',()=>{
      if(document.pointerLockElement===canvas&&this.started&&!document.hidden){this.paused=false;this.audio.init();this.onState('playing');}
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
  get hasSave(){try{return Boolean(localStorage.getItem(SAVE_KEY));}catch{return false;}}
  start({continueSaved=false}={}){
    if(this.started)return this.resume();
    if(continueSaved){
      let result;
      try{result=this.sim.loadCheckpoint(localStorage.getItem(SAVE_KEY));}catch(error){result={ok:false,error:error.message};}
      if(!result.ok){this.onState('save-error',result.error);return false;}
    }
    this.started=true;this.pendingSounds=[];
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
    this.sim.restoreCheckpoint();this.pendingSounds=[];this.messageUntil=0;this.hitUntil=0;
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
    const dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;
    if(this.started&&!this.paused&&!document.hidden&&document.pointerLockElement===this.canvas){
      this.sim.tick(dt,{lookX:this.input.consumeLook(),lookY:this.input.consumeLookY(),
        forward:Number(this.input.down('KeyW'))-Number(this.input.down('KeyS')),
        side:Number(this.input.down('KeyD'))-Number(this.input.down('KeyA')),
        sprint:this.input.down('ShiftLeft')||this.input.down('ShiftRight'),aim:this.input.aim,
        fire:this.input.consumeFire(),reload:this.input.consumePressed('KeyR'),grenade:this.input.consumePressed('KeyG')});
      for(const event of this.sim.drainEvents())this.handleEvent(event);
      const due=this.pendingSounds.filter(sound=>sound.at<=this.sim.clock);
      this.pendingSounds=this.pendingSounds.filter(sound=>sound.at>this.sim.clock);
      due.forEach(sound=>this.audio.explosion(sound.pan,sound.distance*UNITS_PER_METRE));
    }
    this.renderer.render(this.sim.world,this.sim.player,this.sim.combatants,this.sim.radio,
      this.sim.weapon,this.sim.grenades.active,this.sim.clock*1000,this.sim.sectors);
    this.updateHud();this.frame=requestAnimationFrame(time=>this.loop(time));
  }
  spatial(point){
    const dx=point.x-this.sim.player.x/UNITS_PER_METRE,dz=point.z-this.sim.player.y/UNITS_PER_METRE;
    return {distance:Math.hypot(dx,dz),pan:Math.sin(Math.atan2(dz,dx)-this.sim.player.angle)};
  }
  handleEvent(event){
    const now=this.sim.clock*1000;
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
  persistCheckpoint(){
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.sim.checkpoint));}
    catch{this.say('Checkpoint guardado nesta partida. O navegador não permitiu guardá-lo no dispositivo.',2800);}
  }
  say(text,ms=1600){this.hud.message.textContent=text;this.messageUntil=this.sim.clock*1000+ms;}
  updateHud(){
    const now=this.sim.clock*1000,p=this.sim.player;
    this.hud.health.textContent=Math.ceil(p.health);this.hud.healthBar.style.width=`${p.health}%`;
    this.hud.grenades.textContent=`GRANADAS ×${this.sim.grenades.ammo}`;
    this.hud.mag.textContent=this.sim.weapon.reloading?'—':this.sim.weapon.mag;this.hud.reserve.textContent=this.sim.weapon.reserve;
    this.hud.objective.textContent=this.sim.mission.text;
    if(now>=this.messageUntil)this.hud.message.textContent='';
    this.hud.checkpoint.classList.toggle('show',now<this.checkpointUntil);
    this.hud.vignette.classList.toggle('hit',now<this.hitUntil);
  }
  get diagnostics(){return {...this.renderer.diagnostics,clock:this.sim.clock,paused:this.paused,
    missionPhase:this.sim.mission.phase,complete:this.sim.mission.complete,
    player:{x:this.player.x,y:this.player.y,angle:this.player.angle,pitch:this.player.pitch,health:this.player.health},
    sectors:this.sim.sectors.sectors.map(s=>({...s})),eventIds:[...this.sim.sectors.consumed]};}
  dispose(){
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);
    this.listeners.forEach(remove=>remove());this.input.dispose();this.audio.dispose?.();this.renderer.dispose();
  }
}
