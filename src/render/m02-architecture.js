import * as THREE from 'three';

// Small facade/roof details use the shared M01 surface atlas. They stay on the
// existing wall shell, above reach or outside the authored door/window aperture.
export function addM02Architecture(group,world,materials){
 const box=(x,y,z,w,h,d,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 for(const b of world.layout.buildings){
  const [x0,x1,z0,z1]=b.bounds,h=b.wallHeight??2.8;
  const wood=b.roofMaterial==='wood'||b.id==='B02'||b.id==='B03';
  const trim=wood?materials.wood_frame:materials.stone;
  for(const x of [x0,x1])for(const z of [z0,z1])box(x,h/2,z,.13,h,.13,trim);
  for(const z of [z0,z1])box((x0+x1)/2,h-.08,z,x1-x0+.25,.16,.16,trim);
  for(const x of [x0,x1])box(x,h-.08,(z0+z1)/2,.16,.16,z1-z0+.25,trim);
  // Ridge cap breaks the perfectly flat procedural roof silhouette.
  box((x0+x1)/2,b.ridgeHeight??h+1.8,(z0+z1)/2,x1-x0+.5,.14,.22,materials.roof_wood);
  if(b.id==='B01'||b.id==='B04'||b.id==='B12'){
   box(x0+2,h+.5,z0+2,.8,1.6,.7,materials.brick_cover);
   box(x0+2,h+1.34,z0+2,1,.16,.9,materials.stone);
  }
 }
 for(const win of world.windows){
  const horizontal=win.orientation==='H',height=win.lintelY-win.sillY;
  for(const sign of [-1,1]){
   const x=win.center.x+(horizontal?sign*(win.width*.75):.08);
   const z=win.center.z+(!horizontal?sign*(win.width*.75):.08);
   box(x,win.center.y,z,horizontal?win.width*.44:.06,height,horizontal?.06:win.width*.44,materials.wood_frame);
  }
 }
}

export function applyM02SurfaceUvs(root){
 root.traverse(node=>{
  if(!node.isMesh||!node.material.userData.m01Atlas||node.userData.metricUvs)return;
  const {uv,position,normal}=node.geometry.attributes;if(!uv||!normal)return;
  const tile=node.material.userData.m01Atlas.tileMetres,metres=Array.isArray(tile)?tile[0]:tile;
  for(let i=0;i<uv.count;i++){
   const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i));
   uv.setXY(i,(nx>.5?position.getZ(i):position.getX(i))/(metres||2),(ny>.5?position.getZ(i):position.getY(i))/(metres||2));
  }
  uv.needsUpdate=true;node.userData.metricUvs=true;
 });
}
