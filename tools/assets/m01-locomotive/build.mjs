// Original COD Guerra geometry. Generic pre-war freight engine; NOT an identified class of train 963.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
const out=new URL('../../../assets/models/production/m01/locomotive/',import.meta.url);await mkdir(out,{recursive:true});
function crc(b){let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),end=Buffer.alloc(4);n.writeUInt32BE(data.length);end.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,end]);}
function texture(){const size=256,raw=Buffer.alloc((size*4+1)*size);for(let y=0;y<size;y++){const row=y*(size*4+1);for(let x=0;x<size;x++){const h=((x*374761393+y*668265263)^(x*y*127))>>>0;const noise=(h%29)-14;const scratch=x%83<1&&y%71<32?22:0;const soot=8*Math.sin(x*.028)*Math.sin(y*.045);const v=Math.round(215+noise+scratch+soot);raw.set([v,v-2,v-5,255],row+1+x*4);}}const head=Buffer.alloc(13);head.writeUInt32BE(size);head.writeUInt32BE(size,4);head[8]=8;head[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const atlas=texture();await writeFile(new URL('weathered-metal.png',out),atlas);
const files=[];
for(const lod of [0,1,2]){
 const seg=[24,14,8][lod],parts=[[],[],[]],features={};
 function add(g,p,mat=0,color=[.14,.155,.15],rot=[0,0,0],name='detail'){
  g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...p);
  if(!g.index){const ids=Array.from({length:g.attributes.position.count},(_,i)=>i);g.setIndex(ids);}
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  const pos=g.attributes.position,colors=[];for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);const grain=Math.sin(x*19+y*17+z*11)*.03;
   const grime=y<1.1?.72:1;colors.push(...color.map(c=>Math.max(.004,c*grime+grain*c)));
  }g.setAttribute('color',new T.Float32BufferAttribute(colors,3));parts[mat].push(g);features[name]=(features[name]??0)+1;
 }
 const box=(s,p,m=0,c,rot,name)=>add(new T.BoxGeometry(...s),p,m,c,rot,name);
 const cyl=(r,l,p,axis='y',m=0,c,name)=>add(new T.CylinderGeometry(r,r,l,seg,1),p,m,c,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0],name);
 const ring=(r,t,p,axis='z',m=1,c,name)=>add(new T.TorusGeometry(r,t,lod===0?4:3,seg),p,m,c,axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:[0,0,0],name);
 function bar(a,b,r=.025,m=1,c,name){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),g=new T.CylinderGeometry(r,r,d.length(),lod===0?6:4);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));add(g,av.add(bv).multiplyScalar(.5).toArray(),m,c,undefined,name);}
 // Open chassis, running boards, front beam. Native forward -Z; entire length retained within old 17 m footprint.
 for(const x of [-.53,.53])box([.12,.46,9.6],[x,.82,-2.5],0,[.105,.085,.075],undefined,'frame');
 for(const z of [-6.8,-5,-3.3,-1.6,.2,2])box([1.5,.12,.16],[0,.95,z]);
 for(const x of [-1.18,1.18]){box([.46,.10,8.7],[x,1.58,-2.7]);for(const z of [-6.4,-.7,1.9])box([.15,.5,.3],[x,1.27,z]);}
 box([2.6,.26,.22],[0,1.08,-8.0],0,[.27,.105,.073],undefined,'buffer_beam');
 // Tapered boiler and large separately banded smokebox; domes/chimney are lathed profiles.
 const boiler=new T.LatheGeometry([new T.Vector2(0,-3.2),new T.Vector2(.78,-3.2),new T.Vector2(.94,-2.6),new T.Vector2(.94,2.4),new T.Vector2(.86,3),new T.Vector2(0,3)],seg);add(boiler,[0,2.61,-3.2],0,[.135,.15,.145],[Math.PI/2,0,0],'boiler');
 cyl(.93,1.45,[0,2.61,-6.98],'z',0,[.072,.08,.078],'smokebox');cyl(.85,.10,[0,2.61,-7.75],'z',0,[.09,.095,.087],'smokebox_door');
 for(const z of [-6.25,-4.5,-2.4,-.5])ring(.945,.022,[0,2.61,z],'z',0,[.24,.25,.23],'boiler_bands');
 ring(.87,.027,[0,2.61,-7.81],'z',1,[.21,.23,.22]);
 bar([-.29,2.61,-7.87],[.29,2.61,-7.87],.033);bar([0,2.3,-7.87],[0,2.92,-7.87],.028);cyl(.1,.12,[0,2.61,-7.87],'z',1,[.30,.32,.30]);
 const chimney=new T.LatheGeometry([new T.Vector2(.18,0),new T.Vector2(.31,0),new T.Vector2(.26,.14),new T.Vector2(.20,.56),new T.Vector2(.28,.69),new T.Vector2(.28,.77),new T.Vector2(.16,.77),new T.Vector2(.16,.2)],seg);
 add(chimney,[0,3.44,-6.6],0,[.063,.064,.062],undefined,'chimney');
 for(const z of [-3.95,-1.6]){const dome=new T.LatheGeometry([new T.Vector2(.40,0),new T.Vector2(.37,.15),new T.Vector2(.32,.44),new T.Vector2(.20,.53),new T.Vector2(0,.56)],seg);add(dome,[0,3.42,z],0,undefined,undefined,'domes');}
 if(lod<2){for(const side of [-1,1]){bar([side*.98,3.0,-6.9],[side*.98,3.0,-.1],.025,1,[.33,.34,.30],'handrail');for(const z of [-6.6,-4.5,-2.5,-.3])bar([side*.78,3.05,z],[side*.98,3.0,z],.018);const pts=[[-6.2,1.9],[-5.8,1.85],[-5.5,1.6],[-1,1.6],[-.4,1.85]].map(([z,y])=>new T.Vector3(side*.96,y,z));add(new T.TubeGeometry(new T.CatmullRomCurve3(pts),lod===0?24:12,.045,6,false),[0,0,0],0,[.28,.22,.15],undefined,'pipes');}}
 // Cab walls assembled around genuine openings. Curved roof + interior avoids a solid box read.
 box([2.62,.16,2.2],[0,1.68,1.35],0,undefined,undefined,'cab');
 for(const side of [-1,1]){const x=side*1.29;box([.07,1.12,2.1],[x,2.25,1.35]);box([.07,.27,2.1],[x,3.82,1.35]);for(const z of [.32,1.6,2.36])box([.08,1.02,.12],[x,3.28,z]);
  // One framed glazed side pane; open rear doorway.
  box([.025,.76,1.03],[x,3.29,.94],2,[.025,.055,.07]);
  if(lod<2){for(const z of [.43,1.46])box([.10,.86,.038],[x,3.29,z],1,[.30,.28,.22]);for(const y of [2.87,3.72])box([.1,.045,1.08],[x,y,.94],1,[.3,.28,.22]);for(const y of [.55,.9,1.25])box([.52,.065,.32],[side*1.32,y,2.3],1,[.19,.19,.17],undefined,'steps');}
 }
 // Cab front/rear pillars, front glass, dark firebox, footplate roof arc.
 box([2.58,1.0,.08],[0,2.28,.29]);for(const x of [-1.22,-.53,.53,1.22])box([.12,1.13,.08],[x,3.3,.29]);
 for(const x of [-.9,.9])box([.55,.85,.025],[x,3.30,.235],2,[.035,.057,.065]);
 box([.9,.9,.8],[0,2.25,.45],0,[.082,.075,.067],undefined,'firebox');
 const roof=new T.CylinderGeometry(3.1,3.1,2.65,seg,1,true,Math.PI-.46,.92);roof.rotateX(Math.PI/2);add(roof,[0,1.12,1.32],0,[.095,.105,.10],undefined,'cab_roof');
 // Wheels: visible annular rims and open spokes, not solid cylinders. Four coupled axles + leading axle.
 function wheel(x,y,z,r,spokes){ring(r-.06,.065,[x,y,z],'x',1,[.30,.31,.29],'wheel_rim');cyl(.14,.22,[x,y,z],'x',0,[.24,.19,.13],'wheel_hub');
  if(lod===2){cyl(r-.12,.1,[x,y,z],'x',0,[.095,.075,.058]);return;}
  for(let j=0;j<(lod===1?Math.min(spokes,8):spokes);j++){const a=j*Math.PI*2/(lod===1?Math.min(spokes,8):spokes);bar([x,y+Math.sin(a)*.12,z+Math.cos(a)*.12],[x,y+Math.sin(a)*(r-.12),z+Math.cos(a)*(r-.12)],lod===0?.037:.05,0,[.23,.18,.13],'spokes');}}
 for(const z of [-4.95,-3.39,-1.83,-.27]){cyl(.11,1.56,[0,.73,z],'x');for(const s of [-1,1])wheel(s*.79,.73,z,.73,12);}
 for(const s of [-1,1])wheel(s*.78,.46,-6.65,.46,8);
 for(const s of [-1,1]){const x=s*1.03;box([.14,.15,5.15],[x,.72,-2.61],1,[.43,.42,.38],undefined,'coupling_rod');
  for(const z of [-4.95,-3.39,-1.83,-.27])cyl(.10,.09,[x+s*.03,.72,z],'x',1,[.36,.36,.32],'crankpin');
  cyl(.27,.9,[s*.82,1.13,-5.62],'z',0,[.11,.12,.10],'cylinder');bar([x,1.05,-5.45],[x,.85,-3.15],.058,1,[.40,.41,.38],'connecting_rod');
  if(lod<2){bar([x,1.37,-5.4],[x,1.37,-3.55],.032,1,[.32,.33,.31],'valve_gear');bar([x,1.35,-3.55],[x,1.02,-3.2],.035,1,[.32,.33,.31]);}
 }
 // Tender, rolled top edge, recessed coal basin and three separate axles.
 box([2.50,.30,4.45],[0,1.15,5.91],0,[.11,.10,.085],undefined,'tender');
 box([2.4,1.4,3.10],[0,2.02,6.5],0,[.13,.15,.14]);
 for(const s of [-1,1]){box([.095,.78,1.45],[s*1.21,2.56,4.40]);box([.14,.14,4.5],[s*1.22,2.98,5.85]);}
 box([2.38,.13,1.65],[0,2.30,4.50],0,[.04,.043,.04],undefined,'coal');
 const coalCount=[50,18,5][lod];for(let i=0;i<coalCount;i++){const x=((i*37)%101)/101*2.1-1.05,z=3.9+((i*71)%101)/101*1.2;const g=new T.IcosahedronGeometry(.16+(i%4)*.03,0);g.scale(1,.5,1.2);add(g,[x,2.4+(i%3)*.045,z],0,[.025,.028,.027],undefined,'coal_lumps');}
 for(const z of [4.15,5.83,7.48])for(const s of [-1,1]){wheel(s*.79,.46,z,.46,8);box([.18,.3,.42],[s*.9,.78,z],0,[.10,.085,.07]);}
 // Front and tender buffers, coupling hooks, lamps, toolbox and brake equipment.
 for(const z of [-8.06,8.05]){for(const s of [-1,1]){cyl(.10,.40,[s*.88,1.06,z],'z',1,[.24,.25,.22],'buffer');cyl(.23,.08,[s*.88,1.06,z+Math.sign(z)*.23],'z',0,[.20,.19,.17]);}bar([0,1.06,z],[0,.68,z+Math.sign(z)*.30],.07,1,[.25,.24,.21],'coupling');}
 for(const s of [-1,1]){box([.26,.36,.24],[s*.99,1.8,-7.6]);cyl(.10,.05,[s*.99,1.80,-7.75],'z',2,[.30,.32,.27],'lamp');}
 if(lod<2){box([.5,.30,.70],[1.10,1.83,-.8]);cyl(.16,1.3,[-.68,1.30,5.7],'z',0,[.18,.16,.13]);for(const z of [-7.74,3.45,7.95])for(const x of [-1.13,1.13])bar([x,1.4,z],[x,2.7,z],.024);}
 // Merge by surface class: three draws at every LOD, shared embedded atlas, no runtime modelling.
 const merged=parts.map(gs=>mergeGeometries(gs));const bin=[],views=[],accessors=[];let offset=0;
 const data=(bytes,target)=>{const b=Buffer.from(bytes.buffer??bytes,bytes.byteOffset??0,bytes.byteLength??bytes.length),pad=(4-b.length%4)%4;const id=views.length;views.push({buffer:0,byteOffset:offset,byteLength:b.length,...(target?{target}:{})});bin.push(b,Buffer.alloc(pad));offset+=b.length+pad;return id;};
 const acc=(a,type,target)=>{const id=accessors.length,v=data(a,target),n={SCALAR:1,VEC2:2,VEC3:3}[type],info={bufferView:v,componentType:a instanceof Float32Array?5126:a instanceof Uint32Array?5125:5123,count:a.length/n,type};if(type==='VEC3'&&target===34962){info.min=[Infinity,Infinity,Infinity];info.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i++) {const k=i%3;info.min[k]=Math.min(info.min[k],a[i]);info.max[k]=Math.max(info.max[k],a[i]);}}accessors.push(info);return id;};
 let triangles=0;const meshes=merged.map((g,i)=>{const attrs={};for(const [key,type,semantic] of [['position','VEC3','POSITION'],['normal','VEC3','NORMAL'],['uv','VEC2','TEXCOORD_0'],['color','VEC3','COLOR_0']])attrs[semantic]=acc(g.attributes[key].array,type,34962);triangles+=g.index.count/3;return {name:['paint_and_soot','exposed_metal','glazed_windows'][i],primitives:[{attributes:attrs,indices:acc(g.index.array,'SCALAR',34963),material:i}]};});
 const image=data(atlas),materials=[{name:'paint_soot_coal',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:.25,roughnessFactor:.84}},{name:'worn_steel_rods_rims',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:.72,roughnessFactor:.42}},{name:'dark_glass_lamp',pbrMetallicRoughness:{metallicFactor:.25,roughnessFactor:.22}}];
 const j={asset:{version:'2.0',generator:'COD Guerra original locomotive builder',copyright:'Original COD Guerra; CC0-1.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'m01_locomotive_freight',children:[1,2,3],extras:{units:'metres',forward:'-Z',lod,historicalIdentity:'Unidentified train 963 engine (P16); generic pre-war freight representation',features}},...meshes.map((m,i)=>({name:m.name,mesh:i}))],meshes,materials,textures:[{sampler:0,source:0}],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],images:[{bufferView:image,mimeType:'image/png'}],accessors,bufferViews:views,buffers:[{byteLength:offset}]};
 const json=Buffer.from(JSON.stringify(j)),jp=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),bp=Buffer.concat(bin),head=Buffer.alloc(20),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+jp.length+bp.length,8);head.writeUInt32LE(jp.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bp.length);bh.writeUInt32LE(0x004e4942,4);const bytes=Buffer.concat([head,jp,bh,bp]);
 const file=`m01_locomotive_freight_lod${lod}.glb`;await writeFile(new URL(file,out),bytes);
 const box3=new T.Box3();for(const g of merged){g.computeBoundingBox();box3.union(g.boundingBox);}files.push({file,lod,triangles,drawCalls:3,materials:3,textures:1,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),bounds:{min:box3.min.toArray(),max:box3.max.toArray()},features});
 for(const g of [...parts.flat(),...merged])g.dispose();
}
await writeFile(new URL('manifest.json',out),JSON.stringify({version:1,author:'Original COD Guerra geometry and paint',license:'CC0-1.0',units:'metres',forward:'-Z',historicalClass:'UNKNOWN (P16)',numbering:'963 is a service number; no locomotive number or railway insignia authored',visualDimensions:'Conservative generic proportions, not a measured historical reconstruction',placement:{position:[1075,0,-2.5],rotationY:Math.PI/2,scale:1},motion:'Stationary in current M01; no synthetic wheel or valve motion',files},null,2)+'\n');console.log(JSON.stringify(files.map(({features,...f})=>f),null,2));
