// Schema-2 presentation data. No gameplay/RNG writes, renderer history or wall clock.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };
export const MOTION_GAITS=Object.freeze(['idle','walk','run','sprint','crouch_walk','carry','drag']);
export const PRESENTATION_FIELDS=Object.freeze(['motion','bodyYaw','posture','postureSince','postureProgress','suppressedAt','hitAt','hitYaw','diedAt','deathYaw','reload','cover','carry']);
const angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
/**
 * T38 (M01-COMBAT-POSTURE-STAGING-V1, slice 1): grp_east_platoon.hold.stage. Presentation only: a platoon man standing still on his slot of
 * the waiting block is drawn crouched/kneeling and his body turned by yaw[i] from his gameplay facing, so nobody stands in a row under fire.
 * Gameplay `crouched`, positions, hitboxes (spatial.js only reads `posture` for 'prone', excluded here), aim heights and cadences are untouched.
 * The box is the east rifles' aim block of m01-simulation.js (layout +1 m in x, +0.2 m in z). Validated at load: a typo stops the game.
 */
export function eastHoldStage(def=definition){
  const fail=m=>{throw new Error(`M01 east hold stage: ${m}`);};
  const group=def.groups?.find(g=>g.id==='grp_east_platoon'),l=group?.hold?.layout,s=group?.hold?.stage,size=group?.startSize;
  if(!l||!Number.isInteger(l.columns)||l.columns<1||![l.x0,l.dx,l.z0,l.dz].every(Number.isFinite))fail('hold.layout');
  if(!s||s.posture!=='crouch')fail('posture must be crouch (stand keeps the row; prone would change the hitboxes)');
  if(!Number.isInteger(size)||!Array.isArray(s.yaw)||s.yaw.length!==size||!s.yaw.every(y=>Number.isFinite(y)&&Math.abs(y)<=.4))fail('one yaw per man, |yaw| <= 0.4 rad');
  const rows=Math.ceil(size/l.columns);
  return Object.freeze({posture:s.posture,yaw:Object.freeze([...s.yaw]),
    box:Object.freeze({x0:l.x0-1,x1:l.x0+(l.columns-1)*l.dx+1,z0:l.z0-.2,z1:l.z0+(rows-1)*l.dz+.2})});
}
const EAST_HOLD_STAGE=eastHoldStage();
/** Slot index of a platoon man staged on the waiting block, or -1. Reads gameplay data only; writes nothing. */
export function holdStageSlot(a){
  if(a.group!=='grp_east_platoon'||!a.active||a.crouched||a.carriedBy||a.state==='WOUNDED'||(a.motion?.speed??0)!==0)return -1;
  const b=EAST_HOLD_STAGE.box,i=Number(a.id.slice('pl_east_'.length));
  if(!(a.x>=b.x0&&a.x<=b.x1&&a.z>=b.z0&&a.z<=b.z1)||!Number.isInteger(i)||i<0||i>=EAST_HOLD_STAGE.yaw.length)return -1;
  return i;
}
const bodyGoal=a=>{const i=holdStageSlot(a);return i<0?a.facing:angle(a.facing+EAST_HOLD_STAGE.yaw[i]);};
const posture=(a,clock)=>a.mg34Prone?.progress>0||a.team==='ally'&&a.role==='ENGINEER'&&clock<a.suppressedUntil?'prone':a.crouched?'crouch':
  holdStageSlot(a)>=0?EAST_HOLD_STAGE.posture:'stand';
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
