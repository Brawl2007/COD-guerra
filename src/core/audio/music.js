import {MUSIC_SLOTS,clamp} from './constants.js';

/**
 * Dark adaptive music (T06b, AUDIO-DESIGN section 4). Presentation only: this module never sees a simulation object. The caller
 * (src/game/audio-director-m01.js) fills ONE reusable input record per frame from state it reads; every decision here is a pure
 * function of that record (sim clocks and consumed events, never the audio context clock, the wall clock or any random generator), so two identical
 * runs take identical decisions. The audio context clock is used only to schedule the fades of the decisions already taken.
 *
 *   input = { clock, consumed, phase, scene, complete, restoredAt, intensity }
 *     clock       simulation clock (seconds)            consumed   sim.consumed: event id -> clock it was consumed at
 *     phase       mission phase string                  scene      current scene id or null
 *     complete    mission complete                      restoredAt sim clock of the last player death restore (-Infinity: none)
 *     intensity   0..1, valid when conductor.due(clock) was true this frame (4 Hz sampling)
 *
 * Gate (silence is not intensity 0):  off | stinger-only | layers.  `stinger-only` mutes the stems but a stinger may still start;
 * `off` closes the MUSIC bus gate (2.5 s fade), cutting any stinger that is still sounding.
 *
 * NO FILES YET (T45e): a stem or stinger is started only when the loader holds a REAL decoded buffer for its id. AudioCore.playMusic
 * would otherwise start the loader's procedural drone for an unlisted id, i.e. the game would hum. With no manifest everything below
 * runs (gate, layers, stinger bookkeeping) and touches no audio node; it never throws.
 */
export const GATE_OFF='off',GATE_STINGER_ONLY='stinger-only',GATE_LAYERS='layers';
export const STINGER_SLOT='stinger';
/** Four looping stems on slots stem0..stem3 (L0 drone always when the gate is open; L1 tension; L2 muffled percussion; L3 peak). */
export const MUSIC_STEM_IDS=Object.freeze(['m01.music.drone','m01.music.strings_low','m01.music.pulse_perc','m01.music.strings_high']);
const stinger=(id,...triggers)=>Object.freeze({id,triggers:Object.freeze(triggers)});
/** One-shot themes keyed by their trigger events (consumed events are state, so a restore re-arms them for free). */
export const MUSIC_STINGERS=Object.freeze([
  stinger('m01.stinger.planes_heard','evt_m01_planes_heard','evt_m01_bombing_0434'),
  stinger('m01.stinger.east_platoon_withdraws','evt_m01_east_platoon_withdraws'),
  stinger('m01.stinger.east_demolition','evt_m01_east_demolition'),
  stinger('m01.stinger.west_demolition','evt_m01_west_demolition'),
]);
/** Provisional numbers from the design (retune at the H12 listening session, PH-A7). */
export const MUSIC_TUNING=Object.freeze({
  decisionHz:4,dwellSec:8,fadeInSec:4,fadeOutSec:6,gateFadeSec:2.5,
  on:Object.freeze([.25,.45,.70]),off:Object.freeze([.15,.30,.55]),           // hysteresis for L1, L2, L3
  afterDemolitionSec:90,stingerWindowSec:8,afterRestoredSec:20,woundedDraggedSec:30,
  stemDuck:.25,voiceDuck:.5,blastDuck:.63,blastDuckSec:1.5,nearBlastMeters:60,   // -12 dB under a stinger, -6 dB under a VOICE line, -4 dB after a near blast
  readoutBlastMeters:300,blastWeight:.3,
});
/** Sector weights for the readout intensity (design: s1, s2 1.0; s3 0.6; s4, s5 0.3). */
export const SECTOR_WEIGHTS=Object.freeze({s1_west_bridgehead:1,s2_east_bridgehead:1,s3_station_yard:.6,s4_north_perimeter:.3,s5_sky_east:.3});
const SECTOR_IDS=Object.freeze(Object.keys(SECTOR_WEIGHTS)),SECTOR_W=Object.freeze(SECTOR_IDS.map(id=>SECTOR_WEIGHTS[id]));
/** Highest layer index a phase allows: INTRO/SETUP/OUTRO stay on the drone. */
export const PHASE_LAYER_CAP=Object.freeze({INTRO:0,SETUP:0,OUTRO:0});
const EVT=Object.freeze({east:'evt_m01_east_demolition',west:'evt_m01_west_demolition',rollCall:'evt_m01_roll_call',debrief:'evt_m01_debrief',
  dragged:'evt_m01_wounded_dragged',bakWounded:'evt_m01_bak_wounded',bakRetrieved:'evt_m01_dudek_retrieves_bak'});
const BLAST_SCENES=Object.freeze(['cs_m01_east_blast','cs_m01_west_blast']);

/** A fresh input record (the director allocates one and reuses it every frame). */
export const createMusicInput=()=>({clock:0,consumed:{},phase:null,scene:null,complete:false,restoredAt:-Infinity,intensity:0});

/**
 * Hard gate, first match wins (design section 4):
 *  1. mission complete, roll call (scene or consumed event), debrief, or within 20 s after a death restore -> off
 *  2. 0..8 s after east_demolition / west_demolition -> stinger-only (the one sub hit may start); up to 90 s after -> off
 *  3. the wounded/dead scenes: wounded_dragged window, bak_wounded until dudek_retrieves_bak, the blast cutscenes (after the hit) -> off
 *  4. otherwise layers
 * Allocation-free: reads the record only.
 */
export function musicGate(input){
  const clock=input.clock,consumed=input.consumed,scene=input.scene,T=MUSIC_TUNING;
  if(input.complete===true||scene==='cs_m01_roll_call'||Object.hasOwn(consumed,EVT.rollCall)||Object.hasOwn(consumed,EVT.debrief))return GATE_OFF;
  const restored=input.restoredAt;
  if(clock>=restored&&clock-restored<T.afterRestoredSec)return GATE_OFF;
  let hit=false,silence=false;
  for(let i=0;i<2;i++){
    const key=i===0?EVT.east:EVT.west;
    if(!Object.hasOwn(consumed,key))continue;   // hasOwn first: reading the stored double would box a number every frame
    const at=consumed[key];
    if(!(clock>=at))continue;
    const age=clock-at;
    if(age<T.stingerWindowSec)hit=true;else if(age<T.afterDemolitionSec)silence=true;
  }
  if(hit)return GATE_STINGER_ONLY;   // a second hit may start inside the first silence
  if(silence)return GATE_OFF;
  if(Object.hasOwn(consumed,EVT.dragged)){const at=consumed[EVT.dragged];if(clock>=at&&clock-at<T.woundedDraggedSec)return GATE_OFF;}
  if(Object.hasOwn(consumed,EVT.bakWounded)&&!Object.hasOwn(consumed,EVT.bakRetrieved))return GATE_OFF;
  if(scene===BLAST_SCENES[0]||scene===BLAST_SCENES[1])return GATE_OFF;
  return GATE_LAYERS;
}

/**
 * `I` from a T22 battleReadout: the strongest weighted sector intensity plus 0.3 per recent blast within 300 m of the player, capped at 1.
 * A missing or malformed readout gives 0 (the caller then relies on the heard intensity and the phase). Allocation-free.
 */
export function readoutIntensity(readout,px,pz){
  const sectors=readout?.sectors;
  if(sectors===null||typeof sectors!=='object')return 0;
  const T=MUSIC_TUNING;let best=0;
  for(let i=0;i<SECTOR_IDS.length;i++){
    const e=sectors[SECTOR_IDS[i]],v=(e&&Number.isFinite(e.intensity)?e.intensity:0)*SECTOR_W[i];
    if(v>best)best=v;
  }
  const blasts=readout.recentBlasts;let n=0;
  if(Array.isArray(blasts))for(let i=0;i<blasts.length;i++){
    const b=blasts[i];if(b&&Math.hypot(b.x-px,b.z-pz)<=T.readoutBlastMeters)n++;
  }
  return clamp(best+n*T.blastWeight,0,1);
}

/**
 * Layer hysteresis. L0 is always on while the gate is open. Layer i (1..3) turns on above on[i-1] and off below off[i-1], never before
 * `dwellSec` has passed since its own last change, only on top of the layer below, and (to keep the stack contiguous without breaking its
 * dwell) only while no layer above it is on. The phase cap is the one structural exception: it drops every layer above the cap at once.
 * Pure and deterministic.
 */
export class LayerModel{
  constructor(tuning=MUSIC_TUNING){this.tuning=tuning;this.on=[true,false,false,false];this.changedAt=[-Infinity,-Infinity,-Infinity,-Infinity];this.changes=0;}
  clear(){this.on[0]=true;for(let i=1;i<4;i++){this.on[i]=false;this.changedAt[i]=-Infinity;}}
  step(clock,intensity,cap=3){
    const on=this.on,at=this.changedAt,T=this.tuning;
    for(let i=3;i>=1;i--){
      if(!on[i])continue;
      if(i>cap||(!(i<3&&on[i+1])&&intensity<T.off[i-1]&&clock-at[i]>=T.dwellSec)){on[i]=false;at[i]=clock;this.changes++;}
    }
    for(let i=1;i<4;i++){
      if(on[i]||i>cap||!on[i-1])continue;
      if(intensity>T.on[i-1]&&clock-at[i]>=T.dwellSec){on[i]=true;at[i]=clock;this.changes++;}
    }
    return on[3]?3:on[2]?2:on[1]?1:0;
  }
}

/**
 * Turns gate, layers and stingers into calls on an AudioCore (playMusic / stopMusic / mix.setMusicGate / music ducks). Everything is
 * wrapped so that a missing context, a disposed core or a hostile fake can never throw into the frame loop.
 */
export class MusicConductor{
  constructor(core,tuning=MUSIC_TUNING){
    this.core=core;this.tuning=tuning;this.model=new LayerModel(tuning);
    this.gate=GATE_LAYERS;this.gateOpen=true;this.fired=new Uint8Array(MUSIC_STINGERS.length);
    this.slot=NaN;this.lastClock=-Infinity;this.primed=false;this.disposed=false;
    this.ducked=false;this.busDuck=1;this.blastFrom=Infinity;this.blastUntil=-Infinity;
    this.opts={loop:true,volume:1,fadeIn:0};
    this.stats={stingerFired:0,stingerSkipped:0,stingerPlayed:0,stingerSilent:0,stemStarts:0,gateChanges:0,rewinds:0};
  }
  /** True when `input.clock` opens a new 4 Hz decision slot: the caller computes `input.intensity` only then (the readout allocates). Takes the record, not a number (a number argument is boxed per call). */
  due(input){return Math.floor(input.clock*this.tuning.decisionHz)!==this.slot;}
  /** Near blast heard at `heardAt` (sim clock): -4 dB for 1.5 s. The caller decides what counts as near. */
  noteBlast(heardAt){this.blastFrom=heardAt;this.blastUntil=heardAt+this.tuning.blastDuckSec;}
  /** New mission / continue / checkpoint restart: stop everything, reopen the gate, and mark stingers whose events are already consumed as fired. */
  reset(consumed){
    if(this.disposed)return;
    this._stopStems(.2);this._stop(STINGER_SLOT,.2);
    this.model.clear();this.slot=NaN;this.lastClock=-Infinity;this.blastFrom=Infinity;this.blastUntil=-Infinity;
    if(!this.gateOpen){this.gateOpen=true;this._setGate(true,.05);}
    this.gate=GATE_LAYERS;
    if(this.ducked)this.ducked=false;
    if(this.busDuck!==1){this.busDuck=1;this._setBusDuck(1);}
    for(let i=0;i<MUSIC_STINGERS.length;i++)this.fired[i]=this._triggered(MUSIC_STINGERS[i],consumed)?1:0;
  }
  /** One frame. Returns the gate. Allocation-free after construction (no objects, closures or strings are created here). */
  update(input){
    if(this.disposed)return GATE_OFF;
    const clock=input.clock;
    if(!Number.isFinite(clock))return this.gate;
    if(clock<this.lastClock-1e-6){this.model.clear();this.slot=NaN;this.blastFrom=Infinity;this.blastUntil=-Infinity;this.stats.rewinds++;}   // checkpoint restore
    this.lastClock=clock;
    if(!this.primed)this._prime();
    const gate=musicGate(input);
    this._stingers(input,gate);
    this._applyGate(gate);
    const slot=Math.floor(clock*this.tuning.decisionHz);
    if(slot!==this.slot){   // a new 4 Hz decision slot (stored only on change: a per-frame store of a number would box it)
      this.slot=slot;
      if(gate===GATE_LAYERS){
        this.model.step(clock,clamp(Number.isFinite(input.intensity)?input.intensity:0,0,1),PHASE_LAYER_CAP[input.phase]??3);
        this._syncStems();
      }
    }
    this._ducks(input);
    return gate;
  }
  // hasOwn, not `consumed[id]!==undefined`: reading the stored double would box a number on every frame (the common case is "not consumed").
  _triggered(def,consumed){
    for(let k=0;k<def.triggers.length;k++)if(Object.hasOwn(consumed,def.triggers[k]))return true;
    return false;
  }
  _stingers(input,gate){
    for(let i=0;i<MUSIC_STINGERS.length;i++){
      const def=MUSIC_STINGERS[i];
      if(!this._triggered(def,input.consumed)){this.fired[i]=0;continue;}   // never consumed, or consumed again only after a restore: armed
      if(this.fired[i]===1)continue;
      this.fired[i]=1;this.stats.stingerFired++;
      if(gate===GATE_OFF){this.stats.stingerSkipped++;continue;}   // a silence cuts the theme: do not start it
      if(!this._real(def.id)){this.stats.stingerSilent++;continue;}
      const o=this.opts;o.loop=false;o.volume=1;o.fadeIn=0;
      if(this._play(STINGER_SLOT,def.id,o))this.stats.stingerPlayed++;
    }
  }
  _applyGate(gate){
    if(gate===this.gate)return;
    this.gate=gate;this.stats.gateChanges++;
    const open=gate!==GATE_OFF,T=this.tuning;
    if(gate!==GATE_LAYERS){this.model.clear();this._stopStems(gate===GATE_OFF?T.gateFadeSec:T.fadeOutSec);}
    if(gate===GATE_OFF)this._stop(STINGER_SLOT,T.gateFadeSec);
    if(open!==this.gateOpen){this.gateOpen=open;this._setGate(open,T.gateFadeSec);}
  }
  _syncStems(){
    const on=this.model.on;
    for(let i=0;i<4;i++){
      const slot=MUSIC_SLOTS[i],playing=this.core.music.has(slot);
      if(on[i]&&!playing){
        if(!this._real(MUSIC_STEM_IDS[i]))continue;
        const o=this.opts;o.loop=true;o.volume=this.ducked?this.tuning.stemDuck:1;o.fadeIn=this.tuning.fadeInSec;
        if(this._play(slot,MUSIC_STEM_IDS[i],o))this.stats.stemStarts++;
      }else if(!on[i]&&playing)this._stop(slot,this.tuning.fadeOutSec);
    }
  }
  _stopStems(fade){
    for(let i=0;i<4;i++)if(this.core.music.has(MUSIC_SLOTS[i]))this._stop(MUSIC_SLOTS[i],fade);
  }
  _ducks(input){
    const clock=input.clock,T=this.tuning,stingerOn=this.core.music.has(STINGER_SLOT);
    if(stingerOn!==this.ducked){this.ducked=stingerOn;this._duckStems(stingerOn?T.stemDuck:1);}
    let level=1;
    if(this.core.pool.count('voice')>0)level=Math.min(level,T.voiceDuck);
    if(clock>=this.blastFrom&&clock<this.blastUntil)level=Math.min(level,T.blastDuck);
    if(level!==this.busDuck){this.busDuck=level;this._setBusDuck(level);}
  }
  _duckStems(level){
    for(let i=0;i<4;i++)this._ramp(this.core.music.get(MUSIC_SLOTS[i])?.gain?.gain,level,.15);
  }
  _setBusDuck(level){this._ramp(this.core.mix?.musicDuck?.gain,level,level<1?.05:.4);}
  _ramp(param,level,tau){
    const ctx=this.core.ctx;if(!ctx||!param)return;
    try{param.cancelScheduledValues?.(ctx.currentTime);if(param.setTargetAtTime)param.setTargetAtTime(level,ctx.currentTime,tau);else param.value=level;}catch{}
  }
  _setGate(open,fade){const mix=this.core.mix;if(mix){try{mix.setMusicGate(open,fade);}catch{}}}
  /** Preload only what the manifest lists; with no manifest nothing is requested (no 404s, no synth). */
  _prime(){
    const core=this.core;if(!core.mix||!core.loader)return;
    this.primed=true;
    for(const id of MUSIC_STEM_IDS)if(core.loader.entries.has(id))core.loader.load(id);
    for(const s of MUSIC_STINGERS)if(core.loader.entries.has(s.id))core.loader.load(s.id);
  }
  _real(id){const core=this.core;return Boolean(core.mix&&!core.disposed&&core.loader?.isReal(id));}
  // No closures anywhere on the per-frame path: a closure that captures a loop variable allocates a context object per iteration, every frame.
  _play(slot,id,opts){try{return this.core.playMusic(slot,id,opts);}catch{return false;}}
  _stop(slot,fade){try{return this.core.stopMusic(slot,fade);}catch{return false;}}
  get diagnostics(){
    return {gate:this.gate,gateOpen:this.gateOpen,layers:[...this.model.on],layerChanges:this.model.changes,fired:[...this.fired],ducked:this.ducked,busDuck:this.busDuck,
      playing:[...this.core.music.keys()].sort(),primed:this.primed,...this.stats};
  }
  dispose(){
    if(this.disposed)return;
    this._stopStems(.05);this._stop(STINGER_SLOT,.05);
    this.disposed=true;
  }
}
