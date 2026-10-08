import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Presentation-only polish for train 963's stationary consist: couplings, underframe, per-wagon wear and the track
// bed the wagons stand on. Nothing here is a collider, reads the simulation or uses gameplay RNG; variation is a pure
// hash of the authoritative wagon id. Measures are generic estimates for 1939 two-axle wagons (P16 stays open).
export const M01_TRAIN_DETAIL_VERSION='m01-train-detail-coupling-polish-v1';
// The consist's own siding at the plan line z=-2.5: standard gauge 1.435 m between rail-head inner faces. Rail top is the
// existing east track's: terrain -1 + rail centre .12 + half rail height .06 = -.82 m (locomotive 963 sits there too).
export const M01_TRAIN_TRACK=Object.freeze({z:-2.5,railTop:-.82,railHeight:.12,headWidth:.07,railCentre:.7525,
  sleeperTop:-.94,ballastTop:-.965,from:1062,to:2000,sleeperStep:.75,railLength:12});
// The kit's conical tread (r .500 at .685 m → .475 at .820 m from the axle centre) has r .4875 over the rail-head centre,
// i.e. 1.25 cm above the kit's rail-top origin; the art drops by that much so LOD0 wheels touch the head centre.
export const M01_WAGON_TREAD_AT_RAIL=.0125;
export const M01_TRAIN_ART_OFFSET_Y=+(M01_TRAIN_TRACK.railTop-M01_WAGON_TREAD_AT_RAIL).toFixed(4);
export const M01_TRAIN_DETAIL_BUDGET=Object.freeze({drawCalls:12});
const TIER=['near','mid','far'];
// Low keeps the cheap mid set close by; Medium/High add the near set on LOD0 wagons only.
export const m01DetailTier=(lod,quality='medium')=>lod===null||lod===undefined?null:quality==='low'?(lod===0?1:2):Math.min(2,lod);

// FNV-1a: deterministic per id/salt; no browser randomness and no simulation RNG.
export function m01Unit(id,salt=''){
  let h=0x811c9dc5;for(const c of `${id}#${salt}`){h^=c.charCodeAt(0);h=Math.imul(h,0x01000193);}
  h^=h>>>15;h=Math.imul(h,0x2c1b3c6d);h^=h>>>12;return (h>>>0)/4294967296;
}
const TONES=Object.freeze([
  Object.freeze({name:'standard',tint:[1,1,1],share:.36}),
  Object.freeze({name:'faded',tint:[1.06,1.15,1.2],share:.24}),
  Object.freeze({name:'grimy',tint:[.76,.72,.68],share:.25}),
  Object.freeze({name:'warm',tint:[1.13,.95,.84],share:.15}),
]);
const VARIATION=new Map(),WEAR_ITEMS=new Map();   // pure per id: memoised so LOD rebuilds stay cheap
export function m01WagonVariation(id){
  if(VARIATION.has(id))return VARIATION.get(id);
  let pick=m01Unit(id,'tone'),tone=TONES[0];for(const t of TONES){if(pick<t.share){tone=t;break;}pick-=t.share;}
  const jitter=(m01Unit(id,'jitter')-.5)*.08,wear=m01Unit(id,'wear');
  const v=Object.freeze({id,flip:m01Unit(id,'flip')<.5,tone:tone.name,tint:Object.freeze(tone.tint.map(v=>+(v*(1+jitter)).toFixed(4))),
    wear:+wear.toFixed(4),patches:wear>.93?3:wear>.76?2:wear>.45?1:0,label:m01Unit(id,'label')<.6});
  VARIATION.set(id,v);return v;
}
// Which neighbour's screw coupling sits on the other's hook; the spare one hangs from its own hook.
export const m01GapVariation=i=>Object.freeze({index:i,engaged:m01Unit(`train963_gap_${i}`,'engaged')<.5?'west':'east'});

const AXIS_Y=new THREE.Vector3(0,1,0),AXIS_Z=new THREE.Vector3(0,0,1);
/** World matrix of a wagon's art: plan x/z unchanged, rail-top offset, symmetric art optionally turned end for end. */
export function m01WagonArtMatrix(wagon,target=new THREE.Matrix4()){
  const flip=m01WagonVariation(wagon.id).flip;
  return target.makeRotationY(-Math.PI/2+(flip?Math.PI:0)).setPosition(wagon.x,M01_TRAIN_ART_OFFSET_Y,M01_TRAIN_TRACK.z);
}

// ——— Procedural geometry (wagon-local metres: x across, y above rail top, z along; −z front, as the GLB kit) ———
const C=hex=>new THREE.Color(hex).toArray();
// Dusty, rust-brown steel rather than pure black, so the gear still reads in the shade of the body.
const PAINT=Object.freeze({steel:C('#3a332d'),rust:C('#5c3c29'),grease:C('#29241f'),rubber:C('#1b1918'),cock:C('#6b5735'),
  head:C('#8b8984'),web:C('#4a3427'),holder:C('#2e2924'),white:[1,1,1]});
class Parts{
  constructor(){this.list=[];}
  push(g,color){const n=g.attributes.position.count,c=new Float32Array(n*3);for(let i=0;i<n;i++)c.set(color,i*3);
    g.setAttribute('color',new THREE.BufferAttribute(c,3));this.list.push(g);return this;}
  box(size,at,color){const g=new THREE.BoxGeometry(...size);g.translate(...at);return this.push(g,color);}
  bar(a,b,[w,h],color){const A=new THREE.Vector3(...a),d=new THREE.Vector3(...b).sub(A),g=new THREE.BoxGeometry(w,h,d.length());
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(AXIS_Z,d.clone().normalize()));g.translate(...A.addScaledVector(d,.5).toArray());return this.push(g,color);}
  rod(a,b,r,color,segs=8){const A=new THREE.Vector3(...a),d=new THREE.Vector3(...b).sub(A),g=new THREE.CylinderGeometry(r,r,d.length(),segs);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(AXIS_Y,d.clone().normalize()));g.translate(...A.addScaledVector(d,.5).toArray());return this.push(g,color);}
  tube(points,r,color,segs=10,radial=6){return this.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segs,r,radial,false),color);}
  build(name){const g=mergeGeometries(this.list,false);for(const p of this.list)p.dispose();this.list=[];g.name=name;g.computeBoundingSphere();return g;}
}

// Underframe close up (LOD0): mid cross-members, draw-gear sills and diagonals, brake cylinder/reservoir/valve with
// linkage, shoe hangers, brake pipe, spring brackets and waybill holders. Brake gear is off-centre, so turned wagons differ.
function nearFrame(){
  const p=new Parts(),{steel,rust,grease,cock,holder}=PAINT;
  for(const z of [-2.95,2.95])p.box([1.88,.18,.1],[0,1.05,z],steel);
  for(const zs of [-1,1])for(const x of [-.22,.22])p.box([.09,.2,2.65],[x,1.05,zs*2.385],steel);
  for(const zs of [-1,1])for(const s of [-1,1])p.bar([s*.92,1.1,zs*1.08],[s*.27,1.1,zs*2.9],[.07,.1],steel);
  p.rod([.3,.8,-.66],[.3,.8,-.24],.14,rust,10).box([.08,.36,.08],[.3,1.0,-.56],steel).box([.08,.36,.08],[.3,1.0,-.34],steel);
  p.rod([-.36,.8,-.6],[-.36,.8,.2],.19,steel,12);for(const z of [-.45,.05]){p.box([.42,.05,.035],[-.36,.99,z],grease);for(const x of [-.55,-.17])p.box([.035,.37,.035],[x,.985,z],grease);}
  p.box([.2,.22,.16],[0,.83,.55],cock).box([.08,.24,.08],[0,1.05,.55],steel).rod([0,.83,.47],[0,.9,.2],.018,grease,6);
  p.bar([.3,.8,-.24],[.3,.8,.25],[.05,.05],grease).bar([.55,.78,.25],[-.15,.78,.25],[.04,.07],grease);
  p.bar([.15,.76,.25],[.15,.53,1.36],[.035,.035],grease).bar([-.12,.76,.25],[-.12,.53,-1.36],[.035,.035],grease);
  for(const zs of [-1,1])for(const s of [-1,1])p.bar([s*.86,.88,zs*1.47],[s*.75,.67,zs*1.47],[.035,.05],grease);
  p.rod([.12,.9,-3.55],[.12,.9,3.55],.022,steel,6).rod([.12,.9,-3.55],[.32,.9,-3.9],.022,steel,6).rod([.12,.9,3.55],[-.32,.9,3.9],.022,steel,6);
  for(const z of [-2,2])for(const s of [-1,1])for(const dz of [-.62,.62])p.box([.1,.12,.08],[s*1.0,.84,z+dz],steel);
  for(const s of [-1,1])p.box([.025,.2,.3],[s*1.035,1.0,.9],holder);
  return p.build('m01_train_near_frame');
}
function midFrame(){
  const p=new Parts(),{steel,rust,grease}=PAINT;
  for(const z of [-2.95,2.95])p.box([1.88,.18,.1],[0,1.05,z],steel);
  p.rod([.3,.8,-.66],[.3,.8,-.24],.14,rust,6).rod([-.36,.8,-.6],[-.36,.8,.2],.19,steel,6);
  for(const [x,z] of [[.3,-.45],[-.36,-.45],[-.36,.05]])p.box([.06,.3,.06],[x,1.03,z],steel);   // hangers up to the floor (1.16)
  p.bar([.15,.76,.25],[.15,.53,1.36],[.04,.04],grease).bar([-.12,.76,.25],[-.12,.53,-1.36],[.04,.04],grease);
  return p.build('m01_train_mid_frame');
}
// Gap frame: origin midway between buffer faces at rail top; the west wagon on +z, the east wagon on −z (yaw −π/2).
// Headstock faces at ±.62; hooks span .32–.62; the GLB's short coupling links end at (0,.86,±.20).
function bufferMounts(p,sides){const {steel,grease}=PAINT;
  for(const zs of sides)for(const s of [-1,1]){p.box([.34,.34,.03],[s*.875,1.04,zs*.605],grease);p.rod([s*.875,1.04,zs*.62],[s*.875,1.04,zs*.31],.118,steel,10).rod([s*.875,1.04,zs*.32],[s*.875,1.04,zs*.29],.132,steel,10);}
  for(const zs of sides)p.box([.3,.26,.025],[0,1.04,zs*.6],grease);
}
function hangingCoupling(p,zs){const {steel,grease}=PAINT;
  p.box([.16,.06,.06],[0,.85,zs*.21],steel).rod([0,.85,zs*.21],[0,.5,zs*.24],.022,grease,6).box([.16,.06,.06],[0,.49,zs*.24],steel);
  for(const x of [-.065,.065])p.bar([x,.49,zs*.24],[x,.3,zs*.26],[.025,.035],steel);
  p.box([.16,.035,.04],[0,.29,zs*.26],steel).bar([0,.67,zs*.22],[.17,.55,zs*.2],[.025,.025],grease).box([.07,.07,.07],[.18,.54,zs*.2],grease);
}
function hose(p,zs,coupled){const {rubber,cock}=PAINT,x=.32*zs;
  p.box([.08,.1,.12],[x,.87,zs*.57],cock).bar([x,.9,zs*.57],[x+.09*zs,.95,zs*.57],[.02,.02],cock);
  if(coupled)p.tube([[x,.86,zs*.55],[x*.94,.7,zs*.45],[x*.7,.57,zs*.25],[.1*zs,.52,zs*.07]],.03,rubber).box([.11,.08,.1],[.05*zs,.515,zs*.035],rubber);
  else p.tube([[x,.86,zs*.55],[x*1.05,.6,zs*.5],[x*1.35,.55,zs*.56],[x*1.62,.7,zs*.6]],.03,rubber).box([.08,.1,.08],[x*1.68,.74,zs*.6],cock);
}
function nearGap(){
  const p=new Parts(),{steel,grease}=PAINT;bufferMounts(p,[-1,1]);
  // West coupling engaged: links → screw with swinging handle → shackle over the east hook.
  p.box([.16,.06,.06],[0,.855,.19],steel).rod([0,.86,.19],[0,.93,-.2],.022,grease,6).box([.16,.06,.06],[0,.935,-.205],steel);
  p.bar([.02,.89,0],[.2,.66,.02],[.025,.025],grease).box([.07,.07,.07],[.21,.65,.02],grease);
  for(const x of [-.065,.065])p.bar([x,.935,-.205],[x,1.07,-.4],[.025,.035],steel);
  p.box([.16,.035,.04],[0,1.125,-.41],steel);
  hangingCoupling(p,-1);hose(p,1,true);hose(p,-1,true);
  return p.build('m01_train_near_gap');
}
function nearEnd(){const p=new Parts();bufferMounts(p,[1]);hangingCoupling(p,1);hose(p,1,false);return p.build('m01_train_near_end');}
function midGap(){
  const p=new Parts(),{steel,rubber,grease}=PAINT;
  for(const zs of [-1,1])for(const s of [-1,1])p.box([.24,.24,.3],[s*.875,1.04,zs*.46],steel);
  p.bar([0,.88,.22],[0,1.05,-.38],[.07,.06],grease);
  for(const zs of [-1,1])p.bar([.32*zs,.86,zs*.56],[.05*zs,.52,zs*.05],[.06,.06],rubber);
  return p.build('m01_train_mid_gap');
}
// Far silhouette for one wagon end whose drawn art has no buffers (LOD2 open: its body stops at the headstock, leaving
// 1.18 m between bodies). Authored for the west wagon (+z); the half gap reaches the buffer contact plane.
export const m01ArtLacksBuffers=(type,lod)=>type==='open'&&lod===2;
function farBuffers(){const p=new Parts(),{steel}=PAINT;for(const s of [-1,1])p.box([.3,.3,.62],[s*.875,1.04,.31],steel);p.box([.08,.08,.62],[0,1.0,.31],steel);return p.build('m01_train_far_buffers');}
function wearBox(){const p=new Parts();p.box([1,1,1],[0,0,0],PAINT.white);return p.build('m01_train_wear_unit');}
function railProfile(){
  const p=new Parts(),{head,web}=PAINT,L=M01_TRAIN_TRACK.railLength;
  p.box([.07,.04,L],[0,-.02,0],head).box([.018,.06,L],[0,-.07,0],web).box([.13,.02,L],[0,-.11,0],web);
  return p.build('m01_train_rail');
}
function ballast(){
  const {from,to,z,ballastTop}=M01_TRAIN_TRACK,bottom=-1.1,section=[[-1.95,bottom],[-1.5,ballastTop],[1.5,ballastTop],[1.95,bottom]];
  const position=[],uv=[],index=[];
  for(let k=0;k<3;k++){   // shoulder, crown, shoulder: own vertices so the crown keeps a flat normal
    const a=position.length/3;for(const x of [from,to])for(const [w,y] of [section[k],section[k+1]]){position.push(x,y,z+w);uv.push(x/1.6,w/1.6);}
    index.push(a,a+1,a+2,a+1,a+3,a+2);
  }
  const g=new THREE.BufferGeometry();g.setIndex(index);g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.computeVertexNormals();g.name='m01_train_ballast';g.computeBoundingSphere();return g;
}
// Soft contact shade under each wagon (Low has no shadow map): black with a vertex-alpha falloff, 5 mm over the sleepers.
const SHADE_Y=M01_TRAIN_TRACK.sleeperTop+.005;
function contactShade(){
  const nx=5,nz=9,position=[],color=[],index=[];
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const u=i/(nx-1)*2-1,v=j/(nz-1)*2-1;position.push(u*1.75,0,v*4.4);color.push(0,0,0,.46*(1-u*u)*(1-Math.pow(Math.abs(v),4)));}
  for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i;index.push(a,a+nx,a+1,a+1,a+nx,a+nx+1);}
  const g=new THREE.BufferGeometry();g.setIndex(index);g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('color',new THREE.Float32BufferAttribute(color,4));
  g.computeVertexNormals();g.name='m01_train_contact_shade';g.computeBoundingSphere();return g;
}
function gravelTexture(){
  const size=64,data=new Uint8Array(size*size*4);
  for(let i=0;i<size*size;i++){const n=m01Unit(i,'gravel'),k=m01Unit(i>>2,'stone'),v=92+n*58-(k<.18?28:0)+(k>.9?22:0);data.set([v,v*.97,v*.9,255],i*4);}
  const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;
  t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.needsUpdate=true;return t;
}

// Side-wall boards that look replaced, and paper waybill labels: positions/tones per wagon from its id.
const WEAR=Object.freeze({fresh:C('#83382a'),raw:C('#7b6e5d'),paper:C('#c2b9a1')});
const WALL=Object.freeze({covered:Object.freeze({x:1.45,panels:[[1.02,2.38],[2.52,3.86]],rows:[9,19]}),open:Object.freeze({x:1.45,panels:[[.85,2.29],[2.41,3.85]],rows:[9,17]})});
export function m01WagonWear(wagon){
  const key=`${wagon.id}:${wagon.type}`;if(WEAR_ITEMS.has(key))return WEAR_ITEMS.get(key);
  const v=m01WagonVariation(wagon.id),w=WALL[wagon.type],items=[];
  for(let k=0;k<v.patches;k++){
    const u=n=>m01Unit(wagon.id,`patch${k}${n}`),s=u('side')<.5?-1:1,zs=u('end')<.5?-1:1,[a,b]=w.panels[u('panel')<.5?0:1];
    const length=Math.min(b-a-.04,.55+u('len')*.85),z=zs*(a+.02+length/2+u('pos')*(b-a-.04-length)),rows=u('rows')<.3?2:1;
    const row=w.rows[0]+Math.floor(u('row')*(w.rows[1]-w.rows[0]+2-rows));
    items.push({kind:'patch',at:[s*(w.x+.011),(row+rows/2)*.145,z],size:[.012,rows*.145-.015,length],color:u('paint')<.55?WEAR.fresh:WEAR.raw});
  }
  if(v.label)for(const s of [-1,1])items.push({kind:'label',at:[s*1.0555,1.0,.9],size:[.004,.11,.15],color:WEAR.paper});
  const frozen=Object.freeze(items.map(i=>Object.freeze(i)));WEAR_ITEMS.set(key,frozen);return frozen;
}

export class M01TrainConsistDetail{
  constructor(parent,box,wood){
    this.group=new THREE.Group();this.group.name='m01_train_consist_detail';parent.add(this.group);this.disposed=false;
    this.material=new THREE.MeshStandardMaterial({name:'m01_train_detail',vertexColors:true,roughness:.8,metalness:.22});
    // Boards and labels sit .5–.6 cm proud; the offset keeps them ahead of the wall at LOD0 range (up to ~144 m on High).
    this.wearMaterial=new THREE.MeshStandardMaterial({name:'m01_train_wear',vertexColors:true,roughness:.88,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
    this.gravel=gravelTexture();this.ballastMaterial=new THREE.MeshStandardMaterial({name:'m01_train_ballast',map:this.gravel,color:'#a7a49a',roughness:.97});
    this.shadeMaterial=new THREE.MeshBasicMaterial({name:'m01_train_contact_shade',vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    this.geometries={nearFrame:nearFrame(),midFrame:midFrame(),nearGap:nearGap(),nearEnd:nearEnd(),midGap:midGap(),farBuffers:farBuffers(),wear:wearBox(),rail:railProfile(),ballast:ballast(),shade:contactShade()};
    // No detail batch casts into the 1024² sun shadow map: the LOD0 GLB bodies carry the wagon shadow, and couplings,
    // hoses and rods are smaller than a shadow texel.
    const g=this.geometries,mesh=(name,geometry,material,capacity,{colors=false}={})=>{
      const m=new THREE.InstancedMesh(geometry,material,capacity);m.name=name;m.castShadow=false;m.receiveShadow=true;m.count=0;m.visible=false;
      if(colors)m.setColorAt(0,new THREE.Color(1,1,1));this.group.add(m);return m;
    };
    this.meshes={
      nearFrame:mesh('train_detail_near_frame',g.nearFrame,this.material,65),
      nearWear:mesh('train_detail_near_wear',g.wear,this.wearMaterial,65*5,{colors:true}),
      nearGap:mesh('train_detail_near_gap',g.nearGap,this.material,64),
      nearEnd:mesh('train_detail_near_end',g.nearEnd,this.material,2),
      midFrame:mesh('train_detail_mid_frame',g.midFrame,this.material,65),
      midGap:mesh('train_detail_mid_gap',g.midGap,this.material,64),
      farBuffers:mesh('train_detail_far_buffers',g.farBuffers,this.material,130),
      shade:mesh('train_detail_contact_shade',g.shade,this.shadeMaterial,65),
    };
    this.meshes.shade.receiveShadow=false;this.meshes.shade.renderOrder=1;
    this.track=this.buildTrack(box,wood);
    this.lastSummary=null;
  }
  buildTrack(box,wood){
    const {from,to,z,railTop,railCentre,sleeperTop,sleeperStep,railLength}=M01_TRAIN_TRACK,m=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color();
    const ballastMesh=new THREE.Mesh(this.geometries.ballast,this.ballastMaterial);ballastMesh.name='train_track_ballast';ballastMesh.receiveShadow=true;
    // Equal segments (≈11.9 m) so the rails end with the ballast and sleepers at `to`.
    const segments=Math.ceil((to-from)/railLength),length=(to-from)/segments,rails=new THREE.InstancedMesh(this.geometries.rail,this.material,segments*2);rails.name='train_track_rails';rails.receiveShadow=true;
    q.setFromAxisAngle(AXIS_Y,Math.PI/2);
    for(let k=0;k<segments;k++)for(const [j,s] of [-1,1].entries())rails.setMatrixAt(k*2+j,m.compose(new THREE.Vector3(from+(k+.5)*length,railTop,z+s*railCentre),q,new THREE.Vector3(1,1,length/railLength)));
    const count=Math.floor((to-from)/sleeperStep),sleepers=new THREE.InstancedMesh(box,wood,count);sleepers.name='train_track_sleepers';sleepers.receiveShadow=true;
    for(let k=0;k<count;k++){
      const x=from+(k+.5)*sleeperStep,u=m01Unit(k,'sleeper'),yaw=(u-.5)*.03,tone=.42+m01Unit(k,'creosote')*.16;
      sleepers.setMatrixAt(k,m.compose(new THREE.Vector3(x,sleeperTop-.07,z+(u-.5)*.04),q.setFromAxisAngle(AXIS_Y,yaw),new THREE.Vector3(.24,.14,2.6)));
      sleepers.setColorAt(k,c.setRGB(tone,tone*.92,tone*.86));
    }
    for(const mesh of [rails,sleepers]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
    this.group.add(ballastMesh,rails,sleepers);return {ballast:ballastMesh,rails,sleepers};
  }
  /** entries: [{wagon,lod,desired}] in plan order; lod is the GLB LOD actually drawn (null for a procedural proxy),
   * desired the distance LOD. Rails, sleepers and contact shades only exist while some wagon is LOD0/1: from the playable
   * area (x ≤ 440, ≥ 622 m away) the whole consist is LOD2 and they would be sub-pixel, so only the ballast stays. */
  sync(entries,quality='medium'){
    if(this.disposed)return;
    const m=new THREE.Matrix4(),local=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color(),n={};
    for(const key of Object.keys(this.meshes))n[key]=0;
    const put=(key,matrix,color)=>{const mesh=this.meshes[key];mesh.setMatrixAt(n[key],matrix);if(color)mesh.setColorAt(n[key],c.setRGB(...color));n[key]++;};
    // Coarser of the drawn and the distance LOD: a wagon drawn with a finer fallback GLB far away stays far.
    const tiers=entries.map(e=>e.lod===null||e.lod===undefined?null:Math.max(m01DetailTier(e.lod,quality),m01DetailTier(e.desired??e.lod,quality))),instances={near:0,mid:0,far:0};
    entries.forEach(({wagon},i)=>{
      const tier=tiers[i];if(tier===null)return;const art=m01WagonArtMatrix(wagon,m);instances[TIER[tier]]++;
      if(tier<2)put('shade',local.makeTranslation(0,SHADE_Y-M01_TRAIN_ART_OFFSET_Y,0).premultiply(art));
      if(tier===0){put('nearFrame',art);for(const w of m01WagonWear(wagon))put('nearWear',local.compose(new THREE.Vector3(...w.at),q.identity(),new THREE.Vector3(...w.size)).premultiply(art),w.color);}
      else if(tier===1)put('midFrame',art);
    });
    const gapMatrix=(x,turn)=>m.makeRotationY(-Math.PI/2+(turn?Math.PI:0)).setPosition(x,M01_TRAIN_ART_OFFSET_Y,M01_TRAIN_TRACK.z);
    for(let i=0;i+1<entries.length;i++){
      if(tiers[i]===null||tiers[i+1]===null)continue;const tier=Math.min(tiers[i],tiers[i+1]),x=(entries[i].wagon.x+entries[i+1].wagon.x)/2;
      if(tier<2)put(tier===0?'nearGap':'midGap',gapMatrix(x,m01GapVariation(i).engaged==='east'));
    }
    // Ends of art drawn without buffers get their silhouette; GLBs that model buffers keep their own at any distance.
    entries.forEach(({wagon,lod})=>{if(m01ArtLacksBuffers(wagon.type,lod))for(const turn of [false,true])put('farBuffers',gapMatrix(wagon.x+(turn?-4.55:4.55),turn));});
    const first=entries[0],last=entries.at(-1);
    if(tiers[0]===0)put('nearEnd',gapMatrix(first.wagon.x-4.55,true));
    if(tiers.at(-1)===0)put('nearEnd',gapMatrix(last.wagon.x+4.55,false));
    const trackNear=entries.some(e=>(e.desired??e.lod??2)<=1);this.track.rails.visible=this.track.sleepers.visible=trackNear;
    let drawCalls=trackNear?3:1,triangles=this.trackTriangles,shadowCasters=0;
    for(const [key,mesh] of Object.entries(this.meshes)){
      mesh.count=n[key];mesh.visible=n[key]>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      if(mesh.visible){mesh.computeBoundingSphere();drawCalls++;triangles+=mesh.count*mesh.geometry.index.count/3;if(mesh.castShadow)shadowCasters++;}
    }
    this.lastSummary={quality,wagons:entries.length,gaps:Math.max(0,entries.length-1),instancesByTier:instances,trackDetail:trackNear,drawCalls,triangles,shadowCasters,
      instances:Object.fromEntries(Object.entries(this.meshes).map(([k,mesh])=>[k,mesh.count]))};
  }
  get trackTriangles(){const {ballast,rails,sleepers}=this.track;let t=ballast.geometry.index.count/3;for(const m of [rails,sleepers])if(m.visible)t+=m.count*m.geometry.index.count/3;return t;}
  get diagnostics(){
    const s=this.lastSummary??{quality:null,wagons:0,gaps:0,instancesByTier:{near:0,mid:0,far:0},trackDetail:true,drawCalls:3,triangles:this.trackTriangles,shadowCasters:0,instances:{}};
    return {version:M01_TRAIN_DETAIL_VERSION,...s,budget:M01_TRAIN_DETAIL_BUDGET,ownedGeometries:Object.keys(this.geometries).length,
      ownedMaterials:4,ownedTextures:1,artOffsetY:M01_TRAIN_ART_OFFSET_Y,track:{z:M01_TRAIN_TRACK.z,railTop:M01_TRAIN_TRACK.railTop,
        gauge:+(2*M01_TRAIN_TRACK.railCentre-M01_TRAIN_TRACK.headWidth).toFixed(4),from:M01_TRAIN_TRACK.from,to:M01_TRAIN_TRACK.to,sleepers:this.track.sleepers.count,railSegments:this.track.rails.count}};
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    for(const mesh of [...Object.values(this.meshes),this.track.rails,this.track.sleepers])mesh.dispose();
    for(const g of Object.values(this.geometries))g.dispose();
    for(const material of [this.material,this.wearMaterial,this.ballastMaterial,this.shadeMaterial])material.dispose();
    this.gravel.dispose();this.group.removeFromParent();
  }
}
