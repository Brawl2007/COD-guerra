import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import manifest from '../../assets/models/provisional/m01/structures/manifest.json' with {type:'json'};
const BASE='assets/models/provisional/m01/structures/';
export function fieldStructureLod(distance,quality='medium',previous=null){
 const near=quality==='high'?90:quality==='low'?0:55,mid=quality==='high'?260:quality==='low'?100:180;
 if(previous===0&&near>0&&distance<near+8)return 0;
 if(previous===1&&distance>=near-8&&distance<mid+12)return 1;
 if(previous===2&&distance>=mid-12)return 2;
 return distance<near?0:distance<mid?1:2;
}
// Each result is exclusively owned by this controller, including late and partial results.
export function disposeFieldAsset(asset){
 if(!asset?.scene)return;asset.scene.removeFromParent();const geometries=new Set(),materials=new Set(),textures=new Set();
 asset.scene.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);});
 for(const m of materials){for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();}for(const g of geometries)g.dispose();for(const t of textures)t.dispose();
}
export class M01FieldStructures {
 constructor(parent,{load}={}){
  this.root=new THREE.Group();this.root.name='m01-field-structures';parent.add(this.root);this.revision=0;this.enabled=true;this.disposed=false;this.pending=null;this.world=null;this.worldRevision=-1;this.quality='medium';
  this.loader=load??(file=>new GLTFLoader().loadAsync(`${import.meta.env?.BASE_URL??'/COD-guerra/'}${BASE}${file}`));
  this.records=manifest.structures.map(def=>{const root=new THREE.Group();root.name=def.id;root.position.fromArray(def.anchor);root.visible=false;this.root.add(root);return {def,root,assets:[],models:[],ready:false,failure:null,lod:null,variant:'intact',active:true,height:def.id==='forward_post'?1.1:null};});
 }
 load(){if(this.pending||this.disposed)return this.pending??Promise.resolve();this.pending=Promise.all(this.records.map(async record=>{
  const files=Object.values(record.def.files),results=await Promise.allSettled(files.map(async file=>{
   try{const asset=await this.loader(file.file);if(!asset?.scene)throw Error('Invalid scene '+file.file);
    if(this.disposed||record.failure){disposeFieldAsset(asset);return null;}record.assets.push(asset);return asset;
   }catch(error){if(!this.disposed&&!record.failure){record.failure=error?.message??String(error);for(const asset of record.assets)disposeFieldAsset(asset);record.assets.length=0;this.revision++;}throw error;}
  }));
  if(this.disposed||record.failure)return;
  for(let i=0;i<files.length;i++){const asset=results[i].value;asset.scene.name=`${record.def.id}:${files[i].variant}:lod${files[i].lod}`;asset.scene.visible=false;asset.scene.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=true;}});record.models.push({file:files[i],node:asset.scene});record.root.add(asset.scene);}
  record.ready=true;this.revision++;
 }));return this.pending;}
 setEnabled(value){if(this.disposed)return;const enabled=Boolean(value);if(enabled!==this.enabled){this.enabled=enabled;this.root.visible=enabled;this.revision++;}return enabled;}
 replaces(id){if(!this.enabled||this.disposed)return false;for(const r of this.records)if(r.ready&&(r.def.id===id||r.def.colliderIds.includes(id)))return true;return false;}
 sync(world,quality,player){
  if(this.disposed)return;this.quality=quality;
  if(world!==this.world||world.revision!==this.worldRevision){this.world=world;this.worldRevision=world.revision;
   const post=this.records[2];let cover=null;for(const c of world.covers)if(c.id==='cv_forward_post'){cover=c;break;}
   const height=cover?cover.max.y-cover.min.y:0,variant=height<=.45001?'destroyed':'intact';if(post.active!==Boolean(cover)||post.height!==height||post.variant!==variant){post.active=Boolean(cover);post.height=height;post.variant=variant;this.revision++;}
   if(cover){post.root.position.set((cover.min.x+cover.max.x)/2,cover.min.y,(cover.min.z+cover.max.z)/2);post.root.scale.y=height/(variant==='destroyed'?.45:1.1);}
  }
  for(const r of this.records){const lod=fieldStructureLod(Math.hypot(player.x-r.root.position.x,player.z-r.root.position.z),quality,r.lod);if(lod!==r.lod){r.lod=lod;this.revision++;}r.root.visible=r.ready&&r.active;for(const m of r.models)m.node.visible=m.file.lod===lod&&m.file.variant===r.variant;}
 }
 get diagnostics(){return {enabled:this.enabled,revision:this.revision,quality:this.quality,ready:this.records.every(r=>r.ready),collidersAdded:0,source:'original-procedural-CC0-1.0',structures:this.records.map(r=>({id:r.def.id,ready:r.ready,failure:r.failure,lod:r.lod,variant:r.variant,height:r.height,visible:this.enabled&&r.ready&&r.active,models:r.models.length,visibleModels:r.models.filter(m=>m.node.visible&&r.root.visible&&this.enabled).length,colliderIds:r.def.colliderIds})),roots:this.root.children.length};}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();for(const r of this.records){for(const asset of r.assets)disposeFieldAsset(asset);r.assets.length=0;r.models.length=0;r.ready=false;}this.revision++;}
}
