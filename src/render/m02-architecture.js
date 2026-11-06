import * as THREE from 'three';

// Small facade/roof details use the shared M01 surface atlas. They stay on the
// existing wall shell, above reach or outside the authored door/window aperture.
export function addM02Architecture(group,world,materials){
 const box=(x,y,z,w,h,d,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 const beam=(a,b)=>{const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),mid=new THREE.Vector3(...a).addScaledVector(v,.5);const mesh=box(mid.x,mid.y,mid.z,.14,v.length(),.14,materials.wood_frame);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());};
 for(const cover of world.layout.c01Corridor?.covers??[]){
  if(cover.material!=='earth')continue;
  const [x0,y0,z0]=cover.min,[x1,y1]=cover.max;
  // Timber revetment follows the authored solid: no decorative cover, door or
  // foliage is introduced where the simulation would see an empty field.
  for(let x=x0+.25;x<x1;x+=1.1)box(x,(y0+y1)/2,z0+.045,.11,y1-y0,.09,materials.wood_thick);
  for(let y=y0+.13;y<y1-.08;y+=.22)box((x0+x1)/2,y,z0+.035,x1-x0,.17,.07,materials.wood_frame);
 }
 for(const b of world.layout.buildings){
  const [x0,x1,z0,z1]=b.bounds,h=b.wallHeight??2.8;
  const wood=b.roofMaterial==='wood'||b.id==='B02'||b.id==='B03';
  const trim=wood?materials.wood_frame:materials.stone;
  for(const x of [x0,x1])for(const z of [z0,z1])box(x,h/2,z,.13,h,.13,trim);
  for(const z of [z0,z1])box((x0+x1)/2,h-.08,z,x1-x0+.25,.16,.16,trim);
  for(const x of [x0,x1])box(x,h-.08,(z0+z1)/2,.16,.16,z1-z0+.25,trim);
  // Roof timbers stay above head height; the wall battens/plinth stay on
  // actual solid segments, never crossing a door or firing aperture.
  if(wood)for(let x=x0+1.8;x<x1-1;x+=4){
   beam([x,h+.05,z0],[x,h+.05,z1]);
   beam([x,h+.05,z0],[x,b.ridgeHeight??h+1.8,(z0+z1)/2]);
   beam([x,h+.05,z1],[x,b.ridgeHeight??h+1.8,(z0+z1)/2]);
  }
  // Ridge cap breaks the perfectly flat procedural roof silhouette.
  box((x0+x1)/2,b.ridgeHeight??h+1.8,(z0+z1)/2,x1-x0+.5,.14,.22,materials.roof_wood);
  if(b.id==='B01'||b.id==='B04'||b.id==='B12'){
   box(x0+2,h+.5,z0+2,.8,1.6,.7,materials.brick_cover);
   box(x0+2,h+1.34,z0+2,1,.16,.9,materials.stone);
  }
 }
 for(const ob of world.obstacles){
  if(ob.role!=='wall')continue;
  const {min,max}=ob,h=max.y-min.y,horizontal=max.x-min.x>max.z-min.z;
  if(/wood/.test(ob.material)&&h>.6){
   const start=horizontal?min.x:min.z,end=horizontal?max.x:max.z;
   for(let s=start+.3;s<end-.05;s+=.65)for(const side of [-1,1]){
    const x=horizontal?s:side<0?min.x-.012:max.x+.012,z=horizontal?(side<0?min.z-.012:max.z+.012):s;
    box(x,(min.y+max.y)/2,z,horizontal?.045:.03,h,horizontal?.03:.045,materials.wood_frame);
   }
  }
  if(min.y<.05&&h>.4&&/brick/.test(ob.material)){
   box((min.x+max.x)/2,.16,(min.z+max.z)/2,max.x-min.x+.025,.32,max.z-min.z+.025,materials.stone);
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
