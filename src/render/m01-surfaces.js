import * as THREE from 'three';

// Original, repeatable art. These surfaces have no network or gameplay dependency.
const hash=(x,y,seed=17)=>{let h=Math.imul(x,374761393)+Math.imul(y,668265263)+seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
const smooth=t=>t*t*(3-2*t);
function noise(x,y,period){
  const i=Math.floor(x),j=Math.floor(y),u=smooth(x-i),v=smooth(y-j),h=(a,b)=>hash((a%period+period)%period,(b%period+period)%period);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(i,j),h(i+1,j),u),THREE.MathUtils.lerp(h(i,j+1),h(i+1,j+1),u),v);
}
export function artTexture(kind,size=512){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);
  const colors={soil:[112,103,82],brick:[125,79,58],stone:[142,133,113],wood:[106,73,43],cloth:[151,148,123],metal:[111,119,115],water:[111,140,145],leather:[93,59,37],skin:[190,148,110]};
  const base=colors[kind]??colors.soil;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let n=0;
    for(const [period,amplitude]of [[4,28],[16,20],[64,16],[256,10]])n+=(noise(x/size*period,y/size*period,period)-.5)*amplitude;
    n+=(hash(x,y,23)-.5)*22;
    if(kind==='cloth')n*=.22;if(kind==='skin')n*=.1;
    let c=base.map(v=>v+n);
    if(kind==='soil'){
      const gravel=hash(x>>2,y>>2,91);
      if(gravel>.94)c=c.map(v=>v+25+(x%4-y%4)*3);
      if(gravel<.06)c=c.map(v=>v-21);
    }
    if(kind==='brick'||kind==='stone'){
      n*=.5;c=base.map(v=>v+n);
      const rows=kind==='brick'?8:4,row=Math.floor(y/size*rows),cols=kind==='brick'?4:3;
      const u=(x/size*cols+(row%2)*.5)%1,v=(y/size*rows)%1;
      const mortar=u<.025||v<.045;
      if(mortar)c=[70+n,67+n,57+n];
      else{const variation=(hash(Math.floor(x/size*cols+(row%2)*.5),row)-.5)*38;c=c.map(v=>v+variation);if(u<.05||v<.075)c=c.map(v=>v+12);}
    }
    if(kind==='wood'||kind==='leather'){
      const grain=Math.sin(x*.27+noise(x/32,y/128,16)*7)*7+Math.sin(x*1.7+y*.002)*3;
      c=c.map(v=>v+grain);if(kind==='wood'&&x%(size/8)<3)c=c.map(v=>v-22);
    }
    if(kind==='cloth'){const weave=((x%4<2) !== (y%4<2))?7:-5;c=c.map(v=>v+weave);}
    if(kind==='metal'){const scratch=hash(x,y,45)>.996?35:0;c=c.map(v=>v+scratch);}
    if(kind==='water'){const ripple=Math.sin(y*.25+Math.sin(x*.017)*2)*9;c=c.map(v=>v+ripple);}
    const at=(y*size+x)*4;for(let k=0;k<3;k++)image.data[at+k]=Math.max(0,Math.min(255,c[k]));image.data[at+3]=255;
  }
  ctx.putImageData(image,0,0);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  return map;
}

export function texturedSurface(kind,{worldScale=0,bump=.045,...options}={}){
  const map=artTexture(kind),material=new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:bump,
    roughness:kind==='metal'?.63:kind==='water'?.35:.96,metalness:kind==='metal'?.55:kind==='water'?.1:0,...options});
  material.userData.m01LowDetail={value:0};
  if(worldScale){
    // glTF parts and very long terrain boxes do not share a UV scale. Project in metres.
    material.onBeforeCompile=shader=>{
      shader.uniforms.m01Scale={value:worldScale};
      shader.uniforms.m01LowDetail=material.userData.m01LowDetail;
      shader.vertexShader='varying vec3 vM01Position;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 artPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          artPosition=instanceMatrix*artPosition;
        #endif
        vM01Position=(modelMatrix*artPosition).xyz;`);
      shader.fragmentShader='varying vec3 vM01Position; uniform float m01Scale; uniform float m01LowDetail;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        vec3 artNormal=abs(cross(dFdx(vM01Position),dFdy(vM01Position)));
        vec3 artUV=vM01Position*m01Scale;
        vec4 artColor;
        if(m01LowDetail>.5){
          // Dominant-axis mapping: same metre scale, one sample and no blending powers.
          vec2 uv=artNormal.y>=max(artNormal.x,artNormal.z)?artUV.xz:artNormal.x>=artNormal.z?artUV.zy:artUV.xy;
          artColor=texture2D(map,uv);
        }else{
          vec3 artWeights=pow(normalize(artNormal),vec3(6.0));artWeights/=max(.001,artWeights.x+artWeights.y+artWeights.z);
          artColor=texture2D(map,artUV.zy)*artWeights.x+texture2D(map,artUV.xz)*artWeights.y+texture2D(map,artUV.xy)*artWeights.z;
        }
        diffuseColor*=artColor;`);
      // Original UV bump would stretch across a kilometre; metre-space grain supplies detail.
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
        float artHeight=dot(artColor.rgb,vec3(.299,.587,.114));
        normal=normalize(normal-vec3(dFdx(artHeight),dFdy(artHeight),0.0)*.32);`);
    };
    material.customProgramCacheKey=()=>`m01-surface-${worldScale}`;
  }
  return material;
}

export function puffTexture(){
  const size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),im=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x-size/2)/(size/2),dy=(y-size/2)/(size/2),r=Math.hypot(dx,dy);
    const cloud=noise(x/size*8,y/size*8,8)*.7+noise(x/size*24,y/size*24,24)*.3;
    const a=Math.pow(Math.max(0,1-r*r),1.8)*(.18+cloud*.82),at=(y*size+x)*4;
    im.data[at]=im.data[at+1]=im.data[at+2]=Math.floor(165+cloud*90);im.data[at+3]=Math.floor(a*215);
  }
  ctx.putImageData(im,0,0);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}

export function leafTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
  for(let i=0;i<80;i++){
    const x=hash(i,3)*112+8,y=hash(i,7)*112+8;
    ctx.save();ctx.translate(x,y);ctx.rotate(hash(i,9)*Math.PI);ctx.fillStyle=`rgb(${75+hash(i,1)*55},${83+hash(i,2)*45},${39+hash(i,4)*34})`;
    ctx.beginPath();ctx.ellipse(0,0,3+hash(i,6)*3,1.6+hash(i,8)*2,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}

export function cloudFieldTexture(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d'),im=ctx.createImageData(512,256);
  for(let y=0;y<256;y++)for(let x=0;x<512;x++){
    const field=noise(x/512*6,y/256*6,6)*.6+noise(x/512*18,y/256*18,18)*.3+noise(x/512*54,y/256*54,54)*.1;
    const c=Math.floor(THREE.MathUtils.clamp((field-.22)*1.9,0,1)*255),i=(y*512+x)*4;
    im.data[i]=im.data[i+1]=im.data[i+2]=c;im.data[i+3]=255;
  }
  ctx.putImageData(im,0,0);const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;return map;
}
