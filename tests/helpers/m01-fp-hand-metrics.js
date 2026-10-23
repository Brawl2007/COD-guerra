import * as THREE from 'three';
import {M01ViewModel} from '../../src/render/m01-viewmodel.js';
import {Wz29} from '../../src/game/wz29.js';
import {loadCharacterGLB,viewModelFixture} from './m01-viewmodel-fixture.js';

// R6-a: measures how the first-person hands and arms sit on the wz.29, from the real rig, the real clips and the real M01ViewModel.
// Hand/rifle measures are expressed in the weapon bone frame (metres; +X right, +Y up, -Z towards the muzzle), the frame of the GLB sockets.
// Arm/screen measures are in the view frame of the weapon pass (eye at the origin, -Z forward, 58 degree vertical field of view).

/** Landmarks of the wz.29 mesh in the weapon bone frame. Trigger/guard come from tools/assets/m01-soldiers/src/weapon.mjs (rifle_trigger, rifle_guard). */
export const WZ29_LANDMARKS=Object.freeze({
  trigger:Object.freeze([0,-.035,-.03]),
});

export async function fpFixture(){
  const c=await viewModelFixture();
  for(const [key,file]of [['fp:0','fp-arms-v2/m01_fp_arms_v2.glb'],['fp:patient','fp-arms-v2/m01_fp_patient_v2.glb'],['pl:1','m01_soldier_pl_lod1.glb'],['pl:2','m01_soldier_pl_lod2.glb']])c.sources.set(key,await loadCharacterGLB(file));
  for(const clip of (await loadCharacterGLB('crews-evacuation/m01_crews_evacuation.glb')).animations)c.clips.set(clip.name,clip);
  return c;
}

/** A minimal presentation record of the kind M01ViewModel.update() reads; the same shape the existing viewmodel tests use. */
export function fakeSim(){return {clock:20,world:{},player:{id:'player',aiming:false,moveBlend:0,sprinting:false,pitch:0,angle:0},weapon:new Wz29(),renderState:{weaponVisible:true},actors:[]};}

/** Puts the simulation record into one of the weapon states at a fraction of its authoritative duration (BOLT_CYCLE 1.05 s, RELOAD_* 3.4 s / 0.8 s). */
export function setWeapon(sim,state,fraction=0){
  const dur=state==='BOLT_CYCLE'?1050:state==='RELOAD_SINGLE'?800:3400;
  sim.weapon.state=state;sim.weapon.started=sim.clock*1000-fraction*dur;sim.weapon.until=sim.weapon.started+dur;
  sim.weapon.lastShot=state==='BOLT_CYCLE'?sim.weapon.started:-1e9;
  if(state==='RELOAD_CLIP')sim.weapon.mag=0;
  return sim;
}

// Analytic solids of the wz.29 (weapon.mjs): the stock/handguard are superelliptic lofts (exponent e = .45 -> |x/a|^q + |y/b|^q = 1, q = 2/e),
// the receiver and barrel are tubes. Thin parts (guard, sling, floor plate) are not solids.
const STOCK=[[.335,-.045,.042,.128],[.30,-.042,.043,.124],[.2,-.032,.040,.100],[.09,-.018,.036,.062],[.035,-.012,.034,.048],[-.01,-.006,.040,.056],
  [-.08,-.004,.044,.060],[-.25,.004,.044,.050],[-.45,.010,.040,.040],[-.62,.014,.036,.034],[-.685,.016,.032,.030]];
const Q=2/.45;
function loftDepth(rows,x,y,z){
  for(let k=0;k+1<rows.length;k++){
    const [z0,y0,w0,h0]=rows[k],[z1,y1,w1,h1]=rows[k+1];
    if(z>z0||z<z1)continue;
    const t=(z0-z)/(z0-z1),yc=y0+(y1-y0)*t,hw=(w0+(w1-w0)*t)/2,hh=(h0+(h1-h0)*t)/2;
    const r=(Math.abs(x)/hw)**Q+(Math.abs(y-yc)/hh)**Q;
    return r<1?(1-r**(1/Q))*Math.min(hw,hh):0;
  }
  return 0;
}
const HANDGUARD=[[-.27,.036,.030,.018],[-.45,.036,.028,.018],[-.62,.036,.026,.018]];
/** Depth (m) of a point inside the wz.29's solids, weapon frame; 0 outside. */
export function solidDepth(x,y,z){
  let d=loftDepth(STOCK,x,y,z);
  d=Math.max(d,loftDepth(HANDGUARD,x,y,z));
  if(z<=.035&&z>=-.25)d=Math.max(d,.0165-Math.hypot(x,y-.03));
  if(z<=-.25&&z>=-.765){const r=.0125+(.0092-.0125)*((-.25-z)/.515);d=Math.max(d,r-Math.hypot(x,y-.032));}
  return Math.max(0,d);
}

const tri=new THREE.Triangle(),pt=new THREE.Vector3(),cl=new THREE.Vector3(),nrm=new THREE.Vector3(),mat=new THREE.Matrix4();
const dominant=(geometry,names)=>{
  const idx=geometry.getAttribute('skinIndex'),wgt=geometry.getAttribute('skinWeight'),out=new Array(idx.count);
  for(let i=0;i<idx.count;i++){
    let best=-1,bw=0;const j=[idx.getX(i),idx.getY(i),idx.getZ(i),idx.getW(i)],w=[wgt.getX(i),wgt.getY(i),wgt.getZ(i),wgt.getW(i)];
    for(let k=0;k<4;k++)if(w[k]>bw){bw=w[k];best=j[k];}
    out[i]=names[best];
  }
  return out;
};

/** Rig-level measurement helper. Create once per view model (after its first update()), call measure() after every update(). */
export class HandRig {
  constructor(view,{fov=58,aspect=16/9}={}){
    this.view=view;const root=view.root;this.root=root;
    this.weapon=root.getObjectByName('weapon');this.bolt=root.getObjectByName('weapon_bolt');this.clipBone=root.getObjectByName('weapon_clip');
    this.hands=root.getObjectByName('fp_hands');this.rifle=root.getObjectByName('rifle');this.clipMesh=root.getObjectByName('clip');
    this.camera=new THREE.PerspectiveCamera(fov,aspect,.03,6);this.camera.updateMatrixWorld(true);
    // Vertex ids dominated by each bone of the hand mesh (hand_x and the finger phalanges).
    const owners=dominant(this.hands.geometry,this.hands.skeleton.bones.map(b=>b.name));this.groups=new Map();
    owners.forEach((name,i)=>{if(!this.groups.has(name))this.groups.set(name,[]);this.groups.get(name).push(i);});
    // Static triangle flags of the rifle: +1 when the winding normal agrees with the vertex normals (outward), -1 otherwise.
    const rp=this.rifle.geometry.getAttribute('position'),rn=this.rifle.geometry.getAttribute('normal'),ri=this.rifle.geometry.index.array;
    this.rifleIndex=ri;this.rifleFlip=new Int8Array(ri.length/3);
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),n=new THREE.Vector3(),vn=new THREE.Vector3();
    for(let t=0;t<ri.length;t+=3){
      a.fromBufferAttribute(rp,ri[t]);b.fromBufferAttribute(rp,ri[t+1]);c.fromBufferAttribute(rp,ri[t+2]);
      n.subVectors(c,b).cross(a.clone().sub(b));vn.set(0,0,0);for(let k=0;k<3;k++)vn.add(a.fromBufferAttribute(rn,ri[t+k]));
      this.rifleFlip[t/3]=n.dot(vn)>=0?1:-1;
    }
    // Knob: the rifle vertices skinned to weapon_bolt that sit beyond x = 5 cm in bind space (the knob sphere, centre (6, 3.2, 3.6) cm). Their
    // centroid follows the real mesh through the bolt's travel and rotation.
    const rifleOwners=dominant(this.rifle.geometry,this.rifle.skeleton.bones.map(x=>x.name));this.knobIds=[];
    rifleOwners.forEach((name,i)=>{if(name==='weapon_bolt'&&rp.getX(i)>.05)this.knobIds.push(i);});
    // Cut end of each sleeve: vertices of the arm meshes owned by the upper arm and within 7 cm of the shoulder joint in bind space.
    this.sleeveStart={r:[],l:[]};
    for(const mesh of [root.getObjectByName('body'),root.getObjectByName('fp_sleeve_caps')]){
      if(!mesh?.skeleton)continue;const names=mesh.skeleton.bones.map(x=>x.name),own=dominant(mesh.geometry,names),pos=mesh.geometry.getAttribute('position'),drawn=new Set(mesh.geometry.index.array);
      for(const side of ['r','l']){
        const k=names.indexOf(`upperarm_${side}`);if(k<0)continue;const origin=new THREE.Vector3().setFromMatrixPosition(mat.copy(mesh.skeleton.boneInverses[k]).invert());
        const ids=[];own.forEach((name,i)=>{if(drawn.has(i)&&name===`upperarm_${side}`&&pt.fromBufferAttribute(pos,i).distanceTo(origin)<.07)ids.push(i);});
        this.sleeveStart[side].push({mesh,ids});
      }
    }
    this.rifleLocal=new Float32Array(rp.count*3);this.handLocal=new Float32Array(this.hands.geometry.getAttribute('position').count*3);this.inv=new THREE.Matrix4();
  }
  /** Weapon-frame position of a bone's origin. */
  bone(name,out=new THREE.Vector3()){return this.weapon.worldToLocal(this.root.getObjectByName(name).getWorldPosition(out));}
  /** Skinned mesh vertices into `target` (Float32Array xyz), in the weapon bone frame (default) or the view frame. */
  skinned(mesh,target,space='weapon'){
    this.root.updateMatrixWorld(true);this.inv.copy(this.weapon.matrixWorld).invert();
    const pos=mesh.geometry.getAttribute('position');
    for(let i=0;i<pos.count;i++){pt.fromBufferAttribute(pos,i);mesh.applyBoneTransform(i,pt);pt.applyMatrix4(mesh.matrixWorld);if(space==='weapon')pt.applyMatrix4(this.inv);target[i*3]=pt.x;target[i*3+1]=pt.y;target[i*3+2]=pt.z;}
    return target;
  }
  /** Tip of a finger: the vertex dominated by its 03 bone that lies furthest from the 02 joint. */
  tip(finger,side,out=new THREE.Vector3()){
    const ids=this.groups.get(`${finger}_03_${side}`),from=this.bone(`${finger}_02_${side}`,new THREE.Vector3());
    let best=-1,bd=-1;for(const i of ids){const d=Math.hypot(this.handLocal[i*3]-from.x,this.handLocal[i*3+1]-from.y,this.handLocal[i*3+2]-from.z);if(d>bd){bd=d;best=i;}}
    return out.set(this.handLocal[best*3],this.handLocal[best*3+1],this.handLocal[best*3+2]);
  }
  /** Palm centre on the skeleton: wrist plus the four finger knuckles. */
  palm(side,out=new THREE.Vector3()){
    out.set(0,0,0);const p=new THREE.Vector3();
    for(const n of [`hand_${side}`,`index_01_${side}`,`middle_01_${side}`,`ring_01_${side}`,`pinky_01_${side}`])out.add(this.bone(n,p));
    return out.multiplyScalar(.2);
  }
  /** Knob centre: centroid of the knob vertices of the skinned rifle (follows the bolt's travel and rotation). */
  knob(out=new THREE.Vector3()){
    this.skinned(this.rifle,this.rifleLocal);out.set(0,0,0);
    for(const i of this.knobIds)out.x+=this.rifleLocal[i*3],out.y+=this.rifleLocal[i*3+1],out.z+=this.rifleLocal[i*3+2];
    return out.multiplyScalar(1/this.knobIds.length);
  }
  /** Minimum distance from any vertex of the clip mesh to the given point set (weapon frame). */
  clipDistanceTo(points){
    const pos=this.clipMesh.geometry.getAttribute('position'),buf=this._clip??=new Float32Array(pos.count*3);this.skinned(this.clipMesh,buf);let best=Infinity;
    for(const p of points)for(let i=0;i<pos.count;i++)best=Math.min(best,Math.hypot(buf[i*3]-p.x,buf[i*3+1]-p.y,buf[i*3+2]-p.z));return best;
  }
  /**
   * One side's contact with the rifle, from the skinned hand mesh: `depth` is the deepest vertex inside the wood/steel solids
   * (solidDepth, metres, 0 when none) and `palmGap` the smallest distance from the palm/wrist vertices (hand_<side> bone) to the rifle
   * mesh surface. Both in metres.
   */
  contact(side,limit=.05){
    this.skinned(this.hands,this.handLocal);this.skinned(this.rifle,this.rifleLocal);
    const ri=this.rifleIndex,R=this.rifleLocal,tris=ri.length/3,boxes=new Float32Array(tris*6),A=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
    for(let t=0;t<tris;t++)for(let axis=0;axis<3;axis++){
      const v=[R[ri[t*3]*3+axis],R[ri[t*3+1]*3+axis],R[ri[t*3+2]*3+axis]];boxes[t*6+axis]=Math.min(...v)-limit;boxes[t*6+3+axis]=Math.max(...v)+limit;
    }
    let depth=0,deepest=null,palmGap=Infinity;
    for(const [name,ids]of this.groups){
      if(!name.endsWith(`_${side}`))continue;
      for(const i of ids){
        const x=this.handLocal[i*3],y=this.handLocal[i*3+1],z=this.handLocal[i*3+2],d=solidDepth(x,y,z);
        if(d>depth){depth=d;deepest=name;}
        if(name!==`hand_${side}`)continue;
        let best=Infinity;
        for(let t=0;t<tris;t++){
          const o=t*6;if(x<boxes[o]||y<boxes[o+1]||z<boxes[o+2]||x>boxes[o+3]||y>boxes[o+4]||z>boxes[o+5])continue;
          for(let k=0;k<3;k++)A[k].set(R[ri[t*3+k]*3],R[ri[t*3+k]*3+1],R[ri[t*3+k]*3+2]);
          tri.set(A[0],A[1],A[2]);pt.set(x,y,z);tri.closestPointToPoint(pt,cl);best=Math.min(best,cl.distanceTo(pt));
        }
        palmGap=Math.min(palmGap,best);
      }
    }
    return {depth,deepest,palmGap};
  }
  /** Distance (m) from a weapon-frame point to the rifle mesh surface (after skinned(rifle) has run for this pose). */
  surfaceGap(p){
    const ri=this.rifleIndex,R=this.rifleLocal,A=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];let best=Infinity;
    for(let t=0;t<ri.length;t+=3){
      for(let k=0;k<3;k++)A[k].set(R[ri[t+k]*3],R[ri[t+k]*3+1],R[ri[t+k]*3+2]);
      tri.set(A[0],A[1],A[2]);tri.closestPointToPoint(p,cl);best=Math.min(best,cl.distanceTo(p));
    }
    return best;
  }
  /** Distance (m) from each fingertip of one hand to the rifle surface: {thumb,index,middle,ring,pinky}. */
  tipGaps(side){
    this.skinned(this.hands,this.handLocal);this.skinned(this.rifle,this.rifleLocal);const out={},p=new THREE.Vector3();
    for(const f of ['thumb','index','middle','ring','pinky'])out[f]=this.surfaceGap(this.tip(f,side,p));
    return out;
  }
  /** Angle (degrees) between the forearm axis (elbow -> wrist) and the hand axis (wrist -> middle knuckle). */
  wristBend(side){
    const e=this.bone(`lowerarm_${side}`),w=this.bone(`hand_${side}`),m=this.bone(`middle_01_${side}`);
    return e.negate().add(w).angleTo(m.sub(w))*180/Math.PI;
  }
  /** Elbow interior angle (degrees) from the bone positions. */
  elbowAngle(side){
    const s=this.bone(`upperarm_${side}`),e=this.bone(`lowerarm_${side}`),w=this.bone(`hand_${side}`);
    return s.sub(e).angleTo(w.sub(e))*180/Math.PI;
  }
  /** Number of the sleeve's cut-end vertices that fall inside the weapon camera's frustum (a visible floating cut), and the nearest one's depth. */
  sleeveStartInView(side){
    this.root.updateMatrixWorld(true);let inside=0,nearest=Infinity;
    for(const {mesh,ids}of this.sleeveStart[side])for(const i of ids){
      pt.fromBufferAttribute(mesh.geometry.getAttribute('position'),i);mesh.applyBoneTransform(i,pt).applyMatrix4(mesh.matrixWorld);
      nearest=Math.min(nearest,-pt.z);
      const depth=-pt.z;pt.applyMatrix4(this.camera.matrixWorldInverse).applyMatrix4(this.camera.projectionMatrix);
      if(depth>this.camera.near&&Math.abs(pt.x)<=1&&Math.abs(pt.y)<=1)inside++;
    }
    return {inside,nearest};
  }
  /** Rifle vertices that are inside the weapon camera's frustum closer to the eye than `depth` metres (the stock filling the view). */
  rifleNearView(depth=.42){
    const R=this.skinned(this.rifle,this.rifleLocal,'view');let count=0;
    for(let i=0;i<R.length/3;i++){
      const z=-R[i*3+2];if(!(z>this.camera.near&&z<depth))continue;
      pt.set(R[i*3],R[i*3+1],R[i*3+2]).applyMatrix4(this.camera.matrixWorldInverse).applyMatrix4(this.camera.projectionMatrix);
      if(Math.abs(pt.x)<=1&&Math.abs(pt.y)<=1)count++;
    }
    return count;
  }
  /** Vertices of the skin/sleeve/cuff meshes that fall inside the sight window (|ndc| <= half) and in front of the front sight: they would hide the sights. */
  sightWindowOcclusion(half=.05){
    this.root.updateMatrixWorld(true);let count=0;
    for(const name of ['fp_hands','body','fp_cuffs','fp_sleeve_caps','fp_straps']){
      const mesh=this.root.getObjectByName(name);if(!mesh?.visible)continue;const pos=mesh.geometry.getAttribute('position');
      for(const i of new Set(mesh.geometry.index.array)){   // only vertices a triangle really draws
        pt.fromBufferAttribute(pos,i);if(mesh.isSkinnedMesh)mesh.applyBoneTransform(i,pt);pt.applyMatrix4(mesh.matrixWorld);
        const depth=-pt.z;if(!(depth>this.camera.near&&depth<1.2))continue;
        pt.applyMatrix4(this.camera.projectionMatrix);if(Math.abs(pt.x)<=half&&Math.abs(pt.y)<=half)count++;
      }
    }
    return count;
  }
  /**
   * Fraction of the frame (64 x 36 cells, weapon camera) covered by rifle triangles nearer than `depth` metres (default any) and, with `minZ`, only
   * those behind that weapon-frame z: `{minZ:.06}` is the stock behind the receiver. The butt beside the shoulder at the hip is a percent or two;
   * a butt swung in front of the face is a fifth of the screen.
   */
  rifleCoverage(depth=Infinity,{minZ=-Infinity}={},cols=64,rows=36){
    const R=this.skinned(this.rifle,this.rifleLocal,'view'),W=this.skinned(this.rifle,this._rifleW??=new Float32Array(this.rifleLocal.length)),ri=this.rifleIndex,cells=new Uint8Array(cols*rows),P=[[0,0],[0,0],[0,0]];
    for(let t=0;t<ri.length;t+=3){
      let zc=0,ok=true;if((W[ri[t]*3+2]+W[ri[t+1]*3+2]+W[ri[t+2]*3+2])/3<minZ)continue;
      for(let k=0;k<3;k++){
        const i=ri[t+k];pt.set(R[i*3],R[i*3+1],R[i*3+2]);zc+=-pt.z/3;if(!(-pt.z>this.camera.near)){ok=false;break;}
        pt.applyMatrix4(this.camera.projectionMatrix);P[k][0]=(pt.x*.5+.5)*cols;P[k][1]=(pt.y*.5+.5)*rows;
      }
      if(!ok||zc>=depth)continue;
      const x0=Math.max(0,Math.floor(Math.min(P[0][0],P[1][0],P[2][0]))),x1=Math.min(cols-1,Math.ceil(Math.max(P[0][0],P[1][0],P[2][0])));
      const y0=Math.max(0,Math.floor(Math.min(P[0][1],P[1][1],P[2][1]))),y1=Math.min(rows-1,Math.ceil(Math.max(P[0][1],P[1][1],P[2][1])));
      const [a,b,c]=P,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-9)continue;
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const px=x+.5,py=y+.5,l1=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/den,l2=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/den,l3=1-l1-l2;
        if(l1>=0&&l2>=0&&l3>=0)cells[y*cols+x]=1;
      }
    }
    let n=0;for(const v of cells)n+=v;return n/cells.length;
  }
  /** Everything the grip test asks, in metres (distances), degrees (angles) and counts. */
  measure({contacts=false}={}){
    this.root.updateMatrixWorld(true);this.skinned(this.hands,this.handLocal);
    const trigger=new THREE.Vector3(...WZ29_LANDMARKS.trigger),sock=this.sockets??=(()=>{let s=null;this.root.traverse(n=>{s??=n.userData?.sockets??null;});return s;})();
    const rIndexTip=this.tip('index','r'),rThumbTip=this.tip('thumb','r'),pinch=rIndexTip.clone().add(rThumbTip).multiplyScalar(.5),knob=this.knob();
    const lTips=['index','middle','ring','pinky','thumb'].map(f=>this.tip(f,'l'));
    const out={
      triggerGap:rIndexTip.distanceTo(trigger),
      rightPalmToGrip:this.palm('r').distanceTo(new THREE.Vector3(...sock.grip_r)),
      leftPalmToForend:this.palm('l').distanceTo(new THREE.Vector3(...sock.grip_l)),
      pinchToKnob:pinch.distanceTo(knob),
      knobToIndexTip:rIndexTip.distanceTo(knob),knobToThumbTip:rThumbTip.distanceTo(knob),
      leftTopTip:Math.max(...lTips.map(t=>t.y)),
      wristBendR:this.wristBend('r'),wristBendL:this.wristBend('l'),elbowR:this.elbowAngle('r'),elbowL:this.elbowAngle('l'),
      rifleNearView:this.rifleNearView(),stockCoverage:this.rifleCoverage(Infinity,{minZ:.06}),sightOcclusion:this.sightWindowOcclusion(),
      rightPalm:this.palm('r').toArray(),knob:knob.toArray(),indexTip:rIndexTip.toArray(),thumbTip:rThumbTip.toArray(),
    };
    const sr=this.sleeveStartInView('r'),sl=this.sleeveStartInView('l');
    out.sleeveStartInViewR=sr.inside;out.sleeveStartInViewL=sl.inside;out.sleeveStartNearest=Math.min(sr.nearest,sl.nearest);
    if(this.clipMesh.visible){const r=['index','middle','ring','pinky','thumb'].map(f=>this.tip(f,'r')).concat([this.palm('r')]);out.clipToRightHand=this.clipDistanceTo(r);}
    if(contacts)Object.assign(out,{right:this.contact('r'),left:this.contact('l')});
    return out;
  }
}

/**
 * Drives a view model through one authoritative state and returns the measurements. `authored` additionally samples the bare clip pose
 * (no presentation) to report the authored wrist bend of the same frame; the rig is left in that authored pose afterwards.
 */
export function sample(view,rig,sim,{state='READY',fraction=0,aiming=false,sprinting=false,contacts=false,authored=true}={}){
  sim.player.aiming=aiming;sim.player.sprinting=sprinting;sim.player.moveBlend=sprinting?1:0;setWeapon(sim,state,fraction);
  view.visual=null;view.sampleKey=null;view.update(sim,'high',0);
  const out=rig.measure({contacts});
  if(authored){
    view.root.position.set(0,0,0);view.root.rotation.set(0,0,0);view.play(view.root,view.mixer,view.stats.clip,view.stats.clipTime);
    out.authoredWristBendR=rig.wristBend('r');out.authoredWristBendL=rig.wristBend('l');
  }
  return out;
}
export {M01ViewModel};
