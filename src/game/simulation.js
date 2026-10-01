import { CONFIG, UNITS_PER_METRE } from '../config.js';
import { World } from '../world/world.js';
import { eyePosition, aimDirection, muzzlePosition, traceShot, toScene } from '../world/spatial.js';
import { Random } from '../core/random.js';
import { distance, clamp } from '../core/math.js';
import { Player, Soldier } from './actors.js';
import { WeaponSystem, WEAPON_PROFILES } from './weapon.js';
import { Mission } from './mission.js';
import { GrenadeSystem } from './grenade.js';
import { BattleDirector } from './battle-director.js';
import { SectorBattle } from './sector-battle.js';

const MISSION_ID='sandbox-1944';
const dataOnly=value=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='function'?undefined:v));
const hydrate=(instance,data)=>{
  for(const key of Object.keys(instance))if(typeof instance[key]!=='function'&&Object.hasOwn(data,key))instance[key]=data[key];
  return instance;
};

function validateSnapshot(s){
  if(!s||s.schema!==1||s.missionId!==MISSION_ID||!Number.isFinite(s.clock)||s.clock<0)throw new Error('Versão de checkpoint incompatível.');
  if(!Number.isInteger(s.rng)||!s.world||!Array.isArray(s.world.layout)||s.world.layout.length<3||s.world.layout.length>128)throw new Error('Mundo inválido.');
  const width=s.world.layout[0].length;
  if(width<3||width>128||!s.world.layout.every(row=>typeof row==='string'&&row.length===width&&/^[01]+$/.test(row)))throw new Error('Mapa inválido.');
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  if(!point(s.player)||!Number.isFinite(s.player.health)||s.player.health<=0||s.player.health>100||s.player.alive!==true||!Number.isFinite(s.player.angle)||!Number.isFinite(s.player.pitch))throw new Error('Jogador inválido.');
  if(!s.world.spawns||!['P','E','A','C','R'].every(key=>Array.isArray(s.world.spawns[key])&&s.world.spawns[key].length&&s.world.spawns[key].every(point)))throw new Error('Posições inválidas.');
  for(const list of [s.enemies,s.allies,s.sectors?.actors]){
    if(!Array.isArray(list)||list.length>200||!list.every(a=>point(a)&&typeof a.id==='string'&&Number.isFinite(a.health)&&typeof a.alive==='boolean'))throw new Error('Atores inválidos.');
    if(new Set(list.map(a=>a.id)).size!==list.length)throw new Error('IDs de atores duplicados.');
  }
  if(s.enemies.length!==s.world.spawns.E.length||s.allies.length!==s.world.spawns.A.length)throw new Error('Elenco inválido.');
  if(!WEAPON_PROFILES[s.weapon?.id]||!Number.isInteger(s.weapon.mag)||s.weapon.mag<0||s.weapon.mag>WEAPON_PROFILES[s.weapon.id].magazine||!Number.isInteger(s.weapon.reserve)||s.weapon.reserve<0)throw new Error('Arma inválida.');
  if(!s.mission||!Number.isInteger(s.mission.phase)||s.mission.phase<0||s.mission.phase>3||typeof s.mission.complete!=='boolean')throw new Error('Missão inválida.');
  if(!s.director||!s.grenades||!Array.isArray(s.grenades.active)||!Number.isInteger(s.grenades.ammo)||s.grenades.ammo<0)throw new Error('Combate inválido.');
  if(!s.sectors||!Array.isArray(s.sectors.sectors)||s.sectors.sectors.length!==2||!Array.isArray(s.sectors.consumed)||!Array.isArray(s.sectors.damage))throw new Error('Setores inválidos.');
  const check=(value,depth=0)=>{
    if(depth>12)throw new Error('Checkpoint demasiado complexo.');
    if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Número inválido.');
    if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){
      if(['__proto__','prototype','constructor'].includes(key))throw new Error('Campo inválido.');
      check(item,depth+1);
    }
  };
  check(s);
  return s;
}

export class Simulation {
  constructor(seed=194409){this.reset(seed);}
  reset(seed=194409){
    this.rng=new Random(seed);this.clock=0;this.events=[];
    this.world=new World();this.player=new Player(this.world.spawns.P[0]);
    this.weapon=new WeaponSystem('m1_carbine');
    this.enemies=this.world.spawns.E.map((p,i)=>new Soldier({...p,id:`enemy-${i}`},'enemy',this.rng.next));
    this.allies=this.world.spawns.A.map((p,i)=>{
      const a=new Soldier({...p,id:`ally-${i}`},'ally',this.rng.next);
      a.role=['leader','rifleman','support','advance','rifleman','advance'][i%6];return a;
    });
    this.radio=this.world.spawns.R[0];this.mission=new Mission(this.world.spawns.C[0],this.radio);
    this.grenades=new GrenadeSystem();
    this.director=new BattleDirector(this.enemies,{ambience(){}},message=>this.emit({type:'message',message}),this.rng.next);
    this.sectors=new SectorBattle(this.rng.next);
    this.checkpoint=this.snapshot();
  }
  emit(event){this.events.push(event);}
  drainEvents(){const events=this.events;this.events=[];return events;}
  get combatants(){return [...this.enemies,...this.allies,...this.sectors.actors];}
  tick(dt,controls={}){
    if(!Number.isFinite(dt)||dt<=0||this.mission.complete)return;
    if(!this.player.alive){this.restoreCheckpoint();this.emit({type:'restored'});return;}
    dt=Math.min(dt,.05);this.clock+=dt;const now=this.clock*1000;
    const p=this.player;
    p.angle+=(controls.lookX||0)*CONFIG.mouseSensitivity;
    p.pitch=clamp(p.pitch-(controls.lookY||0)*CONFIG.mouseSensitivity,-1.25,1.25);
    p.aiming=Boolean(controls.aim);
    const forward=controls.forward||0,side=controls.side||0,len=Math.hypot(forward,side)||1;
    const speed=(controls.sprint?CONFIG.sprintSpeed:CONFIG.walkSpeed)*(p.aiming?.6:1);
    const dx=(Math.cos(p.angle)*forward-Math.sin(p.angle)*side)/len*speed*dt;
    const dy=(Math.sin(p.angle)*forward+Math.cos(p.angle)*side)/len*speed*dt;
    p.moveBlend=Math.min(1,Math.hypot(dx,dy)/(CONFIG.walkSpeed*dt));p.sprinting=Boolean(controls.sprint)&&p.moveBlend>.1;
    this.world.move(p,dx,dy);
    if(this.weapon.update(now))this.emit({type:'message',message:'PRONTO'});
    if(controls.reload&&this.weapon.reload(now))this.emit({type:'reload'});
    if(controls.grenade&&this.grenades.throw(p,now))this.emit({type:'message',message:'GRANADA!'});
    if(controls.fire&&this.weapon.shoot(now))this.fire(now);
    for(const enemy of this.enemies){
      const attack=enemy.update(dt,this.world,p,now,this.enemies.filter(a=>a!==enemy&&a.alive&&a.active));
      if(attack)this.resolveAttack(attack);
    }
    const visibleEnemies=this.enemies.filter(a=>a.alive&&a.active);
    for(const ally of this.allies){
      const target=visibleEnemies.filter(enemy=>this.world.lineOfSight(ally,enemy)&&distance(ally,enemy)<650)
        .sort((a,b)=>distance(ally,a)-distance(ally,b))[0]??null;
      const attack=ally.update(dt,this.world,target,now,[p,...this.allies.filter(a=>a!==ally&&a.alive)]);
      if(attack)this.resolveAttack(attack);
    }
    this.grenades.update(dt,this.world,[...this.enemies,...this.allies],p,grenade=>this.emit({type:'explosion',point:toScene(grenade,grenade.height/UNITS_PER_METRE)}));
    this.director.update(dt,p,this.mission,this.world);
    this.sectors.update(dt,event=>this.emit(event));
    if(!p.alive)return; // Never replace a recoverable checkpoint with a death snapshot.
    const event=this.mission.update(p,this.enemies);
    if(event==='checkpoint'){this.checkpoint=this.snapshot();this.emit({type:'checkpoint'});}
    if(event==='clear')this.emit({type:'message',message:'SGT. HALE: SETOR LIMPO. ENCONTRE O RÁDIO.'});
    if(event==='complete'){this.checkpoint=this.snapshot();this.emit({type:'complete'});}
  }
  fire(now){
    const aim=this.weapon.shotDirection(this.player.angle,this.player.pitch);
    const hit=traceShot(this.world,eyePosition(this.player),aimDirection(aim.angle,aim.pitch),this.combatants,
      this.weapon.profile.range/UNITS_PER_METRE,muzzlePosition(this.player));
    this.player.weaponShotAt=now;
    this.player.pitch=clamp(this.player.pitch+this.weapon.profile.recoil.vertical,-1.25,1.25);
    this.player.angle+=(this.rng.next()-.5)*this.weapon.profile.recoil.horizontal;
    if(hit?.kind==='actor'&&hit.actor.team==='enemy'){
      const amount=this.weapon.profile.damage*hit.multiplier;
      if(hit.actor.sector)this.sectors.registerHit(hit.actor,amount);else hit.actor.damage(amount);
    }
    this.emit({type:'player-shot',point:hit?.point,material:hit?.material,
      hit:Boolean(hit?.kind==='actor'&&hit.actor.team==='enemy')});
  }
  resolveAttack(attack){
    const origin=eyePosition(attack.shooter),target=toScene(attack.target,attack.target.crouched?.9:1.2);
    const range=Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z);
    const direction={x:(target.x-origin.x)/range,y:(target.y-origin.y)/range,z:(target.z-origin.z)/range};
    const hit=traceShot(this.world,origin,direction,[this.player,...this.enemies,...this.allies].filter(a=>a!==attack.shooter),range+.5);
    this.emit({type:'npc-shot',point:origin});
    if(hit?.actor===attack.target&&this.rng.next()<attack.hitChance){
      attack.target.damage(attack.damage);
      if(attack.target===this.player)this.emit({type:'player-hit'});
    }
  }
  snapshot(){
    return dataOnly({schema:1,missionId:MISSION_ID,clock:this.clock,rng:this.rng.state,
      world:{layout:this.world.layout.map(row=>row.join('')),spawns:this.world.spawns},
      player:this.player,weapon:{id:this.weapon.profile.id,mag:this.weapon.mag,reserve:this.weapon.reserve,
        lastShot:this.weapon.lastShot,reloadUntil:this.weapon.reloadUntil,reloadStarted:this.weapon.reloadStarted,shotCount:this.weapon.shotCount},
      enemies:this.enemies,allies:this.allies,mission:this.mission,grenades:this.grenades,
      director:{state:this.director.state,elapsed:this.director.elapsed,ambientTimer:this.director.ambientTimer,wave:this.director.wave},
      sectors:this.sectors});
  }
  restoreSnapshot(raw){
    // Validate and reconstruct a candidate before modifying the running instance.
    const s=validateSnapshot(dataOnly(raw)),candidate=new Simulation(s.rng);
    candidate.world=new World(s.world.layout);candidate.world.spawns=s.world.spawns;
    candidate.player=hydrate(new Player(s.player),s.player);
    candidate.weapon=hydrate(new WeaponSystem(s.weapon.id),s.weapon);
    candidate.enemies=s.enemies.map(a=>hydrate(new Soldier(a,'enemy',candidate.rng.next),a));
    candidate.allies=s.allies.map(a=>hydrate(new Soldier(a,'ally',candidate.rng.next),a));
    candidate.radio=s.world.spawns.R[0];candidate.mission=hydrate(new Mission(s.world.spawns.C[0],candidate.radio),s.mission);
    candidate.grenades=hydrate(new GrenadeSystem(),s.grenades);
    candidate.director=new BattleDirector(candidate.enemies,{ambience(){}},message=>candidate.emit({type:'message',message}),candidate.rng.next);
    // Constructor assigns group defaults; saved activation/roles must win afterwards.
    candidate.enemies.forEach((a,i)=>hydrate(a,s.enemies[i]));hydrate(candidate.director,s.director);
    candidate.sectors=hydrate(new SectorBattle(candidate.rng.next),s.sectors);
    candidate.sectors.actors=s.sectors.actors.map(a=>hydrate(new Soldier(a,a.team,candidate.rng.next),a));
    candidate.rng.state=s.rng;candidate.clock=s.clock;candidate.events=[];candidate.checkpoint=dataOnly(s);
    Object.assign(this,candidate);
    this.director.onMessage=message=>this.emit({type:'message',message});
    return true;
  }
  restoreCheckpoint(){return this.restoreSnapshot(this.checkpoint);}
  loadCheckpoint(text){
    try{this.restoreSnapshot(JSON.parse(text));return {ok:true};}
    catch(error){return {ok:false,error:error.message};}
  }
}
