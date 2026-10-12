import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';

const centroid=(snapshot,pred)=>{const a=snapshot.actors.filter(pred);if(!a.length)return null;return {x:a.reduce((s,v)=>s+v.x,0)/a.length,y:a.reduce((s,v)=>s+v.y,0)/a.length+1,z:a.reduce((s,v)=>s+v.z,0)/a.length};};
// Exact four relevant canonical definitions from m01-roadmap-captures.spec.js; same seed, routes and framing.
export function reliefHorizonViews(){
  const fresh=new M01Simulation(19390901);fresh.tick(.05,{skip:true});const start=fresh.snapshot(false),r=route(19390901,{support:true}),cs=r.combatSnapshots;
  return {world:fresh.world,views:[
    {name:'01-start-section-close',snapshot:start,x:-74,z:30,target:centroid(start,a=>a.alive&&a.active&&Math.hypot(a.x+66,a.z-22)<14&&!a.civilian)??{x:-66,z:22,y:1}},
    {name:'09-repair-sappers',snapshot:cs.repair,x:-146,z:14,target:centroid(cs.repair,a=>a.alive&&a.active&&a.x>-135&&a.x<-100&&!a.civilian)??{x:-123,z:8,y:1}},
    {name:'10-repair-threat-lisewo-far',snapshot:cs.repairThreat,x:-120,z:16.5,target:{x:1063,z:6,y:3}},
    {name:'17-panzerzug-daylight',snapshot:cs.eastDemolitionOutside,x:1092,z:24,target:{x:1150,z:2.5,y:2.5}},
    {name:'supplement-west-banks',snapshot:cs.repair,x:-420,z:120,target:{x:-860,z:-350,y:5}},
    {name:'supplement-east-banks',snapshot:cs.eastDemolitionOutside,x:1092,z:24,target:{x:2020,z:-260,y:12}},
  ]};
}
export function relocatedView(world,view){
  const s=structuredClone(view.snapshot),{x,z,target}=view,y=world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  Object.assign(s.player,{x,z,y,angle:Math.atan2(dz,dx),pitch:Math.atan2((target.y??y+1.5)-y-1.6,Math.hypot(dx,dz)),aiming:false,crouched:false});return s;
}
