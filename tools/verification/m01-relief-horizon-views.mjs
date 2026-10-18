import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../../tests/helpers/m01-route.js';

const centroid=(snapshot,pred)=>{const a=snapshot.actors.filter(pred);if(!a.length)return null;return {x:a.reduce((s,v)=>s+v.x,0)/a.length,y:a.reduce((s,v)=>s+v.y,0)/a.length+1,z:a.reduce((s,v)=>s+v.z,0)/a.length};};
// Exact four relevant canonical definitions from m01-roadmap-captures.spec.js; same seed, routes and framing.
export function reliefHorizonViews(){
  const fresh=new M01Simulation(19390901);fresh.tick(.05,{skip:true});const start=fresh.snapshot(false),r=route(19390901,{support:true}),cs=r.combatSnapshots;
  return {world:fresh.world,views:[
    // The framing is pinned to the pre-T38 start section (marek_zielinski alone stood at -76,24, y -2 inside 14 m of -66,22, so the old target was his position): T38 stages five men at
    // the squad-post slots, which moved the 14 m centroid and swung the camera 29 degrees onto the rail embankment, where the horizon strip the far-landscape A/B measures is hidden.
    // Same camera and pitch as the baseline; the section is still in frame (about 30 degrees right of the view axis).
    {name:'01-start-section-close',snapshot:start,x:-74,z:30,target:{x:-76,z:24,y:-2}},
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
