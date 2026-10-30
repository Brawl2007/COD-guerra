import * as THREE from 'three';

// B01 has authored solid collision boxes but no M01 furniture asset. Use the
// existing M01 materials to describe their contents, without changing those
// boxes or claiming the gaps under the table are traversable or shootable.
export function createM02FarmFurniture(ob,materials){
 if(!['prop_b01_stove','prop_b01_table','prop_b01_bed_west','prop_b01_bed_east'].includes(ob?.id))return null;
 const sx=ob.max.x-ob.min.x,sy=ob.max.y-ob.min.y,sz=ob.max.z-ob.min.z;
 if(!(sx>0&&sy>0&&sz>0))return null;
 const root=new THREE.Group();root.name=`M02 furniture ${ob.id}`;
 root.position.set(ob.min.x,ob.min.y,ob.min.z);
 const box=(name,x,y,z,w,h,d,material)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.name=name;
  mesh.position.set(x+w/2,y+h/2,z+d/2);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 };
 if(ob.id==='prop_b01_table'){
  const top=Math.min(.09,sy*.2),leg=Math.min(.10,sx*.1,sz*.1);
  box('table top',0,sy-top,0,sx,top,sz,materials.wood_thin);
  for(const x of [0,sx-leg])for(const z of [0,sz-leg])box('table leg',x,0,z,leg,sy-top,leg,materials.wood_frame);
 }else if(ob.id==='prop_b01_stove'){
  const top=Math.min(.08,sy*.1),plate=Math.min(.015,sz*.02);
  box('masonry',0,0,0,sx,sy-top,sz-plate,materials.stone);
  box('stove top',0,sy-top,0,sx,top,sz,materials.gun_metal);
  box('firebox door',sx*.23,sy*.25,sz-plate,sx*.54,sy*.34,plate,materials.gun_metal);
 }else{
  const rail=Math.min(.08,sx*.1,sz*.1),base=sy*.25,mattress=sy*.48;
  box('bed base',0,0,0,sx,base,sz,materials.wood_frame);
  box('mattress',rail,base,rail,sx-2*rail,mattress,sz-2*rail,materials.roof_thatch);
  box('headboard',0,base,sz-rail,sx,sy-base,rail,materials.wood_frame);
  box('left rail',0,base,0,rail,sy*.25,sz,materials.wood_frame);
  box('right rail',sx-rail,base,0,rail,sy*.25,sz,materials.wood_frame);
  box('pillow',sx*.24,base+mattress,sz*.68,sx*.52,sy*.14,sz*.20,materials.brick_B01);
 }
 return root;
}
