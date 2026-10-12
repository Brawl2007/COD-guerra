import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {route,driver} from '../../tests/helpers/m01-route.js';
const fresh=new M01Simulation(19390901);fresh.tick(.05,{skip:true});const start=fresh.snapshot(false),flow=route(19390901,{support:true});
const b=driver(19390901);b.step({skip:true});b.until(()=>b.sim.renderState.stukas&&b.sim.battleClock>=seconds('04:34:20'),420);const bombing=b.sim.snapshot(false);
const centroid=(snapshot,pred)=>{const a=snapshot.actors.filter(pred);return a.length?{x:a.reduce((n,a)=>n+a.x,0)/a.length,z:a.reduce((n,a)=>n+a.z,0)/a.length,y:a.reduce((n,a)=>n+a.y,0)/a.length+1}:null;};
export const RAIL_PROP_VIEWS=[
 {name:'01-start-section-close',snapshot:start,x:-74,z:30,target:centroid(start,a=>a.alive&&a.active&&Math.hypot(a.x+66,a.z-22)<14&&!a.civilian)??{x:-66,z:22,y:1}},
 {name:'02-start-station-facade',snapshot:start,x:-330,z:0,target:{x:-399,z:35,y:4}},
 {name:'close-station-yard',snapshot:start,x:-425,z:5,target:{x:-414,z:18,y:-1}},
 {name:'03-start-hut-objective',snapshot:start,x:-242,z:32,target:{x:-262,z:20,y:0}},
 {name:'07-bombing-station-yard',snapshot:bombing,x:-300,z:-10,target:{x:-345,z:25,y:3}},
 {name:'10-repair-threat-lisewo-far',snapshot:flow.combatSnapshots.repairThreat,x:-120,z:16.5,target:{x:1063,z:6,y:3},feature:'track'},
 {name:'close-bridge-east-join',snapshot:flow.combatSnapshots.eastDemolitionOutside,x:1056,z:9,target:{x:1049,z:1,y:.01},feature:'track'},
 {name:'16-roll-call',snapshot:flow.outro,x:-248,z:80,target:centroid(flow.outro,a=>a.alive&&a.active&&!a.civilian&&a.x<-200&&a.z>50)??{x:-262,z:70,y:1}},
 {name:'close-telegraph-kit',snapshot:start,x:-332,z:-36,target:{x:-328,z:-33,y:4}},
 {name:'close-yard-crane-coal',snapshot:flow.combatSnapshots.repairThreat,x:-411,z:-16,target:{x:-414,z:-23,y:1}},
 {name:'close-sleeper-stack-lantern',snapshot:start,x:-454,z:23,target:{x:-452,z:18,y:-1}},
 {name:'close-west-join-5m',snapshot:start,x:-5,z:5,target:{x:0,z:2,y:-.17},feature:'track'},
 {name:'close-east-join-5m',snapshot:start,x:1044,z:5,target:{x:1049,z:2,y:.012},feature:'track'},
 {name:'close-train-join-5m',snapshot:start,x:1057,z:-7,target:{x:1062,z:-2.5,y:-.82},feature:'track'},
 {name:'close-station-switch-5m',snapshot:start,x:-449,z:-31,target:{x:-449,z:-25,y:.33},feature:'track'}
];
export function railPropSnapshot(v){const s=structuredClone(v.snapshot),sim=new M01Simulation();sim.restoreSnapshot(s);const y=sim.world.heightAt(v.x,v.z),dx=v.target.x-v.x,dz=v.target.z-v.z;Object.assign(s.player,{x:v.x,y,z:v.z,angle:Math.atan2(dz,dx),pitch:Math.atan2(v.target.y-y-1.6,Math.hypot(dx,dz)),moveBlend:0,sprinting:false,crouched:false,aiming:false});return s;}
