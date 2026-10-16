// Authored M01 presentation actors. No combat, gameplay RNG, cover reservation or corridor occupancy.
export const YARD_TASKS=Object.freeze(['clean_weapon','coffee','map','patrol','guard_change','watch_bridge','yard_patient','yard_aid','cart']);
export const YARD_IDS=Object.freeze(['yard_railway_0','yard_railway_1','yard_orderly','yard_patient','yard_aid','yard_cart']);
export const MG_LOADER_IDS=Object.freeze(['de_mg34_loader_0','de_mg34_loader_1']);
export const AUXILIARY_IDS=Object.freeze([...YARD_IDS,...MG_LOADER_IDS]);
export function makeAuxiliaries(entity,world,actors,clock=0){
  const sites=[[-326,12],[-348,16],[-322,17],[-323,18],[-334,18],[-356,11]];
  const yard=YARD_IDS.map((id,i)=>entity(id,{x:sites[i][0],y:world.heightAt(...sites[i]),z:sites[i][1]},'ally',{
    group:'grp_station_yard',role:i===2||i===4?'MEDIC':'CIVILIAN',civilian:true,displayOnly:true,
    task:i===3?'yard_patient':i===4?'yard_aid':i===5?'cart':'watch_bridge',
    ...(i<2?{lantern:true}:{}),...(i===3?{state:'WOUNDED',health:45}:{})}));
  const loaders=MG_LOADER_IDS.map((id,i)=>{const gun=actors.find(a=>a.id===`de_east_${i}`);
    return entity(id,{x:gun.x,y:gun.y,z:gun.z+1.05},'enemy',{group:'grp_mg34_loaders',role:'RIFLEMAN',displayOnly:true,
      active:gun.active,facing:gun.facing,loaderFor:gun.id,mg34Loader:{phase:'idle',startedAt:clock,duration:1.9}});
  });
  return [...yard,...loaders];
}
export function updateYard(actors,battleClock,clock,world){
  // Fixed slots remain north of the platoon's corridor (z30..40) and outside station solids.
  const beforeRaid=battleClock<4*3600+34*60,afterRaid=battleClock>=5*3600+30*60;
  for(const a of actors)if(a.group==='grp_station_yard'){
    if(!a.alive||!a.active)continue;
    const i=YARD_IDS.indexOf(a.id);
    if(i===0||i===1){const slot=Math.floor((battleClock-16200)/45),phase=slot%3;
      a.task=beforeRaid?['patrol','guard_change','watch_bridge'][phase]:afterRaid?'guard_change':'watch_bridge';
      const base=i===0?-326:-348;a.x=base+(a.task==='patrol'?Math.sin((battleClock-16200)*Math.PI/45)*2:0);
      a.z=i===0?12:16;a.facing=0;a.state=a.task==='patrol'?'ADVANCE':'GUARD';
    }else if(i===2)a.task=beforeRaid?'coffee':'map';
    else if(i===4)a.task=afterRaid?'yard_aid':'clean_weapon';
    a.y=world.heightAt(a.x,a.z);
  }
}
export function updateLoaders(actors,clock){
  for(const a of actors)if(a.group==='grp_mg34_loaders'){
    const gun=actors.find(g=>g.id===a.loaderFor),p=gun?.mg34Prone;
    const leave=!a.alive||!gun?.alive||!gun.active||!p||['standing','exit'].includes(p.phase);
    const next=leave?'leave':p.phase==='reload'?'feed':'idle';
    if(a.mg34Loader.phase!==next)a.mg34Loader={phase:next,startedAt:clock,duration:next==='feed'?4.8:1.9};
    if(gun){a.facing=gun.facing;if(!leave){a.active=true;a.x=gun.x-Math.sin(gun.facing)*1.05;a.z=gun.z+Math.cos(gun.facing)*1.05;a.y=gun.y;}}
    if(leave&&clock-a.mg34Loader.startedAt>=a.mg34Loader.duration)a.active=false;
    a.shot=0;
  }
}
