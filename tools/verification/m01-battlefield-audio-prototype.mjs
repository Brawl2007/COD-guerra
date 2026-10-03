import {performance} from 'node:perf_hooks';

export const SPEED_OF_SOUND=343;
export const DISTANCE_BANDS=Object.freeze([
  {name:'CLOSE',max:45},
  {name:'MID',max:220},
  {name:'DISTANT',max:950},
  {name:'VERY_DISTANT',max:5000},
  {name:'BEYOND',max:Infinity},
]);

export const PRIORITY=Object.freeze({CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1});
export const QUALITY_BUDGETS=Object.freeze({
  low:{global:32,dialogue:4,weapons:12,explosions:6,vehicles:4,aircraft:3,ambience:5,debris:2,reflections:0,secondaryTails:0,distantVoices:8},
  medium:{global:48,dialogue:5,weapons:18,explosions:9,vehicles:6,aircraft:4,ambience:7,debris:4,reflections:1,secondaryTails:1,distantVoices:16},
  high:{global:72,dialogue:6,weapons:28,explosions:12,vehicles:8,aircraft:6,ambience:10,debris:6,reflections:2,secondaryTails:2,distantVoices:28},
});

const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot((a.x??0)-(b.x??0),(a.y??0)-(b.y??0),(a.z??0)-(b.z??0));
const hash32=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const unit=value=>(hash32(value)%1000003)/1000003;

export function distanceBand(metres){return DISTANCE_BANDS.find(b=>metres<b.max)?.name??'BEYOND';}
export function propagationDelay(metres,speed=SPEED_OF_SOUND){return Math.max(0,metres)/speed;}
export function attenuation(metres,{reference=18,rolloff=1.35,minGain=0.004}={}){
  if(metres<=reference)return 1;
  return Math.max(minGain,1/Math.pow(1+(metres-reference)/reference,rolloff));
}
export function airLowPass(metres){return Math.round(1800+18200/(1+Math.pow(Math.max(0,metres)/210,1.12)));}
export function stereoPan(source,listener){
  const dx=source.x-listener.position.x,dz=source.z-listener.position.z;
  const bearing=Math.atan2(dz,dx)-(listener.yaw??0);
  return clamp(Math.sin(bearing),-1,1);
}

export function presentationVariation(event){
  const base=`${event.id}|${event.type}|${event.sourceId??''}`;
  return {
    sampleIndex:hash32(`${base}|sample`)%4,
    pitch:Number((.985+unit(`${base}|pitch`)*.03).toFixed(6)),
    gain:Number((.96+unit(`${base}|gain`)*.08).toFixed(6)),
    tailIndex:hash32(`${base}|tail`)%3,
  };
}

export function occlusionModel({blocked=false,thickness=0,portals=0}={}){
  if(!blocked)return {gain:1,lowPass:20000,wet:0};
  const escape=clamp(portals*.18,0,.55),mass=clamp(thickness/2,0,1);
  return {gain:Number((.44+escape-.16*mass).toFixed(4)),lowPass:Math.round(1850+2100*escape-650*mass),wet:Number((.22+.18*mass).toFixed(4))};
}

export const ENVIRONMENTS=Object.freeze({
  OUTDOOR:{early:0.04,decay:.35,lowPass:20000,wet:.04},
  SMALL_ROOM:{early:.32,decay:.85,lowPass:14500,wet:.28},
  LARGE_ROOM:{early:.27,decay:1.8,lowPass:16000,wet:.34},
  FACTORY:{early:.38,decay:2.7,lowPass:15500,wet:.4},
  TUNNEL:{early:.48,decay:3.5,lowPass:11200,wet:.52},
  CASEMATE:{early:.42,decay:2.1,lowPass:9800,wet:.46},
});

export function environmentModel(name='OUTDOOR',quality='high'){
  const env=ENVIRONMENTS[name]??ENVIRONMENTS.OUTDOOR,budget=QUALITY_BUDGETS[quality]??QUALITY_BUDGETS.high;
  return {...env,reflectionTaps:budget.reflections,secondaryTails:budget.secondaryTails};
}

export function eventPriority(event,distanceMetres){
  if(event.category==='dialogue'&&event.missionCritical)return 'CRITICAL';
  if(event.sourceId==='player'||event.category==='player_weapon')return 'CRITICAL';
  if(event.type==='explosion'&&distanceMetres<=35)return 'CRITICAL';
  if(event.type==='explosion'&&distanceMetres<=1500)return 'MEDIUM';
  if(event.category==='weapon'&&distanceMetres<=80)return 'HIGH';
  if(['vehicle','aircraft'].includes(event.category)&&distanceMetres<=180)return 'HIGH';
  if(event.category==='dialogue')return event.dialogueClass==='ambient_bark'?'LOW':'HIGH';
  if(distanceMetres<=850)return 'MEDIUM';
  return 'LOW';
}

export function categoryOf(event){
  if(event.category)return event.category;
  if(/explosion|artillery_impact/.test(event.type))return 'explosions';
  if(/weapon|shot|mg_exchange/.test(event.type))return 'weapons';
  if(/dialogue|bark/.test(event.type))return 'dialogue';
  if(/vehicle|tank/.test(event.type))return 'vehicles';
  if(/aircraft/.test(event.type))return 'aircraft';
  if(/debris/.test(event.type))return 'debris';
  return 'ambience';
}

export function isExpiredOneShot(event,now){
  const ttl=event.ttl??(event.category==='dialogue'?8:event.type==='explosion'?4:2.2);
  return now>(event.emittedAt??0)+ttl;
}

export function validateAudioEvent(event){
  const required=['id','type','sourceId','position','emittedAt','category','intensity','priority'];
  const missing=required.filter(k=>event[k]===undefined||event[k]===null);
  if(missing.length)return {ok:false,reason:`missing:${missing.join(',')}`};
  if(!['x','y','z'].every(k=>Number.isFinite(event.position[k])))return {ok:false,reason:'position'};
  if(!Number.isFinite(event.emittedAt)||!Number.isFinite(event.intensity))return {ok:false,reason:'numeric'};
  return {ok:true};
}

export function planAudioEvent(event,listener,{quality='high',occlusion={},environment='OUTDOOR',now=event.emittedAt,audioEnabled=true}={}){
  const check=validateAudioEvent(event);if(!check.ok)throw new Error(`invalid audio event ${event.id}: ${check.reason}`);
  const d=distance(event.position,listener.position),band=distanceBand(d),occ=occlusionModel(occlusion),env=environmentModel(environment,quality);
  const priority=event.priority==='AUTO'?eventPriority(event,d):event.priority;
  const travel=event.instantLocal?0:propagationDelay(d),audibleAt=event.emittedAt+travel;
  const expired=isExpiredOneShot(event,now),baseGain=attenuation(d)*clamp(event.intensity,0,2),gain=baseGain*occ.gain;
  const audibilityFloor=categoryOf(event)==='explosions'?.002:categoryOf(event)==='aircraft'?.003:.006;
  const virtual=!audioEnabled||expired||band==='BEYOND'||gain<audibilityFloor;
  const highCut=Math.min(airLowPass(d),occ.lowPass,env.lowPass);
  return {
    id:event.id,type:event.type,category:categoryOf(event),sourceId:event.sourceId,distance:Number(d.toFixed(3)),band,
    emittedAt:event.emittedAt,audibleAt:Number(audibleAt.toFixed(6)),delay:Number(travel.toFixed(6)),pan:Number(stereoPan(event.position,listener).toFixed(6)),
    gain:Number(gain.toFixed(6)),lowPass:highCut,wet:Number(Math.max(occ.wet,env.wet).toFixed(4)),priority,
    variation:presentationVariation(event),virtual,expired,environment,quality,
  };
}

export function allocateVoices(plans,{quality='high'}={}){
  const budget=QUALITY_BUDGETS[quality]??QUALITY_BUDGETS.high,used={},active=[],virtual=[];
  const ranked=[...plans].sort((a,b)=>(PRIORITY[b.priority]??0)-(PRIORITY[a.priority]??0)||a.distance-b.distance||a.id.localeCompare(b.id));
  for(const plan of ranked){
    const cat=plan.category,count=used[cat]??0,limit=budget[cat]??budget.ambience;
    if(plan.virtual||active.length>=budget.global||count>=limit){virtual.push({...plan,virtual:true,virtualReason:plan.virtual?'inaudible_or_expired':active.length>=budget.global?'global_budget':'category_budget'});continue;}
    active.push(plan);used[cat]=count+1;
  }
  return {active,virtual,budget,used};
}

export function convertBattleSectorEvent(event){
  const p=event.position??event.point??event.origin;if(!p)throw new Error('sector event requires position');
  const common={sourceId:event.sectorId??event.sector??'sector',position:p,emittedAt:event.emittedAt??event.at??0,intensity:event.intensity??.75,priority:'AUTO'};
  if(event.type==='sector_artillery_event')return {...common,id:event.id,type:'artillery_impact',category:'explosions',weaponType:'artillery'};
  if(event.type==='sector_mg_exchange')return {...common,id:event.id,type:'weapon_exchange',category:'weapons',weaponType:'mg'};
  if(event.type==='sector_vehicle_fire')return {...common,id:event.id,type:'vehicle_weapon',category:'vehicles',weaponType:event.weaponType??'tank_cannon'};
  if(event.type==='sector_explosion')return {...common,id:event.id,type:'explosion',category:'explosions'};
  throw new Error(`unsupported sector event: ${event.type}`);
}

export function dialogueMix({missionCritical=false,className='combat_bark'}={}){
  if(missionCritical)return {priority:'CRITICAL',duck:{weaponsDb:-3,explosionsDb:-1,ambienceDb:-5,vehiclesDb:-3}};
  if(className==='squad_callout')return {priority:'HIGH',duck:{weaponsDb:-1.5,explosionsDb:0,ambienceDb:-3,vehiclesDb:-1.5}};
  if(className==='ambient_bark')return {priority:'LOW',duck:null};
  return {priority:'MEDIUM',duck:{weaponsDb:-1,explosionsDb:0,ambienceDb:-2,vehiclesDb:-1}};
}

export function snapshotMix(snapshot='NORMAL'){
  return ({
    NORMAL:{masterDb:0,lowPass:20000,tone:null,recovery:0},
    SUPPRESSED:{masterDb:-1.5,lowPass:13500,tone:null,recovery:.8},
    NEAR_EXPLOSION:{masterDb:-5,lowPass:4200,tone:{hz:6100,db:-19},recovery:2.8},
    INDOOR:{masterDb:0,lowPass:16000,tone:null,recovery:.15},
    VEHICLE_INTERIOR:{masterDb:-1,lowPass:9800,tone:null,recovery:.2},
    OUTRO:{masterDb:-2,lowPass:17500,tone:null,recovery:.5},
  })[snapshot]??({masterDb:0,lowPass:20000,tone:null,recovery:0});
}

export function weaponLayers(event,plan){
  const layers=['muzzle_blast','mechanical'];
  if(plan.band==='DISTANT'||plan.band==='VERY_DISTANT')layers.push('distant_report');
  if(event.nearTrajectory)layers.push('bullet_crack');
  if(event.impact)layers.push('impact');
  return layers;
}

export function artilleryLayers(event,plan){
  const layers=['gun_report'];
  if(event.shellFlight)layers.push('shell_flight');
  if(event.incomingWhistle&&event.trajectorySupportsWhistle)layers.push('incoming_whistle');
  if(event.impact)layers.push('impact','debris');
  if(['DISTANT','VERY_DISTANT'].includes(plan.band)||plan.wet>.08)layers.push('environment_tail');
  return layers;
}

export function vehicleMix({rpm=700,load=.2,damage=.0,interior=false}={}){
  return {enginePitch:Number((.72+clamp(rpm/2800)*.68).toFixed(4)),engineGain:Number((.35+.5*clamp(load)).toFixed(4)),trackGain:.25+.35*clamp(load),damageRattle:.45*clamp(damage),lowPass:interior?9000:20000};
}

export function aircraftMix({radialVelocity=0,altitude=100}={}){
  const doppler=clamp(1-radialVelocity/SPEED_OF_SOUND,.82,1.18);
  return {playbackRate:Number(doppler.toFixed(4)),altitudeAttenuation:Number(attenuation(Math.max(0,altitude),{reference:45,rolloff:.8,minGain:.02}).toFixed(5))};
}

export function gameplayFingerprint(state){return JSON.stringify(state);}

export function scenarios(){
  const listener={position:{x:0,y:1.7,z:0},yaw:0};
  const ev=(id,type,category,position,extra={})=>({id,type,sourceId:extra.sourceId??id,position,emittedAt:12,category,intensity:extra.intensity??1,priority:extra.priority??'AUTO',...extra});
  const inputs={
    A:ev('A','weapon_shot','weapons',{x:15,y:1.4,z:0},{weaponType:'rifle'}),
    B:ev('B','weapon_shot','weapons',{x:250,y:1.4,z:0},{weaponType:'mg'}),
    C:ev('C','explosion','explosions',{x:1000,y:0,z:0},{weaponType:'artillery',emittedAt:12}),
    D:ev('D','explosion','explosions',{x:35,y:0,z:12},{emittedAt:12}),
    E:ev('E','vehicle_engine','vehicles',{x:120,y:0,z:-40},{rpm:1500}),
    F:ev('F','aircraft_pass','aircraft',{x:0,y:150,z:80}),
    H:ev('H','dialogue','dialogue',{x:2,y:1.7,z:1},{missionCritical:true,dialogueClass:'mission_critical'}),
  };
  const result={};
  result.A=planAudioEvent(inputs.A,listener);
  result.B=planAudioEvent(inputs.B,listener);
  result.C=planAudioEvent(inputs.C,listener);
  result.D=planAudioEvent(inputs.D,listener,{environment:'SMALL_ROOM',occlusion:{blocked:true,thickness:.35,portals:1}});
  result.E={...planAudioEvent(inputs.E,listener),vehicle:vehicleMix({rpm:1500,load:.55})};
  result.F={...planAudioEvent(inputs.F,listener),aircraft:aircraftMix({radialVelocity:-60,altitude:150})};
  const distant=Array.from({length:50},(_,i)=>planAudioEvent(ev(`G${i}`,'weapon_shot','weapons',{x:700+(i%10)*22,y:1.4,z:-250+Math.floor(i/10)*75},{weaponType:'rifle'}),listener,{quality:'medium'}));
  result.G=allocateVoices(distant,{quality:'medium'});
  result.H={...planAudioEvent(inputs.H,listener),mix:dialogueMix({missionCritical:true})};
  return result;
}

export function benchmark(count){
  const listener={position:{x:0,y:1.7,z:0},yaw:.2},events=Array.from({length:count},(_,i)=>({id:`bench-${i}`,type:i%9===0?'explosion':'weapon_shot',sourceId:`s-${i%97}`,position:{x:(i%173)*13,y:0,z:(i%131)*-11},emittedAt:12,category:i%9===0?'explosions':'weapons',intensity:.6+(i%5)*.1,priority:'AUTO'}));
  const t0=performance.now(),plans=events.map(e=>planAudioEvent(e,listener,{quality:'high'})),allocated=allocateVoices(plans,{quality:'high'}),elapsedMs=performance.now()-t0;
  return {count,elapsedMs:Number(elapsedMs.toFixed(3)),active:allocated.active.length,virtual:allocated.virtual.length};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const report={speedOfSound:SPEED_OF_SOUND,bands:DISTANCE_BANDS,scenarios:scenarios(),performance:[100,500,1000,5000].map(benchmark)};
  console.log(JSON.stringify(report,null,2));
}
