import {LIMITER,MAX_CONVOLVERS,OPEN_LOWPASS_HZ,VOICE_CONCUSSION_LP_HZ,VOICE_CONCUSSION_THRESHOLD,ZONE_RAMP_SEC,clamp} from './constants.js';
import {generateImpulse} from './ir.js';

/**
 * Mix graph (AUDIO-DESIGN §2). Pure Web Audio plumbing; it never reads or writes simulation state.
 *
 *   SFX group buses (owned by AudioManager) -> sfx -> zoneFilter -> concussion -> sfxDuck --+
 *   voice -> voiceFilter (2.5 kHz only when concussion > 0.6; otherwise open) --------------+-> limiter -> master -> destination
 *   music -> musicGate -> musicDuck ---------------------------------------------------------+
 *   reverbIn (per-voice sends) -> sendA -> convolver A --+-> reverbReturn -> sfx
 *                              -> sendB -> convolver B --+
 *
 * MUSIC and VOICE never pass through `concussion`; the concussion duck only touches SFX-side nodes (plus the VOICE
 * lowpass above), so music is not ducked by blasts. Music's own ducking rules are T06b (music.js).
 * Every node goes through `track` so AudioManager's nodesCreated === nodesDisposed invariant holds; `dispose()`
 * disconnects them all. Optional capabilities (DynamicsCompressor, Convolver) degrade gracefully when the context lacks them.
 */
export const ZONE_WET=Object.freeze({A:.55,B:.72,interior:.85});   // reverb return level by zone (A was the single fixed .55 before)
export class MixGraph{
  constructor(ctx,{quality='high',volume=.68,track=null}={}){
    this.ctx=ctx;this.track=track;this.nodes=[];this.disposed=false;this.zone=null;
    this.master=this._n(ctx.createGain());this.master.gain.value=volume;this.master.connect(ctx.destination);
    let out=this.master;this.limiter=null;
    if(ctx.createDynamicsCompressor){
      const c=this.limiter=this._n(ctx.createDynamicsCompressor());
      for(const [k,v] of Object.entries(LIMITER))if(c[k])c[k].value=v;
      c.connect(out);out=c;
    }
    this.limiterIn=out;
    // SFX chain
    this.sfx=this._gain(1);this.zoneFilter=this._biquad(OPEN_LOWPASS_HZ);this.concussion=this._biquad(OPEN_LOWPASS_HZ);this.sfxDuck=this._gain(1);
    this.sfx.connect(this.zoneFilter);this.zoneFilter.connect(this.concussion);this.concussion.connect(this.sfxDuck);this.sfxDuck.connect(out);
    // VOICE chain (bypasses concussion)
    this.voice=this._gain(1);this.voiceFilter=this._biquad(OPEN_LOWPASS_HZ);this.voice.connect(this.voiceFilter);this.voiceFilter.connect(out);
    // MUSIC chain (bypasses concussion and SFX ducks)
    this.music=this._gain(1);this.musicGate=this._gain(1);this.musicDuck=this._gain(1);
    this.music.connect(this.musicGate);this.musicGate.connect(this.musicDuck);this.musicDuck.connect(out);
    // Zone reverb: at most MAX_CONVOLVERS convolvers, procedural impulses, no files.
    this.reverbIn=null;this.reverbReturn=null;this.convolvers=[];this.sends={A:null,B:null};
    if(ctx.createConvolver){
      try{
        const a=this._n(ctx.createConvolver()),b=this._n(ctx.createConvolver());
        a.buffer=generateImpulse(ctx,'A',quality);b.buffer=generateImpulse(ctx,'B',quality);
        this.reverbIn=this._gain(1);this.reverbReturn=this._gain(.55);
        this.sends.A=this._gain(1);this.sends.B=this._gain(0);
        this.reverbIn.connect(this.sends.A);this.reverbIn.connect(this.sends.B);
        this.sends.A.connect(a);this.sends.B.connect(b);a.connect(this.reverbReturn);b.connect(this.reverbReturn);this.reverbReturn.connect(this.sfx);
        this.convolvers=[a,b].slice(0,MAX_CONVOLVERS);
      }catch{this.reverbIn=this.reverbReturn=null;this.convolvers=[];this.sends.A=this.sends.B=null;}
    }
  }
  _n(node){this.nodes.push(node);this.track?.(node);return node;}
  _gain(v){const g=this._n(this.ctx.createGain());g.gain.value=v;return g;}
  _biquad(freq){const f=this._n(this.ctx.createBiquadFilter());f.type='lowpass';f.frequency.value=freq;return f;}
  /** Ignores changes below 1 % so steady-state calls leave no automation events (no per-frame growth). */
  _param(param,value,tau){
    if(!param||!Number.isFinite(value))return;
    if(param._mixTarget!==undefined&&Math.abs(param._mixTarget-value)<=Math.abs(value)*.01+1e-6)return;
    param._mixTarget=value;
    if(param.setTargetAtTime){param.cancelScheduledValues?.(this.ctx.currentTime);param.setTargetAtTime(value,this.ctx.currentTime,tau);}else param.value=value;
  }
  setBusVolume(name,value){
    const node={master:this.master,sfx:this.sfx,voice:this.voice,music:this.music}[name],v=Number(value);
    if(!node||!Number.isFinite(v))return false;   // a NaN gain would throw on a real AudioParam
    node.gain.value=clamp(v,0,1);return true;
  }
  /**
   * Zone change: reverb A/B return crossfade over ~300 ms (setTargetAtTime, tau = ramp/3 reaches ~95 % in `ZONE_RAMP_SEC`)
   * and the interior lowpass when the listener is inside a zone that defines one. Allocation-free; idempotent per zone.
   */
  setZone(zone){
    if(!zone||zone===this.zone)return false;
    this.zone=zone;const tau=ZONE_RAMP_SEC/3,b=zone.reverb==='B';
    if(this.sends.A){this._param(this.sends.A.gain,b?0:1,tau);this._param(this.sends.B.gain,b?1:0,tau);}
    // Wet level per zone: the open riverbank lets sound escape (A), the steel truss rings back harder (B), and a closed interior (station) most.
    if(this.reverbReturn)this._param(this.reverbReturn.gain,zone.interiorLowpassHz!==null&&zone.interiorLowpassHz!==undefined?ZONE_WET.interior:b?ZONE_WET.B:ZONE_WET.A,tau);
    this._param(this.zoneFilter.frequency,zone.interiorLowpassHz??OPEN_LOWPASS_HZ,tau);
    return true;
  }
  /**
   * Concussion (SFX only). Exponential lowpass down to ~650 Hz at full depth, reopened after `releaseAt`. The VOICE bus
   * only gets a 2.5 kHz lowpass above VOICE_CONCUSSION_THRESHOLD; MUSIC is never touched.
   */
  concussionTo(cut,now,releaseAt,recover){
    if(!(cut>0))return;
    const f=this.concussion.frequency,low=OPEN_LOWPASS_HZ*Math.pow(650/OPEN_LOWPASS_HZ,clamp(cut,0,1));
    f.cancelScheduledValues?.(now);f.setTargetAtTime?f.setTargetAtTime(low,now,.01):(f.value=low);f.setTargetAtTime?.(OPEN_LOWPASS_HZ,releaseAt,recover/2.5);
    if(cut>VOICE_CONCUSSION_THRESHOLD){
      const v=this.voiceFilter.frequency;v.cancelScheduledValues?.(now);
      v.setTargetAtTime?v.setTargetAtTime(VOICE_CONCUSSION_LP_HZ,now,.02):(v.value=VOICE_CONCUSSION_LP_HZ);v.setTargetAtTime?.(OPEN_LOWPASS_HZ,releaseAt,recover/2.5);
    }
  }
  /** Primitives for T06b's music rules (gate and ducks); not wired to any SFX event here. */
  setMusicGate(open,fadeSec=2.5){const p=this.musicGate.gain,now=this.ctx.currentTime;p.cancelScheduledValues?.(now);p.setTargetAtTime?p.setTargetAtTime(open?1:0,now,Math.max(.01,fadeSec/3)):(p.value=open?1:0);}
  duckMusic(linear,now,releaseAt,tau=.3){const p=this.musicDuck.gain;p.cancelScheduledValues?.(now);p.setTargetAtTime?(p.setTargetAtTime(linear,now,.05),p.setTargetAtTime(1,releaseAt,tau)):(p.value=linear);}
  get convolverCount(){return this.convolvers.length;}
  /** Disconnects every node created by the graph; returns how many (for the created === disposed audit). */
  dispose(){
    if(this.disposed)return 0;this.disposed=true;let n=0;
    for(const node of this.nodes){try{node.disconnect();}catch{}n++;}
    this.nodes.length=0;this.convolvers=[];this.reverbIn=this.reverbReturn=null;this.sends.A=this.sends.B=null;return n;
  }
}
