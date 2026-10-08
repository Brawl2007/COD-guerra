import * as THREE from 'three';
import {leafTexture,texturedSurface} from './m01-surfaces.js';
import {buildM01EnvironmentProps,M01_PROP_QUALITY_RANK,propCountsForQuality} from './m01-environment-props.js';
import {vegetationNoise,buildM01VegetationLayout,interleaveForDensity,M01_TREE_SPECIES} from './m01-vegetation-layout.js';
import {lumpyCanopyGeometry,trunkGeometry,grassGeometries,groundShadowTexture,canopyLeafTexture,canopyMaterial,grassMaterial} from './m01-vegetation-art.js';

export {vegetationNoise};
export const M01_VEGETATION_LOD=Object.freeze({
  low:Object.freeze({near:55,mid:170,hysteresis:10,nearBranches:2,midBranches:1,nearLobes:4,midLobes:3,nearCards:0,shrubNear:30,shrubMid:100,grassFade:Object.freeze([30,50])}),
  medium:Object.freeze({near:80,mid:230,hysteresis:12,nearBranches:4,midBranches:2,nearLobes:6,midLobes:4,nearCards:1,shrubNear:50,shrubMid:150,grassFade:Object.freeze([50,80])}),
  high:Object.freeze({near:110,mid:290,hysteresis:14,nearBranches:5,midBranches:2,nearLobes:8,midLobes:5,nearCards:2,shrubNear:72,shrubMid:210,grassFade:Object.freeze([70,110])})
});
export const M01_LEGACY_LEAF_CARD_ESTIMATE=17*25+68*16;
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
export function chooseShrubLod(distance,quality='medium'){
  const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium;
  return distance<q.shrubNear?'near':distance<q.shrubMid?'mid':'culled';
}
const lerp=(range,t)=>range[0]+(range[1]-range[0])*t;
// The shared bark uses the procedural wood map (linear mean below); instance tints are divided by it so a
// species colour is the final albedo instead of a second darkening multiply.
const WOOD_MAP_MEAN=new THREE.Color().setRGB(114/255,88/255,58/255,THREE.SRGBColorSpace);
export function barkTint(hex,scale=1){
  const c=new THREE.Color(hex);return [c.r/WOOD_MAP_MEAN.r*scale,c.g/WOOD_MAP_MEAN.g*scale,c.b/WOOD_MAP_MEAN.b*scale];
}
const GRASS_GEOMETRY=Object.freeze({meadow:'tuft',dry:'tuft',tall:'seed',weed:'leafy',reed:'reed'});

// Small decoration is non-solid. Trunks/buildings are outside the playable routes.
// This is art direction around measured infrastructure, not a historical survey.
export class M01Environment {
  constructor(scene,world,materials){
    this.group=new THREE.Group();scene.add(this.group);this.world=world;this.materials=materials;
    this.geometry={box:new THREE.BoxGeometry(1,1,1),rock:new THREE.DodecahedronGeometry(1,0),gravel:new THREE.TetrahedronGeometry(1),
      trunk:new THREE.CylinderGeometry(.72,1,1,9),leaf:new THREE.PlaneGeometry(1,1),bag:new THREE.CapsuleGeometry(.5,.4,3,7),
      treeWoodNear:trunkGeometry(9),treeWoodMid:new THREE.CylinderGeometry(.62,1,1,6),treeWoodFar:new THREE.CylinderGeometry(.68,1,1,4),
      // Near crowns/shrubs: 80-triangle broken lobes; mid: 36; far: 20. All share one material.
      treeCanopyNear:lumpyCanopyGeometry(new THREE.IcosahedronGeometry(1,1),0xc0a1),treeCanopyMid:lumpyCanopyGeometry(new THREE.DodecahedronGeometry(1,0),0xc0a2),
      treeCanopyFar:lumpyCanopyGeometry(new THREE.IcosahedronGeometry(1,0),0xc0a3),groundShadow:new THREE.CircleGeometry(1,14).rotateX(-Math.PI/2)};
    this.grassGeometry=grassGeometries();
    this.leafMap=leafTexture();this.foliage=new THREE.MeshStandardMaterial({map:this.leafMap,alphaTest:.52,alphaToCoverage:true,side:THREE.DoubleSide,roughness:1,color:'#a7aa74',emissive:'#27311f',emissiveIntensity:.10});
    this.canopyLeafMap=canopyLeafTexture();this.canopyMaterial=canopyMaterial(this.canopyLeafMap);
    this.bark=texturedSurface('wood',{worldScale:1,bump:.12,color:'#ffffff'});
    this.grassMaterial=grassMaterial();
    this.shadowMap=groundShadowTexture();
    this.groundShadowMaterial=new THREE.MeshStandardMaterial({color:'#2b2a1c',roughness:1,metalness:0,alphaMap:this.shadowMap,transparent:true,opacity:.62,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
    this.lists=new Map();this.resources=[];this.dynamic=[];this.grassBatches=[];this.propBatches=[];this.propDescriptors=[];this.propQuality='medium';
    this.treeDescriptors=[];this.shrubDescriptors=[];this.treeBatches={};this.treeUpdateKey='';this.treeLodCounts={near:0,mid:0,far:0};this.shrubLodCounts={near:0,mid:0,culled:0};
    this.treeCardCount=0;this.treeTriangleCount=0;this.treeDrawCalls=0;this.groundCoverCounts={};this.groundShadowCount=0;
    this.treeDummy=new THREE.Object3D();this.treeColor=new THREE.Color();
    this.treeUp=new THREE.Vector3(0,1,0);this.treeStart=new THREE.Vector3();this.treeEnd=new THREE.Vector3();this.treeDirection=new THREE.Vector3();
    let seed=19390901;this.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    this.buildVegetation();this.buildClutter();this.buildTracks();this.buildArchitecture();this.buildCovers();this.buildProductionDressing();this.flush();
    this.buildTreeBatches();this.buildGroundCover();this.buildGroundShadows();this.updateVegetationLod({x:0,z:0},'medium',true);
  }
  put(kind,material,p,size,rotation=[0,0,0],color=null,parentId=null,meta=null){
    const propQuality=meta?.propQuality??null,key=`${kind}:${material}:${parentId??'static'}:${propQuality??'base'}`;
    if(!this.lists.has(key))this.lists.set(key,{kind,material,parentId,propQuality,items:[]});
    this.lists.get(key).items.push({p,size,rotation,color});
  }
  flush(){
    const dummy=new THREE.Object3D();
    for(const list of this.lists.values()){
      const geometry=this.geometry[list.kind];
      const material=list.material==='leaf'?this.foliage:list.material==='bark'?this.bark:this.materials[list.material];
      const batch=new THREE.InstancedMesh(geometry,material,list.items.length);
      list.items.forEach((o,i)=>{dummy.position.set(...o.p);dummy.scale.set(...o.size);dummy.rotation.set(...o.rotation);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);if(o.color)batch.setColorAt(i,new THREE.Color(o.color));});
      batch.computeBoundingSphere();batch.castShadow=['box','trunk','bag','leaf'].includes(list.kind);batch.receiveShadow=true;
      this.group.add(batch);this.resources.push(batch);
      if(list.propQuality){batch.userData.m01PropQuality=list.propQuality;this.propBatches.push(batch);}
      if(list.parentId)this.dynamic.push({batch,id:list.parentId,height:this.world.covers.find(c=>c.id===list.parentId)?.max.y-this.world.covers.find(c=>c.id===list.parentId)?.min.y});
    }
    this.lists.clear();
  }
  // Matrices/colours are composed once; LOD changes only copy prepared floats into the shared batches.
  partMatrix(position,scale,rotation=null){
    const d=this.treeDummy;d.position.set(position.x,position.y,position.z);
    if(rotation)d.rotation.set(rotation.x,rotation.y,rotation.z);else d.rotation.set(0,0,0);
    d.scale.set(scale.x,scale.y,scale.z);d.updateMatrix();return Float32Array.from(d.matrix.elements);
  }
  rodMatrix(start,end,radius){
    this.treeStart.set(start.x,start.y,start.z);this.treeEnd.set(end.x,end.y,end.z);
    this.treeDirection.copy(this.treeEnd).sub(this.treeStart);const length=this.treeDirection.length();
    const d=this.treeDummy;d.position.copy(this.treeStart).add(this.treeEnd).multiplyScalar(.5);
    d.quaternion.setFromUnitVectors(this.treeUp,this.treeDirection.normalize());d.scale.set(radius,length,radius);d.updateMatrix();
    return Float32Array.from(d.matrix.elements);
  }
  hsl(h,s,l){this.treeColor.setHSL(h,s,l);return [this.treeColor.r,this.treeColor.g,this.treeColor.b];}
  makeTreeDescriptor({id,x,y,z,height,radius,solid,species,edge=0},serial){
    const seed=(Math.imul(Math.floor((x+2048)*17),73856093)^Math.imul(Math.floor((z+2048)*17),19349663)^Math.imul(serial+1,83492791))>>>0;
    const n=i=>vegetationNoise(seed,i),sp=M01_TREE_SPECIES[species];
    const trunkRadius=solid?radius*(.88+n(0)*.30):radius,yaw=n(1)*Math.PI*2,leanX=(n(2)-.5)*sp.lean*2,leanZ=(n(3)-.5)*sp.lean*2;
    // Shell damage near the bridgehead strips one side of a crown; the far groves stay whole.
    const damaged=species!=='snag'&&x>-240&&x<40&&n(10)<.32,damageAngle=n(11)*Math.PI*2;
    const crownW=Math.max(1.3,height*sp.crownWidth)*(.84+n(4)*.32),y0=height*sp.crown[0]*(.9+n(5)*.18),y1=height*sp.crown[1]*(.95+n(6)*.07),depth=Math.max(1,y1-y0);
    const hue=lerp(sp.hue,n(7))-(damaged?.035:0),sat=lerp(sp.sat,n(8)),light=lerp(sp.light,n(9))-(damaged?.015:0);
    const lean=h=>({x:leanX*h,z:leanZ*h}),lobes=[];
    for(let i=0;i<sp.lobes;i++){
      const k=20+i*9,f=sp.lobes>1?i/(sp.lobes-1):.5,angle=yaw+i*2.399963+(n(k)-.5)*.9;
      if(damaged&&i>0&&Math.abs(Math.atan2(Math.sin(angle-damageAngle),Math.cos(angle-damageAngle)))<1.05)continue;
      let ring,yc,sx,sy,sz;
      if(i===0){ring=0;yc=y0+depth*(species==='pine'?.62:.55);sx=crownW*(.72+n(k+1)*.16);sy=depth*(species==='poplar'?.52:.40);sz=crownW*(.68+n(k+2)*.16);}
      else if(species==='poplar'){ring=crownW*(.18+n(k+1)*.30);yc=y0+depth*(.10+.82*f);sx=crownW*(.62+n(k+2)*.2);sy=depth*(.16+n(k+3)*.07);sz=crownW*(.58+n(k+4)*.2);}
      else if(species==='pine'){ring=crownW*(.30+n(k+1)*.55);yc=y0+depth*(.38+.55*n(k+3));sx=crownW*(.42+n(k+2)*.22);sy=depth*(.16+n(k+4)*.10);sz=crownW*(.40+n(k+5)*.22);}
      else if(species==='pollard'){ring=crownW*(.20+n(k+1)*.40);yc=y0+depth*(.25+.6*n(k+3));sx=crownW*(.34+n(k+2)*.16);sy=depth*(.30+n(k+4)*.14);sz=crownW*(.32+n(k+5)*.16);}
      else{
        const droop=species==='willow'||species==='birch'?.22:0;
        ring=crownW*(.34+n(k+1)*.42)*Math.sin(Math.PI*(.28+.5*f));yc=y0+depth*(.24+.58*(1-f)*.6+.32*n(k+3)-droop*(ring/crownW));
        sx=crownW*(.40+n(k+2)*.26);sy=depth*(.26+n(k+4)*.14);sz=crownW*(.38+n(k+5)*.26);
      }
      const l=lean(yc);
      lobes.push({x:l.x+Math.cos(angle)*ring,y:yc,z:l.z+Math.sin(angle)*ring,sx,sy,sz,rx:(n(k+6)-.5)*.4,ry:angle,rz:(n(k+7)-.5)*.34,
        color:this.hsl(hue+(n(k+8)-.5)*.022,sat*(.92+n(k+6)*.16),light*(.92+.14*(yc-y0)/depth)+(n(k+7)-.5)*.03)});
    }
    const trunkTop=height*sp.trunkTop*(species==='snag'?.72+n(12)*.28:1),branches=[];
    const branchTotal=species==='snag'?sp.branches+1:Math.min(sp.branches,Math.max(1,lobes.length-1));
    for(let i=0;i<branchTotal;i++){
      const k=140+i*6,target=lobes.length>1?lobes[1+(i%(lobes.length-1))]:null;
      const tl=target?lean(target.y):null,angle=target?Math.atan2(target.z-tl.z,target.x-tl.x):yaw+i*1.9+(n(k)-.5)*.8;
      const startY=Math.min(trunkTop*.96,Math.max(height*.22,(target?target.y:trunkTop)*(.55+n(k+1)*.2)));
      const reach=target?Math.hypot(target.x-tl.x,target.z-tl.z)*.82+.2:crownW*(.35+n(k+2)*.55);
      const endY=target?target.y-target.sy*.25:Math.min(height,startY+1+n(k+3)*2.4),s=lean(startY);
      branches.push({s:{x:s.x,y:startY,z:s.z},e:{x:s.x+Math.cos(angle)*reach,y:endY,z:s.z+Math.sin(angle)*reach},r:trunkRadius*(.20+n(k+4)*.12)*(species==='pollard'?.55:1)});
    }
    // Pollards: a knuckle of upright shoots above the cut trunk.
    if(species==='pollard')for(let i=0;i<5;i++){const a=yaw+i*1.2566,s=lean(trunkTop);branches.push({s:{x:s.x,y:trunkTop-.1,z:s.z},e:{x:s.x+Math.cos(a)*crownW*.35,y:trunkTop+depth*(.55+n(170+i)*.3),z:s.z+Math.sin(a)*crownW*.35},r:trunkRadius*.16});}
    const cards=[];
    for(let i=0;i<2&&lobes.length>2;i++){
      const l=lobes[1+i],angle=yaw+i*1.9+n(120+i)*.8;
      cards.push({x:l.x*.85,y:l.y+depth*.02,z:l.z*.85,sx:crownW*(.62+n(122+i)*.2),sy:depth*(.34+n(124+i)*.1),rx:(n(126+i)-.5)*.26,ry:angle,rz:(n(128+i)-.5)*.18});
    }
    const barkColor=barkTint(sp.bark,.88+n(13)*.24);
    // Trunks start below the terrain so slopes never show a floating base.
    const sink=.22+trunkRadius*.4,trunkLength=trunkTop+sink,mid=lean((trunkTop-sink)*.5);
    const t={id,x,y,z,height,radius:trunkRadius,solid,seed,species,profile:species,damaged,edge,yaw,leanX,leanZ,crownW,lod:null,barkColor};
    t.trunk=this.partMatrix({x:x+mid.x,y:y+(trunkTop-sink)*.5,z:z+mid.z},{x:trunkRadius,y:trunkLength,z:trunkRadius},{x:leanZ*.5,y:yaw,z:-leanX*.5});
    t.branches=branches.map(b=>this.rodMatrix({x:x+b.s.x,y:y+b.s.y,z:z+b.s.z},{x:x+b.e.x,y:y+b.e.y,z:z+b.e.z},b.r));
    t.lobes=lobes.map(l=>this.partMatrix({x:x+l.x,y:y+l.y,z:z+l.z},{x:l.sx,y:l.sy,z:l.sz},{x:l.rx,y:l.ry,z:l.rz}));t.lobeColors=lobes.map(l=>l.color);
    t.cards=cards.map(c=>this.partMatrix({x:x+c.x,y:y+c.y,z:z+c.z},{x:c.sx,y:c.sy,z:1},{x:c.rx,y:c.ry,z:c.rz}));
    // Far LOD: one envelope lobe plus the largest side lobe keeps the species silhouette in two instances.
    const cl=lean(y0+depth*.5);
    t.far=lobes.length?[this.partMatrix({x:x+cl.x,y:y+y0+depth*.52,z:z+cl.z},{x:crownW*.92,y:depth*.56,z:crownW*.88},{x:0,y:yaw,z:0}),
      ...(lobes[1]?[this.partMatrix({x:x+lobes[1].x,y:y+lobes[1].y,z:z+lobes[1].z},{x:lobes[1].sx*1.05,y:lobes[1].sy*1.04,z:lobes[1].sz*1.05},{x:0,y:lobes[1].ry,z:0})]:[])]:[];
    t.farColors=lobes.length?[lobes[0].color,lobes[1]?.color??lobes[0].color]:[];
    t.lobeCount=lobes.length;t.crownBase=y0;t.crownTop=y1;
    return t;
  }
  makeShrubDescriptor(s,index){
    const n=i=>vegetationNoise(s.seed,i),lumps=[],twigs=[],colors=[],narrow=s.species==='broom'?.75:1;
    for(let j=0;j<s.lumps;j++){
      const a=s.yaw+j*2.399963+(n(j*7)-.5)*.8,d=j?s.width*(.18+n(j*7+1)*.22):0;
      const sx=s.width*(.34+n(j*7+2)*.18)*narrow,sy=s.height*(.40+n(j*7+3)*.18),sz=s.width*(.32+n(j*7+4)*.18)*narrow;
      // Lump centres sit low so every shrub is partly buried: no visible floating underside.
      const yc=s.height*(.36+(j?n(j*7+5)*.18:.12))-.06;
      lumps.push(this.partMatrix({x:s.x+Math.cos(a)*d,y:s.y+yc,z:s.z+Math.sin(a)*d},{x:sx,y:sy,z:sz},{x:(n(j*7+6)-.5)*.3,y:a,z:(n(j*7+5)-.5)*.3}));
      colors.push(this.hsl(s.hue+(n(j*7+3)-.5)*.02,s.sat,s.light*(.9+n(j*7+4)*.2)));
    }
    const twigTotal=s.species==='dead'?6:s.species==='dry'?3:s.species==='broom'?2:0;
    for(let j=0;j<twigTotal;j++){
      const a=s.yaw+j*2.1+(n(60+j)-.5)*.6,reach=s.width*(.25+n(61+j)*.35),top=s.height*(.65+n(62+j)*.45);
      twigs.push(this.rodMatrix({x:s.x+Math.cos(a)*.08,y:s.y-.08,z:s.z+Math.sin(a)*.08},{x:s.x+Math.cos(a)*reach,y:s.y+top,z:s.z+Math.sin(a)*reach},.018+n(63+j)*.018));
    }
    return {id:`m01_shrub_${index}`,x:s.x,z:s.z,species:s.species,lumps,colors,twigs,twigColor:barkTint('#6b5f50'),lod:null};
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
    // New layout: its own seeded streams, the approved 17 physical trees untouched.
    this.layout=buildM01VegetationLayout(this.world);
    let serial=0;
    for(const t of this.layout.solid)this.treeDescriptors.push(this.makeTreeDescriptor(t,serial++));
    for(const t of this.layout.visualTrees)this.treeDescriptors.push(this.makeTreeDescriptor(t,serial++));
    this.shrubDescriptors=this.layout.shrubs.map((s,i)=>this.makeShrubDescriptor(s,i));
  }
  buildTreeBatches(){
    const sum=f=>this.treeDescriptors.reduce((a,t)=>a+f(t),0),shrubSum=f=>this.shrubDescriptors.reduce((a,s)=>a+f(s),0);
    const make=(name,geometry,material,capacity,{cast=false,receive=true}={})=>{
      const batch=new THREE.InstancedMesh(geometry,material,Math.max(1,capacity));batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      batch.setColorAt(0,this.treeColor.setRGB(1,1,1));batch.instanceColor.setUsage(THREE.DynamicDrawUsage);
      batch.count=0;batch.frustumCulled=false;batch.castShadow=cast;batch.receiveShadow=receive;batch.userData.m01Vegetation=name;
      this.group.add(batch);this.resources.push(batch);this.treeBatches[name]=batch;return batch;
    };
    const wood=sum(t=>1+t.branches.length)+shrubSum(s=>s.twigs.length),crowns=sum(t=>t.lobes.length)+shrubSum(s=>s.lumps.length);
    make('woodNear',this.geometry.treeWoodNear,this.bark,wood,{cast:true});
    make('canopyNear',this.geometry.treeCanopyNear,this.canopyMaterial,crowns,{cast:true});
    make('cardsNear',this.geometry.leaf,this.foliage,sum(t=>t.cards.length),{cast:false});
    make('woodMid',this.geometry.treeWoodMid,this.bark,sum(t=>1+t.branches.length),{cast:false});
    make('canopyMid',this.geometry.treeCanopyMid,this.canopyMaterial,crowns,{cast:false});
    make('woodFar',this.geometry.treeWoodFar,this.bark,this.treeDescriptors.length,{cast:false,receive:false});
    make('canopyFar',this.geometry.treeCanopyFar,this.canopyMaterial,sum(t=>t.far.length)+shrubSum(s=>Math.min(2,s.lumps.length)),{cast:false,receive:true});
  }
  copyPart(name,count,matrix,color=null){
    const batch=this.treeBatches[name],i=count[name]++;batch.instanceMatrix.array.set(matrix,i*16);
    if(color)batch.instanceColor.array.set(color,i*3);else batch.instanceColor.array.fill(1,i*3,i*3+3);
  }
  updateVegetationLod(player,quality='medium',force=false){
    const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium,key=`${quality}:${Math.floor((player?.x??0)/3)}:${Math.floor((player?.z??0)/3)}`;
    if(!force&&key===this.treeUpdateKey)return;this.treeUpdateKey=key;
    const count={woodNear:0,canopyNear:0,cardsNear:0,woodMid:0,canopyMid:0,woodFar:0,canopyFar:0},lod={near:0,mid:0,far:0},shrubLod={near:0,mid:0,culled:0};
    const px=player?.x??0,pz=player?.z??0;
    for(const t of this.treeDescriptors){
      const level=chooseVegetationLod(Math.hypot(t.x-px,t.z-pz),quality,t.lod);t.lod=level;lod[level]++;
      if(level==='near'){
        this.copyPart('woodNear',count,t.trunk,t.barkColor);
        for(const b of t.branches.slice(0,t.species==='snag'?t.branches.length:q.nearBranches))this.copyPart('woodNear',count,b,t.barkColor);
        t.lobes.slice(0,q.nearLobes).forEach((l,i)=>this.copyPart('canopyNear',count,l,t.lobeColors[i]));
        for(const card of t.cards.slice(0,q.nearCards))this.copyPart('cardsNear',count,card);
      }else if(level==='mid'){
        this.copyPart('woodMid',count,t.trunk,t.barkColor);
        for(const b of t.branches.slice(0,t.species==='snag'?3:q.midBranches))this.copyPart('woodMid',count,b,t.barkColor);
        t.lobes.slice(0,q.midLobes).forEach((l,i)=>this.copyPart('canopyMid',count,l,t.lobeColors[i]));
      }else{
        this.copyPart('woodFar',count,t.trunk,t.barkColor);
        t.far.forEach((l,i)=>this.copyPart('canopyFar',count,l,t.farColors[i]));
      }
    }
    for(const s of this.shrubDescriptors){
      const level=chooseShrubLod(Math.hypot(s.x-px,s.z-pz),quality);s.lod=level;shrubLod[level]++;
      if(level==='culled')continue;
      // Mid shrubs drop to two 20-triangle lumps: at that range they are a few pixels of broken colour.
      if(level==='near')s.lumps.forEach((l,i)=>this.copyPart('canopyNear',count,l,s.colors[i]));
      else s.lumps.slice(0,2).forEach((l,i)=>this.copyPart('canopyFar',count,l,s.colors[i]));
      if(level==='near')for(const tw of s.twigs)this.copyPart('woodNear',count,tw,s.twigColor);
    }
    for(const [name,batch]of Object.entries(this.treeBatches)){
      batch.count=count[name];this.uploadPrefix(batch,count[name]);
    }
    this.treeBatches.canopyNear.castShadow=quality==='high';this.treeBatches.woodNear.castShadow=quality!=='low';
    this.treeBatches.woodMid.castShadow=quality==='high';this.treeBatches.canopyMid.castShadow=false;
    this.updateGroundCover(px,pz,quality);
    this.treeLodCounts=lod;this.shrubLodCounts=shrubLod;this.treeCardCount=count.cardsNear;
    this.treeTriangleCount=Object.values(this.treeBatches).reduce((sum,b)=>sum+b.count*((b.geometry.index?.count??b.geometry.attributes.position.count)/3),0);
    this.treeDrawCalls=Object.values(this.treeBatches).filter(b=>b.count>0).length;
  }
  // Ground cover is authored once and streamed: only tufts inside the quality's fade radius are copied
  // into the batches when the player crosses a 3 m cell. Low keeps every other tuft (interleaved order).
  buildGroundCover(){
    const groups={},d=this.treeDummy;this.groundCoverCounts={};this.groundCover=[];
    for(const g of interleaveForDensity(this.layout.ground))(groups[GRASS_GEOMETRY[g.type]]??=[]).push(g);
    for(const g of this.layout.ground)this.groundCoverCounts[g.type]=(this.groundCoverCounts[g.type]??0)+1;
    for(const [name,items]of Object.entries(groups)){
      const n=items.length,xz=new Float32Array(n*2),matrices=new Float32Array(n*16),colors=new Float32Array(n*3);
      items.forEach((g,i)=>{
        const w=(name==='reed'?.9:1)+vegetationNoise(i,name.length)*.55;
        d.position.set(g.x,g.y-.03,g.z);d.rotation.set(g.lean,g.yaw,g.lean*.6);d.scale.set(w,g.h,w);d.updateMatrix();
        matrices.set(d.matrix.elements,i*16);xz[i*2]=g.x;xz[i*2+1]=g.z;
        this.treeColor.setHSL(g.hue,g.sat,g.light);colors[i*3]=this.treeColor.r;colors[i*3+1]=this.treeColor.g;colors[i*3+2]=this.treeColor.b;
      });
      const batch=new THREE.InstancedMesh(this.grassGeometry[name],this.grassMaterial,n);
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.setColorAt(0,this.treeColor);batch.instanceColor.setUsage(THREE.DynamicDrawUsage);
      batch.count=0;batch.frustumCulled=false;batch.castShadow=false;batch.receiveShadow=true;batch.userData.m01GroundCover=name;
      this.group.add(batch);this.resources.push(batch);this.grassBatches.push(batch);this.groundCover.push({batch,xz,matrices,colors,n});
    }
  }
  updateGroundCover(px,pz,quality){
    const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium,reach=(q.grassFade[1]+6)**2,step=quality==='low'?2:1;
    for(const {batch,xz,matrices,colors,n}of this.groundCover){
      const m=batch.instanceMatrix.array,c=batch.instanceColor.array;let count=0;
      for(let i=0;i<n;i+=step){
        const dx=xz[i*2]-px,dz=xz[i*2+1]-pz;if(dx*dx+dz*dz>reach)continue;
        for(let j=0,a=i*16,b=count*16;j<16;j++)m[b+j]=matrices[a+j];
        c[count*3]=colors[i*3];c[count*3+1]=colors[i*3+1];c[count*3+2]=colors[i*3+2];count++;
      }
      batch.count=count;this.uploadPrefix(batch,count);
    }
  }
  // Upload only the used prefix. An empty batch uploads nothing (a zero-length range means "whole buffer").
  uploadPrefix(batch,count){
    if(count===0)return;
    batch.instanceMatrix.clearUpdateRanges();batch.instanceMatrix.addUpdateRange(0,count*16);batch.instanceMatrix.needsUpdate=true;
    batch.instanceColor.clearUpdateRanges();batch.instanceColor.addUpdateRange(0,count*3);batch.instanceColor.needsUpdate=true;
  }
  // Soft contact shade under crowns and large shrubs, tilted to the local terrain slope.
  buildGroundShadows(){
    const spots=[...this.treeDescriptors.filter(t=>t.lobeCount>0).map(t=>({x:t.x,z:t.z,r:t.crownW*.8,a:t.seed})),
      ...this.layout.shrubs.filter(s=>s.species!=='dead').map(s=>({x:s.x,z:s.z,r:s.width*.62,a:s.seed}))];
    const batch=new THREE.InstancedMesh(this.geometry.groundShadow,this.groundShadowMaterial,spots.length),d=this.treeDummy,normal=new THREE.Vector3(),h=(x,z)=>this.world.terrainHeightAt(x,z);
    spots.forEach((s,i)=>{
      normal.set(h(s.x-1,s.z)-h(s.x+1,s.z),2,h(s.x,s.z-1)-h(s.x,s.z+1)).normalize();
      d.position.set(s.x,h(s.x,s.z)+.05,s.z);d.quaternion.setFromUnitVectors(this.treeUp,normal);d.rotateY(vegetationNoise(s.a,5)*Math.PI*2);
      d.scale.set(s.r*(.9+vegetationNoise(s.a,6)*.25),1,s.r*(.8+vegetationNoise(s.a,7)*.3));d.updateMatrix();batch.setMatrixAt(i,d.matrix);
    });
    d.quaternion.identity();d.rotation.set(0,0,0);
    // Drawn first among transparents so smoke/dust puffs always blend over the contact shade.
    batch.computeBoundingSphere();batch.renderOrder=-1;batch.receiveShadow=false;batch.castShadow=false;batch.userData.m01Vegetation='groundShadow';
    this.group.add(batch);this.resources.push(batch);this.groundShadowCount=spots.length;this.groundShadowBatch=batch;
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
  buildProductionDressing(){
    this.propDescriptors=[...buildM01EnvironmentProps(this.world)];
    for(const p of this.propDescriptors)this.put(p.kind,p.material,p.p,p.size,p.rotation,p.color,null,{propQuality:p.quality});
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
  sync(world,quality,player={x:0,z:0},clock=0){
    for(const {id,batch,height}of this.dynamic){const cover=world.covers.find(c=>c.id===id);batch.visible=Boolean(cover);if(cover)batch.scale.y=(cover.max.y-cover.min.y)/height;}
    // Density changes are presentation-only. Prop batches are authored once and toggled by minimum quality.
    const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium,grass=this.grassMaterial.userData.m01Grass;
    grass.m01Time.value=clock;grass.m01Fade.value.set(q.grassFade[0],q.grassFade[1]);
    const rank=M01_PROP_QUALITY_RANK[quality]??M01_PROP_QUALITY_RANK.medium;this.propQuality=quality;
    for(const batch of this.propBatches)batch.visible=M01_PROP_QUALITY_RANK[batch.userData.m01PropQuality]<=rank;
    this.updateVegetationLod(player,quality);
  }
  get propDiagnostics(){
    const quality=this.propQuality??'medium',counts=propCountsForQuality(this.propDescriptors,quality);
    return {quality,clusters:new Set(this.propDescriptors.map(p=>p.cluster)).size,totalAll:this.propDescriptors.length,visible:counts.total,
      byArea:counts.byArea,byCluster:counts.byCluster,batches:this.propBatches.filter(b=>b.visible).length,totalBatches:this.propBatches.length,
      collidersAdded:0,deterministicSeedDomain:'m01-environment-props'};
  }
  get diagnostics(){
    const grassInstances=this.grassBatches.reduce((n,b)=>n+b.count,0),treeInstances=Object.values(this.treeBatches).reduce((n,b)=>n+b.count,0);
    const species={};for(const t of this.treeDescriptors)species[t.species]=(species[t.species]??0)+1;
    const shrubSpecies={};for(const s of this.shrubDescriptors)shrubSpecies[s.species]=(shrubSpecies[s.species]??0)+1;
    const groundTriangles=this.grassBatches.reduce((n,b)=>n+b.count*b.geometry.attributes.position.count/3,0);
    return {treeCount:this.treeDescriptors.length,solidTreeCount:this.treeDescriptors.filter(t=>t.solid).length,visualTreeCount:this.treeDescriptors.filter(t=>!t.solid).length,
      lod:{...this.treeLodCounts},treeInstances,treeDrawCalls:this.treeDrawCalls,treeTriangles:Math.round(this.treeTriangleCount),leafCards:this.treeCardCount,
      legacyLeafCardEstimate:M01_LEGACY_LEAF_CARD_ESTIMATE,alphaCardReductionApprox:1-this.treeCardCount/M01_LEGACY_LEAF_CARD_ESTIMATE,
      species,damagedTrees:this.treeDescriptors.filter(t=>t.damaged).length,
      shrubCount:this.shrubDescriptors.length,shrubSpecies,shrubLod:{...this.shrubLodCounts},
      grassInstances,groundCover:{...this.groundCoverCounts},groundCoverBatches:this.grassBatches.length,groundTriangles:Math.round(groundTriangles),groundShadows:this.groundShadowCount,
      drawCalls:this.treeDrawCalls+this.grassBatches.filter(b=>b.count>0).length+(this.groundShadowCount?1:0),materials:5,textures:4,groundCoverTotal:this.layout.ground.length,collidersAdded:0,
      tracked:Object.fromEntries(this.treeDescriptors.filter(t=>t.solid).map(t=>[t.id,t.lod]))};
  }
  dispose(){
    this.group.removeFromParent();this.resources.forEach(b=>b.dispose());Object.values(this.geometry).forEach(g=>g.dispose());Object.values(this.grassGeometry).forEach(g=>g.dispose());
    this.foliage.dispose();this.canopyMaterial.dispose();this.leafMap.dispose();this.bark.map.dispose();this.bark.dispose();this.grassMaterial.dispose();
    this.groundShadowMaterial.dispose();this.shadowMap.dispose();this.canopyLeafMap.dispose();
  }
}
