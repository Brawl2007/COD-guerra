import { UNITS_PER_METRE } from '../config.js';
import { Soldier } from './actors.js';

// Reduced simulation: stable actors and authored causal events, never camera triggers.
// This sandbox timeline is NOT a historical reconstruction of any specific battle.
const PLANS=[
  {id:'east-road',title:'Estrada leste',anchor:{x:150,z:35},origin:{x:380,z:80},
    events:[{at:8,type:'advance'},{at:24,type:'bombardment'},{at:46,type:'retreat'},{at:72,type:'regroup'}]},
  {id:'north-ridge',title:'Encosta norte',anchor:{x:15,z:-180},origin:{x:-300,z:-360},
    events:[{at:14,type:'advance'},{at:37,type:'bombardment'},{at:63,type:'hold'},{at:88,type:'resupply'}]},
];

export class SectorBattle {
  constructor(random=Math.random){
    this.clock=0;this.consumed=[];this.damage=[];
    this.sectors=PLANS.map(plan=>({id:plan.id,phase:'preparation',order:'hold',supplies:100,casualties:0,progress:0}));
    this.actors=PLANS.flatMap(plan=>Array.from({length:4},(_,i)=>{
      const actor=new Soldier({id:`${plan.id}-${i}`,x:(plan.anchor.x+i*2)*UNITS_PER_METRE,
        y:(plan.anchor.z+i%2*3)*UNITS_PER_METRE},i<2?'ally':'enemy',random);
      actor.sector=plan.id;actor.active=true;actor.role='distant';return actor;
    }));
  }
  update(dt,emit){
    this.clock+=dt;
    for(let index=0;index<PLANS.length;index++){
      const plan=PLANS[index],sector=this.sectors[index],actors=this.actors.filter(a=>a.sector===plan.id);
      for(const event of plan.events){
        const id=`${plan.id}:${event.type}:${event.at}`;
        if(this.clock<event.at||this.consumed.includes(id))continue;
        this.consumed.push(id);
        if(event.type==='advance'){sector.phase='combat';sector.order='advance';}
        if(event.type==='bombardment'){
          sector.supplies-=20;
          const victim=actors.find(a=>a.team==='enemy'&&a.alive);
          if(victim){victim.damage(100);sector.casualties++;}
          const damage={id,sector:plan.id,x:plan.anchor.x,z:plan.anchor.z,started:this.clock};
          this.damage.push(damage);
          emit({type:'sector-impact',id,point:{x:damage.x,y:0,z:damage.z},origin:plan.origin,
            message:`RÁDIO: impacto confirmado — ${plan.title.toLowerCase()}.`});
        }
        if(event.type==='retreat'){sector.phase='withdrawal';sector.order='retreat';}
        if(event.type==='regroup'||event.type==='hold'){sector.phase='holding';sector.order='hold';}
        if(event.type==='resupply'){sector.supplies+=15;sector.phase='resupplied';}
        emit({type:'sector-order',id,sector:plan.id,order:sector.order});
      }
      sector.progress+=dt;
      for(const actor of actors){
        if(!actor.alive){actor.deathBlend=Math.min(1,actor.deathBlend+dt*2);continue;}
        actor.shot=Math.max(0,actor.shot-dt);actor.cooldown-=dt*1000;
        const direction=sector.order==='advance'?1:sector.order==='retreat'?-1:0;
        actor.x+=direction*dt*UNITS_PER_METRE*.5;actor.facing=actor.team==='enemy'?Math.PI:0;
        actor.state=direction?'ADVANCE':'SUPPRESS';
        if(sector.phase==='combat'&&actor.cooldown<=0){
          actor.cooldown=1300+(Number(actor.id.slice(-1))||0)*300;actor.shot=.09;
          emit({type:'distant-shot',point:{x:actor.x/UNITS_PER_METRE,y:1.5,z:actor.y/UNITS_PER_METRE}});
        }
      }
    }
  }
  registerHit(actor,amount){
    const alive=actor.alive;actor.damage(amount);
    if(alive&&!actor.alive)this.sectors.find(s=>s.id===actor.sector).casualties++;
  }
}
