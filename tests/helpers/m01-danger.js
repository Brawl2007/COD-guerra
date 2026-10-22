// Read-only observer of real route controls. No state/clock/HP/event or LOS overrides.
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {F1_TELEGRAPH_GAP_SEC} from '../../src/game/m01-difficulty.js';
import {route} from './m01-route.js';
import {createHash} from 'node:crypto';
const CUES=['flash','tracer','crack'];
const copy=x=>x?structuredClone(x):null;
class ObservedDeath extends Error{}
export function dangerRoute({level,seed,support=false,captureDeathView=false}={}){
 let instance=null,deathView=null,lastCandidate=null;
 class Observed extends M01Simulation{
  constructor(s){super(s,{difficulty:level});instance=this;this.danger={cueCounts:{flash:0,tracer:0,crack:0},proofByActor:{},deaths:[],violations:[],collisions:0,rolls:0,wounds:0,minHealth:100};}
  emit(e){super.emit(e);if(!this.danger)return;if(e.type==='enemy-fire')this.lastActualFire={at:this.clock,event:copy(e)};
   if(e.type==='round-impact'){this.lastActualImpact={at:this.clock,event:copy(e)};if(this.landContext)this.landContext.impact=copy(e);}}
  noticeFiredRound(a,r){const old=this.fireContext;this.fireContext={by:a?.id,round:copy(r),actual:copy(this.lastActualFire)};try{super.noticeFiredRound(a,r);}finally{this.fireContext=old;}}
  noteDangerCue(a,kind,cue){
   const rng=this.rng.state;super.noteDangerCue(a,kind,cue);const d=this.danger,e=this.timers.telegraph?.[a?.id]?.cue;if(!d)return;
   if(this.rng.state!==rng)d.violations.push({rule:'cue consumes no RNG',at:this.clock});
   if(this.difficulty==='recruta'||e?.last!==this.clock||e.kind!==cue)return;
   let valid=false,source=null;
   if(cue==='crack'){
    const hit=this.lastActualImpact;valid=hit?.at===this.clock&&hit.event.by===a.id&&hit.event.crack===true;
    source={type:'round-impact',by:hit?.event.by,kind:hit?.event.kind,crack:hit?.event.crack,point:copy(hit?.event.point)};
   }else{
    const ctx=this.fireContext,r=ctx?.round,fire=ctx?.actual,f=fire?.event;
    const visible=r?this.world.lineOfSight({space:'metres',x:r.ox,y:r.oy,z:r.oz,eyeHeight:0},this.player):false;
    valid=ctx?.by===a.id&&r?.by===a.id&&r.firedAt<=this.clock+1e-9&&fire?.at===this.clock&&f.at===r.firedAt&&f.weapon===r.weapon&&
      f.origin.x===r.ox&&f.origin.y===r.oy&&f.origin.z===r.oz&&visible&&cue===(r.tracer?'tracer':'flash');
    source={type:'enemy-fire',round:r?.id,by:r?.by,firedAt:r?.firedAt,emittedAt:fire?.at,visible,tracer:r?.tracer,origin:copy(f?.origin)};
   }
   if(!valid)d.violations.push({rule:'cue has an actual matching event/source',cue,by:a?.id,at:this.clock,source});
   if(e.last>this.clock||e.first>e.last)d.violations.push({rule:'cue never records a future burst',by:a.id,record:copy(e),clock:this.clock});
   const proof={at:this.clock,cue,by:a.id,valid,source};let book=d.proofByActor[a.id];
   if(!book||book.first.at!==e.first)book=d.proofByActor[a.id]={first:proof,last:proof};else book.last=proof;
   d.cueCounts[cue]++;
  }
  landRound(r){
   const rng=this.rng,original=rng.next,previous=this.landContext,ctx={rolls:0,impact:null};this.landContext=ctx;
   rng.next=(...args)=>{ctx.rolls++;return original.apply(rng,args);};
   try{super.landRound(r);}finally{rng.next=original;this.landContext=previous;}
   const d=this.danger,collision=ctx.impact?.material==='character'&&!ctx.impact?.victim;
   if(collision)d.collisions++;d.rolls+=ctx.rolls;
   if(ctx.rolls!==(collision?1:0))d.violations.push({rule:'one old wound draw per player collision',round:r.id,rolls:ctx.rolls,collision});
  }
  woundPlayer(r){
   const before={clock:this.clock,firedAt:r.firedAt,by:r.by,kind:r.kind,health:this.player.health,alive:this.player.alive,scene:this.scene?.id??null,
    engagement:copy(this.timers.telegraph?.[r.by]),cue:copy(this.timers.telegraph?.[r.by]?.cue),proof:copy(this.danger?.proofByActor[r.by]),rng:this.rng.state};
   super.woundPlayer(r);const d=this.danger;if(!d)return;if(this.rng.state!==before.rng)d.violations.push({rule:'wound adds no RNG',by:r.by});
   if(this.player.health<before.health)d.wounds++;
   if(before.alive&&!this.player.alive){
    const e=before.cue,p=before.proof,qualifies=CUES.includes(e?.kind)&&r.firedAt-before.engagement.first>=this.level.reactionGraceSec-1e-9&&before.clock-e.last<=F1_TELEGRAPH_GAP_SEC&&r.firedAt-e.first>=this.level.reactionGraceSec-1e-9&&
      p?.first.valid&&p?.last.valid&&p.first.at===e.first&&p.last.at===e.last;
    const row={...before,rngAfter:this.rng.state,cause:this.failure,qualifyingCue:Boolean(qualifies)};d.deaths.push(row);
    if(this.difficulty!=='recruta'&&(!qualifies||before.scene))d.violations.push({rule:'every fatal round has prior same-shooter grace/recent actual cue and no scene',death:row});
   }
  }
  tick(dt,controls){
   if(captureDeathView&&this.danger&&this.player.alive&&this.player.health<=this.level.woundDamage&&this.enemyFire.rounds.some(r=>r.arriveAt<=this.clock+dt+.001))lastCandidate=this.snapshot();
   super.tick(dt,controls);
   if(this.danger){this.danger.minHealth=Math.min(this.danger.minHealth,this.player.health);if(!this.player.alive&&lastCandidate)deathView=lastCandidate;}
  }
 }
 let complete=false,error=null;
 try{const result=route(seed,{support,Simulation:Observed,onStep:({sim})=>{if(!sim.player.alive)throw new ObservedDeath();}});complete=result.sim.mission.complete;}
 catch(e){if(!(e instanceof ObservedDeath))error=e.message;}
 const s=instance,d=s.danger,end=s.snapshot(false);for(const e of Object.values(end.timers.telegraph??{}))delete e.cue;
 const endGameplayHash=createHash('sha256').update(JSON.stringify(end)).digest('hex');
 return {level,seed,support,complete,rngState:s.rng.state,endGameplayHash,died:!s.player.alive,clock:s.clock,battleClock:s.battleClock,health:s.player.health,minHealth:d.minHealth,cueCounts:d.cueCounts,
  collisions:d.collisions,woundRolls:d.rolls,wounds:d.wounds,deaths:d.deaths,violations:d.violations,error,...(captureDeathView?{deathView}:{} )};
}
