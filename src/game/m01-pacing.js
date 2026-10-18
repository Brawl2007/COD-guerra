// M01 mission flow: time compression once the player has done what the phase needs, the world marker of the current objective
// and the objective status line. Pure functions of the simulation state and the mission data (missions/m01-tczew/mission.json):
// nothing here is saved, draws from the RNG or changes the battle-clock time of any historical event. The HUD only reads the result.
import definition from '../../missions/m01-tczew/mission.json' with { type: 'json' };

const seconds=text=>{const v=text.split(':').map(Number);if(v.length===2)v.push(0);return v.reduce((n,x)=>n*60+x,0);};
const E=name=>`evt_m01_${name}`;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(p,a)=>p.x>=a.minX&&p.x<=a.maxX&&p.z>=a.minZ&&p.z<=a.maxZ;

/** The road-deck area the section holds from 05:30 (obj_m01_hold_access completion area). */
export const HOLD_AREA=Object.freeze({minX:-10,maxX:160,minZ:30,maxZ:50});
/** Where the hold-access marker points before the player has reached the deck: the sandbags of the squad post, inside HOLD_AREA. */
export const HOLD_POSITION=Object.freeze({x:30,y:0,z:40});
/** West edge of the west demolition zone: every ally (Bąk included) must be west of it before the 06:45 charge. */
export const WEST_SAFE_X=-90;
/** Real seconds between two continuity messages, whatever the clock scale (a compressed clock must not flood the caption line). */
export const CONTINUITY_MIN_GAP_SEC=20;
/** The withdrawing men count as "passed" once they are this far west, at the firing point (x -290). */
const PASSED_X=-275;

/** Conditions named by clock.segments[].compress.when. Each is something the player has done, never a clock value alone. */
const COMPRESS_WHEN={
  // In position on the deck after the second raid: the section only waits for the 06:00 withdrawal.
  hold_in_position:sim=>sim.active('hold_access')&&Boolean(sim.timers.holdAccessVisited)&&inside(sim.player,HOLD_AREA)&&!sim.player.carrying&&!sim.scene&&
    sim.flags['m01.second_raid_state']==='ended',
  // Off the bridge, everyone west of the demolition zone: only the sappers' 06:45 charge is left.
  west_gate_ready:sim=>sim.done('leave_bridge')&&!sim.scene&&sim.readiness(E('west_demolition')),
};

/** The compression of `segment` that applies now, or null. Validated against mission data by tests/m01-pacing.test.js. */
export function activeCompression(sim,segment){
  const c=segment?.compress;if(!c)return null;
  if(sim.battleClock<seconds(c.from)||sim.battleClock>=seconds(c.to))return null;
  const when=COMPRESS_WHEN[c.when];if(!when)throw new Error(`M01: condição de compressão desconhecida: ${c.when}`);
  return when(sim)?c:null;
}
export const compressionConditions=Object.freeze(Object.keys(COMPRESS_WHEN));

/** Presentation of the battle clock speed: is the clock compressed, by how much and why (the HUD shows "Mais tarde…"). */
export function tempoState(sim){
  const segment=definition.clock.segments.find(s=>sim.battleClock>=seconds(s.from)&&sim.battleClock<seconds(s.to));
  if(!segment||sim.scene||sim.mission.phase==='OUTRO')return {compressed:false,scale:segment?.scale??1,label:'',reason:''};
  const c=activeCompression(sim,segment);
  if(c)return {compressed:true,scale:c.scale,label:c.label,reason:c.reason};
  if(segment.gate&&segment.readyScale&&sim.readiness(segment.gate))return {compressed:true,scale:segment.readyScale,label:segment.readyLabel??'Mais tarde…',reason:segment.readyReason??''};
  return {compressed:false,scale:segment.scale,label:'',reason:''};
}

/** Text of the objective panel while no required objective is active (data: pacing.interludes), or null. */
export function interludeText(sim){
  for(const i of definition.pacing?.interludes??[])
    if(sim.objectives[i.after]?.state==='done'&&!sim.consumedEvent(i.until))return i.text;
  return null;
}

/** Continuity cue gate: the cue's own objective must be active, and the last continuity message must be CONTINUITY_MIN_GAP_SEC real seconds old. */
export function continuityAllowed(sim,cue){
  if(cue.requires&&sim.objectives[cue.requires]?.state!=='active')return false;
  return sim.clock-(sim.timers.continuityAt??-1e9)>=CONTINUITY_MIN_GAP_SEC;
}

const carrierOf=(sim,bak)=>bak.carriedBy&&bak.carriedBy!==sim.player.id?sim.actor(bak.carriedBy):null;
/** Where the current objective is, for the HUD marker (destination, actor or threat). Superset of guideTarget(); null = nothing to point at. */
export function markerTarget(sim){
  const guide=sim.guideTarget();if(guide)return guide;
  const p=sim.player;
  if(sim.active('follow_sergeant'))return {label:'Sargento Zieliński',point:sim.world.point('rally_point')};
  if(sim.active('cover_withdrawal')){
    if(sim.consumedEvent(E('germans_on_east_spans'))){
      const spans=sim.enemies.filter(a=>a.group==='grp_de_spans'&&a.alive&&a.active).sort((a,b)=>dist(a,p)-dist(b,p));
      if(spans[0])return {label:'Alemães no tabuleiro leste',point:spans[0]};
    }
    const last=sim.actors.filter(a=>a.group==='grp_east_platoon'&&a.alive&&a.active).sort((a,b)=>b.x-a.x)[0];
    if(last)return {label:'Últimos homens do pelotão leste',point:last};
  }
  if(sim.active('hold_corridor')){
    const bak=sim.actor('jozef_bak'),carrier=carrierOf(sim,bak);
    if(carrier&&bak.x>=WEST_SAFE_X)return {label:'Dudek com Bąk',point:carrier};
    const fp=sim.world.point('firing_point');if(dist(p,fp)>15)return {label:'Posto de disparo',point:fp};
  }
  return null;
}

/** Read-only marker record for the HUD: label, world point, distance (m) and bearing relative to the view (radians, positive = to the right). */
export function objectiveMarker(sim){
  if(sim.scene||sim.mission.phase==='OUTRO'||sim.mission.complete)return null;
  const target=markerTarget(sim);if(!target)return null;
  const p=sim.player,pt=target.point,rel=Math.atan2(pt.z-p.z,pt.x-p.x)-p.angle;
  return {label:target.label,x:pt.x,y:pt.y??0,z:pt.z,distance:dist(p,pt),bearing:Math.atan2(Math.sin(rel),Math.cos(rel))};
}

/** Objective status for the phases whose threatStatus() is empty: reason, progress and what ends the phase. '' = nothing to add. */
export function pacingStatus(sim){
  const p=sim.player,n=sim.flags['m01.east_platoon_survivors'],bak=sim.actor('jozef_bak');
  const where=point=>`${Math.round(dist(p,point))} m, ${sim.directionTo(point)}`;
  if(sim.active('rescue_bak')){
    const aid=sim.world.point('aid_position');
    if(p.carrying==='jozef_bak')return `A carregar Bąk · socorrista Dudek no posto de socorro, ${where(aid)} · E junto dele para o entregar`;
    if(sim.active('leave_bridge')||sim.active('hold_corridor'))return `Bąk ferido no tabuleiro · ${where(bak)} · E para o levantar; sem si, Dudek vai buscá-lo às 06:14`;
  }
  if(sim.active('hold_access')){
    if(!sim.timers.holdAccessVisited)return `Tome posição no tabuleiro rodoviário · ${where(HOLD_POSITION)}`;
    if(!inside(p,HOLD_AREA))return `Volte à posição no tabuleiro · ${where(HOLD_POSITION)}`;
    return `Em posição · o pelotão leste (${n} homens) segura a cabeça de ponte; a secção cobre-o até à ordem de retirada`;
  }
  if(sim.active('hold_corridor')){
    const men=sim.actors.filter(a=>a.group==='grp_east_platoon'&&a.alive&&a.active),passed=men.filter(a=>a.x<=PASSED_X).length;
    if(passed<men.length)return `Corredor · passaram ${passed} de ${men.length} homens do pelotão leste`;
    const carrier=carrierOf(sim,bak);
    if(carrier&&bak.x>=WEST_SAFE_X)return `Dudek leva Bąk para oeste · faltam ${Math.ceil(bak.x-WEST_SAFE_X)} m até sair da zona de demolição`;
    if(sim.readiness(E('west_demolition')))return 'Todos fora da ponte · os sapadores preparam a carga oeste';
  }
  return '';
}

/** Validation of the pacing data, used by the simulation tests (no runtime cost). */
export function pacingDataErrors(){
  const errors=[],ids=new Set(definition.objectives.map(o=>o.id)),events=new Set(definition.events.map(e=>e.id));
  for(const s of definition.clock.segments){const c=s.compress;if(!c)continue;
    if(!COMPRESS_WHEN[c.when])errors.push(`${s.id}: when ${c.when}`);
    if(!(seconds(c.from)>=seconds(s.from)&&seconds(c.to)<=seconds(s.to)&&seconds(c.from)<seconds(c.to)))errors.push(`${s.id}: window`);
    if(!(c.scale>s.scale))errors.push(`${s.id}: scale`);if(!c.label||!c.reason)errors.push(`${s.id}: label/reason`);
  }
  for(const i of definition.pacing?.interludes??[])if(!ids.has(i.after)||!events.has(i.until)||!i.text)errors.push(`interlude ${i.after}`);
  for(const c of definition.continuityCues)if(c.requires&&!ids.has(c.requires))errors.push(`cue ${c.kind}`);
  return errors;
}
