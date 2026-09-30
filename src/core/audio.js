export class AudioSystem {
  constructor(){this.ctx=null;}
  init(){this.ctx??=new (window.AudioContext||window.webkitAudioContext)();this.ctx.resume();}
  tone(freq,duration,type='square',volume=.04,slide=0){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+duration);}
  shot(){this.tone(145,.09,'sawtooth',.09,-90);this.tone(55,.16,'square',.05,-20);}
  reload(){this.tone(780,.035,'square',.025,-200);setTimeout(()=>this.tone(520,.05,'square',.03,100),500);}
  hit(){this.tone(95,.08,'sawtooth',.04,-45);}
}
