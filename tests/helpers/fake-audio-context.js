// AudioContext mínimo para testes de grafo em Node (sem síntese real): regista nós, ligações e paragens.
export class Param{
  constructor(value=0){this.value=value;this.events=[];}
  setValueAtTime(value,t){this.value=value;this.events.push(['set',value,t]);}
  exponentialRampToValueAtTime(value,t){this.value=value;this.events.push(['exp',value,t]);}
  linearRampToValueAtTime(value,t){this.value=value;this.events.push(['lin',value,t]);}
  setTargetAtTime(value,t,tau){this.value=value;this.events.push(['target',value,t,tau]);}
  cancelScheduledValues(t){this.events.push(['cancel',t]);}
}
export class Node{
  constructor(ctx,type){this.ctx=ctx;this.type=type;this.connections=[];this.disconnected=false;ctx.nodes.push(this);}
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.connections=[];this.disconnected=true;}
}
export class Source extends Node{
  constructor(ctx,type){super(ctx,type);this.onended=null;this.loop=false;this.playbackRate=new Param(1);ctx.sources.push(this);}
  start(when=0,offset=0){this.started=true;this.startAt=when;this.offset=offset;}
  stop(when=0){this.stopped=true;this.stopAt=when;}
  finish(){if(this.onended){const fn=this.onended;this.onended=null;fn();}}
}
export class FakeAudioContext{
  constructor({convolver=true,compressor=true}={}){
    this.state='suspended';this.currentTime=0;this.sampleRate=2000;this.nodes=[];this.sources=[];this.destination=new Node(this,'destination');
    if(!convolver)this.createConvolver=undefined;if(!compressor)this.createDynamicsCompressor=undefined;
  }
  createGain(){const n=new Node(this,'gain');n.gain=new Param(1);return n;}
  createBiquadFilter(){const n=new Node(this,'biquad');n.frequency=new Param(18000);n.Q=new Param(1);n.type='lowpass';return n;}
  createStereoPanner(){const n=new Node(this,'panner');n.pan=new Param(0);return n;}
  createConvolver(){const n=new Node(this,'convolver');n.buffer=null;return n;}
  createDynamicsCompressor(){const n=new Node(this,'compressor');for(const k of ['threshold','knee','ratio','attack','release'])n[k]=new Param(0);return n;}
  createOscillator(){const n=new Source(this,'oscillator');n.frequency=new Param(440);n.type='sine';return n;}
  createBufferSource(){return new Source(this,'buffer');}
  createBuffer(channels,length,sampleRate){
    const data=Array.from({length:channels},()=>new Float32Array(length));
    return {length,numberOfChannels:channels,duration:length/sampleRate,getChannelData:i=>data[i]};
  }
  async decodeAudioData(){return this.createBuffer(1,2000,this.sampleRate);}
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
  async close(){this.state='closed';}
  /** Termina todas as fontes com paragem agendada (grãos); loops contínuos ficam. */
  flush(){for(const s of [...this.sources])if(s.stopAt!==undefined)s.finish();}
}
