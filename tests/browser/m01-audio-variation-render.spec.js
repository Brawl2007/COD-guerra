import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// "Robotic" audio, measured on rendered sound: the production AudioManager plays the same kind of event several times in an
// OfflineAudioContext (same graph, limiter and reverb as the game; the AudioManager serial advances like a session) and the
// renders are compared pairwise with a log-spectral distance (dB) over a coarse spectrogram. 0 dB = the same sound every time.
// AUDIO_SRC_ROOT points at another checkout (the "before" tree) so the same measurement runs on both; AUDIO_EVIDENCE_DIR saves JSON.
// This proves variation exists and is audible in the signal. It does not replace listening to the game.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const srcRoot=process.env.AUDIO_SRC_ROOT?path.resolve(process.env.AUDIO_SRC_ROOT):root;
const RATE=22050,REPEATS=8;
const CLASSES=[
  {name:'wz29-player-shot',seconds:1,call:'wz29Shot',args:[0,0]},
  {name:'kar98k-40m',seconds:1.2,call:'weaponFire',args:['kar98k',.2,40,{}]},
  {name:'ally-rifle-40m',seconds:1.2,call:'weaponFire',args:['ally_rifle',-.2,40,{}]},
  {name:'mg34-burst5-40m',seconds:1.2,call:'weaponFire',args:['mg34',0,40,{rounds:5,interval:.075}]},
  {name:'ckm-burst4-60m',seconds:1.4,call:'weaponFire',args:['ckm_wz30',0,60,{rounds:4,interval:.1}]},
  {name:'impact-wood',seconds:.6,call:'impact',args:['wood',0,8]},
  {name:'impact-metal',seconds:.9,call:'impact',args:['metal',0,8]},
  {name:'impact-earth',seconds:.6,call:'impact',args:['earth',0,8]},
  {name:'impact-stone',seconds:.6,call:'impact',args:['stone',0,8]},
  {name:'grenade-30m',seconds:2,call:'explosion',args:[0,30,{scale:'small'}]},
  {name:'wz29-bolt-cycle',seconds:1.2,call:'wz29Mechanism',args:['bolt']},
  {name:'player-hit',seconds:.6,call:'hit',args:[]},
  {name:'landing-8mps',seconds:.8,call:'landing',args:[8,'ground']},
];

test('offline render: repeated events of the same kind are audibly different (log-spectral distance between renders)',async({page},info)=>{
  test.setTimeout(process.env.CI?240000:120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://audio.test/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>audio</title>'});
    const file=path.join(srcRoot,url.pathname);
    const ok=(file.startsWith(path.join(srcRoot,'src')+path.sep)||file.startsWith(path.join(srcRoot,'missions')+path.sep))&&!file.includes('..');
    if(!ok)return route.fulfill({status:404,body:''});
    return route.fulfill({contentType:file.endsWith('.json')?'application/json':'text/javascript',body:readFileSync(file)});
  });
  await page.goto('http://audio.test/');
  const result=await page.evaluate(async({classes,rate,repeats})=>{
    const {AudioManager}=await import('/src/core/audio.js');
    const N=1024,HOP=512,BANDS=20,F0=45,F1=9500;
    const fft=(re,im)=>{const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
      for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<n;i+=len)for(let k=0;k<len/2;k++){const c=Math.cos(a*k),s=Math.sin(a*k),xr=re[i+k+len/2],xi=im[i+k+len/2],tr=xr*c-xi*s,ti=xr*s+xi*c;
        re[i+k+len/2]=re[i+k]-tr;im[i+k+len/2]=im[i+k]-ti;re[i+k]+=tr;im[i+k]+=ti;}}};
    const edges=Array.from({length:BANDS+1},(_,i)=>F0*Math.pow(F1/F0,i/BANDS));
    const spectrogram=(x)=>{const rows=[];for(let s=0;s+N<=x.length;s+=HOP){const re=new Float64Array(N),im=new Float64Array(N);
      for(let i=0;i<N;i++)re[i]=x[s+i]*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));fft(re,im);
      const row=new Float64Array(BANDS);for(let k=1;k<N/2;k++){const f=k*rate/N;let b=-1;for(let q=0;q<BANDS;q++)if(f>=edges[q]&&f<edges[q+1]){b=q;break;}if(b>=0)row[b]+=re[k]**2+im[k]**2;}
      rows.push(row.map(e=>10*Math.log10(e+1e-12)));}return rows;};
    const out={};
    for(const clip of classes){
      const specs=[],peaks=[],rmsList=[];
      for(let i=0;i<repeats;i++){
        const PRE=.25,ctx=new OfflineAudioContext(2,Math.ceil((clip.seconds+PRE)*rate),rate),audio=new AudioManager({contextFactory:()=>ctx,quality:'high'});audio.init();
        audio.serial=1000+i*37;   // like a session: the counter has advanced since the last event
        const args=[...clip.args],key='ev'+i;
        if(clip.call==='weaponFire')args[3]={...args[3],key};else if(clip.call==='explosion')args[2]={...args[2],key};else if(clip.call==='impact')args[3]=key;
        ctx.suspend(PRE).then(()=>{audio[clip.call](...args);for(const k of [...audio.loops.keys()])audio._stopLoop(k);ctx.resume();});
        const buf=await ctx.startRendering(),skip=Math.round(PRE*rate),l=buf.getChannelData(0).subarray(skip),r=buf.getChannelData(1).subarray(skip);
        const mono=new Float32Array(l.length);let peak=0,e=0;for(let q=0;q<l.length;q++){mono[q]=(l[q]+r[q])/2;peak=Math.max(peak,Math.abs(mono[q]));e+=mono[q]**2;}
        specs.push(spectrogram(mono));peaks.push(peak);rmsList.push(Math.sqrt(e/l.length));audio.dispose();
      }
      let sum=0,pairs=0,min=Infinity;
      for(let a=0;a<repeats;a++)for(let b=a+1;b<repeats;b++){let d=0,c=0;const A=specs[a],B=specs[b];
        // only frames above -70 dB of the loudest band of either render: silence between sounds is not "different"
        for(let t=0;t<Math.min(A.length,B.length);t++)for(let q=0;q<BANDS;q++){if(A[t][q]<-75&&B[t][q]<-75)continue;d+=Math.abs(A[t][q]-B[t][q]);c++;}
        const lsd=c?d/c:0;sum+=lsd;pairs++;min=Math.min(min,lsd);}
      const db=peaks.map(p=>20*Math.log10(p+1e-9)),m=db.reduce((s,x)=>s+x,0)/db.length;
      out[clip.name]={meanLsdDb:sum/pairs,minLsdDb:min,peakSdDb:Math.sqrt(db.reduce((s,x)=>s+(x-m)**2,0)/db.length),peakDbMean:m};
    }
    return out;
  },{classes:CLASSES,rate:RATE,repeats:REPEATS});
  const dir=process.env.AUDIO_EVIDENCE_DIR;if(dir){mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,'variation-lsd.json'),JSON.stringify({sampleRate:RATE,repeats:REPEATS,srcRoot:path.relative(root,srcRoot)||'.',classes:result},null,2));}
  await info.attach('variation-lsd.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
  expect(errors).toEqual([]);
  if(!process.env.AUDIO_SRC_ROOT){
    // Floor: re-rendering the SAME parameters with only another noise read position already differs by about 2 dB in this measure (before the
    // variation work every gun measured 2.1-2.5 dB and the player's hit 0.0 dB). Guns must now differ clearly more, impacts far more.
    for(const name of ['wz29-player-shot','kar98k-40m','ally-rifle-40m','mg34-burst5-40m','ckm-burst4-60m'])expect(result[name].meanLsdDb,name).toBeGreaterThan(3);
    for(const name of ['impact-wood','impact-metal','impact-earth','impact-stone'])expect(result[name].meanLsdDb,name).toBeGreaterThan(5);
    expect(result['grenade-30m'].meanLsdDb,'grenade-30m').toBeGreaterThan(3.5);
    for(const name of ['wz29-bolt-cycle','player-hit','landing-8mps'])expect(result[name].minLsdDb,`${name}: no two renders identical`).toBeGreaterThan(.5);
  }
});
