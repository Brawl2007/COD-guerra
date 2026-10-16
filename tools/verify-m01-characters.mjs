import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { openStage } from './assets/m01-soldiers/render/stage.mjs';

const out=process.argv[2]??'test-results/m01-characters';
await mkdir(out,{recursive:true});
const base='/assets/models/provisional/m01/characters/';
const animations=base+'m01_soldier_animations.glb';
const st=await openStage({width:1280,height:720});
const report={kind:'isolated GLTFLoader/AnimationMixer asset review; not a mission playtest',models:[],clips:[],errors:st.errors};
try{
  for(const nation of ['pl','de']){
    await st.eval(async({base,animations,nation})=>{
      const s=window.stage;s.clear();
      for(let lod=0;lod<3;lod++)await s.add(`${base}m01_soldier_${nation}_lod${lod}.glb`,{
        position:[(1-lod)*1.05,0,0],clip:'standing_idle',time:1.5,animationUrl:animations});
      s.camera([0,1.05,-5.8],[0,.95,0],32);s.label(`${nation.toUpperCase()} · LOD0 / LOD1 / LOD2 · 1 unidade = 1 m`);
    },{base,animations,nation});
    report.models.push(await st.eval(()=>[0,1,2].map(i=>({lod:i,...window.stage.info(i),bounds:window.stage.bbox(i)}))));
    await st.shot(join(out,`${nation}-lods.png`));
  }
  const clips=await st.eval(url=>window.stage.clips(url),animations);
  for(const clip of clips){
    const entry=await st.eval(async({base,animations,clip})=>{
      const s=window.stage;s.clear();const samples=[];
      for(const [i,f]of [.05,.5,.95].entries()){
        const a=await s.add(base+'m01_soldier_pl_lod1.glb',{
          position:[(1-i)*1.2,0,0],rotationY:Math.PI/5,clip:clip.name,
          time:clip.duration*f,animationUrl:animations});
        samples.push({fraction:f,bounds:s.bbox(a),weapon:s.bone(a,'weapon'),hand:s.bone(a,'hand_r')});
      }
      s.camera([0,1.05,-6.4],[0,.85,0],32);s.label(`${clip.name} · 5% / 50% / 95%`);
      return {name:clip.name,duration:clip.duration,samples};
    },{base,animations,clip});
    for(const sample of entry.samples){
      if(![...sample.bounds.min,...sample.bounds.max,...sample.weapon,...sample.hand].every(Number.isFinite))throw new Error(`Non-finite ${clip.name}`);
      if(sample.bounds.max[1]-sample.bounds.min[1]>2.4)throw new Error(`Deformed rig ${clip.name}`);
    }
    report.clips.push(entry);
    await st.shot(join(out,`${clip.name}.png`));
  }
  report.render=await st.eval(()=>window.stage.render());
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(st.errors.length)throw new Error(st.errors.join('\n'));
  console.log(JSON.stringify({models:6,clips:report.clips.length,errors:st.errors}));
}finally{await st.close();}
