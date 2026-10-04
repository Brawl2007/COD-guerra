// Tiny visual pilot. No imports from simulation, spatial, AI, save or gameplay RNG.
export const RIFLEMAN_PILOT_IDS=Object.freeze(['de_spans_6','de_spans_7','pl_east_0','pl_east_1']);
// Measured from the checked GLB, not the architecture prototype. See clip-audit.json.
export const MEASURED_GAITS=Object.freeze({
  standing_idle:Object.freeze({duration:4,nominalSpeed:0}),
  walk:Object.freeze({duration:1,nominalSpeed:1.099945}),
  run:Object.freeze({duration:.68,nominalSpeed:3.251546})
});
export const GAIT_POLICY=Object.freeze({minRate:.5,maxRate:1.8,runEnter:MEASURED_GAITS.walk.nominalSpeed*1.75,
  runExit:MEASURED_GAITS.walk.nominalSpeed*1.5,stopSpeed:.04,fadeSeconds:.22,maxSampleGap:.5});
const names=Object.keys(MEASURED_GAITS),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),fraction=x=>x-Math.floor(x);
export function phaseOffset(id){return ([...id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0)%1000)/1000;}
export function selectGait(speed,previous='standing_idle'){
  if(speed<GAIT_POLICY.stopSpeed)return 'standing_idle';
  return previous==='run'?speed<GAIT_POLICY.runExit?'walk':'run':speed>GAIT_POLICY.runEnter?'run':'walk';
}
export function playbackRate(speed,gait){return gait==='standing_idle'?1:clamp(speed/MEASURED_GAITS[gait].nominalSpeed,GAIT_POLICY.minRate,GAIT_POLICY.maxRate);}
const unit=gait=>Object.fromEntries(names.map(n=>[n,Number(n===gait)]));
function weightsAt(s,time){
  if(!s.transition)return unit(s.gait);
  const u=clamp((time-s.transition.startedAt)/GAIT_POLICY.fadeSeconds,0,1),k=u*u*(3-2*u);
  return Object.fromEntries(names.map(n=>[n,s.transition.from[n]*(1-k)+Number(n===s.gait)*k]));
}
export class RiflemanLocomotion {
  constructor(){this.states=new Map();}
  observe(actor,time,eligible){
    if(!RIFLEMAN_PILOT_IDS.includes(actor.id))return null;
    if(!eligible){this.states.delete(actor.id);return null;}
    let s=this.states.get(actor.id);
    const fresh=!s||s.actor!==actor||time<s.time||time-s.time>GAIT_POLICY.maxSampleGap;
    if(fresh){
      // First visibility/restore cannot infer velocity from an absent history. Rebuild cosmetic phase only.
      s={actor,time,x:actor.x,z:actor.z,gait:'standing_idle',phase:fraction(phaseOffset(actor.id)+time/MEASURED_GAITS.walk.duration),speed:0,transition:null};
      this.states.set(actor.id,s);
    }else if(time>s.time){
      const dt=time-s.time,distance=Math.hypot(actor.x-s.x,actor.z-s.z),speed=distance/dt;
      const gait=selectGait(speed,s.gait),from=weightsAt(s,time);
      if(gait!==s.gait){s.transition={startedAt:time,from,oldGait:s.gait};s.gait=gait;}
      const rate=playbackRate(speed,gait);
      if(gait!=='standing_idle')s.phase=fraction(s.phase+dt*rate/MEASURED_GAITS[gait].duration);
      if(s.transition&&time-s.transition.startedAt>=GAIT_POLICY.fadeSeconds)s.transition=null;
      Object.assign(s,{time,x:actor.x,z:actor.z,speed});
    }
    const weights=weightsAt(s,time),rate=playbackRate(s.speed,s.gait);
    return {gait:s.gait,speed:s.speed,playbackRate:rate,clamped:s.gait!=='standing_idle'&&Math.abs(rate-s.speed/MEASURED_GAITS[s.gait].nominalSpeed)>1e-9,
      phase:s.phase,weights,times:{standing_idle:fraction(time/4+phaseOffset(actor.id))*4,walk:s.phase*MEASURED_GAITS.walk.duration,run:s.phase*MEASURED_GAITS.run.duration},
      transition:s.transition?{from:s.transition.oldGait,to:s.gait,startedAt:s.transition.startedAt,duration:GAIT_POLICY.fadeSeconds,oldWeight:weights[s.transition.oldGait],newWeight:weights[s.gait],fromWeights:{...s.transition.from}}:null,
      phasePolicy:'normalized phase shared by walk/run; retained across LOD and culling; cosmetic rebuild on restore'};
  }
  clear(){this.states.clear();}
}
