import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {COVER_ROTATION,coverStandingPoint,nextCover,coverOrder} from '../src/game/m01-cover-guidance.js';
import {toCoverAdjustment} from './helpers/m01-route.js';
import {deepestWall,PLAYER_PHYSICS as P} from '../src/world/m01-player-physics.js';
let scenario;
const flow=()=>scenario??=toCoverAdjustment();
test('rotation excludes occupied, inactive and solid cover destinations without promising safety',()=>{
 const s=new M01Simulation(),w=s.world;
 for(const id of COVER_ROTATION){const node=w.coverNodes.find(n=>n.id===id),point=coverStandingPoint(w,node);if(!point)continue;
  assert.equal(deepestWall(w,point.x,point.z,point.y,P.radius,P.standHeight),null,id);
  assert.equal(w.coverAt(point)?.id,id);assert.notEqual(nextCover(w,point),id);
 }
 assert.equal(coverStandingPoint(w,w.coverNodes.find(n=>n.id==='cv_portal_road_n')),null,'never place a marker inside the portal mass');
 const copy={...w,coverNodes:[],coverAt:()=>null};assert.equal(nextCover(copy,s.player),null);
 assert.equal(coverOrder(s),null,'no order without a real salvo');
});
test('a real salvo names a different cover, survives restore and confirms arrival with marker reduction',()=>{
 const {sim:s}=flow(),order=coverOrder(s);assert.ok(order);assert.equal(order.arrived,false);
 assert.notEqual(order.id,s.world.coverAt(s.player)?.id);assert.match(s.objectiveMarker.label,/Mude para/);
 const r=new M01Simulation();r.restoreSnapshot(s.snapshot());assert.deepEqual(coverOrder(r),order);assert.deepEqual(r.objectiveMarker,s.objectiveMarker);
 // Bounded native simulation controls, through the existing open road entrance.
 const d={sim:r};const points=[[-115,32],[-30,40],[-10,40],[order.point.x,order.point.z]];
 for(const [x,z]of points){let arrived=false;for(let i=0;i<4000;i++){
  const p=r.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.6){arrived=true;break;}
  const angle=Math.atan2(dz,dx)-p.angle;r.tick(.05,{lookX:Math.atan2(Math.sin(angle),Math.cos(angle))/.0022,forward:1,sprint:true});
 }assert.ok(arrived,`route ${x},${z}`);}
 assert.equal(coverOrder(r)?.arrived,true);assert.equal(r.objectiveMarker,null);
 assert.match(r.mission.status,/Na posição indicada/);
 const saved=r.snapshot(),restored=new M01Simulation();restored.restoreSnapshot(saved);assert.equal(restored.objectiveMarker,null);assert.equal(coverOrder(restored)?.arrived,true);
 r.finish('hold_access');assert.equal(coverOrder(r),null,'order cannot outlive its objective');
});
test('rescue guide stays active inside 10 m until the real interaction range; repair progress suppresses MG nagging',()=>{
 const s=new M01Simulation();s.tick(.05,{skip:true});for(const o of Object.values(s.objectives))o.state='locked';s.activate('rescue_bak');s.player.carrying='jozef_bak';
 const aid=s.world.point('aid_position');Object.assign(s.player,{x:aid.x-6,z:aid.z,y:aid.y});
 s.updateGuide();s.clock+=4;s.drainEvents();s.updateGuide();assert.ok(s.drainEvents().some(e=>e.type==='message'&&/Socorrista Dudek: 6 m/.test(e.message)));
 s.finish('rescue_bak');s.player.carrying=null;s.activate('cover_repair');s.objectives.obj_m01_cover_repair.progress=40;
 assert.equal(s.guideTarget(),null,'working repair is progress; distance to the MG is not progress');
 s.timers.repairSuppressedUntil=s.clock+10;s.actor('de_east_0').active=true;assert.match(s.guideTarget().label,/Metralhadora/);
});
