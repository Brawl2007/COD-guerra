// M01 terrain macro mask (T09/T28, V1). Pure and deterministic: reads the route/road/rail/river data of the layout (read-only) and
// bakes ONE RGBA8 map in world metres that the terrain material samples. Same input -> same bytes; no Math.random, no three.js, no DOM.
//
// Channels (all distances are metres in the x/z ground plane, Three.js axes; legacy x/y units are never involved here):
//   R  worn track:   min over tracks of (distance to centre line / half width), 0..4 -> 0..255.  0 = on the centre line, 1 = track edge.
//   G  ballast:      min over rail lines of (distance to centre line / ballast half width), 0..4 -> 0..255.
//   B  river bank:   signed distance to the Vistula channel polygon, -8..24 m -> 0..255. Negative = inside the channel (river bed).
//   A  macro field:  low-frequency value noise 0..1 (meadow vs worked soil vs churned mud); smooth over 6..160 m.
// Storing normalised distances (not binary masks) keeps edges crisp under bilinear filtering and lets the shader break them up with noise.

/** The terrain mesh of M01View.buildTerrain: PlaneGeometry(2000,650) translated by (300,0,40). */
export const TERRAIN_EXTENT=Object.freeze({x0:-700,x1:1300,z0:-285,z1:365});
/** Mask resolution per quality tier: texel is ~1 m on High (narrow footpaths survive), ~2 m on Medium/Low. */
export const MASK_SIZES=Object.freeze({high:Object.freeze({width:2048,height:640}),medium:Object.freeze({width:1024,height:320}),low:Object.freeze({width:1024,height:320})});
export const MASK_ENCODING=Object.freeze({trackRange:4,railRange:4,bankMin:-8,bankRange:32});

/** Worn tracks (half width in metres). Road: cart ruts; ignition_line is the squad's trodden route. */
export const TRACK_SPECS=Object.freeze([{id:'road_approach_west',halfWidth:3.0,kind:'road'},{id:'ignition_line',halfWidth:1.5,kind:'path'}]);
/** Ballast shoulder beyond the outermost rail centre (m); the rail centres come from M01_TRACK_CENTRES (m01-bridge-structure.js). */
export const BALLAST_SHOULDER=2.4;
export const RAIL_IDS=Object.freeze(['rail_embankment_west','rail_line_southwest','rail_line_east']);
const MEADOW_POLYGONS=Object.freeze(['strip_between_approaches','east_floodplain']);

const clamp=(v,lo=0,hi=1)=>v<lo?lo:v>hi?hi:v;
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function hash(x,y,seed){
  let h=Math.imul(x|0,0x27d4eb2d)^Math.imul(y|0,0x165667b1)^Math.imul(seed|0,0x9e3779b1);
  h=Math.imul(h^(h>>>15),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);h^=h>>>16;return (h>>>0)/4294967296;
}
function valueNoise(x,y,seed){
  const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash(xi,yi,seed),b=hash(xi+1,yi,seed),c=hash(xi,yi+1,seed),d=hash(xi+1,yi+1,seed);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
/** Macro variation field at a world point, 0..1: 160 / 55 / 18 / 6 m octaves, contrast-stretched so meadow and mud both occur. */
export function macroField(x,z){
  const n=valueNoise(x/160,z/160,1)*.42+valueNoise(x/55,z/55,2)*.30+valueNoise(x/18,z/18,3)*.18+valueNoise(x/6,z/6,4)*.10;
  return smoothstep(.22,.78,n);
}

/**
 * Collects the layout polylines the mask needs. `features` is the world's Map (id -> feature with polyline/polygon in metres),
 * `trackCentres` is { railId: [lateral centre offsets] }. Missing features are skipped (a mission without a river has no bank).
 */
export function terrainMaskSources(features,trackCentres={}){
  const line=id=>features.get(id)?.polyline?.map(p=>[p[0],p[2]])??null;
  const tracks=TRACK_SPECS.map(t=>({id:t.id,kind:t.kind,halfWidth:t.halfWidth,points:line(t.id)})).filter(t=>t.points);
  const rails=RAIL_IDS.map(id=>{const centres=trackCentres[id]??[0],reach=Math.max(...centres.map(Math.abs));
    return {id,halfWidth:reach+BALLAST_SHOULDER,points:line(id)};}).filter(r=>r.points);
  const channel=features.get('vistula_channel')?.polygon??null;
  const meadow=MEADOW_POLYGONS.map(id=>features.get(id)?.polygon).filter(Boolean);
  return {tracks,rails,channel,meadow};
}

function segmentDistance(px,pz,ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz;
  const t=len2>0?clamp(((px-ax)*dx+(pz-az)*dz)/len2):0,qx=ax+t*dx-px,qz=az+t*dz-pz;
  return Math.sqrt(qx*qx+qz*qz);
}
const polylineDistance=(points,x,z)=>{let best=Infinity;for(let i=1;i<points.length;i++){const d=segmentDistance(x,z,points[i-1][0],points[i-1][1],points[i][0],points[i][1]);if(d<best)best=d;}return best;};
function inside(poly,x,z){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}return c;}
function signedPolygonDistance(poly,x,z){
  let best=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],d=segmentDistance(x,z,a[0],a[1],b[0],b[1]);if(d<best)best=d;}
  return inside(poly,x,z)?-best:best;
}

/** Bakes the mask. Returns a Uint8Array of width*height*4 (row y covers z = z0 + (y+.5)/height*(z1-z0), column x covers x likewise). */
export function bakeTerrainMask(sources,{width,height,extent=TERRAIN_EXTENT}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2)throw new Error('bakeTerrainMask: width/height must be integers >= 2');
  const out=new Uint8Array(width*height*4),sx=(extent.x1-extent.x0)/width,sz=(extent.z1-extent.z0)/height,enc=MASK_ENCODING;
  const {tracks=[],rails=[],channel=null,meadow=[]}=sources;
  // Cheap reject: a texel farther than 4 half-widths from a polyline's bounding box cannot be below the clamp.
  const boxed=list=>list.map(item=>{let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const [x,z] of item.points){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
    const r=item.halfWidth*enc.trackRange;return {item,x0:x0-r,x1:x1+r,z0:z0-r,z1:z1+r};});
  const trackBoxes=boxed(tracks),railBoxes=boxed(rails);
  const norm=(boxes,x,z)=>{let best=enc.trackRange;for(const b of boxes){if(x<b.x0||x>b.x1||z<b.z0||z>b.z1)continue;const n=polylineDistance(b.item.points,x,z)/b.item.halfWidth;if(n<best)best=n;}return best;};
  for(let j=0;j<height;j++){
    const z=extent.z0+(j+.5)*sz;
    for(let i=0;i<width;i++){
      const x=extent.x0+(i+.5)*sx,k=(j*width+i)*4;
      out[k]=Math.round(clamp(norm(trackBoxes,x,z)/enc.trackRange)*255);
      out[k+1]=Math.round(clamp(norm(railBoxes,x,z)/enc.railRange)*255);
      const bank=channel?signedPolygonDistance(channel,x,z):enc.bankMin+enc.bankRange;
      out[k+2]=Math.round(clamp((bank-enc.bankMin)/enc.bankRange)*255);
      let macro=macroField(x,z);for(const poly of meadow)if(inside(poly,x,z))macro=clamp(macro+.22);
      out[k+3]=Math.round(macro*255);
    }
  }
  return out;
}

/** Decodes one mask texel back to metres/0..1 (tests and diagnostics). Nearest texel; x/z in world metres. */
export function sampleMask(mask,width,height,x,z,extent=TERRAIN_EXTENT){
  const i=Math.min(width-1,Math.max(0,Math.floor((x-extent.x0)/(extent.x1-extent.x0)*width))),j=Math.min(height-1,Math.max(0,Math.floor((z-extent.z0)/(extent.z1-extent.z0)*height))),k=(j*width+i)*4,enc=MASK_ENCODING;
  return {track:mask[k]/255*enc.trackRange,ballast:mask[k+1]/255*enc.railRange,bank:mask[k+2]/255*enc.bankRange+enc.bankMin,macro:mask[k+3]/255};
}
