// Schema-2 presentation data. No gameplay/RNG writes, renderer history or wall clock.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
export const MOTION_GAITS=Object.freeze(['idle','walk','run','sprint','crouch_walk','carry','drag']);
export const PRESENTATION_FIELDS=Object.freeze(['motion','bodyYaw','posture','postureSince','postureProgress','suppressedAt','hitAt','hitYaw','diedAt','deathYaw','reload','cover','carry']);
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
/**
 * T38 (M01-COMBAT-POSTURE-STAGING-V1): grp_east_platoon.hold. While the platoon holds the deck every man is crouched in GAMEPLAY on his staggered
 * slot (m01-simulation.js: hitbox, eye, aim and shot origin all kneel), so the posture below is simply 'crouch'. Here, presentation only, a
 * man kneeling still on his own slot turns his body by stage.yaw[i] from his gameplay facing, so the kneeling men do not all look the same way.
 * Engineers (sappers) lie prone (T07 generic prone, which also lowers their hitboxes in spatial.js) while suppressed and, from the moment they are
 * sent to the second cut, whenever they wait still on guard without working (gameplay `crouched` is their work posture). Validated at load.
 */
export function eastHoldStage(def=definition){
  const fail=m=>{throw new Error(`M01 east hold stage: ${m}`);};
  const group=def.groups?.find(g=>g.id==='grp_east_platoon'),slots=group?.hold?.slots,s=group?.hold?.stage,size=group?.startSize;
  if(!Number.isInteger(size)||!Array.isArray(slots)||slots.length!==size||!slots.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))fail('hold.slots');
  if(!s||s.posture!=='crouch')fail('posture must be crouch (stand keeps the men upright under fire; prone is not a platoon posture)');
  if(!Array.isArray(s.yaw)||s.yaw.length!==size||!s.yaw.every(y=>Number.isFinite(y)&&Math.abs(y)<=.4))fail('one yaw per man, |yaw| <= 0.4 rad');
  return Object.freeze({posture:s.posture,yaw:Object.freeze([...s.yaw]),slots:Object.freeze(slots.map(([x,z])=>Object.freeze({x,z})))});
}
const EAST_HOLD_STAGE=eastHoldStage();
/** Slot index of a platoon man kneeling still on his own hold slot, or -1. Reads gameplay data only; writes nothing. */
export function holdStageSlot(a){
  if(a.group!=='grp_east_platoon'||!a.active||!a.alive||!a.crouched||a.carriedBy||a.state==='WOUNDED'||(a.motion?.speed??0)!==0)return -1;
  const i=Number(a.id.slice('pl_east_'.length)),slot=Number.isInteger(i)?EAST_HOLD_STAGE.slots[i]:undefined;
  return slot&&Math.hypot(a.x-slot.x,a.z-slot.z)<.05?i:-1;
}
const bodyGoal=a=>{const i=holdStageSlot(a);return i<0?a.facing:angle(a.facing+EAST_HOLD_STAGE.yaw[i]);};
/** T38: a sapper sent to the second cut who waits still on guard, not working (`crouched`), lies prone. */
const waitingProne=a=>a.role==='ENGINEER'&&a.target!=null&&!a.crouched&&a.alive&&a.active&&!a.carriedBy&&a.state==='GUARD'&&(a.motion?.speed??0)===0;
const posture=(a,clock)=>a.mg34Prone?.progress>0||a.team==='ally'&&a.role==='ENGINEER'&&(clock<a.suppressedUntil||waitingProne(a))?'prone':a.crouched?'crouch':'stand';
const fixedBody=a=>!a.alive||a.state==='WOUNDED'||a.carriedBy||a.pose==='seated'||
  (a.mg34Prone&&a.mg34Prone.phase!=='standing')||(a.ckm&&a.ckm.phase!=='retreat');

export function initializePresentation(a,clock){
  const legacy=a.postureProgress===undefined;
  a.motion??={speed:0,odometer:0,gait:'idle',gaitSince:Math.max(0,clock-1)};
  if(legacy)a.motion.speed=Math.min(8,a.motion.speed);
  a.bodyYaw??=a.facing;
  a.posture??=posture(a,clock);
  if(['de_east_0','de_east_1'].includes(a.id)&&!a.mg34Prone&&a.posture==='prone')a.posture=posture(a,clock);
  a.postureSince??=Math.max(0,clock-1);
  a.hitAt??=-1e9;a.hitYaw??=a.facing;a.diedAt??=-1e9;a.deathYaw??=a.facing;
  a.suppressedAt??=a.suppressedUntil>0?Math.max(0,Math.min(clock,a.suppressedUntil-1.5)):-1e9;
  a.postureProgress??=a.posture==='prone'?1:0;
}

export function updatePosture(a,clock){
  const next=posture(a,clock);
  if(a.posture!==next){a.posture=next;a.postureSince=next==='prone'&&a.mg34Prone?a.mg34Prone.startedAt:clock;}
  a.postureProgress=a.mg34Prone?.progress??(next==='prone'?Math.min(1,(clock-a.postureSince)/1.2):0);
  if(!a.alive)a.bodyYaw=a.deathYaw??a.bodyYaw;
  else if(fixedBody(a))a.bodyYaw=a.facing;
}

export function updateBodyYaw(a,dt){
  if(fixedBody(a))return;
  const goal=bodyGoal(a);   // the gameplay facing, or (T38) the staged turn of a waiting platoon man
  const delta=angle(goal-a.bodyYaw),limit=(a.motion.speed===0?Math.PI:2*Math.PI)*dt;
  a.bodyYaw=Math.abs(delta)<=limit?goal:angle(a.bodyYaw+Math.sign(delta)*limit);
  if(a.motion.speed===0){const remaining=angle(goal-a.bodyYaw);if(Math.abs(remaining)>Math.PI/3)a.bodyYaw=angle(goal-Math.sign(remaining)*Math.PI/3);}
}

export function updateMotion(actors,before,dt,clock){
  const carriers=new Map(actors.filter(a=>a.carriedBy).map(a=>[a.carriedBy,a]));
  actors.forEach((a,i)=>{
    const distance=Math.hypot(a.x-before[i].x,a.z-before[i].z),m=a.motion;
    // Carry attachment can reposition the patient in one tick; publish a bounded locomotion speed while retaining real distance.
    m.speed=Math.min(8,distance/dt);m.odometer+=distance;
    const patient=carriers.get(a.id);
    const gait=distance===0||!a.alive||!a.active?'idle':
      a.carriedBy||patient?(a.task==='station_wounded'||patient?.task==='station_wounded'?'drag':'carry'):
      a.crouched?'crouch_walk':m.speed<=2.2?'walk':m.speed<=4.4?'run':'sprint';
    if(gait!==m.gait){m.gait=gait;m.gaitSince=clock;}
    updatePosture(a,clock);
  });
}

export function updateActorDetails(actors,clock,world){
  for(const a of actors){
    if(a.reload&&clock-a.reload.startedAt>=a.reload.duration){delete a.reload;a.rounds=a.id==='szymon_kowal'?20:5;}
    if(a.motion.speed===0&&a.alive&&a.active&&!a.displayOnly){
      const node=world.coverAt(a);
      if(node)a.cover={nodeId:node.id,type:node.type,side:Math.sin(a.facing)>=0?'left':'right',height:node.heightM??0};
      else delete a.cover;
    }else delete a.cover;
  }
}

export function recordSuppression(a,previousUntil,clock){
  if(a.suppressedUntil>previousUntil)a.suppressedAt=clock;
}
export function recordHit(a,clock,source){
  a.hitAt=clock;
  if(source)a.hitYaw=Math.atan2(source.z-a.z,source.x-a.x);
  else a.hitYaw=a.facing; // Scripted wounds use the documented legacy/default facing, without inventing an incoming source.
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
    if(!m||Array.isArray(m)||Object.keys(m).some(k=>!['speed','odometer','gait','gaitSince'].includes(k))||
      !finite(m.speed,0,a.postureProgress===undefined?Infinity:8)||!finite(m.odometer)||!MOTION_GAITS.includes(m.gait)||!finite(m.gaitSince,0,clock))reject('motion '+a.id);
  }
  if(a.bodyYaw!==undefined&&!Number.isFinite(a.bodyYaw))reject('bodyYaw '+a.id);
  if(a.posture!==undefined&&!['stand','crouch','prone'].includes(a.posture))reject('posture '+a.id);
  for(const key of ['postureSince','suppressedAt','hitAt','diedAt'])if(a[key]!==undefined&&a[key]!==-1e9&&!finite(a[key],0,clock))reject(key+' '+a.id);
  if(a.postureProgress!==undefined&&!finite(a.postureProgress,0,1))reject('postureProgress '+a.id);
  if(a.posture==='prone'&&!a.mg34Prone&&!(['de_east_0','de_east_1'].includes(a.id)&&a.weapon==='mg34')&&(a.team!=='ally'||a.group==='grp_east_platoon'||a.displayOnly))reject('prone '+a.id);
  if(a.reload!==undefined){const r=a.reload;if(!r||Object.keys(r).some(k=>!['startedAt','duration','mode'].includes(k))||!finite(r.startedAt,0,clock)||r.duration!==3.4||r.mode!=='clip')reject('reload '+a.id);}
  if(a.cover!==undefined){const c=a.cover;if(!c||Object.keys(c).some(k=>!['nodeId','type','side','height'].includes(k))||typeof c.nodeId!=='string'||typeof c.type!=='string'||!['left','right'].includes(c.side)||!finite(c.height,0,5))reject('cover '+a.id);}
  if(a.carry!==undefined){const c=a.carry;if(a.id!=='jozef_bak'||!c||Object.keys(c).some(k=>!['phase','startedAt','duration'].includes(k))||!['pickup','carry','putdown'].includes(c.phase)||!finite(c.startedAt,0,clock)||c.duration!==1.6||!a.carriedBy||!a.alive)reject('carry '+a.id);}
  for(const key of ['hitYaw','deathYaw'])if(a[key]!==undefined&&!Number.isFinite(a[key]))reject(key+' '+a.id);
  if((a.hitYaw!==undefined&&a.hitAt===undefined)||(a.deathYaw!==undefined&&a.diedAt===undefined)||
    (a.diedAt!==undefined&&a.diedAt!==-1e9&&(a.alive||a.deathYaw===undefined)))reject('eventos de apresentação '+a.id);
}

export function presentationDiagnostics(actors){
  return {actors:actors.map(a=>({id:a.id,...Object.fromEntries(PRESENTATION_FIELDS.filter(k=>a[k]!==undefined)
    .map(k=>[k,k==='motion'?{...a.motion}:a[k]]))}))};
}
