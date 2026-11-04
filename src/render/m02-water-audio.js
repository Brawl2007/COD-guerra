import {AUDIO_PRIORITY} from '../core/battlefield-audio.js';
import {m02GrenadeHandlingGrains} from './m02-grenade-audio.js';

// M01 sleeve/equipment grains accompany only a live, real water action. This
// is not a recorded voice, liquid sound, or proof of contact with the patient.
export function playM02WaterHandling(audio,event,sim){
 const age=sim.clock-event.clock;
 if(event.type!=='c04-water-started'||!Number.isFinite(age)||age<-.001||age>.25||
   sim.playerWaterAction?.actorId!==event.actorId||sim.player.health<=0)return null;
 const key=`m02-water-handling:${event.actorId}:${event.clock}`,grains=m02GrenadeHandlingGrains(key);
 if(!grains.length)return null;
 audio._record('water-handling',{priority:AUDIO_PRIORITY.fire,key});
 return audio._playPlan(grains,{kind:'water-handling',category:'player',priority:AUDIO_PRIORITY.fire,key});
}
