import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Far stock keeps every authored vertex, UV and material. Bake static node transforms
// into one geometry per identical material; no source GLB or shared geometry is changed.
export function batchFarWagon(source){
  source.scene.updateMatrixWorld(true);const groups=new Map(),scene=new THREE.Group(),owned=[];
  source.scene.traverse(node=>{if(!node.isMesh||node.userData.visible===false)return;
    if(Array.isArray(node.material))throw Error('Far wagon material groups require an explicit batching contract');
    const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();geometry.applyMatrix4(node.matrixWorld);
    if(!groups.has(node.material))groups.set(node.material,[]);groups.get(node.material).push(geometry);
  });
  for(const [material,parts]of groups){const geometry=mergeGeometries(parts,false);for(const p of parts)p.dispose();
    if(!geometry)throw Error('Incompatible far wagon attributes');owned.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.name='authored_far_stock_batch';scene.add(mesh);}
  return {...source,scene,ownedBatchGeometries:owned};
}
