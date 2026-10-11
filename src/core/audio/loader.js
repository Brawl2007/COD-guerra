import {clamp} from './constants.js';
import {acousticBand} from '../battlefield-audio.js';

/**
 * Manifest-driven buffer loader with synthesised fallback (AUDIO-DESIGN §4/§5). Contract: it NEVER throws or rejects to
 * the game. A missing file, HTTP error, network failure, decode failure, malformed manifest or unknown id all end in a
 * deterministic procedural buffer, so a sound is never muted just because an asset is absent. No downloads happen here
 * unless the caller supplies a fetch implementation and a manifest.
 * Manifest shape (per file): {id, file, tier, durationSec, channels, sampleRate, synth?:{kind, hz, durationSec}}.
 * Banded variants use ids `<base>.close|mid|distant|very-distant` (see bandedId).
 */
export const SYNTH_KINDS=Object.freeze(['burst','tone','drone']);
const MAX_ENTRIES=512,SYNTH_MIN_SEC=.05,SYNTH_MAX_SEC=8,SYNTH_CACHE_UNLISTED=32;
const fnv=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;};
const okFile=f=>typeof f==='string'&&f.length>0&&f.length<=200&&!f.includes('..')&&!/^[a-z][a-z0-9+.-]*:|^\//i.test(f);

export function parseManifest(raw){
  const entries=new Map(),issues=[];
  try{
    if(typeof raw==='string')raw=JSON.parse(raw);
    const files=Array.isArray(raw)?raw:Array.isArray(raw?.files)?raw.files:null;
    if(!files){issues.push('manifest: no files array');return {entries,issues};}
    files.slice(0,MAX_ENTRIES).forEach((e,i)=>{
      if(e===null||typeof e!=='object'||typeof e.id!=='string'||!e.id||e.id.length>96){issues.push(`files[${i}]: bad id`);return;}
      if(entries.has(e.id)){issues.push(`files[${i}] ${e.id}: duplicate id ignored`);return;}
      const hasFile=okFile(e.file);if(!hasFile)issues.push(`files[${i}] ${e.id}: bad file path, synth only`);
      const dur=Number(e.durationSec),spec=e.synth&&typeof e.synth==='object'?e.synth:{};
      entries.set(e.id,Object.freeze({
        id:e.id,file:hasFile?e.file:null,tier:Number.isInteger(e.tier)&&e.tier>=0&&e.tier<=9?e.tier:0,
        durationSec:Number.isFinite(dur)&&dur>0?dur:null,
        synth:Object.freeze({kind:SYNTH_KINDS.includes(spec.kind)?spec.kind:null,hz:Number.isFinite(spec.hz)?clamp(spec.hz,20,8000):null,
          durationSec:Number.isFinite(spec.durationSec)?spec.durationSec:null}),
      }));
    });
  }catch(error){issues.push(`manifest: ${error?.message??error}`);}
  return {entries,issues};
}

/** Deterministic procedural stand-in (seeded by the id, never Math.random). */
export function synthesize(ctx,id,{kind='burst',hz=null,durationSec=null}={}){
  const rate=ctx.sampleRate,sec=clamp(Number.isFinite(durationSec)?durationSec:kind==='drone'?4:.4,SYNTH_MIN_SEC,SYNTH_MAX_SEC);
  const length=Math.max(1,Math.floor(rate*sec)),buffer=ctx.createBuffer(1,length,rate),data=buffer.getChannelData(0);
  let x=(fnv(id)||0x9e3779b9)>>>0,lp=0;const base=hz??(kind==='drone'?55:440+(fnv(id)%7)*40);
  for(let i=0;i<length;i++){
    const t=i/rate;let v;
    if(kind==='tone')v=Math.sin(2*Math.PI*base*t)*Math.exp(-t/(sec*.5));
    else if(kind==='drone')v=(Math.sin(2*Math.PI*base*t)+.6*Math.sin(2*Math.PI*base*1.5*t))*.4;
    else{x^=x<<13;x^=x>>>17;x^=x<<5;const n=(x>>>0)/0xffffffff*2-1;lp=lp*.4+n*.6;v=lp*Math.exp(-t/(sec*.25));}
    data[i]=v*.5;
  }
  const fade=Math.min(length>>1,Math.max(1,Math.floor(rate*.01)));
  for(let i=0;i<fade;i++){const f=i/fade;data[i]*=f;data[length-1-i]*=f;}
  return buffer;
}

export class BufferLoader{
  constructor({fetchImpl=globalThis.fetch?.bind(globalThis),baseUrl='',store=new Map()}={}){
    this.fetchImpl=fetchImpl;this.baseUrl=baseUrl&&!baseUrl.endsWith('/')?baseUrl+'/':baseUrl;
    this.decoded=store;this.synth=new Map();this.entries=new Map();this.issues=[];this.status=new Map();this.pending=new Map();
    this.ctx=null;this.epoch=0;this.stats={decoded:0,synthMissing:0,synthDecode:0,synthUnlisted:0};
  }
  attach(ctx){this.ctx=ctx;}
  setManifest(raw){const m=parseManifest(raw);this.entries=m.entries;this.issues=m.issues;return m.issues.length===0;}
  /** Resolves to 'decoded' or a 'synth:*' reason. Never rejects. */
  load(id){
    if(this.decoded.has(id))return Promise.resolve('decoded');
    if(this.pending.has(id))return this.pending.get(id);
    const p=this._load(id).catch(()=>this._fallback(id,'synth:error')).finally(()=>this.pending.delete(id));
    this.pending.set(id,p);return p;
  }
  async _load(id){
    const epoch=this.epoch,entry=this.entries.get(id);
    if(!this.ctx)return 'synth:no-context';
    if(!entry)return this._fallback(id,'synth:unlisted');
    if(!entry.file)return this._fallback(id,'synth:no-file');
    if(typeof this.fetchImpl!=='function')return this._fallback(id,'synth:no-fetch');
    let bytes;
    try{
      const response=await this.fetchImpl(this.baseUrl+entry.file);
      if(!response||!response.ok)return this._fallback(id,'synth:missing');
      bytes=await response.arrayBuffer();
    }catch{return this._fallback(id,'synth:missing');}
    if(epoch!==this.epoch||!this.ctx)return 'synth:disposed';
    try{
      const buffer=await this.ctx.decodeAudioData(bytes);
      if(epoch!==this.epoch||!this.ctx)return 'synth:disposed';
      if(!buffer||!(buffer.length>0)||!Number.isFinite(buffer.duration))return this._fallback(id,'synth:decode');
      this.decoded.set(id,buffer);this.status.set(id,'decoded');this.stats.decoded++;return 'decoded';
    }catch{return epoch===this.epoch?this._fallback(id,'synth:decode'):'synth:disposed';}
  }
  _fallback(id,reason){
    this.status.set(id,reason);
    if(reason==='synth:decode')this.stats.synthDecode++;else if(reason==='synth:unlisted')this.stats.synthUnlisted++;else this.stats.synthMissing++;
    return reason;
  }
  /** Loads every manifest file of a tier (0 first). Never rejects. */
  async loadTier(tier){
    const ids=[...this.entries.values()].filter(e=>e.tier===tier).map(e=>e.id);
    const results=await Promise.all(ids.map(id=>this.load(id)));
    return {tier,requested:ids.length,decoded:results.filter(r=>r==='decoded').length,synth:results.filter(r=>r!=='decoded').length};
  }
  /** Decoded buffer if present, else the cached/generated synth stand-in; null only without a context. */
  get(id,hint=null){
    const real=this.decoded.get(id);if(real)return real;
    if(!this.ctx)return null;
    let s=this.synth.get(id);
    if(!s){
      const entry=this.entries.get(id),spec={kind:entry?.synth.kind??hint?.kind??'burst',hz:entry?.synth.hz??hint?.hz??null,
        durationSec:entry?.synth.durationSec??entry?.durationSec??hint?.durationSec??null};
      if(!entry&&this.synth.size>=SYNTH_CACHE_UNLISTED)this.synth.delete(this.synth.keys().next().value);
      try{s=synthesize(this.ctx,id,spec);}catch{return null;}
      this.synth.set(id,s);
    }
    return s;
  }
  isReal(id){return this.decoded.has(id);}
  /** `<base>.<band>` when the manifest lists that banded variant, else `<base>` (crossfades are T06b). */
  bandedId(base,distance){const id=`${base}.${acousticBand(distance)}`;return this.entries.has(id)?id:base;}
  get missing(){return [...this.status].filter(([,s])=>s!=='decoded').map(([id])=>id).sort();}
  dispose(){this.epoch++;this.ctx=null;this.decoded.clear();this.synth.clear();this.pending.clear();this.status.clear();}
}
