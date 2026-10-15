import * as THREE from 'three';
export const TRAIN_ARRIVALS=Object.freeze({train963:{from:17010,until:17100,distance:600,finalX:1075,z:-2.5},panzerzug:{from:17460,until:17520,distance:400,finalX:1119,z:2.5}});
// Front-most original engine LOD2 vertex is -8.414942m (963), -8.108891m (Panzerzug).
// Keep the halo outside original body/buffers to avoid an occluded fog-free lamp.
export const TRAIN_HEADLAMP_OFFSET=-8.65;
// A 4m radial glow keeps an unresolved lamp rasterized at ~1km; the original lens/art stays intact.
export const TRAIN_HEADLAMP_DIAMETER=4;
export const TRAIN_PUFF_CAP=Object.freeze({low:12,medium:18,high:24});
export function trainOffset(battleClock,id='train963'){
  const p=TRAIN_ARRIVALS[id],u=Math.max(0,Math.min(1,(battleClock-p.from)/(p.until-p.from)));
  return p.distance*(1-u*u*(3-2*u));
}
export const trainX=(battleClock,id='train963')=>TRAIN_ARRIVALS[id].finalX+trainOffset(battleClock,id);
export class M01TrainLife{
  constructor(train,panzerzug){
    this.parents=[train,panzerzug];this.sources=[{id:'train963',x:0,y:3.8,z:-2.5,active:false},{id:'panzerzug',x:0,y:3.8,z:2.5,active:false}];
    const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const n=(y*32+x)*4,r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);pixels[n]=255;pixels[n+1]=228;pixels[n+2]=160;pixels[n+3]=Math.round(255*Math.pow(Math.max(0,1-r),1.4));}
    this.lampTexture=new THREE.DataTexture(pixels,32,32);this.lampTexture.needsUpdate=true;
    this.lamps=this.parents.map((parent,i)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(TRAIN_HEADLAMP_DIAMETER,TRAIN_HEADLAMP_DIAMETER),new THREE.MeshBasicMaterial({color:'#ffffff',map:this.lampTexture,transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide}));
      mesh.material.forceSinglePass=true;mesh.name='train_headlamp';mesh.position.set(TRAIN_ARRIVALS[this.sources[i].id].finalX+TRAIN_HEADLAMP_OFFSET,2.5,this.sources[i].z);mesh.rotation.y=Math.PI/2;parent.add(mesh);return mesh;});
    this.clock=0;
    this.observed=new Map();this.native={calls:0,triangles:0,byMesh:{}};this.sourceRevision=null;
  }
  observe(revision){if(this.sourceRevision===revision)return;this.sourceRevision=revision;
    for(const parent of this.parents)parent.traverse(mesh=>{if(!mesh.isMesh||this.observed.has(mesh))return;const before=mesh.onBeforeRender,owner=this;
      mesh.onBeforeRender=function(renderer,scene,camera,geometry,material,group){before.call(this,renderer,scene,camera,geometry,material,group);if(camera!==owner.mainCamera)return;
        owner.native.calls++;owner.native.byMesh[this.name]=(owner.native.byMesh[this.name]??0)+1;owner.native.triangles+=(group?.count??geometry.index?.count??geometry.attributes.position.count)/3*(this.isInstancedMesh?this.count:1);};
      this.observed.set(mesh,before);
    });
  }
  beginFrame(camera){this.mainCamera=camera;this.native.calls=0;this.native.triangles=0;for(const key of Object.keys(this.native.byMesh))this.native.byMesh[key]=0;}
  update(battleClock){this.clock=battleClock;for(let i=0;i<2;i++){
    const s=this.sources[i],p=TRAIN_ARRIVALS[s.id],offset=trainOffset(battleClock,s.id);
    this.parents[i].position.x=offset;this.parents[i].visible=battleClock>=p.from;s.active=this.parents[i].visible;s.x=p.finalX-3+offset;
  }return this.sources;}
  get diagnostics(){return {battleClock:this.clock,trains:this.sources.map((s,i)=>({id:s.id,x:trainX(this.clock,s.id),offset:this.parents[i].position.x,
    visible:this.parents[i].visible,headlamp:this.lamps[i].visible&&this.parents[i].visible,fog:this.lamps[i].material.fog,arrival:TRAIN_ARRIVALS[s.id]})),native:{...this.native,byMesh:{...this.native.byMesh}},puffCaps:TRAIN_PUFF_CAP};}
  dispose(){for(const [mesh,before]of this.observed)mesh.onBeforeRender=before;this.observed.clear();for(const m of this.lamps){m.removeFromParent();m.geometry.dispose();m.material.dispose();}this.lampTexture.dispose();}
}
