import {M01AuthorityCoordinator,PILOT_IDS,pilotActor,activeCombat,draw,copy,requirePilot} from './m01-authority-coordinator.js';
import {eyePosition} from '../world/spatial.js';
import {makeRound} from './m01-fire.js';

// Estimated rifle cycle timings, matching the existing NPC five-round abstraction.
// No WorldWeapon/feed system, new geometry, or presentation-dependent inputs.
const BOLT=1.05,RELOAD=3.2,DECISION=.4;
const eligible=m=>m.status==='combatReady';
const member=(c,id)=>{const m=c.members.find(m=>m.id===id);requirePilot(m,'unknown member');return m;};
function gauss(r){let u=0;while(u<=1e-12)u=draw(r,true);return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*draw(r,true));}
export function updatePilotWeapon(c,m,now){
  if(m.ammo.cycle==='READY'||m.ammo.until>now)return;
  if(m.ammo.cycle==='RELOAD_CLIP'){const n=Math.min(5-m.ammo.loaded,c.reserve);m.ammo.loaded+=n;c.reserve-=n;}
  m.ammo.cycle='READY';m.ammo.until=0;
}
function reload(c,m,now,amount=null){
  requirePilot(eligible(m)&&m.ammo.cycle==='READY'&&m.ammo.loaded<5&&c.reserve>0,'reload unavailable');
  if(amount!==null){requirePilot(Number.isInteger(amount)&&amount>0&&amount<=Math.min(5-m.ammo.loaded,c.reserve),'reload amount');m.ammo.loaded+=amount;c.reserve-=amount;}
  else{m.ammo.cycle='RELOAD_CLIP';m.ammo.until=now+RELOAD;}m.action='RELOAD';
}
function fire(c,m,now,aim,world,individual,events){
  requirePilot(eligible(m)&&m.ammo.cycle==='READY'&&m.ammo.loaded>0&&m.suppressedUntil<=now,'fire unavailable');
  requirePilot(aim&&[aim.x,aim.y,aim.z].every(Number.isFinite),'aim');
  const actor={space:'metres',...m.position},origin=eyePosition(actor);
  requirePilot(world.lineOfSight(actor,{space:'metres',...aim,eyeHeight:0})&&Math.hypot(aim.x-origin.x,aim.z-origin.z)<=1200,'blocked/out-of-range fire');
  m.ammo.loaded--;c.spent++;m.ammo.cycle='BOLT_CYCLE';m.ammo.until=now+BOLT;m.shot=.08;m.firedAt=now;m.action='FIRE';
  m.facing=Math.atan2(aim.z-m.position.z,aim.x-m.position.x);
  if(individual){events.push({type:'pilot-round',by:m.id,weapon:'kar98k',origin,aim:copy(aim),firedAt:now,
    // Rifle dispersion uses only this member's persisted stream.
    round:makeRound({id:'pending',by:m.id,weapon:'kar98k',kind:'player',origin,aim,firedAt:now,
      bias:[6*gauss(m.rng),4*gauss(m.rng)],cone:[0,0],gauss:()=>gauss(m.rng),tracer:false})});}
  else events.push({type:'enemy-fire',origin,rounds:1,interval:0,weapon:'kar98k',at:now});
}
/** Pure candidate reducer. The sector-level gate covers every aggregate mutation/RNG draw. */
export function resolvePilotSector(s,world,player){
  requirePilot(s.owner==='AGGREGATED'&&s.individual===null&&s.lease===null,'aggregate sector locked by individual lease');
  const c=s.aggregate,now=s.localClock,dt=now-c.updatedAt,events=[];
  requirePilot(dt>=0,'aggregate clock regression');
  if(s.enabled){
    const live=c.members.filter(eligible);
    if(now>=c.nextAggregateAt&&live.length){
      const i=Math.floor(draw(s.sectorRng)*live.length);c.velocity={x:0,z:(draw(s.sectorRng)-.5)*.16};c.nextAggregateAt=now+2;
      const m=live[i];updatePilotWeapon(c,m,now);
      if(m.ammo.cycle==='READY'&&m.suppressedUntil<=now){
        if(!m.ammo.loaded&&c.reserve)reload(c,m,now);
        else if(m.ammo.loaded){
          // A distant formation spends its own clip; it cannot invent an impact/casualty.
          const aim={x:m.position.x-2,y:m.position.y+1.1,z:m.position.z};fire(c,m,now,aim,world,false,events);
        }
      }
    }
    for(const m of live){updatePilotWeapon(c,m,now);m.shot=Math.max(0,m.shot-dt);
      const a={space:'metres',...m.position,radius:.3};world.move(a,0,c.velocity.z*dt);
      // The HOLD order stays in the authored southern dike patch; dead/wounded never follow it.
      if(a.z>=76&&a.z<=106){m.position={x:a.x,y:a.y,z:a.z};if(c.velocity.z&&m.action!=='FIRE')m.action='MOVE';}
    }
    if(live.length)c.anchor={x:live.reduce((n,m)=>n+m.position.x,0)/live.length,y:live.reduce((n,m)=>n+m.position.y,0)/live.length,z:live.reduce((n,m)=>n+m.position.z,0)/live.length};
  }
  c.updatedAt=now;c.revision++;return events;
}
function decide(m,c,world,player,now){
  if(!eligible(m))return 'HOLD';
  if(m.suppressedUntil>now)return 'PINNED';
  if(m.ammo.cycle==='RELOAD_CLIP'||!m.ammo.loaded)return 'RELOAD';
  // Actual visibility creates an observation. No invisible real-position tracking.
  if(player.alive&&world.lineOfSight({space:'metres',...m.position},player))m.lastSeen={position:eyePosition(player),at:now};
  if(m.lastSeen&&now-m.lastSeen.at<2&&m.ammo.cycle==='READY')return 'FIRE';
  return m.lastSeen?'OBSERVE':'HOLD';
}
export function resolvePilotIndividuals(s,world,player){
  requirePilot(s.owner==='INDIVIDUAL'&&s.individual&&s.lease,'individual owner missing');
  const c=s.individual,now=s.localClock,dt=now-c.updatedAt,events=[];
  for(const m of c.members){
    if(!eligible(m))continue;m.shot=Math.max(0,m.shot-dt);updatePilotWeapon(c,m,now);
    if(now<m.decisionAt)continue;
    const action=decide(m,c,world,player,now);m.action=action;m.decisionAt=now+DECISION+draw(m.rng,true)*.08;
    if(action==='RELOAD'&&m.ammo.cycle==='READY'&&c.reserve)reload(c,m,now);
    else if(action==='FIRE'&&Math.hypot(m.lastSeen.position.x-m.position.x,m.lastSeen.position.z-m.position.z)<=1200&&world.lineOfSight({space:'metres',...m.position},{space:'metres',...m.lastSeen.position,eyeHeight:0}))
      fire(c,m,now,m.lastSeen.position,world,true,events);
  }
  c.updatedAt=now;c.revision++;return events;
}
export function createPilot(sim,retainedDead=[]){return new M01AuthorityCoordinator(sim.actors,sim.rng.state,{clock:sim.clock,battleClock:sim.battleClock,
  enabled:sim.consumedEvent('evt_m01_train963_arrives'),retainedDead});}
export function advancePilot(sim,dt){
  if(dt<=0||sim.mission.complete)return;
  const a=sim.authorityPilot.snapshot(),c=activeCombat(a),living=c.members.filter(eligible),targets=living.length?living:c.members;
  const distance=Math.min(...targets.map(m=>Math.hypot(sim.player.x-m.position.x,sim.player.z-m.position.z)));
  const locked=sim.scene?.id==='cs_m01_intro'||sim.scene?.id==='cs_m01_roll_call'||sim.mission.phase==='OUTRO';
  const interactionRelevant=locked?a.owner==='INDIVIDUAL':(!sim.scene&&living.some(m=>Math.hypot(sim.player.x-m.position.x,sim.player.z-m.position.z)<=sim.weapon.profile.range&&
    sim.world.lineOfSight(sim.player,{space:'metres',...m.position}))||sim.enemyFire.rounds.some(r=>pilotActor(r.by)));
  const events=sim.authorityPilot.advance(sim.clock,sim.battleClock,{distance,interactionRelevant,step:s=>s.owner==='AGGREGATED'?
    (locked?freezeBoundary(s):resolvePilotSector(s,sim.world,sim.player)):(locked?freezeBoundary(s):resolvePilotIndividuals(s,sim.world,sim.player))});
  publishPilotEvents(sim,events);
}
function freezeBoundary(s){activeCombat(s).updatedAt=s.localClock;return [];}
export function publishPilotEvents(sim,events){for(const e of events){if(e.type==='pilot-round'){
    e.round.id=`m01_round_${sim.enemyFire.nextId++}`;sim.enemyFire.rounds.push(e.round);
    sim.emit({type:'enemy-fire',origin:e.origin,rounds:1,interval:0,weapon:e.weapon,at:e.firedAt});
  }else sim.emit(e);}}
export function pilotOperation(sim,eventId,operations,{owner=sim.authorityPilot.owner,token=sim.authorityPilot.token}={}){
  const result=sim.authorityPilot.operate({eventId,owner,token,operations},(s,ops)=>{
    const c=activeCombat(s),events=[];
    for(const op of ops){requirePilot(op&&typeof op==='object'&&typeof op.memberId==='string','operation');const m=member(c,op.memberId);
      if(op.type==='damage'){
        requirePilot(Object.keys(op).length===3&&Number.isFinite(op.amount)&&op.amount>0&&op.amount<=500,'damage');
        m.health=Math.max(0,m.health-op.amount);if(!m.health){m.status='dead';m.action='HOLD';m.shot=0;}
      }else if(op.type==='suppress'){
        requirePilot(Object.keys(op).length===3&&Number.isFinite(op.until)&&op.until>=sim.clock&&op.until<=sim.clock+10,'suppression');m.suppressedUntil=Math.max(m.suppressedUntil,op.until);
      }else if(op.type==='reload'){
        requirePilot(Object.keys(op).length===3,'reload fields');reload(c,m,s.localClock,op.amount);
      }else if(op.type==='fire'){
        requirePilot(Object.keys(op).length===3,'fire fields');requirePilot(s.owner==='INDIVIDUAL','individual fire requires lease');fire(c,m,s.localClock,op.aim,sim.world,true,events);
      }else throw Error('M01 authority pilot: unknown operation');
    }
    return events;
  });publishPilotEvents(sim,result.events);return result;
}
