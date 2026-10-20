// Presentation only: keep the corridor's real count/wait reason and distinguish observing a companion from following him.
// No timers, messages, objective writes, NPC commands or new completion rules.
const HOLD='obj_m01_hold_corridor',RESCUE='obj_m01_rescue_bak',WEST='evt_m01_west_demolition';
function marker(label,point,player){
 const rel=Math.atan2(point.z-player.z,point.x-player.x)-player.angle;
 return {label,x:point.x,y:point.y??0,z:point.z,distance:Math.hypot(point.x-player.x,point.z-player.z),bearing:Math.atan2(Math.sin(rel),Math.cos(rel))};
}
export function corridorGuidance(sim,currentMarker=null){
 const p=sim.player;
 if(sim.objectives?.[HOLD]?.state!=='active'||!p?.alive||sim.scene||sim.mission?.complete||Object.hasOwn(sim.consumed??{},WEST)||p.carrying==='jozef_bak')return null;
 const medic=sim.actors?.find(a=>a.id==='leon_dudek'),bak=sim.actors?.find(a=>a.id==='jozef_bak');
 // An available optional rescue keeps its existing destination; never divert a player who is collecting/carrying Bąk.
 if(sim.objectives?.[RESCUE]?.state==='active'&&(!medic||bak?.carriedBy!==medic.id))return null;
 const completion=sim.definition?.objectives?.find(o=>o.id==='obj_m01_leave_bridge')?.completion;
 if(!completion?.reach||!Number.isFinite(completion.radiusM)||completion.radiusM<=0||!sim.world?.point)return null;
 let post;try{post=sim.world.point(completion.reach);}catch{return null;}
 if(!Number.isFinite(post?.x)||!Number.isFinite(post?.z))return null;
 const status=sim.mission?.status??'';
 if(Math.hypot(p.x-post.x,p.z-post.z)>completion.radiusM)return {
  status:status?`Regresse ao posto · ${status}`:'Regresse ao posto de disparo para cobrir a retirada',
  marker:marker('Posto de disparo · cubra a retirada',post,p)
 };
 if(sim.readiness?.(WEST))return {status,marker:null};
 const watching=medic?.alive&&medic.active&&bak?.carriedBy===medic.id;
 return {status:status?`Mantenha o posto · ${status}`:'Mantenha o posto · observe a retirada',
  marker:watching?marker('Dudek com Bąk · observe a retirada',medic,p):currentMarker};
}
