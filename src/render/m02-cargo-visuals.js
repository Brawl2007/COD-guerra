import {AssetManager} from '../assets/asset-manager.js';
const BASE='assets/models/provisional/m01/props/';
// Use the accepted M01 models; ownership and optional failures retain the
// existing M02 proxies until the complete replacement is available.
export class M02CargoVisuals {
 constructor(){this.assets=new AssetManager();this.models=new Map();this.ready=Promise.allSettled(['horse_cart','ammo_crate_wood','barrel_wood'].map(async id=>{const asset=await this.assets.load(id,`${BASE}m01_prop_${id}_lod0.glb`);this.models.set(id,asset.scene);}));}
 install(group,id,scale){
  if(!group||group.userData.m01Cargo||!this.models.has(id))return;
  const root=this.models.get(id).clone(true);root.scale.set(...scale);root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
  group.clear();group.add(root);group.userData.m01Cargo=id;
 }
 sync(renderer){
  this.install(renderer.supplyCartMesh,'horse_cart',[1.45,1,.7]);
  for(const [id,group]of renderer.supplyVolumeMeshes)this.install(group,id==='vol_water'?'barrel_wood':'ammo_crate_wood',id==='vol_water'?[1,.65,1]:[.75,1.4,1.5]);
 }
 dispose(){this.assets.dispose();}
}
