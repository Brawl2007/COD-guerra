import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {encodePng} from '../../m01-materials/src/png.mjs';
export const FAMILIES=Object.freeze({
 'painted-steel':{tileMetres:2,color:[101,111,105],metalness:.12,roughness:.58,kind:'steel'},
 'rusted-steel':{tileMetres:2,color:[110,86,64],metalness:.32,roughness:.83,kind:'steel'},
 brick:{tileMetres:2,color:[131,111,99],metalness:0,roughness:.88,kind:'brick'},
 stone:{tileMetres:2,color:[139,140,131],metalness:0,roughness:.85,kind:'stone'},
 soot:{tileMetres:2,color:[92,91,86],metalness:0,roughness:.93,kind:'stone'},
 road:{tileMetres:2,color:[101,98,90],metalness:0,roughness:.94,kind:'road'},
 timber:{tileMetres:2,color:[118,104,82],metalness:0,roughness:.84,kind:'wood'},
 rail:{tileMetres:2,color:[121,125,122],metalness:.83,roughness:.43,kind:'steel'}
});
const clamp=x=>Math.max(0,Math.min(255,Math.round(x)));
const noise=(x,y,s)=>{let n=Math.imul(x+19,374761393)^Math.imul(y+31,668265263)^Math.imul(s,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
export function surface(id,u,v){
 const f=FAMILIES[id],n=noise(Math.floor(u*128),Math.floor(v*128),id.length),coarse=noise(Math.floor(u*16),Math.floor(v*16),id.charCodeAt(0));
 let relief=0,shade=1,ao=1,rough=f.roughness,metal=f.metalness;
 if(f.kind==='steel'){
  const dx=Math.abs((u*4+.5)%1-.5),dy=Math.abs((v*4+.5)%1-.5),r=Math.hypot(dx,dy),rivet=r<.032;
  relief=rivet?.9*Math.sqrt(1-(r/.032)**2):.025*(n-.5);ao=r<.05&&!rivet?.58:1;
  const rust=coarse>.68||id==='rusted-steel';shade=rust?.78+.24*n:.94+.12*n;rough+=rust?.11:.06*(n-.5);metal*=rust?.57:1;
 }else if(f.kind==='brick'||f.kind==='stone'){
  const rows=f.kind==='brick'?16:4,cols=f.kind==='brick'?8:4,row=Math.floor(v*rows),x=(u*cols+(row%2)*.5)%1,y=(v*rows)%1,mortar=x<.045||y<.075;
  relief=mortar?-.36:.08*coarse;shade=mortar?1.23:.85+.24*coarse;ao=mortar?.64:1;rough+=.08*(n-.5);
 }else if(f.kind==='wood'){const grain=Math.sin(u*180+Math.sin(v*12)*2)*.5+.5;relief=.09*grain;shade=.82+.25*grain+.06*n;rough+=.1*(grain-.5);ao=.92+.08*grain;}
 else {relief=.09*(n-.5);shade=.86+.23*n;rough+=.05*(n-.5);}
 return {relief,shade,ao,rough:Math.min(1,rough),metal};
}
export function generate(){
 const files=[],manifest={version:1,family:'original-bridge-material-sidecar',author:'COD-guerra project, original procedural',license:'CC0-1.0',source:'tools/assets/m01-bridges/materials/generate.mjs',provenance:'New authored sidecar only. Original provisional bridge GLBs and their unchosen licence remain unchanged. Palette/scale are artistic estimates.',units:'metres; seamless repeating separate family textures, no atlas bleed',normalConvention:'tangent +Y',channels:{albedo:'sRGB RGB; opaque A',normal:'linear tangent XYZ; opaque A',orm:'linear R ambient occlusion, G roughness, B metalness; opaque A'},materials:FAMILIES,files:[],budget:{units:'RGBA8 decoded, excluding separately reported full mip chains',tiers:{}}};
 for(const [tier,size] of [['high',256],['low',128]]){
  for(const [id,f] of Object.entries(FAMILIES)){
   const maps={albedo:new Uint8Array(size*size*4),normal:new Uint8Array(size*size*4),orm:new Uint8Array(size*size*4)};
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size,a=surface(id,u,v),du=surface(id,((x+1)%size)/size,v).relief-surface(id,((x-1+size)%size)/size,v).relief,dv=surface(id,u,((y+1)%size)/size).relief-surface(id,u,((y-1+size)%size)/size).relief;
    const nx=-du*2,ny=-dv*2,nz=1,len=Math.hypot(nx,ny,nz),i=(y*size+x)*4;
    maps.albedo.set([...f.color.map(c=>clamp(c*a.shade)),255],i);maps.normal.set([clamp((nx/len*.5+.5)*255),clamp((ny/len*.5+.5)*255),clamp((nz/len*.5+.5)*255),255],i);maps.orm.set([clamp(a.ao*255),clamp(a.rough*255),clamp(a.metal*255),255],i);
   }
   for(const [role,pixels] of Object.entries(maps)){const file=`${id}.${tier}.${role}.png`,bytes=encodePng(pixels,size,size),entry={file,id,tier,role,width:size,height:size,bytes:bytes.length,decodedBytes:size*size*4,sha256:createHash('sha256').update(bytes).digest('hex'),tileMetres:f.tileMetres,colorSpace:role==='albedo'?'sRGB':'linear',flipY:false,wrap:'repeat',mipmaps:true};files.push({...entry,bytes,pixels});manifest.files.push(entry);}
  }
  const decodedBytes=manifest.files.filter(f=>f.tier===tier).reduce((n,f)=>n+f.decodedBytes,0);manifest.budget.tiers[tier]={decodedBytes,mipmapBytes:decodedBytes/3-Object.keys(FAMILIES).length*4,limitBytes:(tier==='high'?16:4)*1048576};
 }
 files.push({file:'manifest.json',bytes:Buffer.from(JSON.stringify(manifest,null,2)+'\n')});return {files,manifest};
}
export function writeOrCheck(out,check=false){const {files,manifest}=generate();if(!check)mkdirSync(out,{recursive:true});for(const f of files){if(check){if(!readFileSync(path.join(out,f.file)).equals(f.bytes))throw new Error(`Regeneration mismatch: ${f.file}`);}else writeFileSync(path.join(out,f.file),f.bytes);}return manifest;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const i=process.argv.indexOf('--out'),out=i>=0?process.argv[i+1]:fileURLToPath(new URL('../../../../assets/models/provisional/m01/m01-bridges/materials/',import.meta.url));const m=writeOrCheck(out,process.argv.includes('--check'));console.log(JSON.stringify({check:process.argv.includes('--check'),files:m.files.length,budget:m.budget}));}
