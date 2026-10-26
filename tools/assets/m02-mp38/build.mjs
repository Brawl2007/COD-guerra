// Original MP 38 silhouette, using M01's deterministic PBR/GLB pipeline.
import {Model} from '../m01-props/src/mesh.mjs';
import {encodeGlb} from '../m01-props/src/glb.mjs';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const out=new URL('../../../assets/models/provisional/m02/weapons/',import.meta.url);
export function generateMP38(lod=0){
 const m=new Model('mp38',lod,1938);m.dirt=0;
 const steel={color:[.24,.255,.26],variance:.07},bakelite={color:[.21,.17,.14],variance:.05};
 const sides=lod?6:12;
 const barrel=(z,length,r)=>m.cyl('steel',{at:[0,.032,z],rot:[-Math.PI/2,0,0],h:length,r0:r,seg:sides,...steel});
 barrel(.12,.38,.022);barrel(-.26,.24,.013);barrel(-.48,.02,.018);
 m.box('steel_painted',{at:[0,-.005,-.15],size:[.048,.075,.065],...steel});
 m.box('steel',{at:[0,-.14,-.15],size:[.027,.23,.04],...steel});
 m.box('wood_painted',{at:[0,-.045,.035],size:[.046,.045,.19],...bakelite});
 m.box('wood_painted',{at:[0,-.11,.065],size:[.035,.12,.055],rot:[-.22,0,0],...bakelite});
 m.tube('steel',[[0,-.05,.015],[0,-.095,-.005],[0,-.1,-.065],[0,-.045,-.075]],{r:.004,sides:4,...steel});
 // Extended folding steel stock, barrel points along local -Z like M01's rig.
 for(const x of [-.022,.022])m.tube('steel',[[x,.01,.12],[x,-.045,.29],[x,-.045,.323]],{r:.006,sides:lod?4:6,...steel});
 m.box('steel',{at:[0,-.07,.323],size:[.056,.07,.02],...steel});
 m.box('steel',{at:[0,.069,-.445],size:[.009,.045,.012],...steel});
 m.box('steel',{at:[0,.064,.075],size:[.024,.024,.018],...steel});
 if(!lod){
  m.box('steel',{at:[-.029,.033,-.02],size:[.025,.012,.018],...steel});
  for(let i=0;i<8;i++)for(const x of [-.021,.021])m.box('steel',{at:[x,.032,-.23+i*.036],size:[.005,.018,.004],color:[.12,.13,.14]});
  m.box('steel',{at:[0,-.252,-.15],size:[.032,.009,.045],...steel});
 }
 m.sockets.muzzle=[0,.032,-.5];
 return encodeGlb(m,{original:true,units:'metres',weapon:'MP 38',sockets:m.sockets});
}
if(import.meta.url===`file://${process.argv[1]}`){
 mkdirSync(out,{recursive:true});const files=[];
 const save=(name,data)=>{const url=new URL(name,out);if(process.argv.includes('--check')){if(!readFileSync(url).equals(data))throw Error(`Asset differs: ${name}`);}else writeFileSync(url,data);};
 for(const lod of [0,1]){const e=generateMP38(lod),file=`mp38_lod${lod}.glb`;save(file,e.buffer);files.push({file,triangles:e.triangles,bounds:e.bounds,sha256:createHash('sha256').update(e.buffer).digest('hex')});}
 save('manifest.json',Buffer.from(JSON.stringify({asset:'MP 38',author:'COD-guerra project, original procedural geometry',license:'Original project asset; repository license remains to be decided by the owner. No third-party content.',generator:'tools/assets/m02-mp38/build.mjs',units:'metres',axes:'Y up; muzzle -Z; origin at weapon hand socket',length_m:.833,status:'Reconstructed visual silhouette, not a museum reproduction',sockets:{muzzle:[0,.032,-.5]},files},null,2)+'\n'));
}
