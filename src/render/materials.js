import { CanvasTexture, RepeatWrapping, SRGBColorSpace, MeshStandardMaterial } from 'three';

// Original procedural surfaces, generated once. No external or game-extracted textures.
export function surface(kind,color){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  let seed=347;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<5000;i++){
    ctx.fillStyle=`rgba(${random()>.5?'255,242,215':'20,18,13'},${random()*.12})`;
    ctx.fillRect(random()*256,random()*256,1+random()*3,1+random()*3);
  }
  if(kind==='brick'||kind==='stone'){
    const height=kind==='brick'?32:64,width=kind==='brick'?64:96;
    ctx.strokeStyle='rgba(35,31,26,.42)';ctx.lineWidth=3;
    for(let row=0;row<256/height;row++){
      ctx.beginPath();ctx.moveTo(0,row*height);ctx.lineTo(256,row*height);ctx.stroke();
      for(let col=-1;col<5;col++){
        const x=col*width+(row%2)*width/2;
        ctx.beginPath();ctx.moveTo(x,row*height);ctx.lineTo(x,(row+1)*height);ctx.stroke();
      }
    }
  }
  if(kind==='wood')for(let x=0;x<256;x+=5){ctx.fillStyle='rgba(36,21,11,.15)';ctx.fillRect(x,0,1,256);}
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.wrapS=map.wrapT=RepeatWrapping;
  return new MeshStandardMaterial({color:0xffffff,map,roughness:kind==='metal'?.48:.95,metalness:kind==='metal'?.7:0});
}
