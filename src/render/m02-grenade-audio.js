import {AUDIO_PRIORITY,planImpact,planPlayerHit,planLanding} from '../core/battlefield-audio.js';
import {eyePosition,traceObstruction} from '../world/spatial.js';

// A short sleeve/equipment movement when the hand actually begins the throw.
// Reuse only M01's cloth and gear grains: there is no invented pin pull or
// recorded voice, and nothing is scheduled across the later release/death.
export function m02GrenadeHandlingGrains(key){
 const cloth=planPlayerHit({key}).filter(g=>g.layer==='cloth').map(g=>({...g,at:0,vol:g.vol*.75}));
 const gear=planLanding(4,'ground',{key}).filter(g=>g.layer==='gear').slice(0,2).map(g=>({...g,at:g.at+.035,vol:g.vol*.65}));
 return [...cloth,...gear];
}

export function playM02GrenadeHandling(audio,event,sim){
 const age=sim.clock-event.clock;
 if(event.throwerId!==sim.player.id||!Number.isFinite(age)||age<-.001||age>.25)return null;
 const key=`m02-grenade-handling:${event.clock}`,grains=m02GrenadeHandlingGrains(key);
 if(!grains.length)return null;
 audio._record('grenade-handling',{priority:AUDIO_PRIORITY.fire,key});
 return audio._playPlan(grains,{kind:'grenade-handling',category:'player',priority:AUDIO_PRIORITY.fire,key});
}

// A quiet material-specific collision, not the full bullet-impact debris or
// ricochet effect. It is emitted only for the actual simulated impact point.
export function playM02GrenadeBounce(audio,event,sim,spatial){
 const point=event.point,age=sim.clock-event.clock;
 if(!point||![point.x,point.y,point.z,event.speed,age].every(Number.isFinite)||event.speed<1.2||age<-.001||age>.25)return null;
 const s=spatial(point,sim);if(s.distance>25)return null;
 const material=/^wood/.test(event.material)?'wood':/^metal/.test(event.material)?'metal':event.material??'earth';
 const key=`m02-grenade-bounce:${event.grenadeId}:${event.clock}`;
 const grains=planImpact(material,s.distance,{key}).filter(g=>['hit','knock','ring','thud','hollow'].includes(g.layer)&&g.at<.04)
   .map(g=>({...g,dur:Math.min(g.dur,.18)}));
 if(!grains.length)return null;
 const ear=eyePosition(sim.player),dx=point.x-ear.x,dy=point.y-ear.y,dz=point.z-ear.z,dist=Math.hypot(dx,dy,dz);
 const blocked=dist>.04&&traceObstruction(sim.world,ear,{x:dx/dist,y:dy/dist,z:dz/dist},dist-.04);
 audio.setOcclusion(blocked?{hz:1200,gain:.4}:null);
 audio._record('grenade-bounce',{pan:s.pan,distance:s.distance,priority:AUDIO_PRIORITY.fire,key,
   detail:{material,speed:Number(event.speed.toFixed(2)),blocked:Boolean(blocked)}});
 const voice=audio._playPlan(grains,{kind:'grenade-bounce',category:'foley',priority:AUDIO_PRIORITY.fire,
   pan:s.pan,distance:s.distance,front:s.front,key,volume:Math.min(.65,.18+event.speed*.025)});
 audio.setOcclusion(null);return voice;
}
