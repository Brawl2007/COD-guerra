import * as THREE from 'three';
import { assetUrl } from '../assets/asset-manager.js';
import { M01_TRACK_CENTRES } from './m01-bridge-structure.js';
import { MASK_SIZES, TERRAIN_EXTENT, bakeTerrainMask, terrainMaskSources } from './m01-terrain-mask.js';

// M01 terrain material "m01-terrain-macro-v1" (roadmap T09 material pipeline + T28). Presentation only: ONE MeshStandardMaterial that
// replaces the single tiled soil canvas on the ground slot. Layers: field / meadow / churned mud (macro field + noise), worn track with ruts,
// ballast strip beside the rails, dark wet band along the Vistula banks (+ steep-slope blend), straw and soot litter, tangent detail normals.
// The macro mask is baked deterministically at load from the layout (m01-terrain-mask.js, read-only); no Math.random. Geometry, heights and
// colliders are untouched: this file never sees them. Shared lights, fog, shadows, T16 lighting and T44 grading keep working because the
// stock physical-material shader is only patched at map / roughness / normal.
//
// Quality (shared `m01LowDetail` uniform, same contract as texturedSurface):
//   high   1 mask 2048x640 + detail-a 1024 + detail-b 512 + normal-a 1024 + normal-b 512 (two samples each: anti-tiling), full normals
//   medium 1 mask 1024x320 + detail-a 512 + detail-b 512 + normal-a 512 + normal-b 512, full normals
//   low    1 mask 1024x320 only: macro colour, no downloaded detail, normals or litter
export const TERRAIN_MATERIAL_ID = 'm01-terrain-macro-v1';
export const TERRAIN_TEXTURE_DIR = 'assets/textures/m01/terrain/';
/** Metres per tile; must equal tools/assets/m01-materials/src/terrain.mjs TILE_METRES (a test pins both). */
export const TERRAIN_TILE_METRES = Object.freeze({ a: 4, b: 1.6 });
export const TERRAIN_TEXTURE_SETS = Object.freeze({
  high: Object.freeze({ a: 'terrain-detail-a-1024.png', b: 'terrain-detail-b-512.png', na: 'terrain-normal-a-1024.png', nb: 'terrain-normal-b-512.png' }),
  medium: Object.freeze({ a: 'terrain-detail-a-512.png', b: 'terrain-detail-b-512.png', na: 'terrain-normal-a-512.png', nb: 'terrain-normal-b-512.png' }),
  low: Object.freeze({}),
});
/** Texture samplers the terrain program declares (mask + four detail/normal maps), regardless of tier. */
export const TERRAIN_SAMPLERS = 5;

/** Bytes a W x H RGBA8 texture occupies on the GPU, including its full mip chain. */
export function textureGpuBytes(width, height, mipmaps = true) {
  let w = width, h = height, total = w * h * 4;
  if (mipmaps) while (w > 1 || h > 1) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); total += w * h * 4; }
  return total;
}
export const tierOf = (quality) => (quality === 'high' || quality === 'low' ? quality : 'medium');

const VERTEX_DECL = 'varying vec3 vM01Position; varying vec3 vM01Normal;\n';
const FRAGMENT_DECL = /* glsl */`
varying vec3 vM01Position; varying vec3 vM01Normal;
uniform sampler2D m01Mask; uniform sampler2D m01DetA; uniform sampler2D m01DetB; uniform sampler2D m01NrmA; uniform sampler2D m01NrmB;
uniform vec4 m01Extent; uniform vec2 m01Tiles; uniform float m01LowDetail;
float m01Hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float m01Noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(m01Hash(i),m01Hash(i+vec2(1,0)),f.x),mix(m01Hash(i+vec2(0,1)),m01Hash(i+vec2(1,1)),f.x),f.y);}
// Two samples of the same tile at different scale/rotation, blended by a low-frequency noise: no visible repeat at 50 m.
// Variance-preserving for channels whose mean is 0.5 (luma, normal xy); coverage channels are plain-mixed.
vec2 m01Rot(vec2 p){return vec2(p.x*.8-p.y*.6,p.x*.6+p.y*.8);}
vec4 m01Pair(sampler2D t,vec2 p,float inv,float w,bool coverageBA){
  vec4 a=texture2D(t,p*inv),b=texture2D(t,m01Rot(p)*inv*1.37+vec2(.37,.61));
  float k=1.0/sqrt(w*w+(1.0-w)*(1.0-w));vec4 m=mix(a,b,w),v=vec4(.5)+(m-.5)*k;
  return coverageBA?vec4(v.rg,m.ba):v;
}
// Normal xy pair: the second sample lives in the rotated frame, rotate its vectors back to world x/z.
vec4 m01PairN(sampler2D t,vec2 p,float inv,float w){
  vec4 a=texture2D(t,p*inv)*2.0-1.0,b=texture2D(t,m01Rot(p)*inv*1.37+vec2(.37,.61))*2.0-1.0;
  b.rg=vec2(b.r*.8+b.g*.6,-b.r*.6+b.g*.8);b.ba=vec2(b.b*.8+b.a*.6,-b.b*.6+b.a*.8);
  return mix(a,b,w)*(1.0/sqrt(w*w+(1.0-w)*(1.0-w)));
}
`;
// Steep faces use all three world-space projections. Flat ground keeps the cheaper x/z pair.
const TRIPLANAR = /* glsl */`
vec3 m01ProjectionWeights(vec3 ng){vec3 w=abs(ng);w*=w;w*=w;return w/max(dot(w,vec3(1.0)),1e-6);}
vec4 m01Triplanar(sampler2D t,vec3 p,vec3 weights,float inv,float w,bool coverage){
  return m01Pair(t,p.yz,inv,w,coverage)*weights.x+m01Pair(t,p.xz,inv,w,coverage)*weights.y+m01Pair(t,p.xy,inv,w,coverage)*weights.z;
}
vec3 m01NormalProjection(sampler2D t,vec3 p,vec3 weights,float inv,float w,bool second){
  vec4 x=m01PairN(t,p.yz,inv,w),y=m01PairN(t,p.xz,inv,w),z=m01PairN(t,p.xy,inv,w);
  vec2 nx=second?x.ba:x.rg,ny=second?y.ba:y.rg,nz=second?z.ba:z.rg;
  return vec3(0.0,nx.x,nx.y)*weights.x+vec3(ny.x,0.0,ny.y)*weights.y+vec3(nz.x,nz.y,0.0)*weights.z;
}
`;
const MAP_FRAGMENT = /* glsl */`
  vec2 m01P=vM01Position.xz;vec3 m01Ng=normalize(vM01Normal);
  float m01Slope=1.0-clamp(m01Ng.y,0.0,1.0);
  vec2 m01Uv=(m01P-m01Extent.xy)*m01Extent.zw;
  float m01In=step(0.0,m01Uv.x)*step(m01Uv.x,1.0)*step(0.0,m01Uv.y)*step(m01Uv.y,1.0);
  vec4 m01Mk=mix(vec4(1.0,1.0,1.0,.5),texture2D(m01Mask,m01Uv),m01In);
  float m01Track=m01Mk.r*4.0,m01Rail=m01Mk.g*4.0,m01Bank=m01Mk.b*32.0-8.0,m01Macro=m01Mk.a;
  float m01N1=m01Noise(m01P*.23),m01N2=m01Noise(m01P*1.1+7.0),m01N3=m01Noise(m01P*5.3+3.0);
  float m01W=smoothstep(.3,.7,m01Noise(m01P*.05+3.1));
  bool m01Low=m01LowDetail>.5;
  vec4 m01A=vec4(.5),m01B=vec4(.5,.5,0.0,0.0);
  float m01Steep=smoothstep(.12,.35,m01Slope);vec3 m01Projection=m01ProjectionWeights(m01Ng);
  if(!m01Low){
    m01A=m01Pair(m01DetA,m01P,m01Tiles.x,m01W,false);m01B=m01Pair(m01DetB,m01P,m01Tiles.y,m01W,true);
    if(m01Steep>0.0){m01A=mix(m01A,m01Triplanar(m01DetA,vM01Position,m01Projection,m01Tiles.x,m01W,false),m01Steep);m01B=mix(m01B,m01Triplanar(m01DetB,vM01Position,m01Projection,m01Tiles.y,m01W,true),m01Steep);}
  }
  // ---- layer weights (all presentation: they only read the baked mask, the mesh normal and noise)
  float m01TrackW=1.0-smoothstep(.70,1.0,m01Track+(m01N2-.5)*.4);
  float m01BallastW=1.0-smoothstep(.80,1.0,m01Rail+(m01N2-.5)*.3+(m01N3-.5)*.1);
  float m01WetW=max(1.0-smoothstep(.8,7.0+m01N1*6.0,m01Bank+(m01N2-.5)*2.5),smoothstep(.30,.56,m01Slope));
  float m01MudW=clamp((1.0-smoothstep(1.0,3.0,m01Track+(m01N1-.5)*1.4))*.8+(1.0-smoothstep(.07,.22,m01Macro+(m01N2-.5)*.1))*.9,0.0,1.0);
  float m01MeadowW=smoothstep(.54,.72,m01Macro+(m01N2-.5)*.10)*(1.0-m01MudW);
  float m01FieldW=max(0.0,1.0-m01MudW-m01MeadowW);
  float m01Keep=(1.0-m01WetW)*(1.0-m01BallastW);
  float wBase=(1.0-m01TrackW)*m01Keep,wTrack=m01TrackW*m01Keep,wWet=m01WetW*(1.0-m01BallastW),wBallast=m01BallastW;
  float wField=wBase*m01FieldW,wMeadow=wBase*m01MeadowW,wMud=wBase*m01MudW;
  // ---- ruts: two shallow grooves either side of the centre of a worn road (analytic height in metres)
  float m01Groove=smoothstep(.15,.22,m01Track)*(1.0-smoothstep(.30,.38,m01Track))*smoothstep(.25,.55,m01N2+.2);
  float m01RutH=-.035*m01Groove*m01TrackW;
  // ---- colour (linear). Tints are 1939 late-summer northern-Poland soil: dry loam, olive-straw grass, dark wet mud, pale compacted dust.
  vec3 cField=mix(vec3(.215,.155,.090),vec3(.305,.240,.145),smoothstep(.25,.75,m01N1*.55+m01Macro*.45))*(.15+1.7*m01A.r);
  vec3 cMeadow=mix(vec3(.115,.150,.042),vec3(.255,.225,.100),smoothstep(.30,.80,m01N1*.5+m01N2*.5))*(.15+1.7*m01A.g);
  vec3 cMud=vec3(.098,.066,.040)*(.15+1.7*m01A.b)*mix(.8,1.0,m01N2);
  vec3 cWet=vec3(.070,.054,.037)*(.2+1.6*m01A.a);
  vec3 cTrack=vec3(.330,.258,.162)*(.15+1.7*m01B.g)*(.88+.24*m01N2)*(1.0-.22*m01Groove);
  vec3 cBallast=vec3(.215,.203,.172)*(.12+1.76*m01B.r)*(.86+.28*m01N3);
  vec3 m01Col=cField*wField+cMeadow*wMeadow+cMud*wMud+cTrack*wTrack+cWet*wWet+cBallast*wBallast;
  if(!m01Low){
    float strawK=(1.0-m01TrackW*.6)*m01Keep*smoothstep(.35,.7,m01N1)*.85;
    m01Col=mix(m01Col,vec3(.40,.31,.13),clamp(m01B.b*strawK,0.0,1.0));
    float sootK=(1.0-m01TrackW)*m01Keep*smoothstep(.45,.75,m01N1+(m01N2-.5)*.3);
    m01Col*=1.0-clamp(m01B.a*sootK*.7,0.0,.7);
  }
  diffuseColor.rgb*=m01Col;
  // ---- roughness: dry soil is matte, wet mud / wet bank / puddles are glossy
  float m01Rough=.95*wField+.98*wMeadow+mix(.58,.93,smoothstep(.2,.55,m01A.b))*wMud+.88*wTrack+.5*wWet+.8*wBallast;
`;
const ROUGHNESS_FRAGMENT = '#include <roughnessmap_fragment>\n  roughnessFactor*=clamp(m01Rough,.2,1.0);';
const NORMAL_FRAGMENT = /* glsl */`
  if(!m01Low){
    vec4 m01NA=m01PairN(m01NrmA,m01P,m01Tiles.x,m01W),m01NB=m01PairN(m01NrmB,m01P,m01Tiles.y,m01W);
    vec2 m01Txy=m01NA.rg*(wField*.9+wMeadow*.3)+m01NA.ba*(wMud+wWet*.8)+m01NB.rg*(wTrack*.8)+m01NB.ba*wBallast;
    // Rut slope in the ground plane from the screen derivatives of the analytic rut height (2x2 solve), metres per metre.
    vec3 m01Dx=dFdx(vM01Position),m01Dy=dFdy(vM01Position);float m01Det=m01Dx.x*m01Dy.z-m01Dx.z*m01Dy.x;
    if(abs(m01Det)>1e-7){float hx=dFdx(m01RutH),hy=dFdy(m01RutH);m01Txy-=clamp(vec2((hx*m01Dy.z-hy*m01Dx.z),(hy*m01Dx.x-hx*m01Dy.x))/m01Det,vec2(-.6),vec2(.6));}
    float m01Fade=1.0-smoothstep(40.0,260.0,length(vViewPosition));   // far normals only add shimmer
    m01Txy*=m01Fade;
    vec3 m01Nw=inverseTransformDirection(normal,viewMatrix);
    vec3 m01Axis=abs(m01Nw.x)<.95?vec3(1.0,0.0,0.0):vec3(0.0,0.0,1.0);
    vec3 m01Tx=normalize(m01Axis-m01Nw*dot(m01Axis,m01Nw)),m01Tz=cross(m01Tx,m01Nw);
    vec3 m01Perturb=m01Tx*m01Txy.x+m01Tz*m01Txy.y;
    if(m01Steep>0.0){
      vec3 tri=m01NormalProjection(m01NrmA,vM01Position,m01Projection,m01Tiles.x,m01W,false)*(wField*.9+wMeadow*.3)
        +m01NormalProjection(m01NrmA,vM01Position,m01Projection,m01Tiles.x,m01W,true)*(wMud+wWet*.8)
        +m01NormalProjection(m01NrmB,vM01Position,m01Projection,m01Tiles.y,m01W,false)*(wTrack*.8)
        +m01NormalProjection(m01NrmB,vM01Position,m01Projection,m01Tiles.y,m01W,true)*wBallast;
      tri-=m01Nw*dot(tri,m01Nw);m01Perturb=mix(m01Perturb,tri*m01Fade,m01Steep);
    }
    normal=normalize(transformDirection(normalize(m01Nw+m01Perturb),viewMatrix));
  }
`;

// Texture owner also owns its decoded ImageBitmap; Three.Texture.dispose does not close it.
const releaseTexture = (texture) => { texture.dispose(); texture.image?.close?.(); };

const placeholder = (r, g, b, a) => { const t = new THREE.DataTexture(new Uint8Array([r, g, b, a]), 1, 1); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

function dataTexture(bitmapOrImage) {
  const t = new THREE.Texture(bitmapOrImage);
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false; t.generateMipmaps = true;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; t.needsUpdate = true; return t;
}

export class M01TerrainMaterial {
  /**
   * @param {{quality?:string, onUpdate?:()=>void, load?:(url:string)=>Promise<ImageBitmap>}} options `load` is injectable for tests.
   */
  constructor({ quality = 'medium', onUpdate = null, load = null } = {}) {
    this.tier = tierOf(quality); this.quality = quality; this.onUpdate = onUpdate; this.loadImage = load ?? M01TerrainMaterial.fetchBitmap;
    this.disposed = false; this.world = null; this.failures = []; this.token = 0; this.files = [];
    this.flat = { a: placeholder(128, 128, 128, 128), b: placeholder(128, 128, 0, 0), n: placeholder(128, 128, 128, 128), mask: placeholder(255, 255, 255, 128) };
    this.mask = null; this.maskSize = null; this.textures = {}; this.pendingLoads = new Set();
    const uniforms = this.uniforms = {
      m01Mask: { value: this.flat.mask }, m01DetA: { value: this.flat.a }, m01DetB: { value: this.flat.b }, m01NrmA: { value: this.flat.n }, m01NrmB: { value: this.flat.n },
      m01Extent: { value: new THREE.Vector4(TERRAIN_EXTENT.x0, TERRAIN_EXTENT.z0, 1 / (TERRAIN_EXTENT.x1 - TERRAIN_EXTENT.x0), 1 / (TERRAIN_EXTENT.z1 - TERRAIN_EXTENT.z0)) },
      m01Tiles: { value: new THREE.Vector2(1 / TERRAIN_TILE_METRES.a, 1 / TERRAIN_TILE_METRES.b) },
    };
    const material = this.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    // Shared with the view's per-frame quality loop (same contract as texturedSurface): 1 on Low.
    material.userData.m01LowDetail = { value: this.tier === 'low' ? 1 : 0 };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms); shader.uniforms.m01LowDetail = material.userData.m01LowDetail;
      shader.vertexShader = VERTEX_DECL + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vM01Position=(modelMatrix*vec4(transformed,1.0)).xyz;vM01Normal=normalize(mat3(modelMatrix)*objectNormal);`);
      shader.fragmentShader = FRAGMENT_DECL + TRIPLANAR + shader.fragmentShader
        .replace('#include <map_fragment>', MAP_FRAGMENT).replace('#include <roughnessmap_fragment>', ROUGHNESS_FRAGMENT)
        .replace('#include <normal_fragment_maps>', NORMAL_FRAGMENT);
    };
    material.customProgramCacheKey = () => TERRAIN_MATERIAL_ID + '-' + this.tier; // Low constant-folds all detail samplers.
    const compile = material.onBeforeCompile;
    material.onBeforeCompile = (shader) => { compile(shader); if (this.tier === 'low') shader.fragmentShader = shader.fragmentShader.replace('bool m01Low=m01LowDetail>.5;', 'const bool m01Low=true;'); };
    this.ready = this.loadTier(this.tier);
  }

  /** Browser loader: decoded without premultiplied alpha or colour conversion, so channels stay exact data. */
  static async fetchBitmap(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return createImageBitmap(await response.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' });
  }

  /** Bakes the macro mask for the current tier from the world's layout (read-only). Called once per world and again on tier change. */
  setWorld(world) {
    if (this.disposed) return;
    this.world = world; this.bakeMask();
  }
  bakeMask() {
    if (this.disposed || !this.world) return;
    const size = MASK_SIZES[this.tier], sources = terrainMaskSources(this.world.features, M01_TRACK_CENTRES);
    const data = bakeTerrainMask(sources, size), texture = new THREE.DataTexture(data, size.width, size.height, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.colorSpace = THREE.NoColorSpace; texture.needsUpdate = true;
    const old = this.mask; this.mask = texture; this.maskSize = size; this.uniforms.m01Mask.value = texture; old?.dispose();
    this.onUpdate?.();
  }

  /** Follows the view's quality tier; a change re-bakes the mask and swaps the texture set (old textures are disposed). */
  sync(quality) {
    if (this.disposed) return;
    this.quality = quality;
    const tier = tierOf(quality); if (tier === this.tier) return;
    this.tier = tier; this.material.userData.m01LowDetail.value = tier === 'low' ? 1 : 0; this.material.needsUpdate = true;
    this.failures = [];
    // Release expensive detail immediately, including while the next request is still pending.
    this.releaseDetails();
    this.bakeMask(); this.ready = this.loadTier(tier);
  }

  releaseDetails() {
    for (const texture of Object.values(this.textures)) releaseTexture(texture);
    this.textures = {}; this.files = [];
    this.uniforms.m01DetA.value = this.flat.a; this.uniforms.m01DetB.value = this.flat.b;
    this.uniforms.m01NrmA.value = this.uniforms.m01NrmB.value = this.flat.n;
  }
  // Fulfilled resources of an unfinished batch belong to the owner immediately.
  // Empty the batch maps too: their later completion must not release these textures twice.
  releasePendingDetails() {
    for (const loaded of this.pendingLoads) for (const slot of Object.keys(loaded)) {
      const texture = loaded[slot]; delete loaded[slot]; releaseTexture(texture);
    }
    this.pendingLoads.clear();
  }
  async loadTier(tier) {
    if (this.disposed) return;
    const token = ++this.token, set = TERRAIN_TEXTURE_SETS[tier], loaded = {}, names = [], failures = [];
    this.releasePendingDetails(); this.pendingLoads.add(loaded);
    await Promise.all(Object.entries(set).map(async ([slot, file]) => {
      let image;
      try {
        image = await this.loadImage(assetUrl(TERRAIN_TEXTURE_DIR + file));
        if (this.disposed || token !== this.token) { image.close?.(); return; }
        loaded[slot] = dataTexture(image); names.push(file);
      } catch (error) { image?.close?.(); failures.push(`${file}: ${error.message}`); }
    }));
    this.pendingLoads.delete(loaded);
    if (this.disposed || token !== this.token) { for (const texture of Object.values(loaded)) releaseTexture(texture); return; }
    this.releaseDetails(); this.textures = loaded; this.files = names.sort(); this.failures = failures.sort();
    this.uniforms.m01DetA.value = loaded.a ?? this.flat.a; this.uniforms.m01DetB.value = loaded.b ?? this.flat.b;
    this.uniforms.m01NrmA.value = loaded.na ?? this.flat.n; this.uniforms.m01NrmB.value = loaded.nb ?? this.flat.n;
    this.onUpdate?.();
  }

  /** Mask + loaded detail textures: count and GPU bytes including mips (computed from sizes, not measured). */
  get gpu() {
    const sizes = [];
    if (this.maskSize) sizes.push([this.maskSize.width, this.maskSize.height]);
    for (const t of Object.values(this.textures)) sizes.push([t.image.width, t.image.height]);
    return { textures: sizes.length, gpuBytes: sizes.reduce((n, [w, h]) => n + textureGpuBytes(w, h), 0) };
  }
  /** `gameDiagnostics().m01.terrain`. */
  get diagnostics() {
    const { textures, gpuBytes } = this.gpu;
    return { material: TERRAIN_MATERIAL_ID, textures, gpuBytes, quality: this.quality, tier: this.tier, lowDetail: this.material.userData.m01LowDetail.value,
      files: [...this.files], mask: this.maskSize ? { ...this.maskSize } : null, samplers: this.tier === 'low' ? 1 : TERRAIN_SAMPLERS, failures: [...this.failures] };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.token++; this.onUpdate = null; this.world = null;
    this.releasePendingDetails(); this.mask?.dispose(); this.releaseDetails(); for (const t of Object.values(this.flat)) t.dispose();
    this.mask = null; this.maskSize = null; this.files = []; this.failures = []; this.uniforms.m01Mask.value = this.flat.mask;
    this.material.dispose();
  }
}
