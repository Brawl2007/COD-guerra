// Verification pilot, not gameplay AI. Reads collision/actor observations and
// produces ordinary controls. Never writes player, actors, clocks, RNG or flags.
import {eyePosition,muzzlePosition,traceShot} from '../../src/world/spatial.js';
import {m02PlayerAction,m02RifleAmmoSources} from '../../src/game/m02-player-actions.js';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

// When an enemy occupies a room the player cannot route directly into, find
// an accessible position with a real shot to that actor. This only guides
// normal player controls; it never moves an actor or changes a door.
export function m02PilotFiringPosition(sim,p,enemy){
  const bounds=sim.world.layout.bounds.playable,candidates=[];
  for(const radius of [2,4,6,8,12,16])for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,x=enemy.x+Math.cos(angle)*radius,z=enemy.z+Math.sin(angle)*radius;
    if(x<=bounds.minX+.5||x>=bounds.maxX-.5||z<=bounds.minZ+.5||z>=bounds.maxZ-.5||Math.hypot(x-p.x,z-p.z)<1)continue;
    candidates.push({x,z,distance:Math.hypot(x-p.x,z-p.z)});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  for(const goal of candidates){
    const trial={...p,x:goal.x,y:sim.world.heightAt(goal.x,goal.z),z:goal.z,crouched:true,eyeHeight:1.08,aiming:true};
    const eye=eyePosition(trial),target={x:enemy.x,y:enemy.y+1.58-(enemy.crouched?.56:0),z:enemy.z};
    const dx=target.x-eye.x,dy=target.y-eye.y,dz=target.z-eye.z,d=Math.hypot(dx,dy,dz);if(d<.01)continue;
    trial.angle=Math.atan2(dz,dx);trial.pitch=Math.atan2(dy,Math.hypot(dx,dz));
    const hit=traceShot(sim.world,eye,{x:dx/d,y:dy/d,z:dz/d},[enemy],220,muzzlePosition(trial,sim.clock));
    if(hit?.kind!=='actor')continue;
    const path=sim.navigator.route(p,goal),last=path?.at(-1);
    if(last&&Math.hypot(last[0]-goal.x,last[1]-goal.z)<.8)return {goal,path};
  }
  return null;
}

export class M02MissionPilot {
  constructor({flankX=-50,flankZ=-52}={}){this.flankX=flankX;this.flankZ=flankZ;this.route=[];this.routeKey='';this.nextPlan=0;this.lastCell=null;}
  decide(sim){
    const p=sim.player, eye=eyePosition(p), controls={};
    if(this.lastCell!==sim.activeCellId){this.lastCell=sim.activeCellId;this.enteredAt=sim.clock;this.flanked=false;this.route=[];this.routeKey='';}
    if(sim.activeCellId!=='A'&&sim.clock-this.enteredAt<18&&!sim.enemies.some(e=>e.seeingTargetId===p.id))return {controls:{crouch:!p.crouched,reload:sim.weapon.mag<5},waitingForSquad:true};
    const action=m02PlayerAction(sim);
    const lis=sim.allies.find(a=>a.id==='pl_lis'&&a.alive&&!a.detachedOutOfCell);
    const rescuePending=sim.activeCellId==='C'&&sim.areaC.c11Started&&lis&&sim.flags['m02.lis_status']!=='wounded_evacuated';
    if(action&&!(action.id==='epilogue'&&rescuePending))return {controls:{interact:true},action:action.id};
    if(action?.id==='epilogue'&&rescuePending&&sim.areaC.lisContactedInC11)return {controls:{crouch:!p.crouched},waitingForLis:true};
    const chalk=sim.currentChalkPrompt();if(chalk)return {controls:{interact:true}};
    const door=sim.currentDoorPrompt();if(door?.state==='closed')return {controls:{interact:true}};
    const hostiles=sim.enemies.filter(e=>e.alive&&!e.nonCombatant&&e.state!=='SURRENDERED'&&e.state!=='WOUNDED_UNARMED');
    const priority=e=>Math.hypot(e.x-p.x,e.z-p.z)-(e.seeingTargetId===p.id?120:0)-(e.weapon==='mg34'?25:0);
    hostiles.sort((a,b)=>priority(a)-priority(b));
    let target=null,aim=null;
    for(const enemy of hostiles){
      const point={x:enemy.x,y:enemy.y+1.58-(enemy.crouched?.56:0),z:enemy.z};
      const dx=point.x-eye.x,dy=point.y-eye.y,dz=point.z-eye.z,d=Math.hypot(dx,dy,dz);
      const aimed={...p,angle:Math.atan2(dz,dx),pitch:Math.atan2(dy,Math.hypot(dx,dz)),aiming:true};
      const hit=traceShot(sim.world,eye,{x:dx/d,y:dy/d,z:dz/d},[enemy],220,muzzlePosition(aimed,sim.clock));
      if(hit?.kind==='actor'){target=enemy;aim=point;break;}
    }
    const outOfAmmo=sim.weapon.mag===0&&sim.weapon.reserve===0;
    const ammoSources=outOfAmmo&&!p.carryingVolumeId?m02RifleAmmoSources(sim).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)):[];
    if(target&&!ammoSources.length&&!(outOfAmmo&&p.carryingVolumeId&&sim.areaB?.supplyCart)){
      const dx=aim.x-eye.x,dz=aim.z-eye.z;
      controls.lookX=wrap(Math.atan2(dz,dx)-p.angle);
      controls.lookY=p.pitch-Math.atan2(aim.y-eye.y,Math.hypot(dx,dz));
      if(!p.crouched)controls.crouch=true;
      controls.aim=true;controls.fire=sim.weapon.state==='READY'&&sim.weapon.mag>0;
      controls.reload=sim.weapon.mag===0;
      return {controls,target:target.id};
    }
    let goal;
    if(outOfAmmo&&p.carryingVolumeId&&sim.areaB?.supplyCart)goal={id:'delivery',x:sim.areaB.supplyCart.goalX,z:sim.areaB.supplyCart.goalZ};
    else if(ammoSources.length)goal=ammoSources[0];
    else if(sim.activeCellId==='C'&&!sim.areaC.c10Started&&!this.flanked&&Math.hypot(p.x-this.flankX,p.z-this.flankZ)>1)goal={id:'west-cover',x:this.flankX,z:this.flankZ};
    else if(hostiles.length)goal=hostiles[0];
    else if(sim.activeCellId==='A')goal=sim.enemies.find(a=>a.alive&&a.c04Candidate&&a.nonCombatant&&!a.chalkMarked)??{x:0,z:50};
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
      if(!this.route.length&&hostiles.includes(goal)){
        const vantage=m02PilotFiringPosition(sim,p,goal);
        if(vantage){this.route=vantage.path;goal=vantage.goal;}
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
