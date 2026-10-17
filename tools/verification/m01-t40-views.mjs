import {M01Simulation} from '../../src/game/m01-simulation.js';
import {driver,toRepair,route} from '../../tests/helpers/m01-route.js';
const centroid=(s,p)=>{const a=s.actors.filter(p);return a.length?{x:a.reduce((n,v)=>n+v.x,0)/a.length,y:a.reduce((n,v)=>n+v.y,0)/a.length+1,z:a.reduce((n,v)=>n+v.z,0)/a.length}:null;};
export function canonicalViews(){
 const fresh=new M01Simulation(19390901);fresh.tick(.05,{skip:true});const start=fresh.snapshot(false),full=route(19390901,{support:true});
 // Exact canonical 01/05/14 camera definitions from m01-roadmap-captures.spec.js.
 return [
  {name:'01-start-section-close',snapshot:start,x:-74,z:30,target:centroid(start,a=>a.alive&&a.active&&Math.hypot(a.x+66,a.z-22)<14&&!a.civilian)??{x:-66,z:22,y:1}},
  {name:'05-start-ads-viewmodel',snapshot:start,x:-66,z:22,target:{x:-4,z:1,y:3},aiming:true},
  {name:'14-east-demolition',snapshot:full.combatSnapshots.eastDemolition,x:38,z:42.4,target:{x:793.8,z:0,y:6}},
 ].map(v=>{const s=structuredClone(v.snapshot),y=fresh.world.heightAt(v.x,v.z),dx=v.target.x-v.x,dz=v.target.z-v.z;Object.assign(s.player,{x:v.x,y,z:v.z,angle:Math.atan2(dz,dx),pitch:Math.atan2(v.target.y-y-1.6,Math.hypot(dx,dz)),aiming:Boolean(v.aiming)});return {...v,snapshot:s};});
}
export function carryViews(){
 const d=toRepair(driver(19390901,{support:true})),{sim,walk,step,until}=d;
 walk(-120,16.5);until(()=>sim.active('hold_access'),500);walk(-115,32);walk(-10,32);walk(-10,40);walk(38,42.4);
 until(()=>sim.active('rescue_bak'),500);const bak=sim.actor('jozef_bak');walk(bak.x,bak.z);const beforePickup=sim.snapshot();step({interact:true});
 const pickup=sim.snapshot();until(()=>bak.carry?.phase==='carry',10);const carry=sim.snapshot();walk(-8,40);walk(-8,48);const beforePutdown=sim.snapshot();step({interact:true});
 if(bak.carry?.phase!=='putdown')throw Error('Real carry route failed to reach aid position');
 return {beforePickup,pickup,carry,beforePutdown,putdown:sim.snapshot()};
}
