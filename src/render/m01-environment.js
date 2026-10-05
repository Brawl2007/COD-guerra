import * as THREE from 'three';
import {leafTexture,texturedSurface} from './m01-surfaces.js';

export const M01_VEGETATION_LOD=Object.freeze({
  low:Object.freeze({near:55,mid:170,hysteresis:10,nearBranches:2,midBranches:1,nearLobes:3,midLobes:2,nearCards:0}),
  medium:Object.freeze({near:80,mid:230,hysteresis:12,nearBranches:4,midBranches:1,nearLobes:5,midLobes:3,nearCards:1}),
  high:Object.freeze({near:110,mid:290,hysteresis:14,nearBranches:5,midBranches:2,nearLobes:6,midLobes:4,nearCards:2})
});
export const M01_LEGACY_LEAF_CARD_ESTIMATE=17*25+68*16;
export function vegetationNoise(seed,index=0){
  let x=((seed>>>0)+Math.imul((index+1)>>>0,0x9e3779b1))>>>0;
  x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;
  return (x>>>0)/4294967296;
}
export function chooseVegetationLod(distance,quality='medium',previous=null){
  const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium,h=q.hysteresis;
  if(previous==='near'&&distance<=q.near+h)return 'near';
  if(previous==='mid'){
    if(distance<q.near-h)return 'near';
    if(distance<=q.mid+h)return 'mid';
    return 'far';
  }
  if(previous==='far'&&distance>=q.mid-h)return 'far';
  return distance<q.near?'near':distance<q.mid?'mid':'far';
}
const TREE_PROFILES=Object.freeze([
  Object.freeze({name:'narrow',radius:.72,height:1.08,base:.64,spread:.78}),
  Object.freeze({name:'broad',radius:1.18,height:.86,base:.60,spread:1.10}),
  Object.freeze({name:'irregular',radius:1.00,height:.98,base:.61,spread:1.00}),
  Object.freeze({name:'small',radius:.86,height:.88,base:.62,spread:.88}),
  Object.freeze({name:'tall',radius:.78,height:1.12,base:.66,spread:.84}),
  Object.freeze({name:'damaged',radius:.88,height:.78,base:.67,spread:1.08,damaged:true})
]);

// Small decoration is non-solid. Trunks/buildings are outside the playable routes.
// This is art direction around measured infrastructure, not a historical survey.
export class M01Environment {
  constructor(scene,world,materials){
    this.group=new THREE.Group();scene.add(this.group);this.world=world;this.materials=materials;
    this.geometry={box:new THREE.BoxGeometry(1,1,1),rock:new THREE.DodecahedronGeometry(1,0),gravel:new THREE.TetrahedronGeometry(1),
      trunk:new THREE.CylinderGeometry(.72,1,1,9),leaf:new THREE.PlaneGeometry(1,1),bag:new THREE.CapsuleGeometry(.5,.4,3,7),
      treeWoodNear:new THREE.CylinderGeometry(.58,1,1,10),treeWoodMid:new THREE.CylinderGeometry(.62,1,1,7),treeWoodFar:new THREE.CylinderGeometry(.68,1,1,5),
      treeCanopyNear:new THREE.IcosahedronGeometry(1,1),treeCanopyMid:new THREE.DodecahedronGeometry(1,0),treeCanopyFar:new THREE.IcosahedronGeometry(1,0)};
    this.leafMap=leafTexture();this.foliage=new THREE.MeshStandardMaterial({map:this.leafMap,alphaTest:.52,side:THREE.DoubleSide,roughness:1,color:'#a7aa74',emissive:'#27311f',emissiveIntensity:.10});
    this.canopyMaterial=new THREE.MeshStandardMaterial({color:'#d6d7c2',roughness:1,metalness:0,emissive:'#26301f',emissiveIntensity:.075});
    this.bark=texturedSurface('wood',{worldScale:1,bump:.12,color:'#80786b'});
    this.grassMaterial=new THREE.MeshStandardMaterial({color:'#76734f',roughness:1,side:THREE.DoubleSide});
    this.grassGeometry=new THREE.BufferGeometry();this.grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.1,0,0, .1,0,0, .035,.48,0, 0,0,-.1, 0,0,.1, 0,.38,.04],3));// Add two bent blades inside each same-sized tuft; keep short vegetation off objectives.
    const old=Array.from(this.grassGeometry.attributes.position.array);
    this.grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute([...old,-.12,0,.04,-.06,0,.06,-.17,.32,.08,.06,0,-.09,.14,0,-.09,.20,.26,-.04],3));
    this.grassGeometry.computeVertexNormals();
    this.lists=new Map();this.resources=[];this.dynamic=[];this.grassBatches=[];this.treeDescriptors=[];this.treeBatches={};this.treeUpdateKey='';this.treeLodCounts={near:0,mid:0,far:0};
    this.treeCardCount=0;this.treeTriangleCount=0;this.treeDrawCalls=0;this.treeDummy=new THREE.Object3D();this.treeColor=new THREE.Color();
    this.treeUp=new THREE.Vector3(0,1,0);this.treeStart=new THREE.Vector3();this.treeEnd=new THREE.Vector3();this.treeDirection=new THREE.Vector3();
    let seed=19390901;this.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    this.buildVegetation();this.buildClutter();this.buildTracks();this.buildArchitecture();this.buildCovers();this.buildGroundClusters();this.flush();
    this.buildTreeBatches();this.updateVegetationLod({x:0,z:0},'medium',true);
  }
  put(kind,material,p,size,rotation=[0,0,0],color=null,parentId=null){
    const key=`${kind}:${material}:${parentId??'static'}`;
    if(!this.lists.has(key))this.lists.set(key,{kind,material,parentId,items:[]});
    this.lists.get(key).items.push({p,size,rotation,color});
  }
  flush(){
    const dummy=new THREE.Object3D();
    for(const list of this.lists.values()){
      const geometry=list.kind==='grass'?this.grassGeometry:this.geometry[list.kind];
      const material=list.material==='leaf'?this.foliage:list.material==='bark'?this.bark:list.material==='grass'?this.grassMaterial:this.materials[list.material];
      const batch=new THREE.InstancedMesh(geometry,material,list.items.length);
      list.items.forEach((o,i)=>{dummy.position.set(...o.p);dummy.scale.set(...o.size);dummy.rotation.set(...o.rotation);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);if(o.color)batch.setColorAt(i,new THREE.Color(o.color));});
      batch.computeBoundingSphere();batch.castShadow=['box','trunk','bag','leaf'].includes(list.kind);batch.receiveShadow=true;
      this.group.add(batch);this.resources.push(batch);if(geometry===this.grassGeometry)this.grassBatches.push(batch);
      if(list.parentId)this.dynamic.push({batch,id:list.parentId,height:this.world.covers.find(c=>c.id===list.parentId)?.max.y-this.world.covers.find(c=>c.id===list.parentId)?.min.y});
    }
    this.lists.clear();
  }
  makeTreeDescriptor({id,x,y,z,height,radius,solid,serial}){
    const seed=(Math.imul(Math.floor((x+2048)*17),73856093)^Math.imul(Math.floor((z+2048)*17),19349663)^Math.imul(serial+1,83492791))>>>0;
    const n=i=>vegetationNoise(seed,i),profile=TREE_PROFILES[serial%TREE_PROFILES.length];
    const trunkRadius=radius*(.88+n(0)*.30),yaw=n(1)*Math.PI*2,leanX=(n(2)-.5)*.075,leanZ=(n(3)-.5)*.075;
    const crownRadius=Math.max(2.15,height*.235)*profile.radius*(.90+n(4)*.20);
    const lobes=[],lobeTotal=profile.damaged?4:6;
    for(let i=0;i<lobeTotal;i++){
      const angle=yaw+i*2.399963+(n(10+i*7)-.5)*.72,ring=i===0?0:crownRadius*(.22+n(11+i*7)*.43);
      const hue=profile.damaged?.105+n(12+i*7)*.035:.155+n(12+i*7)*.055;
      lobes.push({
        x:Math.cos(angle)*ring,y:height*(profile.base+.055+n(13+i*7)*.15),z:Math.sin(angle)*ring,
        sx:crownRadius*(.52+n(14+i*7)*.34),sy:height*(.115+n(15+i*7)*.072)*profile.height,sz:crownRadius*(.50+n(16+i*7)*.36),
        rx:(n(17+i*7)-.5)*.34,ry:angle*.55,rz:(n(18+i*7)-.5)*.30,
        color:[hue,.28+n(19+i*7)*.17,.245+n(20+i*7)*.085]
      });
    }
    const branches=[];
    for(let i=0;i<5;i++){
      const angle=yaw+i*1.256637+(n(80+i*5)-.5)*.72,startY=height*(.46+i*.038+n(81+i*5)*.025);
      const reach=crownRadius*(.48+n(82+i*5)*.48)*profile.spread,endY=height*(.60+n(83+i*5)*.19);
      branches.push({sx:leanX*startY*.34,sy:startY,sz:leanZ*startY*.34,ex:Math.cos(angle)*reach,ey:endY,ez:Math.sin(angle)*reach,r:trunkRadius*(.17+n(84+i*5)*.12)});
    }
    const cards=[];
    for(let i=0;i<2;i++){
      const l=lobes[Math.min(lobes.length-1,1+i*2)],angle=yaw+i*1.9+n(120+i)*.8;
      cards.push({x:l.x*.72,y:l.y+height*.015,z:l.z*.72,sx:crownRadius*(.72+n(122+i)*.20),sy:height*(.20+n(124+i)*.08),rx:(n(126+i)-.5)*.26,ry:angle,rz:(n(128+i)-.5)*.18});
    }
    return {id,x,y,z,height,radius:trunkRadius,solid,seed,profile:profile.name,yaw,leanX,leanZ,lobes,branches,cards,lod:null};
  }
  buildVegetation(){
    const r=this.random;let serial=0;
    // Preserve the approved physical tree placements exactly. The legacy random calls are consumed
    // so the existing visual-only grove/grass distribution remains deterministic at the same coordinates.
    for(const t of this.world.trees){
      this.treeDescriptors.push(this.makeTreeDescriptor({...t,solid:true,serial:serial++}));
      for(let b=0;b<6;b++)r();
      for(let l=0;l<25;l++)for(let k=0;k<8;k++)r();
    }
    for(let i=0;i<68;i++){
      const x=-650+r()*570,z=(i%2?1:-1)*(90+r()*155),y=this.world.terrainHeightAt(x,z),height=9+r()*12;
      const radiusA=.24+r()*.16,radiusB=.24+r()*.16;
      this.treeDescriptors.push(this.makeTreeDescriptor({id:`m01_visual_tree_${i}`,x,y,z,height,radius:(radiusA+radiusB)*.5,solid:false,serial:serial++}));
      for(let b=0;b<5;b++){r();r();}
      for(let l=0;l<16;l++)for(let k=0;k<8;k++)r();
    }
    for(let i=0;i<2400;i++){
      const x=-620+r()*620,z=-95+r()*205;
      if((z>-13&&z<52&&r()<.85)||Math.hypot(x+260,z-70)<12)continue;
      const y=this.world.terrainHeightAt(x,z),h=z>-13&&z<52?.20+r()*.25:.3+r()*.7;
      this.put('grass','grass',[x,y+.01,z],[h,h,h],[0,r()*Math.PI,0],new THREE.Color().setHSL(.16,.22,.28+r()*.12));
    }
    // Reed margins are below the deck, never obscuring bridge actors.
    for(let i=0;i<440;i++){
      const x=(i%2?23:267)+r()*3,z=-300+r()*650,y=this.world.terrainHeightAt(x,z);
      this.put('grass','grass',[x,y,z],[2+r(),2+r()*2,2],[0,r()*Math.PI,0]);
    }
  }
  buildTreeBatches(){
    const n=this.treeDescriptors.length,make=(name,geometry,material,capacity,{cast=false,receive=true}={})=>{
      const batch=new THREE.InstancedMesh(geometry,material,capacity);batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      batch.count=0;batch.frustumCulled=false;batch.castShadow=cast;batch.receiveShadow=receive;batch.userData.m01Vegetation=name;
      this.group.add(batch);this.resources.push(batch);this.treeBatches[name]=batch;return batch;
    };
    make('woodNear',this.geometry.treeWoodNear,this.bark,n*6,{cast:true});
    make('canopyNear',this.geometry.treeCanopyNear,this.canopyMaterial,n*6,{cast:true});
    make('cardsNear',this.geometry.leaf,this.foliage,n*2,{cast:false});
    make('woodMid',this.geometry.treeWoodMid,this.bark,n*3,{cast:false});
    make('canopyMid',this.geometry.treeCanopyMid,this.canopyMaterial,n*4,{cast:false});
    make('woodFar',this.geometry.treeWoodFar,this.bark,n,{cast:false,receive:false});
    make('canopyFar',this.geometry.treeCanopyFar,this.canopyMaterial,n*2,{cast:false,receive:false});
  }
  treeMatrix(batch,index,position,scale,rotation=null,color=null){
    const d=this.treeDummy;d.position.set(position.x,position.y,position.z);d.quaternion.identity();
    if(rotation)d.rotation.set(rotation.x,rotation.y,rotation.z);else d.rotation.set(0,0,0);
    d.scale.set(scale.x,scale.y,scale.z);d.updateMatrix();batch.setMatrixAt(index,d.matrix);
    if(color)batch.setColorAt(index,this.treeColor.setHSL(color[0],color[1],color[2]));
  }
  appendTrunk(batch,index,t){
    this.treeMatrix(batch,index,{x:t.x+t.leanX*t.height*.15,y:t.y+t.height*.34,z:t.z+t.leanZ*t.height*.15},
      {x:t.radius,y:t.height*.68,z:t.radius},{x:t.leanZ,y:t.yaw,z:-t.leanX});return index+1;
  }
  appendBranch(batch,index,t,b){
    this.treeStart.set(t.x+b.sx,t.y+b.sy,t.z+b.sz);this.treeEnd.set(t.x+b.ex,t.y+b.ey,t.z+b.ez);
    this.treeDirection.copy(this.treeEnd).sub(this.treeStart);const length=this.treeDirection.length();
    const d=this.treeDummy;d.position.copy(this.treeStart).add(this.treeEnd).multiplyScalar(.5);
    d.quaternion.setFromUnitVectors(this.treeUp,this.treeDirection.normalize());d.scale.set(b.r,length,b.r);d.updateMatrix();batch.setMatrixAt(index,d.matrix);return index+1;
  }
  appendCanopy(batch,index,t,l){
    this.treeMatrix(batch,index,{x:t.x+l.x,y:t.y+l.y,z:t.z+l.z},{x:l.sx,y:l.sy,z:l.sz},{x:l.rx,y:l.ry,z:l.rz},l.color);return index+1;
  }
  appendCard(batch,index,t,card){
    this.treeMatrix(batch,index,{x:t.x+card.x,y:t.y+card.y,z:t.z+card.z},{x:card.sx,y:card.sy,z:1},{x:card.rx,y:card.ry,z:card.rz});return index+1;
  }
  updateVegetationLod(player,quality='medium',force=false){
    const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium,key=`${quality}:${Math.floor((player?.x??0)/3)}:${Math.floor((player?.z??0)/3)}`;
    if(!force&&key===this.treeUpdateKey)return;this.treeUpdateKey=key;
    const count={woodNear:0,canopyNear:0,cardsNear:0,woodMid:0,canopyMid:0,woodFar:0,canopyFar:0},lod={near:0,mid:0,far:0};
    for(const t of this.treeDescriptors){
      const distance=Math.hypot(t.x-(player?.x??0),t.z-(player?.z??0)),level=chooseVegetationLod(distance,quality,t.lod);t.lod=level;lod[level]++;
      if(level==='near'){
        count.woodNear=this.appendTrunk(this.treeBatches.woodNear,count.woodNear,t);
        for(const b of t.branches.slice(0,q.nearBranches))count.woodNear=this.appendBranch(this.treeBatches.woodNear,count.woodNear,t,b);
        for(const l of t.lobes.slice(0,q.nearLobes))count.canopyNear=this.appendCanopy(this.treeBatches.canopyNear,count.canopyNear,t,l);
        for(const card of t.cards.slice(0,q.nearCards))count.cardsNear=this.appendCard(this.treeBatches.cardsNear,count.cardsNear,t,card);
      }else if(level==='mid'){
        count.woodMid=this.appendTrunk(this.treeBatches.woodMid,count.woodMid,t);
        for(const b of t.branches.slice(0,q.midBranches))count.woodMid=this.appendBranch(this.treeBatches.woodMid,count.woodMid,t,b);
        for(const l of t.lobes.slice(0,q.midLobes))count.canopyMid=this.appendCanopy(this.treeBatches.canopyMid,count.canopyMid,t,l);
      }else{
        count.woodFar=this.appendTrunk(this.treeBatches.woodFar,count.woodFar,t);
        for(const l of t.lobes.slice(0,2))count.canopyFar=this.appendCanopy(this.treeBatches.canopyFar,count.canopyFar,t,{...l,sx:l.sx*1.06,sy:l.sy*1.04,sz:l.sz*1.06});
      }
    }
    for(const [name,batch]of Object.entries(this.treeBatches)){
      batch.count=count[name];batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
    }
    this.treeBatches.canopyNear.castShadow=quality==='high';this.treeBatches.woodNear.castShadow=quality!=='low';
    this.treeBatches.woodMid.castShadow=quality==='high';this.treeBatches.canopyMid.castShadow=false;
    this.treeLodCounts=lod;this.treeCardCount=count.cardsNear;
    this.treeTriangleCount=Object.values(this.treeBatches).reduce((sum,b)=>sum+b.count*((b.geometry.index?.count??b.geometry.attributes.position.count)/3),0);
    this.treeDrawCalls=Object.values(this.treeBatches).filter(b=>b.count>0).length;
  }
  buildGroundClusters(){
    const r=this.random;
    // Broken meadow patches beyond the cleared rail corridors; cosmetic and ankle-high.
    for(let i=0;i<480;i++){
      const x=-610+r()*590,z=i%2?-65+r()*44:58+r()*47;
      if(Math.hypot(x+260,z-70)<16)continue;
      const patch=.6+r()*2;
      for(let j=0;j<8;j++){const px=x+(r()-.5)*patch,pz=z+(r()-.5)*patch,h=.20+r()*.45;
        this.put('grass','grass',[px,this.world.terrainHeightAt(px,pz)+.01,pz],[h,h,h],[0,r()*Math.PI,0],new THREE.Color().setHSL(.19+r()*.04,.25,.36+r()*.12));
      }
    }
  }
  buildClutter(){
    const r=this.random;
    for(let i=0;i<1900;i++){
      const x=-550+r()*545,z=-65+r()*170,y=this.world.terrainHeightAt(x,z);
      const size=.045+r()*.14;
      this.put('rock','stone',[x,y+size*.23,z],[size,size*.3,size*.8],[r(),r()*6,r()],new THREE.Color().setHSL(.10,.10,.23+r()*.24));
      if(i%5===0)this.put('leaf','wood',[x+.2,y+.018,z+.12],[.10,.06,.08],[-Math.PI/2,r()*6,0]);
    }
    // Timber piles, crates, coils and posts beside the existing hut. No new solid route blocks.
    for(let i=0;i<12;i++)this.put('trunk','wood',[-260+i%3*.22,-2.6+Math.floor(i/3)*.16,28.5],[.13,4,.13],[0,0,Math.PI/2]);
    for(let i=0;i<5;i++)this.put('box','wood',[-254+i%2,-2.4+Math.floor(i/2)*.45,28],[.8,.6,.75]);
    for(let i=0;i<16;i++){
      const x=-258+(i%4)*.7,z=30+Math.floor(i/4)*.55,y=this.world.terrainHeightAt(x,z);
      this.put('box','wood',[x,y+.15,z],[.50,.18,.65],[.04,i*.71,.04]);
      this.put('rock','stone',[-345+i*.35,this.world.terrainHeightAt(-345+i*.35,61)+.1,61],[.24,.13,.19],[i*.4,i,.1]);
    }
    for(let x=-320;x<-40;x+=17){
      const z=66,y=this.world.terrainHeightAt(x,z);this.put('trunk','wood',[x,y+.9,z],[.055,1.8,.055]);
      for(const h of [.5,1.2])this.put('box','metal',[x+8,y+h,z],[17,.018,.018]);
    }
  }
  buildTracks(){
    for(const id of ['rail_embankment_west','rail_line_southwest','rail_line_east']){
      const points=this.world.features.get(id).polyline;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
        if(length>1800)continue;
        for(let d=0;d<length;d+=1.35){
          const t=d/length,x=a[0]+t*dx,z=a[2]+t*dz,y=a[1]+t*(b[1]-a[1]);
          const grounded=this.world.heightAt(x,z);
          this.put('box','wood',[x,grounded+.055,z],[.23,.10,2.65],[0,angle,0]);
          for(const offset of [-.72,.72]){
            const px=x+Math.sin(angle)*offset,pz=z+Math.cos(angle)*offset;
            this.put('box','metal',[px,grounded+.115,pz],[.30,.035,.22],[0,angle,0]);
          }
          this.put('rock','stone',[x,grounded+.008,z],[.85,.045,1.5],[0,angle,0],'#5f6158');
          for(let k=0;k<5;k++){const offset=(k-2)*.64,px=x+Math.sin(angle)*offset,pz=z+Math.cos(angle)*offset;this.put('gravel','stone',[px,grounded+.018,pz],[.19,.038,.22],[0,k*1.17,0],'#737168');}
        }
      }
    }
  }
  buildArchitecture(){
    // Facade details rest on the current station/hut colliders. Their doors stay blocked/open as before.
    for(let x=-450;x<-340;x+=10)for(const y of [1.5,6]){
      this.put('box','dark',[x,y,27.96],[2.2,2.8,.06]);
      for(const dx of [-1.2,1.2])this.put('box','stone',[x+dx,y,27.85],[.17,3,.16]);
      for(const dy of [-1.5,1.5])this.put('box','stone',[x,y+dy,27.72],[2.6,.20,.35]);
      this.put('box','wood',[x,y,27.75],[.07,2.8,.08]);this.put('box','wood',[x,y,27.74],[2.2,.07,.08]);
    }
    // Original mass/colliders retained: pilasters, plinth, cornice and shallow roof courses only.
    this.put('box','stone',[-399,-1.9,27.75],[123,1.15,.40]);
    for(let x=-455;x<-338;x+=10){
      this.put('box','brick',[x+4.5,3.2,27.77],[.75,13.8,.30]);
      this.put('box','stone',[x+4.5,10.1,27.61],[1,.32,.48]);
    }
    this.put('box','stone',[-399,4.05,27.55],[123,.28,.46]);
    this.put('box','stone',[-399,9.15,27.58],[123,.36,.40]);
    for(let x=-457;x<-337;x+=4.5)this.put('box','metal',[x,12.04,41.5],[.08,.08,28.5]);
    for(const x of [-452,-412,-372,-342]){
      this.put('trunk','metal',[x,3.5,27.45],[.07,14,.07]);
      this.put('box','stone',[x,10.6,27.4],[.38,.28,.42]);
    }
    // Narrow edging at the wall; no new platform/door route or collision.
    this.put('box','stone',[-399,-2.8,26.8],[122,.16,.55]);
    for(const z of [27.5,55.5])this.put('box','stone',[-399,10.6,z],[123,.6,.7]);
    this.put('box','wood',[-399,11.5,41.5],[124,1,29]);
    for(let x=-450;x<-340;x+=24)this.put('box','brick',[x,13,44],[1.4,4,1.5]);
    for(let x=-269;x<-250;x+=1.6)this.put('box','wood',[x,-1.25,13.78],[.12,3.5,.14]);
    for(let z=15;z<26;z+=1.5)this.put('box','wood',[-249.5,-1.25,z],[.14,3.5,.12]);
    this.put('box','metal',[-260,.8,20],[21,.15,13]);
    // Roof seams, barrels and sandbag courses improve scale without adding invented streets.
    for(let x=-270;x<-250;x+=1.3)this.put('box','metal',[x,.91,20],[.045,.05,13]);
    for(const x of [-272,-274])this.put('trunk','metal',[x,-2.45,14],[.35,1.1,.35]);
    this.put('box','stone',[-260,-2.25,76.6],[10,.15,.2]);
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
  sync(world,quality,player={x:0,z:0}){
    for(const {id,batch,height}of this.dynamic){const cover=world.covers.find(c=>c.id===id);batch.visible=Boolean(cover);if(cover)batch.scale.y=(cover.max.y-cover.min.y)/height;}
    // Density is reduced in the existing low preset; no quality changes affect the simulation.
    for(const batch of this.grassBatches)batch.count=Math.floor(batch.instanceMatrix.count*(quality==='low'?.5:1));
    this.updateVegetationLod(player,quality);
  }
  get diagnostics(){
    const grassInstances=this.grassBatches.reduce((n,b)=>n+b.count,0),treeInstances=Object.values(this.treeBatches).reduce((n,b)=>n+b.count,0);
    return {treeCount:this.treeDescriptors.length,solidTreeCount:this.treeDescriptors.filter(t=>t.solid).length,visualTreeCount:this.treeDescriptors.filter(t=>!t.solid).length,
      lod:{...this.treeLodCounts},treeInstances,treeDrawCalls:this.treeDrawCalls,treeTriangles:Math.round(this.treeTriangleCount),leafCards:this.treeCardCount,
      legacyLeafCardEstimate:M01_LEGACY_LEAF_CARD_ESTIMATE,alphaCardReductionApprox:1-this.treeCardCount/M01_LEGACY_LEAF_CARD_ESTIMATE,
      grassInstances,materials:4,textures:2,tracked:Object.fromEntries(this.treeDescriptors.filter(t=>t.solid).map(t=>[t.id,t.lod]))};
  }
  dispose(){this.group.removeFromParent();this.resources.forEach(b=>b.dispose());Object.values(this.geometry).forEach(g=>g.dispose());this.grassGeometry.dispose();this.foliage.dispose();this.canopyMaterial.dispose();this.leafMap.dispose();this.bark.map.dispose();this.bark.dispose();this.grassMaterial.dispose();}
}
