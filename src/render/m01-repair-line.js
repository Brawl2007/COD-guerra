// M01 sapper operation, presentation (R3-a, 2026-10-24): the cable the sappers work on, lying on the south slope of the rail embankment along the drawn route (mission.json
// grp_sappers.operation.cable, a stylised version of the RECONSTRUCTED ignition_line that passes through the places they work), the three cuts in it (the crater of the 04:34 bomb, the cut where
// the crate is delivered, the second cut 16 m to the west), the splice that closes each one, the crate they work from (open, on the ground at the cut they work at, on the helper's shoulder while
// they walk; that one is drawn by the characters) and a coil of spare cable. Original procedural shapes (a low-poly tube along the sampled route, boxes and cylinders), no file and no asset:
// the game shows no connections, charges or procedures (HISTORICAL_RESEARCH.md §79). The simulation decides which cut is open (sim.sapperOps.gaps) and where the box is; this only draws it.
// The tube is rebuilt only when a cut changes state (three times in a mission); nothing here is saved or decides anything, and a paused frame is a pure function of the same state.
import * as THREE from 'three';
import {SAPPERS} from '../game/m01-sappers.js';

const STEP=1.4,RADIUS=.016,SIDES=5,LIFT=.012;
const COLORS={cable:'#23211d',sleeve:'#b7a98a',tape:'#e4dfcc',copper:'#b87333',wood:'#7d5d38',white:'#e7e2cf',coil:'#2b2925',steel:'#6b6e70',cloth:'#5c5a45'};
const smooth=(a,b,u)=>a+(b-a)*u;

/** The route sampled every ~STEP metres: [{x,z,s}] with s the arc length from the first point, and its total length. Pure; tests use it. */
export function cableSamples(cable=SAPPERS.cable,step=STEP){
  const pts=[],total=cable.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-cable[i][0],p[1]-cable[i][1]),0);
  let s=0;
  for(let i=1;i<cable.length;i++){
    const [x0,z0]=cable[i-1],[x1,z1]=cable[i],len=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(len/step));
    for(let k=0;k<n;k++){pts.push({x:smooth(x0,x1,k/n),z:smooth(z0,z1,k/n),s:s+len*k/n});}
    s+=len;
  }
  pts.push({x:cable.at(-1)[0],z:cable.at(-1)[1],s:total});
  return {pts,total};
}
/** The arc length of the point of the route nearest to (x, z). */
export function arcOf(samples,x,z){let best=0,bd=Infinity;for(const p of samples.pts){const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best=p.s;}}return best;}

export class M01RepairLine {
  constructor(parent){
    this.group=new THREE.Group();this.group.name='m01_repair_line';parent.add(this.group);
    this.samples=cableSamples();this.key=null;this.revision=0;
    this.arc={crater:arcOf(this.samples,SAPPERS.points.crater.x,SAPPERS.points.crater.z),fault:arcOf(this.samples,SAPPERS.points.fault.x,SAPPERS.points.fault.z),second:arcOf(this.samples,SAPPERS.points.second.x,SAPPERS.points.second.z)};
    this.material={cable:new THREE.MeshStandardMaterial({color:COLORS.cable,roughness:.85}),sleeve:new THREE.MeshStandardMaterial({color:COLORS.sleeve,roughness:.8}),
      tape:new THREE.MeshStandardMaterial({color:COLORS.tape,roughness:.9}),copper:new THREE.MeshStandardMaterial({color:COLORS.copper,roughness:.5,metalness:.7}),
      wood:new THREE.MeshStandardMaterial({color:COLORS.wood,roughness:.95}),white:new THREE.MeshStandardMaterial({color:COLORS.white,roughness:.9}),
      coil:new THREE.MeshStandardMaterial({color:COLORS.coil,roughness:.9}),steel:new THREE.MeshStandardMaterial({color:COLORS.steel,roughness:.45,metalness:.6}),
      cloth:new THREE.MeshStandardMaterial({color:COLORS.cloth,roughness:1})};
    this.geometry={sleeve:new THREE.CylinderGeometry(.026,.026,.24,8),tape:new THREE.CylinderGeometry(.029,.029,.03,8),end:new THREE.CylinderGeometry(.006,.016,.07,6),
      crate:new THREE.BoxGeometry(.44,.22,.27),stripe:new THREE.BoxGeometry(.45,.04,.005),lid:new THREE.BoxGeometry(.44,.02,.27),coil:new THREE.TorusGeometry(.13,.015,6,18),
      tool:new THREE.BoxGeometry(.03,.012,.17),tin:new THREE.BoxGeometry(.11,.05,.08),cloth:new THREE.PlaneGeometry(.75,.5)};
    this.cable=null;this.dynamic=new THREE.Group();this.group.add(this.dynamic);
    this.crate=this.buildCrate();this.group.add(this.crate);this.crate.visible=false;
    this.coil=new THREE.Mesh(this.geometry.coil,this.material.coil);this.coil.rotation.x=-Math.PI/2;this.coil.visible=false;this.group.add(this.coil);
    this.tools=this.buildTools();this.group.add(this.tools);this.tools.visible=false;
  }
  buildCrate(){
    const g=new THREE.Group(),body=new THREE.Mesh(this.geometry.crate,this.material.wood),stripe=new THREE.Mesh(this.geometry.stripe,this.material.white),lid=new THREE.Mesh(this.geometry.lid,this.material.wood);
    body.position.y=.11;stripe.position.set(0,.11,.1375);lid.position.set(0,.25,-.2);lid.rotation.x=-Math.PI*.52;   // the lid stands open at the back
    g.add(body,stripe,lid);g.name='sapper_crate_ground';return g;
  }
  buildTools(){
    const g=new THREE.Group(),cloth=new THREE.Mesh(this.geometry.cloth,this.material.cloth),p1=new THREE.Mesh(this.geometry.tool,this.material.steel),p2=new THREE.Mesh(this.geometry.tool,this.material.steel),tin=new THREE.Mesh(this.geometry.tin,this.material.cloth);
    cloth.rotation.x=-Math.PI/2;cloth.position.y=.004;p1.position.set(-.18,.014,.04);p1.rotation.y=.35;p2.position.set(-.1,.014,.08);p2.rotation.y=-.25;tin.position.set(.16,.03,.0);
    g.add(cloth,p1,p2,tin);g.name='sapper_tools_ground';return g;
  }
  /** Rebuilds the cable tube: sampled along the route, lifted on the ground, without the interval of every cut that is open (ends frayed), with a splice sleeve where a cut is closed. */
  buildCable(world,gaps){
    for(const c of [...this.dynamic.children])this.dynamic.remove(c);
    if(this.cable){this.cable.geometry.dispose();this.cable=null;}
    const {pts}=this.samples,open=[];
    const cuts=[['crater',this.arc.crater,SAPPERS.points.crater.gapM],['fault',this.arc.fault,SAPPERS.points.fault.gapM],['second',this.arc.second,SAPPERS.points.second.gapM]];
    const state=name=>gaps?.[name]??'none';
    for(const [name,s,gap] of cuts)if(state(name)==='open')open.push({name,s0:s-gap/2,s1:s+gap/2});
    // The tube: the route outside every open gap, in pieces that end exactly at the edge of the gap, as quads round a 5-sided ring (the gap ends get their own frayed stubs).
    const pos=[],idx=[],at=(p)=>({x:p.x,y:world.terrainHeightAt(p.x,p.z)+RADIUS+LIFT,z:p.z});
    const ring=(c,d)=>{const nx=-d.z,nz=d.x,out=[];for(let k=0;k<SIDES;k++){const a=k/SIDES*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);out.push([c.x+nx*ca*RADIUS,c.y+sa*RADIUS,c.z+nz*ca*RADIUS]);}return out;};
    const emit=(a,b)=>{
      const ca=at(a),cb=at(b),d={x:b.x-a.x,z:b.z-a.z},len=Math.hypot(d.x,d.z)||1;d.x/=len;d.z/=len;
      const ra=ring(ca,d),rb=ring(cb,d),o=pos.length/3;
      for(const r of [...ra,...rb])pos.push(...r);
      for(let k=0;k<SIDES;k++){const n=(k+1)%SIDES;idx.push(o+k,o+n,o+SIDES+k,o+n,o+SIDES+n,o+SIDES+k);}
    };
    const total=this.samples.total,spans=[];let from=0;
    for(const g of [...open].sort((a,b)=>a.s0-b.s0)){if(g.s0>from)spans.push([from,g.s0]);from=Math.max(from,g.s1);}
    if(from<total)spans.push([from,total]);
    for(const [sa,sb] of spans){
      const n=Math.max(1,Math.ceil((sb-sa)/STEP));let prev=this.sampleAt(sa);
      for(let k=1;k<=n;k++){const cur=this.sampleAt(sa+(sb-sa)*k/n);emit(prev,cur);prev=cur;}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
    this.cable=new THREE.Mesh(geo,this.material.cable);this.cable.name='m01_cable';this.cable.frustumCulled=false;this.cable.receiveShadow=true;this.dynamic.add(this.cable);
    // Frayed ends of an open cut: two short stubs lifted off the ground, copper tips toward the gap. A closed cut: a sleeve and a ring of tape over the joint.
    const cut=(name,s,gap)=>{
      const st=state(name);if(st==='none')return;
      const centre=this.sampleAt(s),c=at(centre),ang=Math.atan2(this.sampleAt(s+.5).z-this.sampleAt(s-.5).z,this.sampleAt(s+.5).x-this.sampleAt(s-.5).x);
      if(st==='closed'){
        const sleeve=new THREE.Mesh(this.geometry.sleeve,this.material.sleeve);sleeve.position.set(c.x,c.y+.012,c.z);sleeve.rotation.set(0,-ang,Math.PI/2);
        const t1=new THREE.Mesh(this.geometry.tape,this.material.tape),t2=t1.clone();
        for(const [t,k] of [[t1,-.09],[t2,.09]]){t.position.set(c.x+Math.cos(ang)*k,c.y+.012,c.z+Math.sin(ang)*k);t.rotation.set(0,-ang,Math.PI/2);}
        this.dynamic.add(sleeve,t1,t2);return;
      }
      for(const side of [-1,1]){
        const p=this.sampleAt(s+side*gap/2),e=at(p),stub=new THREE.Mesh(this.geometry.end,this.material.copper);
        stub.position.set(e.x-Math.cos(ang)*side*.01,e.y+.018,e.z-Math.sin(ang)*side*.01);stub.rotation.set(0,-ang,side*(Math.PI/2)-side*.35);
        this.dynamic.add(stub);
      }
    };
    for(const [name,s,gap] of cuts)cut(name,s,gap);
    this.revision++;
  }
  sampleAt(s){
    const {pts}=this.samples;let i=1;while(i<pts.length-1&&pts[i].s<s)i++;
    const a=pts[i-1],b=pts[i],u=b.s>a.s?Math.max(0,Math.min(1,(s-a.s)/(b.s-a.s))):0;
    return {x:smooth(a.x,b.x,u),z:smooth(a.z,b.z,u),s};
  }
  /** `ops` is sim.sapperOps (null: nothing is drawn); `world` gives the ground height. */
  sync(ops,world){
    if(!ops||!world){this.group.visible=false;return;}
    this.group.visible=true;
    const key=`${ops.gaps.crater}|${ops.gaps.fault}|${ops.gaps.second}`;
    if(key!==this.key||!this.cable){this.buildCable(world,ops.gaps);this.key=key;}
    // The crate and the tools on the ground: at the cut they work at, from the delivery until the helper lifts the crate for the walk; the other cut gets them when the walk ends.
    const ground=ops.box.state==='ground',p=ground?SAPPERS.points[ops.box.point]:null;
    this.crate.visible=this.tools.visible=this.coil.visible=Boolean(ground);
    if(ground){
      const slot=p.slots[SAPPERS.helper],y=world.terrainHeightAt(p.x,p.z+1.3);
      // On the player's side of the cable, beside the helper's place (he reaches it), the open lid toward the cut.
      this.crate.position.set(slot.x-.55,y,p.z+1.25);this.crate.rotation.y=.12;
      this.tools.position.set(slot.x+.55,world.terrainHeightAt(slot.x+.55,p.z+1.0),p.z+1.0);this.tools.rotation.y=-.2;
      this.coil.position.set(slot.x-1.5,world.terrainHeightAt(slot.x-1.5,p.z+1.1)+.03,p.z+1.1);
    }
  }
  get diagnostics(){return {revision:this.revision,key:this.key,visible:this.group.visible,crate:this.crate.visible};}
  dispose(){
    this.group.removeFromParent();
    if(this.cable)this.cable.geometry.dispose();
    for(const o of [...Object.values(this.geometry),...Object.values(this.material)])o.dispose();
  }
}
