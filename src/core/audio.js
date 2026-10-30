import {
  AUDIO_PRIORITY,CATEGORY_LIMITS,CATEGORY_BUS,MIX_BUSES,PHASE_ACTIVITY,DISTANT_SLOT_SEC,FIRE_SLOT_SEC,LOCOMOTIVE_IDLE_SLOT_SEC,
  JU87_BLADE_HZ,JU87_ENGINE_HZ,M01_AUDIO_EMITTERS,WEAPON_SOUND_PROFILES,
  audioHash,audioVariation,audioDistanceShape,acousticShape,presentationNoise,weaponProfileId,
  planWeaponShot,planWeaponBurst,planBulletPass,planImpact,planExplosion,planDebris,planBridgeDemolition,planDistantArtillery,
  planTrainArrival,planLocomotiveIdleTick,planJu87PullOut,planFireCrackle,planDistantBattleSlot,volleyOffsets,
  planWz29Mechanism,planPlayerHit,planLanding,planFootstep,footstepSurface,
  aircraftLayerMix,dopplerFactor,intensityWeight,m01FireEmitters,BattleIntensity,impactMaterial,
} from './battlefield-audio.js';
import { AudioCore,sfxVoiceCap } from './audio/index.js';
import { M01_STUKA_COUNT, m01StukaPosition, m01StukaSince, m01StukaActive, m01RaidPlanePosition, m01RaidSince, m01RaidPlaneActive } from '../world/m01-aircraft-path.js';

export { AUDIO_PRIORITY,audioHash,audioVariation,audioDistanceShape };
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export const AUDIO_LIMITS=Object.freeze({maxVoices:32,maxLoops:8,eventHistory:40});
const EVENT_NAME=Object.freeze({kar98k:'rifle',ally_rifle:'rifle',mg34:'mg34',rkm_wz28:'rkm',ckm_wz30:'ckm',kb_wz29:'wz29-shot'});
const NOISE_SECONDS=Object.freeze({white:2.37,brown:6.83});
const STUKA_INDEXES=Object.freeze(Array.from({length:M01_STUKA_COUNT},(_,i)=>i));   // fixed list: the 20 Hz loop update never rebuilds it
const LOOP_UPDATE_SEC=.05,AIRCRAFT_DOPPLER_MAX_MPS=500,AIRCRAFT_DOPPLER_MAX_DT=1;
const layer=(name,src,o)=>Object.freeze({name,src,...o,filter:o.filter&&Object.freeze(o.filter)});
const WIND_LAYERS=Object.freeze([layer('low','noise',{noise:'brown',rate:.8,filter:{type:'lowpass',freq:520,q:.5}}),
  layer('high','noise',{noise:'white',rate:.5,gain:.25,filter:{type:'bandpass',freq:1400,q:.6}})]);
const BED_LAYERS=Object.freeze([layer('rumble','noise',{noise:'brown',rate:.55,filter:{type:'lowpass',freq:190,q:.5}}),
  layer('crackle','noise',{noise:'white',rate:.35,gain:.08,filter:{type:'bandpass',freq:700,q:.7}})]);
const AIRCRAFT_LAYERS=Object.freeze([layer('prop','osc',{wave:'sawtooth',freq:JU87_BLADE_HZ,filter:{type:'lowpass',freq:900,q:.7}}),
  layer('engine','osc',{wave:'sawtooth',freq:JU87_ENGINE_HZ,filter:{type:'lowpass',freq:1600,q:.6}}),
  layer('engine2','osc',{wave:'sawtooth',freq:JU87_ENGINE_HZ*1.013,filter:{type:'lowpass',freq:1500,q:.6}}),
  layer('rasp','noise',{noise:'white',rate:.9,filter:{type:'bandpass',freq:950,q:.8}}),
  layer('rumble','noise',{noise:'brown',rate:.7,filter:{type:'lowpass',freq:170,q:.5}})]);
const steamLayers=boiler=>Object.freeze([layer('hiss','noise',{noise:'white',rate:.8,gain:.35,filter:{type:'bandpass',freq:3800,q:.8}}),
  layer('boiler','noise',{noise:'brown',rate:.6,filter:{type:'lowpass',freq:boiler,q:.5}})]);
const LOCOMOTIVE_LAYERS=steamLayers(140),ARMOURED_TRAIN_LAYERS=steamLayers(110);
const FIRE_LAYERS=Object.freeze([layer('roar','noise',{noise:'brown',rate:.9,filter:{type:'lowpass',freq:600,q:.6}}),
  layer('hiss','noise',{noise:'white',rate:.6,gain:.15,filter:{type:'highpass',freq:2600,q:.5}})]);
// Orçamento de fontes vivas (grãos agendados + loops): o limite de 32 vozes conta eventos, não nós.
export const SOURCE_BUDGET=Object.freeze({low:260,medium:420,high:600});
// Reserva de nós reutilizáveis (ganhos, filtros, panners): um disparo deixa de criar ~15 nós novos. As fontes (osciladores e
// buffers) são de uso único pela especificação Web Audio e continuam a ser criadas por grão.
const NODE_POOL_CAP=Object.freeze({gain:160,biquad:160,pan:64});
const GRAIN_FLOOR=6e-4;            // grãos abaixo de ~-64 dB (antes do master) não são criados: inaudíveis sob o fundo da batalha
const RELEASE_FADE=.008;           // libertação antecipada: rampa curta em vez de corte seco (sem clique)

/**
 * Apresentação sonora em Web Audio. Consome eventos já decididos pela simulação e toca planos de camadas
 * deterministas (battlefield-audio.js). Nunca altera a simulação, o RNG de jogo ou o save.
 *
 * Grafo: fonte → [filtro de forma] → envelope → voz (ar/lowpass → pan → ganho) → bus da categoria → concussão
 * (lowpass) → compressor → master. Cada voz envia ainda para uma reverberação exterior procedural (casario/rio).
 */
export class AudioManager {
  constructor({contextFactory=null,maxVoices=AUDIO_LIMITS.maxVoices,quality='high',fetchImpl,assetBaseUrl=''}={}){
    this.contextFactory=contextFactory;this._maxVoices=maxVoices;this.quality=quality;
    this.ctx=null;this.master=null;this.buses={};this.reverb=null;this.compressor=null;this.concussion=null;this.mix=null;
    this.buffers=new Map();this.volume=.68;this.busVolumes={sfx:1,voice:1,music:1};this.concussionScale=1;this.disposed=false;
    // T06a core (src/core/audio/): mix graph, voice pools (SFX 32 / 20 on low, VOICE 3), loader + synth fallback, zone layout.
    this.core=new AudioCore({quality,maxVoices,store:this.buffers,fetchImpl,baseUrl:assetBaseUrl});
    this.voices=this.core.pool.sets.sfx;this.loops=new Map();this.events=new Map();this.history=[];
    this.peakVoices=0;this.dropped=0;this.evicted=0;this.loopRefused=0;this.categoryDropped={};this.nodesCreated=0;this.nodesDisposed=0;this.serial=0;this.noiseBuffers={};
    this.fading=new Set();this.nodePool={gain:[],biquad:[],pan:[]};this.poolHits=0;this.poolMisses=0;this.liveSources=0;this.peakSources=0;this.budgetDropped=0;this.culledGrains=0;this.bursts=new Map();
    this.intensity=new BattleIntensity();this.clock=0;this.lastDuck=null;this.duck=null;
    this.occlusion=null;this.directorProbe=null;   // T06b hooks: zone occlusion for the voices the director creates, and its diagnostics
    this.presentation=this._freshPresentation(0,null);
  }
  /** Effective SFX voice cap: the configured maximum, lowered to 20 on `low` quality (AUDIO-DESIGN §2). */
  get maxVoices(){return Math.min(this._maxVoices,sfxVoiceCap(this.quality));}
  set maxVoices(value){this._maxVoices=value;this.core.pool.setCap('sfx',this.maxVoices);}
  init(){
    if(this.disposed)return false;
    if(!this.ctx){
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
      try{this.ctx=this.contextFactory?this.contextFactory():Context?new Context():null;}catch{return false;}
      if(!this.ctx)return false;
      this._buildGraph();
    }
    Promise.resolve(this.ctx.resume?.()).catch(error=>console.warn('Áudio não pôde ser ativado:',error?.message??error));
    return true;
  }
  _node(node){this.nodesCreated++;return node;}
  /** Param reposto para um valor limpo: sem automação antiga nem o alvo em cache de `_param`. */
  _fresh(param,value){
    if(!param)return;param.cancelScheduledValues?.(0);delete param._target;param.value=value;
  }
  _take(kind){
    const list=this.nodePool[kind],node=list.pop();
    if(node){this.poolHits++;return node;}
    this.poolMisses++;
    return this._node(kind==='gain'?this.ctx.createGain():kind==='biquad'?this.ctx.createBiquadFilter():this.ctx.createStereoPanner());
  }
  _takeGain(value=1){const n=this._take('gain');this._fresh(n.gain,value);return n;}
  _takeBiquad(type='lowpass',freq=1000,q=1){const n=this._take('biquad');n.type=type;this._fresh(n.frequency,freq);if(n.Q)this._fresh(n.Q,q);return n;}
  _takePanner(pan=0){const n=this._take('pan');this._fresh(n.pan,pan);return n;}
  /** Devolve um nó já desligado das suas fontes à reserva; se a reserva está cheia (ou o gestor foi libertado), é descartado. */
  _recycle(node){
    if(!node)return;
    try{node.disconnect();}catch{}
    const kind=node.frequency?'biquad':node.pan?'pan':'gain',list=this.nodePool[kind];
    if(!this.disposed&&list.length<NODE_POOL_CAP[kind]){list.push(node);return;}
    this.nodesDisposed++;
  }
  _buildGraph(){
    // Mix graph (buses -> limiter -> master -> destination), zone reverb and the SFX group buses now live in src/core/audio/mix.js.
    const mix=this.mix=this.core.attach(this.ctx,{volume:this.volume,track:()=>this.nodesCreated++,untrack:n=>{this.nodesDisposed+=n;}});
    this.master=mix.master;this.compressor=mix.limiter;this.concussion=mix.concussion;this.reverb=mix.reverbIn;
    for(const [name,v] of Object.entries(this.busVolumes))mix.setBusVolume(name,v);
    for(const name of MIX_BUSES){const bus=this._node(this.ctx.createGain());bus.gain.value=1;bus.connect(mix.sfx);this.buses[name]=bus;}
  }
  setVolume(value){this.volume=clamp(Number(value),0,1);if(this.master)this.master.gain.value=this.volume;}
  /** A qualidade escolhe a resposta da reverberação ao criar o grafo (init); depois só muda envios e detalhe dos planos. */
  setQuality(quality){if(['low','medium','high'].includes(quality)){this.quality=quality;this.core.setQuality(quality);}}
  suspend(){if(this.ctx&&this.ctx.state==='running')Promise.resolve(this.ctx.suspend?.()).catch(()=>{});}
  resume(){return this.init();}
  dispose(){
    if(this.disposed)return;this.disposed=true;this.stopAll(false);
    for(const voice of [...this.fading])this._disconnectVoice(voice,true);
    this.buffers.clear();this.noiseBuffers={};
    for(const list of Object.values(this.nodePool)){for(const node of list){try{node.disconnect();}catch{}this.nodesDisposed++;}list.length=0;}
    for(const node of Object.values(this.buses)){try{node.disconnect();}catch{}this.nodesDisposed++;}
    this.nodesDisposed+=this.core.dispose();
    this.master=this.reverb=this.concussion=this.compressor=this.mix=null;this.buses={};
    if(this.ctx)Promise.resolve(this.ctx.close?.()).catch(()=>{});this.ctx=null;
  }
  async load(name,url){
    if(!this.ctx)return false;
    try{
      const response=await fetch(url);if(!response.ok)throw new Error(`${response.status} ${url}`);
      this.buffers.set(name,await this.ctx.decodeAudioData(await response.arrayBuffer()));return true;
    }catch(error){console.warn('Áudio procedural ativo:',error.message);return false;}
  }
  get detail(){return this.quality;}
  _record(kind,{pan=0,distance=0,priority=0,key='',detail=null}={}){
    this.events.set(kind,(this.events.get(kind)??0)+1);
    const entry={kind,pan:Number(pan.toFixed?.(3)??pan),distance:Number(distance.toFixed?.(2)??distance),priority,key,detail,serial:this.serial++};
    this.history.push(entry);if(this.history.length>AUDIO_LIMITS.eventHistory)this.history.shift();return entry;
  }
  _feel(kind,distance){return this.intensity.add(this.clock,intensityWeight(kind,distance));}

  // ------------------------------------------------------------ vozes e limites
  _admit(category,priority){
    const cap=CATEGORY_LIMITS[category]??this.maxVoices;let count=0,victim=null;
    for(const v of this.voices)if(v.category===category&&!v.loop){
      count++;if(!victim||v.priority<victim.priority||(v.priority===victim.priority&&v.serial<victim.serial))victim=v;
    }
    if(count>=cap){
      if(!victim||victim.priority>priority){this.dropped++;this.categoryDropped[category]=(this.categoryDropped[category]??0)+1;return false;}
      this._release(victim,true);this.evicted++;
    }
    return this._evict(priority);
  }
  _evict(priority){
    const before=this.core.pool.stolen.sfx,ok=this.core.pool.admit('sfx',priority,victim=>this._release(victim,true));
    this.evicted+=this.core.pool.stolen.sfx-before;if(!ok)this.dropped++;return ok;
  }
  _voice({kind='fx',category='fx',priority=AUDIO_PRIORITY.impact,volume=.1,pan=0,distance=0,front=1,filter=null,loop=false}={}){
    if(!this.ctx||!this.master||this.disposed)return null;
    // Sem orçamento de fontes, só explosões, perigo e crítico entram (o resto seria mascarado por tanta actividade).
    if(!loop&&this.liveSources>=(SOURCE_BUDGET[this.quality]??SOURCE_BUDGET.high)&&priority<AUDIO_PRIORITY.explosion){this.budgetDropped++;return null;}
    if(loop?this.voices.size>=this.maxVoices:!this._admit(category,priority)){if(loop)this.loopRefused++;return null;}
    const shape=acousticShape(distance,{category,front}),ctx=this.ctx;
    const occ=this.occlusion;   // {hz,gain} while the director plays a source outside the listener's interior zone; null otherwise (unchanged path)
    const gain=this._takeGain(volume*shape.gain*(occ?occ.gain:1)),low=this._takeBiquad('lowpass',occ?Math.min(filter??shape.filter,occ.hz):filter??shape.filter,1),panner=this._takePanner(clamp(pan,-1,1));
    low.connect(panner);panner.connect(gain);gain.connect(this.buses[CATEGORY_BUS[category]??'weapons']??this.master);
    let send=null;const sendLevel=shape.send*(this.quality==='low'?.5:1);
    if(this.reverb&&sendLevel>0){send=this._takeGain(sendLevel);gain.connect(send);send.connect(this.reverb);}
    const voice={kind,category,priority,volume,pan,distance,front,shapeGain:shape.gain,serial:this.serial++,gain,filter:low,panner,send,sources:new Map(),layers:new Map(),loop,closed:false};
    this.voices.add(voice);this.peakVoices=Math.max(this.peakVoices,this.voices.size);return voice;
  }
  _attach(voice,source,nodes=[]){
    if(!voice)return false;this.nodesCreated++;voice.sources.set(source,nodes);(nodes[0]??null)?.connect?.(voice.filter);
    if(!nodes.length)source.connect(voice.filter);
    this.liveSources++;this.peakSources=Math.max(this.peakSources,this.liveSources);
    source.onended=()=>{
      if(!voice.sources.has(source))return;voice.sources.delete(source);this.liveSources--;
      this._dropSource(source,nodes);
      if(!voice.sources.size){if(voice.closed)this._disconnectVoice(voice);else if(!voice.loop)this._release(voice,false);}
    };
    return true;
  }
  /** A fonte (uso único) é descartada; os nós de envelope/filtro que a seguiam voltam à reserva. */
  _dropSource(source,nodes){
    try{source.disconnect();}catch{}this.nodesDisposed++;
    for(const node of nodes)this._recycle(node);
  }
  /**
   * Fecha uma voz: sai logo do orçamento. Com `stopSources`, faz uma rampa de ~8 ms e pára as fontes logo a seguir
   * (os nós desligam-se em onended); `fade=false` corta de imediato (dispose, contexto sem automação).
   */
  _release(voice,stopSources=false,fade=true){
    if(!voice||voice.closed)return;voice.closed=true;this.voices.delete(voice);
    for(const [key,value] of this.loops)if(value===voice)this.loops.delete(key);
    voice.layers.clear();
    if(stopSources&&voice.sources.size&&fade&&this.ctx&&voice.gain.gain.setTargetAtTime){
      const now=this.ctx.currentTime;voice.gain.gain.cancelScheduledValues?.(now);voice.gain.gain.setTargetAtTime(0,now,RELEASE_FADE);
      for(const source of voice.sources.keys()){try{source.stop(now+RELEASE_FADE*6);}catch{}}
      this.fading.add(voice);return;
    }
    if(stopSources)for(const source of voice.sources.keys()){try{source.onended=null;source.stop?.();}catch{}}
    this._disconnectVoice(voice,true);
  }
  _disconnectVoice(voice,sources=false){
    if(voice.disconnected)return;
    if(sources)for(const [source,nodes] of voice.sources){try{source.onended=null;source.stop?.();}catch{}this.liveSources--;this._dropSource(source,nodes);}
    if(sources)voice.sources.clear();if(voice.sources.size)return;
    voice.disconnected=true;this.fading.delete(voice);
    for(const node of [voice.filter,voice.panner,voice.gain,voice.send])this._recycle(node);
  }
  stopAll(fade=true){for(const voice of [...this.voices])this._release(voice,true,fade);this.loops.clear();this.bursts.clear();}
  stopTransient(){for(const voice of [...this.voices])if(!voice.loop)this._release(voice,true);}
  _noiseBuffer(type='white'){
    if(this.noiseBuffers[type]||!this.ctx)return this.noiseBuffers[type]??null;
    const rate=this.ctx.sampleRate,length=Math.max(1,Math.floor(rate*(NOISE_SECONDS[type]??2))),buffer=this.ctx.createBuffer(1,length,rate),data=buffer.getChannelData(0);
    let x=type==='brown'?0x2545f491:0x6d2b79f5,last=0;
    for(let i=0;i<length;i++){x^=x<<13;x^=x>>>17;x^=x<<5;const w=(x>>>0)/0xffffffff*2-1;
      if(type==='brown'){last=(last+.02*w)/1.02;data[i]=last*3.5;}else data[i]=w;}
    // Ruído castanho em loop sem costura: retira-se a deriva linear para o último valor encontrar o primeiro.
    if(type==='brown'&&length>1){const drift=data[length-1]-data[0]+(data[1]-data[0]);for(let i=0;i<length;i++)data[i]-=drift*i/length;}
    this.noiseBuffers[type]=buffer;return buffer;
  }
  get noiseBuffer(){return this.noiseBuffers.white??null;}
  _source(spec){
    const ctx=this.ctx;
    if(spec.src==='osc'){const o=ctx.createOscillator();o.type=spec.wave??'sine';return o;}
    const s=ctx.createBufferSource();s.buffer=this._noiseBuffer(spec.noise??'white');s.playbackRate.value=spec.rate??1;return s;
  }
  /** Filtro de um grão ou loop. `freqEnd` (+ `t`, `dur`) faz o corte descer/subir exponencialmente durante o grão: o ruído de um tiro escurece enquanto morre. */
  _shapeFilter(spec,t=0,dur=0){
    if(!spec.filter)return null;const hz=clamp(spec.filter.freq??1000,20,20000);
    const f=this._takeBiquad(spec.filter.type??'lowpass',hz,spec.filter.q??.7);
    if(Number.isFinite(spec.filter.freqEnd)&&dur>0&&f.frequency.exponentialRampToValueAtTime){
      f.frequency.setValueAtTime(hz,t);f.frequency.exponentialRampToValueAtTime(clamp(spec.filter.freqEnd,20,20000),t+dur);
    }
    return f;
  }
  /** Um grão: fonte com envelope próprio (ataque curto, decaimento exponencial), opcionalmente filtrada. */
  _grain(voice,g,t0,key){
    if(![g.at??0,g.dur??.1,g.vol??.05,g.freq??440,g.freqEnd??440].every(Number.isFinite))return true;   // entrada inválida: ignora o grão
    if((g.vol??.05)*voice.volume*voice.shapeGain<GRAIN_FLOOR){this.culledGrains++;return true;}
    const ctx=this.ctx,t=t0+Math.max(0,g.at??0),dur=Math.max(.004,g.dur??.1),src=this._source(g),filter=this._shapeFilter(g,t,dur);
    const env=this._takeGain(),attack=Math.min(g.attack??.002,dur*.5),peak=Math.max(.0002,g.vol??.05);
    env.gain.setValueAtTime(.0001,t);env.gain.exponentialRampToValueAtTime(peak,t+attack);env.gain.exponentialRampToValueAtTime(.0001,t+dur);
    if(g.src==='osc'){src.frequency.setValueAtTime(Math.max(20,g.freq??440),t);src.frequency.exponentialRampToValueAtTime(Math.max(20,g.freqEnd??g.freq??440),t+dur);}
    if(filter)src.connect(filter);(filter??src).connect(env);
    if(!this._attach(voice,src,filter?[env,filter]:[env]))return false;
    try{
      if(g.src==='osc')src.start(t);
      else{const length=src.buffer?.duration??2,offset=audioVariation(`${key}:${g.layer}:${g.at}`,0,Math.max(0,length-dur-.01));
        if(dur>length-.05)src.loop=true;src.start(t,src.loop?0:offset);}
      src.stop(t+dur+.03);
    }catch{this._release(voice,true,false);return false;}
    return true;
  }
  _playPlan(grains,{kind,category='fx',priority=AUDIO_PRIORITY.impact,pan=0,distance=0,front=1,volume=1,key='',filter=null}={}){
    if(!this.ctx||!grains?.length)return null;
    const voice=this._voice({kind,category,priority,volume,pan,distance,front,filter});if(!voice)return null;
    const t0=this.ctx.currentTime;for(const g of grains)if(voice.closed||!this._grain(voice,g,t0,key))break;
    if(!voice.closed&&!voice.sources.size)this._release(voice,false);   // todos os grãos abaixo do limiar
    return voice.closed?null:voice;
  }
  /** Abafa o fundo (longínquo/ambiente/veículos). Ducks sobrepostos: vence o mais fundo e a libertação mais tardia. */
  _duck({amount=.5,hold=.4,recover=1.2,concussion=0}={}){
    if(!this.ctx)return;const now=this.ctx.currentTime,active=this.duck&&now<this.duck.releaseAt;
    const depth=active?Math.min(amount,this.duck.amount):amount,releaseAt=Math.max(now+hold,active?this.duck.releaseAt:0),rec=Math.max(recover,active?this.duck.recover:0);
    const cut=Math.max(concussion*this.concussionScale,active?this.duck.concussion:0);
    for(const [name,scale] of [['distant',1],['ambience',1],['vehicles',.5]]){
      const p=this.buses[name]?.gain;if(!p)continue;const target=1-(1-depth)*scale;
      p.cancelScheduledValues?.(now);p.setTargetAtTime?p.setTargetAtTime(target,now,.03):(p.value=target);
      p.setTargetAtTime?.(1,releaseAt,rec/3);
    }
    // Concussão (só caminho SFX; VOICE só acima de 0,6; MUSIC nunca): lowpass exponencial, nunca reaberto a meio de uma mais funda.
    if(cut>0&&this.mix)this.mix.concussionTo(cut,now,releaseAt,rec);
    this.duck={amount:depth,releaseAt,recover:rec,concussion:cut};
    this.lastDuck={clock:this.clock,amount:Number(depth.toFixed(3)),concussion:Number(cut.toFixed(3))};
  }

  // ------------------------------------------------------------ API simples (bancada antiga e ferramentas)
  tone(freq,duration,type='square',volume=.04,slide=0,pan=0,delay=0,opts={}){
    if(!this.ctx)return false;
    return Boolean(this._playPlan([{layer:'tone',src:'osc',wave:type,freq,freqEnd:freq+slide,at:delay,dur:duration,vol:volume}],
      {kind:opts.kind??'tone',category:opts.category??'fx',priority:opts.priority??AUDIO_PRIORITY.impact,pan,distance:opts.distance??0,filter:opts.filter??null,key:`tone:${this.serial}`}));
  }
  noise(duration,volume,pan=0,delay=0,opts={}){
    if(!this.ctx)return false;
    return Boolean(this._playPlan([{layer:'noise',src:'noise',noise:opts.noise??'white',at:delay,dur:duration,vol:volume,rate:opts.rate??1}],
      {kind:opts.kind??'noise',category:opts.category??'fx',priority:opts.priority??AUDIO_PRIORITY.impact,pan,distance:opts.distance??0,filter:opts.filter??null,key:opts.key??`noise:${this.serial}`}));
  }
  channel(volume=.1,pan=0,distance=0,priority=AUDIO_PRIORITY.impact,kind='channel'){
    const voice=this._voice({kind,priority,volume,pan,distance});return voice?.filter??null;
  }
  play(name,{volume=1,pan=0,rate=1,distance=0,priority=AUDIO_PRIORITY.impact,kind=name,category='fx'}={}){
    const buffer=this.buffers.get(name);if(!this.ctx||!buffer)return false;
    const voice=this._voice({kind,category,priority,volume,pan,distance});if(!voice)return false;
    const source=this.ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;
    if(!this._attach(voice,source))return false;source.start();return true;
  }
  shot(pan=0,distant=false){return this.rifleShot(pan,distant?220:15,'generic');}
  reload(key=''){
    if(this.play('reload',{volume:.7,priority:AUDIO_PRIORITY.rifle,kind:'reload',category:'player'}))return;
    const id=key||`reload:${this.serial}`;
    this._playPlan(planWz29Mechanism('magazine',{key:id}),{kind:'reload',category:'player',priority:AUDIO_PRIORITY.rifle,key:id});
  }
  hit(key=''){
    const id=key||`hit:${this.serial}`;this._record('player-hit',{priority:AUDIO_PRIORITY.critical,key:id});
    this._playPlan(planPlayerHit({key:id}),{kind:'player-hit',category:'player',priority:AUDIO_PRIORITY.critical,key:id,filter:4200});
  }

  /**
   * The player's feet meet the ground after a fall (M01 `player-landing`, speed in m/s): a low body thud, the gear and grit of the impact and, from a hard
   * drop, a second heavier knock; a splash in the river instead of earth. Synthesised, no sample: the loudness follows the landing speed.
   */
  landing(speed=6,surface='ground',key=''){
    const s=Math.max(0,Math.min(1,(speed-2.5)/10.5)),id=key||`landing:${this.serial}`;
    this._record('player-landing',{priority:AUDIO_PRIORITY.impact,key:id,detail:{surface,speed:Number(speed.toFixed?.(2)??speed)}});
    this._playPlan(planLanding(speed,surface,{key:id}),{kind:'player-landing',category:'player',priority:AUDIO_PRIORITY.impact,key:id,volume:1+.25*s});
  }
  /**
   * Um passo do jogador sobre o material sob os pés (`surface` do audio-layout; "ground" = terra). `side` (-1/+1) desloca
   * levemente o panorama, pé esquerdo/direito. Prioridade baixa: nunca expulsa tiros nem explosões.
   */
  footstep(surface='earth',{key='',pace='walk',side=0,load=0,npc=null}={}){
    const id=key||`step:${this.serial}`,m=footstepSurface(surface);
    // An ally's step (`npc`: {distance, pan, front}) is a spatial 'foley' voice (cap 4) a little quieter than the player's own.
    const pan=npc?npc.pan:side*.1,distance=npc?npc.distance:0;
    this._record('footstep',{pan,distance,priority:AUDIO_PRIORITY.fire,key:id,detail:{surface:m,pace,npc:Boolean(npc)}});
    return this._playPlan(planFootstep(m,{key:id,pace,load}),{kind:npc?'footstep-npc':'footstep',category:npc?'foley':'player',priority:AUDIO_PRIORITY.fire,pan,distance,front:npc?.front??1,key:id,volume:npc?1.3:1.8});
  }
  // ------------------------------------------------------------ armas
  // wz.29 do jogador: mantém as camadas/tempos já estabelecidos (estalo .26, corpo 78 Hz, cauda a .15 s) e ganha corpo médio e reflexão.
  wz29Shot(pan=0,distance=0,shotKey=''){const key=shotKey||`wz29:${this.serial}`;this._record('wz29-shot',{pan,distance,priority:AUDIO_PRIORITY.rifle,key});this._feel('rifle',distance);
    this._playPlan(planWeaponShot('kb_wz29',distance,{key,detail:this.detail}),{kind:'wz29-shot',category:'player',priority:AUDIO_PRIORITY.rifle,pan,distance,key});}
  wz29Mechanism(kind,mechKey=''){
    this._record('wz29-mechanism',{priority:AUDIO_PRIORITY.rifle,key:kind,detail:kind});
    const key=mechKey||`${kind}:${this.serial}`;
    this._playPlan(planWz29Mechanism(kind,{key}),{kind:'mechanism',category:'player',priority:AUDIO_PRIORITY.rifle,key});
  }
  /**
   * Disparo/rajada de qualquer arma com perfil próprio. `distant` encaminha para o bus longínquo de baixa prioridade.
   * `source` identifica a arma que dispara (só apresentação): tiros únicos de uma arma automática que chegam em cadência
   * juntam-se à mesma voz como tiros seguintes da rajada. Cada ronda ainda cria os seus próprios grãos sonoros.
   */
  weaponFire(weapon,pan=0,distance=0,{rounds=1,interval=null,key='',front=1,distant=false,priority=null,source=null,cadenceJitter=0}={}){
    const id=weaponProfileId(weapon),p=WEAPON_SOUND_PROFILES[id],category=distant?'distant':p.category,pr=priority??(distant?AUDIO_PRIORITY.distant:AUDIO_PRIORITY[p.priority]);
    const n=clamp(Math.round(rounds)||1,1,p.family==='mg'?9:4),step=interval??p.cadence,k=key||`${id}:${this.serial}`,name=EVENT_NAME[id]??'rifle';
    this._record(name,{pan,distance,priority:pr,key:k,detail:p.family==='mg'?{weapon:id,rounds:n,interval:step}:weapon});
    this._feel(distant?'distant':p.family==='mg'?'mg':'rifle',distance);
    if(n===1&&(p.family==='mg'||id==='mp38')&&source&&this.ctx){
      const now=this.ctx.currentTime,b=this.bursts.get(source);
      if(b&&b.weapon===id&&!b.voice.closed&&now-b.at<=step*1.9+.05){
        if(this.liveSources>=(SOURCE_BUDGET[this.quality]??SOURCE_BUDGET.high)&&pr<AUDIO_PRIORITY.explosion){this.budgetDropped++;return b.voice;}
        // M02 may consume several already-fired MP38 rounds in one slow
        // render frame. Space only those real events at their authored gap;
        // never anticipate a round or alter the existing M01 MG timing.
        const at=id==='mp38'?Math.max(now,b.scheduledAt+step):now;
        b.round++;b.at=now;b.scheduledAt=at;
        const grains=planWeaponShot(id,distance,{key:b.key,round:b.round,detail:this.detail});
        for(const g of grains)if(b.voice.closed||!this._grain(b.voice,g,at,`${b.key}:${b.round}`))break;
        return b.voice.closed?null:b.voice;
      }
      const voice=this._playPlan(planWeaponShot(id,distance,{key:k,detail:this.detail}),{kind:id,category,priority:pr,pan,distance,front,key:k});
      if(voice)this.bursts.set(source,{voice,at:now,scheduledAt:now,round:0,key:k,weapon:id});else this.bursts.delete(source);
      return voice;
    }
    const grains=n>1?planWeaponBurst(id,distance,{rounds:n,interval,key:k,detail:this.detail,cadenceJitter}):planWeaponShot(id,distance,{key:k,detail:this.detail});
    return this._playPlan(grains,{kind:id,category,priority:pr,pan,distance,front,key:k});
  }
  rifleShot(pan=0,distance=0,weapon='kar98k',key='',priority=AUDIO_PRIORITY.rifle,front=1){
    return this.weaponFire(weapon,pan,distance,{key,front,distant:priority<=AUDIO_PRIORITY.distant,priority});
  }
  mg34Burst(pan=0,distance=0,rounds=1,interval=.075,key='',priority=AUDIO_PRIORITY.mg,front=1){
    return this.weaponFire('mg34',pan,distance,{rounds,interval,key,front,distant:priority<=AUDIO_PRIORITY.distant,priority});
  }
  rkmBurst(pan=0,distance=0,rounds=3,interval=.11,key='',front=1){return this.weaponFire('rkm_wz28',pan,distance,{rounds,interval,key,front});}
  ckmBurst(pan=0,distance=0,rounds=4,interval=.1,key='',front=1){return this.weaponFire('ckm_wz30',pan,distance,{rounds,interval,key,front});}
  distantFire(pan=0,distance=0,rounds=1,interval=.075){return this.mg34Burst(pan,Math.max(160,distance),rounds,interval,`distant-fire:${this.serial}`);}

  // ------------------------------------------------------------ balas e impactos
  crack(pan=0,distance=0,key='',front=1){
    const id=key||`near-miss:${this.serial}`;this._record('near-miss',{pan,distance,priority:AUDIO_PRIORITY.danger,key:id});this._feel('near-miss',0);
    this._duck({amount:.72,hold:.25,recover:.8});
    return this._playPlan(planBulletPass('crack',{key:id}),{kind:'near-miss',category:'danger',priority:AUDIO_PRIORITY.danger,pan,distance:Math.min(distance,12),front,key:id,filter:17000});
  }
  whizz(pan=0,distance=0,key='',front=1){
    const id=key||`whizz:${this.serial}`;this._record('bullet-whizz',{pan,distance,priority:AUDIO_PRIORITY.danger,key:id});
    return this._playPlan(planBulletPass('whizz',{key:id}),{kind:'bullet-whizz',category:'danger',priority:AUDIO_PRIORITY.danger-5,pan,distance:Math.min(distance,30),front,key:id});
  }
  impact(material='stone',pan=0,distance=0,key='',front=1){
    if(material==='character')return false;
    const m=impactMaterial(material),id=key||`impact:${m}:${this.serial}`;
    this._record('impact',{pan,distance,priority:AUDIO_PRIORITY.impact,key:id,detail:m});this._feel('impact',distance);
    const grains=planImpact(m,distance,{key:id});
    if(grains.some(g=>g.layer==='ricochet')){this._record('ricochet',{pan,distance,priority:AUDIO_PRIORITY.impact,key:id,detail:m});
      // Ricochete perto: a bala desviada, já a tombar e lenta, passa a zumbir (o estalo supersónico é só do tiro directo).
      if(distance<40){this._record('bullet-whizz',{pan,distance,priority:AUDIO_PRIORITY.impact,key:id});grains.push(...planBulletPass('whizz',{key:id}).map(g=>({...g,at:g.at+.03})));}}
    this._playPlan(grains,{kind:'impact-'+m,category:'impact',priority:AUDIO_PRIORITY.impact,pan,distance,front,key:id,volume:1.6});
    return true;
  }

  // ------------------------------------------------------------ explosões
  explosion(pan=0,distance=0,{scale='large',key='',front=1,material=null,concussion}={}){
    const id=key||`explosion:${this.serial}`,demolition=scale==='demolition',s=scale==='small'||demolition?scale:'large';
    this._record('explosion',{pan,distance,priority:AUDIO_PRIORITY.explosion,key:id,detail:s});this._feel(demolition?'demolition':'explosion',distance);
    if(demolition){this._record('bridge-demolition',{pan,distance,priority:AUDIO_PRIORITY.explosion,key:id});this._record('metal-stress',{pan,distance,priority:AUDIO_PRIORITY.explosion,key:id});}
    const grains=demolition?planBridgeDemolition(distance,{key:id,detail:this.detail}):planExplosion(s,distance,{key:id,detail:this.detail});
    const voice=this._playPlan(grains,{kind:demolition?'bridge-demolition':'explosion-'+s,category:'explosion',priority:AUDIO_PRIORITY.explosion,pan,distance,front,key:id});
    const debris=planDebris(s,distance,{key:id,material,detail:this.detail});
    if(debris.length){this._record('debris',{pan,distance,priority:AUDIO_PRIORITY.debris,key:id,detail:s});
      this._playPlan(debris,{kind:'debris',category:'debris',priority:AUDIO_PRIORITY.debris,pan:pan*.8,distance,front,key:id+':debris'});}
    // Sopro perto: abafa o fundo longínquo e, muito perto, "fecha" a mistura por instantes (concussão). Só apresentação.
    // `concussion` (0..1) is the strength M01's simulation gave the stun of this blast (cover and posture included): it replaces the distance rule below, so a bank or a crouch softens the ringing.
    const reach=s==='small'?45:demolition?400:160;
    if(distance<reach){const k=1-distance/reach;this._duck({amount:clamp(1-.75*k,.25,1),hold:.3+k*.9,recover:1.2+k*2,
      concussion:Number.isFinite(concussion)?clamp(concussion,0,1)*.9:distance<reach*.35?k*.9:0});}
    return voice;
  }
  bridgeDemolition(pan=0,distance=0,key='',front=1){return this.explosion(pan,distance,{scale:'demolition',key,front});}
  ju87PullOut(pan=0,distance=300,key='',front=1){
    const id=key||`ju87:${this.serial}`;this._record('ju87-pullout',{pan,distance,priority:AUDIO_PRIORITY.aircraft,key:id});
    return this._playPlan(planJu87PullOut({key:id}),{kind:'ju87-pullout',category:'aircraft',priority:AUDIO_PRIORITY.aircraft,pan,distance,front,key:id});
  }
  /** Saída de picada a partir do Ju 87 visível mais próximo (mesma trajectória do renderer), só com a formação em cena. */
  ju87PullOutNearest(clock,spatial,key='',stukas=true){
    if(!stukas)return null;let best=null;
    // Same path and anchor as the renderer: the last presented state carries the bombing anchor (game.js only passes the clock).
    const since=m01StukaSince(clock,this.presentation.aircraftState);
    for(let i=0;i<M01_STUKA_COUNT;i++){if(!m01StukaActive(since,i))continue;const p=m01StukaPosition(since,i),s=spatial(p),d=Math.hypot(s.distance,s.dy??p.y);if(!best||d<best.d)best={s,d};}
    return best?this.ju87PullOut(best.s.pan,best.d,key,best.s.front??1):null;
  }
  railClank(pan=0,distance=0,key='train963'){
    this._record('train-arrival',{pan,distance,priority:AUDIO_PRIORITY.train,key});
    return this._playPlan(planTrainArrival(distance,{key,wagons:12}),{kind:'train-arrival',category:'vehicle',priority:AUDIO_PRIORITY.train,pan,distance,key});
  }
  trainMoving(id,pan=0,distance=0,key='moving-train'){
    this._record('veh.train.rolling',{pan,distance,priority:AUDIO_PRIORITY.train,key});
    return this._playPlan(planTrainArrival(distance,{key,wagons:id==='train963'?12:6,heavy:id==='panzerzug'}),
      {kind:'veh.train.rolling',category:'vehicle',priority:AUDIO_PRIORITY.train,pan,distance,key});
  }
  panzerzugArrival(pan=0,distance=0,key='panzerzug'){
    this._record('panzerzug-arrival',{pan,distance,priority:AUDIO_PRIORITY.train,key});
    return this._playPlan(planTrainArrival(distance,{key,wagons:6,heavy:true}),{kind:'panzerzug-arrival',category:'vehicle',priority:AUDIO_PRIORITY.train,pan,distance,key});
  }
  distantBattle(kind='rifle',pan=0,distance=900,key='',{rounds=null,salvo=1,front=1}={}){
    const id=key||`battle:${kind}:${this.serial}`;this._record('distant-battle',{pan,distance,priority:AUDIO_PRIORITY.distant,key:id,detail:kind});
    if(kind==='artillery'){this._record('distant-artillery',{pan,distance,priority:AUDIO_PRIORITY.distant,key:id,detail:salvo});this._feel('artillery',distance);
      return this._playPlan(planDistantArtillery(distance,{key:id,salvo}),{kind:'distant-artillery',category:'distant',priority:AUDIO_PRIORITY.distant,pan,distance,front,key:id});}
    if(kind==='mg')return this.weaponFire('mg34',pan,Math.max(distance,500),{rounds:rounds??3,interval:.075,key:id,front,distant:true,cadenceJitter:.07});
    const n=Math.max(1,rounds??1);if(n===1)return this.weaponFire('kar98k',pan,Math.max(distance,500),{key:id,front,distant:true});
    // Salva de vários atiradores: tiros desalinhados numa só voz.
    this._feel('distant',distance);const offsets=volleyOffsets(id,n),grains=[];
    offsets.forEach((at,i)=>grains.push(...planWeaponShot(i%3===2?'ally_rifle':'kar98k',Math.max(distance,500),{key:`${id}:${i}`,at,detail:this.detail})));
    return this._playPlan(grains,{kind:'distant-volley',category:'distant',priority:AUDIO_PRIORITY.distant,pan,distance:Math.max(distance,500),front,key:id});
  }
  ambience(kind,pan=0){this.distantBattle(kind==='artillery'?'artillery':'rifle',pan,900,`legacy-ambience:${kind}:${this.serial}`);}

  // ------------------------------------------------------------ loops (vento, frente, motores, fogo)
  _startLoop(key,{kind,category='ambience',priority=AUDIO_PRIORITY.ambience,volume=.05,pan=0,distance=0,front=1,filter=null,layers=[]}){
    if(this.loops.has(key))return this.loops.get(key);
    if(this.loops.size>=AUDIO_LIMITS.maxLoops||!this.ctx)return null;
    const voice=this._voice({kind,category,priority,volume,pan,distance,front,filter,loop:true});if(!voice)return null;
    voice.gain.gain.value=.0001;   // entra em rampa pelo primeiro _setLoop (sem estalo)
    for(const layer of layers){
      const src=this._source(layer),f=this._shapeFilter(layer),g=this._takeGain(layer.gain??1);
      if(layer.src==='osc')src.frequency.value=layer.freq??90;else src.loop=true;
      if(f)src.connect(f);(f??src).connect(g);
      if(!this._attach(voice,src,f?[g,f]:[g])){this._release(voice,true);return null;}
      voice.layers.set(layer.name,{source:src,gain:g,freq:layer.freq??null,rate:layer.src==='osc'?null:layer.rate??1});
      try{src.start(this.ctx.currentTime,layer.src==='osc'?undefined:audioVariation(`${key}:${layer.name}`,0,1.5));}catch{this._release(voice,true,false);return null;}
    }
    this.loops.set(key,voice);return voice;
  }
  _stopLoop(key){const voice=this.loops.get(key);if(voice)this._release(voice,true);delete this.presentation.aircraft?.[key];}
  /** Automação suave; ignora alterações abaixo de 1 % para não encher a linha temporal do parâmetro a cada 50 ms. */
  _param(param,value,tau=.12){
    if(!param||!Number.isFinite(value))return;
    if(param._target!==undefined&&Math.abs(param._target-value)<=Math.abs(value)*.01+1e-6)return;param._target=value;
    if(param.setTargetAtTime&&this.ctx){param.cancelScheduledValues?.(this.ctx.currentTime);param.setTargetAtTime(value,this.ctx.currentTime,tau);}else param.value=value;
  }
  _setLoop(key,{pan=null,distance=null,front=1,volume=null,layers=null,pitch=null}={}){
    const voice=this.loops.get(key);if(!voice)return;
    if(pan!==null){voice.pan=pan;this._param(voice.panner.pan,clamp(pan,-1,1));}
    if(distance!==null)voice.distance=distance;if(volume!==null)voice.volume=volume;
    const shape=acousticShape(voice.distance,{category:voice.category,front});
    this._param(voice.gain.gain,voice.volume*shape.gain,.2);this._param(voice.filter.frequency,shape.filter,.2);
    if(voice.send)this._param(voice.send.gain,shape.send*(this.quality==='low'?.5:1),.3);
    if(layers)for(const [name,g] of Object.entries(layers))this._param(voice.layers.get(name)?.gain.gain,g,.25);
    if(pitch!==null)for(const layer of voice.layers.values())if(layer.freq)this._param(layer.source.frequency,layer.freq*pitch,.3);
    // Ruído em loop: a velocidade de leitura deriva ±3 % devagar, para o ciclo do buffer não se reconhecer.
    for(const [name,layer] of voice.layers)if(layer.rate)this._param(layer.source.playbackRate,layer.rate*(.97+.06*presentationNoise(`${key}:${name}`,this.clock,4.7)),.8);
  }
  _updateAircraftLoop(key,points,spatial,dt,volume){
    let best=null,panSum=0,weight=0;
    for(const point of points){const s=spatial(point),d3=Math.hypot(s.distance,s.dy??point.y??0),w=1/Math.max(30,d3);
      panSum+=(s.pan??0)*w;weight+=w;if(!best||d3<best.distance)best={distance:d3,front:s.front??1};}
    const pan=weight?panSum/weight:0,prev=this.presentation.aircraft[key],mix=aircraftLayerMix(best.distance);
    // Saltos de trajectória (troca do avião mais próximo, relógio que salta no restauro) não são velocidade: sem Doppler.
    // Os aviões voam a 140-390 m/s no stukaPath: o limite fica acima disso.
    const dd=prev!=null&&dt>0?best.distance-prev:0,pitch=dt>AIRCRAFT_DOPPLER_MAX_DT||Math.abs(dd/(dt||1))>AIRCRAFT_DOPPLER_MAX_MPS?1:dopplerFactor(dd,dt);this.presentation.aircraft[key]=best.distance;
    if(!this.loops.has(key)&&!this._startLoop(key,{kind:'aircraft-engine',category:'aircraft',priority:AUDIO_PRIORITY.aircraft,volume,pan,distance:best.distance,front:best.front,layers:AIRCRAFT_LAYERS}))return;
    this._setLoop(key,{pan,distance:best.distance,front:best.front,volume,pitch,layers:{prop:mix.prop,engine:mix.engine,engine2:mix.engine*.8,rasp:mix.rasp,rumble:mix.rumble}});
  }
  _freshPresentation(clock,state){
    const c=Math.max(0,Number(clock)||0);
    return {initialized:Boolean(state),lastBattleSlot:Math.floor(c/DISTANT_SLOT_SEC),lastIdleSlot:Math.floor(c/LOCOMOTIVE_IDLE_SLOT_SEC),lastFireSlot:Math.floor(c/FIRE_SLOT_SEC),
      lastLoopUpdate:-Infinity,train963:Boolean(state?.train963),panzerzug:Boolean(state?.panzerzug),aircraft:{},aircraftState:state,fires:[]};
  }
  resetPresentation(clock=0,state=null){
    this.stopAll();this.presentation=this._freshPresentation(clock,state);this.intensity.reset(clock);this.clock=Math.max(0,Number(clock)||0);
  }
  /**
   * Camadas contínuas e agendadas de M01, só a partir do estado de apresentação (renderState) e do relógio da simulação.
   * As janelas determinísticas não acumulam atraso: um salto de relógio considera apenas a janela actual.
   */
  updateM01Presentation({clock=0,state={},spatial=()=>({pan:0,distance:900}),phase=null,fires=null,quality=null,emitters=M01_AUDIO_EMITTERS}={}){
    if(!this.ctx||this.disposed)return;
    if(quality)this.setQuality(quality);
    this.clock=clock;const level=this.intensity.level(clock),pres=this.presentation,missionPhase=phase??'MAIN_COMBAT';pres.aircraftState=state;
    if(!pres.initialized){Object.assign(pres,this._freshPresentation(clock,state));pres.initialized=true;}
    else{
      if(!pres.train963&&state.train963){const s=spatial(emitters.locomotive);this.railClank(s.pan,s.distance,'train963-arrival');}
      if(!pres.panzerzug&&state.panzerzug){const s=spatial(emitters.panzerzug);this.panzerzugArrival(s.pan,s.distance,'panzerzug-arrival');}
    }
    pres.train963=Boolean(state.train963);pres.panzerzug=Boolean(state.panzerzug);

    const loopsDue=clock-pres.lastLoopUpdate>=LOOP_UPDATE_SEC||!this.loops.size;
    if(loopsDue){
      const loopDt=Number.isFinite(pres.lastLoopUpdate)?clock-pres.lastLoopUpdate:0;pres.lastLoopUpdate=clock;
      // Vento: ruído castanho + sopro agudo com rajadas lentas e não periódicas.
      const gust=presentationNoise('m01-wind',clock,3.1);
      if(!this.loops.has('wind'))this._startLoop('wind',{kind:'wind',volume:.032,layers:WIND_LAYERS});
      this._setLoop('wind',{volume:.022+.03*gust,layers:{high:.12+.35*gust}});
      // Frente longínqua: ribombo contínuo que cresce com a fase da missão e com a intensidade ouvida.
      const bed=.004+(PHASE_ACTIVITY[missionPhase]??.1)*.06+level*.05;
      if(!this.loops.has('battle-bed'))this._startLoop('battle-bed',{kind:'battle-bed',category:'distant',priority:AUDIO_PRIORITY.ambience,volume:bed,layers:BED_LAYERS});
      this._setLoop('battle-bed',{volume:bed*(.8+.4*presentationNoise('m01-front',clock,5.3)),layers:{crackle:.04+.12*level}});
      // Ju 87: formação de três (motor perto rasga, longe só ronca) e o avião alto do segundo raide.
      // Positions are pure functions of the bombing/raid anchors in the state (see m01-aircraft-path.js); planes that left are silent.
      const since=m01StukaSince(clock,state),flying=STUKA_INDEXES.filter(i=>m01StukaActive(since,i));
      if(state.stukas&&flying.length)this._updateAircraftLoop('aircraft',flying.map(i=>m01StukaPosition(since,i)),spatial,loopDt,.07);else this._stopLoop('aircraft');
      const raidSince=m01RaidSince(clock,state);
      if(state.secondRaid&&m01RaidPlaneActive(raidSince))this._updateAircraftLoop('aircraft-high',[m01RaidPlanePosition(raidSince)],spatial,loopDt,.06);else this._stopLoop('aircraft-high');
      // Comboios parados: vapor, ronco da caldeira.
      for(const [key,flag,heavy] of [['locomotive','train963',false],['panzerzug','panzerzug',true]]){
        if(!state[flag]){this._stopLoop(key);continue;}
        const s=spatial(emitters[key]);
        if(!this.loops.has(key))this._startLoop(key,{kind:key,category:'vehicle',priority:AUDIO_PRIORITY.train,volume:heavy?.09:.07,pan:s.pan,distance:s.distance,front:s.front??1,layers:heavy?ARMOURED_TRAIN_LAYERS:LOCOMOTIVE_LAYERS});
        this._setLoop(key,{pan:s.pan,distance:s.distance,front:s.front??1,layers:{hiss:.2+.25*presentationNoise(`${key}-hiss`,clock,2.2)}});
      }
      // Fogo: braseiro do fogo audível mais próximo.
      const fireList=(fires??m01FireEmitters(state,clock)).map(f=>({...f,s:spatial(f)})).sort((a,b)=>a.s.distance-b.s.distance);
      pres.fires=fireList.slice(0,2);
      // Histerese 200/240 m: quem pára perto do limite não liga e desliga o braseiro a cada actualização.
      const nearest=fireList[0];
      if(nearest&&nearest.s.distance<(this.loops.has('fire')?240:200)){
        if(!this.loops.has('fire'))this._startLoop('fire',{kind:'fire',category:'fire',priority:AUDIO_PRIORITY.fire,volume:.06*nearest.size,pan:nearest.s.pan,distance:nearest.s.distance,front:nearest.s.front??1,layers:FIRE_LAYERS});
        this._setLoop('fire',{pan:nearest.s.pan,distance:nearest.s.distance,front:nearest.s.front??1,volume:.06*nearest.size*(.7+.5*presentationNoise('m01-fire',clock,1.9))});
      }else this._stopLoop('fire');
    }

    // Estalidos de fogo (janela de 0,1 s), só para fogos a menos de 120 m.
    const fireSlot=Math.floor(clock/FIRE_SLOT_SEC);
    if(fireSlot>pres.lastFireSlot){pres.lastFireSlot=fireSlot;
      for(const f of pres.fires??[])if(f.s.distance<120){const grains=planFireCrackle(fireSlot,{key:f.id,size:f.size});
        if(grains.length){this._record('fire-crackle',{pan:f.s.pan,distance:f.s.distance,priority:AUDIO_PRIORITY.fire,key:`${f.id}:${fireSlot}`});
          this._playPlan(grains,{kind:'fire-crackle',category:'fire',priority:AUDIO_PRIORITY.fire,pan:f.s.pan,distance:f.s.distance,front:f.s.front??1,key:`${f.id}:${fireSlot}`});}}}
    // Locomotiva/comboio blindado parados: bomba de ar, rangidos.
    const idleSlot=Math.floor(clock/LOCOMOTIVE_IDLE_SLOT_SEC);
    if(idleSlot>pres.lastIdleSlot){pres.lastIdleSlot=idleSlot;
      for(const [key,flag,heavy] of [['locomotive','train963',false],['panzerzug','panzerzug',true]])if(state[flag]){
        const grains=planLocomotiveIdleTick(idleSlot,{key,heavy});if(!grains.length)continue;const s=spatial(emitters[key]);
        this._record('locomotive',{pan:s.pan,distance:s.distance,priority:AUDIO_PRIORITY.train,key:`${key}:${idleSlot}`});
        if(grains.some(g=>g.layer==='groan'))this._record('metal-stress',{pan:s.pan,distance:s.distance,priority:AUDIO_PRIORITY.train,key:`${key}:${idleSlot}`});
        this._playPlan(grains,{kind:`${key}-idle`,category:'vehicle',priority:AUDIO_PRIORITY.train,pan:s.pan,distance:s.distance,front:s.front??1,key:`${key}:${idleSlot}`});}}
    // Batalha longínqua: janelas irregulares pela fase e intensidade; só a janela actual após um salto.
    const slot=Math.floor(Math.max(0,clock)/DISTANT_SLOT_SEC);
    if(slot>pres.lastBattleSlot){pres.lastBattleSlot=slot;const event=planDistantBattleSlot(slot,{phase:missionPhase,intensity:level});
      if(event){const s=spatial(event.point);this.distantBattle(event.kind,s.pan,Math.max(550,s.distance),event.key,{rounds:event.rounds,salvo:event.salvo,front:s.front??1});}}
  }
  // ------------------------------------------------------------ T06a: núcleo (loader, camadas VOICE/MUSIC, zonas)
  /** Manifest-driven loader: ids missing or undecodable fall back to synthesis; never rejects. */
  loadManifest(raw){return this.core.loadManifest(raw);}
  loadAsset(id){return this.core.loader.load(id);}
  /** Runtime audio-layout.json (zones, surfaces); malformed data falls back to open/earth. Wiring from game.js is T06b. */
  setLayout(raw){return this.core.setLayout(raw);}
  loadLayout(url,fetchImpl){return this.core.loadLayout(url,fetchImpl);}
  /** Runtime `sectors[].audioEmitters` (mission object, sectors array or emitter array); malformed input -> none, never throws. */
  setEmitters(raw){return this.core.setEmitters(raw);}
  loadEmitters(url,fetchImpl){return this.core.loadEmitters(url,fetchImpl);}
  /** Audible emitters at `clockSec`; the casemate ckm needs crew presence / a non-evacuating s1 state. Reuse `out` per frame. */
  activeEmitters(clockSec,stateOf,out,crewOf){return this.core.activeEmitters(clockSec,stateOf,out,crewOf);}
  /** Allocation-free listener update: picks the reverb zone and the surface under the listener (read-only inputs). */
  setListener(x,y,z){return this.core.update(x,y,z);}
  /** T06b: occlusion ({hz,gain} or null) applied to the voices created while it is set; the director sets and clears it around one synchronous call. */
  setOcclusion(occlusion){this.occlusion=occlusion??null;}
  /** T06b: the director registers a probe so gameDiagnostics().audio.director reports its state (plain data only). */
  setDirectorProbe(probe){this.directorProbe=typeof probe==='function'?probe:null;}
  get zone(){return this.core.zone;}
  get surface(){return this.core.surface;}
  playVoice(id,opts){return this.core.playVoice(id,opts);}
  playMusic(slot,id,opts){return this.core.playMusic(slot,id,opts);}
  stopMusic(slot,fade){return this.core.stopMusic(slot,fade);}
  /** Guarda o volume do grupo (sfx/voice/music) mesmo antes do contexto existir; é aplicado ao criar o grafo. */
  setBusVolume(name,value){const v=Number(value);if(!Object.hasOwn(this.busVolumes,name)||!Number.isFinite(v))return false;this.busVolumes[name]=clamp(v,0,1);return this.mix?this.mix.setBusVolume(name,this.busVolumes[name]):false;}   // false = guardado, ainda não aplicado
  /** 1 = efeito completo de zumbido/concussão; menos reduz o corte do filtro (apenas apresentação). */
  setConcussionScale(value){const v=Number(value);if(!Number.isFinite(v))return false;this.concussionScale=clamp(v,0,1);return true;}
  get diagnostics(){
    let bytes=0;for(const b of this.buffers.values())bytes+=(b.length??0)*(b.numberOfChannels??1)*4;
    for(const b of Object.values(this.noiseBuffers))bytes+=(b.length??0)*(b.numberOfChannels??1)*4;
    let reverbBytes=0;for(const c of this.mix?.convolvers??[])if(c.buffer)reverbBytes+=(c.buffer.length??0)*(c.buffer.numberOfChannels??1)*4;
    const categories={};for(const v of this.voices)if(!v.loop)categories[v.category]=(categories[v.category]??0)+1;
    return {state:this.ctx?.state??'uninitialized',activeVoices:this.voices.size,maxVoices:this.maxVoices,peakVoices:this.peakVoices,droppedVoices:this.dropped,
      evictedVoices:this.evicted,loopRefused:this.loopRefused,fadingVoices:this.fading.size,liveSources:this.liveSources,peakSources:this.peakSources,
      sourceBudget:SOURCE_BUDGET[this.quality]??SOURCE_BUDGET.high,budgetDropped:this.budgetDropped,culledGrains:this.culledGrains,
      categoryDropped:{...this.categoryDropped},categories,categoryLimits:{...CATEGORY_LIMITS},
      loops:[...this.loops.keys()].sort(),permanentLoops:this.loops.size,buffers:this.buffers.size,proceduralBuffers:Object.keys(this.noiseBuffers).length,
      estimatedBufferBytes:bytes+reverbBytes,reverb:Boolean(this.reverb),compressor:Boolean(this.compressor),buses:Object.keys(this.buses),
      intensity:Number(this.intensity.level(this.clock).toFixed(4)),quality:this.quality,lastDuck:this.lastDuck?{...this.lastDuck}:null,
      nodePool:{idle:{gain:this.nodePool.gain.length,biquad:this.nodePool.biquad.length,pan:this.nodePool.pan.length},hits:this.poolHits,misses:this.poolMisses},
      core:this.core.diagnostics,director:this.directorProbe?.()??null,nodesCreated:this.nodesCreated,nodesDisposed:this.nodesDisposed,eventCounts:Object.fromEntries([...this.events.entries()].sort()),lastEvents:this.history.slice(-12)};
  }
}

export { AudioManager as AudioSystem };
