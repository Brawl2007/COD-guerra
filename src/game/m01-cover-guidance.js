// Read-only guidance over existing cover nodes and player collision geometry.
// A valid standing point is not a promise of ballistic safety (trusses are partial).
import {deepestWall,groundOk,PLAYER_PHYSICS as P} from '../world/m01-player-physics.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const COVER_ROTATION=Object.freeze(['cv_sandbag_mid_2','cv_portal_road_n','cv_road_truss_1','cv_road_truss_3','cv_tower_p1_n']);
const LABELS={cv_sandbag_mid_2:'sacos de areia junto ao acesso',cv_portal_road_n:'canto do portal rodoviário',cv_road_truss_1:'primeira treliça · cobertura parcial',cv_road_truss_3:'treliça seguinte · cobertura parcial',cv_tower_p1_n:'base da torre'};
const standCache=new WeakMap();
export function coverStandingPoint(world,node){
 if(!node)return null;
 let cache=standCache.get(world);
 if(!cache||cache.revision!==world.revision){cache={revision:world.revision,points:new Map()};standCache.set(world,cache);}
 if(cache.points.has(node.id))return cache.points.get(node.id);
 for(const dx of [-1.2,-2,-3])for(const dz of [0,1.5,-1.5,2.5,-2.5]){
  const x=node.position[0]+dx,z=node.position[2]+dz,y=world.heightAt(x,z),point={x,y,z};
  if(y<-6||world.coverAt(point)?.id!==node.id||!groundOk(world,x,z,y,P.radius)||deepestWall(world,x,z,y,P.radius,P.standHeight))continue;
  cache.points.set(node.id,Object.freeze(point));return point;
 }
 cache.points.set(node.id,null);return null;
}
export function nextCover(world,player,index=0){
 const occupied=world.coverAt(player)?.id;
 for(let offset=0;offset<COVER_ROTATION.length;offset++){
  const id=COVER_ROTATION[(index+offset)%COVER_ROTATION.length];if(id===occupied)continue;
  const point=coverStandingPoint(world,world.coverNodes.find(n=>n.id===id));
  if(point&&dist(player,point)>3.5)return id;
 }
 return null;
}
export function coverOrder(sim){
 if(!sim.active('hold_access')||!sim.timers.coverFire||sim.clock<sim.timers.coverFire.at)return null;
 const id=sim.flags['m01.suggested_cover'],node=sim.world.coverNodes.find(n=>n.id===id),point=coverStandingPoint(sim.world,node);
 if(!point)return null;
 return {id,label:LABELS[id]??'posição indicada',point,arrived:sim.world.coverAt(sim.player)?.id===id&&dist(sim.player,point)<2};
}
