// M01 LOD cross-fade (T43 slice 2). Screen-door dither between two whole-object LOD levels: both levels render opaque for
// `duration` seconds and a 4x4 Bayer threshold on gl_FragCoord decides, per pixel, which one survives. The incoming level keeps
// the pixels with threshold < progress, the outgoing one keeps threshold >= progress, so the two patterns are complementary:
// every pixel is drawn exactly once, no blending, no transparency, depthWrite stays on. Presentation only; the clock is whatever
// the consumer passes (battle clock or a frame clock); nothing here reads Date/performance.
//
// Ownership: dither variants are material clones made at register() time (load), never during play, and are disposed by
// dispose(). The source materials (shared with the asset cache / GLB owner) are never modified. Variants only sit on the
// meshes while a fade is active; otherwise the original material is bound, so a resting object has the original shader.
import {advanceLodFade,LOD_DEFAULT_FADE_SECONDS} from './m01-lod-policy.js';

// Constant side flags shared by all variants (never mutated): the compiled program is the same for in/out.
const FLAG_IN={value:0},FLAG_OUT={value:1};
export const LOD_DITHER_GLSL_DECL=`uniform float uLodFadeProgress;
uniform float uLodFadeOut;
float lodBayer4(vec2 p){
  vec2 a=mod(p,2.0),b=mod(floor(p*0.5),2.0);
  float va=2.0*a.x+3.0*a.y-4.0*a.x*a.y,vb=2.0*b.x+3.0*b.y-4.0*b.x*b.y;
  return (4.0*va+vb+0.5)/16.0;
}
`;
export const LOD_DITHER_GLSL_BODY=`{
  float lodT=lodBayer4(floor(gl_FragCoord.xy));
  if(uLodFadeOut>0.5){if(lodT<uLodFadeProgress)discard;}else{if(lodT>=uLodFadeProgress)discard;}
}
`;

// Returns a clone of `source` whose fragment shader applies the screen-door test. `progress` is the shared {value} uniform.
export function createLodDitherMaterial(source,progress,outgoing){
  const material=source.clone(),previous=source.onBeforeCompile,baseKey=typeof source.customProgramCacheKey==='function'?source.customProgramCacheKey():'';
  material.name=`${source.name||'material'}:lodfade-${outgoing?'out':'in'}`;
  material.onBeforeCompile=(shader,renderer)=>{
    if(typeof previous==='function')previous.call(material,shader,renderer);
    shader.uniforms.uLodFadeProgress=progress;shader.uniforms.uLodFadeOut=outgoing?FLAG_OUT:FLAG_IN;
    shader.fragmentShader=shader.fragmentShader
      .replace(/void\s+main\s*\(\s*\)\s*\{/,m=>LOD_DITHER_GLSL_DECL+m)
      .replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+LOD_DITHER_GLSL_BODY);
  };
  material.customProgramCacheKey=()=>baseKey+'|m01-lod-dither';
  return material;
}

// Fade controller for one consumer object (locomotive, Panzerzug, one field structure). Allocation-free while resting; while a
// fade runs it calls advanceLodFade once per frame (one small frozen state, 0.3 s long). Material swaps happen only on
// begin/end of a fade, never per frame.
export class M01LodFade {
  constructor(duration=LOD_DEFAULT_FADE_SECONDS){
    this.duration=duration;this.progress={value:0};this.levels=new Map();this.variants=new Map();
    this.state=null;this.level=null;this.from=null;this.active=false;this.disposed=false;
    this.switches=0;this.fades=0;this.snaps=0;
  }
  // Register a loaded node as part of `level`. Builds in/out material variants for every mesh (load-time clones).
  register(level,node){
    if(this.disposed||!node)return;
    let entries=this.levels.get(level);if(!entries){entries=[];this.levels.set(level,entries);}
    node.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.material)return;
      const original=mesh.material,pair=Array.isArray(original)?[original.map(m=>this.variant(m).in),original.map(m=>this.variant(m).out)]:[this.variant(original).in,this.variant(original).out];
      entries.push({mesh,original,incoming:pair[0],outgoing:pair[1]});
    });
  }
  variant(material){
    let v=this.variants.get(material);
    if(!v){v={in:createLodDitherMaterial(material,this.progress,false),out:createLodDitherMaterial(material,this.progress,true)};this.variants.set(material,v);}
    return v;
  }
  has(level){return this.levels.has(level);}
  // True when `level` should be drawn: the current level, plus the outgoing one while a fade runs.
  shows(level){return level===this.level||(this.active&&level===this.from);}
  bind(level,role){
    const entries=this.levels.get(level);if(!entries)return;
    for(const e of entries)e.mesh.material=role==='in'?e.incoming:role==='out'?e.outgoing:e.original;
  }
  // Ends any running fade at once (originals rebound, the outgoing level hidden by shows()).
  snap(){
    if(!this.active)return false;
    this.bind(this.from,'orig');this.bind(this.level,'orig');this.active=false;this.progress.value=1;this.state=null;return true;
  }
  // Moves to `level`. `clock` is seconds from the caller's clock (non-finite => snap). `enabled=false` (low preset, preset change)
  // => instant swap. `count=false` marks a switch caused by asset arrival (not by the camera): it is applied but not counted, so
  // diagnostics do not depend on download order. Returns true when the visible set changed (level switch or fade finished).
  set(level,clock,enabled=true,count=true){
    if(this.disposed)return false;
    if(level===this.level){
      if(!this.active)return false;
      if(!enabled||!Number.isFinite(clock))return this.snap();
      const next=advanceLodFade(this.state,level,clock,this.duration);this.state=next;
      if(next.done){this.snap();return true;}   // finished, or the clock went backwards (advanceLodFade snaps)
      this.progress.value=next.progress;return false;
    }
    const previous=this.level;
    this.snap();
    if(previous!==null&&count)this.switches++;
    this.from=previous;this.level=level;
    if(!(enabled&&previous!==null&&Number.isFinite(clock)&&this.levels.has(previous)&&this.levels.has(level))){if(previous!==null&&count)this.snaps++;return true;}
    this.state=advanceLodFade(advanceLodFade(null,previous,clock,this.duration),level,clock,this.duration);
    this.progress.value=0;this.bind(previous,'out');this.bind(level,'in');this.active=true;this.fades++;
    return true;
  }
  // Rebinds original materials and disposes every variant. Call before the owner disposes the source materials.
  dispose(){
    if(this.disposed)return;
    this.snap();this.disposed=true;
    for(const v of this.variants.values()){v.in.dispose();v.out.dispose();}
    this.variants.clear();this.levels.clear();
  }
}
