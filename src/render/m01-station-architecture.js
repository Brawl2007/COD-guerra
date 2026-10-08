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
      const dirt=v[1]<-.9?.84:.98;
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
function ring(writer,outer,inner,z,back,tint=1,reverse=false){
  const face=(a,b,c,d,t)=>writer.quad(...(reverse?[d,c,b,a]:[a,b,c,d]),t);
  for(let i=0;i<inner.length;i++){
    const j=(i+1)%inner.length,a=outer[i],b=outer[j],c=inner[j],d=inner[i];
    face([a.x,a.y,z],[b.x,b.y,z],[c.x,c.y,z],[d.x,d.y,z],tint);
    if(back!==z)face([d.x,d.y,z],[c.x,c.y,z],[c.x,c.y,back],[d.x,d.y,back],tint*.82);
  }
}
// Repeated construction rhythm is retained; finishes vary by location, not loop index.
// Painted joinery, radial joints and folded metal are estimated finishes, not surveyed details.
function finishOpening(w,o,z,sign,lod,segments,reverse){
  const back=z+sign*(o.depth??.95),face=back-sign*.10;
  const tone=.78+hash(o.x,z,57)*.19,paint=.72+hash(o.x,z,61)*.26;
  const outer=arch({...o,width:o.width-.12,bottom:o.bottom+.035,rise:o.rise-.035},segments);
  const middle=arch({...o,width:o.width-.24,bottom:o.bottom+.095,rise:o.rise-.09},segments);
  const inner=arch({...o,width:o.width-.32,bottom:o.bottom+.14,rise:o.rise-.13},segments);
  ring(w.wood,outer,lod===0?middle:inner,face,face,paint,reverse);
  if(lod===0)ring(w.wood,middle,inner,face+sign*.025,face+sign*.025,paint*.85,reverse);
  const glassZ=face+sign*.06;
  if(o.door){
    polygon(w.wood,inner,[],glassZ,reverse,paint*.78);
    if(lod<2){
      // Rebated panels are a closed door finish, not new openings.
      for(const y of [o.bottom+.30,o.bottom+1.62]){
        const top=Math.min(y+1.06,o.spring-.12);
        if(top<=y)continue;
        for(const dx of [-.43,.43]){
          const a=[[o.x+dx-.31,y],[o.x+dx+.31,y],[o.x+dx+.31,top],[o.x+dx-.31,top]].map(([x,y])=>new THREE.Vector2(x,y));
          const b=a.map(v=>new THREE.Vector2(v.x+(v.x<o.x+dx?.04:-.04),v.y+(v.y<(y+top)/2?.04:-.04)));
          ring(w.wood,a,b,glassZ-sign*.022,glassZ-sign*.022,paint*.91,reverse);
        }
      }
    }
    if(lod===0)w.metal.prism(o.x+.17,-1.43,Math.min(face-sign*.06,face-sign*.025),o.x+.21,-1.18,Math.max(face-sign*.06,face-sign*.025),.86);
  }else{
    // Four panes carry independent, muted values: no repeated random bright windows.
    const l=o.x-o.width/2+.16,r=o.x+o.width/2-.16,b=o.bottom+.14,t=o.spring;
    const transom=b+(t-b)*(.58+hash(o.x,z,62)*.08);
    for(const [a,c]of [[l,o.x],[o.x,r]])for(const [y0,y1]of [[b,transom],[transom,t]]){
      const pane=[[a,y0],[c,y0],[c,y1],[a,y1]].map(([x,y])=>new THREE.Vector2(x,y));
      const variation=tone*(.86+hash(a,y0,63)*.21);
      polygon(w.glass,pane,[],glassZ,reverse,variation);
    }
    // The arched fanlight sits above the transom without changing the aperture.
    polygon(w.glass,inner.slice(2),[],glassZ,reverse,tone*.93);
    const bar=(x0,y0,x1,y1)=>{
      const a=[x0,y0,face],b=[x1,y0,face],c=[x1,y1,face],d=[x0,y1,face];
      w.wood.quad(...(reverse?[d,c,b,a]:[a,b,c,d]),paint*.94);
      if(lod===0)w.wood.quad([x0,y0,face],[x0,y1,face],[x0,y1,glassZ],[x0,y0,glassZ],paint*.74);
    };
    bar(o.x-.025,b,o.x+.025,t+o.rise-.13);
    if(lod<2)bar(l,transom-.028,r,transom+.028);
  }
  // Bevelled sill with a drip edge; maximum projection/depth remains the V2 envelope.
  const l=o.x-o.width/2-.1,r=o.x+o.width/2+.1,y=Math.max(-3,o.bottom-.16),top=o.bottom-.04;
  const front=z-sign*.16,rear=z+sign*.18,edge=z-sign*.13;
  const a=[l,y,front],b=[r,y,front],c=[r,Math.max(y+.002,top-.035),front],d=[l,Math.max(y+.002,top-.035),front],e=[l,top,edge],f=[r,top,edge],g=[r,top,rear],h=[l,top,rear];
  const q=(a,b,c,d,t)=>w.stone.quad(...(reverse?[d,c,b,a]:[a,b,c,d]),t);
  q(a,b,c,d,.86);q(d,c,f,e,.98);q(e,f,g,h,1.02);q(h,g,[r,y,rear],[l,y,rear],.85);
  q(a,d,e,[l,y,rear],.85);q(b,[r,y,rear],g,f,.85);
  if(lod<2){
    // Short radial mortar joints, confined to the existing masonry arch ring.
    for(let i=1;i<segments;i+=2){
      const angle=i*Math.PI/segments,da=.006;
      const point=(a,expand)=>[o.x+Math.cos(a)*(o.width/2+expand),o.spring+Math.sin(a)*(o.rise+expand),z-sign*.047];
      q(point(angle-da,0),point(angle+da,0),point(angle+da,.18),point(angle-da,.18),.67);
    }
  }
}
function strip(writer,a,b,width,tint=.9){
  const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz),nx=-dz/len*width,nz=dx/len*width;
  writer.quad([a[0]+nx,a[1]+.025,a[2]+nz],[b[0]+nx,b[1]+.025,b[2]+nz],[b[0]-nx,b[1]+.025,b[2]-nz],[a[0]-nx,a[1]+.025,a[2]-nz],tint,'xz');
}
function gutter(writer,x0,x1,y,z,side,lod){
  // Open folded trough, sharing the station metal batch. Coarse LOD keeps its silhouette.
  const profile=lod===2?[[-.065,.045],[0,-.045],[.065,.045]]:[[-.065,.055],[-.085,.012],[-.055,-.055],[.055,-.055],[.085,.012],[.065,.055]];
  for(let i=0;i<profile.length-1;i++){
    const a=profile[i],b=profile[i+1];
    writer.quad([x0,y+a[1],z+a[0]],[x1,y+a[1],z+a[0]],[x1,y+b[1],z+b[0]],[x0,y+b[1],z+b[0]],.86,'xy');
  }
  if(lod<2)for(const x of [x0+.38,x1-.38])writer.prism(x-.045,-2.8,z+side*.025,x+.045,y,z+side*.025+.07,.83);
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
        ring(w.brick,arch(o,segments,.18),hole,z-sign*.045,z+sign*.08,.94,side==='front');
        finishOpening(w,o,z,sign,lod,segments,side==='front');
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
      if(x!==-460&&x!==-338){const p=[[x,-3,v.z0],[x,-3,v.z1],[x,v.eave,v.z1],[x,v.eave,v.z0]];w.brick.quad(...(x===v.x1?p.reverse():p),.93,'zy');continue;}
      const sign=x===-460?1:-1,swap=writer=>({
        triangle:(a,b,c,tint=1)=>writer.triangle([a[2],a[1],a[0]],[b[2],b[1],b[0]],[c[2],c[1],c[0]],tint,'zy'),
        quad:(a,b,c,d,tint=1)=>writer.quad([a[2],a[1],a[0]],[b[2],b[1],b[0]],[c[2],c[1],c[0]],[d[2],d[1],d[0]],tint,'zy')
      });
      const contour=[[v.z0,-3],[v.z1,-3],[v.z1,v.eave],[v.z0,v.eave]].map(([x,y])=>new THREE.Vector2(x,y));
      const windows=Array.from({length:12},(_,i)=>({x:v.z0+(i%6+.5)*(v.z1-v.z0)/6,width:1.75,bottom:i<6?-1.8:3.6,spring:i<6?.55:6.15,rise:.42})),holes=windows.map(o=>arch(o,segments));
      polygon(swap(w.brick),contour,holes,x,sign!==1);openings+=windows.length;
      for(const [i,o]of windows.entries()){
        const hole=holes[i],back=x+sign*.95;
        for(let k=0;k<hole.length;k++){const a=hole[k],b=hole[(k+1)%hole.length];swap(w.stone).quad([a.x,a.y,x],[b.x,b.y,x],[b.x,b.y,back],[a.x,a.y,back],.64);}
        ring(swap(w.brick),arch(o,segments,.18),hole,x-sign*.045,x+sign*.08,.94,sign!==1);
        // Reuse identical profiled joinery for the end elevations (axis swap flips winding).
        const transformed=Object.fromEntries(Object.entries(w).map(([k,writer])=>[k,{...swap(writer),prism:(x0,y0,z0,x1,y1,z1,t)=>writer.prism(Math.min(z0,z1),y0,x0,Math.max(z0,z1),y1,x1,t)}]));
        finishOpening(transformed,o,x,sign,lod,segments,sign!==1);
      }
    }
    const x0=v.x0-.12,x1=v.x1+.12,z0=v.z0-.22,z1=v.z1,rz=(z0+z1)/2,hip=Math.min(4.5,(x1-x0)*.26);
    const a=[x0,v.eave,z0],b=[x1,v.eave,z0],c=[x1,v.eave,z1],d=[x0,v.eave,z1],r0=[x0+hip,v.ridge,rz],r1=[x1-hip,v.ridge,rz];
    w.roof.quad(a,r0,r1,b,.96,'xz');w.roof.quad(d,c,r1,r0,.88,'xz');w.roof.triangle(a,d,r0,.91,'xz');w.roof.triangle(b,r1,c,.94,'xz');
    // Folded ridge cap clears the roof plane, rather than intersecting it.
    const cap=[[-.10,v.ridge+.008],[0,v.ridge+.06],[.10,v.ridge+.008]];
    for(let i=0;i<2;i++)w.metal.quad([x0+hip,cap[i+1][1],rz+cap[i+1][0]],[x1-hip,cap[i+1][1],rz+cap[i+1][0]],[x1-hip,cap[i][1],rz+cap[i][0]],[x0+hip,cap[i][1],rz+cap[i][0]],.96,'xz');
    if(lod<2)for(const [start,end]of [[a,r0],[d,r0],[b,r1],[c,r1]])strip(w.metal,start,end,.035,.94);
    for(const [z,side]of [[z0,1],[z1-.1,-1]])gutter(w.metal,x0,x1,v.eave-.08,z,side,lod);
    const cx=mid,cz=rz+4.15,roofY=v.ridge-(v.ridge-v.eave)*(cz-rz)/(z1-rz),head=v.ridge+.6;
    w.brick.prism(cx-.32,roofY-.10,cz-.35,cx+.32,head-.20,cz+.35,.89);
    if(lod<2){
      w.brick.prism(cx-.35,head-.20,cz-.38,cx+.35,head-.08,cz+.38,.98);
      w.brick.prism(cx-.38,head-.08,cz-.41,cx+.38,head,cz+.41,.94);
      // Flashing conforms to the slope at the foot; its contact is geometric.
      const corners=[[cx-.40,cz-.43],[cx+.40,cz-.43],[cx+.40,cz+.43],[cx-.40,cz+.43]];
      w.metal.quad(...corners.reverse().map(([x,z])=>[x,v.ridge-(v.ridge-v.eave)*(z-rz)/(z1-rz)+.04,z]),.83,'xz');
    }
    // Four cap strips leave a real dark flue rather than a solid flat lid.
    for(const [ax,bx,az,bz]of [[-.4,.4,-.43,-.22],[-.4,.4,.22,.43],[-.4,-.21,-.22,.22],[.21,.4,-.22,.22]])w.stone.prism(cx+ax,head,cz+az,cx+bx,head+.13,cz+bz,.93);
    w.interior.quad([cx-.21,head-.09,cz-.22],[cx-.21,head-.09,cz+.22],[cx+.21,head-.09,cz+.22],[cx+.21,head-.09,cz-.22],.30,'xz');
    // Platform awning: supported from the wall, all feet inside the existing solid envelope.
    // 2.4 m projection and 5.35 m clearance; existing facade access strip stays free.
    const awningFront=26.2,awningBack=v.z0+.1;
    w.roof.quad([v.x0,2.55,awningBack],[v.x1,2.55,awningBack],[v.x1,2.28,awningFront],[v.x0,2.28,awningFront],.70,'xz');
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
      ring(w.stone,arch(lunette,segments,.16),arch(lunette,segments),v.z0-.16,v.z0-.10,.93,true);
    }
  }
  const geometries=Object.fromEntries(Object.entries(w).filter(([,v])=>v.p.length).map(([k,v])=>[k,v.geometry()]));
  return {geometries,openings,triangles:Object.values(geometries).reduce((n,g)=>n+g.attributes.position.count/3,0)};
}

// Two original metre-calibrated maps per surface: colour + roughness/height.
// DataTexture also works headlessly and never relies on external optional assets.
const clampByte=v=>Math.max(0,Math.min(255,Math.round(v)));
const smooth=t=>t*t*(3-2*t);
function tileNoise(x,y,cells,seed){
  const gx=x*cells,gy=y*cells,ix=Math.floor(gx),iy=Math.floor(gy),u=smooth(gx-ix),v=smooth(gy-iy);
  const sample=(a,b)=>hash((a+cells)%cells,(b+cells)%cells,seed);
  return (sample(ix,iy)*(1-u)+sample(ix+1,iy)*u)*(1-v)+(sample(ix,iy+1)*(1-u)+sample(ix+1,iy+1)*u)*v;
}
function maps(kind,size=128){
  const albedo=new Uint8Array(size*size*4),detail=new Uint8Array(size*size*4);
  const base={brick:[177,142,104],stone:[171,167,147],roof:[113,115,110],wood:[90,92,78],metal:[102,109,109]}[kind];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const sx=x/size,sy=y/size,cloud=tileNoise(sx,sy,5,12),grain=hash(x,y,21)-.5;
    let c=base.map(v=>v+(cloud-.5)*24+grain*7),height=150,rough=224;
    if(kind==='brick'){
      const row=Math.floor(sy*12),gx=sx*4+(row%2)*.5,col=Math.floor(gx),u=gx-col,v=sy*12-row;
      const brick=hash(col%4,row,43),wear=tileNoise(sx,sy,15,45);
      const mortar=.028+(wear-.5)*.016,edge=Math.min(u,1-u),bed=Math.min(v,1-v);
      const joint=edge<mortar||bed<.040+(wear-.5)*.024;
      const bevel=Math.max(0,1-Math.min(edge/.060,bed/.10));
      if(joint){c=[145,137,117].map(v=>v+(cloud-.5)*13+grain*7);height=65+grain*10;rough=246;}
      else{
        const tone=(brick-.5)*26+(wear-.5)*17;
        c=base.map((v,k)=>v+tone+[5,-1,-4][k]*(brick-.5)+grain*10-bevel*7);
        height=169-bevel*42+(wear-.5)*19+grain*10;rough=210+wear*28+grain*8;
      }
    }else if(kind==='roof'){
      const row=Math.floor(sy*12),gx=sx*6+(row%2)*.5,col=Math.floor(gx),u=gx-col,v=sy*12-row;
      const tile=hash(col%6,row,49),lap=v<.09,edge=u<.023;
      const tone=(tile-.5)*24+(cloud-.5)*27,stain=tileNoise(sx,sy,13,51);
      c=base.map((b,k)=>(b+tone+grain*10+(stain-.5)*[12,8,5][k])*(lap?.70:edge?.86:1));
      height=lap?90:edge?132:167+v*16+grain*9;rough=180+stain*53+grain*8;
    }else if(kind==='wood'){
      const grainLine=Math.sin(x*.69+Math.sin(sy*Math.PI*2)*2.8)*5,split=x%32<1;
      const exposed=tileNoise(sx,sy,10,53)>.66;
      c=(exposed?[119,107,86]:base).map(v=>(v+(cloud-.5)*19+grainLine+grain*7)*(split?.70:1));
      height=split?93:147+grainLine+grain*6;rough=exposed?232:178+cloud*37;
    }else if(kind==='stone'){
      const pore=hash(x,y,55)>.955;
      c=c.map(v=>v-(pore?19:0));height=139+cloud*26+grain*17-(pore?28:0);rough=218+cloud*26;
    }else if(kind==='metal'){
      const rust=tileNoise(sx,sy,12,59)>.64;
      c=(rust?[113,81,56]:base).map(v=>v+(cloud-.5)*21+grain*7);height=rust?149+grain*7:128+grain*3;rough=rust?237:134+cloud*44;
    }
    const i=(y*size+x)*4;for(let k=0;k<3;k++){albedo[i+k]=clampByte(c[k]);detail[i+k]=clampByte(k===1?rough:height);}albedo[i+3]=detail[i+3]=255;
  }
  const color=new THREE.DataTexture(albedo,size,size),roughness=new THREE.DataTexture(detail,size,size);
  color.colorSpace=THREE.SRGBColorSpace;
  for(const map of [color,roughness]){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.setScalar(1/(kind==='roof'?2.4:1.08));map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=4;map.needsUpdate=true;}
  return {color,roughness};
}
// Two world-metre fields break tiling across volumes without new textures, draw calls,
// mission uniforms or time dependence. All changes are private to Station materials.
function stationFinish(material,kind){
  const strength={brick:.17,stone:.12,roof:.22,wood:.10,metal:.14,glass:.09,interior:0}[kind];
  material.customProgramCacheKey=()=>`m01-station-v3-${kind}`;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStationWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvStationWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vStationWorld;
      float stationHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float stationNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(stationHash(i),stationHash(i+vec2(1.,0.)),f.x),mix(stationHash(i+vec2(0.,1.)),stationHash(i+vec2(1.,1.)),f.x),f.y);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      float broad=stationNoise(vStationWorld.xz*.31+vec2(vStationWorld.y*.24,0.));
      float rain=stationNoise(vec2((vStationWorld.x+vStationWorld.z)*2.8,vStationWorld.y*.11));
      float damp=(1.0-smoothstep(-2.7,.45,vStationWorld.y))*(.45+.55*rain);
      float finish=1.0+(broad-.5)*${strength.toFixed(3)}*2.0-damp*${kind==='roof'?'.03':'.14'};
      diffuseColor.rgb*=vec3(finish,finish*(1.0-damp*.015),finish*(1.0-damp*.025));
    `);
  };
}
export class M01StationArchitecture{
  constructor(parent,world){
    const collider=world.buildings.find(b=>b.id==='station');
    if(!collider)throw Error('Station envelope missing');
    if(JSON.stringify([collider.min.x,collider.min.y,collider.min.z,collider.max.x,collider.max.y,collider.max.z])!==JSON.stringify([-460,-3,28,-338,11,55]))throw Error('Station envelope differs from approved anchors');
    this.anchor={min:{...collider.min},max:{...collider.max}};this.group=new THREE.Group();this.group.name='m01_station_architecture';this.levels=[];this.materials={};this.maps=[];this.disposed=false;this.ready=false;
    try{
      for(const kind of ['brick','stone','roof','wood','metal']){
        const {color,roughness}=maps(kind,['brick','roof'].includes(kind)?256:128);this.maps.push(color,roughness);
        this.materials[kind]=new THREE.MeshStandardMaterial({map:color,roughnessMap:roughness,bumpMap:roughness,bumpScale:kind==='brick'?.018:kind==='roof'?.025:.008,roughness:1,metalness:kind==='metal'?.45:0,vertexColors:true,side:THREE.DoubleSide});
      }
      this.materials.interior=new THREE.MeshStandardMaterial({color:'#30332c',roughness:1,vertexColors:true,side:THREE.DoubleSide});
      this.materials.glass=new THREE.MeshStandardMaterial({color:'#6b7879',roughness:.27,metalness:.30,vertexColors:true,side:THREE.DoubleSide});
      for(const [kind,material]of Object.entries(this.materials))stationFinish(material,kind);
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
    for(const kind of ['brick','stone','roof','wood','metal'])this.materials[kind].bumpScale=quality==='low'?0:kind==='brick'?.018:kind==='roof'?.025:.008;
  }
  get diagnostics(){
    return {ready:this.ready,fidelity:'v3',textureBytes:this.maps.reduce((n,m)=>n+m.image.data.byteLength,0),geometryBytes:this.levels.reduce((n,l)=>n+Object.values(l.geometries).reduce((s,g)=>s+Object.values(g.attributes).reduce((a,v)=>a+v.array.byteLength,0),0),0),quality:this.quality,lod:this.lod,anchor:this.anchor,envelope:STATION_ENVELOPE,volumes:STATION_VOLUMES.length,
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
