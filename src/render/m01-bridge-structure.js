import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Structural production detail for the provisional M01 bridges.
// The authored GLBs stay byte-identical: this module only adds instanced, collider-free presentation to their
// existing nodes, so lengths, pivots, demolition swaps (06:10/06:40), colliders and the simulation stay authoritative.
// Dimensions mirror tools/assets/m01-bridges/src/bridges.mjs; member sizes not in the sources are labelled estimates.

const BEARING_Y=-1;
const RIVER=[25,265];
const inRiver=x=>x>RIVER[0]-10&&x<RIVER[1]+10;
const ROUND=v=>Math.round(v*1e5)/1e5;

// Bridge parameters (generator constants). supportsX/span lengths come from the GLB extras at attach time.
export const M01_BRIDGE_STRUCTURE_SPEC=Object.freeze({
  rail:Object.freeze({trussHalf:4.8,deckHalf:4.6,tracks:Object.freeze([-2,2]),halfGauge:.7175,abutmentHalfZ:9.5,
    pierLengthX:i=>(i===6?14:i>=7?5:6),pierLengthZ:15,pierNose:4,eastFront:6,eastBack:18,faceWestOffset:-129}),
  road:Object.freeze({trussHalf:6.43/2,deckHalf:6.43/2-.45,abutmentHalfZ:10.5,
    pierLengthX:i=>(i===6?14:i>=7?5:7),pierLengthZ:18,pierNose:5,eastFront:6,eastBack:18,faceWestOffset:-130.9})
});
// Track centres either side of each map rail polyline. The 1939 main line and both bridges are double track
// (bridge tracks at z = ±2; trains east of Lisewo already stand at z = ±2.5); the Bydgoszcz branch is single.
export const M01_TRACK_CENTRES=Object.freeze({rail_embankment_west:Object.freeze([-2,2]),rail_line_east:Object.freeze([-2.5,2.5]),
  rail_line_southwest:Object.freeze([0])});
// Detail reach: rivets and fishplates only resolve near the player; beyond this they are sub-pixel noise.
export const M01_BRIDGE_MICRO_DETAIL_RANGE=140;
// Clear envelopes kept free above the walkable deck (and the loading gauge over each rail track).
export const M01_BRIDGE_CLEARANCE=Object.freeze({
  rail:Object.freeze({walkHalf:4.35,walkTop:4.2,gaugeHalf:1.6,gaugeTop:5.2}),
  road:Object.freeze({walkHalf:2.76,walkTop:4.2})
});

// ---------------------------------------------------------------------------------------------
// Descriptor sinks. Items are plain data {p,s,q} so tests can audit them without a renderer.

const _dir=new THREE.Vector3(),_u=new THREE.Vector3(),_side=new THREE.Vector3(),_m=new THREE.Matrix4(),_q=new THREE.Quaternion();
const qArray=q=>[ROUND(q.x),ROUND(q.y),ROUND(q.z),ROUND(q.w)];
const qAxisZ=angle=>qArray(_q.setFromAxisAngle(new THREE.Vector3(0,0,1),angle));

class Sink{
  constructor(){this.medium=[];this.high=[];}
  push(tier,item){(tier==='high'?this.high:this.medium).push(item);return item;}
  box(tier,p,s,q=null,kind='part'){return this.push(tier,{p:p.map(ROUND),s:s.map(ROUND),q,kind});}
  aabb(tier,min,max,kind){return this.box(tier,[(min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2],[max[0]-min[0],max[1]-min[1],max[2]-min[2]],null,kind);}
  // Same frame as the generator's beam(): X along a→b, Y = projected `up`, Z = side. Offsets move the box in that frame.
  member(tier,a,b,width,height,{up=[0,1,0],offU=0,offS=0,extend=0,kind='member'}={}){
    _dir.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const len=_dir.length()+extend*2;_dir.normalize();
    _u.set(...up).addScaledVector(_dir,-_u.set(...up).dot(_dir));
    if(_u.lengthSq()<1e-8)_u.set(0,0,1).addScaledVector(_dir,-_dir.z);
    _u.normalize();_side.crossVectors(_dir,_u).normalize();
    _m.makeBasis(_dir,_u,_side);_q.setFromRotationMatrix(_m);
    const c=[(a[0]+b[0])/2+_u.x*offU+_side.x*offS,(a[1]+b[1])/2+_u.y*offU+_side.y*offS,(a[2]+b[2])/2+_u.z*offU+_side.z*offS];
    return this.box(tier,c,[len,height,width],qArray(_q),kind);
  }
}

// Deterministic per-instance jitter (no gameplay RNG): sleeper spacing/yaw and plank joints vary slightly.
const hash=(a,b=0)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};

// ---------------------------------------------------------------------------------------------
// Repeated components

// Rivet heads: low pyramids whose local +Z is the outward normal of the plate they sit on.
const RIVET=[.045,.045,.026],Q_PLUS_X=[0,ROUND(Math.SQRT1_2),0,ROUND(Math.SQRT1_2)],Q_MINUS_X=[0,-ROUND(Math.SQRT1_2),0,ROUND(Math.SQRT1_2)],Q_MINUS_Z=[0,1,0,0];
const rivet=(sink,p,normal)=>sink.box('high',p,RIVET,normal==='+x'?Q_PLUS_X:normal==='-x'?Q_MINUS_X:normal==='-z'?Q_MINUS_Z:null,'rivet');

function rivetGrid(sink,cx,cy,z,facing,angle,cols,rows,dx,dy){
  const c=Math.cos(angle),s=Math.sin(angle);
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
    const ox=(i-(cols-1)/2)*dx,oy=(j-(rows-1)/2)*dy;
    rivet(sink,[cx+ox*c-oy*s,cy+ox*s+oy*c,z+facing*.013],facing>0?'+z':'-z');
  }
}

function gusset(sink,x,y,zPlane,angle,{w=1.4,h=1.15,webHalf=.3,rivets=false}={}){
  // Plates either side of the web members (outside the vertical flanges), following the chord slope;
  // inside the chord they are hidden, below/above it they join chord, vertical and diagonals.
  for(const face of [-1,1]){
    const z=zPlane+face*(webHalf+.0175);
    sink.box('medium',[x,y,z],[w,h,.035],angle?qAxisZ(angle):null,'gusset');
    if(rivets&&Math.sign(zPlane)===-face)rivetGrid(sink,x,y,z+face*.0175,face,angle,3,3,w*.3,h*.3);
  }
}

function hFlanges(sink,x,y0,y1,z,{core=.4,depth=.56,rivets=false,deckBand=[.2,2.6]}={}){
  // Flange plates turn the square verticals into built-up H sections; rivet columns sit at eye level.
  for(const side of [-1,1]){
    const fx=x+side*(core/2+.02);
    sink.box('medium',[fx,(y0+y1)/2,z],[.04,y1-y0,depth],null,'flange');
    if(rivets){
      const lo=Math.max(y0+.15,deckBand[0]),hi=Math.min(y1-.15,deckBand[1]);
      for(let y=lo;y<=hi+1e-6;y+=.3)for(const dz of [-.18,.18])rivet(sink,[fx+side*.033,y,z+dz],side>0?'+x':'-x');
    }
  }
}

function coverPlates(sink,a,b,width,height,{lips=true}={}){
  // Cover plates wider than the chord give built-up members a flange shadow line.
  for(const sign of [-1,1])sink.member('medium',a,b,width+.16,.04,{offU:sign*(height/2+.02),kind:'cover-plate'});
  if(lips)for(const sign of [-1,1])sink.member('medium',a,b,.04,height*.55,{offS:sign*(width/2+.02),kind:'flange-angle'});
}

function bearing(sink,x,z,{shoeTop=-.88}={}){
  // Cast steel shoe and sole plate on the pier pedestal; estimate, form not documented.
  sink.aabb('medium',[x-.75,-1.13,z-.6],[x+.75,-1.09,z+.6],'bearing');
  sink.aabb('medium',[x-.55,-1.09,z-.5],[x+.55,shoeTop,z+.5],'bearing');
}

function railDeck(sink,L,hz,beams,{extW=1.2,extE=1.2}={}){
  const tracks=M01_BRIDGE_STRUCTURE_SPEC.rail.tracks,g=M01_BRIDGE_STRUCTURE_SPEC.rail.halfGauge;
  const x0=-extW,x1=L+extE;
  // Floor beams become I sections, stringers get flanges, plus bottom lateral bracing under the deck.
  for(const x of beams){
    for(const y of [-.83,-1.67])sink.box('medium',[x,y,0],[.56,.04,2*hz-.2],null,'floor-beam-flange');
  }
  for(const tz of tracks)for(const dz of [-.75,.75]){
    sink.box('medium',[L/2,-.87,tz+dz],[L,.04,.42],null,'stringer-flange');
    sink.box('medium',[L/2,-.35,tz+dz],[L,.04,.42],null,'stringer-flange');
  }
  for(let k=0;k<beams.length-1;k++){
    const xa=beams[k],xb=beams[k+1];
    sink.member('medium',[xa,-1.74,-hz+.4],[xb,-1.74,hz-.4],.14,.1,{kind:'bottom-lateral'});
    sink.member('medium',[xa,-1.74,hz-.4],[xb,-1.74,-hz+.4],.14,.1,{kind:'bottom-lateral'});
  }
  // Open sleeper deck replaces the continuous plank slab: oak sleepers on the stringers, 0.62 m pitch.
  let i=0;
  for(let x=x0+.32;x<x1-.2;x+=.62,i++){
    const jitter=(hash(i,L)-.5)*.05,yaw=(hash(i,L+7)-.5)*.018;
    for(const tz of tracks){
      if(x+jitter<0||x+jitter>L){continue;}
      sink.box('medium',[x+jitter,-.234,tz+(hash(i,tz)-.5)*.04],[.26,.19,2.6],yaw?[0,ROUND(Math.sin(yaw/2)),0,ROUND(Math.cos(yaw/2))]:null,'sleeper');
    }
    // Bearers carry the boards between tracks (every third sleeper); steel brackets the side walkways (every sixth).
    if(i%3===0&&x>=0&&x<=L){
      sink.box('medium',[x,-.25,0],[.22,.16,1.38],null,'walkway-bearer');
      if(i%6===0)for(const s of [-1,1])sink.box('medium',[x,-.27,s*3.875],[.12,.12,1.15],null,'walkway-bracket');
    }
  }
  // Boards in ~4 m lengths with butt joints (no kilometre-stretched planks).
  const boards=(zs,width,y0,y1)=>{for(const z of zs){let x=0,j=0;while(x<L-.05){const l=Math.min(L-x,3.6+hash(j,z*13+L)*.8);
    sink.box('medium',[x+l/2,(y0+y1)/2,z],[l-.025,y1-y0,width],null,'board');x+=l;j++;}}};
  boards([-.46,0,.46],.42,-.17,-.12);
  boards([-4.1,-3.58,3.58,4.1],.48,-.21,-.15);
  // Running rails as flat-bottom profiles (head/web/foot), with inner guard rails as on period river bridges.
  for(const tz of tracks)for(const s of [-1,1]){
    const z=tz+s*g;
    // Main rail over the span, plus stubs over each pier joint that only show while that joint exists in the world.
    for(const [a,b,joint] of [[0,L,null],[-extW,0,'w'],[L,L+extE,'e']]){
      if(b-a<1e-6)continue;
      for(const [y,h,w] of [[-.0105,.045,.07],[-.0705,.075,.018],[-.123,.03,.13]]){
        const it=sink.box('medium',[(a+b)/2,y,z],[b-a,h,w],null,'rail');if(joint)it.joint=joint;
      }
    }
    const gz=tz+s*(g-.24);
    sink.box('medium',[L/2,-.035,gz],[L,.035,.06],null,'guard-rail');
    sink.box('medium',[L/2,-.1,gz],[L,.095,.016],null,'guard-rail');
    for(let x=15;x<L-1;x+=15)for(const f of [-1,1])sink.box('high',[x,-.07,z+f*.022],[.7,.065,.014],null,'fishplate');
  }
}

function roadDeck(sink,L,hz,beams,{joints=true}={}){
  const kerb=hz-.45;
  for(const x of beams)sink.box('medium',[x,-.99,0],[.46,.04,2*hz],null,'floor-beam-flange');
  // Longitudinal stringers under the carriageway slab (estimate), I-shaped.
  for(const z of [-1.9,-.65,.65,1.9]){
    sink.box('medium',[L/2,-.47,z],[L,.4,.06],null,'stringer');
    sink.box('medium',[L/2,-.65,z],[L,.035,.24],null,'stringer-flange');
  }
  // Timber wheel guards on the kerbs against the girders, in sawn lengths.
  for(const s of [-1,1]){let x=0,j=0;while(x<L-.05){const l=Math.min(L-x,5.6+hash(j,s+L)*.6);
    sink.box('medium',[x+l/2,.31,s*(kerb+.08)],[l-.03,.22,.14],null,'wheel-guard');x+=l;j++;}}
  // Steel expansion plates where the carriageway meets the next span.
  if(joints)for(const x of [.25,L-.25])sink.box('medium',[x,.01,0],[.42,.02,2*(kerb-.2)],null,'expansion-plate');
}

// ---------------------------------------------------------------------------------------------
// Span types

function lensSpan(sink,L,lod,index){
  const hz=M01_BRIDGE_STRUCTURE_SPEC.rail.trussHalf,n=Math.max(8,Math.round(L/8/2)*2);
  const xk=k=>k/n*L,yt=k=>BEARING_Y+11*4*(k/n)*(1-k/n),yb=k=>BEARING_Y-5*4*(k/n)*(1-k/n);
  for(const z of [-hz,hz]){
    if(lod===0){
      for(let k=0;k<n;k++){
        coverPlates(sink,[xk(k),yt(k),z],[xk(k+1),yt(k+1),z],.7,.6);
        coverPlates(sink,[xk(k),yb(k),z],[xk(k+1),yb(k+1),z],.7,.6);
        // Batten plate where the two diagonals of the panel actually cross (trapezoid panel: t = h0/(h0+h1)).
        if(k>0&&k<n-1){
          const h0=yt(k)-yb(k),h1=yt(k+1)-yb(k+1),t=h0/(h0+h1);
          sink.box('medium',[xk(k)+t*(xk(k+1)-xk(k)),yb(k)+t*(yt(k+1)-yb(k)),z],[.5,.5,.3],qAxisZ(Math.PI/4),'crossing-plate');
        }
      }
      for(let k=1;k<n;k++){
        hFlanges(sink,xk(k),yb(k),yt(k),z,{rivets:true});
        const at=Math.atan2(yt(k+1)-yt(k-1),xk(k+1)-xk(k-1)),ab=Math.atan2(yb(k+1)-yb(k-1),xk(k+1)-xk(k-1));
        gusset(sink,xk(k),yt(k)-.32,z,at,{rivets:true});
        gusset(sink,xk(k),yb(k)+.32,z,ab,{rivets:yb(k)+.32>-1.2});
      }
      for(const [x,a] of [[.95,0],[L-.95,0]])gusset(sink,x,-.95,z,a,{w:2.1,h:1.0});
    }else{
      // LOD1 had no web members: one diagonal family keeps the lattice silhouette at 400–800 m.
      for(let k=0;k<n;k++)sink.member('medium',[xk(k),yb(k),z],[xk(k+1),yt(k+1),z],.25,.25,{kind:'diagonal'});
    }
    for(const x of [0,L])bearing(sink,x,z,{shoeTop:-.9});
  }
  // Sway frames: knee braces under the top struts where the arch clears the loading gauge.
  for(let k=1;k<n;k++){
    if(yt(k)<7.4)continue;
    for(const s of [-1,1])sink.member('medium',[xk(k),yt(k)-.3,s*(hz-1.5)],[xk(k),yt(k)-1.9,s*(hz-.25)],.18,.18,{kind:'knee-brace'});
    if(lod===0)sink.box('medium',[xk(k),yt(k)-.17,0],[.45,.04,2*hz-.7],null,'strut-flange');
  }
  // Span 1 starts inside the west abutment: its approach track belongs to the abutment overlay.
  if(lod===0)railDeck(sink,L,hz,Array.from({length:n+1},(_,k)=>xk(k)),{extW:index===1?0:1.2});
}

function prattSpan(sink,L,lod,prefix,index){
  const spec=M01_BRIDGE_STRUCTURE_SPEC[prefix],hz=spec.trussHalf,n=10,y0=BEARING_Y,y1=BEARING_Y+9;
  const xk=k=>k/n*L;
  for(const z of [-hz,hz]){
    if(lod===0){
      coverPlates(sink,[xk(0),y0,z],[xk(n),y0,z],.6,.6);
      coverPlates(sink,[xk(1),y1,z],[xk(n-1),y1,z],.6,.6);
      coverPlates(sink,[xk(0),y0,z],[xk(1),y1,z],.6,.6);
      coverPlates(sink,[xk(n-1),y1,z],[xk(n),y0,z],.6,.6);
      for(let k=1;k<n;k++){
        hFlanges(sink,xk(k),y0,y1,z,{core:.35,depth:.5,rivets:true});
        gusset(sink,xk(k),y0+.42,z,0,{w:1.3,h:1.0,webHalf:.27,rivets:true});
        gusset(sink,xk(k),y1-.42,z,0,{w:1.3,h:1.0,webHalf:.27});
      }
      for(const x of [.75,L-.75])gusset(sink,x,y0+.5,z,0,{w:1.7,h:1.2,webHalf:.27,rivets:true});
    }else{
      for(let k=1;k<n-1;k++){
        const toCenter=k<n/2;
        sink.member('medium',toCenter?[xk(k),y1,z]:[xk(k),y0,z],toCenter?[xk(k+1),y0,z]:[xk(k+1),y1,z],.25,.25,{kind:'diagonal'});
      }
    }
    for(const x of [0,L])bearing(sink,x,z,{shoeTop:-.9});
  }
  // Top lateral X bracing between the struts, portal frames in the inclined end posts and knee braces.
  for(let k=1;k<n-1;k++){
    sink.member('medium',[xk(k),y1,-hz+.3],[xk(k+1),y1,hz-.3],.14,.14,{kind:'top-lateral'});
    sink.member('medium',[xk(k),y1,hz-.3],[xk(k+1),y1,-hz+.3],.14,.14,{kind:'top-lateral'});
  }
  const clear=prefix==='rail'?6.4:6.2,t=(clear-y0)/(y1-y0);
  for(const [xa,xb] of [[t*xk(1),xk(1)],[L-t*(L-xk(n-1)),xk(n-1)]]){
    sink.member('medium',[xa,clear,-hz+.3],[xa,clear,hz-.3],.35,.5,{kind:'portal-strut'});
    sink.member('medium',[xa,clear,-hz+.3],[xb,y1,0],.18,.18,{kind:'portal-lattice'});
    sink.member('medium',[xa,clear,hz-.3],[xb,y1,0],.18,.18,{kind:'portal-lattice'});
  }
  for(let k=2;k<n-1;k++)for(const s of [-1,1])
    sink.member('medium',[xk(k),y1-.25,s*(hz-1.3)],[xk(k),y1-1.6,s*(hz-.2)],.16,.16,{kind:'knee-brace'});
  if(lod!==0)return;
  const beams=Array.from({length:n+1},(_,k)=>xk(k));
  if(prefix==='rail')railDeck(sink,L,hz,beams,{extE:index===9?0:1.2});
  else{
    roadDeck(sink,L,hz,beams);
    for(let k=0;k<n;k++){
      sink.member('medium',[xk(k),-1.05,-hz+.35],[xk(k+1),-1.05,hz-.35],.12,.1,{kind:'bottom-lateral'});
      sink.member('medium',[xk(k),-1.05,hz-.35],[xk(k+1),-1.05,-hz+.35],.12,.1,{kind:'bottom-lateral'});
    }
  }
}

function lentzeSpan(sink,L,lod){
  const hz=M01_BRIDGE_STRUCTURE_SPEC.road.trussHalf,yb1=-.4,yt0=7.28,yt1=7.78,run=yt0-yb1,pitch=1.6;
  const nv=Math.round(L/6.5),nb=nv;
  for(const z of [-hz,hz]){
    // Chord cover plates and the angles that grip the lattice web.
    sink.box('medium',[L/2,yt1+.02,z],[L,.04,.86],null,'cover-plate');
    sink.box('medium',[L/2,-.92,z],[L,.04,.86],null,'cover-plate');
    if(lod!==0)continue;
    for(const s of [-1,1]){
      sink.box('medium',[L/2,yt0-.13,z+s*.05],[L,.26,.03],null,'flange-angle');
      sink.box('medium',[L/2,yb1+.13,z+s*.05],[L,.26,.03],null,'flange-angle');
    }
    const inner=-Math.sign(z);
    for(let k=0;k<=nv;k++){
      const x=k*L/nv,end=k===0||k===nv;
      for(const s of [-1,1]){
        sink.box('medium',[x,(yb1+yt0)/2,z+s*.27],[end?.6:.36,yt0-yb1,.04],null,'stiffener');
        for(const y of [yt0-.42,yb1+.42])sink.box('medium',[x,y,z+s*.06],[end?1.6:1.1,.8,.03],null,'gusset');
      }
      // Rivet columns on the inner stiffener plate, at eye level from the carriageway.
      for(let y=.2;y<=2.6;y+=.3)for(const dx of [-.1,.1])rivet(sink,[x+dx,y,z+inner*.303],inner>0?'+z':'-z');
    }
    // Rivets where the two lattice families cross, inner face only and at eye level.
    for(const [x,y] of lentzeCrossings(L,run,pitch,yb1))rivet(sink,[x,y,z+inner*.038],inner>0?'+z':'-z');
  }
  if(lod!==0)return;
  // Sway frames under the top beams and portal V-frames at both span ends (road clearance kept above 5.8 m).
  for(let k=0;k<=nb;k++){
    const x=k*L/nb;
    for(const s of [-1,1])sink.member('medium',[x,yt1-.35,s*(hz-1.0)],[x,yt0-1.4,s*(hz-.3)],.16,.16,{kind:'knee-brace'});
  }
  for(const x of [.35,L-.35]){
    sink.member('medium',[x,6.0,-hz+.35],[x,6.0,hz-.35],.3,.4,{kind:'portal-strut'});
    for(const s of [-1,1])sink.member('medium',[x,6.0,s*(hz-.35)],[x,yt1-.3,0],.16,.16,{kind:'portal-lattice'});
  }
  for(const z of [-hz,hz])for(const x of [0,L])bearing(sink,x,z,{shoeTop:-.9});
  roadDeck(sink,L,hz,Array.from({length:nb+1},(_,k)=>k*L/nb));
}

// Intersections of the two 45° lattice families of the Lentze web (generator pitch/run), inside 0.3–2.6 m.
export function lentzeCrossings(L,run,pitch,yb1){
  const out=[],up=[],down=[];
  for(let xs=-run;xs<=L;xs+=pitch)up.push(xs);          // x − (y − yb1) = xs
  for(let xs=0;xs<=L+run;xs+=pitch)down.push(xs);       // x + (y − yb1) = xs
  for(const a of up)for(const b of down){
    const x=(a+b)/2,y=yb1+(b-a)/2;
    if(y<.3||y>2.6||x<.2||x>L-.2)continue;
    if(x-a<0||x-a>run||b-x<0||b-x>run)continue;
    out.push([ROUND(x),ROUND(y)]);
  }
  return out;
}

/** Instance descriptors for one span node, in the span's local frame (x = 0..L from its west bearing). */
export function spanStructureDescriptors({prefix,index,length,lod}){
  const sink=new Sink();
  if(lod===0||lod===1){
    if(index>=7)prattSpan(sink,length,lod,prefix,index);
    else if(prefix==='rail')lensSpan(sink,length,lod,index);
    else lentzeSpan(sink,length,lod);
  }
  const hide=lod===0&&prefix==='rail'?['timber','steel_rail']:[];
  return Object.freeze({medium:Object.freeze(sink.medium),high:Object.freeze(sink.high),hide:Object.freeze(hide)});
}


// ---------------------------------------------------------------------------------------------
// Supports: masonry courses, bearing pedestals and the track across the abutments.

export function supportStructureDescriptors({prefix,supportIndex,supportsX,lod}){
  const spec=M01_BRIDGE_STRUCTURE_SPEC[prefix],sink=new Sink(),bands=[];
  const hz=spec.trussHalf,last=supportsX.length-1,x=supportsX[supportIndex];
  if(supportIndex>0&&supportIndex<last){
    const lx=spec.pierLengthX(supportIndex),lz=spec.pierLengthZ,nose=spec.pierNose,river=inRiver(x);
    const add=(offset,y0,y1)=>bands.push({lengthX:lx,lengthZ:lz,nose,offset,y0,y1});
    // Stepped footing at the waterline, a string course and a corbelled band under the coping (estimates).
    if(river){add(.7,-10.6,-9.3);add(.4,-9.3,-8.6);}
    add(.28,river?-4.5:-3.3,river?-4.0:-2.8);
    add(.2,-2.25,-1.8);
    // Bearing pedestals under each girder line, both spans.
    for(const sx of [-1.2,1.2])for(const z of [-hz,hz])sink.aabb('medium',[sx-.95,-1.2,z-.85],[sx+.95,-1.13,z+.85],'pedestal');
  }else if(supportIndex===0){
    const faceWest=supportsX[1]+spec.faceWestOffset-x,halfZ=spec.abutmentHalfZ;
    // River face: cornice, plinth and pilasters clear of the casemate embrasures.
    sink.aabb('medium',[faceWest,-.75,-halfZ-.1],[faceWest+.26,-.38,halfZ+.1],'cornice');
    sink.aabb('medium',[faceWest,-3.2,-halfZ],[faceWest+.35,-2.7,halfZ],'plinth');
    const pilasters=prefix==='road'?[-9.6,-4.35,0,4.35,9.6]:[-8.8,-3.1,3.1,8.8];
    for(const z of pilasters)sink.aabb('medium',[faceWest,-3.0,z-.55],[faceWest+.3,-.75,z+.55],'pilaster');
    if(prefix==='rail'&&lod===0)approachTrack(sink,0,faceWest-1.5,-.17,.012);
  }else if(supportIndex===last&&prefix==='rail'&&lod===0){
    const front=-spec.eastFront;
    sink.aabb('medium',[front-.26,-.75,-spec.abutmentHalfZ-.1],[front,-.38,spec.abutmentHalfZ+.1],'cornice');
    approachTrack(sink,front+1.5,9.0,.012,.012);
  }
  return Object.freeze({medium:Object.freeze(sink.medium),high:Object.freeze(sink.high),bands:Object.freeze(bands.map(Object.freeze))});
}

function approachTrack(sink,x0,x1,topW,topE){
  // Ballasted double track across the abutment: joins the doubled embankment track (rail top −0.17 on the
  // abutment walk surface) to the bridge rails (top +0.012, just proud of the steel joint plates).
  const spec=M01_BRIDGE_STRUCTURE_SPEC.rail,len=x1-x0,top=x=>topW+(topE-topW)*(x-x0)/len;
  for(const tz of spec.tracks){
    sink.aabb('medium',[x0,-.36,tz-1.7],[x1,-.27,tz+1.7],'ballast');
    let i=0;
    for(let x=x0+.35;x<x1-.15;x+=.62,i++)sink.box('medium',[x,top(x)-.2465,tz],[.26,.19,2.6],null,'sleeper');
    for(const s of [-1,1]){
      const z=tz+s*spec.halfGauge;
      sink.member('medium',[x0,top(x0)-.0225,z],[x1,top(x1)-.0225,z],.07,.045,{kind:'rail'});
      sink.member('medium',[x0,top(x0)-.0825,z],[x1,top(x1)-.0825,z],.018,.075,{kind:'rail'});
      sink.member('medium',[x0,top(x0)-.135,z],[x1,top(x1)-.135,z],.13,.03,{kind:'rail'});
    }
  }
}

// Pier plan (generator pierPlan): semicircle downstream (−Z), pointed cutwater upstream (+Z).
function pierBandGeometry({lengthX,lengthZ,nose,offset,y0,y1}){
  const hx=lengthX/2+offset,hz=lengthZ/2,s=new THREE.Shape();
  s.moveTo(-hx,-hz);s.absarc(0,-hz,hx,Math.PI,0,false);s.lineTo(hx,hz);s.lineTo(0,hz+nose+offset*1.4);s.lineTo(-hx,hz);s.lineTo(-hx,-hz);
  const g=new THREE.ExtrudeGeometry(s,{depth:y1-y0,bevelEnabled:false,curveSegments:6});
  g.applyMatrix4(new THREE.Matrix4().set(1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1));g.translate(0,y0,0);
  const out=g.index?g.toNonIndexed():g;if(out!==g)g.dispose();
  // Axis swap mirrors the winding: flip it back so faces point outwards.
  const pos=out.attributes.position,uv=out.attributes.uv;
  for(let i=0;i<pos.count;i+=3)for(const attr of [pos,uv]){const n=attr.itemSize;for(let k=0;k<n;k++){const a=attr.array[(i+1)*n+k];attr.array[(i+1)*n+k]=attr.array[(i+2)*n+k];attr.array[(i+2)*n+k]=a;}}
  out.computeVertexNormals();return out;
}

// ---------------------------------------------------------------------------------------------
// Runtime

const SPAN=/^(rail|road)_span_(\d\d)(_collapsed)?$/,SUPPORT=/^(rail|road)_support_(\d\d)$/;
const materialSlot={rail:'rail','guard-rail':'rail',fishplate:'rail',rivet:'rivet',
  sleeper:'timber',board:'timber','walkway-bearer':'timber','wheel-guard':'timber',
  ballast:'stone',cornice:'stone',plinth:'stone',pilaster:'stone',pedestal:'stone'};
const slotFor=item=>materialSlot[item.kind]??'steel';

// Masonry detail is static and axis-aligned: merge courses and blocks into one mesh (one draw call).
function stoneGeometry(d,offsetX=0){
  const parts=(d.bands??[]).map(pierBandGeometry);
  for(const it of d.medium)if(slotFor(it)==='stone')parts.push(new THREE.BoxGeometry(...it.s).translate(...it.p).toNonIndexed());
  if(!parts.length)return null;
  const merged=mergeGeometries(parts,false);for(const g of parts)g.dispose();
  if(offsetX)merged.translate(offsetX,0,0);merged.computeBoundingSphere();return merged;
}

export class M01BridgeStructure{
  constructor({steel,rail=steel,timber,stone}){
    this.materials={steel,rail,rivet:steel,timber,stone};this.box=new THREE.BoxGeometry(1,1,1);
    // 4-triangle rivet head, apex along +Z, same unit extents as the box.
    this.rivet=new THREE.ConeGeometry(.5,1,4,1,true).rotateX(Math.PI/2);this.geometries=[];
    this.attachments=[];this.quality='medium';this.viewer=null;this.jointKey=null;this.joints=null;
  }
  // Attach to the span/support nodes of one loaded kit file (GLB untouched). Returns the attachments created.
  attachKit(scene,file){
    const lod=file.lod;if(typeof lod!=='number')return 0;
    const byName=new Map();scene.traverse(n=>{if(n.name)byName.set(n.name,n);});
    const supportsX=[...byName.values()].find(n=>n.userData?.m01?.supportsX)?.userData.m01.supportsX;
    const before=this.attachments.length,statics=[];
    for(const [name,node] of byName){
      const span=SPAN.exec(name);
      if(span){
        const source=span[3]?byName.get(node.userData?.m01?.replaces??''):node,length=source?.userData?.m01?.lengthM;
        if(typeof length!=='number')continue;
        this.attachDescriptors(node,spanStructureDescriptors({prefix:span[1],index:Number(span[2]),length,lod}),
          {kind:'span',lod,prefix:span[1],index:Number(span[2]),collapsed:Boolean(span[3])});
        continue;
      }
      const support=SUPPORT.exec(name);if(!support||!supportsX)continue;
      const d=supportStructureDescriptors({prefix:support[1],supportIndex:Number(support[2]),supportsX,lod});
      if(node.userData?.m01?.destroyedBy){this.attachDescriptors(node,d,{kind:'support',lod});continue;}
      // Permanent supports: masonry joins one merged mesh per bridge on the LOD0 kit; track stays on the node.
      if(lod!==0)continue;
      statics.push({node,d});
      this.attachDescriptors(node,{...d,medium:d.medium.filter(i=>slotFor(i)!=='stone'),bands:[]},{kind:'support',lod});
    }
    if(statics.length){
      const parts=statics.map(({node,d})=>stoneGeometry(d,node.position.x)).filter(Boolean);
      if(parts.length){
        const geometry=mergeGeometries(parts,false);for(const g of parts)g.dispose();geometry.computeBoundingSphere();this.geometries.push(geometry);
        const parent=statics[0].node.parent,mesh=new THREE.Mesh(geometry,this.materials.stone);
        mesh.name=`${parent.name}_support_courses`;mesh.castShadow=mesh.receiveShadow=true;
        const root=new THREE.Group();root.name=mesh.name;root.userData.m01BridgeStructure=true;root.add(mesh);parent.add(root);
        const detail={medium:statics.flatMap(s=>s.d.medium.filter(i=>slotFor(i)==='stone')),high:[],bands:statics.flatMap(s=>s.d.bands)};
        this.attachments.push({node:parent,root,batches:[],bands:mesh,hidden:[],stubs:[],hasHigh:false,detail,meta:{kind:'support-courses',lod},center:null,radius:0,micro:false});
      }
    }
    this.jointKey=null;this.sync(this.quality,this.viewer);return this.attachments.length-before;
  }
  attachDescriptors(node,d,meta){
    const root=new THREE.Group();root.name=`${node.name}_structure`;root.userData.m01BridgeStructure=true;
    const batches=[],stubs=[];
    for(const slot of ['steel','rail','timber','rivet']){
      const medium=d.medium.filter(i=>slotFor(i)===slot),high=d.high.filter(i=>slotFor(i)===slot);
      if(!medium.length&&!high.length)continue;
      const items=[...medium,...high],mesh=new THREE.InstancedMesh(slot==='rivet'?this.rivet:this.box,this.materials[slot],items.length),dummy=new THREE.Object3D();
      items.forEach((it,i)=>{dummy.position.set(...it.p);dummy.scale.set(...it.s);
        if(it.q)dummy.quaternion.set(...it.q);else dummy.quaternion.identity();dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
        if(it.joint)stubs.push({mesh,index:i,side:it.joint,matrix:dummy.matrix.clone(),shown:true});});
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.computeBoundingBox();mesh.name=`${node.name}_${slot}`;
      // Sleepers/boards only receive shadows; structural steel casts them.
      mesh.castShadow=slot==='steel';mesh.receiveShadow=slot!=='rivet';
      root.add(mesh);batches.push({mesh,slot,medium:medium.length,high:high.length});
    }
    let bands=null;const stone=stoneGeometry(d);
    if(stone){this.geometries.push(stone);bands=new THREE.Mesh(stone,this.materials.stone);bands.name=`${node.name}_courses`;bands.castShadow=bands.receiveShadow=true;root.add(bands);}
    if(!batches.length&&!bands)return false;
    // Replaced source primitives (plank slab, flat rails) are hidden only while the overlay deck is shown.
    const hidden=[];
    if(d.hide?.length)node.traverse(n=>{if(n.isMesh&&d.hide.includes(n.userData.m01SourceMaterial))hidden.push(n);});
    node.add(root);
    this.attachments.push({node,root,batches,bands,hidden,stubs,hasHigh:batches.some(b=>b.high),detail:d,meta,center:null,radius:0,micro:false});return true;
  }
  // viewer: camera position (Vector3) used only to range-limit rivets/fishplates.
  // world (optional): rail stubs over a pier joint follow world.joints, which the simulation state already drops
  // when a neighbouring span is demolished; read only when world.revision changes.
  sync(quality='medium',viewer=null,world=null){
    this.quality=quality;if(viewer)this.viewer=viewer;
    if(world&&(this.jointKey?.world!==world||this.jointKey.revision!==world.revision)){
      this.jointKey={world,revision:world.revision};this.joints=new Set(world.joints.map(j=>j.id));this.syncStubs();
    }else if(!world&&!this.jointKey){this.jointKey={world:null,revision:null};this.syncStubs();}
    const on=quality!=='low',high=quality==='high';
    for(const a of this.attachments){
      a.root.visible=on;
      for(const h of a.hidden)h.visible=!on;
      if(!on)continue;
      let micro=high;
      if(high&&a.hasHigh){
        if(!a.center){
          a.node.updateWorldMatrix(true,false);const sphere=new THREE.Sphere();
          const box=new THREE.Box3();for(const b of a.batches)box.union(b.mesh.boundingBox);
          box.getBoundingSphere(sphere);a.center=sphere.center.applyMatrix4(a.node.matrixWorld);a.radius=sphere.radius;
        }
        micro=!this.viewer||this.viewer.distanceTo(a.center)-a.radius<M01_BRIDGE_MICRO_DETAIL_RANGE;
      }
      a.micro=micro;
      for(const b of a.batches){b.mesh.count=micro?b.medium+b.high:b.medium;b.mesh.visible=b.mesh.count>0;}
    }
  }
  syncStubs(){
    const zero=new THREE.Matrix4().makeScale(0,0,0);
    for(const a of this.attachments){
      if(!a.stubs.length)continue;const {prefix,index,collapsed}=a.meta,dirty=new Set();
      for(const st of a.stubs){
        const show=!this.joints||(!collapsed&&this.joints.has(`${prefix}_joint_${st.side==='w'?index-1:index}`));
        if(show===st.shown)continue;st.shown=show;st.mesh.setMatrixAt(st.index,show?st.matrix:zero);dirty.add(st.mesh);
      }
      for(const m of dirty)m.instanceMatrix.needsUpdate=true;
    }
  }
  get diagnostics(){
    let medium=0,high=0,visible=0,activeBatches=0,hiddenSource=0;const active=[];
    for(const a of this.attachments){
      medium+=a.detail.medium.length+(a.detail.bands?.length??0);high+=a.detail.high.length;
      let shown=a.node.visible;for(let p=a.node.parent;p&&shown;p=p.parent)shown=p.visible;
      if(!shown||this.quality==='low')continue;active.push(a.node.name);
      for(const b of a.batches){visible+=b.mesh.count;activeBatches++;}
      if(a.bands){visible+=a.detail.bands.length;activeBatches++;}
      hiddenSource+=a.hidden.filter(h=>!h.visible).length;
    }
    return {quality:this.quality,attachments:this.attachments.length,activeAttachments:active.length,active,mediumDetails:medium,highDetails:high,
      visibleDetails:visible,activeBatches,totalBatches:this.attachments.reduce((n,a)=>n+a.batches.length+(a.bands?1:0),0),
      hiddenSourcePrimitives:hiddenSource,hiddenJointStubs:this.attachments.reduce((n,a)=>n+a.stubs.filter(s=>!s.shown).length,0),microRange:M01_BRIDGE_MICRO_DETAIL_RANGE,collidersAdded:0};
  }
  dispose(){
    for(const a of this.attachments){a.root.removeFromParent();for(const h of a.hidden)h.visible=true;for(const b of a.batches)b.mesh.dispose();}
    this.attachments=[];this.box.dispose();this.rivet.dispose();for(const g of this.geometries)g.dispose();this.geometries=[];
  }
}
