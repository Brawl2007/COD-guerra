import * as THREE from 'three';
// Renderer authority only. The immutable bridge owns [0,1049]; this owner covers all approaches and the train extension.
export const M01_TRACK_BED_SPEC=Object.freeze({highStep:.63,lowStep:1.26,fishplateStep:15,headWidth:.07,bridgeHalfGauge:.7175,halfGauge:.7525,drawBudget:4});
const mix=(a,b,t)=>a+(b-a)*t;
export const M01_RAIL_CONTACT_REVEAL=Object.freeze({x0:-15,x1:0,halfWidth:1.66,ballastHalfWidth:1.7,centres:Object.freeze([-2,2]),centrelineSlope:1/140});
export function trackBedPaths(world){
 const paths=[],west=world.features.get('rail_embankment_west').polyline;
 for(const centre of [-2,2])paths.push({id:`west:${centre}`,centre,points:west});
 paths.push({id:'southwest',centre:0,points:world.features.get('rail_line_southwest').polyline});
 // A purely visual yard siding and tapered switch. No added obstacle, route or cover.
 paths.push({id:'station-siding',centre:0,points:[[-466,0,-30],[-438,0,-20],[-410,0,-13],[-340,0,-13]]});
 for(const sign of [-1,1]){
  paths.push({id:`east-join:${sign}`,centre:0,sign,points:[[1049,0,sign*2],[1055,0,sign*2.23076923077],[1062,0,sign*2.5]]});
  // Train art is immutable at z=-2.5. Its dedicated extension replaces (rather than overlaps) the old consist track.
  const end=world.features.get('rail_line_east').polyline[1];
  paths.push({id:`east-main:${sign}`,centre:0,points:[[1062,0,sign*2.5],[end[0],0,end[2]+sign*2.5]]});
  if(sign<0)paths.push({id:'train-extension',centre:0,points:[[1062,0,-2.5],[2000,0,-2.5]]});
 }
 return paths;
}
export function trackBedSample(world,path,a,b,t){
 const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),cx=mix(a[0],b[0],t),cz=mix(a[2],b[2],t),west=path.id.startsWith('west:'),u=Math.max(0,Math.min(1,-cx/15));
 const x=cx-dz/length*path.centre*(west?u:1),z=cz+path.centre*(west?mix(Math.sign(dx),dx/length,u):dx/length);
 let top=world.heightAt(x,z)+.33,halfGauge=M01_TRACK_BED_SPEC.halfGauge,angle=-Math.atan2(dz,dx);
 if(path.id==='train-extension')top=-.82;
 if(path.id.startsWith('east-main:')){const blend=Math.max(0,Math.min(1,(x-1062)/15));top=mix(-.82,top,blend);}
 if(west){top=mix(-.17,world.terrainHeightAt(x,z)+.33,u);halfGauge=mix(.7175,.7525,u);angle=mix(Math.PI,angle,u);}
 if(path.id.startsWith('east-join:')){const blend=(x-1049)/13;top=mix(.012,-.82,blend);halfGauge=mix(.7175,.7525,blend);angle=0;}
 const trainBlend=path.id==='train-extension'?1:path.id.startsWith('east-join:')?(x-1049)/13:path.id.startsWith('east-main:')?Math.max(0,1-(x-1062)/15):0;
 return {x,z,top,halfGauge,angle,trainBlend};
}
export function buildTrackBedDescriptors(world){
 const out={rails:[],sleepers:[],ballast:[],fishplates:[]},put=(name,p,size,angle,low=true)=>out[name].push({p,size,angle,low});
 for(const path of trackBedPaths(world)){let travelled=0,nextSleeper=.315,nextPlate=15;
  for(let i=1;i<path.points.length;i++){
   const a=path.points[i-1],b=path.points[i],length=Math.hypot(b[0]-a[0],b[2]-a[2]);if(!length||length>1800)continue;
   const sample=d=>trackBedSample(world,path,a,b,d/length);
   const n=Math.ceil(length/2);
   for(let j=0;j<n;j++){
    const start=sample(j*length/n),end=sample((j+1)*length/n),s=sample((j+.5)*length/n),len=length/n;
    // Sloped members use quaternion below; matching endpoints have no stair-step rail head.
    for(const side of [-1,1])for(const [drop,height,width,trainDrop,trainHeight]of [[.0225,.045,.07,.02,.04],[.0825,.075,.018,.07,.06],[.135,.03,.13,.11,.02]]){
     const shift=p=>[p.x+Math.sin(p.angle)*side*p.halfGauge,p.top-mix(drop,trainDrop,p.trainBlend),p.z+Math.cos(p.angle)*side*p.halfGauge];
     out.rails.push({a:shift(start),b:shift(end),width,height:mix(height,trainHeight,s.trainBlend)});
    }
    const ballastDrop=mix(.31,.145,s.trainBlend),depth=path.id.startsWith('east-join:')?Math.max(.28,s.top-world.terrainHeightAt(s.x,s.z)-ballastDrop):.28;
    out.ballast.push({a:[start.x,start.top-mix(.31,.145,start.trainBlend)-depth/2,start.z],b:[end.x,end.top-mix(.31,.145,end.trainBlend)-depth/2,end.z],width:3.4,height:depth});
   }
   while(nextSleeper<travelled+length){const s=sample(nextSleeper-travelled),index=Math.round((nextSleeper-.315)/.63);const height=mix(.16,.14,s.trainBlend),drop=mix(.15,.12,s.trainBlend)+height/2;put('sleepers',[s.x,s.top-drop,s.z],[.26,height,2.6],s.angle,index%2===0);nextSleeper+=.63;}
   while(nextPlate<travelled+length){const s=sample(nextPlate-travelled);for(const side of [-1,1])for(const face of [-1,1]){const offset=side*s.halfGauge+face*.022;put('fishplates',[s.x+Math.sin(s.angle)*offset,s.top-.08,s.z+Math.cos(s.angle)*offset],[.7,.065,.014],s.angle);}nextPlate+=15;}
   travelled+=length;
  }
 }
 // Tapered stock/tongue rails and a guarded frog at the authored siding junction.
 for(const [a,b]of [[[-466,0,-30.5],[-449,0,-25.3]],[[-466,0,-29.8],[-449,0,-24.7]],[[-449,0,-25.3],[-444,0,-22.9]]]){
  const ga=world.heightAt(a[0],a[2])+.33,gb=world.heightAt(b[0],b[2])+.33;out.rails.push({a:[a[0],ga-.07,a[2]],b:[b[0],gb-.07,b[2]],width:.038,height:.08});
 }
 return out;
}
export class M01TrackBed{
 constructor(parent,world,materials){this.root=new THREE.Group();this.root.name='m01-track-bed';parent.add(this.root);this.materials=materials;this.box=new THREE.BoxGeometry(1,1,1);this.batches={};this.revision=0;this.enabled=true;this.world=null;this.worldRevision=-1;this.quality=null;this.disposed=false;this.contactUniform={value:1};this.contactMaterials=[];this.sync(world,'medium');}
 rebuild(world){for(const b of Object.values(this.batches)){b.removeFromParent();b.dispose();}this.descriptors=buildTrackBedDescriptors(world);this.batches={};const dummy=new THREE.Object3D(),start=new THREE.Vector3(),end=new THREE.Vector3(),dir=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),side=new THREE.Vector3(),frame=new THREE.Matrix4();
  for(const [name,items]of Object.entries(this.descriptors)){
   const mesh=new THREE.InstancedMesh(this.box,this.materials[name==='sleepers'?'wood':name==='ballast'?'stone':'metal'],items.length);mesh.name=`m01-track-${name}`;mesh.receiveShadow=true;
   const matrices=[];for(const item of items){if(item.a){start.fromArray(item.a);end.fromArray(item.b);dir.copy(end).sub(start);const len=dir.length();dir.normalize();side.crossVectors(dir,up).normalize();const vertical=new THREE.Vector3().crossVectors(side,dir);frame.makeBasis(dir,vertical,side);dummy.quaternion.setFromRotationMatrix(frame);dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.scale.set(len,item.height,item.width);}else{dummy.position.fromArray(item.p);dummy.rotation.set(0,item.angle,0);dummy.scale.fromArray(item.size);}dummy.updateMatrix();matrices.push(Float32Array.from(dummy.matrix.elements));}
   mesh.userData.prepared=matrices;this.batches[name]=mesh;this.root.add(mesh);
  }
 }
 sync(world,quality){if(this.disposed)return;const changed=world!==this.world||world.revision!==this.worldRevision;if(changed){this.world=world;this.worldRevision=world.revision;this.rebuild(world);}if(changed||quality!==this.quality){this.quality=quality;for(const [name,batch]of Object.entries(this.batches)){let n=0;for(let i=0;i<this.descriptors[name].length;i++)if(quality!=='low'||this.descriptors[name][i].low!==false){batch.instanceMatrix.array.set(batch.userData.prepared[i],n*16);n++;}batch.count=n;batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();}this.revision++;}}
 // Only the occluding ground fragments beneath the terminal ballast are removed. Terrain vertices,
 // macro-material hook/cache key, world heights and bridge source geometry remain byte-identical.
 installContactReveal(material){if(!material||this.contactMaterials.some(p=>p.material===material))return;const compile=material.onBeforeCompile,key=material.customProgramCacheKey,uniform=this.contactUniform;
  const hook=shader=>{compile.call(material,shader);shader.uniforms.m01RailContact=uniform;shader.vertexShader='varying vec3 vM01RailContact;\n'+shader.vertexShader.replace('#include <project_vertex>','vM01RailContact=(modelMatrix*vec4(transformed,1.0)).xyz;\n#include <project_vertex>');shader.fragmentShader='varying vec3 vM01RailContact;uniform float m01RailContact;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float railCentreline=vM01RailContact.x/140.0;float railOffset=abs(vM01RailContact.z-railCentreline);
   if(m01RailContact>.5&&vM01RailContact.x>=-15.0&&vM01RailContact.x<=0.0&&abs(railOffset-2.0)<1.66)discard;`);};
  material.onBeforeCompile=hook;material.customProgramCacheKey=()=>key.call(material)+'-m01-rail-contact-v1';material.needsUpdate=true;this.contactMaterials.push({material,compile,key,hook});
 }
 setEnabled(value){value=Boolean(value);if(value!==this.enabled){this.enabled=value;this.root.visible=value;this.contactUniform.value=value?1:0;this.revision++;}return value;}
 get diagnostics(){return {owner:'m01-track-bed',bridgeOwner:'m01-bridge-structure',trainTrackOwner:'m01-track-bed',enabled:this.enabled,revision:this.revision,quality:this.quality,drawCalls:this.enabled?4:0,drawBudget:4,contactReveal:{...M01_RAIL_CONTACT_REVEAL,enabled:this.contactUniform.value===1,materials:this.contactMaterials.length},sleeperStep:this.quality==='low'?1.26:.63,fishplateStep:15,counts:Object.fromEntries(Object.entries(this.batches).map(([k,b])=>[k,b.count])),joins:[{x:0,top:-.17,centres:[-2,2],innerGauge:1.365},{x:1049,top:.012,centres:[-2,2],innerGauge:1.365},{x:1062,top:-.82,centres:[-2.5,2.5],innerGauge:1.435}],collidersAdded:0};}
 dispose(){if(this.disposed)return;this.disposed=true;for(const p of this.contactMaterials)if(p.material.onBeforeCompile===p.hook){p.material.onBeforeCompile=p.compile;p.material.customProgramCacheKey=p.key;p.material.needsUpdate=true;}this.contactMaterials=[];for(const b of Object.values(this.batches))b.dispose();this.box.dispose();this.root.removeFromParent();}
}
