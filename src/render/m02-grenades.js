import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const RELEASE_QUATERNION=new THREE.Quaternion(.09279,.19804,.30629,.92648).normalize();
const SPIN_AXIS=new THREE.Vector3(1,0,0);

// The M01 projectile was a featureless 14 cm sphere. No grenade GLB exists in
// the supplied asset library, so this small original stand-in uses the same
// material and one shared geometry for the hand and real projectiles. It is
// deliberately not presented as a historically verified wz.33 model.
function grenadeGeometry(){
 const profile=[[0,-.69],[.25,-.69],[.38,-.59],[.43,-.42],[.44,-.24],
  [.44,.25],[.40,.49],[.30,.59],[.18,.62],[0,.62]].map(([r,y])=>new THREE.Vector2(r,y));
 const body=new THREE.LatheGeometry(profile,24);
 const fuse=new THREE.CylinderGeometry(.16,.20,.16,16);fuse.translate(0,.68,0);
 const collar=new THREE.CylinderGeometry(.22,.22,.055,16);collar.translate(0,.61,0);
 const lever=new THREE.BoxGeometry(.13,.52,.055);lever.rotateZ(-.18);lever.translate(.38,.37,0);
 const pieces=[body,fuse,collar,lever],geometry=mergeGeometries(pieces);
 for(const part of pieces)part.dispose();
 geometry.computeBoundingSphere();return geometry;
}

export class M02Grenades{
 constructor(scene,material){
  this.root=new THREE.Group();this.root.name='M02 grenade projectiles';scene.add(this.root);
  this.geometry=grenadeGeometry();this.material=material;this.views=new Map();
  this.cameraRotation=new THREE.Quaternion();this.spin=new THREE.Quaternion();this.euler=new THREE.Euler(0,0,0,'YXZ');
 }
 update(sim){
  const live=new Set();
  for(const grenade of sim.grenades??[]){
   if(grenade.exploded||![grenade.x,grenade.y,grenade.z].every(Number.isFinite))continue;
   live.add(grenade.id);let mesh=this.views.get(grenade.id);
   if(!mesh){mesh=new THREE.Mesh(this.geometry,this.material);mesh.name=`M02 ${grenade.id}`;mesh.scale.setScalar(.07);mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);this.views.set(grenade.id,mesh);}
   mesh.position.set(grenade.x,grenade.y,grenade.z);
   if(grenade.releaseView){
    const {angle,pitch}=grenade.releaseView;
    this.cameraRotation.setFromEuler(this.euler.set(pitch,-angle-Math.PI/2,0,'YXZ'));
    // Measured at release from the M01 hand rig, in the weapon camera frame.
    mesh.quaternion.copy(this.cameraRotation).multiply(RELEASE_QUATERNION);
    const age=Math.max(0,sim.clock-grenade.spawnedAt);
    mesh.quaternion.multiply(this.spin.setFromAxisAngle(SPIN_AXIS,age*7));
   }else mesh.quaternion.identity();
  }
  for(const [id,mesh]of this.views)if(!live.has(id)){mesh.removeFromParent();this.views.delete(id);}
 }
 get diagnostics(){return {active:this.views.size,ids:[...this.views.keys()]};}
 dispose(){this.root.removeFromParent();this.views.clear();this.root.clear();this.geometry.dispose();}
}
