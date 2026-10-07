import * as THREE from 'three';
import {M01TrainConsistDetail,M01_TRAIN_ART_OFFSET_Y,m01WagonArtMatrix,m01WagonVariation} from './m01-train-consist-detail.js';

const BASE='assets/models/provisional/m01-wagons/';
const TYPES=['covered','open'];
export const M01_TRAIN_WAGON_PLAN=Object.freeze(Array.from({length:65},(_,i)=>Object.freeze({id:`train963_wagon_${String(i+1).padStart(2,'0')}`,type:i%4===3?'open':'covered',x:1090+i*9.1})));
export const M01_WAGON_LOD=Object.freeze({
  low:Object.freeze({near:45,mid:180,hysteresis:14}),
  medium:Object.freeze({near:80,mid:300,hysteresis:18}),
  high:Object.freeze({near:120,mid:420,hysteresis:24}),
});
export function chooseWagonLod(distance,quality='medium',previous=null){
  const q=M01_WAGON_LOD[quality]??M01_WAGON_LOD.medium,h=q.hysteresis;
  if(previous===0&&distance<=q.near+h)return 0;
  if(previous===1){if(distance<q.near-h)return 0;if(distance<=q.mid+h)return 1;return 2;}
  if(previous===2&&distance>=q.mid-h)return 2;
  return distance<q.near?0:distance<q.mid?1:2;
}
export const wagonLodCandidates=lod=>lod===0?[0,1,2]:lod===1?[1,2,0]:[2,1,0];
const key=(type,lod)=>`${type}:${lod}`;
const path=(type,lod)=>`${BASE}m01_wagon_${type}_lod${lod}.glb`;

export class M01TrainWagons {
  constructor(parent,assets,box,cylinder,wood,metal){
    this.group=new THREE.Group();parent.add(this.group);this.assets=assets;this.sources=new Map();this.batches=[];this.revision=0;this.disposed=false;
    this.proxyBody=new THREE.InstancedMesh(box,wood,65);this.proxyWheels=new THREE.InstancedMesh(cylinder,metal,130);
    this.group.add(this.proxyBody,this.proxyWheels);this.lods=new Map(M01_TRAIN_WAGON_PLAN.map(w=>[w.id,2]));this.lastQuality=null;
    this.detail=new M01TrainConsistDetail(this.group,box,wood);this.rebuild();
  }
  async load(){
    await Promise.allSettled(TYPES.flatMap(type=>[0,1,2].map(async lod=>{
      try{const source=await this.assets.load(`wagon:${type}:${lod}`,path(type,lod));if(!this.disposed){this.sources.set(key(type,lod),source);this.rebuild();this.revision++;}}
      catch{/* Optional art: closest loaded LOD or procedural proxy remains visible. */}
    })));
  }
  update(player,quality='medium'){
    let changed=quality!==this.lastQuality;this.lastQuality=quality;
    for(const wagon of M01_TRAIN_WAGON_PLAN){
      const distance=Math.hypot(wagon.x-player.x,-2.5-player.z),previous=this.lods.get(wagon.id),next=chooseWagonLod(distance,quality,previous);
      if(next!==previous){this.lods.set(wagon.id,next);changed=true;}
    }
    if(changed){this.rebuild();this.revision++;}
  }
  bestSource(type,lod){
    for(const candidate of wagonLodCandidates(lod)){const source=this.sources.get(key(type,candidate));if(source)return {source,lod:candidate};}
    return null;
  }
  rebuild(){
    if(this.disposed)return;
    for(const b of this.batches){b.removeFromParent();b.dispose();}this.batches=[];
    const dummy=new THREE.Object3D(),matrix=new THREE.Matrix4(),groups=new Map(),drawn=[];let missing=0;
    for(const wagon of M01_TRAIN_WAGON_PLAN){
      const desired=this.lods.get(wagon.id)??2,best=this.bestSource(wagon.type,desired);
      drawn.push({wagon,lod:best?.lod??null,desired});
      if(!best){
        dummy.position.set(wagon.x,2,-2.5);dummy.rotation.set(0,0,0);dummy.scale.set(7.86,3.2,2.8);dummy.updateMatrix();this.proxyBody.setMatrixAt(missing,dummy.matrix);
        for(const [k,offset]of [-2,2].entries()){dummy.position.set(wagon.x+offset,.4,-2.5);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.set(.6,3.1,.6);dummy.updateMatrix();this.proxyWheels.setMatrixAt(missing*2+k,dummy.matrix);}missing++;continue;
      }
      const groupKey=key(wagon.type,best.lod);if(!groups.has(groupKey))groups.set(groupKey,{source:best.source,wagons:[],lod:best.lod,type:wagon.type});groups.get(groupKey).wagons.push(wagon);
    }
    this.proxyBody.count=missing;this.proxyWheels.count=missing*2;for(const b of [this.proxyBody,this.proxyWheels]){b.instanceMatrix.needsUpdate=true;b.computeBoundingSphere();}
    const arts=new Map(),tints=new Map();   // once per wagon, not per GLB node
    for(const {wagons} of groups.values())for(const w of wagons){arts.set(w.id,m01WagonArtMatrix(w));tints.set(w.id,new THREE.Color(...m01WagonVariation(w.id).tint));}
    for(const {source,wagons,lod,type} of groups.values()){
      source.scene.updateMatrixWorld(true);source.scene.traverse(node=>{if(!node.isMesh||node.userData.visible===false)return;
        const batch=new THREE.InstancedMesh(node.geometry,node.material,wagons.length);batch.name=`wagon_${type}_lod${lod}_${node.name}`;batch.userData.lod=lod;batch.receiveShadow=true;batch.castShadow=lod===0&&this.lastQuality!=='low';
        // Plan x/z stay authoritative; the art sits on the siding's rail top and keeps its own per-id tone and end orientation.
        wagons.forEach((w,i)=>{batch.setMatrixAt(i,matrix.multiplyMatrices(arts.get(w.id),node.matrixWorld));batch.setColorAt(i,tints.get(w.id));});
        batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;batch.computeBoundingSphere();this.batches.push(batch);this.group.add(batch);
      });
    }
    this.detail.sync(drawn,this.lastQuality??'medium');
  }
  get diagnostics(){
    const distribution={0:0,1:0,2:0};for(const lod of this.lods.values())distribution[lod]++;
    const active={0:0,1:0,2:0};for(const b of this.batches)active[b.userData.lod]=(active[b.userData.lod]??0)+b.count;
    return {wagons:M01_TRAIN_WAGON_PLAN.length,step:9.1,lodDistribution:distribution,loaded:[...this.sources.keys()].sort(),proxies:this.proxyBody.count,batches:this.batches.length,activeInstancesByLod:active,visible:this.group.parent?.visible??false,first:[M01_TRAIN_WAGON_PLAN[0].x,0,-2.5],last:[M01_TRAIN_WAGON_PLAN.at(-1).x,0,-2.5],
      artOffsetY:M01_TRAIN_ART_OFFSET_Y,shadowCasters:this.batches.filter(b=>b.castShadow).length+this.detail.diagnostics.shadowCasters,detail:this.detail.diagnostics};
  }
  dispose(){if(this.disposed)return;this.disposed=true;for(const b of [...this.batches,this.proxyBody,this.proxyWheels])b.dispose();this.detail.dispose();this.group.removeFromParent();this.batches=[];this.sources.clear();}
}
