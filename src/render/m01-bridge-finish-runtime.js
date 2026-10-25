import * as THREE from 'three';
import impostorManifest from '../../assets/models/provisional/m01/m01-bridges/impostors/manifest.json' with {type:'json'};
import {M01_BRIDGE_MATERIAL_MANIFEST as materialManifest,bridgeFamily,bridgeMappedMaterial,loadBridgeTexture,configureBridgeTexture} from './m01-bridge-material.js';
import {M01BridgeLOD} from './m01-bridge-lod.js';
import {bridgeFadeDither,bridgeFadeFallbackMaterial} from './m01-bridge-material.js';
import {LOD_DEFAULT_FADE_SECONDS,lodFadeProgress,encodeInstanceFade} from './m01-lod-policy.js';
function mipBytes(width,height){let bytes=0;while(width>1||height>1){width=Math.max(1,width>>1);height=Math.max(1,height>>1);bytes+=width*height*4;}return bytes;}
const demolitionDamage=d=>String(d.id).includes('demolition');
const zero=()=>({main:{calls:0,triangles:0},shadow:{calls:0,triangles:0}});
function triangleCount(mesh,geometry,group){if(mesh.isInstancedMesh&&mesh.count===0)return 0;const range=geometry.drawRange,start=Math.max(range.start,group?.start??0),end=Math.min(range.start+range.count,(group?.start??0)+(group?.count??Infinity),geometry.index?.count??geometry.attributes.position.count);return Math.max(0,end-start)/3*(mesh.isInstancedMesh?mesh.count:1);}
export class M01BridgeFinishRuntime{
 constructor(scene,{quality='low',loadTexture=loadBridgeTexture,timeoutMs=30000,baseUrl}={}){
  this.scene=scene;this.loadTexture=loadTexture;this.timeoutMs=timeoutMs;this.baseUrl=baseUrl??(typeof document==='undefined'?'':new URL('assets/models/provisional/m01/m01-bridges/',document.baseURI).href);this.enabled=true;this.disposed=false;this.revision=0;this.generation=0;this.status='idle';this.stage=null;this.bindings=new Map();this.materialCache=new Map();this.callbacks=new Map();this.cards=new Map();this.farHidden=new Map();this.lod=new M01BridgeLOD();this.pieceFades=new Map();this.fadeSeconds=LOD_DEFAULT_FADE_SECONDS;this.fadeStats={started:0,snapped:0};this.fadeFrame=0;this.fadeStamp=0;this.fadeQuality=quality;this.fadeQualitySeen=null;this.fadeSeen=null;this.native={original:zero(),impostor:zero(),perImpostorPart:{},perOriginalTrussPart:{}};this.cameraPoint=new THREE.Vector3();this.point=new THREE.Vector3();this.selectionOptions={visible:false,impostorReady:false,damaged:false,authorityLOD:2};this.kitCount=-1;this.world=null;this.worldRevision=-1;this.requestQuality(quality);
 }
 release(resource){if(!resource||resource.released)return;resource.released=true;resource.texture?.dispose();resource.bitmap?.close();}
 async resource(file,stage,folder){
  let timer,late=false;const pending=Promise.resolve().then(()=>this.loadTexture(this.baseUrl+folder+'/'+file.file,{signal:stage.controller.signal}));
  pending.then(r=>{if(late||stage.cancelled||this.disposed)this.release(r);},()=>{});
  try{const r=await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{late=true;reject(Error(`Bridge optional texture timeout ${file.file}`));},this.timeoutMs);stage.controller.signal.addEventListener('abort',()=>{late=true;reject(Error('Bridge optional load cancelled'));},{once:true});})]);
   if(stage.cancelled||this.disposed){this.release(r);return null;}configureBridgeTexture(r,file.role??'albedo');r.decodedBytes=file.decodedBytes;r.mipmapBytes=mipBytes(file.width,file.height);r.file=file.file;stage.resources.push(r);return r;
  }finally{clearTimeout(timer);}
 }
 clearBindings(){for(const [mesh,r]of this.bindings)if(mesh.material===r.material)mesh.material=r.original;this.bindings.clear();for(const byFamily of this.materialCache.values())for(const material of byFamily.values())material.dispose();this.materialCache.clear();}
 cancelStage(){if(!this.stage)return;this.stage.cancelled=true;this.stage.controller.abort();for(const r of this.stage.resources)this.release(r);this.stage=null;}
 requestQuality(quality){const tier=quality==='low'?'low':'high';if(tier===this.tier&&this.status!=='idle')return this.ready;
  // Release the previous tier before decoding the next. Original materials stay usable while optional maps arrive.
  this.clearBindings();this.restoreFar();for(const card of this.cards.values())card.root.visible=false;this.cancelStage();this.tier=tier;this.status='loading';this.revision++;const stage={id:++this.generation,controller:new AbortController(),resources:[],families:new Map(),impostors:new Map(),errors:[],cancelled:false};this.stage=stage;
  const groups=Object.keys(materialManifest.materials).map(async id=>{const files=materialManifest.files.filter(f=>f.id===id&&f.tier===tier),loaded=await Promise.allSettled(files.map(f=>this.resource(f,stage,'materials')));const maps={};loaded.forEach((r,i)=>{if(r.status==='fulfilled'&&r.value)maps[files[i].role]=r.value.texture;else if(r.status==='rejected')stage.errors.push(String(r.reason));});if(Object.keys(maps).length===3)stage.families.set(id,maps);else for(const r of stage.resources)if(files.some(f=>f.file===r.file))this.release(r);});
  groups.push(...impostorManifest.parts.map(async part=>{const files=['side','top'].map(v=>({...part.views[`${tier}-${v}`],role:'albedo'})),loaded=await Promise.allSettled(files.map(f=>this.resource(f,stage,'impostors')));if(loaded.every(r=>r.status==='fulfilled'&&r.value))stage.impostors.set(part.id,loaded.map(r=>r.value.texture));else{for(const r of loaded)if(r.status==='rejected')stage.errors.push(String(r.reason));for(const r of stage.resources)if(files.some(f=>f.file===r.file))this.release(r);}}));
  this.ready=Promise.allSettled(groups).then(()=>{if(this.disposed||stage.cancelled||this.stage!==stage)return;const all=stage.families.size===8&&stage.impostors.size===18;this.status=all?'ready':stage.families.size||stage.impostors.size?'partial':'failed';this.revision++;});return this.ready;
 }
 setEnabled(on){on=Boolean(on);if(on!==this.enabled){this.enabled=on;this.clearBindings();this.restoreFar();for(const c of this.cards.values())c.root.visible=false;this.revision++;}return on;}
 observe(mesh,kind='original',partId=null){
  if(this.callbacks.has(mesh))return;const before=mesh.onBeforeRender,shadow=mesh.onBeforeShadow,owner=this;let logical=partId;if(kind==='original'&&(mesh.userData.m01SourceMaterial==='steel_painted'||/_(steel|rivet)$/.test(mesh.name))){let cursor=mesh;while(cursor&&!/^(rail|road)_span_\d+$/.test(cursor.name))cursor=cursor.parent;logical=cursor?.name;}const table=kind==='impostor'?this.native.perImpostorPart:this.native.perOriginalTrussPart;const part=logical?(table[logical]??=zero()):null;
  const onBeforeRender=function(renderer,scene,camera,geometry,material,group){before.call(this,renderer,scene,camera,geometry,material,group);const dither=material?.userData?.m01BridgeFade;if(dither){const value=this.userData.m01BridgeFade?.value??1;if(dither.value!==value){dither.value=value;material.uniformsNeedUpdate=true;}}if(camera!==owner.mainCamera)return;const n=triangleCount(this,geometry,group);if(n){owner.native[kind].main.calls++;owner.native[kind].main.triangles+=n;if(part){part.main.calls++;part.main.triangles+=n;}}};
  const onBeforeShadow=function(renderer,object,camera,shadowCamera,geometry,material,group){shadow.call(this,renderer,object,camera,shadowCamera,geometry,material,group);const n=triangleCount(this,geometry,group);if(n){owner.native[kind].shadow.calls++;owner.native[kind].shadow.triangles+=n;if(part){part.shadow.calls++;part.shadow.triangles+=n;}}};
  mesh.onBeforeRender=onBeforeRender;mesh.onBeforeShadow=onBeforeShadow;this.callbacks.set(mesh,{before,shadow,onBeforeRender,onBeforeShadow});
 }
 bind(mesh){if(!mesh.isMesh||mesh.userData.m01BridgeImpostor)return;this.observe(mesh);if(!this.enabled||!this.stage||this.status==='loading')return;const bound=this.bindings.get(mesh);if(bound&&mesh.material===bound.material)return;
  // T31 binds first in M01View; if a later owner supplied a new clone, retain that exact clone as the new borrowed original.
  const source=mesh.material;if(Array.isArray(source))return;const family=bridgeFamily(mesh,source),maps=this.stage.families.get(family),fallback=family===null;if(!maps&&!fallback)return;if(fallback&&!this.stage.families.size)return;   // every optional map set failed: the finish binds nothing and the originals stay as T31 left them (no fade clone beside unmapped neighbours)
  let cache=this.materialCache.get(source);if(!cache)this.materialCache.set(source,cache=new Map());const slot=fallback?'fade-fallback':family;let material=cache.get(slot);if(!material){material=fallback?bridgeFadeFallbackMaterial(source):bridgeMappedMaterial(source,family,maps);cache.set(slot,material);}this.bindings.set(mesh,{original:source,material,family:slot});mesh.material=material;
 }
 sync({kits,quality,world,kitsSettled=true}){if(this.disposed)return;this.requestQuality(quality);this.fadeQuality=quality;this.lod.syncWorld(world);if(world!==this.world||world?.revision!==this.worldRevision){this.world=world;this.worldRevision=world?.revision;this.revision++;this.snapFades();this.resetFades();this.pieceFades.clear();}
  // The mapped materials are created in bind order and three.js draws opaque items by material id, so the order the kits are bound in decides which of two
  // coplanar bridge surfaces (rail span steel vs its timber/rail primitives) wins a depth tie. Kit GLBs arrive in network order: bind only after every kit
  // has arrived or failed, and in a fixed order (lod, then file name), so the draw order is the same on every page load.
  if(kitsSettled&&(this.kitCount!==kits.length||this.bindingRevision!==this.revision)){for(const kit of [...kits].sort((a,b)=>(a.file?.lod??0)-(b.file?.lod??0)||String(a.file?.file??'').localeCompare(String(b.file?.file??''))))kit.root.traverse(n=>this.bind(n));this.kitCount=kits.length;this.bindingRevision=this.revision;}
 }
 restoreFar(){for(const [mesh,visible]of this.farHidden)mesh.visible=visible;this.farHidden.clear();}
 card(piece){let c=this.cards.get(piece.name);if(c)return c;const spec=impostorManifest.parts.find(p=>p.id===piece.name);if(!spec)return null;const b=spec.bounds,root=new THREE.Group();root.name=`${piece.name}_bridge_impostor`;root.userData.m01BridgeImpostor=true;const side=new THREE.Mesh(new THREE.PlaneGeometry(b.max[0]-b.min[0],b.max[1]-b.min[1]),new THREE.MeshStandardMaterial({side:THREE.DoubleSide,alphaTest:.3,roughness:.7,metalness:.5,forceSinglePass:true})),top=new THREE.Mesh(new THREE.PlaneGeometry(b.max[0]-b.min[0],b.max[2]-b.min[2]),side.material.clone());side.position.set((b.min[0]+b.max[0])/2,(b.min[1]+b.max[1])/2,(b.min[2]+b.max[2])/2);bridgeFadeDither(side.material);bridgeFadeDither(top.material);top.rotation.x=-Math.PI/2;top.position.set((b.min[0]+b.max[0])/2,b.max[1],(b.min[2]+b.max[2])/2);for(const mesh of [side,top]){mesh.userData.m01BridgeImpostor=true;mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);this.observe(mesh,'impostor',piece.name);}piece.node.add(root);const trusses=[];piece.node.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.m01BridgeImpostor&&(mesh.userData.m01SourceMaterial==='steel_painted'||/_(steel|rivet)$/.test(mesh.name)))trusses.push(mesh);});c={root,side,top,spec,trusses};this.cards.set(piece.name,c);return c;}
 prepareFrame(){this.restoreFar();}
 // T43 slice 5: `clock` (battle clock, seconds) drives a 0.3 s screen-door crossfade whenever the representation of a bridge piece changes:
// kit LOD 0 / 1 / 2 (detailed meshes) or LOD 2 + impostor card ("state 3", where the kit-2 trusses are replaced by the card). The outgoing
// and the incoming representation are both drawn with complementary dither (shared meshes of 2 <-> 3 stay solid); nothing blends and
// authority (parts, colliders, LOD levels) is untouched. No clock, Low, a damaged or hidden part, a preset change, a rewound clock or
// a missing kit snap exactly as before.
 select({kits,state,camera,prepared=false,clock}){if(!prepared)this.restoreFar();this.cameraPoint.copy(camera.position);const damaged=state.damage?.some(demolitionDamage)??false;for(const c of this.cards.values())c.root.visible=false;
  const fadeOn=this.enabled&&this.fadeQuality!=='low'&&Number.isFinite(clock);if(this.fadeSeen!==null&&(!fadeOn||clock<this.fadeSeen||this.fadeQualitySeen!==this.fadeQuality))this.snapFades();this.fadeSeen=fadeOn?clock:null;this.fadeQualitySeen=this.fadeQuality;const frame=++this.fadeFrame;
  // All cached collapse matrices have already been applied by the view. Each original logical piece keeps its exact node transforms.
  for(const kit of kits){kit.root.updateMatrixWorld(true);for(const piece of kit.pieces){const authority=state.parts[piece.name];if(!authority){piece.node.visible=false;continue;}piece.node.getWorldPosition(this.point);const distance=this.point.distanceTo(this.cameraPoint),ready=this.enabled&&this.stage?.impostors.has(piece.name),options=this.selectionOptions;options.visible=authority.visible;options.impostorReady=ready;options.damaged=damaged;options.authorityLOD=authority.lod;const level=this.enabled?this.lod.select(piece.name,distance,options):authority.lod;piece.node.visible=Boolean(authority.visible&&level===kit.file.lod);
   const rec=this.fadeRecord(piece.name,frame);rec.piece[kit.file.lod]=piece;
   if(piece.node.visible){let repr=kit.file.lod;if(repr===2&&ready&&this.lod.parts.get(piece.name)?.impostor&&this.card(piece))repr=3;rec.state=repr;rec.clean=authority.visible&&!damaged;}}}
  for(const rec of this.pieceFades.values())if(rec.frame===frame)this.resolveFade(rec,fadeOn,clock);
 }
 fadeRecord(name,frame){let rec=this.pieceFades.get(name);if(!rec){rec={name,piece:[null,null,null],meshes:[null,null,null],nodes:[null,null,null],frame:-1,state:-1,clean:false,shown:null,from:-1,to:-1,start:0,active:false,applied:false,lastFrom:-1,lastTo:-1};this.pieceFades.set(name,rec);}
  if(rec.frame!==frame){rec.frame=frame;rec.state=-1;rec.clean=false;rec.piece[0]=rec.piece[1]=rec.piece[2]=null;}return rec;}
 // Meshes of one kit node (cached per node), excluding the impostor card that hangs under the 2-node.
 meshesOf(rec,lod){const node=rec.piece[lod]?.node;if(!node)return null;if(rec.nodes[lod]!==node){const list=[];node.traverse(m=>{if(m.isMesh&&!m.userData.m01BridgeImpostor)list.push(m);});rec.nodes[lod]=node;rec.meshes[lod]=list;}return rec.meshes[lod];}
 fadeMark(mesh,value,second){const f=mesh.userData.m01BridgeFade??={value:1,stamp:-1};if(second&&f.stamp===this.fadeStamp)f.value=1;else{f.value=value;if(!second)f.stamp=this.fadeStamp;}}
 // Marks every mesh of a representation: kit meshes (state 3 omits the trusses the card replaces) and the card for state 3.
 markRepr(rec,repr,value,second){
  const lod=repr===3?2:repr,list=this.meshesOf(rec,lod);if(!list)return;const c=repr===3?this.cards.get(rec.name):null;
  for(let i=0;i<list.length;i++){const mesh=list[i];if(c&&c.trusses.includes(mesh))continue;this.fadeMark(mesh,value,second);}
  if(c){this.fadeMark(c.side,value,second);this.fadeMark(c.top,value,second);}
 }
 clearRecFade(rec){
  for(const repr of [rec.lastFrom,rec.lastTo]){if(repr<0)continue;const lod=repr===3?2:repr,list=rec.meshes[lod],c=repr===3?this.cards.get(rec.name):null;if(list)for(let i=0;i<list.length;i++)list[i].userData.m01BridgeFade&&(list[i].userData.m01BridgeFade.value=1);if(c)for(const mesh of [c.side,c.top])if(mesh.userData.m01BridgeFade)mesh.userData.m01BridgeFade.value=1;}
  rec.applied=false;rec.lastFrom=rec.lastTo=-1;
 }
 // Steady card: shown over the hidden trusses of the kit-2 node (hidden meshes are restored by restoreFar at the next frame start).
 showCard(rec,hideTrusses){const c=this.cards.get(rec.name),maps=this.stage?.impostors.get(rec.name);if(!c)return;if(maps)for(let i=0;i<2;i++){const mesh=i===0?c.side:c.top;if(mesh.material.map!==maps[i]){mesh.material.map=maps[i];mesh.material.needsUpdate=true;}}c.root.visible=true;if(hideTrusses)for(const mesh of c.trusses){this.farHidden.set(mesh,mesh.visible);mesh.visible=false;}}
 resolveFade(rec,fadeOn,clock){
  const state=rec.state;let progress=-1;
  // The card is only drawable while this piece's impostor maps are resident. A tier change (Low <-> Medium/High) releases the maps (texture disposed, bitmap closed)
  // and the card then stops being "ready": that is a resource change, not a distance change, so it never fades; drawing the card then would upload the released
  // 0x0 texture again (one leaked GL texture per card face) and show an unmapped quad.
  const cardReady=this.enabled&&Boolean(this.stage?.impostors.has(rec.name));
  if(rec.shown===null)rec.shown=state;
  else if(state!==rec.shown){
   const from=rec.shown,fromPiece=from<0?null:rec.piece[from===3?2:from],toPiece=state<0?null:rec.piece[state===3?2:state];
   if(fadeOn&&rec.clean&&fromPiece&&toPiece&&(cardReady||from!==3&&state!==3)){rec.from=from;rec.to=state;rec.start=clock;rec.active=true;this.fadeStats.started++;}
   else{if(rec.active)this.fadeStats.snapped++;rec.active=false;}
   rec.shown=state;
  }
  if(rec.active){if(!fadeOn||!rec.clean||clock<rec.start||(rec.from===3||rec.to===3)&&!cardReady){rec.active=false;this.fadeStats.snapped++;}else{progress=lodFadeProgress(clock,rec.start,this.fadeSeconds);if(progress>=1){rec.active=false;progress=-1;}}}
  if(progress<0){if(rec.applied)this.clearRecFade(rec);if(state===3)this.showCard(rec,true);return;}
  // Fading: both representations drawn, complementary dither; shared meshes (kit-2 body in 2 <-> 3) stay solid.
  if(rec.applied&&(rec.lastFrom!==rec.from||rec.lastTo!==rec.to))this.clearRecFade(rec);
  const fromRepr=rec.from,toRepr=rec.to;this.fadeStamp++;
  this.markRepr(rec,fromRepr,encodeInstanceFade(true,progress),false);this.markRepr(rec,toRepr,encodeInstanceFade(false,progress),true);
  rec.piece[fromRepr===3?2:fromRepr].node.visible=true;rec.piece[toRepr===3?2:toRepr].node.visible=true;rec.applied=true;rec.lastFrom=fromRepr;rec.lastTo=toRepr;
  const cardInvolved=fromRepr===3||toRepr===3,trussesInvolved=fromRepr===2||toRepr===2;
  if(cardInvolved)this.showCard(rec,!trussesInvolved);
 }
 resetFades(){for(const rec of this.pieceFades.values())if(rec.applied)this.clearRecFade(rec);}
 snapFades(){for(const rec of this.pieceFades.values())if(rec.active){rec.active=false;this.fadeStats.snapped++;}}
 beginFrame(camera){this.mainCamera=camera;this.resetCounter(this.native.original);this.resetCounter(this.native.impostor);
  for(const id in this.native.perImpostorPart)this.resetCounter(this.native.perImpostorPart[id]);
  for(const id in this.native.perOriginalTrussPart)this.resetCounter(this.native.perOriginalTrussPart[id]);
 }
 resetCounter(part){part.main.calls=0;part.main.triangles=0;part.shadow.calls=0;part.shadow.triangles=0;}
 get diagnostics(){const resources=this.stage?.resources.filter(r=>!r.released)??[],decodedBytes=resources.reduce((n,r)=>n+r.decodedBytes,0),activeParts=Array.from(this.cards.values()).filter(c=>c.root.visible&&c.root.parent?.visible).length;return {owner:'m01-bridge-finish-v2',enabled:this.enabled,revision:this.revision,status:this.status,tier:this.tier,loadedFamilies:Array.from(this.stage?.families.keys()??[]),boundMeshes:this.bindings.size,borrowedResources:'untouched; originals restored before dependent owners dispose',worldRevision:this.worldRevision,resources:{textures:resources.length,bitmaps:resources.filter(r=>r.bitmap).length,decodedBytes,mipmapBytes:resources.reduce((n,r)=>n+r.mipmapBytes,0),mipmapAccounting:'exact full RGBA8 chain from authored dimensions; calculated bytes, not physical VRAM',limitBytes:(this.tier==='low'?4:16)*1048576,ownedMaterials:Array.from(this.materialCache.values()).reduce((n,c)=>n+c.size,0)+this.cards.size*2,ownedGeometries:this.cards.size*2},impostors:{readyParts:this.stage?.impostors.size??0,activeParts,geometryDerived:true,source:impostorManifest.sources,shadowCaster:false,maxDrawsPerPart:2,maxTrianglesPerPart:4},lod:this.lod.diagnostics,fade:{seconds:this.fadeSeconds,started:this.fadeStats.started,snapped:this.fadeStats.snapped,active:Array.from(this.pieceFades.values()).filter(r=>r.active).length},native:structuredClone(this.native),errors:this.stage?.errors??[]};}
 dispose(){if(this.disposed)return;this.disposed=true;this.resetFades();this.clearBindings();this.restoreFar();this.cancelStage();for(const [mesh,r]of this.callbacks){if(mesh.onBeforeRender===r.onBeforeRender)mesh.onBeforeRender=r.before;if(mesh.onBeforeShadow===r.onBeforeShadow)mesh.onBeforeShadow=r.shadow;}this.callbacks.clear();for(const c of this.cards.values()){c.root.removeFromParent();for(const mesh of [c.side,c.top]){mesh.geometry.dispose();mesh.material.dispose();}}this.cards.clear();this.revision++;}
}
