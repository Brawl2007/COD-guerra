import {AUDIO_PRIORITY,planWz29Mechanism} from '../core/battlefield-audio.js';

// Reuse M01's short mechanical grains, timed by actual M02 reload events.
// A cue contains only the sounds of that stage; killing a reloader cannot
// leave a whole future reload pre-scheduled in the Web Audio graph.
export function m02ReloadGrains(weapon,phase,key){
  const rifle=weapon==='wz29'||weapon==='kar98k';
  const all=planWz29Mechanism(rifle?'clip':'magazine',{key});
  let part;
  if(rifle){
    const prefix=phase==='open'?'clip-in':phase==='seat'?'rounds':phase==='close'?'clip-lock':null;
    part=prefix?all.filter(g=>g.layer.startsWith(prefix)):[];
  }else{
    const offset=phase==='open'?0:phase==='seat'?2:phase==='close'?6:-1;
    part=offset<0?[]:all.slice(offset,offset+2);
  }
  if(!part.length)return [];
  const at=Math.min(...part.map(g=>g.at));
  return part.map(g=>({...g,at:Math.max(0,g.at-at)}));
}

export function playM02NpcReloadAudio(audio,event,sim,spatial){
  const age=sim.clock-event.clock,origin=event.origin;
  if(!origin||![origin.x,origin.y,origin.z,age].every(Number.isFinite)||age<-.001||age>.25)return null;
  const sound=spatial(origin,sim);if(sound.distance>30)return null;
  const key=`m02-reload:${event.shooterId}:${event.clock}:${event.phase}`;
  const grains=m02ReloadGrains(event.weapon,event.phase,key);if(!grains.length)return null;
  const blocked=!sim.world.lineOfSight(sim.player,origin,{includeFoliage:false});
  audio.setOcclusion(blocked?{hz:1200,gain:.4}:null);
  audio._record('npc-reload',{pan:sound.pan,distance:sound.distance,priority:AUDIO_PRIORITY.fire,key,
    detail:{weapon:event.weapon,phase:event.phase,blocked}});
  const voice=audio._playPlan(grains,{kind:'npc-reload',category:'foley',priority:AUDIO_PRIORITY.fire,
    pan:sound.pan,distance:sound.distance,front:sound.front,key,volume:1});
  audio.setOcclusion(null);
  return voice;
}
