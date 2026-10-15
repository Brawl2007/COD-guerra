// Original, fixed-seed PBR authoring. Dimensions and tile scales are artistic estimates, not survey measurements.
import { fbm, hash, clamp, smoothstep, worley } from './noise.mjs';
import { fieldLayer, meadowLayer, mudLayer, trackLayer, ballastLayer, wetbankLayer } from './layers.mjs';
export const ATLAS_SIZE = 1024;
export const CELL_SIZE = 256;
export const GUTTER = 4;
export const MATERIALS = Object.freeze([
  { id:'field', family:'terrain', tileMetres:4, color:[135,112,78], layer:fieldLayer },
  { id:'meadow', family:'terrain', tileMetres:4, color:[113,119,67], layer:meadowLayer },
  { id:'mud', family:'terrain', tileMetres:4, color:[83,66,46], layer:mudLayer },
  { id:'track', family:'terrain', tileMetres:1.6, color:[158,133,97], layer:trackLayer },
  { id:'ballast', family:'ballast', tileMetres:1.6, color:[142,139,127], layer:ballastLayer },
  { id:'brick', family:'masonry', tileMetres:1.2, color:[133,100,84] },
  { id:'stone', family:'masonry', tileMetres:2, color:[144,143,131] },
  { id:'wood', family:'wood', tileMetres:2, color:[127,101,68] },
  { id:'painted-steel', family:'steel', tileMetres:2, color:[103,116,106] },
  { id:'rusted-steel', family:'steel', tileMetres:2, color:[134,84,48] },
  { id:'canvas', family:'canvas', tileMetres:1, color:[145,139,104] },
  { id:'roof-tile', family:'roof', tileMetres:1.5, color:[130,99,79] },
  { id:'asphalt', family:'roof', tileMetres:2, color:[76,77,72] },
  { id:'wetbank', family:'terrain', tileMetres:4, color:[74,64,48], layer:wetbankLayer },
  { id:'mortar', family:'masonry', tileMetres:1, color:[155,151,136] },
  { id:'plaster', family:'masonry', tileMetres:2, color:[184,177,155] },
]);
const byte = v => Math.round(clamp(v)*255);
const fract = v => v-Math.floor(v);
const edge = v => Math.min(fract(v),1-fract(v));
const wrap = (v,n) => (v+n)%n;
function paint(spec,n){
  const height = new Float32Array(n*n), albedo = new Uint8Array(n*n*4), orm = new Uint8Array(n*n*4);
  const layer=spec.layer?.(n), cell={};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=y*n+x,u=(x+.5)/n,v=(y+.5)/n;
    const noise=fbm(u,v,8,3,710), fine=hash(x,y,827), broad=fbm(u,v,3,3,712);
    let h=layer?.height[i]??noise*.06, tone=layer?(.58+layer.luma[i]*.78):(.79+.32*noise+.1*(fine-.5));
    let rough=.92,metal=0,occlusion=.92,color=spec.color;
    if(spec.id==='brick'||spec.id==='stone'){
      const rows=spec.id==='brick'?8:4,cols=spec.id==='brick'?4:3,row=Math.floor(v*rows);
      const seam=Math.min(edge(v*rows),edge(u*cols+(row%2)*.5));
      const block=smoothstep(.025,.07,seam), individual=hash(Math.floor(u*cols+(row%2)*.5),row,927);
      tone*=.87+.25*individual;h=block*(.15+noise*.035);occlusion=.7+.3*block;
      if(spec.id==='brick'){color=[136*block+156*(1-block),102*block+150*(1-block),87*block+135*(1-block)];}
      else tone*=.75+.25*block;
    }else if(spec.id==='wood'){
      const grain=fbm(u,v,32,2,821),board=smoothstep(.015,.04,edge(u*6));
      tone*=.78+.33*grain;h=(grain*.04+noise*.035)*board;occlusion=.64+.36*board;rough=.78+.12*noise;
    }else if(spec.family==='steel'){
      const rust=spec.id==='rusted-steel'?smoothstep(.28,.55,broad):smoothstep(.54,.68,broad);
      color=spec.color.map((c,k)=>c*(1-rust)+[138,83,44][k]*rust);
      metal=.85*(1-rust)+.08*rust;rough=.39*(1-rust)+(.76+.16*noise)*rust;h=noise*.018+rust*.035;occlusion=.95;
    }else if(spec.id==='canvas'){
      const weave=(Math.floor(u*124)%2===0?1:-1)*(Math.floor(v*124)%2===0?1:-1);
      h=.018*weave+.06*noise;tone*=1+.08*weave;rough=.96;
    }else if(spec.id==='roof-tile'){
      const row=Math.floor(v*6),course=fract(v*6),joint=smoothstep(.02,.06,edge(u*5+(row%2)*.5));
      h=(.18*course+.05*noise)*joint;tone*=.73+.27*joint;occlusion=.65+.35*joint;rough=.78+.12*noise;
    }else if(spec.id==='asphalt'){
      const stone=worley(u,v,60,710,cell),aggregate=smoothstep(.04,.15,stone.f2-stone.f1);
      h=.05*aggregate+.035*noise;tone*=.7+.5*aggregate;rough=.84+.14*fine;occlusion=.76+.24*aggregate;
    }else if(spec.id==='mud'||spec.id==='wetbank'){rough=.43+.37*smoothstep(.25,.6,noise);}
    else if(spec.id==='ballast'){rough=.82+.15*noise;occlusion=.7+.3*layer.luma[i];}
    else if(spec.id==='plaster'){h=noise*.025;rough=.88;}
    height[i]=h;
    for(let c=0;c<3;c++)albedo[i*4+c]=Math.round(clamp(color[c]*tone,0,255));albedo[i*4+3]=255;
    orm[i*4]=byte(occlusion);orm[i*4+1]=byte(rough);orm[i*4+2]=byte(metal);orm[i*4+3]=255;
  }
  const normal=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=y*n+x,dx=(height[y*n+wrap(x+1,n)]-height[y*n+wrap(x-1,n)])*3,dy=(height[wrap(y+1,n)*n+x]-height[wrap(y-1,n)*n+x])*3;
    const length=Math.sqrt(dx*dx+dy*dy+1);normal[i*4]=byte(.5-dx/length*.5);normal[i*4+1]=byte(.5-dy/length*.5);normal[i*4+2]=byte(.5+.5/length);normal[i*4+3]=255;
  }
  return {albedo,normal,orm};
}
function downsample(src,size,normal=false){
  const n=size/2,out=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const p=(y*n+x)*4;
    for(let c=0;c<4;c++){let sum=0;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)sum+=src[((y*2+dy)*size+x*2+dx)*4+c];out[p+c]=Math.round(sum/4);}
    if(normal){const a=out[p]/127.5-1,b=out[p+1]/127.5-1,c=out[p+2]/127.5-1,len=Math.sqrt(a*a+b*b+c*c);out[p]=byte(a/len*.5+.5);out[p+1]=byte(b/len*.5+.5);out[p+2]=byte(c/len*.5+.5);}
  }return out;
}
export function buildMaterialAtlas(){
  const maps={albedo:new Uint8Array(ATLAS_SIZE**2*4),normal:new Uint8Array(ATLAS_SIZE**2*4),orm:new Uint8Array(ATLAS_SIZE**2*4)},n=CELL_SIZE-GUTTER*2;
  for(let index=0;index<MATERIALS.length;index++){
    const tile=paint(MATERIALS[index],n),cx=index%4*CELL_SIZE,cy=Math.floor(index/4)*CELL_SIZE;
    for(const role of Object.keys(maps))for(let y=0;y<CELL_SIZE;y++)for(let x=0;x<CELL_SIZE;x++){
      const source=(wrap(y-GUTTER,n)*n+wrap(x-GUTTER,n))*4,target=((cy+y)*ATLAS_SIZE+cx+x)*4;
      for(let c=0;c<4;c++)maps[role][target+c]=tile[role][source+c];
    }
  }
  const textures=[];
  for(const [role,pixels]of Object.entries(maps))for(const tier of ['high','low']){
    const size=tier==='high'?ATLAS_SIZE:ATLAS_SIZE/2;
    textures.push({file:`materials-${role}-${size}.png`,role,tier,width:size,height:size,pixels:tier==='high'?pixels:downsample(pixels,ATLAS_SIZE,role==='normal'),colorSpace:role==='albedo'?'sRGB':'linear'});
  }
  const materials=MATERIALS.map(({id,family,tileMetres},index)=>({id,family,tileMetres,scaleProvenance:'artistic estimate',cell:[index%4,Math.floor(index/4)],uv:[(index%4*CELL_SIZE+GUTTER)/ATLAS_SIZE,(Math.floor(index/4)*CELL_SIZE+GUTTER)/ATLAS_SIZE,n/ATLAS_SIZE,n/ATLAS_SIZE]}));
  return {textures,materials};
}
