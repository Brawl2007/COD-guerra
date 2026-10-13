import * as THREE from 'three';
import {texturedSurface} from './m01-surfaces.js';
import {M01FieldStructures} from './m01-field-structures.js';
import {M01StationArchitecture} from './m01-station-architecture.js';
import {buildM01EnvironmentProps,M01_PROP_QUALITY_RANK,propCountsForQuality} from './m01-environment-props.js';
import {vegetationNoise} from './m01-vegetation-layout.js';
import {M01VegetationRuntime} from './m01-vegetation-runtime.js';
import {M01TrackBed} from './m01-track-bed.js';
import {M01PropsRuntime} from './m01-props-runtime.js';

export {vegetationNoise};
export {M01_VEGETATION_LOD,M01_LEGACY_LEAF_CARD_ESTIMATE,chooseVegetationLod,chooseShrubLod,barkTint} from './m01-vegetation-runtime.js';

// Small decoration is non-solid. Trunks/buildings are outside the playable routes.
// This is art direction around measured infrastructure, not a historical survey.
export class M01Environment {
  constructor(scene,world,materials,{propVertexTextures=true,surfaceY,onVegetationUpdate}={}){
    this.group=new THREE.Group();scene.add(this.group);this.world=world;this.materials=materials;this.fieldProxyBatches=[];
    this.fieldStructures=new M01FieldStructures(this.group);this.fieldStructures.ready=this.fieldStructures.load();
    this.geometry={box:new THREE.BoxGeometry(1,1,1),rock:new THREE.DodecahedronGeometry(1,0),gravel:new THREE.TetrahedronGeometry(1),
      trunk:new THREE.CylinderGeometry(.72,1,1,9),leaf:new THREE.PlaneGeometry(1,1),bag:new THREE.CapsuleGeometry(.5,.4,3,7),
      groundShadow:new THREE.CircleGeometry(1,14).rotateX(-Math.PI/2)};
    this.bark=texturedSurface('wood',{worldScale:1,bump:.12,color:'#ffffff'});
    this.lists=new Map();this.resources=[];this.dynamic=[];this.grassBatches=[];this.propBatches=[];this.propDescriptors=[];this.propQuality='medium';
    let seed=19390901;this.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    this.buildVegetation();this.buildClutter();this.buildArchitecture();this.buildCovers();this.buildProductionDressing();this.flush();
    this.trackBed=new M01TrackBed(this.group,world,materials);this.propsRuntime=new M01PropsRuntime(this.group,{supported:propVertexTextures});this.propsRuntime.readyPromise=this.propsRuntime.load();
    this.vegetation=new M01VegetationRuntime(this.group,world,{surfaceY,bark:this.bark,onUpdate:onVegetationUpdate});this.vegetation.readyPromise=this.vegetation.load();
  }
  put(kind,material,p,size,rotation=[0,0,0],color=null,parentId=null,meta=null){
    const propQuality=meta?.propQuality??null,fieldProxy=meta?.fieldProxy??null,key=`${kind}:${material}:${parentId??'static'}:${propQuality??'base'}:${fieldProxy??''}`;
    if(!this.lists.has(key))this.lists.set(key,{kind,material,parentId,propQuality,fieldProxy,items:[]});
    this.lists.get(key).items.push({p,size,rotation,color});
  }
  flush(){
    const dummy=new THREE.Object3D();
    for(const list of this.lists.values()){
      const geometry=this.geometry[list.kind];
      const material=list.material==='bark'?this.bark:this.materials[list.material];
      const batch=new THREE.InstancedMesh(geometry,material,list.items.length);
      list.items.forEach((o,i)=>{dummy.position.set(...o.p);dummy.scale.set(...o.size);dummy.rotation.set(...o.rotation);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);if(o.color)batch.setColorAt(i,new THREE.Color(o.color));});
      batch.computeBoundingSphere();batch.castShadow=['box','trunk','bag','leaf'].includes(list.kind);batch.receiveShadow=true;
      this.group.add(batch);this.resources.push(batch);
      if(list.fieldProxy){batch.userData.m01FieldProxy=list.fieldProxy;this.fieldProxyBatches.push(batch);}
      if(list.propQuality){batch.userData.m01PropQuality=list.propQuality;this.propBatches.push(batch);}
      if(list.parentId)this.dynamic.push({batch,id:list.parentId,height:this.world.covers.find(c=>c.id===list.parentId)?.max.y-this.world.covers.find(c=>c.id===list.parentId)?.min.y});
    }
    this.lists.clear();
  }
  buildVegetation(){
    const r=this.random;
    // The legacy random calls are consumed exactly as before so later clutter keeps its approved coordinates.
    for(let t=0;t<this.world.trees.length;t++)for(let i=0;i<6+25*8;i++)r();
    for(let i=0;i<68;i++)for(let k=0;k<5+5*2+16*8;k++)r();
    for(let i=0;i<2400;i++){
      const x=-620+r()*620,z=-95+r()*205;
      if((z>-13&&z<52&&r()<.85)||Math.hypot(x+260,z-70)<12)continue;
      r();r();r();
    }
    for(let i=0;i<440;i++)for(let k=0;k<5;k++)r();
  }
  get treeDescriptors(){return this.vegetation.treeDescriptors;}
  get shrubDescriptors(){return this.vegetation.shrubDescriptors;}
  get layout(){return this.vegetation.layout;}
  syncVegetation(world,quality,player,clock,surfaceRevision){this.vegetation.sync(world,quality,player,clock,surfaceRevision);}
  buildClutter(){
    const r=this.random;
    for(let i=0;i<1900;i++){
      const x=-550+r()*545,z=-65+r()*170,y=this.world.terrainHeightAt(x,z);
      const size=.045+r()*.14;
      this.put('rock','stone',[x,y+size*.23,z],[size,size*.3,size*.8],[r(),r()*6,r()],new THREE.Color().setHSL(.10,.10,.23+r()*.24));
      if(i%5===0)this.put('leaf','wood',[x+.2,y+.018,z+.12],[.10,.06,.08],[-Math.PI/2,r()*6,0]);
    }
    // Timber piles, crates, coils and posts beside the existing hut. No new solid route blocks.
    for(let i=0;i<12;i++)this.put('trunk','wood',[-260+i%3*.22,-2.6+Math.floor(i/3)*.16,28.5],[.13,4,.13],[0,0,Math.PI/2],null,null,{propQuality:'low'});
    for(let i=0;i<5;i++)this.put('box','wood',[-254+i%2,-2.4+Math.floor(i/2)*.45,28],[.8,.6,.75],[0,0,0],null,null,{propQuality:'low'});
    for(let i=0;i<16;i++){
      const x=-258+(i%4)*.7,z=30+Math.floor(i/4)*.55,y=this.world.terrainHeightAt(x,z);
      this.put('box','wood',[x,y+.15,z],[.50,.18,.65],[.04,i*.71,.04],null,null,{propQuality:'low'});
      this.put('rock','stone',[-345+i*.35,this.world.terrainHeightAt(-345+i*.35,61)+.1,61],[.24,.13,.19],[i*.4,i,.1]);
    }
    for(let x=-320;x<-40;x+=17){
      const z=66,y=this.world.terrainHeightAt(x,z);this.put('trunk','wood',[x,y+.9,z],[.055,1.8,.055],[0,0,0],null,null,{propQuality:'low'});
      for(const h of [.5,1.2])this.put('box','metal',[x+8,y+h,z],[17,.018,.018],[0,0,0],null,null,{propQuality:'low'});
    }
  }
  buildProductionDressing(){
    this.propDescriptors=[...buildM01EnvironmentProps(this.world)];
    for(const p of this.propDescriptors)this.put(p.kind,p.material,p.p,p.size,p.rotation,p.color,null,{propQuality:p.quality});
  }
  buildArchitecture(){
    // Station replaces presentation only. Original solid box survives if construction fails.
    try{this.station=new M01StationArchitecture(this.group,this.world);}
    catch(error){this.stationFailure=error.message;console.warn(`Station M01: ${error.message}`);}
    const proxy=(kind,mat,p,size)=>this.put(kind,mat,p,size,[0,0,0],null,null,{fieldProxy:'rail_shed'});
    for(let x=-269;x<-250;x+=1.6)proxy('box','wood',[x,-1.25,13.78],[.12,3.5,.14]);
    for(let z=15;z<26;z+=1.5)proxy('box','wood',[-249.5,-1.25,z],[.14,3.5,.12]);
    proxy('box','metal',[-260,.8,20],[21,.15,13]);
    // Roof seams, barrels and sandbag courses improve scale without adding invented streets.
    for(let x=-270;x<-250;x+=1.3)proxy('box','metal',[x,.91,20],[.045,.05,13]);
    for(const x of [-272,-274])this.put('trunk','metal',[x,-2.45,14],[.35,1.1,.35]);
    this.put('box','stone',[-260,-2.25,76.6],[10,.15,.2],[0,0,0],null,null,{fieldProxy:'shelter'});
  }
  buildCovers(){
    for(const c of this.world.covers){
      if(c.material==='wood')continue;
      const x=(c.min.x+c.max.x)/2,z=(c.min.z+c.max.z)/2;
      for(let row=0;row<Math.ceil((c.max.y-c.min.y)/.28);row++)for(let col=0;col<5;col++){
        this.put('bag','cloth',[x,c.min.y+.15+row*.26,z-1.2+col*.58+(row%2)*.10],[.24,.25,.40],[Math.PI/2,0,0],'#aa9b78',c.id);
      }
    }
  }
  sync(world,quality,player={x:0,z:0},clock=0){
    this.fieldStructures.sync(world,quality,player);this.syncRailProps(world,quality,player);
    for(const batch of this.fieldProxyBatches)batch.visible=!this.fieldStructures.replaces(batch.userData.m01FieldProxy);
    for(const {id,batch,height}of this.dynamic){const cover=world.covers.find(c=>c.id===id);batch.visible=Boolean(cover)&&!this.fieldStructures.replaces(id);if(cover)batch.scale.y=(cover.max.y-cover.min.y)/height;}
    // Density changes are presentation-only. Prop batches are authored once and toggled by minimum quality.
    const rank=M01_PROP_QUALITY_RANK[quality]??M01_PROP_QUALITY_RANK.medium;this.propQuality=quality;
    for(const batch of this.propBatches)batch.visible=!this.propsRuntime.replacesProxies()&&M01_PROP_QUALITY_RANK[batch.userData.m01PropQuality]<=rank;
    this.syncVegetation(world,quality,player,clock);
    this.station?.sync(player,quality);
  }
  syncRailProps(world,quality,player){this.propsRuntime.sync(world,quality,player);this.trackBed.sync(world,quality);const rank=M01_PROP_QUALITY_RANK[quality]??1;for(const batch of this.propBatches)batch.visible=!this.propsRuntime.replacesProxies()&&M01_PROP_QUALITY_RANK[batch.userData.m01PropQuality]<=rank;}
  get propDiagnostics(){
    const quality=this.propQuality??'medium',counts=propCountsForQuality(this.propDescriptors,quality);
    return {quality,clusters:new Set(this.propDescriptors.map(p=>p.cluster)).size,totalAll:this.propDescriptors.length,visible:counts.total,
      byArea:counts.byArea,byCluster:counts.byCluster,batches:this.propsRuntime.replacesProxies()?this.propsRuntime.diagnostics.drawCalls:this.propBatches.filter(b=>b.visible).length,totalBatches:this.propsRuntime.ready?this.propsRuntime.batches.length:this.propBatches.length,
      collidersAdded:0,deterministicSeedDomain:'m01-environment-props',runtime:this.propsRuntime.diagnostics,proxyBatches:this.propBatches.filter(b=>b.visible).length};
  }
  get diagnostics(){return this.vegetation.diagnostics;}
  dispose(){
    this.vegetation.dispose();this.propsRuntime.dispose();this.trackBed.dispose();this.fieldStructures.dispose();this.station?.dispose();
    this.group.removeFromParent();this.resources.forEach(b=>b.dispose());Object.values(this.geometry).forEach(g=>g.dispose());
    this.bark.map.dispose();this.bark.dispose();
  }
}
