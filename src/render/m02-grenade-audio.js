import {AUDIO_PRIORITY,planImpact} from '../core/battlefield-audio.js';
import {eyePosition,traceObstruction} from '../world/spatial.js';

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
