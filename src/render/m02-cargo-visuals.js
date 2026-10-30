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

// Small, non-blocking set dressing placed on the authored B05 workbench.
// These are unmodified M01 props at their authored scale (the three-can group
// is reduced to fit the tabletop); they do not add simulation collision.
export function createM02WorkshopDressing(ob,models){
 if(ob?.id!=='prop_b05_workbench'||!['ammo_tin_box','ammo_crate_wood','jerrycans'].every(id=>models.has(id)))return null;
 const root=new THREE.Group();root.name='M02 B05 workbench dressing';
 const cx=(ob.min.x+ob.max.x)/2,cz=(ob.min.z+ob.max.z)/2;
 for(const [id,x,z,scale] of [['ammo_tin_box',cx-1.25,cz,1],['jerrycans',cx,cz-.15,.65],['ammo_crate_wood',cx+1.2,cz,1]]){
  const model=models.get(id).clone(true),bounds=new THREE.Box3().setFromObject(model);
  model.scale.setScalar(scale);model.position.set(x,ob.max.y-bounds.min.y*scale+.005,z);
  model.name=`M02 B05 ${id}`;model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});root.add(model);
 }
 return root;
}

// The M01 lantern sits on the kitchen table; the ordinary wooden crate fits
// inside the table's existing solid volume. Neither adds simulation collision.
export function createM02FarmDressing(ob,models){
 if(ob?.id!=='prop_b01_table'||!models.has('railway_lantern')||!models.has('supply_crate_planked'))return null;
 const root=new THREE.Group();root.name='M02 B01 kitchen dressing';
 const cx=(ob.min.x+ob.max.x)/2,cz=(ob.min.z+ob.max.z)/2;
 for(const [id,x,z,y] of [['railway_lantern',cx+.3,cz,ob.max.y],['supply_crate_planked',cx,cz,ob.min.y]]){
  const model=models.get(id).clone(true),bounds=new THREE.Box3().setFromObject(model);
  model.position.set(x,y-bounds.min.y+.005,z);model.name=`M02 B01 ${id}`;
  model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});root.add(model);
 }
 return root;
}
// Use the accepted M01 models; ownership and optional failures retain the
// existing M02 proxies until the complete replacement is available.
export class M02CargoVisuals {
 constructor(){this.assets=new AssetManager();this.models=new Map();this.ready=Promise.allSettled(['horse_cart','ammo_crate_wood','ammo_tin_box','jerrycans','barrel_wood','sandbag_run','supply_crate_planked','railway_lantern'].map(async id=>{const asset=await this.assets.load(id,`${BASE}m01_prop_${id}_lod0.glb`);this.models.set(id,asset.scene);}));}
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
  if(renderer.sim.activeCellId==='B'&&this.workshopRoot?.parent!==renderer.staticGroup){
   const bench=renderer.world.obstacles.find(ob=>ob.id==='prop_b05_workbench');
   const root=createM02WorkshopDressing(bench,this.models);
   if(root){renderer.staticGroup.add(root);this.workshopRoot=root;}
  }
  if(renderer.sim.activeCellId==='A'&&this.farmRoot?.parent!==renderer.staticGroup){
   const table=renderer.world.obstacles.find(ob=>ob.id==='prop_b01_table');
   const root=createM02FarmDressing(table,this.models);
   if(root){renderer.staticGroup.add(root);this.farmRoot=root;}
  }
  this.install(renderer.supplyCartMesh,'horse_cart',[1.45,1,.7]);
  for(const [id,group]of renderer.supplyVolumeMeshes)this.install(group,id==='vol_water'?'barrel_wood':'ammo_crate_wood',id==='vol_water'?[1,.65,1]:[.75,1.4,1.5]);
 }
 dispose(){this.assets.dispose();}
}
