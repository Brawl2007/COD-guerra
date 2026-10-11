import {MUSIC_SLOTS,VOICE_BUS_CAP,sfxVoiceCap,QUALITIES} from './constants.js';
import {VoicePool} from './pool.js';
import {MixGraph} from './mix.js';
import {BufferLoader} from './loader.js';
import {FALLBACK_LAYOUT,parseAudioLayout,loadAudioLayout,zoneAt,surfaceAt} from './layout.js';
import {NO_EMITTERS,parseAudioEmitters,loadAudioEmitters,activeEmitters} from './emitters.js';

/** Priority bands for the VOICE pool (design §2): P0 story line > P1 callout > walla. */
export const VOICE_PRIORITY=Object.freeze({walla:10,callout:50,story:100});
const STOP_FADE=.008;

/**
 * Composition root of the T06a core: mix graph, voice pools, buffer loader and the runtime audio-layout. AudioManager
 * (src/core/audio.js) owns one and delegates to it; it stays the only public entry for the game. Presentation only:
 * nothing here touches simulation state. All methods are no-ops (never throw) when no AudioContext is attached.
 */
export class AudioCore{
  constructor({quality='high',maxVoices=32,fetchImpl,baseUrl='',store}={}){
    this.quality=QUALITIES.includes(quality)?quality:'high';
    this.pool=new VoicePool({sfx:Math.min(maxVoices,sfxVoiceCap(this.quality)),voice:VOICE_BUS_CAP});
    this.loader=new BufferLoader({fetchImpl,baseUrl,store});
    this.layout=FALLBACK_LAYOUT;this.zone=FALLBACK_LAYOUT.defaultZone;this.surface=FALLBACK_LAYOUT.defaultSurface;
    this.mix=null;this.ctx=null;this.music=new Map();this.maxVoices=maxVoices;this.disposed=false;this.layoutEpoch=0;
    this.musicStarted=0;this.voicesStarted=0;this.untrack=null;this.emitters=NO_EMITTERS;this.emitterEpoch=0;
  }
  attach(ctx,{volume=.68,track=null,untrack=null}={}){
    if(this.disposed||this.mix)return this.mix;
    this.ctx=ctx;this.untrack=untrack;this.mix=new MixGraph(ctx,{quality:this.quality,volume,track});this.loader.attach(ctx);
    this.mix.setZone(this.zone);return this.mix;
  }
  setQuality(quality){
    if(!QUALITIES.includes(quality))return;
    this.quality=quality;this.pool.setCap('sfx',Math.min(this.maxVoices,sfxVoiceCap(quality)));
  }
  // ---- layout -----------------------------------------------------------
  setLayout(raw){this.layout=parseAudioLayout(raw);this._relocate();return this.layout;}
  /** Fetches audio-layout.json; any failure keeps/returns the open/earth fallback. Never rejects. */
  async loadLayout(url,fetchImpl){
    const epoch=++this.layoutEpoch,layout=await loadAudioLayout(url,fetchImpl?{fetchImpl}:{});
    if(epoch===this.layoutEpoch&&!this.disposed){this.layout=layout;this._relocate();}
    return this.layout;
  }
  _relocate(){
    this.zone=this.layout.defaultZone;this.surface=this.layout.defaultSurface;this.mix?.setZone(this.zone);
  }
  /** Per-frame listener update: allocation-free (reuses the frozen layout entries; no nodes, no automation unless the zone changes). */
  update(x,y,z){
    if(this.disposed||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))return this.zone;
    const zone=zoneAt(this.layout,x,y,z);this.surface=surfaceAt(this.layout,x,y,z);
    if(zone!==this.zone){this.zone=zone;this.mix?.setZone(zone);}
    return zone;
  }
  // ---- emitters (sectors[].audioEmitters of the mission) -------------------
  /** Accepts the mission object, a sectors array or an emitter array; malformed input yields an empty list. Never throws. */
  setEmitters(raw){this.emitterEpoch++;this.emitters=parseAudioEmitters(raw);return this.emitters;}
  async loadEmitters(url,fetchImpl){
    const epoch=++this.emitterEpoch,parsed=await loadAudioEmitters(url,fetchImpl?{fetchImpl}:{});
    if(epoch===this.emitterEpoch&&!this.disposed)this.emitters=parsed;
    return this.emitters;
  }
  /** Allocation-free when the caller reuses `out`: audible emitters at `clockSec` (casemate ckm gated on crew presence / s1 state). */
  activeEmitters(clockSec,stateOf,out=[],crewOf=null){return this.disposed?(out.length=0,out):activeEmitters(this.emitters,clockSec,stateOf,out,crewOf);}
  // ---- loading ----------------------------------------------------------
  loadManifest(raw){return this.loader.setManifest(raw);}
  // ---- VOICE bus (cap 3, priority stealing) -----------------------------
  playVoice(id,opts){
    const {priority=VOICE_PRIORITY.callout,volume=1}=opts??{};
    if(!this.mix||this.disposed)return false;
    const buffer=this.loader.get(id,{kind:'tone',durationSec:.6});if(!buffer)return false;
    if(!this.pool.admit('voice',priority,v=>this._stopEntry(v)))return false;
    const entry=this._play(buffer,this.mix.voice,volume,false);if(!entry)return false;
    entry.id=id;entry.priority=priority;entry.serial=this.pool.serial++;entry.loop=false;
    this.pool.add('voice',entry);entry.pool='voice';this.voicesStarted++;
    entry.source.onended=()=>{this.pool.delete('voice',entry);this._free(entry);};
    return true;
  }
  // ---- MUSIC bus (outside the SFX pool: 4 stems + 1 stinger) ------------
  playMusic(slot,id,opts){
    const {loop=true,volume=1,fadeIn=0}=opts??{};
    if(!this.mix||this.disposed||!MUSIC_SLOTS.includes(slot))return false;
    const buffer=this.loader.get(id,{kind:'drone'});if(!buffer)return false;
    this.stopMusic(slot,.05);
    const entry=this._play(buffer,this.mix.music,volume,loop,fadeIn);if(!entry)return false;
    entry.id=id;entry.slot=slot;this.music.set(slot,entry);this.musicStarted++;
    entry.source.onended=()=>{if(this.music.get(slot)===entry)this.music.delete(slot);this._free(entry);};
    return true;
  }
  stopMusic(slot,fade=.5){const e=this.music.get(slot);if(!e)return false;this.music.delete(slot);this._stopEntry(e,fade);return true;}
  _play(buffer,bus,volume,loop,fadeIn=0){
    const ctx=this.ctx,track=this.mix.track;
    try{
      const source=ctx.createBufferSource(),gain=ctx.createGain();
      this.mix.nodes.push(source,gain);track?.(source);track?.(gain);
      source.buffer=buffer;source.loop=loop;gain.gain.value=fadeIn>0?.0001:volume;
      if(fadeIn>0&&gain.gain.setTargetAtTime)gain.gain.setTargetAtTime(volume,ctx.currentTime,fadeIn/3);
      source.connect(gain);gain.connect(bus);source.start(ctx.currentTime);
      return {source,gain,freed:false};
    }catch{return null;}
  }
  _stopEntry(entry,fade=STOP_FADE){
    if(entry.freed)return;
    const ctx=this.ctx;
    try{
      if(entry.gain.gain.setTargetAtTime&&ctx){entry.gain.gain.cancelScheduledValues?.(ctx.currentTime);entry.gain.gain.setTargetAtTime(0,ctx.currentTime,Math.max(.002,fade/3));entry.source.stop(ctx.currentTime+fade*2+.01);}
      else{entry.source.stop?.();}
    }catch{}
    // Fake and real contexts both fire onended after stop(); `_free` is idempotent so a missing event only delays disconnection.
    if(!ctx||!entry.gain.gain.setTargetAtTime)this._free(entry);
  }
  _free(entry){
    if(entry.freed)return;entry.freed=true;entry.source.onended=null;
    for(const node of [entry.source,entry.gain]){try{node.disconnect();}catch{}}
    if(this.mix){const i=this.mix.nodes.indexOf(entry.source);if(i>=0)this.mix.nodes.splice(i,1);const j=this.mix.nodes.indexOf(entry.gain);if(j>=0)this.mix.nodes.splice(j,1);}
    this.untrack?.(2);
  }
  get diagnostics(){
    return {quality:this.quality,sfxCap:this.pool.caps.sfx,voiceCap:this.pool.caps.voice,activeVoiceLines:this.pool.count('voice'),
      voiceStolen:this.pool.stolen.voice,voiceRefused:this.pool.refused.voice,sfxStolen:this.pool.stolen.sfx,sfxRefused:this.pool.refused.sfx,
      musicSlots:[...this.music.keys()].sort(),convolvers:this.mix?.convolverCount??0,zone:this.zone.id,surface:this.surface.id,
      layoutOk:this.layout.ok,layoutIssues:this.layout.issues.length,emitters:this.emitters.emitters.length,emitterIssues:this.emitters.issues.length,loader:{...this.loader.stats,missing:this.loader.missing,entries:this.loader.entries.size}};
  }
  dispose(){
    if(this.disposed)return 0;this.disposed=true;this.layoutEpoch++;this.emitterEpoch++;
    this.loader.dispose();this.pool.clear();this.music.clear();
    const n=this.mix?this.mix.dispose():0;this.mix=null;this.ctx=null;return n;
  }
}
