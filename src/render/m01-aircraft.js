import * as THREE from 'three';

// Presentation only for the three Ju 87 of the first raid. Path, timings, events and damage stay with the
// existing raid code and M01Simulation; everything here is a pure function of the saved clock (pause/restore safe).
export const JU87_LOD_DISTANCES=Object.freeze([0,150,600]);
export const JU87_QUALITY_FLOOR=Object.freeze({low:600,medium:150,high:0});
// Small per-aircraft differences (paint batch, wear, engine): not unit markings, which remain undocumented.
export const JU87_VARIANTS=Object.freeze([
  Object.freeze({tint:[1,1,1],roughness:1,rps:25,phase:0}),
  Object.freeze({tint:[.95,.98,.94],roughness:.93,rps:24.6,phase:.37}),
  Object.freeze({tint:[1.04,1.03,.99],roughness:1.06,rps:25.4,phase:.71}),
]);
const JU87_LOOP=90,FADE_S=2.5,ENTER_S=3,LOD_HYSTERESIS=.1;
const smooth=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
const variantOf=i=>JU87_VARIANTS[i%JU87_VARIANTS.length];

/** Bank into the existing lateral drift plus slight per-aircraft motion; heading (rotation.y) is unchanged. */
export function ju87Attitude(time,i){
  return {pitch:.018*Math.sin(time*.47+i*1.7),bank:-.07*Math.cos(time*.02+i)+.03*Math.sin(time*.61+i*2.3)};
}
/** Dithered visibility: fade in after the planes are heard and across the 90 s wrap of the existing path. */
export function ju87Fade(time,heardAt){
  const cycle=((time%JU87_LOOP)+JU87_LOOP)%JU87_LOOP,wrap=Math.min(smooth(cycle/FADE_S),smooth((JU87_LOOP-cycle)/FADE_S));
  return Number.isFinite(heardAt)?Math.min(wrap,smooth((time-heardAt)/ENTER_S)):wrap;
}
/** Propeller clip time (one revolution = 1 s) at ~1500 rpm, each aircraft with its own rpm and phase. */
export function ju87PropellerTime(time,i){const v=variantOf(i),t=(time*v.rps+v.phase)%1;return t<0?t+1:t;}
/** LOD index with 10 % hysteresis around each threshold; the quality floor always wins. */
export function selectJu87Level(levels,distance,floor,current){
  const pick=d=>{let k=0;for(let j=1;j<levels.length;j++)if(d>=levels[j].distance)k=j;return k;};
  const d=Number.isFinite(distance)?distance:Infinity,min=pick(floor),want=Math.max(min,pick(Math.max(d,floor)));
  if(!Number.isInteger(current)||current<min||current>=levels.length||current===want)return want;
  const lo=current?levels[current].distance*(1-LOD_HYSTERESIS):0,hi=current+1<levels.length?levels[current+1].distance*(1+LOD_HYSTERESIS):Infinity;
  return d>=lo&&d<hi?current:want;
}
/**
 * Tiny equirectangular dawn sky (PMREM is done by three.js) so the canopy and bare metal reflect it and the RLM 65
 * underside receives the ground bounce that the scene's hemisphere light alone leaves near black against the sky.
 */
export function ju87SkyEnvironment(){
  const w=256,h=128,data=new Uint8Array(w*h*4),zenith=new THREE.Color('#9fb4cc'),horizon=new THREE.Color('#d3d7d2'),ground=new THREE.Color('#6f6752'),c=new THREE.Color();
  for(let y=0;y<h;y++){
    const el=((y+.5)/h-.5)*Math.PI;   // row 0 is the bottom of an equirectangular map
    if(el>=0)c.copy(horizon).lerp(zenith,smooth(el/(Math.PI/2)*1.6));else c.copy(horizon).lerp(ground,smooth(-el/(Math.PI/2)*5));
    const {r,g,b}=c.getRGB({},THREE.SRGBColorSpace);   // THREE.Color is linear; the texture stores sRGB bytes
    for(let x=0;x<w;x++)data.set([r*255,g*255,b*255,255].map(Math.round),(y*w+x)*4);
  }
  const texture=new THREE.DataTexture(data,w,h);
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;
  return texture;
}
/** Per-aircraft material instances (textures and geometry stay shared) with the variant and a dithered fade. */
export function instanceJu87Materials(model,i,sky){
  const v=variantOf(i),own=new Map();
  model.traverse(o=>{
    if(!o.isMesh)return;
    let m=own.get(o.material);
    if(!m){
      m=o.material.clone();m.userData.baseOpacity=m.opacity;
      if(m.name==='ju87_b1'){m.color.multiply(new THREE.Color(...v.tint));m.roughness*=v.roughness;m.alphaHash=true;m.envMap=sky;m.envMapIntensity=.85;}
      else if(m.name==='ju87_glass'){m.envMap=sky;m.envMapIntensity=1.2;}
      own.set(o.material,m);
    }
    o.material=m;
  });
  return [...own.values()];
}
export function setJu87Fade(materials,fade){for(const m of materials)m.opacity=m.userData.baseOpacity*fade;}
