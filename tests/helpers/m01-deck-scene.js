// R2-b (2026-10-24): scenes for the fight for the road deck. A save of the first tick of the deck assault (evt_m01_germans_on_east_spans) of a real route of tests/helpers/m01-route.js, taken once
// per route and kept; hand-made scenes on it (a man of the assault put on a node of his path, the platoon out of the way, one German in front of the pair); a scripted shooter and the pair's
// helpers. State-level: nothing here plays a browser or a human.
import definition from '../../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {DECK_ASSAULT,deckLines} from '../../src/game/m01-deck-assault.js';
import {route} from './m01-route.js';
import {json} from './m01-determinism.js';

export const P=DECK_ASSAULT,T=P.tactics,ENTRY='evt_m01_germans_on_east_spans',BLAST='evt_m01_east_demolition';
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const load=(raw,Simulation=M01Simulation)=>{const s=new Simulation(1);s.restoreSnapshot(raw);s.drainEvents();return s;};
export const plan=f=>{const d=json(definition);f(d.groups.find(g=>g.id==='grp_de_spans').deckAssault);return d;};

class Stop extends Error{}
const entries=new Map();
/** The first tick of the deck assault of the route (seed, pilot): the control pilot never fires, the support pilot covers the deck. A save without the resume checkpoint. */
export function entry(seed=19390901,support=false){
  const key=`${seed}:${support}`;if(entries.has(key))return entries.get(key);
  let snap=null;
  try{route(seed,{support,onStep:({sim})=>{if(sim.consumedEvent(ENTRY)){snap=sim.snapshot(false);throw new Stop();}}});}catch(e){if(!(e instanceof Stop))throw e;}
  entries.set(key,snap);return snap;
}
/** A man of the assault put on node `node` of his path (the lane's z, the node's x), in `phase`, as if he had been there for `since` seconds; `lim` the node of his forward limit (a line of his). */
export function station(s,id,node,{phase='cover',since=0,until=null,lim,cooldown=60}={}){
  const a=s.actor(id),k=P.assault.indexOf(id),n=P.paths[k][node];
  Object.assign(a,{x:n.x,z:n.z,facing:Math.PI,state:'GUARD',suppressedUntil:0,cooldown});a.y=s.world.heightAt(a.x,a.z);delete a.nav;a.motion.speed=0;
  Object.assign(a.deck,{phase,node,since:s.clock-since,until:until??s.clock,pinned:0});
  if(lim!==undefined){if(lim===deckLines(a)[0])delete a.deck.lim;else a.deck.lim=lim;}
  a.ai.peek=0;a.ai.target=null;
  return a;
}
/** Everybody else of the assault out of the way (far east, in phase `clear`), so that a scene is about the men it names. */
export function isolate(s,keep){
  for(const id of P.assault)if(!keep.includes(id)){const a=s.actor(id);Object.assign(a,{x:1000,z:40,state:'GUARD',cooldown:600});a.y=0;a.deck.phase='clear';a.deck.node=0;delete a.nav;}
}
export const pair=s=>[s.actor('staszek_pawlak'),s.actor('east_platoon_voice')];
/** The platoon out of the way (it is a target and a friend in the line of fire), the Germans of the east bank out of it too (their fire at the pair, 1 km away, would pin it all the time), Kowal's rkm out of the scene, Pawlak on his feet, one German of the assault put at `at`. */
export function scene({support=false,at=[320,41.2],crouched=true,east=false}={}){
  const s=load(entry(19390901,support));
  for(const a of s.actors)if(a.group==='grp_east_platoon'||(!east&&(a.group==='grp_de_east'||a.group==='grp_mg34_loaders')))a.active=false;
  s.actor('szymon_kowal').active=false;
  const shooter=s.actor('staszek_pawlak'),t=s.actor('de_spans_4');shooter.crouched=false;
  isolate(s,['de_spans_4']);
  const put=(x,z,c=crouched)=>{Object.assign(t,{x,z,crouched:c,alive:true,health:100,state:'GUARD',suppressedUntil:0,active:true,diedAt:-1e9});t.y=s.world.heightAt(x,z);t.motion.speed=0;delete t.playerSuppressedUntil;};
  put(...at);
  return {s,shooter,t,put};
}
/** A normal draw generator (the combat AI's LCG and Box-Muller), seeded. */
export const lcg=seed=>{let st=seed>>>0;const u=()=>{st=(Math.imul(1664525,st)+1013904223)>>>0;return st/4294967296;};return ()=>{let a=0;while(a<=1e-12)a=u();return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*u());};};
/** Ticks the scene `ticks` times and returns the `npc-shot` events with a target (optionally of the men `who`); `each(s,i)` runs before every tick. */
export const shotsOf=(s,ticks,{each=()=>{},who=null}={})=>{
  const out=[];
  for(let i=0;i<ticks;i++){each(s,i);s.tick(.05);for(const e of s.drainEvents())if(e.type==='npc-shot'&&e.target&&(!who||who.includes(e.by)))out.push({by:e.by,target:e.target,at:s.clock});}
  return out;
};
/** All the events of `ticks` ticks. */
export const eventsOf=(s,ticks,{each=()=>{}}={})=>{const out=[];for(let i=0;i<ticks;i++){each(s,i);s.tick(.05);for(const e of s.drainEvents())out.push({...e,clock:s.clock});}return out;};
