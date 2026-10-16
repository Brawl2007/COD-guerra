import * as THREE from 'three';

const hash=(x,y,seed=73)=>{let h=Math.imul(x,374761393)+Math.imul(y,668265263)+seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
const smooth=t=>t*t*(3-2*t);
function noise(x,y){
  const i=Math.floor(x),j=Math.floor(y),u=smooth(x-i),v=smooth(y-j),h=(a,b)=>hash(a,b);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(i,j),h(i+1,j),u),THREE.MathUtils.lerp(h(i,j+1),h(i+1,j+1),u),v);
}

export function dustPuffTexture(size=128){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),im=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/(size-1),v=y/(size-1),dx=(u-.5)*1.65,dy=(v-.5)*2.35,r=Math.hypot(dx,dy);
    const coarse=noise(u*5.2+3.4,v*4.1+7.2),fine=noise(u*18.0+1.1,v*14.0+5.7);
    const groundBias=Math.max(0,1-Math.abs(v-.53)*1.55),edge=Math.max(0,1-r*r);
    const alpha=Math.max(0,(coarse*.72+fine*.28-.24)*1.5)*edge*groundBias;
    const grain=(hash(x>>1,y>>1,91)-.5)*16,at=(y*size+x)*4;
    im.data[at]=Math.max(0,Math.min(255,184+grain));im.data[at+1]=Math.max(0,Math.min(255,169+grain));im.data[at+2]=Math.max(0,Math.min(255,139+grain));im.data[at+3]=Math.floor(Math.min(.88,alpha)*255);
  }
  ctx.putImageData(im,0,0);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.anisotropy=2;return map;
}
