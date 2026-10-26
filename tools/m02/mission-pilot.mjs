// Verification pilot, not gameplay AI. Reads collision/actor observations and
// produces ordinary controls. Never writes player, actors, clocks, RNG or flags.
import {eyePosition, traceShot} from '../../src/world/spatial.js';
import {m02PlayerAction} from '../../src/game/m02-player-actions.js';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class M02MissionPilot {
  constructor({flankX=-50,flankZ=-52}={}){this.flankX=flankX;this.flankZ=flankZ;this.route=[];this.routeKey='';this.nextPlan=0;this.lastCell=null;}
  decide(sim){
    const p=sim.player, eye=eyePosition(p), controls={};
    if(this.lastCell!==sim.activeCellId){this.lastCell=sim.activeCellId;this.enteredAt=sim.clock;this.flanked=false;this.route=[];this.routeKey='';}
    if(sim.activeCellId!=='A'&&sim.clock-this.enteredAt<18&&!sim.enemies.some(e=>e.seeingTargetId===p.id))return {controls:{crouch:!p.crouched,reload:sim.weapon.mag<5},waitingForSquad:true};
    const action=m02PlayerAction(sim);
    if(action)return {controls:{interact:true},action:action.id};
    const chalk=sim.currentChalkPrompt();if(chalk)return {controls:{interact:true}};
    const door=sim.currentDoorPrompt();if(door?.state==='closed')return {controls:{interact:true}};
    const hostiles=sim.enemies.filter(e=>e.alive&&!e.nonCombatant&&e.state!=='SURRENDERED'&&e.state!=='WOUNDED_UNARMED');
    const priority=e=>Math.hypot(e.x-p.x,e.z-p.z)-(e.seeingTargetId===p.id?120:0)-(e.weapon==='mg34'?25:0);
    hostiles.sort((a,b)=>priority(a)-priority(b));
    let target=null,aim=null;
    for(const enemy of hostiles){
      const point={x:enemy.x,y:enemy.y+1.58-(enemy.crouched?.56:0),z:enemy.z};
      const dx=point.x-eye.x,dy=point.y-eye.y,dz=point.z-eye.z,d=Math.hypot(dx,dy,dz);
      const hit=traceShot(sim.world,eye,{x:dx/d,y:dy/d,z:dz/d},[enemy],220);
      if(hit?.kind==='actor'){target=enemy;aim=point;break;}
    }
    if(target){
      const dx=aim.x-eye.x,dz=aim.z-eye.z;
      controls.lookX=wrap(Math.atan2(dz,dx)-p.angle);
      controls.lookY=p.pitch-Math.atan2(aim.y-eye.y,Math.hypot(dx,dz));
      if(!p.crouched)controls.crouch=true;
      controls.aim=true;controls.fire=sim.weapon.state==='READY'&&sim.weapon.mag>0;
      controls.reload=sim.weapon.mag===0;
      return {controls,target:target.id};
    }
    let goal;
    if(sim.activeCellId==='C'&&!sim.areaC.c10Started&&!this.flanked&&Math.hypot(p.x-this.flankX,p.z-this.flankZ)>1)goal={id:'west-cover',x:this.flankX,z:this.flankZ};
    else if(hostiles.length)goal=hostiles[0];
    else if(sim.activeCellId==='A')goal={x:0,z:50};
    else if(sim.activeCellId==='B')goal={x:sim.areaB.supplyCart.goalX,z:sim.areaB.supplyCart.goalZ};
    else if(sim.activeCellId==='C'&&sim.areaC.c11Started&&!sim.areaC.lisContactedInC11)goal=sim.allies.find(a=>a.id==='pl_lis'&&a.alive&&!a.detachedOutOfCell)??{x:-55,z:54};
    else goal={x:-55,z:54};
    if(sim.activeCellId==='C'&&Math.hypot(p.x-this.flankX,p.z-this.flankZ)<1)this.flanked=true;
    const goalKey=`${sim.activeCellId}:${goal.id??'exit'}`;
    if(goalKey!==this.routeKey||sim.clock>=this.nextPlan||!this.route.length){
      this.route=sim.navigator.route(p,goal)??[];
      // A closed doorway is itself solid: approach its accessible side and open
      // it through the same [E] prompt, then plan through the actual aperture.
      if(!this.route.length){
        const candidates=sim.world.doors.filter(d=>d.state==='closed').sort((a,b)=>
          Math.hypot(a.center.x-p.x,a.center.z-p.z)+Math.hypot(a.center.x-goal.x,a.center.z-goal.z)-Math.hypot(b.center.x-p.x,b.center.z-p.z)-Math.hypot(b.center.x-goal.x,b.center.z-goal.z));
        outer:for(const d of candidates)for(const sign of [-1,1]){
          const g={x:d.center.x+(d.orientation==='V'?sign*1.3:0),z:d.center.z+(d.orientation==='H'?sign*1.3:0)};
          const path=sim.navigator.route(p,g);if(path){this.route=path;goal=g;break outer;}
        }
      }
      this.routeKey=goalKey;this.nextPlan=sim.clock+4;
    }
    while(this.route.length&&Math.hypot(this.route[0][0]-p.x,this.route[0][1]-p.z)<.35)this.route.shift();
    const corner=this.route[0];
    if(corner){if(p.crouched)controls.crouch=true;controls.lookX=wrap(Math.atan2(corner[1]-p.z,corner[0]-p.x)-p.angle);controls.lookY=p.pitch;controls.forward=1;controls.sprint=true;}
    controls.reload=sim.weapon.mag<5&&sim.weapon.reserve>0;
    return {controls,goal:[goal.x,goal.z],route:this.route.length};
  }
}
