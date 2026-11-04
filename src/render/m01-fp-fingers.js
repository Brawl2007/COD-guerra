import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// pkg4 (2026-11-04): finer first-person hands. The accepted fp-arms-v2 GLB builds every phalanx as a CapsuleGeometry(radius, length, 1, 5) (build-fp-arms.mjs): a five-sided
// prism with flat-looking facets that reads as a string of hexagonal beads at the 0.74 m ADS distance. That GLB, its manifest hash and its triangle budget (carry mode keeps
// <= 6000 triangles with the patient) stay as they are; the standing view model draws THIS mesh instead, built at load from the same joints, the same radii and the same
// bones: ten sides, rounded caps, a gentle taper, a knuckle bulge at the proximal end of each finger, a slightly flattened (dorsal) section and smooth normals. The carry
// pose keeps the original low triangle mesh (fp_hands_carry). Presentation only: it reads bind-pose joints and writes nothing but a geometry owned by the view model.

export const FINGER_DETAIL=Object.freeze({radial:10,capRings:2,bodyRings:0,flatten:.88,knuckle:.12,palmSegments:Object.freeze([12,7])});

const _m=new THREE.Matrix4(),_a=new THREE.Vector3(),_b=new THREE.Vector3(),_axis=new THREE.Vector3(),_u=new THREE.Vector3(),_v=new THREE.Vector3(),_n=new THREE.Vector3();

/** Bind-pose position of a bone in the geometry space of `mesh` (null when the bone is absent). */
function joint(mesh,name,out){
  const i=mesh.skeleton.bones.findIndex(b=>b.name===name);if(i<0)return null;
  return out.setFromMatrixPosition(_m.copy(mesh.skeleton.boneInverses[i]).invert()).applyMatrix4(mesh.bindMatrixInverse);
}

class HandBuilder{
  constructor(mesh){this.mesh=mesh;this.bones=mesh.skeleton.bones.map(b=>b.name);this.position=[];this.skin=[];this.index=[];}
  vertex(p,bone){this.position.push(p.x,p.y,p.z);this.skin.push(bone);return this.position.length/3-1;}
  /** Rounded, tapered phalanx from joint `a` to joint `b`. Same base radius and (except the fingertip, which stops a quarter radius short so the finer round tip does not sink deeper into the wood than the GLB's coarse cap did) the same total length as the GLB capsule; `dorsal` is the back-of-hand direction. */
  phalanx(a,b,r0,r1,bone,dorsal,bulge,trim=0){
    const {radial,capRings,bodyRings,flatten}=FINGER_DETAIL,distance=a.distanceTo(b);_axis.subVectors(b,a).normalize();
    _u.copy(dorsal).addScaledVector(_axis,-dorsal.dot(_axis)).normalize();_v.crossVectors(_axis,_u).normalize();
    const length=distance+.5*Math.max(r0,r1)-trim,s0=-.25*r0,s1=s0+length,rings=[];
    // [distance along the axis from joint a, radius]; caps are quarter circles, the body tapers from r0 to r1 and swells at the knuckle end.
    const swell=s=>1+bulge*Math.exp(-(((s-(s0+r0))/(r0*1.7))**2));
    for(let k=1;k<=capRings;k++){const phi=Math.PI/2*k/capRings;rings.push([s0+r0*(1-Math.cos(phi)),r0*Math.sin(phi)]);}
    for(let k=1;k<=bodyRings;k++){const t=k/(bodyRings+1),s=s0+r0+(s1-r1-(s0+r0))*t;rings.push([s,(r0+(r1-r0)*t)]);}
    for(let k=capRings;k>=1;k--){const phi=Math.PI/2*k/capRings;rings.push([s1-r1*(1-Math.cos(phi)),r1*Math.sin(phi)]);}
    const pole0=this.vertex(_a.copy(a).addScaledVector(_axis,s0),bone),ids=[];
    for(const [s,r] of rings){
      const row=[],radius=r*swell(s);
      for(let j=0;j<radial;j++){const al=Math.PI*2*j/radial;_n.copy(_u).multiplyScalar(Math.cos(al)*radius*flatten).addScaledVector(_v,Math.sin(al)*radius);
        row.push(this.vertex(_a.copy(a).addScaledVector(_axis,s).add(_n),bone));}
      ids.push(row);
    }
    const pole1=this.vertex(_a.copy(a).addScaledVector(_axis,s1),bone);
    for(let j=0;j<radial;j++){const j1=(j+1)%radial;this.index.push(pole0,ids[0][j1],ids[0][j]);}
    for(let k=0;k+1<ids.length;k++)for(let j=0;j<radial;j++){const j1=(j+1)%radial,p=ids[k][j],q=ids[k][j1],r=ids[k+1][j],s=ids[k+1][j1];this.index.push(p,q,r,q,s,r);}
    const last=ids[ids.length-1];for(let j=0;j<radial;j++){const j1=(j+1)%radial;this.index.push(pole1,last[j],last[j1]);}
  }
  /** Rounded palm: the GLB's scaled sphere with more segments. */
  palm(basis,center,width,length,bone){
    const [w,h]=FINGER_DETAIL.palmSegments,sphere=new THREE.SphereGeometry(1,w,h);sphere.deleteAttribute('normal');sphere.deleteAttribute('uv');
    const g=mergeVertices(sphere);sphere.dispose();g.scale(width*.52,length*.58,.018);g.applyMatrix4(_m.makeBasis(basis.across,basis.along,basis.normal));g.translate(center.x,center.y,center.z);
    const base=this.position.length/3,pos=g.getAttribute('position');
    for(let i=0;i<pos.count;i++){this.position.push(pos.getX(i),pos.getY(i),pos.getZ(i));this.skin.push(bone);}
    for(const i of g.index.array)this.index.push(i+base);g.dispose();
  }
  geometry(){
    const g=new THREE.BufferGeometry(),count=this.position.length/3,skinIndex=new Uint16Array(count*4),skinWeight=new Float32Array(count*4);
    for(let i=0;i<count;i++){skinIndex[i*4]=this.skin[i];skinWeight[i*4]=1;}
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.position,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));
    g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));g.setIndex(this.index.length>65535?new THREE.Uint32BufferAttribute(this.index,1):new THREE.Uint16BufferAttribute(this.index,1));
    g.computeVertexNormals();
    return g;
  }
}

/**
 * Detailed hands for the skinned `fp_hands` mesh of the fp-arms-v2 GLB: same bones, same bind joints, same radii as tools/assets/m01-soldiers/build-fp-arms.mjs.
 * Returns a new BufferGeometry (owned by the caller), or null when the rig does not have the expected hand bones.
 */
export function buildDetailedHands(mesh){
  const b=new HandBuilder(mesh),wrist=new THREE.Vector3(),p=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],mean=new THREE.Vector3();
  for(const side of ['l','r']){
    if(!joint(mesh,`hand_${side}`,wrist))return null;
    const knuckles=['index','middle','ring','pinky'].map((f,i)=>joint(mesh,`${f}_01_${side}`,p[i]));if(knuckles.some(k=>!k))return null;
    mean.set(0,0,0);for(const k of knuckles)mean.add(k);mean.multiplyScalar(.25);
    const along=mean.clone().sub(wrist).normalize(),across=knuckles[3].clone().sub(knuckles[0]).normalize(),normal=across.clone().cross(along).normalize();across.copy(along).cross(normal).normalize();
    const length=mean.distanceTo(wrist),width=knuckles[0].distanceTo(knuckles[3])+.026,center=wrist.clone().lerp(mean,.5);
    b.palm({across,along,normal},center,width,length,b.bones.indexOf(`hand_${side}`));
    for(const finger of ['thumb','index','middle','ring','pinky'])for(let segment=1;segment<=3;segment++){
      const bone=`${finger}_0${segment}_${side}`,a=joint(mesh,bone,new THREE.Vector3()),previous=segment===1?wrist:joint(mesh,`${finger}_0${segment-1}_${side}`,new THREE.Vector3());
      if(!a||!previous)return null;
      const next=segment<3?joint(mesh,`${finger}_0${segment+1}_${side}`,new THREE.Vector3()):a.clone().add(a.clone().sub(previous).normalize().multiplyScalar(finger==='thumb'?.019:.017));
      if(!next)return null;
      const base=finger==='thumb'?.010:finger==='pinky'?.0068:.0082,r0=base*(1-(segment-1)*.09),r1=segment<3?base*(1-segment*.09)*1.02:r0*.86;
      b.phalanx(a,next,r0,r1,b.bones.indexOf(bone),normal,segment===1?FINGER_DETAIL.knuckle:FINGER_DETAIL.knuckle*.4,segment===3?.25*r0:0);
    }
  }
  return b.geometry();
}
