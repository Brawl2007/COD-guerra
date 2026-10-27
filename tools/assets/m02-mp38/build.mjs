// Original MP 38 silhouette, using M01's deterministic PBR/GLB pipeline.
import {Model} from '../m01-props/src/mesh.mjs';
import {encodeGlb} from '../m01-props/src/glb.mjs';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const out=new URL('../../../assets/models/provisional/m02/weapons/',import.meta.url);
export function generateMP38(lod=0){
 const m=new Model('mp38',lod,1938);m.dirt=0;
 const magazine=new Model('mp38_magazine',lod,1938),handle=new Model('mp38_cocking_handle',lod,1938);magazine.dirt=handle.dirt=0;
 const steel={color:[.24,.255,.26],variance:.07},bakelite={color:[.21,.17,.14],variance:.05};
 const sides=lod?6:12;
 const barrel=(z,length,r)=>m.cyl('steel',{at:[0,.032,z],rot:[-Math.PI/2,0,0],h:length,r0:r,seg:sides,...steel});
 barrel(.12,.38,.022);barrel(-.26,.24,.013);barrel(-.48,.02,.018);
 m.box('steel_painted',{at:[0,-.005,-.15],size:[.048,.075,.065],...steel});
 magazine.box('steel',{at:[0,-.115,0],size:[.027,.23,.04],...steel});
 m.box('wood_painted',{at:[0,-.045,.035],size:[.046,.045,.19],...bakelite});
 m.box('wood_painted',{at:[0,-.11,.065],size:[.035,.12,.055],rot:[-.22,0,0],...bakelite});
 m.tube('steel',[[0,-.05,.015],[0,-.095,-.005],[0,-.1,-.065],[0,-.045,-.075]],{r:.004,sides:4,...steel});
 // Extended folding steel stock, barrel points along local -Z like M01's rig.
 for(const x of [-.022,.022])m.tube('steel',[[x,.01,.12],[x,-.045,.29],[x,-.045,.323]],{r:.006,sides:lod?4:6,...steel});
 m.box('steel',{at:[0,-.07,.323],size:[.056,.07,.02],...steel});
 m.box('steel',{at:[0,.069,-.445],size:[.009,.045,.012],...steel});
 m.box('steel',{at:[0,.064,.075],size:[.024,.024,.018],...steel});
 if(!lod){
  handle.box('steel',{at:[0,0,0],size:[.025,.012,.018],...steel});
  for(let i=0;i<8;i++)for(const x of [-.021,.021])m.box('steel',{at:[x,.032,-.23+i*.036],size:[.005,.018,.004],color:[.12,.13,.14]});
  magazine.box('steel',{at:[0,-.227,0],size:[.032,.009,.045],...steel});
 }
 m.sockets.muzzle=[0,.032,-.5];
 return articulatedGlb([encodeGlb(m,{original:true,units:'metres',weapon:'MP 38',sockets:m.sockets}),encodeGlb(magazine),...(!lod?[encodeGlb(handle)]:[])],[[0,0,0],[0,-.025,-.15],[-.029,.033,-.02]]);
}

// Compose the deterministic M01 writer's meshes into movable glTF nodes. The
// geometry/material pipeline remains M01; no exporter or renderer is replaced.
function articulatedGlb(parts,positions){
 const jsons=parts.map(p=>JSON.parse(p.buffer.subarray(20,20+p.buffer.readUInt32LE(12)).toString())),bins=parts.map((p,i)=>p.buffer.subarray(28+p.buffer.readUInt32LE(12)));
 const json={...jsons[0],nodes:[{name:'mp38',children:[],extras:jsons[0].nodes[0].extras}],meshes:[],materials:[],accessors:[],bufferViews:[]};
 let bytes=0;
 for(let i=0;i<parts.length;i++){
  const source=jsons[i],v=json.bufferViews.length,a=json.accessors.length,m=json.materials.length,mesh=json.meshes.length;
  json.bufferViews.push(...source.bufferViews.map(x=>({...x,byteOffset:(x.byteOffset??0)+bytes})));
  json.accessors.push(...source.accessors.map(x=>({...x,bufferView:x.bufferView+v})));
  json.materials.push(...source.materials);
  json.meshes.push(...source.meshes.map(x=>({...x,primitives:x.primitives.map(p=>({...p,indices:p.indices+a,material:p.material+m,attributes:Object.fromEntries(Object.entries(p.attributes).map(([k,n])=>[k,n+a]))}))})));
  json.nodes[0].children.push(i+1);json.nodes.push({name:i===0?'mp38_body':source.nodes[0].name,mesh,translation:positions[i]});bytes+=bins[i].length;
 }
 json.buffers=[{byteLength:bytes}];json.scenes=[{name:'mp38',nodes:[0]}];
 let encoded=Buffer.from(JSON.stringify(json));encoded=Buffer.concat([encoded,Buffer.alloc((4-encoded.length%4)%4,32)]);
 const header=Buffer.alloc(20),binHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+encoded.length+bytes,8);header.writeUInt32LE(encoded.length,12);header.writeUInt32LE(0x4e4f534a,16);binHeader.writeUInt32LE(bytes);binHeader.writeUInt32LE(0x004e4942,4);
 return {...parts[0],buffer:Buffer.concat([header,encoded,binHeader,...bins]),triangles:parts.reduce((n,p)=>n+p.triangles,0),bounds:{min:parts[0].bounds.min.map((n,k)=>Math.min(n,...parts.map((p,i)=>p.bounds.min[k]+positions[i][k]))),max:parts[0].bounds.max.map((n,k)=>Math.max(n,...parts.map((p,i)=>p.bounds.max[k]+positions[i][k])))}};
}
if(import.meta.url===`file://${process.argv[1]}`){
 mkdirSync(out,{recursive:true});const files=[];
 const save=(name,data)=>{const url=new URL(name,out);if(process.argv.includes('--check')){if(!readFileSync(url).equals(data))throw Error(`Asset differs: ${name}`);}else writeFileSync(url,data);};
 for(const lod of [0,1]){const e=generateMP38(lod),file=`mp38_lod${lod}.glb`;save(file,e.buffer);files.push({file,triangles:e.triangles,bounds:e.bounds,sha256:createHash('sha256').update(e.buffer).digest('hex')});}
 save('manifest.json',Buffer.from(JSON.stringify({asset:'MP 38',author:'COD-guerra project, original procedural geometry',license:'Original project asset; repository license remains to be decided by the owner. No third-party content.',generator:'tools/assets/m02-mp38/build.mjs',units:'metres',axes:'Y up; muzzle -Z; origin at weapon hand socket',length_m:.833,status:'Reconstructed visual silhouette, not a museum reproduction',sockets:{muzzle:[0,.032,-.5]},parts:['mp38_body','mp38_magazine','mp38_cocking_handle (LOD0)'],animation:'M02 runtime retargeting of M01 clips with M01 two-bone IK; magazine extraction/insertion and charging handle share the 2.7 second authoritative reload.',files},null,2)+'\n'));
}
