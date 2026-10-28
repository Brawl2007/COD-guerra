import * as THREE from 'three';

// M01's grenade view is a 7 cm sphere following authoritative projectile
// coordinates. Share one mesh geometry/material across all M02 instances.
export class M02Grenades{
 constructor(scene,material){
  this.root=new THREE.Group();this.root.name='M02 grenade projectiles';scene.add(this.root);
  this.geometry=new THREE.SphereGeometry(1,20,14);this.material=material;this.views=new Map();
 }
 update(sim){
  const live=new Set();
  for(const grenade of sim.grenades??[]){
   if(grenade.exploded||![grenade.x,grenade.y,grenade.z].every(Number.isFinite))continue;
   live.add(grenade.id);let mesh=this.views.get(grenade.id);
   if(!mesh){mesh=new THREE.Mesh(this.geometry,this.material);mesh.name=`M02 ${grenade.id}`;mesh.scale.setScalar(.07);mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);this.views.set(grenade.id,mesh);}
   mesh.position.set(grenade.x,grenade.y,grenade.z);
  }
  for(const [id,mesh]of this.views)if(!live.has(id)){mesh.removeFromParent();this.views.delete(id);}
 }
 get diagnostics(){return {active:this.views.size,ids:[...this.views.keys()]};}
 dispose(){this.root.removeFromParent();this.views.clear();this.root.clear();this.geometry.dispose();}
}
