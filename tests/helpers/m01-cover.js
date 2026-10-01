import { seconds, clockText } from '../../src/game/m01-simulation.js';
import { eyePosition } from '../../src/world/spatial.js';
import { driver, toRepair } from './m01-route.js';

// Two ways through "Proteja o reparo" and "Cubra a retirada", driven only by controls and by what a player sees
// (recent muzzle flashes from sim.threat). State-level comparison: not a browser playthrough, not a human playtest.
// - ignore: the control route (waits behind the sandbags, never fires; Bąk is left to Dudek).
// - help: beside the sappers it keeps the gate MG down; on the deck it fires at the Germans on the spans.
export function coverRoute(seed=19390901,mode='ignore'){
  const d=toRepair(driver(seed)),{sim,events,step,until,walk}=d;
  const stats={seed,mode,shots:0,repair:{deliveredAt:sim.clock,start:clockText(sim.battleClock)},casualties:[],repairMgSuppressed:0,repairUnderFire:0};
  let lastFlash=null,lastShot=-1e9,survivors=sim.flags['m01.east_platoon_survivors'];
  const times={},historic=['order_demolish','east_platoon_withdraws','germans_on_east_spans','east_demolition','west_demolition','roll_call'];
  const watch=()=>{
    for(const id of historic)if(!times[id]&&sim.consumedEvent(`evt_m01_${id}`))times[id]=clockText(sim.battleClock);
    if(sim.active('cover_repair')&&sim.consumedEvent('evt_m01_train963_arrives')){stats.repairUnderFire+=.05;if(sim.actor('de_east_0').suppressedUntil>sim.clock)stats.repairMgSuppressed+=.05;}
    const n=sim.flags['m01.east_platoon_survivors'];if(n<survivors)stats.casualties.push(clockText(sim.battleClock));survivors=n;
    if(!stats.repair.end&&sim.done('cover_repair'))stats.repair={...stats.repair,end:clockText(sim.battleClock),realSeconds:+(sim.clock-stats.repair.deliveredAt).toFixed(2),pins:sim.timers.repairPins};
  };
  const tick=c=>{step(c);watch();};
  const wait=(predicate,limit,controls={})=>until(()=>{watch();return predicate();},limit,controls);
  // Aim with whole mouse counts, as the browser pilot does, at the last flash seen; fire when the bolt is ready.
  const cover=(who,keepDown)=>()=>{
    const flash=sim.threat.recentFire.filter(who).sort((a,b)=>a.age-b.age)[0];if(flash)lastFlash=flash;if(!lastFlash)return {};
    const p=sim.player,e=eyePosition(p),dx=lastFlash.x-e.x,dz=lastFlash.z-e.z,dy=lastFlash.y-.6-e.y;
    let turn=Math.atan2(dz,dx)-p.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
    const lookX=Math.round(turn/.0022),lookY=Math.round(-(Math.atan2(dy,Math.hypot(dx,dz))-p.pitch)/.0022);
    const fire=sim.weapon.state==='READY'&&sim.weapon.mag>0&&Math.abs(lookX)<=1&&Math.abs(lookY)<=1&&!keepDown();
    if(fire){stats.shots++;lastShot=sim.clock;}
    return {lookX,lookY,aim:true,fire,reload:sim.weapon.mag===0&&sim.weapon.state==='READY'};
  };
  if(mode==='help'){
    walk(-120,16.5);tick({crouch:true});lastFlash=null;
    wait(()=>!sim.active('cover_repair'),400,cover(f=>f.id==='de_east_0',()=>sim.clock-lastShot<4&&sim.threat.mgSuppressed.includes('de_east_0')));
    tick({crouch:true});
    const kowal=sim.actor('szymon_kowal');walk(kowal.x+1.5,kowal.z);tick({interact:true});tick({});tick({interact:true});
  }
  walk(-115,27);walk(-28,28);tick({crouch:true});
  wait(()=>sim.active('hold_access'),500);
  tick({crouch:true});
  walk(-115,32);walk(-10,32);walk(-10,40);walk(30,40);
  wait(()=>sim.consumedEvent('evt_m01_germans_on_east_spans'),500);
  if(mode==='help'){walk(38,42.4);lastFlash=null;wait(()=>sim.consumedEvent('evt_m01_east_demolition'),500,cover(f=>f.id.startsWith('de_spans'),()=>sim.clock-lastShot<3.5&&sim.threat.spansSuppressed));}
  wait(()=>sim.consumedEvent('evt_m01_east_demolition'),500);
  stats.survivors=sim.flags['m01.east_platoon_survivors'];
  walk(-15,40);walk(-115,27);walk(-275,27);walk(-292,26);
  wait(()=>sim.consumedEvent('evt_m01_west_demolition'),500);
  walk(-292,68);walk(-262,70);
  wait(()=>sim.scene?.id==='cs_m01_roll_call',30);step({skip:true});
  wait(()=>sim.mission.complete,10);
  if(sim.battleClock!==seconds('07:05:00'))throw new Error('Wrong final battle clock');
  return {sim,events,stats:{...stats,times,repairMgSuppressedPct:Math.round(stats.repairMgSuppressed/Math.max(1e-9,stats.repairUnderFire)*100),
    health:sim.player.health,activeSeconds:+sim.clock.toFixed(1),checkpoints:[...sim.checkpointsReached],
    lethalRounds:events.filter(e=>e.type==='round-impact'&&e.victim).length,enemyFire:events.filter(e=>e.type==='enemy-fire').length}};
}
