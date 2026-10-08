import {visualNoise} from './m01-atmosphere.js';

/*
 * Distant battlefield plan — PRESENTATION ONLY. Three layers are kept apart on purpose:
 *
 *  AUTHORITATIVE  M01Simulation: consumed event ids with their mission clock, and the clock itself. Read-only input;
 *                 nothing here writes to the simulation or feeds damage, mission state, visibility, AI or objectives.
 *  PRESENTATION   Episodes that exist only because one authoritative event was consumed, starting at its consumed
 *                 clock: the north front after north_contact_distant, the Koźliny assault, the fire columns.
 *  AMBIENT        Background rhythm from a fixed seed and the mission clock, gated by the authoritative phase:
 *                 the Lisewo floodplain skirmish, squads on the far plain, distant aircraft.
 *
 * The plan is a pure function of (clock, consumed milestones, seed). It never receives the player or the camera:
 * sources are anchored to world sectors, events exist while nobody looks at them, and pause, restore and quality
 * reproduce them exactly. Times are mission-clock seconds (`sim.clock`), so effect durations stay real while the
 * battle clock is time-scaled. Places, hours and intensities are GAMEPLAY_DRAMATIZATION of the documented sectors
 * (missions/m01-tczew/MAP.md §3, SOURCE_CHECK.md): no unit, aircraft number, calibre, vehicle type or casualty is
 * asserted. Short range (under 380 m) belongs to the authoritative battlefield FX, not to this layer.
 */

export const DISTANT_SEED=0x7c2e1939;
// MAP.md §5 movement area. Fire sources/targets/paths stay ≥380 m from it. Anything that could pass for an engageable
// S2 enemy (the Lisewo floodplain) and the far-plain figures stay beyond the player's 1200 m shot ray, so nothing
// non-engageable sits where the player's rounds can land; aircraft stay ≥2 km away.
export const MOVEMENT_AREA=Object.freeze({x:Object.freeze([-460,440]),z:Object.freeze([-80,140])});
export const SAFE_DISTANCE=Object.freeze({fire:380,ray:1250,figure:1250,aircraft:2000});
export const distanceFromMovementArea=(p,area=MOVEMENT_AREA)=>Math.hypot(Math.max(area.x[0]-p.x,0,p.x-area.x[1]),Math.max(area.z[0]-p.z,0,p.z-area.z[1]));
const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return Object.freeze(o);};
const box=(x,z,y)=>({x,z,y});

/** Authoritative milestones read from `sim.consumed` (mission clock at consumption). */
export const MILESTONE_EVENTS=freeze({planes:'evt_m01_planes_heard',train:'evt_m01_train963_arrives',panzerzug:'evt_m01_panzerzug_arrives',
  bombing530:'evt_m01_bombing_0530',north:'evt_m01_north_contact_distant',withdraw:'evt_m01_east_platoon_withdraws',
  spans:'evt_m01_germans_on_east_spans',eastDemolition:'evt_m01_east_demolition',westDemolition:'evt_m01_west_demolition',kozliny:'evt_m01_kozliny_attack_distant'});
export function distantMilestones(consumed={}){
  const out={};for(const [k,id]of Object.entries(MILESTONE_EVENTS))if(Number.isFinite(consumed?.[id]))out[k]=consumed[id];return out;
}

// World sectors (metres; X+ east, Z+ south). Ground: east floodplain y -5,05 (x 270…1060, every z), far plain y -1,05
// beyond x 1300, west strip y -3,75 (x -1100…-700). The west bank beyond the terrain mesh (|z| > ~300) has no rendered
// ground (heightAt -3): sources there are drawn 1 m above that height and read as flashes on the far bank in the haze.
export const DISTANT_SECTORS=freeze({
  // Lisewo floodplain far up- and downstream of the bridges (1,3-2 km), firing across the river at west-bank lines.
  // Beyond the shot ray, so it never competes with the engageable S2 dike shooters by the bridges.
  east_dike:{layer:'ambient',trigger:MILESTONE_EVENTS.train,base:.55,scan:12,minDistance:SAFE_DISTANCE.ray,kinds:{rifle:.55,mg:.30,exchange:.15},tracer:'#ff9a48',
    lines:[{shooters:box([960,1045],[-1950,-1340],-4.25),targets:box([-80,10],[-1950,-1340],-2)},
      {shooters:box([960,1045],[1400,1960],-4.25),targets:box([-80,10],[1400,1960],-2)}]},
  // S4 north perimeter (MAP.md §3, 0,8-1,5 km): Polish field works ~0,85-1,25 km from the play area and the attackers
  // ~1,2-1,5 km, firing at each other across 100-570 m.
  north_line:{layer:'presentation',trigger:MILESTONE_EVENTS.north,base:.85,scan:22,minDistance:SAFE_DISTANCE.fire,kinds:{rifle:.42,mg:.30,exchange:.12,mortar:.16},tracer:'#ffb05a',
    lines:[{shooters:box([-1080,-720],[-1450,-1250],-2.95),targets:box([-1080,-760],[-1150,-880],-3.5)},
      {shooters:box([-1080,-760],[-1150,-880],-2.95),targets:box([-1080,-720],[-1450,-1250],-3.5)}]},
  // Guns far north: a flash on the horizon, the impact on the Polish line after the flight time (or an unseen over).
  north_guns:{layer:'presentation',trigger:MILESTONE_EVENTS.north,base:.075,scan:34,minDistance:SAFE_DISTANCE.fire,kinds:{artillery:1},
    lines:[{shooters:box([-1100,-500],[-3600,-2600],2),targets:box([-1090,-740],[-1180,-760],-3.75)}]},
});
// `scan` (s) must cover the longest event a sector can start (an exchange's last reply cloud, a heavy impact's smoke),
// or an active event would drop out of activeEvents before it ends (tested). Aircraft: at most 7 elements of 3 can
// overlap, so that pool never saturates (no ship pops in mid-flight).
export const DISTANT_LIMITS=freeze({events:96,flashes:72,streaks:48,puffs:168,figures:64,aircraft:21,columns:4});

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(seed,a,b=0)=>visualNoise((seed^Math.imul(a+1,0x85ebca6b))>>>0,b);
export const sectorSeed=(seed,name)=>[...name].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),0x01000193)>>>0,seed>>>0);
const SEEDS=new Map(),seedOf=(seed,name)=>{const key=`${seed}:${name}`;let s=SEEDS.get(key);if(s===undefined)SEEDS.set(key,s=sectorSeed(seed,name));return s;};
/** Smooth 1D value noise: aperiodic, continuous and pure. */
export function noise1(seed,x){const i=Math.floor(x),f=x-i,s=f*f*(3-2*f);return lerp(visualNoise(seed,i&0x7fffffff),visualNoise(seed,(i+1)&0x7fffffff),s);}
const step=(t,at,ramp)=>Number.isFinite(at)?smooth(at,at+ramp,t):0;
const pulse=(t,at,rise,decay)=>Number.isFinite(at)&&t>=at?smooth(at,at+rise,t)*Math.exp(-Math.max(0,t-at-rise)/decay):0;

/** Authoritative phase -> sector activity (0..~1,4). An unconsumed milestone contributes nothing. */
export function sectorLevel(name,t,m){
  if(name==='east_dike'){
    let v=.30*step(t,m.train,25)+.25*step(t,m.panzerzug,30)+.20*step(t,m.bombing530,40)+.25*step(t,m.withdraw,20)+.15*step(t,m.spans,15);
    // The 06:10 blast: activity drops to 12 % for 9 s, then a surge of fire, then only sporadic shots across the water.
    if(Number.isFinite(m.eastDemolition)&&t>=m.eastDemolition){
      const a=t-m.eastDemolition;if(a<9)v*=.12;else v+=.65*Math.exp(-(a-9)/45);v*=1-.75*smooth(60,180,a);
    }
    return Math.max(0,v*(1-.5*step(t,m.westDemolition,30)));
  }
  if(name==='north_line')return step(t,m.north,45)+.55*pulse(t,m.north,3,55)+.65*step(t,m.kozliny,25)+.5*pulse(t,m.kozliny,4,80);
  if(name==='north_guns')return Number.isFinite(m.north)?.8*step(t,m.north+70,90)+.6*step(t,m.kozliny,30):0;
  return 0;
}
const ENVELOPE=Object.freeze({min:.04,max:1.6});
/**
 * Rhythm: minute-long lulls and flare-ups (97 s octave), local swells (23,7 s) and jitter (6,3 s). Incommensurate
 * octaves of value noise: never periodic, never a loop, and each sector keeps its own phase.
 */
export function sectorEnvelope(name,t,seed=DISTANT_SEED){
  const s=seedOf(seed,name);
  return clamp(.06+1.5*Math.pow(noise1(s^0x2545f491,t/97),2.2)+.45*Math.pow(noise1(s,t/23.7),1.3)+.2*noise1(s^0x5bd1e995,t/6.3),ENVELOPE.min,ENVELOPE.max);
}

export const BUCKET=.25;
const LIFE={rifle:4.6,mg:6,exchange:7.5,mortar:19,artillery:21};
const SPEED={rifle:760,mg:740,artillery:420,antitank:700};
const pick=(weights,u)=>{const entries=Object.entries(weights),total=entries.reduce((n,[,w])=>n+w,0);let acc=0;
  for(const [k,w]of entries){acc+=w/total;if(u<acc)return k;}return entries.at(-1)[0];};
const inBox=(b,u,v)=>({x:lerp(b.x[0],b.x[1],u),y:b.y,z:lerp(b.z[0],b.z[1],v)});
const span=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const heavy=kind=>kind==='mortar'||kind==='artillery';
const corners=b=>[[0,0],[0,1],[1,0],[1,1]].map(([u,v])=>inBox(b,u,v));
// Heavy impacts are spaced on impact time: a shell fired earlier can land later, so the look-back covers 0,3 s plus
// the spread of flight times between the sector's guns and targets (corners overestimate it: conservative).
const HEAVY_SPACING=.3;
const LOOKBACK=Object.freeze(Object.fromEntries(Object.entries(DISTANT_SECTORS).map(([name,sector])=>{
  let spread=0;
  if('artillery' in sector.kinds){const flights=sector.lines.flatMap(l=>corners(l.shooters).flatMap(a=>corners(l.targets).map(b=>span(a,b)/SPEED.artillery)));
    spread=Math.max(...flights)-Math.min(...flights);}
  return [name,Math.ceil((HEAVY_SPACING+spread)/BUCKET)+1];
})));

function rawBucketEvent(name,b,m,seed){
  const sector=DISTANT_SECTORS[name],s=seedOf(seed,name),t0=b*BUCKET,u=k=>rnd(s,b,k);
  // Cheap rejections first, same result: no activity, or a draw above the highest probability the envelope allows.
  const level=sectorLevel(name,t0,m),draw=u(0);
  if(!(level>0)||draw>=Math.min(.9,sector.base*level*ENVELOPE.max*BUCKET))return null;
  const p=Math.min(.9,sector.base*level*sectorEnvelope(name,t0,seed)*BUCKET);
  if(!(p>0)||draw>=p)return null;
  const kind=pick(sector.kinds,u(1)),line=sector.lines[Math.floor(u(2)*sector.lines.length)%sector.lines.length];
  const start=t0+u(3)*BUCKET,origin=inBox(line.shooters,u(4),u(5)),target=inBox(line.targets,u(6),u(7));
  const event={id:`${name}:${b}`,layer:sector.layer,source:sector.layer==='presentation'?sector.trigger:`ambient:${name}<-${sector.trigger}`,sector:name,kind,
    start,end:start+LIFE[kind],origin,target,seed:(s^Math.imul(b+1,0x9e3779b1))>>>0};
  if(kind==='mg'||kind==='exchange'){
    const rounds=4+Math.floor(u(8)*6),interval=.075+u(9)*.035,every=3+Math.floor(u(10)*3),first=Math.floor(u(11)*every);
    let at=start;event.speed=SPEED.mg;event.color=sector.tracer;
    event.shots=Array.from({length:rounds},(_,i)=>{if(i)at+=interval*(1+.2*(rnd(s,b,20+i)-.5));return {at,tracer:(i+first)%every===0};});
    if(kind==='exchange'){
      // The answer comes from the line under fire, aimed back at the burst: after the first rounds arrive, plus a human delay.
      const arrive=event.shots[0].at+span(origin,target)/SPEED.mg;
      let reply=Math.max(event.shots.at(-1).at,arrive)+.45+u(12)*1.1;const count=2+Math.floor(u(13)*4);
      event.reply={origin:inBox(line.targets,u(14),u(15)),target:{...origin},speed:SPEED.rifle,
        shots:Array.from({length:count},(_,i)=>{if(i)reply+=.18+.5*rnd(s,b,40+i);return {at:reply,tracer:false};})};
      event.end=Math.max(event.end,reply+4.6);
    }
  }else if(kind==='rifle'){
    let at=start;const count=1+Math.floor(u(8)*4),spread=8+u(9)*30;event.speed=SPEED.rifle;
    event.shots=Array.from({length:count},(_,i)=>{if(i)at+=.12+.55*rnd(s,b,20+i);return {at,tracer:false,offset:(rnd(s,b,30+i)-.5)*spread};});
  }else if(kind==='mortar'){
    // Mortars fire from out of sight: only the arrival on the opposing line is shown.
    event.origin=null;event.impact={at:start,size:.8+u(8)*.6,point:target};
  }else if(kind==='artillery'){
    const flight=span(origin,target)/SPEED.artillery;event.flash={at:start,size:1+u(8)*.7};
    event.impact=u(9)<.18?null:{at:start+flight,size:1.3+u(10)*.9,point:target};event.end=start+flight+LIFE.artillery;
  }
  return event;
}
/** The single event a sector may start in bucket b, or null. Pure: same inputs, same event. */
export function bucketEvent(name,b,m,seed=DISTANT_SEED){
  const event=rawBucketEvent(name,b,m,seed);
  // Heavy impacts never land together: an impact within 0,3 s of one started in an earlier bucket of the same sector
  // is dropped. Kept pairs are therefore always ≥0,3 s apart, whichever was fired first.
  if(event?.impact&&heavy(event.kind))for(let back=1;back<=LOOKBACK[name]&&back<=b;back++){
    const prev=rawBucketEvent(name,b-back,m,seed);if(prev?.impact&&heavy(prev.kind)&&Math.abs(prev.impact.at-event.impact.at)<HEAVY_SPACING)return null;}
  return event;
}
/** Every event active at `clock`, across sectors, oldest first and bounded. */
export function activeEvents(clock,m,seed=DISTANT_SEED){
  const out=[],last=Math.floor(clock/BUCKET);
  for(const [name,sector]of Object.entries(DISTANT_SECTORS))
    for(let b=Math.max(0,Math.floor((clock-sector.scan)/BUCKET));b<=last;b++){const e=bucketEvent(name,b,m,seed);if(e&&e.start<=clock&&clock<e.end)out.push(e);}
  return out.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id)).slice(-DISTANT_LIMITS.events);
}

// ——— Long-lived layers: squads on the far plain, the Koźliny vehicles, fire columns, distant aircraft ———
const SQUAD_BUCKET=8,SQUAD_SCAN=160;
/** Squads behind Lisewo (x ≥ 1750): reinforcements walking west until 06:10, then small groups pulling back, some with wounded. */
export function activeSquads(clock,m,seed=DISTANT_SEED){
  const s=seedOf(seed,'far_plain'),out=[];if(!Number.isFinite(m.train))return out;
  for(let b=Math.max(0,Math.floor((clock-SQUAD_SCAN)/SQUAD_BUCKET));b<=Math.floor(clock/SQUAD_BUCKET);b++){
    const t0=b*SQUAD_BUCKET,u=k=>rnd(s,b,k);if(t0<m.train)continue;
    const retreat=Number.isFinite(m.eastDemolition)&&t0>=m.eastDemolition+20,chance=retreat?.32:.42*Math.min(1,(t0-m.train)/60);
    if(u(0)>=chance)continue;
    const start=t0+u(1)*SQUAD_BUCKET,life=95+u(2)*55;if(clock<start||clock>=start+life)continue;
    const z=lerp(-850,850,u(3)),men=3+Math.floor(u(6)*4);
    out.push({id:`squad:${b}`,layer:'ambient',source:`ambient:far_plain<-${retreat?MILESTONE_EVENTS.eastDemolition:MILESTONE_EVENTS.train}`,start,end:start+life,
      from:{x:retreat?1760+u(4)*120:2550+u(4)*120,z},to:{x:retreat?2600:1780+u(5)*80,z:z+(u(8)-.5)*160},men,carried:retreat&&u(7)<.45,
      pace:retreat?1.1+u(9)*.5:1.5+u(9)*.9,seed:(s^Math.imul(b+1,0x27d4eb2d))>>>0});
  }
  return out;
}
/**
 * Figures of one squad at `clock`: bounding rushes (run, then crouch) with per-man spacing, lag and phase. The two men
 * carrying a wounded comrade share one rhythm and stay 1,2 m apart, with him between them.
 */
export function squadFigures(squad,clock){
  const age=Math.max(0,clock-squad.start),out=[],dx=squad.to.x-squad.from.x,dz=squad.to.z-squad.from.z,len=Math.hypot(dx,dz)||1,ux=dx/len,uz=dz/len;
  const place=(d,side)=>({x:squad.from.x+ux*d-uz*side,z:squad.from.z+uz*d+ux*side});
  for(let i=0;i<squad.men;i++){
    const carry=squad.carried&&i<2,k=carry?0:i,n=j=>visualNoise(squad.seed,k*7+j),cycle=6+n(0)*4,run=.62,offset=n(1)*cycle,clockIn=age+offset,phase=(clockIn%cycle)/cycle;
    // Ground is gained on the running part of each cycle only, so the group visibly rushes and stops.
    const running=c=>(Math.floor(c/cycle)*run+Math.min((c%cycle)/cycle,run))*cycle,covered=(running(clockIn)-running(offset))*squad.pace;
    const d=clamp(covered-n(3)*9,0,len),moving=phase<run||carry,slot=(k-(squad.men-1)/2)*(3.2+n(2)*2.4);
    out.push({id:`${squad.id}:${i}`,...place(d,slot+(carry?(i?.6:-.6):0)),pose:moving?'upright':'crouched',
      facing:Math.atan2(uz,ux),bob:moving&&phase<run?Math.abs(Math.sin(age*8.5+n(4)*6)):0});
  }
  if(squad.carried&&out.length>=2){const [a,b]=out;out.push({id:`${squad.id}:wounded`,x:(a.x+b.x)/2,z:(a.z+b.z)/2,pose:'carried',facing:a.facing,bob:0});}
  return out;
}
/**
 * Koźliny assault (presentation of evt_m01_kozliny_attack_distant): vehicles raise dust coming south; one is hit by an
 * anti-tank gun on the Polish line and burns. Its three shots are spaced irregularly and the hit follows the last one
 * after the shell's flight time.
 */
export function kozlinyVehicles(clock,m,seed=DISTANT_SEED){
  if(!Number.isFinite(m.kozliny)||clock<m.kozliny)return [];
  const s=seedOf(seed,'kozliny'),out=[];
  for(let i=0;i<3;i++){
    const n=k=>visualNoise(s,i*11+k),start=m.kozliny+i*(6+n(0)*9),age=clock-start;if(age<0)continue;
    const x=-1040+i*95+(n(1)-.5)*40,from=-2700-n(2)*300,stop=-1480-i*60-n(3)*80,speed=7+n(4)*3,hitAt=i===1?m.kozliny+62+n(5)*20:Infinity;
    const stopAt=Math.min(start+(stop-from)/speed,hitAt),z=from+(Math.min(clock,stopAt)-start)*speed,gun={x:-930+i*20,y:-3,z:-1010};
    let gunShots=null;
    if(Number.isFinite(hitAt)){const zHit=from+(Math.min(hitAt,stopAt)-start)*speed,last=hitAt-span(gun,{x,y:-3.75,z:zHit})/SPEED.antitank,second=last-(3.5+2*n(6));
      gunShots=[second-(3.5+2.5*n(7)),second,last];}
    out.push({id:`kozliny:${i}`,layer:'presentation',source:MILESTONE_EVENTS.kozliny,x,y:-3.75,z,from,start,stopAt,speed,moving:clock<stopAt,hitAt,
      gun,gunShots,seed:(s^Math.imul(i+1,0x9e3779b1))>>>0});
  }
  return out;
}
/** Fire/smoke columns: presentation episodes with a fixed origin and onset taken from consumed milestones (at most 3). */
export function fireColumns(clock,m,seed=DISTANT_SEED){
  const out=[],s=seedOf(seed,'columns');
  if(Number.isFinite(m.north)&&clock>=m.north+140)out.push({id:'north_farm',layer:'presentation',source:MILESTONE_EVENTS.north,x:-1035,y:-3.75,z:-1240,start:m.north+140,scale:1.15,fire:true,seed:s});
  if(Number.isFinite(m.north)&&clock>=m.north+240)out.push({id:'north_far',layer:'presentation',source:MILESTONE_EVENTS.north,x:-640,y:0,z:-3150,start:m.north+240,scale:2.2,fire:false,seed:(s^7)>>>0});
  for(const v of kozlinyVehicles(clock,m,seed))if(clock>=v.hitAt)out.push({id:`${v.id}:burning`,layer:'presentation',source:MILESTONE_EVENTS.kozliny,x:v.x,y:v.y,z:v.z,start:v.hitAt,scale:.9,fire:true,black:true,seed:v.seed});
  return out.slice(0,DISTANT_LIMITS.columns);
}
const AIR_BUCKET=20,AIR_SCAN=140,AIR_OFFSET=2700;
/**
 * Distant aircraft once the raid has been heard: elements of 1-3 aircraft far off, never over the play area. The chord's
 * closest approach to (-150, 0) is ≥2700 m; the play area reaches 606 m from that point and wingmen fly ≤68 m abreast,
 * so every aircraft stays ≥2 km from it by construction.
 */
export function distantAircraft(clock,m,seed=DISTANT_SEED){
  const out=[],s=seedOf(seed,'air');if(!Number.isFinite(m.planes))return out;
  for(let b=Math.max(0,Math.floor((clock-AIR_SCAN)/AIR_BUCKET));b<=Math.floor(clock/AIR_BUCKET);b++){
    const t0=b*AIR_BUCKET,u=k=>rnd(s,b,k);if(t0<m.planes+30||u(0)>.28)continue;
    const start=t0+u(1)*AIR_BUCKET,speed=72+u(2)*22,heading=u(3)*Math.PI*2,offset=AIR_OFFSET+u(4)*2400,alt=650+u(5)*1100,half=4200;
    if(clock<start||clock>=start+2*half/speed)continue;
    const cx=-150-Math.sin(heading)*offset,cz=Math.cos(heading)*offset,ships=1+Math.floor(u(6)*3);
    for(let i=0;i<ships;i++){
      const d=-half+(clock-start)*speed-i*(55+u(7)*40),lat=(i%2?1:-1)*Math.ceil(i/2)*(38+u(8)*30);
      out.push({id:`air:${b}:${i}`,layer:'ambient',source:`ambient:sky<-${MILESTONE_EVENTS.planes}`,x:cx+Math.cos(heading)*d-Math.sin(heading)*lat,
        y:alt+i*12,z:cz+Math.sin(heading)*d+Math.cos(heading)*lat,heading,bank:(u(9)-.5)*.2});
    }
  }
  return out.slice(0,DISTANT_LIMITS.aircraft);
}

/** Whole plan at `clock`. Camera, player and quality are deliberately not parameters. */
export function planDistantBattlefield(clock,consumed,seed=DISTANT_SEED){
  const m=distantMilestones(consumed);
  return {clock,milestones:m,events:activeEvents(clock,m,seed),squads:activeSquads(clock,m,seed),vehicles:kozlinyVehicles(clock,m,seed),
    columns:fireColumns(clock,m,seed),aircraft:distantAircraft(clock,m,seed)};
}
