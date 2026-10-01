import * as THREE from 'three';
import {leafTexture,texturedSurface} from './m01-surfaces.js';

// Small decoration is non-solid. Trunks/buildings are outside the playable routes.
// This is art direction around measured infrastructure, not a historical survey.
export class M01Environment {
  constructor(scene,world,materials){
    this.group=new THREE.Group();scene.add(this.group);this.world=world;this.materials=materials;
    this.geometry={box:new THREE.BoxGeometry(1,1,1),rock:new THREE.DodecahedronGeometry(1,0),
      trunk:new THREE.CylinderGeometry(.72,1,1,9),leaf:new THREE.PlaneGeometry(1,1),bag:new THREE.CapsuleGeometry(.5,.4,3,7)};
    this.leafMap=leafTexture();this.foliage=new THREE.MeshStandardMaterial({map:this.leafMap,alphaTest:.38,side:THREE.DoubleSide,roughness:1,color:'#b7ad83'});
    this.bark=texturedSurface('wood',{worldScale:1,bump:.12,color:'#80786b'});
    this.grassMaterial=new THREE.MeshStandardMaterial({color:'#76734f',roughness:1,side:THREE.DoubleSide});
    this.grassGeometry=new THREE.BufferGeometry();this.grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.1,0,0, .1,0,0, .035,.48,0, 0,0,-.1, 0,0,.1, 0,.38,.04],3));this.grassGeometry.computeVertexNormals();
    this.lists=new Map();this.resources=[];this.dynamic=[];
    let seed=19390901;this.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    this.buildVegetation();this.buildClutter();this.buildTracks();this.buildArchitecture();this.buildCovers();this.flush();
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
      batch.computeBoundingSphere();batch.castShadow=['box','trunk','bag'].includes(list.kind);batch.receiveShadow=true;
      this.group.add(batch);this.resources.push(batch);if(list.parentId)this.dynamic.push({batch,id:list.parentId,height:this.world.covers.find(c=>c.id===list.parentId)?.max.y-this.world.covers.find(c=>c.id===list.parentId)?.min.y});
    }
    this.lists.clear();
  }
  buildVegetation(){
    const r=this.random;
    for(const t of this.world.trees){
      this.put('trunk','bark',[t.x,t.y+t.height*.39,t.z],[t.radius,t.height*.78,t.radius]);
      for(let b=0;b<6;b++){
        const angle=b*2.4,reach=2.5+r()*2;
        this.put('trunk','bark',[t.x+Math.sin(angle)*reach*.5,t.y+t.height*(.55+b*.04),t.z+Math.cos(angle)*reach*.5],[.075,reach*1.5,.075],[Math.cos(angle)*.85,angle,Math.sin(angle)*.85]);
      }
      for(let l=0;l<25;l++){
        const angle=l*2.4,spread=1+r()*4;
        this.put('leaf','leaf',[t.x+Math.sin(angle)*spread,t.y+t.height*.58+r()*t.height*.44,t.z+Math.cos(angle)*spread],[3.5+r()*2,3+r()*2,1],[r()*.9,r()*Math.PI,r()*.4]);
      }
    }
    // Keep railway/road approaches, objectives and bridge lanes open.
    for(let i=0;i<68;i++){
      const x=-650+r()*570,z=(i%2?1:-1)*(90+r()*155),y=this.world.terrainHeightAt(x,z),height=9+r()*12;
      this.put('trunk','bark',[x,y+height*.4,z],[.24+r()*.16,height*.8,.24+r()*.16]);
      for(let b=0;b<5;b++){
        const angle=b*2.4+i,reach=2+r()*2,h=height*(.55+r()*.3);
        this.put('trunk','bark',[x+Math.sin(angle)*reach*.5,y+h,z+Math.cos(angle)*reach*.5],[.10,reach*1.4,.10],[Math.cos(angle)*.7,angle,Math.sin(angle)*.7]);
      }
      for(let l=0;l<16;l++){
        const angle=l*2.4,spread=1+r()*3.6;
        this.put('leaf','leaf',[x+Math.sin(angle)*spread,y+height*.6+r()*height*.45,z+Math.cos(angle)*spread],[4+r()*2,3+r()*2,1],[r()*.7,r()*Math.PI,r()*.4]);
      }
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
          this.put('box','wood',[x,y+.065,z],[.2,.10,2.65],[0,angle,0]);
          this.put('rock','stone',[x,y+.01,z],[.95,.07,1.7],[0,angle,0]);
        }
      }
    }
  }
  buildArchitecture(){
    // Facade details rest on the current station/hut colliders. Their doors stay blocked/open as before.
    for(let x=-450;x<-340;x+=10)for(const y of [1.5,6]){
      this.put('box','dark',[x,y,27.92],[2.2,2.8,.06]);
      for(const dx of [-1.2,1.2])this.put('box','stone',[x+dx,y,27.85],[.17,3,.16]);
      for(const dy of [-1.5,1.5])this.put('box','stone',[x,y+dy,27.8],[2.6,.18,.28]);
      this.put('box','wood',[x,y,27.75],[.07,2.8,.08]);this.put('box','wood',[x,y,27.74],[2.2,.07,.08]);
    }
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
  sync(world,quality){
    for(const {id,batch,height}of this.dynamic){const cover=world.covers.find(c=>c.id===id);batch.visible=Boolean(cover);if(cover)batch.scale.y=(cover.max.y-cover.min.y)/height;}
    // Density is reduced in the existing low preset; no quality changes affect the simulation.
    for(const batch of this.resources){if(batch.geometry===this.grassGeometry)batch.count=Math.floor(batch.instanceMatrix.count*(quality==='low'?.5:1));}
  }
  dispose(){this.group.removeFromParent();this.resources.forEach(b=>b.dispose());Object.values(this.geometry).forEach(g=>g.dispose());this.grassGeometry.dispose();this.foliage.dispose();this.leafMap.dispose();this.bark.map.dispose();this.bark.dispose();this.grassMaterial.dispose();}
}
