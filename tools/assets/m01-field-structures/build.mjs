// Original procedural architecture. Geometry helpers shared with original props; never rewrites props.
import {Model,hex,weather} from '../m01-props/src/mesh.mjs';
import {encodeGlb} from '../m01-props/src/glb.mjs';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export const OUT=fileURLToPath(new URL('../../../assets/models/provisional/m01/structures/',import.meta.url));
export const BUDGET=[5000,1500,300];
const wood=hex('#725637'),dark=hex('#27291f'),earth=hex('#6c6650'),concrete=hex('#8a877a');
export const DEFINITIONS=[
 {id:'rail_shed',anchor:[-260,-3,20],description:'Original railway shed: gable, chimney, open west door, surface-mounted window and bench.',colliderIds:['hut_north','hut_east','hut_south','hut_west_n','hut_west_s'],surfaces:[['hut_north',[-10,0,-6],[10,3.5,-5.65]],['hut_east',[10,0,-6],[10.35,3.5,6]],['hut_south',[-10,0,5.65],[10,3.5,6]],['hut_west_n',[-10,0,-6],[-9.65,3.5,-2]],['hut_west_s',[-10,0,4],[-9.65,3.5,6]]],openings:[{kind:'west door',worldX:-270,worldZ:[18,24],widthM:6}]},
 {id:'shelter',anchor:[-260,-4,70],description:'Artistic timber-lined shelter with an L-shaped north entrance; only existing entrance cover is collision backed.',colliderIds:['cv_shelter_entrance'],surfaces:[['cv_shelter_entrance',[1.55,0,-5.5],[2.45,2.2,-2.5]]],openings:[{kind:'north L entrance',localX:[-1.5,1.5],localZ:[-6,-2]}]},
 {id:'forward_post',anchor:[18,0,3],description:'Earth and timber parapet; destroyed variant is exactly 0.45m tall, sourced from the world cover.',colliderIds:['cv_forward_post'],surfaces:[['cv_forward_post',[-.45,0,-1.5],[.45,1.1,1.5]]],openings:[]},
 {id:'casemate',anchor:[13,-7,40],description:'Artistic concrete casemate, two open east embrasures and earth cap. Feature envelope is a map reference, not a collider.',colliderIds:[],surfaces:[],featureBounds:{min:[0,-7,34],max:[26,-1,46]},openings:[{kind:'east embrasures',worldZ:[37,43]},{kind:'west entrance',localZ:[-1.5,1.5]}]}
];
function modelFor(d,lod,destroyed=false){
 const m=new Model(d.id,lod,1939),surfaces=[];
 const box=(mat,min,max,color=wood)=>m.box(mat,{at:min.map((v,i)=>(v+max[i])/2),size:min.map((v,i)=>max[i]-v),color,variance:.12});
 for(const [id,min,originalMax]of d.surfaces){const max=[...originalMax];if(destroyed)max[1]=.45;const mat=d.id==='rail_shed'||d.id==='shelter'?'wood':'earth',start=m.part(mat).pos.length/3;box(mat,min,max,d.id==='forward_post'?earth:wood);surfaces.push({id,min,max,material:mat,vertexStart:start,vertexCount:m.part(mat).pos.length/3-start});}
 if(d.id==='rail_shed'){
  // Thin angled sheets form a true gable, above all five unchanged collision walls.
  const a=Math.atan2(1.8,6.6),length=Math.hypot(1.8,6.6);
  for(const sign of [-1,1])m.box('steel_painted',{size:[21,.13,length],at:[0,4.4,sign*3.3],rot:[sign*a,0,0],color:hex('#515950')});
  for(const x of [-9.9,10.1])m.prism('wood',[[-6,3.5],[6,3.5],[0,5.3]],.15,{at:[x,0,0],rot:[0,Math.PI/2,0],color:wood});
  box('earth',[5,4.5,1],[5.7,6.4,1.7],concrete);
  if(lod<2){box('wood',[10.36,1.1,-2],[10.44,2.45,.2],dark);for(const z of [-2,.2])box('wood',[10.44,1,z-.06],[10.53,2.55,z+.06]);box('wood',[10.44,1,-2.08],[10.54,1.12,.28]);box('wood',[10.44,2.44,-2.08],[10.54,2.56,.28]);box('wood',[7,.7,2],[9.5,.84,2.8]);for(const x of [7.2,9.2])box('wood',[x,0,2.15],[x+.12,.7,2.65]);}
  if(lod===0){for(let x=-9.7;x<10;x+=.6)for(const z of [-6.015,6.015])box('wood',[x,.08,z-.012],[x+.035,3.48,z+.012],hex('#473a2c'));for(let x=-9;x<10;x+=2)box('steel',[x,3.52,-6.5],[x+.04,3.62,6.5],hex('#8b8170'));}
 }
 if(d.id==='shelter'){
  // North entry remains open; the return wall makes an L, with a 3m passage at its west end.
  box('wood',[-5,0,-2],[-4.65,2.55,5]);box('wood',[-5,0,4.65],[5,2.55,5]);box('wood',[4.65,0,-2],[5,2.55,5]);box('wood',[-1.5,0,-2],[4.65,2.55,-1.65]);
  box('earth',[-5.5,2.55,-2.2],[5.5,3.1,5.5],earth);box('wood',[-4.64,.01,-1.64],[4.64,.04,4.64],dark);
  if(lod<2)for(let z=-1;z<5;z+=1)m.box('wood',{size:[9.5,.25,.22],at:[0,2.4,z],color:wood});
  if(lod===0){for(let z=-1;z<5;z+=.42)for(const x of [-4.6,4.6])box('wood',[x,0,z],[x+.08,2.4,z+.08],hex('#aa8858'));box('wood',[-3,.6,3],[-.5,.8,4]);}
 }
 if(d.id==='forward_post'&&lod<2){const height=destroyed?.45:1.1;for(let z=-1.4;z<1.5;z+=.48)box('wood',[-.455,.03,z],[.455,height-.04,Math.min(1.5,z+.035)],wood);if(lod===0)for(let y=.14;y+.11<=height;y+=.26)for(let z=-1.3;z<1.5;z+=.52)m.blob('cloth',{rad:[.44,.11,.23],at:[0,y,z],nu:8,nv:4,color:hex('#9c9071')});}
 if(d.id==='casemate'){
  box('earth',[-13,-.05,-6],[13,.08,6],dark);box('earth',[-13,0,-6],[-12.4,5,-1.5],concrete);box('earth',[-13,0,1.5],[-12.4,5,6],concrete);for(const z of [-6,5.4])box('earth',[-13,0,z],[13,5,z+.6],concrete);
  // East wall strips leave two real visible openings (world z37/43), without inventing collision.
  box('earth',[12.4,0,-6],[13,3.5,6],concrete);box('earth',[12.4,4.5,-6],[13,5,6],concrete);for(const [z0,z1]of [[-6,-4],[-2,2],[4,6]])box('earth',[12.4,3.5,z0],[13,4.5,z1],concrete);
  box('earth',[-13,5,-6],[13,5.6,6],concrete);box('earth',[-13.3,5.6,-6.3],[13.3,6.05,6.3],earth);
  if(lod<2){for(const z of [-3,3])box('steel',[11.95,3.42,z-1.05],[13.1,3.5,z+1.05],hex('#4f534d'));box('wood',[-10,.5,-5],[-6,.7,-4]);}
  if(lod===0){for(let x=-11;x<13;x+=2.2)for(const z of [-6.012,6.012])box('earth',[x,.15,z-.01],[x+.035,4.95,z+.01],hex('#5f6258'));for(let x=-11;x<13;x+=3)m.blob('earth',{rad:[1.4,.18,2.4],at:[x,6.05,0],nu:8,nv:4,color:earth});}
 }
 weather(m);for(const part of m.parts.values())for(let i=0;i<part.nrm.length;i++)if(Math.abs(part.nrm[i])<1e-12)part.nrm[i]=0;return {m,surfaces};
}
export function generate(){const files=new Map(),structures=[];for(const d of DEFINITIONS){const entry={...d,license:'CC0-1.0',files:{}};delete entry.surfaces;for(const variant of d.id==='forward_post'?['intact','destroyed']:['intact'])for(let lod=0;lod<3;lod++){const {m,surfaces}=modelFor(d,lod,variant==='destroyed');const enc=encodeGlb(m,{license:'CC0-1.0',anchor:d.anchor,collisionSurfaces:surfaces,decorativeEnvelope:true});if(enc.triangles>BUDGET[lod])throw Error(`${d.id} lod${lod}: ${enc.triangles}`);const file=`m01_${d.id}_${variant}_lod${lod}.glb`;files.set(file,enc.buffer);entry.files[`${variant}:lod${lod}`]={file,lod,variant,triangles:enc.triangles,bytes:enc.buffer.length,sha256:createHash('sha256').update(enc.buffer).digest('hex'),visualBounds:enc.bounds,collisionSurfaces:surfaces};}structures.push(entry);}const manifest={version:1,author:'COD-guerra project original procedural architecture',license:'CC0-1.0',units:'metres',axes:'+Y up, local coordinates translated by anchor',historicalStatus:'Artistic reconstruction, not measured historical architecture',collisionPolicy:'Only collisionSurfaces reference authoritative world boxes; all other geometry is decoration. No solids or routes added.',generator:'tools/assets/m01-field-structures/build.mjs',budgets:BUDGET,structures};files.set('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));return {files,manifest};}
if(process.argv[1]===fileURLToPath(import.meta.url)){const {files}=generate();if(process.argv.includes('--check')){for(const [name,bytes]of files)if(!readFileSync(OUT+'/'+name).equals(bytes))throw Error('Not reproduced: '+name);console.log('Field structures: all 16 files reproduced byte for byte');}else{mkdirSync(OUT,{recursive:true});for(const [name,bytes]of files)writeFileSync(OUT+'/'+name,bytes);console.log('Generated '+files.size+' original structure files');}}
