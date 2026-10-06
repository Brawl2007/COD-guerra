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
  const colors={soil:[105,95,72],brick:[139,94,69],stone:[156,149,127],wood:[114,88,58],cloth:[151,148,123],metal:[111,119,115],water:[49,75,76],leather:[93,59,37],skin:[190,148,110]};
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
      if(mortar)c=[112+n,106+n,91+n];
      else{const variation=(hash(Math.floor(x/size*cols+(row%2)*.5),row)-.5)*24;c=c.map(v=>v+variation);if(u<.05||v<.075)c=c.map(v=>v+12);}
    }
    if(kind==='wood'||kind==='leather'){
      const grain=Math.sin(x*.27+noise(x/32,y/128,16)*7)*7+Math.sin(x*1.7+y*.002)*3;
      c=c.map(v=>v+grain);if(kind==='wood'&&x%(size/8)<3)c=c.map(v=>v-22);
    }
    if(kind==='cloth'){const weave=((x%4<2) !== (y%4<2))?7:-5;c=c.map(v=>v+weave);}
    if(kind==='metal'){const scratch=hash(x,y,45)>.998?23:0;c=c.map(v=>v+scratch);}
    if(['soil','brick','stone','wood'].includes(kind)){const stain=noise(x/size*3,y/size*3,3);c=c.map(v=>v*(.84+.28*stain));}
    if(kind==='water'){const ripple=Math.sin(y*.25+Math.sin(x*.017)*2)*9;c=c.map(v=>v+ripple);}
    const at=(y*size+x)*4;for(let k=0;k<3;k++)image.data[at+k]=Math.max(0,Math.min(255,c[k]));image.data[at+3]=255;
  }
  ctx.putImageData(image,0,0);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  return map;
}

export function texturedSurface(kind,{worldScale=0,bump=.045,...options}={}){
  const map=artTexture(kind),material=new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:bump,
    roughness:kind==='metal'?.48:kind==='water'?.74:.94,metalness:kind==='metal'?.68:0,...options});
  material.userData.m01LowDetail={value:0};material.userData.m01Time={value:0};
  if(worldScale){
    // glTF parts and very long terrain boxes do not share a UV scale. Project in metres.
    material.onBeforeCompile=shader=>{
      shader.uniforms.m01Scale={value:worldScale};
      shader.uniforms.m01LowDetail=material.userData.m01LowDetail;shader.uniforms.m01Time=material.userData.m01Time;
      shader.vertexShader='varying vec3 vM01Position;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 artPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          artPosition=instanceMatrix*artPosition;
        #endif
        vM01Position=(modelMatrix*artPosition).xyz;`);
      shader.fragmentShader='varying vec3 vM01Position; uniform float m01Scale; uniform float m01LowDetail; uniform float m01Time;\nfloat artHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\nfloat artNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(artHash(i),artHash(i+vec2(1,0)),f.x),mix(artHash(i+vec2(0,1)),artHash(i+vec2(1,1)),f.x),f.y); }\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        vec3 artNormal=abs(cross(dFdx(vM01Position),dFdy(vM01Position)));
        vec3 artUV=vM01Position*m01Scale;
        ${kind==='water'?'artUV.xz+=vec2(sin(m01Time*.14)*.028,m01Time*.007);':''}
        vec4 artColor;
        if(m01LowDetail>.5){
          // Dominant-axis mapping: same metre scale, one sample and no blending powers.
          vec2 uv=artNormal.y>=max(artNormal.x,artNormal.z)?artUV.xz:artNormal.x>=artNormal.z?artUV.zy:artUV.xy;
          artColor=texture2D(map,uv);
        }else{
          vec3 artWeights=pow(normalize(artNormal),vec3(6.0));artWeights/=max(.001,artWeights.x+artWeights.y+artWeights.z);
          artColor=texture2D(map,artUV.zy)*artWeights.x+texture2D(map,artUV.xz)*artWeights.y+texture2D(map,artUV.xy)*artWeights.z;
        }
        diffuseColor*=artColor;
        float macro=artNoise(vM01Position.xz*.035)*.65+artNoise(vM01Position.xz*.13)*.35;
        diffuseColor.rgb*=.84+macro*.32;
        ${kind==='soil'?`float soilPatch=artNoise(vM01Position.xz*.075+23.0);
        diffuseColor.rgb*=mix(vec3(1.08,1.15,.85),vec3(1.55,1.28,1.02),smoothstep(.28,.72,soilPatch));
        float grassMask=smoothstep(.38,.72,macro)*smoothstep(16.0,40.0,abs(vM01Position.z-20.0));
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.72,1.05,.55),grassMask*.95);
        float damp=smoothstep(.63,.88,artNoise(vM01Position.xz*.09+7.0));diffuseColor.rgb*=1.0-damp*.24;`:''}
        ${kind==='brick'||kind==='stone'?`float grime=(1.0-smoothstep(-3.0,.5,vM01Position.y))*(.12+.2*artNoise(vM01Position.xz*.22));diffuseColor.rgb*=1.0-grime;`:''}
        ${kind==='water'?`float fresnel=pow(1.0-clamp(abs(normalize(vViewPosition).y),0.0,1.0),3.0);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.22,.29,.31),fresnel*.45);`:''}`);
      // Original UV bump would stretch across a kilometre; metre-space grain supplies detail.
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
        float artHeight=dot(artColor.rgb,vec3(.299,.587,.114));
        normal=normalize(normal-vec3(dFdx(artHeight),dFdy(artHeight),0.0)*.18);`);
    };
    material.customProgramCacheKey=()=>`m01-surface-${kind}-${worldScale}`;
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
  // Dense irregular branch clusters, with negative space between lobes, not a square of isolated dots.
  for(let i=0;i<460;i++){
    const angle=hash(i,3)*Math.PI*2,r=Math.sqrt(hash(i,7))*53;
    const x=64+Math.cos(angle)*r,y=64+Math.sin(angle)*r*(.72+.22*hash(i,11));
    if(hash(i,15)>.9&&r>30)continue;
    ctx.save();ctx.translate(x,y);ctx.rotate(hash(i,9)*Math.PI);
    ctx.fillStyle=`rgb(${54+hash(i,1)*42},${70+hash(i,2)*50},${29+hash(i,4)*27})`;
    ctx.beginPath();ctx.ellipse(0,0,3+hash(i,6)*5,2+hash(i,8)*3,0,0,Math.PI*2);ctx.fill();ctx.restore();
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


export function bridgeBrickTexture(size=512){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size),cols=12,rows=24,cw=size/cols,ch=size/rows;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const row=Math.floor(y/ch),offset=(row&1)*.5,col=Math.floor(x/cw-offset);
    const ux=((x/cw-offset)-Math.floor(x/cw-offset)+1)%1,vy=(y/ch)-row;
    const mortar=ux<.035||ux>.965||vy<.055||vy>.965;
    const idX=col+row*19,variation=(hash(idX,row,1912)-.5)*38;
    const macro=(noise(x/size*5.0,y/size*5.0,8)-.5)*22;
    const grain=(hash(x>>1,y>>1,77)-.5)*11;
    let r=126+variation+macro+grain,g=72+variation*.48+macro*.65+grain*.35,b=50+variation*.30+macro*.42+grain*.22;
    if(mortar){const n=(hash(x,y,91)-.5)*9;r=104+n;g=99+n;b=86+n;}
    else{
      const edge=Math.min(ux,1-ux,vy*1.35,(1-vy)*1.35);
      if(edge<.08){r+=8;g+=5;b+=3;}
      const chip=hash(x>>2,y>>2,313);
      if(chip>.992){r-=24;g-=18;b-=13;}
    }
    const at=(y*size+x)*4;image.data[at]=Math.max(0,Math.min(255,r));image.data[at+1]=Math.max(0,Math.min(255,g));image.data[at+2]=Math.max(0,Math.min(255,b));image.data[at+3]=255;
  }
  ctx.putImageData(image,0,0);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;return map;
}

// Bridge-only masonry/wood weathering. It keeps the same procedural base map and adds
// low-frequency age/damp breakup in world space, so no gameplay state or authored GLB
// geometry is involved.
export function weatheredBridgeSurface(kind,{seed=0,...options}={}){
  const material=texturedSurface(kind,{...options,worldScale:options.worldScale??(kind==='brick'?.36:kind==='stone'?0.5:1.0)});
  if(kind==='brick'){
    const oldMap=material.map,map=bridgeBrickTexture();material.map=map;material.bumpMap=map;oldMap?.dispose();material.needsUpdate=true;
  }
  const baseCompile=material.onBeforeCompile,baseKey=material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile=shader=>{
    baseCompile?.(shader);
    shader.uniforms.m01BridgeSeed={value:seed};
    shader.fragmentShader=shader.fragmentShader.replace(
      'varying vec3 vM01Position; uniform float m01Scale; uniform float m01LowDetail; uniform float m01Time;',
      'varying vec3 vM01Position; uniform float m01Scale; uniform float m01LowDetail; uniform float m01Time; uniform float m01BridgeSeed;'
    );
    shader.fragmentShader=shader.fragmentShader.replace('normal=normalize(normal-vec3(dFdx(artHeight),dFdy(artHeight),0.0)*.18);','normal=normalize(normal-vec3(dFdx(artHeight),dFdy(artHeight),0.0)*.29);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float bridgeMacro=artNoise(vM01Position.xz*.047+vec2(m01BridgeSeed*.013,m01BridgeSeed*.031));
      float bridgeFine=artNoise(vM01Position.zy*.19+vec2(19.0+m01BridgeSeed*.007,43.0));
      roughnessFactor*=mix(.90,1.10,bridgeMacro*.72+bridgeFine*.28);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`
      float bridgeBase=1.0-smoothstep(-.8,2.8,vM01Position.y);
      float bridgeStreak=pow(artNoise(vec2(vM01Position.x*.095+m01BridgeSeed*.021,vM01Position.z*.11+floor(vM01Position.y*.45)*.073)),2.15);
      float bridgePatch=artNoise(vM01Position.xz*.031+vec2(71.0,m01BridgeSeed*.017));
      float bridgeVariation=bridgeMacro*.68+bridgeFine*.32;
      gl_FragColor.rgb*=mix(vec3(.88,.91,.93),vec3(1.13,1.07,1.0),bridgeVariation);
      float bridgeAge=.055+.18*bridgeStreak+.115*(1.0-bridgePatch)+.28*bridgeBase;
      gl_FragColor.rgb*=1.0-clamp(bridgeAge,0.0,.39);
      float bridgeDust=smoothstep(.58,.86,artNoise(vM01Position.xz*.16+vec2(m01BridgeSeed*.011,29.0)))*bridgeBase;
      gl_FragColor.rgb=mix(gl_FragColor.rgb,gl_FragColor.rgb*vec3(1.12,1.06,.94),bridgeDust*.16);
      #include <dithering_fragment>`);
  };
  material.customProgramCacheKey=()=>`m01-bridge-weather-${kind}-${seed}-${baseKey?.()??''}`;
  return material;
}
