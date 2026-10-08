// Schema-2 presentation data. No gameplay/RNG writes, renderer history or wall clock.
export const MOTION_GAITS=Object.freeze(['idle','walk','run','sprint','crouch_walk','carry','drag']);
export const PRESENTATION_FIELDS=Object.freeze(['motion','bodyYaw','posture','postureSince','suppressedAt','hitAt','hitYaw','diedAt','deathYaw']);
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
const posture=a=>a.mg34Prone?.progress>0?'prone':a.crouched?'crouch':'stand';
const fixedBody=a=>!a.alive||a.state==='WOUNDED'||a.carriedBy||a.pose==='seated'||
  (a.mg34Prone&&a.mg34Prone.phase!=='standing')||(a.ckm&&a.ckm.phase!=='retreat');

export function initializePresentation(a,clock){
  a.motion??={speed:0,odometer:0,gait:'idle',gaitSince:Math.max(0,clock-1)};
  a.bodyYaw??=a.facing;
  a.posture??=posture(a);
  a.postureSince??=Math.max(0,clock-1);
  // Absent hit/death/suppression timestamps mean unknown history, not a new event.
}

export function updatePosture(a,clock){
  const next=posture(a);
  if(a.posture!==next){a.posture=next;a.postureSince=next==='prone'?a.mg34Prone.startedAt:clock;}
  if(!a.alive)a.bodyYaw=a.deathYaw??a.bodyYaw;
  else if(fixedBody(a))a.bodyYaw=a.facing;
}

export function updateBodyYaw(a,dt){
  if(fixedBody(a))return;
  const delta=angle(a.facing-a.bodyYaw),limit=(a.motion.speed===0?Math.PI:2*Math.PI)*dt;
  a.bodyYaw=Math.abs(delta)<=limit?a.facing:angle(a.bodyYaw+Math.sign(delta)*limit);
}

export function updateMotion(actors,before,dt,clock){
  const carriers=new Map(actors.filter(a=>a.carriedBy).map(a=>[a.carriedBy,a]));
  actors.forEach((a,i)=>{
    const distance=Math.hypot(a.x-before[i].x,a.z-before[i].z),m=a.motion;
    m.speed=distance/dt;m.odometer+=distance;
    const patient=carriers.get(a.id);
    const gait=distance===0||!a.alive||!a.active?'idle':
      a.carriedBy||patient?(a.task==='station_wounded'||patient?.task==='station_wounded'?'drag':'carry'):
      a.crouched?'crouch_walk':m.speed<=2.2?'walk':m.speed<=4.4?'run':'sprint';
    if(gait!==m.gait){m.gait=gait;m.gaitSince=clock;}
    updatePosture(a,clock);
  });
}

export function recordSuppression(a,previousUntil,clock){
  if(a.suppressedUntil>previousUntil)a.suppressedAt=clock;
}
export function recordHit(a,clock,source){
  a.hitAt=clock;
  if(source)a.hitYaw=Math.atan2(source.z-a.z,source.x-a.x);
  else delete a.hitYaw; // Scripted wounds have no authoritative incoming direction.
}
export function recordDeath(a,wasAlive,clock){
  if(wasAlive&&!a.alive){a.diedAt=clock;a.deathYaw=a.bodyYaw??a.facing;}
}
export function recordDamage(a,health,wasAlive,clock,source){
  if(a.health<health)recordHit(a,clock,source);
  recordDeath(a,wasAlive,clock);
}

export function validatePresentation(a,clock,reject){
  const finite=(n,min=0,max=Infinity)=>Number.isFinite(n)&&n>=min&&n<=max;
  if(a.motion!==undefined){
    const m=a.motion;
    // Effective root speed is not clamped: existing carry attachment can reposition a root >8 m/s.
    if(!m||Array.isArray(m)||Object.keys(m).some(k=>!['speed','odometer','gait','gaitSince'].includes(k))||
      !finite(m.speed)||!finite(m.odometer)||!MOTION_GAITS.includes(m.gait)||!finite(m.gaitSince,0,clock))reject('motion '+a.id);
  }
  if(a.bodyYaw!==undefined&&!Number.isFinite(a.bodyYaw))reject('bodyYaw '+a.id);
  if(a.posture!==undefined&&!['stand','crouch','prone'].includes(a.posture))reject('posture '+a.id);
  for(const key of ['postureSince','suppressedAt','hitAt','diedAt'])if(a[key]!==undefined&&!finite(a[key],0,clock))reject(key+' '+a.id);
  for(const key of ['hitYaw','deathYaw'])if(a[key]!==undefined&&!Number.isFinite(a[key]))reject(key+' '+a.id);
  if((a.hitYaw!==undefined&&a.hitAt===undefined)||(a.deathYaw!==undefined&&a.diedAt===undefined)||
    (a.diedAt!==undefined&&(a.alive||a.deathYaw===undefined)))reject('eventos de apresentação '+a.id);
}

export function presentationDiagnostics(actors){
  return {actors:actors.map(a=>({id:a.id,...Object.fromEntries(PRESENTATION_FIELDS.filter(k=>a[k]!==undefined)
    .map(k=>[k,k==='motion'?{...a.motion}:a[k]]))}))};
}
