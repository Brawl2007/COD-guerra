import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import manifest from '../../assets/models/provisional/m01/structures/manifest.json' with {type:'json'};
import {selectConsumerLod,createLodCounters,tallyLod,lodCounterTotals} from './m01-lod-policy.js';
import {M01LodFade} from './m01-lod-dither.js';
const BASE='assets/models/provisional/m01/structures/';
// T43 slice 2 clock: sync(world,quality,player) receives no clock and m01-view.js is out of scope for this slice, so the cross-fade uses a
// frame clock owned here: sync()'s optional 4th argument wins, then the injected `clock` option, then the browser's monotonic clock in
// seconds. Without a browser (node) the default is null => every LOD change is an instant swap, exactly as before the fade.
const frameClock=()=>typeof document!=='undefined'&&typeof performance!=='undefined'?performance.now()/1000:null;
export function fieldStructureLod(distance,quality='medium',previous=null){return selectConsumerLod('fieldStructures',distance,quality,previous);}
// Each result is exclusively owned by this controller, including late and partial results.
export function disposeFieldAsset(asset){
 if(!asset?.scene)return;asset.scene.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();
 asset.scene.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);});
 for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}for(const g of geometries)g.dispose();for(const t of textures)t.dispose();
}
export class M01FieldStructures {
 constructor(parent,{load,clock=frameClock}={}){
  this.root=new THREE.Group();this.root.name='m01-field-structures';parent.add(this.root);this.revision=0;this.enabled=true;this.disposed=false;this.pending=null;this.world=null;this.worldRevision=-1;this.quality='medium';this.clock=clock;this.lodCounters=createLodCounters();
  this.loader=load??(file=>new GLTFLoader().loadAsync(`${import.meta.env?.BASE_URL??'/COD-guerra/'}${BASE}${file}`));
  this.records=manifest.structures.map(def=>{const root=new THREE.Group();root.name=def.id;root.position.fromArray(def.anchor);root.visible=false;this.root.add(root);return {def,root,assets:[],models:[],ready:false,failure:null,lod:null,fade:new M01LodFade(),variant:'intact',active:true,height:def.id==='forward_post'?1.1:null};});
 }
 load(){if(this.pending||this.disposed)return this.pending??Promise.resolve();this.pending=Promise.all(this.records.map(async record=>{
  const files=Object.values(record.def.files),results=await Promise.allSettled(files.map(async file=>{
   try{const asset=await this.loader(file.file);if(!asset?.scene)throw Error('Invalid scene '+file.file);
    if(this.disposed||record.failure){disposeFieldAsset(asset);return null;}record.assets.push(asset);return asset;
   }catch(error){if(!this.disposed&&!record.failure){record.failure=error?.message??String(error);for(const asset of record.assets)disposeFieldAsset(asset);record.assets.length=0;this.revision++;}throw error;}
  }));
  if(this.disposed||record.failure)return;
  for(let i=0;i<files.length;i++){const asset=results[i].value;asset.scene.name=`${record.def.id}:${files[i].variant}:lod${files[i].lod}`;asset.scene.visible=false;asset.scene.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=true;}});record.models.push({file:files[i],node:asset.scene});record.root.add(asset.scene);record.fade.register(files[i].lod,asset.scene);}
  record.ready=true;this.revision++;
 }));return this.pending;}
 setEnabled(value){if(this.disposed)return;const enabled=Boolean(value);if(enabled!==this.enabled){this.enabled=enabled;this.root.visible=enabled;this.revision++;}return enabled;}
 replaces(id){if(!this.enabled||this.disposed)return false;for(const r of this.records)if(r.ready&&(r.def.id===id||r.def.colliderIds.includes(id)))return true;return false;}
 sync(world,quality,player,clock=null){
  if(this.disposed)return;const qualityChanged=quality!==this.quality;this.quality=quality;
  // Low preset and any preset change swap instantly; otherwise both levels dither for 0.3 s of the frame clock.
  const now=clock??this.clock?.()??null,fadeOk=quality!=='low'&&!qualityChanged;
  if(world!==this.world||world.revision!==this.worldRevision){this.world=world;this.worldRevision=world.revision;
   const post=this.records[2];let cover=null;for(const c of world.covers)if(c.id==='cv_forward_post'){cover=c;break;}
   const height=cover?cover.max.y-cover.min.y:0,variant=height<=.45001?'destroyed':'intact';if(post.active!==Boolean(cover)||post.height!==height||post.variant!==variant){post.active=Boolean(cover);post.height=height;post.variant=variant;this.revision++;}
   if(cover){post.root.position.set((cover.min.x+cover.max.x)/2,cover.min.y,(cover.min.z+cover.max.z)/2);post.root.scale.y=height/(variant==='destroyed'?.45:1.1);}
  }
  for(const r of this.records){const lod=fieldStructureLod(Math.hypot(player.x-r.root.position.x,player.z-r.root.position.z),quality,r.lod);if(lod!==r.lod){r.lod=lod;this.revision++;}r.root.visible=r.ready&&r.active;
   if(r.ready){const wasFading=r.fade.active,before=r.fade.switches;r.fade.set(lod,now,fadeOk);if(r.fade.switches!==before)tallyLod(this.lodCounters,quality,lod);if(wasFading&&!r.fade.active)this.revision++;}   // fade end redraws a retained (paused) frame
   for(const m of r.models)m.node.visible=r.fade.shows(m.file.lod)&&m.file.variant===r.variant;}
 }
 get diagnostics(){return {enabled:this.enabled,revision:this.revision,quality:this.quality,ready:this.records.every(r=>r.ready),collidersAdded:0,source:'original-procedural-CC0-1.0',lodSwitches:this.records.reduce((n,r)=>n+r.fade.switches,0),fading:this.records.some(r=>r.fade.active),lodFades:this.records.reduce((n,r)=>n+r.fade.fades,0),lodSnaps:this.records.reduce((n,r)=>n+r.fade.snaps,0),lodCounters:{low:lodCounterTotals(this.lodCounters,'low'),medium:lodCounterTotals(this.lodCounters,'medium'),high:lodCounterTotals(this.lodCounters,'high')},structures:this.records.map(r=>({id:r.def.id,ready:r.ready,failure:r.failure,lod:r.lod,lodSwitches:r.fade.switches,fading:r.fade.active,variant:r.variant,height:r.height,visible:this.enabled&&r.ready&&r.active,models:r.models.length,visibleModels:r.models.filter(m=>m.node.visible&&r.root.visible&&this.enabled).length,colliderIds:r.def.colliderIds})),roots:this.root.children.length};}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();for(const r of this.records){r.fade.dispose();for(const asset of r.assets)disposeFieldAsset(asset);r.assets.length=0;r.models.length=0;r.ready=false;}this.revision++;}
}
