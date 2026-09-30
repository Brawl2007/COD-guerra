import { CONFIG } from '../config.js';
import { World } from '../world/world.js';
import { Input } from '../core/input.js';
import { AudioSystem } from '../core/audio.js';
import { Renderer } from '../render/renderer.js';
import { Weapon } from './weapon.js';
import { Player, Soldier } from './actors.js';
import { Mission } from './mission.js';
import { distance, segmentPointDistance } from '../core/math.js';

export class Game {
  constructor(canvas,hud){this.canvas=canvas;this.hud=hud;this.input=new Input(canvas);this.audio=new AudioSystem();this.renderer=new Renderer(canvas);this.reset();this.last=0;this.running=false;this.wasReload=false;addEventListener('resize',()=>this.renderer.resize());this.renderer.resize();}
  reset(){this.world=new World();this.player=new Player(this.world.spawns.P[0]);this.weapon=new Weapon(CONFIG.weapon);this.enemies=this.world.spawns.E.map(p=>new Soldier(p));this.ally=new Soldier(this.world.spawns.A[0],'ally');this.radio=this.world.spawns.R[0];this.mission=new Mission(this.world.spawns.C[0],this.radio);this.checkpoint={...this.player};}
  start(){this.audio.init();this.running=true;this.last=performance.now();this.canvas.requestPointerLock();requestAnimationFrame(t=>this.loop(t));}
  loop(now){if(!this.running)return;const dt=Math.min(.04,(now-this.last)/1000);this.last=now;if(document.pointerLockElement===this.canvas)this.update(dt,now);this.renderer.render(this.world,this.player,[...this.enemies,this.ally],this.radio,now);this.updateHud();requestAnimationFrame(t=>this.loop(t));}
  update(dt,now){if(!this.player.alive){this.respawn();return;}this.player.angle+=this.input.consumeLook()*CONFIG.mouseSensitivity;
    let forward=(this.input.down('KeyW')?1:0)-(this.input.down('KeyS')?1:0),side=(this.input.down('KeyD')?1:0)-(this.input.down('KeyA')?1:0),len=Math.hypot(forward,side)||1,speed=this.input.down('ShiftLeft')?CONFIG.sprintSpeed:CONFIG.walkSpeed;
    const dx=(Math.cos(this.player.angle)*forward+Math.cos(this.player.angle+Math.PI/2)*side)/len*speed*dt,dy=(Math.sin(this.player.angle)*forward+Math.sin(this.player.angle+Math.PI/2)*side)/len*speed*dt;this.world.move(this.player,dx,dy);
    if(this.input.down('KeyR')&&!this.wasReload){if(this.weapon.reload(now)){this.audio.reload();this.say('RECARREGANDO');}}this.wasReload=this.input.down('KeyR');
    if(this.input.fire){if(this.weapon.shoot(now))this.fire(now);else if(this.weapon.mag===0&&!this.weapon.reloading)this.say('PRESSIONE R PARA RECARREGAR');}
    if(this.weapon.update(now))this.say('PRONTO');
    for(const enemy of this.enemies){const attack=enemy.update(dt,this.world,this.player,now);if(attack&&Math.random()<attack.hitChance){this.player.damage(attack.damage);this.audio.hit();this.renderer.shake=7;this.hud.vignette.classList.add('hit');setTimeout(()=>this.hud.vignette.classList.remove('hit'),150);}}
    const live=this.enemies.filter(e=>e.alive);const target=live.sort((a,b)=>distance(this.ally,a)-distance(this.ally,b))[0]??this.player;const alliedAttack=this.ally.update(dt,this.world,target,now,[this.player]);if(alliedAttack&&target!==this.player&&Math.random()<alliedAttack.hitChance)target.damage(alliedAttack.damage);
    const event=this.mission.update(this.player,this.enemies);if(event==='checkpoint'){this.checkpoint={x:this.player.x,y:this.player.y,angle:this.player.angle};this.hud.checkpoint.classList.add('show');setTimeout(()=>this.hud.checkpoint.classList.remove('show'),2200);this.say('SGT. HALE: CONTATO À FRENTE!');}if(event==='clear')this.say('SGT. HALE: SETOR LIMPO. ENCONTRE O RÁDIO.');if(event==='complete')this.say('MISSÃO CONCLUÍDA — COMUNICAÇÕES RESTABELECIDAS',5000);
  }
  fire(){this.audio.shot();this.renderer.shake=5;this.player.angle+=(Math.random()-.5)*CONFIG.weapon.recoil;const end={x:this.player.x+Math.cos(this.player.angle)*CONFIG.weapon.range,y:this.player.y+Math.sin(this.player.angle)*CONFIG.weapon.range};const wall=this.world.raycast(this.player.x,this.player.y,this.player.angle,CONFIG.weapon.range);let best=null,bestD=Infinity;for(const enemy of this.enemies){if(!enemy.alive)continue;const d=distance(this.player,enemy);if(d<wall.distance&&d<bestD&&segmentPointDistance(this.player,end,enemy)<enemy.radius*1.5){best=enemy;bestD=d;}}if(best){best.damage(CONFIG.weapon.damage);this.say(best.alive?'ACERTO':'INIMIGO NEUTRALIZADO');}}
  respawn(){Object.assign(this.player,this.checkpoint,{health:100,alive:true});this.weapon.mag=CONFIG.weapon.magazine;this.say('RETORNANDO AO ÚLTIMO CHECKPOINT');}
  say(text,ms=1400){this.hud.message.textContent=text;clearTimeout(this.messageTimer);this.messageTimer=setTimeout(()=>this.hud.message.textContent='',ms);}
  updateHud(){this.hud.health.textContent=Math.ceil(this.player.health);this.hud.healthBar.style.width=`${this.player.health}%`;this.hud.mag.textContent=this.weapon.reloading?'—':this.weapon.mag;this.hud.reserve.textContent=this.weapon.reserve;this.hud.objective.textContent=this.mission.text;}
}
