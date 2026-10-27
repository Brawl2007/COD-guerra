import {AssetManager} from '../assets/asset-manager.js';
import * as THREE from 'three';
const BASE='assets/models/provisional/m01/props/';
export const m02AuthoredPropModel=ob=>ob.role!=='prop'?null:/sacaria|sacos de sementes/i.test(ob.name)?'sandbag_run':/caixas densas/i.test(ob.name)?'supply_crate_planked':null;
export function fitM02Prop(source,ob){
 const root=source.clone(true),box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
 root.scale.set((ob.max.x-ob.min.x)/size.x,(ob.max.y-ob.min.y)/size.y,(ob.max.z-ob.min.z)/size.z);
 root.position.set(ob.min.x-box.min.x*root.scale.x,ob.min.y-box.min.y*root.scale.y,ob.min.z-box.min.z*root.scale.z);
 root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});return root;
}
// Use the accepted M01 models; ownership and optional failures retain the
// existing M02 proxies until the complete replacement is available.
export class M02CargoVisuals {
 constructor(){this.assets=new AssetManager();this.models=new Map();this.ready=Promise.allSettled(['horse_cart','ammo_crate_wood','barrel_wood','sandbag_run','supply_crate_planked'].map(async id=>{const asset=await this.assets.load(id,`${BASE}m01_prop_${id}_lod0.glb`);this.models.set(id,asset.scene);}));}
 install(group,id,scale){
  if(!group||group.userData.m01Cargo||!this.models.has(id))return;
  const root=this.models.get(id).clone(true);root.scale.set(...scale);root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
  group.clear();group.add(root);group.userData.m01Cargo=id;
 }
 sync(renderer){
  for(const {proxy,ob,model}of renderer.authoredProps??[]){
   if(proxy.userData.m01PropInstalled||!this.models.has(model))continue;
   const root=fitM02Prop(this.models.get(model),ob);renderer.staticGroup.add(root);proxy.visible=false;proxy.userData.m01PropInstalled=model;
  }
  this.install(renderer.supplyCartMesh,'horse_cart',[1.45,1,.7]);
  for(const [id,group]of renderer.supplyVolumeMeshes)this.install(group,id==='vol_water'?'barrel_wood':'ammo_crate_wood',id==='vol_water'?[1,.65,1]:[.75,1.4,1.5]);
 }
 dispose(){this.assets.dispose();}
}
