import {AssetManager} from '../assets/asset-manager.js';

// Attach to the existing M01 animated weapon socket. Body, gait, recoil,
// batching and LOD selection still belong to M01Characters.
export class M02Weapons {
 constructor(){this.assets=new AssetManager();this.models=[];this.ready=Promise.allSettled([0,1].map(async lod=>{this.models[lod]=(await this.assets.load(`mp38:${lod}`,`assets/models/provisional/m02/weapons/mp38_lod${lod}.glb`)).scene;}));}
 update(characters,actors){
  for(const actor of actors){
   if(actor.weapon!=='mp38')continue;
   const v=characters.instances.get(actor.id);if(!v?.weaponBone)continue;
   const lod=v.key.endsWith(':0')?0:1,source=this.models[lod];if(!source)continue;
   if(!v.m02MP38){v.m02MP38=source.clone(true);v.m02MP38.name='m02_mp38';v.weaponBone.add(v.m02MP38);v.muzzle=[0,.032,-.5];}
   const armed=actor.alive&&actor.state!=='WOUNDED'&&actor.role!=='MEDIC';
   for(const mesh of v.meshes)if(mesh.name==='rifle'||mesh.name==='clip')mesh.visible=false;
   for(const batch of v.batches)if(batch.parts.some(p=>p.name==='rifle'))batch.mesh.visible=false;
   v.m02MP38.visible=armed;v.m02MP38.traverse(n=>{if(n.isMesh){n.castShadow=v.root.visible&&lod===0;n.receiveShadow=true;}});
  }
 }
}
