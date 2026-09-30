export class AudioSystem {
  constructor(){this.ctx=null;this.master=null;}
  init(){if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.72;this.master.connect(this.ctx.destination);}this.ctx.resume();}
  output(volume=.1,pan=0){const gain=this.ctx.createGain(),panner=this.ctx.createStereoPanner();gain.gain.value=volume;panner.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(panner).connect(this.master);return gain;}
  tone(freq,duration,type='square',volume=.04,slide=0,pan=0){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.output(volume,pan),t=this.ctx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);o.start(t);o.stop(t+duration);}
  noise(duration,volume,pan=0){if(!this.ctx)return;const length=Math.floor(this.ctx.sampleRate*duration),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2);const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.output(volume,pan);source.buffer=buffer;filter.type='lowpass';filter.frequency.value=2200;source.connect(filter).connect(gain);source.start();}
  shot(pan=0,distant=false){const scale=distant?.38:1;this.noise(.18,.22*scale,pan);this.tone(115,.12,'sawtooth',.15*scale,-75,pan);this.tone(48,.28,'triangle',.1*scale,-16,pan);}
  reload(){this.tone(780,.035,'square',.025,-200);setTimeout(()=>this.tone(520,.05,'square',.03,100),500);}
  hit(){this.tone(95,.08,'sawtooth',.04,-45);}
}
