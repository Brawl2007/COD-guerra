const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export const AUDIO_LIMITS=Object.freeze({maxVoices:32,maxLoops:4,eventHistory:40});
export const AUDIO_PRIORITY=Object.freeze({
  ambience:10,distant:20,train:35,aircraft:40,impact:50,mg:62,rifle:66,explosion:78,danger:90,critical:100
});

export function audioHash(value){
  const text=String(value);let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
  return h>>>0;
}
export const audioVariation=(key,min=0,max=1)=>min+(audioHash(key)/0xffffffff)*(max-min);

export class AudioManager {
  constructor({contextFactory=null,maxVoices=AUDIO_LIMITS.maxVoices}={}){
    this.contextFactory=contextFactory;this.maxVoices=maxVoices;
    this.ctx=null;this.master=null;this.buffers=new Map();this.volume=.68;this.disposed=false;
    this.voices=new Set();this.loops=new Map();this.events=new Map();this.history=[];
    this.peakVoices=0;this.dropped=0;this.nodesCreated=0;this.nodesDisposed=0;this.serial=0;this.noiseBuffer=null;
    this.presentation={initialized:false,lastBattleSlot:null,train963:false,stuka:false,secondRaid:false};
  }
  init(){
    if(this.disposed)return false;
    if(!this.ctx){
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
      try{this.ctx=this.contextFactory?this.contextFactory():Context?new Context():null;}catch{return false;}
      if(!this.ctx)return false;
      this.master=this.ctx.createGain();this.nodesCreated++;this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);
    }
    Promise.resolve(this.ctx.resume?.()).catch(error=>console.warn('Áudio não pôde ser ativado:',error?.message??error));
    return true;
  }
  setVolume(value){this.volume=clamp(Number(value),0,1);if(this.master)this.master.gain.value=this.volume;}
  suspend(){if(this.ctx&&this.ctx.state==='running')Promise.resolve(this.ctx.suspend?.()).catch(()=>{});}
  resume(){return this.init();}
  dispose(){
    if(this.disposed)return;this.disposed=true;this.stopAll();
    this.buffers.clear();this.noiseBuffer=null;
    if(this.master){try{this.master.disconnect();}catch{}this.nodesDisposed++;}this.master=null;
    if(this.ctx)Promise.resolve(this.ctx.close?.()).catch(()=>{});this.ctx=null;
  }
  async load(name,url){
    if(!this.ctx)return false;
    try{
      const response=await fetch(url);if(!response.ok)throw new Error(`${response.status} ${url}`);
      this.buffers.set(name,await this.ctx.decodeAudioData(await response.arrayBuffer()));return true;
    }catch(error){console.warn('Áudio procedural ativo:',error.message);return false;}
  }
  _record(kind,{pan=0,distance=0,priority=0,key='',detail=null}={}){
    this.events.set(kind,(this.events.get(kind)??0)+1);
    const entry={kind,pan:Number(pan.toFixed?.(3)??pan),distance:Number(distance.toFixed?.(2)??distance),priority,key,detail,serial:this.serial++};
    this.history.push(entry);if(this.history.length>AUDIO_LIMITS.eventHistory)this.history.shift();return entry;
  }
  _distance(distance){
    const d=Math.max(0,Number(distance)||0);
    return {gain:1/(1+d/70),filter:clamp(18000/(1+d/95),700,18000)};
  }
  _evict(priority){
    if(this.voices.size<this.maxVoices)return true;
    let victim=null;
    for(const voice of this.voices)if(!voice.loop&&(!victim||voice.priority<victim.priority||(voice.priority===victim.priority&&voice.serial<victim.serial)))victim=voice;
    if(!victim||victim.priority>=priority){this.dropped++;return false;}
    this._release(victim,true);return true;
  }
  _voice({kind='fx',priority=AUDIO_PRIORITY.impact,volume=.1,pan=0,distance=0,filter=null,loop=false}={}){
    if(!this.ctx||!this.master||this.disposed||!this._evict(priority))return null;
    const shaping=this._distance(distance),gain=this.ctx.createGain(),low=this.ctx.createBiquadFilter(),panner=this.ctx.createStereoPanner();
    this.nodesCreated+=3;gain.gain.value=volume*shaping.gain;low.type='lowpass';low.frequency.value=filter??shaping.filter;panner.pan.value=clamp(pan,-1,1);
    low.connect(panner);panner.connect(gain);gain.connect(this.master);
    const voice={kind,priority,volume,pan,distance,serial:this.serial++,gain,filter:low,panner,sources:new Set(),loop,closed:false};
    this.voices.add(voice);this.peakVoices=Math.max(this.peakVoices,this.voices.size);return voice;
  }
  _attach(voice,source){
    if(!voice)return false;this.nodesCreated++;voice.sources.add(source);source.connect(voice.filter);
    source.onended=()=>{voice.sources.delete(source);try{source.disconnect();}catch{}this.nodesDisposed++;if(!voice.loop&&!voice.sources.size)this._release(voice,false);};
    return true;
  }
  _release(voice,stopSources=false){
    if(!voice||voice.closed)return;voice.closed=true;this.voices.delete(voice);
    if(stopSources)for(const source of voice.sources){try{source.onended=null;source.stop?.();}catch{}try{source.disconnect();}catch{}this.nodesDisposed++;}
    voice.sources.clear();
    for(const node of [voice.filter,voice.panner,voice.gain]){try{node.disconnect();}catch{}this.nodesDisposed++;}
    for(const [key,value] of this.loops)if(value===voice)this.loops.delete(key);
  }
  stopAll(){for(const voice of [...this.voices])this._release(voice,true);this.loops.clear();}
  stopTransient(){for(const voice of [...this.voices])if(!voice.loop)this._release(voice,true);}
  _ensureNoise(){
    if(this.noiseBuffer||!this.ctx)return this.noiseBuffer;
    const seconds=2,length=Math.max(1,Math.floor(this.ctx.sampleRate*seconds)),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);
    let x=0x6d2b79f5;for(let i=0;i<length;i++){x^=x<<13;x^=x>>>17;x^=x<<5;data[i]=((x>>>0)/0xffffffff*2-1);}
    this.noiseBuffer=buffer;return buffer;
  }
  _startSource(source,voice,when,duration=null,offset=0){
    if(!this._attach(voice,source))return false;
    try{duration==null?source.start(when):source.start(when,offset,duration);}catch{this._release(voice,true);return false;}return true;
  }
  tone(freq,duration,type='square',volume=.04,slide=0,pan=0,delay=0,opts={}){
    if(!this.ctx)return false;
    const voice=this._voice({kind:opts.kind??'tone',priority:opts.priority??AUDIO_PRIORITY.impact,volume,pan,distance:opts.distance??0,filter:opts.filter});
    if(!voice)return false;
    const o=this.ctx.createOscillator(),t=this.ctx.currentTime+delay;o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);
    voice.gain.gain.setValueAtTime(Math.max(.0001,voice.gain.gain.value),t);
    voice.gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    if(!this._attach(voice,o))return false;try{o.start(t);o.stop(t+duration);}catch{this._release(voice,true);return false;}return true;
  }
  noise(duration,volume,pan=0,delay=0,opts={}){
    if(!this.ctx)return false;const buffer=this._ensureNoise();if(!buffer)return false;
    const voice=this._voice({kind:opts.kind??'noise',priority:opts.priority??AUDIO_PRIORITY.impact,volume,pan,distance:opts.distance??0,filter:opts.filter});
    if(!voice)return false;
    const source=this.ctx.createBufferSource(),t=this.ctx.currentTime+delay;source.buffer=buffer;source.playbackRate.value=opts.rate??1;
    const maxOffset=Math.max(0,(buffer.duration??2)-duration-.01),offset=audioVariation(opts.key??`${voice.kind}:${voice.serial}`,0,maxOffset);
    voice.gain.gain.setValueAtTime(Math.max(.0001,voice.gain.gain.value),t);voice.gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    return this._startSource(source,voice,t,duration,offset);
  }
  channel(volume=.1,pan=0,distance=0,priority=AUDIO_PRIORITY.impact,kind='channel'){
    const voice=this._voice({kind,priority,volume,pan,distance});return voice?.filter??null;
  }
  play(name,{volume=1,pan=0,rate=1,distance=0,priority=AUDIO_PRIORITY.impact,kind=name}={}){
    const buffer=this.buffers.get(name);if(!this.ctx||!buffer)return false;
    const voice=this._voice({kind,priority,volume,pan,distance});if(!voice)return false;
    const source=this.ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;
    if(!this._attach(voice,source))return false;source.start();return true;
  }
  shot(pan=0,distant=false){return this.rifleShot(pan,distant?220:15,'generic');}
  reload(){if(!this.play('reload',{volume:.7,priority:AUDIO_PRIORITY.rifle,kind:'reload'})){for(const [delay,freq]of [[0,780],[.38,510],[.82,690],[1.2,430]])this.tone(freq,.045,'square',.025,-180,0,delay,{priority:AUDIO_PRIORITY.rifle,kind:'reload'});}}
  // Preserve the established wz.29 layer timings; the production pass changes routing/limits, not weapon cadence/gameplay.
  wz29Shot(pan=0,distance=0){const key=`wz29:${this.serial}`;this._record('wz29-shot',{pan,distance,priority:AUDIO_PRIORITY.rifle,key});
    this.noise(.26,.29,pan,0,{distance,priority:AUDIO_PRIORITY.rifle,kind:'wz29-shot',key});
    this.tone(78,.24,'triangle',.17,-34,pan,0,{distance,priority:AUDIO_PRIORITY.rifle,kind:'wz29-shot'});
    this.noise(.5,.04,pan,.15,{distance,priority:AUDIO_PRIORITY.rifle,kind:'wz29-tail',filter:5200,key:key+':tail'});}
  wz29Mechanism(kind){
    this._record('wz29-mechanism',{priority:AUDIO_PRIORITY.rifle,key:kind,detail:kind});
    if(kind==='bolt'){this.tone(620,.035,'square',.023,-260,0,.13,{priority:AUDIO_PRIORITY.rifle,kind:'mechanism'});this.noise(.06,.017,0,.44,{priority:AUDIO_PRIORITY.rifle,kind:'mechanism'});this.tone(440,.04,'square',.022,-160,0,.91,{priority:AUDIO_PRIORITY.rifle,kind:'mechanism'});}
    else if(kind==='clip'){this.tone(970,.04,'square',.017,-400,0,.25,{priority:AUDIO_PRIORITY.rifle,kind:'mechanism'});this.noise(.1,.021,0,1.15,{priority:AUDIO_PRIORITY.rifle,kind:'mechanism'});this.tone(360,.045,'square',.024,-140,0,2.8,{priority:AUDIO_PRIORITY.rifle,kind:'mechanism'});}
    else{this.tone(710,.03,'square',.014,-230,0,0,{priority:AUDIO_PRIORITY.rifle,kind:'mechanism'});this.noise(.045,.012,0,.46,{priority:AUDIO_PRIORITY.rifle,kind:'mechanism'});}
  }
  rifleShot(pan=0,distance=0,weapon='kar98k',key=''){
    const id=key||`${weapon}:${this.serial}`,v=audioVariation(id,.94,1.06);this._record('rifle',{pan,distance,priority:AUDIO_PRIORITY.rifle,key:id,detail:weapon});
    this.noise(.075,.19,pan,0,{distance,priority:AUDIO_PRIORITY.rifle,kind:'rifle-crack',filter:15000,key:id+':crack',rate:v});
    this.tone(118*v,.18,'triangle',.11,-48,pan,0,{distance,priority:AUDIO_PRIORITY.rifle,kind:'rifle-body'});
    this.noise(.34,.045,pan,.08,{distance,priority:AUDIO_PRIORITY.rifle,kind:'rifle-tail',filter:4200,key:id+':tail'});
    if(distance<90)this.tone(690*v,.032,'square',.012,-270,pan,.045,{distance,priority:AUDIO_PRIORITY.rifle,kind:'rifle-mechanism'});
  }
  mg34Burst(pan=0,distance=0,rounds=1,interval=.075,key=''){
    const n=clamp(Math.round(rounds),1,7),id=key||`mg34:${this.serial}`;this._record('mg34',{pan,distance,priority:AUDIO_PRIORITY.mg,key:id,detail:{rounds:n,interval}});
    for(let i=0;i<n;i++){const t=i*interval,v=audioVariation(id+':'+i,.95,1.05);
      this.noise(.055,.15,pan,t,{distance,priority:AUDIO_PRIORITY.mg,kind:'mg34-crack',filter:14500,key:id+':n'+i,rate:v});
      this.tone(96*v,.09,'sawtooth',.07,-34,pan,t,{distance,priority:AUDIO_PRIORITY.mg,kind:'mg34-body'});
      if(i%2===0&&distance<180)this.tone(820*v,.022,'square',.009,-320,pan,t+.018,{distance,priority:AUDIO_PRIORITY.mg,kind:'mg34-mechanism'});
    }
    this.noise(.28,.032,pan,(n-1)*interval+.05,{distance,priority:AUDIO_PRIORITY.mg,kind:'mg34-tail',filter:3600,key:id+':tail'});
  }
  rkmBurst(pan=0,distance=0,rounds=3,interval=.11,key=''){
    const n=clamp(Math.round(rounds),1,5),id=key||`rkm:${this.serial}`;this._record('rkm',{pan,distance,priority:AUDIO_PRIORITY.mg,key:id,detail:{rounds:n,interval}});
    for(let i=0;i<n;i++){const t=i*interval,v=audioVariation(id+':'+i,.94,1.04);
      this.noise(.065,.14,pan,t,{distance,priority:AUDIO_PRIORITY.mg,kind:'rkm-crack',filter:13000,key:id+':n'+i,rate:v});
      this.tone(88*v,.11,'triangle',.085,-28,pan,t,{distance,priority:AUDIO_PRIORITY.mg,kind:'rkm-body'});
    }
    this.noise(.3,.03,pan,n*interval,{distance,priority:AUDIO_PRIORITY.mg,kind:'rkm-tail',filter:3200,key:id+':tail'});
  }
  ckmBurst(pan=0,distance=0,rounds=4,interval=.1,key=''){
    const n=clamp(Math.round(rounds),1,8),id=key||`ckm:${this.serial}`;this._record('ckm',{pan,distance,priority:AUDIO_PRIORITY.mg,key:id,detail:{rounds:n,interval}});
    for(let i=0;i<n;i++){const t=i*interval,v=audioVariation(id+':'+i,.96,1.03);
      this.noise(.07,.17,pan,t,{distance,priority:AUDIO_PRIORITY.mg,kind:'ckm-crack',filter:11800,key:id+':n'+i,rate:v});
      this.tone(72*v,.14,'triangle',.105,-20,pan,t,{distance,priority:AUDIO_PRIORITY.mg,kind:'ckm-body'});
      if(i%2===1)this.tone(560*v,.028,'square',.01,-180,pan,t+.02,{distance,priority:AUDIO_PRIORITY.mg,kind:'ckm-mechanism'});
    }
    this.noise(.36,.04,pan,n*interval,{distance,priority:AUDIO_PRIORITY.mg,kind:'ckm-tail',filter:2900,key:id+':tail'});
  }
  distantFire(pan=0,distance=0,rounds=1,interval=.075){this.mg34Burst(pan,Math.max(160,distance),rounds,interval,`distant-fire:${this.serial}`);}
  crack(pan=0,distance=0,key=''){
    const id=key||`near-miss:${this.serial}`;this._record('near-miss',{pan,distance,priority:AUDIO_PRIORITY.danger,key:id});
    this.tone(2600,.022,'square',.055,-2050,pan,0,{distance:Math.min(distance,12),priority:AUDIO_PRIORITY.danger,kind:'near-miss-crack',filter:17000});
    this.noise(.045,.065,pan,.006,{distance:Math.min(distance,12),priority:AUDIO_PRIORITY.danger,kind:'near-miss-whip',filter:12500,key:id});
  }
  impact(material='stone',pan=0,distance=0,key=''){
    if(material==='character')return false;
    const m=['earth','wood','metal','stone','brick'].includes(material)?material:'stone',id=key||`impact:${m}:${this.serial}`;
    this._record('impact',{pan,distance,priority:AUDIO_PRIORITY.impact,key:id,detail:m});
    if(m==='metal'){this.tone(1850,.11,'square',.055,-850,pan,0,{distance,priority:AUDIO_PRIORITY.impact,kind:'impact-metal'});this.noise(.055,.035,pan,0,{distance,priority:AUDIO_PRIORITY.impact,kind:'impact-metal',filter:10500,key:id});}
    else if(m==='wood'){this.noise(.095,.065,pan,0,{distance,priority:AUDIO_PRIORITY.impact,kind:'impact-wood',filter:6200,key:id});this.tone(230,.08,'triangle',.035,-80,pan,0,{distance,priority:AUDIO_PRIORITY.impact,kind:'impact-wood'});}
    else if(m==='earth'){this.noise(.14,.06,pan,0,{distance,priority:AUDIO_PRIORITY.impact,kind:'impact-earth',filter:2600,key:id});this.tone(92,.11,'triangle',.03,-30,pan,0,{distance,priority:AUDIO_PRIORITY.impact,kind:'impact-earth'});}
    else{this.noise(.09,.055,pan,0,{distance,priority:AUDIO_PRIORITY.impact,kind:'impact-stone',filter:7600,key:id});this.tone(410,.075,'square',.026,-150,pan,0,{distance,priority:AUDIO_PRIORITY.impact,kind:'impact-stone'});}
    return true;
  }
  explosion(pan=0,distance=0,{scale='large',key=''}={}){
    const id=key||`explosion:${this.serial}`,factor=scale==='small'?.62:scale==='demolition'?1.35:1;this._record('explosion',{pan,distance,priority:AUDIO_PRIORITY.explosion,key:id,detail:scale});
    this.noise(.065,.30*factor,pan,0,{distance,priority:AUDIO_PRIORITY.explosion,kind:'explosion-transient',filter:15000,key:id+':transient'});
    this.noise(.72,.19*factor,pan,.025,{distance,priority:AUDIO_PRIORITY.explosion,kind:'explosion-body',filter:4200,key:id+':body'});
    this.tone(48,.78,'triangle',.16*factor,-15,pan,.015,{distance,priority:AUDIO_PRIORITY.explosion,kind:'explosion-low',filter:1200});
    this.noise(1.15,.055*factor,pan,.22,{distance,priority:AUDIO_PRIORITY.explosion,kind:'explosion-tail',filter:2100,key:id+':tail'});
  }
  railClank(pan=0,distance=0,key='train963'){
    this._record('train-arrival',{pan,distance,priority:AUDIO_PRIORITY.train,key});
    this.tone(390,.18,'square',.045,-110,pan,0,{distance,priority:AUDIO_PRIORITY.train,kind:'rail-clank'});
    this.tone(610,.11,'square',.025,-220,pan,.13,{distance,priority:AUDIO_PRIORITY.train,kind:'rail-clank'});
    this.noise(.32,.026,pan,.04,{distance,priority:AUDIO_PRIORITY.train,kind:'rail-rumble',filter:1700,key});
  }
  distantBattle(kind='rifle',pan=0,distance=900,key=''){
    const id=key||`battle:${kind}:${this.serial}`;this._record('distant-battle',{pan,distance,priority:AUDIO_PRIORITY.distant,key:id,detail:kind});
    if(kind==='artillery'){this.noise(.55,.045,pan,.1,{distance,priority:AUDIO_PRIORITY.distant,kind:'distant-artillery',filter:1800,key:id});this.tone(42,.8,'triangle',.05,-8,pan,.1,{distance,priority:AUDIO_PRIORITY.distant,kind:'distant-artillery'});}
    else if(kind==='mg')this.mg34Burst(pan,Math.max(distance,500),3,.095,id);
    else this.rifleShot(pan,Math.max(distance,500),'distant-rifle',id);
  }
  ambience(kind,pan=0){this.distantBattle(kind==='artillery'?'artillery':'rifle',pan,900,`legacy-ambience:${kind}:${this.serial}`);}
  hit(){this._record('player-hit',{priority:AUDIO_PRIORITY.critical,key:`hit:${this.serial}`});this.tone(95,.08,'sawtooth',.05,-45,0,0,{priority:AUDIO_PRIORITY.critical,kind:'player-hit',filter:1800});}
  _startLoop(key,{kind,priority,volume,pan=0,distance=0,type='noise',frequency=90,filter=1200}){
    if(this.loops.has(key)||this.loops.size>=AUDIO_LIMITS.maxLoops||!this.ctx)return this.loops.get(key)??null;
    const voice=this._voice({kind,priority,volume,pan,distance,filter,loop:true});if(!voice)return null;
    let source;
    if(type==='noise'){source=this.ctx.createBufferSource();source.buffer=this._ensureNoise();source.loop=true;source.playbackRate.value=.61;}
    else{source=this.ctx.createOscillator();source.type='sawtooth';source.frequency.value=frequency;}
    if(!this._attach(voice,source)){this._release(voice,true);return null;}source.start();this.loops.set(key,voice);return voice;
  }
  _stopLoop(key){const voice=this.loops.get(key);if(voice)this._release(voice,true);}
  _setLoopSpatial(key,pan,distance,volume=null){
    const voice=this.loops.get(key);if(!voice)return;const shaping=this._distance(distance);voice.pan=pan;voice.distance=distance;voice.panner.pan.value=clamp(pan,-1,1);
    voice.filter.frequency.value=shaping.filter;voice.gain.gain.value=(volume??voice.volume)*shaping.gain;
  }
  resetPresentation(clock=0,state=null){
    this.stopAll();this.presentation={initialized:Boolean(state),lastBattleSlot:Math.floor(Math.max(0,clock)/4),train963:Boolean(state?.train963),stuka:Boolean(state?.stukas),secondRaid:Boolean(state?.secondRaid)};
  }
  updateM01Presentation({clock=0,state={},spatial=()=>({pan:0,distance:900})}={}){
    if(!this.ctx||this.disposed)return;
    this._startLoop('wind',{kind:'wind',priority:AUDIO_PRIORITY.ambience,volume:.032,type:'noise',filter:1050});
    const aircraft=Boolean(state.stukas||state.secondRaid);
    if(aircraft){
      const point=state.secondRaid?{x:-700,y:1100,z:800-(clock%150)*8}:{x:80+Math.sin(clock*.02)*250,y:160,z:240-(clock%90)*4};
      const s=spatial(point);this._startLoop('aircraft',{kind:'aircraft-engine',priority:AUDIO_PRIORITY.aircraft,volume:.14,type:'oscillator',frequency:86,pan:s.pan,distance:s.distance,filter:2600});
      this._setLoopSpatial('aircraft',s.pan,s.distance,.14);
    }else this._stopLoop('aircraft');
    if(!this.presentation.initialized){this.presentation.initialized=true;this.presentation.train963=Boolean(state.train963);this.presentation.stuka=Boolean(state.stukas);this.presentation.secondRaid=Boolean(state.secondRaid);this.presentation.lastBattleSlot=Math.floor(clock/4);}
    else if(!this.presentation.train963&&state.train963){const s=spatial({x:1075,y:0,z:-2.5});this.railClank(s.pan,s.distance,'train963-arrival');}
    this.presentation.train963=Boolean(state.train963);this.presentation.stuka=Boolean(state.stukas);this.presentation.secondRaid=Boolean(state.secondRaid);
    const slot=Math.floor(Math.max(0,clock)/4);
    if(slot>this.presentation.lastBattleSlot){
      this.presentation.lastBattleSlot=slot;const h=audioHash('m01-battle:'+slot),pick=h%8;
      if(pick<6){
        const points=[{x:930,y:0,z:-180},{x:850,y:0,z:260},{x:-520,y:0,z:-1150},{x:-650,y:0,z:950}],point=points[(h>>>5)%points.length],s=spatial(point);
        this.distantBattle(pick===0?'artillery':pick<=2?'mg':'rifle',s.pan,Math.max(550,s.distance),'slot:'+slot);
      }
    }
  }
  get diagnostics(){
    let bytes=0;for(const b of this.buffers.values())bytes+=(b.length??0)*(b.numberOfChannels??1)*4;
    if(this.noiseBuffer)bytes+=(this.noiseBuffer.length??0)*(this.noiseBuffer.numberOfChannels??1)*4;
    return {state:this.ctx?.state??'uninitialized',activeVoices:this.voices.size,maxVoices:this.maxVoices,peakVoices:this.peakVoices,droppedVoices:this.dropped,
      loops:[...this.loops.keys()].sort(),permanentLoops:this.loops.size,buffers:this.buffers.size,proceduralBuffers:this.noiseBuffer?1:0,estimatedBufferBytes:bytes,
      nodesCreated:this.nodesCreated,nodesDisposed:this.nodesDisposed,eventCounts:Object.fromEntries([...this.events.entries()].sort()),lastEvents:this.history.slice(-12)};
  }
}

export { AudioManager as AudioSystem };
