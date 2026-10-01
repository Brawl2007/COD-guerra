import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with { type: 'json' };
import { TczewWorld } from '../world/tczew-world.js';
import { Wz29 } from './wz29.js';
import { Random } from '../core/random.js';
import { eyePosition, aimDirection, muzzlePosition, traceShot, traceObstruction } from '../world/spatial.js';

export const seconds=text=>{const values=text.split(':').map(Number);if(values.length===2)values.push(0);return values.reduce((n,v)=>n*60+v,0);};
export const clockText=n=>new Date(Math.round(n)*1000).toISOString().slice(11,19);
const E=name=>`evt_m01_${name}`,O=name=>`obj_m01_${name}`;
const clone=value=>JSON.parse(JSON.stringify(value));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(p,a)=>p.x>=a.minX&&p.x<=a.maxX&&p.z>=a.minZ&&p.z<=a.maxZ;
const entity=(id,point,team='ally',extra={})=>({id,space:'metres',...point,team,health:100,alive:true,active:true,
  state:'GUARD',facing:0,shot:0,radius:.3,crouched:false,suppressedUntil:0,cooldown:0,rounds:5,...extra});
const phaseText={INTRO:'04:30 · Tczew, Polónia',OUTRO:'07:05 · Chamada no abrigo'};
// Dudek leva Bąk para junto da estação ("Levaram o Bąk para a estação", dlg_m01_056b), fora da zona de demolição oeste.
const EVACUATION={x:-332,y:-3,z:24};
// Lugares no abrigo de campanha (interior x −264…−256, z 66…75) para a chamada das 07:05.
const ROLL_CALL_SEATS=[[-262.8,73.6],[-261.2,73.9],[-259.6,73.9],[-258,73.6],[-263.2,71.6],[-256.9,71.6],[-262.9,69.6],[-257.1,69.6]];

export class M01Simulation {
  constructor(seed=19390901){this.reset(seed);}
  reset(seed=19390901){
    this.missionId=definition.id;this.definition=definition;this.rng=new Random(seed);this.world=new TczewWorld();
    this.clock=0;this.battleClock=seconds(definition.clock.start);this.events=[];this.consumed={};this.objectives={};
    definition.objectives.forEach(o=>{this.objectives[o.id]={state:'locked',progress:0};});
    this.flags={'m01.completed':false,'m01.nowicki_status':'present','m01.bak_status':'unhurt','m01.dudek_status':'unhurt',
      'm01.east_platoon_survivors':18,'m01.second_raid_state':'pending','m01.forward_post_state':'pending'};
    this.destruction=[];this.dialogueConsumed=[];this.dialogueQueue=[];this.subtitle=null;this.sceneDone=[];this.scene=null;
    this.checkpointsReached=[];this.pendingCheckpoint=null;this.gate=null;this.recoveries=[];this.failure=null;
    this.player=entity('jan_wrona',{x:-66,y:-3,z:22},'player',{angle:0,pitch:0,radius:.36,
      aiming:false,moveBlend:0,sprinting:false,weaponShotAt:-1e9,carrying:null,headgear:'pl_rogatywka_wz37'});
    this.weapon=new Wz29();this.grenades={ammo:2,active:[],nextId:0};this.projectileTraces=[];
    this.actors=definition.cast.filter(c=>c.id!=='jan_wrona').map((c,i)=>entity(c.id,
      c.id==='tadeusz_nowicki'?{x:17,y:0,z:3}:c.role==='ENGINEER'?{x:-42-i*.6,y:-2,z:10}:
      c.role==='MEDIC'?this.world.point('aid_position'):{x:-76-i*1.6,y:-3,z:24+i%3*2},'ally',{role:c.role,essential:Boolean(c.essential),civilian:c.role==='CIVILIAN'}));
    for(let i=0;i<40;i++)this.actors.push(entity(`de_east_${i}`,{x:1080+i%5*12,y:-1,z:-60+Math.floor(i/5)*20},'enemy',
      {group:'grp_de_east',weapon:i<2?'mg34':'kar98k',active:false,cooldown:i*.11,role:i<2?'SUPPORT':'RIFLEMAN'}));
    for(let i=0;i<10;i++)this.actors.push(entity(`de_spans_${i}`,{x:1050+i*3,y:0,z:38+i%3*1.5},'enemy',
      {group:'grp_de_spans',weapon:'kar98k',active:false}));
    for(let i=0;i<24;i++)this.actors.push(entity(`pl_east_${i}`,{x:1040+i%4*2,y:0,z:38+i%4*.65},'ally',
      {group:'grp_east_platoon',active:false,role:'RIFLEMAN'}));
    this.timers={boundary:0,water:0,cover:0,repairStall:0,repairSuppressedUntil:0,withdrawalCasualty:seconds('06:00:00'),
      ambient:0,nextCoverCall:40,guide:0,guideKey:null,guideAt:0,guideDist:0,guideShown:false,kowalRounds:30,lowAmmoHint:false,escort:false,escortSpoke:false,boundaryWarning:false,boundaryCountdown:0,holdAccessVisited:false,
      occupiedCover:null,coverExposure:0,coverCallIndex:0,withdrawalPressure:0,nextCombatCall:0};
    this.sectors={sectors:definition.sectors.map(s=>({id:s.id,state:s.schedule[0].state,strength:100,morale:1,supply:1})),damage:[]};
    this.mission={phase:'INTRO',complete:false,text:phaseText.INTRO};
    this.consume(E('intro_card'));this.startScene('cs_m01_intro');this.checkpoint=this.snapshot();
  }
  actor(id){return this.actors.find(a=>a.id===id);}
  get enemies(){return this.actors.filter(a=>a.team==='enemy');}
  get allies(){return this.actors.filter(a=>a.team==='ally');}
  get combatants(){return this.actors;}
  emit(event){this.events.push(event);}
  drainEvents(){const events=this.events;this.events=[];return events;}
  consumedEvent(id){return Object.hasOwn(this.consumed,id);}
  active(name){return this.objectives[O(name)]?.state==='active';}
  done(name){return this.objectives[O(name)]?.state==='done';}
  activate(name){const o=this.objectives[O(name)];if(o.state==='locked')o.state='active';}
  finish(name){const o=this.objectives[O(name)];if(o.state==='done')return;o.state='done';o.progress=100;}
  line(id,token=id){
    if(this.dialogueConsumed.includes(token))return;
    const line=definition.dialogue.find(d=>d.id===id);if(!line)return;
    this.dialogueConsumed.push(token);
    const count=['doze','treze','catorze','quinze','dezasseis','dezassete','dezoito'][this.flags['m01.east_platoon_survivors']-12];
    this.dialogueQueue.push({id,speaker:definition.cast.find(c=>c.id===line.speaker)?.name??'Soldado',
      text:line.text.replaceAll('{n}',count),duration:Math.max(2.5,Math.min(6,line.text.length/24))});
  }
  message(message){this.emit({type:'message',message});}
  startScene(id){if(this.sceneDone.includes(id))return;this.scene={id,elapsed:0,beats:[]};}
  endScene(){
    if(!this.scene)return;const id=this.scene.id;this.sceneDone.push(id);this.scene=null;
    if(id==='cs_m01_intro'){this.battleClock=Math.max(this.battleClock,seconds('04:30:44'));this.consume(E('prelude_start'));this.saveCheckpoint('cp_m01_a_orientacao');}
    if(id==='cs_m01_roll_call')this.consume(E('debrief'));
  }
  updateScene(dt,skip){
    if(!this.scene)return;
    const data=definition.cutscenes.find(c=>c.id===this.scene.id);
    if(skip&&data.skippable){
      data.timeline.forEach((b,i)=>{const token=`${data.id}:${i}:${b.line}`;if(b.line&&!this.dialogueConsumed.includes(token))this.dialogueConsumed.push(token);});
      this.dialogueQueue=[];this.subtitle=null;this.endScene();return;
    }
    this.scene.elapsed+=dt;
    data.timeline.forEach((beat,i)=>{
      if(beat.t>this.scene.elapsed||this.scene.beats.includes(i))return;
      this.scene.beats.push(i);
      let line=beat.line;
      for(const [condition,value]of Object.entries(beat.lineVariants??{})){
        const [key,expected]=condition.split('=');if(this.flags[key]===expected)line=value;
      }
      if(line)this.line(line,`${data.id}:${i}:${line}`);
    });
    const end=data.id==='cs_m01_intro'?44:data.id==='cs_m01_roll_call'?60:data.maxDurationSec;
    if(this.scene?.elapsed>=end)this.endScene();
  }
  trigger(t){
    if(t.type==='missionStart')return true;
    if(t.type==='battleClock')return this.battleClock+1e-6>=seconds(t.at);
    if(t.type==='cutsceneComplete')return this.sceneDone.includes(t.cutscene);
    if(t.type==='eventComplete')return this.consumedEvent(t.event)&&this.clock-this.consumed[t.event]>=(t.delaySec??0);
    if(t.type==='objectiveComplete')return this.objectives[t.objective]?.state==='done';
    if(t.type==='objectiveState')return this.objectives[t.objective]?.state===t.state;
    if(t.type==='objectiveProgress')return this.objectives[t.objective]?.progress>=t.value;
    if(t.type==='actorInArea')return inside(this.actor(t.actor),t.area);
    if(t.type==='any')return t.of.some(c=>this.trigger(c));
    if(t.type==='all')return t.of.every(c=>this.trigger(c));
    throw new Error(`Gatilho M01 sem handler: ${t.type}`);
  }
  readiness(id){
    if(id===E('repair_complete'))return this.objectives[O('cover_repair')].progress>=100;
    if(id===E('east_demolition'))return this.done('hold_access')&&this.actors.filter(a=>a.alive&&a.active&&a.group==='grp_east_platoon').every(a=>a.x<660)&&this.player.x<660;
    if(id===E('west_demolition'))return this.consumedEvent(E('east_demolition'))&&this.player.x<-90&&this.actors.filter(a=>a.alive&&a.active&&a.team==='ally'&&!a.civilian).every(a=>a.x<-90);
    if(id===E('dudek_retrieves_bak'))return this.player.carrying!=='jozef_bak';
    if(id===E('roll_call'))return this.scene?.id!=='cs_m01_west_blast';
    return true;
  }
  advanceBattle(dt){
    const segment=definition.clock.segments.find(s=>this.battleClock>=seconds(s.from)&&this.battleClock<seconds(s.to));
    if(!segment)return;
    // readyScale: com o gate já pronto (ex.: reparo concluído), encurta a espera sem tarefa até à hora seguinte.
    let scale=segment.gate&&segment.readyScale&&this.readiness(segment.gate)?segment.readyScale:segment.scale,next=this.battleClock+dt*scale;
    if(segment.gate&&!this.readiness(segment.gate)){
      const at=seconds(segment.to);
      if(at-this.battleClock<=60)scale=1;
      next=Math.min(this.battleClock+dt*scale,at-30);
      if(this.battleClock>=at-30){
        if(this.gate?.id!==segment.gate)this.gate={id:segment.gate,started:this.clock,hold:0};
        this.gate.hold=this.clock-this.gate.started;
        if(segment.gate===E('east_demolition')&&this.gate.hold>90)for(const a of this.actors.filter(a=>a.group==='grp_east_platoon'&&a.active&&a.alive&&a.x>=660)){
          const inView=this.inView(a);
          if(!inView){a.x=655;a.state='reached_safety';this.recoveries.push({id:a.id,reason:'offscreen_straggler',clock:this.clock});}
        }
        if(segment.gate===E('west_demolition')&&this.gate.hold>120&&this.player.x>=-90&&!this.timers.escort){this.timers.escort=true;this.message('Zieliński vem buscá-lo. A demolição espera pela saída da secção.');}
      }
    }else this.gate=null;
    this.battleClock=Math.max(this.battleClock,Math.min(next,seconds(segment.to)));
  }
  inView(a){const angle=Math.atan2(a.z-this.player.z,a.x-this.player.x)-this.player.angle;
    return Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<Math.PI/3&&this.world.lineOfSight(this.player,a);}
  consume(id){
    if(this.consumedEvent(id))return false;
    this.consumed[id]=this.clock;
    const line=n=>this.line(`dlg_m01_${String(n).padStart(3,'0')}`,`${id}:${n}`);
    switch(id){
      case E('intro_card'):break;
      case E('prelude_start'):this.activate('deliver_message');this.mission.phase='SETUP';break;
      case E('railway_worker_report'):line(dist(this.player,this.actor('franciszek_lipski'))<15?8:19);break;
      case E('planes_heard'):this.mission.phase='BUILDUP';line(12);line(13);line(66);this.actor('tadeusz_nowicki').target=this.world.point('repair_site_1');break;
      case E('bombing_0434'):
        this.finish('deliver_message');this.activate('take_cover');this.player.headgear='pl_helmet_wz31';
        this.message('Abrigue-se! Cabeça baixa, junto à cobertura!');
        this.mission.phase='FIRST_CONTACT';this.startScene('cs_m01_bombing');
        this.impact('station_bomb',this.world.point('tczew_station'),true);break;
      case E('forward_post_bombed'):{const p=this.world.point('forward_post');
        const near=dist(this.player,p)<=30;this.flags['m01.forward_post_state']=near?'intact_near_miss':'destroyed';
        this.impact('forward_post',near?{x:0,y:-10,z:-40}:p,true);break;}
      case E('nowicki_lost'):this.flags['m01.nowicki_status']='missing';this.actor('tadeusz_nowicki').active=false;
        this.impact('repair_crater',this.world.point('repair_site_1'),true);break;
      case E('cable_cut'):this.destruction.push('ignition_line_damaged');break;
      case E('wounded_dragged'):this.destruction.push('station_wagon_fire');line(17);break;
      case E('second_air_pass'):this.emit({type:'distant-shot',point:{x:-550,y:20,z:60}});break;
      case E('train963_arrives'):this.enemies.filter(a=>a.group==='grp_de_east').forEach(a=>{a.active=true;});line(25);line(28);break;
      case E('panzerzug_arrives'):line(38);break;
      case E('repair_complete'):this.finish('cover_repair');this.destruction.push('ignition_line_repaired');line(31);line(32);break;
      case E('order_demolish'):this.activate('hold_access');this.pendingCheckpoint='cp_m01_c_engenheiros';this.startScene('cs_m01_order');this.mission.phase='MAIN_COMBAT';
        // Bąk ocupa cedo a posição no tabuleiro: às 06:04 cai em bak_wound_point, à frente do jogador, e não no caminho.
        this.actor('jozef_bak').target=this.world.point('bak_wound_point');break;
      case E('bombing_0530'):this.flags['m01.second_raid_state']='active';this.impact('raid_0530',{x:-600,y:0,z:100},true);break;
      case E('runner_pressure_report'):line(37);break;
      case E('north_contact_distant'):this.emit({type:'distant-shot',point:{x:-500,y:2,z:-1100}});break;
      case E('east_platoon_withdraws'):if(this.timers.holdAccessVisited)this.finish('hold_access');this.activate('cover_withdrawal');this.mission.phase='SET_PIECE';line(39);
        this.actors.filter(a=>a.group==='grp_east_platoon').forEach((a,i)=>{a.active=i<18;});
        this.actor('jozef_bak').target=this.world.point('bak_wound_point');break;
      case E('bak_wounded'):{const bak=this.actor('jozef_bak');
        if(inside(bak,{minX:20,maxX:160,minZ:30,maxZ:50})){bak.state='WOUNDED';bak.target=null;this.flags['m01.bak_status']='wounded';this.activate('rescue_bak');line(41);line(43);}break;}
      case E('germans_on_east_spans'):this.enemies.filter(a=>a.group==='grp_de_spans').forEach((a,i)=>{a.active=true;a.cooldown=2+i*.7;});
        this.message('Eles entram pelo tabuleiro leste! Cubra os últimos homens do pelotão.');break;
      case E('east_demolition'):
        this.finish('cover_withdrawal');this.activate('leave_bridge');this.destruction.push('east_ends_destroyed');this.mission.phase='CLIMAX';
        this.enemies.filter(a=>a.group==='grp_de_spans').forEach((a,i)=>{if(i<4){a.health=0;a.alive=false;a.state='DOWN';}else{a.state='RETREAT';}});
        this.startScene('cs_m01_east_blast');this.impact('east_demolition',{x:800,y:0,z:20},false);
        if(this.flags['m01.bak_status']==='rescued_by_player'&&this.actor('jozef_bak').active)this.actor('leon_dudek').task='evacuate_bak';break;
      case E('dudek_retrieves_bak'):this.flags['m01.bak_status']='rescued_by_dudek';this.flags['m01.dudek_status']='wounded_arm';
        this.objectives[O('rescue_bak')].state='expired';this.player.carrying=null;this.actor('leon_dudek').task='evacuate_bak';break;
      case E('west_demolition'):if(this.done('leave_bridge'))this.finish('hold_corridor');this.activate('reach_shelter');this.destruction.push('west_end_destroyed');this.mission.phase='AFTERMATH';
        this.startScene('cs_m01_west_blast');this.impact('west_demolition',{x:70,y:0,z:20},false);break;
      case E('kozliny_attack_distant'):this.emit({type:'distant-shot',point:{x:-500,y:0,z:-1300}});break;
      case E('roll_call'):this.battleClock=Math.max(this.battleClock,seconds('07:05:00'));this.mission.phase='OUTRO';this.startScene('cs_m01_roll_call');this.stageRollCall();break;
      case E('debrief'):this.flags['m01.completed']=true;this.mission.complete=true;this.checkpoint=this.snapshot();this.emit({type:'complete'});break;
      default:throw new Error(`Evento M01 sem resultado implementado: ${id}`);
    }
    this.world.refresh(Object.keys(this.consumed),this.flags);return true;
  }
  safeImpact(point){
    let p={...point};if(dist(p,this.player)<30){const angle=Math.atan2(p.z-this.player.z,p.x-this.player.x);
      p={x:this.player.x+Math.cos(angle)*40,z:this.player.z+Math.sin(angle)*40,y:point.y};}
    if(dist(p,this.player)<30)throw new Error('Impacto aéreo inseguro.');return p;
  }
  impact(id,point,aerial){
    const p=aerial?this.safeImpact(point):point;
    this.sectors.damage.push({id,...p,started:this.clock,soundAt:this.clock+dist(p,this.player)/343});
    this.emit({type:'m01-blast',point:p,soundAt:this.clock+dist(p,this.player)/343,aerial});
  }
  processEvents(){
    for(let pass=0;pass<4;pass++)for(const event of definition.events){
      if(this.consumedEvent(event.id))continue;
      const ready=event.id===E('bak_wounded')?this.battleClock>=seconds('06:04:00'):this.trigger(event.trigger);
      if(ready&&this.readiness(event.id))this.consume(event.id);
    }
  }
  saveCheckpoint(id){
    if(this.checkpointsReached.includes(id))return;
    this.checkpointsReached.push(id);this.pendingCheckpoint=null;this.checkpoint=this.snapshot();this.emit({type:'checkpoint',id});
  }
  updateObjectives(dt,interact){
    const p=this.player;
    if(this.active('deliver_message')&&interact&&dist(p,this.world.point('forward_post'))<4){
      this.finish('deliver_message');[9,10,11].forEach(n=>this.line(`dlg_m01_${String(n).padStart(3,'0')}`));
      this.battleClock=Math.max(this.battleClock,seconds('04:33:10'));
    }
    const sinceBombing=this.clock-this.consumed[E('bombing_0434')];
    if(this.active('take_cover')&&sinceBombing>=2.5&&(this.world.coverAt(p)||sinceBombing>=12)){
      this.finish('take_cover');this.activate('follow_sergeant');this.actor('marek_zielinski').target=this.world.point('rally_point');
    }
    if(this.active('follow_sergeant')&&dist(p,this.world.point('rally_point'))<8){
      this.finish('follow_sergeant');this.activate('find_sappers');this.pendingCheckpoint='cp_m01_b_reorganizacao';this.line('dlg_m01_020');
    }
    if(this.active('find_sappers')&&dist(p,this.world.point('repair_site_1'))<6){this.finish('find_sappers');this.activate('fetch_material');this.line('dlg_m01_021');this.line('dlg_m01_023');
      // A caixa é entregue no segundo corte (repair_site_2): os sapadores vão para lá enquanto o jogador vai ao barracão.
      const site=this.world.point('repair_site_2');
      // Junto ao cabo, na encosta exposta do aterro; a formação anterior ficava oculta pela crista.
      this.actors.filter(a=>a.role==='ENGINEER'&&a.alive&&a.active).forEach((a,i)=>{a.target={x:site.x-1.5-i*1.2,y:site.y,z:site.z-1+i%2*.4};});}
    if(this.active('fetch_material')&&interact){
      if(!p.carrying&&dist(p,this.world.point('rail_hut'))<5){p.carrying='sapper_crate';this.message('Material recolhido. Leve a caixa aos sapadores.');}
      else if(p.carrying==='sapper_crate'&&dist(p,this.world.point('repair_site_2'))<6){p.carrying=null;this.finish('fetch_material');this.activate('cover_repair');this.line('dlg_m01_024');this.line('dlg_m01_022');}
    }
    if(this.active('cover_repair')){
      if(this.clock>=this.timers.repairSuppressedUntil){this.objectives[O('cover_repair')].progress=Math.min(100,this.objectives[O('cover_repair')].progress+dt*100/75);this.timers.repairStall=0;}
      else this.timers.repairStall+=dt;
      if(this.timers.repairStall>120){this.timers.repairSuppressedUntil=this.clock;
        for(const a of this.enemies.filter(a=>a.weapon==='mg34'))a.cooldown=Math.max(a.cooldown,6);}
      for(const a of this.allies.filter(a=>a.role==='ENGINEER'))a.crouched=this.clock<this.timers.repairSuppressedUntil;
    }
    if(this.active('rescue_bak')&&interact){
      const bak=this.actor('jozef_bak');
      if(!p.carrying&&dist(p,bak)<3){p.carrying='jozef_bak';bak.active=false;this.message('Bąk está consigo. Leve-o ao socorrista.');}
      else if(p.carrying==='jozef_bak'&&dist(p,this.world.point('aid_position'))<4){p.carrying=null;this.finish('rescue_bak');
        this.flags['m01.bak_status']='rescued_by_player';this.flags['m01.dudek_status']='unhurt';this.message('Bąk entregue ao socorrista.');
        const aid=this.world.point('aid_position');Object.assign(bak,{active:true,state:'WOUNDED',target:null,x:aid.x-1.2,z:aid.z+.6});bak.y=this.world.heightAt(bak.x,bak.z);
        if(this.consumedEvent(E('east_demolition')))this.actor('leon_dudek').task='evacuate_bak';}
    }
    const kowal=this.actor('szymon_kowal'),kowalRounds=this.timers.kowalRounds??0;
    if(interact&&!p.carrying&&kowalRounds>0&&kowal.alive&&kowal.active&&dist(p,kowal)<3&&this.weapon.reserve<=25){
      const given=this.weapon.resupply(Math.min(15,kowalRounds));this.timers.kowalRounds=kowalRounds-given;this.timers.lowAmmoHint=false;
      this.message(`Kowal passa-lhe ${given/5} carregador${given>5?'es':''} (+${given}).`);
    }
    if(!this.timers.lowAmmoHint&&kowalRounds>0&&this.weapon.mag+this.weapon.reserve<=10&&kowal.alive&&kowal.active){
      this.timers.lowAmmoHint=true;const d=dist(p,kowal),rel=Math.atan2(kowal.z-p.z,kowal.x-p.x)-p.angle,a=Math.atan2(Math.sin(rel),Math.cos(rel)),deg=Math.abs(a)*180/Math.PI;
      this.message(`Pouca munição. Kowal tem carregadores: ${Math.round(d)} m, ${deg<35?'em frente':deg>120?'atrás de si':a>0?'à sua direita':'à sua esquerda'}`);
    }
    if(this.active('hold_access')&&inside(p,{minX:-10,maxX:160,minZ:30,maxZ:50})){this.timers.holdAccessVisited=true;if(this.consumedEvent(E('east_platoon_withdraws')))this.finish('hold_access');}
    if(this.active('leave_bridge')&&dist(p,this.world.point('firing_point'))<12){this.finish('leave_bridge');this.activate('hold_corridor');this.line('dlg_m01_048');this.line('dlg_m01_049');}
    if(this.active('hold_corridor')&&this.consumedEvent(E('west_demolition')))this.finish('hold_corridor');
    if(this.active('reach_shelter')&&this.done('hold_access')&&this.done('hold_corridor')&&dist(p,this.world.point('shelter'))<5)this.finish('reach_shelter');
    if(this.pendingCheckpoint==='cp_m01_b_reorganizacao'&&this.clock-this.consumed[E('bombing_0434')]>=20)this.saveCheckpoint(this.pendingCheckpoint);
    if(this.pendingCheckpoint==='cp_m01_c_engenheiros'&&this.flags['m01.second_raid_state']==='ended')this.saveCheckpoint(this.pendingCheckpoint);
    if(this.consumedEvent(E('east_demolition'))&&p.x<-20&&!p.carrying&&!(this.battleClock>=seconds('06:36:00')&&p.x>=-90))this.saveCheckpoint('cp_m01_d_retirada');
    const active=definition.objectives.find(o=>o.required&&this.objectives[o.id].state==='active');
    const optional=definition.objectives.find(o=>!o.required&&this.objectives[o.id].state==='active');
    this.mission.text=this.scene?.id==='cs_m01_intro'?phaseText.INTRO:this.scene?.id==='cs_m01_roll_call'?phaseText.OUTRO:
      (active?.text??'Mantenha contacto com a secção')+this.coverStatus+(optional?` · ${optional.text}`:'');
  }
  moveActor(a,target,dt,speed=3.6){
    if(!a.alive||!a.active||a.state==='WOUNDED')return;
    const d=dist(a,target);if(d<.8){a.state='GUARD';return;}
    a.facing=Math.atan2(target.z-a.z,target.x-a.x);a.state='ADVANCE';
    const step=Math.min(d,speed*dt);this.world.move(a,Math.cos(a.facing)*step,Math.sin(a.facing)*step);
    // A blocked follower walks around nearby solid cover instead of clipping through it.
    if(dist(a,target)>d-.01)this.world.move(a,0,dt*speed);
  }
  updateActors(dt){
    const retreat=this.consumedEvent(E('east_demolition'));
    for(const a of this.actors){
      a.shot=Math.max(0,a.shot-dt);if(!a.alive||!a.active)continue;
      if(a.team==='enemy')a.crouched=this.clock<a.suppressedUntil;
      if(a.group==='grp_east_platoon'){
        // Etapas do recuo: portal rodoviário, sul do barracão e passagem pelo posto de disparo até junto da estação.
        // Os limiares ficam aquém dos pontos (moveActor pára a 0,8 m), para nenhum soldado ficar preso numa etapa.
        // O pelotão recua a correr sob fogo (5,5 m/s): ~1,3 km até à estação dentro da fase do corredor.
        const k=Number(a.id.split('_').at(-1));   // lugar próprio no fim, para não se sobreporem
        this.moveActor(a,a.x>-105?{x:-110,z:40}:a.x>-230?{x:-235,z:30}:{x:-322-(k%4)*1.6,z:30+Math.floor(k/4)%6*1.3},dt,5.5);continue;
      }
      if(a.group==='grp_de_spans'){
        const destination=retreat?1080:690;
        if(this.clock>=a.suppressedUntil){a.x+=Math.sign(destination-a.x)*Math.min(Math.abs(destination-a.x),dt*1.5);a.state=retreat?'RETREAT':'ADVANCE';}
        continue;
      }
      if(a.task==='evacuate_bak'){this.evacuate(a,dt);continue;}
      if(a.task==='stay_with_bak'||(this.mission.phase==='OUTRO'&&a.team==='ally'))continue;   // chamada: ninguém sai do lugar
      if(retreat&&a.team==='ally'&&!a.civilian&&a.state!=='WOUNDED')a.target={x:-170,z:22};
      if(this.timers.escort&&a.id==='marek_zielinski')a.target=this.player;
      if(a.target)this.moveActor(a,a.target,dt);
    }
    for(const a of this.actors)if(a.carriedBy){
      // Ferido ao ombro (presentação deriva só destes dados): atravessado sobre o carregador, um pouco atrás.
      const c=this.actor(a.carriedBy);a.facing=c.facing+Math.PI/2;
      a.x=c.x-Math.cos(c.facing)*.25;a.z=c.z-Math.sin(c.facing)*.25;a.y=c.y+1.15;
    }
    if(this.timers.escort){const leader=this.actor('marek_zielinski');
      if(dist(leader,this.player)<3){this.world.move(this.player,-dt*3,0);
        if(!this.timers.escortSpoke){this.timers.escortSpoke=true;this.message('Zieliński: venha comigo, para oeste!');}}
      if(this.player.x<-95)this.timers.escort=false;
    }
  }
  get coverStatus(){
    if(this.active('cover_repair'))return ` · ${Math.floor(this.objectives[O('cover_repair')].progress)}% · ${this.clock<this.timers.repairSuppressedUntil?'Sapadores abrigados — suprima os clarões do dique':'Sapadores a trabalhar'}`;
    if(this.active('cover_withdrawal'))return ` · ${this.flags['m01.east_platoon_survivors']}/18 homens em retirada`;
    return '';
  }
  /** Traço real contra terreno/colisores: só impactos a menos de 3 m causam pressão. */
  incomingFire(a,target){
    const origin=eyePosition(a),dest=eyePosition(target),range=Math.hypot(dest.x-origin.x,dest.y-origin.y,dest.z-origin.z);
    if(!range)return null;
    const direction={x:(dest.x-origin.x)/range,y:(dest.y-origin.y)/range,z:(dest.z-origin.z)/range};
    const hit=traceShot(this.world,origin,direction,[target],range+.2);
    if(!hit||Math.hypot(hit.point.x-dest.x,hit.point.y-dest.y,hit.point.z-dest.z)>3)return null;
    a.shot=.18;a.state='SUPPRESS';a.facing=Math.atan2(target.z-a.z,target.x-a.x);
    this.emit({type:'incoming-shot',actorId:a.id,targetId:target.id,origin,point:hit.point,material:hit.material});
    return {hit,range};
  }
  combatCall(message){if(this.clock<this.timers.nextCombatCall)return;this.timers.nextCombatCall=this.clock+4;this.message(message);}
  updateCombat(dt){
    if(this.mission.phase==='OUTRO')return;
    for(const a of this.enemies.filter(a=>a.alive&&a.active&&a.group==='grp_de_east')){
      a.cooldown-=dt;if(a.cooldown>0||this.clock<a.suppressedUntil)continue;
      a.cooldown=3+this.rng.next()*5;
      const target=this.active('cover_repair')&&a.weapon==='mg34'?this.actor('pawel_krawiec'):this.player;
      const shot=this.incomingFire(a,target);if(!shot)continue;const {hit,range}=shot;
      // Prototype accuracy tuning, not a historical ballistic measurement. Long range and cover
      // reduce hit probability; suppression never means guaranteed damage.
      const chance=(a.weapon==='mg34'?.12:.08)*Math.min(1,(250/range)**2)*(this.world.coverAt(target)?.2:1);
      if(target===this.player&&hit?.actor===target&&this.rng.next()<chance){
        this.player.health=Math.max(0,this.player.health-8);this.player.alive=this.player.health>0;this.emit({type:'player-hit'});
      }
      if(target.id==='pawel_krawiec'){
        this.timers.repairSuppressedUntil=Math.max(this.timers.repairSuppressedUntil,this.clock+2.5);
        this.combatCall('Krawiec: fogo no cabo! Cubra os clarões à esquerda das pontes.');
      }
    }
    if(this.active('cover_withdrawal')&&!this.consumedEvent(E('east_demolition'))){
      const tail=this.allies.filter(a=>a.alive&&a.active&&a.group==='grp_east_platoon'&&a.x>660).sort((a,b)=>b.x-a.x);
      for(const a of this.enemies.filter(a=>a.alive&&a.active&&a.group==='grp_de_spans')){
        a.cooldown-=dt;if(a.cooldown>0||this.clock<a.suppressedUntil||!tail.length)continue;
        a.cooldown=4+this.rng.next()*2;
        const target=tail.find(b=>b.alive&&this.world.lineOfSight(a,b));if(!target||!this.incomingFire(a,target))continue;
        this.timers.withdrawalPressure=Math.min(7,this.timers.withdrawalPressure+1);
        if(this.timers.withdrawalPressure>=7&&this.battleClock-this.timers.withdrawalCasualty>=20&&this.flags['m01.east_platoon_survivors']>12){
          target.health=0;target.alive=false;target.state='DOWN';this.flags['m01.east_platoon_survivors']--;
          this.timers.withdrawalPressure-=7;this.timers.withdrawalCasualty=this.battleClock;
          this.combatCall('Um homem caiu na retirada! Suprima o fogo do tabuleiro leste.');
        }
      }
    }
    const kowal=this.actor('szymon_kowal');kowal.cooldown-=dt;
    if(kowal.active&&kowal.cooldown<=0&&this.consumedEvent(E('train963_arrives'))&&!this.consumedEvent(E('east_demolition'))){
      kowal.cooldown=4;const target=this.enemies.find(a=>a.alive&&a.active&&this.world.lineOfSight(kowal,a));
      if(target){kowal.shot=.15;target.suppressedUntil=Math.max(target.suppressedUntil,this.clock+2);this.emit({type:'npc-shot',point:eyePosition(kowal)});}
    }
  }
  fire(){
    const p=this.player,now=this.clock*1000;if(p.carrying||!this.weapon.shoot(now))return;
    const aim=this.weapon.shotDirection(p.angle,p.pitch,p.aiming,p.moveBlend>.1,this.rng.next);
    const dir=aimDirection(aim.angle,aim.pitch),origin=eyePosition(p),hit=traceShot(this.world,origin,dir,this.actors,1200,muzzlePosition(p));
    p.weaponShotAt=now;p.pitch=Math.min(1.25,p.pitch+.024);
    if(hit?.actor?.team==='enemy'){const a=hit.actor;a.health=Math.max(0,a.health-this.weapon.profile.damage*hit.multiplier);a.alive=a.health>0;a.state=a.alive?'HIT_REACTION':'DOWN';}
    const targetPoint=hit?.point??{x:origin.x+dir.x*1200,y:origin.y+dir.y*1200,z:origin.z+dir.z*1200};
    for(const a of this.enemies.filter(a=>a.alive&&a.active)){
      const d=Math.max(0,(a.x-origin.x)*dir.x+(a.y+1-origin.y)*dir.y+(a.z-origin.z)*dir.z);
      if(d>0&&d<1200&&Math.hypot(a.x-origin.x-dir.x*d,a.y+1-origin.y-dir.y*d,a.z-origin.z-dir.z*d)<3&&(!hit||d<=hit.distance+3)){
        a.suppressedUntil=this.clock+5;
        if(this.active('cover_repair')||this.active('cover_withdrawal'))this.combatCall('Kowal: deitaram! Continue a cobrir.');
      }
    }
    this.emit({type:'player-shot',point:targetPoint,material:hit?.material,hit:hit?.actor?.team==='enemy',weapon:'kb_wz29'});
  }
  updateGrenades(dt,request){
    if(request&&this.grenades.ammo&&!this.player.carrying){const p=this.player,d=aimDirection(p.angle,p.pitch+.12);this.grenades.ammo--;
      this.grenades.active.push({id:`m01_grenade_${this.grenades.nextId++}`,...eyePosition(p),vx:d.x*12,vy:d.y*12+2,vz:d.z*12,fuse:4});}
    for(const g of this.grenades.active){g.fuse-=dt;g.vy-=9.81*dt;
      const step={x:g.vx*dt,y:g.vy*dt,z:g.vz*dt},length=Math.hypot(step.x,step.y,step.z);
      const hit=length>0?traceObstruction(this.world,g,{x:step.x/length,y:step.y/length,z:step.z/length},length):null;
      if(hit){g.vx*=-.3;g.vz*=-.3;g.vy=Math.abs(g.vy)*.3;}
      else{g.x+=step.x;g.y+=step.y;g.z+=step.z;}
      const floor=this.world.heightAt(g.x,g.z)+.08;if(g.y<floor){g.y=floor;g.vy=Math.abs(g.vy)*.3;g.vx*=.65;g.vz*=.65;}
      if(g.fuse<=0){this.impact(g.id,g,false);for(const a of [this.player,...this.enemies]){
        const distance=Math.hypot(a.x-g.x,a.y+.9-g.y,a.z-g.z);
        if(a.alive&&a.active&&distance<8&&this.world.lineOfSight({...g,space:'metres',eyeHeight:.04},a)){
          a.health=Math.max(0,a.health-(1-distance/8)*100);a.alive=a.health>0;}
      }}
    }this.grenades.active=this.grenades.active.filter(g=>g.fuse>0);
  }
  boundaries(dt){
    const p=this.player,b=this.world.layout.bounds;
    if(p.x>b.softWarningX&&!this.timers.boundaryWarning){this.timers.boundaryWarning=true;this.message('Você está demasiado longe. Volte à sua secção, para oeste.');}
    if(p.x<=b.softWarningX)this.timers.boundaryWarning=false;
    const a=b.playable,out=p.x>b.outOfBoundsX||p.x<a.minX||p.z<a.minZ||p.z>a.maxZ;
    this.timers.boundary=out?this.timers.boundary+dt:0;
    this.timers.water=p.y<=-9?this.timers.water+dt:0;
    const countdown=Math.max(0,Math.ceil(b.outOfBoundsGraceSec-this.timers.boundary));
    if(out&&countdown!==this.timers.boundaryCountdown){this.timers.boundaryCountdown=countdown;this.message(`Você se afastou da sua secção. Volte em ${countdown} s.`);}
    if(this.timers.boundary>=b.outOfBoundsGraceSec||this.timers.water>=8){
      this.failure=this.timers.water>=8?'Você caiu no Vístula.':'Você se afastou da sua secção.';this.player.alive=false;
    }
  }
  tick(dt,controls={}){
    if(!Number.isFinite(dt)||dt<=0||this.mission.complete)return;dt=Math.min(.05,dt);
    if(!this.player.alive){const reason=this.failure;this.restoreCheckpoint();this.emit({type:'restored'});if(reason)this.message(reason);return;}
    this.clock+=dt;const p=this.player;
    p.angle+=(controls.lookX??0)*.0022;p.pitch=Math.max(-1.25,Math.min(1.25,p.pitch-(controls.lookY??0)*.0022));p.aiming=Boolean(controls.aim);
    if(controls.crouch)p.crouched=!p.crouched;
    this.updateScene(dt,controls.skip);
    const locked=this.scene?.id==='cs_m01_intro'||this.scene?.id==='cs_m01_roll_call';
    if(locked&&this.scene.id==='cs_m01_intro')this.advanceBattle(dt);
    if(!locked){
      const f=controls.forward??0,s=controls.side??0,len=Math.hypot(f,s)||1;
      const speed=(controls.sprint?6:3.8)*(p.carrying?.55:1)*(p.crouched?.6:1)*(p.aiming?.65:1);
      const dx=(Math.cos(p.angle)*f-Math.sin(p.angle)*s)*speed*dt/len,dz=(Math.sin(p.angle)*f+Math.cos(p.angle)*s)*speed*dt/len;
      const before={x:p.x,z:p.z};this.world.move(p,dx,dz);p.moveBlend=Math.min(1,dist(before,p)/(dt*3.8));p.sprinting=Boolean(controls.sprint)&&p.moveBlend>.1;
      this.weapon.update(this.clock*1000);
      if(controls.reload&&this.weapon.reload(this.clock*1000))this.emit({type:'reload',weapon:'kb_wz29'});
      if(controls.sight)this.message(`Alça: ${this.weapon.adjustSight()} m`);
      if(controls.fire)this.fire();this.updateGrenades(dt,controls.grenade);
      this.advanceBattle(dt);this.boundaries(dt);
    }
    this.updateActors(dt);this.updateCombat(dt);
    if(!p.alive)return;
    this.updateObjectives(dt,controls.interact);this.processEvents();
    if(this.flags['m01.second_raid_state']==='active'&&this.battleClock>=seconds('05:34:00'))this.flags['m01.second_raid_state']='ended';
    for(const sector of this.sectors.sectors){const schedule=definition.sectors.find(s=>s.id===sector.id).schedule;
      const current=schedule.filter(s=>seconds(s.at)<=this.battleClock).at(-1);sector.state=current.state;
      if(sector.id==='s2_east_bridgehead')sector.strength=this.enemies.filter(a=>a.alive).length*2;}
    if(this.battleClock>=seconds('06:36:00')&&!this.consumedEvent(E('west_demolition')))this.line('dlg_m01_050');
    if(this.battleClock>=seconds('06:38:30')&&!this.consumedEvent(E('west_demolition')))this.line('dlg_m01_051');
    if(this.active('follow_sergeant')&&this.clock>this.timers.guide){this.timers.guide=this.clock+7;this.message('Zieliński chama-o da trincheira, a oeste.');}
    this.updateGuide();
    if(this.active('hold_access')){
      const cover=this.world.coverAt(p)?.id??null;
      if(cover!==this.timers.occupiedCover){this.timers.occupiedCover=cover;this.timers.coverExposure=0;}
      else if(cover)this.timers.coverExposure+=dt;
      if(this.timers.coverExposure>=42&&this.clock>this.timers.nextCoverCall){
        const rotation=['cv_sandbag_mid_2','cv_portal_road_n','cv_road_truss_1','cv_road_truss_3','cv_tower_p1_n'];
        this.flags['m01.suggested_cover']=rotation[this.timers.coverCallIndex++%rotation.length];
        this.timers.nextCoverCall=this.clock+42;this.message('Zieliński: estão a ajustar o fogo! Mude de cobertura.');
        const enemy=this.enemies.find(a=>a.alive&&a.active&&this.world.lineOfSight(a,p));
        if(enemy){enemy.cooldown=0;enemy.state='SUPPRESS';this.emit({type:'cover-suppression',point:eyePosition(p)});}
      }
    }
    if(this.subtitle&&this.clock>=this.subtitle.until)this.subtitle=null;
    if(!this.subtitle&&this.dialogueQueue.length){this.subtitle=this.dialogueQueue.shift();this.subtitle.until=this.clock+this.subtitle.duration;}
  }
  /** Dudek vai até Bąk, carrega-o e deixa-o junto à estação; Bąk nunca fica na zona de demolição oeste. */
  evacuate(medic,dt){
    const bak=this.actor('jozef_bak');
    if(!bak.alive||!bak.active){medic.task=null;return;}
    if(bak.carriedBy!==medic.id){
      this.moveActor(medic,bak,dt,4.5);
      if(dist(medic,bak)<1.6)bak.carriedBy=medic.id;
      return;
    }
    this.moveActor(medic,EVACUATION,dt,3);
    if(dist(medic,EVACUATION)<1.2){
      bak.carriedBy=null;bak.x=medic.x+.9;bak.z=medic.z+.7;bak.y=this.world.heightAt(bak.x,bak.z);bak.facing=medic.facing;
      // Ramo Dudek: fica com Bąk na estação (dlg_m01_056b/057b). Ramo do jogador: volta à secção (dlg_m01_057a).
      medic.task=this.flags['m01.bak_status']==='rescued_by_dudek'?'stay_with_bak':null;medic.target=null;medic.state='GUARD';
    }
  }
  /** 07:05: os presentes na chamada reúnem-se no abrigo, de frente para Jan; ausentes ficam onde estão. */
  stageRollCall(){
    const present=['marek_zielinski','szymon_kowal','pawel_krawiec','staszek_pawlak','sapper_2','sapper_3',
      ...(this.flags['m01.dudek_status']==='unhurt'?['leon_dudek']:[]),...(this.flags['m01.bak_status']==='unhurt'?['jozef_bak']:[])]
      .map(id=>this.actor(id)).filter(a=>a&&a.alive&&a.active&&!a.carriedBy&&a.state!=='WOUNDED');
    const p=this.player,shelter=this.world.point('shelter');
    Object.assign(p,{x:shelter.x-.5,z:shelter.z-1.8,crouched:true,pitch:-.06});p.y=this.world.heightAt(p.x,p.z);
    present.forEach((a,i)=>{const [x,z]=ROLL_CALL_SEATS[i%ROLL_CALL_SEATS.length];
      Object.assign(a,{x,z,target:null,task:null,state:'GUARD',pose:'seated',crouched:true});a.y=this.world.heightAt(x,z);a.facing=Math.atan2(p.z-z,p.x-x);});
    p.angle=Math.atan2(72.6-p.z,-260-p.x);
  }
  /** Destino do objectivo activo que exige deslocação (dados do mapa ou actor). */
  guideTarget(){
    const p=this.player,pt=id=>this.world.point(id);
    if(this.active('rescue_bak'))return p.carrying==='jozef_bak'?{label:'Socorrista Dudek',point:pt('aid_position')}:{label:'Bąk ferido',point:this.actor('jozef_bak')};
    if(this.active('deliver_message'))return {label:'Posto da ponte ferroviária',point:pt('forward_post')};
    if(this.active('find_sappers'))return {label:'Sapadores no aterro',point:pt('repair_site_1')};
    if(this.active('fetch_material'))return p.carrying?{label:'Sapadores no segundo corte da linha',point:pt('repair_site_2')}:{label:'Barracão ferroviário, porta oeste',point:pt('rail_hut')};
    if(this.active('cover_repair')){const mg=this.enemies.find(a=>a.alive&&a.active&&a.weapon==='mg34');if(mg)return {label:'Metralhadora no dique · V para alça 1000 m',point:mg};}
    if(this.active('leave_bridge'))return {label:'Posto de disparo',point:pt('firing_point')};
    if(this.active('reach_shelter'))return {label:'Abrigo',point:pt('shelter')};
    return null;
  }
  /** Mostra destino, distância e lado quando o jogador não se aproxima; cala-se enquanto ele progride. */
  updateGuide(){
    const t=this.timers,g=this.scene?.id==='cs_m01_intro'||this.scene?.id==='cs_m01_roll_call'?null:this.guideTarget();
    if(!g){t.guideKey=null;return;}
    const p=this.player,d=dist(p,g.point);
    if(t.guideKey!==g.label){t.guideKey=g.label;t.guideAt=this.clock+4;t.guideDist=d;t.guideShown=false;return;}
    if(this.clock<t.guideAt)return;
    const progressing=t.guideDist-d>=8;t.guideAt=this.clock+15;t.guideDist=d;
    if(d<10||(t.guideShown&&progressing))return;
    t.guideShown=true;
    const rel=Math.atan2(g.point.z-p.z,g.point.x-p.x)-p.angle,a=Math.atan2(Math.sin(rel),Math.cos(rel)),deg=Math.abs(a)*180/Math.PI;
    this.message(`${g.label}: ${Math.round(d)} m, ${deg<35?'em frente':deg>120?'atrás de si':a>0?'à sua direita':'à sua esquerda'}`);
  }
  get interaction(){
    const p=this.player;
    if(this.scene&&definition.cutscenes.find(c=>c.id===this.scene.id).skippable)return 'Espaço · saltar cena';
    if(this.active('deliver_message')&&dist(p,this.world.point('forward_post'))<4)return 'E · entregar mensagem e café';
    if(this.active('fetch_material')&&dist(p,this.world.point(p.carrying?'repair_site_2':'rail_hut'))<6)return p.carrying?'E · entregar material':'E · carregar material';
    if(this.active('rescue_bak')&&dist(p,p.carrying?this.world.point('aid_position'):this.actor('jozef_bak'))<4)return p.carrying?'E · entregar Bąk':'E · levar Bąk';
    const kowal=this.actor('szymon_kowal');
    if(!p.carrying&&(this.timers.kowalRounds??0)>0&&kowal.alive&&kowal.active&&dist(p,kowal)<3&&this.weapon.reserve<=25)return 'E · pedir munição a Kowal';
    return p.carrying?'Está a transportar '+(p.carrying==='jozef_bak'?'Bąk':'material dos sapadores'):'';
  }
  get renderState(){
    const parts={};for(const file of manifest.files.filter(f=>f.lod===0))for(const n of file.nodes){
      const origin=n.pivot??[0,0,0],z=origin[2]+file.placement.translation[2];const d=Math.hypot(origin[0]-this.player.x,z-this.player.z);
      parts[n.name]={lod:d<400?0:d<800?1:2,visible:n.name.endsWith('portal_west')? !this.consumedEvent(E('west_demolition')):
        n.showAfterEvent?this.consumedEvent(n.showAfterEvent):!n.destroyedBy||!this.consumedEvent(n.destroyedBy)};
    }return {parts,events:Object.keys(this.consumed),destruction:[...this.destruction],flags:{...this.flags},
      battleClock:this.battleClock,interaction:this.interaction,subtitle:this.subtitle,scene:this.scene,
      debrief:definition.debrief.paragraphs.filter(p=>p.enabled),repairProgress:this.objectives[O('cover_repair')].progress,
      train963:this.consumedEvent(E('train963_arrives')),panzerzug:this.consumedEvent(E('panzerzug_arrives')),
      stukas:this.consumedEvent(E('planes_heard'))&&!this.consumedEvent(E('second_air_pass')),
      secondRaid:this.flags['m01.second_raid_state']==='active',weaponVisible:!this.player.carrying&&this.scene?.id!=='cs_m01_roll_call',
      damage:this.sectors.damage.map(d=>({...d,smokeVisible:this.clock-d.started<240||d.id==='station_bomb'}))};
  }
  snapshot(){return clone({schema:2,missionId:this.missionId,clock:this.clock,battleClock:this.battleClock,rng:this.rng.state,
    player:this.player,weapon:this.weapon.snapshot(),actors:this.actors,consumed:this.consumed,objectives:this.objectives,flags:this.flags,
    destruction:this.destruction,dialogueConsumed:this.dialogueConsumed,dialogueQueue:this.dialogueQueue,subtitle:this.subtitle,
    scene:this.scene,sceneDone:this.sceneDone,checkpointsReached:this.checkpointsReached,pendingCheckpoint:this.pendingCheckpoint,
    gate:this.gate,recoveries:this.recoveries,timers:this.timers,sectors:this.sectors,grenades:this.grenades,mission:this.mission});}
  restoreSnapshot(raw){
    const s=clone(raw);validateM01Snapshot(s);const candidate=new M01Simulation(s.rng);
    for(const key of ['clock','battleClock','player','actors','consumed','objectives','flags','destruction','dialogueConsumed','dialogueQueue','subtitle',
      'scene','sceneDone','checkpointsReached','pendingCheckpoint','gate','recoveries','timers','sectors','grenades','mission'])candidate[key]=s[key];
    candidate.timers={...s.timers,kowalRounds:s.timers.kowalRounds??30,lowAmmoHint:s.timers.lowAmmoHint??false,
      withdrawalPressure:s.timers.withdrawalPressure??0,nextCombatCall:s.timers.nextCombatCall??0};
    // As seis instâncias de reserva nunca contam nos dezoito homens; saves antigos activavam as 24.
    if(!('withdrawalPressure' in s.timers))for(const a of candidate.actors.filter(a=>a.group==='grp_east_platoon'&&Number(a.id.split('_').at(-1))>=18))a.active=false;
    candidate.weapon.restore(s.weapon);candidate.rng.state=s.rng;candidate.events=[];candidate.world.refresh(Object.keys(s.consumed),s.flags);
    candidate.checkpoint=clone(s);Object.assign(this,candidate);return true;
  }
  restoreCheckpoint(){return this.restoreSnapshot(this.checkpoint);}
  loadCheckpoint(text){try{if(typeof text!=='string'||text.length>1000000)throw new Error('Ficheiro ausente ou demasiado grande.');this.restoreSnapshot(JSON.parse(text));return {ok:true};}catch(error){return {ok:false,error:error.message};}}
}

export function validateM01Snapshot(s){
  const reject=message=>{throw new Error('Checkpoint M01 inválido: '+message);};
  if(!s||s.schema!==2||s.missionId!==definition.id)reject('versão ou missão');
  const scan=(v,depth=0)=>{if(depth>14)reject('estrutura');if(typeof v==='number'&&!Number.isFinite(v))reject('número');
    if(v&&typeof v==='object')for(const [k,item]of Object.entries(v)){if(['__proto__','constructor','prototype','isObject3D','matrixWorld'].includes(k))reject('campo');scan(item,depth+1);}};scan(s);
  if(!Number.isFinite(s.clock)||s.clock<0||!Number.isFinite(s.battleClock)||s.battleClock<seconds('04:30:00')||s.battleClock>seconds('07:05:00')||!Number.isInteger(s.rng))reject('relógios');
  const finite=(v,min=0,max=Infinity)=>Number.isFinite(v)&&v>=min&&v<=max;
  const point=p=>p&&p.space==='metres'&&[p.x,p.y,p.z].every(Number.isFinite)&&finite(p.health,0,100)&&typeof p.alive==='boolean';
  if(!point(s.player)||s.player.health<=0||s.player.health>100||!s.player.alive||![s.player.angle,s.player.pitch].every(Number.isFinite))reject('jogador');
  const actorIds=[...definition.cast.filter(c=>c.id!=='jan_wrona').map(c=>c.id),...Array.from({length:40},(_,i)=>`de_east_${i}`),...Array.from({length:10},(_,i)=>`de_spans_${i}`),...Array.from({length:24},(_,i)=>`pl_east_${i}`)];
  if(!Array.isArray(s.actors)||s.actors.length!==actorIds.length||new Set(s.actors.map(a=>a.id)).size!==s.actors.length||!s.actors.every(a=>point(a)&&actorIds.includes(a.id)&&Number.isFinite(a.radius)&&a.radius>0))reject('actores');
  if(s.actors.some(a=>a.team==='enemy'&&a.x<690)||s.actors.some(a=>definition.historicalPersonsOffscreen.some(h=>h.id===a.id)))reject('elenco');
  if(s.actors.some(a=>a.team!==(a.id.startsWith('de_')?'enemy':'ally')||
    !['GUARD','ADVANCE','SUPPRESS','RETREAT','HIT_REACTION','DOWN','WOUNDED','reached_safety'].includes(a.state)||
    ![a.facing,a.shot,a.cooldown,a.suppressedUntil].every(Number.isFinite)||typeof a.active!=='boolean'||(a.target&&![a.target.x,a.target.z].every(Number.isFinite))))reject('estado dos actores');
  if(s.actors.some(a=>(a.carriedBy!=null&&!s.actors.some(c=>c.id===a.carriedBy&&c.alive))||(a.task!=null&&!['evacuate_bak','stay_with_bak'].includes(a.task))))reject('transporte');
  if(s.actors.some(a=>a.pose!=null&&a.pose!=='seated'))reject('pose');
  const w=s.weapon;
  if(w?.id!=='kb_wz29'||!Number.isInteger(w.mag)||w.mag<0||w.mag>5||!Number.isInteger(w.reserve)||w.reserve<0||w.reserve>40||
    !['READY','BOLT_CYCLE','RELOAD_CLIP','RELOAD_SINGLE'].includes(w.state)||![300,500,800,1000].includes(w.sight)||![w.until,w.started,w.lastShot,w.shotCount].every(Number.isFinite)||
    !Number.isInteger(w.shotCount)||w.shotCount<0||!Number.isInteger(w.received??0)||(w.received??0)<0||(w.received??0)>30||
    w.mag+w.reserve+w.shotCount!==45+(w.received??0))reject('arma');
  if(!s.consumed||Object.keys(s.consumed).some(id=>!definition.events.some(e=>e.id===id))||Object.values(s.consumed).some(t=>!Number.isFinite(t)||t<0||t>s.clock))reject('eventos');
  if(!s.objectives||definition.objectives.some(o=>!s.objectives[o.id]||!['locked','active','done','expired'].includes(s.objectives[o.id].state)||!Number.isFinite(s.objectives[o.id].progress)||s.objectives[o.id].progress<0||s.objectives[o.id].progress>100))reject('objectivos');
  if(!s.flags||!Number.isInteger(s.flags['m01.east_platoon_survivors'])||s.flags['m01.east_platoon_survivors']<12||s.flags['m01.east_platoon_survivors']>18)reject('continuidade');
  for(const [key,values]of Object.entries({'m01.nowicki_status':['present','missing'],
    'm01.bak_status':['unhurt','wounded','rescued_by_player','rescued_by_dudek'],'m01.dudek_status':['unhurt','wounded_arm'],
    'm01.second_raid_state':['pending','active','ended'],'m01.forward_post_state':['pending','destroyed','intact_near_miss']}))if(!values.includes(s.flags[key]))reject('flag '+key);
  if(typeof s.flags['m01.completed']!=='boolean')reject('conclusão');
  if(!s.grenades||!Array.isArray(s.grenades.active)||!Number.isInteger(s.grenades.ammo)||s.grenades.ammo<0||s.grenades.ammo>2)reject('granadas');
  if(!s.sectors?.sectors||s.sectors.sectors.length!==5||!Array.isArray(s.sectors.damage)||!s.timers||!s.mission||typeof s.mission.complete!=='boolean')reject('estado');
  if(s.sectors.sectors.some((sector,i)=>sector.id!==definition.sectors[i].id||!definition.sectors[i].schedule.some(entry=>entry.state===sector.state)||
    ![sector.strength,sector.morale,sector.supply].every(Number.isFinite)))reject('sectores');
  if(s.sectors.damage.some(d=>typeof d.id!=='string'||![d.x,d.y,d.z].every(Number.isFinite)||!finite(d.started,0,s.clock)||!finite(d.soundAt,d.started)))reject('destruição');
  if(!Number.isInteger(s.grenades.nextId)||s.grenades.nextId<0||s.grenades.active.length>2||s.grenades.active.some(g=>typeof g.id!=='string'||![g.x,g.y,g.z,g.vx,g.vy,g.vz,g.fuse].every(Number.isFinite)||g.fuse<=0))reject('granadas em voo');
  for(const key of ['boundary','water','cover','repairStall','repairSuppressedUntil','withdrawalCasualty','ambient','nextCoverCall','guide',
    'boundaryCountdown','coverExposure','coverCallIndex'])if(!finite(s.timers[key]))reject('timer '+key);
  for(const key of ['guideAt','guideDist'])if(key in s.timers&&!finite(s.timers[key]))reject('timer '+key);
  if('guideKey' in s.timers&&s.timers.guideKey!==null&&typeof s.timers.guideKey!=='string')reject('timer guideKey');
  if('guideShown' in s.timers&&typeof s.timers.guideShown!=='boolean')reject('timer guideShown');
  if('kowalRounds' in s.timers&&(!Number.isInteger(s.timers.kowalRounds)||s.timers.kowalRounds<0||s.timers.kowalRounds>30))reject('timer kowalRounds');
  if((s.timers.kowalRounds??30)+(s.weapon?.received??0)!==30)reject('munição da secção');
  if('lowAmmoHint' in s.timers&&typeof s.timers.lowAmmoHint!=='boolean')reject('timer lowAmmoHint');
  if('withdrawalPressure' in s.timers&&(!Number.isInteger(s.timers.withdrawalPressure)||!finite(s.timers.withdrawalPressure,0,7)))reject('timer withdrawalPressure');
  if('nextCombatCall' in s.timers&&!finite(s.timers.nextCombatCall))reject('timer nextCombatCall');
  for(const key of ['escort','escortSpoke','boundaryWarning','holdAccessVisited'])if(typeof s.timers[key]!=='boolean')reject('timer '+key);
  if(!Array.isArray(s.destruction)||!Array.isArray(s.sceneDone)||!Array.isArray(s.dialogueConsumed)||!Array.isArray(s.dialogueQueue)||!Array.isArray(s.checkpointsReached)||!Array.isArray(s.recoveries))reject('listas');
  const knownScene=id=>definition.cutscenes.some(c=>c.id===id);
  if(s.sceneDone.some(id=>!knownScene(id))||new Set(s.sceneDone).size!==s.sceneDone.length)reject('cenas terminadas');
  if(s.scene){const scene=definition.cutscenes.find(c=>c.id===s.scene.id);
    if(!scene||!finite(s.scene.elapsed)||!Array.isArray(s.scene.beats)||s.scene.beats.some(i=>!Number.isInteger(i)||i<0||i>=scene.timeline.length))reject('cena');}
  if(s.gate&&(![E('repair_complete'),E('east_demolition'),E('west_demolition')].includes(s.gate.id)||!finite(s.gate.started,0,s.clock)||!finite(s.gate.hold)))reject('gate');
  if(s.checkpointsReached.some(id=>!definition.checkpoints.some(c=>c.id===id))||new Set(s.checkpointsReached).size!==s.checkpointsReached.length||
    (s.pendingCheckpoint!==null&&!definition.checkpoints.some(c=>c.id===s.pendingCheckpoint)))reject('checkpoint');
  if(s.dialogueConsumed.some(token=>typeof token!=='string')||new Set(s.dialogueConsumed).size!==s.dialogueConsumed.length)reject('falas consumidas');
  const dialogue=d=>d&&definition.dialogue.some(line=>line.id===d.id)&&typeof d.speaker==='string'&&typeof d.text==='string'&&d.text.length<600&&finite(d.duration,1,15);
  if(s.dialogueQueue.some(d=>!dialogue(d))||(s.subtitle&&(!dialogue(s.subtitle)||!finite(s.subtitle.until))))reject('legendas');
  if(s.mission.complete!==s.flags['m01.completed']||s.mission.complete!==Object.hasOwn(s.consumed,E('debrief')))reject('estado final');
  return s;
}
