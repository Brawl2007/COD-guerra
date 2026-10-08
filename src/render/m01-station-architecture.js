import * as THREE from 'three';

// Original mesh reconstruction, not a survey. T24 + MBP Tczew Poczt226/Poczt734:
// raised central pavilion, lower symmetrical wings, shallow roofs and platform awnings.
// Exact dimensions/bay rhythm are adapted INSIDE the approved runtime envelope.
export const STATION_ENVELOPE=Object.freeze({min:Object.freeze([-470,-3,20]),max:Object.freeze([-330,15,55])});
export const STATION_VOLUMES=Object.freeze([
  Object.freeze({id:'west_annex',x0:-460,x1:-447,z0:28.6,z1:54.75,eave:7.9,ridge:10.2,bays:3}),
  Object.freeze({id:'west_wing',x0:-447,x1:-409,z0:28.6,z1:54.75,eave:9.2,ridge:11.8,bays:9}),
  Object.freeze({id:'central_pavilion',x0:-409,x1:-389,z0:28,z1:54.75,eave:11.7,ridge:13.6,bays:5}),
  Object.freeze({id:'east_wing',x0:-389,x1:-351,z0:28.6,z1:54.75,eave:9.2,ridge:11.8,bays:9}),
  Object.freeze({id:'east_annex',x0:-351,x1:-338,z0:28.6,z1:54.75,eave:7.9,ridge:10.2,bays:3})
]);
const hash=(x,z,k=0)=>{let n=(Math.imul(Math.round(x*127),73856093)^Math.imul(Math.round(z*131),19349663)^Math.imul(k+1,83492791))>>>0;n^=n>>>16;n=Math.imul(n,0x45d9f3b);return (n>>>0)/4294967296;};
const rank={low:2,medium:1,high:0};
export function stationLod(distance,quality='medium'){
  const minimum=rank[quality]??1;
  return Math.max(minimum,distance>260?2:distance>105?1:0);
}
// Closed geometric recesses: no navigation, door opening, state or collider is created.
export function stationOpenings(v,side){
  const result=[],z=side==='front'?v.z0:v.z1;
  for(let i=0;i<v.bays;i++){
    const x=v.x0+(i+.5)*(v.x1-v.x0)/v.bays;
    for(const row of [0,1]){
      const door=row===0&&(i===Math.floor(v.bays/2)||v.id==='central_pavilion'&&i%2===0);
      const bottom=row===0?(door?-2.94:-1.8):3.6;
      result.push({id:`${v.id}_${side}_${i}_${row}`,x,z,width:door?2.2:1.75,bottom,spring:row===0?.55:6.15,rise:.42,door,depth:door?1.35:.95});
    }
  }
  return result;
}
class MeshWriter{
  constructor(){this.p=[];this.uv=[];this.c=[];}
  triangle(a,b,c,tint=1,axis='auto'){
    if(axis==='auto'){
      const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
      const nx=Math.abs(u[1]*v[2]-u[2]*v[1]),ny=Math.abs(u[2]*v[0]-u[0]*v[2]),nz=Math.abs(u[0]*v[1]-u[1]*v[0]);
      axis=ny>=Math.max(nx,nz)?'xz':nx>nz?'zy':'xy';
    }
    for(const v of [a,b,c]){
      this.p.push(...v);
      this.uv.push(axis==='xz'?v[0]:axis==='zy'?v[2]:v[0],axis==='xz'?v[2]:v[1]);
      // Metre-scale, stable vertex weathering; no call to Math.random or simulation RNG.
      const dirt=v[1]<-.9?.69+.10*hash(v[0],v[2]):.88+.12*hash(v[0],v[2]);
      this.c.push(tint*dirt,tint*dirt,tint*dirt);
    }
  }
  quad(a,b,c,d,tint=1,axis='auto'){this.triangle(a,b,c,tint,axis);this.triangle(a,c,d,tint,axis);}
  prism(x0,y0,z0,x1,y1,z1,tint=1){
    this.quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],tint);
    this.quad([x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[x0,y0,z1],tint);
    this.quad([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0],tint,'zy');
    this.quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],tint,'zy');
    this.quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],tint,'xz');
    this.quad([x0,y0,z1],[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],tint,'xz');
  }
  geometry(){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
    g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
  }
}
function arch(o,segments=10,expand=0){
  const r=o.width/2+expand,x=o.x,y=Math.max(-3,o.bottom-expand),s=o.spring;
  const points=[new THREE.Vector2(x-r,y),new THREE.Vector2(x+r,y),new THREE.Vector2(x+r,s)];
  for(let i=1;i<=segments;i++){const a=i*Math.PI/segments;points.push(new THREE.Vector2(x+Math.cos(a)*r,s+Math.sin(a)*(o.rise+expand)));}
  return points;
}
function polygon(writer,contour,holes,z,reverse=false,tint=1){
  const points=[...contour,...holes.flat()],tris=THREE.ShapeUtils.triangulateShape(contour,holes);
  for(const t of tris){const p=t.map(i=>[points[i].x,points[i].y,z]);writer.triangle(...(reverse?p.reverse():p),tint);}
}
function ring(writer,outer,inner,z,back,tint=1){
  for(let i=0;i<inner.length;i++){
    const j=(i+1)%inner.length,a=outer[i],b=outer[j],c=inner[j],d=inner[i];
    writer.quad([a.x,a.y,z],[b.x,b.y,z],[c.x,c.y,z],[d.x,d.y,z],tint);
    writer.quad([d.x,d.y,z],[c.x,c.y,z],[c.x,c.y,back],[d.x,d.y,back],tint*.78);
  }
}

export function buildStationMeshes(lod=0){
  const w=Object.fromEntries(['brick','stone','roof','wood','metal','interior','glass'].map(k=>[k,new MeshWriter()])),segments=lod===2?5:10;
  let openings=0;
  for(const v of STATION_VOLUMES){
    const mid=(v.x0+v.x1)/2;
    for(const side of ['front','rear']){
      const z=side==='front'?v.z0:v.z1,inside=z+(side==='front'?1:-1)*.65,sign=side==='front'?1:-1;
      const contour=[[v.x0,-3],[v.x1,-3],[v.x1,v.eave],[v.x0,v.eave]].map(([x,y])=>new THREE.Vector2(x,y));
      const windows=stationOpenings(v,side),holes=windows.map(o=>arch(o,segments));openings+=holes.length;
      polygon(w.brick,contour,holes,z,side==='front');
      polygon(w.interior,contour,holes,inside,side!=='front',.56);
      for(const [i,o]of windows.entries()){
        const hole=holes[i],back=z+sign*o.depth;
        // Visible jambs/soffit, backed cavity, sill and inset frame, all true geometry.
        for(let k=0;k<hole.length;k++){
          const a=hole[k],b=hole[(k+1)%hole.length];w.stone.quad([a.x,a.y,z],[b.x,b.y,z],[b.x,b.y,back],[a.x,a.y,back],.66);
        }
        polygon(w.interior,hole,[],back,side==='front',.42);
        ring(w.brick,arch(o,segments,.18),hole,z-sign*.045,z+sign*.08,.94);
        const glassZ=back-sign*.07;
        // A dark simplified interior lies behind opaque, recessed glazing / closed doors.
        // At close range side walls and angled panel returns produce physical parallax.
        const inset=arch({...o,width:o.width-.15,bottom:o.bottom+.07,rise:o.rise-.05},segments);
        polygon(o.door?w.wood:w.glass,inset,[],glassZ,side==='front',.80);
        w.stone.prism(o.x-o.width/2-.10,Math.max(-3,o.bottom-.16),Math.min(z-sign*.16,z+sign*.18),o.x+o.width/2+.10,o.bottom-.04,Math.max(z-sign*.16,z+sign*.18),.92);
        if(lod<2){
          for(const dx of [-o.width/2+.07,0,o.width/2-.07])w.wood.prism(o.x+dx-.035,o.bottom+.06,glassZ-.045,o.x+dx+.035,o.spring,glassZ+.045,.77);
          for(const y of o.door?[-1.45,-.3]:[o.bottom+.8,o.spring-.2])w.wood.prism(o.x-o.width/2+.07,y-.035,glassZ-.04,o.x+o.width/2-.07,y+.035,glassZ+.04,.82);
        }
        if(lod===0&&o.door){
          w.metal.prism(o.x+.17,-1.43,glassZ-sign*.09,o.x+.21,-1.18,glassZ-sign*.04,.8);
          for(let p=0;p<6;p++)w.wood.prism(o.x-.89+p*.30,o.bottom+.1,glassZ-sign*.025,o.x-.875+p*.30,o.spring-.07,glassZ-sign*.008,.55);
        }
      }
      // Profiled base, string courses and eaves, contained by the historical visual polygon.
      for(const [y,h,projection]of [[-2.72,.32,.10],[2.45,.20,.12],[v.eave-.36,.18,.17],[v.eave-.12,.16,.22]]){
        w.stone.prism(v.x0,y,Math.min(z-sign*projection,z+sign*.1),v.x1,y+h,Math.max(z-sign*projection,z+sign*.1),.91);
      }
      if(lod<2)for(let i=0;i<=v.bays;i++){
        const x=Math.min(v.x1-.13,Math.max(v.x0+.13,v.x0+i*(v.x1-v.x0)/v.bays));
        w.brick.prism(x-.12,-2.4,Math.min(z-sign*.1,z+sign*.06),x+.12,v.eave-.4,Math.max(z-sign*.1,z+sign*.06),1.02);
        if(lod===0)w.stone.prism(x-.18,v.eave-.62,Math.min(z-sign*.17,z+sign*.05),x+.18,v.eave-.4,Math.max(z-sign*.17,z+sign*.05),.94);
      }
    }
    // Side/party walls close each volume; nested height changes give a coherent silhouette.
    for(const x of [v.x0,v.x1]){
      if(x!==-460&&x!==-338){w.brick.quad([x,-3,v.z0],[x,-3,v.z1],[x,v.eave,v.z1],[x,v.eave,v.z0],.93,'zy');continue;}
      const sign=x===-460?1:-1,swap=writer=>({
        triangle:(a,b,c,tint=1)=>writer.triangle([a[2],a[1],a[0]],[b[2],b[1],b[0]],[c[2],c[1],c[0]],tint,'zy'),
        quad:(a,b,c,d,tint=1)=>writer.quad([a[2],a[1],a[0]],[b[2],b[1],b[0]],[c[2],c[1],c[0]],[d[2],d[1],d[0]],tint,'zy')
      });
      const contour=[[v.z0,-3],[v.z1,-3],[v.z1,v.eave],[v.z0,v.eave]].map(([x,y])=>new THREE.Vector2(x,y));
      const windows=Array.from({length:12},(_,i)=>({x:v.z0+(i%6+.5)*(v.z1-v.z0)/6,width:1.75,bottom:i<6?-1.8:3.6,spring:i<6?.55:6.15,rise:.42})),holes=windows.map(o=>arch(o,segments));
      polygon(swap(w.brick),contour,holes,x,sign===1);openings+=windows.length;
      for(const [i,o]of windows.entries()){
        const hole=holes[i],back=x+sign*.95;
        for(let k=0;k<hole.length;k++){const a=hole[k],b=hole[(k+1)%hole.length];swap(w.stone).quad([a.x,a.y,x],[b.x,b.y,x],[b.x,b.y,back],[a.x,a.y,back],.64);}
        ring(swap(w.brick),arch(o,segments,.18),hole,x-sign*.045,x+sign*.08,.94);
        polygon(swap(w.glass),hole,[],back,sign===1,.65);
        if(lod<2)w.wood.prism(back-.04,o.bottom,v.z0+(i%6+.5)*(v.z1-v.z0)/6-.035,back+.04,o.spring,v.z0+(i%6+.5)*(v.z1-v.z0)/6+.035,.78);
      }
    }
    const x0=v.x0-.12,x1=v.x1+.12,z0=v.z0-.22,z1=v.z1,rz=(z0+z1)/2,hip=Math.min(4.5,(x1-x0)*.26);
    const a=[x0,v.eave,z0],b=[x1,v.eave,z0],c=[x1,v.eave,z1],d=[x0,v.eave,z1],r0=[x0+hip,v.ridge,rz],r1=[x1-hip,v.ridge,rz];
    w.roof.quad(a,r0,r1,b,.96,'xz');w.roof.quad(d,c,r1,r0,.88,'xz');w.roof.triangle(a,d,r0,.91,'xz');w.roof.triangle(b,r1,c,.94,'xz');
    w.metal.prism(x0+hip,v.ridge-.035,rz-.10,x1-hip,v.ridge+.06,rz+.10,.74);
    // Thin gutter returns do not imply new walkable ledges.
    for(const z of [z0,z1-.1])w.metal.prism(x0,v.eave-.12,z-.05,x1,v.eave-.045,z+.05,.68);
    for(const x of [mid]){
      const cx=Math.max(v.x0+1.0,Math.min(v.x1-1.0,x));
      w.brick.prism(cx-.32,v.eave,rz+3.8,cx+.32,v.ridge+.6,rz+4.5,.78);
      w.stone.prism(cx-.40,v.ridge+.6,rz+3.72,cx+.40,v.ridge+.73,rz+4.58,.83);
      w.interior.prism(cx-.23,v.ridge+.735,rz+3.81,cx+.23,v.ridge+.745,rz+4.49,.43);
    }
    // Platform awning: supported from the wall, all feet inside the existing solid envelope.
    // 2.4 m projection and 5.35 m clearance; existing facade access strip stays free.
    const awningFront=26.2,awningBack=v.z0+.1;
    w.roof.quad([v.x0,2.28,awningFront],[v.x1,2.28,awningFront],[v.x1,2.55,awningBack],[v.x0,2.55,awningBack],.70,'xz');
    w.metal.prism(v.x0,2.08,awningFront,v.x1,2.28,awningFront+.1,.82);
    for(let i=0;i<=v.bays;i++){
      const x=v.x0+Math.max(.2,Math.min(v.x1-v.x0-.2,i*(v.x1-v.x0)/v.bays));
      w.metal.prism(x-.055,-3,v.z0+.06,x+.055,2.53,v.z0+.17,.76);
      if(lod<2){
        w.metal.quad([x-.04,1.25,v.z0+.1],[x-.04,2.24,26.38],[x+.04,2.24,26.38],[x+.04,1.25,v.z0+.1],.80,'zy');
        w.metal.prism(x-.045,2.25,26.35,x+.045,2.34,v.z0+.1,.78);
      }
    }
    // Grounded, nearly flush platform paving, no new raised platform or gameplay collider.
    w.stone.prism(v.x0,-2.995,26.12,v.x1,-2.965,v.z0,.86);
    if(lod===0)for(let x=v.x0+.7;x<v.x1;x+=1.35)w.interior.quad([x,-2.962,26.12],[x+.014,-2.962,26.12],[x+.014,-2.962,v.z0],[x,-2.962,v.z0],.71,'xz');
    // Keep the central pavilion's architectural emphasis in all presets.
    if(v.id==='central_pavilion'){
      w.brick.prism(mid-3.2,7.7,v.z0-.09,mid+3.2,11.65,v.z0+.13,.93);
      const lunette={x:mid,width:2.8,bottom:8.3,spring:9.35,rise:.9};
      polygon(w.glass,arch(lunette,segments),[],v.z0-.115,true,.64);
      ring(w.stone,arch(lunette,segments,.16),arch(lunette,segments),v.z0-.16,v.z0-.10,.93);
    }
  }
  const geometries=Object.fromEntries(Object.entries(w).filter(([,v])=>v.p.length).map(([k,v])=>[k,v.geometry()]));
  return {geometries,openings,triangles:Object.values(geometries).reduce((n,g)=>n+g.attributes.position.count/3,0)};
}

// Two original metre-calibrated maps per surface: colour + roughness/height.
// DataTexture also works headlessly and never relies on external optional assets.
function maps(kind,size=128){
  const albedo=new Uint8Array(size*size*4),detail=new Uint8Array(size*size*4);
  const base={brick:[187,151,109],stone:[186,178,148],roof:[88,84,74],wood:[122,99,67],metal:[80,88,84]}[kind];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const row=Math.floor(y/size*(kind==='roof'?8:12)),col=Math.floor(x/size*4+(row%2)*.5),u=(x/size*4+(row%2)*.5)%1,v=y/size*(kind==='roof'?8:12)%1;
    const mortar=kind==='brick'&&(u<.038||v<.075),n=(hash(col,row,12)-.5)*28+(hash(x,y,21)-.5)*9;
    let c=base.map(v=>v+n),height=158,rough=kind==='metal'?135:225;
    if(mortar){c=[150+n*.25,138+n*.25,111+n*.25];height=62;rough=244;}
    if(kind==='roof'){const edge=v<.12||u<.03;c=c.map(c=>c*(edge?.65:1));height=edge?83:170;rough=193+Math.floor(hash(col,row)*38);}
    if(kind==='wood'){const grain=Math.sin(x*.63+Math.sin(y*.02)*1.8)*8,plank=x%32<2?.63:1;c=c.map(v=>(v+grain)*plank);height=142+grain;rough=204;}
    if(kind==='stone'){height=115+hash(x,y,4)*70;rough=218+hash(x,y)*25;}
    if(kind==='metal'){height=128;rough=142+hash(x,y)*60;}
    const i=(y*size+x)*4;for(let k=0;k<3;k++){albedo[i+k]=Math.max(0,Math.min(255,c[k]));detail[i+k]=k===1?rough:height;}albedo[i+3]=detail[i+3]=255;
  }
  const color=new THREE.DataTexture(albedo,size,size),roughness=new THREE.DataTexture(detail,size,size);
  color.colorSpace=THREE.SRGBColorSpace;
  for(const map of [color,roughness]){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1/1.08,1/1.08);map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=4;map.needsUpdate=true;}
  return {color,roughness};
}
export class M01StationArchitecture{
  constructor(parent,world){
    const collider=world.buildings.find(b=>b.id==='station');
    if(!collider)throw Error('Station envelope missing');
    if(JSON.stringify([collider.min.x,collider.min.y,collider.min.z,collider.max.x,collider.max.y,collider.max.z])!==JSON.stringify([-460,-3,28,-338,11,55]))throw Error('Station envelope differs from approved anchors');
    this.anchor={min:{...collider.min},max:{...collider.max}};this.group=new THREE.Group();this.group.name='m01_station_architecture';this.levels=[];this.materials={};this.maps=[];this.disposed=false;this.ready=false;
    try{
      for(const kind of ['brick','stone','roof','wood','metal']){
        const {color,roughness}=maps(kind);this.maps.push(color,roughness);
        this.materials[kind]=new THREE.MeshStandardMaterial({map:color,roughnessMap:roughness,bumpMap:roughness,bumpScale:kind==='brick'?.022:.009,roughness:1,metalness:kind==='metal'?.55:0,vertexColors:true,side:THREE.DoubleSide});
      }
      this.materials.interior=new THREE.MeshStandardMaterial({color:'#30332c',roughness:1,vertexColors:true,side:THREE.DoubleSide});
      this.materials.glass=new THREE.MeshStandardMaterial({color:'#394943',roughness:.36,metalness:.24,vertexColors:true,side:THREE.DoubleSide});
      for(let lod=0;lod<3;lod++){
        const data=buildStationMeshes(lod),group=new THREE.Group();group.name=`station_lod${lod}`;
        for(const [kind,geometry]of Object.entries(data.geometries)){
          const mesh=new THREE.Mesh(geometry,this.materials[kind]);mesh.name=`station_${kind}_lod${lod}`;mesh.castShadow=kind!=='glass'&&kind!=='interior';mesh.receiveShadow=true;group.add(mesh);
        }
        group.visible=lod===1;this.group.add(group);this.levels.push({group,...data});
      }
      this.lod=1;this.quality='medium';this.ready=true;parent.add(this.group);
    }catch(error){this.dispose();throw error;}
  }
  sync(player,quality='medium'){
    if(this.disposed)return;
    // Distance to facade/footprint, rather than centre, retains detail at the annexes.
    const dx=Math.max(-460-(player?.x??0),0,(player?.x??0)+338),dz=Math.max(28-(player?.z??0),0,(player?.z??0)-55);
    this.lod=stationLod(Math.hypot(dx,dz),quality);this.quality=quality;
    this.levels.forEach((l,i)=>{l.group.visible=i===this.lod;for(const mesh of l.group.children)mesh.castShadow=quality!=='low'&&!['interior','glass'].some(k=>mesh.name.includes(k));});
    for(const kind of ['brick','stone','roof','wood','metal'])this.materials[kind].bumpScale=quality==='low'?0:kind==='brick'?.022:.009;
  }
  get diagnostics(){
    return {ready:this.ready,quality:this.quality,lod:this.lod,anchor:this.anchor,envelope:STATION_ENVELOPE,volumes:STATION_VOLUMES.length,
      openings:this.levels[this.lod]?.openings??0,triangles:this.levels[this.lod]?.triangles??0,trianglesByLod:this.levels.map(l=>l.triangles),
      drawCalls:this.levels[this.lod]?.group.children.length??0,geometries:this.levels.reduce((n,l)=>n+l.group.children.length,0),textures:this.maps.length,instances:0,
      source:'original-mesh-no-external-asset-dependency',collidersAdded:0,disposed:this.disposed};
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;this.ready=false;this.group.removeFromParent();
    for(const l of this.levels)for(const mesh of l.group.children)mesh.geometry.dispose();
    Object.values(this.materials).forEach(m=>m.dispose());this.maps.forEach(m=>m.dispose());this.group.clear();
  }
}
