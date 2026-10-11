import {IR_MAX_SECONDS,IR_SECONDS,clamp} from './constants.js';

const SEEDS=Object.freeze({A:0x9e3779b9,B:0x7f4a7c15});
/**
 * Procedural impulse responses (no files, no downloads). Seeded xorshift noise: the same (kind, quality, sampleRate)
 * always yields the same samples, so a replay never depends on `Math.random`.
 *  - A: open exterior (riverbank, embankments, houses): early reflections + dark diffuse tail, <= 3.2 s.
 *  - B: short metallic/interior (truss portal, station yard): dense bright ringing, <= 0.9 s.
 */
export function impulseSeconds(kind,quality){
  const table=IR_SECONDS[kind]??IR_SECONDS.A;
  return Math.min(IR_MAX_SECONDS[kind]??IR_MAX_SECONDS.A,table[quality]??table.high);
}
export function generateImpulse(ctx,kind='A',quality='high'){
  const k=kind==='B'?'B':'A',rate=ctx.sampleRate,seconds=impulseSeconds(k,quality);
  const length=Math.max(1,Math.floor(rate*seconds)),buffer=ctx.createBuffer(2,length,rate);
  for(let ch=0;ch<2;ch++){
    const data=buffer.getChannelData(ch);let x=(SEEDS[k]^(ch*0x85ebca6b))>>>0,lp=0;
    if(k==='A'){
      const taps=[.019,.033,.051,.074,.098,.137,.181,.26,.37];
      for(let i=0;i<length;i++){
        x^=x<<13;x^=x>>>17;x^=x<<5;const n=((x>>>0)/0xffffffff*2-1),t=i/rate;
        const c=clamp(.25+t*.9,.25,.97);lp=lp*c+n*(1-c);   // darkens with time (air, vegetation)
        data[i]=t<.012?0:lp*Math.exp(-t/.62)*.9;
      }
      taps.forEach((tap,i)=>{const at=Math.floor((tap+(ch?.0037*(i%3):0))*rate);if(at<length)data[at]+=(i%2===ch?.75:.5)/(1+i*.45);});
    }else{
      // Metallic: fast decay, little low-pass (bright), plus inharmonic ringing taps from steel girders.
      const rings=[.0043,.0071,.0113,.0178,.0261,.0377,.0541];
      for(let i=0;i<length;i++){
        x^=x<<13;x^=x>>>17;x^=x<<5;const n=((x>>>0)/0xffffffff*2-1),t=i/rate;
        lp=lp*.35+n*.65;data[i]=t<.003?0:lp*Math.exp(-t/.19)*.85;
      }
      rings.forEach((tap,i)=>{const at=Math.floor((tap+(ch?.0011*(i%3):0))*rate);if(at<length)data[at]+=(i%2===ch?.8:.55)/(1+i*.3);});
    }
    // Final fade avoids a click when the buffer ends non-zero.
    const fade=Math.min(length,Math.max(1,Math.floor(rate*.02)));for(let i=0;i<fade;i++)data[length-1-i]*=i/fade;
  }
  return buffer;
}
