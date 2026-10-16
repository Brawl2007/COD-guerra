import * as THREE from 'three';

const BASE='assets/models/provisional/m01-wagons/';
const TYPES=['covered','open'];
// Provisional generic consist, not a reconstruction of the unidentified wagon types (P16).
const PLAN=Array.from({length:65},(_,i)=>({type:i%4===3?'open':'covered',x:1090+i*9.1}));

export class M01TrainWagons {
  constructor(parent,assets,box,cylinder,wood,metal){
    this.group=new THREE.Group();parent.add(this.group);this.assets=assets;
    this.sources=new Map();this.batches=[];this.revision=0;this.disposed=false;
    this.proxyBody=new THREE.InstancedMesh(box,wood,65);
    this.proxyWheels=new THREE.InstancedMesh(cylinder,metal,130);
    this.group.add(this.proxyBody,this.proxyWheels);this.rebuild();
  }
  async load(){
    await Promise.allSettled(TYPES.map(async type=>{
      try{
        const source=await this.assets.load(`wagon:${type}:2`,`${BASE}m01_wagon_${type}_lod2.glb`);
        if(!this.disposed){this.sources.set(type,source);this.rebuild();this.revision++;}
      }catch{/* Optional art: retain all missing wagons as instanced proxies. */}
    }));
  }
  rebuild(){
    for(const b of this.batches){b.removeFromParent();b.dispose();}this.batches=[];
    const dummy=new THREE.Object3D(),matrix=new THREE.Matrix4();let missing=0;
    for(const wagon of PLAN){
      if(this.sources.has(wagon.type))continue;
      dummy.position.set(wagon.x,2,-2.5);dummy.rotation.set(0,0,0);dummy.scale.set(7.86,3.2,2.8);dummy.updateMatrix();
      this.proxyBody.setMatrixAt(missing,dummy.matrix);
      for(const [k,offset]of [-2,2].entries()){
        dummy.position.set(wagon.x+offset,.4,-2.5);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.set(.6,3.1,.6);dummy.updateMatrix();
        this.proxyWheels.setMatrixAt(missing*2+k,dummy.matrix);
      }missing++;
    }
    this.proxyBody.count=missing;this.proxyWheels.count=missing*2;
    for(const b of [this.proxyBody,this.proxyWheels]){b.instanceMatrix.needsUpdate=true;b.computeBoundingSphere();}
    for(const [type,source]of this.sources){
      const wagons=PLAN.filter(w=>w.type===type);source.scene.updateMatrixWorld(true);
      source.scene.traverse(node=>{
        if(!node.isMesh||node.userData.visible===false)return;
        const batch=new THREE.InstancedMesh(node.geometry,node.material,wagons.length);batch.name=`wagon_${type}_${node.name}`;
        batch.receiveShadow=true;
        wagons.forEach((w,i)=>{
          dummy.position.set(w.x,0,-2.5);dummy.rotation.set(0,-Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
          batch.setMatrixAt(i,matrix.multiplyMatrices(dummy.matrix,node.matrixWorld));
        });
        batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();this.batches.push(batch);this.group.add(batch);
      });
    }
    // No wheel/door timers: the simulation does not yet provide train velocity or disembarkation data.
  }
  get diagnostics(){return {wagons:PLAN.length,step:9.1,lod:2,loaded:[...this.sources.keys()].sort(),
    proxies:this.proxyBody.count,batches:this.batches.length,visible:this.group.parent?.visible??false,
    first:[PLAN[0].x,0,-2.5],last:[PLAN.at(-1).x,0,-2.5]};}
  dispose(){if(this.disposed)return;this.disposed=true;for(const b of [...this.batches,this.proxyBody,this.proxyWheels])b.dispose();this.group.removeFromParent();this.batches=[];}
}
