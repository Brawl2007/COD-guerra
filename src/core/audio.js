export class AudioManager {
  constructor(){this.ctx=null;this.master=null;this.buffers=new Map();this.volume=.68;this.disposed=false;}
  init(){if(this.disposed)return;if(!this.ctx){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);}this.ctx.resume().catch(error=>console.warn('Áudio não pôde ser ativado:',error.message));}
  setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)));if(this.master)this.master.gain.value=this.volume;}
  suspend(){if(this.ctx&&this.ctx.state==='running')this.ctx.suspend().catch(()=>{});}
  dispose(){if(this.disposed)return;this.disposed=true;this.buffers.clear();if(this.ctx)this.ctx.close().catch(()=>{});this.ctx=null;this.master=null;}
  async load(name,url){if(!this.ctx)return false;try{const response=await fetch(url);if(!response.ok)throw new Error(`${response.status} ${url}`);this.buffers.set(name,await this.ctx.decodeAudioData(await response.arrayBuffer()));return true;}catch(error){console.warn('Áudio procedural ativo:',error.message);return false;}}
  channel(volume=.1,pan=0){const gain=this.ctx.createGain(),panner=this.ctx.createStereoPanner();gain.gain.value=volume;panner.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(panner).connect(this.master);return gain;}
  play(name,{volume=1,pan=0,rate=1}={}){const buffer=this.buffers.get(name);if(!this.ctx||!buffer)return false;const source=this.ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;source.connect(this.channel(volume,pan));source.start();return true;}
  tone(freq,duration,type='square',volume=.04,slide=0,pan=0,delay=0){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.channel(volume,pan),t=this.ctx.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);o.start(t);o.stop(t+duration);}
  noise(duration,volume,pan=0,delay=0){if(!this.ctx)return;const length=Math.floor(this.ctx.sampleRate*duration),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2);const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.channel(volume,pan);source.buffer=buffer;filter.type='lowpass';filter.frequency.value=2200;source.connect(filter).connect(gain);source.start(this.ctx.currentTime+delay);}
  shot(pan=0,distant=false){const scale=distant?.38:1;if(this.play('shot',{volume:.8*scale,pan,rate:distant?.84:1}))return;this.noise(.18,.22*scale,pan);this.tone(115,.12,'sawtooth',.15*scale,-75,pan);this.tone(48,.28,'triangle',.1*scale,-16,pan);}
  reload(){if(!this.play('reload',{volume:.7})){for(const [delay,freq] of [[0,780],[.38,510],[.82,690],[1.2,430]])this.tone(freq,.045,'square',.025,-180,0,delay);}}
  impact(material='stone',pan=0){if(material==='metal')this.tone(1700,.12,'square',.04,-700,pan);else if(!this.play('impactStone',{volume:.34,pan}))this.noise(.12,.04,pan);}
  explosion(pan=0,distance=0){if(!this.play('explosion',{volume:Math.max(.12,.9-distance/900),pan})){const volume=Math.max(.04,.24-distance/3800);this.noise(.85,volume,pan);this.tone(52,.7,'triangle',volume,-18,pan);}}
  ambience(kind,pan=0){const name=kind==='artillery'?'artillery':'distantGunfire';if(this.play(name,{volume:kind==='artillery'?.16:.11,pan,rate:.88+Math.random()*.2}))return;if(kind==='artillery'){this.tone(44,1.3,'triangle',.035,-10,pan,.4);this.noise(.8,.025,pan,.4);}else for(const delay of [0,.19,.57]){this.noise(.08,.018,pan,delay);this.tone(95,.1,'square',.012,-40,pan,delay);}}
  hit(){this.tone(95,.08,'sawtooth',.04,-45);}
}

export { AudioManager as AudioSystem };
