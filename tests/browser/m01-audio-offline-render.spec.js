import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Renderização acústica real: o AudioManager de produção toca cada som num OfflineAudioContext do Chromium
// (mesmo grafo, compressor e reverberação do jogo) e o resultado é medido. Isto prova identidade e forma do sinal;
// não substitui ouvir os sons num playtest. AUDIO_EVIDENCE_DIR grava os WAV para escuta humana: mono (L+R)/2 a 22,05 kHz,
// enquanto metrics.json mede o estéreo (por isso o pico de um som panorâmico é maior no JSON do que no WAV).
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const RATE=22050;
const CLIPS=[
  {name:'wz29-player',seconds:1.6,call:'wz29Shot',args:[0,0]},
  {name:'kar98k-15m',seconds:2,call:'weaponFire',args:['kar98k',.2,15,{key:'k15'}]},
  {name:'kar98k-150m',seconds:2,call:'weaponFire',args:['kar98k',.2,150,{key:'k150'}]},
  {name:'kar98k-600m',seconds:2.5,call:'weaponFire',args:['kar98k',.2,600,{key:'k600'}]},
  {name:'kar98k-1400m',seconds:3,call:'weaponFire',args:['kar98k',.2,1400,{key:'k1400'}]},
  {name:'ally-rifle-15m',seconds:2,call:'weaponFire',args:['ally_rifle',-.2,15,{key:'a15'}]},
  {name:'mg34-single-30m',seconds:1.5,call:'weaponFire',args:['mg34',0,30,{key:'m1'}]},
  {name:'rkm-single-30m',seconds:1.5,call:'weaponFire',args:['rkm_wz28',0,30,{key:'r1'}]},
  {name:'ckm-single-30m',seconds:1.5,call:'weaponFire',args:['ckm_wz30',0,30,{key:'c1'}]},
  {name:'mg34-burst-30m',seconds:2,call:'weaponFire',args:['mg34',0,30,{rounds:7,interval:.075,key:'mb'}]},
  {name:'rkm-burst-30m',seconds:2,call:'weaponFire',args:['rkm_wz28',0,30,{rounds:5,interval:.11,key:'rb'}]},
  {name:'ckm-burst-30m',seconds:2,call:'weaponFire',args:['ckm_wz30',0,30,{rounds:6,interval:.1,key:'cb'}]},
  {name:'mg34-burst-900m',seconds:3,call:'weaponFire',args:['mg34',0,900,{rounds:7,interval:.075,key:'mbf'}]},
  // Forma real do jogo: a MG34 deitada emite um evento por tiro; o áudio junta-os numa rajada.
  {name:'mg34-per-round-30m',seconds:2,call:'rounds',args:['mg34',30,7,.075]},
  // Pior caso denso perto do jogador: demolição, granada, MG34, estalo e wz.29 ao mesmo tempo.
  {name:'dense-mix-worst-case',seconds:4,call:'dense',args:[]},
  {name:'bullet-crack',seconds:.8,call:'crack',args:[.5,2,'crack']},
  {name:'bullet-whizz',seconds:.8,call:'whizz',args:[-.5,8,'whizz']},
  {name:'impact-earth',seconds:1,call:'impact',args:['earth',0,8,'ie']},
  {name:'impact-wood',seconds:1,call:'impact',args:['wood',0,8,'iw']},
  {name:'impact-metal',seconds:1,call:'impact',args:['metal',0,8,'im']},
  {name:'impact-stone',seconds:1,call:'impact',args:['stone',0,8,'is']},
  {name:'grenade-25m',seconds:3,call:'explosion',args:[0,25,{scale:'small',key:'g'}]},
  {name:'bomb-80m',seconds:4,call:'explosion',args:[.3,80,{scale:'large',key:'b'}]},
  {name:'bridge-demolition-250m',seconds:9,call:'explosion',args:[.4,250,{scale:'demolition',key:'east_demolition'}]},
  {name:'artillery-2000m',seconds:5,call:'distantBattle',args:['artillery',-.6,2000,'art',{salvo:3}]},
  {name:'distant-volley-900m',seconds:3,call:'distantBattle',args:['rifle',.6,900,'vol',{rounds:4}]},
  {name:'ju87-pullout-300m',seconds:3.5,call:'ju87PullOut',args:[.2,300,'ju']},
  {name:'train-arrival-150m',seconds:5,call:'railClank',args:[.7,150,'train']},
  {name:'stuka-formation-near',seconds:2.5,call:'aircraft',args:[200]},
  {name:'stuka-formation-far',seconds:2.5,call:'aircraft',args:[2200]},
  {name:'fire-near',seconds:3,call:'fire',args:[12]},
];

async function serveSources(page){
  await page.route('http://audio.test/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>audio</title>'});
    const file=path.join(root,url.pathname);
    if(!file.startsWith(path.join(root,'src')+path.sep))return route.fulfill({status:404,body:''});
    return route.fulfill({contentType:'text/javascript',body:readFileSync(file)});
  });
  await page.goto('http://audio.test/');
}

async function renderAll(page){
  return page.evaluate(async({clips,rate})=>{
    const {AudioManager}=await import('/src/core/audio.js');
    const fft=(re,im)=>{const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
      for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<n;i+=len)for(let k=0;k<len/2;k++){const c=Math.cos(a*k),s=Math.sin(a*k),xr=re[i+k+len/2],xi=im[i+k+len/2],tr=xr*c-xi*s,ti=xr*s+xi*c;
        re[i+k+len/2]=re[i+k]-tr;im[i+k+len/2]=im[i+k]-ti;re[i+k]+=tr;im[i+k]+=ti;}}};
    const analyse=(left,right)=>{
      const n=left.length,mono=new Float32Array(n);let peak=0,sumL=0,sumR=0,energy=0,nan=0;
      for(let i=0;i<n;i++){if(!Number.isFinite(left[i])||!Number.isFinite(right[i]))nan++;mono[i]=(left[i]+right[i])/2;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));sumL+=left[i]**2;sumR+=right[i]**2;energy+=mono[i]**2;}
      const N=2048;let num=0,den=0,low=0;
      for(let start=0;start+N<=n;start+=N/2){const re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++)re[i]=mono[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));fft(re,im);
        for(let k=1;k<N/2;k++){const p=re[k]**2+im[k]**2,f=k*rate/N;num+=f*p;den+=p;if(f<250)low+=p;}}
      const win=Math.round(rate*.004),env=[];for(let i=0;i+win<=n;i+=win){let s=0;for(let j=0;j<win;j++)s+=mono[i+j]**2;env.push(Math.sqrt(s/win));}
      const maxEnv=Math.max(...env,1e-12);let last=0;env.forEach((e,i)=>{if(e>maxEnv*.01)last=i;});
      // Ataques: subidas de energia no envelope (≥ 2,2× a janela anterior), espaçadas ≥ 40 ms.
      // Só ataques fortes (≥ 30 % do máximo): as reflexões precoces (eco a ~60 ms) não contam como tiros.
      const onsets=[];for(let i=1;i<env.length;i++)if(env[i]>maxEnv*.3&&env[i]>env[i-1]*2.2&&(!onsets.length||(i*win-onsets.at(-1))/rate>.04))onsets.push(i*win);
      let late=0;for(let i=Math.floor(rate*.3);i<n;i++)late+=mono[i]**2;
      return {peak,rms:Math.sqrt(energy/n),centroid:den?num/den:0,lowRatio:den?low/den:0,decaySec:(last+1)*win/rate,lateEnergyRatio:energy?late/energy:0,
        balance:(Math.sqrt(sumR)-Math.sqrt(sumL))/(Math.sqrt(sumR)+Math.sqrt(sumL)+1e-12),onsets:onsets.map(o=>o/rate),nan};
    };
    const results={};
    // Pré-rolo: no jogo o contexto já corre há muito; o compressor do Chromium arranca com redução de ganho em t=0.
    // Cada som é pedido em PRE (contexto suspenso nesse instante), como um evento a meio da partida, e mede-se daí em diante.
    const PRE=.25;
    for(const clip of clips){
      const ctx=new OfflineAudioContext(2,Math.ceil((clip.seconds+PRE)*rate),rate),audio=new AudioManager({contextFactory:()=>ctx,quality:'high'});audio.init();
      const keep=clip.call==='aircraft'?['aircraft']:clip.call==='fire'?['fire']:[];
      const quiet=()=>{for(const key of [...audio.loops.keys()])if(!keep.includes(key))audio._stopLoop(key);};
      const fireState={destruction:['station_wagon_fire'],damage:[],stukas:false};
      const at=(time,fn)=>ctx.suspend(time).then(()=>{fn();quiet();ctx.resume();});
      if(clip.call==='aircraft')at(PRE,()=>{const d=clip.args[0];audio.resetPresentation(10,{stukas:true});
        audio.updateM01Presentation({clock:10,state:{stukas:true,secondRaid:false,train963:false},spatial:()=>({distance:d,pan:.3,front:1,dy:0})});});
      else if(clip.call==='fire'){
        // Os estalidos agendam-se por janelas de 0,1 s do relógio de apresentação: avança-se o relógio com o contexto.
        at(PRE,()=>{audio.resetPresentation(0,fireState);audio.updateM01Presentation({clock:0,state:fireState,spatial:()=>({distance:clip.args[0],pan:-.3,front:1,dy:0}),phase:'SETUP'});});
        for(let k=1;k*.1<clip.seconds-.05;k++){const clock=Math.round(k)/10;at(PRE+clock,()=>audio.updateM01Presentation({clock,state:fireState,spatial:()=>({distance:clip.args[0],pan:-.3,front:1,dy:0}),phase:'SETUP'}));}
      }else if(clip.call==='rounds'){const [weapon,d,n,step]=clip.args;
        for(let i=0;i<n;i++)at(PRE+i*step,()=>audio.weaponFire(weapon,0,d,{rounds:1,interval:step,key:'round'+i,source:'gunner'}));}
      else if(clip.call==='dense')at(PRE,()=>{audio.explosion(.2,40,{scale:'demolition',key:'dense-demo'});audio.explosion(-.4,10,{scale:'small',key:'dense-g'});
        audio.weaponFire('mg34',.5,20,{rounds:9,key:'dense-mg'});audio.crack(-.8,2,'dense-c');audio.wz29Shot();audio.impact('metal',.3,4,'dense-i');});
      else at(PRE,()=>audio[clip.call](...clip.args));
      const buffer=await ctx.startRendering(),skip=Math.round(PRE*rate),left=buffer.getChannelData(0).subarray(skip),right=buffer.getChannelData(1).subarray(skip);
      const metrics=analyse(left,right),mono=new Int16Array(left.length);for(let i=0;i<left.length;i++)mono[i]=Math.max(-1,Math.min(1,(left[i]+right[i])/2))*32767;
      results[clip.name]={metrics,diagnostics:{eventCounts:audio.diagnostics.eventCounts,peakVoices:audio.diagnostics.peakVoices,peakSources:audio.diagnostics.peakSources},
        pcm:Array.from(new Uint8Array(mono.buffer))};
      audio.dispose();
    }
    return results;
  },{clips:CLIPS,rate:RATE});
}

const wav=bytes=>{const data=Buffer.from(bytes),h=Buffer.alloc(44);h.write('RIFF',0);h.writeUInt32LE(36+data.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);
  h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(RATE,24);h.writeUInt32LE(RATE*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);};

test('offline render: each weapon, distance band, impact, blast, vehicle and fire has a measurable, distinct acoustic signature',async({page},info)=>{
  test.setTimeout(process.env.CI?240000:120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await serveSources(page);const r=await renderAll(page);const m=name=>r[name].metrics;
  const out=process.env.AUDIO_EVIDENCE_DIR;if(out){mkdirSync(out,{recursive:true});for(const [name,clip] of Object.entries(r))writeFileSync(path.join(out,name+'.wav'),wav(clip.pcm));}
  const summary=Object.fromEntries(Object.entries(r).map(([k,v])=>[k,{...v.metrics,onsets:v.metrics.onsets.map(x=>Number(x.toFixed(3)))}]));
  if(out)writeFileSync(path.join(out,'metrics.json'),JSON.stringify({sampleRate:RATE,clips:summary},null,2));
  await info.attach('offline-audio-metrics.json',{body:JSON.stringify(summary,null,2),contentType:'application/json'});

  for(const [name,v] of Object.entries(r)){expect(v.metrics.nan,name).toBe(0);expect(v.metrics.peak,name).toBeGreaterThan(1e-4);expect(v.metrics.peak,name).toBeLessThanOrEqual(1);}
  // Distância: menos pico, mais escuro e com mais cauda (reflexões/reverberação) à medida que se afasta.
  const bands=['kar98k-15m','kar98k-150m','kar98k-600m','kar98k-1400m'].map(m);
  for(let i=1;i<bands.length;i++){expect(bands[i].peak).toBeLessThan(bands[i-1].peak);expect(bands[i].centroid).toBeLessThan(bands[i-1].centroid);expect(bands[i].lateEnergyRatio).toBeGreaterThan(bands[i-1].lateEnergyRatio);}
  expect(m('mg34-burst-900m').centroid).toBeLessThan(m('mg34-burst-30m').centroid);
  // Identidade: os disparos isolados das armas automáticas e das espingardas diferem no espectro.
  const ids=['kar98k-15m','ally-rifle-15m','mg34-single-30m','rkm-single-30m','ckm-single-30m','wz29-player'];
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=m(ids[i]),b=m(ids[j]);
    const distance=Math.abs(Math.log(a.centroid/b.centroid))+Math.abs(a.lowRatio-b.lowRatio)+Math.abs(Math.log(a.decaySec/b.decaySec));
    expect(distance,`${ids[i]} vs ${ids[j]}`).toBeGreaterThan(.05);}
  expect(m('mg34-single-30m').centroid).toBeGreaterThan(m('ckm-single-30m').centroid);
  expect(m('ckm-single-30m').lowRatio).toBeGreaterThan(m('mg34-single-30m').lowRatio);
  // Cadência ouvida das rajadas = cadência dada (MG34 0,075 s; rkm 0,11 s; ckm 0,1 s).
  for(const [name,cadence,rounds] of [['mg34-burst-30m',.075,7],['mg34-per-round-30m',.075,7],['rkm-burst-30m',.11,5],['ckm-burst-30m',.1,6]]){
    const onsets=m(name).onsets.filter(t=>t<cadence*rounds+.02);expect(onsets.length,name).toBeGreaterThanOrEqual(rounds-1);
    const gaps=onsets.slice(1).map((t,i)=>t-onsets[i]).sort((a,b)=>a-b),median=gaps[Math.floor(gaps.length/2)];expect(Math.abs(median-cadence),name).toBeLessThan(.012);}
  // Balas, impactos e explosões.
  expect(m('bullet-crack').decaySec).toBeLessThan(m('bullet-whizz').decaySec+.3);expect(m('bullet-crack').balance).toBeGreaterThan(.1);expect(m('bullet-whizz').balance).toBeLessThan(-.1);
  expect(m('impact-metal').centroid).toBeGreaterThan(m('impact-earth').centroid);expect(m('impact-earth').lowRatio).toBeGreaterThan(m('impact-metal').lowRatio);
  expect(m('bridge-demolition-250m').decaySec).toBeGreaterThan(m('bomb-80m').decaySec);expect(m('bomb-80m').decaySec).toBeGreaterThan(m('grenade-25m').decaySec);
  expect(m('bomb-80m').lowRatio).toBeGreaterThan(m('kar98k-15m').lowRatio);expect(m('artillery-2000m').lowRatio).toBeGreaterThan(.5);
  expect(m('distant-volley-900m').onsets.length).toBeGreaterThanOrEqual(2);
  expect(m('grenade-25m').centroid).toBeGreaterThan(m('bomb-80m').centroid);
  // Ju 87: perto rasga (mais agudo), longe só ronca.
  expect(m('stuka-formation-near').centroid).toBeGreaterThan(m('stuka-formation-far').centroid);expect(m('stuka-formation-near').rms).toBeGreaterThan(m('stuka-formation-far').rms);
  expect(r['fire-near'].diagnostics.eventCounts['fire-crackle']).toBeGreaterThan(3);
  expect(r['mg34-per-round-30m'].diagnostics.peakVoices,'per-round events share one burst voice').toBe(1);
  expect(m('dense-mix-worst-case').peak).toBeLessThan(1);
  expect(errors).toEqual([]);
});
