// R4 WP-0 (2026-10-25): the act runner of M01. It owns which simulation is active and the passage from one act to the next; it never reaches inside a simulation.
//   - The current act (04:30-07:05, area BW) is M01Simulation, a closed box: created, saved (schema 2) and loaded exactly as before. With the switch off
//     (missions/m01-tczew/acts.json enabled=false, the default) the runner is not even consulted by the game: Game keeps its old lines.
//   - A new act (area NP...) is an M01AreaSimulation, saved in a schema 3 envelope {schema:3, missionId, act, carry, actSave}; the runner dispatches on `schema`
//     BEFORE any simulation sees the save, so a schema 2 save never meets the new code and a schema 3 save never meets M01Simulation.
//   - carryFrom(final simulation of an act) is a pure function: level, the events the act consumed (the world of the next act keeps the bridges as they fell),
//     the plot flags, the player's ammunition and a seed derived from the saved state without drawing from its stream.
// No renderer, no DOM, no clock.
import acts from '../../missions/m01-tczew/acts.json' with { type: 'json' };
import {M01Simulation} from './m01-simulation.js';
import {M01AreaSimulation,AREA_ACTS,validateAreaSnapshot,areaActPlan,defaultCarry} from './m01-area-sim.js';
import {M01_DIFFICULTY_IDS,M01_DIFFICULTY_SIM_DEFAULT} from './m01-difficulty.js';

export const ACT_SAVE_SCHEMA=3;
export const BW_ACT='act_bw_0430_0705';
const clone=v=>JSON.parse(JSON.stringify(v));

/** The act table (acts.json), validated once: the order starts with the current act, every entry names a known simulation, `next` follows the order. */
export function actsPlan(data=acts){
  const fail=m=>{throw new Error(`M01 acts: ${m}`);};
  if(data.missionId!=='m01_tczew'||typeof data.enabled!=='boolean')fail('missionId / enabled');
  if(!Array.isArray(data.order)||data.order[0]!==BW_ACT)fail(`order must start with ${BW_ACT}`);
  data.order.forEach((id,i)=>{const e=data.entries[id];if(!e)fail(`entry ${id}`);
    if(i===0&&e.simulation!=='M01Simulation')fail('the current act is M01Simulation');
    if(i>0&&(e.simulation!=='M01AreaSimulation'||!AREA_ACTS[id]))fail(`${id}: unknown area act`);
    if((e.next??null)!==(data.order[i+1]??null))fail(`${id}.next must be ${data.order[i+1]??null}`);});
  return Object.freeze({enabled:data.enabled,order:Object.freeze([...data.order]),entries:data.entries});
}
export const ACTS=actsPlan();
/** QA aliases for the URL (?act=vii-a). */
export const ACT_ALIASES=Object.freeze({'vii-a':'act_vii_a_north','act_vii_a_north':'act_vii_a_north','bw':BW_ACT});

/** What act a simulation is running (an M01Simulation is the current act). */
export const actOf=sim=>sim instanceof M01AreaSimulation?sim.actId:BW_ACT;

/** A seed for the next act from the saved state of the previous one, without drawing from its stream (the pattern of the current act's displaySeed). */
export const nextSeed=(state,actId)=>{let h=(state>>>0)^0x52344e50;for(const c of actId)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h>>>0;};

/** carryFrom(the last simulation of an act): what the next act inherits. Pure: reads, never writes. */
export function carryFrom(sim,nextAct){
  if(sim instanceof M01AreaSimulation)return {...clone(sim.carry),from:sim.actId,difficulty:sim.difficulty,weapon:{mag:sim.weapon.mag,reserve:sim.weapon.reserve},grenades:sim.grenades.ammo,
    seed:nextSeed(sim.rng.state,nextAct)};
  const flags={};for(const [k,v] of Object.entries(sim.flags))if(k.startsWith('m01.'))flags[k]=v;
  return {v:1,from:BW_ACT,difficulty:sim.difficulty,seed:nextSeed(sim.rng.state,nextAct),events:Object.keys(sim.consumed),flags,
    weapon:{mag:sim.weapon.mag,reserve:sim.weapon.reserve},grenades:sim.grenades.ammo};
}
/** A carry this build could have written. */
export function validateCarry(c){
  const reject=m=>{throw new Error(`Checkpoint do ato inválido: herança (${m}).`);};
  if(!c||typeof c!=='object'||c.v!==1)reject('versão');
  if(!M01_DIFFICULTY_IDS.includes(c.difficulty))reject('dificuldade');
  if(!Number.isInteger(c.seed)||c.seed<0)reject('semente');
  if(!Array.isArray(c.events)||c.events.some(id=>typeof id!=='string'||!/^evt_m01_[a-z0-9_]+$/.test(id)))reject('eventos');
  if(!c.flags||typeof c.flags!=='object'||Array.isArray(c.flags))reject('flags');
  if(!c.weapon||!Number.isInteger(c.weapon.mag)||c.weapon.mag<0||c.weapon.mag>5||!Number.isInteger(c.weapon.reserve)||c.weapon.reserve<0||c.weapon.reserve>200)reject('munição');
  if(!Number.isInteger(c.grenades)||c.grenades<0||c.grenades>9)reject('granadas');
  return c;
}

export class M01ActRunner {
  /** `enabled`: the switch (acts.json, or the QA override of the page); `startAct`: QA start directly at an act (only when enabled). */
  constructor({enabled=ACTS.enabled,startAct=null}={}){
    this.enabled=Boolean(enabled);
    this.startAct=this.enabled&&startAct&&startAct!==BW_ACT?(ACT_ALIASES[startAct]??null):null;
    if(this.startAct&&!ACTS.order.includes(this.startAct))throw new Error(`M01 acts: unknown start act ${startAct}`);
  }
  /** The first simulation of a new game. Off (or no QA start): new M01Simulation exactly as Game always made it. */
  createInitial({difficulty}={}){
    if(!this.enabled||!this.startAct)return difficulty?new M01Simulation(undefined,{difficulty}):new M01Simulation();
    const carry=defaultCarry(difficulty??M01_DIFFICULTY_SIM_DEFAULT);
    return new M01AreaSimulation(carry.seed,{difficulty:carry.difficulty,actId:this.startAct,carry});
  }
  /** The act after `sim`'s, when the switch is on and `sim` has finished; else null (the debrief follows). */
  next(sim){
    if(!this.enabled||!sim?.mission?.complete)return null;
    return ACTS.entries[actOf(sim)]?.next??null;
  }
  /** The first simulation of the act after `sim` (it starts on its entry card). */
  enter(sim){
    const id=this.next(sim);if(!id)return null;
    const carry=carryFrom(sim,id);validateCarry(carry);
    return new M01AreaSimulation(carry.seed,{difficulty:carry.difficulty,actId:id,carry});
  }
  /** What the game stores for `sim`'s checkpoint: the current act's own schema 2 checkpoint, untouched; a new act's schema 3 envelope. */
  envelope(sim){
    if(!(sim instanceof M01AreaSimulation))return sim.checkpoint;
    return {schema:ACT_SAVE_SCHEMA,missionId:'m01_tczew',act:sim.actId,carry:clone(sim.carry),actSave:clone(sim.checkpoint)};
  }
  /**
   * Opens a stored checkpoint. Schema 2 goes to a new M01Simulation's loadCheckpoint with the same text (exactly the old path). Schema 3 is checked here
   * (switch on, known act, valid carry, valid act save) before the area simulation restores it. Returns {ok, sim} or {ok:false, error}.
   */
  load(text){
    let raw;
    try{if(typeof text!=='string'||text.length>1000000)throw new Error('Ficheiro ausente ou demasiado grande.');raw=JSON.parse(text);}
    catch(error){return {ok:false,error:error.message};}
    if(raw?.schema!==ACT_SAVE_SCHEMA){const sim=new M01Simulation(),r=sim.loadCheckpoint(text);return r.ok?{ok:true,sim}:r;}
    try{
      if(!this.enabled)throw new Error('Este checkpoint pertence a um ato novo, que está desligado nesta versão.');
      const keys=Object.keys(raw).sort().join(',');if(keys!=='act,actSave,carry,missionId,schema')throw new Error('Checkpoint do ato inválido: campos.');
      if(raw.missionId!=='m01_tczew'||!ACTS.order.slice(1).includes(raw.act))throw new Error('Checkpoint do ato inválido: missão/ato.');
      validateCarry(raw.carry);validateAreaSnapshot(raw.actSave,areaActPlan(raw.act));
      if(raw.actSave.act!==raw.act)throw new Error('Checkpoint do ato inválido: ato.');
      const sim=new M01AreaSimulation(raw.carry.seed,{difficulty:raw.actSave.difficulty,actId:raw.act,carry:raw.carry});
      sim.restoreSnapshot(raw.actSave);
      return {ok:true,sim};
    }catch(error){return {ok:false,error:error.message};}
  }
}
