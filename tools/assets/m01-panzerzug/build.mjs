// Original COD Guerra baked geometry. Conservative armoured consist; not an identified P6 reconstruction.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
const out=new URL('../../../assets/models/production/m01/panzerzug/',import.meta.url);await mkdir(out,{recursive:true});
function crc(b){let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),end=Buffer.alloc(4);n.writeUInt32BE(data.length);end.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,end]);}
function texture(){const size=256,raw=Buffer.alloc((size*4+1)*size);for(let y=0;y<size;y++){const row=y*(size*4+1);for(let x=0;x<size;x++){const h=((x*374761393+y*668265263)^(x*y*127))>>>0;const noise=(h%29)-14;const scratch=x%83<1&&y%71<32?22:0;const soot=8*Math.sin(x*.028)*Math.sin(y*.045);const v=Math.round(215+noise+scratch+soot);raw.set([v,v-2,v-5,255],row+1+x*4);}}const head=Buffer.alloc(13);head.writeUInt32BE(size);head.writeUInt32BE(size,4);head[8]=8;head[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const atlas=texture();await writeFile(new URL('armour-paint.png',out),atlas);
const files=[];
for(const lod of [0,1,2]){
 const seg=[12,8,8][lod],parts=[[],[],[]],features={};
 function add(g,p,mat=0,color=[.23,.25,.22],rot=[0,0,0],name='detail'){
  g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...p);
  for(const attribute of Object.values(g.attributes))if(!Array.from(attribute.array).every(Number.isFinite))throw Error('Non-finite '+name);
  if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
  if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
  const pos=g.attributes.position,colors=[];
  for(let i=0;i<pos.count;i++){const y=pos.getY(i),x=pos.getX(i),z=pos.getZ(i),grime=y<1.4?.7:1,wear=.95+.04*Math.sin(x*17+y*11+z*5);colors.push(...color.map(c=>Math.max(.003,c*grime*wear)));}
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));parts[mat].push(g);features[name]=(features[name]??0)+1;
 }
 const box=(s,p,m=0,c,rot,name)=>add(new T.BoxGeometry(...s),p,m,c,rot,name);
 const cyl=(r,l,p,axis='y',m=1,c,name)=>add(new T.CylinderGeometry(r,r,l,name==='rivets'?6:Math.min(seg,8),1),p,m,c,axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0],name);
 function bar(a,b,r=.025,m=1,c,name){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),g=new T.CylinderGeometry(r,r,d.length(),lod===0?6:4);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));add(g,av.add(bv).multiplyScalar(.5).toArray(),m,c,undefined,name);}
 function plate(outline,z0,z1,c,name){const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:z1-z0,bevelEnabled:false,steps:1,curveSegments:1});add(g,[0,0,z0],0,c,undefined,name);}
 const heights=[3.30,3.65,2.92,3.47,3.18],lengths=[14.2,14.7,13.7,14.0,14.4];
 for(let unit=0;unit<5;unit++){
  const z=unit*19,h=heights[unit],len=lengths[unit],paint=[[.22,.24,.20],[.25,.26,.23],[.17,.19,.17],[.23,.25,.23],[.28,.28,.24]][unit];
  // Visible open rail chassis, cross-members and bogies, not a solid block under the armour.
  for(const x of [-.63,.63])box([.13,.32,15.2],[x,.88,z],1,[.12,.13,.115],undefined,'chassis');
  for(const dz of (lod===2?[-4.8,4.8]:[-6.8,-4.8,-2,0,2,4.8,6.8]))box([2.4,.12,.20],[0,1.05,z+dz],1,[.18,.19,.17]);
  box([2.72,.17,15.2],[0,1.24,z],0,[.17,.18,.16],undefined,'footplate');
  // Faceted cladding with chamfered shoulders and a narrower roof. Five distinct roof/body profiles.
  const outline=[[-1.31,1.33],[1.31,1.33],[1.47,1.85],[1.47,h-.5],[1.05,h],[-1.05,h],[-1.47,h-.5],[-1.47,1.85]];
  plate(outline,z-len/2,z+len/2,paint,`hull_${unit}`);
  // Roof plate seams and side plates are modelled, with low-cost rivets only in close LOD.
  for(const side of [-1,1]){
   const x=side*1.49;
   for(const dz of (lod===2?[]:[-5.7,-3.8,-1.9,0,1.9,3.8,5.7])){
    box([.022,h-1.9,.035],[x,(h-.5+1.5)/2,z+dz],1,[.20,.21,.18],undefined,'plate_seams');
    if(lod===0)for(const y of [1.72,2.38])cyl(.024,.025,[x+side*.013,y,z+dz],'x',1,[.31,.30,.26],'rivets');
   }
   const doorZ=z+[-1.6,.6,4.5,-2.2,1.7][unit];
   box([.04,1.40,1.18],[x+side*.01,2.15,doorZ],0,paint.map(c=>c*.8),undefined,'door');
   if(lod<2){for(const dz of [-.62,.62])box([.035,1.48,.045],[x+side*.04,2.15,doorZ+dz],1,[.28,.29,.25]);bar([x+side*.13,2.10,doorZ+.39],[x+side*.13,2.38,doorZ+.39],.022);for(const y of [.37,.66,.94])box([.42,.06,.45],[side*1.50,y,doorZ],1,[.20,.21,.18],undefined,'steps');}
   // Dark backed slits suggest the already-authorized MG support, without a new gun model or weapon authority.
   const slots=unit===2?[-4.7,4.7]:unit%2===0?[-4.6,3.9]:[-3.8,2.8,5.0];
   for(const dz of slots){box([.045,.16,.57],[x+side*.025,h-.86,z+dz],2,[.009,.012,.009],undefined,'slits');
    if(lod<2)box([.10,.045,.71],[x+side*.06,h-.73,z+dz],0,paint.map(c=>c*1.1));}
   if(lod<2)for(const dz of [-5.9,5.7]){bar([side*1.58,1.48,z+dz],[side*1.58,2.7,z+dz],.023,1,[.27,.28,.24],'handrails');}
  }
  // Flat armored inspection hatches and ventilation cowls; no invented turret or artillery barrel.
  const hatchZ=z+[-3.2,1.9,0,-1.8,3.4][unit];
  box([1.08,.09,1.30],[unit%2?.25:-.25,h+.07,hatchZ],0,paint.map(c=>c*.85),undefined,'roof_hatch');
  if(lod<2){box([.30,.09,.065],[unit%2?.25:-.25,h+.16,hatchZ-.18],1,[.29,.29,.25]);box([.72,.18,1.4],[0,h+.1,z+4.7],0,paint,undefined,'ventilation');for(let k=0;k<5;k++)box([.055,.04,1.0],[-.28+k*.14,h+.20,z+4.7],2,[.035,.04,.03]);}
  // Center slot is a conservative armoured steam traction silhouette, covered by plates, not a class claim.
  if(unit===2){
   plate([[-1.19,2.7],[1.19,2.7],[1.19,3.7],[-1.19,3.7]],z+3.7,z+6.55,paint.map(c=>c*.93),'traction_cab');
   box([2.62,.11,3.12],[0,3.80,z+5.18],0,paint.map(c=>c*.8),undefined,'traction_roof');
   for(const side of [-1,1]){box([.025,.31,.9],[side*1.215,3.37,z+5.2],2,[.012,.018,.015]);if(lod<2)for(const y of [2.08,2.28,2.48])box([.06,.045,1.16],[side*1.52,y,z+2.6],2,[.027,.032,.025],undefined,'intake');}
   const shroud=new T.LatheGeometry([new T.Vector2(.18,0),new T.Vector2(.28,0),new T.Vector2(.26,.25),new T.Vector2(.24,.85),new T.Vector2(.32,.96),new T.Vector2(.20,.96),new T.Vector2(.18,.25)],seg);
   add(shroud,[0,h,z-4.6],0,[.065,.07,.062],undefined,'traction_chimney');
  }
  for(const end of [-1,1]){
   const outer=(unit===0&&end===-1)||(unit===4&&end===1),ez=z+end*(outer?7.7:9.08);
   if(!outer)for(const x of [-.63,.63])box([.15,.16,1.68],[x,1.02,(z+end*7.4+ez)/2],1,[.12,.13,.115],undefined,'buffer_platform');
   box([2.65,.24,.25],[0,1.02,ez],1,[.17,.18,.15],undefined,'buffer_beam');
   for(const side of [-1,1]){cyl(.10,.38,[side*.87,1.05,ez+end*.12],'z',1,[.23,.24,.21],'buffer');cyl(.22,.08,[side*.87,1.05,ez+end*.35],'z',1,[.32,.32,.28]);}
   bar([0,1.05,ez],[0,.68,ez+end*.37],.055,1,[.28,.27,.24],'coupling');
   box([.48,.42,.075],[0,2.40,z+end*(len/2+.02)],2,[.012,.016,.013],undefined,'end_hatch');
  }
  const bogiePositions=[-4.85,4.85];
  for(const dz of bogiePositions){
   for(const side of [-1,1]){
    box([.16,.25,3.2],[side*.88,.71,z+dz],1,[.135,.145,.13],undefined,'bogie');
    for(const offset of [-1.02,1.02]){
     const wz=z+dz+offset;const wheel=new T.CylinderGeometry(.46,.46,.16,seg);add(wheel,[side*.78,.46,wz],1,[.21,.22,.20],[0,0,Math.PI/2],'wheels');
     if(lod<2){const rim=new T.TorusGeometry(.42,.045,3,seg);add(rim,[side*.89,.46,wz],1,[.35,.35,.31],[0,Math.PI/2,0],'wheel_rims');}
     if(lod<2)cyl(.105,.18,[side*.93,.46,wz],'x',1,[.17,.18,.16],'axlebox');
     if(lod<2)for(const y of [.67,.73,.79])box([.15,.025,.68],[side*.98,y,wz],1,[.25,.25,.22],undefined,'springs');
    }
   }
   cyl(.08,1.65,[0,.46,z+dz],'x',1,[.09,.10,.08]);
  }
  if(lod<2){box([.7,.38,1.12],[.34,.90,z-2.6],1,[.11,.12,.10],undefined,'underframe_box');cyl(.18,1.6,[-.45,.89,z+1.5],'z',1,[.12,.13,.11]);}
 }
 // Merge by surface class: three draws at every LOD, shared embedded atlas, no runtime modelling.
 const merged=parts.map(gs=>mergeGeometries(gs));const bin=[],views=[],accessors=[];let offset=0;
 const data=(bytes,target)=>{const b=Buffer.from(bytes.buffer??bytes,bytes.byteOffset??0,bytes.byteLength??bytes.length),pad=(4-b.length%4)%4;const id=views.length;views.push({buffer:0,byteOffset:offset,byteLength:b.length,...(target?{target}:{})});bin.push(b,Buffer.alloc(pad));offset+=b.length+pad;return id;};
 const acc=(a,type,target)=>{const id=accessors.length,v=data(a,target),n={SCALAR:1,VEC2:2,VEC3:3}[type],info={bufferView:v,componentType:a instanceof Float32Array?5126:a instanceof Uint32Array?5125:5123,count:a.length/n,type};if(type==='VEC3'&&target===34962){info.min=[Infinity,Infinity,Infinity];info.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i++) {const k=i%3;info.min[k]=Math.min(info.min[k],a[i]);info.max[k]=Math.max(info.max[k],a[i]);}}accessors.push(info);return id;};
 let triangles=0;const meshes=merged.map((g,i)=>{const attrs={};for(const [key,type,semantic] of [['position','VEC3','POSITION'],['normal','VEC3','NORMAL'],['uv','VEC2','TEXCOORD_0'],['color','VEC3','COLOR_0']])attrs[semantic]=acc(g.attributes[key].array,type,34962);triangles+=g.index.count/3;return {name:['armoured_plates','chassis_rims','recesses'][i],primitives:[{attributes:attrs,indices:acc(g.index.array,'SCALAR',34963),material:i}]};});
 const image=data(atlas),materials=[{name:'paint_dirt_armour',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:.32,roughnessFactor:.82}},{name:'worn_steel_buffers_bogies',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:.65,roughnessFactor:.48}},{name:'dark_slits_vents',pbrMetallicRoughness:{metallicFactor:.08,roughnessFactor:.95}}];
 const j={asset:{version:'2.0',generator:'COD Guerra original panzerzug builder',copyright:'Original COD Guerra; CC0-1.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'m01_panzerzug_visual',children:[1,2,3],extras:{units:'metres',forward:'-Z',lod,historicalIdentity:'Panzerzug 7 composition unresolved (P6); conservative generic five-slot interpretation',features}},...meshes.map((m,i)=>({name:m.name,mesh:i}))],meshes,materials,textures:[{sampler:0,source:0}],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],images:[{bufferView:image,mimeType:'image/png'}],accessors,bufferViews:views,buffers:[{byteLength:offset}]};
 const json=Buffer.from(JSON.stringify(j)),jp=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),bp=Buffer.concat(bin),head=Buffer.alloc(20),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+jp.length+bp.length,8);head.writeUInt32LE(jp.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bp.length);bh.writeUInt32LE(0x004e4942,4);const bytes=Buffer.concat([head,jp,bh,bp]);
 const file=`m01_panzerzug_visual_lod${lod}.glb`;await writeFile(new URL(file,out),bytes);
 const box3=new T.Box3();for(const g of merged){g.computeBoundingBox();box3.union(g.boundingBox);}files.push({file,lod,triangles,drawCalls:3,materials:3,textures:1,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),bounds:{min:box3.min.toArray(),max:box3.max.toArray()},features});
 for(const g of [...parts.flat(),...merged])g.dispose();
}
await writeFile(new URL('manifest.json',out),JSON.stringify({version:1,author:'Original COD Guerra geometry and paint',license:'CC0-1.0',units:'metres',forward:'-Z',historicalIdentity:'Panzerzug 7 presence documented; P6 composition/calibres unresolved',representation:'Five pre-existing presentation slots, generic armoured profiles. Not a measured reconstruction.',armament:'No new barrel, turret, cannon, AA or gameplay weapon. Existing MG support unchanged; dark slits only.',placements:[0,1,2,3,4].map(i=>[1119+i*19,0,2.5]),modelPlacement:{position:[1119,0,2.5],rotationY:Math.PI/2,railContactOffsetY:-.82,scale:1},motion:'Stationary; no synthetic wheel or weapon motion',files},null,2)+'\n');console.log(JSON.stringify(files.map(({features,...f})=>f),null,2));
