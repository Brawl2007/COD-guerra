// M01 sapper operation, presentation (R3-a, 2026-10-24): the cable the sappers work on, lying on the south slope of the rail embankment along the drawn route (mission.json
// grp_sappers.operation.cable, a stylised version of the RECONSTRUCTED ignition_line that passes through the places they work), the three cuts in it (the crater of the 04:34 bomb, the cut where
// the crate is delivered, the second cut 16 m to the west), the splice that closes each one, the crate they work from (open, on the ground at the cut they work at, on the helper's shoulder while
// they walk; that one is drawn by the characters) and a coil of spare cable. Original procedural shapes (a low-poly tube along the sampled route, boxes and cylinders), no file and no asset:
// the game shows no connections, charges or procedures (HISTORICAL_RESEARCH.md §79). The simulation decides which cut is open (sim.sapperOps.gaps) and where the box is; this only draws it.
// The tube is rebuilt only when a cut changes state (four times in a mission: the bomb's cut, the call, the first and the second cut spliced); nothing here is saved or decides anything, and a paused frame is a pure function of the same state.
// Legibility (first captures in the real game, 2026-10-24: a 3 cm black cable and a 44 cm brown crate vanish on the dark slope at the dawn of the mission, from the 8-15 m at which the player covers the
// repair): the cable is a pale, dry khaki 6 cm thick (a stylised stand-in for a heavy field cable), an open cut is marked by two stakes with white rags, the splice sleeve and the crate are pale and bigger, the
// tools lie on a pale cloth. The ground under all of it is the terrain MESH, not the analytic height: the playable ground is a 5 m lattice of terrainHeightAt (m01-terrain-relief.js), whose chords
// stand above the analytic profile where it is concave (the toe of the embankment slope, where the cable lies) and buried the 3 cm cable there in the first captures; M01View passes
// `surfaceY` (the raycast on the submitted triangles, already used to seat the far landscape) and the tests fall back to terrainHeightAt. Each of them has a faint emissive floor (a fraction of its own colour) so that it does not vanish in the shade of the slope at the dawn of the mission; no light source is added.
import * as THREE from 'three';
import {SAPPERS} from '../game/m01-sappers.js';

const STEP=1.4,RADIUS=.03,SIDES=6,LIFT=.01;
/** The marker stakes of an open cut: how far from the edge of the gap along the cable and how far to the player's side (south, +z). */
export const STAKE={along:.45,aside:.4,height:.95};
const COLORS={cable:'#8d8670',sleeve:'#e1d6b2',tape:'#f4efdc',copper:'#c9803d',wood:'#a8844f',white:'#f1ecda',coil:'#8d8670',steel:'#9aa0a4',cloth:'#c0b391',stake:'#bda16c'};
const smooth=(a,b,u)=>a+(b-a)*u;
/** A standard material with an emissive floor of `glow` times its own colour (see the note on legibility above). */
const lit=(color,roughness,glow,extra={})=>new THREE.MeshStandardMaterial({color,roughness,emissive:new THREE.Color(color).multiplyScalar(glow),...extra});

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
  /** `surfaceY(x, z)` is the height of the ground that is drawn (see above); without it the world's terrainHeightAt. */
  constructor(parent,{surfaceY=null}={}){
    this.surfaceY=surfaceY;this.placed=null;
    this.group=new THREE.Group();this.group.name='m01_repair_line';parent.add(this.group);
    this.samples=cableSamples();this.key=null;this.revision=0;
    this.arc={crater:arcOf(this.samples,SAPPERS.points.crater.x,SAPPERS.points.crater.z),fault:arcOf(this.samples,SAPPERS.points.fault.x,SAPPERS.points.fault.z),second:arcOf(this.samples,SAPPERS.points.second.x,SAPPERS.points.second.z)};
    this.material={cable:lit(COLORS.cable,.85,.5),sleeve:lit(COLORS.sleeve,.8,.45),tape:lit(COLORS.tape,.9,.45),copper:new THREE.MeshStandardMaterial({color:COLORS.copper,roughness:.5,metalness:.7,emissive:new THREE.Color(COLORS.copper).multiplyScalar(.25)}),
      wood:lit(COLORS.wood,.95,.4),white:lit(COLORS.white,.9,.5),coil:lit(COLORS.coil,.9,.5),steel:new THREE.MeshStandardMaterial({color:COLORS.steel,roughness:.45,metalness:.6,emissive:new THREE.Color(COLORS.steel).multiplyScalar(.2)}),
      cloth:lit(COLORS.cloth,1,.45),stake:lit(COLORS.stake,.95,.4),rag:lit(COLORS.white,1,.5,{side:THREE.DoubleSide})};
    this.geometry={sleeve:new THREE.CylinderGeometry(.05,.05,.34,8),tape:new THREE.CylinderGeometry(.056,.056,.045,8),end:new THREE.CylinderGeometry(.012,.03,.12,6),
      crate:new THREE.BoxGeometry(.54,.28,.34),stripe:new THREE.BoxGeometry(.55,.06,.005),lid:new THREE.BoxGeometry(.54,.025,.34),coil:new THREE.TorusGeometry(.2,.035,6,18),
      tool:new THREE.BoxGeometry(.05,.018,.26),tin:new THREE.BoxGeometry(.17,.08,.12),cloth:new THREE.PlaneGeometry(1.1,.75),
      stake:new THREE.CylinderGeometry(.014,.024,STAKE.height,6),rag:new THREE.PlaneGeometry(.24,.32)};
    this.cable=null;this.dynamic=new THREE.Group();this.group.add(this.dynamic);
    this.markers=new THREE.Group();this.markers.name='m01_cut_markers';this.group.add(this.markers);   // the stakes with white rags of the cuts that are open (rebuilt with the cable)
    this.crate=this.buildCrate();this.group.add(this.crate);this.crate.visible=false;
    this.coil=new THREE.Mesh(this.geometry.coil,this.material.coil);this.coil.rotation.x=-Math.PI/2;this.coil.visible=false;this.group.add(this.coil);
    this.tools=this.buildTools();this.group.add(this.tools);this.tools.visible=false;
  }
  buildCrate(){
    const g=new THREE.Group(),body=new THREE.Mesh(this.geometry.crate,this.material.wood),stripe=new THREE.Mesh(this.geometry.stripe,this.material.white),lid=new THREE.Mesh(this.geometry.lid,this.material.wood);
    body.position.y=.14;stripe.position.set(0,.14,.1725);lid.position.set(0,.31,-.25);lid.rotation.x=-Math.PI*.52;   // the lid stands open at the back
    g.add(body,stripe,lid);g.name='sapper_crate_ground';return g;
  }
  buildTools(){
    const g=new THREE.Group(),cloth=new THREE.Mesh(this.geometry.cloth,this.material.cloth),p1=new THREE.Mesh(this.geometry.tool,this.material.steel),p2=new THREE.Mesh(this.geometry.tool,this.material.steel),tin=new THREE.Mesh(this.geometry.tin,this.material.cloth);
    cloth.rotation.x=-Math.PI/2;cloth.position.y=.004;p1.position.set(-.28,.02,.06);p1.rotation.y=.35;p2.position.set(-.16,.02,.12);p2.rotation.y=-.25;tin.position.set(.26,.045,.0);
    g.add(cloth,p1,p2,tin);g.name='sapper_tools_ground';return g;
  }
  ground(world){const f=this.surfaceY;return (x,z)=>{const y=f?f(x,z):null;return Number.isFinite(y)?y:world.terrainHeightAt(x,z);};}
  /** The height the tube lies at for each sample of the route, found once (the terrain does not change): the highest of the point and of the two points 1.2 m across the slope, so that a chord of the lattice never covers it.
   *  Finding it costs a raycast on the drawn mesh per point (~400), so the five rebuilds of a mission interpolate this profile instead of casting again. */
  profile(world){
    if(this.ground0?.world===world)return this.ground0.y;
    const height=this.ground(world),y=this.samples.pts.map(p=>Math.max(height(p.x,p.z),height(p.x,p.z-1.2),height(p.x,p.z+1.2)));
    this.ground0={world,y};return y;
  }
  profileY(world,s){
    const y=this.profile(world),{pts}=this.samples;let i=1;while(i<pts.length-1&&pts[i].s<s)i++;
    const a=pts[i-1],b=pts[i],u=b.s>a.s?Math.max(0,Math.min(1,(s-a.s)/(b.s-a.s))):0;
    return smooth(y[i-1],y[i],u);
  }
  /** Rebuilds the cable tube: sampled along the route, lifted on the ground, without the interval of every cut that is open (ends frayed), with a splice sleeve where a cut is closed. */
  buildCable(world,gaps){
    const height=this.ground(world);
    for(const c of [...this.dynamic.children])this.dynamic.remove(c);
    for(const c of [...this.markers.children])this.markers.remove(c);
    if(this.cable){this.cable.geometry.dispose();this.cable=null;}
    const {pts}=this.samples,open=[];
    const cuts=[['crater',this.arc.crater,SAPPERS.points.crater.gapM],['fault',this.arc.fault,SAPPERS.points.fault.gapM],['second',this.arc.second,SAPPERS.points.second.gapM]];
    const state=name=>gaps?.[name]??'none';
    for(const [name,s,gap] of cuts)if(state(name)==='open')open.push({name,s0:s-gap/2,s1:s+gap/2});
    // The tube: the route outside every open gap, in pieces that end exactly at the edge of the gap, as quads round a 5-sided ring (the gap ends get their own frayed stubs).
    // The tube follows the drawn ground (profile above).
    const pos=[],idx=[],at=(p)=>({x:p.x,y:this.profileY(world,p.s)+RADIUS+LIFT,z:p.z});
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
        stub.position.set(e.x-Math.cos(ang)*side*.01,e.y+.03,e.z-Math.sin(ang)*side*.01);stub.rotation.set(0,-ang,side*(Math.PI/2)-side*.35);
        this.dynamic.add(stub);
        // The stake that marks this end: beyond the edge of the gap along the cable, on the player's side, a white rag hanging from its top toward the gap.
        const q=this.sampleAt(s+side*(gap/2+STAKE.along)),y=height(q.x,q.z+STAKE.aside),post=new THREE.Mesh(this.geometry.stake,this.material.stake),rag=new THREE.Mesh(this.geometry.rag,this.material.rag);
        post.position.set(q.x,y+STAKE.height/2,q.z+STAKE.aside);post.name='cut_stake';
        rag.position.set(q.x-Math.cos(ang)*side*.13,y+STAKE.height-.2,q.z+STAKE.aside-Math.sin(ang)*side*.13);rag.rotation.y=-ang;rag.name='cut_rag';
        this.markers.add(post,rag);
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
  /** `ops` is sim.sapperOps (null: nothing is drawn); `world` gives the ground height (when no `surfaceY` was injected). */
  sync(ops,world){
    if(!ops||!world){this.group.visible=false;return;}
    this.group.visible=true;
    const key=`${ops.gaps.crater}|${ops.gaps.fault}|${ops.gaps.second}`;
    if(key!==this.key||!this.cable){this.buildCable(world,ops.gaps);this.key=key;this.placed=null;}
    // The crate and the tools on the ground: at the cut they work at, from the delivery until the helper lifts the crate for the walk; the other cut gets them when the walk ends.
    const ground=ops.box.state==='ground',p=ground?SAPPERS.points[ops.box.point]:null;
    this.crate.visible=this.tools.visible=this.coil.visible=Boolean(ground);
    if(ground&&this.placed!==ops.box.point){
      this.placed=ops.box.point;
      const height=this.ground(world),slot=p.slots[SAPPERS.helper],top=(x,z,r)=>Math.max(height(x-r,z-r),height(x+r,z-r),height(x-r,z+r),height(x+r,z+r)),   // the highest corner of the footprint: it rests on the slope, it does not sink into it
        y=top(slot.x-.7,p.z+1.25,.3)+.02;
      // On the player's side of the cable, beside the helper's place (he reaches it), the open lid toward the cut.
      this.crate.position.set(slot.x-.7,y,p.z+1.25);this.crate.rotation.y=.12;
      this.tools.position.set(slot.x+.7,top(slot.x+.7,p.z+1.0,.5)+.015,p.z+1.0);this.tools.rotation.y=-.2;
      this.coil.position.set(slot.x-1.8,top(slot.x-1.8,p.z+1.1,.2)+.05,p.z+1.1);
    }
    if(!ground)this.placed=null;
  }
  get diagnostics(){return {revision:this.revision,key:this.key,visible:this.group.visible,crate:this.crate.visible};}
  dispose(){
    this.group.removeFromParent();
    if(this.cable)this.cable.geometry.dispose();
    for(const o of [...Object.values(this.geometry),...Object.values(this.material)])o.dispose();
  }
}
